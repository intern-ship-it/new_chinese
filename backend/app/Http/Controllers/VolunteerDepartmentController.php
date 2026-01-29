<?php

namespace App\Http\Controllers;

use App\Models\VolunteerDepartment;
use App\Models\VolunteerTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class VolunteerDepartmentController extends Controller
{
    /**
     * Display a listing of departments
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            
            $query = VolunteerDepartment::whereNull('deleted_at')
                ->with(['coordinatorUser:id,name,email']);
            
            // Apply search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('department_name', 'ILIKE', "%{$search}%")
                      ->orWhere('department_code', 'ILIKE', "%{$search}%")
                      ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }
            
            // Apply status filter
            if ($request->has('status') && !empty($request->status)) {
                $query->where('status', $request->status);
            }
            
            // Get departments with task count
            $departments = $query->orderBy('department_code')
                ->get()
                ->map(function($dept) {
                    $dept->tasks_count = VolunteerTask::where('department_id', $dept->id)
                        ->whereNull('deleted_at')
                        ->count();
                    $dept->active_tasks_count = VolunteerTask::where('department_id', $dept->id)
                        ->where('status', 'active')
                        ->whereNull('deleted_at')
                        ->count();
                    return $dept;
                });
            
            return response()->json([
                'success' => true,
                'data' => $departments,
                'total' => $departments->count()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching departments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch departments',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get only active departments (for dropdowns)
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function active(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            
            $departments = VolunteerDepartment::where('status', 'active')
                ->whereNull('deleted_at')
                ->orderBy('department_name')
                ->get(['id', 'department_name', 'department_code', 'description']);
            
            return response()->json([
                'success' => true,
                'data' => $departments
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching active departments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active departments',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Display the specified department
     * 
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, $id)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            
            $department = VolunteerDepartment::where('id', $id)
                ->whereNull('deleted_at')
                ->with([
                    'coordinatorUser:id,name,email,mobile_no',
                    'tasks' => function($query) {
                        $query->whereNull('deleted_at')
                              ->select('id', 'department_id', 'task_name', 'task_code', 'status');
                    }
                ])
                ->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            // Add statistics
            $department->tasks_count = $department->tasks->count();
            $department->active_tasks_count = $department->tasks->where('status', 'active')->count();
            
            // Get volunteer count (those who prefer this department)
            $department->volunteers_count = DB::table('volunteers')
                ->where('preferred_department_id', $id)
                ->whereNull('deleted_at')
                ->count();
            
            return response()->json([
                'success' => true,
                'data' => $department
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch department details',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Store a newly created department
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'department_name' => 'required|string|max:100',
                  'department_name_en' => 'nullable|string|max:100',
                'department_code' => 'required|string|max:20',
                'description' => 'nullable|string',
                'coordinator_user_id' => 'nullable|uuid|exists:users,id',
                'capacity_target' => 'nullable|integer|min:0',
                'status' => 'required|in:active,inactive'
            ], [
                'department_name.required' => 'Department name is required',
                'department_code.required' => 'Department code is required',
                'coordinator_user_id.exists' => 'Selected coordinator does not exist',
                'status.in' => 'Status must be either active or inactive'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $templeId = $request->header('X-Temple-ID');
            $userId = auth()->id();
            
            // Check for duplicate department name
            $existingName = VolunteerDepartment::where('department_name', $request->department_name)
                ->whereNull('deleted_at')
                ->exists();
            
            if ($existingName) {
                return response()->json([
                    'success' => false,
                    'message' => 'A department with this name already exists'
                ], 422);
            }
            
            // Check for duplicate department code
            $existingCode = VolunteerDepartment::where('department_code', strtoupper($request->department_code))
                ->whereNull('deleted_at')
                ->exists();
            
            if ($existingCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'A department with this code already exists'
                ], 422);
            }
            
            // Create department
            $department = VolunteerDepartment::create([
                'department_name' => $request->department_name,
                          'department_name_en' => $request->department_name_en,
                'department_code' => strtoupper($request->department_code),
                'description' => $request->description,
                'coordinator_user_id' => $request->coordinator_user_id,
                'capacity_target' => $request->capacity_target ?? 0,
                'status' => $request->status,
                'created_by' => $userId,
                'updated_by' => $userId
            ]);
            
            // Load relationships
            $department->load('coordinatorUser:id,name,email');
            
            Log::info('Department created', [
                'department_id' => $department->id,
                'department_name' => $department->department_name,
                'created_by' => $userId
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Department created successfully',
                'data' => $department
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Error creating department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update the specified department
     * 
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'department_name' => 'required|string|max:100',
                       'department_name_en' => 'nullable|string|max:100',
                'department_code' => 'required|string|max:20',
                'description' => 'nullable|string',
                'coordinator_user_id' => 'nullable|uuid|exists:users,id',
                'capacity_target' => 'nullable|integer|min:0',
                'status' => 'required|in:active,inactive'
            ], [
                'department_name.required' => 'Department name is required',
                'department_code.required' => 'Department code is required',
                'coordinator_user_id.exists' => 'Selected coordinator does not exist',
                'status.in' => 'Status must be either active or inactive'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $templeId = $request->header('X-Temple-ID');
            $userId = auth()->id();
            
            // Find department
            $department = VolunteerDepartment::where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            // Check for duplicate department name (excluding current)
            $existingName = VolunteerDepartment::where('id', '!=', $id)
                ->where('department_name', $request->department_name)
                ->whereNull('deleted_at')
                ->exists();
            
            if ($existingName) {
                return response()->json([
                    'success' => false,
                    'message' => 'A department with this name already exists'
                ], 422);
            }
            
            // Check for duplicate department code (excluding current)
            $existingCode = VolunteerDepartment::where('id', '!=', $id)
                ->where('department_code', strtoupper($request->department_code))
                ->whereNull('deleted_at')
                ->exists();
            
            if ($existingCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'A department with this code already exists'
                ], 422);
            }
            
            // Update department
            $department->update([
                'department_name' => $request->department_name,
                          'department_name_en' => $request->department_name_en,
                'department_code' => strtoupper($request->department_code),
                'description' => $request->description,
                'coordinator_user_id' => $request->coordinator_user_id,
                'capacity_target' => $request->capacity_target ?? 0,
                'status' => $request->status,
                'updated_by' => $userId
            ]);
            
            // Reload with relationships
            $department->load('coordinatorUser:id,name,email');
            
            Log::info('Department updated', [
                'department_id' => $department->id,
                'updated_by' => $userId
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Department updated successfully',
                'data' => $department
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Soft delete the specified department
     * 
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, $id)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $userId = auth()->id();
            
            // Find department
            $department = VolunteerDepartment::where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            // Check if department has tasks
            $hasTasks = VolunteerTask::where('department_id', $id)
                ->whereNull('deleted_at')
                ->exists();
            
            if ($hasTasks) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete department with existing tasks. Please deactivate the department instead.',
                    'can_delete' => false
                ], 422);
            }
            
            // Check if department has volunteers assigned
            $hasVolunteers = DB::table('volunteers')
                ->where('preferred_department_id', $id)
                ->whereNull('deleted_at')
                ->exists();
            
            if ($hasVolunteers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete department with assigned volunteers. Please deactivate the department instead.',
                    'can_delete' => false
                ], 422);
            }
            
            // Check if department has task assignments
            $hasAssignments = DB::table('volunteer_task_assignments')
                ->where('department_id', $id)
                ->exists();
            
            if ($hasAssignments) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete department with historical task assignments. Please deactivate the department instead.',
                    'can_delete' => false
                ], 422);
            }
            
            // Soft delete
            $department->update([
                'deleted_at' => now(),
                'updated_by' => $userId
            ]);
            
            Log::info('Department deleted', [
                'department_id' => $department->id,
                'department_name' => $department->department_name,
                'deleted_by' => $userId
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Department deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Toggle department status (active/inactive)
     * 
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleStatus(Request $request, $id)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $userId = auth()->id();
            
            // Find department
            $department = VolunteerDepartment::where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            $newStatus = $department->status === 'active' ? 'inactive' : 'active';
            
            $department->update([
                'status' => $newStatus,
                'updated_by' => $userId
            ]);
            
            Log::info('Department status toggled', [
                'department_id' => $department->id,
                'old_status' => $department->status,
                'new_status' => $newStatus,
                'updated_by' => $userId
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Department status updated successfully',
                'data' => [
                    'id' => $department->id,
                    'status' => $newStatus
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error toggling department status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Check if department can be deleted
     * 
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function canDelete(Request $request, $id)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            
            // Check if department exists
            $department = VolunteerDepartment::where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            $reasons = [];
            $canDelete = true;
            
            // Check for tasks
            $tasksCount = VolunteerTask::where('department_id', $id)
                ->whereNull('deleted_at')
                ->count();
            
            if ($tasksCount > 0) {
                $canDelete = false;
                $reasons[] = "Department has {$tasksCount} task(s)";
            }
            
            // Check for volunteers
            $volunteersCount = DB::table('volunteers')
                ->where('preferred_department_id', $id)
                ->whereNull('deleted_at')
                ->count();
            
            if ($volunteersCount > 0) {
                $canDelete = false;
                $reasons[] = "Department has {$volunteersCount} volunteer(s) assigned";
            }
            
            // Check for assignments
            $assignmentsCount = DB::table('volunteer_task_assignments')
                ->where('department_id', $id)
                ->count();
            
            if ($assignmentsCount > 0) {
                $canDelete = false;
                $reasons[] = "Department has {$assignmentsCount} historical assignment(s)";
            }
            
            return response()->json([
                'success' => true,
                'can_delete' => $canDelete,
                'reasons' => $reasons,
                'message' => $canDelete 
                    ? 'Department can be safely deleted' 
                    : 'Department cannot be deleted. Please deactivate instead.',
                'suggestion' => !$canDelete 
                    ? 'You can deactivate this department to prevent it from being used in new registrations and assignments.' 
                    : null
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking delete permission: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to check delete permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get department statistics
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function statistics(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            
            $stats = [
                'total_departments' => VolunteerDepartment::whereNull('deleted_at')
                    ->count(),
                    
                'active_departments' => VolunteerDepartment::where('status', 'active')
                    ->whereNull('deleted_at')
                    ->count(),
                    
                'inactive_departments' => VolunteerDepartment::where('status', 'inactive')
                    ->whereNull('deleted_at')
                    ->count(),
                    
                'departments_with_tasks' => VolunteerDepartment::whereNull('deleted_at')
                    ->whereHas('tasks', function($query) {
                        $query->whereNull('deleted_at');
                    })
                    ->count(),
                    
                'total_capacity_target' => VolunteerDepartment::where('status', 'active')
                    ->whereNull('deleted_at')
                    ->sum('capacity_target')
            ];
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching department statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}