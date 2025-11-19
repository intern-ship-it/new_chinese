<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MemberSubscription extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'member_type_id',
        'start_date',
        'end_date',
        'amount_paid',
        'payment_reference',
        'payment_date',
        'status',
        'created_by'
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'payment_date' => 'datetime',
        'amount_paid' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function memberType()
    {
        return $this->belongsTo(MemberType::class, 'member_type_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive()
    {
        if ($this->status !== 'ACTIVE') {
            return false;
        }

        if ($this->end_date && $this->end_date->isPast()) {
            return false;
        }

        return true;
    }
}