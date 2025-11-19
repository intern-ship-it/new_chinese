<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PurchaseRequest;
use App\Models\PurchaseOrder;
use App\Models\PurchaseInvoice;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Models\GRN;
use App\Services\PurchaseApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PurchaseDashboardController extends Controller
{
    protected $approvalService;

    public function __construct(PurchaseApprovalService $approvalService)
    {
        $this->approvalService = $approvalService;
    }

    /**
     * Get purchase dashboard statistics
     */
    public function getStats(Request $request)
    {
        try {
            $period = $request->get('period', 'month'); // 'today', 'week', 'month', 'year'
            $dateRange = $this->getDateRange($period);

            $stats = [
                'overview' => $this->getOverviewStats($dateRange),
                'purchase_orders' => $this->getPurchaseOrderStats($dateRange),
                'invoices' => $this->getInvoiceStats($dateRange),
                'payments' => $this->getPaymentStats($dateRange),
                'suppliers' => $this->getSupplierStats(),
                'pending_tasks' => $this->getPendingTasks(),
                'charts' => [
                    'monthly_purchases' => $this->getMonthlyPurchaseChart(),
                    'top_suppliers' => $this->getTopSuppliersChart(),
                    'payment_modes' => $this->getPaymentModesChart($dateRange),
                    'category_breakdown' => $this->getCategoryBreakdown($dateRange)
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent purchase activities
     */
    public function getRecentActivities(Request $request)
    {
        try {
            $limit = $request->get('limit', 10);
            $activities = [];

            // Recent Purchase Orders
            $recentPOs = PurchaseOrder::with('supplier')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            foreach ($recentPOs as $po) {
                $activities[] = [
                    'type' => 'purchase_order',
                    'icon' => 'shopping-cart',
                    'color' => 'primary',
                    'title' => "Purchase Order #{$po->po_number}",
                    'description' => "Created for {$po->supplier->name}",
                    'amount' => $po->total_amount,
                    'date' => $po->created_at,
                    'status' => $po->status
                ];
            }

            // Recent Payments
            $recentPayments = PurchasePayment::with('supplier')
                ->where('status', 'COMPLETED')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            foreach ($recentPayments as $payment) {
                $activities[] = [
                    'type' => 'payment',
                    'icon' => 'credit-card',
                    'color' => 'success',
                    'title' => "Payment #{$payment->payment_number}",
                    'description' => "Paid to {$payment->supplier->name}",
                    'amount' => $payment->amount,
                    'date' => $payment->created_at,
                    'status' => $payment->status
                ];
            }

            // Recent GRNs
            $recentGRNs = GRN::with('supplier')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            foreach ($recentGRNs as $grn) {
                $activities[] = [
                    'type' => 'grn',
                    'icon' => 'package',
                    'color' => 'info',
                    'title' => "GRN #{$grn->grn_number}",
                    'description' => "Received from {$grn->supplier->name}",
                    'date' => $grn->created_at,
                    'status' => $grn->status
                ];
            }

            // Sort by date and limit
            $activities = collect($activities)
                ->sortByDesc('date')
                ->take($limit)
                ->values();

            return response()->json([
                'success' => true,
                'data' => $activities
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent activities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending approvals for current user
     */
    public function getPendingApprovals(Request $request)
    {
        try {
            $pendingApprovals = $this->approvalService->getPendingApprovals(Auth::id());

            return response()->json([
                'success' => true,
                'data' => $pendingApprovals
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending approvals',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Helper Methods
    private function getDateRange($period)
    {
        switch ($period) {
            case 'today':
                return [
                    'from' => Carbon::today(),
                    'to' => Carbon::today()->endOfDay()
                ];
            case 'week':
                return [
                    'from' => Carbon::now()->startOfWeek(),
                    'to' => Carbon::now()->endOfWeek()
                ];
            case 'month':
                return [
                    'from' => Carbon::now()->startOfMonth(),
                    'to' => Carbon::now()->endOfMonth()
                ];
            case 'year':
                return [
                    'from' => Carbon::now()->startOfYear(),
                    'to' => Carbon::now()->endOfYear()
                ];
            default:
                return [
                    'from' => Carbon::now()->startOfMonth(),
                    'to' => Carbon::now()->endOfMonth()
                ];
        }
    }

    private function getOverviewStats($dateRange)
    {
        return [
            'total_purchase_value' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', '!=', 'CANCELLED')
                ->sum('total_amount'),
            'total_invoiced' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', '!=', 'CANCELLED')
                ->sum('total_amount'),
            'total_paid' => PurchasePayment::whereBetween('payment_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'COMPLETED')
                ->sum('amount'),
            'outstanding_balance' => PurchaseInvoice::where('status', 'POSTED')
                ->where('payment_status', '!=', 'PAID')
                ->sum(DB::raw('total_amount - paid_amount'))
        ];
    }

    private function getPurchaseOrderStats($dateRange)
    {
        return [
            'total' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])->count(),
            'draft' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'DRAFT')->count(),
            'pending_approval' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'PENDING_APPROVAL')->count(),
            'approved' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'APPROVED')->count(),
            'received' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])
                ->where('grn_status', 'RECEIVED')->count(),
            'partial_received' => PurchaseOrder::whereBetween('po_date', [$dateRange['from'], $dateRange['to']])
                ->where('grn_status', 'PARTIAL')->count()
        ];
    }

    private function getInvoiceStats($dateRange)
    {
        return [
            'total' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])->count(),
            'draft' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'DRAFT')->count(),
            'posted' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'POSTED')->count(),
            'unpaid' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])
                ->where('payment_status', 'UNPAID')->count(),
            'partial_paid' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])
                ->where('payment_status', 'PARTIAL')->count(),
            'paid' => PurchaseInvoice::whereBetween('invoice_date', [$dateRange['from'], $dateRange['to']])
                ->where('payment_status', 'PAID')->count(),
            'overdue' => PurchaseInvoice::where('status', 'POSTED')
                ->where('payment_status', '!=', 'PAID')
                ->where('payment_due_date', '<', Carbon::today())
                ->count()
        ];
    }

    private function getPaymentStats($dateRange)
    {
        $payments = PurchasePayment::whereBetween('payment_date', [$dateRange['from'], $dateRange['to']])
            ->where('status', 'COMPLETED')
            ->get();

        return [
            'total_count' => $payments->count(),
            'total_amount' => $payments->sum('amount'),
            'average_payment' => $payments->avg('amount'),
            'by_mode' => PurchasePayment::whereBetween('payment_date', [$dateRange['from'], $dateRange['to']])
                ->where('status', 'COMPLETED')
                ->select('payment_mode_id', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
                ->groupBy('payment_mode_id')
                ->with('paymentMode')
                ->get()
        ];
    }

    private function getSupplierStats()
    {
        return [
            'total_active' => Supplier::where('is_active', true)->count(),
            'new_this_month' => Supplier::where('created_at', '>=', Carbon::now()->startOfMonth())->count(),
            'with_outstanding' => Supplier::where('current_balance', '>', 0)->count(),
            'total_outstanding' => Supplier::where('is_active', true)->sum('current_balance')
        ];
    }

    private function getPendingTasks()
    {
        $user = Auth::user();
        $tasks = [];

        // Pending PR Approvals
        $pendingPRs = PurchaseRequest::where('status', 'SUBMITTED')->count();
        if ($pendingPRs > 0 && in_array($user->user_type, ['ADMIN', 'SUPER_ADMIN'])) {
            $tasks[] = [
                'type' => 'pr_approval',
                'count' => $pendingPRs,
                'title' => 'Purchase Requests awaiting approval',
                'url' => '/purchase/requests?status=SUBMITTED'
            ];
        }

        // Pending PO Approvals
        $pendingPOs = PurchaseOrder::where('status', 'PENDING_APPROVAL')->count();
        if ($pendingPOs > 0 && in_array($user->user_type, ['ADMIN', 'SUPER_ADMIN'])) {
            $tasks[] = [
                'type' => 'po_approval',
                'count' => $pendingPOs,
                'title' => 'Purchase Orders awaiting approval',
                'url' => '/purchase/orders?status=PENDING_APPROVAL'
            ];
        }

        // Pending GRNs
        $pendingGRNs = PurchaseOrder::where('status', 'APPROVED')
            ->where('grn_status', 'PENDING')
            ->count();
        if ($pendingGRNs > 0) {
            $tasks[] = [
                'type' => 'pending_grn',
                'count' => $pendingGRNs,
                'title' => 'Purchase Orders awaiting goods receipt',
                'url' => '/purchase/grn/pending'
            ];
        }

        // Overdue Payments
        $overduePayments = PurchaseInvoice::where('status', 'POSTED')
            ->where('payment_status', '!=', 'PAID')
            ->where('payment_due_date', '<', Carbon::today())
            ->count();
        if ($overduePayments > 0) {
            $tasks[] = [
                'type' => 'overdue_payments',
                'count' => $overduePayments,
                'title' => 'Overdue payments',
                'url' => '/purchase/invoices?status=overdue'
            ];
        }

        return $tasks;
    }

    private function getMonthlyPurchaseChart()
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $months[] = [
                'month' => $date->format('M Y'),
                'orders' => PurchaseOrder::whereMonth('po_date', $date->month)
                    ->whereYear('po_date', $date->year)
                    ->where('status', '!=', 'CANCELLED')
                    ->sum('total_amount'),
                'payments' => PurchasePayment::whereMonth('payment_date', $date->month)
                    ->whereYear('payment_date', $date->year)
                    ->where('status', 'COMPLETED')
                    ->sum('amount')
            ];
        }
        return $months;
    }

    private function getTopSuppliersChart()
    {
        return Supplier::select('suppliers.*')
            ->selectRaw('(SELECT SUM(total_amount) FROM purchase_invoices WHERE supplier_id = suppliers.id AND status != "CANCELLED") as total_purchases')
            ->where('is_active', true)
            ->orderByDesc('total_purchases')
            ->limit(5)
            ->get(['id', 'name', 'supplier_code', 'total_purchases']);
    }

    private function getPaymentModesChart($dateRange)
    {
        return DB::table('purchase_payments as pp')
            ->join('payment_modes as pm', 'pp.payment_mode_id', '=', 'pm.id')
            ->whereBetween('pp.payment_date', [$dateRange['from'], $dateRange['to']])
            ->where('pp.status', 'COMPLETED')
            ->select('pm.name', DB::raw('COUNT(*) as count'), DB::raw('SUM(pp.amount) as total'))
            ->groupBy('pm.id', 'pm.name')
            ->get();
    }

    private function getCategoryBreakdown($dateRange)
    {
        return DB::table('purchase_order_items as poi')
            ->join('purchase_orders as po', 'poi.po_id', '=', 'po.id')
            ->whereBetween('po.po_date', [$dateRange['from'], $dateRange['to']])
            ->where('po.status', '!=', 'CANCELLED')
            ->select('poi.item_type', DB::raw('COUNT(DISTINCT po.id) as order_count'), DB::raw('SUM(poi.total_amount) as total'))
            ->groupBy('poi.item_type')
            ->get();
    }
}