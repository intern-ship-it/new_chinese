<?php
// app/Services/S3ConfigManager.php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use App\Models\SystemSetting;
use App\Services\TempleService;
use Aws\S3\S3Client;
use Exception;

class S3ConfigManager
{
    protected $templeService;
    protected $s3Clients = [];
    protected $currentConfig = null;
    
    public function __construct(TempleService $templeService)
    {
        $this->templeService = $templeService;
    }
    
    /**
     * Get S3 configuration for current temple
     */
    public function getConfig($forceRefresh = false)
    {
        $temple = $this->templeService->getCurrentTemple();
        
        if (!$temple) {
            throw new Exception('No temple context set');
        }
        
        $cacheKey = "s3_config_{$temple['id']}";
        
        // Force refresh or get from cache
        if ($forceRefresh) {
            Cache::forget($cacheKey);
        }
        
        return Cache::remember($cacheKey, 3600, function () use ($temple) {
            return $this->loadConfigFromDatabase();
        });
    }
    
    /**
     * Load S3 configuration from database
     */
    protected function loadConfigFromDatabase()
    {
        try {
            // Get all AWS settings from system_settings table
            $settings = SystemSetting::where('type', 'AWS')
                ->pluck('value', 'key')
                ->toArray();
            
            if (empty($settings)) {
                Log::warning('No AWS settings found in database for temple', [
                    'temple' => $this->templeService->getCurrentTemple()
                ]);
                return $this->getDefaultConfig();
            }
            
            // Build configuration array
            $config = [
                'credentials' => [
                    'key' => $this->decryptValue($settings['aws_access_key_id'] ?? ''),
                    'secret' => $this->decryptValue($settings['aws_secret_access_key'] ?? ''),
                ],
                'region' => $settings['aws_region'] ?? 'ap-southeast-1',
                'version' => 'latest',
                'bucket' => $settings['aws_bucket_name'] ?? '',
                'url' => $settings['aws_bucket_url'] ?? '',
                'endpoint' => $settings['aws_endpoint'] ?? null,
                'use_path_style_endpoint' => filter_var(
                    $settings['aws_use_path_style_endpoint'] ?? false, 
                    FILTER_VALIDATE_BOOLEAN
                ),
                'use_cdn' => filter_var(
                    $settings['aws_use_cdn'] ?? false,
                    FILTER_VALIDATE_BOOLEAN
                ),
                'cdn_url' => $settings['aws_cdn_url'] ?? '',
                
                // Storage paths
                'paths' => [
                    'signatures' => $settings['aws_signature_path'] ?? 'signatures/',
                    'documents' => $settings['aws_document_path'] ?? 'documents/',
                    'images' => $settings['aws_image_path'] ?? 'images/',
                    'reports' => $settings['aws_report_path'] ?? 'reports/',
                    'temp' => $settings['aws_temp_path'] ?? 'temp/',
                ],
                
                // File settings
                'signatures' => [
                    'max_size' => intval($settings['aws_signature_max_size'] ?? 2048),
                    'allowed_types' => $this->parseArray($settings['aws_signature_allowed_types'] ?? 'image/jpeg,image/png'),
                    'allowed_extensions' => $this->parseArray($settings['aws_signature_allowed_extensions'] ?? 'jpg,jpeg,png'),
                    'quality' => intval($settings['aws_signature_quality'] ?? 90),
                    'max_width' => intval($settings['aws_signature_max_width'] ?? 800),
                    'max_height' => intval($settings['aws_signature_max_height'] ?? 400),
                ],
                
                // S3 options
                'options' => [
                    'visibility' => $settings['aws_default_visibility'] ?? 'private',
                    'CacheControl' => $settings['aws_cache_control'] ?? 'max-age=31536000',
                    'ACL' => $settings['aws_default_acl'] ?? 'private',
                ],
                
                // URL settings
                'temp_url_expiration' => intval($settings['aws_temp_url_expiration'] ?? 60),
            ];
            
            $this->currentConfig = $config;
            return $config;
            
        } catch (Exception $e) {
            Log::error('Failed to load S3 configuration from database', [
                'error' => $e->getMessage(),
                'temple' => $this->templeService->getCurrentTemple()
            ]);
            
            return $this->getDefaultConfig();
        }
    }
    
    /**
     * Get S3 client for current temple
     */
    public function getS3Client($forceNew = false)
    {
        $temple = $this->templeService->getCurrentTemple();
        
        if (!$temple) {
            throw new Exception('No temple context set');
        }
        
        $templeId = $temple['id'];
        
        // Return cached client if exists and not forcing new
        if (!$forceNew && isset($this->s3Clients[$templeId])) {
            return $this->s3Clients[$templeId];
        }
        
        // Get configuration
        $config = $this->getConfig($forceNew);
        
        // Validate configuration
        $this->validateConfig($config);
        
        // Create S3 client
        $clientConfig = [
            'version' => $config['version'],
            'region' => $config['region'],
            'credentials' => $config['credentials'],
        ];
        
        // Add endpoint if specified (for S3-compatible services)
        if (!empty($config['endpoint'])) {
            $clientConfig['endpoint'] = $config['endpoint'];
            $clientConfig['use_path_style_endpoint'] = $config['use_path_style_endpoint'];
        }
        
        try {
            $client = new S3Client($clientConfig);
            
            // Cache the client
            $this->s3Clients[$templeId] = $client;
            
            Log::info('S3 client created successfully', [
                'temple' => $templeId,
                'bucket' => $config['bucket'],
                'region' => $config['region']
            ]);
            
            return $client;
            
        } catch (Exception $e) {
            Log::error('Failed to create S3 client', [
                'error' => $e->getMessage(),
                'temple' => $templeId,
                'config' => [
                    'region' => $config['region'],
                    'bucket' => $config['bucket'],
                    'has_credentials' => !empty($config['credentials']['key'])
                ]
            ]);
            
            throw new Exception('Failed to initialize S3 client: ' . $e->getMessage());
        }
    }
    
