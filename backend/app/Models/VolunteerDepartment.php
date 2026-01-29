<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\DB;

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
        'department_name_en', 
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
     * Department can only be deleted if it has no tasks and no volunteers assigned
     */
    public function getCanBeDeletedAttribute()
    {
        // Check if has tasks
        $hasTasks = $this->tasks()->whereNull('deleted_at')->exists();
        
        // Check if has volunteers (using raw query since Volunteer model doesn't exist yet)
        $hasVolunteers = DB::table('volunteers')
            ->where('preferred_department_id', $this->id)
            ->whereNull('deleted_at')
            ->exists();
        
        // Check if has assignments (using raw query)
        $hasAssignments = DB::table('volunteer_task_assignments')
            ->where('department_id', $this->id)
            ->exists();
        
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
     * Get volunteers count (using raw query)
     */
    public function getVolunteersCount()
    {
        return DB::table('volunteers')
            ->where('preferred_department_id', $this->id)
            ->whereNull('deleted_at')
            ->count();
    }
    
    /**
     * Get active volunteers count (using raw query)
     */
    public function getActiveVolunteersCount()
    {
        return DB::table('volunteers')
            ->where('preferred_department_id', $this->id)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
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
    public static function getWithDetails($id)
    {
        return self::where('id', $id)
            ->whereNull('deleted_at')
            ->with([
                'coordinatorUser:id,name,email,mobile',
                'tasks' => function($query) {
                    $query->whereNull('deleted_at')
                          ->orderBy('task_name');
                }
            ])
            ->first();
    }
    
    /**
     * Get all active departments
     */
    public static function getActive()
    {
        return self::where('status', 'active')
            ->whereNull('deleted_at')
            ->orderBy('department_name')
            ->get();
    }
    
    /**
     * Search departments
     */
    public static function searchDepartments($search = null, $status = null)
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
            'department_name' => 'required|string|max:100|unique:volunteer_departments,department_name,NULL,id,deleted_at,NULL',
            'department_code' => 'required|string|max:20|unique:volunteer_departments,department_code,NULL,id,deleted_at,NULL',
            'description' => 'nullable|string',
            'coordinator_user_id' => 'nullable|uuid|exists:users,id',
            'capacity_target' => 'nullable|integer|min:0',
            'status' => 'required|in:active,inactive'
        ];
    }
    
    /**
     * Get validation rules for updating department
     */
    public static function updateRules($id)
    {
        return [
            'department_name' => 'required|string|max:100|unique:volunteer_departments,department_name,' . $id . ',id,deleted_at,NULL',
            'department_code' => 'required|string|max:20|unique:volunteer_departments,department_code,' . $id . ',id,deleted_at,NULL',
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
            'department_name.unique' => 'A department with this name already exists',
            'department_name.max' => 'Department name cannot exceed 100 characters',
            'department_code.required' => 'Department code is required',
            'department_code.unique' => 'A department with this code already exists',
            'department_code.max' => 'Department code cannot exceed 20 characters',
            'coordinator_user_id.uuid' => 'Invalid coordinator ID format',
            'coordinator_user_id.exists' => 'Selected coordinator does not exist',
            'capacity_target.integer' => 'Capacity target must be a number',
            'capacity_target.min' => 'Capacity target cannot be negative',
            'status.required' => 'Status is required',
            'status.in' => 'Status must be either active or inactive'
        ];
    }

    public function getDisplayNameAttribute()
{
    // Return Chinese name, with English in parentheses if available
    if ($this->department_name_en) {
        return "{$this->department_name} ({$this->department_name_en})";
    }
    return $this->department_name;
}
}