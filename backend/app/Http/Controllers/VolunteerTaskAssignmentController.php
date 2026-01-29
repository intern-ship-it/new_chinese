<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\VolunteerTaskAssignment;
use App\Models\Volunteer;
use App\Models\VolunteerDepartment;
use App\Models\VolunteerTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class VolunteerTaskAssignmentController extends Controller
{
    /**
     * Get all task assignments with filters
     * 
     * GET /api/volunteers/assignments
     */
    public function index(Request $request)
    {
        try {
            $query = VolunteerTaskAssignment::with([
                'volunteer:id,volunteer_id,full_name,mobile_primary',
                'department:id,department_name,department_code',
                'task:id,task_name,task_code',
                'assignedBy:id,name'
            ]);

            // Search filter
            if ($request->filled('search')) {
                $query->whereHas('volunteer', function ($q) use ($request) {
                    $q->where('full_name', 'LIKE', '%' . $request->search . '%')
                      ->orWhere('volunteer_id', 'LIKE', '%' . $request->search . '%');
                });
            }

            // Status filter
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Department filter
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            // Task filter
            if ($request->filled('task_id')) {
                $query->where('task_id', $request->task_id);
            }

            // Date range filter
            if ($request->filled('from_date') && $request->filled('to_date')) {
                $query->whereBetween('assignment_date', [$request->from_date, $request->to_date]);
            } elseif ($request->filled('assignment_date')) {
                $query->whereDate('assignment_date', $request->assignment_date);
            }

            // Sorting
            $sortField = $request->get('sort_by', 'assignment_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortField, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $assignments = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $assignments->items(),
                'pagination' => [
                    'current_page' => $assignments->currentPage(),
                    'last_page' => $assignments->lastPage(),
                    'per_page' => $assignments->perPage(),
                    'total' => $assignments->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching task assignments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching task assignments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single task assignment - THIS IS THE KEY FOR EDIT
     * 
     * GET /api/volunteers/assignments/{id}
     */
public function show($id)
{
    try {
        $assignment = VolunteerTaskAssignment::with([
            'volunteer:id,volunteer_id,full_name,full_name_en,mobile_primary,email,status', 
            'department:id,department_name,department_name_en,department_code', 
            'task:id,task_name,task_code,department_id',
            'assignedBy:id,name,email',
            'attendanceRecords'
        ])->findOrFail($id);

        // Add computed properties
        $response = [
            'id' => $assignment->id,
            'volunteer_id' => $assignment->volunteer_id,
            'volunteer' => $assignment->volunteer ? [
                'id' => $assignment->volunteer->id,
                'volunteer_id' => $assignment->volunteer->volunteer_id,
                'full_name' => $assignment->volunteer->full_name,
                'full_name_en' => $assignment->volunteer->full_name_en,  // ⭐ ADD THIS
                'bilingual_name' => $assignment->volunteer->bilingual_name,  // ⭐ ADD THIS
                'mobile_primary' => $assignment->volunteer->mobile_primary,
                'email' => $assignment->volunteer->email,
                'status' => $assignment->volunteer->status,
            ] : null,
            'department_id' => $assignment->department_id,
            'department' => $assignment->department ? [
                'id' => $assignment->department->id,
                'department_name' => $assignment->department->department_name,
                'department_code' => $assignment->department->department_code,
            ] : null,
            'task_id' => $assignment->task_id,
            'task' => $assignment->task ? [
                'id' => $assignment->task->id,
                'task_name' => $assignment->task->task_name,
                'task_code' => $assignment->task->task_code,
                'department_id' => $assignment->task->department_id,
            ] : null,
            'assignment_date' => $assignment->assignment_date ? $assignment->assignment_date->format('Y-m-d') : null,  // ⭐ FIXED: Explicitly format
            'time_slot' => $assignment->time_slot,
            'start_time' => $assignment->start_time ? substr($assignment->start_time, 0, 5) : null,  // ⭐ FIXED: Format HH:MM
            'end_time' => $assignment->end_time ? substr($assignment->end_time, 0, 5) : null,  // ⭐ FIXED: Format HH:MM
            'notes' => $assignment->notes,
            'status' => $assignment->status,
            'assigned_at' => $assignment->assigned_at,
            'assigned_by' => $assignment->assigned_by,
            'assigned_by_user' => $assignment->assignedBy ? [
                'id' => $assignment->assignedBy->id,
                'name' => $assignment->assignedBy->name,
            ] : null,
            'created_at' => $assignment->created_at,
            'updated_at' => $assignment->updated_at,
            'can_be_completed' => $assignment->can_be_completed,
            'can_be_cancelled' => $assignment->can_be_cancelled,
            'has_attendance' => $assignment->attendanceRecords->count() > 0,
        ];

        return response()->json([
            'success' => true,
            'data' => $response,
        ]);
    } catch (\Exception $e) {
        Log::error('Error fetching task assignment: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Task assignment not found',
            'error' => $e->getMessage(),
        ], 404);
    }
}

    /**
     * Create new task assignment
     * 
     * POST /api/volunteers/assignments
     */
    public function store(Request $request)
    {
        try {
            // Validation
            $validator = Validator::make($request->all(), [
                'volunteer_id' => 'required|uuid|exists:volunteers,id',
                'department_id' => 'required|uuid|exists:volunteer_departments,id',
                'task_id' => 'required|uuid|exists:volunteer_tasks,id',
                'assignment_date' => 'required|date',
                'time_slot' => 'nullable|string|max:50',
                'start_time' => 'nullable|date_format:H:i:s',
                'end_time' => 'nullable|date_format:H:i:s|after:start_time',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Check if volunteer is active
            $volunteer = Volunteer::findOrFail($request->volunteer_id);
            if ($volunteer->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only active volunteers can be assigned tasks',
                    'volunteer_status' => $volunteer->status,
                ], 422);
            }

            // Check if department is active
            $department = VolunteerDepartment::findOrFail($request->department_id);
            if ($department->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected department is not active',
                ], 422);
            }

            // Check if task is active and belongs to department
            $task = VolunteerTask::findOrFail($request->task_id);
            if ($task->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected task is not active',
                ], 422);
            }

            if ($task->department_id !== $request->department_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected task does not belong to the selected department',
                ], 422);
            }

            // Check for scheduling conflicts
            if ($request->start_time && $request->end_time) {
                $hasConflict = VolunteerTaskAssignment::hasConflict(
                    $request->volunteer_id,
                    $request->assignment_date,
                    $request->start_time,
                    $request->end_time
                );

                if ($hasConflict) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Volunteer already has an assignment during this time',
                    ], 422);
                }
            }

            DB::beginTransaction();

            // Create assignment
            $assignment = new VolunteerTaskAssignment([
                'volunteer_id' => $request->volunteer_id,
                'department_id' => $request->department_id,
                'task_id' => $request->task_id,
                'assignment_date' => $request->assignment_date,
                'time_slot' => $request->time_slot,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'notes' => $request->notes,
                'status' => 'assigned',
            ]);

            $assignment->save();

            DB::commit();

            // Load relationships
            $assignment->load('volunteer', 'department', 'task', 'assignedBy');

            Log::info('Task assignment created successfully', [
                'assignment_id' => $assignment->id,
                'volunteer_id' => $volunteer->volunteer_id,
                'volunteer_name' => $volunteer->full_name,
                'department' => $department->department_name,
                'task' => $task->task_name,
                'date' => $assignment->assignment_date,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Task assignment created successfully',
                'data' => $assignment,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating task assignment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating task assignment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update task assignment
     * 
     * PUT /api/volunteers/assignments/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $assignment = VolunteerTaskAssignment::findOrFail($id);

            // Check if assignment can be updated
            if ($assignment->status !== 'assigned') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending assignments can be updated',
                    'current_status' => $assignment->status,
                ], 403);
            }

            // Validation
            $validator = Validator::make($request->all(), [
                'volunteer_id' => 'sometimes|required|uuid|exists:volunteers,id',
                'department_id' => 'sometimes|required|uuid|exists:volunteer_departments,id',
                'task_id' => 'sometimes|required|uuid|exists:volunteer_tasks,id',
                'assignment_date' => 'sometimes|required|date',
                'time_slot' => 'nullable|string|max:50',
                'start_time' => 'nullable|date_format:H:i:s',
                'end_time' => 'nullable|date_format:H:i:s|after:start_time',
                'notes' => 'nullable|string',
                'status' => 'sometimes|required|in:assigned,completed,cancelled,no_show',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Check if volunteer is active (if changing volunteer)
            if ($request->has('volunteer_id') && $request->volunteer_id !== $assignment->volunteer_id) {
                $volunteer = Volunteer::findOrFail($request->volunteer_id);
                if ($volunteer->status !== 'active') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only active volunteers can be assigned tasks',
                    ], 422);
                }
            }

            // Check if department is active (if changing department)
            if ($request->has('department_id') && $request->department_id !== $assignment->department_id) {
                $department = VolunteerDepartment::findOrFail($request->department_id);
                if ($department->status !== 'active') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected department is not active',
                    ], 422);
                }
            }

            // Check if task is active and belongs to department (if changing task)
            if ($request->has('task_id')) {
                $task = VolunteerTask::findOrFail($request->task_id);
                if ($task->status !== 'active') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected task is not active',
                    ], 422);
                }

                $deptId = $request->department_id ?? $assignment->department_id;
                if ($task->department_id !== $deptId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected task does not belong to the selected department',
                    ], 422);
                }
            }

            // Check for scheduling conflicts (if changing time or date or volunteer)
            if ($request->has('start_time') || $request->has('end_time') || 
                $request->has('assignment_date') || $request->has('volunteer_id')) {
                
                $checkVolunteerId = $request->volunteer_id ?? $assignment->volunteer_id;
                $checkDate = $request->assignment_date ?? $assignment->assignment_date;
                $checkStartTime = $request->start_time ?? $assignment->start_time;
                $checkEndTime = $request->end_time ?? $assignment->end_time;

                if ($checkStartTime && $checkEndTime) {
                    $hasConflict = VolunteerTaskAssignment::hasConflict(
                        $checkVolunteerId,
                        $checkDate,
                        $checkStartTime,
                        $checkEndTime,
                        $assignment->id // Exclude current assignment
                    );

                    if ($hasConflict) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Volunteer already has an assignment during this time',
                        ], 422);
                    }
                }
            }

            DB::beginTransaction();

            // Update assignment
            $assignment->fill($request->only([
                'volunteer_id',
                'department_id',
                'task_id',
                'assignment_date',
                'time_slot',
                'start_time',
                'end_time',
                'notes',
                'status',
            ]));

            $assignment->save();

            DB::commit();

            // Load relationships
            $assignment->load('volunteer', 'department', 'task', 'assignedBy');

            Log::info('Task assignment updated successfully', [
                'assignment_id' => $assignment->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Task assignment updated successfully',
                'data' => $assignment,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating task assignment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating task assignment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete task assignment
     * Only allowed for pending (assigned) status
     * 
     * DELETE /api/volunteers/assignments/{id}
     */
    public function destroy($id)
    {
        try {
            $assignment = VolunteerTaskAssignment::findOrFail($id);

            // Check if assignment can be deleted
            if ($assignment->status !== 'assigned') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending assignments can be deleted',
                    'current_status' => $assignment->status,
                ], 403);
            }

            // Check if there are attendance records
            if ($assignment->hasAttendance()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete assignment with attendance records',
                ], 403);
            }

            DB::beginTransaction();

            $assignment->delete();

            DB::commit();

            Log::info('Task assignment deleted successfully', [
                'assignment_id' => $assignment->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Task assignment deleted successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting task assignment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting task assignment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mark assignment as completed
     * 
     * POST /api/volunteers/assignments/{id}/complete
     */
    public function markComplete($id)
    {
        try {
            $assignment = VolunteerTaskAssignment::findOrFail($id);

            if (!$assignment->can_be_completed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment cannot be marked as completed',
                    'current_status' => $assignment->status,
                ], 403);
            }

            DB::beginTransaction();

            $assignment->markAsCompleted(auth()->id());

            DB::commit();

            $assignment->load('volunteer', 'department', 'task');

            return response()->json([
                'success' => true,
                'message' => 'Assignment marked as completed',
                'data' => $assignment,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error completing assignment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error completing assignment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mark assignment as no-show
     * 
     * POST /api/volunteers/assignments/{id}/no-show
     */
    public function markNoShow($id)
    {
        try {
            $assignment = VolunteerTaskAssignment::findOrFail($id);

            if (!$assignment->can_be_cancelled) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment cannot be marked as no-show',
                    'current_status' => $assignment->status,
                ], 403);
            }

            DB::beginTransaction();

            $assignment->markAsNoShow(auth()->id());

            DB::commit();

            $assignment->load('volunteer', 'department', 'task');

            return response()->json([
                'success' => true,
                'message' => 'Assignment marked as no-show',
                'data' => $assignment,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error marking no-show: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error marking no-show',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel assignment
     * 
     * POST /api/volunteers/assignments/{id}/cancel
     */
    public function cancel(Request $request, $id)
    {
        try {
            $assignment = VolunteerTaskAssignment::findOrFail($id);

            if (!$assignment->can_be_cancelled) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment cannot be cancelled',
                    'current_status' => $assignment->status,
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'reason' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            $assignment->cancel($request->reason);

            DB::commit();

            $assignment->load('volunteer', 'department', 'task');

            return response()->json([
                'success' => true,
                'message' => 'Assignment cancelled successfully',
                'data' => $assignment,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error cancelling assignment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error cancelling assignment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get assignments statistics
     * 
     * GET /api/volunteers/assignments/statistics
     */
    public function statistics(Request $request)
    {
        try {
            $startDate = $request->get('from_date', now()->startOfMonth());
            $endDate = $request->get('to_date', now()->endOfMonth());

            $stats = [
                'total' => VolunteerTaskAssignment::whereBetween('assignment_date', [$startDate, $endDate])->count(),
                'assigned' => VolunteerTaskAssignment::assigned()->whereBetween('assignment_date', [$startDate, $endDate])->count(),
                'completed' => VolunteerTaskAssignment::completed()->whereBetween('assignment_date', [$startDate, $endDate])->count(),
                'cancelled' => VolunteerTaskAssignment::cancelled()->whereBetween('assignment_date', [$startDate, $endDate])->count(),
                'no_show' => VolunteerTaskAssignment::noShow()->whereBetween('assignment_date', [$startDate, $endDate])->count(),
            ];

            // By department
            $byDepartment = VolunteerTaskAssignment::select('department_id', DB::raw('count(*) as count'))
                ->whereBetween('assignment_date', [$startDate, $endDate])
                ->groupBy('department_id')
                ->with('department:id,department_name')
                ->get()
                ->map(function ($item) {
                    return [
                        'department_id' => $item->department_id,
                        'department_name' => $item->department->department_name ?? 'Unknown',
                        'count' => $item->count,
                    ];
                });

            $stats['by_department'] = $byDepartment;

            // Upcoming assignments
            $stats['upcoming'] = VolunteerTaskAssignment::upcoming()
                ->whereBetween('assignment_date', [now(), $endDate])
                ->count();

            return response()->json([
                'success' => true,
                'data' => $stats,
                'period' => [
                    'from' => $startDate,
                    'to' => $endDate,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get assignments for a specific date (calendar view)
     * 
     * GET /api/volunteers/assignments/calendar
     */
    public function calendar(Request $request)
    {
        try {
            $date = $request->get('date', now()->format('Y-m-d'));
            $departmentId = $request->get('department_id');
            $taskId = $request->get('task_id');

            $assignments = VolunteerTaskAssignment::getForDate($date, $departmentId, $taskId);

            return response()->json([
                'success' => true,
                'date' => $date,
                'data' => $assignments,
                'count' => $assignments->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching calendar assignments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching calendar assignments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

     public function updateStatus(Request $request, $id)
    {
        try {
            $assignment = VolunteerTaskAssignment::findOrFail($id);

            // Validate input
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:completed,cancelled,no_show',
                'reason' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Only assigned tasks can have status updated
            if ($assignment->status !== 'assigned') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only assigned tasks can have their status updated',
                    'current_status' => $assignment->status,
                ], 403);
            }

            DB::beginTransaction();

            $newStatus = $request->status;
            $reason = $request->reason;

            // Update status using existing model methods
            switch ($newStatus) {
                case 'completed':
                    $assignment->markAsCompleted(auth()->id());
                    break;
                    
                case 'no_show':
                    $assignment->markAsNoShow(auth()->id());
                    break;
                    
                case 'cancelled':
                    // cancel() method already handles the reason
                    $assignment->cancel($reason);
                    break;
            }

            // For completed and no_show, if reason provided, append to notes
            if ($reason && $newStatus !== 'cancelled') {
                $statusLabel = ucfirst(str_replace('_', ' ', $newStatus));
                $reasonText = "\n\n[{$statusLabel} - " . date('Y-m-d H:i:s') . "] {$reason}";
                $assignment->notes = ($assignment->notes ?? '') . $reasonText;
                $assignment->save();
            }

            DB::commit();

            // Reload relationships for response
            $assignment->load('volunteer', 'department', 'task', 'assignedBy');

            Log::info('Assignment status updated successfully', [
                'assignment_id' => $assignment->id,
                'volunteer_id' => $assignment->volunteer_id,
                'old_status' => 'assigned',
                'new_status' => $newStatus,
                'reason' => $reason,
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Assignment status updated successfully',
                'data' => $assignment,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error updating assignment status', [
                'assignment_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating assignment status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}