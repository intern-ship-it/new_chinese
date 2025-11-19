// js/pages/purchase/reports/supplier-analysis.js
// Supplier analysis and performance report

(function($, window) {
    'use strict';
    
    window.SupplierAnalysisPage = {
        chartInstances: {},
        currentSupplier: null,
        
        init: function() {
            this.render();
            this.loadSuppliers();
            this.bindEvents();
            this.loadReport();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Supplier Analysis Report</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Supplier Analysis</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-success" id="btnExportExcel">
                                <i class="bi bi-file-earmark-excel"></i> Export Excel
                            </button>
                            <button class="btn btn-info" id="btnExportPdf">
                                <i class="bi bi-file-earmark-pdf"></i> Export PDF
                            </button>
                            <button class="btn btn-secondary" onclick="window.print();">
                                <i class="bi bi-printer"></i> Print
                            </button>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="filterForm">
                                <div class="row">
                                    <div class="col-md-4">
                                        <label class="form-label">Supplier</label>
                                        <select class="form-select" id="supplierFilter">
                                            <option value="">All Suppliers</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Date Range</label>
                                        <select class="form-select" id="dateRange">
                                            <option value="month">Last Month</option>
                                            <option value="quarter" selected>Last Quarter</option>
                                            <option value="sixmonths">Last 6 Months</option>
                                            <option value="year">Last Year</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2" id="customFromContainer" style="display: none;">
                                        <label class="form-label">From</label>
                                        <input type="date" class="form-control" id="fromDate">
                                    </div>
                                    <div class="col-md-2" id="customToContainer" style="display: none;">
                                        <label class="form-label">To</label>
                                        <input type="date" class="form-control" id="toDate">
                                    </div>
                                    <div class="col-md-3 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary me-2" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Apply
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="btnResetFilter">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Supplier Performance Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Total Suppliers</h6>
                                    <h3 id="totalSuppliers">0</h3>
                                    <small class="text-success">
                                        <i class="bi bi-arrow-up"></i> 
                                        <span id="activeSuppliers">0</span> Active
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Total Purchase Volume</h6>
                                    <h3 id="totalVolume">0.00</h3>
                                    <small class="text-muted">
                                        <span id="volumeChange">0%</span> from last period
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Average Order Value</h6>
                                    <h3 id="avgOrderValue">0.00</h3>
                                    <small class="text-muted">
                                        <span id="totalOrders">0</span> Orders
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Avg Delivery Time</h6>
                                    <h3 id="avgDeliveryTime">0 days</h3>
                                    <small>
                                        <span class="text-success" id="onTimeDelivery">0%</span> On-time
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Performance Metrics -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Top 10 Suppliers by Volume</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="topSuppliersChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Supplier Performance Score</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="performanceChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Supplier Details Table -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h6 class="mb-0">Supplier Performance Details</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="supplierTable">
                                    <thead>
                                        <tr>
                                            <th>Supplier</th>
                                            <th>Total Orders</th>
                                            <th>Total Value</th>
                                            <th>Avg Order Value</th>
                                            <th>On-time Delivery</th>
                                            <th>Quality Score</th>
                                            <th>Payment Terms</th>
                                            <th>Outstanding</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="supplierTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Supplier Comparison -->
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Category-wise Distribution</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="categoryChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Monthly Purchase Trend</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="trendChart" height="120"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Risk Analysis -->
                    <div class="card">
                        <div class="card-header bg-warning text-dark">
                            <h6 class="mb-0">Supplier Risk Analysis</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <h6>High Risk Suppliers</h6>
                                    <div id="highRiskList" class="list-group">
                                        <div class="list-group-item">No high risk suppliers</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <h6>Payment Overdue</h6>
                                    <div id="overdueList" class="list-group">
                                        <div class="list-group-item">No overdue payments</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <h6>Low Performance</h6>
                                    <div id="lowPerformanceList" class="list-group">
                                        <div class="list-group-item">No low performers</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Supplier Detail Modal -->
                <div class="modal fade" id="supplierDetailModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Supplier Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <h6>Supplier Information</h6>
                                        <table class="table table-sm">
                                            <tr>
                                                <td>Name:</td>
                                                <td id="detailSupplierName"></td>
                                            </tr>
                                            <tr>
                                                <td>Code:</td>
                                                <td id="detailSupplierCode"></td>
                                            </tr>
                                            <tr>
                                                <td>Contact:</td>
                                                <td id="detailContact"></td>
                                            </tr>
                                            <tr>
                                                <td>Email:</td>
                                                <td id="detailEmail"></td>
                                            </tr>
                                            <tr>
                                                <td>GST No:</td>
                                                <td id="detailGst"></td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Performance Metrics</h6>
                                        <table class="table table-sm">
                                            <tr>
                                                <td>Total Orders:</td>
                                                <td id="detailTotalOrders"></td>
                                            </tr>
                                            <tr>
                                                <td>Total Business:</td>
                                                <td id="detailTotalBusiness"></td>
                                            </tr>
                                            <tr>
                                                <td>On-time Delivery:</td>
                                                <td id="detailOnTime"></td>
                                            </tr>
                                            <tr>
                                                <td>Quality Score:</td>
                                                <td id="detailQuality"></td>
                                            </tr>
                                            <tr>
                                                <td>Current Balance:</td>
                                                <td id="detailBalance"></td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                
                                <h6>Recent Transactions</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Document</th>
                                                <th>Type</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody id="detailTransactions">
                                            <tr>
                                                <td colspan="5" class="text-center">Loading...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" onclick="TempleRouter.navigate('purchase/suppliers/edit', {id: SupplierAnalysisPage.currentSupplier}); return false;">
                                    <i class="bi bi-pencil"></i> Edit Supplier
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .btn, .breadcrumb { display: none !important; }
                        .card { page-break-inside: avoid; }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        loadSuppliers: function() {
            TempleAPI.get('/purchase/suppliers')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">All Suppliers</option>';
                        $.each(response.data, function(index, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#supplierFilter').html(options);
                    }
                });
        },
        
        loadReport: function() {
            const filters = this.getFilters();
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/purchase/reports/supplier-analysis', filters)
                .done(response => {
                    if (response.success) {
                        this.displaySummary(response.data);
                        this.displaySuppliers(response.data.suppliers || []);
                        this.renderCharts(response.data);
                        this.displayRiskAnalysis(response.data.risk_analysis || {});
                    }
                })
                .fail(() => {
                    TempleCore.showToast('Failed to load supplier analysis', 'error');
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },
        
        getFilters: function() {
            const filters = {
                supplier_id: $('#supplierFilter').val(),
                date_range: $('#dateRange').val()
            };
            
            if (filters.date_range === 'custom') {
                filters.from_date = $('#fromDate').val();
                filters.to_date = $('#toDate').val();
            }
            
            return filters;
        },
        
        displaySummary: function(data) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            $('#totalSuppliers').text(data.total_suppliers || 0);
            $('#activeSuppliers').text(data.active_suppliers || 0);
            $('#totalVolume').text(currency + (data.total_volume || 0).toFixed(2));
            $('#volumeChange').text((data.volume_change || 0) + '%');
            $('#avgOrderValue').text(currency + (data.avg_order_value || 0).toFixed(2));
            $('#totalOrders').text(data.total_orders || 0);
            $('#avgDeliveryTime').text((data.avg_delivery_time || 0) + ' days');
            $('#onTimeDelivery').text((data.on_time_delivery || 0) + '%');
        },
        
        displaySuppliers: function(suppliers) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            
            if (suppliers.length === 0) {
                html = '<tr><td colspan="9" class="text-center">No data found</td></tr>';
            } else {
                $.each(suppliers, function(index, supplier) {
                    const qualityBadge = supplier.quality_score >= 80 ? 
                        '<span class="badge bg-success">' + supplier.quality_score + '%</span>' :
                        supplier.quality_score >= 60 ?
                        '<span class="badge bg-warning">' + supplier.quality_score + '%</span>' :
                        '<span class="badge bg-danger">' + supplier.quality_score + '%</span>';
                    
                    html += `
                        <tr>
                            <td>${supplier.name}</td>
                            <td>${supplier.total_orders}</td>
                            <td>${currency}${supplier.total_value.toFixed(2)}</td>
                            <td>${currency}${supplier.avg_order_value.toFixed(2)}</td>
                            <td>${supplier.on_time_delivery}%</td>
                            <td>${qualityBadge}</td>
                            <td>${supplier.payment_terms} days</td>
                            <td class="${supplier.outstanding > 0 ? 'text-danger' : ''}">
                                ${currency}${supplier.outstanding.toFixed(2)}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="SupplierAnalysisPage.viewDetails('${supplier.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#supplierTableBody').html(html);
        },
        
        renderCharts: function(data) {
            // Destroy existing charts
            Object.values(this.chartInstances).forEach(chart => chart.destroy());
            this.chartInstances = {};
            
            // Top Suppliers Chart
            if (data.top_suppliers) {
                this.chartInstances.topSuppliers = new Chart(document.getElementById('topSuppliersChart'), {
                    type: 'horizontalBar',
                    data: {
                        labels: data.top_suppliers.names,
                        datasets: [{
                            label: 'Purchase Volume',
                            data: data.top_suppliers.values,
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
            
            // Performance Score Chart
            if (data.performance_scores) {
                this.chartInstances.performance = new Chart(document.getElementById('performanceChart'), {
                    type: 'radar',
                    data: {
                        labels: ['On-time Delivery', 'Quality', 'Pricing', 'Communication', 'Flexibility'],
                        datasets: data.performance_scores.map(supplier => ({
                            label: supplier.name,
                            data: supplier.scores,
                            borderColor: supplier.color,
                            backgroundColor: supplier.color + '33',
                            pointBackgroundColor: supplier.color,
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: supplier.color
                        }))
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100
                            }
                        }
                    }
                });
            }
            
            // Category Distribution
            if (data.category_distribution) {
                this.chartInstances.category = new Chart(document.getElementById('categoryChart'), {
                    type: 'doughnut',
                    data: {
                        labels: data.category_distribution.labels,
                        datasets: [{
                            data: data.category_distribution.values,
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.5)',
                                'rgba(54, 162, 235, 0.5)',
                                'rgba(255, 206, 86, 0.5)',
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(153, 102, 255, 0.5)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
            
            // Monthly Trend
            if (data.monthly_trend) {
                this.chartInstances.trend = new Chart(document.getElementById('trendChart'), {
                    type: 'line',
                    data: {
                        labels: data.monthly_trend.months,
                        datasets: data.monthly_trend.suppliers.map(supplier => ({
                            label: supplier.name,
                            data: supplier.values,
                            borderColor: supplier.color,
                            backgroundColor: supplier.color + '33',
                            tension: 0.1
                        }))
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        },
        
        displayRiskAnalysis: function(riskData) {
            // High Risk Suppliers
            if (riskData.high_risk && riskData.high_risk.length > 0) {
                let html = '';
                $.each(riskData.high_risk, function(index, supplier) {
                    html += `
                        <div class="list-group-item list-group-item-danger">
                            <div class="d-flex justify-content-between">
                                <strong>${supplier.name}</strong>
                                <span class="badge bg-danger">${supplier.risk_score}</span>
                            </div>
                            <small>${supplier.reason}</small>
                        </div>
                    `;
                });
                $('#highRiskList').html(html);
            }
            
            // Overdue Payments
            if (riskData.overdue && riskData.overdue.length > 0) {
                let html = '';
                const currency = TempleCore.formatCurrency(0).split('0')[0];
                $.each(riskData.overdue, function(index, supplier) {
                    html += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <strong>${supplier.name}</strong>
                                <span class="text-danger">${currency}${supplier.overdue_amount}</span>
                            </div>
                            <small>${supplier.overdue_days} days overdue</small>
                        </div>
                    `;
                });
                $('#overdueList').html(html);
            }
            
            // Low Performance
            if (riskData.low_performance && riskData.low_performance.length > 0) {
                let html = '';
                $.each(riskData.low_performance, function(index, supplier) {
                    html += `
                        <div class="list-group-item list-group-item-warning">
                            <div class="d-flex justify-content-between">
                                <strong>${supplier.name}</strong>
                                <span class="badge bg-warning">${supplier.performance_score}%</span>
                            </div>
                            <small>${supplier.issues}</small>
                        </div>
                    `;
                });
                $('#lowPerformanceList').html(html);
            }
        },
        
        viewDetails: function(supplierId) {
            const self = this;
            this.currentSupplier = supplierId;
            
            TempleAPI.get('/purchase/suppliers/' + supplierId + '/analysis')
                .done(function(response) {
                    if (response.success) {
                        self.displaySupplierDetails(response.data);
                        const modal = new bootstrap.Modal(document.getElementById('supplierDetailModal'));
                        modal.show();
                    }
                });
        },
        
        displaySupplierDetails: function(data) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            // Basic Info
            $('#detailSupplierName').text(data.name);
            $('#detailSupplierCode').text(data.supplier_code);
            $('#detailContact').text(data.contact_person + ' - ' + data.mobile_no);
            $('#detailEmail').text(data.email || '-');
            $('#detailGst').text(data.gst_no || '-');
            
            // Performance Metrics
            $('#detailTotalOrders').text(data.total_orders);
            $('#detailTotalBusiness').text(currency + data.total_business.toFixed(2));
            $('#detailOnTime').text(data.on_time_delivery + '%');
            $('#detailQuality').html(this.getQualityBadge(data.quality_score));
            $('#detailBalance').text(currency + data.current_balance.toFixed(2));
            
            // Recent Transactions
            let transactionHtml = '';
            if (data.recent_transactions && data.recent_transactions.length > 0) {
                $.each(data.recent_transactions, function(index, trans) {
                    const statusBadge = trans.status === 'COMPLETED' ?
                        '<span class="badge bg-success">Completed</span>' :
                        '<span class="badge bg-warning">Pending</span>';
                    
                    transactionHtml += `
                        <tr>
                            <td>${TempleCore.formatDate(trans.date)}</td>
                            <td>${trans.document_number}</td>
                            <td>${trans.type}</td>
                            <td>${currency}${trans.amount.toFixed(2)}</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                });
            } else {
                transactionHtml = '<tr><td colspan="5" class="text-center">No recent transactions</td></tr>';
            }
            $('#detailTransactions').html(transactionHtml);
        },
        
        getQualityBadge: function(score) {
            if (score >= 80) {
                return `<span class="badge bg-success">${score}% Excellent</span>`;
            } else if (score >= 60) {
                return `<span class="badge bg-warning">${score}% Good</span>`;
            } else {
                return `<span class="badge bg-danger">${score}% Poor</span>`;
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#dateRange').on('change', function() {
                if ($(this).val() === 'custom') {
                    $('#customFromContainer, #customToContainer').show();
                } else {
                    $('#customFromContainer, #customToContainer').hide();
                }
            });
            
            $('#btnApplyFilter').on('click', function() {
                self.loadReport();
            });
            
            $('#btnResetFilter').on('click', function() {
                $('#filterForm')[0].reset();
                $('#customFromContainer, #customToContainer').hide();
                self.loadReport();
            });
            
            $('#btnExportExcel').on('click', function() {
                self.exportExcel();
            });
            
            $('#btnExportPdf').on('click', function() {
                self.exportPdf();
            });
        },
        
        exportExcel: function() {
            const filters = this.getFilters();
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/supplier-analysis/excel?' + $.param(filters), '_blank');
        },
        
        exportPdf: function() {
            const filters = this.getFilters();
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/supplier-analysis/pdf?' + $.param(filters), '_blank');
        }
    };
    
})(jQuery, window);