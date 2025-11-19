<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use App\Models\Group;
use App\Models\Ledger;
use App\Models\AcYear;
use App\Models\EntryItem;
use App\Models\Entry;
use App\Models\Fund;
use App\Models\AcYearLedgerBalance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class ChartOfAccountsController extends Controller
{
    use ApiResponse;

    /**
     * Apply middleware for permissions
     */
    public function __construct()
    {
    }

    /**
     * Get Chart of Accounts list with pagination
     */
    public function index(Request $request)
    {
        try {
            $query = Group::where('parent_id', 0)
                ->with(['children', 'ledgers'])
                ->orderBy('code', 'asc');
            
            // Search functionality
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('code', 'LIKE', "%{$search}%");
                });
            }

            // Get active accounting year
            $activeYear = AcYear::where('status', 1)
                ->first();

            // Pagination
            $perPage = $request->get('per_page', 20);
            $groups = $query->paginate($perPage);
            
            // Transform the data
            $groups->getCollection()->transform(function ($group) {
                return $this->transformGroup($group);
            });

            // Get user permissions
            $user = Auth::user();
            $permissions = [
                'can_create_group' => $user->can('chart_of_accounts.create_group'),
                'can_create_ledger' => $user->can('chart_of_accounts.create_ledger'),
                'can_edit_group' => $user->can('chart_of_accounts.edit_group'),
                'can_edit_ledger' => $user->can('chart_of_accounts.edit_ledger'),
                'can_delete_group' => $user->can('chart_of_accounts.delete_group'),
                'can_delete_ledger' => $user->can('chart_of_accounts.delete_ledger'),
                'can_view_details' => $user->can('chart_of_accounts.view_ledger_details'),
            ];

            return $this->successResponse([
                'groups' => $groups,
                'active_year' => $activeYear ? [
                    'id' => $activeYear->id,
                    'period' => $activeYear->getFormattedPeriod(),
                    'status' => $activeYear->status
                ] : null,
                'permissions' => $permissions
            ], 'Chart of accounts retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve chart of accounts: ' . $e->getMessage());
        }
    }
	public function funds(Request $request)
    {
        try {
            $funds = Fund::get();
            return response()->json([
                'success' => true,
                'data' => $funds,
                'message' => 'Funds retrieved successfully'
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
     * Get hierarchical tree data for groups and ledgers
     */
    public function getTreeData(Request $request)
    {
        try {
            $groups = Group::with(['children'])->where('parent_id', 0)->get();
            
            $tree = $this->buildTree($groups);
            
            return $this->successResponse([
                'tree' => $tree,
                'total_groups' => Group::count(),
                'total_ledgers' => Ledger::count()
            ], 'Tree data retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve tree data: ' . $e->getMessage());
        }
    }

    /**
     * Store new group
     */
    public function storeGroup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:200',
            'code' => 'required|string|size:4|unique:groups,code',
            'parent_id' => 'required|exists:groups,id'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Validate code is numeric and within range
        if (!is_numeric($request->code) || $request->code < 1000 || $request->code > 9999) {
            return $this->errorResponse('Group code must be a 4-digit number between 1000 and 9999', 400);
        }

        try {
            // Get parent group to validate code range
            $parentGroup = Group::findOrFail($request->parent_id);
            
            // Find the base group (top-level parent)
            $baseGroup = $this->findBaseGroup($parentGroup);
            
            // Validate code is within parent's thousand series
            if (!$this->isCodeInValidRange($request->code, $baseGroup->code)) {
                $rangeStart = $baseGroup->code;
                $rangeEnd = (intval($baseGroup->code) + 999);
                return $this->errorResponse("Group code must be within {$rangeStart}-{$rangeEnd} range for groups under {$baseGroup->name}", 400);
            }

            DB::beginTransaction();

            $group = Group::create([
                'name' => $request->name,
                'code' => $request->code,
                'parent_id' => $request->parent_id,
                'fixed' => 0,
                'added_by' => Auth::id()
            ]);

            DB::commit();

            return $this->successResponse([
                'group' => $this->transformGroup($group->load('parent'))
            ], 'Group created successfully');
            
        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse('Failed to create group: ' . $e->getMessage());
        }
    }

    /**
     * Update group
     */
    public function updateGroup(Request $request, $id)
    {
        $group = Group::findOrFail($id);
        
        // Check if group is fixed
        if ($group->fixed == 1) {
            return $this->errorResponse('System groups cannot be edited', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:200',
            'code' => 'required|string|size:4|unique:groups,code,' . $id,
            'parent_id' => 'required|exists:groups,id'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Prevent setting itself as parent
        if ($request->parent_id == $id) {
            return $this->errorResponse('A group cannot be its own parent', 400);
        }

        // Check for circular reference
        if ($this->wouldCreateCircularReference($id, $request->parent_id)) {
            return $this->errorResponse('This would create a circular reference', 400);
        }

        try {
            $parentGroup = Group::findOrFail($request->parent_id);
            $baseGroup = $this->findBaseGroup($parentGroup);
            
            if (!$this->isCodeInValidRange($request->code, $baseGroup->code)) {
                $rangeStart = $baseGroup->code;
                $rangeEnd = (intval($baseGroup->code) + 999);
                return $this->errorResponse("Group code must be within {$rangeStart}-{$rangeEnd} range", 400);
            }

            DB::beginTransaction();

            $group->update([
                'name' => $request->name,
                'code' => $request->code,
                'parent_id' => $request->parent_id
            ]);

            DB::commit();

            return $this->successResponse([
                'group' => $this->transformGroup($group->fresh('parent'))
            ], 'Group updated successfully');
            
        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse('Failed to update group: ' . $e->getMessage());
        }
    }

    /**
     * Delete group
     */
    public function deleteGroup($id)
    {
        $group = Group::findOrFail($id);
        
        if ($group->fixed == 1) {
            return $this->errorResponse('System groups cannot be deleted', 403);
        }

        if (Ledger::where('group_id', $id)->exists()) {
            return $this->errorResponse('Cannot delete group with existing ledgers', 400);
        }

        if (Group::where('parent_id', $id)->exists()) {
            return $this->errorResponse('Cannot delete group with sub-groups', 400);
        }

        try {
            DB::beginTransaction();
            $group->delete();
            DB::commit();
            
            return $this->successResponse(null, 'Group deleted successfully');
        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse('Failed to delete group: ' . $e->getMessage());
        }
    }

    /**
     * Get group details
     */
    public function getGroupDetails($id)
    {
        try {
            $group = Group::with(['parent', 'children', 'ledgers'])->findOrFail($id);
            
            return $this->successResponse([
                'group' => $this->transformGroupWithDetails($group)
            ], 'Group details retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve group: ' . $e->getMessage());
        }
    }

    /**
     * Store new ledger
     */
    public function storeLedger(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:300',
            'group_id' => 'required|exists:groups,id',
            'right_code' => 'required|string|max:4',
            'opening_balance' => 'nullable|numeric|min:0',
            'balance_type' => 'required_with:opening_balance|in:dr,cr',
            'is_bank' => 'nullable|boolean',
            'reconciliation' => 'nullable|boolean',
            'pa' => 'nullable|boolean',
            'hb' => 'nullable|boolean',
            'aging' => 'nullable|boolean',
            'credit_aging' => 'nullable|boolean',
            'iv' => 'nullable|boolean',
            'notes' => 'nullable|string|max:200',
            // Inventory fields
            'quantity' => 'nullable|integer|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'uom_id' => 'nullable|integer'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            // Get group code for left_code
            $group = Group::findOrFail($request->group_id);
            $leftCode = $group->code;
            
            // Format right_code with leading zeros
            $rightCode = str_pad($request->right_code, 4, '0', STR_PAD_LEFT);
            
            // Check for duplicate combination
            $exists = Ledger::where('left_code', $leftCode)
                ->where('right_code', $rightCode)
                ->exists();
                
            if ($exists) {
                return $this->errorResponse('Ledger Code duplicate not allowed', 400);
            }

            DB::beginTransaction();

            // Create ledger
            $ledger = Ledger::create([
                'name' => $request->name,
                'group_id' => $request->group_id,
                'left_code' => $leftCode,
                'right_code' => $rightCode,
                'type' => $request->is_bank ? 1 : 0,
                'reconciliation' => $request->reconciliation ?? 0,
                'pa' => $request->pa ?? 0,
                'hb' => $request->hb ?? 0,
                'aging' => $request->aging ?? 0,
                'credit_aging' => $request->credit_aging ?? 0,
                'iv' => $request->iv ?? 0,
                'notes' => $request->notes
            ]);

            // Add opening balance if provided
            if ($request->opening_balance > 0) {
                $activeYear = AcYear::where('status', 1)->first();
                
                if ($activeYear) {
                    AcYearLedgerBalance::create([
                        'ac_year_id' => $activeYear->id,
                        'ledger_id' => $ledger->id,
                        'dr_amount' => $request->balance_type == 'dr' ? $request->opening_balance : 0,
                        'cr_amount' => $request->balance_type == 'cr' ? $request->opening_balance : 0,
                        'quantity' => $request->quantity ?? 0,
                        'unit_price' => $request->unit_price ?? 0,
                        'uom_id' => $request->uom_id
                    ]);
                }
            }

            DB::commit();

            return $this->successResponse([
                'ledger' => $this->transformLedger($ledger->load(['group']))
            ], 'Ledger created successfully');
            
        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse('Failed to create ledger: ' . $e->getMessage());
        }
    }

    /**
     * Update ledger
     */
    public function updateLedger(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:300',
            'group_id' => 'required|exists:groups,id',
            'right_code' => 'required|string|max:4',
            'opening_balance' => 'nullable|numeric|min:0',
            'balance_type' => 'required_with:opening_balance|in:dr,cr',
            'is_bank' => 'nullable|boolean',
            'reconciliation' => 'nullable|boolean',
            'pa' => 'nullable|boolean',
            'hb' => 'nullable|boolean',
            'aging' => 'nullable|boolean',
            'credit_aging' => 'nullable|boolean',
            'iv' => 'nullable|boolean',
            'notes' => 'nullable|string|max:200'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $ledger = Ledger::findOrFail($id);

        try {
            $group = Group::findOrFail($request->group_id);
            $leftCode = $group->code;
            $rightCode = str_pad($request->right_code, 4, '0', STR_PAD_LEFT);
            
            // Check for duplicate (excluding current)
            $exists = Ledger::where('left_code', $leftCode)
                ->where('right_code', $rightCode)
                ->where('id', '!=', $id)
                ->exists();
                
            if ($exists) {
                return $this->errorResponse('Ledger Code duplicate not allowed', 400);
            }

            DB::beginTransaction();

            $ledger->update([
                'name' => $request->name,
                'group_id' => $request->group_id,
                'left_code' => $leftCode,
                'right_code' => $rightCode,
                'type' => $request->is_bank ? 1 : 0,
                'reconciliation' => $request->reconciliation ?? 0,
                'pa' => $request->pa ?? 0,
                'hb' => $request->hb ?? 0,
                'aging' => $request->aging ?? 0,
                'credit_aging' => $request->credit_aging ?? 0,
                'iv' => $request->iv ?? 0,
                'notes' => $request->notes
            ]);

            // Update opening balance
            $activeYear = AcYear::where('status', 1)->first();
            
            if ($activeYear) {
                $balance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
                    ->where('ledger_id', $id)
                    ->first();
                    
                if ($request->opening_balance > 0) {
                    if (!$balance) {
                        $balance = new AcYearLedgerBalance();
                        $balance->ac_year_id = $activeYear->id;
                        $balance->ledger_id = $ledger->id;
                    }
                    
                    $balance->dr_amount = $request->balance_type == 'dr' ? $request->opening_balance : 0;
                    $balance->cr_amount = $request->balance_type == 'cr' ? $request->opening_balance : 0;
                    $balance->quantity = $request->quantity ?? 0;
                    $balance->unit_price = $request->unit_price ?? 0;
                    $balance->uom_id = $request->uom_id;
                    $balance->save();
                } elseif ($balance) {
                    $balance->delete();
                }
            }

            DB::commit();

            return $this->successResponse([
                'ledger' => $this->transformLedger($ledger->fresh(['group']))
            ], 'Ledger updated successfully');
            
        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse('Failed to update ledger: ' . $e->getMessage());
        }
    }

    /**
     * Delete ledger
     */
    public function deleteLedger($id)
    {
        $ledger = Ledger::findOrFail($id);
        
        if (DB::table('entryitems')->where('ledger_id', $id)->exists()) {
            return $this->errorResponse('Cannot delete ledger with existing transactions', 400);
        }

        try {
            DB::beginTransaction();
            
            AcYearLedgerBalance::where('ledger_id', $id)->delete();
            $ledger->delete();
            
            DB::commit();
            
            return $this->successResponse(null, 'Ledger deleted successfully');
        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse('Failed to delete ledger: ' . $e->getMessage());
        }
    }

    /**
     * Get ledger details
     */
    public function getLedgerDetails($id)
    {
        try {
            $ledger = Ledger::with(['group', 'openingBalance' => function($query) {
                $query->whereHas('acYear', function($q) {
                    $q->where('status', 1);
                });
            }])->findOrFail($id);
            
            return $this->successResponse([
                'ledger' => $this->transformLedgerWithDetails($ledger)
            ], 'Ledger details retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve ledger: ' . $e->getMessage());
        }
    }

    /**
     * View ledger with transactions
     */
    public function viewLedger($id)
    {
        try {
            $ledger = Ledger::with(['group'])->findOrFail($id);
            
            $activeYear = AcYear::where('status', 1)->first();
            
            if (!$activeYear) {
                return $this->errorResponse('No active accounting year found', 400);
            }
            
            // Get opening balance
            $openingBalance = AcYearLedgerBalance::where('ac_year_id', $activeYear->id)
                ->where('ledger_id', $ledger->id)
                ->first();
            
            // Get recent transactions
            $recentTransactions = EntryItem::with(['entry:id,date,entry_code,narration,entrytype_id'])
                ->where('ledger_id', $ledger->id)
                ->whereHas('entry', function($query) use ($activeYear) {
                    $query->whereBetween('date', [$activeYear->from_year_month, $activeYear->to_year_month]);
                })
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'date' => $item->entry->date,
                        'entry_code' => $item->entry->entry_code,
                        'narration' => $item->entry->narration ?? $item->narration,
                        'debit' => $item->dc === 'D' ? $item->amount : 0,
                        'credit' => $item->dc === 'C' ? $item->amount : 0,
                        'entry_type' => $item->entry->entrytype_id
                    ];
                });
            
            // Calculate current balance
            $currentBalance = $ledger->getCurrentBalance();
            
            return $this->successResponse([
                'ledger' => $this->transformLedgerWithDetails($ledger),
                'opening_balance' => $openingBalance ? [
                    'debit' => $openingBalance->dr_amount,
                    'credit' => $openingBalance->cr_amount,
                    'net' => $openingBalance->getNetBalance(),
                    'formatted' => $openingBalance->getFormattedNetBalance()
                ] : null,
                'current_balance' => [
                    'amount' => abs($currentBalance),
                    'type' => $currentBalance >= 0 ? 'Dr' : 'Cr',
                    'formatted' => $ledger->getFormattedBalance()
                ],
                'recent_transactions' => $recentTransactions,
                'active_year' => [
                    'id' => $activeYear->id,
                    'period' => $activeYear->getFormattedPeriod()
                ]
            ], 'Ledger view data retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve ledger view: ' . $e->getMessage());
        }
    }

    /**
     * Get summary totals for dashboard
     */
    public function getSummaryTotals()
    {
        try {
            $activeYear = AcYear::where('status', 1)
                ->first();
                
            if (!$activeYear) {
                return $this->errorResponse('No active accounting year found', 400);
            }
            
            $asOnDate = date('Y-m-d');
            
            // Initialize totals
            $totals = [
                'assets' => 0,
                'liabilities' => 0,
                'income' => 0,
                'expenses' => 0
            ];
            
            // Get all base groups
            $baseGroups = Group::where('parent_id', 0)->get();
            
            foreach ($baseGroups as $baseGroup) {
                $groupCode = intval($baseGroup->code);
                $ledgerIds = $this->getAllLedgerIdsUnderGroup($baseGroup->id);
                
                if (empty($ledgerIds)) {
                    continue;
                }
                
                $currentBalance = $this->calculateCurrentBalanceForSummary($ledgerIds, $activeYear->id, $asOnDate);
                
                // Categorize based on group code ranges
                if ($groupCode >= 1000 && $groupCode <= 1999) {
                    $totals['assets'] += $currentBalance;
                } elseif ($groupCode >= 2000 && $groupCode <= 2999) {
                    $totals['liabilities'] += abs($currentBalance);
                } elseif ($groupCode >= 3000 && $groupCode <= 3999) {
                    $nonPABalance = $this->calculateNonPABalance($ledgerIds, $activeYear->id, $asOnDate);
                    $totals['liabilities'] += abs($nonPABalance);
                } elseif ($groupCode >= 4000 && $groupCode <= 4999 || $groupCode >= 8000 && $groupCode <= 8999) {
                    $totals['income'] += abs($currentBalance);
                } elseif ($groupCode >= 5000 && $groupCode <= 6999 || $groupCode >= 9000 && $groupCode <= 9999) {
                    $totals['expenses'] += abs($currentBalance);
                }
            }
            
            // Calculate Current Year P&L
            $currentYearPL = $this->calculateCurrentYearPL($activeYear, $asOnDate);
            
            if ($currentYearPL != 0) {
                $totals['liabilities'] += abs($currentYearPL);
            }
            
            return $this->successResponse([
                'totals' => [
                    'assets' => round($totals['assets'], 2),
                    'liabilities' => round($totals['liabilities'], 2),
                    'income' => round($totals['income'], 2),
                    'expenses' => round($totals['expenses'], 2)
                ],
                'formatted' => [
                    'assets' => number_format($totals['assets'], 2),
                    'liabilities' => number_format($totals['liabilities'], 2),
                    'income' => number_format($totals['income'], 2),
                    'expenses' => number_format($totals['expenses'], 2)
                ],
                'as_on_date' => $asOnDate
            ], 'Summary totals calculated successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Error calculating summary totals: ' . $e->getMessage());
        }
    }

    /**
     * Get hierarchical groups for dropdown
     */
    public function getHierarchicalGroups(Request $request)
    {
        try {
            $excludeId = $request->get('exclude_id');
            $groups = $this->getHierarchicalGroupsList($excludeId);
            
            return $this->successResponse([
                'groups' => $groups
            ], 'Hierarchical groups retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve groups: ' . $e->getMessage());
        }
    }

    // ============= Private Helper Methods =============

    /**
     * Transform group for API response
     */
    private function transformGroup($group)
    {
        return [
            'id' => $group->id,
            'name' => $group->name,
            'code' => $group->code,
            'parent_id' => $group->parent_id,
            'parent_name' => $group->parent ? $group->parent->name : null,
            'fixed' => $group->fixed,
            'type' => $group->getGroupType(),
            'children_count' => $group->children ? $group->children->count() : 0,
            'ledgers_count' => $group->ledgers ? $group->ledgers->count() : 0,
            'created_at' => $group->created_at
        ];
    }

    /**
     * Transform group with full details
     */
    private function transformGroupWithDetails($group)
    {
        $data = $this->transformGroup($group);
        $data['children'] = $group->children ? $group->children->map(function($child) {
            return $this->transformGroup($child);
        }) : [];
        $data['ledgers'] = $group->ledgers ? $group->ledgers->map(function($ledger) {
            return $this->transformLedger($ledger);
        }) : [];
        return $data;
    }

    /**
     * Transform ledger for API response
     */
    private function transformLedger($ledger)
    {
        $openingBalance = $ledger->openingBalances ? $ledger->openingBalances->first() : null;
        
        return [
            'id' => $ledger->id,
            'name' => $ledger->name,
            'code' => $ledger->getFullCode(),
            'left_code' => $ledger->left_code,
            'right_code' => $ledger->right_code,
            'group_id' => $ledger->group_id,
            'group_name' => $ledger->group ? $ledger->group->name : null,
            'type' => $ledger->type,
            'is_bank' => $ledger->isBankAccount(),
            'reconciliation' => $ledger->reconciliation,
            'pa' => $ledger->pa,
            'hb' => $ledger->hb,
            'aging' => $ledger->aging,
            'credit_aging' => $ledger->credit_aging,
            'iv' => $ledger->iv,
            'notes' => $ledger->notes,
            'opening_balance' => $openingBalance ? [
                'debit' => $openingBalance->dr_amount,
                'credit' => $openingBalance->cr_amount,
                'net' => $openingBalance->getNetBalance()
            ] : null,
            'created_at' => $ledger->created_at
        ];
    }

    /**
     * Transform ledger with full details
     */
    private function transformLedgerWithDetails($ledger)
    {
        $data = $this->transformLedger($ledger);
        $data['current_balance'] = $ledger->getCurrentBalance();
        $data['formatted_balance'] = $ledger->getFormattedBalance();
        $data['normal_balance'] = $ledger->getNormalBalance();
        $data['ledger_type'] = $ledger->getLedgerType();
        return $data;
    }

    /**
     * Build tree structure
     */
    private function buildTree($groups)
    {
        $tree = [];
        
        foreach ($groups as $group) {
            $node = [
                'id' => 'g_' . $group->id,
                'text' => $group->name . ' (' . $group->code . ')',
                'type' => 'group',
                'data' => $this->transformGroup($group),
                'children' => []
            ];
            
            if ($group->children->count() > 0) {
                $node['children'] = array_merge($node['children'], $this->buildTree($group->children));
            }
            
            foreach ($group->ledgers as $ledger) {
                $balance = $ledger->openingBalances->first();
                $ledgerCode = $ledger->getFullCode();
                $node['children'][] = [
                    'id' => 'l_' . $ledger->id,
                    'text' => $ledger->name . ' [' . $ledgerCode . ']' . 
                             ($balance ? ' (RM' . number_format($balance->dr_amount - $balance->cr_amount, 2) . ')' : ''),
                    'type' => 'ledger',
                    'icon' => 'ledger',
                    'data' => $this->transformLedger($ledger)
                ];
            }
            
            $tree[] = $node;
        }
        
        return $tree;
    }

    /**
     * Get hierarchical groups list
     */
    private function getHierarchicalGroupsList($excludeId = null, $parentId = 0, $prefix = '')
    {
        $query = Group::where('parent_id', $parentId)->orderBy('code', 'asc');
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        $groups = $query->get();
        $result = [];
        
        foreach ($groups as $group) {
            if ($excludeId && $this->isDescendantOf($group->id, $excludeId)) {
                continue;
            }
            
            $result[] = [
                'id' => $group->id,
                'name' => $group->name,
                'code' => $group->code,
                'display_name' => $prefix . $group->name . ' (' . $group->code . ')',
                'level' => substr_count($prefix, '    ')
            ];
            
            $children = $this->getHierarchicalGroupsList($excludeId, $group->id, $prefix . '    ');
            $result = array_merge($result, $children);
        }
        
        return $result;
    }
	public function group_list(Request $request)
    {
        $query = Group::with('parent');

        if ($request->has('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        if ($request->has('main_only')) {
            $query->mainGroups();
        }

        if ($request->has('fixed_only')) {
            $query->fixed();
        }

        $groups = $query->orderBy('code')->get();

        return response()->json([
            'success' => true,
            'data' => $groups
        ]);
    }

    /**
     * Find base group
     */
    private function findBaseGroup($group)
    {
        while ($group->parent_id != 0) {
            $group = $group->parent;
        }
        return $group;
    }

    /**
     * Check if code is in valid range
     */
    private function isCodeInValidRange($code, $baseCode)
    {
        $codeInt = intval($code);
        $baseInt = intval($baseCode);
        
        $rangeStart = $baseInt;
        $rangeEnd = $baseInt + 999;
        
        if ($codeInt == $baseInt) {
            return false;
        }
        
        return $codeInt >= $rangeStart && $codeInt <= $rangeEnd;
    }

    /**
     * Check for circular reference
     */
    private function wouldCreateCircularReference($groupId, $parentId)
    {
        $parent = Group::find($parentId);
        while ($parent) {
            if ($parent->id == $groupId) {
                return true;
            }
            $parent = $parent->parent;
        }
        return false;
    }

    /**
     * Check if descendant of
     */
    private function isDescendantOf($groupId, $ancestorId)
    {
        $group = Group::find($groupId);
        while ($group && $group->parent_id != 0) {
            if ($group->parent_id == $ancestorId) {
                return true;
            }
            $group = $group->parent;
        }
        return false;
    }

    /**
     * Get all ledger IDs under group
     */
    private function getAllLedgerIdsUnderGroup($groupId)
    {
        $ledgerIds = [];
        
        $directLedgers = Ledger::where('group_id', $groupId)->pluck('id')->toArray();
        $ledgerIds = array_merge($ledgerIds, $directLedgers);
        
        $subGroups = Group::where('parent_id', $groupId)->get();
        foreach ($subGroups as $subGroup) {
            $subLedgerIds = $this->getAllLedgerIdsUnderGroup($subGroup->id);
            $ledgerIds = array_merge($ledgerIds, $subLedgerIds);
        }
        
        return $ledgerIds;
    }

    /**
     * Calculate current balance for summary
     */
    private function calculateCurrentBalanceForSummary($ledgerIds, $acYearId, $asOnDate)
    {
        if (empty($ledgerIds)) {
            return 0;
        }
        
        $openingBalances = DB::table('ac_year_ledger_balance')
            ->where('ac_year_id', $acYearId)
            ->whereIn('ledger_id', $ledgerIds)
            ->selectRaw('SUM(dr_amount - cr_amount) as opening_balance')
            ->first();
            
        $openingBalance = $openingBalances ? $openingBalances->opening_balance : 0;
        
        $transactionBalances = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->whereIn('entryitems.ledger_id', $ledgerIds)
            ->whereRaw('DATE(entries.date) <= ?', [$asOnDate])
            ->selectRaw('SUM(CASE WHEN entryitems.dc = "D" THEN entryitems.amount ELSE -entryitems.amount END) as transaction_balance')
            ->first();
            
        $transactionBalance = $transactionBalances ? $transactionBalances->transaction_balance : 0;
        
        return $openingBalance + $transactionBalance;
    }

    /**
     * Calculate non-PA balance
     */
    private function calculateNonPABalance($ledgerIds, $acYearId, $asOnDate)
    {
        if (empty($ledgerIds)) {
            return 0;
        }
        
        $nonPALedgerIds = DB::table('ledgers')
            ->whereIn('id', $ledgerIds)
            ->where('pa', '!=', 1)
            ->pluck('id')
            ->toArray();
        
        if (empty($nonPALedgerIds)) {
            return 0;
        }
        
        return $this->calculateCurrentBalanceForSummary($nonPALedgerIds, $acYearId, $asOnDate);
    }

    /**
     * Calculate current year P&L
     */
    private function calculateCurrentYearPL($activeYear, $asOnDate)
    {
        // Income calculation
        $incomeGroups = Group::where(function($query) {
                $query->where('code', 'LIKE', '4%')
                      ->orWhere('code', 'LIKE', '8%');
            })
            ->where('parent_id', 0)
            ->get();
        
        $totalIncome = 0;
        foreach ($incomeGroups as $group) {
            $ledgerIds = $this->getAllLedgerIdsUnderGroup($group->id);
            if (!empty($ledgerIds)) {
                $balance = $this->calculateIncomeBalance($ledgerIds, $activeYear->id, $asOnDate);
                $totalIncome += $balance;
            }
        }
        
        // Expense calculation
        $expenseGroups = Group::where(function($query) {
                $query->where('code', 'LIKE', '5%')
                      ->orWhere('code', 'LIKE', '6%')
                      ->orWhere('code', 'LIKE', '9%');
            })
            ->where('parent_id', 0)
            ->get();
        
        $totalExpenses = 0;
        foreach ($expenseGroups as $group) {
            $ledgerIds = $this->getAllLedgerIdsUnderGroup($group->id);
            if (!empty($ledgerIds)) {
                $balance = $this->calculateExpenseBalance($ledgerIds, $activeYear->id, $asOnDate);
                $totalExpenses += $balance;
            }
        }
        
        return $totalIncome - $totalExpenses;
    }

    /**
     * Calculate income balance
     */
    private function calculateIncomeBalance($ledgerIds, $acYearId, $asOnDate)
    {
        if (empty($ledgerIds)) {
            return 0;
        }
        
        $openingBalances = DB::table('ac_year_ledger_balance')
            ->where('ac_year_id', $acYearId)
            ->whereIn('ledger_id', $ledgerIds)
            ->selectRaw('SUM(cr_amount - dr_amount) as opening_credit_balance')
            ->first();
            
        $openingBalance = $openingBalances ? $openingBalances->opening_credit_balance : 0;
        
        $transactionBalances = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->whereIn('entryitems.ledger_id', $ledgerIds)
            ->whereRaw('DATE(entries.date) <= ?', [$asOnDate])
            ->selectRaw('SUM(CASE WHEN entryitems.dc = "C" THEN entryitems.amount ELSE -entryitems.amount END) as transaction_credit_balance')
            ->first();
            
        $transactionBalance = $transactionBalances ? $transactionBalances->transaction_credit_balance : 0;
        
        return $openingBalance + $transactionBalance;
    }

    /**
     * Calculate expense balance
     */
    private function calculateExpenseBalance($ledgerIds, $acYearId, $asOnDate)
    {
        if (empty($ledgerIds)) {
            return 0;
        }
        
        $openingBalances = DB::table('ac_year_ledger_balance')
            ->where('ac_year_id', $acYearId)
            ->whereIn('ledger_id', $ledgerIds)
            ->selectRaw('SUM(dr_amount - cr_amount) as opening_debit_balance')
            ->first();
            
        $openingBalance = $openingBalances ? $openingBalances->opening_debit_balance : 0;
        
        $transactionBalances = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->whereIn('entryitems.ledger_id', $ledgerIds)
            ->whereRaw('DATE(entries.date) <= ?', [$asOnDate])
            ->selectRaw('SUM(CASE WHEN entryitems.dc = "D" THEN entryitems.amount ELSE -entryitems.amount END) as transaction_debit_balance')
            ->first();
            
        $transactionBalance = $transactionBalances ? $transactionBalances->transaction_debit_balance : 0;
        
        return $openingBalance + $transactionBalance;
    }
	public function active_year(Request $request)
    {
		try {
           $activeYear = AcYear::where('status', 1)->first();
           $activeYear->from_year_month = Carbon::parse($activeYear->from_year_month)->format('Y-m-d');
           $activeYear->to_year_month = Carbon::parse($activeYear->to_year_month)->format('Y-m-d');
            return $this->successResponse([
                'active_year' => $activeYear
            ], 'Active Financial year retrived successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve ledger: ' . $e->getMessage());
        }
    }
	/**
	 * Create a new fund
	 */
	public function createFund(Request $request)
	{
		$validator = Validator::make($request->all(), [
			'fund_name' => 'required|string|max:100|unique:funds,name',
			'fund_description' => 'nullable|string|max:500',
			'status' => 'nullable|boolean'
		]);

		if ($validator->fails()) {
			return $this->validationErrorResponse($validator->errors());
		}

		try {
			DB::beginTransaction();
			
			// Generate fund code automatically
			$lastFund = Fund::orderBy('code', 'desc')->first();
			$newCode = 'F001'; // Default first code
			
			if ($lastFund && preg_match('/F(\d+)/', $lastFund->code, $matches)) {
				$nextNumber = intval($matches[1]) + 1;
				$newCode = 'F' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
			}
			
			$fund = Fund::create([
				'code' => $newCode,
				'name' => $request->fund_name,
				'description' => $request->fund_description,
				'created_by' => Auth::id()
			]);
			
			DB::commit();
			
			return $this->successResponse([
				'fund' => $fund
			], 'Fund created successfully');
			
		} catch (\Exception $e) {
			DB::rollback();
			return $this->errorResponse('Failed to create fund: ' . $e->getMessage());
		}
	}

	/**
	 * Update existing fund
	 */
	public function updateFund(Request $request, $id)
	{
		$fund = Fund::find($id);
		
		if (!$fund) {
			return $this->errorResponse('Fund not found', 404);
		}
		
		$validator = Validator::make($request->all(), [
			'fund_name' => 'required|string|max:100|unique:funds,name,' . $id,
			'fund_description' => 'nullable|string|max:500',
			'status' => 'nullable|boolean'
		]);

		if ($validator->fails()) {
			return $this->validationErrorResponse($validator->errors());
		}

		try {
			DB::beginTransaction();
			
			$fund->update([
				'name' => $request->fund_name,
				'description' => $request->fund_description,
			]);
			
			DB::commit();
			
			return $this->successResponse([
				'fund' => $fund
			], 'Fund updated successfully');
			
		} catch (\Exception $e) {
			DB::rollback();
			return $this->errorResponse('Failed to update fund: ' . $e->getMessage());
		}
	}

	/**
	 * Delete fund
	 */
	public function deleteFund($id)
	{
		$fund = Fund::find($id);
		
		if (!$fund) {
			return $this->errorResponse('Fund not found', 404);
		}
		
		// Check if fund is used in entries table
		$entriesExist = Entry::where('fund_id', $id)->exists();
		
		if ($entriesExist) {
			return $this->errorResponse('Cannot delete fund. It is being used in accounting entries.', 400);
		}
		
		try {
			DB::beginTransaction();
			
			$fund->delete();
			
			DB::commit();
			
			return $this->successResponse(null, 'Fund deleted successfully');
			
		} catch (\Exception $e) {
			DB::rollback();
			return $this->errorResponse('Failed to delete fund: ' . $e->getMessage());
		}
	}
}