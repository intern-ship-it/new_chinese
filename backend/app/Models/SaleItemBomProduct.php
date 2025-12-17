<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SaleItemBomProduct extends Model
{
    use HasFactory;

    protected $table = 'sale_item_bom_products';

    public $timestamps = true;

    protected $fillable = [
        'sale_item_id',
        'product_id',
        'quantity',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
    ];

    /**
     * Relationship: Parent sale item
     */
    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class, 'sale_item_id');
    }

    /**
     * Relationship: Product used in BOM
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Calculate required quantity based on sale quantity
     */
    public function getRequiredQuantity($saleQuantity = 1)
    {
        return $this->quantity * $saleQuantity;
    }

    /**
     * Check if sufficient stock is available
     */
    public function hasSufficientStock($saleQuantity = 1)
    {
        $requiredQty = $this->getRequiredQuantity($saleQuantity);
        return $this->product && $this->product->current_stock >= $requiredQty;
    }

    /**
     * Get stock availability status
     */
    public function getStockStatus($saleQuantity = 1)
    {
        $requiredQty = $this->getRequiredQuantity($saleQuantity);
        $availableStock = $this->product ? $this->product->current_stock : 0;

        return [
            'required' => $requiredQty,
            'available' => $availableStock,
            'sufficient' => $availableStock >= $requiredQty,
            'shortage' => max(0, $requiredQty - $availableStock),
        ];
    }
}