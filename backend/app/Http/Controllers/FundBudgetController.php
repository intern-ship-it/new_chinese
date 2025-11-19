<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FundBudget;
use App\Models\FundBudgetTemplate;
use App\Models\FundBudgetItem;
use App\Models\FundBudgetApproval;
use App\Models\Fund;
use App\Models\Ledger;
use App\Models\AcYear;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class FundBudgetController extends Controller
{
    /**
     * Get fund budgets list with filters
     */
    public function index(Request $request)
    {
        $query = FundBudget::with(['fund', 'budgetItems.ledger', 'creator', 'approver']);

        // Apply filters
        if ($request->filled('fund_id')) {
            $query->where('fund_id', $request->fund_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('ac_year_id')) {
            $query->where('ac_year_id', $request->ac_year_id);
        } else {
            // Default to active accounting year
            $activeYear = AcYear::where('status', 1)->first();
            if ($activeYear) {
                $query->where('ac_year_id', $activeYear->id);
            }
        }

        if ($request->has('from_date') && $request->has('to_date')) {
            $query->inPeriod($request->from_date, $request->to_date);
        }

        if ($request->has('is_active') && $request->is_active) {
            $query->active();
        }

        // Sort
        $query->orderBy($request->sort_by ?? 'created_at', $request->sort_order ?? 'desc');

        $budgets = $query->paginate($request->per_page ?? 20);

        // Add calculated fields
        $budgets->getCollection()->transform(function ($budget) {
            $budget->summary = $budget->getSummary();
            return $budget;
        });

        return response()->json([
            'success' => true,
            'data' => $budgets
        ]);
    }

    /**
     * Get single fund budget details
     */
    public function show($id)
    {
        $budget = FundBudget::with([
            'fund',
            'budgetItems.ledger.group',
            'approvals.actionBy',
            'utilization.entry',
            'creator',
            'approver'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'budget' => $budget,
                'summary' => $budget->getSummary(),
                'can_edit' => $budget->can_edit,
                'can_close' => $budget->can_close,
                'can_reopen' => $budget->can_reopen
            ]
        ]);
    }

    /**
     * Store single fund budget
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fund_id' => 'required|exists:funds,id',
            'budget_name' => 'required|string|max:255',
            'budget_amount' => 'required|numeric|min:0',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'template_id' => 'nullable|exists:fund_budget_templates,id',
            'budget_items' => 'required|array|min:1',
            'budget_items.*.ledger_id' => 'required|exists:ledgers,id',
            'budget_items.*.amount' => 'required|numeric|min:0',
            'budget_items.*.description' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        $overlapExists = FundBudget::where('fund_id', $request->fund_id)
            ->where(function ($query) use ($request) {
                $query->whereBetween('from_date', [$request->from_date, $request->to_date])
                    ->orWhereBetween('to_date', [$request->from_date, $request->to_date])
                    ->orWhere(function ($q) use ($request) {
                        $q->where('from_date', '<=', $request->from_date)
                            ->where('to_date', '>=', $request->to_date);
                    });
            })
            ->exists();

        if ($overlapExists) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot create a job on this date. Please choose another date.'
            ], 422);
        }


        // Validate budget items total matches budget amount
        $itemsTotal = collect($request->budget_items)->sum('amount');
        if (abs($itemsTotal - $request->budget_amount) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Budget items total must equal budget amount'
            ], 422);
        }

        // Check for overlapping budgets
        $overlap = FundBudget::where('fund_id', $request->fund_id)
            ->whereNotIn('status', [FundBudget::STATUS_REJECTED])
            ->inPeriod($request->from_date, $request->to_date)
            ->exists();

        if ($overlap && !$request->force_overlap) {
            return response()->json([
                'success' => false,
                'message' => 'An active budget already exists for this fund in the selected period',
                'require_confirmation' => true
            ], 422);
        }

        $activeYear = AcYear::where('status', 1)->first();
        if (!$activeYear) {
            return response()->json([
                'success' => false,
                'message' => 'No active accounting year found'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create fund budget
            $fundBudget = FundBudget::create([
                'fund_id' => $request->fund_id,
                'ac_year_id' => $activeYear->id,
                'budget_name' => $request->budget_name,
                'budget_amount' => $request->budget_amount,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'is_recurring' => false,
                'recurrence_type' => FundBudget::RECURRENCE_ONE_TIME,
                'template_id' => $request->template_id,
                'status' => FundBudget::STATUS_DRAFT,
                'notes' => $request->notes,
                'created_by' => Auth::id()
            ]);

            // Create budget items
            foreach ($request->budget_items as $item) {
                FundBudgetItem::create([
                    'fund_budget_id' => $fundBudget->id,
                    'ledger_id' => $item['ledger_id'],
                    'budgeted_amount' => $item['amount'],
                    'description' => $item['description'] ?? null
                ]);
            }

            // Create approval record
            FundBudgetApproval::create([
                'fund_budget_id' => $fundBudget->id,
                'action' => 'CREATED',
                'action_by' => Auth::id(),
                'new_status' => FundBudget::STATUS_DRAFT
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Fund budget created successfully',
                'data' => $fundBudget->load('budgetItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create fund budget',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create recurring fund budgets
     */
    public function createRecurring(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fund_id' => 'required|exists:funds,id',
            'template_id' => 'nullable|exists:fund_budget_templates,id',
            'base_name' => 'required|string|max:200',
            'recurrence_type' => 'required|in:WEEKLY,MONTHLY',
            'occurrences' => 'required|integer|min:1|max:52',
            'start_date' => 'required|date',
            'duration_days' => 'required|integer|min:1|max:30',
            'budget_items' => 'required|array|min:1',
            'budget_items.*.ledger_id' => 'required|exists:ledgers,id',
            'budget_items.*.amounts' => 'required|array',
            'budget_items.*.amounts.*' => 'required|numeric|min:0',
            'budget_items.*.description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate we have amounts for all occurrences
        foreach ($request->budget_items as $item) {
            if (count($item['amounts']) !== $request->occurrences) {
                return response()->json([
                    'success' => false,
                    'message' => 'Each budget item must have amounts for all occurrences'
                ], 422);
            }
        }

        $activeYear = AcYear::where('status', 1)->first();
        if (!$activeYear) {
            return response()->json([
                'success' => false,
                'message' => 'No active accounting year found'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $created = [];
            $currentDate = Carbon::parse($request->start_date);
            $parentId = null;

            for ($i = 0; $i < $request->occurrences; $i++) {
                // Calculate period dates
                $from_date = $currentDate->copy();
                $to_date = $from_date->copy()->addDays($request->duration_days - 1);

                // Generate budget name with month/week info
                if ($request->recurrence_type === 'MONTHLY') {
                    $budgetName = $request->base_name . ' - ' . $from_date->format('F Y');
                } else {
                    $weekNum = $from_date->weekOfYear;
                    $budgetName = $request->base_name . ' - Week ' . $weekNum . ' ' . $from_date->format('Y');
                }

                // Calculate total amount for this occurrence
                $totalAmount = 0;
                foreach ($request->budget_items as $item) {
                    $totalAmount += $item['amounts'][$i];
                }

                // Create fund budget
                $fundBudget = FundBudget::create([
                    'fund_id' => $request->fund_id,
                    'ac_year_id' => $activeYear->id,
                    'budget_name' => $budgetName,
                    'budget_amount' => $totalAmount,
                    'from_date' => $from_date,
                    'to_date' => $to_date,
                    'is_recurring' => true,
                    'recurrence_type' => $request->recurrence_type,
                    'recurrence_parent_id' => $parentId,
                    'recurrence_sequence' => $i + 1,
                    'template_id' => $request->template_id,
                    'status' => FundBudget::STATUS_DRAFT,
                    'notes' => 'Recurring budget ' . ($i + 1) . ' of ' . $request->occurrences,

                    'created_by' => Auth::id()
                ]);

                // Set parent ID for subsequent budgets
                if ($i === 0) {
                    $parentId = $fundBudget->id;
                }

                // Create budget items with specific amounts for this occurrence
                foreach ($request->budget_items as $item) {
                    FundBudgetItem::create([
                        'fund_budget_id' => $fundBudget->id,
                        'ledger_id' => $item['ledger_id'],
                        'budgeted_amount' => $item['amounts'][$i],
                        'description' => $item['description'] ?? null
                    ]);
                }

                // Create approval record
                FundBudgetApproval::create([
                    'fund_budget_id' => $fundBudget->id,
                    'action' => 'CREATED',
                    'action_by' => Auth::id(),
                    'new_status' => FundBudget::STATUS_DRAFT,
                    'comments' => 'Created as part of recurring series'
                ]);

                $created[] = $fundBudget;

                // Move to next period
                if ($request->recurrence_type === 'WEEKLY') {
                    $currentDate->addWeeks(1);
                } else {
                    $currentDate->addMonth();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($created) . ' recurring budgets created successfully',
                'data' => $created
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create recurring budgets',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update fund budget (only for draft/rejected status)
     */
    public function update(Request $request, $id)
    {
        $budget = FundBudget::findOrFail($id);

        if (!$budget->can_edit) {
            return response()->json([
                'success' => false,
                'message' => 'Budget cannot be edited in current status'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'budget_name' => 'sometimes|required|string|max:255',
            'budget_amount' => 'sometimes|required|numeric|min:0',
            'from_date' => 'sometimes|required|date',
            'to_date' => 'sometimes|required|date|after_or_equal:from_date',
            'budget_items' => 'sometimes|required|array|min:1',
            'budget_items.*.ledger_id' => 'required|exists:ledgers,id',
            'budget_items.*.amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Update budget
            $budget->update([
                'budget_name' => $request->budget_name ?? $budget->budget_name,
                'budget_amount' => $request->budget_amount ?? $budget->budget_amount,
                'from_date' => $request->from_date ?? $budget->from_date,
                'to_date' => $request->to_date ?? $budget->to_date,
                'notes' => $request->notes ?? $budget->notes,
                'updated_by' => Auth::id()
            ]);

            // Update budget items if provided
            if ($request->has('budget_items')) {
                // Delete existing items
                $budget->budgetItems()->delete();

                // Create new items
                foreach ($request->budget_items as $item) {
                    FundBudgetItem::create([
                        'fund_budget_id' => $budget->id,
                        'ledger_id' => $item['ledger_id'],
                        'budgeted_amount' => $item['amount'],
                        'description' => $item['description'] ?? null
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Fund budget updated successfully',
                'data' => $budget->fresh()->load('budgetItems.ledger')
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update fund budget',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit budget for approval
     */
    public function submit($id)
    {
        $budget = FundBudget::findOrFail($id);

        try {
            $budget->submit();

            return response()->json([
                'success' => true,
                'message' => 'Fund budget submitted for approval',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Approve/Reject budget
     */
    public function processApproval(Request $request, $id)
    {
        $budget = FundBudget::findOrFail($id);

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

        try {
            if ($request->action === 'approve') {
                $budget->approve($request->notes);
                $message = 'Fund budget approved successfully';
            } else {
                $budget->reject($request->notes);
                $message = 'Fund budget rejected';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Close budget
     */
    public function close($id)
    {
        $budget = FundBudget::findOrFail($id);

        try {
            $budget->close();

            return response()->json([
                'success' => true,
                'message' => 'Fund budget closed successfully',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Reopen closed budget
     */
    public function reopen(Request $request, $id)
    {
        $budget = FundBudget::findOrFail($id);

        try {
            $budget->reopen($request->notes);

            return response()->json([
                'success' => true,
                'message' => 'Fund budget reopened successfully',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Delete draft budget
     */
    public function destroy($id)
    {
        $budget = FundBudget::findOrFail($id);

        if ($budget->status !== FundBudget::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft budgets can be deleted'
            ], 422);
        }

        try {
            // Delete related approvals first
            $budget->approvals()->delete();

            $budget->delete();

            return response()->json([
                'success' => true,
                'message' => 'Fund budget deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete fund budget',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get budget availability for a fund
     */
    public function checkAvailability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fund_id' => 'required|exists:funds,id',
            'amount' => 'required|numeric|min:0',
            'ledger_id' => 'nullable|exists:ledgers,id',
            'transaction_date' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $date = $request->transaction_date ?: now();

        // Find active budget for the fund on the given date
        $budget = FundBudget::where('fund_id', $request->fund_id)
            ->where('status', FundBudget::STATUS_APPROVED)
            ->where('from_date', '<=', $date)
            ->where('to_date', '>=', $date)
            ->first();

        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'No active budget found for this fund on the specified date',
                'has_budget' => false
            ]);
        }

        $availability = $budget->checkBudgetAvailability($request->amount, $request->ledger_id);

        return response()->json([
            'success' => true,
            'has_budget' => true,
            'budget_id' => $budget->id,
            'budget_name' => $budget->budget_name,
            'availability' => $availability,
            'warnings' => $availability['available'] ? [] : [$availability['message']]
        ]);
    }

    /**
     * Get fund budget report
     */
    public function report(Request $request)
    {

        $params = $request->has('params') ? $request->input('params', []) : $request->all();

        $reportType = $params['report_type'] ?? $request->input('report_type', 'summary');
        $fromDate = $params['from_date'] ?? $request->input('from_date');
        $toDate = $params['to_date'] ?? $request->input('to_date');
        $groupBy = $params['group_by'] ?? $request->input('group_by', 'fund');
        $fundId = $params['fund_id']
            ?? $params['job_id']
            ?? $params['job']
            ?? $request->input('fund_id')
            ?? $request->input('job_id')
            ?? $request->input('job');


        // Base query
        $query = FundBudget::with(['fund', 'budgetItems.ledger']);

        // FIXED: Filter by fund - handle both ID and name
        if ($fundId) {
            // Check if it's a numeric ID or a name
            if (is_numeric($fundId)) {
                $query->where('fund_id', $fundId);
            } else {
                // If it's a name, join with funds table
                $query->whereHas('fund', function ($q) use ($fundId) {
                    $q->where('name', $fundId);
                });
            }
        }

        // Date range filter
        if ($fromDate && $toDate) {
            $query->where(function ($q) use ($fromDate, $toDate) {
                $q->where('from_date', '<=', $toDate)
                    ->where('to_date', '>=', $fromDate);
            });
        } else {
            // Default to current accounting year
            $activeYear = AcYear::where('status', 1)->first();
            if ($activeYear) {
                $query->where('ac_year_id', $activeYear->id);
            }
        }

        // Fetch all budgets
        $budgets = $query->get();

        // Calculate summary
        $totalBudgetAmount = $budgets->sum('budget_amount');
        $totalUtilized = $budgets->sum('utilized_amount');
        $totalRemaining = $budgets->sum(fn($b) => $b->remaining_amount);

        $summary = [
            'total_budgets' => $budgets->count(),
            'total_budget_amount' => $totalBudgetAmount,
            'total_utilized' => $totalUtilized,
            'total_remaining' => $totalRemaining,
            'by_status' => $budgets->groupBy('status')->map->count(),
        ];

        // Handle COMPARISON Report
        if (strtolower($reportType) === 'comparison' || strtolower($reportType) === 'compare') {
            $comparisons = [];

            if ($groupBy === 'fund') {
                $grouped = $budgets->groupBy('fund_id');

                foreach ($grouped as $fundId => $group) {
                    $fund = $group->first()->fund;
                    $budgetTotal = $group->sum('budget_amount');
                    $utilizedTotal = $group->sum('utilized_amount');
                    $remainingTotal = $group->sum(fn($b) => $b->remaining_amount);
                    $utilizationRate = $budgetTotal > 0 ? ($utilizedTotal / $budgetTotal) * 100 : 0;

                    $comparisons[] = [
                        'fund' => [
                            'id' => $fund->id ?? null,
                            'name' => $fund->name ?? 'Unknown Fund'
                        ],
                        'total_budget' => $budgetTotal,
                        'total_utilized' => $utilizedTotal,
                        'total_remaining' => $remainingTotal,
                        'utilization_rate' => $utilizationRate,
                        'budget_count' => $group->count(),
                    ];
                }
            } elseif ($groupBy === 'month') {
                $grouped = $budgets->groupBy(function ($budget) {
                    return date('Y-m', strtotime($budget->from_date));
                });

                foreach ($grouped as $month => $group) {
                    $budgetTotal = $group->sum('budget_amount');
                    $utilizedTotal = $group->sum('utilized_amount');
                    $remainingTotal = $group->sum(fn($b) => $b->remaining_amount);
                    $utilizationRate = $budgetTotal > 0 ? ($utilizedTotal / $budgetTotal) * 100 : 0;

                    $comparisons[] = [
                        'period' => date('M Y', strtotime($month . '-01')),
                        'month' => $month,
                        'total_budget' => $budgetTotal,
                        'total_utilized' => $utilizedTotal,
                        'total_remaining' => $remainingTotal,
                        'utilization_rate' => $utilizationRate,
                        'budget_count' => $group->count(),
                    ];
                }
            }
            // ... rest of groupBy logic

            return response()->json([
                'success' => true,
                'comparison_type' => $groupBy,
                'comparisons' => $comparisons,
                'summary' => [
                    'total_budget_amount' => $totalBudgetAmount,
                    'total_utilized' => $totalUtilized,
                    'total_remaining' => $totalRemaining,
                ],
            ]);
        }

        // Default (Summary or Detailed)
        return response()->json([
            'success' => true,
            'budgets' => $budgets->map(function ($budget) {
                return [
                    'id' => $budget->id,
                    'fund' => $budget->fund->name ?? 'N/A',
                    'fund_id' => $budget->fund_id,
                    'budget_name' => $budget->budget_name,
                    'period' => date('d/m/Y', strtotime($budget->from_date)) . ' - ' . date('d/m/Y', strtotime($budget->to_date)),
                    'from_date' => $budget->from_date,
                    'to_date' => $budget->to_date,
                    'budget_amount' => $budget->budget_amount,
                    'utilized_amount' => $budget->utilized_amount,
                    'remaining_amount' => $budget->remaining_amount,
                    'utilization_percentage' => $budget->utilization_percentage,
                    'status' => $budget->status,
                ];
            }),
            'summary' => $summary,
        ]);
    }
    public function getGroups()
    {
        $groups = Group::whereIn('code', [1000, 4000, 5000, 6000, 8000])
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return response()->json([
            'success' => true,
            'data' => $groups
        ]);
    }
    public function getLedgersByGroup($groupId)
    {
        $ledgers = Ledger::where('group_id', $groupId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'data' => $ledgers
        ]);
    }
    /**
     * Get comparison report - Compare budgets across different periods or funds
     */
    public function comparisonReport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'comparison_type' => 'required|in:period,fund,year',
            'fund_ids' => 'required_if:comparison_type,fund|array',
            'periods' => 'required_if:comparison_type,period|array',
            'years' => 'required_if:comparison_type,year|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $comparisonType = $request->comparison_type;
        $comparisonData = [];

        switch ($comparisonType) {
            case 'fund':
                // Compare different funds in same period
                foreach ($request->fund_ids as $fundId) {
                    $budgets = FundBudget::with(['fund', 'budgetItems.ledger'])
                        ->where('fund_id', $fundId)
                        ->where('status', FundBudget::STATUS_APPROVED);

                    if ($request->has('from_date') && $request->has('to_date')) {
                        $budgets->inPeriod($request->from_date, $request->to_date);
                    }

                    $budgets = $budgets->get();

                    $comparisonData[] = [
                        'fund' => Fund::find($fundId),
                        'total_budget' => $budgets->sum('budget_amount'),
                        'total_utilized' => $budgets->sum('utilized_amount'),
                        'total_remaining' => $budgets->sum(fn($b) => $b->remaining_amount),
                        'utilization_rate' => $budgets->avg('utilization_percentage'),
                        'budget_count' => $budgets->count(),
                    ];
                }
                break;

            case 'period':
                // Compare same fund across different periods
                foreach ($request->periods as $period) {
                    $budgets = FundBudget::with(['fund', 'budgetItems.ledger'])
                        ->inPeriod($period['from_date'], $period['to_date']);

                    if ($request->filled('fund_id')) {
                        $query->where('fund_id', $request->fund_id);
                    }

                    $budgets = $budgets->get();

                    $comparisonData[] = [
                        'period' => $period['from_date'] . ' to ' . $period['to_date'],
                        'from_date' => $period['from_date'],
                        'to_date' => $period['to_date'],
                        'total_budget' => $budgets->sum('budget_amount'),
                        'total_utilized' => $budgets->sum('utilized_amount'),
                        'total_remaining' => $budgets->sum(fn($b) => $b->remaining_amount),
                        'utilization_rate' => $budgets->avg('utilization_percentage'),
                        'budget_count' => $budgets->count(),
                    ];
                }
                break;

            case 'year':
                // Compare across different years
                foreach ($request->years as $yearId) {
                    $budgets = FundBudget::with(['fund', 'budgetItems.ledger'])
                        ->where('ac_year_id', $yearId)
                        ->get();

                    $year = AcYear::find($yearId);

                    $comparisonData[] = [
                        'year' => $year ? $year->year_name : 'Unknown',
                        'year_id' => $yearId,
                        'total_budget' => $budgets->sum('budget_amount'),
                        'total_utilized' => $budgets->sum('utilized_amount'),
                        'total_remaining' => $budgets->sum(fn($b) => $b->remaining_amount),
                        'utilization_rate' => $budgets->avg('utilization_percentage'),
                        'budget_count' => $budgets->count(),
                    ];
                }
                break;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'comparison_type' => $comparisonType,
                'comparisons' => $comparisonData
            ]
        ]);
    }

    /**
     * Get utilization report - Detailed utilization analysis
     */
    public function utilizationReport(Request $request)
    {
        $query = FundBudget::with(['fund', 'budgetItems.ledger', 'utilization.entry']);

        // Apply filters
        if ($request->filled('fund_id')) {
            $query->where('fund_id', $request->fund_id);
        }

        if ($request->has('from_date') && $request->has('to_date')) {
            $query->inPeriod($request->from_date, $request->to_date);
        }

        $query->where('status', FundBudget::STATUS_APPROVED);

        $budgets = $query->get();

        // Categorize by utilization rate
        $utilizationCategories = [
            'under_utilized' => $budgets->filter(fn($b) => $b->utilization_percentage < 50)->values(),
            'moderate' => $budgets->filter(fn($b) => $b->utilization_percentage >= 50 && $b->utilization_percentage < 80)->values(),
            'well_utilized' => $budgets->filter(fn($b) => $b->utilization_percentage >= 80 && $b->utilization_percentage < 100)->values(),
            'over_utilized' => $budgets->filter(fn($b) => $b->utilization_percentage >= 100)->values(),
        ];

        $summary = [];
        foreach ($utilizationCategories as $category => $categoryBudgets) {
            $summary[$category] = [
                'count' => $categoryBudgets->count(),
                'total_budget' => $categoryBudgets->sum('budget_amount'),
                'total_utilized' => $categoryBudgets->sum('utilized_amount'),
                'average_utilization' => $categoryBudgets->avg('utilization_percentage'),
            ];
        }

        // Ledger-wise utilization
        $ledgerUtilization = [];
        foreach ($budgets as $budget) {
            foreach ($budget->budgetItems as $item) {
                $ledgerName = $item->ledger->name ?? 'Unknown';

                if (!isset($ledgerUtilization[$ledgerName])) {
                    $ledgerUtilization[$ledgerName] = [
                        'ledger' => $ledgerName,
                        'budgeted' => 0,
                        'utilized' => 0,
                        'remaining' => 0,
                    ];
                }

                $ledgerUtilization[$ledgerName]['budgeted'] += $item->budgeted_amount;
                $ledgerUtilization[$ledgerName]['utilized'] += $item->utilized_amount;
                $ledgerUtilization[$ledgerName]['remaining'] += $item->remaining_amount;
            }
        }

        // Calculate percentages
        foreach ($ledgerUtilization as &$item) {
            $item['utilization_percentage'] = $item['budgeted'] > 0
                ? ($item['utilized'] / $item['budgeted']) * 100
                : 0;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'ledger_wise' => array_values($ledgerUtilization),
                'budgets' => $budgets->map(function ($budget) {
                    return [
                        'id' => $budget->id,
                        'budget_name' => $budget->budget_name,
                        'fund_name' => $budget->fund->name ?? 'N/A',
                        'budget_amount' => $budget->budget_amount,
                        'utilized_amount' => $budget->utilized_amount,
                        'remaining_amount' => $budget->remaining_amount,
                        'utilization_percentage' => $budget->utilization_percentage,
                        'category' => $budget->utilization_percentage < 50 ? 'under_utilized' : ($budget->utilization_percentage < 80 ? 'moderate' : ($budget->utilization_percentage < 100 ? 'well_utilized' : 'over_utilized')),
                    ];
                })
            ]
        ]);
    }


}
