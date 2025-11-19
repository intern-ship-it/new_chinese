<?php
// app/Models/ManufacturingStockReservation.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturingStockReservation extends Model
{
    use HasUuids;

    protected $table = 'manufacturing_stock_reservations';

    protected $fillable = [
        'manufacturing_order_id',
        'product_id',
        'warehouse_id',
        'reserved_quantity',
        'status',
        'reserved_at',
        'consumed_at',
        'released_at',
        'reserved_by'
    ];

    protected $casts = [
        'reserved_quantity' => 'decimal:3',
        'reserved_at' => 'datetime',
        'consumed_at' => 'datetime',
        'released_at' => 'datetime'
    ];

    const STATUS_RESERVED = 'RESERVED';
    const STATUS_CONSUMED = 'CONSUMED';
    const STATUS_RELEASED = 'RELEASED';

    /**
     * Relationships
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'manufacturing_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function reserver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reserved_by');
    }
}