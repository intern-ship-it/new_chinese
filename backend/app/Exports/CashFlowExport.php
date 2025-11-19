<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Color;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class CashFlowExport implements WithMultipleSheets
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function sheets(): array
    {
        return [
            new CashFlowSummarySheet($this->data),
            new CashFlowDetailSheet($this->data),
        ];
    }
}

class CashFlowSummarySheet implements FromCollection, WithTitle, WithHeadings, WithStyles, WithColumnWidths
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function title(): string
    {
        return 'Summary';
    }
    
    public function headings(): array
    {
        return [
            ['Cash Flow Statement'],
            ['From: ' . $this->data['data']['from_date'] . ' To: ' . $this->data['data']['to_date']],
            [],
            ['Cash Flow Summary'],
            [],
            ['Description', 'Amount']
        ];
    }
    
    public function collection()
    {
        $collection = collect();
        
        // Opening Cash
        $collection->push(['Opening Cash Balance', $this->data['data']['summary']['opening_cash']]);
        $collection->push([]);
        
        // Cash Inflows
        $collection->push(['CASH INFLOWS', '']);
        foreach ($this->data['data']['cash_flows']['inflows'] as $category) {
            if ($category['amount'] > 0) {
                $collection->push(['  ' . $category['name'], $category['amount']]);
            }
        }
        $collection->push(['Total Cash Inflows', $this->data['data']['summary']['total_inflows']]);
        $collection->push([]);
        
        // Cash Outflows
        $collection->push(['CASH OUTFLOWS', '']);
        foreach ($this->data['data']['cash_flows']['outflows'] as $category) {
            if ($category['amount'] > 0) {
                $collection->push(['  ' . $category['name'], $category['amount']]);
            }
        }
        $collection->push(['Total Cash Outflows', $this->data['data']['summary']['total_outflows']]);
        $collection->push([]);
        
        // Net Cash Flow
        $collection->push(['Net Cash Flow', $this->data['data']['summary']['net_cash_flow']]);
        $collection->push([]);
        
        // Closing Cash
        $collection->push(['Closing Cash Balance', $this->data['data']['summary']['closing_cash']]);
        
        return $collection;
    }
    
    public function styles(Worksheet $sheet)
    {
        $highestRow = $sheet->getHighestRow();
        
        return [
            1 => ['font' => ['bold' => true, 'size' => 16]],
            2 => ['font' => ['bold' => true, 'size' => 12]],
            4 => ['font' => ['bold' => true, 'size' => 14]],
            6 => ['font' => ['bold' => true], 'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E0E0']
            ]],
            // Style specific rows for categories
            9 => ['font' => ['bold' => true, 'color' => ['rgb' => '008000']]],
            'A' => ['font' => ['bold' => false]],
        ];
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 40,
            'B' => 20,
        ];
    }
}

class CashFlowDetailSheet implements FromCollection, WithTitle, WithHeadings, WithStyles, WithColumnWidths
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function title(): string
    {
        return 'Detailed Transactions';
    }
    
    public function headings(): array
    {
        return [
            ['Detailed Cash Flow Transactions'],
            ['From: ' . $this->data['data']['from_date'] . ' To: ' . $this->data['data']['to_date']],
            [],
            ['Date', 'Entry Code', 'Category', 'Ledger', 'Narration', 'Amount', 'Type']
        ];
    }
    
    public function collection()
    {
        $collection = collect();
        
        // Cash Inflows
        $collection->push(['CASH INFLOWS']);
        foreach ($this->data['data']['cash_flows']['inflows'] as $key => $category) {
            if (count($category['transactions']) > 0) {
                $collection->push([$category['name']]);
                foreach ($category['transactions'] as $transaction) {
                    $collection->push([
                        $transaction['date'],
                        $transaction['code'],
                        $category['name'],
                        $transaction['ledger'],
                        $transaction['narration'] ?? '',
                        $transaction['amount'],
                        'Inflow'
                    ]);
                }
                $collection->push(['Subtotal: ' . $category['name'], '', '', '', '', $category['amount'], '']);
                $collection->push([]);
            }
        }
        
        // Cash Outflows
        $collection->push(['CASH OUTFLOWS']);
        foreach ($this->data['data']['cash_flows']['outflows'] as $key => $category) {
            if (count($category['transactions']) > 0) {
                $collection->push([$category['name']]);
                foreach ($category['transactions'] as $transaction) {
                    $collection->push([
                        $transaction['date'],
                        $transaction['code'],
                        $category['name'],
                        $transaction['ledger'],
                        $transaction['narration'] ?? '',
                        $transaction['amount'],
                        'Outflow'
                    ]);
                }
                $collection->push(['Subtotal: ' . $category['name'], '', '', '', '', $category['amount'], '']);
                $collection->push([]);
            }
        }
        
        return $collection;
    }
    
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14]],
            2 => ['font' => ['bold' => true, 'size' => 10]],
            4 => ['font' => ['bold' => true], 'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E0E0']
            ]],
        ];
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 12,
            'B' => 15,
            'C' => 20,
            'D' => 25,
            'E' => 35,
            'F' => 15,
            'G' => 10,
        ];
    }
}