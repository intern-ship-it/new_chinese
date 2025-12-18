<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OccasionOption extends Model
{
    protected $table = 'occasion_options';

    protected $fillable = [
        'occasion_id',
        'name',
        'name_secondary',
        'description',
        'description_secondary',
        'amount',
        'package_mode',
        'slot_capacity',
        'ledger_id',
        'date_type',
        'date_range_start',
        'date_range_end',
        'image_path',
        'status',
        'sort_order',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'slot_capacity' => 'integer',
        'sort_order' => 'integer',
        'date_range_start' => 'date',
        'date_range_end' => 'date'
    ];

    // ========================================
    // RELATIONSHIPS
    // ========================================

    /**
     * Get the occasion this option belongs to
     */
    public function occasion()
    {
        return $this->belongsTo(SpecialOccasion::class, 'occasion_id');
    }

    /**
     * Get the ledger for accounting
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    /**
     * Get the time slots for this option
     */
    public function timeSlots()
    {
        return $this->hasMany(OccasionOptionTimeSlot::class, 'option_id')
                    ->orderBy('sort_order')
                    ->orderBy('start_time');
    }

    /**
     * Get active time slots only
     */
    public function activeTimeSlots()
    {
        return $this->hasMany(OccasionOptionTimeSlot::class, 'option_id')
                    ->where('status', 'active')
                    ->orderBy('sort_order')
                    ->orderBy('start_time');
    }

    /**
     * Get the dates for this option (when date_type = multiple_dates)
     */
    public function dates()
    {
        return $this->hasMany(OccasionOptionDate::class, 'option_id')
                    ->orderBy('event_date');
    }

    /**
     * Get active/future dates only
     */
    public function activeDates()
    {
        return $this->hasMany(OccasionOptionDate::class, 'option_id')
                    ->where('status', 'active')
                    ->where('event_date', '>=', now()->toDateString())
                    ->orderBy('event_date');
    }

    /**
     * Alias for activeDates() - for controllers using this name
     */
    public function activeEventDates()
    {
        return $this->activeDates();
    }

    /**
     * Alias for dates() - for backward compatibility
     */
    public function eventDates()
    {
        return $this->dates();
    }

    /**
     * Get the services included with this option
     */
    public function services()
    {
        return $this->hasMany(OccasionOptionService::class, 'option_id');
    }

    /**
     * Get the bookings for this option
     */
    public function bookings()
    {
        return $this->hasMany(SpecialOccasionBooking::class, 'option_id');
    }

    // ========================================
    // SCOPES
    // ========================================

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    // ========================================
    // ACCESSORS
    // ========================================

    public function getFormattedAmountAttribute()
    {
        return 'RM ' . number_format($this->amount, 2);
    }

    /**
     * Get time slots count
     */
    public function getTimeSlotsCountAttribute()
    {
        return $this->timeSlots()->count();
    }

    /**
     * Get dates count
     */
    public function getDatesCountAttribute()
    {
        return $this->dates()->count();
    }
}