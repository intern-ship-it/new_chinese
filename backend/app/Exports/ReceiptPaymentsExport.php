<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ReceiptPaymentsExport implements WithMultipleSheets
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function sheets(): array
    {
        $sheets = [];
        
        // Summary Sheet
        $sheets[] = new ReceiptPaymentsSummarySheet($this->data);
        
        // Individual account sheets
        foreach ($this->data['data']['accounts'] as $account) {
            $sheets[] = new ReceiptPaymentsAccountSheet($account, $this->data['data']);
        }
        
        return $sheets;
    }
}

class ReceiptPaymentsSummarySheet implements FromCollection, WithTitle, WithHeadings, WithStyles, WithColumnWidths
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
            ['Receipt & Payments Report'],
            ['From: ' . $this->data['data']['from_date'] . ' To: ' . $this->data['data']['to_date']],
            [],
            ['Account Name', 'Account Code', 'Opening Balance', 'Total Receipts', 'Total Payments', 'Contra In', 'Contra Out', 'Closing Balance']
        ];
    }
    
    public function collection()
    {
        $collection = collect();
        
        foreach ($this->data['data']['accounts'] as $account) {
            $collection->push([
                $account['account']['name'],
                $account['account']['code'],
                $account['opening_balance'],
                $account['total_receipts'],
                $account['total_payments'],
                $account['total_contra_in'],
                $account['total_contra_out'],
                $account['closing_balance']
            ]);
        }
        
        // Add grand totals
        $collection->push([]);
        $collection->push([
            'GRAND TOTAL',
            '',
            $this->data['data']['grand_totals']['opening_balance'],
            $this->data['data']['grand_totals']['total_receipts'],
            $this->data['data']['grand_totals']['total_payments'],
            $this->data['data']['grand_totals']['total_contra_in'],
            $this->data['data']['grand_totals']['total_contra_out'],
            $this->data['data']['grand_totals']['closing_balance']
        ]);
        
        return $collection;
    }
    
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 16]],
            2 => ['font' => ['bold' => true, 'size' => 12]],
            4 => ['font' => ['bold' => true], 'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E0E0']
            ]],
            $sheet->getHighestRow() => ['font' => ['bold' => true]],
        ];
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 30,
            'B' => 15,
            'C' => 15,
            'D' => 15,
            'E' => 15,
            'F' => 15,
            'G' => 15,
            'H' => 15,
        ];
    }
}

class ReceiptPaymentsAccountSheet implements FromCollection, WithTitle, WithHeadings, WithStyles, WithColumnWidths
{
    protected $account;
    protected $reportData;
    
    public function __construct($account, $reportData)
    {
        $this->account = $account;
        $this->reportData = $reportData;
    }
    
    public function title(): string
    {
        return substr($this->account['account']['name'], 0, 31); // Excel sheet name limit
    }
    
    public function headings(): array
    {
        return [
            [$this->account['account']['name'] . ' (' . $this->account['account']['code'] . ')'],
            ['From: ' . $this->reportData['from_date'] . ' To: ' . $this->reportData['to_date']],
            [],
            ['Date', 'Entry Code', 'Party/Description', 'Narration', 'Receipts', 'Payments', 'Contra In', 'Contra Out', 'Balance']
        ];
    }
    
    public function collection()
    {
        $collection = collect();
        $runningBalance = $this->account['opening_balance'];
        
        // Opening Balance
        $collection->push([
            '',
            '',
            'Opening Balance',
            '',
            '',
            '',
            '',
            '',
            $runningBalance
        ]);
        
        // Combine and sort all transactions
        $allTransactions = [];
        
        foreach ($this->account['receipts'] as $r) {
            $allTransactions[] = [
                'date' => $r->date,
                'code' => $r->entry_code,
                'party' => $r->paid_to,
                'narration' => $r->narration,
                'type' => 'receipt',
                'amount' => $r->amount
            ];
        }
        
        foreach ($this->account['payments'] as $p) {
            $allTransactions[] = [
                'date' => $p->date,
                'code' => $p->entry_code,
                'party' => $p->paid_to,
                'narration' => $p->narration,
                'type' => 'payment',
                'amount' => $p->amount
            ];
        }
        
        foreach ($this->account['contra_in'] as $c) {
            $allTransactions[] = [
                'date' => $c->date,
                'code' => $c->entry_code,
                'party' => 'Transfer In',
                'narration' => $c->narration,
                'type' => 'contra_in',
                'amount' => $c->amount
            ];
        }
        
        foreach ($this->account['contra_out'] as $c) {
            $allTransactions[] = [
                'date' => $c->date,
                'code' => $c->entry_code,
                'party' => 'Transfer Out',
                'narration' => $c->narration,
                'type' => 'contra_out',
                'amount' => $c->amount
            ];
        }
        
        // Sort by date
        usort($allTransactions, function($a, $b) {
            return strtotime($a['date']) - strtotime($b['date']);
        });
        
        // Add transactions to collection
        foreach ($allTransactions as $t) {
            if ($t['type'] === 'receipt') $runningBalance += $t['amount'];
            elseif ($t['type'] === 'payment') $runningBalance -= $t['amount'];
            elseif ($t['type'] === 'contra_in') $runningBalance += $t['amount'];
            elseif ($t['type'] === 'contra_out') $runningBalance -= $t['amount'];
            
            $collection->push([
                $t['date'],
                $t['code'],
                $t['party'] ?? '',
                $t['narration'] ?? '',
                $t['type'] === 'receipt' ? $t['amount'] : '',
                $t['type'] === 'payment' ? $t['amount'] : '',
                $t['type'] === 'contra_in' ? $t['amount'] : '',
                $t['type'] === 'contra_out' ? $t['amount'] : '',
                $runningBalance
            ]);
        }
        
        // Totals
        $collection->push([]);
        $collection->push([
            '',
            '',
            'TOTAL',
            '',
            $this->account['total_receipts'],
            $this->account['total_payments'],
            $this->account['total_contra_in'],
            $this->account['total_contra_out'],
            $this->account['closing_balance']
        ]);
        
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
            5 => ['font' => ['bold' => true]],
            $sheet->getHighestRow() => ['font' => ['bold' => true]],
        ];
    }
    
    public function columnWidths(): array
    {
        return [
            'A' => 12,
            'B' => 15,
            'C' => 25,
            'D' => 30,
            'E' => 15,
            'F' => 15,
            'G' => 15,
            'H' => 15,
            'I' => 15,
        ];
    }
}