<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PagodaTower extends Model
{
    use HasUuids;

    protected $table = 'pagoda_towers';
    
    protected $fillable = [
        'tower_name',
        'tower_code',
        'description',
        'location',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationships
    public function blocks()
    {
        return $this->hasMany(PagodaBlock::class, 'tower_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // Accessors
    public function getTotalCapacityAttribute()
    {
        return $this->blocks()->sum('total_capacity');
    }

    public function getAvailableLightsAttribute()
    {
        return PagodaLightSlot::whereHas('block', function($q) {
            $q->where('tower_id', $this->id);
        })->where('status', 'available')->count();
    }

    public function getBookedLightsAttribute()
    {
        return PagodaLightSlot::whereHas('block', function($q) {
            $q->where('tower_id', $this->id);
        })->where('status', 'registered')->count();
    }
}