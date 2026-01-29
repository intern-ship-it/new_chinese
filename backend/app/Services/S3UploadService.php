<?php
// app/Services/S3UploadService.php
// Modified version with dynamic S3 configuration per temple

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use App\Services\S3ConfigManager;
use Carbon\Carbon;
use Exception;
use Aws\S3\Exception\S3Exception;

class S3UploadService
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
            
            Log::info('S3UploadService initialized', [
                'bucket' => $this->config['bucket'] ?? 'not-set',
                'region' => $this->config['region'] ?? 'not-set'
            ]);
        }
    }

    /**
     * Upload signature image to S3
     */
    public function uploadSignature($imageData, $userId, $templeId, $type = 'upload')
    {
        try {
            // Initialize S3 client for current temple
            $this->initialize();
            
            // Generate unique file name
            $fileName = $this->generateFileName($userId, 'signature');
            
            // Use configured path for signatures
            $filePath = $this->s3ConfigManager->getFullPath(
                "{$userId}/{$fileName}", 
                'signatures'
            );
            
            Log::info('Attempting S3 upload', [
                'file_path' => $filePath,
                'type' => $type,
                'user_id' => $userId,
                'temple_id' => $templeId,
                'bucket' => $this->config['bucket']
            ]);
            
            $imageContent = null;
            $mimeType = 'image/png';
            $fileSize = 0;

            if ($imageData instanceof UploadedFile) {
                // Handle uploaded file
                $imageContent = file_get_contents($imageData->getPathname());
                $mimeType = $imageData->getMimeType();
                $fileSize = $imageData->getSize();
                
                Log::info('Processing uploaded file', [
                    'original_name' => $imageData->getClientOriginalName(),
                    'mime_type' => $mimeType,
                    'size' => $fileSize
                ]);
                
            } else {
                // Handle base64 data (from signature pad)
                $imageContent = $this->processBase64Image($imageData);
                $fileSize = strlen($imageContent);
                
                Log::info('Processing base64 signature', [
                    'size' => $fileSize
                ]);
            }

            // Upload to S3 using the temple-specific client and bucket
            try {
                $result = $this->s3Client->putObject([
                    'Bucket' => $this->config['bucket'],
                    'Key' => $filePath,
                    'Body' => $imageContent,
                    'ContentType' => $mimeType,
                    'ACL' => $this->config['options']['ACL'] ?? 'private',
                    'CacheControl' => $this->config['options']['CacheControl'] ?? 'max-age=31536000',
                    'Metadata' => [
                        'user_id' => $userId,
                        'temple_id' => $templeId,
                        'upload_type' => $type,
                        'uploaded_at' => Carbon::now()->toIso8601String()
                    ]
                ]);
                
                Log::info('S3 upload successful', [
                    'bucket' => $this->config['bucket'],
                    'key' => $filePath,
                    'etag' => $result['ETag'] ?? null,
                    'version_id' => $result['VersionId'] ?? null
                ]);
                
            } catch (S3Exception $e) {
                Log::error('S3Exception during upload', [
                    'error_code' => $e->getAwsErrorCode(),
                    'error_message' => $e->getAwsErrorMessage(),
                    'bucket' => $this->config['bucket'],
                    'key' => $filePath
                ]);
                
                // Provide user-friendly error messages
                switch ($e->getAwsErrorCode()) {
                    case 'NoSuchBucket':
                        throw new Exception('S3 bucket does not exist: ' . $this->config['bucket']);
                    case 'AccessDenied':
                        throw new Exception('Access denied to S3 bucket. Check permissions.');
                    case 'InvalidAccessKeyId':
                        throw new Exception('Invalid AWS Access Key for this temple.');
                    case 'SignatureDoesNotMatch':
                        throw new Exception('Invalid AWS Secret Key for this temple.');
                    default:
                        throw new Exception('S3 Error: ' . $e->getAwsErrorMessage());
                }
            }

            // Verify file was uploaded
            $fileExists = $this->s3Client->doesObjectExist(
                $this->config['bucket'],
                $filePath
            );
            
            if (!$fileExists) {
                throw new Exception('File upload succeeded but file not found in S3');
            }

            // Generate URL based on visibility
            $url = $this->getFileUrl($filePath);
            
            Log::info('Upload complete', [
                'path' => $filePath,
                'url' => $url,
                'bucket' => $this->config['bucket']
            ]);

            return [
                'success' => true,
                'url' => $url,
                'path' => $filePath,
                'bucket' => $this->config['bucket'],
                'type' => $type,
                'size' => $fileSize,
                'mime_type' => $mimeType,
                'uploaded_at' => Carbon::now()
            ];

        } catch (Exception $e) {
            Log::error('Failed to upload signature', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'temple_id' => $templeId,
                'bucket' => $this->config['bucket'] ?? 'not-configured'
            ]);
            
            return [
                'success' => false,
                'message' => 'Failed to upload signature: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete signature from S3
     */
    public function deleteSignature($filePath)
    {
        try {
            $this->initialize();
            
            Log::info('Attempting to delete signature', [
                'path' => $filePath,
                'bucket' => $this->config['bucket']
            ]);
            
            // Check if object exists
            if ($this->s3Client->doesObjectExist($this->config['bucket'], $filePath)) {
                $result = $this->s3Client->deleteObject([
                    'Bucket' => $this->config['bucket'],
                    'Key' => $filePath
                ]);
                
                Log::info('Delete successful', [
                    'path' => $filePath,
                    'bucket' => $this->config['bucket']
                ]);
                
                return true;
            }
            
            Log::info('File not found for deletion', [
                'path' => $filePath,
                'bucket' => $this->config['bucket']
            ]);
            
            return true; // Consider successful if file doesn't exist
            
        } catch (Exception $e) {
            Log::error('Failed to delete signature', [
                'error' => $e->getMessage(),
                'path' => $filePath,
                'bucket' => $this->config['bucket'] ?? 'not-configured'
            ]);
            return false;
        }
    }

    /**
     * Get signed URL for private files
     */
    public function getSignedUrl($filePath, $expiration = null)
    {
        if (!$filePath) return null;
        
        try {
            $this->initialize();
            
            $expiration = $expiration ?: now()->addMinutes(
                $this->config['temp_url_expiration'] ?? 60
            );
            
            $cmd = $this->s3Client->getCommand('GetObject', [
                'Bucket' => $this->config['bucket'],
                'Key' => $filePath
            ]);
            
            $request = $this->s3Client->createPresignedRequest($cmd, $expiration);
            $url = (string) $request->getUri();
            
            Log::info('Generated signed URL', [
                'path' => $filePath,
                'bucket' => $this->config['bucket'],
                'expiration' => $expiration
            ]);
            
            return $url;
            
        } catch (Exception $e) {
            Log::error('Failed to generate signed URL', [
                'error' => $e->getMessage(),
                'path' => $filePath,
                'bucket' => $this->config['bucket'] ?? 'not-configured'
            ]);
            
            // Fallback to public URL if available
            return $this->s3ConfigManager->getPublicUrl($filePath);
        }
    }

    /**
     * Process base64 image
     */
    protected function processBase64Image($base64String)
    {
        // Remove data:image/png;base64, prefix if present
        $base64String = preg_replace('/^data:image\/\w+;base64,/', '', $base64String);
        return base64_decode($base64String);
    }

    /**
     * Generate unique file name
     */
    protected function generateFileName($userId, $prefix = 'file')
    {
        $timestamp = Carbon::now()->format('YmdHis');
        $random = Str::random(6);
        return "{$prefix}_{$userId}_{$timestamp}_{$random}.png";
    }

    /**
     * Get file URL based on visibility settings
     */
    protected function getFileUrl($filePath)
    {
        $visibility = $this->config['options']['visibility'] ?? 'private';
        
        if ($visibility === 'public') {
            // Return public URL
            return $this->s3ConfigManager->getPublicUrl($filePath);
        } else {
            // For private files, return the path - use getSignedUrl when displaying
            return $filePath;
        }
    }

    /**
     * Validate file
     */
    public function validateFile($file)
    {
        $this->initialize();
        
        $maxSize = ($this->config['signatures']['max_size'] ?? 2048) * 1024; // Convert KB to bytes
        $allowedTypes = $this->config['signatures']['allowed_types'] ?? ['image/jpeg', 'image/png'];
        $allowedExtensions = $this->config['signatures']['allowed_extensions'] ?? ['jpg', 'jpeg', 'png'];

        // Check file size
        if ($file->getSize() > $maxSize) {
            return [
                'valid' => false,
                'message' => 'File size exceeds maximum allowed size of ' . ($maxSize / 1024 / 1024) . 'MB'
            ];
        }

        // Check mime type
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return [
                'valid' => false,
                'message' => 'Invalid file type. Allowed types: ' . implode(', ', $allowedExtensions)
            ];
        }

        // Check extension
        if (!in_array(strtolower($file->getClientOriginalExtension()), $allowedExtensions)) {
            return [
                'valid' => false,
                'message' => 'Invalid file extension. Allowed extensions: ' . implode(', ', $allowedExtensions)
            ];
        }

        return ['valid' => true];
    }

    /**
     * Test S3 configuration for current temple
     */
    public function testS3Connection()
    {
        try {
            $this->initialize();
            
            // Use S3ConfigManager's test method
            return $this->s3ConfigManager->testConnection();
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Upload any file type to S3
     */
    public function uploadFile($file, $path, $type = 'documents')
    {
        try {
            $this->initialize();
            
            $fileName = $this->generateFileName(auth()->id(), pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
            $filePath = $this->s3ConfigManager->getFullPath($path . '/' . $fileName, $type);
            
            $result = $this->s3Client->putObject([
                'Bucket' => $this->config['bucket'],
                'Key' => $filePath,
                'Body' => file_get_contents($file->getPathname()),
                'ContentType' => $file->getMimeType(),
                'ACL' => $this->config['options']['ACL'] ?? 'private',
                'Metadata' => [
                    'original_name' => $file->getClientOriginalName(),
                    'uploaded_by' => auth()->id(),
                    'uploaded_at' => Carbon::now()->toIso8601String()
                ]
            ]);
            
            return [
                'success' => true,
                'path' => $filePath,
                'url' => $this->getFileUrl($filePath),
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ];
            
        } catch (Exception $e) {
            Log::error('Failed to upload file', [
                'error' => $e->getMessage(),
                'type' => $type
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    /**
 * Upload donation image
 */
public function uploadDonationImage($file, $donationId, $templeId, $type = 'upload')
{
    try {
        $folder = "temples/{$templeId}/donations/{$donationId}";
        
        if ($type === 'upload') {
            // Regular file upload
            $extension = $file->getClientOriginalExtension();
            $filename = 'donation_' . time() . '_' . uniqid() . '.' . $extension;
            $path = $folder . '/' . $filename;
            
            $result = $this->s3->putObject([
                'Bucket' => $this->bucket,
                'Key' => $path,
                'Body' => fopen($file->getRealPath(), 'r'),
                'ContentType' => $file->getMimeType(),
                'ACL' => 'private'
            ]);
        } else {
            // Base64 image data (drawn/captured)
            $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $file));
            $filename = 'donation_' . time() . '_' . uniqid() . '.png';
            $path = $folder . '/' . $filename;
            
            $result = $this->s3->putObject([
                'Bucket' => $this->bucket,
                'Key' => $path,
                'Body' => $imageData,
                'ContentType' => 'image/png',
                'ACL' => 'private'
            ]);
        }

        return [
            'success' => true,
            'path' => $path,
            'size' => $type === 'upload' ? $file->getSize() : strlen($imageData),
            'mime_type' => $type === 'upload' ? $file->getMimeType() : 'image/png',
            'uploaded_at' => now()
        ];
    } catch (Exception $e) {
        \Log::error('S3 donation image upload failed: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to upload image: ' . $e->getMessage()
        ];
    }
}

/**
 * Delete donation image
 */
public function deleteDonationImage($path)
{
    try {
        $this->s3->deleteObject([
            'Bucket' => $this->bucket,
            'Key' => $path
        ]);

        return ['success' => true];
    } catch (Exception $e) {
        \Log::error('S3 donation image deletion failed: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to delete image: ' . $e->getMessage()
        ];
    }
}
}