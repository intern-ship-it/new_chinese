// js/pages/rom-booking/create.js
// Register of Marriage Booking Create Page with DYNAMIC VENUES, SESSIONS & PAYMENT MODES
// ✅ FIXED: Data persistence when navigating back & Confirm button enable issue
// ✅ FIXED: Witness data not saving - Now calls saveWitnessesData() before completeBooking()

(function ($, window) {
    'use strict';
    if (!window.RomSharedModule) {
        window.RomSharedModule = {
            moduleId: 'rom',
            eventNamespace: 'rom',
            cssId: 'rom-css',
            cssPath: '/css/rom-booking.css',
            activePages: new Set(),
            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('ROM CSS loaded');
                }
            },
            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`ROM page registered: ${pageId}`);
            },
            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`ROM page unregistered: ${pageId}`);
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
            console.log(`Cleaning up ${this.pageId}...`);
            window.RomSharedModule.unregisterPage(this.pageId);
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
        }
        };
    }


    window.RomBookingCreatePage = {
        currentStep: 1,
        totalSteps: 6,
        formData: {},
        couples: [],
        witnesses: [],
        uploadedDocuments: [],
        paymentModes: [],
        // ✅ NEW: File validation configuration
        fileValidation: {
            maxSize: 2 * 1024 * 1024, // 2MB in bytes
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
            allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
        },

        // ✅ NEW: File previews storage
        filePreviews: {
            jpn_form: null,
            nric_cards: [],
            id_proof: []
        },

        // Dynamic data storage
        venues: [],
        sessions: [],
        availableSessions: [],

        pageId: 'rom-create',
        eventNamespace: window.RomSharedModule.eventNamespace,

        init: function (params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadInitialData();
        },

        loadInitialData: function () {
            const self = this;

            $('#stepContainer').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted">Loading booking data...</p>
                </div>
            `);

            $.when(
                self.fetchActiveVenues(),
                self.fetchActiveSessions(),
                self.fetchPaymentModes()
            ).done(function () {
                console.log('✅ Data loaded successfully');
                console.log('Venues:', self.venues.length);
                console.log('Sessions:', self.sessions.length);
                console.log('Payment Modes:', self.paymentModes.length);

                self.initializeStep1();
            }).fail(function (error) {
                console.error('❌ Failed to load initial data:', error);
                TempleCore.showToast('Failed to load booking data', 'error');

                $('#stepContainer').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        <strong>Error loading data</strong>
                        <p>Failed to load booking data. Please refresh.</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                `);
            });
        },

        fetchActiveVenues: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/rom-booking/venue-master/active')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.venues = response.data;
                        deferred.resolve();
                    } else {
                        deferred.reject('Invalid venue data');
                    }
                })
                .fail(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise();
        },

        fetchActiveSessions: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/rom-booking/session-master/active')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.sessions = response.data;
                        deferred.resolve();
                    } else {
                        deferred.reject('Invalid session data');
                    }
                })
                .fail(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise();
        },

        fetchPaymentModes: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/masters/payment-modes/active', {})
                .done(function (response) {
                    if (response.success && response.data) {
                        self.paymentModes = response.data;
                        console.log('Payment modes loaded:', self.paymentModes);
                        deferred.resolve();
                    } else {
                        console.error('Invalid payment mode response');
                        deferred.reject('Invalid payment mode data');
                    }
                })
                .fail(function (error) {
                    console.error('Payment mode fetch error:', error);
                    deferred.reject(error);
                });

            return deferred.promise();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);
            window.RomSharedModule.unregisterPage(this.pageId);
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
                                    <strong>Venue</strong>
                                    <small>Location</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="2">
                                <div class="step-circle">
                                    <i class="bi bi-calendar3"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Date</strong>
                                    <small>Pick Date</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="3">
                                <div class="step-circle">
                                    <i class="bi bi-clock"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Session</strong>
                                    <small>Time & Amount</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="4">
                                <div class="step-circle">
                                    <i class="bi bi-person-badge"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Register</strong>
                                    <small>Register Info</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="5">
                                <div class="step-circle">
                                    <i class="bi bi-person-hearts"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Couple</strong>
                                    <small>Bride & Groom</small>
                                </div>
                            </div>
                            <div class="step-item" data-step="6">
                                <div class="step-circle">
                                    <i class="bi bi-people"></i>
                                </div>
                                <div class="step-label">
                                    <strong>Witnesses</strong>
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
                                        <div class="card-body" id="paymentModeBody">
                                            <!-- Payment modes will be loaded dynamically -->
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

        initAnimations: function () {
            AOS.init({
                duration: 1000,
                easing: 'ease-out-cubic',
                once: true,
                offset: 100
            });

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

            gsap.from('.step-item', {
                scale: 0,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                delay: 0.5,
                ease: 'back.out(1.7)'
            });
        },

        initializeStep1: function () {
            this.loadStep(1);
        },

        loadStep: function (step) {
            this.currentStep = step;
            this.updateProgressStepper();

            const stepContent = this.getStepContent(step);
            $('#stepContainer').html(stepContent);

            this.initStepFunctionality(step);

            gsap.fromTo('#stepContainer',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );
        },

        getStepContent: function (step) {
            switch (step) {
                case 1: return this.getStep1Content();
                case 2: return this.getStep2Content();
                case 3: return this.getStep3Content();
                case 4: return this.getStep4Content();
                case 5: return this.getStep5Content();
                case 6: return this.getStep6Content();
                default: return '<p>Invalid step</p>';
            }
        },

        // Step 1: Venue Selection
        getStep1Content: function () {
            if (!this.venues || this.venues.length === 0) {
                return `
                    <div class="step-content">
                        <div class="section-header-gradient mb-4">
                            <i class="bi bi-building"></i>
                            <span>Step 1: Select Venue</span>
                        </div>
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            <strong>No venues available</strong>
                            <p>Please contact administrator.</p>
                        </div>
                    </div>
                `;
            }

            // ✅ Get selected venue ID
            const selectedVenueId = this.formData.venue ? String(this.formData.venue.id) : null;

            const venueOptions = this.venues.map(venue => {
                const displayName = venue.name_primary || venue.name_secondary || 'Unnamed Venue';
                const location = venue.city || 'Location not specified';
                // ✅ Check if this venue was previously selected (using string comparison)
                const isSelected = String(venue.id) === selectedVenueId ? 'checked' : '';
                const cardClass = String(venue.id) === selectedVenueId ? 'form-check-card venue-card selected' : 'form-check-card venue-card';

                return `
                    <div class="col-md-6 mb-3">
                        <div class="${cardClass}">
                            <input class="form-check-input" type="radio" name="venue" id="venue_${venue.id}" value="${venue.id}" ${isSelected}>
                            <label class="form-check-label" for="venue_${venue.id}">
                                <i class="bi bi-building"></i>
                                <h5>${displayName}</h5>
                                ${venue.name_secondary ? `<p class="text-muted small">${venue.name_secondary}</p>` : ''}
                                <p><i class="bi bi-geo-alt"></i> ${location}</p>
                            </label>
                        </div>
                    </div>
                `;
            }).join('');

            // ✅ Enable next button if venue already selected
            const nextButtonDisabled = !selectedVenueId;

            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-building"></i>
                        <span>Step 1: Select Venue</span>
                    </div>
                    <div class="row">${venueOptions}</div>
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-primary" id="nextStep1" ${nextButtonDisabled ? 'disabled' : ''}>
                            Next: Choose Date <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },

        // Step 2: Date Selection
        getStep2Content: function () {
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
                                    <span class="legend-color disabled"></span> Weekends
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
                        <button type="button" class="btn btn-primary" id="nextStep2" ${this.formData.date ? '' : 'disabled'}>
                            Next: Choose Session <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },

        // Step 3: Session Selection
        getStep3Content: function () {
            this.filterSessionsByVenue();

            if (!this.availableSessions || this.availableSessions.length === 0) {
                return `
                    <div class="step-content">
                        <div class="section-header-gradient mb-4">
                            <i class="bi bi-clock"></i>
                            <span>Step 3: Select Session</span>
                        </div>
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            <strong>No sessions available</strong>
                            <p>No sessions for this venue.</p>
                        </div>
                        <div class="step-actions mt-4">
                            <button type="button" class="btn btn-outline-secondary" id="prevStep3">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                `;
            }

            // ✅ Get selected session ID
            const selectedSessionId = this.formData.session_id ? String(this.formData.session_id) : null;

            const sessionOptions = this.availableSessions.map(session => {
                const displayName = session.name_primary || session.name_secondary || 'Unnamed Session';
                const timeRange = session.formatted_time || `${session.from_time} - ${session.to_time}`;
                const amount = parseFloat(session.amount || 0);

                // ✅ Check if this session was previously selected (using string comparison)
                const isSelected = String(session.id) === selectedSessionId ? 'checked' : '';
                const cardClass = String(session.id) === selectedSessionId ? 'form-check-card session-card selected' : 'form-check-card session-card';

                let icon = 'bi-clock';
                if (session.from_time) {
                    const hour = parseInt(session.from_time.split(':')[0]);
                    if (hour < 12) icon = 'bi-sun';
                    else if (hour < 18) icon = 'bi-cloud-sun';
                    else icon = 'bi-moon';
                }

                return `
                    <div class="col-md-6 mb-3">
                        <div class="${cardClass}">
                            <input class="form-check-input" type="radio" name="session" id="session_${session.id}" 
                                   value="${session.id}" data-amount="${amount}" ${isSelected}>
                            <label class="form-check-label" for="session_${session.id}">
                                <i class="bi ${icon}"></i>
                                <h5>${displayName}</h5>
                                ${session.name_secondary ? `<p class="text-muted small">${session.name_secondary}</p>` : ''}
                                <p><i class="bi bi-clock"></i> ${timeRange}</p>
                                <div class="price-tag">RM ${amount.toFixed(2)}</div>
                            </label>
                        </div>
                    </div>
                `;
            }).join('');

            // ✅ Enable next button if session already selected
            const nextButtonDisabled = !selectedSessionId;

            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-clock"></i>
                        <span>Step 3: Select Session</span>
                    </div>
                    <div class="row">${sessionOptions}</div>
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep3">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-primary" id="nextStep3" ${nextButtonDisabled ? 'disabled' : ''}>
                            Next: Register Details <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },

        // ✅ FIXED Step 4: register Details with data persistence
        getStep4Content: function () {
            // ✅ Pre-fill values if they exist
            const register = this.formData.registerDetails || {};

            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-person-badge"></i>
                        <span>Step 4: Register Details</span>
                    </div>
                    
                    <form id="registerDetailsForm" novalidate>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Register Name *</label>
                                <input type="text" class="form-control" name="register_name" value="${register.register_name || ''}" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">IC *</label>
                                <input type="text" class="form-control" name="register_ic" value="${register.register_ic || ''}" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Phone *</label>
                                <input type="tel" class="form-control" name="register_phone" value="${register.register_phone || ''}" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" name="register_email" value="${register.register_email || ''}">
                            </div>
                        </div>
                    </form>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep4">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-primary" id="nextStep4">
                            Next: Couple Details <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },

        // ✅ FIXED Step 5: Bride & Groom Details with data persistence
        getStep5Content: function () {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-person-hearts"></i>
                        <span>Step 5: Bride & Groom Details</span>
                    </div>
                    
                    <div id="couplesContainer"></div>
                    
                    <div class="text-center mb-4">
                        <button type="button" class="btn btn-outline-primary" id="addMoreCouple">
                            <i class="bi bi-plus-circle"></i> Add More Couple
                        </button>
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep5">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                        <button type="button" class="btn btn-primary" id="nextStep5">
                            Next: Witnesses & Documents <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        },

        // ✅ FIXED Step 6: Witnesses & Documents with data persistence
        getStep6Content: function () {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-people"></i>
                        <span>Step 6: Witnesses & Documents</span>
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
                        
                        <!-- Documents Section with Preview -->
                        <div class="col-md-6">
                            <div class="documents-section">
                                <h5><i class="bi bi-file-earmark-arrow-up"></i> Documents Upload</h5>
                                
                                <!-- JPN Form -->
                                <div class="document-upload-item mb-3">
                                    <label class="form-label">
                                        <i class="bi bi-file-earmark-text text-primary"></i> JPN Form
                                    </label>
                                    <input type="file" class="form-control file-input" name="jpn_form" 
                                           accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" 
                                           data-field="jpn_form">
                                    <small class="text-muted d-block">PDF or Image (Max 2MB)</small>
                                    <div class="file-error text-danger small mt-1" style="display: none;"></div>
                                    <div class="file-preview mt-2" id="preview_jpn_form"></div>
                                </div>
                                
                                <!-- NRIC Cards -->
                                <div class="document-upload-item mb-3">
                                    <label class="form-label">
                                        <i class="bi bi-credit-card text-success"></i> NRIC Cards
                                    </label>
                                    <input type="file" class="form-control file-input" name="nric_cards" 
                                           accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" 
                                           multiple
                                           data-field="nric_cards">
                                    <small class="text-muted d-block">Multiple files allowed (Max 2MB each)</small>
                                    <div class="file-error text-danger small mt-1" style="display: none;"></div>
                                    <div class="file-preview mt-2" id="preview_nric_cards"></div>
                                </div>
                                
                                <!-- ID Proof -->
                                <div class="document-upload-item mb-3">
                                    <label class="form-label">
                                        <i class="bi bi-file-earmark-person text-info"></i> ID Proof (Address)
                                    </label>
                                    <input type="file" class="form-control file-input" name="id_proof" 
                                           accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" 
                                           multiple
                                           data-field="id_proof">
                                    <small class="text-muted d-block">Multiple files allowed (Max 2MB each)</small>
                                    <div class="file-error text-danger small mt-1" style="display: none;"></div>
                                    <div class="file-preview mt-2" id="preview_id_proof"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-info mt-3">
                        <i class="bi bi-info-circle"></i> 
                        <strong>Next:</strong> Please select your payment mode below to complete the booking.
                    </div>
                    
                    <div class="step-actions mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="prevStep6">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                    </div>
                </div>
            `;
        },
        validateFile: function (file) {
            const errors = [];

            // Check file size (2MB max)
            if (file.size > this.fileValidation.maxSize) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                errors.push(`File "${file.name}" is too large (${sizeMB}MB). Maximum size is 2MB.`);
            }

            // Check file type
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!this.fileValidation.allowedExtensions.includes(fileExtension)) {
                errors.push(`File "${file.name}" has an invalid format. Allowed: JPG, PNG, GIF, WEBP, PDF.`);
            }

            // Additional MIME type check
            if (!this.fileValidation.allowedTypes.includes(file.type)) {
                errors.push(`File "${file.name}" has an invalid file type.`);
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };
        },
        generateFilePreview: function (file, fieldName, index = 0) {
            const self = this;
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
            const isPDF = fileExtension === 'pdf';

            const previewId = `file_${fieldName}_${index}_${Date.now()}`;

            let previewHTML = `
                <div class="file-preview-item" data-preview-id="${previewId}">
                    <div class="file-preview-card">
            `;

            if (isImage) {
                // For images, show actual preview
                const reader = new FileReader();
                reader.onload = function (e) {
                    $(`[data-preview-id="${previewId}"] .preview-thumbnail`).css({
                        'background-image': `url(${e.target.result})`,
                        'background-size': 'cover',
                        'background-position': 'center'
                    });
                };
                reader.readAsDataURL(file);

                previewHTML += `
                    <div class="preview-thumbnail image-thumbnail"></div>
                `;
            } else if (isPDF) {
                // For PDFs, show PDF icon
                previewHTML += `
                    <div class="preview-thumbnail pdf-thumbnail">
                        <i class="bi bi-file-earmark-pdf text-danger"></i>
                    </div>
                `;
            }

            const fileSizeKB = (file.size / 1024).toFixed(2);
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const displaySize = file.size < 1024 * 1024 ? `${fileSizeKB} KB` : `${fileSizeMB} MB`;

            previewHTML += `
                        <div class="preview-info">
                            <div class="preview-filename" title="${file.name}">${file.name}</div>
                            <div class="preview-size text-muted small">${displaySize}</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger remove-file-preview" 
                                data-field="${fieldName}" data-index="${index}">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
            `;

            return previewHTML;
        },

        // ✅ NEW: Handle File Input Change
        handleFileInput: function (input) {
            const self = this;
            const fieldName = $(input).data('field');
            const files = input.files;
            const $errorDiv = $(input).closest('.document-upload-item').find('.file-error');
            const $previewDiv = $(`#preview_${fieldName}`);

            // Clear previous errors
            $errorDiv.hide().empty();

            if (!files || files.length === 0) {
                $previewDiv.empty();
                self.filePreviews[fieldName] = $(input).prop('multiple') ? [] : null;
                return;
            }

            let allErrors = [];
            let validFiles = [];

            // Validate each file
            Array.from(files).forEach((file, index) => {
                const validation = self.validateFile(file);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    allErrors = allErrors.concat(validation.errors);
                }
            });

            // Show errors if any
            if (allErrors.length > 0) {
                $errorDiv.html(allErrors.map(err => `<div class="mb-1"><i class="bi bi-exclamation-circle"></i> ${err}</div>`).join(''));
                $errorDiv.show();

                // Clear invalid files from input
                $(input).val('');
                $previewDiv.empty();
                self.filePreviews[fieldName] = $(input).prop('multiple') ? [] : null;

                // Show toast for first error
                TempleCore.showToast(allErrors[0], 'error');
                return;
            }

            // Generate previews for valid files
            $previewDiv.empty();

            if ($(input).prop('multiple')) {
                // Multiple files
                self.filePreviews[fieldName] = validFiles;
                validFiles.forEach((file, index) => {
                    const previewHTML = self.generateFilePreview(file, fieldName, index);
                    $previewDiv.append(previewHTML);
                });
            } else {
                // Single file
                self.filePreviews[fieldName] = validFiles[0];
                const previewHTML = self.generateFilePreview(validFiles[0], fieldName, 0);
                $previewDiv.html(previewHTML);
            }

            // Bind remove button events
            $previewDiv.find('.remove-file-preview').off('click.' + this.eventNamespace).on('click.' + this.eventNamespace, function () {
                const field = $(this).data('field');
                const index = $(this).data('index');
                self.removeFilePreview(field, index);
            });

            console.log('✅ Files validated and previewed:', fieldName, validFiles.length);
        },

        // ✅ NEW: Remove File Preview
        removeFilePreview: function (fieldName, index) {
            const $input = $(`input[data-field="${fieldName}"]`);
            const $previewDiv = $(`#preview_${fieldName}`);

            if ($input.prop('multiple')) {
                // Multiple files - remove specific file
                $(`[data-preview-id="file_${fieldName}_${index}"]`).remove();

                // Update file list
                const dt = new DataTransfer();
                const files = $input[0].files;

                Array.from(files).forEach((file, i) => {
                    if (i !== index) {
                        dt.items.add(file);
                    }
                });

                $input[0].files = dt.files;
                this.filePreviews[fieldName] = Array.from(dt.files);
            } else {
                // Single file - clear completely
                $input.val('');
                $previewDiv.empty();
                this.filePreviews[fieldName] = null;
            }

            console.log('🗑️ File preview removed:', fieldName, index);
        },


        filterSessionsByVenue: function () {
            if (!this.formData.venue || !this.formData.venue.id) {
                this.availableSessions = [];
                return;
            }

            const venueId = String(this.formData.venue.id);
            this.availableSessions = this.sessions.filter(session => {
                if (!session.venue_ids || !Array.isArray(session.venue_ids)) {
                    return false;
                }
                // ✅ Use string comparison for venue ID matching
                return session.venue_ids.some(id => String(id) === venueId);
            });
        },

        initStepFunctionality: function (step) {
            switch (step) {
                case 1: this.initStep1Events(); break;
                case 2: this.initStep2Events(); this.initCalendar(); break;
                case 3: this.initStep3Events(); break;
                case 4: this.initStep4Events(); break;
                case 5: this.initStep5Events(); this.restoreCouplesData(); break; // ✅ Restore couples
                case 6: this.initStep6Events(); this.restoreWitnessesData(); this.showPaymentMode(); break; // ✅ Restore witnesses
            }
        },

        initStep1Events: function () {
            const self = this;
            $('input[name="venue"]').on('change.' + this.eventNamespace, function () {
                const venueId = $(this).val();
                // ✅ Use string comparison for consistency
                const venue = self.venues.find(v => String(v.id) === String(venueId));
                if (venue) {
                    self.formData.venue = venue;
                    self.updateBookingSummary();
                    $('#nextStep1').prop('disabled', false);
                    self.animateCardSelection($(this).closest('.form-check-card'));
                }
            });
            $('#nextStep1').on('click.' + this.eventNamespace, () => self.nextStep());
        },

        initStep2Events: function () {
            const self = this;
            $('#prevStep2').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#nextStep2').on('click.' + this.eventNamespace, () => self.nextStep());
            $('#prevMonth').on('click.' + this.eventNamespace, () => self.changeMonth(-1));
            $('#nextMonth').on('click.' + this.eventNamespace, () => self.changeMonth(1));
        },

        initStep3Events: function () {
            const self = this;
            $('input[name="session"]').on('change.' + this.eventNamespace, function () {
                const sessionId = $(this).val();
                const amount = parseFloat($(this).data('amount'));
                // ✅ Use string comparison for consistency
                const session = self.availableSessions.find(s => String(s.id) === String(sessionId));
                if (session) {
                    self.formData.session = session;
                    self.formData.session_id = sessionId;
                    self.formData.amount = amount;
                    self.updateBookingSummary();
                    $('#nextStep3').prop('disabled', false);
                    self.animateCardSelection($(this).closest('.form-check-card'));
                }
            });
            $('#prevStep3').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#nextStep3').on('click.' + this.eventNamespace, () => self.nextStep());
        },

        initStep4Events: function () {
            const self = this;
            $('#prevStep4').on('click.' + this.eventNamespace, () => self.prevStep());
            $('#nextStep4').on('click.' + this.eventNamespace, function () {
                if (self.validateRegisterDetails()) {
                    self.saveRegisterData();
                    self.nextStep();
                }
            });
        },

        // ✅ FIXED Step 5 Events with proper data restoration
        initStep5Events: function () {
            const self = this;

            // ✅ Only add first couple if couples array is empty
            if (this.couples.length === 0) {
                this.addCouple();
            }

            $('#addMoreCouple').on('click.' + this.eventNamespace, function () {
                self.addCouple();
            });

            $('#prevStep5').on('click.' + this.eventNamespace, function () {
                // ✅ Save current data before going back
                self.saveAllCouplesData();
                self.prevStep();
            });

            $('#nextStep5').on('click.' + this.eventNamespace, function () {
                if (self.validateAllCouples()) {
                    self.saveAllCouplesData();
                    self.nextStep();
                }
            });
        },

        // ✅ NEW: Restore couples data when returning to step 5
        restoreCouplesData: function () {
            const self = this;

            // If we have saved couples data, restore it
            if (this.formData.couples && this.formData.couples.length > 0) {
                // Clear the couples array and container
                this.couples = [];
                $('#couplesContainer').empty();

                // Recreate each couple with saved data
                this.formData.couples.forEach((coupleData, index) => {
                    this.couples.push(coupleData);

                    const coupleHTML = `
                        <div class="couple-item mb-4" data-index="${index}">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center bg-light">
                                    <h5 class="mb-0">
                                        <i class="bi bi-heart-fill text-danger"></i> Couple ${index + 1}
                                    </h5>
                                    ${index > 0 ? `
                                        <button type="button" class="btn btn-sm btn-outline-danger remove-couple">
                                            <i class="bi bi-trash"></i> Remove
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <!-- Bride Details -->
                                        <div class="col-md-6">
                                            <div class="section-header-gradient mb-3">
                                                <i class="bi bi-person-dress"></i>
                                                <span>Bride Details</span>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Bride Name *</label>
                                                <input type="text" class="form-control" name="bride_name_${index}" value="${coupleData.bride.name || ''}" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">IC *</label>
                                                <input type="text" class="form-control" name="bride_ic_${index}" value="${coupleData.bride.ic || ''}" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Phone</label>
                                                <input type="tel" class="form-control" name="bride_phone_${index}" value="${coupleData.bride.phone || ''}">
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" name="bride_email_${index}" value="${coupleData.bride.email || ''}">
                                            </div>
                                        </div>
                                        
                                        <!-- Groom Details -->
                                        <div class="col-md-6">
                                            <div class="section-header-gradient mb-3">
                                                <i class="bi bi-person-standing"></i>
                                                <span>Groom Details</span>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Groom Name *</label>
                                                <input type="text" class="form-control" name="groom_name_${index}" value="${coupleData.groom.name || ''}" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">IC *</label>
                                                <input type="text" class="form-control" name="groom_ic_${index}" value="${coupleData.groom.ic || ''}" required>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Phone</label>
                                                <input type="tel" class="form-control" name="groom_phone_${index}" value="${coupleData.groom.phone || ''}">
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" name="groom_email_${index}" value="${coupleData.groom.email || ''}">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;

                    $('#couplesContainer').append(coupleHTML);

                    // Bind remove event
                    if (index > 0) {
                        $(`.couple-item[data-index="${index}"] .remove-couple`).on('click.' + this.eventNamespace, () => {
                            this.removeCouple(index);
                        });
                    }
                });
            }
        },

        // ✅ NEW: Restore witnesses data when returning to step 6
        restoreWitnessesData: function () {
            const self = this;

            // If we have saved witnesses, restore them
            if (this.witnesses && this.witnesses.length > 0) {
                $('#witnessesContainer').empty();

                this.witnesses.forEach((witnessData, index) => {
                    const witnessHTML = `
                        <div class="witness-item mb-3" data-index="${index}">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0">Witness ${index + 1}</h6>
                                    <button type="button" class="btn btn-sm btn-outline-danger remove-witness">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <input type="text" class="form-control" placeholder="Name *" name="witness_name_${index}" value="${witnessData.name || ''}" required>
                                        </div>
                                        <div class="col-md-4">
                                            <input type="text" class="form-control" placeholder="IC *" name="witness_ic_${index}" value="${witnessData.ic || ''}" required>
                                        </div>
                                        <div class="col-md-4">
                                            <input type="tel" class="form-control" placeholder="Phone" name="witness_phone_${index}" value="${witnessData.phone || ''}">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;

                    $('#witnessesContainer').append(witnessHTML);

                    $(`.witness-item[data-index="${index}"] .remove-witness`).on('click.' + this.eventNamespace, () => {
                        this.removeWitness(index);
                    });
                });
            } else {
                // Add first witness if none exist
                this.addWitness();
            }
        },

        addCouple: function () {
            const coupleIndex = this.couples.length;
            this.couples.push({});

            const coupleHTML = `
                <div class="couple-item mb-4" data-index="${coupleIndex}">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center bg-light">
                            <h5 class="mb-0">
                                <i class="bi bi-heart-fill text-danger"></i> Couple ${coupleIndex + 1}
                            </h5>
                            ${coupleIndex > 0 ? `
                                <button type="button" class="btn btn-sm btn-outline-danger remove-couple">
                                    <i class="bi bi-trash"></i> Remove
                                </button>
                            ` : ''}
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <!-- Bride Details -->
                                <div class="col-md-6">
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-person-dress"></i>
                                        <span>Bride Details</span>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Bride Name *</label>
                                        <input type="text" class="form-control" name="bride_name_${coupleIndex}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">IC *</label>
                                        <input type="text" class="form-control" name="bride_ic_${coupleIndex}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-control" name="bride_phone_${coupleIndex}">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" name="bride_email_${coupleIndex}">
                                    </div>
                                </div>
                                
                                <!-- Groom Details -->
                                <div class="col-md-6">
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-person-standing"></i>
                                        <span>Groom Details</span>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Groom Name *</label>
                                        <input type="text" class="form-control" name="groom_name_${coupleIndex}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">IC *</label>
                                        <input type="text" class="form-control" name="groom_ic_${coupleIndex}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Phone</label>
                                        <input type="tel" class="form-control" name="groom_phone_${coupleIndex}">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" name="groom_email_${coupleIndex}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#couplesContainer').append(coupleHTML);

            gsap.fromTo(`.couple-item[data-index="${coupleIndex}"]`,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );

            if (coupleIndex > 0) {
                $(`.couple-item[data-index="${coupleIndex}"] .remove-couple`).on('click.' + this.eventNamespace, () => {
                    this.removeCouple(coupleIndex);
                });
            }
        },

        removeCouple: function (index) {
            const $couple = $(`.couple-item[data-index="${index}"]`);

            gsap.to($couple[0], {
                opacity: 0,
                y: -20,
                duration: 0.3,
                onComplete: () => {
                    $couple.remove();
                    this.couples.splice(index, 1);
                    this.renumberCouples();
                }
            });
        },

        renumberCouples: function () {
            $('.couple-item').each((index, element) => {
                $(element).attr('data-index', index);
                $(element).find('.card-header h5').html(`
                    <i class="bi bi-heart-fill text-danger"></i> Couple ${index + 1}
                `);

                $(element).find('input[name^="bride_name_"]').attr('name', `bride_name_${index}`);
                $(element).find('input[name^="bride_ic_"]').attr('name', `bride_ic_${index}`);
                $(element).find('input[name^="bride_phone_"]').attr('name', `bride_phone_${index}`);
                $(element).find('input[name^="bride_email_"]').attr('name', `bride_email_${index}`);
                $(element).find('input[name^="groom_name_"]').attr('name', `groom_name_${index}`);
                $(element).find('input[name^="groom_ic_"]').attr('name', `groom_ic_${index}`);
                $(element).find('input[name^="groom_phone_"]').attr('name', `groom_phone_${index}`);
                $(element).find('input[name^="groom_email_"]').attr('name', `groom_email_${index}`);
            });
        },

        validateAllCouples: function () {
            let isValid = true;

            $('.couple-item').each(function () {
                const $requiredFields = $(this).find('input[required]');

                $requiredFields.each(function () {
                    if (!$(this).val().trim()) {
                        $(this).addClass('is-invalid');
                        isValid = false;
                    } else {
                        $(this).removeClass('is-invalid');
                    }
                });
            });

            if (!isValid) {
                TempleCore.showToast('Please fill in all required fields', 'error');
            }

            return isValid;
        },

        saveAllCouplesData: function () {
            const couplesData = [];

            $('.couple-item').each(function (index) {
                const coupleData = {
                    bride: {
                        name: $(this).find(`input[name="bride_name_${index}"]`).val(),
                        ic: $(this).find(`input[name="bride_ic_${index}"]`).val(),
                        phone: $(this).find(`input[name="bride_phone_${index}"]`).val(),
                        email: $(this).find(`input[name="bride_email_${index}"]`).val()
                    },
                    groom: {
                        name: $(this).find(`input[name="groom_name_${index}"]`).val(),
                        ic: $(this).find(`input[name="groom_ic_${index}"]`).val(),
                        phone: $(this).find(`input[name="groom_phone_${index}"]`).val(),
                        email: $(this).find(`input[name="groom_email_${index}"]`).val()
                    }
                };
                couplesData.push(coupleData);
            });

            this.formData.couples = couplesData;
        },

        // ✅ FIXED Step 6 Events with data saving before going back
        initStep6Events: function () {
            const self = this;

            $('#prevStep6').on('click.' + this.eventNamespace, function () {
                self.saveWitnessesData();
                self.prevStep();
            });

            $('#addWitness').on('click.' + this.eventNamespace, () => self.addWitness());

            // ✅ NEW: Bind file input change events
            $('.file-input').on('change.' + this.eventNamespace, function () {
                self.handleFileInput(this);
            });
        },

        // ✅ Save witnesses data - collects data from DOM
        saveWitnessesData: function () {
            const witnessesData = [];

            $('.witness-item').each(function (index) {
                const witnessData = {
                    name: $(this).find(`input[name="witness_name_${index}"]`).val(),
                    ic: $(this).find(`input[name="witness_ic_${index}"]`).val(),
                    phone: $(this).find(`input[name="witness_phone_${index}"]`).val()
                };

                // Only add if name is filled
                if (witnessData.name && witnessData.name.trim()) {
                    witnessesData.push(witnessData);
                }
            });

            this.witnesses = witnessesData;
            console.log('📝 Witnesses data saved:', this.witnesses);
        },

        validateRegisterDetails: function () {
            const form = $('#registerDetailsForm')[0];
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return false;
            }
            return true;
        },

        saveRegisterData: function () {
            const formData = new FormData($('#registerDetailsForm')[0]);
            const registerDetails = {};
            for (let [key, value] of formData.entries()) {
                registerDetails[key] = value;
            }
            this.formData.registerDetails = registerDetails;
        },

        currentDate: new Date(),
        selectedDate: null,

        initCalendar: function () {
            // ✅ If date already selected, set it
            if (this.formData.date) {
                this.selectedDate = new Date(this.formData.date);
                // Set currentDate to show the month of selected date
                this.currentDate = new Date(this.selectedDate);
            }
            this.renderCalendar();
        },

        changeMonth: function (direction) {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
            this.renderCalendar();
        },

        renderCalendar: function () {
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

            for (let i = 0; i < firstDay; i++) {
                calendarHTML += '<div class="calendar-day empty"></div>';
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday = this.isToday(date);
                const isPast = date < new Date().setHours(0, 0, 0, 0);

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

        bindCalendarEvents: function () {
            const self = this;
            $('.calendar-day:not(.disabled)').on('click.' + this.eventNamespace, function () {
                $('.calendar-day').removeClass('selected');
                $(this).addClass('selected');
                const dateStr = $(this).data('date');
                self.selectedDate = new Date(dateStr);
                self.formData.date = dateStr;
                self.updateBookingSummary();
                $('#nextStep2').prop('disabled', false);
                gsap.fromTo(this, { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
            });
        },

        isToday: function (date) {
            const today = new Date();
            return this.isSameDate(date, today);
        },

        isSameDate: function (date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getDate() === date2.getDate();
        },

        addWitness: function () {
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

            gsap.fromTo(`.witness-item[data-index="${witnessIndex}"]`,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );

            $(`.witness-item[data-index="${witnessIndex}"] .remove-witness`).on('click.' + this.eventNamespace, () => {
                this.removeWitness(witnessIndex);
            });
        },

        removeWitness: function (index) {
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

        // ✅ FIXED: Payment mode display with proper button enabling
        showPaymentMode: function () {
            const self = this;

            console.log('📍 showPaymentMode called');
            console.log('📍 Payment modes available:', this.paymentModes);
            console.log('📍 Payment mode IDs and types:', this.paymentModes.map(m => ({ id: m.id, type: typeof m.id, name: m.name })));

            if (!this.paymentModes || this.paymentModes.length === 0) {
                console.warn('⚠️ No payment modes available');
                $('#paymentModeCard').html(`
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        No payment modes available
                    </div>
                `).show();
                return;
            }

            // ✅ Check if payment mode was already selected
            const selectedModeId = this.formData.payment_mode ? String(this.formData.payment_mode.id) : null;

            const paymentModeHTML = this.paymentModes.map(mode => {
                let icon = '';

                if (mode.icon_display_url_data) {
                    if (mode.icon_display_url_data.type === 'bootstrap') {
                        icon = `<i class="bi ${mode.icon_display_url_data.value}"></i>`;
                    } else if (mode.icon_display_url_data.type === 'upload') {
                        icon = `<img src="${mode.icon_display_url_data.value}" alt="${mode.name}" style="width: 24px; height: 24px; object-fit: contain;">`;
                    }
                } else {
                    icon = '<i class="bi bi-currency-dollar"></i>';
                }

                // ✅ FIX: Use string comparison for consistency
                const isSelected = String(mode.id) === selectedModeId ? 'checked' : '';
                const optionClass = String(mode.id) === selectedModeId ? 'payment-mode-option selected' : 'payment-mode-option';

                return `
                    <div class="${optionClass}" data-mode-id="${mode.id}">
                        <div class="payment-mode-card">
                            <input type="radio" name="payment_mode" id="payment_${mode.id}" value="${mode.id}" class="payment-mode-input" ${isSelected}>
                            <label for="payment_${mode.id}" class="payment-mode-label">
                                <div class="payment-mode-icon">
                                    ${icon}
                                </div>
                                <div class="payment-mode-name">${mode.name}</div>
                                ${mode.description ? `<small class="text-muted">${mode.description}</small>` : ''}
                            </label>
                        </div>
                    </div>
                `;
            }).join('');

            // ✅ Enable button if payment mode already selected
            const buttonDisabled = !selectedModeId;

            const paymentHTML = `
                <div class="payment-modes-grid">
                    ${paymentModeHTML}
                </div>
                <div class="confirm-booking-section mt-4">
                    <button type="button" class="btn btn-primary btn-lg w-100" id="btnConfirmBooking" ${buttonDisabled ? 'disabled' : ''}>
                        <i class="bi bi-check-circle"></i> Confirm Booking
                    </button>
                </div>
            `;

            $('#paymentModeBody').html(paymentHTML);
            $('#paymentModeCard').fadeIn();

            console.log('✅ Payment mode HTML generated');

            // ✅ Bind payment mode selection - CRITICAL FIX
            $('input[name="payment_mode"]').off('change.' + this.eventNamespace).on('change.' + this.eventNamespace, function () {
                const selectedModeId = $(this).val();

                // ✅ FIX: Convert to string for comparison (IDs might be strings or numbers)
                const selectedMode = self.paymentModes.find(m => String(m.id) === String(selectedModeId));

                console.log('💳 Payment mode changed:', selectedModeId);
                console.log('💳 All payment modes:', self.paymentModes.map(m => ({ id: m.id, type: typeof m.id })));
                console.log('💳 Selected mode object:', selectedMode);

                if (selectedMode) {
                    self.formData.payment_mode = selectedMode;

                    // ✅ Enable the confirm button
                    $('#btnConfirmBooking').prop('disabled', false);

                    // Highlight selected card
                    $('.payment-mode-option').removeClass('selected');
                    $(this).closest('.payment-mode-option').addClass('selected');

                    console.log('✅ Confirm button enabled');
                    console.log('✅ Payment mode stored:', self.formData.payment_mode);
                } else {
                    console.error('❌ Payment mode not found for ID:', selectedModeId);
                }
            });

            // ✅ Bind confirm button - CRITICAL FIX
            $('#btnConfirmBooking').off('click.' + this.eventNamespace).on('click.' + this.eventNamespace, function () {
                console.log('🔍 Confirm button clicked');
                console.log('🔍 formData.payment_mode:', self.formData.payment_mode);
                console.log('🔍 payment_mode exists?', !!self.formData.payment_mode);
                console.log('🔍 payment_mode.id exists?', self.formData.payment_mode ? !!self.formData.payment_mode.id : false);

                // ✅ Validate payment mode is selected
                if (!self.formData.payment_mode || !self.formData.payment_mode.id) {
                    console.error('❌ No payment mode selected');
                    console.error('❌ Current payment_mode value:', self.formData.payment_mode);
                    TempleCore.showToast('Please select a payment mode', 'error');
                    return;
                }

                console.log('✅ Payment mode validated, proceeding with booking');
                self.completeBooking();
            });

            console.log('✅ Event handlers bound');
        },

        nextStep: function () {
            if (this.currentStep < this.totalSteps) {
                this.loadStep(this.currentStep + 1);
            }
        },

        prevStep: function () {
            if (this.currentStep > 1) {
                this.loadStep(this.currentStep - 1);
            }
        },

        updateProgressStepper: function () {
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

        updateBookingSummary: function () {
            if (this.formData.venue) {
                const venueName = this.formData.venue.name_primary || this.formData.venue.name_secondary || 'Unknown';
                $('#summaryVenue').text(venueName);
            }
            if (this.formData.date) {
                const date = new Date(this.formData.date);
                $('#summaryDate').text(date.toLocaleDateString('en-GB'));
            }
            if (this.formData.session) {
                const sessionName = this.formData.session.name_primary || this.formData.session.name_secondary || 'Unknown';
                const timeRange = this.formData.session.formatted_time || `${this.formData.session.from_time} - ${this.formData.session.to_time}`;
                $('#summarySession').text(`${sessionName} (${timeRange})`);
            }
            if (this.formData.amount) {
                $('#summaryAmount').text(`RM ${this.formData.amount.toFixed(2)}`);
            }
        },

        animateCardSelection: function ($card) {
            $('.form-check-card').removeClass('selected');
            gsap.set('.form-check-card', { scale: 1, borderColor: '#dee2e6' });
            $card.addClass('selected');
            gsap.to($card[0], {
                scale: 1.05,
                borderColor: '#ff00ff',
                duration: 0.3,
                ease: 'back.out(1.7)'
            });
        },

        // ✅ CRITICAL FIX: Added saveWitnessesData() call at the beginning
        completeBooking: function () {
            const self = this;

            console.log('📤 completeBooking called');

            // Save witnesses data from DOM before submitting
            this.saveWitnessesData();
            console.log('📤 Witnesses saved:', this.witnesses);

            // Validation checks
            if (!this.formData.venue || !this.formData.session || !this.formData.couples || this.formData.couples.length === 0) {
                console.error('❌ Missing required booking information');
                TempleCore.showToast('Missing required booking information', 'error');
                return;
            }

            if (!this.formData.payment_mode || !this.formData.payment_mode.id) {
                console.error('❌ Payment mode validation failed');
                TempleCore.showToast('Please select a payment mode', 'error');
                return;
            }

            // ✅ Build FormData
            const formData = new FormData();

            // Add basic booking data
            formData.append('venue_id', this.formData.venue.id);
            formData.append('session_id', this.formData.session.id);
            formData.append('booking_date', this.formData.date);
            formData.append('payment_mode_id', this.formData.payment_mode.id);
            formData.append('booking_through', 'ADMIN');

            // Add register details
            if (this.formData.registerDetails) {
                Object.keys(this.formData.registerDetails).forEach(key => {
                    formData.append(`register_details[${key}]`, this.formData.registerDetails[key] || '');
                });
            }

            // Add couples data
            this.formData.couples.forEach((couple, index) => {
                formData.append(`couples[${index}][bride][name]`, couple.bride.name || '');
                formData.append(`couples[${index}][bride][ic]`, couple.bride.ic || '');
                formData.append(`couples[${index}][bride][phone]`, couple.bride.phone || '');
                formData.append(`couples[${index}][bride][email]`, couple.bride.email || '');
                formData.append(`couples[${index}][groom][name]`, couple.groom.name || '');
                formData.append(`couples[${index}][groom][ic]`, couple.groom.ic || '');
                formData.append(`couples[${index}][groom][phone]`, couple.groom.phone || '');
                formData.append(`couples[${index}][groom][email]`, couple.groom.email || '');
            });

            // Add witnesses data
            console.log('📤 Adding witnesses to FormData:', this.witnesses);
            this.witnesses.forEach((witness, index) => {
                if (witness.name && witness.name.trim()) {
                    formData.append(`witnesses[${index}][name]`, witness.name || '');
                    formData.append(`witnesses[${index}][ic]`, witness.ic || '');
                    formData.append(`witnesses[${index}][phone]`, witness.phone || '');
                    console.log(`📤 Witness ${index} added:`, witness);
                }
            });

            // ✅ ENHANCED: Add document files with validation
            const jpnForm = $('input[name="jpn_form"]')[0];
            if (jpnForm && jpnForm.files && jpnForm.files.length > 0) {
                const file = jpnForm.files[0];
                const validation = this.validateFile(file);
                if (validation.valid) {
                    formData.append('jpn_form', file);
                    console.log('📎 JPN Form added:', file.name);
                } else {
                    TempleCore.showToast('JPN Form: ' + validation.errors[0], 'error');
                    return;
                }
            }

            const nricCards = $('input[name="nric_cards"]')[0];
            if (nricCards && nricCards.files && nricCards.files.length > 0) {
                let validNricFiles = true;
                Array.from(nricCards.files).forEach((file, index) => {
                    const validation = this.validateFile(file);
                    if (validation.valid) {
                        formData.append(`nric_cards[${index}]`, file);
                        console.log('📎 NRIC Card added:', file.name);
                    } else {
                        TempleCore.showToast('NRIC Cards: ' + validation.errors[0], 'error');
                        validNricFiles = false;
                    }
                });
                if (!validNricFiles) return;
            }

            const idProof = $('input[name="id_proof"]')[0];
            if (idProof && idProof.files && idProof.files.length > 0) {
                let validIdFiles = true;
                Array.from(idProof.files).forEach((file, index) => {
                    const validation = this.validateFile(file);
                    if (validation.valid) {
                        formData.append(`id_proof[${index}]`, file);
                        console.log('📎 ID Proof added:', file.name);
                    } else {
                        TempleCore.showToast('ID Proof: ' + validation.errors[0], 'error');
                        validIdFiles = false;
                    }
                });
                if (!validIdFiles) return;
            }

            console.log('📤 Submitting booking with FormData');

            const $btn = $('#btnConfirmBooking');
            const originalText = $btn.html();
            $btn.prop('disabled', true).html('<i class="spinner-border spinner-border-sm"></i> Processing...');

            TempleAPI.postFormData('/rom-booking', formData)
                .done(function (response) {
                    console.log('✅ Booking response:', response);
                    if (response.success) {
                        TempleCore.showToast('ROM booking created successfully!', 'success');
                        self.showReceiptPrintConfirmation(response.data.id);
                    } else {
                        TempleCore.showToast(response.message || 'Booking failed', 'error');
                        $btn.prop('disabled', false).html(originalText);
                    }
                })
                .fail(function (xhr, status, error) {
                    console.error('❌ Booking error:', xhr.responseJSON || error);
                    const errorMsg = xhr.responseJSON?.message || 'Failed to create booking';
                    TempleCore.showToast(errorMsg, 'error');
                    $btn.prop('disabled', false).html(originalText);

                    if (xhr.responseJSON?.errors) {
                        console.error('Validation errors:', xhr.responseJSON.errors);
                        const firstError = Object.values(xhr.responseJSON.errors)[0];
                        if (firstError && firstError[0]) {
                            TempleCore.showToast(firstError[0], 'error');
                        }
                    }
                });
        },

        showReceiptPrintConfirmation: function (bookingId) {
            const self = this;
            const simulatedBookingId = bookingId || 'ROM' + Date.now();

            const modalHTML = `
                <div class="modal fade" id="receiptPrintModal" tabindex="-1">
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

            $('#receiptPrintModal').remove();
            $('body').append(modalHTML);

            const modal = new bootstrap.Modal(document.getElementById('receiptPrintModal'));
            modal.show();

            $('#btnPrintReceipt').on('click.' + this.eventNamespace, function () {
                modal.hide();
                self.printReceipt(simulatedBookingId);
            });

            $('#btnLater').on('click.' + this.eventNamespace, function () {
                modal.hide();
                setTimeout(() => {
                    self.cleanup();
                    TempleRouter.navigate('rom-booking');
                }, 800);
            });

            $('#receiptPrintModal').on('hidden.bs.modal.' + this.eventNamespace, function () {
                setTimeout(() => {
                    self.cleanup();
                    TempleRouter.navigate('rom-booking');
                }, 800);
            });
        },

        printReceipt: function (bookingId) {
            const self = this;
            if (window.RomReceiptPrintPage) {
                self.cleanup();
                TempleRouter.navigate('rom-booking/print', { id: bookingId });
            } else {
                const script = document.createElement('script');
                script.src = '/js/pages/rom-booking/print.js';
                script.onload = function () {
                    self.cleanup();
                    TempleRouter.navigate('rom-booking/print', { id: bookingId });
                };
                script.onerror = function () {
                    TempleCore.showToast('Error loading receipt printer', 'error');
                    self.cleanup();
                    TempleRouter.navigate('rom-booking');
                };
                document.head.appendChild(script);
            }
        },

        bindEvents: function () {
            const self = this;
            $('#btnCancel').on('click.' + this.eventNamespace, function () {
                self.cleanup();
                TempleRouter.navigate('rom-booking');
            });
        }
    };

})(jQuery, window);