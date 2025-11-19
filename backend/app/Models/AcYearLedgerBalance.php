<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcYearLedgerBalance extends Model
{
    protected $table = 'ac_year_ledger_balance';
	public $timestamps = false;
    
    protected $fillable = [
        'ac_year_id',
        'ledger_id',
        'dr_amount',
        'cr_amount',
        'quantity',
        'unit_price',
        'uom_id'
    ];

    protected $casts = [
        'dr_amount' => 'decimal:2',
        'cr_amount' => 'decimal:2',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
    ];

    /**
     * Get the accounting year this balance belongs to
     */
    public function acYear(): BelongsTo
    {
        return $this->belongsTo(AcYear::class, 'ac_year_id');
    }

    /**
     * Get the ledger this balance belongs to
     */
    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    /**
     * Get the unit of measure
     */
    public function uom(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }

    /**
     * Get the net balance (Dr - Cr)
     */
    public function getNetBalance(): float
    {
        return $this->dr_amount - $this->cr_amount;
    }

    /**
     * Get formatted net balance
     */
    public function getFormattedNetBalance(): string
    {
        $balance = $this->getNetBalance();
        return 'RM ' . number_format(abs($balance), 2) . ($balance >= 0 ? ' Dr' : ' Cr');
    }

    /**
     * Check if this is a debit balance
     */
    public function isDebitBalance(): bool
    {
        return $this->dr_amount > $this->cr_amount;
    }

    /**
     * Check if this is a credit balance
     */
    public function isCreditBalance(): bool
    {
        return $this->cr_amount > $this->dr_amount;
    }

    /**
     * Get the balance amount (always positive)
     */
    public function getBalanceAmount(): float
    {
        return abs($this->getNetBalance());
    }

    /**
     * Get the balance type (dr or cr)
     */
    public function getBalanceType(): string
    {
        return $this->isDebitBalance() ? 'dr' : 'cr';
    }

    /**
     * Get total inventory value (quantity * unit_price)
     */
    public function getInventoryValue(): float
    {
        return $this->quantity * $this->unit_price;
    }

    /**
     * Get formatted inventory value
     */
    public function getFormattedInventoryValue(): string
    {
        return 'RM ' . number_format($this->getInventoryValue(), 2);
    }

    /**
     * Scope to get balances for specific accounting year
     */
    public function scopeForYear($query, $acYearId)
    {
        return $query->where('ac_year_id', $acYearId);
    }

    /**
     * Scope to get balances for specific ledger
     */
    public function scopeForLedger($query, $ledgerId)
    {
        return $query->where('ledger_id', $ledgerId);
    }

    /**
     * Scope to get only debit balances
     */
    public function scopeDebitBalances($query)
    {
        return $query->where('dr_amount', '>', 'cr_amount');
    }

    /**
     * Scope to get only credit balances
     */
    public function scopeCreditBalances($query)
    {
        return $query->where('cr_amount', '>', 'dr_amount');
    }

    /**
     * Scope to get balances with inventory
     */
    public function scopeWithInventory($query)
    {
        return $query->where('quantity', '>', 0);
    }

    /**
     * Set opening balance amounts
     */
    public function setBalance($drAmount = 0, $crAmount = 0)
    {
        $this->dr_amount = $drAmount;
        $this->cr_amount = $crAmount;
        return $this;
    }

    /**
     * Set inventory details
     */
    public function setInventory($quantity = 0, $unitPrice = 0, $uomId = null)
    {
        $this->quantity = $quantity;
        $this->unit_price = $unitPrice;
        $this->uom_id = $uomId;
        return $this;
    }

    /**
     * Check if this balance has inventory
     */
    public function hasInventory(): bool
    {
        return $this->quantity > 0;
    }

    /**
     * Get summary for trial balance
     */
    public function getTrialBalanceSummary(): array
    {
        $netBalance = $this->getNetBalance();
        
        return [
            'ledger_id' => $this->ledger_id,
            'ledger_name' => $this->ledger->name ?? 'Unknown',
            'debit' => $netBalance > 0 ? $netBalance : 0,
            'credit' => $netBalance < 0 ? abs($netBalance) : 0,
            'net_balance' => $netBalance
        ];
    }
}