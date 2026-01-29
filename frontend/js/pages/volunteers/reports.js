// js/pages/volunteers/reports.js
// Volunteer Reports Page 

(function ($, window) {
    'use strict';

    // Shared module for CSS and cleanup management
    if (!window.VolunteersSharedModule) {
        window.VolunteersSharedModule = {
            moduleId: 'volunteers',
            eventNamespace: 'volunteers',
            cssId: 'volunteers-css',
            cssPath: '/css/volunteers.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('✅ Volunteers CSS loaded');
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`✅ Volunteers page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`🧹 Volunteers page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            hasActivePages: function () {
                return this.activePages.size > 0;
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('🧹 Volunteers CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('✅ Volunteers module cleaned up');
            }
        };
    }

    // ========================================
    // VOLUNTEERS REPORTS PAGE
    // ========================================
    window.VolunteersReportsPage = {
        pageId: 'volunteers-reports',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        _isCleanedUp: false,

        // Configuration
        config: {
            apiBaseUrl: '/volunteers/reports',
            currentView: 'calendar',
            currentDate: new Date(),
            currentPeriod: 'month',
            filters: {
                dateFrom: null,
                dateTo: null,
                department_id: '',
                task_id: '',
                volunteer_id: '',
                entry_type: '',
                search: ''
            },
            dataTable: null,
            calendarData: [],
            statistics: {},
            intervals: [],
            timeouts: [],
            attendanceDetailsModal: null,
            dayDetailsModal: null
        },

        // Avatar color palette
        avatarColors: [
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#f59e0b', // amber
            '#10b981', // emerald
            '#3b82f6', // blue
            '#ef4444', // red
            '#14b8a6', // teal
            '#f97316', // orange
            '#84cc16'  // lime
        ],

        // Initialize module
        init: function (params) {
            console.log('🚀 Initializing Volunteer Reports Page');

            // Register with shared module FIRST
            window.VolunteersSharedModule.registerPage(this.pageId);
            this._isCleanedUp = false;

            // Render UI synchronously
            this.render();

            // Setup event listeners
            this.setupEventListeners();
            this.initializeDateRangePicker();
            this.setDefaultDateRange();

            // Initialize modals
            this.initializeModals();

            // Load data asynchronously
            this.loadInitialData();

            console.log('✅ Reports Page Initialized');
        },

        // Load all initial data
        loadInitialData: async function () {
            if (this._isCleanedUp) {
                console.log('⚠️ Page cleaned up, skipping data load');
                return;
            }

            try {
                console.log('📥 Loading initial data...');

                // Load departments first (synchronously for filters)
                await this.loadDepartments();

                if (this._isCleanedUp) return;

                // Load statistics and calendar in parallel
                await Promise.all([
                    this.loadStatistics(),
                    this.loadCalendarView()
                ]);

                console.log('✅ Initial data loaded successfully');
            } catch (error) {
                console.error('❌ Error loading initial data:', error);
                TempleCore.showToast('Error loading data. Click Refresh to try again.', 'error');
            }
        },

        // Initialize modals
        initializeModals: function () {
            // Attendance details modal
            const modalEl = document.getElementById('attendanceDetailsModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
                this.config.attendanceDetailsModal = new bootstrap.Modal(modalEl);
            }

            // Day details modal
            const dayModalEl = document.getElementById('dayDetailsModal');
            if (dayModalEl && typeof bootstrap !== 'undefined') {
                this.config.dayDetailsModal = new bootstrap.Modal(dayModalEl);
            }
        },

        // Cleanup method
        cleanup: function () {
            if (this._isCleanedUp) {
                console.log('⚠️ Already cleaned up');
                return;
            }

            console.log(`🧹 Cleaning up ${this.pageId}...`);
            this._isCleanedUp = true;

            window.VolunteersSharedModule.unregisterPage(this.pageId);

            if (this.config.dataTable) {
                try {
                    this.config.dataTable.destroy();
                    this.config.dataTable = null;
                } catch (e) {
                    console.warn('Error destroying DataTable:', e);
                }
            }

            if (this.config.attendanceDetailsModal) {
                try {
                    this.config.attendanceDetailsModal.dispose();
                    this.config.attendanceDetailsModal = null;
                } catch (e) {
                    console.warn('Error disposing modal:', e);
                }
            }

            if (this.config.dayDetailsModal) {
                try {
                    this.config.dayDetailsModal.dispose();
                    this.config.dayDetailsModal = null;
                } catch (e) {
                    console.warn('Error disposing day modal:', e);
                }
            }

            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            if (typeof gsap !== 'undefined') {
                try {
                    gsap.killTweensOf(`.${this.pageId}-page *`);
                } catch (e) {
                    console.warn('Error killing GSAP animations:', e);
                }
            }

            if (this.config.intervals) {
                this.config.intervals.forEach(interval => clearInterval(interval));
                this.config.intervals = [];
            }

            if (this.config.timeouts) {
                this.config.timeouts.forEach(timeout => clearTimeout(timeout));
                this.config.timeouts = [];
            }

            console.log(`✅ ${this.pageId} cleanup completed`);
        },

        // Get avatar color based on name
        getAvatarColor: function (name) {
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
        },

        // Get initials from name
        getInitials: function (name) {
            if (!name) return '?';
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name.substring(0, 1).toUpperCase();
        },

        render: function () {
            console.log('📝 Rendering Reports Page HTML');

            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header -->
                    <div class="volunteers-header">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-calendar-week volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Volunteer Reports</h1>
                                            <p class="volunteers-subtitle">义工报告 • Attendance & Activity Reports</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-3">
                            <div class="card stats-card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex align-items-center">
                                        <div class="stats-icon bg-primary text-white">
                                            <i class="bi bi-file-earmark-text"></i>
                                        </div>
                                        <div class="ms-3">
                                            <h6 class="text-muted mb-0">Total Records</h6>
                                            <h3 class="mb-0" id="statTotalRecords">-</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex align-items-center">
                                        <div class="stats-icon bg-success text-white">
                                            <i class="bi bi-clock-history"></i>
                                        </div>
                                        <div class="ms-3">
                                            <h6 class="text-muted mb-0">Total Hours</h6>
                                            <h3 class="mb-0" id="statTotalHours">-</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex align-items-center">
                                        <div class="stats-icon bg-info text-white">
                                            <i class="bi bi-people"></i>
                                        </div>
                                        <div class="ms-3">
                                            <h6 class="text-muted mb-0">Unique Volunteers</h6>
                                            <h3 class="mb-0" id="statUniqueVolunteers">-</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex align-items-center">
                                        <div class="stats-icon bg-warning text-white">
                                            <i class="bi bi-graph-up"></i>
                                        </div>
                                        <div class="ms-3">
                                            <h6 class="text-muted mb-0">Avg Hours/Day</h6>
                                            <h3 class="mb-0" id="statAvgHours">-</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Card -->
                    <div class="card shadow-sm volunteers-content-card">
                        <div class="card-body p-4">
                            <!-- Filters Section -->
                            <div class="filters-section mb-4">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-calendar-range me-2 text-primary"></i>Date Range
                                        </label>
                                        <input type="text" class="form-control" id="dateRangePicker" 
                                               placeholder="Select date range...">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-diagram-3 me-2 text-primary"></i>Department
                                        </label>
                                        <select class="form-select" id="filterDepartment">
                                            <option value="">All Departments</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-list-task me-2 text-primary"></i>Task
                                        </label>
                                        <select class="form-select" id="filterTask">
                                            <option value="">All Tasks</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-funnel me-2 text-primary"></i>Entry Type
                                        </label>
                                        <select class="form-select" id="filterEntryType">
                                            <option value="">All Types</option>
                                            <option value="normal">Normal</option>
                                            <option value="manual">Manual</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label d-block">&nbsp;</label>
                                        <button class="btn btn-primary me-2" id="btnRefresh">
                                            <i class="bi bi-arrow-clockwise me-2"></i>Refresh
                                        </button>
                                        <button class="btn btn-outline-secondary" id="btnClearFilters">
                                            <i class="bi bi-x-circle me-2"></i>Clear
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- View Toggle -->
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-primary active" id="viewToggleCalendar">
                                        <i class="bi bi-calendar3 me-2"></i>Calendar View
                                    </button>
                                    <button class="btn btn-outline-primary" id="viewToggleList">
                                        <i class="bi bi-list-ul me-2"></i>List View
                                    </button>
                                </div>

                                <!-- Calendar Controls -->
                                <div id="calendarControls">
                                    <div class="btn-group me-3" role="group">
                                        <button class="btn btn-sm btn-outline-secondary active" id="periodMonth">Month</button>
                                        <button class="btn btn-sm btn-outline-secondary" id="periodWeek">Week</button>
                                        <button class="btn btn-sm btn-outline-secondary" id="periodDay">Day</button>
                                    </div>
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-sm btn-outline-secondary" id="btnPrevPeriod">
                                            <i class="bi bi-chevron-left"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary" id="btnToday">Today</button>
                                        <button class="btn btn-sm btn-outline-secondary" id="btnNextPeriod">
                                            <i class="bi bi-chevron-right"></i>
                                        </button>
                                    </div>
                                    <span class="ms-3 fw-bold" id="currentPeriodTitle"></span>
                                </div>
                            </div>

                            <!-- Calendar View Container -->
                            <div id="calendarViewContainer">
                                <div id="calendarContainer" class="calendar-wrapper">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="mt-2 text-muted">Loading calendar...</p>
                                    </div>
                                </div>
                            </div>

                            <!-- List View Container -->
                            <div id="listViewContainer" style="display: none;">
                                <div class="table-responsive">
                                    <table class="table table-hover" id="attendanceTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Volunteer</th>
                                                <th>Date</th>
                                                <th>Department</th>
                                                <th>Task</th>
                                                <th>Clock In</th>
                                                <th>Clock Out</th>
                                                <th class="text-center">Hours</th>
                                                <th class="text-center">Type</th>
                                                <th class="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="10" class="text-center py-5">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2 text-muted">Loading attendance records...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Day Details Modal (NEW - for calendar day popup) -->
                    <div class="modal fade" id="dayDetailsModal" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content day-details-modal">
                                <div class="modal-header day-details-header">
                                    <h5 class="modal-title" id="dayDetailsTitle">
                                        <i class="bi bi-calendar-event me-2"></i>
                                        <span id="dayDetailsDate">Loading...</span>
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body p-0" id="dayDetailsContent">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance Details Modal -->
                    <div class="modal fade" id="attendanceDetailsModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header bg-primary text-white">
                                    <h5 class="modal-title">
                                        <i class="bi bi-file-earmark-text me-2"></i>Attendance Record Details
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body" id="attendanceDetailsContent">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle me-2"></i>Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom CSS for Day Details Modal -->
                <style>
                    .day-details-modal {
                        border-radius: 12px;
                        overflow: hidden;
                        border: none;
                    }
                    
                    .day-details-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-bottom: none;
                        padding: 1rem 1.25rem;
                    }
                    
                    .day-details-header .modal-title {
                        font-weight: 600;
                        font-size: 1.1rem;
                    }
                    
                    .day-details-summary {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.75rem 1.25rem;
                        background: #f8f9fa;
                        border-bottom: 1px solid #e9ecef;
                        font-size: 0.9rem;
                        color: #6c757d;
                    }
                    
                    .day-details-summary .total-hours {
                        font-weight: 600;
                        color: #198754;
                    }
                    
                    .volunteer-list {
                        max-height: 400px;
                        overflow-y: auto;
                    }
                    
                    .volunteer-item {
                        display: flex;
                        align-items: flex-start;
                        padding: 1rem 1.25rem;
                        border-bottom: 1px solid #f0f0f0;
                        transition: background 0.2s ease;
                    }
                    
                    .volunteer-item:hover {
                        background: #f8f9fa;
                    }
                    
                    .volunteer-item:last-child {
                        border-bottom: none;
                    }
                    
                    .volunteer-avatar {
                        width: 42px;
                        height: 42px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 600;
                        font-size: 1rem;
                        flex-shrink: 0;
                    }
                    
                    .volunteer-info {
                        flex: 1;
                        margin-left: 0.875rem;
                        min-width: 0;
                    }
                    
                    .volunteer-name {
                        font-weight: 600;
                        color: #333;
                        font-size: 0.95rem;
                        margin-bottom: 2px;
                    }
                    
                    .volunteer-id {
                        font-size: 0.8rem;
                        color: #888;
                    }
                    
                    .volunteer-hours {
                        text-align: right;
                        flex-shrink: 0;
                        margin-left: 1rem;
                    }
                    
                    .volunteer-hours .hours-value {
                        font-weight: 700;
                        font-size: 1rem;
                        color: #e74c3c;
                    }
                    
                    .volunteer-hours .time-range {
                        font-size: 0.75rem;
                        color: #888;
                    }
                    
                    .volunteer-tags {
                        margin-top: 0.5rem;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.375rem;
                    }
                    
                    .volunteer-tag {
                        display: inline-block;
                        padding: 0.2rem 0.5rem;
                        border-radius: 4px;
                        font-size: 0.75rem;
                        background: #e0f7fa;
                        color: #00796b;
                        font-weight: 500;
                    }
                    
                    .volunteer-tag.manual {
                        background: #fff3e0;
                        color: #e65100;
                    }
                    
                    .no-records {
                        text-align: center;
                        padding: 3rem 1rem;
                        color: #888;
                    }
                    
                    .no-records i {
                        font-size: 3rem;
                        margin-bottom: 1rem;
                        color: #ddd;
                    }
                    
                    /* Calendar card clickable styles */
                    .calendar-day-card {
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    
                    .calendar-day-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    
                    .calendar-day-card.has-records {
                        border-left: 4px solid #198754;
                    }
                    
                    .calendar-day-card.has-records:hover {
                        border-left-color: #157347;
                    }
                </style>
            `;

            $('#page-container').html(html);
            console.log('✅ HTML rendered successfully');
        },

        // Setup event listeners
        setupEventListeners: function () {
            const self = this;

            // View toggle
            $('#viewToggleCalendar').on('click.' + this.eventNamespace, function () {
                self.switchView('calendar');
            });

            $('#viewToggleList').on('click.' + this.eventNamespace, function () {
                self.switchView('list');
            });

            // Period buttons
            $('#periodMonth').on('click.' + this.eventNamespace, function () {
                self.changePeriod('month');
            });

            $('#periodWeek').on('click.' + this.eventNamespace, function () {
                self.changePeriod('week');
            });

            $('#periodDay').on('click.' + this.eventNamespace, function () {
                self.changePeriod('day');
            });

            // Navigation buttons
            $('#btnPrevPeriod').on('click.' + this.eventNamespace, function () {
                self.navigatePeriod('prev');
            });

            $('#btnNextPeriod').on('click.' + this.eventNamespace, function () {
                self.navigatePeriod('next');
            });

            $('#btnToday').on('click.' + this.eventNamespace, function () {
                self.navigateToToday();
            });

            // Filter changes
            $('#filterDepartment').on('change.' + this.eventNamespace, function (e) {
                self.config.filters.department_id = e.target.value;
                self.loadTasksByDepartment(e.target.value);
                self.applyFilters();
            });

            $('#filterTask').on('change.' + this.eventNamespace, function (e) {
                self.config.filters.task_id = e.target.value;
                self.applyFilters();
            });

            $('#filterEntryType').on('change.' + this.eventNamespace, function (e) {
                self.config.filters.entry_type = e.target.value;
                self.applyFilters();
            });

            // Export button
            $('#btnExportExcel').on('click.' + this.eventNamespace, function () {
                self.exportReport('excel');
            });

            // Clear filters
            $('#btnClearFilters').on('click.' + this.eventNamespace, function () {
                self.clearFilters();
            });

            // Refresh button
            $('#btnRefresh').on('click.' + this.eventNamespace, function () {
                self.refreshData();
            });
        },

        // Initialize date range picker
        initializeDateRangePicker: function () {
            const self = this;
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

            if (typeof $.fn.daterangepicker !== 'undefined') {
                $('#dateRangePicker').daterangepicker({
                    startDate: moment(firstDay),
                    endDate: moment(today),
                    locale: {
                        format: 'DD/MM/YYYY',
                        separator: ' - ',
                        applyLabel: 'Apply',
                        cancelLabel: 'Clear'
                    },
                    ranges: {
                        'Today': [moment(), moment()],
                        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                        'This Month': [moment().startOf('month'), moment().endOf('month')],
                        'Last Month': [moment().subtract(1, 'month').startOf('month'),
                        moment().subtract(1, 'month').endOf('month')]
                    }
                });

                $('#dateRangePicker').on('apply.daterangepicker', function (ev, picker) {
                    self.config.filters.dateFrom = picker.startDate.format('YYYY-MM-DD');
                    self.config.filters.dateTo = picker.endDate.format('YYYY-MM-DD');
                    self.applyFilters();
                });

                $('#dateRangePicker').on('cancel.daterangepicker', function () {
                    self.config.filters.dateFrom = null;
                    self.config.filters.dateTo = null;
                    $('#dateRangePicker').val('');
                    self.applyFilters();
                });
            }
        },

        // Set default date range (current month)
        setDefaultDateRange: function () {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

            this.config.filters.dateFrom = moment(firstDay).format('YYYY-MM-DD');
            this.config.filters.dateTo = moment(today).format('YYYY-MM-DD');
        },

        // Switch between calendar and list view
        switchView: function (view) {
            this.config.currentView = view;

            if (view === 'calendar') {
                $('#viewToggleCalendar').addClass('active');
                $('#viewToggleList').removeClass('active');
                $('#calendarViewContainer').show();
                $('#listViewContainer').hide();
                $('#calendarControls').show();
                this.loadCalendarView();
            } else {
                $('#viewToggleCalendar').removeClass('active');
                $('#viewToggleList').addClass('active');
                $('#calendarViewContainer').hide();
                $('#listViewContainer').show();
                $('#calendarControls').hide();
                this.loadListView();
            }
        },

        // Change calendar period
        changePeriod: function (period) {
            this.config.currentPeriod = period;

            $('#periodMonth, #periodWeek, #periodDay').removeClass('active');
            $(`#period${period.charAt(0).toUpperCase() + period.slice(1)}`).addClass('active');

            this.loadCalendarView();
        },

        // Navigate period (prev/next)
        navigatePeriod: function (direction) {
            const current = this.config.currentDate;
            const period = this.config.currentPeriod;

            if (direction === 'prev') {
                if (period === 'month') {
                    current.setMonth(current.getMonth() - 1);
                } else if (period === 'week') {
                    current.setDate(current.getDate() - 7);
                } else {
                    current.setDate(current.getDate() - 1);
                }
            } else {
                if (period === 'month') {
                    current.setMonth(current.getMonth() + 1);
                } else if (period === 'week') {
                    current.setDate(current.getDate() + 7);
                } else {
                    current.setDate(current.getDate() + 1);
                }
            }

            this.config.currentDate = current;
            this.loadCalendarView();
        },

        // Navigate to today
        navigateToToday: function () {
            this.config.currentDate = new Date();
            this.loadCalendarView();
        },

        // Load departments for filter
        loadDepartments: async function () {
            try {
                const response = await TempleAPI.get('/volunteers/departments', { status: 'active' });

                if (response.success) {
                    const departments = response.data || [];
                    const select = $('#filterDepartment');

                    select.find('option:not(:first)').remove();

                    departments.forEach(function (dept) {
                        select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                    });

                    console.log(`✅ Loaded ${departments.length} departments`);
                }
            } catch (error) {
                console.error('❌ Error loading departments:', error);
            }
        },

        // Load tasks by department
        loadTasksByDepartment: async function (departmentId) {
            const select = $('#filterTask');
            select.empty();
            select.append('<option value="">All Tasks</option>');

            if (!departmentId) {
                this.config.filters.task_id = '';
                return;
            }

            try {
                const response = await TempleAPI.get(`/volunteers/tasks/by-department/${departmentId}`);

                if (response.success) {
                    const tasks = response.data || [];
                    tasks.forEach(task => {
                        select.append(`<option value="${task.id}">${task.task_name}</option>`);
                    });

                    console.log(`✅ Loaded ${tasks.length} tasks for department`);
                }
            } catch (error) {
                console.error('❌ Error loading tasks:', error);
            }
        },

        // Load statistics
        loadStatistics: async function () {
            try {
                const params = {
                    date_from: this.config.filters.dateFrom || '',
                    date_to: this.config.filters.dateTo || '',
                    department_id: this.config.filters.department_id || '',
                    task_id: this.config.filters.task_id || '',
                    entry_type: this.config.filters.entry_type || ''
                };

                const response = await TempleAPI.get(`${this.config.apiBaseUrl}/summary`, params);

                if (response.success) {
                    this.config.statistics = response.data || {};
                    this.renderStatistics();
                    console.log('✅ Statistics loaded');
                }
            } catch (error) {
                console.error('❌ Error loading statistics:', error);
                TempleCore.showToast('Error loading statistics', 'error');
            }
        },

        // Render statistics cards
        renderStatistics: function () {
            const stats = this.config.statistics;

            $('#statTotalRecords').text(stats.total_records || 0);
            $('#statTotalHours').text((stats.total_hours || 0).toFixed(1));
            $('#statUniqueVolunteers').text(stats.unique_volunteers || 0);
            $('#statAvgHours').text((stats.average_hours_per_day || 0).toFixed(1));
        },

        // Load calendar view
        loadCalendarView: async function () {
            try {
                const period = this.config.currentPeriod;
                const date = moment(this.config.currentDate);

                let dateFrom, dateTo;

                if (period === 'month') {
                    dateFrom = date.clone().startOf('month').format('YYYY-MM-DD');
                    dateTo = date.clone().endOf('month').format('YYYY-MM-DD');
                } else if (period === 'week') {
                    dateFrom = date.clone().startOf('week').format('YYYY-MM-DD');
                    dateTo = date.clone().endOf('week').format('YYYY-MM-DD');
                } else {
                    dateFrom = date.format('YYYY-MM-DD');
                    dateTo = date.format('YYYY-MM-DD');
                }

                const params = {
                    date_from: dateFrom,
                    date_to: dateTo,
                    department_id: this.config.filters.department_id || '',
                    task_id: this.config.filters.task_id || '',
                    entry_type: this.config.filters.entry_type || ''
                };

                console.log('📅 Loading calendar:', params);

                const response = await TempleAPI.get(`${this.config.apiBaseUrl}/calendar`, params);

                if (response.success) {
                    this.config.calendarData = response.data || [];
                    this.renderCalendar();
                    this.updatePeriodTitle();
                    console.log(`✅ Calendar loaded: ${this.config.calendarData.length} days`);
                }
            } catch (error) {
                console.error('❌ Error loading calendar:', error);
                TempleCore.showToast('Error loading calendar data', 'error');

                $('#calendarContainer').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error loading calendar data. Please try again.
                    </div>
                `);
            }
        },

        // Render calendar with clickable day cards
        renderCalendar: function () {
            const self = this;
            const period = this.config.currentPeriod;
            const data = this.config.calendarData;

            // Count days with activity
            const daysWithActivity = data.filter(d => d.records_count > 0).length;

            let html = `
                <div class="alert alert-info mb-3">
                    <i class="bi bi-info-circle me-2"></i>
                    Showing ${data.length} day(s) with <strong>${daysWithActivity}</strong> day(s) having attendance records
                    <small class="d-block mt-1 text-muted">Click on a day to view detailed attendance</small>
                </div>
            `;

            if (data.length > 0) {
                html += '<div class="row g-3">';
                data.forEach((day, index) => {
                    const hasRecords = day.records_count > 0;
                    const activityClass = day.activity_level === 'high' ? 'success' :
                        day.activity_level === 'medium' ? 'warning' : 
                        hasRecords ? 'info' : 'secondary';

                    const cardClass = hasRecords ? 'calendar-day-card has-records' : 'calendar-day-card';
                    const clickHandler = hasRecords ? `onclick="VolunteersReportsPage.showDayDetails('${day.date}')"` : '';
                    const cursorStyle = hasRecords ? 'cursor: pointer;' : 'cursor: default;';

                    html += `
                        <div class="col-md-${period === 'month' ? '3' : period === 'week' ? '4' : '12'}">
                            <div class="card ${cardClass} border-${activityClass}" ${clickHandler} style="${cursorStyle}">
                                <div class="card-body">
                                    <h6 class="card-title d-flex justify-content-between align-items-center">
                                        <span>${moment(day.date).format('ddd, MMM D')}</span>
                                        ${hasRecords ? `<span class="badge bg-${activityClass}">${day.records_count}</span>` : ''}
                                    </h6>
                                    <p class="mb-1">
                                        <strong class="text-${hasRecords ? 'success' : 'muted'}">${day.total_hours}h</strong> 
                                        • ${day.unique_volunteers} volunteer${day.unique_volunteers !== 1 ? 's' : ''}
                                    </p>
                                    <p class="mb-0 text-muted small">${day.records_count} record${day.records_count !== 1 ? 's' : ''}</p>
                                    ${day.manual_entries_count > 0 ?
                                        `<span class="badge bg-warning mt-2">${day.manual_entries_count} manual</span>` : ''}
                                    ${hasRecords ? `
                                        <div class="mt-2">
                                            <small class="text-primary">
                                                <i class="bi bi-eye me-1"></i>Click to view details
                                            </small>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                html += `
                    <div class="text-center py-5">
                        <i class="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
                        <p class="text-muted">No attendance records found for this period</p>
                    </div>
                `;
            }

            $('#calendarContainer').html(html);
        },

        // Show day details popup - NEW METHOD
        showDayDetails: function (dateStr) {
            console.log('📅 Showing day details for:', dateStr);

            // Find the day data from calendarData
            const dayData = this.config.calendarData.find(d => d.date === dateStr);

            if (!dayData) {
                console.error('Day data not found for:', dateStr);
                TempleCore.showToast('Could not load day details', 'error');
                return;
            }

            // Update modal title
            const formattedDate = moment(dateStr).format('dddd, MMMM D, YYYY');
            $('#dayDetailsDate').text(formattedDate);

            // Render the content
            this.renderDayDetailsContent(dayData);

            // Show the modal
            if (this.config.dayDetailsModal) {
                this.config.dayDetailsModal.show();
            } else {
                $('#dayDetailsModal').modal('show');
            }
        },

        // Render day details content - NEW METHOD
        renderDayDetailsContent: function (dayData) {
            const self = this;
            const records = dayData.records || [];
            const totalHours = dayData.total_hours || 0;

            let html = '';

            // Summary bar
            html += `
                <div class="day-details-summary">
                    <span>Total: <strong>${records.length} record${records.length !== 1 ? 's' : ''}</strong></span>
                    <span class="total-hours">${totalHours} hours</span>
                </div>
            `;

            if (records.length > 0) {
                html += '<div class="volunteer-list">';

                records.forEach((record, index) => {
                    const name = record.volunteer_name || 'Unknown';
                    const volunteerId = record.volunteer_id || 'N/A';
                    const hours = record.hours || 0;
                    const clockIn = record.clock_in || '--:--';
                    const clockOut = record.clock_out || '--:--';
                    const department = record.department || 'N/A';
                    const task = record.task || 'N/A';
                    const isManual = record.is_manual;

                    // Get avatar color and initials
                    const avatarColor = self.getAvatarColor(name);
                    const initials = self.getInitials(name);

                    // Format time range
                    const timeRange = `${self.formatTime12Hour(clockIn)} - ${self.formatTime12Hour(clockOut)}`;

                    html += `
                        <div class="volunteer-item" onclick="VolunteersReportsPage.viewAttendanceDetails('${record.id}')">
                            <div class="volunteer-avatar" style="background-color: ${avatarColor};">
                                ${initials}
                            </div>
                            <div class="volunteer-info">
                                <div class="volunteer-name">${self.escapeHtml(name)}</div>
                                <div class="volunteer-id">${self.escapeHtml(volunteerId)}</div>
                                <div class="volunteer-tags">
                                    <span class="volunteer-tag">${self.escapeHtml(department)}</span>
                                    <span class="volunteer-tag">${self.escapeHtml(task)}</span>
                                    ${isManual ? '<span class="volunteer-tag manual">Manual Entry</span>' : ''}
                                </div>
                            </div>
                            <div class="volunteer-hours">
                                <div class="hours-value">${hours}h</div>
                                <div class="time-range">${timeRange}</div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
            } else {
                html += `
                    <div class="no-records">
                        <i class="bi bi-inbox d-block"></i>
                        <p>No attendance records for this day</p>
                    </div>
                `;
            }

            $('#dayDetailsContent').html(html);
        },

        // Format time to 12-hour format
        formatTime12Hour: function (time24) {
            if (!time24 || time24 === '--:--') return '--:--';
            
            const [hours, minutes] = time24.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            
            return `${hour12}:${minutes} ${ampm}`;
        },

        // Escape HTML to prevent XSS
        escapeHtml: function (text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // Update period title
        updatePeriodTitle: function () {
            const date = moment(this.config.currentDate);
            const period = this.config.currentPeriod;

            let title = '';
            if (period === 'month') {
                title = date.format('MMMM YYYY');
            } else if (period === 'week') {
                const start = date.clone().startOf('week');
                const end = date.clone().endOf('week');
                title = `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
            } else {
                title = date.format('MMMM D, YYYY');
            }

            $('#currentPeriodTitle').text(title);
        },

        // Load list view
        loadListView: async function () {
            try {
                const params = {
                    date_from: this.config.filters.dateFrom || '',
                    date_to: this.config.filters.dateTo || '',
                    department_id: this.config.filters.department_id || '',
                    task_id: this.config.filters.task_id || '',
                    entry_type: this.config.filters.entry_type || ''
                };

                console.log('📋 Loading attendance list:', params);

                const response = await TempleAPI.get('/volunteers/attendance', params);

                if (response.success) {
                    const records = response.data || [];
                    this.renderDataTable(records);
                    console.log(`✅ Loaded ${records.length} attendance records`);
                }
            } catch (error) {
                console.error('❌ Error loading attendance list:', error);
                TempleCore.showToast('Error loading attendance records', 'error');

                $('#attendanceTable tbody').html(`
                    <tr>
                        <td colspan="10" class="text-center py-5">
                            <div class="alert alert-danger">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                Error loading attendance records. Please try again.
                            </div>
                        </td>
                    </tr>
                `);
            }
        },

        // Render DataTable
        renderDataTable: function (data) {
            const tableBody = $('#attendanceTable tbody');
            tableBody.empty();

            if (data.length === 0) {
                tableBody.html(`
                    <tr>
                        <td colspan="10" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                            <p class="text-muted">No attendance records found</p>
                        </td>
                    </tr>
                `);
                return;
            }

            data.forEach((record, index) => {
                const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <div>${record.volunteer?.full_name || 'N/A'}</div>
                            <small class="text-muted">${record.volunteer?.volunteer_id || ''}</small>
                        </td>
                        <td>${moment(record.attendance_date).format('DD/MM/YYYY')}</td>
                        <td>${record.department?.department_name || 'N/A'}</td>
                        <td>${record.task?.task_name || 'N/A'}</td>
                        <td>${record.clock_in_time ? moment(record.clock_in_time).format('hh:mm A') : '-'}</td>
                        <td>${record.clock_out_time ? moment(record.clock_out_time).format('hh:mm A') : '<span class="badge bg-warning">In Progress</span>'}</td>
                        <td class="text-center">${record.total_hours ? parseFloat(record.total_hours).toFixed(1) : '-'}</td>
                        <td class="text-center">
                            ${record.entry_type === 'manual' ?
                        '<span class="badge bg-warning">Manual</span>' :
                        '<span class="badge bg-success">Normal</span>'}
                        </td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-info" onclick="VolunteersReportsPage.viewAttendanceDetails('${record.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.append(row);
            });
        },

        // View attendance details
        viewAttendanceDetails: async function (attendanceId) {
            console.log('📋 Viewing attendance details:', attendanceId);

            // Close day details modal if open
            if (this.config.dayDetailsModal) {
                this.config.dayDetailsModal.hide();
            }

            try {
                // Show loading in modal
                $('#attendanceDetailsContent').html(`
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Loading attendance details...</p>
                    </div>
                `);

                // Show modal
                if (this.config.attendanceDetailsModal) {
                    this.config.attendanceDetailsModal.show();
                } else {
                    $('#attendanceDetailsModal').modal('show');
                }

                // Fetch attendance details
                const response = await TempleAPI.get(`/volunteers/attendance/${attendanceId}`);

                if (response.success) {
                    const record = response.data;
                    this.renderAttendanceDetails(record);
                } else {
                    throw new Error(response.message || 'Failed to load attendance details');
                }

            } catch (error) {
                console.error('❌ Error loading attendance details:', error);
                $('#attendanceDetailsContent').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error loading attendance details. Please try again.
                    </div>
                `);
            }
        },

        // Render attendance details in modal
        renderAttendanceDetails: function (record) {
            const isManual = record.entry_type === 'manual';
            const isInProgress = !record.clock_out_time;

            let html = `
                <div class="row g-3">
                    <!-- Volunteer Information -->
                    <div class="col-md-6">
                        <div class="card border-primary h-100">
                            <div class="card-header bg-primary text-white">
                                <h6 class="mb-0"><i class="bi bi-person me-2"></i>Volunteer Information</h6>
                            </div>
                            <div class="card-body">
                                <table class="table table-sm mb-0">
                                    <tr>
                                        <th width="40%">Name:</th>
                                        <td>${record.volunteer?.full_name || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Volunteer ID:</th>
                                        <td><span class="badge bg-secondary">${record.volunteer?.volunteer_id || 'N/A'}</span></td>
                                    </tr>
                                    <tr>
                                        <th>Mobile:</th>
                                        <td>${record.volunteer?.mobile_number || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Email:</th>
                                        <td>${record.volunteer?.email || 'N/A'}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Assignment Information -->
                    <div class="col-md-6">
                        <div class="card border-info h-100">
                            <div class="card-header bg-info text-white">
                                <h6 class="mb-0"><i class="bi bi-briefcase me-2"></i>Assignment Details</h6>
                            </div>
                            <div class="card-body">
                                <table class="table table-sm mb-0">
                                    <tr>
                                        <th width="40%">Date:</th>
                                        <td><strong>${moment(record.attendance_date).format('DD/MM/YYYY (dddd)')}</strong></td>
                                    </tr>
                                    <tr>
                                        <th>Department:</th>
                                        <td><span class="badge bg-info">${record.department?.department_name || 'N/A'}</span></td>
                                    </tr>
                                    <tr>
                                        <th>Task:</th>
                                        <td>${record.task?.task_name || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Description:</th>
                                        <td><small class="text-muted">${record.task?.description || 'No description'}</small></td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance Information -->
                    <div class="col-12">
                        <div class="card ${isInProgress ? 'border-warning' : 'border-success'}">
                            <div class="card-header ${isInProgress ? 'bg-warning' : 'bg-success'} text-white">
                                <h6 class="mb-0">
                                    <i class="bi bi-clock-history me-2"></i>Attendance Details
                                    ${isInProgress ? '<span class="badge bg-white text-warning ms-2">In Progress</span>' : ''}
                                </h6>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label fw-semibold text-success">
                                            <i class="bi bi-box-arrow-in-right me-1"></i>Clock In
                                        </label>
                                        <div class="fs-4 fw-bold text-success">
                                            ${record.clock_in_time ? moment(record.clock_in_time).format('hh:mm A') : 'N/A'}
                                        </div>
                                        <small class="text-muted">${record.clock_in_time ? moment(record.clock_in_time).format('DD/MM/YYYY') : ''}</small>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label fw-semibold ${isInProgress ? 'text-warning' : 'text-danger'}">
                                            <i class="bi bi-box-arrow-right me-1"></i>Clock Out
                                        </label>
                                        <div class="fs-4 fw-bold ${isInProgress ? 'text-warning' : 'text-danger'}">
                                            ${record.clock_out_time ? moment(record.clock_out_time).format('hh:mm A') : 'Not clocked out'}
                                        </div>
                                        <small class="text-muted">${record.clock_out_time ? moment(record.clock_out_time).format('DD/MM/YYYY') : ''}</small>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label fw-semibold text-primary">
                                            <i class="bi bi-hourglass-split me-1"></i>Total Hours
                                        </label>
                                        <div class="fs-4 fw-bold text-primary">
                                            ${record.total_hours ? parseFloat(record.total_hours).toFixed(2) : '0.00'} hrs
                                        </div>
                                        <small class="text-muted">${record.total_hours ? `${(parseFloat(record.total_hours) * 60).toFixed(0)} minutes` : ''}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Entry Type & Status -->
                    <div class="col-md-6">
                        <div class="card border-secondary">
                            <div class="card-header bg-secondary text-white">
                                <h6 class="mb-0"><i class="bi bi-flag me-2"></i>Entry Type & Status</h6>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Entry Type:</label>
                                    <div>
                                        ${isManual ?
                                            '<span class="badge bg-warning fs-6"><i class="bi bi-pencil-square me-1"></i>Manual Entry</span>' :
                                            '<span class="badge bg-success fs-6"><i class="bi bi-check-circle me-1"></i>Normal Entry</span>'}
                                    </div>
                                </div>
                                <div>
                                    <label class="form-label fw-semibold">Status:</label>
                                    <div>
                                        ${this.getStatusBadge(record.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Metadata -->
                    <div class="col-md-6">
                        <div class="card border-secondary">
                            <div class="card-header bg-secondary text-white">
                                <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Record Metadata</h6>
                            </div>
                            <div class="card-body">
                                <table class="table table-sm mb-0">
                                    <tr>
                                        <th width="40%">Record ID:</th>
                                        <td><small class="font-monospace">${record.id}</small></td>
                                    </tr>
                                    <tr>
                                        <th>Created:</th>
                                        <td><small>${record.created_at ? moment(record.created_at).format('DD/MM/YYYY hh:mm A') : 'N/A'}</small></td>
                                    </tr>
                                    <tr>
                                        <th>Last Updated:</th>
                                        <td><small>${record.updated_at ? moment(record.updated_at).format('DD/MM/YYYY hh:mm A') : 'N/A'}</small></td>
                                    </tr>
                                    ${record.created_by_user ? `
                                    <tr>
                                        <th>Created By:</th>
                                        <td><small>${record.created_by_user.name || 'N/A'}</small></td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>
                        </div>
                    </div>

                    ${isManual ? `
                    <!-- Manual Entry Details -->
                    <div class="col-12">
                        <div class="card border-warning">
                            <div class="card-header bg-warning text-dark">
                                <h6 class="mb-0">
                                    <i class="bi bi-exclamation-triangle me-2"></i>Manual Entry Information
                                </h6>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-warning mb-3">
                                    <i class="bi bi-info-circle me-2"></i>
                                    <strong>Note:</strong> This is a manually entered attendance record, not clocked in/out by the system.
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Reason for Manual Entry:</label>
                                    <div class="border rounded p-3 bg-light">
                                        ${record.manual_entry_reason || 'No reason provided'}
                                    </div>
                                </div>

                                ${record.manual_entry_by_user ? `
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Entered By:</label>
                                        <div>${record.manual_entry_by_user.name || 'N/A'}</div>
                                        <small class="text-muted">${record.manual_entry_by_user.email || ''}</small>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Entry Date:</label>
                                        <div>${record.created_at ? moment(record.created_at).format('DD/MM/YYYY hh:mm A') : 'N/A'}</div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${record.notes ? `
                    <!-- Notes -->
                    <div class="col-12">
                        <div class="card border-info">
                            <div class="card-header bg-info text-white">
                                <h6 class="mb-0"><i class="bi bi-sticky me-2"></i>Notes</h6>
                            </div>
                            <div class="card-body">
                                <div class="border rounded p-3 bg-light">
                                    ${record.notes}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;

            $('#attendanceDetailsContent').html(html);
        },

        // Get status badge HTML
        getStatusBadge: function (status) {
            const badges = {
                'active': '<span class="badge bg-success fs-6">Active</span>',
                'edited': '<span class="badge bg-info fs-6">Edited</span>',
                'cancelled': '<span class="badge bg-danger fs-6">Cancelled</span>',
                'disputed': '<span class="badge bg-warning fs-6">Disputed</span>'
            };

            return badges[status] || '<span class="badge bg-secondary fs-6">' + (status || 'Unknown') + '</span>';
        },

        // Apply filters
        applyFilters: function () {
            console.log('🔍 Applying filters...');
            this.loadStatistics();

            if (this.config.currentView === 'calendar') {
                this.loadCalendarView();
            } else {
                this.loadListView();
            }
        },

        // Clear filters
        clearFilters: function () {
            this.config.filters = {
                dateFrom: null,
                dateTo: null,
                department_id: '',
                task_id: '',
                volunteer_id: '',
                entry_type: '',
                search: ''
            };

            $('#filterDepartment').val('');
            $('#filterTask').val('');
            $('#filterEntryType').val('');
            $('#dateRangePicker').val('');

            this.setDefaultDateRange();
            this.applyFilters();

            TempleCore.showToast('Filters cleared', 'success');
        },

        // Refresh data
        refreshData: function () {
            console.log('🔄 Refreshing data...');
            this.loadStatistics();

            if (this.config.currentView === 'calendar') {
                this.loadCalendarView();
            } else {
                this.loadListView();
            }

            TempleCore.showToast('Data refreshed successfully', 'success');
        },

        // Export report
        exportReport: async function (format) {
            try {
                console.log('📤 Starting export:', format);
                
                const $btn = $('#btnExportExcel');
                const originalHtml = $btn.html();
                $btn.prop('disabled', true).html(
                    '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Exporting...'
                );

                const params = new URLSearchParams({
                    date_from: this.config.filters.dateFrom || '',
                    date_to: this.config.filters.dateTo || '',
                    department_id: this.config.filters.department_id || '',
                    task_id: this.config.filters.task_id || '',
                    entry_type: this.config.filters.entry_type || '',
                    format: format
                });

                const exportUrl = `/api/v1${this.config.apiBaseUrl}/export/${format}?${params}`;
                console.log('📤 Export URL:', exportUrl);

                const response = await fetch(exportUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    let errorMessage = `Export failed with status ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        errorMessage = response.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const jsonResponse = await response.json();
                    if (!jsonResponse.success) {
                        throw new Error(jsonResponse.message || 'Export failed');
                    }
                    if (jsonResponse.download_url) {
                        window.location.href = jsonResponse.download_url;
                        TempleCore.showToast('Export started successfully', 'success');
                        return;
                    }
                }

                const blob = await response.blob();

                let filename = `volunteer_attendance_report_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
                const contentDisposition = response.headers.get('content-disposition');
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                }

                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                window.URL.revokeObjectURL(downloadUrl);

                console.log('✅ Export completed:', filename);
                TempleCore.showToast(`Exported to ${filename}`, 'success');

            } catch (error) {
                console.error('❌ Error exporting report:', error);
                TempleCore.showToast(error.message || 'Error exporting report', 'error');
            } finally {
                const $btn = $('#btnExportExcel');
                $btn.prop('disabled', false).html(
                    '<i class="bi bi-file-earmark-excel me-2"></i>Export Excel'
                );
            }
        }
    };

    console.log('✅ VolunteersReportsPage module loaded and ready');

})(jQuery, window);