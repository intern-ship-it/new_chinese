<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetApproval;
use App\Models\Ledger;
use App\Models\AcYear;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BudgetController extends Controller
{
    /**
     * Get budgets list with filters
     */
    // public function index(Request $request)
    // {
	// 	$activeYear = AcYear::where('status', 1)->first();
    //     $query = Budget::with(['ledger.group', 'acYear', 'creator', 'approver']);
		
    //     // Apply filters
    //     $query->where('ac_year_id', $activeYear->id);

    //     if ($request->has('status')) {
    //         $query->where('status', $request->status);
    //     }

    //     if ($request->has('budget_type')) {
    //         $query->where('budget_type', $request->budget_type);
    //     }

    //     if ($request->has('group_code')) {
    //         $query->whereHas('ledger.group', function($q) use ($request) {
    //             $q->where('code', $request->group_code);
    //         });
    //     }

    //     $budgets = $query->paginate($request->per_page ?? 20);

    //     // Add actual amounts and variance
    //     $budgets->getCollection()->transform(function ($budget) {
    //         $budget->actual_amount = $budget->getActualAmount();
    //         $budget->variance = $budget->getVariance();
    //         $budget->utilization_percentage = $budget->getUtilizationPercentage();
    //         return $budget;
    //     });

    //     return response()->json([
    //         'success' => true,
    //         'data' => $budgets
    //     ]);
    // }



    public function index(Request $request)
{
    $activeYear = AcYear::where('status', 1)->first();
    $query = Budget::with(['ledger.group', 'acYear', 'creator', 'approver']);
    
    // Apply filters
    $query->where('ac_year_id', $activeYear->id);
    
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }
    
    if ($request->has('budget_type')) {
        $query->where('budget_type', $request->budget_type);
    }
    
    if ($request->has('group_code')) {
        $query->whereHas('ledger.group', function($q) use ($request) {
            $q->where('code', $request->group_code);
        });
    }
    
    $budgets = $query->paginate($request->per_page ?? 20);
    
    // Add actual amounts and variance
    $budgets->getCollection()->transform(function ($budget) {
        $budget->actual_amount = $budget->getActualAmount();
        $budget->variance = $budget->getVariance();
        $budget->utilization_percentage = $budget->getUtilizationPercentage();
        return $budget;
    });
    
    // Get currency from system settings
    $currency = \App\Models\SystemSetting::where('key', 'temple_currency')
        ->where('type', 'SYSTEM')
        ->value('value') ?? 'MYR'; // Default to MYR if not set
    
    return response()->json([
        'success' => true,
        'data' => $budgets,
        'currency' => $currency  // Add currency to response
    ]);
}
    /**
     * Get eligible ledgers for budget
     */
    public function getEligibleLedgers(Request $request)
    {
        $ledgers = Ledger::whereHas('group', function($query) {
            $query->whereIn('code', Budget::ALLOWED_GROUP_CODES);
        })
        ->with('group:id,name,code')
        ->get(['id', 'name', 'group_id']);

        // Group by group code
        $grouped = $ledgers->groupBy(function($item) {
            return $item->group->code;
        });

        return response()->json([
            'success' => true,
            'data' => $grouped
        ]);
    }

    /**
     * Store budget
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ledger_id' => 'required|exists:ledgers,id',
            'budget_amount' => 'required|numeric|min:0',
            'budget_type' => 'required|in:INCOME,EXPENSE'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if ledger belongs to allowed groups
        $ledger = Ledger::with('group')->find($request->ledger_id);
        if (!in_array($ledger->group->code, Budget::ALLOWED_GROUP_CODES)) {
            return response()->json([
                'success' => false,
                'message' => 'Budget can only be created for Revenue, Direct Cost, Expenses, and Incomes groups'
            ], 422);
        }

        // Determine budget type based on group
        $budgetType = in_array($ledger->group->code, ['4000', '8000']) 
            ? Budget::TYPE_INCOME 
            : Budget::TYPE_EXPENSE;
		$activeYear = AcYear::where('status', 1)->first();
        DB::beginTransaction();
        try {
            $budget = Budget::create([
                'ac_year_id' => $activeYear->id,
                'ledger_id' => $request->ledger_id,
                'budget_amount' => $request->budget_amount,
                'budget_type' => $budgetType,
                'status' => Budget::STATUS_DRAFT,
                'created_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Budget created successfully',
                'data' => $budget->load(['ledger.group', 'acYear'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create budget',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update budget
     */
    public function update(Request $request, $id)
    {
        $budget = Budget::find($id);
        
        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found'
            ], 404);
        }

        if ($budget->status === Budget::STATUS_APPROVED) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update approved budget'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'budget_amount' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $budget->update([
            'budget_amount' => $request->budget_amount,
            'updated_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Budget updated successfully',
            'data' => $budget
        ]);
    }

    /**
     * Submit budget for approval
     */
    public function submit($id)
    {
        $budget = Budget::find($id);
        
        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found'
            ], 404);
        }

        if ($budget->status !== Budget::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft budgets can be submitted'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $previousStatus = $budget->status;
            $budget->status = Budget::STATUS_SUBMITTED;
            $budget->save();

            // Create approval record
            BudgetApproval::create([
                'budget_id' => $budget->id,
                'action' => 'SUBMITTED',
                'action_by' => Auth::id(),
                'previous_status' => $previousStatus,
                'new_status' => Budget::STATUS_SUBMITTED
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Budget submitted for approval',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit budget',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve/Reject budget
     */
    public function processApproval(Request $request, $id)
    {
        $budget = Budget::find($id);
        
        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found'
            ], 404);
        }

        if ($budget->status !== Budget::STATUS_SUBMITTED) {
            return response()->json([
                'success' => false,
                'message' => 'Only submitted budgets can be approved/rejected'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Check user permission (should be ADMIN or SUPER_ADMIN)
        /* if (!in_array(Auth::user()->role, ['ADMIN', 'SUPER_ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to approve budgets'
            ], 403);
        } */

        DB::beginTransaction();
        try {
            $previousStatus = $budget->status;
            $newStatus = $request->action === 'approve' 
                ? Budget::STATUS_APPROVED 
                : Budget::STATUS_REJECTED;

            $budget->status = $newStatus;
            $budget->approved_by = Auth::id();
            $budget->approved_at = now();
            $budget->approval_notes = $request->notes;
            $budget->save();

            // Create approval record
            BudgetApproval::create([
                'budget_id' => $budget->id,
                'action' => strtoupper($request->action) . 'D',
                'action_by' => Auth::id(),
                'comments' => $request->notes,
                'previous_status' => $previousStatus,
                'new_status' => $newStatus
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Budget ' . $request->action . 'd successfully',
                'data' => $budget
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
     * Get budget vs actual report
     */
    public function report(Request $request)
    {
        $activeYear = AcYear::where('status', 1)->first();

        // Get approved budgets with actual amounts
        $report = DB::select("
            SELECT * FROM budget_vs_actual_summary 
            WHERE ac_year_id = ? 
            ORDER BY group_code, ledger_name
        ", [$activeYear->id]);

        // Get summary by group
        $groupSummary = DB::select("
            SELECT * FROM budget_summary_by_group 
            WHERE ac_year_id = ?
            ORDER BY group_code
        ", [$activeYear->id]);

        // Get overall status
        $overallStatus = DB::select("
            SELECT * FROM get_budget_status(?)
        ", [$activeYear->id])[0] ?? null;

        return response()->json([
            'success' => true,
            'data' => [
                'details' => $report,
                'group_summary' => $groupSummary,
                'overall_status' => $overallStatus
            ]
        ]);
    }

    /**
     * Check budget overrun for a ledger
     */
    public function checkOverrun($ledgerId, $acYearId)
    {
        $result = DB::select("
            SELECT * FROM check_budget_overrun(?, ?)
        ", [$ledgerId, $acYearId])[0] ?? null;

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Bulk budget creation
     */
    public function bulkCreate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'budgets' => 'required|array',
            'budgets.*.ledger_id' => 'required|exists:ledgers,id',
            'budgets.*.budget_amount' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
		$activeYear = AcYear::where('status', 1)->first();
        DB::beginTransaction();
        try {
            $created = [];
            foreach ($request->budgets as $budgetData) {
                $ledger = Ledger::with('group')->find($budgetData['ledger_id']);
                
                if (!in_array($ledger->group->code, Budget::ALLOWED_GROUP_CODES)) {
                    continue;
                }

                $budgetType = in_array($ledger->group->code, ['4000', '8000']) 
                    ? Budget::TYPE_INCOME 
                    : Budget::TYPE_EXPENSE;

                $budget = Budget::updateOrCreate(
                    [
                        'ac_year_id' => $activeYear->id,
                        'ledger_id' => $budgetData['ledger_id']
                    ],
                    [
                        'budget_amount' => $budgetData['budget_amount'],
                        'budget_type' => $budgetType,
                        'status' => Budget::STATUS_DRAFT,
                        'created_by' => Auth::id()
                    ]
                );
                $created[] = $budget;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($created) . ' budgets created/updated successfully',
                'data' => $created
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create budgets',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}