<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Exception;

class OccasionTableAssignmentController extends Controller
{
    /**
     * Generate assignment number
     * Format: {TableName}R{Row}C{Column}{MMDDYY}
     * Example: TableAR1C1050126 (Table A, Row 1, Column 1, 05/01/26)
     */
    private function generateAssignNumber($tableName, $row, $column, $date = null)
    {
        $date = $date ?? Carbon::now();
        $dateStr = $date->format('mdy'); // MMDDYY format
        
        // Clean table name (remove spaces, special chars)
        $cleanTableName = preg_replace('/[^A-Za-z0-9]/', '', $tableName);
        
        return strtoupper("{$cleanTableName}R{$row}C{$column}{$dateStr}");
    }

    /**
     * Get all tables and assignments for a package option
     * GET /api/v1/occasion-tables/option/{optionId}
     */
    public function getTables($optionId)
    {
        try {
            $tables = DB::table('occasion_option_tables')
                ->where('option_id', $optionId)
                ->whereNull('deleted_at')
                ->orderBy('sort_order')
                ->get();

            $tablesWithAssignments = [];

            foreach ($tables as $table) {
                $assignments = DB::table('occasion_option_table_assignments')
                    ->where('table_id', $table->id)
                    ->where('is_current', true)
                    ->orderBy('row_number')
                    ->orderBy('column_number')
                    ->get();

                // Group assignments by row for easier display
                $assignmentGrid = [];
                foreach ($assignments as $assignment) {
                    if (!isset($assignmentGrid[$assignment->row_number])) {
                        $assignmentGrid[$assignment->row_number] = [];
                    }
                    $assignmentGrid[$assignment->row_number][$assignment->column_number] = [
                        'id' => $assignment->id,
                        'assign_number' => $assignment->assign_number,
                        'status' => $assignment->status,
                        'booking_id' => $assignment->booking_id
                    ];
                }

                $tablesWithAssignments[] = [
                    'id' => $table->id,
                    'table_name' => $table->table_name,
                    'rows' => $table->rows,
                    'columns' => $table->columns,
                    'status' => $table->status,
                    'assignments' => $assignmentGrid,
                    'total_seats' => $assignments->count(),
                    'available_seats' => $assignments->where('status', 'available')->count(),
                    'assigned_seats' => $assignments->where('status', 'assigned')->count()
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $tablesWithAssignments
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching tables: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NEW METHOD: Get single assignment details
     * GET /api/v1/occasion-table-assignments/{assignmentId}
     * This is called by the relocation modal to load current assignment info
     */
    public function getAssignment($assignmentId)
    {
        try {
            $assignment = DB::table('occasion_option_table_assignments')
                ->where('id', $assignmentId)
                ->where('is_current', true)
                ->first();

            if (!$assignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment not found or already replaced'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $assignment->id,
                    'option_id' => $assignment->option_id,
                    'table_id' => $assignment->table_id,
                    'table_name' => $assignment->table_name,
                    'row_number' => $assignment->row_number,
                    'column_number' => $assignment->column_number,
                    'assign_number' => $assignment->assign_number,
                    'status' => $assignment->status,
                    'booking_id' => $assignment->booking_id,
                    'booking_item_id' => $assignment->booking_item_id,
                    'assigned_at' => $assignment->assigned_at
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching assignment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assignment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create table configuration and generate all seat assignments
     * POST /api/v1/occasion-options/{optionId}/tables
     */
    public function createTables(Request $request, $optionId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'tables' => 'required|array|min:1',
                'tables.*.table_name' => 'required|string|max:100',
                'tables.*.rows' => 'required|integer|min:1|max:100',
                'tables.*.columns' => 'required|integer|min:1|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $createdTables = [];
            $generatedAssignments = [];

            foreach ($request->tables as $index => $tableData) {
                // Create table configuration
                $tableId = DB::table('occasion_option_tables')->insertGetId([
                    'option_id' => $optionId,
                    'table_name' => $tableData['table_name'],
                    'rows' => $tableData['rows'],
                    'columns' => $tableData['columns'],
                    'status' => 'active',
                    'sort_order' => $index,
                    'created_at' => now(),
                    'updated_at' => now()
                ], 'id');

                $createdTables[] = [
                    'id' => $tableId,
                    'table_name' => $tableData['table_name'],
                    'rows' => $tableData['rows'],
                    'columns' => $tableData['columns']
                ];

                // Generate seat assignments for all rows x columns
                $assignments = [];
                for ($row = 1; $row <= $tableData['rows']; $row++) {
                    for ($col = 1; $col <= $tableData['columns']; $col++) {
                        $assignNumber = $this->generateAssignNumber(
                            $tableData['table_name'],
                            $row,
                            $col
                        );

                        $assignment = [
                            'option_id' => $optionId,
                            'table_id' => $tableId,
                            'table_name' => $tableData['table_name'],
                            'row_number' => $row,
                            'column_number' => $col,
                            'assign_number' => $assignNumber,
                            'is_current' => true,
                            'status' => 'available',
                            'created_at' => now(),
                            'updated_at' => now(),
                            'assigned_at' => now()
                        ];

                        $assignments[] = $assignment;
                        $generatedAssignments[] = [
                            'table_name' => $tableData['table_name'],
                            'row' => $row,
                            'column' => $col,
                            'assign_number' => $assignNumber
                        ];
                    }
                }

                // Bulk insert all assignments for this table
                if (!empty($assignments)) {
                    DB::table('occasion_option_table_assignments')->insert($assignments);
                }

                Log::info('Created table with assignments', [
                    'table_id' => $tableId,
                    'table_name' => $tableData['table_name'],
                    'total_seats' => count($assignments)
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tables and seat assignments created successfully',
                'data' => [
                    'tables' => $createdTables,
                    'total_assignments' => count($generatedAssignments),
                    'assignments' => $generatedAssignments
                ]
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating tables and assignments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create tables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relocate (edit) an assignment - creates new assignment and marks old as replaced
     * PUT /api/v1/occasion-table-assignments/{assignmentId}/relocate
     */
    public function relocateAssignment(Request $request, $assignmentId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'new_table_name' => 'required|string|max:100',
                'new_row' => 'required|integer|min:1',
                'new_column' => 'required|integer|min:1',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Get current assignment
            $oldAssignment = DB::table('occasion_option_table_assignments')
                ->where('id', $assignmentId)
                ->where('is_current', true)
                ->first();

            if (!$oldAssignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment not found or already replaced'
                ], 404);
            }

            // Generate new assign number
            $newAssignNumber = $this->generateAssignNumber(
                $request->new_table_name,
                $request->new_row,
                $request->new_column
            );

            // Check if new assign number already exists and is current
            $exists = DB::table('occasion_option_table_assignments')
                ->where('assign_number', $newAssignNumber)
                ->where('is_current', true)
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Target seat is already assigned'
                ], 422);
            }

            // Get the table_id for new location (might be same table or different)
            $newTable = DB::table('occasion_option_tables')
                ->where('option_id', $oldAssignment->option_id)
                ->where('table_name', $request->new_table_name)
                ->first();

            if (!$newTable) {
                return response()->json([
                    'success' => false,
                    'message' => 'Target table not found'
                ], 404);
            }

            // Create new assignment
            $newAssignmentId = DB::table('occasion_option_table_assignments')->insertGetId([
                'option_id' => $oldAssignment->option_id,
                'table_id' => $newTable->id,
                'table_name' => $request->new_table_name,
                'row_number' => $request->new_row,
                'column_number' => $request->new_column,
                'assign_number' => $newAssignNumber,
                'is_current' => true,
                'booking_id' => $oldAssignment->booking_id, // Carry over booking
                'booking_item_id' => $oldAssignment->booking_item_id,
                'status' => $oldAssignment->status, // Carry over status
                'created_at' => now(),
                'updated_at' => now(),
                'assigned_at' => now(),
                'notes' => $request->notes
            ], 'id');

            // Mark old assignment as replaced
            DB::table('occasion_option_table_assignments')
                ->where('id', $assignmentId)
                ->update([
                    'is_current' => false,
                    'status' => 'relocated',
                    'replaced_at' => now(),
                    'replaced_by' => $newAssignmentId,
                    'updated_at' => now()
                ]);

            DB::commit();

            Log::info('Assignment relocated', [
                'old_assignment_id' => $assignmentId,
                'old_assign_number' => $oldAssignment->assign_number,
                'new_assignment_id' => $newAssignmentId,
                'new_assign_number' => $newAssignNumber
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Assignment relocated successfully',
                'data' => [
                    'old_assignment' => [
                        'id' => $oldAssignment->id,
                        'assign_number' => $oldAssignment->assign_number,
                        'table_name' => $oldAssignment->table_name,
                        'row' => $oldAssignment->row_number,
                        'column' => $oldAssignment->column_number
                    ],
                    'new_assignment' => [
                        'id' => $newAssignmentId,
                        'assign_number' => $newAssignNumber,
                        'table_name' => $request->new_table_name,
                        'row' => $request->new_row,
                        'column' => $request->new_column
                    ]
                ]
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error relocating assignment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to relocate assignment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get assignment history (for relocation tracking report)
     * GET /api/v1/occasion-table-assignments/option/{optionId}/history
     */
    public function getAssignmentHistory(Request $request, $optionId)
    {
        try {
            $query = DB::table('occasion_option_table_assignments as current')
                ->where('current.option_id', $optionId)
                ->where('current.is_current', true);

            // Optional filters
            if ($request->filled('table_name')) {
                $query->where('current.table_name', $request->table_name);
            }

            if ($request->filled('status')) {
                $query->where('current.status', $request->status);
            }

            $currentAssignments = $query->get();

            $historyData = [];

            foreach ($currentAssignments as $current) {
                // Get full history chain for this seat
                $history = $this->getFullHistoryChain($current->id);

                $historyData[] = [
                    'current_assignment' => [
                        'id' => $current->id,
                        'assign_number' => $current->assign_number,
                        'table_name' => $current->table_name,
                        'row' => $current->row_number,
                        'column' => $current->column_number,
                        'status' => $current->status,
                        'assigned_at' => $current->assigned_at
                    ],
                    'history' => $history,
                    'relocation_count' => count($history)
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $historyData,
                'total_current_assignments' => count($currentAssignments),
                'total_with_history' => count(array_filter($historyData, fn($item) => $item['relocation_count'] > 0))
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching assignment history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assignment history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get full history chain for an assignment (recursively finds all previous versions)
     */
    private function getFullHistoryChain($assignmentId)
    {
        $history = [];
        
        // Find all assignments that were replaced BY this one
        $previous = DB::table('occasion_option_table_assignments')
            ->where('replaced_by', $assignmentId)
            ->orderBy('replaced_at', 'desc')
            ->get();

        foreach ($previous as $prev) {
            $history[] = [
                'id' => $prev->id,
                'assign_number' => $prev->assign_number,
                'table_name' => $prev->table_name,
                'row' => $prev->row_number,
                'column' => $prev->column_number,
                'status' => $prev->status,
                'assigned_at' => $prev->assigned_at,
                'replaced_at' => $prev->replaced_at,
                'notes' => $prev->notes
            ];

            // Recursively get earlier history
            $earlierHistory = $this->getFullHistoryChain($prev->id);
            $history = array_merge($history, $earlierHistory);
        }

        return $history;
    }

    /**
     * Generate relocation report (Excel/PDF export)
     * GET /api/v1/occasion-table-assignments/option/{optionId}/relocation-report
     */
    public function generateRelocationReport(Request $request, $optionId)
    {
        try {
            $assignments = DB::table('occasion_option_table_assignments')
                ->where('option_id', $optionId)
                ->where('is_current', false)
                ->where('status', 'relocated')
                ->orderBy('replaced_at', 'desc')
                ->get();

            $reportData = [];

            foreach ($assignments as $assignment) {
                // Get the new assignment that replaced this one
                $newAssignment = DB::table('occasion_option_table_assignments')
                    ->where('id', $assignment->replaced_by)
                    ->first();

                $reportData[] = [
                    'old_table' => $assignment->table_name,
                    'old_row' => $assignment->row_number,
                    'old_column' => $assignment->column_number,
                    'old_assign_number' => $assignment->assign_number,
                    'new_table' => $newAssignment ? $newAssignment->table_name : '-',
                    'new_row' => $newAssignment ? $newAssignment->row_number : '-',
                    'new_column' => $newAssignment ? $newAssignment->column_number : '-',
                    'new_assign_number' => $newAssignment ? $newAssignment->assign_number : '-',
                    'relocated_at' => $assignment->replaced_at,
                    'notes' => $assignment->notes
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $reportData,
                'total_relocations' => count($reportData)
            ], 200);

        } catch (Exception $e) {
            Log::error('Error generating relocation report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update table configuration (rows/columns)
     * PUT /api/v1/occasion-tables/{tableId}
     */
    public function updateTable(Request $request, $tableId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'rows' => 'sometimes|integer|min:1|max:100',
                'columns' => 'sometimes|integer|min:1|max:100',
                'table_name' => 'sometimes|string|max:100'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $table = DB::table('occasion_option_tables')->where('id', $tableId)->first();

            if (!$table) {
                return response()->json([
                    'success' => false,
                    'message' => 'Table not found'
                ], 404);
            }

            $updateData = ['updated_at' => now()];

            if ($request->filled('table_name')) {
                $updateData['table_name'] = $request->table_name;
            }

            $oldRows = $table->rows;
            $oldColumns = $table->columns;
            $newRows = $request->filled('rows') ? $request->rows : $oldRows;
            $newColumns = $request->filled('columns') ? $request->columns : $oldColumns;

            // If dimensions changed, need to adjust assignments
            if ($newRows != $oldRows || $newColumns != $oldColumns) {
                $updateData['rows'] = $newRows;
                $updateData['columns'] = $newColumns;

                // If increasing size, create new assignments for new seats
                if ($newRows > $oldRows || $newColumns > $oldColumns) {
                    $newAssignments = [];

                    for ($row = 1; $row <= $newRows; $row++) {
                        for ($col = 1; $col <= $newColumns; $col++) {
                            // Check if this seat already exists
                            $exists = DB::table('occasion_option_table_assignments')
                                ->where('table_id', $tableId)
                                ->where('row_number', $row)
                                ->where('column_number', $col)
                                ->where('is_current', true)
                                ->exists();

                            if (!$exists) {
                                $assignNumber = $this->generateAssignNumber(
                                    $request->filled('table_name') ? $request->table_name : $table->table_name,
                                    $row,
                                    $col
                                );

                                $newAssignments[] = [
                                    'id' => DB::raw('gen_random_uuid()'),
                                    'option_id' => $table->option_id,
                                    'table_id' => $tableId,
                                    'table_name' => $request->filled('table_name') ? $request->table_name : $table->table_name,
                                    'row_number' => $row,
                                    'column_number' => $col,
                                    'assign_number' => $assignNumber,
                                    'is_current' => true,
                                    'status' => 'available',
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                    'assigned_at' => now()
                                ];
                            }
                        }
                    }

                    if (!empty($newAssignments)) {
                        DB::table('occasion_option_table_assignments')->insert($newAssignments);
                    }
                }

                // If decreasing size, mark assignments outside new boundaries as inactive
                if ($newRows < $oldRows || $newColumns < $oldColumns) {
                    DB::table('occasion_option_table_assignments')
                        ->where('table_id', $tableId)
                        ->where('is_current', true)
                        ->where(function($query) use ($newRows, $newColumns) {
                            $query->where('row_number', '>', $newRows)
                                  ->orWhere('column_number', '>', $newColumns);
                        })
                        ->update([
                            'is_current' => false,
                            'status' => 'removed',
                            'replaced_at' => now(),
                            'updated_at' => now()
                        ]);
                }
            }

            DB::table('occasion_option_tables')
                ->where('id', $tableId)
                ->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Table updated successfully'
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating table: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update table',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete table and all its assignments
     * DELETE /api/v1/occasion-tables/{tableId}
     */
    public function deleteTable($tableId)
    {
        try {
            DB::beginTransaction();

            $table = DB::table('occasion_option_tables')->where('id', $tableId)->first();

            if (!$table) {
                return response()->json([
                    'success' => false,
                    'message' => 'Table not found'
                ], 404);
            }

            // Check if any seats are currently assigned to bookings
            $hasAssignedSeats = DB::table('occasion_option_table_assignments')
                ->where('table_id', $tableId)
                ->whereNotNull('booking_id')
                ->exists();

            if ($hasAssignedSeats) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete table with assigned seats. Please relocate or cancel bookings first.'
                ], 422);
            }

            // Soft delete table
            DB::table('occasion_option_tables')
                ->where('id', $tableId)
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now()
                ]);

            // Mark all assignments as removed (soft delete)
            DB::table('occasion_option_table_assignments')
                ->where('table_id', $tableId)
                ->where('is_current', true)
                ->update([
                    'is_current' => false,
                    'status' => 'removed',
                    'replaced_at' => now(),
                    'updated_at' => now()
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Table deleted successfully'
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error deleting table: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete table',
                'error' => $e->getMessage()
            ], 500);
        }
    }

     public function checkSeatAvailability(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'option_id' => 'required|uuid',
                'table_name' => 'required|string',
                'row_number' => 'required|integer|min:1',
                'column_number' => 'required|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'available' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $optionId = $request->option_id;
            $tableName = $request->table_name;
            $rowNumber = $request->row_number;
            $columnNumber = $request->column_number;

            // Check if table exists
            $table = DB::table('occasion_option_tables')
                ->where('option_id', $optionId)
                ->where('table_name', $tableName)
                ->whereNull('deleted_at')
                ->first();

            if (!$table) {
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => 'Table not found'
                ], 200);
            }

            // Check if row/column is within table dimensions
            if ($rowNumber > $table->rows) {
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => "This table only has {$table->rows} rows. Row {$rowNumber} does not exist."
                ], 200);
            }

            if ($columnNumber > $table->columns) {
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => "This table only has {$table->columns} columns. Column {$columnNumber} does not exist."
                ], 200);
            }

            // Check seat assignment status
            $assignment = DB::table('occasion_option_table_assignments')
                ->where('table_id', $table->id)
                ->where('row_number', $rowNumber)
                ->where('column_number', $columnNumber)
                ->where('is_current', true)
                ->first();

            if (!$assignment) {
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => 'Seat assignment record not found. Please regenerate table assignments.'
                ], 200);
            }

            // Check status
            if ($assignment->status === 'assigned' && $assignment->booking_id) {
                $bookingShort = substr($assignment->booking_id, 0, 8);
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => "This seat is already assigned to Booking {$bookingShort}...",
                    'data' => [
                        'assignment_id' => $assignment->id,
                        'assign_number' => $assignment->assign_number,
                        'booking_id' => $assignment->booking_id,
                        'status' => $assignment->status
                    ]
                ], 200);
            }

            if ($assignment->status === 'removed') {
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => 'This seat has been removed/made empty and cannot be used',
                    'data' => [
                        'assignment_id' => $assignment->id,
                        'assign_number' => $assignment->assign_number,
                        'status' => $assignment->status
                    ]
                ], 200);
            }

            if ($assignment->status === 'available') {
                return response()->json([
                    'success' => true,
                    'available' => true,
                    'message' => 'Seat is available for assignment',
                    'data' => [
                        'assignment_id' => $assignment->id,
                        'assign_number' => $assignment->assign_number,
                        'table_name' => $assignment->table_name,
                        'row_number' => $assignment->row_number,
                        'column_number' => $assignment->column_number,
                        'status' => $assignment->status
                    ]
                ], 200);
            }

            // Other statuses
            return response()->json([
                'success' => true,
                'available' => false,
                'message' => "Seat status is '{$assignment->status}' - not available for assignment",
                'data' => [
                    'assignment_id' => $assignment->id,
                    'assign_number' => $assignment->assign_number,
                    'status' => $assignment->status
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Error checking seat availability: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'available' => false,
                'message' => 'Failed to check seat availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }
     public function markSeatsAsEmpty(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'option_id' => 'required|uuid',
                'table_id' => 'required|integer',
                'seats' => 'required|array|min:1',
                'seats.*.row' => 'required|integer|min:1',
                'seats.*.column' => 'required|integer|min:1',
                'reason' => 'nullable|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $affectedSeats = [];
            $errors = [];

            foreach ($request->seats as $seat) {
                // Find the assignment
                $assignment = DB::table('occasion_option_table_assignments')
                    ->where('table_id', $request->table_id)
                    ->where('row_number', $seat['row'])
                    ->where('column_number', $seat['column'])
                    ->where('is_current', true)
                    ->first();

                if (!$assignment) {
                    $errors[] = "Seat R{$seat['row']}C{$seat['column']} not found";
                    continue;
                }

                // Check if already assigned to booking
                if ($assignment->status === 'assigned' && $assignment->booking_id) {
                    $errors[] = "Seat {$assignment->assign_number} is currently assigned to a booking and cannot be removed";
                    continue;
                }

                // Check if already removed
                if ($assignment->status === 'removed') {
                    $errors[] = "Seat {$assignment->assign_number} is already marked as empty";
                    continue;
                }

                // Mark as removed
                DB::table('occasion_option_table_assignments')
                    ->where('id', $assignment->id)
                    ->update([
                        'status' => 'removed',
                        'notes' => $request->reason ?? 'Manually marked as empty',
                        'updated_at' => now()
                    ]);

                $affectedSeats[] = [
                    'assignment_id' => $assignment->id,
                    'assign_number' => $assignment->assign_number,
                    'table_name' => $assignment->table_name,
                    'row' => $assignment->row_number,
                    'column' => $assignment->column_number,
                    'previous_status' => $assignment->status
                ];

                Log::info('Seat marked as empty', [
                    'assignment_id' => $assignment->id,
                    'assign_number' => $assignment->assign_number,
                    'reason' => $request->reason
                ]);
            }

            DB::commit();

            $message = count($affectedSeats) > 0 
                ? count($affectedSeats) . ' seat(s) marked as empty' 
                : 'No seats were marked as empty';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'affected_seats' => $affectedSeats,
                    'errors' => $errors,
                    'total_affected' => count($affectedSeats),
                    'total_errors' => count($errors)
                ]
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error marking seats as empty: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark seats as empty',
                'error' => $e->getMessage()
            ], 500);
        }
    }
     public function restoreSeats(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'option_id' => 'required|uuid',
                'table_id' => 'required|integer',
                'seats' => 'required|array|min:1',
                'seats.*.row' => 'required|integer|min:1',
                'seats.*.column' => 'required|integer|min:1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $restoredSeats = [];
            $errors = [];

            foreach ($request->seats as $seat) {
                $assignment = DB::table('occasion_option_table_assignments')
                    ->where('table_id', $request->table_id)
                    ->where('row_number', $seat['row'])
                    ->where('column_number', $seat['column'])
                    ->where('is_current', true)
                    ->first();

                if (!$assignment) {
                    $errors[] = "Seat R{$seat['row']}C{$seat['column']} not found";
                    continue;
                }

                if ($assignment->status !== 'removed') {
                    $errors[] = "Seat {$assignment->assign_number} is not marked as empty (current status: {$assignment->status})";
                    continue;
                }

                // Restore to available
                DB::table('occasion_option_table_assignments')
                    ->where('id', $assignment->id)
                    ->update([
                        'status' => 'available',
                        'notes' => 'Restored from empty status',
                        'updated_at' => now()
                    ]);

                $restoredSeats[] = [
                    'assignment_id' => $assignment->id,
                    'assign_number' => $assignment->assign_number,
                    'table_name' => $assignment->table_name,
                    'row' => $assignment->row_number,
                    'column' => $assignment->column_number
                ];

                Log::info('Seat restored', [
                    'assignment_id' => $assignment->id,
                    'assign_number' => $assignment->assign_number
                ]);
            }

            DB::commit();

            $message = count($restoredSeats) > 0 
                ? count($restoredSeats) . ' seat(s) restored to available' 
                : 'No seats were restored';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'restored_seats' => $restoredSeats,
                    'errors' => $errors,
                    'total_restored' => count($restoredSeats),
                    'total_errors' => count($errors)
                ]
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error restoring seats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to restore seats',
                'error' => $e->getMessage()
            ], 500);
        }
    }
      public function bulkMarkSeatsAsEmpty(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'option_id' => 'required|uuid',
                'tables' => 'required|array|min:1',
                'tables.*.table_id' => 'required|integer',
                'tables.*.seats' => 'required|array|min:1',
                'tables.*.seats.*.row' => 'required|integer|min:1',
                'tables.*.seats.*.column' => 'required|integer|min:1',
                'reason' => 'nullable|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $allAffectedSeats = [];
            $allErrors = [];

            foreach ($request->tables as $tableData) {
                $tableId = $tableData['table_id'];
                $seats = $tableData['seats'];

                foreach ($seats as $seat) {
                    $assignment = DB::table('occasion_option_table_assignments')
                        ->where('table_id', $tableId)
                        ->where('row_number', $seat['row'])
                        ->where('column_number', $seat['column'])
                        ->where('is_current', true)
                        ->first();

                    if (!$assignment) {
                        $allErrors[] = "Table {$tableId}: Seat R{$seat['row']}C{$seat['column']} not found";
                        continue;
                    }

                    if ($assignment->status === 'assigned' && $assignment->booking_id) {
                        $allErrors[] = "Seat {$assignment->assign_number} is assigned to a booking";
                        continue;
                    }

                    if ($assignment->status === 'removed') {
                        $allErrors[] = "Seat {$assignment->assign_number} is already empty";
                        continue;
                    }

                    DB::table('occasion_option_table_assignments')
                        ->where('id', $assignment->id)
                        ->update([
                            'status' => 'removed',
                            'notes' => $request->reason ?? 'Bulk operation: marked as empty',
                            'updated_at' => now()
                        ]);

                    $allAffectedSeats[] = [
                        'assignment_id' => $assignment->id,
                        'assign_number' => $assignment->assign_number,
                        'table_id' => $tableId,
                        'table_name' => $assignment->table_name
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($allAffectedSeats) . ' seat(s) marked as empty across ' . count($request->tables) . ' table(s)',
                'data' => [
                    'affected_seats' => $allAffectedSeats,
                    'errors' => $allErrors,
                    'total_affected' => count($allAffectedSeats),
                    'total_errors' => count($allErrors)
                ]
            ], 200);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error in bulk mark empty: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark seats as empty',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}