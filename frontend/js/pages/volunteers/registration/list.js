// js/pages/volunteers/registration/list.js
// Volunteer Registration List Page - WITH APPROVAL MODAL
// Enhanced view modal with status update functionality

(function ($, window) {
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

            getActivePages: function () {
                return Array.from(this.activePages);
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
    // VOLUNTEERS REGISTRATION LIST PAGE
    // ========================================
    window.VolunteersRegistrationListPage = {
        pageId: 'volunteers-registration-list',
        eventNamespace: window.VolunteersSharedModule.eventNamespace,
        currentPage: 1,
        perPage: 15,
        filters: {
            search: '',
            status: '',
            department_id: '',
            gender: '',
            from_date: '',
            to_date: ''
        },
        dataTable: null,
        debounceTimer: null,
        currentVolunteerModal: null,

        init: function (params) {
            console.log('🚀 Initializing Volunteer Registration List Page');

            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);

            // Render HTML first
            this.render();

            // Initialize animations
            this.initAnimations();

            // Setup event listeners
            this.setupEventListeners();

            // Load data
            this.loadDepartments();
            this.loadVolunteers();
            this.loadStatistics();

            console.log('✅ Registration List Page Initialized');
        },

        initAnimations: function () {
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
            }

            console.log('✅ Animations initialized');
        },

        render: function () {
            console.log('📝 Rendering Volunteer Registration List Page HTML');

            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-people-fill volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Volunteer Registration</h1>
                                            <p class="volunteers-subtitle">义工注册 • Manage Volunteer Applications</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="createVolunteerBtn">
                                        <i class="bi bi-plus-circle me-2"></i>
                                        New Registration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row g-3 mb-4" data-aos="fade-up" data-aos-delay="100">
                        <div class="col-md-3">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Total Volunteers</p>
                                            <h3 class="mb-0" id="totalVolunteers">0</h3>
                                        </div>
                                        <i class="bi bi-people fs-1 text-primary opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Active</p>
                                            <h3 class="mb-0 text-success" id="activeVolunteers">0</h3>
                                        </div>
                                        <i class="bi bi-check-circle fs-1 text-success opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Pending</p>
                                            <h3 class="mb-0 text-warning" id="pendingVolunteers">0</h3>
                                        </div>
                                        <i class="bi bi-clock-history fs-1 text-warning opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">This Month</p>
                                            <h3 class="mb-0 text-info" id="thisMonthVolunteers">0</h3>
                                        </div>
                                        <i class="bi bi-calendar-plus fs-1 text-info opacity-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Card -->
                    <div class="card shadow-sm volunteers-content-card" data-aos="fade-up" data-aos-delay="200">
                        <div class="card-body p-4">
                            <!-- Filters Section -->
                            <div class="filters-section mb-4" data-aos="fade-up" data-aos-delay="300">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-search me-2 text-primary"></i>Search
                                        </label>
                                        <input type="text" class="form-control" id="searchInput" 
                                               placeholder="Name, IC, Mobile...">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-funnel me-2 text-primary"></i>Status
                                        </label>
                                        <select class="form-select" id="statusFilter">
                                            <option value="">All Status</option>
                                            <option value="pending_approval">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-diagram-3 me-2 text-primary"></i>Department
                                        </label>
                                        <select class="form-select" id="departmentFilter">
                                            <option value="">All Departments</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-gender-ambiguous me-2 text-primary"></i>Gender
                                        </label>
                                        <select class="form-select" id="genderFilter">
                                            <option value="">All</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold">
                                            <i class="bi bi-calendar-range me-2 text-primary"></i>Date Range
                                        </label>
                                        <div class="input-group input-group-sm">
                                            <input type="date" class="form-control" id="fromDate">
                                            <span class="input-group-text">to</span>
                                            <input type="date" class="form-control" id="toDate">
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-12 text-end">
                                        <button class="btn btn-outline-secondary btn-sm" id="clearFiltersBtn">
                                            <i class="bi bi-x-circle me-2"></i>Clear
                                        </button>
                                        <button class="btn btn-primary btn-sm" id="refreshBtn">
                                            <i class="bi bi-arrow-clockwise me-2"></i>Refresh
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Volunteers Table -->
                            <div class="table-container" data-aos="fade-up" data-aos-delay="400">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle" id="volunteersTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th><i class="bi bi-person-badge me-2"></i>Volunteer</th>
                                                <th><i class="bi bi-card-text me-2"></i>ID Number</th>
                                                <th><i class="bi bi-telephone me-2"></i>Mobile</th>
                                                <th><i class="bi bi-gender-ambiguous me-2"></i>Gender/Age</th>
                                                <th><i class="bi bi-building me-2"></i>Department</th>
                                                <th><i class="bi bi-calendar-event me-2"></i>Registered</th>
                                                <th class="text-center"><i class="bi bi-toggle-on me-2"></i>Status</th>
                                                <th class="text-center"><i class="bi bi-file-earmark me-2"></i>Docs</th>
                                                <th class="text-center" width="120">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="volunteersTableBody">
                                            <tr>
                                                <td colspan="9" class="text-center py-5">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2 text-muted">Loading volunteers...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Pagination -->
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div class="text-muted small" id="tableInfo"></div>
                                <div id="paginationContainer"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Toast Container -->
                <div class="toast-container position-fixed bottom-0 end-0 p-3" id="toastContainer"></div>
            `;

            $('#page-container').html(html);
            console.log('✅ HTML rendered successfully');
        },

        setupEventListeners: function () {
            const self = this;
            const ns = '.' + this.eventNamespace;

            console.log('🔗 Binding event listeners');

            // Search input with debounce
            $(document).on('input' + ns, '#searchInput', function (e) {
                self.filters.search = e.target.value;
                self.debounce(() => self.loadVolunteers(), 500);
            });

            // Filter changes
            $(document).on('change' + ns, '#statusFilter', function (e) {
                self.filters.status = e.target.value;
                self.loadVolunteers();
            });

            $(document).on('change' + ns, '#departmentFilter', function (e) {
                self.filters.department_id = e.target.value;
                self.loadVolunteers();
            });

            $(document).on('change' + ns, '#genderFilter', function (e) {
                self.filters.gender = e.target.value;
                self.loadVolunteers();
            });

            $(document).on('change' + ns, '#fromDate, #toDate', function () {
                self.filters.from_date = $('#fromDate').val();
                self.filters.to_date = $('#toDate').val();
                self.loadVolunteers();
            });

            // Buttons
            $(document).on('click' + ns, '#clearFiltersBtn', function () {
                self.clearFilters();
            });

            $(document).on('click' + ns, '#createVolunteerBtn', function (e) {
                e.preventDefault();
                TempleRouter.navigate('volunteers/registration/create');
            });

            $(document).on('click' + ns, '#refreshBtn', function () {
                self.loadVolunteers();
                self.loadStatistics();
            });

            console.log('✅ Event listeners bound');
        },

        clearFilters: function () {
            this.filters = {
                search: '',
                status: '',
                department_id: '',
                gender: '',
                from_date: '',
                to_date: ''
            };

            $('#searchInput').val('');
            $('#statusFilter').val('');
            $('#departmentFilter').val('');
            $('#genderFilter').val('');
            $('#fromDate').val('');
            $('#toDate').val('');

            this.loadVolunteers();
        },

        loadDepartments: async function () {
            console.log('📡 Loading departments');

            try {
                const response = await TempleAPI.get('/volunteers/departments/active');

                if (response.success && response.data) {
                    console.log(`✅ Loaded ${response.data.length} departments`);
                    this.renderDepartmentFilter(response.data);
                }
            } catch (error) {
                console.error('❌ Error loading departments:', error);
            }
        },

        renderDepartmentFilter: function (departments) {
            const select = $('#departmentFilter');
            select.empty();
            select.append('<option value="">All Departments</option>');

            departments.forEach(dept => {
                select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
            });
        },

        loadVolunteers: async function () {
            console.log('📡 Loading volunteers');

            try {
                const params = {
                    page: this.currentPage,
                    per_page: this.perPage
                };

                // Add filters
                if (this.filters.search) params.search = this.filters.search;
                if (this.filters.status) params.status = this.filters.status;
                if (this.filters.department_id) params.department_id = this.filters.department_id;
                if (this.filters.gender) params.gender = this.filters.gender;
                if (this.filters.from_date) params.from_date = this.filters.from_date;
                if (this.filters.to_date) params.to_date = this.filters.to_date;

                console.log('🔍 Request params:', params);

                const response = await TempleAPI.get('/volunteers/registration', params);

                if (response.success) {
                    console.log(`✅ Loaded ${response.data.length} volunteers`);
                    this.renderTable(response.data);
                    if (response.pagination) {
                        this.renderPagination(response.pagination);
                    }
                } else {
                    throw new Error(response.message || 'Failed to load volunteers');
                }
            } catch (error) {
                console.error('❌ Error loading volunteers:', error);

                let errorMessage = 'Failed to load volunteers';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }

                TempleCore.showToast(errorMessage, 'error');
                this.renderTable([]);
            }
        },

        renderTable: function (volunteers) {
            console.log('📊 Rendering table with', volunteers.length, 'volunteers');

            // Destroy existing DataTable
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            const tbody = $('#volunteersTableBody');
            tbody.empty();

            if (volunteers.length === 0) {
                tbody.append(`
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                            <p class="text-muted mb-3">No volunteers found</p>
                            <button class="btn btn-primary btn-create-first">
                                <i class="bi bi-plus-circle me-2"></i>Create First Volunteer
                            </button>
                        </td>
                    </tr>
                `);

                // Bind the button in empty state
                const self = this;
                $('.btn-create-first').on('click', function (e) {
                    e.preventDefault();
                    TempleRouter.navigate('volunteers/registration/create');
                });
                return;
            }

            const self = this;
            volunteers.forEach(volunteer => {
                const statusBadge = self.getStatusBadge(volunteer.status, volunteer.status_label);
                const documentsStatus = volunteer.has_required_documents
                    ? '<span class="badge bg-success">✓</span>'
                    : '<span class="badge bg-warning">!</span>';

                const age = volunteer.age || 'N/A';
                const department = volunteer.preferred_department?.department_name || 'Not set';
                const registeredDate = new Date(volunteer.registered_at).toLocaleDateString('en-GB');

                tbody.append(`
                    <tr data-id="${volunteer.id}">
                        <td>
            <div class="fw-bold">${volunteer.volunteer_id}</div>
            <small class="text-muted">${volunteer.full_name}</small>
            ${volunteer.full_name_en ? `<br><small class="text-muted fst-italic">${volunteer.full_name_en}</small>` : ''}
        </td>
                        <td><small>${volunteer.ic_number || volunteer.passport_number}</small></td>
                        <td><small>${volunteer.mobile_primary}</small></td>
                        <td>
                            <span class="badge bg-${volunteer.gender === 'male' ? 'primary' : 'danger'} badge-sm">
                                ${volunteer.gender.toUpperCase()}
                            </span>
                            <div class="small text-muted">${age} yrs</div>
                        </td>
                        <td><small>${department}</small></td>
                        <td><small>${registeredDate}</small></td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">${documentsStatus}</td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-info btn-view" data-id="${volunteer.id}" title="View & Manage">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${volunteer.status === 'pending_approval' ? `
                                <button class="btn btn-warning btn-edit" data-id="${volunteer.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                ` : ''}
                                ${volunteer.status === 'pending_approval' || volunteer.status === 'rejected' ? `
                                <button class="btn btn-danger btn-delete" data-id="${volunteer.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `);
            });

            // Bind action buttons
            $('.btn-view').on('click', function () {
                self.viewVolunteer($(this).data('id'));
            });
            $('.btn-edit').on('click', function () {
                self.editVolunteer($(this).data('id'));
            });
            $('.btn-delete').on('click', function () {
                self.deleteVolunteer($(this).data('id'));
            });

            // Initialize DataTable
            try {
                this.dataTable = $('#volunteersTable').DataTable({
                    paging: false,
                    searching: false,
                    info: false,
                    ordering: true,
                    order: [[5, 'desc']],
                    columnDefs: [
                        { orderable: false, targets: [7, 8] }
                    ]
                });
                console.log('✅ DataTable initialized');
            } catch (error) {
                console.error('❌ DataTable error:', error);
            }
        },

        renderPagination: function (pagination) {
            const container = $('#paginationContainer');
            container.empty();

            // Update info text
            const start = (pagination.current_page - 1) * pagination.per_page + 1;
            const end = Math.min(start + pagination.per_page - 1, pagination.total);
            $('#tableInfo').text(`Showing ${start} to ${end} of ${pagination.total} volunteers`);

            if (pagination.last_page <= 1) return;

            let html = '<nav><ul class="pagination pagination-sm mb-0">';

            // Previous
            html += `
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `;

            // Pages
            for (let i = 1; i <= pagination.last_page; i++) {
                if (
                    i === 1 ||
                    i === pagination.last_page ||
                    (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)
                ) {
                    html += `
                        <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
                    html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                }
            }

            // Next
            html += `
                <li class="page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

            html += '</ul></nav>';
            container.html(html);

            // Click handlers
            const self = this;
            container.find('a.page-link').on('click', function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && page !== self.currentPage) {
                    self.currentPage = page;
                    self.loadVolunteers();
                }
            });
        },

        loadStatistics: async function () {
            console.log('📡 Loading statistics');

            try {
                const response = await TempleAPI.get('/volunteers/registration/statistics/overview');

                if (response.success) {
                    console.log('✅ Statistics loaded');
                    this.renderStatistics(response.data);
                }
            } catch (error) {
                console.error('❌ Error loading statistics:', error);
            }
        },

        renderStatistics: function (stats) {
            $('#totalVolunteers').text(stats.total || 0);
            $('#activeVolunteers').text(stats.active || 0);
            $('#pendingVolunteers').text(stats.pending_approval || 0);
            $('#thisMonthVolunteers').text(stats.this_month || 0);
        },

        // ========================================
        // VIEW VOLUNTEER WITH APPROVAL ACTIONS
        // ========================================
        viewVolunteer: async function (id) {
            console.log('👁️ Viewing volunteer:', id);

            try {
                const response = await TempleAPI.get(`/volunteers/registration/${id}`);

                if (response.success) {
                    this.currentVolunteerModal = response.data;
                    this.renderVolunteerModal(response.data);
                } else {
                    throw new Error(response.message || 'Failed to load volunteer');
                }
            } catch (error) {
                console.error('❌ Error:', error);
                TempleCore.showToast('Error loading volunteer details', 'error');
            }
        },

