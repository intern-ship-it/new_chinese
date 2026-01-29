<?php
// app/Models/OccasionTableAssignmentHistory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccasionTableAssignmentHistory extends Model
{
    use HasUuids;

    protected $table = 'occasion_table_assignment_history';

    protected $fillable = [
        'booking_id',
        'assignment_id',
        'table_name',
        'row_number',
        'column_number',
        'old_assign_number',
        'new_assign_number',
        'action_type',
        'change_reason',
        'changed_by',
        'changed_at'
    ];

    protected $casts = [
        'changed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Relationship: Booking
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    /**
     * Relationship: Assignment
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(OccasionTableAssignment::class, 'assignment_id');
    }

    /**
     * Relationship: Changed by user
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}