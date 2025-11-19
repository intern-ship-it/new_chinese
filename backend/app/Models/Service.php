<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Service extends Model
{
    protected $table = 'services';
    
    protected $fillable = [
        'service_type_id',
        'ledger_id',
        'name',
        'code',
        'description',
        'price',
        'status',
        'created_by'
    ];

    protected $casts = [
        'service_type_id' => 'integer',
        'ledger_id' => 'integer',
        'price' => 'decimal:2',
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the service type this service belongs to
     */
    public function serviceType(): BelongsTo
    {
        return $this->belongsTo(ServiceType::class, 'service_type_id');
    }

    /**
     * Get the ledger account for this service
     */
    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    /**
     * Get the user who created this service
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get only active services
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope to filter by service type
     */
    public function scopeByServiceType($query, $serviceTypeId)
    {
        return $query->where('service_type_id', $serviceTypeId);
    }

    /**
     * Scope to filter by ledger
     */
    public function scopeByLedger($query, $ledgerId)
    {
        return $query->where('ledger_id', $ledgerId);
    }

    /**
     * Get formatted status
     */
    public function getStatusTextAttribute(): string
    {
        return $this->status == 1 ? 'Active' : 'Inactive';
    }

    /**
     * Get formatted price
     */
    public function getFormattedPriceAttribute(): string
    {
        return 'RM ' . number_format($this->price, 2);
    }

    /**
     * Check if service can be deleted
     */
    public function canBeDeleted(): bool
    {
        // Add logic here to check if service is used in any transactions
        // For now, return true
        return true;
    }

    /**
     * Search services
     */
    public function scopeSearch($query, $term)
    {
        return $query->where(function($q) use ($term) {
            $q->where('name', 'ILIKE', '%' . $term . '%')
              ->orWhere('code', 'ILIKE', '%' . $term . '%')
              ->orWhere('description', 'ILIKE', '%' . $term . '%');
        });
    }
}