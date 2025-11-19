<?php

namespace App\Http\Controllers;

use App\Models\ManufacturingOrder;
use App\Models\ManufacturingOrderItem;
use App\Models\BomMaster;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Models\Uom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\User;


class ManufacturingOrderController extends Controller
{
    /**
     * Display listing of manufacturing orders
     */
    public function index(Request $request)
    {
        $query = ManufacturingOrder::with(['product', 'bomMaster', 'warehouse']);

        // Apply filters only if values are present
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('scheduled_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('scheduled_date', '<=', $request->date_to);
        }

        // Sort by newest first
        $query->orderBy('created_at', 'desc');

        // Paginate results
        $orders = $query->paginate(20)->withQueryString();

        $user = Auth::user();
        $permissions = $this->assignPermissions($user);
        // Return proper JSON with meta info
        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'permissions' => $permissions,
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ]
        ]);
    }

    /**
     * Get single manufacturing order with full details
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);
        try {
            $order = ManufacturingOrder::with([
                'product' => function ($query) {
                    $query->select('id', 'product_code', 'name', 'description', 'current_stock', 'uom_id');
                },
                'bomMaster' => function ($query) {
                    $query->with([
                        'details' => function ($q) {
                            $q->with(['rawMaterial', 'uom']);
                        },
                        'outputUom'
                    ]);
                },
                'warehouse',
                'uom',
                'items' => function ($query) {
                    $query->with(['rawMaterial', 'uom']);
                },
                'creator:id,name,email',
                'validator:id,name,email',
                'starter:id,name,email',
                'completer:id,name,email',
                'qualityChecker:id,name,email',
                'canceller:id,name,email'
            ])->findOrFail($id);

            // Add computed fields
            $order->can_validate = $order->status === 'DRAFT';
            $order->can_start = $order->status === 'VALIDATED';
            $order->can_complete = $order->status === 'IN_PROGRESS' &&
                (!$order->quality_check_required || $order->quality_status === 'PASSED');
            $order->can_cancel = !in_array($order->status, ['COMPLETED', 'CANCELLED']);

            // Add BOM details for calculations - with null check
            if ($order->bomMaster && $order->bomMaster->details) {
                $order->bomMaster->details->each(function ($detail) use ($order) {
                    $detail->bom_quantity = $detail->quantity;
                    // Find corresponding item in order
                    $orderItem = $order->items->where('raw_material_id', $detail->raw_material_id)->first();
                    if ($orderItem) {
                        $detail->current_stock = ProductStock::where('product_id', $detail->raw_material_id)
                            ->where('warehouse_id', $order->warehouse_id)
                            ->value('quantity') ?? 0;
                    }
                });
            }

            return response()->json([
                'success' => true,
                'data' => $order,
                'permissions' => $permissions
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Manufacturing order not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch manufacturing order details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new manufacturing order
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('manufacturing.order.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create manufacturing order'
            ], 403);
        }
        $validated = $request->validate([
            'bom_master_id' => 'required|uuid|exists:bom_masters,id',
            'product_id' => 'required|integer|exists:products,id',
            'quantity_to_produce' => 'required|numeric|min:0.001',
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'scheduled_date' => 'required|date',
            'priority' => 'in:LOW,NORMAL,HIGH,URGENT',
            'notes' => 'nullable|string'
        ]);

        DB::beginTransaction();
        try {
            // Get BOM details
            $bomMaster = BomMaster::with('details.rawMaterial')->findOrFail($validated['bom_master_id']);

            if ($bomMaster->status !== 'ACTIVE') {
                return response()->json([
                    'success' => false,
                    'message' => 'BOM must be approved before creating manufacturing order'
                ], 422);
            }

            // Generate order number
            $orderNumber = $this->generateOrderNumber();

            // Calculate material requirements
            $materialRequirements = $this->calculateMaterialRequirements(
                $bomMaster,
                $validated['quantity_to_produce']
            );

            // Check stock availability
            $stockValidation = $this->validateStockAvailability(
                $materialRequirements,
                $validated['warehouse_id']
            );

            if (!$stockValidation['available']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock for manufacturing',
                    'shortages' => $stockValidation['shortages']
                ], 422);
            }

            // Create manufacturing order
            $order = ManufacturingOrder::create([
                'order_number' => $orderNumber,
                'bom_master_id' => $validated['bom_master_id'],
                'product_id' => $validated['product_id'],
                'quantity_to_produce' => $validated['quantity_to_produce'],
                'uom_id' => $bomMaster->output_uom_id,
                'warehouse_id' => $validated['warehouse_id'],
                'scheduled_date' => $validated['scheduled_date'],
                'priority' => $validated['priority'] ?? 'NORMAL',
                'status' => 'DRAFT',
                'notes' => $validated['notes'] ?? null,
                'created_by' => Auth::id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create manufacturing order items (raw materials)
            foreach ($materialRequirements as $material) {
                ManufacturingOrderItem::create([
                    'id' => Str::uuid(),
                    'manufacturing_order_id' => $order->id,
                    'raw_material_id' => $material['product_id'],
                    'required_quantity' => $material['required_quantity'],
                    'uom_id' => $material['uom_id'],
                    'unit_cost' => $material['unit_cost'],
                    'total_cost' => $material['total_cost'],
                    'status' => 'PENDING',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Calculate estimated costs
            $this->updateOrderCosts($order);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order created successfully',
                'data' => $order->load(['product', 'bomMaster', 'items.rawMaterial'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create manufacturing order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate/Start manufacturing order
     */
    public function validateOrder($id)
    {
        $order = ManufacturingOrder::with('items')->findOrFail($id);

        if ($order->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft orders can be validated'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Re-check stock availability
            $stockValidation = $this->validateOrderStock($order);

            if (!$stockValidation['available']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock to start manufacturing',
                    'shortages' => $stockValidation['shortages']
                ], 422);
            }

            // Reserve raw materials
            foreach ($order->items as $item) {
                $this->reserveStock(
                    $item->raw_material_id,
                    $order->warehouse_id,
                    $item->required_quantity
                );
            }

            // Update order status
            $order->update([
                'status' => 'VALIDATED',
                'validated_by' => Auth::id(),
                'validated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order validated successfully',
                'data' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start manufacturing process
     */
    public function startManufacturing($id)
    {
        $order = ManufacturingOrder::with('items')->findOrFail($id);

        if ($order->status !== 'VALIDATED') {
            return response()->json([
                'success' => false,
                'message' => 'Order must be validated before starting'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Consume raw materials from stock
            foreach ($order->items as $item) {
                // Create stock movement for consumption
                $stockMovement = StockMovement::create([
                    'id' => Str::uuid(),
                    'movement_number' => $this->generateMovementNumber(),
                    'movement_type' => 'OUT',
                    'movement_subtype' => 'MANUFACTURING',
                    'product_id' => $item->raw_material_id,
                    'warehouse_id' => $order->warehouse_id,
                    'quantity' => $item->required_quantity,
                    'reference_type' => 'MANUFACTURING_ORDER',
                    'reference_id' => $order->order_number,
                    'approval_status' => 'APPROVED',
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                    'created_by' => Auth::id(),
                    'created_at' => now()
                ]);

                // Update product stock
                $this->consumeStock(
                    $item->raw_material_id,
                    $order->warehouse_id,
                    $item->required_quantity
                );

                // Update item status
                $item->update([
                    'consumed_quantity' => $item->required_quantity,
                    'stock_movement_id' => $stockMovement->id,
                    'status' => 'CONSUMED'
                ]);
            }

            // Update order status
            $order->update([
                'status' => 'IN_PROGRESS',
                'started_by' => Auth::id(),
                'started_at' => now(),
                'started_date' => now()->toDateString()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing started successfully',
                'data' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to start manufacturing',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete manufacturing order
     */
    public function completeManufacturing(Request $request, $id)
    {
        $validated = $request->validate([
            'quantity_produced' => 'required|numeric|min:0.001',
            'batch_number' => 'nullable|string',
            'quality_check_required' => 'boolean',
            'notes' => 'nullable|string'
        ]);

        $order = ManufacturingOrder::findOrFail($id);

        if ($order->status !== 'IN_PROGRESS') {
            return response()->json([
                'success' => false,
                'message' => 'Only in-progress orders can be completed'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Add finished product to stock
            $stockMovement = StockMovement::create([
                'id' => Str::uuid(),
                'movement_number' => $this->generateMovementNumber(),
                'movement_type' => 'IN',
                'movement_subtype' => 'MANUFACTURING',
                'product_id' => $order->product_id,
                'warehouse_id' => $order->warehouse_id,
                'quantity' => $validated['quantity_produced'],
                'batch_number' => $validated['batch_number'] ?? null,
                'reference_type' => 'MANUFACTURING_ORDER',
                'reference_id' => $order->order_number,
                'approval_status' => 'APPROVED',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'created_by' => Auth::id(),
                'created_at' => now()
            ]);

            // Update product stock
            $this->addToStock(
                $order->product_id,
                $order->warehouse_id,
                $validated['quantity_produced'],
                $validated['batch_number'] ?? null
            );

            // Calculate actual production cost
            $actualCost = $this->calculateActualCost($order);

            // Update order
            $order->update([
                'quantity_produced' => $validated['quantity_produced'],
                'status' => 'COMPLETED',
                'completed_by' => Auth::id(),
                'completed_at' => now(),
                'completed_date' => now()->toDateString(),
                'batch_number' => $validated['batch_number'] ?? null,
                'quality_check_required' => $validated['quality_check_required'] ?? false,
                'total_cost' => $actualCost,
                'notes' => $validated['notes'] ?? $order->notes
            ]);

            // Update product average cost
            $this->updateProductAverageCost(
                $order->product_id,
                $validated['quantity_produced'],
                $actualCost
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing completed successfully',
                'data' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete manufacturing',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check stock availability for manufacturing
     */
    public function checkStockAvailability(Request $request)
    {
        $validated = $request->validate([
            'bom_master_id' => 'required|uuid|exists:bom_masters,id',
            'quantity_to_produce' => 'required|numeric|min:0.001',
            'warehouse_id' => 'required|integer|exists:warehouses,id'
        ]);

        $bomMaster = BomMaster::with('details')->findOrFail($validated['bom_master_id']);

        $requirements = $this->calculateMaterialRequirements(
            $bomMaster,
            $validated['quantity_to_produce']
        );

        $stockValidation = $this->validateStockAvailability(
            $requirements,
            $validated['warehouse_id']
        );

        return response()->json([
            'success' => true,
            'available' => $stockValidation['available'],
            'requirements' => $requirements,
            'shortages' => $stockValidation['shortages'] ?? []
        ]);
    }

    /**
     * Check availability for EXISTING order (requires order ID)
     */
    public function checkAvailability(Request $request, $id)
    {
        try {
            $order = ManufacturingOrder::with(['bomMaster.details.rawMaterial', 'warehouse'])->findOrFail($id);

            // Get quantity to check (either from request or order's current quantity)
            $quantityToProduce = $request->input('quantity_to_produce', $order->quantity_to_produce);

            $bomMaster = $order->bomMaster;

            if (!$bomMaster) {
                return response()->json([
                    'success' => false,
                    'message' => 'BOM not found for this order'
                ], 404);
            }

            // Calculate material requirements based on quantity
            $requirements = $this->calculateMaterialRequirements(
                $bomMaster,
                $quantityToProduce
            );

            // Check stock availability at the order's warehouse
            $stockValidation = $this->validateStockAvailability(
                $requirements,
                $order->warehouse_id
            );

            // Prepare detailed response
            $detailedRequirements = [];
            foreach ($requirements as $req) {
                $stock = ProductStock::where('product_id', $req['product_id'])
                    ->where('warehouse_id', $order->warehouse_id)
                    ->first();

                $availableQty = $stock ? ($stock->quantity - $stock->reserved_quantity) : 0;

                $detailedRequirements[] = [
                    'product_id' => $req['product_id'],
                    'product_name' => $req['product_name'],
                    'required_quantity' => $req['required_quantity'],
                    'available_quantity' => $availableQty,
                    'reserved_quantity' => $stock ? $stock->reserved_quantity : 0,
                    'uom' => $req['uom_id'] ? Uom::find($req['uom_id'])->uom_short : 'Unit',
                    'is_available' => $availableQty >= $req['required_quantity']
                ];
            }

            // ADD THIS RETURN STATEMENT - this was missing
            return response()->json([
                'success' => true,
                'data' => [
                    'available' => $stockValidation['available'],
                    'requirements' => $detailedRequirements,
                    'shortages' => $stockValidation['shortages'] ?? [],
                    'quantity_to_produce' => $quantityToProduce,
                    'warehouse' => $order->warehouse->name ?? 'Unknown'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get list of active BOMs for dropdown
     */
    public function getActiveBoms(Request $request)
    {
        try {
            $boms = BomMaster::with(['product', 'outputUom'])
                ->orderBy('bom_code')
                ->get()
                ->map(function ($bom) {
                    return [
                        'id' => $bom->id,
                        'bom_code' => $bom->bom_code,
                        'product_id' => $bom->product_id,
                        'product_name' => $bom->product->name ?? 'Unknown Product',
                        'output_quantity' => $bom->output_quantity,
                        'output_uom' => $bom->outputUom->uom_short ?? 'Unit',
                        'output_uom_id' => $bom->output_uom_id,
                        'total_cost' => $bom->total_cost,
                        'labor_cost' => $bom->labor_cost,
                        'overhead_cost' => $bom->overhead_cost
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $boms
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active BOMs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get list of warehouses for dropdown
     */
    public function getWarehouses(Request $request)
    {
        try {
            $warehouses = Warehouse::where('is_active', true)
                ->orderBy('id')
                ->get(['id', 'code', 'name']);

            return response()->json([
                'success' => true,
                'data' => $warehouses
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch warehouses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics for manufacturing orders
     */
    public function dashboard(Request $request)
    {
        try {
            $statistics = [
                'draft_orders' => ManufacturingOrder::where('status', 'DRAFT')->count(),
                'validated_orders' => ManufacturingOrder::where('status', 'VALIDATED')->count(),
                'in_progress_orders' => ManufacturingOrder::where('status', 'IN_PROGRESS')->count(),
                'completed_orders' => ManufacturingOrder::where('status', 'COMPLETED')->count(),
                'cancelled_orders' => ManufacturingOrder::where('status', 'CANCELLED')->count(),
                'today_scheduled' => ManufacturingOrder::whereDate('scheduled_date', Carbon::today())->count(),
                'overdue_orders' => ManufacturingOrder::where('scheduled_date', '<', Carbon::today())
                    ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                    ->count()
            ];

            // Get recent orders
            $recentOrders = ManufacturingOrder::with(['product', 'warehouse'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            // Get upcoming scheduled orders
            $upcomingOrders = ManufacturingOrder::with(['product', 'warehouse'])
                ->where('scheduled_date', '>=', Carbon::today())
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->orderBy('scheduled_date')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'statistics' => $statistics,
                    'recent_orders' => $recentOrders,
                    'upcoming_orders' => $upcomingOrders
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Private helper methods

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

    private function generateMovementNumber()
    {
        $prefix = 'SM';
        $date = Carbon::now()->format('Ymd');
        $random = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        return $prefix . '-' . $date . '-' . $random;
    }

    private function calculateMaterialRequirements($bomMaster, $quantityToProduce)
    {
        $requirements = [];

        // Check if bomMaster exists and has details
        if (!$bomMaster || !$bomMaster->details) {
            return $requirements;
        }

        $ratio = $quantityToProduce / $bomMaster->output_quantity;

        foreach ($bomMaster->details as $detail) {
            $requiredQty = $detail->quantity * $ratio;

            // Get current stock info
            $stock = ProductStock::where('product_id', $detail->raw_material_id)
                ->where('warehouse_id', request('warehouse_id'))
                ->first();

            $requirements[] = [
                'product_id' => $detail->raw_material_id,
                'product_name' => $detail->rawMaterial->name ?? 'Unknown',
                'required_quantity' => $requiredQty,
                'uom_id' => $detail->uom_id,
                'unit_cost' => $stock->avg_cost ?? $detail->unit_cost ?? 0,
                'total_cost' => $requiredQty * ($stock->avg_cost ?? $detail->unit_cost ?? 0),
                'available_stock' => $stock->quantity ?? 0
            ];
        }

        return $requirements;
    }

    private function validateStockAvailability($requirements, $warehouseId)
    {
        $available = true;
        $shortages = [];

        foreach ($requirements as $req) {
            $stock = ProductStock::where('product_id', $req['product_id'])
                ->where('warehouse_id', $warehouseId)
                ->first();

            $availableQty = $stock ? ($stock->quantity - $stock->reserved_quantity) : 0;

            if ($availableQty < $req['required_quantity']) {
                $available = false;
                $shortages[] = [
                    'product_id' => $req['product_id'],
                    'product_name' => $req['product_name'],
                    'required' => $req['required_quantity'],
                    'available' => $availableQty,
                    'shortage' => $req['required_quantity'] - $availableQty
                ];
            }
        }

        return [
            'available' => $available,
            'shortages' => $shortages
        ];
    }

    private function validateOrderStock($order)
    {
        $requirements = [];
        foreach ($order->items as $item) {
            $requirements[] = [
                'product_id' => $item->raw_material_id,
                'product_name' => $item->rawMaterial->name ?? 'Unknown',
                'required_quantity' => $item->required_quantity
            ];
        }

        return $this->validateStockAvailability($requirements, $order->warehouse_id);
    }

    private function reserveStock($productId, $warehouseId, $quantity)
    {
        $stock = ProductStock::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        if ($stock) {
            $stock->increment('reserved_quantity', $quantity);
        }
    }

    private function consumeStock($productId, $warehouseId, $quantity)
    {
        $stock = ProductStock::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        if ($stock) {
            $stock->decrement('quantity', $quantity);
            $stock->decrement('reserved_quantity', $quantity);
            $stock->update(['last_issued_date' => now()]);
        }
    }

    private function addToStock($productId, $warehouseId, $quantity, $batchNumber = null)
    {
        $stock = ProductStock::firstOrCreate(
            [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId
            ],
            [
                'quantity' => 0,
                'created_by' => Auth::id()
            ]
        );

        $stock->increment('quantity', $quantity);
        $stock->update(['last_received_date' => now()]);

        // Create batch if batch number provided
        if ($batchNumber) {
            DB::table('product_batches')->insert([
                'id' => Str::uuid(),
                'batch_number' => $batchNumber,
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'initial_quantity' => $quantity,
                'current_quantity' => $quantity,
                'manufacture_date' => now(),
                'status' => 'ACTIVE',
                'created_by' => Auth::id(),
                'created_at' => now()
            ]);
        }
    }

    private function updateOrderCosts($order)
    {
        $materialCost = ManufacturingOrderItem::where('manufacturing_order_id', $order->id)
            ->sum('total_cost');

        $order->update([
            'material_cost' => $materialCost,
            'total_cost' => $materialCost + ($order->labor_cost ?? 0) + ($order->overhead_cost ?? 0)
        ]);
    }

    private function calculateActualCost($order)
    {
        $materialCost = ManufacturingOrderItem::where('manufacturing_order_id', $order->id)
            ->sum(DB::raw('consumed_quantity * unit_cost'));

        return $materialCost + ($order->labor_cost ?? 0) + ($order->overhead_cost ?? 0);
    }

    private function updateProductAverageCost($productId, $quantity, $totalCost)
    {
        $product = Product::find($productId);
        if ($product) {
            $currentValue = $product->current_stock * $product->average_cost;
            $newValue = $currentValue + $totalCost;
            $newQuantity = $product->current_stock + $quantity;

            $newAvgCost = $newQuantity > 0 ? $newValue / $newQuantity : 0;

            $product->update([
                'average_cost' => $newAvgCost,
                'current_stock' => $newQuantity
            ]);
        }
    }
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('manufacturing.order.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit manufacturing order'
            ], 403);
        }
        $order = ManufacturingOrder::findOrFail($id);

        // Validate based on current status
        $rules = [
            'priority' => 'in:LOW,NORMAL,HIGH,URGENT',
            'scheduled_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ];

        // Additional fields allowed only in DRAFT status
        if ($order->status === 'DRAFT') {
            $rules['quantity_to_produce'] = 'numeric|min:0.001';
            $rules['quality_check_required'] = 'boolean';
            $rules['labor_cost'] = 'numeric|min:0';
            $rules['overhead_cost'] = 'numeric|min:0';
        }

        $validated = $request->validate($rules);

        DB::beginTransaction();
        try {
            // Update allowed fields based on status
            $updateData = [];

            // These fields can be updated in any status (except COMPLETED/CANCELLED)
            if (!in_array($order->status, ['COMPLETED', 'CANCELLED'])) {
                if (isset($validated['priority'])) {
                    $updateData['priority'] = $validated['priority'];
                }
                if (isset($validated['scheduled_date'])) {
                    $updateData['scheduled_date'] = $validated['scheduled_date'];
                }
                if (isset($validated['notes'])) {
                    $updateData['notes'] = $validated['notes'];
                }
            }

            // Additional fields for DRAFT status only
            if ($order->status === 'DRAFT') {
                if (
                    isset($validated['quantity_to_produce']) &&
                    $validated['quantity_to_produce'] != $order->quantity_to_produce
                ) {

                    // Recalculate material requirements
                    $bomMaster = BomMaster::with('details')->findOrFail($order->bom_master_id);
                    $ratio = $validated['quantity_to_produce'] / $bomMaster->output_quantity;

                    // Update order items
                    foreach ($order->items as $item) {
                        $bomDetail = $bomMaster->details->where('raw_material_id', $item->raw_material_id)->first();
                        if ($bomDetail) {
                            $item->update([
                                'required_quantity' => $bomDetail->quantity * $ratio,
                                'total_cost' => ($bomDetail->quantity * $ratio) * $item->unit_cost
                            ]);
                        }
                    }

                    $updateData['quantity_to_produce'] = $validated['quantity_to_produce'];
                }

                if (isset($validated['quality_check_required'])) {
                    $updateData['quality_check_required'] = $validated['quality_check_required'];
                }
                if (isset($validated['labor_cost'])) {
                    $updateData['labor_cost'] = $validated['labor_cost'];
                }
                if (isset($validated['overhead_cost'])) {
                    $updateData['overhead_cost'] = $validated['overhead_cost'];
                }
            }

            // Update order
            $order->update($updateData);

            // Recalculate total cost
            if ($order->status === 'DRAFT') {
                $this->updateOrderCosts($order);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order updated successfully',
                'data' => $order->fresh()->load(['product', 'bomMaster', 'items.rawMaterial', 'warehouse'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel manufacturing order
     */
    public function cancelOrder(Request $request, $id)
    {
        $validated = $request->validate([
            'cancellation_reason' => 'required|string'
        ]);

        $order = ManufacturingOrder::findOrFail($id);

        if (in_array($order->status, ['COMPLETED', 'CANCELLED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel a completed or already cancelled order'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // If order was validated or in progress, release reserved/consumed materials
            if (in_array($order->status, ['VALIDATED', 'IN_PROGRESS'])) {
                foreach ($order->items as $item) {
                    if ($item->status === 'RESERVED') {
                        // Release reserved stock
                        $stock = ProductStock::where('product_id', $item->raw_material_id)
                            ->where('warehouse_id', $order->warehouse_id)
                            ->first();

                        if ($stock) {
                            $stock->decrement('reserved_quantity', $item->required_quantity);
                        }
                    }

                    // Update item status
                    $item->update(['status' => 'CANCELLED']);
                }
            }

            // Update order
            $order->update([
                'status' => 'CANCELLED',
                'cancellation_reason' => $validated['cancellation_reason'],
                'cancelled_by' => Auth::id(),
                'cancelled_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully',
                'data' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Perform quality check on manufacturing order
     */
    public function qualityCheck(Request $request, $id)
    {
        $validated = $request->validate([
            'quality_status' => 'required|in:PASSED,FAILED',
            'quality_notes' => 'nullable|string'
        ]);

        $order = ManufacturingOrder::findOrFail($id);

        if ($order->status !== 'IN_PROGRESS') {
            return response()->json([
                'success' => false,
                'message' => 'Quality check can only be performed on in-progress orders'
            ], 422);
        }

        if (!$order->quality_check_required) {
            return response()->json([
                'success' => false,
                'message' => 'Quality check is not required for this order'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $order->update([
                'quality_status' => $validated['quality_status'],
                'quality_notes' => $validated['quality_notes'] ?? null,
                'quality_checked_by' => Auth::id(),
                'quality_checked_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Quality check completed',
                'data' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to perform quality check',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Delete manufacturing order (only DRAFT or CANCELLED orders can be deleted)
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('manufacturing.order.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete manufacturing order'
            ], 403);
        }
        $order = ManufacturingOrder::findOrFail($id);

        // Only allow deletion of DRAFT or CANCELLED orders
        if (!in_array($order->status, ['DRAFT', 'CANCELLED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft or cancelled orders can be deleted. Please cancel the order first.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Delete related order items first
            ManufacturingOrderItem::where('manufacturing_order_id', $order->id)->delete();

            // Delete the order
            $order->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete manufacturing order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get permissions for a specific user by their ID.
     *
     * @param  int  $userId
     * @return \Illuminate\Http\Response
     */
    public function getUserPermissions($userId)
    {

        $user = User::find($userId);


        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }


        $permissions = $this->assignPermissions($user);


        return response()->json([
            'success' => true,
            'data' => $permissions
        ]);
    }

    /**
     * Assign permissions based on user role.
     *
     * @param  User  $user
     * @return array
     */
    private function assignPermissions(User $user)
    {

        $user = Auth::user();
        $permissions = [
            'can_create_manufacturing_order' => $user->can('manufacturing.order.create'),
            'can_edit_manufacturing_order' => $user->can('manufacturing.order.edit'),
            'can_delete_manufacturing_order' => $user->can('manufacturing.order.delete'),
            'can_view_manufacturing_order' => $user->can('manufacturing.order.view'),
            'can_cancel_manufacturing_order' => $user->can('manufacturing.order.cancel'),
            'can_complete_manufacturing_order' => $user->can('manufacturing.order.complete'),
            'can_start_manufacturing_order' => $user->can('manufacturing.order.start'),
            'can_validate_manufacturing_order' => $user->can('manufacturing.order.validate'),
        ];
        return $permissions;
    }
}
