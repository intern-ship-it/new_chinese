<?php
// app/Http/Controllers/ManufacturingReportsController.php

namespace App\Http\Controllers;

use App\Models\ManufacturingOrder;
use App\Models\ManufacturingCostHistory;
use App\Models\BomMaster;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Illuminate\Support\Facades\Storage;


class ManufacturingReportsController extends Controller
{
    /**
     * Manufacturing Dashboard Analytics
     */
    public function dashboard(Request $request)
    {

        try {
            $startDate = $request->start_date ?? Carbon::now()->subMonth()->format('Y-m-d');
            $endDate = $request->end_date ?? Carbon::now()->format('Y-m-d');

            // Key Metrics
            $metrics = [
                'total_orders' => ManufacturingOrder::whereBetween('created_at', [$startDate, $endDate])->count(),
                'completed_orders' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->count(),
                'in_progress_orders' => ManufacturingOrder::where('status', 'IN_PROGRESS')->count(),
                'total_production_value' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->sum('total_cost'),
                'average_production_time' => $this->calculateAverageProductionTime($startDate, $endDate),
                'production_efficiency' => $this->calculateProductionEfficiency($startDate, $endDate),
            ];

            // Top Manufactured Products
            $topProducts = ManufacturingOrder::select(
                'product_id',
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(quantity_produced) as total_quantity'),
                DB::raw('SUM(total_cost) as total_value')
            )
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate])
                ->groupBy('product_id')
                ->orderBy('total_quantity', 'desc')
                ->limit(10)
                ->with('product')
                ->get();

            // Production Trend (Daily/Weekly/Monthly)
            $productionTrend = $this->getProductionTrend($startDate, $endDate);

