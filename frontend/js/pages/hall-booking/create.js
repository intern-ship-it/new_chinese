// js/pages/hall-booking/create.js
// Hall Booking Create Page with Step Workflow

(function($, window) {
    'use strict';
    
    window.HallBookingCreatePage = {
        currentStep: 1,
        selectedTimeSlot: null,
        selectedPackages: [],
        bookingData: {},
        
        // Page initialization
        init: function(params) {
            this.loadCSS();
            this.render();
            this.initAnimations();
            this.bindEvents();
        },
        
        // Load CSS dynamically
        loadCSS: function() {
            if (!document.getElementById('hall-booking-css')) {
                const link = document.createElement('link');
                link.id = 'hall-booking-css';
                link.rel = 'stylesheet';
                link.href = '/css/hall-booking.css';
                document.head.appendChild(link);
            }
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
                                        <span class="step-label">Time Slot<br></span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="2">
                                        <div class="step-number">2</div>
                                        <span class="step-label">Package<br></span>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="3">
                                        <div class="step-number">3</div>
                                        <span class="step-label">Details<br></span>
                                    </div>
                                </div>

                                <!-- Step Content -->
                                <div class="workflow-content">
                                    <!-- Step 1: Time Slot Selection -->
                                    <div class="step-content active" id="step1">
                                        <h3 class="step-title">
                                            <i class="bi bi-clock"></i> Choose Time Slot
                                        </h3>
                                        <div class="time-slots-grid">
                                            <div class="time-slot-card" data-id="1" data-price="500" data-hours="4">
                                                <div class="time-icon">
                                                    <i class="bi bi-sunrise"></i>
                                                </div>
                                                <h5>SATHABISHEGAM (80TH WEDDING)</h5>
                                                <p class="time">AM • 4 hours</p>
                                                <p class="price">RM 500.00</p>
                                            </div>
                                            <div class="time-slot-card" data-id="2" data-price="600" data-hours="4">
                                                <div class="time-icon">
                                                    <i class="bi bi-sun"></i>
                                                </div>
                                                <h5>BHEERATHA SHANTHI (70TH WEDDING)</h5>
                                                <p class="time">PM • 4 hours</p>
                                                <p class="price">RM 600.00</p>
                                            </div>
                                            <div class="time-slot-card" data-id="3" data-price="700" data-hours="4">
                                                <div class="time-icon">
                                                    <i class="bi bi-sunset"></i>
                                                </div>
                                                <h5>PM - AFTERNOON</h5>
                                                <p class="time">PM - AFTERNOON • 4 hours</p>
                                                <p class="price">RM 700.00</p>
                                            </div>
                                            <div class="time-slot-card" data-id="4" data-price="1000" data-hours="8">
                                                <div class="time-icon">
                                                    <i class="bi bi-calendar-day"></i>
                                                </div>
                                                <h5>TESTING</h5>
                                                <p class="time">All Day • 8 hours</p>
                                                <p class="price">RM 1000.00</p>
                                            </div>
                                            <div class="time-slot-card" data-id="5" data-price="800" data-hours="0">
                                                <div class="time-icon">
                                                    <i class="bi bi-alarm"></i>
                                                </div>
                                                <h5>TEST1</h5>
                                                <p class="time">Custom • Variable</p>
                                                <p class="price">RM 800.00</p>
                                            </div>
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-primary" id="btnStep1Next" disabled>
                                                Next: Choose Package <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 2: Package Selection -->
                                    <div class="step-content" id="step2">
                                        <h3 class="step-title">
                                            <i class="bi bi-box"></i> Choose Package
                                        </h3>
                                        <div class="packages-list">
                                            <div class="package-item">
                                                <input type="checkbox" class="package-checkbox" id="pkg1" data-price="150">
                                                <label for="pkg1">
                                                    <i class="bi bi-soundwave"></i>
                                                    <div>
                                                        <h5>Sound System </h5>
                                                        <p>RM 150.00</p>
                                                    </div>
                                                </label>
                                            </div>
                                            <div class="package-item">
                                                <input type="checkbox" class="package-checkbox" id="pkg2" data-price="200">
                                                <label for="pkg2">
                                                    <i class="bi bi-camera-video"></i>
                                                    <div>
                                                        <h5>Projector & Screen</h5>
                                                        <p>RM 200.00</p>
                                                    </div>
                                                </label>
                                            </div>
                                            <div class="package-item">
                                                <input type="checkbox" class="package-checkbox" id="pkg3" data-price="100">
                                                <label for="pkg3">
                                                    <i class="bi bi-grid-3x3"></i>
                                                    <div>
                                                        <h5>Tables & Chairs </h5>
                                                        <p>RM 100.00</p>
                                                    </div>
                                                </label>
                                            </div>
                                            <div class="package-item">
                                                <input type="checkbox" class="package-checkbox" id="pkg4" data-price="80">
                                                <label for="pkg4">
                                                    <i class="bi bi-snow"></i>
                                                    <div>
                                                        <h5>Air Conditioning </h5>
                                                        <p>RM 80.00</p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                        <div class="step-actions">
                                            <button type="button" class="btn btn-secondary" id="btnStep2Back">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="button" class="btn btn-primary" id="btnStep2Next">
                                                Next: Enter Details <i class="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Step 3: Details Form -->
                                    <div class="step-content" id="step3">
                                        <h3 class="step-title">
                                            <i class="bi bi-person-badge"></i> Personal Information
                                        </h3>
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
                                                    <label class="form-label">NRIC No.<span class="required">*</span></label>
                                                    <input type="text" class="form-control" name="nric" required placeholder="Enter NRIC number">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Email<span class="required">*</span></label>
                                                    <input type="email" class="form-control" name="email" required placeholder="Enter email address">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Contact No.<span class="required">*</span></label>
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
                                            <div class="step-actions">
                                                <button type="button" class="btn btn-secondary" id="btnStep3Back">
                                                    <i class="bi bi-arrow-left"></i> Back
                                                </button>
                                                <button type="submit" class="btn btn-success" id="btnSubmitBooking">
                                                    <i class="bi bi-check-circle"></i> Confirm Booking
                                                </button>
                                            </div>
                                        </form>
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
                                        <div class="summary-section">
                                            <h6>Package Amount </h6>
                                            <div class="summary-row">
                                                <span>Time Slot:</span>
                                                <span id="summaryTimeSlot">-</span>
                                            </div>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong id="summaryTimeSlotPrice">RM 0.00</strong>
                                            </div>
                                        </div>

                                        <div class="summary-section">
                                            <h6>Add-ons</h6>
                                            <div id="summaryAddons">
                                                <p class="text-muted">No add-ons selected</p>
                                            </div>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong id="summaryAddonsPrice">RM 0.00</strong>
                                            </div>
                                        </div>

                                        <div class="summary-section">
                                            <h6>Extra Charges</h6>
                                            <div class="summary-row">
                                                <span></span>
                                                <strong>RM 0.00</strong>
                                            </div>
                                        </div>

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
            
            // Time slot selection
            $('.time-slot-card').on('click', function() {
                $('.time-slot-card').removeClass('selected');
                $(this).addClass('selected');
                self.selectedTimeSlot = {
                    id: $(this).data('id'),
                    name: $(this).find('h5').text(),
                    price: parseFloat($(this).data('price')),
                    hours: $(this).data('hours')
                };
                $('#btnStep1Next').prop('disabled', false);
                self.updateSummary();
            });
            
            // Package selection
            $('.package-checkbox').on('change', function() {
                self.updateSelectedPackages();
                self.updateSummary();
            });
            
            // Step navigation
            $('#btnStep1Next').on('click', function() {
                self.goToStep(2);
            });
            
            $('#btnStep2Back').on('click', function() {
                self.goToStep(1);
            });
            
            $('#btnStep2Next').on('click', function() {
                self.goToStep(3);
            });
            
            $('#btnStep3Back').on('click', function() {
                self.goToStep(2);
            });
            
            // Form submission
            $('#bookingForm').on('submit', function(e) {
                e.preventDefault();
                if (self.validateForm()) {
                    self.submitBooking();
                }
            });
            
            // Cancel button
            $('#btnCancel').on('click', function() {
                TempleRouter.navigate('hall-booking');
            });
        },
        
        // Update selected packages
        updateSelectedPackages: function() {
            this.selectedPackages = [];
            $('.package-checkbox:checked').each((index, el) => {
                const $label = $(el).next('label');
                this.selectedPackages.push({
                    id: $(el).attr('id'),
                    name: $label.find('h5').text(),
                    price: parseFloat($(el).data('price'))
                });
            });
        },
        
        // Update summary panel
        updateSummary: function() {
            // Update time slot
            if (this.selectedTimeSlot) {
                $('#summaryTimeSlot').text(this.selectedTimeSlot.name);
                $('#summaryTimeSlotPrice').text(`RM ${this.selectedTimeSlot.price.toFixed(2)}`);
            }
            
            // Update add-ons
            if (this.selectedPackages.length > 0) {
                let addonsHtml = '';
                this.selectedPackages.forEach(pkg => {
                    addonsHtml += `
                        <div class="summary-row">
                            <span>${pkg.name}</span>
                            <span>RM ${pkg.price.toFixed(2)}</span>
                        </div>
                    `;
                });
                $('#summaryAddons').html(addonsHtml);
                
                const addonsTotal = this.selectedPackages.reduce((sum, pkg) => sum + pkg.price, 0);
                $('#summaryAddonsPrice').text(`RM ${addonsTotal.toFixed(2)}`);
            } else {
                $('#summaryAddons').html('<p class="text-muted">No add-ons selected</p>');
                $('#summaryAddonsPrice').text('RM 0.00');
            }
            
            // Update total
            const timeSlotPrice = this.selectedTimeSlot ? this.selectedTimeSlot.price : 0;
            const addonsTotal = this.selectedPackages.reduce((sum, pkg) => sum + pkg.price, 0);
            const total = timeSlotPrice + addonsTotal;
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
                time_slot: this.selectedTimeSlot,
                packages: this.selectedPackages,
                name_chinese: formData.get('name_chinese'),
                name_english: formData.get('name_english'),
                nric: formData.get('nric'),
                email: formData.get('email'),
                contact_no: formData.get('contact_no'),
                booking_date: formData.get('booking_date'),
                remarks: formData.get('remarks'),
                payment_method: $('input[name="payment_method"]:checked').val()
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
                    TempleRouter.navigate('hall-booking');
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