/**
 * ================================================================
 * Pagoda Light Booking - My Bookings Page
 * Location: frontend/js/pages/auspicious-light/pagoda-booking/my-bookings.js
 * ================================================================
 * 
 * View user's booking history
 * Show booking details
 * Cancel bookings
 */

(function ($, window) {
    'use strict';

    window.PagodaMyBookings = {
        params: {},
        bookings: [],

        /**
         * Initialize the page
         */
        init: function (params) {
            const self = this;
            self.params = params || {};
            self.render();
            self.loadBookings();
            self.attachEventHandlers();
        },

        /**
         * Cleanup function
         */
        cleanup: function () {
            $(document).off('.pagodaMyBookings');
            this.params = {};
            this.bookings = [];
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
                            <h3 class="mb-1">📋 My Bookings / 我的预订</h3>
                            <p class="mb-0">View and manage your light bookings</p>
                        </div>
                    </div>

                    <!-- Bookings List -->
                    <div class="card shadow-sm">
                        <div class="card-header bg-light">
                            <h5 class="mb-0">
                                <i class="bi bi-list-ul text-primary me-2"></i>
                                Booking History
                            </h5>
                        </div>
                        <div class="card-body">
                            <div id="bookingsList">
                                <!-- Bookings will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        /**
         * Attach event handlers
         */
        attachEventHandlers: function () {
            const self = this;

            // View booking details
            $(document).on('click.pagodaMyBookings', '.view-booking-btn', function () {
                const bookingId = $(this).data('booking-id');
                self.viewBookingDetails(bookingId);
            });

            // Cancel booking
            $(document).on('click.pagodaMyBookings', '.cancel-booking-btn', function () {
                const bookingId = $(this).data('booking-id');
                self.cancelBooking(bookingId);
            });
        },

        /**
         * Load user's bookings
         */
        loadBookings: function () {
            const self = this;

            TempleUtils.showLoading('Loading bookings...');

            TempleAPI.get('/light-bookings/my-bookings')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.bookings = response.data;
                        self.renderBookings();
                    }
                })
                .fail(function () {
                    TempleUtils.showError('Failed to load bookings');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        /**
         * Render bookings list
         */
        renderBookings: function () {
            const self = this;
            const $container = $('#bookingsList');

            if (self.bookings.length === 0) {
                $container.html(`
                    <div class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
                        <h5 class="mt-3 text-muted">No bookings yet</h5>
                        <p class="text-muted">Start by browsing available lights</p>
                        <button class="btn btn-primary" onclick="PageManager.loadPage('pagoda-browse-lights')">
                            <i class="bi bi-search"></i> Browse Lights
                        </button>
                    </div>
                `);
                return;
            }

            let html = '<div class="row g-3">';
            self.bookings.forEach(function (booking) {
                html += self.renderBookingCard(booking);
            });
            html += '</div>';

            $container.html(html);
        },

        /**
         * Render a single booking card
         */
        renderBookingCard: function (booking) {
            const statusColors = {
                'RESERVED': 'warning',
                'BOOKED': 'success',
                'CANCELLED': 'danger',
                'EXPIRED': 'secondary'
            };

            const statusColor = statusColors[booking.status] || 'secondary';

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h6 class="mb-0">${booking.booking_number}</h6>
                                <span class="badge bg-${statusColor}">${booking.status}</span>
                            </div>

                            <div class="mb-2">
                                <small class="text-muted">Configuration:</small>
                                <div class="fw-bold">${booking.unit.config.config_name}</div>
                            </div>

                            <div class="mb-2">
                                <small class="text-muted">Unit:</small>
                                <div class="fw-bold">${booking.unit.unit_code}</div>
                            </div>

                            <div class="mb-2">
                                <small class="text-muted">Offering Period:</small>
                                <div>${moment(booking.offering_date_from).format('DD MMM YYYY')} - ${moment(booking.offering_date_to).format('DD MMM YYYY')}</div>
                            </div>

                            <div class="mb-3">
                                <small class="text-muted">Amount:</small>
                                <div class="text-success fw-bold">RM ${parseFloat(booking.amount).toFixed(2)}</div>
                            </div>

                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary view-booking-btn" data-booking-id="${booking.booking_id}">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                ${booking.status === 'RESERVED' || booking.status === 'BOOKED' ? `
                                <button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-booking-id="${booking.booking_id}">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * View booking details
         */
        viewBookingDetails: function (bookingId) {
            const booking = this.bookings.find(b => b.booking_id === bookingId);
            if (!booking) return;

            const html = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Booking Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <td>Booking Number:</td>
                                <td><strong>${booking.booking_number}</strong></td>
                            </tr>
                            <tr>
                                <td>Status:</td>
                                <td><span class="badge bg-success">${booking.status}</span></td>
                            </tr>
                            <tr>
                                <td>Booked Date:</td>
                                <td>${moment(booking.created_at).format('DD MMM YYYY HH:mm')}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Light Details</h6>
                        <table class="table table-sm">
                            <tr>
                                <td>Configuration:</td>
                                <td><strong>${booking.unit.config.config_name}</strong></td>
                            </tr>
                            <tr>
                                <td>Unit:</td>
                                <td><strong>${booking.unit.unit_code}</strong></td>
                            </tr>
                            <tr>
                                <td>Floor:</td>
                                <td>${booking.unit.config.floor.floor_name}</td>
                            </tr>
                            <tr>
                                <td>Deity:</td>
                                <td>${booking.unit.config.deity.deity_name}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-12">
                        <h6>Devotee Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <td>Name:</td>
                                <td><strong>${booking.devotee_name}</strong></td>
                            </tr>
                            <tr>
                                <td>Phone:</td>
                                <td>${booking.devotee_phone}</td>
                            </tr>
                            ${booking.devotee_email ? `
                            <tr>
                                <td>Email:</td>
                                <td>${booking.devotee_email}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                </div>
            `;

            TempleUtils.showModal('Booking Details', html);
        },

        /**
         * Cancel booking
         */
        cancelBooking: function (bookingId) {
            const self = this;

            TempleUtils.confirm('Are you sure you want to cancel this booking?', function () {
                TempleUtils.showLoading('Cancelling booking...');

                TempleAPI.post(`/light-bookings/${bookingId}/cancel`)
                    .done(function (response) {
                        if (response.success) {
                            TempleUtils.showSuccess('Booking cancelled successfully');
                            self.loadBookings();
                        } else {
                            TempleUtils.showError(response.message || 'Failed to cancel booking');
                        }
                    })
                    .fail(function () {
                        TempleUtils.showError('Failed to cancel booking');
                    })
                    .always(function () {
                        TempleUtils.hideLoading();
                    });
            });
        }
    };

})(jQuery, window);
