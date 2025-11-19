// js/pages/fund-budgets/report.js
// Fund Budget Reports Page - FIXED VERSION

(function ($, window) {
    'use strict';

    window.FundBudgetsReportPage = {
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
        templeSettings: null,
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
            this.loadTempleSettings();

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
            return TempleCore.getCurrency(this.templeCurrency);
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
                                
                              
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Fund</label>
                                    <select class="form-select" id="fundFilter">
                                        <option value="">All Jobs</option>
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
                                        <option value="fund">Job</option>
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
                                        <i class="bi bi-cash-stack fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">Remaining Budget</h6>
                                            <h3 class="mb-0" id="statRemainingBudget">-</h3>
                                        </div>
                                        <i class="bi bi-piggy-bank fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-1">Utilization Rate</h6>
                                            <h3 class="mb-0" id="statUtilizationRate">-</h3>
                                        </div>
                                        <i class="bi bi-percent fs-1 opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Report Content -->
                    <div id="reportContent">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading report...</span>
                            </div>
                            <p class="mt-3">Generating report...</p>
                        </div>
                    </div>
                </div>
            `;

            // CRITICAL FIX: Insert the HTML into the page container
            $('#page-container').html(html);

        },

        // Load funds for filter
        loadFunds: function () {
            const self = this;

            TempleAPI.get('/accounts/funds', {
                params: { per_page: 1000 }
            })
                .then(function (response) {
                    const funds = response.data || [];

                    // Populate fund filter dropdown
                    const $fundFilter = $('#fundFilter');
                    $fundFilter.find('option:not(:first)').remove();

                    funds.forEach(function (fund) {
                        $fundFilter.append(`<option value="${fund.id}">${fund.name}</option>`);
                    });
                })
                .catch(function (error) {
                    console.error('Error loading funds:', error);
                });
        },

        // Load report data
        // Load report data
        loadReport: function () {
            const self = this;

            // Show loader
            $('#reportContent').html(`
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading report...</span>
            </div>
            <p class="mt-3">Generating report...</p>
        </div>
    `);

            // Build query parameters
            const params = {
                report_type: this.reportType,

                from_date: this.currentFilters.from_date,
                to_date: this.currentFilters.to_date,
                group_by: this.currentFilters.group_by
            };

            if (this.currentFilters.fund_id) {
                params.fund_id = this.currentFilters.fund_id;
            }

            // API call
            TempleAPI.get('/fund-budgets/report', { params: params })
                .then(function (response) {
                    self.reportData = response;
                    self.updateQuickStats();
                    self.renderReport();
                })
                .catch(function (error) {
                    console.error('Error loading report:', error);
                    $('#reportContent').html(`
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading report. Please try again.
                </div>
            `);
                });
        },

        // Update quick stats
        updateQuickStats: function () {
            if (!this.reportData || !this.reportData.summary) return;

            const summary = this.reportData.summary;

            $('#statTotalBudget').text(this.formatCurrency(summary.total_budget_amount));
            $('#statTotalUtilized').text(this.formatCurrency(summary.total_utilized));
            $('#statRemainingBudget').text(this.formatCurrency(summary.total_budget_amount - summary.total_utilized));
            $('#statUtilizationRate').text(this.formatPercentage((summary.total_utilized / summary.total_budget_amount * 100) || 0));
        },

        // Render report based on type
        renderReport: function () {
            console.log('Rendering report type:', this.reportType);

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
                default:
                    this.renderSummaryReport();
            }
        },

        // Render summary report
        renderSummaryReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) {
                $('#reportContent').html('<div class="alert alert-info">No data available</div>');
                return;
            }

            let html = `
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Budget Summary</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Fund</th>
                                        <th>Budget Name</th>
                                        <th>Period</th>
                                        <th class="text-end">Budget Amount</th>
                                        <th class="text-end">Utilized</th>
                                        <th class="text-end">Remaining</th>
                                        <th class="text-end">Utilization %</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            data.budgets.forEach(budget => {
                const remaining = budget.budget_amount - budget.utilized_amount;
                const utilizationPercent = (budget.utilized_amount / budget.budget_amount * 100) || 0;

                let statusBadge = 'success';
                let statusText = budget.status;

                if (utilizationPercent >= 90) {
                    statusBadge = 'danger';
                    statusText = 'Critical';
                } else if (utilizationPercent >= 75) {
                    statusBadge = 'warning';
                    statusText = 'Warning';
                }

                html += `
                    <tr>
                        <td>${budget.fund}</td>
                        <td>${budget.budget_name}</td>
                        <td>${budget.period}</td>
                        <td class="text-end">${this.formatCurrency(budget.budget_amount)}</td>
                        <td class="text-end">${this.formatCurrency(budget.utilized_amount)}</td>
                        <td class="text-end">${this.formatCurrency(remaining)}</td>
                        <td class="text-end">
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar bg-${statusBadge}" role="progressbar" 
                                     style="width: ${utilizationPercent}%"
                                     aria-valuenow="${utilizationPercent}" aria-valuemin="0" aria-valuemax="100">
                                    ${utilizationPercent.toFixed(1)}%
                                </div>
                            </div>
                        </td>
                        <td><span class="badge bg-${statusBadge}">${statusText}</span></td>
                    </tr>
                `;
            });

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Budget Distribution</h6>
                            </div>
                            <div class="card-body">
                                <canvas id="budgetDistributionChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Utilization Overview</h6>
                            </div>
                            <div class="card-body">
                                <canvas id="utilizationChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Analysis -->
                <div class="mt-4" id="analysisContent"></div>
            `;

            $('#reportContent').html(html);

            // Render charts
            this.renderCharts();
            this.renderAnalysis();
        },

        // Render detailed report
        renderDetailedReport: function () {
            const data = this.reportData;
            if (!data || !data.budgets) {
                $('#reportContent').html('<div class="alert alert-info">No data available</div>');
                return;
            }

            let html = '<div class="card"><div class="card-header"><h5 class="mb-0">Detailed Budget Report</h5></div><div class="card-body">';

            data.budgets.forEach(budget => {
                const remaining = budget.budget_amount - budget.utilized_amount;
                const utilizationPercent = (budget.utilized_amount / budget.budget_amount * 100) || 0;

                html += `
                    <div class="border-bottom pb-3 mb-3">
                        <h6>${budget.fund} - ${budget.budget_name}</h6>
                        <div class="row mt-2">
                            <div class="col-md-3">
                                <small class="text-muted">Period</small>
                                <div>${budget.period}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Budget Amount</small>
                                <div class="fw-bold">${this.formatCurrency(budget.budget_amount)}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Utilized</small>
                                <div class="fw-bold text-primary">${this.formatCurrency(budget.utilized_amount)}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Remaining</small>
                                <div class="fw-bold text-success">${this.formatCurrency(remaining)}</div>
                            </div>
                        </div>
                        <div class="mt-2">
                            <div class="progress" style="height: 25px;">
                                <div class="progress-bar" role="progressbar" style="width: ${utilizationPercent}%">
                                    ${utilizationPercent.toFixed(1)}% Utilized
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div></div>';
            $('#reportContent').html(html);
        },

        // Render comparison report
        renderComparisonReport: function () {
            const self = this;
            const data = this.reportData;

            if (!data || !data.comparisons || data.comparisons.length === 0) {
                $('#reportContent').html(`
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> No comparison data available
            </div>
        `);
                return;
            }
            const comparisonType = data.comparison_type || 'fund';

            let html = `
        <div class="card">
            <div class="card-header">
                <h5><i class="bi bi-bar-chart-steps"></i> Budget Comparison Report</h5>
                <p class="text-muted mb-0">Comparison Type: <strong>${comparisonType.toUpperCase()}</strong></p>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-primary">
                            <tr>
                                <th>${comparisonType === 'fund' ? 'Fund' : (comparisonType === 'period' ? 'Period' : 'Year')}</th>
                                <th class="text-end">Total Budget</th>
                                <th class="text-end">Utilized</th>
                                <th class="text-end">Remaining</th>
                                <th class="text-end">Utilization %</th>
                                <th class="text-end">Budget Count</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

            data.comparisons.forEach(function (item) {
                const label = item.fund ? item.fund.name : (item.period || item.year || '-');
                const utilizationClass = item.utilization_rate > 80 ? 'success'
                    : (item.utilization_rate > 50 ? 'warning' : 'danger');

                html += `
            <tr>
                <td><strong>${label}</strong></td>
                <td class="text-end">${self.formatCurrency(item.total_budget)}</td>
                <td class="text-end">${self.formatCurrency(item.total_utilized)}</td>
                <td class="text-end">${self.formatCurrency(item.total_remaining)}</td>
                <td class="text-end">
                    <span class="badge bg-${utilizationClass}">
                        ${self.formatPercentage(item.utilization_rate)}
                    </span>
                </td>
                <td class="text-end">${item.budget_count}</td>
            </tr>
        `;
            });

            html += `
                        </tbody>
                    </table>
                </div>

                <!-- Comparison Chart -->
                <div class="row mt-4">
                    <div class="col-md-12">
                        <canvas id="comparisonChart" height="100"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

            $('#reportContent').html(html);

            //  Render chart
            this.renderComparisonChart(data.comparisons, comparisonType);
        },

        renderComparisonChart: function (comparisons, comparisonType) {
            const self = this;
            const ctx = document.getElementById('comparisonChart');
            if (!ctx) return;

            const labels = comparisons.map(item =>
                item.fund ? item.fund.name : (item.period || item.year)
            );

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total Budget',
                            data: comparisons.map(item => item.total_budget),
                            backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        },
                        {
                            label: 'Utilized',
                            data: comparisons.map(item => item.total_utilized),
                            backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        },
                        {
                            label: 'Remaining',
                            data: comparisons.map(item => item.total_remaining),
                            backgroundColor: 'rgba(75, 192, 192, 0.8)',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return self.formatCurrency(value);
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': ' + self.formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    }
                }
            });
        },







        // Render charts
        renderCharts: function () {
            const data = this.reportData;
            if (!data || !data.budgets) return;

            // Destroy existing charts
            if (this.chartInstances.distribution) this.chartInstances.distribution.destroy();
            if (this.chartInstances.utilization) this.chartInstances.utilization.destroy();

            // Budget Distribution Chart
            const distributionCtx = document.getElementById('budgetDistributionChart');
            if (distributionCtx) {
                this.chartInstances.distribution = new Chart(distributionCtx, {
                    type: 'doughnut',
                    data: {
                        labels: data.budgets.map(b => b.budget_name),
                        datasets: [{
                            data: data.budgets.map(b => b.budget_amount),
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.8)',
                                'rgba(255, 99, 132, 0.8)',
                                'rgba(255, 206, 86, 0.8)',
                                'rgba(75, 192, 192, 0.8)',
                                'rgba(153, 102, 255, 0.8)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }

            // Utilization Chart
            const utilizationCtx = document.getElementById('utilizationChart');
            if (utilizationCtx) {
                this.chartInstances.utilization = new Chart(utilizationCtx, {
                    type: 'bar',
                    data: {
                        labels: data.budgets.map(b => b.budget_name),
                        datasets: [
                            {
                                label: 'Budget Amount',
                                data: data.budgets.map(b => b.budget_amount),
                                backgroundColor: 'rgba(54, 162, 235, 0.8)'
                            },
                            {
                                label: 'Utilized',
                                data: data.budgets.map(b => b.utilized_amount),
                                backgroundColor: 'rgba(255, 99, 132, 0.8)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: (value) => this.getCurrencySymbol() + ' ' + value.toLocaleString()
                                }
                            }
                        }
                    }
                });
            }
        },

        // Render analysis
        renderAnalysis: function () {
            const data = this.reportData;
            if (!data || !data.budgets || data.budgets.length === 0) return;

            const utilizationRate = ((data.summary.total_utilized / data.summary.total_budget_amount) * 100).toFixed(1);

            // Find top utilized and under-utilized budgets
            const sorted = [...data.budgets].sort((a, b) => {
                const aUtil = (a.utilized_amount / a.budget_amount) * 100;
                const bUtil = (b.utilized_amount / b.budget_amount) * 100;
                return bUtil - aUtil;
            });

            const topUtilized = sorted.slice(0, Math.min(5, sorted.length));
            const underUtilized = sorted.slice(-Math.min(5, sorted.length)).reverse();

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
                const utilPercent = ((budget.utilized_amount / budget.budget_amount) * 100).toFixed(1);
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${budget.budget_name}</span>
                        <span class="badge bg-danger">${utilPercent}%</span>
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
                const utilPercent = ((budget.utilized_amount / budget.budget_amount) * 100).toFixed(1);
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${budget.budget_name}</span>
                        <span class="badge bg-success">${utilPercent}%</span>
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
                                    <li>Budgets requiring attention (≥90%): <strong>${data.budgets.filter(b => (b.utilized_amount / b.budget_amount * 100) >= 90).length}</strong></li>
                                    <li>Average utilization: <strong>${(data.budgets.reduce((sum, b) => sum + (b.utilized_amount / b.budget_amount * 100), 0) / data.budgets.length).toFixed(1)}%</strong></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#analysisContent').html(html);
        },
        loadTempleSettings: function () {
            const self = this;

            // Fetch fresh settings from server
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function (response) {
                    if (response.success && response.data && response.data.values) {
                        self.templeSettings = response.data.values;

                        // Update localStorage for backup
                        localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify({
                            name: self.templeSettings.temple_name || '',
                            address: self.templeSettings.temple_address || '',
                            city: self.templeSettings.temple_city || '',
                            state: self.templeSettings.temple_state || '',
                            pincode: self.templeSettings.temple_pincode || '',
                            country: self.templeSettings.temple_country || 'Malaysia',
                            phone: self.templeSettings.temple_phone || '',
                            email: self.templeSettings.temple_email || ''
                        }));
                    } else {
                        // Fallback to localStorage if API fails
                        self.templeSettings = JSON.parse(
                            localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}'
                        );
                    }
                })
                .fail(function () {
                    // Fallback to localStorage if API fails
                    self.templeSettings = JSON.parse(
                        localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}'
                    );
                });
        },
        // Bind events
        bindEvents: function () {
            const self = this;

            // Report type change
            $('#reportTypeSelect').on('change', function () {
                self.reportType = $(this).val();
                self.renderReport();
            });
            $('#reportTypeSelect').on('change', function () {
                self.reportType = $(this).val();

                if (self.reportType === 'comparison' || self.reportType === 'utilization') {
                    self.loadReport();

                } else {
                    self.loadReport();
                    $('#generateReportBtn').removeClass('btn-warning').addClass('btn-primary');
                }
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



            // Print
            $('#printReportBtn').on('click', function () {
                self.printReport();
            });
        },
        printReport: function () {
            const self = this;

            if (!this.reportData) {
                Swal.fire('No Data', 'Please generate a report first', 'warning');
                return;
            }

            // Ensure temple settings are loaded
            if (!this.templeSettings) {
                TempleCore.showLoading(true);
                this.loadTempleSettings();

                setTimeout(function () {
                    TempleCore.showLoading(false);
                    self.openPrintWindow();
                }, 1000);
            } else {
                this.openPrintWindow();
            }
        },
        renderUtilizationReport: function () {
            const data = this.reportData;

            // Check if data is available - FIXED: Check for correct property
            if (!data || !data.budgets || data.budgets.length === 0) {
                $('#reportContent').html(`
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> No utilization data available
            </div>
        `);
                return;
            }

            console.log('Rendering utilization report:', data);

            // FIXED: Transform the summary data into the format needed for display
            const summary = data.summary || {};
            const budgets = data.budgets || [];
            const ledgerWise = data.ledger_wise || [];

            // Calculate overall totals from the summary categories
            let totalBudgets = 0;
            let totalBudget = 0;
            let totalUtilized = 0;
            let avgUtilization = 0;

            // Aggregate from all categories
            const categories = ['under_utilized', 'moderate', 'well_utilized', 'over_utilized'];
            categories.forEach(cat => {
                if (summary[cat]) {
                    totalBudgets += summary[cat].count || 0;
                    totalBudget += parseFloat(summary[cat].total_budget || 0);
                    totalUtilized += parseFloat(summary[cat].total_utilized || 0);
                }
            });

            avgUtilization = totalBudget > 0 ? (totalUtilized / totalBudget) * 100 : 0;

            // FIXED: Create by_status data for the table from summary
            const byStatusData = [
                {
                    status: 'Under Utilized (<50%)',
                    count: summary.under_utilized?.count || 0,
                    total_budget: summary.under_utilized?.total_budget || 0,
                    total_utilized: summary.under_utilized?.total_utilized || 0,
                    category: 'under_utilized'
                },
                {
                    status: 'Moderate (50-80%)',
                    count: summary.moderate?.count || 0,
                    total_budget: summary.moderate?.total_budget || 0,
                    total_utilized: summary.moderate?.total_utilized || 0,
                    category: 'moderate'
                },
                {
                    status: 'Well Utilized (80-100%)',
                    count: summary.well_utilized?.count || 0,
                    total_budget: summary.well_utilized?.total_budget || 0,
                    total_utilized: summary.well_utilized?.total_utilized || 0,
                    category: 'well_utilized'
                },
                {
                    status: 'Over Utilized (>100%)',
                    count: summary.over_utilized?.count || 0,
                    total_budget: summary.over_utilized?.total_budget || 0,
                    total_utilized: summary.over_utilized?.total_utilized || 0,
                    category: 'over_utilized'
                }
            ];

            let html = `
        <div class="report-section">
            <h4 class="section-title">Budget Utilization Analysis</h4>
            
            <!-- Summary Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-label">Total Budgets</div>
                        <div class="stat-value">${totalBudgets}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-label">Total Budget Amount</div>
                        <div class="stat-value">${this.formatCurrency(totalBudget)}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-label">Total Utilized</div>
                        <div class="stat-value">${this.formatCurrency(totalUtilized)}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <div class="stat-label">Average Utilization</div>
                        <div class="stat-value">${this.formatPercentage(avgUtilization)}</div>
                    </div>
                </div>
            </div>

            <!-- Utilization by Category -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5>Utilization by Category</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Count</th>
                                    <th>Total Budget</th>
                                    <th>Total Utilized</th>
                                    <th>Remaining</th>
                                    <th>Utilization %</th>
                                </tr>
                            </thead>
                            <tbody>
    `;

            byStatusData.forEach(item => {
                const remaining = (item.total_budget || 0) - (item.total_utilized || 0);
                const utilizationPct = item.total_budget > 0
                    ? ((item.total_utilized / item.total_budget) * 100)
                    : 0;

                html += `
            <tr>
                <td><span class="badge bg-${this.getCategoryBadgeClass(item.category)}">${item.status}</span></td>
                <td>${item.count || 0}</td>
                <td>${this.formatCurrency(item.total_budget || 0)}</td>
                <td>${this.formatCurrency(item.total_utilized || 0)}</td>
                <td>${this.formatCurrency(remaining)}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" 
                             role="progressbar" 
                             style="width: ${Math.min(utilizationPct, 100)}%"
                             aria-valuenow="${utilizationPct}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${utilizationPct.toFixed(1)}%
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
                </div>
            </div>

            <!-- Budget Details -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5>Budget Details</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Budget Name</th>
                                    <th>Fund</th>
                                    <th>Budget Amount</th>
                                    <th>Utilized</th>
                                    <th>Remaining</th>
                                    <th>Utilization %</th>
                                    <th>Category</th>
                                </tr>
                            </thead>
                            <tbody>
    `;

            budgets.forEach(budget => {
                const remaining = (budget.budget_amount || 0) - (budget.utilized_amount || 0);
                const utilPct = budget.utilization_percentage || 0;

                html += `
            <tr>
                <td>${budget.budget_name || 'N/A'}</td>
                <td>${budget.fund_name || 'N/A'}</td>
                <td>${this.formatCurrency(budget.budget_amount || 0)}</td>
                <td>${this.formatCurrency(budget.utilized_amount || 0)}</td>
                <td>${this.formatCurrency(remaining)}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" 
                             role="progressbar" 
                             style="width: ${Math.min(utilPct, 100)}%">
                            ${utilPct.toFixed(1)}%
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-${this.getCategoryBadgeClass(budget.category)}">${this.formatCategoryName(budget.category)}</span></td>
            </tr>
        `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Ledger-wise Utilization -->
            ${ledgerWise.length > 0 ? `
            <div class="card">
                <div class="card-header">
                    <h5>Ledger-wise Utilization</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Ledger/Expense Category</th>
                                    <th>Budgeted</th>
                                    <th>Utilized</th>
                                    <th>Remaining</th>
                                    <th>Utilization %</th>
                                </tr>
                            </thead>
                            <tbody>
    ` : ''}
    `;

            if (ledgerWise.length > 0) {
                ledgerWise.forEach(ledger => {
                    const utilPct = ledger.utilization_percentage || 0;

                    html += `
                <tr>
                    <td>${ledger.ledger || 'N/A'}</td>
                    <td>${this.formatCurrency(ledger.budgeted || 0)}</td>
                    <td>${this.formatCurrency(ledger.utilized || 0)}</td>
                    <td>${this.formatCurrency(ledger.remaining || 0)}</td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" 
                                 role="progressbar" 
                                 style="width: ${Math.min(utilPct, 100)}%">
                                ${utilPct.toFixed(1)}%
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
                </div>
            </div>
            `;
            }

            html += `
        </div>
    `;

            $('#reportContent').html(html);

            // Draw chart with the transformed data
            this.drawUtilizationChart(byStatusData);
        },
        getCategoryBadgeClass: function (category) {
            const badges = {
                'under_utilized': 'warning',
                'moderate': 'info',
                'well_utilized': 'success',
                'over_utilized': 'danger'
            };
            return badges[category] || 'secondary';
        },
        formatCategoryName: function (category) {
            const names = {
                'under_utilized': 'Under Utilized',
                'moderate': 'Moderate',
                'well_utilized': 'Well Utilized',
                'over_utilized': 'Over Utilized'
            };
            return names[category] || category;
        },
        drawUtilizationChart: function (data) {
            const ctx = document.getElementById('utilizationChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.utilizationChart) {
                this.chartInstances.utilizationChart.destroy();
            }

            const labels = data.map(item => item.status);
            const utilized = data.map(item => item.total_utilized || 0);
            const remaining = data.map(item => (item.total_budget || 0) - (item.total_utilized || 0));

            this.chartInstances.utilizationChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Utilized',
                            data: utilized,
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Remaining',
                            data: remaining,
                            backgroundColor: 'rgba(255, 206, 86, 0.7)',
                            borderColor: 'rgba(255, 206, 86, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return TempleCore.getCurrency() + ' ' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': ' + TempleCore.getCurrency() + ' ' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        },
        drawTimelineChart: function (data) {
            const ctx = document.getElementById('timelineChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.timelineChart) {
                this.chartInstances.timelineChart.destroy();
            }

            const labels = data.map(item => item.period);
            const budgeted = data.map(item => item.budgeted || 0);
            const utilized = data.map(item => item.utilized || 0);

            this.chartInstances.timelineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Budgeted',
                            data: budgeted,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Utilized',
                            data: utilized,
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderWidth: 2,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return TempleCore.getCurrency() + ' ' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        },

        // Draw recurring chart
        drawRecurringChart: function (data) {
            const ctx = document.getElementById('recurringChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.recurringChart) {
                this.chartInstances.recurringChart.destroy();
            }

            const patterns = ['monthly', 'quarterly', 'half_yearly', 'yearly'];
            const labels = patterns.map(p => this.formatPattern(p));
            const counts = patterns.map(p => data[p]?.count || 0);
            const budgets = patterns.map(p => data[p]?.total_budget || 0);

            this.chartInstances.recurringChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Count',
                            data: counts,
                            backgroundColor: 'rgba(153, 102, 255, 0.7)',
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Total Budget',
                            data: budgets,
                            backgroundColor: 'rgba(255, 159, 64, 0.7)',
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Count'
                            }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            beginAtZero: true,
                            grid: {
                                drawOnChartArea: false
                            },
                            title: {
                                display: true,
                                text: 'Budget Amount'
                            },
                            ticks: {
                                callback: function (value) {
                                    return TempleCore.getCurrency() + ' ' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        },
        drawSummaryChart: function (data) {
            const ctx = document.getElementById('summaryChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.summaryChart) {
                this.chartInstances.summaryChart.destroy();
            }

            const labels = data.map(item => item.fund_name || 'N/A');
            const budgeted = data.map(item => item.budget_amount || 0);
            const utilized = data.map(item => item.utilized_amount || 0);

            this.chartInstances.summaryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Budgeted',
                            data: budgeted,
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Utilized',
                            data: utilized,
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return TempleCore.getCurrency() + ' ' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': ' + TempleCore.getCurrency() + ' ' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        },
        openPrintWindow: function () {
            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                Swal.fire('Pop-up Blocked', 'Please allow pop-ups to print the report', 'warning');
                return;
            }

            const html = this.generatePrintHTML();

            printWindow.document.write(html);
            printWindow.document.close();

            // Auto-print after a short delay
            setTimeout(() => {
                printWindow.print();
            }, 500);
        },
        generatePrintHTML: function () {
            const temple = this.templeSettings || {};
            const fromDate = this.formatDate(this.currentFilters.from_date);
            const toDate = this.formatDate(this.currentFilters.to_date);
            const currency = this.getCurrencySymbol();
            const data = this.reportData;

            // Generate logo HTML (same as receipt print)
            let logoHTML = '';
            const logo = temple.temple_logo || temple.logo;
            if (logo) {
                const logoSrc = logo.startsWith('data:image') ? logo :
                    logo.startsWith('http') ? logo :
                        `data:image/png;base64,${logo}`;
                logoHTML = `<img src="${logoSrc}" alt="Temple Logo" style="width: 205px;
    height: 131px;
    object-fit: contain;">`;
            }

            // Build budget rows based on report type
            let budgetRows = '';
            let sNo = 1;

            if (data.budgets && data.budgets.length > 0) {
                data.budgets.forEach(budget => {
                    const utilPercent = budget.budget_amount > 0 ?
                        ((budget.utilized_amount / budget.budget_amount) * 100).toFixed(2) : '0.00';

                    const remaining = budget.budget_amount - budget.utilized_amount;

                    budgetRows += `
                        <tr>
                            <td align="left">${sNo++}</td>
                            <td>${budget.fund || 'N/A'}</td>
                            <td>${budget.budget_name || 'N/A'}</td>
                            <td align="left">${currency} ${parseFloat(budget.budget_amount || 0).toFixed(2)}</td>
                            <td align="left">${currency} ${parseFloat(budget.utilized_amount || 0).toFixed(2)}</td>
                            <td align="left">${currency} ${parseFloat(remaining).toFixed(2)}</td>
                            <td align="left">${utilPercent}%</td>
                            <td align="left">
                                    ${budget.status || 'Active'}
                            </td>
                        </tr>
                    `;
                });
            }

            // Generate report title based on type
            let reportTitle = 'Fund Budget Report';
            switch (this.reportType) {
                case 'summary': reportTitle = 'Fund Budget Summary Report'; break;
                case 'detailed': reportTitle = 'Fund Budget Detailed Report'; break;
                case 'comparison': reportTitle = 'Fund Budget Comparison Report'; break;
                case 'utilization': reportTitle = 'Fund Budget Utilization Report'; break;



            }

            // Fund filter name
            const fundName = $('#fundFilter option:selected').text() || 'All Jobs';

            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${reportTitle} - ${fromDate} to ${toDate}</title>
                    <style>
                        @media print {
                            body { 
                                margin: 0; 
                                padding: 20px;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .no-print { display: none !important; }
                            .page-break { page-break-before: always; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 12px;
                            line-height: 1.4;
                            color: #333;
                        }
                        
                        /* Control buttons */
                        .btn {
                            padding: 8px 16px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        }
                        
                        .btn-primary {
                            background-color: #007bff;
                            color: white;
                        }
                        
                        .btn-info {
                            background-color: #17a2b8;
                            color: white;
                        }
                        
                        .btn:hover {
                            opacity: 0.8;
                        }
                        
                        /* Info grid */
                        .info-grid {
                            margin: 20px 0;
                            
                            padding: 15px;
                           
                        }
                        
                        .info-row {
                            display: grid;
                            grid-template-columns: 150px 1fr 150px 1fr;
                            gap: 10px;
                            margin-bottom: 8px;
                            font-size: 14px;
                        }
                        
                        .info-label {
                            font-weight: bold;
                        }
                        
                        .info-value {
                            color: #555;
                        }
                        
                        /* Section titles */
                        .section-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin: 30px 0 15px 0;
                            padding-bottom: 8px;
                        
                        }
                        
                        /* Tables */
                        table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        
                        .budget-table {
                            margin-top: 20px;
                        }
                        
                        .budget-table th {
                       
                            border-top: 1px solid #000;
                            border-bottom: 1px solid #000;
                            padding: 10px 5px;
                            text-align: left;
                            font-weight: bold;
                            font-size: 13px;
                        }
                        
                        .budget-table td {
                            padding: 8px 5px;
                            border-bottom: 1px solid #ddd;
                            font-size: 12px;
                        }
                        
                        .budget-table tbody tr:hover {
                            background: #f9f9f9;
                        }
                        
                        .budget-table tfoot tr {
                            font-weight: bold;
                            font-size: 14px;
                            background: #f5f5f5;
                            border-top: 1px solid #000;
                        }
                        
                        .budget-table tfoot td {
                            padding: 12px 5px;
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons (hidden on print) - Same as receipt print -->
                    <table width="750" border="0" align="center" id="controlButtons" class="no-print" style="margin-bottom: 20px;">
                        <tr>
                            <td width="550"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Header - SAME STRUCTURE AS RECEIPT PRINT -->
                    <div class="header-container">
                        <table width="750" border="0" align="center">
                            <tr>
                                <td width="120" valign="top">
                                    ${logoHTML}
                                </td>
                                <td width="580" align="left" valign="top" style="font-size:13px; padding-left: 20px;">
                                    <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                                    <br>${temple.temple_address || temple.address || 'Temple Address'}
                                    <br>${temple.temple_city || temple.city ? (temple.temple_city || temple.city) + ', ' : ''}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                                    <br>${temple.temple_country || temple.country || 'Malaysia'}
                                    ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                                    ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                                </td>
                                <td width="50"></td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Report Title -->
                    <table width="750" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                                ${reportTitle}
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Report Info -->
                    <div style="width: 750px; margin: 20px auto;">
                        <div class="info-grid">
                            <div class="info-row">
                                <div class="info-label">Date Range:</div>
                                <div class="info-value">${fromDate} to ${toDate}</div>
                                <div class="info-label">Job:</div>
                                <div class="info-value">${fundName}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">Total Budget:</div>
                                <div class="info-value"><strong>${currency} ${parseFloat(data.summary?.total_budget_amount || 0).toFixed(2)}</strong></div>
                                <div class="info-label">Total Utilized:</div>
                                <div class="info-value"><strong>${currency} ${parseFloat(data.summary?.total_utilized || 0).toFixed(2)}</strong></div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">Remaining:</div>
                                <div class="info-value"><strong>${currency} ${parseFloat((data.summary?.total_budget_amount || 0) - (data.summary?.total_utilized || 0)).toFixed(2)}</strong></div>
                                <div class="info-label">Utilization Rate:</div>
                                <div class="info-value"><strong>${data.summary?.total_budget_amount > 0 ? ((data.summary.total_utilized / data.summary.total_budget_amount) * 100).toFixed(2) : '0.00'}%</strong></div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">Report Type:</div>
                                <div class="info-value">${this.reportType.charAt(0).toUpperCase() + this.reportType.slice(1)}</div>
                                <div class="info-label">Total Budgets:</div>
                                <div class="info-value">${data.summary?.total_budgets || 0}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Budget Details Section -->
                    <div style="width: 750px; margin: 0 auto;">
                        <div class="section-title">Budget Details</div>
                        <table class="budget-table">
                            <thead>
                                <tr>
                                    <th width="5%">S.No</th>
                                    <th width="20%">Job</th>
                                    <th width="25%">Budget Name</th>
                                    <th width="12%">Budget Amount</th>
                                    <th width="12%">Utilized</th>
                                    <th width="12%">Remaining</th>
                                    <th width="8%">Util %</th>
                                    <th width="6%">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${budgetRows || '<tr><td colspan="8" align="center" style="padding: 20px;">No budget data available</td></tr>'}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" align="right">TOTAL</td>
                                    <td align="right">${currency} ${parseFloat(data.summary?.total_budget_amount || 0).toFixed(2)}</td>
                                    <td align="right">${currency} ${parseFloat(data.summary?.total_utilized || 0).toFixed(2)}</td>
                                    <td align="right">${currency} ${parseFloat((data.summary?.total_budget_amount || 0) - (data.summary?.total_utilized || 0)).toFixed(2)}</td>
                                    <td align="center">${data.summary?.total_budget_amount > 0 ? ((data.summary.total_utilized / data.summary.total_budget_amount) * 100).toFixed(2) : '0.00'}%</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <!-- Footer -->
                    <div style="width: 750px; margin: 60px auto 20px auto; font-size: 12px; color: #666; text-align: center;">
                        Generated on ${new Date().toLocaleString('en-MY', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}
                    </div>
                </body>
                </html>
            `;
        },
        // Export to PDF
        exportPDF: function () {
            Swal.fire('Export PDF', 'PDF export functionality would be implemented here', 'info');
        },
        formatDate: function (dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate().toString().padStart(2, '0')}/${months[date.getMonth()]}/${date.getFullYear()}`;
        },
        // Export to Excel
        exportExcel: function () {
            Swal.fire('Export Excel', 'Excel export functionality would be implemented here', 'info');
        }
    };

})(jQuery, window);