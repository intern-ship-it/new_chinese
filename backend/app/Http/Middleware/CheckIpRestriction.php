<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckIpRestriction
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if ($user && !$user->hasIpAccess($request->ip())) {
            auth()->logout();
            
            return redirect()->route('login')
                ->withErrors(['username' => 'Access denied from this IP address.']);
        }

        return $next($request);
    }
}