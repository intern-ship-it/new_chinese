<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckUserStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();

            // Check if user is active
            if (!$user->is_active) {
                Auth::logout();
                
                return redirect()->route('login')
                    ->withErrors(['username' => 'Your account has been deactivated.']);
            }

            // Check if user is locked
            if ($user->isLocked()) {
                Auth::logout();
                
                return redirect()->route('login')
                    ->withErrors(['username' => 'Your account is locked. Please try again later.']);
            }

            // Refresh user's last activity
            if ($user->last_activity_at < now()->subMinutes(5)) {
                $user->update(['last_activity_at' => now()]);
            }
        }

        return $next($request);
    }
}