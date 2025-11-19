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

class GeneralLedgerExport implements FromArray, WithHeadings, WithStyles, WithTitle, WithColumnWidths, WithEvents
{
    protected $data;
    protected $currentRow = 1;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function array(): array
    {
        $rows = [];
        
        if (!isset($this->data['data']['ledger_reports'])) {
            return $rows;
        }
        
        foreach ($this->data['data']['ledger_reports'] as $report) {
            // Add ledger header
            $rows[] = ['', '', '', '', '', ''];
            $rows[] = [
                'LEDGER: ' . $report['ledger']['name'] . ' (' . $report['ledger']['code'] . ')',
                '', '', '', '', ''
            ];
            
            // Add opening balance row
            $rows[] = [
                'Opening Balance',
                '', '',
                number_format($report['opening_balance']['debit'], 2),
                number_format($report['opening_balance']['credit'], 2),
                $this->formatBalance($report['opening_balance']['debit'] - $report['opening_balance']['credit'])
            ];
            
            // Add transactions
            if (!empty($report['transactions'])) {
                foreach ($report['transactions'] as $transaction) {
                    $rows[] = [
                        date('d/m/Y', strtotime($transaction['date'])),
                        $transaction['entry_code'] ?? '-',
                        $transaction['narration'] ?? '-',
                        $transaction['debit'] > 0 ? number_format($transaction['debit'], 2) : '',
                        $transaction['credit'] > 0 ? number_format($transaction['credit'], 2) : '',
                        number_format($transaction['running_balance'], 2) . ' ' . $transaction['balance_type']
                    ];
                }
            } else {
                $rows[] = ['', 'No transactions in this period', '', '', '', ''];
            }
            
            // Add closing balance row
            $rows[] = [
                'Closing Balance',
                '', '',
                number_format($report['closing_balance']['debit'], 2),
                number_format($report['closing_balance']['credit'], 2),
                $this->formatBalance($report['closing_balance']['debit'] - $report['closing_balance']['credit'])
            ];
        }
        
        return $rows;
    }
    
    public function headings(): array
    {
        return [
            'Date',
            'Entry Code',
            'Narration',
            'Debit',
            'Credit',
            'Balance'
        ];
    }
    
    public function title(): string
    {
        return 'General Ledger';
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 15,
            'B' => 15,
            'C' => 40,
            'D' => 15,
            'E' => 15,
            'F' => 20,
        ];
    }
    
    public function styles(Worksheet $sheet)
    {
        // Style the header row
        $sheet->getStyle('A1:F1')->applyFromArray([
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
                
                // Apply borders to all data
                $highestRow = $worksheet->getHighestRow();
                $worksheet->getStyle('A1:F' . $highestRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ]);
                
                // Style ledger headers
                for ($row = 2; $row <= $highestRow; $row++) {
                    $cellValue = $worksheet->getCell('A' . $row)->getValue();
                    if (strpos($cellValue, 'LEDGER:') === 0) {
                        $worksheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'E7E6E6'],
                            ],
                        ]);
                        $worksheet->mergeCells('A' . $row . ':F' . $row);
                    }
                    
                    // Style opening/closing balance rows
                    if (in_array($cellValue, ['Opening Balance', 'Closing Balance'])) {
                        $worksheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'F2F2F2'],
                            ],
                        ]);
                    }
                }
                
                // Right align number columns
                $worksheet->getStyle('D:F')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            },
        ];
    }
    
    private function formatBalance($balance)
    {
        return number_format(abs($balance), 2) . ' ' . ($balance >= 0 ? 'Dr' : 'Cr');
    }
}