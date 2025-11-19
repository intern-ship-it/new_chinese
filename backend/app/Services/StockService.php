<?php
// app/Services/StockService.php

namespace App\Services;

use App\Models\Product;
use App\Models\StockBalance;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Uom;
use Illuminate\Support\Facades\Log;

class StockService
{
    /**
     * Update stock balance for a product at a warehouse
     */
    public function updateStockBalance($productId, $warehouseId, $quantity, $movementType, $inputUomId = null)
    {
        $product = Product::with('uom')->find($productId);

        if (!$product) {
            throw new \Exception("Product not found");
        }

        // If input UOM is provided and different from product UOM, convert it
        if ($inputUomId && $inputUomId != $product->uom_id) {
            $quantity = $this->convertBetweenUoms($quantity, $inputUomId, $product->uom_id);
        }

        // Convert to base unit for storage
        $baseQuantity = $this->convertToBaseUnit($quantity, $product->uom_id);

        // Get or create stock balance
        $balance = StockBalance::firstOrCreate(
            [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId
            ],
            [
                'current_quantity' => 0,
                'reserved_quantity' => 0,
                'available_quantity' => 0
            ]
        );

        // Update quantity based on movement type
        if ($movementType === 'IN') {
            $balance->current_quantity += $baseQuantity;
        } else {
            $balance->current_quantity -= $baseQuantity;

            // Ensure stock doesn't go negative
            if ($balance->current_quantity < 0) {
                throw new \Exception("Insufficient stock. Available: " .
                    $this->convertFromBaseUnit($balance->current_quantity + $baseQuantity, $product->uom_id));
            }
        }

        $balance->last_updated = now();
        $balance->save();

        // Update product total stock in base units
        $this->updateProductStock($productId);

        return $balance;
    }

    /**
     * Get available stock at specific warehouse
     */
    public function getAvailableStock($productId, $warehouseId = null)
    {
        if ($warehouseId) {
            $balance = StockBalance::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->first();

            return $balance ? $balance->current_quantity : 0;
        }

        // Return total stock across all warehouses
        return StockBalance::where('product_id', $productId)
            ->sum('current_quantity');
    }

    /**
     * Update product total stock
     */
    private function updateProductStock($productId)
    {
        $totalStock = StockBalance::where('product_id', $productId)
            ->sum('current_quantity');

        Product::where('id', $productId)
            ->update(['current_stock' => $totalStock]);
    }

    /**
     * Update product total stock (legacy method name for compatibility)
     */
    private function updateProductTotalStock($productId)
    {
        $totalStock = StockBalance::where('product_id', $productId)
            ->sum('current_quantity');

        // Check if current_stock column exists
        $product = Product::find($productId);
        if ($product && Schema::hasColumn('products', 'current_stock')) {
            $product->current_stock = $totalStock;
            $product->save();
        }
    }

    /**
     * Update product average cost using weighted average method
     * 
     * Formula: New Avg Cost = ((Current Stock × Current Avg Cost) + (New Qty × New Cost)) / (Current Stock + New Qty)
     * 
     * @param int $productId Product ID
     * @param float $newUnitCost New unit cost (in base units)
     * @param float $newQuantity New quantity (in base units)
     * @return void
     */
    public function updateAverageCost($productId, $newUnitCost, $newQuantity)
    {
        try {
            $product = Product::find($productId);
            
            if (!$product) {
                throw new \Exception("Product not found");
            }

            // Get current stock and average cost
            $currentStock = $product->current_stock ?? 0;
            $currentAvgCost = $product->average_cost ?? 0;

            // Calculate new average cost using weighted average
            if ($currentStock > 0 && $currentAvgCost > 0) {
                // Weighted average formula
                $totalCurrentValue = $currentStock * $currentAvgCost;
                $totalNewValue = $newQuantity * $newUnitCost;
                $totalQuantity = $currentStock + $newQuantity;
                
                $newAverageCost = ($totalCurrentValue + $totalNewValue) / $totalQuantity;
            } else {
                // If no existing stock or cost, use the new cost
                $newAverageCost = $newUnitCost;
            }

            // Update product average cost
            $product->average_cost = round($newAverageCost, 4);
            $product->last_purchase_cost = $newUnitCost;
            $product->save();

            Log::info("Average cost updated", [
                'product_id' => $productId,
                'old_avg_cost' => $currentAvgCost,
                'new_avg_cost' => $newAverageCost,
                'current_stock' => $currentStock,
                'new_quantity' => $newQuantity,
                'new_unit_cost' => $newUnitCost
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to update average cost: " . $e->getMessage(), [
                'product_id' => $productId,
                'new_unit_cost' => $newUnitCost,
                'new_quantity' => $newQuantity
            ]);
            // Don't throw exception - this is a non-critical operation
        }
    }

