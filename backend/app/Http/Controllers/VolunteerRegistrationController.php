<?php


namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Volunteer;
use App\Models\VolunteerDocument;
use App\Models\VolunteerApprovalLog;
use App\Models\VolunteerDepartment;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class VolunteerRegistrationController extends Controller
{
    protected $s3UploadService;

    public function __construct(S3UploadService $s3UploadService)
    {
        $this->s3UploadService = $s3UploadService;
    }

    /**
     * Get all volunteer registrations with filters
     * 
     * GET /api/volunteers/registration
     */
    public function index(Request $request)
    {
        try {
            $query = Volunteer::with([
                'preferredDepartment:id,department_name',
                'approvedBy:id,name',
                'documents'
            ]);

            // Search filter
            if ($request->filled('search')) {
                $query->search($request->search);
            }

            // Status filter
            if ($request->filled('status')) {
                $query->byStatus($request->status);
            }

            // Department filter
            if ($request->filled('department_id')) {
                $query->byDepartment($request->department_id);
            }

            // Gender filter
            if ($request->filled('gender')) {
                $query->byGender($request->gender);
            }

            // Date range filter
            if ($request->filled('from_date') && $request->filled('to_date')) {
                $query->registeredBetween($request->from_date, $request->to_date);
            }

            // Sorting
            $sortField = $request->get('sort_by', 'registered_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortField, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $volunteers = $query->paginate($perPage);

            // Append helper attributes and generate signed URLs for documents
            $volunteers->getCollection()->transform(function ($volunteer) {
                $volunteer->age = $volunteer->age;
                $volunteer->display_name = $volunteer->display_name;
                $volunteer->status_label = $volunteer->status_label;
                $volunteer->status_color = $volunteer->status_color;
                $volunteer->has_required_documents = $volunteer->hasRequiredDocuments();
                $volunteer->missing_documents = $volunteer->getMissingDocuments();

                // Generate signed URLs for all documents
                if ($volunteer->documents) {
                    $volunteer->documents->transform(function ($document) {
                        $document->file_display_url = $this->getDocumentDisplayUrl($document);
                        return $document;
                    });
                }

                return $volunteer;
            });

            return response()->json([
                'success' => true,
                'data' => $volunteers->items(),
                'pagination' => [
                    'current_page' => $volunteers->currentPage(),
                    'last_page' => $volunteers->lastPage(),
                    'per_page' => $volunteers->perPage(),
                    'total' => $volunteers->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching volunteers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching volunteers',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get volunteers pending approval
     * 
     * GET /api/volunteers/registration/pending-approvals
     */
    public function pendingApprovals(Request $request)
    {
        try {
            $query = Volunteer::with([
                'preferredDepartment:id,department_name',
                'documents',
                'approvalLogs' => function ($q) {
                    $q->latest()->take(3);
                }
            ])->pendingApproval();

            // Search filter
            if ($request->filled('search')) {
                $query->search($request->search);
            }

            // Sorting by registration date
            $query->orderBy('registered_at', 'asc');

            $volunteers = $query->get();

            // Append helper attributes
            $volunteers->transform(function ($volunteer) {
                $volunteer->age = $volunteer->age;
                $volunteer->display_name = $volunteer->display_name;
                $volunteer->status_label = $volunteer->status_label;
                $volunteer->status_color = $volunteer->status_color;
                $volunteer->has_required_documents = $volunteer->hasRequiredDocuments();
                $volunteer->missing_documents = $volunteer->getMissingDocuments();
                $volunteer->days_pending = now()->diffInDays($volunteer->registered_at);

                // Generate signed URLs for documents
                if ($volunteer->documents) {
                    $volunteer->documents->transform(function ($document) {
                        $document->file_display_url = $this->getDocumentDisplayUrl($document);
                        return $document;
                    });
                }

                return $volunteer;
            });

            return response()->json([
                'success' => true,
                'data' => $volunteers,
                'count' => $volunteers->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching pending approvals: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching pending approvals',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single volunteer registration
     * 
     * GET /api/volunteers/registration/{id}
     */
    public function show($id)
    {
        try {
            $volunteer = Volunteer::with([
                'preferredDepartment',
                'approvedBy:id,name',
                'createdBy:id,name',
                'updatedBy:id,name',
                'documents.uploader:id,name',
                'approvalLogs.admin:id,name',
                'assignments',
                'attendances' => function ($q) {
                    $q->latest()->take(10);
                }
            ])->findOrFail($id);

            // Append helper attributes
            $volunteer->age = $volunteer->age;
            $volunteer->display_name = $volunteer->display_name;
            $volunteer->status_label = $volunteer->status_label;
            $volunteer->status_color = $volunteer->status_color;
            $volunteer->formatted_address = $volunteer->formatted_address;
            $volunteer->has_required_documents = $volunteer->hasRequiredDocuments();
            $volunteer->missing_documents = $volunteer->getMissingDocuments();
            $volunteer->can_be_assigned_tasks = $volunteer->canBeAssignedTasks();
            $volunteer->can_clock_in = $volunteer->canClockIn();

            // Generate signed URLs for all documents
            if ($volunteer->documents) {
                $volunteer->documents->transform(function ($document) {
                    $document->file_display_url = $this->getDocumentDisplayUrl($document);
                    return $document;
                });
            }

            return response()->json([
                'success' => true,
                'data' => $volunteer,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching volunteer: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Volunteer not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Create new volunteer registration
     * Supports both single-step and 4-step wizard
     * 
     * POST /api/volunteers/registration
     */
public function store(Request $request)
{
    try {
        // Step-based validation
        $step = $request->get('step', 'complete');

        // Collect all validation rules
        $rules = [];
        $messages = [];

        if ($step === '1' || $step === 'complete') {
            $rules = array_merge($rules, [
                'full_name' => 'required|string|max:100',
                   'full_name_en' => 'nullable|string|max:100', 
                'gender' => 'required|in:male,female,other',
                'id_type' => 'required|in:ic,passport',
                'ic_number' => 'required_if:id_type,ic|nullable|string|max:20',
                'passport_number' => 'required_if:id_type,passport|nullable|string|max:20',
                'date_of_birth' => 'nullable|date',
                'marital_status' => 'nullable|in:single,married,divorced,widowed',
            ]);
                 $messages['full_name.required'] = 'Full name (Chinese) is required';
        }

        if ($step === '2' || $step === 'complete') {
            $rules = array_merge($rules, [
                'mobile_primary' => 'required|string|max:20',
                'email' => 'nullable|email|max:100',
                'address' => 'nullable|string',
                'city' => 'nullable|string|max:50',
                'state' => 'nullable|string|max:50',
                'postal_code' => 'nullable|string|max:20',
                'country' => 'nullable|string|max:50',
                'emergency_contact_name' => 'nullable|string|max:100',
                'emergency_contact_relationship' => 'nullable|string|max:50',
                'emergency_contact_phone' => 'nullable|string|max:20',
            ]);
        }

        if ($step === '3' || $step === 'complete') {
            $rules = array_merge($rules, [
                'languages_spoken' => 'nullable|array',
                'skills_strengths' => 'nullable|string',
                'preferred_department_id' => 'nullable|uuid|exists:volunteer_departments,id',
                'preferred_tasks' => 'nullable|array',
                'preferred_tasks.*' => 'uuid|exists:volunteer_tasks,id',
                'past_volunteer_experience' => 'nullable|boolean',
                'physical_limitations' => 'nullable|string',
            ]);
        }

        // Step 4: Document validation - Accept both files AND base64
        if ($step === '4' || $step === 'complete') {
            $rules = array_merge($rules, [
                'ic_photostat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
                'passport_photo' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
                'passport_photostat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
                // Also accept base64 (like SpecialOccasionController)
                'ic_photostat_base64' => 'nullable|string',
                'passport_photo_base64' => 'nullable|string',
                'passport_photostat_base64' => 'nullable|string',
            ]);
        }

        // Validate
        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            Log::error('Validation failed for volunteer registration', [
                'errors' => $validator->errors()->toArray(),
                'input' => $request->except(['password', 'api_token', 'ic_photostat', 'passport_photo', 'passport_photostat'])
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check duplicates
        if ($step === '1' || $step === 'complete') {
            $duplicateCheck = $this->checkDuplicates(
                $request->ic_number,
                $request->passport_number,
                $request->mobile_primary
            );

            if (!$duplicateCheck['success']) {
                return response()->json($duplicateCheck, 422);
            }
        }

        DB::beginTransaction();

        try {
            // Extract DOB from IC if not provided
            $dateOfBirth = $request->date_of_birth;
            if (empty($dateOfBirth) && $request->id_type === 'ic' && !empty($request->ic_number)) {
                $dateOfBirth = Volunteer::extractDobFromIc($request->ic_number);
            }

            // Create volunteer data array
            $volunteerData = [
                'full_name' => $request->full_name,
                    'full_name_en' => $request->full_name_en,
                'gender' => $request->gender,
                'id_type' => $request->id_type,
                'ic_number' => $request->ic_number,
                'passport_number' => $request->passport_number,
                'date_of_birth' => $dateOfBirth,
                'marital_status' => $request->marital_status,
                'status' => 'pending_approval',
                'created_by' => auth()->id(),
            ];

            // Add Step 2 data
            if ($step === '2' || $step === 'complete') {
                $volunteerData = array_merge($volunteerData, [
                    'mobile_primary' => $request->mobile_primary,
                    'email' => $request->email,
                    'address' => $request->address,
                    'city' => $request->city,
                    'state' => $request->state,
                    'postal_code' => $request->postal_code,
                    'country' => $request->country ?? 'Malaysia',
                    'emergency_contact_name' => $request->emergency_contact_name,
                    'emergency_contact_relationship' => $request->emergency_contact_relationship,
                    'emergency_contact_phone' => $request->emergency_contact_phone,
                ]);
            }

            // Add Step 3 data
            if ($step === '3' || $step === 'complete') {
                $volunteerData = array_merge($volunteerData, [
                    'languages_spoken' => $request->languages_spoken,
                    'skills_strengths' => $request->skills_strengths,
                    'preferred_department_id' => $request->preferred_department_id,
                    'preferred_tasks' => $request->preferred_tasks,
                    'past_volunteer_experience' => $request->boolean('past_volunteer_experience', false),
                    'physical_limitations' => $request->physical_limitations,
                ]);
            }

            // Create volunteer record
            $volunteer = new Volunteer($volunteerData);
            $volunteer->save();

            // Log::info('Volunteer registration created', [
            //     'volunteer_id' => $volunteer->id,
            //     'volunteer_code' => $volunteer->volunteer_id,
            //     'name' => $volunteer->full_name
            // ]);

            // ============================================
            // DOCUMENT UPLOADS - Using same pattern as SpecialOccasionController
            // ============================================
            $templeId = $request->header('X-Temple-ID') ?? session('temple_id') ?? 'default';
            $documentsUploaded = 0;
            $uploadedDocuments = [];

            // Document types to process
            $documentTypes = [
                'ic_photostat' => 'IC Photostat',
                'passport_photo' => 'Passport Photo',
                'passport_photostat' => 'Passport Photostat',
            ];

            foreach ($documentTypes as $docType => $docLabel) {
                $document = null;

                // Try file upload first (FormData)
                if ($request->hasFile($docType)) {
                    $document = $this->uploadDocumentFile(
                        $request->file($docType),
                        $volunteer->id,
                        $docType,
                        $templeId
                    );
                }
                // Try base64 upload (like SpecialOccasionController)
                elseif ($request->filled("{$docType}_base64")) {
                    $document = $this->uploadDocumentBase64(
                        $request->input("{$docType}_base64"),
                        $volunteer->id,
                        $docType,
                        $templeId
                    );
                }

                if ($document) {
                    $documentsUploaded++;
                    $uploadedDocuments[] = [
                        'type' => $docType,
                        'id' => $document->id,
                        'file_name' => $document->file_name
                    ];
                    Log::info("{$docLabel} uploaded", ['document_id' => $document->id]);
                }
            }

     

            DB::commit();

            // Load relationships
            $volunteer->load('preferredDepartment', 'documents', 'approvalLogs');

            // Generate signed URLs for uploaded documents
            if ($volunteer->documents) {
                $volunteer->documents->transform(function ($document) {
                    $document->file_display_url = $this->getDocumentDisplayUrl($document);
                    return $document;
                });
            }

            return response()->json([
                'success' => true,
                'message' => 'Volunteer registration submitted successfully',
                'data' => $volunteer,
                'volunteer_id' => $volunteer->volunteer_id,
                'documents_uploaded' => $documentsUploaded,
                'uploaded_documents' => $uploadedDocuments,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Database error creating volunteer registration', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    } catch (\Exception $e) {
        Log::error('Error creating volunteer registration', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error creating volunteer registration',
            'error' => $e->getMessage(),
        ], 500);
    }
}
/**
 * Upload document from file (FormData)
 * Uses uploadSignature which handles both files and base64
 */
private function uploadDocumentFile($file, $volunteerId, $documentType, $templeId)
{
    try {
        // Validate file
        if (!$file || !$file->isValid()) {
            Log::error('Invalid file upload', ['type' => $documentType]);
            return null;
        }

        // Check file size (5MB max)
        if ($file->getSize() > 5 * 1024 * 1024) {
            Log::error('File too large', ['type' => $documentType, 'size' => $file->getSize()]);
            return null;
        }

        // Check MIME type
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            Log::error('Invalid file type', ['type' => $documentType, 'mime' => $file->getMimeType()]);
            return null;
        }

        // Upload using S3UploadService->uploadSignature() 
        // This method can handle UploadedFile objects!
        $folder = "volunteers/{$volunteerId}/documents";
        
        $uploadResult = $this->s3UploadService->uploadSignature(
            $file,           // UploadedFile object (uploadSignature handles this!)
            $folder,
            $templeId,
            $documentType
        );

        if (!$uploadResult['success']) {
            Log::error('S3 upload failed', [
                'type' => $documentType,
                'error' => $uploadResult['message'] ?? 'Unknown error'
            ]);
            return null;
        }

        Log::info('File uploaded to S3', [
            'volunteer_id' => $volunteerId,
            'document_type' => $documentType,
            'path' => $uploadResult['path']
        ]);

        // Create document record
        $document = VolunteerDocument::create([
            'volunteer_id' => $volunteerId,
            'document_type' => $documentType,
            'file_path' => $uploadResult['path'],
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $uploadResult['size'] ?? $file->getSize(),
            'mime_type' => $uploadResult['mime_type'] ?? $file->getMimeType(),
            'uploaded_at' => now(),
            'uploaded_by' => auth()->id(),
        ]);

        return $document;

    } catch (\Exception $e) {
        Log::error('Failed to upload document file', [
            'volunteer_id' => $volunteerId,
            'document_type' => $documentType,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}

/**
 * Upload document from base64 (like SpecialOccasionController)
 */
private function uploadDocumentBase64($base64Data, $volunteerId, $documentType, $templeId)
{
    try {
        if (empty($base64Data)) {
            return null;
        }

        $folder = "volunteers/{$volunteerId}/documents";

        // Use uploadSignature for base64 (exactly like SpecialOccasionController)
        $uploadResult = $this->s3UploadService->uploadSignature(
            $base64Data,
            $folder,
            $templeId,
            $documentType
        );

        if (!$uploadResult['success']) {
            Log::error('S3 base64 upload failed', [
                'type' => $documentType,
                'error' => $uploadResult['message'] ?? 'Unknown error'
            ]);
            return null;
        }

        Log::info('Base64 document uploaded to S3', [
            'volunteer_id' => $volunteerId,
            'document_type' => $documentType,
            'path' => $uploadResult['path']
        ]);

        // Determine original filename from mime type
        $extension = 'png';
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
            $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        } elseif (preg_match('/^data:application\/pdf;base64,/', $base64Data)) {
            $extension = 'pdf';
        }
        
        $fileName = "{$documentType}_" . now()->format('YmdHis') . ".{$extension}";

        // Create document record
        $document = VolunteerDocument::create([
            'volunteer_id' => $volunteerId,
            'document_type' => $documentType,
            'file_path' => $uploadResult['path'],
            'file_name' => $fileName,
            'file_size' => $uploadResult['size'] ?? 0,
            'mime_type' => $uploadResult['mime_type'] ?? "image/{$extension}",
            'uploaded_at' => now(),
            'uploaded_by' => auth()->id(),
        ]);

        return $document;

    } catch (\Exception $e) {
        Log::error('Failed to upload base64 document', [
            'volunteer_id' => $volunteerId,
            'document_type' => $documentType,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}

    /**
     * Update volunteer registration
     * Only allowed for pending_approval status
     * 
     * PUT /api/volunteers/registration/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $volunteer = Volunteer::findOrFail($id);

            // Only allow updates for pending volunteers
            if ($volunteer->status !== 'pending_approval') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending volunteers can be updated',
                ], 403);
            }

            // Validation (reuse store validation)
            $validator = Validator::make($request->all(), [
                'full_name' => 'sometimes|required|string|max:100',
                 'full_name_en' => 'nullable|string|max:100', 
                'gender' => 'sometimes|required|in:male,female,other',
                'id_type' => 'sometimes|required|in:ic,passport',
                'ic_number' => 'required_if:id_type,ic|nullable|string|max:20',
                'passport_number' => 'required_if:id_type,passport|nullable|string|max:20',
                'date_of_birth' => 'nullable|date',
                'marital_status' => 'nullable|in:single,married,divorced,widowed',
                'mobile_primary' => 'sometimes|required|string|max:20',
                'email' => 'nullable|email|max:100',
                'preferred_department_id' => 'nullable|uuid|exists:volunteer_departments,id',
                'preferred_tasks' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            // Update volunteer
            $volunteer->fill($request->except(['id', 'volunteer_id', 'status', 'approved_at', 'approved_by']));
            $volunteer->updated_by = auth()->id();
            $volunteer->save();

            DB::commit();

            $volunteer->load('preferredDepartment', 'documents', 'approvalLogs');

            return response()->json([
                'success' => true,
                'message' => 'Volunteer registration updated successfully',
                'data' => $volunteer,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating volunteer registration: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating volunteer registration',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete volunteer registration
     * Only allowed for pending or rejected status
     * 
     * DELETE /api/volunteers/registration/{id}
     */
    public function destroy($id)
    {
        try {
            $volunteer = Volunteer::findOrFail($id);

            // Only allow deletion for pending or rejected volunteers
            if (!in_array($volunteer->status, ['pending_approval', 'rejected'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete active or suspended volunteers',
                ], 403);
            }

            DB::beginTransaction();

            // Soft delete
            $volunteer->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Volunteer registration deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting volunteer registration: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting volunteer registration',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload document for volunteer (with S3 support)
     * 
     * POST /api/volunteers/registration/{id}/upload-document
     */
    public function uploadDocument(Request $request, $id)
    {
        try {
            $volunteer = Volunteer::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'document_type' => 'required|in:ic_photostat,passport_photo,passport_photostat,other',
                'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB max
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            // Store document using S3
            $document = VolunteerDocument::storeFile(
                $request->file('document'),
                $volunteer->id,
                $request->document_type
            );

            // Generate display URL with signed URL for immediate use
            $document->file_display_url = $this->getDocumentDisplayUrl($document);

            DB::commit();

            Log::info('Document uploaded successfully', [
                'volunteer_id' => $volunteer->id,
                'document_type' => $request->document_type,
                'document_id' => $document->id,
                'file_path' => $document->file_path
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $document,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error uploading document: ' . $e->getMessage(), [
                'volunteer_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error uploading document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete volunteer document
     * 
     * DELETE /api/volunteers/registration/{id}/documents/{documentId}
     */
    public function deleteDocument($id, $documentId)
    {
        try {
            $volunteer = Volunteer::findOrFail($id);
            $document = VolunteerDocument::where('volunteer_id', $volunteer->id)
                ->where('id', $documentId)
                ->firstOrFail();

            DB::beginTransaction();

            // Delete will trigger the model event to remove file from S3
            $document->delete();

            DB::commit();

            Log::info('Document deleted successfully', [
                'volunteer_id' => $volunteer->id,
                'document_id' => $documentId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check for duplicate IC/Passport/Mobile
     * 
     * POST /api/volunteers/registration/check-duplicate
     */
    public function checkDuplicate(Request $request)
    {
        try {
            $result = $this->checkDuplicates(
                $request->ic_number,
                $request->passport_number,
                $request->mobile_primary,
                $request->exclude_id
            );

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Error checking duplicates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error checking duplicates',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get registration statistics
     * 
     * GET /api/volunteers/registration/statistics/overview
     */
    public function statistics(Request $request)
    {
        try {
            $stats = [
                'total' => Volunteer::count(),
                'pending_approval' => Volunteer::pendingApproval()->count(),
                'active' => Volunteer::active()->count(),
                'rejected' => Volunteer::rejected()->count(),
                'suspended' => Volunteer::suspended()->count(),
                'inactive' => Volunteer::inactive()->count(),
            ];

            // This month registrations
            $stats['this_month'] = Volunteer::whereBetween('registered_at', [
                now()->startOfMonth(),
                now()->endOfMonth()
            ])->count();

            // This year registrations
            $stats['this_year'] = Volunteer::whereBetween('registered_at', [
                now()->startOfYear(),
                now()->endOfYear()
            ])->count();

            // By department
            $byDepartment = Volunteer::select('preferred_department_id', DB::raw('count(*) as count'))
                ->whereNotNull('preferred_department_id')
                ->groupBy('preferred_department_id')
                ->with('preferredDepartment:id,department_name')
                ->get();

            $stats['by_department'] = $byDepartment->map(function ($item) {
                return [
                    'department_id' => $item->preferred_department_id,
                    'department_name' => $item->preferredDepartment->department_name ?? 'Unknown',
                    'count' => $item->count,
                ];
            });

            // By gender
            $byGender = Volunteer::select('gender', DB::raw('count(*) as count'))
                ->groupBy('gender')
                ->get()
                ->pluck('count', 'gender');

            $stats['by_gender'] = $byGender;

            // Recent registrations
            $stats['recent'] = Volunteer::with('preferredDepartment:id,department_name')
                ->orderBy('registered_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($volunteer) {
                    return [
                        'id' => $volunteer->id,
                        'volunteer_id' => $volunteer->volunteer_id,
                        'full_name' => $volunteer->full_name,
                        'status' => $volunteer->status,
                        'registered_at' => $volunteer->registered_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper: Check for duplicates
     */
    private function checkDuplicates($icNumber, $passportNumber, $mobile, $excludeId = null)
    {
        $duplicates = [];

        // Check IC number
        if (!empty($icNumber)) {
            $existingIc = Volunteer::where('ic_number', $icNumber)
                ->when($excludeId, function ($q) use ($excludeId) {
                    $q->where('id', '!=', $excludeId);
                })
                ->first();

            if ($existingIc) {
                $duplicates[] = [
                    'field' => 'ic_number',
                    'value' => $icNumber,
                    'existing_volunteer' => [
                        'id' => $existingIc->id,
                        'volunteer_id' => $existingIc->volunteer_id,
                        'name' => $existingIc->full_name,
                        'status' => $existingIc->status,
                    ],
                ];
            }
        }

        // Check Passport number
        if (!empty($passportNumber)) {
            $existingPassport = Volunteer::where('passport_number', $passportNumber)
                ->when($excludeId, function ($q) use ($excludeId) {
                    $q->where('id', '!=', $excludeId);
                })
                ->first();

            if ($existingPassport) {
                $duplicates[] = [
                    'field' => 'passport_number',
                    'value' => $passportNumber,
                    'existing_volunteer' => [
                        'id' => $existingPassport->id,
                        'volunteer_id' => $existingPassport->volunteer_id,
                        'name' => $existingPassport->full_name,
                        'status' => $existingPassport->status,
                    ],
                ];
            }
        }

        // Check Mobile
        if (!empty($mobile)) {
            $existingMobile = Volunteer::where('mobile_primary', $mobile)
                ->when($excludeId, function ($q) use ($excludeId) {
                    $q->where('id', '!=', $excludeId);
                })
                ->first();

            if ($existingMobile) {
                $duplicates[] = [
                    'field' => 'mobile_primary',
                    'value' => $mobile,
                    'existing_volunteer' => [
                        'id' => $existingMobile->id,
                        'volunteer_id' => $existingMobile->volunteer_id,
                        'name' => $existingMobile->full_name,
                        'status' => $existingMobile->status,
                    ],
                ];
            }
        }

        if (!empty($duplicates)) {
            return [
                'success' => false,
                'message' => 'Duplicate entries found',
                'duplicates' => $duplicates,
            ];
        }

        return ['success' => true];
    }

    /**
     * Helper: Get document display URL with signed URL for S3
     */
    private function getDocumentDisplayUrl($document)
    {
        try {
            $filePath = $document->file_path;

            // Parse JSON if needed
            if (is_string($filePath)) {
                $fileData = json_decode($filePath, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $filePath = $fileData['path'] ?? $fileData['url'] ?? $filePath;
                }
            }

            // If already a URL, return it
            if (filter_var($filePath, FILTER_VALIDATE_URL)) {
                return $filePath;
            }

            // Generate signed URL for S3
            $signedUrl = $this->s3UploadService->getSignedUrl($filePath);

            Log::info('Generated signed URL for volunteer document', [
                'document_id' => $document->id,
                'file_path' => $filePath
            ]);

            return $signedUrl;
        } catch (\Exception $e) {
            Log::error('Failed to generate document display URL', [
                'document_id' => $document->id,
                'file_path' => $document->file_path ?? null,
                'error' => $e->getMessage()
            ]);

            // Fallback to file_url attribute
            return $document->file_url;
        }
    }


      public function getActiveVolunteers()
    {
        try {
            $volunteers = Volunteer::where('status', 'active')
                ->select([
                    'id',
                    'volunteer_id',
                    'full_name',
                    'mobile_primary',
                    'email',
                    'preferred_department_id',
                    'status'
                ])
                ->with('preferredDepartment:id,department_name')
                ->orderBy('full_name')
                ->get();

            Log::info('Active volunteers fetched', [
                'count' => $volunteers->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $volunteers
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching active volunteers: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active volunteers',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
    

}