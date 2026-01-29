// js/pages/buddha-lamp/edit.js
// Buddha Lamp Booking Edit Page - Dynamic Version with Custom Amount Support

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
        buddhaLampMasters: [],
        intervals: [],
        timeouts: [],
        hasChanges: false,
        selectedMaster: null,
        
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
            this.buddhaLampMasters = [];
            this.hasChanges = false;
            this.selectedMaster = null;
            
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
        
        // Load initial data (Buddha Lamp masters, payment modes, then booking data)
        loadInitialData: function() {
            const self = this;
            
            // Load Buddha Lamp masters and payment modes first, then booking data
            Promise.all([
                TempleAPI.get('/bookings/buddha-lamp/masters/active'),
                TempleAPI.get('/masters/payment-modes/active')
            ])
            .then(function([mastersResponse, paymentResponse]) {
                if (mastersResponse.success && mastersResponse.data) {
                    self.buddhaLampMasters = mastersResponse.data;
                } else {
                    self.buddhaLampMasters = [];
                    console.warn('No Buddha Lamp masters found');
                }
                
                if (paymentResponse.success && paymentResponse.data) {
                    self.paymentModes = paymentResponse.data;
                } else {
                    self.paymentModes = [];
                    console.warn('No payment modes found');
                }
            })
            .catch(function(error) {
                console.error('Failed to load initial data:', error);
                self.buddhaLampMasters = [];
                self.paymentModes = [];
            })
            .finally(function() {
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
        
        // Generate Buddha Lamp Master cards HTML
        generateBuddhaLampMastersHTML: function() {
            const currency = TempleCore.getCurrency() || 'RM';
            
            if (!this.buddhaLampMasters || this.buddhaLampMasters.length === 0) {
                return `
                    <div class="col-12">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            No predefined Buddha Lamp types available. Please enter a custom amount below.
                        </div>
                    </div>
                `;
            }
            
            return this.buddhaLampMasters.map((master, index) => {
                const amount = parseFloat(master.amount || 0);
                const formattedAmount = amount.toLocaleString('en-MY', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
                
                return `
                    <div class="col-lg-20p col-md-4 col-sm-6">
                        <div class="form-check form-check-card buddha-lamp-card">
                            <input class="form-check-input" type="radio" name="buddha_lamp_master" 
                                   id="master${master.id}" value="${master.id}" 
                                   data-amount="${amount}"
                                   data-name="${master.name || ''}">
                            <label class="form-check-label" for="master${master.id}">
                                <div class="buddha-lamp-card-content">
                                    <i class="bi bi-brightness-high-fill text-warning" style="font-size: 2rem;"></i>
                                    <h5 class="mt-2 mb-1">${master.name || 'Buddha Lamp'}</h5>
                                    ${master.name_secondary ? `<p class="text-muted small mb-2">${master.name_secondary}</p>` : ''}
                                    <div class="buddha-lamp-amount">
                                        <span class="amount-label">Amount:</span>
                                        <span class="amount-value">${currency} ${formattedAmount}</span>
                                    </div>
                                    ${master.description_primary ? `
                                        <p class="small text-muted mt-2 mb-0">${master.description_primary}</p>
                                    ` : ''}
                                </div>
                            </label>
                        </div>
                    </div>
                `;
            }).join('');
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
            const data = this.bookingData;
            const buddhaLampMastersHTML = this.generateBuddhaLampMastersHTML();
            const paymentMethodsHTML = this.generatePaymentMethodsHTML();
            const currency = TempleCore.getCurrency() || 'RM';
            const hasMasters = this.buddhaLampMasters && this.buddhaLampMasters.length > 0;
            
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
                                    
                                    <!-- Booking Status -->
                                    <div class="col-md-6">
                                        <label class="form-label">Booking Status 预订状态</label>
                                        <select class="form-select" name="booking_status" id="bookingStatus">
                                            <option value="PENDING">Pending 待处理</option>
                                            <option value="CONFIRMED">Confirmed 已确认</option>
                                            <option value="COMPLETED">Completed 已完成</option>
                                        </select>
                                    </div>
                                    
                                    ${hasMasters ? `
                                    <!-- Buddha Lamp Type Selection -->
                                    <div class="col-12 mt-3">
                                        <label class="form-label d-flex align-items-center justify-content-between">
                                            <span>
                                                <i class="bi bi-brightness-high me-2"></i>
                                                Select Buddha Lamp Type 选择佛灯类型 (Optional)
                                            </span>
                                            <button type="button" class="btn btn-sm btn-secondary" id="btnClearSelection" style="display: none;">
                                                <i class="bi bi-x-circle"></i> Clear Selection
                                            </button>
                                        </label>
                                        <div class="row g-3" id="buddhaLampMastersContainer">
                                            ${buddhaLampMastersHTML}
                                        </div>
                                    </div>
                                    
                                    <!-- Selected Amount Display -->
                                    <div class="col-12">
                                        <div class="alert alert-info d-none" id="selectedAmountDisplay">
                                            <div class="d-flex align-items-center justify-content-between">
                                                <div>
                                                    <i class="bi bi-info-circle me-2"></i>
                                                    <strong>Selected:</strong> <span id="selectedMasterName"></span>
                                                </div>
                                                <div>
                                                    <strong>Amount:</strong> <span id="selectedAmount" class="fs-5 text-primary"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    ` : `
                                    <div class="col-12 mt-3">
                                        ${buddhaLampMastersHTML}
                                    </div>
                                    `}
                                    
                                    <!-- Custom Amount Section -->
                                    <div class="col-12 mt-3" id="customAmountSection" ${hasMasters ? 'style="display: block;"' : 'style="display: block;"'}>
                                        <label class="form-label d-flex align-items-center">
                                            <i class="bi bi-cash-stack me-2"></i>
                                            ${hasMasters ? 'Or Enter Custom Amount 或输入自定义金额' : 'Enter Amount 输入金额'} <span class="text-danger ms-1">*</span>
                                        </label>
                                        <div class="input-group input-group-lg">
                                            <span class="input-group-text">${currency}</span>
                                            <input type="number" class="form-control" name="custom_amount" id="customAmountInput"
                                                   placeholder="0.00" step="0.01" min="0.01" ${!hasMasters ? 'required' : ''}>
                                            <div class="invalid-feedback">Please enter a valid amount</div>
                                        </div>
                                        <small class="text-muted">Enter the donation amount for Buddha Lamp offering</small>
                                    </div>
                                    
                                    <!-- Payment Method Section -->
                                    <div class="col-12 mt-4">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-credit-card"></i>
                                            <span>Payment Method 付款方式</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Method Cards -->
                                    <div class="row g-3">
                                        ${paymentMethodsHTML}
                                    </div>
                                    
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
                                        <input class="form-check-input" type="checkbox" id="printReceipt" name="print_receipt">
                                        <label class="form-check-label" for="printReceipt">
                                            <i class="bi bi-printer me-2"></i>
                                            Print Receipt after saving 保存后打印收据
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
            const hasMasters = this.buddhaLampMasters && this.buddhaLampMasters.length > 0;
            
            // Personal Information
            $('input[name="name_chinese"]').val(data.name_secondary || '');
            $('input[name="name_english"]').val(data.name_primary || '');
            $('input[name="nric"]').val(data.nric || '');
            $('input[name="email"]').val(data.email || '');
            $('input[name="contact_no"]').val(data.phone_no || '');
            
            // Booking Details
            $('input[name="booking_date"]').val(data.booking_date || '');
            $('select[name="booking_status"]').val(data.booking_status || 'CONFIRMED');
            
            // Amount - Check if this was a master selection or custom amount
            const amount = parseFloat(data.total_amount) || 0;
            const isCustomAmount = data.is_custom_amount === true || data.is_custom_amount === 'true';
            const buddhaLampMasterId = data.buddha_lamp_master_id;
            
            if (hasMasters && !isCustomAmount && buddhaLampMasterId && buddhaLampMasterId !== 'custom') {
                // Try to find and select the matching master
                const matchingMaster = this.buddhaLampMasters.find(m => 
                    m.id === buddhaLampMasterId || m.id === parseInt(buddhaLampMasterId)
                );
                
                if (matchingMaster) {
                    // Select the master radio button
                    $(`#master${matchingMaster.id}`).prop('checked', true).trigger('change');
                } else {
                    // Master not found, use custom amount
                    $('input[name="custom_amount"]').val(amount.toFixed(2));
                }
            } else {
                // Custom amount
                $('input[name="custom_amount"]').val(amount.toFixed(2));
            }
            
            // Payment Method - try to match by ID or name
            const payment = data.payment;
            if (payment && payment.payment_method) {
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
            const hasMasters = this.buddhaLampMasters && this.buddhaLampMasters.length > 0;
            
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
            
            // Buddha Lamp Master selection (only if masters are available)
            if (hasMasters) {
                $(document).on('change.' + this.eventNamespace, 'input[name="buddha_lamp_master"]', function() {
                    const $card = $(this).closest('.form-check-card');
                    const masterId = $(this).val();
                    const masterName = $(this).data('name');
                    const amount = parseFloat($(this).data('amount'));
                    const currency = TempleCore.getCurrency() || 'RM';
                    
                    // Store selected master
                    self.selectedMaster = {
                        id: masterId,
                        name: masterName,
                        amount: amount
                    };
                    
                    // Reset all Buddha Lamp cards
                    $('.buddha-lamp-card').each(function() {
                        gsap.to(this, {
                            scale: 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            borderColor: '#dee2e6',
                            duration: 0.3,
                            ease: 'power2.out'
                        });
                    });
                    
                    // Animate selected card
                    gsap.to($card[0], {
                        scale: 1.05,
                        boxShadow: '0 8px 20px rgba(255, 193, 7, 0.3)',
                        borderColor: '#ffc107',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                    
                    // Show selected amount display
                    const formattedAmount = amount.toLocaleString('en-MY', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    });
                    
                    $('#selectedMasterName').text(masterName);
                    $('#selectedAmount').text(`${currency} ${formattedAmount}`);
                    $('#selectedAmountDisplay').removeClass('d-none');
                    
                    gsap.fromTo('#selectedAmountDisplay', 
                        { opacity: 0, y: -10 },
                        { opacity: 1, y: 0, duration: 0.3 }
                    );
                    
                    // Hide custom amount section when a master is selected
                    gsap.to('#customAmountSection', {
                        opacity: 0,
                        height: 0,
                        marginTop: 0,
                        duration: 0.3,
                        ease: 'power2.out',
                        onComplete: function() {
                            $('#customAmountSection').hide();
                            $('#customAmountInput').val('').prop('required', false);
                        }
                    });
                    
                    // Show clear selection button
                    $('#btnClearSelection').fadeIn(300);
                    
                    self.hasChanges = true;
                });
                
                // Clear selection button
                $('#btnClearSelection').on('click.' + this.eventNamespace, function() {
                    // Clear selected master
                    self.selectedMaster = null;
                    
                    // Uncheck all radio buttons
                    $('input[name="buddha_lamp_master"]').prop('checked', false);
                    
                    // Reset all cards
                    $('.buddha-lamp-card').each(function() {
                        gsap.to(this, {
                            scale: 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            borderColor: '#dee2e6',
                            duration: 0.3
                        });
                    });
                    
                    // Hide selected amount display
                    gsap.to('#selectedAmountDisplay', {
                        opacity: 0,
                        duration: 0.2,
                        onComplete: function() {
                            $('#selectedAmountDisplay').addClass('d-none');
                        }
                    });
                    
                    // Show custom amount section
                    $('#customAmountSection').show();
                    gsap.fromTo('#customAmountSection', 
                        { opacity: 0, height: 0, marginTop: 0 },
                        { 
                            opacity: 1, 
                            height: 'auto', 
                            marginTop: '1rem',
                            duration: 0.3,
                            ease: 'power2.out',
                            onStart: function() {
                                $('#customAmountInput').prop('required', true);
                            }
                        }
                    );
                    
                    // Hide clear button
                    $(this).fadeOut(300);
                    
                    // Focus on custom amount input
                    setTimeout(function() {
                        $('#customAmountInput').focus();
                    }, 400);
                    
                    self.hasChanges = true;
                });
            }
            
            // Custom amount input validation
            $('#customAmountInput').on('input.' + this.eventNamespace, function() {
                const value = parseFloat($(this).val());
                if (value && value > 0) {
                    $(this).removeClass('is-invalid').addClass('is-valid');
                } else {
                    $(this).removeClass('is-valid');
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
                const hasMasterSelected = self.selectedMaster !== null;
                const customAmount = parseFloat($('#customAmountInput').val());
                
                // Check if either a master is selected OR a custom amount is entered
                if (!hasMasterSelected && (!customAmount || customAmount <= 0)) {
                    TempleCore.showToast('Please select a Buddha Lamp type or enter a custom amount', 'error');
                    
                    if (hasMasters) {
                        gsap.to('.buddha-lamp-card', {
                            x: [-5, 5, -5, 5, 0],
                            duration: 0.4,
                            stagger: 0.05
                        });
                    }
                    
                    gsap.to('#customAmountInput', {
                        x: [-5, 5, -5, 5, 0],
                        duration: 0.4
                    });
                    
                    $('#customAmountInput').focus();
                    return;
                }
                
                // Validate payment method selection
                if (!$('input[name="payment_method"]:checked').val()) {
                    TempleCore.showToast('Please select a payment method', 'error');
                    gsap.to('.form-check-card:not(.buddha-lamp-card)', {
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
            
            // Payment method selection animation
            $(document).on('change.' + this.eventNamespace, 'input[type="radio"][name="payment_method"]', function() {
                const $parent = $(this).closest('.form-check-card');
                
                $('.form-check-card').not('.buddha-lamp-card').each(function() {
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
            
            // Add buddha_lamp_master_id only if a master was selected
            if (formData.buddha_lamp_master_id) {
                payload.buddha_lamp_master_id = formData.buddha_lamp_master_id;
            }
            
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
                title: '🏮 Booking Updated! 预订已更新！',
                html: `
                    <p>Your Buddha Lamp booking has been updated successfully.</p>
                    <p><strong>Booking No: ${bookingData.booking_number}</strong></p>
                `,
                confirmButtonText: 'Back to List 返回列表',
                showCancelButton: true,
                cancelButtonText: 'View Booking 查看预订',
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
            const hasMasterSelected = this.selectedMaster !== null;
            const customAmount = parseFloat($('#customAmountInput').val());
            
            return {
                name_chinese: $('input[name="name_chinese"]').val().trim(),
                name_english: $('input[name="name_english"]').val().trim(),
                nric: $('input[name="nric"]').val().trim(),
                email: $('input[name="email"]').val().trim(),
                contact_no: $('input[name="contact_no"]').val().trim(),
                booking_date: $('input[name="booking_date"]').val(),
                booking_status: $('select[name="booking_status"]').val(),
                buddha_lamp_master_id: hasMasterSelected ? this.selectedMaster.id : null,
                amount: hasMasterSelected ? this.selectedMaster.amount : customAmount,
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