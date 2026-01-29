/**
 * ================================================================
 * Pagoda Light Booking - Cinema-Seat Style Seat Map
 * Location: frontend/js/pages/auspicious-light/pagoda-booking/seat-map.js
 * ================================================================
 * 
 * CRITICAL: Renders seat map with EXACT column counts per row
 * Cinema-seat style visualization
 * Click to select available seats
 */

(function ($, window) {
    'use strict';

    window.PagodaSeatMap = {
        params: {},
        configId: null,
        config: null,
        seatMapData: [],
        statistics: {},
        selectedUnit: null,
        selectedRow: null,

        /**
         * Initialize the seat map
         */
        init: function (params) {
            const self = this;
            self.params = params || {};
            self.configId = params.configId;

            if (!self.configId) {
                TempleUtils.showError('No configuration selected');
                return;
            }

            self.render();
            self.loadSeatMap();
        },

        /**
         * Cleanup function
         */
        cleanup: function () {
            $(document).off('.pagodaSeatMap');
            this.params = {};
            this.configId = null;
            this.config = null;
            this.seatMapData = [];
            this.statistics = {};
            this.selectedUnit = null;
            this.selectedRow = null;
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
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h3 class="mb-1" id="seatMapTitle">Seat Map</h3>
                                    <div id="seatMapSubtitle"></div>
                                </div>
                                <button class="btn btn-light" onclick="history.back()">
                                    <i class="bi bi-arrow-left"></i> Back
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-body">
                            <div id="seatMapStats" class="row text-center">
                                <!-- Stats will be rendered here -->
                            </div>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-center flex-wrap gap-3">
                                <div class="legend-item">
                                    <span class="seat-legend available"></span>
                                    <span>Available</span>
                                </div>
                                <div class="legend-item">
                                    <span class="seat-legend booked"></span>
                                    <span>Booked</span>
                                </div>
                                <div class="legend-item">
                                    <span class="seat-legend reserved"></span>
                                    <span>Reserved</span>
                                </div>
                                <div class="legend-item">
                                    <span class="seat-legend disabled"></span>
                                    <span>Disabled</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Seat Map -->
                        <div class="col-lg-8">
                            <div class="card shadow-sm">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0">
                                        <i class="bi bi-grid-3x3 text-primary me-2"></i>
                                        Seat Map / ???
                                    </h5>
                                </div>
                                <div class="card-body" style="max-height: 600px; overflow-y: auto;">
                                    <div id="seatMapContainer">
                                        <!-- Seat map will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Selection Summary -->
                        <div class="col-lg-4">
                            <div id="selectionSummary" class="card shadow-sm" style="display:none; position: sticky; top: 20px;">
                                <div class="card-header bg-success text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-check-circle me-2"></i>
                                        Selected Light
                                    </h5>
                                </div>
                                <div class="card-body" id="selectionSummaryContent">
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
         * Load seat map data from API
         */
        loadSeatMap: function () {
            const self = this;

            TempleUtils.showLoading('Loading seat map...');

            TempleAPI.get(`/light-bookings/seat-map/${self.configId}`)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.config = response.data.config;
                        self.seatMapData = response.data.seat_map;
                        self.statistics = response.data.statistics;

                        self.renderHeader();
                        self.renderStatistics();
                        self.renderSeatMap();
                    } else {
                        TempleUtils.showError(response.message || 'Failed to load seat map');
                    }
                })
                .fail(function () {
                    TempleUtils.showError('Failed to load seat map');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        /**
         * Render header information
         */
        renderHeader: function () {
            const typeIcons = {
                'PAGODA_TOWER': '??',
                'LOTUS_LAMP': '??',
                'WALL_LIGHT': '??'
            };

            $('#seatMapTitle').html(`${typeIcons[this.config.type]} ${this.config.config_name}`);
            $('#seatMapSubtitle').html(`
                <span class="badge bg-light text-dark me-2">
                    <i class="bi bi-building"></i> ${this.config.floor.floor_name}
                </span>
                <span class="badge bg-light text-dark">
                    <i class="bi bi-star"></i> ${this.config.deity.deity_name}
                </span>
            `);
        },

        /**
         * Render statistics
         */
        renderStatistics: function () {
            const stats = this.statistics;
            const availablePercent = stats.total_units > 0
                ? Math.round((stats.available / stats.total_units) * 100)
                : 0;

            const html = `
                <div class="col-md-3">
                    <div class="stat-box">
                        <div class="stat-value text-primary">${stats.total_units}</div>
                        <div class="stat-label">Total Lights</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-box">
                        <div class="stat-value text-success">${stats.available}</div>
                        <div class="stat-label">Available</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-box">
                        <div class="stat-value text-danger">${stats.booked}</div>
                        <div class="stat-label">Booked</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-box">
                        <div class="stat-value text-warning">${stats.reserved}</div>
                        <div class="stat-label">Reserved</div>
                    </div>
                </div>
            `;

            $('#seatMapStats').html(html);
        },

        /**
         * Render seat map (Cinema-Seat Style)
         * CRITICAL: Renders EXACTLY column_count seats per row
         */
        renderSeatMap: function () {
            const self = this;
            const $container = $('#seatMapContainer');
            $container.empty();

            if (self.seatMapData.length === 0) {
                $container.html('<div class="alert alert-info">No seats available</div>');
                return;
            }

            // Render each row
            self.seatMapData.forEach(function (row) {
                const $rowDiv = self.createRowElement(row);
                $container.append($rowDiv);
            });
        },

        /**
         * Create a row element with EXACT column count
         */
        createRowElement: function (row) {
            const self = this;
            const $rowDiv = $('<div>').addClass('seat-row').attr('data-row-no', row.row_no);

            // Row header
            const $headerDiv = $('<div>').addClass('row-header');
            $headerDiv.html(`
                <div class="row-info">
                    <span class="row-number">Row ${row.row_no}</span>
                    ${row.row_label ? `<span class="row-label">${row.row_label}</span>` : ''}
                    ${row.meaning ? `<span class="row-meaning text-muted">${row.meaning}</span>` : ''}
                </div>
                ${row.price ? `<span class="row-price">RM ${parseFloat(row.price).toFixed(2)}</span>` : ''}
            `);
            $rowDiv.append($headerDiv);

            // Seats container
            const $seatsContainer = $('<div>').addClass('seats-container');

            // Render EXACTLY column_count seats
            for (let col = 1; col <= row.column_count; col++) {
                const unit = row.units.find(u => u.col_no === col);

                if (unit) {
                    const $seatDiv = self.createSeatElement(unit, row);
                    $seatsContainer.append($seatDiv);
                } else {
                    // This should never happen if backend is correct
                    console.warn(`Missing unit at Row ${row.row_no}, Col ${col}`);
                }
            }

            $rowDiv.append($seatsContainer);
            return $rowDiv;
        },

        /**
         * Create a seat element
         */
        createSeatElement: function (unit, row) {
            const self = this;
            const $seatDiv = $('<div>')
                .addClass(`seat ${unit.status.toLowerCase()}`)
                .attr({
                    'data-unit-id': unit.unit_id,
                    'data-unit-code': unit.unit_code,
                    'data-status': unit.status,
                    'data-price': row.price || 0,
                    'data-row-label': row.row_label || `Row ${row.row_no}`,
                    'title': `${unit.unit_code} - ${unit.status}${row.price ? ` (RM ${row.price})` : ''}`
                });

            // Seat content
            $seatDiv.html(`<span class="seat-code">${unit.unit_code}</span>`);

            // Click handler (only for available seats)
            if (unit.status === 'AVAILABLE') {
                $seatDiv.addClass('clickable');
                $seatDiv.on('click', function () {
                    self.selectSeat(unit, row);
                });
            }

            return $seatDiv;
        },

        /**
         * Handle seat selection
         */
        selectSeat: function (unit, row) {
            const self = this;

            // Deselect previous
            $('.seat.selected').removeClass('selected');

            // Select new
            $(`.seat[data-unit-id="${unit.unit_id}"]`).addClass('selected');

            self.selectedUnit = unit;
            self.selectedRow = row;

            self.showSelectionSummary();
        },

        /**
         * Show selection summary
         */
        showSelectionSummary: function () {
            const self = this;
            const $summary = $('#selectionSummary');
            const $content = $('#selectionSummaryContent');

            const html = `
                <div class="summary-details">
                    <div class="summary-row">
                        <span class="text-muted">Unit Code:</span>
                        <strong>${self.selectedUnit.unit_code}</strong>
                    </div>
                    <div class="summary-row">
                        <span class="text-muted">Row:</span>
                        <strong>${self.selectedRow.row_label || `Row ${self.selectedRow.row_no}`}</strong>
                    </div>
                    ${self.selectedRow.meaning ? `
                    <div class="summary-row">
                        <span class="text-muted">Meaning:</span>
                        <strong>${self.selectedRow.meaning}</strong>
                    </div>
                    ` : ''}
                    <div class="summary-row">
                        <span class="text-muted">Price:</span>
                        <strong class="text-success fs-4">RM ${parseFloat(self.selectedRow.price || 0).toFixed(2)}</strong>
                    </div>
                </div>
                <hr>
                <button class="btn btn-success w-100 mb-2" onclick="PagodaSeatMap.proceedToBooking()">
                    <i class="bi bi-arrow-right"></i>
                    Proceed to Booking
                </button>
                <button class="btn btn-outline-secondary w-100" onclick="PagodaSeatMap.clearSelection()">
                    Clear Selection
                </button>
            `;

            $content.html(html);
            $summary.show();
        },

        /**
         * Clear selection
         */
        clearSelection: function () {
            $('.seat.selected').removeClass('selected');
            this.selectedUnit = null;
            this.selectedRow = null;
            $('#selectionSummary').hide();
        },

        /**
         * Proceed to booking form
         */
        proceedToBooking: function () {
            const self = this;

            if (!self.selectedUnit) {
                TempleUtils.showWarning('Please select a light');
                return;
            }

            // Navigate to booking form with selection data
            if (window.PageManager && window.PageManager.loadPage) {
                window.PageManager.loadPage('pagoda-booking-form', {
                    config: self.config,
                    unit: self.selectedUnit,
                    row: self.selectedRow
                });
            } else {
                console.log('Navigate to booking form with:', {
                    config: self.config,
                    unit: self.selectedUnit,
                    row: self.selectedRow
                });
                TempleUtils.showInfo('Booking form will load here');
            }
        }
    };

})(jQuery, window);
