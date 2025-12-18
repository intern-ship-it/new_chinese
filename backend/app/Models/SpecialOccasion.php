<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class SpecialOccasion extends Model
{
    // REMOVED SoftDeletes - table doesn't have deleted_at column

    protected $table = 'special_occ_master';

    protected $fillable = [
        'occasion_name_primary',
        'occasion_name_secondary',
        'primary_lang',
        'secondary_lang',
        'occasion_options',
        'status'
    ];

    protected $casts = [
        'occasion_options' => 'array',
    ];

    // ========================================
    // RELATIONSHIPS
    // ========================================

    /**
     * Get packages from the new normalized table
     */
    public function packages()
    {
        return $this->hasMany(OccasionOption::class, 'occasion_id')->orderBy('sort_order');
    }

    /**
     * Get active packages only
     */
    public function activePackages()
    {
        return $this->hasMany(OccasionOption::class, 'occasion_id')
            ->where('status', 'active')
            ->orderBy('sort_order');
    }

    // ========================================
    // SCOPES
    // ========================================

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // ========================================
    // ACCESSORS
    // ========================================

    /**
     * Get packages count - from new table or JSONB
     */
    public function getPackagesCountAttribute()
    {
        if (Schema::hasTable('occasion_options')) {
            return $this->packages()->count();
        }
        return is_array($this->occasion_options) ? count($this->occasion_options) : 0;
    }
}