<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OccasionOptionTimeSlot extends Model
{
    protected $table = 'occasion_option_time_slots';

    protected $fillable = [
        'option_id',
        'slot_name',
        'slot_name_secondary',
        'start_time',
        'end_time',
        'capacity',
        'status',
        'sort_order'
    ];

    protected $casts = [
        'capacity' => 'integer',
        'sort_order' => 'integer'
    ];

    /**
     * Get the option this slot belongs to
     */
    public function option()
    {
        return $this->belongsTo(OccasionOption::class, 'option_id');
    }

    /**
     * Get bookings for this slot
     */
    public function bookings()
    {
        return $this->hasMany(SpecialOccasionBooking::class, 'slot_id');
    }

    /**
     * Scope: Only active slots
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Order by sort_order and start_time
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('start_time');
    }

    /**
     * Get formatted time range
     */
    public function getTimeRangeAttribute()
    {
        return $this->start_time . ' - ' . $this->end_time;
    }
}