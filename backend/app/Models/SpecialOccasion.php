<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SpecialOccasion extends Model
{
    use HasFactory;
    protected $connection = 'temple1';
    protected $table = 'special_occ_master';

    protected $fillable = [
        'primary_lang',
        'secondary_lang',
        'occasion_name_primary',
        'occasion_name_secondary',
        'occasion_options',
        'status'
    ];

    protected $casts = [
        'occasion_options' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected $attributes = [
        'primary_lang' => 'English',
        'status' => 'active'
    ];

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeBySecondaryLang($query, $lang)
    {
        return $query->where('secondary_lang', $lang);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('occasion_name_primary', 'ILIKE', "%{$search}%")
                ->orWhere('occasion_name_secondary', 'ILIKE', "%{$search}%");
        });
    }
}
