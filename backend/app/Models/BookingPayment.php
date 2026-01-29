<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
class BookingPayment extends Model
{
    protected $table = 'booking_payments';
    
    // Note: This table uses bigint auto-increment ID, not UUID
    protected $keyType = 'integer';
    public $incrementing = true;
    public $timestamps = true;

    protected $fillable = [
        'booking_id',
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
        'paid_through',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Payment Status Constants
     */
    const STATUS_PENDING = 'PENDING';
    const STATUS_SUCCESS = 'SUCCESS';
    const STATUS_FAILED = 'FAILED';
    const STATUS_CANCELLED = 'CANCELLED';

    /**
     * Payment Type Constants
     */
    const TYPE_FULL = 'FULL';
    const TYPE_SPLIT = 'SPLIT';
	
	/**
     * Paid Through Constants
     */
    const PAID_THROUGH_ADMIN = 'ADMIN';
    const PAID_THROUGH_COUNTER = 'COUNTER';
    const PAID_THROUGH_APP = 'APP';
    const PAID_THROUGH_KIOSK = 'KIOSK';
    const PAID_THROUGH_ONLINE = 'ONLINE';

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class, 'payment_mode_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope: Filter by payment status
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('payment_status', $status);
    }

    /**
     * Scope: Filter successful payments
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSuccessful($query)
    {
        return $query->where('payment_status', self::STATUS_SUCCESS);
    }

    /**
     * Scope: Filter pending payments
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePending($query)
    {
        return $query->where('payment_status', self::STATUS_PENDING);
    }

    /**
     * Scope: Filter by payment type
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('payment_type', $type);
    }

    /**
     * Scope: Filter by date range
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $from
     * @param string $to
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('payment_date', [$from, $to]);
    }

    /**
     * Check if payment is successful
     *
     * @return bool
     */
    public function isSuccessful()
    {
        return $this->payment_status === self::STATUS_SUCCESS;
    }

    /**
     * Check if payment is pending
     *
     * @return bool
     */
    public function isPending()
    {
        return $this->payment_status === self::STATUS_PENDING;
    }

    /**
     * Check if payment is failed
     *
     * @return bool
     */
    public function isFailed()
    {
        return $this->payment_status === self::STATUS_FAILED;
    }

    /**
     * Mark payment as successful
     *
     * @param string|null $transactionId
     * @param string|null $response
     * @return bool
     */
    public function markAsSuccess($transactionId = null, $response = null)
    {
        $updateData = [
            'payment_status' => self::STATUS_SUCCESS,
            'updated_at' => now()
        ];

        if ($transactionId) {
            $updateData['transaction_id'] = $transactionId;
        }

        if ($response) {
            $updateData['payment_response'] = $response;
        }

        return $this->update($updateData);
    }

    /**
     * Mark payment as failed
     *
     * @param string|null $response
     * @return bool
     */
    public function markAsFailed($response = null)
    {
        return $this->update([
            'payment_status' => self::STATUS_FAILED,
            'payment_response' => $response,
            'updated_at' => now()
        ]);
    }
  
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }



    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Check if payment is successful
     */
    public function isSuccess()
    {
        return $this->payment_status === 'SUCCESS';
    }



    /**
     * Check if payment is cancelled
     */
    public function isCancelled()
    {
        return $this->payment_status === 'CANCELLED';
    }

    /**
     * Check if payment is full
     */
    public function isFull()
    {
        return $this->payment_type === 'FULL';
    }

    /**
     * Check if payment is split
     */
    public function isSplit()
    {
        return $this->payment_type === 'SPLIT';
    }

    /**
     * Format payment amount with currency
     */
    public function getFormattedAmountAttribute()
    {
        return 'RM ' . number_format($this->amount, 2);
    }

    // ========================================
    // SCOPES
    // ========================================

    /**
     * Scope to filter by payment status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('payment_status', $status);
    }


    /**
     * Scope to filter by payment channel
     */
    public function scopeThroughChannel($query, $channel)
    {
        return $query->where('paid_through', $channel);
    }

    /**
     * Scope to filter by payment mode
     */
    public function scopeWithPaymentMode($query, $modeId)
    {
        return $query->where('payment_mode_id', $modeId);
    }

    /**
     * Scope to filter by payment date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('payment_date', $date);
    }


    /**
     * Scope to get failed payments only
     */
    public function scopeFailed($query)
    {
        return $query->where('payment_status', 'FAILED');
    }

    /**
     * Scope to get recent payments
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('payment_date', '>=', now()->subDays($days));
    }
}