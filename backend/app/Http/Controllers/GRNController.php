<?php
// app/Http/Controllers/GRNController.php

namespace App\Http\Controllers;

use App\Models\GRN;
use App\Models\GRNItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseInvoice;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\StockUpdateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\User;


class GRNController extends Controller
{
    protected $stockService;

    public function __construct(StockUpdateService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * List all GRNs with filters
     */
    public function index(Request $request)
    {
        $query = GRN::with(['supplier', 'purchaseOrder', 'invoice', 'warehouse', 'creator'])
            ->orderBy('grn_date', 'desc');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('grn_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('grn_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('grn_number', 'like', "%{$search}%")
                    ->orWhere('delivery_challan_no', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $request->get('per_page', 50);
        $grns = $query->paginate($perPage);

        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        return response()->json([
            'success' => true,
            'data' => $grns,
            'permissions' => $permissions
        ]);
    }


    /**
     * Get single GRN details
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        $grn = GRN::with([
            'supplier',
            'purchaseOrder',
            'invoice',
            'warehouse',
            'items.product',
            'items.uom',
            'items.warehouse',
            'qualityChecker',
            'creator'
        ])->find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $grn,
            'permissions' => $permissions
        ]);
    }

    /**
     * Create new GRN
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('grn.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create grn'
            ], 403);
        }
        $request->validate([
            'grn_type' => 'required|in:DIRECT,PO_BASED',
            'po_id' => 'nullable|required_if:grn_type,PO_BASED|exists:purchase_orders,id',
            'invoice_id' => 'nullable|exists:purchase_invoices,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'grn_date' => 'required|date',
            'delivery_challan_no' => 'nullable|string|max:100',
            'delivery_date' => 'nullable|date',
            'vehicle_number' => 'nullable|string|max:50',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.received_quantity' => 'required|numeric|min:0',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.warehouse_id' => 'required|exists:warehouses,id',
        ]);

        // Validate that accepted quantity doesn't exceed received quantity
        foreach ($request->items as $item) {
            if ($item['accepted_quantity'] > $item['received_quantity']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accepted quantity cannot exceed received quantity'
                ], 400);
            }
        }

        DB::beginTransaction();

        try {
            // Generate GRN number
            $grnNumber = $this->generateGRNNumber();

            // Create GRN
            $grn = GRN::create([
                'grn_number' => $grnNumber,
                'grn_date' => $request->grn_date,
                'grn_type' => $request->grn_type,
                'po_id' => $request->po_id,
                'invoice_id' => $request->invoice_id,
                'supplier_id' => $request->supplier_id,
                'delivery_challan_no' => $request->delivery_challan_no,
                'delivery_date' => $request->delivery_date,
                'vehicle_number' => $request->vehicle_number,
                'quality_check_done' => $request->quality_check_done ?? false,
                'quality_check_by' => Auth::id(),
                'quality_check_date' => $request->quality_check_date,
                'quality_check_notes' => $request->quality_check_notes,
                'status' => 'DRAFT',
                'warehouse_id' => $request->warehouse_id,
                'notes' => $request->notes,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            // Create GRN items
            foreach ($request->items as $index => $item) {
                $rejectedQuantity = $item['received_quantity'] - $item['accepted_quantity'];

                GRNItem::create([
                    'grn_id' => $grn->id,
                    'po_item_id' => $item['po_item_id'] ?? null,
                    'product_id' => $item['product_id'],
                    'description' => $item['description'] ?? null,
                    'ordered_quantity' => $item['ordered_quantity'] ?? null,
                    'received_quantity' => $item['received_quantity'],
                    'accepted_quantity' => $item['accepted_quantity'],
                    'rejected_quantity' => $rejectedQuantity,
                    'over_delivery_tolerance' => $item['over_delivery_tolerance'] ?? 0,
                    'is_over_delivery' => $item['is_over_delivery'] ?? false,
                    'rejection_reason' => $item['rejection_reason'] ?? null,
                    'condition_on_receipt' => $item['condition_on_receipt'] ?? 'GOOD',
                    'uom_id' => $item['uom_id'] ?? null,
                    'unit_price' => $item['unit_price'] ?? null,
                    'batch_number' => $item['batch_number'] ?? null,
                    'manufacture_date' => $item['manufacture_date'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'serial_numbers' => isset($item['serial_numbers']) ? json_encode($item['serial_numbers']) : null,
                    'warranty_period_months' => $item['warranty_period_months'] ?? null,
                    'warranty_end_date' => $item['warranty_end_date'] ?? null,
                    'warehouse_id' => $item['warehouse_id'],
                    'rack_location' => $item['rack_location'] ?? null,
                    'sort_order' => $index,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN created successfully',
                'data' => $grn
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete GRN and update stock
     */
    public function complete(Request $request, $id)
    {
        $grn = GRN::with('items')->find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        if ($grn->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft GRNs can be completed'
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Update GRN status
            $grn->update([
                'status' => 'COMPLETED',
                'updated_by' => Auth::id()
            ]);

            // Process each item for stock update
            foreach ($grn->items as $item) {
                if ($item->accepted_quantity > 0) {
                    // Create stock movement
                    $this->stockService->createStockMovement([
                        'product_id' => $item->product_id,
                        'warehouse_id' => $item->warehouse_id,
                        'movement_type' => 'IN',
                        'movement_reason' => 'GRN',
                        'reference_type' => 'grn',
                        'reference_id' => $grn->id,
                        'quantity' => $item->accepted_quantity,
                        'unit_price' => $item->unit_price,
                        'batch_number' => $item->batch_number,
                        'expiry_date' => $item->expiry_date,
                        'serial_numbers' => $item->serial_numbers,
                        'notes' => 'GRN: ' . $grn->grn_number,
                        'movement_number' => $this->generateMovementNumber(),
                    ]);

                    // Update product stock
                    $this->stockService->updateProductStock(
                        $item->product_id,
                        $item->warehouse_id,
                        $item->accepted_quantity,
                        'add'
                    );
                }
            }

            // Update PO status if linked
            if ($grn->po_id) {
                $this->updatePOStatus($grn->po_id, $grn->items);
            }

            // Update Invoice GRN status if linked
            if ($grn->invoice_id) {
                $this->updateInvoiceGRNStatus($grn->invoice_id);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN completed and stock updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update PO status based on GRN
     */
    private function updatePOStatus($poId, $grnItems)
    {
        $po = PurchaseOrder::with('items')->find($poId);
        if (!$po) return;

        // Update PO item received quantities
        foreach ($grnItems as $grnItem) {
            if ($grnItem->po_item_id) {
                $poItem = $po->items->where('id', $grnItem->po_item_id)->first();
                if ($poItem) {
                    $newReceivedQty = $poItem->received_quantity + $grnItem->accepted_quantity;
                    $poItem->update([
                        'received_quantity' => $newReceivedQty,
                        'status' => $newReceivedQty >= $poItem->quantity ? 'RECEIVED' : 'PARTIAL_RECEIVED'
                    ]);
                }
            }
        }

        // Check overall PO status
        $allReceived = true;
        $anyReceived = false;

        foreach ($po->items as $item) {
            if ($item->item_type === 'product') {
                if ($item->received_quantity >= $item->quantity) {
                    $anyReceived = true;
                } else {
                    $allReceived = false;
                }
            }
        }

        // Update PO status
        if ($allReceived) {
            $po->update([
                'grn_status' => 'RECEIVED',
                'status' => 'RECEIVED'
            ]);
        } elseif ($anyReceived) {
            $po->update([
                'grn_status' => 'PARTIAL',
                'status' => 'PARTIAL_RECEIVED'
            ]);
        }
    }

    /**
     * Update Invoice GRN status
     */
    private function updateInvoiceGRNStatus($invoiceId)
    {
        $invoice = PurchaseInvoice::with('items')->find($invoiceId);
        if (!$invoice) return;

        // Check if all product items have been received
        $allProductsReceived = true;
        $grns = GRN::where('invoice_id', $invoiceId)
            ->where('status', 'COMPLETED')
            ->with('items')
            ->get();

        foreach ($invoice->items as $invoiceItem) {
            if ($invoiceItem->item_type === 'product') {
                $totalReceived = 0;

                foreach ($grns as $grn) {
                    $grnItems = $grn->items->where('product_id', $invoiceItem->product_id);
                    foreach ($grnItems as $grnItem) {
                        $totalReceived += $grnItem->accepted_quantity;
                    }
                }

                if ($totalReceived < $invoiceItem->quantity) {
                    $allProductsReceived = false;
                    break;
                }
            }
        }

        $invoice->update([
            'grn_status' => $allProductsReceived ? 'COMPLETED' : 'PARTIAL'
        ]);
    }

    /**
     * Cancel GRN
     */
    public function cancel(Request $request, $id)
    {
        $grn = GRN::with('items')->find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        if ($grn->status === 'CANCELLED') {
            return response()->json([
                'success' => false,
                'message' => 'GRN is already cancelled'
            ], 400);
        }

        if ($grn->status === 'COMPLETED') {
            return response()->json([
                'success' => false,
                'message' => 'Completed GRNs cannot be cancelled. Please create a return instead.'
            ], 400);
        }

        DB::beginTransaction();

        try {
            $grn->update([
                'status' => 'CANCELLED',
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN cancelled successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Perform quality check
     */
    public function qualityCheck(Request $request, $id)
    {
        $request->validate([
            'quality_check_notes' => 'required|string',
            'items' => 'required|array',
            'items.*.id' => 'required|exists:grn_items,id',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.condition_on_receipt' => 'required|in:GOOD,DAMAGED,EXPIRED',
            'items.*.rejection_reason' => 'nullable|string'
        ]);

        $grn = GRN::with('items')->find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        if ($grn->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Quality check can only be performed on draft GRNs'
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Update GRN quality check info
            $grn->update([
                'quality_check_done' => true,
                'quality_check_by' => Auth::id(),
                'quality_check_date' => now(),
                'quality_check_notes' => $request->quality_check_notes,
                'updated_by' => Auth::id()
            ]);

            // Update item quality check results
            foreach ($request->items as $itemData) {
                $item = $grn->items->where('id', $itemData['id'])->first();

                if ($item) {
                    $rejectedQty = $item->received_quantity - $itemData['accepted_quantity'];

                    $item->update([
                        'accepted_quantity' => $itemData['accepted_quantity'],
                        'rejected_quantity' => $rejectedQty,
                        'condition_on_receipt' => $itemData['condition_on_receipt'],
                        'rejection_reason' => $itemData['rejection_reason'] ?? null
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Quality check completed successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete quality check',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique GRN number
     */
    private function generateGRNNumber()
    {
        $year = date('Y');
        $lastGRN = GRN::whereYear('created_at', $year)
            ->orderBy('grn_number', 'desc')
            ->first();

        if ($lastGRN) {
            preg_match('/(\d+)$/', $lastGRN->grn_number, $matches);
            $nextNumber = isset($matches[1]) ? intval($matches[1]) + 1 : 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf('GRN/%s/%03d', $year, $nextNumber);
    }

    /**
     * Get pending GRNs for PO
     */
    public function getPendingForPO($poId)
    {
        $po = PurchaseOrder::with(['items' => function ($query) {
            $query->where('item_type', 'product');
        }])->find($poId);

        if (!$po) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        $pendingItems = [];

        foreach ($po->items as $item) {
            $pendingQty = $item->quantity - $item->received_quantity;

            if ($pendingQty > 0) {
                $pendingItems[] = [
                    'po_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name ?? $item->description,
                    'ordered_quantity' => $item->quantity,
                    'received_quantity' => $item->received_quantity,
                    'pending_quantity' => $pendingQty,
                    'uom' => $item->uom->name ?? 'Unit'
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'po_number' => $po->po_number,
                'supplier' => $po->supplier->name,
                'items' => $pendingItems
            ]
        ]);
    }
    protected function generateMovementNumber()
    {
        return 'SM/' . date('Y') . '/' . Str::upper(Str::random(5));
    }
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('grn.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit grn'
            ], 403);
        }
        $grn = GRN::find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        // Only draft GRNs can be updated
        if ($grn->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft GRNs can be updated'
            ], 400);
        }

        $request->validate([
            'grn_type' => 'required|in:DIRECT,PO_BASED',
            'po_id' => 'nullable|required_if:grn_type,PO_BASED|exists:purchase_orders,id',
            'invoice_id' => 'nullable|exists:purchase_invoices,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'grn_date' => 'required|date',
            'delivery_challan_no' => 'nullable|string|max:100',
            'delivery_date' => 'nullable|date',
            'vehicle_number' => 'nullable|string|max:50',
            'quality_check_done' => 'boolean',
            'quality_check_date' => 'nullable|date',
            'quality_check_notes' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.received_quantity' => 'required|numeric|min:0',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.warehouse_id' => 'required|exists:warehouses,id',
            'items.*.batch_number' => 'nullable|string|max:100',
            'items.*.expiry_date' => 'nullable|date',
            'items.*.condition_on_receipt' => 'required|in:GOOD,DAMAGED,EXPIRED',
            'items.*.rejection_reason' => 'nullable|string',
            'items.*.rack_location' => 'nullable|string|max:100',
            'items.*.serial_numbers' => 'nullable|array',
            'items.*.warranty_period_months' => 'nullable|integer|min:0',
            'items.*.warranty_end_date' => 'nullable|date',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.uom_id' => 'nullable|exists:uoms,id',
        ]);

        // Validate that accepted quantity doesn't exceed received quantity
        foreach ($request->items as $item) {
            if ($item['accepted_quantity'] > $item['received_quantity']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accepted quantity cannot exceed received quantity'
                ], 400);
            }
        }

        DB::beginTransaction();

        try {
            // Update GRN header
            $grn->update([
                'grn_date' => $request->grn_date,
                'grn_type' => $request->grn_type,
                'po_id' => $request->po_id,
                'invoice_id' => $request->invoice_id,
                'supplier_id' => $request->supplier_id,
                'warehouse_id' => $request->warehouse_id,
                'delivery_challan_no' => $request->delivery_challan_no,
                'delivery_date' => $request->delivery_date,
                'vehicle_number' => $request->vehicle_number,
                'quality_check_done' => $request->quality_check_done ?? false,
                'quality_check_by' => $request->quality_check_done ? Auth::id() : null,
                'quality_check_date' => $request->quality_check_date,
                'quality_check_notes' => $request->quality_check_notes,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
            ]);

            // Get existing item IDs
            $existingItemIds = $grn->items->pluck('id')->toArray();
            $updatedItemIds = [];

            // Update or create GRN items
            foreach ($request->items as $index => $itemData) {
                $rejectedQuantity = $itemData['received_quantity'] - $itemData['accepted_quantity'];

                $itemArray = [
                    'grn_id' => $grn->id,
                    'po_item_id' => $itemData['po_item_id'] ?? null,
                    'product_id' => $itemData['product_id'],
                    'description' => $itemData['description'] ?? null,
                    'ordered_quantity' => $itemData['ordered_quantity'] ?? null,
                    'received_quantity' => $itemData['received_quantity'],
                    'accepted_quantity' => $itemData['accepted_quantity'],
                    'rejected_quantity' => $rejectedQuantity,
                    'over_delivery_tolerance' => $itemData['over_delivery_tolerance'] ?? 0,
                    'is_over_delivery' => $itemData['is_over_delivery'] ?? false,
                    'rejection_reason' => $itemData['rejection_reason'] ?? null,
                    'condition_on_receipt' => $itemData['condition_on_receipt'] ?? 'GOOD',
                    'uom_id' => $itemData['uom_id'] ?? null,
                    'unit_price' => $itemData['unit_price'] ?? null,
                    'batch_number' => $itemData['batch_number'] ?? null,
                    'manufacture_date' => $itemData['manufacture_date'] ?? null,
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                    'serial_numbers' => isset($itemData['serial_numbers']) ? json_encode($itemData['serial_numbers']) : null,
                    'warranty_period_months' => $itemData['warranty_period_months'] ?? null,
                    'warranty_end_date' => $itemData['warranty_end_date'] ?? null,
                    'warehouse_id' => $itemData['warehouse_id'],
                    'rack_location' => $itemData['rack_location'] ?? null,
                    'sort_order' => $index,
                    'notes' => $itemData['notes'] ?? null,
                ];

                if (isset($itemData['id']) && in_array($itemData['id'], $existingItemIds)) {
                    // Update existing item
                    GRNItem::where('id', $itemData['id'])->update($itemArray);
                    $updatedItemIds[] = $itemData['id'];
                } else {
                    // Create new item
                    $newItem = GRNItem::create($itemArray);
                    $updatedItemIds[] = $newItem->id;
                }
            }

            // Delete removed items
            $itemsToDelete = array_diff($existingItemIds, $updatedItemIds);
            if (!empty($itemsToDelete)) {
                GRNItem::whereIn('id', $itemsToDelete)->delete();
            }

            DB::commit();

            // Reload GRN with updated relationships
            $grn->load(['supplier', 'purchaseOrder', 'invoice', 'warehouse', 'items.product', 'items.uom']);

            return response()->json([
                'success' => true,
                'message' => 'GRN updated successfully',
                'data' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('GRN Update Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function destroy($id)
    {
         if (!Auth::user()->can('grn.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete grn'
            ], 403);
        }

        $grn = GRN::find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        // Only draft GRNs can be deleted
        if ($grn->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft GRNs can be deleted'
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Delete GRN items first
            $grn->items()->delete();

            // Delete GRN
            $grn->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function statistics(Request $request)
    {
        $stats = [
            'total' => GRN::count(),
            'draft' => GRN::where('status', 'DRAFT')->count(),
            'completed' => GRN::where('status', 'COMPLETED')->count(),
            'cancelled' => GRN::where('status', 'CANCELLED')->count(),
            'pending_quality_check' => GRN::where('status', 'DRAFT')
                ->where('quality_check_done', false)
                ->count(),
            'today' => GRN::whereDate('grn_date', today())->count(),
            'this_month' => GRN::whereMonth('grn_date', now()->month)
                ->whereYear('grn_date', now()->year)
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
    public function print($id)
    {
        $grn = GRN::with([
            'supplier',
            'purchaseOrder',
            'invoice',
            'warehouse',
            'items.product',
            'items.uom',
            'items.warehouse',
            'qualityChecker',
            'creator'
        ])->find($id);

        if (!$grn) {
            return response()->json([
                'success' => false,
                'message' => 'GRN not found'
            ], 404);
        }

        // You can return a view for printing or generate PDF
        // For now, returning the data in print-friendly format
        return response()->json([
            'success' => true,
            'data' => $grn,
            'print_url' => url("/print/grn/{$id}")
        ]);
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
            'can_create_grn' => $user->can('grn.create'),
            'can_edit_grn' => $user->can('grn.edit'),
            'can_delete_grn' => $user->can('grn.delete'),
            'can_view_grn' => $user->can('grn.view'),

        ];
        return $permissions;
    }
}
