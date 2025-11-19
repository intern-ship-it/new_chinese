<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MemberDetail extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'member_code',
        'member_type',
        'member_type_id', // New field
        'membership_date',
        'valid_until',
        'referred_by',
        'family_head_id',
        'occupation',
        'annual_income',
        'qualification',
        'subscription_start_date', // New field
        'subscription_end_date', // New field
        'subscription_status', // New field
        'is_active'
    ];

    protected $casts = [
        'membership_date' => 'date:Y-m-d',
        'valid_until' => 'date:Y-m-d',
        'subscription_start_date' => 'date:Y-m-d',
        'subscription_end_date' => 'date:Y-m-d',
        'is_active' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function memberType()
    {
        return $this->belongsTo(MemberType::class, 'member_type_id');
    }

    public function referredBy()
    {
        return $this->belongsTo(User::class, 'referred_by');
    }

    public function familyHead()
    {
        return $this->belongsTo(User::class, 'family_head_id');
    }

    public function subscriptions()
    {
        return $this->hasMany(MemberSubscription::class, 'user_id', 'user_id');
    }

    public function hasActiveSubscription()
    {
        if (!$this->member_type_id) {
            return true; // Normal members don't need subscription
        }

        if (!$this->memberType || !$this->memberType->is_paid) {
            return true; // Free membership
        }

        if ($this->subscription_status !== 'ACTIVE') {
            return false;
        }

        if ($this->subscription_end_date && $this->subscription_end_date->isPast()) {
            return false;
        }

        return true;
    }
}