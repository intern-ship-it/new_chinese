<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Reconciliation;
use App\Models\ReconciliationAdjustment;
use App\Models\Ledger;
use App\Models\Entry;
use App\Models\EntryItem;
use App\Models\AcYear;
use App\Models\AcYearLedgerBalance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ReconciliationController extends Controller
{
    /**
     * List all reconciliations
     */
    public function index(Request $request)
    {
        try {
            $query = Reconciliation::with(['ledger', 'reconciledBy']);
            
            // Filter by ledger
            if ($request->filled('ledger_id')) {
                $query->where('ledger_id', $request->ledger_id);
            }
            
            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            
            // Filter by month
            if ($request->filled('month')) {
                $query->where('month', $request->month);
            }
            
            $reconciliations = $query->orderBy('month', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $reconciliations
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching reconciliations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reconciliations'
            ], 500);
        }
    }
    
    /**
     * Start new reconciliation
     */
    public function start(Request $request)
    {
        $request->validate([
            'ledger_id' => 'required|exists:ledgers,id',
            'month' => 'required|date_format:Y-m',
            'statement_closing_balance' => 'required|numeric'
        ]);
        
        // Check if reconciliation already exists
        $existing = Reconciliation::where('ledger_id', $request->ledger_id)
            ->where('month', $request->month)
            ->first();
            
        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Reconciliation already exists for this month'
            ], 422);
        }
        
        // Verify ledger has reconciliation enabled
        $ledger = Ledger::find($request->ledger_id);

        if (!$ledger || $ledger->reconciliation != 1) {

            return response()->json([
                'success' => false,
                'message' => 'Selected ledger is not enabled for reconciliation'
            ], 422);
        }
        
         DB::beginTransaction();
        
        try {
            // Calculate opening balance
            $openingBalance = $this->calculateOpeningBalance($request->ledger_id, $request->month);
         
            // Create reconciliation
            $reconciliation = new Reconciliation();
                      
            $reconciliation->ledger_id = $request->ledger_id;
              
            $reconciliation->month = $request->month;
            $reconciliation->statement_closing_balance = $request->statement_closing_balance;
            $reconciliation->reconciled_balance = $openingBalance;
            $reconciliation->opening_balance = $openingBalance;
            $reconciliation->difference = $request->statement_closing_balance - $openingBalance;
            $reconciliation->status = 'draft';
            $reconciliation->created_at = now();
            $reconciliation->created_by = Auth::id();
             $reconciliation->save();

            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Reconciliation started successfully',
                'data' => $reconciliation->load('ledger')
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating reconciliation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to start reconciliation'
            ], 500);
        }
    }
    
    /**
     * Get reconciliation process data
     */
    public function process($id)
	{
		try {
			$reconciliation = Reconciliation::with('ledger')->findOrFail($id);
			
			if (!$reconciliation->canEdit()) {
				return response()->json([
					'success' => false,
					'message' => 'Reconciliation cannot be edited'
				], 422);
			}
			
			// Get current month transactions
			$monthStart = $reconciliation->month . '-01';
			$monthEnd = date('Y-m-t', strtotime($monthStart));
			
			$transactions = EntryItem::with('entry')
				->where('ledger_id', $reconciliation->ledger_id)
				->whereHas('entry', function($query) use ($monthStart, $monthEnd) {
					$query->whereBetween('date', [$monthStart, $monthEnd]);
				})
				->orderBy('id')
				->get();
			
			// Get pending transactions from previous months
			// Include BOTH unreconciled items AND items reconciled in THIS reconciliation
			$pendingTransactions = EntryItem::with('entry')
				->where('ledger_id', $reconciliation->ledger_id)
				->where(function($query) use ($id) {
					$query->where('is_reconciled', 0)
						  ->orWhere('reconciliation_id', $id);
				})
				->whereHas('entry', function($query) use ($monthStart) {
					$query->where('date', '<', $monthStart);
				})
				->orderBy('id')
				->get();
			
			return response()->json([
				'success' => true,
				'data' => [
					'reconciliation' => $reconciliation,
					'transactions' => $transactions,
					'pending_transactions' => $pendingTransactions
				]
			]);
			
		} catch (\Exception $e) {
			\Log::error('Error loading reconciliation process: ' . $e->getMessage());
			return response()->json([
				'success' => false,
				'message' => 'Failed to load reconciliation data'
			], 500);
		}
	}
    
    /**
     * Update reconciled items
     */
    public function updateItems(Request $request, $id)
    {
        $request->validate([
            'items' => 'array'
        ]);
        
        try {
            $reconciliation = Reconciliation::findOrFail($id);
            
            if (!$reconciliation->canEdit()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reconciliation cannot be edited'
                ], 422);
            }
            
            // Unmark all items for this reconciliation
            EntryItem::where('reconciliation_id', $id)
                ->update([
                    'is_reconciled' => 0,
                    'reconciliation_id' => null,
                    'reconciliation_date' => null
                ]);
            
            // Mark selected items as reconciled
            if (!empty($request->items)) {
                EntryItem::whereIn('id', $request->items)
                    ->update([
                        'is_reconciled' => 1,
                        'reconciliation_id' => $id,
                        'reconciliation_date' => now()
                    ]);
            }
            
            // Recalculate reconciled balance
            $reconciledBalance = $this->calculateReconciledBalance($reconciliation);
            $reconciliation->updateReconciledBalance($reconciledBalance);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'reconciled_balance' => $reconciledBalance,
                    'difference' => $reconciliation->difference
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error updating reconciliation items: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update items'
            ], 500);
        }
    }
    
    /**
     * Create adjustment
     */
    public function createAdjustment(Request $request, $id)
    {
        $request->validate([
            'type' => 'required|in:debit,credit',
            'adjustment_ledger_id' => 'required|exists:ledgers,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string'
        ]);
        
        DB::beginTransaction();
        
        try {
            $reconciliation = Reconciliation::findOrFail($id);
            
            if (!$reconciliation->canEdit()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reconciliation cannot be edited'
                ], 422);
            }
            
            // Create adjustment entry
            $entryCode = $this->generateAdjustmentCode($reconciliation);
                   
            $entry = new Entry();
            $entry->entrytype_id = 4; // Journal
            $entry->number = $entryCode;
            $entry->entry_code = $entryCode;
            $entry->date = date('Y-m-t', strtotime($reconciliation->month . '-01'));
            $entry->dr_total = $request->amount;
            $entry->cr_total = $request->amount;
            $entry->narration = 'Reconciliation Adjustment: ' . $request->description;
            $entry->fund_id = 1; // Default fund
            $entry->created_by = Auth::id();
             $entry->save();
     
            // Create entry items
            if ($request->type === 'debit') {
                // Debit bank account
                EntryItem::create([
                    'entry_id' => $entry->id,
                    'ledger_id' => $reconciliation->ledger_id,
                    'amount' => $request->amount,
                    'dc' => 'D',
                    'is_reconciled' => 1,
                    'reconciliation_id' => $reconciliation->id,
                    'reconciliation_date' => now()
                ]);
                
                // Credit adjustment ledger
                EntryItem::create([
                    'entry_id' => $entry->id,
                    'ledger_id' => $request->adjustment_ledger_id,
                    'amount' => $request->amount,
                    'dc' => 'C'
                ]);
            } else {
                // Credit bank account
                EntryItem::create([
                    'entry_id' => $entry->id,
                    'ledger_id' => $reconciliation->ledger_id,
                    'amount' => $request->amount,
                    'dc' => 'C',
                    'is_reconciled' => 1,
                    'reconciliation_id' => $reconciliation->id,
                    'reconciliation_date' => now()
                ]);
                
                // Debit adjustment ledger
                EntryItem::create([
                    'entry_id' => $entry->id,
                    'ledger_id' => $request->adjustment_ledger_id,
                    'amount' => $request->amount,
                    'dc' => 'D'
                ]);
            }
    
            // Create adjustment record
            $adjustment = new ReconciliationAdjustment();
            $adjustment->reconciliation_id = $reconciliation->id;
            $adjustment->adjustment_type = 'manual_entry';
            $adjustment->entry_id = $entry->id;
            $adjustment->amount = $request->amount;
            $adjustment->description = $request->description;
            $adjustment->created_by = Auth::id();
            $adjustment->created_at = now();
            $adjustment->save();
                 
            // Recalculate balance
            $reconciledBalance = $this->calculateReconciledBalance($reconciliation);
            $reconciliation->updateReconciledBalance($reconciledBalance);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Adjustment created successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error creating adjustment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create adjustment'
            ], 500);
        }
    }
    
    /**
     * Finalize reconciliation
     */
    public function finalize(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string'
        ]);
        
         try {
            $reconciliation = Reconciliation::findOrFail($id);
            
            if (!$reconciliation->canEdit()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reconciliation cannot be edited'
                ], 422);
            }
            
            // Check if balanced
            if (abs($reconciliation->difference) > 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot finalize - reconciliation is not balanced'
                ], 422);
            }
       
            
            $reconciliation->status = 'completed';
            $reconciliation->reconciled_date = now();
            $reconciliation->reconciled_by = Auth::id();
            $reconciliation->notes = $request->notes;
            $reconciliation->notes = $request->notes;
                  $reconciliation->updated_at = date('Y-m-d H:i:s');
            $reconciliation->save();
              
    
            return response()->json([
                'success' => true,
                'message' => 'Reconciliation finalized successfully'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error finalizing reconciliation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to finalize reconciliation'
            ], 500);
        }
    }
    
    /**
     * Lock reconciliation
     */
    public function lock($id)
    {
        try {
            $reconciliation = Reconciliation::findOrFail($id);
            
            if ($reconciliation->status !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only completed reconciliations can be locked'
                ], 422);
            }
            
            $reconciliation->status = 'locked';
            $reconciliation->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Reconciliation locked successfully'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error locking reconciliation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to lock reconciliation'
            ], 500);
        }
    }
    
    /**
     * Delete reconciliation
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        
        try {
            $reconciliation = Reconciliation::findOrFail($id);
            
            if ($reconciliation->isLocked()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Locked reconciliations cannot be deleted'
                ], 422);
            }
            
            // Unmark all reconciled items
            EntryItem::where('reconciliation_id', $id)
                ->update([
                    'is_reconciled' => 0,
                    'reconciliation_id' => null,
                    'reconciliation_date' => null
                ]);
            
            // Delete adjustments
            ReconciliationAdjustment::where('reconciliation_id', $id)->delete();
            
            // Delete reconciliation
            $reconciliation->delete();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Reconciliation deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('Error deleting reconciliation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete reconciliation'
            ], 500);
        }
    }
    
    /**
     * Calculate opening balance
     */
    private function calculateOpeningBalance($ledgerId, $month)
    {
		$currentYear = AcYear::where('status', 1)->first();
		$ledger_balance = AcYearLedgerBalance::where('ac_year_id',$currentYear->id)->where('ledger_id', $ledgerId)->first();
		$debitTotal = $creditTotal = 0;
		if(!empty($ledger_balance)){
			$debitTotal = $ledger_balance->dr_amount;
			$creditTotal = $ledger_balance->cr_amount;
		}
		
        $monthStart = $month . '-01';
        // Get all transactions before this month
        $debitTotal += EntryItem::where('ledger_id', $ledgerId)
            ->where('dc', 'D')
			->where('is_reconciled', 1)
            ->whereHas('entry', function($query) use ($monthStart) {
                $query->where('date', '<', $monthStart);
            })
            ->sum('amount');
             
        $creditTotal += EntryItem::where('ledger_id', $ledgerId)
            ->where('dc', 'C')
			->where('is_reconciled', 1)
            ->whereHas('entry', function($query) use ($monthStart) {
                $query->where('date', '<', $monthStart);
            })
            ->sum('amount');
            
        return $debitTotal - $creditTotal;
    }
    
    /**
     * Calculate reconciled balance
     */
    private function calculateReconciledBalance($reconciliation)
    {
        // Start with opening balance
        $balance = $reconciliation->opening_balance;
        
        // Add reconciled items
        $debitTotal = EntryItem::where('reconciliation_id', $reconciliation->id)
            ->where('dc', 'D')
            ->sum('amount');
            
        $creditTotal = EntryItem::where('reconciliation_id', $reconciliation->id)
            ->where('dc', 'C')
            ->sum('amount');
            
        return $balance + $debitTotal - $creditTotal;
    }
    
    /**
     * Generate adjustment entry code
     */
    private function generateAdjustmentCode($reconciliation)
    {
        $prefix = 'ADJ';
        $date = date('ym', strtotime($reconciliation->month . '-01'));
        
        $lastEntry = Entry::where('entry_code', 'LIKE', $prefix . $date . '%')
            ->orderBy('id', 'desc')
            ->first();
            
        if ($lastEntry) {
            $lastNumber = intval(substr($lastEntry->entry_code, -5));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . $date . sprintf('%05d', $newNumber);
    }
    public function view($id)
{
    try {
        $reconciliation = Reconciliation::with(['ledger', 'adjustments.creator', 'reconciledBy'])
            ->findOrFail($id);
            
        // Get reconciled items
        $reconciledItems = EntryItem::with(['entry'])
            ->where('reconciliation_id', $id)
            ->where('is_reconciled', 1)
            ->orderBy('id')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => [
                'reconciliation' => $reconciliation,
                'reconciled_items' => $reconciledItems,
                'adjustments' => $reconciliation->adjustments
            ]
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error viewing reconciliation: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to load reconciliation details'
        ], 500);
    }
}

