<?php
// app/Services/TempleService.php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use App\Models\SystemSetting;
use Exception;

class TempleService
{
    protected $currentTemple = null;
    
    /**
     * Get all configured temples from config (for initial connection only)
     */
    public function getTempleConnections()
    {
        // This returns minimal config just for database connections
        return config('temples.temples', []);
    }
    
    /**
     * Get temple by identifier (can be encrypted or plain)
     */
    public function getTemple($identifier)
    {
        // Try to decrypt if it looks encrypted
        try {
            if (strlen($identifier) > 20) {
                $identifier = $this->decryptIdentifier($identifier);
            }
        } catch (Exception $e) {
            // If decryption fails, use as is
        }
        
        // First, get the database connection from config
        $connections = $this->getTempleConnections();
        
        if (!isset($connections[$identifier])) {
            return null;
        }
        
        $connectionInfo = $connections[$identifier];
        
        // Try to get temple details from cache first
        $cacheKey = "temple_details_{$identifier}";
        $templeDetails = Cache::get($cacheKey);
        
        if (!$templeDetails) {
            try {
                // Switch to temple's database temporarily to get its settings
                $originalConnection = Config::get('database.default');
                
                // Set the temple's database connection
                Config::set('database.default', $connectionInfo['database']);
                DB::purge($connectionInfo['database']);
                DB::reconnect($connectionInfo['database']);
                
                // Fetch temple details from system_settings
                $settings = SystemSetting::whereIn('key', [
                    'temple_name',
                    'temple_code', 
                    'temple_status',
                    'temple_domain',
                    'temple_description',
                    'temple_email',
                    'temple_phone',
                    'temple_address',
                    'temple_city',
                    'temple_state',
                    'temple_country',
                    'temple_pincode',
                    'temple_logo_url',
                    'temple_banner_url',
                    'temple_timezone',
                    'temple_currency',
                    'temple_date_format',
                    'temple_time_format'
                ])
                ->where('type', 'SYSTEM')
                ->pluck('value', 'key')
                ->toArray();
                
                // Build temple details array
                $templeDetails = [
                    'id' => $connectionInfo['id'],
                    'name' => $settings['temple_name'] ?? 'Temple',
                    'code' => $settings['temple_code'] ?? strtoupper($identifier),
                    'status' => $settings['temple_status'] ?? 'active',
                    'domain' => $settings['temple_domain'] ?? '',
                    'database' => $connectionInfo['database'],
                    'description' => $settings['temple_description'] ?? '',
                    'contact' => [
                        'email' => $settings['temple_email'] ?? '',
                        'phone' => $settings['temple_phone'] ?? '',
                        'address' => $settings['temple_address'] ?? '',
                        'city' => $settings['temple_city'] ?? '',
                        'state' => $settings['temple_state'] ?? '',
                        'country' => $settings['temple_country'] ?? '',
                        'pincode' => $settings['temple_pincode'] ?? ''
                    ],
                    'media' => [
                        'logo_url' => $settings['temple_logo_url'] ?? '',
                        'banner_url' => $settings['temple_banner_url'] ?? ''
                    ],
                    'locale' => [
                        'timezone' => $settings['temple_timezone'] ?? 'Asia/Kolkata',
                        'currency' => $settings['temple_currency'] ?? 'INR',
                        'date_format' => $settings['temple_date_format'] ?? 'Y-m-d',
                        'time_format' => $settings['temple_time_format'] ?? 'H:i:s'
                    ]
                ];
                
                // Restore original connection
                Config::set('database.default', $originalConnection);
                DB::purge($originalConnection);
                DB::reconnect($originalConnection);
                
                // Cache the temple details for 1 hour
                Cache::put($cacheKey, $templeDetails, now()->addHours(1));
                
            } catch (Exception $e) {
                Log::error('Failed to fetch temple details from database', [
                    'temple' => $identifier,
                    'error' => $e->getMessage()
                ]);
                
                // Fallback to basic info from config
                $templeDetails = [
                    'id' => $connectionInfo['id'],
                    'name' => 'Temple',
                    'code' => strtoupper($identifier),
                    'status' => $connectionInfo['status'] ?? 'active',
                    'database' => $connectionInfo['database'],
                    'domain' => ''
                ];
            }
        }
        
        return $templeDetails;
    }
    
