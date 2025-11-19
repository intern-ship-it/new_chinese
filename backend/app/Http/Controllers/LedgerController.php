<?php

// ============================================
// 1. LEDGER CONTROLLER
// ============================================
// app/Http/Controllers/LedgerController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Ledger;
use App\Models\Group;
use App\Models\AcYear;
use App\Models\AcYearLedgerBalance;
use App\Models\Entry;
use App\Models\EntryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;


class LedgerController extends Controller
{
    /**
     * Display a listing of ledgers with filters
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = Ledger::with(['group']);

            // Apply filters - Check for both existence AND non-empty values
            if ($request->filled('group_id')) {
                $query->where('group_id', $request->group_id);
            }

            // Handle type filter properly
            if ($request->filled('type')) {
                // Convert string values to boolean
                $typeValue = filter_var($request->type, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($typeValue !== null) {
                    $query->where('type', $typeValue);
                }
            }

            if ($request->filled('reconciliation')) {
                $query->where('reconciliation', $request->boolean('reconciliation'));
            }

            if ($request->filled('inventory')) {
                $query->where('iv', $request->boolean('inventory'));
            }

            if ($request->filled('aging')) {
                $query->where('aging', $request->boolean('aging'));
            }

            if ($request->filled('credit_aging')) {
                $query->where('credit_aging', $request->boolean('credit_aging'));
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('left_code', 'like', "%{$search}%")
                        ->orWhere('right_code', 'like', "%{$search}%");
                });
            }

            // Group filter by code range
            if ($request->filled('group_code')) {
                $query->whereHas('group', function ($q) use ($request) {
                    $q->where('code', $request->group_code);
                });
            }

            // Sort
            $sortBy = $request->get('sort_by', 'name');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Get results - Handle 'all' parameter properly
            $getAll = filter_var($request->get('all', false), FILTER_VALIDATE_BOOLEAN);

            if ($getAll) {
                $ledgers = $query->get();
            } else {
                $perPage = $request->get('per_page', 15);
                $ledgers = $query->paginate($perPage);
            }

            // Add balance information if requested
            $withBalance = filter_var($request->get('with_balance', false), FILTER_VALIDATE_BOOLEAN);

            if ($withBalance) {
                $asOnDate = $request->get('as_on_date', date('Y-m-d'));

                $ledgerCollection = $getAll ? $ledgers : $ledgers->getCollection();

                $ledgerCollection->transform(function ($ledger) use ($asOnDate) {
                    $balance = $ledger->getCurrentBalance($asOnDate);
                    $ledger->current_balance = abs($balance);
                    $ledger->balance_type = $balance >= 0 ? 'Dr' : 'Cr';
                    $ledger->formatted_balance = $ledger->getFormattedBalance($asOnDate);

                    // Add inventory balance if applicable
                    if ($ledger->isInventoryLedger()) {
                        $ledger->inventory_balance = $ledger->getInventoryBalance($asOnDate);
                    }

                    return $ledger;
                });
            }

            // Add debug information in development
            if (config('app.debug')) {
                $debugInfo = [
                    'total_count' => $getAll ? $ledgers->count() : $ledgers->total(),
                    'filters_applied' => [
                        'group_id' => $request->filled('group_id') ? $request->group_id : null,
                        'type' => $request->filled('type') ? $request->type : null,
                        'search' => $request->filled('search') ? $request->search : null,
                        'all' => $getAll,
                        'with_balance' => $withBalance
                    ]
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $ledgers,
                'message' => 'Ledgers retrieved successfully',
                'debug' => $debugInfo ?? null
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created ledger
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:300|unique:ledgers,name',
            'group_id' => 'required|exists:groups,id',
            'type' => 'boolean',
            'reconciliation' => 'boolean',
            'pa' => 'boolean',
            'hb' => 'boolean',
            'aging' => 'boolean',
            'credit_aging' => 'boolean',
            'iv' => 'boolean',
            'notes' => 'nullable|string|max:200',
            'right_code' => 'nullable|string|max:10,right_code',

            // Opening balance fields
            'opening_balance' => 'nullable|numeric|min:0',
            'opening_balance_type' => 'nullable|in:dr,cr,Dr,Cr',
            'opening_quantity' => 'nullable|integer|min:0',
            'opening_unit_price' => 'nullable|numeric|min:0',
            'opening_uom_id' => 'nullable|exists:uom,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        $group = Group::findOrFail($request->group_id);

        $leftCode = $group->code;

        // Format right_code with leading zeros
        $rightCode = str_pad($request->right_code, 4, '0', STR_PAD_LEFT);

        // Check for duplicate combination
        $exists = Ledger::where('left_code', $leftCode)->where('right_code', $rightCode)->exists();
        if ($exists) {
            return response()->json([
                'success' => false,
                'errors' => 'Right Code already exists',
                'message' => 'Validation failed'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create ledger
            $ledger = Ledger::create([
                'name' => $request->name,
                'group_id' => $request->group_id,
                'type' => $request->boolean('type', false),
                'reconciliation' => $request->boolean('reconciliation', false),
                'pa' => $request->boolean('pa', false),
                'hb' => $request->boolean('hb', false),
                'aging' => $request->boolean('aging', false),
                'credit_aging' => $request->boolean('credit_aging', false),
                'iv' => $request->boolean('iv', false),
                'notes' => $request->notes,
                'left_code' => $leftCode,
                'right_code' => $rightCode,
                'is_migrate' => false
            ]);

            // Set opening balance if provided
            if ($request->has('opening_balance') && $request->opening_balance > 0) {
                $activeYear = AcYear::where('status', 1)->first();
                if (!empty($activeYear)) {
                    $ledger->setOpeningBalance(
                        $request->opening_balance,
                        strtolower($request->get('opening_balance_type', 'dr')),
                        $activeYear->id, // Will use active year
                        $request->get('opening_quantity', 0),
                        $request->get('opening_unit_price', 0),
                        $request->opening_uom_id
                    );
                }
            }

            DB::commit();

            // Load relationships for response
            $ledger->load(['group']);

            return response()->json([
                'success' => true,
                'data' => $ledger,
                'message' => 'Ledger created successfully'
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating ledger',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified ledger with details
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            DB::enableQueryLog();
            $ledger = Ledger::with(['group'])
                ->findOrFail($id);

            // Get current balance and other details
            $ledger->current_balance = abs($ledger->getCurrentBalance());
            $ledger->opening_balance = $ledger->openingBalance();
            $ledger->balance_type = $ledger->getCurrentBalance() >= 0 ? 'Dr' : 'Cr';
            $ledger->formatted_balance = $ledger->getFormattedBalance();
            $ledger->normal_balance = $ledger->getNormalBalance();
            $ledger->ledger_type = $ledger->getLedgerType();
            $ledger->has_transactions = $ledger->hasTransactions();
            $ledger->can_be_deleted = $ledger->canBeDeleted();

            // Get inventory balance if applicable
            if ($ledger->isInventoryLedger()) {
                $ledger->inventory_balance = $ledger->getInventoryBalance();
            }

            // Get aging analysis if applicable
            if ($ledger->hasAging() || $ledger->hasCreditAging()) {
                $ledger->aging_analysis = $ledger->getAgingAnalysis();
            }
            $activeYear = AcYear::where('status', 1)->first();
            
            
            
            // Get recent transactions
            $ledger->recent_transactions = $ledger->getRecentTransactions(5);

            if ($activeYear) {
                $ledger->active_year = [
                    'id' => $activeYear->id,
                    'from_date' => $activeYear->from_year_month->format('Y-m-d'),
                    'to_date' => $activeYear->to_year_month->format('Y-m-d'),
                    'status' => $activeYear->status
                ];
            }

// dd($ledger->active_year['from_date']); die;
            return response()->json([
                'success' => true,
                'data' => $ledger,
                'message' => 'Ledger details retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ledger not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified ledger
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $ledger = Ledger::findOrFail($id);
            $validator = Validator::make($request->all(), [
                'name' => 'string|max:300|unique:ledgers,name,' . $id,
                'group_id' => 'exists:groups,id',
                'type' => 'boolean',
                'reconciliation' => 'boolean',
                'pa' => 'boolean',
                'hb' => 'boolean',
                'aging' => 'boolean',
                'credit_aging' => 'boolean',
                'iv' => 'boolean',
                'notes' => 'nullable|string|max:200',
                'right_code' => 'nullable|string|max:10',

                // Opening balance fields
                'opening_balance' => 'nullable|numeric|min:0',
                'opening_balance_type' => 'nullable|in:dr,cr,Dr,Cr',
                'opening_quantity' => 'nullable|integer|min:0',
                'opening_unit_price' => 'nullable|numeric|min:0',
                'opening_uom_id' => 'nullable|exists:uom,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                    'message' => 'Validation failed'
                ], 422);
            }

            $group = Group::findOrFail($request->group_id);
            $leftCode = $group->code;

            // Format right_code with leading zeros
            $rightCode = str_pad($request->right_code, 4, '0', STR_PAD_LEFT);

            // Check for duplicate combination
            $exists = Ledger::where('left_code', $leftCode)
                ->where('right_code', $rightCode)
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'errors' => 'Right Code already exists',
                    'message' => 'Validation failed'
                ], 422);
            }

            DB::beginTransaction();
            try {
                // Update only provided fields
                $updateData = [];

                if ($request->has('name')) $updateData['name'] = $request->name;
                if ($request->has('group_id')) $updateData['group_id'] = $request->group_id;
                if ($request->has('type')) $updateData['type'] = $request->boolean('type');
                if ($request->has('reconciliation')) $updateData['reconciliation'] = $request->boolean('reconciliation');
                if ($request->has('pa')) $updateData['pa'] = $request->boolean('pa');
                if ($request->has('hb')) $updateData['hb'] = $request->boolean('hb');
                if ($request->has('aging')) $updateData['aging'] = $request->boolean('aging');
                if ($request->has('credit_aging')) $updateData['credit_aging'] = $request->boolean('credit_aging');
                if ($request->has('iv')) $updateData['iv'] = $request->boolean('iv');
                if ($request->has('notes')) $updateData['notes'] = $request->notes;
                if ($request->has('left_code')) $updateData['left_code'] = $leftCode;
                if ($request->has('right_code')) $updateData['right_code'] = $rightCode;

                $ledger->update($updateData);
                // Update opening balance if provided (same way as store method)
                if ($request->has('opening_balance')) {
                    $activeYear = AcYear::where('status', 1)->first();

                    if (!empty($activeYear)) {
                        // If opening_balance is 0, delete the opening balance record
                        /* if ($request->opening_balance == 0) {
                            AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
                                ->where('ledger_id', $ledger->id)
                                ->delete();
                        } else {
                            // Update or create opening balance
                            $ledger->setOpeningBalance(
                                $request->opening_balance,
                                strtolower($request->get('opening_balance_type', 'dr')),
                                $activeYear->id,
                                $request->get('opening_quantity', 0),
                                $request->get('opening_unit_price', 0),
                                $request->opening_uom_id
                            );
                        } */
                        $ledger->setOpeningBalance(
                            $request->opening_balance,
                            strtolower($request->get('opening_balance_type', 'dr')),
                            $activeYear->id,
                            $request->get('opening_quantity', 0),
                            $request->get('opening_unit_price', 0),
                            $request->opening_uom_id
                        );
                    }
                }

                DB::commit();

                // Load relationships for response
                $ledger->load(['group']);

                return response()->json([
                    'success' => true,
                    'data' => $ledger,
                    'message' => 'Ledger updated successfully'
                ]);
            } catch (\Exception $e) {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => 'Error updating ledger',
                    'error' => $e->getMessage()
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating ledger',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified ledger
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $ledger = Ledger::findOrFail($id);

            // Check if ledger can be safely deleted
            $canDelete = $ledger->canBeSafelyDeleted();

            if (!$canDelete['can_delete']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete ledger: it has existing transactions',

                    'reason' => $canDelete['reason'],
                    'details' => [
                        'has_transactions' => $ledger->hasTransactions(),
                        'referenced_by' => $ledger->referenced_by
                    ]
                ], 422);
            }

            // Soft delete the ledger
            $ledger->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Ledger deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting ledger',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get ledger balance
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function balance(Request $request, $id)
    {
        try {
            $ledger = Ledger::findOrFail($id);

            $asOnDate = $request->get('as_on_date', date('Y-m-d'));

            $balance = $ledger->getCurrentBalance($asOnDate);

            $response = [
                'ledger_id' => $ledger->id,
                'ledger_name' => $ledger->name,
                'as_on_date' => $asOnDate,
                'balance' => abs($balance),
                'balance_type' => $balance >= 0 ? 'Dr' : 'Cr',
                'formatted_balance' => $ledger->getFormattedBalance($asOnDate),
                'normal_balance' => $ledger->getNormalBalance()
            ];

            // Add inventory balance if applicable
            if ($ledger->isInventoryLedger()) {
                $response['inventory_balance'] = $ledger->getInventoryBalance($asOnDate);
            }

            return response()->json([
                'success' => true,
                'data' => $response,
                'message' => 'Balance retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving balance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update opening balance for a ledger
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateOpeningBalance(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:dr,cr,Dr,Cr',
            'ac_year_id' => 'nullable|exists:ac_year,id',
            'quantity' => 'nullable|integer|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'uom_id' => 'nullable|exists:uom,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        try {
            $ledger = Ledger::findOrFail($id);

            $balance = $ledger->setOpeningBalance(
                $request->amount,
                strtolower($request->type),
                $request->ac_year_id,
                $request->get('quantity', 0),
                $request->get('unit_price', 0),
                $request->uom_id
            );

            return response()->json([
                'success' => true,
                'data' => $balance,
                'message' => 'Opening balance updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating opening balance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get ledger transactions
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function transactions(Request $request, $id)
    {
        try {
            $ledger = Ledger::findOrFail($id);

            $query = EntryItem::with(['entry'])
                ->where('ledger_id', $id);

            // Date filter
            if ($request->has('from_date')) {
                $query->whereHas('entry', function ($q) use ($request) {
                    $q->whereDate('date', '>=', $request->from_date);
                });
            }

            if ($request->has('to_date')) {
                $query->whereHas('entry', function ($q) use ($request) {
                    $q->whereDate('date', '<=', $request->to_date);
                });
            }

            // Entry type filter
            if ($request->has('entry_type')) {
                $query->whereHas('entry', function ($q) use ($request) {
                    $q->where('entrytype_id', $request->entry_type);
                });
            }

            // Reconciliation filter
            if ($request->has('reconciled')) {
                $query->where('is_reconciled', $request->boolean('reconciled'));
            }

            // Sort by entry date
            $query->join('entries', 'entryitems.entry_id', '=', 'entries.id')
                ->orderBy('entries.date', 'desc')
                ->orderBy('entries.created_at', 'desc')
                ->select('entryitems.*');

            $perPage = $request->get('per_page', 50);
            $transactions = $query->paginate($perPage);

            // Transform data
            $transactions->getCollection()->transform(function ($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->entry->date,
                    'entry_code' => $item->entry->entry_code,
                    'entry_type' => $item->entry->entrytype_id,
                    'narration' => $item->narration ?: $item->entry->narration,
                    'amount' => $item->amount,
                    'dc' => $item->dc,
                    'debit' => $item->dc == 'D' ? $item->amount : 0,
                    'credit' => $item->dc == 'C' ? $item->amount : 0,
                    'is_reconciled' => $item->is_reconciled,
                    'reconciliation_date' => $item->reconciliation_date,
                    'details' => $item->details
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'ledger' => [
                    'id' => $ledger->id,
                    'name' => $ledger->name,
                    'current_balance' => $ledger->getFormattedBalance()
                ],
                'message' => 'Transactions retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving transactions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get ledger statement
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function statement(Request $request, $id)
    {
        try {
            $ledger = Ledger::findOrFail($id);

            $fromDate = $request->get('from_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $toDate = $request->get('to_date', Carbon::now()->endOfMonth()->format('Y-m-d'));

            // Get opening balance before from_date
            $openingBalanceQuery = DB::table('entryitems')
                ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
                ->where('entryitems.ledger_id', $id)
                ->whereDate('entries.date', '<', $fromDate)
                ->selectRaw('
                    SUM(CASE WHEN entryitems.dc = "D" THEN entryitems.amount ELSE 0 END) as total_debit,
                    SUM(CASE WHEN entryitems.dc = "C" THEN entryitems.amount ELSE 0 END) as total_credit
                ')
                ->first();

            // Get opening balance from ac_year_ledger_balance
            $activeYear = AcYear::where('status', 1)->first();
            $yearOpeningBalance = 0;

            if ($activeYear) {
                $openingBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
                    ->where('ledger_id', $id)
                    ->first();

                if ($openingBalance) {
                    $yearOpeningBalance = $openingBalance->dr_amount - $openingBalance->cr_amount;
                }
            }

            $openingDebit = ($openingBalanceQuery->total_debit ?? 0) + ($yearOpeningBalance > 0 ? $yearOpeningBalance : 0);
            $openingCredit = ($openingBalanceQuery->total_credit ?? 0) + ($yearOpeningBalance < 0 ? abs($yearOpeningBalance) : 0);
            $openingBalance = $openingDebit - $openingCredit;

            // Get transactions for the period
            $transactions = DB::table('entryitems')
                ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
                ->leftJoin('entryitems as ei2', function ($join) use ($id) {
                    $join->on('ei2.entry_id', '=', 'entries.id')
                        ->where('ei2.ledger_id', '!=', $id);
                })
                ->leftJoin('ledgers as l2', 'ei2.ledger_id', '=', 'l2.id')
                ->where('entryitems.ledger_id', $id)
                ->whereBetween('entries.date', [$fromDate, $toDate])
                ->select(
                    'entries.id as entry_id',
                    'entries.date',
                    'entries.entry_code',
                    'entries.narration as entry_narration',
                    'entryitems.narration as item_narration',
                    'entryitems.amount',
                    'entryitems.dc',
                    'entryitems.details',
                    'l2.name as opposite_ledger',
                    'entries.entrytype_id'
                )
                ->orderBy('entries.date')
                ->orderBy('entries.created_at')
                ->get();

            // Build statement with running balance
            $runningBalance = $openingBalance;
            $statement = [];
            $totalDebit = 0;
            $totalCredit = 0;

            // Add opening balance row
            $statement[] = [
                'date' => $fromDate,
                'entry_code' => '',
                'particulars' => 'Opening Balance',
                'debit' => $openingBalance > 0 ? abs($openingBalance) : 0,
                'credit' => $openingBalance < 0 ? abs($openingBalance) : 0,
                'balance' => abs($openingBalance),
                'balance_type' => $openingBalance >= 0 ? 'Dr' : 'Cr'
            ];

            foreach ($transactions as $trans) {
                $debit = 0;
                $credit = 0;

                if ($trans->dc === 'D') {
                    $debit = $trans->amount;
                    $runningBalance += $trans->amount;
                    $totalDebit += $trans->amount;
                } else {
                    $credit = $trans->amount;
                    $runningBalance -= $trans->amount;
                    $totalCredit += $trans->amount;
                }

                $particulars = $trans->opposite_ledger ?: ($trans->item_narration ?: $trans->entry_narration);

                $statement[] = [
                    'date' => $trans->date,
                    'entry_code' => $trans->entry_code,
                    'particulars' => $particulars,
                    'details' => $trans->details,
                    'debit' => $debit,
                    'credit' => $credit,
                    'balance' => abs($runningBalance),
                    'balance_type' => $runningBalance >= 0 ? 'Dr' : 'Cr',
                    'entry_id' => $trans->entry_id,
                    'entry_type' => $trans->entrytype_id
                ];
            }

            // Add closing balance row
            $closingBalance = $runningBalance;

            // Prepare summary
            $summary = [
                'opening_balance' => [
                    'amount' => abs($openingBalance),
                    'type' => $openingBalance >= 0 ? 'Dr' : 'Cr'
                ],
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'closing_balance' => [
                    'amount' => abs($closingBalance),
                    'type' => $closingBalance >= 0 ? 'Dr' : 'Cr'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'ledger' => [
                        'id' => $ledger->id,
                        'name' => $ledger->name,
                        'group' => $ledger->group->name ?? '',
                        'code' => $ledger->getFullCode()
                    ],
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'statement' => $statement,
                    'summary' => $summary
                ],
                'message' => 'Statement generated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get bank and cash accounts
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function bankAccounts(Request $request)
    {
        try {
            $accounts = Ledger::with(['group'])
                ->bankAccounts()
                ->get();

            $accounts->transform(function ($account) {
                $balance = $account->getCurrentBalance();
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'left_code' => $account->left_code,
                    'right_code' => $account->right_code,
                    'group' => $account->group->name ?? '',
                    'code' => $account->getFullCode(),
                    'balance' => abs($balance),
                    'balance_type' => $balance >= 0 ? 'Dr' : 'Cr',
                    'formatted_balance' => $account->getFormattedBalance(),
                    'has_reconciliation' => $account->hasReconciliation()
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $accounts,
                'message' => 'Bank accounts retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving bank accounts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function normalLedgers(Request $request)
    {
        try {
            $accounts = Ledger::with(['group'])->where('type', '!=', 1)->where('iv', '!=', 1)->get();
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

    public function withouInventoryLedgers(Request $request)
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

    /**
     * Get inventory ledgers
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function inventoryLedgers(Request $request)
    {
        try {
            $ledgers = Ledger::with(['group'])
                ->inventoryLedgers()
                ->get();

            $ledgers->transform(function ($ledger) {
                $balance = $ledger->getCurrentBalance();
                $inventoryQty = $ledger->getInventoryBalance();

                return [
                    'id' => $ledger->id,
                    'name' => $ledger->name,
                    'left_code' => $ledger->left_code,
                    'right_code' => $ledger->right_code,
                    'group' => $ledger->group->name ?? '',
                    'balance' => abs($balance),
                    'balance_type' => $balance >= 0 ? 'Dr' : 'Cr',
                    'inventory_quantity' => $inventoryQty,
                    // 'products_count' => $ledger->products->count(),
                    'formatted_balance' => $ledger->getFormattedBalance()
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $ledgers,
                'message' => 'Inventory ledgers retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving inventory ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get receivables (ledgers with aging)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function receivables(Request $request)
    {
        try {
            $ledgers = Ledger::with(['group', 'customers'])
                ->withAging()
                ->get();

            $asOnDate = $request->get('as_on_date', date('Y-m-d'));

            $ledgers->transform(function ($ledger) use ($asOnDate) {
                $balance = $ledger->getCurrentBalance($asOnDate);
                $aging = $ledger->getAgingAnalysis($asOnDate);

                return [
                    'id' => $ledger->id,
                    'name' => $ledger->name,
                    'group' => $ledger->group->name ?? '',
                    'balance' => abs($balance),
                    'balance_type' => $balance >= 0 ? 'Dr' : 'Cr',
                    'customers_count' => $ledger->customers->count(),
                    'aging_analysis' => $aging,
                    'formatted_balance' => $ledger->getFormattedBalance($asOnDate)
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $ledgers,
                'as_on_date' => $asOnDate,
                'message' => 'Receivables retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving receivables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payables (ledgers with credit aging)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function payables(Request $request)
    {
        try {
            $ledgers = Ledger::with(['group', 'vendors'])
                ->withCreditAging()
                ->get();

            $asOnDate = $request->get('as_on_date', date('Y-m-d'));

            $ledgers->transform(function ($ledger) use ($asOnDate) {
                $balance = $ledger->getCurrentBalance($asOnDate);
                $aging = $ledger->getAgingAnalysis($asOnDate);

                return [
                    'id' => $ledger->id,
                    'name' => $ledger->name,
                    'group' => $ledger->group->name ?? '',
                    'balance' => abs($balance),
                    'balance_type' => $balance >= 0 ? 'Dr' : 'Cr',
                    'vendors_count' => $ledger->vendors->count(),
                    'aging_analysis' => $aging,
                    'formatted_balance' => $ledger->getFormattedBalance($asOnDate)
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $ledgers,
                'as_on_date' => $asOnDate,
                'message' => 'Payables retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving payables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search ledgers for autocomplete
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        try {
            $search = $request->get('q', '');
            $groupId = $request->get('group_id');
            $excludeIds = $request->get('exclude', []);

            $query = Ledger::with('group');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('left_code', 'like', "%{$search}%")
                        ->orWhere('right_code', 'like', "%{$search}%");
                });
            }

            if ($groupId) {
                $query->where('group_id', $groupId);
            }

            if (!empty($excludeIds)) {
                $query->whereNotIn('id', $excludeIds);
            }

            $ledgers = $query->limit(20)->get();

            $ledgers->transform(function ($ledger) {
                return [
                    'id' => $ledger->id,
                    'text' => $ledger->name . ' (' . ($ledger->group->name ?? 'No Group') . ')',
                    'name' => $ledger->name,
                    'group' => $ledger->group->name ?? '',
                    'code' => $ledger->getFullCode(),
                    'type' => $ledger->type ? 'Bank' : 'Normal'
                ];
            });

            return response()->json([
                'success' => true,
                'results' => $ledgers,
                'message' => 'Search results retrieved'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error searching ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get ledger summary dashboard
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function dashboard(Request $request)
    {
        try {
            $totalLedgers = Ledger::count();
            $bankAccounts = Ledger::bankAccounts()->count();
            $inventoryLedgers = Ledger::inventoryLedgers()->count();
            $receivables = Ledger::withAging()->count();
            $payables = Ledger::withCreditAging()->count();
            $reconciliationLedgers = Ledger::withReconciliation()->count();

            // Get group-wise summary
            $groupSummary = DB::table('ledgers')
                ->join('groups', 'ledgers.group_id', '=', 'groups.id')
                ->select('groups.name', 'groups.code', DB::raw('COUNT(ledgers.id) as count'))
                ->groupBy('groups.id', 'groups.name', 'groups.code')
                ->orderBy('groups.code')
                ->get();

            // Get recent ledgers
            $recentLedgers = Ledger::with('group')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'name', 'group_id', 'created_at']);

            return response()->json([
                'success' => true,
                'data' => [
                    'statistics' => [
                        'total_ledgers' => $totalLedgers,
                        'bank_accounts' => $bankAccounts,
                        'inventory_ledgers' => $inventoryLedgers,
                        'receivables' => $receivables,
                        'payables' => $payables,
                        'reconciliation_enabled' => $reconciliationLedgers
                    ],
                    'group_summary' => $groupSummary,
                    'recent_ledgers' => $recentLedgers
                ],
                'message' => 'Dashboard data retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving dashboard data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export ledgers to CSV
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function export(Request $request)
    {
        try {
            $ledgers = Ledger::with(['group', 'openingBalance'])->get();

            $csvData = "ID,Name,Group,Type,Code,Opening Balance,Balance Type,Properties\n";

            foreach ($ledgers as $ledger) {
                $properties = [];
                if ($ledger->reconciliation) $properties[] = 'Reconciliation';
                if ($ledger->pa) $properties[] = 'P&L Accumulation';
                if ($ledger->hb) $properties[] = 'Has Bill';
                if ($ledger->aging) $properties[] = 'Aging';
                if ($ledger->credit_aging) $properties[] = 'Credit Aging';
                if ($ledger->iv) $properties[] = 'Inventory';

                $openingBalance = $ledger->openingBalance->first();
                $openingAmount = 0;
                $openingType = '';

                if ($openingBalance) {
                    if ($openingBalance->dr_amount > 0) {
                        $openingAmount = $openingBalance->dr_amount;
                        $openingType = 'Dr';
                    } else {
                        $openingAmount = $openingBalance->cr_amount;
                        $openingType = 'Cr';
                    }
                }

                $csvData .= sprintf(
                    "%d,%s,%s,%s,%s,%s,%s,%s\n",
                    $ledger->id,
                    $ledger->name,
                    $ledger->group->name ?? '',
                    $ledger->type ? 'Bank' : 'Normal',
                    $ledger->getFullCode(),
                    $openingAmount,
                    $openingType,
                    implode(';', $properties)
                );
            }

            return response($csvData, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="ledgers_' . date('YmdHis') . '.csv"'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error exporting ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import ledgers from CSV
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt|max:5120'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $file = $request->file('file');
            $csvData = array_map('str_getcsv', file($file->getRealPath()));

            // Skip header row
            array_shift($csvData);

            $imported = 0;
            $failed = [];

            foreach ($csvData as $row) {
                try {
                    if (count($row) < 3) continue; // Skip invalid rows

                    $ledgerName = trim($row[0]);
                    $groupId = trim($row[1]);
                    $ledgerType = isset($row[2]) ? (strtolower(trim($row[2])) == 'bank' ? 1 : 0) : 0;

                    // Check if ledger already exists
                    $exists = Ledger::where('name', $ledgerName)->exists();
                    if ($exists) {
                        $failed[] = ['name' => $ledgerName, 'reason' => 'Already exists'];
                        continue;
                    }

                    // Create ledger
                    Ledger::create([
                        'name' => $ledgerName,
                        'group_id' => $groupId,
                        'type' => $ledgerType,
                        'reconciliation' => isset($row[3]) ? (bool)$row[3] : false,
                        'pa' => isset($row[4]) ? (bool)$row[4] : false,
                        'hb' => isset($row[5]) ? (bool)$row[5] : false,
                        'aging' => isset($row[6]) ? (bool)$row[6] : false,
                        'credit_aging' => isset($row[7]) ? (bool)$row[7] : false,
                        'iv' => isset($row[8]) ? (bool)$row[8] : false,
                        'is_migrate' => false
                    ]);

                    $imported++;
                } catch (\Exception $e) {
                    $failed[] = ['row' => implode(',', $row), 'reason' => $e->getMessage()];
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'imported' => $imported,
                    'failed' => $failed
                ],
                'message' => "Successfully imported {$imported} ledgers"
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error importing ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getNextRightCode(Request $request)
    {
        try {
            $groupId = $request->get('group_id');
            if (!$groupId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Group ID is required'
                ], 422);
            }

            // Get the group to find its code (left_code)
            $group = Group::find($groupId);

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Group not found'
                ], 404);
            }

            $leftCode = $group->code;

            // Get all existing right codes for this left code
            $existingCodes = Ledger::where('left_code', $leftCode)
                ->whereNotNull('right_code')
                ->pluck('right_code')
                ->map(function ($code) {
                    // Convert to integer for proper sorting and comparison
                    return intval($code);
                })
                ->sort()
                ->values()
                ->toArray();

            $nextCode = '0001'; // Default if no codes exist

            if (!empty($existingCodes)) {
                $highestCode = max($existingCodes);

                if ($highestCode < 9999) {
                    // Simple case: just increment the highest code
                    $nextCode = str_pad($highestCode + 1, 4, '0', STR_PAD_LEFT);
                } else {
                    // Need to find a gap in the sequence
                    $nextCode = $this->findGapInSequence($existingCodes);
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'next_code' => $nextCode,
                    'left_code' => $leftCode,
                    'group_name' => $group->name
                ],
                'message' => 'Next available code retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting next code',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Find the first gap in a sequence of numbers
     *
     * @param array $existingCodes
     * @return string
     */
    private function findGapInSequence($existingCodes)
    {
        // Start from 1 and find the first missing number
        for ($i = 1; $i <= 9999; $i++) {
            if (!in_array($i, $existingCodes)) {
                return str_pad($i, 4, '0', STR_PAD_LEFT);
            }
        }

        // This shouldn't happen if we have less than 9999 codes
        // but return 9999 as fallback
        return '9999';
    }

    public function getAvailableCodesCount(Request $request)
    {
        try {
            $groupId = $request->get('group_id');
            $group = Group::findOrFail($groupId);

            $usedCount = Ledger::where('left_code', $group->code)
                ->whereNotNull('right_code')
                ->count();

            $availableCount = 9999 - $usedCount;

            return response()->json([
                'success' => true,
                'data' => [
                    'used_count' => $usedCount,
                    'available_count' => $availableCount,
                    'percentage_used' => round(($usedCount / 9999) * 100, 2)
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting count',
                'error' => $e->getMessage()
            ], 500);
        }
    }
	public function expenseLedgers()
    {
        try {
			$ledgers = Ledger::select('ledgers.id', 'ledgers.name', 'ledgers.right_code', 'ledgers.left_code')
				->join('groups', 'groups.id', '=', 'ledgers.group_id')
				->whereBetween('groups.code', [5000, 6999])
				->orderBy('ledgers.name')
				->get();
            return response()->json([
                'success' => true,
                'data' => [
                    'ledgers' => $ledgers
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch form data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
	public function taxLedgers()
    {
        try {
			$ledgers = Ledger::select('ledgers.id', 'ledgers.name', 'ledgers.right_code', 'ledgers.left_code')
				->join('groups', 'groups.id', '=', 'ledgers.group_id')
				->whereBetween('groups.code', [2000, 2999])
				->where('groups.tc', '!=', 1)
				->orderBy('ledgers.name')
				->get();
            return response()->json([
                'success' => true,
                'data' => [
                    'ledgers' => $ledgers
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch form data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
	public function incomeLedgers()
    {
        try {
			$ledgers = Ledger::select('ledgers.id', 'ledgers.name', 'ledgers.right_code', 'ledgers.left_code')
				->join('groups', 'groups.id', '=', 'ledgers.group_id')
				->where(function($query) {
					$query->whereBetween('groups.code', [4000, 4999])
						  ->orWhereBetween('groups.code', [8000, 8999]);
				})
				->orderBy('ledgers.name')
				->get();
            return response()->json([
                'success' => true,
                'data' => [
                    'ledgers' => $ledgers
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch form data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
