<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AddonGroup extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'addon_groups';

    protected $fillable = [
        'group_name',
        'group_name_chinese',
        'description',
        'description_chinese',
        'icon',
        'display_order',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'id' => 'integer',
        'display_order' => 'integer',
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    // Relationships
    public function services()
    {
        return $this->hasMany(AddonService::class, 'addon_group_id');
    }

    public function activeServices()
    {
        return $this->hasMany(AddonService::class, 'addon_group_id')->where('status', 1);
    }

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

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }
}