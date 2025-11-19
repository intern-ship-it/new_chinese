<?php

namespace App\Http\Controllers;

use App\Models\ManufacturingOrder;
use App\Models\ManufacturingOrderItem;
use App\Models\ManufacturingStockReservation;
use App\Models\ManufacturingCostHistory;
use App\Models\BomMaster;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\StockBalance;
use App\Models\Entry;
use App\Models\EntryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ManufacturingController extends Controller
{
    /**
     * Get all manufacturing orders
     */
    public function index(Request $request)
    {
        try {
            $query = ManufacturingOrder::with([
                'bomMaster', 
                'product', 
                'warehouse',
                'items.rawMaterial'
            ])->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('scheduled_date', [
                    $request->date_from,
                    $request->date_to
                ]);
            }

            // Filter by warehouse
            if ($request->has('warehouse_id')) {
                $query->where('warehouse_id', $request->warehouse_id);
            }

            $orders = $query->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data' => $orders
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch manufacturing orders: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create manufacturing order
     */
    public function store(Request $request)
    {
   
        $request->validate([
            'bom_master_id' => 'required|exists:bom_masters,id',
            'quantity_to_produce' => 'required|numeric|min:1',
            'scheduled_date' => 'required|date',
            'warehouse_id' => 'required|exists:warehouses,id',
            'priority' => 'in:LOW,NORMAL,HIGH,URGENT'
        ]);

        DB::beginTransaction();
        try {
            // Get BOM details
            $bomMaster = BomMaster::with(['details.rawMaterial', 'product', 'outputUom'])->findOrFail($request->bom_master_id);
            
            // Validate BOM is approved
            if ($bomMaster->status !== 'APPROVED') {
                return response()->json([
                    'success' => false,
                    'message' => 'BOM must be approved before creating manufacturing order'
                ], 400);
            }

            // Check stock availability
            $stockValidation = $this->validateStockAvailability($bomMaster, $request->quantity_to_produce, $request->warehouse_id);
            if (!$stockValidation['available']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock for raw materials',
                    'shortages' => $stockValidation['shortages']
                ], 400);
            }

            // Generate order number
            $orderNumber = $this->generateOrderNumber();

            // Create manufacturing order
            $manufacturingOrder = ManufacturingOrder::create([
                'order_number' => $orderNumber,
                'bom_master_id' => $request->bom_master_id,
                'product_id' => $bomMaster->product_id,
                'quantity_to_produce' => $request->quantity_to_produce,
                'uom_id' => $bomMaster->output_uom_id,
                'quantity_produced' => 0,
                'status' => 'DRAFT',
                'priority' => $request->priority ?? 'NORMAL',
                'scheduled_date' => $request->scheduled_date,
                'warehouse_id' => $request->warehouse_id,
                'batch_number' => $request->batch_number,
                'quality_check_required' => $request->quality_check_required ?? false,
                'notes' => $request->notes,
                'created_by' => auth()->id()
            ]);

            // Create manufacturing order items
            $totalMaterialCost = 0;
            foreach ($bomMaster->details as $detail) {
                $requiredQty = $detail->quantity * $request->quantity_to_produce;
                $unitCost = $detail->unit_cost;
                $totalCost = $unitCost * $requiredQty;
                $totalMaterialCost += $totalCost;

                ManufacturingOrderItem::create([
                    'manufacturing_order_id' => $manufacturingOrder->id,
                    'raw_material_id' => $detail->raw_material_id,
                    'required_quantity' => $requiredQty,
                    'consumed_quantity' => 0,
                    'uom_id' => $detail->uom_id,
                    'unit_cost' => $unitCost,
                    'total_cost' => $totalCost,
                    'status' => 'PENDING'
                ]);
            }

            // Update costs
            $laborCost = $bomMaster->labor_cost * $request->quantity_to_produce;
            $overheadCost = $bomMaster->overhead_cost * $request->quantity_to_produce;
            
            $manufacturingOrder->update([
                'material_cost' => $totalMaterialCost,
                'labor_cost' => $laborCost,
                'overhead_cost' => $overheadCost,
                'total_cost' => $totalMaterialCost + $laborCost + $overheadCost
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order created successfully',
                'data' => $manufacturingOrder->load(['items.rawMaterial'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create manufacturing order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start manufacturing (validate and reserve stock)
     */
    public function startManufacturing($id)
    {
        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::with(['items.rawMaterial', 'warehouse'])->findOrFail($id);

            // Validate status
            if ($order->status !== 'DRAFT' && $order->status !== 'VALIDATED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Manufacturing order cannot be started'
                ], 400);
            }

            // Reserve stock for each raw material
            foreach ($order->items as $item) {
                // Check stock availability
                $productStock = ProductStock::where('product_id', $item->raw_material_id)
                    ->where('warehouse_id', $order->warehouse_id)
                    ->first();

                if (!$productStock || $productStock->quantity < $item->required_quantity) {
                    DB::rollback();
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient stock for ' . $item->rawMaterial->name
                    ], 400);
                }

                // Create reservation
                ManufacturingStockReservation::create([
                    'manufacturing_order_id' => $order->id,
                    'product_id' => $item->raw_material_id,
                    'warehouse_id' => $order->warehouse_id,
                    'reserved_quantity' => $item->required_quantity,
                    'status' => 'RESERVED',
                    'reserved_at' => Carbon::now(),
                    'reserved_by' => auth()->id()
                ]);

                // Update product stock (increase reserved quantity)
                $productStock->reserved_quantity += $item->required_quantity;
                $productStock->save();

                // Update item status
                $item->status = 'RESERVED';
                $item->save();
            }

            // Update order status
            $order->update([
                'status' => 'IN_PROGRESS',
                'started_date' => Carbon::now(),
                'started_by' => auth()->id(),
                'started_at' => Carbon::now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing started successfully',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to start manufacturing: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete manufacturing order
     */
    public function completeManufacturing($id, Request $request)
    {
        $request->validate([
            'quantity_produced' => 'required|numeric|min:1',
            'quality_status' => 'in:PASSED,FAILED,PARTIAL'
        ]);

        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::with(['items', 'product', 'warehouse'])->findOrFail($id);

            // Validate status
            if ($order->status !== 'IN_PROGRESS') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order must be in progress to complete'
                ], 400);
            }

            // Process raw material consumption
            foreach ($order->items as $item) {
                $consumedQty = ($item->required_quantity / $order->quantity_to_produce) * $request->quantity_produced;
                
                // Create stock movement for consumption
                $this->createStockMovement(
                    $item->raw_material_id,
                    $order->warehouse_id,
                    $consumedQty,
                    'OUT',
                    'MANUFACTURING',
                    $order->order_number
                );

                // Update product stock
                $productStock = ProductStock::where('product_id', $item->raw_material_id)
                    ->where('warehouse_id', $order->warehouse_id)
                    ->first();
                
                $productStock->quantity -= $consumedQty;
                $productStock->reserved_quantity -= $item->required_quantity;
                $productStock->save();

                // Update item
                $item->consumed_quantity = $consumedQty;
                $item->status = 'CONSUMED';
                $item->save();

                // Update reservation
                ManufacturingStockReservation::where('manufacturing_order_id', $order->id)
                    ->where('product_id', $item->raw_material_id)
                    ->update([
                        'status' => 'CONSUMED',
                        'consumed_at' => Carbon::now()
                    ]);
            }

            // Add finished product to stock
            $this->createStockMovement(
                $order->product_id,
                $order->warehouse_id,
                $request->quantity_produced,
                'IN',
                'MANUFACTURING',
                $order->order_number
            );

            // Update or create product stock for finished product
            $finishedProductStock = ProductStock::firstOrCreate(
                [
                    'product_id' => $order->product_id,
                    'warehouse_id' => $order->warehouse_id
                ],
                [
                    'quantity' => 0,
                    'created_by' => auth()->id()
                ]
            );

            $finishedProductStock->quantity += $request->quantity_produced;
            
            // Update average cost based on manufacturing cost
            $unitCost = $order->total_cost / $order->quantity_to_produce;
            $totalValue = ($finishedProductStock->quantity * $finishedProductStock->avg_cost) + 
                          ($request->quantity_produced * $unitCost);
            $finishedProductStock->avg_cost = $totalValue / ($finishedProductStock->quantity);
            $finishedProductStock->save();

            // Update manufacturing order
            $order->update([
                'quantity_produced' => $request->quantity_produced,
                'status' => 'COMPLETED',
                'completed_date' => Carbon::now(),
                'completed_by' => auth()->id(),
                'completed_at' => Carbon::now(),
                'quality_status' => $request->quality_status ?? 'PASSED'
            ]);

            // Create cost history
            ManufacturingCostHistory::create([
                'manufacturing_order_id' => $order->id,
                'product_id' => $order->product_id,
                'quantity_produced' => $request->quantity_produced,
                'material_cost' => $order->material_cost,
                'labor_cost' => $order->labor_cost,
                'overhead_cost' => $order->overhead_cost,
                'total_cost' => $order->total_cost,
                'unit_cost' => $unitCost,
                'production_date' => Carbon::now()
            ]);

            // Create accounting entries if needed
            $this->createAccountingEntries($order);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing completed successfully',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete manufacturing: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel manufacturing order
     */
    public function cancelManufacturing($id, Request $request)
    {
        $request->validate([
            'cancellation_reason' => 'required|string'
        ]);

        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);

            // Can only cancel if not completed
            if ($order->status === 'COMPLETED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel completed order'
                ], 400);
            }

            // Release reserved stock if any
            if ($order->status === 'IN_PROGRESS') {
                $reservations = ManufacturingStockReservation::where('manufacturing_order_id', $order->id)
                    ->where('status', 'RESERVED')
                    ->get();

                foreach ($reservations as $reservation) {
                    // Update product stock
                    $productStock = ProductStock::where('product_id', $reservation->product_id)
                        ->where('warehouse_id', $reservation->warehouse_id)
                        ->first();
                    
                    if ($productStock) {
                        $productStock->reserved_quantity -= $reservation->reserved_quantity;
                        $productStock->save();
                    }

                    // Update reservation
                    $reservation->update([
                        'status' => 'RELEASED',
                        'released_at' => Carbon::now()
                    ]);
                }
            }

            // Update order
            $order->update([
                'status' => 'CANCELLED',
                'cancellation_reason' => $request->cancellation_reason,
                'cancelled_by' => auth()->id(),
                'cancelled_at' => Carbon::now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order cancelled successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get manufacturing order details
     */
    public function show($id)
    {
        try {
            $order = ManufacturingOrder::with([
                'bomMaster.details.rawMaterial',
                'product',
                'warehouse',
                'items.rawMaterial',
                'items.uom',
                'reservations',
                'createdBy',
                'startedBy',
                'completedBy'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Manufacturing order not found'
            ], 404);
        }
    }

    /**
     * Validate stock availability
     */
    private function validateStockAvailability($bomMaster, $quantity, $warehouseId)
    {
        $shortages = [];
        $available = true;

        foreach ($bomMaster->details as $detail) {
            $requiredQty = $detail->quantity * $quantity;
            
            $productStock = ProductStock::where('product_id', $detail->raw_material_id)
                ->where('warehouse_id', $warehouseId)
                ->first();

            $availableQty = $productStock ? ($productStock->quantity - $productStock->reserved_quantity) : 0;

            if ($availableQty < $requiredQty) {
                $available = false;
                $shortages[] = [
                    'product_id' => $detail->raw_material_id,
                    'product_name' => $detail->rawMaterial->name,
                    'required' => $requiredQty,
                    'available' => $availableQty,
                    'shortage' => $requiredQty - $availableQty
                ];
            }
        }

        return [
            'available' => $available,
            'shortages' => $shortages
        ];
    }

    /**
     * Create stock movement record
     */
    private function createStockMovement($productId, $warehouseId, $quantity, $type, $subtype, $reference)
    {
        $movementNumber = $this->generateMovementNumber();

        StockMovement::create([
            'id' => Str::uuid(),
            'movement_number' => $movementNumber,
            'movement_type' => $type,
            'movement_subtype' => $subtype,
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'quantity' => $quantity,
            'reference_type' => 'MANUFACTURING_ORDER',
            'reference_id' => $reference,
            'approval_status' => 'APPROVED',
            'approved_by' => auth()->id(),
            'approved_at' => Carbon::now(),
            'created_by' => auth()->id()
        ]);

        // Update stock balance
        $stockBalance = StockBalance::firstOrCreate(
            [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId
            ],
            [
                'current_quantity' => 0,
                'reserved_quantity' => 0
            ]
        );

        if ($type === 'IN') {
            $stockBalance->current_quantity += $quantity;
        } else {
            $stockBalance->current_quantity -= $quantity;
        }
        
        $stockBalance->last_movement_date = Carbon::now();
        $stockBalance->save();
    }

    /**
     * Create accounting entries for manufacturing
     */
    private function createAccountingEntries($order)
    {
        // This would create journal entries for:
        // 1. Raw material consumption (Credit raw material inventory, Debit WIP)
        // 2. Labor and overhead allocation (Credit respective accounts, Debit WIP)
        // 3. Finished goods production (Credit WIP, Debit finished goods inventory)
        
        // Implementation depends on your accounting structure
        // For now, leaving as placeholder
    }

    /**
     * Generate unique order number
     */
    private function generateOrderNumber()
    {
        $prefix = 'MO';
        $date = Carbon::now()->format('Ymd');
        
        $lastOrder = ManufacturingOrder::where('order_number', 'LIKE', $prefix . '-' . $date . '-%')
            ->orderBy('order_number', 'desc')
            ->first();

        if ($lastOrder) {
            $lastNumber = intval(substr($lastOrder->order_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . '-' . $date . '-' . $newNumber;
    }

    /**
     * Generate movement number
     */
    private function generateMovementNumber()
    {
        $prefix = 'STK';
        $date = Carbon::now()->format('Ymd');
        
        $lastMovement = StockMovement::where('movement_number', 'LIKE', $prefix . '-' . $date . '-%')
            ->orderBy('movement_number', 'desc')
            ->first();

        if ($lastMovement) {
            $lastNumber = intval(substr($lastMovement->movement_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . '-' . $date . '-' . $newNumber;
    }

    /**
     * Get manufacturing dashboard stats
     */
    public function getDashboardStats()
    {
        try {
            $stats = [
                'total_orders' => ManufacturingOrder::count(),
                'pending_orders' => ManufacturingOrder::where('status', 'DRAFT')->count(),
                'in_progress' => ManufacturingOrder::where('status', 'IN_PROGRESS')->count(),
                'completed_today' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereDate('completed_date', Carbon::today())
                    ->count(),
                'total_production_value' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->sum('total_cost'),
                'average_completion_time' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereNotNull('started_date')
                    ->whereNotNull('completed_date')
                    ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, started_date, completed_date)) as avg_hours')
                    ->value('avg_hours')
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch stats: ' . $e->getMessage()
            ], 500);
        }
    }
}