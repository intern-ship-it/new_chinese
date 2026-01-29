<?php
// app/Models/OccasionTableAssignment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OccasionTableAssignment extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'occasion_table_assignments';

    protected $fillable = [
        'booking_id',
        'table_name',
        'row_number',
        'column_number',
        'assign_number',
        'is_active',
        'is_relocated',
        'assigned_at',
        'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_relocated' => 'boolean',
        'assigned_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    /**
     * Relationship: Booking
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    /**
     * Relationship: History records
     */
    public function history(): HasMany
    {
        return $this->hasMany(OccasionTableAssignmentHistory::class, 'assignment_id');
    }

    /**
     * Generate assign number
     * Format: TableAR1C1050126 (Table A, Row 1, Column 1, May 01, 2026)
     */
    public static function generateAssignNumber($tableName, $rowNumber, $columnNumber)
    {
        $date = now();
        $month = $date->format('m');
        $day = $date->format('d');
        $year = $date->format('y');
        
        // Format: TableName + R + Row + C + Column + MMDDYY
        $assignNumber = strtoupper(str_replace(' ', '', $tableName)) 
                      . 'R' . $rowNumber 
                      . 'C' . $columnNumber 
                      . $month . $day . $year;
        
        // Check if exists, add suffix if needed
        $counter = 1;
        $originalNumber = $assignNumber;
        
        while (self::where('assign_number', $assignNumber)->exists()) {
            $assignNumber = $originalNumber . '-' . $counter;
            $counter++;
        }
        
        return $assignNumber;
    }

    /**
     * Mark as relocated
     */
    public function markAsRelocated()
    {
        $this->update([
            'is_relocated' => true,
            'is_active' => false
        ]);
    }
}