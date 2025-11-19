<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Illuminate\Contracts\View\View;

class IncomeStatementExport implements FromView, WithTitle, WithStyles, WithColumnWidths, WithEvents
{
    protected $data;
    protected $displayType;
    protected $temple;
    protected $fromDate;
    protected $toDate;
    protected $fund;

    public function __construct($data, $displayType, $temple, $fromDate, $toDate, $fund = null)
    {
        $this->data = $data;
        $this->displayType = $displayType;
        $this->temple = $temple;
        $this->fromDate = $fromDate;
        $this->toDate = $toDate;
        $this->fund = $fund;
    }

    /**
     * Return the view for Excel export
     */
    public function view(): View
    {
        if ($this->displayType == 'monthly') {
            return view('exports.income_statement_monthly_excel', [
                'data' => $this->data,
                'temple' => $this->temple,
                'fromDate' => $this->fromDate,
                'toDate' => $this->toDate,
                'fund' => $this->fund
            ]);
        }

        return view('exports.income_statement_full_excel', [
            'data' => $this->data,
            'temple' => $this->temple,
            'fromDate' => $this->fromDate,
            'toDate' => $this->toDate,
            'fund' => $this->fund
        ]);
    }

    /**
     * Set the title of the Excel sheet
     */
    public function title(): string
    {
        return 'Income Statement';
    }

    /**
     * Set column widths
     */
    public function columnWidths(): array
    {
        if ($this->displayType == 'monthly') {
            $widths = ['A' => 40]; // Account name column
            $monthCount = count($this->data['months'] ?? []);
            
            // Add width for month columns
            for ($i = 0; $i <= $monthCount; $i++) {
                $col = chr(66 + $i); // B, C, D, etc.
                $widths[$col] = 15;
            }
            
            return $widths;
        }

        return [
            'A' => 50,  // Account name
            'B' => 20,  // Amount
        ];
    }

    /**
     * Apply styles to the worksheet
     */
    public function styles(Worksheet $sheet)
    {
        $styles = [];

        // Header styles
        $styles['1:4'] = [
            'font' => ['bold' => true],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ];

        // Table header styles
        if ($this->displayType == 'monthly') {
            $styles['6'] = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E0E0E0'],
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                    ],
                ],
            ];
        } else {
            $styles['6'] = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E0E0E0'],
                ],
            ];
        }

        return $styles;
    }

    /**
     * Register events for additional formatting
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                
                // Merge cells for header
                $sheet->mergeCells('A1:' . ($this->displayType == 'monthly' ? 
                    chr(66 + count($this->data['months'] ?? [])) : 'B') . '1');
                $sheet->mergeCells('A2:' . ($this->displayType == 'monthly' ? 
                    chr(66 + count($this->data['months'] ?? [])) : 'B') . '2');
                $sheet->mergeCells('A3:' . ($this->displayType == 'monthly' ? 
                    chr(66 + count($this->data['months'] ?? [])) : 'B') . '3');
                
                // Format amounts as currency
                $lastRow = $sheet->getHighestRow();
                $lastCol = $this->displayType == 'monthly' ? 
                    chr(66 + count($this->data['months'] ?? [])) : 'B';
                
                $sheet->getStyle('B7:' . $lastCol . $lastRow)
                    ->getNumberFormat()
                    ->setFormatCode('#,##0.00');
                
                // Apply borders to data area
                $sheet->getStyle('A6:' . $lastCol . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => '000000'],
                        ],
                    ],
                ]);
                
                // Highlight total rows
                $this->highlightTotalRows($sheet, $lastRow, $lastCol);
            },
        ];
    }

    /**
     * Highlight total rows with different colors
     */
    private function highlightTotalRows($sheet, $lastRow, $lastCol)
    {
        for ($row = 7; $row <= $lastRow; $row++) {
            $cellValue = $sheet->getCell('A' . $row)->getValue();
            
            if (strpos(strtolower($cellValue), 'total') !== false) {
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F0F0F0'],
                    ],
                ]);
            }
            
            if (strpos(strtolower($cellValue), 'gross surplus') !== false ||
                strpos(strtolower($cellValue), 'surplus/deficit before') !== false ||
                strpos(strtolower($cellValue), 'surplus/deficit after') !== false ||
                strpos(strtolower($cellValue), 'profit amount') !== false) {
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'D0D0D0'],
                    ],
                ]);
            }
        }
    }
}