// js/pages/rom-booking/index.js
// Dynamic ROM Booking List Page with DataTables and Print Report

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
                    console.log('ROM CSS loaded');
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`ROM page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`ROM page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

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
                    console.log('ROM CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('ROM module cleaned up');
            }
        };
    }

    window.RomBookingPage = {
        dataTable: null,
        pageId: 'rom-list',
        eventNamespace: window.RomSharedModule.eventNamespace,
        currentBookingId: null,

        init: function (params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.initDataTable();
            this.loadData();
            this.loadStatistics();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            window.RomSharedModule.unregisterPage(this.pageId);

            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }

            console.log(`${this.pageId} cleanup completed`);
        },

        render: function () {
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
                                    <button class="btn btn-outline-light btn-lg me-2" id="btnPrintReport">
                                        <i class="bi bi-printer-fill"></i> Print Report
                                    </button>
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
                                            <option value="PENDING">Pending</option>
                                            <option value="CONFIRMED">Confirmed</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 mb-3">
                                        <label class="form-label">Payment Status</label>
                                        <select class="form-select" id="filterPaymentStatus">
                                            <option value="">All Payment Status</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="PARTIAL">Partial</option>
                                            <option value="FULL">Paid</option>
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
                                    <div class="col-md-9 mb-3">
                                        <label class="form-label">Search</label>
                                        <div class="input-group">
                                            <span class="input-group-text">
                                                <i class="bi bi-search"></i>
                                            </span>
                                            <input type="text" class="form-control" id="filterSearch" placeholder="Search by booking number, register name, phone...">
                                        </div>
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
                            
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover" id="romBookingsTable">
                                        <thead>
                                            <tr>
                                                <th>Booking No.</th>
                                                <th>Date</th>
                                                <th>Register</th>
                                                <th>Couples</th>
                                                <th>Venue</th>
                                                <th>Session</th>
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

                <!-- View Details Modal -->
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
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

                <!-- Status Update Modal -->
                <div class="modal fade" id="statusUpdateModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-arrow-repeat"></i> Update Booking Status
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Booking Number: <strong id="statusBookingNumber"></strong></label>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Current Status: <span id="currentStatus" class="badge"></span></label>
                                </div>
                                <div class="mb-3">
                                    <label for="newStatus" class="form-label">New Status <span class="text-danger">*</span></label>
                                    <select class="form-select" id="newStatus" required>
                                        <option value="">Select Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="statusNotes" class="form-label">Notes</label>
                                    <textarea class="form-control" id="statusNotes" rows="3" placeholder="Add any notes about this status change..."></textarea>
                                </div>
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
            `;

            $('#page-container').html(html);
        },

        initAnimations: function () {
            AOS.init({
                duration: 1000,
                easing: 'ease-out-cubic',
                once: true,
                offset: 100
            });

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

            gsap.from('.stat-card', {
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                delay: 0.5,
                ease: 'back.out(1.7)'
            });
        },

        initDataTable: function () {
            const self = this;

            this.dataTable = $('#romBookingsTable').DataTable({
                responsive: true,
                processing: true,
                serverSide: false,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
                order: [[0, 'desc']],
                language: {
                    search: "Search bookings:",
                    lengthMenu: "Show _MENU_ bookings per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ bookings",
                    emptyTable: "No ROM bookings found",
                    zeroRecords: "No matching bookings found"
                },
                columns: [
                    {
                        data: 'booking_number',
                        render: function (data) {
                            return `<strong class="booking-id">${data}</strong>`;
                        }
                    },
                    {
                        data: 'booking_date',
                        render: function (data) {
                            const date = new Date(data);
                            return date.toLocaleDateString('en-GB');
                        }
                    },
                    {
                        data: null,
                        render: function (data) {
                            return `
                                <div class="contact-info">
                                    <div><strong>${data.register_name}</strong></div>
                                    <small class="text-muted">${data.register_phone}</small>
                                </div>
                            `;
                        }
                    },
                    {
                        data: 'couples',
                        render: function (data) {
                            if (!data || data.length === 0) return 'N/A';

                            const couplesList = data.map((couple, index) => {
                                return `
                                    <div class="couple-info mb-2">
                                        <small><strong>Couple ${index + 1}:</strong></small><br>
                                        <small>👰 ${couple.bride?.name || 'N/A'}</small><br>
                                        <small>🤵 ${couple.groom?.name || 'N/A'}</small>
                                    </div>
                                `;
                            }).join('');

                            return couplesList;
                        }
                    },
                    {
                        data: 'venue',
                        render: function (data) {
                            if (!data) return 'N/A';
                            return `
                                <div class="venue-info">
                                    <strong>${data.name_primary || data.name_secondary || 'N/A'}</strong>
                                    ${data.city ? `<br><small class="text-muted">${data.city}</small>` : ''}
                                </div>
                            `;
                        }
                    },
                    {
                        data: 'session',
                        render: function (data) {
                            if (!data) return 'N/A';
                            return `
                                <div class="session-info">
                                    <strong>${data.name_primary || data.name_secondary || 'N/A'}</strong>
                                    ${data.from_time ? `<br><small>${data.from_time} - ${data.to_time}</small>` : ''}
                                </div>
                            `;
                        }
                    },
                    {
                        data: 'total_amount',
                        render: function (data) {
                            return `<strong class="amount">RM ${parseFloat(data).toFixed(2)}</strong>`;
                        }
                    },
                    {
                        data: 'booking_status',
                        render: function (data) {
                            const statusClasses = {
                                'PENDING': 'warning',
                                'CONFIRMED': 'success',
                                'COMPLETED': 'primary',
                                'CANCELLED': 'danger'
                            };
                            return `<span class="badge bg-${statusClasses[data] || 'secondary'}">${data}</span>`;
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function (data) {
                            const showPrintBtn = ['CONFIRMED', 'COMPLETED'].includes(data.booking_status);
                            const printButton = showPrintBtn ?
                                `<button class="btn btn-outline-info btn-sm btn-print" data-id="${data.id}" title="Print Receipt">
                                    <i class="bi bi-printer"></i>
                                </button>` : '';

                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary btn-view" data-id="${data.id}" title="View Details">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-success btn-edit" data-id="${data.id}" title="Edit Booking">
                                        <i class="bi bi-pencil-square"></i>
                                    </button>
                                    <button class="btn btn-outline-warning btn-status" data-id="${data.id}" data-status="${data.booking_status}" data-booking-number="${data.booking_number}" title="Update Status">
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>
                                    ${printButton}
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

        loadData: function () {
            const self = this;
            TempleCore.showLoading(true);

            const filters = this.getFilters();

            TempleAPI.get('/rom-booking', filters)
                .done(function (response) {
                    if (response.success) {
                        self.dataTable.clear();
                        self.dataTable.rows.add(response.data);
                        self.dataTable.draw();
                    } else {
                        TempleCore.showToast('Failed to load bookings', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Load bookings error:', error);
                    TempleCore.showToast('Error loading bookings', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        loadStatistics: function () {
            const self = this;

            TempleAPI.get('/rom-booking/statistics')
                .done(function (response) {
                    if (response.success) {
                        const stats = response.data;
                        self.animateCounter('#totalBookings', stats.total || 0);
                        self.animateCounter('#pendingBookings', stats.pending || 0);
                        self.animateCounter('#confirmedBookings', stats.confirmed || 0);
                        self.animateCounter('#completedBookings', stats.completed || 0);
                    }
                })
                .fail(function (error) {
                    console.error('Load statistics error:', error);
                });
        },

        getFilters: function () {
            return {
                status: $('#filterStatus').val(),
                payment_status: $('#filterPaymentStatus').val(),
                date_from: $('#filterDateFrom').val(),
                date_to: $('#filterDateTo').val(),
                search: $('#filterSearch').val()
            };
        },

        animateCounter: function (selector, targetValue) {
            const $element = $(selector);
            const currentValue = parseInt($element.text()) || 0;

            gsap.to({ value: currentValue }, {
                value: targetValue,
                duration: 1,
                ease: 'power2.out',
                onUpdate: function () {
                    $element.text(Math.round(this.targets()[0].value));
                }
            });
        },

        viewBookingDetails: function (bookingId) {
            const self = this;
            TempleCore.showLoading(true);

            TempleAPI.get(`/rom-booking/${bookingId}`)
                .done(function (response) {
                    if (response.success) {
                        const booking = response.data;
                        self.renderBookingDetails(booking);

                        const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
                        modal.show();

                        $('#btnEditFromView').attr('data-id', bookingId);
                    } else {
                        TempleCore.showToast('Failed to load booking details', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Load booking details error:', error);
                    TempleCore.showToast('Error loading booking details', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderBookingDetails: function (booking) {
            const couplesHtml = booking.couples.map((couple, index) => `
        <div class="col-md-6 mb-3">
            <div class="card">
                <div class="card-header bg-light">
                    <strong>Couple ${index + 1}</strong>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-6">
                            <strong>👰 Bride:</strong><br>
                            ${couple.bride?.name || 'N/A'}<br>
                            <small>IC: ${couple.bride?.ic || 'N/A'}</small><br>
                            ${couple.bride?.phone ? `<small>📞 ${couple.bride.phone}</small><br>` : ''}
                            ${couple.bride?.email ? `<small>📧 ${couple.bride.email}</small>` : ''}
                        </div>
                        <div class="col-6">
                            <strong>🤵 Groom:</strong><br>
                            ${couple.groom?.name || 'N/A'}<br>
                            <small>IC: ${couple.groom?.ic || 'N/A'}</small><br>
                            ${couple.groom?.phone ? `<small>📞 ${couple.groom.phone}</small><br>` : ''}
                            ${couple.groom?.email ? `<small>📧 ${couple.groom.email}</small>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

            let witnessesHtml = '<p class="text-muted">No witnesses added</p>';
            if (booking.witnesses && Array.isArray(booking.witnesses) && booking.witnesses.length > 0) {
                witnessesHtml = booking.witnesses.map((witness, index) => `
            <div class="col-md-4 mb-2">
                <div class="card">
                    <div class="card-body p-2">
                        <strong>Witness ${index + 1}:</strong> ${witness.name || 'N/A'}<br>
                        <small>IC: ${witness.ic || 'N/A'}</small><br>
                        ${witness.phone ? `<small>📞 ${witness.phone}</small>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
            }

            let documentsHtml = '<p class="text-muted">No documents uploaded</p>';
            if (booking.documents && Array.isArray(booking.documents) && booking.documents.length > 0) {
                documentsHtml = booking.documents.map((doc, index) => {
                    const fileName = doc.name || doc.file_name || 'Document';
                    const fileUrl = doc.signed_url || doc.file_url || doc.url || '#';
                    const isPDF = fileName.toLowerCase().endsWith('.pdf');
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

                    let icon = 'bi-file-earmark';
                    let iconColor = 'text-secondary';
                    if (isPDF) {
                        icon = 'bi-file-earmark-pdf';
                        iconColor = 'text-danger';
                    } else if (isImage) {
                        icon = 'bi-file-earmark-image';
                        iconColor = 'text-primary';
                    }

                    return `
                <div class="col-md-3 mb-2">
                    <div class="card h-100">
                        <div class="card-body p-2 text-center">
                            <i class="bi ${icon} ${iconColor}" style="font-size: 2rem;"></i>
                            <p class="small mb-1 mt-2" style="word-break: break-word;">${fileName}</p>
                            ${fileUrl !== '#' ? `
                                <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                    <i class="bi bi-eye"></i> View
                                </a>
                            ` : '<span class="badge bg-warning">No URL</span>'}
                        </div>
                    </div>
                </div>
            `;
                }).join('');
            }

            let paymentsHtml = '<p class="text-muted">No payment records</p>';
            if (booking.payments && Array.isArray(booking.payments) && booking.payments.length > 0) {
                paymentsHtml = booking.payments.map((payment, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${payment.payment_reference || 'N/A'}</td>
                <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>${payment.payment_mode?.name || 'N/A'}</td>
                <td>RM ${parseFloat(payment.amount || 0).toFixed(2)}</td>
                <td><span class="badge bg-${payment.payment_status === 'SUCCESS' ? 'success' : 'warning'}">${payment.payment_status}</span></td>
            </tr>
        `).join('');

                paymentsHtml = `
            <table class="table table-sm table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>#</th>
                        <th>Reference</th>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentsHtml}
                </tbody>
            </table>
        `;
            }

            const html = `
        <div class="row mb-4">
            <div class="col-md-6">
                <h5><i class="bi bi-person-badge"></i> Register Details</h5>
                <table class="table table-borderless table-sm">
                    <tr><td><strong>Name:</strong></td><td>${booking.register_name}</td></tr>
                    <tr><td><strong>IC:</strong></td><td>${booking.register_details?.ic || 'N/A'}</td></tr>
                    <tr><td><strong>Phone:</strong></td><td>${booking.register_phone}</td></tr>
                    <tr><td><strong>Email:</strong></td><td>${booking.register_details?.email || 'N/A'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h5><i class="bi bi-calendar-heart"></i> Booking Details</h5>
                <table class="table table-borderless table-sm">
                    <tr><td><strong>Booking No:</strong></td><td>${booking.booking_number}</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${new Date(booking.booking_date).toLocaleDateString('en-GB')}</td></tr>
                    <tr><td><strong>Venue:</strong></td><td>${booking.venue?.name_primary || 'N/A'}</td></tr>
                    <tr><td><strong>Session:</strong></td><td>${booking.session?.name_primary || 'N/A'}</td></tr>
                    <tr><td><strong>Amount:</strong></td><td>RM ${parseFloat(booking.total_amount || 0).toFixed(2)}</td></tr>
                    <tr><td><strong>Status:</strong></td><td><span class="badge bg-success">${booking.booking_status}</span></td></tr>
                </table>
            </div>
        </div>

        <hr>

        <h5><i class="bi bi-heart-fill text-danger"></i> Couples (${booking.couples?.length || 0})</h5>
        <div class="row mb-4">
            ${couplesHtml}
        </div>

        <hr>

        <h5><i class="bi bi-people"></i> Witnesses (${booking.witnesses?.length || 0})</h5>
        <div class="row mb-4">
            ${witnessesHtml}
        </div>

        <hr>

        <h5><i class="bi bi-files"></i> Documents (${booking.documents?.length || 0})</h5>
        <div class="row mb-4">
            ${documentsHtml}
        </div>

        <hr>

        <h5><i class="bi bi-credit-card"></i> Payment Details</h5>
        <div class="mb-4">
            ${paymentsHtml}
        </div>

        ${booking.additional_notes ? `
            <hr>
            <h5><i class="bi bi-sticky"></i> Additional Notes</h5>
            <div class="alert alert-info">
                ${booking.additional_notes}
            </div>
        ` : ''}
    `;

            $('#viewDetailsContent').html(html);
        },

        deleteBooking: function (bookingId) {
            const self = this;

            if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
                return;
            }

            TempleCore.showLoading(true);

            TempleAPI.delete(`/rom-booking/${bookingId}`)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Booking deleted successfully', 'success');
                        self.loadData();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to delete booking', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Delete booking error:', error);
                    const errorMessage = error.responseJSON?.message ||
                        error.responseText ||
                        'Error deleting booking';
                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        showStatusUpdateModal: function (bookingId, currentStatus, bookingNumber) {
            const self = this;

            self.currentBookingId = bookingId;

            $('#statusBookingNumber').text(bookingNumber);
            const statusClasses = {
                'PENDING': 'warning',
                'CONFIRMED': 'success',
                'COMPLETED': 'primary',
                'CANCELLED': 'danger'
            };
            $('#currentStatus')
                .removeClass('bg-warning bg-success bg-primary bg-danger bg-secondary')
                .addClass(`bg-${statusClasses[currentStatus] || 'secondary'}`)
                .text(currentStatus);

            $('#newStatus').val('');
            $('#statusNotes').val('');

            const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
            modal.show();
        },

        updateBookingStatus: function () {
            const self = this;
            const newStatus = $('#newStatus').val();
            const notes = $('#statusNotes').val();

            if (!newStatus) {
                TempleCore.showToast('Please select a status', 'warning');
                return;
            }

            if (!self.currentBookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                return;
            }

            const $btn = $('#btnUpdateStatus');
            const originalHtml = $btn.html();
            $btn.prop('disabled', true).html('<i class="spinner-border spinner-border-sm me-1"></i> Updating...');

            TempleAPI.post(`/rom-booking/${self.currentBookingId}/status`, {
                status: newStatus,
                notes: notes
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Booking status updated successfully!', 'success');

                        const modal = bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal'));
                        modal.hide();

                        self.loadData();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update status', 'error');
                    }
                })
                .fail(function (error) {
                    console.error('Update status error:', error);
                    const errorMessage = error.responseJSON?.message ||
                        error.responseText ||
                        'Error updating status';
                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function () {
                    $btn.prop('disabled', false).html(originalHtml);
                });
        },

        applyFilters: function () {
            this.loadData();
            TempleCore.showToast('Filters applied', 'info');
        },

        resetFilters: function () {
            $('#filterStatus, #filterPaymentStatus').val('');
            $('#filterDateFrom, #filterDateTo, #filterSearch').val('');
            this.loadData();
            TempleCore.showToast('Filters reset', 'info');
        },

        printBookingReceipt: function (bookingId) {
            const self = this;

            if (window.RomBookingPrintPage) {
                self.cleanup();
                TempleRouter.navigate('rom-booking/print', { id: bookingId });
            } else {
                TempleCore.showLoading(true);
                const script = document.createElement('script');
                script.src = '/js/pages/rom-booking/print.js';
                script.onload = function () {
                    TempleCore.showLoading(false);
                    self.cleanup();
                    TempleRouter.navigate('rom-booking/print', { id: bookingId });
                };
                script.onerror = function () {
                    TempleCore.showLoading(false);
                    TempleCore.showToast('Error loading receipt printer', 'error');
                };
                document.head.appendChild(script);
            }
        },

        printReport: function () {
            const self = this;
            const filters = this.getFilters();

            if (window.RomBookingReportPrintPage) {
                self.cleanup();
                TempleRouter.navigate('rom-booking/report-print', filters);
            } else {
                TempleCore.showLoading(true);
                const script = document.createElement('script');
                script.src = '/js/pages/rom-booking/report-print.js';
                script.onload = function () {
                    TempleCore.showLoading(false);
                    self.cleanup();
                    TempleRouter.navigate('rom-booking/report-print', filters);
                };
                script.onerror = function () {
                    TempleCore.showLoading(false);
                    TempleCore.showToast('Error loading report printer', 'error');
                };
                document.head.appendChild(script);
            }
        },

        bindEvents: function () {
            const self = this;

            $('#btnNewBooking').on('click.' + this.eventNamespace, function () {
                self.cleanup();
                TempleRouter.navigate('rom-booking/create');
            });

            $('#btnRefresh').on('click.' + this.eventNamespace, function () {
                self.loadData();
                self.loadStatistics();
                TempleCore.showToast('Data refreshed', 'success');
            });

            $('#btnPrintReport').on('click.' + this.eventNamespace, function () {
                self.printReport();
            });

            $('#btnApplyFilter').on('click.' + this.eventNamespace, () => self.applyFilters());
            $('#btnResetFilter').on('click.' + this.eventNamespace, () => self.resetFilters());

            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-view', function () {
                const bookingId = $(this).data('id');
                self.viewBookingDetails(bookingId);
            });

            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-edit', function () {
                const bookingId = $(this).data('id');
                self.cleanup();
                TempleRouter.navigate('rom-booking/edit', { id: bookingId });
            });

            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-status', function () {
                const bookingId = $(this).data('id');
                const currentStatus = $(this).data('status');
                const bookingNumber = $(this).data('booking-number');
                self.showStatusUpdateModal(bookingId, currentStatus, bookingNumber);
            });

            $('#btnUpdateStatus').on('click.' + this.eventNamespace, function () {
                self.updateBookingStatus();
            });

            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-print', function () {
                const bookingId = $(this).data('id');
                self.printBookingReceipt(bookingId);
            });

            $('#romBookingsTable').on('click.' + this.eventNamespace, '.btn-delete', function () {
                const bookingId = $(this).data('id');
                self.deleteBooking(bookingId);
            });

            $('#btnEditFromView').on('click.' + this.eventNamespace, function () {
                const bookingId = $(this).attr('data-id');
                $('#viewDetailsModal').modal('hide');
                self.cleanup();
                TempleRouter.navigate('rom-booking/edit', { id: bookingId });
            });

            $('#filterSearch').on('keypress.' + this.eventNamespace, function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });
        }
    };

})(jQuery, window);