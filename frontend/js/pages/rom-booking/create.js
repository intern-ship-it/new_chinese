// js/pages/rom-booking/create.js
// Register of Marriage Booking Create Page with GSAP + AOS animations

(function($, window) {
    'use strict';
    if (!window.RomSharedModule) {
        window.RomSharedModule = {
            moduleId: 'rom',
			eventNamespace: 'rom',
            cssId: 'rom-css',
            cssPath: '/css/rom-booking.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Roms CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Rom page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Rom page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('Rom CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all rom-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Rom module cleaned up');
            }
        };
    }
    window.RomBookingCreatePage = {
        currentStep: 1,
        totalSteps: 5,
        formData: {},
        witnesses: [],
        uploadedDocuments: [],
        venues: [
            { id: 1, name: 'Main Temple Hall', location: 'Ground Floor' },
            { id: 2, name: 'Garden Pavilion', location: 'Outdoor Garden' },
            { id: 3, name: 'Sacred Chamber', location: 'Second Floor' }
        ],
		pageId: 'rom-create',
        eventNamespace: window.RomSharedModule.eventNamespace,
        
        // Page initialization
        init: function(params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.initializeStep1();
        },
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.RomSharedModule.unregisterPage(this.pageId);
            
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
                <div class="rom-booking-page">
                    <!-- Page Header -->
                    <div class="rom-booking-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="rom-booking-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="rom-booking-title-wrapper">
                                        <i class="bi bi-heart-fill rom-booking-header-icon"></i>
                                        <div>
                                            <h1 class="rom-booking-title">Register of Marriage Booking</h1>
                                            <p class="rom-booking-subtitle">Marriage Registration Booking</p>
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

                    <!-- Progress Stepper -->
                    <div class="container-fluid mb-4" data-aos="fade-up" data-aos-delay="200">
                        <div class="progress-stepper">
                            <div class="step-item active" data-step="1">
                                <div class="step-circle">
                                    <i class="bi bi-building"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Venue Selection</strong>
                                    <small>Choose Location</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="2">
                                <div class="step-circle">
                                    <i class="bi bi-calendar3"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Date Selection</strong>
                                    <small>Pick Date</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="3">
                                <div class="step-circle">
                                    <i class="bi bi-clock"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Session & Amount</strong>
                                    <small>AM/PM Session</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="4">
                                <div class="step-circle">
                                    <i class="bi bi-person-hearts"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Personal Details</strong>
                                    <small>Couple Info</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="5">
                                <div class="step-circle">
                                    <i class="bi bi-people"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Witnesses & Documents</strong>
                                    <small>Final Details</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Container -->
                    <div class="container-fluid">
                        <div class="row">
                            <!-- Left Panel - Form Steps -->
                            <div class="col-lg-8">
                                <div class="card shadow-sm rom-booking-form-card" data-aos="fade-right" data-aos-delay="300">
                                    <div class="card-body">
                                        <div id="stepContainer"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Panel - Booking Summary -->
                            <div class="col-lg-4">
                                <div class="booking-summary-container" data-aos="fade-left" data-aos-delay="400">
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-bag-check"></i>
                                        <span>Booking Summary</span>
                                    </div>
                                    
                                    <div class="card booking-summary-card mb-3">
                                        <div class="card-header booking-summary-header">
                                            <h5 class="mb-0">
                                                <i class="bi bi-receipt"></i> Booking Summary
                                            </h5>
                                        </div>
                                        <div class="card-body" id="bookingSummaryContent">
                                            <div class="summary-item">
                                                <span class="summary-label">Venue:</span>
                                                <span class="summary-value" id="summaryVenue">Not selected</span>
                                            </div>
                                            <div class="summary-item">
                                                <span class="summary-label">Date:</span>
                                                <span class="summary-value" id="summaryDate">Not selected</span>
                                            </div>
                                            <div class="summary-item">
                                                <span class="summary-label">Session:</span>
                                                <span class="summary-value" id="summarySession">Not selected</span>
                                            </div>
                                            <hr>
                                            <div class="summary-item total-amount">
                                                <span class="summary-label">Total Amount:</span>
                                                <span class="summary-value" id="summaryAmount">RM 0.00</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Mode Card -->
                                    <div class="card payment-mode-card" id="paymentModeCard" style="display: none;">
                                        <div class="card-header payment-mode-header">
                                            <h5 class="mb-0">
                                                <i class="bi bi-credit-card"></i> Payment Mode
                                            </h5>
                                        </div>
                                        <div class="card-body">
                                            <div class="payment-options">
                                                <div class="form-check payment-option">
                                                    <input class="form-check-input" type="radio" name="payment_mode" id="cashPayment" value="cash" checked>
                                                    <label class="form-check-label" for="cashPayment">
                                                        <i class="bi bi-cash"></i> Cash
                                                    </label>
                                                </div>
                                                <div class="form-check payment-option">
                                                    <input class="form-check-input" type="radio" name="payment_mode" id="cardPayment" value="card">
                                                    <label class="form-check-label" for="cardPayment">
                                                        <i class="bi bi-credit-card-2-front"></i> Card
                                                    </label>
                                                </div>
                                                <div class="form-check payment-option">
                                                    <input class="form-check-input" type="radio" name="payment_mode" id="bankTransfer" value="bank_transfer">
                                                    <label class="form-check-label" for="bankTransfer">
                                                        <i class="bi bi-bank"></i> Bank Transfer
                                                    </label>
                                                </div>
                                                <div class="form-check payment-option">
                                                    <input class="form-check-input" type="radio" name="payment_mode" id="qrPayment" value="qr_code">
                                                    <label class="form-check-label" for="qrPayment">
                                                        <i class="bi bi-qr-code"></i> QR Code
                                                    </label>
                                                </div>
                                            </div>
                                            
                                            <div class="confirm-booking-section mt-4">
                                                <button type="button" class="btn btn-primary btn-lg w-100" id="btnConfirmBooking" disabled>
                                                    <i class="bi bi-check-circle"></i> Confirm Booking
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Personal Details Modal (placed outside the main container) -->
                <div class="modal fade" id="personalDetailsModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-hearts"></i> Personal Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="personalDetailsForm" novalidate>
                                    <div class="row">
                                        <!-- Registrar Details -->
                                        <div class="col-md-4">
                                            <div class="section-header-gradient mb-3">
                                                <i class="bi bi-person-badge"></i>
                                                <span>Registrar Details</span>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Registrar Name *</label>
                                                <input type="text" class="form-control" name="registrar_name" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">IC *</label>
                                                <input type="text" class="form-control" name="registrar_ic" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Phone *</label>
                                                <input type="tel" class="form-control" name="registrar_phone" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" name="registrar_email">
                                            </div>
                                        </div>
                                        
                                        <!-- Bride Details -->
                                        <div class="col-md-4">
                                            <div class="section-header-gradient mb-3">
                                                <i class="bi bi-person-dress"></i>
                                                <span>Bride Details</span>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Bride Name *</label>
                                                <input type="text" class="form-control" name="bride_name" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">IC *</label>
                                                <input type="text" class="form-control" name="bride_ic" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Phone</label>
                                                <input type="tel" class="form-control" name="bride_phone">
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" name="bride_email">
                                            </div>
                                        </div>
                                        
                                        <!-- Groom Details -->
                                        <div class="col-md-4">
                                            <div class="section-header-gradient mb-3">
                                                <i class="bi bi-person-standing"></i>
                                                <span>Groom Details</span>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Groom Name *</label>
                                                <input type="text" class="form-control" name="groom_name" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">IC *</label>
                                                <input type="text" class="form-control" name="groom_ic" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Phone</label>
                                                <input type="tel" class="form-control" name="groom_phone">
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" name="groom_email">
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePersonalDetails">
                                    <i class="bi bi-check-circle"></i> Save Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.loadStep(1);
        },
        
        // Initialize animations
        initAnimations: function() {
            // AOS initialization
            AOS.init({
                duration: 1000,
                easing: 'ease-out-cubic',
                once: true,
                offset: 100
            });
            
            // GSAP header animation
            gsap.timeline()
                .from('.rom-booking-title', {
                    y: 30,
                    opacity: 0,
                    duration: 1,
                    ease: 'back.out(1.7)'
                })
                .from('.rom-booking-subtitle', {
                    y: 20,
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power3.out'
                }, '-=0.6');
                
            // Progress stepper animation
            gsap.from('.step-item', {
                scale: 0,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                delay: 0.5,
                ease: 'back.out(1.7)'
            });
        },
        
        // Initialize Step 1 - Venue Selection
        initializeStep1: function() {
            this.loadStep(1);
        },
        
        // Load specific step content
        loadStep: function(step) {
            this.currentStep = step;
            this.updateProgressStepper();
            
            const stepContent = this.getStepContent(step);
            $('#stepContainer').html(stepContent);
            
            // Initialize step-specific functionality
            this.initStepFunctionality(step);
            
            // Animate step transition
            gsap.fromTo('#stepContainer', 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );
        },
        
        // Get step content HTML
        getStepContent: function(step) {
            switch(step) {
                case 1:
                    return this.getStep1Content();
                case 2:
                    return this.getStep2Content();
                case 3:
                    return this.getStep3Content();
                case 4:
                    return this.getStep4Content();
                case 5:
                    return this.getStep5Content();
                default:
                    return '<p>Invalid step</p>';
            }
        },
        
        // Step 1: Venue Selection
        getStep1Content: function() {
            const venueOptions = this.venues.map(venue => `
                <div class="col-md-6 mb-3">
                    <div class="form-check-card venue-card">
                        <input class="form-check-input" type="radio" name="venue" id="venue_${venue.id}" value="${venue.id}">
                        <label class="form-check-label" for="venue_${venue.id}">
                            <i class="bi bi-building"></i>
                            <h5>${venue.name}</h5>
                            <p>${venue.location}</p>
                        </label>
                    </div>
                </div>
            `).join('');
            
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-building"></i>
                        <span>Step 1: Select Venue</span>
                    </div>
                    
                    <div class="row">
                        ${venueOptions}
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-primary" id="nextStep1" disabled>
                            Next: Choose Date <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },
        
        // Step 2: Date Selection
        getStep2Content: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-calendar3"></i>
                        <span>Step 2: Select Date</span>
                    </div>
                    
                    <div class="calendar-container">
                        <div class="calendar-header mb-3">
                            <button type="button" class="btn btn-outline-secondary" id="prevMonth">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <h4 id="currentMonth" class="mx-3"></h4>
                            <button type="button" class="btn btn-outline-secondary" id="nextMonth">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                        
                        <div class="calendar-grid" id="calendarGrid"></div>
                        
                        <div class="calendar-legend mt-3">
                            <small class="text-muted">
                                <span class="legend-item">
                                    <span class="legend-color available"></span> Available
                                </span>
                                <span class="legend-item">
                                    <span class="legend-color disabled"></span> Weekends (Disabled)
                                </span>
                                <span class="legend-item">
                                    <span class="legend-color selected"></span> Selected
                                </span>
                            </small>
                        </div>
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep2">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-primary" id="nextStep2" disabled>
                            Next: Choose Session <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },
        
        // Step 3: Session Selection
        getStep3Content: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-clock"></i>
                        <span>Step 3: Select Session & Amount</span>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="form-check-card session-card">
                                <input class="form-check-input" type="radio" name="session" id="session_am" value="am">
                                <label class="form-check-label" for="session_am">
                                    <i class="bi bi-sun"></i>
                                    <h5>Morning Session</h5>
                                    <p>9:00 AM - 12:00 PM</p>
                                    <div class="price-tag">RM 300.00</div>
                                </label>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="form-check-card session-card">
                                <input class="form-check-input" type="radio" name="session" id="session_pm" value="pm">
                                <label class="form-check-label" for="session_pm">
                                    <i class="bi bi-moon"></i>
                                    <h5>Afternoon Session</h5>
                                    <p>2:00 PM - 5:00 PM</p>
                                    <div class="price-tag">RM 350.00</div>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep3">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-primary" id="nextStep3" disabled>
                            Next: Personal Details <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },
        
        // Step 4: Personal Details (Modal)
        getStep4Content: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-person-hearts"></i>
                        <span>Step 4: Personal Details</span>
                    </div>
                    
                    <div class="row">
                        <div class="col-12">
                            <button type="button" class="btn btn-primary btn-lg w-100" id="openPersonalDetailsModal">
                                <i class="bi bi-person-plus"></i> Enter Personal Details
                            </button>
                            <div id="personalDetailsStatus" class="mt-3 text-center" style="display: none;">
                                <div class="alert alert-success">
                                    <i class="bi bi-check-circle"></i> Personal details completed successfully!
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep4">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-primary" id="nextStep4" disabled>
                            Next: Witnesses & Documents <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
                

            `;
        },
        
        // Step 5: Witnesses & Documents
        getStep5Content: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-people"></i>
                        <span>Step 5: Witnesses & Documents</span>
                    </div>
                    
                    <div class="row">
                        <!-- Witnesses Section -->
                        <div class="col-md-6">
                            <div class="witnesses-section">
                                <h5><i class="bi bi-people"></i> Witnesses</h5>
                                <div id="witnessesContainer"></div>
                                <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="addWitness">
                                    <i class="bi bi-plus-circle"></i> Add Witness
                                </button>
                            </div>
                        </div>
                        
                        <!-- Documents Section -->
                        <div class="col-md-6">
                            <div class="documents-section">
                                <h5><i class="bi bi-file-earmark-arrow-up"></i> Documents Upload</h5>
                                
                                <div class="document-upload-item mb-3">
                                    <label class="form-label">JPN Form</label>
                                    <input type="file" class="form-control" name="jpn_form" accept=".pdf,.jpg,.jpeg,.png">
                                </div>
                                
                                <div class="document-upload-item mb-3">
                                    <label class="form-label">NRIC Cards</label>
                                    <input type="file" class="form-control" name="nric_cards" accept=".pdf,.jpg,.jpeg,.png" multiple>
                                </div>
                                
                                <div class="document-upload-item mb-3">
                                    <label class="form-label">ID Proof (Address)</label>
                                    <input type="file" class="form-control" name="id_proof" accept=".pdf,.jpg,.jpeg,.png" multiple>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep5">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-success" id="completeStep5">
                            <i class="bi bi-check-circle"></i> Complete Booking
                        </button>
                    </div>
                </div>
            `;
        },
        
        // Initialize step-specific functionality
        initStepFunctionality: function(step) {
            switch(step) {
                case 1:
                    this.initStep1Events();
                    break;
                case 2:
                    this.initStep2Events();
                    this.initCalendar();
                    break;
                case 3:
                    this.initStep3Events();
                    break;
                case 4:
                    this.initStep4Events();
                    break;
                case 5:
                    this.initStep5Events();
                    this.showPaymentMode();
                    break;
            }
        },
        
        // Initialize Step 1 Events
        initStep1Events: function() {
            const self = this;
            
            $('input[name="venue"]').on('change.' + this.eventNamespace, function() {
                const venueId = $(this).val();
                const venue = self.venues.find(v => v.id == venueId);
                
                self.formData.venue = venue;
                self.updateBookingSummary();
                $('#nextStep1').prop('disabled', false);
                
                // Animate selection
                self.animateCardSelection($(this).closest('.form-check-card'));
            });
            
            $('#nextStep1').on('click.' + this.eventNamespace, function() {
                self.nextStep();
            });
        },
        
        // Initialize Step 2 Events
        initStep2Events: function() {
            const self = this;
            
            $('#prevStep2').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#nextStep2').on('click.' + this.eventNamespace, () => self.nextStep());
            $('#prevMonth').on('click.' + this.eventNamespace, () => self.changeMonth(-1));
            $('#nextMonth').on('click.' + this.eventNamespace, () => self.changeMonth(1));
        },
        
        // Initialize Step 3 Events
        initStep3Events: function() {
            const self = this;
            
            $('input[name="session"]').on('change.' + this.eventNamespace, function() {
                const session = $(this).val();
                const amount = session === 'am' ? 300 : 350;
                
                self.formData.session = session;
                self.formData.amount = amount;
                self.updateBookingSummary();
                $('#nextStep3').prop('disabled', false);
                
                // Animate selection
                self.animateCardSelection($(this).closest('.form-check-card'));
            });
            
            $('#prevStep3').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#nextStep3').on('click.' + this.eventNamespace, () => self.nextStep());
        },
        
        // Initialize Step 4 Events
        initStep4Events: function() {
            const self = this;
            
            $('#prevStep4').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#nextStep4').on('click.' + this.eventNamespace, () => self.nextStep());
            
            $('#openPersonalDetailsModal').on('click.' + this.eventNamespace, function() {
                // Ensure modal is appended to body to avoid z-index issues
                const $modal = $('#personalDetailsModal');
                if ($modal.parent().attr('id') !== 'page-container') {
                    $modal.appendTo('body');
                }
                
                // Initialize and show modal
                const modal = new bootstrap.Modal(document.getElementById('personalDetailsModal'), {
                    backdrop: 'static',
                    keyboard: false
                });
                modal.show();
            });
            
            $('#savePersonalDetails').on('click.' + this.eventNamespace, function() {
                if (self.validatePersonalDetails()) {
                    self.savePersonalDetailsData();
                    const modal = bootstrap.Modal.getInstance(document.getElementById('personalDetailsModal'));
                    modal.hide();
                    $('#personalDetailsStatus').show();
                    $('#nextStep4').prop('disabled', false);
                }
            });
        },
        
        // Initialize Step 5 Events
        initStep5Events: function() {
            const self = this;
            
            $('#prevStep5').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#addWitness').on('click.' + this.eventNamespace, () => self.addWitness());
            $('#completeStep5').on('click.' + this.eventNamespace, () => self.completeBooking());
            
            // Add initial witness
            this.addWitness();
        },
        
        // Calendar functionality
        currentDate: new Date(),
        selectedDate: null,
        
        initCalendar: function() {
            this.renderCalendar();
        },
        
        changeMonth: function(direction) {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
            this.renderCalendar();
        },
        
        renderCalendar: function() {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            $('#currentMonth').text(new Date(year, month).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            }));
            
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            let calendarHTML = '<div class="calendar-weekdays">';
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            weekdays.forEach(day => {
                calendarHTML += `<div class="weekday">${day}</div>`;
            });
            calendarHTML += '</div><div class="calendar-days">';
            
            // Empty cells for days before month starts
            for (let i = 0; i < firstDay; i++) {
                calendarHTML += '<div class="calendar-day empty"></div>';
            }
            
            // Days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday = this.isToday(date);
                const isPast = date < new Date().setHours(0,0,0,0);
                
                let classes = 'calendar-day';
                if (isWeekend) classes += ' weekend disabled';
                if (isToday) classes += ' today';
                if (isPast) classes += ' past disabled';
                if (this.selectedDate && this.isSameDate(date, this.selectedDate)) classes += ' selected';
                
                calendarHTML += `<div class="${classes}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}</div>`;
            }
            
            calendarHTML += '</div>';
            $('#calendarGrid').html(calendarHTML);
            
            this.bindCalendarEvents();
        },
        
        bindCalendarEvents: function() {
            const self = this;
            
            $('.calendar-day:not(.disabled)').on('click.' + this.eventNamespace, function() {
                $('.calendar-day').removeClass('selected');
                $(this).addClass('selected');
                
                const dateStr = $(this).data('date');
                self.selectedDate = new Date(dateStr);
                self.formData.date = dateStr;
                self.updateBookingSummary();
                $('#nextStep2').prop('disabled', false);
                
                // Animate selection
                gsap.fromTo(this, 
                    { scale: 0.8 },
                    { scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
                );
            });
        },
        
        isToday: function(date) {
            const today = new Date();
            return this.isSameDate(date, today);
        },
        
        isSameDate: function(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        },
        
        // Witness management
        addWitness: function() {
            const witnessIndex = this.witnesses.length;
            this.witnesses.push({});
            
            const witnessHTML = `
                <div class="witness-item mb-3" data-index="${witnessIndex}">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">Witness ${witnessIndex + 1}</h6>
                            <button type="button" class="btn btn-sm btn-outline-danger remove-witness">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <input type="text" class="form-control" placeholder="Name *" name="witness_name_${witnessIndex}" required>
                                </div>
                                <div class="col-md-4">
                                    <input type="text" class="form-control" placeholder="IC *" name="witness_ic_${witnessIndex}" required>
                                </div>
                                <div class="col-md-4">
                                    <input type="tel" class="form-control" placeholder="Phone" name="witness_phone_${witnessIndex}">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#witnessesContainer').append(witnessHTML);
            
            // Animate addition
            gsap.fromTo(`.witness-item[data-index="${witnessIndex}"]`, 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );
            
            // Bind remove event
            $(`.witness-item[data-index="${witnessIndex}"] .remove-witness`).on('click.' + this.eventNamespace, () => {
                this.removeWitness(witnessIndex);
            });
        },
        
        removeWitness: function(index) {
            const $witness = $(`.witness-item[data-index="${index}"]`);
            
            gsap.to($witness[0], {
                opacity: 0,
                y: -20,
                duration: 0.3,
                onComplete: () => {
                    $witness.remove();
                    this.witnesses.splice(index, 1);
                }
            });
        },
        
        // Show payment mode
        showPaymentMode: function() {
            $('#paymentModeCard').fadeIn();
            $('#btnConfirmBooking').prop('disabled', false);
        },
        
        // Navigation methods
        nextStep: function() {
            if (this.currentStep < this.totalSteps) {
                this.loadStep(this.currentStep + 1);
            }
        },
        
        prevStep: function() {
            if (this.currentStep > 1) {
                this.loadStep(this.currentStep - 1);
            }
        },
        
        // Update progress stepper
        updateProgressStepper: function() {
            $('.step-item').removeClass('active completed');
            
            for (let i = 1; i <= this.totalSteps; i++) {
                const $step = $(`.step-item[data-step="${i}"]`);
                if (i < this.currentStep) {
                    $step.addClass('completed');
                } else if (i === this.currentStep) {
                    $step.addClass('active');
                }
            }
        },
        
        // Update booking summary
        updateBookingSummary: function() {
            if (this.formData.venue) {
                $('#summaryVenue').text(this.formData.venue.name);
            }
            
            if (this.formData.date) {
                const date = new Date(this.formData.date);
                $('#summaryDate').text(date.toLocaleDateString('en-GB'));
            }
            
            if (this.formData.session) {
                const sessionText = this.formData.session === 'am' ? 'Morning (9:00 AM - 12:00 PM)' : 'Afternoon (2:00 PM - 5:00 PM)';
                $('#summarySession').text(sessionText);
            }
            
            if (this.formData.amount) {
                $('#summaryAmount').text(`RM ${this.formData.amount.toFixed(2)}`);
            }
        },
        
        // Animate card selection
        animateCardSelection: function($card) {
            // Reset all cards
            $('.form-check-card').removeClass('selected');
            gsap.set('.form-check-card', { scale: 1, borderColor: '#dee2e6' });
            
            // Animate selected card
            $card.addClass('selected');
            gsap.to($card[0], {
                scale: 1.05,
                borderColor: '#ff00ff',
                duration: 0.3,
                ease: 'back.out(1.7)'
            });
        },
        
        // Validate personal details
        validatePersonalDetails: function() {
            const form = $('#personalDetailsForm')[0];
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return false;
            }
            return true;
        },
        
        // Save personal details data
        savePersonalDetailsData: function() {
            const formData = new FormData($('#personalDetailsForm')[0]);
            const personalDetails = {};
            
            for (let [key, value] of formData.entries()) {
                personalDetails[key] = value;
            }
            
            this.formData.personalDetails = personalDetails;
        },
        
        // Complete booking
        completeBooking: function() {
            const self = this;
            
            // Collect all form data
            const bookingData = {
                ...this.formData,
                witnesses: this.witnesses,
                documents: this.uploadedDocuments,
                payment_mode: $('input[name="payment_mode"]:checked').val()
            };
            
            // Show loading state
            const $btn = $('#btnConfirmBooking');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<i class="spinner-border spinner-border-sm"></i> Processing...');
            
            // Simulate API call
            setTimeout(() => {
                TempleCore.showToast('ROM booking created successfully!', 'success');
                
                // Show receipt print confirmation
                self.showReceiptPrintConfirmation();
                
            }, 2000);
            
            // Actual API call (commented out for frontend-only demo)
            /*
            TempleAPI.post('/rom-booking', bookingData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('ROM booking created successfully!', 'success');
                        // Show receipt print confirmation
                        self.showReceiptPrintConfirmation(response.data.id);
                    }
                })
                .fail(function(error) {
                    TempleCore.showToast('Failed to create booking', 'error');
                    $btn.prop('disabled', false).html(originalText);
                });
            */
        },
        
        // Show receipt print confirmation dialog
        showReceiptPrintConfirmation: function(bookingId) {
            const self = this;
            const simulatedBookingId = bookingId || 'ROM' + Date.now(); // Simulate booking ID
            
            // Create confirmation modal
            const modalHTML = `
                <div class="modal fade" id="receiptPrintModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-check-circle"></i> Booking Confirmed!
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                <div class="mb-3">
                                    <i class="bi bi-heart-fill text-success" style="font-size: 48px;"></i>
                                </div>
                                <h4>ROM Booking Created Successfully!</h4>
                                <p class="text-muted">Booking ID: <strong>${simulatedBookingId}</strong></p>
                                <p>Would you like to print the official receipt now?</p>
                            </div>
                            <div class="modal-footer justify-content-center">
                                <button type="button" class="btn btn-secondary" id="btnLater">
                                    <i class="bi bi-x-circle"></i> Print Later
                                </button>
                                <button type="button" class="btn btn-primary" id="btnPrintReceipt">
                                    <i class="bi bi-printer"></i> Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#receiptPrintModal').remove();
            
            // Add modal to body
            $('body').append(modalHTML);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('receiptPrintModal'));
            modal.show();
            
            // Bind events
            $('#btnPrintReceipt').on('click.' + this.eventNamespace, function() {
                modal.hide();
                self.printReceipt(simulatedBookingId);
            });
            
            $('#btnLater').on('click.' + this.eventNamespace, function() {
                modal.hide();
                setTimeout(() => {
                    self.cleanup();
                    TempleRouter.navigate('rom-booking');
                }, 300);
            });
            
            // Auto navigate when modal is hidden without printing
            $('#receiptPrintModal').on('hidden.bs.modal.' + this.eventNamespace, function() {
                setTimeout(() => {
                    self.cleanup();
                    TempleRouter.navigate('rom-booking');
                }, 300);
            });
        },
        
        // Print receipt
        printReceipt: function(bookingId) {
            const self = this;
            
            if (window.RomReceiptPrintPage) {
                // Navigate to receipt print page
                self.cleanup();
                TempleRouter.navigate('rom-booking/print', { id: bookingId });
            } else {
                // Load receipt print script and then navigate
                const script = document.createElement('script');
                script.src = '/js/pages/rom-booking/print.js';
                script.onload = function() {
                    self.cleanup();
                    TempleRouter.navigate('rom-booking/print', { id: bookingId });
                };
                script.onerror = function() {
                    TempleCore.showToast('Error loading receipt printer', 'error');
                    self.cleanup();
                    TempleRouter.navigate('rom-booking');
                };
                document.head.appendChild(script);
            }
        },
        
        // Bind general events
        bindEvents: function() {
            const self = this;
            
            // Cancel button
            $('#btnCancel').on('click.' + this.eventNamespace, function() {
				self.cleanup();
                TempleRouter.navigate('rom-booking');
            });
            
            // Confirm booking button
            $('#btnConfirmBooking').on('click.' + this.eventNamespace, function() {
                self.completeBooking();
            });
        }
    };
    
})(jQuery, window);