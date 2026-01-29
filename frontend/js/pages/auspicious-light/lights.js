// js/pages/auspicious-light/lights.js
// Pagoda Lights Management - Search, View, and Manage Light Inventory

(function ($, window) {
    'use strict';

    window.PagodaLightsPage = {
        currentFilters: {},
        currentPage: 1,
        perPage: 50,
        eventHandlers: {}, // Store event handler references

        // Initialize page
        init: function (params) {
            console.log('Initializing Pagoda Lights Management');
            this.params = params || {};
            this.render();
            this.loadFilters();
            this.loadLights();
            this.attachEvents();
        },

        // Render page structure
        render: function () {
            const html = `
        <div class="lights-management-container">
            
            <!-- Page Header -->
            <div class="page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                        <h1 class="page-title mb-2">
                            <i class="bi bi-lightbulb me-2"></i>
                            Lights Management
                        </h1>
                        <p class="text-muted mb-0">灯管理 - Search and manage pagoda light inventory</p>
                    </div>
                    <div class="d-flex gap-2 mt-3 mt-md-0">
                        <button class="btn btn-outline-secondary" id="btnResetFilters">
                            <i class="bi bi-arrow-counterclockwise"></i> Reset
                        </button>
                        <button class="btn btn-outline-primary" id="btnExportLights">
                            <i class="bi bi-download"></i> Export
                        </button>
                        <button class="btn btn-success" id="btnNewRegistration">
                            <i class="bi bi-plus-circle"></i> Register Light
                        </button>
                    </div>
                </div>
            </div>

            <!-- Statistics Cards -->
            <div class="row g-3 mb-4" id="lights-stats">
                <div class="col-6 col-md-3">
                    <div class="card stat-card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3 class="mb-1" id="statTotal">-</h3>
                            <small>Total Lights</small>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card stat-card bg-success text-white">
                        <div class="card-body text-center">
                            <h3 class="mb-1" id="statAvailable">-</h3>
                            <small>Available</small>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card stat-card bg-info text-white">
                        <div class="card-body text-center">
                            <h3 class="mb-1" id="statRegistered">-</h3>
                            <small>Registered</small>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card stat-card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3 class="mb-1" id="statExpired">-</h3>
                            <small>Expired</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search & Filter Section -->
            <div class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="bi bi-funnel me-2"></i>
                        Search & Filter
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <!-- Search -->
                        <div class="col-md-4">
                            <label class="form-label">Search</label>
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input type="text" class="form-control" id="searchInput" 
                                       placeholder="Light number or code...">
                            </div>
                        </div>

                        <!-- Tower Filter -->
                        <div class="col-md-2">
                            <label class="form-label">Tower</label>
                            <select class="form-select" id="filterTower">
                                <option value="">All Towers</option>
                            </select>
                        </div>

                        <!-- Block Filter -->
                        <div class="col-md-2">
                            <label class="form-label">Block</label>
                            <select class="form-select" id="filterBlock">
                                <option value="">All Blocks</option>
                            </select>
                        </div>

                        <!-- Floor Filter -->
                        <div class="col-md-2">
                            <label class="form-label">Floor</label>
                            <input type="number" class="form-control" id="filterFloor" 
                                   placeholder="Floor #" min="1">
                        </div>

                        <!-- Status Filter -->
                        <div class="col-md-2">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="filterStatus">
                                <option value="">All Status</option>
                                <option value="available">Available</option>
                                <option value="registered">Registered</option>
                                <option value="expired">Expired</option>
                                <option value="terminated">Terminated</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <div class="row mt-3">
                        <div class="col-12">
                            <button class="btn btn-primary" id="btnApplyFilters">
                                <i class="bi bi-search"></i> Search
                            </button>
                            <button class="btn btn-outline-secondary ms-2" id="btnClearSearch">
                                <i class="bi bi-x-circle"></i> Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results Section -->
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="bi bi-list-ul me-2"></i>
                        Lights Inventory
                    </h5>
                    <div class="d-flex align-items-center gap-3">
                        <span class="text-muted" id="resultsCount">Loading...</span>
                        <select class="form-select form-select-sm" id="perPageSelect" style="width: auto;">
                            <option value="25">25 per page</option>
                            <option value="50" selected>50 per page</option>
                            <option value="100">100 per page</option>
                        </select>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" id="lightsTable">
                            <thead class="table-light">
                                <tr>
                                    <th>Light #</th>
                                    <th>Light Code</th>
                                    <th>Location</th>
                                    <th>Floor</th>
                                    <th>Position</th>
                                    <th>Status</th>
                                    <th>Devotee</th>
                                    <th>Expiry Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="lightsTableBody">
                                <tr>
                                    <td colspan="9" class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="mt-3 text-muted">Loading lights...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <div id="paginationContainer"></div>
                </div>
            </div>

        </div>
    `;

            $('#page-container').html(html);
        },

        // Load filter options
        loadFilters: function () {
            const self = this;

            // Load towers
            PagodaAPI.towers.getAll()
                .done(function (response) {
                    console.log('Towers response:', response);
                    if (response.success && response.data) {
                        const towers = Array.isArray(response.data) ? response.data : response.data.data || [];
                        self.populateTowerFilter(towers);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load towers:', xhr);
                });

            // Load statistics
            this.loadStatistics();
        },

        // Populate tower filter dropdown
        populateTowerFilter: function (towers) {
            const $select = $('#filterTower');
            $select.find('option:not(:first)').remove();

            towers.forEach(function (tower) {
                $select.append(`<option value="${tower.id}">${tower.tower_name} (${tower.tower_code})</option>`);
            });
        },

        // Load blocks when tower selected
        loadBlocksForTower: function (towerId) {
            const self = this;
            const $blockSelect = $('#filterBlock');

            $blockSelect.html('<option value="">All Blocks</option>').prop('disabled', true);

            if (!towerId) return;

            PagodaAPI.blocks.getByTower(towerId)
                .done(function (response) {
                    console.log('Blocks response:', response);
                    if (response.success && response.data) {
                        const blocks = Array.isArray(response.data) ? response.data : response.data.data || [];
                        blocks.forEach(function (block) {
                            $blockSelect.append(`<option value="${block.id}">${block.block_name} (${block.block_code})</option>`);
                        });
                        $blockSelect.prop('disabled', false);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load blocks:', xhr);
                });
        },

        // Load statistics
        loadStatistics: function () {
            console.log('Loading statistics from dashboard...');
            const self = this;

            // Use PagodaAPI service to get dashboard data
            PagodaAPI.reports.getDashboard()
                .done(function (response) {
                    console.log('Dashboard response:', response);

                    if (response.success && response.data && response.data.overview) {
                        const overview = response.data.overview;

                        $('#statTotal').text(self.formatNumber(overview.total_lights || 0));
                        $('#statAvailable').text(self.formatNumber(overview.available_lights || 0));
                        $('#statRegistered').text(self.formatNumber(overview.registered_lights || 0));
                        $('#statExpired').text(self.formatNumber(overview.expired_lights || 0));

                        console.log('Statistics loaded successfully:', overview);
                    } else {
                        console.warn('Dashboard API returned unexpected structure:', response);
                        self.setDefaultStats();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load dashboard statistics:', xhr);
                    self.setDefaultStats();
                });
        },

        // Set default stats on error
        setDefaultStats: function () {
            $('#statTotal, #statAvailable, #statRegistered, #statExpired').text('0');
        },

        // Format number with commas
        formatNumber: function (num) {
            if (num === null || num === undefined) return '0';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        // Load lights with filters
        loadLights: function () {
            const self = this;

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.currentFilters
            };

            console.log('Loading lights with params:', params);

            TempleUtils.showLoading('Loading lights...');

            PagodaAPI.lights.search(params)
                .done(function (response) {
                    console.log('Lights search response:', response);

                    if (response.success && response.data) {
                        self.renderLightsTable(response.data);
                        self.renderPagination(response.data);
                    } else {
                        self.showNoResults();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load lights:', xhr);
                    TempleUtils.handleAjaxError(xhr, 'Failed to load lights');
                    self.showNoResults();
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Render lights table
        renderLightsTable: function (data) {
            const lights = data.data || [];
            const total = data.total || 0;

            $('#resultsCount').text(`Showing ${lights.length} of ${total} lights`);

            if (lights.length === 0) {
                this.showNoResults();
                return;
            }

            const rows = lights.map(light => {
                const statusBadge = this.getStatusBadge(light.status);
                const location = light.tower && light.block ?
                    `${light.tower.tower_name || light.tower.name} - ${light.block.block_name || light.block.name}` :
                    'N/A';
                const devoteeInfo = light.devotee ?
                    `<small class="text-muted">${light.devotee.name || light.devotee.name_english}<br>${light.devotee.contact || light.devotee.contact_no}</small>` :
                    '<small class="text-muted">-</small>';
                const expiryDate = light.expiry_date ?
                    moment(light.expiry_date).format('DD/MM/YYYY') :
                    '-';

                // Determine action buttons based on status and blocked state
                let actionButtons = '';

                if (light.is_blocked) {
                    // Blocked light - show unlock icon
                    actionButtons = `
                    <button class="btn btn-outline-warning btn-unblock-light" 
                            data-id="${light.id}" 
                            title="Unblock Light - ${light.block_reason || 'No reason provided'}">
                        <i class="bi bi-unlock"></i>
                    </button>
                `;
                } else if (light.status === 'available') {
                    // Available light - show register and block icons
                    actionButtons = `
                    <button class="btn btn-outline-success btn-register-light" 
                            data-number="${light.light_number}" title="Register">
                        <i class="bi bi-plus-circle"></i>
                    </button>
                    <button class="btn btn-outline-secondary btn-block-light" 
                            data-id="${light.id}" title="Block Light">
                        <i class="bi bi-lock"></i>
                    </button>
                `;
                }

                return `
                <tr ${light.is_blocked ? 'class="table-warning"' : ''}>
                    <td><strong>${light.light_number}</strong></td>
                    <td><code class="light-code">${light.light_code}</code></td>
                    <td><small>${location}</small></td>
                    <td class="text-center">${light.floor_number || '-'}</td>
                    <td class="text-center">${light.rag_position || '-'}</td>
                    <td>${statusBadge}${light.is_blocked ? ' <span class="badge bg-warning text-dark"><i class="bi bi-lock-fill"></i> Blocked</span>' : ''}</td>
                    <td>${devoteeInfo}</td>
                    <td class="text-center">${expiryDate}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-view-light" 
                                    data-id="${light.id}" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
            }).join('');

            $('#lightsTableBody').html(rows);
        },

        // Get status badge HTML
        getStatusBadge: function (status) {
            const colors = {
                'available': 'success',
                'registered': 'primary',
                'expired': 'warning',
                'terminated': 'danger',
                'maintenance': 'secondary'
            };

            const color = colors[status] || 'secondary';
            const text = status.charAt(0).toUpperCase() + status.slice(1);

            return `<span class="badge bg-${color}">${text}</span>`;
        },

        // Show no results
        showNoResults: function () {
            $('#lightsTableBody').html(`
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <i class="bi bi-inbox display-4 text-muted d-block mb-3"></i>
                        <p class="text-muted">No lights found matching your criteria</p>
                        <button class="btn btn-sm btn-outline-primary" id="btnClearFiltersNoResults">
                            <i class="bi bi-arrow-counterclockwise"></i> Clear Filters
                        </button>
                    </td>
                </tr>
            `);

            $('#resultsCount').text('No results');
            $('#paginationContainer').empty();
        },

        // Render pagination
        renderPagination: function (data) {
            const totalPages = data.last_page || 1;
            const currentPage = data.current_page || 1;

            if (totalPages <= 1) {
                $('#paginationContainer').empty();
                return;
            }

            let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

            // Previous button
            paginationHtml += `
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `;

            // Page numbers (show max 7 pages)
            let startPage = Math.max(1, currentPage - 3);
            let endPage = Math.min(totalPages, currentPage + 3);

            if (startPage > 1) {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
                if (startPage > 2) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
            }

            // Next button
            paginationHtml += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

            paginationHtml += '</ul></nav>';

            $('#paginationContainer').html(paginationHtml);
        },

        attachEvents: function () {
            const self = this;

            // ✅ IMPORTANT: Remove old event handlers first to prevent duplicates
            this.detachEvents();

            // Tower change - Use namespaced events
            $(document).on('change.pagodaLights', '#filterTower', function () {
                const towerId = $(this).val();
                self.loadBlocksForTower(towerId);
            });

            // Apply filters
            $(document).on('click.pagodaLights', '#btnApplyFilters', function () {
                self.applyFilters();
            });

            // Clear search
            $(document).on('click.pagodaLights', '#btnClearSearch, #btnClearFiltersNoResults', function () {
                self.clearFilters();
            });

            // Reset filters
            $(document).on('click.pagodaLights', '#btnResetFilters', function () {
                self.clearFilters();
            });

            // Search on Enter key
            $(document).on('keypress.pagodaLights', '#searchInput', function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            // Per page change
            $(document).on('change.pagodaLights', '#perPageSelect', function () {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadLights();
            });

            // Pagination clicks
            $(document).on('click.pagodaLights', '#paginationContainer .page-link', function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && !$(this).parent().hasClass('disabled')) {
                    self.currentPage = page;
                    self.loadLights();
                    $('html, body').animate({ scrollTop: 0 }, 300);
                }
            });

            // View light details
            $(document).on('click.pagodaLights', '.btn-view-light', function () {
                const id = $(this).data('id');
                self.viewLightDetails(id);
            });

            // Register light
            $(document).on('click.pagodaLights', '.btn-register-light', function () {
                const lightNumber = $(this).data('number');
                self.registerLight(lightNumber);
            });

            // Block light
            $(document).on('click.pagodaLights', '.btn-block-light', function () {
                const lightId = $(this).data('id');
                self.blockLight(lightId);
            });

            // Unblock light
            $(document).on('click.pagodaLights', '.btn-unblock-light', function () {
                const lightId = $(this).data('id');
                self.unblockLight(lightId);
            });

            // New registration
            $(document).on('click.pagodaLights', '#btnNewRegistration', function () {
                TempleRouter.navigate('auspicious-light/entry');
            });

            // Export lights
            $(document).on('click.pagodaLights', '#btnExportLights', function () {
                self.exportLights();
            });
        },

        // Detach all event handlers
        detachEvents: function () {
            // Remove all namespaced events
            $(document).off('.pagodaLights');

            console.log('Pagoda Lights events detached');
        },

        // Cleanup function
        destroy: function () {
            console.log('Cleaning up Pagoda Lights Management page');

            // Remove all event handlers
            this.detachEvents();

            // Clear data
            this.eventHandlers = {};
            this.currentFilters = {};
            this.currentPage = 1;
            this.perPage = 50;
            this.params = null;

            // Remove any modals
            $('#lightDetailsModal').remove();
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('overflow', '');

            // Clear container
            $('#page-container').empty();

            console.log('Pagoda Lights Management page cleaned up');
        },
        // Apply filters
        applyFilters: function () {
            this.currentFilters = {
                search: $('#searchInput').val().trim(),
                tower_id: $('#filterTower').val(),
                block_id: $('#filterBlock').val(),
                floor_number: $('#filterFloor').val(),
                status: $('#filterStatus').val()
            };

            // Remove empty filters
            Object.keys(this.currentFilters).forEach(key => {
                if (!this.currentFilters[key]) {
                    delete this.currentFilters[key];
                }
            });

            console.log('Applying filters:', this.currentFilters);

            this.currentPage = 1;
            this.loadLights();
        },

        // Clear filters
        clearFilters: function () {
            $('#searchInput').val('');
            $('#filterTower').val('');
            $('#filterBlock').val('').prop('disabled', true);
            $('#filterFloor').val('');
            $('#filterStatus').val('');

            this.currentFilters = {};
            this.currentPage = 1;
            this.loadLights();
        },

        // View light details
        viewLightDetails: function (lightId) {
            const self = this;

            TempleUtils.showLoading('Loading light details...');

            PagodaAPI.lights.getById(lightId)
                .done(function (response) {
                    console.log('Light details response:', response);

                    if (response.success && response.data) {
                        self.showLightDetailsModal(response.data);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load light details:', xhr);
                    TempleUtils.handleAjaxError(xhr, 'Failed to load light details');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Show light details modal
        showLightDetailsModal: function (data) {
            const light = data.light || data;
            const location = data.location || {};
            const currentReg = data.current_registration;
            const history = data.registration_history || [];

            const historyRows = history.map(reg => `
                <tr>
                    <td><small>${reg.devotee_name}</small></td>
                    <td><small>${moment(reg.offer_date).format('DD/MM/YYYY')}</small></td>
                    <td><small>${moment(reg.expiry_date).format('DD/MM/YYYY')}</small></td>
                    <td><span class="badge bg-${reg.status === 'active' ? 'success' : 'secondary'}">${reg.status}</span></td>
                </tr>
            `).join('') || '<tr><td colspan="4" class="text-center text-muted">No registration history</td></tr>';

            const modalHtml = `
                <div class="modal fade" id="lightDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-lightbulb me-2"></i>
                                    Light Details - ${light.light_code}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <!-- Light Info -->
                                    <div class="col-md-6">
                                        <h6 class="mb-3">Light Information</h6>
                                        <table class="table table-sm">
                                            <tr>
                                                <td class="text-muted">Light Number:</td>
                                                <td><strong>${light.light_number}</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Light Code:</td>
                                                <td><code class="light-code">${light.light_code}</code></td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Status:</td>
                                                <td>${this.getStatusBadge(light.status)}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <!-- Location -->
                                    <div class="col-md-6">
                                        <h6 class="mb-3">Location</h6>
                                        <table class="table table-sm">
                                            <tr>
                                                <td class="text-muted">Tower:</td>
                                                <td>${location.tower || 'N/A'} ${location.tower_code ? '(' + location.tower_code + ')' : ''}</td>
                                            </tr>
                                            ${location.category_name ? `
                                            <tr>
                                                <td class="text-muted">Category:</td>
                                                <td><span class="badge bg-info">${location.category_name}</span></td>
                                            </tr>
                                            ` : ''}
                                            <tr>
                                                <td class="text-muted">Block:</td>
                                                <td>${location.block || 'N/A'} ${location.block_code ? '(' + location.block_code + ')' : ''}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Floor:</td>
                                                <td>${location.floor || light.floor_number || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Position:</td>
                                                <td>${location.position || light.rag_position || 'N/A'}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    ${currentReg ? `
                                    <!-- Current Registration -->
                                    <div class="col-12">
                                        <h6 class="mb-3">Current Registration</h6>
                                        <div class="alert alert-info">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <p class="mb-1"><strong>Devotee:</strong> ${currentReg.devotee.name_english || currentReg.devotee.name}</p>
                                                    <p class="mb-1"><strong>Contact:</strong> ${currentReg.devotee.contact_no || currentReg.devotee.contact}</p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p class="mb-1"><strong>Offer Date:</strong> ${moment(currentReg.offer_date).format('DD/MM/YYYY')}</p>
                                                    <p class="mb-1"><strong>Expiry Date:</strong> ${moment(currentReg.expiry_date).format('DD/MM/YYYY')}</p>
                                                    <p class="mb-1"><strong>Days Remaining:</strong> ${currentReg.days_until_expiry} days</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    <!-- Registration History -->
                                    <div class="col-12">
                                        <h6 class="mb-3">Registration History</h6>
                                        <div class="table-responsive">
                                            <table class="table table-sm table-bordered">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th>Devotee</th>
                                                        <th>Offer Date</th>
                                                        <th>Expiry Date</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${historyRows}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                ${light.status === 'available' ? `
                                    <button type="button" class="btn btn-success" onclick="PagodaLightsPage.registerLight(${light.light_number})">
                                        <i class="bi bi-plus-circle"></i> Register This Light
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            $('#lightDetailsModal').remove();

            // Add and show modal
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('lightDetailsModal'));
            modal.show();

            // Clean up on close
            $('#lightDetailsModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Register light (redirect to entry form with pre-filled light number)
        registerLight: function (lightNumber) {
            // Store light number in session storage for the entry form to pick up
            sessionStorage.setItem('selected_light_number', lightNumber);
            TempleRouter.navigate('auspicious-light/entry');
        },

        // Block a light from new registrations
        blockLight: function (lightId) {
            const self = this;

            Swal.fire({
                title: 'Block Light',
                text: 'Please provide a reason for blocking this light:',
                input: 'textarea',
                inputPlaceholder: 'e.g., Maintenance required, Damaged, etc.',
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-lock"></i> Block Light',
                confirmButtonColor: '#6c757d',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Please provide a reason for blocking';
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Blocking light...');

                    TempleAPI.post(`/pagoda/lights/${lightId}/block`, {
                        reason: result.value
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Light blocked successfully');
                                self.loadLights(); // Reload the list
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to block light');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },

        // Unblock a light to allow new registrations
        unblockLight: function (lightId) {
            const self = this;

            Swal.fire({
                title: 'Unblock Light',
                text: 'Are you sure you want to unblock this light? It will be available for new registrations.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-unlock"></i> Unblock Light',
                confirmButtonColor: '#ffc107',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Unblocking light...');

                    TempleAPI.post(`/pagoda/lights/${lightId}/unblock`)
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Light unblocked successfully');
                                self.loadLights(); // Reload the list
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to unblock light');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },

        // Export lights to CSV
        exportLights: function () {
            const self = this;

            Swal.fire({
                title: 'Export Lights',
                html: `
                    <p>Choose export option:</p>
                    <div class="form-check text-start mb-2">
                        <input class="form-check-input" type="radio" name="exportOption" id="exportCurrent" value="current" checked>
                        <label class="form-check-label" for="exportCurrent">
                            Export current page only
                        </label>
                    </div>
                    <div class="form-check text-start">
                        <input class="form-check-input" type="radio" name="exportOption" id="exportAll" value="all">
                        <label class="form-check-label" for="exportAll">
                            Export all filtered results (may take time)
                        </label>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-download"></i> Export',
                cancelButtonText: 'Cancel',
                showLoaderOnConfirm: true,
                preConfirm: function () {
                    const exportOption = document.querySelector('input[name="exportOption"]:checked').value;

                    if (exportOption === 'current') {
                        // Export current page data (already loaded)
                        const currentLights = [];
                        $('#lightsTableBody tr').each(function () {
                            const $row = $(this);
                            if ($row.find('td').length > 1) { // Skip empty/loading rows
                                const lightNumber = $row.find('td:eq(0) strong').text();
                                const lightCode = $row.find('td:eq(1) code').text();
                                const location = $row.find('td:eq(2) small').text();
                                const floor = $row.find('td:eq(3)').text().trim();
                                const position = $row.find('td:eq(4)').text().trim();
                                const status = $row.find('td:eq(5) .badge').text();
                                const devotee = $row.find('td:eq(6) small').text().replace(/\n/g, ' ').trim();
                                const expiry = $row.find('td:eq(7)').text().trim();

                                currentLights.push({
                                    light_number: lightNumber,
                                    light_code: lightCode,
                                    location: location,
                                    floor_number: floor,
                                    rag_position: position,
                                    status: status,
                                    devotee_info: devotee || '-',
                                    expiry_date: expiry
                                });
                            }
                        });
                        return Promise.resolve(currentLights);
                    } else {
                        // Fetch all data with current filters (limit to 5000)
                        const exportParams = {
                            ...self.currentFilters,
                            per_page: 5000,
                            page: 1
                        };

                        return PagodaAPI.lights.search(exportParams)
                            .then(function (response) {
                                if (response.success && response.data) {
                                    return response.data.data || [];
                                }
                                throw new Error('Failed to fetch lights data');
                            })
                            .catch(function (error) {
                                Swal.showValidationMessage('Export failed: ' + error.message);
                            });
                    }
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    self.generateCSVExport(result.value);
                }
            });
        },

        // Generate and download CSV file
        generateCSVExport: function (lights) {
            if (!lights || lights.length === 0) {
                TempleUtils.showWarning('No data to export');
                return;
            }

            try {
                // CSV Headers
                const headers = [
                    'Light Number',
                    'Light Code',
                    'Location',
                    'Floor',
                    'Position',
                    'Status',
                    'Devotee Info',
                    'Expiry Date'
                ];

                // Build CSV rows
                const rows = lights.map(light => {
                    // Handle two different data structures
                    let lightNumber, lightCode, location, floor, position, status, devoteeInfo, expiryDate;

                    if (light.light_number && typeof light.light_number === 'string') {
                        // Current page data (from DOM)
                        lightNumber = light.light_number;
                        lightCode = light.light_code;
                        location = light.location;
                        floor = light.floor_number;
                        position = light.rag_position;
                        status = light.status;
                        devoteeInfo = light.devotee_info;
                        expiryDate = light.expiry_date;
                    } else {
                        // API data
                        const tower = light.tower ? (light.tower.tower_name || light.tower.name) : '';
                        const block = light.block ? (light.block.block_name || light.block.name) : '';
                        location = tower && block ? `${tower} - ${block}` : 'N/A';

                        lightNumber = light.light_number;
                        lightCode = light.light_code;
                        floor = light.floor_number || '';
                        position = light.rag_position || '';
                        status = light.status;

                        if (light.devotee) {
                            const name = light.devotee.name_english || light.devotee.name || '';
                            const contact = light.devotee.contact_no || light.devotee.contact || '';
                            devoteeInfo = `${name} ${contact}`.trim();
                        } else {
                            devoteeInfo = '-';
                        }

                        expiryDate = light.expiry_date ? moment(light.expiry_date).format('DD/MM/YYYY') : '-';
                    }

                    return [
                        lightNumber,
                        lightCode,
                        location,
                        floor,
                        position,
                        status,
                        devoteeInfo,
                        expiryDate
                    ];
                });

                // Convert to CSV format
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row =>
                        row.map(cell => {
                            // Escape cells containing commas or quotes
                            const cellStr = String(cell || '');
                            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                                return `"${cellStr.replace(/"/g, '""')}"`;
                            }
                            return cellStr;
                        }).join(',')
                    )
                ].join('\n');

                // Add BOM for UTF-8 encoding (helps with Excel)
                const BOM = '\uFEFF';
                const csvWithBOM = BOM + csvContent;

                // Create blob and download
                const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);

                const timestamp = moment().format('YYYY-MM-DD_HHmmss');
                const filterInfo = Object.keys(this.currentFilters).length > 0 ? '_filtered' : '';
                const filename = `pagoda_lights${filterInfo}_${timestamp}.csv`;

                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                TempleUtils.showSuccess(`Successfully exported ${lights.length} lights to ${filename}`);

            } catch (error) {
                console.error('Export error:', error);
                TempleUtils.showError('Failed to generate CSV file: ' + error.message);
            }
        },

        // Cleanup function
        destroy: function () {
            console.log('Cleaning up Pagoda Lights Management page');

            // Remove all event handlers
            if (this.eventHandlers) {
                $(document).off('change', '#filterTower', this.eventHandlers.towerChange);
                $(document).off('click', '#btnApplyFilters', this.eventHandlers.applyFilters);
                $(document).off('click', '#btnClearSearch, #btnClearFiltersNoResults', this.eventHandlers.clearSearch);
                $(document).off('click', '#btnResetFilters', this.eventHandlers.resetFilters);
                $(document).off('keypress', '#searchInput', this.eventHandlers.searchKeypress);
                $(document).off('change', '#perPageSelect', this.eventHandlers.perPageChange);
                $(document).off('click', '#paginationContainer .page-link', this.eventHandlers.paginationClick);
                $(document).off('click', '.btn-view-light', this.eventHandlers.viewLight);
                $(document).off('click', '.btn-register-light', this.eventHandlers.registerLight);
                $(document).off('click', '#btnNewRegistration', this.eventHandlers.newRegistration);
                $(document).off('click', '#btnExportLights', this.eventHandlers.exportLights);
            }

            // Clear data
            this.eventHandlers = {};
            this.currentFilters = {};
            this.currentPage = 1;
            this.perPage = 50;
            this.params = null;

            // Remove any modals
            $('#lightDetailsModal').remove();
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('overflow', '');

            // Clear container
            $('#page-container').empty();

            console.log('Pagoda Lights Management page cleaned up');
        }
    };

})(jQuery, window);