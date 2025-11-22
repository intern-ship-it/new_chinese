// js/pages/auspicious-light/reports.js
// Pagoda Reports & Analytics - Comprehensive reporting dashboard

(function ($, window) {
    'use strict';

    window.PagodaReportsPage = {
        charts: {},
        currentFilters: {
            date_from: moment().subtract(30, 'days').format('YYYY-MM-DD'),
            date_to: moment().format('YYYY-MM-DD')
        },

        // Initialize page
        init: function (params) {
            console.log('Initializing Pagoda Reports & Analytics');
            this.params = params || {};
            this.render();
            this.loadReports();
            this.attachEvents();
        },

        // Render page structure
        render: function () {
            const html = `
                <div class="reports-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4" data-aos="fade-down">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h1 class="page-title mb-2">
                                    <i class="bi bi-graph-up me-2"></i>
                                    Reports & Analytics
                                </h1>
                                <p class="text-muted mb-0">报告与分析 - Comprehensive pagoda light management reports</p>
                            </div>
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <button class="btn btn-outline-secondary" id="btnRefreshReports">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                                <div class="btn-group">
                                    <button class="btn btn-outline-primary dropdown-toggle" type="button" 
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="bi bi-download"></i> Export
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" id="exportPdf">
                                            <i class="bi bi-file-pdf me-2"></i>Export as PDF
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" id="exportExcel">
                                            <i class="bi bi-file-excel me-2"></i>Export as Excel
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" id="exportCsv">
                                            <i class="bi bi-file-csv me-2"></i>Export as CSV
                                        </a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Date Range Filter -->
                    <div class="card mb-4" data-aos="fade-up">
                        <div class="card-body">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-3">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterDateFrom" 
                                           value="${this.currentFilters.date_from}">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterDateTo" 
                                           value="${this.currentFilters.date_to}">
                                </div>
                                <div class="col-md-6">
                                    <div class="btn-group" role="group">
                                        <button type="button" class="btn btn-outline-secondary btn-sm btn-date-range" data-range="today">Today</button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm btn-date-range" data-range="week">This Week</button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm btn-date-range" data-range="month">This Month</button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm btn-date-range" data-range="year">This Year</button>
                                        <button type="button" class="btn btn-primary btn-sm" id="btnApplyDateFilter">
                                            <i class="bi bi-funnel"></i> Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Report Tabs -->
                    <ul class="nav nav-tabs mb-4" id="reportsTabs" role="tablist" data-aos="fade-up">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" 
                                    data-bs-target="#overview-panel" type="button" role="tab">
                                <i class="bi bi-speedometer2 me-1"></i> Overview
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="revenue-tab" data-bs-toggle="tab" 
                                    data-bs-target="#revenue-panel" type="button" role="tab">
                                <i class="bi bi-cash-stack me-1"></i> Revenue
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="occupancy-tab" data-bs-toggle="tab" 
                                    data-bs-target="#occupancy-panel" type="button" role="tab">
                                <i class="bi bi-pie-chart me-1"></i> Occupancy
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="expiry-tab" data-bs-toggle="tab" 
                                    data-bs-target="#expiry-panel" type="button" role="tab">
                                <i class="bi bi-calendar-x me-1"></i> Expiry Forecast
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="devotees-tab" data-bs-toggle="tab" 
                                    data-bs-target="#devotees-panel" type="button" role="tab">
                                <i class="bi bi-people me-1"></i> Devotees
                            </button>
                        </li>
                    </ul>

                    <!-- Tab Content -->
                    <div class="tab-content" id="reportsTabContent">
                        
                        <!-- Overview Panel -->
                        <div class="tab-pane fade show active" id="overview-panel" role="tabpanel">
                            <div id="overviewContent"></div>
                        </div>

                        <!-- Revenue Panel -->
                        <div class="tab-pane fade" id="revenue-panel" role="tabpanel">
                            <div id="revenueContent"></div>
                        </div>

                        <!-- Occupancy Panel -->
                        <div class="tab-pane fade" id="occupancy-panel" role="tabpanel">
                            <div id="occupancyContent"></div>
                        </div>

                        <!-- Expiry Panel -->
                        <div class="tab-pane fade" id="expiry-panel" role="tabpanel">
                            <div id="expiryContent"></div>
                        </div>

                        <!-- Devotees Panel -->
                        <div class="tab-pane fade" id="devotees-panel" role="tabpanel">
                            <div id="devoteesContent"></div>
                        </div>

                    </div>

                </div>
            `;

            $('#page-container').html(html);

            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        },

        // Load all reports
        loadReports: function () {
            this.loadOverview();
            this.loadRevenue();
            this.loadOccupancy();
            this.loadExpiryForecast();
            this.loadDevoteeAnalytics();
        },

        // Load overview report
        loadOverview: function () {
            const self = this;

            TempleUtils.showLoading('Loading overview...');

            PagodaAPI.reports.getDashboard()
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderOverview(response.data);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load overview');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Render overview
        renderOverview: function (data) {
            const currencySymbol = APP_CONFIG.CURRENCY_SYMBOLS[
                TempleUtils.getStoredTempleSettings().currency || 'MYR'
            ];

            const html = `
                <!-- Summary Cards -->
                <div class="row g-4 mb-4" data-aos="fade-up">
                    <div class="col-md-3">
                        <div class="card stats-card h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-primary">
                                        <i class="bi bi-lightbulb"></i>
                                    </div>
                                    <div class="ms-3">
                                        <p class="stats-label mb-1">Total Lights</p>
                                        <h3 class="stats-value mb-0">${data.overview.total_lights.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-success">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="ms-3">
                                        <p class="stats-label mb-1">Registered</p>
                                        <h3 class="stats-value mb-0">${data.overview.registered_lights.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-warning">
                                        <i class="bi bi-pie-chart"></i>
                                    </div>
                                    <div class="ms-3">
                                        <p class="stats-label mb-1">Occupancy</p>
                                        <h3 class="stats-value mb-0">${data.overview.occupancy_rate}%</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-info">
                                        <i class="bi bi-people"></i>
                                    </div>
                                    <div class="ms-3">
                                        <p class="stats-label mb-1">Total Devotees</p>
                                        <h3 class="stats-value mb-0">${data.devotees.total.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Revenue & Registrations -->
                <div class="row g-4 mb-4">
                    <div class="col-lg-6" data-aos="fade-right">
                        <div class="card h-100">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-cash-stack me-2"></i>
                                    Revenue Summary
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row text-center g-3">
                                    <div class="col-6">
                                        <div class="border rounded p-3">
                                            <p class="text-muted mb-2 small">Today</p>
                                            <h4 class="text-success mb-0">${currencySymbol} ${parseFloat(data.revenue.today).toFixed(2)}</h4>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="border rounded p-3">
                                            <p class="text-muted mb-2 small">This Month</p>
                                            <h4 class="text-primary mb-0">${currencySymbol} ${parseFloat(data.revenue.this_month).toFixed(2)}</h4>
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <div class="border rounded p-3">
                                            <p class="text-muted mb-2 small">This Year</p>
                                            <h3 class="text-info mb-0">${currencySymbol} ${parseFloat(data.revenue.this_year).toFixed(2)}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-6" data-aos="fade-left">
                        <div class="card h-100">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-graph-up me-2"></i>
                                    New Registrations
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row text-center g-3">
                                    <div class="col-4">
                                        <div class="border rounded p-3">
                                            <h4 class="text-success mb-1">${data.new_registrations.today}</h4>
                                            <p class="text-muted mb-0 small">Today</p>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="border rounded p-3">
                                            <h4 class="text-primary mb-1">${data.new_registrations.this_week}</h4>
                                            <p class="text-muted mb-0 small">This Week</p>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="border rounded p-3">
                                            <h4 class="text-info mb-1">${data.new_registrations.this_month}</h4>
                                            <p class="text-muted mb-0 small">This Month</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <canvas id="registrationsTrendChart" height="150"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Expiring Alerts -->
                <div class="row g-4">
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    Expiring Registrations Alert
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row text-center g-3">
                                    <div class="col-md-4">
                                        <div class="alert alert-danger mb-0">
                                            <h3 class="mb-2">${data.active_registrations.expiring_in_7_days}</h3>
                                            <p class="mb-0">Expiring in 7 Days</p>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="alert alert-warning mb-0">
                                            <h3 class="mb-2">${data.active_registrations.expiring_in_30_days}</h3>
                                            <p class="mb-0">Expiring in 30 Days</p>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="alert alert-info mb-0">
                                            <h3 class="mb-2">${data.active_registrations.expiring_in_60_days}</h3>
                                            <p class="mb-0">Expiring in 60 Days</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#overviewContent').html(html);

            // Initialize registration trend chart
            this.initRegistrationsTrendChart(data.new_registrations);
        },

        // Load revenue report
        loadRevenue: function () {
            const self = this;

            PagodaAPI.reports.getRevenue(this.currentFilters)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderRevenue(response.data);
                    }
                })
                .fail(function (xhr) {
                    $('#revenueContent').html(`
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Failed to load revenue report
                        </div>
                    `);
                });
        },

        // Render revenue report
        renderRevenue: function (data) {
            const currencySymbol = APP_CONFIG.CURRENCY_SYMBOLS[
                TempleUtils.getStoredTempleSettings().currency || 'MYR'
            ];

            const html = `
                <div class="row g-4">
                    <!-- Summary Cards -->
                    <div class="col-md-4" data-aos="fade-up">
                        <div class="card text-center">
                            <div class="card-body">
                                <h6 class="text-muted mb-3">Total Revenue</h6>
                                <h2 class="text-success mb-0">${currencySymbol} ${parseFloat(data.total).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4" data-aos="fade-up" data-aos-delay="100">
                        <div class="card text-center">
                            <div class="card-body">
                                <h6 class="text-muted mb-3">Average Per Registration</h6>
                                <h2 class="text-primary mb-0">${currencySymbol} ${parseFloat(data.average).toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4" data-aos="fade-up" data-aos-delay="200">
                        <div class="card text-center">
                            <div class="card-body">
                                <h6 class="text-muted mb-3">Total Registrations</h6>
                                <h2 class="text-info mb-0">${data.count}</h2>
                            </div>
                        </div>
                    </div>

                    <!-- Revenue Chart -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Revenue Trend</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="revenueChart" height="80"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Payment Methods Breakdown -->
                    <div class="col-lg-6" data-aos="fade-up">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="mb-0">By Payment Method</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="paymentMethodsChart" height="200"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Merit Amounts Breakdown -->
                    <div class="col-lg-6" data-aos="fade-up">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="mb-0">By Merit Amount</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="meritAmountsChart" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#revenueContent').html(html);

            // Initialize charts
            this.initRevenueCharts(data);
        },

        // Load occupancy report
        loadOccupancy: function () {
            const self = this;

            PagodaAPI.reports.getOccupancy()
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderOccupancy(response.data);
                    }
                })
                .fail(function (xhr) {
                    $('#occupancyContent').html(`
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Failed to load occupancy report
                        </div>
                    `);
                });
        },

        // Render occupancy report
        renderOccupancy: function (data) {
            const html = `
                <div class="row g-4">
                    <!-- Overall Occupancy -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-muted mb-3">Overall Occupancy Rate</h3>
                                <div class="position-relative d-inline-block">
                                    <canvas id="occupancyGaugeChart" width="200" height="200"></canvas>
                                    <div class="position-absolute top-50 start-50 translate-middle">
                                        <h1 class="mb-0">${data.overall.occupancy_rate}%</h1>
                                    </div>
                                </div>
                                <p class="text-muted mt-3">
                                    ${data.overall.registered_lights} of ${data.overall.total_lights} lights registered
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- By Tower -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Occupancy by Tower</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Tower</th>
                                                <th>Total Lights</th>
                                                <th>Registered</th>
                                                <th>Available</th>
                                                <th>Occupancy Rate</th>
                                                <th>Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.renderOccupancyRows(data.by_tower)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Occupancy Chart -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Tower Comparison</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="towerOccupancyChart" height="80"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#occupancyContent').html(html);

            // Initialize charts
            this.initOccupancyCharts(data);
        },

        // Render occupancy rows
        renderOccupancyRows: function (towers) {
            return towers.map(tower => {
                const occupancyClass = tower.occupancy_rate >= 90 ? 'success' :
                    tower.occupancy_rate >= 70 ? 'info' :
                        tower.occupancy_rate >= 50 ? 'warning' : 'danger';

                return `
                    <tr>
                        <td><strong>${tower.tower_name}</strong></td>
                        <td>${tower.total_lights}</td>
                        <td><span class="badge bg-primary">${tower.registered_lights}</span></td>
                        <td><span class="badge bg-success">${tower.available_lights}</span></td>
                        <td><strong>${tower.occupancy_rate}%</strong></td>
                        <td>
                            <div class="progress" style="height: 25px;">
                                <div class="progress-bar bg-${occupancyClass}" role="progressbar" 
                                     style="width: ${tower.occupancy_rate}%" 
                                     aria-valuenow="${tower.occupancy_rate}" aria-valuemin="0" aria-valuemax="100">
                                    ${tower.occupancy_rate}%
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        // Load expiry forecast
        loadExpiryForecast: function () {
            const self = this;

            PagodaAPI.reports.getExpiryForecast(6)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderExpiryForecast(response.data);
                    }
                })
                .fail(function (xhr) {
                    $('#expiryContent').html(`
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Failed to load expiry forecast
                        </div>
                    `);
                });
        },

        // Render expiry forecast
        renderExpiryForecast: function (data) {
            const html = `
                <div class="row g-4">
                    <!-- Immediate Alerts -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card border-danger">
                            <div class="card-header bg-danger text-white">
                                <h5 class="mb-0">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    Immediate Attention Required
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row text-center g-3">
                                    <div class="col-md-4">
                                        <h2 class="text-danger">${data.expiring_in_7_days || 0}</h2>
                                        <p class="mb-0">Expiring in 7 Days</p>
                                    </div>
                                    <div class="col-md-4">
                                        <h2 class="text-warning">${data.expiring_in_30_days || 0}</h2>
                                        <p class="mb-0">Expiring in 30 Days</p>
                                    </div>
                                    <div class="col-md-4">
                                        <h2 class="text-info">${data.expiring_in_60_days || 0}</h2>
                                        <p class="mb-0">Expiring in 60 Days</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Monthly Forecast Chart -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">6-Month Expiry Forecast</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="expiryForecastChart" height="80"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Renewal Opportunities -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Upcoming Renewals</h5>
                                <a href="#pagoda/registrations" class="btn btn-sm btn-primary">
                                    View All Registrations
                                </a>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">
                                    <i class="bi bi-info-circle me-2"></i>
                                    Total renewal opportunities in next 60 days: 
                                    <strong>${(data.expiring_in_60_days || 0)}</strong>
                                </p>
                                <div class="alert alert-info">
                                    <i class="bi bi-lightbulb me-2"></i>
                                    <strong>Tip:</strong> Contact devotees 30 days before expiry to maximize renewal rates.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#expiryContent').html(html);

            // Initialize chart
            this.initExpiryForecastChart(data);
        },

        // Load devotee analytics
        loadDevoteeAnalytics: function () {
            const self = this;

            PagodaAPI.reports.getDevoteeAnalytics()
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderDevoteeAnalytics(response.data);
                    }
                })
                .fail(function (xhr) {
                    $('#devoteesContent').html(`
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Failed to load devotee analytics
                        </div>
                    `);
                });
        },

        // Render devotee analytics
        renderDevoteeAnalytics: function (data) {
            const html = `
                <div class="row g-4">
                    <!-- Summary Cards -->
                    <div class="col-md-4" data-aos="fade-up">
                        <div class="card text-center">
                            <div class="card-body">
                                <i class="bi bi-people display-4 text-primary mb-3"></i>
                                <h2 class="mb-2">${data.total_devotees || 0}</h2>
                                <p class="text-muted mb-0">Total Devotees</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4" data-aos="fade-up" data-aos-delay="100">
                        <div class="card text-center">
                            <div class="card-body">
                                <i class="bi bi-person-plus display-4 text-success mb-3"></i>
                                <h2 class="mb-2">${data.new_this_month || 0}</h2>
                                <p class="text-muted mb-0">New This Month</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4" data-aos="fade-up" data-aos-delay="200">
                        <div class="card text-center">
                            <div class="card-body">
                                <i class="bi bi-lightbulb display-4 text-info mb-3"></i>
                                <h2 class="mb-2">${data.with_active_lights || 0}</h2>
                                <p class="text-muted mb-0">With Active Lights</p>
                            </div>
                        </div>
                    </div>

                    <!-- Devotee Growth Chart -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Devotee Growth Trend</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="devoteeGrowthChart" height="80"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Top Devotees -->
                    <div class="col-12" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Top Devotees by Registrations</h5>
                                <a href="#pagoda/devotees" class="btn btn-sm btn-primary">
                                    View All Devotees
                                </a>
                            </div>
                            <div class="card-body">
                                ${data.top_devotees && data.top_devotees.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>Contact</th>
                                                    <th>Total Registrations</th>
                                                    <th>Active Lights</th>
                                                    <th>Total Merit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${this.renderTopDevoteesRows(data.top_devotees)}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : `
                                    <p class="text-muted text-center py-3">No devotee data available</p>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#devoteesContent').html(html);

            // Initialize chart
            this.initDevoteeGrowthChart(data);
        },

        // Render top devotees rows
        renderTopDevoteesRows: function (devotees) {
            return devotees.slice(0, 10).map((devotee, index) => `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td>${devotee.name}</td>
                    <td><small>${devotee.contact}</small></td>
                    <td><span class="badge bg-primary">${devotee.total_registrations}</span></td>
                    <td><span class="badge bg-success">${devotee.active_lights}</span></td>
                    <td><strong>${PagodaAPI.utils.formatCurrency(devotee.total_merit)}</strong></td>
                </tr>
            `).join('');
        },

        // Initialize registrations trend chart
        initRegistrationsTrendChart: function (data) {
            // Placeholder for chart initialization
            // You would use Chart.js here
            console.log('Registration trend chart data:', data);
        },

        // Initialize revenue charts
        initRevenueCharts: function (data) {
            console.log('Revenue chart data:', data);
            // Initialize Chart.js charts here
        },

        // Initialize occupancy charts
        initOccupancyCharts: function (data) {
            console.log('Occupancy chart data:', data);
            // Initialize Chart.js charts here
        },

        // Initialize expiry forecast chart
        initExpiryForecastChart: function (data) {
            console.log('Expiry forecast data:', data);
            // Initialize Chart.js chart here
        },

        // Initialize devotee growth chart
        initDevoteeGrowthChart: function (data) {
            console.log('Devotee growth data:', data);
            // Initialize Chart.js chart here
        },

        // Attach event handlers
        attachEvents: function () {
            const self = this;
            this.detachEvents();
            // Date range quick buttons
            $('.btn-date-range').on('click', function () {
                const range = $(this).data('range');
                self.setDateRange(range);
            });

            // Apply date filter
            $('#btnApplyDateFilter').on('click', function () {
                self.applyDateFilter();
            });

            // Refresh reports
            $('#btnRefreshReports').on('click', function () {
                self.loadReports();
            });

            // Export handlers
            $('#exportPdf').on('click', function (e) {
                e.preventDefault();
                self.exportReport('pdf');
            });

            $('#exportExcel').on('click', function (e) {
                e.preventDefault();
                self.exportReport('excel');
            });

            $('#exportCsv').on('click', function (e) {
                e.preventDefault();
                self.exportReport('csv');
            });

            // Tab changes
            $('#reportsTabs button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
                // Refresh charts when tab is shown
                const target = $(e.target).attr('data-bs-target');
                console.log('Tab changed to:', target);
            });
        },

        // Set date range
        setDateRange: function (range) {
            const today = moment();
            let from, to;

            switch (range) {
                case 'today':
                    from = today.clone();
                    to = today.clone();
                    break;
                case 'week':
                    from = today.clone().startOf('week');
                    to = today.clone().endOf('week');
                    break;
                case 'month':
                    from = today.clone().startOf('month');
                    to = today.clone().endOf('month');
                    break;
                case 'year':
                    from = today.clone().startOf('year');
                    to = today.clone().endOf('year');
                    break;
                default:
                    return;
            }

            $('#filterDateFrom').val(from.format('YYYY-MM-DD'));
            $('#filterDateTo').val(to.format('YYYY-MM-DD'));

            this.applyDateFilter();
        },

        // Apply date filter
        applyDateFilter: function () {
            this.currentFilters.date_from = $('#filterDateFrom').val();
            this.currentFilters.date_to = $('#filterDateTo').val();

            // Reload reports with new filters
            this.loadRevenue();
        },

        // Export report
        exportReport: function (format) {
            const activeTab = $('#reportsTabs .nav-link.active').attr('id').replace('-tab', '');

            TempleUtils.showInfo(`Exporting ${activeTab} report as ${format.toUpperCase()}...`);

            // TODO: Implement actual export functionality
            setTimeout(() => {
                TempleUtils.showSuccess('Export functionality coming soon');
            }, 1000);
        },

        destroy: function () {
            // Remove all event handlers
            this.detachEvents();

            // Destroy all charts
            Object.keys(this.charts).forEach(key => {
                if (this.charts[key]) {
                    this.charts[key].destroy();
                }
            });

            console.log('Pagoda Reports page destroyed');
        }
    };

})(jQuery, window);