            // Cost Analysis
            $costAnalysis = [
                'material_cost' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->sum('material_cost'),
                'labor_cost' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->sum('labor_cost'),
                'overhead_cost' => ManufacturingOrder::where('status', 'COMPLETED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->sum('overhead_cost'),
            ];

            // Quality Metrics
            $qualityMetrics = [
                'passed_quality_checks' => ManufacturingOrder::where('quality_status', 'PASSED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->count(),
                'failed_quality_checks' => ManufacturingOrder::where('quality_status', 'FAILED')
                    ->whereBetween('completed_date', [$startDate, $endDate])
                    ->count(),
                'quality_pass_rate' => $this->calculateQualityPassRate($startDate, $endDate),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'metrics' => $metrics,
                    'top_products' => $topProducts,
                    'production_trend' => $productionTrend,
                    'cost_analysis' => $costAnalysis,
                    'quality_metrics' => $qualityMetrics,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manufacturing Cost Analysis Report
     */
    public function costAnalysis(Request $request)
    {
        try {
            $startDate = $request->start_date ?? Carbon::now()->subMonth()->format('Y-m-d');
            $endDate = $request->end_date ?? Carbon::now()->format('Y-m-d');
            $productId = $request->product_id;
            $warehouseId = $request->warehouse_id;

            $query = ManufacturingCostHistory::with(['product', 'manufacturingOrder']);

            if ($productId) {
                $query->where('product_id', $productId);
            }

            if ($warehouseId) {
                $query->whereHas('manufacturingOrder', function ($q) use ($warehouseId) {
                    $q->where('warehouse_id', $warehouseId);
                });
            }

            $costData = $query->get();

            // Group by product for analysis
            $productCostAnalysis = $costData->groupBy('product_id')->map(function ($items, $productId) {
                $product = Product::find($productId);

                return [
                    'product' => $product ? $product->name : 'Unknown',
                    'product_code' => $product ? $product->product_code : '',
                    'total_quantity_produced' => $items->sum('quantity_produced'),
                    'total_material_cost' => $items->sum('material_cost'),
                    'total_labor_cost' => $items->sum('labor_cost'),
                    'total_overhead_cost' => $items->sum('overhead_cost'),
                    'total_cost' => $items->sum('total_cost'),
                    'average_unit_cost' => $items->avg('unit_cost'),
                    'min_unit_cost' => $items->min('unit_cost'),
                    'max_unit_cost' => $items->max('unit_cost'),
                    'production_count' => $items->count(),
                    'cost_trend' => $this->calculateCostTrend($items),
                ];
            });

            // Overall summary
            $summary = [
                'total_production_cost' => $costData->sum('total_cost'),
                'total_material_cost' => $costData->sum('material_cost'),
                'total_labor_cost' => $costData->sum('labor_cost'),
                'total_overhead_cost' => $costData->sum('overhead_cost'),
                'total_quantity_produced' => $costData->sum('quantity_produced'),
                'average_batch_cost' => $costData->avg('total_cost'),
                'cost_breakdown' => [
                    'material_percentage' => $costData->sum('total_cost') > 0
                        ? ($costData->sum('material_cost') / $costData->sum('total_cost')) * 100
                        : 0,
                    'labor_percentage' => $costData->sum('total_cost') > 0
                        ? ($costData->sum('labor_cost') / $costData->sum('total_cost')) * 100
                        : 0,
                    'overhead_percentage' => $costData->sum('total_cost') > 0
                        ? ($costData->sum('overhead_cost') / $costData->sum('total_cost')) * 100
                        : 0,
                ],
            ];

            // Cost comparison with BOM
            $costComparison = $this->compareCostWithBOM($productCostAnalysis);

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'product_analysis' => $productCostAnalysis->values(),
                    'cost_comparison' => $costComparison,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate cost analysis report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Raw Material Consumption Report
     */
    public function rawMaterialConsumption(Request $request)
    {
        try {
            $startDate = $request->start_date ?? Carbon::now()->subMonth()->format('Y-m-d');
            $endDate = $request->end_date ?? Carbon::now()->format('Y-m-d');
            $rawMaterialId = $request->raw_material_id;
            $warehouseId = $request->warehouse_id;

            // Get all manufacturing order items for the period
            $query = DB::table('manufacturing_order_items as moi')
                ->join('manufacturing_orders as mo', 'moi.manufacturing_order_id', '=', 'mo.id')
                ->join('products as p', 'moi.raw_material_id', '=', 'p.id')
                ->join('uoms as u', 'moi.uom_id', '=', 'u.id')
                ->where('mo.status', 'COMPLETED')
                ->whereBetween('mo.completed_date', [$startDate, $endDate])
                ->select(
                    'moi.raw_material_id',
                    'p.product_code',
                    'p.name as raw_material_name',
                    'u.uom_short',
                    DB::raw('SUM(moi.consumed_quantity) as total_consumed'),
                    DB::raw('COUNT(DISTINCT mo.id) as production_count'),
                    DB::raw('SUM(moi.total_cost) as total_cost'),
                    DB::raw('AVG(moi.unit_cost) as avg_unit_cost')
                );

            if ($rawMaterialId) {
                $query->where('moi.raw_material_id', $rawMaterialId);
            }

            if ($warehouseId) {
                $query->where('mo.warehouse_id', $warehouseId);
            }

            $consumptionData = $query->groupBy('moi.raw_material_id', 'p.product_code', 'p.name', 'u.uom_short')
                ->orderBy('total_consumed', 'desc')
                ->get();

            // Get top consuming products for each raw material
            $topConsumingProducts = [];
            foreach ($consumptionData as $material) {
                $topProducts = DB::table('manufacturing_order_items as moi')
                    ->join('manufacturing_orders as mo', 'moi.manufacturing_order_id', '=', 'mo.id')
                    ->join('products as p', 'mo.product_id', '=', 'p.id')
                    ->where('moi.raw_material_id', $material->raw_material_id)
                    ->where('mo.status', 'COMPLETED')
                    ->whereBetween('mo.completed_date', [$startDate, $endDate])
                    ->select(
                        'mo.product_id',
                        'p.name as product_name',
                        DB::raw('SUM(moi.consumed_quantity) as quantity_used'),
                        DB::raw('COUNT(DISTINCT mo.id) as times_used')
                    )
                    ->groupBy('mo.product_id', 'p.name')
                    ->orderBy('quantity_used', 'desc')
                    ->limit(5)
                    ->get();

                $topConsumingProducts[$material->raw_material_id] = $topProducts;
            }

            // Calculate consumption trends
            $consumptionTrend = $this->getRawMaterialConsumptionTrend($startDate, $endDate, $rawMaterialId);

            // Stock impact analysis
            $stockImpact = $this->analyzeStockImpact($consumptionData, $warehouseId);

            // Summary statistics
            $summary = [
                'total_materials_consumed' => $consumptionData->count(),
                'total_consumption_value' => $consumptionData->sum('total_cost'),
                'most_consumed_material' => $consumptionData->first(),
                'average_consumption_per_material' => $consumptionData->avg('total_consumed'),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'consumption_data' => $consumptionData,
                    'top_consuming_products' => $topConsumingProducts,
                    'consumption_trend' => $consumptionTrend,
                    'stock_impact' => $stockImpact,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate raw material consumption report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Production Efficiency Report
     */
    public function productionEfficiency(Request $request)
    {
        try {
            $startDate = $request->start_date ?? Carbon::now()->subMonth()->format('Y-m-d');
            $endDate = $request->end_date ?? Carbon::now()->format('Y-m-d');
            $productId = $request->product_id;
            $warehouseId = $request->warehouse_id;

            $query = ManufacturingOrder::with(['product', 'bomMaster', 'warehouse'])
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate]);

            if ($productId) {
                $query->where('product_id', $productId);
            }

            if ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            }

            $orders = $query->get();

            // Calculate efficiency metrics
            $efficiencyData = $orders->map(function ($order) {
                $scheduledTime = Carbon::parse($order->scheduled_date);
                $completedTime = Carbon::parse($order->completed_date);
                $actualProductionDays = $scheduledTime->diffInDays($completedTime);

                // Calculate efficiency score
                $plannedQty = $order->quantity_to_produce;
                $actualQty = $order->quantity_produced;
                $quantityEfficiency = $plannedQty > 0 ? ($actualQty / $plannedQty) * 100 : 0;

                // Cost efficiency
                $bomCost = $order->bomMaster ? $order->bomMaster->total_cost : 0;
                $actualCost = $order->total_cost;
                $costEfficiency = $bomCost > 0 ? ($bomCost / $actualCost) * 100 : 0;

                return [
                    'order_number' => $order->order_number,
                    'product' => $order->product->name,
                    'product_code' => $order->product->product_code,
                    'planned_quantity' => $plannedQty,
                    'actual_quantity' => $actualQty,
                    'quantity_efficiency' => round($quantityEfficiency, 2),
                    'planned_cost' => $bomCost * $plannedQty,
                    'actual_cost' => $actualCost,
                    'cost_efficiency' => round($costEfficiency, 2),
                    'production_days' => $actualProductionDays,
                    'on_time' => $completedTime->lte($scheduledTime),
                    'quality_passed' => $order->quality_status === 'PASSED',
                ];
            });

            // Group by product for product-wise efficiency
            $productEfficiency = $efficiencyData->groupBy('product')->map(function ($items, $product) {
                return [
                    'product' => $product,
                    'total_orders' => $items->count(),
                    'avg_quantity_efficiency' => round($items->avg('quantity_efficiency'), 2),
                    'avg_cost_efficiency' => round($items->avg('cost_efficiency'), 2),
                    'on_time_delivery_rate' => round(($items->where('on_time', true)->count() / $items->count()) * 100, 2),
                    'quality_pass_rate' => round(($items->where('quality_passed', true)->count() / $items->count()) * 100, 2),
                    'total_quantity_produced' => $items->sum('actual_quantity'),
                    'total_production_cost' => $items->sum('actual_cost'),
                ];
            });

            // Overall efficiency metrics
            $overallMetrics = [
                'total_orders' => $efficiencyData->count(),
                'average_quantity_efficiency' => round($efficiencyData->avg('quantity_efficiency'), 2),
                'average_cost_efficiency' => round($efficiencyData->avg('cost_efficiency'), 2),
                'on_time_completion_rate' => $efficiencyData->count() > 0
                    ? round(($efficiencyData->where('on_time', true)->count() / $efficiencyData->count()) * 100, 2)
                    : 0,
                'quality_pass_rate' => $efficiencyData->count() > 0
                    ? round(($efficiencyData->where('quality_passed', true)->count() / $efficiencyData->count()) * 100, 2)
                    : 0,
                'total_production_value' => $efficiencyData->sum('actual_cost'),
                'average_production_days' => round($efficiencyData->avg('production_days'), 1),
            ];

            // Efficiency trends over time
            $efficiencyTrend = $this->getEfficiencyTrend($orders, $startDate, $endDate);

            // Bottleneck analysis
            $bottlenecks = $this->identifyBottlenecks($orders);

            return response()->json([
                'success' => true,
                'data' => [
                    'overall_metrics' => $overallMetrics,
                    'product_efficiency' => $productEfficiency->values(),
                    'order_details' => $efficiencyData,
                    'efficiency_trend' => $efficiencyTrend,
                    'bottlenecks' => $bottlenecks,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate production efficiency report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * BOM Cost Comparison Report
     */
    public function bomCostComparison(Request $request)
    {
        try {
            $productId = $request->product_id;

            $query = BomMaster::with(['product', 'details.rawMaterial', 'details.uom']);

            if ($productId) {
                $query->where('product_id', $productId);
            }

            $boms = $query->get();

            $comparison = $boms->map(function ($bom) {
                // Get actual production costs
                $actualCosts = ManufacturingCostHistory::where('product_id', $bom->product_id)
                    ->where('created_at', '>=', Carbon::now()->subMonths(3))
                    ->get();

                $avgActualCost = $actualCosts->avg('unit_cost') ?? 0;
                $bomUnitCost = $bom->output_quantity > 0 ? $bom->total_cost / $bom->output_quantity : 0;
                $variance = $avgActualCost - $bomUnitCost;
                $variancePercentage = $bomUnitCost > 0 ? ($variance / $bomUnitCost) * 100 : 0;

                return [
                    'bom_code' => $bom->bom_code,
                    'product' => $bom->product->name,
                    'bom_unit_cost' => $bomUnitCost,
                    'actual_avg_cost' => $avgActualCost,
                    'variance' => $variance,
                    'variance_percentage' => round($variancePercentage, 2),
                    'status' => $bom->status,
                    'material_cost' => $bom->details->sum('total_cost'),
                    'labor_cost' => $bom->labor_cost,
                    'overhead_cost' => $bom->overhead_cost,
                    'total_bom_cost' => $bom->total_cost,
                    'production_count' => $actualCosts->count(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $comparison
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate BOM cost comparison',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manufacturing Summary Report
     */
    public function manufacturingSummary(Request $request)
    {
        try {
            $startDate = $request->start_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
            $endDate = $request->end_date ?? Carbon::now()->format('Y-m-d');

            // Production Summary
            $productionSummary = ManufacturingOrder::select(
                'product_id',
                DB::raw('COUNT(*) as total_orders'),
                DB::raw('SUM(CASE WHEN status = \'COMPLETED\' THEN 1 ELSE 0 END) as completed_orders'),
                DB::raw('SUM(CASE WHEN status = \'CANCELLED\' THEN 1 ELSE 0 END) as cancelled_orders'),
                DB::raw('SUM(quantity_produced) as total_quantity'),
                DB::raw('SUM(total_cost) as total_cost'),
                DB::raw('AVG(total_cost) as avg_cost')
            )
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('product_id')
                ->with('product')
                ->get();

            // Raw Material Usage Summary
            $materialUsage = DB::table('manufacturing_order_items as moi')
                ->join('manufacturing_orders as mo', 'moi.manufacturing_order_id', '=', 'mo.id')
                ->join('products as p', 'moi.raw_material_id', '=', 'p.id')
                ->where('mo.status', 'COMPLETED')
                ->whereBetween('mo.completed_date', [$startDate, $endDate])
                ->select(
                    'p.name as material_name',
                    DB::raw('SUM(moi.consumed_quantity) as total_consumed'),
                    DB::raw('SUM(moi.total_cost) as total_cost')
                )
                ->groupBy('moi.raw_material_id', 'p.name')
                ->orderBy('total_cost', 'desc')
                ->limit(20)
                ->get();

            // Warehouse-wise Production
            $warehouseProduction = ManufacturingOrder::select(
                'warehouse_id',
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(quantity_produced) as total_quantity'),
                DB::raw('SUM(total_cost) as total_cost')
            )
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate])
                ->groupBy('warehouse_id')
                ->with('warehouse')
                ->get();

            // Monthly Trend - PostgreSQL version
            $monthlyTrend = ManufacturingOrder::select(
                DB::raw('TO_CHAR(completed_date, \'YYYY-MM\') as month'),
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(quantity_produced) as total_quantity'),
                DB::raw('SUM(total_cost) as total_cost')
            )
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate])
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'production_summary' => $productionSummary,
                    'material_usage' => $materialUsage,
                    'warehouse_production' => $warehouseProduction,
                    'monthly_trend' => $monthlyTrend,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate manufacturing summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }



    /**
     * Helper Methods
     */

    private function calculateAverageProductionTime($startDate, $endDate)
    {
        $orders = ManufacturingOrder::where('status', 'COMPLETED')
            ->whereBetween('completed_date', [$startDate, $endDate])
            ->get();

        if ($orders->isEmpty()) {
            return 0;
        }

        $totalDays = 0;
        foreach ($orders as $order) {
            if ($order->started_date && $order->completed_date) {
                $totalDays += Carbon::parse($order->started_date)->diffInDays(Carbon::parse($order->completed_date));
            }
        }

        return round($totalDays / $orders->count(), 1);
    }

    private function calculateProductionEfficiency($startDate, $endDate)
    {
        $orders = ManufacturingOrder::where('status', 'COMPLETED')
            ->whereBetween('completed_date', [$startDate, $endDate])
            ->get();

        if ($orders->isEmpty()) {
            return 0;
        }

        $totalEfficiency = 0;
        foreach ($orders as $order) {
            if ($order->quantity_to_produce > 0) {
                $efficiency = ($order->quantity_produced / $order->quantity_to_produce) * 100;
                $totalEfficiency += $efficiency;
            }
        }

        return round($totalEfficiency / $orders->count(), 2);
    }

    private function calculateQualityPassRate($startDate, $endDate)
    {
        $total = ManufacturingOrder::where('quality_check_required', true)
            ->whereBetween('completed_date', [$startDate, $endDate])
            ->count();

        if ($total === 0) {
            return 100;
        }

        $passed = ManufacturingOrder::where('quality_check_required', true)
            ->where('quality_status', 'PASSED')
            ->whereBetween('completed_date', [$startDate, $endDate])
            ->count();

        return round(($passed / $total) * 100, 2);
    }

    private function getProductionTrend($startDate, $endDate)
    {
        $days = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate));

        if ($days <= 31) {
            // Daily trend - PostgreSQL version
            return ManufacturingOrder::select(
                DB::raw('DATE(completed_date) as date'),
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(quantity_produced) as quantity'),
                DB::raw('SUM(total_cost) as cost')
            )
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate])
                ->groupBy('date')
                ->orderBy('date')
                ->get();
        } elseif ($days <= 90) {
            // Weekly trend - PostgreSQL version
            return ManufacturingOrder::select(
                DB::raw('DATE_TRUNC(\'week\', completed_date) as week'),
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(quantity_produced) as quantity'),
                DB::raw('SUM(total_cost) as cost')
            )
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate])
                ->groupBy('week')
                ->orderBy('week')
                ->get();
        } else {
            // Monthly trend - PostgreSQL version
            return ManufacturingOrder::select(
                DB::raw('TO_CHAR(completed_date, \'YYYY-MM\') as month'),
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(quantity_produced) as quantity'),
                DB::raw('SUM(total_cost) as cost')
            )
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_date', [$startDate, $endDate])
                ->groupBy('month')
                ->orderBy('month')
                ->get();
        }
    }

    private function calculateCostTrend($items)
    {
        $trend = $items->sortBy('production_date')->values();

        if ($trend->count() < 2) {
            return 'stable';
        }

        $firstHalf = $trend->take($trend->count() / 2)->avg('unit_cost');
        $secondHalf = $trend->skip($trend->count() / 2)->avg('unit_cost');

        $change = (($secondHalf - $firstHalf) / $firstHalf) * 100;

        if ($change > 5) {
            return 'increasing';
        } elseif ($change < -5) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    private function compareCostWithBOM($productCostAnalysis)
    {
        $comparison = [];

        foreach ($productCostAnalysis as $productId => $analysis) {
            $bom = BomMaster::where('product_id', $productId)
                ->where('status', 'ACTIVE')
                ->first();

            if ($bom) {
                $bomUnitCost = $bom->output_quantity > 0 ? $bom->total_cost / $bom->output_quantity : 0;
                $actualAvgCost = $analysis['average_unit_cost'];

                $comparison[] = [
                    'product' => $analysis['product'],
                    'bom_unit_cost' => $bomUnitCost,
                    'actual_avg_cost' => $actualAvgCost,
                    'variance' => $actualAvgCost - $bomUnitCost,
                    'variance_percentage' => $bomUnitCost > 0
                        ? round((($actualAvgCost - $bomUnitCost) / $bomUnitCost) * 100, 2)
                        : 0,
                ];
            }
        }

        return $comparison;
    }

    private function getRawMaterialConsumptionTrend($startDate, $endDate, $rawMaterialId = null)
    {
        // PostgreSQL version using TO_CHAR instead of DATE_FORMAT
        $query = DB::table('manufacturing_order_items as moi')
            ->join('manufacturing_orders as mo', 'moi.manufacturing_order_id', '=', 'mo.id')
            ->select(
                DB::raw('TO_CHAR(mo.completed_date, \'YYYY-MM\') as month'),
                DB::raw('SUM(moi.consumed_quantity) as quantity'),
                DB::raw('SUM(moi.total_cost) as cost')
            )
            ->where('mo.status', 'COMPLETED')
            ->whereBetween('mo.completed_date', [$startDate, $endDate]);

        if ($rawMaterialId) {
            $query->where('moi.raw_material_id', $rawMaterialId);
        }

        return $query->groupBy('month')
            ->orderBy('month')
            ->get();
    }

    private function analyzeStockImpact($consumptionData, $warehouseId = null)
    {
        $impact = [];

        foreach ($consumptionData as $material) {
            $query = ProductStock::where('product_id', $material->raw_material_id);

            if ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            }

            $stock = $query->first();

            if ($stock) {
                $monthlyConsumption = $material->total_consumed /
                    (Carbon::now()->diffInMonths(Carbon::now()->subMonth()) ?: 1);

                $monthsOfStock = $stock->quantity > 0
                    ? $stock->quantity / $monthlyConsumption
                    : 0;

                $impact[] = [
                    'material' => $material->raw_material_name,
                    'current_stock' => $stock->quantity,
                    'monthly_consumption' => round($monthlyConsumption, 2),
                    'months_of_stock' => round($monthsOfStock, 1),
                    'reorder_required' => $monthsOfStock < 1,
                ];
            }
        }

        return $impact;
    }

    private function getEfficiencyTrend($orders, $startDate, $endDate)
    {
        return $orders->groupBy(function ($order) {
            return Carbon::parse($order->completed_date)->format('Y-m');
        })->map(function ($items, $month) {
            $quantityEfficiency = $items->map(function ($order) {
                return $order->quantity_to_produce > 0
                    ? ($order->quantity_produced / $order->quantity_to_produce) * 100
                    : 0;
            })->avg();

            return [
                'month' => $month,
                'efficiency' => round($quantityEfficiency, 2),
                'order_count' => $items->count(),
            ];
        });
    }

    private function identifyBottlenecks($orders)
    {
        $bottlenecks = [];

        // Identify products with low efficiency
        $productEfficiency = $orders->groupBy('product_id')->map(function ($items, $productId) {
            $avgEfficiency = $items->map(function ($order) {
                return $order->quantity_to_produce > 0
                    ? ($order->quantity_produced / $order->quantity_to_produce) * 100
                    : 0;
            })->avg();

            return [
                'product_id' => $productId,
                'efficiency' => $avgEfficiency,
                'order_count' => $items->count(),
            ];
        })->filter(function ($item) {
            return $item['efficiency'] < 80; // Less than 80% efficiency
        });

        foreach ($productEfficiency as $item) {
            $product = Product::find($item['product_id']);
            $bottlenecks[] = [
                'type' => 'low_efficiency',
                'product' => $product ? $product->name : 'Unknown',
                'efficiency' => round($item['efficiency'], 2),
                'recommendation' => 'Review BOM and production process for this product',
            ];
        }

        // Identify quality issues
        $qualityIssues = $orders->filter(function ($order) {
            return $order->quality_status === 'FAILED';
        })->groupBy('product_id')->map(function ($items, $productId) {
            return [
                'product_id' => $productId,
                'failed_count' => $items->count(),
            ];
        });

        foreach ($qualityIssues as $item) {
            $product = Product::find($item['product_id']);
            $bottlenecks[] = [
                'type' => 'quality_issues',
                'product' => $product ? $product->name : 'Unknown',
                'failed_count' => $item['failed_count'],
                'recommendation' => 'Review quality control process and raw material quality',
            ];
        }

        return $bottlenecks;
    }
    public function exportReport(Request $request, $reportType)
    {
        try {
            $format = $request->format ?? 'xlsx';

            // Get report data based on type
            $reportData = null;
            $reportTitle = '';

            switch ($reportType) {
                case 'cost-analysis':
                    $response = $this->costAnalysis($request);
                    $reportData = json_decode($response->getContent(), true)['data'];
                    $reportTitle = 'Cost Analysis Report';
                    break;

                case 'material-consumption':
                    $response = $this->rawMaterialConsumption($request);
                    $reportData = json_decode($response->getContent(), true)['data'];
                    $reportTitle = 'Material Consumption Report';
                    break;

                case 'production-efficiency':
                    $response = $this->productionEfficiency($request);
                    $reportData = json_decode($response->getContent(), true)['data'];
                    $reportTitle = 'Production Efficiency Report';
                    break;

                case 'manufacturing-summary':
                    $response = $this->manufacturingSummary($request);
                    $reportData = json_decode($response->getContent(), true)['data'];
                    $reportTitle = 'Manufacturing Summary Report';
                    break;

                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid report type'
                    ], 400);
            }

            // Generate Excel file
            if ($format === 'xlsx') {
                return $this->generateExcel($reportType, $reportData, $reportTitle);
            } else if ($format === 'pdf') {
                return $this->generatePDF($reportType, $reportData, $reportTitle);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to export report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate Excel file for report
     */
    private function generateExcel($reportType, $data, $title)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Add title
        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:H1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Add period info
        if (isset($data['period'])) {
            $sheet->setCellValue('A2', 'Period: ' . $data['period']['start_date'] . ' to ' . $data['period']['end_date']);
            $sheet->mergeCells('A2:H2');
            $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        $currentRow = 4;

        switch ($reportType) {
            case 'cost-analysis':
                $currentRow = $this->fillCostAnalysisSheet($sheet, $data, $currentRow);
                break;
            case 'material-consumption':
                $currentRow = $this->fillMaterialConsumptionSheet($sheet, $data, $currentRow);
                break;
            case 'production-efficiency':
                $currentRow = $this->fillEfficiencySheet($sheet, $data, $currentRow);
                break;
            case 'manufacturing-summary':
                $currentRow = $this->fillSummarySheet($sheet, $data, $currentRow);
                break;
        }

        // Auto-size columns
        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Create writer and save to temporary file
        $writer = new Xlsx($spreadsheet);
        $filename = $reportType . '-' . date('Y-m-d-His') . '.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer->save($tempPath);

        // Return file download response
        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Fill Cost Analysis Sheet
     */
    private function fillCostAnalysisSheet($sheet, $data, $startRow)
    {
        $row = $startRow;

        // Summary Section
        $sheet->setCellValue('A' . $row, 'SUMMARY');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;

        if (isset($data['summary'])) {
            $sheet->setCellValue('A' . $row, 'Total Production Cost:');
            $sheet->setCellValue('B' . $row, $data['summary']['total_production_cost']);
            $row++;

            $sheet->setCellValue('A' . $row, 'Material Cost:');
            $sheet->setCellValue('B' . $row, $data['summary']['total_material_cost']);
            $sheet->setCellValue('C' . $row, '(' . round($data['summary']['cost_breakdown']['material_percentage'], 1) . '%)');
            $row++;

            $sheet->setCellValue('A' . $row, 'Labor Cost:');
            $sheet->setCellValue('B' . $row, $data['summary']['total_labor_cost']);
            $sheet->setCellValue('C' . $row, '(' . round($data['summary']['cost_breakdown']['labor_percentage'], 1) . '%)');
            $row++;

            $sheet->setCellValue('A' . $row, 'Overhead Cost:');
            $sheet->setCellValue('B' . $row, $data['summary']['total_overhead_cost']);
            $sheet->setCellValue('C' . $row, '(' . round($data['summary']['cost_breakdown']['overhead_percentage'], 1) . '%)');
            $row += 2;
        }

        // Product Analysis Section
        $sheet->setCellValue('A' . $row, 'PRODUCT-WISE COST ANALYSIS');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;

        // Headers
        $headers = ['Product', 'Qty Produced', 'Material Cost', 'Labor Cost', 'Overhead Cost', 'Total Cost', 'Avg Unit Cost', 'Trend'];
        foreach ($headers as $col => $header) {
            $sheet->setCellValueByColumnAndRow($col + 1, $row, $header);
            $sheet->getStyleByColumnAndRow($col + 1, $row)->getFont()->setBold(true);
            $sheet->getStyleByColumnAndRow($col + 1, $row)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFE0E0E0');
        }
        $row++;

        // Data rows
        if (isset($data['product_analysis']) && is_array($data['product_analysis'])) {
            foreach ($data['product_analysis'] as $item) {
                $sheet->setCellValue('A' . $row, $item['product'] ?? '');
                $sheet->setCellValue('B' . $row, $item['total_quantity_produced'] ?? 0);
                $sheet->setCellValue('C' . $row, $item['total_material_cost'] ?? 0);
                $sheet->setCellValue('D' . $row, $item['total_labor_cost'] ?? 0);
                $sheet->setCellValue('E' . $row, $item['total_overhead_cost'] ?? 0);
                $sheet->setCellValue('F' . $row, $item['total_cost'] ?? 0);
                $sheet->setCellValue('G' . $row, $item['average_unit_cost'] ?? 0);
                $sheet->setCellValue('H' . $row, $item['cost_trend'] ?? '');
                $row++;
            }
        }

        return $row;
    }

    /**
     * Fill Material Consumption Sheet
     */
    private function fillMaterialConsumptionSheet($sheet, $data, $startRow)
    {
        $row = $startRow;

        // Headers
        $headers = ['Material Code', 'Material Name', 'Total Consumed', 'UOM', 'Total Cost', 'Avg Unit Cost', 'Used In Productions'];
        foreach ($headers as $col => $header) {
            $sheet->setCellValueByColumnAndRow($col + 1, $row, $header);
            $sheet->getStyleByColumnAndRow($col + 1, $row)->getFont()->setBold(true);
            $sheet->getStyleByColumnAndRow($col + 1, $row)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFE0E0E0');
        }
        $row++;

        // Data rows
        if (isset($data['consumption_data']) && is_array($data['consumption_data'])) {
            foreach ($data['consumption_data'] as $item) {
                $sheet->setCellValue('A' . $row, $item->product_code ?? '');
                $sheet->setCellValue('B' . $row, $item->raw_material_name ?? '');
                $sheet->setCellValue('C' . $row, $item->total_consumed ?? 0);
                $sheet->setCellValue('D' . $row, $item->uom_short ?? '');
                $sheet->setCellValue('E' . $row, $item->total_cost ?? 0);
                $sheet->setCellValue('F' . $row, $item->avg_unit_cost ?? 0);
                $sheet->setCellValue('G' . $row, $item->production_count ?? 0);
                $row++;
            }
        }

        return $row;
    }

    /**
     * Fill Efficiency Sheet
     */
    private function fillEfficiencySheet($sheet, $data, $startRow)
    {
        $row = $startRow;

        // Overall Metrics
        if (isset($data['overall_metrics'])) {
            $sheet->setCellValue('A' . $row, 'OVERALL EFFICIENCY METRICS');
            $sheet->getStyle('A' . $row)->getFont()->setBold(true);
            $row++;

            $sheet->setCellValue('A' . $row, 'Quantity Efficiency:');
            $sheet->setCellValue('B' . $row, $data['overall_metrics']['average_quantity_efficiency'] . '%');
            $row++;

            $sheet->setCellValue('A' . $row, 'Cost Efficiency:');
            $sheet->setCellValue('B' . $row, $data['overall_metrics']['average_cost_efficiency'] . '%');
            $row++;

            $sheet->setCellValue('A' . $row, 'On-Time Completion:');
            $sheet->setCellValue('B' . $row, $data['overall_metrics']['on_time_completion_rate'] . '%');
            $row++;

            $sheet->setCellValue('A' . $row, 'Quality Pass Rate:');
            $sheet->setCellValue('B' . $row, $data['overall_metrics']['quality_pass_rate'] . '%');
            $row += 2;
        }

        // Product-wise Efficiency
        $sheet->setCellValue('A' . $row, 'PRODUCT-WISE EFFICIENCY');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;

        // Headers
        $headers = ['Product', 'Total Orders', 'Qty Efficiency %', 'Cost Efficiency %', 'On-Time %', 'Quality %', 'Total Produced'];
        foreach ($headers as $col => $header) {
            $sheet->setCellValueByColumnAndRow($col + 1, $row, $header);
            $sheet->getStyleByColumnAndRow($col + 1, $row)->getFont()->setBold(true);
        }
        $row++;

        // Data
        if (isset($data['product_efficiency']) && is_array($data['product_efficiency'])) {
            foreach ($data['product_efficiency'] as $item) {
                $sheet->setCellValue('A' . $row, $item['product'] ?? '');
                $sheet->setCellValue('B' . $row, $item['total_orders'] ?? 0);
                $sheet->setCellValue('C' . $row, $item['avg_quantity_efficiency'] ?? 0);
                $sheet->setCellValue('D' . $row, $item['avg_cost_efficiency'] ?? 0);
                $sheet->setCellValue('E' . $row, $item['on_time_delivery_rate'] ?? 0);
                $sheet->setCellValue('F' . $row, $item['quality_pass_rate'] ?? 0);
                $sheet->setCellValue('G' . $row, $item['total_quantity_produced'] ?? 0);
                $row++;
            }
        }

        return $row;
    }

    /**
     * Fill Summary Sheet
     */
    private function fillSummarySheet($sheet, $data, $startRow)
    {
        $row = $startRow;

        // Production Summary
        if (isset($data['production_summary']) && is_array($data['production_summary'])) {
            $sheet->setCellValue('A' . $row, 'PRODUCTION SUMMARY');
            $sheet->getStyle('A' . $row)->getFont()->setBold(true);
            $row++;

            // Headers
            $headers = ['Product', 'Total Orders', 'Completed', 'Cancelled', 'Total Quantity', 'Total Cost'];
            foreach ($headers as $col => $header) {
                $sheet->setCellValueByColumnAndRow($col + 1, $row, $header);
                $sheet->getStyleByColumnAndRow($col + 1, $row)->getFont()->setBold(true);
            }
            $row++;

            foreach ($data['production_summary'] as $item) {
                $sheet->setCellValue('A' . $row, isset($item->product) ? $item->product->name : 'Unknown');
                $sheet->setCellValue('B' . $row, $item->total_orders ?? 0);
                $sheet->setCellValue('C' . $row, $item->completed_orders ?? 0);
                $sheet->setCellValue('D' . $row, $item->cancelled_orders ?? 0);
                $sheet->setCellValue('E' . $row, $item->total_quantity ?? 0);
                $sheet->setCellValue('F' . $row, $item->total_cost ?? 0);
                $row++;
            }
        }

        return $row;
    }
}
