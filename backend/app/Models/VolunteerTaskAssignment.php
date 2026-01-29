<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\DB;

class VolunteerTaskAssignment extends Model
{
    use HasUuids;
    
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'volunteer_task_assignments';
    
    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'id';
    
    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;
    
    /**
     * The data type of the auto-incrementing ID.
     *
     * @var string
     */
    protected $keyType = 'string';
    
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'volunteer_id',
        'department_id',
        'task_id',
        'assignment_date',
        'time_slot',
        'start_time',
        'end_time',
        'notes',
        'status',
        'assigned_at',
        'assigned_by'
    ];
    
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'assignment_date' => 'date:Y-m-d',
        'assigned_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'assigned_by'
    ];
    
    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'is_completed',
        'is_cancelled',
        'is_no_show',
        'can_be_completed',
        'can_be_cancelled'
    ];
    
    // ========================================
    // RELATIONSHIPS
    // ========================================
    
    /**
     * Get the volunteer assigned to this task
     */
    public function volunteer()
    {
        return $this->belongsTo(Volunteer::class, 'volunteer_id');
    }
    
    /**
     * Get the department this assignment belongs to
     */
    public function department()
    {
        return $this->belongsTo(VolunteerDepartment::class, 'department_id');
    }
    
    /**
     * Get the task assigned
     */
    public function task()
    {
        return $this->belongsTo(VolunteerTask::class, 'task_id');
    }
    
    /**
     * Get the user who made this assignment
     */
    public function assignedByUser()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
    
    /**
     * Get attendance records for this assignment
     */
    public function attendanceRecords()
    {
        return $this->hasMany(VolunteerAttendance::class, 'assignment_id');
    }
    
    // ========================================
    // SCOPES
    // ========================================
    
    /**
     * Scope a query to only include assigned (pending) assignments
     */
    public function scopeAssigned($query)
    {
        return $query->where('status', 'assigned');
    }
    
    /**
     * Scope a query to only include completed assignments
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
    
    /**
     * Scope a query to only include cancelled assignments
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }
    
    /**
     * Scope a query to only include no-show assignments
     */
    public function scopeNoShow($query)
    {
        return $query->where('status', 'no_show');
    }
    
    /**
     * Scope a query to filter by volunteer
     */
    public function scopeForVolunteer($query, $volunteerId)
    {
        return $query->where('volunteer_id', $volunteerId);
    }
    
    /**
     * Scope a query to filter by department
     */
    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }
    
    /**
     * Scope a query to filter by task
     */
    public function scopeForTask($query, $taskId)
    {
        return $query->where('task_id', $taskId);
    }
    
    /**
     * Scope a query to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('assignment_date', [$startDate, $endDate]);
    }
    
    /**
     * Scope a query to get assignments for a specific date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('assignment_date', $date);
    }
    
    /**
     * Scope a query to get today's assignments
     */
    public function scopeToday($query)
    {
        return $query->whereDate('assignment_date', today());
    }
    
    /**
     * Scope a query to get upcoming assignments
     */
    public function scopeUpcoming($query)
    {
        return $query->where('assignment_date', '>=', today())
            ->whereIn('status', ['assigned']);
    }
    
    /**
     * Scope a query to get past assignments
     */
    public function scopePast($query)
    {
        return $query->where('assignment_date', '<', today());
    }
    
    // ========================================
    // ACCESSORS & MUTATORS
    // ========================================
    
    /**
     * Check if assignment is completed
     */
    public function getIsCompletedAttribute()
    {
        return $this->status === 'completed';
    }
    
    /**
     * Check if assignment is cancelled
     */
    public function getIsCancelledAttribute()
    {
        return $this->status === 'cancelled';
    }
    
    /**
     * Check if assignment is no-show
     */
    public function getIsNoShowAttribute()
    {
        return $this->status === 'no_show';
    }
    
    /**
     * Check if assignment can be completed
     */
    public function getCanBeCompletedAttribute()
    {
        // Can only complete assignments that are still 'assigned'
        return $this->status === 'assigned';
    }
    
    /**
     * Check if assignment can be cancelled
     */
    public function getCanBeCancelledAttribute()
    {
        // Can only cancel assignments that are still 'assigned'
        return $this->status === 'assigned';
    }
    
    /**
     * Get duration in minutes
     */
    public function getDurationMinutesAttribute()
    {
        if ($this->start_time && $this->end_time) {
            $start = \Carbon\Carbon::parse($this->start_time);
            $end = \Carbon\Carbon::parse($this->end_time);
            return $end->diffInMinutes($start);
        }
        return null;
    }
    
    /**
     * Get duration in hours
     */
    public function getDurationHoursAttribute()
    {
        if ($this->start_time && $this->end_time) {
            $start = \Carbon\Carbon::parse($this->start_time);
            $end = \Carbon\Carbon::parse($this->end_time);
            return round($end->diffInMinutes($start) / 60, 2);
        }
        return null;
    }
    
    // ========================================
    // CUSTOM METHODS
    // ========================================
    
    /**
     * Mark assignment as completed
     */
    public function markAsCompleted($userId = null)
    {
        if ($this->status !== 'assigned') {
            return false;
        }
        
        $this->status = 'completed';
        return $this->save();
    }
    
    /**
     * Mark assignment as no-show
     */
    public function markAsNoShow($userId = null)
    {
        if ($this->status !== 'assigned') {
            return false;
        }
        
        $this->status = 'no_show';
        return $this->save();
    }
    
    /**
     * Cancel the assignment
     */
    public function cancel($reason = null)
    {
        if ($this->status !== 'assigned') {
            return false;
        }
        
        $this->status = 'cancelled';
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n\n" : '') . "Cancellation Reason: " . $reason;
        }
        return $this->save();
    }
    
    /**
     * Check if volunteer has attendance record
     */
    public function hasAttendance()
    {
        return $this->attendanceRecords()->exists();
    }
    
    /**
     * Get attendance record
     */
    public function getAttendanceRecord()
    {
        return $this->attendanceRecords()->first();
    }
    
    /**
     * Get assignment with full details
     */
    public static function getWithDetails($id)
    {
        return self::where('id', $id)
            ->with([
                'volunteer:id,volunteer_id,full_name,mobile_primary',
                'department:id,department_name,department_code',
                'task:id,task_name,task_code,default_time_slot',
                'assignedByUser:id,name,email',
                'attendanceRecords'
            ])
            ->first();
    }
    
    /**
     * Get assignments for a specific date with all details
     */
    public static function getForDate($date, $departmentId = null, $taskId = null)
    {
        $query = self::whereDate('assignment_date', $date)
            ->with([
                'volunteer:id,volunteer_id,full_name,mobile_primary',
                'department:id,department_name,department_code',
                'task:id,task_name,task_code',
                'assignedByUser:id,name'
            ])
            ->orderBy('start_time');
        
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }
        
        if ($taskId) {
            $query->where('task_id', $taskId);
        }
        
        return $query->get();
    }
    
    /**
     * Get volunteer's assignments
     */
    public static function getVolunteerAssignments($volunteerId, $status = null, $startDate = null, $endDate = null)
    {
        $query = self::where('volunteer_id', $volunteerId)
            ->with([
                'department:id,department_name',
                'task:id,task_name,task_code',
                'assignedByUser:id,name'
            ])
            ->orderBy('assignment_date', 'desc');
        
        if ($status) {
            $query->where('status', $status);
        }
        
        if ($startDate && $endDate) {
            $query->whereBetween('assignment_date', [$startDate, $endDate]);
        }
        
        return $query->get();
    }
    
    /**
     * Get department assignments statistics
     */
    public static function getDepartmentStatistics($departmentId, $startDate = null, $endDate = null)
    {
        $query = self::where('department_id', $departmentId);
        
        if ($startDate && $endDate) {
            $query->whereBetween('assignment_date', [$startDate, $endDate]);
        }
        
        return [
            'total_assignments' => $query->count(),
            'assigned' => (clone $query)->where('status', 'assigned')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
            'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
            'no_show' => (clone $query)->where('status', 'no_show')->count(),
            'unique_volunteers' => (clone $query)->distinct('volunteer_id')->count('volunteer_id'),
        ];
    }
    
    /**
     * Get task assignments statistics
     */
    public static function getTaskStatistics($taskId, $startDate = null, $endDate = null)
    {
        $query = self::where('task_id', $taskId);
        
        if ($startDate && $endDate) {
            $query->whereBetween('assignment_date', [$startDate, $endDate]);
        }
        
        return [
            'total_assignments' => $query->count(),
            'assigned' => (clone $query)->where('status', 'assigned')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
            'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
            'no_show' => (clone $query)->where('status', 'no_show')->count(),
            'unique_volunteers' => (clone $query)->distinct('volunteer_id')->count('volunteer_id'),
        ];
    }
    
    /**
     * Check for scheduling conflicts
     */
    public static function hasConflict($volunteerId, $assignmentDate, $startTime, $endTime, $excludeId = null)
    {
        $query = self::where('volunteer_id', $volunteerId)
            ->whereDate('assignment_date', $assignmentDate)
            ->where('status', 'assigned');
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        // Check for time overlap
        $query->where(function($q) use ($startTime, $endTime) {
            $q->where(function($q2) use ($startTime, $endTime) {
                // New assignment starts during existing assignment
                $q2->where('start_time', '<=', $startTime)
                   ->where('end_time', '>', $startTime);
            })->orWhere(function($q2) use ($startTime, $endTime) {
                // New assignment ends during existing assignment
                $q2->where('start_time', '<', $endTime)
                   ->where('end_time', '>=', $endTime);
            })->orWhere(function($q2) use ($startTime, $endTime) {
                // New assignment completely contains existing assignment
                $q2->where('start_time', '>=', $startTime)
                   ->where('end_time', '<=', $endTime);
            });
        });
        
        return $query->exists();
    }
    
    // ========================================
    // EVENTS
    // ========================================
    
    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        // Set assigned_at and assigned_by on create
        static::creating(function ($assignment) {
            if (auth()->check()) {
                $assignment->assigned_by = auth()->id();
            }
            if (!$assignment->assigned_at) {
                $assignment->assigned_at = now();
            }
        });
    }
    
    // ========================================
    // VALIDATION RULES
    // ========================================
    
    /**
     * Get validation rules for creating assignment
     */
    public static function createRules()
    {
        return [
            'volunteer_id' => 'required|uuid|exists:volunteers,id',
            'department_id' => 'required|uuid|exists:volunteer_departments,id',
            'task_id' => 'required|uuid|exists:volunteer_tasks,id',
            'assignment_date' => 'required|date',
            'time_slot' => 'nullable|string|max:50',
            'start_time' => 'nullable|date_format:H:i:s',
            'end_time' => 'nullable|date_format:H:i:s|after:start_time',
            'notes' => 'nullable|string',
            'status' => 'required|in:assigned,completed,cancelled,no_show'
        ];
    }
    
    /**
     * Get validation rules for updating assignment
     */
    public static function updateRules()
    {
        return [
            'assignment_date' => 'sometimes|required|date',
            'time_slot' => 'nullable|string|max:50',
            'start_time' => 'nullable|date_format:H:i:s',
            'end_time' => 'nullable|date_format:H:i:s|after:start_time',
            'notes' => 'nullable|string',
            'status' => 'sometimes|required|in:assigned,completed,cancelled,no_show'
        ];
    }
    
    /**
     * Get validation messages
     */
    public static function validationMessages()
    {
        return [
            'volunteer_id.required' => 'Volunteer is required',
            'volunteer_id.exists' => 'Selected volunteer does not exist',
            'department_id.required' => 'Department is required',
            'department_id.exists' => 'Selected department does not exist',
            'task_id.required' => 'Task is required',
            'task_id.exists' => 'Selected task does not exist',
            'assignment_date.required' => 'Assignment date is required',
            'assignment_date.date' => 'Invalid assignment date',
            'start_time.date_format' => 'Start time must be in HH:MM:SS format',
            'end_time.date_format' => 'End time must be in HH:MM:SS format',
            'end_time.after' => 'End time must be after start time',
            'status.required' => 'Status is required',
            'status.in' => 'Status must be: assigned, completed, cancelled, or no_show'
        ];
    }

       public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');

    }
}