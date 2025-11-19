<?php
// app/Models/ProductStock.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class ProductStock extends Model
{
    protected $table = 'product_stock';
    
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'quantity',
        'reserved_quantity',
        'damaged_quantity',
        'minimum_quantity',
        'maximum_quantity',
        'reorder_quantity',
        'rack_location',
        'bin_number',
        'avg_cost',
        'last_purchase_price',
        'selling_price',
        'last_received_date',
        'last_issued_date',
        'last_counted_date',
        'is_active',
        'stock_status',
        'notes',
        'created_by',
        'updated_by'
    ];
    
    protected $casts = [
        'quantity' => 'decimal:3',
        'reserved_quantity' => 'decimal:3',
        'damaged_quantity' => 'decimal:3',
        'minimum_quantity' => 'decimal:3',
        'maximum_quantity' => 'decimal:3',
        'reorder_quantity' => 'decimal:3',
        'avg_cost' => 'decimal:2',
        'last_purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'last_received_date' => 'date:Y-m-d',
        'last_issued_date' => 'date:Y-m-d',
        'last_counted_date' => 'date:Y-m-d',
        'is_active' => 'boolean'
    ];
    
    /**
     * The attributes that should be appended to the model's array form.
     */
    protected $appends = ['available_quantity', 'stock_value'];
    
    /**
     * Boot method for model events
     */
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($model) {
            // Update stock status automatically
            $model->updateStockStatus();
        });
        
        static::saved(function ($model) {
            // Create or resolve stock alerts
            $model->handleStockAlerts();
        });
    }
    
    /**
     * Get the product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
    
    /**
     * Get the warehouse
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
    
    /**
     * Get the creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get the updater
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    /**
     * Get stock movements for this product in this warehouse
     */
    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'product_id', 'product_id')
            ->where(function($query) {
                $query->where('from_warehouse_id', $this->warehouse_id)
                    ->orWhere('to_warehouse_id', $this->warehouse_id);
            })
            ->orderBy('movement_date', 'desc');
    }
    
    /**
     * Get stock alerts
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(StockAlert::class, 'product_id', 'product_id')
            ->where('warehouse_id', $this->warehouse_id);
    }
    
    /**
     * Get available quantity (quantity - reserved)
     */
    public function getAvailableQuantityAttribute(): float
    {
        return $this->quantity - $this->reserved_quantity;
    }
    
    /**
     * Get stock value (quantity * avg_cost)
     */
    public function getStockValueAttribute(): float
    {
        return $this->quantity * $this->avg_cost;
    }
    
    /**
     * Check if stock is low
     */
    public function isLowStock(): bool
    {
        return $this->quantity <= $this->minimum_quantity && $this->quantity > 0;
    }
    
    /**
     * Check if out of stock
     */
    public function isOutOfStock(): bool
    {
        return $this->quantity <= 0;
    }
    
    /**
     * Check if overstocked
     */
    public function isOverstocked(): bool
    {
        return $this->maximum_quantity > 0 && $this->quantity >= $this->maximum_quantity;
    }
    
    /**
     * Update stock status based on quantity
     */
    public function updateStockStatus(): void
    {
        if ($this->isOutOfStock()) {
            $this->stock_status = 'OUT_OF_STOCK';
        } elseif ($this->isLowStock()) {
            $this->stock_status = 'LOW';
        } elseif ($this->isOverstocked()) {
            $this->stock_status = 'OVERSTOCKED';
        } else {
            $this->stock_status = 'NORMAL';
        }
    }
    
    /**
     * Handle stock alerts creation/resolution
     */
    public function handleStockAlerts(): void
    {
        if ($this->stock_status === 'LOW' || $this->stock_status === 'OUT_OF_STOCK') {
            $this->createStockAlert();
        } else {
            $this->resolveStockAlerts();
        }
    }
    
    /**
     * Create stock alert if not exists
     */
    protected function createStockAlert(): void
    {
        $alertType = $this->stock_status === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' : 'LOW_STOCK';
        
        StockAlert::firstOrCreate([
            'product_id' => $this->product_id,
            'warehouse_id' => $this->warehouse_id,
            'alert_type' => $alertType,
            'is_resolved' => false
        ], [
            'current_quantity' => $this->quantity,
            'threshold_quantity' => $this->minimum_quantity
        ]);
    }
    
    /**
     * Resolve existing stock alerts
     */
    protected function resolveStockAlerts(): void
    {
        StockAlert::where('product_id', $this->product_id)
            ->where('warehouse_id', $this->warehouse_id)
            ->where('is_resolved', false)
            ->update([
                'is_resolved' => true,
                'resolved_date' => now(),
                'resolved_by' => auth()->id()
            ]);
    }
    
    /**
     * Reserve stock for an order
     */
    public function reserveStock(float $quantity): bool
    {
        if ($this->available_quantity >= $quantity) {
            $this->reserved_quantity += $quantity;
            return $this->save();
        }
        return false;
    }
    
    /**
     * Release reserved stock
     */
    public function releaseReservedStock(float $quantity): bool
    {
        $this->reserved_quantity = max(0, $this->reserved_quantity - $quantity);
        return $this->save();
    }
    
    /**
     * Add stock (from purchase, return, etc.)
     */
    public function addStock(float $quantity, float $unitCost = null, string $reference = null): StockMovement
    {
        DB::beginTransaction();
        try {
            // Update stock quantity
            $stockBefore = $this->quantity;
            $this->quantity += $quantity;
            
            // Update average cost if provided
            if ($unitCost !== null) {
                $totalValue = ($this->quantity * $this->avg_cost) + ($quantity * $unitCost);
                $this->avg_cost = $totalValue / ($this->quantity + $quantity);
                $this->last_purchase_price = $unitCost;
            }
            
            $this->last_received_date = now();
            $this->save();
            
            // Create stock movement
            $movement = StockMovement::create([
                'movement_type' => 'PURCHASE',
                'product_id' => $this->product_id,
                'to_warehouse_id' => $this->warehouse_id,
                'quantity' => $quantity,
                'unit_cost' => $unitCost ?? $this->avg_cost,
                'total_cost' => $quantity * ($unitCost ?? $this->avg_cost),
                'stock_before' => $stockBefore,
                'stock_after' => $this->quantity,
                'reference_number' => $reference,
                'performed_by' => auth()->id(),
                'created_by' => auth()->id()
            ]);
            
            DB::commit();
            return $movement;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
    
    /**
     * Remove stock (for sales, damage, etc.)
     */
    public function removeStock(float $quantity, string $movementType = 'SALE', string $reference = null): ?StockMovement
    {
        if ($this->available_quantity < $quantity) {
            return null; // Insufficient stock
        }
        
        DB::beginTransaction();
        try {
            $stockBefore = $this->quantity;
            $this->quantity -= $quantity;
            $this->last_issued_date = now();
            $this->save();
            
            // Create stock movement
            $movement = StockMovement::create([
                'movement_type' => $movementType,
                'product_id' => $this->product_id,
                'from_warehouse_id' => $this->warehouse_id,
                'quantity' => $quantity,
                'unit_cost' => $this->avg_cost,
                'total_cost' => $quantity * $this->avg_cost,
                'stock_before' => $stockBefore,
                'stock_after' => $this->quantity,
                'reference_number' => $reference,
                'performed_by' => auth()->id(),
                'created_by' => auth()->id()
            ]);
            
            DB::commit();
            return $movement;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
    
    /**
     * Transfer stock to another warehouse
     */
    public function transferStock(Warehouse $toWarehouse, float $quantity, string $reference = null): ?StockMovement
    {
        if ($this->available_quantity < $quantity) {
            return null; // Insufficient stock
        }
        
        DB::beginTransaction();
        try {
            // Remove from current warehouse
            $stockBefore = $this->quantity;
            $this->quantity -= $quantity;
            $this->save();
            
            // Add to destination warehouse
            $destStock = self::firstOrCreate([
                'product_id' => $this->product_id,
                'warehouse_id' => $toWarehouse->id
            ], [
                'quantity' => 0,
                'created_by' => auth()->id()
            ]);
            
            $destStock->quantity += $quantity;
            $destStock->save();
            
            // Create transfer movement
            $movement = StockMovement::create([
                'movement_type' => 'TRANSFER',
                'product_id' => $this->product_id,
                'from_warehouse_id' => $this->warehouse_id,
                'to_warehouse_id' => $toWarehouse->id,
                'quantity' => $quantity,
                'unit_cost' => $this->avg_cost,
                'total_cost' => $quantity * $this->avg_cost,
                'stock_before' => $stockBefore,
                'stock_after' => $this->quantity,
                'reference_number' => $reference,
                'performed_by' => auth()->id(),
                'created_by' => auth()->id()
            ]);
            
            DB::commit();
            return $movement;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
    
    /**
     * Adjust stock (for inventory corrections)
     */
    public function adjustStock(float $newQuantity, string $reason = null): StockMovement
    {
        DB::beginTransaction();
        try {
            $stockBefore = $this->quantity;
            $difference = $newQuantity - $this->quantity;
            $movementType = $difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
            
            $this->quantity = $newQuantity;
            $this->last_counted_date = now();
            $this->save();
            
            // Create adjustment movement
            $movement = StockMovement::create([
                'movement_type' => $movementType,
                'product_id' => $this->product_id,
                'to_warehouse_id' => $this->warehouse_id,
                'quantity' => abs($difference),
                'unit_cost' => $this->avg_cost,
                'total_cost' => abs($difference) * $this->avg_cost,
                'stock_before' => $stockBefore,
                'stock_after' => $this->quantity,
                'reason' => $reason,
                'performed_by' => auth()->id(),
                'created_by' => auth()->id()
            ]);
            
            DB::commit();
            return $movement;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
    
    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
    
    public function scopeLowStock($query)
    {
        return $query->where('stock_status', 'LOW');
    }
    
    public function scopeOutOfStock($query)
    {
        return $query->where('stock_status', 'OUT_OF_STOCK');
    }
    
    public function scopeForWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }
    
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }
    
    /**
     * Get stock summary for a product across all warehouses
     */
    public static function getProductSummary($productId)
    {
        return self::where('product_id', $productId)
            ->selectRaw('
                SUM(quantity) as total_quantity,
                SUM(reserved_quantity) as total_reserved,
                SUM(damaged_quantity) as total_damaged,
                SUM(quantity * avg_cost) as total_value,
                AVG(avg_cost) as average_cost
            ')
            ->first();
    }
}
