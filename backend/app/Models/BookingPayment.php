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
    const TYPE_DEPOSIT = 'DEPOSIT';
    const TYPE_PARTIAL = 'PARTIAL';
    const TYPE_REFUND = 'REFUND';

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

    
}