<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Budget extends Model
{
    protected $fillable = [
        'ac_year_id',
        'ledger_id',
        'budget_amount',
        'budget_type',
        'status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'budget_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    const STATUS_DRAFT = 'DRAFT';
    const STATUS_SUBMITTED = 'SUBMITTED';
    const STATUS_APPROVED = 'APPROVED';
    const STATUS_REJECTED = 'REJECTED';

    const TYPE_INCOME = 'INCOME';
    const TYPE_EXPENSE = 'EXPENSE';

    // Allowed group codes for budget
    const ALLOWED_GROUP_CODES = ['4000', '5000', '6000', '8000'];

    public function acYear(): BelongsTo
    {
        return $this->belongsTo(AcYear::class, 'ac_year_id');
    }

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(BudgetApproval::class);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeForYear($query, $acYearId)
    {
        return $query->where('ac_year_id', $acYearId);
    }

    public function getActualAmount()
    {
        $balance = DB::table('ac_year_ledger_balance')
            ->where('ac_year_id', $this->ac_year_id)
            ->where('ledger_id', $this->ledger_id)
            ->first();

        if (!$balance) return 0;

        if ($this->budget_type === self::TYPE_INCOME) {
            return $balance->cr_amount - $balance->dr_amount;
        } else {
            return $balance->dr_amount - $balance->cr_amount;
        }
    }

    public function getVariance()
    {
        return $this->budget_amount - $this->getActualAmount();
    }

    public function getUtilizationPercentage()
    {
        if ($this->budget_amount == 0) return 0;
        return round(($this->getActualAmount() / $this->budget_amount) * 100, 2);
    }
}