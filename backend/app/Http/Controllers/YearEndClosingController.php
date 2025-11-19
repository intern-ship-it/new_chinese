<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AcYear;
use App\Models\Ledger;
use App\Models\Group;
use App\Models\AcYearLedgerBalance;
use App\Models\Entry;
use App\Models\EntryItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class YearEndClosingController extends Controller
{
    private $union_id = 0;
    private $progressKey;
    private $userId;
    private $chunkSize = 10;
    
    /**
     * Constructor - Initialize union_id and user context
     */
    public function __construct()
    {
        $user = auth()->user();
        if (!empty($user->union_id)) {
            $this->union_id = $user->union_id;
        }
        $this->userId = Auth::id();
        $this->progressKey = 'year_closing_progress_' . $this->userId . '_' . $this->union_id;
    }
    
    /**
     * Display Year End Closing page
     */
    public function index()
    {
        if (!$this->union_id) {
            return redirect()->back()->with('error', 'Union not found. Please ensure you are logged in correctly.');
        }
        
        return view('accounts.year-end-closing.index');
    }
    
    /**
     * Get Year End Closing Summary
     */
    public function getYearEndSummary(Request $request)
    {
        try {
            if (!$this->union_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Union not found'
                ], 403);
            }
            
            $activeYear = AcYear::where('status', 1)
                ->where('union_id', $this->union_id)
                ->first();
            
            if (!$activeYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active accounting year found'
                ], 404);
            }
            
            $asOnDate = $activeYear->to_year_month;
            
            // Get Balance Sheet Summary
            $assets = $this->getGroupTotal('1', $activeYear, $asOnDate);
            $liabilities = $this->getGroupTotal('2', $activeYear, $asOnDate);
            $equity = $this->getGroupTotal('3', $activeYear, $asOnDate);
            
            // Calculate P&L
            $profitLoss = $this->calculateCurrentProfitLoss($activeYear, $asOnDate);
            
            // Get P&L Ledger
            $paLedger = Ledger::where('pa', 1)
                ->where('union_id', $this->union_id)
                ->first();
            
            if (!$paLedger) {
                return response()->json([
                    'success' => false,
                    'message' => 'P&L accumulation ledger not found. Please configure a ledger with pa=1'
                ], 404);
            }
            
            // Calculate ledger counts
            $totalLedgers = Ledger::where('union_id', $this->union_id)->count();
            $ledgersWithBalance = $this->countLedgersWithBalance($activeYear, $asOnDate);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'current_year' => [
                        'id' => $activeYear->id,
                        'from' => $activeYear->from_year_month->format('Y-m-d'),
                        'to' => $activeYear->to_year_month->format('Y-m-d'),
                        'period' => $this->getYearPeriodString($activeYear),
                        'status' => $activeYear->status == 1 ? 'Active' : 'Will be Closed'
                    ],
                    'next_year' => [
                        'from' => $activeYear->from_year_month->copy()->addYear()->format('Y-m-d'),
                        'to' => $activeYear->to_year_month->copy()->addYear()->format('Y-m-d'),
                        'period' => $this->getNextYearPeriodString($activeYear),
                        'status' => 'Will be Created & Set Active'
                    ],
                    'balance_sheet_summary' => [
                        'assets' => $assets,
                        'liabilities' => $liabilities,
                        'equity' => $equity,
                        'profit_loss' => $profitLoss
                    ],
                    'pa_ledger' => [
                        'id' => $paLedger->id,
                        'name' => $paLedger->name,
                        'code' => ($paLedger->left_code ? $paLedger->left_code : '') . 
                                  ($paLedger->left_code && $paLedger->right_code ? '/' : '') . 
                                  ($paLedger->right_code ? $paLedger->right_code : '')
                    ],
                    'ledger_counts' => [
                        'total' => $totalLedgers,
                        'with_balance' => $ledgersWithBalance
                    ]
                ]
            ]);
            
        } catch (Exception $e) {
            Log::error('Year End Summary Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Error generating summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Validate Year End Closing Prerequisites
     */
    public function validateYearEndClosing(Request $request)
    {
        try {
            if (!$this->union_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Union not found'
                ], 403);
            }
            
            $activeYear = AcYear::where('status', 1)
                ->where('union_id', $this->union_id)
                ->first();
            
            if (!$activeYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active accounting year found'
                ], 404);
            }
            
            $validationErrors = [];
            
            // Check for P&L Accumulation Ledger
            $paLedgers = Ledger::where('pa', 1)
                ->where('union_id', $this->union_id)
                ->get();
            
            if ($paLedgers->count() === 0) {
                $validationErrors[] = 'Please configure a Profit & Loss accumulation ledger (set pa=1) before closing year';
            } elseif ($paLedgers->count() > 1) {
                $validationErrors[] = 'Multiple P&L accumulation ledgers found. Only one ledger should have pa=1. Found: ' . 
                    $paLedgers->pluck('name')->implode(', ');
            } else {
                $paLedger = $paLedgers->first();
                $group = $paLedger->group;
                
                if (!$group) {
                    $validationErrors[] = 'P&L accumulation ledger must belong to a group';
                } else {
                    $groupCode = intval($group->code);
                    if ($groupCode < 3000 || $groupCode > 3999) {
                        $validationErrors[] = 'P&L accumulation ledger must belong to Equity group (3000-3999). Current group: ' . 
                                              $group->name . ' (' . $group->code . ')';
                    }
                }
            }
            
            // Check if next year already exists
            $nextYearFrom = $activeYear->from_year_month->copy()->addYear()->format('Y-m-d');
            $nextYearExists = AcYear::where('from_year_month', $nextYearFrom)
                ->where('union_id', $this->union_id)
                ->exists();
            
            if ($nextYearExists) {
                $validationErrors[] = 'Next accounting year already exists. Year end closing has already been completed.';
            }
            
            // Check Trial Balance
            $trialBalance = $this->calculateTrialBalance($activeYear);
            
            if (!$trialBalance['is_balanced']) {
                $difference = abs($trialBalance['total_debit'] - $trialBalance['total_credit']);
                $validationErrors[] = 'Trial Balance is not balanced. Difference: RM ' . number_format($difference, 2);
            }
            
            if (count($validationErrors) > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validationErrors
                ], 400);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'All validations passed. Ready for year end closing.',
                'data' => [
                    'active_year' => [
                        'id' => $activeYear->id,
                        'from' => $activeYear->from_year_month->format('Y-m-d'),
                        'to' => $activeYear->to_year_month->format('Y-m-d'),
                        'period' => $this->getYearPeriodString($activeYear)
                    ],
                    'pa_ledger' => [
                        'id' => $paLedgers->first()->id,
                        'name' => $paLedgers->first()->name,
                        'code' => ($paLedgers->first()->left_code ? $paLedgers->first()->left_code : '') . 
                                  ($paLedgers->first()->left_code && $paLedgers->first()->right_code ? '/' : '') . 
                                  ($paLedgers->first()->right_code ? $paLedgers->first()->right_code : '')
                    ],
                    'trial_balance' => $trialBalance
                ]
            ]);
            
        } catch (Exception $e) {
            Log::error('Year End Closing Validation Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error during validation',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Execute Year End Closing with Progress Updates
     */
    public function executeYearEndClosing(Request $request)
    {
        try {
            if (!$this->union_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Union not found'
                ], 403);
            }
            
            // Check if already processing
            $existingProgress = Cache::get($this->progressKey);
            if ($existingProgress && isset($existingProgress['status']) && $existingProgress['status'] === 'processing') {
                return response()->json([
                    'success' => false,
                    'message' => 'Year end closing is already in progress'
                ], 409);
            }
            
            // Step 1: Initialize (0%)
            $this->updateProgressAndWait(0, 'Starting year end closing process...');
            
            // Step 2: Get active year (5%)
            $this->updateProgressAndWait(5, 'Loading accounting year data...');
            
            $activeYear = AcYear::where('status', 1)
                ->where('union_id', $this->union_id)
                ->first();
            
            if (!$activeYear) {
                throw new Exception('No active accounting year found');
            }
            
            // Step 3: Validation (10%)
            $this->updateProgressAndWait(10, 'Validating prerequisites...');
            
            $validation = $this->validateYearEndClosing($request);
            $validationData = json_decode($validation->getContent(), true);
            
            if (!$validationData['success']) {
                throw new Exception('Validation failed: ' . implode(', ', $validationData['errors'] ?? ['Unknown error']));
            }
            
            // Step 4: Create new year (20%)
            $this->updateProgressAndWait(20, 'Creating new accounting year...');
            
            $newYear = $this->createNewAccountingYear($activeYear);
            
            // Step 5: Calculate P&L (30%)
            $this->updateProgressAndWait(30, 'Calculating profit/loss...');
            
            $profitLoss = $this->calculateCurrentProfitLoss($activeYear, $activeYear->to_year_month);
            
            // Step 6: Get PA Ledger (35%)
            $this->updateProgressAndWait(35, 'Getting P&L accumulation ledger...');
            
            $paLedger = Ledger::where('pa', 1)
                ->where('union_id', $this->union_id)
                ->first();
            
            if (!$paLedger) {
                throw new Exception('P&L accumulation ledger not found');
            }
            
            // Step 7: Transfer balances (40-80%)
            $this->updateProgressAndWait(40, 'Starting balance transfer...');
            
            $this->transferBalancesToNewYearWithProgress($activeYear, $newYear, $profitLoss, $paLedger);
            
            // Step 8: Lock entries (85%)
            $this->updateProgressAndWait(85, 'Locking entries for closed year...');
            
            $this->lockEntriesForClosedYear($activeYear);
            
            // Step 9: Update year status (90%)
            $this->updateProgressAndWait(90, 'Updating accounting year status...');
            
            DB::transaction(function () use ($activeYear, $newYear) {
                $activeYear->update([
                    'status' => 0,
                    'has_closed' => 1
                ]);
                
                $newYear->update([
                    'status' => 1,
                    'has_closed' => 0
                ]);
            });
            
            // Step 10: Complete (100%)
            $this->updateProgressAndWait(100, 'Year end closing completed successfully!');
            
            return response()->json([
                'success' => true,
                'message' => 'Year end closing completed successfully',
                'data' => [
                    'old_year' => [
                        'id' => $activeYear->id,
                        'period' => $this->getYearPeriodString($activeYear)
                    ],
                    'new_year' => [
                        'id' => $newYear->id,
                        'period' => $this->getYearPeriodString($newYear)
                    ],
                    'profit_loss' => $profitLoss,
                    'pa_ledger' => $paLedger->name
                ]
            ]);
            
        } catch (Exception $e) {
            Log::error('Year End Closing Execution Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            $this->updateProgress(-1, 'Error: ' . $e->getMessage(), 'error');
            
            return response()->json([
                'success' => false,
                'message' => 'Error during year end closing',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get closing progress
     */
    public function getProgress()
    {
        $progress = Cache::get($this->progressKey, [
            'percent' => 0,
            'message' => 'Not started',
            'status' => 'idle'
        ]);
        
        return response()->json($progress);
    }
    
    /**
     * Update progress and wait for frontend to catch up
     */
    private function updateProgressAndWait($percent, $message, $status = 'processing')
    {
        $this->updateProgress($percent, $message, $status);
        
        // Wait 300ms to allow frontend polling to catch this update
        usleep(300000);
    }
    
    /**
     * Update progress in cache
     */
    private function updateProgress($percent, $message, $status = 'processing')
    {
        Cache::put($this->progressKey, [
            'percent' => $percent,
            'message' => $message,
            'status' => $percent >= 100 ? 'completed' : ($percent < 0 ? 'error' : $status)
        ], now()->addMinutes(30));
        
        // Force cache to write immediately
        Cache::flush();
        Cache::put($this->progressKey, [
            'percent' => $percent,
            'message' => $message,
            'status' => $percent >= 100 ? 'completed' : ($percent < 0 ? 'error' : $status)
        ], now()->addMinutes(30));
    }
    
    /**
     * Create new accounting year
     */
    private function createNewAccountingYear($activeYear)
    {
        $newFromDate = $activeYear->from_year_month->copy()->addYear();
        $newToDate = $activeYear->to_year_month->copy()->addYear();
        
        return AcYear::create([
            'union_id' => $this->union_id,
            'from_year_month' => $newFromDate->format('Y-m-d'),
            'to_year_month' => $newToDate->format('Y-m-d'),
            'status' => 0,
            'has_closed' => 0
        ]);
    }
    
    /**
     * Calculate current profit/loss
     */
    private function calculateCurrentProfitLoss($activeYear, $asOnDate)
    {
        $revenue = $this->getGroupTotal('4', $activeYear, $asOnDate);
        $income = $this->getGroupTotal('8', $activeYear, $asOnDate);
        $direct_cost = $this->getGroupTotal('5', $activeYear, $asOnDate);
        $expenses = $this->getGroupTotal('6', $activeYear, $asOnDate);
        return ($income * -1) + ($revenue * -1) - $expenses - $direct_cost;
    }
    
    /**
     * Transfer balances to new year WITH progress updates
     */
    private function transferBalancesToNewYearWithProgress($activeYear, $newYear, $profitLoss, $paLedger)
    {
        $asOnDate = $activeYear->to_year_month;
        $ledgers = Ledger::where('union_id', $this->union_id)->get();
        
        $totalLedgers = $ledgers->count();
        $processed = 0;
        
        // Process in transaction batches
        $batchSize = 5;
        $batches = $ledgers->chunk($batchSize);
        
        foreach ($batches as $batchIndex => $batch) {
            DB::transaction(function () use ($batch, $activeYear, $newYear, &$processed, $totalLedgers) {
                foreach ($batch as $ledger) {
                    $balance = $this->calculateLedgerClosingBalance($ledger, $activeYear, $activeYear->to_year_month);
                    $group = $ledger->group;
                    
                    if (!$group) {
                        continue;
                    }
                    
                    $groupCode = intval($group->code);
                    $isBalanceSheetAccount = (
                        ($groupCode >= 1000 && $groupCode <= 1999) ||
                        ($groupCode >= 2000 && $groupCode <= 2999) ||
                        ($groupCode >= 3000 && $groupCode <= 3999)
                    );
                    
                    if ($isBalanceSheetAccount) {
                        AcYearLedgerBalance::create([
                            'ac_year_id' => $newYear->id,
                            'ledger_id' => $ledger->id,
                            'dr_amount' => $balance['dr_amount'],
                            'cr_amount' => $balance['cr_amount'],
                            'quantity' => $balance['quantity'],
                            'unit_price' => $balance['unit_price'],
                            'uom_id' => $balance['uom_id']
                        ]);
                    } else {
                        AcYearLedgerBalance::create([
                            'ac_year_id' => $newYear->id,
                            'ledger_id' => $ledger->id,
                            'dr_amount' => 0,
                            'cr_amount' => 0,
                            'quantity' => 0,
                            'unit_price' => 0,
                            'uom_id' => null
                        ]);
                    }
                    
                    $processed++;
                }
            });
            
            // Update progress after each batch (40% to 80% range)
            $progressPercent = 40 + (($processed / $totalLedgers) * 40);
            $this->updateProgressAndWait(
                round($progressPercent),
                "Processing ledgers: {$processed}/{$totalLedgers} completed"
            );
        }
        
        // Transfer P&L to PA Ledger
        $this->updateProgressAndWait(80, 'Transferring profit/loss to retained earnings...');
        
        DB::transaction(function () use ($newYear, $paLedger, $profitLoss) {
            if ($profitLoss != 0) {
                $paBalance = AcYearLedgerBalance::where('ac_year_id', $newYear->id)
                    ->where('ledger_id', $paLedger->id)
                    ->first();
                
                if ($paBalance) {
                    if ($profitLoss > 0) {
                        $paBalance->cr_amount += abs($profitLoss);
                    } else {
                        $paBalance->dr_amount += abs($profitLoss);
                    }
                    $paBalance->save();
                } else {
                    AcYearLedgerBalance::create([
                        'ac_year_id' => $newYear->id,
                        'ledger_id' => $paLedger->id,
                        'dr_amount' => $profitLoss < 0 ? abs($profitLoss) : 0,
                        'cr_amount' => $profitLoss > 0 ? abs($profitLoss) : 0,
                        'quantity' => 0,
                        'unit_price' => 0,
                        'uom_id' => null
                    ]);
                }
            }
        });
    }
    
    /**
     * Lock entries for closed year
     */
    private function lockEntriesForClosedYear($activeYear)
    {
        Entry::where('union_id', $this->union_id)
            ->whereDate('date', '>=', $activeYear->from_year_month)
            ->whereDate('date', '<=', $activeYear->to_year_month)
            ->update(['has_closed' => 1]);
    }
    
    /**
     * Calculate ledger closing balance
     */
    private function calculateLedgerClosingBalance($ledger, $activeYear, $asOnDate)
    {
        $yearOpeningBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->where('ledger_id', $ledger->id)
            ->first();
        
        $openingDr = $yearOpeningBalance ? $yearOpeningBalance->dr_amount : 0;
        $openingCr = $yearOpeningBalance ? $yearOpeningBalance->cr_amount : 0;
        
        $transactions = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->where('entryitems.ledger_id', $ledger->id)
            ->where('entryitems.union_id', $this->union_id)
            ->where('entries.union_id', $this->union_id)
            ->whereDate('entries.date', '>=', $activeYear->from_year_month)
            ->whereDate('entries.date', '<=', $asOnDate)
            ->select(
                DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
                DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr"),
                DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN COALESCE(entryitems.quantity, 0) ELSE 0 END) as total_dr_qty"),
                DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN COALESCE(entryitems.quantity, 0) ELSE 0 END) as total_cr_qty")
            )
            ->first();
        
        $periodDr = $transactions->total_dr ?? 0;
        $periodCr = $transactions->total_cr ?? 0;
        
        $closingDr = $openingDr + $periodDr;
        $closingCr = $openingCr + $periodCr;
        
        if ($closingDr > $closingCr) {
            $closingDr = $closingDr - $closingCr;
            $closingCr = 0.00;
        } else {
            $closingCr = $closingCr - $closingDr;
            $closingDr = 0.00;
        }
        
        return [
            'dr_amount' => $closingDr,
            'cr_amount' => $closingCr,
            'quantity' => ($yearOpeningBalance ? $yearOpeningBalance->quantity : 0) + 
                         ($transactions->total_dr_qty ?? 0) - ($transactions->total_cr_qty ?? 0),
            'unit_price' => $yearOpeningBalance ? $yearOpeningBalance->unit_price : 0,
            'uom_id' => $yearOpeningBalance ? $yearOpeningBalance->uom_id : null
        ];
    }
    
    /**
     * Calculate trial balance
     */
    private function calculateTrialBalance($activeYear)
    {
        $asOnDate = $activeYear->to_year_month;
        $totalDr = 0;
        $totalCr = 0;
        
        $ledgers = Ledger::where('union_id', $this->union_id)->get();
        
        foreach ($ledgers as $ledger) {
            $balance = $this->calculateLedgerClosingBalance($ledger, $activeYear, $asOnDate);
            $totalDr += $balance['dr_amount'];
            $totalCr += $balance['cr_amount'];
        }
        
        $isBalanced = abs($totalDr - $totalCr) < 0.01;
        
        return [
            'total_debit' => $totalDr,
            'total_credit' => $totalCr,
            'is_balanced' => $isBalanced
        ];
    }
    
    /**
     * Get group total
     */
    private function getGroupTotal($groupCodePrefix, $activeYear, $asOnDate)
    {
        $total = 0;
        $baseGroups = Group::where('code', 'LIKE', $groupCodePrefix . '%')
            ->where('union_id', $this->union_id)
            ->where('parent_id', 0)
            ->get();
        
        foreach ($baseGroups as $group) {
            $total += $this->processGroupTotal($group, $activeYear, $asOnDate);
        }
        
        return $total;
    }
    
    /**
     * Process group total recursively
     */
    private function processGroupTotal($group, $activeYear, $asOnDate)
    {
        $total = 0;
        
        foreach ($group->ledgers as $ledger) {
            if ($ledger->union_id != $this->union_id) {
                continue;
            }
            $total += $this->calculateLedgerBalanceForReport($ledger, $activeYear, $asOnDate);
        }
        
        $children = Group::where('parent_id', $group->id)
            ->where('union_id', $this->union_id)
            ->get();
            
        foreach ($children as $child) {
            $total += $this->processGroupTotal($child, $activeYear, $asOnDate);
        }
        
        return $total;
    }
    
    /**
     * Calculate ledger balance for report
     */
    private function calculateLedgerBalanceForReport($ledger, $activeYear, $asOnDate)
    {
        $yearOpeningBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
            ->where('ledger_id', $ledger->id)
            ->first();
        
        $openingDr = $yearOpeningBalance ? $yearOpeningBalance->dr_amount : 0;
        $openingCr = $yearOpeningBalance ? $yearOpeningBalance->cr_amount : 0;
        
        $transactions = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->where('entryitems.ledger_id', $ledger->id)
            ->where('entryitems.union_id', $this->union_id)
            ->where('entries.union_id', $this->union_id)
            ->whereDate('entries.date', '>=', $activeYear->from_year_month)
            ->whereDate('entries.date', '<=', $asOnDate)
            ->select(
                DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as total_dr"),
                DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as total_cr")
            )
            ->first();
        
        $periodDr = $transactions->total_dr ?? 0;
        $periodCr = $transactions->total_cr ?? 0;
        
        $closingDr = $openingDr + $periodDr;
        $closingCr = $openingCr + $periodCr;
        
        return (float)($closingDr - $closingCr);
    }
    
    /**
     * Count ledgers with balance
     */
    private function countLedgersWithBalance($activeYear, $asOnDate)
    {
        $count = 0;
        $ledgers = Ledger::where('union_id', $this->union_id)->get();
        
        foreach ($ledgers as $ledger) {
            $balance = $this->calculateLedgerBalanceForReport($ledger, $activeYear, $asOnDate);
            if (abs($balance) > 0.01) {
                $count++;
            }
        }
        
        return $count;
    }
    
    /**
     * Get year period string
     */
    private function getYearPeriodString($year)
    {
        return $year->from_year_month->format('d-M-Y') . ' to ' . $year->to_year_month->format('d-M-Y');
    }
    
    /**
     * Get next year period string
     */
    private function getNextYearPeriodString($year)
    {
        $newFrom = $year->from_year_month->copy()->addYear();
        $newTo = $year->to_year_month->copy()->addYear();
        
        return $newFrom->format('d-M-Y') . ' to ' . $newTo->format('d-M-Y');
    }
}