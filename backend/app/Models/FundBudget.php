<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FundBudget extends Model
{
    protected $fillable = [
        'fund_id',
        'ac_year_id',
        'budget_name',
        'budget_amount',
        'from_date',
        'to_date',
        'is_recurring',
        'recurrence_type',
        'recurrence_parent_id',
        'recurrence_sequence',
        'template_id',
        'status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'utilized_amount',
        'notes',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'from_date' => 'date:Y-m-d',
        'to_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'is_recurring' => 'boolean',
        'budget_amount' => 'decimal:2',
        'utilized_amount' => 'decimal:2'
    ];

    protected $appends = ['is_active', 'can_edit', 'can_close', 'can_reopen'];

    // Status constants
    const STATUS_DRAFT = 'DRAFT';
    const STATUS_SUBMITTED = 'SUBMITTED';
    const STATUS_APPROVED = 'APPROVED';
    const STATUS_REJECTED = 'REJECTED';
    const STATUS_CLOSED = 'CLOSED';

    // Recurrence type constants
    const RECURRENCE_ONE_TIME = 'ONE_TIME';
    const RECURRENCE_WEEKLY = 'WEEKLY';
    const RECURRENCE_MONTHLY = 'MONTHLY';

    /**
     * Relationships
     */
    public function fund(): BelongsTo
    {
        return $this->belongsTo(Fund::class);
    }

    public function acYear(): BelongsTo
    {
        return $this->belongsTo(AcYear::class, 'ac_year_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(FundBudgetTemplate::class, 'template_id');
    }

    public function budgetItems(): HasMany
    {
        return $this->hasMany(FundBudgetItem::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(FundBudgetApproval::class);
    }

    public function utilization(): HasMany
    {
        return $this->hasMany(FundBudgetUtilization::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class, 'fund_budget_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recurrenceParent(): BelongsTo
    {
        return $this->belongsTo(FundBudget::class, 'recurrence_parent_id');
    }

    public function recurrenceChildren(): HasMany
    {
        return $this->hasMany(FundBudget::class, 'recurrence_parent_id');
    }

    /**
     * Accessors
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->status === self::STATUS_APPROVED
            && now()->between($this->from_date, $this->to_date)
            && $this->status !== self::STATUS_CLOSED;
    }

    public function getCanEditAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_REJECTED]);
    }

    public function getCanCloseAttribute(): bool
    {
        return $this->status === self::STATUS_APPROVED && now()->gt($this->to_date);
    }

    public function getCanReopenAttribute(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    public function getRemainingAmountAttribute(): float
    {
        return $this->budget_amount - $this->utilized_amount;
    }

    public function getUtilizationPercentageAttribute(): float
    {
        if ($this->budget_amount == 0) return 0;
        return round(($this->utilized_amount / $this->budget_amount) * 100, 2);
    }

    /**
     * Scopes
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED)
            ->where('from_date', '<=', now())
            ->where('to_date', '>=', now());
    }

    public function scopeForFund(Builder $query, $fundId): Builder
    {
        return $query->where('fund_id', $fundId);
    }

    public function scopeInPeriod(Builder $query, $startDate, $endDate): Builder
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('from_date', [$startDate, $endDate])
                ->orWhereBetween('to_date', [$startDate, $endDate])
                ->orWhere(function ($q2) use ($startDate, $endDate) {
                    $q2->where('from_date', '<=', $startDate)
                        ->where('to_date', '>=', $endDate);
                });
        });
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeNeedsApproval(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_SUBMITTED);
    }

    /**
     * Methods
     */
    public function updateUtilization(): void
    {
        $this->utilized_amount = $this->budgetItems()->sum('utilized_amount');
        $this->save();
    }

    public function checkBudgetAvailability($amount, $ledgerId = null): array
    {
        if ($ledgerId) {
            $item = $this->budgetItems()->where('ledger_id', $ledgerId)->first();
            if (!$item) {
                return [
                    'available' => false,
                    'message' => 'Ledger not found in budget items'
                ];
            }

            $available = $item->budgeted_amount - $item->utilized_amount;
            $canUse = $available >= $amount;

            return [
                'available' => $canUse,
                'remaining' => $available,
                'percentage_used' => $item->getUtilizationPercentage(),
                'message' => $canUse ? 'Budget available' : 'Insufficient budget for this ledger'
            ];
        }

        $available = $this->budget_amount - $this->utilized_amount;
        $canUse = $available >= $amount;

        return [
            'available' => $canUse,
            'remaining' => $available,
            'percentage_used' => $this->utilization_percentage,
            'message' => $canUse ? 'Budget available' : 'Insufficient total budget'
        ];
    }

    public function recordUtilization($entryId, $entryItemId, $ledgerId, $amount, $transactionDate = null): FundBudgetUtilization
    {
        // Find the budget item for this ledger
        $budgetItem = $this->budgetItems()->where('ledger_id', $ledgerId)->first();

        if (!$budgetItem) {
            throw new \Exception("Ledger {$ledgerId} not found in fund budget items");
        }

        // Create utilization record
        $utilization = FundBudgetUtilization::create([
            'fund_budget_id' => $this->id,
            'fund_budget_item_id' => $budgetItem->id,
            'entry_id' => $entryId,
            'entry_item_id' => $entryItemId,
            'ledger_id' => $ledgerId,
            'amount' => $amount,
            'transaction_date' => $transactionDate ?: now()
        ]);

        // Update budget item utilization
        $budgetItem->updateUtilization();

        // Update total budget utilization
        $this->updateUtilization();

        // Check thresholds for warnings
        $this->checkUtilizationThresholds();

        return $utilization;
    }

    public function checkUtilizationThresholds(): array
    {
        $percentage = $this->utilization_percentage;
        $warnings = [];

        if ($percentage >= 100) {
            $warnings[] = [
                'level' => 'danger',
                'message' => "Fund budget '{$this->budget_name}' has exceeded 100% utilization"
            ];
        } elseif ($percentage >= 90) {
            $warnings[] = [
                'level' => 'warning',
                'message' => "Fund budget '{$this->budget_name}' is at {$percentage}% utilization"
            ];
        } elseif ($percentage >= 75) {
            $warnings[] = [
                'level' => 'info',
                'message' => "Fund budget '{$this->budget_name}' is at {$percentage}% utilization"
            ];
        }

        return $warnings;
    }

    public function submit(): bool
    {
        if ($this->status !== self::STATUS_DRAFT) {
            throw new \Exception('Only draft budgets can be submitted');
        }

        DB::transaction(function () {
            $this->status = self::STATUS_SUBMITTED;
            $this->save();

            FundBudgetApproval::create([
                'fund_budget_id' => $this->id,
                'action' => 'SUBMITTED',
                'action_by' => auth()->id(),
                'previous_status' => self::STATUS_DRAFT,
                'new_status' => self::STATUS_SUBMITTED
            ]);
        });

        return true;
    }

    public function approve($notes = null): bool
    {
        if ($this->status !== self::STATUS_SUBMITTED) {
            throw new \Exception('Only submitted budgets can be approved');
        }

        DB::transaction(function () use ($notes) {
            $this->status = self::STATUS_APPROVED;
            $this->approved_by = auth()->id();
            $this->approved_at = now();
            $this->approval_notes = $notes;
            $this->save();

            FundBudgetApproval::create([
                'fund_budget_id' => $this->id,
                'action' => 'APPROVED',
                'action_by' => auth()->id(),
                'comments' => $notes,
                'previous_status' => self::STATUS_SUBMITTED,
                'new_status' => self::STATUS_APPROVED
            ]);
        });

        return true;
    }

    public function reject($notes = null): bool
    {
        if ($this->status !== self::STATUS_SUBMITTED) {
            throw new \Exception('Only submitted budgets can be rejected');
        }

        DB::transaction(function () use ($notes) {
            $this->status = self::STATUS_REJECTED;
            $this->approval_notes = $notes;
            $this->save();

            FundBudgetApproval::create([
                'fund_budget_id' => $this->id,
                'action' => 'REJECTED',
                'action_by' => auth()->id(),
                'comments' => $notes,
                'previous_status' => self::STATUS_SUBMITTED,
                'new_status' => self::STATUS_REJECTED
            ]);
        });

        return true;
    }

    public function close(): bool
    {
        if ($this->status !== self::STATUS_APPROVED) {
            throw new \Exception('Only approved budgets can be closed');
        }

        DB::transaction(function () {
            $previousStatus = $this->status;
            $this->status = self::STATUS_CLOSED;
            $this->save();

            FundBudgetApproval::create([
                'fund_budget_id' => $this->id,
                'action' => 'CLOSED',
                'action_by' => auth()->id(),
                'previous_status' => $previousStatus,
                'new_status' => self::STATUS_CLOSED
            ]);
        });

        return true;
    }

    public function reopen($notes = null): bool
    {
        if ($this->status !== self::STATUS_CLOSED) {
            throw new \Exception('Only closed budgets can be reopened');
        }

        DB::transaction(function () use ($notes) {
            $this->status = self::STATUS_APPROVED;
            $this->save();

            FundBudgetApproval::create([
                'fund_budget_id' => $this->id,
                'action' => 'REOPENED',
                'action_by' => auth()->id(),
                'comments' => $notes,
                'previous_status' => self::STATUS_CLOSED,
                'new_status' => self::STATUS_APPROVED
            ]);
        });

        return true;
    }

    /**
     * Get summary statistics for the fund budget
     */
    public function getSummary(): array
    {
        $items = $this->budgetItems()->with('ledger')->get();

        return [
            'budget_name' => $this->budget_name,
            'fund' => $this->fund->name,
            'period' => $this->from_date->format('d/m/Y') . ' - ' . $this->to_date->format('d/m/Y'),
            'status' => $this->status,
            'is_active' => $this->is_active,
            'total_budget' => $this->budget_amount,
            'total_utilized' => $this->utilized_amount,
            'total_remaining' => $this->remaining_amount,
            'utilization_percentage' => $this->utilization_percentage,
            'items' => $items->map(function ($item) {
                return [
                    'ledger' => $item->ledger->name,
                    'budgeted' => $item->budgeted_amount,
                    'utilized' => $item->utilized_amount,
                    'remaining' => $item->remaining_amount,
                    'percentage' => $item->utilization_percentage
                ];
            }),
            'warnings' => $this->checkUtilizationThresholds()
        ];
    }
}
