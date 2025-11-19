<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class FundBudgetApproval extends Model
{
    protected $fillable = [
        'fund_budget_id',
        'action',
        'action_by',
        'action_at',
        'comments',
        'previous_status',
        'new_status'
    ];

    protected $casts = [
        'action_at' => 'datetime'
    ];
    public $timestamps = false; 
    // Action constants
    const ACTION_CREATED = 'CREATED';
    const ACTION_SUBMITTED = 'SUBMITTED';
    const ACTION_APPROVED = 'APPROVED';
    const ACTION_REJECTED = 'REJECTED';
    const ACTION_CLOSED = 'CLOSED';
    const ACTION_REOPENED = 'REOPENED';

    /**
     * Relationships
     */
    public function fundBudget(): BelongsTo
    {
        return $this->belongsTo(FundBudget::class);
    }

    public function actionBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_by');
    }

    /**
     * Scopes
     */
    public function scopeForBudget(Builder $query, $budgetId): Builder
    {
        return $query->where('fund_budget_id', $budgetId);
    }

    public function scopeByAction(Builder $query, $action): Builder
    {
        return $query->where('action', $action);
    }

    public function scopeRecent(Builder $query): Builder
    {
        return $query->orderBy('action_at', 'desc');
    }

    /**
     * Get approval timeline for a budget
     */
    public static function getTimeline($budgetId): array
    {
        return self::where('fund_budget_id', $budgetId)
            ->with('actionBy')
            ->orderBy('action_at')
            ->get()
            ->map(function ($approval) {
                return [
                    'action' => $approval->action,
                    'user' => $approval->actionBy->name ?? 'Unknown',
                    'timestamp' => $approval->action_at->format('Y-m-d H:i:s'),
                    'comments' => $approval->comments,
                    'status_change' => $approval->previous_status . ' ? ' . $approval->new_status
                ];
            })
            ->toArray();
    }
}