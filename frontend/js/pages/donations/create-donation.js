// js/pages/donations/create-booking.js
// Donation Booking Page - With Tabs and Image Support

(function ($, window) {
    'use strict';

    // Shared Module for Donations
    if (!window.DonationBookingSharedModule) {
        window.DonationBookingSharedModule = {
            moduleId: 'donations',
            eventNamespace: 'donations',
            cssId: 'donations-booking-css',
            cssPath: '/css/donations-booking.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Donations Booking CSS loaded');
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

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Donations Booking CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('Donations Booking module cleaned up');
            }
        };
    }

    window.DonationsCreateDonationPage = {
        pageId: 'donations-booking',
        eventNamespace: window.DonationBookingSharedModule.eventNamespace,
        intervals: [],
        timeouts: [],

        // Data stores
        donationTypes: [],
        donationGroups: [],
        paymentModes: [],

        // State
        selectedDonationType: null,
        selectedPaymentMode: null,
        selectedGroupTab: 'all',
        isAnonymous: false,
        isPledge: false,
        isProcessing: false,
        pendingPaymentData: null, // Stores booking data while waiting for payment

        // Devotee details
        devoteeDetails: {
            name_chinese: '',
            name_english: '',
            nric: '',
            email: '',
            contact_no: '',
        },

        // Page initialization
        init: function (params) {
            window.DonationBookingSharedModule.registerPage(this.pageId);
            this.hideSidebar();
            this.loadMasterData();
        },

        // Hide sidebar for full-width
        hideSidebar: function () {
            $('body').addClass('pos-fullwidth-mode');
            $('#sidebar-container')
                .addClass('pos-sidebar-hidden')
                .css({
                    'display': 'none',
                    'width': '0',
                    'max-width': '0',
                    'flex': '0 0 0',
                    'visibility': 'hidden'
                });
            $('#page-container')
                .addClass('pos-main-expanded')
                .css({
                    'flex': '0 0 100%',
                    'max-width': '100%',
                    'width': '100%',
                    'margin-left': '0'
                });
        },

        // Show sidebar
        showSidebar: function () {
            $('body').removeClass('pos-fullwidth-mode');
            $('#sidebar-container')
                .removeClass('pos-sidebar-hidden')
                .css({
                    'display': '',
                    'width': '',
                    'max-width': '',
                    'flex': '',
                    'visibility': ''
                });
            $('#page-container')
                .removeClass('pos-main-expanded')
                .css({
                    'flex': '',
                    'max-width': '',
                    'width': '',
                    'margin-left': ''
                });
        },

        // Toggle sidebar
        toggleSidebar: function () {
            if ($('body').hasClass('pos-fullwidth-mode')) {
                this.showSidebar();
                $('#btnSidebarToggle i').removeClass('bi-arrow-bar-right').addClass('bi-list');
            } else {
                this.hideSidebar();
                $('#btnSidebarToggle i').removeClass('bi-list').addClass('bi-arrow-bar-right');
            }
        },

        // Load all master data
        loadMasterData: function () {
            const self = this;
            TempleCore.showLoading(true);

            $.when(
                TempleAPI.get('/donation-masters/active'),
                TempleAPI.get('/donation-groups/active'),
                TempleAPI.get('/masters/payment-modes/active')
            ).done(function (donationsRes, groupsRes, paymentRes) {
                self.donationTypes = donationsRes[0]?.data || donationsRes?.data || [];
                self.donationGroups = groupsRes[0]?.data || groupsRes?.data || [];
                self.paymentModes = paymentRes[0]?.data || paymentRes?.data || [];

                // Validate payment modes loaded
                if (self.paymentModes.length === 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'No Payment Methods',
                        text: 'No payment methods are configured. Please contact administrator.',
                        confirmButtonText: 'Go Back',
                        allowOutsideClick: false
                    }).then(() => {
                        TempleRouter.navigate('donations/create-donation');
                    });
                    return;
                }

                console.log('Loaded donation types:', self.donationTypes.length);
                console.log('Loaded donation groups:', self.donationGroups.length);
                console.log('Loaded payment modes:', self.paymentModes.length);

                self.render();
                self.initAnimations();
                self.bindEvents();
            }).fail(function (error) {
                console.error('Failed to load master data:', error);

                // Check which API failed
                if (error.responseJSON && error.responseJSON.message) {
                    TempleCore.showToast(error.responseJSON.message, 'error');
                } else {
                    TempleCore.showToast('Failed to load form data', 'error');
                }

                // Use demo data for development
                self.loadDemoData();
                self.render();
                self.initAnimations();
                self.bindEvents();
            }).always(function () {
                TempleCore.showLoading(false);
            });
        },

        // Load demo data for development
        loadDemoData: function () {
            this.donationTypes = [
                { id: 1, name: 'General Donation', secondary_name: '一般捐款', type: 'one_time', group_id: 1 },
                { id: 2, name: 'Building Fund', secondary_name: '建筑基金', type: 'one_time', group_id: 1 },
                { id: 3, name: 'Education Fund', secondary_name: '教育基金', type: 'one_time', group_id: 2 },
                { id: 4, name: 'Medical Fund', secondary_name: '医疗基金', type: 'one_time', group_id: 2 }
            ];

            this.donationGroups = [
                { id: 1, name: 'General Donations', secondary_name: '一般捐款' },
                { id: 2, name: 'Special Funds', secondary_name: '特殊基金' }
            ];

            this.paymentModes = [
                { id: 1, name: 'Cash', icon_display_url_data: { type: 'bootstrap', value: 'bi-cash' } },
                { id: 2, name: 'Credit Card', icon_display_url_data: { type: 'bootstrap', value: 'bi-credit-card' } },
                { id: 3, name: 'QR Pay', icon_display_url_data: { type: 'bootstrap', value: 'bi-qr-code' } },
                { id: 4, name: 'Bank Transfer', icon_display_url_data: { type: 'bootstrap', value: 'bi-bank' } }
            ];
        },

        // Page cleanup
        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);
            this.showSidebar();

            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('.donation-booking-page *');
            }

            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
            }
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
            }

            window.DonationBookingSharedModule.unregisterPage(this.pageId);
        },

        // Utility functions
        formatCurrency: function (amount) {
            const currency = (typeof TempleCore !== 'undefined' && TempleCore.getCurrency) ? TempleCore.getCurrency() : 'RM';
            return currency + ' ' + parseFloat(amount || 0).toFixed(2);
        },

        formatDate: function (date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        // Generate group tabs HTML
        generateGroupTabsHTML: function () {
            let html = `<button class="donation-group-tab active" data-group="all"><span>All</span></button>`;

            this.donationGroups.forEach(group => {
                html += `
                    <button class="donation-group-tab" data-group="${group.id}">
                        <span>${group.name}</span>
                    </button>`;
            });

            return html;
        },

        // Get filtered donations by selected group
        getFilteredDonations: function () {
            if (this.selectedGroupTab === 'all') {
                return this.donationTypes;
            }
            return this.donationTypes.filter(d => d.group_id === parseInt(this.selectedGroupTab));
        },

        // Generate donation type cards HTML with images
        generateDonationTypeCardsHTML: function () {
            const filteredDonations = this.getFilteredDonations();

            if (filteredDonations.length === 0) {
                return `<div class="donation-no-items">
                    <i class="bi bi-inbox"></i>
                    <h4>No donation types available</h4>
                    <p>Please select a different group or add donation types</p>
                </div>`;
            }

            return filteredDonations.map(donation => this.generateDonationCardHTML(donation)).join('');
        },

        // Generate single donation card HTML with image support
        generateDonationCardHTML: function (donation) {
            const isSelected = this.selectedDonationType && this.selectedDonationType.id === donation.id;
            const selectedClass = isSelected ? 'selected' : '';

            // Get image or icon
            let imageHtml;
            if (donation.image_url) {
                imageHtml = `<img src="${donation.image_url}" alt="${donation.name}" class="donation-type-image">`;
            } else {
                imageHtml = `<div class="donation-type-icon"><i class="bi bi-heart-fill"></i></div>`;
            }

            return `
                <div class="donation-type-card ${selectedClass}" data-donation-id="${donation.id}">
                    ${imageHtml}
                    <div class="donation-type-name">${donation.name}</div>
                    ${donation.secondary_name ? `<div class="donation-type-name-secondary">${donation.secondary_name}</div>` : ''}
                    ${donation.type ? `<div class="donation-type-badge">${donation.type.replace('_', ' ').toUpperCase()}</div>` : ''}
                </div>`;
        },

        // Generate payment methods HTML
        generatePaymentMethodsHTML: function () {
            if (!this.paymentModes || this.paymentModes.length === 0) {
                return `
                    <div class="alert alert-warning mb-0">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        No payment methods available. Please contact administrator.
                    </div>`;
            }

            return this.paymentModes.map((mode, index) => {
                const iconDisplay = mode.icon_display_url_data || {
                    type: 'bootstrap',
                    value: 'bi-currency-dollar'
                };

                // Safe icon rendering with fallback
                let iconHtml;
                try {
                    iconHtml = iconDisplay.type === 'bootstrap'
                        ? `<i class="bi ${iconDisplay.value}"></i>`
                        : `<img src="${iconDisplay.value}" 
                                alt="${mode.name}" 
                                style="width: ${iconDisplay.width || 40}px; 
                                       height: ${iconDisplay.height || 28}px; 
                                       object-fit: contain;"
                                onerror="this.style.display='none'; 
                                         this.parentElement.innerHTML='<i class=\'bi bi-currency-dollar\'></i>'">`;
                } catch (error) {
                    console.error('Error rendering icon for payment mode:', mode.name, error);
                    iconHtml = `<i class="bi bi-currency-dollar"></i>`;
                }

                return `
                    <div class="donation-payment-option">
                        <input class="form-check-input" 
                               type="radio" 
                               name="payment_method" 
                               id="payment${mode.id}" 
                               value="${mode.id}" 
                               ${index === 0 ? 'checked' : ''}
                               data-name="${mode.name}">
                        <label class="form-check-label" for="payment${mode.id}">
                            ${iconHtml}
                            <span>${mode.name}</span>
                        </label>
                    </div>`;
            }).join('');
        },

        // Render page with tabs
        render: function () {
            const today = this.formatDate(new Date());

            const html = `
                <div class="donation-booking-page">
                    <!-- Header -->
                    <div class="donation-header">
                        <div class="donation-header-content">
                            <div class="donation-header-left">
                                <button class="donation-sidebar-toggle" id="btnSidebarToggle" title="Toggle Sidebar">
                                    <i class="bi bi-arrow-bar-right"></i>
                                </button>
                                <h1 class="donation-title"><i class="bi bi-heart-fill"></i> Donation Booking</h1>
                            </div>
                            <div class="donation-header-actions">
    <input type="date" class="donation-date-input" id="donationDate" value="${today}">
    <button class="btn-reprint" id="btnReprint"><i class="bi bi-printer"></i> Reprint</button> 
        <button class="btn-clear-all" id="btnClearAll"><i class="bi bi-x-circle"></i> Clear All</button>
</div>
                            
                        </div>
                    </div>
                    
                    <!-- Main Container -->
                    <div class="donation-main-container">
                        <!-- Left Section - Donation Types with Tabs -->
                        <div class="donation-types-section" id="donationTypesSection">
                            <!-- Group Tabs -->
                            <div class="donation-group-tabs">${this.generateGroupTabsHTML()}</div>
                            
                            <!-- Donation Types Grid -->
                            <div class="donation-types-grid" id="donationTypesContainer">
                                ${this.generateDonationTypeCardsHTML()}
                            </div>
                        </div>
                        
                        <!-- Right Section - Booking Form -->
                        <div class="donation-form-section" id="donationFormSection">
                            <div class="donation-form-header">
                                <h2 class="donation-form-title">Donation Details</h2>
                            </div>
                            
                            <div class="donation-form-body">
                                <!-- Selected Donation Type Display -->
                                <div class="selected-donation-display" id="selectedDonationDisplay" style="display: none;">
                                    <div class="selected-donation-badge">
                                        <i class="bi bi-check-circle-fill text-success"></i>
                                        <div>
                                            <strong id="selectedDonationName">-</strong>
                                            <small id="selectedDonationSecondary" class="text-muted">-</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Anonymous Toggle -->
                                <div class="donation-form-section-card">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="isAnonymous">
                                        <label class="form-check-label fw-semibold" for="isAnonymous">
                                            <i class="bi bi-incognito me-2"></i>
                                            Anonymous Donation 匿名捐款
                                        </label>
                                    </div>
                                    <small class="text-muted ms-4 d-block mt-1">
                                        Personal information will not be recorded
                                    </small>
                                </div>
                                
                                <!-- Personal Information -->
                                <div class="donation-form-section-card" id="personalInfoContainer">
                                    <h6 class="section-title"><i class="bi bi-person me-2"></i>Personal Information</h6>
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Name (Chinese) 姓名 (中文) <span class="text-danger" id="nameChineseRequired">*</span></label>
                                            <input type="text" class="form-control" id="nameChinese" placeholder="Enter Chinese name">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Name (English) 姓名 (英文)</label>
                                            <input type="text" class="form-control" id="nameEnglish" placeholder="Enter English name">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">NRIC No. 身份证</label>
                                            <input type="text" class="form-control" id="nric" placeholder="Enter NRIC">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Contact No. 联系电话 <span class="text-danger" id="contactRequired">*</span></label>
                                            <input type="tel" class="form-control" id="contactNo" placeholder="Enter contact number">
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Email 电邮</label>
                                            <input type="email" class="form-control" id="email" placeholder="Enter email address">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pledge Information -->
                                <div class="donation-form-section-card">
                                    <div class="form-check form-switch mb-3">
                                        <input class="form-check-input" type="checkbox" id="isPledge">
                                        <label class="form-check-label fw-semibold" for="isPledge">
                                            <i class="bi bi-hand-thumbs-up me-2"></i>
                                            This is a Pledge Donation 认捐款项
                                        </label>
                                    </div>
                                    
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <span id="amountLabel">Donation Amount 捐款金额</span>
                                                <span class="text-danger">*</span>
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">RM</span>
                                                <input type="number" class="form-control" id="donationAmount" 
                                                       step="0.01" min="1" placeholder="Enter amount">
                                            </div>
                                            <small class="text-muted" id="amountHelpText">
                                                <span id="normalAmountHelp">Enter the donation amount</span>
                                                <span id="pledgeAmountHelp" style="display:none;">
                                                    <i class="bi bi-info-circle me-1"></i>
                                                    Initial payment amount (can be less than total pledge)
                                                </span>
                                            </small>
                                        </div>
                                        
                                        <!-- Pledge Amount (Hidden by default) -->
                                        <div class="col-md-6" id="pledgeAmountContainer" style="display: none;">
                                            <label class="form-label">Total Pledge Amount 认捐总额 <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <span class="input-group-text bg-warning text-dark">
                                                    <i class="bi bi-award"></i> RM
                                                </span>
                                                <input type="number" class="form-control" id="pledgeAmount" 
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
                                            
                                            <small class="text-muted">Total amount to donate over time</small>
                                        </div>
                                    </div>
                                    
                                    <!-- Pledge Summary (Hidden by default) -->
                                    <div class="mt-3" id="pledgeSummary" style="display: none;">
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
                                
                                <!-- Payment Method -->
                                <div class="donation-form-section-card">
                                    <h6 class="section-title"><i class="bi bi-credit-card me-2"></i>Payment Method</h6>
                                    <div class="donation-payment-methods" id="paymentMethods">
                                        ${this.generatePaymentMethodsHTML()}
                                    </div>
                                </div>
                                
                                <!-- Notes -->
                                <div class="donation-form-section-card">
                                    <label class="form-label">Notes 备注</label>
                                    <textarea class="form-control" id="notes" rows="3" 
                                              placeholder="Additional notes or remarks..."></textarea>
                                </div>
                                
                                <!-- Print Option -->
                                <div class="donation-form-section-card">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="printReceipt" checked>
                                        <label class="form-check-label" for="printReceipt">
                                            <i class="bi bi-printer me-2"></i> Print receipt after donation
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Footer Actions -->
                            <div class="donation-form-footer">
                                <button class="donation-submit-btn" id="btnSubmit" disabled>
                                    <i class="bi bi-check-circle"></i> Submit Donation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;

            $('#page-container').html(html);

            // Set default payment mode
            if (this.paymentModes.length > 0) {
                this.selectedPaymentMode = this.paymentModes[0].id;
            }
        },

        // Initialize animations
        initAnimations: function () {
            gsap.set('.donation-header, .donation-group-tab, .donation-type-card, .donation-form-section', { opacity: 1 });

            gsap.fromTo('.donation-header',
                { opacity: 0, y: -30 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'all' }
            );

            gsap.fromTo('.donation-group-tab',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'back.out(1.2)', delay: 0.2, clearProps: 'all' }
            );

            gsap.fromTo('.donation-type-card',
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(1.2)', delay: 0.3, clearProps: 'all' }
            );

            gsap.fromTo('.donation-form-section',
                { opacity: 0, x: 50 },
                { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', delay: 0.2, clearProps: 'all' }
            );
        },

        // Bind events
        bindEvents: function () {
            const self = this;
            const ns = this.eventNamespace;

            // Sidebar toggle
            $(document).on(`click.${ns}`, '#btnSidebarToggle', function () {
                self.toggleSidebar();
            });

            // Group tab click
            $(document).on(`click.${ns}`, '.donation-group-tab', function () {
                const groupId = $(this).data('group');
                self.selectGroupTab(groupId);
            });

            // Donation type selection
            $(document).on(`click.${ns}`, '.donation-type-card', function () {
                const donationId = $(this).data('donation-id');
                self.selectDonationType(donationId);
            });
            // ADD THIS NEW BINDING - Reprint button
            $(document).on(`click.${ns}`, '#btnReprint', function () {
                self.showReprintModal();
            });

            // ADD THIS NEW BINDING - Print button in reprint modal
            $(document).on(`click.${ns}`, '.reprint-action-btn', function () {
                const bookingId = $(this).data('booking-id');
                self.printDonationReceipt(bookingId);
            });
            $(document).on(`click.${ns}`, '.reprint-modal-content', function (e) {
                e.stopPropagation();
            });
            // ADD THIS NEW BINDING - Close reprint modal
            $(document).on(`click.${ns}`, '.reprint-modal-close, .reprint-modal-overlay', function () {
                self.closeReprintModal();
            });

            // Payment method change with visual feedback
            $(document).on(`change.${ns}`, 'input[name="payment_method"]', function () {
                self.selectedPaymentMode = $(this).val();

                // Visual feedback
                const $label = $(this).next('label');
                gsap.to($label[0], {
                    scale: 1.1,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut'
                });

                // Show selected payment mode name
                const modeName = $label.find('span').text();
                TempleCore.showToast(`Payment method: ${modeName}`, 'info');

                self.updateSubmitButton();
            });

            // Anonymous toggle
            $(document).on(`change.${ns}`, '#isAnonymous', function () {
                self.isAnonymous = $(this).is(':checked');
                self.togglePersonalInfo();
            });

            // Pledge toggle
            $(document).on(`change.${ns}`, '#isPledge', function () {
                self.isPledge = $(this).is(':checked');
                self.togglePledgeFields();
            });

            // Pledge preset buttons
            $(document).on(`click.${ns}`, '.pledge-preset', function () {
                const amount = $(this).data('amount');
                $('#pledgeAmount').val(amount).trigger('input');

                gsap.fromTo(this,
                    { scale: 1 },
                    { scale: 1.1, duration: 0.1, yoyo: true, repeat: 1 }
                );
            });

            // Amount input changes
            $(document).on(`input.${ns}`, '#donationAmount, #pledgeAmount', function () {
                if (self.isPledge) {
                    self.updatePledgeSummary();
                }
                self.updateSubmitButton();
            });

            // Clear all
            $(document).on(`click.${ns}`, '#btnClearAll', function () {
                if (confirm('Are you sure you want to clear all data?')) {
                    self.clearForm();
                }
            });

            // Submit
            $(document).on(`click.${ns}`, '#btnSubmit', function () {
                self.submitDonation();
            });
        },
        printDonationReceipt: function (bookingId) {
            // Close modal first
            this.closeReprintModal();

            // Navigate to receipt print page
            setTimeout(() => {
                TempleRouter.navigate('donations/receipt-print', { id: bookingId });
            }, 300);
        },
        closeReprintModal: function () {
            $('.reprint-modal-overlay').removeClass('active');
            $('.reprint-modal-content').removeClass('active');

            setTimeout(() => {
                $('.reprint-modal-overlay').remove();
            }, 300);
        },

        showReprintModal: async function () {
            const self = this;

            try {
                TempleCore.showLoading(true);

                // Fetch recent donations for reprint
                const response = await TempleAPI.get('/donations', {
                    per_page: 20,
                    page: 1
                });

                if (!response.success) {
                    throw new Error(response.message || 'Failed to fetch donations');
                }

                const donations = response.data || [];

                // Generate and show modal
                const modalHTML = self.generateReprintModalHTML(donations);
                $('body').append(modalHTML);

                // Animate modal appearance
                setTimeout(() => {
                    $('.reprint-modal-overlay').addClass('active');
                    $('.reprint-modal-content').addClass('active');
                }, 10);

            } catch (error) {
                console.error('Error loading reprint modal:', error);
                TempleCore.showToast(error.message || 'Failed to load donations', 'error');
            } finally {
                TempleCore.showLoading(false);
            }
        }, generateReprintModalHTML: function (donations) {
            const rows = donations.map((donation, index) => {
                const date = new Date(donation.date).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${donation.booking_number}</strong></td>
                <td>${date}</td>
                <td>${donation.name_chinese || donation.name_english || 'Anonymous'}</td>
                <td>${donation.donation_name || '-'}</td>
                <td class="text-end"><strong>${this.formatCurrency(donation.amount)}</strong></td>
                <td class="text-center">
                    <button class="reprint-action-btn" 
                            data-booking-id="${donation.id}"
                            title="Print Receipt">
                        <i class="bi bi-printer-fill"></i> PRINT
                    </button>
                </td>
            </tr>`;
            }).join('');

            const emptyState = donations.length === 0 ? `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">
                <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                <p class="mt-2">No donations found for reprint</p>
            </td>
        </tr>` : '';

            return `
        <div class="reprint-modal-overlay">
            <div class="reprint-modal-content">
                <div class="reprint-modal-header">
                    <h3><i class="bi bi-printer"></i> Reprint Donation Receipt</h3>
                    <button class="reprint-modal-close" title="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                
                <div class="reprint-modal-body">
                    <div class="reprint-table-container">
                        <table class="reprint-table">
                            <thead>
                                <tr>
                                    <th style="width: 60px;">S.No</th>
                                    <th style="width: 160px;">Invoice No</th>
                                    <th style="width: 120px;">Date</th>
                                    <th>Donor Name</th>
                                    <th>Donation Type</th>
                                    <th class="text-end" style="width: 120px;">Amount</th>
                                    <th class="text-center" style="width: 120px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}${emptyState}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="reprint-modal-footer">
                    <p class="text-muted mb-0">
                        <i class="bi bi-info-circle"></i> 
                        Showing last 20 donations. Use the Donations List page for older records.
                    </p>
                </div>
            </div>
        </div>`;
        },

        // Select group tab and filter donations
        selectGroupTab: function (groupId) {
            this.selectedGroupTab = groupId;

            // Update UI
            $('.donation-group-tab').removeClass('active');
            $(`.donation-group-tab[data-group="${groupId}"]`).addClass('active');

            // Re-render donation cards with filter
            $('#donationTypesContainer').html(this.generateDonationTypeCardsHTML());

            // Animate new cards
            gsap.fromTo('.donation-type-card',
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(1.2)' }
            );
        },

        // Select donation type
        selectDonationType: function (donationId) {
            const donation = this.donationTypes.find(d => d.id === donationId);
            if (!donation) return;

            this.selectedDonationType = donation;

            // Update UI
            $('.donation-type-card').removeClass('selected');
            $(`.donation-type-card[data-donation-id="${donationId}"]`).addClass('selected');

            // Show selected donation
            $('#selectedDonationName').text(donation.name);
            $('#selectedDonationSecondary').text(donation.secondary_name || '');
            $('#selectedDonationDisplay').slideDown(300);

            // Enable submit button
            this.updateSubmitButton();

            // Animate
            gsap.fromTo('#selectedDonationDisplay',
                { scale: 0.9, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' }
            );

            TempleCore.showToast(`${donation.name} selected`, 'success');
        },

        // Toggle personal info fields
        togglePersonalInfo: function () {
            if (this.isAnonymous) {
                $('#personalInfoContainer').slideUp(300);
                $('#nameChinese, #contactNo').removeAttr('required');
                $('#nameChineseRequired, #contactRequired').hide();

                // Clear values
                $('#nameChinese, #nameEnglish, #nric, #email, #contactNo').val('');

                TempleCore.showToast('Personal information fields hidden for anonymous donation', 'info');
            } else {
                $('#personalInfoContainer').slideDown(300);
                $('#nameChinese, #contactNo').attr('required', 'required');
                $('#nameChineseRequired, #contactRequired').show();

                TempleCore.showToast('Personal information is now required', 'info');
            }
            this.updateSubmitButton();
        },

        // Toggle pledge fields
        togglePledgeFields: function () {
            if (this.isPledge) {
                $('#pledgeAmountContainer').slideDown(300);
                $('#normalAmountHelp').hide();
                $('#pledgeAmountHelp').show();
                $('#amountLabel').html('Initial Payment 初次付款');

                // Suggest pledge amount
                const currentAmount = parseFloat($('#donationAmount').val()) || 0;
                if ($('#pledgeAmount').val() === '' && currentAmount > 0) {
                    const suggestedPledge = currentAmount * 5;
                    $('#pledgeAmount').attr('placeholder', `Suggested: ${suggestedPledge.toFixed(2)}`);
                    $('#pledgeAmount').val(suggestedPledge.toFixed(2));
                }

                this.updatePledgeSummary();
            } else {
                $('#pledgeAmountContainer').slideUp(300);
                $('#pledgeSummary').slideUp(300);
                $('#normalAmountHelp').show();
                $('#pledgeAmountHelp').hide();
                $('#amountLabel').html('Donation Amount 捐款金额');
                $('#pledgeAmount').val('');
            }
            this.updateSubmitButton();
        },

        // Update pledge summary
        updatePledgeSummary: function () {
            const donationAmount = parseFloat($('#donationAmount').val()) || 0;
            const pledgeAmount = parseFloat($('#pledgeAmount').val()) || 0;

            if (pledgeAmount > 0) {
                const balance = pledgeAmount - donationAmount;

                $('#summaryPledgeAmount').text('RM ' + pledgeAmount.toFixed(2));
                $('#summaryInitialAmount').text('RM ' + donationAmount.toFixed(2));
                $('#summaryBalance').text('RM ' + balance.toFixed(2));

                $('#pledgeSummary').slideDown(300);

                // Highlight if invalid
                if (balance < 0) {
                    $('#summaryBalance').removeClass('text-warning').addClass('text-danger');
                    $('#pledgeAmount').addClass('is-invalid');
                } else {
                    $('#summaryBalance').removeClass('text-danger').addClass('text-warning');
                    $('#pledgeAmount').removeClass('is-invalid');
                }
            } else {
                $('#pledgeSummary').slideUp(300);
            }
        },

        // Update submit button state
        updateSubmitButton: function () {
            const hasType = this.selectedDonationType !== null;
            const hasAmount = parseFloat($('#donationAmount').val()) > 0;
            const hasPayment = this.selectedPaymentMode !== null;

            let isValid = hasType && hasAmount && hasPayment;

            // Check personal info if not anonymous
            if (!this.isAnonymous) {
                const hasName = $('#nameChinese').val().trim() !== '';
                const hasContact = $('#contactNo').val().trim() !== '';
                isValid = isValid && hasName && hasContact;
            }

            // Check pledge validation
            if (this.isPledge) {
                const pledgeAmount = parseFloat($('#pledgeAmount').val()) || 0;
                const donationAmount = parseFloat($('#donationAmount').val()) || 0;
                isValid = isValid && pledgeAmount > 0 && pledgeAmount >= donationAmount;
            }

            // Show validation message if payment mode not selected
            if (!hasPayment && hasType && hasAmount) {
                $('#paymentMethods').addClass('border border-warning rounded p-2');
            } else {
                $('#paymentMethods').removeClass('border border-warning');
            }

            $('#btnSubmit').prop('disabled', !isValid);
        },

        // Clear form
        clearForm: function () {
            // Clear donation type selection
            this.selectedDonationType = null;
            $('.donation-type-card').removeClass('selected');
            $('#selectedDonationDisplay').hide();

            // Clear form fields
            $('#nameChinese, #nameEnglish, #nric, #email, #contactNo').val('');
            $('#donationAmount, #pledgeAmount, #notes').val('');

            // Reset checkboxes
            $('#isAnonymous, #isPledge, #printReceipt').prop('checked', false);
            $('#printReceipt').prop('checked', true);

            // Reset states
            this.isAnonymous = false;
            this.isPledge = false;

            // Hide conditional sections
            $('#personalInfoContainer').show();
            $('#pledgeAmountContainer, #pledgeSummary').hide();
            $('#normalAmountHelp').show();
            $('#pledgeAmountHelp').hide();
            $('#amountLabel').html('Donation Amount 捐款金额');

            // Reset payment validation styling
            $('#paymentMethods').removeClass('border border-warning');

            // Update button
            this.updateSubmitButton();

            TempleCore.showToast('Form cleared', 'info');
        },

        // Get form data
        getFormData: function () {
            const formData = {
                donation_id: this.selectedDonationType.id,
                amount: parseFloat($('#donationAmount').val()),
                payment_mode_id: parseInt(this.selectedPaymentMode),
                print_option: $('#printReceipt').is(':checked') ? 'SINGLE_PRINT' : 'NO_PRINT',
                notes: $('#notes').val(),
                is_pledge: this.isPledge,
                is_anonymous: this.isAnonymous
            };

            // Add personal info if not anonymous
            if (!this.isAnonymous) {
                formData.name_chinese = $('#nameChinese').val();
                formData.name_english = $('#nameEnglish').val();
                formData.nric = $('#nric').val();
                formData.email = $('#email').val();
                formData.contact_no = $('#contactNo').val();
            }

            // Add pledge amount if pledge
            if (this.isPledge) {
                formData.pledge_amount = parseFloat($('#pledgeAmount').val());
            }

            return formData;
        },

        // Submit donation
        submitDonation: async function () {
            if (this.isProcessing) {
                TempleCore.showToast('Donation is being processed, please wait...', 'info');
                return;
            }

            // Validate
            if (!this.selectedDonationType) {
                TempleCore.showToast('Please select a donation type', 'warning');
                return;
            }

            const amount = parseFloat($('#donationAmount').val());
            if (!amount || amount <= 0) {
                TempleCore.showToast('Please enter a valid donation amount', 'warning');
                $('#donationAmount').focus();
                return;
            }

            // Validate personal info if not anonymous
            if (!this.isAnonymous) {
                if (!$('#nameChinese').val().trim()) {
                    TempleCore.showToast('Please enter Chinese name', 'warning');
                    $('#nameChinese').focus();
                    return;
                }
                if (!$('#contactNo').val().trim()) {
                    TempleCore.showToast('Please enter contact number', 'warning');
                    $('#contactNo').focus();
                    return;
                }
            }

            // Validate pledge
            if (this.isPledge) {
                const pledgeAmount = parseFloat($('#pledgeAmount').val());
                if (!pledgeAmount || pledgeAmount <= 0) {
                    TempleCore.showToast('Please enter a valid pledge amount', 'warning');
                    $('#pledgeAmount').focus();
                    return;
                }
                if (pledgeAmount < amount) {
                    TempleCore.showToast('Pledge amount must be greater than or equal to initial payment', 'warning');
                    $('#pledgeAmount').focus();
                    return;
                }
            }

            // Get payment mode name for confirmation
            const selectedPaymentMode = this.paymentModes.find(
                pm => pm.id === parseInt(this.selectedPaymentMode)
            );
            const paymentModeName = selectedPaymentMode ? selectedPaymentMode.name : 'Unknown';

            // Confirm - SINGLE DECLARATION
            let confirmMsg = `Confirm Donation:\n\n`;
            confirmMsg += `Type: ${this.selectedDonationType.name}\n`;
            confirmMsg += `Amount: ${this.formatCurrency(amount)}\n`;
            confirmMsg += `Payment: ${paymentModeName}\n`;
            if (this.isPledge) {
                confirmMsg += `Pledge Total: ${this.formatCurrency($('#pledgeAmount').val())}\n`;
            }
            if (this.isAnonymous) {
                confirmMsg += `Anonymous: Yes\n`;
            } else {
                confirmMsg += `Name: ${$('#nameChinese').val()}\n`;
            }
            confirmMsg += `\nProceed with donation?`;

            if (!confirm(confirmMsg)) {
                return;
            }

            // Show loading
            this.isProcessing = true;
            const $submitBtn = $('#btnSubmit');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            TempleCore.showLoading(true);

            try {
                const formData = this.getFormData();
                const response = await TempleAPI.post('/donations', formData);

                if (response.success) {
                    if (response.data.payment_status == 'PENDING') {
                        // Payment gateway - open payment URL in popup
                        TempleCore.showToast('Donation created! Opening payment gateway...', 'success');
                        this.openPaymentPopup(response.data, formData);
                    } else {
                        // Direct payment success
                        // Success animation
                        gsap.to('.donation-form-section', {
                            scale: 1.02,
                            duration: 0.2,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });

                        // Show success message
                        let message = 'Donation recorded successfully!';
                        if (this.isAnonymous && this.isPledge) {
                            message = `Anonymous pledge donation of ${this.formatCurrency(formData.pledge_amount)} recorded successfully! Initial payment: ${this.formatCurrency(formData.amount)}`;
                        } else if (this.isAnonymous) {
                            message = 'Anonymous donation recorded successfully!';
                        } else if (this.isPledge) {
                            message = `Pledge donation of ${this.formatCurrency(formData.pledge_amount)} recorded successfully! Initial payment: ${this.formatCurrency(formData.amount)}`;
                        }

                        TempleCore.showToast(message, 'success');

                        // Get booking ID
                        const bookingId = response.data.booking.id;
                        const shouldPrint = formData.print_option === 'SINGLE_PRINT';

                        // Navigate based on print option
                        setTimeout(() => {
                            this.cleanup();
                            if (shouldPrint) {
                                // Redirect to print page
                                TempleRouter.navigate('donations/receipt-print', { id: bookingId });
                            } else {
                                // Redirect to list page
                                TempleRouter.navigate('donations/create-donation');
                            }
                        }, 1500);
                    }
                } else {
                    throw new Error(response.message || 'Failed to record donation');
                }
            } catch (error) {
                console.error('Error submitting donation:', error);
                TempleCore.showToast(error.message || 'Failed to record donation', 'error');
                $submitBtn.prop('disabled', false).html(originalText);
            } finally {
                this.isProcessing = false;
                TempleCore.showLoading(false);
            }
        },

        // Open payment gateway popup and monitor status
        openPaymentPopup: function(bookingData, formData) {
            const self = this;
            
            if (!bookingData.payment_url) {
                TempleCore.showToast('Payment URL not available', 'error');
                this.handlePaymentFailure();
                return;
            }
            
            // Store booking data for later use
            this.pendingPaymentData = {
                booking: bookingData,
                formData: formData
            };
            
            // Open payment gateway in popup window
            const popupWidth = 600;
            const popupHeight = 700;
            const left = (screen.width - popupWidth) / 2;
            const top = (screen.height - popupHeight) / 2;
            
            const popupFeatures = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},` +
                                 `scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no`;
            
            const paymentWindow = window.open(bookingData.payment_url, 'PaymentGateway', popupFeatures);
            
            if (!paymentWindow) {
                TempleCore.showToast('Please allow popups for payment processing', 'error');
                this.handlePaymentFailure();
                return;
            }
            
            // Show loading overlay
            TempleCore.showLoading(true);
            
            // Monitor payment popup
            this.monitorPaymentStatus(paymentWindow, bookingData.booking_id);
        },

        // Monitor payment status via popup window and message listener
        monitorPaymentStatus: function(paymentWindow, bookingId) {
            const self = this;
            let checkInterval = null;
            let messageReceived = false;
            
            // Listen for postMessage from payment callback page
            const messageHandler = function(event) {
                // Verify message origin for security (adjust domain as needed)
                // if (event.origin !== window.location.origin) return;
                
                if (event.data && event.data.type === 'PAYMENT_CALLBACK') {
                    messageReceived = true;
                    
                    // Clear interval
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                    }
                    
                    // Remove event listener
                    window.removeEventListener('message', messageHandler);
                    
                    // Close payment window
                    if (paymentWindow && !paymentWindow.closed) {
                        paymentWindow.close();
                    }
                    
                    // Handle payment result
                    if (event.data.status === 'success' || event.data.status === 'SUCCESS') {
                        self.handlePaymentSuccess(event.data);
                    } else {
                        self.handlePaymentFailure(event.data);
                    }
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Fallback: Poll to check if popup is closed
            checkInterval = setInterval(function() {
                if (paymentWindow.closed) {
                    clearInterval(checkInterval);
                    window.removeEventListener('message', messageHandler);
                    
                    if (!messageReceived) {
                        // Popup closed without message - check payment status via API
                        TempleCore.showToast('Payment window closed. Checking payment status...', 'info');
                        self.checkPaymentStatusViaAPI(bookingId);
                    }
                }
            }, 500);
            
            // Timeout after 15 minutes (900000ms)
            setTimeout(function() {
                if (checkInterval) {
                    clearInterval(checkInterval);
                    window.removeEventListener('message', messageHandler);
                    
                    if (paymentWindow && !paymentWindow.closed) {
                        paymentWindow.close();
                    }
                    
                    if (!messageReceived) {
                        TempleCore.showToast('Payment timeout. Please check payment status manually.', 'warning');
                        self.handlePaymentFailure({ message: 'Payment timeout' });
                    }
                }
            }, 900000);
        },

        // Check payment status via API (fallback method)
        checkPaymentStatusViaAPI: function(bookingId) {
            const self = this;
            
            TempleAPI.get(`/donations/${bookingId}/payment-status`)
                .done(function(response) {
                    if (response.success) {
                        if (response.data.payment_status === 'SUCCESS' || 
                            response.data.payment_status === 'PAID' || 
                            response.data.booking_status === 'CONFIRMED') {
                            self.handlePaymentSuccess(response.data);
                        } else if (response.data.payment_status === 'FAILED' || 
                                   response.data.payment_status === 'CANCELLED') {
                            self.handlePaymentFailure(response.data);
                        } else {
                            // Still pending
                            TempleCore.showToast('Payment is still pending. Please check later.', 'warning');
                            TempleCore.showLoading(false);
                        }
                    } else {
                        self.handlePaymentFailure({ message: 'Unable to verify payment status' });
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Unable to verify payment status. Please check manually.', 'error');
                    TempleCore.showLoading(false);
                });
        },

        // Handle successful payment
        handlePaymentSuccess: function(paymentData) {
            TempleCore.showLoading(false);
            TempleCore.showToast('Payment completed successfully!', 'success');
            
            if (this.pendingPaymentData) {
                const bookingData = this.pendingPaymentData.booking;
                const formData = this.pendingPaymentData.formData;
                
                // Success animation
                gsap.to('.donation-form-section', {
                    scale: 1.02,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut'
                });

                // Show success message
                let message = 'Donation recorded successfully!';
                if (this.isAnonymous && this.isPledge) {
                    message = `Anonymous pledge donation of ${this.formatCurrency(formData.pledge_amount)} recorded successfully! Initial payment: ${this.formatCurrency(formData.amount)}`;
                } else if (this.isAnonymous) {
                    message = 'Anonymous donation recorded successfully!';
                } else if (this.isPledge) {
                    message = `Pledge donation of ${this.formatCurrency(formData.pledge_amount)} recorded successfully! Initial payment: ${this.formatCurrency(formData.amount)}`;
                }

                TempleCore.showToast(message, 'success');

                // Get booking ID
                const bookingId = bookingData.booking.id;
                const shouldPrint = formData.print_option === 'SINGLE_PRINT';

                // Navigate based on print option
                setTimeout(() => {
                    this.cleanup();
                    if (shouldPrint) {
                        // Redirect to print page
                        TempleRouter.navigate('donations/receipt-print', { id: bookingId });
                    } else {
                        // Redirect to list page
                        TempleRouter.navigate('donations/create-donation');
                    }
                }, 1500);
                
                // Clear pending data
                this.pendingPaymentData = null;
            } else {
                // No pending data - just navigate to list
                setTimeout(() => {
                    this.cleanup();
                    TempleRouter.navigate('donations/create-donation');
                }, 1500);
            }
        },

        // Handle failed payment
        handlePaymentFailure: function(paymentData) {
            TempleCore.showLoading(false);
            
            const errorMessage = paymentData?.message || 'Payment was cancelled or failed';
            TempleCore.showToast(errorMessage, 'error');
            
            // Reset button
            const $submitBtn = $('#btnSubmit');
            $submitBtn.prop('disabled', false).html('<i class="bi bi-check-circle"></i> Submit Donation');
            
            // Clear pending data
            this.pendingPaymentData = null;
            
            // Show error details if available
            if (paymentData?.booking_number) {
                alert(`Payment Failed\n\n` +
                    `Booking Number: ${paymentData.booking_number}\n` +
                    `Status: PAYMENT FAILED\n\n` +
                    `Please try again or contact support if the amount was deducted.`);
            }
        }
    };

})(jQuery, window);