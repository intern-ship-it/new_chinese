// js/pages/volunteers/approval-queue.js
// Volunteer Approval Queue Management Page
// Handles volunteer registration approval workflow

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
    // VOLUNTEERS APPROVAL QUEUE PAGE
    // ========================================
    window.VolunteersApprovalQueuePage = {
        pageId: 'volunteers-approval-queue',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        dataTable: null,
        currentVolunteer: null,
        departments: [],
        intervals: [],
        timeouts: [],
        volunteersData: [], // Store the full volunteer data
        
        init: function(params) {
            console.log('🚀 Initializing Volunteer Approval Queue Page');
            
            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);
            
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadDepartments();
            this.loadApprovalQueue();
            this.startPendingCountRefresh();
            
            console.log('✅ Approval Queue Page Initialized');
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
            console.log('🎨 Rendering Approval Queue Page HTML');
            
            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header with Animation -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-clipboard-check-fill volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Approval Queue</h1>
                                            <p class="volunteers-subtitle">📋✅ Review & Approve Volunteer Applications</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="btnRefreshQueue">
                                        <i class="bi bi-arrow-clockwise me-2"></i>
                                        Refresh Queue
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
                                               placeholder="Search by name, ID, IC, mobile...">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-building me-2 text-primary"></i>Department
                                        </label>
                                        <select class="form-select" id="departmentFilter">
                                            <option value="">All Departments</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-calendar-range me-2 text-primary"></i>Registered From
                                        </label>
                                        <input type="date" class="form-control" id="fromDateFilter">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label d-block">&nbsp;</label>
                                        <button class="btn btn-primary w-100" id="btnApplyFilters">
                                            <i class="bi bi-funnel me-2"></i>Apply
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Approval Queue Table -->
                            <div class="table-container" data-aos="fade-up" data-aos-delay="400">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle" id="approvalQueueTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="100">
                                                    <i class="bi bi-hash me-2"></i>Volunteer ID
                                                </th>
                                                <th>
                                                    <i class="bi bi-person me-2"></i>Name
                                                </th>
                                                <th>
                                                    <i class="bi bi-phone me-2"></i>Contact
                                                </th>
                                                <th>
                                                    <i class="bi bi-building me-2"></i>Department
                                                </th>
                                                <th class="text-center">
                                                    <i class="bi bi-file-earmark me-2"></i>Documents
                                                </th>
                                                <th>
                                                    <i class="bi bi-calendar-event me-2"></i>Registered
                                                </th>
                                                <th class="text-center" width="180">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="7" class="text-center py-5">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2 text-muted">Loading approval queue...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Details Modal -->
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-badge me-2"></i>
                                    Volunteer Application Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="volunteerDetailsContent">
                                <!-- Will be populated dynamically -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Close
                                </button>
                                <button type="button" class="btn btn-warning" id="btnRequestResubmission">
                                    <i class="bi bi-arrow-repeat me-2"></i>Request Resubmission
                                </button>
                                <button type="button" class="btn btn-danger" id="btnRejectFromDetails">
                                    <i class="bi bi-x-circle me-2"></i>Reject
                                </button>
                                <button type="button" class="btn btn-success" id="btnApproveFromDetails">
                                    <i class="bi bi-check-circle me-2"></i>Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Approve Confirmation Modal -->
                <div class="modal fade" id="approveModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-check-circle me-2"></i>
                                    Confirm Approval
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
                                </div>
                                <p class="text-center mb-3">Are you sure you want to approve this volunteer?</p>
                                <div class="alert alert-success mb-0">
                                    <strong><i class="bi bi-info-circle me-2"></i>Action:</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>Volunteer status will change to <strong>ACTIVE</strong></li>
                                        <li>Volunteer can be assigned to tasks</li>
                                        <li>Volunteer can clock in/out for attendance</li>
                                    </ul>
                                </div>
                                <div class="mt-3">
                                    <label class="form-label">Remarks (Optional)</label>
                                    <textarea class="form-control" id="approveRemarks" rows="2" 
                                              placeholder="Any additional notes for approval..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-success" id="btnConfirmApprove">
                                    <i class="bi bi-check-circle me-2"></i>Confirm Approval
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reject Modal -->
                <div class="modal fade" id="rejectModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-x-circle me-2"></i>
                                    Reject Application
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="bi bi-x-circle text-danger" style="font-size: 3rem;"></i>
                                </div>
                                <p class="text-center mb-3">Please provide a reason for rejection:</p>
                                <div class="alert alert-warning">
                                    <strong><i class="bi bi-exclamation-triangle me-2"></i>Important:</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>This action will change volunteer status to <strong>REJECTED</strong></li>
                                        <li>Volunteer will be notified via email/SMS</li>
                                        <li>Reason is <strong>mandatory</strong> and will be recorded</li>
                                    </ul>
                                </div>
                                <div>
                                    <label class="form-label">
                                        Rejection Reason <span class="text-danger">*</span>
                                    </label>
                                    <textarea class="form-control" id="rejectReason" rows="3" 
                                              placeholder="Please explain why this application is being rejected..." required></textarea>
                                    <div class="invalid-feedback">Rejection reason is required</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-danger" id="btnConfirmReject">
                                    <i class="bi bi-x-circle me-2"></i>Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Request Resubmission Modal -->
                <div class="modal fade" id="resubmissionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-warning text-dark">
                                <h5 class="modal-title">
                                    <i class="bi bi-arrow-repeat me-2"></i>
                                    Request Resubmission
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="bi bi-arrow-repeat text-warning" style="font-size: 3rem;"></i>
                                </div>
                                <p class="text-center mb-3">Specify what needs to be corrected or resubmitted:</p>
                                <div class="alert alert-info">
                                    <strong><i class="bi bi-info-circle me-2"></i>Note:</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>Volunteer will remain in <strong>PENDING_APPROVAL</strong> status</li>
                                        <li>Volunteer will be notified about required changes</li>
                                        <li>You can review the application again after resubmission</li>
                                    </ul>
                                </div>
                                <div>
                                    <label class="form-label">
                                        Required Changes <span class="text-danger">*</span>
                                    </label>
                                    <textarea class="form-control" id="resubmissionRemarks" rows="3" 
                                              placeholder="Please specify what needs to be corrected (e.g., 'Upload clearer IC copy', 'Provide correct mobile number')..." required></textarea>
                                    <div class="invalid-feedback">Please specify required changes</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-warning" id="btnConfirmResubmission">
                                    <i class="bi bi-arrow-repeat me-2"></i>Send Request
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
            console.log('🎬 Initializing animations');
            
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

                // Stats cards entrance animation
                gsap.from('.stats-card', {
                    opacity: 0,
                    y: 30,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: 'power2.out',
                    delay: 0.3
                });

                // Table row entrance animation
                const animateTableRows = () => {
                    gsap.from('#approvalQueueTable tbody tr', {
                        // opacity: 0,
                        x: -20,
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
            
            // Refresh Queue Button
            $(document).on('click.' + this.eventNamespace, '#btnRefreshQueue', function(e) {
                e.preventDefault();
                console.log('🔄 Refresh queue clicked');
                self.loadApprovalQueue();
            });
            
            // View Details Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-view-details', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('👁️ View details clicked for ID:', id);
                self.viewDetails(id);
            });
            
            // Quick Approve Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-quick-approve', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('✅ Quick approve clicked for ID:', id);
                self.showApproveModal(id);
            });
            
            // Quick Reject Button (delegated)
            $(document).on('click.' + this.eventNamespace, '.btn-quick-reject', function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('❌ Quick reject clicked for ID:', id);
                self.showRejectModal(id);
            });
            
            // Approve from Details Modal
            $(document).on('click.' + this.eventNamespace, '#btnApproveFromDetails', function(e) {
                e.preventDefault();
                console.log('✅ Approve from details clicked');
                if (self.currentVolunteer) {
                    // Close details modal first
                    $('#viewDetailsModal').modal('hide');
                    // Show approve modal
                    setTimeout(() => {
                        self.showApproveModal(self.currentVolunteer.id);
                    }, 300);
                }
            });
            
            // Reject from Details Modal
            $(document).on('click.' + this.eventNamespace, '#btnRejectFromDetails', function(e) {
                e.preventDefault();
                console.log('❌ Reject from details clicked');
                if (self.currentVolunteer) {
                    // Close details modal first
                    $('#viewDetailsModal').modal('hide');
                    // Show reject modal
                    setTimeout(() => {
                        self.showRejectModal(self.currentVolunteer.id);
                    }, 300);
                }
            });
            
            // Request Resubmission from Details Modal
            $(document).on('click.' + this.eventNamespace, '#btnRequestResubmission', function(e) {
                e.preventDefault();
                console.log('🔄 Request resubmission clicked');
                if (self.currentVolunteer) {
                    // Close details modal first
                    $('#viewDetailsModal').modal('hide');
                    // Show resubmission modal
                    setTimeout(() => {
                        self.showResubmissionModal(self.currentVolunteer.id);
                    }, 300);
                }
            });
            
            // Confirm Approve Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmApprove', function(e) {
                e.preventDefault();
                console.log('✅ Confirm approve clicked');
                self.confirmApprove();
            });
            
            // Confirm Reject Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmReject', function(e) {
                e.preventDefault();
                console.log('❌ Confirm reject clicked');
                self.confirmReject();
            });
            
            // Confirm Resubmission Button
            $(document).on('click.' + this.eventNamespace, '#btnConfirmResubmission', function(e) {
                e.preventDefault();
                console.log('🔄 Confirm resubmission clicked');
                self.confirmResubmission();
            });
            
            // Apply Filters
            $(document).on('click.' + this.eventNamespace, '#btnApplyFilters', function(e) {
                e.preventDefault();
                console.log('🔍 Apply filters clicked');
                self.loadApprovalQueue();
            });
            
            // Search on Enter
            $(document).on('keypress.' + this.eventNamespace, '#searchInput', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    console.log('🔍 Search on enter');
                    self.loadApprovalQueue();
                }
            });
            
            console.log('✅ Events bound successfully');
        },
        
        loadDepartments: async function() {
            console.log('🏢 Loading departments for filter');
            
            try {
                const response = await TempleAPI.get('/volunteers/departments/active');
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} departments`);
                    this.departments = response.data;
                    
                    const select = $('#departmentFilter');
                    select.find('option:not(:first)').remove();
                    
                    this.departments.forEach(function(dept) {
                        select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                    });
                }
            } catch (error) {
                console.error('❌ Failed to load departments:', error);
            }
        },
        
        loadApprovalQueue: async function() {
            console.log('📋 Loading approval queue from API');
            
            const filters = {
                search: $('#searchInput').val(),
                department_id: $('#departmentFilter').val(),
                from_date: $('#fromDateFilter').val()
            };
            
            console.log('🔍 Filters:', filters);
            
            try {
                const response = await TempleAPI.get('/volunteers/approval/queue', filters);
                
                console.log('📦 Raw response:', response);
                
                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} pending volunteers`);
                    this.volunteersData = response.data || [];
                    this.renderTable(this.volunteersData);
                    this.updateStatistics(this.volunteersData);
                } else {
                    throw new Error(response.message || 'Failed to load approval queue');
                }
            } catch (error) {
                console.error('❌ Error loading approval queue:', error);
                
                let errorMessage = 'Failed to load approval queue';
                
                if (error.responseJSON) {
                    errorMessage = error.responseJSON.message || error.responseJSON.error || errorMessage;
                } else if (error.response && error.response.data) {
                    errorMessage = error.response.data.message || error.response.data.error || errorMessage;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                this.volunteersData = [];
                this.renderTable([]);
                this.updateStatistics([]);
            }
        },
        
        renderTable: function(volunteers) {
            const self = this;
            console.log('🎨 Rendering table with', volunteers.length, 'volunteers');
            
            // Destroy existing DataTable
            if (this.dataTable) {
                console.log('Destroying existing DataTable');
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            const tableBody = $('#approvalQueueTable tbody');
            tableBody.empty();
            
            // Handle empty state
            if (volunteers.length === 0) {
                console.log('No pending volunteers - showing empty state');
                tableBody.html(`
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <div class="empty-state">
                                <i class="bi bi-check-circle fs-1 text-success mb-3"></i>
                                <h5 class="text-muted">No Pending Approvals</h5>
                                <p class="text-muted mb-0">All volunteer applications have been processed!</p>
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }
            
            // Initialize DataTable
            try {
                this.dataTable = $('#approvalQueueTable').DataTable({
                    data: volunteers,
                    order: [[5, 'asc']], // Order by registered date (oldest first)
                    pageLength: 25,
                    responsive: true,
                    columns: [
                        {
                            // Volunteer ID
                            data: 'volunteer_id',
                            render: function(data, type, row) {
                                return `<span class="badge bg-primary">${data}</span>`;
                            }
                        },
                        {
                            // Name
                            data: null,
                            render: function(data, type, row) {
                                let html = `<div class="fw-semibold">${row.full_name}</div>`;
                                html += `<small class="text-muted">
                                            <i class="bi bi-card-text me-1"></i>
                                            ${row.id_type === 'ic' ? 'IC' : 'Passport'}: ${row.ic_number || row.passport_number || 'N/A'}
                                         </small>`;
                                return html;
                            }
                        },
                        {
                            // Contact
                            data: null,
                            render: function(data, type, row) {
                                let html = `<div>
                                                <i class="bi bi-telephone me-1 text-primary"></i>
                                                ${row.mobile_primary}
                                            </div>`;
                                if (row.email) {
                                    html += `<small class="text-muted">
                                                <i class="bi bi-envelope me-1"></i>
                                                ${row.email}
                                             </small>`;
                                }
                                return html;
                            }
                        },
                        {
                            // Department
                            data: null,
                            render: function(data, type, row) {
                                if (row.preferred_department) {
                                    return `<span class="badge bg-info">${row.preferred_department.department_name}</span>`;
                                } else {
                                    return '<span class="text-muted">Not specified</span>';
                                }
                            }
                        },
                        {
                            // Documents
                            data: null,
                            className: 'text-center',
                            render: function(data, type, row) {
                                if (row.document_status === 'complete') {
                                    return `<span class="badge bg-success">
                                                <i class="bi bi-check-circle me-1"></i>Complete
                                            </span>`;
                                } else {
                                    const missingCount = row.missing_documents ? row.missing_documents.length : 0;
                                    const missingDocsText = row.missing_documents ? row.missing_documents.join(', ') : 'Unknown';
                                    return `<span class="badge bg-danger" title="Missing: ${missingDocsText}">
                                                <i class="bi bi-exclamation-triangle me-1"></i>
                                                ${missingCount} Missing
                                            </span>`;
                                }
                            }
                        },
                        {
                            // Registered
                            data: 'registered_at',
                            render: function(data, type, row) {
                                const registeredDate = TempleCore.formatDate ? TempleCore.formatDate(data) : data;
                                const daysWaiting = self.calculateDaysWaiting(data);
                                return `<div>
                                            <small class="text-muted">
                                                <i class="bi bi-calendar3 me-1"></i>${registeredDate}
                                            </small>
                                            <br>
                                            <span class="badge ${daysWaiting > 7 ? 'bg-danger' : 'bg-warning'}">
                                                ${daysWaiting} day${daysWaiting !== 1 ? 's' : ''} waiting
                                            </span>
                                        </div>`;
                            }
                        },
                        {
                            // Actions
                            data: null,
                            className: 'text-center',
                            orderable: false,
                            render: function(data, type, row) {
                                const canApprove = row.document_status === 'complete';
                                
                                return `<div class="btn-group-vertical btn-group-sm" role="group">
                                            <button class="btn btn-outline-info btn-view-details" 
                                                    data-id="${row.id}" 
                                                    title="View Full Details">
                                                <i class="bi bi-eye me-1"></i>View Details
                                            </button>
                                            <button class="btn btn-outline-success btn-quick-approve" 
                                                    data-id="${row.id}" 
                                                    title="Approve Application"
                                                   >
                                                <i class="bi bi-check-circle me-1"></i>Approve
                                            </button>
                                            <button class="btn btn-outline-danger btn-quick-reject" 
                                                    data-id="${row.id}" 
                                                    title="Reject Application">
                                                <i class="bi bi-x-circle me-1"></i>Reject
                                            </button>
                                        </div>`;
                            }
                        }
                    ],
                    language: {
                        search: "_INPUT_",
                        searchPlaceholder: "Search in table...",
                        lengthMenu: "Show _MENU_ entries",
                        info: "Showing _START_ to _END_ of _TOTAL_ pending applications",
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
                
                console.log('✅ DataTable initialized with', volunteers.length, 'rows');
                
                // Trigger entrance animation
                if (this.animateTableRows && typeof gsap !== 'undefined') {
                    setTimeout(() => {
                        this.animateTableRows();
                    }, 100);
                }
            } catch (error) {
                console.error('❌ DataTable initialization error:', error);
            }
        },
        
        updateStatistics: function(volunteers) {
            console.log('📊 Updating statistics with', volunteers.length, 'volunteers');
            
            const pending = volunteers.length;
            const completeDocs = volunteers.filter(v => v.document_status === 'complete').length;
            const missingDocs = volunteers.filter(v => v.document_status === 'incomplete').length;
            
            // Calculate average wait time
            const totalWaitDays = volunteers.reduce((sum, v) => {
                return sum + this.calculateDaysWaiting(v.registered_at);
            }, 0);
            const avgWaitDays = volunteers.length > 0 ? Math.round(totalWaitDays / volunteers.length) : 0;
            
            $('#statPending').text(pending);
            $('#statCompleteDocs').text(completeDocs);
            $('#statMissingDocs').text(missingDocs);
            $('#statAvgWaitTime').text(avgWaitDays + 'd');
            
            console.log('📊 Statistics updated:', {
                pending,
                completeDocs,
                missingDocs,
                avgWaitDays
            });
        },
        
        calculateDaysWaiting: function(registeredDate) {
            const registered = new Date(registeredDate);
            const now = new Date();
            const diffTime = Math.abs(now - registered);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        },
        
        viewDetails: async function(id) {
            console.log('👁️ Viewing details for ID:', id);
            
            try {
                const response = await TempleAPI.get(`/volunteers/approval/${id}`);
                
                console.log('📦 API Response:', response);
                
                if (response && response.success && response.data) {
                    console.log('✅ Volunteer details loaded:', response.data);
                    this.currentVolunteer = response.data;
                    this.renderVolunteerDetails(response.data);
                    
                    // Show modal
                    const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
                    modal.show();
                } else {
                    throw new Error(response.message || 'Failed to load volunteer details');
                }
            } catch (error) {
                console.error('❌ Failed to load volunteer details:', error);
                console.error('Error object:', error);
                
                let errorMessage = 'Failed to load volunteer details';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
            }
        },
        
        renderVolunteerDetails: function(volunteer) {
            console.log('🎨 Rendering volunteer details');
            
            const daysWaiting = this.calculateDaysWaiting(volunteer.registered_at);
            const documentStatus = volunteer.document_status === 'complete' 
                ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Complete</span>'
                : `<span class="badge bg-danger"><i class="bi bi-exclamation-triangle me-1"></i>${volunteer.missing_documents.length} Missing</span>`;
            
            const html = `
                <div class="volunteer-details-content">
                    <!-- Status Alert -->
                    <div class="alert ${volunteer.document_status === 'complete' ? 'alert-success' : 'alert-warning'} mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <strong><i class="bi bi-info-circle me-2"></i>Application Status</strong>
                                <p class="mb-0 mt-1">
                                    Submitted ${daysWaiting} day${daysWaiting !== 1 ? 's' : ''} ago
                                    ${volunteer.document_status !== 'complete' 
                                        ? ` • Missing documents: ${volunteer.missing_documents.join(', ')}`
                                        : ' • All documents submitted'}
                                </p>
                            </div>
                            <div class="col-md-4 text-md-end">
                                ${documentStatus}
                            </div>
                        </div>
                    </div>

                    <!-- Personal Information -->
                    <div class="section-header-gradient mb-3">
                        <i class="bi bi-person-fill"></i>
                        <span>Personal Information 👤📋</span>
                    </div>
                    <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <label class="text-muted small">Volunteer ID</label>
                            <div class="fw-semibold">${volunteer.volunteer_id}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">Full Name</label>
                            <div class="fw-semibold">${volunteer.full_name}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">Gender</label>
                            <div class="fw-semibold text-capitalize">${volunteer.gender}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">ID Type</label>
                            <div class="fw-semibold">${volunteer.id_type === 'ic' ? 'IC' : 'Passport'}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">${volunteer.id_type === 'ic' ? 'IC Number' : 'Passport Number'}</label>
                            <div class="fw-semibold">${volunteer.ic_number || volunteer.passport_number || 'N/A'}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">Date of Birth</label>
                            <div class="fw-semibold">${TempleCore.formatDate ? TempleCore.formatDate(volunteer.date_of_birth) : volunteer.date_of_birth}${volunteer.age ? ` (Age: ${volunteer.age})` : ''}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">Marital Status</label>
                            <div class="fw-semibold text-capitalize">${volunteer.marital_status || 'Not specified'}</div>
                        </div>
                    </div>

                    <!-- Contact Information -->
                    <div class="section-header-gradient mb-3">
                        <i class="bi bi-telephone-fill"></i>
                        <span>Contact Information 📞✉️</span>
                    </div>
                    <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <label class="text-muted small">Mobile</label>
                            <div class="fw-semibold">
                                <i class="bi bi-telephone text-primary me-2"></i>${volunteer.mobile_primary}
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="text-muted small">Email</label>
                            <div class="fw-semibold">
                                ${volunteer.email 
                                    ? `<i class="bi bi-envelope text-primary me-2"></i>${volunteer.email}`
                                    : '<span class="text-muted">Not provided</span>'}
                            </div>
                        </div>
                        <div class="col-md-12">
                            <label class="text-muted small">Address</label>
                            <div class="fw-semibold">
                                ${volunteer.address || 'Not provided'}<br>
                                ${volunteer.city ? volunteer.city + ', ' : ''}${volunteer.state || ''} ${volunteer.postal_code || ''}<br>
                                ${volunteer.country || ''}
                            </div>
                        </div>
                        <div class="col-md-12">
                            <label class="text-muted small">Emergency Contact</label>
                            <div class="fw-semibold">
                                ${volunteer.emergency_contact_name 
                                    ? `${volunteer.emergency_contact_name} (${volunteer.emergency_contact_relationship}) - ${volunteer.emergency_contact_phone}`
                                    : '<span class="text-muted">Not provided</span>'}
                            </div>
                        </div>
                    </div>

                    <!-- Background & Preferences -->
                    <div class="section-header-gradient mb-3">
                        <i class="bi bi-stars"></i>
                        <span>Background & Preferences ⭐💼</span>
                    </div>
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="text-muted small">Languages Spoken</label>
                            <div class="fw-semibold">
                                ${volunteer.languages_spoken && volunteer.languages_spoken.length > 0
                                    ? volunteer.languages_spoken.join(', ')
                                    : '<span class="text-muted">Not specified</span>'}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="text-muted small">Preferred Department</label>
                            <div class="fw-semibold">
                                ${volunteer.preferred_department 
                                    ? `<span class="badge bg-info">${volunteer.preferred_department.department_name}</span>`
                                    : '<span class="text-muted">Not specified</span>'}
                            </div>
                        </div>
                        <div class="col-md-12">
                            <label class="text-muted small">Skills & Strengths</label>
                            <div class="fw-semibold">${volunteer.skills_strengths || '<span class="text-muted">Not provided</span>'}</div>
                        </div>
                        <div class="col-md-6">
                            <label class="text-muted small">Past Volunteer Experience</label>
                            <div class="fw-semibold">
                                ${volunteer.past_volunteer_experience 
                                    ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Yes</span>'
                                    : '<span class="badge bg-secondary">No</span>'}
                            </div>
                        </div>
                        <div class="col-md-12">
                            <label class="text-muted small">Physical/Medical Limitations</label>
                            <div class="fw-semibold">${volunteer.physical_limitations || '<span class="text-muted">None reported</span>'}</div>
                        </div>
                    </div>

                    <!-- Documents -->
                    <div class="section-header-gradient mb-3">
                        <i class="bi bi-file-earmark-text-fill"></i>
                        <span>Uploaded Documents 📄📎</span>
                    </div>
                    <div class="row g-3 mb-4">
                        ${this.renderDocumentsList(volunteer.documents, volunteer.id_type)}
                    </div>

                    <!-- Approval History -->
                    ${volunteer.approval_logs && volunteer.approval_logs.length > 0 
                        ? `<div class="section-header-gradient mb-3">
                                <i class="bi bi-clock-history"></i>
                                <span>Approval History 🕒📝</span>
                           </div>
                           <div class="list-group mb-4">
                                ${this.renderApprovalHistory(volunteer.approval_logs)}
                           </div>`
                        : ''}
                </div>
            `;
            
            $('#volunteerDetailsContent').html(html);
        },
        
        renderDocumentsList: function(documents, idType) {
            const requiredDocs = {
                'ic_photostat': 'IC Photostat',
                'passport_photo': 'Passport Photo',
            };
            
            if (idType === 'passport') {
                requiredDocs['passport_photostat'] = 'Passport Photostat';
            }
            
            let html = '';
            
            for (const [docType, docLabel] of Object.entries(requiredDocs)) {
                const doc = documents.find(d => d.document_type === docType);
                
                if (doc) {
                    html += `
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="bi bi-file-earmark-check text-success" style="font-size: 2rem;"></i>
                                    <h6 class="mt-2 mb-1">${docLabel}</h6>
                                    <small class="text-muted">${doc.file_name}</small><br>
                                    <a href="${doc.file_url || '#'}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">
                                        <i class="bi bi-download me-1"></i>View/Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="col-md-4">
                            <div class="card border-danger">
                                <div class="card-body text-center">
                                    <i class="bi bi-file-earmark-x text-danger" style="font-size: 2rem;"></i>
                                    <h6 class="mt-2 mb-1 text-danger">${docLabel}</h6>
                                    <small class="text-danger">Not uploaded</small>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            
            return html;
        },
        
        renderApprovalHistory: function(logs) {
            return logs.map(log => {
                const formattedDate = TempleCore.formatDate ? TempleCore.formatDate(log.created_at) : log.created_at;
                return `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">
                                    <span class="badge bg-${this.getActionBadgeColor(log.action)}">
                                        ${log.action.replace('_', ' ').toUpperCase()}
                                    </span>
                                </h6>
                                <p class="mb-1">${log.remarks || 'No remarks'}</p>
                                <small class="text-muted">
                                    ${log.approver ? log.approver.name : 'System'} • ${formattedDate}
                                </small>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        getActionBadgeColor: function(action) {
            const colors = {
                'approved': 'success',
                'rejected': 'danger',
                'requested_resubmission': 'warning',
                'suspended': 'dark',
                'reactivated': 'info'
            };
            return colors[action] || 'secondary';
        },
        
        showApproveModal: function(id) {
            console.log('✅ Showing approve modal for:', id);
            this.currentVolunteer = { id: id };
            
            // Reset form
            $('#approveRemarks').val('');
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('approveModal'));
            modal.show();
        },
        
        showRejectModal: function(id) {
            console.log('❌ Showing reject modal for:', id);
            this.currentVolunteer = { id: id };
            
            // Reset form
            $('#rejectReason').val('').removeClass('is-invalid');
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('rejectModal'));
            modal.show();
        },
        
        showResubmissionModal: function(id) {
            console.log('🔄 Showing resubmission modal for:', id);
            this.currentVolunteer = { id: id };
            
            // Reset form
            $('#resubmissionRemarks').val('').removeClass('is-invalid');
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('resubmissionModal'));
            modal.show();
        },
        
        confirmApprove: async function() {
            const id = this.currentVolunteer.id;
            const remarks = $('#approveRemarks').val().trim();
            
            console.log('✅ Confirming approval for:', id);
            
            const $approveBtn = $('#btnConfirmApprove');
            const originalText = $approveBtn.html();
            $approveBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Approving...');
            
            try {
                const response = await TempleAPI.post(`/volunteers/approval/${id}/approve`, {
                    remarks: remarks || null
                });
                
                if (response.success) {
                    console.log('✅ Approval successful:', response);
                    
                    TempleCore.showToast('Volunteer approved successfully! Status is now ACTIVE.', 'success');
                    
                    // Hide modal
                    $('#approveModal').modal('hide');
                    
                    // Reload queue
                    this.loadApprovalQueue();
                } else {
                    throw new Error(response.message || 'Failed to approve volunteer');
                }
            } catch (error) {
                console.error('❌ Approval error:', error);
                
                let errorMessage = 'Failed to approve volunteer';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                $approveBtn.prop('disabled', false).html(originalText);
            }
        },
        
        confirmReject: async function() {
            const id = this.currentVolunteer.id;
            const reason = $('#rejectReason').val().trim();
            
            // Validate reason
            if (!reason) {
                $('#rejectReason').addClass('is-invalid');
                TempleCore.showToast('Please provide a rejection reason', 'error');
                return;
            }
            
            console.log('❌ Confirming rejection for:', id);
            
            const $rejectBtn = $('#btnConfirmReject');
            const originalText = $rejectBtn.html();
            $rejectBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Rejecting...');
            
            try {
                const response = await TempleAPI.post(`/volunteers/approval/${id}/reject`, {
                    reason: reason
                });
                
                if (response.success) {
                    console.log('✅ Rejection successful:', response);
                    
                    TempleCore.showToast('Volunteer application rejected', 'success');
                    
                    // Hide modal
                    $('#rejectModal').modal('hide');
                    
                    // Reload queue
                    this.loadApprovalQueue();
                } else {
                    throw new Error(response.message || 'Failed to reject volunteer');
                }
            } catch (error) {
                console.error('❌ Rejection error:', error);
                
                let errorMessage = 'Failed to reject volunteer';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                $rejectBtn.prop('disabled', false).html(originalText);
            }
        },
        
        confirmResubmission: async function() {
            const id = this.currentVolunteer.id;
            const remarks = $('#resubmissionRemarks').val().trim();
            
            // Validate remarks
            if (!remarks) {
                $('#resubmissionRemarks').addClass('is-invalid');
                TempleCore.showToast('Please specify what needs to be resubmitted', 'error');
                return;
            }
            
            console.log('🔄 Requesting resubmission for:', id);
            
            const $resubmitBtn = $('#btnConfirmResubmission');
            const originalText = $resubmitBtn.html();
            $resubmitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Sending...');
            
            try {
                const response = await TempleAPI.post(`/volunteers/approval/${id}/request-resubmission`, {
                    remarks: remarks
                });
                
                if (response.success) {
                    console.log('✅ Resubmission request sent:', response);
                    
                    TempleCore.showToast('Resubmission request sent successfully', 'success');
                    
                    // Hide modal
                    $('#resubmissionModal').modal('hide');
                    
                    // Reload queue
                    this.loadApprovalQueue();
                } else {
                    throw new Error(response.message || 'Failed to request resubmission');
                }
            } catch (error) {
                console.error('❌ Resubmission request error:', error);
                
                let errorMessage = 'Failed to request resubmission';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                TempleCore.showToast(errorMessage, 'error');
                $resubmitBtn.prop('disabled', false).html(originalText);
            }
        },
        
        startPendingCountRefresh: function() {
            console.log('⏰ Starting pending count auto-refresh');
            
            // Refresh every 2 minutes
            const interval = setInterval(() => {
                this.loadApprovalQueue();
            }, 120000);
            
            this.intervals.push(interval);
        }
    };
    
    console.log('✅ VolunteersApprovalQueuePage module loaded');
    
})(jQuery, window);