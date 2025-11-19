<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\SupplierBalanceService;
use App\Models\PurchaseOrder;
use App\Models\PurchaseInvoice;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Models\GRN;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PurchaseReportController extends Controller
{
    protected $supplierBalanceService;

    public function __construct(SupplierBalanceService $supplierBalanceService)
    {
        $this->supplierBalanceService = $supplierBalanceService;
    }

    /**
     * Purchase Summary Report
     */
    public function purchaseSummary(Request $request)
    {
        try {
            $fromDate = $request->from_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $toDate = $request->to_date ?? Carbon::now()->endOfMonth()->format('Y-m-d');

            $summary = [
                'purchase_orders' => $this->getPurchaseOrderSummary($fromDate, $toDate),
                'invoices' => $this->getInvoiceSummary($fromDate, $toDate),
                'payments' => $this->getPaymentSummary($fromDate, $toDate),
                'grn' => $this->getGRNSummary($fromDate, $toDate),
                'period' => [
                    'from' => $fromDate,
                    'to' => $toDate
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $summary
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate purchase summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supplier-wise Purchase Report
     */
    public function supplierWiseReport(Request $request)
    {
        try {
            $fromDate = $request->from_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $toDate = $request->to_date ?? Carbon::now()->endOfMonth()->format('Y-m-d');

            $query = "
                SELECT 
                    s.id,
                    s.supplier_code,
                    s.name as supplier_name,
                    COUNT(DISTINCT po.id) as total_orders,
                    COUNT(DISTINCT pi.id) as total_invoices,
                    COALESCE(SUM(po.total_amount), 0) as total_po_amount,
                    COALESCE(SUM(pi.total_amount), 0) as total_invoice_amount,
                    COALESCE(SUM(pp.amount), 0) as total_paid,
                    s.current_balance
                FROM suppliers s
                LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
                    AND po.po_date BETWEEN :from_date1 AND :to_date1
                    AND po.status != 'CANCELLED'
                LEFT JOIN purchase_invoices pi ON s.id = pi.supplier_id 
                    AND pi.invoice_date BETWEEN :from_date2 AND :to_date2
                    AND pi.status != 'CANCELLED'
                LEFT JOIN purchase_payments pp ON s.id = pp.supplier_id 
                    AND pp.payment_date BETWEEN :from_date3 AND :to_date3
                    AND pp.status = 'COMPLETED'
                WHERE s.is_active = true
                GROUP BY s.id, s.supplier_code, s.name, s.current_balance
                HAVING COUNT(po.id) > 0 OR COUNT(pi.id) > 0 OR COUNT(pp.id) > 0
                ORDER BY total_invoice_amount DESC
            ";

            $suppliers = DB::select($query, [
                'from_date1' => $fromDate,
                'to_date1' => $toDate,
                'from_date2' => $fromDate,
                'to_date2' => $toDate,
                'from_date3' => $fromDate,
                'to_date3' => $toDate
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'suppliers' => $suppliers,
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'totals' => [
                        'total_suppliers' => count($suppliers),
                        'total_po_amount' => collect($suppliers)->sum('total_po_amount'),
                        'total_invoice_amount' => collect($suppliers)->sum('total_invoice_amount'),
                        'total_paid' => collect($suppliers)->sum('total_paid'),
                        'total_outstanding' => collect($suppliers)->sum('current_balance')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate supplier-wise report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Item-wise Purchase Report
     */
    public function itemWiseReport(Request $request)
    {
        try {
            $fromDate = $request->from_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $toDate = $request->to_date ?? Carbon::now()->endOfMonth()->format('Y-m-d');
            $itemType = $request->item_type; // 'product' or 'service'

            $query = "
                SELECT 
                    CASE 
                        WHEN poi.item_type = 'product' THEN p.name
                        WHEN poi.item_type = 'service' THEN srv.name
                    END as item_name,
                    CASE 
                        WHEN poi.item_type = 'product' THEN p.code
                        WHEN poi.item_type = 'service' THEN srv.code
                    END as item_code,
                    poi.item_type,
                    COUNT(DISTINCT po.id) as purchase_count,
                    SUM(poi.quantity) as total_quantity,
                    AVG(poi.unit_price) as avg_price,
                    MIN(poi.unit_price) as min_price,
                    MAX(poi.unit_price) as max_price,
                    SUM(poi.total_amount) as total_amount
                FROM purchase_order_items poi
                JOIN purchase_orders po ON poi.po_id = po.id
                LEFT JOIN products p ON poi.product_id = p.id
                LEFT JOIN services srv ON poi.service_id = srv.id
                WHERE po.po_date BETWEEN :from_date AND :to_date
                AND po.status != 'CANCELLED'
            ";

            if ($itemType) {
                $query .= " AND poi.item_type = :item_type";
            }

            $query .= " GROUP BY poi.item_type, item_name, item_code
                       ORDER BY total_amount DESC";

            $params = [
                'from_date' => $fromDate,
                'to_date' => $toDate
            ];

            if ($itemType) {
                $params['item_type'] = $itemType;
            }

            $items = DB::select($query, $params);

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $items,
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'summary' => [
                        'total_items' => count($items),
                        'total_amount' => collect($items)->sum('total_amount'),
                        'total_quantity' => collect($items)->sum('total_quantity')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate item-wise report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Payment Report
     */
    public function paymentReport(Request $request)
    {
        try {
            $fromDate = $request->from_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $toDate = $request->to_date ?? Carbon::now()->endOfMonth()->format('Y-m-d');
            $supplierId = $request->supplier_id;
            $paymentModeId = $request->payment_mode_id;

            $query = PurchasePayment::with(['supplier', 'invoice', 'paymentMode'])
                ->whereBetween('payment_date', [$fromDate, $toDate])
                ->where('status', 'COMPLETED');

            if ($supplierId) {
                $query->where('supplier_id', $supplierId);
            }

            if ($paymentModeId) {
                $query->where('payment_mode_id', $paymentModeId);
            }

            $payments = $query->orderBy('payment_date', 'desc')->get();

            // Group by payment mode
            $paymentsByMode = $payments->groupBy('payment_mode_id')->map(function($group) {
                return [
                    'mode' => $group->first()->paymentMode->name ?? 'Unknown',
                    'count' => $group->count(),
                    'total' => $group->sum('amount')
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'payments' => $payments,
                    'by_payment_mode' => $paymentsByMode,
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'summary' => [
                        'total_payments' => $payments->count(),
                        'total_amount' => $payments->sum('amount')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate payment report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supplier Statement
     */
    public function supplierStatement(Request $request, $supplierId)
    {
        try {
            $fromDate = $request->from_date;
            $toDate = $request->to_date;

            $statement = $this->supplierBalanceService->getSupplierStatement(
                $supplierId,
                $fromDate,
                $toDate
            );

            return response()->json([
                'success' => true,
                'data' => $statement
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate supplier statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aging Report
     */
    public function agingReport(Request $request)
    {
        try {
            $supplierId = $request->supplier_id;
            
            $agingData = $this->supplierBalanceService->getAgingReport($supplierId);

            return response()->json([
                'success' => true,
                'data' => $agingData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate aging report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pending Orders Report
     */
    public function pendingOrders(Request $request)
    {
        try {
            $query = PurchaseOrder::with(['supplier', 'items'])
                ->whereIn('status', ['APPROVED', 'PARTIAL_RECEIVED'])
                ->where(function($q) {
                    $q->where('grn_status', '!=', 'RECEIVED')
                      ->orWhere('invoice_status', '!=', 'INVOICED');
                });

            if ($request->supplier_id) {
                $query->where('supplier_id', $request->supplier_id);
            }

            $orders = $query->orderBy('po_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $orders,
                    'summary' => [
                        'total_orders' => $orders->count(),
                        'total_value' => $orders->sum('total_amount'),
                        'pending_delivery' => $orders->where('grn_status', '!=', 'RECEIVED')->count(),
                        'pending_invoice' => $orders->where('invoice_status', '!=', 'INVOICED')->count()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate pending orders report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Helper Methods
    private function getPurchaseOrderSummary($fromDate, $toDate)
    {
        return [
            'total' => PurchaseOrder::whereBetween('po_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->count(),
            'approved' => PurchaseOrder::whereBetween('po_date', [$fromDate, $toDate])
                ->where('status', 'APPROVED')
                ->count(),
            'pending' => PurchaseOrder::whereBetween('po_date', [$fromDate, $toDate])
                ->where('status', 'PENDING_APPROVAL')
                ->count(),
            'total_amount' => PurchaseOrder::whereBetween('po_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->sum('total_amount')
        ];
    }

    private function getInvoiceSummary($fromDate, $toDate)
    {
        return [
            'total' => PurchaseInvoice::whereBetween('invoice_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->count(),
            'posted' => PurchaseInvoice::whereBetween('invoice_date', [$fromDate, $toDate])
                ->where('status', 'POSTED')
                ->count(),
            'total_amount' => PurchaseInvoice::whereBetween('invoice_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->sum('total_amount'),
            'paid_amount' => PurchaseInvoice::whereBetween('invoice_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->sum('paid_amount'),
            'balance_amount' => PurchaseInvoice::whereBetween('invoice_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->sum(DB::raw('total_amount - paid_amount'))
        ];
    }

    private function getPaymentSummary($fromDate, $toDate)
    {
        return [
            'total' => PurchasePayment::whereBetween('payment_date', [$fromDate, $toDate])
                ->where('status', 'COMPLETED')
                ->count(),
            'total_amount' => PurchasePayment::whereBetween('payment_date', [$fromDate, $toDate])
                ->where('status', 'COMPLETED')
                ->sum('amount')
        ];
    }

    private function getGRNSummary($fromDate, $toDate)
    {
        return [
            'total' => GRN::whereBetween('grn_date', [$fromDate, $toDate])
                ->where('status', '!=', 'CANCELLED')
                ->count(),
            'completed' => GRN::whereBetween('grn_date', [$fromDate, $toDate])
                ->where('status', 'COMPLETED')
                ->count()
        ];
    }
}