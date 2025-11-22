// js/pages/special-occasions/index.js
// Special Occasions Listing Page

(function($, window) {
    'use strict';
    if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
			eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
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
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Special Occasions page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Special Occasions page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
        
        init: function(params) {
            console.log('Initializing Special Occasions Listing Page...');
            window.OccasionsSharedModule.registerPage(this.pageId);
            
            this.render();
            this.loadOccasions();
            this.loadBookings();
            this.initAnimations();
            this.bindEvents();
        },
        
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Destroy DataTable
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
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
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        render: function() {
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
                                            <h1 class="occasion-title">Special Occasions Bookings</h1>
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
            `;
            
            $('#page-container').html(html);
        },
        
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
        
        loadOccasions: function() {
            const self = this;
            
            // Simulate loading occasions (replace with actual API call)
            setTimeout(() => {
                self.occasions = {
                    1: 'Birthday Celebration',
                    2: 'Guanyin Bodhisattva',
                    3: 'Guan Gong',
                    4: 'Tu Di Gong',
                    5: 'Jade Emperor',
                    6: 'Ancestors'
                };
                
                // Populate occasion filter
                let optionsHTML = '<option value="">All Occasions</option>';
                for (const [id, name] of Object.entries(self.occasions)) {
                    optionsHTML += `<option value="${id}">${name}</option>`;
                }
                $('#filterOccasion').html(optionsHTML);
            }, 100);
            
            // Actual API implementation:
            /*
            TempleAPI.get('/special-occasions', { status: 'active' })
                .done(function(response) {
                    if (response.success && response.data) {
                        self.occasions = {};
                        response.data.forEach(function(occasion) {
                            self.occasions[occasion.id] = occasion.occasion_name_primary;
                        });
                        
                        let optionsHTML = '<option value="">All Occasions</option>';
                        for (const [id, name] of Object.entries(self.occasions)) {
                            optionsHTML += `<option value="${id}">${name}</option>`;
                        }
                        $('#filterOccasion').html(optionsHTML);
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load occasions', 'error');
                });
            */
        },
        
        loadBookings: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Generate sample data (replace with actual API call)
            setTimeout(() => {
                self.bookings = self.generateSampleData();
                self.initDataTable();
                TempleCore.showLoading(false);
            }, 500);
            
            // Actual API implementation:
            /*
            const filters = this.getFilters();
            TempleAPI.get('/special-occasions/bookings', filters)
                .done(function(response) {
                    if (response.success && response.data) {
                        self.bookings = response.data;
                        self.initDataTable();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load bookings', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
            */
        },
        
        generateSampleData: function() {
            const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
            const paymentMethods = ['Cash', 'Cheque', 'E-banking', 'Credit Card', 'DuitNow'];
            const occasionIds = Object.keys(this.occasions);
            
            const sampleData = [];
            const today = new Date();
            
            for (let i = 1; i <= 25; i++) {
                const randomDays = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
                const bookingDate = new Date(today);
                bookingDate.setDate(bookingDate.getDate() + randomDays);
                
                const occasionId = occasionIds[Math.floor(Math.random() * occasionIds.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const amount = (Math.random() * 500 + 50).toFixed(2);
                
                sampleData.push({
                    id: i,
                    booking_code: `SO${today.getFullYear()}${String(i).padStart(4, '0')}`,
                    booking_date: bookingDate.toISOString().split('T')[0],
                    special_occasion_id: occasionId,
                    occasion_name: this.occasions[occasionId],
                    occasion_option: `Option ${Math.floor(Math.random() * 3) + 1}`,
                    occasion_amount: amount,
                    name_chinese: `${i}`,
                    name_english: `Li Ming ${i}`,
                    nric: `${Math.floor(Math.random() * 900000 + 100000)}-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
                    email: `booking${i}@example.com`,
                    contact_no: `+6012345${String(i).padStart(4, '0')}`,
                    payment_methods: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                    status: status,
                    remark: Math.random() > 0.7 ? 'Sample remark for booking' : null,
                    created_at: bookingDate.toISOString()
                });
            }
            
            return sampleData.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
        },
        
        getFilters: function() {
            return {
                from_date: $('#filterFromDate').val() || null,
                to_date: $('#filterToDate').val() || null,
                occasion_id: $('#filterOccasion').val() || null
            };
        },
        
        applyFilters: function() {
            if (this.dataTable) {
                this.dataTable.draw();
                TempleCore.showToast('Filters applied', 'success');
            }
        },
        
        resetFilters: function() {
            $('#filterFromDate').val('');
            $('#filterToDate').val('');
            $('#filterOccasion').val('');
            this.applyFilters();
        },
        
        initDataTable: function() {
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
                        render: function(data, type, row) {
                            return `<input type="checkbox" class="form-check-input booking-checkbox" data-id="${row.id}">`;
                        }
                    },
                    { data: 'booking_code' },
                    {
                        data: 'booking_date',
                        render: function(data) {
                            return self.formatDate(data);
                        }
                    },
                    { data: 'name_chinese' },
                    { data: 'name_english' },
                    { data: 'occasion_name' },
                    { data: 'occasion_option' },
                    {
                        data: 'occasion_amount',
                        render: function(data) {
                            return `RM ${parseFloat(data).toFixed(2)}`;
                        }
                    },
                    { data: 'payment_methods' },
                    {
                        data: 'status',
                        render: function(data) {
                            return self.getStatusBadge(data);
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info btn-view" data-id="${row.id}" title="View Details">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-success btn-print-receipt" data-id="${row.id}" title="Print Receipt">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                    <button class="btn btn-danger btn-delete" data-id="${row.id}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
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
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'pending': '<span class="badge bg-warning text-dark">Pending</span>',
                'confirmed': '<span class="badge bg-success">Confirmed</span>',
                'cancelled': '<span class="badge bg-danger">Cancelled</span>',
                'completed': '<span class="badge bg-info">Completed</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        updateSelectedCount: function() {
            const count = $('.booking-checkbox:checked').length;
            this.selectedBookings = [];
            
            $('.booking-checkbox:checked').each(function() {
                const id = $(this).data('id');
                this.selectedBookings.push(id);
            }.bind(this));
            
            $('#selectedCount').text(count);
            
            if (count > 0) {
                $('#bulkActionsBar').slideDown(300);
            } else {
                $('#bulkActionsBar').slideUp(300);
            }
        },
        
        viewBookingDetails: function(bookingId) {
            const booking = this.bookings.find(b => b.id === bookingId);
            
            if (!booking) {
                TempleCore.showToast('Booking not found', 'error');
                return;
            }
            
            const detailsHTML = `
                <div class="booking-details-modal">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary mb-3"><i class="bi bi-info-circle"></i> Booking Information</h6>
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">Booking Code:</th>
                                    <td>${booking.booking_code}</td>
                                </tr>
                                <tr>
                                    <th>Booking Date:</th>
                                    <td>${this.formatDate(booking.booking_date)}</td>
                                </tr>
                                <tr>
                                    <th>Status:</th>
                                    <td>${this.getStatusBadge(booking.status)}</td>
                                </tr>
                            </table>
                            
                            <h6 class="text-primary mb-3 mt-4"><i class="bi bi-person"></i> Personal Details</h6>
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">Name (Chinese):</th>
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
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="text-primary mb-3"><i class="bi bi-calendar-event"></i> Occasion Details</h6>
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">Occasion:</th>
                                    <td>${booking.occasion_name}</td>
                                </tr>
                                <tr>
                                    <th>Option:</th>
                                    <td>${booking.occasion_option}</td>
                                </tr>
                                <tr>
                                    <th>Amount:</th>
                                    <td><strong>RM ${parseFloat(booking.occasion_amount).toFixed(2)}</strong></td>
                                </tr>
                                <tr>
                                    <th>Payment Method:</th>
                                    <td>${booking.payment_methods}</td>
                                </tr>
                            </table>
                            
                            ${booking.remark ? `
                            <h6 class="text-primary mb-3 mt-4"><i class="bi bi-chat-text"></i> Remarks</h6>
                            <div class="alert alert-info">
                                ${booking.remark}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            Swal.fire({
                title: `Booking Details - ${booking.booking_code}`,
                html: detailsHTML,
                width: '900px',
                showCloseButton: true,
                showConfirmButton: true,
                confirmButtonText: 'Close',
                confirmButtonColor: '#6c757d',
                customClass: {
                    popup: 'booking-details-popup'
                }
            });
        },
        
        deleteBooking: function(bookingId) {
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
                    // Simulate deletion (replace with actual API call)
                    self.bookings = self.bookings.filter(b => b.id !== bookingId);
                    self.dataTable.clear().rows.add(self.bookings).draw();
                    TempleCore.showToast('Booking deleted successfully', 'success');
                    
                    // Actual API implementation:
                    /*
                    TempleAPI.delete(`/special-occasions/bookings/${bookingId}`)
                        .done(function(response) {
                            if (response.success) {
                                self.loadBookings();
                                TempleCore.showToast('Booking deleted successfully', 'success');
                            }
                        })
                        .fail(function() {
                            TempleCore.showToast('Failed to delete booking', 'error');
                        });
                    */
                }
            });
        },
        
        bulkUpdateStatus: function(status) {
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
                    // Simulate bulk update (replace with actual API call)
                    self.selectedBookings.forEach(id => {
                        const booking = self.bookings.find(b => b.id === id);
                        if (booking) {
                            booking.status = status;
                        }
                    });
                    
                    self.dataTable.clear().rows.add(self.bookings).draw();
                    $('.booking-checkbox').prop('checked', false);
                    $('#selectAll').prop('checked', false);
                    self.updateSelectedCount();
                    TempleCore.showToast(`${count} booking(s) updated to ${statusNames[status]}`, 'success');
                    
                    // Actual API implementation:
                    /*
                    TempleAPI.put('/special-occasions/bookings/bulk-update', {
                        booking_ids: self.selectedBookings,
                        status: status
                    })
                        .done(function(response) {
                            if (response.success) {
                                self.loadBookings();
                                TempleCore.showToast(`Bookings updated successfully`, 'success');
                            }
                        })
                        .fail(function() {
                            TempleCore.showToast('Failed to update bookings', 'error');
                        });
                    */
                }
            });
        },
        
        bulkDelete: function() {
            const self = this;
            const count = this.selectedBookings.length;
            
            if (count === 0) {
                TempleCore.showToast('No bookings selected', 'warning');
                return;
            }
            
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
                    // Simulate deletion (replace with actual API call)
                    self.bookings = self.bookings.filter(b => !self.selectedBookings.includes(b.id));
                    self.dataTable.clear().rows.add(self.bookings).draw();
                    $('.booking-checkbox').prop('checked', false);
                    $('#selectAll').prop('checked', false);
                    self.updateSelectedCount();
                    TempleCore.showToast(`${count} booking(s) deleted successfully`, 'success');
                    
                    // Actual API implementation:
                    /*
                    TempleAPI.delete('/special-occasions/bookings/bulk-delete', {
                        booking_ids: self.selectedBookings
                    })
                        .done(function(response) {
                            if (response.success) {
                                self.loadBookings();
                                TempleCore.showToast('Bookings deleted successfully', 'success');
                            }
                        })
                        .fail(function() {
                            TempleCore.showToast('Failed to delete bookings', 'error');
                        });
                    */
                }
            });
        },
        
        bindEvents: function() {
            const self = this;
            
            // New Booking button
            $('#btnNewBooking').on('click.' + this.eventNamespace, function() {
				self.cleanup();
                TempleRouter.navigate('special-occasions/create');
            });
            
            // Print Report button
            $('#btnPrintReport').on('click.' + this.eventNamespace, function() {
				self.cleanup();
                TempleRouter.navigate('special-occasions/report');
            });
            
            // Filter buttons
            $('#btnApplyFilter').on('click.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            $('#btnResetFilter').on('click.' + this.eventNamespace, function() {
                self.resetFilters();
            });
            
            // Select All checkbox
            $(document).on('change.' + this.eventNamespace, '#selectAll', function() {
                $('.booking-checkbox').prop('checked', $(this).is(':checked'));
                self.updateSelectedCount();
            });
            
            // Individual checkboxes
            $(document).on('change.' + this.eventNamespace, '.booking-checkbox', function() {
                const totalCheckboxes = $('.booking-checkbox').length;
                const checkedCheckboxes = $('.booking-checkbox:checked').length;
                $('#selectAll').prop('checked', totalCheckboxes === checkedCheckboxes);
                self.updateSelectedCount();
            });
            
            // Bulk action buttons
            $('#btnBulkConfirm').on('click.' + this.eventNamespace, function() {
                self.bulkUpdateStatus('confirmed');
            });
            
            $('#btnBulkPending').on('click.' + this.eventNamespace, function() {
                self.bulkUpdateStatus('pending');
            });
            
            $('#btnBulkCancel').on('click.' + this.eventNamespace, function() {
                self.bulkUpdateStatus('cancelled');
            });
            
            $('#btnBulkDelete').on('click.' + this.eventNamespace, function() {
                self.bulkDelete();
            });
            
            // View button
            $(document).on('click.' + this.eventNamespace, '.btn-view', function() {
                const bookingId = $(this).data('id');
                self.viewBookingDetails(bookingId);
            });
            
            // Print Receipt button
            $(document).on('click.' + this.eventNamespace, '.btn-print-receipt', function() {
                const bookingId = $(this).data('id');
				self.cleanup();
                TempleRouter.navigate('special-occasions/print', { id: bookingId });
            });
            
            // Delete button
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function() {
                const bookingId = $(this).data('id');
                self.deleteBooking(bookingId);
            });
        }
    };
    
})(jQuery, window);