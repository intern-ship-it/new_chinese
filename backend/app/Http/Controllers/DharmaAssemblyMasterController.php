<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use App\Models\DharmaAssemblyMaster;

class DharmaAssemblyMasterController extends Controller
{
    /**
     * Get all dharma assembly masters
     */
    public function index(Request $request)
    {
        try {
            $query = DharmaAssemblyMaster::whereNull('deleted_at')
                ->orderBy('created_at', 'desc');

            // Filter by status if provided
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Search by name if provided
            if ($request->has('search')) {
                $search = $request->search;
                $query->where('name', 'ILIKE', "%{$search}%");
            }

            $masters = $query->get();

            return response()->json([
                'success' => true,
                'data' => $masters,
                'message' => 'Masters retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving masters',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single dharma assembly master
     */
    public function show($id)
    {
        try {
            $master = DharmaAssemblyMaster::whereNull('deleted_at')->find($id);

            if (!$master) {
                return response()->json([
                    'success' => false,
                    'message' => 'Master not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $master,
                'message' => 'Master retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new dharma assembly master
     */
    public function store(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:300',
            'application_options' => 'required|array|min:1',
            'application_options.*.name' => 'required|string|max:200',
            'application_options.*.amount' => 'required|numeric|min:0',
            'enable_dedication' => 'required|boolean',
            'dedication_name' => 'nullable|string|max:200',
            'dedication_options' => 'nullable|array',
            'dedication_options.*' => 'string|max:300',
            'enable_offering' => 'required|boolean',
            'offerings' => 'nullable|array',
            'offerings.*.name' => 'required|string|max:200',
            'offerings.*.options' => 'required|array|min:1',
            'offerings.*.options.*.name' => 'required|string|max:200',
            'offerings.*.options.*.amount' => 'required|numeric|min:0',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Check if master with same name exists
            $exists = DharmaAssemblyMaster::where('name', $request->name)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Master with this name already exists'
                ], 422);
            }

            // Validate dedication if enabled
            if ($request->enable_dedication) {
                if (empty($request->dedication_name)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Dedication name is required when dedication is enabled'
                    ], 422);
                }

                if (empty($request->dedication_options)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'At least one dedication entry is required when dedication is enabled'
                    ], 422);
                }
            }

            // Validate offerings if enabled
            if ($request->enable_offering) {
                if (empty($request->offerings)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'At least one offering is required when offering is enabled'
                    ], 422);
                }
            }

            // Create master
            $master = DharmaAssemblyMaster::create([
                'name' => $request->name,
                'application_options' => json_encode($request->application_options),
                'enable_dedication' => $request->enable_dedication,
                'dedication_name' => $request->dedication_name,
                'dedication_options' => $request->enable_dedication ? json_encode($request->dedication_options) : null,
                'enable_offering' => $request->enable_offering,
                'offerings' => $request->enable_offering ? json_encode($request->offerings) : null,
                'status' => $request->status,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Master created successfully',
                'data' => $master
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update dharma assembly master
     */
    public function update(Request $request, $id)
    {
        try {
            $master = DharmaAssemblyMaster::whereNull('deleted_at')->find($id);

            if (!$master) {
                return response()->json([
                    'success' => false,
                    'message' => 'Master not found'
                ], 404);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'string|max:300',
                'application_options' => 'array|min:1',
                'application_options.*.name' => 'required|string|max:200',
                'application_options.*.amount' => 'required|numeric|min:0',
                'enable_dedication' => 'boolean',
                'dedication_name' => 'nullable|string|max:200',
                'dedication_options' => 'nullable|array',
                'dedication_options.*' => 'string|max:300',
                'enable_offering' => 'boolean',
                'offerings' => 'nullable|array',
                'offerings.*.name' => 'required|string|max:200',
                'offerings.*.options' => 'required|array|min:1',
                'offerings.*.options.*.name' => 'required|string|max:200',
                'offerings.*.options.*.amount' => 'required|numeric|min:0',
                'status' => 'integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Check if master with same name exists (excluding current)
            if ($request->has('name')) {
                $exists = DharmaAssemblyMaster::where('name', $request->name)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Master with this name already exists'
                    ], 422);
                }
            }

            // Validate dedication if being enabled
            if ($request->has('enable_dedication') && $request->enable_dedication) {
                if (!$request->has('dedication_name') || empty($request->dedication_name)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Dedication name is required when dedication is enabled'
                    ], 422);
                }

                if (!$request->has('dedication_options') || empty($request->dedication_options)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'At least one dedication entry is required when dedication is enabled'
                    ], 422);
                }
            }

            // Validate offerings if being enabled
            if ($request->has('enable_offering') && $request->enable_offering) {
                if (!$request->has('offerings') || empty($request->offerings)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'At least one offering is required when offering is enabled'
                    ], 422);
                }
            }

            // Update fields
            $updateData = [
                'updated_by' => Auth::id()
            ];

            if ($request->has('name')) {
                $updateData['name'] = $request->name;
            }

            if ($request->has('application_options')) {
                $updateData['application_options'] = json_encode($request->application_options);
            }

            if ($request->has('enable_dedication')) {
                $updateData['enable_dedication'] = $request->enable_dedication;
                $updateData['dedication_name'] = $request->enable_dedication ? $request->dedication_name : null;
                $updateData['dedication_options'] = $request->enable_dedication ? json_encode($request->dedication_options) : null;
            }

            if ($request->has('enable_offering')) {
                $updateData['enable_offering'] = $request->enable_offering;
                $updateData['offerings'] = $request->enable_offering ? json_encode($request->offerings) : null;
            }

            if ($request->has('status')) {
                $updateData['status'] = $request->status;
            }

            $master->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Master updated successfully',
                'data' => $master->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error updating master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft delete dharma assembly master
     */
    public function destroy($id)
    {
        try {
            $master = DharmaAssemblyMaster::whereNull('deleted_at')->find($id);

            if (!$master) {
                return response()->json([
                    'success' => false,
                    'message' => 'Master not found'
                ], 404);
            }

            DB::beginTransaction();

            // Check if master is being used in any bookings
            // TODO: Implement this check when booking table is created
            // $bookingCount = DharmaAssemblyBooking::where('master_id', $id)->count();
            // if ($bookingCount > 0) {
            //     return response()->json([
            //         'success' => false,
            //         'message' => "Cannot delete master. It is used in {$bookingCount} booking(s)"
            //     ], 409);
            // }

            // Soft delete
            $master->update([
                'deleted_at' => now(),
                'deleted_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Master deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active masters only (for dropdown/selection)
     */
    public function getActiveMasters()
    {
        try {
            $masters = DharmaAssemblyMaster::where('status', 1)
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->select('id', 'name', 'application_options', 'enable_dedication', 'dedication_name', 'dedication_options', 'enable_offering', 'offerings')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $masters,
                'message' => 'Active masters retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving active masters',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle master status
     */
    public function toggleStatus($id)
    {
        try {
            $master = DharmaAssemblyMaster::whereNull('deleted_at')->find($id);

            if (!$master) {
                return response()->json([
                    'success' => false,
                    'message' => 'Master not found'
                ], 404);
            }

            $master->update([
                'status' => $master->status === 1 ? 0 : 1,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Master status updated successfully',
                'data' => $master->fresh()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating master status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duplicate master configuration
     */
    public function duplicate($id)
    {
        try {
            $master = DharmaAssemblyMaster::whereNull('deleted_at')->find($id);

            if (!$master) {
                return response()->json([
                    'success' => false,
                    'message' => 'Master not found'
                ], 404);
            }

            DB::beginTransaction();

            // Create duplicate with modified name
            $duplicateName = $master->name . ' (Copy)';
            $counter = 1;

            // Ensure unique name
            while (DharmaAssemblyMaster::where('name', $duplicateName)->whereNull('deleted_at')->exists()) {
                $counter++;
                $duplicateName = $master->name . " (Copy {$counter})";
            }

            $duplicate = DharmaAssemblyMaster::create([
                'name' => $duplicateName,
                'application_options' => $master->application_options,
                'enable_dedication' => $master->enable_dedication,
                'dedication_name' => $master->dedication_name,
                'dedication_options' => $master->dedication_options,
                'enable_offering' => $master->enable_offering,
                'offerings' => $master->offerings,
                'status' => 0, // Set as inactive by default
                'created_by' => Auth::id(),
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Master duplicated successfully',
                'data' => $duplicate
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error duplicating master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get master statistics
     */
    public function getStatistics()
    {
        try {
            $stats = [
                'total' => DharmaAssemblyMaster::whereNull('deleted_at')->count(),
                'active' => DharmaAssemblyMaster::where('status', 1)->whereNull('deleted_at')->count(),
                'inactive' => DharmaAssemblyMaster::where('status', 0)->whereNull('deleted_at')->count(),
                'with_dedication' => DharmaAssemblyMaster::where('enable_dedication', true)->whereNull('deleted_at')->count(),
                'with_offering' => DharmaAssemblyMaster::where('enable_offering', true)->whereNull('deleted_at')->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistics retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}