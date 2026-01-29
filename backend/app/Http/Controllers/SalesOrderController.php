<?php

namespace App\Http\Controllers;

use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesPackage;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\Devotee;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesInvoicePayment;
use App\Models\PaymentMode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class SalesOrderController extends Controller
{
    /**
     * List all sales orders
     */
    public function index(Request $request)
    {
        $query = SalesOrder::with(['devotee', 'creator', 'approver'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('devotee_id')) {
            $query->where('devotee_id', $request->devotee_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('so_number', 'ILIKE', "%{$search}%");
        }

        $orders = $query->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    }

    /**
     * Show single sales order
     */
    public function show($id)
    {
        $order = SalesOrder::with([
            'devotee',
            'items.salesPackage',
            'items.product',
            'items.saleItem',
            'items.uom',
            'creator',
            'approver'
        ])->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Sales Order not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ]);
    }

    /**
     * Create new sales order (with auto-invoice creation and optional payment)
     */
    public function store(Request $request)
    {
        Log::info('=== Sales Order Store Method Called ===');
        Log::info('Request Data:', $request->all());
        Log::info('Auth User:', ['id' => Auth::id(), 'user' => Auth::user()]);

        $request->validate([
            'devotee_id' => 'required|exists:devotees,id',
            'delivery_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            // Payment field (optional) - only payment mode needed
            'payment_mode_id' => 'nullable|exists:payment_modes,id'
        ]);

        DB::beginTransaction();

        try {
            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            // Create Order
            $order = SalesOrder::create([
                'so_date' => now()->toDateString(),
                'devotee_id' => $request->devotee_id,
                'quotation_ref' => $request->quotation_ref,
                'delivery_date' => $request->delivery_date,
                'delivery_address' => $request->delivery_address,
                'internal_notes' => $request->internal_notes,
                'status' => $request->status ?? 'APPROVED',
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            foreach ($request->items as $item) {
                $itemSubtotal = 0;
                $taxAmount = 0;
                $discountAmount = 0;

                $isAddon = isset($item['is_addon']) && $item['is_addon'];

                if (!$isAddon) {
                    // It's a Package
                    $package = SalesPackage::find($item['package_id']);
                    if (!$package) continue;

                    $quantity = $item['quantity'] ?? 1;
                    // $unitPrice = $item['unit_price'] ?? $package->subtotal;
                    // $taxAmount = $item['tax_amount'] ?? 0;
                    // $discountAmount = $item['discount_amount'] ?? 0;

                    // $itemSubtotal = ($quantity * $unitPrice);
                    // $itemTotal = $itemSubtotal + $taxAmount - $discountAmount;

                    $unitPrice = floatval($package->total_amount);  // Base price per unit
                    $discount = floatval($package->discount ?? 0);  // Discount per unit
                    $taxRate = floatval($package->tax_rate ?? 0);   // Tax percentage

                    // Calculate tax amount per unit using same formula as SalesPackage model
                    // Formula: tax = (price - discount) * (tax_rate / 100)
                    $subtotalAfter = $unitPrice - $discount;
                    $taxPerUnit = $subtotalAfter * ($taxRate / 100);

                    // Calculate line totals (multiply by quantity)
                    $itemSubtotal = $unitPrice * $quantity;           // Total price before discount/tax
                    $taxAmount = $taxPerUnit * $quantity;             // Total tax amount
                    $discountAmount = $discount * $quantity;          // Total discount
                    $itemTotal = ($subtotalAfter * $quantity) + $taxAmount;  // Grand total

                    SalesOrderItem::create([
                        'sales_order_id' => $order->id,
                        'is_addon' => false,
                        'sales_package_id' => $package->id,
                        'description' => $item['description'] ?? $package->package_name,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'tax_amount' => $taxAmount,
                        'discount_amount' => $discountAmount,
                        'total_amount' => $itemTotal,
                    ]);

                    $subtotal += $itemSubtotal;
                    $totalTax += $taxAmount;
                    $totalDiscount += $discountAmount;
                    // } else {
                    //     // It's an Addon
                    //     $type = $item['type'];
                    //     $quantity = $item['quantity'] ?? 1;
                    //     $unitPrice = $item['unit_price'] ?? 0;
                    //     $itemTax = $item['tax_amount'] ?? 0;
                    //     $itemDiscount = $item['discount_amount'] ?? 0;
                    //     $itemSubtotal = $quantity * $unitPrice;
                    //     $itemTotal = $itemSubtotal + $itemTax - $itemDiscount;

                    //     SalesOrderItem::create([
                    //         'sales_order_id' => $order->id,
                    //         'is_addon' => true,
                    //         'item_type' => $type,
                    //         'product_id' => ($type === 'product') ? $item['item_id'] : null,
                    //         'sale_item_id' => ($type === 'sales_item') ? $item['item_id'] : null,
                    //         'description' => $item['description'] ?? null,
                    //         'quantity' => $quantity,
                    //         'uom_id' => $item['uom_id'] ?? null,
                    //         'unit_price' => $unitPrice,
                    //         'tax_amount' => $itemTax,
                    //         'discount_amount' => $itemDiscount,
                    //         'total_amount' => $itemTotal,
                    //     ]);

                    //     $subtotal += $itemSubtotal;
                    //     $totalTax += $itemTax;
                    //     $totalDiscount += $itemDiscount;
                    // }
                } else {
                    // It's an Addon - AUTO-CALCULATE from database
                    $type = $item['type']; // 'product' or 'sales_item'
                    $quantity = $item['quantity'] ?? 1;

                    $unitPrice = 0;
                    $itemTax = 0;
                    $itemDiscount = 0;

                    if ($type === 'product') {
                        // âœ… Get price from products table
                        $product = Product::find($item['item_id']);
                        if (!$product) continue;

                        $unitPrice = floatval($product->unit_price ?? 0);
                        // Products typically don't have tax/discount in master, set to 0
                        $itemTax = 0;
                        $itemDiscount = 0;
                    } elseif ($type === 'sales_item') {
                        // âœ… Get price from sale_items table
                        $saleItem = SaleItem::find($item['item_id']);
                        if (!$saleItem) continue;

                        $unitPrice = floatval($saleItem->price ?? 0);
                        // Sale items typically don't have tax/discount in master, set to 0
                        $itemTax = 0;
                        $itemDiscount = 0;
                    }

                    // Calculate totals
                    $itemSubtotal = $quantity * $unitPrice;
                    $itemTotal = $itemSubtotal + $itemTax - $itemDiscount;

                    SalesOrderItem::create([
                        'sales_order_id' => $order->id,
                        'is_addon' => true,
                        'item_type' => $type,
                        'product_id' => ($type === 'product') ? $item['item_id'] : null,
                        'sale_item_id' => ($type === 'sales_item') ? $item['item_id'] : null,
                        'description' => $item['description'] ?? null,
                        'quantity' => $quantity,
                        'uom_id' => $item['uom_id'] ?? null,
                        'unit_price' => $unitPrice,
                        'tax_amount' => $itemTax,
                        'discount_amount' => $itemDiscount,
                        'total_amount' => $itemTotal,
                    ]);

                    $subtotal += $itemSubtotal;
                    $totalTax += $itemTax;
                    $totalDiscount += $itemDiscount;
                }
            }

            // Update Totals
            $order->update([
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $subtotal + $totalTax - $totalDiscount,
            ]);

            // ============================================
            // AUTO-CREATE INVOICE
            // ============================================

            $invoice = null;
            if ($order->status !== 'DRAFT') {
                $invoice = $this->createInvoiceFromOrder($order);
            }
            // ============================================
            // PROCESS PAYMENT IF payment_mode_id PROVIDED
            // ============================================
            $payment = null;
            if ($request->filled('payment_mode_id') && $invoice) {
                $payment = $this->processInvoicePayment($invoice, $request);
            }

            DB::commit();

            // Reload with relationships
            $order->load(['devotee', 'items.salesPackage', 'items.product', 'items.saleItem']);

            $message = 'Sales Order created successfully';
            if ($invoice) {
                $message .= ' and invoice generated';
            }
            if ($payment) {
                $message .= ' with payment processed';
            }

            $responseData = [
                'success' => true,
                'message' => $message,
                'data' => [
                    'order' => $order,
                    'invoice' => $invoice ? [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'total_amount' => number_format((float)$invoice->total_amount, 2, '.', ''),
                        'paid_amount' => number_format((float)$invoice->paid_amount, 2, '.', ''),
                        'balance_amount' => number_format((float)$invoice->balance_amount, 2, '.', ''),
                        'payment_status' => $invoice->payment_status
                    ] : null,
                    'payment' => $payment ? [
                        'id' => $payment->id,
                        'invoice_number' => $invoice->invoice_number,
                        'payment_reference_number' => $payment->payment_reference_number,
                        'amount' => number_format((float)$payment->amount, 2, '.', ''),
                        'payment_status' => $payment->payment_status,
                        'payment_date' => is_string($payment->payment_date)
                            ? $payment->payment_date
                            : \Carbon\Carbon::parse($payment->payment_date)->format('Y-m-d'),
                        'payment_mode_id' => $payment->payment_mode_id,
                        'transaction_id' => $payment->transaction_id,
                        'is_payment_gateway' => $payment->is_payment_gateway ?? false,
                        'payment_url' => $payment->payment_url ?? null
                    ] : null
                ]
            ];

            return response()->json($responseData);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Sales Order Creation Failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create Sales Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create invoice from sales order (internal helper method)
     */
    private function createInvoiceFromOrder($order)
    {
        try {
            // Check if invoice already exists
            $existingInvoice = SalesInvoice::where('so_id', $order->id)->first();
            if ($existingInvoice) {
                Log::warning('Invoice already exists for SO', [
                    'so_id' => $order->id,
                    'invoice_id' => $existingInvoice->id
                ]);
                return $existingInvoice;
            }

            // Generate invoice number
            $invoiceNumber = SalesInvoice::generateInvoiceNumber();

            // Create invoice
            $invoice = SalesInvoice::create([
                'invoice_number' => $invoiceNumber,
                'so_id' => $order->id,
                'devotee_id' => $order->devotee_id,
                'invoice_type' => 'SO_BASED',
                'invoice_date' => now()->format('Y-m-d'),
                'payment_due_date' => now()->addDays(30)->format('Y-m-d'),
                'customer_invoice_no' => $order->so_number,
                'subtotal' => $order->subtotal ?? 0,
                'total_tax' => $order->total_tax ?? 0,
                'total_discount' => $order->discount_amount ?? 0,
                'discount_amount' => $order->discount_amount ?? 0,
                'shipping_charges' => 0,
                'other_charges' => 0,
                'total_amount' => $order->total_amount ?? 0,
                'paid_amount' => 0,
                'balance_amount' => $order->total_amount ?? 0,
                'payment_status' => 'UNPAID',
                'status' => $request->status ?? 'POSTED',
                'terms_conditions' => null,
                'notes' => 'Auto-generated from Sales Order: ' . $order->so_number,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id()
            ]);

            // Copy items from SO to Invoice
            foreach ($order->items as $soItem) {
                $packageId = null;
                $productId = null;
                $salesItemId = null;

                if (!$soItem->is_addon) {
                    $packageId = $soItem->sales_package_id ?? $soItem->package_id;
                } elseif ($soItem->item_type === 'product') {
                    $productId = $soItem->product_id;
                } elseif ($soItem->item_type === 'sales_item') {
                    $salesItemId = $soItem->sale_item_id ?? $soItem->sales_item_id;
                }

                SalesInvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $soItem->is_addon ? $soItem->item_type : 'package',
                    'package_id' => $packageId,
                    'product_id' => $productId,
                    'sales_item_id' => $salesItemId,
                    'description' => $soItem->description,
                    'quantity' => $soItem->quantity,
                    'uom_id' => $soItem->uom_id,
                    'unit_price' => $soItem->unit_price,
                    'tax_id' => null,
                    'tax_rate' => 0,
                    'tax_amount' => $soItem->tax_amount ?? 0,
                    'discount_amount' => $soItem->discount_amount ?? 0,
                    'total_amount' => $soItem->total_amount,
                ]);
            }

            // Update SO to mark it as invoiced
            $order->update(['invoice_created' => true]);

            Log::info('Invoice auto-created successfully', [
                'so_id' => $order->id,
                'so_number' => $order->so_number,
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);

            return $invoice;
        } catch (\Exception $e) {
            Log::error('Failed to auto-create invoice', [
                'so_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Don't throw - order should still be created
            return null;
        }
    }

    /**
     * Process payment for the invoice after SO creation
     * Auto-generates: payment_amount, payment_date, payment_reference_number
     */
    private function processInvoicePayment($invoice, $request)
    {
        try {
            // Get payment mode details
            $paymentMode = PaymentMode::find($request->payment_mode_id);

            if (!$paymentMode) {
                Log::error('Payment mode not found', ['payment_mode_id' => $request->payment_mode_id]);
                return null;
            }

            $isPaymentGateway = $paymentMode->is_payment_gateway == true;

            // AUTO-CALCULATE: Use invoice total amount (full payment)
            $paymentAmount = round((float) $invoice->total_amount, 2);

            // AUTO-SET: Use current date
            $paymentDate = now()->format('Y-m-d');

            // AUTO-GENERATE: Payment reference with SYD/SYL prefix
            $paymentReference = $this->generatePaymentReference();

            Log::info('Processing sales order payment', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $paymentAmount,
                'payment_mode' => $paymentMode->name,
                'is_payment_gateway' => $isPaymentGateway,
                'payment_reference_number' => $paymentReference
            ]);

            // Create payment record
            $payment = SalesInvoicePayment::create([
                'invoice_id' => $invoice->id,
                'payment_date' => $paymentDate,
                'payment_mode_id' => $request->payment_mode_id,
                'amount' => $paymentAmount,
                'payment_reference_number' => $paymentReference,
                'payment_status' => $isPaymentGateway ? 'PENDING' : 'SUCCESS',
                'notes' => $isPaymentGateway ? 'Payment gateway transaction pending' : 'Payment processed via ' . $paymentMode->name,
                'created_by' => Auth::id(),
            ]);

            // If payment gateway, prepare payment URL
            if ($isPaymentGateway) {
                $paymentUrl = route('sales.invoices.payment_process') .
                    '?temple_id=' . $request->header('X-Temple-ID') .
                    '&payment_id=' . $payment->id;

                // Add payment URL and invoice number to payment object for response
                $payment->is_payment_gateway = true;
                $payment->payment_url = $paymentUrl;
                $payment->invoice_number = $invoice->invoice_number;

                Log::info('Payment gateway transaction initiated', [
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'payment_url' => $paymentUrl
                ]);

                return $payment;
            }

            // For non-gateway payments, update invoice immediately
            $newPaidAmount = round($invoice->paid_amount + $paymentAmount, 2);
            $newBalance = round($invoice->total_amount - $newPaidAmount, 2);

            // Determine payment status (full payment)
            $paymentStatus = ($newBalance <= 0.01) ? 'PAID' : 'PARTIAL';

            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'balance_amount' => max(0, $newBalance),
                'payment_status' => $paymentStatus,
                'updated_by' => Auth::id()
            ]);

            // Update linked SO payment status if column exists
            if ($invoice->so_id) {
                $this->updateSalesOrderPaymentStatus($invoice->so_id, $paymentStatus);
            }

            Log::info('Payment processed successfully for sales order', [
                'invoice_id' => $invoice->id,
                'payment_id' => $payment->id,
                'new_paid_amount' => $newPaidAmount,
                'payment_status' => $paymentStatus
            ]);

            // Add invoice number to payment object for response
            $payment->invoice_number = $invoice->invoice_number;

            return $payment;
        } catch (\Exception $e) {
            Log::error('Failed to process invoice payment', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Don't throw - just return null, order and invoice are already created
            return null;
        }
    }

    /**
     * Safely update sales order payment status
     */
    private function updateSalesOrderPaymentStatus($soId, $paymentStatus)
    {
        if (!$soId) {
            return;
        }

        try {
            // Check if payment_status column exists
            if (!Schema::hasColumn('sales_orders', 'payment_status')) {
                Log::info('Sales order payment_status column not found, skipping update', [
                    'so_id' => $soId
                ]);
                return;
            }

            // Update the sales order
            DB::table('sales_orders')
                ->where('id', $soId)
                ->update([
                    'payment_status' => $paymentStatus,
                    'updated_by' => Auth::id(),
                    'updated_at' => now()
                ]);

            Log::info('Sales order payment status updated', [
                'so_id' => $soId,
                'payment_status' => $paymentStatus
            ]);
        } catch (\Exception $e) {
            // Log but don't fail the main transaction
            Log::error('Failed to update sales order payment status', [
                'so_id' => $soId,
                'payment_status' => $paymentStatus,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Generate unique payment reference
     * Format: SYD2025121600000006 (SYD for Development, SYL for Live)
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
     * Update Sales Order (with auto-invoice creation and optional payment)
     * Follows same flow as store method
     */
    public function update(Request $request, $id)
    {
        Log::info('=== Sales Order Update Method Called ===');
        Log::info('Request Data:', $request->all());
        Log::info('Order ID:', ['id' => $id]);

        $order = SalesOrder::find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Sales Order not found'], 404);
        }

        if ($order->status !== 'DRAFT') {
            return response()->json(['success' => false, 'message' => 'Only draft orders can be edited'], 400);
        }

        $request->validate([
            'devotee_id' => 'required|exists:devotees,id',
            'delivery_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            // Payment field (optional) - only payment mode needed
            'payment_mode_id' => 'nullable|exists:payment_modes,id'
        ]);

        DB::beginTransaction();

        try {
            // Delete existing items
            $order->items()->delete();

            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            // Update Order basic info
            $order->update([
                'devotee_id' => $request->devotee_id,
                'quotation_ref' => $request->quotation_ref,
                'delivery_date' => $request->delivery_date,
                'delivery_address' => $request->delivery_address,
                'internal_notes' => $request->internal_notes,
                'status' => $request->status ?? $order->status,
                'updated_by' => Auth::id(),
            ]);

            foreach ($request->items as $item) {
                $itemSubtotal = 0;
                $taxAmount = 0;
                $discountAmount = 0;

                $isAddon = isset($item['is_addon']) && $item['is_addon'];

                if (!$isAddon) {
                    // It's a Package - AUTO-CALCULATE from database
                    $package = SalesPackage::find($item['package_id']);
                    if (!$package) continue;

                    $quantity = $item['quantity'] ?? 1;

                    $unitPrice = floatval($package->total_amount);  // Base price per unit
                    $discount = floatval($package->discount ?? 0);  // Discount per unit
                    $taxRate = floatval($package->tax_rate ?? 0);   // Tax percentage

                    // Calculate tax amount per unit using same formula as SalesPackage model
                    // Formula: tax = (price - discount) * (tax_rate / 100)
                    $subtotalAfter = $unitPrice - $discount;
                    $taxPerUnit = $subtotalAfter * ($taxRate / 100);

                    // Calculate line totals (multiply by quantity)
                    $itemSubtotal = $unitPrice * $quantity;           // Total price before discount/tax
                    $taxAmount = $taxPerUnit * $quantity;             // Total tax amount
                    $discountAmount = $discount * $quantity;          // Total discount
                    $itemTotal = ($subtotalAfter * $quantity) + $taxAmount;  // Grand total

                    SalesOrderItem::create([
                        'sales_order_id' => $order->id,
                        'is_addon' => false,
                        'sales_package_id' => $package->id,
                        'description' => $item['description'] ?? $package->package_name,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'tax_amount' => $taxAmount,
                        'discount_amount' => $discountAmount,
                        'total_amount' => $itemTotal,
                    ]);

                    $subtotal += $itemSubtotal;
                    $totalTax += $taxAmount;
                    $totalDiscount += $discountAmount;
                } else {
                    // It's an Addon - AUTO-CALCULATE from database
                    $type = $item['type']; // 'product' or 'sales_item'
                    $quantity = $item['quantity'] ?? 1;

                    $unitPrice = 0;
                    $itemTax = 0;
                    $itemDiscount = 0;

                    if ($type === 'product') {
                        // ✅ Get price from products table
                        $product = Product::find($item['item_id']);
                        if (!$product) continue;

                        $unitPrice = floatval($product->unit_price ?? 0);
                        // Products typically don't have tax/discount in master, set to 0
                        $itemTax = 0;
                        $itemDiscount = 0;
                    } elseif ($type === 'sales_item') {
                        // ✅ Get price from sale_items table
                        $saleItem = SaleItem::find($item['item_id']);
                        if (!$saleItem) continue;

                        $unitPrice = floatval($saleItem->price ?? 0);
                        // Sale items typically don't have tax/discount in master, set to 0
                        $itemTax = 0;
                        $itemDiscount = 0;
                    }

                    // Calculate totals
                    $itemSubtotal = $quantity * $unitPrice;
                    $itemTotal = $itemSubtotal + $itemTax - $itemDiscount;

                    SalesOrderItem::create([
                        'sales_order_id' => $order->id,
                        'is_addon' => true,
                        'item_type' => $type,
                        'product_id' => ($type === 'product') ? $item['item_id'] : null,
                        'sale_item_id' => ($type === 'sales_item') ? $item['item_id'] : null,
                        'description' => $item['description'] ?? null,
                        'quantity' => $quantity,
                        'uom_id' => $item['uom_id'] ?? null,
                        'unit_price' => $unitPrice,
                        'tax_amount' => $itemTax,
                        'discount_amount' => $itemDiscount,
                        'total_amount' => $itemTotal,
                    ]);

                    $subtotal += $itemSubtotal;
                    $totalTax += $itemTax;
                    $totalDiscount += $itemDiscount;
                }
            }

            // Update Totals
            $order->update([
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $subtotal + $totalTax - $totalDiscount,
            ]);

            // ============================================
            // AUTO-CREATE INVOICE (if status changed from DRAFT)
            // ============================================
            $invoice = null;
            if ($order->status !== 'DRAFT' && !$order->invoice_created) {
                $invoice = $this->createInvoiceFromOrder($order);
            }

            // ============================================
            // PROCESS PAYMENT IF payment_mode_id PROVIDED
            // ============================================
            $payment = null;
            if ($request->filled('payment_mode_id') && $invoice) {
                $payment = $this->processInvoicePayment($invoice, $request);
            }

            DB::commit();

            // Reload with relationships
            $order->load(['devotee', 'items.salesPackage', 'items.product', 'items.saleItem']);

            $message = 'Sales Order updated successfully';
            if ($invoice) {
                $message .= ' and invoice generated';
            }
            if ($payment) {
                $message .= ' with payment processed';
            }

            $responseData = [
                'success' => true,
                'message' => $message,
                'data' => [
                    'order' => $order,
                    'invoice' => $invoice ? [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'total_amount' => number_format((float)$invoice->total_amount, 2, '.', ''),
                        'paid_amount' => number_format((float)$invoice->paid_amount, 2, '.', ''),
                        'balance_amount' => number_format((float)$invoice->balance_amount, 2, '.', ''),
                        'payment_status' => $invoice->payment_status
                    ] : null,
                    'payment' => $payment ? [
                        'id' => $payment->id,
                        'invoice_number' => $invoice->invoice_number,
                        'payment_reference_number' => $payment->payment_reference_number,
                        'amount' => number_format((float)$payment->amount, 2, '.', ''),
                        'payment_status' => $payment->payment_status,
                        'payment_date' => is_string($payment->payment_date)
                            ? $payment->payment_date
                            : \Carbon\Carbon::parse($payment->payment_date)->format('Y-m-d'),
                        'payment_mode_id' => $payment->payment_mode_id,
                        'transaction_id' => $payment->transaction_id,
                        'is_payment_gateway' => $payment->is_payment_gateway ?? false,
                        'payment_url' => $payment->payment_url ?? null
                    ] : null
                ]
            ];

            return response()->json($responseData);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Sales Order Update Failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update Sales Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve sales order (and auto-create invoice if not already created)
     */
    public function approve(Request $request, $id)
    {
        $order = SalesOrder::find($id);
        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Not Found'], 404);
        }

        DB::beginTransaction();
        try {
            $order->update([
                'status' => 'APPROVED',
                'approved_by' => Auth::id(),
                'approved_at' => now()
            ]);

            // Auto-create invoice if not already created
            $invoice = null;
            if (!$order->invoice_created) {
                $invoice = $this->createInvoiceFromOrder($order);
            }

            DB::commit();

            $message = 'Sales Order approved successfully';
            if ($invoice) {
                $message .= ' and invoice generated';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'invoice' => $invoice ? [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'total_amount' => number_format((float)$invoice->total_amount, 2, '.', ''),
                    'paid_amount' => number_format((float)$invoice->paid_amount, 2, '.', ''),
                    'balance_amount' => number_format((float)$invoice->balance_amount, 2, '.', ''),
                    'payment_status' => $invoice->payment_status
                ] : null
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        $order = SalesOrder::find($id);
        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Not Found'], 404);
        }

        $order->update([
            'status' => 'REJECTED',
            'rejection_reason' => $request->rejection_reason
        ]);

        return response()->json(['success' => true, 'message' => 'Rejected']);
    }

    public function destroy($id)
    {
        $order = SalesOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Sales Order not found'
            ], 404);
        }

        if ($order->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft orders can be deleted'
            ], 400);
        }

        DB::beginTransaction();

        try {
            $order->items()->delete();
            $order->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sales Order deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Sales Order Deletion Failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete Sales Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sales order statistics
     */
    public function getStatistics(Request $request)
    {
        try {
            $totalOrders = SalesOrder::count();
            $draftOrders = SalesOrder::where('status', 'DRAFT')->count();
            $pendingApproval = SalesOrder::where('status', 'PENDING_APPROVAL')->count();
            $approvedOrders = SalesOrder::where('status', 'APPROVED')->count();

            $totalValue = SalesOrder::where('status', 'APPROVED')->sum('total_amount');
            $outstandingAmount = SalesOrder::where('status', 'APPROVED')->sum('total_amount');

            return response()->json([
                'success' => true,
                'data' => [
                    'total_sos' => $totalOrders,
                    'pending_approval' => $pendingApproval,
                    'total_value' => number_format($totalValue, 2, '.', ''),
                    'outstanding_amount' => number_format($outstandingAmount, 2, '.', ''),
                    'draft_orders' => $draftOrders,
                    'approved_orders' => $approvedOrders,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Get Statistics Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}