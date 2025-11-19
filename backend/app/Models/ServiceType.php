<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceType extends Model
{
    protected $table = 'service_types';
    
    protected $fillable = [
        'name',
        'code',
        'description',
        'status',
        'created_by'
    ];

    protected $casts = [
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get services under this service type
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class, 'service_type_id');
    }

    /**
     * Get the user who created this service type
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get only active service types
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Check if service type can be deleted
     */
    public function canBeDeleted(): bool
    {
        // Cannot delete if it has services
        return !$this->services()->exists();
    }

    /**
     * Get formatted status
     */
    public function getStatusTextAttribute(): string
    {
        return $this->status == 1 ? 'Active' : 'Inactive';
    }

    /**
     * Get services count
     */
    public function getServicesCountAttribute(): int
    {
        return $this->services()->count();
    }
}