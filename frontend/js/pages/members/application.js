// frontend/js/pages/members/application.js
// Member Application Management - List & Overview with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    window.MembersApplicationPage = {
        currentUser: null,
        applications: [],
        memberTypes: [],
        currentPage: 1,
        perPage: 20,
        totalPages: 1,
        filters: {
            search: '',
            status: '',
            member_type_id: '',
            from_date: '',
            to_date: '',
            referral_verified: ''
        },
        selectedApplications: [],
        
        // Initialize page
        init: function(params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.bindEvents();
            this.loadInitialData();
            this.initAnimations();
        },
        
        // Initialize GSAP & AOS animations
        initAnimations: function() {
            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: false,
                    mirror: true
                });
            }
            
            // GSAP: Animate page header on load
            gsap.from('.page-header', {
                duration: 0.6,
                y: -30,
                opacity: 0,
                ease: 'power2.out'
            });
            
            // GSAP: Animate stats cards
            gsap.from('.stats-card', {
                duration: 0.5,
                scale: 0.9,
                opacity: 0,
                stagger: 0.1,
                ease: 'back.out(1.7)',
                delay: 0.2
            });
            
            // GSAP: Animate filter section
            gsap.from('.filter-section', {
                duration: 0.5,
                x: -50,
                opacity: 0,
                ease: 'power2.out',
                delay: 0.4
            });
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="members-application-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-file-earmark-person"></i> Member Applications
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
                                        <li class="breadcrumb-item active">Applications</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-primary" id="newApplicationBtn">
                                    <i class="bi bi-plus-circle"></i> New Application
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3" data-aos="fade-up" data-aos-delay="0">
                            <div class="stats-card card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted small mb-1">Total Applications</p>
                                            <h3 class="mb-0" id="statTotal">0</h3>
                                        </div>
                                        <div class="stats-icon bg-primary bg-opacity-10 text-primary">
                                            <i class="bi bi-file-earmark-text fs-3"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3" data-aos="fade-up" data-aos-delay="100">
                            <div class="stats-card card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted small mb-1">Pending Review</p>
                                            <h3 class="mb-0" id="statPending">0</h3>
                                        </div>
                                        <div class="stats-icon bg-warning bg-opacity-10 text-warning">
                                            <i class="bi bi-clock-history fs-3"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3" data-aos="fade-up" data-aos-delay="200">
                            <div class="stats-card card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted small mb-1">Approved</p>
                                            <h3 class="mb-0 text-success" id="statApproved">0</h3>
                                        </div>
                                        <div class="stats-icon bg-success bg-opacity-10 text-success">
                                            <i class="bi bi-check-circle fs-3"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3" data-aos="fade-up" data-aos-delay="300">
                            <div class="stats-card card border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted small mb-1">Rejected</p>
                                            <h3 class="mb-0 text-danger" id="statRejected">0</h3>
                                        </div>
                                        <div class="stats-icon bg-danger bg-opacity-10 text-danger">
                                            <i class="bi bi-x-circle fs-3"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="row">
                        <!-- Filters Sidebar -->
                        <div class="col-md-3 mb-4">
                            <div class="filter-section card border-0 shadow-sm" data-aos="fade-right">
                                <div class="card-body">
                                    <h5 class="mb-4">
                                        <i class="bi bi-funnel"></i> Filters
                                        <button class="btn btn-sm btn-link float-end" id="clearFiltersBtn">Clear</button>
                                    </h5>
                                    
                                    <!-- Search -->
                                    <div class="mb-3">
                                        <label class="form-label small">Search</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                                            <input type="text" class="form-control" id="searchInput" placeholder="Name, Email, Temp ID...">
                                        </div>
                                    </div>

                                    <!-- Status Filter -->
                                    <div class="mb-3">
                                        <label class="form-label small">Status</label>
                                        <select class="form-select" id="statusFilter">
                                            <option value="">All Status</option>
                                            <option value="PENDING_SUBMISSION">Pending Submission</option>
                                            <option value="SUBMITTED">Submitted</option>
                                            <option value="UNDER_VERIFICATION">Under Verification</option>
                                            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                                            <option value="PENDING_APPROVAL">Pending Approval</option>
                                            <option value="APPROVED">Approved</option>
                                            <option value="REJECTED">Rejected</option>
                                        </select>
                                    </div>

                                    <!-- Member Type Filter -->
                                    <div class="mb-3">
                                        <label class="form-label small">Member Type</label>
                                        <select class="form-select" id="memberTypeFilter">
                                            <option value="">All Types</option>
                                        </select>
                                    </div>

                                    <!-- Referral Verified Filter -->
                                    <div class="mb-3">
                                        <label class="form-label small">Referral Status</label>
                                        <select class="form-select" id="referralVerifiedFilter">
                                            <option value="">All</option>
                                            <option value="verified">Both Verified</option>
                                            <option value="partial">Partially Verified</option>
                                            <option value="not_verified">Not Verified</option>
                                        </select>
                                    </div>

                                    <!-- Date Range -->
                                    <div class="mb-3">
                                        <label class="form-label small">From Date</label>
                                        <input type="date" class="form-control" id="fromDateFilter">
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label small">To Date</label>
                                        <input type="date" class="form-control" id="toDateFilter">
                                    </div>

                                    <button class="btn btn-primary w-100" id="applyFiltersBtn">
                                        <i class="bi bi-funnel"></i> Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Applications List -->
                        <div class="col-md-9">
                            <div class="card border-0 shadow-sm" data-aos="fade-left">
                                <div class="card-header bg-white border-0">
                                    <div class="row align-items-center">
                                        <div class="col-md-6">
                                            <h5 class="mb-0">Applications List</h5>
                                        </div>
                                        <div class="col-md-6 text-end">
                                            <div class="btn-group btn-group-sm" role="group">
                                                <button type="button" class="btn btn-outline-secondary active" id="viewGridBtn">
                                                    <i class="bi bi-grid"></i>
                                                </button>
                                                <button type="button" class="btn btn-outline-secondary" id="viewListBtn">
                                                    <i class="bi bi-list"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <!-- Loading State -->
                                    <div id="loadingState" class="text-center py-5" style="display: none;">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="mt-3 text-muted">Loading applications...</p>
                                    </div>

                                    <!-- Empty State -->
                                    <div id="emptyState" class="text-center py-5" style="display: none;">
                                        <i class="bi bi-inbox fs-1 text-muted"></i>
                                        <h5 class="mt-3">No Applications Found</h5>
                                        <p class="text-muted">Start by creating a new application</p>
                                        <button class="btn btn-primary" onclick="MembersApplicationPage.createNewApplication()">
                                            <i class="bi bi-plus-circle"></i> New Application
                                        </button>
                                    </div>

                                    <!-- Applications Container -->
                                    <div id="applicationsContainer"></div>

                                    <!-- Pagination -->
                                    <div id="paginationContainer" class="mt-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modals -->
                ${this.getModalsHTML()}

                <!-- Custom Styles -->
                <style>
                    .stats-card {
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }
                    
                    .stats-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                    }
                    
                    .stats-icon {
                        width: 60px;
                        height: 60px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 12px;
                    }
                    
                    .application-card {
                        transition: all 0.3s ease;
                        cursor: pointer;
                        border: 1px solid #e0e0e0;
                    }
                    
                    .application-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
                        border-color: var(--bs-primary);
                    }
                    
                    .status-badge {
                        font-size: 0.75rem;
                        padding: 0.35rem 0.75rem;
                        border-radius: 20px;
                        font-weight: 500;
                    }
                    
                    .referral-indicator {
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                        font-size: 0.8rem;
                    }
                    
                    .filter-section {
                        position: sticky;
                        top: 20px;
                    }
                    
                    .application-avatar {
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 2px solid #e0e0e0;
                    }
                    
                    .timeline-badge {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        display: inline-block;
                        margin-right: 5px;
                    }
                    
                    .timeline-badge.success { background-color: #28a745; }
                    .timeline-badge.warning { background-color: #ffc107; }
                    .timeline-badge.danger { background-color: #dc3545; }
                    .timeline-badge.info { background-color: #17a2b8; }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Get modals HTML
        getModalsHTML: function() {
            return `
                <!-- Application Details Modal -->
                <div class="modal fade" id="applicationDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Application Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="applicationDetailsBody">
                                <!-- Details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="viewFullApplicationBtn">
                                    <i class="bi bi-eye"></i> View Full Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // New Application button
            $('#newApplicationBtn').on('click', function() {
                self.createNewApplication();
            });
            
            // Filter buttons
            $('#applyFiltersBtn').on('click', function() {
                self.applyFilters();
            });
            
            $('#clearFiltersBtn').on('click', function() {
                self.clearFilters();
            });
            
            // Search with debounce
            let searchTimeout;
            $('#searchInput').on('keyup', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function() {
                    self.filters.search = $('#searchInput').val();
                    self.loadApplications();
                }, 500);
            });
            
            // View toggle
            $('#viewGridBtn').on('click', function() {
                $(this).addClass('active');
                $('#viewListBtn').removeClass('active');
                self.renderApplications('grid');
            });
            
            $('#viewListBtn').on('click', function() {
                $(this).addClass('active');
                $('#viewGridBtn').removeClass('active');
                self.renderApplications('list');
            });
        },
        
        // Load initial data
        loadInitialData: function() {
            this.loadMemberTypes();
            this.loadApplications();
            this.loadStatistics();
        },
        
        // Load member types for filter
        loadMemberTypes: function() {
            const self = this;
            
            TempleAPI.get('/member-types')
                .done(function(response) {
                    if (response.success) {
                        self.memberTypes = response.data;
                        
                        let options = '<option value="">All Types</option>';
                        response.data.forEach(function(type) {
                            options += `<option value="${type.id}">${type.display_name}</option>`;
                        });
                        
                        $('#memberTypeFilter').html(options);
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load member types:', xhr);
                });
        },
        
        // Load applications
        loadApplications: function(page = 1) {
            const self = this;
            this.currentPage = page;
            
            $('#loadingState').show();
            $('#emptyState').hide();
            $('#applicationsContainer').hide();
            
            const params = {
                page: page,
                per_page: this.perPage,
                ...this.filters
            };
            
            TempleAPI.get('/member-applications', params)
                .done(function(response) {
                    if (response.success) {
                        self.applications = response.data.data || response.data;
                        self.totalPages = response.data.last_page || 1;
                        
                        if (self.applications.length === 0) {
                            $('#loadingState').hide();
                            $('#emptyState').show();
                        } else {
                            $('#loadingState').hide();
                            $('#emptyState').hide();
                            $('#applicationsContainer').show();
                            self.renderApplications('grid');
                            self.renderPagination();
                        }
                    }
                })
                .fail(function(xhr) {
                    $('#loadingState').hide();
                    TempleCore.showToast('Failed to load applications', 'error');
                })
                .always(function() {
                    // Refresh AOS
                    if (typeof AOS !== 'undefined') {
                        AOS.refresh();
                    }
                });
        },
        
        // Load statistics
        loadStatistics: function() {
            const self = this;
            
            TempleAPI.get('/member-applications/statistics')
                .done(function(response) {
                    if (response.success) {
                        const stats = response.data;
                        
                        // Animate counters
                        self.animateCounter('#statTotal', stats.total || 0);
                        self.animateCounter('#statPending', stats.pending || 0);
                        self.animateCounter('#statApproved', stats.approved || 0);
                        self.animateCounter('#statRejected', stats.rejected || 0);
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load statistics:', xhr);
                });
        },
        
        // Animate counter with GSAP
        animateCounter: function(selector, endValue) {
            const obj = { value: 0 };
            gsap.to(obj, {
                duration: 1.5,
                value: endValue,
                roundProps: "value",
                ease: "power2.out",
                onUpdate: function() {
                    $(selector).text(obj.value);
                }
            });
        },
        
        // Render applications in grid or list view
        renderApplications: function(view = 'grid') {
            const self = this;
            let html = '';
            
            if (view === 'grid') {
                html = '<div class="row">';
                this.applications.forEach(function(app, index) {
                    html += self.getApplicationCardHTML(app, index);
                });
                html += '</div>';
            } else {
                html = self.getApplicationListHTML();
            }
            
            $('#applicationsContainer').html(html);
            
            // Bind card click events
            $('.application-card').on('click', function() {
                const appId = $(this).data('id');
                self.viewApplication(appId);
            });
            
            // GSAP: Animate cards
            gsap.from('.application-card', {
                duration: 0.5,
                y: 30,
                opacity: 0,
                stagger: 0.05,
                ease: 'power2.out'
            });
        },
        
        // Get application card HTML
        getApplicationCardHTML: function(app, index) {
            const statusConfig = this.getStatusConfig(app.status);
            const referralStatus = this.getReferralStatus(app);
            const photoUrl = app.profile_photo || '/images/default-avatar.png';
            
            return `
                <div class="col-md-6 col-lg-4 mb-3" data-aos="fade-up" data-aos-delay="${index * 50}">
                    <div class="application-card card h-100" data-id="${app.id}">
                        <div class="card-body">
                            <!-- Header -->
                            <div class="d-flex align-items-start mb-3">
                                <img src="${photoUrl}" alt="${app.name}" class="application-avatar me-3">
                                <div class="flex-grow-1">
                                    <h6 class="mb-1">${app.name}</h6>
                                    <small class="text-muted">${app.temp_member_id}</small>
                                </div>
                                <span class="status-badge ${statusConfig.class}">
                                    ${statusConfig.label}
                                </span>
                            </div>
                            
                            <!-- Details -->
                            <div class="mb-3">
                                <p class="mb-1 small">
                                    <i class="bi bi-envelope text-muted"></i> ${app.email}
                                </p>
                                <p class="mb-1 small">
                                    <i class="bi bi-phone text-muted"></i> ${app.mobile_no}
                                </p>
                                <p class="mb-1 small">
                                    <i class="bi bi-calendar text-muted"></i> ${this.formatDate(app.created_at)}
                                </p>
                            </div>
                            
                            <!-- Referral Status -->
                            <div class="mb-3">
                                <small class="text-muted d-block mb-1">Referral Verification:</small>
                                ${referralStatus.html}
                            </div>
                            
                            <!-- Actions -->
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="event.stopPropagation(); MembersApplicationPage.viewApplication('${app.id}')">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                ${app.status === 'SUBMITTED' || app.status === 'UNDER_VERIFICATION' ? `
                                    <button class="btn btn-sm btn-outline-success" onclick="event.stopPropagation(); MembersApplicationPage.verifyApplication('${app.id}')">
                                        <i class="bi bi-check-circle"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Get application list HTML (table view)
        getApplicationListHTML: function() {
            const self = this;
            let html = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Temp ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Status</th>
                                <th>Referrals</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            this.applications.forEach(function(app) {
                const statusConfig = self.getStatusConfig(app.status);
                const referralStatus = self.getReferralStatus(app);
                
                html += `
                    <tr class="application-row" data-id="${app.id}">
                        <td><strong>${app.temp_member_id}</strong></td>
                        <td>${app.name}</td>
                        <td>${app.email}</td>
                        <td>${app.mobile_no}</td>
                        <td><span class="status-badge ${statusConfig.class}">${statusConfig.label}</span></td>
                        <td>${referralStatus.html}</td>
                        <td>${self.formatDate(app.created_at)}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="MembersApplicationPage.viewApplication('${app.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${app.status === 'SUBMITTED' || app.status === 'UNDER_VERIFICATION' ? `
                                    <button class="btn btn-outline-success" onclick="MembersApplicationPage.verifyApplication('${app.id}')">
                                        <i class="bi bi-check-circle"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            return html;
        },
        
        // Get status configuration
        getStatusConfig: function(status) {
            const configs = {
                'PENDING_SUBMISSION': { label: 'Draft', class: 'bg-secondary text-white' },
                'SUBMITTED': { label: 'Submitted', class: 'bg-info text-white' },
                'UNDER_VERIFICATION': { label: 'Verifying', class: 'bg-warning text-dark' },
                'INTERVIEW_SCHEDULED': { label: 'Interview', class: 'bg-primary text-white' },
                'PENDING_APPROVAL': { label: 'Pending Approval', class: 'bg-warning text-dark' },
                'APPROVED': { label: 'Approved', class: 'bg-success text-white' },
                'REJECTED': { label: 'Rejected', class: 'bg-danger text-white' }
            };
            
            return configs[status] || { label: status, class: 'bg-secondary text-white' };
        },
        
        // Get referral status
        getReferralStatus: function(app) {
            const ref1 = app.referral_1_verified;
            const ref2 = app.referral_2_verified;
            
            if (ref1 && ref2) {
                return {
                    html: '<span class="referral-indicator text-success"><i class="bi bi-check-circle-fill"></i> Both Verified</span>',
                    status: 'verified'
                };
            } else if (ref1 || ref2) {
                return {
                    html: '<span class="referral-indicator text-warning"><i class="bi bi-exclamation-circle-fill"></i> Partially Verified</span>',
                    status: 'partial'
                };
            } else {
                return {
                    html: '<span class="referral-indicator text-danger"><i class="bi bi-x-circle-fill"></i> Not Verified</span>',
                    status: 'not_verified'
                };
            }
        },
        
        // Render pagination
        renderPagination: function() {
            const self = this;
            let html = '';
            
            if (this.totalPages > 1) {
                html = '<nav><ul class="pagination justify-content-center">';
                
                // Previous button
                html += `
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
                    </li>
                `;
                
                // Page numbers
                for (let i = 1; i <= this.totalPages; i++) {
                    if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                        html += `
                            <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `;
                    } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                    }
                }
                
                // Next button
                html += `
                    <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
                    </li>
                `;
                
                html += '</ul></nav>';
            }
            
            $('#paginationContainer').html(html);
            
            // Bind pagination events
            $('.pagination .page-link').on('click', function(e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && page !== self.currentPage) {
                    self.loadApplications(page);
                }
            });
        },
        
        // Apply filters
        applyFilters: function() {
            this.filters.status = $('#statusFilter').val();
            this.filters.member_type_id = $('#memberTypeFilter').val();
            this.filters.referral_verified = $('#referralVerifiedFilter').val();
            this.filters.from_date = $('#fromDateFilter').val();
            this.filters.to_date = $('#toDateFilter').val();
            
            this.loadApplications(1);
            
            // Animate filter application
            gsap.from('#applicationsContainer', {
                duration: 0.3,
                opacity: 0,
                y: 20
            });
        },
        
        // Clear filters
        clearFilters: function() {
            this.filters = {
                search: '',
                status: '',
                member_type_id: '',
                from_date: '',
                to_date: '',
                referral_verified: ''
            };
            
            $('#searchInput').val('');
            $('#statusFilter').val('');
            $('#memberTypeFilter').val('');
            $('#referralVerifiedFilter').val('');
            $('#fromDateFilter').val('');
            $('#toDateFilter').val('');
            
            this.loadApplications(1);
        },
        
        // Create new application
        createNewApplication: function() {
            TempleRouter.navigate('members/application-form');
        },
        
        // View application details
        viewApplication: function(applicationId) {
            TempleRouter.navigate('members/application-view', { id: applicationId });
        },
        
        // Verify application (admin)
        verifyApplication: function(applicationId) {
            TempleRouter.navigate('members/application-verify', { id: applicationId });
        },
        
        // Format date
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },
        
        // Check permission
        hasPermission: function(permission) {
            const user = this.currentUser;
            
            if (user.user_type === 'SUPER_ADMIN') return true;
            if (user.user_type === 'ADMIN') return true;
            
            return user.permissions && user.permissions.includes(permission);
        }
    };
    
})(jQuery, window);