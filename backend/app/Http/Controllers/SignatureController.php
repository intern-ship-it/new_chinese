<?php
// app/Http/Controllers/SignatureController.php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\MemberSignature;
use App\Services\S3UploadService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class SignatureController extends Controller
{
    use ApiResponse;

    protected $s3Service;

    public function __construct(S3UploadService $s3Service)
    {
        $this->s3Service = $s3Service;
    }

    /**
     * Upload or update signature
     */
    public function uploadSignature(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|uuid|exists:users,id',
            'signature_type' => 'required|in:upload,drawn',
            'signature_file' => 'required_if:signature_type,upload|file|image|max:2048',
            'signature_data' => 'required_if:signature_type,drawn|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            // Verify user is a member
            $user = User::where('id', $request->user_id)
                        ->where('user_type', 'MEMBER')
                        ->first();
                        
            if (!$user) {
                return $this->notFoundResponse('Member not found');
            }

            // Check permission
            if (auth()->id() !== $user->id && 
                !auth()->user()->hasAnyRole(['super_admin', 'admin']) &&
                !auth()->user()->hasPermissionTo('edit_members')) {
                return $this->forbiddenResponse('You do not have permission to update this signature');
            }

            $templeId = $request->header('X-Temple-ID');
            $signatureData = null;
            $type = $request->signature_type;

            // Prepare signature data based on type
            if ($type === 'upload') {
                $file = $request->file('signature_file');
                
                // Validate file
                $validation = $this->s3Service->validateFile($file);
                if (!$validation['valid']) {
                    return $this->errorResponse($validation['message']);
                }
                
                $signatureData = $file;
            } else {
                // Drawn signature (base64)
                $signatureData = $request->signature_data;
            }

            // Check if signature already exists
            $existingSignature = MemberSignature::where('user_id', $user->id)->first();
            
            // Delete old signature from S3 if exists
            if ($existingSignature && $existingSignature->signature_url) {
                $this->s3Service->deleteSignature($existingSignature->signature_url);
            }

            // Upload new signature to S3
            $result = $this->s3Service->uploadSignature(
                $signatureData,
                $user->id,
                $templeId,
                $type
            );

            if (!$result['success']) {
                throw new Exception($result['message']);
            }

            // Save or update signature record
            if ($existingSignature) {
                // Update existing record
                $existingSignature->update([
                    'signature_url' => $result['path'],
                    'signature_type' => $type,
                    'file_size' => $result['size'],
                    'mime_type' => $result['mime_type'],
                    'metadata' => json_encode([
                        'uploaded_by' => auth()->id(),
                        'temple_id' => $templeId
                    ]),
                    'updated_at' => now(),
                    'updated_by' => auth()->id()
                ]);
            } else {
                // Create new record
                MemberSignature::create([
                    'user_id' => $user->id,
                    'signature_url' => $result['path'],
                    'signature_type' => $type,
                    'file_size' => $result['size'],
                    'mime_type' => $result['mime_type'],
                    'metadata' => json_encode([
                        'uploaded_by' => auth()->id(),
                        'temple_id' => $templeId
                    ]),
                    'created_by' => auth()->id()
                ]);
            }

            DB::commit();

            // Get signed URL for response
            $signedUrl = $this->s3Service->getSignedUrl($result['path']);

            return $this->successResponse([
                'signature_url' => $signedUrl,
                'signature_type' => $type,
                'uploaded_at' => $result['uploaded_at']
            ], 'Signature uploaded successfully');

        } catch (Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to upload signature: ' . $e->getMessage());
        }
    }

    /**
     * Delete signature
     */
    public function deleteSignature(Request $request, $userId)
    {
        DB::beginTransaction();
        try {
            // Verify user is a member
            $user = User::where('id', $userId)
                        ->where('user_type', 'MEMBER')
                        ->first();
                        
            if (!$user) {
                return $this->notFoundResponse('Member not found');
            }

            // Check permission
            if (auth()->id() !== $user->id && 
                !auth()->user()->hasAnyRole(['super_admin', 'admin']) &&
                !auth()->user()->hasPermissionTo('delete_members')) {
                return $this->forbiddenResponse('You do not have permission to delete this signature');
            }

            // Find signature record
            $signature = MemberSignature::where('user_id', $userId)->first();
            
            if ($signature) {
                // Delete from S3
                if ($signature->signature_url) {
                    $this->s3Service->deleteSignature($signature->signature_url);
                }
                
                // Delete database record
                $signature->delete();
            }

            DB::commit();
            return $this->successResponse(null, 'Signature deleted successfully');

        } catch (Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to delete signature: ' . $e->getMessage());
        }
    }

    /**
     * Get signature URL
     */
    public function getSignature($userId)
    {
        try {
            // Verify user is a member
            $user = User::where('id', $userId)
                        ->where('user_type', 'MEMBER')
                        ->first();
                        
            if (!$user) {
                return $this->notFoundResponse('Member not found');
            }

            // Get signature record
            $signature = MemberSignature::where('user_id', $userId)->first();
            
            if (!$signature) {
                return $this->notFoundResponse('No signature found for this member');
            }

            // Generate signed URL
            $signedUrl = $this->s3Service->getSignedUrl($signature->signature_url);

            return $this->successResponse([
                'signature_url' => $signedUrl,
                'signature_type' => $signature->signature_type,
                'uploaded_at' => $signature->created_at,
                'updated_at' => $signature->updated_at
            ], 'Signature retrieved successfully');

        } catch (Exception $e) {
            return $this->errorResponse('Failed to retrieve signature: ' . $e->getMessage());
        }
    }

    /**
     * Get multiple signatures (for bulk operations)
     */
    public function getMultipleSignatures(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_ids' => 'required|array',
            'user_ids.*' => 'uuid|exists:users,id'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $signatures = MemberSignature::whereIn('user_id', $request->user_ids)
                ->get()
                ->map(function($signature) {
                    return [
                        'user_id' => $signature->user_id,
                        'signature_url' => $this->s3Service->getSignedUrl($signature->signature_url),
                        'signature_type' => $signature->signature_type,
                        'uploaded_at' => $signature->created_at
                    ];
                });

            return $this->successResponse($signatures, 'Signatures retrieved successfully');

        } catch (Exception $e) {
            return $this->errorResponse('Failed to retrieve signatures: ' . $e->getMessage());
        }
    }
}