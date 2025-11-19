<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PurchaseOrderItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'po_id', 'item_type', 'product_id', 'service_id', 'description',
        'quantity', 'uom_id', 'unit_price', 'tax_id', 'tax_percent',
        'tax_amount', 'discount_type', 'discount_value', 'discount_amount',
        'subtotal', 'total_amount', 'received_quantity', 'invoiced_quantity',
        'cancelled_quantity', 'status', 'sort_order', 'notes','pr_item_id'
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'received_quantity' => 'decimal:3',
        'invoiced_quantity' => 'decimal:3',
        'cancelled_quantity' => 'decimal:3'
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class);
    }

    public function tax()
    {
        return $this->belongsTo(TaxMaster::class, 'tax_id');
    }
}