// js/pages/volunteers/departments.js
// Volunteer Departments Management Page - Enhanced Version with Fixed Error Handling
// Master Setup - Foundation for Volunteer System

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
    // VOLUNTEERS DEPARTMENTS PAGE
    // ========================================
    window.VolunteersDepartmentsPage = {
        pageId: 'volunteers-departments',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        dataTable: null,
        currentDepartment: null,
        coordinators: [],
        intervals: [],
        timeouts: [],
        
        init: function(params) {
            console.log('🚀 Initializing Volunteer Departments Page');
            
            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);
            
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadDepartments();
            
            console.log('✅ Departments Page Initialized');
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
            console.log('📝 Rendering Departments Page HTML');
            
            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header with Animation -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-diagram-3-fill volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Volunteer Departments</h1>
                                            <p class="volunteers-subtitle">义工部门 • Department Master Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="btnCreateDepartment">
                                        <i class="bi bi-plus-circle me-2"></i>
                                        Create Department
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
                                    <div class="col-md-4">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-search me-2 text-primary"></i>Search
                                        </label>
                                        <input type="text" class="form-control" id="searchInput" 
                                               placeholder="Search by name or code...">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-funnel me-2 text-primary"></i>Status
                                        </label>
                                        <select class="form-select" id="statusFilter">
                                            <option value="">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
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

                            <!-- Departments Table -->
                            <div class="table-container" data-aos="fade-up" data-aos-delay="400">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle" id="departmentsTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th>
                                                    <i class="bi bi-code-square me-2"></i>Code
                                                </th>
                                                <th>
                                                    <i class="bi bi-building me-2"></i>Department Name
                                                </th>
                                                <th>
                                                    <i class="bi bi-person-badge me-2"></i>Coordinator
                                                </th>
                                                <th class="text-center">
                                                    <i class="bi bi-people me-2"></i>Capacity
                                                </th>
                                                <th class="text-center">
                                                    <i class="bi bi-toggle-on me-2"></i>Status
                                                </th>
                                                <th>
                                                    <i class="bi bi-calendar-event me-2"></i>Created
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
                                                    <p class="mt-2 text-muted">Loading departments...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create/Edit Department Modal -->
                <div class="modal fade" id="departmentModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-diagram-3 me-2"></i>
                                    <span id="modalTitle">Create Department</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="departmentForm" novalidate>
                                    <input type="hidden" id="departmentId">
                                    
                                    <div class="row g-4">
                                        <!-- Section Header -->
                                        <div class="col-12">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-info-circle"></i>
                                                <span>Basic Information 基本信息</span>
                                            </div>
                                        </div>

                                  <!-- Department Name (Chinese) -->
<div class="col-md-6">
    <label class="form-label">
        Department Name (Chinese) <span class="text-danger">*</span>
        
    </label>
    <input type="text" class="form-control" id="departmentName" 
           placeholder="e.g., 活动管理" required>
    <div class="invalid-feedback">Please enter Chinese department name</div>
</div>

<!-- Department Name (English) - Optional -->
<div class="col-md-6">
    <label class="form-label">
        Department Name (English) 
 
    </label>
    <input type="text" class="form-control" id="departmentNameEn" 
           placeholder="e.g., Event Management">
    <small class="text-muted">Optional: English translation of department name</small>
</div>

                                        <!-- Department Code -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Department Code <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control text-uppercase" id="departmentCode" 
                                                   placeholder="e.g., EVENT, KITCHEN" required maxlength="20">
                                            <div class="invalid-feedback">Please enter department code</div>
                                            <small class="text-muted">Unique code for identification</small>
                                        </div>

                                        <!-- Description -->
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" id="description" rows="3"
                                                      placeholder="Brief description of the department's responsibilities and activities..."></textarea>
                                            <small class="text-muted">Optional: Describe what this department does</small>
                                        </div>

                                        <!-- Section Header -->
                                        <div class="col-12 mt-4">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-person-gear"></i>
                                                <span>Management & Capacity 管理与容量</span>
                                            </div>
                                        </div>

                                        <!-- Coordinator -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-person-badge me-2 text-primary"></i>
                                                Department Coordinator
                                            </label>
                                            <select class="form-select" id="coordinatorUserId">
                                                <option value="">Select Coordinator (Optional)</option>
                                                <!-- Will be populated dynamically -->
                                            </select>
                                            <small class="text-muted">Person responsible for this department</small>
                                        </div>

                                        <!-- Capacity Target -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-people me-2 text-primary"></i>
                                                Capacity Target
                                            </label>
                                            <input type="number" class="form-control" id="capacityTarget" 
                                                   placeholder="0" min="0" value="0">
                                            <small class="text-muted">Target number of volunteers for this department</small>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-toggle-on me-2 text-primary"></i>
                                                Status <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="status" required>
                                                <option value="active">✅ Active - Available for Registration</option>
                                                <option value="inactive">⛔ Inactive - Hidden from Registration</option>
                                            </select>
                                        </div>

                                        <!-- Alert Box -->
                                        <div class="col-12">
                                            <div class="alert alert-info mb-0" role="alert">
                                                <i class="bi bi-info-circle me-2"></i>
                                                <strong>Important:</strong> Only <strong>Active</strong> departments will be available for volunteer registration and task assignment.
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="btnSaveDepartment">
                                    <i class="bi bi-check-circle me-2"></i>Save Department
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
                                <p class="text-center">Are you sure you want to delete this department?</p>
                                <div class="alert alert-warning mb-0">
                                    <strong><i class="bi bi-exclamation-triangle me-2"></i>Warning:</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>This action cannot be undone</li>
                                        <li>Departments with existing tasks cannot be deleted</li>
                                        <li>Departments with assigned volunteers cannot be deleted</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-danger" id="btnConfirmDelete">
                                    <i class="bi bi-trash me-2"></i>Delete Department
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
                    gsap.from('#departmentsTable tbody tr', {
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
            
            // Create Department Button
            $(document).on('click.' + this.eventNamespace, '#btnCreateDepartment', function(e) {
                e.preventDefault();
                console.log('➕ Create button clicked');
                self.showDepartmentModal();
            });
            
            // Save Department Button
            $(document).on('click.' + this.eventNamespace, '#btnSaveDepartment', function(e) {
                e.preventDefault();
                console.log('💾 Save button clicked');
                self.saveDepartment();
            });
            
            // Edit Department Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-edit', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('✏️ Edit clicked for ID:', id);
                self.editDepartment(id);
            });
            
            // Delete Department Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('🗑️ Delete clicked for ID:', id);
                self.deleteDepartment(id);
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
                self.loadDepartments();
            });
            
            // Reset Filters
            $(document).on('click.' + this.eventNamespace, '#btnResetFilters', function(e) {
                e.preventDefault();
                console.log('🔄 Reset filters clicked');
                $('#searchInput').val('');
                $('#statusFilter').val('');
                self.loadDepartments();
            });
            
            // Search on Enter
            $(document).on('keypress.' + this.eventNamespace, '#searchInput', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    console.log('🔍 Search on enter');
                    self.loadDepartments();
                }
            });

            // Department code auto-uppercase
            $(document).on('input.' + this.eventNamespace, '#departmentCode', function() {
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
        
loadDepartments: async function() {
    console.log('📡 Loading departments from API');
    
    const filters = {
        search: $('#searchInput').val(),
        status: $('#statusFilter').val()
    };
    
    console.log('🔍 Filters:', filters);
    
    try {
        const response = await TempleAPI.get('/volunteers/departments', filters);
        
        console.log('📦 Raw response:', response);
        
        if (response.success) {
            console.log(`✅ Loaded ${response.data.length} departments`);
            this.renderTable(response.data || []);
        } else {
            throw new Error(response.message || 'Failed to load departments');
        }
    } catch (error) {
        console.error('❌ Error loading departments:', error);
        
        // Extract error message properly
        let errorMessage = 'Failed to load departments';
        
        // Check different error response formats
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
renderTable: function(departments) {
    const self = this;
    console.log('📊 Rendering table with', departments.length, 'departments');
    
    // Destroy existing DataTable
    if (this.dataTable) {
        console.log('Destroying existing DataTable');
        this.dataTable.destroy();
        this.dataTable = null;
    }
    
    const tableBody = $('#departmentsTable tbody');
    tableBody.empty();
    
    // Handle empty state
    if (departments.length === 0) {
        console.log('No departments found - showing empty state');
        tableBody.html(`
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="empty-state">
                        <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
                        <h5 class="text-muted">No Departments Found</h5>
                        <p class="text-muted mb-3">Get started by creating your first department</p>
                        <button class="btn btn-primary" id="btnCreateDepartment">
                            <i class="bi bi-plus-circle me-2"></i>Create First Department
                        </button>
                    </div>
                </td>
            </tr>
        `);
        return;
    }
    
    // Initialize DataTable FIRST (before adding rows)
    try {
        this.dataTable = $('#departmentsTable').DataTable({
            data: departments,
            order: [[0, 'asc']],
            pageLength: 25,
            responsive: true,
            columns: [
                {
                    // Code
                    data: 'department_code',
                    render: function(data, type, row) {
                        return `<span class="badge bg-primary">${data}</span>`;
                    }
                },
       {
    // Department Name
    data: null,
    render: function(data, type, row) {
        let html = '<div class="fw-semibold">';
        
        // Show Chinese name (primary)
        html += row.department_name;
        
        // Show English name if available (secondary)
        if (row.department_name_en) {
            html += '<br><small class="text-muted">' + row.department_name_en + '</small>';
        }
        
        html += '</div>';
        
        if (row.description) {
            html += '<small class="text-muted d-block mt-1">' + row.description + '</small>';
        }
        return html;
    }
},
                {
                    // Coordinator
                    data: null,
                    render: function(data, type, row) {
                        if (row.coordinator_user) {
                            return `<div class="d-flex align-items-center">
                                        <i class="bi bi-person-circle me-2 text-primary"></i>
                                        <span>${row.coordinator_user.name}</span>
                                   </div>`;
                        } else {
                            return '<span class="text-muted"><i class="bi bi-person-dash me-2"></i>Not Assigned</span>';
                        }
                    }
                },
                {
                    // Capacity
                    data: 'capacity_target',
                    className: 'text-center',
                    render: function(data, type, row) {
                        if (data > 0) {
                            return `<span class="badge bg-info">${data}</span>`;
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
                        if (data === 'active') {
                            return '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Active</span>';
                        } else {
                            return '<span class="badge bg-secondary"><i class="bi bi-x-circle me-1"></i>Inactive</span>';
                        }
                    }
                },
                {
                    // Created
                    data: 'created_at',
                    render: function(data, type, row) {
                        const createdDate = TempleCore.formatDate ? TempleCore.formatDate(data) : data;
                        return `<small class="text-muted">
                                    <i class="bi bi-calendar3 me-1"></i>${createdDate}
                                </small>`;
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
                                            title="Edit Department">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-${toggleClass} btn-toggle-status" 
                                            data-id="${row.id}" 
                                            title="${toggleTitle}">
                                        <i class="bi bi-toggle-${toggleIcon}"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-delete" 
                                            data-id="${row.id}" 
                                            title="Delete Department">
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
                info: "Showing _START_ to _END_ of _TOTAL_ departments",
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
        
        console.log('✅ DataTable initialized with', departments.length, 'rows');
        
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
        
        showDepartmentModal: function(departmentData = null) {
            const self = this;
            console.log('📝 Showing department modal', departmentData ? 'EDIT' : 'CREATE');
            
            // Reset form
            $('#departmentForm')[0].reset();
            $('#departmentForm').removeClass('was-validated');
            $('#departmentId').val('');
            
            if (departmentData) {
                // Edit mode
                $('#modalTitle').text('Edit Department');
                $('#departmentId').val(departmentData.id);
                $('#departmentName').val(departmentData.department_name);
                      $('#departmentNameEn').val(departmentData.department_name_en || ''); 
                $('#departmentCode').val(departmentData.department_code);
                $('#description').val(departmentData.description);
                $('#coordinatorUserId').val(departmentData.coordinator_user_id);
                $('#capacityTarget').val(departmentData.capacity_target);
                $('#status').val(departmentData.status);
            } else {
                // Create mode
                $('#modalTitle').text('Create Department');
                $('#status').val('active');
                $('#capacityTarget').val(0);
            }
            
            // Load coordinators
            this.loadCoordinators();
            
            // Show modal with animation
            try {
                const modalElement = document.getElementById('departmentModal');
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                    
                    // Animate modal content
                    if (typeof gsap !== 'undefined') {
                        gsap.from('#departmentForm', {
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
        
        loadCoordinators: async function() {
            console.log('📡 Loading coordinators');
            
            try {
                const response = await TempleAPI.get('/users/active-staff');
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} coordinators`);
                    this.coordinators = response.data;
                    
                    const select = $('#coordinatorUserId');
                    select.find('option:not(:first)').remove();
                    
                    this.coordinators.forEach(function(user) {
                        select.append(`<option value="${user.id}">${user.name}</option>`);
                    });
                }
            } catch (error) {
                console.error('❌ Failed to load coordinators:', error);
            }
        },
        
        saveDepartment: async function() {
            console.log('💾 Saving department');
            
            // Validate form
            const form = $('#departmentForm')[0];
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
            
            const departmentId = $('#departmentId').val();
            const formData = {
                department_name: $('#departmentName').val().trim(),
                     department_name_en: $('#departmentNameEn').val().trim() || null,
                department_code: $('#departmentCode').val().trim().toUpperCase(),
                description: $('#description').val().trim(),
                coordinator_user_id: $('#coordinatorUserId').val() || null,
                capacity_target: parseInt($('#capacityTarget').val()) || 0,
                status: $('#status').val()
            };
            
            console.log('📝 Form data:', formData);
            
            // Show loading state
            const $saveBtn = $('#btnSaveDepartment');
            const originalText = $saveBtn.html();
            $saveBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Saving...');
            
            try {
                let response;
                
                if (departmentId) {
                    // Update existing department
                    response = await TempleAPI.put(`/volunteers/departments/${departmentId}`, formData);
                } else {
                    // Create new department
                    response = await TempleAPI.post('/volunteers/departments', formData);
                }
                
                if (response.success) {
                    console.log('✅ Save success:', response);
                    
                    // Success animation
                    if (typeof gsap !== 'undefined') {
                        gsap.to('#departmentForm', {
                            scale: 1.02,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });
                    }
                    
                    TempleCore.showToast(
                        departmentId ? 'Department updated successfully!' : 'Department created successfully!',
                        'success'
                    );
                    
                    // Hide modal
                    const modalElement = document.getElementById('departmentModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                    
                    // Reload departments
                    this.loadDepartments();
                } else {
                    throw new Error(response.message || 'Failed to save department');
                }
            } catch (error) {
                console.error('❌ Save error:', error);
                
                // ========================================
                // IMPROVED ERROR HANDLING
                // Extract meaningful error messages from API responses
                // ========================================
                let errorMessage = 'Failed to save department';
                
                // Check if error has responseJSON (jQuery AJAX error format)
                if (error.responseJSON) {
                    console.log('📋 Error response JSON:', error.responseJSON);
                    
                    // Laravel validation error response
                    if (error.responseJSON.message) {
                        errorMessage = error.responseJSON.message;
                    }
                    
                    // Display validation errors if available
                    if (error.responseJSON.errors) {
                        const errors = error.responseJSON.errors;
                        const errorList = Object.values(errors).flat();
                        if (errorList.length > 0) {
                            errorMessage = errorList.join('<br>');
                        }
                        console.log('📋 Validation errors:', errorList);
                    }
                } 
                // Check if error has message property
                else if (error.message) {
                    errorMessage = error.message;
                } 
                // If error is a string
                else if (typeof error === 'string') {
                    errorMessage = error;
                }
                // If error has responseText
                else if (error.responseText) {
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
                $saveBtn.prop('disabled', false).html(originalText);
            }
        },
        
        editDepartment: async function(id) {
            console.log('✏️ Editing department:', id);
            
            try {
                const response = await TempleAPI.get(`/volunteers/departments/${id}`);
                
                if (response.success) {
                    console.log('✅ Department data loaded:', response.data);
                    this.showDepartmentModal(response.data);
                } else {
                    throw new Error(response.message || 'Failed to load department');
                }
            } catch (error) {
                console.error('❌ Failed to load department:', error);
                TempleCore.showToast('Failed to load department details', 'error');
            }
        },
        
        deleteDepartment: function(id) {
            console.log('🗑️ Delete requested for:', id);
            this.currentDepartment = id;
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        },
        
        confirmDelete: async function() {
            const id = this.currentDepartment;
            console.log('⚠️ Confirming delete for:', id);
            
            // Show loading state
            const $deleteBtn = $('#btnConfirmDelete');
            const originalText = $deleteBtn.html();
            $deleteBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Deleting...');
            
            try {
                const response = await TempleAPI.delete(`/volunteers/departments/${id}`);
                
                if (response.success) {
                    console.log('✅ Delete success:', response);
                    TempleCore.showToast('Department deleted successfully!', 'success');
                    
                    // Hide modal
                    const modalElement = document.getElementById('deleteModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                    
                    // Reload departments
                    this.loadDepartments();
                } else {
                    throw new Error(response.message || 'Failed to delete department');
                }
            } catch (error) {
                console.error('❌ Delete error:', error);
                
                // Extract error message
                let errorMessage = 'Failed to delete department';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                $deleteBtn.prop('disabled', false).html(originalText);
            }
        },
        
toggleStatus: async function(id) {
    console.log('🔄 Toggling status for:', id);
    
    try {
        // Changed from PUT to PATCH to match the route definition
        const response = await TempleAPI.patch(`/volunteers/departments/${id}/toggle-status`, {});
        
        if (response.success) {
            console.log('✅ Status toggled:', response);
            TempleCore.showToast('Status updated successfully!', 'success');
            this.loadDepartments();
        } else {
            throw new Error(response.message || 'Failed to update status');
        }
    } catch (error) {
        console.error('❌ Toggle error:', error);
        
        let errorMessage = 'Failed to update status';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        TempleCore.showToast(errorMessage, 'error');
    }
}
    };
    
    console.log('✅ VolunteersDepartmentsPage module loaded');
    
})(jQuery, window);