    /**
     * Set current temple and switch database connection
     */
    public function setCurrentTemple($identifier)
    {
        $temple = $this->getTemple($identifier);
        
        if (!$temple) {
            throw new Exception('Temple not found');
        }
        
        if ($temple['status'] !== 'active') {
            throw new Exception('Temple is not active');
        }
        
        // Test database connection
        if (!$this->testDatabaseConnection($temple['database'])) {
            throw new Exception('Temple database is not accessible');
        }
        
        // Set the current temple
        $this->currentTemple = $temple;
        
        // Switch database connection
        Config::set('database.default', $temple['database']);
        DB::purge($temple['database']);
        DB::reconnect($temple['database']);
        
        // Store in cache for quick access
        Cache::put('current_temple', $temple, now()->addHours(24));
        
        // Set timezone for this temple
        if (!empty($temple['locale']['timezone'])) {
            date_default_timezone_set($temple['locale']['timezone']);
            Config::set('app.timezone', $temple['locale']['timezone']);
        }
        
        Log::info('Temple context set', [
            'temple_id' => $temple['id'],
            'temple_name' => $temple['name'],
            'temple_code' => $temple['code'],
            'database' => $temple['database']
        ]);
        
        return $temple;
    }
    
    /**
     * Get current temple
     */
    public function getCurrentTemple()
    {
        if (!$this->currentTemple) {
            $this->currentTemple = Cache::get('current_temple');
        }
        return $this->currentTemple;
    }
    
    /**
     * Clear temple cache
     */
    public function clearTempleCache($identifier = null)
    {
        if ($identifier) {
            Cache::forget("temple_details_{$identifier}");
        } else {
            // Clear current temple cache
            $current = $this->getCurrentTemple();
            if ($current) {
                Cache::forget("temple_details_{$current['id']}");
                Cache::forget('current_temple');
            }
        }
        
        // Clear settings cache
        Cache::forget('temple_settings_all');
        Cache::forget('system_settings_all');
    }
    
