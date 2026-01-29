<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

use App\Models\VolunteerDepartment;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class VolunteerTask extends Model
{
    use HasUuids;
    
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'volunteer_tasks';
    
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
        'department_id',
        'task_name',
        'task_code',
        'description',
        'skill_tags',
        'default_time_slot',
        'estimated_duration_hours',
        'status',
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
        'estimated_duration_hours' => 'decimal:2',
           'skill_tags' => 'array',
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
        'can_be_deleted',
        'full_code'
    ];
    
    // ========================================
    // RELATIONSHIPS
    // ========================================
    
    /**
     * Get the department this task belongs to
     */
    public function department()
    {
        return $this->belongsTo(VolunteerDepartment::class, 'department_id');
    }
    
    /**
     * Get the user who created this task
     */
    public function creatorUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get the user who last updated this task
     */
    public function updaterUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    /**
     * Get all assignments for this task
     */
    public function assignments()
    {
        return $this->hasMany(VolunteerTaskAssignment::class, 'task_id');
    }
    
    /**
     * Get active/scheduled assignments for this task
     */
    public function activeAssignments()
    {
        return $this->hasMany(VolunteerTaskAssignment::class, 'task_id')
            ->where('status', 'assigned');
    }
    
    /**
     * Get completed assignments for this task
     */
    public function completedAssignments()
    {
        return $this->hasMany(VolunteerTaskAssignment::class, 'task_id')
            ->where('status', 'completed');
    }
    
    // ========================================
    // SCOPES
    // ========================================
    
    /**
     * Scope a query to only include active tasks
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
    
    /**
     * Scope a query to only include inactive tasks
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }
    
    /**
     * Scope a query to exclude soft deleted tasks
     */
    public function scopeNotDeleted($query)
    {
        return $query->whereNull('deleted_at');
    }
    
    /**
     * Scope a query to filter by department
     */
    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }
    
    /**
     * Scope a query to search by name or code
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('task_name', 'ILIKE', "%{$search}%")
              ->orWhere('task_code', 'ILIKE', "%{$search}%")
              ->orWhere('description', 'ILIKE', "%{$search}%");
        });
    }
    
    /**
     * Scope to get tasks with assignments
     */
    public function scopeWithAssignments($query)
    {
        return $query->has('assignments');
    }
    
    /**
     * Scope to get tasks without assignments
     */
    public function scopeWithoutAssignments($query)
    {
        return $query->doesntHave('assignments');
    }
    
    // ========================================
    // ACCESSORS & MUTATORS
    // ========================================
    
    /**
     * Check if task is active
     */
    public function getIsActiveAttribute()
    {
        return $this->status === 'active';
    }
    
    /**
     * Check if task can be deleted
     */
    public function getCanBeDeletedAttribute()
    {
        // Task can only be deleted if it has no assignments
        return !$this->assignments()->exists();
    }
    
    /**
     * Get full task code (Department-Task)
     */
    public function getFullCodeAttribute()
    {
        if ($this->department) {
            return $this->department->department_code . '-' . $this->task_code;
        }
        return $this->task_code;
    }
    
    /**
     * Get the task code in uppercase
     */
    public function getTaskCodeAttribute($value)
    {
        return strtoupper($value);
    }
    
    /**
     * Set the task code to uppercase
     */
    public function setTaskCodeAttribute($value)
    {
        $this->attributes['task_code'] = strtoupper($value);
    }
    
    /**
     * Get skill tags as comma-separated string for display
     */
    public function getSkillTagsDisplayAttribute()
    {
        if (is_array($this->skill_tags)) {
            return implode(', ', $this->skill_tags);
        }
        return $this->skill_tags;
    }
    
    // ========================================
    // CUSTOM METHODS
    // ========================================
    
    /**
     * Get assignments count
     */
    public function getAssignmentsCount()
    {
        return $this->assignments()->count();
    }
    
    /**
     * Get active assignments count
     */
    public function getActiveAssignmentsCount()
    {
        return $this->activeAssignments()->count();
    }
    
    /**
     * Get completed assignments count
     */
    public function getCompletedAssignmentsCount()
    {
        return $this->completedAssignments()->count();
    }
    
    /**
     * Soft delete the task
     */
    public function softDelete()
    {
        $this->deleted_at = now();
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Restore soft deleted task
     */
    public function restore()
    {
        $this->deleted_at = null;
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Activate the task
     */
    public function activate()
    {
        $this->status = 'active';
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Deactivate the task
     */
    public function deactivate()
    {
        $this->status = 'inactive';
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Toggle task status
     */
    public function toggleStatus()
    {
        $this->status = $this->status === 'active' ? 'inactive' : 'active';
        $this->updated_by = auth()->id();
        return $this->save();
    }
    
    /**
     * Get task with full details
     */
    public static function getWithDetails($id)
    {
        return self::where('id', $id)
            ->whereNull('deleted_at')
            ->with([
                'department:id,department_name,department_code',
                'creatorUser:id,name,email',
                'assignments' => function($query) {
                    $query->where('status', 'assigned')
                          ->orderBy('assignment_date');
                }
            ])
            ->first();
    }
    
    /**
     * Get all active tasks
     */
    public static function getActive()
    {
        return self::where('status', 'active')
            ->whereNull('deleted_at')
            ->with('department:id,department_name')
            ->orderBy('task_name')
            ->get();
    }
    
    /**
     * Get active tasks for a department
     */
    public static function getActiveForDepartment($departmentId)
    {
        return self::where('department_id', $departmentId)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->orderBy('task_name')
            ->get();
    }
    
    /**
     * Search tasks
     */
    public static function searchTasks($search = null, $status = null, $departmentId = null)
    {
        $query = self::whereNull('deleted_at')
            ->with('department:id,department_name,department_code');
        
        if ($search) {
            $query->search($search);
        }
        
        if ($status) {
            $query->where('status', $status);
        }
        
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }
        
        return $query->orderBy('task_code')->get();
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
        static::updating(function ($task) {
            if (auth()->check()) {
                $task->updated_by = auth()->id();
            }
        });
        
        // Set created_by and updated_by on create
        static::creating(function ($task) {
            if (auth()->check()) {
                $task->created_by = auth()->id();
                $task->updated_by = auth()->id();
            }
        });
    }
    
    // ========================================
    // VALIDATION RULES
    // ========================================
    
    /**
     * Get validation rules for creating task
     */
    public static function createRules()
    {
        return [
            'department_id' => 'required|uuid|exists:volunteer_departments,id',
            'task_name' => 'required|string|max:100',
            'task_code' => 'required|string|max:20',
            'description' => 'nullable|string',
            'skill_tags' => 'nullable|array',
            'skill_tags.*' => 'string|max:50',
            'default_time_slot' => 'nullable|string|max:50',
            'estimated_duration_hours' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,inactive'
        ];
    }
    
    /**
     * Get validation rules for updating task
     */
    public static function updateRules()
    {
        return [
            'department_id' => 'required|uuid|exists:volunteer_departments,id',
            'task_name' => 'required|string|max:100',
            'task_code' => 'required|string|max:20',
            'description' => 'nullable|string',
            'skill_tags' => 'nullable|array',
            'skill_tags.*' => 'string|max:50',
            'default_time_slot' => 'nullable|string|max:50',
            'estimated_duration_hours' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,inactive'
        ];
    }
    
    /**
     * Get validation messages
     */
    public static function validationMessages()
    {
        return [
            'department_id.required' => 'Department is required',
            'department_id.uuid' => 'Invalid department ID format',
            'department_id.exists' => 'Selected department does not exist',
            'task_name.required' => 'Task name is required',
            'task_name.max' => 'Task name cannot exceed 100 characters',
            'task_code.required' => 'Task code is required',
            'task_code.max' => 'Task code cannot exceed 20 characters',
            'default_time_slot.max' => 'Time slot cannot exceed 50 characters',
            'estimated_duration_hours.numeric' => 'Estimated duration must be a number',
            'estimated_duration_hours.min' => 'Estimated duration cannot be negative',
            'status.required' => 'Status is required',
            'status.in' => 'Status must be either active or inactive'
        ];
    }
     public function getSkillTagsAttribute($value)
    {
        if (is_null($value) || $value === '') {
            return [];
        }
        
        // If already an array, return it
        if (is_array($value)) {
            return $value;
        }
        
        // Parse PostgreSQL array format: {item1,item2,item3}
        if (is_string($value)) {
            // Remove curly braces
            $value = trim($value, '{}');
            
            if (empty($value)) {
                return [];
            }
            
            // Split by comma and clean up
            $items = explode(',', $value);
            return array_map('trim', $items);
        }
        
        return [];
    }
    
    /**
     * Set skill_tags - ensure it's properly formatted for PostgreSQL
     */
    public function setSkillTagsAttribute($value)
    {
        if (is_null($value) || (is_array($value) && empty($value))) {
            $this->attributes['skill_tags'] = null;
            return;
        }
        
        if (is_array($value)) {
            // Laravel will handle the array to PostgreSQL conversion
            $this->attributes['skill_tags'] = $value;
        } else if (is_string($value)) {
            // Convert comma-separated string to array
            $items = array_map('trim', explode(',', $value));
            $this->attributes['skill_tags'] = array_filter($items);
        }
    }
    
}