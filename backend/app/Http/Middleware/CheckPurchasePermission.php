<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckPurchasePermission
{
    public function handle(Request $request, Closure $next, $permission)
    {
        $user = Auth::user();
        
        // Super Admin has all permissions
        if ($user->user_type === 'SUPER_ADMIN') {
            return $next($request);
        }
        
        // Check specific permissions
        $permissions = [
            'view_purchase' => ['STAFF', 'ADMIN'],
            'create_purchase' => ['ADMIN'],
            'approve_purchase' => ['SUPER_ADMIN'],
            'manage_suppliers' => ['ADMIN'],
            'process_payments' => ['ADMIN'],
            'create_grn' => ['STAFF', 'ADMIN']
        ];
        
        if (isset($permissions[$permission]) && 
            in_array($user->user_type, $permissions[$permission])) {
            return $next($request);
        }
        
        return response()->json([
            'success' => false,
            'message' => 'Insufficient permissions'
        ], 403);
    }
}