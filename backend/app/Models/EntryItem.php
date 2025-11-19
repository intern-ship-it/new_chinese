<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntryItem extends Model
{
    use HasFactory;
 protected $table = 'entryitems';
    protected $fillable = [
        'entry_id',
        'ledger_id',
        'amount',
        'dc', // D for Debit, C for Credit
        'reconciliation_date'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'reconciliation_date' => 'date:Y-m-d'
    ];

    /**
     * Get the entry that this item belongs to
     */
    public function entry()
    {
        return $this->belongsTo(Entry::class);
    }

    /**
     * Get the ledger for this entry item
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class);
    }

    /**
     * Check if this is a debit entry
     */
    public function getIsDebitAttribute()
    {
        return $this->dc === 'D';
    }

    /**
     * Check if this is a credit entry
     */
    public function getIsCreditAttribute()
    {
        return $this->dc === 'C';
    }

    /**
     * Get the debit amount (0 if credit)
     */
    public function getDebitAmountAttribute()
    {
        return $this->is_debit ? $this->amount : 0;
    }

    /**
     * Get the credit amount (0 if debit)
     */
    public function getCreditAmountAttribute()
    {
        return $this->is_credit ? $this->amount : 0;
    }

    /**
     * Check if item is reconciled
     */
    public function getIsReconciledAttribute()
    {
        return !is_null($this->reconciliation_date);
    }

    /**
     * Scope for debit entries
     */
    public function scopeDebit($query)
    {
        return $query->where('dc', 'D');
    }

    /**
     * Scope for credit entries
     */
    public function scopeCredit($query)
    {
        return $query->where('dc', 'C');
    }

    /**
     * Scope for specific ledger
     */
    public function scopeForLedger($query, $ledgerId)
    {
        return $query->where('ledger_id', $ledgerId);
    }

    /**
     * Scope for reconciled items
     */
    public function scopeReconciled($query)
    {
        return $query->whereNotNull('reconciliation_date');
    }

    /**
     * Scope for unreconciled items
     */
    public function scopeUnreconciled($query)
    {
        return $query->whereNull('reconciliation_date');
    }

    /**
     * Scope for entries in date range
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereHas('entry', function ($q) use ($startDate, $endDate) {
            $q->whereBetween('date', [$startDate, $endDate]);
        });
    }
}