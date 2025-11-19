// js/pages/special-occasions/index.js
// Special Occasions Booking Module with GSAP + AOS Animations

(function($, window) {
    'use strict';
    
    window.SpecialOccasionsPage = {
        // Occasion configurations
        occasions: {
            'wesak-day': {
                name: 'Wesak Day Light Offering',
                nameChinese: '卫塞节灯 Wesak Day Light Offering',
                icon: 'bi-brightness-high',
                color: '#FFD700',
                options: [
                    { value: 'hopeful-light', label: 'Hopeful Light 吉祥心灯', price: 'RM300' },
                    { value: 'wishful-light', label: 'Wishful Light 如意心灯', price: 'RM100' },
                    { value: 'merciful-light', label: 'Merciful Light 慈悲心灯', price: 'RM60' }
                ]
            },
            'guanyin-bodhisattva': {
                name: 'Guanyin Bodhisattva Light Offering',
                nameChinese: '观音菩萨 Guanyin Bodhisattva Light Offering',
                icon: 'bi-star',
                color: '#87CEEB',
                options: [
                    { value: 'bodhisattva-day', label: 'Bodhisattva Day 观音菩萨成道日', price: '' },
                    { value: 'enlightenment-day', label: 'Enlightenment Day 观音菩萨成道日', price: '' },
                    { value: 'renunciation-day', label: 'Renunciation Day 观音菩萨出家日', price: '' }
                ],
                fixedAmount: 'RM 38'
            },
            'mazu-blessing': {
                name: 'Mazu Blessing Light Offering',
                nameChinese: '妈祖菩萨 Mazu Blessing Light Offering',
                icon: 'bi-gem',
                color: '#FF69B4',
                options: [
                    { value: 'rm-108', label: 'RM 108', price: 'RM 108' },
                    { value: 'optional-donation', label: 'Optional Donation 随喜乐捐', price: '' }
                ]
            },
            'shui-wei': {
                name: 'Shui Wei Light Offering',
                nameChinese: '水尾圣娘灯 Shui Wei Light Offering',
                icon: 'bi-droplet',
                color: '#4169E1',
                options: [
                    { value: 'rm-38', label: 'RM 38', price: 'RM 38' }
                ]
            },
            'lunar-lantern': {
                name: 'Lunar Lantern Festival',
                nameChinese: '光明灯 Lunar Lantern Festival',
                icon: 'bi-moon-stars',
                color: '#FF6347',
                options: [
                    { value: 'individual', label: 'Individual Devotion 个人供奉功德金', price: 'RM88' },
                    { value: 'family', label: 'Family Devotion 合家供奉功德金', price: 'RM108' }
                ]
            },
            'chai-sen-ceremony': {
                name: 'Welcoming Chai Sen Ceremony',
                nameChinese: '陈夕接财神 Welcoming Chai Sen Ceremony',
                icon: 'bi-gift',
                color: '#32CD32',
                options: [
                    { value: 'ceremony', label: 'Welcoming Chai Sen Ceremony 陈夕接财神', price: 'RM88' }
                ]
            }
        },

        paymentMethods: [
            { value: 'cash', label: 'Cash 现款' },
            { value: 'cheque', label: 'Cheque 支票' },
            { value: 'ebanking', label: 'E-banking 银行转账' },
            { value: 'card', label: 'Credit/Debit Card 信用卡' },
            { value: 'duitnow', label: 'DuitNow (E-wallet) 电子钱包' }
        ],

        selectedOccasion: null,
        formData: {},

        // Page initialization
        init: function(params) {
            this.loadCSS();
            this.render();
            this.initAnimations();
            this.bindEvents();
        },
		loadCSS: function() {
			// Check if CSS is already loaded
			if (!document.getElementById('donations-css')) {
				const link = document.createElement('link');
				link.id = 'donations-css';
				link.rel = 'stylesheet';
				link.href = '/css/special-occasions.css';
				document.head.appendChild(link);
			}
		},
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="special-occasions-page">
                    <!-- Page Header with Animation -->
                    <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-calendar-event occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Special Occasions Booking</h1>
                                            <p class="occasion-subtitle">特别场合预订 • Temple Sacred Ceremonies</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnViewHistory">
                                        <i class="bi bi-clock-history"></i> View History
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid mt-4">
                        <div class="row justify-content-center">
                            <div class="col-xl-10">
                                <!-- Occasion Selection Card -->
                                <div class="occasion-card" data-aos="fade-up" data-aos-delay="200">
                                    <div class="card-header-custom">
                                        <i class="bi bi-calendar-check"></i>
                                        <span>Select Special Occasion</span>
                                    </div>
                                    <div class="card-body-custom">
                                        <div class="occasion-selector-wrapper">
                                            <label class="form-label-custom">Choose Occasion Type 选择场合类型</label>
                                            <select class="form-select form-select-lg occasion-select" id="occasionType">
                                                <option value="">-- Select an Occasion 选择场合 --</option>
                                                ${this.renderOccasionOptions()}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- Occasion Info Card (Hidden initially) -->
                                <div class="occasion-info-card" id="occasionInfoCard" style="display: none;">
                                    <div class="occasion-info-content">
                                        <div class="occasion-info-icon" id="occasionIcon">
                                            <i class="bi bi-star"></i>
                                        </div>
                                        <div>
                                            <h3 class="occasion-info-title" id="occasionName"></h3>
                                            <p class="occasion-info-subtitle" id="occasionNameChinese"></p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Booking Form (Hidden initially) -->
                                <div class="booking-form-container" id="bookingFormContainer" style="display: none;">
                                    <form id="bookingForm">
                                        <div class="row">
                                            <!-- Personal Information Section -->
                                            <div class="col-lg-6">
                                                <div class="occasion-card" data-aos="fade-right" data-aos-delay="300">
                                                    <div class="card-header-custom">
                                                        <i class="bi bi-person-circle"></i>
                                                        <span>Personal Information 个人资料</span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <!-- Name Fields -->
                                                        <div class="row mb-3">
                                                            <div class="col-md-6">
                                                                <label class="form-label-custom required">Name 姓名 (Chinese 中)</label>
                                                                <input type="text" class="form-control form-control-custom" id="nameChinese" required>
                                                                <div class="invalid-feedback">Please enter Chinese name</div>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label class="form-label-custom required">Name (English 英)</label>
                                                                <input type="text" class="form-control form-control-custom" id="nameEnglish" required>
                                                                <div class="invalid-feedback">Please enter English name</div>
                                                            </div>
                                                        </div>

                                                        <!-- NRIC -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">NRIC No. 身份证</label>
                                                            <input type="text" class="form-control form-control-custom" id="nric" placeholder="e.g., 123456-12-1234" required>
                                                            <div class="invalid-feedback">Please enter NRIC number</div>
                                                        </div>

                                                        <!-- Email -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">Email 电邮</label>
                                                            <input type="email" class="form-control form-control-custom" id="email" placeholder="your.email@example.com" required>
                                                            <div class="invalid-feedback">Please enter a valid email</div>
                                                        </div>

                                                        <!-- Contact No -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">Contact No. 手机号码</label>
                                                            <input type="tel" class="form-control form-control-custom" id="contactNo" placeholder="e.g., +60123456789" required>
                                                            <div class="invalid-feedback">Please enter contact number</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Occasion & Payment Section -->
                                            <div class="col-lg-6">
                                                <div class="occasion-card" data-aos="fade-left" data-aos-delay="300">
                                                    <div class="card-header-custom">
                                                        <i class="bi bi-clipboard-check"></i>
                                                        <span>Occasion Details 场合详情</span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <!-- Occasion Options -->
                                                        <div class="mb-4" id="occasionOptionsContainer">
                                                            <label class="form-label-custom required">Occasion Option 选项</label>
                                                            <div id="occasionOptionsGroup"></div>
                                                        </div>

                                                        <!-- Payment Methods -->
                                                        <div class="mb-4">
                                                            <label class="form-label-custom required">Payment Method 付款方式</label>
                                                            <div class="payment-methods-grid">
                                                                ${this.renderPaymentMethods()}
                                                            </div>
                                                            <div class="invalid-feedback d-block" id="paymentError" style="display: none !important;">
                                                                Please select at least one payment method
                                                            </div>
                                                        </div>

                                                        <!-- Remarks -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom">Remark 备注</label>
                                                            <textarea class="form-control form-control-custom" id="remark" rows="3" placeholder="Optional notes..."></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Submit Button -->
                                        <div class="text-center mt-4" data-aos="fade-up" data-aos-delay="400">
                                            <button type="button" class="btn btn-lg btn-secondary me-3" id="btnReset">
                                                <i class="bi bi-arrow-counterclockwise"></i> Reset Form
                                            </button>
                                            <button type="submit" class="btn btn-lg btn-primary btn-submit-custom">
                                                <i class="bi bi-check-circle"></i> Submit Booking
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },

        // Render occasion dropdown options
        renderOccasionOptions: function() {
            let html = '';
            for (const [key, occasion] of Object.entries(this.occasions)) {
                html += `<option value="${key}">${occasion.nameChinese}</option>`;
            }
            return html;
        },

        // Render payment methods
        renderPaymentMethods: function() {
            let html = '';
            this.paymentMethods.forEach(method => {
                html += `
                    <div class="payment-method-item">
                        <input type="checkbox" class="form-check-input payment-checkbox" id="payment-${method.value}" value="${method.value}">
                        <label class="form-check-label" for="payment-${method.value}">
                            <i class="bi bi-${this.getPaymentIcon(method.value)}"></i>
                            ${method.label}
                        </label>
                    </div>
                `;
            });
            return html;
        },

        // Get payment method icon
        getPaymentIcon: function(value) {
            const icons = {
                'cash': 'cash-stack',
                'cheque': 'receipt',
                'ebanking': 'bank',
                'card': 'credit-card',
                'duitnow': 'wallet2'
            };
            return icons[value] || 'cash';
        },

        // Initialize animations
        initAnimations: function() {
            // Initialize AOS
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true,
                offset: 100
            });

            // Animate header background
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
        },

        // Show occasion info with animation
        showOccasionInfo: function(occasionKey) {
            const occasion = this.occasions[occasionKey];
            const $infoCard = $('#occasionInfoCard');
            const $formContainer = $('#bookingFormContainer');

            // Update info card content
            $('#occasionIcon').html(`<i class="bi ${occasion.icon}"></i>`).css('background', occasion.color);
            $('#occasionName').text(occasion.name);
            $('#occasionNameChinese').text(occasion.nameChinese);

            // Show info card with GSAP animation
            if ($infoCard.is(':hidden')) {
                gsap.fromTo($infoCard, 
                    { opacity: 0, y: -30, display: 'none' },
                    { opacity: 1, y: 0, display: 'block', duration: 0.6, ease: 'back.out(1.7)' }
                );
            }

            // Render occasion-specific options
            this.renderOccasionOptionsList(occasion);

            // Show form container with staggered animation
            if ($formContainer.is(':hidden')) {
                gsap.fromTo($formContainer,
                    { opacity: 0, y: 30, display: 'none' },
                    { 
                        opacity: 1, 
                        y: 0, 
                        display: 'block', 
                        duration: 0.8, 
                        ease: 'power2.out',
                        onComplete: () => {
                            // Animate form fields in sequence
                            gsap.from('.occasion-card', {
                                opacity: 0,
                                y: 20,
                                stagger: 0.2,
                                duration: 0.6,
                                ease: 'power2.out'
                            });
                        }
                    }
                );
            }

            // Scroll to form smoothly
            setTimeout(() => {
                $('html, body').animate({
                    scrollTop: $formContainer.offset().top - 100
                }, 800);
            }, 300);
        },

        // Render occasion-specific options (radio buttons for selected occasion)
        renderOccasionOptionsList: function(occasion) {
            const $container = $('#occasionOptionsGroup');
            $container.empty();

            let html = '';
            occasion.options.forEach((option, index) => {
                const radioId = `option-${index}`;
                const priceText = option.price ? `<span class="option-price">${option.price}</span>` : '';
                
                html += `
                    <div class="occasion-option-item">
                        <input type="radio" class="form-check-input" name="occasionOption" id="${radioId}" value="${option.value}" required>
                        <label class="form-check-label" for="${radioId}">
                            <span class="option-label">${option.label}</span>
                            ${priceText}
                        </label>
                    </div>
                `;
            });

            // Add fixed amount display for occasions like Guanyin Bodhisattva
            if (occasion.fixedAmount) {
                html += `
                    <div class="fixed-amount-display">
                        <i class="bi bi-tag"></i> Amount: ${occasion.fixedAmount}
                    </div>
                `;
            }

            $container.html(html);

            // Animate options appearing
            gsap.from('.occasion-option-item', {
                opacity: 0,
                x: -20,
                stagger: 0.1,
                duration: 0.5,
                ease: 'power2.out'
            });
        },

        // Hide form with animation
        hideForm: function() {
            const $infoCard = $('#occasionInfoCard');
            const $formContainer = $('#bookingFormContainer');

            gsap.to([$infoCard, $formContainer], {
                opacity: 0,
                y: -20,
                duration: 0.4,
                ease: 'power2.in',
                onComplete: () => {
                    $infoCard.hide();
                    $formContainer.hide();
                }
            });
        },

        // Validate form
        validateForm: function() {
            const form = document.getElementById('bookingForm');
            let isValid = true;

            // Check native HTML5 validation
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                isValid = false;
            }

            // Check payment method selection
            const paymentSelected = $('.payment-checkbox:checked').length > 0;
            if (!paymentSelected) {
                $('#paymentError').show();
                isValid = false;
            } else {
                $('#paymentError').hide();
            }

            // Check occasion option selection
            const optionSelected = $('input[name="occasionOption"]:checked').length > 0;
            if (!optionSelected) {
                TempleCore.showToast('Please select an occasion option', 'error');
                isValid = false;
            }

            return isValid;
        },

        // Collect form data
        collectFormData: function() {
            const selectedPayments = [];
            $('.payment-checkbox:checked').each(function() {
                const label = $(`label[for="${$(this).attr('id')}"]`).text().trim();
                selectedPayments.push(label);
            });

            const occasionOption = $('input[name="occasionOption"]:checked');
            const optionLabel = occasionOption.length > 0 
                ? $(`label[for="${occasionOption.attr('id')}"]`).text().trim()
                : '';

            return {
                occasion: this.occasions[this.selectedOccasion].nameChinese,
                nameChinese: $('#nameChinese').val(),
                nameEnglish: $('#nameEnglish').val(),
                nric: $('#nric').val(),
                email: $('#email').val(),
                contactNo: $('#contactNo').val(),
                occasionOption: optionLabel,
                paymentMethods: selectedPayments,
                remark: $('#remark').val()
            };
        },

        // Submit form
        submitForm: function() {
            if (!this.validateForm()) {
                // Shake animation for invalid form
                gsap.fromTo('#bookingForm',
                    { x: -10 },
                    { 
                        x: 10, 
                        repeat: 3, 
                        yoyo: true, 
                        duration: 0.1,
                        ease: 'power1.inOut'
                    }
                );
                return;
            }

            const formData = this.collectFormData();

            // Show loading animation
            const $submitBtn = $('.btn-submit-custom');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...');

            // Simulate API call delay
            setTimeout(() => {
                // Success animation
                gsap.to('#bookingForm', {
                    scale: 0.95,
                    opacity: 0.5,
                    duration: 0.3,
                    onComplete: () => {
                        this.showSuccessMessage(formData);
                        $submitBtn.prop('disabled', false).html(originalText);
                    }
                });
            }, 1500);
        },

        // Show success message
        showSuccessMessage: function(formData) {
            const summaryHTML = `
                <div class="booking-summary">
                    <div class="mb-3">
                        <strong>Occasion:</strong><br>${formData.occasion}
                    </div>
                    <div class="mb-3">
                        <strong>Name:</strong><br>
                        ${formData.nameChinese} / ${formData.nameEnglish}
                    </div>
                    <div class="mb-3">
                        <strong>NRIC:</strong> ${formData.nric}
                    </div>
                    <div class="mb-3">
                        <strong>Email:</strong> ${formData.email}
                    </div>
                    <div class="mb-3">
                        <strong>Contact:</strong> ${formData.contactNo}
                    </div>
                    <div class="mb-3">
                        <strong>Option:</strong><br>${formData.occasionOption}
                    </div>
                    <div class="mb-3">
                        <strong>Payment:</strong><br>${formData.paymentMethods.join(', ')}
                    </div>
                    ${formData.remark ? `<div class="mb-3"><strong>Remark:</strong><br>${formData.remark}</div>` : ''}
                </div>
            `;

            Swal.fire({
                icon: 'success',
                title: 'Booking Submitted Successfully!',
                html: summaryHTML,
                confirmButtonText: 'Make Another Booking',
                showCancelButton: true,
                cancelButtonText: 'View History',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                customClass: {
                    popup: 'animated-popup'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    this.resetForm();
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    // Navigate to history page (to be implemented)
                    TempleCore.showToast('History page will be implemented soon', 'info');
                }
            });

            // Reset form after success
            gsap.to('#bookingForm', {
                scale: 1,
                opacity: 1,
                duration: 0.3
            });
        },

        // Reset form
        resetForm: function() {
            const form = document.getElementById('bookingForm');
            form.reset();
            form.classList.remove('was-validated');
            $('.payment-checkbox').prop('checked', false);
            $('#paymentError').hide();
            
            // Animate reset
            gsap.fromTo('#bookingForm',
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
            );

            TempleCore.showToast('Form reset successfully', 'info');
        },

        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Occasion type selection
            $('#occasionType').on('change', function() {
                const selectedOccasion = $(this).val();
                
                if (selectedOccasion) {
                    self.selectedOccasion = selectedOccasion;
                    self.showOccasionInfo(selectedOccasion);
                    
                    // Add selection animation
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
                } else {
                    self.hideForm();
                }
            });

            // Payment method checkboxes with animation
            $('.payment-checkbox').on('change', function() {
                const $item = $(this).closest('.payment-method-item');
                
                if ($(this).is(':checked')) {
                    gsap.to($item, {
                        scale: 1.05,
                        duration: 0.2,
                        ease: 'back.out(1.7)'
                    });
                    $item.addClass('selected');
                } else {
                    gsap.to($item, {
                        scale: 1,
                        duration: 0.2
                    });
                    $item.removeClass('selected');
                }

                // Hide error if at least one is selected
                if ($('.payment-checkbox:checked').length > 0) {
                    $('#paymentError').hide();
                }
            });

            // Form submission
            $('#bookingForm').on('submit', function(e) {
                e.preventDefault();
                self.submitForm();
            });

            // Reset button
            $('#btnReset').on('click', function() {
                Swal.fire({
                    title: 'Reset Form?',
                    text: 'All entered data will be cleared.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, reset it!',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.resetForm();
                    }
                });
            });

            // View history button
            $('#btnViewHistory').on('click', function() {
                TempleCore.showToast('History page will be implemented soon', 'info');
            });

            // Input field animations on focus
            $('.form-control-custom').on('focus', function() {
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
        }
    };
    
})(jQuery, window);