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

class BalanceSheetExport implements FromArray, WithHeadings, WithStyles, WithTitle, WithColumnWidths, WithEvents
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    /**
     * Format number with parentheses for negative values
     */
    private function formatAmount($amount, $decimals = 2)
    {
        if ($amount == 0) {
            return '-';
        }
        
        $absAmount = abs($amount);
        $formatted = number_format($absAmount, $decimals);
        
        return $amount < 0 ? '(' . $formatted . ')' : $formatted;
    }
    
    public function array(): array
    {
        $rows = [];
        
        if (!isset($this->data['data']['balance_sheet'])) {
            return $rows;
        }
        
        // Add header
        $rows[] = ['Balance Sheet as on ' . date('d/m/Y', strtotime($this->data['data']['as_on_date'])), '', ''];
        $rows[] = ['', '', ''];
        
        // Process balance sheet groups
        foreach ($this->data['data']['balance_sheet'] as $group) {
            if ($group['code'] == '1000') {
                $rows[] = ['ASSETS', '', ''];
                $this->addGroupRows($group, $rows, 0);
                $rows[] = ['', '', ''];
                $rows[] = [
                    'TOTAL ASSETS',
                    $this->formatAmount($this->data['data']['totals']['assets']['previous']),
                    $this->formatAmount($this->data['data']['totals']['assets']['current'])
                ];
                $rows[] = ['', '', ''];
            }
        }
        
        // Liabilities & Equity section
        $rows[] = ['LIABILITIES & EQUITY', '', ''];
        
        foreach ($this->data['data']['balance_sheet'] as $group) {
            if ($group['code'] == '2000') {
                $rows[] = ['LIABILITIES', '', ''];
                $this->addGroupRows($group, $rows, 0);
                $rows[] = [
                    'Total Liabilities',
                    $this->formatAmount($this->data['data']['totals']['liabilities']['previous']),
                    $this->formatAmount($this->data['data']['totals']['liabilities']['current'])
                ];
                $rows[] = ['', '', ''];
            }
            
            if ($group['code'] == '3000') {
                $rows[] = ['EQUITY', '', ''];
                $this->addGroupRows($group, $rows, 0);
                
                // Add current P&L if exists
                if (isset($group['profit_loss'])) {
                    $rows[] = [
                        '    ' . $group['profit_loss']['name'],
                        '-',
                        $this->formatAmount($group['profit_loss']['current'])
                    ];
                }
                
                $rows[] = [
                    'Total Equity',
                    $this->formatAmount($this->data['data']['totals']['equity']['previous']),
                    $this->formatAmount($this->data['data']['totals']['equity']['current'])
                ];
            }
        }
        
        $rows[] = ['', '', ''];
        $totalLiabEquity = $this->data['data']['totals']['liabilities']['current'] + $this->data['data']['totals']['equity']['current'];
        $rows[] = [
            'TOTAL LIABILITIES & EQUITY',
            $this->formatAmount($this->data['data']['totals']['liabilities']['previous'] + $this->data['data']['totals']['equity']['previous']),
            $this->formatAmount($totalLiabEquity)
        ];
        
        // Balance check
        $rows[] = ['', '', ''];
        $isBalanced = abs($this->data['data']['totals']['assets']['current'] - $totalLiabEquity) < 0.01;
        $rows[] = ['Balance Sheet Status: ' . ($isBalanced ? 'BALANCED' : 'NOT BALANCED'), '', ''];
        
        return $rows;
    }
    
    private function addGroupRows($group, &$rows, $level)
    {
        $indent = str_repeat('  ', $level);
        
        // Add group name if not root level
        if ($level > 0) {
            $rows[] = [
                $indent . $group['name'],
                $this->formatAmount($group['previous_balance']),
                $this->formatAmount($group['current_balance'])
            ];
        }
        
        // Add ledgers
        if (!empty($group['ledgers'])) {
            foreach ($group['ledgers'] as $ledger) {
                $rows[] = [
                    $indent . '    ' . $ledger['name'],
                    $this->formatAmount($ledger['previous_balance']),
                    $this->formatAmount($ledger['current_balance'])
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
            'Particulars',
            'Previous Year',
            'Current Year'
        ];
    }
    
    public function title(): string
    {
        return 'Balance Sheet';
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 50,
            'B' => 20,
            'C' => 20,
        ];
    }
    
    public function styles(Worksheet $sheet)
    {
        // Style the header row
        $sheet->getStyle('A3:C3')->applyFromArray([
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
                $worksheet->getStyle('A3:C' . $highestRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ]);
                
                // Right align number columns
                $worksheet->getStyle('B:C')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                
                // Style title row
                $worksheet->getStyle('A1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 14],
                ]);
                $worksheet->mergeCells('A1:C1');
                $worksheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                
                // Style section headers
                for ($row = 1; $row <= $highestRow; $row++) {
                    $cellValue = $worksheet->getCell('A' . $row)->getValue();
                    if (in_array($cellValue, ['ASSETS', 'LIABILITIES & EQUITY', 'LIABILITIES', 'EQUITY'])) {
                        $worksheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                            'font' => ['bold' => true, 'size' => 12],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'D9E2F3'],
                            ],
                        ]);
                    }
                    
                    // Style totals
                    if (strpos($cellValue, 'TOTAL') === 0 || strpos($cellValue, 'Total') === 0) {
                        $worksheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'F2F2F2'],
                            ],
                        ]);
                    }
                }
            },
        ];
    }
}