<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TempleService;
use Illuminate\Support\Facades\Log;

class TempleMiddleware
{
    protected $templeService;
    
    public function __construct(TempleService $templeService)
    {
        $this->templeService = $templeService;
    }
    
    /**
     * Handle an incoming request.
     * This middleware assumes ValidateTempleAccess has already run and validated access
     */
    public function handle(Request $request, Closure $next)
    {
        // Get temple ID from request (already validated by ValidateTempleAccess)
        $templeId = $request->input('temple_id') ?? $request->header('X-Temple-ID');
        
        if (!$templeId) {
            return response()->json([
                'success' => false,
                'message' => 'Temple identifier is required'
            ], 400);
        }
        
        try {
            // Set the current temple and switch database connection
            $temple = $this->templeService->setCurrentTemple($templeId);
            
            // Add temple info to request for use in controllers
            $request->merge(['current_temple' => $temple]);
            
            Log::info('Temple context set successfully', [
                'temple_id' => $temple['id'],
                'temple_code' => $temple['code'],
                'temple_name' => $temple['name']
            ]);
            
            return $next($request);
            
        } catch (\Exception $e) {
            Log::error('Failed to set temple context', [
                'temple_id' => $templeId,
                'error' => $e->getMessage()
            ]);
            
            if ($e->getMessage() === 'Temple database is not accessible') {
                return response()->json([
                    'success' => false,
                    'message' => 'Server is busy. Please try again later.',
                    'error' => 'SERVICE_UNAVAILABLE'
                ], 503);
            }
            
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => 'TEMPLE_ERROR'
            ], 404);
        }
    }
}