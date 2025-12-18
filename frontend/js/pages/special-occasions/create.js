// js/pages/special-occasions/create.js
// Special Occasions Booking Module - Improved Version
// With better layout, confirmation step, and proper modal handling

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

        // Selected values
        selectedOccasion: null,
        selectedOccasionData: null,
        selectedPackage: null,
        selectedPackageData: null,
        selectedDate: null,
        selectedSlot: null,
        selectedSlotData: null,

        // Payment methods
        paymentMethods: [
            { value: 'cash', label: 'Cash', labelCn: '现款', icon: 'cash-coin' },
            { value: 'cheque', label: 'Cheque', labelCn: '支票', icon: 'file-earmark-check' },
            { value: 'ebanking', label: 'E-Banking', labelCn: '银行转账', icon: 'bank' },
            { value: 'card', label: 'Credit/Debit Card', labelCn: '信用卡', icon: 'credit-card' },
            { value: 'duitnow', label: 'DuitNow (E-wallet)', labelCn: '电子钱包', icon: 'phone' }
        ],

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

            this.loadOccasions().then(function () {
                self.bindEvents();
            }).fail(function () {
                TempleCore.showToast('Failed to load special occasions', 'error');
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
        // RENDER PAGE HTML - IMPROVED LAYOUT
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
                                            <i class="bi bi-star-fill"></i>
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

                                                <!-- Step 5: Payment Method -->
                                                <div class="occasion-card mb-4">
                                                    <div class="card-header-custom">
                                                        <span class="step-badge">5</span>
                                                        <i class="bi bi-credit-card"></i>
                                                        <span>Payment Method <small class="text-light opacity-75">付款方式</small></span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <div class="row g-2" id="paymentMethodsGrid">
                                                            ${this.renderPaymentMethods()}
                                                        </div>
                                                        <div class="text-danger small mt-2" id="paymentError" style="display: none;">
                                                            <i class="bi bi-exclamation-circle"></i> Please select a payment method
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
                
                    <!-- Additional CSS for step badges and AOS fix -->
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
                    .list-group-item.package-option input:checked + div + span {
                        background-color: #198754 !important;
                        color: white !important;
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
            let html = '';
            this.paymentMethods.forEach(method => {
                html += `
                    <div class="col-6 col-md-4">
                        <div class="payment-option">
                            <input type="radio" class="btn-check" name="paymentMethod" id="payment-${method.value}" value="${method.value}" autocomplete="off">
                            <label class="btn btn-outline-secondary w-100 py-3" for="payment-${method.value}">
                                <i class="bi bi-${method.icon} d-block mb-1" style="font-size: 1.5rem;"></i>
                                <span class="d-block small">${method.label}</span>
                                <span class="d-block small text-muted">${method.labelCn}</span>
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

        renderPackageOptions: function () {
            const $container = $('#packageOptionsGroup');
            $container.empty();

            if (this.packages.length === 0) {
                $container.html('<p class="text-muted">No packages available</p>');
                return;
            }

            let html = '<div class="list-group">';
            this.packages.forEach((pkg, index) => {
                const price = parseFloat(pkg.amount || 0).toFixed(2);
                const secondaryName = pkg.name_secondary ? `<small class="text-muted">${pkg.name_secondary}</small>` : '';

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
        },

        loadDates: function (packageId) {
            const self = this;
            const $container = $('#dateSelectionGroup');

            $container.html('<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading dates...</div>');
            $('#dateTimeCard').slideDown();
            $('#slotSelectionContainer').hide();

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

            $container.html('<div class="text-center py-3"><span class="spinner-border spinner-border-sm"></span> Loading time slots...</div>');
            $('#slotSelectionContainer').slideDown();

            TempleAPI.get('/special-occasions/bookings/slots', {
                option_id: packageId,
                event_date: eventDate
            })
                .done(function (response) {
                    if (response.success) {
                        self.timeSlots = response.data || [];
                        self.renderTimeSlots(response.package_mode);
                    }
                })
                .fail(function () {
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

            // Package selection
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
                if (self.selectedPackage && self.selectedDate) {
                    self.loadTimeSlots(self.selectedPackage, self.selectedDate);
                }
                self.updateSummaryPreview();
            });

            // Date selection (date picker)
            $(document).on('change.' + this.eventNamespace, '#eventDate', function () {
                self.selectedDate = $(this).val();
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

            // Personal info changes
            $(document).on('input.' + this.eventNamespace, '#nameChinese, #nameEnglish, #nric, #email, #contactNo', function () {
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


            // Print receipt - use router navigation
            $(document).on('click.' + this.eventNamespace, '#btnPrintReceipt', function () {
                const bookingId = $(this).data('booking-id');
                if (bookingId) {
                    // Close the modal first
                    if (self.confirmationModal) {
                        self.confirmationModal.hide();
                    }
                    // Use router to navigate to print page with params
                    setTimeout(() => {
                        TempleRouter.navigate('special-occasions/print', { id: bookingId });
                    }, 300);
                }
            });

            // New booking button - FIXED
            $(document).on('click.' + this.eventNamespace, '#btnNewBooking', function () {
                // Hide confirmation modal properly
                if (self.confirmationModal) {
                    self.confirmationModal.hide();
                }
                // Reset form after modal hides
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

            // Show info card
            $infoCard.show();

            // Load packages
            this.loadPackages(occasion.id);

            // Reset selections
            this.selectedPackage = null;
            this.selectedPackageData = null;
            this.selectedDate = null;
            this.selectedSlot = null;
            this.selectedSlotData = null;
            $('#dateTimeCard').hide();
            $('#slotSelectionContainer').hide();
            $('#summaryPreviewCard').hide();
            $('#btnSubmit').prop('disabled', true);

            // Show form
            $formContainer.show();

            // Scroll to form
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

        updateSummaryPreview: function () {
            const pkg = this.selectedPackageData;
            const slot = this.selectedSlotData;
            const payment = $('input[name="paymentMethod"]:checked').val();
            const paymentLabel = this.paymentMethods.find(p => p.value === payment)?.label || '-';

            if (!pkg) return;

            const slotInfo = slot ? `${slot.slot_name} (${slot.start_time} - ${slot.end_time})` : 'Not required';

            const html = `
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless mb-0">
                            <tr><td class="text-muted" width="40%">Event:</td><td class="fw-semibold">${this.selectedOccasionData?.name || '-'}</td></tr>
                            <tr><td class="text-muted">Package:</td><td>${pkg.name}</td></tr>
                            <tr><td class="text-muted">Date:</td><td>${this.formatDate(this.selectedDate) || '-'}</td></tr>
                            <tr><td class="text-muted">Time Slot:</td><td>${slotInfo}</td></tr>
                            <tr><td class="text-muted">Amount:</td><td class="text-success fw-bold">RM ${parseFloat(pkg.amount || 0).toFixed(2)}</td></tr>
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

            // Package
            if (!this.selectedPackage) {
                errors.push('Please select a package');
                isValid = false;
            }

            // Date
            if (!this.selectedDate) {
                errors.push('Please select a date');
                isValid = false;
            }

            // Time slot (if required)
            if (this.timeSlots.length > 0 && !this.selectedSlot) {
                errors.push('Please select a time slot');
                isValid = false;
            }

            // Payment
            if (!$('input[name="paymentMethod"]:checked').length) {
                $('#paymentError').show();
                errors.push('Please select a payment method');
                isValid = false;
            }

            // Personal info
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
        // SUBMIT FORM
        // ========================================
        submitForm: function () {
            const self = this;
            const $submitBtn = $('#btnSubmit, #btnConfirmSubmit');
            const originalText = $submitBtn.html();

            const paymentMethod = $('input[name="paymentMethod"]:checked').val();

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
                payment_methods: paymentMethod,
                remark: $('#remark').val().trim() || null
            };

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
        // SUCCESS MODAL
        // ========================================
        showSuccessModal: function (booking) {
            const slot = this.selectedSlotData;
            const slotName = slot ? `${slot.slot_name} (${slot.start_time} - ${slot.end_time})` : 'N/A';

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
                    <tr><td class="text-muted">Amount:</td><td class="text-success fw-bold fs-5">RM ${parseFloat(booking.occasion_amount).toFixed(2)}</td></tr>
                </table>
            `);

            $('#btnPrintReceipt').data('booking-id', booking.id);

            // Create and show modal
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

            this.selectedOccasion = null;
            this.selectedOccasionData = null;
            this.selectedPackage = null;
            this.selectedPackageData = null;
            this.selectedDate = null;
            this.selectedSlot = null;
            this.selectedSlotData = null;
            this.packages = [];
            this.timeSlots = [];

            // Scroll to top
            $('html, body').animate({ scrollTop: 0 }, 400);
        },

        hideForm: function () {
            $('#occasionInfoCard').hide();
            $('#bookingFormContainer').hide();
        },

        initAnimations: function () {
            // No animations - show everything immediately
            // This prevents any opacity/visibility issues
        }
    };

})(jQuery, window);