    /**
     * Get bucket name for current temple
     */
    public function getBucket()
    {
        $config = $this->getConfig();
        return $config['bucket'] ?? '';
    }
    
    /**
     * Get specific path from configuration
     */
    public function getPath($type = 'documents')
    {
        $config = $this->getConfig();
        return $config['paths'][$type] ?? '';
    }
    
    /**
     * Get full S3 path with temple context
     */
    public function getFullPath($path, $type = 'documents')
    {
        $basePath = $this->getPath($type);
        return rtrim($basePath, '/') . '/' . ltrim($path, '/');
    }
    
    /**
     * Get public URL for a file
     */
    public function getPublicUrl($path)
    {
        $config = $this->getConfig();
        
        // Use CDN if enabled
        if ($config['use_cdn'] && !empty($config['cdn_url'])) {
            return rtrim($config['cdn_url'], '/') . '/' . ltrim($path, '/');
        }
        
        // Use bucket URL
        if (!empty($config['url'])) {
            return rtrim($config['url'], '/') . '/' . ltrim($path, '/');
        }
        
        // Generate standard S3 URL
        $bucket = $config['bucket'];
        $region = $config['region'];
        return "https://{$bucket}.s3.{$region}.amazonaws.com/" . ltrim($path, '/');
    }
    
    /**
     * Validate S3 configuration
     */
    protected function validateConfig($config)
    {
        $required = ['bucket', 'region', 'credentials'];
        
        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new Exception("Missing required S3 configuration: {$field}");
            }
        }
        
        if (empty($config['credentials']['key']) || empty($config['credentials']['secret'])) {
            throw new Exception('Invalid AWS credentials in configuration');
        }
        
        return true;
    }
    
    /**
     * Test S3 connection with current configuration
     */
    public function testConnection()
    {
        try {
            $client = $this->getS3Client();
            $bucket = $this->getBucket();
            
            // Try to list objects (limited to 1) to test connection
            $result = $client->listObjectsV2([
                'Bucket' => $bucket,
                'MaxKeys' => 1
            ]);
            
            return [
                'success' => true,
                'message' => 'S3 connection successful',
                'bucket' => $bucket,
                'region' => $this->getConfig()['region']
            ];
            
        } catch (\Aws\S3\Exception\S3Exception $e) {
            return [
                'success' => false,
                'message' => 'S3 Error: ' . $e->getAwsErrorMessage(),
                'error_code' => $e->getAwsErrorCode(),
                'bucket' => $this->getBucket()
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Clear cached configuration and clients
     */
    public function clearCache()
    {
        $temple = $this->templeService->getCurrentTemple();
        
        if ($temple) {
            $cacheKey = "s3_config_{$temple['id']}";
            Cache::forget($cacheKey);
            
            // Remove cached client
            unset($this->s3Clients[$temple['id']]);
        }
        
        $this->currentConfig = null;
    }
    
    /**
     * Decrypt encrypted value from database
     */
    protected function decryptValue($value)
    {
        if (empty($value)) {
            return '';
        }
        
        try {
            // Check if value is encrypted (you might want to add a prefix to identify encrypted values)
            if (strpos($value, 'encrypted:') === 0) {
                $encrypted = substr($value, 10); // Remove 'encrypted:' prefix
                return Crypt::decryptString($encrypted);
            }
            
            // Return as-is if not encrypted
            return $value;
        } catch (Exception $e) {
            Log::error('Failed to decrypt value', ['error' => $e->getMessage()]);
            return '';
        }
    }
    
    /**
     * Parse comma-separated string to array
     */
    protected function parseArray($value)
    {
        if (is_array($value)) {
            return $value;
        }
        
        if (empty($value)) {
            return [];
        }
        
        return array_map('trim', explode(',', $value));
    }
    
    /**
     * Get default configuration (fallback)
     */
    protected function getDefaultConfig()
    {
        // This can read from config/s3.php as fallback
        return [
            'credentials' => [
                'key' => env('AWS_ACCESS_KEY_ID', ''),
                'secret' => env('AWS_SECRET_ACCESS_KEY', ''),
            ],
            'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-1'),
            'version' => 'latest',
            'bucket' => env('AWS_BUCKET', ''),
            'url' => env('AWS_URL', ''),
            'endpoint' => env('AWS_ENDPOINT', ''),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'use_cdn' => false,
            'cdn_url' => '',
            'paths' => [
                'signatures' => 'signatures/',
                'documents' => 'documents/',
                'images' => 'images/',
                'reports' => 'reports/',
                'temp' => 'temp/',
            ],
            'signatures' => [
                'max_size' => 2048,
                'allowed_types' => ['image/jpeg', 'image/png'],
                'allowed_extensions' => ['jpg', 'jpeg', 'png'],
                'quality' => 90,
                'max_width' => 800,
                'max_height' => 400,
            ],
            'options' => [
                'visibility' => 'private',
                'CacheControl' => 'max-age=31536000',
                'ACL' => 'private',
            ],
            'temp_url_expiration' => 60,
        ];
    }
    
    /**
     * Encrypt value for storage
     */
    public function encryptForStorage($value)
    {
        if (empty($value)) {
            return '';
        }
        
        return 'encrypted:' . Crypt::encryptString($value);
    }
}