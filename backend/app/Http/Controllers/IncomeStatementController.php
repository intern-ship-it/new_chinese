<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Exports\IncomeStatementExport;
use Illuminate\Http\Request;
use App\Models\Entry;
use App\Models\EntryItem;
use App\Models\Ledger;
use App\Models\AcYear;
use App\Models\Group;
use DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;

class IncomeStatementController extends Controller
{
    /**
     * Get Income Statement Report
     * @route GET /api/v1/accounts/income-statement
     */
    public function getIncomeStatement(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'display_type' => 'in:full,monthly',
                'fund_id' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get active accounting year
            $activeYear = AcYear::where('status', 1)->first();
            
            if (!$activeYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active accounting year found'
                ], 404);
            }

            // Get parameters
            $fromDate = $request->from_date;
            $toDate = $request->to_date;
            $displayType = $request->display_type ?? 'full';
            $fundId = $request->fund_id ?? null;

            // Validate dates are within accounting year
            if ($fromDate < $activeYear->from_year_month) {
                $fromDate = date('Y-m-d', strtotime($activeYear->from_year_month));
            }
           /*  if ($toDate > $activeYear->to_year_month) {
                $toDate = date('Y-m-d', strtotime($activeYear->to_year_month));
            } */
			/* print_r('$fromDate');
			print_r($fromDate);
			print_r('$toDate');
			print_r($toDate); */
            // For monthly view, validate it doesn't exceed 12 months
            if ($displayType == 'monthly') {
                $monthsDiff = Carbon::parse($fromDate)->diffInMonths(Carbon::parse($toDate));
                if ($monthsDiff > 12) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Monthly view cannot exceed 12 months'
                    ], 200);
                }
            }

            // Get Income Statement Data
            $data = $displayType == 'monthly' 
                ? $this->getMonthlyData($fromDate, $toDate, $fundId)
                : $this->getFullData($fromDate, $toDate, $fundId);

            return response()->json([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                    'display_type' => $displayType,
                    'accounting_year' => $activeYear,
                    'fund_id' => $fundId
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate income statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Full View Data
     */
    private function getFullData($fromDate, $toDate, $fundId)
    {
        // Get data for each major category
        $revenue = $this->getCategoryData('revenue', $fromDate, $toDate, $fundId);
        $directCost = $this->getCategoryData('direct_cost', $fromDate, $toDate, $fundId);
        $otherIncome = $this->getCategoryData('other_income', $fromDate, $toDate, $fundId);
        $expenses = $this->getCategoryData('expenses', $fromDate, $toDate, $fundId);
        $taxation = $this->getCategoryData('taxation', $fromDate, $toDate, $fundId);

        // Calculate totals
        $totalRevenue = $this->sumCategory($revenue);
        $totalDirectCost = $this->sumCategory($directCost);
        $grossSurplus = $totalRevenue - $totalDirectCost;
        $totalOtherIncome = $this->sumCategory($otherIncome);
        $totalExpenses = $this->sumCategory($expenses);
        $surplusBeforeTax = $grossSurplus + $totalOtherIncome - $totalExpenses;
        $totalTaxation = $this->sumCategory($taxation);
        $surplusAfterTax = $surplusBeforeTax - $totalTaxation;

        return [
            'revenue' => [
                'items' => $revenue,
                'total' => $totalRevenue
            ],
            'direct_cost' => [
                'items' => $directCost,
                'total' => $totalDirectCost
            ],
            'gross_surplus' => $grossSurplus,
            'other_income' => [
                'items' => $otherIncome,
                'total' => $totalOtherIncome
            ],
            'expenses' => [
                'items' => $expenses,
                'total' => $totalExpenses
            ],
            'surplus_before_tax' => $surplusBeforeTax,
            'taxation' => [
                'items' => $taxation,
                'total' => $totalTaxation
            ],
            'surplus_after_tax' => $surplusAfterTax,
            'net_profit' => $surplusAfterTax
        ];
    }

    /**
     * Get Monthly View Data
     */
    private function getMonthlyData($fromDate, $toDate, $fundId)
    {
        // Generate month list
        $months = [];
        $current = Carbon::parse($fromDate)->startOfMonth();
        $end = Carbon::parse($toDate)->endOfMonth();
        
        while ($current <= $end) {
            $months[] = [
                'label' => $current->format('M, Y'),
                'start' => $current->copy()->startOfMonth()->format('Y-m-d'),
                'end' => $current->copy()->endOfMonth()->format('Y-m-d'),
                'key' => $current->format('Y_m')
            ];
            $current->addMonth();
        }

        // Get monthly data for each category
        $monthlyData = [];
        foreach ($months as $month) {
            $revenue = $this->getCategoryData('revenue', $month['start'], $month['end'], $fundId);
            $directCost = $this->getCategoryData('direct_cost', $month['start'], $month['end'], $fundId);
            $otherIncome = $this->getCategoryData('other_income', $month['start'], $month['end'], $fundId);
            $expenses = $this->getCategoryData('expenses', $month['start'], $month['end'], $fundId);
            $taxation = $this->getCategoryData('taxation', $month['start'], $month['end'], $fundId);

            $totalRevenue = $this->sumCategory($revenue);
            $totalDirectCost = $this->sumCategory($directCost);
            $grossSurplus = $totalRevenue - $totalDirectCost;
            $totalOtherIncome = $this->sumCategory($otherIncome);
            $totalExpenses = $this->sumCategory($expenses);
            $surplusBeforeTax = $grossSurplus + $totalOtherIncome - $totalExpenses;
            $totalTaxation = $this->sumCategory($taxation);
            $surplusAfterTax = $surplusBeforeTax - $totalTaxation;

            $monthlyData[$month['key']] = [
                'revenue' => $totalRevenue,
                'direct_cost' => $totalDirectCost,
                'gross_surplus' => $grossSurplus,
                'other_income' => $totalOtherIncome,
                'expenses' => $totalExpenses,
                'surplus_before_tax' => $surplusBeforeTax,
                'taxation' => $totalTaxation,
                'surplus_after_tax' => $surplusAfterTax
            ];
        }

        // Get item-wise monthly breakdown
        $itemWiseData = $this->getItemWiseMonthlyData($months, $fundId);

        // Calculate totals
        $totals = [
            'revenue' => array_sum(array_column($monthlyData, 'revenue')),
            'direct_cost' => array_sum(array_column($monthlyData, 'direct_cost')),
            'gross_surplus' => array_sum(array_column($monthlyData, 'gross_surplus')),
            'other_income' => array_sum(array_column($monthlyData, 'other_income')),
            'expenses' => array_sum(array_column($monthlyData, 'expenses')),
            'surplus_before_tax' => array_sum(array_column($monthlyData, 'surplus_before_tax')),
            'taxation' => array_sum(array_column($monthlyData, 'taxation')),
            'surplus_after_tax' => array_sum(array_column($monthlyData, 'surplus_after_tax'))
        ];

        return [
            'months' => $months,
            'monthly_summary' => $monthlyData,
            'item_wise_data' => $itemWiseData,
            'totals' => $totals
        ];
    }

    /**
     * Get category data based on group codes
     */
    private function getCategoryData($category, $fromDate, $toDate, $fundId)
    {
        // Map categories to group code ranges
        $categoryMap = [
            'revenue' => ['start' => 4000, 'end' => 4999],
            'direct_cost' => ['start' => 5000, 'end' => 5999],
            'expenses' => ['start' => 6000, 'end' => 6999],
            'other_income' => ['start' => 8000, 'end' => 8999],
            'taxation' => ['start' => 9000, 'end' => 9999]
        ];

        if (!isset($categoryMap[$category])) {
            return [];
        }

        $range = $categoryMap[$category];
        
        // Get groups in the range
        $groups = Group::whereBetween('code', [$range['start'], $range['end']])
			->where('parent_id', 0)
            ->with('ledgers')
            ->get();
			

        $categoryData = [];
        
        foreach ($groups as $group) {
            $groupData = $this->getGroupData($group, $fromDate, $toDate, $fundId);
            if (!empty($groupData['ledgers'])) {
                $categoryData = array_merge($categoryData, $groupData['ledgers']);
            }
        }
        return $categoryData;
    }

    /**
     * Get group data with ledger balances
     */
    private function getGroupData($group, $fromDate, $toDate, $fundId)
    {
        $data = [
            'group_id' => $group->id,
            'group_code' => $group->code,
            'group_name' => $group->name,
            'ledgers' => []
        ];
        // Process ledgers in this group
        foreach ($group->ledgers as $ledger) {
            $balance = $this->getLedgerBalance($ledger->id, $fromDate, $toDate, $fundId);
            
            if ($balance != 0) {
                $data['ledgers'][] = [
                    'id' => $ledger->id,
                    'code' => $ledger->left_code . '/' . $ledger->right_code,
                    'name' => $ledger->name,
                    'balance' => $balance // Use absolute value for display
                ];
            }
        }

        // Process child groups recursively
        foreach ($group->children as $childGroup) {
            $childData = $this->getGroupData($childGroup, $fromDate, $toDate, $fundId);
            if (!empty($childData['ledgers'])) {
                $data['ledgers'] = array_merge($data['ledgers'], $childData['ledgers']);
            }
        }

        return $data;
    }

    /**
     * Get ledger balance for a period
     */
    private function getLedgerBalance($ledgerId, $fromDate, $toDate, $fundId)
    {
		DB::enableQueryLog();
        $query = DB::table('entryitems')
            ->join('entries', 'entryitems.entry_id', '=', 'entries.id')
            ->whereRaw('entryitems.ledger_id::integer = ?', [$ledgerId])
            ->whereBetween('entries.date', [$fromDate, $toDate]);

        if ($fundId) {
            $query->where('entries.fund_id', $fundId);
        }

        $result = $query->select(
            DB::raw("SUM(CASE WHEN entryitems.dc = 'C' THEN entryitems.amount ELSE 0 END) as credit"),
            DB::raw("SUM(CASE WHEN entryitems.dc = 'D' THEN entryitems.amount ELSE 0 END) as debit")
        )->first();
		$queries = DB::getQueryLog();
		// dd($queries);
        // Get ledger's group to determine if it's normally debit or credit
        $ledger = Ledger::find($ledgerId);
        if (!$ledger || !$ledger->group) {
            return 0;
        }

        $groupCode = intval($ledger->group->code);
        // Revenue (4000s) and Other Income (8000s) are credit accounts
        if (($groupCode >= 4000 && $groupCode <= 4999) || ($groupCode >= 8000 && $groupCode <= 8999)) {
            return ($result->credit ?? 0) - ($result->debit ?? 0);
        }
        // Expenses, Direct Cost, and Taxation are debit accounts
        else {
            return ($result->debit ?? 0) - ($result->credit ?? 0);
        }
    }

    /**
     * Get item-wise monthly data
     */
    private function getItemWiseMonthlyData($months, $fundId)
    {
        $categories = ['revenue', 'direct_cost', 'other_income', 'expenses', 'taxation'];
        $itemWiseData = [];

        foreach ($categories as $category) {
            $itemWiseData[$category] = [];
            
            // Get all items for this category across all months
            $allItems = [];
            foreach ($months as $month) {
                $items = $this->getCategoryData($category, $month['start'], $month['end'], $fundId);
                foreach ($items as $item) {
                    $allItems[$item['id']] = [
                        'code' => $item['code'],
                        'name' => $item['name']
                    ];
                }
            }

            // Now get monthly balances for each item
            foreach ($allItems as $ledgerId => $ledgerInfo) {
                $monthlyBalances = [];
                $total = 0;
                
                foreach ($months as $month) {
                    $balance = $this->getLedgerBalance($ledgerId, $month['start'], $month['end'], $fundId);
                    $monthlyBalances[$month['key']] = $balance;
                    $total += $balance;
                }

                if ($total > 0) { // Only include items with non-zero total
                    $itemWiseData[$category][] = array_merge(
                        $ledgerInfo,
                        ['monthly_balances' => $monthlyBalances],
                        ['total' => $total]
                    );
                }
            }
        }

        return $itemWiseData;
    }

    /**
     * Sum category items
     */
    private function sumCategory($items)
    {
        return array_sum(array_column($items, 'balance'));
    }

    /**
     * Export Income Statement as PDF/Excel
     * @route GET /api/v1/accounts/income-statement/export
     */
    public function exportIncomeStatement(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'display_type' => 'in:full,monthly',
                'fund_id' => 'nullable|integer',
                'format' => 'required|in:pdf,excel'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get parameters
            $fromDate = $request->from_date;
            $toDate = $request->to_date;
            $displayType = $request->display_type ?? 'full';
            $fundId = $request->fund_id ?? null;
            $format = $request->format;

            // Get active accounting year
            $activeYear = AcYear::where('status', 1)->first();
            
            if (!$activeYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active accounting year found'
                ], 404);
            }

            // Get temple details
            $system_settings = DB::table('system_settings')->where('type', 'SYSTEM')->get();
            if (!$system_settings) {
                $temple = (object)[
                    'name' => 'Temple Management System',
                    'currency' => 'MYR'
                ];
            }else{
				$temple = [];
				foreach($system_settings as $ss){
					$temple[$ss->key] = $ss->value;
				}
				$temple = (object)$temple;
			}

            // Get fund details if specified
            $fund = null;
            if ($fundId) {
                $fund = Fund::find($fundId);
            }

            // Get Income Statement Data
            $data = $displayType == 'monthly' 
                ? $this->getMonthlyData($fromDate, $toDate, $fundId)
                : $this->getFullData($fromDate, $toDate, $fundId);

            // Generate filename
            $filename = 'income_statement_' . date('YmdHis');

            if ($format == 'pdf') {
                // Generate PDF
				/* return view('exports.income_statement_pdf', [
					'data' => $data,
					'displayType' => $displayType,
					'temple' => $temple,
					'fromDate' => $fromDate,
					'toDate' => $toDate,
					'fund' => $fund
				]); */
                $pdf = \PDF::loadView('exports.income_statement_pdf', [
                    'data' => $data,
                    'displayType' => $displayType,
                    'temple' => $temple,
                    'fromDate' => $fromDate,
                    'toDate' => $toDate,
                    'fund' => $fund
                ]);

                // Set paper size and orientation
                if ($displayType == 'monthly') {
                    $pdf->setPaper('a4', 'landscape');
                } else {
                    $pdf->setPaper('a4', 'portrait');
                }

                // Return PDF download response
                return $pdf->stream($filename . '.pdf');
                
            } else {
                // Generate Excel
                $export = new IncomeStatementExport(
                    $data,
                    $displayType,
                    $temple,
                    $fromDate,
                    $toDate,
                    $fund
                );

                return \Excel::download($export, $filename . '.xlsx');
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to export income statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}