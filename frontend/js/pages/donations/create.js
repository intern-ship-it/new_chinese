// js/pages/donations/create.js
// Donation Create Page with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    window.DonationsCreatePage = {
        donationType: 'donation', // Default type
        
        // Page initialization
        init: function(params) {
            this.loadCSS();
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.initializePlugins();
        },
        
        // Load CSS dynamically
        loadCSS: function() {
            // Check if CSS is already loaded
            if (!document.getElementById('donations-css')) {
                const link = document.createElement('link');
                link.id = 'donations-css';
                link.rel = 'stylesheet';
                link.href = '/css/donations.css';
                document.head.appendChild(link);
            }
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="donations-page">
                    <!-- Page Header with Animation -->
                    <div class="donations-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="donations-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="donations-title-wrapper">
                                        <i class="bi bi-gift-fill donations-header-icon"></i>
                                        <div>
                                            <h1 class="donations-title">Record Donation</h1>
                                            <p class="donations-subtitle">捐款记录 • Temple Donation Entry</p>
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

                    <!-- Donation Type Selector Card -->
                    <div class="card shadow-sm mb-4 donation-type-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <label class="form-label fw-semibold">
                                        <i class="bi bi-list-ul me-2"></i>Donation Type 捐款类型
                                    </label>
                                    <select class="form-select form-select-lg" id="donationType">
                                        <option value="donation">General Donation 普通捐款</option>
                                        <option value="voucher">Voucher Donation 券类捐款</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Donation Form Container -->
                    <div class="card shadow-sm donation-form-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-4">
                            <form id="donationForm" novalidate>
                                <!-- Form content will be loaded dynamically -->
                                <div id="formContent"></div>
                                
                                <!-- Form Actions -->
                                <div class="form-actions mt-4 pt-4 border-top" data-aos="fade-up" data-aos-delay="300">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button type="button" class="btn btn-secondary" id="btnReset">
                                            <i class="bi bi-arrow-counterclockwise"></i> Reset
                                        </button>
                                        <button type="submit" class="btn btn-primary btn-lg px-4" id="btnSubmit">
                                            <i class="bi bi-check-circle"></i> Submit Donation
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            
            // Load default form
            this.loadFormContent('donation');
        },
        
        // Load form content based on donation type
        loadFormContent: function(type) {
            const formContent = type === 'donation' ? this.getGeneralDonationForm() : this.getVoucherDonationForm();
            
            // Animate form transition
            const $formContent = $('#formContent');
            
            gsap.to($formContent, {
                opacity: 0,
                y: -20,
                duration: 0.3,
                onComplete: () => {
                    $formContent.html(formContent);
                    
                    // Re-initialize form components
                    this.initializePlugins();
                    
                    // Animate in
                    gsap.fromTo($formContent, 
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
                    );
                }
            });
        },
        
        // General Donation Form Template
        getGeneralDonationForm: function() {
            return `
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
                        <input type="text" class="form-control" name="name_chinese" required>
                        <div class="invalid-feedback">Please enter Chinese name</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label">Name (English) 姓名 (英文) <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="name_english" required>
                        <div class="invalid-feedback">Please enter English name</div>
                    </div>
                    
                    <!-- Contact Information -->
                    <div class="col-md-6">
                        <label class="form-label">NRIC No. 身份证 <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="nric" required>
                        <div class="invalid-feedback">Please enter NRIC number</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label">Email 电邮 <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" name="email" required>
                        <div class="invalid-feedback">Please enter valid email</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label">Contact No. 手机号码 <span class="text-danger">*</span></label>
                        <input type="tel" class="form-control" name="contact_no" required>
                        <div class="invalid-feedback">Please enter contact number</div>
                    </div>
                    
                    <!-- Donation Details Section -->
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-card-checklist"></i>
                            <span>Donation Details 捐款详情</span>
                        </div>
                    </div>
                    
                    <!-- Donation Type Radio -->
                    <div class="col-12">
                        <label class="form-label fw-semibold">Type 类别 <span class="text-danger">*</span></label>
                        <div class="donation-type-options">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="donation_subtype" 
                                               id="typeDonation" value="donation" checked>
                                        <label class="form-check-label" for="typeDonation">
                                            <i class="bi bi-gift"></i>
                                            <span>Donation 普通</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="donation_subtype" 
                                               id="typeMeal" value="meal">
                                        <label class="form-check-label" for="typeMeal">
                                            <i class="bi bi-bowl-rice"></i>
                                            <span>Meal 供奉</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="donation_subtype" 
                                               id="typeMaintenance" value="maintenance">
                                        <label class="form-check-label" for="typeMaintenance">
                                            <i class="bi bi-tools"></i>
                                            <span>Maintenance 维修</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="donation_subtype" 
                                               id="typeOther" value="other">
                                        <label class="form-check-label" for="typeOther">
                                            <i class="bi bi-three-dots"></i>
                                            <span>Other 其他</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Amount -->
                    <div class="col-md-6">
                        <label class="form-label">Amount 款额 <span class="text-danger">*</span></label>
                        <div class="input-group">
                            <span class="input-group-text">RM</span>
                            <input type="number" class="form-control" name="amount" step="0.01" min="0" required>
                            <div class="invalid-feedback">Please enter amount</div>
                        </div>
                    </div>
                    
                    <!-- Payment Method Section -->
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-credit-card"></i>
                            <span>Payment Method 付款方式</span>
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <div class="payment-methods">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmCash" value="cash" checked>
                                        <label class="form-check-label" for="pmCash">
                                            <i class="bi bi-cash-stack"></i>
                                            <span>Cash 现款</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmCheque" value="cheque">
                                        <label class="form-check-label" for="pmCheque">
                                            <i class="bi bi-bank"></i>
                                            <span>Cheque 支票</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmEbanking" value="ebanking">
                                        <label class="form-check-label" for="pmEbanking">
                                            <i class="bi bi-laptop"></i>
                                            <span>E-banking 网银</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmCard" value="card">
                                        <label class="form-check-label" for="pmCard">
                                            <i class="bi bi-credit-card-2-front"></i>
                                            <span>Card 信用卡</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmDuitnow" value="duitnow">
                                        <label class="form-check-label" for="pmDuitnow">
                                            <i class="bi bi-wallet2"></i>
                                            <span>DuitNow 电子钱包</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Notes -->
                    <div class="col-12">
                        <label class="form-label">Notes 备注</label>
                        <textarea class="form-control" name="notes" rows="3" 
                                  placeholder="Additional notes or remarks..."></textarea>
                    </div>
                </div>
            `;
        },
        
        // Voucher Donation Form Template
        getVoucherDonationForm: function() {
            return `
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
                        <input type="text" class="form-control" name="name_chinese" required>
                        <div class="invalid-feedback">Please enter Chinese name</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label">Name (English) 姓名 (英文) <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="name_english" required>
                        <div class="invalid-feedback">Please enter English name</div>
                    </div>
                    
                    <!-- Contact Information -->
                    <div class="col-md-6">
                        <label class="form-label">NRIC No. 身份证 <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="nric" required>
                        <div class="invalid-feedback">Please enter NRIC number</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label">Email 电邮 <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" name="email" required>
                        <div class="invalid-feedback">Please enter valid email</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label">Contact No. 手机号码 <span class="text-danger">*</span></label>
                        <input type="tel" class="form-control" name="contact_no" required>
                        <div class="invalid-feedback">Please enter contact number</div>
                    </div>
                    
                    <!-- Voucher Details Section -->
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-ticket-perforated"></i>
                            <span>Voucher Details 券类详情</span>
                        </div>
                    </div>
                    
                    <!-- Voucher Type -->
                    <div class="col-12">
                        <label class="form-label fw-semibold">Type 类别 <span class="text-danger">*</span></label>
                        <div class="voucher-type-options">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="voucher_type" 
                                               id="voucherMerciful" value="merciful" checked>
                                        <label class="form-check-label" for="voucherMerciful">
                                            <i class="bi bi-heart-fill"></i>
                                            <span>Merciful Voucher 慈善券</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="voucher_type" 
                                               id="voucherCandle" value="candle">
                                        <label class="form-check-label" for="voucherCandle">
                                            <i class="bi bi-candle"></i>
                                            <span>Candle Voucher 祈愿随缘</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="voucher_type" 
                                               id="voucherGold" value="gold_block">
                                        <label class="form-check-label" for="voucherGold">
                                            <i class="bi bi-award-fill"></i>
                                            <span>Gold Block 金砖</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Amount -->
                    <div class="col-md-6">
                        <label class="form-label">Amount 款额</label>
                        <div class="input-group">
                            <span class="input-group-text">RM</span>
                            <input type="text" class="form-control" value="100.00" readonly>
                        </div>
                        <small class="text-muted">Fixed amount for voucher donation</small>
                    </div>
                    
                    <!-- Payment Method Section -->
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-credit-card"></i>
                            <span>Payment Method 付款方式</span>
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <div class="payment-methods">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmCash2" value="cash" checked>
                                        <label class="form-check-label" for="pmCash2">
                                            <i class="bi bi-cash-stack"></i>
                                            <span>Cash 现款</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmCheque2" value="cheque">
                                        <label class="form-check-label" for="pmCheque2">
                                            <i class="bi bi-bank"></i>
                                            <span>Cheque 支票</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmEbanking2" value="ebanking">
                                        <label class="form-check-label" for="pmEbanking2">
                                            <i class="bi bi-laptop"></i>
                                            <span>E-banking 网银</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmCard2" value="card">
                                        <label class="form-check-label" for="pmCard2">
                                            <i class="bi bi-credit-card-2-front"></i>
                                            <span>Card 信用卡</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-check form-check-card">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="pmDuitnow2" value="duitnow">
                                        <label class="form-check-label" for="pmDuitnow2">
                                            <i class="bi bi-wallet2"></i>
                                            <span>DuitNow 电子钱包</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Notes -->
                    <div class="col-12">
                        <label class="form-label">Notes 备注</label>
                        <textarea class="form-control" name="notes" rows="3" 
                                  placeholder="Additional notes or remarks..."></textarea>
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
                    offset: 50
                });
            }
            gsap.to('.donations-header-icon', {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
            // Animate form cards on hover
            $('.form-check-card').each(function(index) {
                const card = this;
                
                gsap.set(card, { scale: 1 });
                
                $(card).on('mouseenter', function() {
                    gsap.to(card, {
                        scale: 1.05,
                        boxShadow: '0 8px 20px rgba(255, 0, 255, 0.15)',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
                
                $(card).on('mouseleave', function() {
                    if (!$(card).find('input').is(':checked')) {
                        gsap.to(card, {
                            scale: 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            duration: 0.3,
                            ease: 'power2.out'
                        });
                    }
                });
            });
        },
        
        // Initialize plugins
        initializePlugins: function() {
            // Any Select2 or other plugin initialization
            // Not used currently but available for future
        },
        
        // Bind event handlers
        bindEvents: function() {
            const self = this;
            
            // Donation type change
            $('#donationType').on('change', function() {
                const selectedType = $(this).val();
                self.donationType = selectedType;
                self.loadFormContent(selectedType);
                
                // Animate card
                gsap.fromTo('.donation-form-card', 
                    { scale: 0.98, opacity: 0.8 },
                    { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.2)' }
                );
            });
            
            // Form submission
            $('#donationForm').on('submit', function(e) {
                e.preventDefault();
                
                if (!this.checkValidity()) {
                    e.stopPropagation();
                    $(this).addClass('was-validated');
                    return;
                }
                
                self.submitForm();
            });
            
            // Cancel button
            $('#btnCancel').on('click', function() {
                TempleRouter.navigate('donations');
            });
            
            // Reset button
            $('#btnReset').on('click', function() {
                self.resetForm();
            });
            
            // Radio card selection animation
            $(document).on('change', 'input[type="radio"]', function() {
                const $parent = $(this).closest('.form-check-card');
                const $siblings = $parent.siblings('.form-check-card');
                
                // Animate selected card
                gsap.to($parent[0], {
                    scale: 1.05,
                    boxShadow: '0 8px 20px rgba(255, 0, 255, 0.2)',
                    borderColor: '#ff00ff',
                    duration: 0.3,
                    ease: 'power2.out'
                });
                
                // Reset siblings
                $siblings.each(function() {
                    gsap.to(this, {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        borderColor: '#dee2e6',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });

            // Input field animations on focus
            $('.form-control').on('focus', function() {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur', function() {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });

            // Select dropdown animation on change
            $('.form-select').on('change', function() {
                gsap.fromTo(this,
                    { scale: 1 },
                    { 
                        scale: 1.05, 
                        duration: 0.2,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power1.inOut'
                    }
                );
            });
        },
        
        // Submit form
        submitForm: function() {
            const formData = this.getFormData();
            
            // Show loading state
            const $submitBtn = $('#btnSubmit');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            
            // Simulate API call (replace with actual API)
            setTimeout(() => {
                console.log('Donation Data:', formData);
                
                // Success animation
                gsap.to('.donation-form-card', {
                    scale: 1.02,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut'
                });
                
                // Show success message
                TempleCore.showToast('Donation recorded successfully!', 'success');
                
                // Reset form
                setTimeout(() => {
                    this.resetForm();
                    $submitBtn.prop('disabled', false).html(originalText);
                    TempleRouter.navigate('donations/list');
                }, 1500);
            }, 1500);
            
            // Actual implementation:
            /*
            TempleAPI.post('/donations', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Donation recorded successfully!', 'success');
                        setTimeout(() => {
                            TempleRouter.navigate('donations');
                        }, 1500);
                    }
                })
                .fail(function(error) {
                    TempleCore.showToast('Failed to record donation', 'error');
                    $submitBtn.prop('disabled', false).html(originalText);
                })
                .always(function() {
                    $submitBtn.prop('disabled', false).html(originalText);
                });
            */
        },
        
        // Get form data
        getFormData: function() {
            const formData = {
                donation_type: this.donationType,
                name_chinese: $('input[name="name_chinese"]').val(),
                name_english: $('input[name="name_english"]').val(),
                nric: $('input[name="nric"]').val(),
                email: $('input[name="email"]').val(),
                contact_no: $('input[name="contact_no"]').val(),
                payment_method: $('input[name="payment_method"]:checked').val(),
                notes: $('textarea[name="notes"]').val()
            };
            
            if (this.donationType === 'donation') {
                formData.donation_subtype = $('input[name="donation_subtype"]:checked').val();
                formData.amount = $('input[name="amount"]').val();
            } else {
                formData.voucher_type = $('input[name="voucher_type"]:checked').val();
                formData.amount = 100.00; // Fixed amount
            }
            
            return formData;
        },
        
        // Reset form
        resetForm: function() {
            $('#donationForm')[0].reset();
            $('#donationForm').removeClass('was-validated');
            
            // Animate reset
            gsap.fromTo('#formContent', 
                { opacity: 1 },
                { 
                    opacity: 0, 
                    duration: 0.2,
                    onComplete: () => {
                        gsap.to('#formContent', { opacity: 1, duration: 0.3 });
                    }
                }
            );
            
            TempleCore.showToast('Form reset', 'info');
        }
    };
    
})(jQuery, window);