// js/pages/donations/create.js
// Dynamic Donation Create Page with Card-Based Selection and Enhanced Pledge Support

(function ($, window) {
    'use strict';
    if (!window.DonationsSharedModule) {
        window.DonationsSharedModule = {
            moduleId: 'donations',
            eventNamespace: 'donations',
            cssId: 'donations-css',
            cssPath: '/css/donations.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Donations CSS loaded');
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Donations page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`Donations page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

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
                    console.log('Donations CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('Donations module cleaned up');
            }
        };
    }

    window.DonationsCreatePage = {
        pageId: 'donations-create',
        eventNamespace: window.DonationsSharedModule.eventNamespace,
        donationTypes: [],
        paymentModes: [],

        init: function (params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.loadDynamicData();
            this.bindEvents();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            window.DonationsSharedModule.unregisterPage(this.pageId);

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

        render: function () {
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
                                            <h1 class="donations-title">Donation</h1>
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

                    <!-- Donation Form Container -->
                    <div class="card shadow-sm donation-form-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-4">
                            <form id="donationForm" novalidate>
                                <!-- Form content will be loaded dynamically -->
                                <div id="formContent">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="mt-2 text-muted">Loading form data...</p>
                                    </div>
                                </div>
                                
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
        },

        loadDynamicData: async function () {
            try {
                // Load donation types and payment modes in parallel
                const [donationsResponse, paymentModesResponse] = await Promise.all([
                    TempleAPI.get('/donations/types/active'),
                    TempleAPI.get('/masters/payment-modes/active')
                ]);

                if (donationsResponse.success) {
                    this.donationTypes = donationsResponse.data;
                }

                if (paymentModesResponse.success) {
                    this.paymentModes = paymentModesResponse.data;
                }

                // Render the form with dynamic data
                this.renderForm();

            } catch (error) {
                console.error('Error loading dynamic data:', error);
                TempleCore.showToast('Failed to load form data', 'error');

                $('#formContent').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load form data. Please refresh the page and try again.
                    </div>
                `);
            }
        },

        getDonationTypeIcon: function (type) {
            const icons = {
                'general': 'bi bi-gift',
                'voucher': 'bi bi-ticket-perforated',
                'meal': 'bi bi-bowl-rice',
                'maintenance': 'bi bi-tools',
                'other': 'bi bi-three-dots'
            };
            return icons[type] || 'bi bi-gift';
        },

        renderForm: function () {
            // Limit donation types to maximum 8 for better display
            const displayDonationTypes = this.donationTypes.slice(0, 8);
            const colSize = displayDonationTypes.length <= 4 ? 3 : Math.floor(12 / Math.min(displayDonationTypes.length, 4));

            const formContent = `
                <div class="row g-4">
                    <!-- Personal Information Section -->
                    <div class="col-12">
                        <div class="section-header-gradient">
                            <i class="bi bi-person-badge"></i>
                            <span>Personal Information 个人资料</span>
                        </div>
                    </div>
                    <div class="col-12">
                <div class="card border-info bg-light">
                    <div class="card-body py-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" name="is_anonymous" id="isAnonymous">
                            <label class="form-check-label fw-semibold" for="isAnonymous">
                                <i class="bi bi-incognito me-2"></i>
                                Anonymous Donation 匿名捐款
                            </label>
                        </div>
                        <small class="text-muted ms-4">
                            Check this if the donor wishes to remain anonymous. Personal information will not be recorded.
                        </small>
                    </div>
                </div>
            </div>

                           <div id="personalInfoFieldsContainer" class="col-12">
                
                   <div id="personalInfoFields" class="row g-4">
                <!-- Name Fields -->
                <div class="col-md-6">
                    <label class="form-label">Name (Chinese) 姓名 (中文) <span class="text-danger" id="nameChineseRequired">*</span></label>
                    <input type="text" class="form-control" name="name_chinese" id="nameChinese">
                    <div class="invalid-feedback">Please enter Chinese name</div>
                </div>
                
                <div class="col-md-6">
                    <label class="form-label">Name (English) 姓名 (英文)</label>
                    <input type="text" class="form-control" name="name_english" id="nameEnglish">
                </div>
                
                <!-- Contact Information -->
                <div class="col-md-6">
                    <label class="form-label">NRIC No. 身份证</label>
                    <input type="text" class="form-control" name="nric" id="nric">
                </div>
                
                <div class="col-md-6">
                    <label class="form-label">Email 电邮</label>
                    <input type="email" class="form-control" name="email" id="email">
                </div>
                
                <div class="col-md-6">
                    <label class="form-label">Contact No. 手机号码 <span class="text-danger" id="contactRequired">*</span></label>
                    <input type="tel" class="form-control" name="contact_no" id="contactNo">
                    <div class="invalid-feedback">Please enter contact number</div>
                </div>
            </div>
            </div>
                    <!-- Donation Details Section -->
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-card-checklist"></i>
                            <span>Donation Details 捐款详情</span>
                        </div>
                    </div>
                    
                    <!-- Donation Type Cards (Dynamic) -->
                    <div class="col-12">
                        <label class="form-label fw-semibold">Donation Type 捐款类型 <span class="text-danger">*</span></label>
                        <div class="donation-type-options">
                            <div class="row g-3">
                                ${displayDonationTypes.map((donation, index) => `
                                    <div class="col-md-${colSize}">
                                        <div class="form-check form-check-card">
                                            <input class="form-check-input" type="radio" name="donation_id" 
                                                   id="donationType${donation.id}" value="${donation.id}" 
                                                   data-type="${donation.type}"
                                                   data-name="${donation.name}"
                                                   data-secondary="${donation.secondary_name || ''}"
                                                   ${index === 0 ? 'checked' : ''} required>
                                            <label class="form-check-label" for="donationType${donation.id}">
                                                <span>${donation.name}${donation.secondary_name ? ' • ' + donation.secondary_name : ''}</span>
                                            </label>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="invalid-feedback d-block" id="donationTypeError" style="display: none !important;">
                            Please select a donation type
                        </div>
                    </div>
                    
                    <!-- Amount -->
                    <div class="col-md-6">
                        <label class="form-label">
                            <span id="amountLabel">Amount 款额</span>
                            <span class="text-danger">*</span>
                        </label>
                        <div class="input-group">
                            <span class="input-group-text">RM</span>
                            <input type="number" class="form-control" name="amount" id="donationAmount" 
                                   step="0.01" min="1" required placeholder="Enter amount">
                            <div class="invalid-feedback">Please enter amount</div>
                        </div>
                        <small class="text-muted" id="amountHelpText">
                            <span id="normalAmountHelp">Enter the donation amount</span>
                            <span id="pledgeAmountHelp" style="display:none;">
                                <i class="bi bi-info-circle me-1"></i>
                                Enter the initial payment amount (can be less than total pledge)
                            </span>
                        </small>
                    </div>
                    
                    <!-- Pledge Information Section -->
                    <div class="col-12 mt-4">
                        <div class="card border-warning bg-light">
                            <div class="card-body">
                                <h6 class="card-title mb-3">
                                    <i class="bi bi-clipboard-check text-warning me-2"></i>
                                    Pledge Information 承诺捐款
                                </h6>
                                <div class="row g-3">
                                    <!-- Is Pledge Checkbox -->
                                    <div class="col-12">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" name="is_pledge" id="isPledge">
                                            <label class="form-check-label fw-semibold" for="isPledge">
                                                <i class="bi bi-hand-thumbs-up me-2"></i>
                                                This is a Pledge Donation 这是承诺捐款
                                            </label>
                                        </div>
                                        <small class="text-muted ms-4">
                                            Check this if the donor is committing to donate a total amount over time
                                        </small>
                                    </div>
                                    
                                    <!-- Pledge Amount Field (Hidden by default) -->
                                    <div class="col-md-6" id="pledgeAmountContainer" style="display: none;">
                                        <label class="form-label">Total Pledge Amount 承诺总额 <span class="text-danger">*</span></label>
                                        <div class="input-group">
                                            <span class="input-group-text bg-warning text-dark">
                                                <i class="bi bi-award"></i> RM
                                            </span>
                                            <input type="number" class="form-control" name="pledge_amount" id="pledgeAmount" 
                                                   step="0.01" min="1" placeholder="e.g., 10000">
                                        </div>
                                        
                                        <!-- Quick Amount Buttons -->
                                        <div class="btn-group btn-group-sm mt-2 w-100" role="group">
                                            <button type="button" class="btn btn-outline-secondary pledge-preset" data-amount="5000">
                                                <small>RM 5K</small>
                                            </button>
                                            <button type="button" class="btn btn-outline-secondary pledge-preset" data-amount="10000">
                                                <small>RM 10K</small>
                                            </button>
                                            <button type="button" class="btn btn-outline-secondary pledge-preset" data-amount="50000">
                                                <small>RM 50K</small>
                                            </button>
                                            <button type="button" class="btn btn-outline-secondary pledge-preset" data-amount="100000">
                                                <small>RM 100K</small>
                                            </button>
                                        </div>
                                        
                                        <small class="text-muted">Total amount the donor commits to donate over time</small>
                                    </div>
                                    
                                    <!-- Pledge Summary (Hidden by default) -->
                                    <div class="col-12" id="pledgeSummary" style="display: none;">
                                        <div class="alert alert-info mb-0">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong><i class="bi bi-calculator me-2"></i>Pledge Summary:</strong>
                                                </div>
                                                <div class="text-end">
                                                    <div class="small mb-1">
                                                        <span class="text-muted">Total Pledge:</span>
                                                        <strong class="ms-2 fs-6" id="summaryPledgeAmount">RM 0.00</strong>
                                                    </div>
                                                    <div class="small mb-1">
                                                        <span class="text-muted">Initial Payment:</span>
                                                        <strong class="ms-2 fs-6" id="summaryInitialAmount">RM 0.00</strong>
                                                    </div>
                                                    <div class="small border-top pt-1">
                                                        <span class="text-muted">Remaining Balance:</span>
                                                        <strong class="ms-2 text-warning fs-5" id="summaryBalance">RM 0.00</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                    
                    <!-- Dynamic Payment Methods -->
                    <div class="col-12">
                        <div class="payment-methods">
                            <div class="row g-3">
                                ${this.paymentModes.map((mode, index) => {
                const iconDisplay = mode.icon_display_url_data || { type: 'bootstrap', value: 'bi-currency-dollar' };
                const iconHtml = iconDisplay.type === 'bootstrap'
                    ? `<i class="bi ${iconDisplay.value}"></i>`
                    : `<img src="${iconDisplay.value}" alt="${mode.name}" 
                                                style="width: ${iconDisplay.width || 62}px; 
                                                       height: ${iconDisplay.height || 28}px; 
                                                       object-fit: contain;">`;

                return `
                                        <div class="col-md-3">
                                            <div class="form-check form-check-card">
                                                <input class="form-check-input" type="radio" name="payment_mode_id" 
                                                       id="pm${mode.id}" value="${mode.id}" ${index === 0 ? 'checked' : ''} required>
                                                <label class="form-check-label" for="pm${mode.id}">
                                                    ${iconHtml}
                                                    <span>${mode.name}</span>
                                                </label>
                                            </div>
                                        </div>
                                    `;
            }).join('')}
                            </div>
                        </div>
                        <div class="invalid-feedback d-block" id="paymentMethodError" style="display: none !important;">
                            Please select a payment method
                        </div>
                    </div>
                    
                    <!-- Notes -->
                    <div class="col-12">
                        <label class="form-label">Notes 备注</label>
                        <textarea class="form-control" name="notes" rows="3" 
                                  placeholder="Additional notes or remarks..."></textarea>
                    </div>
                    
                    <!-- Print Option -->
                    <div class="col-12">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="print_receipt" id="printReceipt" checked>
                            <label class="form-check-label" for="printReceipt">
                                <i class="bi bi-printer me-2"></i> Print receipt after donation
                            </label>
                        </div>
                    </div>
                </div>
            `;

            $('#formContent').html(formContent);

            // Animate form appearance
            gsap.from('#formContent', {
                opacity: 0,
                y: 20,
                duration: 0.5,
                ease: 'power2.out'
            });

            // Re-initialize form components
            this.initializePlugins();
        },

        initAnimations: function () {
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
            $(document).on('mouseenter.' + this.eventNamespace, '.form-check-card', function () {
                gsap.to(this, {
                    scale: 1.05,
                    boxShadow: '0 8px 20px rgba(255, 0, 255, 0.15)',
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            $(document).on('mouseleave.' + this.eventNamespace, '.form-check-card', function () {
                if (!$(this).find('input').is(':checked')) {
                    gsap.to(this, {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                }
            });
        },

        initializePlugins: function () {
            // Initialize pledge handlers
            this.initPledgeHandlers();
            // Initialize anonymous handlers
            this.initAnonymousHandlers();
        },
        initAnonymousHandlers: function () {
            const self = this;

            // Toggle personal info fields when anonymous checkbox changes
            $('#isAnonymous').on('change', function () {
                const isChecked = $(this).is(':checked');

                if (isChecked) {
                    // Hide and disable personal info fields
                    $('#personalInfoFields').slideUp(300);

                    // Remove required attributes
                    $('#nameChinese, #contactNo').removeAttr('required');
                    $('#nameChineseRequired, #contactRequired').hide();

                    // Clear values
                    $('#nameChinese, #nameEnglish, #nric, #email, #contactNo').val('');

                    // Remove validation
                    $('#nameChinese, #contactNo').removeClass('is-invalid');

                    // Show info message
                    TempleCore.showToast('Personal information fields hidden for anonymous donation', 'info');
                } else {
                    // Show and enable personal info fields
                    $('#personalInfoFields').slideDown(300);

                    // Add required attributes back
                    $('#nameChinese, #contactNo').attr('required', 'required');
                    $('#nameChineseRequired, #contactRequired').show();

                    TempleCore.showToast('Personal information is now required', 'info');
                }
            });
        },
        initPledgeHandlers: function () {
            const self = this;

            // Toggle pledge amount field
            $('#isPledge').on('change', function () {
                const isChecked = $(this).is(':checked');

                if (isChecked) {
                    $('#pledgeAmountContainer').slideDown(300);
                    $('#normalAmountHelp').hide();
                    $('#pledgeAmountHelp').show();
                    $('#amountLabel').html('Initial Payment 首期款额');

                    // Suggest pledge amount based on current amount
                    const currentAmount = parseFloat($('#donationAmount').val()) || 0;
                    if ($('#pledgeAmount').val() === '' && currentAmount > 0) {
                        // Suggest 5x the initial amount as pledge
                        const suggestedPledge = currentAmount * 5;
                        $('#pledgeAmount').attr('placeholder', `Suggested: ${suggestedPledge.toFixed(2)}`);
                        $('#pledgeAmount').val(suggestedPledge.toFixed(2));
                    }

                    self.updatePledgeSummary();
                } else {
                    $('#pledgeAmountContainer').slideUp(300);
                    $('#pledgeSummary').slideUp(300);
                    $('#normalAmountHelp').show();
                    $('#pledgeAmountHelp').hide();
                    $('#amountLabel').html('Amount 款额');
                    $('#pledgeAmount').val('');
                }
            });

            // Quick pledge amount buttons
            $(document).on('click', '.pledge-preset', function () {
                const amount = $(this).data('amount');
                $('#pledgeAmount').val(amount).trigger('input');

                // Animate button
                gsap.fromTo(this,
                    { scale: 1 },
                    { scale: 1.1, duration: 0.1, yoyo: true, repeat: 1 }
                );
            });

            // Update pledge summary when amounts change
            $('#donationAmount, #pledgeAmount').on('input', function () {
                if ($('#isPledge').is(':checked')) {
                    self.updatePledgeSummary();
                }
            });
        },

        updatePledgeSummary: function () {
            const donationAmount = parseFloat($('#donationAmount').val()) || 0;
            const pledgeAmount = parseFloat($('#pledgeAmount').val()) || 0;

            if (pledgeAmount > 0) {
                const balance = pledgeAmount - donationAmount;

                $('#summaryPledgeAmount').text('RM ' + pledgeAmount.toFixed(2));
                $('#summaryInitialAmount').text('RM ' + donationAmount.toFixed(2));
                $('#summaryBalance').text('RM ' + balance.toFixed(2));

                // Show summary
                $('#pledgeSummary').slideDown(300);

                // Highlight if invalid
                if (balance < 0) {
                    $('#summaryBalance').removeClass('text-warning').addClass('text-danger');
                    $('#pledgeAmount').addClass('is-invalid');

                    // Show error message
                    if (!$('#pledgeAmount').next('.invalid-feedback').length) {
                        $('#pledgeAmount').after('<div class="invalid-feedback">Pledge amount must be greater than or equal to initial payment</div>');
                    }
                } else {
                    $('#summaryBalance').removeClass('text-danger').addClass('text-warning');
                    $('#pledgeAmount').removeClass('is-invalid');
                    $('#pledgeAmount').next('.invalid-feedback').remove();
                }
            } else {
                $('#pledgeSummary').slideUp(300);
            }
        },

        bindEvents: function () {
            const self = this;

            // Form submission
            $(document).on('submit.' + this.eventNamespace, '#donationForm', function (e) {
                e.preventDefault();

                // Custom pledge validation
                if ($('#isPledge').is(':checked')) {
                    const donationAmount = parseFloat($('#donationAmount').val()) || 0;
                    const pledgeAmount = parseFloat($('#pledgeAmount').val()) || 0;

                    if (pledgeAmount <= 0) {
                        $('#pledgeAmount').addClass('is-invalid');
                        if (!$('#pledgeAmount').next('.invalid-feedback').length) {
                            $('#pledgeAmount').after('<div class="invalid-feedback">Please enter a valid pledge amount</div>');
                        }
                        TempleCore.showToast('Please enter a valid pledge amount', 'error');

                        // Scroll to pledge amount
                        $('html, body').animate({
                            scrollTop: $('#pledgeAmount').offset().top - 100
                        }, 500);
                        return;
                    }

                    if (pledgeAmount < donationAmount) {
                        $('#pledgeAmount').addClass('is-invalid');
                        if (!$('#pledgeAmount').next('.invalid-feedback').length) {
                            $('#pledgeAmount').after('<div class="invalid-feedback">Pledge amount must be greater than or equal to initial payment</div>');
                        }
                        TempleCore.showToast('Pledge amount must be greater than or equal to the initial payment', 'error');

                        // Scroll to pledge amount
                        $('html, body').animate({
                            scrollTop: $('#pledgeAmount').offset().top - 100
                        }, 500);
                        return;
                    }
                }

                if (!this.checkValidity()) {
                    e.stopPropagation();
                    $(this).addClass('was-validated');
                    return;
                }

                self.submitForm();
            });

            // Cancel button
            $('#btnCancel').on('click.' + this.eventNamespace, function () {
                self.cleanup();
                TempleRouter.navigate('donations/list');
            });

            // Reset button
            $(document).on('click.' + this.eventNamespace, '#btnReset', function () {
                self.resetForm();
            });

            // Radio card selection animation
            $(document).on('change.' + this.eventNamespace, 'input[type="radio"]', function () {
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
                $siblings.each(function () {
                    gsap.to(this, {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        borderColor: '#dee2e6',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });

            // Input field animations
            $(document).on('focus.' + this.eventNamespace, '.form-control, .form-select', function () {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur.' + this.eventNamespace, '.form-control, .form-select', function () {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });
        },

        submitForm: async function () {
            const formData = this.getFormData();
            const shouldPrint = $('input[name="print_receipt"]').is(':checked');
            const isAnonymous = formData.is_anonymous;

            // Show loading state
            const $submitBtn = $('#btnSubmit');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');

            try {
                const response = await TempleAPI.post('/donations', formData);

                if (response.success) {
                    // Success animation
                    gsap.to('.donation-form-card', {
                        scale: 1.02,
                        duration: 0.2,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power2.inOut'
                    });

                    // Show success message
                    let message = 'Donation recorded successfully!';
                    if (isAnonymous && formData.is_pledge) {
                        message = `Anonymous pledge donation of RM ${formData.pledge_amount} recorded successfully! Initial payment: RM ${formData.amount}`;
                    } else if (isAnonymous) {
                        message = 'Anonymous donation recorded successfully!';
                    } else if (formData.is_pledge) {
                        message = `Pledge donation of RM ${formData.pledge_amount} recorded successfully! Initial payment: RM ${formData.amount}`;
                    }

                    TempleCore.showToast(message, 'success');

                    // Get the booking ID from response
                    const bookingId = response.data.booking.id;

                    // Navigate based on print option
                    setTimeout(() => {
                        this.cleanup();
                        if (shouldPrint) {
                            // Redirect to print page
                            TempleRouter.navigate('donations/receipt-print', { id: bookingId });
                        } else {
                            // Redirect to list page
                            TempleRouter.navigate('donations/list');
                        }
                    }, 1500);
                } else {
                    throw new Error(response.message || 'Failed to record donation');
                }
            } catch (error) {
                console.error('Error submitting donation:', error);
                TempleCore.showToast(error.message || 'Failed to record donation', 'error');
                $submitBtn.prop('disabled', false).html(originalText);
            }
        },
        getFormData: function () {
            const isPledge = $('#isPledge').is(':checked');
            const isAnonymous = $('#isAnonymous').is(':checked');

            const formData = {
                donation_id: $('input[name="donation_id"]:checked').val(),
                amount: parseFloat($('input[name="amount"]').val()),
                payment_mode_id: $('input[name="payment_mode_id"]:checked').val(),
                print_option: $('input[name="print_receipt"]').is(':checked') ? 'SINGLE_PRINT' : 'NO_PRINT',
                notes: $('textarea[name="notes"]').val(),
                is_pledge: isPledge,
                is_anonymous: isAnonymous
            };

            // Only add personal info if not anonymous
            if (!isAnonymous) {
                formData.name_chinese = $('input[name="name_chinese"]').val();
                formData.name_english = $('input[name="name_english"]').val();
                formData.nric = $('input[name="nric"]').val();
                formData.email = $('input[name="email"]').val();
                formData.contact_no = $('input[name="contact_no"]').val();
            }

            if (isPledge) {
                formData.pledge_amount = parseFloat($('#pledgeAmount').val());
            }

            return formData;
        },

        resetForm: function () {
            $('#donationForm')[0].reset();
            $('#donationForm').removeClass('was-validated');

            // Reset to first donation type and payment mode
            $('input[name="donation_id"]').first().prop('checked', true).trigger('change');
            $('input[name="payment_mode_id"]').first().prop('checked', true).trigger('change');

            // Reset pledge fields
            $('#isPledge').prop('checked', false);
            $('#pledgeAmountContainer').hide();
            $('#pledgeSummary').hide();
            $('#pledgeAmount').val('').removeClass('is-invalid');
            $('#pledgeAmount').next('.invalid-feedback').remove();
            $('#normalAmountHelp').show();
            $('#pledgeAmountHelp').hide();
            $('#amountLabel').html('Amount 款额');

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