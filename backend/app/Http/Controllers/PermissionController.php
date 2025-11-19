<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PermissionController extends Controller
{
    /**
     * Get all permissions
     */
    public function index(Request $request)
    {
        try {
            $query = Permission::query();

            // Apply search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                      ->orWhere('display_name', 'like', '%' . $search . '%')
                      ->orWhere('module', 'like', '%' . $search . '%')
                      ->orWhere('description', 'like', '%' . $search . '%');
                });
            }

            // Apply module filter
            if ($request->has('module')) {
                $query->where('module', $request->module);
            }

            $query->orderBy('module')
                  ->orderBy('display_name');

            $permissions = $request->has('per_page') 
                ? $query->paginate($request->per_page)
                : $query->get();

            return response()->json([
                'success' => true,
                'data' => $permissions,
                'message' => 'Permissions retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get permissions grouped by module
     */
    public function getGroupedByModule()
    {
        try {
            $permissions = Permission::select('id', 'name', 'display_name', 'module', 'description')
                ->orderBy('module')
                ->orderBy('display_name')
                ->get()
                ->groupBy('module');

            $modules = [];
            foreach ($permissions as $module => $perms) {
                $modules[] = [
                    'module' => $module,
                    'display_name' => $this->formatModuleName($module),
                    'count' => $perms->count(),
                    'permissions' => $perms
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $modules
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single permission
     */
    public function show($id)
    {
        try {
            $permission = Permission::with('roles:id,name,display_name')
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $permission
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Permission not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new permission
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:permissions,name',
            'display_name' => 'required|string',
            'module' => 'required|string',
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $permission = Permission::create([
                'id' => Str::uuid(),
                'name' => $request->name,
                'display_name' => $request->display_name,
                'module' => $request->module,
                'description' => $request->description,
                'guard_name' => 'api'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Permission created successfully',
                'data' => $permission
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create multiple permissions
     */
    public function bulkStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'module' => 'required|string',
            'permissions' => 'required|array',
            'permissions.*.name' => 'required|string|unique:permissions,name',
            'permissions.*.display_name' => 'required|string',
            'permissions.*.description' => 'nullable|string'
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

            $created = [];
            foreach ($request->permissions as $permData) {
                $permission = Permission::create([
                    'id' => Str::uuid(),
                    'name' => $permData['name'],
                    'display_name' => $permData['display_name'],
                    'module' => $request->module,
                    'description' => $permData['description'] ?? null,
                    'guard_name' => 'api'
                ]);
                $created[] = $permission;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($created) . ' permissions created successfully',
                'data' => $created
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update permission
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:permissions,name,' . $id,
            'display_name' => 'required|string',
            'module' => 'required|string',
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $permission = Permission::findOrFail($id);

            $permission->update([
                'name' => $request->name,
                'display_name' => $request->display_name,
                'module' => $request->module,
                'description' => $request->description
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Permission updated successfully',
                'data' => $permission
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete permission
     */
    public function destroy($id)
    {
        try {
            $permission = Permission::findOrFail($id);

            // Check if permission is assigned to any role
            $roleCount = DB::table('role_has_permissions')
                ->where('permission_id', $permission->id)
                ->count();

            if ($roleCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete permission. It is assigned to {$roleCount} role(s)"
                ], 409);
            }

            $permission->delete();

            return response()->json([
                'success' => true,
                'message' => 'Permission deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available modules
     */
    public function getModules()
    {
        try {
            $modules = Permission::distinct('module')
                ->pluck('module')
                ->map(function($module) {
                    return [
                        'value' => $module,
                        'display_name' => $this->formatModuleName($module),
                        'count' => Permission::where('module', $module)->count()
                    ];
                });

            // Add predefined modules that may not have permissions yet
            $predefinedModules = [
                'users' => 'User Management',
                'roles' => 'Role Management',
                'permissions' => 'Permission Management',
                'members' => 'Member Management',
                'organization' => 'Organization Management',
                'bookings' => 'Booking Management',
                'archanai' => 'Archanai Management',
                'services' => 'Service Management',
                'packages' => 'Package Management',
                'donations' => 'Donation Management',
                'payments' => 'Payment Management',
                'inventory' => 'Inventory Management',
                'purchase' => 'Purchase Management',
                'accounts' => 'Accounts Management',
                'reports' => 'Reports',
                'settings' => 'Settings',
                'dashboard' => 'Dashboard'
            ];

            foreach ($predefinedModules as $key => $name) {
                if (!$modules->contains('value', $key)) {
                    $modules->push([
                        'value' => $key,
                        'display_name' => $name,
                        'count' => 0
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'data' => $modules->sortBy('display_name')->values()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving modules',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate standard CRUD permissions for a module
     */
    public function generateCrudPermissions(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'module' => 'required|string',
            'module_display_name' => 'required|string'
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

            $module = $request->module;
            $displayName = $request->module_display_name;
            
            $crudOperations = [
                'view' => 'View',
                'create' => 'Create',
                'edit' => 'Edit',
                'delete' => 'Delete',
                'export' => 'Export'
            ];

            $created = [];
            foreach ($crudOperations as $operation => $operationName) {
                $permissionName = $module . '.' . $operation;
                
                // Check if permission already exists
                if (Permission::where('name', $permissionName)->exists()) {
                    continue;
                }

                $permission = Permission::create([
                    'id' => Str::uuid(),
                    'name' => $permissionName,
                    'display_name' => $operationName . ' ' . $displayName,
                    'module' => $module,
                    'description' => 'Permission to ' . strtolower($operationName) . ' ' . strtolower($displayName),
                    'guard_name' => 'api'
                ]);
                $created[] = $permission;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($created) . ' permissions generated successfully',
                'data' => $created
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error generating permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user has permission
     */
    public function checkPermission(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'permission' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = auth()->user();
            $hasPermission = $user->hasPermissionTo($request->permission);

            return response()->json([
                'success' => true,
                'has_permission' => $hasPermission
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error checking permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get permission statistics
     */
    public function statistics()
    {
        try {
            $stats = [
                'total_permissions' => Permission::count(),
                'total_modules' => Permission::distinct('module')->count('module'),
                'permissions_per_module' => Permission::select('module', DB::raw('count(*) as count'))
                    ->groupBy('module')
                    ->orderBy('count', 'desc')
                    ->get(),
                'most_assigned' => DB::table('role_has_permissions')
                    ->select('permissions.name', 'permissions.display_name', DB::raw('count(*) as assigned_count'))
                    ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
                    ->groupBy('permissions.id', 'permissions.name', 'permissions.display_name')
                    ->orderBy('assigned_count', 'desc')
                    ->limit(10)
                    ->get()
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Format module name for display
     */
    private function formatModuleName($module)
    {
        return ucwords(str_replace(['_', '.'], ' ', $module));
    }
}