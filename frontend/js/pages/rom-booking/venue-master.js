// js/pages/rom-booking/venue-master.js
// ROM Venue Master Management Page with Chinese/English naming

(function ($, window) {
    'use strict';
    if (!window.RomSharedModule) {
        window.RomSharedModule = {
            moduleId: 'rom',
            eventNamespace: 'rom',
            cssId: 'rom-css',
            cssPath: '/css/rom-booking.css',
            activePages: new Set(),

            // Load shared CSS (only once per module)
            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Roms CSS loaded');
                }
            },

            // Register a page as active
            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Rom page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            // Unregister a page
            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`Rom page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

                // If no more pages active, cleanup CSS
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            // Check if any pages are active
            hasActivePages: function () {
                return this.activePages.size > 0;
            },

            // Get active pages
            getActivePages: function () {
                return Array.from(this.activePages);
            },

            // Cleanup module resources
            cleanup: function () {
                // Remove CSS
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Rom CSS removed');
                }

                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                // Remove all rom-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('Rom module cleaned up');
            }
        };
    }


    window.RomBookingVenueMasterPage = {
        pageId: 'rom-venue-master',
        eventNamespace: window.RomSharedModule.eventNamespace,
        currentPage: 1,
        perPage: 10,
        totalRecords: 0,
        currentFilters: {},
        editingVenueId: null,

        // Initialize page
        init: function (params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.render();
            this.bindEvents();
            this.loadVenues();
        },

        // Cleanup page
        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);
            window.RomSharedModule.unregisterPage(this.pageId);

            // Cleanup events
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            console.log(`${this.pageId} cleanup completed`);
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="rom-booking-page">
                    <!-- Page Header -->
                    <div class="rom-booking-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="rom-booking-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="rom-booking-title-wrapper">
                                        <i class="bi bi-building rom-booking-header-icon"></i>
                                        <div>
                                            <h1 class="rom-booking-title">ROM Venue Masters</h1>
                                            <p class="rom-booking-subtitle">场地管理 • ROM Venue Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="btnAddNew">
                                        <i class="bi bi-plus-circle"></i> Add New
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid">
                        <!-- Filter Section -->
                        <div class="card shadow-sm mb-4">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="filterStatus">
                                            <option value="">All Status</option>
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                    <div class="col-md-9">
                                        <label class="form-label">Search</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="searchInput" placeholder="Search by name...">
                                            <button class="btn btn-primary" id="btnSearch">
                                                <i class="bi bi-search"></i> Search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Data Table -->
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover" id="venuesTable">
                                        <thead>
                                            <tr>
                                                <th width="5%">#</th>
                                                <th width="30%">Primary Name</th>
                                                <th width="30%">Secondary Name</th>
                                                <th width="15%">Status</th>
                                                <th width="20%">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="venuesTableBody">
                                            <tr>
                                                <td colspan="5" class="text-center">
                                                    <div class="alert alert-warning mb-0">
                                                        <i class="bi bi-exclamation-circle"></i> Loading...
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Pagination -->
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <div>
                                        <select class="form-select form-select-sm" id="perPageSelect" style="width: auto;">
                                            <option value="10">10 per page</option>
                                            <option value="25">25 per page</option>
                                            <option value="50">50 per page</option>
                                            <option value="100">100 per page</option>
                                        </select>
                                    </div>
                                    <div id="paginationContainer"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Modal -->
                <div class="modal fade" id="venueModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="venueModalTitle">
                                    <i class="bi bi-building"></i> Add New ROM Venue
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="venueForm" novalidate>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Name (Chinese) 姓名 (中文) *</label>
                                                <input type="text" class="form-control" name="name_primary" required>
                                                <div class="invalid-feedback">Please enter primary name (Chinese)</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Name (English) 姓名 (英文)</label>
                                                <input type="text" class="form-control" name="name_secondary">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">City 城市</label>
                                                <input type="text" class="form-control" name="city">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Pincode 邮政编码</label>
                                                <input type="text" class="form-control" name="pincode">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-12">
                                            <div class="mb-3">
                                                <label class="form-label">Status 状态 *</label>
                                                <select class="form-select" name="status" required>
                                                    <option value="1">Active</option>
                                                    <option value="0">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Description 描述</label>
                                        <textarea class="form-control" name="description" rows="3"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="btnSaveVenue">
                                    <i class="bi bi-check-circle"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);

            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 1000,
                    easing: 'ease-out-cubic',
                    once: true,
                    offset: 100
                });
            }
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Add New button
            $('#btnAddNew').on('click.' + this.eventNamespace, function () {
                self.showAddModal();
            });

            // Search button
            $('#btnSearch').on('click.' + this.eventNamespace, function () {
                self.applyFilters();
            });

            // Search on Enter
            $('#searchInput').on('keypress.' + this.eventNamespace, function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            // Filter changes
            $('#filterStatus').on('change.' + this.eventNamespace, function () {
                self.applyFilters();
            });

            // Per page change
            $('#perPageSelect').on('change.' + this.eventNamespace, function () {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadVenues();
            });

            // Save venue
            $('#btnSaveVenue').on('click.' + this.eventNamespace, function () {
                self.saveVenue();
            });

            // Table row actions (delegated)
            $('#venuesTableBody').on('click.' + this.eventNamespace, '.btn-edit', function () {
                const venueId = $(this).data('id');
                self.showEditModal(venueId);
            });

            $('#venuesTableBody').on('click.' + this.eventNamespace, '.btn-delete', function () {
                const venueId = $(this).data('id');
                self.deleteVenue(venueId);
            });
        },

        // Load venues from API
        loadVenues: function () {
            const self = this;

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.currentFilters
            };

            TempleAPI.get('/rom-booking/venue-master', params)
                .done(function (response) {
                    if (response.success) {
                        self.renderTable(response.data);
                    } else {
                        TempleCore.showToast('Failed to load venues', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Load venues error:', error);
                    TempleCore.showToast('Failed to load venues', 'error');
                    self.renderEmptyTable();
                });
        },

        // Render table
        renderTable: function (data) {
            const self = this;
            const tbody = $('#venuesTableBody');
            tbody.empty();

            if (!data.data || data.data.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="5" class="text-center">
                            <div class="alert alert-info mb-0">
                                <i class="bi bi-info-circle"></i> No ROM venues found
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }

            let rows = '';
            const startIndex = (data.current_page - 1) * data.per_page;

            data.data.forEach((venue, index) => {
                const statusBadge = venue.status === 1
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-danger">Inactive</span>';

                rows += `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td>${venue.name_primary || '-'}</td>
                        <td>${venue.name_secondary || '-'}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-edit" data-id="${venue.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-delete" data-id="${venue.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.html(rows);
            this.renderPagination(data);
        },

        // Render empty table
        renderEmptyTable: function () {
            $('#venuesTableBody').html(`
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="alert alert-warning mb-0">
                            <i class="bi bi-exclamation-circle"></i> Failed to load data
                        </div>
                    </td>
                </tr>
            `);
        },

        // Render pagination
        renderPagination: function (data) {
            const container = $('#paginationContainer');

            if (data.last_page <= 1) {
                container.empty();
                return;
            }

            let pagination = '<nav><ul class="pagination mb-0">';

            // Previous
            pagination += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                </li>
            `;

            // Pages
            for (let i = 1; i <= data.last_page; i++) {
                if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    pagination += `
                        <li class="page-item ${i === data.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    pagination += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                }
            }

            // Next
            pagination += `
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                </li>
            `;

            pagination += '</ul></nav>';
            container.html(pagination);

            // Bind pagination clicks
            const self = this;
            container.find('.page-link').on('click.' + this.eventNamespace, function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && page !== self.currentPage) {
                    self.currentPage = page;
                    self.loadVenues();
                }
            });
        },

        // Apply filters
        applyFilters: function () {
            this.currentFilters = {
                status: $('#filterStatus').val(),
                search: $('#searchInput').val().trim()
            };
            this.currentPage = 1;
            this.loadVenues();
        },

        // Show add modal
        showAddModal: function () {
            this.editingVenueId = null;
            $('#venueModalTitle').html('<i class="bi bi-plus-circle"></i> Add New ROM Venue');
            $('#venueForm')[0].reset();
            $('#venueForm').removeClass('was-validated');

            const modal = new bootstrap.Modal(document.getElementById('venueModal'));
            modal.show();
        },

        // Show edit modal
        showEditModal: function (venueId) {
            const self = this;
            this.editingVenueId = venueId;

            TempleAPI.get(`/rom-booking/venue-master/${venueId}`)
                .done(function (response) {
                    if (response.success) {
                        const venue = response.data;

                        $('#venueModalTitle').html('<i class="bi bi-pencil"></i> Edit ROM Venue');

                        // Populate form
                        $('input[name="name_primary"]').val(venue.name_primary);
                        $('input[name="name_secondary"]').val(venue.name_secondary);
                        $('textarea[name="description"]').val(venue.description);
                        $('input[name="city"]').val(venue.city);
                        $('input[name="pincode"]').val(venue.pincode);
                        $('select[name="status"]').val(venue.status);

                        const modal = new bootstrap.Modal(document.getElementById('venueModal'));
                        modal.show();
                    } else {
                        TempleCore.showToast('Failed to load venue details', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Load venue error:', error);
                    TempleCore.showToast('Failed to load venue details', 'error');
                });
        },

        // Save venue
        saveVenue: function () {
            const form = $('#venueForm')[0];

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            const formData = {
                name_primary: $('input[name="name_primary"]').val(),
                name_secondary: $('input[name="name_secondary"]').val(),
                description: $('textarea[name="description"]').val(),
                city: $('input[name="city"]').val(),
                pincode: $('input[name="pincode"]').val(),
                status: $('select[name="status"]').val()
            };

            const self = this;
            const $btn = $('#btnSaveVenue');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<i class="spinner-border spinner-border-sm"></i> Saving...');

            const apiCall = this.editingVenueId
                ? TempleAPI.put(`/rom-booking/venue-master/${this.editingVenueId}`, formData)
                : TempleAPI.post('/rom-booking/venue-master', formData);

            apiCall
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(
                            self.editingVenueId ? 'Venue updated successfully' : 'Venue created successfully',
                            'success'
                        );
                        bootstrap.Modal.getInstance(document.getElementById('venueModal')).hide();
                        self.loadVenues();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save venue', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Save venue error:', error);
                    TempleCore.showToast('Failed to save venue', 'error');
                })
                .always(function () {
                    $btn.prop('disabled', false).html(originalText);
                });
        },

        // Delete venue
        deleteVenue: function (venueId) {
            const self = this;

            TempleCore.showConfirm(
                'Are you sure you want to delete this venue?',
                'This action cannot be undone.',
                function () {
                    TempleAPI.delete(`/rom-booking/venue-master/${venueId}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Venue deleted successfully', 'success');
                                self.loadVenues();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete venue', 'error');
                            }
                        })
                        .fail(function (error) {
                            console.error('Delete venue error:', error);
                            TempleCore.showToast('Failed to delete venue', 'error');
                        });
                }
            );
        }
    };

})(jQuery, window);