<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PagodaBlock extends Model
{
    use HasUuids;

    protected $table = 'pagoda_blocks';
    
    protected $fillable = [
        'tower_id',
        'block_name',
        'block_code',
        'total_floors',
        'rags_per_floor',
        'display_order',
        'description',
        'physical_location',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'total_floors' => 'integer',
        'rags_per_floor' => 'integer',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected $appends = ['total_capacity'];

    // Relationships
    public function tower()
    {
        return $this->belongsTo(PagodaTower::class, 'tower_id');
    }

    public function lightSlots()
    {
        return $this->hasMany(PagodaLightSlot::class, 'block_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Accessors
    public function getTotalCapacityAttribute()
    {
        return $this->total_floors * $this->rags_per_floor;
    }

    public function getAvailableLightsCountAttribute()
    {
        return $this->lightSlots()->where('status', 'available')->count();
    }

    public function getBookedLightsCountAttribute()
    {
        return $this->lightSlots()->where('status', 'registered')->count();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }
}