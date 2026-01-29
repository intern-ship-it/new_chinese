<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SalesOrderItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'sales_order_id', 'is_addon', 'sales_package_id', 'item_type',
        'product_id', 'sale_item_id', 'description',
        'quantity', 'uom_id',
        'unit_price', 'tax_percent', 'tax_amount', 'discount_amount',
        'total_amount'
    ];

    protected $casts = [
        'is_addon' => 'boolean',
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function salesPackage()
    {
        return $this->belongsTo(SalesPackage::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class);
    }


    public function package()
    {
        return $this->belongsTo(SalesPackage::class, 'package_id');
    }


    public function salesItem()
    {
        return $this->belongsTo(SalesItem::class, 'sales_item_id');
    }

}
