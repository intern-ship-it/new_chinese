<?php

namespace App\Http\Controllers;

use App\Models\VolunteerTask;
use App\Models\VolunteerDepartment;
use App\Models\VolunteerTaskAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VolunteerTaskController extends Controller
{
    /**
     * Convert skills string to array and format for PostgreSQL
     */
    private function convertSkillsToArray($skillsString)
    {
        if (empty($skillsString)) {
            return null;
        }
        
        if (is_array($skillsString)) {
            return $skillsString;
        }
        
        // Split by comma and clean up
        $skills = array_map('trim', explode(',', $skillsString));
        
        // Remove empty values
        $skills = array_filter($skills, function($skill) {
            return !empty($skill);
        });
        
        // Return as array values (reindex)
        return !empty($skills) ? array_values($skills) : null;
    }
    
    /**
     * Format array for PostgreSQL text[] insertion
     */
    private function formatPostgresArray($array)
    {
        if (empty($array)) {
            return null;
        }
        
        // Escape and quote each element
        $escapedValues = array_map(function($value) {
            // Escape backslashes and quotes
            $escaped = str_replace('\\', '\\\\', $value);
            $escaped = str_replace('"', '\\"', $escaped);
            return '"' . $escaped . '"';
        }, $array);
        
        return '{' . implode(',', $escapedValues) . '}';
    }
    
    /**
     * Display a listing of tasks
     */
   public function index(Request $request)
{
    try {
        $query = VolunteerTask::whereNull('deleted_at')
            ->with([
                'department:id,department_name,department_name_en,department_code',
                'creatorUser:id,name'
            ]);
        
        // Apply search filter
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('task_name', 'ILIKE', "%{$search}%")
                  ->orWhere('task_code', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }
        
        // Apply status filter
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }
        
        // Apply department filter
        if ($request->has('department_id') && !empty($request->department_id)) {
            $query->where('department_id', $request->department_id);
        }
        
        // Get tasks
        $tasks = $query->orderBy('task_code')->get();
        
        // Transform data for frontend
        $tasks->transform(function($task) {
            // Get assignments count
            $task->assignments_count = VolunteerTaskAssignment::where('task_id', $task->id)->count();
            $task->active_assignments_count = VolunteerTaskAssignment::where('task_id', $task->id)
                ->where('status', 'assigned')->count();
            
            //  IMPROVED: Convert skill_tags array to comma-separated string
            $skillTags = $task->skill_tags; // This now uses the accessor
            // Log::info('Task skills debug:', [
            //     'task_id' => $task->id,
            //     'skill_tags_raw' => $task->getRawOriginal('skill_tags'),
            //     'skill_tags_accessor' => $skillTags,
            //     'is_array' => is_array($skillTags)
            // ]);
            
            if (is_array($skillTags) && !empty($skillTags)) {
                $task->skills_required = implode(', ', $skillTags);
            } else {
                $task->skills_required = '';
            }
            
            // Map other fields for frontend
            $task->time_slot = $task->default_time_slot;
            $task->estimated_duration = $task->estimated_duration_hours ? round($task->estimated_duration_hours * 60) : 0;
            
            return $task;
        });
        
        return response()->json([
            'success' => true,
            'data' => $tasks,
            'total' => $tasks->count()
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error fetching tasks: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch tasks',
            'error' => $e->getMessage()
        ], 500);
    }
}
    
    /**
     * Get only active tasks (for dropdowns)
     */
    public function active(Request $request)
    {
        try {
            $tasks = VolunteerTask::where('status', 'active')
                ->whereNull('deleted_at')
                ->with('department:id,department_name')
                ->orderBy('task_name')
                ->get()
                ->map(function($task) {
                    $task->time_slot = $task->default_time_slot;
                    $task->estimated_duration = $task->estimated_duration_hours ? round($task->estimated_duration_hours * 60) : 0;
                    if (is_array($task->skill_tags)) {
                        $task->skills_required = implode(', ', $task->skill_tags);
                    }
                    return $task;
                });
            
            return response()->json([
                'success' => true,
                'data' => $tasks
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching active tasks: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active tasks',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get tasks by department
     */
    public function byDepartment(Request $request, $departmentId)
    {
        try {
            $tasks = VolunteerTask::where('department_id', $departmentId)
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->orderBy('task_name')
                ->get()
                ->map(function($task) {
                    $task->time_slot = $task->default_time_slot;
                    $task->estimated_duration = $task->estimated_duration_hours ? round($task->estimated_duration_hours * 60) : 0;
                    return $task;
                });
            
            return response()->json([
                'success' => true,
                'data' => $tasks
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching tasks by department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tasks',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Display the specified task
     */
   public function show(Request $request, $id)
{
    try {
        $task = VolunteerTask::where('id', $id)
            ->whereNull('deleted_at')
            ->with([
                'department:id,department_name,department_name_en,department_code',
                'creatorUser:id,name,email'
            ])
            ->first();
        
        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found'
            ], 404);
        }
        
        // Add statistics
        $task->assignments_count = VolunteerTaskAssignment::where('task_id', $id)->count();
        $task->active_assignments_count = VolunteerTaskAssignment::where('task_id', $id)
            ->where('status', 'assigned')->count();
        
        // ⭐ IMPROVED: Convert skill_tags using accessor
        $skillTags = $task->skill_tags; // Uses the accessor
        Log::info('Show task skills debug:', [
            'task_id' => $id,
            'skill_tags_raw' => $task->getRawOriginal('skill_tags'),
            'skill_tags_accessor' => $skillTags,
            'is_array' => is_array($skillTags)
        ]);
        
        if (is_array($skillTags) && !empty($skillTags)) {
            $task->skills_required = implode(', ', $skillTags);
        } else {
            $task->skills_required = '';
        }
        
        // Map other fields for frontend
        $task->time_slot = $task->default_time_slot;
        $task->estimated_duration = $task->estimated_duration_hours ? round($task->estimated_duration_hours * 60) : 0;
        
        return response()->json([
            'success' => true,
            'data' => $task
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error fetching task: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch task details',
            'error' => $e->getMessage()
        ], 500);
    }
}
    /**
     * Store a newly created task
     */
    public function store(Request $request)
    {
        try {
            Log::info('Creating task - Request:', $request->all());
            
            // Map frontend fields to database columns
            $data = $request->all();
            
            // Convert skills string to array
            if (isset($data['skills_required'])) {
                $data['skill_tags'] = $this->convertSkillsToArray($data['skills_required']);
                unset($data['skills_required']);
            }
            
            // Map time_slot to default_time_slot
            if (isset($data['time_slot'])) {
                $data['default_time_slot'] = $data['time_slot'];
                unset($data['time_slot']);
            }
            
            // Convert minutes to hours
            if (isset($data['estimated_duration'])) {
                $data['estimated_duration_hours'] = $data['estimated_duration'] ? round($data['estimated_duration'] / 60, 2) : 0;
                unset($data['estimated_duration']);
            }
            
            // Remove fields not in database
            unset($data['max_volunteers']);
            
            Log::info('Mapped data:', $data);
            
            // Validate
            $validator = Validator::make($data, [
                'department_id' => 'required|uuid|exists:volunteer_departments,id',
                'task_name' => 'required|string|max:100',
                'task_code' => 'required|string|max:20',
                'description' => 'nullable|string',
                'skill_tags' => 'nullable|array',
                'skill_tags.*' => 'string|max:50',
                'default_time_slot' => 'nullable|string|max:50',
                'estimated_duration_hours' => 'nullable|numeric|min:0',
                'status' => 'required|in:active,inactive'
            ]);
            
            if ($validator->fails()) {
                Log::error('Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $userId = auth()->id();
            
            // Verify department
            $department = VolunteerDepartment::where('id', $data['department_id'])
                ->whereNull('deleted_at')
                ->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected department not found'
                ], 404);
            }
            
            if ($department->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot create task for inactive department'
                ], 422);
            }
            
            // Check duplicate task code
            $exists = VolunteerTask::where('department_id', $data['department_id'])
                ->where('task_code', strtoupper($data['task_code']))
                ->whereNull('deleted_at')
                ->exists();
            
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task code already exists in this department'
                ], 422);
            }
            
            // Use transaction
            DB::beginTransaction();
            
            try {
                // Generate UUID
                $uuid = (string) Str::uuid();
                
                // Prepare insert data
                $insertData = [
                    'id' => $uuid,
                    'department_id' => $data['department_id'],
                    'task_name' => $data['task_name'],
                    'task_code' => strtoupper($data['task_code']),
                    'description' => $data['description'] ?? null,
                    'default_time_slot' => $data['default_time_slot'] ?? null,
                    'estimated_duration_hours' => $data['estimated_duration_hours'] ?? 0,
                    'status' => $data['status'],
                    'created_by' => $userId,
                    'updated_by' => $userId,
                    'created_at' => now(),
                    'updated_at' => now()
                ];
                
                // Handle skill_tags array for PostgreSQL
                if (!empty($data['skill_tags'])) {
                    $pgArray = $this->formatPostgresArray($data['skill_tags']);
                    DB::statement("
                        INSERT INTO volunteer_tasks 
                        (id, department_id, task_name, task_code, description, skill_tags, 
                         default_time_slot, estimated_duration_hours, status, created_by, updated_by, 
                         created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?::text[], ?, ?, ?, ?, ?, ?, ?)
                    ", [
                        $insertData['id'],
                        $insertData['department_id'],
                        $insertData['task_name'],
                        $insertData['task_code'],
                        $insertData['description'],
                        $pgArray,
                        $insertData['default_time_slot'],
                        $insertData['estimated_duration_hours'],
                        $insertData['status'],
                        $insertData['created_by'],
                        $insertData['updated_by'],
                        $insertData['created_at'],
                        $insertData['updated_at']
                    ]);
                } else {
                    // No skills - use null
                    DB::statement("
                        INSERT INTO volunteer_tasks 
                        (id, department_id, task_name, task_code, description, skill_tags, 
                         default_time_slot, estimated_duration_hours, status, created_by, updated_by, 
                         created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
                    ", [
                        $insertData['id'],
                        $insertData['department_id'],
                        $insertData['task_name'],
                        $insertData['task_code'],
                        $insertData['description'],
                        $insertData['default_time_slot'],
                        $insertData['estimated_duration_hours'],
                        $insertData['status'],
                        $insertData['created_by'],
                        $insertData['updated_by'],
                        $insertData['created_at'],
                        $insertData['updated_at']
                    ]);
                }
                
                DB::commit();
                
                // Load created task
                $task = VolunteerTask::where('id', $uuid)
                    ->with('department:id,department_name,department_code')
                    ->first();
                
                Log::info('Task created', ['task_id' => $task->id]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Task created successfully',
                    'data' => $task
                ], 201);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error creating task: ' . $e->getMessage());
            Log::error('Stack: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create task',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update the specified task
     */
    public function update(Request $request, $id)
    {
        try {
            Log::info('Updating task - Request:', $request->all());
            
            // Map frontend fields
            $data = $request->all();
            
            // Only convert skills if it's present in request
            $hasSkillsUpdate = isset($data['skills_required']);
            if ($hasSkillsUpdate) {
                $data['skill_tags'] = $this->convertSkillsToArray($data['skills_required']);
                unset($data['skills_required']);
            }
            
            if (isset($data['time_slot'])) {
                $data['default_time_slot'] = $data['time_slot'];
                unset($data['time_slot']);
            }
            
            if (isset($data['estimated_duration'])) {
                $data['estimated_duration_hours'] = $data['estimated_duration'] ? round($data['estimated_duration'] / 60, 2) : 0;
                unset($data['estimated_duration']);
            }
            
            unset($data['max_volunteers']);
            
            Log::info('Mapped update data:', $data);
            
            // Validate
            $validator = Validator::make($data, [
                'department_id' => 'required|uuid|exists:volunteer_departments,id',
                'task_name' => 'required|string|max:100',
                'task_code' => 'required|string|max:20',
                'description' => 'nullable|string',
                'skill_tags' => 'nullable|array',
                'skill_tags.*' => 'string|max:50',
                'default_time_slot' => 'nullable|string|max:50',
                'estimated_duration_hours' => 'nullable|numeric|min:0',
                'status' => 'required|in:active,inactive'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $userId = auth()->id();
            
            // Find task
            $task = VolunteerTask::where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task not found'
                ], 404);
            }
            
            // Verify department
            $department = VolunteerDepartment::where('id', $data['department_id'])
                ->whereNull('deleted_at')->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            // Check duplicate code
            $exists = VolunteerTask::where('department_id', $data['department_id'])
                ->where('id', '!=', $id)
                ->where('task_code', strtoupper($data['task_code']))
                ->whereNull('deleted_at')
                ->exists();
            
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task code already exists in this department'
                ], 422);
            }
            
            // Use transaction
            DB::beginTransaction();
            
            try {
                // Update with PostgreSQL array handling
                // Only update skill_tags if it was in the request
                if ($hasSkillsUpdate) {
                    if (!empty($data['skill_tags'])) {
                        $pgArray = $this->formatPostgresArray($data['skill_tags']);
                        DB::statement("
                            UPDATE volunteer_tasks 
                            SET department_id = ?, task_name = ?, task_code = ?, description = ?,
                                skill_tags = ?::text[], default_time_slot = ?, 
                                estimated_duration_hours = ?, status = ?, updated_by = ?, updated_at = ?
                            WHERE id = ?
                        ", [
                            $data['department_id'],
                            $data['task_name'],
                            strtoupper($data['task_code']),
                            $data['description'] ?? null,
                            $pgArray,
                            $data['default_time_slot'] ?? null,
                            $data['estimated_duration_hours'] ?? 0,
                            $data['status'],
                            $userId,
                            now(),
                            $id
                        ]);
                    } else {
                        // Skills explicitly set to null/empty
                        DB::statement("
                            UPDATE volunteer_tasks 
                            SET department_id = ?, task_name = ?, task_code = ?, description = ?,
                                skill_tags = NULL, default_time_slot = ?, 
                                estimated_duration_hours = ?, status = ?, updated_by = ?, updated_at = ?
                            WHERE id = ?
                        ", [
                            $data['department_id'],
                            $data['task_name'],
                            strtoupper($data['task_code']),
                            $data['description'] ?? null,
                            $data['default_time_slot'] ?? null,
                            $data['estimated_duration_hours'] ?? 0,
                            $data['status'],
                            $userId,
                            now(),
                            $id
                        ]);
                    }
                } else {
                    // Don't update skill_tags - keep existing value
                    DB::statement("
                        UPDATE volunteer_tasks 
                        SET department_id = ?, task_name = ?, task_code = ?, description = ?,
                            default_time_slot = ?, estimated_duration_hours = ?, 
                            status = ?, updated_by = ?, updated_at = ?
                        WHERE id = ?
                    ", [
                        $data['department_id'],
                        $data['task_name'],
                        strtoupper($data['task_code']),
                        $data['description'] ?? null,
                        $data['default_time_slot'] ?? null,
                        $data['estimated_duration_hours'] ?? 0,
                        $data['status'],
                        $userId,
                        now(),
                        $id
                    ]);
                }
                
                DB::commit();
                
                // Reload task
                $task = VolunteerTask::where('id', $id)
                    ->with('department:id,department_name,department_code')
                    ->first();
                
                Log::info('Task updated', ['task_id' => $id]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Task updated successfully',
                    'data' => $task
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error updating task: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update task',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Soft delete task
     */
    public function destroy(Request $request, $id)
    {
        try {
            $userId = auth()->id();
            
            $task = VolunteerTask::where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task not found'
                ], 404);
            }
            
            // Check assignments
            $hasAssignments = VolunteerTaskAssignment::where('task_id', $id)->exists();
            
            if ($hasAssignments) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete task with assignments. Please deactivate instead.',
                    'can_delete' => false
                ], 422);
            }
            
            $task->update([
                'deleted_at' => now(),
                'updated_by' => $userId
            ]);
            
            Log::info('Task deleted', ['task_id' => $id]);
            
            return response()->json([
                'success' => true,
                'message' => 'Task deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting task: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete task',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Toggle task status
     */
    public function toggleStatus(Request $request, $id)
    {
        try {
            $userId = auth()->id();
            
            $task = VolunteerTask::where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task not found'
                ], 404);
            }
            
            $newStatus = $task->status === 'active' ? 'inactive' : 'active';
            
            $task->update([
                'status' => $newStatus,
                'updated_by' => $userId
            ]);
            
            Log::info('Task status toggled', ['task_id' => $id, 'new_status' => $newStatus]);
            
            return response()->json([
                'success' => true,
                'message' => 'Task status updated',
                'data' => ['id' => $task->id, 'status' => $newStatus]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error toggling status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Check if task can be deleted
     */
    public function canDelete(Request $request, $id)
    {
        try {
            $task = VolunteerTask::where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Task not found'
                ], 404);
            }
            
            $assignmentsCount = VolunteerTaskAssignment::where('task_id', $id)->count();
            $canDelete = $assignmentsCount === 0;
            
            return response()->json([
                'success' => true,
                'can_delete' => $canDelete,
                'reasons' => $canDelete ? [] : ["Task has {$assignmentsCount} assignment(s)"],
                'message' => $canDelete ? 'Task can be deleted' : 'Task cannot be deleted',
                'suggestion' => $canDelete ? null : 'Deactivate the task instead'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking delete: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to check delete permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}