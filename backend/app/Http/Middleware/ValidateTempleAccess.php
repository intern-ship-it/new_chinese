<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Log;

class ValidateTempleAccess
{
    /**
     * This middleware should run AFTER authentication middleware
     * It validates that the authenticated user has access to the requested temple
     */
    public function handle(Request $request, Closure $next)
    {
        try {
            // Get the JWT payload
            $token = JWTAuth::getToken();
            if (!$token) {
                // No token means auth middleware should have caught this
                return $next($request);
            }
            
            $payload = JWTAuth::getPayload($token);
            
            // Get temple from token
            $tokenTempleId = $payload->get('temple_id');
            $tokenTempleCode = $payload->get('temple_code');
            
            // Get requested temple from various sources
            $requestedTemple = $this->getRequestedTemple($request);
            
            // Log for debugging
            Log::info('Temple Access Validation', [
                'token_temple_id' => $tokenTempleId,
                'token_temple_code' => $tokenTempleCode,
                'requested_temple' => $requestedTemple,
                'request_header' => $request->header('X-Temple-ID'),
                'request_input' => $request->input('temple_id')
            ]);
            
            if (!$requestedTemple) {
                // If no temple is specified in request, that's an error for temple-specific endpoints
                return response()->json([
                    'success' => false,
                    'message' => 'Temple identifier is required',
                    'error' => 'TEMPLE_NOT_SPECIFIED'
                ], 400);
            }
            
            // Validate access - fixed comparison logic
            if (!$this->hasTempleAccess($tokenTempleId, $tokenTempleCode, $requestedTemple)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied: Your token is not authorized for this temple',
                    'error' => 'TEMPLE_ACCESS_FORBIDDEN',
                    'details' => [
                        'token_temple_id' => $tokenTempleId,
                        'token_temple_code' => $tokenTempleCode,
                        'requested_temple' => $requestedTemple
                    ]
                ], 403);
            }
            
            // Access granted - continue
            return $next($request);
            
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token has expired',
                'error' => 'TOKEN_EXPIRED'
            ], 401);
        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token is invalid',
                'error' => 'TOKEN_INVALID'
            ], 401);
        } catch (\Exception $e) {
            Log::error('Temple Access Validation Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to validate temple access',
                'error' => 'VALIDATION_ERROR'
            ], 500);
        }
    }
    
    /**
     * Get requested temple from various sources
     */
    private function getRequestedTemple(Request $request)
    {
        // Check header first (X-Temple-ID)
        if ($request->hasHeader('X-Temple-ID')) {
            return $request->header('X-Temple-ID');
        }
        
        // Check request body
        if ($request->has('temple_id')) {
            return $request->input('temple_id');
        }
        
        // Check route parameter
        if ($request->route('temple_id')) {
            return $request->route('temple_id');
        }
        
        // Check query parameter
        if ($request->query('temple_id')) {
            return $request->query('temple_id');
        }
        
        return null;
    }
    
    /**
     * Check if user has access to the requested temple
     * Fixed comparison logic to handle all cases properly
     */
    private function hasTempleAccess($tokenTempleId, $tokenTempleCode, $requestedTemple)
    {
        // Direct string comparison (case-insensitive for safety)
        $tokenTempleId = strtolower(trim((string)$tokenTempleId));
        $tokenTempleCode = strtolower(trim((string)$tokenTempleCode));
        $requestedTempleLower = strtolower(trim((string)$requestedTemple));
        
        Log::info('Temple Access Comparison', [
            'token_temple_id_lower' => $tokenTempleId,
            'token_temple_code_lower' => $tokenTempleCode,
            'requested_temple_lower' => $requestedTempleLower
        ]);
        
        // Check if token temple matches requested temple
        if ($tokenTempleId === $requestedTempleLower) {
            Log::info('Access granted: Temple ID match');
            return true;
        }
        
        if ($tokenTempleCode === $requestedTempleLower) {
            Log::info('Access granted: Temple code match');
            return true;
        }
        
        // Handle encrypted temple IDs
        if (strlen($requestedTemple) > 20) {
            try {
                $templeService = app(\App\Services\TempleService::class);
                $decryptedRequested = $templeService->decryptIdentifier($requestedTemple);
                $decryptedRequestedLower = strtolower(trim($decryptedRequested));
                
                Log::info('Checking decrypted temple ID', [
                    'decrypted' => $decryptedRequestedLower
                ]);
                
                if ($tokenTempleId === $decryptedRequestedLower || 
                    $tokenTempleCode === $decryptedRequestedLower) {
                    Log::info('Access granted: Decrypted temple match');
                    return true;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to decrypt temple ID', [
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        // For super admins, allow cross-temple access
        $user = auth()->user();
        if ($user && $user->hasRole('Super Admin')) {
            Log::warning('Super Admin cross-temple access granted', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'token_temple' => $tokenTempleCode,
                'requested_temple' => $requestedTemple
            ]);
            return true;
        }
        
        Log::warning('Access denied: No matching temple found', [
            'token_temple_id' => $tokenTempleId,
            'token_temple_code' => $tokenTempleCode,
            'requested_temple' => $requestedTempleLower
        ]);
        
        return false;
    }
}