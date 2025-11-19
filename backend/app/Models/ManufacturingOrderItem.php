<?php
// app/Models/ManufacturingOrderItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturingOrderItem extends Model
{
    use HasUuids;

    protected $table = 'manufacturing_order_items';

    protected $fillable = [
        'manufacturing_order_id',
        'raw_material_id',
        'required_quantity',
        'consumed_quantity',
        'uom_id',
        'unit_cost',
        'total_cost',
        'stock_movement_id',
        'status',
        'notes'
    ];

    protected $casts = [
        'required_quantity' => 'decimal:3',
        'consumed_quantity' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2'
    ];

    const STATUS_PENDING = 'PENDING';
    const STATUS_RESERVED = 'RESERVED';
    const STATUS_CONSUMED = 'CONSUMED';

    /**
     * Relationships
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'manufacturing_order_id');
    }

    public function rawMaterial(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'raw_material_id');
    }

    public function uom(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    /**
     * Get remaining quantity to consume
     */
    public function getRemainingQuantity(): float
    {
        return $this->required_quantity - $this->consumed_quantity;
    }

    /**
     * Check if fully consumed
     */
    public function isFullyConsumed(): bool
    {
        return $this->consumed_quantity >= $this->required_quantity;
    }
}