renderVolunteerModal: function (volunteer) {
    const self = this;

    // Get action buttons based on status
    const actionButtons = this.getActionButtons(volunteer.status, volunteer.id);

    const modalHtml = `
        <div class="modal fade" id="viewVolunteerModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                  <div class="modal-header bg-primary text-white">
    <h5 class="modal-title">
        <i class="bi bi-person-badge me-2"></i>${volunteer.volunteer_id} - ${volunteer.display_name || volunteer.full_name}
    </h5>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
</div>
                    <div class="modal-body">
                        <!-- Status Badges -->
                        <div class="mb-4">
                            ${this.getStatusBadge(volunteer.status, volunteer.status_label)}
                            ${volunteer.has_required_documents
                                ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle me-1"></i>Docs Complete</span>'
                                : '<span class="badge bg-warning ms-2"><i class="bi bi-exclamation-circle me-1"></i>Docs Incomplete</span>'}
                        </div>

                        <!-- Personal Information -->
                        <h6 class="fw-bold mb-3 text-primary">
                            <i class="bi bi-person me-2"></i>Personal Information
                        </h6>
                        <div class="row mb-4">
                           <div class="col-md-6 mb-3">
        <small class="text-muted d-block mb-1">Full Name (Chinese):</small>
        <div class="fw-semibold">${volunteer.full_name}</div>
    </div>
    ${volunteer.full_name_en ? `
    <div class="col-md-6 mb-3">
        <small class="text-muted d-block mb-1">Full Name (English):</small>
        <div class="fw-semibold text-muted">${volunteer.full_name_en}</div>
    </div>
    ` : ''}
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Gender:</small>
                                <div class="fw-semibold">
                                    <span class="badge bg-${volunteer.gender === 'male' ? 'primary' : 'danger'}">
                                        ${volunteer.gender.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Date of Birth:</small>
                                <div class="fw-semibold">
                                    ${new Date(volunteer.date_of_birth).toLocaleDateString('en-GB')} 
                                    <span class="text-muted">(${volunteer.age} years old)</span>
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">ID Type:</small>
                                <div class="fw-semibold">${volunteer.id_type === 'ic' ? 'IC Number' : 'Passport'}</div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">ID Number:</small>
                                <div class="fw-semibold">${volunteer.ic_number || volunteer.passport_number}</div>
                            </div>
                            ${volunteer.marital_status ? `
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Marital Status:</small>
                                <div class="fw-semibold text-capitalize">${volunteer.marital_status}</div>
                            </div>
                            ` : ''}
                        </div>

                        <hr class="my-4">

                        <!-- Contact Information -->
                        <h6 class="fw-bold mb-3 text-primary">
                            <i class="bi bi-telephone me-2"></i>Contact Information
                        </h6>
                        <div class="row mb-4">
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Mobile:</small>
                                <div class="fw-semibold">
                                    <i class="bi bi-phone text-success me-2"></i>${volunteer.mobile_primary}
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Email:</small>
                                <div class="fw-semibold">
                                    ${volunteer.email ? `<i class="bi bi-envelope text-primary me-2"></i>${volunteer.email}` : '<span class="text-muted">Not provided</span>'}
                                </div>
                            </div>
                            ${volunteer.address ? `
                            <div class="col-12 mb-3">
                                <small class="text-muted d-block mb-1">Address:</small>
                                <div class="fw-semibold">
                                    <i class="bi bi-geo-alt text-danger me-2"></i>${volunteer.formatted_address || volunteer.address}
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        ${volunteer.emergency_contact_name ? `
                        <div class="alert alert-info border-info">
                            <h6 class="fw-bold mb-2">
                                <i class="bi bi-person-exclamation me-2"></i>Emergency Contact
                            </h6>
                            <div class="row">
                                <div class="col-md-4">
                                    <small class="text-muted">Name:</small>
                                    <div class="fw-semibold">${volunteer.emergency_contact_name}</div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Relationship:</small>
                                    <div class="fw-semibold">${volunteer.emergency_contact_relationship || 'N/A'}</div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Phone:</small>
                                    <div class="fw-semibold">${volunteer.emergency_contact_phone || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <hr class="my-4">

                        <!-- Preferences -->
                        <h6 class="fw-bold mb-3 text-primary">
                            <i class="bi bi-heart me-2"></i>Volunteer Preferences
                        </h6>
                        <div class="row mb-4">
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Preferred Department:</small>
                                <div class="fw-semibold">
                                    ${volunteer.preferred_department?.department_name || '<span class="text-muted">Not specified</span>'}
                                </div>
                            </div>
                            ${volunteer.languages_spoken && volunteer.languages_spoken.length > 0 ? `
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Languages Spoken:</small>
                                <div>
                                    ${volunteer.languages_spoken.map(lang => 
                                        `<span class="badge bg-secondary me-1">${lang}</span>`
                                    ).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${volunteer.skills_strengths ? `
                            <div class="col-12 mb-3">
                                <small class="text-muted d-block mb-1">Skills & Strengths:</small>
                                <div class="fw-semibold">${volunteer.skills_strengths}</div>
                            </div>
                            ` : ''}
                            ${volunteer.physical_limitations ? `
                            <div class="col-12 mb-3">
                                <small class="text-muted d-block mb-1">Physical Limitations:</small>
                                <div class="fw-semibold text-warning">
                                    <i class="bi bi-exclamation-triangle me-2"></i>${volunteer.physical_limitations}
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <hr class="my-4">

                        <!-- Documents Section with Thumbnails -->
                        <h6 class="fw-bold mb-3 text-primary">
                            <i class="bi bi-file-earmark me-2"></i>Documents
                        </h6>
                        <div class="row">
                            ${volunteer.documents && volunteer.documents.length > 0 ?
                                volunteer.documents.map(doc => {
                                    const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(doc.mime_type);
                                    const isPdf = doc.mime_type === 'application/pdf';
                                    
                                    return `
                                        <div class="col-md-2 mb-3">
                                            <div class="card h-100 shadow-sm document-card">
                                                ${isImage ? `
                                                    <img src="${doc.file_display_url}" 
                                                         class="card-img-top document-thumbnail" 
                                                         style="height: 180px; object-fit: cover; cursor: pointer;"
                                                         data-doc-id="${doc.id}"
                                                         alt="${doc.file_name}">
                                                ` : isPdf ? `
                                                    <div class="card-img-top bg-light d-flex align-items-center justify-content-center document-thumbnail" 
                                                         style="height: 180px; cursor: pointer;"
                                                         data-doc-id="${doc.id}">
                                                        <i class="bi bi-file-pdf display-1 text-danger"></i>
                                                    </div>
                                                ` : `
                                                    <div class="card-img-top bg-light d-flex align-items-center justify-content-center" 
                                                         style="height: 180px;">
                                                        <i class="bi bi-file-earmark display-1 text-muted"></i>
                                                    </div>
                                                `}
                                                <div class="card-body p-3">
                                                    <div class="fw-bold mb-1">${this.getDocumentLabel(doc.document_type)}</div>
                                                    <div class="text-muted small text-truncate mb-2" title="${doc.file_name}">
                                                        ${doc.file_name}
                                                    </div>
                                                   
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('') :
                                '<div class="col-12"><div class="alert alert-warning"><i class="bi bi-inbox me-2"></i>No documents uploaded</div></div>'
                            }
                        </div>

                        <hr class="my-4">

                        <!-- Registration Details -->
                        <h6 class="fw-bold mb-3 text-primary">
                            <i class="bi bi-calendar-event me-2"></i>Registration Details
                        </h6>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Registered On:</small>
                                <div class="fw-semibold">
                                    ${new Date(volunteer.registered_at).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            ${volunteer.approved_at ? `
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Approved On:</small>
                                <div class="fw-semibold text-success">
                                    ${new Date(volunteer.approved_at).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            ` : ''}
                            ${volunteer.approved_by ? `
                            <div class="col-md-6 mb-3">
                                <small class="text-muted d-block mb-1">Approved By:</small>
                                <div class="fw-semibold">${volunteer.approved_by.name}</div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Rejection/Suspension Reason -->
                        ${volunteer.status === 'rejected' && volunteer.rejection_reason ? `
                        <div class="alert alert-danger mt-3">
                            <h6 class="fw-bold mb-2"><i class="bi bi-x-circle me-2"></i>Rejection Reason</h6>
                            <p class="mb-0">${volunteer.rejection_reason}</p>
                        </div>
                        ` : ''}
                        ${volunteer.status === 'suspended' && volunteer.suspension_reason ? `
                        <div class="alert alert-warning mt-3">
                            <h6 class="fw-bold mb-2"><i class="bi bi-pause-circle me-2"></i>Suspension Reason</h6>
                            <p class="mb-0">${volunteer.suspension_reason}</p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Close
                        </button>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal
    $('#viewVolunteerModal').remove();
    $('body').append(modalHtml);

    const modal = new bootstrap.Modal(document.getElementById('viewVolunteerModal'));

    // Bind all modal buttons
    this.bindModalButtons(volunteer.id);

    // Show modal
    modal.show();
},


        // Get action buttons based on volunteer status
        getActionButtons: function (status, volunteerId) {
            let buttons = '';

            switch (status) {
                case 'pending_approval':
                    buttons = `
                        <button type="button" class="btn btn-success btn-approve" data-id="${volunteerId}">
                            <i class="bi bi-check-circle me-2"></i>Approve
                        </button>
                        <button type="button" class="btn btn-danger btn-reject" data-id="${volunteerId}">
                            <i class="bi bi-x-circle me-2"></i>Reject
                        </button>
                        <button type="button" class="btn btn-warning btn-edit" data-id="${volunteerId}">
                            <i class="bi bi-pencil me-2"></i>Edit
                        </button>
                    `;
                    break;

                case 'active':
                    buttons = `
                        <button type="button" class="btn btn-warning btn-suspend" data-id="${volunteerId}">
                            <i class="bi bi-pause-circle me-2"></i>Suspend
                        </button>
                    `;
                    break;

                case 'suspended':
                    buttons = `
                        <button type="button" class="btn btn-success btn-reactivate" data-id="${volunteerId}">
                            <i class="bi bi-play-circle me-2"></i>Reactivate
                        </button>
                    `;
                    break;

                case 'rejected':
                    // No action buttons for rejected
                    break;
            }

            return buttons;
        },

        // Bind all modal button events
        bindModalButtons: function (volunteerId) {
            const self = this;

            // Download document
            $('.btn-download').on('click', function () {
                self.viewDocument($(this).data('id'));
            });
            // Edit button
            $('.btn-edit').on('click', function () {
                $('#viewVolunteerModal').modal('hide');
                self.editVolunteer(volunteerId);
            });
            $('.btn-view-doc').on('click', function () {
                self.viewDocument($(this).data('id'));
            });
            // Approve button
            $('.btn-approve').on('click', function () {
                self.approveVolunteer(volunteerId);
            });

            // Reject button
            $('.btn-reject').on('click', function () {
                self.rejectVolunteer(volunteerId);
            });

            // Suspend button
            $('.btn-suspend').on('click', function () {
                self.suspendVolunteer(volunteerId);
            });

            // Reactivate button
            $('.btn-reactivate').on('click', function () {
                self.reactivateVolunteer(volunteerId);
            });
        },
        viewDocument: async function (documentId) {
            try {
                // Find the document from current modal data
                const document = this.currentVolunteerModal.documents.find(d => d.id === documentId);

                if (!document) {
                    TempleCore.showToast('Document not found', 'error');
                    return;
                }

                // Get the display URL (already has signed URL)
                const fileUrl = document.file_display_url;

                // Determine file type
                const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(document.mime_type);
                const isPdf = document.mime_type === 'application/pdf';

                let viewerContent = '';

                if (isImage) {
                    viewerContent = `
                <div class="text-center">
                    <img src="${fileUrl}" 
                         class="img-fluid" 
                         style="max-height: 70vh; object-fit: contain;"
                         alt="${document.file_name}">
                </div>
            `;
                } else if (isPdf) {
                    viewerContent = `
                <iframe src="${fileUrl}" 
                        style="width: 100%; height: 70vh; border: none;"
                        title="${document.file_name}">
                </iframe>
            `;
                } else {
                    viewerContent = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    This file type cannot be previewed. 
                    <a href="${fileUrl}" target="_blank" class="alert-link">Open in new tab</a>
                </div>
            `;
                }

                // Create viewer modal
                const viewerModal = `
            <div class="modal fade" id="documentViewerModal" tabindex="-1">
                <div class="modal-dialog modal-xl modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-file-earmark-text me-2"></i>${document.file_name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            ${viewerContent}
                        </div>
                        <div class="modal-footer">
                            <a href="${fileUrl}" 
                               target="_blank" 
                               class="btn btn-primary">
                                <i class="bi bi-box-arrow-up-right me-2"></i>Open in New Tab
                            </a>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

                // Remove existing viewer modal
                $('#documentViewerModal').remove();

                // Add new viewer modal
                $('body').append(viewerModal);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('documentViewerModal'));
                modal.show();

            } catch (error) {
                console.error('❌ Error viewing document:', error);
                TempleCore.showToast('Error viewing document', 'error');
            }
        },
        // ========================================
        // APPROVAL ACTIONS
        // ========================================

        approveVolunteer: async function (id) {
            const self = this;

            if (!confirm('Are you sure you want to approve this volunteer?\n\nThey will be granted Active status and can be assigned tasks.')) {
                return;
            }

            try {
                // Show loading on button
                $('.btn-approve').prop('disabled', true)
                    .html('<span class="spinner-border spinner-border-sm me-2"></span>Approving...');

                const response = await TempleAPI.post(`/volunteers/approval/${id}/approve`, {});

                if (response.success) {
                    TempleCore.showToast('Volunteer approved successfully!', 'success');

                    // Hide modal
                    $('#viewVolunteerModal').modal('hide');

                    // Reload data
                    this.loadVolunteers();
                    this.loadStatistics();
                } else {
                    throw new Error(response.message || 'Failed to approve volunteer');
                }
            } catch (error) {
                console.error('❌ Approval error:', error);
                const errorMsg = error.responseJSON?.message || error.message || 'Failed to approve volunteer';
                TempleCore.showToast(errorMsg, 'error');

                // Reset button
                $('.btn-approve').prop('disabled', false)
                    .html('<i class="bi bi-check-circle me-2"></i>Approve');
            }
        },

        rejectVolunteer: async function (id) {
            const self = this;

            // Prompt for rejection reason
            const reason = prompt('Please provide a reason for rejection:');
            if (!reason || reason.trim() === '') {
                TempleCore.showToast('Rejection reason is required', 'error');
                return;
            }

            try {
                // Show loading on button
                $('.btn-reject').prop('disabled', true)
                    .html('<span class="spinner-border spinner-border-sm me-2"></span>Rejecting...');

                const response = await TempleAPI.post(`/volunteers/approval/${id}/reject`, {
                    reason: reason.trim()
                });

                if (response.success) {
                    TempleCore.showToast('Volunteer rejected', 'info');

                    // Hide modal
                    $('#viewVolunteerModal').modal('hide');

                    // Reload data
                    this.loadVolunteers();
                    this.loadStatistics();
                } else {
                    throw new Error(response.message || 'Failed to reject volunteer');
                }
            } catch (error) {
                console.error('❌ Rejection error:', error);
                const errorMsg = error.responseJSON?.message || error.message || 'Failed to reject volunteer';
                TempleCore.showToast(errorMsg, 'error');

                // Reset button
                $('.btn-reject').prop('disabled', false)
                    .html('<i class="bi bi-x-circle me-2"></i>Reject');
            }
        },

        suspendVolunteer: async function (id) {
            const self = this;

            // Prompt for suspension reason
            const reason = prompt('Please provide a reason for suspension:');
            if (!reason || reason.trim() === '') {
                TempleCore.showToast('Suspension reason is required', 'error');
                return;
            }

            try {
                // Show loading on button
                $('.btn-suspend').prop('disabled', true)
                    .html('<span class="spinner-border spinner-border-sm me-2"></span>Suspending...');

                const response = await TempleAPI.post(`/volunteers/approval/${id}/suspend`, {
                    reason: reason.trim()
                });

                if (response.success) {
                    TempleCore.showToast('Volunteer suspended', 'warning');

                    // Hide modal
                    $('#viewVolunteerModal').modal('hide');

                    // Reload data
                    this.loadVolunteers();
                    this.loadStatistics();
                } else {
                    throw new Error(response.message || 'Failed to suspend volunteer');
                }
            } catch (error) {
                console.error('❌ Suspension error:', error);
                const errorMsg = error.responseJSON?.message || error.message || 'Failed to suspend volunteer';
                TempleCore.showToast(errorMsg, 'error');

                // Reset button
                $('.btn-suspend').prop('disabled', false)
                    .html('<i class="bi bi-pause-circle me-2"></i>Suspend');
            }
        },

        reactivateVolunteer: async function (id) {
            const self = this;

            if (!confirm('Reactivate this suspended volunteer?')) {
                return;
            }

            try {
                // Show loading on button
                $('.btn-reactivate').prop('disabled', true)
                    .html('<span class="spinner-border spinner-border-sm me-2"></span>Reactivating...');

                const response = await TempleAPI.post(`/volunteers/approval/${id}/reactivate`, {});

                if (response.success) {
                    TempleCore.showToast('Volunteer reactivated successfully!', 'success');

                    // Hide modal
                    $('#viewVolunteerModal').modal('hide');

                    // Reload data
                    this.loadVolunteers();
                    this.loadStatistics();
                } else {
                    throw new Error(response.message || 'Failed to reactivate volunteer');
                }
            } catch (error) {
                console.error('❌ Reactivation error:', error);
                const errorMsg = error.responseJSON?.message || error.message || 'Failed to reactivate volunteer';
                TempleCore.showToast(errorMsg, 'error');

                // Reset button
                $('.btn-reactivate').prop('disabled', false)
                    .html('<i class="bi bi-play-circle me-2"></i>Reactivate');
            }
        },

        // ========================================
        // OTHER ACTIONS
        // ========================================

        editVolunteer: function (id) {
            console.log('✏️ Edit volunteer:', id);
            this.cleanup();
            TempleRouter.navigate('volunteers/registration/edit', { id: id });
        },

        deleteVolunteer: async function (id) {
            if (!confirm('Delete this volunteer registration? This action cannot be undone.')) return;

            try {
                const response = await TempleAPI.delete(`/volunteers/registration/${id}`);

                if (response.success) {
                    TempleCore.showToast('Volunteer deleted', 'success');
                    this.loadVolunteers();
                    this.loadStatistics();
                } else {
                    throw new Error(response.message || 'Failed to delete');
                }
            } catch (error) {
                console.error('❌ Delete error:', error);
                TempleCore.showToast('Error deleting volunteer', 'error');
            }
        },

        downloadDocument: function (documentId) {
            window.open(`/api/volunteers/documents/${documentId}/download`, '_blank');
        },

        getStatusBadge: function (status, label) {
            const colors = {
                'pending_approval': 'warning',
                'active': 'success',
                'rejected': 'danger',
                'suspended': 'secondary',
                'inactive': 'dark'
            };
            return `<span class="badge bg-${colors[status] || 'secondary'}">${label || status}</span>`;
        },

        getDocumentLabel: function (type) {
            const labels = {
                'ic_photostat': 'IC Copy',
                'passport_photo': 'Photo',
                'passport_photostat': 'Passport',
                'other': 'Other'
            };
            return labels[type] || type;
        },

        debounce: function (func, wait) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(func, wait);
        },

        cleanup: function () {
            console.log(`🧹 Cleaning up ${this.pageId}`);

            window.VolunteersSharedModule.unregisterPage(this.pageId);

            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            $(document).off('.' + this.eventNamespace);

            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            $('#viewVolunteerModal').remove();

            console.log(`✅ ${this.pageId} cleaned up`);
        }
    };

    console.log('✅ VolunteersRegistrationListPage module loaded');

})(jQuery, window);