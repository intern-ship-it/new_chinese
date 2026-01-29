<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LightUnit extends Model
{
    use HasFactory;

    protected $table = 'light_unit';
    protected $primaryKey = 'unit_id';

    protected $fillable = [
        'config_id',
        'row_no',
        'col_no',
        'unit_code',
        'status',
        'remark'
    ];

    protected $casts = [
        'row_no' => 'integer',
        'col_no' => 'integer'
    ];

    /**
     * Get the config this unit belongs to
     */
    public function config()
    {
        return $this->belongsTo(LightLayoutConfig::class, 'config_id', 'config_id');
    }

    /**
     * Get the active booking for this unit
     */
    public function activeBooking()
    {
        return $this->hasOne(LightBooking::class, 'unit_id', 'unit_id')
                    ->whereIn('status', ['RESERVED', 'ACTIVE'])
                    ->latest();
    }

    /**
     * Get all bookings for this unit
     */
    public function bookings()
    {
        return $this->hasMany(LightBooking::class, 'unit_id', 'unit_id');
    }

    /**
     * Scope to get available units
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'AVAILABLE');
    }

    /**
     * Scope to get booked units
     */
    public function scopeBooked($query)
    {
        return $query->where('status', 'BOOKED');
    }

    /**
     * Scope to get reserved units
     */
    public function scopeReserved($query)
    {
        return $query->where('status', 'RESERVED');
    }

    /**
     * Scope to filter by config
     */
    public function scopeForConfig($query, $configId)
    {
        return $query->where('config_id', $configId);
    }

    /**
     * Scope to filter by row
     */
    public function scopeForRow($query, $rowNo)
    {
        return $query->where('row_no', $rowNo);
    }

    /**
     * Check if unit is available for booking
     */
    public function isAvailable()
    {
        return $this->status === 'AVAILABLE';
    }

    /**
     * Mark unit as reserved
     */
    public function markAsReserved()
    {
        $this->update(['status' => 'RESERVED']);
    }

    /**
     * Mark unit as booked
     */
    public function markAsBooked()
    {
        $this->update(['status' => 'BOOKED']);
    }

    /**
     * Mark unit as available
     */
    public function markAsAvailable()
    {
        $this->update(['status' => 'AVAILABLE']);
    }
}
