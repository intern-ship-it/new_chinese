<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Entry extends Model
{
    use HasFactory;

    protected $fillable = [
        'entry_code',
        'number',
        'entrytype_id',
        'date',
        'dr_total',
        'cr_total',
        'notes',
        'narration',
        'inv_type',
        'inv_id',
        'fund_id',
        'payment',
        'paid_to',
        'cheque_no',
        'cheque_date',
        'bank_name',
        'transaction_no',
        'transaction_date',
        'reference_no',
        'created_by',
        'approval_status',
        'has_closed',
'fund_budget_id',
 'user_id'
       
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'dr_total' => 'decimal:2',
        'cr_total' => 'decimal:2'
    ];

    /**
     * Get the entry items for this entry
     */
    public function items()
    {
        return $this->hasMany(EntryItem::class);
    }

    /**
     * Get the entry type
     */
    // public function entryType()
    // {
    //     return $this->belongsTo(EntryType::class, 'entrytype_id');
    // }

    /**
     * Get the source invoice/payment based on inv_type
     */
    public function getSourceAttribute()
    {
        switch ($this->inv_type) {
            case 1: // Sales Invoice
                return SalesInvoice::find($this->inv_id);
            case 2: // Purchase Invoice
                return PurchaseInvoice::find($this->inv_id);
            case 3: // Sales Payment
                return SalesInvoicePayment::find($this->inv_id);
            case 4: // Purchase Payment
                return PurchaseInvoicePayment::find($this->inv_id);
            default:
                return null;
        }
    }

    /**
     * Get entry type name
     */
    public function getEntryTypeNameAttribute()
    {
        $types = [
            1 => 'Receipt',
            2 => 'Payment', 
            3 => 'Contra',
            4 => 'Journal',
            5 => 'Credit Note',
            6 => 'Inventory Journal'
        ];

        return $types[$this->entrytype_id] ?? 'Unknown';
    }

    /**
     * Get source type name
     */
    public function getSourceTypeNameAttribute()
    {
        $types = [
            1 => 'Sales Invoice',
            2 => 'Purchase Invoice',
            3 => 'Sales Payment',
            4 => 'Purchase Payment'
        ];

        return $types[$this->inv_type] ?? 'Manual Entry';
    }

    /**
     * Check if entry is balanced
     */
    public function getIsBalancedAttribute()
    {
        return abs($this->dr_total - $this->cr_total) < 0.01;
    }

    /**
     * Scope for entries by type
     */
    public function scopeByType($query, $entryTypeId)
    {
        return $query->where('entrytype_id', $entryTypeId);
    }

    /**
     * Scope for entries by source type
     */
    public function scopeBySourceType($query, $invType)
    {
        return $query->where('inv_type', $invType);
    }

    /**
     * Scope for entries in date range
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope for journal entries
     */
    public function scopeJournal($query)
    {
        return $query->where('entrytype_id', 4);
    }

    /**
     * Scope for receipt entries
     */
    public function scopeReceipt($query)
    {
        return $query->where('entrytype_id', 1);
    }

    public function scopePayment($query)
    {
        return $query->where('entrytype_id', 2);
    }
        public function isBalanced(): bool
    {
        return $this->debit == $this->credit;
    }
         public function entryItems()
    {
        return $this->hasMany(EntryItem::class);
    }
        public function fund()
    {
        return $this->belongsTo(Fund::class);
    }
        public function creator()
    {
        return $this->belongsTo(User::class);
    }
    public function approvals()
{
    return $this->hasMany(EntryItemsApproval::class, 'entry_id');
}

public function pendingApprovals()
{
    return $this->hasMany(EntryItemsApproval::class, 'entry_id')
                ->where('approval_status', 'pending');
}

public function isFullyApproved()
{
    if (!$this->requires_approval) {
        return true;
    }
    
    return $this->approvals()
                ->where('is_final_approval', true)
                ->where('approval_status', 'approved')
                ->exists();
}

public function getApprovalProgress()
{
    $totalRequired = SystemSetting::where('key', 'payment_approval_member_count')
                                  ->where('type', 'ACCOUNTS')
                                  ->value('value') ?? 1;
    
    $approved = $this->approvals()
                     ->where('approval_status', 'approved')
                     ->count();
    
    return [
        'approved' => $approved,
        'required' => $totalRequired,
        'percentage' => ($approved / $totalRequired) * 100
    ];
}
}