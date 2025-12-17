// js/pages/buddha-lamp/create.js
// Buddha Lamp Booking Create Page - Dynamic Version with GSAP + AOS animations + Receipt Print

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
    
    window.BuddhaLampCreatePage = {
        pageId: 'buddha-lamp-create',
        eventNamespace: window.BuddhaLampSharedModule.eventNamespace,
        paymentModes: [],
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.BuddhaLampSharedModule.registerPage(this.pageId);
            this.loadPaymentModes();
        },
        
        // Load payment modes dynamically based on user role
        loadPaymentModes: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            TempleAPI.get('/masters/payment-modes/active')
                .done(function(response) {
                    if (response.success && response.data) {
                        self.paymentModes = response.data;
                    } else {
                        self.paymentModes = [];
                        console.warn('No payment modes found for user role');
                    }
                    self.render();
                    self.initAnimations();
                    self.bindEvents();
                    self.initializePlugins();
                })
                .fail(function(error) {
                    console.error('Failed to load payment modes:', error);
                    self.paymentModes = [];
                    self.render();
                    self.initAnimations();
                    self.bindEvents();
                    self.initializePlugins();
                    TempleCore.showToast('Failed to load payment modes', 'warning');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
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
            
            console.log(`${this.pageId} cleanup completed`);
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
                const iconDisplay = mode.icon_display_url_data || { type: 'bootstrap', value: 'bi-currency-dollar' };
                const iconHtml = iconDisplay.type === 'bootstrap' 
                    ? `<i class="bi ${iconDisplay.value}"></i>`
                    : `<img src="${iconDisplay.value}" alt="${mode.name}" style="width: ${iconDisplay.width || 62}px; 
                   height: ${iconDisplay.height || 28}px; object-fit: contain;">`;
                
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
            const paymentMethodsHTML = this.generatePaymentMethodsHTML();
            const currency = TempleCore.getCurrency() || 'RM';
            
            const html = `
                <div class="buddha-lamp-page">
                    <!-- Page Header with Animation -->
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Buddha Lamp Booking</h1>
                                            <p class="buddha-lamp-subtitle">佛前灯预订 • New Buddha Lamp Booking</p>
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

                    <!-- Buddha Lamp Booking Form -->
                    <div class="card shadow-sm buddha-lamp-form-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-4">
                            <form id="buddhaLampForm" novalidate>
                                <div class="row g-4">
                                    <!-- Personal Information Section -->
                                    <div class="col-12">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-person-badge"></i>
                                            <span>Personal Information 个人资料</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Name Fields -->
                                    <div class="col-md-6">
                                        <label class="form-label">Name (Chinese) 姓名 (中文) <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="name_chinese" id="nameChinese" required>
                                        <div class="invalid-feedback">Please enter Chinese name</div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Name (English) 姓名 (英文) <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="name_english" id="nameEnglish" required>
                                        <div class="invalid-feedback">Please enter English name</div>
                                    </div>
                                    
                                    <!-- Contact Information -->
                                    <div class="col-md-6">
                                        <label class="form-label">NRIC No. 身份证 <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="nric" id="nric" required 
                                               placeholder="e.g., 123456-12-1234">
                                        <div class="invalid-feedback">Please enter NRIC number</div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Email 电邮 <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" name="email" id="email" required
                                               placeholder="e.g., example@email.com">
                                        <div class="invalid-feedback">Please enter valid email</div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Contact No. 手机号码 <span class="text-danger">*</span></label>
                                        <input type="tel" class="form-control" name="contact_no" id="contactNo" required
                                               placeholder="e.g., +60 12-345 6789">
                                        <div class="invalid-feedback">Please enter contact number</div>
                                    </div>
                                    
                                    <!-- Booking Details Section -->
                                    <div class="col-12 mt-4">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-calendar-check"></i>
                                            <span>Booking Details 预订详情</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Booking Date -->
                                    <div class="col-md-6">
                                        <label class="form-label">Booking Date 预订日期 <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" name="booking_date" id="bookingDate" required>
                                        <div class="invalid-feedback">Please select booking date</div>
                                    </div>
                                    
                                    <!-- Amount Section -->
                                    <div class="col-12 mt-3">
                                        <label class="form-label d-flex align-items-center">
                                            <i class="bi bi-cash-stack me-2"></i>
                                            Amount 数额 <span class="text-danger ms-1">*</span>
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
                                            <label class="form-label">Or Enter Custom Amount 或输入自定义金额</label>
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
                                            <span>Payment Method 付款方式</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Method Cards - Dynamic -->
                                    ${paymentMethodsHTML}
                                    
                                    <!-- Additional Notes -->
                                    <div class="col-12 mt-3">
                                        <label class="form-label">
                                            <i class="bi bi-sticky me-2"></i>
                                            Additional Notes 备注 (Optional)
                                        </label>
                                        <textarea class="form-control" name="notes" id="notes" rows="3" 
                                                  placeholder="Enter any additional information..."></textarea>
                                    </div>
                                </div>
                                
                                <!-- Receipt Print Option -->
                                <div class="receipt-print-option mt-4 pt-3 border-top">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="printReceipt" name="print_receipt" checked>
                                        <label class="form-check-label" for="printReceipt">
                                            <i class="bi bi-printer me-2"></i>
                                            Print Receipt after booking 预订后打印收据
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Form Actions -->
                                <div class="form-actions mt-4 pt-4 border-top" data-aos="fade-up" data-aos-delay="300">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button type="button" class="btn btn-secondary" id="btnReset">
                                            <i class="bi bi-arrow-counterclockwise"></i> Reset
                                        </button>
                                        <button type="submit" class="btn btn-primary btn-lg px-4" id="btnSubmit">
                                            <i class="bi bi-check-circle"></i> Submit Booking
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            
            // Set default booking date to today
            const today = new Date().toISOString().split('T')[0];
            $('input[name="booking_date"]').val(today);
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
        
        // Initialize plugins
        initializePlugins: function() {
            // Initialize any date pickers or other plugins here
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
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
            });
            
            // Custom amount input - uncheck fixed amount when typing
            $('input[name="amount"]').on('input.' + this.eventNamespace, function() {
                if ($(this).val() !== '') {
                    $('#amount5000').prop('checked', false).trigger('change');
                }
            });
            
            // Form submission
            $('#buddhaLampForm').on('submit.' + this.eventNamespace, function(e) {
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
            
            // Cancel button
            $('#btnCancel').on('click.' + this.eventNamespace, function() {
                if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
                    gsap.to('.buddha-lamp-form-card', {
                        opacity: 0,
                        y: -50,
                        duration: 0.3,
                        onComplete: () => {
                            self.cleanup();
                            TempleRouter.navigate('buddha-lamp');
                        }
                    });
                }
            });
            
            // Reset button
            $('#btnReset').on('click.' + this.eventNamespace, function() {
                self.resetForm();
            });
            
            // Radio card selection animation
            $(document).on('change.' + this.eventNamespace, 'input[type="radio"][name="payment_method"]', function() {
                const $parent = $(this).closest('.form-check-card');
                
                // Reset all payment cards first
                $('.form-check-card').each(function() {
                    gsap.to(this, {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        borderColor: '#dee2e6',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
                
                // Animate selected card
                gsap.to($parent[0], {
                    scale: 1.05,
                    boxShadow: '0 8px 20px rgba(255, 0, 255, 0.2)',
                    borderColor: '#ff00ff',
                    duration: 0.3,
                    ease: 'power2.out'
                });
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
        
        // Submit form
        submitForm: function() {
            const self = this;
            const formData = this.getFormData();
            
            // Show loading state
            const $submitBtn = $('#btnSubmit');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            
            // Prepare payload for API
            const payload = {
                // Booking data
                booking_type: 'BUDDHA_LAMP',
                booking_date: formData.booking_date,
                total_amount: formData.amount,
                paid_amount: formData.amount,
                print_option: formData.print_receipt ? 'SINGLE_PRINT' : 'NO_PRINT',
                special_instructions: formData.notes,
                
                // Meta data
                meta: {
                    nric: formData.nric,
                    name_primary: formData.name_english,
                    name_secondary: formData.name_chinese,
                    email: formData.email,
                    phone_no: formData.contact_no,
                    additional_notes: formData.notes
                },
                
                // Payment data
                payment: {
                    amount: formData.amount,
                    payment_mode_id: formData.payment_method,
                    payment_type: 'FULL',
                    payment_status: 'SUCCESS'
                }
            };
            
            // API call to save booking
            TempleAPI.post('/bookings/buddha-lamp', payload)
                .done(function(response) {
                    if (response.success) {
                        // Success animation
                        gsap.to('.buddha-lamp-form-card', {
                            scale: 1.02,
                            duration: 0.2,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });
                        
                        const bookingData = response.data;
                        
                        // Check if receipt print is requested
                        if (formData.print_receipt) {
                            // Store booking data and navigate to print
                            sessionStorage.setItem('temp_booking_data', JSON.stringify(bookingData));
                            self.cleanup();
                            TempleRouter.navigate('buddha-lamp/print', { 
                                id: bookingData.booking_number 
                            });
                        } else {
                            // Just show success message
                            self.showSuccessMessage(bookingData);
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save booking', 'error');
                        $submitBtn.prop('disabled', false).html(originalText);
                    }
                })
                .fail(function(xhr) {
                    let errorMessage = 'Failed to save booking';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                    $submitBtn.prop('disabled', false).html(originalText);
                });
        },
        
        // Show success message (when print is not selected)
        showSuccessMessage: function(bookingData) {
            const self = this;
            
            Swal.fire({
                icon: 'success',
                title: '🏮 Booking Successful! 预订成功！',
                html: `
                    <p>Your Buddha Lamp booking has been recorded successfully.</p>
                    <p><strong>Booking No: ${bookingData.booking_number}</strong></p>
                `,
                confirmButtonText: 'Back to List 返回列表',
                showCancelButton: true,
                cancelButtonText: 'Print Receipt 打印收据',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#007bff'
            }).then((result) => {
                if (result.isConfirmed) {
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp');
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    // User wants to print
                    sessionStorage.setItem('temp_booking_data', JSON.stringify(bookingData));
                    self.cleanup();
                    TempleRouter.navigate('buddha-lamp/print', { 
                        id: bookingData.booking_number 
                    });
                }
            });
        },
        
        // Show success dialog with print options (legacy - kept for backward compatibility)
        showSuccessDialog: function(bookingData) {
            const self = this;
            
            const modalHtml = `
                <div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-body text-center p-5">
                                <div class="success-icon mb-4">
                                    <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                                </div>
                                <h3 class="text-success mb-3">🏮 Booking Successful! 预订成功！</h3>
                                <p class="mb-4">Your Buddha Lamp booking has been recorded successfully.<br>
                                <strong>Booking No: ${bookingData.booking_number || 'N/A'}</strong></p>
                                
                                <div class="d-grid gap-2">
                                    <button type="button" class="btn btn-primary btn-lg" id="btnPrintReceipt">
                                        <i class="bi bi-printer"></i> Print Receipt 打印收据
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" id="btnBackToList">
                                        <i class="bi bi-list-ul"></i> Back to Bookings 返回预订列表
                                    </button>
                                </div>
                                
                                <div class="mt-4 text-muted">
                                    <small>
                                        <i class="bi bi-info-circle"></i> 
                                        You can print the receipt now or later from the bookings list.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#successModal').remove();
            $('body').append(modalHtml);
            
            const modal = new bootstrap.Modal(document.getElementById('successModal'), {
                backdrop: 'static',
                keyboard: false
            });
            modal.show();
            
            $('#successModal').on('shown.bs.modal.' + this.eventNamespace, function() {
                gsap.from('.modal-content', {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.3,
                    ease: 'back.out(1.2)'
                });
                
                gsap.from('.success-icon i', {
                    scale: 0,
                    rotation: 180,
                    duration: 0.5,
                    delay: 0.2,
                    ease: 'back.out(1.5)'
                });
            });
            
            $('#btnPrintReceipt').on('click.' + this.eventNamespace, function() {
                modal.hide();
                sessionStorage.setItem('temp_booking_data', JSON.stringify(bookingData));
                self.cleanup();
                TempleRouter.navigate('buddha-lamp/print', { 
                    id: bookingData.booking_number 
                });
            });
            
            $('#btnBackToList').on('click.' + this.eventNamespace, function() {
                modal.hide();
                self.cleanup();
                TempleRouter.navigate('buddha-lamp');
            });
            
            $('#successModal').on('hidden.bs.modal.' + this.eventNamespace, function() {
                $('#successModal').remove();
            });
        },
        
        // Get form data
        getFormData: function() {
            const amount5000Checked = $('#amount5000').is(':checked');
            const customAmount = $('input[name="amount"]').val();
            
            const formData = {
                name_chinese: $('input[name="name_chinese"]').val().trim(),
                name_english: $('input[name="name_english"]').val().trim(),
                nric: $('input[name="nric"]').val().trim(),
                email: $('input[name="email"]').val().trim(),
                contact_no: $('input[name="contact_no"]').val().trim(),
                booking_date: $('input[name="booking_date"]').val(),
                amount: amount5000Checked ? 5000.00 : parseFloat(customAmount) || 0,
                payment_method: $('input[name="payment_method"]:checked').val(),
                notes: $('textarea[name="notes"]').val().trim(),
                print_receipt: $('#printReceipt').is(':checked')
            };
            
            return formData;
        },
        
        // Reset form
        resetForm: function() {
            $('#buddhaLampForm')[0].reset();
            $('#buddhaLampForm').removeClass('was-validated');
            
            // Reset amount card
            $('#amount5000Card').removeClass('checked');
            gsap.to('#amount5000Card', {
                scale: 1,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                borderColor: '#e9ecef',
                duration: 0.3
            });
            
            // Reset custom amount section
            $('input[name="amount"]').prop('disabled', false);
            gsap.to('#customAmountSection', {
                opacity: 1,
                duration: 0.3
            });
            
            // Reset payment method cards
            $('.form-check-card').each(function() {
                gsap.to(this, {
                    scale: 1,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderColor: '#dee2e6',
                    duration: 0.3
                });
            });
            
            // Reset booking date to today
            const today = new Date().toISOString().split('T')[0];
            $('input[name="booking_date"]').val(today);
            
            // Ensure print receipt is checked by default
            $('#printReceipt').prop('checked', true);
            
            // Animate reset
            gsap.fromTo('#buddhaLampForm', 
                { opacity: 1 },
                { 
                    opacity: 0, 
                    duration: 0.2,
                    onComplete: () => {
                        gsap.to('#buddhaLampForm', { opacity: 1, duration: 0.3 });
                    }
                }
            );
            
            TempleCore.showToast('Form reset', 'info');
        }
    };
    
})(jQuery, window);