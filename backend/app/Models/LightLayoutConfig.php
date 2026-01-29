<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LightLayoutConfig extends Model
{
    use HasFactory;

    protected $table = 'light_layout_config';
    protected $primaryKey = 'config_id';

    protected $fillable = [
        'temple_id',
        'type',
        'config_name',
        'config_code',
        'floor_id',
        'deity_id',
        'description',
        'image_url',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Get the floor this config belongs to
     */
    public function floor()
    {
        return $this->belongsTo(TempleFloor::class, 'floor_id', 'floor_id');
    }

    /**
     * Get the deity this config belongs to
     */
    public function deity()
    {
        return $this->belongsTo(LightDeity::class, 'deity_id', 'deity_id');
    }

    /**
     * Get the rows for this config
     */
    public function rows()
    {
        return $this->hasMany(LightLayoutRow::class, 'config_id', 'config_id')
                    ->orderBy('row_no');
    }

    /**
     * Get the units for this config
     */
    public function units()
    {
        return $this->hasMany(LightUnit::class, 'config_id', 'config_id');
    }

    /**
     * Get the bookings for this config
     */
    public function bookings()
    {
        return $this->hasMany(LightBooking::class, 'config_id', 'config_id');
    }

    /**
     * Get available units count
     */
    public function getAvailableUnitsCountAttribute()
    {
        return $this->units()->where('status', 'AVAILABLE')->count();
    }

    /**
     * Get total units count
     */
    public function getTotalUnitsCountAttribute()
    {
        return $this->units()->count();
    }

    /**
     * Scope to get only active configs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by temple
     */
    public function scopeForTemple($query, $templeId)
    {
        return $query->where('temple_id', $templeId);
    }

    /**
     * Scope to filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter by floor
     */
    public function scopeForFloor($query, $floorId)
    {
        return $query->where('floor_id', $floorId);
    }

    /**
     * Scope to filter by deity
     */
    public function scopeForDeity($query, $deityId)
    {
        return $query->where('deity_id', $deityId);
    }
}