    /**
     * Test database connection
     */
    public function testDatabaseConnection($connection)
    {
        try {
            DB::connection($connection)->getPdo();
            
            // Also check if system_settings table exists
            $tableExists = DB::connection($connection)
                ->select("SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'system_settings'
                )");
            
            return $tableExists[0]->exists ?? false;
            
        } catch (Exception $e) {
            Log::error('Database connection test failed', [
                'connection' => $connection,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Encrypt temple identifier
     */
    public function encryptIdentifier($identifier)
    {
        return base64_encode(Crypt::encryptString($identifier));
    }
    
    /**
     * Decrypt temple identifier
     */
    public function decryptIdentifier($encrypted)
    {
        return Crypt::decryptString(base64_decode($encrypted));
    }
    
    /**
     * Get temple specific S3 path
     */
    public function getS3Path($path = '')
    {
        $temple = $this->getCurrentTemple();
        if (!$temple) {
            throw new Exception('No temple selected');
        }
        
        // Use temple code as S3 folder prefix
        $s3Folder = strtolower($temple['code']);
        return $s3Folder . '/' . ltrim($path, '/');
    }
    
    /**
     * Get temple settings from database
     */
    public function getTempleSettings()
    {
        $temple = $this->getCurrentTemple();
        if (!$temple) {
            return null;
        }
        
        return Cache::remember("temple_settings_{$temple['id']}", 3600, function () use ($temple) {
            // Get all settings from system_settings
            $settings = SystemSetting::pluck('value', 'key')->toArray();
            
            // Add current temple info
            $settings['temple_name'] = $temple['name'];
            $settings['temple_code'] = $temple['code'];
            $settings['temple_id'] = $temple['id'];
            $settings['temple_status'] = $temple['status'];
            $settings['temple_domain'] = $temple['domain'];
            
            // Add contact info
            foreach ($temple['contact'] as $key => $value) {
                $settings["temple_{$key}"] = $value;
            }
            
            // Add media URLs
            $settings['temple_logo'] = $temple['media']['logo_url'] ?? $this->getS3Url('logo.png');
            $settings['temple_banner'] = $temple['media']['banner_url'] ?? $this->getS3Url('banner.jpg');
            
            // Add locale settings
            foreach ($temple['locale'] as $key => $value) {
                $settings["temple_{$key}"] = $value;
            }
            
            return $settings;
        });
    }
    
    /**
     * Update temple settings in database
     */
    public function updateTempleSetting($key, $value)
    {
        $temple = $this->getCurrentTemple();
        if (!$temple) {
            throw new Exception('No temple context set');
        }
        
        // Update in database
        SystemSetting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'type' => 'SYSTEM',
                'description' => "Temple setting: {$key}"
            ]
        );
        
        // Clear cache
        $this->clearTempleCache();
        
        Log::info('Temple setting updated', [
            'temple' => $temple['code'],
            'key' => $key,
            'value' => $key === 'temple_status' ? $value : '***' // Don't log sensitive data
        ]);
        
        return true;
    }
    
    /**
     * Get S3 URL for a file
     */
    public function getS3Url($path)
    {
        $temple = $this->getCurrentTemple();
        if (!$temple) {
            return '';
        }
        
        // Get S3 config from S3ConfigManager if available
        try {
            $s3ConfigManager = app(\App\Services\S3ConfigManager::class);
            $s3Path = $this->getS3Path($path);
            return $s3ConfigManager->getPublicUrl($s3Path);
        } catch (Exception $e) {
            // Fallback to basic URL construction
            $s3Path = $this->getS3Path($path);
            $bucket = SystemSetting::where('key', 'aws_bucket_name')->where('type', 'AWS')->value('value');
            $region = SystemSetting::where('key', 'aws_region')->where('type', 'AWS')->value('value');
            
            if ($bucket && $region) {
                return "https://{$bucket}.s3.{$region}.amazonaws.com/{$s3Path}";
            }
            
            return '';
        }
    }
    
    /**
     * Validate temple exists and is active
     */
    public function validateTemple($identifier)
    {
        try {
            $temple = $this->getTemple($identifier);
            
            if (!$temple) {
                return [
                    'valid' => false,
                    'message' => 'Temple not found'
                ];
            }
            
            if ($temple['status'] !== 'active') {
                return [
                    'valid' => false,
                    'message' => 'Temple is not active',
                    'status' => $temple['status']
                ];
            }
            
            if (!$this->testDatabaseConnection($temple['database'])) {
                return [
                    'valid' => false,
                    'message' => 'Temple database is not accessible'
                ];
            }
            
            return [
                'valid' => true,
                'temple' => [
                    'id' => $this->encryptIdentifier($identifier),
                    'name' => $temple['name'],
                    'code' => $temple['code'],
                    'logo' => $temple['media']['logo_url'] ?? '',
                    'status' => $temple['status']
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'valid' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get temple theme settings
     */
    public function getTempleTheme()
    {
        $settings = $this->getTempleSettings();
        
        return [
            'primary_color' => $settings['primary_color'] ?? '#ff00ff',
            'secondary_color' => $settings['secondary_color'] ?? '#808000',
            'background_color' => $settings['background_color'] ?? '#ffffff',
            'text_color' => $settings['text_color'] ?? '#000000',
            'font_family' => $settings['font_family'] ?? 'system-ui',
            'border_radius' => $settings['border_radius'] ?? '4px',
            'logo_url' => $settings['temple_logo'] ?? '',
            'banner_url' => $settings['temple_banner'] ?? '',
            'favicon_url' => $settings['temple_favicon'] ?? ''
        ];
    }
}