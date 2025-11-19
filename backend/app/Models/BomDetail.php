<?php
// app/Models/BomDetail.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BomDetail extends Model
{
    use HasUuids;

    protected $table = 'bom_details';

    protected $fillable = [
        'bom_master_id',
        'raw_material_id',
        'quantity',
        'uom_id',
        'unit_cost',
        'total_cost',
        'sequence_no',
        'notes',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'sequence_no' => 'integer'
    ];

    /**
     * Boot method - FIXED: Removed saved/deleted events to prevent circular dependencies
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Auto-set sequence number if not provided
            if (!$model->sequence_no) {
                $maxSequence = self::where('bom_master_id', $model->bom_master_id)
                    ->max('sequence_no') ?? 0;
                $model->sequence_no = $maxSequence + 10;
            }
            
            // Calculate total cost
            if ($model->unit_cost && $model->quantity) {
                $model->total_cost = $model->unit_cost * $model->quantity;
            }
        });

        static::updating(function ($model) {
            // Recalculate total cost
            if ($model->unit_cost && $model->quantity) {
                $model->total_cost = $model->unit_cost * $model->quantity;
            }
        });

        // REMOVED saved and deleted events that were causing the issue
        // The BOM master total cost should be updated explicitly in the controller
        // after all details are saved, not on every detail save
    }

    /**
     * Relationships
     */
    public function bomMaster(): BelongsTo
    {
        return $this->belongsTo(BomMaster::class, 'bom_master_id');
    }

    public function rawMaterial(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'raw_material_id');
    }

    public function uom(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }

    /**
     * Methods
     */
    
    /**
     * Update cost from product
     */
    public function updateCostFromProduct(): void
    {
        if ($this->rawMaterial) {
            $this->unit_cost = $this->rawMaterial->average_cost 
                ?? $this->rawMaterial->last_purchase_cost 
                ?? $this->rawMaterial->cost_price 
                ?? 0;
            
            $this->total_cost = $this->unit_cost * $this->quantity;
            $this->saveQuietly(); // Use saveQuietly to avoid triggering events
        }
    }

    /**
     * Get required quantity for production
     */
    public function getRequiredQuantity($productionQuantity, $bomOutputQuantity): float
    {
        $multiplier = $productionQuantity / $bomOutputQuantity;
        return $this->quantity * $multiplier;
    }

    /**
     * Check if raw material is available
     */
    public function checkAvailability($requiredQuantity, $warehouseId): array
    {
        $stockBalance = ProductStock::where('product_id', $this->raw_material_id)
            ->where('warehouse_id', $warehouseId)
            ->first();
        
        $availableQuantity = $stockBalance 
            ? ($stockBalance->quantity - $stockBalance->reserved_quantity) 
            : 0;
        
        return [
            'available' => $availableQuantity >= $requiredQuantity,
            'available_quantity' => $availableQuantity,
            'required_quantity' => $requiredQuantity,
            'shortage_quantity' => max(0, $requiredQuantity - $availableQuantity)
        ];
    }
}