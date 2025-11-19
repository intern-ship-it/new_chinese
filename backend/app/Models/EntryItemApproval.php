<?php
// app/Models/EntryItemsApproval.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntryItemApproval extends Model
{
    protected $table = 'entryitems_approval';
    
    protected $fillable = [
        'entry_id',
        'ledger_id',
        'amount',
        'dc',
        'details',
        'is_discount',
        'inv_details',
        'inv_type',
        'inv_id',
        'quantity',
        'unit_price'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_discount' => 'boolean',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2'
    ];

    /**
     * Get the entry this item belongs to
     */
    public function entry()
    {
        return $this->belongsTo(EntryApproval::class, 'entry_id');
    }

    /**
     * Get the ledger for this entry item
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
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
}