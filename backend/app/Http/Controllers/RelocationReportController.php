<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class RelocationReportController extends Controller
{
    /**
     * Generate relocation report with filters
     * GET /api/reports/relocation-report
     * 
     * @param Request $request
     * @return JsonResponse|StreamedResponse
     */
    public function generateRelocationReport(Request $request)
    {
        try {
            $format = $request->get('format', 'json'); // json, pdf, excel

            // Build query with all filters
            $reportData = $this->buildRelocationReportQuery($request);

            switch ($format) {
                case 'pdf':
                    return $this->generatePdfReport($reportData, $request);
                
                case 'excel':
                    return $this->generateExcelReport($reportData, $request);
                
                default:
                    return response()->json([
                        'success' => true,
                        'data' => $reportData['records'],
                        'summary' => $reportData['summary'],
                        'filters' => $reportData['filters']
                    ], 200);
            }

        } catch (Exception $e) {
            Log::error('Error generating relocation report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build the main query for relocation report
     * 
     * @param Request $request
     * @return array
     */
    private function buildRelocationReportQuery(Request $request)
    {
        $query = DB::table('special_occasion_relocation_history as rh')
            ->leftJoin('special_occ_master as som', 'rh.occasion_id', '=', 'som.id')
            ->leftJoin('bookings as b', 'rh.booking_id', '=', 'b.id')
            ->leftJoin('users as u', 'rh.changed_by', '=', 'u.id')
            ->select([
                'rh.id',
                'rh.occasion_id',
                'som.occasion_name_primary as event_name',
                'som.occasion_name_secondary as event_name_secondary',
                'rh.booking_id',
                'b.booking_number',
                'b.booking_date',
                'rh.old_table_name',
                'rh.old_row_number',
                'rh.old_column_number',
                'rh.old_assign_number',
                'rh.new_table_name',
                'rh.new_row_number',
                'rh.new_column_number',
                'rh.new_assign_number',
                'rh.action_type',
                'rh.change_reason',
                'rh.changed_by',
                'u.name as changed_by_name',
                'u.email as changed_by_email',
                'rh.changed_at'
            ]);

        // Apply filters
        $filters = [];

        if ($request->filled('occasion_id')) {
            $query->where('rh.occasion_id', $request->occasion_id);
            $filters['occasion_id'] = $request->occasion_id;
            $filters['event_name'] = DB::table('special_occ_master')
                ->where('id', $request->occasion_id)
                ->value('occasion_name_primary');
        }

        if ($request->filled('start_date')) {
            $query->whereDate('rh.changed_at', '>=', $request->start_date);
            $filters['start_date'] = $request->start_date;
        }

        if ($request->filled('end_date')) {
            $query->whereDate('rh.changed_at', '<=', $request->end_date);
            $filters['end_date'] = $request->end_date;
        }

        if ($request->filled('changed_by')) {
            $query->where('rh.changed_by', $request->changed_by);
            $filters['changed_by'] = $request->changed_by;
        }

        if ($request->filled('action_type')) {
            $query->where('rh.action_type', $request->action_type);
            $filters['action_type'] = $request->action_type;
        }

        if ($request->filled('booking_number')) {
            $query->where('b.booking_number', 'ILIKE', '%' . $request->booking_number . '%');
            $filters['booking_number'] = $request->booking_number;
        }

        if ($request->filled('table_name')) {
            $query->where(function($q) use ($request) {
                $q->where('rh.old_table_name', 'ILIKE', '%' . $request->table_name . '%')
                  ->orWhere('rh.new_table_name', 'ILIKE', '%' . $request->table_name . '%');
            });
            $filters['table_name'] = $request->table_name;
        }

        // Order by changed_at descending
        $query->orderBy('rh.changed_at', 'desc');

        // Get records
        $records = $query->get()->toArray();

        // Calculate summary statistics
        $summary = [
            'total_relocations' => count($records),
            'by_action_type' => [],
            'by_event' => [],
            'by_admin' => [],
            'date_range' => [
                'from' => $request->start_date ?? ($records ? min(array_column($records, 'changed_at')) : null),
                'to' => $request->end_date ?? ($records ? max(array_column($records, 'changed_at')) : null)
            ]
        ];

        // Group by action type
        if (!empty($records)) {
            $actionTypes = array_count_values(array_column($records, 'action_type'));
            foreach ($actionTypes as $type => $count) {
                $summary['by_action_type'][$type] = $count;
            }

            // Group by event
            $events = [];
            foreach ($records as $record) {
                $eventName = $record->event_name ?? 'Unknown';
                if (!isset($events[$eventName])) {
                    $events[$eventName] = 0;
                }
                $events[$eventName]++;
            }
            $summary['by_event'] = $events;

            // Group by admin
            $admins = [];
            foreach ($records as $record) {
                $adminName = $record->changed_by_name ?? 'System';
                if (!isset($admins[$adminName])) {
                    $admins[$adminName] = 0;
                }
                $admins[$adminName]++;
            }
            $summary['by_admin'] = $admins;
        }

        return [
            'records' => $records,
            'summary' => $summary,
            'filters' => $filters
        ];
    }

    /**
     * Generate PDF version of the report
     * 
     * @param array $reportData
     * @param Request $request
     * @return Response
     */
private function generatePdfReport($reportData, $request)
{
    try {
        // Log for debugging
        Log::info('Starting PDF generation', [
            'record_count' => count($reportData['records']),
            'has_filters' => !empty($reportData['filters'])
        ]);

        $data = [
            'title' => 'Seat Relocation Log Report',
            'generated_at' => Carbon::now()->format('d M Y H:i:s'),
            'records' => $reportData['records'],
            'summary' => $reportData['summary'],
            'filters' => $reportData['filters']
        ];

        // Check if view exists
        if (!view()->exists('reports.relocation-report')) {
            Log::error('Blade template not found: reports.relocation-report');
            throw new \Exception('Report template not found. Please contact administrator.');
        }

        Log::info('Loading PDF view');
        
        // Load the view and generate PDF
        $pdf = Pdf::loadView('reports.relocation-report', $data);
        
        // Set paper size and orientation
        $pdf->setPaper('A4', 'landscape');
        
        // Set PDF options for better rendering
        $pdf->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
            'defaultFont' => 'DejaVu Sans',
            'dpi' => 150,
            'defaultMediaType' => 'print',
            'isFontSubsettingEnabled' => true,
        ]);

        $filename = 'Relocation_Report_' . Carbon::now()->format('Ymd_His') . '.pdf';

        Log::info('PDF generated successfully', ['filename' => $filename]);

        // Return with proper headers
        return response()->streamDownload(
            function () use ($pdf) {
                echo $pdf->output();
            },
            $filename,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]
        );
        
    } catch (\Exception $e) {
        Log::error('PDF Report Generation Error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ]);
        
        // Return error as JSON so frontend can see it
        return response()->json([
            'success' => false,
            'message' => 'Failed to generate PDF: ' . $e->getMessage(),
            'error' => config('app.debug') ? $e->getTraceAsString() : 'Internal error'
        ], 500);
    }
}

    /**
     * Generate Excel version of the report
     * 
     * @param array $reportData
     * @param Request $request
     * @return Response
     */
    private function generateExcelReport($reportData, $request)
    {
        try {
            $filename = 'Relocation_Report_' . Carbon::now()->format('Ymd_His') . '.xlsx';

            return Excel::download(
                new RelocationReportExport($reportData),
                $filename
            );
            
        } catch (\Exception $e) {
            Log::error('Excel Report Generation Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

    /**
     * Get relocation statistics for dashboard
     * GET /api/reports/relocation-stats
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getRelocationStats(Request $request)
    {
        try {
            $occasionId = $request->get('occasion_id');
            $startDate = $request->get('start_date', Carbon::now()->subDays(30)->toDateString());
            $endDate = $request->get('end_date', Carbon::now()->toDateString());

            $query = DB::table('special_occasion_relocation_history as rh');

            if ($occasionId) {
                $query->where('rh.occasion_id', $occasionId);
            }

            $query->whereBetween(DB::raw('DATE(rh.changed_at)'), [$startDate, $endDate]);

            // Total relocations
            $totalRelocations = $query->count();

            // By action type
            $byActionType = DB::table('special_occasion_relocation_history as rh')
                ->select('action_type', DB::raw('COUNT(*) as count'))
                ->when($occasionId, function($q) use ($occasionId) {
                    return $q->where('occasion_id', $occasionId);
                })
                ->whereBetween(DB::raw('DATE(changed_at)'), [$startDate, $endDate])
                ->groupBy('action_type')
                ->get()
                ->pluck('count', 'action_type')
                ->toArray();

            // Top admins who performed relocations
            $topAdmins = DB::table('special_occasion_relocation_history as rh')
                ->leftJoin('users as u', 'rh.changed_by', '=', 'u.id')
                ->select(
                    'u.name as admin_name',
                    DB::raw('COUNT(*) as count')
                )
                ->when($occasionId, function($q) use ($occasionId) {
                    return $q->where('rh.occasion_id', $occasionId);
                })
                ->whereBetween(DB::raw('DATE(rh.changed_at)'), [$startDate, $endDate])
                ->groupBy('admin_name')
                ->orderByDesc('count')
                ->limit(10)
                ->get()
                ->toArray();

            // Daily relocation trend
            $dailyTrend = DB::table('special_occasion_relocation_history as rh')
                ->select(
                    DB::raw('DATE(changed_at) as date'),
                    DB::raw('COUNT(*) as count')
                )
                ->when($occasionId, function($q) use ($occasionId) {
                    return $q->where('occasion_id', $occasionId);
                })
                ->whereBetween(DB::raw('DATE(changed_at)'), [$startDate, $endDate])
                ->groupBy(DB::raw('DATE(changed_at)'))
                ->orderBy('date')
                ->get()
                ->toArray();

            // Most relocated tables
            $mostRelocatedTables = DB::table('special_occasion_relocation_history as rh')
                ->select(
                    DB::raw('COALESCE(old_table_name, new_table_name) as table_name'),
                    DB::raw('COUNT(*) as count')
                )
                ->when($occasionId, function($q) use ($occasionId) {
                    return $q->where('occasion_id', $occasionId);
                })
                ->whereBetween(DB::raw('DATE(changed_at)'), [$startDate, $endDate])
                ->groupBy(DB::raw('COALESCE(old_table_name, new_table_name)'))
                ->orderByDesc('count')
                ->limit(10)
                ->get()
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_relocations' => $totalRelocations,
                    'by_action_type' => $byActionType,
                    'top_admins' => $topAdmins,
                    'daily_trend' => $dailyTrend,
                    'most_relocated_tables' => $mostRelocatedTables,
                    'date_range' => [
                        'start' => $startDate,
                        'end' => $endDate
                    ]
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching relocation stats', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export relocation history for a specific booking
     * GET /api/reports/booking-relocation-history/{bookingId}
     * 
     * @param string $bookingId
     * @return JsonResponse
     */
    public function getBookingRelocationHistory($bookingId)
    {
        try {
            $history = DB::table('special_occasion_relocation_history as rh')
                ->leftJoin('users as u', 'rh.changed_by', '=', 'u.id')
                ->leftJoin('bookings as b', 'rh.booking_id', '=', 'b.id')
                ->select([
                    'rh.id',
                    'rh.old_table_name',
                    'rh.old_assign_number',
                    'rh.new_table_name',
                    'rh.new_assign_number',
                    'rh.action_type',
                    'rh.change_reason',
                    'u.name as changed_by_name',
                    'rh.changed_at'
                ])
                ->where('rh.booking_id', $bookingId)
                ->orderBy('rh.changed_at', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'booking_id' => $bookingId,
                    'history' => $history,
                    'total_changes' => count($history)
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching booking relocation history', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booking history',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

/**
 * Excel Export Class for Relocation Report
 */
class RelocationReportExport implements 
    FromCollection,
    WithHeadings,
    WithMapping,
    WithTitle,
    WithStyles,
    ShouldAutoSize
{
    protected $reportData;

    public function __construct($reportData)
    {
        $this->reportData = $reportData;
    }

    public function collection()
    {
        return collect($this->reportData['records']);
    }

    public function headings(): array
    {
        return [
            'Date & Time',
            'Event Name',
            'Booking Number',
            'Booking Date',
            'Old Table',
            'Old Location',
            'Old Seat Number',
            'New Table',
            'New Location',
            'New Seat Number',
            'Action Type',
            'Reason',
            'Changed By',
            'Admin Email'
        ];
    }

    public function map($record): array
    {
        $oldLocation = sprintf('R%dC%d', $record->old_row_number ?? 0, $record->old_column_number ?? 0);
        $newLocation = sprintf('R%dC%d', $record->new_row_number ?? 0, $record->new_column_number ?? 0);

        return [
            Carbon::parse($record->changed_at)->format('d/m/Y H:i:s'),
            $record->event_name ?? 'N/A',
            $record->booking_number ?? 'N/A',
            $record->booking_date ? Carbon::parse($record->booking_date)->format('d/m/Y') : 'N/A',
            $record->old_table_name ?? 'N/A',
            $oldLocation,
            $record->old_assign_number ?? 'N/A',
            $record->new_table_name ?? 'N/A',
            $newLocation,
            $record->new_assign_number ?? 'N/A',
            $record->action_type,
            $record->change_reason ?? 'N/A',
            $record->changed_by_name ?? 'System',
            $record->changed_by_email ?? 'N/A'
        ];
    }

    public function title(): string
    {
        return 'Relocation Log';
    }

    public function styles(Worksheet $sheet)
    {
        // Style the header row
        $sheet->getStyle('A1:N1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '8B4513']
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000']
                ]
            ]
        ]);

        // Set row height for header
        $sheet->getRowDimension(1)->setRowHeight(25);

        // Apply borders to all data cells
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        
        $sheet->getStyle('A2:' . $highestColumn . $highestRow)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC']
                ]
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_TOP,
                'wrapText' => true
            ]
        ]);

        // Alternate row colors
        for ($row = 2; $row <= $highestRow; $row++) {
            if ($row % 2 == 0) {
                $sheet->getStyle('A' . $row . ':' . $highestColumn . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F9F9F9']
                    ]
                ]);
            }
        }

        // Set specific column widths
        $sheet->getColumnDimension('A')->setWidth(20); // Date & Time
        $sheet->getColumnDimension('B')->setWidth(25); // Event Name
        $sheet->getColumnDimension('C')->setWidth(18); // Booking Number
        $sheet->getColumnDimension('D')->setWidth(15); // Booking Date
        $sheet->getColumnDimension('E')->setWidth(15); // Old Table
        $sheet->getColumnDimension('F')->setWidth(12); // Old Location
        $sheet->getColumnDimension('G')->setWidth(15); // Old Seat Number
        $sheet->getColumnDimension('H')->setWidth(15); // New Table
        $sheet->getColumnDimension('I')->setWidth(12); // New Location
        $sheet->getColumnDimension('J')->setWidth(15); // New Seat Number
        $sheet->getColumnDimension('K')->setWidth(12); // Action Type
        $sheet->getColumnDimension('L')->setWidth(30); // Reason
        $sheet->getColumnDimension('M')->setWidth(20); // Changed By
        $sheet->getColumnDimension('N')->setWidth(25); // Admin Email

        return [];
    }
}