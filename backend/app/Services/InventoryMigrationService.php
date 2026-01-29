<?php
// app/Services/InventoryMigrationService.php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\SaleItem;
use App\Models\SaleItemBomProduct;
use App\Models\StockBalance;
use App\Models\StockMovement;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class InventoryMigrationService
{
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Process inventory migration for a booking
     * Creates stock out transactions for items with BOM products
     *
     * @param Booking $booking
     * @param array $bookingItems Array of booking items with item_id (sale_item_id) and quantity
     * @return array ['success' => bool, 'message' => string, 'movements' => array]
     * @throws \Exception
     */
    public function processInventoryMigration(Booking $booking, array $bookingItems)
    {
        // Collect all required products and their quantities
        $requiredProducts = $this->collectRequiredProducts($bookingItems);

        // If no products require inventory, mark as migrated and return
        if (empty($requiredProducts)) {
            $booking->update(['inventory_migration' => 1]);
            return [
                'success' => true,
                'message' => 'No inventory items to process',
                'movements' => []
            ];
        }

        // Validate stock availability
        $stockValidation = $this->validateStockAvailability($requiredProducts);
        
        if (!$stockValidation['success']) {
            throw new \Exception($stockValidation['message']);
        }

        // Create stock out transactions
        $movements = $this->createStockOutTransactions(
            $booking,
            $stockValidation['allocation']
        );

        // Mark inventory migration as completed
        $booking->update(['inventory_migration' => 1]);

        return [
            'success' => true,
            'message' => 'Inventory migration completed successfully',
            'movements' => $movements
        ];
    }

    /**
     * Collect all required products from booking items
     * Checks sale_item_bom_products table for BOM relationships
     *
     * @param array $bookingItems
     * @return array [product_id => ['product' => Product, 'required_qty' => float, 'sale_item_names' => array]]
     */
    protected function collectRequiredProducts(array $bookingItems)
    {
        $requiredProducts = [];

        foreach ($bookingItems as $bookingItem) {
            $saleItemId = $bookingItem['item_id'] ?? $bookingItem['id'] ?? null;
            $quantity = $bookingItem['quantity'] ?? 1;

            if (!$saleItemId) {
                continue;
            }

            // Get BOM products for this sale item
            $bomProducts = SaleItemBomProduct::with('product')
                ->where('sale_item_id', $saleItemId)
                ->get();

            if ($bomProducts->isEmpty()) {
                continue;
            }

            // Get sale item name for error messages
            $saleItem = SaleItem::find($saleItemId);
            $saleItemName = $saleItem ? $saleItem->name_primary : "Item #{$saleItemId}";

            foreach ($bomProducts as $bomProduct) {
                if (!$bomProduct->product) {
                    continue;
                }

                $productId = $bomProduct->product_id;
                $requiredQty = $bomProduct->quantity * $quantity;

                if (!isset($requiredProducts[$productId])) {
                    $requiredProducts[$productId] = [
                        'product' => $bomProduct->product,
                        'required_qty' => 0,
                        'sale_item_names' => []
                    ];
                }

                $requiredProducts[$productId]['required_qty'] += $requiredQty;
                
                if (!in_array($saleItemName, $requiredProducts[$productId]['sale_item_names'])) {
                    $requiredProducts[$productId]['sale_item_names'][] = $saleItemName;
                }
            }
        }

        return $requiredProducts;
    }

    /**
     * Validate stock availability across all warehouses
     *
     * @param array $requiredProducts
     * @return array ['success' => bool, 'message' => string, 'allocation' => array]
     */
    protected function validateStockAvailability(array $requiredProducts)
    {
        $insufficientItems = [];
        $allocation = [];

        foreach ($requiredProducts as $productId => $data) {
            $product = $data['product'];
            $requiredQty = $data['required_qty'];
            $saleItemNames = $data['sale_item_names'];

            // Get stock balances from all warehouses for this product
            $stockBalances = StockBalance::where('product_id', $productId)
                ->where('current_quantity', '>', 0)
                ->orderBy('current_quantity', 'desc') // Prefer warehouses with more stock
                ->get();

            $totalAvailable = $stockBalances->sum('current_quantity');

            if ($totalAvailable < $requiredQty) {
                // Collect item names that need this product
                $uomShort = $product->uom->uom_short ?? 'units';
                $insufficientItems[] = implode(', ', $saleItemNames) . 
                    " (need {$requiredQty} {$uomShort}, available: {$totalAvailable})";
                continue;
            }

            // Allocate stock from warehouses
            $remainingQty = $requiredQty;
            $productAllocation = [];

            foreach ($stockBalances as $balance) {
                if ($remainingQty <= 0) {
                    break;
                }

                $allocateQty = min($balance->current_quantity, $remainingQty);
                $productAllocation[] = [
                    'warehouse_id' => $balance->warehouse_id,
                    'quantity' => $allocateQty,
                    'product' => $product
                ];

                $remainingQty -= $allocateQty;
            }

            $allocation[$productId] = $productAllocation;
        }

        if (!empty($insufficientItems)) {
            return [
                'success' => false,
                'message' => 'Stock not available for: ' . implode('; ', $insufficientItems),
                'allocation' => []
            ];
        }

        return [
            'success' => true,
            'message' => 'Stock available',
            'allocation' => $allocation
        ];
    }

    /**
     * Create stock out transactions for allocated products
     *
     * @param Booking $booking
     * @param array $allocation
     * @return array Array of created StockMovement records
     */
    protected function createStockOutTransactions(Booking $booking, array $allocation)
    {
        $movements = [];

        foreach ($allocation as $productId => $warehouses) {
            foreach ($warehouses as $warehouseData) {
                $product = $warehouseData['product'];
                $warehouseId = $warehouseData['warehouse_id'];
                $quantity = $warehouseData['quantity'];

                // Get product average cost for valuation
                $unitCost = $product->average_cost ?? 0;

                // Create stock movement record
                $movement = StockMovement::create([
                    'movement_number' => $this->generateMovementNumber(),
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'movement_type' => 'OUT',
                    'movement_subtype' => 'SALE',
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'total_cost' => $quantity * $unitCost,
                    'reference_type' => 'SALES_BOOKING',
                    'reference_id' => $booking->id,
                    'notes' => "Stock out for Sales Order: {$booking->booking_number}",
                    'created_by' => Auth::id(),
                    'approval_status' => 'APPROVED',
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                    'created_at' => now()
                ]);

                // Update stock balance using StockService
                $this->stockService->updateStockBalance(
                    $productId,
                    $warehouseId,
                    $quantity,
                    'OUT'
                );

                $movements[] = $movement;

                Log::info('Stock out created for sale', [
                    'booking_number' => $booking->booking_number,
                    'product_id' => $productId,
                    'product_name' => $product->name,
                    'warehouse_id' => $warehouseId,
                    'quantity' => $quantity,
                    'movement_id' => $movement->id
                ]);
            }
        }

        return $movements;
    }

    /**
     * Generate unique movement number
     *
     * @return string
     */
    protected function generateMovementNumber()
    {
        return 'SM/' . date('Y') . '/' . strtoupper(Str::random(6));
    }

    /**
     * Reverse inventory migration for a cancelled booking
     * Creates stock in transactions to restore inventory
     *
     * @param Booking $booking
     * @return array
     */
    public function reverseInventoryMigration(Booking $booking)
    {
        // Only process if inventory was previously migrated
        if ($booking->inventory_migration !== 1) {
            return [
                'success' => true,
                'message' => 'No inventory to reverse',
                'movements' => []
            ];
        }

        // Find all stock out movements for this booking
        $originalMovements = StockMovement::where('reference_type', 'SALES_BOOKING')
            ->where('reference_id', $booking->id)
            ->where('movement_type', 'OUT')
            ->get();

        if ($originalMovements->isEmpty()) {
            return [
                'success' => true,
                'message' => 'No stock movements found to reverse',
                'movements' => []
            ];
        }

        $reversalMovements = [];

        foreach ($originalMovements as $originalMovement) {
            // Create reversal stock in movement
            $reversalMovement = StockMovement::create([
                'movement_number' => $this->generateMovementNumber(),
                'product_id' => $originalMovement->product_id,
                'warehouse_id' => $originalMovement->warehouse_id,
                'movement_type' => 'IN',
                'movement_subtype' => 'SALE_REVERSAL',
                'quantity' => $originalMovement->quantity,
                'unit_cost' => $originalMovement->unit_cost,
                'total_cost' => $originalMovement->total_cost,
                'reference_type' => 'SALES_BOOKING_REVERSAL',
                'reference_id' => $booking->id,
                'notes' => "Reversal for cancelled Sales Order: {$booking->booking_number}",
                'created_by' => Auth::id(),
                'approval_status' => 'APPROVED',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'created_at' => now()
            ]);

            // Update stock balance - add back the quantity
            $this->stockService->updateStockBalance(
                $originalMovement->product_id,
                $originalMovement->warehouse_id,
                $originalMovement->quantity,
                'IN'
            );

            $reversalMovements[] = $reversalMovement;

            Log::info('Stock reversal created for cancelled sale', [
                'booking_number' => $booking->booking_number,
                'product_id' => $originalMovement->product_id,
                'warehouse_id' => $originalMovement->warehouse_id,
                'quantity' => $originalMovement->quantity,
                'original_movement_id' => $originalMovement->id,
                'reversal_movement_id' => $reversalMovement->id
            ]);
        }

        // Reset inventory migration flag
        $booking->update(['inventory_migration' => 0]);

        return [
            'success' => true,
            'message' => 'Inventory reversal completed successfully',
            'movements' => $reversalMovements
        ];
    }
}