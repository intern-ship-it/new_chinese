/**
 * ================================================================
 * Pagoda Light Booking - Browse Lights Page
 * Location: frontend/js/pages/auspicious-light/pagoda-browse-lights.js
 * ================================================================
 * 
 * Allows devotees to browse available light configurations
 * Filter by floor or deity
 * View availability and navigate to seat map
 */

(function ($, window) {
    'use strict';

    window.AuspiciousLightPagodaBrowseLightsPage = {
        params: {},
        currentFilter: 'deity', // 'deity' or 'floor'
        selectedFloorId: null,
        selectedDeityId: null,
        configs: [],
        floors: [],
        deities: [],

        /**
         * Initialize the page
         */
        init: function (params) {
            const self = this;
            self.params = params || {};
            self.render();
            self.loadFilters();
            self.attachEventHandlers();
        },

        /**
         * Cleanup function
         */
        cleanup: function () {
            $(document).off('.pagodaBrowse');
            this.params = {};
            this.configs = [];
            this.floors = [];
            this.deities = [];
            this.selectedFloorId = null;
            this.selectedDeityId = null;
        },

        /**
         * Render page HTML
         */
        render: function () {
            const html = `
                <div class="container-fluid p-4">
                    <!-- Header -->
                    <div class="card mb-4" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">
                        <div class="card-body text-center text-white py-5">
                            <h2 class="mb-2" style="font-weight: 700;">?? ????</h2>
                            <h3 class="mb-0">Pagoda Light Booking</h3>
                            <p class="mt-2 mb-0">Browse and book your auspicious light</p>
                        </div>
                    </div>

                    <!-- Filter Section -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-light">
                            <h5 class="mb-0">
                                <i class="bi bi-funnel text-primary me-2"></i>
                                Filter Lights / ????
                            </h5>
                        </div>
                        <div class="card-body">
                            <!-- Filter Tabs -->
                            <div class="btn-group mb-3" role="group">
                                <button type="button" class="btn btn-outline-primary filter-tab active" data-filter="deity">
                                    <i class="bi bi-star"></i> By Deity / ???
                                </button>
                                <button type="button" class="btn btn-outline-primary filter-tab" data-filter="floor">
                                    <i class="bi bi-building"></i> By Floor / ???
                                </button>
                            </div>

                            <!-- Deity Filter -->
                            <div id="filter-deity" class="filter-panel">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Select Deity / ????</label>
                                        <select id="deitySelect" class="form-select form-select-lg">
                                            <option value="">-- Select Deity --</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Floor Filter -->
                            <div id="filter-floor" class="filter-panel" style="display:none;">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Select Floor / ????</label>
                                        <select id="floorSelect" class="form-select form-select-lg">
                                            <option value="">-- Select Floor --</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Configurations Grid -->
                    <div id="configsSection">
                        <div id="configsGrid" class="row g-4">
                            <!-- Config cards will be rendered here -->
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

            // Filter tab switching
            $(document).on('click.pagodaBrowse', '.filter-tab', function () {
                const filter = $(this).data('filter');
                self.switchFilter(filter);
            });

            // Floor selection
            $(document).on('change.pagodaBrowse', '#floorSelect', function () {
                self.selectedFloorId = $(this).val();
                self.loadConfigs();
            });

            // Deity selection
            $(document).on('change.pagodaBrowse', '#deitySelect', function () {
                self.selectedDeityId = $(this).val();
                self.loadConfigs();
            });

            // View seat map button
            $(document).on('click.pagodaBrowse', '.view-seat-map-btn', function () {
                const configId = $(this).data('config-id');
                self.viewSeatMap(configId);
            });
        },

        /**
         * Switch between floor and deity filter
         */
        switchFilter: function (filterType) {
            this.currentFilter = filterType;

            // Update tabs
            $('.filter-tab').removeClass('active');
            $(`.filter-tab[data-filter="${filterType}"]`).addClass('active');

            // Show/hide filter panels
            if (filterType === 'deity') {
                $('#filter-deity').show();
                $('#filter-floor').hide();
            } else {
                $('#filter-deity').hide();
                $('#filter-floor').show();
            }

            // Reset selections
            this.selectedFloorId = null;
            this.selectedDeityId = null;
            this.configs = [];
            this.renderConfigs();
        },

        /**
         * Load floors and deities for filters
         */
        loadFilters: function () {
            const self = this;

            // Load floors
            TempleAPI.get('/floors')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.floors = response.data;
                        self.renderFloorOptions();
                    }
                })
                .fail(function () {
                    console.warn('Failed to load floors');
                });

            // Load deities
            TempleAPI.get('/light-deities')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.deities = response.data;
                        self.renderDeityOptions();
                    }
                })
                .fail(function () {
                    console.warn('Failed to load deities');
                });
        },

        /**
         * Render floor options
         */
        renderFloorOptions: function () {
            const $select = $('#floorSelect');
            $select.empty().append('<option value="">-- Select Floor --</option>');

            this.floors.forEach(function (floor) {
                $select.append(`<option value="${floor.floor_id}">${floor.floor_name}</option>`);
            });
        },

        /**
         * Render deity options
         */
        renderDeityOptions: function () {
            const $select = $('#deitySelect');
            $select.empty().append('<option value="">-- Select Deity --</option>');

            this.deities.forEach(function (deity) {
                const floorName = deity.floor ? deity.floor.floor_name : '';
                $select.append(`<option value="${deity.deity_id}">${deity.deity_name} ${floorName ? '(' + floorName + ')' : ''}</option>`);
            });
        },

        /**
         * Load configurations based on selected filter
         */
        loadConfigs: function () {
            const self = this;
            const params = {};

            if (self.currentFilter === 'floor' && self.selectedFloorId) {
                params.floor_id = self.selectedFloorId;
            } else if (self.currentFilter === 'deity' && self.selectedDeityId) {
                params.deity_id = self.selectedDeityId;
            } else {
                // No filter selected, clear configs
                self.configs = [];
                self.renderConfigs();
                return;
            }

            TempleUtils.showLoading();

            TempleAPI.get('/light-configs', params)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.configs = response.data;
                        self.renderConfigs();
                    }
                })
                .fail(function () {
                    TempleUtils.showError('Failed to load configurations');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        /**
         * Render configuration cards
         */
        renderConfigs: function () {
            const self = this;
            const $container = $('#configsGrid');

            if (self.configs.length === 0) {
                $container.html(`
                    <div class="col-12">
                        <div class="card border-0 bg-light">
                            <div class="card-body text-center py-5">
                                <i class="bi bi-lightbulb" style="font-size: 4rem; color: #ccc;"></i>
                                <h5 class="mt-3 text-muted">No light configurations available</h5>
                                <p class="text-muted">Please select a ${self.currentFilter} to view available lights</p>
                            </div>
                        </div>
                    </div>
                `);
                return;
            }

            let html = '';
            self.configs.forEach(function (config) {
                html += self.renderConfigCard(config);
            });

            $container.html(html);
        },

        /**
         * Render a single configuration card
         */
        renderConfigCard: function (config) {
            const typeIcons = {
                'PAGODA_TOWER': '??',
                'LOTUS_LAMP': '??',
                'WALL_LIGHT': '??'
            };

            const typeNames = {
                'PAGODA_TOWER': 'Pagoda Tower',
                'LOTUS_LAMP': 'Lotus Lamp',
                'WALL_LIGHT': 'Wall Light'
            };

            const typeBadgeColors = {
                'PAGODA_TOWER': 'primary',
                'LOTUS_LAMP': 'warning',
                'WALL_LIGHT': 'info'
            };

            const availabilityPercent = config.total_units > 0
                ? Math.round((config.available_units / config.total_units) * 100)
                : 0;

            const availabilityClass =
                availabilityPercent > 50 ? 'success' :
                    availabilityPercent > 20 ? 'warning' : 'danger';

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm hover-shadow">
                        <div class="card-body">
                            <div class="d-flex align-items-start mb-3">
                                <span class="config-icon me-3" style="font-size: 3rem;">${typeIcons[config.type]}</span>
                                <div class="flex-grow-1">
                                    <h5 class="card-title mb-1">${config.config_name}</h5>
                                    <span class="badge bg-${typeBadgeColors[config.type]}">${typeNames[config.type]}</span>
                                </div>
                            </div>

                            <div class="mb-3">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="bi bi-building text-muted me-2"></i>
                                    <span>${config.floor.floor_name}</span>
                                </div>
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-star text-warning me-2"></i>
                                    <span>${config.deity.deity_name}</span>
                                </div>
                            </div>

                            ${config.description ? `<p class="text-muted small">${config.description}</p>` : ''}

                            <!-- Availability Bar -->
                            <div class="mb-3">
                                <div class="d-flex justify-content-between mb-1">
                                    <small class="text-muted">Availability</small>
                                    <small class="fw-bold text-${availabilityClass}">${availabilityPercent}%</small>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-${availabilityClass}" 
                                         style="width: ${availabilityPercent}%"></div>
                                </div>
                                <div class="mt-1 text-center">
                                    <small class="text-muted">
                                        <strong>${config.available_units}</strong> / ${config.total_units} available
                                    </small>
                                </div>
                            </div>

                            <button class="btn btn-primary w-100 view-seat-map-btn" 
                                    data-config-id="${config.config_id}"
                                    ${config.available_units === 0 ? 'disabled' : ''}>
                                <i class="bi bi-grid-3x3"></i>
                                ${config.available_units === 0 ? 'Fully Booked' : 'View Seat Map'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Navigate to seat map page
         */
        viewSeatMap: function (configId) {
            // Navigate using your existing page manager
            if (window.PageManager && window.PageManager.loadPage) {
                window.PageManager.loadPage('pagoda-seat-map', { configId: configId });
            } else {
                // Fallback
                console.log('Navigate to seat map for config:', configId);
                TempleUtils.showInfo('Seat map page will load here');
            }
        }
    };

})(jQuery, window);
