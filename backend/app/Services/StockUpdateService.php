<?php
// app/Services/StockUpdateService.php

namespace App\Services;

use App\Models\Product;
use App\Models\Warehouse;
use App\Models\StockMovement;
use App\Models\ProductStock;
use App\Models\ProductSerialNumber;
use App\Models\ProductBatch;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
class StockUpdateService
{
    /**
     * Create stock movement record
     */
    public function createStockMovement(array $data)
    {
        try {
            $movement = StockMovement::create([
                'product_id' => $data['product_id'],
                'warehouse_id' => $data['warehouse_id'],
                'movement_type' => $data['movement_type'], // IN, OUT, TRANSFER, ADJUSTMENT
                'movement_reason' => $data['movement_reason'], // GRN, SALE, RETURN, DAMAGE, etc.
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'] ?? 0,
                'total_value' => ($data['quantity'] * ($data['unit_price'] ?? 0)),
                'batch_number' => $data['batch_number'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'serial_numbers' => $data['serial_numbers'] ?? null,
                'from_warehouse_id' => $data['from_warehouse_id'] ?? null,
                'to_warehouse_id' => $data['to_warehouse_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => Auth::id() ?? $data['created_by'] ?? null,
                'movement_date' => $data['movement_date'] ?? now(),
                     'movement_number' => $this->generateMovementNumber(),
            ]);

            // Handle batch tracking if applicable
            if (!empty($data['batch_number'])) {
                $this->updateBatchStock($data);
            }

            // Handle serial numbers if applicable
            if (!empty($data['serial_numbers'])) {
                $this->recordSerialNumbers($data);
            }

            return $movement;
        } catch (\Exception $e) {
            Log::error('Stock movement creation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update product stock in warehouse
     */
    public function updateProductStock($productId, $warehouseId, $quantity, $operation = 'add')
    {
        DB::beginTransaction();

        try {
            $stock = ProductStock::firstOrCreate(
                [
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId
                ],
                [
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'min_quantity' => 0,
                    'max_quantity' => 0,
                    'reorder_level' => 0,
                    'reorder_quantity' => 0
                ]
            );

            if ($operation === 'add') {
                $stock->increment('quantity', $quantity);
            } elseif ($operation === 'subtract') {
                if ($stock->quantity < $quantity) {
                    throw new \Exception('Insufficient stock. Available: ' . $stock->quantity);
                }
                $stock->decrement('quantity', $quantity);
            } elseif ($operation === 'set') {
                $stock->update(['quantity' => $quantity]);
            }

            // Update product master stock totals
            $this->updateProductMasterStock($productId);

            // Check for low stock alert
            $this->checkLowStock($stock);

            DB::commit();

            return $stock;
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Stock update failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update product master stock totals
     */
    private function updateProductMasterStock($productId)
    {
        $totalStock = ProductStock::where('product_id', $productId)->sum('quantity');
        $totalReserved = ProductStock::where('product_id', $productId)->sum('reserved_quantity');
        
        Product::where('id', $productId)->update([
            'current_stock' => $totalStock,
            'available_stock' => $totalStock - $totalReserved,
            'last_stock_update' => now()
        ]);
    }

    /**
     * Reserve stock for pending orders
     */
    public function reserveStock($productId, $warehouseId, $quantity, $referenceType = null, $referenceId = null)
    {
        DB::beginTransaction();

        try {
            $stock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->first();

            if (!$stock) {
                throw new \Exception('Product not found in warehouse');
            }

            $availableQty = $stock->quantity - $stock->reserved_quantity;
            
            if ($availableQty < $quantity) {
                throw new \Exception('Insufficient available stock. Available: ' . $availableQty);
            }

            $stock->increment('reserved_quantity', $quantity);

            // Create reservation record
            DB::table('stock_reservations')->insert([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'quantity' => $quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'reserved_by' => Auth::id(),
                'reserved_at' => now(),
                'status' => 'active'
            ]);

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Stock reservation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Release reserved stock
     */
    public function releaseReservedStock($productId, $warehouseId, $quantity, $referenceType = null, $referenceId = null)
    {
        DB::beginTransaction();

        try {
            $stock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->first();

            if (!$stock) {
                throw new \Exception('Product not found in warehouse');
            }

            $stock->decrement('reserved_quantity', min($quantity, $stock->reserved_quantity));

            // Update reservation record
            if ($referenceType && $referenceId) {
                DB::table('stock_reservations')
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->update(['status' => 'released', 'released_at' => now()]);
            }

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Stock release failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Transfer stock between warehouses
     */
    public function transferStock($productId, $fromWarehouseId, $toWarehouseId, $quantity, $notes = null)
    {
        DB::beginTransaction();

        try {
            // Reduce stock from source warehouse
            $this->updateProductStock($productId, $fromWarehouseId, $quantity, 'subtract');

            // Add stock to destination warehouse
            $this->updateProductStock($productId, $toWarehouseId, $quantity, 'add');

            // Create transfer movement records
            $this->createStockMovement([
                'product_id' => $productId,
                'warehouse_id' => $fromWarehouseId,
                'movement_type' => 'TRANSFER',
                'movement_reason' => 'WAREHOUSE_TRANSFER',
                'quantity' => -$quantity,
                'from_warehouse_id' => $fromWarehouseId,
                'to_warehouse_id' => $toWarehouseId,
                'notes' => $notes
            ]);

            $this->createStockMovement([
                'product_id' => $productId,
                'warehouse_id' => $toWarehouseId,
                'movement_type' => 'TRANSFER',
                'movement_reason' => 'WAREHOUSE_TRANSFER',
                'quantity' => $quantity,
                'from_warehouse_id' => $fromWarehouseId,
                'to_warehouse_id' => $toWarehouseId,
                'notes' => $notes
            ]);

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Stock transfer failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Adjust stock for inventory corrections
     */
    public function adjustStock($productId, $warehouseId, $newQuantity, $reason, $notes = null)
    {
        DB::beginTransaction();

        try {
            $stock = ProductStock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->first();

            if (!$stock) {
                throw new \Exception('Product not found in warehouse');
            }

            $currentQty = $stock->quantity;
            $adjustmentQty = $newQuantity - $currentQty;

            if ($adjustmentQty != 0) {
                // Update stock
                $stock->update(['quantity' => $newQuantity]);

                // Create adjustment movement
                $this->createStockMovement([
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'movement_type' => 'ADJUSTMENT',
                    'movement_reason' => $reason,
                    'quantity' => $adjustmentQty,
                    'notes' => $notes
                ]);

                // Update product master
                $this->updateProductMasterStock($productId);
            }

            DB::commit();

            return $stock;
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Stock adjustment failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update batch stock
     */
    private function updateBatchStock($data)
    {
        $batch = ProductBatch::firstOrCreate(
            [
                'product_id' => $data['product_id'],
                'batch_number' => $data['batch_number']
            ],
            [
                'manufacture_date' => $data['manufacture_date'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'quantity' => 0,
                'warehouse_id' => $data['warehouse_id']
            ]
        );

        if ($data['movement_type'] === 'IN') {
            $batch->increment('quantity', $data['quantity']);
        } else {
            $batch->decrement('quantity', $data['quantity']);
        }
    }

    /**
     * Record serial numbers
     */
    private function recordSerialNumbers($data)
    {
        if (is_string($data['serial_numbers'])) {
            $serialNumbers = json_decode($data['serial_numbers'], true);
        } else {
            $serialNumbers = $data['serial_numbers'];
        }

        foreach ($serialNumbers as $serial) {
            ProductSerialNumber::create([
                'product_id' => $data['product_id'],
                'serial_number' => $serial,
                'warehouse_id' => $data['warehouse_id'],
                'batch_number' => $data['batch_number'] ?? null,
                'warranty_end_date' => $data['warranty_end_date'] ?? null,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'status' => 'in_stock',
                'created_by' => Auth::id()
            ]);
        }
    }

    /**
     * Check for low stock alert
     */
    private function checkLowStock($stock)
    {
        if ($stock->reorder_level > 0 && $stock->quantity <= $stock->reorder_level) {
            // Trigger low stock notification
            $this->sendLowStockAlert($stock);
        }
    }

    /**
     * Send low stock alert
     */
    private function sendLowStockAlert($stock)
    {
        // Implementation for sending notifications
        // This could be email, SMS, or system notification
        Log::info('Low stock alert for product: ' . $stock->product_id . ' in warehouse: ' . $stock->warehouse_id);
        
        // TODO: Implement actual notification sending
    }

    /**
     * Get stock valuation
     */
    public function getStockValuation($warehouseId = null, $date = null)
    {
        $query = ProductStock::with('product');

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        $stocks = $query->where('quantity', '>', 0)->get();

        $totalValue = 0;
        $items = [];

        foreach ($stocks as $stock) {
            $product = $stock->product;
            $unitCost = $this->getWeightedAverageCost($product->id, $date);
            $value = $stock->quantity * $unitCost;
            
            $totalValue += $value;
            
            $items[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $stock->quantity,
                'unit_cost' => $unitCost,
                'total_value' => $value
            ];
        }

        return [
            'total_value' => $totalValue,
            'items' => $items,
            'valuation_date' => $date ?? now(),
            'warehouse_id' => $warehouseId
        ];
    }

    /**
     * Calculate weighted average cost
     */
    private function getWeightedAverageCost($productId, $date = null)
    {
        $query = StockMovement::where('product_id', $productId)
            ->where('movement_type', 'IN');

        if ($date) {
            $query->whereDate('movement_date', '<=', $date);
        }

        $movements = $query->get();

        $totalQuantity = 0;
        $totalValue = 0;

        foreach ($movements as $movement) {
            $totalQuantity += $movement->quantity;
            $totalValue += $movement->total_value;
        }

        return $totalQuantity > 0 ? $totalValue / $totalQuantity : 0;
    }
        protected function generateMovementNumber()
{
    return 'SM/' . date('Y') . '/' . Str::upper(Str::random(5));
}
}