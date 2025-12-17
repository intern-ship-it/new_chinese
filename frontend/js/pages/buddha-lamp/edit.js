// js/pages/buddha-lamp/edit.js
// Buddha Lamp Booking Edit Page - Dynamic Version with GSAP + AOS animations

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
    
    window.BuddhaLampEditPage = {
        pageId: 'buddha-lamp-edit',
        eventNamespace: window.BuddhaLampSharedModule.eventNamespace,
        bookingId: null,
        bookingData: null,
        paymentModes: [],
        intervals: [],
        timeouts: [],
        hasChanges: false,
        
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
            this.loadInitialData();
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
            this.paymentModes = [];
            this.hasChanges = false;
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render loading state
        renderLoading: function() {
            const html = `
                <div class="buddha-lamp-edit-page">
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Edit Buddha Lamp Booking</h1>
                                            <p class="buddha-lamp-subtitle">Loading...</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnCancel">
                                        <i class="bi bi-x-circle"></i> Cancel
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
            this.bindCancelButton();
        },
        
        // Load initial data (payment modes + booking data)
        loadInitialData: function() {
            const self = this;
            
            // Load payment modes first, then booking data
            TempleAPI.get('/masters/payment-modes/active')
                .done(function(response) {
                    if (response.success && response.data) {
                        self.paymentModes = response.data;
                    } else {
                        self.paymentModes = [];
                        console.warn('No payment modes found');
                    }
                })
                .fail(function(error) {
                    console.error('Failed to load payment modes:', error);
                    self.paymentModes = [];
                })
                .always(function() {
                    self.loadBookingData();
                });
        },
        
        // Load booking data from API
        loadBookingData: function() {
            const self = this;
            
            TempleAPI.get(`/bookings/buddha-lamp/${this.bookingId}`)
                .done(function(response) {
                    if (response.success && response.data) {
                        self.bookingData = response.data;
                        
                        // Check if booking can be edited
                        if (self.bookingData.booking_status === 'CANCELLED') {
                            TempleCore.showToast('Cancelled bookings cannot be edited', 'warning');
                            self.navigateBack();
                            return;
                        }
                        
                        self.render();
                        self.initAnimations();
                        self.bindEvents();
                        self.populateForm();
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
        
        // Generate payment methods HTML dynamically
        generatePaymentMethodsHTML: function() {
            if (!this.paymentModes || this.paymentModes.length === 0) {
                return `
                    <div class="col-12">
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            No payment methods available. Please contact administrator.
                        </div>
                    </div>
                `;
            }
            
            return this.paymentModes.map((mode, index) => {
                const iconDisplay = mode.icon_display_url || { type: 'bootstrap', value: 'bi-currency-dollar' };
                const iconHtml = iconDisplay.type === 'bootstrap' 
                    ? `<i class="bi ${iconDisplay.value}"></i>`
                    : `<img src="${iconDisplay.value}" alt="${mode.name}" style="width: 24px; height: 24px; object-fit: contain;">`;
                
                return `
                    <div class="col-lg-20p col-md-4 col-sm-6">
                        <div class="form-check form-check-card">
                            <input class="form-check-input" type="radio" name="payment_method" 
                                   id="payment${mode.id}" value="${mode.id}" ${index === 0 ? 'required' : ''}>
                            <label class="form-check-label" for="payment${mode.id}">
                                ${iconHtml}
                                <span>${mode.name}</span>
                            </label>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        // Render page HTML
        render: function() {
            const data = this.bookingData;
            const paymentMethodsHTML = this.generatePaymentMethodsHTML();
            const currency = TempleCore.getCurrency() || 'RM';
            
            const html = `
                <div class="buddha-lamp-edit-page">
                    <!-- Page Header with Animation -->
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Edit Buddha Lamp Booking</h1>
                                            <p class="buddha-lamp-subtitle">${data.booking_number}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-outline-light btn-lg" id="btnView">
                                            <i class="bi bi-eye"></i> View
                                        </button>
                                        <button class="btn btn-outline-light btn-lg" id="btnCancel">
                                            <i class="bi bi-x-circle"></i> Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Booking Info Banner -->
                    <div class="alert alert-info d-flex align-items-center mb-4" data-aos="fade-up" data-aos-duration="800">
                        <i class="bi bi-info-circle-fill fs-4 me-3"></i>
                        <div>
                            <strong>Editing Booking:</strong> ${data.booking_number} | 
                            <strong>Status:</strong> ${this.formatStatus(data.booking_status)} | 
                            <strong>Created:</strong> ${this.formatDate(data.created_at)}
                        </div>
                    </div>

                    <!-- Buddha Lamp Booking Form -->
                    <div class="card shadow-sm buddha-lamp-form-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-4">
                            <form id="buddhaLampEditForm" novalidate>
                                <div class="row g-4">
                                    <!-- Personal Information Section -->
                                    <div class="col-12">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-person-badge"></i>
                                            <span>Personal Information</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Name Fields -->
                                    <div class="col-md-6">
                                        <label class="form-label">Name (Chinese)<span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="name_chinese" id="nameChinese" required>
                                        <div class="invalid-feedback">Please enter Chinese name</div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Name (English)<span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="name_english" id="nameEnglish" required>
                                        <div class="invalid-feedback">Please enter English name</div>
                                    </div>
                                    
                                    <!-- Contact Information -->
                                    <div class="col-md-6">
                                        <label class="form-label">NRIC No.<span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="nric" id="nric" required 
                                               placeholder="e.g., 123456-12-1234">
                                        <div class="invalid-feedback">Please enter NRIC number</div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Email<span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" name="email" id="email" required
                                               placeholder="e.g., example@email.com">
                                        <div class="invalid-feedback">Please enter valid email</div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Contact No.<span class="text-danger">*</span></label>
                                        <input type="tel" class="form-control" name="contact_no" id="contactNo" required
                                               placeholder="e.g., +60 12-345 6789">
                                        <div class="invalid-feedback">Please enter contact number</div>
                                    </div>
                                    
                                    <!-- Booking Details Section -->
                                    <div class="col-12 mt-4">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-calendar-check"></i>
                                            <span>Booking Details</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Booking Date -->
                                    <div class="col-md-6">
                                        <label class="form-label">Booking Date<span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" name="booking_date" id="bookingDate" required>
                                        <div class="invalid-feedback">Please select booking date</div>
                                    </div>
                                    
                                    <!-- Booking Status (Read Only for display) -->
                                    <div class="col-md-6">
                                        <label class="form-label">Booking Status</label>
                                        <select class="form-select" name="booking_status" id="bookingStatus">
                                            <option value="PENDING">Pending</option>
                                            <option value="CONFIRMED">Confirmed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Amount Section -->
                                    <div class="col-12 mt-3">
                                        <label class="form-label d-flex align-items-center">
                                            <i class="bi bi-cash-stack me-2"></i>
                                            Amount<span class="text-danger ms-1">*</span>
                                        </label>
                                        
                                        <!-- Fixed Amount Checkbox Card -->
                                        <div class="amount-checkbox-card mb-3" id="amount5000Card">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="amount5000" name="amount_preset">
                                                <label class="form-check-label" for="amount5000">
                                                    <div class="d-flex align-items-center">
                                                        <i class="bi bi-check-circle-fill text-primary me-2" style="font-size: 1.5rem;"></i>
                                                        <div>
                                                            <h5 class="mb-0">${currency} 5,000.00</h5>
                                                            <small class="text-muted">Standard Buddha Lamp Offering</small>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        <!-- Custom Amount Input -->
                                        <div id="customAmountSection">
                                            <label class="form-label">Or Enter Custom Amount</label>
                                            <div class="input-group">
                                                <span class="input-group-text">${currency}</span>
                                                <input type="number" class="form-control" name="amount" id="customAmount"
                                                       placeholder="0.00" step="0.01" min="0">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Method Section -->
                                    <div class="col-12 mt-4">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-credit-card"></i>
                                            <span>Payment Method</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Method Cards - Dynamic -->
                                    ${paymentMethodsHTML}
                                    
                                    <!-- Additional Notes -->
                                    <div class="col-12 mt-3">
                                        <label class="form-label">
                                            <i class="bi bi-sticky me-2"></i>
                                            Additional Notes(Optional)
                                        </label>
                                        <textarea class="form-control" name="notes" id="notes" rows="3" 
                                                  placeholder="Enter any additional information..."></textarea>
                                    </div>
                                </div>
                                
                                <!-- Receipt Print Option -->
                                <div class="receipt-print-option mt-4 pt-3 border-top">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="printReceipt" name="print_receipt">
                                        <label class="form-check-label" for="printReceipt">
                                            <i class="bi bi-printer me-2"></i>
                                            Print Receipt after saving
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Form Actions -->
                                <div class="form-actions mt-4 pt-4 border-top" data-aos="fade-up" data-aos-delay="300">
                                    <div class="d-flex justify-content-between">
                                        <button type="button" class="btn btn-outline-secondary" id="btnReset">
                                            <i class="bi bi-arrow-counterclockwise"></i> Reset Changes
                                        </button>
                                        <div class="d-flex gap-2">
                                            <button type="button" class="btn btn-secondary" id="btnCancelBottom">
                                                <i class="bi bi-x-circle"></i> Cancel
                                            </button>
                                            <button type="submit" class="btn btn-primary btn-lg px-4" id="btnSubmit">
                                                <i class="bi bi-check-circle"></i> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Populate form with booking data
        populateForm: function() {
            const data = this.bookingData;
            
            // Personal Information
            $('input[name="name_chinese"]').val(data.name_secondary || '');
            $('input[name="name_english"]').val(data.name_primary || '');
            $('input[name="nric"]').val(data.nric || '');
            $('input[name="email"]').val(data.email || '');
            $('input[name="contact_no"]').val(data.phone_no || '');
            
            // Booking Details
            $('input[name="booking_date"]').val(data.booking_date || '');
            $('select[name="booking_status"]').val(data.booking_status || 'CONFIRMED');
            
            // Amount
            const amount = parseFloat(data.total_amount) || 0;
            if (amount === 5000) {
                $('#amount5000').prop('checked', true).trigger('change');
            } else {
                $('input[name="amount"]').val(amount.toFixed(2));
            }
            
            // Payment Method - try to match by ID or name
            const payment = data.payment;
            if (payment && payment.payment_method) {
                // Try to find matching payment mode
                const matchingMode = this.paymentModes.find(mode => 
                    mode.name.toLowerCase() === payment.payment_method.toLowerCase() ||
                    mode.id === payment.payment_mode_id
                );
                
                if (matchingMode) {
                    $(`#payment${matchingMode.id}`).prop('checked', true).trigger('change');
                }
            }
            
            // Notes
            $('textarea[name="notes"]').val(data.special_instructions || data.additional_notes || '');
            
            // Print option
            $('#printReceipt').prop('checked', data.print_option === 'SINGLE_PRINT');
            
            // Mark initial state
            this.hasChanges = false;
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
            
            gsap.fromTo('.form-control, .form-select',
                { opacity: 0, y: 20 },
                { 
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    stagger: 0.03,
                    ease: 'power2.out',
                    delay: 0.3,
                    clearProps: 'all'
                }
            );
            
            gsap.fromTo('.form-check-card',
                { scale: 0.8, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'back.out(1.2)',
                    delay: 0.5,
                    clearProps: 'all'
                }
            );
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            this.bindCancelButton();
            
            // View button
            $('#btnView').on('click.' + this.eventNamespace, function() {
				const bookingId = self.bookingId;
                if (self.hasChanges) {
                    Swal.fire({
                        title: 'Unsaved Changes',
                        text: 'You have unsaved changes. Are you sure you want to leave?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, leave',
                        cancelButtonText: 'No, stay'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            self.cleanup();
                            TempleRouter.navigate('buddha-lamp/view', { id: bookingId });
                        }
                    });
                } else {
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp/view', { id: bookingId });
                }
            });
            
            // Fixed amount checkbox (RM 5000)
            $('#amount5000').on('change.' + this.eventNamespace, function() {
                const $card = $('#amount5000Card');
                const $customAmount = $('input[name="amount"]');
                
                if ($(this).is(':checked')) {
                    gsap.to($card[0], {
                        scale: 1.02,
                        boxShadow: '0 8px 25px rgba(255, 0, 255, 0.25)',
                        borderColor: '#ff00ff',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                    
                    $card.addClass('checked');
                    $customAmount.val('').prop('disabled', true);
                    
                    gsap.to('#customAmountSection', {
                        opacity: 0.5,
                        duration: 0.3
                    });
                } else {
                    gsap.to($card[0], {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        borderColor: '#e9ecef',
                        duration: 0.3
                    });
                    
                    $card.removeClass('checked');
                    $customAmount.prop('disabled', false);
                    
                    gsap.to('#customAmountSection', {
                        opacity: 1,
                        duration: 0.3
                    });
                }
                
                self.hasChanges = true;
            });
            
            // Custom amount input
            $('input[name="amount"]').on('input.' + this.eventNamespace, function() {
                if ($(this).val() !== '') {
                    $('#amount5000').prop('checked', false).trigger('change');
                }
                self.hasChanges = true;
            });
            
            // Track changes on all form inputs
            $('#buddhaLampEditForm input, #buddhaLampEditForm select, #buddhaLampEditForm textarea').on('change.' + this.eventNamespace + ' input.' + this.eventNamespace, function() {
                self.hasChanges = true;
            });
            
            // Form submission
            $('#buddhaLampEditForm').on('submit.' + this.eventNamespace, function(e) {
                e.preventDefault();
                
                // Custom validation for amount
                const amount5000Checked = $('#amount5000').is(':checked');
                const customAmount = $('input[name="amount"]').val();
                
                if (!amount5000Checked && !customAmount) {
                    TempleCore.showToast('Please select fixed amount or enter a custom amount', 'error');
                    gsap.to('#amount5000Card', {
                        x: [-10, 10, -10, 10, 0],
                        duration: 0.5
                    });
                    return;
                }
                
                // Validate payment method selection
                if (!$('input[name="payment_method"]:checked').val()) {
                    TempleCore.showToast('Please select a payment method', 'error');
                    gsap.to('.form-check-card', {
                        x: [-5, 5, -5, 5, 0],
                        duration: 0.4,
                        stagger: 0.05
                    });
                    return;
                }
                
                if (!this.checkValidity()) {
                    e.stopPropagation();
                    $(this).addClass('was-validated');
                    
                    gsap.to('.buddha-lamp-form-card', {
                        x: [-10, 10, -10, 10, 0],
                        duration: 0.5
                    });
                    
                    TempleCore.showToast('Please fill in all required fields', 'error');
                    return;
                }
                
                self.submitForm();
            });
            
            // Reset button
            $('#btnReset').on('click.' + this.eventNamespace, function() {
                Swal.fire({
                    title: 'Reset Changes?',
                    text: 'This will restore all fields to their original values.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, reset',
                    cancelButtonText: 'No, keep changes'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.populateForm();
                        TempleCore.showToast('Form reset to original values', 'info');
                    }
                });
            });
            
            // Radio card selection animation
            $(document).on('change.' + this.eventNamespace, 'input[type="radio"][name="payment_method"]', function() {
                const $parent = $(this).closest('.form-check-card');
                
                $('.form-check-card').each(function() {
                    gsap.to(this, {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        borderColor: '#dee2e6',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
                
                gsap.to($parent[0], {
                    scale: 1.05,
                    boxShadow: '0 8px 20px rgba(255, 0, 255, 0.2)',
                    borderColor: '#ff00ff',
                    duration: 0.3,
                    ease: 'power2.out'
                });
                
                self.hasChanges = true;
            });
            
            // Input field animations on focus
            $('.form-control').on('focus.' + this.eventNamespace, function() {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur.' + this.eventNamespace, function() {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });
            
            // Button hover animations
            $('.btn')
                .on('mouseenter.' + this.eventNamespace, function() {
                    gsap.to($(this), {
                        scale: 1.05,
                        duration: 0.2,
                        ease: 'power1.out'
                    });
                })
                .on('mouseleave.' + this.eventNamespace, function() {
                    gsap.to($(this), {
                        scale: 1,
                        duration: 0.2
                    });
                });
        },
        
        // Bind cancel button
        bindCancelButton: function() {
            const self = this;
            
            $('#btnCancel, #btnCancelBottom').off('click').on('click.' + this.eventNamespace, function() {
                if (self.hasChanges) {
                    Swal.fire({
                        title: 'Unsaved Changes',
                        text: 'You have unsaved changes. Are you sure you want to leave?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, leave',
                        cancelButtonText: 'No, stay'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            self.navigateBack();
                        }
                    });
                } else {
                    self.navigateBack();
                }
            });
        },
        
        // Submit form
        submitForm: function() {
            const self = this;
            const formData = this.getFormData();
            
            const $submitBtn = $('#btnSubmit');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Saving...');
            
            // Prepare payload for API
            const payload = {
                booking_date: formData.booking_date,
                booking_status: formData.booking_status,
                total_amount: formData.amount,
                paid_amount: formData.amount,
                print_option: formData.print_receipt ? 'SINGLE_PRINT' : 'NO_PRINT',
                special_instructions: formData.notes,
                
                meta: {
                    nric: formData.nric,
                    name_primary: formData.name_english,
                    name_secondary: formData.name_chinese,
                    email: formData.email,
                    phone_no: formData.contact_no,
                    additional_notes: formData.notes
                },
                
                payment: {
                    amount: formData.amount,
                    payment_mode_id: formData.payment_method,
                    payment_type: 'FULL',
                    payment_status: 'SUCCESS'
                }
            };
            
            // API call to update booking
            TempleAPI.put(`/bookings/buddha-lamp/${this.bookingId}`, payload)
                .done(function(response) {
                    if (response.success) {
                        gsap.to('.buddha-lamp-form-card', {
                            scale: 1.02,
                            duration: 0.2,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });
                        
                        self.hasChanges = false;
                        const bookingData = response.data;
                        
                        if (formData.print_receipt) {
                            sessionStorage.setItem('temp_booking_data', JSON.stringify(bookingData));
							const bookingId = self.bookingId;
                            self.cleanup();
                            TempleRouter.navigate('buddha-lamp/print', { 
                                id: bookingData.id || bookingId 
                            });
                        } else {
                            self.showSuccessMessage(bookingData);
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update booking', 'error');
                        $submitBtn.prop('disabled', false).html(originalText);
                    }
                })
                .fail(function(xhr) {
                    let errorMessage = 'Failed to update booking';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                    $submitBtn.prop('disabled', false).html(originalText);
                });
        },
        
        // Show success message
        showSuccessMessage: function(bookingData) {
            const self = this;
            
            Swal.fire({
                icon: 'success',
                title: 'Booking Updated!',
                html: `
                    <p>Your Buddha Lamp booking has been updated successfully.</p>
                    <p><strong>Booking No: ${bookingData.booking_number}</strong></p>
                `,
                confirmButtonText: 'Back to List',
                showCancelButton: true,
                cancelButtonText: 'View Booking',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#007bff'
            }).then((result) => {
                if (result.isConfirmed) {
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp');
                } else if (result.dismiss === Swal.DismissReason.cancel) {
					const bookingId = self.bookingId;
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp/view', { id: bookingId });
                }
            });
        },
        
        // Get form data
        getFormData: function() {
            const amount5000Checked = $('#amount5000').is(':checked');
            const customAmount = $('input[name="amount"]').val();
            
            return {
                name_chinese: $('input[name="name_chinese"]').val().trim(),
                name_english: $('input[name="name_english"]').val().trim(),
                nric: $('input[name="nric"]').val().trim(),
                email: $('input[name="email"]').val().trim(),
                contact_no: $('input[name="contact_no"]').val().trim(),
                booking_date: $('input[name="booking_date"]').val(),
                booking_status: $('select[name="booking_status"]').val(),
                amount: amount5000Checked ? 5000.00 : parseFloat(customAmount) || 0,
                payment_method: $('input[name="payment_method"]:checked').val(),
                notes: $('textarea[name="notes"]').val().trim(),
                print_receipt: $('#printReceipt').is(':checked')
            };
        },
        
        // Navigate back to list
        navigateBack: function() {
            gsap.to('.buddha-lamp-edit-page', {
                opacity: 0,
                y: -30,
                duration: 0.3,
                onComplete: () => {
                    this.cleanup();
                    TempleRouter.navigate('buddha-lamp');
                }
            });
        },
        
        // Helper functions
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
        
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    };
    
})(jQuery, window);