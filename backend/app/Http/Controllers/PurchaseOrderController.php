<?php
// app/Http/Controllers/PurchaseOrderController.php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequest;
use App\Models\Supplier;
use App\Models\Service;
use App\Models\Product;
use App\Models\TaxMaster;

use App\Services\PurchaseApprovalService;
use App\Services\StockUpdateService;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\PurchaseRequestItemConversion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\PurchaseInvoiceController;

class PurchaseOrderController extends Controller
{
    protected $approvalService;
    protected $stockService;
    protected $invoiceController; // Add this

    public function __construct(
        PurchaseApprovalService $approvalService,
        StockUpdateService $stockService,
        PurchaseInvoiceController $invoiceController // Inject here
    ) {
        $this->approvalService = $approvalService;
        $this->stockService = $stockService;
        $this->invoiceController = $invoiceController; // Store reference
    }

    /**
     * List all purchase orders with filters
     */
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'creator', 'approver'])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('service_type_id')) {
            $query->where('service_type_id', $request->service_type_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('po_date', '>=', Carbon::parse($request->date_from)->format('Y-m-d'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('po_date', '<=', Carbon::parse($request->date_to)->format('Y-m-d'));
        }

        $orders = $query->paginate($request->per_page ?? 50);

        $user = Auth::user();

        $permissions = [
            'can_create_purchase_orders' => $user->can('purchase_orders.create'),
            'can_edit_purchase_orders' => $user->can('purchase_orders.edit'),
            'can_delete_purchase_orders' => $user->can('purchase_orders.delete'),
            'can_view_purchase_orders' => $user->can('purchase_orders.view'),
            'can_approve_purchase_orders' => $user->can('purchase_orders.approve'),
            'can_cancel_purchase_orders' => $user->can('purchase_orders.cancel'),
            'can_purchase_orders_grn_create' => $user->can('purchase_orders.grn.create'),
        ];
        return response()->json([
            'success' => true,
            'data' => $orders,
            'permissions' => $permissions
        ]);
    }


    /**
     * Get single purchase order details
     */
    public function show($id)
    {

        $user = Auth::user();

        $permissions = [
            'can_create_purchase_orders' => $user->can('purchase_orders.create'),
            'can_edit_purchase_orders' => $user->can('purchase_orders.edit'),
            'can_delete_purchase_orders' => $user->can('purchase_orders.delete'),
            'can_view_purchase_orders' => $user->can('purchase_orders.view'),
            'can_approve_purchase_orders' => $user->can('purchase_orders.approve'),
            'can_cancel_purchase_orders' => $user->can('purchase_orders.cancel'),
            'can_purchase_orders_grn_create' => $user->can('purchase_orders.grn.create'),

        ];
        $order = PurchaseOrder::with([
            'supplier',
            'items.product',
            'items.service',
            'items.uom',
            'items.tax',
            'purchaseRequest',
            'creator',
            'approver',
            'invoices',
            'grns'
        ])->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Add additional computed fields
        $order->pr_number = $order->purchaseRequest?->pr_number;
        $order->approved_by_name = $order->approver?->name;
        $order->created_by_name = $order->creator?->name;

        return response()->json([
            'success' => true,
            'data' => $order,
            'permissions' => $permissions
        ]);
    }

    /**
     * Create new purchase order
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('purchase_orders.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create purchase orders'
            ], 403);
        }
        // Pre-validate items existence
        foreach ($request->items as $index => $item) {
            if ($item['item_type'] === 'service' && isset($item['service_id'])) {
                $service = Service::find($item['service_id']);
                if (!$service) {
                    return response()->json([
                        'success' => false,
                        'message' => "Service with ID {$item['service_id']} not found. Please ensure services are created in the system.",
                        'errors' => [
                            "items.{$index}.service_id" => ["Service does not exist in the database."]
                        ]
                    ], 422);
                }
            }

            if ($item['item_type'] === 'product' && isset($item['product_id'])) {
                $product = Product::find($item['product_id']);
                if (!$product) {
                    return response()->json([
                        'success' => false,
                        'message' => "Product with ID {$item['product_id']} not found.",
                        'errors' => [
                            "items.{$index}.product_id" => ["Product does not exist in the database."]
                        ]
                    ], 422);
                }
            }
        }

        // Fixed validation rules - Laravel doesn't support wildcards with required_if properly
        $rules = [
            'supplier_id' => 'required|exists:suppliers,id',
            'delivery_date' => 'nullable|date|after:today',
            'items' => 'required|array|min:1',
        ];

        // Add dynamic validation rules for each item
        foreach ($request->items as $index => $item) {
            $rules["items.{$index}.item_type"] = 'required|in:product,service';
            $rules["items.{$index}.unit_price"] = 'required|numeric|min:0';
            $rules["items.{$index}.tax_id"] = 'nullable|exists:tax_master,id';


            if (isset($item['item_type'])) {
                if ($item['item_type'] === 'product') {

                    $rules["items.{$index}.product_id"] = 'required|exists:products,id';
                    $rules["items.{$index}.service_id"] = 'nullable';
                    $rules["items.{$index}.quantity"] = 'required|numeric|min:0.001';
                    $rules["items.{$index}.uom_id"] = 'required|exists:uoms,id';
                } elseif ($item['item_type'] === 'service') {

                    $rules["items.{$index}.service_id"] = 'required|exists:services,id';
                    $rules["items.{$index}.product_id"] = 'nullable';
                    $rules["items.{$index}.quantity"] = 'nullable|numeric|min:0.001';
                    $rules["items.{$index}.uom_id"] = 'nullable|exists:uoms,id';
                }
            }
        }

        $request->validate($rules, [
            'items.*.product_id.required' => 'Product is required for product type items.',
            'items.*.product_id.exists' => 'Selected product does not exist.',
            'items.*.service_id.required' => 'Service is required for service type items.',
            'items.*.service_id.exists' => 'Selected service does not exist.',
            'items.*.quantity.required' => 'Quantity is required for products.',
            'items.*.uom_id.required' => 'Unit of measure is required for products.',
            'items.*.uom_id.exists' => 'Selected UOM does not exist.',
        ]);

        DB::beginTransaction();

        try {
            // Generate PO number
            $poNumber = $this->generatePONumber();

            // Calculate totals
            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            foreach ($request->items as $item) {
                // For services, default quantity to 1 if not provided
                $quantity = $item['item_type'] === 'service' && !isset($item['quantity']) ? 0 : $item['quantity'];

                $itemSubtotal = $quantity * $item['unit_price'];
                $taxAmount = ($item['tax_percent'] ?? 0) / 100 * $itemSubtotal;
                $discountAmount = $item['discount_amount'] ?? 0;

                $subtotal += $itemSubtotal;
                $totalTax += $taxAmount;
                $totalDiscount += $discountAmount;
            }

            $totalAmount = $subtotal + $totalTax - $totalDiscount +
                ($request->shipping_charges ?? 0) +
                ($request->other_charges ?? 0);

            // Create PO
            $order = PurchaseOrder::create([
                'po_number' => $poNumber,
                'po_date' => now()->toDateString(),
                'supplier_id' => $request->supplier_id,
                'pr_id' => $request->pr_id ?? null,
                'quotation_ref' => $request->quotation_ref,
                'delivery_date' => $request->delivery_date,
                'delivery_address' => $request->delivery_address,
                'shipping_method' => $request->shipping_method,
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'shipping_charges' => $request->shipping_charges ?? 0,
                'other_charges' => $request->other_charges ?? 0,
                'discount_amount' => $totalDiscount,
                'total_amount' => $totalAmount,
                'payment_terms' => $request->payment_terms,
                'payment_due_date' => $request->payment_due_date,
                'status' => $request->status ?? 'DRAFT',
                'terms_conditions' => $request->terms_conditions,
                'internal_notes' => $request->internal_notes,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            // Create PO items
            foreach ($request->items as $index => $item) {
                // Handle quantity for services vs products
                $quantity = $item['item_type'] === 'service' && !isset($item['quantity']) ? 0 : $item['quantity'];

                $itemSubtotal = $quantity * $item['unit_price'];
                $taxAmount = ($item['tax_percent'] ?? 0) / 100 * $itemSubtotal;
                $discountAmount = $item['discount_amount'] ?? 0;
                $itemTotal = $itemSubtotal + $taxAmount - $discountAmount;

                PurchaseOrderItem::create([
                    'po_id' => $order->id,
                    'item_type' => $item['item_type'],
                    'product_id' => $item['item_type'] === 'product' ? $item['product_id'] : null,
                    'service_id' => $item['item_type'] === 'service' ? $item['service_id'] : null,
                    'description' => $item['description'] ?? null,
                    'quantity' => $quantity,
                    'uom_id' => $item['item_type'] === 'product' ? $item['uom_id'] : null, // Only store UOM for products
                    'unit_price' => $item['unit_price'],
                    'tax_id' => $item['tax_id'] ?? null,
                    'tax_percent' => $item['tax_percent'] ?? 0,
                    'tax_amount' => $taxAmount,
                    'discount_type' => $item['discount_type'] ?? 'amount',
                    'discount_value' => $item['discount_value'] ?? 0,
                    'discount_amount' => $discountAmount,
                    'subtotal' => $itemSubtotal,
                    'total_amount' => $itemTotal,
                    'sort_order' => $index,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();

            // Load relationships for response
            $order->load(['items.product', 'items.service', 'supplier']);

            return response()->json([
                'success' => true,
                'message' => 'Purchase Order created successfully',
                'data' => $order
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();

            \Log::error('PO Creation Failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create Purchase Order',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Update purchase order
     */
    public function update(Request $request, $id)
    {

        if (!Auth::user()->can('purchase_orders.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit purchase orders'
            ], 403);
        }
        $order = PurchaseOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Only draft POs can be edited
        if ($order->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft Purchase Orders can be edited'
            ], 400);
        }

        // Validation rules
        $rules = [
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'delivery_date' => 'nullable|date|after:today',
            'items' => 'sometimes|array|min:1',
        ];

        // Add dynamic validation for items if they are provided
        if ($request->has('items')) {
            foreach ($request->items as $index => $item) {
                $rules["items.{$index}.item_type"] = 'required|in:product,service';
                $rules["items.{$index}.unit_price"] = 'required|numeric|min:0';
                $rules["items.{$index}.tax_id"] = 'nullable|exists:tax_master,id';

                // Conditional validation based on item type
                if (isset($item['item_type'])) {
                    if ($item['item_type'] === 'product') {
                        // Products require quantity and UOM
                        $rules["items.{$index}.product_id"] = 'required|exists:products,id';
                        $rules["items.{$index}.quantity"] = 'required|numeric|min:0.001';
                        $rules["items.{$index}.uom_id"] = 'required|exists:uoms,id';
                    } elseif ($item['item_type'] === 'service') {
                        // Services don't require quantity and UOM
                        $rules["items.{$index}.service_id"] = 'required|exists:services,id';
                        $rules["items.{$index}.quantity"] = 'nullable|numeric|min:0.001';
                        $rules["items.{$index}.uom_id"] = 'nullable|exists:uoms,id';
                    }
                }
            }
        }

        $request->validate($rules);

        DB::beginTransaction();

        try {
            // Update PO fields
            $order->update($request->only([
                'supplier_id',
                'quotation_ref',
                'delivery_date',
                'delivery_address',
                'shipping_method',
                'payment_terms',
                'payment_due_date',
                'terms_conditions',
                'internal_notes',
                'shipping_charges',
                'other_charges'
            ]));

            // If items are provided, recreate them
            if ($request->has('items')) {
                // Delete existing items
                $order->items()->delete();

                // Recalculate totals and create new items
                $subtotal = 0;
                $totalTax = 0;
                $totalDiscount = 0;

                foreach ($request->items as $index => $item) {
                    // Handle quantity for services vs products
                    $quantity = $item['item_type'] === 'service' && !isset($item['quantity']) ? 0 : $item['quantity'];

                    $itemSubtotal = $quantity * $item['unit_price'];
                    $taxAmount = ($item['tax_percent'] ?? 0) / 100 * $itemSubtotal;
                    $discountAmount = $item['discount_amount'] ?? 0;

                    $subtotal += $itemSubtotal;
                    $totalTax += $taxAmount;
                    $totalDiscount += $discountAmount;

                    PurchaseOrderItem::create([
                        'po_id' => $order->id,
                        'item_type' => $item['item_type'],
                        'product_id' => $item['product_id'] ?? null,
                        'service_id' => $item['service_id'] ?? null,
                        'description' => $item['description'] ?? null,
                        'quantity' => $quantity,
                        'uom_id' => $item['item_type'] === 'product' ? ($item['uom_id'] ?? null) : null,
                        'unit_price' => $item['unit_price'],
                        'tax_id' => $item['tax_id'] ?? null,
                        'tax_percent' => $item['tax_percent'] ?? 0,
                        'tax_amount' => $taxAmount,
                        'discount_type' => $item['discount_type'] ?? 'amount',
                        'discount_value' => $item['discount_value'] ?? 0,
                        'discount_amount' => $discountAmount,
                        'subtotal' => $itemSubtotal,
                        'total_amount' => $itemSubtotal + $taxAmount - $discountAmount,
                        'sort_order' => $index,
                    ]);
                }

                $totalAmount = $subtotal + $totalTax - $totalDiscount +
                    $order->shipping_charges + $order->other_charges;

                $order->update([
                    'subtotal' => $subtotal,
                    'total_tax' => $totalTax,
                    'discount_amount' => $totalDiscount,
                    'total_amount' => $totalAmount,
                    'updated_by' => Auth::id(),
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Purchase Order updated successfully',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update Purchase Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve purchase order
     */
    public function approve(Request $request, $id)
    {
        $order = PurchaseOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Check permission
        if (Auth::user()->user_type !== 'SUPER_ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to approve Purchase Orders'
            ], 403);
        }

        if ($order->status !== 'PENDING_APPROVAL') {
            return response()->json([
                'success' => false,
                'message' => 'This Purchase Order cannot be approved'
            ], 400);
        }
        DB::beginTransaction();

        try {
            $order->update([
                'status' => 'APPROVED',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'approval_notes' => $request->approval_notes,
                'updated_by' => Auth::id(),
            ]);

            // Auto-create Purchase Invoice in DRAFT status
            $invoiceNumber = $this->generateInvoiceNumber();

            // Determine if GRN is required (if there are products)
            $grnRequired = false;
            foreach ($order->items as $item) {
                if ($item->item_type === 'product') {
                    $grnRequired = true;
                    break;
                }
            }

            // Create the invoice
            $invoice = PurchaseInvoice::create([
                'invoice_number' => $invoiceNumber,
                'supplier_invoice_no' => null, // Can be updated later
                'invoice_date' => now()->toDateString(),
                'invoice_type' => 'PO_BASED',
                'po_id' => $order->id,
                'supplier_id' => $order->supplier_id,
                'subtotal' => $order->subtotal,
                'total_tax' => $order->total_tax,
                'shipping_charges' => $order->shipping_charges ?? 0,
                'other_charges' => $order->other_charges ?? 0,
                'discount_amount' => $order->discount_amount ?? 0,
                'total_amount' => $order->total_amount,
                'paid_amount' => 0,
                'balance_amount' => $order->total_amount,
                'payment_status' => 'UNPAID',
                'payment_due_date' => $order->payment_due_date,
                'status' => 'POSTED', // Invoice starts as draft
                'grn_required' => $grnRequired,
                'grn_status' => $grnRequired ? 'PENDING' : 'NOT_REQUIRED',
                'terms_conditions' => $order->terms_conditions,
                'notes' => 'Auto-created from PO: ' . $order->po_number,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            // Create invoice items from PO items
            foreach ($order->items as $poItem) {
                PurchaseInvoiceItem::create([
                    'invoice_id' => $invoice->id ?? null,
                    'po_item_id' => $poItem->id ?? null,
                    'item_type' => $poItem->item_type ?? null,
                    'product_id' => $poItem->product_id ?? null,
                    'service_id' => $poItem->service_id ?? null,
                    'description' => $poItem->description ?? null,
                    'quantity' => $poItem->quantity ?? null,
                    'uom_id' => $poItem->uom_id ?? null,
                    'unit_price' => $poItem->unit_price ?? null,
                    'tax_id' => $poItem->tax_id ?? null,
                    'tax_percent' => $poItem->tax_percent ?? null,
                    'tax_amount' => $poItem->tax_amount ?? null,
                    'discount_type' => $poItem->discount_type ?? null,
                    'discount_value' => $poItem->discount_value ?? null,
                    'discount_amount' => $poItem->discount_amount ?? null,
                    'subtotal' => $poItem->subtotal ?? null,
                    'total_amount' => $poItem->total_amount ?? null,
                    'sort_order' => $poItem->sort_order ?? null,
                    'notes' => $poItem->notes ?? null,
                ]);
            }
            if ($invoice && $invoice->status === 'POSTED') {
                $migrationResult = $this->invoiceController->performAccountMigration($invoice);

                if (!$migrationResult['success']) {
                    Log::warning('Auto-migration failed for PO-approved invoice', [
                        'invoice_id' => $invoice->id,
                        'error' => $migrationResult['error']
                    ]);
                }
            }
            // Update PO to indicate invoice has been created
            /* $order->update([
				'invoice_status' => 'INVOICED',
				'updated_by' => Auth::id()
			]); */

            // Update supplier balance
            $supplier = Supplier::find($order->supplier_id);
            if ($supplier) {
                $supplier->increment('current_balance', $order->total_amount);
            }
            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Purchase Order approved successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Failed to submit PO for approval', [
                'po_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit Purchase Order for approval',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject purchase order
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:500'
        ]);

        $order = PurchaseOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Check permission
        if (Auth::user()->user_type !== 'SUPER_ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to reject Purchase Orders'
            ], 403);
        }

        if ($order->status !== 'PENDING_APPROVAL') {
            return response()->json([
                'success' => false,
                'message' => 'This Purchase Order cannot be rejected'
            ], 400);
        }

        $order->update([
            'status' => 'REJECTED',
            'rejection_reason' => $request->rejection_reason,
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Purchase Order rejected'
        ]);
    }

    /**
     * Cancel purchase order
     */
    public function cancel(Request $request, $id)
    {
        $order = PurchaseOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Check if can be cancelled
        if (in_array($order->status, ['RECEIVED', 'CLOSED', 'CANCELLED'])) {
            return response()->json([
                'success' => false,
                'message' => 'This Purchase Order cannot be cancelled'
            ], 400);
        }

        // Check if has invoices or GRN
        if ($order->invoice_status !== 'PENDING' || $order->grn_status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel PO with existing invoices or GRN'
            ], 400);
        }

        $order->update([
            'status' => 'CANCELLED',
            'updated_by' => Auth::id(),
        ]);

        // Update supplier balance if approved
        if ($order->status === 'APPROVED') {
            $supplier = Supplier::find($order->supplier_id);
            if ($supplier) {
                $supplier->decrement('current_balance', $order->total_amount);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Purchase Order cancelled successfully'
        ]);
    }

    /**
     * Convert PR to PO
     */
    public function convertFromPR(Request $request, $prId)
    {
        $pr = PurchaseRequest::with('items')->find($prId);

        if (!$pr) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Request not found'
            ], 404);
        }

        if ($pr->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Only approved PRs can be converted to PO'
            ], 400);
        }

        if ($pr->converted_to_po) {
            return response()->json([
                'success' => false,
                'message' => 'This PR has already been converted to PO'
            ], 400);
        }

        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'items' => 'required|array|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            // Create PO using the store method logic
            $poData = $request->all();
            $poData['pr_id'] = $prId;

            $response = $this->store(new Request($poData));

            if ($response->getData()->success) {
                // Update PR status
                $pr->update([
                    'converted_to_po' => true,
                    'po_id' => $response->getData()->data->id,
                    'converted_at' => now(),
                    'converted_by' => Auth::id(),
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Purchase Order created from PR successfully',
                    'data' => ['po_id' => $response->getData()->data->id]
                ]);
            } else {
                DB::rollback();
                return $response;
            }
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to convert PR to PO',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique PO number
     */
    private function generatePONumber()
    {
        $year = date('Y');
        $lastOrder = PurchaseOrder::whereYear('created_at', $year)
            ->orderBy('po_number', 'desc')
            ->first();

        if ($lastOrder) {
            // Extract number from last PO
            preg_match('/(\d+)$/', $lastOrder->po_number, $matches);
            $nextNumber = isset($matches[1]) ? intval($matches[1]) + 1 : 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf('PO/%s/%03d', $year, $nextNumber);
    }

    /**
     * Get PO statistics for dashboard
     */
    public function getStatistics(Request $request)
    {
        $stats = [
            'total_pos' => PurchaseOrder::count(),
            'pending_approval' => PurchaseOrder::where('status', 'PENDING_APPROVAL')->count(),
            'approved' => PurchaseOrder::where('status', 'APPROVED')->count(),
            'total_value' => PurchaseOrder::where('status', 'APPROVED')->sum('total_amount'),
            'pending_delivery' => PurchaseOrder::whereIn('status', ['APPROVED', 'PARTIAL_RECEIVED'])->count(),
            'overdue_payments' => PurchaseOrder::where('payment_status', 'UNPAID')
                ->whereDate('payment_due_date', '<', now())
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Submit purchase order for approval
     */
    public function submit(Request $request, $id)
    {
        $order = PurchaseOrder::with('items')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Only draft POs can be submitted
        if ($order->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft Purchase Orders can be submitted for approval'
            ], 400);
        }

        // Validate PO has required fields
        if (!$order->supplier_id || $order->items->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order must have supplier and items before submission'
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Update PO status to PENDING_APPROVAL
            $order->update([
                'status' => 'PENDING_APPROVAL',
                'submitted_at' => now(),
                'submitted_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            // Determine if GRN is required (if there are products)
            $grnRequired = false;
            foreach ($order->items as $item) {
                if ($item->item_type === 'product') {
                    $grnRequired = true;
                    break;
                }
            }


            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Purchase Order submitted for approval and invoice created successfully',
                'data' => [
                    'po' => $order,
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Failed to submit PO for approval', [
                'po_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit Purchase Order for approval',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique invoice number
     */
    private function generateInvoiceNumber()
    {
        $year = date('Y');
        $lastInvoice = PurchaseInvoice::whereYear('created_at', $year)
            ->orderBy('invoice_number', 'desc')
            ->first();

        if ($lastInvoice) {
            preg_match('/(\d+)$/', $lastInvoice->invoice_number, $matches);
            $nextNumber = isset($matches[1]) ? intval($matches[1]) + 1 : 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf('PI/%s/%03d', $year, $nextNumber);
    }
    /**
     * Delete purchase order
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('purchase_orders.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete purchase orders'
            ], 403);
        }
        $order = PurchaseOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase Order not found'
            ], 404);
        }

        // Check permission
        $user = Auth::user();
        if (!in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete Purchase Orders'
            ], 403);
        }

        // Only allow deletion of draft POs
        if ($order->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft Purchase Orders can be deleted. Consider cancelling instead.'
            ], 400);
        }

        // Check if PO has any related transactions
        if ($order->invoices()->exists() || $order->grns()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete Purchase Order with existing invoices or GRNs'
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Delete PO items first
            $order->items()->delete();

            // Delete the PO
            $order->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Purchase Order deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete Purchase Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    // app/Http/Controllers/PurchaseOrderController.php

    /**
     * Create PO from Purchase Request data
     * This is called from PurchaseRequestController when converting PR to PO
     */
    public function createFromPR($data)
    {
        DB::beginTransaction();

        try {
            // Generate PO number
            $poNumber = $this->generatePONumber();

            // Calculate totals
            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            foreach ($data['items'] as $item) {
                $quantity = $item['item_type'] === 'service' ? 1 : ($item['quantity'] ?? 1);
                $unitPrice = $item['unit_price'] ?? 0;
                $discountAmount = $item['discount_amount'] ?? 0;

                $itemSubtotal = $quantity * $unitPrice;

                // Calculate tax if tax_id is provided
                $taxAmount = 0;
                if (!empty($item['tax_id'])) {
                    $tax = \App\Models\TaxMaster::find($item['tax_id']);
                    if ($tax) {
                        $taxAmount = (($itemSubtotal - $discountAmount) * $tax->percent) / 100;
                    }
                }

                $subtotal += $itemSubtotal;
                $totalTax += $taxAmount;
                $totalDiscount += $discountAmount;
            }

            $totalAmount = $subtotal + $totalTax - $totalDiscount + ($data['other_charges'] ?? 0);

            // Create Purchase Order
            $order = PurchaseOrder::create([
                'po_number' => $poNumber,
                'po_date' => now()->toDateString(),
                'supplier_id' => $data['supplier_id'],
                'pr_id' => $data['pr_id'] ?? null,
                'quotation_ref' => $data['quotation_ref'] ?? null,
                'delivery_date' => $data['delivery_date'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'shipping_method' => $data['shipping_method'] ?? null,
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'shipping_charges' => $data['shipping_charges'] ?? 0,
                'other_charges' => $data['other_charges'] ?? 0,
                'discount_amount' => $totalDiscount,
                'total_amount' => $totalAmount,
                'payment_terms' => $data['payment_terms'] ?? null,
                'payment_due_date' => $data['payment_due_date'] ?? null,
                'status' => 'DRAFT', // Start as draft
                'terms_conditions' => $data['terms_conditions'] ?? null,
                'internal_notes' => $data['internal_notes'] ?? null,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);
            if (isset($data['supplier_id'])) {
                // Create PO items (only for selected items)
                foreach ($data['items'] as $index => $item) {
                    $quantity = $item['item_type'] === 'service' ? 1 : ($item['quantity'] ?? 1);
                    $unitPrice = $item['unit_price'] ?? 0;
                    $discountAmount = $item['discount_amount'] ?? 0;

                    $itemSubtotal = $quantity * $unitPrice;

                    // Calculate tax
                    $taxAmount = 0;
                    $taxPercent = 0;
                    if (!empty($item['tax_id'])) {
                        $tax = TaxMaster::find($item['tax_id']);
                        if ($tax) {
                            $taxPercent = $tax->percent;
                            $taxAmount = (($itemSubtotal - $discountAmount) * $taxPercent) / 100;
                        }
                    } else if (!empty($item['tax_percent'])) {
                        // Use tax percent directly if provided
                        $taxPercent = $item['tax_percent'];
                        $taxAmount = (($itemSubtotal - $discountAmount) * $taxPercent) / 100;
                    }

                    $itemTotal = $itemSubtotal - $discountAmount + $taxAmount;

                    $poItem =   PurchaseOrderItem::create([
                        'po_id' => $order->id,
                        'pr_item_id' => $item['pr_item_id'] ?? null, // Important: Link to PR item
                        'item_type' => $item['item_type'],
                        'product_id' => $item['product_id'] ?? null,
                        'service_id' => $item['service_id'] ?? null,
                        'description' => $item['description'] ?? null,
                        'quantity' => $quantity,
                        'uom_id' => $item['uom_id'] ?? null,
                        'unit_price' => $unitPrice,
                        'tax_id' => $item['tax_id'] ?? null,
                        'tax_percent' => $taxPercent,
                        'tax_amount' => $taxAmount,
                        'discount_type' => 'amount',
                        'discount_value' => $discountAmount,
                        'discount_amount' => $discountAmount,
                        'subtotal' => $itemSubtotal,
                        'total_amount' => $itemTotal,
                        'sort_order' => $index,
                        'notes' => $item['notes'] ?? null,
                    ]);
                    if (!empty($item['pr_item_id'])) {
                        PurchaseRequestItemConversion::firstOrCreate([
                            'pr_item_id' => $item['pr_item_id'],
                            'po_item_id' => $poItem->id,
                            'supplier_id' => $data['supplier_id'],
                            'converted_at' => now()
                        ]);
                    }
                }
            }

            DB::commit();

            // Load relationships for response
            $order->load(['items.product', 'items.service', 'supplier']);

            return $order;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
}
