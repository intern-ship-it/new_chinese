<?php

namespace App\Http\Controllers;

use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesInvoicePayment;
use App\Models\SalesOrder;
use App\Models\Devotee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\PaymentMode;
use Exception;

class SalesInvoiceController extends Controller
{

    /**
     * FIUU Payment Gateway Configuration
     */
    private $fiuuCredentials;
    private $fiuuUrls;
    private $isSandbox;
    
    public function __construct()
    {
        $this->isSandbox = config('fiuu.is_sandbox', true);
        $mode = $this->isSandbox ? 'sandbox' : 'production';

        $this->fiuuCredentials = config("fiuu.{$mode}", [
            'merchant_id' => 'SB_graspsoftware',
            'verify_key' => '3f97a57034112582ef5a1ffbe1d21a30',
            'secret_key' => '77e7bf7f53130877abdbef553725a785',
        ]);

        $this->fiuuUrls = config("fiuu.urls.{$mode}", [
            'payment' => 'https://sandbox-payment.fiuu.com/RMS/pay/',
            'api' => 'https://sandbox-api.fiuu.com',
        ]);
    }


    /**
     * List all sales invoices with filters
     */
    public function index(Request $request)
    {
        $query = SalesInvoice::with(['devotee', 'salesOrder', 'creator'])
            ->orderBy('invoice_date', 'desc');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('devotee_id')) {
            $query->where('devotee_id', $request->devotee_id);
        }

