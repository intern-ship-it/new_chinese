<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reconciliation extends Model
{
    protected $table = 'reconciliations';
    
    protected $fillable = [
        'ledger_id',
        'month',
        'statement_closing_balance',
        'reconciled_balance',
        'opening_balance',
        'difference',
        'status',
        'reconciled_date',
        'reconciled_by',
        'notes',
        'created_by'
    ];
    
    protected $casts = [
        'statement_closing_balance' => 'decimal:2',
        'reconciled_balance' => 'decimal:2',
        'opening_balance' => 'decimal:2',
        'difference' => 'decimal:2',
        'reconciled_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    /**
     * Get the ledger for this reconciliation
     */
    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }
    
    /**
     * Get the user who created this reconciliation
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get the user who reconciled this
     */
    public function reconciledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
    
    /**
     * Get adjustments for this reconciliation
     */
    public function adjustments(): HasMany
    {
        return $this->hasMany(ReconciliationAdjustment::class, 'reconciliation_id');
    }
    
    /**
     * Get formatted month display
     */
    public function getMonthDisplayAttribute(): string
    {
        return date('F Y', strtotime($this->month . '-01'));
    }
    
    /**
     * Check if reconciliation is complete
     */
    public function isComplete(): bool
    {
        return $this->status === 'completed';
    }
    
    /**
     * Check if reconciliation is locked
     */
    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }
    
    /**
     * Check if reconciliation can be edited
     */
    public function canEdit(): bool
    {
        return $this->status === 'draft';
    }
    
    /**
     * Calculate difference
     */
    public function calculateDifference(): float
    {
        return $this->statement_closing_balance - $this->reconciled_balance;
    }
    
    /**
     * Update reconciled balance
     */
    public function updateReconciledBalance($balance): void
    {
        $this->reconciled_balance = $balance;
        $this->difference = $this->calculateDifference();
        $this->save();
    }
}