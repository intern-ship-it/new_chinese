// js/pages/volunteers/assignments.js
// Volunteer Task Assignments Management Page
// Admin-Only: Assign Tasks to ACTIVE Volunteers

(function($, window) {
    'use strict';
       // ========================================
    // VOLUNTEERS SHARED MODULE
    // Manages CSS and cleanup across all volunteer pages
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

    window.VolunteersAssignmentsPage = {
        pageId: 'volunteers-assignments',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        dataTable: null,
        currentAssignment: null,
        volunteers: [],
        departments: [],
        tasks: [],
        intervals: [],
        timeouts: [],
        
        init: function(params) {
            console.log('🚀 Initializing Volunteer Task Assignments Page');
            
            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);
            
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadAssignments();
            
            console.log('✅ Task Assignments Page Initialized');
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
            console.log('📝 Rendering Task Assignments Page HTML');
            
            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header with Animation -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-calendar-check-fill volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Task Assignments</h1>
                                            <p class="volunteers-subtitle">义工任务分配 • Assign Tasks to Active Volunteers</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="btnCreateAssignment">
                                        <i class="bi bi-plus-circle me-2"></i>
                                        Assign Task
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Card -->
                    <div class="card shadow-sm volunteers-content-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-4">
                            <!-- Filters Section -->
                            <div class="filters-section mb-4" data-aos="fade-up" data-aos-delay="300">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-search me-2 text-primary"></i>Search
                                        </label>
                                        <input type="text" class="form-control" id="searchInput" 
                                               placeholder="Search by volunteer name...">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-building me-2 text-primary"></i>Department
                                        </label>
                                        <select class="form-select" id="departmentFilter">
                                            <option value="">All Departments</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-calendar-date me-2 text-primary"></i>From Date
                                        </label>
                                        <input type="date" class="form-control" id="fromDateFilter">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-calendar-date me-2 text-primary"></i>To Date
                                        </label>
                                        <input type="date" class="form-control" id="toDateFilter">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label d-block">&nbsp;</label>
                                        <button class="btn btn-primary" id="btnApplyFilters">
                                            <i class="bi bi-funnel me-2"></i>Apply
                                        </button>
                                        <button class="btn btn-outline-secondary" id="btnResetFilters">
                                            <i class="bi bi-arrow-counterclockwise"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Assignments Table -->
                            <div class="table-container" data-aos="fade-up" data-aos-delay="400">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle" id="assignmentsTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th>
                                                    <i class="bi bi-person me-2"></i>Volunteer
                                                </th>
                                                <th>
                                                    <i class="bi bi-calendar-event me-2"></i>Assignment Date
                                                </th>
                                                <th>
                                                    <i class="bi bi-building me-2"></i>Department
                                                </th>
                                                <th>
                                                    <i class="bi bi-list-task me-2"></i>Task
                                                </th>
                                                <th>
                                                    <i class="bi bi-clock me-2"></i>Time Slot
                                                </th>
                                                <th class="text-center">
                                                    <i class="bi bi-toggle-on me-2"></i>Status
                                                </th>
                                                <th>
                                                    <i class="bi bi-person-badge me-2"></i>Assigned By
                                                </th>
                                                <th class="text-center" width="150">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="8" class="text-center py-5">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2 text-muted">Loading assignments...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create/Edit Assignment Modal -->
                <div class="modal fade" id="assignmentModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-calendar-check me-2"></i>
                                    <span id="modalTitle">Assign Task</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="assignmentForm" novalidate>
                                    <input type="hidden" id="assignmentId">
                                    
                                    <div class="row g-4">
                                        <!-- Section Header -->
                                        <div class="col-12">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-person-check"></i>
                                                <span>Volunteer Selection 义工选择</span>
                                            </div>
                                        </div>

                                        <!-- Volunteer Selection -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Select Volunteer <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="volunteerId" required>
                                                <option value="">Select Active Volunteer</option>
                                                <!-- Will be populated dynamically -->
                                            </select>
                                            <div class="invalid-feedback">Please select a volunteer</div>
                                            <small class="text-muted">Only ACTIVE volunteers can be assigned tasks</small>
                                        </div>

                                        <!-- Section Header -->
                                        <div class="col-12 mt-4">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-calendar-range"></i>
                                                <span>Task Details 任务详情</span>
                                            </div>
                                        </div>

                                        <!-- Assignment Date -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-calendar-date me-2 text-primary"></i>
                                                Assignment Date <span class="text-danger">*</span>
                                            </label>
                                            <input type="date" class="form-control" id="assignmentDate" required>
                                            <div class="invalid-feedback">Please select assignment date</div>
                                        </div>

                                        <!-- Time Slot -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-clock me-2 text-primary"></i>
                                                Time Slot
                                            </label>
                                            <select class="form-select" id="timeSlot">
                                                <option value="">Select Time Slot (Optional)</option>
                                                <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                                                <option value="afternoon">Afternoon (12:00 PM - 5:00 PM)</option>
                                                <option value="evening">Evening (5:00 PM - 9:00 PM)</option>
                                                <option value="full_day">Full Day (8:00 AM - 5:00 PM)</option>
                                                <option value="custom">Custom Time</option>
                                            </select>
                                        </div>

                                        <!-- Custom Time Range (shown when 'custom' selected) -->
                                        <div class="col-md-6 d-none" id="customTimeSection">
                                            <label class="form-label">Start Time</label>
                                            <input type="time" class="form-control" id="startTime">
                                        </div>
                                        <div class="col-md-6 d-none" id="customTimeSection2">
                                            <label class="form-label">End Time</label>
                                            <input type="time" class="form-control" id="endTime">
                                        </div>

                                        <!-- Department -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-building me-2 text-primary"></i>
                                                Department <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="departmentId" required>
                                                <option value="">Select Department</option>
                                                <!-- Will be populated dynamically -->
                                            </select>
                                            <div class="invalid-feedback">Please select department</div>
                                        </div>

                                        <!-- Task (filtered by department) -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-list-task me-2 text-primary"></i>
                                                Task <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="taskId" required disabled>
                                                <option value="">Select Task</option>
                                            </select>
                                            <div class="invalid-feedback">Please select task</div>
                                            <small class="text-muted">Tasks filtered by selected department</small>
                                        </div>

                                        <!-- Notes -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                <i class="bi bi-chat-left-text me-2 text-primary"></i>
                                                Notes / Instructions
                                            </label>
                                            <textarea class="form-control" id="notes" rows="3"
                                                      placeholder="Any special instructions or notes for this assignment..."></textarea>
                                        </div>

                                        <!-- Alert Box -->
                                        <div class="col-12">
                                            <div class="alert alert-info mb-0" role="alert">
                                                <i class="bi bi-info-circle me-2"></i>
                                                <strong>Important:</strong>
                                                <ul class="mb-0 mt-2">
                                                    <li>Only <strong>ACTIVE</strong> volunteers can be assigned tasks</li>
                                                    <li>Volunteers can have multiple assignments on different dates/times</li>
                                                    <li>Assignment status starts as <strong>Assigned</strong></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="btnSaveAssignment">
                                    <i class="bi bi-check-circle me-2"></i>Save Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Update Status Modal -->
                <div class="modal fade" id="statusModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">
                                    <i class="bi bi-arrow-repeat me-2"></i>
                                    Update Assignment Status
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="statusForm">
                                    <input type="hidden" id="statusAssignmentId">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">New Status</label>
                                        <select class="form-select" id="newStatus" required>
                                            <option value="">Select Status</option>
                                            <option value="completed">✅ Completed - Task finished</option>
                                            <option value="cancelled">❌ Cancelled - Assignment cancelled</option>
                                            <option value="no_show">⚠️ No Show - Volunteer didn't attend</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Reason / Notes</label>
                                        <textarea class="form-control" id="statusReason" rows="3"
                                                  placeholder="Optional: Provide reason for status change..."></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-warning" id="btnConfirmStatus">
                                    <i class="bi bi-check-circle me-2"></i>Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Delete Confirmation Modal -->
                <div class="modal fade" id="deleteModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    Confirm Delete
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="bi bi-trash text-danger" style="font-size: 3rem;"></i>
                                </div>
                                <p class="text-center">Are you sure you want to delete this assignment?</p>
                                <div class="alert alert-warning mb-0">
                                    <strong><i class="bi bi-exclamation-triangle me-2"></i>Warning:</strong>
                                    This action cannot be undone. The assignment will be permanently deleted.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-danger" id="btnConfirmDelete">
                                    <i class="bi bi-trash me-2"></i>Delete Assignment
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
            
            // Initialize AOS if available
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }

            // Animate header icon
            if (typeof gsap !== 'undefined') {
                gsap.to('.volunteers-header-icon', {
                    y: -10,
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut'
                });

                // Table row entrance animation
                const animateTableRows = () => {
                    gsap.from('#assignmentsTable tbody tr', {
                        // opacity: 0,
                        y: 20,
                        duration: 0.4,
                        stagger: 0.05,
                        ease: 'power2.out'
                    });
                };

                // Store for later use
                this.animateTableRows = animateTableRows;
            }
            
            console.log('✅ Animations initialized');
        },
        
        bindEvents: function() {
            const self = this;
            console.log('🔗 Binding events');
            
            // Create Assignment Button
            $(document).on('click.' + this.eventNamespace, '#btnCreateAssignment', function(e) {
                e.preventDefault();
                console.log('➕ Create button clicked');
                self.showAssignmentModal();
            });
            
            // Save Assignment Button
            $(document).on('click.' + this.eventNamespace, '#btnSaveAssignment', function(e) {
                e.preventDefault();
                console.log('💾 Save button clicked');
                self.saveAssignment();
            });
            
            // Edit Assignment Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-edit', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('✏️ Edit clicked for ID:', id);
                self.editAssignment(id);
            });
            
            // Update Status Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-status', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('🔄 Update status clicked for ID:', id);
                self.showStatusModal(id);
            });
            
            // Confirm Status Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmStatus', function(e) {
                e.preventDefault();
                console.log('✅ Confirm status clicked');
                self.updateStatus();
            });
            
            // Delete Assignment Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('🗑️ Delete clicked for ID:', id);
                self.deleteAssignment(id);
            });
            
            // Confirm Delete Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmDelete', function(e) {
                e.preventDefault();
                console.log('⚠️ Confirm delete clicked');
                self.confirmDelete();
            });
            
            // Apply Filters
            $(document).on('click.' + this.eventNamespace, '#btnApplyFilters', function(e) {
                e.preventDefault();
                console.log('🔍 Apply filters clicked');
                self.loadAssignments();
            });
            
            // Reset Filters
            $(document).on('click.' + this.eventNamespace, '#btnResetFilters', function(e) {
                e.preventDefault();
                console.log('🔄 Reset filters clicked');
                $('#searchInput').val('');
                $('#departmentFilter').val('');
                $('#fromDateFilter').val('');
                $('#toDateFilter').val('');
                self.loadAssignments();
            });
            
            // Search on Enter
            $(document).on('keypress.' + this.eventNamespace, '#searchInput', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    console.log('🔍 Search on enter');
                    self.loadAssignments();
                }
            });

            // Department change - filter tasks
            $(document).on('change.' + this.eventNamespace, '#departmentId', function() {
                const departmentId = $(this).val();
                console.log('🏢 Department changed:', departmentId);
                self.loadTasksByDepartment(departmentId);
            });

            // Time slot change - show/hide custom time
            $(document).on('change.' + this.eventNamespace, '#timeSlot', function() {
                const timeSlot = $(this).val();
                if (timeSlot === 'custom') {
                    $('#customTimeSection, #customTimeSection2').removeClass('d-none');
                } else {
                    $('#customTimeSection, #customTimeSection2').addClass('d-none');
                    $('#startTime, #endTime').val('');
                }
            });
            
            // Input field focus animations
            if (typeof gsap !== 'undefined') {
                $(document).on('focus.' + this.eventNamespace, '.form-control, .form-select', function() {
                    gsap.to($(this), {
                        scale: 1.02,
                        duration: 0.2,
                        ease: 'power1.out'
                    });
                }).on('blur.' + this.eventNamespace, '.form-control, .form-select', function() {
                    gsap.to($(this), {
                        scale: 1,
                        duration: 0.2
                    });
                });
            }
            
            console.log('✅ Events bound successfully');
        },
        
        loadAssignments: async function() {
            console.log('📡 Loading assignments from API');
            
            const filters = {
                search: $('#searchInput').val(),
                department_id: $('#departmentFilter').val(),
                from_date: $('#fromDateFilter').val(),
                to_date: $('#toDateFilter').val()
            };
            
            console.log('🔍 Filters:', filters);
            
            try {
                const response = await TempleAPI.get('/volunteers/assignments', filters);
                
                console.log('📦 Raw response:', response);
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} assignments`);
                    this.renderTable(response.data || []);
                } else {
                    throw new Error(response.message || 'Failed to load assignments');
                }
            } catch (error) {
                console.error('❌ Error loading assignments:', error);
                
                let errorMessage = 'Failed to load assignments';
                
                if (error.responseJSON) {
                    errorMessage = error.responseJSON.message || error.responseJSON.error || errorMessage;
                    if (error.responseJSON.details) {
                        console.error('Error details:', error.responseJSON.details);
                    }
                } else if (error.response && error.response.data) {
                    errorMessage = error.response.data.message || error.response.data.error || errorMessage;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                this.renderTable([]);
            }
        },
        
        renderTable: function(assignments) {
            const self = this;
            console.log('📊 Rendering table with', assignments.length, 'assignments');
            
            // Destroy existing DataTable
            if (this.dataTable) {
                console.log('Destroying existing DataTable');
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            const tableBody = $('#assignmentsTable tbody');
            tableBody.empty();
            
            // Handle empty state
            if (assignments.length === 0) {
                console.log('No assignments found - showing empty state');
                tableBody.html(`
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <div class="empty-state">
                                <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                                <h5 class="text-muted">No Assignments Found</h5>
                                <p class="text-muted mb-3">Start by creating your first task assignment</p>
                                <button class="btn btn-primary" id="btnCreateAssignment">
                                    <i class="bi bi-plus-circle me-2"></i>Create First Assignment
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }
            
            // Initialize DataTable FIRST (before adding rows)
            try {
                this.dataTable = $('#assignmentsTable').DataTable({
                    data: assignments,
                    order: [[1, 'desc']], // Order by assignment date desc
                    pageLength: 25,
                    responsive: true,
                    columns: [
                        {
                            // Volunteer
                            data: null,
                            render: function(data, type, row) {
                                return `<div class="d-flex align-items-center">
                                            <i class="bi bi-person-circle me-2 text-primary"></i>
                                            <div>
                                                <div class="fw-semibold">${row.volunteer.full_name}</div>
                                                <small class="text-muted">${row.volunteer.volunteer_id}</small>
                                            </div>
                                       </div>`;
                            }
                        },
                        {
                            // Assignment Date
                            data: 'assignment_date',
                            render: function(data, type, row) {
                                const formattedDate = TempleCore.formatDate ? TempleCore.formatDate(data) : data;
                                return `<span class="badge bg-info">${formattedDate}</span>`;
                            }
                        },
                        {
                            // Department
                            data: null,
                            render: function(data, type, row) {
                                return `<div>
                                            <div class="fw-semibold">${row.department.department_name}</div>
                                            <small class="text-muted">${row.department.department_code}</small>
                                        </div>`;
                            }
                        },
                        {
                            // Task
                            data: null,
                            render: function(data, type, row) {
                                return `<div>
                                            <div class="fw-semibold">${row.task.task_name}</div>
                                            <small class="text-muted">${row.task.task_code}</small>
                                        </div>`;
                            }
                        },
                        {
                            // Time Slot
                            data: null,
                            render: function(data, type, row) {
                                if (row.time_slot) {
                                    return `<span class="badge bg-secondary">${row.time_slot}</span>`;
                                } else if (row.start_time && row.end_time) {
                                    return `<small>${row.start_time} - ${row.end_time}</small>`;
                                } else {
                                    return '<span class="text-muted">-</span>';
                                }
                            }
                        },
                        {
                            // Status
                            data: 'status',
                            className: 'text-center',
                            render: function(data, type, row) {
                                const statusConfig = {
                                    'assigned': { class: 'primary', icon: 'clock-history', text: 'Assigned' },
                                    'completed': { class: 'success', icon: 'check-circle', text: 'Completed' },
                                    'cancelled': { class: 'danger', icon: 'x-circle', text: 'Cancelled' },
                                    'no_show': { class: 'warning', icon: 'exclamation-triangle', text: 'No Show' }
                                };
                                const config = statusConfig[data] || statusConfig['assigned'];
                                return `<span class="badge bg-${config.class}">
                                            <i class="bi bi-${config.icon} me-1"></i>${config.text}
                                        </span>`;
                            }
                        },
                        {
                            // Assigned By
                            data: null,
                            render: function(data, type, row) {
                                if (row.assigned_by_user) {
                                    return `<small class="text-muted">
                                                <i class="bi bi-person me-1"></i>${row.assigned_by_user.name}
                                            </small>`;
                                } else {
                                    return '<span class="text-muted">-</span>';
                                }
                            }
                        },
                        {
                            // Actions
                            data: null,
                            className: 'text-center',
                            orderable: false,
                            render: function(data, type, row) {
                                const canEdit = row.status === 'assigned';
                                const canUpdateStatus = row.status === 'assigned';
                                
                                let buttons = '<div class="btn-group btn-group-sm" role="group">';
                                
                                if (canEdit) {
                                    buttons += `<button class="btn btn-outline-primary btn-edit" 
                                                        data-id="${row.id}" 
                                                        title="Edit Assignment">
                                                    <i class="bi bi-pencil"></i>
                                                </button>`;
                                }
                                
                                if (canUpdateStatus) {
                                    buttons += `<button class="btn btn-outline-warning btn-status" 
                                                        data-id="${row.id}" 
                                                        title="Update Status">
                                                    <i class="bi bi-arrow-repeat"></i>
                                                </button>`;
                                }
                                
                                buttons += `<button class="btn btn-outline-danger btn-delete" 
                                                    data-id="${row.id}" 
                                                    title="Delete Assignment">
                                                <i class="bi bi-trash"></i>
                                            </button>`;
                                
                                buttons += '</div>';
                                return buttons;
                            }
                        }
                    ],
                    language: {
                        search: "_INPUT_",
                        searchPlaceholder: "Search in table...",
                        lengthMenu: "Show _MENU_ entries",
                        info: "Showing _START_ to _END_ of _TOTAL_ assignments",
                        paginate: {
                            first: '<i class="bi bi-chevron-double-left"></i>',
                            previous: '<i class="bi bi-chevron-left"></i>',
                            next: '<i class="bi bi-chevron-right"></i>',
                            last: '<i class="bi bi-chevron-double-right"></i>'
                        }
                    },
                    dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                         '<"row"<"col-sm-12"tr>>' +
                         '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>'
                });
                
                console.log('✅ DataTable initialized with', assignments.length, 'rows');
                
                // Trigger entrance animation
                if (this.animateTableRows && typeof gsap !== 'undefined') {
                    setTimeout(() => {
                        this.animateTableRows();
                    }, 100);
                }
            } catch (error) {
                console.error('❌ DataTable initialization error:', error);
                console.error('Error details:', error.message, error.stack);
            }
        },
   showAssignmentModal: async function(assignmentData = null) {
    const self = this;
    console.log('📝 Showing assignment modal', assignmentData ? 'EDIT' : 'CREATE');
    
    // Reset form
    $('#assignmentForm')[0].reset();
    $('#assignmentForm').removeClass('was-validated');
    $('#assignmentId').val('');
    $('#customTimeSection, #customTimeSection2').addClass('d-none');
    $('#taskId').prop('disabled', true).html('<option value="">Select Task</option>');
    
    // ⚠️ CRITICAL FIX: Load dropdowns FIRST, THEN populate values
    try {
        // Load all dropdowns in parallel
        await Promise.all([
            this.loadActiveVolunteers(),
            this.loadActiveDepartments(),
            this.loadDepartmentFilterOptions()
        ]);
        
        console.log('✅ Dropdowns loaded');
        
        // NOW populate the form with data
        if (assignmentData) {
            // Edit mode
            console.log('📝 Populating edit data:', assignmentData);
            
            $('#modalTitle').text('Edit Assignment');
            $('#assignmentId').val(assignmentData.id);
            
            // Set volunteer
            if (assignmentData.volunteer_id) {
                $('#volunteerId').val(assignmentData.volunteer_id);
                console.log('Set volunteer:', assignmentData.volunteer_id);
            }
            
            // Set assignment date
            if (assignmentData.assignment_date) {
                $('#assignmentDate').val(assignmentData.assignment_date);
                console.log('Set date:', assignmentData.assignment_date);
            }
            
            // Set time slot
            if (assignmentData.time_slot) {
                $('#timeSlot').val(assignmentData.time_slot);
                console.log('Set time slot:', assignmentData.time_slot);
            }
            
            // Set department
            if (assignmentData.department_id) {
                $('#departmentId').val(assignmentData.department_id);
                console.log('Set department:', assignmentData.department_id);
                
                // Load tasks for this department, THEN set the task
                await this.loadTasksByDepartment(assignmentData.department_id);
                
                if (assignmentData.task_id) {
                    $('#taskId').val(assignmentData.task_id);
                    console.log('Set task:', assignmentData.task_id);
                }
            }
            
            // Handle custom time
            if (assignmentData.start_time && assignmentData.end_time) {
                $('#timeSlot').val('custom');
                $('#customTimeSection, #customTimeSection2').removeClass('d-none');
                $('#startTime').val(assignmentData.start_time);
                $('#endTime').val(assignmentData.end_time);
                console.log('Set custom time:', assignmentData.start_time, '-', assignmentData.end_time);
            }
            
            // Set notes
            if (assignmentData.notes) {
                $('#notes').val(assignmentData.notes);
                console.log('Set notes:', assignmentData.notes);
            }
            
            // Verify all values are set
            console.log('🔍 Verification:');
            console.log('  Volunteer:', $('#volunteerId').val());
            console.log('  Date:', $('#assignmentDate').val());
            console.log('  Department:', $('#departmentId').val());
            console.log('  Task:', $('#taskId').val());
            console.log('  Time Slot:', $('#timeSlot').val());
            console.log('  Notes:', $('#notes').val());
            
        } else {
            // Create mode
            $('#modalTitle').text('Assign Task');
            // Set default date to today
            $('#assignmentDate').val(new Date().toISOString().split('T')[0]);
        }
        
    } catch (error) {
        console.error('❌ Error loading dropdowns:', error);
        TempleCore.showToast('Failed to load form data', 'error');
        return;
    }
    
    // Show modal with animation
    try {
        const modalElement = document.getElementById('assignmentModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            
            // Animate modal content
            if (typeof gsap !== 'undefined') {
                gsap.from('#assignmentForm', {
                    opacity: 0,
                    y: 20,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
            
            console.log('✅ Modal shown');
        } else {
            console.error('❌ Modal element not found');
        }
    } catch (error) {
        console.error('❌ Error showing modal:', error);
    }
},
        
     loadActiveVolunteers: async function() {
    console.log('📡 Loading active volunteers');
    
    try {
        const response = await TempleAPI.get('/volunteers/registration/active');
        
        if (response.success) {
            console.log(`✅ Loaded ${response.data.length} active volunteers`);
            this.volunteers = response.data;
            
            const select = $('#volunteerId');
            select.find('option:not(:first)').remove();
            
            this.volunteers.forEach(function(volunteer) {
                select.append(`<option value="${volunteer.id}">
                                ${volunteer.full_name} (${volunteer.volunteer_id})
                              </option>`);
            });
            
            return Promise.resolve(); // ✅ Return promise
        }
    } catch (error) {
        console.error('❌ Failed to load volunteers:', error);
        TempleCore.showToast('Failed to load active volunteers', 'error');
        return Promise.reject(error);
    }
},

        
      loadActiveDepartments: async function() {
    console.log('📡 Loading active departments');
    
    try {
        const response = await TempleAPI.get('/volunteers/departments/active');
        
        if (response.success) {
            console.log(`✅ Loaded ${response.data.length} active departments`);
            this.departments = response.data;
            
            const select = $('#departmentId');
            select.find('option:not(:first)').remove();
            
            this.departments.forEach(function(dept) {
                select.append(`<option value="${dept.id}">
                                ${dept.department_name} (${dept.department_code})
                              </option>`);
            });
            
            return Promise.resolve(); // ✅ Return promise
        }
    } catch (error) {
        console.error('❌ Failed to load departments:', error);
        TempleCore.showToast('Failed to load departments', 'error');
        return Promise.reject(error);
    }
},
        
        loadDepartmentFilterOptions: async function() {
            console.log('📡 Loading departments for filter');
            
            try {
                const response = await TempleAPI.get('/volunteers/departments/active');
                
                if (response.success) {
                    const select = $('#departmentFilter');
                    select.find('option:not(:first)').remove();
                    
                    response.data.forEach(function(dept) {
                        select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                    });
                }
            } catch (error) {
                console.error('❌ Failed to load department filter options:', error);
            }
        },
        
    loadTasksByDepartment: async function(departmentId) {
    console.log('📡 Loading tasks for department:', departmentId);
    
    const taskSelect = $('#taskId');
    taskSelect.html('<option value="">Loading tasks...</option>').prop('disabled', true);
    
    if (!departmentId) {
        taskSelect.html('<option value="">Select Department First</option>');
        return Promise.resolve();
    }
    
    try {
        const response = await TempleAPI.get(`/volunteers/tasks/by-department/${departmentId}`);
        
        if (response.success) {
            console.log(`✅ Loaded ${response.data.length} tasks`);
            this.tasks = response.data;
            
            taskSelect.html('<option value="">Select Task</option>').prop('disabled', false);
            
            this.tasks.forEach(function(task) {
                taskSelect.append(`<option value="${task.id}">
                                    ${task.task_name} (${task.task_code})
                                  </option>`);
            });
            
            return Promise.resolve(); // ✅ Return promise
        }
    } catch (error) {
        console.error('❌ Failed to load tasks:', error);
        taskSelect.html('<option value="">Error loading tasks</option>');
        TempleCore.showToast('Failed to load tasks for this department', 'error');
        return Promise.reject(error);
    }
},
        saveAssignment: async function() {
            console.log('💾 Saving assignment');
            
            // Validate form
            const form = $('#assignmentForm')[0];
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                console.log('❌ Form validation failed');
                
                // Focus first invalid field
                const firstInvalid = $(form).find(':invalid').first();
                if (firstInvalid.length) {
                    firstInvalid.focus();
                }
                return;
            }
            
            const assignmentId = $('#assignmentId').val();
            const timeSlot = $('#timeSlot').val();
            
            const formData = {
                volunteer_id: $('#volunteerId').val(),
                assignment_date: $('#assignmentDate').val(),
                department_id: $('#departmentId').val(),
                task_id: $('#taskId').val(),
                time_slot: timeSlot !== 'custom' ? timeSlot : null,
                start_time: timeSlot === 'custom' ? $('#startTime').val() : null,
                end_time: timeSlot === 'custom' ? $('#endTime').val() : null,
                notes: $('#notes').val().trim() || null
            };
            
            console.log('📝 Form data:', formData);
            
            // Show loading state
            const $saveBtn = $('#btnSaveAssignment');
            const originalText = $saveBtn.html();
            $saveBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Saving...');
            
            try {
                let response;
                
                if (assignmentId) {
                    // Update existing assignment
                    response = await TempleAPI.put(`/volunteers/assignments/${assignmentId}`, formData);
                } else {
                    // Create new assignment
                    response = await TempleAPI.post('/volunteers/assignments', formData);
                }
                
                if (response.success) {
                    console.log('✅ Save success:', response);
                    
                    // Success animation
                    if (typeof gsap !== 'undefined') {
                        gsap.to('#assignmentForm', {
                            scale: 1.02,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });
                    }
                    
                    TempleCore.showToast(
                        assignmentId ? 'Assignment updated successfully!' : 'Task assigned successfully!',
                        'success'
                    );
                    
                    // Hide modal
                    const modalElement = document.getElementById('assignmentModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                    
                    // Reload assignments
                    this.loadAssignments();
                } else {
                    throw new Error(response.message || 'Failed to save assignment');
                }
            } catch (error) {
                console.error('❌ Save error:', error);
                
                let errorMessage = 'Failed to save assignment';
                
                if (error.responseJSON) {
                    console.log('📋 Error response JSON:', error.responseJSON);
                    
                    if (error.responseJSON.message) {
                        errorMessage = error.responseJSON.message;
                    }
                    
                    if (error.responseJSON.errors) {
                        const errors = error.responseJSON.errors;
                        const errorList = Object.values(errors).flat();
                        if (errorList.length > 0) {
                            errorMessage = errorList.join('<br>');
                        }
                        console.log('📋 Validation errors:', errorList);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error.responseText) {
                    try {
                        const parsedError = JSON.parse(error.responseText);
                        if (parsedError.message) {
                            errorMessage = parsedError.message;
                        }
                        if (parsedError.errors) {
                            const errorList = Object.values(parsedError.errors).flat();
                            if (errorList.length > 0) {
                                errorMessage = errorList.join('<br>');
                            }
                        }
                    } catch (parseError) {
                        console.error('Failed to parse error response:', parseError);
                    }
                }
                
                console.error('🔍 Extracted error message:', errorMessage);
                TempleCore.showToast(errorMessage, 'error');
            } finally {
                $saveBtn.prop('disabled', false).html(originalText);
            }
        },
        
        editAssignment: async function(id) {
            console.log('✏️ Editing assignment:', id);
            
            try {
                const response = await TempleAPI.get(`/volunteers/assignments/${id}`);
                
                if (response.success) {
                    console.log('✅ Assignment data loaded:', response.data);
                    this.showAssignmentModal(response.data);
                } else {
                    throw new Error(response.message || 'Failed to load assignment');
                }
            } catch (error) {
                console.error('❌ Failed to load assignment:', error);
                TempleCore.showToast('Failed to load assignment details', 'error');
            }
        },
        
        showStatusModal: function(id) {
            console.log('🔄 Show status modal for:', id);
            this.currentAssignment = id;
            $('#statusAssignmentId').val(id);
            $('#statusForm')[0].reset();
            
            const modal = new bootstrap.Modal(document.getElementById('statusModal'));
            modal.show();
        },
        
        updateStatus: async function() {
            console.log('🔄 Updating status');
            
            const assignmentId = $('#statusAssignmentId').val();
            const newStatus = $('#newStatus').val();
            const reason = $('#statusReason').val().trim();
            
            if (!newStatus) {
                TempleCore.showToast('Please select a status', 'error');
                return;
            }
            
            // Show loading state
            const $btn = $('#btnConfirmStatus');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Updating...');
            
            try {
                const response = await TempleAPI.patch(`/volunteers/assignments/${assignmentId}/status`, {
                    status: newStatus,
                    reason: reason || null
                });
                
                if (response.success) {
                    console.log('✅ Status updated:', response);
                    TempleCore.showToast('Status updated successfully!', 'success');
                    
                    // Hide modal
                    const modalElement = document.getElementById('statusModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                    
                    // Reload assignments
                    this.loadAssignments();
                } else {
                    throw new Error(response.message || 'Failed to update status');
                }
            } catch (error) {
                console.error('❌ Status update error:', error);
                
                let errorMessage = 'Failed to update status';
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
        
        deleteAssignment: function(id) {
            console.log('🗑️ Delete requested for:', id);
            this.currentAssignment = id;
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        },
        
        confirmDelete: async function() {
            const id = this.currentAssignment;
            console.log('⚠️ Confirming delete for:', id);
            
            // Show loading state
            const $deleteBtn = $('#btnConfirmDelete');
            const originalText = $deleteBtn.html();
            $deleteBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Deleting...');
            
            try {
                const response = await TempleAPI.delete(`/volunteers/assignments/${id}`);
                
                if (response.success) {
                    console.log('✅ Delete success:', response);
                    TempleCore.showToast('Assignment deleted successfully!', 'success');
                    
                    // Hide modal
                    const modalElement = document.getElementById('deleteModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                    
                    // Reload assignments
                    this.loadAssignments();
                } else {
                    throw new Error(response.message || 'Failed to delete assignment');
                }
            } catch (error) {
                console.error('❌ Delete error:', error);
                
                let errorMessage = 'Failed to delete assignment';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
            } finally {
                $deleteBtn.prop('disabled', false).html(originalText);
            }
        }
    };
    
    console.log('✅ VolunteersAssignmentsPage module loaded');
    
})(jQuery, window);