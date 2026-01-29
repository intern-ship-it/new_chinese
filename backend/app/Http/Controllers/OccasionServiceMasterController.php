<?php

namespace App\Http\Controllers;

use App\Models\OccasionServiceMaster;
use App\Models\ServiceType;
use App\Models\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class OccasionServiceMasterController extends Controller
{
    /**
     * Get all occasion services with filters
     */
    public function index(Request $request)
    {
        try {
            $query = OccasionServiceMaster::with(['serviceType:id,name', 'ledger:id,name']);

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filter by service type
            if ($request->filled('service_type_id')) {
                $query->where('service_type_id', $request->service_type_id);
            }

            // Filter by addon
            if ($request->has('is_addon') && $request->is_addon !== '') {
                $isAddon = filter_var($request->is_addon, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_addon', $isAddon);
            }

            // Search by name or description
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                      ->orWhere('name_secondary', 'ILIKE', "%{$search}%")
                      ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'sort_order');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Secondary sort by name
            if ($sortBy !== 'name') {
                $query->orderBy('name', 'asc');
            }

            $services = $query->get();

            return response()->json([
                'success' => true,
                'data' => $services,
                'count' => $services->count()
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching occasion services master: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active services only
     */
   public function getActive(Request $request)
{
    try {
        $query = OccasionServiceMaster::with(['serviceType:id,name', 'ledger:id,name'])
            ->where('status', 'active')
            ->where('is_addon', false); 


        // Filter by service type if specified
        if ($request->filled('service_type_id')) {
            $query->where('service_type_id', $request->service_type_id);
        }

        $services = $query->orderBy('sort_order')
                          ->orderBy('name')
                          ->get();

        return response()->json([
            'success' => true,
            'data' => $services,
            'count' => $services->count()
        ], 200);

    } catch (Exception $e) {
        Log::error('Error fetching active occasion services: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch active services',
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
     * Get lookup data (service types and ledgers) for dropdowns
     */
    public function getLookups()
    {
        try {
            // Get active service types
            $serviceTypes = ServiceType::where('status', 1)
                ->orderBy('name')
                ->select('id', 'name')
                ->get();

            // Get active ledgers
            $ledgers = Ledger::orderBy('name')
                ->select('id', 'name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'service_types' => $serviceTypes,
                    'ledgers' => $ledgers
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
     * Get single service by ID
     */
    public function show($id)
    {
        try {
            $service = OccasionServiceMaster::with(['serviceType:id,name', 'ledger:id,name'])
                ->find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $service
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new service
     */
    public function store(Request $request)
    {

        try {
            // Build validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'name_secondary' => 'nullable|string|max:255',
                'description' => 'nullable|string|max:1000',
                'service_type_id' => 'nullable|integer|exists:service_types,id',
                'is_addon' => 'boolean',
                'ledger_id' => 'nullable|integer|exists:ledgers,id',
                'status' => 'required|in:active,inactive',
                'sort_order' => 'nullable|integer|min:0'
            ];

            // Amount is mandatory only if is_addon is true
            $isAddon = filter_var($request->get('is_addon', false), FILTER_VALIDATE_BOOLEAN);
            if ($isAddon) {
                $rules['amount'] = 'required|numeric|min:0';
            } else {
                $rules['amount'] = 'nullable|numeric|min:0';
            }

            $messages = [
                'name.required' => 'Service name is required',
                'name.max' => 'Service name cannot exceed 255 characters',
                'amount.required' => 'Amount is required when service is marked as addon',
                'amount.numeric' => 'Amount must be a valid number',
                'amount.min' => 'Amount cannot be negative',
                'status.required' => 'Status is required',
                'status.in' => 'Status must be either active or inactive',
                'service_type_id.exists' => 'Selected service type is invalid',
                'ledger_id.exists' => 'Selected ledger is invalid'
            ];

            $validator = Validator::make($request->all(), $rules, $messages);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check for duplicate name
            $exists = OccasionServiceMaster::where('name', $request->name)->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'A service with this name already exists'
                ], 422);
            }

            DB::beginTransaction();

            // Get next sort order if not provided
            $sortOrder = $request->sort_order ?? OccasionServiceMaster::max('sort_order') + 1;

            $service = OccasionServiceMaster::create([
                'name' => trim($request->name),
                'name_secondary' => $request->name_secondary ? trim($request->name_secondary) : null,
                'description' => $request->description ? trim($request->description) : null,
                'service_type_id' => $request->service_type_id ?: null,
                'is_addon' => $isAddon,
                'amount' => $isAddon ? $request->amount : ($request->amount ?? 0),
                'ledger_id' => $request->ledger_id ?: null,
                'status' => $request->status,
                'sort_order' => $sortOrder
            ]);

            DB::commit();

            // Load relationships for response
            $service->load(['serviceType:id,name', 'ledger:id,name']);

            Log::info('Occasion service master created', ['id' => $service->id, 'name' => $service->name]);

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully',
                'data' => $service
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating occasion service master: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update existing service
     */
    public function update(Request $request, $id)
    {
        try {
            $service = OccasionServiceMaster::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            // Build validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'name_secondary' => 'nullable|string|max:255',
                'description' => 'nullable|string|max:1000',
                'service_type_id' => 'nullable|integer|exists:service_types,id',
                'is_addon' => 'boolean',
                'ledger_id' => 'nullable|integer|exists:ledgers,id',
                'status' => 'required|in:active,inactive',
                'sort_order' => 'nullable|integer|min:0'
            ];

            // Amount is mandatory only if is_addon is true
            $isAddon = filter_var($request->get('is_addon', false), FILTER_VALIDATE_BOOLEAN);
            if ($isAddon) {
                $rules['amount'] = 'required|numeric|min:0';
            } else {
                $rules['amount'] = 'nullable|numeric|min:0';
            }

            $messages = [
                'name.required' => 'Service name is required',
                'name.max' => 'Service name cannot exceed 255 characters',
                'amount.required' => 'Amount is required when service is marked as addon',
                'amount.numeric' => 'Amount must be a valid number',
                'amount.min' => 'Amount cannot be negative',
                'status.required' => 'Status is required',
                'status.in' => 'Status must be either active or inactive',
                'service_type_id.exists' => 'Selected service type is invalid',
                'ledger_id.exists' => 'Selected ledger is invalid'
            ];

            $validator = Validator::make($request->all(), $rules, $messages);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check for duplicate name (excluding current record)
            $exists = OccasionServiceMaster::where('name', $request->name)
                ->where('id', '!=', $id)
                ->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'A service with this name already exists'
                ], 422);
            }

            DB::beginTransaction();

            $service->update([
                'name' => trim($request->name),
                'name_secondary' => $request->name_secondary ? trim($request->name_secondary) : null,
                'description' => $request->description ? trim($request->description) : null,
                'service_type_id' => $request->service_type_id ?: null,
                'is_addon' => $isAddon,
                'amount' => $isAddon ? $request->amount : ($request->amount ?? 0),
                'ledger_id' => $request->ledger_id ?: null,
                'status' => $request->status,
                'sort_order' => $request->sort_order ?? $service->sort_order
            ]);

            DB::commit();

            // Reload with relationships
            $service->load(['serviceType:id,name', 'ledger:id,name']);

            Log::info('Occasion service master updated', ['id' => $service->id, 'name' => $service->name]);

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully',
                'data' => $service
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating occasion service master: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update service status only
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $service = OccasionServiceMaster::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:active,inactive'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid status value',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldStatus = $service->status;
            $service->update(['status' => $request->status]);

            Log::info('Occasion service master status updated', [
                'id' => $service->id,
                'name' => $service->name,
                'old_status' => $oldStatus,
                'new_status' => $request->status
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service status updated successfully',
                'data' => [
                    'id' => $service->id,
                    'status' => $service->status
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Error updating occasion service master status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete service
     */
    public function destroy($id)
    {
        try {
            $service = OccasionServiceMaster::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            // Check if service is being used in any occasion options
            $usageCount = DB::table('occasion_option_services')
                ->where('service_id', $id)
                ->count();

            if ($usageCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete service. It is being used in {$usageCount} occasion package(s). Please remove it from all packages first or set status to inactive."
                ], 422);
            }

            $serviceName = $service->name;
            $service->delete();

            Log::info('Occasion service master deleted', ['id' => $id, 'name' => $serviceName]);

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ], 200);

        } catch (Exception $e) {
            Log::error('Error deleting occasion service master: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update sort order
     */
    public function updateSortOrder(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'items' => 'required|array',
                'items.*.id' => 'required|integer|exists:occasion_services_master,id',
                'items.*.sort_order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            foreach ($request->items as $item) {
                OccasionServiceMaster::where('id', $item['id'])
                    ->update(['sort_order' => $item['sort_order']]);
            }

            DB::commit();

            Log::info('Occasion service master sort order updated', ['count' => count($request->items)]);

            return response()->json([
                'success' => true,
                'message' => 'Sort order updated successfully'
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating sort order: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sort order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get services for select dropdown (minimal data)
     */
    public function getForSelect(Request $request)
    {
        try {
            $query = OccasionServiceMaster::where('status', 'active')
                ->select('id', 'name', 'name_secondary', 'is_addon', 'amount');

            // Filter by addon if specified
            if ($request->has('is_addon') && $request->is_addon !== '') {
                $isAddon = filter_var($request->is_addon, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_addon', $isAddon);
            }

            $services = $query->orderBy('sort_order')
                              ->orderBy('name')
                              ->get();

            return response()->json([
                'success' => true,
                'data' => $services
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching services for select: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getActiveAddons()
{
    try {
        $addons = DB::table('occasion_services_master')
            ->where('status', 'active')
            ->where('is_addon', true)
            ->orderBy('name')
            ->select('id', 'name', 'name_secondary', 'amount')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $addons
        ], 200);
    } catch (Exception $e) {
        Log::error('Error fetching active addon services', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch addon services'
        ], 500);
    }
}
}