<?php

namespace App\Http\Controllers;

use App\Models\VolunteerAttendance;
use App\Models\Volunteer;
use App\Models\VolunteerDepartment;
use App\Models\VolunteerTask;
use App\Models\VolunteerAttendanceAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class VolunteerAttendanceController extends Controller
{
    /**
     * Display a listing of attendance records
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = VolunteerAttendance::query();

            // Eager load relationships
            $query->with([
                'volunteer:id,volunteer_id,full_name,ic_number,mobile_primary',
                'department:id,department_name,department_code',
                'task:id,task_name,task_code',
                'assignment:id,assignment_date,time_slot',
                'manualEntryBy:id,username'
            ]);

            // Search filter
            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('volunteer', function($q) use ($search) {
                    $q->where('volunteer_id', 'LIKE', "%{$search}%")
                      ->orWhere('full_name', 'LIKE', "%{$search}%")
                      ->orWhere('ic_number', 'LIKE', "%{$search}%")
                      ->orWhere('mobile_primary', 'LIKE', "%{$search}%");
                });
            }

            // Department filter
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            // Task filter
            if ($request->filled('task_id')) {
                $query->where('task_id', $request->task_id);
            }

            // Entry type filter
            if ($request->filled('entry_type')) {
                $query->where('entry_type', $request->entry_type);
            }

            // Status filter
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Volunteer filter
            if ($request->filled('volunteer_id')) {
                $query->where('volunteer_id', $request->volunteer_id);
            }

            // Date range filter
            if ($request->filled('date_from') && $request->filled('date_to')) {
                $query->whereBetween('attendance_date', [
                    $request->date_from,
                    $request->date_to
                ]);
            } elseif ($request->filled('date_from')) {
                $query->where('attendance_date', '>=', $request->date_from);
            } elseif ($request->filled('date_to')) {
                $query->where('attendance_date', '<=', $request->date_to);
            }

            // Date filter (single date)
            if ($request->filled('date')) {
                $query->whereDate('attendance_date', $request->date);
            }

            // Clocked in filter (for currently active)
            if ($request->has('clocked_in') && $request->clocked_in == 'true') {
                $query->whereNull('clock_out_time');
            }

            // Order by
            $sortField = $request->get('sort_by', 'attendance_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortField, $sortOrder);

            // Add secondary sort
            $query->orderBy('clock_in_time', 'desc');

            // Pagination
            $perPage = $request->get('per_page', 50);
            
            if ($request->has('paginate') && $request->paginate == 'false') {
                $attendance = $query->get();
                
                return response()->json([
                    'success' => true,
                    'data' => $attendance,
                    'message' => 'Attendance records retrieved successfully'
                ]);
            }

            $attendance = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $attendance->items(),
                'pagination' => [
                    'total' => $attendance->total(),
                    'per_page' => $attendance->perPage(),
                    'current_page' => $attendance->currentPage(),
                    'last_page' => $attendance->lastPage(),
                    'from' => $attendance->firstItem(),
                    'to' => $attendance->lastItem()
                ],
                'message' => 'Attendance records retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error loading attendance records: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load attendance records: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Display the specified attendance record
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $attendance = VolunteerAttendance::with([
                'volunteer',
                'department',
                'task',
                'assignment',
                'manualEntryBy',
                'auditLogs.adminUser'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Attendance record retrieved successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance record not found'
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error loading attendance record: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new attendance record (Clock In or Manual Entry)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            // Parse and normalize dates first
            $clockInTime = $this->parseISODate($request->clock_in_time);
            $clockOutTime = $request->clock_out_time ? $this->parseISODate($request->clock_out_time) : null;

            // Validation rules
            $rules = [
                'volunteer_id' => 'required|uuid|exists:volunteers,id',
                'department_id' => 'required|uuid|exists:volunteer_departments,id',
                'task_id' => 'required|uuid|exists:volunteer_tasks,id',
                'attendance_date' => 'required|date',
                'entry_type' => 'required|in:normal,manual',
            ];

            // Additional validation for manual entries
            if ($request->entry_type === 'manual') {
                $rules['manual_entry_reason'] = 'required|string|min:10';
                
                // Validate clock out time is after clock in time
                if ($clockOutTime && $clockInTime) {
                    if ($clockOutTime <= $clockInTime) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Clock out time must be after clock in time',
                            'errors' => [
                                'clock_out_time' => ['Clock out time must be after clock in time']
                            ]
                        ], 422);
                    }
                }
            }

            $validator = Validator::make($request->except(['clock_in_time', 'clock_out_time']), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validate parsed times
            if (!$clockInTime) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid clock in time format',
                    'errors' => [
                        'clock_in_time' => ['Invalid date format. Expected ISO 8601 format.']
                    ]
                ], 422);
            }

            if ($request->entry_type === 'manual' && !$clockOutTime) {
                return response()->json([
                    'success' => false,
                    'message' => 'Clock out time is required for manual entries',
                    'errors' => [
                        'clock_out_time' => ['Clock out time is required for manual entries']
                    ]
                ], 422);
            }

            DB::beginTransaction();

            // Check for duplicate clock-in on same date
            $existingAttendance = VolunteerAttendance::where('volunteer_id', $request->volunteer_id)
                ->whereDate('attendance_date', $request->attendance_date)
                ->whereNull('clock_out_time')
                ->where('status', 'active')
                ->first();

            if ($existingAttendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer is already clocked in for this date'
                ], 422);
            }

            // Create attendance record
            $attendanceData = [
                'volunteer_id' => $request->volunteer_id,
                'department_id' => $request->department_id,
                'task_id' => $request->task_id,
                'attendance_date' => $request->attendance_date,
                'clock_in_time' => $clockInTime,
                'entry_type' => $request->entry_type,
                'status' => 'active',
                'created_by' => Auth::id()
            ];

            // For manual entries
            if ($request->entry_type === 'manual') {
                $attendanceData['clock_out_time'] = $clockOutTime;
                $attendanceData['manual_entry_reason'] = $request->manual_entry_reason;
                $attendanceData['manual_entry_by'] = Auth::id();
            }

            // Add assignment_id if provided
            if ($request->filled('assignment_id')) {
                $attendanceData['assignment_id'] = $request->assignment_id;
            }

            $attendance = VolunteerAttendance::create($attendanceData);

            // Create audit log
            VolunteerAttendanceAudit::logAction(
                $attendance->id,
                $request->entry_type === 'manual' 
                    ? VolunteerAttendanceAudit::ACTION_MANUAL_ENTRY 
                    : VolunteerAttendanceAudit::ACTION_CLOCK_IN,
                Auth::id(),
                null,
                $attendanceData,
                $request->entry_type === 'manual' ? $request->manual_entry_reason : 'Normal clock in'
            );

            DB::commit();

            // Load relationships
            $attendance->load([
                'volunteer',
                'department',
                'task'
            ]);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => $request->entry_type === 'manual' 
                    ? 'Manual attendance entry created successfully' 
                    : 'Clocked in successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating attendance record: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update attendance record (mainly for clock out)
     *
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $attendance = VolunteerAttendance::findOrFail($id);

            // Check if already clocked out
            if ($attendance->clock_out_time && !$request->filled('manual_edit')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attendance already clocked out'
                ], 422);
            }

            $beforeValues = $attendance->toArray();

            DB::beginTransaction();

            // Clock out
            if ($request->filled('clock_out_time')) {
                $clockOutTime = $this->parseISODate($request->clock_out_time);
                
                if (!$clockOutTime) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid clock out time format',
                        'errors' => [
                            'clock_out_time' => ['Invalid date format. Expected ISO 8601 format.']
                        ]
                    ], 422);
                }

                // Validate clock out is after clock in
                if ($clockOutTime <= $attendance->clock_in_time) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Clock out time must be after clock in time',
                        'errors' => [
                            'clock_out_time' => ['Clock out time must be after clock in time']
                        ]
                    ], 422);
                }

                $attendance->clock_out_time = $clockOutTime;
                
                // Log action
                $actionType = VolunteerAttendanceAudit::ACTION_CLOCK_OUT;
                $reason = 'Normal clock out';
            }

            // Manual edit
            if ($request->filled('manual_edit') && $request->manual_edit == true) {
                $validator = Validator::make($request->all(), [
                    'manual_entry_reason' => 'required|string|min:10'
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Manual edit reason is required',
                        'errors' => $validator->errors()
                    ], 422);
                }

                $attendance->entry_type = 'manual';
                $attendance->manual_entry_reason = $request->manual_entry_reason;
                $attendance->manual_entry_by = Auth::id();
                $attendance->status = 'edited';

                if ($request->filled('clock_in_time')) {
                    $clockInTime = $this->parseISODate($request->clock_in_time);
                    if ($clockInTime) {
                        $attendance->clock_in_time = $clockInTime;
                    }
                }

                if ($request->filled('clock_out_time')) {
                    $clockOutTime = $this->parseISODate($request->clock_out_time);
                    if ($clockOutTime) {
                        // Validate clock out is after clock in
                        if ($clockOutTime <= $attendance->clock_in_time) {
                            return response()->json([
                                'success' => false,
                                'message' => 'Clock out time must be after clock in time',
                                'errors' => [
                                    'clock_out_time' => ['Clock out time must be after clock in time']
                                ]
                            ], 422);
                        }
                        $attendance->clock_out_time = $clockOutTime;
                    }
                }

                $actionType = VolunteerAttendanceAudit::ACTION_MANUAL_EDIT;
                $reason = $request->manual_entry_reason;
            }

            $attendance->save();

            // Create audit log
            VolunteerAttendanceAudit::logAction(
                $attendance->id,
                $actionType ?? VolunteerAttendanceAudit::ACTION_UPDATE,
                Auth::id(),
                $beforeValues,
                $attendance->toArray(),
                $reason ?? 'Attendance updated'
            );

            DB::commit();

            // Reload relationships
            $attendance->load([
                'volunteer',
                'department',
                'task',
                'manualEntryBy'
            ]);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Attendance updated successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance record not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating attendance record: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified attendance record
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            $attendance = VolunteerAttendance::findOrFail($id);

            DB::beginTransaction();

            // Create audit log before deletion
            VolunteerAttendanceAudit::logAction(
                $attendance->id,
                VolunteerAttendanceAudit::ACTION_DELETE,
                Auth::id(),
                $attendance->toArray(),
                null,
                'Attendance record deleted'
            );

            $attendance->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Attendance record deleted successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance record not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting attendance record: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get today's attendance
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTodayAttendance()
    {
        try {
            $attendance = VolunteerAttendance::with([
                'volunteer',
                'department',
                'task'
            ])
            ->whereDate('attendance_date', today())
            ->orderBy('clock_in_time', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Today\'s attendance retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error loading today\'s attendance: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load today\'s attendance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get currently clocked in volunteers
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getClockedIn()
    {
        try {
            $attendance = VolunteerAttendance::with([
                'volunteer',
                'department',
                'task'
            ])
            ->whereNull('clock_out_time')
            ->where('status', 'active')
            ->orderBy('clock_in_time', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'count' => $attendance->count(),
                'message' => 'Currently clocked in volunteers retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error loading clocked in volunteers: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load clocked in volunteers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check clock in status for a volunteer
     *
     * @param string $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkClockInStatus($volunteerId)
    {
        try {
            $attendance = VolunteerAttendance::where('volunteer_id', $volunteerId)
                ->whereDate('attendance_date', today())
                ->whereNull('clock_out_time')
                ->where('status', 'active')
                ->first();

            return response()->json([
                'success' => true,
                'is_clocked_in' => !is_null($attendance),
                'attendance' => $attendance,
                'message' => 'Clock in status retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error checking clock in status: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to check clock in status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clock out a volunteer
     *
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function clockOut(Request $request, $id)
    {
        try {
            $attendance = VolunteerAttendance::findOrFail($id);

            if ($attendance->clock_out_time) {
                return response()->json([
                    'success' => false,
                    'message' => 'Already clocked out'
                ], 422);
            }

            DB::beginTransaction();

            $beforeValues = $attendance->toArray();

            $attendance->clock_out_time = now();
            $attendance->save();

            // Create audit log
            VolunteerAttendanceAudit::logAction(
                $attendance->id,
                VolunteerAttendanceAudit::ACTION_CLOCK_OUT,
                Auth::id(),
                $beforeValues,
                $attendance->toArray(),
                'Clocked out'
            );

            DB::commit();

            $attendance->load([
                'volunteer',
                'department',
                'task'
            ]);

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'message' => 'Clocked out successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance record not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error clocking out: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to clock out',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance statistics
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatistics(Request $request)
    {
        try {
            $startDate = $request->get('start_date', today()->toDateString());
            $endDate = $request->get('end_date', today()->toDateString());

            $statistics = VolunteerAttendance::getStatistics($startDate, $endDate);

            // Get currently clocked in count
            $clockedInCount = VolunteerAttendance::whereNull('clock_out_time')
                ->where('status', 'active')
                ->whereDate('attendance_date', today())
                ->count();

            $statistics['currently_clocked_in'] = $clockedInCount;

            return response()->json([
                'success' => true,
                'data' => $statistics,
                'message' => 'Statistics retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error loading statistics: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily report with statistics
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDailyReport(Request $request)
    {
        try {
            $date = $request->get('date', today()->toDateString());

            // Get attendance records for the date
            $records = VolunteerAttendance::with([
                'volunteer:id,volunteer_id,full_name',
                'department:id,department_name',
                'task:id,task_name'
            ])
            ->whereDate('attendance_date', $date)
            ->where('status', 'active')
            ->orderBy('clock_in_time', 'desc')
            ->get();

            // Calculate statistics
            $statistics = [
                'total_records' => $records->count(),
                'total_hours' => $records->sum('total_hours'),
                'unique_volunteers' => $records->unique('volunteer_id')->count(),
                'manual_entries' => $records->where('entry_type', 'manual')->count(),
                'currently_clocked_in' => $records->where('clock_out_time', null)->count(),
                'completed' => $records->where('clock_out_time', '!=', null)->count()
            ];

            // Get department breakdown
            $departmentBreakdown = $records->groupBy('department_id')->map(function($deptRecords) {
                return [
                    'department' => $deptRecords->first()->department,
                    'count' => $deptRecords->count(),
                    'hours' => $deptRecords->sum('total_hours')
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'records' => $records,
                    'statistics' => $statistics,
                    'department_breakdown' => $departmentBreakdown
                ],
                'message' => 'Daily report retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error loading daily report: ' . $e->getMessage());
            
            return response()->json([
                'success' => true,  // Return success with empty data instead of error
                'data' => [
                    'date' => $request->get('date', today()->toDateString()),
                    'records' => [],
                    'statistics' => [
                        'total_records' => 0,
                        'total_hours' => 0,
                        'unique_volunteers' => 0,
                        'manual_entries' => 0,
                        'currently_clocked_in' => 0,
                        'completed' => 0
                    ],
                    'department_breakdown' => []
                ],
                'message' => 'No records found'
            ]);
        }
    }

    /**
     * Parse ISO 8601 date string to Carbon instance
     * Handles both formats: Y-m-d\TH:i:s\Z and Y-m-d\TH:i:s.u\Z
     *
     * @param string $dateString
     * @return \Carbon\Carbon|null
     */
    private function parseISODate($dateString)
    {
        if (!$dateString) {
            return null;
        }

        try {
            // Try parsing with Carbon which handles ISO 8601 formats
            return Carbon::parse($dateString);
        } catch (\Exception $e) {
            \Log::error('Failed to parse date: ' . $dateString . ' - ' . $e->getMessage());
            return null;
        }
    }
}