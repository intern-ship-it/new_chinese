<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MemberApplicationReferral extends Model
{
    use HasUuids;

    protected $table = 'member_application_referrals';

    // ✅ ADD THIS: Dynamic connection like other tenant models
    protected $connection = null; // Will be set dynamically

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'member_application_id',
        'sequence_number',
        'referral_name',
        'referral_member_id',
        'referral_user_id',
        'verified',
        'verified_at',
        'verified_by',
        'verification_notes',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    // Relationships
    public function memberApplication()
    {
        return $this->belongsTo(MemberApplication::class);
    }

    public function referralUser()
    {
        return $this->belongsTo(User::class, 'referral_user_id');
    }

    public function verifiedByUser()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ✅ ADD THIS: Set connection dynamically based on parent application
    public function setConnection($name)
    {
        $this->connection = $name;
        return $this;
    }
}