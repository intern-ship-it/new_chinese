<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\VolunteerAttendance;
use App\Models\VolunteerDepartment;
use App\Models\VolunteerTask;
use App\Models\Volunteer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class VolunteerReportController extends Controller
{
    /**
     * Get calendar view data
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function calendar(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            
            // Get date range parameters
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $departmentId = $request->input('department_id');
            $taskId = $request->input('task_id');
            $entryType = $request->input('entry_type');

            // Default to current month if no dates provided
            if (!$dateFrom && !$dateTo) {
                $dateFrom = now()->startOfMonth()->format('Y-m-d');
                $dateTo = now()->endOfMonth()->format('Y-m-d');
            }

            $startDate = Carbon::parse($dateFrom);
            $endDate = Carbon::parse($dateTo);

            // Build query with filters
            $query = VolunteerAttendance::with([
                    'volunteer:id,volunteer_id,full_name',
                    'department:id,department_name',
                    'task:id,task_name'
                ])
                ->betweenDates($dateFrom, $dateTo)
                ->completed();

            // Apply additional filters
            if ($departmentId) {
                $query->forDepartment($departmentId);
            }

            if ($taskId) {
                $query->forTask($taskId);
            }

            if ($entryType) {
                if ($entryType === 'normal') {
                    $query->normalEntries();
                } elseif ($entryType === 'manual') {
                    $query->manualEntries();
                }
            }

            $attendance = $query->get();

            // Group by date
            $calendarData = [];
            $current = $startDate->copy();
            
            while ($current <= $endDate) {
                $dateStr = $current->format('Y-m-d');
                $dayRecords = $attendance->filter(function($record) use ($dateStr) {
                    return $record->attendance_date->format('Y-m-d') === $dateStr;
                });
                
                $totalHours = $dayRecords->sum('total_hours');
                $uniqueVolunteers = $dayRecords->unique('volunteer_id')->count();
                $manualEntries = $dayRecords->where('entry_type', 'manual')->count();
                
                // Determine activity level
                $activityLevel = 'none';
                if ($uniqueVolunteers > 0) {
                    if ($totalHours >= 50) {
                        $activityLevel = 'high';
                    } elseif ($totalHours >= 20) {
                        $activityLevel = 'medium';
                    } else {
                        $activityLevel = 'low';
                    }
                }

                $calendarData[] = [
                    'date' => $dateStr,
                    'day_name' => $current->format('l'),
                    'records_count' => $dayRecords->count(),
                    'total_hours' => round($totalHours, 2),
                    'unique_volunteers' => $uniqueVolunteers,
                    'manual_entries_count' => $manualEntries,
                    'activity_level' => $activityLevel,
                    'records' => $dayRecords->map(function ($record) {
                        return [
                            'id' => $record->id,
                            'volunteer_name' => $record->volunteer->full_name ?? 'N/A',
                            'volunteer_id' => $record->volunteer->volunteer_id ?? 'N/A',
                            'department' => $record->department->department_name ?? 'N/A',
                            'task' => $record->task->task_name ?? 'N/A',
                            'clock_in' => $record->clock_in_time ? $record->clock_in_time->format('H:i') : null,
                            'clock_out' => $record->clock_out_time ? $record->clock_out_time->format('H:i') : null,
                            'hours' => $record->total_hours,
                            'is_manual' => $record->entry_type === 'manual'
                        ];
                    })->values()
                ];

                $current->addDay();
            }

            return response()->json([
                'success' => true,
                'data' => $calendarData
            ]);

        } catch (\Exception $e) {
            Log::error('Error in calendar report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load calendar data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily report
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function daily(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $date = $request->input('date', now()->format('Y-m-d'));
            $departmentId = $request->input('department_id');
            $taskId = $request->input('task_id');
            $entryType = $request->input('entry_type');
            $search = $request->input('search');

            $query = VolunteerAttendance::with([
                    'volunteer:id,volunteer_id,full_name,ic_number',
                    'department:id,department_name',
                    'task:id,task_name',
                    'createdBy:id,name'
                ])
                ->onDate($date)
                ->completed();

            // Apply filters
            if ($departmentId) {
                $query->forDepartment($departmentId);
            }

            if ($taskId) {
                $query->forTask($taskId);
            }

            if ($entryType) {
                if ($entryType === 'normal') {
                    $query->normalEntries();
                } elseif ($entryType === 'manual') {
                    $query->manualEntries();
                }
            }

            if ($search) {
                $query->search($search);
            }

            $records = $query->orderBy('clock_in_time', 'asc')->get();

            // Calculate statistics
            $stats = [
                'total_records' => $records->count(),
                'total_hours' => round($records->sum('total_hours'), 2),
                'unique_volunteers' => $records->unique('volunteer_id')->count(),
                'manual_entries' => $records->where('entry_type', 'manual')->count(),
                'departments_involved' => $records->unique('department_id')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'records' => $records,
                    'statistics' => $stats,
                    'date' => $date
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in daily report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load daily report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get weekly report
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function weekly(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $weekStart = $request->input('week_start', now()->startOfWeek()->format('Y-m-d'));
            
            $startDate = Carbon::parse($weekStart)->startOfWeek();
            $endDate = $startDate->copy()->endOfWeek();

            $records = VolunteerAttendance::with([
                    'volunteer:id,volunteer_id,full_name',
                    'department:id,department_name',
                    'task:id,task_name'
                ])
                ->betweenDates($startDate->format('Y-m-d'), $endDate->format('Y-m-d'))
                ->completed()
                ->get();

            // Group by day
            $dailyBreakdown = [];
            $current = $startDate->copy();
            
            while ($current <= $endDate) {
                $dateStr = $current->format('Y-m-d');
                $dayRecords = $records->filter(function($record) use ($dateStr) {
                    return $record->attendance_date->format('Y-m-d') === $dateStr;
                });
                
                $dailyBreakdown[] = [
                    'date' => $dateStr,
                    'day_name' => $current->format('l'),
                    'records_count' => $dayRecords->count(),
                    'total_hours' => round($dayRecords->sum('total_hours'), 2),
                    'unique_volunteers' => $dayRecords->unique('volunteer_id')->count()
                ];

                $current->addDay();
            }

            // Overall statistics
            $stats = [
                'total_records' => $records->count(),
                'total_hours' => round($records->sum('total_hours'), 2),
                'unique_volunteers' => $records->unique('volunteer_id')->count(),
                'average_hours_per_day' => round($records->sum('total_hours') / 7, 2),
                'manual_entries' => $records->where('entry_type', 'manual')->count(),
                'peak_day' => collect($dailyBreakdown)->sortByDesc('total_hours')->first()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'daily_breakdown' => $dailyBreakdown,
                    'statistics' => $stats,
                    'period' => [
                        'start' => $startDate->format('Y-m-d'),
                        'end' => $endDate->format('Y-m-d')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in weekly report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load weekly report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get monthly report
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function monthly(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $month = $request->input('month', now()->month);
            $year = $request->input('year', now()->year);

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $records = VolunteerAttendance::with([
                    'volunteer:id,volunteer_id,full_name',
                    'department:id,department_name',
                    'task:id,task_name'
                ])
                ->betweenDates($startDate->format('Y-m-d'), $endDate->format('Y-m-d'))
                ->completed()
                ->get();

            // Weekly breakdown
            $weeklyBreakdown = [];
            $current = $startDate->copy();
            $weekNumber = 1;
            
            while ($current <= $endDate) {
                $weekEnd = $current->copy()->endOfWeek();
                if ($weekEnd > $endDate) {
                    $weekEnd = $endDate;
                }

                $weekRecords = $records->filter(function($record) use ($current, $weekEnd) {
                    $recordDate = $record->attendance_date;
                    return $recordDate >= $current && $recordDate <= $weekEnd;
                });

                $weeklyBreakdown[] = [
                    'week' => $weekNumber,
                    'start_date' => $current->format('Y-m-d'),
                    'end_date' => $weekEnd->format('Y-m-d'),
                    'records_count' => $weekRecords->count(),
                    'total_hours' => round($weekRecords->sum('total_hours'), 2),
                    'unique_volunteers' => $weekRecords->unique('volunteer_id')->count()
                ];

                $current = $weekEnd->copy()->addDay();
                $weekNumber++;
            }

            // Overall statistics
            $stats = [
                'total_records' => $records->count(),
                'total_hours' => round($records->sum('total_hours'), 2),
                'unique_volunteers' => $records->unique('volunteer_id')->count(),
                'average_hours_per_day' => round($records->sum('total_hours') / $endDate->day, 2),
                'manual_entries' => $records->where('entry_type', 'manual')->count(),
                'peak_week' => collect($weeklyBreakdown)->sortByDesc('total_hours')->first()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'weekly_breakdown' => $weeklyBreakdown,
                    'statistics' => $stats,
                    'period' => [
                        'month' => $startDate->format('F Y'),
                        'start' => $startDate->format('Y-m-d'),
                        'end' => $endDate->format('Y-m-d')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in monthly report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load monthly report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get summary statistics
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function summary(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $departmentId = $request->input('department_id');
            $taskId = $request->input('task_id');
            $entryType = $request->input('entry_type');

            // Default to current month if no dates provided
            if (!$dateFrom && !$dateTo) {
                $dateFrom = now()->startOfMonth()->format('Y-m-d');
                $dateTo = now()->endOfMonth()->format('Y-m-d');
            }

            $query = VolunteerAttendance::betweenDates($dateFrom, $dateTo)
                ->completed();

            if ($departmentId) {
                $query->forDepartment($departmentId);
            }

            if ($taskId) {
                $query->forTask($taskId);
            }

            if ($entryType) {
                if ($entryType === 'normal') {
                    $query->normalEntries();
                } elseif ($entryType === 'manual') {
                    $query->manualEntries();
                }
            }

            $records = $query->get();

            $totalDays = Carbon::parse($dateFrom)->diffInDays(Carbon::parse($dateTo)) + 1;

            $summary = [
                'total_records' => $records->count(),
                'total_hours' => round($records->sum('total_hours'), 2),
                'unique_volunteers' => $records->unique('volunteer_id')->count(),
                'average_hours_per_day' => $totalDays > 0 ? round($records->sum('total_hours') / $totalDays, 2) : 0,
                'normal_entries' => $records->where('entry_type', 'normal')->count(),
                'manual_entries' => $records->where('entry_type', 'manual')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $summary
            ]);

        } catch (\Exception $e) {
            Log::error('Error in summary report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get department summary
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function departmentSummary(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $dateFrom = $request->input('date_from', now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->input('date_to', now()->endOfMonth()->format('Y-m-d'));

            $departments = VolunteerDepartment::where('status', 'active')
                ->get();

            $summary = $departments->map(function ($department) use ($dateFrom, $dateTo) {
                $records = VolunteerAttendance::where('department_id', $department->id)
                    ->betweenDates($dateFrom, $dateTo)
                    ->completed()
                    ->get();

                return [
                    'department_id' => $department->id,
                    'department_name' => $department->department_name,
                    'department_code' => $department->department_code,
                    'total_records' => $records->count(),
                    'total_hours' => round($records->sum('total_hours'), 2),
                    'unique_volunteers' => $records->unique('volunteer_id')->count(),
                    'average_hours' => $records->count() > 0 
                        ? round($records->sum('total_hours') / $records->count(), 2) 
                        : 0,
                    'manual_entries' => $records->where('entry_type', 'manual')->count()
                ];
            })->sortByDesc('total_hours')->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'departments' => $summary,
                    'period' => [
                        'start' => $dateFrom,
                        'end' => $dateTo
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in department summary: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load department summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get volunteer activity report
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function volunteerActivity(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $volunteerId = $request->input('volunteer_id');
            $dateFrom = $request->input('date_from', now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->input('date_to', now()->endOfMonth()->format('Y-m-d'));

            if (!$volunteerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer ID is required'
                ], 400);
            }

            $volunteer = Volunteer::find($volunteerId);
            if (!$volunteer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Volunteer not found'
                ], 404);
            }

            $records = VolunteerAttendance::with(['department', 'task'])
                ->where('volunteer_id', $volunteerId)
                ->betweenDates($dateFrom, $dateTo)
                ->completed()
                ->get();

            $performance = [
                'volunteer' => [
                    'id' => $volunteer->id,
                    'volunteer_id' => $volunteer->volunteer_id,
                    'name' => $volunteer->full_name,
                    'status' => $volunteer->status
                ],
                'period' => [
                    'start' => $dateFrom,
                    'end' => $dateTo
                ],
                'statistics' => [
                    'total_attendance' => $records->count(),
                    'total_hours' => round($records->sum('total_hours'), 2),
                    'average_hours_per_attendance' => $records->count() > 0 
                        ? round($records->sum('total_hours') / $records->count(), 2) 
                        : 0,
                    'departments_worked' => $records->unique('department_id')->count(),
                    'tasks_performed' => $records->unique('task_id')->count(),
                    'manual_entries' => $records->where('entry_type', 'manual')->count()
                ],
                'department_breakdown' => $records->groupBy('department_id')
                    ->map(function ($group) {
                        $department = $group->first()->department;
                        return [
                            'department' => $department->department_name,
                            'attendance_count' => $group->count(),
                            'total_hours' => round($group->sum('total_hours'), 2)
                        ];
                    })
                    ->values(),
                'recent_attendance' => $records->sortByDesc('attendance_date')
                    ->take(10)
                    ->map(function ($record) {
                        return [
                            'date' => $record->attendance_date->format('Y-m-d'),
                            'department' => $record->department->department_name,
                            'task' => $record->task->task_name,
                            'hours' => $record->total_hours,
                            'clock_in' => $record->clock_in_time->format('H:i'),
                            'clock_out' => $record->clock_out_time->format('H:i')
                        ];
                    })
                    ->values()
            ];

            return response()->json([
                'success' => true,
                'data' => $performance
            ]);

        } catch (\Exception $e) {
            Log::error('Error in volunteer activity report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load volunteer activity',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report to Excel (CSV format)
     * 
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function exportExcel(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $departmentId = $request->input('department_id');
            $taskId = $request->input('task_id');
            $entryType = $request->input('entry_type');

            // Default to current month if no dates provided
            if (!$dateFrom && !$dateTo) {
                $dateFrom = now()->startOfMonth()->format('Y-m-d');
                $dateTo = now()->endOfMonth()->format('Y-m-d');
            }

            $query = VolunteerAttendance::with([
                    'volunteer:id,volunteer_id,full_name,ic_number',
                    'department:id,department_name',
                    'task:id,task_name'
                ])
                ->betweenDates($dateFrom, $dateTo)
                ->completed();

            // Apply filters
            if ($departmentId) {
                $query->forDepartment($departmentId);
            }

            if ($taskId) {
                $query->forTask($taskId);
            }

            if ($entryType) {
                if ($entryType === 'normal') {
                    $query->normalEntries();
                } elseif ($entryType === 'manual') {
                    $query->manualEntries();
                }
            }

            $records = $query->orderBy('attendance_date', 'desc')->get();

            // Create CSV data
            $filename = 'volunteer_attendance_report_' . date('Y-m-d_His') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function() use ($records) {
                $file = fopen('php://output', 'w');
                
                // Add UTF-8 BOM for Excel compatibility
                fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
                
                // Add headers
                fputcsv($file, [
                    'Date',
                    'Volunteer ID',
                    'Volunteer Name',
                    'IC Number',
                    'Department',
                    'Task',
                    'Clock In',
                    'Clock Out',
                    'Total Hours',
                    'Entry Type',
                    'Remarks'
                ]);

                // Add data rows
                foreach ($records as $record) {
                    fputcsv($file, [
                        $record->attendance_date->format('d/m/Y'),
                        $record->volunteer->volunteer_id ?? 'N/A',
                        $record->volunteer->full_name ?? 'N/A',
                        $record->volunteer->ic_number ?? 'N/A',
                        $record->department->department_name ?? 'N/A',
                        $record->task->task_name ?? 'N/A',
                        $record->clock_in_time ? $record->clock_in_time->format('H:i') : '-',
                        $record->clock_out_time ? $record->clock_out_time->format('H:i') : '-',
                        $record->total_hours ? round($record->total_hours, 2) : '0',
                        ucfirst($record->entry_type),
                        $record->remarks ?? ''
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);

        } catch (\Exception $e) {
            Log::error('Error exporting attendance report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            // Return a proper error for file download context
            return response('Error generating report: ' . $e->getMessage(), 500)
                ->header('Content-Type', 'text/plain');
        }
    }

    /**
     * Export report to PDF (HTML format for browser save as PDF)
     * 
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function exportPdf(Request $request)
    {
        try {
            $templeId = $request->header('X-Temple-ID');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $departmentId = $request->input('department_id');
            $taskId = $request->input('task_id');
            $entryType = $request->input('entry_type');

            // Default to current month if no dates provided
            if (!$dateFrom && !$dateTo) {
                $dateFrom = now()->startOfMonth()->format('Y-m-d');
                $dateTo = now()->endOfMonth()->format('Y-m-d');
            }

            $query = VolunteerAttendance::with([
                    'volunteer:id,volunteer_id,full_name,ic_number',
                    'department:id,department_name',
                    'task:id,task_name'
                ])
                ->betweenDates($dateFrom, $dateTo)
                ->completed();

            // Apply filters
            if ($departmentId) {
                $query->forDepartment($departmentId);
            }

            if ($taskId) {
                $query->forTask($taskId);
            }

            if ($entryType) {
                if ($entryType === 'normal') {
                    $query->normalEntries();
                } elseif ($entryType === 'manual') {
                    $query->manualEntries();
                }
            }

            $records = $query->orderBy('attendance_date', 'desc')->get();

            // Generate HTML for PDF
            $html = '
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Volunteer Attendance Report</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 12px; }
                    h1 { text-align: center; color: #333; }
                    .info { text-align: center; margin-bottom: 20px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #4CAF50; color: white; padding: 8px; text-align: left; }
                    td { padding: 6px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
                </style>
            </head>
            <body>
                <h1>Volunteer Attendance Report</h1>
                <div class="info">
                    <p>Period: ' . date('d/m/Y', strtotime($dateFrom)) . ' to ' . date('d/m/Y', strtotime($dateTo)) . '</p>
                    <p>Generated: ' . now()->format('d/m/Y H:i') . '</p>
                    <p>Total Records: ' . $records->count() . '</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Volunteer</th>
                            <th>Department</th>
                            <th>Task</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Hours</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($records as $record) {
                $html .= '<tr>
                    <td>' . $record->attendance_date->format('d/m/Y') . '</td>
                    <td>' . ($record->volunteer->full_name ?? 'N/A') . '<br><small>' . ($record->volunteer->volunteer_id ?? '') . '</small></td>
                    <td>' . ($record->department->department_name ?? 'N/A') . '</td>
                    <td>' . ($record->task->task_name ?? 'N/A') . '</td>
                    <td>' . ($record->clock_in_time ? $record->clock_in_time->format('H:i') : '-') . '</td>
                    <td>' . ($record->clock_out_time ? $record->clock_out_time->format('H:i') : '-') . '</td>
                    <td>' . ($record->total_hours ? round($record->total_hours, 2) : '0') . '</td>
                    <td>' . ucfirst($record->entry_type) . '</td>
                </tr>';
            }

            $html .= '
                    </tbody>
                </table>
                <div class="footer">
                    <p>Chinese Temple Management System - Volunteer Attendance Report</p>
                </div>
            </body>
            </html>';

            // Return HTML as downloadable file (browsers can save as PDF)
            $filename = 'volunteer_attendance_report_' . date('Y-m-d_His') . '.html';
            
            return response($html, 200)
                ->header('Content-Type', 'text/html')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');

        } catch (\Exception $e) {
            Log::error('Error exporting PDF report: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response('Error generating report: ' . $e->getMessage(), 500)
                ->header('Content-Type', 'text/plain');
        }
    }
}