<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    /**
     * Get all roles with permissions count
     */
    public function index(Request $request)
    {
        try {
            $query = Role::with('permissions:id,name,display_name,module')
                ->withCount('permissions')
                ->orderBy('created_at', 'desc');

            // Apply search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                      ->orWhere('display_name', 'like', '%' . $search . '%')
                      ->orWhere('description', 'like', '%' . $search . '%');
                });
            }

            // Apply filters
            if ($request->has('is_system')) {
                $query->where('is_system', $request->is_system);
            }

            $roles = $query->paginate($request->per_page ?? 20);

            return response()->json([
                'success' => true,
                'data' => $roles,
                'message' => 'Roles retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving roles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single role with permissions
     */
    public function show($id)
    {
        try {
            $role = Role::with('permissions:id,name,display_name,module,description')
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $role
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Role not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new role
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:roles,name',
            'display_name' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id'
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

            $role = Role::create([
                'id' => Str::uuid(),
                'name' => $request->name,
                'display_name' => $request->display_name,
                'description' => $request->description,
                'guard_name' => 'api',
                'is_system' => false
            ]);

            // Assign permissions if provided
            if ($request->has('permissions')) {
                $role->syncPermissions($request->permissions);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Role created successfully',
                'data' => $role->load('permissions')
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update role
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        // Prevent editing system roles
        if ($role->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'System roles cannot be modified'
            ], 403);
        }

        // Prevent editing super_admin role
        if ($role->name === 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Super Admin role cannot be modified'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:roles,name,' . $id,
            'display_name' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id'
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

            $role->update([
                'name' => $request->name,
                'display_name' => $request->display_name,
                'description' => $request->description
            ]);

            // Update permissions
            if ($request->has('permissions')) {
                $role->syncPermissions($request->permissions);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Role updated successfully',
                'data' => $role->load('permissions')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete role
     */
    public function destroy($id)
    {
        try {
            $role = Role::findOrFail($id);

            // Prevent deleting system roles
            if ($role->is_system) {
                return response()->json([
                    'success' => false,
                    'message' => 'System roles cannot be deleted'
                ], 403);
            }

            // Prevent deleting super_admin role
            if ($role->name === 'super_admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Super Admin role cannot be deleted'
                ], 403);
            }

            // Check if role is assigned to users
            $userCount = DB::table('model_has_roles')
                ->where('role_id', $role->id)
                ->count();

            if ($userCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete role. It is assigned to {$userCount} user(s)"
                ], 409);
            }

            $role->delete();

            return response()->json([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign permissions to role
     */
    public function assignPermissions(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $role = Role::findOrFail($id);

            // Prevent editing super_admin permissions
            if ($role->name === 'super_admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Super Admin permissions cannot be modified'
                ], 403);
            }

            $role->syncPermissions($request->permissions);

            return response()->json([
                'success' => true,
                'message' => 'Permissions assigned successfully',
                'data' => $role->load('permissions')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error assigning permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all permissions grouped by module for assignment
     */
    public function getPermissionsForAssignment()
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
                    'display_name' => ucwords(str_replace('_', ' ', $module)),
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
     * Duplicate a role
     */
    public function duplicate(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:roles,name',
            'display_name' => 'required|string'
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

            $originalRole = Role::with('permissions')->findOrFail($id);

            $newRole = Role::create([
                'id' => Str::uuid(),
                'name' => $request->name,
                'display_name' => $request->display_name,
                'description' => $request->description ?? $originalRole->description,
                'guard_name' => 'api',
                'is_system' => false
            ]);

            // Copy permissions from original role
            $newRole->syncPermissions($originalRole->permissions);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Role duplicated successfully',
                'data' => $newRole->load('permissions')
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error duplicating role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get role statistics
     */
    public function statistics()
    {
        try {
            $stats = [
                'total_roles' => Role::count(),
                'system_roles' => Role::where('is_system', true)->count(),
                'custom_roles' => Role::where('is_system', false)->count(),
                'roles_with_users' => DB::table('model_has_roles')
                    ->distinct('role_id')
                    ->count('role_id'),
                'recent_roles' => Role::with('permissions:id,name,display_name')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
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
}