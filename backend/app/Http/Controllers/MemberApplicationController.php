<?php

namespace App\Http\Controllers;

use App\Models\MemberApplication;
use App\Models\User;
use App\Models\MemberDetail;
use App\Models\MemberType;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\MemberApplicationReferral;

class MemberApplicationController extends Controller
{
    protected $s3Service;

    public function __construct(S3UploadService $s3Service)
    {
        $this->s3Service = $s3Service;
    }

    /**
     * Get all applications with filters
     */
    public function index(Request $request)
    {
        try {
            $query = MemberApplication::with(['memberType', 'createdBy']);

            // Search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%")
                        ->orWhere('temp_member_id', 'ilike', "%{$search}%")
                        ->orWhere('mobile_no', 'ilike', "%{$search}%");
                });
            }

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Member type filter
            if ($request->has('member_type_id') && $request->member_type_id) {
                $query->where('member_type_id', $request->member_type_id);
            }

            // Referral verification filter
            if ($request->has('referral_verified') && $request->referral_verified) {
                switch ($request->referral_verified) {
                    case 'verified':
                        $query->where('referral_1_verified', true)
                            ->where('referral_2_verified', true);
                        break;
                    case 'partial':
                        $query->where(function ($q) {
                            $q->where(function ($q2) {
                                $q2->where('referral_1_verified', true)
                                    ->where('referral_2_verified', false);
                            })->orWhere(function ($q2) {
                                $q2->where('referral_1_verified', false)
                                    ->where('referral_2_verified', true);
                            });
                        });
                        break;
                    case 'not_verified':
                        $query->where('referral_1_verified', false)
                            ->where('referral_2_verified', false);
                        break;
                }
            }

            // Date range filter
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Sort by created date (newest first)
            $query->orderBy('created_at', 'desc');

            // Paginate
            $perPage = $request->per_page ?? 20;
            $applications = $query->paginate($perPage);

            // Transform data to include signed URLs for images
            $applications->getCollection()->transform(function ($app) {
                return $this->transformApplication($app);
            });

            return $this->successResponse($applications, 'Applications retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Error fetching applications: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve applications: ' . $e->getMessage());
        }
    }

    /**
     * Get application statistics
     */
    public function statistics(Request $request)
    {
        try {
            $stats = [
                'total' => MemberApplication::count(),
                'pending' => MemberApplication::whereIn('status', [
                    'PENDING_SUBMISSION',
                    'SUBMITTED',
                    'UNDER_VERIFICATION',
                    'INTERVIEW_SCHEDULED',
                    'PENDING_APPROVAL'
                ])->count(),
                'approved' => MemberApplication::where('status', 'APPROVED')->count(),
                'rejected' => MemberApplication::where('status', 'REJECTED')->count(),
                'under_verification' => MemberApplication::where('status', 'UNDER_VERIFICATION')->count(),
                'interview_scheduled' => MemberApplication::where('status', 'INTERVIEW_SCHEDULED')->count(),
            ];

            return $this->successResponse($stats, 'Statistics retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get single application by ID
     */
    public function show($id)
    {
        try {
            $application = MemberApplication::with([
                'memberType',
                'createdBy',
                'approvedBy',
                'rejectedBy',
                'referrals.referralUser', // Load referrals
            ])->findOrFail($id);

            $transformed = $this->transformApplication($application);

            return $this->successResponse($transformed, 'Application retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('Error fetching application: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve application: ' . $e->getMessage());
        }
    }
    /**
     * Create new application
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'mobile_code' => 'nullable|string|max:10',
            'mobile_no' => 'required|string|max:20',

            // Dynamic referrals validation
            'referrals' => 'required|array|min:2', // Minimum 2 referrals
            'referrals.*.referral_name' => 'required|string|max:255',
            'referrals.*.referral_member_id' => 'required|string|max:100',
            'referrals.*.referral_user_id' => 'required|uuid|exists:users,id',

            // Documents
            'id_proof_document' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            'profile_photo' => 'image|mimes:jpg,jpeg,png|max:2048',

            // Payment
            'payment_method' => 'nullable|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'payment_date' => 'nullable|date',
            'entry_fee_amount' => 'nullable|numeric',
            'entry_fee_paid' => 'nullable|boolean',
            'status' => 'nullable|in:PENDING_SUBMISSION,SUBMITTED',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            // Generate temporary member ID
            $tempId = $this->generateTempMemberId();

            // Get data without referrals and files
            $data = $request->except(['referrals', 'id_proof_document', 'profile_photo']);
            $data['temp_member_id'] = $tempId;
            $data['created_by'] = Auth::id();

            // Set entry fee
            if (!isset($data['entry_fee_amount'])) {
                $data['entry_fee_amount'] = 51.00;
            }

            // Set submission time if status is SUBMITTED
            if ($request->status === 'SUBMITTED') {
                $data['entry_fee_paid'] = true;
                $data['submitted_at'] = Carbon::now();
            }

            // Create application
            $application = MemberApplication::create($data);

            // Upload documents
            if ($request->hasFile('id_proof_document')) {
                $documentPath = $this->s3Service->uploadFile(
                    $request->file('id_proof_document'),
                    'member-applications/documents'
                );
                $application->id_proof_document = $documentPath;
            }

            if ($request->hasFile('profile_photo')) {
                $photoPath = $this->s3Service->uploadFile(
                    $request->file('profile_photo'),
                    'member-applications/photos'
                );
                $application->profile_photo = $photoPath;
            }

            $application->save();

            // IMPORTANT: Create referrals
            $referrals = $request->input('referrals', []);
            foreach ($referrals as $index => $referralData) {
                MemberApplicationReferral::create([
                    'member_application_id' => $application->id,
                    'sequence_number' => $index + 1,
                    'referral_name' => $referralData['referral_name'],
                    'referral_member_id' => $referralData['referral_member_id'],
                    'referral_user_id' => $referralData['referral_user_id'],
                    'verified' => true, // Auto-verified since user_id provided
                    'verified_at' => Carbon::now(),
                    'verified_by' => Auth::id(),
                ]);
            }

            DB::commit();

            // Load relationships for response
            $application->load('referrals.referralUser');
            $transformed = $this->transformApplication($application);

            return $this->successResponse($transformed, 'Application created successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating application: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());

            $errorMessage = 'Failed to create application';
            if (config('app.debug')) {
                $errorMessage .= ': ' . $e->getMessage();
            }

            return $this->errorResponse($errorMessage, 500);
        }
    }

    /**
     * Update application
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255',
            'mobile_no' => 'sometimes|required|string|max:20',
            // Add other validation rules as needed
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            // Only allow updates if not approved or rejected
            if (in_array($application->status, ['APPROVED', 'REJECTED'])) {
                return $this->errorResponse('Cannot update approved or rejected applications');
            }

            $data = $request->except(['id_proof_document', 'profile_photo', 'temp_member_id']);
            $data['updated_by'] = Auth::id();

            // Handle document uploads
            if ($request->hasFile('id_proof_document')) {
                // Delete old document if exists
                if ($application->id_proof_document) {
                    $this->s3Service->deleteFile($application->id_proof_document);
                }
                $documentPath = $this->s3Service->uploadFile(
                    $request->file('id_proof_document'),
                    'member-applications/documents'
                );
                $data['id_proof_document'] = $documentPath;
            }

            if ($request->hasFile('profile_photo')) {
                // Delete old photo if exists
                if ($application->profile_photo) {
                    $this->s3Service->deleteFile($application->profile_photo);
                }
                $photoPath = $this->s3Service->uploadFile(
                    $request->file('profile_photo'),
                    'member-applications/photos'
                );
                $data['profile_photo'] = $photoPath;
            }

            $application->update($data);

            DB::commit();

            $transformed = $this->transformApplication($application->fresh(['memberType', 'createdBy']));

            return $this->successResponse($transformed, 'Application updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating application: ' . $e->getMessage());
            return $this->errorResponse('Failed to update application: ' . $e->getMessage());
        }
    }

    /**
     * Validate referral member
     */
    public function validateReferral(Request $request)
    {
        try {
            $memberId = $request->member_id;

            $user = User::where('user_type', 'MEMBER')
                ->where('is_active', true)
                ->where(function ($query) use ($memberId) {
                    $query->whereHas('memberDetail', function ($q) use ($memberId) {
                        $q->where('member_code', $memberId);
                    })->orWhere('id_proof_number', $memberId);
                })
                ->with('memberDetail')
                ->first();

            if ($user) {
                return $this->successResponse([
                    'valid' => true,
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'member_code' => $user->memberDetail->member_code ?? null,
                ], 'Referral is valid');
            }

            return $this->successResponse([
                'valid' => false,
            ], 'Invalid or inactive member');
        } catch (\Exception $e) {
            \Log::error('Error validating referral: ' . $e->getMessage());
            return $this->errorResponse('Failed to validate referral: ' . $e->getMessage());
        }
    }

    /**
     * Verify referral
     */
    public function verifyReferral(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'referral_id' => 'required|uuid|exists:member_application_referrals,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);
            $referral = MemberApplicationReferral::where('id', $request->referral_id)
                ->where('member_application_id', $id)
                ->firstOrFail();

            // Update verification status
            $referral->verified = true;
            $referral->verified_at = Carbon::now();
            $referral->verified_by = Auth::id();
            $referral->verification_notes = $request->notes;
            $referral->save();

            // Update application status if all referrals verified
            if ($application->all_referrals_verified) {
                $application->status = 'UNDER_VERIFICATION';
                $application->save();
            }

            DB::commit();

            $application->load('referrals.referralUser');
            $transformed = $this->transformApplication($application);

            return $this->successResponse($transformed, 'Referral verified successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error verifying referral: ' . $e->getMessage());
            return $this->errorResponse('Failed to verify referral: ' . $e->getMessage());
        }
    }
    /**
     * Schedule interview
     */
    public function scheduleInterview(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'interview_date' => 'required|date',
            'interview_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            $application->interview_scheduled = true;
            $application->interview_date = $request->interview_date;
            $application->interview_notes = $request->interview_notes;
            $application->status = 'INTERVIEW_SCHEDULED';
            $application->updated_by = Auth::id();
            $application->save();

            DB::commit();

            $transformed = $this->transformApplication($application->fresh());

            return $this->successResponse($transformed, 'Interview scheduled successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error scheduling interview: ' . $e->getMessage());
            return $this->errorResponse('Failed to schedule interview: ' . $e->getMessage());
        }
    }

    /**
     * Complete interview
     */
    public function completeInterview(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'interview_notes' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            $application->interview_completed_at = Carbon::now();
            $application->interview_conducted_by = Auth::id();
            $application->interview_notes = $request->interview_notes;
            $application->status = 'PENDING_APPROVAL';
            $application->updated_by = Auth::id();
            $application->save();

            DB::commit();

            $transformed = $this->transformApplication($application->fresh());

            return $this->successResponse($transformed, 'Interview completed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error completing interview: ' . $e->getMessage());
            return $this->errorResponse('Failed to complete interview: ' . $e->getMessage());
        }
    }

    /**
     * Approve application
     */
    public function approve(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'approved_by_committee' => 'required|string',
            'approval_remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            // Generate permanent member ID: MBR-YYYY-XXXX
            $permanentId = $this->generatePermanentMemberId();

            // Create user account
            $user = User::create([
                'username' => $this->generateUsername($application->email),
                'name' => $application->name,
                'email' => $application->email,
                'password' => bcrypt(bin2hex(random_bytes(8))), // Random password
                'user_type' => 'MEMBER',
                'mobile_code' => $application->mobile_code,
                'mobile_no' => $application->mobile_no,
                'alternate_mobile' => $application->alternate_mobile,
                'address' => $application->address,
                'city' => $application->city,
                'state' => $application->state,
                'country' => $application->country,
                'pincode' => $application->pincode,
                'date_of_birth' => $application->date_of_birth,
                'gender' => $application->gender,
                'id_proof_type' => $application->id_proof_type,
                'id_proof_number' => $application->id_proof_number,
                'id_proof_document' => $application->id_proof_document,
                'profile_photo' => $application->profile_photo,
                'is_active' => true,
                'is_verified' => true,
            ]);

            // Create member details
            MemberDetail::create([
                'user_id' => $user->id,
                'member_code' => $permanentId,
                'member_type_id' => $application->member_type_id,
                'membership_date' => Carbon::now(),
                'referred_by' => $application->referral_1_user_id, // Use first referral
                'occupation' => $application->occupation,
                'qualification' => $application->qualification,
                'annual_income' => $application->annual_income,
            ]);

            // Update application
            $application->status = 'APPROVED';
            $application->approved_by = Auth::id();
            $application->approved_at = Carbon::now();
            $application->approved_by_committee = $request->approved_by_committee;
            $application->approval_remarks = $request->approval_remarks;
            $application->permanent_member_id = $permanentId;
            $application->converted_to_member_id = $user->id;
            $application->updated_by = Auth::id();
            $application->save();

            DB::commit();

            $transformed = $this->transformApplication($application->fresh());

            return $this->successResponse($transformed, 'Application approved successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving application: ' . $e->getMessage());
            return $this->errorResponse('Failed to approve application: ' . $e->getMessage());
        }
    }

    /**
     * Reject application
     */
    public function reject(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string',
            'rejection_remarks' => 'required|string',
            'refund_eligible' => 'required|boolean',
            'refund_amount' => 'required_if:refund_eligible,true|nullable|numeric',
            'refund_method' => 'required_if:refund_eligible,true|nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            $application->status = 'REJECTED';
            $application->rejected_by = Auth::id();
            $application->rejected_at = Carbon::now();
            $application->rejection_reason = $request->rejection_reason;
            $application->rejection_remarks = $request->rejection_remarks;
            $application->refund_eligible = $request->refund_eligible;

            if ($request->refund_eligible) {
                $application->refund_amount = $request->refund_amount;
                $application->refund_method = $request->refund_method;
            }

            $application->updated_by = Auth::id();
            $application->save();

            DB::commit();

            $transformed = $this->transformApplication($application->fresh());

            return $this->successResponse($transformed, 'Application rejected successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting application: ' . $e->getMessage());
            return $this->errorResponse('Failed to reject application: ' . $e->getMessage());
        }
    }

    /**
     * Process refund
     */
    public function processRefund(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'refund_date' => 'required|date',
            'refund_reference' => 'required|string',
            'refund_remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            if (!$application->refund_eligible) {
                return $this->errorResponse('Application is not eligible for refund');
            }

            $application->refund_processed = true;
            $application->refund_processed_by = Auth::id();
            $application->refund_date = $request->refund_date;
            $application->refund_reference = $request->refund_reference;
            $application->refund_remarks = $request->refund_remarks;
            $application->updated_by = Auth::id();
            $application->save();

            DB::commit();

            $transformed = $this->transformApplication($application->fresh());

            return $this->successResponse($transformed, 'Refund processed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing refund: ' . $e->getMessage());
            return $this->errorResponse('Failed to process refund: ' . $e->getMessage());
        }
    }

    /**
     * Change application status
     */
    public function changeStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:PENDING_SUBMISSION,SUBMITTED,UNDER_VERIFICATION,INTERVIEW_SCHEDULED,PENDING_APPROVAL,APPROVED,REJECTED',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);
            $application->status = $request->status;
            $application->updated_by = Auth::id();
            $application->save();

            DB::commit();

            $transformed = $this->transformApplication($application->fresh());

            return $this->successResponse($transformed, 'Status updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error changing status: ' . $e->getMessage());
            return $this->errorResponse('Failed to change status: ' . $e->getMessage());
        }
    }

    /**
     * Delete application
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $application = MemberApplication::findOrFail($id);

            // Only allow deletion of draft or rejected applications
            if (!in_array($application->status, ['PENDING_SUBMISSION', 'REJECTED'])) {
                return $this->errorResponse('Cannot delete application with current status');
            }

            // Delete uploaded files
            if ($application->id_proof_document) {
                $this->s3Service->deleteFile($application->id_proof_document);
            }
            if ($application->profile_photo) {
                $this->s3Service->deleteFile($application->profile_photo);
            }

            $application->delete();

            DB::commit();

            return $this->successResponse(null, 'Application deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting application: ' . $e->getMessage());
            return $this->errorResponse('Failed to delete application: ' . $e->getMessage());
        }
    }

    /**
     * Generate temporary member ID
     */
    private function generateTempMemberId()
    {
        $year = date('Y');
        $prefix = "TMP-{$year}-";

        // Get last temp ID for current year
        $lastApp = MemberApplication::where('temp_member_id', 'like', "{$prefix}%")
            ->orderBy('temp_member_id', 'desc')
            ->first();

        if ($lastApp) {
            $lastNumber = (int) substr($lastApp->temp_member_id, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate permanent member ID
     */
    private function generatePermanentMemberId()
    {
        $year = date('Y');
        $prefix = "MBR-{$year}-";

        // Get last member code
        $lastMember = MemberDetail::where('member_code', 'like', "{$prefix}%")
            ->orderBy('member_code', 'desc')
            ->first();

        if ($lastMember) {
            $lastNumber = (int) substr($lastMember->member_code, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate username from email
     */
    private function generateUsername($email)
    {
        $username = strtolower(explode('@', $email)[0]);
        $username = preg_replace('/[^a-z0-9.]/', '', $username);

        // Check if username exists
        $existingCount = User::where('username', 'like', "{$username}%")->count();

        if ($existingCount > 0) {
            $username .= '.' . ($existingCount + 1);
        }

        return $username;
    }

    /**
     * Transform application data
     */
    private function transformApplication($application)
    {
        $data = $application->toArray();

        // Get signed URLs for documents
        if ($application->id_proof_document) {
            $data['id_proof_document'] = $this->s3Service->getSignedUrl($application->id_proof_document);
        }

        if ($application->profile_photo) {
            $data['profile_photo'] = $this->s3Service->getSignedUrl($application->profile_photo);
        }

        // Include referrals in response
        if ($application->relationLoaded('referrals')) {
            $data['referrals'] = $application->referrals->toArray();
        }

        return $data;
    }

    /**
     * Success response
     */
    private function successResponse($data, $message = 'Success', $code = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $code);
    }

    /**
     * Error response
     */
    private function errorResponse($message, $code = 400)
    {
        return response()->json([
            'success' => false,
            'message' => $message
        ], $code);
    }

    /**
     * Validation error response
     */
    private function validationErrorResponse($errors, $code = 422)
    {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $errors
        ], $code);
    }
}