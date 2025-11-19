<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Log only for authenticated users and specific methods
        if (Auth::check() && in_array($request->method(), ['POST', 'PUT', 'DELETE'])) {
            $this->logActivity($request, $response);
        }

        return $response;
    }

    /**
     * Log the user activity.
     */
    protected function logActivity(Request $request, Response $response)
    {
        try {
            $user = Auth::user();
            $action = $this->getActionFromRequest($request);
            
            if ($action) {
                DB::table('activity_logs')->insert([
                    'user_id' => $user->id,
                    'action' => $action,
                    'method' => $request->method(),
                    'url' => $request->fullUrl(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'status_code' => $response->getStatusCode(),
                    'created_at' => now(),
                ]);
            }
        } catch (\Exception $e) {
            // Silently fail to not break the application
            \Log::error('Failed to log activity: ' . $e->getMessage());
        }
    }

    /**
     * Get human-readable action from request.
     */
    protected function getActionFromRequest(Request $request): ?string
    {
        $route = $request->route();
        if (!$route) {
            return null;
        }

        $name = $route->getName();
        if (!$name) {
            return null;
        }

        // Map route names to human-readable actions
        $actionMap = [
            'admin.roles.store' => 'Created new role',
            'admin.roles.update' => 'Updated role',
            'admin.roles.destroy' => 'Deleted role',
            'admin.users.store' => 'Created new user',
            'admin.users.update' => 'Updated user',
            'admin.users.destroy' => 'Deleted user',
            'admin.temples.store' => 'Created new temple',
            'admin.temples.update' => 'Updated temple',
            'admin.temples.suspend' => 'Suspended temple',
            'admin.temples.activate' => 'Activated temple',
            'admin.billing.update' => 'Updated billing',
            'admin.billing.refund' => 'Processed refund',
            'admin.settings.update' => 'Updated settings',
        ];

        return $actionMap[$name] ?? null;
    }
}