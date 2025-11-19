<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MemberType extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'is_paid',
        'subscription_amount',
        'subscription_period',
        'benefits',
        'restrictions',
        'priority_level',
        'is_default',
        'is_deletable',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'is_default' => 'boolean',
        'is_deletable' => 'boolean',
        'is_active' => 'boolean',
        'subscription_amount' => 'decimal:2',
        'subscription_period' => 'integer',
        'priority_level' => 'integer',
        'benefits' => 'json',
        'restrictions' => 'json'
    ];

    public function memberDetails()
    {
        return $this->hasMany(MemberDetail::class, 'member_type_id');
    }

    public function subscriptions()
    {
        return $this->hasMany(MemberSubscription::class, 'member_type_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}