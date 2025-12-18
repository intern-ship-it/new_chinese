<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class VolunteerDepartment extends Model
{
    use HasUuids;
    
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'volunteer_departments';
    
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
        'department_name',
        'department_code',
        'description',
        'status',
        'coordinator_user_id',
        'capacity_target',
        'created_by',
        'updated_by',
        'deleted_at'
    ];
    
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'capacity_target' => 'integer'
    ];
    
    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'created_by',
        'updated_by'
    ];
    
    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'is_active',
        'can_be_deleted'
    ];
    
    // ========================================
    // RELATIONSHIPS
    // ========================================

    
    /**
     * Get the coordinator user
     */
    public function coordinatorUser()
    {
        return $this->belongsTo(User::class, 'coordinator_user_id');
    }
    
    /**
     * Get the user who created this department
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get the user who last updated this department
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    /**
     * Get all tasks for this department
     */
    public function tasks()
    {
        return $this->hasMany(VolunteerTask::class, 'department_id');
    }
    
    /**
     * Get active tasks for this department
     */
    public function activeTasks()
    {
        return $this->hasMany(VolunteerTask::class, 'department_id')
            ->where('status', 'active')
            ->whereNull('deleted_at');
    }
    
    /**
     * Get volunteers who prefer this department
     */
    public function volunteers()
    {
        return $this->hasMany(Volunteer::class, 'preferred_department_id');
    }
    
    /**
     * Get active volunteers who prefer this department
     */
    public function activeVolunteers()
    {
        return $this->hasMany(Volunteer::class, 'preferred_department_id')
            ->where('status', 'active')
            ->whereNull('deleted_at');
    }
    
    /**
     * Get all task assignments for this department
     */
    public function taskAssignments()
    {
        return $this->hasMany(VolunteerTaskAssignment::class, 'department_id');
    }
    
    /**
     * Get all attendance records for this department
     */
    public function attendanceRecords()
    {
        return $this->hasMany(VolunteerAttendance::class, 'department_id');
    }
    
    // ========================================
    // SCOPES
    // ========================================
    
    /**
     * Scope a query to only include active departments
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
    
    /**
     * Scope a query to only include inactive departments
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }
    
    /**
     * Scope a query to exclude soft deleted departments
     */
    public function scopeNotDeleted($query)
    {
        return $query->whereNull('deleted_at');
    }
    

    /**
     * Scope a query to search by name or code
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('department_name', 'ILIKE', "%{$search}%")
              ->orWhere('department_code', 'ILIKE', "%{$search}%")
              ->orWhere('description', 'ILIKE', "%{$search}%");
        });
    }
    
    /**
     * Scope to get departments with tasks
     */
    public function scopeWithTasks($query)
    {
        return $query->has('tasks');
    }
    
    /**
     * Scope to get departments without tasks
     */
    public function scopeWithoutTasks($query)
    {
        return $query->doesntHave('tasks');
    }
    
    // ========================================
    // ACCESSORS & MUTATORS
    // ========================================
    
    /**
     * Check if department is active
     */
    public function getIsActiveAttribute()
    {
        return $this->status === 'active';
    }
    
    /**
     * Check if department can be deleted
     */
    public function getCanBeDeletedAttribute()
    {
        // Department can only be deleted if:
        // 1. It has no tasks
        // 2. It has no volunteers assigned
        // 3. It has no task assignments
        
        $hasTasks = $this->tasks()->whereNull('deleted_at')->exists();
        $hasVolunteers = $this->volunteers()->whereNull('deleted_at')->exists();
        $hasAssignments = $this->taskAssignments()->exists();
        
        return !$hasTasks && !$hasVolunteers && !$hasAssignments;
    }
    
    /**
     * Get the department code in uppercase
     */
    public function getDepartmentCodeAttribute($value)
    {
        return strtoupper($value);
    }
    
    /**
     * Set the department code to uppercase
     */
    public function setDepartmentCodeAttribute($value)
    {
        $this->attributes['department_code'] = strtoupper($value);
    }
    
    // ========================================
    // CUSTOM METHODS
    // ========================================
    
    /**
     * Get tasks count
     */
    public function getTasksCount()
    {
        return $this->tasks()->whereNull('deleted_at')->count();
    }
    
    /**
     * Get active tasks count
     */
    public function getActiveTasksCount()
    {
        return $this->activeTasks()->count();
    }
    
    /**
     * Get volunteers count
     */
    public function getVolunteersCount()
    {
        return $this->volunteers()->whereNull('deleted_at')->count();
    }
    
    /**
     * Get active volunteers count
     */
    public function getActiveVolunteersCount()
    {
        return $this->activeVolunteers()->count();
    }
    
    /**
     * Get current capacity utilization percentage
     */
    public function getCapacityUtilization()
    {
        if ($this->capacity_target == 0) {
            return 0;
        }
        
        $currentCount = $this->getActiveVolunteersCount();
        return round(($currentCount / $this->capacity_target) * 100, 2);
    }
    
    /**
     * Check if department has reached capacity
     */
    public function hasReachedCapacity()
    {
        if ($this->capacity_target == 0) {
            return false;
        }
        
        return $this->getActiveVolunteersCount() >= $this->capacity_target;
    }
    
    /**
     * Soft delete the department
     */
    public function softDelete()
    {
        $this->deleted_at = now();
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Restore soft deleted department
     */
    public function restore()
    {
        $this->deleted_at = null;
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Activate the department
     */
    public function activate()
    {
        $this->status = 'active';
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Deactivate the department
     */
    public function deactivate()
    {
        $this->status = 'inactive';
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Toggle department status
     */
    public function toggleStatus()
    {
        $this->status = $this->status === 'active' ? 'inactive' : 'active';
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Get department with full details
     */
    public static function getWithDetails($id, $templeId)
    {
        return self::where('id', $id)
            ->whereNull('deleted_at')
            ->with([
                'coordinatorUser:id,name,email,mobile',
                'tasks' => function($query) {
                    $query->whereNull('deleted_at')
                          ->orderBy('task_name');
                },
                'activeVolunteers:id,volunteer_id,full_name,mobile_primary,status'
            ])
            ->first();
    }
    
    /**
     * Get all active departments for a temple
     */
    public static function getActiveForTemple($templeId)
    {
        return self::where('status', 'active')
            ->whereNull('deleted_at')
            ->orderBy('department_name')
            ->get();
    }
    
    /**
     * Search departments
     */
    public static function searchDepartments($templeId, $search = null, $status = null)
    {
        $query = self::whereNull('deleted_at');
        
        if ($search) {
            $query->search($search);
        }
        
        if ($status) {
            $query->where('status', $status);
        }
        
        return $query->orderBy('department_code')->get();
    }
    
    // ========================================
    // EVENTS
    // ========================================
    
    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        // Set updated_by on update
        static::updating(function ($department) {
            if (auth()->check()) {
                $department->updated_by = auth()->id();
            }
        });
        
        // Set created_by and updated_by on create
        static::creating(function ($department) {
            if (auth()->check()) {
                $department->created_by = auth()->id();
                $department->updated_by = auth()->id();
            }
        });
    }
    
    // ========================================
    // VALIDATION RULES
    // ========================================
    
    /**
     * Get validation rules for creating department
     */
    public static function createRules()
    {
        return [
            'department_name' => 'required|string|max:100',
            'department_code' => 'required|string|max:20',
            'description' => 'nullable|string',
            'coordinator_user_id' => 'nullable|uuid|exists:users,id',
            'capacity_target' => 'nullable|integer|min:0',
            'status' => 'required|in:active,inactive'
        ];
    }
    
    /**
     * Get validation rules for updating department
     */
    public static function updateRules()
    {
        return [
            'department_name' => 'required|string|max:100',
            'department_code' => 'required|string|max:20',
            'description' => 'nullable|string',
            'coordinator_user_id' => 'nullable|uuid|exists:users,id',
            'capacity_target' => 'nullable|integer|min:0',
            'status' => 'required|in:active,inactive'
        ];
    }
    
    /**
     * Get validation messages
     */
    public static function validationMessages()
    {
        return [
            'department_name.required' => 'Department name is required',
            'department_name.max' => 'Department name cannot exceed 100 characters',
            'department_code.required' => 'Department code is required',
            'department_code.max' => 'Department code cannot exceed 20 characters',
            'coordinator_user_id.uuid' => 'Invalid coordinator ID format',
            'coordinator_user_id.exists' => 'Selected coordinator does not exist',
            'capacity_target.integer' => 'Capacity target must be a number',
            'capacity_target.min' => 'Capacity target cannot be negative',
            'status.required' => 'Status is required',
            'status.in' => 'Status must be either active or inactive'
        ];
    }
}