<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class FundBudgetUtilization extends Model
{
    protected $table = 'fund_budget_utilization';

    protected $fillable = [
        'fund_budget_id',
        'fund_budget_item_id',
        'entry_id',
        'entry_item_id',
        'ledger_id',
        'amount',
        'transaction_date',
        'description'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
        'created_at' => 'datetime'
    ];

    public $timestamps = false;

    /**
     * Relationships
     */
    public function fundBudget(): BelongsTo
    {
        return $this->belongsTo(FundBudget::class);
    }

    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(FundBudgetItem::class, 'fund_budget_item_id');
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }

    public function entryItem(): BelongsTo
    {
        return $this->belongsTo(EntryItem::class, 'entry_item_id');
    }

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    /**
     * Scopes
     */
    public function scopeForBudget(Builder $query, $budgetId): Builder
    {
        return $query->where('fund_budget_id', $budgetId);
    }

    public function scopeForBudgetItem(Builder $query, $budgetItemId): Builder
    {
        return $query->where('fund_budget_item_id', $budgetItemId);
    }

    public function scopeInPeriod(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    public function scopeByLedger(Builder $query, $ledgerId): Builder
    {
        return $query->where('ledger_id', $ledgerId);
    }

    /**
     * Get utilization summary for a budget
     */
    public static function getSummaryForBudget($budgetId): array
    {
        $utilizations = self::where('fund_budget_id', $budgetId)
            ->with(['ledger', 'entry'])
            ->get();

        return [
            'total_amount' => $utilizations->sum('amount'),
            'transaction_count' => $utilizations->count(),
            'by_ledger' => $utilizations->groupBy('ledger.name')->map(function ($group) {
                return [
                    'amount' => $group->sum('amount'),
                    'count' => $group->count()
                ];
            }),
            'by_date' => $utilizations->groupBy(function ($item) {
                return $item->transaction_date->format('Y-m-d');
            })->map(function ($group) {
                return $group->sum('amount');
            })
        ];
    }

    /**
     * Boot method to handle created event
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->created_at = now();
        });
    }
}