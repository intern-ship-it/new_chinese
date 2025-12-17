// js/pages/buddha-lamp/index.js
// Buddha Lamp Booking Listing Page - Dynamic Version with GSAP + AOS animations + Print Features

(function($, window) {
    'use strict';
    
    if (!window.BuddhaLampSharedModule) {
        window.BuddhaLampSharedModule = {
            moduleId: 'buddha-lamp',
            eventNamespace: 'buddha-lamp',
            cssId: 'buddha-lamp-css',
            cssPath: '/css/buddha-lamp.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Buddha Lamp CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Buddha Lamp page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Buddha Lamp page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            // Check if any pages are active
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            // Get active pages
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            // Cleanup module resources
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Buddha Lamp CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Buddha Lamp module cleaned up');
            }
        };
    }
    
    window.BuddhaLampPage = {
        dataTable: null,
        pageId: 'buddha-lamp-list',
        eventNamespace: window.BuddhaLampSharedModule.eventNamespace,
        bookingsData: [],
        pagination: null,
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.BuddhaLampSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadData();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.BuddhaLampSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="buddha-lamp-list-page">
                    <!-- Page Header with Animation -->
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Buddha Lamp Bookings</h1>
                                            <p class="buddha-lamp-subtitle">佛前灯预订 • Temple Buddha Lamp Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-outline-light btn-lg" id="btnPrintReport">
                                            <i class="bi bi-file-text"></i> Print Report
                                        </button>
                                        <button class="btn btn-outline-light btn-lg" id="btnAddNew">
                                            <i class="bi bi-plus-circle"></i> New Booking
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="row mb-4" data-aos="fade-up" data-aos-duration="800">
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-brightness-high"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Bookings</div>
                                        <div class="stat-value" id="totalBookings">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card stat-card-success">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-cash-stack"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Amount</div>
                                        <div class="stat-value" id="totalAmount">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-check"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">This Month</div>
                                        <div class="stat-value" id="thisMonth">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card stat-card-info">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Confirmed</div>
                                        <div class="stat-value" id="confirmedCount">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Card -->
                    <div class="card shadow-sm mb-4 filter-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-2">
                                    <label class="form-label">Date From</label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Date To</label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Booking Status</label>
                                    <select class="form-select" id="filterBookingStatus">
                                        <option value="">All Status</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Payment Status</label>
                                    <select class="form-select" id="filterPaymentStatus">
                                        <option value="">All Payment</option>
                                        <option value="FULL">Fully Paid</option>
                                        <option value="PARTIAL">Partial</option>
                                        <option value="PENDING">Pending</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="filterSearch" placeholder="Name, NRIC, Booking No...">
                                </div>
                                <div class="col-md-2 d-flex align-items-end gap-2">
                                    <button class="btn btn-primary flex-grow-1" id="btnApplyFilter">
                                        <i class="bi bi-funnel"></i> Filter
                                    </button>
                                    <button class="btn btn-outline-secondary" id="btnClearFilter" title="Clear Filters">
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table Card -->
                    <div class="card shadow-sm table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body">
                            <!-- Loading State -->
                            <div id="tableLoading" class="text-center py-5" style="display: none;">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2 text-muted">Loading bookings...</p>
                            </div>
                            
                            <!-- Table -->
                            <div class="table-responsive" id="tableContainer">
                                <table id="buddhaLampTable" class="table table-hover" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>Booking No.</th>
                                            <th>Name (Chinese)</th>
                                            <th>Name (English)</th>
                                            <th>Contact No.</th>
                                            <th>Amount (RM)</th>
                                            <th>Payment Method</th>
                                            <th>Booking Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Data will be loaded via API -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Empty State -->
                            <div id="emptyState" class="text-center py-5" style="display: none;">
                                <i class="bi bi-inbox text-muted" style="font-size: 4rem;"></i>
                                <h4 class="mt-3 text-muted">No Bookings Found</h4>
                                <p class="text-muted">There are no Buddha Lamp bookings matching your criteria.</p>
                                <button class="btn btn-primary" id="btnEmptyAddNew">
                                    <i class="bi bi-plus-circle"></i> Create New Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Initialize animations
        initAnimations: function() {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }
            
            gsap.fromTo('.stat-card',
                { scale: 0.9, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'back.out(1.2)',
                    clearProps: 'all'
                }
            );
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Add new booking button
            $('#btnAddNew, #btnEmptyAddNew').on('click.' + this.eventNamespace, function() {
                gsap.to(this, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        self.cleanup();
                        TempleRouter.navigate('buddha-lamp/create');
                    }
                });
            });
            
            // Print Report button
            $('#btnPrintReport').on('click.' + this.eventNamespace, function() {
                gsap.to(this, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        self.openReportPrint();
                    }
                });
            });
            
            // Apply filter button
            $('#btnApplyFilter').on('click.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            // Clear filter button
            $('#btnClearFilter').on('click.' + this.eventNamespace, function() {
                self.clearFilters();
            });
            
            // Search on Enter key
            $('#filterSearch').on('keypress.' + this.eventNamespace, function(e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });
            
            // Button hover animations
            $('.btn').hover(
                function() {
                    gsap.to($(this), {
                        scale: 1.05,
                        duration: 0.2,
                        ease: 'power1.out'
                    });
                },
                function() {
                    gsap.to($(this), {
                        scale: 1,
                        duration: 0.2
                    });
                }
            );
        },
        
        // Load data from API
        loadData: function(filters = {}) {
            const self = this;
            
            // Show loading
            $('#tableLoading').show();
            $('#tableContainer').hide();
            $('#emptyState').hide();
            
            // Build query params
            const params = {
                per_page: 100, // Get more records for client-side pagination
                sort_by: 'created_at',
                sort_order: 'desc',
                ...filters
            };
            
            TempleAPI.get('/bookings/buddha-lamp', params)
                .done(function(response) {
                    if (response.success) {
                        self.bookingsData = response.data || [];
                        self.pagination = response.pagination || null;
                        
                        if (self.bookingsData.length > 0) {
                            self.initDataTable(self.bookingsData);
                            self.updateStats(self.bookingsData);
                            $('#tableContainer').show();
                            $('#emptyState').hide();
                        } else {
                            $('#tableContainer').hide();
                            $('#emptyState').show();
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load bookings', 'error');
                        $('#emptyState').show();
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load bookings:', xhr);
                    let errorMessage = 'Failed to load bookings';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                    $('#emptyState').show();
                })
                .always(function() {
                    $('#tableLoading').hide();
                });
        },
        
        // Initialize DataTable with data
        initDataTable: function(data) {
            const self = this;
            
            // Destroy existing DataTable if exists
            if (this.dataTable) {
                this.dataTable.destroy();
                $('#buddhaLampTable tbody').empty();
            }
            
            // Format data for DataTable
            const formattedData = data.map(booking => ({
                id: booking.id,
                booking_number: booking.booking_number,
                name_chinese: booking.name_secondary || '-',
                name_english: booking.name_primary || '-',
                contact_no: booking.phone_no || '-',
                amount: parseFloat(booking.total_amount) || 0,
                payment_method: booking.payment ? booking.payment.payment_method : '-',
                booking_date: booking.booking_date || '-',
                booking_status: booking.booking_status,
                payment_status: booking.payment_status
            }));
            
            // Initialize DataTable
            this.dataTable = $('#buddhaLampTable').DataTable({
                data: formattedData,
                columns: [
                    { 
                        data: 'booking_number',
                        render: function(data) {
                            return `<span class="fw-bold text-primary">${data}</span>`;
                        }
                    },
                    { data: 'name_chinese' },
                    { data: 'name_english' },
                    { data: 'contact_no' },
                    { 
                        data: 'amount',
                        render: function(data) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    { 
                        data: 'payment_method',
                        render: function(data) {
                            return self.getPaymentMethodBadge(data);
                        }
                    },
                    { 
                        data: 'booking_date',
                        render: function(data) {
                            if (!data || data === '-') return '-';
                            return self.formatDate(data);
                        }
                    },
                    {
                        data: null,
                        render: function(data, type, row) {
                            return self.getStatusBadges(row.booking_status, row.payment_status);
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            const isCancelled = row.booking_status === 'CANCELLED';
                            return `
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-info btn-print" data-id="${row.id}" data-booking="${row.booking_number}" title="Print Receipt">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                    <button class="btn btn-outline-primary btn-view" data-id="${row.id}" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-success btn-edit" data-id="${row.id}" title="Edit" ${isCancelled ? 'disabled' : ''}>
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-cancel" data-id="${row.id}" data-booking="${row.booking_number}" title="Cancel" ${isCancelled ? 'disabled' : ''}>
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[6, 'desc']], // Sort by booking date descending
                responsive: true,
                pageLength: 25,
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ bookings",
                    infoEmpty: "No bookings found",
                    infoFiltered: "(filtered from _MAX_ total)",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                drawCallback: function() {
                    self.bindTableActions();
                    self.animateTableRows();
                }
            });
        },
        
        // Format date
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },
        
        // Get payment method badge
        getPaymentMethodBadge: function(method) {
            if (!method || method === '-') return '<span class="badge bg-secondary">-</span>';
            
            const methodLower = method.toLowerCase();
            const badges = {
                'cash': '<span class="badge bg-success">Cash</span>',
                'cheque': '<span class="badge bg-info">Cheque</span>',
                'e-banking': '<span class="badge bg-primary">e-Banking</span>',
                'ebanking': '<span class="badge bg-primary">e-Banking</span>',
                'credit card': '<span class="badge bg-warning text-dark">Credit Card</span>',
                'debit card': '<span class="badge bg-warning text-dark">Debit Card</span>',
                'card': '<span class="badge bg-warning text-dark">Card</span>',
                'duitnow': '<span class="badge bg-danger">DuitNow</span>',
                'eghl qr': '<span class="badge bg-purple">EGHL QR</span>'
            };
            
            return badges[methodLower] || `<span class="badge bg-secondary">${method}</span>`;
        },
        
        // Get status badges
        getStatusBadges: function(bookingStatus, paymentStatus) {
            const bookingBadges = {
                'CONFIRMED': '<span class="badge bg-success">Confirmed</span>',
                'PENDING': '<span class="badge bg-warning text-dark">Pending</span>',
                'COMPLETED': '<span class="badge bg-info">Completed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>',
                'FAILED': '<span class="badge bg-dark">Failed</span>'
            };
            
            const paymentBadges = {
                'FULL': '<span class="badge bg-success">Paid</span>',
                'PARTIAL': '<span class="badge bg-warning text-dark">Partial</span>',
                'PENDING': '<span class="badge bg-secondary">Unpaid</span>'
            };
            
            const booking = bookingBadges[bookingStatus] || `<span class="badge bg-secondary">${bookingStatus}</span>`;
            const payment = paymentBadges[paymentStatus] || '';
            
            return `<div class="d-flex flex-column gap-1">${booking}${payment ? '<br>' + payment : ''}</div>`;
        },
        
        // Bind table actions
        bindTableActions: function() {
            const self = this;
            
            // Print Receipt button
            $('.btn-print').off('click').on('click.' + this.eventNamespace, function() {
                const id = $(this).data('id');
                const bookingNumber = $(this).data('booking');
                self.printReceipt(id, bookingNumber);
            });
            
            // View button
            $('.btn-view').off('click').on('click.' + this.eventNamespace, function() {
                const id = $(this).data('id');
                self.viewBooking(id);
            });
            
            // Edit button
            $('.btn-edit').off('click').on('click.' + this.eventNamespace, function() {
                const id = $(this).data('id');
                if (!$(this).prop('disabled')) {
                    self.editBooking(id);
                }
            });
            
            // Cancel button
            $('.btn-cancel').off('click').on('click.' + this.eventNamespace, function() {
                const id = $(this).data('id');
                const bookingNumber = $(this).data('booking');
                if (!$(this).prop('disabled')) {
                    self.cancelBooking(id, bookingNumber);
                }
            });
        },
        
        // Animate table rows
        animateTableRows: function() {
            const visibleRows = $('#buddhaLampTable tbody tr:visible').slice(0, 25);
            gsap.fromTo(visibleRows, 
                { opacity: 0, y: 20 },
                { 
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    stagger: 0.03,
                    ease: 'power2.out',
                    clearProps: 'all'
                }
            );
        },
        
        // Print Receipt
        printReceipt: function(id, bookingNumber) {
            const self = this;
            const $printBtn = $(`.btn-print[data-id="${id}"]`);
            const originalHtml = $printBtn.html();
            $printBtn.html('<i class="bi bi-hourglass-split"></i>').prop('disabled', true);
            
            gsap.to($printBtn[0], {
                scale: 0.9,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp/print', { id: id });
                    
                    setTimeout(() => {
                        $printBtn.html(originalHtml).prop('disabled', false);
                    }, 1000);
                }
            });
            
            TempleCore.showToast('Opening receipt print...', 'info');
        },
        
        // Open Report Print
        openReportPrint: function() {
            console.log('Opening Buddha Lamp report print...');
            
            const filters = {
                dateFrom: $('#filterDateFrom').val(),
                dateTo: $('#filterDateTo').val(),
                bookingStatus: $('#filterBookingStatus').val(),
                paymentStatus: $('#filterPaymentStatus').val()
            };
            
            this.cleanup();
            TempleRouter.navigate('buddha-lamp/report', filters);
        },
        
        // View booking
        viewBooking: function(id) {
            console.log('View booking:', id);
            this.cleanup();
            TempleRouter.navigate('buddha-lamp/view', { id: id });
        },
        
        // Edit booking
        editBooking: function(id) {
            console.log('Edit booking:', id);
            this.cleanup();
            TempleRouter.navigate('buddha-lamp/edit', { id: id });
        },
        
        // Cancel booking
        cancelBooking: function(id, bookingNumber) {
            const self = this;
            
            Swal.fire({
                title: 'Cancel Booking?',
                html: `Are you sure you want to cancel booking <strong>${bookingNumber}</strong>?<br><br>This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, Cancel Booking',
                cancelButtonText: 'No, Keep It'
            }).then((result) => {
                if (result.isConfirmed) {
                    self.performCancel(id, bookingNumber);
                }
            });
        },
        
        // Perform cancel API call
        performCancel: function(id, bookingNumber) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/bookings/buddha-lamp/${id}/cancel`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(`Booking ${bookingNumber} cancelled successfully`, 'success');
                        
                        // Animate row removal and reload
                        const row = $(`.btn-cancel[data-id="${id}"]`).closest('tr');
                        gsap.to(row[0], {
                            opacity: 0,
                            x: -50,
                            duration: 0.3,
                            onComplete: () => {
                                self.loadData(self.getCurrentFilters());
                            }
                        });
                    } else {
                        TempleCore.showToast(response.message || 'Failed to cancel booking', 'error');
                    }
                })
                .fail(function(xhr) {
                    let errorMessage = 'Failed to cancel booking';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Get current filters
        getCurrentFilters: function() {
            const filters = {};
            
            const dateFrom = $('#filterDateFrom').val();
            const dateTo = $('#filterDateTo').val();
            const bookingStatus = $('#filterBookingStatus').val();
            const paymentStatus = $('#filterPaymentStatus').val();
            const search = $('#filterSearch').val();
            
            if (dateFrom) filters.from_date = dateFrom;
            if (dateTo) filters.to_date = dateTo;
            if (bookingStatus) filters.booking_status = bookingStatus;
            if (paymentStatus) filters.payment_status = paymentStatus;
            if (search) filters.search = search;
            
            return filters;
        },
        
        // Apply filters
        applyFilters: function() {
            const filters = this.getCurrentFilters();
            
            gsap.to('#btnApplyFilter', {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
            
            this.loadData(filters);
            TempleCore.showToast('Filters applied', 'info');
        },
        
        // Clear filters
        clearFilters: function() {
            $('#filterDateFrom').val('');
            $('#filterDateTo').val('');
            $('#filterBookingStatus').val('');
            $('#filterPaymentStatus').val('');
            $('#filterSearch').val('');
            
            this.loadData();
            TempleCore.showToast('Filters cleared', 'info');
        },
        
        // Update statistics
        updateStats: function(data) {
            const totalBookings = data.length;
            const totalAmount = data.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
            
            // This month count
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const thisMonth = data.filter(item => {
                if (!item.booking_date) return false;
                const bookingDate = new Date(item.booking_date);
                return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
            }).length;
            
            // Confirmed count
            const confirmedCount = data.filter(item => item.booking_status === 'CONFIRMED').length;
            
            // Animate counter updates
            this.animateCounter('#totalBookings', 0, totalBookings, 1000);
            this.animateCounter('#totalAmount', 0, totalAmount, 1000, 'RM ');
            this.animateCounter('#thisMonth', 0, thisMonth, 1000);
            this.animateCounter('#confirmedCount', 0, confirmedCount, 1000);
        },
        
        // Animate counter
        animateCounter: function(selector, start, end, duration, prefix = '') {
            const obj = { value: start };
            gsap.to(obj, {
                value: end,
                duration: duration / 1000,
                ease: 'power1.out',
                onUpdate: function() {
                    if (prefix === 'RM ') {
                        $(selector).text(prefix + obj.value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
                    } else {
                        $(selector).text(Math.round(obj.value));
                    }
                }
            });
        }
    };
    
})(jQuery, window);