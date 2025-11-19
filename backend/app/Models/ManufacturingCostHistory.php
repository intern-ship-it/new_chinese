<?php
// app/Models/ManufacturingCostHistory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturingCostHistory extends Model
{
    use HasUuids;

    protected $table = 'manufacturing_cost_history';

    protected $fillable = [
        'manufacturing_order_id',
        'product_id',
        'quantity_produced',
        'material_cost',
        'labor_cost',
        'overhead_cost',
        'total_cost',
        'unit_cost',
        'production_date'
    ];

    protected $casts = [
        'quantity_produced' => 'decimal:3',
        'material_cost' => 'decimal:2',
        'labor_cost' => 'decimal:2',
        'overhead_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'production_date' => 'date'
    ];

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

    /**
     * Scopes
     */
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('production_date', [$startDate, $endDate]);
    }

    /**
     * Get average cost for a product in date range
     */
    public static function getAverageCost($productId, $startDate = null, $endDate = null)
    {
        $query = self::where('product_id', $productId);
        
        if ($startDate && $endDate) {
            $query->whereBetween('production_date', [$startDate, $endDate]);
        }
        
        return $query->avg('unit_cost');
    }

    /**
     * Get total production for a product
     */
    public static function getTotalProduction($productId, $startDate = null, $endDate = null)
    {
        $query = self::where('product_id', $productId);
        
        if ($startDate && $endDate) {
            $query->whereBetween('production_date', [$startDate, $endDate]);
        }
        
        return $query->sum('quantity_produced');
    }
}