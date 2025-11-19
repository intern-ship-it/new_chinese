<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Entry;
use App\Models\EntryItem;
use App\Models\Ledger;
use App\Models\Group;
use App\Models\Fund;
use App\Models\AcYear;
use App\Models\AcYearLedgerBalance;
use App\Models\EntryApproval;
use App\Models\EntryItemApproval;
use App\Http\Controllers\EntriesApprovalController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class EntriesController extends Controller
{
    /**
     * Get all entries with filters
     */
    public function index(Request $request)
    {
        try {
			$activeYear = AcYear::where('status', 1)->first();
            $query = Entry::with(['entryItems.ledger', 'fund', 'creator']);

            // Filter by entry type
            if ($request->filled('entrytype_id')) {
                $query->where('entrytype_id', $request->entrytype_id);
            }

            // Filter by date range
            if ($request->filled('from_date')) {
                $query->whereDate('date', '>=', $request->from_date);
            }else{
				$query->whereDate('date', '>=', $activeYear->from_year_month);
			}
            if ($request->filled('to_date')) {
				if(($request->to_date > $activeYear->to_year_month) && !empty($activeYear->has_closed)) $request->to_date = $activeYear->to_year_month;
                $query->whereDate('date', '<=', $request->to_date);
            }else{
				if(!empty($activeYear->has_closed)) $query->whereDate('date', '<=', $activeYear->to_year_month);
			}

            // Filter by fund
            if ($request->filled('fund_id')) {
                $query->where('fund_id', $request->fund_id);
            }

            // Search by entry code or narration
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('entry_code', 'ILIKE', "%{$search}%")
                        ->orWhere('narration', 'ILIKE', "%{$search}%")
                        ->orWhere('paid_to', 'ILIKE', "%{$search}%");
                });
            }

            // Sort
            $sortBy = $request->get('sort_by', 'date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder)->orderBy('created_at', 'desc');

            // Paginate
            $perPage = $request->get('per_page', 20);
            $entries = $query->paginate($perPage);

            // Add additional info for each entry
            $entries->getCollection()->transform(function ($entry) {
                $entry->can_edit = (is_null($entry->inv_type) && is_null($entry->inv_id)) && empty($entry->has_closed);
                $entry->can_delete = (is_null($entry->inv_type) && is_null($entry->inv_id)) && empty($entry->has_closed);
                $entry->entry_type_name = $this->getEntryTypeName($entry->entrytype_id);
                $entry->is_balanced = $this->isBalanced($entry);
                return $entry;
            });

            return response()->json([
                'success' => true,
                'data' => $entries
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching entries: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching entries: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get entry types
     */
    public function getEntryTypes()
    {
        $types = [
            ['id' => 1, 'name' => 'Receipt', 'code' => 'REC', 'short_name' => 'REC'],
            ['id' => 2, 'name' => 'Payment', 'code' => 'PAY', 'short_name' => 'PAY'],
            ['id' => 3, 'name' => 'Contra', 'code' => 'CON', 'short_name' => 'CON'],
            ['id' => 4, 'name' => 'Journal', 'code' => 'JOR', 'short_name' => 'JOR'],
            ['id' => 5, 'name' => 'Credit Note', 'code' => 'CRN', 'short_name' => 'CRN'],
            ['id' => 6, 'name' => 'Debit Note', 'code' => 'DBN', 'short_name' => 'DBN'],
            ['id' => 7, 'name' => 'Inventory Journal', 'code' => 'IVJ', 'short_name' => 'IVJ']
        ];

        return response()->json([
            'success' => true,
            'data' => $types
        ]);
    }

    /**
     * Store Receipt Entry
     */
    public function storeReceipt(Request $request)
    {

        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'debit_account' => 'required|exists:ledgers,id',
            'payment_mode' => 'required|in:CASH,CHEQUE,ONLINE',
            'received_from' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.ledger_id' => 'required|exists:ledgers,id',
            'items.*.amount' => 'required|numeric|min:0.01',
            'items.*.details' => 'nullable|string'
        ]);

        // Validate bank/cash account
        $debitLedger = Ledger::find($request->debit_account);
        if ($debitLedger->type != 1) {
            return response()->json([
                'success' => false,
                'message' => 'Debit account must be a bank or cash account'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate entry code
            $entryCode = $request->receipt_code;

            // Calculate total
            $totalAmount = collect($request->items)->sum('amount');
            $rec_amount = $totalAmount;

            // Handle discount if provided
            if ($request->filled('discount_amount') && $request->discount_amount > 0) {
                if (!$request->filled('discount_ledger')) {
                    throw new \Exception('Discount ledger is required when discount amount is provided');
                }
                $rec_amount -= $request->discount_amount;
            }

            // Create entry
            $entry = new Entry();
            $entry->entrytype_id = 1; // Receipt
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = $request->date;
            $entry->dr_total = $totalAmount;
            $entry->cr_total = $totalAmount;
            $entry->narration = $request->narration;
            $entry->fund_id = $request->fund_id;
            $entry->payment = $request->payment_mode;
            $entry->paid_to = $request->received_from;
            $entry->created_by = Auth::id();

            // Add payment specific fields
            if ($request->payment_mode === 'CHEQUE') {
                $entry->cheque_no = $request->cheque_no;
                $entry->cheque_date = $request->cheque_date;
                $entry->bank_name = $request->bank_name;
            } elseif ($request->payment_mode === 'ONLINE') {
                $entry->transaction_no = $request->transaction_no;
                $entry->transaction_date = $request->transaction_date;
            }

            $entry->save();

            // Create debit entry (Bank/Cash)
            $debitItem = new EntryItem();
            $debitItem->entry_id = $entry->id;
            $debitItem->ledger_id = $request->debit_account;
            $debitItem->amount = $rec_amount;
            $debitItem->dc = 'D';
            $debitItem->save();

            // Create credit entries for items
            foreach ($request->items as $item) {
                $creditItem = new EntryItem();
                $creditItem->entry_id = $entry->id;
                $creditItem->ledger_id = $item['ledger_id'];
                $creditItem->amount = $item['amount'];
                $creditItem->dc = 'C';
                $creditItem->details = $item['details'] ?? null;
                $creditItem->save();
            }

            // Handle discount if provided
            if ($request->filled('discount_amount') && $request->discount_amount > 0) {
                $discountItem = new EntryItem();
                $discountItem->entry_id = $entry->id;
                $discountItem->ledger_id = $request->discount_ledger;
                $discountItem->amount = $request->discount_amount;
                $discountItem->is_discount = 1;
                $discountItem->dc = 'D';
                $discountItem->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Receipt created successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating receipt: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating receipt: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store Payment Entry with Approval Check
     * Replace the existing storePayment method in EntriesController.php
     */
    public function storePayment(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'credit_account' => 'required|exists:ledgers,id',
            'payment_mode' => 'required|in:CASH,CHEQUE,ONLINE',
            'paid_to' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.ledger_id' => 'required|exists:ledgers,id',
            'items.*.amount' => 'required|numeric|min:0.01',
            'items.*.details' => 'nullable|string'
        ]);

        // Validate bank/cash account
        $creditLedger = Ledger::find($request->credit_account);
        if ($creditLedger->type != 1) {
            return response()->json([
                'success' => false,
                'message' => 'Credit account must be a bank or cash account'
            ], 422);
        }

        // Calculate total amount
        $totalAmount = collect($request->items)->sum('amount');

        // Check if approval is required
        $approvalController = new EntriesApprovalController();
        $needsApproval = $approvalController->checkApprovalRequired($totalAmount);

        DB::beginTransaction();

        try {
            // Generate entry code
            $entryCode = $request->payment_code;

            if ($needsApproval) {
                // Create entry in approval table
                $approval = new EntryApproval();
                $approval->entrytype_id = 2; // Payment
                $approval->number = $entryCode;
                $approval->entry_code = $entryCode;
                $approval->date = $request->date;
                $approval->dr_total = $totalAmount;
                $approval->cr_total = $totalAmount;
                $approval->narration = $request->narration;
                $approval->fund_id = $request->fund_id;
                $approval->payment = $request->payment_mode;
                $approval->paid_to = $request->paid_to;
                $approval->created_by = Auth::id();
                $approval->approval_status = 'pending';

                // Add payment specific fields
                if ($request->payment_mode === 'CHEQUE') {
                    $approval->cheque_no = $request->cheque_no;
                    $approval->cheque_date = $request->cheque_date;
                    $approval->bank_name = $request->bank_name;
                } elseif ($request->payment_mode === 'ONLINE') {
                    $approval->transaction_no = $request->transaction_no;
                    $approval->transaction_date = $request->transaction_date;
                }

                $approval->save();

                // Create debit entries for items in approval table
                foreach ($request->items as $item) {
                    $debitItem = new EntryItemApproval();
                    $debitItem->entry_id = $approval->id;
                    $debitItem->ledger_id = $item['ledger_id'];
                    $debitItem->amount = $item['amount'];
                    $debitItem->dc = 'D';
                    $debitItem->details = $item['details'] ?? null;
                    $debitItem->save();
                }

                // Create credit entry (Bank/Cash) in approval table
                $creditItem = new EntryItemApproval();
                $creditItem->entry_id = $approval->id;
                $creditItem->ledger_id = $request->credit_account;
                $creditItem->amount = $totalAmount;
                $creditItem->dc = 'C';
                $creditItem->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Payment created and sent for approval',
                    'needs_approval' => true,
                    'data' => $approval->load('entryItems.ledger')
                ]);
            } else {
                // Create entry directly in main table (amount below threshold)
                $entry = new Entry();
                $entry->entrytype_id = 2; // Payment
                $entry->number = $entryCode;
                $entry->entry_code = $entryCode;
                $entry->date = $request->date;
                $entry->dr_total = $totalAmount;
                $entry->cr_total = $totalAmount;
                $entry->narration = $request->narration;
                $entry->fund_id = $request->fund_id;
                $entry->payment = $request->payment_mode;
                $entry->paid_to = $request->paid_to;
                $entry->created_by = Auth::id();

                // Add payment specific fields
                if ($request->payment_mode === 'CHEQUE') {
                    $entry->cheque_no = $request->cheque_no;
                    $entry->cheque_date = $request->cheque_date;
                    $entry->bank_name = $request->bank_name;
                } elseif ($request->payment_mode === 'ONLINE') {
                    $entry->transaction_no = $request->transaction_no;
                    $entry->transaction_date = $request->transaction_date;
                }

                $entry->save();

                // Create debit entries for items
                foreach ($request->items as $item) {
                    $debitItem = new EntryItem();
                    $debitItem->entry_id = $entry->id;
                    $debitItem->ledger_id = $item['ledger_id'];
                    $debitItem->amount = $item['amount'];
                    $debitItem->dc = 'D';
                    $debitItem->details = $item['details'] ?? null;
                    $debitItem->save();
                }

                // Create credit entry (Bank/Cash)
                $creditItem = new EntryItem();
                $creditItem->entry_id = $entry->id;
                $creditItem->ledger_id = $request->credit_account;
                $creditItem->amount = $totalAmount;
                $creditItem->dc = 'C';
                $creditItem->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Payment created successfully',
                    'needs_approval' => false,
                    'data' => $entry->load('entryItems.ledger')
                ]);
            }
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store Journal Entry
     */
    public function storeJournal(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'journal_items' => 'required|array|min:2',
            'journal_items.*.ledger_id' => 'required|exists:ledgers,id',
            'journal_items.*.dr_amount' => 'nullable|numeric|min:0',
            'journal_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->journal_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate entry code
            $entryCode = $request->entry_code;

            // Create entry
            $entry = new Entry();
            $entry->entrytype_id = 4; // Journal
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = $request->date;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->narration = $request->narration;
            $entry->fund_id = $request->fund_id;
            $entry->created_by = Auth::id();
            $entry->save();

            // Create entry items
            foreach ($request->journal_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['dr_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['cr_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Journal entry created successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating journal entry: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating journal entry: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store Contra Entry
     */
    public function storeContra(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'contra_items' => 'required|array|min:2',
            'contra_items.*.ledger_id' => 'required|exists:ledgers,id',
            'contra_items.*.dr_amount' => 'nullable|numeric|min:0',
            'contra_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        // Validate all ledgers are bank/cash accounts
        foreach ($request->contra_items as $item) {
            $ledger = Ledger::find($item['ledger_id']);
            if ($ledger->type != 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contra entries can only use bank/cash accounts'
                ], 422);
            }
        }

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->contra_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Contra entry must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate entry code
            $entryCode = $request->entry_code;

            // Create entry
            $entry = new Entry();
            $entry->entrytype_id = 3; // Contra
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = $request->date;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->narration = $request->narration;
            $entry->fund_id = $request->fund_id;
            $entry->created_by = Auth::id();
            $entry->save();

            // Create entry items
            foreach ($request->contra_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['dr_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['cr_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Contra entry created successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating contra entry: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating contra entry: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store Credit Note
     */
    public function storeCreditNote(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'credit_note_items' => 'required|array|min:2',
            'credit_note_items.*.ledger_id' => 'required|exists:ledgers,id',
            'credit_note_items.*.dr_amount' => 'nullable|numeric|min:0',
            'credit_note_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->credit_note_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Credit Note must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate entry code
            $entryCode = $request->entry_code;

            // Create entry
            $entry = new Entry();
            $entry->entrytype_id = 5; // Credit Note
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = $request->date;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->narration = $request->narration;
            $entry->fund_id = $request->fund_id;
            $entry->reference_no = $request->reference_no;
            $entry->paid_to = $request->party_name;
            $entry->created_by = Auth::id();
            $entry->save();

            // Create entry items
            foreach ($request->credit_note_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['dr_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['cr_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Credit Note created successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating credit note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating credit note: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store Debit Note
     */
    public function storeDebitNote(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'debit_note_items' => 'required|array|min:2',
            'debit_note_items.*.ledger_id' => 'required|exists:ledgers,id',
            'debit_note_items.*.dr_amount' => 'nullable|numeric|min:0',
            'debit_note_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->debit_note_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Debit Note must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate entry code
            $entryCode = $request->entry_code;

            // Create entry
            $entry = new Entry();
            $entry->entrytype_id = 6; // Debit Note
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = $request->date;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->narration = $request->narration;
            $entry->fund_id = $request->fund_id;
            $entry->reference_no = $request->reference_no;
            $entry->paid_to = $request->party_name;
            $entry->created_by = Auth::id();
            $entry->save();

            // Create entry items
            foreach ($request->debit_note_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['dr_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['cr_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Debit Note created successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating debit note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating debit note: ' . $e->getMessage()
            ], 500);
        }
    }


    /**
     * Store Inventory Journal
     */
    public function storeInventoryJournal(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'reference_no' => 'nullable|string',
            'narration' => 'nullable|string',
            'inventory_items' => 'required|array|min:1',
            'inventory_items.*.ledger_id' => 'required|exists:ledgers,id',
            'inventory_items.*.transaction_type' => 'required|in:Sale,Purchase',
            'inventory_items.*.quantity' => 'required|numeric|min:0.01',
            'inventory_items.*.unit_price' => 'required|numeric|min:0.01',
            'accounting_entries' => 'required|array|min:1',
            'accounting_entries.*.ledger_id' => 'required|exists:ledgers,id',
            'accounting_entries.*.debit_amount' => 'nullable|numeric|min:0',
            'accounting_entries.*.credit_amount' => 'nullable|numeric|min:0'
        ]);

        // Calculate totals from accounting entries
        $totalDebit = 0;
        $totalCredit = 0;

        // Process inventory items to calculate their contribution
        foreach ($request->inventory_items as $item) {
            $amount = $item['quantity'] * $item['unit_price'];
            if ($item['transaction_type'] == 'Purchase') {
                $totalDebit += $amount; // Purchase debits inventory
            } else {
                $totalCredit += $amount; // Sale credits inventory
            }
        }

        // Process accounting entries
        foreach ($request->accounting_entries as $entry) {
            $totalDebit += $entry['debit_amount'] ?? 0;
            $totalCredit += $entry['credit_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($totalDebit - $totalCredit) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory Journal must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        // Validate inventory ledgers
        foreach ($request->inventory_items as $item) {
            $inventoryLedger = Ledger::find($item['ledger_id']);
            if (!$inventoryLedger || $inventoryLedger->iv != 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected ledger ' . $inventoryLedger->name . ' is not an inventory ledger'
                ], 422);
            }

            // For sales, check available quantity
            if ($item['transaction_type'] == 'Sale') {
                $availableQty = $this->getAvailableQuantity($item['ledger_id']);
                if ($item['quantity'] > $availableQty) {
                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient quantity for {$inventoryLedger->name}. Available: {$availableQty}"
                    ], 422);
                }
            }
        }

        DB::beginTransaction();

        try {
            // Generate entry code - use entry type 7 for Inventory Journal
            $entryCode = $request->entry_code;

            // Create entry
            $entry = new Entry();
            $entry->entrytype_id = 7; // Inventory Journal
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = $request->date;
            $entry->dr_total = $totalDebit;
            $entry->cr_total = $totalCredit;
            $entry->narration = $request->narration;
            $entry->fund_id = $request->fund_id;
            $entry->reference_no = $request->reference_no;
            $entry->created_by = Auth::id();
            $entry->save();

            // Create inventory entries
            foreach ($request->inventory_items as $item) {
                $amount = $item['quantity'] * $item['unit_price'];

                $inventoryEntry = new EntryItem();
                $inventoryEntry->entry_id = $entry->id;
                $inventoryEntry->ledger_id = $item['ledger_id'];
                $inventoryEntry->amount = $amount;
                $inventoryEntry->dc = $item['transaction_type'] == 'Purchase' ? 'D' : 'C';
                $inventoryEntry->quantity = $item['quantity'];
                $inventoryEntry->unit_price = $item['unit_price'];
                $inventoryEntry->details = $item['transaction_type'] . ' - Qty: ' . $item['quantity'];
                $inventoryEntry->save();
            }

            // Create accounting entries
            foreach ($request->accounting_entries as $accEntry) {
                if (($accEntry['debit_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $accEntry['ledger_id'];
                    $entryItem->amount = $accEntry['debit_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($accEntry['credit_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $accEntry['ledger_id'];
                    $entryItem->amount = $accEntry['credit_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Inventory Journal created successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating inventory journal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating inventory journal: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Update Entry (Generic for all types)
     */
    public function update(Request $request, $id)
    {
        $entry = Entry::find($id);
        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Entry not found'
            ], 404);
        }

        // Check if entry can be edited
        if (!is_null($entry->inv_type) || !is_null($entry->inv_id)) {
            return response()->json([
                'success' => false,
                'message' => 'This entry cannot be edited as it was created from bookings'
            ], 422);
        }

        // Route to appropriate update method based on entry type
        switch ($entry->entrytype_id) {


            case 1:
                return $this->updateReceipt($request, $id);
            case 2:
                return $this->updatePayment($request, $id);
            case 3:
                return $this->updateContra($request, $id);
            case 4:
                return $this->updateJournal($request, $id);
            case 5:
                return $this->updateCreditNote($request, $id);
            case 6:
                return $this->updateDebitNote($request, $id);
            case 7:
                return $this->updateInventoryJournal($request, $id);
            default:
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid entry type'
                ], 422);
        }
    }

    /**
     * Show entry details
     */
    public function show($id)
    {
        try {
            $entry = Entry::with(['entryItems.ledger', 'fund', 'creator'])
                ->find($id);

            if (!$entry) {
                return response()->json([
                    'success' => false,
                    'message' => 'Entry not found'
                ], 404);
            }

            $entry->can_edit = (is_null($entry->inv_type) && is_null($entry->inv_id)) && empty($entry->has_closed);
            $entry->can_delete = (is_null($entry->inv_type) && is_null($entry->inv_id)) && empty($entry->has_closed);
            $entry->entry_type_name = $this->getEntryTypeName($entry->entrytype_id);
            $entry->is_balanced = $this->isBalanced($entry);

            return response()->json([
                'success' => true,
                'data' => $entry
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching entry: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching entry'
            ], 500);
        }
    }

    /**
     * Delete entry
     */
    public function destroy($id)
    {
        try {
            $entry = Entry::find($id);

            if (!$entry) {
                return response()->json([
                    'success' => false,
                    'message' => 'Entry not found'
                ], 404);
            }

            // Check if entry can be deleted
            if (!is_null($entry->inv_type) || !is_null($entry->inv_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This entry cannot be deleted as it was created from bookings'
                ], 422);
            }

            DB::beginTransaction();

            // Delete entry items first
            EntryItem::where('entry_id', $id)->delete();

            // Delete entry
            $entry->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Entry deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error deleting entry: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting entry: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get ledgers by group
     */
    public function getLedgersByGroup($groupCode)
    {
        try {
            $ledgers = Ledger::whereHas('group', function ($query) use ($groupCode) {
                $startCode = $groupCode;
                $endCode = $groupCode + 999;
                $query->whereBetween('code', [$startCode, $endCode]);
            })
                ->orderBy('left_code', 'asc')
                ->orderBy('right_code', 'asc')
                ->get(['id', 'name', 'left_code', 'right_code', 'type']);

            return response()->json([
                'success' => true,
                'data' => $ledgers
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching ledgers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching ledgers'
            ], 500);
        }
    }

    /**
     * Get inventory ledgers
     */
    public function getInventoryLedgers()
    {
        try {
            $ledgers = Ledger::where('iv', 1)
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'left_code', 'right_code']);

            return response()->json([
                'success' => true,
                'data' => $ledgers
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching inventory ledgers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching inventory ledgers'
            ], 500);
        }
    }

    /**
     * Get inventory balance
     */
    public function getInventoryBalance($ledgerId)
    {
        try {
            $ledger = Ledger::find($ledgerId);

            if (!$ledger || $ledger->iv != 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid inventory ledger'
                ], 422);
            }

            $quantity = $this->getAvailableQuantity($ledgerId);
            $value = $this->getInventoryValue($ledgerId);

            return response()->json([
                'success' => true,
                'data' => [
                    'quantity' => $quantity,
                    'value' => $value,
                    'avg_price' => $quantity > 0 ? $value / $quantity : 0
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching inventory balance: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching inventory balance'
            ], 500);
        }
    }

    /**
     * Generate entry code
     */
    // public function generateEntryCode($prefix, $entryTypeId, $date = null)
    // {
    //     $date = $date ?? request('date', date('Y-m-d'));
    //     $shortYear = date('y', strtotime($date));
    //     $month = date('m', strtotime($date));

    //     // Base code prefix with year & month
    //     $baseCode = $prefix . $shortYear . $month;

    //     // Get last entry for this type and this month
    //     $lastEntry = Entry::where('entrytype_id', $entryTypeId)
    //         ->where('entry_code', 'like', $baseCode . '%')
    //         ->orderBy('id', 'desc')
    //         ->first();

    //     $lastNumber = 0;
    //     if ($lastEntry && $lastEntry->entry_code) {
    //         // Extract only the **last 5 digits** (the counter)
    //         preg_match('/(\d{5})$/', $lastEntry->entry_code, $matches);
    //         if (isset($matches[1])) {
    //             $lastNumber = (int) $matches[1];
    //         }
    //     }

    //     return $baseCode . sprintf("%05d", $lastNumber + 1);
    // }
    public function generateEntryCode($prefix, $entryTypeId, $date = null)
    {
        $date = $date ?? request('date', date('Y-m-d'));
        $shortYear = date('y', strtotime($date));
        $month = date('m', strtotime($date));

        $baseCode = $prefix . $shortYear . $month;
        // Use a DB transaction to avoid race conditions
        return DB::transaction(function () use ($baseCode, $entryTypeId) {
            // Get the last entry number
            $lastEntry = Entry::where('entrytype_id', $entryTypeId)
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
     * Generate entry code API endpoint
     */
    public function generateCode(Request $request)
    {
        $request->validate([
            'prefix' => 'required|string',
            'entrytype_id' => 'required|integer',
            'date' => 'nullable|date'
        ]);

        $code = $this->generateEntryCode($request->prefix, $request->entrytype_id, $request->date);

        return response()->json([
            'success' => true,
            'data' => ['code' => $code]
        ]);
    }

    /**
     * Get available quantity for inventory ledger
     */
    private function getAvailableQuantity($ledgerId)
    {
        $debitQty = EntryItem::where('ledger_id', $ledgerId)
            ->where('dc', 'D')
            ->sum('quantity');

        $creditQty = EntryItem::where('ledger_id', $ledgerId)
            ->where('dc', 'C')
            ->sum('quantity');

        return $debitQty - $creditQty;
    }

    /**
     * Get inventory value
     */
    private function getInventoryValue($ledgerId)
    {
        $debitValue = EntryItem::where('ledger_id', $ledgerId)
            ->where('dc', 'D')
            ->sum(DB::raw('COALESCE(quantity, 0) * COALESCE(unit_price, 0)'));

        $creditValue = EntryItem::where('ledger_id', $ledgerId)
            ->where('dc', 'C')
            ->sum(DB::raw('COALESCE(quantity, 0) * COALESCE(unit_price, 0)'));

        return $debitValue - $creditValue;
    }

    /**
     * Get entry type name
     */
    private function getEntryTypeName($entryTypeId)
    {
        $types = [
            1 => 'Receipt',
            2 => 'Payment',
            3 => 'Contra',
            4 => 'Journal',
            5 => 'Credit Note',
            6 => 'Debit Note',
            7 => 'Inventory Journal'
        ];

        return $types[$entryTypeId] ?? 'Unknown';
    }

    /**
     * Check if entry is balanced
     */
    private function isBalanced($entry)
    {
        return abs($entry->dr_total - $entry->cr_total) < 0.01;
    }

    /**
     * Export entries
     */
    public function export(Request $request)
    {
        try {
            $query = Entry::with(['entryItems.ledger', 'fund']);

            // Apply filters
            if ($request->filled('entrytype_id')) {
                $query->where('entrytype_id', $request->entrytype_id);
            }

            if ($request->filled('from_date')) {
                $query->whereDate('date', '>=', $request->from_date);
            }

            if ($request->filled('to_date')) {
                $query->whereDate('date', '<=', $request->to_date);
            }

            if ($request->filled('fund_id')) {
                $query->where('fund_id', $request->fund_id);
            }

            $entries = $query->orderBy('date', 'desc')->get();

            // Format for export
            $exportData = [];
            foreach ($entries as $entry) {
                $exportData[] = [
                    'Date' => $entry->date,
                    'Entry Code' => $entry->entry_code,
                    'Type' => $this->getEntryTypeName($entry->entrytype_id),
                    'Narration' => $entry->narration,
                    'Fund' => $entry->fund->name ?? '',
                    'Debit Total' => $entry->dr_total,
                    'Credit Total' => $entry->cr_total,
                    'Created By' => $entry->creator->name ?? '',
                    'Created At' => $entry->created_at
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $exportData
            ]);
        } catch (\Exception $e) {
            \Log::error('Error exporting entries: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error exporting entries'
            ], 500);
        }
    }

    /**
     * Update Receipt
     */
    public function updateReceipt(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'debit_account' => 'required|exists:ledgers,id',
            'fund_id' => 'required|exists:funds,id',
            'payment_mode' => 'required|in:CASH,CHEQUE,ONLINE',
            'received_from' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.ledger_id' => 'required|exists:ledgers,id',
            'items.*.amount' => 'required|numeric|min:0.01',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_ledger' => 'nullable|required_with:discount_amount>0|exists:ledgers,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $entry = Entry::findOrFail($id);

            // Check if user can edit
            /* if (!$entry->can_edit) {
				throw new \Exception('This entry cannot be edited');
			} */

            // Update entry details
            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->payment = $request->payment_mode;
            $entry->paid_to = $request->received_from;
            $entry->narration = $request->narration;

            // Payment specific fields
            if ($request->payment_mode == 'CHEQUE') {
                $entry->cheque_no = $request->cheque_no;
                $entry->cheque_date = $request->cheque_date;
            } else {
                $entry->cheque_no = null;
                $entry->cheque_date = null;
            }

            // Calculate totals
            $totalAmount = collect($request->items)->sum('amount');
            $discountAmount = $request->discount_amount ?? 0;
            $netAmount = $totalAmount - $discountAmount;

            $entry->dr_total = $totalAmount;
            $entry->cr_total = $totalAmount;
            $entry->save();

            // Delete existing items
            EntryItem::where('entry_id', $entry->id)->delete();

            // Add debit entry (Bank/Cash)
            EntryItem::create([
                'entry_id' => $entry->id,
                'ledger_id' => $request->debit_account,
                'amount' => $netAmount,
                'dc' => 'D',
                'details' => null
            ]);

            // Add credit entries
            foreach ($request->items as $item) {
                EntryItem::create([
                    'entry_id' => $entry->id,
                    'ledger_id' => $item['ledger_id'],
                    'amount' => $item['amount'],
                    'dc' => 'C',
                    'details' => $item['details'] ?? null
                ]);
            }
            // Add discount entry if exists
            if ($discountAmount > 0 && $request->discount_ledger) {
                $discountItem = new EntryItem();
                $discountItem->entry_id = $entry->id;
                $discountItem->ledger_id = $request->discount_ledger;
                $discountItem->amount = $discountAmount;
                $discountItem->is_discount = 1;
                $discountItem->details = 'Discount';
                $discountItem->dc = 'D';
                $discountItem->save();
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Receipt updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update Payment
     */
    public function updatePayment(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'credit_account' => 'required|exists:ledgers,id',
            'fund_id' => 'required|exists:funds,id',
            'payment_mode' => 'required|in:CASH,CHEQUE,ONLINE',
            'paid_to' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.ledger_id' => 'required|exists:ledgers,id',
            'items.*.amount' => 'required|numeric|min:0.01',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_ledger' => 'nullable|required_with:discount_amount|exists:ledgers,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $entry = Entry::findOrFail($id);

            /* if (!$entry->can_edit) {
				throw new \Exception('This entry cannot be edited');
			} */

            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->payment = $request->payment_mode;
            $entry->paid_to = $request->paid_to;
            $entry->narration = $request->narration;

            if ($request->payment_mode == 'CHEQUE') {
                $entry->cheque_no = $request->cheque_no;
                $entry->cheque_date = $request->cheque_date;
            } else {
                $entry->cheque_no = null;
                $entry->cheque_date = null;
            }

            $totalAmount = collect($request->items)->sum('amount');
            $discountAmount = $request->discount_amount ?? 0;
            $netAmount = $totalAmount - $discountAmount;

            $entry->dr_total = $totalAmount;
            $entry->cr_total = $netAmount;
            $entry->save();

            EntryItem::where('entry_id', $entry->id)->delete();

            // Add debit entries
            foreach ($request->items as $item) {
                EntryItem::create([
                    'entry_id' => $entry->id,
                    'ledger_id' => $item['ledger_id'],
                    'amount' => $item['amount'],
                    'dc' => 'D',
                    'details' => $item['details'] ?? null
                ]);
            }

            // Add credit entry (Bank/Cash)
            EntryItem::create([
                'entry_id' => $entry->id,
                'ledger_id' => $request->credit_account,
                'amount' => $netAmount,
                'dc' => 'C',
                'details' => null
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Payment updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update Contra
     */
    public function updateContra(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'from_account' => 'required|exists:ledgers,id',
            'to_account' => 'required|exists:ledgers,id|different:from_account',
            'amount' => 'required|numeric|min:0.01',
            'fund_id' => 'required|exists:funds,id',
            'narration' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $entry = Entry::findOrFail($id);

            /* if (!$entry->can_edit) {
				throw new \Exception('This entry cannot be edited');
			} */

            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->narration = $request->narration;
            $entry->dr_total = $request->amount;
            $entry->cr_total = $request->amount;
            $entry->save();

            EntryItem::where('entry_id', $entry->id)->delete();

            // Debit entry (To Account)
            EntryItem::create([
                'entry_id' => $entry->id,
                'ledger_id' => $request->to_account,
                'amount' => $request->amount,
                'dc' => 'D',
                'details' => 'Transfer In'
            ]);

            // Credit entry (From Account)
            EntryItem::create([
                'entry_id' => $entry->id,
                'ledger_id' => $request->from_account,
                'amount' => $request->amount,
                'dc' => 'C',
                'details' => 'Transfer Out'
            ]);

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Contra entry updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update Journal
     */
    public function updateJournal(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'narration' => 'nullable|string',
            'journal_items' => 'required|array|min:2',
            'journal_items.*.ledger_id' => 'required|exists:ledgers,id',
            'journal_items.*.dr_amount' => 'nullable|numeric|min:0',
            'journal_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->journal_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $entry = Entry::findOrFail($id);

            /* if (!$entry->can_edit) {
				throw new \Exception('This entry cannot be edited');
			} */

            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->narration = $request->narration;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->save();

            EntryItem::where('entry_id', $entry->id)->delete();

            // Add journal items
            foreach ($request->journal_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['dr_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $item['ledger_id'];
                    $entryItem->amount = $item['cr_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Journal entry updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update Credit Note
     */
    /**
     * Update Credit Note
     */
    public function updateCreditNote(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'narration' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'credit_note_items' => 'required|array|min:2',
            'credit_note_items.*.ledger_id' => 'required|exists:ledgers,id',
            'credit_note_items.*.dr_amount' => 'nullable|numeric|min:0',
            'credit_note_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->credit_note_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Credit Note must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $entry = Entry::findOrFail($id);

            // Check if it's actually a credit note
            if ($entry->entrytype_id !== 5) {
                throw new \Exception('This is not a credit note entry');
            }

            // Update entry
            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->narration = $request->narration;
            $entry->reference_no = $request->reference_no;
            $entry->paid_to = $request->party_name;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->save();

            // Delete existing items
            EntryItem::where('entry_id', $entry->id)->delete();

            // Create new entry items
            foreach ($request->credit_note_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    EntryItem::create([
                        'entry_id' => $entry->id,
                        'ledger_id' => $item['ledger_id'],
                        'amount' => $item['dr_amount'],
                        'dc' => 'D',
                        'details' => $item['details'] ?? null
                    ]);
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    EntryItem::create([
                        'entry_id' => $entry->id,
                        'ledger_id' => $item['ledger_id'],
                        'amount' => $item['cr_amount'],
                        'dc' => 'C',
                        'details' => $item['details'] ?? null
                    ]);
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Credit note updated successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update Debit Note
     */
    /**
     * Update Debit Note
     */
    public function updateDebitNote(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'narration' => 'nullable|string',
            'reference_no' => 'nullable|string',
            'party_name' => 'nullable|string',
            'debit_note_items' => 'required|array|min:2',
            'debit_note_items.*.ledger_id' => 'required|exists:ledgers,id',
            'debit_note_items.*.dr_amount' => 'nullable|numeric|min:0',
            'debit_note_items.*.cr_amount' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Calculate totals
        $drTotal = 0;
        $crTotal = 0;
        foreach ($request->debit_note_items as $item) {
            $drTotal += $item['dr_amount'] ?? 0;
            $crTotal += $item['cr_amount'] ?? 0;
        }

        // Validate balanced entry
        if (abs($drTotal - $crTotal) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Debit Note must be balanced. Debit and Credit totals must be equal.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $entry = Entry::findOrFail($id);

            // Check if it's actually a debit note
            if ($entry->entrytype_id !== 6) {
                throw new \Exception('This is not a debit note entry');
            }

            // Check if entry can be edited
            if (!is_null($entry->inv_type) || !is_null($entry->inv_id)) {
                throw new \Exception('This entry cannot be edited as it was created from bookings');
            }

            // Update entry
            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->narration = $request->narration;
            $entry->reference_no = $request->reference_no;
            $entry->paid_to = $request->party_name;
            $entry->dr_total = $drTotal;
            $entry->cr_total = $crTotal;
            $entry->save();

            // Delete existing items
            EntryItem::where('entry_id', $entry->id)->delete();

            // Create new entry items
            foreach ($request->debit_note_items as $item) {
                if (($item['dr_amount'] ?? 0) > 0) {
                    EntryItem::create([
                        'entry_id' => $entry->id,
                        'ledger_id' => $item['ledger_id'],
                        'amount' => $item['dr_amount'],
                        'dc' => 'D',
                        'details' => $item['details'] ?? null
                    ]);
                }

                if (($item['cr_amount'] ?? 0) > 0) {
                    EntryItem::create([
                        'entry_id' => $entry->id,
                        'ledger_id' => $item['ledger_id'],
                        'amount' => $item['cr_amount'],
                        'dc' => 'C',
                        'details' => $item['details'] ?? null
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Debit note updated successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error updating debit note: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Inventory Journal
     */

    /**
     * Update Inventory Journal
     */
    public function updateInventoryJournal(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'fund_id' => 'required|exists:funds,id',
            'reference_no' => 'nullable|string',
            'narration' => 'nullable|string',
            'inventory_items' => 'required|array|min:1',
            'inventory_items.*.ledger_id' => 'required|exists:ledgers,id',
            'inventory_items.*.transaction_type' => 'required|in:Sale,Purchase',
            'inventory_items.*.quantity' => 'required|numeric|min:0.01',
            'inventory_items.*.unit_price' => 'required|numeric|min:0.01',
            'accounting_entries' => 'required|array|min:1',
            'accounting_entries.*.ledger_id' => 'required|exists:ledgers,id',
            'accounting_entries.*.debit_amount' => 'nullable|numeric|min:0',
            'accounting_entries.*.credit_amount' => 'nullable|numeric|min:0'
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
            $entry = Entry::findOrFail($id);

            // Check if it's actually an inventory journal
            if ($entry->entrytype_id !== 7) {
                throw new \Exception('This is not an inventory journal entry');
            }

            // Check if entry can be edited
            if (!is_null($entry->inv_type) || !is_null($entry->inv_id)) {
                throw new \Exception('This entry cannot be edited as it was created from bookings');
            }

            // Get original inventory items for quantity adjustment
            $originalInventoryItems = EntryItem::where('entry_id', $id)
                ->where('quantity', '>', 0)
                ->get();

            // Calculate totals from the new data
            $totalDebit = 0;
            $totalCredit = 0;

            // Process inventory items to calculate their contribution
            foreach ($request->inventory_items as $item) {
                $amount = $item['quantity'] * $item['unit_price'];
                if ($item['transaction_type'] == 'Purchase') {
                    $totalDebit += $amount; // Purchase debits inventory
                } else {
                    $totalCredit += $amount; // Sale credits inventory
                }
            }

            // Process accounting entries
            foreach ($request->accounting_entries as $accEntry) {
                $totalDebit += $accEntry['debit_amount'] ?? 0;
                $totalCredit += $accEntry['credit_amount'] ?? 0;
            }

            // Validate balanced entry
            if (abs($totalDebit - $totalCredit) > 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => 'Inventory Journal must be balanced. Debit and Credit totals must be equal.'
                ], 422);
            }

            // Validate inventory ledgers and check quantities
            foreach ($request->inventory_items as $item) {
                $inventoryLedger = Ledger::find($item['ledger_id']);
                if (!$inventoryLedger || $inventoryLedger->iv != 1) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected ledger ' . ($inventoryLedger->name ?? 'Unknown') . ' is not an inventory ledger'
                    ], 422);
                }

                // For sales, check available quantity (accounting for original transaction)
                if ($item['transaction_type'] == 'Sale') {
                    // Get current available quantity
                    $availableQty = $this->getAvailableQuantity($item['ledger_id']);

                    // Find original item if it exists
                    $originalItem = $originalInventoryItems->where('ledger_id', $item['ledger_id'])->first();

                    if ($originalItem) {
                        // Adjust available quantity based on original transaction
                        if ($originalItem->dc == 'C') {
                            // Original was a sale, add back the quantity
                            $availableQty += $originalItem->quantity;
                        } elseif ($originalItem->dc == 'D') {
                            // Original was a purchase, subtract the quantity
                            $availableQty -= $originalItem->quantity;
                        }
                    }

                    if ($item['quantity'] > $availableQty) {
                        return response()->json([
                            'success' => false,
                            'message' => "Insufficient quantity for {$inventoryLedger->name}. Available: {$availableQty}"
                        ], 422);
                    }
                }
            }

            // Update entry details
            $entry->date = $request->date;
            $entry->fund_id = $request->fund_id;
            $entry->reference_no = $request->reference_no;
            $entry->narration = $request->narration;
            $entry->dr_total = $totalDebit;
            $entry->cr_total = $totalCredit;
            $entry->save();

            // Delete existing entry items
            EntryItem::where('entry_id', $entry->id)->delete();

            // Create new inventory entries
            foreach ($request->inventory_items as $item) {
                $amount = $item['quantity'] * $item['unit_price'];

                $inventoryEntry = new EntryItem();
                $inventoryEntry->entry_id = $entry->id;
                $inventoryEntry->ledger_id = $item['ledger_id'];
                $inventoryEntry->amount = $amount;
                $inventoryEntry->dc = $item['transaction_type'] == 'Purchase' ? 'D' : 'C';
                $inventoryEntry->quantity = $item['quantity'];
                $inventoryEntry->unit_price = $item['unit_price'];
                $inventoryEntry->details = $item['transaction_type'] . ' - Qty: ' . $item['quantity'];
                $inventoryEntry->save();
            }

            // Create new accounting entries
            foreach ($request->accounting_entries as $accEntry) {
                if (($accEntry['debit_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $accEntry['ledger_id'];
                    $entryItem->amount = $accEntry['debit_amount'];
                    $entryItem->dc = 'D';
                    $entryItem->save();
                }

                if (($accEntry['credit_amount'] ?? 0) > 0) {
                    $entryItem = new EntryItem();
                    $entryItem->entry_id = $entry->id;
                    $entryItem->ledger_id = $accEntry['ledger_id'];
                    $entryItem->amount = $accEntry['credit_amount'];
                    $entryItem->dc = 'C';
                    $entryItem->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Inventory Journal updated successfully',
                'data' => $entry->load('entryItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error updating inventory journal: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    public function withCreditLedgers(Request $request)
    {

        try {
            $accounts = Ledger::with(['group'])->where('iv', '!=', 1)->get();
            return response()->json([
                'success' => true,
                'data' => $accounts,
                'message' => 'Ledgers retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving bank accounts',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function printJournal($id)
    {

        try {

            $entry = Entry::with(['entryItems.ledger', 'fund', 'creator'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $entry
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Entry not found'
            ], 404);
        }
    }
}
