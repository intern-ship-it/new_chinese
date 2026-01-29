<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PagodaRegistrationPayment extends Model
{
    use HasUuids;

    protected $table = 'pagoda_registration_payments';
    
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'registration_id',
        'payment_date',
        'amount',
        'payment_mode_id',
        'payment_method',
        'payment_reference',
        'transaction_id',
        'payment_type',
        'payment_status',
        'payment_response',
        'notes',
        'created_by',
        'paid_through',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    /**
     * Get the registration associated with this payment
     */
    public function registration()
    {
        return $this->belongsTo(PagodaLightRegistration::class, 'registration_id');
    }

    /**
     * Get the payment mode
     */
    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class, 'payment_mode_id');
    }

    /**
     * Get the user who created this payment
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope: Pending payments
     */
    public function scopePending($query)
    {
        return $query->where('payment_status', 'PENDING');
    }

    /**
     * Scope: Successful payments
     */
    public function scopeSuccessful($query)
    {
        return $query->where('payment_status', 'SUCCESS');
    }

    /**
     * Scope: Failed payments
     */
    public function scopeFailed($query)
    {
        return $query->where('payment_status', 'FAILED');
    }

    /**
     * Check if payment is successful
     */
    public function isSuccessful(): bool
    {
        return $this->payment_status === 'SUCCESS';
    }

    /**
     * Check if payment is pending
     */
    public function isPending(): bool
    {
        return $this->payment_status === 'PENDING';
    }

    /**
     * Check if payment is failed
     */
    public function isFailed(): bool
    {
        return $this->payment_status === 'FAILED';
    }
}