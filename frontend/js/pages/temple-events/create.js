// js/pages/temple-events/create.js
// Temple Events Booking Module - POS-Style UI with Special Occasions Backend Logic
// FIXED: Service name property access and Chinese placeholder encoding

(function ($, window) {
    'use strict';

    // Shared module for CSS and cleanup
    if (!window.TempleEventsSharedModule) {
        window.TempleEventsSharedModule = {
            moduleId: 'temple-events',
            eventNamespace: 'templeEvents',
            cssId: 'temple-events-css',
            cssPath: '/css/temple-events.css',
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

    window.TempleEventsCreatePage = {
        pageId: 'temple-events-create',
        eventNamespace: window.TempleEventsSharedModule.eventNamespace,

        // Data storage
        occasions: [],
        packages: [],
        timeSlots: [],
        availableDates: [],
        includedServices: [],
        paymentModes: [],
        addonServices: [],
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
        selectedAddonService: null,
        printOption: 'SINGLE_PRINT',

        // Devotee data
        devoteeData: null,

        // Modal instances
        devoteeModal: null,
        successModal: null,

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            const self = this;
            
            // Enable fullwidth mode (hide sidebar)
            this.enableFullWidth();
            
            window.TempleEventsSharedModule.registerPage(this.pageId);
            this.render();

            // Load all required data
            Promise.all([
                this.loadOccasions(),
                this.loadPaymentModes(),
                this.loadBookingSettings(),
                this.loadAddonServices()
            ]).then(function () {
                self.bindEvents();
                self.setDefaultDate();
            }).catch(function (error) {
                console.error('Failed to load data:', error);
                TempleCore.showToast('Failed to load required data', 'error');
            });
        },

        cleanup: function () {
            // Disable fullwidth mode
            this.disableFullWidth();
            
            // Destroy modals
            if (this.devoteeModal) {
                this.devoteeModal.dispose();
                this.devoteeModal = null;
            }
            if (this.successModal) {
                this.successModal.dispose();
                this.successModal = null;
            }

            window.TempleEventsSharedModule.unregisterPage(this.pageId);
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
        },

        enableFullWidth: function () {
            $('body').addClass('temple-events-fullwidth-mode');
            $('#sidebar-container').addClass('temple-events-sidebar-hidden');
            $('#page-container').addClass('temple-events-main-expanded');
        },

        disableFullWidth: function () {
            $('body').removeClass('temple-events-fullwidth-mode');
            $('#sidebar-container').removeClass('temple-events-sidebar-hidden');
            $('#page-container').removeClass('temple-events-main-expanded');
        },

        setDefaultDate: function () {
            const today = new Date().toISOString().split('T')[0];
            $('#teEventDate').val(today);
            this.selectedDate = today;
        },

        // ========================================
        // HELPER: Get service display name (handles both API formats)
        // ========================================
        getServiceDisplayName: function (service) {
            if (!service) return '';
            
            // Handle different API response formats
            // API may return: name/name_secondary OR service_name/service_name_secondary
            const primaryName = service.name || service.service_name || '';
            const secondaryName = service.name_secondary || service.service_name_secondary || '';
            
            if (secondaryName) {
                return `${primaryName} (${secondaryName})`;
            }
            return primaryName;
        },

        getServiceName: function (service) {
            if (!service) return '';
            // Handle both formats: name OR service_name
            return service.name || service.service_name || '';
        },

        // ========================================
        // RENDER PAGE HTML - POS-Style Layout
        // ========================================
        render: function () {
            const html = `
                <div class="temple-events-page">
                    <!-- Page Header -->
                    <div class="te-header">
                        <div class="te-header-content">
                            <div class="te-header-left">
                                <button class="te-sidebar-toggle" id="teSidebarToggle" title="Toggle Sidebar">
                                    <i class="bi bi-list"></i>
                                </button>
                                <h1 class="te-title">
                                    <i class="bi bi-calendar-event"></i>
                                    Temple Event Booking
                                </h1>
                            </div>
                            <div class="te-header-actions">
                                <input type="date" class="te-date-input" id="teEventDate" title="Event Date">
                                <button class="btn-te-history" id="btnTeHistory">
                                    <i class="bi bi-clock-history"></i> View Bookings
                                </button>
                                <button class="btn-te-add-devotee" id="btnTeAddDevotee">
                                    <i class="bi bi-person-plus"></i> Add Detail
                                </button>
                                <button class="btn-te-clear" id="btnTeClear">
                                    <i class="bi bi-x-circle"></i> Clear All
                                </button>
                                <select class="te-occasion-select" id="teOccasionSelect">
                                    <option value="">All Events</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Main Container -->
                    <div class="te-main-container">
                        <!-- Left Panel: Package Selection -->
                        <div class="te-packages-section" id="tePackagesSection">
                            <div id="tePackagesContent">
                                <div class="te-loading">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p>Loading temple events...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Right Panel: Booking Details -->
                        <div class="te-booking-section" id="teBookingSection">
                            <!-- Header -->
                            <div class="te-booking-header">
                                <h4 class="te-booking-title">
                                    <i class="bi bi-cart3 me-2"></i>Booking Details
                                </h4>
                                <button class="te-booking-reset" id="btnTeReset">
                                    <i class="bi bi-arrow-counterclockwise"></i> Reset
                                </button>
                            </div>

                            <!-- Selected Package Display -->
                            <div class="te-selected-package" id="teSelectedPackage">
                                <div class="te-selected-package-empty">
                                    <i class="bi bi-box-seam"></i>
                                    <span>Select a package to begin</span>
                                </div>
                            </div>

                            <!-- Included Services -->
                            <div class="te-included-services" id="teIncludedServices" style="display: none;">
                                <div class="te-included-services-title">
                                    <i class="bi bi-check-circle"></i> Services Included
                                </div>
                                <div class="te-included-services-list" id="teIncludedServicesList"></div>
                            </div>

                            <!-- Date & Time Selection -->
                            <div class="te-datetime-section" id="teDateTimeSection" style="display: none;">
                                <div class="te-section-label">
                                    <i class="bi bi-clock"></i> Select Time Slot
                                </div>
                                <div class="te-slots-container" id="teSlotsContainer">
                                    <div class="text-center text-muted py-3">
                                        <span class="spinner-border spinner-border-sm me-2"></span>
                                        Loading time slots...
                                    </div>
                                </div>
                            </div>

                            <!-- Addon Service -->
                            <div class="te-addon-section">
                                <div class="te-section-label">
                                    <i class="bi bi-puzzle"></i> Add-on Service (Optional)
                                </div>
                                <select class="te-addon-select" id="teAddonSelect">
                                    <option value="">-- No Add-on Service --</option>
                                </select>
                            </div>

                            <!-- Payment Section (Footer) -->
                            <div class="te-booking-footer">
                                <!-- Amount Fields -->
                                <div class="te-amount-fields">
                                    <div class="te-amount-field" id="teDiscountField" style="display: none;">
                                        <label>Discount Amount</label>
                                        <input type="number" id="teDiscountAmount" placeholder="0.00" min="0" step="0.01">
                                    </div>
                                    <div class="te-amount-field" id="teDepositField" style="display: none;">
                                        <label>Deposit Amount</label>
                                        <input type="number" id="teDepositAmount" placeholder="0.00" min="0" step="0.01">
                                        <span class="minimum-hint">Minimum: RM10.00</span>
                                    </div>
                                </div>

                                <!-- Payment Methods -->
                                <div class="te-payment-methods">
                                    <div class="te-payment-label">Payment Method</div>
                                    <div class="te-payment-options" id="tePaymentOptions">
                                        <div class="text-center py-2 w-100">
                                            <span class="spinner-border spinner-border-sm"></span>
                                            <small class="ms-2">Loading...</small>
                                        </div>
                                    </div>
                                </div>

                                <!-- Print Options -->
                                <div class="te-print-options">
                                    <button class="te-print-btn active" data-print="SINGLE_PRINT">
                                        <i class="bi bi-printer"></i> Single Print
                                    </button>
                                    <button class="te-print-btn" data-print="SEP_PRINT">
                                        <i class="bi bi-files"></i> Separate
                                    </button>
                                    <button class="te-print-btn" data-print="NO_PRINT">
                                        <i class="bi bi-x-circle"></i> No Print
                                    </button>
                                </div>

                                <!-- Summary -->
                                <div class="te-booking-summary">
                                    <div class="te-summary-row">
                                        <span class="te-summary-label">Total QTY:</span>
                                        <span class="te-summary-value" id="teTotalQty">0</span>
                                    </div>
                                    <div class="te-summary-row">
                                        <span class="te-summary-label">Sub Total:</span>
                                        <span class="te-summary-value" id="teSubTotal">RM0.00</span>
                                    </div>
                                    <div class="te-summary-row" id="teDiscountRow" style="display: none;">
                                        <span class="te-summary-label">Discount:</span>
                                        <span class="te-summary-value text-danger" id="teDiscountDisplay">RM0.00</span>
                                    </div>
                                    <div class="te-summary-row total">
                                        <span class="te-summary-label">Total:</span>
                                        <span class="te-summary-value text-success" id="teTotal">RM0.00</span>
                                    </div>
                                </div>

                                <!-- Proceed Button -->
                                <button class="te-proceed-btn" id="btnTeProceed" disabled>
                                    <i class="bi bi-check-circle"></i>
                                    <span>Confirm Booking</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Floating Button -->
                    <button class="te-floating-btn" id="teFloatingBtn" style="display: none;">
                        <i class="bi bi-cart3"></i>
                        <span class="badge" id="teFloatingBadge">0</span>
                    </button>

                    <!-- Overlay for mobile -->
                    <div class="te-overlay" id="teOverlay"></div>
                </div>

                <!-- Devotee Modal -->
                ${this.renderDevoteeModal()}

                <!-- Success Modal -->
                ${this.renderSuccessModal()}
            `;

            $('#page-container').html(html);
        },

        // ========================================
        // MODAL RENDERERS
        // ========================================
        renderDevoteeModal: function () {
            return `
                <div class="modal fade" id="teDevoteeModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-circle me-2"></i>Devotee Information
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="teDevoteeForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Name (Chinese) <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="teNameChinese" placeholder="Chinese Name / &#x4E2D;&#x6587;&#x59D3;&#x540D;" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Name (English) <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="teNameEnglish" placeholder="English Name" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">NRIC / Passport <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="teNric" placeholder="e.g., 901234-12-5678" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Contact No. <span class="text-danger">*</span></label>
                                            <input type="tel" class="form-control" id="teContactNo" placeholder="e.g., 012-3456789" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Email <span class="text-danger">*</span></label>
                                            <input type="email" class="form-control" id="teEmail" placeholder="email@example.com" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Remarks <small class="text-muted">(Optional)</small></label>
                                            <textarea class="form-control" id="teRemarks" rows="2" placeholder="Any special requests..."></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnTeSaveDevotee">
                                    <i class="bi bi-check-lg me-1"></i> Save Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderSuccessModal: function () {
            return `
                <div class="modal fade te-success-modal" id="teSuccessModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-check-circle-fill me-2"></i>Booking Confirmed!
                                </h5>
                            </div>
                            <div class="modal-body text-center py-4">
                                <div class="te-success-checkmark">
                                    <i class="bi bi-check-lg"></i>
                                </div>
                                <div class="te-booking-code" id="teBookingCode"></div>
                                <div id="teSuccessSummary" class="text-start bg-light rounded p-3"></div>
                            </div>
                            <div class="modal-footer border-0 justify-content-center">
                                <button type="button" class="btn btn-outline-secondary" id="btnTePrintReceipt">
                                    <i class="bi bi-printer me-1"></i> Print Receipt
                                </button>
                                <button type="button" class="btn btn-success" id="btnTeNewBooking">
                                    <i class="bi bi-plus-circle me-1"></i> New Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // DATA LOADING FUNCTIONS
        // ========================================
        loadOccasions: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/special-occasions', { status: 'active' })
                .done(function (response) {
                    if (response.success && response.data && response.data.length > 0) {
                        self.occasions = response.data;
                        self.renderOccasionOptions();
                        self.loadAllPackages();
                        deferred.resolve();
                    } else {
                        $('#tePackagesContent').html(`
                            <div class="te-no-packages">
                                <i class="bi bi-calendar-x"></i>
                                <h4>No Events Available</h4>
                                <p>There are no active temple events at the moment.</p>
                            </div>
                        `);
                        deferred.reject();
                    }
                })
                .fail(function () {
                    $('#tePackagesContent').html(`
                        <div class="te-no-packages">
                            <i class="bi bi-exclamation-triangle"></i>
                            <h4>Failed to Load</h4>
                            <p>Unable to load temple events. Please try again.</p>
                        </div>
                    `);
                    deferred.reject();
                });

            return deferred.promise();
        },

        loadAllPackages: function () {
            const self = this;
            const occasionPromises = this.occasions.map(occasion => {
                return TempleAPI.get(`/special-occasions/${occasion.id}`)
                    .then(response => {
                        if (response.success && response.data) {
                            return {
                                occasion: occasion,
                                packages: response.data.packages || []
                            };
                        }
                        return { occasion: occasion, packages: [] };
                    });
            });

            Promise.all(occasionPromises)
                .then(results => {
                    self.renderPackagesGrid(results);
                })
                .catch(error => {
                    console.error('Error loading packages:', error);
                });
        },

        loadPaymentModes: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/masters/payment-modes/active')
                .done(function (response) {
                    if (response.success && response.data && response.data.length > 0) {
                        self.paymentModes = response.data;
                        self.renderPaymentOptions();
                        deferred.resolve();
                    } else {
                        self.paymentModes = [];
                        $('#tePaymentOptions').html('<div class="text-warning small">No payment methods available</div>');
                        deferred.reject();
                    }
                })
                .fail(function () {
                    self.paymentModes = [];
                    $('#tePaymentOptions').html('<div class="text-danger small">Failed to load payment methods</div>');
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
                            $('#teDiscountField').show();
                        }
                        if (self.bookingSettings.is_deposit_enabled) {
                            $('#teDepositField').show();
                        }
                        
                        deferred.resolve();
                    } else {
                        deferred.resolve();
                    }
                })
                .fail(function () {
                    console.warn('Failed to load booking settings - using defaults');
                    deferred.resolve();
                });

            return deferred.promise();
        },

        loadAddonServices: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/occasion-services-master/active-addons')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.addonServices = response.data;
                        self.renderAddonOptions();
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

        loadTimeSlots: function (packageId, eventDate) {
            const self = this;
            const $container = $('#teSlotsContainer');

            $container.html(`
                <div class="text-center py-3">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Loading time slots...
                </div>
            `);
            $('#teDateTimeSection').show();

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
                    $container.html('<p class="text-danger small text-center">Failed to load time slots</p>');
                });
        },

        // ========================================
        // RENDER FUNCTIONS
        // ========================================
        renderOccasionOptions: function () {
            let html = '<option value="">All Events</option>';
            this.occasions.forEach(occasion => {
                const displayName = occasion.occasion_name_secondary
                    ? `${occasion.occasion_name_primary} (${occasion.occasion_name_secondary})`
                    : occasion.occasion_name_primary;
                html += `<option value="${occasion.id}">${displayName}</option>`;
            });
            $('#teOccasionSelect').html(html);
        },

        renderPackagesGrid: function (occasionData) {
            const self = this;
            let html = '';

            occasionData.forEach(data => {
                if (data.packages.length === 0) return;

                const occasion = data.occasion;
                const packages = data.packages;

                html += `
                    <div class="te-occasion-section" data-occasion-id="${occasion.id}">
                        <div class="te-occasion-header">
                            <div class="te-occasion-icon">
                                <i class="bi bi-calendar-event"></i>
                            </div>
                            <div class="te-occasion-info">
                                <h5 class="te-occasion-name">${occasion.occasion_name_primary}</h5>
                                ${occasion.occasion_name_secondary ? `<p class="te-occasion-name-secondary">${occasion.occasion_name_secondary}</p>` : ''}
                            </div>
                        </div>
                        <div class="te-packages-grid">
                `;

                packages.forEach(pkg => {
                    const price = parseFloat(pkg.amount || 0).toFixed(2);
                    let imageUrl = null;
                    if (pkg.image_url) {
                        imageUrl = pkg.image_url;
                    } else if (pkg.image_path) {
                        imageUrl = `/storage/${pkg.image_path}`;
                    }

                    // Get included services - FIXED: Handle both name formats
                    const services = pkg.services || [];
                    let servicesHtml = '';
                    if (services.length > 0) {
                        // Filter out services with no valid name
                        const validServices = services.filter(service => self.getServiceName(service));
                        
                        if (validServices.length > 0) {
                            servicesHtml = '<div class="te-package-services">';
                            validServices.slice(0, 3).forEach(service => {
                                const serviceName = self.getServiceName(service);
                                servicesHtml += `<span class="te-service-badge">${serviceName}</span>`;
                            });
                            if (validServices.length > 3) {
                                servicesHtml += `<span class="te-service-badge">+${validServices.length - 3}</span>`;
                            }
                            servicesHtml += '</div>';
                        }
                    }

                    html += `
                        <div class="te-package-card" data-package-id="${pkg.id}" data-occasion-id="${occasion.id}">
                            <div class="te-package-image">
                                ${imageUrl 
                                    ? `<img src="${imageUrl}" alt="${pkg.name || ''}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                       <i class="bi bi-box-seam" style="display:none;"></i>` 
                                    : '<i class="bi bi-box-seam"></i>'
                                }
                            </div>
                            <div class="te-package-name">${pkg.name || ''}</div>
                            ${pkg.name_secondary ? `<div class="te-package-name-secondary">${pkg.name_secondary}</div>` : '<div class="te-package-name-secondary">&nbsp;</div>'}
                            <div class="te-package-price">RM ${price}</div>
                            ${servicesHtml}
                        </div>
                    `;
                });

                html += '</div></div>';
            });

            if (!html) {
                html = `
                    <div class="te-no-packages">
                        <i class="bi bi-box-seam"></i>
                        <h4>No Packages Available</h4>
                        <p>No packages are available for the selected criteria.</p>
                    </div>
                `;
            }

            $('#tePackagesContent').html(html);

            // Store packages data for reference
            this.allPackagesData = occasionData;
        },

        renderPaymentOptions: function () {
            let html = '';
            this.paymentModes.forEach((mode, index) => {
                const iconDisplay = mode.icon_display_url_data || { 
                    type: 'bootstrap', 
                    value: 'bi-currency-dollar' 
                };
                
                const iconHtml = iconDisplay.type === 'bootstrap'
                    ? `<i class="bi ${iconDisplay.value}"></i>`
                    : `<img src="${iconDisplay.value}" alt="${mode.name || ''}" 
                            style="width: ${iconDisplay.width || 32}px; 
                                   height: ${iconDisplay.height || 20}px; 
                                   object-fit: contain;">`;

                html += `
                    <div class="te-payment-option">
                        <input type="radio" class="form-check-input" name="tePaymentMethod" 
                               id="tePayment-${mode.id}" value="${mode.id}" 
                               ${index === 0 ? 'checked' : ''}>
                        <label class="form-check-label" for="tePayment-${mode.id}">
                            ${iconHtml}
                            <span>${mode.name || ''}</span>
                        </label>
                    </div>
                `;
            });
            $('#tePaymentOptions').html(html);
        },

        renderAddonOptions: function () {
            const self = this;
            let html = '<option value="">-- No Add-on Service --</option>';
            
            if (this.addonServices && this.addonServices.length > 0) {
                this.addonServices.forEach(service => {
                    const amount = parseFloat(service.amount || 0).toFixed(2);
                    // FIXED: Use helper to get service name
                    const serviceName = self.getServiceName(service);
                    const serviceNameSecondary = service.name_secondary || service.service_name_secondary || '';
                    
                    if (serviceName) {
                        const displayName = serviceNameSecondary 
                            ? `${serviceName} (${serviceNameSecondary}) - RM ${amount}`
                            : `${serviceName} - RM ${amount}`;
                        
                        html += `<option value="${service.id}" data-amount="${amount}">${displayName}</option>`;
                    }
                });
            }
            
            $('#teAddonSelect').html(html);
        },

        renderTimeSlots: function (packageMode) {
            const $container = $('#teSlotsContainer');
            $container.empty();

            if (this.timeSlots.length === 0) {
                $container.html('<p class="text-muted small text-center">No time slots required for this package</p>');
                this.selectedSlot = null;
                this.selectedSlotData = null;
                return;
            }

            let html = '';
            this.timeSlots.forEach((slot) => {
                const isAvailable = slot.is_available;
                const availText = packageMode === 'multiple'
                    ? `${slot.available || 0} left`
                    : (isAvailable ? 'Available' : 'Booked');

                html += `
                    <button class="te-slot-btn" data-slot-id="${slot.id}" ${isAvailable ? '' : 'disabled'}>
                        <span class="slot-name">${slot.slot_name || ''}</span>
                        <span class="slot-time">${slot.start_time || ''} - ${slot.end_time || ''}</span>
                        <span class="slot-status">${availText}</span>
                    </button>
                `;
            });

            $container.html(html);
        },

        renderSelectedPackage: function () {
            const $container = $('#teSelectedPackage');
            
            if (!this.selectedPackageData) {
                $container.html(`
                    <div class="te-selected-package-empty">
                        <i class="bi bi-box-seam"></i>
                        <span>Select a package to begin</span>
                    </div>
                `);
                $('#teIncludedServices').hide();
                return;
            }

            const pkg = this.selectedPackageData;
            const occasion = this.selectedOccasionData;
            const price = parseFloat(pkg.amount || 0).toFixed(2);

            $container.html(`
                <div class="te-selected-package-info">
                    <div class="te-selected-package-details">
                        <div class="te-selected-package-name">${pkg.name || ''}</div>
                        <div class="te-selected-package-occasion">${occasion ? (occasion.occasion_name_primary || '') : ''}</div>
                    </div>
                    <div class="te-selected-package-price">RM ${price}</div>
                </div>
            `);

            // Show included services
            this.renderIncludedServices();
        },

        renderIncludedServices: function () {
            const self = this;
            const pkg = this.selectedPackageData;
            const services = pkg?.services || [];

            if (services.length === 0) {
                $('#teIncludedServices').hide();
                return;
            }

            let html = '';
            let validCount = 0;
            
            services.forEach(service => {
                // FIXED: Use helper function to get display name
                const displayName = self.getServiceDisplayName(service);
                if (displayName) {
                    html += `<span class="te-included-service-badge">${displayName}</span>`;
                    validCount++;
                }
            });

            // Only show section if we have valid services
            if (validCount > 0) {
                $('#teIncludedServicesList').html(html);
                $('#teIncludedServices').show();
            } else {
                $('#teIncludedServices').hide();
            }
        },

        // ========================================
        // EVENT BINDINGS
        // ========================================
        bindEvents: function () {
            const self = this;

            // Sidebar toggle
            $('#teSidebarToggle').on('click.' + this.eventNamespace, function () {
                self.disableFullWidth();
                setTimeout(() => {
                    self.enableFullWidth();
                }, 100);
            });

            // Occasion filter
            $('#teOccasionSelect').on('change.' + this.eventNamespace, function () {
                const occasionId = $(this).val();
                self.filterByOccasion(occasionId);
            });

            // Package selection
            $(document).on('click.' + this.eventNamespace, '.te-package-card', function () {
                self.selectPackage($(this));
            });

            // Date change
            $('#teEventDate').on('change.' + this.eventNamespace, function () {
                self.selectedDate = $(this).val();
                if (self.selectedPackage && self.selectedDate) {
                    self.loadTimeSlots(self.selectedPackage, self.selectedDate);
                }
                self.updateSummary();
                self.checkFormComplete();
            });

            // Time slot selection
            $(document).on('click.' + this.eventNamespace, '.te-slot-btn:not(:disabled)', function () {
                $('.te-slot-btn').removeClass('selected');
                $(this).addClass('selected');
                self.selectedSlot = $(this).data('slot-id');
                self.selectedSlotData = self.timeSlots.find(s => s.id == self.selectedSlot);
                self.updateSummary();
                self.checkFormComplete();
            });

            // Addon selection
            $('#teAddonSelect').on('change.' + this.eventNamespace, function () {
                const selectedId = $(this).val();
                if (selectedId) {
                    self.selectedAddonService = self.addonServices.find(s => s.id == selectedId);
                } else {
                    self.selectedAddonService = null;
                }
                self.updateSummary();
                self.checkFormComplete();
            });

            // Payment method
            $(document).on('change.' + this.eventNamespace, 'input[name="tePaymentMethod"]', function () {
                self.updateSummary();
                self.checkFormComplete();
            });

            // Print options
            $('.te-print-btn').on('click.' + this.eventNamespace, function () {
                $('.te-print-btn').removeClass('active');
                $(this).addClass('active');
                self.printOption = $(this).data('print');
            });

            // Discount and deposit changes
            $('#teDiscountAmount, #teDepositAmount').on('input.' + this.eventNamespace, function () {
                self.validateAmounts();
                self.updateSummary();
                self.checkFormComplete();
            });

            // Add devotee button
            $('#btnTeAddDevotee').on('click.' + this.eventNamespace, function () {
                self.showDevoteeModal();
            });

            // Save devotee
            $('#btnTeSaveDevotee').on('click.' + this.eventNamespace, function () {
                self.saveDevoteeData();
            });

            // Clear button
            $('#btnTeClear').on('click.' + this.eventNamespace, function () {
                Swal.fire({
                    title: 'Clear All?',
                    text: 'This will reset all booking data.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Yes, clear all'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.resetForm();
                    }
                });
            });

            // Reset button
            $('#btnTeReset').on('click.' + this.eventNamespace, function () {
                self.resetForm();
            });

            // View history
            $('#btnTeHistory').on('click.' + this.eventNamespace, function () {
                TempleRouter.navigate('special-occasions');
            });

            // Proceed button
            $('#btnTeProceed').on('click.' + this.eventNamespace, function () {
                self.submitBooking();
            });

            // Print receipt
            $(document).on('click.' + this.eventNamespace, '#btnTePrintReceipt', function () {
                const bookingId = $(this).data('booking-id');
                if (bookingId) {
                    if (self.successModal) {
                        self.successModal.hide();
                    }
                    setTimeout(() => {
                        TempleRouter.navigate('special-occasions/print', { id: bookingId });
                    }, 300);
                }
            });

            // New booking
            $(document).on('click.' + this.eventNamespace, '#btnTeNewBooking', function () {
                if (self.successModal) {
                    self.successModal.hide();
                }
                setTimeout(() => {
                    self.resetForm();
                }, 300);
            });

            // Mobile overlay
            $('#teOverlay').on('click.' + this.eventNamespace, function () {
                self.closeMobileBookingPanel();
            });

            // Mobile floating button
            $('#teFloatingBtn').on('click.' + this.eventNamespace, function () {
                self.toggleMobileBookingPanel();
            });
        },

        // ========================================
        // ACTION HANDLERS
        // ========================================
        selectPackage: function ($card) {
            const packageId = $card.data('package-id');
            const occasionId = $card.data('occasion-id');

            // Find package and occasion data
            this.selectedOccasionData = this.occasions.find(o => o.id == occasionId);
            
            // Find package from allPackagesData
            if (this.allPackagesData) {
                for (const data of this.allPackagesData) {
                    if (data.occasion.id == occasionId) {
                        this.selectedPackageData = data.packages.find(p => p.id == packageId);
                        break;
                    }
                }
            }

            this.selectedPackage = packageId;

            // Update UI
            $('.te-package-card').removeClass('selected');
            $card.addClass('selected');

            // Render selected package
            this.renderSelectedPackage();

            // Load time slots if date is selected
            if (this.selectedDate) {
                this.loadTimeSlots(packageId, this.selectedDate);
            } else {
                $('#teDateTimeSection').show();
                $('#teSlotsContainer').html('<p class="text-muted small text-center">Please select a date first</p>');
            }

            // Reset slot selection
            this.selectedSlot = null;
            this.selectedSlotData = null;

            this.updateSummary();
            this.checkFormComplete();

            // Scroll to booking section on mobile
            if ($(window).width() < 992) {
                this.toggleMobileBookingPanel();
            }
        },

        filterByOccasion: function (occasionId) {
            if (!occasionId) {
                // Show all
                $('.te-occasion-section').show();
            } else {
                // Hide all, show only selected
                $('.te-occasion-section').hide();
                $(`.te-occasion-section[data-occasion-id="${occasionId}"]`).show();
            }
        },

        validateAmounts: function () {
            const totals = this.calculateTotals();
            let discountValue = parseFloat($('#teDiscountAmount').val() || 0);
            
            // Auto-correct if discount exceeds subtotal
            if (discountValue > totals.subtotal) {
                $('#teDiscountAmount').val(totals.subtotal.toFixed(2));
                TempleCore.showToast('Discount cannot exceed subtotal amount', 'warning');
            }
            
            let depositValue = parseFloat($('#teDepositAmount').val() || 0);
            
            // Recalculate totals with corrected discount
            const newTotals = this.calculateTotals();
            
            // Auto-correct if deposit exceeds total
            if (depositValue > newTotals.total) {
                $('#teDepositAmount').val(newTotals.total.toFixed(2));
                TempleCore.showToast('Deposit cannot exceed total amount', 'warning');
            }
        },

        calculateTotals: function () {
            const pkg = this.selectedPackageData;
            if (!pkg) return { subtotal: 0, addonAmount: 0, discount: 0, total: 0, deposit: 0, balance: 0 };

            const packageAmount = parseFloat(pkg.amount || 0);
            const addonAmount = this.selectedAddonService ? parseFloat(this.selectedAddonService.amount || 0) : 0;
            const subtotal = packageAmount + addonAmount;
            
            let discountAmount = parseFloat($('#teDiscountAmount').val() || 0);
            if (discountAmount > subtotal) {
                discountAmount = subtotal;
            }
            
            const total = Math.max(0, subtotal - discountAmount);
            let depositAmount = parseFloat($('#teDepositAmount').val() || 0);
            if (depositAmount > total) {
                depositAmount = total;
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

        updateSummary: function () {
            const totals = this.calculateTotals();

            $('#teTotalQty').text(this.selectedPackage ? 1 : 0);
            $('#teSubTotal').text(`RM${totals.subtotal.toFixed(2)}`);
            
            if (totals.discount > 0) {
                $('#teDiscountRow').show();
                $('#teDiscountDisplay').text(`RM${totals.discount.toFixed(2)}`);
            } else {
                $('#teDiscountRow').hide();
            }
            
            $('#teTotal').text(`RM${totals.total.toFixed(2)}`);

            // Update floating badge
            $('#teFloatingBadge').text(this.selectedPackage ? 1 : 0);
        },

        checkFormComplete: function () {
            const hasPackage = this.selectedPackage;
            const hasDate = this.selectedDate;
            const hasSlot = this.timeSlots.length === 0 || this.selectedSlot;
            const hasPayment = $('input[name="tePaymentMethod"]:checked').length > 0;
            const hasDevotee = this.devoteeData && this.devoteeData.name_chinese && this.devoteeData.name_english;

            const isComplete = hasPackage && hasDate && hasSlot && hasPayment && hasDevotee;

            $('#btnTeProceed').prop('disabled', !isComplete);

            // Update Add Detail button state
            if (hasDevotee) {
                $('#btnTeAddDevotee').addClass('has-data');
            } else {
                $('#btnTeAddDevotee').removeClass('has-data');
            }
        },

        showDevoteeModal: function () {
            // Populate form if data exists
            if (this.devoteeData) {
                $('#teNameChinese').val(this.devoteeData.name_chinese || '');
                $('#teNameEnglish').val(this.devoteeData.name_english || '');
                $('#teNric').val(this.devoteeData.nric || '');
                $('#teContactNo').val(this.devoteeData.contact_no || '');
                $('#teEmail').val(this.devoteeData.email || '');
                $('#teRemarks').val(this.devoteeData.remarks || '');
            }

            if (!this.devoteeModal) {
                this.devoteeModal = new bootstrap.Modal(document.getElementById('teDevoteeModal'));
            }
            this.devoteeModal.show();
        },

        saveDevoteeData: function () {
            const form = document.getElementById('teDevoteeForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            this.devoteeData = {
                name_chinese: $('#teNameChinese').val().trim(),
                name_english: $('#teNameEnglish').val().trim(),
                nric: $('#teNric').val().trim(),
                contact_no: $('#teContactNo').val().trim(),
                email: $('#teEmail').val().trim(),
                remarks: $('#teRemarks').val().trim()
            };

            if (this.devoteeModal) {
                this.devoteeModal.hide();
            }

            TempleCore.showToast('Devotee details saved', 'success');
            this.checkFormComplete();
        },

        // ========================================
        // SUBMIT BOOKING - Uses Same API as Special Occasions
        // ========================================
        submitBooking: function () {
            const self = this;

            // Validate
            if (!this.validateForm()) {
                return;
            }

            const $btn = $('#btnTeProceed');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...');

            const paymentModeId = $('input[name="tePaymentMethod"]:checked').val();
            const discountAmount = parseFloat($('#teDiscountAmount').val() || 0);
            const depositAmount = parseFloat($('#teDepositAmount').val() || 0);

            // Build API data - SAME FORMAT AS SPECIAL OCCASIONS
            const apiData = {
                special_occasion_id: this.selectedOccasionData.id,
                option_id: parseInt(this.selectedPackage),
                slot_id: this.selectedSlot ? parseInt(this.selectedSlot) : null,
                event_date: this.selectedDate,
                name_chinese: this.devoteeData.name_chinese,
                name_english: this.devoteeData.name_english,
                nric: this.devoteeData.nric,
                email: this.devoteeData.email,
                contact_no: this.devoteeData.contact_no,
                payment_methods: paymentModeId,
                remark: this.devoteeData.remarks || null,
                booking_through: 'COUNTER' // Indicate this is from the counter/POS interface
            };

            // Add addon service if selected
            if (this.selectedAddonService) {
                apiData.addon_service_id = parseInt(this.selectedAddonService.id);
            }

            // Add optional fields
            if (discountAmount > 0) {
                apiData.discount_amount = discountAmount;
            }
            if (depositAmount > 0) {
                apiData.deposit_amount = depositAmount;
            }

            // SAME API ENDPOINT AS SPECIAL OCCASIONS
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
                    $btn.prop('disabled', false).html(originalText);
                });
        },

        validateForm: function () {
            const errors = [];

            if (!this.selectedPackage) {
                errors.push('Please select a package');
            }

            if (!this.selectedDate) {
                errors.push('Please select an event date');
            }

            if (this.timeSlots.length > 0 && !this.selectedSlot) {
                errors.push('Please select a time slot');
            }

            if (!$('input[name="tePaymentMethod"]:checked').length) {
                errors.push('Please select a payment method');
            }

            if (!this.devoteeData || !this.devoteeData.name_chinese || !this.devoteeData.name_english) {
                errors.push('Please fill in devotee details');
            }

            // Validate amounts
            const totals = this.calculateTotals();
            if (totals.discount > totals.subtotal) {
                errors.push('Discount cannot exceed subtotal amount');
            }

            if (totals.deposit > totals.total) {
                errors.push('Deposit cannot exceed total amount');
            }

            if (errors.length > 0) {
                TempleCore.showToast(errors[0], 'error');
                return false;
            }

            return true;
        },

        showSuccessModal: function (booking) {
            const self = this;
            const slot = this.selectedSlotData;
            const slotName = slot ? `${slot.slot_name || ''} (${slot.start_time || ''} - ${slot.end_time || ''})` : 'N/A';

            $('#teBookingCode').text(booking.booking_code || booking.booking_number || '');

            // Build summary HTML
            let summaryHtml = `
                <table class="table table-sm table-borderless mb-0">
                    <tr><td class="text-muted" width="35%">Event:</td><td class="fw-semibold">${booking.occasion_name || ''}</td></tr>
                    <tr><td class="text-muted">Package:</td><td>${booking.occasion_option || ''}</td></tr>
                    <tr><td class="text-muted">Date:</td><td>${this.formatDate(booking.event_date)}</td></tr>
                    <tr><td class="text-muted">Time:</td><td>${slotName}</td></tr>
                    <tr><td class="text-muted">Devotee:</td><td>${booking.name_chinese || ''} / ${booking.name_english || ''}</td></tr>
            `;

            // Add addon if present
            if (booking.addon_services && booking.addon_services.length > 0) {
                const addon = booking.addon_services[0];
                // FIXED: Use helper to get name
                const addonName = self.getServiceName(addon);
                summaryHtml += `<tr><td class="text-muted">Add-on:</td><td class="text-info">${addonName} (RM${parseFloat(addon.total || addon.total_price || 0).toFixed(2)})</td></tr>`;
            }

            // Add discount if present
            if (booking.discount_amount > 0) {
                summaryHtml += `<tr><td class="text-muted">Discount:</td><td class="text-danger">- RM${parseFloat(booking.discount_amount).toFixed(2)}</td></tr>`;
            }

            summaryHtml += `
                    <tr><td class="text-muted">Total:</td><td class="text-success fw-bold">RM${parseFloat(booking.total_amount || 0).toFixed(2)}</td></tr>
            `;

            // Add deposit info if present
            if (booking.deposit_amount > 0) {
                summaryHtml += `
                    <tr><td class="text-muted">Paid:</td><td class="text-info">RM${parseFloat(booking.deposit_amount).toFixed(2)}</td></tr>
                    <tr><td class="text-muted">Balance:</td><td class="text-warning fw-bold">RM${parseFloat(booking.balance_due || 0).toFixed(2)}</td></tr>
                `;
            }

            summaryHtml += '</table>';

            $('#teSuccessSummary').html(summaryHtml);
            $('#btnTePrintReceipt').data('booking-id', booking.id);

            if (!this.successModal) {
                this.successModal = new bootstrap.Modal(document.getElementById('teSuccessModal'));
            }
            this.successModal.show();
        },

        // ========================================
        // UTILITY FUNCTIONS
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
            // Reset selections
            this.selectedPackage = null;
            this.selectedPackageData = null;
            this.selectedOccasionData = null;
            this.selectedSlot = null;
            this.selectedSlotData = null;
            this.selectedAddonService = null;
            this.devoteeData = null;
            this.timeSlots = [];
            this.printOption = 'SINGLE_PRINT';

            // Reset UI
            $('.te-package-card').removeClass('selected');
            $('#teAddonSelect').val('');
            $('#teDiscountAmount').val('');
            $('#teDepositAmount').val('');
            $('.te-print-btn').removeClass('active');
            $('.te-print-btn[data-print="SINGLE_PRINT"]').addClass('active');

            // Reset devotee form
            $('#teDevoteeForm')[0].reset();
            $('#teDevoteeForm').removeClass('was-validated');
            $('#btnTeAddDevotee').removeClass('has-data');

            // Reset selected package display
            this.renderSelectedPackage();
            
            // Hide time slots section
            $('#teDateTimeSection').hide();

            // Reset summary
            this.updateSummary();
            this.checkFormComplete();

            // Set default date
            this.setDefaultDate();
        },

        toggleMobileBookingPanel: function () {
            $('#teBookingSection').toggleClass('show');
            $('#teOverlay').toggleClass('show');
        },

        closeMobileBookingPanel: function () {
            $('#teBookingSection').removeClass('show');
            $('#teOverlay').removeClass('show');
        }
    };

})(jQuery, window);