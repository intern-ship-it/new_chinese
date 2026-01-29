<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TempleService;
use Illuminate\Support\Facades\Log;

class TemplePublicMiddleware
{
    protected $templeService;
    
    public function __construct(TempleService $templeService)
    {
        $this->templeService = $templeService;
    }
    
    /**
     * Handle public requests that need temple context but no authentication
     * This middleware allows public access while maintaining temple database context
     */
    public function handle(Request $request, Closure $next)
    {
        // Get temple ID from URL parameter OR header (flexible)
        $templeId = $request->input('temple_id') ?? $request->header('X-Temple-ID');
        
        if (!$templeId) {
            return response()->json([
                'success' => false,
                'message' => 'Temple ID is required (pass as temple_id parameter or X-Temple-ID header)'
            ], 400);
        }
        
        try {
            // Set the current temple and switch database connection
            $temple = $this->templeService->setCurrentTemple($templeId);
            
            // Add temple info to request for use in controllers
            $request->merge(['current_temple' => $temple]);
            
            Log::info('Public temple context set successfully', [
                'temple_id' => $temple['id'],
                'temple_code' => $temple['code'],
                'endpoint' => $request->path(),
                'method' => $request->method()
            ]);
            
            return $next($request);
            
        } catch (\Exception $e) {
            Log::error('Failed to set public temple context', [
                'temple_id' => $templeId,
                'endpoint' => $request->path(),
                'error' => $e->getMessage()
            ]);
            
            if ($e->getMessage() === 'Temple database is not accessible') {
                return response()->json([
                    'success' => false,
                    'message' => 'Temple service is temporarily unavailable. Please try again later.',
                    'error' => 'SERVICE_UNAVAILABLE'
                ], 503);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Invalid temple ID or temple not accessible',
                'error' => 'TEMPLE_ERROR'
            ], 404);
        }
    }
}