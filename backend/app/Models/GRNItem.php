<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class GRNItem extends Model
{
    use HasUuids;

        protected $table = 'grn_items'; 
    protected $fillable = [
        'grn_id', 'po_item_id', 'product_id', 'description',
        'ordered_quantity', 'received_quantity', 'accepted_quantity',
        'rejected_quantity', 'over_delivery_tolerance', 'is_over_delivery',
        'rejection_reason', 'condition_on_receipt', 'uom_id', 'unit_price',
        'batch_number', 'manufacture_date', 'expiry_date', 'serial_numbers',
        'warranty_period_months', 'warranty_end_date', 'warehouse_id',
        'rack_location', 'sort_order', 'notes'
    ];

    protected $casts = [
        'ordered_quantity' => 'decimal:3',
        'received_quantity' => 'decimal:3',
        'accepted_quantity' => 'decimal:3',
        'rejected_quantity' => 'decimal:3',
        'over_delivery_tolerance' => 'decimal:2',
        'is_over_delivery' => 'boolean',
        'unit_price' => 'decimal:2',
        'manufacture_date' => 'date:Y-m-d',
        'expiry_date' => 'date:Y-m-d',
        'warranty_end_date' => 'date:Y-m-d',
        'serial_numbers' => 'array'
    ];

    public function grn()
    {
        return $this->belongsTo(GRN::class, 'grn_id');
    }

    public function poItem()
    {
        return $this->belongsTo(PurchaseOrderItem::class, 'po_item_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}