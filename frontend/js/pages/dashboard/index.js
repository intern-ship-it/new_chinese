// js/pages/dashboard.js
// Dashboard page module using jQuery

(function($, window) {
    'use strict';
    
    window.DashboardPage = {
        // Page initialization
        init: function(params) {
            this.render();
            this.loadData();
            this.bindEvents();
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="dashboard-page">
                    <!-- Page Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 class="h2">Dashboard</h1>
                            <p class="text-muted mb-0">Welcome back, <span id="welcomeUser">User</span>!</p>
                        </div>
                        <div>
                            <button class="btn btn-primary" id="btnNewBooking">
                                <i class="bi bi-plus-circle"></i> New Booking
                            </button>
                            <button class="btn btn-outline-primary" id="btnRefresh">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                        </div>
                    </div>
                    
                    <!-- Stats Cards -->
                    <div class="row mb-4" id="statsContainer">
                        <div class="col-xl-3 col-md-6 mb-4">
                            <div class="stat-card">
                                <div class="stat-icon primary">
                                    <i class="bi bi-calendar-check"></i>
                                </div>
                                <div class="stat-value" id="todayBookings">-</div>
                                <div class="stat-label">Today's Bookings</div>
                                <div class="stat-change positive">
                                    <i class="bi bi-arrow-up"></i> <span id="bookingChange">0%</span> from yesterday
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6 mb-4">
                            <div class="stat-card">
                                <div class="stat-icon success">
                                    RM
                                </div>
                                <div class="stat-value"><span id="todayRevenue">-</span></div>
                                <div class="stat-label">Today's Revenue</div>
                                <div class="stat-change positive">
                                    <i class="bi bi-arrow-up"></i> <span id="revenueChange">0%</span> from yesterday
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6 mb-4">
                            <div class="stat-card">
                                <div class="stat-icon info">
                                    <i class="bi bi-people"></i>
                                </div>
                                <div class="stat-value" id="activeMembers">-</div>
                                <div class="stat-label">Active Members</div>
                                <div class="stat-change positive">
                                    <i class="bi bi-arrow-up"></i> <span id="memberChange">0</span> new this month
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6 mb-4">
                            <div class="stat-card">
                                <div class="stat-icon warning">
                                    <i class="bi bi-clock-history"></i>
                                </div>
                                <div class="stat-value" id="pendingTasks">-</div>
                                <div class="stat-label">Pending Tasks</div>
                                <div class="stat-change negative">
                                    <i class="bi bi-exclamation-triangle"></i> <span id="urgentTasks">0</span> urgent
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Charts Row -->
                    <div class="row mb-4">
                        <div class="col-lg-8">
                            <div class="chart-container">
                                <h5 class="mb-4">Revenue Trend</h5>
                                <canvas id="revenueChart"></canvas>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="chart-container">
                                <h5 class="mb-4">Service Distribution</h5>
                                <canvas id="serviceChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Activities -->
                    <div class="row">
                        <div class="col-lg-8">
                            <div class="recent-activities">
                                <div class="d-flex justify-content-between align-items-center mb-4">
                                    <h5 class="mb-0">Recent Activities</h5>
                                    <a href="#" id="viewAllActivities" class="text-decoration-none">View All</a>
                                </div>
                                <div id="activitiesList">
                                    <div class="text-center py-4">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="quick-links">
                                <h5 class="mb-4">Quick Links</h5>
                                <a href="#" class="quick-link-item" data-page="bookings/create">
                                    <div class="quick-link-icon">
                                        <i class="bi bi-calendar-plus"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">Create Booking</h6>
                                        <small class="text-muted">New service booking</small>
                                    </div>
                                </a>
                                <a href="#" class="quick-link-item" data-page="members/create">
                                    <div class="quick-link-icon">
                                        <i class="bi bi-person-plus"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">Add Member</h6>
                                        <small class="text-muted">Register new member</small>
                                    </div>
                                </a>
                                <a href="#" class="quick-link-item" data-page="reports">
                                    <div class="quick-link-icon">
                                        <i class="bi bi-file-earmark-text"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">View Reports</h6>
                                        <small class="text-muted">Analytics & reports</small>
                                    </div>
                                </a>
                                <a href="#" class="quick-link-item" data-page="donations/create">
                                    <div class="quick-link-icon">
                                        <i class="bi bi-gift"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">Record Donation</h6>
                                        <small class="text-muted">Add new donation</small>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load dashboard data
        loadData: function() {
            const self = this;
            
            // Update welcome message
            const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.USER) || '{}');
            $('#welcomeUser').text(user.name || 'User');
            
            // Load stats
            TempleAPI.get('/dashboard/stats')
                .done(function(response) {
                    if (response.success) {
                        self.updateStats(response.data);
                    }
                })
                .fail(function() {
                    // Show demo data on error
                    self.updateStats({
                        todayBookings: 12,
                        todayRevenue: 25000,
                        activeMembers: 450,
                        pendingTasks: 5,
                        bookingChange: 15,
                        revenueChange: 8,
                        newMembers: 12,
                        urgentTasks: 2
                    });
                });
            
            // Load activities
            this.loadActivities();
            
            // Initialize charts
            this.initCharts();
        },
        
        // Update stats display
        updateStats: function(stats) {
            $('#todayBookings').text(stats.todayBookings || 0);
            $('#todayRevenue').text((stats.todayRevenue || 0).toLocaleString());
            $('#activeMembers').text(stats.activeMembers || 0);
            $('#pendingTasks').text(stats.pendingTasks || 0);
            
            $('#bookingChange').text((stats.bookingChange || 0) + '%');
            $('#revenueChange').text((stats.revenueChange || 0) + '%');
            $('#memberChange').text(stats.newMembers || 0);
            $('#urgentTasks').text(stats.urgentTasks || 0);
            
            // Update change indicators
            $('.stat-change').each(function() {
                const value = parseFloat($(this).find('span').first().text());
                if (value < 0) {
                    $(this).removeClass('positive').addClass('negative');
                    $(this).find('i').first().removeClass('bi-arrow-up').addClass('bi-arrow-down');
                }
            });
        },
        
        // Load recent activities
        loadActivities: function() {
            const self = this;
            
            TempleAPI.get('/dashboard/activities')
                .done(function(response) {
                    if (response.success) {
                        self.renderActivities(response.data);
                    }
                })
                .fail(function() {
                    // Show sample activities
                    self.renderActivities([
                        {
                            type: 'booking',
                            icon: 'calendar-check',
                            color: 'primary',
                            title: 'New Booking Created',
                            description: 'Archanai booking for tomorrow',
                            time: '5 minutes ago',
                            user: 'Staff User'
                        }
                    ]);
                });
        },
        
        // Render activities
        renderActivities: function(activities) {
            const container = $('#activitiesList');
            container.empty();
            
            if (activities.length === 0) {
                container.html(`
                    <div class="text-center py-4">
                        <i class="bi bi-inbox text-muted" style="font-size: 48px;"></i>
                        <p class="text-muted mt-2">No recent activities</p>
                    </div>
                `);
                return;
            }
            
            $.each(activities, function(index, activity) {
                const activityHtml = `
                    <div class="activity-item">
                        <div class="d-flex align-items-start">
                            <div class="activity-icon bg-${activity.color}-subtle text-${activity.color} me-3">
                                <i class="bi bi-${activity.icon}"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${activity.title}</h6>
                                <p class="mb-1 text-muted small">${activity.description}</p>
                                <small class="text-muted">
                                    <i class="bi bi-clock"></i> ${activity.time}
                                    ${activity.user ? ` • <i class="bi bi-person"></i> ${activity.user}` : ''}
                                </small>
                            </div>
                        </div>
                    </div>
                `;
                container.append(activityHtml);
            });
        },
        
        // Initialize charts
        initCharts: function() {
            // Revenue Chart
            const revenueCtx = document.getElementById('revenueChart').getContext('2d');
            new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Revenue',
                        data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                        borderColor: 'rgb(255, 0, 255)',
                        backgroundColor: 'rgba(255, 0, 255, 0.1)',
                        tension: 0.4
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
            
            // Service Distribution Chart
            const serviceCtx = document.getElementById('serviceChart').getContext('2d');
            new Chart(serviceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Archanai', 'Donations', 'Hall Booking', 'Others'],
                    datasets: [{
                        data: [35, 30, 20, 15],
                        backgroundColor: [
                            'rgba(255, 0, 255, 0.8)',
                            'rgba(128, 128, 0, 0.8)',
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // New Booking button
            $('#btnNewBooking').on('click', function() {
                TempleRouter.navigate('bookings/create');
            });
            
            // Refresh button
            $('#btnRefresh').on('click', function() {
                self.loadData();
                TempleCore.showToast('Dashboard refreshed', 'success');
            });
            
            // View all activities
            $('#viewAllActivities').on('click', function(e) {
                e.preventDefault();
                TempleRouter.navigate('activities');
            });
            
            // Quick links
            $('.quick-link-item').on('click', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                TempleRouter.navigate(page);
            });
        }
    };
    
})(jQuery, window);