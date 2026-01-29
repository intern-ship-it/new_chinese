<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VolunteerAttendance extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'volunteer_attendance';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'volunteer_id',
        'assignment_id',
        'department_id',
        'task_id',
        'attendance_date',
        'clock_in_time',
        'clock_out_time',
        'entry_type',
        'manual_entry_reason',
        'manual_entry_by',
        'status',
        'created_by'
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'clock_in_time' => 'datetime',
        'clock_out_time' => 'datetime',
        'total_hours' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected $hidden = [];

    protected $appends = [
        'entry_type_label',
        'status_label',
        'duration_formatted',
        'is_clocked_out',
        'is_manual_entry'
    ];

    /**
     * Boot function to handle model events
     */
    protected static function boot()
    {
        parent::boot();

        // Set default values on creation
        static::creating(function ($attendance) {
            if (empty($attendance->entry_type)) {
                $attendance->entry_type = 'normal';
            }
            if (empty($attendance->status)) {
                $attendance->status = 'active';
            }
            if (empty($attendance->attendance_date)) {
                $attendance->attendance_date = now()->toDateString();
            }
        });
    }

    /**
     * Get human-readable entry type label
     */
    public function getEntryTypeLabelAttribute()
    {
        $labels = [
            'normal' => 'Normal Clock In/Out',
            'manual' => 'Manual Entry'
        ];

        return $labels[$this->entry_type] ?? $this->entry_type;
    }

    /**
     * Get human-readable status label
     */
    public function getStatusLabelAttribute()
    {
        $labels = [
            'active' => 'Active',
            'edited' => 'Edited',
            'cancelled' => 'Cancelled',
            'disputed' => 'Disputed'
        ];

        return $labels[$this->status] ?? $this->status;
    }

    /**
     * Get formatted duration string
     */
    public function getDurationFormattedAttribute()
    {
        if (!$this->clock_out_time || !$this->total_hours) {
            return 'In Progress';
        }

        $hours = floor($this->total_hours);
        $minutes = round(($this->total_hours - $hours) * 60);

        if ($hours > 0 && $minutes > 0) {
            return "{$hours}h {$minutes}m";
        } elseif ($hours > 0) {
            return "{$hours}h";
        } else {
            return "{$minutes}m";
        }
    }

    /**
     * Check if attendance is clocked out
     */
    public function getIsClockedOutAttribute()
    {
        return !is_null($this->clock_out_time);
    }

    /**
     * Check if this is a manual entry
     */
    public function getIsManualEntryAttribute()
    {
        return $this->entry_type === 'manual';
    }

    /**
     * Relationship: Volunteer who attended
     */
    public function volunteer()
    {
        return $this->belongsTo(Volunteer::class, 'volunteer_id');
    }

    /**
     * Relationship: Task assignment (if linked)
     */
    public function assignment()
    {
        return $this->belongsTo(VolunteerTaskAssignment::class, 'assignment_id');
    }

    /**
     * Relationship: Department
     */
    public function department()
    {
        return $this->belongsTo(VolunteerDepartment::class, 'department_id');
    }

    /**
     * Relationship: Task
     */
    public function task()
    {
        return $this->belongsTo(VolunteerTask::class, 'task_id');
    }

    /**
     * Relationship: Admin who made manual entry
     */
    public function manualEntryBy()
    {
        return $this->belongsTo(User::class, 'manual_entry_by');
    }

    /**
     * Relationship: User who created this record
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: Audit trail for this attendance
     */
    public function auditLogs()
    {
        return $this->hasMany(VolunteerAttendanceAudit::class, 'attendance_id');
    }

    /**
     * Scope: Active attendance records
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Cancelled attendance records
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope: Currently clocked in (no clock out time)
     */
    public function scopeClockedIn($query)
    {
        return $query->whereNull('clock_out_time');
    }

    /**
     * Scope: Completed (clocked out)
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('clock_out_time');
    }

    /**
     * Scope: Normal entries only
     */
    public function scopeNormalEntries($query)
    {
        return $query->where('entry_type', 'normal');
    }

    /**
     * Scope: Manual entries only
     */
    public function scopeManualEntries($query)
    {
        return $query->where('entry_type', 'manual');
    }

    /**
     * Scope: Filter by volunteer
     */
    public function scopeForVolunteer($query, $volunteerId)
    {
        return $query->where('volunteer_id', $volunteerId);
    }

    /**
     * Scope: Filter by department
     */
    public function scopeForDepartment($query, $departmentId)
    {
        if (empty($departmentId)) {
            return $query;
        }

        return $query->where('department_id', $departmentId);
    }

    /**
     * Scope: Filter by task
     */
    public function scopeForTask($query, $taskId)
    {
        if (empty($taskId)) {
            return $query;
        }

        return $query->where('task_id', $taskId);
    }

    /**
     * Scope: Filter by date
     */
    public function scopeOnDate($query, $date)
    {
        return $query->whereDate('attendance_date', $date);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        if (!empty($startDate) && !empty($endDate)) {
            return $query->whereBetween('attendance_date', [$startDate, $endDate]);
        } elseif (!empty($startDate)) {
            return $query->where('attendance_date', '>=', $startDate);
        } elseif (!empty($endDate)) {
            return $query->where('attendance_date', '<=', $endDate);
        }

        return $query;
    }

    /**
     * Scope: Today's attendance
     */
    public function scopeToday($query)
    {
        return $query->whereDate('attendance_date', now()->toDateString());
    }

    /**
     * Scope: This week's attendance
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('attendance_date', [
            now()->startOfWeek()->toDateString(),
            now()->endOfWeek()->toDateString()
        ]);
    }

    /**
     * Scope: This month's attendance
     */
    public function scopeThisMonth($query)
    {
        return $query->whereBetween('attendance_date', [
            now()->startOfMonth()->toDateString(),
            now()->endOfMonth()->toDateString()
        ]);
    }

    /**
     * Scope: Search by volunteer name, ID, or IC
     */
    public function scopeSearch($query, $search)
    {
        if (empty($search)) {
            return $query;
        }

        return $query->whereHas('volunteer', function($q) use ($search) {
            $q->where('volunteer_id', 'LIKE', "%{$search}%")
              ->orWhere('full_name', 'LIKE', "%{$search}%")
              ->orWhere('ic_number', 'LIKE', "%{$search}%")
              ->orWhere('mobile_primary', 'LIKE', "%{$search}%");
        });
    }

    /**
     * Calculate total hours worked
     */
    public function calculateTotalHours()
    {
        if (!$this->clock_out_time) {
            return 0;
        }

        $diffInSeconds = $this->clock_out_time->diffInSeconds($this->clock_in_time);
        return round($diffInSeconds / 3600, 2);
    }

    /**
     * Check if volunteer can clock out
     */
    public function canClockOut()
    {
        return is_null($this->clock_out_time) && $this->status === 'active';
    }

    /**
     * Check if attendance can be edited
     */
    public function canBeEdited()
    {
        return in_array($this->status, ['active', 'edited']);
    }

    /**
     * Check if attendance can be cancelled
     */
    public function canBeCancelled()
    {
        return $this->status === 'active';
    }

    /**
     * Check if there's overlapping attendance for same volunteer on same date
     */
    public static function hasOverlap($volunteerId, $date, $excludeId = null)
    {
        $query = static::where('volunteer_id', $volunteerId)
            ->whereDate('attendance_date', $date)
            ->where('status', 'active');

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Get current active clock-in for volunteer on specific date
     */
    public static function getCurrentClockIn($volunteerId, $date = null)
    {
        $date = $date ?: now()->toDateString();

        return static::where('volunteer_id', $volunteerId)
            ->whereDate('attendance_date', $date)
            ->whereNull('clock_out_time')
            ->where('status', 'active')
            ->first();
    }

    /**
     * Check if volunteer is currently clocked in
     */
    public static function isVolunteerClockedIn($volunteerId)
    {
        return static::getCurrentClockIn($volunteerId) !== null;
    }

    /**
     * Get attendance statistics for a period
     */
    public static function getStatistics($startDate, $endDate, $volunteerId = null)
    {
        $query = static::query()
            ->betweenDates($startDate, $endDate)
            ->completed()
            ->active();

        if ($volunteerId) {
            $query->forVolunteer($volunteerId);
        }

        return [
            'total_records' => $query->count(),
            'total_hours' => $query->sum('total_hours'),
            'unique_volunteers' => $query->distinct('volunteer_id')->count('volunteer_id'),
            'manual_entries' => $query->where('entry_type', 'manual')->count(),
            'average_hours_per_record' => $query->avg('total_hours')
        ];
    }

    /**
     * Get attendance summary by department
     */
    public static function getDepartmentSummary($startDate, $endDate)
    {
        return static::query()
            ->with('department:id,department_name')
            ->betweenDates($startDate, $endDate)
            ->completed()
            ->active()
            ->selectRaw('
                department_id,
                COUNT(*) as total_records,
                COUNT(DISTINCT volunteer_id) as unique_volunteers,
                SUM(total_hours) as total_hours,
                AVG(total_hours) as average_hours
            ')
            ->groupBy('department_id')
            ->get();
    }

    /**
     * Get peak day (day with most attendance)
     */
    public static function getPeakDay($startDate, $endDate)
    {
        return static::query()
            ->betweenDates($startDate, $endDate)
            ->completed()
            ->active()
            ->selectRaw('attendance_date, COUNT(*) as attendance_count')
            ->groupBy('attendance_date')
            ->orderByDesc('attendance_count')
            ->first();
    }

    /**
     * Validate clock in time
     */
    public function isValidClockInTime()
    {
        return $this->clock_in_time <= now();
    }

    /**
     * Validate clock out time
     */
    public function isValidClockOutTime()
    {
        if (!$this->clock_out_time) {
            return true;
        }

        return $this->clock_out_time > $this->clock_in_time;
    }

    /**
     * Get badge color for UI based on status
     */
    public function getStatusBadgeColor()
    {
        $colors = [
            'active' => 'success',
            'edited' => 'warning',
            'cancelled' => 'danger',
            'disputed' => 'dark'
        ];

        return $colors[$this->status] ?? 'secondary';
    }

    /**
     * Get badge color for entry type
     */
    public function getEntryTypeBadgeColor()
    {
        $colors = [
            'normal' => 'primary',
            'manual' => 'warning'
        ];

        return $colors[$this->entry_type] ?? 'secondary';
    }

    /**
     * Check if this is a manual entry
     */
    public function isManual()
    {
        return $this->entry_type === 'manual';
    }

    /**
     * Get formatted clock in time
     */
    public function getFormattedClockInAttribute()
    {
        return $this->clock_in_time ? $this->clock_in_time->format('H:i') : null;
    }

    /**
     * Get formatted clock out time
     */
    public function getFormattedClockOutAttribute()
    {
        return $this->clock_out_time ? $this->clock_out_time->format('H:i') : null;
    }

    /**
     * Get formatted date
     */
    public function getFormattedDateAttribute()
    {
        return $this->attendance_date ? $this->attendance_date->format('d M Y') : null;
    }
    public function scopeByDepartment($query, $departmentId) {
    if (empty($departmentId)) return $query;
    return $query->where('department_id', $departmentId);
}

public function scopeByTask($query, $taskId) {
    if (empty($taskId)) return $query;
    return $query->where('task_id', $taskId);
}

public function scopeByEntryType($query, $entryType) {
    if (empty($entryType) || $entryType === 'all') return $query;
    return $query->where('entry_type', $entryType);
}

public function scopeDateRange($query, $startDate, $endDate) {
    return $this->scopeBetweenDates($query, $startDate, $endDate);
}
}