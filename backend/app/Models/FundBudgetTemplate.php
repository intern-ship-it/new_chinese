<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FundBudgetTemplate extends Model
{
    protected $fillable = [
        'fund_id',
        'template_name',
        'description',
        'is_active',
        'default_total_amount',
        'times_used',
        'last_used_at',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'default_total_amount' => 'decimal:2',
        'last_used_at' => 'datetime'
    ];

    /**
     * Relationships
     */
    public function fund(): BelongsTo
    {
        return $this->belongsTo(Fund::class);
    }

    public function templateItems(): HasMany
    {
        return $this->hasMany(FundBudgetTemplateItem::class, 'template_id');
    }
    public function items(): HasMany
    {
        return $this->hasMany(FundBudgetTemplateItem::class, 'template_id');
    }
    public function budgets(): HasMany
    {
        return $this->hasMany(FundBudget::class, 'template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Increment usage counter
     */
    public function incrementUsage(): void
    {
        $this->increment('times_used');
        $this->update(['last_used_at' => now()]);
    }

    /**
     * Get template total from items
     */
    public function calculateTotal(): float
    {
        return $this->templateItems()->sum('default_amount');
    }

    /**
     * Create budget from this template
     */
    public function createBudget(array $data): FundBudget
    {
        $budgetData = array_merge([
            'fund_id' => $this->fund_id,
            'template_id' => $this->id,
            'budget_amount' => $this->default_total_amount
        ], $data);

        $budget = FundBudget::create($budgetData);

        // Copy template items to budget items
        foreach ($this->templateItems as $templateItem) {
            FundBudgetItem::create([
                'fund_budget_id' => $budget->id,
                'ledger_id' => $templateItem->ledger_id,
                'budgeted_amount' => $templateItem->default_amount,
                'description' => $templateItem->description
            ]);
        }

        $this->incrementUsage();

        return $budget;
    }
}