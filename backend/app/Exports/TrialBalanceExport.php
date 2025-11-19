<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class TrialBalanceExport implements FromArray, WithHeadings, WithStyles, WithTitle, WithColumnWidths, WithEvents
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function array(): array
    {
        $rows = [];
        
        if (!isset($this->data['data']['trial_balance'])) {
            return $rows;
        }
        
        // Add period information
        $rows[] = [
            'Period: ' . date('d/m/Y', strtotime($this->data['data']['from_date'])) . 
            ' to ' . date('d/m/Y', strtotime($this->data['data']['to_date'])),
            '', '', '', '', ''
        ];
        $rows[] = ['', '', '', '', '', '']; // Empty row
        
        // Process groups hierarchically
        foreach ($this->data['data']['trial_balance'] as $group) {
            $this->addGroupRows($group, $rows, 0);
        }
        
        // Add empty row before totals
        $rows[] = ['', '', '', '', '', ''];
        
        // Add grand totals
        $rows[] = [
            '',
            'GRAND TOTAL',
            number_format($this->data['data']['grand_totals']['opening_debit'], 2),
            number_format($this->data['data']['grand_totals']['opening_credit'], 2),
            number_format($this->data['data']['grand_totals']['closing_debit'], 2),
            number_format($this->data['data']['grand_totals']['closing_credit'], 2)
        ];
        
        // Add balance status
        $rows[] = ['', '', '', '', '', ''];
        $isBalanced = $this->data['data']['is_balanced'] ? 'BALANCED' : 'NOT BALANCED';
        $rows[] = ['Trial Balance Status: ' . $isBalanced, '', '', '', '', ''];
        
        return $rows;
    }
    
    private function addGroupRows($group, &$rows, $level)
    {
        $indent = str_repeat('  ', $level);
        
        // Add group header
        $rows[] = [
            $group['code'],
            $indent . $group['name'],
            number_format($group['total_opening_debit'], 2),
            number_format($group['total_opening_credit'], 2),
            number_format($group['total_closing_debit'], 2),
            number_format($group['total_closing_credit'], 2)
        ];
        
        // Add ledgers
        if (!empty($group['ledgers'])) {
            foreach ($group['ledgers'] as $ledger) {
                $rows[] = [
                    $ledger['code'],
                    $indent . '    ' . $ledger['name'],
                    $ledger['opening_debit'] > 0 ? number_format($ledger['opening_debit'], 2) : '',
                    $ledger['opening_credit'] > 0 ? number_format($ledger['opening_credit'], 2) : '',
                    $ledger['closing_debit'] > 0 ? number_format($ledger['closing_debit'], 2) : '',
                    $ledger['closing_credit'] > 0 ? number_format($ledger['closing_credit'], 2) : ''
                ];
            }
        }
        
        // Add child groups recursively
        if (!empty($group['children'])) {
            foreach ($group['children'] as $childGroup) {
                $this->addGroupRows($childGroup, $rows, $level + 1);
            }
        }
    }
    
    public function headings(): array
    {
        return [
            'Code',
            'Particulars',
            'Opening Debit',
            'Opening Credit',
            'Closing Debit',
            'Closing Credit'
        ];
    }
    
    public function title(): string
    {
        return 'Trial Balance';
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 12,
            'B' => 45,
            'C' => 18,
            'D' => 18,
            'E' => 18,
            'F' => 18,
        ];
    }
    
    public function styles(Worksheet $sheet)
    {
        // Style the header row
        $sheet->getStyle('A3:F3')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ]);
        
        return [];
    }
    
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $worksheet = $event->sheet->getDelegate();
                $highestRow = $worksheet->getHighestRow();
                
                // Apply borders
                $worksheet->getStyle('A3:F' . $highestRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ]);
                
                // Right align number columns
                $worksheet->getStyle('C:F')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                
                // Style period row
                $worksheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 12],
                ]);
                $worksheet->mergeCells('A1:F1');
                
                // Find and style the GRAND TOTAL row
                for ($row = 1; $row <= $highestRow; $row++) {
                    $cellValue = $worksheet->getCell('B' . $row)->getValue();
                    if ($cellValue === 'GRAND TOTAL') {
                        $worksheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'FFE699'],
                            ],
                        ]);
                    }
                }
            },
        ];
    }
}