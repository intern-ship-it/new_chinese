<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureApiRequest
{
    public function handle(Request $request, Closure $next)
    {
        // Force JSON response for all API requests
        $request->headers->set('Accept', 'application/json');
        
        return $next($request);
    }
}