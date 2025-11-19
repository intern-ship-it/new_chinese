<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FundBudgetItem extends Model
{
    protected $fillable = [
        'fund_budget_id',
        'ledger_id',
        'budgeted_amount',
        'utilized_amount',
        'description'
    ];

    protected $casts = [
        'budgeted_amount' => 'decimal:2',
        'utilized_amount' => 'decimal:2'
    ];

    protected $appends = ['remaining_amount', 'utilization_percentage'];

    /**
     * Relationships
     */
    public function fundBudget(): BelongsTo
    {
        return $this->belongsTo(FundBudget::class);
    }

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    public function utilizations(): HasMany
    {
        return $this->hasMany(FundBudgetUtilization::class);
    }

    /**
     * Accessors
     */
    public function getRemainingAmountAttribute(): float
    {
        return $this->budgeted_amount - $this->utilized_amount;
    }

    public function getUtilizationPercentageAttribute(): float
    {
        if ($this->budgeted_amount == 0) return 0;
        return round(($this->utilized_amount / $this->budgeted_amount) * 100, 2);
    }

    /**
     * Update utilization from related records
     */
    public function updateUtilization(): void
    {
        $this->utilized_amount = $this->utilizations()->sum('amount');
        $this->save();
    }

    /**
     * Check if amount can be used
     */
    public function canUseAmount(float $amount): bool
    {
        return ($this->budgeted_amount - $this->utilized_amount) >= $amount;
    }

    /**
     * Get utilization percentage helper
     */
    public function getUtilizationPercentage(): float
    {
        return $this->utilization_percentage;
    }
}