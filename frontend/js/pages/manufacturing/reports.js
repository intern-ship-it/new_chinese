// js/pages/manufacturing/reports.js
// Manufacturing Reports Dashboard

(function ($, window) {
    'use strict';

    window.ManufacturingReportsPage = {
        charts: {},
        currentDateRange: {
            start: moment().subtract(30, 'days').format('YYYY-MM-DD'),
            end: moment().format('YYYY-MM-DD')
        },

        init: function () {
            this.render();
          
            this.bindEvents();
            this.loadDashboard();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Manufacturing Reports & Analytics</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Manufacturing</li>
                                    <li class="breadcrumb-item active">Reports</li>
                                </ol>
                            </nav>
                        </div>
                 
                    </div>
                    
                    <!-- Key Metrics Cards -->
                    <div class="row mb-4" id="metricsRow">
                        <div class="col-md-3 mb-3">
                            <div class="stat-card">
                                <div class="stat-icon primary">
                                    <i class="bi bi-box-seam"></i>
                                </div>
                                <div class="stat-value" id="totalOrders">0</div>
                                <div class="stat-label">Total Orders</div>
                                <div class="stat-change positive" id="ordersChange">
                                    <i class="bi bi-arrow-up"></i> 0%
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3 mb-3">
                            <div class="stat-card">
                                <div class="stat-icon success">
                                    <i class="bi bi-check-circle"></i>
                                </div>
                                <div class="stat-value" id="completedOrders">0</div>
                                <div class="stat-label">Completed</div>
                                <div class="stat-change" id="completionRate">0% rate</div>
                            </div>
                        </div>
                        <div class="col-md-3 mb-3">
                            <div class="stat-card">
                                <div class="stat-icon info">
                                    <i class="bi bi-currency-rupee"></i>
                                </div>
                                <div class="stat-value" id="productionValue">0</div>
                                <div class="stat-label">Production Value</div>
                                <div class="stat-change" id="avgOrderValue">Avg: 0</div>
                            </div>
                        </div>
                        <div class="col-md-3 mb-3">
                            <div class="stat-card">
                                <div class="stat-icon warning">
                                    <i class="bi bi-speedometer2"></i>
                                </div>
                                <div class="stat-value" id="efficiencyRate">0%</div>
                                <div class="stat-label">Efficiency</div>
                                <div class="stat-change" id="qualityRate">Quality: 0%</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Report Tabs -->
                    <div class="card">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#dashboardTab">
                                        <i class="bi bi-speedometer2"></i> Dashboard
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#costAnalysisTab">
                                        <i class="bi bi-cash-stack"></i> Cost Analysis
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#materialConsumptionTab">
                                        <i class="bi bi-box"></i> Material Consumption
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#efficiencyTab">
                                        <i class="bi bi-graph-up"></i> Efficiency
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#summaryTab">
                                        <i class="bi bi-file-text"></i> Summary
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <!-- Dashboard Tab -->
                                <div class="tab-pane fade show active" id="dashboardTab">
                                    <div class="row">
                                        <div class="col-md-6 mb-4">
                                            <h6 class="fw-bold">Production Trend</h6>
                                            <!-- FIXED: Added explicit height container -->
                                            <div style="height: 300px; position: relative;">
                                                <canvas id="productionTrendChart"></canvas>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-4">
                                            <h6 class="fw-bold">Cost Breakdown</h6>
                                            <!-- FIXED: Added explicit height container -->
                                            <div style="height: 300px; position: relative;">
                                                <canvas id="costBreakdownChart"></canvas>
                                            </div>
                                        </div>
                                        <div class="col-md-12 mb-4">
                                            <h6 class="fw-bold">Top Manufactured Products</h6>
                                            <div class="table-responsive">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Product</th>
                                                            <th>Orders</th>
                                                            <th>Quantity</th>
                                                            <th>Total Value</th>
                                                            <th>Avg Cost</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="topProductsTableBody">
                                                        <tr><td colspan="5" class="text-center">Loading...</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Cost Analysis Tab -->
                                <div class="tab-pane fade" id="costAnalysisTab">
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <select class="form-select" id="costAnalysisProduct">
                                                <option value="">All Products</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <select class="form-select" id="costAnalysisWarehouse">
                                                <option value="">All Warehouses</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <button class="btn btn-primary" id="generateCostAnalysisBtn">
                                                Generate Report
                                            </button>
                                            <button class="btn btn-success ms-2" id="exportCostAnalysisBtn">
                                                <i class="bi bi-download"></i> Export
                                            </button>
                                        </div>
                                    </div>
                                    <div id="costAnalysisContent">
                                        <!-- Cost analysis content will be loaded here -->
                                    </div>
                                </div>
                                
                                <!-- Material Consumption Tab -->
                                <div class="tab-pane fade" id="materialConsumptionTab">
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <select class="form-select" id="materialConsumptionProduct">
                                                <option value="">All Raw Materials</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <select class="form-select" id="materialConsumptionWarehouse">
                                                <option value="">All Warehouses</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <button class="btn btn-primary" id="generateMaterialReportBtn">
                                                Generate Report
                                            </button>
                                            <button class="btn btn-success ms-2" id="exportMaterialReportBtn">
                                                <i class="bi bi-download"></i> Export
                                            </button>
                                        </div>
                                    </div>
                                    <div id="materialConsumptionContent">
                                        <!-- Material consumption content will be loaded here -->
                                    </div>
                                </div>
                                
                                <!-- Efficiency Tab -->
                                <div class="tab-pane fade" id="efficiencyTab">
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <select class="form-select" id="efficiencyProduct">
                                                <option value="">All Products</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <select class="form-select" id="efficiencyWarehouse">
                                                <option value="">All Warehouses</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <button class="btn btn-primary" id="generateEfficiencyReportBtn">
                                                Generate Report
                                            </button>
                                            <button class="btn btn-success ms-2" id="exportEfficiencyReportBtn">
                                                <i class="bi bi-download"></i> Export
                                            </button>
                                        </div>
                                    </div>
                                    <div id="efficiencyContent">
                                        <!-- Efficiency content will be loaded here -->
                                    </div>
                                </div>
                                
                                <!-- Summary Tab -->
                                <div class="tab-pane fade" id="summaryTab">
                                    <div class="text-end mb-3">
                                        <button class="btn btn-primary" id="generateSummaryBtn">
                                            Generate Summary
                                        </button>
                                        <button class="btn btn-success ms-2" id="exportSummaryBtn">
                                            <i class="bi bi-download"></i> Export
                                        </button>
                                    </div>
                                    <div id="summaryContent">
                                        <!-- Summary content will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

    
        bindEvents: function () {
            const self = this;

            // Refresh dashboard
            $('#refreshDashboardBtn').on('click', function () {
                self.loadDashboard();
            });

            // Tab change events
            $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
                const target = $(e.target).attr('href');

                switch (target) {
                    case '#costAnalysisTab':
                        self.loadCostAnalysis();
                        break;
                    case '#materialConsumptionTab':
                        self.loadMaterialConsumption();
                        break;
                    case '#efficiencyTab':
                        self.loadEfficiency();
                        break;
                    case '#summaryTab':
                        self.loadSummary();
                        break;
                }
            });

            // Report generation buttons
            $('#generateCostAnalysisBtn').on('click', function () {
                self.generateCostAnalysisReport();
            });

            $('#generateMaterialReportBtn').on('click', function () {
                self.generateMaterialConsumptionReport();
            });

            $('#generateEfficiencyReportBtn').on('click', function () {
                self.generateEfficiencyReport();
            });

            $('#generateSummaryBtn').on('click', function () {
                self.generateSummaryReport();
            });

            // Export buttons
            $('#exportCostAnalysisBtn').on('click', function () {
                self.exportReport('cost-analysis');
            });

            $('#exportMaterialReportBtn').on('click', function () {
                self.exportReport('material-consumption');
            });

            $('#exportEfficiencyReportBtn').on('click', function () {
                self.exportReport('production-efficiency');
            });

            $('#exportSummaryBtn').on('click', function () {
                self.exportReport('manufacturing-summary');
            });
        },

        loadDashboard: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get('/manufacturing/reports/dashboard', {
                start_date: this.currentDateRange.start,
                end_date: this.currentDateRange.end
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderDashboard(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load dashboard data', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderDashboard: function (data) {
            // Update metrics cards
            $('#totalOrders').text(data.metrics.total_orders || 0);
            $('#completedOrders').text(data.metrics.completed_orders || 0);
            $('#productionValue').text(TempleCore.formatCurrency(data.metrics.total_production_value || 0));
            $('#efficiencyRate').text((data.metrics.production_efficiency || 0) + '%');

            const completionRate = data.metrics.total_orders > 0
                ? Math.round((data.metrics.completed_orders / data.metrics.total_orders) * 100)
                : 0;
            $('#completionRate').text(completionRate + '% rate');

            const avgValue = data.metrics.completed_orders > 0
                ? data.metrics.total_production_value / data.metrics.completed_orders
                : 0;
            $('#avgOrderValue').text('Avg: ' + TempleCore.formatCurrency(avgValue));

            $('#qualityRate').text('Quality: ' + (data.quality_metrics?.quality_pass_rate || 0) + '%');

            // Render production trend chart
            this.renderProductionTrendChart(data.production_trend || []);

            // Render cost breakdown chart
            this.renderCostBreakdownChart(data.cost_analysis || {material_cost: 0, labor_cost: 0, overhead_cost: 0});

            // Render top products table
            this.renderTopProducts(data.top_products || []);
        },

        renderProductionTrendChart: function (trendData) {
            const ctx = document.getElementById('productionTrendChart');
            
            if (!ctx) {
                console.error('Production trend chart canvas not found');
                return;
            }

            // Destroy existing chart if exists
            if (this.charts.productionTrend) {
                this.charts.productionTrend.destroy();
            }

            // FIXED: Handle empty data
            if (!trendData || trendData.length === 0) {
                trendData = [{date: 'No Data', quantity: 0, cost: 0}];
            }

            const labels = trendData.map(item => item.date || item.week || item.month);
            const quantities = trendData.map(item => item.quantity || 0);
            const costs = trendData.map(item => item.cost || 0);

            this.charts.productionTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Quantity Produced',
                        data: quantities,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y',
                        tension: 0.1
                    }, {
                        label: 'Production Cost',
                        data: costs,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y1',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Quantity'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Cost'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        },
                    }
                }
            });
        },

        renderCostBreakdownChart: function (costData) {
            const ctx = document.getElementById('costBreakdownChart');
            
            if (!ctx) {
                console.error('Cost breakdown chart canvas not found');
                return;
            }

            // Destroy existing chart if exists
            if (this.charts.costBreakdown) {
                this.charts.costBreakdown.destroy();
            }

            // FIXED: Ensure data has values
            const materialCost = costData.material_cost || 0;
            const laborCost = costData.labor_cost || 0;
            const overheadCost = costData.overhead_cost || 0;

            this.charts.costBreakdown = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Material Cost', 'Labor Cost', 'Overhead Cost'],
                    datasets: [{
                        data: [materialCost, laborCost, overheadCost],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(255, 99, 132, 0.8)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = TempleCore.formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    return label + ': ' + value + ' (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        },

        renderTopProducts: function (products) {
            if (!products || products.length === 0) {
                $('#topProductsTableBody').html('<tr><td colspan="5" class="text-center">No data available</td></tr>');
                return;
            }

            let html = '';
            products.forEach(function (item) {
                const avgCost = item.order_count > 0 ? item.total_value / item.order_count : 0;
                html += `
                    <tr>
                        <td>${item.product?.name || 'Unknown'}</td>
                        <td>${item.order_count}</td>
                        <td>${item.total_quantity}</td>
                        <td>${TempleCore.formatCurrency(item.total_value)}</td>
                        <td>${TempleCore.formatCurrency(avgCost)}</td>
                    </tr>
                `;
            });

            $('#topProductsTableBody').html(html);
        },

        generateCostAnalysisReport: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get('/manufacturing/reports/cost-analysis', {
                start_date: this.currentDateRange.start,
                end_date: this.currentDateRange.end,
                product_id: $('#costAnalysisProduct').val(),
                warehouse_id: $('#costAnalysisWarehouse').val()
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderCostAnalysisReport(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to generate cost analysis report', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderCostAnalysisReport: function (data) {
            let html = `
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <h6 class="fw-bold">Cost Analysis Summary</h6>
                        <div class="row">
                            <div class="col-md-3">
                                <small class="text-muted">Total Production Cost</small>
                                <h5>${TempleCore.formatCurrency(data.summary.total_production_cost)}</h5>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Material Cost</small>
                                <h5>${TempleCore.formatCurrency(data.summary.total_material_cost)} 
                                    <small>(${data.summary.cost_breakdown.material_percentage.toFixed(1)}%)</small>
                                </h5>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Labor Cost</small>
                                <h5>${TempleCore.formatCurrency(data.summary.total_labor_cost)}
                                    <small>(${data.summary.cost_breakdown.labor_percentage.toFixed(1)}%)</small>
                                </h5>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Overhead Cost</small>
                                <h5>${TempleCore.formatCurrency(data.summary.total_overhead_cost)}
                                    <small>(${data.summary.cost_breakdown.overhead_percentage.toFixed(1)}%)</small>
                                </h5>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-12">
                        <h6 class="fw-bold">Product-wise Cost Analysis</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Qty Produced</th>
                                        <th>Material Cost</th>
                                        <th>Labor Cost</th>
                                        <th>Overhead Cost</th>
                                        <th>Total Cost</th>
                                        <th>Avg Unit Cost</th>
                                        <th>Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            if (data.product_analysis && data.product_analysis.length > 0) {
                data.product_analysis.forEach(function (item) {
                    const trendIcon = item.cost_trend === 'increasing' ? 'bi-arrow-up text-danger' :
                        item.cost_trend === 'decreasing' ? 'bi-arrow-down text-success' :
                            'bi-arrow-right text-secondary';

                    html += `
                        <tr>
                            <td>${item.product}</td>
                            <td>${item.total_quantity_produced}</td>
                            <td>${TempleCore.formatCurrency(item.total_material_cost)}</td>
                            <td>${TempleCore.formatCurrency(item.total_labor_cost)}</td>
                            <td>${TempleCore.formatCurrency(item.total_overhead_cost)}</td>
                            <td>${TempleCore.formatCurrency(item.total_cost)}</td>
                            <td>${TempleCore.formatCurrency(item.average_unit_cost)}</td>
                            <td><i class="bi ${trendIcon}"></i></td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="8" class="text-center">No data available</td></tr>';
            }

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#costAnalysisContent').html(html);
        },

        generateMaterialConsumptionReport: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get('/manufacturing/reports/material-consumption', {
                start_date: this.currentDateRange.start,
                end_date: this.currentDateRange.end,
                raw_material_id: $('#materialConsumptionProduct').val(),
                warehouse_id: $('#materialConsumptionWarehouse').val()
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderMaterialConsumptionReport(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to generate material consumption report', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderMaterialConsumptionReport: function (data) {
            let html = `
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <h6 class="fw-bold">Material Consumption Summary</h6>
                        <div class="alert alert-info">
                            <strong>Period:</strong> ${data.period.start_date} to ${data.period.end_date}<br>
                            <strong>Total Materials:</strong> ${data.summary.total_materials_consumed}<br>
                            <strong>Total Value:</strong> ${TempleCore.formatCurrency(data.summary.total_consumption_value)}
                        </div>
                    </div>
                    
                    <div class="col-md-12">
                        <h6 class="fw-bold">Raw Material Consumption Details</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Material Code</th>
                                        <th>Material Name</th>
                                        <th>Total Consumed</th>
                                        <th>UOM</th>
                                        <th>Total Cost</th>
                                        <th>Avg Unit Cost</th>
                                        <th>Used In</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            if (data.consumption_data && data.consumption_data.length > 0) {
                data.consumption_data.forEach(function (item) {
                    html += `
                        <tr>
                            <td>${item.product_code}</td>
                            <td>${item.raw_material_name}</td>
                            <td>${parseFloat(item.total_consumed).toFixed(3)}</td>
                            <td>${item.uom_short}</td>
                            <td>${TempleCore.formatCurrency(item.total_cost)}</td>
                            <td>${TempleCore.formatCurrency(item.avg_unit_cost)}</td>
                            <td>${item.production_count} productions</td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="7" class="text-center">No data available</td></tr>';
            }

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#materialConsumptionContent').html(html);
        },

        generateEfficiencyReport: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get('/manufacturing/reports/production-efficiency', {
                start_date: this.currentDateRange.start,
                end_date: this.currentDateRange.end,
                product_id: $('#efficiencyProduct').val(),
                warehouse_id: $('#efficiencyWarehouse').val()
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderEfficiencyReport(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to generate efficiency report', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderEfficiencyReport: function (data) {
            let html = `
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <h6 class="fw-bold">Overall Efficiency Metrics</h6>
                        <div class="row">
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="progress" style="height: 30px;">
                                        <div class="progress-bar bg-success" style="width: ${data.overall_metrics.average_quantity_efficiency}%">
                                            ${data.overall_metrics.average_quantity_efficiency}%
                                        </div>
                                    </div>
                                    <small>Quantity Efficiency</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="progress" style="height: 30px;">
                                        <div class="progress-bar bg-info" style="width: ${data.overall_metrics.average_cost_efficiency}%">
                                            ${data.overall_metrics.average_cost_efficiency}%
                                        </div>
                                    </div>
                                    <small>Cost Efficiency</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="progress" style="height: 30px;">
                                        <div class="progress-bar bg-warning" style="width: ${data.overall_metrics.on_time_completion_rate}%">
                                            ${data.overall_metrics.on_time_completion_rate}%
                                        </div>
                                    </div>
                                    <small>On-Time Completion</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="progress" style="height: 30px;">
                                        <div class="progress-bar bg-primary" style="width: ${data.overall_metrics.quality_pass_rate}%">
                                            ${data.overall_metrics.quality_pass_rate}%
                                        </div>
                                    </div>
                                    <small>Quality Pass Rate</small>
                                </div>
                            </div>
                        </div>
                    </div>
            `;

            // Bottlenecks section
            if (data.bottlenecks && data.bottlenecks.length > 0) {
                html += `
                    <div class="col-md-12 mb-3">
                        <h6 class="fw-bold">Identified Bottlenecks</h6>
                        <div class="alert alert-warning">
                            <ul class="mb-0">
                `;

                data.bottlenecks.forEach(function (bottleneck) {
                    html += `
                        <li>
                            <strong>${bottleneck.product}</strong> - ${bottleneck.type}: ${bottleneck.recommendation}
                        </li>
                    `;
                });

                html += `
                            </ul>
                        </div>
                    </div>
                `;
            }

            html += `
                    <div class="col-md-12">
                        <h6 class="fw-bold">Product-wise Efficiency</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Total Orders</th>
                                        <th>Qty Efficiency</th>
                                        <th>Cost Efficiency</th>
                                        <th>On-Time Rate</th>
                                        <th>Quality Rate</th>
                                        <th>Total Produced</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            if (data.product_efficiency && data.product_efficiency.length > 0) {
                data.product_efficiency.forEach(function (item) {
                    html += `
                        <tr>
                            <td>${item.product}</td>
                            <td>${item.total_orders}</td>
                            <td>${item.avg_quantity_efficiency}%</td>
                            <td>${item.avg_cost_efficiency}%</td>
                            <td>${item.on_time_delivery_rate}%</td>
                            <td>${item.quality_pass_rate}%</td>
                            <td>${item.total_quantity_produced}</td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="7" class="text-center">No data available</td></tr>';
            }

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#efficiencyContent').html(html);
        },

        generateSummaryReport: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get('/manufacturing/reports/summary', {
                start_date: this.currentDateRange.start,
                end_date: this.currentDateRange.end
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderSummaryReport(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to generate summary report', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderSummaryReport: function (data) {
            const temple = TempleCore.getTemple();

            let html = `
                <div class="report-header text-center mb-4">
                    <h4>${temple.name}</h4>
                    <h5>Manufacturing Summary Report</h5>
                    <p class="text-muted">Period: ${data.period.start_date} to ${data.period.end_date}</p>
                </div>
                
                <div class="report-content">
                    <h6 class="fw-bold">Production Summary</h6>
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Total Orders</th>
                                <th>Completed</th>
                                <th>Cancelled</th>
                                <th>Total Quantity</th>
                                <th>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.production_summary && data.production_summary.length > 0) {
                data.production_summary.forEach(function (item) {
                    html += `
                        <tr>
                            <td>${item.product?.name || 'Unknown'}</td>
                            <td>${item.total_orders}</td>
                            <td>${item.completed_orders}</td>
                            <td>${item.cancelled_orders}</td>
                            <td>${item.total_quantity || 0}</td>
                            <td>${TempleCore.formatCurrency(item.total_cost || 0)}</td>
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                    
                    <h6 class="fw-bold mt-4">Top Material Usage</h6>
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Total Consumed</th>
                                <th>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.material_usage && data.material_usage.length > 0) {
                data.material_usage.forEach(function (item) {
                    html += `
                        <tr>
                            <td>${item.material_name}</td>
                            <td>${item.total_consumed}</td>
                            <td>${TempleCore.formatCurrency(item.total_cost)}</td>
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                    
                    <div class="report-footer mt-4 text-center text-muted">
                        <small>Generated on: ${moment().format('DD/MM/YYYY HH:mm:ss')}</small>
                    </div>
                </div>
            `;

            $('#summaryContent').html(html);
        },

        exportReport: function (reportType, format = 'xlsx') {
            const self = this;
            TempleCore.showLoading(true);

            // Use XMLHttpRequest to handle the download with auth header
            const xhr = new XMLHttpRequest();
            xhr.open('POST', TempleAPI.getBaseUrl() + '/manufacturing/reports/export/' + reportType, true);
            xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN));
            xhr.setRequestHeader('X-Temple-ID', TempleAPI.getTempleId());
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.responseType = 'blob';

            xhr.onload = function () {
                TempleCore.showLoading(false);

                if (xhr.status === 200) {
                    // Create download link
                    const blob = new Blob([xhr.response], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = reportType + '-' + moment().format('YYYY-MM-DD') + '.' + format;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    TempleCore.showToast('Report exported successfully', 'success');
                } else {
                    TempleCore.showToast('Failed to export report', 'error');
                }
            };

            xhr.onerror = function () {
                TempleCore.showLoading(false);
                TempleCore.showToast('Failed to export report', 'error');
            };

            // Send request with JSON data
            xhr.send(JSON.stringify({
                start_date: self.currentDateRange.start,
                end_date: self.currentDateRange.end,
                format: format,
                product_id: $('#costAnalysisProduct').val() || $('#efficiencyProduct').val(),
                warehouse_id: $('#costAnalysisWarehouse').val() || $('#efficiencyWarehouse').val(),
                raw_material_id: $('#materialConsumptionProduct').val()
            }));
        },

        loadCostAnalysis: function () {
            // Load products and warehouses for filters
            this.loadFilterData();
        },

        loadMaterialConsumption: function () {
            // Load raw materials and warehouses for filters
            this.loadFilterData();
        },

        loadEfficiency: function () {
            // Load products and warehouses for filters
            this.loadFilterData();
        },

        loadSummary: function () {
            // Summary doesn't need additional filters
        },

        loadFilterData: function () {
            // Load products
            TempleAPI.get('/manufacturing/bom/manufacturable-products')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Products</option>';
                        response.data.forEach(function (product) {
                            options += `<option value="${product.id}">${product.product_code} - ${product.name}</option>`;
                        });
                        $('#costAnalysisProduct, #efficiencyProduct').html(options);
                    }
                });

            // Load raw materials
            TempleAPI.get('/manufacturing/bom/raw-materials')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Raw Materials</option>';
                        response.data.forEach(function (material) {
                            options += `<option value="${material.id}">${material.product_code} - ${material.name}</option>`;
                        });
                        $('#materialConsumptionProduct').html(options);
                    }
                });

            // Load warehouses
            TempleAPI.get('/inventory/warehouse')
                .done(function (response) {
                    if (response.success && response.data) {
                        let options = '<option value="">All Warehouses</option>';
                        const warehouses = response.data.data || response.data;
                        warehouses.forEach(function (warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                        });
                        $('#costAnalysisWarehouse, #materialConsumptionWarehouse, #efficiencyWarehouse').html(options);
                    }
                });
        }
    };

})(jQuery, window);