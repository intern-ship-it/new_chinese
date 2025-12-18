<?php

namespace App\Http\Controllers;

use App\Models\SpecialOccasion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Exception;

class SpecialOccasionController extends Controller
{
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
            // DEBUG: Log connection info
            $connectionName = DB::getDefaultConnection();
            $databaseName = DB::connection()->getDatabaseName();
            Log::info('========== DEBUG: SpecialOccasionController@index ==========');
            Log::info('Default Connection: ' . $connectionName);
            Log::info('Database Name: ' . $databaseName);
            Log::info('Request params: ' . json_encode($request->all()));
            Log::info('X-Temple-ID header: ' . $request->header('X-Temple-ID'));
            Log::info('============================================================');

            $query = SpecialOccasion::query();

            // Filters - use filled() to properly check for non-empty values
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

            // Get occasions - with packages count if table exists
            if ($this->hasPackagesTable()) {
                $occasions = $query->withCount(['packages as packages_count'])
                                   ->orderBy('created_at', 'desc')
                                   ->get();
            } else {
                // Fallback: count from JSONB column
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
                
                // Add counts to each package
                if ($occasion && $occasion->packages) {
                    foreach ($occasion->packages as $package) {
                        $package->time_slots_count = $package->timeSlots->count();
                        $package->event_dates_count = $package->dates->count();
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
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Handle old JSONB format for backward compatibility
            $occasionOptions = [];
            if ($request->has('occasion_options')) {
                $occasionOptions = $request->occasion_options;
            }

            // Create the occasion
            $occasion = SpecialOccasion::create([
                'occasion_name_primary' => $request->occasion_name_primary,
                'occasion_name_secondary' => $request->occasion_name_secondary,
                'primary_lang' => $request->primary_lang ?? 'English',
                'secondary_lang' => $request->secondary_lang,
                'status' => $request->status ?? 'active',
                'occasion_options' => $occasionOptions
            ]);

            // Create packages if provided AND table exists
            if ($this->hasPackagesTable() && $request->has('packages') && is_array($request->packages)) {
                $this->savePackages($occasion->id, $request->packages);
            }

            DB::commit();

            // Reload
            if ($this->hasPackagesTable()) {
                $occasion->load(['packages.timeSlots', 'packages.dates']);
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
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Handle old JSONB format
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

            $occasion->update($updateData);

            // Update packages if table exists
            if ($this->hasPackagesTable() && $request->has('packages')) {
                $this->updatePackages($occasion->id, $request->packages);
            }

            DB::commit();

            // Reload
            if ($this->hasPackagesTable()) {
                $occasion->load(['packages.timeSlots', 'packages.dates']);
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

            // Delete packages if table exists
            if ($this->hasPackagesTable()) {
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

    private function savePackages($occasionId, $packages)
    {
        foreach ($packages as $index => $pkg) {
            $optionId = DB::table('occasion_options')->insertGetId([
                'occasion_id' => $occasionId,
                'name' => $pkg['name'],
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
                'created_at' => now(),
                'updated_at' => now()
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
            }

            // Save event dates (NO updated_at column)
            if (isset($pkg['date_type']) && $pkg['date_type'] === 'multiple_dates' && !empty($pkg['event_dates']) && Schema::hasTable('occasion_option_dates')) {
                foreach ($pkg['event_dates'] as $date) {
                    DB::table('occasion_option_dates')->insert([
                        'option_id' => $optionId,
                        'event_date' => $date,
                        'status' => 'active',
                        'created_at' => now()
                    ]);
                }
            }

            // Save services
            if (!empty($pkg['services']) && Schema::hasTable('occasion_option_services')) {
                foreach ($pkg['services'] as $serviceId) {
                    DB::table('occasion_option_services')->insert([
                        'option_id' => $optionId,
                        'service_id' => $serviceId,
                        'quantity' => 1,
                        'is_included' => true,
                        'created_at' => now()
                    ]);
                }
            }
        }
    }

    private function updatePackages($occasionId, $packages)
    {
        $existingIds = DB::table('occasion_options')->where('occasion_id', $occasionId)->pluck('id')->toArray();
        $updatedIds = [];

        foreach ($packages as $index => $pkg) {
            if (!empty($pkg['id']) && in_array($pkg['id'], $existingIds)) {
                // Update existing package
                DB::table('occasion_options')->where('id', $pkg['id'])->update([
                    'name' => $pkg['name'],
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
                ]);
                $optionId = $pkg['id'];

                // Update time slots
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
                    }
                }

                // Update event dates (NO updated_at)
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
                    }
                }

                // Update services
                if (Schema::hasTable('occasion_option_services')) {
                    DB::table('occasion_option_services')->where('option_id', $optionId)->delete();
                    if (!empty($pkg['services'])) {
                        foreach ($pkg['services'] as $serviceId) {
                            DB::table('occasion_option_services')->insert([
                                'option_id' => $optionId,
                                'service_id' => $serviceId,
                                'quantity' => 1,
                                'is_included' => true,
                                'created_at' => now()
                            ]);
                        }
                    }
                }
                $updatedIds[] = $optionId;
            } else {
                // Create new package
                $optionId = DB::table('occasion_options')->insertGetId([
                    'occasion_id' => $occasionId,
                    'name' => $pkg['name'],
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
                    'created_at' => now(),
                    'updated_at' => now()
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
                }

                // Save event dates (NO updated_at)
                if (isset($pkg['date_type']) && $pkg['date_type'] === 'multiple_dates' && !empty($pkg['event_dates']) && Schema::hasTable('occasion_option_dates')) {
                    foreach ($pkg['event_dates'] as $date) {
                        DB::table('occasion_option_dates')->insert([
                            'option_id' => $optionId,
                            'event_date' => $date,
                            'status' => 'active',
                            'created_at' => now()
                        ]);
                    }
                }

                // Save services
                if (!empty($pkg['services']) && Schema::hasTable('occasion_option_services')) {
                    foreach ($pkg['services'] as $serviceId) {
                        DB::table('occasion_option_services')->insert([
                            'option_id' => $optionId,
                            'service_id' => $serviceId,
                            'quantity' => 1,
                            'is_included' => true,
                            'created_at' => now()
                        ]);
                    }
                }
                $updatedIds[] = $optionId;
            }
        }

        // Delete removed packages
        $toDelete = array_diff($existingIds, $updatedIds);
        if (!empty($toDelete)) {
            DB::table('occasion_options')->whereIn('id', $toDelete)->delete();
        }
    }
}