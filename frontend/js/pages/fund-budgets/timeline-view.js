// js/pages/fund-budgets/timeline-view.js
// Fund Budget Timeline View Component with Gantt Chart

(function ($, window) {
    'use strict';

    window.FundBudgetTimeline = {
        isInitialized: false,
        containerId: null,
        currentFilters: {
            fund_id: null,
            from_date: null,
            to_date: null,
            interval: 'monthly'
        },
        timelineData: null,
        chartInstances: {},
        funds: {},
        budgets: [],
        templeCurrency: null,
        currentChartType: 'line', // 'line', 'bar', 'area'

        // Initialize timeline view
        init: function (containerId) {
            console.log('Initializing Fund Budget Timeline');
            this.containerId = containerId;
            
            // Get temple settings
            const temple = JSON.parse(localStorage.getItem('temple') || '{}');
            this.templeCurrency = temple.currency || 'MYR';

            // Set default dates (current year)
            this.setDefaultDates();
            
            this.loadFunds();
            this.render();
            this.bindEvents();
            this.loadTimelineData();
            this.isInitialized = true;
        },

        // Set default date range to current year
        setDefaultDates: function () {
            const now = new Date();
            const year = now.getFullYear();
            this.currentFilters.from_date = `${year}-01-01`;
            this.currentFilters.to_date = `${year}-12-31`;
        },

        // Get currency symbol
        getCurrencySymbol: function () {
            const symbols = {
                'MYR': 'RM',
                'INR': '₹',
                'USD': '$',
                'EUR': '€',
                'GBP': '£',
                'SGD': 'S$',
                'JPY': '¥',
                'CNY': '¥',
                'CAD': 'C$',
                'AUD': 'A$'
            };
            return symbols[this.templeCurrency] || this.templeCurrency;
        },

        // Format currency
        formatCurrency: function (amount) {
            return this.getCurrencySymbol() + ' ' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        // Load funds for filtering
        loadFunds: function () {
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/accounts/funds',
                type: 'GET',
                headers: TempleAPI.getHeaders(),
                async: false,
                success: (response) => {
                    if (response.success) {
                        const colors = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
                            '#98D8C8', '#6C5CE7', '#A8E6CF', '#FFD3B6',
                            '#FF8B94', '#B4A7D6', '#87CEEB', '#DDA0DD'
                        ];
                        
                        response.data.forEach((fund, index) => {
                            this.funds[fund.id] = {
                                ...fund,
                                color: colors[index % colors.length]
                            };
                        });
                    }
                },
                error: (xhr) => {
                    console.error('Error loading funds:', xhr);
                }
            });
        },

        // Render timeline view HTML
        render: function () {
            const html = `
                <div class="timeline-view-container">
                    <!-- Filters Card -->
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h5 class="mb-0"><i class="bi bi-funnel"></i> Timeline Filters</h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Fund</label>
                                    <select class="form-select" id="timelineFundFilter">
                                        <option value="">All Jobs</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="timelineFromDate" value="${this.currentFilters.from_date}">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="timelineToDate" value="${this.currentFilters.to_date}">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Interval</label>
                                    <select class="form-select" id="timelineInterval">
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly" selected>Monthly</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-primary w-100" id="generateTimelineBtn">
                                        <i class="bi bi-bar-chart-line"></i> Generate Timeline
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Total Budget</h6>
                                            <h4 class="mb-0" id="timelineTotalBudget">-</h4>
                                        </div>
                                        <div class="icon-circle bg-primary bg-opacity-10 p-3 rounded-circle">
                                            <i class="bi bi-wallet2 text-primary fs-4"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-success">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Total Utilized</h6>
                                            <h4 class="mb-0" id="timelineTotalUtilized">-</h4>
                                        </div>
                                        <div class="icon-circle bg-success bg-opacity-10 p-3 rounded-circle">
                                            <i class="bi bi-graph-up text-success fs-4"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-info">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Remaining</h6>
                                            <h4 class="mb-0" id="timelineRemaining">-</h4>
                                        </div>
                                        <div class="icon-circle bg-info bg-opacity-10 p-3 rounded-circle">
                                            <i class="bi bi-piggy-bank text-info fs-4"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Avg. Utilization</h6>
                                            <h4 class="mb-0" id="timelineAvgUtilization">-</h4>
                                        </div>
                                        <div class="icon-circle bg-warning bg-opacity-10 p-3 rounded-circle">
                                            <i class="bi bi-percent text-warning fs-4"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline Chart -->
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-graph-up-arrow"></i> Utilization Timeline</h5>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary active" data-chart-type="line">
                                        <i class="bi bi-graph-up"></i> Line
                                    </button>
                                    <button class="btn btn-outline-primary" data-chart-type="bar">
                                        <i class="bi bi-bar-chart"></i> Bar
                                    </button>
                                    <button class="btn btn-outline-primary" data-chart-type="area">
                                        <i class="bi bi-activity"></i> Area
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <canvas id="timelineChart" height="80"></canvas>
                        </div>
                    </div>

                    <!-- Gantt Chart -->
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h5 class="mb-0"><i class="bi bi-calendar-range"></i> Budget Schedule (Gantt View)</h5>
                        </div>
                        <div class="card-body">
                            <div id="ganttChart" style="min-height: 400px;"></div>
                        </div>
                    </div>

                    <!-- Utilization Distribution -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0"><i class="bi bi-pie-chart"></i> Budget Distribution</h5>
                                </div>
                                <div class="card-body">
                                    <canvas id="distributionChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0"><i class="bi bi-bar-chart-fill"></i> Utilization by Period</h5>
                                </div>
                                <div class="card-body">
                                    <canvas id="utilizationBarChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline Table -->
                    <div class="card">
                        <div class="card-header bg-light">
                            <h5 class="mb-0"><i class="bi bi-table"></i> Timeline Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover table-striped">
                                    <thead>
                                        <tr>
                                            <th>Period</th>
                                            <th class="text-end">Budgeted</th>
                                            <th class="text-end">Utilized</th>
                                            <th class="text-end">Remaining</th>
                                            <th class="text-end">Utilization %</th>
                                            <th class="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="timelineTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot class="table-secondary">
                                        <tr>
                                            <th>Total</th>
                                            <th class="text-end" id="footerBudgeted">-</th>
                                            <th class="text-end" id="footerUtilized">-</th>
                                            <th class="text-end" id="footerRemaining">-</th>
                                            <th class="text-end" id="footerPercentage">-</th>
                                            <th></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $(this.containerId).html(html);
            
            // Populate fund filter
            this.renderFundFilter();
        },

        // Render fund filter dropdown
        renderFundFilter: function () {
            const $fundFilter = $('#timelineFundFilter');
            $fundFilter.find('option:not(:first)').remove();
            
            Object.values(this.funds).forEach(fund => {
                $fundFilter.append(`<option value="${fund.id}">${fund.name}</option>`);
            });
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Generate timeline button
            $('#generateTimelineBtn').off('click').on('click', function () {
                self.applyFilters();
            });

            // Chart type switching
            $('[data-chart-type]').off('click').on('click', function () {
                const chartType = $(this).data('chart-type');
                $('[data-chart-type]').removeClass('active');
                $(this).addClass('active');
                self.currentChartType = chartType;
                self.updateChartType(chartType);
            });
        },

        // Apply filters and reload data
        applyFilters: function () {
            this.currentFilters = {
                fund_id: $('#timelineFundFilter').val() || null,
                from_date: $('#timelineFromDate').val(),
                to_date: $('#timelineToDate').val(),
                interval: $('#timelineInterval').val()
            };

            this.loadTimelineData();
        },

        // Load timeline data from API
        loadTimelineData: function () {
            const self = this;

            const params = {
                from_date: this.currentFilters.from_date,
                to_date: this.currentFilters.to_date,
                interval: this.currentFilters.interval
            };

            if (this.currentFilters.fund_id) {
                params.fund_id = this.currentFilters.fund_id;
            }

            $.ajax({
                url: TempleAPI.getBaseUrl() + '/fund-budgets/timeline-report',
                type: 'GET',
                data: params,
                headers: TempleAPI.getHeaders(),
                success: function (response) {
                    if (response.success) {
                        self.timelineData = response.data;
                        self.loadBudgetsForGantt();
                        self.renderTimelineVisualization();
                    }
                },
                error: function (xhr) {
                    console.error('Error loading timeline data:', xhr);
                    TempleCore.showToast('Error loading timeline data', 'error');
                }
            });
        },

        // Load budgets for Gantt chart
        loadBudgetsForGantt: function () {
            const self = this;

            const params = {
                from_date: this.currentFilters.from_date,
                to_date: this.currentFilters.to_date,
                per_page: 1000
            };

            if (this.currentFilters.fund_id) {
                params.fund_id = this.currentFilters.fund_id;
            }

            $.ajax({
                url: TempleAPI.getBaseUrl() + '/fund-budgets',
                type: 'GET',
                data: params,
                headers: TempleAPI.getHeaders(),
                success: function (response) {
                    if (response.success) {
                        self.budgets = response.data.data || [];
                        self.renderGanttChart();
                    }
                },
                error: function (xhr) {
                    console.error('Error loading budgets:', xhr);
                }
            });
        },

        // Render all timeline visualizations
        renderTimelineVisualization: function () {
            this.updateSummaryCards();
            this.renderTimelineChart();
            this.renderDistributionChart();
            this.renderUtilizationBarChart();
            this.renderTimelineTable();
        },

        // Update summary cards
        updateSummaryCards: function () {
            const summary = this.timelineData.summary || {};
            
            $('#timelineTotalBudget').text(this.formatCurrency(summary.total_budget || 0));
            $('#timelineTotalUtilized').text(this.formatCurrency(summary.total_utilized || 0));
            
            const remaining = (summary.total_budget || 0) - (summary.total_utilized || 0);
            $('#timelineRemaining').text(this.formatCurrency(remaining));
            
            const avgUtilization = summary.average_utilization || 0;
            $('#timelineAvgUtilization').text(avgUtilization.toFixed(1) + '%');
        },

        // Render main timeline chart
        renderTimelineChart: function () {
            const ctx = document.getElementById('timelineChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.timeline) {
                this.chartInstances.timeline.destroy();
            }

            const timeline = this.timelineData.timeline || [];
            const labels = timeline.map(item => item.period);
            const budgetedData = timeline.map(item => item.budgeted);
            const utilizedData = timeline.map(item => item.utilized);

            const chartType = this.currentChartType === 'area' ? 'line' : this.currentChartType;
            const fill = this.currentChartType === 'area';

            this.chartInstances.timeline = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Budgeted Amount',
                        data: budgetedData,
                        backgroundColor: fill ? 'rgba(54, 162, 235, 0.2)' : 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        fill: fill,
                        tension: 0.4
                    }, {
                        label: 'Utilized Amount',
                        data: utilizedData,
                        backgroundColor: fill ? 'rgba(255, 99, 132, 0.2)' : 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        fill: fill,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return context.dataset.label + ': ' + this.formatCurrency(context.parsed.y);
                                }
                            }
                        }
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
        },

        // Render distribution pie chart
        renderDistributionChart: function () {
            const ctx = document.getElementById('distributionChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.distribution) {
                this.chartInstances.distribution.destroy();
            }

            // Group by fund
            const fundData = {};
            this.budgets.forEach(budget => {
                const fundId = budget.fund_id;
                if (!fundData[fundId]) {
                    fundData[fundId] = {
                        name: budget.fund ? budget.fund.name : 'Unknown',
                        total: 0,
                        color: this.funds[fundId] ? this.funds[fundId].color : '#999'
                    };
                }
                fundData[fundId].total += parseFloat(budget.budget_amount || 0);
            });

            const labels = Object.values(fundData).map(f => f.name);
            const data = Object.values(fundData).map(f => f.total);
            const colors = Object.values(fundData).map(f => f.color);

            this.chartInstances.distribution = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = this.formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        },

        // Render utilization bar chart
        renderUtilizationBarChart: function () {
            const ctx = document.getElementById('utilizationBarChart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chartInstances.utilizationBar) {
                this.chartInstances.utilizationBar.destroy();
            }

            const timeline = this.timelineData.timeline || [];
            const labels = timeline.map(item => item.period);
            const percentages = timeline.map(item => item.percentage);

            this.chartInstances.utilizationBar = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Utilization %',
                        data: percentages,
                        backgroundColor: percentages.map(p => {
                            if (p > 90) return 'rgba(220, 53, 69, 0.7)';
                            if (p > 70) return 'rgba(255, 193, 7, 0.7)';
                            return 'rgba(25, 135, 84, 0.7)';
                        }),
                        borderColor: percentages.map(p => {
                            if (p > 90) return 'rgba(220, 53, 69, 1)';
                            if (p > 70) return 'rgba(255, 193, 7, 1)';
                            return 'rgba(25, 135, 84, 1)';
                        }),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return 'Utilization: ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: (value) => value + '%'
                            }
                        }
                    }
                }
            });
        },

        // Render Gantt chart
        renderGanttChart: function () {
            const $gantt = $('#ganttChart');
            if (!$gantt.length) return;

            // Sort budgets by start date
            const sortedBudgets = [...this.budgets].sort((a, b) => {
                return new Date(a.from_date) - new Date(b.from_date);
            });

            if (sortedBudgets.length === 0) {
                $gantt.html('<p class="text-center text-muted py-5">No budgets found for the selected period</p>');
                return;
            }

            // Calculate date range
            const minDate = new Date(Math.min(...sortedBudgets.map(b => new Date(b.from_date))));
            const maxDate = new Date(Math.max(...sortedBudgets.map(b => new Date(b.to_date))));
            const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

            let html = '<div class="gantt-container">';
            
            // Gantt header (timeline)
            html += '<div class="gantt-timeline">';
            html += '<div class="gantt-row gantt-header">';
            html += '<div class="gantt-task-name" style="width: 250px; font-weight: bold;">Budget Name</div>';
            html += '<div class="gantt-bars" style="width: calc(100% - 250px);">';
            
            // Month markers
            let currentDate = new Date(minDate);
            let lastMonth = null;
            for (let i = 0; i < totalDays; i++) {
                const month = currentDate.getMonth();
                if (month !== lastMonth) {
                    const monthName = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                    const width = (daysInMonth / totalDays) * 100;
                    html += `<div class="gantt-month" style="width: ${width}%">${monthName}</div>`;
                    lastMonth = month;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            html += '</div></div></div>';

            // Gantt rows (budgets)
            sortedBudgets.forEach(budget => {
                const fund = this.funds[budget.fund_id];
                const color = fund ? fund.color : '#999';
                const startDate = new Date(budget.from_date);
                const endDate = new Date(budget.to_date);
                
                // Calculate position and width
                const startOffset = Math.ceil((startDate - minDate) / (1000 * 60 * 60 * 24));
                const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const leftPercent = (startOffset / totalDays) * 100;
                const widthPercent = (duration / totalDays) * 100;

                // Get utilization percentage
                const summary = budget.summary || {};
                const utilizationPct = parseFloat(summary.utilization_percentage || 0);

                html += '<div class="gantt-row">';
                html += `<div class="gantt-task-name" style="width: 250px;" title="${budget.budget_name}">
                    <div class="text-truncate">
                        <i class="bi bi-circle-fill" style="color: ${color}; font-size: 8px;"></i>
                        ${budget.budget_name}
                    </div>
                    <small class="text-muted">${this.formatCurrency(budget.budget_amount)}</small>
                </div>`;
                html += '<div class="gantt-bars" style="width: calc(100% - 250px); position: relative;">';
                html += `<div class="gantt-bar" style="
                    left: ${leftPercent}%;
                    width: ${widthPercent}%;
                    background: ${color};
                    opacity: 0.8;
                " title="${budget.budget_name}\n${moment(budget.from_date).format('MMM D')} - ${moment(budget.to_date).format('MMM D, YYYY')}\nUtilization: ${utilizationPct.toFixed(1)}%">
                    <div class="gantt-bar-progress" style="width: ${utilizationPct}%; background: rgba(0,0,0,0.2);"></div>
                    <span class="gantt-bar-label">${utilizationPct.toFixed(0)}%</span>
                </div>`;
                html += '</div></div>';
            });

            html += '</div>';
            $gantt.html(html);
        },

        // Render timeline table
        renderTimelineTable: function () {
            const timeline = this.timelineData.timeline || [];
            let rows = '';
            let totalBudgeted = 0;
            let totalUtilized = 0;

            timeline.forEach(item => {
                const remaining = item.budgeted - item.utilized;
                const percentage = item.percentage.toFixed(1);
                
                totalBudgeted += item.budgeted;
                totalUtilized += item.utilized;

                const statusBadge = percentage > 90 ? 
                    '<span class="badge bg-danger">High</span>' : 
                    percentage > 70 ? 
                    '<span class="badge bg-warning">Medium</span>' : 
                    '<span class="badge bg-success">Low</span>';

                rows += `
                    <tr>
                        <td>${item.period}</td>
                        <td class="text-end">${this.formatCurrency(item.budgeted)}</td>
                        <td class="text-end">${this.formatCurrency(item.utilized)}</td>
                        <td class="text-end ${remaining < 0 ? 'text-danger' : ''}">${this.formatCurrency(remaining)}</td>
                        <td class="text-end">${percentage}%</td>
                        <td class="text-center">${statusBadge}</td>
                    </tr>
                `;
            });

            if (rows === '') {
                rows = '<tr><td colspan="6" class="text-center py-4">No data available</td></tr>';
            }

            $('#timelineTableBody').html(rows);

            // Update footer
            const totalRemaining = totalBudgeted - totalUtilized;
            const totalPercentage = totalBudgeted > 0 ? ((totalUtilized / totalBudgeted) * 100).toFixed(1) : 0;

            $('#footerBudgeted').text(this.formatCurrency(totalBudgeted));
            $('#footerUtilized').text(this.formatCurrency(totalUtilized));
            $('#footerRemaining').text(this.formatCurrency(totalRemaining));
            $('#footerPercentage').text(totalPercentage + '%');
        },

        // Update chart type
        updateChartType: function (type) {
            this.currentChartType = type;
            this.renderTimelineChart();
        }
    };

    // CSS Styles for Timeline and Gantt
    const timelineStyles = `
        <style>
            .timeline-view-container {
                padding: 20px;
            }

            .icon-circle {
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* Gantt Chart Styles */
            .gantt-container {
                overflow-x: auto;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
            }

            .gantt-row {
                display: flex;
                border-bottom: 1px solid #e9ecef;
                min-height: 50px;
                align-items: center;
            }

            .gantt-row:hover {
                background: #f8f9fa;
            }

            .gantt-header {
                background: #f8f9fa;
                font-weight: bold;
                border-bottom: 2px solid #dee2e6;
            }

            .gantt-task-name {
                padding: 10px;
                border-right: 1px solid #dee2e6;
                flex-shrink: 0;
            }

            .gantt-bars {
                flex-grow: 1;
                position: relative;
                padding: 5px 0;
            }

            .gantt-month {
                display: inline-block;
                text-align: center;
                border-right: 1px solid #e9ecef;
                padding: 5px;
                font-size: 12px;
                color: #6c757d;
            }

            .gantt-bar {
                position: absolute;
                height: 30px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                overflow: hidden;
            }

            .gantt-bar:hover {
                transform: translateY(-2px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }

            .gantt-bar-progress {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                border-radius: 4px 0 0 4px;
            }

            .gantt-bar-label {
                position: relative;
                z-index: 1;
                font-size: 11px;
                font-weight: bold;
                color: white;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            /* Chart containers */
            canvas {
                max-height: 400px;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .gantt-task-name {
                    width: 150px !important;
                }
                
                .icon-circle {
                    width: 40px;
                    height: 40px;
                }
            }
        </style>
    `;

    // Add styles to page
    if (!$('#timelineStyles').length) {
        $('head').append(`<div id="timelineStyles">${timelineStyles}</div>`);
    }

})(jQuery, window);