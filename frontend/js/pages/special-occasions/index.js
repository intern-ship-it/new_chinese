// js/pages/special-occasions/index.js
// Special Occasions Listing Page with Relocation Support (STEP 1.2)

(function ($, window) {
    'use strict';
    if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
            eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),

            // Load shared CSS (only once per module)
            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Special Occasions CSS loaded');
                }
            },

            // Register a page as active
            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Special Occasions page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            // Unregister a page
            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`Special Occasions page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

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
                    console.log('Special Occasions CSS removed');
                }

                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                // Remove all occasions-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('Special Occasions module cleaned up');
            }
        };
    }
    window.SpecialOccasionsPage = {
        pageId: 'occasions-index',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,
        dataTable: null,
        bookings: [],
        occasions: {},
        selectedBookings: [],

        // ========================================
        // RELOCATION STATE (STEP 1.2)
        // ========================================
        relocationModal: null,
        currentBookingForRelocation: null,

        init: function (params) {
            console.log('Initializing Special Occasions Listing Page...');
            window.OccasionsSharedModule.registerPage(this.pageId);

            this.render();
            this.loadOccasions();
            this.loadBookings();
            this.initAnimations();
            this.bindEvents();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            // Destroy DataTable
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            // Cleanup relocation modal
            if (this.relocationModal) {
                try {
                    this.relocationModal.hide();
                    this.relocationModal.dispose();
                } catch (e) { }
                this.relocationModal = null;
            }

            // Unregister from shared module
            window.OccasionsSharedModule.unregisterPage(this.pageId);

            // Cleanup events
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            // Cleanup animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }

            // Remove modal backdrop
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');

            console.log(`${this.pageId} cleanup completed`);
        },

        render: function () {
            const html = `
                <div class="special-occasions-page occasions-index-page">
                    <!-- Page Header -->
                    <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-list-check occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Temple Events Bookings</h1>
                                            <p class="occasion-subtitle">Manage Your Bookings</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-primary btn-lg me-2" id="btnNewBooking">
                                        <i class="bi bi-plus-circle"></i> New Booking
                                    </button>
                                    <button class="btn btn-outline-light btn-lg" id="btnPrintReport">
                                        <i class="bi bi-printer"></i> Print Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid mt-4">
                        <!-- Filters Section -->
                        <div class="occasion-card" data-aos="fade-up" data-aos-delay="100">
                            <div class="card-header-custom">
                                <i class="bi bi-funnel"></i>
                                <span>Filters</span>
                            </div>
                            <div class="card-body-custom">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label-custom">From Date</label>
                                        <input type="date" class="form-control form-control-custom" id="filterFromDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label-custom">To Date</label>
                                        <input type="date" class="form-control form-control-custom" id="filterToDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label-custom">Occasion Type</label>
                                        <select class="form-select form-select-custom" id="filterOccasion">
                                            <option value="">All Occasions</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label-custom">&nbsp;</label>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-primary w-100" id="btnApplyFilter">
                                                <i class="bi bi-search"></i> Apply
                                            </button>
                                            <button class="btn btn-secondary" id="btnResetFilter">
                                                <i class="bi bi-arrow-counterclockwise"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Bulk Actions Bar (Hidden initially) -->
                        <div class="bulk-actions-bar" id="bulkActionsBar" style="display: none;">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="selected-count">
                                    <i class="bi bi-check-circle"></i>
                                    <span id="selectedCount">0</span> items selected
                                </div>
                                <div class="bulk-buttons">
                                    <button class="btn btn-sm btn-success" id="btnBulkConfirm">
                                        <i class="bi bi-check-lg"></i> Confirm
                                    </button>
                                    <button class="btn btn-sm btn-warning" id="btnBulkPending">
                                        <i class="bi bi-clock"></i> Set Pending
                                    </button>
                                    <button class="btn btn-sm btn-danger" id="btnBulkCancel">
                                        <i class="bi bi-x-lg"></i> Cancel
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" id="btnBulkDelete">
                                        <i class="bi bi-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Bookings Table -->
                        <div class="occasion-card mt-3" data-aos="fade-up" data-aos-delay="200">
                            <div class="card-header-custom">
                                <i class="bi bi-table"></i>
                                <span>Bookings List</span>
                            </div>
                            <div class="card-body-custom">
                                <div class="table-responsive">
                                    <table class="table table-hover" id="bookingsTable">
                                        <thead>
                                            <tr>
                                                <th width="30">
                                                    <input type="checkbox" class="form-check-input" id="selectAll">
                                                </th>
                                                <th>Booking Code</th>
                                                <th>Date</th>
                                                <th>Name (Chinese)</th>
                                                <th>Name (English)</th>
                                                <th>Occasion</th>
                                                <th>Option</th>
                                                <th>Amount</th>
                                                <th>Payment</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ========================================
                     RELOCATION MODAL (STEP 1.2)
                     ======================================== -->
                ${this.renderRelocationModal()}
            `;

            $('#page-container').html(html);
        },

        // ========================================
        // RELOCATION MODAL HTML (STEP 1.2)
        // ========================================
        renderRelocationModal: function () {
            return `
        <div class="modal fade" id="relocationModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">
                            <i class="bi bi-arrows-move me-2"></i>Relocate Booking
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Current Assignment Info -->
                        <div class="alert alert-info mb-4">
                            <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>Current Assignment</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Booking:</strong> <span id="relocateBookingNo">-</span><br>
                                    <strong>Devotee:</strong> <span id="relocateDevotee">-</span>
                                </div>
                                <div class="col-md-6">
                                    <strong>Event:</strong> <span id="relocateEvent">-</span><br>
                                    <strong>Current Seat/No:</strong> <span id="relocateCurrentSeat">-</span>
                                </div>
                            </div>
                        </div>

                        <form id="relocationForm">
                            <input type="hidden" id="relocateBookingId">
                            
                            <h6 class="fw-bold mb-3">
                                <i class="bi bi-geo-alt me-2"></i>New Assignment
                            </h6>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Table</label>
                                    <select class="form-select" id="newTableNumber">
                                        <option value="">No Table (Direct Assignment)</option>
                                    </select>
                                    <small class="text-muted">Leave empty if not using table layout</small>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Seat/Assign Number <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="newSeatNumber" placeholder="e.g., A-15 or 15" required>
                                    <small class="text-danger">Required</small>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Row</label>
                                    <input type="number" class="form-control" id="newRowNumber" min="1" placeholder="Row number (optional)">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Column</label>
                                    <input type="number" class="form-control" id="newColumnNumber" min="1" placeholder="Column number (optional)">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Reason for Relocation <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="relocationReason" rows="3" required 
                                    placeholder="Enter reason for this change (required for audit log)"></textarea>
                                <small class="text-danger">Required - This will be recorded in the relocation log.</small>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Change Type</label>
                                <select class="form-select" id="relocationChangeType">
                                    <option value="manual">Manual - Admin initiated</option>
                                    <option value="forced">Forced - Conflict resolution</option>
                                </select>
                            </div>
                        </form>

                        <!-- Conflict Warning -->
                        <div class="alert alert-danger d-none" id="conflictWarning">
                            <h6 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Conflict Detected!</h6>
                            <p class="mb-0">This seat is already assigned to: <strong id="conflictDevotee"></strong></p>
                            <p class="mb-0">Booking: <span id="conflictBookingNo"></span></p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-warning" id="btnConfirmRelocation">
                            <i class="bi bi-check-circle me-1"></i> Confirm Relocation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
        },

        initAnimations: function () {
            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 100
                });
            }

            // Animate header background
            if (typeof gsap !== 'undefined') {
                gsap.to('.occasion-header-bg', {
                    backgroundPosition: '100% 50%',
                    duration: 20,
                    repeat: -1,
                    yoyo: true,
                    ease: 'none'
                });

                // Floating animation for header icon
                gsap.to('.occasion-header-icon', {
                    y: -10,
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut'
                });
            }
        },

        loadOccasions: function () {
            const self = this;

            // Load occasions from API
            TempleAPI.get('/special-occasions', { status: 'active' })
                .done(function (response) {
                    if (response.success && response.data) {
                        self.occasions = {};
                        response.data.forEach(function (occasion) {
                            self.occasions[occasion.id] = occasion.occasion_name_primary;
                        });

                        let optionsHTML = '<option value="">All Occasions</option>';
                        for (const [id, name] of Object.entries(self.occasions)) {
                            optionsHTML += `<option value="${id}">${name}</option>`;
                        }
                        $('#filterOccasion').html(optionsHTML);
                    }
                })
                .fail(function () {
                    console.error('Failed to load occasions');
                    // Fallback to empty
                    self.occasions = {};
                });
        },

        loadBookings: function () {
            const self = this;
            TempleCore.showLoading(true);

            const filters = this.getFilters();

            // Load bookings from API
            TempleAPI.get('/special-occasions/bookings', filters)
                .done(function (response) {
                    console.log('Raw API Response:', response); // Debug log

                    if (response.success && response.data) {
                        // Map API response to expected format
                        self.bookings = response.data.map(function (booking) {
                            console.log('Processing booking:', booking.id); // Debug log

                            // ====================================================================
                            // EXTRACT INCLUDED SERVICES (from backend response)
                            // ====================================================================
                            let includedServices = [];
                            if (Array.isArray(booking.included_services)) {
                                includedServices = booking.included_services;
                            }
                            const includedServicesCount = includedServices.length;

                            console.log('Included services extracted:', {
                                count: includedServicesCount,
                                services: includedServices
                            }); // Debug log

                            // ====================================================================
                            // EXTRACT ADDON SERVICES (from backend response)
                            // ====================================================================
                            let addonServices = [];
                            if (Array.isArray(booking.addon_services)) {
                                addonServices = booking.addon_services;
                            } else if (booking.items && Array.isArray(booking.items)) {
                                // Fallback: Extract addons from items where add_ons = 1
                                addonServices = booking.items.filter(item => item.add_ons === 1 || item.add_ons === '1');
                            }

                            const addonCount = addonServices.length;
                            const packageAmount = parseFloat(booking.occasion_amount || booking.package_amount || 0);
                            const addonTotal = addonServices.reduce((sum, addon) =>
                                sum + parseFloat(addon.total_price || addon.amount || addon.unit_price || 0), 0);
                            const totalAmount = parseFloat(booking.total_amount || (packageAmount + addonTotal));

                            console.log('Addon services extracted:', {
                                count: addonCount,
                                total: addonTotal,
                                services: addonServices
                            }); // Debug log

                            return {
                                id: booking.id,
                                booking_code: booking.booking_code || booking.booking_number || booking.booking_no || `SO${booking.id}`,
                                booking_date: booking.booking_date || booking.event_date || booking.created_at,
                                special_occasion_id: booking.occasion_id || booking.special_occasion_id,
                                occasion_name: booking.occasion?.occasion_name_primary ||
                                    booking.occasion_name ||
                                    self.occasions[booking.occasion_id] ||
                                    'N/A',
                                occasion_option: booking.occasion_option ||
                                    booking.option?.name ||
                                    booking.package?.name ||
                                    booking.option_name ||
                                    'N/A',
                                package_amount: packageAmount,

                                // ===================================================================
                                // INCLUDED SERVICES (part of package, NO charge)
                                // ===================================================================
                                included_services: includedServices,
                                included_services_count: includedServicesCount,

                                // ===================================================================
                                // ADDON SERVICES (separate services WITH charge)
                                // ===================================================================
                                addon_services: addonServices,
                                addon_count: addonCount,
                                addon_total: addonTotal,

                                total_amount: totalAmount,
                                discount_amount: parseFloat(booking.discount_amount || 0),
                                deposit_amount: parseFloat(booking.deposit_amount || 0),
                                balance_due: parseFloat(booking.balance_due || 0),
                                name_chinese: booking.name_chinese || booking.devotee_name_chinese || '-',
                                name_english: booking.name_english || booking.devotee_name || booking.name || '-',
                                nric: booking.nric || booking.ic_number || '-',
                                email: booking.email || '-',
                                contact_no: booking.contact_no || booking.phone || '-',
                                payment_methods: booking.payment_method || booking.payment_methods || '-',
                                payment_status: booking.payment_status || 'FULL',
                                status: (booking.booking_status || booking.status || 'pending').toLowerCase(),
                                remark: booking.remark || booking.remarks || null,
                                created_at: booking.created_at,

                                // ===================================================================
                                // RELOCATION FLAGS (STEP 1.2)
                                // ===================================================================
                                enable_relocation: booking.enable_relocation || false,
                                enable_table_assignment: booking.enable_table_assignment || false,
                                table_layouts: booking.table_layouts || [],
                                current_assignment: booking.current_assignment || {
                                    table_number: booking.table_number || null,
                                    row_number: booking.row_number || null,
                                    column_number: booking.column_number || null,
                                    seat_number: booking.seat_number || null
                                }
                            };
                        });

                        console.log('Processed bookings:', self.bookings); // Debug log
                        self.initDataTable();
                    } else {
                        self.bookings = [];
                        self.initDataTable();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load bookings:', xhr);
                    TempleCore.showToast('Failed to load bookings', 'error');
                    self.bookings = [];
                    self.initDataTable();
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        getFilters: function () {
            const filters = {};

            const fromDate = $('#filterFromDate').val();
            const toDate = $('#filterToDate').val();
            const occasionId = $('#filterOccasion').val();

            if (fromDate) filters.from_date = fromDate;
            if (toDate) filters.to_date = toDate;
            if (occasionId) filters.occasion_id = occasionId;

            return filters;
        },

        applyFilters: function () {
            this.loadBookings();
            TempleCore.showToast('Filters applied', 'success');
        },

        resetFilters: function () {
            $('#filterFromDate').val('');
            $('#filterToDate').val('');
            $('#filterOccasion').val('');
            this.loadBookings();
        },

        initDataTable: function () {
            const self = this;

            if (this.dataTable) {
                this.dataTable.destroy();
            }

            this.dataTable = $('#bookingsTable').DataTable({
                data: this.bookings,
                columns: [
                    {
                        data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            return `<input type="checkbox" class="form-check-input booking-checkbox" data-id="${row.id}">`;
                        }
                    },
                    { data: 'booking_code' },
                    {
                        data: 'booking_date',
                        render: function (data) {
                            return self.formatDate(data);
                        }
                    },
                    { data: 'name_chinese' },
                    { data: 'name_english' },
                    { data: 'occasion_name' },
                    { data: 'occasion_option' },
                    {
                        data: 'occasion_amount',
                        render: function (data) {
                            return `RM ${parseFloat(data || 0).toFixed(2)}`;
                        }
                    },
                    { data: 'payment_methods' },
                    {
                        data: 'status',
                        render: function (data) {
                            return self.getStatusBadge(data);
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            // ========================================
                            // STEP 1.2: Check if relocation is enabled
                            // ========================================
                            const showRelocationIcon = row.enable_relocation === true;

                            let actions = `<div class="btn-group btn-group-sm">`;

                            // View button
                            actions += `
                                <button class="btn btn-info btn-view" data-id="${row.id}" title="View Details">
                                    <i class="bi bi-eye"></i>
                                </button>
                            `;

                            // ========================================
                            // RELOCATION BUTTON - Only if enabled (STEP 1.2)
                            // ========================================
                            if (showRelocationIcon) {
                                actions += `
                                    <button class="btn btn-warning btn-relocate" data-id="${row.id}" title="Relocate Seat/Number">
                                        <i class="bi bi-arrows-move"></i>
                                    </button>
                                `;
                            }

                            // Print Receipt button
                            actions += `
                                <button class="btn btn-success btn-print-receipt" data-id="${row.id}" title="Print Receipt">
                                    <i class="bi bi-printer"></i>
                                </button>
                            `;

                            // Delete button
                            actions += `
                                <button class="btn btn-danger btn-delete" data-id="${row.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            `;

                            actions += `</div>`;

                            return actions;
                        }
                    }
                ],
                order: [[2, 'desc']],
                pageLength: 25,
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
                language: {
                    search: 'Search:',
                    lengthMenu: 'Show _MENU_ entries',
                    info: 'Showing _START_ to _END_ of _TOTAL_ bookings',
                    infoEmpty: 'No bookings found',
                    infoFiltered: '(filtered from _MAX_ total bookings)',
                    zeroRecords: 'No matching bookings found',
                    paginate: {
                        first: 'First',
                        last: 'Last',
                        next: 'Next',
                        previous: 'Previous'
                    }
                }
            });
        },

        formatDate: function (dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        formatCurrency: function (amount) {
            return parseFloat(amount || 0).toFixed(2);
        },

        getStatusBadge: function (status) {
            const badges = {
                'pending': '<span class="badge bg-warning text-dark">Pending</span>',
                'confirmed': '<span class="badge bg-success">Confirmed</span>',
                'cancelled': '<span class="badge bg-danger">Cancelled</span>',
                'completed': '<span class="badge bg-info">Completed</span>',
                'paid': '<span class="badge bg-success">Paid</span>',
                'unpaid': '<span class="badge bg-warning text-dark">Unpaid</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },

        updateSelectedCount: function () {
            const self = this;
            const count = $('.booking-checkbox:checked').length;
            self.selectedBookings = [];

            $('.booking-checkbox:checked').each(function () {
                const id = $(this).data('id');
                self.selectedBookings.push(id);
            });

            $('#selectedCount').text(count);

            if (count > 0) {
                $('#bulkActionsBar').slideDown(300);
            } else {
                $('#bulkActionsBar').slideUp(300);
            }
        },

        // ========================================
        // RELOCATION METHODS (STEP 1.2 & 1.3)
        // ========================================
        openRelocationModal: function (bookingId) {
            const self = this;
            const booking = this.bookings.find(b => b.id === bookingId);

            if (!booking) {
                TempleCore.showToast('Booking not found', 'error');
                return;
            }

            this.currentBookingForRelocation = booking;

            // Populate current info
            $('#relocateBookingId').val(booking.id);
            $('#relocateBookingNo').text(booking.booking_code);
            $('#relocateDevotee').text((booking.name_english || '-') + ' (' + (booking.name_chinese || '-') + ')');
            $('#relocateEvent').text(booking.occasion_name || '-');

            // Current assignment
            const currentAssignment = booking.current_assignment || {};
            const currentSeat = currentAssignment.seat_number || '-';
            const currentTable = currentAssignment.table_number || '';
            $('#relocateCurrentSeat').text(currentTable ? `${currentTable} / ${currentSeat}` : currentSeat);

            // ✅ FIX: Populate table dropdown with table IDs from occasion_table_assignments
            // You need to fetch this data from the backend
            let tableOptions = '<option value="">Select Table</option>';

            // Check if we have table_layouts with IDs
            if (booking.table_layouts && booking.table_layouts.length > 0) {
                booking.table_layouts.forEach(function (layout) {
                    // ✅ Use layout.id if available, otherwise use table_name as fallback
                    const tableId = layout.id || layout.table_id || layout.table_name;
                    const tableName = layout.table_name || `Table ${tableId}`;
                    const tableInfo = layout.rows && layout.columns ? ` (${layout.rows}x${layout.columns})` : '';

                    tableOptions += `<option value="${tableId}">${tableName}${tableInfo}</option>`;
                });
            }

            $('#newTableNumber').html(tableOptions);

            // Clear form
            $('#newSeatNumber').val('');
            $('#newRowNumber').val('');
            $('#newColumnNumber').val('');
            $('#relocationReason').val('');
            $('#relocationChangeType').val('manual');
            $('#conflictWarning').addClass('d-none');

            // Show modal
            this.relocationModal = new bootstrap.Modal(document.getElementById('relocationModal'));
            this.relocationModal.show();
        },
 confirmRelocation: function () {
    const self = this;
    const bookingId = $('#relocateBookingId').val();
    const reason = $('#relocationReason').val().trim();
    const newSeatNumber = $('#newSeatNumber').val().trim();
    
    // Validation
    if (!newSeatNumber) {
        TempleCore.showToast('Please enter new seat/number', 'error');
        return;
    }
    
    if (!reason) {
        TempleCore.showToast('Please enter a reason for relocation', 'error');
        return;
    }

    // Get the selected table name (not ID, since we don't have a tables table)
    const selectedTableName = $('#newTableNumber').val();
    
    // Build the data object - SIMPLIFIED
    const data = {
        new_assign_number: newSeatNumber,           // Required
        new_table_number: selectedTableName || null, // Optional table name
        new_row_number: $('#newRowNumber').val() || null,
        new_column_number: $('#newColumnNumber').val() || null,
        reason: reason,
        change_type: $('#relocationChangeType').val(),
        admin_confirmation: true
    };

    console.log('Relocation data being sent:', data); // Debug log

    // Disable button and show loading
    const $btn = $('#btnConfirmRelocation');
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Processing...');

    TempleAPI.post(`/special-occasion-bookings/${bookingId}/relocate`, data)
        .done(function (response) {
            if (response.success) {
                TempleCore.showToast('Booking relocated successfully', 'success');
                self.relocationModal.hide();
                self.loadBookings(); // Refresh list
            } else {
                // Check for conflict
                if (response.conflict) {
                    $('#conflictDevotee').text(response.conflict.devotee_name || 'Unknown');
                    $('#conflictBookingNo').text(response.conflict.booking_number || 'Unknown');
                    $('#conflictWarning').removeClass('d-none');
                }
                
                self.showValidationErrorPopup(response.message, response.errors);
            }
        })
        .fail(function (xhr) {
            const response = xhr.responseJSON || {};
            
            console.log('API Error Response:', response);
            
            // Check for conflict
            if (response.conflict) {
                $('#conflictDevotee').text(response.conflict.devotee_name || 'Unknown');
                $('#conflictBookingNo').text(response.conflict.booking_number || 'Unknown');
                $('#conflictWarning').removeClass('d-none');
            }
            
            // Show validation errors
            if (response.errors) {
                self.showValidationErrorPopup(response.message || 'Validation failed', response.errors);
            } else {
                self.showValidationErrorPopup('Relocation failed', {
                    general: [response.message || 'An error occurred']
                });
            }
        })
        .always(function () {
            $btn.prop('disabled', false).html('<i class="bi bi-check-circle me-1"></i> Confirm Relocation');
        });
},

        /**
         * Display validation errors in a SweetAlert popup
         */
        showValidationErrorPopup: function (title, errors) {
            if (!errors || typeof errors !== 'object') {
                Swal.fire({
                    icon: 'error',
                    title: title || 'Validation Failed',
                    text: 'Please check your input and try again.',
                    confirmButtonColor: '#dc3545'
                });
                return;
            }

            // Build error list HTML
            let errorListHTML = '<div class="text-start" style="max-height: 400px; overflow-y: auto;">';
            errorListHTML += '<ul class="list-unstyled mb-0">';

            for (const [field, messages] of Object.entries(errors)) {
                if (Array.isArray(messages)) {
                    messages.forEach(function (msg) {
                        // Format field name nicely
                        const fieldName = field
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());

                        errorListHTML += `
                    <li class="mb-2">
                        <i class="bi bi-exclamation-circle text-danger me-2"></i>
                        <strong>${fieldName}:</strong> ${msg}
                    </li>
                `;
                    });
                }
            }

            errorListHTML += '</ul></div>';

            Swal.fire({
                icon: 'error',
                title: title || 'Validation Failed',
                html: errorListHTML,
                width: '600px',
                confirmButtonColor: '#dc3545',
                confirmButtonText: '<i class="bi bi-x-lg"></i> Close',
                customClass: {
                    popup: 'validation-error-popup'
                }
            });
        },
        viewBookingDetails: function (bookingId) {
            const self = this;
            const booking = this.bookings.find(b => b.id === bookingId);

            if (!booking) {
                TempleCore.showToast('Booking not found', 'error');
                return;
            }

            // Debug log
            console.log('Booking details:', booking);
            console.log('Included services:', booking.included_services);
            console.log('Addon services:', booking.addon_services);

            // ========================================================================
            // SECTION 1: INCLUDED SERVICES (Part of Package - NO Additional Charge)
            // ========================================================================
            let includedServicesHTML = '';
            const includedServices = Array.isArray(booking.included_services) ? booking.included_services : [];
            const hasIncludedServices = includedServices.length > 0;

            if (hasIncludedServices) {
                includedServicesHTML = `
            <h6 class="text-success mb-3 mt-4">
                <i class="bi bi-check-circle"></i> Included Services (${includedServices.length})
                <small class="text-muted" style="font-size: 12px; font-weight: normal;">
                    - Part of package, no additional charge
                </small>
            </h6>
            <div class="included-services-list" style="
                border: 1px solid #d4edda;
                border-radius: 8px;
                padding: 15px;
                background: #f1f9f5;
                margin-bottom: 15px;
            ">
                ${includedServices.map((service, index) => {
                    const serviceName = service.service_name || 'Service';
                    const serviceNameSecondary = service.service_name_secondary || '';

                    return `
                        <div class="included-service-item" style="
                            padding: 10px;
                            margin-bottom: 8px;
                            background: white;
                            border-radius: 6px;
                            border-left: 4px solid #28a745;
                            display: flex;
                            align-items: center;
                        ">
                            <div style="
                                width: 30px;
                                height: 30px;
                                background: #28a745;
                                color: white;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin-right: 12px;
                                font-weight: bold;
                            ">
                                <i class="bi bi-check" style="font-size: 18px;"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 14px; font-weight: 600; color: #2c3e50;">
                                    ${serviceName}
                                </div>
                                ${serviceNameSecondary ? `
                                    <div style="font-size: 12px; color: #7f8c8d; margin-top: 2px;">
                                        ${serviceNameSecondary}
                                    </div>
                                ` : ''}
                            </div>
                            <div style="
                                background: #28a745;
                                color: white;
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 11px;
                                font-weight: bold;
                            ">
                                INCLUDED
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
            }

            // ========================================================================
            // SECTION 2: ADDON SERVICES (Separate Services WITH Additional Charges)
            // ========================================================================
            let addonServicesHTML = '';
            const addonServices = Array.isArray(booking.addon_services) ? booking.addon_services : [];
            const hasAddons = addonServices.length > 0;

            // Calculate addon total
            const addonTotal = addonServices.reduce((sum, addon) => {
                const price = parseFloat(addon.total_price || addon.amount || addon.unit_price || 0);
                return sum + price;
            }, 0);

            if (hasAddons) {
                addonServicesHTML = `
            <h6 class="text-primary mb-3 mt-4">
                <i class="bi bi-puzzle"></i> Add-on Services (${addonServices.length})
                <small class="text-muted" style="font-size: 12px; font-weight: normal;">
                    - Additional services with separate charges
                </small>
            </h6>
            <div class="addon-services-list" style="
                border: 1px solid #e3e6f0;
                border-radius: 8px;
                padding: 15px;
                background: #f8f9fc;
            ">
                ${addonServices.map((addon, index) => {
                    // Handle different possible property names
                    const addonName = addon.service_name || addon.item_name || addon.name || 'Addon Service';
                    const addonNameSecondary = addon.service_name_secondary || addon.item_name_secondary || addon.name_secondary || '';
                    const addonQty = addon.quantity || 1;
                    const addonPrice = parseFloat(addon.total_price || addon.amount || addon.unit_price || 0);

                    return `
                        <div class="addon-service-item" style="
                            padding: 12px;
                            margin-bottom: 10px;
                            background: white;
                            border-radius: 6px;
                            border-left: 4px solid #17a2b8;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        ">
                            <div class="d-flex justify-content-between align-items-center">
                                <div style="flex: 1;">
                                    <div style="font-size: 15px;">
                                        <strong style="color: #2c3e50;">${index + 1}. ${addonName}</strong>
                                    </div>
                                    ${addonNameSecondary ? `
                                        <div style="font-size: 13px; color: #7f8c8d; margin-top: 2px;">
                                            ${addonNameSecondary}
                                        </div>
                                    ` : ''}
                                    <div style="font-size: 12px; color: #95a5a6; margin-top: 4px;">
                                        <i class="bi bi-box"></i> Quantity: ${addonQty}
                                    </div>
                                </div>
                                <div class="text-end" style="min-width: 120px;">
                                    <div style="font-size: 18px; font-weight: bold; color: #17a2b8;">
                                        RM ${self.formatCurrency(addonPrice)}
                                    </div>
                                    ${addonQty > 1 ? `
                                        <div style="font-size: 11px; color: #95a5a6;">
                                            @ RM ${self.formatCurrency(addonPrice / addonQty)} each
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                <div class="addon-service-item" style="
                    border-top: 2px solid #17a2b8;
                    padding-top: 12px;
                    margin-top: 10px;
                    background: #e7f5f7;
                    padding: 12px;
                    border-radius: 6px;
                ">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong style="font-size: 16px; color: #2c3e50;">
                            <i class="bi bi-calculator"></i> Total Add-ons:
                        </strong>
                        <strong class="text-info" style="font-size: 20px;">
                            RM ${self.formatCurrency(addonTotal)}
                        </strong>
                    </div>
                </div>
            </div>
        `;
            }

            // ========================================================================
            // SECTION 3: AMOUNT BREAKDOWN
            // ========================================================================
            const packageAmount = parseFloat(booking.package_amount || booking.occasion_amount || 0);
            const subtotal = packageAmount + addonTotal;
            const discountAmount = parseFloat(booking.discount_amount || 0);
            const totalAmount = parseFloat(booking.total_amount || 0);
            const depositAmount = parseFloat(booking.deposit_amount || 0);
            const balanceDue = parseFloat(booking.balance_due || 0);

            // ========================================================================
            // SECTION 4: RELOCATION INFO (if enabled)
            // ========================================================================
            let relocationInfoHTML = '';
            if (booking.enable_relocation) {
                const currentAssignment = booking.current_assignment || {};
                relocationInfoHTML = `
            <h6 class="text-warning mb-3 mt-4">
                <i class="bi bi-geo-alt"></i> Seat/Location Assignment
            </h6>
            <table class="table table-sm table-borderless" style="background: #fff3cd; padding: 10px; border-radius: 8px;">
                <tr>
                    <th width="45%">Table:</th>
                    <td>${currentAssignment.table_number || '-'}</td>
                </tr>
                <tr>
                    <th>Seat/Number:</th>
                    <td><strong>${currentAssignment.seat_number || '-'}</strong></td>
                </tr>
                ${currentAssignment.row_number ? `
                <tr>
                    <th>Row:</th>
                    <td>${currentAssignment.row_number}</td>
                </tr>
                ` : ''}
                ${currentAssignment.column_number ? `
                <tr>
                    <th>Column:</th>
                    <td>${currentAssignment.column_number}</td>
                </tr>
                ` : ''}
            </table>
        `;
            }

            const detailsHTML = `
        <div class="booking-details-modal">
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary mb-3"><i class="bi bi-info-circle"></i> Booking Information</h6>
                    <table class="table table-sm table-borderless">
                        <tr>
                            <th width="45%">Booking Code:</th>
                            <td><strong>${booking.booking_code}</strong></td>
                        </tr>
                        <tr>
                            <th>Booking Date:</th>
                            <td>${self.formatDate(booking.booking_date)}</td>
                        </tr>
                        <tr>
                            <th>Status:</th>
                            <td>${self.getStatusBadge(booking.status)}</td>
                        </tr>
                    </table>
                    
                    <h6 class="text-primary mb-3 mt-4"><i class="bi bi-person"></i> Personal Details</h6>
                    <table class="table table-sm table-borderless">
                        <tr>
                            <th width="45%">Name (Chinese):</th>
                            <td>${booking.name_chinese}</td>
                        </tr>
                        <tr>
                            <th>Name (English):</th>
                            <td>${booking.name_english}</td>
                        </tr>
                        <tr>
                            <th>NRIC:</th>
                            <td>${booking.nric}</td>
                        </tr>
                        <tr>
                            <th>Email:</th>
                            <td>${booking.email}</td>
                        </tr>
                        <tr>
                            <th>Contact No:</th>
                            <td>${booking.contact_no}</td>
                        </tr>
                    </table>
                    
                    ${relocationInfoHTML}
                </div>
                
                <div class="col-md-6">
                    <h6 class="text-primary mb-3"><i class="bi bi-calendar-event"></i> Occasion Details</h6>
                    <table class="table table-sm table-borderless">
                        <tr>
                            <th width="45%">Occasion:</th>
                            <td><strong>${booking.occasion_name}</strong></td>
                        </tr>
                        <tr>
                            <th>Package:</th>
                            <td>${booking.occasion_option}</td>
                        </tr>
                    </table>
                    
                    ${includedServicesHTML}
                    
                    <h6 class="text-primary mb-3 mt-3"><i class="bi bi-calculator"></i> Amount Breakdown</h6>
                    <table class="table table-sm table-borderless" style="background: #f8f9fc; padding: 10px; border-radius: 8px;">
                        <tr>
                            <th width="45%">Package Amount:</th>
                            <td class="text-end"><strong>RM ${self.formatCurrency(packageAmount)}</strong></td>
                        </tr>
                        ${hasAddons ? `
                        <tr style="background: #e7f5f7;">
                            <th style="color: #17a2b8;">
                                <i class="bi bi-puzzle"></i> Add-ons (${addonServices.length}):
                            </th>
                            <td class="text-end">
                                <strong class="text-info">+ RM ${self.formatCurrency(addonTotal)}</strong>
                            </td>
                        </tr>
                        <tr style="border-top: 1px solid #dee2e6; font-weight: 600;">
                            <th>Subtotal:</th>
                            <td class="text-end"><strong>RM ${self.formatCurrency(subtotal)}</strong></td>
                        </tr>
                        ` : ''}
                        ${discountAmount > 0 ? `
                        <tr style="background: #fff3cd;">
                            <th style="color: #856404;">
                                <i class="bi bi-tag"></i> Discount:
                            </th>
                            <td class="text-end"><strong class="text-danger">- RM ${self.formatCurrency(discountAmount)}</strong></td>
                        </tr>
                        ` : ''}
                        <tr style="border-top: 2px solid #333; background: #d4edda;">
                            <th><strong style="font-size: 16px;">Total Amount:</strong></th>
                            <td class="text-end"><strong class="text-success" style="font-size: 20px;">RM ${self.formatCurrency(totalAmount)}</strong></td>
                        </tr>
                        ${booking.payment_status === 'SPLIT' && depositAmount > 0 ? `
                        <tr style="background: #fff3cd;">
                            <th><i class="bi bi-cash-coin"></i> Deposit Paid:</th>
                            <td class="text-end"><strong class="text-info">RM ${self.formatCurrency(depositAmount)}</strong></td>
                        </tr>
                        <tr style="background: #f8d7da;">
                            <th><i class="bi bi-exclamation-triangle"></i> Balance Due:</th>
                            <td class="text-end"><strong class="text-warning">RM ${self.formatCurrency(balanceDue)}</strong></td>
                        </tr>
                        ` : ''}
                        <tr>
                            <th>Payment Method:</th>
                            <td class="text-end">${booking.payment_methods}</td>
                        </tr>
                    </table>
                    
                    ${addonServicesHTML}
                    
                    ${booking.remark ? `
                    <h6 class="text-primary mb-3 mt-4"><i class="bi bi-chat-text"></i> Remarks</h6>
                    <div class="alert alert-info mb-0">
                        <i class="bi bi-info-circle"></i> ${booking.remark}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

            Swal.fire({
                title: `<i class="bi bi-file-text"></i> Booking Details - ${booking.booking_code}`,
                html: detailsHTML,
                width: '1000px',
                showCloseButton: true,
                showConfirmButton: true,
                confirmButtonText: '<i class="bi bi-x-lg"></i> Close',
                confirmButtonColor: '#6c757d',
                customClass: {
                    popup: 'booking-details-popup',
                    confirmButton: 'btn-lg'
                }
            });
        },
        deleteBooking: function (bookingId) {
            const self = this;
            const booking = this.bookings.find(b => b.id === bookingId);

            if (!booking) return;

            Swal.fire({
                title: 'Delete Booking?',
                html: `Are you sure you want to delete booking <strong>${booking.booking_code}</strong>?<br>This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.delete(`/special-occasions/bookings/${bookingId}`)
                        .done(function (response) {
                            if (response.success) {
                                self.loadBookings();
                                TempleCore.showToast('Booking deleted successfully', 'success');
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete booking', 'error');
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete booking', 'error');
                        });
                }
            });
        },
        bulkUpdateStatus: function (status) {
            const self = this;
            const count = this.selectedBookings.length;

            if (count === 0) {
                TempleCore.showToast('No bookings selected', 'warning');
                return;
            }

            const statusNames = {
                'pending': 'Pending',
                'confirmed': 'Confirmed',
                'cancelled': 'Cancelled',
                'completed': 'Completed'
            };

            Swal.fire({
                title: `Change Status to ${statusNames[status]}?`,
                text: `This will update ${count} booking(s).`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, update!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Bulk update API call
                    TempleAPI.put('/special-occasions/bookings/bulk-status', {
                        booking_ids: self.selectedBookings,
                        booking_status: status.toUpperCase()  // ✅ Fixed: correct field name and uppercase
                    })
                        .done(function (response) {
                            if (response.success) {
                                self.loadBookings();
                                $('.booking-checkbox').prop('checked', false);
                                $('#selectAll').prop('checked', false);
                                self.updateSelectedCount();
                                TempleCore.showToast(`${count} booking(s) updated to ${statusNames[status]}`, 'success');
                            } else {
                                TempleCore.showToast(response.message || 'Failed to update bookings', 'error');
                            }
                        })
                        .fail(function (xhr) {
                            console.error('Bulk update error:', xhr);
                            TempleCore.showToast('Failed to update bookings', 'error');
                        });
                }
            });
        },
        bulkDelete: function () {
            const self = this;
            const count = this.selectedBookings.length;

            if (count === 0) {
                TempleCore.showToast('No bookings selected', 'warning');
                return;
            }

            // Debug log to verify IDs
            console.log('Deleting bookings:', self.selectedBookings);

            Swal.fire({
                title: 'Delete Selected Bookings?',
                html: `Are you sure you want to delete <strong>${count}</strong> booking(s)?<br>This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete them!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.post('/special-occasions/bookings/bulk-delete', {
                        _method: 'DELETE',
                        booking_ids: self.selectedBookings
                    })
                        .done(function (response) {
                            if (response.success) {
                                self.loadBookings();
                                $('.booking-checkbox').prop('checked', false);
                                $('#selectAll').prop('checked', false);
                                self.updateSelectedCount();
                                TempleCore.showToast(`${count} booking(s) deleted successfully`, 'success');
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete bookings', 'error');
                            }
                        })
                        .fail(function (xhr) {
                            console.error('Bulk delete error:', xhr);
                            TempleCore.showToast('Failed to delete bookings', 'error');
                        });
                }
            });
        },

        bindEvents: function () {
            const self = this;

            // New Booking button
            $('#btnNewBooking').on('click.' + this.eventNamespace, function () {
                self.cleanup();
                TempleRouter.navigate('special-occasions/create');
            });

            // Print Report button
            $('#btnPrintReport').on('click.' + this.eventNamespace, function () {
                self.cleanup();
                TempleRouter.navigate('special-occasions/report');
            });

            // Filter buttons
            $('#btnApplyFilter').on('click.' + this.eventNamespace, function () {
                self.applyFilters();
            });

            $('#btnResetFilter').on('click.' + this.eventNamespace, function () {
                self.resetFilters();
            });

            // Select All checkbox
            $(document).on('change.' + this.eventNamespace, '#selectAll', function () {
                $('.booking-checkbox').prop('checked', $(this).is(':checked'));
                self.updateSelectedCount();
            });

            // Individual checkboxes
            $(document).on('change.' + this.eventNamespace, '.booking-checkbox', function () {
                const totalCheckboxes = $('.booking-checkbox').length;
                const checkedCheckboxes = $('.booking-checkbox:checked').length;
                $('#selectAll').prop('checked', totalCheckboxes === checkedCheckboxes);
                self.updateSelectedCount();
            });

            // Bulk action buttons
            $('#btnBulkConfirm').on('click.' + this.eventNamespace, function () {
                self.bulkUpdateStatus('confirmed');
            });

            $('#btnBulkPending').on('click.' + this.eventNamespace, function () {
                self.bulkUpdateStatus('pending');
            });

            $('#btnBulkCancel').on('click.' + this.eventNamespace, function () {
                self.bulkUpdateStatus('cancelled');
            });

            $('#btnBulkDelete').on('click.' + this.eventNamespace, function () {
                self.bulkDelete();
            });

            // View button
            $(document).on('click.' + this.eventNamespace, '.btn-view', function () {
                const bookingId = $(this).data('id');
                self.viewBookingDetails(bookingId);
            });

            // Print Receipt button
            $(document).on('click.' + this.eventNamespace, '.btn-print-receipt', function () {
                const bookingId = $(this).data('id');
                self.cleanup();
                TempleRouter.navigate('special-occasions/print', { id: bookingId });
            });

            // Delete button
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function () {
                const bookingId = $(this).data('id');
                self.deleteBooking(bookingId);
            });

            // ========================================
            // RELOCATION EVENT HANDLERS (STEP 1.2)
            // ========================================

            // Open Relocation Modal
            $(document).on('click.' + this.eventNamespace, '.btn-relocate', function () {
                const bookingId = $(this).data('id');
                self.openRelocationModal(bookingId);
            });

            // Confirm Relocation
            $(document).on('click.' + this.eventNamespace, '#btnConfirmRelocation', function () {
                self.confirmRelocation();
            });
        }
    };

})(jQuery, window);