// js/pages/accounts/accounting-year.js
// Accounting Year Management Page - Simplified Version

(function ($, window) {
    'use strict';

    window.AccountsAccountingYearPage = {
        data: {
            years: [],
            currentActiveYear: null,
            selectedYearId: null
        },

        // Initialize page
        init: function (params) {
            console.log('AccountsAccountingYearPage initialized', params);
            this.render();
            this.bindEvents();
            this.loadYears();
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="container-fluid py-4">
                    <!-- Page Header -->
                    <div class="mb-4">
                        <h4 class="mb-1">Select Account to Activate</h4>
                        <p class="text-muted mb-0">Choose an accounting year to set as active</p>
                    </div>

                    <!-- Main Card -->
                    <div class="card">
                        <div class="card-body">
                            <!-- Loading State -->
                            <div id="loadingState" class="text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="text-muted mt-2">Loading accounting years...</p>
                            </div>

                            <!-- Main Form (hidden until loaded) -->
                            <div id="mainForm" style="display: none;">
                                <!-- Current Active Year Display -->
                                <div id="currentActiveYearDisplay" class="alert alert-info mb-4">
                                    <strong>Currently active account:</strong> <span id="currentActiveYearText">(NONE)</span>
                                </div>

                                <!-- Select Account Label -->
                                <div class="mb-3">
                                    <label for="yearSelect" class="form-label fw-bold">Select account</label>
                                    <select class="form-select form-select-lg" id="yearSelect">
                                 
                                    </select>
                                    <div class="form-text">
                                        Note: If you wish to use multiple accounts simultaneously, please use different browsers for each. 
                                        Also, please select (NONE) if you wish to deactivate all accounts.
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="d-flex gap-2 mt-4">
                                    <button type="button" class="btn btn-primary" id="btnActivate">
                                        Activate
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="btnCancel">
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            <!-- Empty State -->
                            <div id="emptyState" style="display: none;" class="text-center py-5">
                                <i class="bi bi-calendar-range text-muted" style="font-size: 3rem;"></i>
                                <p class="text-muted mt-3 mb-0">No accounting years found</p>
                                <p class="text-muted small">Please contact your administrator to create accounting years</p>
                            </div>

                            <!-- Error State -->
                            <div id="errorState" class="alert alert-danger" style="display: none;">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <span id="errorMessage">Failed to load accounting years</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Modal -->
                <div class="modal fade" id="confirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Confirm Activation</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p id="confirmMessage"></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnConfirmActivate">
                                    Yes, Activate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Activate button click
            $(document).on('click', '#btnActivate', function () {
                self.showConfirmation();
            });

            // Cancel button click
            $(document).on('click', '#btnCancel', function () {
                self.loadYears(); // Reload to reset selection
            });

            // Confirm activation in modal
            $(document).on('click', '#btnConfirmActivate', function () {
                self.activateYear();
            });

            // Year selection change
            $(document).on('change', '#yearSelect', function () {
                self.data.selectedYearId = $(this).val() || null;
            });
        },

        // Load years from API
        loadYears: function () {
            const self = this;

            // Show loading state
            $('#loadingState').show();
            $('#mainForm').hide();
            $('#emptyState').hide();
            $('#errorState').hide();

            TempleAPI.get('/accounts/accounting-years')
                .done(function (response) {
                    if (response.success) {
                        self.data.years = response.data || [];
                        
                        if (self.data.years.length === 0) {
                            // Show empty state
                            $('#loadingState').hide();
                            $('#emptyState').show();
                        } else {
                            // Find current active year (use loose comparison for status)
                            self.data.currentActiveYear = self.data.years.find(y => y.status == 1);
                            
                            // Populate dropdown and show form
                            self.populateDropdown();
                            self.updateCurrentActiveDisplay();
                            
                            $('#loadingState').hide();
                            $('#mainForm').show();
                        }
                    } else {
                        self.showError(response.message || 'Failed to load accounting years');
                    }
                })
                .fail(function (xhr) {
                    console.error('Load years failed:', xhr);
                    self.showError('Failed to load accounting years. Please try again.');
                });
        },

        // Populate dropdown with years
        populateDropdown: function () {
            const self = this;
            const $select = $('#yearSelect');
            
            // Clear existing options except (NONE)
            $select.find('option:not(:first)').remove();
            
            // Add year options
            self.data.years.forEach(function (year) {
                const fromDate = new Date(year.from_year_month);
                const toDate = new Date(year.to_year_month);
                const displayText = self.formatDateRange(fromDate, toDate);
                // Use loose comparison (==) to handle both string "1" and integer 1
                const isActive = year.status == 1;
                
                const option = $('<option></option>')
                    .val(year.id)
                    .text(displayText);
                
                $select.append(option);
                
                // Pre-select if active - set after appending to DOM
                if (isActive) {
                    $select.val(year.id);
                    self.data.selectedYearId = year.id;
                    console.log('Pre-selected active year:', year.id, displayText);
                }
            });
        },

        // Update current active year display
        updateCurrentActiveDisplay: function () {
            const self = this;
            const $display = $('#currentActiveYearText');
            
            if (self.data.currentActiveYear) {
                const fromDate = new Date(self.data.currentActiveYear.from_year_month);
                const toDate = new Date(self.data.currentActiveYear.to_year_month);
                const displayText = self.formatDateRange(fromDate, toDate);
                $display.text(displayText);
            } else {
                $display.text('(NONE)');
            }
        },

        // Show confirmation dialog
        showConfirmation: function () {
            const self = this;
            const selectedYearId = self.data.selectedYearId;
            
            let message;
            if (!selectedYearId) {
                message = 'Are you sure you want to deactivate all accounting years?';
            } else {
                const selectedYear = self.data.years.find(y => y.id == selectedYearId);
                if (selectedYear) {
                    const fromDate = new Date(selectedYear.from_year_month);
                    const toDate = new Date(selectedYear.to_year_month);
                    const displayText = self.formatDateRange(fromDate, toDate);
                    message = `Are you sure you want to activate accounting year: ${displayText}?`;
                } else {
                    message = 'Are you sure you want to activate the selected accounting year?';
                }
            }
            
            $('#confirmMessage').text(message);
            
            const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
            modal.show();
        },

        // Activate selected year
        activateYear: function () {
            const self = this;
            const selectedYearId = self.data.selectedYearId;
            
            // Close confirmation modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
            modal.hide();
            
            // If no year selected, deactivate all years
            if (!selectedYearId) {
                self.deactivateAllYears();
                return;
            }
            

            
            TempleAPI.post('/accounts/accounting-years/set-active', {
                year_id: selectedYearId
            })
                .done(function (response) {
                    if (response.success) {
          
                        TempleCore.showToast(response.message || 'Accounting year activated successfully', 'success');
                        // Reload the page data
                        setTimeout(() => {
                            self.loadYears();
                        }, 300);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to activate accounting year', 'error');
                        $('#btnActivate').prop('disabled', false).html('Activate');
                    }
                })
                .fail(function (xhr) {
                    console.error('Activate year failed:', xhr);
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error?.message || 'Failed to activate accounting year', 'error');
                    $('#btnActivate').prop('disabled', false).html('Activate');
                });
        },

        // Deactivate all years
        deactivateAllYears: function () {
            const self = this;
            
            // Show loading state
   
            
            // Get all year IDs
            const allIds = self.data.years.map(y => y.id);
            
            TempleAPI.post('/accounts/accounting-years/bulk-update-status', {
                selected_ids: [],  // Empty array means deactivate all
                all_ids: allIds
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'All accounting years deactivated successfully', 'success');
                        // Reload the page data
                        setTimeout(() => {
                            self.loadYears();
                        }, 500);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to deactivate accounting years', 'error');
                        $('#btnActivate').prop('disabled', false).html('Activate');
                    }
                })
                .fail(function (xhr) {
                    console.error('Deactivate years failed:', xhr);
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error?.message || 'Failed to deactivate accounting years', 'error');
                    $('#btnActivate').prop('disabled', false).html('Activate');
                });
        },

        // Show error state
        showError: function (message) {
            $('#loadingState').hide();
            $('#mainForm').hide();
            $('#emptyState').hide();
            $('#errorMessage').text(message);
            $('#errorState').show();
        },

        // Helper: Format date range as "Oct 2024 - Sep 2025"
        formatDateRange: function (fromDate, toDate) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            const fromMonth = months[fromDate.getMonth()];
            const fromYear = fromDate.getFullYear();
            const toMonth = months[toDate.getMonth()];
            const toYear = toDate.getFullYear();
            
            return `${fromMonth} ${fromYear} - ${toMonth} ${toYear}`;
        }
    };

})(jQuery, window);