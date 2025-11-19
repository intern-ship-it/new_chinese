<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntryApprovalLog extends Model
{
    protected $table = 'entry_approval_logs';
    
    protected $fillable = [
        'entry_approval_id',
        'approver_id',
        'position_id',
        'action',
        'comments'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the entry approval this log belongs to
     */
    public function entryApproval()
    {
        return $this->belongsTo(EntryApproval::class, 'entry_approval_id');
    }

    /**
     * Get the approver
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    /**
     * Get the position
     */
    public function position()
    {
        return $this->belongsTo(OrganizationPosition::class, 'position_id');
    }
}