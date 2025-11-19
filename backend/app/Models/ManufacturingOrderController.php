<?php
// app/Http/Controllers/ManufacturingOrderController.php

namespace App\Http\Controllers;

use App\Models\ManufacturingOrder;
use App\Models\BomMaster;
use App\Models\ProductManufacturingSetting;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ManufacturingOrderController extends Controller
{
    /**
     * Get all manufacturing orders with filtering
     */
    public function index(Request $request)
    {
        try {
            $query = ManufacturingOrder::with([
                'product', 
                'bomMaster', 
                'warehouse', 
                'uom',
                'creator'
            ]);

            // Apply filters
            if ($request->status) {
                $query->where('status', $request->status);
            }

            if ($request->priority) {
                $query->where('priority', $request->priority);
            }

            if ($request->product_id) {
                $query->where('product_id', $request->product_id);
            }

            if ($request->warehouse_id) {
                $query->where('warehouse_id', $request->warehouse_id);
            }

            if ($request->scheduled_date) {
                $query->whereDate('scheduled_date', $request->scheduled_date);
            }

            if ($request->date_from && $request->date_to) {
                $query->whereBetween('scheduled_date', [$request->date_from, $request->date_to]);
            }

            if ($request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'LIKE', "%{$search}%")
                        ->orWhere('batch_number', 'LIKE', "%{$search}%")
                        ->orWhereHas('product', function ($q) use ($search) {
                            $q->where('name', 'LIKE', "%{$search}%");
                        });
                });
            }

            // Sorting
            $sortBy = $request->sort_by ?? 'created_at';
            $sortOrder = $request->sort_order ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->per_page ?? 15;
            $orders = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $orders
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch manufacturing orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single manufacturing order with details
     */
    public function show($id)
    {
        try {
            $order = ManufacturingOrder::with([
                'bomMaster.details.rawMaterial',
                'bomMaster.details.uom',
                'product',
                'warehouse',
                'uom',
                'items.rawMaterial',
                'items.uom',
                'stockReservations.product',
                'creator',
                'validator',
                'starter',
                'completer',
                'canceller',
                'qualityChecker'
            ])->findOrFail($id);

            // Add computed properties
            $order->can_edit = $order->canBeEdited();
            $order->can_validate = $order->canBeValidated();
            $order->can_start = $order->canBeStarted();
            $order->can_complete = $order->canBeCompleted();
            $order->can_cancel = $order->canBeCancelled();

            return response()->json([
                'success' => true,
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Manufacturing order not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new manufacturing order
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'bom_master_id' => 'required|exists:bom_masters,id',
            'quantity_to_produce' => 'required|numeric|min:0.001',
            'warehouse_id' => 'required|exists:warehouses,id',
            'priority' => 'nullable|in:LOW,NORMAL,HIGH,URGENT',
            'scheduled_date' => 'nullable|date|after_or_equal:today',
            'quality_check_required' => 'nullable|boolean',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Get BOM details
            $bomMaster = BomMaster::findOrFail($request->bom_master_id);
            
            // Check if BOM is active
            if ($bomMaster->status !== 'ACTIVE') {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected BOM is not active'
                ], 400);
            }

            // Get manufacturing settings
            $manufacturingSetting = ProductManufacturingSetting::where('product_id', $bomMaster->product_id)->first();

            // Create manufacturing order
            $order = ManufacturingOrder::create([
                'bom_master_id' => $request->bom_master_id,
                'product_id' => $bomMaster->product_id,
                'quantity_to_produce' => $request->quantity_to_produce,
                'uom_id' => $bomMaster->output_uom_id,
                'warehouse_id' => $request->warehouse_id,
                'status' => ManufacturingOrder::STATUS_DRAFT,
                'priority' => $request->priority ?? ManufacturingOrder::PRIORITY_NORMAL,
                'scheduled_date' => $request->scheduled_date ?? now()->format('Y-m-d'),
                'quality_check_required' => $request->quality_check_required ?? 
                    ($manufacturingSetting ? $manufacturingSetting->requires_quality_check : false),
                'notes' => $request->notes,
                'created_by' => auth()->id()
            ]);

            // Calculate costs from BOM
            $order->calculateCostsFromBom();
            $order->save();

            // Create order items from BOM
            $order->createItemsFromBom();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order created successfully',
                'data' => $order->load(['items', 'product', 'warehouse'])
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
     * Update manufacturing order (only for draft status)
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'quantity_to_produce' => 'required|numeric|min:0.001',
            'warehouse_id' => 'required|exists:warehouses,id',
            'priority' => 'nullable|in:LOW,NORMAL,HIGH,URGENT',
            'scheduled_date' => 'nullable|date|after_or_equal:today',
            'quality_check_required' => 'nullable|boolean',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);

            if (!$order->canBeEdited()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order can only be edited in draft status'
                ], 400);
            }

            // Update order
            $order->quantity_to_produce = $request->quantity_to_produce;
            $order->warehouse_id = $request->warehouse_id;
            $order->priority = $request->priority ?? $order->priority;
            $order->scheduled_date = $request->scheduled_date ?? $order->scheduled_date;
            $order->quality_check_required = $request->quality_check_required ?? $order->quality_check_required;
            $order->notes = $request->notes;

            // Recalculate costs
            $order->calculateCostsFromBom();
            $order->save();

            // Delete and recreate items
            $order->items()->delete();
            $order->createItemsFromBom();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Manufacturing order updated successfully',
                'data' => $order->load(['items', 'product', 'warehouse'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update manufacturing order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete manufacturing order (only draft status)
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);

            if ($order->status !== ManufacturingOrder::STATUS_DRAFT) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only draft orders can be deleted'
                ], 400);
            }

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
     * Check stock availability for manufacturing order
     */
    public function checkAvailability($id)
    {
        try {
            $order = ManufacturingOrder::findOrFail($id);
            $availability = $order->checkStockAvailability();

            return response()->json([
                'success' => true,
                'data' => $availability
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check stock availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate manufacturing order
     */
    public function validateOrder($id)
    {
        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);
            $result = $order->validate(auth()->id());

            if ($result['success']) {
                DB::commit();
                return response()->json([
                    'success' => true,
                    'message' => 'Order validated successfully',
                    'data' => $order->fresh()->load(['items', 'stockReservations'])
                ]);
            } else {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => $result['messages'][0] ?? 'Validation failed',
                    'shortages' => $result['shortages'] ?? []
                ], 400);
            }
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to validate order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start manufacturing
     */
    public function startManufacturing($id)
    {
        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);
            $result = $order->startManufacturing(auth()->id());

            if ($result['success']) {
                DB::commit();
                return response()->json([
                    'success' => true,
                    'message' => 'Manufacturing started successfully',
                    'data' => $order->fresh()
                ]);
            } else {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => $result['messages'][0] ?? 'Failed to start manufacturing'
                ], 400);
            }
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
     * Complete manufacturing
     */
    public function completeManufacturing(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'actual_quantity_produced' => 'nullable|numeric|min:0.001'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);
            
            $actualQuantity = $request->actual_quantity_produced ?? $order->quantity_to_produce;
            $result = $order->completeManufacturing($actualQuantity, auth()->id());

            if ($result['success']) {
                DB::commit();
                return response()->json([
                    'success' => true,
                    'message' => 'Manufacturing completed successfully',
                    'data' => $order->fresh(),
                    'stock_movements' => $result['stock_movements']
                ]);
            } else {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => $result['messages'][0] ?? 'Failed to complete manufacturing'
                ], 400);
            }
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
     * Cancel manufacturing order
     */
    public function cancelOrder(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'cancellation_reason' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $order = ManufacturingOrder::findOrFail($id);
            $result = $order->cancelOrder($request->cancellation_reason, auth()->id());

            if ($result['success']) {
                DB::commit();
                return response()->json([
                    'success' => true,
                    'message' => 'Order cancelled successfully',
                    'data' => $order->fresh()
                ]);
            } else {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => $result['messages'][0] ?? 'Failed to cancel order'
                ], 400);
            }
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
     * Perform quality check
     */
    public function qualityCheck(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'quality_status' => 'required|in:PASSED,FAILED',
            'quality_notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = ManufacturingOrder::findOrFail($id);

            if ($order->status !== ManufacturingOrder::STATUS_IN_PROGRESS) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quality check can only be performed on orders in progress'
                ], 400);
            }

            $order->performQualityCheck(
                $request->quality_status,
                $request->quality_notes,
                auth()->id()
            );

            return response()->json([
                'success' => true,
                'message' => 'Quality check performed successfully',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to perform quality check',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard(Request $request)
    {
        try {
            $stats = [
                'total_orders' => ManufacturingOrder::count(),
                'draft_orders' => ManufacturingOrder::where('status', ManufacturingOrder::STATUS_DRAFT)->count(),
                'validated_orders' => ManufacturingOrder::where('status', ManufacturingOrder::STATUS_VALIDATED)->count(),
                'in_progress_orders' => ManufacturingOrder::where('status', ManufacturingOrder::STATUS_IN_PROGRESS)->count(),
                'completed_orders' => ManufacturingOrder::where('status', ManufacturingOrder::STATUS_COMPLETED)->count(),
                'cancelled_orders' => ManufacturingOrder::where('status', ManufacturingOrder::STATUS_CANCELLED)->count(),
                'overdue_orders' => ManufacturingOrder::overdue()->count(),
                'today_scheduled' => ManufacturingOrder::scheduledFor(now()->format('Y-m-d'))->count(),
            ];

            // Recent orders
            $recentOrders = ManufacturingOrder::with(['product', 'warehouse'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            // Orders by priority
            $ordersByPriority = ManufacturingOrder::active()
                ->select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'statistics' => $stats,
                    'recent_orders' => $recentOrders,
                    'orders_by_priority' => $ordersByPriority
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

    /**
     * Get warehouses list
     */
    public function getWarehouses()
    {
        try {
            $warehouses = Warehouse::where('is_active', true)
                ->select('id', 'warehouse_name', 'warehouse_code')
                ->get();

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
     * Get active BOMs for dropdown
     */
    public function getActiveBoms()
    {
        try {
            $boms = BomMaster::with(['product', 'outputUom'])
                ->where('status', 'ACTIVE')
                ->get()
                ->map(function ($bom) {
                    return [
                        'id' => $bom->id,
                        'bom_code' => $bom->bom_code,
                        'bom_name' => $bom->bom_name,
                        'product_id' => $bom->product_id,
                        'product_name' => $bom->product->name,
                        'output_quantity' => $bom->output_quantity,
                        'output_uom' => $bom->outputUom->uom_short,
                        'total_cost' => $bom->total_cost
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
}