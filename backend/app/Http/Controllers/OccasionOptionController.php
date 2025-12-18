<?php

namespace App\Http\Controllers;

use App\Models\OccasionOption;
use App\Models\OccasionOptionTimeSlot;
use App\Models\OccasionOptionDate;
use App\Models\Ledger;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Exception;

class OccasionOptionController extends Controller
{
    /**
     * Get all options for a specific occasion
     */
    public function index(Request $request, $occasionId)
    {
        try {
            $query = OccasionOption::with([
                'ledger:id,name',
                'activeTimeSlots',
                'activeEventDates'
            ])
                ->where('occasion_id', $occasionId)
                ->orderBy('sort_order')
                ->orderBy('created_at', 'desc');

            if ($request->has('status') && $request->status !== '') {
                $query->where('status', $request->status);
            }

            $options = $query->get();

            return response()->json([
                'success' => true,
                'data' => $options,
                'count' => $options->count()
            ], 200);
        } catch (Exception $e) {
            Log::error('Error fetching occasion options: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch packages',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single option with full details
     */
    public function show($id)
    {
        try {
            $option = OccasionOption::with([
                'occasion:id,occasion_name_primary,occasion_name_secondary',
                'ledger:id,name',
                'timeSlots',
                'eventDates',
                'services'
            ])->find($id);

            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $option
            ], 200);
        } catch (Exception $e) {
            Log::error('Error fetching option: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new occasion option (Temple Event Package)
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'occasion_id' => 'required|exists:special_occ_master,id',
                'name' => 'required|string|max:255',
                'name_secondary' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'description_secondary' => 'nullable|string',
                'amount' => 'required|numeric|min:0',
                'package_mode' => 'required|in:single,multiple',
                'slot_capacity' => 'nullable|integer|min:1',
                'ledger_id' => 'nullable|exists:ledgers,id',
                'date_type' => 'required|in:multiple_dates,date_range',
                'date_range_start' => 'required_if:date_type,date_range|nullable|date',
                'date_range_end' => 'required_if:date_type,date_range|nullable|date|after_or_equal:date_range_start',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'status' => 'nullable|in:active,inactive',
                'time_slots' => 'nullable|array',
                'time_slots.*.slot_name' => 'required_with:time_slots|string|max:100',
                'time_slots.*.start_time' => 'required_with:time_slots',
                'time_slots.*.end_time' => 'required_with:time_slots',
                'event_dates' => 'required_if:date_type,multiple_dates|array',
                'event_dates.*' => 'date',
                'services' => 'nullable|array',
                'services.*.service_id' => 'required_with:services|exists:services,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Handle image upload
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $this->uploadImage($request->file('image'), $request->occasion_id);
            }

            // Create the option
            $option = OccasionOption::create([
                'occasion_id' => $request->occasion_id,
                'name' => $request->name,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'description_secondary' => $request->description_secondary,
                'amount' => $request->amount,
                'package_mode' => $request->package_mode,
                'slot_capacity' => $request->package_mode === 'multiple' ? $request->slot_capacity : null,
                'ledger_id' => $request->ledger_id,
                'date_type' => $request->date_type,
                'date_range_start' => $request->date_type === 'date_range' ? $request->date_range_start : null,
                'date_range_end' => $request->date_type === 'date_range' ? $request->date_range_end : null,
                'image_path' => $imagePath,
                'status' => $request->status ?? 'active',
                'sort_order' => $request->sort_order ?? 0,
                'created_by' => auth()->id()
            ]);

            // Create time slots
            if ($request->has('time_slots') && is_array($request->time_slots)) {
                foreach ($request->time_slots as $index => $slot) {
                    OccasionOptionTimeSlot::create([
                        'option_id' => $option->id,
                        'slot_name' => $slot['slot_name'],
                        'slot_name_secondary' => $slot['slot_name_secondary'] ?? null,
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'capacity' => $slot['capacity'] ?? null,
                        'status' => 'active',
                        'sort_order' => $index
                    ]);
                }
            }

            // Create event dates (for multiple_dates type)
            if ($request->date_type === 'multiple_dates' && $request->has('event_dates')) {
                foreach ($request->event_dates as $date) {
                    OccasionOptionDate::create([
                        'option_id' => $option->id,
                        'event_date' => $date,
                        'status' => 'active'
                    ]);
                }
            }

            // Attach services
            if ($request->has('services') && is_array($request->services)) {
                foreach ($request->services as $service) {
                    DB::table('occasion_option_services')->insert([
                        'option_id' => $option->id,
                        'service_id' => $service['service_id'],
                        'quantity' => $service['quantity'] ?? 1,
                        'is_included' => $service['is_included'] ?? true,
                        'additional_price' => $service['additional_price'] ?? 0,
                        'created_at' => now()
                    ]);
                }
            }

            DB::commit();

            $option->load(['ledger', 'timeSlots', 'eventDates', 'services']);

            return response()->json([
                'success' => true,
                'message' => 'Package created successfully',
                'data' => $option
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating occasion option: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an occasion option
     */
    public function update(Request $request, $id)
    {
        try {
            $option = OccasionOption::find($id);

            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'name_secondary' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'description_secondary' => 'nullable|string',
                'amount' => 'sometimes|required|numeric|min:0',
                'package_mode' => 'sometimes|required|in:single,multiple',
                'slot_capacity' => 'nullable|integer|min:1',
                'ledger_id' => 'nullable|exists:ledgers,id',
                'date_type' => 'sometimes|required|in:multiple_dates,date_range',
                'date_range_start' => 'nullable|date',
                'date_range_end' => 'nullable|date|after_or_equal:date_range_start',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'status' => 'nullable|in:active,inactive',
                'time_slots' => 'nullable|array',
                'event_dates' => 'nullable|array',
                'services' => 'nullable|array'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Handle image upload
            if ($request->hasFile('image')) {
                if ($option->image_path) {
                    Storage::disk('public')->delete($option->image_path);
                }
                $option->image_path = $this->uploadImage($request->file('image'), $option->occasion_id);
            }

            // Update basic fields
            $option->fill($request->only([
                'name',
                'name_secondary',
                'description',
                'description_secondary',
                'amount',
                'package_mode',
                'slot_capacity',
                'ledger_id',
                'date_type',
                'date_range_start',
                'date_range_end',
                'status',
                'sort_order'
            ]));
            $option->updated_by = auth()->id();
            $option->save();

            // Update time slots if provided
            if ($request->has('time_slots')) {
                OccasionOptionTimeSlot::where('option_id', $option->id)->delete();

                foreach ($request->time_slots as $index => $slot) {
                    OccasionOptionTimeSlot::create([
                        'option_id' => $option->id,
                        'slot_name' => $slot['slot_name'],
                        'slot_name_secondary' => $slot['slot_name_secondary'] ?? null,
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'capacity' => $slot['capacity'] ?? null,
                        'status' => 'active',
                        'sort_order' => $index
                    ]);
                }
            }

            // Update event dates if provided
            if ($request->has('event_dates')) {
                OccasionOptionDate::where('option_id', $option->id)->delete();

                if ($option->date_type === 'multiple_dates') {
                    foreach ($request->event_dates as $date) {
                        OccasionOptionDate::create([
                            'option_id' => $option->id,
                            'event_date' => $date,
                            'status' => 'active'
                        ]);
                    }
                }
            }

            // Update services if provided
            if ($request->has('services')) {
                DB::table('occasion_option_services')->where('option_id', $option->id)->delete();

                foreach ($request->services as $service) {
                    DB::table('occasion_option_services')->insert([
                        'option_id' => $option->id,
                        'service_id' => $service['service_id'],
                        'quantity' => $service['quantity'] ?? 1,
                        'is_included' => $service['is_included'] ?? true,
                        'additional_price' => $service['additional_price'] ?? 0,
                        'created_at' => now()
                    ]);
                }
            }

            DB::commit();

            $option->load(['ledger', 'timeSlots', 'eventDates', 'services']);

            return response()->json([
                'success' => true,
                'message' => 'Package updated successfully',
                'data' => $option
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating occasion option: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an occasion option
     */
    public function destroy($id)
    {
        try {
            $option = OccasionOption::find($id);

            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            DB::beginTransaction();

            if ($option->image_path) {
                Storage::disk('public')->delete($option->image_path);
            }

            $option->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Package deleted successfully'
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error deleting occasion option: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update option status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $option = OccasionOption::find($id);

            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:active,inactive'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $option->update([
                'status' => $request->status,
                'updated_by' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Package status updated to {$request->status}",
                'data' => $option
            ], 200);
        } catch (Exception $e) {
            Log::error('Error updating option status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get lookup data for dropdowns (ledgers, services)
     */
    public function getLookups()
    {
        try {
            $ledgers = Ledger::whereNull('deleted_at')->orderBy('name')->get(['id', 'name']);
            $services = Service::where('status', 1)->orderBy('name')->get(['id', 'name', 'price']);

            return response()->json([
                'success' => true,
                'data' => [
                    'ledgers' => $ledgers,
                    'services' => $services
                ]
            ], 200);
        } catch (Exception $e) {
            Log::error('Error fetching lookups: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lookup data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload image helper
     */
    private function uploadImage($file, $occasionId)
    {
        $temple = session('temple_id', 'temple1');
        $path = "uploads/{$temple}/occasions/{$occasionId}/packages";
        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();

        return $file->storeAs($path, $filename, 'public');
    }
}