<?php
// app/Http/Controllers/PurchaseInvoiceController.php

namespace App\Http\Controllers;

use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\PurchasePayment;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Fund;
use App\Models\Entry;
use App\Models\EntryItem;
use App\Models\User;
use App\Services\StockUpdateService;
use App\Services\SupplierBalanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PurchaseInvoiceController extends Controller
{
	protected $stockService;
	protected $balanceService;

	public function __construct(
		StockUpdateService $stockService,
		SupplierBalanceService $balanceService
	) {
		$this->stockService = $stockService;
		$this->balanceService = $balanceService;
	}

	/**
	 * List all purchase invoices with filters
	 */
	public function index(Request $request)
	{
		$query = PurchaseInvoice::with(['supplier', 'purchaseOrder', 'creator'])
			->orderBy('invoice_date', 'desc');

		// Apply filters only if filled
		if ($request->filled('status')) {
			$query->where('status', $request->status);
		}

		if ($request->filled('payment_status')) {
			$query->where('payment_status', $request->payment_status);
		}

		if ($request->filled('supplier_id')) {
			$query->where('supplier_id', $request->supplier_id);
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
					->orWhere('supplier_invoice_no', 'like', "%{$search}%")
					->orWhereHas('supplier', function ($sq) use ($search) {
						$sq->where('name', 'like', "%{$search}%");
					});
			});
		}

		$baseQuery = clone $query;


		// Calculate summary with explicit casting
		$summary = [
			'total_count' => $baseQuery->count(),
			'total_amount' => (float) $baseQuery->sum(DB::raw('CAST(total_amount AS DECIMAL(10,2))')),
			'paid_amount' => (float) $baseQuery->sum(DB::raw('CAST(paid_amount AS DECIMAL(10,2))')),
			'outstanding_amount' => (float) $baseQuery->sum(DB::raw('CAST(balance_amount AS DECIMAL(10,2))')),

			// Tab counts - use fresh queries
			'all_count' => PurchaseInvoice::count(),
			'unpaid_count' => PurchaseInvoice::where('payment_status', 'UNPAID')->count(),
			'partial_count' => PurchaseInvoice::where('payment_status', 'PARTIAL')->count(),
			'paid_count' => PurchaseInvoice::where('payment_status', 'PAID')->count(),
			'overdue_count' => PurchaseInvoice::where('payment_status', '!=', 'PAID')
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

		$invoice = PurchaseInvoice::with([
			'supplier',
			'purchaseOrder',
			'items.product',
			'items.service',
			'items.uom',
			'items.tax',
			'payments.paymentMode',
			'payments.creator',
			'creator'
		])->find($id);

		if (!$invoice) {
			return response()->json([
				'success' => false,
				'message' => 'Purchase Invoice not found'
			], 404);
		}

		// Add payment history summary
		$invoice->payment_history = $invoice->payments->map(function ($payment) {
			return [
				'id' => $payment->id,
				'payment_number' => $payment->payment_number,
				'payment_date' => $payment->payment_date,
				'amount' => $payment->amount,
				'payment_mode' => $payment->paymentMode->name,
				'reference_number' => $payment->reference_number,
				'status' => $payment->status,
				'created_by' => $payment->creator->name,
				'created_at' => $payment->created_at
			];
		});

		return response()->json([
			'success' => true,
			'data' => $invoice,
			'permissions' => $permissions
		]);
	}

	/**
	 * Create new purchase invoice
	 */
	public function store(Request $request)
	{
		if (!Auth::user()->can('purchase_invoices.create')) {
			return response()->json([
				'success' => false,
				'message' => 'You do not have permission to create purchase invoices'
			], 403);
		}
		// Pre-process items to handle "No Tax" option
		if ($request->has('items')) {
			$items = $request->items;
			foreach ($items as $index => $item) {
				// Convert empty string, 0, or "0" to null for tax_id
				if (isset($item['tax_id']) && ($item['tax_id'] === '' || $item['tax_id'] === 0 || $item['tax_id'] === '0')) {
					$items[$index]['tax_id'] = null;
				}
				// Set tax_percent to 0 if no tax_id
				if (!isset($item['tax_id']) || $item['tax_id'] === null) {
					$items[$index]['tax_percent'] = 0;
				}
			}
			$request->merge(['items' => $items]);
		}

		// Check if it's a PO-based invoice and validate the PO
		if ($request->invoice_type === 'PO_BASED' && $request->po_id) {
			$po = PurchaseOrder::find($request->po_id);

			if (!$po) {
				return response()->json([
					'success' => false,
					'message' => 'Purchase Order not found',
					'errors' => ['po_id' => ['The specified Purchase Order does not exist']]
				], 422);
			}

			if ($po->status !== 'APPROVED') {
				return response()->json([
					'success' => false,
					'message' => 'Only approved Purchase Orders can be invoiced',
					'errors' => ['po_id' => ['Purchase Order must be approved before creating invoice']]
				], 422);
			}
		}

		$validator = Validator::make($request->all(), [
			'invoice_type' => 'required|in:DIRECT,PO_BASED',
			'po_id' => 'required_if:invoice_type,PO_BASED|nullable|exists:purchase_orders,id',
			'supplier_id' => 'required|exists:suppliers,id',
			'supplier_invoice_no' => 'nullable|string|max:100',
			'invoice_date' => 'required|date',
			'payment_due_date' => 'nullable|date|after_or_equal:invoice_date',
			'shipping_charges' => 'nullable|numeric|min:0',
			'other_charges' => 'nullable|numeric|min:0',
			'discount_amount' => 'nullable|numeric|min:0',
			'terms_conditions' => 'nullable|string',
			'notes' => 'nullable|string',
			'items' => 'required|array|min:1',
			'items.*.item_type' => 'required|in:product,service',
			'items.*.product_id' => 'nullable|required_if:items.*.item_type,product|exists:products,id',
			'items.*.service_id' => 'nullable|required_if:items.*.item_type,service|exists:services,id',
			'items.*.description' => 'nullable|string',
			'items.*.quantity' => 'required|numeric|min:0.001',
			'items.*.uom_id' => 'nullable|exists:uoms,id',
			'items.*.unit_price' => 'required|numeric|min:0',
			'items.*.tax_id' => 'nullable|exists:tax_master,id',
			'items.*.tax_percent' => 'nullable|numeric|min:0|max:100',
			'items.*.discount_type' => 'nullable|in:amount,percent',
			'items.*.discount_value' => 'nullable|numeric|min:0',
			'items.*.discount_amount' => 'nullable|numeric|min:0',
			'items.*.notes' => 'nullable|string',
		], [
			'po_id.required_if' => 'Purchase Order ID is required for PO-based invoices',
			'po_id.exists' => 'The selected Purchase Order does not exist',
			'supplier_id.required' => 'Supplier is required',
			'supplier_id.exists' => 'The selected supplier does not exist',
			'invoice_date.required' => 'Invoice date is required',
			'items.required' => 'At least one item is required',
			'items.*.item_type.required' => 'Item type is required for each item',
			'items.*.product_id.required_if' => 'Product is required when item type is product',
			'items.*.product_id.exists' => 'The selected product does not exist',
			'items.*.service_id.required_if' => 'Service is required when item type is service',
			'items.*.service_id.exists' => 'The selected service does not exist',
			'items.*.quantity.required' => 'Quantity is required for each item',
			'items.*.quantity.min' => 'Quantity must be greater than 0',
			'items.*.unit_price.required' => 'Unit price is required for each item',
			'items.*.unit_price.min' => 'Unit price must be 0 or greater',
			'items.*.tax_id.exists' => 'The selected tax rate does not exist',
		]);

		if ($validator->fails()) {
			Log::error('Invoice validation failed', [
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
			$invoiceNumber = $this->generateInvoiceNumber();

			// Calculate totals
			$subtotal = 0;
			$totalTax = 0;
			$totalDiscount = 0;

			foreach ($request->items as $item) {
				$itemSubtotal = $item['quantity'] * $item['unit_price'];

				// Get tax percentage - if tax_id is provided, fetch from database
				$taxPercent = 0;
				if (!empty($item['tax_id'])) {
					$tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
					$taxPercent = $tax ? $tax->percent : 0;
				} elseif (isset($item['tax_percent'])) {
					$taxPercent = $item['tax_percent'];
				}

				$taxAmount = ($taxPercent / 100) * $itemSubtotal;

				// Calculate discount
				$discountAmount = 0;
				if (isset($item['discount_type']) && isset($item['discount_value'])) {
					if ($item['discount_type'] === 'percent') {
						$discountAmount = ($item['discount_value'] / 100) * $itemSubtotal;
					} else {
						$discountAmount = $item['discount_value'];
					}
				} elseif (isset($item['discount_amount'])) {
					$discountAmount = $item['discount_amount'];
				}

				$subtotal += $itemSubtotal;
				$totalTax += $taxAmount;
				$totalDiscount += $discountAmount;
			}

			$totalAmount = $subtotal + $totalTax - $totalDiscount +
				($request->shipping_charges ?? 0) +
				($request->other_charges ?? 0) -
				($request->discount_amount ?? 0);

			// Determine GRN requirement
			$grnRequired = false;
			foreach ($request->items as $item) {
				if ($item['item_type'] === 'product') {
					$grnRequired = true;
					break;
				}
			}

			// Create invoice
			$invoice = PurchaseInvoice::create([
				'invoice_number' => $invoiceNumber,
				'supplier_invoice_no' => $request->supplier_invoice_no,
				'invoice_date' => $request->invoice_date,
				'invoice_type' => $request->invoice_type,
				'po_id' => $request->po_id,
				'supplier_id' => $request->supplier_id,
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
				'grn_required' => $grnRequired,
				'grn_status' => $grnRequired ? 'PENDING' : 'NOT_REQUIRED',
				'terms_conditions' => $request->terms_conditions,
				'notes' => $request->notes,
				'created_by' => Auth::id(),
				'updated_by' => Auth::id(),
			]);

			// Create invoice items
			foreach ($request->items as $index => $item) {
				$itemSubtotal = $item['quantity'] * $item['unit_price'];

				// Get tax details
				$taxPercent = 0;
				$taxId = null;
				if (!empty($item['tax_id'])) {
					$tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
					if ($tax) {
						$taxPercent = $tax->percent;  // ← Fixed
						$taxId = $tax->id;
					}
				}

				$taxAmount = ($taxPercent / 100) * $itemSubtotal;

				// Calculate discount
				$discountAmount = 0;
				$discountType = $item['discount_type'] ?? 'amount';
				$discountValue = $item['discount_value'] ?? 0;

				if ($discountType === 'percent') {
					$discountAmount = ($discountValue / 100) * $itemSubtotal;
				} else {
					$discountAmount = $discountValue;
				}

				if (isset($item['discount_amount']) && $item['discount_amount'] > 0) {
					$discountAmount = $item['discount_amount'];
				}

				$itemTotal = $itemSubtotal + $taxAmount - $discountAmount;

				PurchaseInvoiceItem::create([
					'invoice_id' => $invoice->id,
					'po_item_id' => $item['po_item_id'] ?? null,
					'item_type' => $item['item_type'],
					'product_id' => $item['product_id'] ?? null,
					'service_id' => $item['service_id'] ?? null,
					'description' => $item['description'] ?? null,
					'quantity' => $item['quantity'],
					'uom_id' => $item['uom_id'] ?? null,
					'unit_price' => $item['unit_price'],
					'tax_id' => $taxId,
					'tax_percent' => $taxPercent,
					'tax_amount' => $taxAmount,
					'discount_type' => $discountType,
					'discount_value' => $discountValue,
					'discount_amount' => $discountAmount,
					'subtotal' => $itemSubtotal,
					'total_amount' => $itemTotal,
					'sort_order' => $index,
					'notes' => $item['notes'] ?? null,
				]);
			}

			// Update PO status if PO-based
			if ($request->invoice_type === 'PO_BASED' && $request->po_id) {
				$po = PurchaseOrder::find($request->po_id);
				if ($po) {
					$po->update([
						'invoice_status' => 'INVOICED',
						'updated_by' => Auth::id()
					]);

					// Update PO item quantities
					if ($request->has('items')) {
						foreach ($request->items as $item) {
							if (isset($item['po_item_id'])) {
								DB::table('purchase_order_items')
									->where('id', $item['po_item_id'])
									->increment('invoiced_quantity', $item['quantity']);
							}
						}
					}
				}
			}

			// Update supplier balance if posted
			if ($invoice->status === 'POSTED') {
				// FIX: Use the correct method name
				$this->balanceService->updateBalanceAfterInvoice(
					$invoice->supplier_id,
					$totalAmount
				);
				$migrationResult = $this->performAccountMigration($invoice);

				if (!$migrationResult['success']) {
					Log::warning('Auto-migration failed for new invoice ' . $invoice->invoice_number, [
						'invoice_id' => $invoice->id,
						'error' => $migrationResult['error']
					]);
				}
			}

			DB::commit();

			// Load relationships for response
			$invoice->load(['supplier', 'items.product', 'items.service', 'items.uom', 'items.tax']);

			$message = 'Purchase Invoice created successfully';
			if ($invoice->status === 'POSTED' && isset($migrationResult)) {
				if ($migrationResult['success']) {
					$message .= ' and migrated to accounting';
				} else {
					$message .= ' (Note: Account migration pending - ' . $migrationResult['error'] . ')';
				}
			}

			return response()->json([
				'success' => true,
				'message' => $message,
				'data' => $invoice
			], 201);
		} catch (\Exception $e) {
			DB::rollback();
			Log::error('Failed to create Purchase Invoice', [
				'error' => $e->getMessage(),
				'trace' => $e->getTraceAsString()
			]);

			return response()->json([
				'success' => false,
				'message' => 'Failed to create Purchase Invoice: ' . $e->getMessage(),
				'error' => $e->getMessage()
			], 500);
		}
	}

	/**
	 * Post invoice (make it official)
	 */
	public function postInvoice($id)
	{
		$invoice = PurchaseInvoice::find($id);

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
				'updated_by' => Auth::id()
			]);

			// Update supplier balance
			// FIX: Use the correct method name
			$this->balanceService->updateBalanceAfterInvoice(
				$invoice->supplier_id,
				$invoice->total_amount
			);

			// TODO: Create accounting entries (when accounting module is ready)
			$migrationResult = $this->performAccountMigration($invoice);

			if (!$migrationResult['success']) {
				// Log migration failure but don't rollback posting
				Log::warning('Auto-migration failed for invoice ' . $invoice->invoice_number, [
					'invoice_id' => $invoice->id,
					'error' => $migrationResult['error']
				]);

				// Optionally, you can decide to rollback the entire posting if migration fails
				// throw new \Exception('Account migration failed: ' . $migrationResult['error']);
			}

			DB::commit();

			$message = 'Invoice posted successfully';
			if ($migrationResult['success']) {
				$message .= ' and migrated to accounting';
			} else {
				$message .= ' (Note: Account migration failed - ' . $migrationResult['error'] . ')';
			}

			return response()->json([
				'success' => true,
				'message' => $message,
				'migration_status' => $migrationResult['success'],
				'journal_entry_id' => $migrationResult['journal_entry_id'] ?? null
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
	 * Process payment for invoice
	 */
	public function processPayment(Request $request, $id)
	{
		$invoice = PurchaseInvoice::find($id);

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
			'reference_number' => 'nullable|string|max:100',
			'bank_name' => 'nullable|string|max:100',
			'bank_branch' => 'nullable|string|max:100',
			'cheque_date' => 'nullable|date',
			'notes' => 'nullable|string'
		]);

		DB::beginTransaction();

		try {
			// Get minimum approval amount from system settings
			$minApprovalAmount = DB::table('system_settings')
				->where('key', 'minimum_payment_approval_amount')
				->where('type', 'ACCOUNTS')
				->value('value');

			// Convert to float for comparison
			$minApprovalAmount = $minApprovalAmount ? (float)$minApprovalAmount : 500.00;

			// Check if approval is required
			$approvalRequired = (float)$request->amount >= $minApprovalAmount;
			$approvalStatus = $approvalRequired ? 'PENDING' : 'APPROVED';
			$paymentStatus = $approvalRequired ? 'PENDING' : 'COMPLETED';

			// Create payment record with all fields
			$paymentData = [
				'payment_number' => $this->generatePaymentNumber(),
				'payment_date' => $request->payment_date,
				'invoice_id' => $invoice->id,
				'supplier_id' => $invoice->supplier_id,
				'payment_mode_id' => $request->payment_mode_id,
				'amount' => $request->amount,
				'reference_number' => $request->reference_number,
				'bank_name' => $request->bank_name,
				'bank_branch' => $request->bank_branch,
				'cheque_date' => $request->cheque_date,
				'approval_required' => $approvalRequired,
				'approval_status' => $approvalStatus,
				'status' => $paymentStatus,
				'notes' => $request->notes,
				'account_migration' => 0, // Will be updated after migration
				'created_by' => Auth::id(),
				'updated_by' => Auth::id()
			];

			$payment = PurchasePayment::create($paymentData);

			if (!$payment) {
				throw new \Exception('Failed to create payment record');
			}

			// If approval not required, process payment immediately
			if (!$approvalRequired) {
				// Update invoice
				$newPaidAmount = $invoice->paid_amount + $request->amount;
				$paymentStatus = ($newPaidAmount >= $invoice->total_amount) ? 'PAID' : 'PARTIAL';

				$invoice->update([
					'paid_amount' => $newPaidAmount,
					'balance_amount' => $invoice->total_amount - $newPaidAmount,
					'payment_status' => $paymentStatus,
					'updated_by' => Auth::id()
				]);

				// Update supplier balance
				$this->balanceService->updateBalanceAfterPayment(
					$invoice->supplier_id,
					$request->amount
				);

				// Update PO if linked
				if ($invoice->po_id) {
					DB::table('purchase_orders')
						->where('id', $invoice->po_id)
						->update([
							'payment_status' => $paymentStatus,
							'updated_by' => Auth::id()
						]);
				}

				// Migrate to accounting
				$migrationResult = $this->migratePaymentToAccounting($payment);
				if ($migrationResult) {
					// Refresh payment to get updated values
					$payment->refresh();
				}
			}


			DB::commit();

			// Load relationships for response
			$payment->load('invoice');

			$message = $approvalRequired ?
				'Payment created and pending approval' :
				'Payment processed successfully';

			return response()->json([
				'success' => true,
				'message' => $message,
				'data' => $payment,
				'approval_required' => $approvalRequired
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
	 * Approve payment
	 */
	public function approvePayment(Request $request, $paymentId)
	{
		// Check if user has permission
		$user = Auth::user();
		if ($user->user_type !== 'SUPER_ADMIN') {
			return response()->json([
				'success' => false,
				'message' => 'Unauthorized to approve payments'
			], 403);
		}

		$payment = PurchasePayment::find($paymentId);

		if (!$payment) {
			return response()->json([
				'success' => false,
				'message' => 'Payment not found'
			], 404);
		}

		if (!$payment->approval_required || $payment->approval_status !== 'PENDING') {
			return response()->json([
				'success' => false,
				'message' => 'Payment does not require approval or already processed'
			], 400);
		}

		$request->validate([
			'action' => 'required|in:APPROVE,REJECT',
			'notes' => 'nullable|string'
		]);

		DB::beginTransaction();

		try {
			$payment->approval_status = $request->action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
			$payment->approved_by = Auth::id();
			$payment->approved_at = now();
			$payment->approval_notes = $request->notes;

			if ($request->action === 'APPROVE') {
				$payment->status = 'COMPLETED';

				// Get invoice
				$invoice = PurchaseInvoice::find($payment->invoice_id);

				// Finalize payment and update balances
				$this->finalizePayment($payment, $invoice);
			} else {
				$payment->status = 'REJECTED';
			}

			$payment->save();

			DB::commit();

			$message = $request->action === 'APPROVE' ?
				'Payment approved and processed successfully' :
				'Payment rejected';

			return response()->json([
				'success' => true,
				'message' => $message,
				'data' => $payment
			]);
		} catch (\Exception $e) {
			DB::rollback();
			return response()->json([
				'success' => false,
				'message' => 'Failed to process approval',
				'error' => $e->getMessage()
			], 500);
		}
	}

	/**
	 * Finalize payment - Update invoice and create accounting entries
	 */
	private function finalizePayment($payment, $invoice)
	{
		// Update invoice paid amount
		$newPaidAmount = $invoice->paid_amount + $payment->amount;
		$paymentStatus = 'PARTIAL';

		if ($newPaidAmount >= $invoice->total_amount) {
			$paymentStatus = 'PAID';
		}

		$invoice->update([
			'paid_amount' => $newPaidAmount,
			'balance_amount' => $invoice->total_amount - $newPaidAmount,
			'payment_status' => $paymentStatus,
			'updated_by' => Auth::id()
		]);

		// Update supplier balance
		$this->balanceService->updateBalanceAfterPayment(
			$invoice->supplier_id,
			$payment->amount
		);

		// Update PO payment status if linked
		if ($invoice->po_id) {
			$po = PurchaseOrder::find($invoice->po_id);
			if ($po) {
				$po->update([
					'payment_status' => $paymentStatus,
					'updated_by' => Auth::id()
				]);
			}
		}

		// Migrate to accounting
		$this->migratePaymentToAccounting($payment);
	}

	/**
	 * Migrate payment to accounting entries
	 */
	private function migratePaymentToAccounting($payment)
	{
		try {
			// Get payment mode ledger
			$paymentMode = DB::table('payment_modes')
				->where('id', $payment->payment_mode_id)
				->first();

			if (!$paymentMode || !$paymentMode->ledger_id) {
				Log::warning('Payment mode missing ledger mapping', ['payment_id' => $payment->id]);
				return false;
			}

			// Get supplier ledger
			$supplier = Supplier::find($payment->supplier_id);
			if (!$supplier || !$supplier->ledger_id) {
				Log::warning('Supplier missing ledger mapping', ['payment_id' => $payment->id]);
				return false;
			}

			// Get default fund
			$fund = Fund::first();
			if (!$fund) {
				Log::warning('No fund found in system');
				return false;
			}
			// Generate payment entry code
			$entryCode = $this->generatePaymentEntryCode($payment->payment_date);
			// Create payment entry
			$entry = Entry::create([
				'entrytype_id' => 2, // Payment
				'entry_code' => $entryCode,
				'number' => $entryCode,
				'date' => $payment->payment_date,
				'inv_type' => 4, // Purchase Payment
				'inv_id' => $payment->id,
				'fund_id' => $fund->id,
				'narration' => "Payment: {$payment->payment_number} for Invoice: {$payment->invoice->invoice_number}",
				'dr_total' => $payment->amount,
				'cr_total' => $payment->amount,
				'created_by' => Auth::id() ?? $payment->created_by
			]);

			// Create entry items
			// Debit: Supplier Account
			EntryItem::create([
				'entry_id' => $entry->id,
				'ledger_id' => $supplier->ledger_id,
				'amount' => $payment->amount,
				'dc' => 'D',
				'details' => "Payment for Invoice: {$payment->invoice->invoice_number}"
			]);


			// Credit: Payment Mode Account
			EntryItem::create([
				'entry_id' => $entry->id,
				'ledger_id' => $paymentMode->ledger_id,
				'amount' => $payment->amount,
				'dc' => 'C',
				'details' => "Payment via {$paymentMode->name}"
			]);


			// Update payment record
			$payment->account_migration = 1;
			$payment->journal_entry_id = $entry->id;
			$payment->save();
			return true;
		} catch (\Exception $e) {
			Log::error('Payment accounting migration failed', [
				'payment_id' => $payment->id,
				'error' => $e->getMessage()
			]);
			return false;
		}
	}

	/**
	 * Generate payment entry code
	 */
	private function generatePaymentEntryCode($date = null)
	{
		$date = $date ?? date('Y-m-d');
		$shortYear = date('y', strtotime($date));
		$month = date('m', strtotime($date));

		$prefix = 'PAY';
		$baseCode = $prefix . $shortYear . $month;

		return DB::transaction(function () use ($baseCode) {
			$lastEntry = Entry::where('entrytype_id', 2)
				->where('entry_code', 'like', $baseCode . '%')
				->lockForUpdate()
				->orderBy('id', 'desc')
				->first();

			$lastNumber = 0;
			if ($lastEntry && $lastEntry->entry_code) {
				preg_match('/(\d{5})$/', $lastEntry->entry_code, $matches);
				if (isset($matches[1])) {
					$lastNumber = (int) $matches[1];
				}
			}

			return $baseCode . sprintf("%05d", $lastNumber + 1);
		});
	}

	/**
	 * Get pending payment approvals
	 */
	public function getPendingApprovals(Request $request)
	{
		$query = PurchasePayment::with(['invoice', 'supplier', 'paymentMode', 'creator'])
			->where('approval_required', true)
			->where('approval_status', 'PENDING')
			->orderBy('created_at', 'desc');

		$perPage = $request->get('per_page', 20);
		$approvals = $query->paginate($perPage);

		return response()->json([
			'success' => true,
			'data' => $approvals
		]);
	}

	/**
	 * Get payment history for invoice
	 */
	public function getPaymentHistory($id)
	{
		$invoice = PurchaseInvoice::find($id);

		if (!$invoice) {
			return response()->json([
				'success' => false,
				'message' => 'Invoice not found'
			], 404);
		}

		// Load payments with the approver relationship
		$payments = PurchasePayment::with(['paymentMode', 'creator', 'invoice', 'supplier'])
			->where('invoice_id', $id)
			->orderBy('payment_date', 'desc')
			->get();

		// Format payments with approver name
		$formattedPayments = $payments->map(function ($payment) use ($invoice) {
			// Get approver name if exists
			$approverName = null;
			if ($payment->approved_by) {
				$approver = User::find($payment->approved_by);
				$approverName = $approver ? $approver->name : 'Unknown User';
			}

			// Format approval time to show only time
			$approvalTime = null;

			if ($payment->approved_at) {

				$approvalTime = $payment->approved_at ? Carbon::parse($payment->approved_at)->format('d-m-Y h:i A') : '-';
			}

			return [
				'id' => $payment->id,
				'payment_number' => $payment->payment_number ?? 'PAY-' . str_pad($payment->id, 5, '0', STR_PAD_LEFT),
				'payment_date' => $payment->payment_date,
				'amount' => (float) $payment->amount,
				'payment_mode' => $payment->paymentMode,
				'reference_number' => $payment->reference_number,
				'status' => $payment->status ?? 'COMPLETED',
				'created_by' => $payment->creator ? $payment->creator->name : null,
				'created_at' => $payment->created_at,
				'invoice' => $invoice,
				'approved_by' => $payment->approved_by,
				'approved_at' => $payment->approved_at,
				'supplier_name' => $payment->supplier->name,
				'approver_name' => $approverName,
				'approval_time' => $approvalTime,
			];
		});

		return response()->json([
			'success' => true,
			'data' => $formattedPayments
		]);
	}

	/**
	 * Cancel invoice
	 */
	public function cancel(Request $request, $id)
	{
		$invoice = PurchaseInvoice::find($id);

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

		if ($invoice->grn_status !== 'PENDING' && $invoice->grn_status !== 'NOT_REQUIRED') {
			return response()->json([
				'success' => false,
				'message' => 'Cannot cancel invoice with GRN. Please cancel GRN first.'
			], 400);
		}

		DB::beginTransaction();

		try {
			// Update invoice status first
			$wasPosted = $invoice->status === 'POSTED';

			$invoice->update([
				'status' => 'CANCELLED',
				'updated_by' => Auth::id()
			]);

			// Reverse supplier balance if invoice was posted
			if ($wasPosted) {
				// FIX: For cancellation, we need to reverse the invoice amount (payment)
				// Since cancelling an invoice reduces what we owe the supplier
				$this->balanceService->updateBalanceAfterPayment(
					$invoice->supplier_id,
					$invoice->total_amount
				);
			}

			// Update PO status if linked
			if ($invoice->po_id) {
				$po = PurchaseOrder::find($invoice->po_id);
				if ($po) {
					$po->update([
						'invoice_status' => 'PENDING',
						'updated_by' => Auth::id()
					]);

					// Reverse PO item quantities
					$invoiceItems = PurchaseInvoiceItem::where('invoice_id', $invoice->id)
						->whereNotNull('po_item_id')
						->get();

					foreach ($invoiceItems as $item) {
						DB::table('purchase_order_items')
							->where('id', $item->po_item_id)
							->decrement('invoiced_quantity', $item->quantity);
					}
				}
			}

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
	 * Generate unique payment number
	 */
	private function generatePaymentNumber()
	{
		$year = date('Y');
		$lastPayment = PurchasePayment::whereYear('created_at', $year)
			->orderBy('payment_number', 'desc')
			->first();

		if ($lastPayment) {
			preg_match('/(\d+)$/', $lastPayment->payment_number, $matches);
			$nextNumber = isset($matches[1]) ? intval($matches[1]) + 1 : 1;
		} else {
			$nextNumber = 1;
		}

		return sprintf('PAY/%s/%03d', $year, $nextNumber);
	}

	/**
	 * Get outstanding invoices for a supplier
	 */
	public function getSupplierOutstanding($supplierId)
	{
		$invoices = PurchaseInvoice::where('supplier_id', $supplierId)
			->where('status', 'POSTED')
			->where('payment_status', '!=', 'PAID')
			->select('id', 'invoice_number', 'invoice_date', 'total_amount', 'paid_amount', 'balance_amount')
			->orderBy('invoice_date', 'asc')
			->get();

		$totalOutstanding = $invoices->sum('balance_amount');

		return response()->json([
			'success' => true,
			'data' => [
				'total_outstanding' => $totalOutstanding,
				'invoices' => $invoices
			]
		]);
	}
	/**
	 * Update existing purchase invoice
	 */
	public function update(Request $request, $id)
	{
		if (!Auth::user()->can('purchase_invoices.edit')) {
			return response()->json([
				'success' => false,
				'message' => 'You do not have permission to edit purchase invoices'
			], 403);
		}
		$invoice = PurchaseInvoice::find($id);

		if (!$invoice) {
			return response()->json([
				'success' => false,
				'message' => 'Purchase Invoice not found'
			], 404);
		}

		// Check if invoice can be edited
		if ($invoice->status === 'CANCELLED') {
			return response()->json([
				'success' => false,
				'message' => 'Cannot edit cancelled invoice'
			], 400);
		}

		// Pre-process items to handle "No Tax" option
		if ($request->has('items')) {
			$items = $request->items;
			foreach ($items as $index => $item) {
				if (isset($item['tax_id']) && ($item['tax_id'] === '' || $item['tax_id'] === 0 || $item['tax_id'] === '0')) {
					$items[$index]['tax_id'] = null;
				}
				if (!isset($item['tax_id']) || $item['tax_id'] === null) {
					$items[$index]['tax_percent'] = 0;
				}
			}
			$request->merge(['items' => $items]);
		}

		// Validation rules (some fields are restricted based on status)
		$rules = [
			'supplier_id' => 'sometimes|required|exists:suppliers,id',
			'supplier_invoice_no' => 'nullable|string|max:100',
			'invoice_date' => 'sometimes|required|date',
			'payment_due_date' => 'nullable|date|after_or_equal:invoice_date',
			'shipping_charges' => 'nullable|numeric|min:0',
			'other_charges' => 'nullable|numeric|min:0',
			'discount_amount' => 'nullable|numeric|min:0',
			'terms_conditions' => 'nullable|string',
			'notes' => 'nullable|string',
			'status' => 'sometimes|in:DRAFT,POSTED',
			'deleted_items' => 'nullable|array',
			'items' => 'sometimes|required|array|min:1',
			'items.*.id' => 'nullable|exists:purchase_invoice_items,id',
			'items.*.item_type' => 'required|in:product,service',
			'items.*.product_id' => 'nullable|required_if:items.*.item_type,product|exists:products,id',
			'items.*.service_id' => 'nullable|required_if:items.*.item_type,service|exists:services,id',
			'items.*.description' => 'nullable|string',
			'items.*.quantity' => 'required|numeric|min:0.001',
			'items.*.uom_id' => 'nullable|exists:uoms,id',
			'items.*.unit_price' => 'required|numeric|min:0',
			'items.*.tax_id' => 'nullable|exists:tax_master,id',
			'items.*.tax_percent' => 'nullable|numeric|min:0|max:100',
			'items.*.discount_amount' => 'nullable|numeric|min:0',
		];

		// Additional restrictions for posted invoices
		if ($invoice->status === 'POSTED') {
			// Can't change supplier or amounts if posted
			unset($rules['supplier_id']);
			unset($rules['items']);
			unset($rules['deleted_items']);
		}

		// Can't change supplier if there are payments
		if ($invoice->paid_amount > 0) {
			unset($rules['supplier_id']);
		}

		$validator = Validator::make($request->all(), $rules);

		if ($validator->fails()) {
			return response()->json([
				'success' => false,
				'message' => $validator->errors()->first(),
				'errors' => $validator->errors()
			], 422);
		}

		DB::beginTransaction();

		try {
			$oldStatus = $invoice->status;
			$oldTotalAmount = $invoice->total_amount;

			// Update basic invoice fields
			$updateData = [];

			// Only update fields that can be modified based on status
			if ($invoice->status === 'DRAFT') {
				if ($request->has('supplier_id') && $invoice->paid_amount == 0) {
					$updateData['supplier_id'] = $request->supplier_id;
				}
				if ($request->has('invoice_date')) {
					$updateData['invoice_date'] = $request->invoice_date;
				}
				if ($request->has('shipping_charges')) {
					$updateData['shipping_charges'] = $request->shipping_charges;
				}
				if ($request->has('other_charges')) {
					$updateData['other_charges'] = $request->other_charges;
				}
				if ($request->has('discount_amount')) {
					$updateData['discount_amount'] = $request->discount_amount;
				}
			}

			// These can be updated regardless of status
			if ($request->has('supplier_invoice_no')) {
				$updateData['supplier_invoice_no'] = $request->supplier_invoice_no;
			}
			if ($request->has('payment_due_date')) {
				$updateData['payment_due_date'] = $request->payment_due_date;
			}
			if ($request->has('terms_conditions')) {
				$updateData['terms_conditions'] = $request->terms_conditions;
			}
			if ($request->has('notes')) {
				$updateData['notes'] = $request->notes;
			}
			if ($request->has('status')) {
				$updateData['status'] = $request->status;
			}

			$updateData['updated_by'] = Auth::id();

			// Handle items update only for DRAFT invoices and non-PO based invoices
			if ($invoice->status === 'DRAFT' && $invoice->invoice_type !== 'PO_BASED' && $request->has('items')) {
				// Delete removed items
				if ($request->has('deleted_items') && is_array($request->deleted_items)) {
					PurchaseInvoiceItem::whereIn('id', $request->deleted_items)
						->where('invoice_id', $invoice->id)
						->delete();
				}

				// Calculate new totals
				$subtotal = 0;
				$totalTax = 0;
				$totalDiscount = 0;

				foreach ($request->items as $item) {
					$itemSubtotal = $item['quantity'] * $item['unit_price'];

					$taxPercent = 0;
					if (!empty($item['tax_id'])) {
						$tax = DB::table('tax_master')->where('id', $item['tax_id'])->first();
						$taxPercent = $tax ? $tax->percent : 0;
					} elseif (isset($item['tax_percent'])) {
						$taxPercent = $item['tax_percent'];
					}

					$taxAmount = ($taxPercent / 100) * $itemSubtotal;
					$discountAmount = $item['discount_amount'] ?? 0;

					$subtotal += $itemSubtotal;
					$totalTax += $taxAmount;
					$totalDiscount += $discountAmount;
				}

				$updateData['subtotal'] = $subtotal;
				$updateData['total_tax'] = $totalTax;

				// Add shipping, other charges and overall discount
				$totalAmount = $subtotal + $totalTax - $totalDiscount +
					($request->shipping_charges ?? 0) +
					($request->other_charges ?? 0);

				$updateData['total_amount'] = $totalAmount;
				$updateData['balance_amount'] = $totalAmount - $invoice->paid_amount;

				// Update or create items
				foreach ($request->items as $index => $itemData) {
					$itemSubtotal = $itemData['quantity'] * $itemData['unit_price'];

					$taxPercent = 0;
					$taxId = null;
					if (!empty($itemData['tax_id'])) {
						$tax = DB::table('tax_master')->where('id', $itemData['tax_id'])->first();
						if ($tax && isset($tax->tax_rate)) {
							$taxPercent = $tax->tax_rate;
							$taxId = $tax->id;
						}
					}


					$taxAmount = ($taxPercent / 100) * $itemSubtotal;
					$discountAmount = $itemData['discount_amount'] ?? 0;
					$itemTotal = $itemSubtotal + $taxAmount - $discountAmount;

					$itemRecord = [
						'invoice_id' => $invoice->id,
						'po_item_id' => $itemData['po_item_id'] ?? null,
						'item_type' => $itemData['item_type'],
						'product_id' => $itemData['product_id'] ?? null,
						'service_id' => $itemData['service_id'] ?? null,
						'description' => $itemData['description'] ?? null,
						'quantity' => $itemData['quantity'],
						'uom_id' => $itemData['uom_id'] ?? null,
						'unit_price' => $itemData['unit_price'],
						'tax_id' => $taxId,
						'tax_percent' => $taxPercent,
						'tax_amount' => $taxAmount,
						'discount_amount' => $discountAmount,
						'subtotal' => $itemSubtotal,
						'total_amount' => $itemTotal,
						'sort_order' => $index,
					];

					if (isset($itemData['id'])) {
						// Update existing item
						PurchaseInvoiceItem::where('id', $itemData['id'])
							->where('invoice_id', $invoice->id)
							->update($itemRecord);
					} else {
						// Create new item
						PurchaseInvoiceItem::create($itemRecord);
					}
				}

				// Determine GRN requirement
				$grnRequired = false;
				foreach ($request->items as $item) {
					if ($item['item_type'] === 'product') {
						$grnRequired = true;
						break;
					}
				}
				$updateData['grn_required'] = $grnRequired;
				if ($grnRequired && $invoice->grn_status === 'NOT_REQUIRED') {
					$updateData['grn_status'] = 'PENDING';
				}
			}

			// Update invoice
			$invoice->update($updateData);

			// Handle status change from DRAFT to POSTED
			if ($oldStatus === 'DRAFT' && $request->status === 'POSTED') {
				$this->balanceService->updateBalanceAfterInvoice(
					$invoice->supplier_id,
					$invoice->total_amount
				);
				$migrationResult = $this->performAccountMigration($invoice);

				if (!$migrationResult['success']) {
					Log::warning('Auto-migration failed during status update for invoice ' . $invoice->invoice_number, [
						'invoice_id' => $invoice->id,
						'error' => $migrationResult['error']
					]);
				}
			}

			// Handle supplier balance if total amount changed for posted invoices
			if ($invoice->status === 'POSTED' && isset($updateData['total_amount']) && $oldTotalAmount != $updateData['total_amount']) {
				$difference = $updateData['total_amount'] - $oldTotalAmount;
				if ($difference > 0) {
					// Invoice amount increased
					$this->balanceService->updateBalanceAfterInvoice(
						$invoice->supplier_id,
						$difference
					);
				} else {
					// Invoice amount decreased
					$this->balanceService->updateBalanceAfterPayment(
						$invoice->supplier_id,
						abs($difference)
					);
				}
			}

			DB::commit();

			// Reload invoice with relationships
			$invoice->load(['supplier', 'items.product', 'items.service', 'items.uom', 'items.tax']);

			$message = 'Purchase Invoice updated successfully';
			if ($oldStatus === 'DRAFT' && $request->status === 'POSTED' && isset($migrationResult)) {
				if ($migrationResult['success']) {
					$message .= ' and migrated to accounting';
				} else {
					$message .= ' (Note: Account migration pending - ' . $migrationResult['error'] . ')';
				}
			}

			return response()->json([
				'success' => true,
				'message' => $message,
				'data' => $invoice
			]);
		} catch (\Exception $e) {
			DB::rollback();
			Log::error('Failed to update Purchase Invoice', [
				'error' => $e->getMessage(),
				'trace' => $e->getTraceAsString()
			]);

			return response()->json([
				'success' => false,
				'message' => 'Failed to update Purchase Invoice',
				'error' => $e->getMessage()
			], 500);
		}
	}
	/**
	 * Core account migration logic - extracted for reusability
	 * This is called automatically when invoice is posted
	 */
	public function performAccountMigration(PurchaseInvoice $invoice)
	{
		try {
			// Check if already migrated
			if ($invoice->account_migration == 1) {
				return [
					'success' => false,
					'error' => 'Already migrated'
				];
			}

			// Load relationships if not loaded
			$invoice->load(['items.product', 'items.service', 'items.tax', 'supplier']);

			// Get system settings for ledger mappings
			// Direct query to get tax_inclusive_product setting
			$taxInclusiveProduct = DB::table('system_settings')
				->where('key', 'tax_inclusive_product')
				->where('type', 'PURCHASE')
				->value('value') ?? 0;

			// Get the other charges ledger ID from settings
			// The value stored is the actual ledger ID (e.g., 12)
			$otherChargesLedgerId = DB::table('system_settings')
				->where('key', 'other_charges_ledger_id')
				->where('type', 'PURCHASE')
				->value('value');

			// Get default fund (first fund in the system)
			$fund = Fund::first();
			if (!$fund) {
				return [
					'success' => false,
					'error' => 'No fund found in system'
				];
			}

			// Generate journal entry code
			$entryCode = $this->generateJournalCode($invoice->invoice_date);

			// Create main journal entry
			$journalEntry = new Entry();
			$journalEntry->entrytype_id = 4; // Journal
			$journalEntry->entry_code = $entryCode;
			$journalEntry->number = $entryCode;
			$journalEntry->date = $invoice->invoice_date;
			$journalEntry->inv_type = 2; // Purchase Invoice type
			$journalEntry->inv_id = $invoice->id;
			$journalEntry->fund_id = $fund->id;
			$journalEntry->narration = "Purchase Invoice: {$invoice->invoice_number} from {$invoice->supplier->name}";
			$journalEntry->created_by = Auth::id() ?? $invoice->created_by;

			// Calculate totals for verification
			$totalDebit = 0;
			$totalCredit = 0;

			// Prepare entry items array
			$entryItems = [];

			// Process each invoice item
			foreach ($invoice->items as $item) {
				$ledgerId = null;
				$amount = 0;

				// Determine ledger ID based on item type
				if ($item->item_type === 'product') {
					$ledgerId = $item->product->ledger_id ?? null;
					if (!$ledgerId) {
						return [
							'success' => false,
							'error' => "Product '{$item->product->name}' missing ledger mapping"
						];
					}
				} elseif ($item->item_type === 'service') {
					$ledgerId = $item->service->ledger_id ?? null;
					if (!$ledgerId) {
						return [
							'success' => false,
							'error' => "Service '{$item->service->name}' missing ledger mapping"
						];
					}
				}

				// Calculate amount based on tax inclusive setting
				if ($taxInclusiveProduct == 1) {
					// Tax inclusive - include tax in product price
					$amount = $item->total_amount; // This includes tax

					$entryItems[] = [
						'ledger_id' => $ledgerId,
						'amount' => $amount,
						'dc' => 'D', // Debit
						'details' => "{$item->quantity} x " . ($item->description ?? ($item->product->name ?? $item->service->name))
					];

					$totalDebit += $amount;
				} else {
					// Tax exclusive - separate tax entries
					$amount = $item->subtotal; // Without tax

					// Add product/service entry
					$entryItems[] = [
						'ledger_id' => $ledgerId,
						'amount' => $amount,
						'dc' => 'D', // Debit
						'details' => "{$item->quantity} x " . ($item->description ?? ($item->product->name ?? $item->service->name))
					];

					$totalDebit += $amount;

					// Add tax entry if applicable
					if ($item->tax_amount > 0 && $item->tax_id) {
						$taxLedgerId = $item->tax->ledger_id ?? null;
						if (!$taxLedgerId) {
							return [
								'success' => false,
								'error' => "Tax rate missing ledger mapping"
							];
						}

						$entryItems[] = [
							'ledger_id' => $taxLedgerId,
							'amount' => $item->tax_amount,
							'dc' => 'D', // Debit
							'details' => "Tax on " . ($item->description ?? ($item->product->name ?? $item->service->name))
						];

						$totalDebit += $item->tax_amount;
					}
				}
			}

			// Add shipping charges and other charges combined
			$totalCharges = ($invoice->shipping_charges ?? 0) + ($invoice->other_charges ?? 0);

			if ($totalCharges > 0) {
				if (!$otherChargesLedgerId) {
					return [
						'success' => false,
						'error' => 'Other charges ledger not configured in system settings'
					];
				}

				// Create combined entry for shipping and other charges
				$entryItems[] = [
					'ledger_id' => $otherChargesLedgerId,
					'amount' => $totalCharges,
					'dc' => 'D', // Debit
					'details' => 'Shipping & Other Charges'
				];

				$totalDebit += $totalCharges;
			}

			// Add supplier credit entry
			$supplierLedgerId = $invoice->supplier->ledger_id ?? null;
			if (!$supplierLedgerId) {
				return [
					'success' => false,
					'error' => "Supplier '{$invoice->supplier->name}' missing ledger mapping"
				];
			}

			$entryItems[] = [
				'ledger_id' => $supplierLedgerId,
				'amount' => $invoice->total_amount,
				'dc' => 'C', // Credit
				'details' => "Invoice: {$invoice->invoice_number}"
			];

			$totalCredit = $invoice->total_amount;

			// Verify journal is balanced
			if (abs($totalDebit - $totalCredit) > 0.01) {
				return [
					'success' => false,
					'error' => "Journal not balanced. Dr: {$totalDebit}, Cr: {$totalCredit}"
				];
			}

			// Set totals on journal entry
			$journalEntry->dr_total = $totalDebit;
			$journalEntry->cr_total = $totalCredit;
			$journalEntry->save();

			// Create entry items
			foreach ($entryItems as $itemData) {
				$entryItem = new EntryItem();
				$entryItem->entry_id = $journalEntry->id;
				$entryItem->ledger_id = $itemData['ledger_id'];
				$entryItem->amount = $itemData['amount'];
				$entryItem->dc = $itemData['dc'];
				$entryItem->details = $itemData['details'] ?? null;
				$entryItem->save();
			}

			// Update invoice to mark as migrated
			$invoice->account_migration = 1;
			$invoice->journal_entry_id = $journalEntry->id;
			$invoice->save();

			return [
				'success' => true,
				'journal_entry_id' => $journalEntry->id,
				'journal_code' => $entryCode
			];
		} catch (\Exception $e) {
			Log::error('Account migration failed', [
				'invoice_id' => $invoice->id,
				'error' => $e->getMessage()
			]);

			return [
				'success' => false,
				'error' => $e->getMessage()
			];
		}
	}
	/**
	 * Generate journal code for purchase invoice
	 */
	private function generateJournalCode($date = null)
	{
		$date = $date ?? date('Y-m-d');
		$shortYear = date('y', strtotime($date));
		$month = date('m', strtotime($date));

		// Journal entry prefix
		$prefix = 'JOR';
		$baseCode = $prefix . $shortYear . $month;

		// Use a DB transaction to avoid race conditions
		return DB::transaction(function () use ($baseCode) {
			// Get the last journal entry for this month
			$lastEntry = Entry::where('entrytype_id', 4)
				->where('entry_code', 'like', $baseCode . '%')
				->lockForUpdate()
				->orderBy('id', 'desc')
				->first();

			$lastNumber = 0;
			if ($lastEntry && $lastEntry->entry_code) {
				// Extract the last 5 digits (the counter)
				preg_match('/(\d{5})$/', $lastEntry->entry_code, $matches);
				if (isset($matches[1])) {
					$lastNumber = (int) $matches[1];
				}
			}

			$newCode = $baseCode . sprintf("%05d", $lastNumber + 1);

			// Optional: double-check uniqueness (rare case)
			while (Entry::where('entry_code', $newCode)->exists()) {
				$lastNumber++;
				$newCode = $baseCode . sprintf("%05d", $lastNumber + 1);
			}

			return $newCode;
		});
	}

	/**
	 * Manual migration endpoint - still available if needed
	 * Can be used to retry failed auto-migrations
	 */
	public function migrateToAccounting($id)
	{
		$invoice = PurchaseInvoice::find($id);

		if (!$invoice) {
			return response()->json([
				'success' => false,
				'message' => 'Purchase Invoice not found'
			], 404);
		}

		// Check if invoice is posted
		if ($invoice->status !== 'POSTED') {
			return response()->json([
				'success' => false,
				'message' => 'Only posted invoices can be migrated to accounting'
			], 400);
		}

		// Check if already migrated
		if ($invoice->account_migration == 1) {
			return response()->json([
				'success' => false,
				'message' => 'Invoice has already been migrated to accounting'
			], 400);
		}

		DB::beginTransaction();

		try {
			$migrationResult = $this->performAccountMigration($invoice);

			if (!$migrationResult['success']) {
				throw new \Exception($migrationResult['error']);
			}

			DB::commit();

			return response()->json([
				'success' => true,
				'message' => 'Invoice successfully migrated to accounting',
				'data' => [
					'journal_entry_id' => $migrationResult['journal_entry_id'],
					'journal_code' => $migrationResult['journal_code']
				]
			]);
		} catch (\Exception $e) {
			DB::rollback();

			return response()->json([
				'success' => false,
				'message' => 'Failed to migrate invoice: ' . $e->getMessage()
			], 500);
		}
	}

	/**
	 * Retry failed migrations for posted invoices
	 * Useful for bulk retry of invoices that failed auto-migration
	 */
	public function retryFailedMigrations(Request $request)
	{
		$query = PurchaseInvoice::where('status', 'POSTED')
			->where('account_migration', 0);

		if ($request->has('invoice_ids')) {
			$query->whereIn('id', $request->invoice_ids);
		}

		$invoices = $query->get();

		$results = [
			'success' => [],
			'failed' => []
		];

		foreach ($invoices as $invoice) {
			DB::beginTransaction();

			try {
				$migrationResult = $this->performAccountMigration($invoice);

				if ($migrationResult['success']) {
					DB::commit();
					$results['success'][] = [
						'invoice_id' => $invoice->id,
						'invoice_number' => $invoice->invoice_number,
						'journal_code' => $migrationResult['journal_code']
					];
				} else {
					DB::rollback();
					$results['failed'][] = [
						'invoice_id' => $invoice->id,
						'invoice_number' => $invoice->invoice_number,
						'error' => $migrationResult['error']
					];
				}
			} catch (\Exception $e) {
				DB::rollback();
				$results['failed'][] = [
					'invoice_id' => $invoice->id,
					'invoice_number' => $invoice->invoice_number,
					'error' => $e->getMessage()
				];
			}
		}

		return response()->json([
			'success' => true,
			'message' => 'Migration retry completed',
			'results' => $results,
			'summary' => [
				'total' => count($invoices),
				'success' => count($results['success']),
				'failed' => count($results['failed'])
			]
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
			'can_create_purchase_invoices' => $user->can('purchase_invoices.create'),
			'can_edit_purchase_invoices' => $user->can('purchase_invoices.edit'),
			'can_delete_purchase_invoices' => $user->can('purchase_invoices.delete'),
			'can_view_purchase_invoices' => $user->can('purchase_invoices.view'),
			'can_payment_create_purchase_invoices' => $user->can('purchase_payments.create'),
			'can_payment_view_purchase_invoices' => $user->can('purchase_payments.view'),
			'can_payment_approve_purchase_invoices' => $user->can('purchase_payments.approve'),
			'can_payment_reject_purchase_invoices' => $user->can('purchase_payments.reject'),
			'can_migrate_to_accounting_purchase_invoices' => $user->can('purchase_invoices.migrate_to_accounting'),
		];
		return $permissions;
	}
}
