// js/pages/hall-booking/create.js
// Hall Booking Create Page with 4 Step Workflow

(function($, window) {
    'use strict';
    if (!window.HallSharedModule) {
        window.HallSharedModule = {
            moduleId: 'hall',
			eventNamespace: 'hall',
            cssId: 'hall-booking-css',
            cssPath: '/css/hall-booking.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Hall Booking CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Hall Booking page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Hall Booking page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                // If no more pages active, cleanup CSS
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            // Check if any pages are active
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            // Get active pages
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            // Cleanup module resources
            cleanup: function() {
                // Remove CSS
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Hall Booking CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all hall-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Hall Booking module cleaned up');
            }
        };
    }
    window.HallBookingCreatePage = {
		pageId: 'hall-create',
        eventNamespace: window.HallSharedModule.eventNamespace,
        currentStep: 1,
        selectedVenue: null,
        selectedDate: null,
        selectedTimeSlot: null,
        selectedMainPackage: null,
        selectedSubPackages: [],
        selectedAddons: [],
        extraCharges: [],
        bookingData: {},
        
        // Venue options
        venues: [
            {
                id: 'main_hall',
                name: 'Main Temple Hall',
                description: 'Ground Floor',
                icon: 'bi-building'
            },
            {
                id: 'garden_pavilion',
                name: 'Garden Pavilion',
                description: 'Outdoor Garden',
                icon: 'bi-building'
            },
            {
                id: 'sacred_chamber',
                name: 'Sacred Chamber',
                description: 'Second Floor',
                icon: 'bi-building'
            }
        ],
        
        // Calendar data
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        
        // Hall time sessions from the documentation
        timeSessions: [
            {
                id: 1,
                name: 'First Session',
                time: '9:00 AM - 2:00 PM',
                duration: '5 hours',
                price: 8000.00,
                icon: 'bi-sunrise'
            },
            {
                id: 2,
                name: 'Second Session', 
                time: '6:00 PM - 11:00 PM',
                duration: '5 hours',
                price: 8000.00,
                icon: 'bi-sunset'
            },
            {
                id: 3,
                name: 'Overtime',
                time: 'Up to 12:00 AM',
                duration: 'Variable',
                price: 500.00, // per 15 minutes
                priceUnit: 'per 15 minutes',
                icon: 'bi-alarm'
            },
            {
                id: 4,
                name: 'After Midnight',
                time: 'After 12:00 AM',
                duration: 'Variable', 
                price: 2000.00, // per hour
                priceUnit: 'per hour',
                icon: 'bi-moon'
            }
        ],

        // Main packages
        mainPackages: [
            {
                id: 'standard',
                name: 'Standard Hall Rental',
                description: 'Basic hall rental service',
                deposit: 0.00, // No additional charge - already included in session
                hasSubPackages: false
            },
            {
                id: 'dinner',
                name: 'Dinner Package',
                description: 'Complete dinner package with meal service',
                deposit: 0.00, // Base dinner package - sub-packages add the cost
                hasSubPackages: true,
                subPackages: [
                    {
                        id: 'package_a',
                        name: 'Package A',
                        price: 888.00,
                        description: 'Standard package with choice of vegetarian or non-vegetarian menu from approved vendors'
                    },
                    {
                        id: 'package_b',
                        name: 'Package B', 
                        price: 1088.00,
                        description: 'Premium package with enhanced menu selection and additional dishes'
                    },
                    {
                        id: 'package_c',
                        name: 'Package C',
                        price: 1288.00,
                        description: 'Deluxe package with premium ingredients and specialty dishes'
                    }
                ]
            }
        ],

        // Additional services from documentation
        additionalServices: [
            // VIP Room & Facilities
            {
                category: 'VIP Room & Facilities',
                items: [
                    { id: 'vip_room', name: 'VIP Room', unit: 'Per event', internalPrice: 400.00, externalPrice: 500.00 },
                    { id: 'rehearsal', name: 'Rehearsal (With Air-con & Lighting)', unit: 'Per hour', internalPrice: 480.00, externalPrice: 600.00 }
                ]
            },
            // Audio-Visual Equipment
            {
                category: 'Audio-Visual Equipment', 
                items: [
                    { id: 'projection', name: 'Projection System', unit: 'Per event', internalPrice: 960.00, externalPrice: 1200.00 }
                ]
            },
            // Musical Instruments
            {
                category: 'Musical Instruments',
                items: [
                    { id: 'upright_piano', name: 'Upright Piano', unit: 'Per event', internalPrice: 480.00, externalPrice: 600.00 },
                    { id: 'grand_piano', name: 'Grand Piano', unit: 'Per event', internalPrice: 800.00, externalPrice: 1000.00 }
                ]
            },
            // Furniture
            {
                category: 'Furniture',
                items: [
                    { id: 'round_table', name: 'Round Table', unit: 'Per unit', internalPrice: 16.00, externalPrice: 20.00 },
                    { id: 'long_table', name: 'Long Table', unit: 'Per unit', internalPrice: 8.00, externalPrice: 10.00 },
                    { id: 'chair', name: 'Chair', unit: 'Per unit', internalPrice: 0.80, externalPrice: 1.00 },
                    { id: 'chair_cover', name: 'Chair Cover', unit: 'Per unit', internalPrice: 4.00, externalPrice: 5.00 },
                    { id: 'red_carpet', name: 'Red Carpet (Main exit to stage)', unit: 'Per event', internalPrice: 160.00, externalPrice: 200.00 }
                ]
            },
            // Kitchen Facilities
            {
                category: 'Kitchen Facilities',
                items: [
                    { id: 'kitchen_cooking', name: 'Kitchen Area - Cooking', unit: 'Per event', internalPrice: 360.00, externalPrice: 450.00 },
                    { id: 'kitchen_non_cooking', name: 'Kitchen Area - Non-cooking', unit: 'Per event', internalPrice: 160.00, externalPrice: 200.00 },
                    { id: 'kitchen_small', name: 'Kitchen Equipment (< 50 tables)', unit: 'Per event', internalPrice: 280.00, externalPrice: 350.00 },
                    { id: 'kitchen_medium', name: 'Kitchen Equipment (51-65 tables)', unit: 'Per event', internalPrice: 360.00, externalPrice: 450.00 },
                    { id: 'kitchen_large', name: 'Kitchen Equipment (66+ tables)', unit: 'Per event', internalPrice: 480.00, externalPrice: 600.00 },
                    { id: 'kitchen_lpg', name: 'Kitchen LPG Gas', unit: 'Per m?', internalPrice: 18.83, externalPrice: 23.54 }
                ]
            },
            // Other Items
            {
                category: 'Other Items',
                items: [
                    { id: 'gong_stand', name: 'Gong & Stand', unit: 'Per event', internalPrice: 240.00, externalPrice: 300.00 },
                    { id: 'refrigerator', name: 'Refrigerator', unit: 'Per event', internalPrice: 40.00, externalPrice: 50.00 }
                ]
            },
            // Parking
            {
                category: 'Parking',
                items: [
                    { id: 'car_park_entry', name: 'Car Park - Per Entry', unit: 'Per entry', internalPrice: 4.00, externalPrice: 5.00 },
                    { id: 'car_park_event', name: 'Car Park - Per Event (max 160)', unit: 'Per event', internalPrice: 640.00, externalPrice: 800.00 }
                ]
            }
        ],
        
        // Page initialization
        init: function(params) {
            window.HallSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
        },
        
       // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.HallSharedModule.unregisterPage(this.pageId);
            
            // Cleanup page-specific events (with page namespace)
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            // Cleanup page-specific animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            // Clear any intervals/timeouts
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
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="hall-booking-create-page">
                    <!-- Page Header -->
                    <div class="page-header">
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="header-content">
                                        <i class="bi bi-building"></i>
                                        <div>
                                            <h1 class="title">Hall Booking</h1>
                                            <p class="subtitle">Temple Hall Reservation</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-end">
                                    <button type="button" class="btn btn-outline-secondary" id="btnCancel">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid">
                        <div class="row">
                            <!-- Left Side: Workflow Steps -->
                            <div class="col-lg-7">
                                <!-- Step Indicators -->
                                <div class="step-indicators">
                                    <div class="step-indicator active" data-step="1">
                                        <div class="step-number">1</div>
                                        <span class="step-label">Venue</span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="2">
                                        <div class="step-number">2</div>
                                        <span class="step-label">Date</span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="3">
                                        <div class="step-number">3</div>
                                        <span class="step-label">Time Slot</span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="4">
                                        <div class="step-number">4</div>
                                        <span class="step-label">Package</span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="5">
                                        <div class="step-number">5</div>
                                        <span class="step-label">Add-ons</span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="6">
                                        <div class="step-number">6</div>
                                        <span class="step-label">Details</span>
                                    </div>
                                </div>

                                <!-- Step Content -->
                                <div class="workflow-content">
                                    <!-- Step 1: Venue Selection -->
                                    <div class="step-content active" id="step1">
                                        <h3 class="step-title">
                                            <i class="bi bi-building"></i> Select Venue
                                        </h3>
                                        <div class="venues-grid">
                                            ${this.renderVenues()}
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-primary" id="btnStep1Next" disabled>
                                                Next: Choose Date <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 2: Date Selection -->
                                    <div class="step-content" id="step2">
                                        <h3 class="step-title">
                                            <i class="bi bi-calendar3"></i> Select Date
                                        </h3>
                                        <div class="calendar-container">
                                            ${this.renderCalendar()}
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-outline-secondary" id="btnStep2Back">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="button" class="btn btn-primary" id="btnStep2Next" disabled>
                                                Next: Choose Session <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 3: Time Slot Selection -->
                                    <div class="step-content" id="step3">
                                        <h3 class="step-title">
                                            <i class="bi bi-clock"></i> Choose Time Session
                                        </h3>
                                        <div class="time-slots-grid">
                                            ${this.renderTimeSlots()}
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-outline-secondary" id="btnStep3Back">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="button" class="btn btn-primary" id="btnStep3Next" disabled>
                                                Next: Choose Package <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 4: Package Selection -->
                                    <div class="step-content" id="step4">
                                        <h3 class="step-title">
                                            <i class="bi bi-box"></i> Choose Package
                                        </h3>
                                        <div class="packages-section">
                                            <h5>Main Package</h5>
                                            <div class="main-packages-list">
                                                ${this.renderMainPackages()}
                                            </div>
                                            <div id="subPackagesSection" style="display: none;">
                                                <h5>Meal Package Tiers</h5>
                                                <div id="subPackagesList"></div>
                                            </div>
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-outline-secondary" id="btnStep4Back">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="button" class="btn btn-primary" id="btnStep4Next">
                                                Next: Choose Add-ons <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 5: Additional Services -->
                                    <div class="step-content" id="step5">
                                        <h3 class="step-title">
                                            <i class="bi bi-plus-circle"></i> Additional Services
                                        </h3>
                                        <div class="addons-section">
                                            ${this.renderAdditionalServices()}
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-outline-secondary" id="btnStep5Back">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="button" class="btn btn-primary" id="btnStep5Next">
                                                Next: Customer Details <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 6: Extra Charges & Details -->
                                    <div class="step-content" id="step6">
                                        <h3 class="step-title">
                                            <i class="bi bi-receipt"></i> Extra Charges & Details
                                        </h3>
                                        
                                        <!-- Extra Charges Section -->
                                        <div class="extra-charges-section">
                                            <h5>Extra Charges</h5>
                                            <div class="extra-charges-form">
                                                <div class="row g-2 align-items-end">
                                                    <div class="col-md-6">
                                                        <label class="form-label">Description</label>
                                                        <input type="text" class="form-control" id="chargeDescription" placeholder="Enter charge description">
                                                    </div>
                                                    <div class="col-md-4">
                                                        <label class="form-label">Amount (RM)</label>
                                                        <input type="number" class="form-control" id="chargeAmount" step="0.01" placeholder="0.00">
                                                    </div>
                                                    <div class="col-md-2">
                                                        <button type="button" class="btn btn-success" id="btnAddCharge">
                                                            <i class="bi bi-plus"></i> Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="extra-charges-list" id="extraChargesList">
                                                <!-- Dynamic content -->
                                            </div>
                                        </div>

                                        <!-- Personal Information Form -->
                                        <div class="personal-info-section">
                                            <h5>Personal Information</h5>
                                            <form id="bookingForm" novalidate>
                                                <div class="row g-3">
                                                    <div class="col-md-6">
                                                        <label class="form-label">Name (Chinese) <span class="required">*</span></label>
                                                        <input type="text" class="form-control" name="name_chinese" required placeholder="Enter Chinese name">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">Name (English) <span class="required">*</span></label>
                                                        <input type="text" class="form-control" name="name_english" required placeholder="Enter English name">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">NRIC No. <span class="required">*</span></label>
                                                        <input type="text" class="form-control" name="nric" required placeholder="Enter NRIC number">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">Email <span class="required">*</span></label>
                                                        <input type="email" class="form-control" name="email" required placeholder="Enter email address">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">Contact No. <span class="required">*</span></label>
                                                        <input type="tel" class="form-control" name="contact_no" required placeholder="Enter contact number">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">Booking Date <span class="required">*</span></label>
                                                        <input type="date" class="form-control" name="booking_date" required>
                                                    </div>
                                                    <div class="col-12">
                                                        <label class="form-label">Special Requirements</label>
                                                        <textarea class="form-control" name="remarks" rows="3" placeholder="Enter any special requests or notes..."></textarea>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>

                                        <div class="step-actions">
                                            <button type="button" class="btn btn-outline-secondary" id="btnStep6Back">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="submit" class="btn btn-success" id="btnSubmitBooking">
                                                <i class="bi bi-check-circle"></i> Confirm Booking
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Side: Booking Summary -->
                            <div class="col-lg-5">
                                <div class="booking-summary-card">
                                    <div class="summary-header">
                                        <i class="bi bi-clipboard-check"></i>
                                        <span>Booking Summary</span>
                                    </div>
                                    
                                    <div class="summary-body">
                                        <!-- Venue Summary -->
                                        <div class="summary-section">
                                            <h6>Venue</h6>
                                            <div class="summary-row">
                                                <span>Location:</span>
                                                <span id="summaryVenue">Not selected</span>
                                            </div>
                                        </div>

                                        <!-- Date Summary -->
                                        <div class="summary-section">
                                            <h6>Date</h6>
                                            <div class="summary-row">
                                                <span>Date:</span>
                                                <span id="summaryDate">Not selected</span>
                                            </div>
                                        </div>

                                        <!-- Time Slot Summary -->
                                        <div class="summary-section">
                                            <h6>Time Session</h6>
                                            <div class="summary-row">
                                                <span>Session:</span>
                                                <span id="summaryTimeSlot">Not selected</span>
                                            </div>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong id="summaryTimeSlotPrice">RM 0.00</strong>
                                            </div>
                                        </div>

                                        <!-- Package Summary -->
                                        <div class="summary-section">
                                            <h6>Package</h6>
                                            <div id="summaryPackage">
                                                <p class="text-muted">No package selected</p>
                                            </div>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong id="summaryPackagePrice">RM 0.00</strong>
                                            </div>
                                        </div>

                                        <!-- Add-ons Summary -->
                                        <div class="summary-section">
                                            <h6>Additional Services</h6>
                                            <div id="summaryAddons">
                                                <p class="text-muted">No add-ons selected</p>
                                            </div>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong id="summaryAddonsPrice">RM 0.00</strong>
                                            </div>
                                        </div>

                                        <!-- Extra Charges Summary -->
                                        <div class="summary-section">
                                            <h6>Extra Charges</h6>
                                            <div id="summaryExtraCharges">
                                                <p class="text-muted">No extra charges</p>
                                            </div>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong id="summaryExtraChargesPrice">RM 0.00</strong>
                                            </div>
                                        </div>
                                    </div>
									<div class="summary-footer">
										<div class="summary-total">
                                            <span>Total Amount</span>
                                            <strong id="summaryTotal">RM 0.00</strong>
                                        </div>
                                    </div>

                                    <!-- Payment Options -->
                                    <div class="payment-section">
                                        <div class="payment-header">
                                            <i class="bi bi-credit-card"></i>
                                            <span>Payment Options</span>
                                        </div>
                                        <div class="payment-options">
                                            <label class="payment-option">
                                                <input type="radio" name="payment_method" value="full" checked>
                                                <div class="payment-content">
                                                    <i class="bi bi-wallet2"></i>
                                                    <div>
                                                        <strong>Full Payment</strong>
                                                    </div>
                                                </div>
                                            </label>
                                            <label class="payment-option">
                                                <input type="radio" name="payment_method" value="partial">
                                                <div class="payment-content">
                                                    <i class="bi bi-piggy-bank"></i>
                                                    <div>
                                                        <strong>Partial Payment</strong>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="payment-section">
                                        <div class="payment-header">
                                            <i class="bi bi-credit-card"></i>
                                            <span>Payment Mode</span>
                                        </div>
                                        <div class="payment-options">
                                            <label class="payment-option">
                                                <input type="radio" name="payment_mode" value="cash">
                                                <div class="payment-content">
                                                    <i class="bi bi-cash-coin"></i>
                                                    <div>
                                                        <strong>Cash</strong>
                                                    </div>
                                                </div>
                                            </label>
                                            <label class="payment-option">
                                                <input type="radio" name="payment_mode" value="eghl">
                                                <div class="payment-content">
                                                    <i class="bi bi-qr-code"></i>
                                                    <div>
                                                        <strong>EGHL QR</strong>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },

        // Render time slots
        renderTimeSlots: function() {
            return this.timeSessions.map(session => `
                <div class="time-slot-card" data-id="${session.id}" data-price="${session.price}" data-hours="${session.duration}">
                    <div class="time-icon">
                        <i class="${session.icon}"></i>
                    </div>
                    <h5>${session.name}</h5>
                    <p class="time">${session.time} ? ${session.duration}</p>
                    <p class="price">RM ${session.price.toFixed(2)}${session.priceUnit ? ' ' + session.priceUnit : ''}</p>
                </div>
            `).join('');
        },

        // Render main packages
        renderMainPackages: function() {
            return this.mainPackages.map(pkg => {
                // Safely encode the package data to avoid JSON parsing issues
                const packageDataEncoded = btoa(JSON.stringify(pkg));
                return `
                    <div class="package-item">
                        <input type="radio" class="main-package-radio" id="main_${pkg.id}" name="main_package" data-package-encoded="${packageDataEncoded}">
                        <label for="main_${pkg.id}">
                            <i class="bi bi-box-seam"></i>
                            <div>
                                <h5>${pkg.name}</h5>
                                <p>${pkg.description}</p>
                                ${pkg.id === 'standard' ? '<small class="text-success">Included in session price</small>' : 
                                  pkg.hasSubPackages ? '<small class="text-info">Select meal tier below</small>' : 
                                  `<small class="text-muted">Deposit: RM ${pkg.deposit.toFixed(2)}</small>`}
                            </div>
                        </label>
                    </div>
                `;
            }).join('');
        },

        // Render sub packages  
        renderSubPackages: function(subPackages) {
            return subPackages.map(subPkg => `
                <div class="package-item">
                    <input type="checkbox" class="sub-package-checkbox" id="sub_${subPkg.id}" data-price="${subPkg.price}">
                    <label for="sub_${subPkg.id}">
                        <i class="bi bi-collection"></i>
                        <div>
                            <h5>${subPkg.name}</h5>
                            <p>${subPkg.description}</p>
                            <strong class="text-primary">RM ${subPkg.price.toFixed(2)} per table</strong>
                        </div>
                    </label>
                </div>
            `).join('');
        },

        // Render additional services
        renderAdditionalServices: function() {
            return this.additionalServices.map(category => `
                <div class="addon-category">
                    <h6 class="addon-category-title">
                        <i class="bi bi-chevron-right"></i>
                        ${category.category}
                    </h6>
                    <div class="addon-items">
                        ${category.items.map(item => `
                            <div class="addon-item">
                                <input type="checkbox" class="addon-checkbox" id="addon_${item.id}" 
                                       data-price="${item.internalPrice}" 
                                       data-external-price="${item.externalPrice}"
                                       data-unit="${item.unit}">
                                <label for="addon_${item.id}">
                                    <div class="addon-info">
                                        <h6>${item.name}</h6>
                                        <p class="addon-unit">${item.unit}</p>
                                        <div class="addon-pricing">
                                            <span class="internal-price">Internal: RM ${item.internalPrice.toFixed(2)}</span>
                                            <span class="external-price">External: RM ${item.externalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div class="addon-quantity" style="display: none;">
                                        <input type="number" class="form-control addon-qty" min="1" value="1" data-id="${item.id}">
                                    </div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        },
        
        // Render venues
        renderVenues: function() {
            return this.venues.map(venue => `
                <div class="venue-card" data-id="${venue.id}">
                    <div class="venue-icon">
                        <i class="${venue.icon}"></i>
                    </div>
                    <h5>${venue.name}</h5>
                    <p class="venue-location">${venue.description}</p>
                </div>
            `).join('');
        },
        
        // Render calendar
        renderCalendar: function() {
            const now = new Date();
            const year = this.currentYear;
            const month = this.currentMonth;
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();
            
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            
            let calendarHtml = `
                <div class="calendar-header">
                    <button type="button" class="btn btn-outline-secondary" id="prevMonth">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <h4>${monthNames[month]} ${year}</h4>
                    <button type="button" class="btn btn-outline-secondary" id="nextMonth">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-days-header">
                        <div class="day-header">Sun</div>
                        <div class="day-header">Mon</div>
                        <div class="day-header">Tue</div>
                        <div class="day-header">Wed</div>
                        <div class="day-header">Thu</div>
                        <div class="day-header">Fri</div>
                        <div class="day-header">Sat</div>
                    </div>
                    <div class="calendar-days">
            `;
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < startingDayOfWeek; i++) {
                calendarHtml += `<div class="calendar-day empty"></div>`;
            }
            
            // Add days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const isToday = date.toDateString() === now.toDateString();
                const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dateString = date.toISOString().split('T')[0];
                
                let dayClass = 'calendar-day';
                if (isToday) dayClass += ' today';
                if (isPast) dayClass += ' past';
                if (isWeekend) dayClass += ' weekend';
                
                calendarHtml += `
                    <div class="${dayClass}" data-date="${dateString}" ${isPast ? 'data-disabled="true"' : ''}>
                        <span class="day-number">${day}</span>
                    </div>
                `;
            }
            
            calendarHtml += `
                    </div>
                </div>
                <div class="calendar-legend">
                    <div class="legend-item">
                        <div class="legend-indicator available"></div>
                        <span>Available</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-indicator weekend"></div>
                        <span>Weekends (Disabled)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-indicator selected"></div>
                        <span>Selected</span>
                    </div>
                </div>
            `;
            
            return calendarHtml;
        },
        
        // Initialize animations
        initAnimations: function() {
            // Fade in page elements
            gsap.from('.page-header', {
                opacity: 0,
                y: -20,
                duration: 0.5
            });
            
            gsap.from('.step-indicators', {
                opacity: 0,
                y: 20,
                duration: 0.5,
                delay: 0.2
            });
            
            gsap.from('#step1', {
                opacity: 0,
                x: -30,
                duration: 0.5,
                delay: 0.3
            });
            
            gsap.from('.booking-summary-card', {
                opacity: 0,
                x: 30,
                duration: 0.5,
                delay: 0.3
            });
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Venue selection
            $(document).on('click', '.venue-card', function() {
                $('.venue-card').removeClass('selected');
                $(this).addClass('selected');
                
                const venueData = self.venues.find(v => v.id === $(this).data('id'));
                self.selectedVenue = venueData;
                $('#btnStep1Next').prop('disabled', false);
                self.updateSummary();
            });
            
            // Calendar navigation
            $(document).on('click', '#prevMonth', function() {
                self.currentMonth--;
                if (self.currentMonth < 0) {
                    self.currentMonth = 11;
                    self.currentYear--;
                }
                $('.calendar-container').html(self.renderCalendar());
            });
            
            $(document).on('click', '#nextMonth', function() {
                self.currentMonth++;
                if (self.currentMonth > 11) {
                    self.currentMonth = 0;
                    self.currentYear++;
                }
                $('.calendar-container').html(self.renderCalendar());
            });
            
            // Date selection
            $(document).on('click', '.calendar-day:not(.past):not(.weekend):not(.empty)', function() {
                if ($(this).data('disabled')) return;
                
                $('.calendar-day').removeClass('selected');
                $(this).addClass('selected');
                
                self.selectedDate = $(this).data('date');
                $('#btnStep2Next').prop('disabled', false);
                self.updateSummary();
            });
            
            // Step navigation
            $(document).on('click', '#btnStep1Next', function() {
                if (self.selectedVenue) {
                    self.goToStep(2);
                }
            });
            
            $(document).on('click', '#btnStep2Back', function() {
                self.goToStep(1);
            });
            
            $(document).on('click', '#btnStep2Next', function() {
                if (self.selectedDate) {
                    self.goToStep(3);
                }
            });
            
            $(document).on('click', '#btnStep3Back', function() {
                self.goToStep(2);
            });
            
            $(document).on('click', '#btnStep3Next', function() {
                if (self.selectedTimeSlot) {
                    self.goToStep(4);
                }
            });
            
            $(document).on('click', '#btnStep4Back', function() {
                self.goToStep(3);
            });
            
            $(document).on('click', '#btnStep4Next', function() {
                self.goToStep(5);
            });
            
            $(document).on('click', '#btnStep5Back', function() {
                self.goToStep(4);
            });
            
            $(document).on('click', '#btnStep5Next', function() {
                self.goToStep(6);
            });
            
            $(document).on('click', '#btnStep6Back', function() {
                self.goToStep(5);
            });
            
            // Time slot selection (updated for step 3)
            $(document).on('click', '.time-slot-card', function() {
                $('.time-slot-card').removeClass('selected');
                $(this).addClass('selected');
                
                const sessionData = self.timeSessions.find(s => s.id == $(this).data('id'));
                self.selectedTimeSlot = sessionData;
                $('#btnStep3Next').prop('disabled', false);
                self.updateSummary();
            });

            // Main package selection
            $('.main-package-radio').on('change', function() {
                try {
                    // Decode the base64 encoded package data
                    const packageDataEncoded = $(this).data('package-encoded');
                    const packageData = JSON.parse(atob(packageDataEncoded));
                    self.selectedMainPackage = packageData;
                    
                    // Clear previous sub-package selections
                    self.selectedSubPackages = [];
                    
                    // Show/hide sub packages based on selection
                    if (packageData.hasSubPackages && packageData.subPackages) {
                        $('#subPackagesSection').show();
                        $('#subPackagesList').html(self.renderSubPackages(packageData.subPackages));
                        self.bindSubPackageEvents();
                        
                        // Animate sub-packages appearance
                        gsap.from('#subPackagesSection', {
                            opacity: 0,
                            y: 20,
                            duration: 0.3
                        });
                    } else {
                        $('#subPackagesSection').hide();
                    }
                    
                    self.updateSummary();
                } catch (error) {
                    console.error('Error parsing package data:', error);
                    TempleCore.showToast('Error selecting package. Please try again.', 'error');
                }
            });

            // Add-on selection
            $(document).on('change', '.addon-checkbox', function() {
                const $quantityDiv = $(this).closest('.addon-item').find('.addon-quantity');
                if ($(this).is(':checked')) {
                    $quantityDiv.show();
                } else {
                    $quantityDiv.hide();
                }
                self.updateSelectedAddons();
                self.updateSummary();
            });

            // Add-on quantity change
            $(document).on('input', '.addon-qty', function() {
                self.updateSelectedAddons();
                self.updateSummary();
            });

            // Extra charges
            $('#btnAddCharge').on('click', function() {
                self.addExtraCharge();
            });
            
            // Form submission
            $('#btnSubmitBooking').on('click', function(e) {
                e.preventDefault();
                if (self.validateForm()) {
                    self.submitBooking();
                }
            });
            
            // Cancel button
            $('#btnCancel').on('click', function() {
                TempleRouter.navigate('hall-booking/listing');
            });

            // Collapsible addon categories
            $(document).on('click', '.addon-category-title', function() {
                const $items = $(this).next('.addon-items');
                const $icon = $(this).find('i');
                
                $items.slideToggle();
                $icon.toggleClass('bi-chevron-right bi-chevron-down');
            });
        },

        // Bind sub package events
        bindSubPackageEvents: function() {
            const self = this;
            $('.sub-package-checkbox').on('change', function() {
                self.updateSelectedSubPackages();
                self.updateSummary();
            });
        },

        // Update selected sub packages
        updateSelectedSubPackages: function() {
            this.selectedSubPackages = [];
            $('.sub-package-checkbox:checked').each((index, el) => {
                const $label = $(el).next('label');
                this.selectedSubPackages.push({
                    id: $(el).attr('id'),
                    name: $label.find('h5').text(),
                    price: parseFloat($(el).data('price'))
                });
            });
        },

        // Update selected add-ons
        updateSelectedAddons: function() {
            this.selectedAddons = [];
            $('.addon-checkbox:checked').each((index, el) => {
                const $item = $(el).closest('.addon-item');
                const $label = $(el).next('label');
                const quantity = parseInt($item.find('.addon-qty').val()) || 1;
                
                this.selectedAddons.push({
                    id: $(el).attr('id'),
                    name: $label.find('h6').text(),
                    unit: $(el).data('unit'),
                    price: parseFloat($(el).data('price')),
                    quantity: quantity,
                    total: parseFloat($(el).data('price')) * quantity
                });
            });
        },

        // Add extra charge
        addExtraCharge: function() {
            const description = $('#chargeDescription').val().trim();
            const amount = parseFloat($('#chargeAmount').val());

            if (!description || !amount || amount <= 0) {
                TempleCore.showToast('Please enter valid description and amount', 'error');
                return;
            }

            const charge = {
                id: Date.now(),
                description: description,
                amount: amount
            };

            this.extraCharges.push(charge);
            this.renderExtraChargesList();
            this.updateSummary();

            // Clear inputs
            $('#chargeDescription').val('');
            $('#chargeAmount').val('');
        },

        // Remove extra charge
        removeExtraCharge: function(id) {
            this.extraCharges = this.extraCharges.filter(charge => charge.id !== id);
            this.renderExtraChargesList();
            this.updateSummary();
        },

        // Render extra charges list
        renderExtraChargesList: function() {
            const container = $('#extraChargesList');
            
            if (this.extraCharges.length === 0) {
                container.html('<p class="text-muted">No extra charges added</p>');
                return;
            }

            const html = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Amount (RM)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.extraCharges.map(charge => `
                                <tr>
                                    <td>${charge.description}</td>
                                    <td>RM ${charge.amount.toFixed(2)}</td>
                                    <td>
                                        <button type="button" class="btn btn-sm btn-danger" onclick="HallBookingCreatePage.removeExtraCharge(${charge.id})">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            container.html(html);
        },
        
        // Update summary panel
        updateSummary: function() {
            // Update venue
            if (this.selectedVenue) {
                $('#summaryVenue').text(`${this.selectedVenue.name} (${this.selectedVenue.description})`);
            } else {
                $('#summaryVenue').text('Not selected');
            }
            
            // Update date
            if (this.selectedDate) {
                const date = new Date(this.selectedDate);
                $('#summaryDate').text(date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }));
            } else {
                $('#summaryDate').text('Not selected');
            }
            
            // Update time slot
            if (this.selectedTimeSlot) {
                $('#summaryTimeSlot').text(`${this.selectedTimeSlot.name} (${this.selectedTimeSlot.time})`);
                $('#summaryTimeSlotPrice').text(`RM ${this.selectedTimeSlot.price.toFixed(2)}`);
            } else {
                $('#summaryTimeSlot').text('Not selected');
                $('#summaryTimeSlotPrice').text('RM 0.00');
            }
            
            // Update packages
            let packageHtml = '';
            let packageTotal = 0;
            
            if (this.selectedMainPackage) {
                // Show main package name but no additional cost for Standard Hall Rental
                if (this.selectedMainPackage.id === 'standard') {
                    packageHtml += `<div class="summary-row">
                        <span>${this.selectedMainPackage.name}</span>
                        <span>Included</span>
                    </div>`;
                } else if (this.selectedMainPackage.id === 'dinner') {
                    packageHtml += `<div class="summary-row">
                        <span>${this.selectedMainPackage.name}</span>
                        <span>Base Package</span>
                    </div>`;
                }
            }
            
            // Add sub-packages (these have the actual costs for dinner packages)
            if (this.selectedSubPackages.length > 0) {
                this.selectedSubPackages.forEach(pkg => {
                    packageHtml += `<div class="summary-row">
                        <span>${pkg.name}</span>
                        <span>RM ${pkg.price.toFixed(2)}</span>
                    </div>`;
                    packageTotal += pkg.price;
                });
            }
            
            if (packageHtml) {
                $('#summaryPackage').html(packageHtml);
                $('#summaryPackagePrice').text(`RM ${packageTotal.toFixed(2)}`);
            } else {
                $('#summaryPackage').html('<p class="text-muted">No package selected</p>');
                $('#summaryPackagePrice').text('RM 0.00');
            }
            
            // Update add-ons
            if (this.selectedAddons.length > 0) {
                let addonsHtml = '';
                let addonsTotal = 0;
                
                this.selectedAddons.forEach(addon => {
                    addonsHtml += `<div class="summary-row">
                        <span>${addon.name} (${addon.quantity}x)</span>
                        <span>RM ${addon.total.toFixed(2)}</span>
                    </div>`;
                    addonsTotal += addon.total;
                });
                
                $('#summaryAddons').html(addonsHtml);
                $('#summaryAddonsPrice').text(`RM ${addonsTotal.toFixed(2)}`);
            } else {
                $('#summaryAddons').html('<p class="text-muted">No add-ons selected</p>');
                $('#summaryAddonsPrice').text('RM 0.00');
            }

            // Update extra charges
            if (this.extraCharges.length > 0) {
                let extraHtml = '';
                let extraTotal = 0;
                
                this.extraCharges.forEach(charge => {
                    extraHtml += `<div class="summary-row">
                        <span>${charge.description}</span>
                        <span>RM ${charge.amount.toFixed(2)}</span>
                    </div>`;
                    extraTotal += charge.amount;
                });
                
                $('#summaryExtraCharges').html(extraHtml);
                $('#summaryExtraChargesPrice').text(`RM ${extraTotal.toFixed(2)}`);
            } else {
                $('#summaryExtraCharges').html('<p class="text-muted">No extra charges</p>');
                $('#summaryExtraChargesPrice').text('RM 0.00');
            }
            
            // Update total - only count sub-packages, add-ons, and extra charges (time slot already included)
            const timeSlotPrice = this.selectedTimeSlot ? this.selectedTimeSlot.price : 0;
            const addonsTotal = this.selectedAddons.reduce((sum, addon) => sum + addon.total, 0);
            const extraChargesTotal = this.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
            const total = timeSlotPrice + packageTotal + addonsTotal + extraChargesTotal;
            
            $('#summaryTotal').text(`RM ${total.toFixed(2)}`);
        },
        
        // Go to step
        goToStep: function(step) {
            // Animate current step out
            gsap.to(`.step-content.active`, {
                opacity: 0,
                x: -30,
                duration: 0.3,
                onComplete: () => {
                    $('.step-content').removeClass('active');
                    $(`#step${step}`).addClass('active');
                    
                    // Animate new step in
                    gsap.fromTo(`#step${step}`, 
                        { opacity: 0, x: 30 },
                        { opacity: 1, x: 0, duration: 0.3 }
                    );
                }
            });
            
            // Update step indicators
            $('.step-indicator').removeClass('active completed');
            for (let i = 1; i < step; i++) {
                $(`.step-indicator[data-step="${i}"]`).addClass('completed');
            }
            $(`.step-indicator[data-step="${step}"]`).addClass('active');
            
            this.currentStep = step;
        },
        
        // Validate form
        validateForm: function() {
            const form = document.getElementById('bookingForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return false;
            }
            return true;
        },
        
        // Submit booking
        submitBooking: function() {
            const formData = new FormData(document.getElementById('bookingForm'));
            const bookingData = {
                venue: this.selectedVenue,
                selected_date: this.selectedDate,
                time_slot: this.selectedTimeSlot,
                main_package: this.selectedMainPackage,
                sub_packages: this.selectedSubPackages,
                addons: this.selectedAddons,
                extra_charges: this.extraCharges,
                name_chinese: formData.get('name_chinese'),
                name_english: formData.get('name_english'),
                nric: formData.get('nric'),
                email: formData.get('email'),
                contact_no: formData.get('contact_no'),
                booking_date: formData.get('booking_date'),
                remarks: formData.get('remarks'),
                payment_method: $('input[name="payment_method"]:checked').val(),
                payment_mode: $('input[name="payment_mode"]:checked').val()
            };
            
            // Show loading
            const $submitBtn = $('#btnSubmitBooking');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            
            // Simulate API call
            setTimeout(() => {
                this.showSuccessAnimation();
                TempleCore.showToast('Booking confirmed successfully!', 'success');
                setTimeout(() => {
                    TempleRouter.navigate('hall-booking/listing');
                }, 2000);
            }, 1500);
        },
        
        // Show success animation
        showSuccessAnimation: function() {
            // Create custom confetti-like animation using GSAP
            const colors = ['#ff00ff', '#cc00cc', '#808000', '#9b9b4a', '#ffd700'];
            const container = $('<div class="success-confetti"></div>').appendTo('body');
            
            // Create particles
            for (let i = 0; i < 50; i++) {
                const particle = $('<div class="confetti-particle"></div>');
                particle.css({
                    left: '50%',
                    top: '50%',
                    background: colors[Math.floor(Math.random() * colors.length)],
                    width: Math.random() * 10 + 5 + 'px',
                    height: Math.random() * 10 + 5 + 'px'
                });
                container.append(particle);
                
                // Animate particle
                gsap.to(particle[0], {
                    x: (Math.random() - 0.5) * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    opacity: 0,
                    rotation: Math.random() * 360,
                    duration: Math.random() * 2 + 1,
                    ease: 'power2.out',
                    onComplete: () => particle.remove()
                });
            }
            
            // Remove container after animation
            setTimeout(() => container.remove(), 3000);
        }
    };
    
})(jQuery, window);