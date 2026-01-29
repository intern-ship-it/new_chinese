// js/pages/rom-booking/session-master.js
// ROM Session Master Management Page - COMPLETE FIX

(function ($, window) {
    'use strict';
    if (!window.RomSharedModule) {
        window.RomSharedModule = {
            moduleId: 'rom',
            eventNamespace: 'rom',
            cssId: 'rom-css',
            cssPath: '/css/rom-booking.css',
            activePages: new Set(),

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

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Rom page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`Rom page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

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
                    console.log('Rom CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('Rom module cleaned up');
            }
        };
    }

    window.RomBookingSessionMasterPage = {
        pageId: 'rom-session-master',
        eventNamespace: window.RomSharedModule.eventNamespace,
        currentPage: 1,
        perPage: 10,
        totalRecords: 0,
        currentFilters: {},
        editingSessionId: null,
        activeVenues: [],

        init: function (params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.render();
            this.bindEvents();
            this.loadActiveVenues();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);
            window.RomSharedModule.unregisterPage(this.pageId);

            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            if ($('#venueSelect').data('select2')) {
                $('#venueSelect').select2('destroy');
            }

            console.log(`${this.pageId} cleanup completed`);
        },

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
                                        <i class="bi bi-clock-history rom-booking-header-icon"></i>
                                        <div>
                                            <h1 class="rom-booking-title">ROM Session Masters</h1>
                                            <p class="rom-booking-subtitle">Registration of Marriage - ROM Session Management</p>
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
                                    <table class="table table-hover" id="sessionsTable">
                                        <thead>
                                            <tr>
                                                <th width="5%">#</th>
                                                <th width="20%">Name</th>
                                                <th width="15%">Time</th>
                                                <th width="20%">Venues</th>
                                                <th width="10%">Amount</th>
                                                <th width="10%">Max Members</th>
                                                <th width="10%">Status</th>
                                                <th width="10%">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="sessionsTableBody">
                                            <tr>
                                                <td colspan="8" class="text-center">
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
                <div class="modal fade" id="sessionModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="sessionModalTitle">
                                    <i class="bi bi-clock-history"></i> Add New ROM Session
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="sessionForm" novalidate>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Name (Chinese) 名称 (中文) *</label>
                                                <input type="text" class="form-control" name="name_primary" required>
                                                <div class="invalid-feedback">Please enter primary name (Chinese)</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Name (English) 名称 (英文)</label>
                                                <input type="text" class="form-control" name="name_secondary">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-2">
                                            <div class="mb-3">
                                                <label class="form-label">From Time 开始时间 *</label>
                                                <input type="time" class="form-control" name="from_time" required>
                                                <div class="invalid-feedback">Please select start time</div>
                                            </div>
                                        </div>
                                        <div class="col-md-2">
                                            <div class="mb-3">
                                                <label class="form-label">To Time 结束时间 *</label>
                                                <input type="time" class="form-control" name="to_time" required>
                                                <div class="invalid-feedback">Please select end time</div>
                                            </div>
                                        </div>
                                                <div class="col-md-8">
                                        <div class="mb-3">
                                                <label class="form-label">Venues 场地 * (Multiple Select)</label>
                                                <select class="form-select" id="venueSelect" name="venue_ids" multiple required>
                                                    <!-- Options will be loaded dynamically -->
                                                </select>
                                                <div class="invalid-feedback">Please select at least one venue</div>
                                                <small class="form-text text-muted">Select multiple venues</small>
                                            </div>
                                            </div>
                                    </div>

                                

                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Amount 金额 *</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">$</span>
                                                    <input type="number" class="form-control" name="amount" min="0" step="0.01" required>
                                                </div>
                                                <div class="invalid-feedback">Please enter amount</div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Max Members 最大人数 *</label>
                                                <input type="number" class="form-control" name="max_members" min="1" required>
                                                <div class="invalid-feedback">Please enter max members</div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
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
                                <button type="button" class="btn btn-primary" id="btnSaveSession">
                                    <i class="bi bi-check-circle"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);

            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 1000,
                    easing: 'ease-out-cubic',
                    once: true,
                    offset: 100
                });
            }
        },

        loadActiveVenues: function () {
            const self = this;

            TempleAPI.get('/rom-booking/venue-master/active')
                .done(function (response) {
                    if (response.success) {
                        self.activeVenues = response.data;
                        console.log('Loaded venues:', self.activeVenues.length);
                        self.renderVenueOptions();
                        self.loadSessions();
                    }
                })
                .fail(function (error) {
                    console.error('Load venues error:', error);
                    TempleCore.showToast('Failed to load venues', 'error');
                    self.loadSessions();
                });
        },

        renderVenueOptions: function () {
            const select = $('#venueSelect');
            
            if (!select.length) {
                console.warn('Venue select element not found');
                return;
            }
            
            select.empty();

            if (this.activeVenues.length === 0) {
                select.html('<option value="">No venues available</option>');
                console.warn('No active venues available');
                return;
            }

            // ✅ FIX: Add venue options directly WITHOUT empty placeholder
            this.activeVenues.forEach(venue => {
                select.append(
                    `<option value="${venue.id}">${venue.formatted_name}</option>`
                );
            });
            
            console.log(`Added ${this.activeVenues.length} venue options to dropdown`);

            // ✅ Initialize Select2 with proper configuration
            if (typeof $.fn.select2 !== 'undefined') {
                try {
                    select.select2({
                        placeholder: 'Select venues', // Placeholder text
                        allowClear: true,
                        dropdownParent: $('#sessionModal'),
                        width: '100%',
                        closeOnSelect: false,
                        multiple: true,
                        theme: 'bootstrap-5',
                        // ✅ CRITICAL: Configure to handle empty values properly
                        templateResult: formatVenueOption,
                        templateSelection: formatVenueSelection,
                        // ✅ Prevent empty values from being added
                        matcher: function(params, data) {
                            // If there are no search terms, return all of the data
                            if ($.trim(params.term) === '') {
                                return data;
                            }

                            // ✅ Skip empty or invalid options
                            if (!data.id || data.id === '') {
                                return null;
                            }

                            // Do a case-insensitive search
                            if (data.text.toLowerCase().indexOf(params.term.toLowerCase()) > -1) {
                                return data;
                            }

                            return null;
                        }
                    });
                    
                    console.log('Select2 initialized successfully');
                    
                    // ✅ CRITICAL: Ensure no empty values are selected on initialization
                    const currentVal = select.val() || [];
                    const cleanVal = currentVal.filter(function(v) { 
                        return v && v.trim() !== ''; 
                    });
                    
                    if (cleanVal.length !== currentVal.length) {
                        console.log('Cleaned empty values from selection');
                        select.val(cleanVal).trigger('change');
                    }
                    
                } catch (error) {
                    console.error('Error initializing Select2:', error);
                }
            }
            
            // ✅ Format option in dropdown
            function formatVenueOption(venue) {
                if (!venue.id || venue.id === '') {
                    return null; // Don't display empty options
                }
                
                var $venue = $(
                    '<div class="select2-venue-option">' +
                        '<i class="bi bi-building me-2"></i>' +
                        '<span>' + venue.text + '</span>' +
                    '</div>'
                );
                
                return $venue;
            }
            
            // ✅ Format selected item
            function formatVenueSelection(venue) {
                if (!venue.id || venue.id === '') {
                    return ''; // Don't show empty selections
                }
                return venue.text;
            }
        },

        bindEvents: function () {
            const self = this;

            $('#btnAddNew').on('click.' + this.eventNamespace, function () {
                self.showAddModal();
            });

            $('#btnSearch').on('click.' + this.eventNamespace, function () {
                self.applyFilters();
            });

            $('#searchInput').on('keypress.' + this.eventNamespace, function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            $('#filterStatus').on('change.' + this.eventNamespace, function () {
                self.applyFilters();
            });

            $('#perPageSelect').on('change.' + this.eventNamespace, function () {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadSessions();
            });

            $('#btnSaveSession').on('click.' + this.eventNamespace, function () {
                self.saveSession();
            });

            $('#sessionsTableBody').on('click.' + this.eventNamespace, '.btn-edit', function () {
                const sessionId = $(this).data('id');
                self.showEditModal(sessionId);
            });

            $('#sessionsTableBody').on('click.' + this.eventNamespace, '.btn-delete', function () {
                const sessionId = $(this).data('id');
                self.deleteSession(sessionId);
            });

            $('input[name="to_time"]').on('change.' + this.eventNamespace, function () {
                const fromTime = $('input[name="from_time"]').val();
                const toTime = $(this).val();

                if (fromTime && toTime && toTime <= fromTime) {
                    $(this)[0].setCustomValidity('End time must be after start time');
                } else {
                    $(this)[0].setCustomValidity('');
                }
            });
            
            // ✅ Clean up on modal hide
            $('#sessionModal').on('hidden.bs.modal', function () {
                console.log('Modal hidden, cleaning up...');
                
                if ($('#venueSelect').data('select2')) {
                    $('#venueSelect').select2('destroy');
                }
                
                $('#sessionForm')[0].reset();
                $('#sessionForm').removeClass('was-validated');
            });

            // ✅ CRITICAL: Remove any empty selections when Select2 changes
            $('#venueSelect').on('change.' + this.eventNamespace, function() {
                const values = $(this).val() || [];
                const cleaned = values.filter(function(v) {
                    return v && v.trim() !== '';
                });
                
                if (cleaned.length !== values.length) {
                    console.log('Removing empty venue selections');
                    $(this).val(cleaned).trigger('change.select2');
                }
            });
        },

        loadSessions: function () {
            const self = this;

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.currentFilters
            };

            TempleAPI.get('/rom-booking/session-master', params)
                .done(function (response) {
                    if (response.success) {
                        self.renderTable(response.data);
                    } else {
                        TempleCore.showToast('Failed to load sessions', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Load sessions error:', error);
                    TempleCore.showToast('Failed to load sessions', 'error');
                    self.renderEmptyTable();
                });
        },

        renderTable: function (data) {
            const tbody = $('#sessionsTableBody');
            tbody.empty();

            if (!data.data || data.data.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center">
                            <div class="alert alert-info mb-0">
                                <i class="bi bi-info-circle"></i> No ROM sessions found
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }

            let rows = '';
            const startIndex = (data.current_page - 1) * data.per_page;

            data.data.forEach((session, index) => {
                const statusBadge = session.status === 1
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-danger">Inactive</span>';

                const venueNames = session.venue_names || 'No venues';

                rows += `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td>
                            <strong>${session.name_primary || '-'}</strong>
                            ${session.name_secondary ? `<br><small class="text-muted">${session.name_secondary}</small>` : ''}
                        </td>
                        <td>
                            <i class="bi bi-clock"></i> ${session.formatted_time}
                        </td>
                        <td>
                            <small>${venueNames}</small>
                        </td>
                        <td>
                            <strong>$${session.formatted_amount}</strong>
                        </td>
                        <td>
                            <i class="bi bi-people"></i> ${session.max_members}
                        </td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-edit" data-id="${session.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-delete" data-id="${session.id}" title="Delete">
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

        renderEmptyTable: function () {
            $('#sessionsTableBody').html(`
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="alert alert-warning mb-0">
                            <i class="bi bi-exclamation-circle"></i> Failed to load data
                        </div>
                    </td>
                </tr>
            `);
        },

        renderPagination: function (data) {
            const container = $('#paginationContainer');

            if (data.last_page <= 1) {
                container.empty();
                return;
            }

            let pagination = '<nav><ul class="pagination mb-0">';

            pagination += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                </li>
            `;

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

            pagination += `
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                </li>
            `;

            pagination += '</ul></nav>';
            container.html(pagination);

            const self = this;
            container.find('.page-link').on('click.' + this.eventNamespace, function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && page !== self.currentPage) {
                    self.currentPage = page;
                    self.loadSessions();
                }
            });
        },

        applyFilters: function () {
            this.currentFilters = {
                status: $('#filterStatus').val(),
                search: $('#searchInput').val().trim()
            };
            this.currentPage = 1;
            this.loadSessions();
        },

        showAddModal: function () {
            const self = this;
            
            this.editingSessionId = null;
            $('#sessionModalTitle').html('<i class="bi bi-plus-circle"></i> Add New ROM Session');
            $('#sessionForm')[0].reset();
            $('#sessionForm').removeClass('was-validated');

            const modal = new bootstrap.Modal(document.getElementById('sessionModal'));
            
            $('#sessionModal').one('shown.bs.modal', function () {
                console.log('Add modal shown, initializing Select2...');
                
                if ($('#venueSelect').data('select2')) {
                    $('#venueSelect').select2('destroy');
                }
                
                self.renderVenueOptions();
                
                // ✅ CRITICAL: Clear selection and ensure no empty values
                $('#venueSelect').val(null).trigger('change');
            });
            
            modal.show();
        },

        showEditModal: function (sessionId) {
            const self = this;
            this.editingSessionId = sessionId;

            TempleAPI.get(`/rom-booking/session-master/${sessionId}`)
                .done(function (response) {
                    if (response.success) {
                        const session = response.data;

                        $('#sessionModalTitle').html('<i class="bi bi-pencil"></i> Edit ROM Session');

                        $('input[name="name_primary"]').val(session.name_primary);
                        $('input[name="name_secondary"]').val(session.name_secondary);
                        $('textarea[name="description"]').val(session.description);
                        $('input[name="from_time"]').val(session.from_time);
                        $('input[name="to_time"]').val(session.to_time);
                        $('input[name="amount"]').val(session.amount);
                        $('input[name="max_members"]').val(session.max_members);
                        $('select[name="status"]').val(session.status);

                        const modal = new bootstrap.Modal(document.getElementById('sessionModal'));
                        
                        $('#sessionModal').one('shown.bs.modal', function () {
                            console.log('Edit modal shown, initializing Select2...');
                            
                            if ($('#venueSelect').data('select2')) {
                                $('#venueSelect').select2('destroy');
                            }
                            
                            self.renderVenueOptions();
                            
                            setTimeout(function() {
                                console.log('Setting venue selection to:', session.venue_ids);
                                
                                // ✅ Filter out any empty values before setting
                                const cleanVenueIds = (session.venue_ids || []).filter(function(id) {
                                    return id && id.trim() !== '';
                                });
                                
                                $('#venueSelect').val(cleanVenueIds).trigger('change');
                            }, 100);
                        });
                        
                        modal.show();
                    } else {
                        TempleCore.showToast('Failed to load session details', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Load session error:', error);
                    TempleCore.showToast('Failed to load session details', 'error');
                });
        },

        saveSession: function () {
            const form = $('#sessionForm')[0];

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            // ✅ Get selected venue IDs and FILTER OUT EMPTY VALUES
            const venueIds = $('#venueSelect').val() || [];
            
            // ✅ CRITICAL FIX: Remove empty strings, null, and whitespace-only values
            const filteredVenueIds = venueIds.filter(function(id) {
                return id && typeof id === 'string' && id.trim() !== '';
            });
            
            console.log('===== VENUE IDS DEBUG =====');
            console.log('Raw venue IDs from select:', venueIds);
            console.log('Filtered venue IDs:', filteredVenueIds);
            console.log('Count:', filteredVenueIds.length);
            console.log('===========================');
            
            if (!filteredVenueIds || filteredVenueIds.length === 0) {
                TempleCore.showToast('Please select at least one venue', 'error');
                $('#venueSelect').addClass('is-invalid');
                return;
            }
            
            $('#venueSelect').removeClass('is-invalid');

            // ✅ Validate each venue ID is a proper UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const invalidIds = filteredVenueIds.filter(function(id) {
                return !uuidRegex.test(id);
            });
            
            if (invalidIds.length > 0) {
                console.error('Invalid venue IDs detected:', invalidIds);
                TempleCore.showToast('Invalid venue selection detected. Please try again.', 'error');
                return;
            }
            
            const formData = {
                name_primary: $('input[name="name_primary"]').val(),
                name_secondary: $('input[name="name_secondary"]').val(),
                description: $('textarea[name="description"]').val(),
                from_time: $('input[name="from_time"]').val(),
                to_time: $('input[name="to_time"]').val(),
                venue_ids: filteredVenueIds, // ✅ Send filtered UUID strings
                amount: parseFloat($('input[name="amount"]').val()),
                max_members: parseInt($('input[name="max_members"]').val()),
                status: parseInt($('select[name="status"]').val())
            };

            console.log('Saving session with data:', formData);

            const self = this;
            const $btn = $('#btnSaveSession');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<i class="spinner-border spinner-border-sm"></i> Saving...');

            const apiCall = this.editingSessionId
                ? TempleAPI.put(`/rom-booking/session-master/${this.editingSessionId}`, formData)
                : TempleAPI.post('/rom-booking/session-master', formData);

            apiCall
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(
                            self.editingSessionId ? 'Session updated successfully' : 'Session created successfully',
                            'success'
                        );
                        bootstrap.Modal.getInstance(document.getElementById('sessionModal')).hide();
                        self.loadSessions();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save session', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Save session error:', error);
                    const errorMsg = error.responseJSON?.message || 'Failed to save session';
                    TempleCore.showToast(errorMsg, 'error');
                })
                .always(function () {
                    $btn.prop('disabled', false).html(originalText);
                });
        },

        deleteSession: function (sessionId) {
            const self = this;

            TempleCore.showConfirm(
                'Are you sure you want to delete this session?',
                'This action cannot be undone.',
                function () {
                    TempleAPI.delete(`/rom-booking/session-master/${sessionId}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Session deleted successfully', 'success');
                                self.loadSessions();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete session', 'error');
                            }
                        })
                        .fail(function (error) {
                            console.error('Delete session error:', error);
                            TempleCore.showToast('Failed to delete session', 'error');
                        });
                }
            );
        }
    };

})(jQuery, window);