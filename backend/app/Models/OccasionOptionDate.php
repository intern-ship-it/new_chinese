<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OccasionOptionDate extends Model
{
    protected $table = 'occasion_option_dates';

    public $timestamps = false;

    protected $fillable = [
        'option_id',
        'event_date',
        'description',
        'capacity_override',
        'status',
        'created_at'
    ];

    protected $casts = [
        'event_date' => 'date',
        'capacity_override' => 'integer',
        'created_at' => 'datetime'
    ];

    /**
     * Get the option this date belongs to
     */
    public function option()
    {
        return $this->belongsTo(OccasionOption::class, 'option_id');
    }

    /**
     * Scope: Only active dates
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Future dates only
     */
    public function scopeFuture($query)
    {
        return $query->where('event_date', '>=', now()->toDateString());
    }
}