// js/pages/purchase/reports/purchase-summary.js
// Purchase summary report with charts and analytics

(function($, window) {
    'use strict';
    
    window.PurchaseSummaryPage = {
        chartInstances: {},
        
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
                            <h4 class="page-title">Purchase Summary Report</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Summary Report</li>
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
                                    <div class="col-md-3" id="customDateContainer" style="display: none;">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="fromDate">
                                    </div>
                                    <div class="col-md-3" id="customDateToContainer" style="display: none;">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="toDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Supplier</label>
                                        <select class="form-select" id="supplierFilter">
                                            <option value="">All Suppliers</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Category</label>
                                        <select class="form-select" id="categoryFilter">
                                            <option value="">All Categories</option>
                                            <option value="products">Products</option>
                                            <option value="services">Services</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary me-2" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Apply Filter
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="btnResetFilter">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Total Purchase Orders</h6>
                                    <h3 id="totalPOs">0</h3>
                                    <small><i class="bi bi-graph-up"></i> <span id="poChange">0%</span> from last period</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Total Purchase Value</h6>
                                    <h3 id="totalValue">0.00</h3>
                                    <small><i class="bi bi-graph-up"></i> <span id="valueChange">0%</span> from last period</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Pending Payments</h6>
                                    <h3 id="pendingPayments">0.00</h3>
                                    <small><span id="pendingCount">0</span> invoices pending</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Active Suppliers</h6>
                                    <h3 id="activeSuppliers">0</h3>
                                    <small><span id="newSuppliers">0</span> new this period</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Charts Row -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Purchase Trend</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="purchaseTrendChart" height="150"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Top Suppliers</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="topSuppliersChart" height="150"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Category Distribution -->
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Category Distribution</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="categoryChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Monthly Comparison</h6>
                                </div>
                                <div class="card-body">
                                    <canvas id="monthlyComparisonChart" height="120"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed Table -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Purchase Details</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="purchaseDetailsTable">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>PO Number</th>
                                            <th>Supplier</th>
                                            <th>Items</th>
                                            <th class="text-end">Amount</th>
                                            <th>Payment Status</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="purchaseTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-light">
                                            <th colspan="4">Total</th>
                                            <th class="text-end" id="tableTotal">0.00</th>
                                            <th colspan="3"></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .btn, .breadcrumb, .card-header { 
                            background-color: #f8f9fa !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        canvas { 
                            max-height: 200px !important; 
                        }
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
        },
        
        loadReport: function() {
            const filters = this.getFilters();
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/purchase/reports/summary', filters)
                .done(response => {
                    if (response.success) {
                        this.displaySummary(response.data);
                        this.renderCharts(response.data);
                        this.displayTable(response.data.details || []);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load report', 'error');
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
                category: $('#categoryFilter').val()
            };
            
            if (filters.date_range === 'custom') {
                filters.from_date = $('#fromDate').val();
                filters.to_date = $('#toDate').val();
            }
            
            return filters;
        },
        
        displaySummary: function(data) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            $('#totalPOs').text(data.total_pos || 0);
            $('#totalValue').text(currency + (data.total_value || 0).toFixed(2));
            $('#pendingPayments').text(currency + (data.pending_payments || 0).toFixed(2));
            $('#activeSuppliers').text(data.active_suppliers || 0);
            
            // Change indicators with arrow icons
            const poChangeValue = data.po_change || 0;
            const valueChangeValue = data.value_change || 0;
            
            $('#poChange').html(this.formatChangeIndicator(poChangeValue));
            $('#valueChange').html(this.formatChangeIndicator(valueChangeValue));
            $('#pendingCount').text(data.pending_count || 0);
            $('#newSuppliers').text(data.new_suppliers || 0);
        },
        
        formatChangeIndicator: function(value) {
            if (value > 0) {
                return `<i class="bi bi-arrow-up"></i> ${value}%`;
            } else if (value < 0) {
                return `<i class="bi bi-arrow-down"></i> ${Math.abs(value)}%`;
            } else {
                return `<i class="bi bi-dash"></i> 0%`;
            }
        },
        
        renderCharts: function(data) {
            // Destroy existing charts
            Object.values(this.chartInstances).forEach(chart => {
                if (chart) chart.destroy();
            });
            this.chartInstances = {};
            
            // Purchase Trend Chart
            if (data.trend_data) {
                const ctx = document.getElementById('purchaseTrendChart').getContext('2d');
                this.chartInstances.trend = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.trend_data.labels || [],
                        datasets: [{
                            label: 'Purchase Value',
                            data: data.trend_data.values || [],
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return currency + context.parsed.y.toFixed(2);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return currency + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Top Suppliers Chart
            if (data.top_suppliers) {
                const ctx = document.getElementById('topSuppliersChart').getContext('2d');
                this.chartInstances.suppliers = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.top_suppliers.names || [],
                        datasets: [{
                            label: 'Purchase Value',
                            data: data.top_suppliers.values || [],
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.5)',
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(153, 102, 255, 0.5)',
                                'rgba(255, 159, 64, 0.5)',
                                'rgba(255, 99, 132, 0.5)'
                            ],
                            borderColor: [
                                'rgba(54, 162, 235, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)',
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
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return currency + context.parsed.y.toFixed(2);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return currency + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Category Distribution Chart
            if (data.category_data) {
                const ctx = document.getElementById('categoryChart').getContext('2d');
                this.chartInstances.category = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.category_data.labels || [],
                        datasets: [{
                            data: data.category_data.values || [],
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.5)',
                                'rgba(54, 162, 235, 0.5)',
                                'rgba(255, 206, 86, 0.5)',
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(153, 102, 255, 0.5)'
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return context.label + ': ' + currency + context.parsed.toFixed(2);
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Monthly Comparison Chart
            if (data.monthly_data) {
                const ctx = document.getElementById('monthlyComparisonChart').getContext('2d');
                this.chartInstances.monthly = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.monthly_data.months || [],
                        datasets: [
                            {
                                label: 'Current Year',
                                data: data.monthly_data.current || [],
                                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Previous Year',
                                data: data.monthly_data.previous || [],
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgba(255, 99, 132, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return context.dataset.label + ': ' + currency + context.parsed.y.toFixed(2);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        const currency = TempleCore.formatCurrency(0).split('0')[0];
                                        return currency + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        },
        
        displayTable: function(details) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            let total = 0;
            
            if (details.length === 0) {
                html = '<tr><td colspan="8" class="text-center">No data found</td></tr>';
            } else {
                $.each(details, function(index, item) {
                    total += parseFloat(item.total_amount || 0);
                    
                    const paymentBadge = item.payment_status === 'PAID' ? 
                        '<span class="badge bg-success">Paid</span>' :
                        item.payment_status === 'PARTIAL' ?
                        '<span class="badge bg-warning">Partial</span>' :
                        '<span class="badge bg-danger">Unpaid</span>';
                    
                    const statusBadge = item.status === 'APPROVED' ? 
                        '<span class="badge bg-success">Approved</span>' :
                        item.status === 'PENDING_APPROVAL' ?
                        '<span class="badge bg-warning">Pending</span>' :
                        '<span class="badge bg-secondary">Draft</span>';
                    
                    html += `
                        <tr>
                            <td>${TempleCore.formatDate(item.po_date)}</td>
                            <td><strong>${item.po_number}</strong></td>
                            <td>${item.supplier_name}</td>
                            <td>${item.item_count || 0}</td>
                            <td class="text-end">${currency}${parseFloat(item.total_amount || 0).toFixed(2)}</td>
                            <td>${paymentBadge}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="TempleRouter.navigate('purchase/orders/view', {id: '${item.id}'}); return false;" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#purchaseTableBody').html(html);
            $('#tableTotal').text(currency + total.toFixed(2));
        },
        
        bindEvents: function() {
            const self = this;
            
            // Date range change
            $('#dateRange').on('change', function() {
                if ($(this).val() === 'custom') {
                    $('#customDateContainer, #customDateToContainer').show();
                    // Set default dates
                    const today = new Date();
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    $('#fromDate').val(lastMonth.toISOString().split('T')[0]);
                    $('#toDate').val(today.toISOString().split('T')[0]);
                } else {
                    $('#customDateContainer, #customDateToContainer').hide();
                }
            });
            
            // Apply filter
            $('#btnApplyFilter').on('click', function() {
                self.loadReport();
            });
            
            // Reset filter
            $('#btnResetFilter').on('click', function() {
                $('#filterForm')[0].reset();
                $('#customDateContainer, #customDateToContainer').hide();
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
            const queryString = $.param(filters);
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/summary/excel?' + queryString, '_blank');
        },
        
        exportPdf: function() {
            const filters = this.getFilters();
            const queryString = $.param(filters);
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/summary/pdf?' + queryString, '_blank');
        }
    };
    
})(jQuery, window);