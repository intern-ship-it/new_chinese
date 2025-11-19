<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class AcYear extends Model
{
    protected $table = 'ac_year';
    public $timestamps = false;
    protected $fillable = [
        'from_year_month',
        'to_year_month',
        'status',
        'user_id',
        'mig_comp',
        'has_closed'
    ];

    protected $casts = [
        'status' => 'boolean',
        'mig_comp' => 'boolean',
        'from_year_month' => 'date:Y-m-d',
        'to_year_month' => 'date:Y-m-d',
    ];

    /**
     * Get the user this accounting year belongs to
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get ledger balances for this accounting year
     */
    public function ledgerBalances(): HasMany
    {
        return $this->hasMany(AcYearLedgerBalance::class, 'ac_year_id');
    }

    /**
     * Check if this is the active accounting year
     */
    public function isActive(): bool
    {
        return $this->status == 1;
    }

    /**
     * Get formatted period string
     */
    public function getPeriodStringAttribute(): string
    {
        $from = Carbon::parse($this->from_year_month);
        $to = Carbon::parse($this->to_year_month);
        
        return $from->format('M Y') . ' - ' . $to->format('M Y');
    }

    /**
     * Get formatted period for display
     */
    public function getFormattedPeriod(): string
    {
        $from = Carbon::parse($this->from_year_month);
        $to = Carbon::parse($this->to_year_month);
        
        return $from->format('d-m-Y') . ' to ' . $to->format('d-m-Y');
    }

    /**
     * Check if a date falls within this accounting year
     */
    public function containsDate($date): bool
    {
        $checkDate = Carbon::parse($date);
        $fromDate = Carbon::parse($this->from_year_month);
        $toDate = Carbon::parse($this->to_year_month);
        
        return $checkDate->between($fromDate, $toDate);
    }

    /**
     * Get the financial year string (e.g., "2024-25")
     */
    public function getFinancialYearString(): string
    {
        $from = Carbon::parse($this->from_year_month);
        $to = Carbon::parse($this->to_year_month);
        
        if ($from->year == $to->year) {
            return $from->year;
        }
        
        return $from->year . '-' . substr($to->year, -2);
    }

    /**
     * Scope to get active accounting years
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope to get accounting years for a specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Get the duration of accounting year in months
     */
    public function getDurationInMonths(): int
    {
        $from = Carbon::parse($this->from_year_month);
        $to = Carbon::parse($this->to_year_month);
        
        return $from->diffInMonths($to) + 1; // +1 to include both start and end months
    }

    /**
     * Check if accounting year is closed
     */
    public function isClosed(): bool
    {
        return $this->status == 0 && Carbon::now()->gt(Carbon::parse($this->to_year_month));
    }

    /**
     * Get next accounting year
     */
    public function getNextYear(): ?AcYear
    {
        $toDate = Carbon::parse($this->to_year_month);
        $nextFromDate = $toDate->copy()->addDay();
        
        return static::where('user_id', $this->user_id)
            ->where('from_year_month', $nextFromDate->format('Y-m-d'))
            ->first();
    }

    /**
     * Get previous accounting year
     */
    public function getPreviousYear(): ?AcYear
    {
        $fromDate = Carbon::parse($this->from_year_month);
        $prevToDate = $fromDate->copy()->subDay();
        
        return static::where('user_id', $this->user_id)
            ->where('to_year_month', $prevToDate->format('Y-m-d'))
            ->first();
    }

    /**
     * Activate this accounting year (deactivate others for the user)
     */
    public function activate(): bool
    {
        // Deactivate all other years for this user
        static::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['status' => 0]);
            
        // Activate this year
        return $this->update(['status' => 1]);
    }

    /**
     * Check if opening balances can be modified
     */
    public function canModifyOpeningBalances(): bool
    {
        // Can modify if it's active and no transactions exist
        if (!$this->isActive()) {
            return false;
        }
        
        // Check if any transactions exist in this period
        $hasTransactions = \DB::table('entries')
            ->whereBetween('date', [
                $this->from_year_month,
                $this->to_year_month
            ])
            ->exists();
            
        return !$hasTransactions;
    }

    /**
     * Get opening balance for a specific ledger
     */
    public function getOpeningBalance($ledgerId)
    {
        return $this->ledgerBalances()
            ->where('ledger_id', $ledgerId)
            ->first();
    }

    /**
     * Set opening balance for a ledger
     */
    public function setOpeningBalance($ledgerId, $drAmount = 0, $crAmount = 0, $quantity = 0, $unitPrice = 0, $uomId = null)
    {
        return AcYearLedgerBalance::updateOrCreate(
            [
                'ac_year_id' => $this->id,
                'ledger_id' => $ledgerId
            ],
            [
                'dr_amount' => $drAmount,
                'cr_amount' => $crAmount,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'uom_id' => $uomId
            ]
        );
    }

    /**
     * Copy opening balances from previous year's closing balances
     */
    public function copyFromPreviousYear(): int
    {
        $previousYear = $this->getPreviousYear();
        
        if (!$previousYear) {
            return 0;
        }
        
        $copied = 0;
        
        // Get all ledgers with balances from previous year
        $previousBalances = $previousYear->ledgerBalances()->get();
        
        foreach ($previousBalances as $balance) {
            // Calculate closing balance from previous year
            $ledger = Ledger::find($balance->ledger_id);
            if ($ledger) {
                $closingBalance = $ledger->getCurrentBalance($previousYear->to_year_month);
                
                if ($closingBalance != 0) {
                    $this->setOpeningBalance(
                        $balance->ledger_id,
                        $closingBalance > 0 ? $closingBalance : 0,
                        $closingBalance < 0 ? abs($closingBalance) : 0,
                        $balance->quantity,
                        $balance->unit_price,
                        $balance->uom_id
                    );
                    $copied++;
                }
            }
        }
        
        return $copied;
    }

    /**
     * Get trial balance summary for this year
     */
    public function getTrialBalance($asOnDate = null)
    {
        $asOnDate = $asOnDate ?? $this->to_year_month;
        
        $ledgers = Ledger::with(['group', 'openingBalances' => function($query) {
            $query->where('ac_year_id', $this->id);
        }])->get();
        
        $trialBalance = [];
        $totalDr = 0;
        $totalCr = 0;
        
        foreach ($ledgers as $ledger) {
            $balance = $ledger->getCurrentBalance($asOnDate);
            
            if ($balance != 0) {
                $trialBalance[] = [
                    'ledger' => $ledger,
                    'debit' => $balance > 0 ? $balance : 0,
                    'credit' => $balance < 0 ? abs($balance) : 0
                ];
                
                $totalDr += $balance > 0 ? $balance : 0;
                $totalCr += $balance < 0 ? abs($balance) : 0;
            }
        }
        
        return [
            'ledgers' => $trialBalance,
            'total_debit' => $totalDr,
            'total_credit' => $totalCr,
            'is_balanced' => round($totalDr, 2) == round($totalCr, 2)
        ];
    }
}