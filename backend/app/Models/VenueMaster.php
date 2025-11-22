<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VenueMaster extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'venue_master';

    protected $fillable = [
        'venue_name',
        'venue_name_chinese',
        'description',
        'description_chinese',
        'location',
        'capacity',
        'area_sqft',
        'facilities',
        'facilities_chinese',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'id' => 'integer',
        'capacity' => 'integer',
        'area_sqft' => 'decimal:2',
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    // Relationships
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 0);
    }
}