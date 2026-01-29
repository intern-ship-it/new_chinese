/**
 * ================================================================
 * Pagoda Light Booking - Booking Form
 * Location: frontend/js/pages/auspicious-light/pagoda-booking/booking-form.js
 * ================================================================
 * 
 * Handles devotee information and reservation
 * 10-minute reservation timer
 * Payment confirmation
 */

(function ($, window) {
    'use strict';

    window.PagodaBookingForm = {
        params: {},
        bookingData: null,
        reservationTimer: null,
        reservedUntil: null,
        bookingId: null,

        /**
         * Initialize the booking form
         */
        init: function (params) {
            const self = this;
            self.params = params || {};
            self.bookingData = params;

            if (!self.bookingData || !self.bookingData.config || !self.bookingData.unit) {
                TempleUtils.showError('No light selected');
                return;
            }

            self.render();
            self.setupForm();
            self.attachEventHandlers();
        },

        /**
         * Cleanup function
         */
        cleanup: function () {
            if (this.reservationTimer) {
                clearInterval(this.reservationTimer);
                this.reservationTimer = null;
            }
            $(document).off('.pagodaBooking');
            this.params = {};
            this.bookingData = null;
            this.reservedUntil = null;
            this.bookingId = null;
        },

        /**
         * Render page HTML
         */
        render: function () {
            const html = `
                <div class="container-fluid p-4">
                    <!-- Header -->
                    <div class="card mb-4" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">
                        <div class="card-body text-white py-4">
                            <h3 class="mb-1">?? Booking Form / ????</h3>
                            <p class="mb-0">Complete your light booking</p>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Booking Form -->
                        <div class="col-lg-8">
                            <form id="bookingForm" novalidate>
                                <!-- Personal Information -->
                                <div class="card mb-4 shadow-sm">
                                    <div class="card-header bg-light">
                                        <h5 class="mb-0">
                                            <i class="bi bi-person-circle text-primary me-2"></i>
                                            Personal Information / ????
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Name / ?? <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="devoteeName" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">NRIC / ???</label>
                                                <input type="text" class="form-control" id="devoteeNric">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Phone / ?? <span class="text-danger">*</span></label>
                                                <input type="tel" class="form-control" id="devoteePhone" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Email / ??</label>
                                                <input type="email" class="form-control" id="devoteeEmail">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Offering Details -->
                                <div class="card mb-4 shadow-sm">
                                    <div class="card-header bg-light">
                                        <h5 class="mb-0">
                                            <i class="bi bi-calendar-check text-success me-2"></i>
                                            Offering Details / ????
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label">From Date / ???? <span class="text-danger">*</span></label>
                                                <input type="date" class="form-control" id="offeringDateFrom" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">To Date / ???? <span class="text-danger">*</span></label>
                                                <input type="date" class="form-control" id="offeringDateTo" required>
                                            </div>
                                            <div class="col-12">
                                                <div class="alert alert-info">
                                                    <i class="bi bi-info-circle me-2"></i>
                                                    Duration: <strong id="durationDays">-</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Payment Section (shown after reservation) -->
                                <div id="paymentSection" style="display:none;">
                                    <div class="card mb-4 shadow-sm border-success">
                                        <div class="card-header bg-success text-white">
                                            <h5 class="mb-0">
                                                <i class="bi bi-credit-card me-2"></i>
                                                Payment / ??
                                            </h5>
                                        </div>
                                        <div class="card-body" id="paymentContent">
                                            <!-- Payment content will be rendered here -->
                                        </div>
                                    </div>
                                </div>

                                <!-- Submit Button -->
                                <div class="card shadow-sm">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <button type="button" class="btn btn-outline-secondary" onclick="history.back()">
                                                <i class="bi bi-arrow-left"></i> Back
                                            </button>
                                            <button type="submit" class="btn btn-success btn-lg px-5" id="submitBtn">
                                                <i class="bi bi-check-circle"></i> Reserve Light
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- Booking Summary -->
                        <div class="col-lg-4">
                            <div class="card shadow-sm" style="position: sticky; top: 20px;">
                                <div class="card-header bg-primary text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-receipt me-2"></i>
                                        Booking Summary
                                    </h5>
                                </div>
                                <div class="card-body" id="bookingSummary">
                                    <!-- Summary will be rendered here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        /**
         * Setup form with default values
         */
        setupForm: function () {
            const self = this;

            // Render booking summary
            self.renderBookingSummary();

            // Set default dates
            const today = moment().format('YYYY-MM-DD');
            const oneMonthLater = moment().add(1, 'month').format('YYYY-MM-DD');

            $('#offeringDateFrom').val(today);
            $('#offeringDateTo').val(oneMonthLater);

            self.calculateDuration();
        },

        /**
         * Render booking summary
         */
        renderBookingSummary: function () {
            const self = this;
            const data = self.bookingData;

            const html = `
                <h6 class="mb-3">${data.config.config_name}</h6>
                <div class="summary-item">
                    <span class="text-muted">Floor:</span>
                    <strong>${data.config.floor.floor_name}</strong>
                </div>
                <div class="summary-item">
                    <span class="text-muted">Deity:</span>
                    <strong>${data.config.deity.deity_name}</strong>
                </div>
                <div class="summary-item">
                    <span class="text-muted">Unit:</span>
                    <strong>${data.unit.unit_code}</strong>
                </div>
                <div class="summary-item">
                    <span class="text-muted">Row:</span>
                    <strong>${data.row.row_label || 'Row ' + data.row.row_no}</strong>
                </div>
                <hr>
                <div class="summary-item price-item">
                    <span class="text-muted">Amount:</span>
                    <strong class="text-success fs-4">RM ${parseFloat(data.row.price || 0).toFixed(2)}</strong>
                </div>
            `;

            $('#bookingSummary').html(html);
        },

        /**
         * Attach event handlers
         */
        attachEventHandlers: function () {
            const self = this;

            // Form submission
            $(document).on('submit.pagodaBooking', '#bookingForm', function (e) {
                e.preventDefault();
                self.submitBooking();
            });

            // Date change
            $(document).on('change.pagodaBooking', '#offeringDateFrom, #offeringDateTo', function () {
                self.calculateDuration();
            });
        },

        /**
         * Calculate duration in days
         */
        calculateDuration: function () {
            const fromDate = $('#offeringDateFrom').val();
            const toDate = $('#offeringDateTo').val();

            if (fromDate && toDate) {
                const from = moment(fromDate);
                const to = moment(toDate);
                const days = to.diff(from, 'days') + 1;

                if (days > 0) {
                    $('#durationDays').text(`${days} day${days > 1 ? 's' : ''}`);
                } else {
                    $('#durationDays').text('Invalid duration');
                }
            }
        },

        /**
         * Submit booking (reserve unit)
         */
        submitBooking: function () {
            const self = this;

            // Validate form
            const form = document.getElementById('bookingForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                TempleUtils.showWarning('Please fill in all required fields');
                return;
            }

            const formData = {
                unit_id: self.bookingData.unit.unit_id,
                devotee_name: $('#devoteeName').val(),
                devotee_nric: $('#devoteeNric').val(),
                devotee_phone: $('#devoteePhone').val(),
                devotee_email: $('#devoteeEmail').val(),
                offering_date_from: $('#offeringDateFrom').val(),
                offering_date_to: $('#offeringDateTo').val(),
                amount: parseFloat(self.bookingData.row.price || 0)
            };

            TempleUtils.showLoading('Reserving light...');

            TempleAPI.post('/light-bookings/reserve', formData)
                .done(function (response) {
                    if (response.success && response.data) {
                        const booking = response.data.booking;
                        self.bookingId = booking.booking_id;
                        self.reservedUntil = moment(response.data.reserved_until);

                        TempleUtils.showSuccess('Light reserved successfully!');
                        self.showPaymentSection(booking);
                        self.startReservationTimer();

                        // Disable form
                        $('#bookingForm :input').prop('disabled', true);
                        $('#submitBtn').hide();
                    } else {
                        TempleUtils.showError(response.message || 'Failed to reserve light');
                    }
                })
                .fail(function (xhr) {
                    const message = xhr.responseJSON && xhr.responseJSON.message
                        ? xhr.responseJSON.message
                        : 'Failed to reserve light';
                    TempleUtils.showError(message);
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        /**
         * Show payment section
         */
        showPaymentSection: function (booking) {
            const html = `
                <div class="alert alert-success mb-3">
                    <i class="bi bi-check-circle me-2"></i>
                    <strong>Light Reserved!</strong>
                    <p class="mb-1">Booking Number: <strong>${booking.booking_number}</strong></p>
                    <p class="mb-0">Please complete payment within <strong id="timerDisplay" class="text-danger">10:00</strong></p>
                </div>

                <div class="mb-3">
                    <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                    <select id="paymentMode" class="form-select" required>
                        <option value="">-- Select Payment Mode --</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Credit/Debit Card</option>
                        <option value="ONLINE_BANKING">Online Banking</option>
                        <option value="EWALLET">E-Wallet</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label">Payment Reference (Optional)</label>
                    <input type="text" id="paymentReference" class="form-control" 
                           placeholder="Transaction ID / Reference Number">
                </div>

                <button type="button" class="btn btn-success w-100" onclick="PagodaBookingForm.confirmPayment()">
                    <i class="bi bi-check-circle"></i>
                    Confirm Payment
                </button>
            `;

            $('#paymentContent').html(html);
            $('#paymentSection').show();
        },

        /**
         * Start 10-minute reservation timer
         */
        startReservationTimer: function () {
            const self = this;

            self.reservationTimer = setInterval(function () {
                const now = moment();
                const remaining = self.reservedUntil.diff(now);

                if (remaining <= 0) {
                    clearInterval(self.reservationTimer);
                    self.handleTimerExpired();
                    return;
                }

                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                $('#timerDisplay').text(display);

                // Warning when less than 2 minutes
                if (remaining < 120000) {
                    $('#timerDisplay').addClass('fw-bold').css('color', 'red');
                }
            }, 1000);
        },

        /**
         * Handle timer expiration
         */
        handleTimerExpired: function () {
            TempleUtils.showError('Reservation expired. Please book again.');
            setTimeout(function () {
                history.back();
            }, 3000);
        },

        /**
         * Confirm payment
         */
        confirmPayment: function () {
            const self = this;
            const paymentMode = $('#paymentMode').val();

            if (!paymentMode) {
                TempleUtils.showWarning('Please select payment mode');
                return;
            }

            const data = {
                payment_mode: paymentMode,
                payment_reference: $('#paymentReference').val()
            };

            TempleUtils.showLoading('Confirming payment...');

            TempleAPI.post(`/light-bookings/${self.bookingId}/confirm`, data)
                .done(function (response) {
                    if (response.success) {
                        clearInterval(self.reservationTimer);
                        TempleUtils.showSuccess('Booking confirmed successfully!');

                        setTimeout(function () {
                            if (window.PageManager && window.PageManager.loadPage) {
                                window.PageManager.loadPage('pagoda-my-bookings');
                            } else {
                                history.back();
                            }
                        }, 2000);
                    } else {
                        TempleUtils.showError(response.message || 'Failed to confirm payment');
                    }
                })
                .fail(function () {
                    TempleUtils.showError('Failed to confirm payment');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        }
    };

})(jQuery, window);
