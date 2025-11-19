<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckOrganizationPermission
{
    public function handle(Request $request, Closure $next, $permission = null)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // Super Admin has all permissions
        if ($user->user_type === 'SUPER_ADMIN') {
            return $next($request);
        }

        // Check specific permission if provided
        if ($permission) {
            if ($user->user_type === 'ADMIN' && in_array($permission, ['manage_positions', 'manage_member_types'])) {
                return $next($request);
            }

            // Check if user has organization position with required permission
            $position = $user->getOrganizationPosition();
            if ($position && $position->permissions) {
                $permissions = is_string($position->permissions) ? json_decode($position->permissions, true) : $position->permissions;
                if (in_array($permission, $permissions)) {
                    return $next($request);
                }
            }

            // Check role-based permissions
            if ($user->hasPermissionTo($permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'You do not have permission to perform this action'
        ], 403);
    }
}