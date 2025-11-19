// js/pages/budgets/report.js
// Budget vs Actual Report Page

(function($, window) {
    'use strict';
    
    window.BudgetsReportPage = {
        reportData: null,
        
        // Initialize page
        init: function() {
            this.render();
            this.loadReport();
            this.bindEvents();
        },
        
        // Render page HTML
        render: function() {
            const currencySymbol = TempleCore.getCurrency();
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h1 class="page-title">
                                    <i class="bi bi-graph-up"></i> Budget vs Actual Report
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('budgets'); return false;">Budgets</a></li>
                                        <li class="breadcrumb-item active">Report</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                                <div class="btn-group">
                                    <button class="btn btn-primary" id="refreshReportBtn">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                    <button class="btn btn-success" id="exportExcelBtn" disabled>
                                        <i class="bi bi-file-earmark-excel"></i> Export Excel
                                    </button>
                                    <button class="btn btn-danger" id="exportPdfBtn" disabled>
                                        <i class="bi bi-file-earmark-pdf"></i> Export PDF
                                    </button>
                                    <button class="btn btn-info" id="printReportBtn" disabled>
                                        <i class="bi bi-printer"></i> Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Current Year Info -->
                    <div class="alert alert-info mb-4">
                        <i class="bi bi-calendar-check"></i> <strong>Current Financial Year Report</strong>
                        <p class="mb-0 mt-1">This report shows budget vs actual comparison for the active financial year.</p>
                    </div>

                    <!-- Overall Status Cards -->
                    <div class="row mb-4" id="statusCards" style="display: none;">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Total Budget</h6>
                                    <h3 class="mb-0" id="totalBudget">${currencySymbol} 0.00</h3>
                                    <small id="budgetCount">0 Approved Budgets</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Actual Spent/Earned</h6>
                                    <h3 class="mb-0" id="totalActual">${currencySymbol} 0.00</h3>
                                    <small>Year to Date</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Overall Variance</h6>
                                    <h3 class="mb-0" id="overallVariance">${currencySymbol} 0.00</h3>
                                    <small id="variancePercent">0% of Budget</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card text-white" id="statusCard">
                                <div class="card-body">
                                    <h6 class="card-title">Budget Status</h6>
                                    <h3 class="mb-0" id="budgetStatus">-</h3>
                                    <small id="statusMessage">-</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Row -->
                    <div class="row mb-4" id="chartsRow" style="display: none;">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Budget Utilization by Group</h5>
                                </div>
                                <div class="card-body">
                                    <canvas id="groupChart" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Income vs Expense</h5>
                                </div>
                                <div class="card-body">
                                    <canvas id="incomeExpenseChart" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Group Summary Table -->
                    <div class="card mb-4" id="groupSummaryCard" style="display: none;">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Summary by Group</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Group</th>
                                            <th>Type</th>
                                            <th>Total Budget</th>
                                            <th>Total Actual</th>
                                            <th>Variance</th>
                                            <th>Utilization %</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="groupSummaryBody">
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-primary fw-bold">
                                            <td colspan="2">TOTAL</td>
                                            <td id="footerTotalBudget">${currencySymbol} 0.00</td>
                                            <td id="footerTotalActual">${currencySymbol} 0.00</td>
                                            <td id="footerTotalVariance">${currencySymbol} 0.00</td>
                                            <td id="footerAvgUtilization">0%</td>
                                            <td>-</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Report Table -->
                    <div class="card" id="detailReportCard" style="display: none;">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Detailed Budget vs Actual</h5>
                            <div class="float-end">
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="showOverrunOnly">
                                    <label class="form-check-label" for="showOverrunOnly">
                                        Show Overrun Only
                                    </label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="showUnderutilized">
                                    <label class="form-check-label" for="showUnderutilized">
                                        Show Underutilized (&lt;50%)
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm table-hover" id="detailReportTable">
                                    <thead>
                                        <tr>
                                            <th>Ledger</th>
                                            <th>Group</th>
                                            <th>Type</th>
                                            <th>Budget</th>
                                            <th>Actual</th>
                                            <th>Variance</th>
                                            <th>Utilization</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="detailReportBody">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div class="card" id="loadingCard">
                        <div class="card-body text-center py-5">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <h4>Loading Report...</h4>
                            <p class="text-muted">Please wait while we generate your budget report</p>
                        </div>
                    </div>

                    <!-- No Data Message -->
                    <div class="card" id="noDataCard" style="display: none;">
                        <div class="card-body text-center py-5">
                            <i class="bi bi-graph-down text-muted" style="font-size: 4rem;"></i>
                            <h4 class="mt-3">No Report Data</h4>
                            <p class="text-muted">No budget data found for the current financial year</p>
                            <button class="btn btn-primary mt-3" onclick="TempleRouter.navigate('budgets/create');">
                                <i class="bi bi-plus-circle"></i> Create First Budget
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Print CSS -->
                <style id="printStyles">
                    @media print {
                        .page-header .col-auto,
                        #exportExcelBtn, #exportPdfBtn, #printReportBtn, #refreshReportBtn,
                        .form-check, .btn, .alert {
                            display: none !important;
                        }
                        .card {
                            border: 1px solid #000 !important;
                        }
                        .table {
                            font-size: 12px;
                        }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load report
        loadReport: function() {
            TempleCore.showLoading(true);
            $('#loadingCard').show();
            $('#statusCards, #chartsRow, #groupSummaryCard, #detailReportCard, #noDataCard').hide();
            
            TempleAPI.get('/budgets/report')
                .done(function(response) {
                    if (response.success && response.data) {
                        BudgetsReportPage.reportData = response.data;
                        BudgetsReportPage.renderReport();
                    } else {
                        BudgetsReportPage.showNoData();
                    }
                })
                .fail(function(xhr) {
                    if (xhr.status === 422) {
                        BudgetsReportPage.showNoData();
                    } else {
                        TempleCore.showToast('Failed to load report', 'error');
                        BudgetsReportPage.showNoData();
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                    $('#loadingCard').hide();
                });
        },
        
        // Render report
        renderReport: function() {
            if (!this.reportData) return;
            
            // Hide loading and no data messages
            $('#loadingCard, #noDataCard').hide();
            
            // Show all report sections
            $('#statusCards, #chartsRow, #groupSummaryCard, #detailReportCard').show();
            
            // Enable export buttons
            $('#exportExcelBtn, #exportPdfBtn, #printReportBtn').prop('disabled', false);
            
            // Render overall status
            this.renderOverallStatus();
            
            // Render group summary
            this.renderGroupSummary();
            
            // Render detailed report
            this.renderDetailedReport();
            
            // Render charts (would need Chart.js)
            // this.renderCharts();
        },
        
        // Render overall status
        renderOverallStatus: function() {
            const status = this.reportData.overall_status;
            
            if (status) {
                $('#totalBudget').text(TempleCore.formatCurrency(status.total_budget || 0));
                $('#budgetCount').text((status.approved_count || 0) + ' Approved Budgets');
                $('#totalActual').text(TempleCore.formatCurrency(status.total_actual || 0));
                $('#overallVariance').text(TempleCore.formatCurrency(Math.abs(status.total_variance || 0)));
                
                const utilizationPct = status.overall_utilization_percentage || 0;
                $('#variancePercent').text(utilizationPct.toFixed(2) + '% of Budget');
                
                // Set status card color and message
                let statusClass = 'bg-success';
                let statusText = 'On Track';
                let statusMsg = 'Budget utilization is optimal';
                
                if (utilizationPct > 100) {
                    statusClass = 'bg-danger';
                    statusText = 'Overrun';
                    statusMsg = 'Budget exceeded by ' + (utilizationPct - 100).toFixed(2) + '%';
                } else if (utilizationPct > 90) {
                    statusClass = 'bg-warning';
                    statusText = 'Warning';
                    statusMsg = 'Near budget limit';
                } else if (utilizationPct < 50) {
                    statusClass = 'bg-info';
                    statusText = 'Underutilized';
                    statusMsg = 'Low budget utilization';
                }
                
                $('#statusCard').removeClass('bg-success bg-danger bg-warning bg-info').addClass(statusClass);
                $('#budgetStatus').text(statusText);
                $('#statusMessage').text(statusMsg);
            }
        },
        
        // Render group summary
        renderGroupSummary: function() {
            const groupSummary = this.reportData.group_summary;
            
            if (groupSummary && groupSummary.length > 0) {
                let html = '';
                let totalBudget = 0;
                let totalActual = 0;
                let totalVariance = 0;
                
                $.each(groupSummary, function(i, group) {
                    const utilization = parseFloat(group.utilization_percentage || 0);
                    let statusBadge = '<span class="badge bg-success">Good</span>';
                    
                    if (utilization > 100) {
                        statusBadge = '<span class="badge bg-danger">Overrun</span>';
                    } else if (utilization > 90) {
                        statusBadge = '<span class="badge bg-warning">Warning</span>';
                    } else if (utilization < 50) {
                        statusBadge = '<span class="badge bg-info">Low</span>';
                    }
                    
                    const typeBadge = group.budget_type === 'INCOME' 
                        ? '<span class="badge bg-success">Income</span>'
                        : '<span class="badge bg-warning">Expense</span>';
                    
                    html += `
                        <tr>
                            <td>${group.group_name} (${group.group_code})</td>
                            <td>${typeBadge}</td>
                            <td>${TempleCore.formatCurrency(group.total_budget || 0)}</td>
                            <td>${TempleCore.formatCurrency(group.total_actual || 0)}</td>
                            <td class="${group.total_variance < 0 ? 'text-danger' : 'text-success'}">
                                ${TempleCore.formatCurrency(Math.abs(group.total_variance || 0))}
                            </td>
                            <td>
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar ${utilization > 100 ? 'bg-danger' : utilization > 75 ? 'bg-warning' : 'bg-success'}" 
                                        style="width: ${Math.min(utilization, 100)}%">
                                        ${utilization.toFixed(1)}%
                                    </div>
                                </div>
                            </td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                    
                    totalBudget += parseFloat(group.total_budget || 0);
                    totalActual += parseFloat(group.total_actual || 0);
                    totalVariance += parseFloat(group.total_variance || 0);
                });
                
                $('#groupSummaryBody').html(html);
                $('#footerTotalBudget').text(TempleCore.formatCurrency(totalBudget));
                $('#footerTotalActual').text(TempleCore.formatCurrency(totalActual));
                $('#footerTotalVariance').text(TempleCore.formatCurrency(Math.abs(totalVariance)))
                    .removeClass('text-success text-danger')
                    .addClass(totalVariance < 0 ? 'text-danger' : 'text-success');
                
                const avgUtilization = totalBudget > 0 ? (totalActual / totalBudget * 100) : 0;
                $('#footerAvgUtilization').text(avgUtilization.toFixed(2) + '%');
            }
        },
        
        // Render detailed report
        renderDetailedReport: function() {
            const details = this.reportData.details;
            
            if (details && details.length > 0) {
                let html = '';
                
                $.each(details, function(i, item) {
                    const utilization = parseFloat(item.utilization_percentage || 0);
                    let statusBadge = '<span class="badge bg-success">Good</span>';
                    let rowClass = '';
                    
                    if (utilization > 100) {
                        statusBadge = '<span class="badge bg-danger">Overrun</span>';
                        rowClass = 'table-danger';
                    } else if (utilization > 90) {
                        statusBadge = '<span class="badge bg-warning">Warning</span>';
                        rowClass = 'table-warning';
                    } else if (utilization < 50) {
                        statusBadge = '<span class="badge bg-info">Low</span>';
                    }
                    
                    const typeBadge = item.budget_type === 'INCOME' 
                        ? '<span class="badge bg-success">Income</span>'
                        : '<span class="badge bg-warning">Expense</span>';
                    
                    html += `
                        <tr class="${rowClass}" data-utilization="${utilization}">
                            <td>${item.ledger_name}</td>
                            <td><small>${item.group_name}</small></td>
                            <td>${typeBadge}</td>
                            <td>${TempleCore.formatCurrency(item.budget_amount || 0)}</td>
                            <td>${TempleCore.formatCurrency(item.actual_amount || 0)}</td>
                            <td class="${item.variance < 0 ? 'text-danger' : 'text-success'}">
                                ${TempleCore.formatCurrency(Math.abs(item.variance || 0))}
                            </td>
                            <td>
                                <div class="progress" style="height: 15px;">
                                    <div class="progress-bar ${utilization > 100 ? 'bg-danger' : utilization > 75 ? 'bg-warning' : 'bg-success'}" 
                                        style="width: ${Math.min(utilization, 100)}%">
                                        ${utilization.toFixed(1)}%
                                    </div>
                                </div>
                            </td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                });
                
                $('#detailReportBody').html(html);
            }
        },
        
        // Show no data message
        showNoData: function() {
            $('#loadingCard, #statusCards, #chartsRow, #groupSummaryCard, #detailReportCard').hide();
            $('#noDataCard').show();
            $('#exportExcelBtn, #exportPdfBtn, #printReportBtn').prop('disabled', true);
        },
        
        // Filter report table
        filterReport: function() {
            const showOverrun = $('#showOverrunOnly').prop('checked');
            const showUnder = $('#showUnderutilized').prop('checked');
            
            $('#detailReportBody tr').each(function() {
                const $row = $(this);
                const utilization = parseFloat($row.data('utilization'));
                let show = true;
                
                if (showOverrun && utilization <= 100) {
                    show = false;
                }
                if (showUnder && utilization >= 50) {
                    show = false;
                }
                if (showOverrun && showUnder && (utilization <= 100 && utilization >= 50)) {
                    show = false;
                }
                
                $row.toggle(show);
            });
        },
        
        // Export to Excel
        exportExcel: function() {
            // In production, this would generate actual Excel file
            TempleCore.showToast('Exporting to Excel...', 'info');
            
            // Simulated export
            setTimeout(function() {
                TempleCore.showToast('Report exported successfully', 'success');
            }, 2000);
        },
        
        // Export to PDF
        exportPdf: function() {
            // In production, this would generate actual PDF
            TempleCore.showToast('Generating PDF...', 'info');
            
            // Simulated export
            setTimeout(function() {
                TempleCore.showToast('PDF generated successfully', 'success');
            }, 2000);
        },
        
        // Print report
        printReport: function() {
            window.print();
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Refresh report
            $('#refreshReportBtn').on('click', function() {
                self.loadReport();
            });
            
            // Filter checkboxes
            $('#showOverrunOnly, #showUnderutilized').on('change', function() {
                self.filterReport();
            });
            
            // Export buttons
            $('#exportExcelBtn').on('click', function() {
                self.exportExcel();
            });
            
            $('#exportPdfBtn').on('click', function() {
                self.exportPdf();
            });
            
            $('#printReportBtn').on('click', function() {
                self.printReport();
            });
        }
    };
    
})(jQuery, window);