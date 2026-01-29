<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SalesInvoicePayment extends Model
{
    use HasUuids;

    protected $table = 'sales_invoice_payments';

    /**
     * Payment Status Constants
     */
    const STATUS_PENDING = 'PENDING';
    const STATUS_SUCCESS = 'SUCCESS';
    const STATUS_FAILED = 'FAILED';
    const STATUS_CANCELLED = 'CANCELLED';

    protected $fillable = [
        'invoice_id',
        'payment_date',
        'payment_mode_id',
        'amount',
        'reference_number',
        'bank_name',
        'bank_branch',
        'cheque_date',
        'payment_status',      // NEW: For payment gateway tracking
        'transaction_id',      // NEW: FIUU transaction ID
        'payment_response',    // NEW: Full FIUU response
        'notes',
        'created_by',
        'payment_reference_number'
    ];

    protected $casts = [
        'payment_date' => 'date:Y-m-d',
        'cheque_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    /**
     * Boot method - set default payment_status
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->payment_status)) {
                $model->payment_status = self::STATUS_SUCCESS;
            }
        });
    }

    // =====================
    // RELATIONSHIPS
    // =====================

    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class, 'invoice_id');
    }

    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // =====================
    // STATUS HELPERS
    // =====================

    /**
     * Check if payment is successful
     */
    public function isSuccessful()
    {
        return $this->payment_status === self::STATUS_SUCCESS;
    }

    /**
     * Check if payment is pending
     */
    public function isPending()
    {
        return $this->payment_status === self::STATUS_PENDING;
    }

    /**
     * Check if payment is failed
     */
    public function isFailed()
    {
        return $this->payment_status === self::STATUS_FAILED;
    }

    /**
     * Mark payment as successful
     */
    public function markAsSuccess($transactionId = null, $response = null)
    {
        $updateData = [
            'payment_status' => self::STATUS_SUCCESS,
        ];

        if ($transactionId) {
            $updateData['transaction_id'] = $transactionId;
        }

        if ($response) {
            $updateData['payment_response'] = is_array($response) ? json_encode($response) : $response;
        }

        return $this->update($updateData);
    }

    /**
     * Mark payment as failed
     */
    public function markAsFailed($response = null, $notes = null)
    {
        $updateData = [
            'payment_status' => self::STATUS_FAILED,
        ];

        if ($response) {
            $updateData['payment_response'] = is_array($response) ? json_encode($response) : $response;
        }

        if ($notes) {
            $updateData['notes'] = $notes;
        }

        return $this->update($updateData);
    }

    // =====================
    // SCOPES
    // =====================

    /**
     * Scope: Filter by status
     */
    public function scopeOfStatus($query, $status)
    {
        return $query->where('payment_status', $status);
    }

    /**
     * Scope: Get successful payments
     */
    public function scopeSuccessful($query)
    {
        return $query->where('payment_status', self::STATUS_SUCCESS);
    }

    /**
     * Scope: Get pending payments
     */
    public function scopePending($query)
    {
        return $query->where('payment_status', self::STATUS_PENDING);
    }

    /**
     * Scope: Get failed payments
     */
    public function scopeFailed($query)
    {
        return $query->where('payment_status', self::STATUS_FAILED);
    }
}