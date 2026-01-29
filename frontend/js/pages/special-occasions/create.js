// js/pages/special-occasions/create.js
// Special Occasions Booking Module - Enhanced with Addon Services Support

(function ($, window) {
    'use strict';

    // Shared module for CSS and cleanup
    if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
            eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }

    window.SpecialOccasionsCreatePage = {
        pageId: 'occasions-create',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,

        // Data storage
        occasions: {},
        packages: [],
        timeSlots: [],
        availableDates: [],
        includedServices: [],
        paymentModes: [],
        addonServices: [], // NEW: Store addon services
        bookingSettings: {
            is_discount_enabled: false,
            is_deposit_enabled: false
        },

        // Selected values
        selectedOccasion: null,
        selectedOccasionData: null,
        selectedPackage: null,
        selectedPackageData: null,
        selectedDate: null,
        selectedSlot: null,
        selectedSlotData: null,
        selectedAddonService: null, // NEW: Selected addon service

        // Modal instance
        confirmationModal: null,
        summaryModal: null,

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            const self = this;
            window.OccasionsSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();

            // Load occasions, payment modes, settings, and addon services
            Promise.all([
                this.loadOccasions(),
                this.loadPaymentModes(),
                this.loadBookingSettings(),
                this.loadAddonServices() // NEW: Load addon services
            ]).then(function () {
                self.bindEvents();
            }).catch(function () {
                TempleCore.showToast('Failed to load required data', 'error');
            });
        },

        cleanup: function () {
            // Destroy modals
            if (this.confirmationModal) {
                this.confirmationModal.dispose();
                this.confirmationModal = null;
            }
            if (this.summaryModal) {
                this.summaryModal.dispose();
                this.summaryModal = null;
            }

            window.OccasionsSharedModule.unregisterPage(this.pageId);
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
        },

        // ========================================
        // RENDER PAGE HTML - WITH ADDON SERVICES
        // ========================================
        render: function () {
            const html = `
                <div class="special-occasions-page">
                    <!-- Page Header -->
                    <div class="occasion-header">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-calendar-event occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Temple Event Booking</h1>
                                            <p class="occasion-subtitle">特别场合预订 • Sacred Ceremonies</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnViewHistory">
                                        <i class="bi bi-clock-history"></i> View Bookings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid mt-4">
                        <div class="row justify-content-center">
                            <div class="col-xl-11 col-xxl-10">
                                
                                <!-- Step 1: Select Temple Event -->
                                <div class="occasion-card mb-4">
                                    <div class="card-header-custom">
                                        <span class="step-badge">1</span>
                                        <i class="bi bi-calendar-check"></i>
                                        <span>Select Temple Event <small class="text-light opacity-75">选择特别场合</small></span>
                                    </div>
                                    <div class="card-body-custom">
                                        <select class="form-select form-select-lg" id="occasionType">
                                            <option value="">-- Select a Temple Event --</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Occasion Info Card (Hidden initially) -->
                                <div class="occasion-info-card mb-4" id="occasionInfoCard" style="display: none;">
                                    <div class="occasion-info-content">
                                        <div class="occasion-info-icon" id="occasionIcon">
                                            <i class="bi bi-calendar-event"></i>
                                        </div>
                                        <div>
                                            <h3 class="occasion-info-title mb-0" id="occasionName"></h3>
                                            <p class="occasion-info-subtitle mb-0" id="occasionNameChinese"></p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Booking Form (Hidden initially) -->
                                <div id="bookingFormContainer" style="display: none;">
                                    <form id="bookingForm">
                                        <div class="row g-4">
                                            
                                            <!-- LEFT COLUMN -->
                                            <div class="col-lg-6">
                                                
                                                <!-- Step 2: Select Package -->
                                                <div class="occasion-card mb-4">
                                                    <div class="card-header-custom">
                                                        <span class="step-badge">2</span>
                                                        <i class="bi bi-box-seam"></i>
                                                        <span>Select Package <small class="text-light opacity-75">选择配套</small></span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <div id="packageOptionsGroup">
                                                            <p class="text-muted">Loading packages...</p>
                                                        </div>
                                                        <!-- Services Included -->
                                                        <div id="servicesIncludedSection" style="display: none;" class="mt-3 pt-3 border-top">
                                                            <label class="form-label fw-semibold text-muted small">
                                                                <i class="bi bi-check2-circle text-success"></i> Services Included:
                                                            </label>
                                                            <div id="servicesIncludedList"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Step 3: Select Date & Time -->
                                                <div class="occasion-card mb-4" id="dateTimeCard" style="display: none;">
                                                    <div class="card-header-custom">
                                                        <span class="step-badge">3</span>
                                                        <i class="bi bi-calendar3"></i>
                                                        <span>Select Date & Time <small class="text-light opacity-75">选择日期时间</small></span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <!-- Date Selection -->
                                                        <div class="mb-4">
                                                            <label class="form-label fw-semibold">
                                                                <i class="bi bi-calendar-date text-primary"></i> Event Date <span class="text-danger">*</span>
                                                            </label>
                                                            <div id="dateSelectionGroup"></div>
                                                        </div>
                                                        
                                                        <!-- Time Slot Selection -->
                                                        <div id="slotSelectionContainer" style="display: none;">
                                                            <label class="form-label fw-semibold">
                                                                <i class="bi bi-clock text-primary"></i> Time Slot <span class="text-danger">*</span>
                                                            </label>
                                                            <div id="slotSelectionGroup"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>

                                            <!-- RIGHT COLUMN -->
                                            <div class="col-lg-6">
                                                
                                                <!-- Step 4: Personal Information -->
                                                <div class="occasion-card mb-4">
                                                    <div class="card-header-custom">
                                                        <span class="step-badge">4</span>
                                                        <i class="bi bi-person-circle"></i>
                                                        <span>Devotee Information <small class="text-light opacity-75">个人资料</small></span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <div class="row g-3">
                                                            <div class="col-md-6">
                                                                <label class="form-label">Name (Chinese) <span class="text-danger">*</span></label>
                                                                <input type="text" class="form-control" id="nameChinese" placeholder="中文姓名" required>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label class="form-label">Name (English) <span class="text-danger">*</span></label>
                                                                <input type="text" class="form-control" id="nameEnglish" placeholder="English Name" required>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label class="form-label">NRIC / Passport <span class="text-danger">*</span></label>
                                                                <input type="text" class="form-control" id="nric" placeholder="e.g., 901234-12-5678" required>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label class="form-label">Contact No. <span class="text-danger">*</span></label>
                                                                <input type="tel" class="form-control" id="contactNo" placeholder="e.g., 012-3456789" required>
                                                            </div>
                                                            <div class="col-12">
                                                                <label class="form-label">Email <span class="text-danger">*</span></label>
                                                                <input type="email" class="form-control" id="email" placeholder="email@example.com" required>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Step 5: Payment & Additional -->
                                                <div class="occasion-card mb-4">
                                                    <div class="card-header-custom">
                                                        <span class="step-badge">5</span>
                                                        <i class="bi bi-credit-card"></i>
                                                        <span>Payment & Additional <small class="text-light opacity-75">付款和附加</small></span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <!-- Payment Method -->
                                                        <label class="form-label fw-semibold">Payment Method <span class="text-danger">*</span></label>
                                                        <div class="row g-2 mb-3" id="paymentMethodsGrid">
                                                            <div class="col-12 text-center py-3">
                                                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                                                    <span class="visually-hidden">Loading payment methods...</span>
                                                                </div>
                                                                <p class="mt-2 text-muted small">Loading payment methods...</p>
                                                            </div>
                                                        </div>
                                                        <div class="text-danger small mt-2" id="paymentError" style="display: none;">
                                                            <i class="bi bi-exclamation-circle"></i> Please select a payment method
                                                        </div>
                                                        
                                                        <!-- Add-on Service (NEW) -->
                                                        <div class="mt-3 pt-3 border-top">
                                                            <label class="form-label">
                                                                <i class="bi bi-puzzle text-info"></i> Add-on Service 
                                                                <small class="text-muted">(Optional)</small>
                                                            </label>
                                                            <select class="form-select" id="addonServiceSelect">
                                                                <option value="">-- No Add-on Service --</option>
                                                            </select>
                                                            <small class="text-muted d-block mt-1">Select an optional add-on service</small>
                                                        </div>
                                                        
                                                        <!-- Discount Field (conditional) -->
                                                        <div id="discountFieldContainer" style="display: none;" class="mt-3">
                                                            <label class="form-label">
                                                                <i class="bi bi-tag text-success"></i> Discount Amount 
                                                                <small class="text-muted">(Optional)</small>
                                                            </label>
                                                            <div class="input-group">
                                                                <span class="input-group-text">RM</span>
                                                                <input type="number" class="form-control" id="discountAmount" 
                                                                       placeholder="0.00" min="0" step="0.01">
                                                            </div>
                                                            <small class="text-muted d-block mt-1">Enter discount amount to be deducted</small>
                                                        </div>
                                                        
                                                        <!-- Deposit Field (conditional) -->
                                                        <div id="depositFieldContainer" style="display: none;" class="mt-3">
                                                            <label class="form-label">
                                                                <i class="bi bi-cash-coin text-info"></i> Deposit Amount 
                                                                <small class="text-muted">(Optional)</small>
                                                            </label>
                                                            <div class="input-group">
                                                                <span class="input-group-text">RM</span>
                                                                <input type="number" class="form-control" id="depositAmount" 
                                                                       placeholder="0.00" min="0" step="0.01">
                                                            </div>
                                                            <small class="text-muted d-block mt-1">Enter partial payment amount (leave empty for full payment)</small>
                                                        </div>
                                                        
                                                        <!-- Remarks -->
                                                        <div class="mt-3 pt-3 border-top">
                                                            <label class="form-label">Remarks <small class="text-muted">(Optional)</small></label>
                                                            <textarea class="form-control" id="remark" rows="2" placeholder="Any special requests..."></textarea>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>

                                        <!-- Booking Summary Preview -->
                                        <div class="occasion-card mb-4" id="summaryPreviewCard" style="display: none;">
                                            <div class="card-header-custom bg-success">
                                                <span class="step-badge">6</span>
                                                <i class="bi bi-clipboard-check"></i>
                                                <span>Booking Summary <small class="text-light opacity-75">预订摘要</small></span>
                                            </div>
                                            <div class="card-body-custom">
                                                <div id="summaryPreviewContent"></div>
                                            </div>
                                        </div>

                                        <!-- Submit Buttons -->
                                        <div class="text-center mt-4 mb-5">
                                            <button type="button" class="btn btn-lg btn-outline-secondary me-3" id="btnReset">
                                                <i class="bi bi-arrow-counterclockwise"></i> Reset
                                            </button>
                                            <button type="button" class="btn btn-lg btn-warning me-3" id="btnPreview">
                                                <i class="bi bi-eye"></i> Preview Booking
                                            </button>
                                            <button type="submit" class="btn btn-lg btn-primary btn-submit-custom" id="btnSubmit" disabled>
                                                <i class="bi bi-check-circle"></i> Confirm & Submit
                                            </button>
                                        </div>
                                    </form>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                ${this.renderConfirmationModal()}
                
                <!-- Summary Preview Modal -->
                ${this.renderSummaryModal()}
                
                <!-- Additional CSS -->
                <style>
                    /* Override AOS opacity issues */
                    .special-occasions-page [data-aos] {
                        opacity: 1 !important;
                        transform: none !important;
                    }
                    .special-occasions-page .occasion-card,
                    .special-occasions-page .occasion-header,
                    .special-occasions-page .occasion-info-card {
                        opacity: 1 !important;
                        transform: none !important;
                    }
                    .step-badge {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 28px;
                        height: 28px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 50%;
                        font-weight: bold;
                        font-size: 0.9rem;
                        margin-right: 10px;
                    }
                    .success-checkmark {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #28a745, #20c997);
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 3rem;
                    }
                    
                    /* FIX: Icon color in occasion info card */
                    .occasion-info-icon {
                        color: var(--primary-color, #b91c1c) !important;
                    }
                    .occasion-info-icon i {
                        color: var(--primary-color, #b91c1c) !important;
                        font-size: 2.5rem;
                    }
                    
                    /* Package option styling with images */
                    .package-option {
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .package-option:hover {
                        background-color: #f8f9fa;
                    }
                    .package-option .form-check-input:checked ~ * {
                        font-weight: 600;
                    }
                    .list-group-item.package-option input:checked + .package-content + span,
                    .list-group-item.package-option input:checked + div + span {
                        background-color: #198754 !important;
                        color: white !important;
                    }
                    
                    /* Package with image styling */
                    .package-with-image {
                        border: 2px solid #e9ecef;
                        border-radius: 12px;
                        overflow: hidden;
                        transition: all 0.3s ease;
                        cursor: pointer;
                        background: white;
                    }
                    .package-with-image:hover {
                        border-color: #b91c1c;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        transform: translateY(-2px);
                    }
                    .package-with-image.selected {
                        border-color: #198754;
                        box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.2);
                    }
                    .package-image-container {
                        height: 120px;
                        overflow: hidden;
                        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .package-image-container img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .package-image-placeholder {
                        font-size: 2.5rem;
                        color: #adb5bd;
                    }
                    .package-details {
                        padding: 15px;
                    }
                    .package-name {
                        font-weight: 600;
                        font-size: 1rem;
                        color: #333;
                        margin-bottom: 3px;
                    }
                    .package-name-secondary {
                        font-size: 0.85rem;
                        color: #6c757d;
                        margin-bottom: 8px;
                    }
                    .package-price {
                        font-size: 1.1rem;
                        font-weight: 700;
                        color: #198754;
                    }
                    .package-select-indicator {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: 24px;
                        height: 24px;
                        border: 2px solid #dee2e6;
                        border-radius: 50%;
                        background: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    }
                    .package-with-image.selected .package-select-indicator {
                        border-color: #198754;
                        background: #198754;
                        color: white;
                    }
                    
                    /* Payment Method Styling */
                    .payment-option {
                        height: 100%;
                    }
                    .payment-option label {
                        transition: all 0.3s ease;
                        min-height: 110px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        border: 2px solid #dee2e6;
                        border-radius: 8px;
                        background: white;
                        padding: 12px;
                    }
                    
                    .payment-option label:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        border-color: #adb5bd;
                    }
                    
                    .payment-option .btn-check:checked + label {
                        background-color: #198754;
                        border-color: #198754;
                        color: white;
                        box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.2);
                    }
                    
                    .payment-option label img {
                        filter: grayscale(0);
                        transition: filter 0.3s ease;
                        max-width: 100%;
                        height: auto;
                    }
                    
                    .payment-option .btn-check:checked + label img {
                        filter: brightness(0) invert(1);
                    }
                    
                    .payment-option label i {
                        transition: color 0.3s ease;
                    }
                    
                    .payment-option .btn-check:checked + label i {
                        color: white;
                    }
                    
                    .payment-option label .small {
                        margin-top: 4px;
                        font-weight: 500;
                    }
                    
                    .btn-check:checked + .btn-outline-primary,
                    .btn-check:checked + .btn-outline-info,
                    .btn-check:checked + .btn-outline-secondary {
                        color: #fff;
                    }
                </style>
            `;

            $('#page-container').html(html);
        },

        // ========================================
        // RENDER HELPERS
        // ========================================
        renderPaymentMethods: function () {
            if (!this.paymentModes || this.paymentModes.length === 0) {
                return '<div class="col-12"><p class="text-warning">No payment methods available</p></div>';
            }

            let html = '';
            this.paymentModes.forEach((mode, index) => {
                // Get icon display data
                const iconDisplay = mode.icon_display_url_data || { 
                    type: 'bootstrap', 
                    value: 'bi-currency-dollar' 
                };
                
                // Render icon or image
                const iconHtml = iconDisplay.type === 'bootstrap'
                    ? `<i class="bi ${iconDisplay.value} d-block mb-2" style="font-size: 1.8rem;"></i>`
                    : `<img src="${iconDisplay.value}" alt="${mode.name}" 
                            style="width: ${iconDisplay.width || 62}px; 
                                   height: ${iconDisplay.height || 28}px; 
                                   object-fit: contain; 
                                   display: block; 
                                   margin: 0 auto 8px;">`;

                html += `
                    <div class="col-6 col-md-4">
                        <div class="payment-option">
                            <input type="radio" class="btn-check" name="paymentMethod" 
                                   id="payment-${mode.id}" value="${mode.id}" 
                                   ${index === 0 ? 'checked' : ''} autocomplete="off">
                            <label class="btn btn-outline-secondary w-100" for="payment-${mode.id}">
                                ${iconHtml}
                                <span class="d-block small fw-semibold">${mode.name}</span>
                                ${mode.name_secondary ? `<span class="d-block small text-muted">${mode.name_secondary}</span>` : ''}
                            </label>
                        </div>
                    </div>
                `;
            });
            return html;
        },

        renderConfirmationModal: function () {
            return `
                <div class="modal fade" id="confirmationModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header bg-success text-white border-0">
                                <h5 class="modal-title">
                                    <i class="bi bi-check-circle-fill me-2"></i>Booking Confirmed!
                                </h5>
                            </div>
                            <div class="modal-body text-center py-4">
                                <div class="mb-4">
                                    <div class="success-checkmark">
                                        <i class="bi bi-check-lg"></i>
                                    </div>
                                </div>
                                <h4 class="mb-3" id="confirmBookingCode"></h4>
                                <div id="confirmSummary" class="text-start bg-light rounded p-3"></div>
                            </div>
                            <div class="modal-footer border-0 justify-content-center">
                                <button type="button" class="btn btn-outline-secondary" id="btnPrintReceipt">
                                    <i class="bi bi-printer me-1"></i> Print Receipt
                                </button>
                                <button type="button" class="btn btn-success" id="btnNewBooking">
                                    <i class="bi bi-plus-circle me-1"></i> New Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderSummaryModal: function () {
            return `
                <div class="modal fade" id="summaryModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header bg-warning border-0">
                                <h5 class="modal-title">
                                    <i class="bi bi-clipboard-check me-2"></i>Review Your Booking
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body py-4">
                                <div id="summaryModalContent"></div>
                            </div>
                            <div class="modal-footer border-0">
                                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-pencil me-1"></i> Edit
                                </button>
                                <button type="button" class="btn btn-success btn-lg" id="btnConfirmSubmit">
                                    <i class="bi bi-check-circle me-1"></i> Confirm & Submit Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // LOAD DATA
        // ========================================
        loadOccasions: function () {
            const self = this;
            const deferred = $.Deferred();

            $('#occasionType').html('<option value="">Loading...</option>');

            TempleAPI.get('/special-occasions', { status: 'active' })
                .done(function (response) {
                    if (response.success && response.data && response.data.length > 0) {
                        self.occasions = {};

                        response.data.forEach(function (occasion) {
                            const key = 'occasion-' + occasion.id;
                            self.occasions[key] = {
                                id: occasion.id,
                                name: occasion.occasion_name_primary,
                                nameSecondary: occasion.occasion_name_secondary || '',
                                status: occasion.status
                            };
                        });

                        let optionsHtml = '<option value="">-- Select a Temple Event --</option>';
                        for (const [key, occ] of Object.entries(self.occasions)) {
                            const displayName = occ.nameSecondary
                                ? `${occ.name} (${occ.nameSecondary})`
                                : occ.name;
                            optionsHtml += `<option value="${key}">${displayName}</option>`;
                        }
                        $('#occasionType').html(optionsHtml);

                        deferred.resolve();
                    } else {
                        $('#occasionType').html('<option value="">No events available</option>');
                        deferred.reject();
                    }
                })
                .fail(function () {
                    $('#occasionType').html('<option value="">Failed to load</option>');
                    deferred.reject();
                });

            return deferred.promise();
        },

        loadPaymentModes: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/masters/payment-modes/active')
                .done(function (response) {
                    if (response.success && response.data && response.data.length > 0) {
                        self.paymentModes = response.data;
                        // Render payment methods after loading
                        self.renderPaymentMethodsToDOM();
                        deferred.resolve();
                    } else {
                        self.paymentModes = [];
                        $('#paymentMethodsGrid').html('<div class="col-12"><p class="text-warning">No payment methods available</p></div>');
                        deferred.reject();
                    }
                })
                .fail(function () {
                    self.paymentModes = [];
                    $('#paymentMethodsGrid').html('<div class="col-12"><p class="text-danger">Failed to load payment methods</p></div>');
                    deferred.reject();
                });

            return deferred.promise();
        },

        loadBookingSettings: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/special-occasions/bookings/settings')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.bookingSettings = response.data;
                        
                        // Show/hide discount and deposit fields based on settings
                        if (self.bookingSettings.is_discount_enabled) {
                            $('#discountFieldContainer').show();
                        }
                        if (self.bookingSettings.is_deposit_enabled) {
                            $('#depositFieldContainer').show();
                        }
                        
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                })
                .fail(function () {
                    console.warn('Failed to load booking settings - using defaults');
                    deferred.resolve(); // Don't fail the entire initialization
                });

            return deferred.promise();
        },

        // NEW: Load active addon services
        loadAddonServices: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/occasion-services-master/active-addons')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.addonServices = response.data;
                        self.renderAddonServicesDropdown();
                        deferred.resolve();
                    } else {
                        self.addonServices = [];
                        deferred.resolve();
                    }
                })
                .fail(function () {
                    console.warn('Failed to load addon services');
                    self.addonServices = [];
                    deferred.resolve();
                });

            return deferred.promise();
        },

        // NEW: Render addon services dropdown
        renderAddonServicesDropdown: function () {
            let html = '<option value="">-- No Add-on Service --</option>';
            
            if (this.addonServices && this.addonServices.length > 0) {
                this.addonServices.forEach(service => {
                    const amount = parseFloat(service.amount || 0).toFixed(2);
                    const displayName = service.name_secondary 
                        ? `${service.name} (${service.name_secondary}) - RM ${amount}`
                        : `${service.name} - RM ${amount}`;
                    
                    html += `<option value="${service.id}" data-amount="${amount}">${displayName}</option>`;
                });
            }
            
            $('#addonServiceSelect').html(html);
        },

        renderPaymentMethodsToDOM: function() {
            const html = this.renderPaymentMethods();
            $('#paymentMethodsGrid').html(html);
        },

        loadPackages: function (occasionId) {
            const self = this;

            $('#packageOptionsGroup').html('<p class="text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading packages...</p>');

            TempleAPI.get(`/special-occasions/${occasionId}`)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.packages = response.data.packages || [];
                        self.renderPackageOptions();
                    }
                })
                .fail(function () {
                    $('#packageOptionsGroup').html('<p class="text-danger">Failed to load packages</p>');
                });
        },

        // ========================================
        // RENDER PACKAGE OPTIONS WITH IMAGES
        // ========================================
        renderPackageOptions: function () {
            const self = this;
            const $container = $('#packageOptionsGroup');
            $container.empty();

            if (this.packages.length === 0) {
                $container.html('<p class="text-muted">No packages available</p>');
                return;
            }

            // Check if any package has an image
            const hasAnyImage = this.packages.some(pkg => pkg.image_url || pkg.image_path);

            if (hasAnyImage) {
                // Render as cards with images
                let html = '<div class="row g-3">';
                this.packages.forEach((pkg, index) => {
                    const price = parseFloat(pkg.amount || 0).toFixed(2);
                    const secondaryName = pkg.name_secondary || '';
                    
                    let imageUrl = null;
                    if (pkg.image_url) {
                        imageUrl = pkg.image_url;
                    } else if (pkg.image_path) {
                        imageUrl = `/storage/${pkg.image_path}`;
                    }

                    html += `
                        <div class="col-md-6 col-lg-4">
                            <div class="package-with-image position-relative" data-package-id="${pkg.id}" data-index="${index}">
                                <input type="radio" class="d-none" name="packageOption" 
                                       value="${pkg.id}" data-index="${index}" required>
                                <div class="package-select-indicator">
                                    <i class="bi bi-check"></i>
                                </div>
                                <div class="package-image-container">
                                    ${imageUrl 
                                        ? `<img src="${imageUrl}" alt="${pkg.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                           <i class="bi bi-box-seam package-image-placeholder" style="display:none;"></i>` 
                                        : '<i class="bi bi-box-seam package-image-placeholder"></i>'
                                    }
                                </div>
                                <div class="package-details">
                                    <div class="package-name">${pkg.name}</div>
                                    ${secondaryName ? `<div class="package-name-secondary">${secondaryName}</div>` : ''}
                                    <div class="package-price">RM ${price}</div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                $container.html(html);

                // Bind click events for card-style packages
                $container.find('.package-with-image').on('click', function() {
                    const $this = $(this);
                    const packageId = $this.data('package-id');
                    const packageIndex = $this.data('index');
                    
                    $this.find('input[name="packageOption"]').prop('checked', true);
                    $container.find('.package-with-image').removeClass('selected');
                    $this.addClass('selected');
                    
                    self.selectedPackage = packageId;
                    self.selectedPackageData = self.packages[packageIndex];
                    self.loadDates(packageId);
                    self.updateSummaryPreview();
                });
            } else {
                // Render as list (original style)
                let html = '<div class="list-group">';
                this.packages.forEach((pkg, index) => {
                    const price = parseFloat(pkg.amount || 0).toFixed(2);
                    const secondaryName = pkg.name_secondary ? `<small class="text-muted d-block">${pkg.name_secondary}</small>` : '';

                    html += `
                        <label class="list-group-item list-group-item-action d-flex justify-content-between align-items-center package-option">
                            <div class="d-flex align-items-center">
                                <input class="form-check-input me-3" type="radio" name="packageOption" 
                                       value="${pkg.id}" data-index="${index}" required>
                                <div>
                                    <div class="fw-semibold">${pkg.name}</div>
                                    ${secondaryName}
                                </div>
                            </div>
                            <span class="badge bg-warning text-dark fs-6">RM ${price}</span>
                        </label>
                    `;
                });
                html += '</div>';

                $container.html(html);
            }
        },

        loadDates: function (packageId) {
            const self = this;
            const $container = $('#dateSelectionGroup');

            $container.html('<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading dates...</div>');
            $('#dateTimeCard').slideDown();
            $('#slotSelectionContainer').hide();
            
            // Clear previous date and slot selections
            self.selectedDate = null;
            self.selectedSlot = null;
            self.selectedSlotData = null;

            TempleAPI.get(`/special-occasions/bookings/dates/${packageId}`)
                .done(function (response) {
                    if (response.success) {
                        self.renderDateOptions(response.date_type, response.data);
                    }
                })
                .fail(function () {
                    $container.html('<p class="text-danger">Failed to load dates</p>');
                });
        },

        renderDateOptions: function (dateType, dates) {
            const $container = $('#dateSelectionGroup');
            $container.empty();

            if (dateType === 'date_range' && dates.type === 'range') {
                const minDate = dates.start || new Date().toISOString().split('T')[0];
                const maxDate = dates.end || '';

                console.log('Rendering date picker:', { minDate, maxDate }); // Debug log

                $container.html(`
                    <input type="date" class="form-control form-control-lg" id="eventDate" 
                           min="${minDate}" max="${maxDate}" required>
                    <small class="text-muted mt-1 d-block">
                        Available: ${this.formatDate(minDate)} to ${this.formatDate(maxDate)}
                    </small>
                `);
            } else {
                if (!dates || dates.length === 0) {
                    $container.html('<p class="text-warning"><i class="bi bi-exclamation-triangle"></i> No dates available for this package</p>');
                    return;
                }

                console.log('Rendering date radio buttons:', dates.length); // Debug log

                let html = '<div class="row g-2">';
                dates.forEach((dateItem, index) => {
                    const dateStr = dateItem.date;
                    const desc = dateItem.description ? `<small class="d-block text-muted">${dateItem.description}</small>` : '';

                    html += `
                        <div class="col-6 col-md-4">
                            <input type="radio" class="btn-check" name="eventDate" id="date-${index}" value="${dateStr}" autocomplete="off">
                            <label class="btn btn-outline-primary w-100 py-2" for="date-${index}">
                                <i class="bi bi-calendar3 d-block mb-1"></i>
                                ${this.formatDate(dateStr)}
                                ${desc}
                            </label>
                        </div>
                    `;
                });
                html += '</div>';

                $container.html(html);
            }
        },

        loadTimeSlots: function (packageId, eventDate) {
            const self = this;
            const $container = $('#slotSelectionGroup');

            console.log('loadTimeSlots called:', { packageId, eventDate }); // Debug log

            $container.html('<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading time slots...</div>');
            $('#slotSelectionContainer').slideDown();

            TempleAPI.get('/special-occasions/bookings/slots', {
                option_id: packageId,
                event_date: eventDate
            })
                .done(function (response) {
                    console.log('Slots loaded:', response); // Debug log
                    if (response.success) {
                        self.timeSlots = response.data || [];
                        self.renderTimeSlots(response.package_mode);
                    }
                })
                .fail(function (xhr, status, error) {
                    console.error('Failed to load slots:', { xhr, status, error }); // Debug log
                    $container.html('<p class="text-danger">Failed to load time slots</p>');
                });
        },

        renderTimeSlots: function (packageMode) {
            const $container = $('#slotSelectionGroup');
            $container.empty();

            if (this.timeSlots.length === 0) {
                $container.html('<p class="text-muted">No time slots required for this package</p>');
                this.selectedSlot = null;
                return;
            }

            let html = '<div class="row g-2">';
            this.timeSlots.forEach((slot) => {
                const isAvailable = slot.is_available;
                const availText = packageMode === 'multiple'
                    ? `${slot.available} slots left`
                    : (isAvailable ? 'Available' : 'Booked');
                const disabledAttr = isAvailable ? '' : 'disabled';
                const secondaryName = slot.slot_name_secondary ? ` (${slot.slot_name_secondary})` : '';

                html += `
                    <div class="col-6">
                        <input type="radio" class="btn-check" name="timeSlot" id="slot-${slot.id}" 
                               value="${slot.id}" ${disabledAttr} autocomplete="off">
                        <label class="btn btn-outline-info w-100 py-3 ${isAvailable ? '' : 'disabled'}" for="slot-${slot.id}">
                            <i class="bi bi-clock d-block mb-1" style="font-size: 1.3rem;"></i>
                            <span class="fw-semibold">${slot.slot_name}${secondaryName}</span>
                            <small class="d-block">${slot.start_time} - ${slot.end_time}</small>
                            <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'} mt-1">${availText}</span>
                        </label>
                    </div>
                `;
            });
            html += '</div>';

            $container.html(html);
        },

        // ========================================
        // EVENT BINDINGS
        // ========================================
        bindEvents: function () {
            const self = this;

            // Occasion selection
            $('#occasionType').on('change.' + this.eventNamespace, function () {
                const selectedValue = $(this).val();
                if (selectedValue) {
                    self.selectedOccasion = selectedValue;
                    self.selectedOccasionData = self.occasions[selectedValue];
                    self.onOccasionSelected();
                } else {
                    self.hideForm();
                }
            });

            // Package selection (for list-style without images)
            $(document).on('change.' + this.eventNamespace, 'input[name="packageOption"]', function () {
                const packageId = $(this).val();
                const packageIndex = $(this).data('index');
                self.selectedPackage = packageId;
                self.selectedPackageData = self.packages[packageIndex];
                self.loadDates(packageId);
                self.updateSummaryPreview();
            });

            // Date selection (radio buttons)
            $(document).on('change.' + this.eventNamespace, 'input[name="eventDate"]', function () {
                self.selectedDate = $(this).val();
                console.log('Date radio changed:', self.selectedDate); // Debug log
                if (self.selectedPackage && self.selectedDate) {
                    self.loadTimeSlots(self.selectedPackage, self.selectedDate);
                }
                self.updateSummaryPreview();
            });

            // Date selection (date picker)
            $(document).on('change.' + this.eventNamespace, '#eventDate', function () {
                self.selectedDate = $(this).val();
                console.log('Date picker changed:', self.selectedDate); // Debug log
                if (self.selectedPackage && self.selectedDate) {
                    self.loadTimeSlots(self.selectedPackage, self.selectedDate);
                }
                self.updateSummaryPreview();
            });

            // Time slot selection
            $(document).on('change.' + this.eventNamespace, 'input[name="timeSlot"]', function () {
                self.selectedSlot = $(this).val();
                self.selectedSlotData = self.timeSlots.find(s => s.id == self.selectedSlot);
                self.updateSummaryPreview();
                self.checkFormComplete();
            });

            // Payment method selection
            $(document).on('change.' + this.eventNamespace, 'input[name="paymentMethod"]', function () {
                $('#paymentError').hide();
                self.updateSummaryPreview();
                self.checkFormComplete();
            });

            // NEW: Addon service selection
            $(document).on('change.' + this.eventNamespace, '#addonServiceSelect', function () {
                const selectedId = $(this).val();
                if (selectedId) {
                    const selectedService = self.addonServices.find(s => s.id == selectedId);
                    self.selectedAddonService = selectedService;
                } else {
                    self.selectedAddonService = null;
                }
                self.updateSummaryPreview();
                self.checkFormComplete();
            });

            // Personal info changes
            $(document).on('input.' + this.eventNamespace, '#nameChinese, #nameEnglish, #nric, #email, #contactNo', function () {
                self.updateSummaryPreview();
                self.checkFormComplete();
            });

            // Discount and Deposit changes with validation
            $(document).on('input.' + this.eventNamespace, '#discountAmount', function () {
                const totals = self.calculateTotals();
                let discountValue = parseFloat($(this).val() || 0);
                
                // Auto-correct if discount exceeds subtotal
                if (discountValue > totals.subtotal) {
                    $(this).val(totals.subtotal.toFixed(2));
                    TempleCore.showToast('Discount cannot exceed subtotal amount', 'warning');
                }
                
                self.updateSummaryPreview();
                self.checkFormComplete();
            });
            
            $(document).on('input.' + this.eventNamespace, '#depositAmount', function () {
                const totals = self.calculateTotals();
                let depositValue = parseFloat($(this).val() || 0);
                
                // Auto-correct if deposit exceeds total
                if (depositValue > totals.total) {
                    $(this).val(totals.total.toFixed(2));
                    TempleCore.showToast('Deposit cannot exceed total amount', 'warning');
                }
                
                self.updateSummaryPreview();
                self.checkFormComplete();
            });

            // Preview button
            $('#btnPreview').on('click.' + this.eventNamespace, function () {
                if (self.validateForm(true)) {
                    self.showSummaryModal();
                }
            });

            // Confirm submit from modal
            $(document).on('click.' + this.eventNamespace, '#btnConfirmSubmit', function () {
                if (self.summaryModal) {
                    self.summaryModal.hide();
                }
                self.submitForm();
            });

            // Form submit (direct)
            $('#bookingForm').on('submit.' + this.eventNamespace, function (e) {
                e.preventDefault();
                if (self.validateForm(false)) {
                    self.submitForm();
                }
            });

            // Reset button
            $('#btnReset').on('click.' + this.eventNamespace, function () {
                Swal.fire({
                    title: 'Reset Form?',
                    text: 'All entered data will be cleared.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Yes, reset'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.resetForm();
                    }
                });
            });

            // View history
            $('#btnViewHistory').on('click.' + this.eventNamespace, function () {
                TempleRouter.navigate('special-occasions');
            });

            // Print receipt
            $(document).on('click.' + this.eventNamespace, '#btnPrintReceipt', function () {
                const bookingId = $(this).data('booking-id');
                if (bookingId) {
                    if (self.confirmationModal) {
                        self.confirmationModal.hide();
                    }
                    setTimeout(() => {
                        TempleRouter.navigate('special-occasions/print', { id: bookingId });
                    }, 300);
                }
            });

            // New booking button
            $(document).on('click.' + this.eventNamespace, '#btnNewBooking', function () {
                if (self.confirmationModal) {
                    self.confirmationModal.hide();
                }
                setTimeout(() => {
                    self.resetForm();
                }, 300);
            });
        },

        // ========================================
        // HANDLERS
        // ========================================
        onOccasionSelected: function () {
            const occasion = this.selectedOccasionData;
            const $infoCard = $('#occasionInfoCard');
            const $formContainer = $('#bookingFormContainer');

            $('#occasionName').text(occasion.name);
            $('#occasionNameChinese').text(occasion.nameSecondary || '');

            $infoCard.show();
            this.loadPackages(occasion.id);

            // Reset selections
            this.selectedPackage = null;
            this.selectedPackageData = null;
            this.selectedDate = null;
            this.selectedSlot = null;
            this.selectedSlotData = null;
            this.selectedAddonService = null;
            $('#addonServiceSelect').val('');
            $('#dateTimeCard').hide();
            $('#slotSelectionContainer').hide();
            $('#summaryPreviewCard').hide();
            $('#btnSubmit').prop('disabled', true);

            $formContainer.show();

            setTimeout(() => {
                $('html, body').animate({
                    scrollTop: $formContainer.offset().top - 100
                }, 600);
            }, 100);
        },

        checkFormComplete: function () {
            const hasPackage = this.selectedPackage;
            const hasDate = this.selectedDate;
            const hasSlot = this.timeSlots.length === 0 || this.selectedSlot;
            const hasPayment = $('input[name="paymentMethod"]:checked').length > 0;
            const hasName = $('#nameChinese').val().trim() && $('#nameEnglish').val().trim();
            const hasContact = $('#contactNo').val().trim() && $('#email').val().trim() && $('#nric').val().trim();

            const isComplete = hasPackage && hasDate && hasSlot && hasPayment && hasName && hasContact;

            $('#btnSubmit').prop('disabled', !isComplete);

            if (isComplete) {
                $('#summaryPreviewCard').slideDown();
            }
        },

        // UPDATED: Calculate totals with addon service
        calculateTotals: function() {
            const pkg = this.selectedPackageData;
            if (!pkg) return { subtotal: 0, addonAmount: 0, discount: 0, total: 0, deposit: 0, balance: 0 };

            const packageAmount = parseFloat(pkg.amount || 0);
            const addonAmount = this.selectedAddonService ? parseFloat(this.selectedAddonService.amount || 0) : 0;
            const subtotal = packageAmount + addonAmount;
            
            let discountAmount = parseFloat($('#discountAmount').val() || 0);
            
            // Prevent discount from exceeding subtotal
            if (discountAmount > subtotal) {
                discountAmount = subtotal;
                $('#discountAmount').val(discountAmount.toFixed(2));
            }
            
            const total = Math.max(0, subtotal - discountAmount);
            let depositAmount = parseFloat($('#depositAmount').val() || 0);
            
            // Prevent deposit from exceeding total
            if (depositAmount > total) {
                depositAmount = total;
                $('#depositAmount').val(depositAmount.toFixed(2));
            }
            
            const balance = Math.max(0, total - depositAmount);

            return {
                packageAmount: packageAmount,
                addonAmount: addonAmount,
                subtotal: subtotal,
                discount: discountAmount,
                total: total,
                deposit: depositAmount,
                balance: balance
            };
        },

        // UPDATED: Update summary preview with addon service
        updateSummaryPreview: function () {
            const pkg = this.selectedPackageData;
            const slot = this.selectedSlotData;
            const paymentModeId = $('input[name="paymentMethod"]:checked').val();
            
            const selectedPaymentMode = this.paymentModes.find(pm => pm.id == paymentModeId);
            const paymentLabel = selectedPaymentMode ? selectedPaymentMode.name : '-';

            if (!pkg) return;

            const totals = this.calculateTotals();
            const slotInfo = slot ? `${slot.slot_name} (${slot.start_time} - ${slot.end_time})` : 'Not required';

            let amountSection = `
                <tr><td class="text-muted">Package:</td><td>RM ${totals.packageAmount.toFixed(2)}</td></tr>
            `;

            // Show addon service if selected
            if (this.selectedAddonService) {
                const addonDisplay = this.selectedAddonService.name_secondary 
                    ? `${this.selectedAddonService.name} (${this.selectedAddonService.name_secondary})`
                    : this.selectedAddonService.name;
                amountSection += `
                    <tr><td class="text-muted">Add-on Service:</td><td class="text-info">RM ${totals.addonAmount.toFixed(2)}</td></tr>
                    <tr><td colspan="2" class="small text-muted ps-4">└ ${addonDisplay}</td></tr>
                `;
            }

            amountSection += `
                <tr><td class="text-muted">Subtotal:</td><td class="fw-semibold">RM ${totals.subtotal.toFixed(2)}</td></tr>
            `;

            if (totals.discount > 0) {
                amountSection += `
                    <tr><td class="text-muted">Discount:</td><td class="text-danger">- RM ${totals.discount.toFixed(2)}</td></tr>
                `;
            }

            amountSection += `
                <tr><td class="text-muted">Total:</td><td class="text-success fw-bold">RM ${totals.total.toFixed(2)}</td></tr>
            `;

            if (totals.deposit > 0) {
                amountSection += `
                    <tr><td class="text-muted">Deposit:</td><td class="text-info">RM ${totals.deposit.toFixed(2)}</td></tr>
                    <tr><td class="text-muted">Balance Due:</td><td class="text-warning fw-bold">RM ${totals.balance.toFixed(2)}</td></tr>
                `;
            }

            const html = `
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless mb-0">
                            <tr><td class="text-muted" width="40%">Event:</td><td class="fw-semibold">${this.selectedOccasionData?.name || '-'}</td></tr>
                            <tr><td class="text-muted">Package:</td><td>${pkg.name}</td></tr>
                            <tr><td class="text-muted">Date:</td><td>${this.formatDate(this.selectedDate) || '-'}</td></tr>
                            <tr><td class="text-muted">Time Slot:</td><td>${slotInfo}</td></tr>
                            ${amountSection}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless mb-0">
                            <tr><td class="text-muted" width="40%">Name:</td><td>${$('#nameChinese').val() || '-'} / ${$('#nameEnglish').val() || '-'}</td></tr>
                            <tr><td class="text-muted">NRIC:</td><td>${$('#nric').val() || '-'}</td></tr>
                            <tr><td class="text-muted">Contact:</td><td>${$('#contactNo').val() || '-'}</td></tr>
                            <tr><td class="text-muted">Email:</td><td>${$('#email').val() || '-'}</td></tr>
                            <tr><td class="text-muted">Payment:</td><td>${paymentLabel}</td></tr>
                        </table>
                    </div>
                </div>
            `;

            $('#summaryPreviewContent').html(html);
        },

        showSummaryModal: function () {
            this.updateSummaryPreview();
            $('#summaryModalContent').html($('#summaryPreviewContent').html());

            if (!this.summaryModal) {
                this.summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));
            }
            this.summaryModal.show();
        },

        // ========================================
        // FORM VALIDATION
        // ========================================
        validateForm: function (showToast = true) {
            let isValid = true;
            const errors = [];

            if (!this.selectedPackage) {
                errors.push('Please select a package');
                isValid = false;
            }

            if (!this.selectedDate) {
                errors.push('Please select a date');
                isValid = false;
            }

            if (this.timeSlots.length > 0 && !this.selectedSlot) {
                errors.push('Please select a time slot');
                isValid = false;
            }

            if (!$('input[name="paymentMethod"]:checked').length) {
                $('#paymentError').show();
                errors.push('Please select a payment method');
                isValid = false;
            }

            // Validate discount and deposit amounts
            const totals = this.calculateTotals();
            
            if (totals.discount > totals.subtotal) {
                errors.push('Discount cannot exceed subtotal amount');
                isValid = false;
            }

            if (totals.deposit > totals.total) {
                errors.push('Deposit cannot exceed total amount');
                isValid = false;
            }

            const form = document.getElementById('bookingForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                errors.push('Please fill in all required fields');
                isValid = false;
            }

            if (!isValid && showToast && errors.length > 0) {
                TempleCore.showToast(errors[0], 'error');
            }

            return isValid;
        },

        // ========================================
        // SUBMIT FORM - UPDATED WITH ADDON SERVICE
        // ========================================
        submitForm: function () {
            const self = this;
            const $submitBtn = $('#btnSubmit, #btnConfirmSubmit');
            const originalText = $submitBtn.html();

            const paymentModeId = $('input[name="paymentMethod"]:checked').val();
            const discountAmount = parseFloat($('#discountAmount').val() || 0);
            const depositAmount = parseFloat($('#depositAmount').val() || 0);

            const apiData = {
                special_occasion_id: this.selectedOccasionData.id,
                option_id: parseInt(this.selectedPackage),
                slot_id: this.selectedSlot ? parseInt(this.selectedSlot) : null,
                event_date: this.selectedDate,
                name_chinese: $('#nameChinese').val().trim(),
                name_english: $('#nameEnglish').val().trim(),
                nric: $('#nric').val().trim(),
                email: $('#email').val().trim(),
                contact_no: $('#contactNo').val().trim(),
                payment_methods: paymentModeId,
                remark: $('#remark').val().trim() || null
            };

            // Add addon service if selected
            if (this.selectedAddonService) {
                apiData.addon_service_id = parseInt(this.selectedAddonService.id);
            }

            // Add optional fields only if they have values
            if (discountAmount > 0) {
                apiData.discount_amount = discountAmount;
            }
            if (depositAmount > 0) {
                apiData.deposit_amount = depositAmount;
            }

            $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...');

            TempleAPI.post('/special-occasions/bookings', apiData)
                .done(function (response) {
                    if (response.success) {
                        self.showSuccessModal(response.data);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create booking', 'error');
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to submit booking';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    $submitBtn.prop('disabled', false).html(originalText);
                });
        },

        // ========================================
        // SUCCESS MODAL - UPDATED WITH ADDON SERVICE
        // ========================================
        showSuccessModal: function (booking) {
            const slot = this.selectedSlotData;
            const slotName = slot ? `${slot.slot_name} (${slot.start_time} - ${slot.end_time})` : 'N/A';

            // Build amount display with addon service
            let amountDisplay = '';
            
            // Show package amount
            if (booking.occasion_amount) {
                amountDisplay += `<small class="text-muted">Package: RM ${parseFloat(booking.occasion_amount).toFixed(2)}</small><br>`;
            }
            
            // Show addon service if present
            if (booking.addon_services && booking.addon_services.length > 0) {
                const addon = booking.addon_services[0];
                const addonName = addon.name_secondary ? `${addon.name} (${addon.name_secondary})` : addon.name;
                amountDisplay += `<small class="text-info">Add-on: ${addonName} - RM ${parseFloat(addon.total).toFixed(2)}</small><br>`;
            }
            
            // Show subtotal if different from total
            if (booking.subtotal && booking.discount_amount > 0) {
                amountDisplay += `<small class="text-muted">Subtotal: RM ${parseFloat(booking.subtotal).toFixed(2)}</small><br>`;
            }
            
            // Show discount if present
            if (booking.discount_amount > 0) {
                amountDisplay += `<small class="text-danger">Discount: - RM ${parseFloat(booking.discount_amount).toFixed(2)}</small><br>`;
            }
            
            // Show total
            amountDisplay += `<strong>Total: RM ${parseFloat(booking.total_amount).toFixed(2)}</strong>`;

            // Show deposit and balance if present
            if (booking.deposit_amount > 0) {
                amountDisplay += `
                    <div class="mt-2">
                        <small class="text-info">Deposit Paid: RM ${parseFloat(booking.deposit_amount).toFixed(2)}</small><br>
                        <small class="text-warning fw-bold">Balance Due: RM ${parseFloat(booking.balance_due).toFixed(2)}</small>
                    </div>
                `;
            }

            $('#confirmBookingCode').html(`
                <span class="text-muted">Booking Code:</span><br>
                <span class="text-success fs-3 fw-bold">${booking.booking_code}</span>
            `);

            $('#confirmSummary').html(`
                <table class="table table-sm table-borderless mb-0">
                    <tr><td class="text-muted" width="35%">Event:</td><td class="fw-semibold">${booking.occasion_name}</td></tr>
                    <tr><td class="text-muted">Package:</td><td>${booking.occasion_option}</td></tr>
                    <tr><td class="text-muted">Date:</td><td>${this.formatDate(booking.event_date)}</td></tr>
                    <tr><td class="text-muted">Time Slot:</td><td>${slotName}</td></tr>
                    <tr><td class="text-muted">Devotee:</td><td>${booking.name_chinese} / ${booking.name_english}</td></tr>
                    <tr><td class="text-muted">Amount:</td><td class="fs-6">${amountDisplay}</td></tr>
                </table>
            `);

            $('#btnPrintReceipt').data('booking-id', booking.id);

            if (!this.confirmationModal) {
                this.confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            }
            this.confirmationModal.show();
        },

        // ========================================
        // UTILITIES
        // ========================================
        formatDate: function (dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },

        resetForm: function () {
            $('#bookingForm')[0].reset();
            $('#bookingForm').removeClass('was-validated');
            $('#occasionType').val('');
            $('#occasionInfoCard').hide();
            $('#bookingFormContainer').hide();
            $('#dateTimeCard').hide();
            $('#slotSelectionContainer').hide();
            $('#summaryPreviewCard').hide();
            $('#paymentError').hide();
            $('#btnSubmit').prop('disabled', true);
            $('#addonServiceSelect').val('');

            this.selectedOccasion = null;
            this.selectedOccasionData = null;
            this.selectedPackage = null;
            this.selectedPackageData = null;
            this.selectedDate = null;
            this.selectedSlot = null;
            this.selectedSlotData = null;
            this.selectedAddonService = null;
            this.packages = [];
            this.timeSlots = [];

            $('html, body').animate({ scrollTop: 0 }, 400);
        },

        hideForm: function () {
            $('#occasionInfoCard').hide();
            $('#bookingFormContainer').hide();
        },

        initAnimations: function () {
            // No animations - show everything immediately
        }
    };

})(jQuery, window);