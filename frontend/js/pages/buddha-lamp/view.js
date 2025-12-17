// js/pages/buddha-lamp/view.js
// Buddha Lamp Booking View Page - Read Only Detail View with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    if (!window.BuddhaLampSharedModule) {
        window.BuddhaLampSharedModule = {
            moduleId: 'buddha-lamp',
            eventNamespace: 'buddha-lamp',
            cssId: 'buddha-lamp-css',
            cssPath: '/css/buddha-lamp.css',
            activePages: new Set(),
            
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
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Buddha Lamp page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Buddha Lamp page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
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
    
    window.BuddhaLampViewPage = {
        pageId: 'buddha-lamp-view',
        eventNamespace: window.BuddhaLampSharedModule.eventNamespace,
        bookingId: null,
        bookingData: null,
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.BuddhaLampSharedModule.registerPage(this.pageId);
            
            this.bookingId = params?.id || null;
            
            if (!this.bookingId) {
                TempleCore.showToast('Booking ID is required', 'error');
                this.navigateBack();
                return;
            }
            
            this.renderLoading();
            this.loadBookingData();
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
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            this.bookingData = null;
            this.bookingId = null;
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render loading state
        renderLoading: function() {
            const html = `
                <div class="buddha-lamp-view-page">
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Buddha Lamp Booking</h1>
                                            <p class="buddha-lamp-subtitle">Booking Details</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnBack">
                                        <i class="bi bi-arrow-left"></i> Back to List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted">Loading booking details...</p>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.bindBackButton();
        },
        
        // Load booking data from API
        loadBookingData: function() {
            const self = this;
            
            TempleAPI.get(`/bookings/buddha-lamp/${this.bookingId}`)
                .done(function(response) {
                    if (response.success && response.data) {
                        self.bookingData = response.data;
                        self.render();
                        self.initAnimations();
                        self.bindEvents();
                    } else {
                        TempleCore.showToast(response.message || 'Booking not found', 'error');
                        self.navigateBack();
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load booking:', xhr);
                    let errorMessage = 'Failed to load booking details';
                    if (xhr.status === 404) {
                        errorMessage = 'Booking not found';
                    } else if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                    self.navigateBack();
                });
        },
        
        // Render page HTML
        render: function() {
            const data = this.bookingData;
            const currency = TempleCore.getCurrency() || 'RM';
            
            const html = `
                <div class="buddha-lamp-view-page">
                    <!-- Page Header -->
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Booking Details</h1>
                                            <p class="buddha-lamp-subtitle">${data.booking_number}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-outline-light btn-lg" id="btnPrint">
                                            <i class="bi bi-printer"></i> Print Receipt
                                        </button>
                                        <button class="btn btn-outline-light btn-lg" id="btnEdit" ${data.booking_status === 'CANCELLED' ? 'disabled' : ''}>
                                            <i class="bi bi-pencil"></i> Edit
                                        </button>
                                        <button class="btn btn-outline-light btn-lg" id="btnBack">
                                            <i class="bi bi-arrow-left"></i> Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Status Cards -->
                    <div class="row mb-4" data-aos="fade-up" data-aos-duration="800">
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card ${this.getStatusCardClass(data.booking_status)}">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi ${this.getStatusIcon(data.booking_status)}"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Booking Status</div>
                                        <div class="stat-value">${this.formatStatus(data.booking_status)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card ${this.getPaymentStatusCardClass(data.payment_status)}">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-credit-card"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Payment Status</div>
                                        <div class="stat-value">${this.formatPaymentStatus(data.payment_status)}</div>
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
                                        <div class="stat-value">${currency} ${this.formatAmount(data.total_amount)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card stat-card-info">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-check"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Booking Date</div>
                                        <div class="stat-value">${this.formatDate(data.booking_date)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Detail Cards -->
                    <div class="row">
                        <!-- Personal Information -->
                        <div class="col-lg-6 mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                            <div class="card shadow-sm h-100">
                                <div class="card-header bg-gradient-primary">
                                    <h5 class="mb-0">
                                        <i class="bi bi-person-badge me-2"></i>
                                        Personal Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <table class="table table-borderless mb-0">
                                        <tbody>
                                            <tr>
                                                <td class="fw-bold text-muted" style="width: 40%;">Name (English)</td>
                                                <td>${data.name_primary || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Name (Chinese)</td>
                                                <td>${data.name_secondary || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">NRIC No.</td>
                                                <td>${data.nric || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Email</td>
                                                <td>${data.email || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Contact No.</td>
                                                <td>${data.phone_no || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Booking Details -->
                        <div class="col-lg-6 mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                            <div class="card shadow-sm h-100">
                                <div class="card-header bg-gradient-success">
                                    <h5 class="mb-0">
                                        <i class="bi bi-brightness-high me-2"></i>
                                        Booking Details
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <table class="table table-borderless mb-0">
                                        <tbody>
                                            <tr>
                                                <td class="fw-bold text-muted" style="width: 40%;">Booking Number</td>
                                                <td><span class="badge bg-primary fs-6">${data.booking_number}</span></td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Booking Date</td>
                                                <td>${this.formatDate(data.booking_date)}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Amount</td>
                                                <td class="fs-5 fw-bold text-success">${currency} ${this.formatAmount(data.total_amount)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment Information -->
                        <div class="col-lg-6 mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                            <div class="card shadow-sm h-100">
                                <div class="card-header bg-gradient-warning">
                                    <h5 class="mb-0">
                                        <i class="bi bi-credit-card me-2"></i>
                                        Payment Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    ${this.renderPaymentDetails(data)}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Additional Notes -->
                        <div class="col-lg-6 mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="400">
                            <div class="card shadow-sm h-100">
                                <div class="card-header bg-gradient-info">
                                    <h5 class="mb-0">
                                        <i class="bi bi-sticky me-2"></i>
                                        Additional Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <table class="table table-borderless mb-0">
                                        <tbody>
                                            <tr>
                                                <td class="fw-bold text-muted" style="width: 40%;">Special Instructions</td>
                                                <td>${data.special_instructions || data.additional_notes || '<em class="text-muted">None</em>'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Created At</td>
                                                <td>${this.formatDateTime(data.created_at)}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Created By</td>
                                                <td>${data.created_by?.name || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold text-muted">Last Updated</td>
                                                <td>${this.formatDateTime(data.updated_at)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="row mt-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="500">
                        <div class="col-12">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                        <div>
                                            <button class="btn btn-outline-secondary" id="btnBackBottom">
                                                <i class="bi bi-arrow-left"></i> Back to List
                                            </button>
                                        </div>
                                        <div class="d-flex gap-2">
                                            ${data.booking_status !== 'CANCELLED' ? `
                                                <button class="btn btn-outline-danger" id="btnCancel">
                                                    <i class="bi bi-x-circle"></i> Cancel Booking
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-info text-white" id="btnPrintBottom">
                                                <i class="bi bi-printer"></i> Print Receipt
                                            </button>
                                            <button class="btn btn-primary" id="btnEditBottom" ${data.booking_status === 'CANCELLED' ? 'disabled' : ''}>
                                                <i class="bi bi-pencil"></i> Edit Booking
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Render payment details
        renderPaymentDetails: function(data) {
            const currency = TempleCore.getCurrency() || 'RM';
            const payment = data.payment;
            
            if (!payment) {
                return `
                    <div class="alert alert-warning mb-0">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        No payment information available
                    </div>
                `;
            }
            
            return `
                <table class="table table-borderless mb-0">
                    <tbody>
                        <tr>
                            <td class="fw-bold text-muted" style="width: 40%;">Payment Reference</td>
                            <td><code>${payment.payment_reference || '-'}</code></td>
                        </tr>
                        <tr>
                            <td class="fw-bold text-muted">Payment Method</td>
                            <td>${payment.payment_method || '-'}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold text-muted">Amount Paid</td>
                            <td class="fs-5 fw-bold text-success">${currency} ${this.formatAmount(payment.amount)}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold text-muted">Payment Status</td>
                            <td>${this.getPaymentStatusBadge(payment.payment_status)}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold text-muted">Payment Date</td>
                            <td>${this.formatDateTime(payment.payment_date)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
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
            
            gsap.fromTo('.card',
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: 'power2.out',
                    delay: 0.3,
                    clearProps: 'all'
                }
            );
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            this.bindBackButton();
            
            // Edit buttons
            $('#btnEdit, #btnEditBottom').on('click.' + this.eventNamespace, function() {
                if (!$(this).prop('disabled')) {
					const bookingId = self.bookingId;
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp/edit', { id: bookingId });
                }
            });
            
            // Print buttons
            $('#btnPrint, #btnPrintBottom').on('click.' + this.eventNamespace, function() {
				const bookingId = self.bookingId;
                self.cleanup();
                TempleRouter.navigate('buddha-lamp/print', { id: bookingId });
            });
            
            // Cancel button
            $('#btnCancel').on('click.' + this.eventNamespace, function() {
                self.cancelBooking();
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
        
        // Bind back button
        bindBackButton: function() {
            const self = this;
            
            $('#btnBack, #btnBackBottom').off('click').on('click.' + this.eventNamespace, function() {
                gsap.to('.buddha-lamp-view-page', {
                    opacity: 0,
                    y: -30,
                    duration: 0.3,
                    onComplete: () => {
                        self.navigateBack();
                    }
                });
            });
        },
        
        // Cancel booking
        cancelBooking: function() {
            const self = this;
            const data = this.bookingData;
            
            Swal.fire({
                title: 'Cancel Booking?',
                html: `Are you sure you want to cancel booking <strong>${data.booking_number}</strong>?<br><br>This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, Cancel Booking',
                cancelButtonText: 'No, Keep It'
            }).then((result) => {
                if (result.isConfirmed) {
                    self.performCancel();
                }
            });
        },
        
        // Perform cancel API call
        performCancel: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/bookings/buddha-lamp/${this.bookingId}/cancel`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(`Booking cancelled successfully`, 'success');
                        self.cleanup();
                        TempleRouter.navigate('buddha-lamp');
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
        
        // Navigate back to list
        navigateBack: function() {
            this.cleanup();
            TempleRouter.navigate('buddha-lamp');
        },
        
        // Helper functions
        formatAmount: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        },
        
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        
        formatDateTime: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        formatStatus: function(status) {
            const statusMap = {
                'CONFIRMED': 'Confirmed',
                'PENDING': 'Pending',
                'COMPLETED': 'Completed',
                'CANCELLED': 'Cancelled',
                'FAILED': 'Failed'
            };
            return statusMap[status] || status;
        },
        
        formatPaymentStatus: function(status) {
            const statusMap = {
                'FULL': 'Fully Paid',
                'PARTIAL': 'Partial',
                'PENDING': 'Pending'
            };
            return statusMap[status] || status;
        },
        
        formatPrintOption: function(option) {
            const optionMap = {
                'NO_PRINT': 'No Print',
                'SINGLE_PRINT': 'Single Print',
                'SEP_PRINT': 'Separate Print'
            };
            return optionMap[option] || option || '-';
        },
        
        getStatusCardClass: function(status) {
            const classMap = {
                'CONFIRMED': 'stat-card-success',
                'PENDING': 'stat-card-warning',
                'COMPLETED': 'stat-card-info',
                'CANCELLED': 'stat-card-danger',
                'FAILED': 'stat-card-dark'
            };
            return classMap[status] || 'stat-card-secondary';
        },
        
        getPaymentStatusCardClass: function(status) {
            const classMap = {
                'FULL': 'stat-card-success',
                'PARTIAL': 'stat-card-warning',
                'PENDING': 'stat-card-secondary'
            };
            return classMap[status] || 'stat-card-secondary';
        },
        
        getStatusIcon: function(status) {
            const iconMap = {
                'CONFIRMED': 'bi-check-circle-fill',
                'PENDING': 'bi-hourglass-split',
                'COMPLETED': 'bi-trophy-fill',
                'CANCELLED': 'bi-x-circle-fill',
                'FAILED': 'bi-exclamation-triangle-fill'
            };
            return iconMap[status] || 'bi-question-circle';
        },
        
        getPaymentStatusBadge: function(status) {
            const badgeMap = {
                'SUCCESS': '<span class="badge bg-success">Success</span>',
                'PENDING': '<span class="badge bg-warning text-dark">Pending</span>',
                'FAILED': '<span class="badge bg-danger">Failed</span>'
            };
            return badgeMap[status] || `<span class="badge bg-secondary">${status}</span>`;
        }
    };
    
})(jQuery, window);