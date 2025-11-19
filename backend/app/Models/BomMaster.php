<?php
// app/Models/BomMaster.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class BomMaster extends Model
{
    use HasUuids;

    protected $table = 'bom_masters';

    protected $fillable = [
        'bom_code',
        'bom_name',
        'product_id',
        'description',
        'output_quantity',
        'output_uom_id',
        'status',
        'effective_from',
        'effective_to',
        'total_cost',
        'labor_cost',
        'overhead_cost',
        'notes',
        'created_by',
        'updated_by',
        'approved_by',
        'approved_at'
    ];

    protected $casts = [
        'output_quantity' => 'decimal:3',
        'total_cost' => 'decimal:2',
        'labor_cost' => 'decimal:2',
        'overhead_cost' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'approved_at' => 'datetime'
    ];

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->bom_code)) {
                $model->bom_code = self::generateBomCode($model->product_id);
            }
        });
    }

    /**
     * Relationships
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function outputUom(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'output_uom_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(BomDetail::class, 'bom_master_id')->orderBy('sequence_no');
    }

    public function manufacturingOrders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class, 'bom_master_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'ACTIVE')
            ->where(function ($q) {
                $q->whereNull('effective_from')
                    ->orWhere('effective_from', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', now());
            });
    }

    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Methods
     */
    public static function generateBomCode($productId): string
    {
        $product = Product::find($productId);
        $prefix = 'BOM-' . ($product ? strtoupper(substr($product->product_code, 0, 3)) : 'XXX');
        
        $lastBom = self::where('bom_code', 'LIKE', $prefix . '-%')
            ->orderBy('bom_code', 'desc')
            ->first();
        
        if ($lastBom) {
            $lastNumber = intval(substr($lastBom->bom_code, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return $prefix . '-' . $newNumber;
    }

    /**
     * Calculate total material cost
     */
    public function calculateMaterialCost(): float
    {
        $totalCost = 0;
        
        foreach ($this->details as $detail) {
            // Get latest cost of raw material
            $rawMaterial = Product::find($detail->raw_material_id);
            if ($rawMaterial) {
                $unitCost = $rawMaterial->average_cost ?? $rawMaterial->last_purchase_cost ?? $rawMaterial->cost_price ?? 0;
                $detail->unit_cost = $unitCost;
                $detail->total_cost = $unitCost * $detail->quantity;
                $detail->save();
                
                $totalCost += $detail->total_cost;
            }
        }
        
        return $totalCost;
    }

    /**
     * Update total cost
     */
    public function updateTotalCost(): void
    {
        $materialCost = $this->calculateMaterialCost();
        $this->total_cost = $materialCost + $this->labor_cost + $this->overhead_cost;
        $this->save();
    }

    /**
     * Check if raw materials are available
     */
    public function checkRawMaterialAvailability($quantityToProduce, $warehouseId): array
    {
        $availability = [
            'available' => true,
            'shortages' => []
        ];
        
        $multiplier = $quantityToProduce / $this->output_quantity;
        
        foreach ($this->details as $detail) {
            $requiredQuantity = $detail->quantity * $multiplier;
            
            // Convert to base UOM for stock checking
            $requiredInBaseUom = $this->convertToBaseUom($requiredQuantity, $detail->uom_id);
            
            // Check stock balance
            $stockBalance = ProductStock::where('product_id', $detail->raw_material_id)
                ->where('warehouse_id', $warehouseId)
                ->first();
            
            $availableQuantity = $stockBalance ? ($stockBalance->quantity - $stockBalance->reserved_quantity) : 0;
            
            if ($availableQuantity < $requiredInBaseUom) {
                $availability['available'] = false;
                $availability['shortages'][] = [
                    'product_id' => $detail->raw_material_id,
                    'product_name' => $detail->rawMaterial->name,
                    'required_quantity' => $requiredInBaseUom,
                    'available_quantity' => $availableQuantity,
                    'shortage_quantity' => $requiredInBaseUom - $availableQuantity,
                    'uom' => $detail->uom->name
                ];
            }
        }
        
        return $availability;
    }

    /**
     * Convert quantity to base UOM
     */
    private function convertToBaseUom($quantity, $uomId): float
    {
        $uom = Uom::find($uomId);
        if (!$uom) return $quantity;
        
        // If it's already base unit
        if (!$uom->base_unit) {
            return $quantity;
        }
        
        // Convert to base unit
        return $quantity * $uom->conversion_factor;
    }

    /**
     * Create copy of BOM
     */
    public function duplicate($newProductId = null): ?BomMaster
    {
        DB::beginTransaction();
        try {
            $newBom = $this->replicate();
            $newBom->product_id = $newProductId ?? $this->product_id;
            $newBom->bom_code = self::generateBomCode($newBom->product_id);
            $newBom->bom_name = $this->bom_name . ' (Copy)';
            $newBom->status = 'DRAFT';
            $newBom->approved_by = null;
            $newBom->approved_at = null;
            $newBom->save();
            
            // Copy details
            foreach ($this->details as $detail) {
                $newDetail = $detail->replicate();
                $newDetail->bom_master_id = $newBom->id;
                $newDetail->save();
            }
            
            DB::commit();
            return $newBom;
        } catch (\Exception $e) {
            DB::rollback();
            return null;
        }
    }

    /**
     * Approve BOM
     */
    public function approve($userId = null): bool
    {
        if ($this->status === 'ACTIVE') {
            return true;
        }
        
        $this->status = 'ACTIVE';
        $this->approved_by = $userId ?? auth()->id();
        $this->approved_at = now();
        
        return $this->save();
    }

    /**
     * Check if BOM can be deleted
     */
    public function canBeDeleted(): bool
    {
        // Cannot delete if has manufacturing orders
        return $this->manufacturingOrders()->count() === 0;
    }
}