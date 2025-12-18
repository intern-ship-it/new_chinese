<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OccasionService extends Model
{
    protected $table = 'occasion_services';

    protected $fillable = [
        'name',
        'name_secondary',
        'description',
        'amount',
        'ledger_id',
        'status',
        'sort_order'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'sort_order' => 'integer'
    ];

    // ========================================
    // RELATIONSHIPS
    // ========================================

    /**
     * Get the ledger for this service
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    // ========================================
    // SCOPES
    // ========================================

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}