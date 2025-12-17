// js/pages/hall-booking/listing.js
// Updated Hall Booking Listing Page with Print Functions

(function($, window) {
    'use strict';
    
	if (!window.HallSharedModule) {
        window.HallSharedModule = {
            moduleId: 'hall',
			eventNamespace: 'hall',
            cssId: 'hall-booking-css',
            cssPath: '/css/hall-booking.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Hall Booking CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Hall Booking page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Hall Booking page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                // If no more pages active, cleanup CSS
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
                // Remove CSS
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Hall Booking CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all hall-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Hall Booking module cleaned up');
            }
        };
    }
	
    window.HallBookingListingPage = {
        dataTable: null,
        pageId: 'donations-list',
        eventNamespace: window.HallSharedModule.eventNamespace,
        init: function(params) {
            window.HallSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.initDataTable();
        },
		// Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.HallSharedModule.unregisterPage(this.pageId);
            
            // Cleanup page-specific events (with page namespace)
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            // Cleanup page-specific animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            // Clear any intervals/timeouts
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
        
        render: function() {
            const html = `
                <div class="hall-booking-list-page">
                    <!-- Page Header -->
                    <div class="hall-booking-header" data-aos="fade-down">
                        <div class="hall-booking-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="hall-booking-title-wrapper">
                                        <i class="bi bi-building hall-booking-header-icon"></i>
                                        <div>
                                            <h1 class="hall-booking-title">Hall Bookings</h1>
                                            <p class="hall-booking-subtitle">Temple Hall Reservations</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg me-2" style="translate: none; rotate: none; scale: none; transform: translate(0px, 0px);" id="btnPrintReport">
                                        <i class="bi bi-file-earmark-text"></i> Print Report
                                    </button>
                                    <button class="btn btn-outline-light btn-lg" id="btnAddNew" style="translate: none; rotate: none; scale: none; transform: translate(0px, 0px);">
                                        <i class="bi bi-plus-circle"></i> New Booking
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Card -->
                    <div class="card shadow-sm mb-4 filter-card" data-aos="fade-up">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Date Range</label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="pending">Pending</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-primary me-2" id="btnApplyFilter">
                                        <i class="bi bi-search"></i> Apply Filter
                                    </button>
                                    <button class="btn btn-outline-secondary" id="btnResetFilter">
                                        <i class="bi bi-arrow-clockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bookings Table -->
                    <div class="card shadow-sm booking-table-card" data-aos="fade-up">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="bookingsTable" class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th width="10%">Booking No</th>
                                            <th width="15%">Customer</th>
                                            <th width="15%">Event</th>
                                            <th width="12%">Date</th>
                                            <th width="12%">Session</th>
                                            <th width="10%">Amount</th>
                                            <th width="10%">Status</th>
                                            <th width="16%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Booking Details Modal -->
                <div class="modal fade" id="bookingDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Booking Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="bookingDetailsContent">
                                <!-- Dynamic content -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="btnPrintReceipt">
                                    <i class="bi bi-printer"></i> Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        initAnimations: function() {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 100
                });
            }
            
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('.filter-card',
                    { opacity: 0, y: -20 },
                    { opacity: 1, y: 0, duration: 0.5, delay: 0.2 }
                );
                
                gsap.fromTo('.booking-table-card',
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, delay: 0.4 }
                );
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            // New booking button
            $('#btnAddNew').on('click.' + this.eventNamespace, function() {
				self.cleanup();
                TempleRouter.navigate('hall-booking/create');
            });
            
            // Print report button
            $('#btnPrintReport').on('click.' + this.eventNamespace, function() {
                self.openReportPrint();
            });
            
            // Apply filter
            $('#btnApplyFilter').on('click.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            // Reset filter
            $('#btnResetFilter').on('click.' + this.eventNamespace, function() {
                self.resetFilters();
            });
            
            // View booking details
            $(document).on('click.' + this.eventNamespace, '.btn-view-booking', function() {
                const bookingId = $(this).data('booking-id');
                self.viewBookingDetails(bookingId);
            });
            
            // Print individual receipt
            $(document).on('click.' + this.eventNamespace, '.btn-print-receipt', function() {
                const bookingId = $(this).data('booking-id');
                self.printReceipt(bookingId);
            });
            
            // Print receipt from modal
            $('#btnPrintReceipt').on('click.' + this.eventNamespace, function() {
                const bookingId = $(this).data('current-booking-id');
                if (bookingId) {
					$('#bookingDetailsModal').modal('hide');
                    self.printReceipt(bookingId);
                }
            });
        },
        
        // Initialize DataTable
        initDataTable: function() {
            const self = this;
            
            this.dataTable = $('#bookingsTable').DataTable({
                data: this.getSampleData(),
                columns: [
                    { data: 'booking_id' },
                    { 
                        data: 'booking_date',
                        render: function(data) {
                            return new Date(data).toLocaleDateString('en-MY');
                        }
                    },
                    { data: 'time_slot' },
                    { data: 'customer_name' },
                    { data: 'package_type' },
                    { 
                        data: 'total_amount',
                        render: function(data) {
                            return 'RM ' + parseFloat(data).toFixed(2);
                        }
                    },
                    {
                        data: 'status',
                        render: function(data) {
                            const statusClasses = {
                                pending: 'warning',
                                confirmed: 'success',
                                completed: 'info',
                                cancelled: 'danger'
                            };
                            const statusLabels = {
                                pending: 'Pending',
                                confirmed: 'Confirmed',
                                completed: 'Completed',
                                cancelled: 'Cancelled'
                            };
                            return `<span class="badge bg-${statusClasses[data]}">${statusLabels[data]}</span>`;
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-primary btn-view-booking" data-booking-id="${row.booking_id}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-edit-booking" data-booking-id="${row.booking_id}">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-danger btn-cancel-booking" data-booking-id="${row.booking_id}">
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[1, 'desc']],
                pageLength: 25,
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                language: {
                    search: 'Search:',
                    lengthMenu: 'Show _MENU_ entries',
                    info: 'Showing _START_ to _END_ of _TOTAL_ entries _START_ _END_ _TOTAL_',
                    paginate: {
                        first: 'First',
                        last: 'Last',
                        next: 'Next',
                        previous: 'Previous'
                    }
                }
            });
            
            // Animate table rows on load
            setTimeout(() => {
                gsap.fromTo('#bookingsTable tbody tr',
                    { opacity: 0, x: -20 },
                    {
                        opacity: 1,
                        x: 0,
                        duration: 0.3,
                        stagger: 0.05,
                        ease: 'power2.out'
                    }
                );
            }, 500);
        },
        
        // Get sample data
        getSampleData: function() {
            return [
                {
                    booking_id: 'HB2025001',
                    booking_date: '2025-12-25',
                    time_slot: 'First Session',
                    customer_name: 'John Tan',
                    package_type: 'Standard Hall',
                    total_amount: 8500.00,
                    status: 'confirmed'
                },
                {
                    booking_id: 'HB2025002',
                    booking_date: '2025-12-31',
                    time_slot: 'Second Session',
                    customer_name: 'Mary Wong',
                    package_type: 'Dinner Package A',
                    total_amount: 26640.00, // 30 tables x 888
                    status: 'pending'
                },
                {
                    booking_id: 'HB2025003',
                    booking_date: '2025-11-20',
                    time_slot: 'First Session',
                    customer_name: 'David Lee',
                    package_type: 'Standard Hall',
                    total_amount: 9200.00,
                    status: 'completed'
                },
                {
                    booking_id: 'HB2025004',
                    booking_date: '2026-01-15',
                    time_slot: 'Second Session',
                    customer_name: 'Sarah Lim',
                    package_type: 'Dinner Package B',
                    total_amount: 32640.00, // 30 tables x 1088
                    status: 'confirmed'
                },
                {
                    booking_id: 'HB2025005',
                    booking_date: '2025-10-10',
                    time_slot: 'First Session',
                    customer_name: 'Ahmad bin Ali',
                    package_type: 'Standard Hall',
                    total_amount: 8000.00,
                    status: 'cancelled'
                }
            ];
        },
        
        printReceipt: function(bookingId) {
			this.cleanup();
            // Navigate to receipt print page
            TempleRouter.navigate('hall-booking/print');
        },
        
        openReportPrint: function() {
			this.cleanup();
            // Navigate to report print page
            TempleRouter.navigate('hall-booking/report');
        },
        
        viewBookingDetails: function(bookingId) {
            // Load and display booking details in modal
            const bookingData = this.getSampleBookingDetails(bookingId);
            
            const html = `
                <div class="booking-details-view">
                    <h6><i class="bi bi-info-circle"></i> Basic Information</h6>
                    <table class="table table-borderless">
                        <tr><td class="fw-semibold">Booking No:</td><td>${bookingData.booking_code}</td></tr>
                        <tr><td class="fw-semibold">Customer:</td><td>${bookingData.customer.name}</td></tr>
                        <tr><td class="fw-semibold">Phone:</td><td>${bookingData.customer.phone}</td></tr>
                        <tr><td class="fw-semibold">Email:</td><td>${bookingData.customer.email}</td></tr>
                    </table>
                    
                    <h6><i class="bi bi-calendar-event"></i> Event Details</h6>
                    <table class="table table-borderless">
                        <tr><td class="fw-semibold">Event:</td><td>${bookingData.event.title}</td></tr>
                        <tr><td class="fw-semibold">Date:</td><td>${this.formatDate(bookingData.event.date)}</td></tr>
                        <tr><td class="fw-semibold">Session:</td><td>${bookingData.event.session}</td></tr>
                        <tr><td class="fw-semibold">Guests:</td><td>${bookingData.event.estimated_guests}</td></tr>
                    </table>
                    
                    <h6><i class="bi bi-currency-dollar"></i> Payment Information</h6>
                    <table class="table table-borderless">
                        <tr><td class="fw-semibold">Total Amount:</td><td>RM ${this.formatMoney(bookingData.payment.total_amount)}</td></tr>
                        <tr><td class="fw-semibold">Paid Amount:</td><td>RM ${this.formatMoney(bookingData.payment.paid_amount)}</td></tr>
                        <tr><td class="fw-semibold">Balance:</td><td class="text-danger">RM ${this.formatMoney(bookingData.payment.balance_amount)}</td></tr>
                        <tr><td class="fw-semibold">Status:</td><td><span class="badge bg-success">${bookingData.status.toUpperCase()}</span></td></tr>
                    </table>
                </div>
            `;
            
            $('#bookingDetailsContent').html(html);
            $('#btnPrintReceipt').data('current-booking-id', bookingId);
            $('#bookingDetailsModal').modal('show');
        },
        
        getSampleBookingDetails: function(bookingId) {
            // Return sample booking details
            return {
                id: bookingId,
                booking_code: 'HB2024' + String(bookingId).padStart(4, '0'),
                customer: {
                    name: 'Mr. John Doe',
                    phone: '+60123456789',
                    email: 'john.doe@email.com'
                },
                event: {
                    title: 'Wedding Reception',
                    date: '2024-12-25',
                    session: 'Second Session (6:00 PM - 11:00 PM)',
                    estimated_guests: 150
                },
                payment: {
                    total_amount: 33000.00,
                    paid_amount: 10000.00,
                    balance_amount: 23000.00
                },
                status: 'confirmed'
            };
        },
        
        applyFilters: function() {
            // Implement filter logic
            const fromDate = $('#filterDateFrom').val();
            const toDate = $('#filterDateTo').val();
            const status = $('#filterStatus').val();
            
            // Apply filters to DataTable
            this.dataTable.draw();
        },
        
        resetFilters: function() {
            $('#filterDateFrom').val('');
            $('#filterDateTo').val('');
            $('#filterStatus').val('');
            this.dataTable.draw();
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        },
        
        formatMoney: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }
    };
    
})(jQuery, window);