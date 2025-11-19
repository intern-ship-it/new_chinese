<?php

namespace App\Http\Controllers;

use App\Models\ServiceType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ServiceTypeController extends Controller
{
    /**
     * Get all service types
     */
    public function index(Request $request)
    {
        try {
            $query = ServiceType::with(['createdBy:id,name']);

            // Filter by status (optional)
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search (optional)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', '%' . $search . '%')
                        ->orWhere('code', 'ILIKE', '%' . $search . '%')
                        ->orWhere('description', 'ILIKE', '%' . $search . '%');
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $serviceTypes = $query->paginate($perPage);

            // Add services count to each service type
            $serviceTypes->getCollection()->transform(function ($item) {
                $item->services_count = $item->services()->count();
                return $item;
            });
            $user = Auth::user();
            $permissions = [
                'can_create_service_types' => $user->can('service_types.create'),
                'can_edit_service_types' => $user->can('service_types.edit'),
                'can_delete_service_types' => $user->can('service_types.delete'),
                'can_view_service_types' => $user->can('service_types.view'),
            ];
           
            return response()->json([
                'success' => true,
                'data' => $serviceTypes->items(),
                'permissions' => $permissions,
                'pagination' => [
                    'current_page' => $serviceTypes->currentPage(),
                    'total_pages' => $serviceTypes->lastPage(),
                    'per_page' => $serviceTypes->perPage(),
                    'total' => $serviceTypes->total()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service types',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get single service type
     */
    public function show($id)
    {
        try {
            $serviceType = ServiceType::with(['services', 'createdBy:id,name'])->find($id);

            $user = Auth::user();
            $permissions = [

                'can_edit_service_types' => $user->can('service_types.edit'),
                'can_delete_service_types' => $user->can('service_types.delete'),

            ];
            if (!$serviceType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service type not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'permissions' => $permissions,
                'data' => $serviceType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new service type
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('service_types.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create service types'
            ], 403);
        }
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'code' => 'nullable|string|max:50|unique:service_types,code',
                'description' => 'nullable|string',
                'status' => 'nullable|integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $serviceType = ServiceType::create([
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'status' => $request->status ?? 1,
                'created_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Service type created successfully',
                'data' => $serviceType
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update service type
     */
    public function update(Request $request, $id)
    {
                if (!Auth::user()->can('service_types.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit service types'
            ], 403);
        }
        try {
            $serviceType = ServiceType::find($id);

            if (!$serviceType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service type not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'code' => 'nullable|string|max:50|unique:service_types,code,' . $id,
                'description' => 'nullable|string',
                'status' => 'nullable|integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $serviceType->update([
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'status' => $request->status ?? $serviceType->status
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Service type updated successfully',
                'data' => $serviceType
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete service type
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('service_types.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete service types'
            ], 403);
        }

        try {
            $serviceType = ServiceType::find($id);

            if (!$serviceType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service type not found'
                ], 404);
            }

            // Check if service type can be deleted
            if (!$serviceType->canBeDeleted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete service type. It has services associated with it.'
                ], 400);
            }

            DB::beginTransaction();

            $serviceType->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Service type deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active service types for dropdown
     */
    public function getActiveServiceTypes()
    {
        try {
            $serviceTypes = ServiceType::active()
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $serviceTypes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service types',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