    /**
     * Validate UOM compatibility
     */
    public function validateUomCompatibility($productId, $uomId)
    {
        $product = Product::with('uom')->find($productId);

        if (!$product) {
            return false;
        }

        // Same UOM is always compatible
        if ($product->uom_id == $uomId) {
            return true;
        }

        $productBaseUomId = $product->uom->base_unit ?? $product->uom_id;

        $inputUom = Uom::find($uomId);
        if (!$inputUom) {
            return false;
        }

        $inputBaseUomId = $inputUom->base_unit ?? $uomId;

        // Check if they share the same base unit
        return $productBaseUomId == $inputBaseUomId;
    }

    /**
     * Convert between UOMs
     */
    public function convertBetweenUoms($quantity, $fromUomId, $toUomId)
    {
        // If same UOM, no conversion needed
        if ($fromUomId == $toUomId) {
            return $quantity;
        }

        $fromUom = Uom::find($fromUomId);
        $toUom = Uom::find($toUomId);

        if (!$fromUom || !$toUom) {
            throw new \Exception("Invalid UOM for conversion");
        }

        // Check if UOMs have the same base unit
        $fromBaseUomId = $fromUom->base_unit ?? $fromUomId;
        $toBaseUomId = $toUom->base_unit ?? $toUomId;

        if ($fromBaseUomId != $toBaseUomId) {
            throw new \Exception("Cannot convert between incompatible UOM types (different base units)");
        }

        // Convert: from UOM -> base unit -> to UOM
        $baseQuantity = $this->convertToBaseUnit($quantity, $fromUomId);
        return $this->convertFromBaseUnit($baseQuantity, $toUomId);
    }

    /**
     * Convert to base unit
     */
    public function convertToBaseUnit($quantity, $uomId)
    {
        $uom = Uom::find($uomId);

        if (!$uom) {
            throw new \Exception("UOM not found");
        }

        // If this is already a base unit (no parent), return as is
        if (!$uom->base_unit) {
            return $quantity;
        }

        // Convert to base unit using conversion factor
        // Example: 1.5 Litre * 1000 = 1500 ML
        return $quantity * $uom->conversion_factor;
    }

    /**
     * Convert from base unit
     */
    public function convertFromBaseUnit($baseQuantity, $targetUomId)
    {
        $uom = Uom::find($targetUomId);

        if (!$uom) {
            throw new \Exception("UOM not found");
        }

        // If this is a base unit, return as is
        if (!$uom->base_unit) {
            return $baseQuantity;
        }

        // Convert from base unit
        // Example: 1500 ML / 1000 = 1.5 Litre
        return $baseQuantity / $uom->conversion_factor;
    }
	
	/**
     * Convert from base unit
     */
    public function convertToOriginalUnit($quantity, $fromUomId, $toUomId)
    {
		$exact_qty = 0;
        if($toUomId == $fromUomId){
			$exact_qty = $quantity;
		}else{
			$uom_increase = Uom::where('base_unit', $toUomId)->where('id', $fromUomId)->first();
			$uom_decrease = Uom::where('base_unit', $fromUomId)->where('id', $toUomId)->first();
			if(!empty($uom_increase->id) && !empty($uom_increase->conversion_factor)){
				$exact_qty = $quantity * $uom_increase->conversion_factor;
			}elseif(!empty($uom_decrease->id) && !empty($uom_decrease->conversion_factor)){
				$exact_qty = $quantity / $uom_decrease->conversion_factor;
			}
		}
		return $exact_qty;
    }

    /**
     * Get stock information
     */
    public function getStockInfo($productId, $warehouseId = null)
    {
        $product = Product::with('uom.baseUnit')->find($productId);

        if (!$product) {
            throw new \Exception("Product not found");
        }

        $baseStock = $this->getAvailableStock($productId, $warehouseId);

        $stockInfo = [
            'product_id' => $productId,
            'product_name' => $product->name,
            'product_code' => $product->code,
            'uom_id' => $product->uom_id,
            'uom_name' => $product->uom->name,
            'uom_short' => $product->uom->uom_short,
            'current_stock' => $baseStock,
            'current_stock_formatted' => number_format($baseStock, 3) . ' ' . $product->uom->uom_short,
            'is_base_unit' => !$product->uom->base_unit,
            'min_stock' => $product->min_stock,
            'average_cost' => $product->average_cost
        ];

        // If product's UOM has a base unit, include conversion info
        if ($product->uom->base_unit) {
            $baseUom = $product->uom->baseUnit;
            $stockInBaseUnit = $this->convertToBaseUnit($baseStock, $product->uom_id);

            $stockInfo['base_uom'] = [
                'id' => $baseUom->id,
                'name' => $baseUom->name,
                'short' => $baseUom->uom_short,
                'stock' => $stockInBaseUnit,
                'formatted' => number_format($stockInBaseUnit, 3) . ' ' . $baseUom->uom_short
            ];
            $stockInfo['conversion_factor'] = $product->uom->conversion_factor;
        }

        return $stockInfo;
    }
}