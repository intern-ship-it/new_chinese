<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TowerCategory extends Model
{
    use HasUuids;

    protected $table = 'tower_categories';
    
    protected $fillable = [
        'name_primary',
        'name_secondary',
        'description',
        'is_active',
        'display_order',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationships
    public function towers()
    {
        return $this->hasMany(PagodaTower::class, 'category_id');
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
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name_primary');
    }

    // Accessors
    public function getFullNameAttribute()
    {
        if ($this->name_secondary) {
            return "{$this->name_primary} ({$this->name_secondary})";
        }
        return $this->name_primary;
    }

    public function getTowersCountAttribute()
    {
        return $this->towers()->count();
    }
}
