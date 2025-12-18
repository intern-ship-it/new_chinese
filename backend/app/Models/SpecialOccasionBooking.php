<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecialOccasionBooking extends Model
{
    protected $table = 'special_occasion_bookings';

    protected $fillable = [
        'booking_code',
        'special_occasion_id',
        'option_id',
        'slot_id',
        'event_date',
        'occasion_name',
        'occasion_option',
        'occasion_amount',
        'amount_paid',
        'ledger_id',
        'receipt_number',
        'name_chinese',
        'name_english',
        'nric',
        'email',
        'contact_no',
        'payment_methods',
        'remark',
        'booking_date',
        'status',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason'
    ];

    protected $casts = [
        'occasion_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'event_date' => 'date',
        'booking_date' => 'datetime',
        'cancelled_at' => 'datetime'
    ];

    // ========================================
    // RELATIONSHIPS
    // ========================================

    /**
     * Get the occasion (temple event)
     */
    public function occasion()
    {
        return $this->belongsTo(SpecialOccasion::class, 'special_occasion_id');
    }

    /**
     * Get the package/option selected
     */
    public function option()
    {
        return $this->belongsTo(OccasionOption::class, 'option_id');
    }

    /**
     * Get the time slot selected
     */
    public function slot()
    {
        return $this->belongsTo(OccasionOptionTimeSlot::class, 'slot_id');
    }

    /**
     * Get the ledger for accounting
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    // ========================================
    // SCOPES
    // ========================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['cancelled']);
    }

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('event_date', $date);
    }

    public function scopeForDateRange($query, $from, $to)
    {
        return $query->whereDate('event_date', '>=', $from)
                     ->whereDate('event_date', '<=', $to);
    }

    // ========================================
    // ACCESSORS
    // ========================================

    /**
     * Get formatted booking date
     */
    public function getFormattedBookingDateAttribute()
    {
        return $this->booking_date ? $this->booking_date->format('d/m/Y H:i') : null;
    }

    /**
     * Get formatted event date
     */
    public function getFormattedEventDateAttribute()
    {
        return $this->event_date ? $this->event_date->format('d/m/Y') : null;
    }

    /**
     * Get status badge class
     */
    public function getStatusBadgeAttribute()
    {
        $badges = [
            'pending' => 'warning',
            'confirmed' => 'success',
            'completed' => 'info',
            'cancelled' => 'danger'
        ];

        return $badges[$this->status] ?? 'secondary';
    }
}