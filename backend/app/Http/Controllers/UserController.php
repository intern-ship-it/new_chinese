<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class UserController extends Controller
{
/**
 * Assign roles to a user
 */
public function assignRoles(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'roles' => 'required|array',
        'roles.*' => 'exists:roles,id'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $user = User::findOrFail($id);
        
        // Prevent changing super admin roles
        if ($user->user_type === 'SUPER_ADMIN' && !auth()->user()->hasRole('super_admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify Super Admin roles'
            ], 403);
        }

        // Get role models
        $roles = Role::whereIn('id', $request->roles)->get();
        
        // Sync roles
        $user->syncRoles($roles);
        
        // Update user type based on highest role
        $this->updateUserTypeFromRoles($user, $roles);

        return response()->json([
            'success' => true,
            'message' => 'Roles assigned successfully',
            'data' => $user->load('roles:id,name,display_name')
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error assigning roles',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Sync permissions directly to user
 */
public function syncPermissions(Request $request, $id)
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
        $user = User::findOrFail($id);
        
        // Prevent changing super admin permissions
        if ($user->user_type === 'SUPER_ADMIN' && !auth()->user()->hasRole('super_admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify Super Admin permissions'
            ], 403);
        }

        $user->syncPermissions($request->permissions);

        return response()->json([
            'success' => true,
            'message' => 'Permissions synced successfully',
            'data' => $user->load('permissions:id,name,display_name')
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error syncing permissions',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get user permissions (from roles and direct)
 */
public function getUserPermissions($id)
{
    try {
        $user = User::with(['roles.permissions', 'permissions'])->findOrFail($id);
        
        // Get all permissions (from roles and direct)
        $allPermissions = $user->getAllPermissions();
        
        // Group by module
        $permissionsByModule = $allPermissions->groupBy('module');
        
        $modules = [];
        foreach ($permissionsByModule as $module => $permissions) {
            $modules[] = [
                'module' => $module,
                'display_name' => ucwords(str_replace('_', ' ', $module)),
                'permissions' => $permissions
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'user_type' => $user->user_type
                ],
                'roles' => $user->roles,
                'direct_permissions' => $user->permissions,
                'all_permissions' => $modules
            ]
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'User not found',
            'error' => $e->getMessage()
        ], 404);
    }
}

/**
 * Get users with specific role
 */
public function getUsersByRole($roleId)
{
    try {
        $role = Role::findOrFail($roleId);
        
        $users = User::role($role->name)
            ->select('id', 'name', 'email', 'user_type', 'is_active')
            ->paginate(request()->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $role,
                'users' => $users
            ]
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
 * Get users with specific permission
 */
public function getUsersByPermission(Request $request)
{
    $validator = Validator::make($request->all(), [
        'permission' => 'required|string|exists:permissions,name'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $users = User::permission($request->permission)
            ->select('id', 'name', 'email', 'user_type', 'is_active')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $users
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error retrieving users',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Check if user has role
 */
public function checkUserRole(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'role' => 'required|string'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $user = User::findOrFail($id);
        $hasRole = $user->hasRole($request->role);

        return response()->json([
            'success' => true,
            'has_role' => $hasRole
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'User not found',
            'error' => $e->getMessage()
        ], 404);
    }
}

/**
 * Check if user has permission
 */
public function checkUserPermission(Request $request, $id)
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
        $user = User::findOrFail($id);
        $hasPermission = $user->hasPermissionTo($request->permission);

        return response()->json([
            'success' => true,
            'has_permission' => $hasPermission
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'User not found',
            'error' => $e->getMessage()
        ], 404);
    }
}

/**
 * Update user type based on roles
 */
private function updateUserTypeFromRoles($user, $roles)
{
    $roleNames = $roles->pluck('name')->toArray();
    
    if (in_array('super_admin', $roleNames)) {
        $user->user_type = 'SUPER_ADMIN';
    } elseif (in_array('admin', $roleNames)) {
        $user->user_type = 'ADMIN';
    } elseif (in_array('manager', $roleNames)) {
        $user->user_type = 'MANAGER';
    } elseif (in_array('staff', $roleNames)) {
        $user->user_type = 'STAFF';
    } elseif (in_array('member', $roleNames)) {
        $user->user_type = 'MEMBER';
    } else {
        $user->user_type = 'DEVOTEE';
    }
    
    $user->save();
}
 public function index(Request $request)
    {
        try {
            // Get query parameters
            $userType = $request->get('user_type');
            $isActive = $request->get('is_active', true);
            $perPage = $request->get('per_page', 50);
            $search = $request->get('search');
            
            // Build query
            $query = User::select(['*']);
            
            // Apply filters
            if ($isActive !== 'all') {
                $query->where('is_active', $isActive == 'true' || $isActive == '1');
            }
            
            if ($userType) {
                $query->where('user_type', $userType);
            }
            
            // Apply search
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'ILIKE', '%' . $search . '%')
                      ->orWhere('email', 'ILIKE', '%' . $search . '%');
                });
            }
            
            // Order by name
            $query->orderBy('name');
            
            // Check if pagination is requested
            if ($request->has('paginate') && $request->get('paginate') == 'true') {
                $users = $query->paginate($perPage);
                
                return response()->json([
                    'success' => true,
                    'data' => $users->items(),
                    'pagination' => [
                        'current_page' => $users->currentPage(),
                        'last_page' => $users->lastPage(),
                        'per_page' => $users->perPage(),
                        'total' => $users->total()
                    ]
                ]);
            } else {
                // Return all users (for dropdowns)
                $users = $query->get();
                
                return response()->json([
                    'success' => true,
                    'data' => $users,
                    'total' => $users->count()
                ]);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get users by type (for specific dropdowns)
     */
    public function getUsersByType($userType)
    {
        try {
            $users = User::select(['id', 'name', 'email', 'full_name', 'user_type'])
                ->where('user_type', strtoupper($userType))
                ->where('is_active', true)
                ->orderBy('name')
                ->get();
                
            return response()->json([
                'success' => true,
                'data' => $users,
                'total' => $users->count()
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users by type',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get active staff users (for backward compatibility)
     */
    public function getActiveStaff()
    {
        try {
            $staff = User::select('*')
                ->where('is_active', true)
                ->orderBy('name')
                ->get();
                
            return response()->json([
                'success' => true,
                'data' => $staff,
                'total' => $staff->count()
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get user statistics
     */
    public function getUserStats()
    {
        try {
            $stats = [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'inactive_users' => User::where('is_active', false)->count(),
                'by_type' => User::select('user_type', DB::raw('count(*) as count'))
                    ->groupBy('user_type')
                    ->get()
                    ->pluck('count', 'user_type'),
                'recent_registrations' => User::where('created_at', '>=', now()->subDays(7))->count()
            ];
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}