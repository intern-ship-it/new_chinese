<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\ServiceType;
use App\Models\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    /**
     * Get all services
     */
    public function index(Request $request)
    {
        try {
            $query = Service::with([
                'serviceType:id,name,code',
                'ledger:id,name,right_code,left_code',
                'createdBy:id,name'
            ]);

            // Filter by service type
            if ($request->filled('service_type_id')) {
                $query->where('service_type_id', $request->service_type_id);
            }

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search (only apply if search param is not empty)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('code', 'ILIKE', "%{$search}%")
                        ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $services = $query->paginate($perPage);
            $user = Auth::user();

            $permissions = [
                'can_create_services' => $user->can('services.create'),
                'can_edit_services' => $user->can('services.edit'),
                'can_delete_services' => $user->can('services.delete'),
                'can_view_services' => $user->can('services.view'),
            ];
            return response()->json([
                'success' => true,
                'data' => $services->items(),
                'permissions' => $permissions,
                'pagination' => [
                    'current_page' => $services->currentPage(),
                    'total_pages' => $services->lastPage(),
                    'per_page' => $services->perPage(),
                    'total' => $services->total()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get single service
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = [
            'can_create_services' => $user->can('services.create'),
            'can_edit_services' => $user->can('services.edit'),
            'can_delete_services' => $user->can('services.delete'),
            'can_view_services' => $user->can('services.view'),
        ];
        try {
            $service = Service::with([
                'serviceType:id,name,code',
                'ledger:id,name,right_code,left_code',
                'createdBy:id,name'
            ])->find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $service,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
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
        if (!Auth::user()->can('services.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create services'
            ], 403);
        }
        try {
            $validator = Validator::make($request->all(), [
                'service_type_id' => 'required|integer|exists:service_types,id',
                'ledger_id' => 'required|integer|exists:ledgers,id',
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:50|unique:services,code',
                'description' => 'nullable|string',
                'price' => 'nullable|numeric|min:0',
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

            $service = Service::create([
                'service_type_id' => $request->service_type_id,
                'ledger_id' => $request->ledger_id,
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'price' => $request->price,
                'status' => $request->status ?? 1,
                'created_by' => Auth::id()
            ]);

            // Load relationships for response
            $service->load(['serviceType:id,name', 'ledger:id,name']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully',
                'data' => $service
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update service
     */
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('services.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit services'
            ], 403);
        }
        try {
            $service = Service::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'service_type_id' => 'required|integer|exists:service_types,id',
                'ledger_id' => 'required|integer|exists:ledgers,id',
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:50|unique:services,code,' . $id,
                'description' => 'nullable|string',
                'price' => 'nullable|numeric|min:0',
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

            $service->update([
                'service_type_id' => $request->service_type_id,
                'ledger_id' => $request->ledger_id,
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'price' => $request->price,
                'status' => $request->status ?? $service->status
            ]);

            // Load relationships for response
            $service->load(['serviceType:id,name', 'ledger:id,name']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully',
                'data' => $service
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete service
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('services.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete services'
            ], 403);
        }
        try {
            $service = Service::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            // Check if service can be deleted
            if (!$service->canBeDeleted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete service. It is being used in transactions.'
                ], 400);
            }

            DB::beginTransaction();

            $service->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active services for dropdown
     */
    public function getActiveServices(Request $request)
    {
        try {
            $query = Service::active()
                ->with(['serviceType:id,name', 'ledger:id,name'])
                ->select('id', 'name', 'code', 'price', 'service_type_id', 'ledger_id');

            // Filter by service type if provided
            if ($request->has('service_type_id')) {
                $query->where('service_type_id', $request->service_type_id);
            }

            $services = $query->orderBy('name')->get();

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

    /**
     * Get form data (service types and ledgers for dropdowns)
     */
    public function getFormData()
    {
        try {
            $serviceTypes = ServiceType::active()
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get();

            $ledgers = Ledger::select('ledgers.id', 'ledgers.name', 'ledgers.right_code', 'ledgers.left_code')
                ->join('groups', 'groups.id', '=', 'ledgers.group_id')
                ->whereBetween('groups.code', [5000, 6999])
                ->orderBy('ledgers.name')
                ->get();
            return response()->json([
                'success' => true,
                'data' => [
                    'service_types' => $serviceTypes,
                    'ledgers' => $ledgers
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch form data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
