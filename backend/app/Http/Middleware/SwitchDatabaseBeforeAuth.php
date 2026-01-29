<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * This middleware MUST run BEFORE authentication middleware
 * It extracts temple_id from the JWT token (without validating it)
 * and switches the database connection so that authentication can find the user
 */
class SwitchDatabaseBeforeAuth
{
    public function handle(Request $request, Closure $next)
    {
        try {
            // Get the Authorization header
            $authHeader = $request->header('Authorization');
            
            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                // No JWT token, continue normally
                return $next($request);
            }
            
            // Extract the token
            $token = substr($authHeader, 7);
            
            // Decode JWT payload without validation (we just need temple_id)
            $payload = $this->decodeJwtPayload($token);
            
            if (!$payload) {
                // Invalid token format, let the auth middleware handle it
                return $next($request);
            }
            
            // Get temple information from token
            $templeId = $payload['temple_id'] ?? null;
            $templeCode = $payload['temple_code'] ?? null;
            
            // Also check X-Temple-ID header as fallback
            if (!$templeId && !$templeCode) {
                $templeId = $request->header('X-Temple-ID');
            }
            
            // If we have temple info, switch the database
            if ($templeId || $templeCode) {
                $databaseConnection = $this->getTempleDatabase($templeId ?: $templeCode);
                
                if ($databaseConnection) {
                    // Switch the default database connection for this request
                    Config::set('database.default', $databaseConnection);
                    
                    // Reconnect to ensure we're using the new connection
                    DB::purge('default');
                    DB::reconnect('default');
                    
                    Log::info('Database switched before authentication', [
                        'temple_id' => $templeId,
                        'temple_code' => $templeCode,
                        'connection' => $databaseConnection
                    ]);
                    
                    // Store the temple info in request for later use
                    $request->merge([
                        '_temple_id' => $templeId ?: $templeCode,
                        '_temple_connection' => $databaseConnection
                    ]);
                }
            }
            
        } catch (\Exception $e) {
            Log::warning('Failed to switch database before auth', [
                'error' => $e->getMessage()
            ]);
            // Continue anyway, let auth middleware handle errors
        }
        
        return $next($request);
    }
    
    /**
     * Decode JWT payload without validation
     * We only need to read the temple_id, not validate the signature
     */
    private function decodeJwtPayload($token)
    {
        try {
            // JWT format: header.payload.signature
            $parts = explode('.', $token);
            
            if (count($parts) !== 3) {
                return null;
            }
            
            // Decode the payload (second part)
            $payload = $parts[1];
            
            // Add padding if needed
            $remainder = strlen($payload) % 4;
            if ($remainder) {
                $payload .= str_repeat('=', 4 - $remainder);
            }
            
            // Base64 decode
            $json = base64_decode(strtr($payload, '-_', '+/'));
            
            if (!$json) {
                return null;
            }
            
            // Parse JSON
            return json_decode($json, true);
            
        } catch (\Exception $e) {
            Log::warning('Failed to decode JWT payload', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Map temple identifier to database connection name
     */
    private function getTempleDatabase($templeIdentifier)
    {
        // Normalize the identifier
        $identifier = strtolower(trim($templeIdentifier));
        
        // Map to database connections defined in config/database.php
        $mapping = [
            'temple1' => 'temple1',
            'temple2' => 'temple2',
            'temple3' => 'temple3',
            'temple_dev' => 'temple_dev',
            'dev' => 'temple_dev',
        ];
        
        return $mapping[$identifier] ?? null;
    }
}