/**
 * Generate reconciliation report
 */
public function report($id)
{
     
    try {
        $reconciliation = Reconciliation::with(['ledger', 'adjustments.creator', 'reconciledBy', 'creator'])
            ->findOrFail($id);
    
        // Get month start and end dates
        $monthStart = $reconciliation->month . '-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));
        
        // Get all transactions for the month
        $allTransactions = EntryItem::with(['entry'])
            ->where('ledger_id', $reconciliation->ledger_id)
            ->whereHas('entry', function($query) use ($monthStart, $monthEnd) {
                $query->whereBetween('date', [$monthStart, $monthEnd]);
            })
            ->orderBy('id')
            ->get();
        
        // Separate reconciled and unreconciled items
        $reconciledItems = $allTransactions->filter(function($item) use ($reconciliation) {
            return $item->reconciliation_id == $reconciliation->id && $item->is_reconciled == 1;
        });
        
        $unreconciledItems = $allTransactions->filter(function($item) {
            return $item->is_reconciled == 0;
        });
        
        // Calculate totals for unreconciled items
        $unpresentedCheques = $unreconciledItems->filter(function($item) {
            return $item->dc == 'C';
        });
        
        $unclearedDeposits = $unreconciledItems->filter(function($item) {
            return $item->dc == 'D';
        });
        
        $totalUnpresented = $unpresentedCheques->sum('amount');
        $totalUncleared = $unclearedDeposits->sum('amount');
        
        // Prepare report data
        $reportData = [
            'reconciliation' => $reconciliation,
            'reconciled_items' => $reconciledItems,
            'unreconciled_items' => $unreconciledItems,
            'unpresented_cheques' => $unpresentedCheques,
            'uncleared_deposits' => $unclearedDeposits,
            'total_unpresented' => $totalUnpresented,
            'total_uncleared' => $totalUncleared,
            'temple' => [
                'name' => 'Temple Management System',
                'address' => 'Temple Address',
                'phone' => 'Temple Phone',
                'email' => 'temple@email.com'
            ]
        ];
        
        return response()->json([
            'success' => true,
            'data' => $reportData
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error generating reconciliation report: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to generate report'
        ], 500);
    }
}

