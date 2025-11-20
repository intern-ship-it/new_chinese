<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MemberApplication extends Model
{
    use HasUuids;

    protected $table = 'member_application';

    protected $fillable = [
        'temp_member_id',
        'name',
        'email',
        'mobile_code',
        'mobile_no',
        'alternate_mobile',
        'date_of_birth',
        'gender',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'id_proof_type',
        'id_proof_number',
        'id_proof_document',
        'profile_photo',
        'member_type_id',
        'occupation',
        'qualification',
        'annual_income',
        'referral_1_name',
        'referral_1_member_id',
        'referral_1_user_id',
        'referral_1_verified',
        'referral_1_verified_at',
        'referral_1_verified_by',
        'referral_2_name',
        'referral_2_member_id',
        'referral_2_user_id',
        'referral_2_verified',
        'referral_2_verified_at',
        'referral_2_verified_by',
        'entry_fee_amount',
        'entry_fee_paid',
        'payment_reference',
        'payment_date',
        'payment_method',
        'status',
        'interview_scheduled',
        'interview_date',
        'interview_notes',
        'interview_conducted_by',
        'interview_completed_at',
        'approved_by',
        'approved_at',
        'approval_remarks',
        'approved_by_committee',
        'permanent_member_id',
        'converted_to_member_id',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'rejection_remarks',
        'refund_eligible',
        'refund_amount',
        'refund_processed',
        'refund_processed_by',
        'refund_method',
        'refund_date',
        'refund_reference',
        'refund_remarks',
        'submitted_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'payment_date' => 'date',
        'refund_date' => 'date',
        'interview_date' => 'datetime',
        'interview_completed_at' => 'datetime',
        'referral_1_verified_at' => 'datetime',
        'referral_2_verified_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'submitted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'referral_1_verified' => 'boolean',
        'referral_2_verified' => 'boolean',
        'entry_fee_paid' => 'boolean',
        'interview_scheduled' => 'boolean',
        'refund_eligible' => 'boolean',
        'refund_processed' => 'boolean',
        'entry_fee_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
    ];

    /**
     * Relationships
     */

    // Member Type
    public function memberType()
    {
        return $this->belongsTo(MemberType::class, 'member_type_id');
    }

    // Created By
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Updated By
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Approved By
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Rejected By
    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    // Referral 1 User
    public function referral1User()
    {
        return $this->belongsTo(User::class, 'referral_1_user_id');
    }

    // Referral 2 User
    public function referral2User()
    {
        return $this->belongsTo(User::class, 'referral_2_user_id');
    }

    // Interview Conducted By
    public function interviewConductedBy()
    {
        return $this->belongsTo(User::class, 'interview_conducted_by');
    }

    // Refund Processed By
    public function refundProcessedBy()
    {
        return $this->belongsTo(User::class, 'refund_processed_by');
    }

    // Converted Member
    public function convertedMember()
    {
        return $this->belongsTo(User::class, 'converted_to_member_id');
    }

    // Referral 1 Verified By
    public function referral1VerifiedBy()
    {
        return $this->belongsTo(User::class, 'referral_1_verified_by');
    }

    // Referral 2 Verified By
    public function referral2VerifiedBy()
    {
        return $this->belongsTo(User::class, 'referral_2_verified_by');
    }

    /**
     * Scopes
     */

    // Scope for pending applications
    public function scopePending($query)
    {
        return $query->whereIn('status', [
            'PENDING_SUBMISSION',
            'SUBMITTED',
            'UNDER_VERIFICATION',
            'INTERVIEW_SCHEDULED',
            'PENDING_APPROVAL'
        ]);
    }

    // Scope for approved applications
    public function scopeApproved($query)
    {
        return $query->where('status', 'APPROVED');
    }

    // Scope for rejected applications
    public function scopeRejected($query)
    {
        return $query->where('status', 'REJECTED');
    }

    // Scope for submitted applications
    public function scopeSubmitted($query)
    {
        return $query->where('status', '!=', 'PENDING_SUBMISSION');
    }

    // Scope for referrals verified
    public function scopeReferralsVerified($query)
    {
        return $query->where('referral_1_verified', true)
            ->where('referral_2_verified', true);
    }

    // Scope for pending refund
    public function scopePendingRefund($query)
    {
        return $query->where('refund_eligible', true)
            ->where('refund_processed', false);
    }

    /**
     * Accessors & Mutators
     */

    // Get full name attribute
    public function getFullNameAttribute()
    {
        return $this->name;
    }

    // Get full mobile attribute
    public function getFullMobileAttribute()
    {
        return ($this->mobile_code ?? '') . ' ' . $this->mobile_no;
    }

    // Get full address attribute
    public function getFullAddressAttribute()
    {
        $parts = array_filter([
            $this->address,
            $this->city,
            $this->state,
            $this->country,
            $this->pincode
        ]);

        return implode(', ', $parts);
    }

    // Get status label
    public function getStatusLabelAttribute()
    {
        $labels = [
            'PENDING_SUBMISSION' => 'Draft',
            'SUBMITTED' => 'Submitted',
            'UNDER_VERIFICATION' => 'Under Verification',
            'INTERVIEW_SCHEDULED' => 'Interview Scheduled',
            'PENDING_APPROVAL' => 'Pending Approval',
            'APPROVED' => 'Approved',
            'REJECTED' => 'Rejected',
        ];

        return $labels[$this->status] ?? $this->status;
    }

    // Check if both referrals are verified
    public function getReferralsVerifiedAttribute()
    {
        return $this->referral_1_verified && $this->referral_2_verified;
    }

    // Check if can be approved
    public function getCanApproveAttribute()
    {
        return in_array($this->status, ['PENDING_APPROVAL', 'INTERVIEW_SCHEDULED'])
            && $this->referrals_verified
            && $this->entry_fee_paid;
    }

    // Check if can be rejected
    public function getCanRejectAttribute()
    {
        return !in_array($this->status, ['APPROVED', 'REJECTED']);
    }

    /**
     * Methods
     */

    // Check if application is editable
    public function isEditable()
    {
        return in_array($this->status, ['PENDING_SUBMISSION', 'SUBMITTED']);
    }

    // Check if application is deletable
    public function isDeletable()
    {
        return in_array($this->status, ['PENDING_SUBMISSION', 'REJECTED']);
    }

    // Check if referral can be verified
    public function canVerifyReferral($referralNumber)
    {
        $field = "referral_{$referralNumber}_verified";
        return !$this->$field && in_array($this->status, ['SUBMITTED', 'UNDER_VERIFICATION']);
    }

    // Check if interview can be scheduled
    public function canScheduleInterview()
    {
        return !$this->interview_scheduled
            && $this->referrals_verified
            && in_array($this->status, ['UNDER_VERIFICATION', 'PENDING_APPROVAL']);
    }

    // Check if interview can be completed
    public function canCompleteInterview()
    {
        return $this->interview_scheduled
            && !$this->interview_completed_at
            && $this->status === 'INTERVIEW_SCHEDULED';
    }

    // Get workflow progress percentage
    public function getWorkflowProgress()
    {
        $steps = [
            'PENDING_SUBMISSION' => 0,
            'SUBMITTED' => 20,
            'UNDER_VERIFICATION' => 40,
            'INTERVIEW_SCHEDULED' => 60,
            'PENDING_APPROVAL' => 80,
            'APPROVED' => 100,
            'REJECTED' => 100,
        ];

        return $steps[$this->status] ?? 0;
    }

    // Get next workflow step
    public function getNextStep()
    {
        $steps = [
            'PENDING_SUBMISSION' => 'Submit Application',
            'SUBMITTED' => 'Verify Referrals',
            'UNDER_VERIFICATION' => 'Schedule Interview',
            'INTERVIEW_SCHEDULED' => 'Complete Interview',
            'PENDING_APPROVAL' => 'Approve/Reject',
            'APPROVED' => 'Completed',
            'REJECTED' => 'Completed',
        ];

        return $steps[$this->status] ?? 'Unknown';
    }
}