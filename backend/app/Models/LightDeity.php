<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LightDeity extends Model
{
    use HasFactory;

    protected $table = 'deity';
    protected $primaryKey = 'deity_id';

    protected $fillable = [
        'temple_id',
        'floor_id',
        'deity_name',
        'deity_name_chinese',
        'deity_name_tamil',
        'description',
        'image_url',
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
     * Get the floor this deity belongs to
     */
    public function floor()
    {
        return $this->belongsTo(TempleFloor::class, 'floor_id', 'floor_id');
    }

    /**
     * Get the light configs for this deity
     */
    public function lightConfigs()
    {
        return $this->hasMany(LightLayoutConfig::class, 'deity_id', 'deity_id');
    }

    /**
     * Scope to get only active deities
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
     * Scope to filter by floor
     */
    public function scopeForFloor($query, $floorId)
    {
        return $query->where('floor_id', $floorId);
    }

    /**
     * Scope to order by sort order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('deity_name');
    }
}
