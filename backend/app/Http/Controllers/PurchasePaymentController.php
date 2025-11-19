<?php

namespace App\Http\Controllers;

use App\Models\PurchasePayment;
use App\Models\PurchaseInvoice;
use App\Models\Supplier;
use App\Models\PaymentMode;
use App\Models\Entry;
use App\Models\EntryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class PurchasePaymentController extends Controller
{
    /**
     * Display a listing of purchase payments
     */
    public function index(Request $request)
    {

        try {
            $query = PurchasePayment::with(['invoice', 'supplier', 'paymentMode', 'creator']);
            
            // Filter by date range
            if ($request->has('from_date')) {
                $query->whereDate('payment_date', '>=', $request->from_date);
            }
            if ($request->has('to_date')) {
                $query->whereDate('payment_date', '<=', $request->to_date);
            }
            
            // Filter by supplier
            if ($request->has('supplier_id') && $request->supplier_id) {
                $query->where('supplier_id', $request->supplier_id);
            }
            
            // Filter by payment mode
            if ($request->has('payment_mode_id') && $request->payment_mode_id) {
                $query->where('payment_mode_id', $request->payment_mode_id);
            }
            
            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }
            
            // Search
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('payment_number', 'LIKE', "%$search%")
                      ->orWhere('reference_number', 'LIKE', "%$search%")
                      ->orWhereHas('supplier', function($sq) use ($search) {
                          $sq->where('name', 'LIKE', "%$search%");
                      })
                      ->orWhereHas('invoice', function($iq) use ($search) {
                          $iq->where('invoice_number', 'LIKE', "%$search%");
                      });
                });
            }
            
            // Sort
            $sortBy = $request->get('sort_by', 'payment_date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);
            
            // Paginate
            $payments = $query->paginate($request->get('per_page', 50));
            
            return response()->json([
                'success' => true,
                'data' => $payments
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get payments for a specific invoice
     */
    public function getInvoicePayments($invoiceId)
    {
        try {
            $payments = PurchasePayment::with(['paymentMode', 'creator'])
                ->where('invoice_id', $invoiceId)
                ->orderBy('payment_date', 'desc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $payments
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Store a new purchase payment
     */
    public function store(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|uuid|exists:purchase_invoices,id',
            'payment_date' => 'required|date',
            'payment_mode_id' => 'required|exists:payment_modes,id',
            'amount' => 'required|numeric|min:0.01',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'bank_branch' => 'nullable|string|max:100',
            'cheque_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);
        
        DB::beginTransaction();
        
        try {
   
            // Get invoice details
            $invoice = PurchaseInvoice::findOrFail($request->invoice_id);
           
            // Check if amount exceeds balance
            if ($request->amount > $invoice->balance_amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment amount cannot exceed invoice balance of ' . number_format($invoice->balance_amount, 2)
                ], 422);
            }
              
            // Generate payment number
            $paymentNumber = $this->generatePaymentNumber();
            
            // Create payment
            $payment = new PurchasePayment();
            $payment->id = Str::uuid();
            $payment->payment_number = $paymentNumber;
            $payment->payment_date = $request->payment_date;
            $payment->invoice_id = $request->invoice_id;
            $payment->supplier_id = $invoice->supplier_id;
            $payment->payment_mode_id = $request->payment_mode_id;
            $payment->amount = $request->amount;
            $payment->reference_number = $request->reference_number;
            $payment->bank_name = $request->bank_name;
            $payment->bank_branch = $request->bank_branch;
            $payment->cheque_date = $request->cheque_date;
            $payment->notes = $request->notes;
            $payment->status = 'COMPLETED';
            $payment->created_by = Auth::id();
            $payment->updated_by = Auth::id();
            $payment->save();
            
            // Update invoice paid amount and payment status
            $this->updateInvoicePaymentStatus($invoice);
            
            // Create accounting entry (if accounting module is integrated)
            $this->createAccountingEntry($payment, $invoice);
            
            // Update supplier balance
            $this->updateSupplierBalance($invoice->supplier_id);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment added successfully',
                'data' => $payment->load(['invoice', 'supplier', 'paymentMode'])
            ], 201);
            
        } catch (Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to add payment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Display the specified payment
     */
    public function show($id)
    {
        try {
            $payment = PurchasePayment::with([
                'invoice', 
                'invoice.items',
                'supplier', 
                'paymentMode', 
                'creator', 
                'updater'
            ])->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $payment
            ]);
         
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found'
            ], 404);
        }
    }
    
    /**
     * Update the specified payment
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'payment_date' => 'sometimes|required|date',
            'reference_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:100',
            'bank_branch' => 'nullable|string|max:100',
            'cheque_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);
        
        DB::beginTransaction();
        
        try {
            $payment = PurchasePayment::findOrFail($id);
            
            // Only allow updating if status is PENDING
            if ($payment->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot update completed payment'
                ], 422);
            }
            
            // Update payment details (amount cannot be changed)
            $payment->payment_date = $request->payment_date ?? $payment->payment_date;
            $payment->reference_number = $request->reference_number;
            $payment->bank_name = $request->bank_name;
            $payment->bank_branch = $request->bank_branch;
            $payment->cheque_date = $request->cheque_date;
            $payment->notes = $request->notes;
            $payment->updated_by = Auth::id();
            $payment->save();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment updated successfully',
                'data' => $payment->load(['invoice', 'supplier', 'paymentMode'])
            ]);
            
        } catch (Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Cancel a payment
     */
    public function cancel($id)
    {
        DB::beginTransaction();
        
        try {
            $payment = PurchasePayment::findOrFail($id);
            
            // Check if already cancelled
            if ($payment->status === 'CANCELLED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment is already cancelled'
                ], 422);
            }
            
            // Update payment status
            $payment->status = 'CANCELLED';
            $payment->updated_by = Auth::id();
            $payment->save();
            
            // Update invoice payment status
            $invoice = PurchaseInvoice::findOrFail($payment->invoice_id);
            $this->updateInvoicePaymentStatus($invoice);
            
            // Reverse accounting entry
            $this->reverseAccountingEntry($payment);
            
            // Update supplier balance
            $this->updateSupplierBalance($payment->supplier_id);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Payment cancelled successfully'
            ]);
            
        } catch (Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel payment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get payment summary for dashboard
     */
    public function summary(Request $request)
    {
        try {
            $startDate = $request->get('from_date', Carbon::now()->startOfMonth());
            $endDate = $request->get('to_date', Carbon::now()->endOfMonth());
            
            $summary = [
                'total_payments' => PurchasePayment::whereBetween('payment_date', [$startDate, $endDate])
                    ->where('status', 'COMPLETED')
                    ->count(),
                    
                'total_amount' => PurchasePayment::whereBetween('payment_date', [$startDate, $endDate])
                    ->where('status', 'COMPLETED')
                    ->sum('amount'),
                    
                'pending_payments' => PurchasePayment::where('status', 'PENDING')->count(),
                
                'pending_amount' => PurchasePayment::where('status', 'PENDING')->sum('amount'),
                
                'payment_modes' => PurchasePayment::with('paymentMode')
                    ->whereBetween('payment_date', [$startDate, $endDate])
                    ->where('status', 'COMPLETED')
                    ->selectRaw('payment_mode_id, sum(amount) as total')
                    ->groupBy('payment_mode_id')
                    ->get()
                    ->map(function($item) {
                        return [
                            'mode' => $item->paymentMode->name ?? 'Unknown',
                            'amount' => $item->total
                        ];
                    }),
                    
                'recent_payments' => PurchasePayment::with(['supplier', 'invoice'])
                    ->where('status', 'COMPLETED')
                    ->orderBy('payment_date', 'desc')
                    ->limit(5)
                    ->get()
            ];
            
            return response()->json([
                'success' => true,
                'data' => $summary
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate payment receipt PDF
     */
    public function generateReceipt($id)
    {
        try {
            $payment = PurchasePayment::with([
                'invoice',
                'supplier',
                'paymentMode'
            ])->findOrFail($id);
            
            // Here you would generate PDF using a package like DomPDF or TCPDF
            // For now, returning the data
            
            return response()->json([
                'success' => true,
                'data' => $payment,
                'message' => 'Receipt generation not yet implemented'
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate receipt: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Private helper methods
     */
    
    private function generatePaymentNumber()
    {
        $year = Carbon::now()->format('Y');
        $lastPayment = PurchasePayment::whereYear('created_at', $year)
            ->orderBy('payment_number', 'desc')
            ->first();
        
        if ($lastPayment) {
            $lastNumber = intval(substr($lastPayment->payment_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return "PAY/{$year}/{$newNumber}";
    }
    
    private function updateInvoicePaymentStatus($invoice)
    {
        // Calculate total paid amount
        $totalPaid = PurchasePayment::where('invoice_id', $invoice->id)
            ->where('status', 'COMPLETED')
            ->sum('amount');
        
        $invoice->paid_amount = $totalPaid;
        
        // Update payment status
        if ($totalPaid >= $invoice->total_amount) {
            $invoice->payment_status = 'PAID';
        } elseif ($totalPaid > 0) {
            $invoice->payment_status = 'PARTIAL';
        } else {
            $invoice->payment_status = 'UNPAID';
        }
        
        $invoice->save();
        
        // Update related PO if exists
        if ($invoice->po_id) {
            $this->updatePOPaymentStatus($invoice->po_id);
        }
    }
    
    private function updatePOPaymentStatus($poId)
    {
        $po = \App\Models\PurchaseOrder::find($poId);
        if ($po) {
            // Get all invoices for this PO
            $invoices = PurchaseInvoice::where('po_id', $poId)->get();
            
            $allPaid = true;
            $anyPaid = false;
            
            foreach ($invoices as $invoice) {
                if ($invoice->payment_status !== 'PAID') {
                    $allPaid = false;
                }
                if ($invoice->payment_status !== 'UNPAID') {
                    $anyPaid = true;
                }
            }
            
            if ($allPaid) {
                $po->payment_status = 'PAID';
            } elseif ($anyPaid) {
                $po->payment_status = 'PARTIAL';
            } else {
                $po->payment_status = 'UNPAID';
            }
            
            $po->save();
        }
    }
    
    private function updateSupplierBalance($supplierId)
    {
        $supplier = Supplier::find($supplierId);
     
        if ($supplier) {
            // Calculate total outstanding
            $totalOutstanding = PurchaseInvoice::where('supplier_id', $supplierId)
                ->where('status', 'POSTED')
                ->sum('balance_amount');
            
            $supplier->current_balance = $totalOutstanding;
            $supplier->save();
        }
    }
    
    private function createAccountingEntry($payment, $invoice)
    {
        // Skip if accounting module not integrated
        if (!class_exists('\App\Models\Entry')) {
            return;
        }
        
        try {
            $paymentMode = PaymentMode::find($payment->payment_mode_id);
            $supplier = Supplier::find($payment->supplier_id);
            
            // Create payment entry
            $entry = new Entry();
            $entry->entry_code = 'PAY-' . $payment->payment_number;
            $entry->entrytype_id = 2; // Payment type
            $entry->date = $payment->payment_date;
            $entry->dr_total = $payment->amount;
            $entry->cr_total = $payment->amount;
            $entry->notes = "Payment to {$supplier->name} against Invoice {$invoice->invoice_number}";
            $entry->inv_type = 4; // Purchase Payment
            $entry->inv_id = $payment->id;
            $entry->save();
            
            // Debit: Supplier account (reducing payable)
            $debitItem = new EntryItem();
            $debitItem->entry_id = $entry->id;
            $debitItem->ledger_id = $supplier->ledger_id;
            $debitItem->amount = $payment->amount;
            $debitItem->dc = 'D';
            $debitItem->save();
            
            // Credit: Bank/Cash account
            $creditItem = new EntryItem();
            $creditItem->entry_id = $entry->id;
            $creditItem->ledger_id = $paymentMode->ledger_id;
            $creditItem->amount = $payment->amount;
            $creditItem->dc = 'C';
            $creditItem->save();
            
        } catch (Exception $e) {
            // Log error but don't fail the payment
            \Log::error('Failed to create accounting entry for payment: ' . $e->getMessage());
        }
    }
    
    private function reverseAccountingEntry($payment)
    {
        // Skip if accounting module not integrated
        if (!class_exists('\App\Models\Entry')) {
            return;
        }
        
        try {
            // Find and reverse the entry
            $entry = Entry::where('inv_type', 4)
                ->where('inv_id', $payment->id)
                ->first();
                
            if ($entry) {
                // Create reversal entry
                $reversal = new Entry();
                $reversal->entry_code = 'REV-' . $entry->entry_code;
                $reversal->entrytype_id = $entry->entrytype_id;
                $reversal->date = Carbon::now();
                $reversal->dr_total = $entry->cr_total; // Reverse amounts
                $reversal->cr_total = $entry->dr_total;
                $reversal->notes = "Reversal of " . $entry->notes;
                $reversal->save();
                
                // Reverse the entry items
                foreach ($entry->items as $item) {
                    $reversalItem = new EntryItem();
                    $reversalItem->entry_id = $reversal->id;
                    $reversalItem->ledger_id = $item->ledger_id;
                    $reversalItem->amount = $item->amount;
                    $reversalItem->dc = $item->dc === 'D' ? 'C' : 'D'; // Reverse debit/credit
                    $reversalItem->save();
                }
            }
        } catch (Exception $e) {
            \Log::error('Failed to reverse accounting entry: ' . $e->getMessage());
        }
    }
    /**
 * Get payment history with detailed filtering and statistics
 */
public function paymentHistory(Request $request)
{
    try {
        // Get invoices with payment information
        $query = PurchaseInvoice::with([
            'supplier:id,name,supplier_code',
            'payments' => function($q) {
                $q->where('status', 'COMPLETED')
                  ->orderBy('payment_date', 'desc');
            }
        ])->where('status', 'POSTED');
        
        // Filter by invoice number
        if ($request->filled('invoice')) {
            $query->where('invoice_number', 'LIKE', '%' . $request->invoice . '%');
        }
        
        // Filter by supplier
        if ($request->filled('supplier')) {
            $query->where('supplier_id', $request->supplier);
        }
        
        // Filter by date range
        if ($request->filled('from_date')) {
            $query->whereDate('invoice_date', '>=', $request->from_date);
        }
        
        if ($request->filled('to_date')) {
            $query->whereDate('invoice_date', '<=', $request->to_date);
        }
        
        // Filter by payment status
        if ($request->filled('status')) {
            if ($request->status == 'PAID') {
                $query->where('payment_status', 'PAID');
            } elseif ($request->status == 'PARTIAL') {
                $query->where('payment_status', 'PARTIAL');
            } elseif ($request->status == 'PENDING') {
                $query->where('payment_status', 'UNPAID');
            }
        }
        
        // Get the invoices
        $invoices = $query->orderBy('invoice_date', 'desc')->get();
        
        // Transform the data for the frontend
        $paymentHistory = $invoices->map(function($invoice) {
            // Get the last payment date
            $lastPayment = $invoice->payments->first();
            
            return [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'supplier_name' => $invoice->supplier->name ?? 'N/A',
                'supplier_id' => $invoice->supplier_id,
                'invoice_date' => $invoice->invoice_date,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount ?? 0,
                'balance_amount' => $invoice->balance_amount ?? ($invoice->total_amount - ($invoice->paid_amount ?? 0)),
                'payment_status' => $invoice->payment_status ?? 'PENDING',
                'last_payment_date' => $lastPayment ? $lastPayment->payment_date : null,
                'payments_count' => $invoice->payments->count()
            ];
        });
        
        return response()->json([
            'success' => true,
            'data' => $paymentHistory
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch payment history',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Calculate payment statistics
 */
private function calculatePaymentStatistics($payments)
{
    $totalAmount = 0;
    $completedAmount = 0;
    $pendingAmount = 0;
    $cancelledAmount = 0;
    $completedCount = 0;
    $pendingCount = 0;
    $cancelledCount = 0;
    
    foreach ($payments as $payment) {
        $totalAmount += $payment->amount;
        
        switch ($payment->status) {
            case 'COMPLETED':
                $completedAmount += $payment->amount;
                $completedCount++;
                break;
            case 'PENDING':
                $pendingAmount += $payment->amount;
                $pendingCount++;
                break;
            case 'CANCELLED':
                $cancelledAmount += $payment->amount;
                $cancelledCount++;
                break;
        }
    }
    
    // Get payment mode breakdown
    $paymentModeBreakdown = $payments->groupBy('payment_mode_id')
        ->map(function($group) {
            $mode = $group->first()->paymentMode;
            return [
                'mode' => $mode ? $mode->name : 'Unknown',
                'count' => $group->count(),
                'amount' => $group->sum('amount')
            ];
        })->values();
    
    // Get top suppliers by payment amount
    $topSuppliers = $payments->groupBy('supplier_id')
        ->map(function($group) {
            $supplier = $group->first()->supplier;
            return [
                'supplier' => $supplier ? $supplier->name : 'Unknown',
                'count' => $group->count(),
                'amount' => $group->sum('amount')
            ];
        })
        ->sortByDesc('amount')
        ->take(5)
        ->values();
    
    return [
        'summary' => [
            'total_payments' => $payments->count(),
            'total_amount' => round($totalAmount, 2),
            'completed' => [
                'count' => $completedCount,
                'amount' => round($completedAmount, 2)
            ],
            'pending' => [
                'count' => $pendingCount,
                'amount' => round($pendingAmount, 2)
            ],
            'cancelled' => [
                'count' => $cancelledCount,
                'amount' => round($cancelledAmount, 2)
            ]
        ],
        'payment_modes' => $paymentModeBreakdown,
        'top_suppliers' => $topSuppliers,
        'average_payment' => $payments->count() > 0 ? round($totalAmount / $payments->count(), 2) : 0
    ];
}

/**
 * Get payment summary report
 */
public function paymentSummary(Request $request)
{
    try {
        $startDate = $request->get('from_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('to_date', Carbon::now()->endOfMonth());
        
        // Get payment summary grouped by supplier
        $supplierSummary = PurchasePayment::with(['supplier', 'invoice'])
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->where('status', 'COMPLETED')
            ->selectRaw('
                supplier_id,
                COUNT(*) as payment_count,
                SUM(amount) as total_paid,
                MIN(payment_date) as first_payment,
                MAX(payment_date) as last_payment
            ')
            ->groupBy('supplier_id')
            ->get()
            ->map(function($item) {
                return [
                    'supplier' => $item->supplier ? [
                        'id' => $item->supplier->id,
                        'name' => $item->supplier->name,
                        'code' => $item->supplier->supplier_code
                    ] : null,
                    'payment_count' => $item->payment_count,
                    'total_paid' => round($item->total_paid, 2),
                    'first_payment' => $item->first_payment,
                    'last_payment' => $item->last_payment
                ];
            });
        
        // Get monthly trend
        $monthlyTrend = PurchasePayment::whereBetween('payment_date', [$startDate, $endDate])
            ->where('status', 'COMPLETED')
            ->selectRaw('
                DATE_FORMAT(payment_date, "%Y-%m") as month,
                COUNT(*) as count,
                SUM(amount) as amount
            ')
            ->groupBy('month')
            ->orderBy('month')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'from' => $startDate,
                    'to' => $endDate
                ],
                'supplier_summary' => $supplierSummary,
                'monthly_trend' => $monthlyTrend,
                'totals' => [
                    'total_suppliers' => $supplierSummary->count(),
                    'total_payments' => $supplierSummary->sum('payment_count'),
                    'total_amount' => $supplierSummary->sum('total_paid')
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to generate payment summary',
            'error' => $e->getMessage()
        ], 500);
    }
}
}