// js/pages/volunteers/tasks.js
// Volunteer Tasks Management Page - FIXED VERSION
// Master Setup - Dependent on Departments

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

    // ========================================
    // VOLUNTEERS TASKS PAGE
    // ========================================
    window.VolunteersTasksPage = {
        pageId: 'volunteers-tasks',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        dataTable: null,
        currentTask: null,
        departments: [],
        intervals: [],
        timeouts: [],
        
        init: function(params) {
            console.log('🚀 Initializing Volunteer Tasks Page');
            
            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);
            
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadDepartments(() => {
                this.loadTasks();
            });
            
            console.log('✅ Tasks Page Initialized');
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
            console.log('📝 Rendering Tasks Page HTML');
            
            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header with Animation -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-list-task volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Volunteer Tasks</h1>
                                            <p class="volunteers-subtitle">义工任务 • Task Master Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="btnCreateTask">
                                        <i class="bi bi-plus-circle me-2"></i>
                                        Create Task
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
                                               placeholder="Search by name or code...">
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
                                            <i class="bi bi-funnel me-2 text-primary"></i>Status
                                        </label>
                                        <select class="form-select" id="statusFilter">
                                            <option value="">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
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

                            <!-- Tasks Table -->
                            <div class="table-container" data-aos="fade-up" data-aos-delay="400">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle" id="tasksTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th>
                                                    <i class="bi bi-code-square me-2"></i>Code
                                                </th>
                                                <th>
                                                    <i class="bi bi-card-list me-2"></i>Task Name
                                                </th>
                                                <th>
                                                    <i class="bi bi-building me-2"></i>Department
                                                </th>
                                                <th>
                                                    <i class="bi bi-stars me-2"></i>Skills
                                                </th>
                                                <th>
                                                    <i class="bi bi-clock me-2"></i>Time Slot
                                                </th>
                                                <th class="text-center">
                                                    <i class="bi bi-toggle-on me-2"></i>Status
                                                </th>
                                                <th class="text-center" width="150">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="7" class="text-center py-5">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2 text-muted">Loading tasks...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create/Edit Task Modal -->
                <div class="modal fade" id="taskModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-list-task me-2"></i>
                                    <span id="modalTitle">Create Task</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="taskForm" novalidate>
                                    <input type="hidden" id="taskId">
                                    
                                    <div class="row g-4">
                                        <!-- Section Header -->
                                        <div class="col-12">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-info-circle"></i>
                                                <span>Basic Information 基本信息</span>
                                            </div>
                                        </div>

                                        <!-- Department -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Department <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="departmentId" required>
                                                <option value="">Select Department</option>
                                            </select>
                                            <div class="invalid-feedback">Please select a department</div>
                                        </div>

                                        <!-- Task Code -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Task Code <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control text-uppercase" id="taskCode" 
                                                   placeholder="E.g., SETUP, PREP" required maxlength="20">
                                            <div class="invalid-feedback">Please enter task code</div>
                                            <small class="text-muted">Unique within department</small>
                                        </div>

                                        <!-- Task Name -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Task Name <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="taskName" 
                                                   placeholder="Enter task name" required>
                                            <div class="invalid-feedback">Please enter task name</div>
                                        </div>

                                        <!-- Description -->
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" id="description" rows="3"
                                                      placeholder="Brief description of the task"></textarea>
                                        </div>

                                        <!-- Section Header -->
                                        <div class="col-12 mt-4">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-gear"></i>
                                                <span>Task Configuration 任务配置</span>
                                            </div>
                                        </div>

                                        <!-- Skills Required -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-stars me-2 text-primary"></i>
                                                Skills Required
                                            </label>
                                            <input type="text" class="form-control" id="skillsRequired" 
                                                   placeholder="E.g., Cooking, Organization">
                                            <small class="text-muted">Comma-separated list</small>
                                        </div>

                                        <!-- Time Slot -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-clock me-2 text-primary"></i>
                                                Time Slot
                                            </label>
                                            <select class="form-select" id="timeSlot">
                                                <option value="">Select Time Slot</option>
                                                <option value="Morning (6am-10am)">Morning (6am-10am)</option>
                                                <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
                                                <option value="Lunch (11am-2pm)">Lunch (11am-2pm)</option>
                                                <option value="Afternoon (2pm-6pm)">Afternoon (2pm-6pm)</option>
                                                <option value="Evening (6pm-10pm)">Evening (6pm-10pm)</option>
                                                <option value="Full Day">Full Day</option>
                                                <option value="Flexible">Flexible</option>
                                            </select>
                                        </div>

                                        <!-- Estimated Duration -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-hourglass me-2 text-primary"></i>
                                                Estimated Duration (minutes)
                                            </label>
                                            <input type="number" class="form-control" id="estimatedDuration" 
                                                   placeholder="0" min="0" step="30">
                                            <small class="text-muted">E.g., 180 = 3 hours</small>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-toggle-on me-2 text-primary"></i>
                                                Status <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="status" required>
                                                <option value="active">✅ Active - Available for Assignment</option>
                                                <option value="inactive">⛔ Inactive - Hidden</option>
                                            </select>
                                        </div>

                                        <!-- Alert Box -->
                                        <div class="col-12">
                                            <div class="alert alert-info mb-0" role="alert">
                                                <i class="bi bi-info-circle me-2"></i>
                                                <strong>Important:</strong> Only <strong>Active</strong> tasks will be available for volunteer assignments.
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="btnSaveTask">
                                    <i class="bi bi-check-circle me-2"></i>Save Task
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
                                <p class="text-center">Are you sure you want to delete this task?</p>
                                <div class="alert alert-warning mb-0">
                                    <strong><i class="bi bi-exclamation-triangle me-2"></i>Warning:</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>This action cannot be undone</li>
                                        <li>Tasks with assignments cannot be deleted</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-danger" id="btnConfirmDelete">
                                    <i class="bi bi-trash me-2"></i>Delete Task
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
                    gsap.from('#tasksTable tbody tr', {
                        opacity: 0,
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
            
            // Create Task Button
            $(document).on('click.' + this.eventNamespace, '#btnCreateTask', function(e) {
                e.preventDefault();
                console.log('➕ Create button clicked');
                self.showTaskModal();
            });
            
            // Save Task Button
            $(document).on('click.' + this.eventNamespace, '#btnSaveTask', function(e) {
                e.preventDefault();
                console.log('💾 Save button clicked');
                self.saveTask();
            });
            
            // Edit Task Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-edit', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('✏️ Edit clicked for ID:', id);
                self.editTask(id);
            });
            
            // Delete Task Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('🗑️ Delete clicked for ID:', id);
                self.deleteTask(id);
            });
            
            // Confirm Delete Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmDelete', function(e) {
                e.preventDefault();
                console.log('⚠️ Confirm delete clicked');
                self.confirmDelete();
            });
            
            // Toggle Status Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-toggle-status', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('🔄 Toggle status clicked for ID:', id);
                self.toggleStatus(id);
            });
            
            // Apply Filters
            $(document).on('click.' + this.eventNamespace, '#btnApplyFilters', function(e) {
                e.preventDefault();
                console.log('🔍 Apply filters clicked');
                self.loadTasks();
            });
            
            // Reset Filters
            $(document).on('click.' + this.eventNamespace, '#btnResetFilters', function(e) {
                e.preventDefault();
                console.log('🔄 Reset filters clicked');
                $('#searchInput').val('');
                $('#departmentFilter').val('');
                $('#statusFilter').val('');
                self.loadTasks();
            });
            
            // Search on Enter
            $(document).on('keypress.' + this.eventNamespace, '#searchInput', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    console.log('🔍 Search on enter');
                    self.loadTasks();
                }
            });

            // Task code auto-uppercase
            $(document).on('input.' + this.eventNamespace, '#taskCode', function() {
                $(this).val($(this).val().toUpperCase());
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
        
        loadDepartments: async function(callback) {
            console.log('📡 Loading departments');
            
            try {
                const response = await TempleAPI.get('/volunteers/departments/active');
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} departments`);
                    this.departments = response.data;
                    
                    // Populate filter dropdown
                    const filterSelect = $('#departmentFilter');
                    filterSelect.find('option:not(:first)').remove();
                    this.departments.forEach(function(dept) {
                        filterSelect.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                    });
                    
                    // Populate modal dropdown
                    const modalSelect = $('#departmentId');
                    modalSelect.find('option:not(:first)').remove();
                    this.departments.forEach(function(dept) {
                        modalSelect.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                    });
                    
                    if (callback) callback();
                } else {
                    throw new Error(response.message || 'Failed to load departments');
                }
            } catch (error) {
                console.error('❌ Failed to load departments:', error);
                TempleCore.showToast('Failed to load departments', 'error');
                if (callback) callback();
            }
        },
        
        loadTasks: async function() {
            console.log('📡 Loading tasks from API');
            
            const filters = {
                search: $('#searchInput').val(),
                status: $('#statusFilter').val(),
                department_id: $('#departmentFilter').val()
            };
            
            console.log('🔍 Filters:', filters);
            
            try {
                const response = await TempleAPI.get('/volunteers/tasks', filters);
                
                console.log('📦 Raw response:', response);
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} tasks`);
                    this.renderTable(response.data || []);
                } else {
                    throw new Error(response.message || 'Failed to load tasks');
                }
            } catch (error) {
                console.error('❌ Error loading tasks:', error);
                
                // Extract error message properly
                let errorMessage = 'Failed to load tasks';
                
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
        
        renderTable: function(tasks) {
            const self = this;
            console.log('📊 Rendering table with', tasks.length, 'tasks');
            
            // Destroy existing DataTable
            if (this.dataTable) {
                console.log('Destroying existing DataTable');
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            const tableBody = $('#tasksTable tbody');
            tableBody.empty();
            
            // Handle empty state
            if (tasks.length === 0) {
                console.log('No tasks found - showing empty state');
                tableBody.html(`
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <div class="empty-state">
                                <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                                <h5 class="text-muted">No Tasks Found</h5>
                                <p class="text-muted mb-3">Get started by creating your first task</p>
                                <button class="btn btn-primary" id="btnCreateTask">
                                    <i class="bi bi-plus-circle me-2"></i>Create First Task
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }
            
            // Initialize DataTable FIRST (before adding rows)
            try {
                this.dataTable = $('#tasksTable').DataTable({
                    data: tasks,
                    order: [[0, 'asc']],
                    pageLength: 25,
                    responsive: true,
                    columns: [
                        {
                            // Code
                            data: null,
                            render: function(data, type, row) {
                                const fullCode = row.department 
                                    ? `${row.department.department_code}-${row.task_code}`
                                    : row.task_code;
                                return `<span class="badge bg-primary">${fullCode}</span>`;
                            }
                        },
                        {
                            // Task Name
                            data: null,
                            render: function(data, type, row) {
                                let html = `<div class="fw-semibold">${row.task_name}</div>`;
                                if (row.description) {
                                    html += `<small class="text-muted">${row.description}</small>`;
                                }
                                return html;
                            }
                        },
                        {
                            // Department
                            data: null,
                            render: function(data, type, row) {
                                if (row.department) {
                                    return `<span class="badge bg-info">${row.department.department_code}</span> ${row.department.department_name}`;
                                }
                                return '<span class="text-muted">N/A</span>';
                            }
                        },
                        {
                            // Skills
                            data: 'skills_required',
                            render: function(data, type, row) {
                                return data 
                                    ? `<small class="text-muted">${data}</small>`
                                    : '<small class="text-muted">None specified</small>';
                            }
                        },
                        {
                            // Time Slot
                            data: 'time_slot',
                            render: function(data, type, row) {
                                return data 
                                    ? `<span class="badge bg-light text-dark">${data}</span>`
                                    : '<span class="text-muted">-</span>';
                            }
                        },
                        {
                            // Status
                            data: 'status',
                            className: 'text-center',
                            render: function(data, type, row) {
                                if (data === 'active') {
                                    return '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Active</span>';
                                } else {
                                    return '<span class="badge bg-secondary"><i class="bi bi-x-circle me-1"></i>Inactive</span>';
                                }
                            }
                        },
                        {
                            // Actions
                            data: null,
                            className: 'text-center',
                            orderable: false,
                            render: function(data, type, row) {
                                const toggleClass = row.status === 'active' ? 'warning' : 'success';
                                const toggleIcon = row.status === 'active' ? 'on' : 'off';
                                const toggleTitle = row.status === 'active' ? 'Deactivate' : 'Activate';
                                
                                return `<div class="btn-group btn-group-sm" role="group">
                                            <button class="btn btn-outline-primary btn-edit" 
                                                    data-id="${row.id}" 
                                                    title="Edit Task">
                                                <i class="bi bi-pencil"></i>
                                            </button>
                                            <button class="btn btn-outline-${toggleClass} btn-toggle-status" 
                                                    data-id="${row.id}" 
                                                    title="${toggleTitle}">
                                                <i class="bi bi-toggle-${toggleIcon}"></i>
                                            </button>
                                            <button class="btn btn-outline-danger btn-delete" 
                                                    data-id="${row.id}" 
                                                    title="Delete Task">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </div>`;
                            }
                        }
                    ],
                    language: {
                        search: "_INPUT_",
                        searchPlaceholder: "Search in table...",
                        lengthMenu: "Show _MENU_ entries",
                        info: "Showing _START_ to _END_ of _TOTAL_ tasks",
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
                
                console.log('✅ DataTable initialized with', tasks.length, 'rows');
                
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
        
        showTaskModal: function(taskData = null) {
            const self = this;
            console.log('📝 Showing task modal', taskData ? 'EDIT' : 'CREATE');
            
            // Reset form
            $('#taskForm')[0].reset();
            $('#taskForm').removeClass('was-validated');
            $('#taskId').val('');
            
            if (taskData) {
                // Edit mode
                $('#modalTitle').text('Edit Task');
                $('#taskId').val(taskData.id);
                $('#departmentId').val(taskData.department_id);
                $('#taskCode').val(taskData.task_code);
                $('#taskName').val(taskData.task_name);
                $('#description').val(taskData.description);
                $('#skillsRequired').val(taskData.skills_required);
                $('#timeSlot').val(taskData.time_slot);
                $('#estimatedDuration').val(taskData.estimated_duration);
                $('#status').val(taskData.status);
            } else {
                // Create mode
                $('#modalTitle').text('Create Task');
                $('#status').val('active');
                $('#estimatedDuration').val(0);
            }
            
            // Show modal with animation
            try {
                const modalElement = document.getElementById('taskModal');
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                    
                    // Animate modal content
                    if (typeof gsap !== 'undefined') {
                        gsap.from('#taskForm', {
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
        
        saveTask: async function() {
            console.log('💾 Saving task');
            
            // Validate form
            const form = $('#taskForm')[0];
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
            
            const taskId = $('#taskId').val();
            const formData = {
                department_id: $('#departmentId').val(),
                task_code: $('#taskCode').val().toUpperCase(),
                task_name: $('#taskName').val(),
                description: $('#description').val() || null,
                skills_required: $('#skillsRequired').val() || null, // Will be converted to array by backend
                time_slot: $('#timeSlot').val() || null,
                estimated_duration: parseInt($('#estimatedDuration').val()) || 0, // In minutes, converted to hours by backend
                status: $('#status').val()
            };
            
            console.log('📝 Form data:', formData);
            
            // Show loading state
            const $saveBtn = $('#btnSaveTask');
            const originalText = $saveBtn.html();
            $saveBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Saving...');
            
            // Add timeout to prevent infinite loading
            const timeoutId = setTimeout(() => {
                console.warn('⏰ Request timeout - restoring button');
                $saveBtn.prop('disabled', false).html(originalText);
                TempleCore.showToast('Request timeout. Please try again.', 'warning');
            }, 30000); // 30 second timeout
            
            try {
                let response;
                
                if (taskId) {
                    // Update existing task
                    console.log(`📤 Sending PUT request to /volunteers/tasks/${taskId}`);
                    response = await TempleAPI.put(`/volunteers/tasks/${taskId}`, formData);
                } else {
                    // Create new task
                    console.log('📤 Sending POST request to /volunteers/tasks');
                    response = await TempleAPI.post('/volunteers/tasks', formData);
                }
                
                // Clear timeout since request completed
                clearTimeout(timeoutId);
                
                console.log('📦 Response received:', response);
                
                if (response.success) {
                    console.log('✅ Save success:', response);
                    
                    // Restore button immediately
                    $saveBtn.prop('disabled', false).html(originalText);
                    
                    // Success animation
                    if (typeof gsap !== 'undefined') {
                        gsap.to('#taskForm', {
                            scale: 1.02,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });
                    }
                    
                    TempleCore.showToast(
                        taskId ? 'Task updated successfully!' : 'Task created successfully!',
                        'success'
                    );
                    
                    // Hide modal
                    const modalElement = document.getElementById('taskModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) {
                            modal.hide();
                        } else {
                            // Fallback - manually hide
                            $(modalElement).modal('hide');
                        }
                    }
                    
                    // Reload tasks after a brief delay
                    setTimeout(() => {
                        this.loadTasks();
                    }, 300);
                } else {
                    throw new Error(response.message || 'Failed to save task');
                }
            } catch (error) {
                // Clear timeout
                clearTimeout(timeoutId);
                
                console.error('❌ Save error:', error);
                console.error('Error object:', JSON.stringify(error, null, 2));
                
                // Extract error message
                let errorMessage = 'Failed to save task';
                
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
                
                // Always restore button in error case
                $saveBtn.prop('disabled', false).html(originalText);
            }
        },
        
        editTask: async function(id) {
            console.log('✏️ Editing task:', id);
            
            try {
                const response = await TempleAPI.get(`/volunteers/tasks/${id}`);
                
                if (response.success) {
                    console.log('✅ Task data loaded:', response.data);
                    this.showTaskModal(response.data);
                } else {
                    throw new Error(response.message || 'Failed to load task');
                }
            } catch (error) {
                console.error('❌ Failed to load task:', error);
                TempleCore.showToast('Failed to load task details', 'error');
            }
        },
        
        deleteTask: function(id) {
            console.log('🗑️ Delete requested for:', id);
            this.currentTask = id;
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        },
        
        confirmDelete: async function() {
            const id = this.currentTask;
            console.log('⚠️ Confirming delete for:', id);
            
            // Show loading state
            const $deleteBtn = $('#btnConfirmDelete');
            const originalText = $deleteBtn.html();
            $deleteBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Deleting...');
            
            // Add timeout protection
            const timeoutId = setTimeout(() => {
                console.warn('⏰ Delete request timeout - restoring button');
                $deleteBtn.prop('disabled', false).html(originalText);
                TempleCore.showToast('Request timeout. Please try again.', 'warning');
            }, 30000); // 30 second timeout
            
            try {
                console.log(`📤 Sending DELETE request to /volunteers/tasks/${id}`);
                const response = await TempleAPI.delete(`/volunteers/tasks/${id}`);
                
                // Clear timeout
                clearTimeout(timeoutId);
                
                console.log('📦 Response received:', response);
                
                if (response.success) {
                    console.log('✅ Delete success:', response);
                    
                    // Restore button
                    $deleteBtn.prop('disabled', false).html(originalText);
                    
                    TempleCore.showToast('Task deleted successfully!', 'success');
                    
                    // Hide modal
                    const modalElement = document.getElementById('deleteModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) {
                            modal.hide();
                        } else {
                            $(modalElement).modal('hide');
                        }
                    }
                    
                    // Reload tasks after brief delay
                    setTimeout(() => {
                        this.loadTasks();
                    }, 300);
                } else {
                    throw new Error(response.message || 'Failed to delete task');
                }
            } catch (error) {
                // Clear timeout
                clearTimeout(timeoutId);
                
                console.error('❌ Delete error:', error);
                console.error('Error object:', JSON.stringify(error, null, 2));
                
                // Extract error message
                let errorMessage = 'Failed to delete task';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                
                // Always restore button
                $deleteBtn.prop('disabled', false).html(originalText);
            }
        },
        
        toggleStatus: async function(id) {
            console.log('🔄 Toggling status for:', id);
            
            // Show loading indicator
            const $btn = $(`.btn-toggle-status[data-id="${id}"]`);
            const originalHtml = $btn.html();
            $btn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i>');
            
            // Add timeout protection
            const timeoutId = setTimeout(() => {
                console.warn('⏰ Toggle request timeout');
                $btn.prop('disabled', false).html(originalHtml);
                TempleCore.showToast('Request timeout. Please try again.', 'warning');
            }, 15000); // 15 second timeout for this quick operation
            
            try {
                console.log(`📤 Sending PATCH request to /volunteers/tasks/${id}/toggle-status`);
                const response = await TempleAPI.patch(`/volunteers/tasks/${id}/toggle-status`, {});
                
                // Clear timeout
                clearTimeout(timeoutId);
                
                console.log('📦 Response received:', response);
                
                if (response.success) {
                    console.log('✅ Status toggled:', response);
                    TempleCore.showToast('Status updated successfully!', 'success');
                    
                    // Restore button
                    $btn.prop('disabled', false).html(originalHtml);
                    
                    // Reload table after brief delay
                    setTimeout(() => {
                        this.loadTasks();
                    }, 300);
                } else {
                    throw new Error(response.message || 'Failed to update status');
                }
            } catch (error) {
                // Clear timeout
                clearTimeout(timeoutId);
                
                console.error('❌ Toggle error:', error);
                console.error('Error object:', JSON.stringify(error, null, 2));
                
                let errorMessage = 'Failed to update status';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                
                // Always restore button
                $btn.prop('disabled', false).html(originalHtml);
            }
        }
    };
    
    console.log('✅ VolunteersTasksPage module loaded');
    
})(jQuery, window);