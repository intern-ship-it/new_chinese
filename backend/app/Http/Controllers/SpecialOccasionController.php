<?php

namespace App\Http\Controllers;

use App\Models\SpecialOccasion;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class SpecialOccasionController extends Controller
{
    protected $s3UploadService;

    public function __construct(S3UploadService $s3UploadService)
    {
        $this->s3UploadService = $s3UploadService;
    }

    /**
     * Check if new packages table exists
     */
    private function hasPackagesTable()
    {
        return Schema::hasTable('occasion_options');
    }

    /**
     * Get all special occasions
     */
    public function index(Request $request)
    {
        try {
            $connectionName = DB::getDefaultConnection();
            $databaseName = DB::connection()->getDatabaseName();
            Log::info('========== DEBUG: SpecialOccasionController@index ==========');
            Log::info('Default Connection: ' . $connectionName);
            Log::info('Database Name: ' . $databaseName);
            Log::info('Request params: ' . json_encode($request->all()));
            Log::info('X-Temple-ID header: ' . $request->header('X-Temple-ID'));
            Log::info('============================================================');

            $query = SpecialOccasion::query();

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('secondary_lang')) {
                $query->where('secondary_lang', $request->secondary_lang);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('occasion_name_primary', 'ILIKE', "%{$search}%")
                        ->orWhere('occasion_name_secondary', 'ILIKE', "%{$search}%");
                });
            }

            if ($this->hasPackagesTable()) {
                $occasions = $query->withCount(['packages as packages_count'])
                    ->orderBy('created_at', 'desc')
                    ->get();
            } else {
                $occasions = $query->orderBy('created_at', 'desc')->get();
                $occasions->each(function ($occ) {
                    $occ->packages_count = is_array($occ->occasion_options) ? count($occ->occasion_options) : 0;
                });
            }

            Log::info('Found ' . $occasions->count() . ' occasions');

            return response()->json([
                'success' => true,
                'data' => $occasions,
                'count' => $occasions->count(),
                '_debug' => [
                    'connection' => $connectionName,
                    'database' => $databaseName
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching special occasions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch occasions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single occasion with packages
     */
    public function show($id)
    {
        try {
            if ($this->hasPackagesTable()) {
                $occasion = SpecialOccasion::with([
                    'packages.timeSlots',
                    'packages.dates',
                    'packages.services'
                ])->find($id);

                // Add counts and signed image URLs to each package
                if ($occasion && $occasion->packages) {
                    foreach ($occasion->packages as $package) {
                        $package->time_slots_count = $package->timeSlots->count();
                        $package->event_dates_count = $package->dates->count();

                        // Generate signed URL for S3 image
                        if ($package->image_path && !Str::startsWith($package->image_path, 'http')) {
                            $package->image_url = $this->s3UploadService->getSignedUrl($package->image_path);
                        } else {
                            $package->image_url = $package->image_path;
                        }
                    }
                }
            } else {
                $occasion = SpecialOccasion::find($id);
            }

            if (!$occasion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Occasion not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $occasion
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching occasion: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch occasion',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store new occasion WITH packages (all in one)
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'occasion_name_primary' => 'required|string|max:255',
                'occasion_name_secondary' => 'nullable|string|max:255',
                'primary_lang' => 'nullable|string|max:50',
                'secondary_lang' => 'nullable|string|max:50',
                'status' => 'nullable|in:active,inactive',
                'packages' => 'nullable|array',
                'occasion_options' => 'nullable|array',
                // New fields for Table Assignment and Relocation (STEP 1 & 2)
                'enable_table_assignment' => 'nullable|boolean',
                'enable_relocation' => 'nullable|boolean',
                'table_layouts' => 'nullable|array',
                'table_layouts.*.table_name' => 'nullable|string|max:100',
                'table_layouts.*.rows' => 'nullable|integer|min:0',
                'table_layouts.*.columns' => 'nullable|integer|min:0',
                'table_layouts.*.start_number' => 'nullable|integer|min:1',
                'table_layouts.*.numbering_pattern' => 'nullable|in:row-wise,column-wise',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $occasionOptions = [];
            if ($request->has('occasion_options')) {
                $occasionOptions = $request->occasion_options;
            }

            $occasion = SpecialOccasion::create([
                'occasion_name_primary' => $request->occasion_name_primary,
                'occasion_name_secondary' => $request->occasion_name_secondary,
                'primary_lang' => $request->primary_lang ?? 'English',
                'secondary_lang' => $request->secondary_lang,
                'status' => $request->status ?? 'active',
                'occasion_options' => $occasionOptions,
                // New fields for Table Assignment and Relocation (STEP 1 & 2)
                'enable_table_assignment' => $request->boolean('enable_table_assignment', false),
                'enable_relocation' => $request->boolean('enable_relocation', false),
                'table_layouts' => $request->table_layouts ?? [],
            ]);

            if ($this->hasPackagesTable() && $request->has('packages') && is_array($request->packages)) {
                $templeId = $request->header('X-Temple-ID') ?? session('temple_id');
                $this->savePackages($occasion->id, $request->packages, $templeId);
            }

            DB::commit();

            // Reload with signed URLs
            if ($this->hasPackagesTable()) {
                $occasion->load(['packages.timeSlots', 'packages.dates', 'packages.services']);

                foreach ($occasion->packages as $package) {
                    if ($package->image_path && !Str::startsWith($package->image_path, 'http')) {
                        $package->image_url = $this->s3UploadService->getSignedUrl($package->image_path);
                    } else {
                        $package->image_url = $package->image_path;
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Temple event created successfully',
                'data' => $occasion
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating occasion: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create temple event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update occasion WITH packages
     */
    public function update(Request $request, $id)
    {
        try {
            $occasion = SpecialOccasion::find($id);

            if (!$occasion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Occasion not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'occasion_name_primary' => 'sometimes|required|string|max:255',
                'occasion_name_secondary' => 'nullable|string|max:255',
                'primary_lang' => 'nullable|string|max:50',
                'secondary_lang' => 'nullable|string|max:50',
                'status' => 'nullable|in:active,inactive',
                'packages' => 'nullable|array',
                'occasion_options' => 'nullable|array',
                // New fields for Table Assignment and Relocation (STEP 1 & 2)
                'enable_table_assignment' => 'nullable|boolean',
                'enable_relocation' => 'nullable|boolean',
                'table_layouts' => 'nullable|array',
                'table_layouts.*.table_name' => 'nullable|string|max:100',
                'table_layouts.*.rows' => 'nullable|integer|min:0',
                'table_layouts.*.columns' => 'nullable|integer|min:0',
                'table_layouts.*.start_number' => 'nullable|integer|min:1',
                'table_layouts.*.numbering_pattern' => 'nullable|in:row-wise,column-wise',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $updateData = [
                'occasion_name_primary' => $request->occasion_name_primary ?? $occasion->occasion_name_primary,
                'occasion_name_secondary' => $request->occasion_name_secondary,
                'primary_lang' => $request->primary_lang ?? $occasion->primary_lang,
                'secondary_lang' => $request->secondary_lang,
                'status' => $request->status ?? $occasion->status,
            ];

            if ($request->has('occasion_options')) {
                $updateData['occasion_options'] = $request->occasion_options;
            }

            // Handle new fields for Table Assignment and Relocation (STEP 1 & 2)
            if ($request->has('enable_table_assignment')) {
                $updateData['enable_table_assignment'] = $request->boolean('enable_table_assignment', false);
            }
            if ($request->has('enable_relocation')) {
                $updateData['enable_relocation'] = $request->boolean('enable_relocation', false);
            }
            if ($request->has('table_layouts')) {
                $updateData['table_layouts'] = $request->table_layouts ?? [];
            }

            $occasion->update($updateData);

            if ($this->hasPackagesTable() && $request->has('packages')) {
                $templeId = $request->header('X-Temple-ID') ?? session('temple_id');
                $this->updatePackages($occasion->id, $request->packages, $templeId);
            }

            DB::commit();

            // Reload with signed URLs
            if ($this->hasPackagesTable()) {
                $occasion->load(['packages.timeSlots', 'packages.dates', 'packages.services']);

                foreach ($occasion->packages as $package) {
                    if ($package->image_path && !Str::startsWith($package->image_path, 'http')) {
                        $package->image_url = $this->s3UploadService->getSignedUrl($package->image_path);
                    } else {
                        $package->image_url = $package->image_path;
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Temple event updated successfully',
                'data' => $occasion
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating occasion: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update temple event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete occasion
     */
    public function destroy($id)
    {
        try {
            $occasion = SpecialOccasion::find($id);

            if (!$occasion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Occasion not found'
                ], 404);
            }

            DB::beginTransaction();

            // Delete package images from S3 if table exists
            if ($this->hasPackagesTable()) {
                $packages = DB::table('occasion_options')->where('occasion_id', $id)->get();
                foreach ($packages as $pkg) {
                    if ($pkg->image_path && !Str::startsWith($pkg->image_path, 'http')) {
                        $this->s3UploadService->deleteSignature($pkg->image_path);
                        Log::info('Deleted package image from S3', ['path' => $pkg->image_path]);
                    }
                }

                // Delete related records
                $packageIds = $packages->pluck('id');
                DB::table('occasion_option_time_slots')->whereIn('option_id', $packageIds)->delete();
                DB::table('occasion_option_dates')->whereIn('option_id', $packageIds)->delete();
                DB::table('occasion_option_services')->whereIn('option_id', $packageIds)->delete();
                DB::table('occasion_options')->where('occasion_id', $id)->delete();
            }

            $occasion->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Temple event deleted successfully'
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error deleting occasion: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete temple event'
            ], 500);
        }
    }

    /**
     * Update status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $occasion = SpecialOccasion::find($id);

            if (!$occasion) {
                return response()->json([
                    'success' => false,
                    'message' => 'Occasion not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:active,inactive'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid status'
                ], 422);
            }

            $occasion->update(['status' => $request->status]);

            return response()->json([
                'success' => true,
                'message' => "Status updated to {$request->status}",
                'data' => $occasion
            ], 200);

        } catch (Exception $e) {
            Log::error('Error updating status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status'
            ], 500);
        }
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    /**
     * Upload base64 image to S3 using S3UploadService
     * Following the same pattern as SaleItemController
     */
    protected function uploadBase64Image($base64Data, $folder, $type, $templeId)
    {
        try {
            // Generate unique file name
            $timestamp = Carbon::now()->format('YmdHis');
            $random = Str::random(6);
            $safeName = Str::slug($type);
            $fileName = "{$safeName}_{$timestamp}_{$random}.png";

            // Determine mime type from base64 header
            $mimeType = 'image/png';
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
                $mimeType = 'image/' . $matches[1];
                $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
                $fileName = "{$safeName}_{$timestamp}_{$random}.{$extension}";
            }

            // Use S3UploadService->uploadSignature() like SaleItemController does
            // Pass folder path as the "userId" parameter
            $result = $this->s3UploadService->uploadSignature(
                $base64Data,
                $folder,       // This becomes part of the path (e.g., "occasions/10/packages")
                $templeId,
                $type          // Type/identifier (e.g., package name)
            );

            return $result;

        } catch (Exception $e) {
            Log::error('Failed to upload base64 image', [
                'error' => $e->getMessage(),
                'folder' => $folder,
                'type' => $type
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Save packages for an occasion (SIMPLIFIED - Regular Services Only)
     */
    private function savePackages($occasionId, $packages, $templeId = null)
    {
        foreach ($packages as $index => $pkg) {
            // Handle image upload to S3 if base64 provided
            $imagePath = null;
            if (!empty($pkg['image_base64'])) {
                $folder = "occasions/{$occasionId}/packages";
                $uploadResult = $this->uploadBase64Image(
                    $pkg['image_base64'],
                    $folder,
                    $pkg['name'] ?? 'package',
                    $templeId
                );

                if ($uploadResult['success']) {
                    $imagePath = $uploadResult['path'];
                    Log::info('Package image uploaded to S3', ['path' => $imagePath]);
                } else {
                    Log::error('Failed to upload package image', ['error' => $uploadResult['message']]);
                }
            } elseif (!empty($pkg['image_path'])) {
                $imagePath = $pkg['image_path'];
            }

            // Create package record
            $optionId = DB::table('occasion_options')->insertGetId([
                'occasion_id' => $occasionId,
                'name' => $pkg['name'],
                'name_secondary' => $pkg['name_secondary'] ?? null,
                'description' => $pkg['description'] ?? null,
                'amount' => $pkg['amount'] ?? 0,
                'package_mode' => $pkg['package_mode'] ?? 'single',
                'slot_capacity' => $pkg['slot_capacity'] ?? null,
                'ledger_id' => !empty($pkg['ledger_id']) ? $pkg['ledger_id'] : null,
                'date_type' => $pkg['date_type'] ?? 'multiple_dates',
                'date_range_start' => $pkg['date_range_start'] ?? null,
                'date_range_end' => $pkg['date_range_end'] ?? null,
                'image_path' => $imagePath,
                'status' => $pkg['status'] ?? 'active',
                'sort_order' => $index,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Created package', [
                'option_id' => $optionId,
                'package_name' => $pkg['name'],
                'amount' => $pkg['amount'] ?? 0
            ]);

            // Save time slots
            if (!empty($pkg['time_slots']) && Schema::hasTable('occasion_option_time_slots')) {
                foreach ($pkg['time_slots'] as $slotIndex => $slot) {
                    DB::table('occasion_option_time_slots')->insert([
                        'option_id' => $optionId,
                        'slot_name' => $slot['slot_name'],
                        'slot_name_secondary' => $slot['slot_name_secondary'] ?? null,
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'capacity' => $slot['capacity'] ?? null,
                        'status' => 'active',
                        'sort_order' => $slotIndex,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
                Log::info('Saved time slots', ['option_id' => $optionId, 'count' => count($pkg['time_slots'])]);
            }

            // Save event dates
            if (isset($pkg['date_type']) && $pkg['date_type'] === 'multiple_dates' && !empty($pkg['event_dates']) && Schema::hasTable('occasion_option_dates')) {
                foreach ($pkg['event_dates'] as $date) {
                    DB::table('occasion_option_dates')->insert([
                        'option_id' => $optionId,
                        'event_date' => $date,
                        'status' => 'active',
                        'created_at' => now()
                    ]);
                }
                Log::info('Saved event dates', ['option_id' => $optionId, 'count' => count($pkg['event_dates'])]);
            }

            // Save services - SIMPLIFIED: All services are regular (is_included = true, no additional price)
            if (!empty($pkg['services']) && Schema::hasTable('occasion_option_services')) {
                foreach ($pkg['services'] as $service) {
                    // Handle both formats: object {service_id: x} or plain ID
                    $serviceId = is_array($service) ? ($service['service_id'] ?? $service['id'] ?? null) : $service;

                    if ($serviceId) {
                        // All services are regular services (included in package, no additional price)
                        DB::table('occasion_option_services')->insert([
                            'option_id' => $optionId,
                            'service_id' => $serviceId,
                            'quantity' => 1,
                            'is_included' => true,           // All services are included
                            'additional_price' => 0,         // No additional price for regular services
                            'created_at' => now()
                        ]);
                    }
                }
                Log::info('Saved services to package', ['option_id' => $optionId, 'count' => count($pkg['services'])]);
            }
        }
    }

    /**
     * Update packages for an occasion (SIMPLIFIED - Regular Services Only)
     */
    private function updatePackages($occasionId, $packages, $templeId = null)
    {
        $existingIds = DB::table('occasion_options')->where('occasion_id', $occasionId)->pluck('id')->toArray();
        $updatedIds = [];

        foreach ($packages as $index => $pkg) {
            // Handle image upload to S3 if base64 provided
            $imagePath = null;
            if (!empty($pkg['image_base64'])) {
                $folder = "occasions/{$occasionId}/packages";
                $uploadResult = $this->uploadBase64Image(
                    $pkg['image_base64'],
                    $folder,
                    $pkg['name'] ?? 'package',
                    $templeId
                );

                if ($uploadResult['success']) {
                    $imagePath = $uploadResult['path'];
                    Log::info('Package image uploaded to S3', ['path' => $imagePath]);
                } else {
                    Log::error('Failed to upload package image', ['error' => $uploadResult['message']]);
                }
            } elseif (!empty($pkg['image_path'])) {
                $imagePath = $pkg['image_path'];
            }

            if (!empty($pkg['id']) && in_array($pkg['id'], $existingIds)) {
                // UPDATE EXISTING PACKAGE
                $updateData = [
                    'name' => $pkg['name'],
                    'name_secondary' => $pkg['name_secondary'] ?? null,
                    'description' => $pkg['description'] ?? null,
                    'amount' => $pkg['amount'] ?? 0,
                    'package_mode' => $pkg['package_mode'] ?? 'single',
                    'slot_capacity' => $pkg['slot_capacity'] ?? null,
                    'ledger_id' => !empty($pkg['ledger_id']) ? $pkg['ledger_id'] : null,
                    'date_type' => $pkg['date_type'] ?? 'multiple_dates',
                    'date_range_start' => $pkg['date_range_start'] ?? null,
                    'date_range_end' => $pkg['date_range_end'] ?? null,
                    'status' => $pkg['status'] ?? 'active',
                    'sort_order' => $index,
                    'updated_at' => now()
                ];

                // Only update image_path if a new image was provided
                if ($imagePath) {
                    // Delete old image from S3 first
                    $oldPackage = DB::table('occasion_options')->where('id', $pkg['id'])->first();
                    if ($oldPackage && $oldPackage->image_path && !Str::startsWith($oldPackage->image_path, 'http')) {
                        $this->s3UploadService->deleteSignature($oldPackage->image_path);
                        Log::info('Deleted old package image from S3', ['path' => $oldPackage->image_path]);
                    }
                    $updateData['image_path'] = $imagePath;
                }

                DB::table('occasion_options')->where('id', $pkg['id'])->update($updateData);
                $optionId = $pkg['id'];

                Log::info('Updated package', ['option_id' => $optionId, 'package_name' => $pkg['name']]);

                // Update time slots - delete and recreate
                if (Schema::hasTable('occasion_option_time_slots')) {
                    DB::table('occasion_option_time_slots')->where('option_id', $optionId)->delete();
                    if (!empty($pkg['time_slots'])) {
                        foreach ($pkg['time_slots'] as $slotIndex => $slot) {
                            DB::table('occasion_option_time_slots')->insert([
                                'option_id' => $optionId,
                                'slot_name' => $slot['slot_name'],
                                'slot_name_secondary' => $slot['slot_name_secondary'] ?? null,
                                'start_time' => $slot['start_time'],
                                'end_time' => $slot['end_time'],
                                'capacity' => $slot['capacity'] ?? null,
                                'status' => 'active',
                                'sort_order' => $slotIndex,
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);
                        }
                        Log::info('Updated time slots', ['option_id' => $optionId, 'count' => count($pkg['time_slots'])]);
                    }
                }

                // Update event dates - delete and recreate
                if (Schema::hasTable('occasion_option_dates')) {
                    DB::table('occasion_option_dates')->where('option_id', $optionId)->delete();
                    if (isset($pkg['date_type']) && $pkg['date_type'] === 'multiple_dates' && !empty($pkg['event_dates'])) {
                        foreach ($pkg['event_dates'] as $date) {
                            DB::table('occasion_option_dates')->insert([
                                'option_id' => $optionId,
                                'event_date' => $date,
                                'status' => 'active',
                                'created_at' => now()
                            ]);
                        }
                        Log::info('Updated event dates', ['option_id' => $optionId, 'count' => count($pkg['event_dates'])]);
                    }
                }

                // Update services - SIMPLIFIED: Delete and recreate with all regular services
                if (Schema::hasTable('occasion_option_services')) {
                    DB::table('occasion_option_services')->where('option_id', $optionId)->delete();
                    if (!empty($pkg['services'])) {
                        foreach ($pkg['services'] as $service) {
                            $serviceId = is_array($service) ? ($service['service_id'] ?? $service['id'] ?? null) : $service;

                            if ($serviceId) {
                                // All services are regular services (included, no additional price)
                                DB::table('occasion_option_services')->insert([
                                    'option_id' => $optionId,
                                    'service_id' => $serviceId,
                                    'quantity' => 1,
                                    'is_included' => true,           // All services included
                                    'additional_price' => 0,         // No additional price
                                    'created_at' => now()
                                ]);
                            }
                        }
                        Log::info('Updated services', ['option_id' => $optionId, 'count' => count($pkg['services'])]);
                    }
                }

                $updatedIds[] = $optionId;

            } else {
                // CREATE NEW PACKAGE
                $optionId = DB::table('occasion_options')->insertGetId([
                    'occasion_id' => $occasionId,
                    'name' => $pkg['name'],
                    'name_secondary' => $pkg['name_secondary'] ?? null,
                    'description' => $pkg['description'] ?? null,
                    'amount' => $pkg['amount'] ?? 0,
                    'package_mode' => $pkg['package_mode'] ?? 'single',
                    'slot_capacity' => $pkg['slot_capacity'] ?? null,
                    'ledger_id' => !empty($pkg['ledger_id']) ? $pkg['ledger_id'] : null,
                    'date_type' => $pkg['date_type'] ?? 'multiple_dates',
                    'date_range_start' => $pkg['date_range_start'] ?? null,
                    'date_range_end' => $pkg['date_range_end'] ?? null,
                    'image_path' => $imagePath,
                    'status' => $pkg['status'] ?? 'active',
                    'sort_order' => $index,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                Log::info('Created new package', ['option_id' => $optionId, 'package_name' => $pkg['name']]);

                // Save time slots
                if (!empty($pkg['time_slots']) && Schema::hasTable('occasion_option_time_slots')) {
                    foreach ($pkg['time_slots'] as $slotIndex => $slot) {
                        DB::table('occasion_option_time_slots')->insert([
                            'option_id' => $optionId,
                            'slot_name' => $slot['slot_name'],
                            'slot_name_secondary' => $slot['slot_name_secondary'] ?? null,
                            'start_time' => $slot['start_time'],
                            'end_time' => $slot['end_time'],
                            'capacity' => $slot['capacity'] ?? null,
                            'status' => 'active',
                            'sort_order' => $slotIndex,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                    Log::info('Saved time slots for new package', ['option_id' => $optionId, 'count' => count($pkg['time_slots'])]);
                }

                // Save event dates
                if (isset($pkg['date_type']) && $pkg['date_type'] === 'multiple_dates' && !empty($pkg['event_dates']) && Schema::hasTable('occasion_option_dates')) {
                    foreach ($pkg['event_dates'] as $date) {
                        DB::table('occasion_option_dates')->insert([
                            'option_id' => $optionId,
                            'event_date' => $date,
                            'status' => 'active',
                            'created_at' => now()
                        ]);
                    }
                    Log::info('Saved event dates for new package', ['option_id' => $optionId, 'count' => count($pkg['event_dates'])]);
                }

                // Save services - SIMPLIFIED: All regular services
                if (!empty($pkg['services']) && Schema::hasTable('occasion_option_services')) {
                    foreach ($pkg['services'] as $service) {
                        $serviceId = is_array($service) ? ($service['service_id'] ?? $service['id'] ?? null) : $service;

                        if ($serviceId) {
                            // All services are regular services (included, no additional price)
                            DB::table('occasion_option_services')->insert([
                                'option_id' => $optionId,
                                'service_id' => $serviceId,
                                'quantity' => 1,
                                'is_included' => true,           // All services included
                                'additional_price' => 0,         // No additional price
                                'created_at' => now()
                            ]);
                        }
                    }
                    Log::info('Saved services for new package', ['option_id' => $optionId, 'count' => count($pkg['services'])]);
                }

                $updatedIds[] = $optionId;
            }
        }

        // Delete removed packages (and their S3 images)
        $toDelete = array_diff($existingIds, $updatedIds);
        if (!empty($toDelete)) {
            // Delete images from S3 first
            $oldPackages = DB::table('occasion_options')->whereIn('id', $toDelete)->get();
            foreach ($oldPackages as $oldPkg) {
                if ($oldPkg->image_path && !Str::startsWith($oldPkg->image_path, 'http')) {
                    $this->s3UploadService->deleteSignature($oldPkg->image_path);
                    Log::info('Deleted package image from S3 on package delete', ['path' => $oldPkg->image_path]);
                }
            }
            // Delete related data
            DB::table('occasion_option_time_slots')->whereIn('option_id', $toDelete)->delete();
            DB::table('occasion_option_dates')->whereIn('option_id', $toDelete)->delete();
            DB::table('occasion_option_services')->whereIn('option_id', $toDelete)->delete();
            DB::table('occasion_options')->whereIn('id', $toDelete)->delete();

            Log::info('Deleted removed packages', ['count' => count($toDelete), 'ids' => $toDelete]);
        }
    }
}