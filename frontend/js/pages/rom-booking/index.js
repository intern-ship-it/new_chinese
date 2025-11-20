// js/pages/rom-booking/index.js
// ROM Booking List Page with DataTables and animations

(function($, window) {
    'use strict';
    if (!window.RomSharedModule) {
        window.RomSharedModule = {
            moduleId: 'rom',
			eventNamespace: 'rom',
            cssId: 'rom-css',
            cssPath: '/css/rom-booking.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
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
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Rom page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Rom page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
    window.RomBookingPage = {
        dataTable: null,
        pageId: 'rom-list',
        eventNamespace: window.RomSharedModule.eventNamespace,
        // Page initialization
        init: function(params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.initDataTable();
            this.loadData();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.RomSharedModule.unregisterPage(this.pageId);
            
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
                <div class="rom-booking-list-page">
                    <!-- Page Header -->
                    <div class="rom-booking-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="rom-booking-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="rom-booking-title-wrapper">
                                        <i class="bi bi-heart-fill rom-booking-header-icon"></i>
                                        <div>
                                            <h1 class="rom-booking-title">ROM Booking Management</h1>
                                            <p class="rom-booking-subtitle">Marriage Registration Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg me-2" id="btnRefresh">
                                        <i class="bi bi-arrow-clockwise"></i> Refresh
                                    </button>
                                    <button class="btn btn-outline-light btn-lg" id="btnNewBooking">
                                        <i class="bi bi-plus-circle"></i> New Booking
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="container-fluid mb-4" data-aos="fade-up" data-aos-delay="200">
                        <div class="row">
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="stat-card">
                                    <div class="stat-card-icon total">
                                        <i class="bi bi-calendar-heart"></i>
                                    </div>
                                    <div class="stat-card-content">
                                        <div class="stat-value" id="totalBookings">0</div>
                                        <div class="stat-label">Total Bookings</div>
                                        <small class="stat-subtitle">All time bookings</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="stat-card">
                                    <div class="stat-card-icon pending">
                                        <i class="bi bi-clock-history"></i>
                                    </div>
                                    <div class="stat-card-content">
                                        <div class="stat-value" id="pendingBookings">0</div>
                                        <div class="stat-label">Pending</div>
                                        <small class="stat-subtitle">Awaiting confirmation</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="stat-card">
                                    <div class="stat-card-icon confirmed">
                                        <i class="bi bi-check-circle-fill"></i>
                                    </div>
                                    <div class="stat-card-content">
                                        <div class="stat-value" id="confirmedBookings">0</div>
                                        <div class="stat-label">Confirmed</div>
                                        <small class="stat-subtitle">Ready for ceremony</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="stat-card">
                                    <div class="stat-card-icon completed">
                                        <i class="bi bi-award-fill"></i>
                                    </div>
                                    <div class="stat-card-content">
                                        <div class="stat-value" id="completedBookings">0</div>
                                        <div class="stat-label">Completed</div>
                                        <small class="stat-subtitle">Ceremonies done</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Section -->
                    <div class="container-fluid mb-4" data-aos="fade-up" data-aos-delay="300">
                        <div class="card filter-card">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5 class="mb-0">
                                            <i class="bi bi-funnel"></i> Search & Filter Bookings
                                        </h5>
                                    </div>
                                    <div class="col-md-6 text-md-end">
                                        <button type="button" class="btn btn-outline-secondary btn-sm" id="btnResetFilter">
                                            <i class="bi bi-arrow-counterclockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3 mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="filterStatus">
                                            <option value="">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <label class="form-label">Venue</label>
                                        <select class="form-select" id="filterVenue">
                                            <option value="">All Venues</option>
                                            <option value="1">Main Temple Hall</option>
                                            <option value="2">Garden Pavilion</option>
                                            <option value="3">Sacred Chamber</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <label class="form-label">Date From</label>
                                        <input type="date" class="form-control" id="filterDateFrom">
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <label class="form-label">Date To</label>
                                        <input type="date" class="form-control" id="filterDateTo">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Search</label>
                                        <div class="input-group">
                                            <span class="input-group-text">
                                                <i class="bi bi-search"></i>
                                            </span>
                                            <input type="text" class="form-control" id="filterSearch" placeholder="Search by name, IC, phone...">
                                        </div>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <label class="form-label">Session</label>
                                        <select class="form-select" id="filterSession">
                                            <option value="">All Sessions</option>
                                            <option value="am">Morning (AM)</option>
                                            <option value="pm">Afternoon (PM)</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 mb-3 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary w-100" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Apply Filter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bookings Table -->
                    <div class="container-fluid" data-aos="fade-up" data-aos-delay="400">
                        <div class="card table-card">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5 class="mb-0">
                                            <i class="bi bi-list-ul"></i> ROM Bookings List
                                        </h5>
                                    </div>
                                    <div class="col-md-6 text-md-end">
                                        <div class="btn-group">
                                            <button type="button" class="btn btn-outline-primary btn-sm" id="btnExportExcel">
                                                <i class="bi bi-file-earmark-excel"></i> Excel
                                            </button>
                                            <button type="button" class="btn btn-outline-primary btn-sm" id="btnExportPDF">
                                                <i class="bi bi-file-earmark-pdf"></i> PDF
                                            </button>
                                            <button type="button" class="btn btn-outline-primary btn-sm" id="btnPrint">
                                                <i class="bi bi-printer"></i> Print
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover" id="romBookingsTable">
                                        <thead>
                                            <tr>
                                                <th>Booking ID</th>
                                                <th>Couple Names</th>
                                                <th>Venue</th>
                                                <th>Date & Session</th>
                                                <th>Contact</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Data will be populated by DataTables -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status Update Modal -->
                <div class="modal fade" id="statusUpdateModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil-square"></i> Update Booking Status
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="statusUpdateForm">
                                    <input type="hidden" id="updateBookingId">
                                    <div class="mb-3">
                                        <label class="form-label">New Status</label>
                                        <select class="form-select" id="newStatus" required>
                                            <option value="">Select Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Notes (Optional)</label>
                                        <textarea class="form-control" id="statusNotes" rows="3" placeholder="Add any notes about this status change..."></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnUpdateStatus">
                                    <i class="bi bi-check-circle"></i> Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Details Modal -->
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-eye"></i> Booking Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="viewDetailsContent">
                                <!-- Content will be loaded dynamically -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="btnEditFromView">
                                    <i class="bi bi-pencil-square"></i> Edit Booking
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
            // AOS initialization
            AOS.init({
                duration: 1000,
                easing: 'ease-out-cubic',
                once: true,
                offset: 100
            });
            
            // GSAP header animation
            gsap.timeline()
                .from('.rom-booking-title', {
                    y: 30,
                    opacity: 0,
                    duration: 1,
                    ease: 'back.out(1.7)'
                })
                .from('.rom-booking-subtitle', {
                    y: 20,
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power3.out'
                }, '-=0.6');
                
            // Statistics cards animation
            gsap.from('.stat-card', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                delay: 0.5,
                ease: 'back.out(1.7)'
            });
        },
        
        // Initialize DataTable
        initDataTable: function() {
            this.dataTable = $('#romBookingsTable').DataTable({
                responsive: true,
                processing: true,
                serverSide: false, // Changed to false for frontend demo
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
                order: [[0, 'desc']],
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>t<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                language: {
                    search: "Search bookings:",
                    lengthMenu: "Show _MENU_ bookings per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ bookings",
                    emptyTable: "No ROM bookings found",
                    zeroRecords: "No matching bookings found"
                },
                columns: [
                    { 
                        data: 'id',
                        render: function(data) {
                            return `<strong class="booking-id">ROM-${String(data).padStart(4, '0')}</strong>`;
                        }
                    },
                    { 
                        data: null,
                        render: function(data) {
                            return `
                                <div class="couple-names">
                                    <div><strong>${data.bride_name}</strong> (Bride)</div>
                                    <div><strong>${data.groom_name}</strong> (Groom)</div>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: 'venue_name',
                        render: function(data, type, row) {
                            return `
                                <div class="venue-info">
                                    <div><strong>${data}</strong></div>
                                    <small class="text-muted">${row.venue_location}</small>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: null,
                        render: function(data) {
                            const date = new Date(data.booking_date);
                            const sessionText = data.session === 'am' ? 'Morning (9:00 AM - 12:00 PM)' : 'Afternoon (2:00 PM - 5:00 PM)';
                            return `
                                <div class="datetime-info">
                                    <div><strong>${date.toLocaleDateString('en-GB')}</strong></div>
                                    <small class="text-muted">${sessionText}</small>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: 'registrar_phone',
                        render: function(data, type, row) {
                            return `
                                <div class="contact-info">
                                    <div>${data}</div>
                                    <small class="text-muted">${row.registrar_name}</small>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: 'amount',
                        render: function(data) {
                            return `<strong class="amount">RM ${parseFloat(data).toFixed(2)}</strong>`;
                        }
                    },
                    { 
                        data: 'status',
                        render: function(data) {
                            const statusClasses = {
                                'pending': 'warning',
                                'confirmed': 'success', 
                                'completed': 'primary',
                                'cancelled': 'danger'
                            };
                            const statusTexts = {
                                'pending': 'Pending',
                                'confirmed': 'Confirmed',
                                'completed': 'Completed',
                                'cancelled': 'Cancelled'
                            };
                            return `<span class="badge bg-${statusClasses[data] || 'secondary'}">${statusTexts[data] || data}</span>`;
                        }
                    },
                    { 
                        data: null,
                        orderable: false,
                        render: function(data) {
                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary btn-view" data-id="${data.id}" title="View Details">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-success btn-edit" data-id="${data.id}" title="Edit Booking">
                                        <i class="bi bi-pencil-square"></i>
                                    </button>
                                    <button class="btn btn-outline-warning btn-status" data-id="${data.id}" title="Update Status">
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-delete" data-id="${data.id}" title="Delete Booking">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ]
            });
        },
        
        // Load data
        loadData: function() {
            // Sample data for frontend demo
            const sampleData = [
                {
                    id: 1,
                    bride_name: 'Sarah Lim',
                    groom_name: 'Michael Chen',
                    venue_name: 'Main Temple Hall',
                    venue_location: 'Ground Floor',
                    booking_date: '2025-12-15',
                    session: 'am',
                    registrar_name: 'John Wong',
                    registrar_phone: '+60123456789',
                    amount: 300.00,
                    status: 'confirmed',
                    created_at: '2025-11-20T10:30:00Z'
                },
                {
                    id: 2,
                    bride_name: 'Alice Tan',
                    groom_name: 'David Lee',
                    venue_name: 'Garden Pavilion',
                    venue_location: 'Outdoor Garden',
                    booking_date: '2025-12-22',
                    session: 'pm',
                    registrar_name: 'Mary Koh',
                    registrar_phone: '+60129876543',
                    amount: 350.00,
                    status: 'pending',
                    created_at: '2025-11-20T14:45:00Z'
                },
                {
                    id: 3,
                    bride_name: 'Emily Wang',
                    groom_name: 'James Liu',
                    venue_name: 'Sacred Chamber',
                    venue_location: 'Second Floor',
                    booking_date: '2025-11-25',
                    session: 'am',
                    registrar_name: 'Peter Ng',
                    registrar_phone: '+60135555555',
                    amount: 300.00,
                    status: 'completed',
                    created_at: '2025-11-15T09:15:00Z'
                }
            ];
            
            // Clear existing data and add sample data
            this.dataTable.clear();
            this.dataTable.rows.add(sampleData);
            this.dataTable.draw();
            
            // Update statistics
            this.updateStatistics(sampleData);
            
            // For production, replace with actual API call:
            /*
            TempleAPI.get('/rom-booking')
                .done((response) => {
                    if (response.success) {
                        this.dataTable.clear();
                        this.dataTable.rows.add(response.data);
                        this.dataTable.draw();
                        this.updateStatistics(response.data);
                    }
                })
                .fail((error) => {
                    TempleCore.showToast('Failed to load bookings', 'error');
                });
            */
        },
        
        // Update statistics
        updateStatistics: function(data) {
            const stats = {
                total: data.length,
                pending: data.filter(item => item.status === 'pending').length,
                confirmed: data.filter(item => item.status === 'confirmed').length,
                completed: data.filter(item => item.status === 'completed').length
            };
            
            // Animate counter updates
            this.animateCounter('#totalBookings', stats.total);
            this.animateCounter('#pendingBookings', stats.pending);
            this.animateCounter('#confirmedBookings', stats.confirmed);
            this.animateCounter('#completedBookings', stats.completed);
        },
        
        // Animate counter
        animateCounter: function(selector, targetValue) {
            const $element = $(selector);
            const currentValue = parseInt($element.text()) || 0;
            
            gsap.to({ value: currentValue }, {
                value: targetValue,
                duration: 1,
                ease: 'power2.out',
                onUpdate: function() {
                    $element.text(Math.round(this.targets()[0].value));
                }
            });
        },
        
        // View booking details
        viewBookingDetails: function(bookingId) {
            // Sample booking details for demo
            const detailsHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="section-header-gradient mb-3">
                            <i class="bi bi-person-badge"></i>
                            <span>Registrar Details</span>
                        </div>
                        <table class="table table-borderless">
                            <tr><td><strong>Name:</strong></td><td>John Wong</td></tr>
                            <tr><td><strong>IC:</strong></td><td>123456-12-1234</td></tr>
                            <tr><td><strong>Phone:</strong></td><td>+60123456789</td></tr>
                            <tr><td><strong>Email:</strong></td><td>john@example.com</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div class="section-header-gradient mb-3">
                            <i class="bi bi-calendar-heart"></i>
                            <span>Booking Details</span>
                        </div>
                        <table class="table table-borderless">
                            <tr><td><strong>Venue:</strong></td><td>Main Temple Hall</td></tr>
                            <tr><td><strong>Date:</strong></td><td>December 15, 2025</td></tr>
                            <tr><td><strong>Session:</strong></td><td>Morning (9:00 AM - 12:00 PM)</td></tr>
                            <tr><td><strong>Amount:</strong></td><td>RM 300.00</td></tr>
                        </table>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <div class="section-header-gradient mb-3">
                            <i class="bi bi-person-dress"></i>
                            <span>Bride Details</span>
                        </div>
                        <table class="table table-borderless">
                            <tr><td><strong>Name:</strong></td><td>Sarah Lim</td></tr>
                            <tr><td><strong>IC:</strong></td><td>654321-12-4321</td></tr>
                            <tr><td><strong>Phone:</strong></td><td>+60129999999</td></tr>
                            <tr><td><strong>Email:</strong></td><td>sarah@example.com</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <div class="section-header-gradient mb-3">
                            <i class="bi bi-person-standing"></i>
                            <span>Groom Details</span>
                        </div>
                        <table class="table table-borderless">
                            <tr><td><strong>Name:</strong></td><td>Michael Chen</td></tr>
                            <tr><td><strong>IC:</strong></td><td>789456-12-7890</td></tr>
                            <tr><td><strong>Phone:</strong></td><td>+60128888888</td></tr>
                            <tr><td><strong>Email:</strong></td><td>michael@example.com</td></tr>
                        </table>
                    </div>
                </div>
            `;
            
            $('#viewDetailsContent').html(detailsHTML);
            $('#btnEditFromView').attr('data-id', bookingId);
            
            const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
            modal.show();
        },
        
        // Update booking status
        updateBookingStatus: function(bookingId) {
            const newStatus = $('#newStatus').val();
            const notes = $('#statusNotes').val();
            
            if (!newStatus) {
                TempleCore.showToast('Please select a status', 'warning');
                return;
            }
            
            // Show loading
            const $btn = $('#btnUpdateStatus');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<i class="spinner-border spinner-border-sm"></i> Updating...');
            
            // Simulate API call
            setTimeout(() => {
                TempleCore.showToast('Booking status updated successfully!', 'success');
                $('#statusUpdateModal').modal('hide');
                this.loadData(); // Refresh data
                $btn.prop('disabled', false).html(originalText);
            }, 1500);
            
            // Actual API implementation:
            /*
            TempleAPI.put('/rom-booking/' + bookingId + '/status', {
                status: newStatus,
                notes: notes
            })
            .done((response) => {
                if (response.success) {
                    TempleCore.showToast('Booking status updated successfully!', 'success');
                    $('#statusUpdateModal').modal('hide');
                    this.loadData();
                }
            })
            .fail((error) => {
                TempleCore.showToast('Failed to update status', 'error');
            })
            .always(() => {
                $btn.prop('disabled', false).html(originalText);
            });
            */
        },
        
        // Delete booking
        deleteBooking: function(bookingId) {
            if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
                return;
            }
            
            // Simulate API call
            TempleCore.showToast('Booking deleted successfully!', 'success');
            this.loadData(); // Refresh data
            
            // Actual API implementation:
            /*
            TempleAPI.delete('/rom-booking/' + bookingId)
                .done((response) => {
                    if (response.success) {
                        TempleCore.showToast('Booking deleted successfully!', 'success');
                        this.loadData();
                    }
                })
                .fail((error) => {
                    TempleCore.showToast('Failed to delete booking', 'error');
                });
            */
        },
        
        // Apply filters
        applyFilters: function() {
            const filters = {
                status: $('#filterStatus').val(),
                venue: $('#filterVenue').val(),
                session: $('#filterSession').val(),
                dateFrom: $('#filterDateFrom').val(),
                dateTo: $('#filterDateTo').val(),
                search: $('#filterSearch').val()
            };
            
            // Apply DataTable search and filters
            let searchValue = filters.search || '';
            
            // Add status filter to search if selected
            if (filters.status) {
                searchValue += ' status:' + filters.status;
            }
            
            this.dataTable.search(searchValue).draw();
            
            TempleCore.showToast('Filters applied successfully', 'success');
        },
        
        // Reset filters
        resetFilters: function() {
            $('#filterStatus, #filterVenue, #filterSession').val('');
            $('#filterDateFrom, #filterDateTo, #filterSearch').val('');
            this.dataTable.search('').draw();
            TempleCore.showToast('Filters reset', 'info');
        },
        
        // Export functions
        exportExcel: function() {
            TempleCore.showToast('Excel export started', 'info');
            // Implement Excel export logic
        },
        
        exportPDF: function() {
            TempleCore.showToast('PDF export started', 'info');
            // Implement PDF export logic
        },
        
        printTable: function() {
            window.print();
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Header buttons
            $('#btnNewBooking').on('click.' + this.eventNamespace, function() {
				self.cleanup();
                TempleRouter.navigate('rom-booking/create');
            });
            
            $('#btnRefresh').on('click.' + this.eventNamespace, function() {
                self.loadData();
                TempleCore.showToast('Data refreshed', 'success');
            });
            
            // Filter buttons
            $('#btnApplyFilter').on('click.' + this.eventNamespace, () => self.applyFilters());
            $('#btnResetFilter').on('click.' + this.eventNamespace, () => self.resetFilters());
            
            // Export buttons
            $('#btnExportExcel').on('click.' + this.eventNamespace, () => self.exportExcel());
            $('#btnExportPDF').on('click.' + this.eventNamespace, () => self.exportPDF());
            $('#btnPrint').on('click.' + this.eventNamespace, () => self.printTable());
            
            // Table action buttons
            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-view', function() {
                const bookingId = $(this).data('id');
                self.viewBookingDetails(bookingId);
            });
            
            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-edit', function() {
                const bookingId = $(this).data('id');
				self.cleanup();
                TempleRouter.navigate('rom-booking/edit', { id: bookingId });
            });
            
            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-status', function() {
                const bookingId = $(this).data('id');
                $('#updateBookingId').val(bookingId);
                $('#newStatus').val('');
                $('#statusNotes').val('');
                const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
                modal.show();
            });
            
            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-delete', function() {
                const bookingId = $(this).data('id');
                self.deleteBooking(bookingId);
            });
            
            // Modal buttons
            $('#btnUpdateStatus').on('click.' + this.eventNamespace, function() {
                const bookingId = $('#updateBookingId').val();
                self.updateBookingStatus(bookingId);
            });
            
            $('#btnEditFromView').on('click.' + this.eventNamespace, function() {
                const bookingId = $(this).attr('data-id');
                $('#viewDetailsModal').modal('hide');
				self.cleanup();
                TempleRouter.navigate('rom-booking/edit', { id: bookingId });
            });
            
            // Search on enter
            $('#filterSearch').on('keypress.' + this.eventNamespace, function(e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });
        }
    };
    
})(jQuery, window);