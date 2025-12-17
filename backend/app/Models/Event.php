<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $table = 'events';

    protected $fillable = [
        'event_name_primary',
        'event_name_secondary',
        'from_date',
        'to_date',
        'description_primary',
        'description_secondary',
        'price',
        'special_price',
        'max_booking_count',
        'max_booking_per_day',
        'status',
    ];

    protected $casts = [
        'from_date' => 'date',
        'to_date' => 'date',
        'price' => 'decimal:2',
        'special_price' => 'decimal:2',
        'max_booking_count' => 'integer',
        'max_booking_per_day' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeAvailable($query)
    {
        $today = now()->toDateString();
        return $query->active()
            ->where('from_date', '<=', $today)
            ->where('to_date', '>=', $today);
    }

    public function scopeUpcoming($query)
    {
        return $query->active()
            ->where('from_date', '>', now()->toDateString());
    }

    // Accessors
    public function getEffectivePriceAttribute()
    {
        return $this->special_price ?? $this->price;
    }

    public function getDateRangeAttribute()
    {
        return $this->from_date->format('d M Y') . ' - ' . $this->to_date->format('d M Y');
    }

    public function getAvailableDatesAttribute()
    {
        $dates = [];
        $start = $this->from_date->copy();
        $end = $this->to_date->copy();
        
        while ($start <= $end) {
            if ($start >= now()->startOfDay()) {
                $dates[] = $start->format('Y-m-d');
            }
            $start->addDay();
        }
        
        return $dates;
    }

    public function getDurationDaysAttribute()
    {
        return $this->from_date->diffInDays($this->to_date) + 1;
    }

    // Relationships
    public function bookingItems()
    {
        return $this->hasMany(BookingItem::class, 'item_id')
            ->where('item_type', 'EVENT');
    }

    // Methods
    public function getBookingCountForDate($date)
    {
        return $this->bookingItems()
            ->where('service_date', $date)
            ->whereHas('booking', function ($query) {
                $query->whereNotIn('booking_status', ['CANCELLED', 'FAILED']);
            })
            ->count();
    }

    public function isDateAvailable($date)
    {
        if (!$this->max_booking_per_day) {
            return true;
        }
        
        return $this->getBookingCountForDate($date) < $this->max_booking_per_day;
    }

    public function getRemainingSlots()
    {
        if (!$this->max_booking_count) {
            return null; // Unlimited
        }

        $totalBooked = $this->bookingItems()
            ->whereHas('booking', function ($query) {
                $query->whereNotIn('booking_status', ['CANCELLED', 'FAILED']);
            })
            ->count();

        return max(0, $this->max_booking_count - $totalBooked);
    }
}