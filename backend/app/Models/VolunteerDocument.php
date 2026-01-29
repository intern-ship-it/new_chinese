<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Services\S3UploadService;

class VolunteerDocument extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'volunteer_documents';
    
    // UUID primary key configuration
    public $incrementing = false;
    protected $keyType = 'string';

    // No updated_at column
    const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'volunteer_id',
        'document_type',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
        'uploaded_at',
        'uploaded_by',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'uploaded_at' => 'datetime',
        'file_size' => 'integer',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'uploaded_by',
    ];

    /**
     * Default attribute values
     */
    protected $attributes = [];

    // =============================================
    // CONSTANTS
    // =============================================

    // Document types
    const TYPE_IC_PHOTOSTAT = 'ic_photostat';
    const TYPE_PASSPORT_PHOTO = 'passport_photo';
    const TYPE_PASSPORT_PHOTOSTAT = 'passport_photostat';
    const TYPE_OTHER = 'other';

    // Allowed MIME types
    const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
    ];

    // Max file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

    // =============================================
    // RELATIONSHIPS
    // =============================================

    /**
     * Get the volunteer that owns this document
     */
    public function volunteer()
    {
        return $this->belongsTo(Volunteer::class, 'volunteer_id');
    }

    /**
     * Get the user who uploaded this document
     */
    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // =============================================
    // SCOPES
    // =============================================

    /**
     * Scope: Filter by document type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('document_type', $type);
    }

    /**
     * Scope: Filter by volunteer
     */
    public function scopeForVolunteer($query, $volunteerId)
    {
        return $query->where('volunteer_id', $volunteerId);
    }

    /**
     * Scope: Recent uploads
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('uploaded_at', '>=', now()->subDays($days));
    }

    // =============================================
    // HELPER METHODS
    // =============================================

    /**
     * Get document type label
     */
    public function getDocumentTypeLabelAttribute()
    {
        return match($this->document_type) {
            self::TYPE_IC_PHOTOSTAT => 'IC Photostat',
            self::TYPE_PASSPORT_PHOTO => 'Passport Photo',
            self::TYPE_PASSPORT_PHOTOSTAT => 'Passport Photostat',
            self::TYPE_OTHER => 'Other Document',
            default => ucfirst(str_replace('_', ' ', $this->document_type)),
        };
    }

    /**
     * Get file size in human readable format
     */
    public function getFileSizeHumanAttribute()
    {
        if (empty($this->file_size)) {
            return 'Unknown';
        }

        $bytes = $this->file_size;
        
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    /**
     * Get file extension
     */
    public function getFileExtensionAttribute()
    {
        return pathinfo($this->file_name, PATHINFO_EXTENSION);
    }

    /**
     * Check if document is an image
     */
    public function isImage(): bool
    {
        return in_array($this->mime_type, [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
        ]);
    }

    /**
     * Check if document is a PDF
     */
    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * Get full file URL with signed URL support for S3
     */
    public function getFileUrlAttribute()
    {
        if (empty($this->file_path)) {
            return null;
        }

        try {
            // Parse file_path if it's JSON (S3 response format)
            $filePath = $this->file_path;
            if (is_string($filePath)) {
                $fileData = json_decode($filePath, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $filePath = $fileData['path'] ?? $fileData['url'] ?? $filePath;
                }
            }

            // If file path is already a full URL
            if (filter_var($filePath, FILTER_VALIDATE_URL)) {
                return $filePath;
            }

            // Generate signed URL for S3 private files
            $s3Service = app(S3UploadService::class);
            return $s3Service->getSignedUrl($filePath);

        } catch (\Exception $e) {
            Log::error('Failed to generate file URL for volunteer document', [
                'document_id' => $this->id,
                'file_path' => $this->file_path,
                'error' => $e->getMessage()
            ]);

            // Fallback to storage URL if S3 fails
            return Storage::url($this->file_path);
        }
    }

    /**
     * Get download URL
     */
    public function getDownloadUrlAttribute()
    {
        return route('api.volunteers.documents.download', $this->id);
    }

    /**
     * Delete file from storage (S3 or local)
     */
    public function deleteFile(): bool
    {
        if (empty($this->file_path)) {
            return true;
        }

        try {
            // Parse file_path if it's JSON
            $filePath = $this->file_path;
            if (is_string($filePath)) {
                $fileData = json_decode($filePath, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $filePath = $fileData['path'] ?? $fileData['url'] ?? $filePath;
                }
            }

            // If it's a URL, try S3 deletion
            if (!filter_var($filePath, FILTER_VALIDATE_URL)) {
                // Try S3 deletion first
                $s3Service = app(S3UploadService::class);
                if ($s3Service->deleteSignature($filePath)) {
                    Log::info('Successfully deleted file from S3', [
                        'document_id' => $this->id,
                        'file_path' => $filePath
                    ]);
                    return true;
                }
            }

            // Fallback to local storage deletion
            return Storage::delete($filePath);

        } catch (\Exception $e) {
            Log::error('Failed to delete volunteer document file', [
                'document_id' => $this->id,
                'file_path' => $this->file_path,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Validate uploaded file
     */
    public static function validateFile($file): array
    {
        $errors = [];

        // Check if file exists
        if (!$file || !$file->isValid()) {
            $errors[] = 'Invalid file upload';
            return $errors;
        }

        // Check file size
        if ($file->getSize() > self::MAX_FILE_SIZE) {
            $maxSizeMB = self::MAX_FILE_SIZE / (1024 * 1024);
            $errors[] = "File size exceeds maximum allowed size of {$maxSizeMB}MB";
        }

        // Check MIME type
        if (!in_array($file->getMimeType(), self::ALLOWED_MIME_TYPES)) {
            $errors[] = 'File type not allowed. Allowed types: PDF, JPG, PNG';
        }

        return $errors;
    }

    /**
     * Store uploaded file using S3UploadService
     */
    public static function storeFile($file, $volunteerId, $documentType): ?self
    {
        try {
            // Validate file
            $errors = self::validateFile($file);
            if (!empty($errors)) {
                throw new \Exception(implode(', ', $errors));
            }

            // Get S3 upload service
            $s3Service = app(S3UploadService::class);

            // Upload to S3
            $uploadResult = $s3Service->uploadFile(
                $file,
                "volunteers/{$volunteerId}",
                'volunteer_documents'
            );

            if (!$uploadResult['success']) {
                throw new \Exception('Failed to upload file: ' . ($uploadResult['message'] ?? 'Unknown error'));
            }

            Log::info('File uploaded successfully to S3', [
                'volunteer_id' => $volunteerId,
                'document_type' => $documentType,
                'file_path' => $uploadResult['path'],
                'file_size' => $uploadResult['size']
            ]);

            // Create document record
            $document = new self([
                'volunteer_id' => $volunteerId,
                'document_type' => $documentType,
                'file_path' => $uploadResult['path'], // Store S3 path
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $uploadResult['size'],
                'mime_type' => $uploadResult['mime_type'],
                'uploaded_at' => now(),
                'uploaded_by' => auth()->id(),
            ]);

            $document->save();

            // Load the file_url attribute for immediate use
            $document->file_url = $document->getFileUrlAttribute();

            return $document;

        } catch (\Exception $e) {
            Log::error('Failed to store volunteer document', [
                'volunteer_id' => $volunteerId,
                'document_type' => $documentType,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get all document types
     */
    public static function getDocumentTypes(): array
    {
        return [
            self::TYPE_IC_PHOTOSTAT => 'IC Photostat',
            self::TYPE_PASSPORT_PHOTO => 'Passport Photo',
            self::TYPE_PASSPORT_PHOTOSTAT => 'Passport Photostat',
            self::TYPE_OTHER => 'Other Document',
        ];
    }

    /**
     * Get required document types
     */
    public static function getRequiredDocumentTypes($idType = 'ic'): array
    {
        $required = [
            self::TYPE_IC_PHOTOSTAT => 'IC Photostat',
            self::TYPE_PASSPORT_PHOTO => 'Passport Photo',
        ];

        // Add passport photostat for passport holders
        if ($idType === 'passport') {
            $required[self::TYPE_PASSPORT_PHOTOSTAT] = 'Passport Photostat';
        }

        return $required;
    }

    // =============================================
    // EVENTS
    // =============================================

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        // Set uploaded_at on creation
        static::creating(function ($document) {
            if (empty($document->uploaded_at)) {
                $document->uploaded_at = now();
            }

            if (empty($document->uploaded_by)) {
                $document->uploaded_by = auth()->id();
            }
        });

        // Delete file from storage when document record is deleted
        static::deleting(function ($document) {
            $document->deleteFile();
        });
    }
}