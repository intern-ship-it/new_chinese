<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use App\Services\S3ConfigManager;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Exception;
use Aws\S3\Exception\S3Exception;

class TempleLogoService
{
    protected $s3ConfigManager;
    protected $s3Client;
    protected $config;

    public function __construct(S3ConfigManager $s3ConfigManager)
    {
        $this->s3ConfigManager = $s3ConfigManager;
    }

    /**
     * Initialize S3 client and config for current temple
     */
    protected function initialize()
    {
        if (!$this->s3Client) {
            $this->s3Client = $this->s3ConfigManager->getS3Client(true);
            $this->config = $this->s3ConfigManager->getConfig(true);

            Log::info('TempleLogoService initialized', [
                'bucket' => $this->config['bucket'] ?? 'not-set',
                'region' => $this->config['region'] ?? 'not-set'
            ]);
        }
    }

    /**
     * Upload temple logo to S3
     */
    public function uploadLogo(UploadedFile $file, $templeId)
    {
        try {
            // Initialize S3 client for current temple
            $this->initialize();

            // Validate file
            $validation = $this->validateLogoFile($file);
            if (!$validation['valid']) {
                return [
                    'success' => false,
                    'message' => $validation['message']
                ];
            }

            // Get temple code
            $templeCode = SystemSetting::where('key', 'temple_code')
                ->where('type', 'SYSTEM')
                ->value('value') ?? 'default';

            // Generate unique file name
            $uuid = Str::uuid()->toString();
            $timestamp = Carbon::now()->format('YmdHis');
            $random = Str::random(6);
            $extension = $file->getClientOriginalExtension();
            $fileName = "temple_logo_{$uuid}_{$timestamp}_{$random}.{$extension}";

            // Construct S3 key path
            $filePath = "temple_logos/{$templeCode}/{$uuid}/{$fileName}";

            Log::info('Attempting temple logo upload', [
                'file_path' => $filePath,
                'temple_id' => $templeId,
                'temple_code' => $templeCode,
                'bucket' => $this->config['bucket'],
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize()
            ]);

            // Archive existing logo if present
            $archivedPath = $this->archiveExistingLogo($templeCode);

            // Upload to S3
            try {
                $result = $this->s3Client->putObject([
                    'Bucket' => $this->config['bucket'],
                    'Key' => $filePath,
                    'Body' => file_get_contents($file->getPathname()),
                    'ContentType' => $file->getMimeType(),
                    'ACL' => $this->config['options']['ACL'] ?? 'private',
                    'CacheControl' => $this->config['options']['CacheControl'] ?? 'max-age=31536000',
                    'Metadata' => [
                        'temple_id' => (string)$templeId,
                        'temple_code' => $templeCode,
                        'upload_type' => 'temple_logo',
                        'uploaded_at' => Carbon::now()->toIso8601String(),
                        'uploaded_by' => (string)(auth()->id() ?? 'system'),
                        'original_name' => $file->getClientOriginalName()
                    ]
                ]);

                Log::info('S3 upload successful', [
                    'bucket' => $this->config['bucket'],
                    'key' => $filePath,
                    'etag' => $result['ETag'] ?? null,
                    'version_id' => $result['VersionId'] ?? null
                ]);
            } catch (S3Exception $e) {
                Log::error('S3Exception during logo upload', [
                    'error_code' => $e->getAwsErrorCode(),
                    'error_message' => $e->getAwsErrorMessage(),
                    'bucket' => $this->config['bucket'],
                    'key' => $filePath
                ]);

                return $this->handleS3Exception($e);
            }

            // Verify file was uploaded
            $fileExists = $this->s3Client->doesObjectExist(
                $this->config['bucket'],
                $filePath
            );

            if (!$fileExists) {
                throw new Exception('Logo upload succeeded but file not found in S3');
            }

            // Save to database
            $this->saveLogoToDatabase($filePath, $file, $archivedPath);

            // Generate URL
            $url = $this->getLogoUrl($filePath);

            Log::info('Logo upload complete', [
                'path' => $filePath,
                'url' => $url,
                'bucket' => $this->config['bucket'],
                'archived_previous' => $archivedPath
            ]);

            return [
                'success' => true,
                'path' => $filePath,
                'url' => $url,
                'filename' => $fileName,
                'bucket' => $this->config['bucket'],
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'archived_previous' => !empty($archivedPath),
                'archived_path' => $archivedPath
            ];
        } catch (Exception $e) {
            Log::error('Failed to upload temple logo', [
                'error' => $e->getMessage(),
                'temple_id' => $templeId,
                'bucket' => $this->config['bucket'] ?? 'not-configured'
            ]);

            return [
                'success' => false,
                'message' => 'Failed to upload logo: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Archive existing logo to archive folder
     */
    protected function archiveExistingLogo($templeCode)
    {
        try {
            // Get current logo from database
            $currentLogoPath = SystemSetting::where('key', 'temple_logo')
                ->where('type', 'SYSTEM')
                ->value('value');

            if (!$currentLogoPath) {
                return null;
            }

            // Check if the logo exists in S3
            if (!$this->s3Client->doesObjectExist($this->config['bucket'], $currentLogoPath)) {
                Log::info('Current logo not found in S3 for archiving', [
                    'path' => $currentLogoPath
                ]);
                return null;
            }

            // Generate archive path
            $archiveDate = Carbon::now()->format('Y-m-d');
            $archivePath = str_replace('temple_logos/', 'temple_logos/archive/', $currentLogoPath);
            $archivePath = str_replace("/{$templeCode}/", "/{$templeCode}/{$archiveDate}/", $archivePath);

            Log::info('Archiving existing logo', [
                'from' => $currentLogoPath,
                'to' => $archivePath
            ]);

            // Copy to archive
            $this->s3Client->copyObject([
                'Bucket' => $this->config['bucket'],
                'CopySource' => "{$this->config['bucket']}/{$currentLogoPath}",
                'Key' => $archivePath,
                'MetadataDirective' => 'COPY'
            ]);

            // Tag the original as archived (but don't delete)
            try {
                $this->s3Client->putObjectTagging([
                    'Bucket' => $this->config['bucket'],
                    'Key' => $currentLogoPath,
                    'Tagging' => [
                        'TagSet' => [
                            [
                                'Key' => 'Status',
                                'Value' => 'Archived'
                            ],
                            [
                                'Key' => 'ArchivedDate',
                                'Value' => Carbon::now()->toIso8601String()
                            ],
                            [
                                'Key' => 'ArchivedTo',
                                'Value' => $archivePath
                            ]
                        ]
                    ]
                ]);
            } catch (Exception $e) {
                Log::warning('Failed to tag archived logo', [
                    'error' => $e->getMessage(),
                    'path' => $currentLogoPath
                ]);
            }

            return $archivePath;
        } catch (Exception $e) {
            Log::error('Failed to archive existing logo', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get current temple logo
     */
    public function getCurrentLogo()
    {
        try {
            $this->initialize();

            $logoPath = SystemSetting::where('key', 'temple_logo')
                ->where('type', 'SYSTEM')
                ->value('value');

            if (!$logoPath) {
                return [
                    'success' => true,
                    'exists' => false,
                    'message' => 'No logo configured'
                ];
            }

            // Check if logo exists in S3
            $exists = $this->s3Client->doesObjectExist($this->config['bucket'], $logoPath);

            if (!$exists) {
                return [
                    'success' => true,
                    'exists' => false,
                    'path' => $logoPath,
                    'message' => 'Logo record exists but file not found in S3'
                ];
            }

            // Get metadata if available
            $metadata = SystemSetting::where('key', 'temple_logo_metadata')
                ->where('type', 'SYSTEM')
                ->value('value');

            $metadataArray = $metadata ? json_decode($metadata, true) : [];

            // Generate URL
            $url = $this->getLogoUrl($logoPath);

            return [
                'success' => true,
                'exists' => true,
                'path' => $logoPath,
                'url' => $url,
                'metadata' => $metadataArray,
                'bucket' => $this->config['bucket']
            ];
        } catch (Exception $e) {
            Log::error('Failed to get current logo', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to retrieve logo: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete/Archive temple logo
     */
    public function deleteLogo()
    {
        try {
            $this->initialize();

            $logoPath = SystemSetting::where('key', 'temple_logo')
                ->where('type', 'SYSTEM')
                ->value('value');

            if (!$logoPath) {
                return [
                    'success' => true,
                    'message' => 'No logo to delete'
                ];
            }

            // Archive the logo instead of deleting
            $templeCode = SystemSetting::where('key', 'temple_code')
                ->where('type', 'SYSTEM')
                ->value('value') ?? 'default';

            $archivedPath = $this->archiveExistingLogo($templeCode);

            // Tag as deleted (but don't actually delete from S3)
            if ($this->s3Client->doesObjectExist($this->config['bucket'], $logoPath)) {
                try {
                    $this->s3Client->putObjectTagging([
                        'Bucket' => $this->config['bucket'],
                        'Key' => $logoPath,
                        'Tagging' => [
                            'TagSet' => [
                                [
                                    'Key' => 'Status',
                                    'Value' => 'Deleted'
                                ],
                                [
                                    'Key' => 'DeletedDate',
                                    'Value' => Carbon::now()->toIso8601String()
                                ]
                            ]
                        ]
                    ]);
                } catch (Exception $e) {
                    Log::warning('Failed to tag deleted logo', [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Clear database entries
            SystemSetting::where('key', 'temple_logo')
                ->where('type', 'SYSTEM')
                ->update(['value' => null]);

            SystemSetting::where('key', 'temple_logo_metadata')
                ->where('type', 'SYSTEM')
                ->delete();

            // Clear cache
            \Cache::forget('system_setting_temple_logo');
            \Cache::forget('system_setting_temple_logo_metadata');
            \Cache::forget('system_settings_type_SYSTEM');

            return [
                'success' => true,
                'message' => 'Logo removed successfully (archived in S3)',
                'archived_path' => $archivedPath
            ];
        } catch (Exception $e) {
            Log::error('Failed to delete logo', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to delete logo: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get logo URL (signed for private files)
     */
    public function getLogoUrl($path, $expiration = null)
    {
        if (!$path) return null;

        $visibility = $this->config['options']['visibility'] ?? 'private';

        if ($visibility === 'public') {
            // Return public URL
            return $this->s3ConfigManager->getPublicUrl($path);
        } else {
            // Generate signed URL for private files
            try {
                $expiration = $expiration ?: now()->addMinutes(
                    $this->config['temp_url_expiration'] ?? 60
                );

                $cmd = $this->s3Client->getCommand('GetObject', [
                    'Bucket' => $this->config['bucket'],
                    'Key' => $path
                ]);

                $request = $this->s3Client->createPresignedRequest($cmd, $expiration);
                $url = (string) $request->getUri();

                // Apply CDN if configured
                if (!empty($this->config['use_cdn']) && !empty($this->config['cdn_url'])) {
                    $s3Domain = parse_url($url, PHP_URL_HOST);
                    $cdnUrl = rtrim($this->config['cdn_url'], '/');
                    $url = str_replace("https://{$s3Domain}", $cdnUrl, $url);
                }

                return $url;
            } catch (Exception $e) {
                Log::error('Failed to generate signed URL for logo', [
                    'error' => $e->getMessage(),
                    'path' => $path
                ]);

                // Fallback to public URL if available
                return $this->s3ConfigManager->getPublicUrl($path);
            }
        }
    }

    /**
     * Validate logo file
     */
    protected function validateLogoFile(UploadedFile $file)
    {
        $maxSize = 524288000; // 500MB in bytes
        $allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/svg+xml',
            'image/webp'
        ];
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];

        // Check file size
        if ($file->getSize() > $maxSize) {
            return [
                'valid' => false,
                'message' => 'File size exceeds maximum allowed size of 500MB'
            ];
        }

        // Check mime type
        if (!in_array($file->getMimeType(), $allowedMimeTypes)) {
            return [
                'valid' => false,
                'message' => 'Invalid file type. Allowed types: ' . implode(', ', $allowedExtensions)
            ];
        }

        // Check extension
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, $allowedExtensions)) {
            return [
                'valid' => false,
                'message' => 'Invalid file extension. Allowed extensions: ' . implode(', ', $allowedExtensions)
            ];
        }

        return ['valid' => true];
    }

    /**
     * Save logo information to database
     */
    protected function saveLogoToDatabase($path, UploadedFile $file, $archivedPath = null)
    {
        // Save S3 key to database
        SystemSetting::updateOrCreate(
            [
                'key' => 'temple_logo',
                'type' => 'SYSTEM'
            ],
            [
                'value' => $path,
                'description' => 'Temple logo S3 key path'
            ]
        );

        // Save metadata
        SystemSetting::updateOrCreate(
            [
                'key' => 'temple_logo_metadata',
                'type' => 'SYSTEM'
            ],
            [
                'value' => json_encode([
                    's3_key' => $path,
                    'bucket' => $this->config['bucket'],
                    'uploaded_at' => Carbon::now()->toIso8601String(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'original_name' => $file->getClientOriginalName(),
                    'archived_logo' => $archivedPath,
                    'uploaded_by' => auth()->id() ?? 'system'
                ]),
                'description' => 'Temple logo metadata'
            ]
        );

        // Clear cache
        \Cache::forget('system_setting_temple_logo');
        \Cache::forget('system_setting_temple_logo_metadata');
        \Cache::forget('system_settings_type_SYSTEM');
    }

    /**
     * Handle S3 exceptions
     */
    protected function handleS3Exception(S3Exception $e)
    {
        $errorCode = $e->getAwsErrorCode();
        $errorMessage = $e->getAwsErrorMessage();

        switch ($errorCode) {
            case 'NoSuchBucket':
                $message = 'S3 bucket does not exist: ' . $this->config['bucket'];
                break;
            case 'AccessDenied':
                $message = 'Access denied to S3 bucket. Please check AWS permissions.';
                break;
            case 'InvalidAccessKeyId':
                $message = 'Invalid AWS Access Key. Please check AWS configuration.';
                break;
            case 'SignatureDoesNotMatch':
                $message = 'Invalid AWS Secret Key. Please check AWS configuration.';
                break;
            default:
                $message = 'S3 Error: ' . $errorMessage;
        }

        return [
            'success' => false,
            'message' => $message,
            'error_code' => $errorCode
        ];
    }
}
