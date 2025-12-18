// js/pages/donations/edit.js
// Donations Edit Page with Card-Based Selection, Pledge Support, and Anonymous Donations

(function($, window) {
    'use strict';
    if (!window.DonationsSharedModule) {
        window.DonationsSharedModule = {
            moduleId: 'donations',
            eventNamespace: 'donations',
            cssId: 'donations-css',
            cssPath: '/css/donations.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Donations CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Donations page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Donations page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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

    window.DonationsEditPage = {
        pageId: 'donations-edit',
        eventNamespace: window.DonationsSharedModule.eventNamespace,
        donationTypes: [],
        paymentModes: [],
        
        donationId: null,
        originalData: null,
        
        init: function(params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            
            // Get donation ID from params
            this.donationId = params?.id;
            
            if (!this.donationId) {
                TempleCore.showToast('Donation ID is required', 'error');
                TempleRouter.navigate('donations/list');
                return;
            }
            
            this.render();
            this.initAnimations();
            this.loadFormData();
            this.bindEvents();
        },
        
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.DonationsSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
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
                                        <i class="bi bi-pencil-square donations-header-icon"></i>
                                        <div>
                                            <h1 class="donations-title">Edit Donation</h1>
                                            <p class="donations-subtitle">编辑捐款 • Update Donation</p>
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

                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="card shadow-sm">
                            <div class="card-body py-5">
                                <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="text-muted mb-0">Loading donation details...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Form Container -->
                    <div id="editFormContainer" style="display: none;">
                        <div class="card shadow-sm donation-form-card" data-aos="fade-up" data-aos-duration="800">
                            <div class="card-body p-4">
                                <!-- Booking Number Badge -->
                                <div class="alert alert-info d-flex align-items-center mb-4" role="alert">
                                    <i class="bi bi-info-circle-fill me-3 fs-4"></i>
                                    <div class="flex-grow-1">
                                        <strong>Donation Number:</strong>
                                        <span id="bookingNumber" class="ms-2 fs-5 text-primary">-</span>
                                        <span id="pledgeBadge" class="badge bg-warning text-dark ms-2" style="display:none;">
                                            <i class="bi bi-award-fill"></i> PLEDGE
                                        </span>
                                        <span id="anonymousBadge" class="badge bg-secondary text-white ms-2" style="display:none;">
                                            <i class="bi bi-incognito"></i> ANONYMOUS
                                        </span>
                                    </div>
                                    <div class="text-end">
                                        <small class="text-muted d-block">Created by: <strong id="createdBy">-</strong></small>
                                        <small class="text-muted d-block">Date: <strong id="createdAt">-</strong></small>
                                    </div>
                                </div>

                                <form id="editDonationForm" novalidate>
                                    <div class="row g-4">
                                        <!-- Personal Information Section -->
                                        <div class="col-12">
                                            <div class="section-header-gradient">
                                                <i class="bi bi-person-badge"></i>
                                                <span>Personal Information 个人资料</span>
                                            </div>
                                        </div>
                                        
                                        <!-- Anonymous Donation Checkbox -->
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
                                        
                                        <!-- Personal Information Fields -->
                                        <div id="personalInfoFieldsContainer" class="col-12">
                                            <div class="row g-4" id="personalInfoFields">
                                                <!-- Name Fields -->
                                                <div class="col-md-6">
                                                    <label class="form-label">Name (Chinese) 姓名 (中文) <span class="text-danger" id="nameChineseRequired">*</span></label>
                                                    <input type="text" class="form-control" name="name_chinese" id="nameChinese" required>
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
                                                    <input type="tel" class="form-control" name="contact_no" id="contactNo" required>
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
                                            <label class="form-label fw-semibold">Donation Type 捐款类型</label>
                                            <div class="donation-type-options" id="donationTypeContainer">
                                                <div class="text-center py-3">
                                                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                </div>
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
                                                <input type="number" class="form-control" name="amount" id="amount" step="0.01" min="1" required>
                                                <div class="invalid-feedback">Please enter amount</div>
                                            </div>
                                            <small class="text-muted" id="amountHelpText">Current payment amount</small>
                                        </div>
                                        
                                        <!-- Pledge Information (if applicable) -->
                                        <div class="col-12 mt-4" id="pledgeInfoSection" style="display:none;">
                                            <div class="card border-warning bg-light">
                                                <div class="card-body">
                                                    <h6 class="card-title mb-3">
                                                        <i class="bi bi-clipboard-check text-warning me-2"></i>
                                                        Pledge Information 承诺捐款
                                                    </h6>
                                                    <div class="row g-3">
                                                        <!-- Pledge Amount Field -->
                                                        <div class="col-md-6">
                                                            <label class="form-label">Total Pledge Amount 承诺总额 <span class="text-danger">*</span></label>
                                                            <div class="input-group">
                                                                <span class="input-group-text bg-warning text-dark">
                                                                    <i class="bi bi-award"></i> RM
                                                                </span>
                                                                <input type="number" class="form-control" name="pledge_amount" id="pledgeAmount" 
                                                                       step="0.01" min="1" readonly>
                                                            </div>
                                                            <small class="text-muted">Total pledge commitment (read-only)</small>
                                                        </div>
                                                        
                                                        <!-- Pledge Summary -->
                                                        <div class="col-12">
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
                                                                            <span class="text-muted">Total Paid:</span>
                                                                            <strong class="ms-2 fs-6" id="summaryPaidAmount">RM 0.00</strong>
                                                                        </div>
                                                                        <div class="small border-top pt-1">
                                                                            <span class="text-muted">Remaining Balance:</span>
                                                                            <strong class="ms-2 text-warning fs-5" id="summaryBalance">RM 0.00</strong>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- Payment History Link -->
                                                        <div class="col-12">
                                                            <button type="button" class="btn btn-sm btn-outline-primary" id="btnViewPayments">
                                                                <i class="bi bi-clock-history"></i> View Payment History
                                                            </button>
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
                                            <div class="payment-methods" id="paymentMethodContainer">
                                                <div class="text-center py-3">
                                                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Notes -->
                                        <div class="col-12">
                                            <label class="form-label">Notes 备注</label>
                                            <textarea class="form-control" name="notes" id="notes" rows="3" 
                                                      placeholder="Additional notes or remarks..."></textarea>
                                        </div>
                                    </div>

                                    <!-- Form Actions -->
                                    <div class="form-actions mt-4 pt-4 border-top" data-aos="fade-up" data-aos-delay="300">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                               
                                            </div>
                                            <div class="d-flex gap-2">
                                              <button type="submit" class="btn btn-primary btn-lg px-4" id="btnSave">
                                                    <i class="bi bi-check-circle"></i> Update Donation
                                                </button>
                                                <button type="button" class="btn btn-secondary" id="btnReset">
                                                    <i class="bi bi-arrow-counterclockwise"></i> Reset Changes
                                                </button>
                                              
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        initAnimations: function() {
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
            $(document).on('mouseenter.' + this.eventNamespace, '.form-check-card', function() {
                gsap.to(this, {
                    scale: 1.05,
                    boxShadow: '0 8px 20px rgba(255, 0, 255, 0.15)',
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
            
            $(document).on('mouseleave.' + this.eventNamespace, '.form-check-card', function() {
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
        
        loadFormData: async function() {
            try {
                // Load dropdown options and donation details in parallel
                const [donationsResponse, paymentModesResponse, donationResponse] = await Promise.all([
                    TempleAPI.get('/donations/types/active'),
                    TempleAPI.get('/masters/payment-modes/active'),
                    TempleAPI.get(`/donations/${this.donationId}`)
                ]);

                // Load donation types
                if (donationsResponse.success) {
                    this.donationTypes = donationsResponse.data;
                }

                // Load payment modes
                if (paymentModesResponse.success) {
                    this.paymentModes = paymentModesResponse.data;
                }

                // Load donation data
                if (donationResponse.success) {
                    this.originalData = donationResponse.data;
                    
                    // Render form elements
                    this.renderDonationTypes();
                    this.renderPaymentModes();
                    this.populateForm(donationResponse.data);
                    
                    // Initialize anonymous handlers
                    this.initAnonymousHandlers();
                    
                    // Hide loading, show form
                    $('#loadingState').fadeOut(300, function() {
                        $('#editFormContainer').fadeIn(300);
                    });
                    
                    // Animate form appearance
                    gsap.from('#editFormContainer', {
                        opacity: 0,
                        y: 20,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                } else {
                    throw new Error(donationResponse.message || 'Failed to load donation');
                }

            } catch (error) {
                console.error('Error loading form data:', error);
                $('#loadingState').html(`
                    <div class="card shadow-sm">
                        <div class="card-body py-5 text-center">
                            <div class="alert alert-danger d-inline-block">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                Failed to load donation details. ${error.message}
                            </div>
                            <br><br>
                            <button class="btn btn-primary me-2" id="btnRetry">
                                <i class="bi bi-arrow-clockwise"></i> Retry
                            </button>
                            <button class="btn btn-outline-secondary" id="btnBackToListError">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                `);
                
                $('#btnRetry').on('click', () => this.loadFormData());
                $('#btnBackToListError').on('click', () => {
                    this.cleanup();
                    TempleRouter.navigate('donations/list');
                });
            }
        },
        
        renderDonationTypes: function() {
            const displayDonationTypes = this.donationTypes.slice(0, 8);
            const colSize = displayDonationTypes.length <= 4 ? 3 : Math.floor(12 / Math.min(displayDonationTypes.length, 4));

            const html = `
                <div class="row g-3">
                    ${displayDonationTypes.map((donation, index) => `
                        <div class="col-md-${colSize}">
                            <div class="form-check form-check-card">
                                <input class="form-check-input" type="radio" name="donation_id" 
                                       id="donationType${donation.id}" value="${donation.id}" 
                                       data-type="${donation.type}"
                                       data-name="${donation.name}"
                                       data-secondary="${donation.secondary_name || ''}"
                                       required>
                                <label class="form-check-label" for="donationType${donation.id}">
                                    <span>${donation.name}${donation.secondary_name ? ' • ' + donation.secondary_name : ''}</span>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            $('#donationTypeContainer').html(html);
        },
        
        renderPaymentModes: function() {
            const html = `
                <div class="row g-3">
                    ${this.paymentModes.map((mode, index) => {
                        const iconDisplay = mode.icon_display_url_data || { type: 'bootstrap', value: 'bi-currency-dollar' };
                        const iconHtml = iconDisplay.type === 'bootstrap' 
                            ? `<i class="bi ${iconDisplay.value}"></i>`
                            : `<img src="${iconDisplay.value}" alt="${mode.name}" style="width: ${iconDisplay.width || 62}px; height: ${iconDisplay.height || 28}px; object-fit: contain;">`;
                        
                        return `
                            <div class="col-md-3">
                                <div class="form-check form-check-card">
                                    <input class="form-check-input" type="radio" name="payment_mode_id" 
                                           id="pm${mode.id}" value="${mode.id}" required>
                                    <label class="form-check-label" for="pm${mode.id}">
                                        ${iconHtml}
                                        <span>${mode.name}</span>
                                    </label>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            $('#paymentMethodContainer').html(html);
        },
        
        initAnonymousHandlers: function() {
            const self = this;
            
            // Toggle personal info fields when anonymous checkbox changes
            $('#isAnonymous').on('change', function() {
                const isChecked = $(this).is(':checked');
                
                if (isChecked) {
                    // Animate hide personal info fields
                    gsap.to('#personalInfoFields', {
                        opacity: 0,
                        height: 0,
                        duration: 0.3,
                        ease: 'power2.inOut',
                        onComplete: function() {
                            $('#personalInfoFields').hide();
                        }
                    });
                    
                    // Remove required attributes
                    $('#nameChinese, #contactNo').removeAttr('required');
                    $('#nameChineseRequired, #contactRequired').hide();
                    
                    // Clear values
                    $('#nameChinese, #nameEnglish, #nric, #email, #contactNo').val('');
                    
                    // Remove validation classes
                    $('#nameChinese, #contactNo').removeClass('is-invalid is-valid');
                    $('#editDonationForm').removeClass('was-validated');
                    
                    // Show badge
                    $('#anonymousBadge').show();
                    
                    // Show info message
                    TempleCore.showToast('Personal information fields hidden for anonymous donation', 'info');
                } else {
                    // Show personal info fields
                    $('#personalInfoFields').show();
                    gsap.to('#personalInfoFields', {
                        opacity: 1,
                        height: 'auto',
                        duration: 0.3,
                        ease: 'power2.inOut'
                    });
                    
                    // Add required attributes back
                    $('#nameChinese, #contactNo').attr('required', 'required');
                    $('#nameChineseRequired, #contactRequired').show();
                    
                    // Hide badge
                    $('#anonymousBadge').hide();
                    
                    TempleCore.showToast('Personal information is now required', 'info');
                }
            });
        },
        
        populateForm: function(data) {
            // Basic Info
            $('#bookingNumber').text(data.booking_number);
            $('#createdBy').text(data.created_by || 'System');
            $('#createdAt').text(moment(data.created_at).format('DD MMM YYYY, HH:mm'));
            
            // Check if anonymous
            const isAnonymous = data.is_anonymous || false;
            
            if (isAnonymous) {
                $('#isAnonymous').prop('checked', true);
                $('#personalInfoFields').hide();
                $('#nameChinese, #contactNo').removeAttr('required');
                $('#nameChineseRequired, #contactRequired').hide();
                $('#anonymousBadge').show();
            }
            
            // Check if pledge
            if (data.is_pledge) {
                $('#pledgeBadge').show();
                $('#pledgeInfoSection').show();
                $('#pledgeAmount').val(parseFloat(data.pledge_amount).toFixed(2));
                $('#amountLabel').html('Paid Amount 已付款额');
                $('#amountHelpText').html('<i class="bi bi-info-circle me-1"></i>Total amount paid so far');
                
                this.updatePledgeSummary(data.pledge_amount, data.paid_amount);
            }
            
            // Donor Info (only if not anonymous)
            if (!isAnonymous) {
                $('#nameChinese').val(data.name_chinese);
                $('#nameEnglish').val(data.name_english);
                $('#nric').val(data.nric);
                $('#email').val(data.email);
                $('#contactNo').val(data.contact_no);
            }
            
            // Donation Info
            $('#amount').val(parseFloat(data.amount).toFixed(2));
            $('#notes').val(data.notes || '');
            
            // Find and select donation type
            const donationType = this.donationTypes.find(d => 
                d.name === data.donation_name || d.type === data.donation_type
            );
            if (donationType) {
                $(`input[name="donation_id"][value="${donationType.id}"]`)
                    .prop('checked', true)
                    .trigger('change');
            }
            
            // Find and select payment mode
            const paymentMode = this.paymentModes.find(p => p.name === data.payment_method);
            if (paymentMode) {
                $(`input[name="payment_mode_id"][value="${paymentMode.id}"]`)
                    .prop('checked', true)
                    .trigger('change');
            }
        },
        
        updatePledgeSummary: function(pledgeAmount, paidAmount) {
            const balance = pledgeAmount - paidAmount;
            
            $('#summaryPledgeAmount').text('RM ' + parseFloat(pledgeAmount).toFixed(2));
            $('#summaryPaidAmount').text('RM ' + parseFloat(paidAmount).toFixed(2));
            $('#summaryBalance').text('RM ' + balance.toFixed(2));
            
            if (balance <= 0) {
                $('#summaryBalance').removeClass('text-warning').addClass('text-success');
            } else {
                $('#summaryBalance').removeClass('text-success').addClass('text-warning');
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            // Cancel button
            $('#btnCancel').on('click.' + this.eventNamespace, function(e) {
                e.preventDefault();
                
                if (self.hasChanges()) {
                    Swal.fire({
                        title: 'Unsaved Changes',
                        text: 'You have unsaved changes. Do you want to leave without saving?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc3545',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Yes, leave',
                        cancelButtonText: 'Stay'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            self.cleanup();
                            TempleRouter.navigate('donations/list');
                        }
                    });
                } else {
                    self.cleanup();
                    TempleRouter.navigate('donations/list');
                }
            });
            
            // Reset form
            $('#btnReset').on('click.' + this.eventNamespace, function() {
                Swal.fire({
                    title: 'Reset Changes?',
                    text: 'This will restore all fields to their original values.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#0d6efd',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, reset',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.populateForm(self.originalData);
                        $('#editDonationForm').removeClass('was-validated');
                        TempleCore.showToast('Form reset to original values', 'info');
                    }
                });
            });
            
            // View payment history (for pledges)
            $('#btnViewPayments').on('click.' + this.eventNamespace, function() {
                self.showPaymentHistory();
            });
            
            // Form submission
            $('#editDonationForm').on('submit.' + this.eventNamespace, function(e) {
                e.preventDefault();
                
                if (this.checkValidity()) {
                    self.updateDonation();
                } else {
                    e.stopPropagation();
                    $(this).addClass('was-validated');
                    
                    // Scroll to first error
                    const firstError = $(this).find(':invalid')[0];
                    if (firstError) {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        $(firstError).focus();
                    }
                }
            });
            
            // Radio card selection animation
            $(document).on('change.' + this.eventNamespace, 'input[type="radio"]', function() {
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

            // Input field animations
            $(document).on('focus.' + this.eventNamespace, '.form-control, .form-select', function() {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur.' + this.eventNamespace, '.form-control, .form-select', function() {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });
            
            // Amount formatting
            $('#amount').on('blur', function() {
                const value = parseFloat($(this).val());
                if (!isNaN(value)) {
                    $(this).val(value.toFixed(2));
                }
            });
        },
        
        hasChanges: function() {
            if (!this.originalData) return false;
            
            const currentData = this.getFormData();
            
            // Find original donation type
            const originalDonationType = this.donationTypes.find(d => 
                d.name === this.originalData.donation_name
            );
            
            // Find original payment mode
            const originalPaymentMode = this.paymentModes.find(p => 
                p.name === this.originalData.payment_method
            );
            
            // Check anonymous status
            const originalIsAnonymous = this.originalData.is_anonymous || false;
            
            return (
                currentData.is_anonymous !== originalIsAnonymous ||
                (!currentData.is_anonymous && (
                    currentData.name_chinese !== this.originalData.name_chinese ||
                    currentData.name_english !== this.originalData.name_english ||
                    currentData.nric !== this.originalData.nric ||
                    currentData.email !== this.originalData.email ||
                    currentData.contact_no !== this.originalData.contact_no
                )) ||
                parseFloat(currentData.amount) !== parseFloat(this.originalData.amount) ||
                currentData.donation_id !== (originalDonationType?.id || '') ||
                currentData.payment_mode_id !== (originalPaymentMode?.id || 0) ||
                (currentData.notes || '') !== (this.originalData.notes || '')
            );
        },
        
        getFormData: function() {
            const isAnonymous = $('#isAnonymous').is(':checked');
            
            const formData = {
                donation_id: $('input[name="donation_id"]:checked').val(),
                amount: parseFloat($('#amount').val()),
                payment_mode_id: parseInt($('input[name="payment_mode_id"]:checked').val()),
                notes: $('#notes').val().trim(),
                is_anonymous: isAnonymous
            };
            
            // Only add personal info if not anonymous
            if (!isAnonymous) {
                formData.name_chinese = $('#nameChinese').val().trim();
                formData.name_english = $('#nameEnglish').val().trim();
                formData.nric = $('#nric').val().trim();
                formData.email = $('#email').val().trim();
                formData.contact_no = $('#contactNo').val().trim();
            }
            
            // Add pledge data if applicable
            if (this.originalData.is_pledge) {
                formData.is_pledge = true;
                formData.pledge_amount = parseFloat($('#pledgeAmount').val());
            }
            
            return formData;
        },
        
        updateDonation: async function() {
            const formData = this.getFormData();
            
            // Show loading
            const $btn = $('#btnSave');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Updating...');
            
            try {
                const response = await TempleAPI.put(`/donations/${this.donationId}`, formData);
                
                if (response.success) {
                    // Success animation
                    gsap.to('.donation-form-card', {
                        scale: 1.02,
                        duration: 0.2,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power2.inOut'
                    });
                    
                    TempleCore.showToast('Donation updated successfully!', 'success');
                    
                    // Update original data
                    this.originalData = { ...this.originalData, ...response.data };
                    
                    // Navigate back after delay
                    setTimeout(() => {
                        this.cleanup();
                        TempleRouter.navigate('donations/list');
                    }, 1500);
                } else {
                    throw new Error(response.message || 'Failed to update donation');
                }
            } catch (error) {
                console.error('Error updating donation:', error);
                TempleCore.showToast(error.message || 'Failed to update donation', 'error');
                $btn.prop('disabled', false).html(originalText);
            }
        },
        
        showPaymentHistory: async function() {
            try {
                const response = await TempleAPI.get(`/donations/${this.donationId}/payments`);
                
                if (response.success && response.data.length > 0) {
                    const payments = response.data;
                    
                    const paymentRows = payments.map((payment, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${moment(payment.payment_date).format('DD MMM YYYY')}</td>
                            <td>RM ${parseFloat(payment.amount).toFixed(2)}</td>
                            <td>${payment.payment_method}</td>
                            <td>${payment.payment_reference}</td>
                            <td><span class="badge bg-${payment.payment_status === 'SUCCESS' ? 'success' : 'warning'}">${payment.payment_status}</span></td>
                        </tr>
                    `).join('');
                    
                    Swal.fire({
                        title: 'Payment History',
                        html: `
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Reference</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${paymentRows}
                                    </tbody>
                                </table>
                            </div>
                        `,
                        width: '800px',
                        confirmButtonText: 'Close'
                    });
                } else {
                    TempleCore.showToast('No payment history found', 'info');
                }
            } catch (error) {
                console.error('Error fetching payment history:', error);
                TempleCore.showToast('Failed to load payment history', 'error');
            }
        }
    };
    
})(jQuery, window);