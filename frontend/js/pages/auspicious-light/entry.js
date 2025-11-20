// js/pages/auspicious-light/entry.js
// Auspicious Light (Pagoda Light) Entry Form Module

(function ($, window) {
    'use strict';

    window.AuspiciousLightEntryPage = {
        currentData: {
            name_chinese: '',
            name_english: '',
            nric_no: '',
            email: '',
            contact_no: '',
            light_option: '',
            merit_option: '',
            devotion_method: '',
            remark: '',
            light_no: '',
            offer_date: '',
            expiry_date: '',
            receipt_no: ''
        },

        // Initialize the page


        // Initialize the page
        init: function (params) {
            console.log('Initializing Auspicious Light Entry Page');
            this.params = params || {};
            this.render();
            this.attachEvents();
            this.initializeAnimations();
            this.setDefaultDates();
            this.generateReceiptNumber();
        },

        // Render the page HTML
        render: function () {
            const html = `
				<link href="/css/auspicious-light.css" rel="stylesheet">
                <div class="auspicious-light-container" data-aos="fade-up">
                    <div class="form-card">
                        <!-- Form Header -->
                        <div class="form-header">
                            <h2 class="form-title" data-aos="fade-down" data-aos-delay="100">
                                <i class="bi bi-lantern"></i>
                                平安灯功德表格
                            </h2>
                            <h3 data-aos="fade-down" data-aos-delay="200">Auspicious Light (Pagoda Light) Entry Form</h3>
                        </div>

                        <!-- Form Body -->
                        <div class="form-body">
                            <form id="auspiciousLightForm" novalidate>
                                
                                <!-- Personal Information Section -->
                                <div class="form-section" data-aos="fade-up" data-aos-delay="100">
                                    <div class="section-title">
                                        <i class="bi bi-person-circle"></i>
                                        Personal Information / 个人信息
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label required">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">姓名</span>
                                                        <span class="label-english">Name (Chinese)</span>
                                                    </div>
                                                </label>
                                                <input type="text" class="form-control" id="nameChinese" 
                                                    placeholder="请输入中文姓名" required>
                                                <div class="invalid-feedback">Please enter Chinese name</div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label required">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">姓名</span>
                                                        <span class="label-english">Name (English)</span>
                                                    </div>
                                                </label>
                                                <input type="text" class="form-control" id="nameEnglish" 
                                                    placeholder="Enter English name" required>
                                                <div class="invalid-feedback">Please enter English name</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">身份证</span>
                                                        <span class="label-english">NRIC No.</span>
                                                    </div>
                                                </label>
                                                <input type="text" class="form-control" id="nricNo" 
                                                    placeholder="Enter NRIC number">
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">电邮</span>
                                                        <span class="label-english">Email</span>
                                                    </div>
                                                </label>
                                                <input type="email" class="form-control" id="email" 
                                                    placeholder="Enter email address">
                                                <div class="invalid-feedback">Please enter a valid email</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label required">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">手机号码</span>
                                                        <span class="label-english">Contact No.</span>
                                                    </div>
                                                </label>
                                                <input type="tel" class="form-control" id="contactNo" 
                                                    placeholder="Enter contact number" required>
                                                <div class="invalid-feedback">Please enter contact number</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Light Selection Section -->
                                <div class="form-section" data-aos="fade-up" data-aos-delay="200">
                                    <div class="section-title">
                                        <i class="bi bi-lightbulb"></i>
                                        Light Option / 灯选项
                                    </div>
                                    
                                    <div class="option-group">
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="newLight" 
                                                name="lightOption" value="new_light" required>
                                            <label class="option-label" for="newLight">
                                                <div class="option-title">新灯</div>
                                                <div class="option-subtitle">New Light</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="familyLight" 
                                                name="lightOption" value="family_light" required>
                                            <label class="option-label" for="familyLight">
                                                <div class="option-title">合家</div>
                                                <div class="option-subtitle">Family Light</div>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="invalid-feedback" id="lightOptionError" style="display: none;">
                                        Please select a light option
                                    </div>
                                </div>

                                <!-- Merit Option Section -->
                                <div class="form-section" data-aos="fade-up" data-aos-delay="300">
                                    <div class="section-title">
                                        <i class="bi bi-coin"></i>
                                        Merit Option / 功德选项
                                    </div>
                                    
                                    <div class="option-group">
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm100" 
                                                name="meritOption" value="RM100" required>
                                            <label class="option-label" for="rm100">
                                                <div class="option-title">RM 100</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm200" 
                                                name="meritOption" value="RM200" required>
                                            <label class="option-label" for="rm200">
                                                <div class="option-title">RM 200</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm300" 
                                                name="meritOption" value="RM300" required>
                                            <label class="option-label" for="rm300">
                                                <div class="option-title">RM 300</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm500" 
                                                name="meritOption" value="RM500" required>
                                            <label class="option-label" for="rm500">
                                                <div class="option-title">RM 500</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm188" 
                                                name="meritOption" value="RM188" required>
                                            <label class="option-label" for="rm188">
                                                <div class="option-title">RM 188</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm288" 
                                                name="meritOption" value="RM288" required>
                                            <label class="option-label" for="rm288">
                                                <div class="option-title">RM 288</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm488" 
                                                name="meritOption" value="RM488" required>
                                            <label class="option-label" for="rm488">
                                                <div class="option-title">RM 488</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm688" 
                                                name="meritOption" value="RM688" required>
                                            <label class="option-label" for="rm688">
                                                <div class="option-title">RM 688</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rm888" 
                                                name="meritOption" value="RM888" required>
                                            <label class="option-label" for="rm888">
                                                <div class="option-title">RM 888</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="rmu188" 
                                                name="meritOption" value="RMU188" required>
                                            <label class="option-label" for="rmu188">
                                                <div class="option-title">RM U188</div>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="invalid-feedback" id="meritOptionError" style="display: none;">
                                        Please select a merit option
                                    </div>
                                </div>

                                <!-- Devotion Method Section -->
                                <div class="form-section" data-aos="fade-up" data-aos-delay="400">
                                    <div class="section-title">
                                        <i class="bi bi-wallet2"></i>
                                        Devotion / 供灯方式
                                    </div>
                                    
                                    <div class="option-group">
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="cash" 
                                                name="devotionMethod" value="cash" required>
                                            <label class="option-label" for="cash">
                                                <div class="option-title">现款</div>
                                                <div class="option-subtitle">Cash</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="cheque" 
                                                name="devotionMethod" value="cheque" required>
                                            <label class="option-label" for="cheque">
                                                <div class="option-title">支票</div>
                                                <div class="option-subtitle">Cheque</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="ebanking" 
                                                name="devotionMethod" value="e-banking" required>
                                            <label class="option-label" for="ebanking">
                                                <div class="option-title">银行转账</div>
                                                <div class="option-subtitle">E-banking</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="creditDebit" 
                                                name="devotionMethod" value="credit_debit" required>
                                            <label class="option-label" for="creditDebit">
                                                <div class="option-title">信用卡</div>
                                                <div class="option-subtitle">Credit/Debit Card</div>
                                            </label>
                                        </div>
                                        
                                        <div class="option-card">
                                            <input type="radio" class="option-input" id="ewallet" 
                                                name="devotionMethod" value="e-wallet" required>
                                            <label class="option-label" for="ewallet">
                                                <div class="option-title">电子钱包</div>
                                                <div class="option-subtitle">DuitNow (E-wallet)</div>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="invalid-feedback" id="devotionMethodError" style="display: none;">
                                        Please select a devotion method
                                    </div>
                                </div>

                                <!-- Additional Information Section -->
                                <div class="form-section" data-aos="fade-up" data-aos-delay="500">
                                    <div class="section-title">
                                        <i class="bi bi-card-text"></i>
                                        Additional Information / 附加信息
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">备注</span>
                                                        <span class="label-english">Remark</span>
                                                    </div>
                                                </label>
                                                <textarea class="form-control" id="remark" rows="3" 
                                                    placeholder="Enter any remarks or special instructions"></textarea>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label required">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">灯号</span>
                                                        <span class="label-english">Light No.</span>
                                                    </div>
                                                </label>
                                                <input type="text" class="form-control" id="lightNo" 
                                                    placeholder="Enter light number" required>
                                                <div class="invalid-feedback">Please enter light number</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Date Information Section -->
                                <div class="form-section" data-aos="fade-up" data-aos-delay="600">
                                    <div class="section-title">
                                        <i class="bi bi-calendar-event"></i>
                                        Date Information / 日期信息
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="form-label required">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">上灯日期</span>
                                                        <span class="label-english">Offer Date</span>
                                                    </div>
                                                </label>
                                                <input type="date" class="form-control" id="offerDate" required>
                                                <div class="invalid-feedback">Please select offer date</div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="form-group auto-field">
                                                <span class="auto-badge">Auto-Calculated</span>
                                                <label class="form-label required">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">谢灯日期</span>
                                                        <span class="label-english">Expiry Date</span>
                                                    </div>
                                                </label>
                                                <input type="date" class="form-control" id="expiryDate" required>
                                                <div class="form-text">
                                                    <small class="text-muted">
                                                        <i class="bi bi-info-circle"></i> Automatically set to 6 months from offer date
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group auto-field">
                                                <span class="auto-badge">Auto-Generated</span>
                                                <label class="form-label">
                                                    <div class="bilingual-label">
                                                        <span class="label-chinese">收据号码</span>
                                                        <span class="label-english">Receipt No.</span>
                                                    </div>
                                                </label>
                                                <input type="text" class="form-control" id="receiptNo" readonly>
                                                <div class="form-text">
                                                    <small class="text-muted">
                                                        <i class="bi bi-info-circle"></i> Receipt number is automatically generated
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Submit Section -->
                                <div class="submit-section" data-aos="fade-up" data-aos-delay="700">
                                    <button type="button" class="btn btn-cancel" id="btnCancel">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                    <button type="submit" class="btn btn-submit" id="btnSubmit">
                                        <i class="bi bi-check-circle"></i> Submit Entry
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Attach event listeners
        attachEvents: function () {
            const self = this;

            // Form submission
            $('#auspiciousLightForm').on('submit', function (e) {
                e.preventDefault();
                self.handleSubmit();
            });

            // Cancel button
            $('#btnCancel').on('click', function () {
                self.handleCancel();
            });

            // Offer date change - auto calculate expiry date
            $('#offerDate').on('change', function () {
                self.calculateExpiryDate();
            });

            // Email validation
            $('#email').on('blur', function () {
                self.validateEmail($(this));
            });

            // Real-time validation for required fields
            $('#nameChinese, #nameEnglish, #contactNo, #lightNo, #offerDate').on('input change', function () {
                $(this).removeClass('is-invalid');
                $(this).next('.invalid-feedback').hide();
            });

            // Radio button validation
            $('input[type="radio"]').on('change', function () {
                const name = $(this).attr('name');
                $(`#${name}Error`).hide();
            });
        },

        // Initialize GSAP + AOS animations
        initializeAnimations: function () {
            // Initialize AOS
            AOS.init({
                duration: 800,
                easing: 'ease-out-cubic',
                once: true,
                offset: 100,
                delay: 0,
                disable: false
            });

            // GSAP Timeline for header animation (entrance only, no scroll dependency)
            // Using fromTo to explicitly set start and end states
            const headerTimeline = gsap.timeline({ delay: 0.1 });

            headerTimeline
                .fromTo('.form-title',
                    {
                        y: -50,
                        opacity: 0
                    },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: 'back.out(1.7)'
                    }
                )
                .fromTo('.form-header p',
                    {
                        y: 20,
                        opacity: 0
                    },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.6,
                        ease: 'power2.out'
                    },
                    '-=0.4'
                );

            // Safety check: Ensure header is visible after animation completes
            headerTimeline.eventCallback("onComplete", function () {
                $('.form-title, .form-header p').css('opacity', '1');
            });

            // Fallback: If animation doesn't start, force visibility after 1 second
            setTimeout(function () {
                if ($('.form-title').css('opacity') == '0') {
                    $('.form-title, .form-header p').css({
                        'opacity': '1',
                        'transform': 'translateY(0)'
                    });
                }
            }, 1000);

            // Simple hover animations for option cards (no ScrollTrigger needed)
            $('.option-label').each(function () {
                const label = this;
                $(label).on('mouseenter', function () {
                    if (!$(label).prev('input').prop('checked')) {
                        gsap.to(label, {
                            scale: 1.05,
                            duration: 0.3,
                            ease: 'back.out(1.7)'
                        });
                    }
                }).on('mouseleave', function () {
                    if (!$(label).prev('input').prop('checked')) {
                        gsap.to(label, {
                            scale: 1,
                            duration: 0.3,
                            ease: 'power2.out'
                        });
                    }
                });
            });

            // Animate submit button on hover
            $('#btnSubmit').on('mouseenter', function () {
                gsap.to(this, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'back.out(1.7)'
                });
            }).on('mouseleave', function () {
                gsap.to(this, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            // Ensure all sections are visible (remove any lingering opacity: 0)
            setTimeout(function () {
                $('.form-section').css('opacity', '1');
            }, 100);
        },

        // Set default dates
        setDefaultDates: function () {
            const today = new Date();
            const formattedToday = today.toISOString().split('T')[0];
            $('#offerDate').val(formattedToday);
            this.calculateExpiryDate();
        },

        // Calculate expiry date (6 months from offer date)
        calculateExpiryDate: function () {
            const offerDate = $('#offerDate').val();
            if (offerDate) {
                const date = new Date(offerDate);
                date.setMonth(date.getMonth() + 6);
                const formattedExpiry = date.toISOString().split('T')[0];
                $('#expiryDate').val(formattedExpiry);

                // Animate the change
                gsap.from('#expiryDate', {
                    scale: 1.1,
                    duration: 0.3,
                    ease: 'back.out(1.7)'
                });
            }
        },

        // Generate receipt number
        generateReceiptNumber: function () {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const receiptNo = `AL${timestamp}${random}`;
            $('#receiptNo').val(receiptNo);

            // Animate the generation
            gsap.from('#receiptNo', {
                x: -20,
                opacity: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
        },

        // Validate email
        validateEmail: function ($input) {
            const email = $input.val().trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                $input.addClass('is-invalid');
                $input.removeClass('is-valid');
                return false;
            } else if (email) {
                $input.addClass('is-valid');
                $input.removeClass('is-invalid');
                return true;
            }
            return true;
        },

        // Validate form
        validateForm: function () {
            let isValid = true;
            const form = $('#auspiciousLightForm')[0];

            // Reset validation states
            $('.is-invalid').removeClass('is-invalid');
            $('.invalid-feedback').hide();

            // Validate required text fields
            $('#nameChinese, #nameEnglish, #contactNo, #lightNo, #offerDate').each(function () {
                if (!$(this).val().trim()) {
                    $(this).addClass('is-invalid');
                    $(this).next('.invalid-feedback').show();
                    isValid = false;

                    // Shake animation
                    gsap.from(this, {
                        x: -10,
                        duration: 0.1,
                        repeat: 5,
                        yoyo: true,
                        ease: 'power1.inOut'
                    });
                }
            });

            // Validate email if provided
            const emailInput = $('#email');
            if (emailInput.val().trim() && !this.validateEmail(emailInput)) {
                isValid = false;
            }

            // Validate radio groups
            const radioGroups = ['lightOption', 'meritOption', 'devotionMethod'];
            radioGroups.forEach(group => {
                if (!$(`input[name="${group}"]:checked`).length) {
                    $(`#${group}Error`).show();
                    isValid = false;
                }
            });

            return isValid;
        },

        // Collect form data
        collectFormData: function () {
            return {
                name_chinese: $('#nameChinese').val().trim(),
                name_english: $('#nameEnglish').val().trim(),
                nric_no: $('#nricNo').val().trim(),
                email: $('#email').val().trim(),
                contact_no: $('#contactNo').val().trim(),
                light_option: $('input[name="lightOption"]:checked').val(),
                merit_option: $('input[name="meritOption"]:checked').val(),
                devotion_method: $('input[name="devotionMethod"]:checked').val(),
                remark: $('#remark').val().trim(),
                light_no: $('#lightNo').val().trim(),
                offer_date: $('#offerDate').val(),
                expiry_date: $('#expiryDate').val(),
                receipt_no: $('#receiptNo').val()
            };
        },

        // Find this section in your existing file (around line 180-220):

        handleSubmit: function () {
            const self = this;

            // Validate form
            if (!this.validateForm()) {
                Swal.fire({
                    icon: 'error',
                    title: 'Validation Error',
                    text: 'Please fill in all required fields correctly.',
                    confirmButtonColor: '#ff00ff'
                });
                return;
            }

            // Collect form data
            const formData = this.collectFormData();
            console.log('Form Data:', formData);

            // Show loading state
            const $btnSubmit = $('#btnSubmit');
            $btnSubmit.addClass('loading').prop('disabled', true);
            $btnSubmit.html('<i class="bi bi-hourglass-split"></i> Processing...');

            // ========================================
            // NEW: Connect to Pagoda Backend API
            // ========================================

            // Prepare data for backend
            const registrationData = {
                devotee: {
                    name_english: formData.name_english,
                    name_chinese: formData.name_chinese,
                    nric: formData.nric_no,
                    contact_no: formData.contact_no,
                    email: formData.email
                },
                light_option: formData.light_option || 'new_light',
                merit_amount: parseFloat(formData.merit_option) || 0,
                offer_date: formData.offer_date,
                payment_method: formData.devotion_method || 'cash',
                payment_reference: formData.light_no || null,
                remarks: formData.remark,
                receipt_number: formData.receipt_no
                // Note: light_number is optional - backend will auto-assign if not provided
            };

            // Call backend API
            PagodaAPI.registrations.create(registrationData)
                .done(function (response) {
                    $btnSubmit.removeClass('loading').prop('disabled', false);
                    $btnSubmit.html('<i class="bi bi-check-circle"></i> Submit Entry');

                    if (response.success) {
                        self.showSuccessMessage(response.data);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Submission Failed',
                            text: response.message || 'An error occurred while submitting the form.',
                            confirmButtonColor: '#e74c3c'
                        });
                    }
                })
                .fail(function (xhr) {
                    $btnSubmit.removeClass('loading').prop('disabled', false);
                    $btnSubmit.html('<i class="bi bi-check-circle"></i> Submit Entry');

                    TempleUtils.handleAjaxError(xhr, 'Failed to submit registration');
                });
        },


        // Update success message to show backend response
        showSuccessMessage: function (registration) {
            const currencySymbol = APP_CONFIG.CURRENCY_SYMBOLS[
                TempleUtils.getStoredTempleSettings().currency || 'MYR'
            ];

            Swal.fire({
                title: 'Success!',
                html: `
            <div class="success-checkmark">
                <div class="check-icon">
                    <span class="icon-line line-tip"></span>
                    <span class="icon-line line-long"></span>
                </div>
            </div>
            <p style="font-size: 16px; margin-top: 20px;">
                <strong>Auspicious Light Registration Successful!</strong>
            </p>
            <div style="text-align: left; max-width: 400px; margin: 20px auto; font-size: 14px;">
                <p><strong>Receipt Number:</strong> ${registration.receipt_number}</p>
                <p><strong>Light Number:</strong> ${registration.light_number}</p>
                <p><strong>Light Code:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${registration.light_code}</code></p>
                <p><strong>Devotee:</strong> ${registration.devotee.name_chinese} (${registration.devotee.name_english})</p>
                <p><strong>Merit Amount:</strong> ${currencySymbol} ${parseFloat(registration.merit_amount).toFixed(2)}</p>
                <p><strong>Offer Date:</strong> ${moment(registration.offer_date).format('DD/MM/YYYY')}</p>
                <p><strong>Expiry Date:</strong> ${moment(registration.expiry_date).format('DD/MM/YYYY')}</p>
            </div>
        `,
                icon: 'success',
                confirmButtonText: 'Create Another Entry',
                confirmButtonColor: '#28a745',
                showCancelButton: true,
                cancelButtonText: 'View Dashboard',
                cancelButtonColor: '#6c757d'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Reset form for new entry
                    this.resetForm();
                } else {
                    // Navigate to pagoda dashboard
                    TempleRouter.navigate('pagoda/dashboard');
                }
            });

            // Show confetti animation
            this.showConfetti();
        },

        // Show success message
        showSuccessMessage: function (formData) {
            Swal.fire({
                title: 'Success!',
                html: `
                    <div class="success-checkmark">
                        <div class="check-icon">
                            <span class="icon-line line-tip"></span>
                            <span class="icon-line line-long"></span>
                        </div>
                    </div>
                    <p style="font-size: 16px; margin-top: 20px;">
                        <strong>Auspicious Light Entry Submitted Successfully!</strong>
                    </p>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        Receipt No: <strong>${formData.receipt_no}</strong><br>
                        Name: <strong>${formData.name_chinese} (${formData.name_english})</strong><br>
                        Merit: <strong>${formData.merit_option}</strong>
                    </p>
                `,
                icon: 'success',
                confirmButtonText: 'Create Another Entry',
                confirmButtonColor: '#ff00ff',
                showCancelButton: true,
                cancelButtonText: 'View Dashboard',
                cancelButtonColor: '#808000'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Reset form for new entry
                    this.resetForm();
                } else {
                    // Navigate to dashboard or entries list
                    TempleRouter.navigate('dashboard');
                }
            });

            // Confetti animation
            this.showConfetti();
        },

        // Show confetti animation
        showConfetti: function () {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // Create confetti with custom colors
                if (typeof confetti !== 'undefined') {
                    confetti(Object.assign({}, defaults, {
                        particleCount,
                        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                        colors: ['#ff00ff', '#808000', '#FFD700', '#FF69B4']
                    }));
                    confetti(Object.assign({}, defaults, {
                        particleCount,
                        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                        colors: ['#ff00ff', '#808000', '#FFD700', '#FF69B4']
                    }));
                }
            }, 250);
        },

        // Reset form
        resetForm: function () {
            $('#auspiciousLightForm')[0].reset();
            $('.is-valid').removeClass('is-valid');
            $('.is-invalid').removeClass('is-invalid');
            this.setDefaultDates();
            this.generateReceiptNumber();

            // Scroll to top smoothly
            $('html, body').animate({ scrollTop: 0 }, 600);

            // Re-initialize animations
            AOS.refresh();
        },

        // Handle cancel
        handleCancel: function () {
            Swal.fire({
                title: 'Cancel Entry?',
                text: 'Are you sure you want to cancel? All entered data will be lost.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#e74c3c',
                cancelButtonColor: '#95a5a6',
                confirmButtonText: 'Yes, Cancel',
                cancelButtonText: 'No, Continue'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.resetForm();
                    Swal.fire({
                        title: 'Cancelled',
                        text: 'Form has been reset.',
                        icon: 'info',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        }
    };

})(jQuery, window);