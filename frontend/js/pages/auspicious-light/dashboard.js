// js/pages/auspicious-light/dashboard.js
// Pagoda Tower Dashboard - Main Overview

(function ($, window) {
    'use strict';

    window.PagodaDashboardPage = {
        refreshInterval: null,

        // Initialize dashboard
        init: function (params) {
            console.log('Initializing Pagoda Dashboard');
            this.params = params || {};
            this.render();
            this.loadDashboardData();
            this.attachEvents();
            this.startAutoRefresh();
        },

        // Render page structure
        render: function () {
            const html = `
                <div class="pagoda-dashboard-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4" data-aos="fade-down">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h1 class="page-title mb-2">
                                    <i class="bi bi-brightness-high me-2"></i>
                                    Pagoda Tower Dashboard
                                </h1>
                                <p class="text-muted mb-0">平安灯管理系统概览 - Auspicious Light Management Overview</p>
                            </div>
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <button class="btn btn-outline-primary" id="btnRefreshDashboard">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                                <button class="btn btn-success" id="btnNewRegistration">
                                    <i class="bi bi-plus-circle"></i> New Registration
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Overview Cards -->
                    <div id="overview-cards"></div>

                    <!-- Expiring Registrations Alert -->
                    <div id="active-registrations"></div>

                    <!-- Revenue Overview -->
                    <div id="revenue-overview"></div>

                    <div class="row g-4 mb-4">
                        <!-- New Registrations Chart -->
                        <div class="col-lg-6">
                            <div class="card h-100" data-aos="fade-right">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="bi bi-graph-up me-2"></i>
                                        New Registrations
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center" id="new-registrations-stats">
                                        <div class="col-4">
                                            <div class="stat-box">
                                                <h4 class="text-success mb-1" id="regsToday">0</h4>
                                                <p class="text-muted mb-0 small">Today</p>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="stat-box">
                                                <h4 class="text-primary mb-1" id="regsThisWeek">0</h4>
                                                <p class="text-muted mb-0 small">This Week</p>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="stat-box">
                                                <h4 class="text-info mb-1" id="regsThisMonth">0</h4>
                                                <p class="text-muted mb-0 small">This Month</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Devotees Stats -->
                        <div class="col-lg-6">
                            <div class="card h-100" data-aos="fade-left">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="bi bi-people me-2"></i>
                                        Devotees Statistics
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center" id="devotee-stats">
                                        <div class="col-4">
                                            <div class="stat-box">
                                                <h4 class="text-primary mb-1" id="totalDevotees">0</h4>
                                                <p class="text-muted mb-0 small">Total</p>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="stat-box">
                                                <h4 class="text-success mb-1" id="activeDevotees">0</h4>
                                                <p class="text-muted mb-0 small">Active</p>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="stat-box">
                                                <h4 class="text-info mb-1" id="newDevotees">0</h4>
                                                <p class="text-muted mb-0 small">New This Month</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div id="recent-activity" class="mb-4"></div>

                    <!-- Quick Actions -->
                    <div class="quick-actions" data-aos="fade-up">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-lightning me-2"></i>
                                    Quick Actions
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-6 col-md-3">
                                        <a href="#pagoda/lights" class="btn btn-outline-primary w-100 py-3">
                                            <i class="bi bi-lightbulb d-block mb-2" style="font-size: 24px;"></i>
                                            View Lights
                                        </a>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <a href="#pagoda/registrations" class="btn btn-outline-info w-100 py-3">
                                            <i class="bi bi-list-check d-block mb-2" style="font-size: 24px;"></i>
                                            Registrations
                                        </a>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <a href="#pagoda/devotees" class="btn btn-outline-success w-100 py-3">
                                            <i class="bi bi-people d-block mb-2" style="font-size: 24px;"></i>
                                            Devotees
                                        </a>
                                    </div>
                                    <div class="col-6 col-md-3">
                                        <a href="#pagoda/reports" class="btn btn-outline-warning w-100 py-3">
                                            <i class="bi bi-graph-up d-block mb-2" style="font-size: 24px;"></i>
                                            Reports
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            `;

            $('#page-container').html(html);

            // Initialize AOS animations
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        },

        // Load dashboard data
        loadDashboardData: function () {
            const self = this;

            TempleUtils.showLoading('Loading dashboard data...');

            PagodaAPI.reports.getDashboard()
                .done(function (response) {
                    if (response.success) {
                        self.renderDashboardData(response.data);
                    } else {
                        TempleUtils.showError('Failed to load dashboard data');
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load dashboard');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Render dashboard data
        renderDashboardData: function (data) {
            this.renderOverviewCards(data.overview);
            this.renderExpiringAlerts(data.active_registrations);
            this.renderRevenue(data.revenue);
            this.renderNewRegistrations(data.new_registrations);
            this.renderDevotees(data.devotees);
            this.renderRecentActivity(data.recent_registrations);
        },

        // Render overview cards
        renderOverviewCards: function (overview) {
            const html = `
                <div class="row g-4 mb-4">
                    <!-- Total Lights -->
                    <div class="col-6 col-lg-3">
                        <div class="card stats-card h-100" data-aos="fade-up">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-primary">
                                        <i class="bi bi-lightbulb"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <p class="stats-label mb-1">Total Lights</p>
                                        <h3 class="stats-value mb-0">${overview.total_lights.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Available -->
                    <div class="col-6 col-lg-3">
                        <div class="card stats-card h-100" data-aos="fade-up" data-aos-delay="100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-success">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <p class="stats-label mb-1">Available</p>
                                        <h3 class="stats-value mb-0">${overview.available_lights.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Registered -->
                    <div class="col-6 col-lg-3">
                        <div class="card stats-card h-100" data-aos="fade-up" data-aos-delay="200">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-info">
                                        <i class="bi bi-bookmark-check"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <p class="stats-label mb-1">Registered</p>
                                        <h3 class="stats-value mb-0">${overview.registered_lights.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Occupancy Rate -->
                    <div class="col-6 col-lg-3">
                        <div class="card stats-card h-100" data-aos="fade-up" data-aos-delay="300">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stats-icon bg-warning">
                                        <i class="bi bi-pie-chart"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <p class="stats-label mb-1">Occupancy</p>
                                        <h3 class="stats-value mb-0">${overview.occupancy_rate}%</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#overview-cards').html(html);
        },

        // Render expiring alerts
        renderExpiringAlerts: function (activeRegs) {
            const html = `
                <div class="card mb-4" data-aos="fade-up">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">
                            <i class="bi bi-clock-history me-2"></i>
                            Expiring Registrations Alert
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row text-center g-3">
                            <div class="col-md-4">
                                <div class="alert alert-danger mb-0">
                                    <div class="d-flex align-items-center justify-content-center">
                                        <i class="bi bi-exclamation-triangle fs-2 me-3"></i>
                                        <div>
                                            <h4 class="mb-0">${activeRegs.expiring_in_7_days}</h4>
                                            <small>Expiring in 7 Days</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="alert alert-warning mb-0">
                                    <div class="d-flex align-items-center justify-content-center">
                                        <i class="bi bi-exclamation-circle fs-2 me-3"></i>
                                        <div>
                                            <h4 class="mb-0">${activeRegs.expiring_in_30_days}</h4>
                                            <small>Expiring in 30 Days</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="alert alert-info mb-0">
                                    <div class="d-flex align-items-center justify-content-center">
                                        <i class="bi bi-info-circle fs-2 me-3"></i>
                                        <div>
                                            <h4 class="mb-0">${activeRegs.expiring_in_60_days}</h4>
                                            <small>Expiring in 60 Days</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#active-registrations').html(html);
        },

        // Render revenue
        renderRevenue: function (revenue) {
            const currencySymbol = APP_CONFIG.CURRENCY_SYMBOLS[
                TempleUtils.getStoredTempleSettings().currency || 'MYR'
            ];

            const html = `
                <div class="card mb-4" data-aos="fade-up">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">
                            <i class="bi bi-cash-stack me-2"></i>
                            Revenue Overview
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-md-4">
                                <div class="revenue-stat">
                                    <p class="text-muted mb-2">Today</p>
                                    <h3 class="text-success mb-0">${currencySymbol} ${parseFloat(revenue.today).toFixed(2)}</h3>
                                </div>
                            </div>
                            <div class="col-md-4 border-start border-end">
                                <div class="revenue-stat">
                                    <p class="text-muted mb-2">This Month</p>
                                    <h3 class="text-primary mb-0">${currencySymbol} ${parseFloat(revenue.this_month).toFixed(2)}</h3>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="revenue-stat">
                                    <p class="text-muted mb-2">This Year</p>
                                    <h3 class="text-info mb-0">${currencySymbol} ${parseFloat(revenue.this_year).toFixed(2)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#revenue-overview').html(html);
        },

        // Render new registrations stats
        renderNewRegistrations: function (newRegs) {
            $('#regsToday').text(newRegs.today);
            $('#regsThisWeek').text(newRegs.this_week);
            $('#regsThisMonth').text(newRegs.this_month);
        },

        // Render devotees stats
        renderDevotees: function (devotees) {
            $('#totalDevotees').text(devotees.total);
            $('#activeDevotees').text(devotees.with_active_registrations);
            $('#newDevotees').text(devotees.new_this_month);
        },

        // Render recent activity
        renderRecentActivity: function (recentRegs) {
            if (!recentRegs || recentRegs.length === 0) {
                $('#recent-activity').html(`
                    <div class="card">
                        <div class="card-body text-center text-muted py-5">
                            <i class="bi bi-inbox display-4 mb-3 d-block"></i>
                            <p>No recent registrations</p>
                        </div>
                    </div>
                `);
                return;
            }

            const rows = recentRegs.map(reg => `
                <tr>
                    <td><span class="badge bg-secondary">${reg.receipt_number}</span></td>
                    <td>${reg.devotee_name}</td>
                    <td><code class="light-code">${reg.light_code}</code></td>
                    <td><strong>${PagodaAPI.utils.formatCurrency(reg.merit_amount)}</strong></td>
                    <td class="text-muted small">${moment(reg.created_at).format('DD/MM/YYYY HH:mm')}</td>
                </tr>
            `).join('');

            const html = `
                <div class="card" data-aos="fade-up">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-activity me-2"></i>
                            Recent Registrations
                        </h5>
                        <a href="#pagoda/registrations" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-list-ul"></i> View All
                        </a>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Receipt #</th>
                                        <th>Devotee</th>
                                        <th>Light Code</th>
                                        <th>Amount</th>
                                        <th>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#recent-activity').html(html);
        },

        // Attach event handlers
        attachEvents: function () {
            const self = this;

            // Refresh button
            $('#btnRefreshDashboard').on('click', function () {
                self.loadDashboardData();
            });

            // New registration button
            $('#btnNewRegistration').on('click', function () {
                TempleRouter.navigate('auspicious-light/entry');
            });
        },

        // Auto-refresh every 5 minutes
        startAutoRefresh: function () {
            const self = this;
            this.refreshInterval = setInterval(function () {
                self.loadDashboardData();
            }, 300000); // 5 minutes
        },

        // Cleanup
        destroy: function () {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        }
    };

})(jQuery, window);