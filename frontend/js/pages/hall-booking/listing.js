// js/pages/hall-booking/listing.js
// Hall Booking Listing Page with DataTables

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
        pageId: 'hall-list',
        eventNamespace: window.HallSharedModule.eventNamespace,
        // Page initialization
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
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="hall-booking-list-page">
                    <!-- Page Header with Animation -->
                    <div class="hall-booking-header" data-aos="fade-down" data-aos-duration="1000">
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
                                    <button class="btn btn-outline-light btn-lg" id="btnAddNew" style="translate: none; rotate: none; scale: none; transform: translate(0px, 0px);">
                                        <i class="bi bi-plus-circle"></i> New Booking
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Card -->
                    <div class="card shadow-sm mb-4 filter-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Date Range</label>
                                    <input type="date" class="form-control" id="filterDateFrom" placeholder="From ?">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <input type="date" class="form-control" id="filterDateTo" placeholder="To ?">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Package</label>
                                    <select class="form-select" id="filterPackage">
                                        <option value="">All Packages</option>
                                        <option value="standard">Standard Hall</option>
                                        <option value="dinner">Dinner Package</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <button class="btn btn-primary" id="btnApplyFilter">
                                        <i class="bi bi-funnel"></i> Apply Filter
                                    </button>
                                    <button class="btn btn-secondary" id="btnResetFilter">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bookings Table Card -->
                    <div class="card shadow-sm booking-table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="bookingsTable" class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Booking ID</th>
                                            <th>Date</th>
                                            <th>Time Slot</th>
                                            <th>Customer</th>
                                            <th>Package</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Sample data will be loaded via DataTables -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Details Modal -->
                ${this.getViewDetailsModal()}
            `;
            
            $('#page-container').html(html);
        },
        
        // Get View Details Modal
        getViewDetailsModal: function() {
            return `
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Booking Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="bookingDetailsContent">
                                <!-- Details will be loaded here -->
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
        },
        
        // Initialize animations
        initAnimations: function() {
            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 100
                });
            }
            
            // GSAP animations
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
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // New booking button
            $('#btnAddNew').on('click.' + this.eventNamespace, function() {
                TempleRouter.navigate('hall-booking/create');
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
            $(document).on('click', '.btn-view-booking.' + this.eventNamespace, function() {
                const bookingId = $(this).data('booking-id');
                self.viewBookingDetails(bookingId);
            });
            
            // Print receipt
            $('#btnPrintReceipt').on('click.' + this.eventNamespace, function() {
                window.print();
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
        
        // Apply filters
        applyFilters: function() {
            const dateFrom = $('#filterDateFrom').val();
            const dateTo = $('#filterDateTo').val();
            const status = $('#filterStatus').val();
            const packageType = $('#filterPackage').val();
            
            // Custom filter function
            $.fn.dataTable.ext.search.push(
                function(settings, data, dataIndex) {
                    const rowDate = new Date(data[1]);
                    const fromDate = dateFrom ? new Date(dateFrom) : null;
                    const toDate = dateTo ? new Date(dateTo) : null;
                    
                    // Date filter
                    if (fromDate && rowDate < fromDate) return false;
                    if (toDate && rowDate > toDate) return false;
                    
                    // Status filter
                    if (status && !data[6].includes(status)) return false;
                    
                    // Package filter
                    if (packageType && !data[4].toLowerCase().includes(packageType)) return false;
                    
                    return true;
                }
            );
            
            this.dataTable.draw();
            
            // Remove filter after drawing
            $.fn.dataTable.ext.search.pop();
            
            // Animate filtered results
            gsap.fromTo('#bookingsTable tbody tr',
                { opacity: 0 },
                { opacity: 1, duration: 0.3, stagger: 0.02 }
            );
        },
        
        // Reset filters
        resetFilters: function() {
            $('#filterDateFrom').val('');
            $('#filterDateTo').val('');
            $('#filterStatus').val('');
            $('#filterPackage').val('');
            
            this.dataTable.search('').draw();
            
            // Animate reset
            gsap.fromTo('#bookingsTable tbody tr',
                { opacity: 0 },
                { opacity: 1, duration: 0.3, stagger: 0.02 }
            );
        },
        
        // View booking details
        viewBookingDetails: function(bookingId) {
            // Sample booking details
            const bookingDetails = {
                booking_id: bookingId,
                booking_date: '2025-12-25',
                time_slot: 'First Session (9:00 AM - 2:00 PM)',
                customer: {
                    name: 'John Tan Ah Kow',
                    mobile: '+60 12-345-6789',
                    email: 'john.tan@email.com',
                    ic: '850101-01-1234',
                    address: '123 Jalan Harmony, Kuala Lumpur'
                },
                package: {
                    type: 'Standard Hall Rental',
                    amount: 8000.00
                },
                addons: [
                    { name: 'VIP Room', qty: 1, unit_price: 400.00, total: 400.00 },
                    { name: 'Round Table', qty: 5, unit_price: 16.00, total: 80.00 }
                ],
                extra_charges: [
                    { description: 'Decoration Setup', amount: 200.00 }
                ],
                payment: {
                    type: 'Full Payment',
                    method: 'Cash',
                    total: 8680.00
                },
                status: 'Confirmed'
            };
            
            const html = `
                <div class="booking-details-view">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <h6 class="text-primary">Booking Information</h6>
                            <table class="table table-sm">
                                <tr>
                                    <td class="fw-semibold">Booking ID:</td>
                                    <td>${bookingDetails.booking_id}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">Date:</td>
                                    <td>${bookingDetails.booking_date}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">Time Slot:</td>
                                    <td>${bookingDetails.time_slot}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">Status:</td>
                                    <td><span class="badge bg-success">${bookingDetails.status}</span></td>
                                </tr>
                            </table>
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="text-primary">Customer Details</h6>
                            <table class="table table-sm">
                                <tr>
                                    <td class="fw-semibold">Name:</td>
                                    <td>${bookingDetails.customer.name}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">Mobile:</td>
                                    <td>${bookingDetails.customer.mobile}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">Email:</td>
                                    <td>${bookingDetails.customer.email}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">IC No:</td>
                                    <td>${bookingDetails.customer.ic}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div class="col-12">
                            <h6 class="text-primary">Package & Services</h6>
                            <table class="table table-bordered">
                                <thead class="table-light">
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>${bookingDetails.package.type}</td>
                                        <td>1</td>
                                        <td>RM ${bookingDetails.package.amount.toFixed(2)}</td>
                                        <td>RM ${bookingDetails.package.amount.toFixed(2)}</td>
                                    </tr>
                                    ${bookingDetails.addons.map(addon => `
                                        <tr>
                                            <td>${addon.name}</td>
                                            <td>${addon.qty}</td>
                                            <td>RM ${addon.unit_price.toFixed(2)}</td>
                                            <td>RM ${addon.total.toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                    ${bookingDetails.extra_charges.map(charge => `
                                        <tr>
                                            <td colspan="3">${charge.description}</td>
                                            <td>RM ${charge.amount.toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                    <tr class="table-primary fw-bold">
                                        <td colspan="3" class="text-end">Total Amount:</td>
                                        <td>RM ${bookingDetails.payment.total.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="text-primary">Payment Information</h6>
                            <table class="table table-sm">
                                <tr>
                                    <td class="fw-semibold">Payment Type:</td>
                                    <td>${bookingDetails.payment.type}</td>
                                </tr>
                                <tr>
                                    <td class="fw-semibold">Payment Method:</td>
                                    <td>${bookingDetails.payment.method}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            $('#bookingDetailsContent').html(html);
            
            const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
            modal.show();
            
            // Animate modal content
            gsap.fromTo('.booking-details-view',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5 }
            );
        }
    };
    
})(jQuery, window);