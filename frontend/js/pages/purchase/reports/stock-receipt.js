// js/pages/purchase/reports/stock-receipt.js
// Stock receipt (GRN) report

(function($, window) {
    'use strict';
    
    window.StockReceiptReportPage = {
        grnTable: null,
        chartInstance: null,
        
        init: function() {
            this.render();
            this.loadFilters();
            this.bindEvents();
            this.loadReport();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Stock Receipt Report</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Stock Receipt Report</li>
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
                                    <div class="col-md-3">
                                        <label class="form-label">Date Range</label>
                                        <select class="form-select" id="dateRange">
                                            <option value="today">Today</option>
                                            <option value="week">This Week</option>
                                            <option value="month" selected>This Month</option>
                                            <option value="quarter">This Quarter</option>
                                            <option value="year">This Year</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2" id="customFromDate" style="display: none;">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="fromDate">
                                    </div>
                                    <div class="col-md-2" id="customToDate" style="display: none;">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="toDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Supplier</label>
                                        <select class="form-select" id="supplierFilter">
                                            <option value="">All Suppliers</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Warehouse</label>
                                        <select class="form-select" id="warehouseFilter">
                                            <option value="">All Warehouses</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="statusFilter">
                                            <option value="">All Status</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary me-2" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Apply
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="btnResetFilter">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Additional Filters -->
                                <div class="row mt-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Product Category</label>
                                        <select class="form-select" id="categoryFilter">
                                            <option value="">All Categories</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Quality Check</label>
                                        <select class="form-select" id="qcFilter">
                                            <option value="">All</option>
                                            <option value="1">QC Done</option>
                                            <option value="0">QC Pending</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Receipt Type</label>
                                        <select class="form-select" id="receiptTypeFilter">
                                            <option value="">All Types</option>
                                            <option value="PO_BASED">PO Based</option>
                                            <option value="DIRECT">Direct</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">With Rejections</label>
                                        <select class="form-select" id="rejectionFilter">
                                            <option value="">All</option>
                                            <option value="yes">Has Rejections</option>
                                            <option value="no">No Rejections</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <h6 class="card-title text-muted">Total GRNs</h6>
                                    <h3 class="text-primary" id="totalGrns">0</h3>
                                    <small class="text-muted">
                                        <i class="bi bi-box-seam"></i> <span id="completedGrns">0</span> completed
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-success">
                                <div class="card-body">
                                    <h6 class="card-title text-muted">Items Received</h6>
                                    <h3 class="text-success" id="totalItemsReceived">0</h3>
                                    <small class="text-muted">
                                        <i class="bi bi-check-circle"></i> <span id="acceptedItems">0</span> accepted
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-danger">
                                <div class="card-body">
                                    <h6 class="card-title text-muted">Items Rejected</h6>
                                    <h3 class="text-danger" id="totalRejected">0</h3>
                                    <small class="text-muted">
                                        <span id="rejectionRate">0%</span> rejection rate
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-info">
                                <div class="card-body">
                                    <h6 class="card-title text-muted">Pending QC</h6>
                                    <h3 class="text-info" id="pendingQc">0</h3>
                                    <small class="text-muted">
                                        <i class="bi bi-hourglass-split"></i> awaiting inspection
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Charts Section -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Daily Receipt Trend</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="receiptTrendChart" height="150"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Warehouse Distribution</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="warehouseChart" height="150"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quality Analysis -->
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header bg-warning text-dark">
                                    <h6 class="mb-0">Quality Check Summary</h6>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between mb-1">
                                            <span>Pass Rate</span>
                                            <strong id="passRate">0%</strong>
                                        </div>
                                        <div class="progress" style="height: 20px;">
                                            <div class="progress-bar bg-success" id="passRateBar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between mb-1">
                                            <span>Rejection Rate</span>
                                            <strong id="failRate">0%</strong>
                                        </div>
                                        <div class="progress" style="height: 20px;">
                                            <div class="progress-bar bg-danger" id="failRateBar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <hr>
                                    <h6>Top Rejection Reasons</h6>
                                    <ul id="rejectionReasonsList" class="small">
                                        <li>No data available</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Category-wise Receipt</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="categoryReceiptChart" height="120"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed GRN Table -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h6 class="mb-0">GRN Details</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="grnTable">
                                    <thead>
                                        <tr>
                                            <th>GRN #</th>
                                            <th>Date</th>
                                            <th>Supplier</th>
                                            <th>PO #</th>
                                            <th>Warehouse</th>
                                            <th>Items</th>
                                            <th>Received</th>
                                            <th>Accepted</th>
                                            <th>Rejected</th>
                                            <th>QC Status</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="grnTableBody">
                                        <tr>
                                            <td colspan="12" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Item-wise Details -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Item-wise Receipt Summary</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th class="text-end">Total Received</th>
                                            <th class="text-end">Accepted</th>
                                            <th class="text-end">Rejected</th>
                                            <th>UOM</th>
                                            <th>Avg Lead Time</th>
                                            <th>Last Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody id="itemSummaryTable">
                                        <tr>
                                            <td colspan="8" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .btn, .breadcrumb { display: none !important; }
                        .card { page-break-inside: avoid; }
                        canvas { max-height: 300px !important; }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        loadFilters: function() {
            // Load suppliers
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
            
            // Load warehouses
            TempleAPI.get('/inventory/warehouses')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">All Warehouses</option>';
                        $.each(response.data, function(index, warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                        });
                        $('#warehouseFilter').html(options);
                    }
                });
            
            // Load categories
            TempleAPI.get('/products/categories')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">All Categories</option>';
                        $.each(response.data, function(index, category) {
                            options += `<option value="${category.id}">${category.name}</option>`;
                        });
                        $('#categoryFilter').html(options);
                    }
                });
        },
        
        loadReport: function() {
            const filters = this.getFilters();
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/purchase/reports/stock-receipt', filters)
                .done(response => {
                    if (response.success) {
                        this.displaySummary(response.data.summary);
                        this.displayGRNs(response.data.grns);
                        this.displayItemSummary(response.data.items);
                        this.renderCharts(response.data.charts);
                        this.displayQualityAnalysis(response.data.quality);
                    }
                })
                .fail(() => {
                    TempleCore.showToast('Failed to load report', 'error');
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },
        
        getFilters: function() {
            const filters = {
                date_range: $('#dateRange').val(),
                supplier_id: $('#supplierFilter').val(),
                warehouse_id: $('#warehouseFilter').val(),
                status: $('#statusFilter').val(),
                category_id: $('#categoryFilter').val(),
                qc_done: $('#qcFilter').val(),
                grn_type: $('#receiptTypeFilter').val(),
                has_rejections: $('#rejectionFilter').val()
            };
            
            if (filters.date_range === 'custom') {
                filters.from_date = $('#fromDate').val();
                filters.to_date = $('#toDate').val();
            }
            
            return filters;
        },
        
        displaySummary: function(summary) {
            $('#totalGrns').text(summary.total_grns || 0);
            $('#completedGrns').text(summary.completed_grns || 0);
            $('#totalItemsReceived').text(summary.total_items || 0);
            $('#acceptedItems').text(summary.accepted_items || 0);
            $('#totalRejected').text(summary.rejected_items || 0);
            $('#pendingQc').text(summary.pending_qc || 0);
            
            const rejectionRate = summary.total_items > 0 ? 
                ((summary.rejected_items / summary.total_items) * 100).toFixed(1) : 0;
            $('#rejectionRate').text(rejectionRate + '%');
        },
        
        displayGRNs: function(grns) {
            let html = '';
            
            if (grns.length === 0) {
                html = '<tr><td colspan="12" class="text-center">No GRNs found</td></tr>';
            } else {
                $.each(grns, function(index, grn) {
                    const qcBadge = grn.quality_check_done ? 
                        '<span class="badge bg-success">Done</span>' : 
                        '<span class="badge bg-warning">Pending</span>';
                    
                    const statusBadge = grn.status === 'COMPLETED' ? 
                        '<span class="badge bg-success">Completed</span>' :
                        grn.status === 'CANCELLED' ?
                        '<span class="badge bg-danger">Cancelled</span>' :
                        '<span class="badge bg-secondary">Draft</span>';
                    
                    html += `
                        <tr>
                            <td>${grn.grn_number}</td>
                            <td>${TempleCore.formatDate(grn.grn_date)}</td>
                            <td>${grn.supplier_name}</td>
                            <td>${grn.po_number || '-'}</td>
                            <td>${grn.warehouse_name}</td>
                            <td>${grn.item_count}</td>
                            <td class="text-end">${grn.received_quantity}</td>
                            <td class="text-end text-success">${grn.accepted_quantity}</td>
                            <td class="text-end text-danger">${grn.rejected_quantity || 0}</td>
                            <td>${qcBadge}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="TempleRouter.navigate('purchase/grn/view', {id: '${grn.id}'}); return false;">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#grnTableBody').html(html);
        },
        
        displayItemSummary: function(items) {
            let html = '';
            
            if (!items || items.length === 0) {
                html = '<tr><td colspan="8" class="text-center">No item data available</td></tr>';
            } else {
                $.each(items, function(index, item) {
                    html += `
                        <tr>
                            <td>${item.product_name}</td>
                            <td>${item.category_name || '-'}</td>
                            <td class="text-end">${item.total_received}</td>
                            <td class="text-end text-success">${item.total_accepted}</td>
                            <td class="text-end text-danger">${item.total_rejected || 0}</td>
                            <td>${item.uom}</td>
                            <td>${item.avg_lead_time || '-'} days</td>
                            <td>${item.last_receipt ? TempleCore.formatDate(item.last_receipt) : '-'}</td>
                        </tr>
                    `;
                });
            }
            
            $('#itemSummaryTable').html(html);
        },
        
        displayQualityAnalysis: function(quality) {
            if (quality) {
                const passRate = quality.pass_rate || 0;
                const failRate = quality.fail_rate || 0;
                
                $('#passRate').text(passRate + '%');
                $('#failRate').text(failRate + '%');
                $('#passRateBar').css('width', passRate + '%');
                $('#failRateBar').css('width', failRate + '%');
                
                // Rejection reasons
                if (quality.rejection_reasons && quality.rejection_reasons.length > 0) {
                    let reasonsHtml = '';
                    $.each(quality.rejection_reasons.slice(0, 5), function(index, reason) {
                        reasonsHtml += `<li>${reason.reason} (${reason.count} times)</li>`;
                    });
                    $('#rejectionReasonsList').html(reasonsHtml);
                }
            }
        },
        
        renderCharts: function(chartData) {
            // Destroy existing chart if any
            if (this.chartInstance) {
                Object.values(this.chartInstance).forEach(chart => chart.destroy());
            }
            this.chartInstance = {};
            
            // Receipt Trend Chart
            if (chartData.trend) {
                this.chartInstance.trend = new Chart(document.getElementById('receiptTrendChart'), {
                    type: 'line',
                    data: {
                        labels: chartData.trend.labels,
                        datasets: [{
                            label: 'GRNs Created',
                            data: chartData.trend.values,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
            
            // Warehouse Distribution
            if (chartData.warehouse) {
                this.chartInstance.warehouse = new Chart(document.getElementById('warehouseChart'), {
                    type: 'doughnut',
                    data: {
                        labels: chartData.warehouse.labels,
                        datasets: [{
                            data: chartData.warehouse.values,
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
            
            // Category Receipt Chart
            if (chartData.category) {
                this.chartInstance.category = new Chart(document.getElementById('categoryReceiptChart'), {
                    type: 'bar',
                    data: {
                        labels: chartData.category.labels,
                        datasets: [
                            {
                                label: 'Accepted',
                                data: chartData.category.accepted,
                                backgroundColor: 'rgba(75, 192, 192, 0.5)'
                            },
                            {
                                label: 'Rejected',
                                data: chartData.category.rejected,
                                backgroundColor: 'rgba(255, 99, 132, 0.5)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                stacked: true
                            },
                            y: {
                                stacked: true
                            }
                        }
                    }
                });
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            // Date range change
            $('#dateRange').on('change', function() {
                if ($(this).val() === 'custom') {
                    $('#customFromDate, #customToDate').show();
                } else {
                    $('#customFromDate, #customToDate').hide();
                }
            });
            
            // Apply filters
            $('#btnApplyFilter').on('click', function() {
                self.loadReport();
            });
            
            // Reset filters
            $('#btnResetFilter').on('click', function() {
                $('#filterForm')[0].reset();
                $('#customFromDate, #customToDate').hide();
                self.loadReport();
            });
            
            // Export Excel
            $('#btnExportExcel').on('click', function() {
                self.exportExcel();
            });
            
            // Export PDF
            $('#btnExportPdf').on('click', function() {
                self.exportPdf();
            });
        },
        
        exportExcel: function() {
            const filters = this.getFilters();
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/stock-receipt/excel?' + $.param(filters), '_blank');
        },
        
        exportPdf: function() {
            const filters = this.getFilters();
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/stock-receipt/pdf?' + $.param(filters), '_blank');
        }
    };
    
})(jQuery, window);