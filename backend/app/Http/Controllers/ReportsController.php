<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Entry;
use App\Models\EntryItem;
use App\Models\Ledger;
use App\Models\AcYear;
use App\Models\Group;
use App\Models\AcYearLedgerBalance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Exports\GeneralLedgerExport;
use App\Exports\TrialBalanceExport;
use App\Exports\BalanceSheetExport;
use App\Exports\ReceiptPaymentsExport;
use App\Exports\CashFlowExport;
use Illuminate\Support\Facades\Log;

class ReportsController extends Controller
{
    /**
     * General Ledger Report API
     */
    public function generalLedger(Request $request)
    {
        try {
            // Validate request
            $request->validate([
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date|after_or_equal:from_date',
                'ledger_ids' => 'nullable|array',
                'ledger_ids.*' => 'exists:ledgers,id',
                'invoice_type' => 'nullable|in:all,manual,1,2,3,4'
            ]);
            	Log::info('Request Data:', $request->all());

            $ledgerReports = $this->getGeneralLedgerData($request);
            return response()->json($ledgerReports);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating general ledger report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
	function getGeneralLedgerData($request){
		// Get active accounting year
		$activeYear = AcYear::where('status', 1)->first();

		if (!$activeYear) {
			return response()->json([
				'success' => false,
				'message' => 'No active accounting year found'
			], 404);
		}
		// Set default dates
		$fromDate = $request->from_date ?? date('Y-m-01');
		$toDate = $request->to_date ?? date('Y-m-t');
		
		// Get selected ledgers
		$selectedLedgerIds = $request->ledger_ids ?? [];
		if (!is_array($selectedLedgerIds)) {
			$selectedLedgerIds = [$selectedLedgerIds];
		}
		$selectedLedgerIds = array_filter($selectedLedgerIds);
		
		$ledgerReports = [];
		
		if (!empty($selectedLedgerIds)) {
			foreach ($selectedLedgerIds as $ledgerId) {
				$ledger = Ledger::find($ledgerId);
				
				if ($ledger) {
					// Get opening balance
					$openingBalance = $this->calculateOpeningBalance($ledgerId, $fromDate, $activeYear);
					
					// Build query for transactions - PostgreSQL compatible
					$query = EntryItem::with(['entry'])
						->whereRaw('ledger_id::integer = ?', [$ledgerId])
						->whereHas('entry', function($q) use ($fromDate, $toDate, $request) {
							$q->whereRaw("date::date >= ?::date", [$fromDate])
							  ->whereRaw("date::date <= ?::date", [$toDate]);
							
							// Apply invoice type filter
							if ($request->filled('invoice_type') && $request->invoice_type !== 'all') {
								if ($request->invoice_type == 'manual') {
									$q->whereNull('inv_type');
								} else {
									$q->where('inv_type', $request->invoice_type);
								}
							}
						})
						->join('entries', 'entryitems.entry_id', '=', 'entries.id')
						->orderBy('entries.date', 'asc')
						->orderBy('entries.id', 'asc')
						    ->select('entryitems.*', 'entries.*');
                      
					
					$transactions = $query->get();
					//dd($transactions ); die;
					// Calculate running balance
					$runningBalance = [
						'debit' => $openingBalance['debit'],
						'credit' => $openingBalance['credit']
					];
					
					$transactionData = [];
					foreach ($transactions as $transaction) {
						if ($transaction->dc == 'D') {
							$runningBalance['debit'] += $transaction->amount;
						} else {
							$runningBalance['credit'] += $transaction->amount;
						}
						
						// Calculate net balance for display
						$netBalance = $runningBalance['debit'] - $runningBalance['credit'];
						
						$transactionData[] = [
							'id' => $transaction->id,
							'date' => $transaction->entry->date,
							'entry_code' => $transaction->entry->entry_code,
							'entry_type' => $transaction->entry->entrytype_id,
							'narration' => $transaction->entry->narration,
							'debit' => $transaction->dc == 'D' ? $transaction->amount : 0,
							'credit' => $transaction->dc == 'C' ? $transaction->amount : 0,
							'running_balance' => abs($netBalance),
							'balance_type' => $netBalance >= 0 ? 'Dr' : 'Cr'
						];
					}
					
					$closingBalance = $runningBalance;
					
					$ledgerReports[] = [
						'ledger' => [
							'id' => $ledger->id,
							'name' => $ledger->name,
							'code' => $ledger->left_code . '/' . $ledger->right_code
						],
						'transactions' => $transactionData,
						'opening_balance' => $openingBalance,
						'closing_balance' => $closingBalance,
						'total_transactions' => count($transactionData)
					];
				}
			}
		}
		return [
                'success' => true,
                'data' => [
                    'ledger_reports' => $ledgerReports,
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                    'active_year' => [
                        'id' => $activeYear->id,
                        'from' => $activeYear->from_year_month,
                        'to' => $activeYear->to_year_month
                    ]
                ]
            ];
	}
    
    /**
     * Trial Balance Report API
     */
    public function trialBalance(Request $request)
    {
        try {
            // Validate request
			$request->validate([
				'from_date' => 'nullable|date',
				'to_date' => 'nullable|date|after_or_equal:from_date'
			]);
			$trialBalanceReports = $this->getTrialBalanceData($request);
            return response()->json($trialBalanceReports);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating trial balance report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
	function getTrialBalanceData($request){
		$activeYear = AcYear::where('status', 1)->first();
            
		if (!$activeYear) {
			return response()->json([
				'success' => false,
				'message' => 'No active accounting year found'
			], 404);
		}
		
		// Set default dates
		$fromDate = $request->from_date ?? $activeYear->from_year_month;
		$toDate = $request->to_date ?? date('Y-m-d');
		
		// Get all parent groups
		$parentGroups = Group::where('parent_id', 0)
			->with(['children.children', 'ledgers'])
			->orderBy('code', 'asc')
			->get();
		
		// Process groups and calculate balances
		$trialBalanceData = [];
		$grandTotals = [
			'opening_debit' => 0,
			'opening_credit' => 0,
			'closing_debit' => 0,
			'closing_credit' => 0
		];
		
		foreach ($parentGroups as $parentGroup) {
			$groupData = $this->processGroupForTrialBalance($parentGroup, $activeYear, $fromDate, $toDate);
			
			if ($this->hasTrialBalanceData($groupData)) {
				$trialBalanceData[] = $groupData;
				
				$grandTotals['opening_debit'] += $groupData['total_opening_debit'];
				$grandTotals['opening_credit'] += $groupData['total_opening_credit'];
				$grandTotals['closing_debit'] += $groupData['total_closing_debit'];
				$grandTotals['closing_credit'] += $groupData['total_closing_credit'];
			}
		}
		
		// Check if balanced
		$isBalanced = abs($grandTotals['closing_debit'] - $grandTotals['closing_credit']) < 0.01;
		
		return [
			'success' => true,
			'data' => [
				'trial_balance' => $trialBalanceData,
				'grand_totals' => $grandTotals,
				'is_balanced' => $isBalanced,
				'from_date' => $fromDate,
				'to_date' => $toDate,
				'active_year' => [
					'id' => $activeYear->id,
					'from' => $activeYear->from_year_month,
					'to' => $activeYear->to_year_month
				]
			]
		];
	}
    
    /**
     * Balance Sheet Report API
     */
    public function balanceSheet(Request $request)
    {
        try {
            // Validate request
			$request->validate([
				'date' => 'nullable|date'
			]);
			$BalancesheetReports = $this->getBalanceSheetData($request);
            return response()->json($BalancesheetReports);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating balance sheet report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
	
	function getBalanceSheetData($request){
		$activeYear = AcYear::where('status', 1)->first();
            
		if (!$activeYear) {
			return response()->json([
				'success' => false,
				'message' => 'No active accounting year found'
			], 404);
		}
		
		
		// Set default date
		$asOnDate = $request->date ?? date('Y-m-d');
		
		// Get balance sheet groups (Assets, Liabilities, Equity)
		$balanceSheetGroups = Group::whereIn('code', ['1000', '2000', '3000'])
			->where('parent_id', 0)
			->with(['children.children', 'ledgers'])
			->orderBy('code', 'asc')
			->get();
		
		// Process groups
		$balanceSheetData = [];
		$totals = [
			'assets' => ['current' => 0, 'previous' => 0],
			'liabilities' => ['current' => 0, 'previous' => 0],
			'equity' => ['current' => 0, 'previous' => 0]
		];
		
		foreach ($balanceSheetGroups as $group) {
			$groupData = $this->processGroupForBalanceSheet($group, $activeYear, $asOnDate);
			
			if ($this->hasDisplayableData($groupData)) {
				$balanceSheetData[] = $groupData;
				
				// Accumulate totals
				if ($group->code == '1000') { // Assets
					$totals['assets']['current'] = $groupData['current_balance'];
					$totals['assets']['previous'] = $groupData['previous_balance'];
				} elseif ($group->code == '2000') { // Liabilities
					$totals['liabilities']['current'] = $groupData['current_balance'];
					$totals['liabilities']['previous'] = $groupData['previous_balance'];
				} elseif ($group->code == '3000') { // Equity
					$totals['equity']['current'] = $groupData['current_balance'];
					$totals['equity']['previous'] = $groupData['previous_balance'];
				}
			}
		}
		
		// Calculate Current Year Profit & Loss
		$currentProfitLoss = $this->calculateCurrentProfitLoss($activeYear, $asOnDate);
		
		// Add to equity if not zero
		if ($currentProfitLoss != 0) {
			foreach ($balanceSheetData as &$group) {
				if ($group['code'] == '3000') {
					$group['profit_loss'] = [
						'name' => 'Current Profit & Loss',
						'current' => $currentProfitLoss,
						'previous' => 0
					];
					$group['current_balance'] -= $currentProfitLoss;
					$totals['equity']['current'] -= $currentProfitLoss;
					break;
				}
			}
		}
		
		return [
			'success' => true,
			'data' => [
				'balance_sheet' => $balanceSheetData,
				'totals' => $totals,
				'profit_loss' => $currentProfitLoss,
				'as_on_date' => $asOnDate,
				'active_year' => [
					'id' => $activeYear->id,
					'from' => $activeYear->from_year_month,
					'to' => $activeYear->to_year_month
				]
			]
		];
	}
    
    /**
     * Get available ledgers for selection
     */
    public function getLedgers(Request $request)
    {
        try {
            $search = $request->search;
            
            $query = Ledger::with('group');
            
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'ILIKE', '%' . $search . '%')
                      ->orWhere('left_code', 'ILIKE', '%' . $search . '%')
                      ->orWhere('right_code', 'ILIKE', '%' . $search . '%');
                });
            }
            
            $ledgers = $query->orderBy('left_code')
                            ->orderBy('right_code')
                            ->limit(50)
                            ->get();
            
            $results = $ledgers->map(function($ledger) {
                return [
                    'id' => $ledger->id,
                    'name' => $ledger->name,
                    'code' => $ledger->left_code . '/' . $ledger->right_code,
                    'group' => $ledger->group ? $ledger->group->name : null,
                    'type' => $ledger->type == 1 ? 'Bank/Cash' : 'General'
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $results
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Calculate opening balance for a ledger (PostgreSQL compatible)
     */
    private function calculateOpeningBalance($ledgerId, $fromDate, $activeYear)
    {
        // Get year opening balance
        $yearOpeningBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->whereRaw('ledger_id::integer = ?', [$ledgerId])
            ->first();
        
        $openingDr = $yearOpeningBalance ? $yearOpeningBalance->dr_amount : 0;
        $openingCr = $yearOpeningBalance ? $yearOpeningBalance->cr_amount : 0;
        
        // Add transactions before from_date but within the accounting year
        if ($fromDate > $activeYear->from_year_month) {
            $priorTransactions = DB::table('entryitems')
                ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
                ->whereRaw('entryitems.ledger_id::integer = ?', [$ledgerId])
                ->whereRaw('entries.date::date >= ?::date', [$activeYear->from_year_month])
                ->whereRaw('entries.date::date < ?::date', [$fromDate])
                ->select(
                    DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
                    DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr")
                )
                ->first();
            
            $openingDr += $priorTransactions->total_dr ?? 0;
            $openingCr += $priorTransactions->total_cr ?? 0;
        }
        
        return [
            'debit' => (float)$openingDr,
            'credit' => (float)$openingCr
        ];
    }
    
    /**
     * Process group for trial balance (PostgreSQL compatible)
     */
    private function processGroupForTrialBalance($group, $activeYear, $fromDate, $toDate, $level = 0)
    {
        $groupData = [
            'id' => $group->id,
            'code' => $group->code,
            'name' => $group->name,
            'level' => $level,
            'is_group' => true,
            'total_opening_debit' => 0,
            'total_opening_credit' => 0,
            'total_closing_debit' => 0,
            'total_closing_credit' => 0,
            'children' => [],
            'ledgers' => []
        ];
        
        // Process direct ledgers
        foreach ($group->ledgers as $ledger) {
            $balances = $this->calculateLedgerBalances($ledger, $activeYear, $fromDate, $toDate);
            
            // Skip if all zero
            if ($balances['opening_debit'] == 0 && 
                $balances['opening_credit'] == 0 && 
                $balances['closing_debit'] == 0 && 
                $balances['closing_credit'] == 0) {
                continue;
            }
            
            $groupData['ledgers'][] = [
                'id' => $ledger->id,
                'code' => $ledger->left_code . '/' . $ledger->right_code,
                'name' => $ledger->name,
                'opening_debit' => $balances['opening_debit'],
                'opening_credit' => $balances['opening_credit'],
                'closing_debit' => $balances['closing_debit'],
                'closing_credit' => $balances['closing_credit']
            ];
            
            $groupData['total_opening_debit'] += $balances['opening_debit'];
            $groupData['total_opening_credit'] += $balances['opening_credit'];
            $groupData['total_closing_debit'] += $balances['closing_debit'];
            $groupData['total_closing_credit'] += $balances['closing_credit'];
        }
        
        // Process child groups
        foreach ($group->children as $childGroup) {
            $childData = $this->processGroupForTrialBalance($childGroup, $activeYear, $fromDate, $toDate, $level + 1);
            
            if ($this->hasTrialBalanceData($childData)) {
                $groupData['children'][] = $childData;
                
                $groupData['total_opening_debit'] += $childData['total_opening_debit'];
                $groupData['total_opening_credit'] += $childData['total_opening_credit'];
                $groupData['total_closing_debit'] += $childData['total_closing_debit'];
                $groupData['total_closing_credit'] += $childData['total_closing_credit'];
            }
        }
        
        return $groupData;
    }
    
    /**
     * Calculate ledger balances (PostgreSQL compatible)
     */
    private function calculateLedgerBalances($ledger, $activeYear, $fromDate, $toDate)
    {
        // Get year opening balance
        $yearOpeningBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->whereRaw('ledger_id::integer = ?', [$ledger->id])
            ->first();
        
        $openingDr = $yearOpeningBalance ? $yearOpeningBalance->dr_amount : 0;
        $openingCr = $yearOpeningBalance ? $yearOpeningBalance->cr_amount : 0;
        
        // Calculate opening balance as on from_date
        if ($fromDate > $activeYear->from_year_month) {
            $priorTransactions = DB::table('entryitems')
                ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
                ->whereRaw('entryitems.ledger_id::integer = ?', [$ledger->id])
                ->whereRaw('entries.date::date >= ?::date', [$activeYear->from_year_month])
                ->whereRaw('entries.date::date < ?::date', [$fromDate])
                ->select(
                    DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
                    DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr")
                )
                ->first();
            
            $openingDr += $priorTransactions->total_dr ?? 0;
            $openingCr += $priorTransactions->total_cr ?? 0;
        }
        
        // Calculate transactions within the period
        $periodTransactions = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->whereRaw('entryitems.ledger_id::integer = ?', [$ledger->id])
            ->whereRaw('entries.date::date >= ?::date', [$fromDate])
            ->whereRaw('entries.date::date <= ?::date', [$toDate])
            ->select(
                DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
                DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr")
            )
            ->first();
        
        $periodDr = $periodTransactions->total_dr ?? 0;
        $periodCr = $periodTransactions->total_cr ?? 0;
        
        // Calculate closing balance
        $closingDr = $openingDr + $periodDr;
        $closingCr = $openingCr + $periodCr;
        
        // Net calculation for display
        $openingNet = $openingDr - $openingCr;
        $closingNet = $closingDr - $closingCr;
        
        return [
            'opening_debit' => $openingNet > 0 ? (float)abs($openingNet) : 0,
            'opening_credit' => $openingNet < 0 ? (float)abs($openingNet) : 0,
            'closing_debit' => $closingNet > 0 ? (float)abs($closingNet) : 0,
            'closing_credit' => $closingNet < 0 ? (float)abs($closingNet) : 0
        ];
    }
    
    /**
     * Process group for balance sheet (PostgreSQL compatible)
     */
    private function processGroupForBalanceSheet($group, $activeYear, $asOnDate, $level = 0)
    {
        $groupData = [
            'id' => $group->id,
            'code' => $group->code,
            'name' => $group->name,
            'level' => $level,
            'is_group' => true,
            'current_balance' => 0,
            'previous_balance' => 0,
            'children' => [],
            'ledgers' => []
        ];
        
        // Process direct ledgers
        foreach ($group->ledgers as $ledger) {
            $balances = $this->calculateLedgerBalanceSheet($ledger, $activeYear, $asOnDate);
            
            // Skip if both zero
            if ($balances['current_closing'] == 0 && $balances['current_opening'] == 0) {
                continue;
            }
            
            $ledgerData = [
                'id' => $ledger->id,
                'code' => $ledger->left_code . '/' . $ledger->right_code,
                'name' => $ledger->name,
                'current_balance' => $balances['current_closing'],
                'previous_balance' => $balances['current_opening'],
                'is_pa_ledger' => $ledger->pa == 1
            ];
            
            $groupData['ledgers'][] = $ledgerData;
            $groupData['current_balance'] += $balances['current_closing'];
            $groupData['previous_balance'] += $balances['current_opening'];
        }
        
        // Process child groups
        foreach ($group->children as $childGroup) {
            $childData = $this->processGroupForBalanceSheet($childGroup, $activeYear, $asOnDate, $level + 1);
            
            if ($this->hasDisplayableData($childData)) {
                $groupData['children'][] = $childData;
                $groupData['current_balance'] += $childData['current_balance'];
                $groupData['previous_balance'] += $childData['previous_balance'];
            }
        }
        
        return $groupData;
    }
    
    /**
     * Calculate ledger balances for balance sheet (PostgreSQL compatible)
     */
    private function calculateLedgerBalanceSheet($ledger, $activeYear, $asOnDate)
    {
        // Get year opening balance
        $yearOpeningBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->whereRaw('ledger_id::integer = ?', [$ledger->id])
            ->first();
        
        $openingDr = $yearOpeningBalance ? $yearOpeningBalance->dr_amount : 0;
        $openingCr = $yearOpeningBalance ? $yearOpeningBalance->cr_amount : 0;
        $currentOpening = $openingDr - $openingCr;
        
        // Calculate closing balance as of the given date
        $transactions = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->whereRaw('entryitems.ledger_id::integer = ?', [$ledger->id])
            ->whereRaw('entries.date::date >= ?::date', [$activeYear->from_year_month])
            ->whereRaw('entries.date::date <= ?::date', [$asOnDate])
            ->select(
                DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
                DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr")
            )
            ->first();
        
        $periodDr = $transactions->total_dr ?? 0;
        $periodCr = $transactions->total_cr ?? 0;
        
        $closingDr = $openingDr + $periodDr;
        $closingCr = $openingCr + $periodCr;
        $currentClosing = $closingDr - $closingCr;
        
        return [
            'current_opening' => (float)$currentOpening,
            'current_closing' => (float)$currentClosing
        ];
    }
    
    /**
     * Calculate current year profit & loss (PostgreSQL compatible)
     */
    private function calculateCurrentProfitLoss($activeYear, $asOnDate)
    {
        // Revenue (4xxx) + Other Income (8xxx)
        $income = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->join('ledgers', DB::raw('entryitems.ledger_id::integer'), '=', 'ledgers.id')
            ->join('groups', 'ledgers.group_id', '=', 'groups.id')
            ->where(function($q) {
                $q->where('groups.code', 'LIKE', '4%')
                  ->orWhere('groups.code', 'LIKE', '8%');
            })
            ->whereRaw('entries.date::date >= ?::date', [$activeYear->from_year_month])
            ->whereRaw('entries.date::date <= ?::date', [$asOnDate])
            ->select(
                DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE -entryitems.amount END) as total")
            )
            ->first();
        
        // Direct Cost (5xxx) + Expenses (6xxx) + Taxation (9xxx)
        $expense = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->join('ledgers', DB::raw('entryitems.ledger_id::integer'), '=', 'ledgers.id')
            ->join('groups', 'ledgers.group_id', '=', 'groups.id')
            ->where(function($q) {
                $q->where('groups.code', 'LIKE', '5%')
                  ->orWhere('groups.code', 'LIKE', '6%')
                  ->orWhere('groups.code', 'LIKE', '9%');
            })
            ->whereRaw('entries.date::date >= ?::date', [$activeYear->from_year_month])
            ->whereRaw('entries.date::date <= ?::date', [$asOnDate])
            ->select(
                DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE -entryitems.amount END) as total")
            )
            ->first();
        
        $totalIncome = $income->total ?? 0;
        $totalExpense = $expense->total ?? 0;
        
        return (float)($totalIncome - $totalExpense);
    }
    
    /**
     * Check if group has trial balance data
     */
    private function hasTrialBalanceData($groupData)
    {
        return !empty($groupData['ledgers']) || 
               !empty($groupData['children']) || 
               $groupData['total_opening_debit'] != 0 || 
               $groupData['total_opening_credit'] != 0 || 
               $groupData['total_closing_debit'] != 0 || 
               $groupData['total_closing_credit'] != 0;
    }
    
    /**
     * Check if group has displayable data
     */
    private function hasDisplayableData($groupData)
    {
        return $groupData['current_balance'] != 0 || 
               $groupData['previous_balance'] != 0 || 
               !empty($groupData['ledgers']) || 
               !empty($groupData['children']);
    }
	/**
	 * Export General Ledger Report
	 */
	public function exportGeneralLedger(Request $request)
	{
		$request->validate([
			'format' => 'required|in:pdf,excel',
			'from_date' => 'required|date',
			'to_date' => 'required|date',
			'ledger_ids' => 'required|array'
		]);
		
		// Get the same data as the report
		$data = $this->getGeneralLedgerData($request);
		
		if ($request->format === 'pdf') {
			$pdf = PDF::loadView('exports.general-ledger-pdf', $data);
			return $pdf->download('general_ledger_' . date('YmdHis') . '.pdf');
		} else {
			return Excel::download(new GeneralLedgerExport($data), 
				'general_ledger_' . date('YmdHis') . '.xlsx');
		}
	}

	/**
	 * Export Trial Balance Report
	 */
	public function exportTrialBalance(Request $request)
	{
		$request->validate([
			'format' => 'required|in:pdf,excel',
			'from_date' => 'required|date',
			'to_date' => 'required|date'
		]);
		
		$data = $this->getTrialBalanceData($request);
		
		if ($request->format === 'pdf') {
			$pdf = PDF::loadView('exports.trial-balance-pdf', $data);
			$pdf->setPaper('a4', 'landscape');
			return $pdf->download('trial_balance_' . date('YmdHis') . '.pdf');
		} else {
			return Excel::download(new TrialBalanceExport($data), 
				'trial_balance_' . date('YmdHis') . '.xlsx');
		}
	}

	/**
	 * Export Balance Sheet Report
	 */
	public function exportBalanceSheet(Request $request)
	{
		$request->validate([
			'format' => 'required|in:pdf,excel',
			'date' => 'required|date'
		]);
		
		$data = $this->getBalanceSheetData($request);
		
		if ($request->format === 'pdf') {
			$pdf = PDF::loadView('exports.balance-sheet-pdf', $data);
			return $pdf->download('balance_sheet_' . date('YmdHis') . '.pdf');
		} else {
			return Excel::download(new BalanceSheetExport($data), 
				'balance_sheet_' . date('YmdHis') . '.xlsx');
		}
	}

	/**
	 * Receipt & Payments Report API
	 */
	public function receiptPayments(Request $request)
	{
		try {
			// Validate request
			$request->validate([
				'from_date' => 'required|date',
				'to_date' => 'required|date|after_or_equal:from_date'
			]);
			
			$reportData = $this->getReceiptPaymentsData($request);
			return response()->json($reportData);
			
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Error generating receipt & payments report',
				'error' => $e->getMessage()
			], 500);
		}
	}

	/**
	 * Get Receipt & Payments Report Data
	 */
	private function getReceiptPaymentsData($request)
	{
		$activeYear = AcYear::where('status', 1)->first();
		
		if (!$activeYear) {
			return [
				'success' => false,
				'message' => 'No active accounting year found'
			];
		}
		
		$fromDate = $request->from_date;
		$toDate = $request->to_date;
		
		// Get all bank/cash accounts
		$bankAccounts = Ledger::where('type', 1)
			->orderBy('left_code')
			->orderBy('right_code')
			->get();
		
		$reportData = [];
		$grandTotals = [
			'opening_balance' => 0,
			'total_receipts' => 0,
			'total_payments' => 0,
			'total_contra_in' => 0,
			'total_contra_out' => 0,
			'closing_balance' => 0
		];
		
		foreach ($bankAccounts as $account) {
			// Calculate opening balance (before from_date)
			$openingBalance = $this->calculateAccountBalance($account->id, $activeYear, null, $fromDate, true);
			
			// Get receipts (Entry Type 1)
			$receipts = DB::table('entryitems')
				->join('entries', 'entryitems.entry_id', '=', 'entries.id')
				->whereRaw('entryitems.ledger_id::integer = ?', [$account->id])
				->where('entries.entrytype_id', 1)
				->whereRaw('entries.date::date >= ?::date', [$fromDate])
				->whereRaw('entries.date::date <= ?::date', [$toDate])
				->where('entryitems.dc', 'D')
				->select(
					'entries.date',
					'entries.entry_code',
					'entries.narration',
					'entries.paid_to',
					'entryitems.amount'
				)
				->orderBy('entries.date')
				->get();
			
			// Get payments (Entry Type 2)
			$payments = DB::table('entryitems')
				->join('entries', 'entryitems.entry_id', '=', 'entries.id')
				->whereRaw('entryitems.ledger_id::integer = ?', [$account->id])
				->where('entries.entrytype_id', 2)
				->whereRaw('entries.date::date >= ?::date', [$fromDate])
				->whereRaw('entries.date::date <= ?::date', [$toDate])
				->where('entryitems.dc', 'C')
				->select(
					'entries.date',
					'entries.entry_code',
					'entries.narration',
					'entries.paid_to',
					'entryitems.amount'
				)
				->orderBy('entries.date')
				->get();
			
			// Get contra entries (Entry Type 3)
			$contraIn = DB::table('entryitems')
				->join('entries', 'entryitems.entry_id', '=', 'entries.id')
				->whereRaw('entryitems.ledger_id::integer = ?', [$account->id])
				->where('entries.entrytype_id', 3)
				->whereRaw('entries.date::date >= ?::date', [$fromDate])
				->whereRaw('entries.date::date <= ?::date', [$toDate])
				->where('entryitems.dc', 'D')
				->select(
					'entries.date',
					'entries.entry_code',
					'entries.narration',
					'entryitems.amount'
				)
				->orderBy('entries.date')
				->get();
			
			$contraOut = DB::table('entryitems')
				->join('entries', 'entryitems.entry_id', '=', 'entries.id')
				->whereRaw('entryitems.ledger_id::integer = ?', [$account->id])
				->where('entries.entrytype_id', 3)
				->whereRaw('entries.date::date >= ?::date', [$fromDate])
				->whereRaw('entries.date::date <= ?::date', [$toDate])
				->where('entryitems.dc', 'C')
				->select(
					'entries.date',
					'entries.entry_code',
					'entries.narration',
					'entryitems.amount'
				)
				->orderBy('entries.date')
				->get();
			
			$totalReceipts = $receipts->sum('amount');
			$totalPayments = $payments->sum('amount');
			$totalContraIn = $contraIn->sum('amount');
			$totalContraOut = $contraOut->sum('amount');
			
			$closingBalance = $openingBalance + $totalReceipts - $totalPayments + $totalContraIn - $totalContraOut;
			
			$accountData = [
				'account' => [
					'id' => $account->id,
					'name' => $account->name,
					'code' => $account->left_code . '/' . $account->right_code
				],
				'opening_balance' => $openingBalance,
				'receipts' => $receipts,
				'payments' => $payments,
				'contra_in' => $contraIn,
				'contra_out' => $contraOut,
				'total_receipts' => $totalReceipts,
				'total_payments' => $totalPayments,
				'total_contra_in' => $totalContraIn,
				'total_contra_out' => $totalContraOut,
				'closing_balance' => $closingBalance
			];
			
			$reportData[] = $accountData;
			
			// Update grand totals
			$grandTotals['opening_balance'] += $openingBalance;
			$grandTotals['total_receipts'] += $totalReceipts;
			$grandTotals['total_payments'] += $totalPayments;
			$grandTotals['total_contra_in'] += $totalContraIn;
			$grandTotals['total_contra_out'] += $totalContraOut;
			$grandTotals['closing_balance'] += $closingBalance;
		}
		
		return [
			'success' => true,
			'data' => [
				'accounts' => $reportData,
				'grand_totals' => $grandTotals,
				'from_date' => $fromDate,
				'to_date' => $toDate,
				'active_year' => [
					'id' => $activeYear->id,
					'from' => $activeYear->from_year_month,
					'to' => $activeYear->to_year_month
				]
			]
		];
	}

	/**
	 * Cash Flow Report API
	 */
	public function cashFlow(Request $request)
	{
		try {
			// Validate request
			$request->validate([
				'from_date' => 'required|date',
				'to_date' => 'required|date|after_or_equal:from_date'
			]);
			
			$reportData = $this->getCashFlowData($request);
			return response()->json($reportData);
			
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Error generating cash flow report',
				'error' => $e->getMessage()
			], 500);
		}
	}

	/**
	 * Get Cash Flow Report Data
	 */
	private function getCashFlowData($request)
	{
		$activeYear = AcYear::where('status', 1)->first();
		
		if (!$activeYear) {
			return [
				'success' => false,
				'message' => 'No active accounting year found'
			];
		}
		
		$fromDate = $request->from_date;
		$toDate = $request->to_date;
		
		// Get all bank/cash accounts
		$bankAccountIds = Ledger::where('type', 1)->pluck('id')->toArray();
		
		// Initialize cash flow categories
		$cashFlowCategories = [
			'inflows' => [
				'revenue' => ['name' => 'Revenue', 'amount' => 0, 'transactions' => []],
				'other_income' => ['name' => 'Other Income', 'amount' => 0, 'transactions' => []],
				'liabilities' => ['name' => 'Liabilities', 'amount' => 0, 'transactions' => []],
				'equity' => ['name' => 'Equity', 'amount' => 0, 'transactions' => []],
				'asset_sale' => ['name' => 'Asset Sales', 'amount' => 0, 'transactions' => []],
			],
			'outflows' => [
				'direct_cost' => ['name' => 'Direct Cost', 'amount' => 0, 'transactions' => []],
				'expenses' => ['name' => 'Expenses', 'amount' => 0, 'transactions' => []],
				'taxation' => ['name' => 'Taxation', 'amount' => 0, 'transactions' => []],
				'asset_purchase' => ['name' => 'Asset Purchase', 'amount' => 0, 'transactions' => []],
				'liability_payment' => ['name' => 'Liability Payment', 'amount' => 0, 'transactions' => []],
			]
		];
		
		// Process Receipts (Entry Type 1)
		$receipts = DB::table('entryitems as ei1')
			->join('entries', 'ei1.entry_id', '=', 'entries.id')
			->join('entryitems as ei2', function($join) {
				$join->on('ei2.entry_id', '=', 'entries.id')
					 ->where('ei2.dc', '=', 'C');
			})
			->join('ledgers', DB::raw('ei2.ledger_id::integer'), '=', 'ledgers.id')
			->join('groups', 'ledgers.group_id', '=', 'groups.id')
			->whereIn(DB::raw('ei1.ledger_id::integer'), $bankAccountIds)
			->where('ei1.dc', 'D')
			->where('entries.entrytype_id', 1)
			->whereRaw('entries.date::date >= ?::date', [$fromDate])
			->whereRaw('entries.date::date <= ?::date', [$toDate])
			->select(
				'entries.date',
				'entries.entry_code',
				'entries.narration',
				'ei2.amount',
				'ledgers.name as ledger_name',
				'groups.code as group_code'
			)
			->get();
		
		foreach ($receipts as $receipt) {
			$groupCode = intval($receipt->group_code);
			$category = $this->getCashFlowCategory($groupCode, 'inflow');
			
			if (isset($cashFlowCategories['inflows'][$category])) {
				$cashFlowCategories['inflows'][$category]['amount'] += $receipt->amount;
				$cashFlowCategories['inflows'][$category]['transactions'][] = [
					'date' => $receipt->date,
					'code' => $receipt->entry_code,
					'ledger' => $receipt->ledger_name,
					'narration' => $receipt->narration,
					'amount' => $receipt->amount
				];
			}
		}
		
		// Process Payments (Entry Type 2)
		$payments = DB::table('entryitems as ei1')
			->join('entries', 'ei1.entry_id', '=', 'entries.id')
			->join('entryitems as ei2', function($join) {
				$join->on('ei2.entry_id', '=', 'entries.id')
					 ->where('ei2.dc', '=', 'D');
			})
			->join('ledgers', DB::raw('ei2.ledger_id::integer'), '=', 'ledgers.id')
			->join('groups', 'ledgers.group_id', '=', 'groups.id')
			->whereIn(DB::raw('ei1.ledger_id::integer'), $bankAccountIds)
			->where('ei1.dc', 'C')
			->where('entries.entrytype_id', 2)
			->whereRaw('entries.date::date >= ?::date', [$fromDate])
			->whereRaw('entries.date::date <= ?::date', [$toDate])
			->select(
				'entries.date',
				'entries.entry_code',
				'entries.narration',
				'ei2.amount',
				'ledgers.name as ledger_name',
				'groups.code as group_code'
			)
			->get();
		
		foreach ($payments as $payment) {
			$groupCode = intval($payment->group_code);
			$category = $this->getCashFlowCategory($groupCode, 'outflow');
			
			if (isset($cashFlowCategories['outflows'][$category])) {
				$cashFlowCategories['outflows'][$category]['amount'] += $payment->amount;
				$cashFlowCategories['outflows'][$category]['transactions'][] = [
					'date' => $payment->date,
					'code' => $payment->entry_code,
					'ledger' => $payment->ledger_name,
					'narration' => $payment->narration,
					'amount' => $payment->amount
				];
			}
		}
		
		// Calculate totals
		$totalInflows = array_sum(array_column($cashFlowCategories['inflows'], 'amount'));
		$totalOutflows = array_sum(array_column($cashFlowCategories['outflows'], 'amount'));
		$netCashFlow = $totalInflows - $totalOutflows;
		
		// Calculate opening and closing cash balances
		$openingCash = $this->calculateTotalCashBalance($bankAccountIds, $activeYear, null, $fromDate, true);
		$closingCash = $openingCash + $netCashFlow;
		
		return [
			'success' => true,
			'data' => [
				'cash_flows' => $cashFlowCategories,
				'summary' => [
					'opening_cash' => $openingCash,
					'total_inflows' => $totalInflows,
					'total_outflows' => $totalOutflows,
					'net_cash_flow' => $netCashFlow,
					'closing_cash' => $closingCash
				],
				'from_date' => $fromDate,
				'to_date' => $toDate,
				'active_year' => [
					'id' => $activeYear->id,
					'from' => $activeYear->from_year_month,
					'to' => $activeYear->to_year_month
				]
			]
		];
	}

	/**
	 * Calculate account balance for a specific period
	 */
	private function calculateAccountBalance($ledgerId, $activeYear, $fromDate = null, $toDate = null, $beforeDate = false)
	{
		// Get year opening balance
		$yearOpeningBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
			->whereRaw('ledger_id::integer = ?', [$ledgerId])
			->first();
		
		$openingDr = $yearOpeningBalance ? $yearOpeningBalance->dr_amount : 0;
		$openingCr = $yearOpeningBalance ? $yearOpeningBalance->cr_amount : 0;
		$balance = $openingDr - $openingCr;
		
		// Add transactions within period
		$query = DB::table('entryitems')
			->join('entries', 'entryitems.entry_id', '=', 'entries.id')
			->whereRaw('entryitems.ledger_id::integer = ?', [$ledgerId])
			->whereRaw('entries.date::date >= ?::date', [$activeYear->from_year_month]);
		
		if ($beforeDate && $toDate) {
			$query->whereRaw('entries.date::date < ?::date', [$toDate]);
		} else {
			if ($fromDate) {
				$query->whereRaw('entries.date::date >= ?::date', [$fromDate]);
			}
			if ($toDate) {
				$query->whereRaw('entries.date::date <= ?::date', [$toDate]);
			}
		}
		
		$transactions = $query->select(
			DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
			DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr")
		)->first();
		
		$balance += ($transactions->total_dr ?? 0) - ($transactions->total_cr ?? 0);
		
		return (float)$balance;
	}

	/**
	 * Calculate total cash balance for multiple accounts
	 */
	private function calculateTotalCashBalance($accountIds, $activeYear, $fromDate = null, $toDate = null, $beforeDate = false)
	{
		$totalBalance = 0;
		
		foreach ($accountIds as $accountId) {
			$totalBalance += $this->calculateAccountBalance($accountId, $activeYear, $fromDate, $toDate, $beforeDate);
		}
		
		return $totalBalance;
	}

	/**
	 * Get cash flow category based on group code
	 */
	private function getCashFlowCategory($groupCode, $type)
	{
		if ($type == 'inflow') {
			if ($groupCode >= 4000 && $groupCode <= 4999) {
				return 'revenue';
			} elseif ($groupCode >= 8000 && $groupCode <= 8999) {
				return 'other_income';
			} elseif ($groupCode >= 2000 && $groupCode <= 2999) {
				return 'liabilities';
			} elseif ($groupCode >= 3000 && $groupCode <= 3999) {
				return 'equity';
			} elseif ($groupCode >= 1000 && $groupCode <= 1999) {
				return 'asset_sale';
			}
		} else {
			if ($groupCode >= 5000 && $groupCode <= 5999) {
				return 'direct_cost';
			} elseif ($groupCode >= 6000 && $groupCode <= 6999) {
				return 'expenses';
			} elseif ($groupCode >= 9000 && $groupCode <= 9999) {
				return 'taxation';
			} elseif ($groupCode >= 1000 && $groupCode <= 1999) {
				return 'asset_purchase';
			} elseif ($groupCode >= 2000 && $groupCode <= 2999) {
				return 'liability_payment';
			}
		}
		
		return 'other';
	}

	/**
	 * Export Receipt & Payments Report
	 */
	public function exportReceiptPayments(Request $request)
	{
		$request->validate([
			'format' => 'required|in:pdf,excel',
			'from_date' => 'required|date',
			'to_date' => 'required|date'
		]);
		
		$data = $this->getReceiptPaymentsData($request);
		
		if ($request->format === 'pdf') {
			$pdf = PDF::loadView('exports.receipt-payments-pdf', $data);
			$pdf->setPaper('a4', 'landscape');
			return $pdf->download('receipt_payments_' . date('YmdHis') . '.pdf');
		} else {
			// You'll need to create this export class
			return Excel::download(new ReceiptPaymentsExport($data), 
				'receipt_payments_' . date('YmdHis') . '.xlsx');
		}
	}

	/**
	 * Export Cash Flow Report
	 */
	public function exportCashFlow(Request $request)
	{
		$request->validate([
			'format' => 'required|in:pdf,excel',
			'from_date' => 'required|date',
			'to_date' => 'required|date'
		]);
		
		$data = $this->getCashFlowData($request);
		
		if ($request->format === 'pdf') {
			$pdf = PDF::loadView('exports.cash-flow-pdf', $data);
			return $pdf->download('cash_flow_' . date('YmdHis') . '.pdf');
		} else {
			// You'll need to create this export class
			return Excel::download(new CashFlowExport($data), 
				'cash_flow_' . date('YmdHis') . '.xlsx');
		}
	}
}