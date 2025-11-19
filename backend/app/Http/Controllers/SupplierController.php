<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\PurchaseInvoice;
use App\Models\PurchasePayment;
use App\Models\Group;
use App\Models\EntryItem;
use App\Models\Entry;
use App\Models\SystemSetting;

use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Supplier::query();

            // Only include relationships if they exist
            $query->with(['ledger', 'createdByUser']);

            // Filter by status
            if ($request->filled('status')) {
                if ($request->status === 'active') {
                    $query->where('is_active', true);
                } else if ($request->status === 'inactive') {
                    $query->where('is_active', false);
                }
            }

            // Filter by supplier type
            if ($request->filled('type')) {
                $query->where('supplier_type', $request->type);
            }

            // Search functionality
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('supplier_code', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%")
                        ->orWhere('mobile_no', 'LIKE', "%{$search}%");
                });
            }

            // Sorting
            $suppliers = $query->orderBy('created_at', 'desc')
                ->paginate($request->input('per_page', 50));
            $user = Auth::user();

            $permissions = [
                'can_create_suppliers' => $user->can('suppliers.create'),
                'can_edit_suppliers' => $user->can('suppliers.edit'),
                'can_delete_suppliers' => $user->can('suppliers.delete'),
                'can_view_suppliers' => $user->can('suppliers.view'),
                'can_statement_suppliers' => $user->can('suppliers.statement'),
            ];
   
            return response()->json([
                'success' => true,
                'data' => $suppliers,
                'permissions' => $permissions
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function store(Request $request)
    {
        if (!Auth::user()->can('suppliers.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create suppliers'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'supplier_type' => 'required|in:product,service,both',
            'email' => 'nullable|email|unique:suppliers,email',
            'mobile_no' => 'required|string|max:20',
            'gst_no' => 'nullable|string|max:20',
            'credit_limit' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Generate supplier code
            $supplierCode = $this->generateSupplierCode();

            // Create supplier
            $data = $request->all();
            $data['supplier_code'] = $supplierCode;
            $data['created_by'] = Auth::id();

            // Create ledger for supplier (Accounts Payable)
            if (!isset($data['ledger_id'])) {

                $ledger_name = $data['name'] . ' (' . $supplierCode . ')';

                $ledger = $this->createSupplierLedger($ledger_name);
                $data['ledger_id'] = $ledger->id;
            }

            $supplier = Supplier::create($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Supplier created successfully',
                'data' => $supplier->load('ledger')
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create supplier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function generateSupplierCode()
    {
        $lastSupplier = Supplier::orderBy('supplier_code', 'desc')->first();

        if ($lastSupplier) {
            $lastNumber = intval(substr($lastSupplier->supplier_code, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return 'SUP' . $newNumber;
    }
    public function show($id)
    {
        $user = Auth::user();
        $permissions = [
            'can_edit_suppliers' => $user->can('suppliers.edit'),
            'can_delete_suppliers' => $user->can('suppliers.delete'),
                 'can_statement_suppliers' => $user->can('suppliers.statement'),
        ];
        $supplier = Supplier::with(['ledger', 'createdByUser'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $supplier,
            'permissions' => $permissions
        ]);
    }
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('suppliers.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit suppliers'
            ], 403);
        }
        $supplier = Supplier::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'supplier_type' => 'required|in:product,service,both',
            'email' => 'nullable|email|unique:suppliers,email,' . $supplier->id,
            'mobile_no' => 'required|string|max:20',
            'gst_no' => 'nullable|string|max:20',
            'credit_limit' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Handle ledger logic
            if ($supplier->ledger_id) {
                // Supplier has an existing ledger - update it
                $ledger = Ledger::find($supplier->ledger_id);
                if ($ledger) {
                    // Update ledger name if supplier name changed
                    if ($request->has('name')) {
                        $ledger->update([
                            'name' => $request->name . ' (' . $supplier->supplier_code . ')',
                            'notes' => 'Supplier Ledger - ' . $request->name
                        ]);
                    }
                } else {
                    // Ledger ID exists but ledger not found (data inconsistency)
                    // Create new ledger with the NEW name from request
                    $ledgerName = $request->name . ' (' . $supplier->supplier_code . ')';
                    $ledger = $this->createSupplierLedger($ledgerName);
                    $supplier->ledger_id = $ledger->id;
                }
            } else {
                // No ledger exists - create one with the NEW name from request
                $ledgerName = $request->name . ' (' . $supplier->supplier_code . ')';
                $ledger = $this->createSupplierLedger($ledgerName);
                $supplier->ledger_id = $ledger->id;
            }

            // Update supplier with all request data
            $supplier->fill($request->all());
            $supplier->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Supplier updated successfully',
                'data' => $supplier->load('ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update supplier',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function getStatement($id, Request $request)
    {
        try {
            $supplier = Supplier::with(['ledger'])->findOrFail($id);

            // Get date range
            $fromDate = $request->from_date ? Carbon::parse($request->from_date) : Carbon::now()->startOfMonth();
            $toDate = $request->to_date ? Carbon::parse($request->to_date) : Carbon::now()->endOfDay();

            // Get opening balance (transactions before from_date)
            $openingBalance = 0;
            if ($supplier->ledger_id) {
                $openingBalance = $this->calculateOpeningBalance($supplier->ledger_id, $fromDate);
            }

            // Get transactions in date range
            $transactions = $this->getSupplierTransactions($supplier, $fromDate, $toDate);

            // Calculate totals
            $totalPurchases = 0;
            $totalPayments = 0;
            $totalReturns = 0;

            foreach ($transactions as $transaction) {
                if ($transaction['type'] === 'INVOICE') {
                    $totalPurchases += $transaction['debit'];
                } elseif ($transaction['type'] === 'PAYMENT') {
                    $totalPayments += $transaction['credit'];
                } elseif ($transaction['type'] === 'RETURN' || $transaction['type'] === 'CREDIT NOTE') {
                    $totalReturns += $transaction['credit'];
                }
            }

            // Calculate closing balance
            $closingBalance = $openingBalance + $totalPurchases - $totalPayments - $totalReturns;

            // Get aging analysis
            $aging = $this->getAgingAnalysis($supplier->id);

            // Get outstanding invoices
            $outstandingInvoices = $this->getOutstandingInvoices($supplier->id);

            return response()->json([
                'success' => true,
                'data' => [
                    'supplier' => $supplier,
                    'from_date' => $fromDate->format('Y-m-d'),
                    'to_date' => $toDate->format('Y-m-d'),
                    'opening_balance' => round($openingBalance, 2),
                    'total_purchases' => round($totalPurchases, 2),
                    'total_payments' => round($totalPayments, 2),
                    'total_returns' => round($totalReturns, 2),
                    'closing_balance' => round($closingBalance, 2),
                    'transactions' => $transactions,
                    'aging' => $aging,
                    'outstanding_invoices' => $outstandingInvoices
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Helper method to calculate opening balance
    private function calculateOpeningBalance($ledgerId, $beforeDate)
    {
        // Get all entries before the specified date
        $entries = EntryItem::where('ledger_id', $ledgerId)
            ->whereHas('entry', function ($query) use ($beforeDate) {
                $query->where('date', '<', $beforeDate);
            })
            ->get();

        $balance = 0;
        foreach ($entries as $entry) {
            if ($entry->dc === 'D') {
                $balance += $entry->amount;
            } else {
                $balance -= $entry->amount;
            }
        }

        return $balance;
    }

    // Helper method to get supplier transactions
    private function getSupplierTransactions($supplier, $fromDate, $toDate)
    {
        $transactions = [];

        if (!$supplier->ledger_id) {
            return $transactions;
        }

        // Get all ledger entries in date range
        $entries = EntryItem::where('ledger_id', $supplier->ledger_id)
            ->whereHas('entry', function ($query) use ($fromDate, $toDate) {
                $query->whereBetween('date', [$fromDate, $toDate])
                    ->orderBy('date', 'asc');
            })
            ->with('entry')
            ->get();

        $runningBalance = 0;

        foreach ($entries as $entryItem) {
            $entry = $entryItem->entry;
            $type = 'JOURNAL';
            $description = $entry->notes ?? 'Transaction';

            // Determine transaction type based on entry type
            if ($entry->entrytype_id == 2) { // Payment
                $type = 'PAYMENT';
                $description = 'Payment made';
            } elseif ($entry->entrytype_id == 1) { // Receipt
                $type = 'RECEIPT';
                $description = 'Receipt';
            } elseif ($entry->entrytype_id == 5) { // Credit Note
                $type = 'CREDIT NOTE';
                $description = 'Credit Note';
            } elseif ($entry->entrytype_id == 4) { // Journal
                // Check if it's a purchase entry
                if ($entryItem->dc === 'D') {
                    $type = 'INVOICE';
                    $description = 'Purchase Invoice';
                }
            }
            $debit = $entryItem->dc === 'D' ? $entryItem->amount : 0;
            $credit = $entryItem->dc === 'C' ? $entryItem->amount : 0;

            $runningBalance = $runningBalance + ($debit - $credit);

            $transactions[] = [
                'date' => $entry->date,
                'type' => $type,
                'reference_number' => $entry->entry_code ?? $entry->number,
                'description' => $description,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $runningBalance,
            ];
        }

        return $transactions;
    }

    // Helper method to get aging analysis
    private function getAgingAnalysis($supplierId)
    {
        // This is a simplified version - you may need to adjust based on your invoice table structure
        $aging = [
            'current' => 0,
            'days_30' => 0,
            'days_60' => 0,
            'days_90' => 0,
            'over_90' => 0
        ];

        // If you have a purchase_invoices table, implement aging logic here
        // Example:
        /*
    $invoices = PurchaseInvoice::where('supplier_id', $supplierId)
        ->where('payment_status', '!=', 'PAID')
        ->get();
    
    foreach ($invoices as $invoice) {
        $daysOverdue = Carbon::now()->diffInDays($invoice->due_date);
        $balance = $invoice->total_amount - $invoice->paid_amount;
        
        if ($daysOverdue <= 0) {
            $aging['current'] += $balance;
        } elseif ($daysOverdue <= 30) {
            $aging['days_30'] += $balance;
        } elseif ($daysOverdue <= 60) {
            $aging['days_60'] += $balance;
        } elseif ($daysOverdue <= 90) {
            $aging['days_90'] += $balance;
        } else {
            $aging['over_90'] += $balance;
        }
    }
    */

        return $aging;
    }

    // Helper method to get outstanding invoices
    private function getOutstandingInvoices($supplierId)
    {
        $outstandingInvoices = [];

        // If you have a purchase_invoices table, implement this
        // Example:
        /*
    $invoices = PurchaseInvoice::where('supplier_id', $supplierId)
        ->whereIn('payment_status', ['UNPAID', 'PARTIAL'])
        ->get();
    
    foreach ($invoices as $invoice) {
        $outstandingInvoices[] = [
            'invoice_number' => $invoice->invoice_number,
            'invoice_date' => $invoice->invoice_date,
            'due_date' => $invoice->due_date,
            'days_overdue' => max(0, Carbon::now()->diffInDays($invoice->due_date, false)),
            'total_amount' => $invoice->total_amount,
            'paid_amount' => $invoice->paid_amount ?? 0,
            'balance_amount' => $invoice->total_amount - ($invoice->paid_amount ?? 0),
            'payment_status' => $invoice->payment_status
        ];
    }
    */

        return $outstandingInvoices;
    }

    // Add this method for getting transactions
    public function getTransactions($id, Request $request)
    {
        try {
            $supplier = Supplier::findOrFail($id);

            // Implement transaction fetching logic
            $transactions = [];

            return response()->json([
                'success' => true,
                'data' => $transactions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch transactions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    private function getTradeCreditorGroup()
    {
        // First try to find by TC flag
        $group = Group::where('tc', 1)->first();

        if (!$group) {
            throw new \Exception('Trade Creditors group not found. Please ensure TC group is configured.');
        }

        return $group;
    }
    private function createSupplierLedger($supplierName, $supplierId = null)
    {
        // Get the Trade Creditors group
        $group = $this->getTradeCreditorGroup();

        // Get left code from group
        $leftCode = $group->code; // Should be 2110

        // Generate the next available right code
        $rightCode = $this->generateNextRightCode($leftCode);


        // Create the ledger
        $ledger = Ledger::create([
            'group_id' => $group->id,
            'name' => $supplierName,
            'left_code' => $leftCode,
            'right_code' => $rightCode,
            'type' => 0,
            'notes' => 'Supplier Ledger - ' . $supplierName,
            'created_by' => Auth::id()
        ]);

        return $ledger;
    }
    private function generateNextRightCode($leftCode)
    {
        // Find the highest existing right_code for this left_code
        $lastLedger = Ledger::where('left_code', $leftCode)
            ->orderByRaw('CAST(right_code AS INTEGER) DESC')
            ->first();

        if ($lastLedger) {
            // Extract the numeric part and increment
            $lastNumber = intval($lastLedger->right_code);
            $nextNumber = $lastNumber + 1;
        } else {
            // Start from 1 if no existing ledger
            $nextNumber = 1;
        }

        // Format with leading zeros (4 digits)
        return str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
    public function checkCanDelete($id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            $canDelete = true;
            $warnings = [];
            $blockers = [];

            // Your existing logic...

            // Check for supplier transactions (purchase invoices, payments)
            $hasTransactions = false;

            // Check if supplier has purchase invoices
            if (Schema::hasTable('purchase_invoices')) {
                $invoiceCount = DB::table('purchase_invoices')
                    ->where('supplier_id', $id)
                    ->whereNull('deleted_at')
                    ->count();

                if ($invoiceCount > 0) {
                    $hasTransactions = true;
                    $blockers[] = "Has $invoiceCount purchase invoice(s)";
                }
            }

            // Check if supplier has payments
            if (Schema::hasTable('purchase_payments')) {
                $paymentCount = DB::table('purchase_payments')
                    ->where('supplier_id', $id)
                    ->whereNull('deleted_at')
                    ->count();

                if ($paymentCount > 0) {
                    $hasTransactions = true;
                    $blockers[] = "Has $paymentCount payment(s)";
                }
            }

            // Check ledger status
            // $ledgerInfo = null;
            // if ($supplier->ledger_id) {
            //     $ledger = Ledger::find($supplier->ledger_id);
            //     if ($ledger) {
            //         $ledgerStatus = $ledger->canBeSafelyDeleted();

            //         if (!$ledgerStatus['can_delete']) {
            //             $canDelete = false;
            //             $blockers[] = "Ledger: " . $ledgerStatus['reason'];
            //         } else {
            //             $warnings[] = "Associated ledger '{$ledger->name}' will also be deleted";
            //         }

            //         $ledgerInfo = [
            //             'id' => $ledger->id,
            //             'name' => $ledger->name,
            //             'can_delete' => $ledgerStatus['can_delete'],
            //             'reason' => $ledgerStatus['reason']
            //         ];
            //     }
            // }

            if ($hasTransactions) {
                $canDelete = false;
            }
            return response()->json([
                'success' => true,
                'data' => [  // Make sure data is wrapped properly
                    'can_delete' => $canDelete,
                    'warnings' => $warnings,
                    'blockers' => $blockers,
                    'ledger_info' => $ledgerInfo ?? null,
                    'supplier' => [
                        'id' => $supplier->id,
                        'name' => $supplier->name,
                        'code' => $supplier->supplier_code
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error checking deletion status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('suppliers.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete suppliers'
            ], 403);
        }
        DB::beginTransaction();
        try {
            $supplier = Supplier::findOrFail($id);

            // First check if deletion is possible
            $checkResponse = $this->checkCanDelete($id);
            $checkData = json_decode($checkResponse->getContent(), true);

            // Fix: Access can_delete from the data key
            if (!$checkData['success'] || !isset($checkData['data']['can_delete']) || !$checkData['data']['can_delete']) {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete supplier',
                    'blockers' => $checkData['data']['blockers'] ?? ['Unknown restriction']
                ], 422);
            }

            // Delete the ledger if it exists and is not used elsewhere
            if ($supplier->ledger_id) {
                $ledger = Ledger::find($supplier->ledger_id);
                if ($ledger) {
                    $ledgerStatus = $ledger->canBeSafelyDeleted();
                    if ($ledgerStatus['can_delete']) {
                        $ledger->delete(); // Soft delete
                    }
                }
            }

            // Soft delete the supplier
            $supplier->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Supplier deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting supplier',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getActiveSuppliers(Request $request)
    {
        try {
            $suppliers = Supplier::where('is_active', true)
                ->orderBy('name', 'asc')
                ->get(['id', 'supplier_code', 'name', 'email', 'mobile_no']);

            return response()->json([
                'success' => true,
                'data' => $suppliers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getSupplierStatement($id, Request $request)
    {

        try {
            $supplier = Supplier::with(['ledger'])->findOrFail($id);

            // Get date range with defaults
            $fromDate = $request->from_date ? Carbon::parse($request->from_date) : Carbon::now()->startOfMonth();
            $toDate = $request->to_date ? Carbon::parse($request->to_date) : Carbon::now()->endOfDay();

            // Get opening balance (transactions before from_date)
            $openingBalance = 0;
            if ($supplier->ledger_id) {
                $openingBalance = $this->calculateOpeningBalance($supplier->ledger_id, $fromDate);
            }

            // Get transactions in date range
            $transactions = $this->getSupplierTransactions($supplier, $fromDate, $toDate);

            // Calculate totals
            $totalPurchases = 0;
            $totalPayments = 0;
            $totalReturns = 0;
            $runningBalance = $openingBalance;

            // Process transactions and calculate running balance
            $processedTransactions = [];
            foreach ($transactions as $transaction) {
                if ($transaction['type'] === 'INVOICE') {
                    $totalPurchases += $transaction['debit'];
                    $runningBalance += $transaction['debit'];
                } elseif ($transaction['type'] === 'PAYMENT') {
                    $totalPayments += $transaction['credit'];
                    $runningBalance -= $transaction['credit'];
                } elseif ($transaction['type'] === 'RETURN' || $transaction['type'] === 'CREDIT NOTE') {
                    $totalReturns += $transaction['credit'];
                    $runningBalance -= $transaction['credit'];
                }

                // Add running balance to transaction
                $transaction['balance'] = $runningBalance;
                $processedTransactions[] = $transaction;
            }

            // Calculate closing balance
            $closingBalance = $runningBalance;

            // Get aging analysis
            $aging = $this->getAgingAnalysis($supplier->id);

            // Get outstanding invoices
            $outstandingInvoices = $this->getOutstandingInvoices($supplier->id);

            return response()->json([
                'success' => true,
                'data' => [
                    'supplier' => [
                        'id' => $supplier->id,
                        'name' => $supplier->name,
                        'code' => $supplier->supplier_code,
                        'address' => $supplier->address,
                        'mobile_no' => $supplier->mobile_no,
                        'email' => $supplier->email,
                    ],
                    'period' => [
                        'from' => $fromDate->format('Y-m-d'),
                        'to' => $toDate->format('Y-m-d')
                    ],
                    'opening_balance' => round($openingBalance, 2),
                    'total_invoices' => round($totalPurchases, 2),
                    'total_payments' => round($totalPayments, 2),
                    'total_returns' => round($totalReturns, 2),
                    'closing_balance' => round($closingBalance, 2),
                    'transactions' => $processedTransactions,
                    'aging' => $aging,
                    'outstanding_invoices' => $outstandingInvoices
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getList()
    {

        try {
            $suppliers = Supplier::where('is_active', true)
                ->orderBy('name')
                ->select('id', 'name', 'supplier_code')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $suppliers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getDefaultValues()
    {
        try {
            // Fetch specific settings from system_settings table
            $countrySettings = DB::table('system_settings')
                ->where('key', 'temple_country')
                ->first();

            $phoneCodeSettings = DB::table('system_settings')
                ->where('key', 'temple_phone_code')
                ->first();

            // Extract values with fallbacks
            $defaultCountry = $countrySettings ? $countrySettings->value : 'Malaysia';
            $defaultPhoneCode = $phoneCodeSettings ? $phoneCodeSettings->value : '+60';

            return response()->json([
                'success' => true,
                'data' => [
                    'default_country' => $defaultCountry,
                    'default_mobile_code' => $defaultPhoneCode,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch default settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
