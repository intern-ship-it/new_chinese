// backend/app/Http/Controllers/AddonServiceController.php
<?php

namespace App\Http\Controllers;

use App\Models\AddonService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AddonServiceController extends Controller
{
    /**
     * Get all addon services with pagination
     */
    public function index(Request $request)
    {
        try {
            $query = AddonService::with(['group:id,group_name,group_name_chinese', 'createdBy:id,name', 'updatedBy:id,name']);

            // Filter by group
            if ($request->filled('addon_group_id')) {
                $query->where('addon_group_id', $request->addon_group_id);
            }

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('service_name', 'ILIKE', "%{$search}%")
                        ->orWhere('service_name_chinese', 'ILIKE', "%{$search}%")
                        ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'service_name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $services = $query->paginate($perPage);

            // Add formatted attributes
            $services->getCollection()->transform(function ($service) {
                $service->internal_amount_formatted = $service->internal_amount_formatted;
                $service->external_amount_formatted = $service->external_amount_formatted;
                $service->price_difference_formatted = $service->price_difference_formatted;
                return $service;
            });

            return response()->json([
                'success' => true,
                'data' => $services->items(),
                'pagination' => [
                    'current_page' => $services->currentPage(),
                    'total_pages' => $services->lastPage(),
                    'per_page' => $services->perPage(),
                    'total' => $services->total(),
                    'from' => $services->firstItem(),
                    'to' => $services->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch addon services',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single addon service
     */
    public function show($id)
    {
        try {
            $service = AddonService::with(['group', 'createdBy:id,name', 'updatedBy:id,name'])->find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Addon service not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $service
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch addon service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new addon service
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'addon_group_id' => 'required|exists:addon_groups,id',
            'service_name' => 'required|string|max:255',
            'service_name_chinese' => 'nullable|string|max:255',
            'internal_amount' => 'required|numeric|min:0',
            'external_amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'unit' => 'nullable|string|max:50',
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
            $service = AddonService::create([
                'addon_group_id' => $request->addon_group_id,
                'service_name' => $request->service_name,
                'service_name_chinese' => $request->service_name_chinese,
                'internal_amount' => $request->internal_amount,
                'external_amount' => $request->external_amount,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'unit' => $request->unit,
                'status' => $request->status,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Addon service created successfully',
                'data' => $service
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create addon service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update addon service
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'addon_group_id' => 'required|exists:addon_groups,id',
            'service_name' => 'required|string|max:255',
            'service_name_chinese' => 'nullable|string|max:255',
            'internal_amount' => 'required|numeric|min:0',
            'external_amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'unit' => 'nullable|string|max:50',
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
            $service = AddonService::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Addon service not found'
                ], 404);
            }

            $service->update([
                'addon_group_id' => $request->addon_group_id,
                'service_name' => $request->service_name,
                'service_name_chinese' => $request->service_name_chinese,
                'internal_amount' => $request->internal_amount,
                'external_amount' => $request->external_amount,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'unit' => $request->unit,
                'status' => $request->status,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Addon service updated successfully',
                'data' => $service
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update addon service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete addon service
     */
    public function destroy($id)
    {
        try {
            $service = AddonService::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Addon service not found'
                ], 404);
            }

            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Addon service deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete addon service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get services by group
     */
    public function getServicesByGroup($groupId)
    {
        try {
            $services = AddonService::where('addon_group_id', $groupId)
                ->active()
                ->select('id', 'service_name', 'service_name_chinese', 'internal_amount', 'external_amount', 'unit')
                ->get();

            // Add formatted attributes
            $services->transform(function ($service) {
                $service->internal_amount_formatted = $service->internal_amount_formatted;
                $service->external_amount_formatted = $service->external_amount_formatted;
                return $service;
            });

            return response()->json([
                'success' => true,
                'data' => $services
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}