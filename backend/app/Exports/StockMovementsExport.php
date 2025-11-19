<?php

namespace App\Exports;

use App\Models\StockMovement;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StockMovementsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $filters;

    public function __construct($filters)
    {
        $this->filters = $filters;
    }

    public function collection()
    {
        $query = StockMovement::with(['product.uom', 'warehouse', 'creator'])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if (!empty($this->filters['from_date'])) {
            $query->whereDate('created_at', '>=', $this->filters['from_date']);
        }

        if (!empty($this->filters['to_date'])) {
            $query->whereDate('created_at', '<=', $this->filters['to_date']);
        }

        if (!empty($this->filters['product_id'])) {
            $query->where('product_id', $this->filters['product_id']);
        }

        if (!empty($this->filters['warehouse_id'])) {
            $query->where('warehouse_id', $this->filters['warehouse_id']);
        }

        if (!empty($this->filters['movement_type'])) {
            $query->where('movement_type', $this->filters['movement_type']);
        }

        // Limit to 10,000 records for safety
        return $query->limit(10000)->get();
    }

    public function headings(): array
    {
        return [
            'Date/Time',
            'Movement #',
            'Type',
            'Product',
            'Product Type',
            'Warehouse',
            'Quantity',
            'Unit Cost',
            'Total Cost',
            'Reference Type',
            'Reference ID',
            'Created By',
            'Approval Status'
        ];
    }

    public function map($movement): array
    {
        return [
            $movement->created_at->format('Y-m-d H:i:s'),
            $movement->movement_number ?? '-',
            $movement->movement_type,
            optional($movement->product)->name ?? '-',
            optional($movement->product)->product_type ? ucfirst(strtolower($movement->product->product_type)) : '-',
            optional($movement->warehouse)->name ?? '-',
            number_format($movement->quantity, 3, '.', ''),
            number_format($movement->unit_cost, 2, '.', ''),
            number_format($movement->total_cost, 2, '.', ''),
            $movement->reference_type ?? '-',
            $movement->reference_id ?? '-',
            optional($movement->creator)->name ?? '-',
            $movement->approval_status ?? '-'
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => '000000']
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'F5F5F5']
                ]
            ],
        ];
    }
}