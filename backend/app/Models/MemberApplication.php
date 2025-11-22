<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MemberApplication extends Model
{
    use HasUuids;

    protected $table = 'member_application';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        // Personal Information
        'temp_member_id',
        'created_by',
        'updated_by',
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

        // Member Type
        'member_type_id',

        // Professional Information
        'occupation',
        'qualification',
        'annual_income',

        // ID Proof
        'id_proof_type',
        'id_proof_number',
        'id_proof_document',
        'profile_photo',

        // NOTE: OLD referral fields removed from fillable
        // Now handled by member_application_referrals table

        // Payment Information
        'entry_fee_amount',
        'entry_fee_paid',
        'payment_method',
        'payment_reference',
        'payment_date',

        // Interview
        'interview_scheduled',
        'interview_date',
        'interview_notes',
        'interview_completed_at',
        'interview_conducted_by',

        // Status & Workflow
        'status',
        'submitted_at',
        'approved_by',
        'approved_at',
        'approved_by_committee',
        'approval_remarks',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'rejection_remarks',

        // Refund
        'refund_eligible',
        'refund_amount',
        'refund_method',
        'refund_processed',
        'refund_processed_by',
        'refund_date',
        'refund_reference',
        'refund_remarks',

        //Refferal Fields
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
        // Conversion
        'permanent_member_id',
        'converted_to_member_id',

        // Audit
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'entry_fee_paid' => 'boolean',
        'interview_scheduled' => 'boolean',
        'refund_eligible' => 'boolean',
        'refund_processed' => 'boolean',
        'payment_date' => 'date',
        'interview_date' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'interview_completed_at' => 'datetime',
        'refund_date' => 'date',
    ];

    // Relationships
    public function memberType()
    {
        return $this->belongsTo(MemberType::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    // NEW: Referrals relationship
    public function referrals()
    {
        return $this->hasMany(MemberApplicationReferral::class)->orderBy('sequence_number');
    }

    // Helper: Get verified referrals count
    public function getVerifiedReferralsCountAttribute()
    {
        return $this->referrals()->where('verified', true)->count();
    }

    // Helper: Check if all referrals verified
    public function getAllReferralsVerifiedAttribute()
    {
        $totalReferrals = $this->referrals()->count();
        if ($totalReferrals < 2)
            return false; // Minimum 2 required

        return $this->referrals()->where('verified', true)->count() === $totalReferrals;
    }
}