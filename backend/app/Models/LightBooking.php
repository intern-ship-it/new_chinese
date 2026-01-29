<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class LightBooking extends Model
{
    use HasFactory;

    protected $table = 'light_booking';
    protected $primaryKey = 'booking_id';

    protected $fillable = [
        'booking_number',
        'temple_id',
        'config_id',
        'unit_id',
        'devotee_id',
        'devotee_name',
        'devotee_nric',
        'devotee_phone',
        'devotee_email',
        'offering_date_from',
        'offering_date_to',
        'duration_days',
        'amount',
        'payment_mode',
        'payment_status',
        'payment_date',
        'payment_reference',
        'status',
        'reserved_until',
        'created_by',
        'updated_by',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason'
    ];

    protected $casts = [
        'offering_date_from' => 'date',
        'offering_date_to' => 'date',
        'duration_days' => 'integer',
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'reserved_until' => 'datetime',
        'cancelled_at' => 'datetime'
    ];

    /**
     * Boot method to generate booking number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($booking) {
            if (empty($booking->booking_number)) {
                $booking->booking_number = static::generateBookingNumber();
            }
        });
    }

    /**
     * Generate unique booking number
     */
    public static function generateBookingNumber()
    {
        $date = now()->format('Ymd');
        $count = static::whereDate('created_at', today())->count() + 1;
        return 'LB-' . $date . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get the config this booking belongs to
     */
    public function config()
    {
        return $this->belongsTo(LightLayoutConfig::class, 'config_id', 'config_id');
    }

    /**
     * Get the unit this booking is for
     */
    public function unit()
    {
        return $this->belongsTo(LightUnit::class, 'unit_id', 'unit_id');
    }

    /**
     * Scope to get active bookings
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'ACTIVE');
    }

    /**
     * Scope to get reserved bookings
     */
    public function scopeReserved($query)
    {
        return $query->where('status', 'RESERVED');
    }

    /**
     * Scope to get expired reservations
     */
    public function scopeExpiredReservations($query)
    {
        return $query->where('status', 'RESERVED')
                    ->where('reserved_until', '<', now());
    }

    /**
     * Scope to filter by temple
     */
    public function scopeForTemple($query, $templeId)
    {
        return $query->where('temple_id', $templeId);
    }

    /**
     * Check if reservation has expired
     */
    public function isReservationExpired()
    {
        return $this->status === 'RESERVED' && $this->reserved_until < now();
    }

    /**
     * Mark booking as confirmed/active
     */
    public function markAsConfirmed()
    {
        $this->update([
            'status' => 'ACTIVE',
            'payment_status' => 'PAID',
            'payment_date' => now()
        ]);
    }

    /**
     * Mark booking as expired
     */
    public function markAsExpired()
    {
        $this->update(['status' => 'EXPIRED']);
    }

    /**
     * Cancel booking
     */
    public function cancel($reason = null, $cancelledBy = null)
    {
        $this->update([
            'status' => 'CANCELLED',
            'cancelled_at' => now(),
            'cancelled_by' => $cancelledBy,
            'cancellation_reason' => $reason
        ]);
    }
}
