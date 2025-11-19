<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API requests, never redirect - just return null to trigger 401 response
        return null;
    }

    /**
     * Handle unauthenticated requests
     */
    protected function unauthenticated($request, array $guards)
    {
        abort(response()->json([
            'success' => false,
            'message' => 'Unauthenticated. Please login to continue.',
            'error' => 'UNAUTHENTICATED'
        ], 401));
    }
}