/**
 * Add investigation note to transaction
 */
public function addInvestigationNote(Request $request, $id)
{
    $request->validate([
        'item_id' => 'required|exists:entryitems,id',
        'note' => 'required|string|max:500'
    ]);
    
    try {
        $reconciliation = Reconciliation::findOrFail($id);
        
        if (!$reconciliation->canEdit()) {
            return response()->json([
                'success' => false,
                'message' => 'Reconciliation cannot be edited'
            ], 422);
        }
        
        // Update the entry item with investigation note
        $item = EntryItem::findOrFail($request->item_id);
        $item->narration = ($item->narration ? $item->narration . ' | ' : '') . 'Investigation: ' . $request->note;
        $item->save();
        
        // Create adjustment record for tracking
        $adjustment = new ReconciliationAdjustment();
        $adjustment->reconciliation_id = $reconciliation->id;
        $adjustment->adjustment_type = 'investigation_tag';
        $adjustment->amount = 0;
        $adjustment->description = 'Investigation note: ' . $request->note . ' (Item ID: ' . $request->item_id . ')';
        $adjustment->created_by = Auth::id();
        $adjustment->created_at = now();
        $adjustment->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Investigation note added successfully'
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error adding investigation note: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to add investigation note'
        ], 500);
    }
}

/**
 * Update bank statement balance
 */
