<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TempleFloor extends Model
{
    use HasFactory;

    protected $table = 'temple_floor';
    protected $primaryKey = 'floor_id';

    protected $fillable = [
        'temple_id',
        'floor_name',
        'floor_code',
        'floor_name_chinese',
        'description',
        'sort_order',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer'
    ];

    /**
     * Get the deities for this floor
     */
    public function deities()
    {
        return $this->hasMany(Deity::class, 'floor_id', 'floor_id');
    }

    /**
     * Get the light configs for this floor
     */
    public function lightConfigs()
    {
        return $this->hasMany(LightLayoutConfig::class, 'floor_id', 'floor_id');
    }

    /**
     * Scope to get only active floors
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
     * Scope to order by sort order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('floor_name');
    }
}
