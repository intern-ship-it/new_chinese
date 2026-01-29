<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SalesInvoiceItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_id', 'item_type', 'product_id', 'package_id', 'sales_item_id',
        'description', 'quantity', 'uom_id', 'unit_price',
        'tax_id', 'tax_rate', 'tax_amount', 'discount_amount', 'total_amount'
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // Relationships
    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class, 'invoice_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function package()
    {
        return $this->belongsTo(SalesPackage::class, 'package_id');
    }

    public function salesItem()
    {
        return $this->belongsTo(SaleItem::class, 'sales_item_id');
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
