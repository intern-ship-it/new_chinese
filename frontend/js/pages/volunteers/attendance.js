// js/pages/volunteers/attendance.js
// Volunteer Attendance Management Page
// Track volunteer attendance with clock in/out and manual entries

(function($, window) {
    'use strict';
    
    // ========================================
    // VOLUNTEERS SHARED MODULE
    // ========================================
    if (!window.VolunteersSharedModule) {
        window.VolunteersSharedModule = {
            moduleId: 'volunteers',
            eventNamespace: 'volunteers',
            cssId: 'volunteers-css',
            cssPath: '/css/volunteers.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('✅ Volunteers CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`✅ Volunteers page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`🧹 Volunteers page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            cleanup: function() {
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
    // VOLUNTEERS ATTENDANCE PAGE
    // ========================================
    window.VolunteersAttendancePage = {
        pageId: 'volunteers-attendance',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        dataTable: null,
        currentAttendance: null,
        departments: [],
        tasks: [],
        volunteers: [],
        intervals: [],
        timeouts: [],
        
        init: function(params) {
            console.log('🚀 Initializing Volunteer Attendance Page');
            
            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);
            
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadFilterData();
            this.loadAttendance();
            this.startClockUpdate();
            
            console.log('✅ Attendance Page Initialized');
        },
        
        cleanup: function() {
            console.log(`🧹 Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.VolunteersSharedModule.unregisterPage(this.pageId);
            
            // Destroy DataTable
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            // Remove event handlers
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            // Kill GSAP animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            // Clear intervals and timeouts
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            console.log(`✅ ${this.pageId} cleanup completed`);
        },
        
        render: function() {
            console.log('📝 Rendering Attendance Page HTML');
            
            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header -->
                    <div class="volunteers-header" data-aos="fade-down">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-clock-history volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Volunteer Attendance</h1>
                                            <p class="volunteers-subtitle">义工出席记录 • Attendance Records Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <div class="btn-group">
                                        <button class="btn btn-light btn-lg" id="btnManualEntry">
                                            <i class="bi bi-pencil-square me-2"></i>
                                            Manual Entry
                                        </button>
                                        <button class="btn btn-primary btn-lg" id="btnClockIn">
                                            <i class="bi bi-clock me-2"></i>
                                            Clock In/Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row g-3 mb-4" data-aos="fade-up" data-aos-delay="200">
                        <div class="col-md-3">
                            <div class="card stat-card stat-card-primary">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="stat-label">Today's Attendance</p>
                                            <h3 class="stat-value" id="statTodayCount">-</h3>
                                        </div>
                                        <div class="stat-icon">
                                            <i class="bi bi-calendar-check"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card stat-card-success">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="stat-label">Currently Clocked In</p>
                                            <h3 class="stat-value" id="statClockedIn">-</h3>
                                        </div>
                                        <div class="stat-icon">
                                            <i class="bi bi-person-check"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card stat-card-info">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="stat-label">Total Hours (Today)</p>
                                            <h3 class="stat-value" id="statTodayHours">-</h3>
                                        </div>
                                        <div class="stat-icon">
                                            <i class="bi bi-clock"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card stat-card-warning">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="stat-label">Current Time</p>
                                            <h3 class="stat-value" id="currentTime">--:--:--</h3>
                                        </div>
                                        <div class="stat-icon">
                                            <i class="bi bi-stopwatch"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Card -->
                    <div class="card shadow-sm volunteers-content-card" data-aos="fade-up" data-aos-delay="400">
                        <div class="card-body p-4">
                            <!-- Filters Section -->
                            <div class="filters-section mb-4">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-calendar-range me-2 text-primary"></i>Date Range
                                        </label>
                                        <input type="text" class="form-control" id="dateRangePicker" 
                                               placeholder="Select date range">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-building me-2 text-primary"></i>Department
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
                                            <option value="manual">Manual Entry</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-search me-2 text-primary"></i>Search
                                        </label>
                                        <input type="text" class="form-control" id="searchInput" 
                                               placeholder="Search volunteer...">
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <button class="btn btn-primary" id="btnApplyFilters">
                                            <i class="bi bi-funnel me-2"></i>Apply Filters
                                        </button>
                                        <button class="btn btn-outline-secondary" id="btnResetFilters">
                                            <i class="bi bi-arrow-counterclockwise me-2"></i>Reset
                                        </button>
                                     
                                    </div>
                                </div>
                            </div>

                            <!-- Attendance Table -->
                            <div class="table-container">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle" id="attendanceTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th><i class="bi bi-person me-2"></i>Volunteer</th>
                                                <th><i class="bi bi-calendar3 me-2"></i>Date</th>
                                                <th><i class="bi bi-building me-2"></i>Department</th>
                                                <th><i class="bi bi-list-task me-2"></i>Task</th>
                                                <th><i class="bi bi-box-arrow-in-right me-2"></i>Clock In</th>
                                                <th><i class="bi bi-box-arrow-left me-2"></i>Clock Out</th>
                                                <th class="text-center"><i class="bi bi-clock me-2"></i>Hours</th>
                                                <th class="text-center"><i class="bi bi-tag me-2"></i>Type</th>
                                                <th class="text-center" width="100">Actions</th>
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
                </div>

                <!-- Clock In/Out Modal -->
                <div class="modal fade" id="clockModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-clock me-2"></i>
                                    Clock In/Out
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="clockForm">
                                    <div class="mb-3">
                                        <label class="form-label">Volunteer <span class="text-danger">*</span></label>
                                        <select class="form-select" id="clockVolunteer" required>
                                            <option value="">Select Volunteer</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Department <span class="text-danger">*</span></label>
                                        <select class="form-select" id="clockDepartment" required>
                                            <option value="">Select Department</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Task <span class="text-danger">*</span></label>
                                        <select class="form-select" id="clockTask" required>
                                            <option value="">Select Task</option>
                                        </select>
                                    </div>
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle me-2"></i>
                                        Current time will be recorded as clock in/out time.
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="btnConfirmClock">
                                    <i class="bi bi-check-circle me-2"></i>Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Manual Entry Modal -->
                <div class="modal fade" id="manualEntryModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-warning text-dark">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil-square me-2"></i>
                                    Manual Attendance Entry
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="manualEntryForm">
                                    <input type="hidden" id="attendanceId">
                                    
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Volunteer <span class="text-danger">*</span></label>
                                            <select class="form-select" id="manualVolunteer" required>
                                                <option value="">Select Volunteer</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="manualDate" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Department <span class="text-danger">*</span></label>
                                            <select class="form-select" id="manualDepartment" required>
                                                <option value="">Select Department</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Task <span class="text-danger">*</span></label>
                                            <select class="form-select" id="manualTask" required>
                                                <option value="">Select Task</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Clock In Time <span class="text-danger">*</span></label>
                                            <input type="time" class="form-control" id="manualClockIn" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Clock Out Time <span class="text-danger">*</span></label>
                                            <input type="time" class="form-control" id="manualClockOut" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Reason for Manual Entry <span class="text-danger">*</span></label>
                                            <textarea class="form-control" id="manualReason" rows="3" 
                                                      placeholder="Explain why manual entry is required..." required></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-warning" id="btnSaveManual">
                                    <i class="bi bi-check-circle me-2"></i>Save Manual Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Details Modal -->
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-eye me-2"></i>
                                    Attendance Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="attendanceDetailsBody">
                                <!-- Details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            console.log('✅ HTML rendered successfully');
        },
        
        initAnimations: function() {
            console.log('🎨 Initializing animations');
            
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true
                });
            }

            if (typeof gsap !== 'undefined') {
                gsap.to('.volunteers-header-icon', {
                    rotation: 360,
                    duration: 20,
                    repeat: -1,
                    ease: 'linear'
                });
            }
            
            console.log('✅ Animations initialized');
        },
        
        bindEvents: function() {
            const self = this;
            console.log('🔗 Binding events');
            
            // Clock In/Out Button
            $(document).on('click.' + this.eventNamespace, '#btnClockIn', function(e) {
                e.preventDefault();
                self.showClockModal();
            });
            
            // Manual Entry Button
            $(document).on('click.' + this.eventNamespace, '#btnManualEntry', function(e) {
                e.preventDefault();
                self.showManualEntryModal();
            });
            
            // Confirm Clock Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmClock', function(e) {
                e.preventDefault();
                self.processClock();
            });
            
            // Save Manual Entry Button
            $(document).on('click.' + this.eventNamespace, '#btnSaveManual', function(e) {
                e.preventDefault();
                self.saveManualEntry();
            });
            
            // View Details Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-view', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                self.viewDetails(id);
            });
            
            // Apply Filters
            $(document).on('click.' + this.eventNamespace, '#btnApplyFilters', function(e) {
                e.preventDefault();
                self.loadAttendance();
            });
            
            // Reset Filters
            $(document).on('click.' + this.eventNamespace, '#btnResetFilters', function(e) {
                e.preventDefault();
                $('#dateRangePicker').val('');
                $('#filterDepartment').val('');
                $('#filterTask').val('');
                $('#filterEntryType').val('');
                $('#searchInput').val('');
                self.loadAttendance();
            });
            
            // Export Button
            $(document).on('click.' + this.eventNamespace, '#btnExport', function(e) {
                e.preventDefault();
                self.exportAttendance();
            });
            
            // Department change - load tasks
            $(document).on('change.' + this.eventNamespace, '#filterDepartment, #clockDepartment, #manualDepartment', function(e) {
                const departmentId = $(this).val();
                const targetSelect = $(this).attr('id').replace('Department', 'Task');
                self.loadTasksByDepartment(departmentId, `#${targetSelect}`);
            });
            
            console.log('✅ Events bound successfully');
        },
        
        startClockUpdate: function() {
            const self = this;
            
            const updateClock = () => {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-GB');
                $('#currentTime').text(timeString);
            };
            
            updateClock();
            const interval = setInterval(updateClock, 1000);
            this.intervals.push(interval);
        },
        
        loadFilterData: async function() {
            console.log('📡 Loading filter data');
            
            try {
                // Load departments
                const deptResponse = await TempleAPI.get('/volunteers/departments/active');
                if (deptResponse.success) {
                    this.departments = deptResponse.data;
                    
                    const selects = ['#filterDepartment', '#clockDepartment', '#manualDepartment'];
                    selects.forEach(selector => {
                        const $select = $(selector);
                        $select.find('option:not(:first)').remove();
                        this.departments.forEach(dept => {
                            $select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                        });
                    });
                }
                
                // Load volunteers
                const volResponse = await TempleAPI.get('/volunteers/registration/active');
                if (volResponse.success) {
                    this.volunteers = volResponse.data;
                    
                    const selects = ['#clockVolunteer', '#manualVolunteer'];
                    selects.forEach(selector => {
                        const $select = $(selector);
                        $select.find('option:not(:first)').remove();
                        this.volunteers.forEach(vol => {
                            $select.append(`<option value="${vol.id}">${vol.full_name} (${vol.volunteer_id})</option>`);
                        });
                    });
                }
                
                // Initialize date range picker
                this.initDateRangePicker();
                
                console.log('✅ Filter data loaded');
            } catch (error) {
                console.error('❌ Failed to load filter data:', error);
            }
        },
        
        initDateRangePicker: function() {
            if (typeof moment === 'undefined' || typeof $.fn.daterangepicker === 'undefined') {
                console.warn('⚠️ Moment.js or DateRangePicker not loaded');
                return;
            }
            
            $('#dateRangePicker').daterangepicker({
                autoUpdateInput: false,
                locale: {
                    format: 'DD/MM/YYYY',
                    cancelLabel: 'Clear'
                },
                ranges: {
                    'Today': [moment(), moment()],
                    'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                    'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                    'This Month': [moment().startOf('month'), moment().endOf('month')]
                }
            });
            
            $('#dateRangePicker').on('apply.daterangepicker', function(ev, picker) {
                $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
            });
            
            $('#dateRangePicker').on('cancel.daterangepicker', function(ev, picker) {
                $(this).val('');
            });
        },
        
        loadTasksByDepartment: async function(departmentId, targetSelector) {
            console.log('📡 Loading tasks for department:', departmentId);
            
            const $select = $(targetSelector);
            $select.find('option:not(:first)').remove();
            
            if (!departmentId) return;
            
            try {
                const response = await TempleAPI.get(`/volunteers/tasks/by-department/${departmentId}`);
                if (response.success) {
                    response.data.forEach(task => {
                        $select.append(`<option value="${task.id}">${task.task_name}</option>`);
                    });
                }
            } catch (error) {
                console.error('❌ Failed to load tasks:', error);
            }
        },
        
        loadAttendance: async function() {
            console.log('📡 Loading attendance records');
            
            const filters = {
                search: $('#searchInput').val(),
                department_id: $('#filterDepartment').val(),
                task_id: $('#filterTask').val(),
                entry_type: $('#filterEntryType').val()
            };
            
            // Parse date range
            const dateRange = $('#dateRangePicker').val();
            if (dateRange && typeof moment !== 'undefined') {
                const dates = dateRange.split(' - ');
                if (dates.length === 2) {
                    filters.date_from = moment(dates[0], 'DD/MM/YYYY').format('YYYY-MM-DD');
                    filters.date_to = moment(dates[1], 'DD/MM/YYYY').format('YYYY-MM-DD');
                }
            }
            
            console.log('🔍 Filters:', filters);
            
            try {
                const response = await TempleAPI.get('/volunteers/attendance', filters);
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} records`);
                    this.renderTable(response.data || []);
                    this.loadStatistics();
                } else {
                    throw new Error(response.message || 'Failed to load attendance');
                }
            } catch (error) {
                console.error('❌ Error loading attendance:', error);
                
                let errorMessage = 'Failed to load attendance records';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                this.renderTable([]);
            }
        },
        
        renderTable: function(records) {
            console.log('📊 Rendering table with', records.length, 'records');
            
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            const tableBody = $('#attendanceTable tbody');
            tableBody.empty();
            
            if (records.length === 0) {
                tableBody.html(`
                    <tr>
                        <td colspan="10" class="text-center py-5">
                            <div class="empty-state">
                                <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                                <h5 class="text-muted">No Attendance Records Found</h5>
                                <p class="text-muted">Try adjusting your filters or record new attendance</p>
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }
            
            this.dataTable = $('#attendanceTable').DataTable({
                data: records,
                order: [[2, 'desc']],
                pageLength: 25,
                responsive: true,
                columns: [
                    {
                        data: null,
                        render: (data, type, row, meta) => meta.row + 1,
                        orderable: false,
                        width: '50px'
                    },
                    {
                        data: null,
                        render: (data, type, row) => {
                            const volunteer = row.volunteer || {};
                            return `<div class="fw-semibold">${volunteer.full_name || 'N/A'}</div>
                                    <small class="text-muted">${volunteer.volunteer_id || ''}</small>`;
                        }
                    },
                    {
                        data: 'attendance_date',
                        render: (data) => {
                            if (typeof moment !== 'undefined') {
                                return moment(data).format('DD/MM/YYYY');
                            }
                            return data;
                        }
                    },
                    {
                        data: null,
                        render: (data, type, row) => {
                            return row.department ? row.department.department_name : 'N/A';
                        }
                    },
                    {
                        data: null,
                        render: (data, type, row) => {
                            return row.task ? row.task.task_name : 'N/A';
                        }
                    },
                    {
                        data: 'clock_in_time',
                        render: (data) => {
                            if (typeof moment !== 'undefined') {
                                return moment(data).format('HH:mm');
                            }
                            return data;
                        }
                    },
                    {
                        data: 'clock_out_time',
                        render: (data) => {
                            if (!data) {
                                return '<span class="badge bg-warning">In Progress</span>';
                            }
                            if (typeof moment !== 'undefined') {
                                return moment(data).format('HH:mm');
                            }
                            return data;
                        }
                    },
                    {
                        data: 'total_hours',
                        className: 'text-center',
                        render: (data) => {
                            if (data) {
                                return `<strong>${parseFloat(data).toFixed(1)}</strong>`;
                            }
                            return '-';
                        }
                    },
                    {
                        data: 'entry_type',
                        className: 'text-center',
                        render: (data) => {
                            if (data === 'manual') {
                                return '<span class="badge bg-warning text-dark"><i class="bi bi-pencil me-1"></i>Manual</span>';
                            }
                            return '<span class="badge bg-success"><i class="bi bi-clock me-1"></i>Normal</span>';
                        }
                    },
                    {
                        data: null,
                        className: 'text-center',
                        orderable: false,
                        render: (data, type, row) => {
                            return `<button class="btn btn-sm btn-info btn-view" 
                                           data-id="${row.id}" title="View Details">
                                       <i class="bi bi-eye"></i>
                                   </button>`;
                        }
                    }
                ],
                language: {
                    search: "_INPUT_",
                    searchPlaceholder: "Search in table...",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ records"
                }
            });
            
            console.log('✅ DataTable initialized');
        },
        
      loadStatistics: async function() {
    console.log('📊 Loading statistics');
    
    try {
        const today = moment().format('YYYY-MM-DD');
        
        // Use the new daily report endpoint
        const response = await TempleAPI.get('/volunteers/attendance/reports/daily', {
            date: today
        });
        
        if (response.success && response.data) {
            const stats = response.data.statistics || {};
            
            $('#statTodayCount').text(stats.total_records || 0);
            $('#statTodayHours').text(stats.total_hours ? `${parseFloat(stats.total_hours).toFixed(1)}h` : '0h');
            $('#statClockedIn').text(stats.currently_clocked_in || 0);
        }
    } catch (error) {
        console.error('❌ Failed to load statistics:', error);
        // Set default values on error
        $('#statTodayCount').text('0');
        $('#statTodayHours').text('0h');
        $('#statClockedIn').text('0');
    }
},
        showClockModal: function() {
            console.log('🕐 Showing clock modal');
            
            $('#clockForm')[0].reset();
            
            const modal = new bootstrap.Modal(document.getElementById('clockModal'));
            modal.show();
        },
        
        showManualEntryModal: function(attendanceData = null) {
            console.log('📝 Showing manual entry modal');
            
            $('#manualEntryForm')[0].reset();
            $('#attendanceId').val('');
            
            // Set today's date by default
            if (typeof moment !== 'undefined') {
                $('#manualDate').val(moment().format('YYYY-MM-DD'));
            } else {
                $('#manualDate').val(new Date().toISOString().split('T')[0]);
            }
            
            const modal = new bootstrap.Modal(document.getElementById('manualEntryModal'));
            modal.show();
        },
        
     processClock: async function() {
    console.log('🕐 Processing clock in/out');
    
    const form = $('#clockForm')[0];
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // IMPORTANT: Always include attendance_date
    const formData = {
        volunteer_id: $('#clockVolunteer').val(),
        department_id: $('#clockDepartment').val(),
        task_id: $('#clockTask').val(),
        attendance_date: moment().format('YYYY-MM-DD'),  // ADD THIS LINE
        clock_in_time: new Date().toISOString(),         // ADD THIS LINE
        entry_type: 'normal'                             // ADD THIS LINE
    };
    
    const $btn = $('#btnConfirmClock');
    const originalText = $btn.html();
    $btn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
    
    try {
        // Check if volunteer is already clocked in
        const checkResponse = await TempleAPI.get('/volunteers/attendance', {
            volunteer_id: formData.volunteer_id,
            status: 'clocked_in',
            date: formData.attendance_date
        });
        
        let response;
        if (checkResponse.success && checkResponse.data.length > 0) {
            // Clock out
            const attendanceId = checkResponse.data[0].id;
            response = await TempleAPI.put(`/volunteers/attendance/${attendanceId}`, {
                clock_out_time: new Date().toISOString()
            });
        } else {
            // Clock in
            response = await TempleAPI.post('/volunteers/attendance', formData);
        }
        
        if (response.success) {
            TempleCore.showToast('Attendance recorded successfully!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('clockModal'));
            if (modal) modal.hide();
            
            this.loadAttendance();
            this.loadStatistics();  // Refresh statistics
        } else {
            throw new Error(response.message || 'Failed to record attendance');
        }
    } catch (error) {
        console.error('❌ Clock error:', error);
        
        let errorMessage = 'Failed to record attendance';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        TempleCore.showToast(errorMessage, 'error');
    } finally {
        $btn.prop('disabled', false).html(originalText);
    }
},
      saveManualEntry: async function() {
    console.log('💾 Saving manual entry');
    
    const form = $('#manualEntryForm')[0];
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const date = $('#manualDate').val();
    const clockIn = $('#manualClockIn').val();
    const clockOut = $('#manualClockOut').val();
    
    // IMPORTANT: Properly format dates for backend
    const formData = {
        volunteer_id: $('#manualVolunteer').val(),
        department_id: $('#manualDepartment').val(),
        task_id: $('#manualTask').val(),
        attendance_date: date,                                    // Required
        clock_in_time: `${date}T${clockIn}:00.000Z`,            // ISO format
        clock_out_time: `${date}T${clockOut}:00.000Z`,          // ISO format
        entry_type: 'manual',
        manual_entry_reason: $('#manualReason').val()
    };
    
    console.log('📤 Sending manual entry data:', formData);
    
    const $btn = $('#btnSaveManual');
    const originalText = $btn.html();
    $btn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Saving...');
    
    try {
        const response = await TempleAPI.post('/volunteers/attendance', formData);
        
        if (response.success) {
            TempleCore.showToast('Manual entry saved successfully!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('manualEntryModal'));
            if (modal) modal.hide();
            
            this.loadAttendance();
            this.loadStatistics();
        } else {
            throw new Error(response.message || 'Failed to save manual entry');
        }
    } catch (error) {
        console.error('❌ Save error:', error);
        
        let errorMessage = 'Failed to save manual entry';
        if (error.responseJSON) {
            if (error.responseJSON.message) {
                errorMessage = error.responseJSON.message;
            }
            if (error.responseJSON.errors) {
                const errorList = Object.values(error.responseJSON.errors).flat();
                if (errorList.length > 0) {
                    errorMessage = errorList.join('<br>');
                }
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        TempleCore.showToast(errorMessage, 'error');
    } finally {
        $btn.prop('disabled', false).html(originalText);
    }
},
        
        viewDetails: async function(id) {
            console.log('👁️ Viewing details for:', id);
            
            try {
                const response = await TempleAPI.get(`/volunteers/attendance/${id}`);
                
                if (response.success) {
                    const record = response.data;
                    
                    let html = `
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Volunteer Information</h6>
                                <p><strong>Name:</strong> ${record.volunteer?.full_name || 'N/A'}</p>
                                <p><strong>Volunteer ID:</strong> ${record.volunteer?.volunteer_id || 'N/A'}</p>
                                <p><strong>IC Number:</strong> ${record.volunteer?.ic_number || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Attendance Details</h6>
                                <p><strong>Date:</strong> ${record.attendance_date ? (typeof moment !== 'undefined' ? moment(record.attendance_date).format('DD/MM/YYYY') : record.attendance_date) : 'N/A'}</p>
                                <p><strong>Department:</strong> ${record.department?.department_name || 'N/A'}</p>
                                <p><strong>Task:</strong> ${record.task?.task_name || 'N/A'}</p>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Clock In:</strong> ${record.clock_in_time ? (typeof moment !== 'undefined' ? moment(record.clock_in_time).format('DD/MM/YYYY HH:mm') : record.clock_in_time) : 'N/A'}</p>
                                <p><strong>Clock Out:</strong> ${record.clock_out_time ? (typeof moment !== 'undefined' ? moment(record.clock_out_time).format('DD/MM/YYYY HH:mm') : record.clock_out_time) : '<span class="badge bg-warning">In Progress</span>'}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Total Hours:</strong> ${record.total_hours ? parseFloat(record.total_hours).toFixed(1) : '-'}</p>
                                <p><strong>Entry Type:</strong> ${record.entry_type === 'manual' ? '<span class="badge bg-warning text-dark">Manual Entry</span>' : '<span class="badge bg-success">Normal</span>'}</p>
                            </div>
                        </div>
                    `;
                    
                    if (record.entry_type === 'manual' && record.manual_entry_reason) {
                        html += `
                            <div class="alert alert-warning mt-3">
                                <strong><i class="bi bi-info-circle me-2"></i>Manual Entry Reason:</strong>
                                <p class="mb-0 mt-2">${record.manual_entry_reason}</p>
                            </div>
                        `;
                    }
                    
                    $('#attendanceDetailsBody').html(html);
                    
                    const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
                    modal.show();
                } else {
                    throw new Error(response.message || 'Failed to load details');
                }
            } catch (error) {
                console.error('❌ Failed to load details:', error);
                TempleCore.showToast('Failed to load attendance details', 'error');
            }
        },
        
        exportAttendance: function() {
            console.log('📥 Exporting attendance');
            
            // TODO: Implement export functionality
            TempleCore.showToast('Export functionality coming soon!', 'info');
        }
    };
    
    console.log('✅ VolunteersAttendancePage module loaded');
    
})(jQuery, window);