<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReconciliationAdjustment extends Model
{
    protected $table = 'reconciliation_adjustments';
    
    public $timestamps = false;
    
    protected $fillable = [
        'reconciliation_id',
        'adjustment_type',
        'entry_id',
        'amount',
        'description',
        'created_by',
        'created_at'
    ];
    
    protected $casts = [
        'amount' => 'decimal:2',
        'created_at' => 'datetime'
    ];
    
    /**
     * Get the reconciliation this adjustment belongs to
     */
    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(Reconciliation::class, 'reconciliation_id');
    }
    
    /**
     * Get the entry if this adjustment created one
     */
    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'entry_id');
    }
    
    /**
     * Get the user who created this adjustment
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get formatted type display
     */
    public function getTypeDisplayAttribute(): string
    {
        $types = [
            'bank_charge' => 'Bank Charge',
            'interest' => 'Interest',
            'manual' => 'Manual Adjustment',
            'error_correction' => 'Error Correction'
        ];
        
        return $types[$this->adjustment_type] ?? $this->adjustment_type;
    }
}