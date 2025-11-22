// js/pages/auspicious-light/registrations.js
// Pagoda Registrations Management - View and manage all registrations

(function ($, window) {
    'use strict';

    window.PagodaRegistrationsPage = {
        currentFilters: {},
        currentPage: 1,
        perPage: 25,

        // Initialize page
        init: function (params) {
            console.log('Initializing Pagoda Registrations Management');
            this.params = params || {};
            this.render();
            this.loadRegistrations();
            this.attachEvents();
        },

        // Cleanup function
        cleanup: function () {
            // Remove all event listeners
            $(document).off('shown.bs.tab', '#registrationsTabs button[data-bs-toggle="tab"]');
            $(document).off('click', '#btnApplyFilters');
            $(document).off('click', '#btnClearFilters');
            $(document).off('click', '#btnClearFiltersNoResults');
            $(document).off('click', '#btnResetFilters');
            $(document).off('keypress', '#searchInput');
            $(document).off('change', '#perPageSelect');
            $(document).off('click', '#paginationContainer .page-link');
            $(document).off('click', '.btn-view-reg');
            $(document).off('click', '.btn-renew-reg');
            $(document).off('click', '.btn-terminate-reg');
            $(document).off('click', '.btn-print-receipt');
            $(document).off('click', '#btnNewRegistration');
            $(document).off('click', '#btnExportRegistrations');

            // Remove any modals
            $('#registrationModal').remove();

            // Clear data
            this.currentFilters = {};
            this.currentPage = 1;
            this.perPage = 25;
        },

        // Render page structure
        render: function () {
            const html = `
                <div class="registrations-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4" data-aos="fade-down">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h1 class="page-title mb-2">
                                    <i class="bi bi-list-check me-2"></i>
                                    Registrations Management
                                </h1>
                                <p class="text-muted mb-0">登记管理 - View and manage all light registrations</p>
                            </div>
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <button class="btn btn-outline-secondary" id="btnResetFilters">
                                    <i class="bi bi-arrow-counterclockwise"></i> Reset
                                </button>
                                <button class="btn btn-outline-primary" id="btnExportRegistrations">
                                    <i class="bi bi-download"></i> Export
                                </button>
                                <button class="btn btn-success" id="btnNewRegistration">
                                    <i class="bi bi-plus-circle"></i> New Registration
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Stats -->
                    <div class="row g-3 mb-4" data-aos="fade-up">
                        <div class="col-6 col-lg-3">
                            <div class="card stat-card border-start border-success border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Active</p>
                                            <h3 class="mb-0" id="statActive">-</h3>
                                        </div>
                                        <i class="bi bi-check-circle text-success fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div class="card stat-card border-start border-warning border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Expiring Soon</p>
                                            <h3 class="mb-0" id="statExpiring">-</h3>
                                        </div>
                                        <i class="bi bi-exclamation-triangle text-warning fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div class="card stat-card border-start border-danger border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Expired</p>
                                            <h3 class="mb-0" id="statExpired">-</h3>
                                        </div>
                                        <i class="bi bi-x-circle text-danger fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div class="card stat-card border-start border-info border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">This Month</p>
                                            <h3 class="mb-0" id="statThisMonth">-</h3>
                                        </div>
                                        <i class="bi bi-calendar-check text-info fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs Navigation -->
                    <ul class="nav nav-tabs mb-3" id="registrationsTabs" role="tablist" data-aos="fade-up">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="all-tab" data-bs-toggle="tab" 
                                    data-bs-target="#all-registrations" type="button" role="tab">
                                <i class="bi bi-list-ul me-1"></i> All Registrations
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="active-tab" data-bs-toggle="tab" 
                                    data-bs-target="#active-registrations" type="button" role="tab">
                                <i class="bi bi-check-circle me-1"></i> Active
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="expiring-tab" data-bs-toggle="tab" 
                                    data-bs-target="#expiring-registrations" type="button" role="tab">
                                <i class="bi bi-exclamation-triangle me-1"></i> Expiring Soon
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="expired-tab" data-bs-toggle="tab" 
                                    data-bs-target="#expired-registrations" type="button" role="tab">
                                <i class="bi bi-clock-history me-1"></i> Expired
                            </button>
                        </li>
                    </ul>

                    <!-- Search & Filter -->
                    <div class="card mb-4" data-aos="fade-up">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="bi bi-funnel me-2"></i>
                                Search & Filter
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <!-- Search -->
                                <div class="col-md-3">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="searchInput" 
                                           placeholder="Receipt #, Name, NRIC...">
                                </div>

                                <!-- Date Range -->
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>

                                <!-- Status -->
                                <div class="col-md-2">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="terminated">Terminated</option>
                                        <option value="renewed">Renewed</option>
                                    </select>
                                </div>

                                <!-- Payment Method -->
                                <div class="col-md-3">
                                    <label class="form-label">Payment Method</label>
                                    <select class="form-select" id="filterPaymentMethod">
                                        <option value="">All Methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="online_banking">Online Banking</option>
                                        <option value="ewallet">E-Wallet</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row mt-3">
                                <div class="col-12">
                                    <button class="btn btn-primary" id="btnApplyFilters">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                    <button class="btn btn-outline-secondary ms-2" id="btnClearFilters">
                                        <i class="bi bi-x-circle"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Content -->
                    <div class="tab-content" id="registrationsTabContent">
                        <div class="tab-pane fade show active" id="all-registrations" role="tabpanel">
                            <div class="card" data-aos="fade-up">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="bi bi-list-ul me-2"></i>
                                        All Registrations
                                    </h5>
                                    <div class="d-flex align-items-center gap-3">
                                        <span class="text-muted" id="resultsCount">Loading...</span>
                                        <select class="form-select form-select-sm" id="perPageSelect" style="width: auto;">
                                            <option value="10">10 per page</option>
                                            <option value="25" selected>25 per page</option>
                                            <option value="50">50 per page</option>
                                            <option value="100">100 per page</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0" id="registrationsTable">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Receipt #</th>
                                                    <th>Devotee</th>
                                                    <th>Light</th>
                                                    <th>Offer Date</th>
                                                    <th>Expiry Date</th>
                                                    <th>Amount</th>
                                                    <th>Payment</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody id="registrationsTableBody">
                                                <tr>
                                                    <td colspan="9" class="text-center py-5">
                                                        <div class="spinner-border text-primary" role="status">
                                                            <span class="visually-hidden">Loading...</span>
                                                        </div>
                                                        <p class="mt-3 text-muted">Loading registrations...</p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="card-footer">
                                    <div id="paginationContainer"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            `;

            $('#page-container').html(html);

            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        },

        // Load registrations
        loadRegistrations: function () {
            const self = this;

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.currentFilters
            };

            TempleUtils.showLoading('Loading registrations...');

            // Load registrations
            PagodaAPI.registrations.getAll(params)
                .done(function (response) {
                    console.log('Registrations Response:', response);
                    if (response.success && response.data) {
                        self.renderRegistrationsTable(response.data);
                        self.renderPagination(response.data);
                    } else {
                        self.showNoResults();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load registrations:', xhr);
                    TempleUtils.handleAjaxError(xhr, 'Failed to load registrations');
                    self.showNoResults();
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });

            // Load statistics
            this.loadStatistics();
        },

        // Load statistics
        loadStatistics: function () {
            PagodaAPI.registrations.getStatistics()
                .done(function (response) {
                    console.log('Statistics Response:', response);
                    if (response.success && response.data) {
                        const stats = response.data;
                        // FIX: Use correct field names from API
                        $('#statActive').text(stats.active_registrations || 0);
                        $('#statExpiring').text(stats.expiring_in_30_days || 0);
                        $('#statExpired').text(stats.expired_registrations || 0);
                        $('#statThisMonth').text(stats.total_registrations || 0); // Use total as fallback
                    }
                })
                .fail(function (error) {
                    console.error('Statistics load error:', error);
                    // Set default values on error
                    $('#statActive, #statExpiring, #statExpired, #statThisMonth').text('0');
                });
        },

        // Render registrations table - FIXED DATA ACCESS
        renderRegistrationsTable: function (data) {
            const registrations = data.data || [];
            const total = data.total || 0;

            $('#resultsCount').text(`Showing ${registrations.length} of ${total} registrations`);

            if (registrations.length === 0) {
                this.showNoResults();
                return;
            }

            const rows = registrations.map(reg => {
                // FIXED: Safely access nested objects
                const lightCode = reg.light_code || reg.light?.light_code || 'N/A';
                const lightNumber = reg.light_number || reg.light?.light_number || '-';
                const devoteeName = reg.devotee?.name_english || reg.devotee_name_english || 'Unknown';
                const devoteeContact = reg.devotee?.contact_no || reg.devotee_contact_no || 'N/A';
                const paymentMethod = reg.payment_method || 'N/A';

                const statusBadge = this.getStatusBadge(reg.status);
                const daysRemaining = reg.days_until_expiry || 0;
                const expiryBadge = daysRemaining <= 7 ? 'text-danger fw-bold' :
                    daysRemaining <= 30 ? 'text-warning' : '';

                return `
                    <tr data-id="${reg.id}">
                        <td>
                            <span class="badge bg-secondary">${reg.receipt_number}</span>
                        </td>
                        <td>
                            <div>
                                <strong>${devoteeName}</strong>
                                <br>
                                <small class="text-muted">
                                    <i class="bi bi-telephone me-1"></i>${devoteeContact}
                                </small>
                            </div>
                        </td>
                        <td>
                            <code class="light-code">${lightCode}</code>
                            <br>
                            <small class="text-muted">#${lightNumber}</small>
                        </td>
                        <td class="text-center">
                            <small>${moment(reg.offer_date).format('DD/MM/YYYY')}</small>
                        </td>
                        <td class="text-center">
                            <small class="${expiryBadge}">${moment(reg.expiry_date).format('DD/MM/YYYY')}</small>
                            ${daysRemaining > 0 ? `<br><small class="text-muted">${daysRemaining} days</small>` : ''}
                        </td>
                        <td class="text-end">
                            <strong>SGD ${parseFloat(reg.merit_amount || 0).toFixed(2)}</strong>
                        </td>
                        <td>
                            <small class="text-capitalize">${paymentMethod.replace('_', ' ')}</small>
                        </td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-view-reg" 
                                        data-id="${reg.id}" title="View Details">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${reg.status === 'active' && daysRemaining <= 60 ? `
                                    <button class="btn btn-outline-success btn-renew-reg" 
                                            data-id="${reg.id}" title="Renew">
                                        <i class="bi bi-arrow-clockwise"></i>
                                    </button>
                                ` : ''}
                                ${reg.status === 'active' ? `
                                    <button class="btn btn-outline-danger btn-terminate-reg" 
                                            data-id="${reg.id}" title="Terminate">
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-secondary btn-print-receipt" 
                                        data-id="${reg.id}" title="Print Receipt">
                                    <i class="bi bi-printer"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            $('#registrationsTableBody').html(rows);
        },

        // Get status badge
        getStatusBadge: function (status) {
            const colors = {
                'active': 'success',
                'expired': 'warning',
                'terminated': 'danger',
                'renewed': 'info'
            };

            const color = colors[status] || 'secondary';
            const text = status.charAt(0).toUpperCase() + status.slice(1);

            return `<span class="badge bg-${color}">${text}</span>`;
        },

        // Show no results
        showNoResults: function () {
            $('#registrationsTableBody').html(`
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <i class="bi bi-inbox display-4 text-muted d-block mb-3"></i>
                        <p class="text-muted">No registrations found</p>
                        <button class="btn btn-sm btn-outline-primary" id="btnClearFiltersNoResults">
                            <i class="bi bi-arrow-counterclockwise"></i> Clear Filters
                        </button>
                    </td>
                </tr>
            `);

            $('#resultsCount').text('No results');
            $('#paginationContainer').empty();
        },

        // Render pagination
        renderPagination: function (data) {
            const totalPages = data.last_page || 1;
            const currentPage = data.current_page || 1;

            if (totalPages <= 1) {
                $('#paginationContainer').empty();
                return;
            }

            let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

            // Previous
            paginationHtml += `
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `;

            // Pages
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);

            if (startPage > 1) {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
                if (startPage > 2) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
            }

            // Next
            paginationHtml += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

            paginationHtml += '</ul></nav>';

            $('#paginationContainer').html(paginationHtml);
        },

        // Attach event handlers - USING DELEGATED EVENTS
        attachEvents: function () {
            const self = this;

            // Tab changes
            $(document).on('shown.bs.tab', '#registrationsTabs button[data-bs-toggle="tab"]', function (e) {
                const target = $(e.target).attr('data-bs-target');
                self.handleTabChange(target);
            });

            // Apply filters
            $(document).on('click', '#btnApplyFilters', function () {
                self.applyFilters();
            });

            // Clear filters
            $(document).on('click', '#btnClearFilters, #btnClearFiltersNoResults', function () {
                self.clearFilters();
            });

            // Reset filters
            $(document).on('click', '#btnResetFilters', function () {
                self.clearFilters();
            });

            // Search on Enter
            $(document).on('keypress', '#searchInput', function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            // Per page change
            $(document).on('change', '#perPageSelect', function () {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadRegistrations();
            });

            // Pagination
            $(document).on('click', '#paginationContainer .page-link', function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && !$(this).parent().hasClass('disabled')) {
                    self.currentPage = page;
                    self.loadRegistrations();
                    $('html, body').animate({ scrollTop: 0 }, 300);
                }
            });

            // View registration
            $(document).on('click', '.btn-view-reg', function () {
                const id = $(this).data('id');
                self.viewRegistration(id);
            });

            // Renew registration
            $(document).on('click', '.btn-renew-reg', function () {
                const id = $(this).data('id');
                self.renewRegistration(id);
            });

            // Terminate registration
            $(document).on('click', '.btn-terminate-reg', function () {
                const id = $(this).data('id');
                self.terminateRegistration(id);
            });

            // Print receipt
            $(document).on('click', '.btn-print-receipt', function () {
                const id = $(this).data('id');
                self.printReceipt(id);
            });

            // New registration
            $(document).on('click', '#btnNewRegistration', function () {
                TempleRouter.navigate('auspicious-light/entry');
            });

            // Export
            $(document).on('click', '#btnExportRegistrations', function () {
                self.exportRegistrations();
            });
        },

        // Handle tab change
        handleTabChange: function (target) {
            // Clear existing filters first
            this.currentFilters = {};

            // Update filters based on tab
            switch (target) {
                case '#active-registrations':
                    this.currentFilters.status = 'active';
                    console.log('Switching to Active tab with filter:', this.currentFilters);
                    break;
                case '#expiring-registrations':
                    this.currentFilters.expiring_within_days = 30;
                    console.log('Switching to Expiring tab with filter:', this.currentFilters);
                    break;
                case '#expired-registrations':
                    this.currentFilters.status = 'expired';
                    console.log('Switching to Expired tab with filter:', this.currentFilters);
                    break;
                default:
                    console.log('Switching to All tab - no filters');
            }

            this.currentPage = 1;
            this.loadRegistrations();
        },

        // Apply filters
        applyFilters: function () {
            this.currentFilters = {
                search: $('#searchInput').val().trim(),
                date_from: $('#filterDateFrom').val(),
                date_to: $('#filterDateTo').val(),
                status: $('#filterStatus').val(),
                payment_method: $('#filterPaymentMethod').val()
            };

            // Remove empty filters
            Object.keys(this.currentFilters).forEach(key => {
                if (!this.currentFilters[key]) {
                    delete this.currentFilters[key];
                }
            });

            this.currentPage = 1;
            this.loadRegistrations();
        },

        // Clear filters
        clearFilters: function () {
            $('#searchInput').val('');
            $('#filterDateFrom').val('');
            $('#filterDateTo').val('');
            $('#filterStatus').val('');
            $('#filterPaymentMethod').val('');

            this.currentFilters = {};
            this.currentPage = 1;
            this.loadRegistrations();
        },

        // View registration details
        viewRegistration: function (id) {
            const self = this;

            TempleUtils.showLoading('Loading registration details...');

            PagodaAPI.registrations.getById(id)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.showRegistrationModal(response.data);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load registration');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Show registration modal - FIXED DATA ACCESS
        showRegistrationModal: function (reg) {
            const self = this;

            // FIXED: Safely access nested objects
            const lightCode = reg.light_code || reg.light?.light_code || 'N/A';
            const lightNumber = reg.light_number || reg.light?.light_number || '-';
            const devoteeName = reg.devotee?.name_english || reg.devotee_name_english || 'Unknown';
            const devoteeChineseName = reg.devotee?.name_chinese || reg.devotee_name_chinese || '-';
            const devoteeNric = reg.devotee?.nric || reg.devotee_nric || 'N/A';
            const devoteeContact = reg.devotee?.contact_no || reg.devotee_contact_no || 'N/A';
            const devoteeEmail = reg.devotee?.email || reg.devotee_email || '-';
            const paymentMethod = reg.payment_method || 'N/A';
            const daysUntilExpiry = reg.days_until_expiry || 0;

            const modalHtml = `
                <div class="modal fade" id="registrationModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-receipt me-2"></i>
                                    Registration Details - ${reg.receipt_number}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-4">
                                    <!-- Registration Info -->
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-receipt me-2"></i>Registration Information
                                        </h6>
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <td class="text-muted" width="40%">Receipt Number:</td>
                                                <td><strong>${reg.receipt_number}</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Light Code:</td>
                                                <td><code class="light-code">${lightCode}</code></td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Light Number:</td>
                                                <td>${lightNumber}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Status:</td>
                                                <td>${this.getStatusBadge(reg.status)}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <!-- Devotee Info -->
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-person me-2"></i>Devotee Information
                                        </h6>
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <td class="text-muted" width="40%">Name (English):</td>
                                                <td><strong>${devoteeName}</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Name (Chinese):</td>
                                                <td>${devoteeChineseName}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">NRIC:</td>
                                                <td>${devoteeNric}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Contact:</td>
                                                <td>${devoteeContact}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Email:</td>
                                                <td>${devoteeEmail}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <!-- Payment Info -->
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-cash me-2"></i>Payment Information
                                        </h6>
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <td class="text-muted" width="40%">Merit Amount:</td>
                                                <td><strong class="text-success fs-5">SGD ${parseFloat(reg.merit_amount).toFixed(2)}</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Payment Method:</td>
                                                <td class="text-capitalize">${paymentMethod.replace('_', ' ')}</td>
                                            </tr>
                                            ${reg.payment_reference ? `
                                            <tr>
                                                <td class="text-muted">Reference:</td>
                                                <td>${reg.payment_reference}</td>
                                            </tr>
                                            ` : ''}
                                        </table>
                                    </div>
                                    
                                    <!-- Dates -->
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-calendar me-2"></i>Important Dates
                                        </h6>
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <td class="text-muted" width="40%">Offer Date:</td>
                                                <td>${moment(reg.offer_date).format('DD MMMM YYYY')}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Expiry Date:</td>
                                                <td>${moment(reg.expiry_date).format('DD MMMM YYYY')}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Days Until Expiry:</td>
                                                <td>
                                                    ${daysUntilExpiry > 0 ?
                    `<span class="badge bg-info">${daysUntilExpiry} days</span>` :
                    '<span class="badge bg-danger">Expired</span>'}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Registered On:</td>
                                                <td>${moment(reg.created_at).format('DD/MM/YYYY HH:mm')}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    ${reg.remarks ? `
                                    <!-- Remarks -->
                                    <div class="col-12">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-chat-left-text me-2"></i>Remarks
                                        </h6>
                                        <div class="alert alert-info mb-0">
                                            ${reg.remarks}
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-outline-primary" onclick="PagodaRegistrationsPage.printReceipt('${reg.id}')">
                                    <i class="bi bi-printer"></i> Print Receipt
                                </button>
                                ${reg.status === 'active' && daysUntilExpiry <= 60 ? `
                                    <button type="button" class="btn btn-success" onclick="PagodaRegistrationsPage.renewRegistration('${reg.id}')">
                                        <i class="bi bi-arrow-clockwise"></i> Renew
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#registrationModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('registrationModal'));
            modal.show();

            $('#registrationModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Renew registration
        renewRegistration: function (id) {
            const self = this;

            Swal.fire({
                title: 'Renew Registration',
                html: `
                    <div class="text-start">
                        <p>Renew this registration for another year?</p>
                        <div class="mb-3">
                            <label class="form-label">Merit Amount</label>
                            <select class="form-select" id="renewMeritAmount">
                                <option value="38">SGD 38</option>
                                <option value="60" selected>SGD 60</option>
                                <option value="100">SGD 100</option>
                                <option value="300">SGD 300</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Payment Method</label>
                            <select class="form-select" id="renewPaymentMethod">
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="online_banking">Online Banking</option>
                                <option value="ewallet">E-Wallet</option>
                            </select>
                        </div>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Renew',
                cancelButtonText: 'Cancel',
                preConfirm: () => {
                    return {
                        merit_amount: $('#renewMeritAmount').val(),
                        payment_method: $('#renewPaymentMethod').val()
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Processing renewal...');

                    PagodaAPI.registrations.renew(id, result.value)
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Registration renewed successfully');
                                self.loadRegistrations();
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to renew registration');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },

        // Terminate registration
        terminateRegistration: function (id) {
            const self = this;

            Swal.fire({
                title: 'Terminate Registration',
                html: `
                    <div class="text-start">
                        <p class="text-danger">This will permanently terminate this registration.</p>
                        <div class="mb-3">
                            <label class="form-label">Reason for Termination *</label>
                            <textarea class="form-control" id="terminationReason" rows="3" 
                                      placeholder="Enter reason for termination..." required></textarea>
                        </div>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Terminate',
                confirmButtonColor: '#dc3545',
                cancelButtonText: 'Cancel',
                preConfirm: () => {
                    const reason = $('#terminationReason').val().trim();
                    if (!reason) {
                        Swal.showValidationMessage('Please enter termination reason');
                        return false;
                    }
                    return reason;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Terminating registration...');

                    PagodaAPI.registrations.terminate(id, result.value)
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Registration terminated');
                                self.loadRegistrations();
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to terminate registration');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },
        // Print receipt
        printReceipt: function (id) {
            const self = this;

            TempleUtils.showLoading('Generating receipt...');

            PagodaAPI.registrations.getById(id)
                .done(function (response) {
                    console.log('Receipt data:', response);
                    if (response.success && response.data) {
                        self.generateReceiptHTML(response.data);
                    } else {
                        TempleUtils.showError('Failed to load receipt data');
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load receipt data');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        generateReceiptHTML: function (reg) {
            // DEBUG
            console.log('Generating receipt for:', reg);

            // Safely access data with better fallbacks
            const receiptNumber = reg.receipt_number || 'PENDING';
            const lightCode = reg.light_code || reg.light?.light_code || 'N/A';
            const lightNumber = reg.light_number || reg.light?.light_number || '-';
            const devoteeName = reg.devotee?.name_english || reg.devotee_name_english || 'Unknown';
            const devoteeChineseName = reg.devotee?.name_chinese || reg.devotee_name_chinese || '';
            const devoteeContact = reg.devotee?.contact_no || reg.devotee_contact_no || 'N/A';
            const paymentMethod = reg.payment_method || 'N/A';
            const staffName = reg.staff_name || 'Administrator';
            const meritAmount = reg.merit_amount || 0;

            const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt - ${receiptNumber}</title>
            <style>
                @media print {
                    @page { margin: 0; }
                    body { margin: 1cm; }
                }
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #000;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                }
                .header h2 {
                    margin: 5px 0;
                    font-size: 18px;
                    color: #666;
                }
                .receipt-info {
                    margin: 20px 0;
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #ddd;
                }
                .info-row:last-child {
                    border-bottom: none;
                }
                .label {
                    font-weight: bold;
                    color: #555;
                }
                .value {
                    color: #333;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-top: 20px;
                    margin-bottom: 10px;
                    color: #333;
                    border-bottom: 2px solid #666;
                    padding-bottom: 5px;
                }
                .amount {
                    font-size: 24px;
                    font-weight: bold;
                    color: #28a745;
                    text-align: center;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f0f9f4;
                    border-radius: 5px;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 2px solid #000;
                    padding-top: 20px;
                }
                .print-button {
                    text-align: center;
                    margin: 20px 0;
                }
                .print-button button {
                    padding: 10px 30px;
                    font-size: 16px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 0 5px;
                }
                .print-button button:hover {
                    background: #0056b3;
                }
                .print-button .btn-close {
                    background: #6c757d;
                }
                .print-button .btn-close:hover {
                    background: #5a6268;
                }
                @media print {
                    .print-button { display: none; }
                }
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>
        </head>
        <body>
            <div class="header">
                <h1>天后宫</h1>
                <h2>Thean Hou Temple</h2>
                <h2>Pagoda Auspicious Light Registration Receipt</h2>
                <h2>平安灯登记收据</h2>
            </div>

            <div class="receipt-info">
                <div class="info-row">
                    <span class="label">Receipt Number:</span>
                    <span class="value"><strong>${receiptNumber}</strong></span>
                </div>
                <div class="info-row">
                    <span class="label">Date Issued:</span>
                    <span class="value"><script>document.write(moment('${reg.created_at}').format('DD MMMM YYYY'))</script></span>
                </div>
                <div class="info-row">
                    <span class="label">Staff:</span>
                    <span class="value">${staffName}</span>
                </div>
            </div>

            <div class="section-title">Devotee Information / 信徒资料</div>
            <div class="receipt-info">
                <div class="info-row">
                    <span class="label">Name (English):</span>
                    <span class="value">${devoteeName}</span>
                </div>
                ${devoteeChineseName ? `
                <div class="info-row">
                    <span class="label">Name (Chinese):</span>
                    <span class="value">${devoteeChineseName}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="label">Contact Number:</span>
                    <span class="value">${devoteeContact}</span>
                </div>
            </div>

            <div class="section-title">Light Information / 灯位资料</div>
            <div class="receipt-info">
                <div class="info-row">
                    <span class="label">Light Code:</span>
                    <span class="value"><strong>${lightCode}</strong></span>
                </div>
                <div class="info-row">
                    <span class="label">Light Number:</span>
                    <span class="value">${lightNumber}</span>
                </div>
                <div class="info-row">
                    <span class="label">Light Option:</span>
                    <span class="value">${reg.light_option === 'new_light' ? 'New Light / 新灯' : 'Family Light / 全家灯'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Offer Date:</span>
                    <span class="value"><script>document.write(moment('${reg.offer_date}').format('DD MMMM YYYY'))</script></span>
                </div>
                <div class="info-row">
                    <span class="label">Expiry Date:</span>
                    <span class="value"><script>document.write(moment('${reg.expiry_date}').format('DD MMMM YYYY'))</script></span>
                </div>
            </div>

            <div class="section-title">Payment Information / 付款资料</div>
            <div class="receipt-info">
                <div class="info-row">
                    <span class="label">Payment Method:</span>
                    <span class="value">${paymentMethod.replace('_', ' ').toUpperCase()}</span>
                </div>
                ${reg.payment_reference ? `
                <div class="info-row">
                    <span class="label">Reference:</span>
                    <span class="value">${reg.payment_reference}</span>
                </div>
                ` : ''}
            </div>

            <div class="amount">
                Merit Amount / 功德金<br>
                SGD ${parseFloat(meritAmount).toFixed(2)}
            </div>

            ${reg.remarks ? `
            <div class="section-title">Remarks / 备注</div>
            <div class="receipt-info">
                <p style="margin: 0;">${reg.remarks}</p>
            </div>
            ` : ''}

            <div class="footer">
                <p>Thank you for your generous contribution!</p>
                <p>谢谢您的慷慨捐献!</p>
                <p style="margin-top: 15px;">
                    This is a computer-generated receipt. No signature required.<br>
                    For enquiries, please contact: +60 3-2274 7088
                </p>
            </div>

            <div class="print-button">
                <button onclick="window.print()">Print Receipt</button>
                <button class="btn-close" onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `;

            // Open in new window
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(receiptHTML);
            printWindow.document.close();

            // Auto print after loading
            printWindow.onload = function () {
                setTimeout(function () {
                    printWindow.focus();
                    // Uncomment to auto-print on load
                    // printWindow.print();
                }, 250);
            };
        },

        // Export registrations
        exportRegistrations: function () {
            const self = this;

            Swal.fire({
                title: 'Export Registrations',
                html: `
            <div class="text-start">
                <p>Choose export format:</p>
                <div class="mb-3">
                    <label class="form-label">Format</label>
                    <select class="form-select" id="exportFormat">
                        <option value="csv">CSV (Excel Compatible)</option>
                        <option value="json">JSON</option>
                    </select>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="exportAllPages" checked>
                    <label class="form-check-label" for="exportAllPages">
                        Export all pages (current filters applied)
                    </label>
                </div>
            </div>
        `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Export',
                cancelButtonText: 'Cancel',
                preConfirm: () => {
                    return {
                        format: $('#exportFormat').val(),
                        allPages: $('#exportAllPages').is(':checked')
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    self.processExport(result.value.format, result.value.allPages);
                }
            });
        },

        // Process export
        processExport: function (format, allPages) {
            const self = this;

            const params = allPages ? {
                per_page: 10000, // Large number to get all
                ...this.currentFilters
            } : {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.currentFilters
            };

            TempleUtils.showLoading('Exporting data...');

            PagodaAPI.registrations.getAll(params)
                .done(function (response) {
                    if (response.success && response.data) {
                        const registrations = response.data.data || [];

                        if (format === 'csv') {
                            self.exportToCSV(registrations);
                        } else {
                            self.exportToJSON(registrations);
                        }

                        TempleUtils.showSuccess(`Exported ${registrations.length} registrations`);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to export data');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Export to CSV
        exportToCSV: function (registrations) {
            const headers = [
                'Receipt Number',
                'Devotee Name',
                'Devotee Contact',
                'Light Code',
                'Light Number',
                'Light Option',
                'Merit Amount',
                'Payment Method',
                'Offer Date',
                'Expiry Date',
                'Status',
                'Remarks'
            ];

            const rows = registrations.map(reg => {
                const devoteeName = reg.devotee?.name_english || reg.devotee_name_english || '';
                const devoteeContact = reg.devotee?.contact_no || reg.devotee_contact_no || '';
                const lightCode = reg.light_code || reg.light?.light_code || '';
                const lightNumber = reg.light_number || reg.light?.light_number || '';

                return [
                    reg.receipt_number,
                    devoteeName,
                    devoteeContact,
                    lightCode,
                    lightNumber,
                    reg.light_option,
                    reg.merit_amount,
                    reg.payment_method,
                    moment(reg.offer_date).format('YYYY-MM-DD'),
                    moment(reg.expiry_date).format('YYYY-MM-DD'),
                    reg.status,
                    (reg.remarks || '').replace(/"/g, '""') // Escape quotes
                ];
            });

            // Build CSV
            let csv = headers.join(',') + '\n';
            rows.forEach(row => {
                csv += row.map(field => `"${field}"`).join(',') + '\n';
            });

            // Download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `pagoda_registrations_${moment().format('YYYYMMDD_HHmmss')}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        // Export to JSON
        exportToJSON: function (registrations) {
            const json = JSON.stringify(registrations, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `pagoda_registrations_${moment().format('YYYYMMDD_HHmmss')}.json`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
    };

})(jQuery, window);