<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntryApproval extends Model
{
    protected $table = 'entries_approval';
    
    protected $fillable = [
        'entrytype_id',
        'number',
        'entry_code',
        'date',
        'dr_total',
        'cr_total',
        'narration',
        'fund_id',
        'payment',
        'cheque_no',
        'cheque_date',
        'bank_name',
        'transaction_no',
        'transaction_date',
        'paid_to',
        'reference_no',
        'created_by',
        'approval_status',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'original_entry_id'
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'cheque_date' => 'date:Y-m-d',
        'transaction_date' => 'date:Y-m-d',
        'dr_total' => 'decimal:2',
        'cr_total' => 'decimal:2',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime'
    ];

    /**
     * Get the entry items for this approval
     */
    public function entryItems()
    {
        return $this->hasMany(EntryItemApproval::class, 'entry_id');
    }

    /**
     * Get the approval logs
     */
    public function approvalLogs()
    {
        return $this->hasMany(EntryApprovalLog::class, 'entry_approval_id');
    }

    /**
     * Get the fund
     */
    public function fund()
    {
        return $this->belongsTo(Fund::class, 'fund_id');
    }

    /**
     * Get the creator
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the rejector
     */
    public function rejector()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * Get the original entry (after approval)
     */
    public function originalEntry()
    {
        return $this->belongsTo(Entry::class, 'original_entry_id');
    }
}
