<?php
// app/Http/Controllers/TempleController.php

namespace App\Http\Controllers;

use App\Services\TempleService;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class TempleController extends Controller
{
    use ApiResponse;
    
    protected $templeService;
    
    public function __construct(TempleService $templeService)
    {
        $this->templeService = $templeService;
    }
    
    /**
     * Validate temple and get configuration
     * This is called before login to set temple context
     */
    public function validateTemple(Request $request)
    {
        $templeId = $request->input('temple_id');
        
        if (!$templeId) {
            return $this->errorResponse('Temple identifier is required', 400);
        }
        
        try {
            // Validate temple
            $validation = $this->templeService->validateTemple($templeId);
            
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message'], 404);
            }
            
            // Set current temple - this switches the database
            $temple = $this->templeService->setCurrentTemple($templeId);
            
            // Clear any cached theme settings for this temple
            Cache::forget("theme_settings_{$temple['id']}");
            
            // Get theme settings directly from database
            // First try with type = 'SYSTEM', then without type filter if not found
            $themeSettings = SystemSetting::whereIn('key', [
                'primary_color',
                'secondary_color', 
                'background_color',
                'text_color'
            ])
            ->where('type', 'SYSTEM')
            ->pluck('value', 'key')
            ->toArray();
            
            // If no theme settings found with SYSTEM type, try without type filter
            if (empty($themeSettings)) {
                $themeSettings = SystemSetting::whereIn('key', [
                    'primary_color',
                    'secondary_color', 
                    'background_color',
                    'text_color'
                ])
                ->pluck('value', 'key')
                ->toArray();
            }
            
            // Log for debugging
            Log::info('Theme settings fetched', [
                'temple_id' => $temple['id'],
                'temple_code' => $temple['code'],
                'theme_settings' => $themeSettings,
                'database' => $temple['database']
            ]);
            
            // Build theme with database values or defaults
            $theme = [
                'primary_color' => $themeSettings['primary_color'] ?? '#ff00ff',
                'secondary_color' => $themeSettings['secondary_color'] ?? '#808000',
                'background_color' => $themeSettings['background_color'] ?? '#ffffff',
                'text_color' => $themeSettings['text_color'] ?? '#000000'
            ];
            
            return $this->successResponse([
                'temple_id' => $validation['temple']['id'], // Encrypted ID
                'temple_name' => $temple['name'],
                'temple_code' => $temple['code'],
                'temple_logo' => $temple['media']['logo_url'] ?? '',
                'theme' => $theme
            ], 'Temple validated successfully');
            
        } catch (\Exception $e) {
            Log::error('Temple validation failed', [
                'temple_id' => $templeId,
                'error' => $e->getMessage()
            ]);
            
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
    
    /**
     * Get all SYSTEM type settings - SINGLE ENDPOINT
     */
    public function getSystemSettings(Request $request)
    {
        try {
            $temple = $this->templeService->getCurrentTemple();
            if (!$temple) {
                return $this->errorResponse('No temple context set', 400);
            }
            
            // Cache key for this temple's system settings
            $cacheKey = "system_settings_{$temple['id']}";
            
            // Get from cache or database
            $settings = Cache::remember($cacheKey, 3600, function () {
                return SystemSetting::where('type', 'SYSTEM')
                    ->pluck('value', 'key')
                    ->toArray();
            });
            
            // Add temple ID and database name (not stored in settings)
            $settings['temple_id'] = $temple['id'];
            $settings['database_name'] = $temple['database'];
            
            return $this->successResponse($settings, 'System settings retrieved');
            
        } catch (\Exception $e) {
            Log::error('Failed to get system settings', [
                'error' => $e->getMessage(),
                'temple' => $temple['id'] ?? 'unknown'
            ]);
            
            return $this->errorResponse('Failed to retrieve system settings: ' . $e->getMessage(), 500);
        }
    }
}