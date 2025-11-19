// js/pages/report/index.js
// Fund Budget Reports Page

(function ($, window) {
    'use strict';

    window.ReportPage = {
        reportType: 'summary',
        currentFilters: {
            fund_id: null,
            from_date: null,
            to_date: null,
            group_by: 'fund',
            comparison_type: null
        },
        chartInstances: {},
        templeCurrency: null,
        reportData: null,

        // Initialize page
        init: function () {
            // Get temple settings
            const temple = TempleCore.getTemple();
            this.templeCurrency = temple.currency || 'MYR';

            // Set default dates (current accounting year)
            this.setDefaultDates();

            this.render();
            this.bindEvents();
            this.loadFunds();
            this.loadReport();
        },

        // Set default date range
        setDefaultDates: function () {
            const now = new Date();
            const year = now.getFullYear();

            // Default to current year
            this.currentFilters.from_date = `${year}-01-01`;
            this.currentFilters.to_date = `${year}-12-31`;
        },

        // Get currency symbol
        getCurrencySymbol: function () {
            return TempleCore.getCurrencySymbol(this.templeCurrency);
        },

        // Format currency
        formatCurrency: function (amount) {
            return this.getCurrencySymbol() + ' ' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        // Format percentage
        formatPercentage: function (value) {
            return parseFloat(value || 0).toFixed(2) + '%';
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h1 class="page-title">
                                    <i class="bi bi-graph-up"></i> Fund Budget Reports
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item">
                                            <a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a>
                                        </li>
                                        <li class="breadcrumb-item">
                                            <a href="#" onclick="TempleRouter.navigate('fund-budgets'); return false;">Fund Budgets</a>
                                        </li>
                                        <li class="breadcrumb-item active">Reports</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                                <div class="btn-group">
                                    <button class="btn btn-primary" id="exportPdfBtn">
                                        <i class="bi bi-file-pdf"></i> Export PDF
                                    </button>
                                    <button class="btn btn-success" id="exportExcelBtn">
                                        <i class="bi bi-file-excel"></i> Export Excel
                                    </button>
                                    <button class="btn btn-info" id="printReportBtn">
                                        <i class="bi bi-printer"></i> Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Report Filters -->
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h5 class="mb-0"><i class="bi bi-funnel"></i> Report Filters</h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Report Type</label>
                                    <select class="form-select" id="reportTypeSelect">
                                        <option value="summary">Summary Report</option>
                                        <option value="detailed">Detailed Report</option>
                                        <option value="comparison">Comparison Report</option>
                                        <option value="utilization">Utilization Report</option>
                                        <option value="variance">Variance Analysis</option>
                                        <option value="timeline">Timeline Report</option>
                                        <option value="recurring">Recurring Budget Analysis</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Fund</label>
                                    <select class="form-select" id="fundFilter">
                                        <option value="">All Funds</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="fromDateFilter" value="${this.currentFilters.from_date}">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="toDateFilter" value="${this.currentFilters.to_date}">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Group By</label>
                                    <select class="form-select" id="groupBySelect">
                                        <option value="fund">Fund</option>
                                        <option value="month">Month</option>
                                        <option value="quarter">Quarter</option>
                                        <option value="status">Status</option>
                                        <option value="ledger">Expense Category</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <button class="btn btn-primary" id="generateReportBtn">
                                        <i class="bi bi-search"></i> Generate Report
                                    </button>
                                    <button class="btn btn-secondary" id="resetFiltersBtn">
                                        <i class="bi bi-arrow-clockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Stats Cards -->
                    <div class="row mb-4" id="quickStats">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">Total Budget</h6>
                                            <h3 class="mb-0" id="statTotalBudget">-</h3>
                                        </div>
                                        <i class="bi bi-wallet2 fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">Total Utilized</h6>
                                            <h3 class="mb-0" id="statTotalUtilized">-</h3>
                                        </div>
                                        <i class="bi bi-graph-up-arrow fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">Remaining</h6>
                                            <h3 class="mb-0" id="statRemaining">-</h3>
                                        </div>
                                        <i class="bi bi-piggy-bank fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">Utilization %</h6>
                                            <h3 class="mb-0" id="statUtilization">-</h3>
                                        </div>
                                        <i class="bi bi-percent fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Report Content Area -->
                    <div class="card">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#tableView">
                                        <i class="bi bi-table"></i> Table View
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#chartView">
                                        <i class="bi bi-bar-chart"></i> Chart View
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#analysisView">
                                        <i class="bi bi-clipboard-data"></i> Analysis
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <!-- Table View -->
                                <div class="tab-pane fade show active" id="tableView">
                                    <div id="reportTableContent">
                                        <div class="text-center py-5">
                                            <i class="bi bi-bar-chart text-muted" style="font-size: 3rem;"></i>
                                            <p class="text-muted">Select filters and click "Generate Report" to view data</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Chart View -->
                                <div class="tab-pane fade" id="chartView">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <canvas id="budgetChart"></canvas>
                                        </div>
                                        <div class="col-md-6">
                                            <canvas id="utilizationChart"></canvas>
                                        </div>
                                    </div>
                                    <div class="row mt-4">
                                        <div class="col-md-12">
                                            <canvas id="trendChart"></canvas>
                                        </div>
                                    </div>
                                </div>

                                <!-- Analysis View -->
                                <div class="tab-pane fade" id="analysisView">
                                    <div id="analysisContent">
                                        <!-- Analysis content will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#main-content').html(html);
        },

        // Load funds for dropdown
        loadFunds: function () {
            TempleAPI.get('/accounts/funds')
                .done((response) => {
                    console.log(response);
                    if (response.success) {
                        const select = $('#fundFilter');
                        select.empty().append('<option value="">Select Fund</option>');

                        response.data.forEach(fund => {
                            select.append(`<option value="${fund.id}">${fund.name}</option>`);
                        });
                    }
                })
                .fail((xhr) => {
                    console.error('Failed to load funds:', xhr);
                });
        },


        // Load report data
        loadReport: function () {
            const params = {
                fund_id: this.currentFilters.fund_id,
                from_date: this.currentFilters.from_date,
                to_date: this.currentFilters.to_date
            };

            // Show loading spinner
            $('#reportTableContent').html(`
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Generating report...</p>
        </div>
    `);

            // Fetch report data using TempleAPI
            TempleAPI.get('/fund-budgets/report', params)
                .done((response) => {
                    if (response.success) {
                        this.reportData = response.data;
                        this.updateQuickStats(response.data.summary);
                        this.renderReport();
                        this.renderCharts();
                        this.renderAnalysis();
                    } else {
                        $('#reportTableContent').html(`
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-circle"></i> No data found for the selected filters
                    </div>
                `);
                    }
                })
                .fail((xhr) => {
                    console.error('Failed to load report data:', xhr);
                    $('#reportTableContent').html(`
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load report data
                </div>
            `);
                });
        },

        // Update quick stats cards
        updateQuickStats: function (summary) {
            $('#statTotalBudget').text(this.formatCurrency(summary.total_budget_amount || 0));
            $('#statTotalUtilized').text(this.formatCurrency(summary.total_utilized || 0));
            $('#statRemaining').text(this.formatCurrency(summary.total_remaining || 0));

            const utilizationPercent = summary.total_budget_amount > 0
                ? ((summary.total_utilized / summary.total_budget_amount) * 100).toFixed(1)
                : 0;
            $('#statUtilization').text(utilizationPercent + '%');

            // Update card colors based on utilization
            const utilizationCard = $('#statUtilization').closest('.card');
            utilizationCard.removeClass('bg-warning bg-danger bg-success');

            if (utilizationPercent >= 90) {
                utilizationCard.addClass('bg-danger');
            } else if (utilizationPercent >= 75) {
                utilizationCard.addClass('bg-warning');
            } else {
                utilizationCard.addClass('bg-success');
            }
        },

        // Render report based on type
        renderReport: function () {
            switch (this.reportType) {
                case 'summary':
                    this.renderSummaryReport();
                    break;
                case 'detailed':
                    this.renderDetailedReport();
                    break;
                case 'comparison':
                    this.renderComparisonReport();
                    break;
                case 'utilization':
                    this.renderUtilizationReport();
                    break;
                case 'variance':
                    this.renderVarianceReport();
                    break;
                case 'timeline':
                    this.renderTimelineReport();
                    break;
                case 'recurring':
                    this.renderRecurringReport();
                    break;
                default:
                    this.renderSummaryReport();
            }
        },

        // Render summary report
        renderSummaryReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) return;

            let html = `
                <h5 class="mb-3">Fund Budget Summary Report</h5>
                <div class="table-responsive">
                    <table class="table table-hover table-striped">
                        <thead class="table-dark">
                            <tr>
                                <th>Fund</th>
                                <th>No. of Budgets</th>
                                <th class="text-end">Total Budget</th>
                                <th class="text-end">Utilized</th>
                                <th class="text-end">Remaining</th>
                                <th class="text-center">Utilization %</th>
                                <th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Group by fund
            const fundGroups = {};
            data.budgets.forEach(budget => {
                const fundName = budget.fund;
                if (!fundGroups[fundName]) {
                    fundGroups[fundName] = {
                        count: 0,
                        totalBudget: 0,
                        totalUtilized: 0,
                        budgets: []
                    };
                }
                fundGroups[fundName].count++;
                fundGroups[fundName].totalBudget += parseFloat(budget.total_budget || 0);
                fundGroups[fundName].totalUtilized += parseFloat(budget.total_utilized || 0);
                fundGroups[fundName].budgets.push(budget);
            });

            // Render each fund group
            Object.keys(fundGroups).forEach(fundName => {
                const group = fundGroups[fundName];
                const remaining = group.totalBudget - group.totalUtilized;
                const utilization = group.totalBudget > 0
                    ? ((group.totalUtilized / group.totalBudget) * 100).toFixed(1)
                    : 0;

                const utilizationClass = utilization >= 90 ? 'danger' :
                    utilization >= 75 ? 'warning' : 'success';

                html += `
                    <tr>
                        <td><strong>${fundName}</strong></td>
                        <td>${group.count}</td>
                        <td class="text-end">${this.formatCurrency(group.totalBudget)}</td>
                        <td class="text-end">${this.formatCurrency(group.totalUtilized)}</td>
                        <td class="text-end">${this.formatCurrency(remaining)}</td>
                        <td class="text-center">
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar bg-${utilizationClass}" 
                                     style="width: ${utilization}%">
                                    ${utilization}%
                                </div>
                            </div>
                        </td>
                        <td class="text-center">
                            <span class="badge bg-${utilizationClass}">
                                ${utilization >= 90 ? 'Critical' : utilization >= 75 ? 'Warning' : 'Good'}
                            </span>
                        </td>
                    </tr>
                `;
            });

            // Add totals row
            html += `
                        </tbody>
                        <tfoot class="table-secondary">
                            <tr>
                                <th>TOTAL</th>
                                <th>${data.summary.total_budgets}</th>
                                <th class="text-end">${this.formatCurrency(data.summary.total_budget_amount)}</th>
                                <th class="text-end">${this.formatCurrency(data.summary.total_utilized)}</th>
                                <th class="text-end">${this.formatCurrency(data.summary.total_remaining)}</th>
                                <th colspan="2"></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            $('#reportTableContent').html(html);
        },

        // Render detailed report
        renderDetailedReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) return;

            let html = `
                <h5 class="mb-3">Detailed Fund Budget Report</h5>
                <div class="table-responsive">
                    <table class="table table-hover table-sm">
                        <thead class="table-dark">
                            <tr>
                                <th>Budget Name</th>
                                <th>Fund</th>
                                <th>Period</th>
                                <th>Status</th>
                                <th class="text-end">Budget</th>
                                <th class="text-end">Utilized</th>
                                <th class="text-end">Remaining</th>
                                <th>%</th>
                                <th>Items</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.budgets.forEach(budget => {
                const utilizationClass = budget.utilization_percentage >= 90 ? 'danger' :
                    budget.utilization_percentage >= 75 ? 'warning' : 'success';

                const statusBadge = {
                    'DRAFT': 'secondary',
                    'SUBMITTED': 'warning',
                    'APPROVED': 'success',
                    'REJECTED': 'danger',
                    'CLOSED': 'dark'
                };

                html += `
                    <tr class="budget-main-row">
                        <td>
                            <strong>${budget.budget_name}</strong>
                            ${budget.is_active ? '<span class="badge bg-info ms-2">Active</span>' : ''}
                        </td>
                        <td>${budget.fund}</td>
                        <td>${budget.period}</td>
                        <td>
                            <span class="badge bg-${statusBadge[budget.status] || 'secondary'}">
                                ${budget.status}
                            </span>
                        </td>
                        <td class="text-end">${this.formatCurrency(budget.total_budget)}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_utilized)}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_remaining)}</td>
                        <td>
                            <span class="badge bg-${utilizationClass}">
                                ${budget.utilization_percentage}%
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-info" 
                                    onclick="ReportPage.toggleItems('${budget.budget_name}')">
                                <i class="bi bi-chevron-down"></i> ${budget.items ? budget.items.length : 0} items
                            </button>
                        </td>
                    </tr>
                `;

                // Add expandable items rows
                if (budget.items && budget.items.length > 0) {
                    html += `
                        <tr class="budget-items-row d-none" data-budget="${budget.budget_name}">
                            <td colspan="9">
                                <div class="ps-4">
                                    <table class="table table-sm table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Ledger</th>
                                                <th class="text-end">Budgeted</th>
                                                <th class="text-end">Utilized</th>
                                                <th class="text-end">Remaining</th>
                                                <th>Utilization</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                    `;

                    budget.items.forEach(item => {
                        const itemUtilClass = item.percentage >= 90 ? 'danger' :
                            item.percentage >= 75 ? 'warning' : 'success';
                        html += `
                            <tr>
                                <td>${item.ledger}</td>
                                <td class="text-end">${this.formatCurrency(item.budgeted)}</td>
                                <td class="text-end">${this.formatCurrency(item.utilized)}</td>
                                <td class="text-end">${this.formatCurrency(item.remaining)}</td>
                                <td>
                                    <div class="progress" style="height: 15px;">
                                        <div class="progress-bar bg-${itemUtilClass}" 
                                             style="width: ${item.percentage}%">
                                            ${item.percentage}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });

                    html += `
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#reportTableContent').html(html);
        },

        // Render comparison report
        renderComparisonReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) return;

            let html = `
                <h5 class="mb-3">Fund Budget Comparison Report</h5>
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Comparing budgets across different periods for trend analysis
                </div>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Fund</th>
                                <th>Period</th>
                                <th class="text-end">Budget</th>
                                <th class="text-end">Actual</th>
                                <th class="text-end">Variance</th>
                                <th>Variance %</th>
                                <th>Trend</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Group by fund and sort by period
            const fundComparisons = {};
            data.budgets.forEach(budget => {
                if (!fundComparisons[budget.fund]) {
                    fundComparisons[budget.fund] = [];
                }
                fundComparisons[budget.fund].push(budget);
            });

            Object.keys(fundComparisons).forEach(fundName => {
                const fundBudgets = fundComparisons[fundName].sort((a, b) =>
                    new Date(a.period.split(' - ')[0]) - new Date(b.period.split(' - ')[0])
                );

                let previousUtilized = null;
                fundBudgets.forEach((budget, index) => {
                    const variance = budget.total_budget - budget.total_utilized;
                    const variancePercent = budget.total_budget > 0
                        ? ((variance / budget.total_budget) * 100).toFixed(1)
                        : 0;

                    let trend = '';
                    if (previousUtilized !== null) {
                        if (budget.total_utilized > previousUtilized) {
                            trend = '<i class="bi bi-arrow-up-circle text-danger"></i>';
                        } else if (budget.total_utilized < previousUtilized) {
                            trend = '<i class="bi bi-arrow-down-circle text-success"></i>';
                        } else {
                            trend = '<i class="bi bi-dash-circle text-warning"></i>';
                        }
                    }

                    const varianceClass = variance > 0 ? 'text-success' : variance < 0 ? 'text-danger' : '';

                    html += `
                        <tr>
                            <td>${index === 0 ? `<strong>${fundName}</strong>` : ''}</td>
                            <td>${budget.period}</td>
                            <td class="text-end">${this.formatCurrency(budget.total_budget)}</td>
                            <td class="text-end">${this.formatCurrency(budget.total_utilized)}</td>
                            <td class="text-end ${varianceClass}">
                                ${variance >= 0 ? '+' : ''}${this.formatCurrency(variance)}
                            </td>
                            <td>
                                <span class="badge ${variance > 0 ? 'bg-success' : 'bg-danger'}">
                                    ${variancePercent}%
                                </span>
                            </td>
                            <td>${trend}</td>
                        </tr>
                    `;

                    previousUtilized = budget.total_utilized;
                });
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#reportTableContent').html(html);
        },

        // Render utilization report
        renderUtilizationReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) return;

            // Categorize budgets by utilization level
            const categories = {
                critical: [],  // >= 90%
                warning: [],   // 75-89%
                normal: [],    // 50-74%
                low: []        // < 50%
            };

            data.budgets.forEach(budget => {
                const util = budget.utilization_percentage;
                if (util >= 90) categories.critical.push(budget);
                else if (util >= 75) categories.warning.push(budget);
                else if (util >= 50) categories.normal.push(budget);
                else categories.low.push(budget);
            });

            let html = `
                <h5 class="mb-3">Budget Utilization Report</h5>
                
                <!-- Utilization Summary Cards -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card border-danger">
                            <div class="card-body text-center">
                                <h2 class="text-danger">${categories.critical.length}</h2>
                                <p class="mb-0">Critical (=90%)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-warning">
                            <div class="card-body text-center">
                                <h2 class="text-warning">${categories.warning.length}</h2>
                                <p class="mb-0">Warning (75-89%)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-info">
                            <div class="card-body text-center">
                                <h2 class="text-info">${categories.normal.length}</h2>
                                <p class="mb-0">Normal (50-74%)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-success">
                            <div class="card-body text-center">
                                <h2 class="text-success">${categories.low.length}</h2>
                                <p class="mb-0">Low (<50%)</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Critical budgets alert
            if (categories.critical.length > 0) {
                html += `
                    <div class="alert alert-danger">
                        <h6 class="alert-heading">?? Critical Utilization Budgets</h6>
                        <p>The following budgets have exceeded or are near their limits:</p>
                        <ul class="mb-0">
                `;
                categories.critical.forEach(budget => {
                    html += `<li>${budget.budget_name} - ${budget.utilization_percentage}% utilized</li>`;
                });
                html += `</ul></div>`;
            }

            // Detailed utilization table
            html += `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Budget Name</th>
                                <th>Fund</th>
                                <th class="text-end">Budget Amount</th>
                                <th class="text-end">Utilized</th>
                                <th class="text-end">Remaining</th>
                                <th>Utilization</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.budgets.sort((a, b) => b.utilization_percentage - a.utilization_percentage)
                .forEach(budget => {
                    const utilizationClass = budget.utilization_percentage >= 90 ? 'danger' :
                        budget.utilization_percentage >= 75 ? 'warning' :
                            budget.utilization_percentage >= 50 ? 'info' : 'success';

                    // Calculate days left
                    const endDate = new Date(budget.period.split(' - ')[1]);
                    const today = new Date();
                    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                    const daysLeftBadge = daysLeft < 0 ? 'Expired' : `${daysLeft} days`;

                    html += `
                    <tr>
                        <td><strong>${budget.budget_name}</strong></td>
                        <td>${budget.fund}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_budget)}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_utilized)}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_remaining)}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="progress flex-grow-1" style="height: 25px;">
                                    <div class="progress-bar bg-${utilizationClass}" 
                                         style="width: ${budget.utilization_percentage}%">
                                        ${budget.utilization_percentage}%
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${daysLeft < 7 ? 'bg-danger' : 'bg-secondary'}">
                                ${daysLeftBadge}
                            </span>
                        </td>
                    </tr>
                `;
                });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#reportTableContent').html(html);
        },

        // Render variance report
        renderVarianceReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) return;

            let html = `
                <h5 class="mb-3">Budget Variance Analysis Report</h5>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Budget Name</th>
                                <th>Fund</th>
                                <th class="text-end">Budgeted</th>
                                <th class="text-end">Actual</th>
                                <th class="text-end">Variance Amount</th>
                                <th>Variance %</th>
                                <th>Analysis</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            let totalBudgeted = 0;
            let totalActual = 0;

            data.budgets.forEach(budget => {
                const variance = budget.total_budget - budget.total_utilized;
                const variancePercent = budget.total_budget > 0
                    ? ((Math.abs(variance) / budget.total_budget) * 100).toFixed(1)
                    : 0;

                const isOverBudget = variance < 0;
                const varianceClass = isOverBudget ? 'text-danger' : 'text-success';

                let analysis = '';
                if (isOverBudget) {
                    analysis = `<span class="badge bg-danger">Over Budget</span>`;
                } else if (variancePercent > 30) {
                    analysis = `<span class="badge bg-success">Under Utilized</span>`;
                } else if (variancePercent < 10) {
                    analysis = `<span class="badge bg-info">On Track</span>`;
                } else {
                    analysis = `<span class="badge bg-warning">Within Range</span>`;
                }

                totalBudgeted += budget.total_budget;
                totalActual += budget.total_utilized;

                html += `
                    <tr>
                        <td><strong>${budget.budget_name}</strong></td>
                        <td>${budget.fund}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_budget)}</td>
                        <td class="text-end">${this.formatCurrency(budget.total_utilized)}</td>
                        <td class="text-end ${varianceClass}">
                            ${isOverBudget ? '(' : ''}${this.formatCurrency(Math.abs(variance))}${isOverBudget ? ')' : ''}
                        </td>
                        <td>
                            <span class="badge ${isOverBudget ? 'bg-danger' : 'bg-success'}">
                                ${isOverBudget ? '-' : '+'}${variancePercent}%
                            </span>
                        </td>
                        <td>${analysis}</td>
                    </tr>
                `;
            });

            // Add summary row
            const totalVariance = totalBudgeted - totalActual;
            const totalVariancePercent = totalBudgeted > 0
                ? ((Math.abs(totalVariance) / totalBudgeted) * 100).toFixed(1)
                : 0;

            html += `
                        </tbody>
                        <tfoot class="table-secondary">
                            <tr>
                                <th colspan="2">TOTAL</th>
                                <th class="text-end">${this.formatCurrency(totalBudgeted)}</th>
                                <th class="text-end">${this.formatCurrency(totalActual)}</th>
                                <th class="text-end ${totalVariance < 0 ? 'text-danger' : 'text-success'}">
                                    ${totalVariance < 0 ? '(' : ''}${this.formatCurrency(Math.abs(totalVariance))}${totalVariance < 0 ? ')' : ''}
                                </th>
                                <th>
                                    <span class="badge ${totalVariance < 0 ? 'bg-danger' : 'bg-success'}">
                                        ${totalVariance < 0 ? '-' : '+'}${totalVariancePercent}%
                                    </span>
                                </th>
                                <th></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            $('#reportTableContent').html(html);
        },

        // Toggle budget items visibility
        toggleItems: function (budgetName) {
            const row = $(`tr[data-budget="${budgetName}"]`);
            row.toggleClass('d-none');

            // Change icon
            const btn = $(`button[onclick*="${budgetName}"]`).find('i');
            if (row.hasClass('d-none')) {
                btn.removeClass('bi-chevron-up').addClass('bi-chevron-down');
            } else {
                btn.removeClass('bi-chevron-down').addClass('bi-chevron-up');
            }
        },

        // Render charts
        renderCharts: function () {
            if (!this.reportData) return;

            // Destroy existing charts
            Object.values(this.chartInstances).forEach(chart => chart.destroy());
            this.chartInstances = {};

            // Budget vs Utilized Chart
            this.renderBudgetChart();

            // Utilization Pie Chart
            this.renderUtilizationChart();

            // Trend Line Chart
            this.renderTrendChart();
        },

        // Render budget vs utilized chart
        renderBudgetChart: function () {
            const ctx = document.getElementById('budgetChart');
            if (!ctx) return;

            const data = this.reportData;
            const fundGroups = {};

            data.budgets.forEach(budget => {
                if (!fundGroups[budget.fund]) {
                    fundGroups[budget.fund] = {
                        budget: 0,
                        utilized: 0
                    };
                }
                fundGroups[budget.fund].budget += budget.total_budget;
                fundGroups[budget.fund].utilized += budget.total_utilized;
            });

            const labels = Object.keys(fundGroups);
            const budgetData = labels.map(fund => fundGroups[fund].budget);
            const utilizedData = labels.map(fund => fundGroups[fund].utilized);

            this.chartInstances.budget = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Budget',
                            data: budgetData,
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Utilized',
                            data: utilizedData,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Budget vs Utilized by Fund'
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': ' +
                                        ReportPage.formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return ReportPage.getCurrencySymbol() + ' ' +
                                        value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        },

        // Render utilization pie chart
        renderUtilizationChart: function () {
            const ctx = document.getElementById('utilizationChart');
            if (!ctx) return;

            const data = this.reportData.summary;

            this.chartInstances.utilization = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Utilized', 'Remaining'],
                    datasets: [{
                        data: [data.total_utilized, data.total_remaining],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(75, 192, 192, 0.5)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Overall Budget Utilization'
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = ReportPage.formatCurrency(context.parsed);
                                    const percentage = ((context.parsed / data.total_budget_amount) * 100).toFixed(1);
                                    return label + ': ' + value + ' (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        },

        // Render trend chart
        renderTrendChart: function () {
            const ctx = document.getElementById('trendChart');
            if (!ctx) return;

            const data = this.reportData;

            // Group by month
            const monthlyData = {};
            data.budgets.forEach(budget => {
                const month = moment(budget.period.split(' - ')[0]).format('MMM YYYY');
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        budget: 0,
                        utilized: 0
                    };
                }
                monthlyData[month].budget += budget.total_budget;
                monthlyData[month].utilized += budget.total_utilized;
            });

            const labels = Object.keys(monthlyData);
            const budgetData = labels.map(month => monthlyData[month].budget);
            const utilizedData = labels.map(month => monthlyData[month].utilized);

            this.chartInstances.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Budget',
                            data: budgetData,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.1
                        },
                        {
                            label: 'Utilized',
                            data: utilizedData,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Budget Trend Analysis'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return ReportPage.getCurrencySymbol() + ' ' +
                                        value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        },

        // Render analysis
        renderAnalysis: function () {
            const data = this.reportData;
            if (!data) return;

            const utilizationRate = (data.summary.total_utilized / data.summary.total_budget_amount * 100).toFixed(1);

            // Find top utilized and under-utilized budgets
            const sorted = [...data.budgets].sort((a, b) => b.utilization_percentage - a.utilization_percentage);
            const topUtilized = sorted.slice(0, 5);
            const underUtilized = sorted.slice(-5).reverse();

            let html = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header bg-danger text-white">
                                <h6 class="mb-0">Top Utilized Budgets</h6>
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush">
            `;

            topUtilized.forEach(budget => {
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${budget.budget_name}</span>
                        <span class="badge bg-danger">${budget.utilization_percentage}%</span>
                    </li>
                `;
            });

            html += `
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                <h6 class="mb-0">Under-Utilized Budgets</h6>
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush">
            `;

            underUtilized.forEach(budget => {
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${budget.budget_name}</span>
                        <span class="badge bg-success">${budget.utilization_percentage}%</span>
                    </li>
                `;
            });

            html += `
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-info text-white">
                                <h6 class="mb-0">Key Insights</h6>
                            </div>
                            <div class="card-body">
                                <ul>
                                    <li>Overall utilization rate: <strong>${utilizationRate}%</strong></li>
                                    <li>Total number of budgets: <strong>${data.summary.total_budgets}</strong></li>
                                    <li>Budgets requiring attention (>90%): <strong>${data.budgets.filter(b => b.utilization_percentage >= 90).length}</strong></li>
                                    <li>Average utilization: <strong>${(data.budgets.reduce((sum, b) => sum + b.utilization_percentage, 0) / data.budgets.length).toFixed(1)}%</strong></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#analysisContent').html(html);
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Report type change
            $('#reportTypeSelect').on('change', function () {
                self.reportType = $(this).val();
                self.renderReport();
            });

            // Generate report button
            $('#generateReportBtn').on('click', function () {
                self.currentFilters.fund_id = $('#fundFilter').val() || null;
                self.currentFilters.from_date = $('#fromDateFilter').val();
                self.currentFilters.to_date = $('#toDateFilter').val();
                self.currentFilters.group_by = $('#groupBySelect').val();
                self.loadReport();
            });

            // Reset filters
            $('#resetFiltersBtn').on('click', function () {
                $('#fundFilter').val('');
                self.setDefaultDates();
                $('#fromDateFilter').val(self.currentFilters.from_date);
                $('#toDateFilter').val(self.currentFilters.to_date);
                $('#groupBySelect').val('fund');
                self.loadReport();
            });

            // Export PDF
            $('#exportPdfBtn').on('click', function () {
                self.exportPDF();
            });

            // Export Excel
            $('#exportExcelBtn').on('click', function () {
                self.exportExcel();
            });

            // Print
            $('#printReportBtn').on('click', function () {
                window.print();
            });
        },

        // Export to PDF
        exportPDF: function () {
            // This would integrate with a PDF library like jsPDF
            Swal.fire('Export PDF', 'PDF export functionality would be implemented here', 'info');
        },

        // Export to Excel
        exportExcel: function () {
            // This would integrate with a library like SheetJS
            Swal.fire('Export Excel', 'Excel export functionality would be implemented here', 'info');
        }
    };

})(jQuery, window);