public function updateBalance(Request $request, $id)
{
    $request->validate([
        'statement_closing_balance' => 'required|numeric|min:0'
    ]);
    
    try {
        $reconciliation = Reconciliation::findOrFail($id);
        
        if (!$reconciliation->canEdit()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot edit balance - reconciliation is not in draft status'
            ], 422);
        }
        
        $reconciliation->statement_closing_balance = $request->statement_closing_balance;
        $reconciliation->difference = $reconciliation->statement_closing_balance - $reconciliation->reconciled_balance;
        $reconciliation->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Balance updated successfully',
            'data' => [
                'statement_closing_balance' => $reconciliation->statement_closing_balance,
                'difference' => $reconciliation->difference
            ]
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error updating statement balance: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to update balance'
        ], 500);
    }
}

public function ReconciliationbankAccounts()
{
    try {
        // Bank accounts have type = 1
        $bankLedgers = Ledger::where('type', 1)
            ->where('reconciliation', 1)
            ->orderBy('name')
            ->get();
            // print_r($bankLedgers); die; 
        return response()->json([
            'success' => true,
            'data' => $bankLedgers
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error fetching bank accounts: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch bank accounts'
        ], 500);
    }
}
public function AcYears()
{
    try {
        
       $currentYear = AcYear::where('status', 1)->first();
  
        return response()->json([
            'success' => true,
            'data' => $currentYear
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error fetching Current Accounting Year: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch Current Accounting Year'
        ], 500);
    }
}

}