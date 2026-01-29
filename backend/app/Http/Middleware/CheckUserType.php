<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckUserType
{
    public function handle(Request $request, Closure $next, ...$types)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
                'error' => 'UNAUTHENTICATED'
            ], 401);
        }

        // Convert types to uppercase for comparison
        $allowedTypes = array_map('strtoupper', $types);
        
        if (!in_array($user->user_type, $allowedTypes)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action',
                'error' => 'FORBIDDEN'
            ], 403);
        }

        return $next($request);
    }
}