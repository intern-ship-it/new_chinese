<?php

// app/Http/Middleware/CheckMemberAccess.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;

class CheckMemberAccess
{
    /**
     * Handle an incoming request.
     * Check if user can access member data
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|null  $accessType
     * @return mixed
     */
    public function handle(Request $request, Closure $next, $accessType = 'view')
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false, 
                'message' => 'Unauthorized'
            ], 401);
        }

        // Super Admin and Admin have full access
        if (in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return $next($request);
        }

        // Staff with appropriate permissions
        if ($user->user_type === 'STAFF') {
            $requiredPermissions = $this->getRequiredPermissions($accessType);
            
            foreach ($requiredPermissions as $permission) {
                if ($user->hasPermissionTo($permission)) {
                    return $next($request);
                }
            }
        }

        // Members can only view their own data and family members
        if ($user->user_type === 'MEMBER' && $accessType === 'view') {
            if ($this->canMemberAccessData($user, $request)) {
                return $next($request);
            }
        }

        // Organization position holders may have special access
        if ($user->user_type === 'MEMBER' && $user->hasOrganizationPosition()) {
            if ($this->hasOrganizationAccess($user, $accessType)) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'You do not have permission to access this member data'
        ], 403);
    }

    /**
     * Get required permissions for access type
     *
     * @param string $accessType
     * @return array
     */
    private function getRequiredPermissions($accessType)
    {
        $permissions = [
            'view' => ['view_users', 'view_members'],
            'create' => ['create_users', 'manage_members', 'manage_users'],
            'update' => ['edit_users', 'manage_members', 'manage_users'],
            'delete' => ['delete_users', 'manage_members', 'manage_users'],
            'export' => ['export_reports', 'manage_members'],
            'bulk' => ['manage_members', 'manage_users']
        ];

        return $permissions[$accessType] ?? [];
    }

    /**
     * Check if member can access the requested data
     *
     * @param User $user
     * @param Request $request
     * @return bool
     */
    private function canMemberAccessData($user, $request)
    {
        // Get member ID from route parameters
        $memberId = $request->route('id') 
            ?? $request->route('memberId') 
            ?? $request->route('familyHeadId');
        
        // Check if viewing own data
        if ($memberId === $user->id) {
            return true;
        }
        
        // Check if user has member details
        if (!$user->memberDetail) {
            return false;
        }
        
        // Check if viewing family member's data (user is family head)
        if ($this->isFamilyHead($user, $memberId)) {
            return true;
        }
        
        // Check if viewing data of same family
        if ($this->isSameFamily($user, $memberId)) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if user is family head of the target member
     *
     * @param User $user
     * @param string $memberId
     * @return bool
     */
    private function isFamilyHead($user, $memberId)
    {
        if (!$memberId) {
            return false;
        }

        return User::whereHas('memberDetail', function($query) use ($user) {
            $query->where('family_head_id', $user->id);
        })->where('id', $memberId)->exists();
    }

    /**
     * Check if user belongs to same family as target member
     *
     * @param User $user
     * @param string $memberId
     * @return bool
     */
    private function isSameFamily($user, $memberId)
    {
        if (!$memberId || !$user->memberDetail) {
            return false;
        }

        $familyHeadId = $user->memberDetail->family_head_id;
        
        if (!$familyHeadId) {
            return false;
        }

        return User::whereHas('memberDetail', function($query) use ($familyHeadId) {
            $query->where('family_head_id', $familyHeadId)
                  ->orWhere('user_id', $familyHeadId);
        })->where('id', $memberId)->exists();
    }

    /**
     * Check if organization position holder has access
     *
     * @param User $user
     * @param string $accessType
     * @return bool
     */
    private function hasOrganizationAccess($user, $accessType)
    {
        $position = $user->getOrganizationPosition();
        
        if (!$position) {
            return false;
        }

        // President and Secretary typically have view access to all members
        if (in_array($position->name, ['president', 'secretary']) && $accessType === 'view') {
            return true;
        }

        // President may have additional permissions
        if ($position->name === 'president' && in_array($accessType, ['view', 'export'])) {
            return true;
        }

        // Check custom permissions in position
        if ($position->permissions) {
            $permissions = is_string($position->permissions) 
                ? json_decode($position->permissions, true) 
                : $position->permissions;
            
            $requiredPermissions = $this->getRequiredPermissions($accessType);
            
            foreach ($requiredPermissions as $permission) {
                if (in_array($permission, $permissions)) {
                    return true;
                }
            }
        }

        return false;
    }
}