        // Date filters
        if ($request->filled('date_from')) {
            $query->whereDate('invoice_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('invoice_date', '<=', $request->date_to);
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhere('customer_invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('devotee', function ($dq) use ($search) {
                        $dq->where('customer_name', 'like', "%{$search}%");
                    });
            });
        }

        $baseQuery = clone $query;

        // Calculate summary
        $summary = [
            'total_count' => $baseQuery->count(),
            'total_amount' => (float) $baseQuery->sum(DB::raw('CAST(total_amount AS DECIMAL(10,2))')),
            'paid_amount' => (float) $baseQuery->sum(DB::raw('CAST(paid_amount AS DECIMAL(10,2))')),
            'outstanding_amount' => (float) $baseQuery->sum(DB::raw('CAST(balance_amount AS DECIMAL(10,2))')),

            // Tab counts
            'all_count' => SalesInvoice::count(),
            'unpaid_count' => SalesInvoice::where('payment_status', 'UNPAID')->count(),
            'partial_count' => SalesInvoice::where('payment_status', 'PARTIAL')->count(),
            'paid_count' => SalesInvoice::where('payment_status', 'PAID')->count(),
            'overdue_count' => SalesInvoice::where('payment_status', '!=', 'PAID')
                ->whereDate('payment_due_date', '<', now())
                ->count()
        ];

        // Pagination
        $perPage = $request->get('per_page', 50);
        $invoices = $query->paginate($perPage);

        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        return response()->json([
            'success' => true,
            'data' => $invoices,
            'summary' => $summary,
            'permissions' => $permissions
        ]);
    }

    /**
     * Get single invoice details
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        $invoice = SalesInvoice::with([
            'devotee',
            'salesOrder',
            'items.product',
            'items.package',
            'items.salesItem',
            'items.uom',
            'items.tax',
            'payments.paymentMode',
            'payments.creator',
            'creator'
        ])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Sales Invoice not found'
            ], 404);
        }

        // Add payment history summary
        $invoice->payment_history = $invoice->payments->map(function ($payment) {
            return [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date,
                'amount' => $payment->amount,
                'payment_mode' => $payment->paymentMode->name ?? 'N/A',
                'payment_status' => $payment->payment_status ?? 'N/A',
                'transaction_id' => $payment->transaction_id ?? null,
                'payment_reference_number' => $payment->payment_reference_number,  // System-generated
                'reference_number' => $payment->reference_number,  // User-provided
                'created_by' => $payment->creator->name ?? 'N/A',
                'created_at' => $payment->created_at
            ];
        });

        // Add frontend-friendly fields directly to items
        $invoice->items->transform(function ($item) {
            $item->type = $item->item_type;
            $item->item_id = $item->product_id ?? $item->package_id ?? $item->sales_item_id;

            if ($item->item_type === 'package' && $item->package) {
                $item->item_name = $item->package->package_name ?? $item->package->name;
                $item->item_details = $item->package;
            } elseif ($item->item_type === 'sales_item' && $item->salesItem) {
                $item->item_name = $item->salesItem->name;
                $item->item_details = $item->salesItem;
            } elseif ($item->item_type === 'product' && $item->product) {
                $item->item_name = $item->product->name;
                $item->item_details = $item->product;
            }

            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => $invoice,
            'permissions' => $permissions
        ]);
    }

    /**
     * Create new sales invoice
     */
    public function store(Request $request)
    {
        // Pre-process request to handle frontend field naming
        if ($request->has('customer_id') && !$request->has('devotee_id')) {
            $request->merge(['devotee_id' => $request->customer_id]);
        }

        // Set default invoice_type if not provided
        if (!$request->has('invoice_type')) {
            $request->merge(['invoice_type' => 'DIRECT']);
        }

        // Pre-process items to handle "No Tax" option and field naming
        if ($request->has('items')) {
            $items = $request->items;
            $processedItems = [];

            foreach ($items as $index => $item) {
                $processedItem = $item;

                // Map 'type' to 'item_type' if needed
                if (isset($item['type']) && !isset($item['item_type'])) {
                    $processedItem['item_type'] = $item['type'];
                }

                // Map 'item_id' to appropriate field based on type
                if (isset($item['item_id']) && isset($processedItem['item_type'])) {
                    $itemType = $processedItem['item_type'];
                    if ($itemType === 'product') {
                        $processedItem['product_id'] = $item['item_id'];
                    } elseif ($itemType === 'package') {
                        $processedItem['package_id'] = $item['item_id'];
                    } elseif ($itemType === 'sales_item') {
                        $processedItem['sales_item_id'] = $item['item_id'];
                    }
                }

                // Handle tax_id - convert "0" or empty to null
                if (isset($processedItem['tax_id']) && ($processedItem['tax_id'] === '' || $processedItem['tax_id'] === 0 || $processedItem['tax_id'] === '0')) {
                    $processedItem['tax_id'] = null;
                }

                if (!isset($processedItem['tax_id']) || $processedItem['tax_id'] === null) {
                    $processedItem['tax_rate'] = 0;
                }

                $processedItems[] = $processedItem;
            }

            $request->merge(['items' => $processedItems]);
        }

        // Check if it's a SO-based invoice and validate the SO
        if ($request->invoice_type === 'SO_BASED' && $request->so_id) {
            $so = SalesOrder::find($request->so_id);

            if (!$so) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sales Order not found',
                    'errors' => ['so_id' => ['The specified Sales Order does not exist']]
                ], 422);
            }

            if ($so->status !== 'APPROVED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only approved Sales Orders can be invoiced',
                    'errors' => ['so_id' => ['Sales Order must be approved before creating invoice']]
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'invoice_type' => 'required|in:DIRECT,SO_BASED',
            'so_id' => 'required_if:invoice_type,SO_BASED|nullable|exists:sales_orders,id',
            'devotee_id' => 'required|exists:devotees,id',
            'customer_invoice_no' => 'nullable|string|max:100',
            'invoice_date' => 'required|date',
            'payment_due_date' => 'nullable|date|after_or_equal:invoice_date',
            'shipping_charges' => 'nullable|numeric|min:0',
            'other_charges' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'terms_conditions' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:product,package,sales_item',
            'items.*.product_id' => 'nullable|required_if:items.*.item_type,product|exists:products,id',
            'items.*.package_id' => 'nullable|required_if:items.*.item_type,package|exists:sales_packages,id',
            'items.*.sales_item_id' => 'nullable|required_if:items.*.item_type,sales_item|exists:sale_items,id',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.uom_id' => 'nullable|exists:uoms,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_id' => 'nullable|exists:tax_master,id',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
        ], [
            'so_id.required_if' => 'Sales Order ID is required for SO-based invoices',
            'devotee_id.required' => 'Devotee is required',
            'invoice_date.required' => 'Invoice date is required',
            'items.required' => 'At least one item is required',
            'items.*.item_type.in' => 'Item type must be product, package, or sales_item',
            'items.*.product_id.required_if' => 'Product is required when item type is product',
            'items.*.package_id.required_if' => 'Package is required when item type is package',
            'items.*.sales_item_id.required_if' => 'Sales Item is required when item type is sales_item',
        ]);

        if ($validator->fails()) {
            Log::error('Sales Invoice validation failed', [
                'errors' => $validator->errors()->toArray(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate invoice number
            $invoiceNumber = SalesInvoice::generateInvoiceNumber();

            // Calculate totals
            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            foreach ($request->items as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];

                // Get tax rate
                $taxRate = 0;
                if (!empty($item['tax_id'])) {
                    $tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
                    $taxRate = $tax ? $tax->percent : 0;
                } elseif (isset($item['tax_rate'])) {
                    $taxRate = $item['tax_rate'];
                }

                $taxAmount = isset($item['tax_amount']) ? $item['tax_amount'] : (($taxRate / 100) * $itemSubtotal);
                $discountAmount = $item['discount_amount'] ?? 0;

                $subtotal += $itemSubtotal;
                $totalTax += $taxAmount;
                $totalDiscount += $discountAmount;
            }

            $totalAmount = $subtotal + $totalTax - $totalDiscount +
                ($request->shipping_charges ?? 0) +
                ($request->other_charges ?? 0) -
                ($request->discount_amount ?? 0);

            // Create invoice
            $invoice = SalesInvoice::create([
                'invoice_number' => $invoiceNumber,
                'invoice_type' => $request->invoice_type,
                'invoice_date' => $request->invoice_date,
                'customer_invoice_no' => $request->customer_invoice_no,
                'devotee_id' => $request->devotee_id,
                'so_id' => $request->so_id,
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'shipping_charges' => $request->shipping_charges ?? 0,
                'other_charges' => $request->other_charges ?? 0,
                'discount_amount' => ($request->discount_amount ?? 0) + $totalDiscount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'balance_amount' => $totalAmount,
                'payment_status' => 'UNPAID',
                'payment_due_date' => $request->payment_due_date,
                'status' => $request->status ?? 'DRAFT',
                'terms_conditions' => $request->terms_conditions,
                'notes' => $request->notes,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            // Create invoice items
            foreach ($request->items as $index => $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];

                // Get tax details
                $taxRate = 0;
                $taxId = null;
                if (!empty($item['tax_id'])) {
                    $tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
                    if ($tax) {
                        $taxRate = $tax->percent;
                        $taxId = $tax->id;
                    }
                }

                $taxAmount = isset($item['tax_amount']) ? $item['tax_amount'] : (($taxRate / 100) * $itemSubtotal);
                $discountAmount = $item['discount_amount'] ?? 0;
                $itemTotal = $itemSubtotal + $taxAmount - $discountAmount;

                SalesInvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $item['item_type'],
                    'product_id' => $item['product_id'] ?? null,
                    'package_id' => $item['package_id'] ?? null,
                    'sales_item_id' => $item['sales_item_id'] ?? null,
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'uom_id' => $item['uom_id'] ?? null,
                    'unit_price' => $item['unit_price'],
                    'tax_id' => $taxId,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'discount_amount' => $discountAmount,
                    'total_amount' => $itemTotal,
                ]);
            }

            // Update SO status if SO-based
            if ($request->invoice_type === 'SO_BASED' && $request->so_id) {
                $so = SalesOrder::find($request->so_id);
                if ($so) {
                    $so->update([
                        'invoice_status' => 'INVOICED',
                        'updated_by' => Auth::id()
                    ]);
                }
            }

            // If posted, handle accounting migration
            if ($invoice->status === 'POSTED') {
                Log::info('Sales Invoice posted', ['invoice_id' => $invoice->id]);
            }

            DB::commit();

            // Load relationships for response
            $invoice->load(['devotee', 'items.product', 'items.package', 'items.salesItem', 'items.uom', 'items.tax']);

            return response()->json([
                'success' => true,
                'message' => 'Sales Invoice created successfully',
                'data' => $invoice
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to create Sales Invoice', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create Sales Invoice: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update existing sales invoice
     */
    public function update(Request $request, $id)
    {
        $invoice = SalesInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Sales Invoice not found'
            ], 404);
        }

        // Allow updating if DRAFT or if just changing status from DRAFT to POSTED
        if ($invoice->status !== 'DRAFT' && $invoice->status !== 'POSTED') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft or posted invoices can be updated'
            ], 400);
        }

        // Pre-process request to handle frontend field naming (same as store method)
        if ($request->has('customer_id') && !$request->has('devotee_id')) {
            $request->merge(['devotee_id' => $request->customer_id]);
        }

        // Pre-process items to handle field naming
        if ($request->has('items')) {
            $items = $request->items;
            $processedItems = [];

            foreach ($items as $index => $item) {
                $processedItem = $item;

                // Map 'type' to 'item_type' if needed
                if (isset($item['type']) && !isset($item['item_type'])) {
                    $processedItem['item_type'] = $item['type'];
                }

                // Map 'item_id' to appropriate field based on type
                if (isset($item['item_id']) && isset($processedItem['item_type'])) {
                    $itemType = $processedItem['item_type'];
                    if ($itemType === 'product') {
                        $processedItem['product_id'] = $item['item_id'];
                    } elseif ($itemType === 'package') {
                        $processedItem['package_id'] = $item['item_id'];
                    } elseif ($itemType === 'sales_item') {
                        $processedItem['sales_item_id'] = $item['item_id'];
                    }
                }

                // Handle tax_id - convert "0" or empty to null
                if (isset($processedItem['tax_id']) && ($processedItem['tax_id'] === '' || $processedItem['tax_id'] === 0 || $processedItem['tax_id'] === '0')) {
                    $processedItem['tax_id'] = null;
                }

                if (!isset($processedItem['tax_id']) || $processedItem['tax_id'] === null) {
                    $processedItem['tax_rate'] = 0;
                }

                $processedItems[] = $processedItem;
            }

            $request->merge(['items' => $processedItems]);
        }

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'required|date',
            'payment_due_date' => 'nullable|date|after_or_equal:invoice_date',
            'status' => 'nullable|in:DRAFT,POSTED',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:product,package,sales_item',
            'items.*.product_id' => 'nullable|required_if:items.*.item_type,product|exists:products,id',
            'items.*.package_id' => 'nullable|required_if:items.*.item_type,package|exists:sales_packages,id',
            'items.*.sales_item_id' => 'nullable|required_if:items.*.item_type,sales_item|exists:sale_items,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'required|numeric|min:0',
        ], [
            'items.*.item_type.in' => 'Item type must be product, package, or sales_item',
            'items.*.product_id.required_if' => 'Product is required when item type is product',
            'items.*.package_id.required_if' => 'Package is required when item type is package',
            'items.*.sales_item_id.required_if' => 'Sales Item is required when item type is sales_item',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Recalculate totals
            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            foreach ($request->items as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $taxRate = 0;

                if (!empty($item['tax_id'])) {
                    $tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
                    $taxRate = $tax ? $tax->percent : 0;
                }

                $taxAmount = isset($item['tax_amount']) ? $item['tax_amount'] : (($taxRate / 100) * $itemSubtotal);
                $discountAmount = $item['discount_amount'] ?? 0;

                $subtotal += $itemSubtotal;
                $totalTax += $taxAmount;
                $totalDiscount += $discountAmount;
            }

            $totalAmount = $subtotal + $totalTax - $totalDiscount +
                ($request->shipping_charges ?? 0) +
                ($request->other_charges ?? 0) -
                ($request->discount_amount ?? 0);

            // Prepare update data
            $updateData = [
                'invoice_date' => $request->invoice_date,
                'payment_due_date' => $request->payment_due_date,
                'customer_invoice_no' => $request->customer_invoice_no,
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'shipping_charges' => $request->shipping_charges ?? 0,
                'other_charges' => $request->other_charges ?? 0,
                'discount_amount' => ($request->discount_amount ?? 0) + $totalDiscount,
                'total_amount' => $totalAmount,
                'balance_amount' => $totalAmount - $invoice->paid_amount,
                'terms_conditions' => $request->terms_conditions,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
            ];

            // Update devotee_id if provided
            if ($request->has('devotee_id')) {
                $updateData['devotee_id'] = $request->devotee_id;
            }

            $newStatus = $request->status ?? $invoice->status;

            // If changing from DRAFT to POSTED, add posting information
            if ($invoice->status === 'DRAFT' && $newStatus === 'POSTED') {
                $updateData['status'] = 'POSTED';
                $updateData['posted_by'] = Auth::id();
                $updateData['posted_at'] = now();
                Log::info('Sales Invoice posted', ['invoice_id' => $invoice->id]);
            } else {
                $updateData['status'] = $newStatus;
            }

            // Update invoice
            $invoice->update($updateData);

            // Delete existing items and recreate
            SalesInvoiceItem::where('invoice_id', $invoice->id)->delete();

            foreach ($request->items as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $taxRate = 0;
                $taxId = null;

                if (!empty($item['tax_id'])) {
                    $tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
                    if ($tax) {
                        $taxRate = $tax->percent;
                        $taxId = $tax->id;
                    }
                }

                $taxAmount = isset($item['tax_amount']) ? $item['tax_amount'] : (($taxRate / 100) * $itemSubtotal);
                $discountAmount = $item['discount_amount'] ?? 0;
                $itemTotal = $itemSubtotal + $taxAmount - $discountAmount;

                SalesInvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $item['item_type'],
                    'product_id' => $item['product_id'] ?? null,
                    'package_id' => $item['package_id'] ?? null,
                    'sales_item_id' => $item['sales_item_id'] ?? null,
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'uom_id' => $item['uom_id'] ?? null,
                    'unit_price' => $item['unit_price'],
                    'tax_id' => $taxId,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'discount_amount' => $discountAmount,
                    'total_amount' => $itemTotal,
                ]);
            }

            DB::commit();

            $invoice->load(['devotee', 'items.product', 'items.package', 'items.salesItem', 'items.uom', 'items.tax']);

            return response()->json([
                'success' => true,
                'message' => 'Sales Invoice updated successfully',
                'data' => $invoice
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to update Sales Invoice', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update Sales Invoice: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Post invoice (make it official)
     */
    public function postInvoice($id)
    {
        $invoice = SalesInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        }

        if ($invoice->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft invoices can be posted'
            ], 400);
        }

        DB::beginTransaction();

        try {
            $invoice->update([
                'status' => 'POSTED',
                'posted_by' => Auth::id(),
                'posted_at' => now(),
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Invoice posted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to post invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel invoice
     */
    public function cancel($id)
    {
        $invoice = SalesInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        }

        if ($invoice->status === 'CANCELLED') {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is already cancelled'
            ], 400);
        }

        if ($invoice->paid_amount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel invoice with payments. Please reverse payments first.'
            ], 400);
        }

        DB::beginTransaction();

        try {
            $invoice->update([
                'status' => 'CANCELLED',
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Invoice cancelled successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process payment for invoice - ENHANCED WITH FIUU SUPPORT
     */
    public function processPayment(Request $request, $id)
    {
        $invoice = SalesInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        }

        if ($invoice->status !== 'POSTED') {
            return response()->json([
                'success' => false,
                'message' => 'Only posted invoices can receive payments'
            ], 400);
        }

        $request->validate([
            'payment_mode_id' => 'required|exists:payment_modes,id',
            'amount' => 'required|numeric|min:0.01|max:' . $invoice->balance_amount,
            'payment_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',  // User-provided reference (cheque #, bank ref, etc.)
            'bank_name' => 'nullable|string|max:100',
            'bank_branch' => 'nullable|string|max:100',
            'cheque_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        DB::beginTransaction();

        try {
            // Get payment mode details
            $paymentMode = PaymentMode::find($request->payment_mode_id);
            $isPaymentGateway = $paymentMode->is_payment_gateway == true;

            // Generate payment reference
            $paymentReference = $this->generatePaymentReference();

            Log::info('Processing sales invoice payment', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $request->amount,
                'payment_mode' => $paymentMode->name,
                'is_payment_gateway' => $isPaymentGateway,
                'payment_reference_number' => $paymentReference,  // System-generated
                'reference_number' => $request->reference_number  // User-provided
            ]);

            // Create payment record
            $payment = SalesInvoicePayment::create([
                'invoice_id' => $invoice->id,
                'payment_date' => $request->payment_date,
                'payment_mode_id' => $request->payment_mode_id,
                'amount' => $request->amount,
                'payment_reference_number' => $paymentReference,  // System-generated unique reference
                'reference_number' => $request->reference_number,  // User-provided reference (optional)
                'bank_name' => $request->bank_name,
                'bank_branch' => $request->bank_branch,
                'cheque_date' => $request->cheque_date,
                'payment_status' => $isPaymentGateway ? 'PENDING' : 'SUCCESS',
                'notes' => $isPaymentGateway ? 'Payment gateway transaction pending' : $request->notes,
                'created_by' => Auth::id(),
            ]);

            // If payment gateway, return payment URL
            if ($isPaymentGateway) {
                DB::commit();

                $paymentUrl = route('sales.invoices.payment_process') .
                    '?temple_id=' . $request->header('X-Temple-ID') .
                    '&payment_id=' . $payment->id;

                Log::info('Payment gateway transaction initiated', [
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'payment_url' => $paymentUrl
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Payment initiated. Please complete payment.',
                    'data' => [
                        'payment_id' => $payment->id,
                        'payment_url' => $paymentUrl,
                        'payment_reference' => $paymentReference,
                        'is_payment_gateway' => true,
                        'amount' => $payment->amount,
                        'invoice_number' => $invoice->invoice_number
                    ]
                ]);
            }

            // For non-gateway payments, update invoice immediately
            $newPaidAmount = $invoice->paid_amount + $request->amount;
            $paymentStatus = ($newPaidAmount >= $invoice->total_amount) ? 'PAID' : 'PARTIAL';

            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'balance_amount' => $invoice->total_amount - $newPaidAmount,
                'payment_status' => $paymentStatus,
                'updated_by' => Auth::id()
            ]);

            // Update SO if linked
            if ($invoice->so_id) {
                DB::table('sales_orders')
                    ->where('id', $invoice->so_id)
                    ->update([
                        'payment_status' => $paymentStatus,
                        'updated_by' => Auth::id()
                    ]);
            }

            DB::commit();

            // Load relationships for response
            $payment->load('invoice');

            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully',
                'data' => $payment
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Payment processing failed', [
                'invoice_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process payment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate unique payment reference
     * Format: SYD/SYL + YYYYMMDD + 8-digit sequence
     * Example: SYD2025012800000006 (Development)
     *          SYL2025012800000006 (Production)
     */
    private function generatePaymentReference()
    {
        // Determine environment prefix
        $prefix = config('app.env') === 'production' ? 'SYL' : 'SYD';
        
        // Get current date in YYYYMMDD format
        $date = now()->format('Ymd');
        
        // Get today's payment count for sequence number
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        
        $todayCount = SalesInvoicePayment::whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();
        
        // Generate 8-digit sequence number (padded with zeros)
        $sequence = str_pad($todayCount + 1, 8, '0', STR_PAD_LEFT);
        
        // Combine: SYD/SYL + YYYYMMDD + 8-digit sequence
        $reference = $prefix . $date . $sequence;
        
        // Check if reference already exists (rare edge case)
        while (SalesInvoicePayment::where('payment_reference_number', $reference)->exists()) {
            $sequence = str_pad((int)$sequence + 1, 8, '0', STR_PAD_LEFT);
            $reference = $prefix . $date . $sequence;
        }
        
        return $reference;
    }

    /**
     * Get payment history for an invoice
     */
    public function getPaymentHistory($id)
    {
        $invoice = SalesInvoice::with(['payments.paymentMode', 'payments.creator'])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $invoice->payments
        ]);
    }

    /**
     * Delete invoice (soft delete)
     */
    public function destroy($id)
    {
        $invoice = SalesInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        }

        if ($invoice->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft invoices can be deleted'
            ], 400);
        }

        try {
            $invoice->delete();

            return response()->json([
                'success' => true,
                'message' => 'Invoice deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign permissions based on user role
     */
    private function assignPermissions($user)
    {
        return [
            'can_create' => $user->can('sales_invoices.create') ?? true,
            'can_edit' => $user->can('sales_invoices.edit') ?? true,
            'can_delete' => $user->can('sales_invoices.delete') ?? true,
            'can_post' => $user->can('sales_invoices.post') ?? true,
            'can_cancel' => $user->can('sales_invoices.cancel') ?? true,
            'can_view_payments' => $user->can('sales_invoices.view_payments') ?? true,
            'can_process_payment' => $user->can('sales_invoices.process_payment') ?? true,
        ];
    }

    // =====================================================
    // FIUU PAYMENT GATEWAY METHODS
    // =====================================================

    /**
     * Process payment gateway redirection - Generate FIUU payment form
     */
    public function payment_process(Request $request)
    {
        try {
            $payment = SalesInvoicePayment::find($request->payment_id);

            if (!$payment || $payment->payment_status != 'PENDING') {
                return view('payment.failed', [
                    'message' => 'Invalid payment request. Payment not found or already processed.',
                    'error_code' => 'INVALID_PAYMENT',
                    'order_no' => $request->payment_id ?? 'N/A'
                ]);
            }

            $invoice = SalesInvoice::with('devotee')->find($payment->invoice_id);

            if (!$invoice) {
                return view('payment.failed', [
                    'message' => 'Invoice not found for this payment.',
                    'error_code' => 'INVOICE_NOT_FOUND',
                    'order_no' => $payment->payment_reference_number ?? $payment->id
                ]);
            }

            // Get customer details
            $customerName = 'Customer';
            $customerEmail = 'noreply@temple.com';
            $customerPhone = '';

            if ($invoice->devotee) {
                $customerName = $invoice->devotee->customer_name ??
                    $invoice->devotee->english_name ??
                    $invoice->devotee->name ??
                    'Customer';
                $customerEmail = $invoice->devotee->email ?? 'noreply@temple.com';
                $customerPhone = $invoice->devotee->contact_no ?? '';
            }

            // Prepare payment data according to FIUU specification
            $paymentData = [
                'merchant_id' => $this->fiuuCredentials['merchant_id'],
                'orderid' => $payment->payment_reference_number,
                'amount' => number_format($payment->amount, 2, '.', ''),
                'currency' => 'MYR',
                'bill_name' => $customerName,
                'bill_email' => $customerEmail,
                'bill_mobile' => $customerPhone,
                'bill_desc' => 'Sales Invoice - ' . $invoice->invoice_number,
                'country' => 'MY',
                'returnurl' => route('sales.invoices.payment.callback') . '?temple_id=' . $request->temple_id,
                'callbackurl' => route('sales.invoices.payment.webhook') . '?temple_id=' . $request->temple_id,
                'cancelurl' => route('sales.invoices.payment.cancel') . '?temple_id=' . $request->temple_id,
                'langcode' => 'en'
            ];

            // Generate vcode according to FIUU specification
            $vcodeString = $paymentData['amount'] .
                $paymentData['merchant_id'] .
                $paymentData['orderid'] .
                $this->fiuuCredentials['verify_key'];

            $paymentData['vcode'] = md5($vcodeString);

            Log::info('FIUU Payment redirect prepared (Sales Invoice)', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'payment_id' => $payment->id,
                'orderid' => $paymentData['orderid'],
                'amount' => $paymentData['amount']
            ]);

            return view('payment.fiuu-redirect', [
                'paymentData' => $paymentData,
                'gatewayUrl' => $this->fiuuUrls['payment'] . $this->fiuuCredentials['merchant_id'] . '/'
            ]);

        } catch (\Exception $e) {
            Log::error('Payment process error (Sales Invoice)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return view('payment.failed', [
                'message' => 'An error occurred while processing your payment. Please try again.',
                'error_code' => 'SYSTEM_ERROR',
                'order_no' => $request->payment_id ?? 'N/A'
            ]);
        }
    }

    /**
     * Handle payment callback from FIUU
     * This is called when customer returns to site after payment
     */
    public function handlePaymentCallback(Request $request)
    {
        Log::info('FIUU Payment Callback Received (Sales Invoice)', $request->all());

        try {
            $response_data = $request->all();
            $orderid = $request->get('orderid');
            $status = $request->get('status');
            $tranID = $request->get('tranID');
            $amount = $request->get('amount');

            // Find payment by payment_reference_number (orderid)
            $payment = SalesInvoicePayment::where('payment_reference_number', $orderid)->first();

            if (!$payment) {
                Log::error('Payment record not found (Sales Invoice)', ['orderid' => $orderid]);

                return view('payment.failed', [
                    'message' => 'Payment record not found',
                    'error_code' => 'PAYMENT_NOT_FOUND',
                    'order_no' => $orderid
                ]);
            }

            $invoice = SalesInvoice::find($payment->invoice_id);

            if (!$invoice) {
                Log::error('Invoice not found for payment callback', ['invoice_id' => $payment->invoice_id]);

                return view('payment.failed', [
                    'message' => 'Invoice not found',
                    'error_code' => 'INVOICE_NOT_FOUND',
                    'order_no' => $orderid
                ]);
            }

            // Process based on status
            if ($status == '00') { // Success
                $this->processSuccessfulPayment($invoice, $payment, $tranID, $request->all());

                return view('payment.success', [
                    'order_no' => $response_data['orderid'],
                    'transaction_id' => $response_data['tranID'],
                    'amount' => $response_data['amount'],
                    'currency' => $response_data['currency'] ?? 'MYR',
                    'payment_date' => $response_data['paydate'] ?? now()->format('Y-m-d H:i:s'),
                    'channel' => $response_data['channel'] ?? 'Online',
                    'invoice_number' => $invoice->invoice_number
                ]);
            } elseif ($status == '11') { // Failed
                $this->processFailedPayment($invoice, $payment, $request->all());

                return view('payment.failed', [
                    'message' => $response_data['error_desc'] ?? 'Payment failed',
                    'error_code' => $response_data['error_code'] ?? 'PAYMENT_FAILED',
                    'order_no' => $response_data['orderid']
                ]);
            } elseif ($status == '22') { // Pending
                return view('payment.pending', [
                    'order_no' => $response_data['orderid'],
                    'transaction_id' => $response_data['tranID'] ?? null,
                    'amount' => $response_data['amount'] ?? null,
                    'message' => $response_data['error_desc'] ?? 'Payment is pending confirmation'
                ]);
            } else {
                $this->processFailedPayment($invoice, $payment, $request->all());

                return view('payment.failed', [
                    'message' => 'Unknown payment status: ' . $status,
                    'error_code' => 'UNKNOWN_STATUS',
                    'order_no' => $response_data['orderid']
                ]);
            }
        } catch (Exception $e) {
            Log::error('Error processing payment callback (Sales Invoice)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return view('payment.failed', [
                'message' => 'Error processing payment',
                'error_code' => 'SYSTEM_ERROR',
                'order_no' => $request->get('orderid', 'N/A')
            ]);
        }
    }
    
    /**
     * Handle webhook notification from FIUU
     * This is called asynchronously by FIUU
     */
    public function handlePaymentWebhook(Request $request)
    {
        Log::info('FIUU Payment Webhook Received (Sales Invoice)', $request->all());

        $nbcb = $request->get('nbcb');

        // Handle callback token request
        if ($nbcb == '1') {
            echo "CBTOKEN:MPSTATOK";
            return;
        }

        try {
            $orderid = $request->get('orderid');
            $status = $request->get('status');
            $tranID = $request->get('tranID');

            // Find payment by payment_reference_number
            $payment = SalesInvoicePayment::where('payment_reference_number', $orderid)->first();

            if (!$payment) {
                Log::error('Payment not found for webhook (Sales Invoice)', ['orderid' => $orderid]);
                return response('Payment not found', 404);
            }

            // Find invoice
            $invoice = SalesInvoice::find($payment->invoice_id);

            if (!$invoice) {
                Log::error('Invoice not found for webhook', ['invoice_id' => $payment->invoice_id]);
                return response('Invoice not found', 404);
            }

            // Process based on status
            if ($status == '00') { // Success
                $this->processSuccessfulPayment($invoice, $payment, $tranID, $request->all());
            } elseif ($status == '11') { // Failed
                $this->processFailedPayment($invoice, $payment, $request->all());
            }

            return response('OK', 200);
        } catch (Exception $e) {
            Log::error('Error processing webhook (Sales Invoice)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response('Error', 500);
        }
    }

    /**
     * Handle payment cancellation
     */
    public function handlePaymentCancel(Request $request)
    {
        Log::info('FIUU Payment Cancelled (Sales Invoice)', $request->all());

        $orderid = $request->get('orderid');

        if ($orderid) {
            $payment = SalesInvoicePayment::where('payment_reference_number', $orderid)->first();

            if ($payment) {
                $invoice = SalesInvoice::find($payment->invoice_id);

                if ($invoice) {
                    $this->processFailedPayment($invoice, $payment, [
                        'error_desc' => 'Payment cancelled by user',
                        'status' => 'cancelled'
                    ]);
                }
            }
        }

        return view('payment.cancelled', [
            'message' => 'Payment was cancelled',
            'error_code' => 'USER_CANCELLED',
            'order_no' => $orderid
        ]);
    }
    
    /**
     * Process successful payment
     */
    private function processSuccessfulPayment($invoice, $payment, $transactionId, $paymentResponse)
    {
        DB::beginTransaction();
        try {
            // Update payment record
            $payment->update([
                'payment_status' => 'SUCCESS',
                'transaction_id' => $transactionId,
                'payment_response' => json_encode($paymentResponse),
                'notes' => 'Payment completed successfully via FIUU',
                'payment_date' => now()
            ]);

            // Update invoice
            $newPaidAmount = $invoice->paid_amount + $payment->amount;
            $paymentStatus = ($newPaidAmount >= $invoice->total_amount) ? 'PAID' : 'PARTIAL';

            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'balance_amount' => $invoice->total_amount - $newPaidAmount,
                'payment_status' => $paymentStatus,
                'updated_by' => Auth::id() ?? $invoice->created_by
            ]);

            // Update linked SO if exists
            if ($invoice->so_id) {
                DB::table('sales_orders')
                    ->where('id', $invoice->so_id)
                    ->update([
                        'payment_status' => $paymentStatus,
                        'updated_by' => Auth::id() ?? $invoice->created_by
                    ]);
            }

            DB::commit();

            Log::info('Payment processed successfully (Sales Invoice)', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'payment_id' => $payment->id,
                'transaction_id' => $transactionId,
                'new_paid_amount' => $newPaidAmount,
                'payment_status' => $paymentStatus
            ]);

        } catch (Exception $e) {
            DB::rollback();
            Log::error('Error processing successful payment (Sales Invoice)', [
                'invoice_id' => $invoice->id,
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Process failed payment
     */
    private function processFailedPayment($invoice, $payment, $paymentResponse)
    {
        DB::beginTransaction();

        try {
            // Update payment record
            $payment->update([
                'payment_status' => 'FAILED',
                'payment_response' => json_encode($paymentResponse),
                'notes' => 'Payment failed: ' . ($paymentResponse['error_desc'] ?? 'Unknown error')
            ]);

            DB::commit();

            Log::info('Payment marked as failed (Sales Invoice)', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'payment_id' => $payment->id,
                'error' => $paymentResponse['error_desc'] ?? 'Unknown error'
            ]);
        } catch (Exception $e) {
            DB::rollback();
            Log::error('Failed to process failed payment (Sales Invoice)', [
                'invoice_id' => $invoice->id,
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Get payment status - for frontend polling
     */
    public function getPaymentStatus($id)
    {
        try {
            $payment = SalesInvoicePayment::with('invoice')->find($id);

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'payment_status' => $payment->payment_status,
                    'transaction_id' => $payment->transaction_id,
                    'payment_reference' => $payment->payment_reference_number,  // System-generated
                    'reference_number' => $payment->reference_number,  // User-provided
                    'amount' => $payment->amount,
                    'invoice_id' => $payment->invoice_id,
                    'invoice_number' => $payment->invoice->invoice_number ?? null,
                    'payment_date' => $payment->payment_date
                ]
            ]);
        } catch (Exception $e) {
            Log::error('Error getting payment status (Sales Invoice)', [
                'payment_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching payment status: ' . $e->getMessage()
            ], 500);
        }
    }
}