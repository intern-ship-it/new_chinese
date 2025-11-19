// js/pages/settings/index.js
// Settings Management Module with Tab Views and AJAX Loading

(function ($, window) {
    'use strict';

    window.SettingsPage = {
        currentUser: null,
        currentTab: 'SYSTEM',
        settings: {},
        hasUnsavedChanges: false,
        tabs: [
            { key: 'SYSTEM', label: 'System', icon: 'gear' },
            { key: 'AWS', label: 'AWS', icon: 'cloud' },
            { key: 'EMAIL', label: 'Email', icon: 'envelope' },
            { key: 'SMS', label: 'SMS', icon: 'chat-text' },
            { key: 'ACCOUNTS', label: 'Accounts', icon: 'calculator' },
            { key: 'PURCHASE', label: 'Purchase', icon: 'cart' },
            { key: 'NOTIFICATION', label: 'Notification', icon: 'bell' },
            { key: 'OTHER', label: 'Other', icon: 'three-dots' }
        ],
        dropdownData: {
            ac_years: [],
            organization_positions: []
        },

        // Initialize page
        init: function (params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            // Check permissions
            if (!this.hasPermission('manage_settings')) {
                TempleCore.showToast('You do not have permission to manage settings', 'danger');
                TempleRouter.navigate('dashboard');
                return;
            }

            // Get tab from URL if provided
            if (params && params.tab) {
                this.currentTab = params.tab.toUpperCase();
            }

            this.render();
            this.bindEvents();
            this.loadInitialData();
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="settings-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-gear"></i> Settings
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item">
                                            <a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a>
                                        </li>
                                        <li class="breadcrumb-item active">Settings</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-outline-secondary" id="refreshSettingsBtn">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                                <button class="btn btn-primary ms-2" id="saveAllSettingsBtn" disabled>
                                    <i class="bi bi-check-circle"></i> Save All Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="row">
                        <!-- Tabs Sidebar -->
                        <div class="col-lg-3 mb-4">
                            <div class="settings-sidebar">
                                <div class="list-group">
                                    ${this.renderTabsList()}
                                </div>
                                
                                <!-- Quick Info -->
                                <div class="settings-info-card mt-3">
                                    <h6 class="mb-3">
                                        <i class="bi bi-info-circle"></i> Settings Info
                                    </h6>
                                    <small class="text-muted">
                                        Configure your temple management system settings. 
                                        Changes will be applied immediately after saving.
                                    </small>
                                    <hr>
                                    <div class="d-flex justify-content-between">
                                        <small>Last Updated:</small>
                                        <small class="text-muted" id="lastUpdatedTime">Never</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Settings Content -->
                        <div class="col-lg-9">
                            <div class="settings-content">
                                <!-- Tab Content Header -->
                                <div class="tab-content-header mb-3">
                                    <h4 id="tabTitle">
                                        <i class="bi bi-gear"></i> System Settings
                                    </h4>
                                    <p class="text-muted mb-0" id="tabDescription">
                                        Configure system-wide settings for your temple management system.
                                    </p>
                                </div>

                                <!-- Loading State -->
                                <div id="settingsLoader" class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-3">Loading settings...</p>
                                </div>

                                <!-- Settings Form Container -->
                                <div id="settingsFormContainer" style="display: none;">
                                    <form id="settingsForm" novalidate>
                                        <div id="settingsFieldsContainer">
                                            <!-- Dynamic form fields will be loaded here -->
                                        </div>
                                        
                                        <!-- Form Actions -->
                                        <div class="settings-form-actions mt-4">
                                            <button type="submit" class="btn btn-primary" id="saveTabSettingsBtn">
                                                <i class="bi bi-check-circle"></i> Save Changes
                                            </button>
                                            <button type="button" class="btn btn-outline-secondary ms-2" id="resetTabBtn">
                                                <i class="bi bi-arrow-counterclockwise"></i> Reset
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <!-- Error State -->
                                <div id="settingsError" class="alert alert-danger" style="display: none;">
                                    <i class="bi bi-exclamation-triangle"></i> 
                                    <span id="errorMessage">Failed to load settings</span>
                                </div>

                                <!-- Empty State -->
                                <div id="emptySettings" class="empty-state" style="display: none;">
                                    <i class="bi bi-inbox"></i>
                                    <h5>No Settings Available</h5>
                                    <p class="text-muted">There are no settings available for this section.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Unsaved Changes Modal -->
                <div class="modal fade" id="unsavedChangesModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Unsaved Changes</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>You have unsaved changes. Do you want to save them before switching tabs?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="discardChangesBtn">
                                    Discard Changes
                                </button>
                                <button type="button" class="btn btn-primary" id="saveAndSwitchBtn">
                                    Save & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    ${this.getPageStyles()}
                </style>
            `;

            $('#page-container').html(html);
        },

        // Render tabs list
        renderTabsList: function () {
            let html = '';

            this.tabs.forEach(tab => {
                const isActive = tab.key === this.currentTab;
                html += `
                    <a href="#" class="list-group-item list-group-item-action ${isActive ? 'active' : ''}" 
                       data-tab="${tab.key}">
                        <i class="bi bi-${tab.icon}"></i> ${tab.label}
                        <span class="badge bg-secondary float-end" id="${tab.key.toLowerCase()}Count" style="display: none;">0</span>
                    </a>
                `;
            });

            return html;
        },

        // Get page styles
        getPageStyles: function () {
            return `
                .settings-page {
                    padding: 20px 0;
                }

                .page-header {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                }

                .breadcrumb {
                    background: none;
                    padding: 0;
                    margin: 10px 0 0 0;
                }

                .settings-sidebar .list-group-item {
                    border: none;
                    padding: 12px 20px;
                    margin-bottom: 5px;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .settings-sidebar .list-group-item:hover {
                    background: #f8f9fa;
                    transform: translateX(5px);
                }

                .settings-sidebar .list-group-item.active {
                    background: var(--primary-color);
                    color: white;
                }

                .settings-sidebar .list-group-item i {
                    margin-right: 10px;
                    width: 20px;
                    text-align: center;
                }

                .settings-info-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                }

                .settings-content {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    min-height: 500px;
                }

                .tab-content-header {
                    border-bottom: 2px solid #f0f0f0;
                    padding-bottom: 15px;
                }

                .settings-form-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .settings-form-section h5 {
                    color: var(--primary-color);
                    margin-bottom: 20px;
                    font-size: 18px;
                    font-weight: 600;
                }

                .form-label {
                    font-weight: 600;
                    color: #495057;
                    margin-bottom: 8px;
                }

                .form-text {
                    color: #6c757d;
                    font-size: 13px;
                    margin-top: 5px;
                }

                .form-control:focus,
                .form-select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
                }

                .settings-form-actions {
                    padding-top: 20px;
                    border-top: 2px solid #f0f0f0;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #6c757d;
                }

                .empty-state i {
                    font-size: 64px;
                    margin-bottom: 20px;
                    color: #dee2e6;
                }

                .field-required {
                    color: #dc3545;
                    font-weight: bold;
                }

                .field-readonly {
                    background-color: #e9ecef !important;
                    cursor: not-allowed;
                }

                .validation-feedback {
                    display: none;
                    width: 100%;
                    margin-top: 0.25rem;
                    font-size: 0.875em;
                    color: #dc3545;
                }

                .was-validated .form-control:invalid ~ .validation-feedback {
                    display: block;
                }

                .settings-toggle {
                    width: 50px;
                    height: 26px;
                }

                .api-key-input {
                    font-family: monospace;
                    background: #f8f9fa;
                }

                .copy-btn {
                    cursor: pointer;
                }

                .conditional-field {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }

                .conditional-field.disabled {
                    opacity: 0.5;
                    pointer-events: none;
                }

                .conditional-field.disabled input,
                .conditional-field.disabled select,
                .conditional-field.disabled textarea {
                    background-color: #e9ecef !important;
                    cursor: not-allowed !important;
                }

                /* Style for the payment approval section */
                .payment-approval-section {
                    background: #f0f8ff;
                    border-left: 4px solid #007bff;
                    padding: 15px;
                    margin-top: 10px;
                    border-radius: 4px;
                }

                /* Enhanced styling for multi-select dropdowns */
                .select2-container--default .select2-selection--multiple {
                  min-height: 38px;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    background-color: #fff;
                }

                .select2-container--default.select2-container--focus .select2-selection--multiple {
                    border-color: var(--primary-color);
    box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
                }
.select2-container--default .select2-selection--multiple .select2-selection__choice {
    background-color: var(--primary-color);
    border: 1px solid var(--primary-color);
    color: white;
    border-radius: 0.25rem;
  2px 32px
    margin: 3px;
}
button.select2-selection__choice__remove{
background-color: #f1f1f1 !important;
    color: #333 !important;
}

.select2-container--default .select2-selection--multiple .select2-selection__choice__remove {

    border: none;
    border-right: 1px solid #aaa;
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    color: #fffdfd;
    cursor: pointer;
    font-size: 1em;
    font-weight: bold;
    padding: 0 4px;
    position: absolute;
    left: 0;
    top: 0;
    margin-right: 5px;
}

.select2-container--default .select2-results__option--highlighted[aria-selected] {
    background-color: var(--primary-color);
}
.conditional-field.disabled .select2-container {
    opacity: 0.5;
    pointer-events: none;
}
                /* Checkbox switch enhancement */
                .form-check-input.settings-toggle:checked {
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                }

                /* Amount input styling */
                .input-group-text {
                    background-color: #f8f9fa;
                    border-right: none;
                }

                .input-group input[type="number"] {
                    border-left: none;
                }

                /* Validation styling */
                .was-validated .conditional-field:not(.disabled) .form-control:invalid,
                .was-validated .conditional-field:not(.disabled) .form-select:invalid {
                    border-color: #dc3545;
                }

                @media (max-width: 768px) {
                    .settings-sidebar {
                        margin-bottom: 20px;
                    }
                    
                    .settings-content {
                        padding: 15px;
                    }
                }
            `;
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Tab switching
            $(document).on('click', '.list-group-item[data-tab]', function (e) {
                e.preventDefault();
                const newTab = $(this).data('tab');

                if (newTab === self.currentTab) return;

                if (self.hasUnsavedChanges) {
                    self.pendingTab = newTab;
                    $('#unsavedChangesModal').modal('show');
                } else {
                    self.switchTab(newTab);
                }
            });

            // Save tab settings
            $('#settingsForm').on('submit', function (e) {
                e.preventDefault();
                self.saveTabSettings();
            });

            // Save all settings
            $('#saveAllSettingsBtn').on('click', function () {
                self.saveAllSettings();
            });

            // Reset tab
            $('#resetTabBtn').on('click', function () {
                self.resetTabSettings();
            });

            // Refresh settings
            $('#refreshSettingsBtn').on('click', function () {
                self.loadTabSettings(self.currentTab);
            });

            // Handle unsaved changes modal
            $('#discardChangesBtn').on('click', function () {
                self.hasUnsavedChanges = false;
                $('#unsavedChangesModal').modal('hide');
                if (self.pendingTab) {
                    self.switchTab(self.pendingTab);
                    self.pendingTab = null;
                }
            });

            $('#saveAndSwitchBtn').on('click', function () {
                $('#unsavedChangesModal').modal('hide');
                self.saveTabSettings(function () {
                    if (self.pendingTab) {
                        self.switchTab(self.pendingTab);
                        self.pendingTab = null;
                    }
                });
            });

            // Track form changes
            $(document).on('change', '#settingsForm input, #settingsForm select, #settingsForm textarea', function () {
                self.hasUnsavedChanges = true;
                $('#saveAllSettingsBtn').prop('disabled', false);
            });

            // Handle is_approval_payment checkbox change
            $(document).on('change', '#is-approval-payment', function () {
                const isChecked = $(this).is(':checked');
                self.toggleConditionalFields('is_approval_payment', isChecked);

                // Mark as changed
                self.hasUnsavedChanges = true;
                $('#saveAllSettingsBtn').prop('disabled', false);

                // If unchecking, optionally clear the dependent field values
                if (!isChecked) {
                    $('#payment-approval').val([]).trigger('change');
                    $('#minimum-payment-approval-amount').val('0.00');
                    $('#approval-member-nos').val('1');
                }
            });

            // Handle is_purchase_order_approval checkbox change
            $(document).on('change', '#is-purchase-order-approval', function () {
                const isChecked = $(this).is(':checked');
                self.toggleConditionalFields('is_purchase_order_approval', isChecked);

                // Mark as changed
                self.hasUnsavedChanges = true;
                $('#saveAllSettingsBtn').prop('disabled', false);

                // If unchecking, optionally clear the dependent field values
                if (!isChecked) {
                    $('#purchase-approval-authorities').val([]).trigger('change');
                    $('#purchase-minimum-approval-amount').val('0.00');
                    $('#purchase-approval-member-nos').val('1');
                }
            });
            // Color picker sync
            $(document).on('input', 'input[type="color"]', function () {
                const colorValue = $(this).val();
                const textInputId = $(this).attr('id') + '-text';
                $('#' + textInputId).val(colorValue);

                self.hasUnsavedChanges = true;
                $('#saveAllSettingsBtn').prop('disabled', false);
            });

            $(document).on('input', 'input[id$="-text"]', function () {
                const colorValue = $(this).val();
                const colorInputId = $(this).attr('id').replace('-text', '');

                // Validate hex color format
                if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
                    $('#' + colorInputId).val(colorValue);
                }

                self.hasUnsavedChanges = true;
                $('#saveAllSettingsBtn').prop('disabled', false);
            });

            // Copy to clipboard functionality
            $(document).on('click', '.copy-btn', function () {
                const targetId = $(this).data('target');
                const $input = $('#' + targetId);

                $input.select();
                document.execCommand('copy');

                const $icon = $(this).find('i');
                $icon.removeClass('bi-clipboard').addClass('bi-check');

                setTimeout(function () {
                    $icon.removeClass('bi-check').addClass('bi-clipboard');
                }, 2000);

                TempleCore.showToast('Copied to clipboard', 'success');
            });

            // Toggle password visibility
            $(document).on('click', '.toggle-password', function () {
                const targetId = $(this).data('target');
                const $input = $('#' + targetId);
                const $icon = $(this).find('i');

                if ($input.attr('type') === 'password') {
                    $input.attr('type', 'text');
                    $icon.removeClass('bi-eye').addClass('bi-eye-slash');
                } else {
                    $input.attr('type', 'password');
                    $icon.removeClass('bi-eye-slash').addClass('bi-eye');
                }
            });
        },

        // Load initial data
        loadInitialData: function () {
            // Load country data first if not already loaded
            if (!window.CountryData) {
                const self = this;
                $.getScript('/js/data/countries.js').done(function () {
                    self.loadTabSettings(self.currentTab);
                    self.updateLastUpdatedTime();
                }).fail(function () {
                    console.warn('Failed to load country data');
                    self.loadTabSettings(self.currentTab);
                    self.updateLastUpdatedTime();
                });
            } else {
                this.loadTabSettings(this.currentTab);
                this.updateLastUpdatedTime();
            }
        },

        // Switch tab
        switchTab: function (tab) {
            // Update active state
            $('.list-group-item[data-tab]').removeClass('active');
            $(`.list-group-item[data-tab="${tab}"]`).addClass('active');

            this.currentTab = tab;
            this.hasUnsavedChanges = false;
            $('#saveAllSettingsBtn').prop('disabled', true);

            // Update tab header
            const tabInfo = this.tabs.find(t => t.key === tab);
            if (tabInfo) {
                $('#tabTitle').html(`<i class="bi bi-${tabInfo.icon}"></i> ${tabInfo.label} Settings`);
                $('#tabDescription').text(this.getTabDescription(tab));
            }

            // Load tab settings
            this.loadTabSettings(tab);
        },

        // Get tab description
        getTabDescription: function (tab) {
            const descriptions = {
                'SYSTEM': 'Configure system-wide settings for your temple management system.',
                'AWS': 'Manage AWS services configuration including S3, SES, and other cloud services.',
                'EMAIL': 'Configure email settings for sending notifications and communications.',
                'SMS': 'Set up SMS gateway configuration for sending text messages.',
                'ACCOUNTS': 'Configure accounting and financial settings for the temple.',
                'PURCHASE': 'Configure purchase order and approval settings.',
                'NOTIFICATION': 'Configure notification preferences and delivery methods.',
                'OTHER': 'Additional settings and miscellaneous configurations.'
            };

            return descriptions[tab] || 'Configure settings for this section.';
        },

        // Load tab settings
        loadTabSettings: function (tab) {
            const self = this;

            // Show loader
            $('#settingsLoader').show();
            $('#settingsFormContainer').hide();
            $('#settingsError').hide();
            $('#emptySettings').hide();

            // Make API call with tab type
            TempleAPI.get('/settings', { type: tab })
                .done(function (response) {
                    if (response.success) {
                        self.settings[tab] = response.data;
                        self.renderTabSettings(tab, response.data);
                    } else {
                        self.showError(response.message || 'Failed to load settings');
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load settings:', xhr);
                    self.showError('Failed to load settings. Please try again.');
                });
        },

        // Load dropdown data
        loadDropdownData: function (dataSource, specificFieldId) {
            const self = this;

            if (dataSource === 'ac_years' && this.dropdownData.ac_years.length === 0) {
                TempleAPI.get('/settings/ac-years')
                    .done(function (response) {
                        if (response.success) {
                            self.dropdownData.ac_years = response.data;
                            self.updateDynamicDropdown('financial-year-id', response.data);
                        }
                    });
            } else if (dataSource === 'ac_years' && this.dropdownData.ac_years.length > 0) {
                self.updateDynamicDropdown('financial-year-id', this.dropdownData.ac_years);
            }

            if (dataSource === 'organization_positions' && this.dropdownData.organization_positions.length === 0) {
                TempleAPI.get('/settings/organization-positions')
                    .done(function (response) {
                        if (response.success) {
                            self.dropdownData.organization_positions = response.data;

                            // Update all organization position fields
                            if (specificFieldId) {
                                self.updateDynamicMultiSelect(specificFieldId, response.data);
                            } else {
                                // Update both sign_authority and payment_approval fields
                                self.updateDynamicMultiSelect('sign-authority', response.data);
                                self.updateDynamicMultiSelect('payment-approval', response.data);
                            }
                        }
                    })
                    .fail(function (xhr) {
                        console.error('Failed to load organization positions:', xhr);
                        TempleCore.showToast('Failed to load organization positions', 'warning');
                    });
            } else if (dataSource === 'organization_positions' && this.dropdownData.organization_positions.length > 0) {
                // Data already loaded, just update the field
                if (specificFieldId) {
                    self.updateDynamicMultiSelect(specificFieldId, this.dropdownData.organization_positions);
                } else {
                    self.updateDynamicMultiSelect('sign-authority', this.dropdownData.organization_positions);
                    self.updateDynamicMultiSelect('payment-approval', this.dropdownData.organization_positions);
                }
            }
        },

        // Update dynamic dropdown
        updateDynamicDropdown: function (fieldId, data) {
            const $select = $('#' + fieldId);
            if ($select.length === 0) return;

            const currentValue = $select.data('current-value');
            $select.empty();
            $select.append('<option value="">Select Option</option>');

            data.forEach(item => {
                const option = $('<option></option>')
                    .attr('value', item.id)
                    .text(item.label);

                if (item.id == currentValue) {
                    option.prop('selected', true);
                }

                $select.append(option);
            });
        },

        // Update dynamic multi-select
        updateDynamicMultiSelect: function (fieldId, data) {
            const $select = $('#' + fieldId);
            if ($select.length === 0) return;

            let currentValue = $select.data('current-value');

            // Parse the current value properly
            if (typeof currentValue === 'string' && currentValue !== '') {
                try {
                    // Handle JSON string
                    currentValue = JSON.parse(currentValue);
                } catch (e) {
                    // If not valid JSON, try splitting by comma
                    currentValue = currentValue.split(',').map(v => v.trim());
                }
            }

            // Ensure it's an array
            currentValue = Array.isArray(currentValue) ? currentValue : [];

            // Clear existing options
            $select.empty();

            // Add options from data
            data.forEach(item => {
                const option = $('<option></option>')
                    .attr('value', item.id)
                    .text(item.label || item.display_name);

                // Check if this option should be selected
                if (currentValue.includes(String(item.id)) || currentValue.includes(item.id)) {
                    option.prop('selected', true);
                }

                $select.append(option);
            });

            // Initialize Select2 for better multi-select UI
            if ($.fn.select2) {
                $select.select2({
                    placeholder: fieldId === 'payment-approval' ?
                        'Select Payment Approvers' :
                        'Select Signing Authorities',
                    allowClear: true,
                    width: '100%',
                    closeOnSelect: false,
                    tags: false,
                    multiple: true
                });
            }
        },

        // Toggle conditional fields
        toggleConditionalFields: function (controlFieldKey, isEnabled) {
            const controlFieldId = controlFieldKey.replace(/_/g, '-');

            // Find all fields that depend on this control field
            $(`.conditional-field[data-conditional="${controlFieldKey}"]`).each(function () {
                const $field = $(this);
                const requiredValue = $field.data('conditional-value') || 'true';

                if (isEnabled && String(isEnabled) === String(requiredValue)) {
                    // Enable the field
                    $field.removeClass('disabled');
                    $field.find('input, select, textarea').prop('disabled', false);
                    $field.slideDown(300);
                } else {
                    // Disable the field
                    $field.addClass('disabled');
                    $field.find('input, select, textarea').prop('disabled', true);
                    $field.slideUp(300);
                }
            });
        },

        // Render tab settings
        renderTabSettings: function (tab, data) {
            const self = this;

            // Hide loader
            $('#settingsLoader').hide();

            // Check if data exists
            if (!data || (!data.fields && !Array.isArray(data)) || (data.fields && data.fields.length === 0) || (Array.isArray(data) && data.length === 0)) {
                $('#emptySettings').show();
                return;
            }

            // Build form fields
            let html = '';

            // Handle both direct array and nested fields array
            const fields = Array.isArray(data) ? data : (data.fields || []);
            const values = data.values || {};

            // Map values to fields
            const fieldsWithValues = fields.map(field => {
                return {
                    ...field,
                    value: values[field.key] !== undefined ? values[field.key] : field.value
                };
            });

            // Group fields by section if available
            const sections = {};

            fieldsWithValues.forEach(field => {
                const section = field.section || 'General';
                if (!sections[section]) {
                    sections[section] = [];
                }
                sections[section].push(field);
            });

            // Render sections
            Object.keys(sections).forEach(sectionName => {
                html += `
                    <div class="settings-form-section">
                        <h5>${sectionName}</h5>
                        <div class="row">
                `;

                sections[sectionName].forEach(field => {
                    html += self.renderField(field);
                });

                html += `
                        </div>
                    </div>
                `;
            });

            $('#settingsFieldsContainer').html(html);
            $('#settingsFormContainer').show();

            // Initialize any special components
            this.initializeFieldComponents();

            // Initialize conditional fields
            this.initializeConditionalFields();
        },

        // Render individual field
        renderField: function (field) {
            const fieldId = field.key.toLowerCase().replace(/_/g, '-');
            const isRequired = field.required || false;
            const isReadonly = field.readonly || false;
            const colSize = field.width || 'col-md-6';
            const fieldValue = field.value !== null && field.value !== undefined ? field.value : (field.default || '');

            // Check if this is a conditional field
            const isConditional = field.conditional ? true : false;
            const conditionalClass = isConditional ? 'conditional-field' : '';
            const conditionalAttributes = isConditional ? `data-conditional="${field.conditional}" data-conditional-value="${field.conditional_value || 'true'}"` : '';

            let fieldHtml = '';

            // Handle dynamic select fields
            if (field.type === 'select_dynamic') {
                fieldHtml = `
                    <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                        <label for="${fieldId}" class="form-label">
                            ${field.label}
                            ${isRequired ? '<span class="field-required">*</span>' : ''}
                        </label>
                        <select class="form-select dynamic-select" 
                                id="${fieldId}"
                                name="${field.key}"
                                data-source="${field.data_source}"
                                data-current-value="${fieldValue}"
                                ${isRequired ? 'required' : ''}
                                ${isReadonly ? 'disabled' : ''}>
                            <option value="">Loading...</option>
                        </select>
                        ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                    </div>
                `;

                // Load data after rendering
                setTimeout(() => this.loadDropdownData(field.data_source, fieldId), 100);
            }
            // Handle dynamic multi-select fields
            else if (field.type === 'multiselect_dynamic') {
                fieldHtml = `
        <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
            <label for="${fieldId}" class="form-label">
                ${field.label}
                ${isRequired ? '<span class="field-required">*</span>' : ''}
            </label>
            <select class="form-select dynamic-multiselect" 
                    id="${fieldId}"
                    name="${field.key}"
                    data-source="${field.data_source}"
                    data-current-value='${typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue}'
                    multiple
                    ${isRequired ? 'required' : ''}
                    ${isReadonly ? 'disabled' : ''}>
                <option value="">Loading...</option>
            </select>
            ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
        </div>
    `;

                // Load data after rendering
                setTimeout(() => this.loadDropdownData(field.data_source, fieldId), 100);
            }
            // Special handling for country field
            else if (field.key === 'temple_country') {
                fieldHtml = this.renderCountryField(field, fieldId, isRequired, isReadonly, colSize, fieldValue);
            }
            // Special handling for phone code field
            else if (field.key === 'temple_phone_code') {
                fieldHtml = this.renderPhoneCodeField(field, fieldId, isRequired, isReadonly, colSize, fieldValue);
            }
            // Handle number field with currency for minimum_payment_approval_amount
            else if (field.type === 'number' && field.key === 'minimum_payment_approval_amount') {
                fieldHtml = `
                    <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                        <label for="${fieldId}" class="form-label">
                            ${field.label}
                            ${isRequired ? '<span class="field-required">*</span>' : ''}
                        </label>
                        <div class="input-group">
                            <span class="input-group-text">₹</span>
                            <input type="number" 
                                   class="form-control" 
                                   id="${fieldId}"
                                   name="${field.key}"
                                   value="${fieldValue}"
                                   placeholder="${field.placeholder || '0.00'}"
                                   step="${field.step || '0.01'}"
                                   min="0"
                                   max="999999999.99"
                                   ${isRequired ? 'required' : ''}
                                   ${isReadonly ? 'readonly' : ''}>
                        </div>
                        ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                        <div class="validation-feedback">Please enter a valid amount</div>
                    </div>
                `;
            } else if (field.type === 'number' && field.key === 'approval_member_nos') {
                fieldHtml = `
        <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
            <label for="${fieldId}" class="form-label">
                ${field.label}
                ${isRequired ? '<span class="field-required">*</span>' : ''}
            </label>
            <input type="number" 
                   class="form-control" 
                   id="${fieldId}"
                   name="${field.key}"
                   value="${fieldValue}"
                   placeholder="${field.placeholder || 'Enter number'}"
                   step="${field.step || '1'}"
                   min="1"
                   max="10"
                   ${isRequired ? 'required' : ''}
                   ${isReadonly ? 'readonly' : ''}>
            ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
            <div class="validation-feedback">Please enter a valid number of approvers (1-10)</div>
        </div>
    `;
            }
            else {
                switch (field.type) {
                    case 'text':
                    case 'email':
                    case 'url':
                    case 'number':
                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <label for="${fieldId}" class="form-label">
                                    ${field.label}
                                    ${isRequired ? '<span class="field-required">*</span>' : ''}
                                </label>
                                <input type="${field.type}" 
                                       class="form-control ${field.class || ''}" 
                                       id="${fieldId}"
                                       name="${field.key}"
                                       value="${fieldValue}"
                                       placeholder="${field.placeholder || ''}"
                                       ${field.step ? `step="${field.step}"` : ''}
                                       ${isRequired ? 'required' : ''}
                                       ${isReadonly ? 'readonly' : ''}>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                                <div class="validation-feedback">Please enter a valid ${field.label.toLowerCase()}</div>
                            </div>
                        `;
                        break;

                    case 'password':
                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <label for="${fieldId}" class="form-label">
                                    ${field.label}
                                    ${isRequired ? '<span class="field-required">*</span>' : ''}
                                </label>
                                <div class="input-group">
                                    <input type="password" 
                                           class="form-control" 
                                           id="${fieldId}"
                                           name="${field.key}"
                                           value="${fieldValue}"
                                           placeholder="${field.placeholder || ''}"
                                           ${isRequired ? 'required' : ''}
                                           ${isReadonly ? 'readonly' : ''}>
                                    <button class="btn btn-outline-secondary toggle-password" type="button" data-target="${fieldId}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                            </div>
                        `;
                        break;

                    case 'select':
                        let optionsHtml = '';

                        if (field.options) {
                            if (Array.isArray(field.options)) {
                                optionsHtml = field.options.map(opt => `
                                    <option value="${opt.value}" ${opt.value === fieldValue ? 'selected' : ''}>
                                        ${opt.label}
                                    </option>
                                `).join('');
                            } else if (typeof field.options === 'object') {
                                optionsHtml = Object.entries(field.options).map(([key, label]) => `
                                    <option value="${key}" ${key === fieldValue || key === String(fieldValue) ? 'selected' : ''}>
                                        ${label}
                                    </option>
                                `).join('');
                            }
                        }

                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <label for="${fieldId}" class="form-label">
                                    ${field.label}
                                    ${isRequired ? '<span class="field-required">*</span>' : ''}
                                </label>
                                <select class="form-select" 
                                        id="${fieldId}"
                                        name="${field.key}"
                                        ${isRequired ? 'required' : ''}
                                        ${isReadonly ? 'disabled' : ''}>
                                    <option value="">Select ${field.label}</option>
                                    ${optionsHtml}
                                </select>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                            </div>
                        `;
                        break;

                    case 'textarea':
                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <label for="${fieldId}" class="form-label">
                                    ${field.label}
                                    ${isRequired ? '<span class="field-required">*</span>' : ''}
                                </label>
                                <textarea class="form-control" 
                                          id="${fieldId}"
                                          name="${field.key}"
                                          rows="${field.rows || 3}"
                                          placeholder="${field.placeholder || ''}"
                                          ${isRequired ? 'required' : ''}
                                          ${isReadonly ? 'readonly' : ''}>${fieldValue}</textarea>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                            </div>
                        `;
                        break;

                    case 'boolean':
                    case 'toggle':
                        const isChecked = fieldValue === true || fieldValue === 'true' || fieldValue === 1 || fieldValue === '1';
                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <div class="form-check form-switch">
                                    <input class="form-check-input settings-toggle" 
                                           type="checkbox" 
                                           id="${fieldId}"
                                           name="${field.key}"
                                           ${isChecked ? 'checked' : ''}
                                           ${isReadonly ? 'disabled' : ''}
                                           ${field.key === 'is_approval_payment' ? 'data-controls-conditional="true"' : ''}>
                                    <label class="form-check-label" for="${fieldId}">
                                        ${field.label}
                                        ${isRequired ? '<span class="field-required">*</span>' : ''}
                                    </label>
                                </div>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                            </div>
                        `;
                        break;

                    case 'color':
                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <label for="${fieldId}" class="form-label">
                                    ${field.label}
                                    ${isRequired ? '<span class="field-required">*</span>' : ''}
                                </label>
                                <div class="input-group">
                                    <input type="color" 
                                           class="form-control form-control-color" 
                                           id="${fieldId}"
                                           name="${field.key}"
                                           value="${fieldValue || field.default || '#000000'}"
                                           ${isRequired ? 'required' : ''}
                                           ${isReadonly ? 'disabled' : ''}>
                                    <input type="text" 
                                           class="form-control" 
                                           id="${fieldId}-text"
                                           value="${fieldValue || field.default || '#000000'}"
                                           placeholder="#000000"
                                           pattern="^#[0-9A-Fa-f]{6}$"
                                           ${isReadonly ? 'readonly' : ''}>
                                </div>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                            </div>
                        `;
                        break;
                    case 'image':
                        // Get current logo if exists
                        const currentLogoUrl = fieldValue || '';
                        const hasLogo = currentLogoUrl && currentLogoUrl !== '';

                        fieldHtml = `
        <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
            <label for="${fieldId}" class="form-label">
                ${field.label}
                ${isRequired ? '<span class="field-required">*</span>' : ''}
            </label>
            
            <!-- Current Logo Preview -->
            ${hasLogo ? `
                <div class="current-logo-preview mb-3">
                    <img src="${currentLogoUrl}" alt="Current Logo" class="img-thumbnail" style="max-height: 150px; max-width: 300px;">
                    <div class="mt-2">
                        <button type="button" class="btn btn-sm btn-danger" id="deleteLogo-${fieldId}">
                            <i class="bi bi-trash"></i> Remove Logo
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <!-- File Input -->
            <div class="logo-upload-container">
                <input type="file" 
                       class="form-control logo-file-input" 
                       id="${fieldId}"
                       name="${field.key}"
                       accept="${field.accept || 'image/*'}"
                       data-max-size="${field.max_size || 524288000}"
                       ${isRequired && !hasLogo ? 'required' : ''}
                       ${isReadonly ? 'disabled' : ''}>
                
                <!-- Preview Container for New Upload -->
                <div class="new-logo-preview mt-3" id="preview-${fieldId}" style="display: none;">
                    <img src="" alt="Logo Preview" class="img-thumbnail" style="max-height: 150px; max-width: 300px;">
                </div>
            </div>
            
            ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
            <div class="validation-feedback">Please select a valid image file</div>
        </div>
    `;

                        // Add event handlers after rendering
                        setTimeout(() => {
                            // Handle file selection and preview
                            $(`#${fieldId}`).on('change', function (e) {
                                const file = e.target.files[0];
                                if (file) {
                                    // Validate file size
                                    const maxSize = $(this).data('max-size');
                                    if (file.size > maxSize) {
                                        TempleCore.showToast(`File size exceeds maximum allowed size (${(maxSize / 1048576).toFixed(0)}MB)`, 'danger');
                                        $(this).val('');
                                        return;
                                    }

                                    // Validate file type
                                    const acceptedTypes = $(this).attr('accept').split(',').map(t => t.trim());
                                    const fileType = file.type;
                                    let isValidType = false;

                                    acceptedTypes.forEach(type => {
                                        if (type === 'image/*' && fileType.startsWith('image/')) {
                                            isValidType = true;
                                        } else if (fileType === type || fileType === type.replace('image/', '')) {
                                            isValidType = true;
                                        }
                                    });

                                    if (!isValidType) {
                                        TempleCore.showToast('Please select a valid image file (JPEG, PNG, GIF, SVG, or WebP)', 'danger');
                                        $(this).val('');
                                        return;
                                    }

                                    // Show preview
                                    const reader = new FileReader();
                                    reader.onload = function (e) {
                                        $(`#preview-${fieldId} img`).attr('src', e.target.result);
                                        $(`#preview-${fieldId}`).show();
                                    };
                                    reader.readAsDataURL(file);

                                    // Mark as changed
                                    self.hasUnsavedChanges = true;
                                    $('#saveAllSettingsBtn').prop('disabled', false);
                                } else {
                                    // Hide preview if no file selected
                                    $(`#preview-${fieldId}`).hide();
                                }
                            });

                            // Handle delete logo button
                            $(`#deleteLogo-${fieldId}`).on('click', function () {
                                TempleCore.showConfirm(
                                    'Delete Logo',
                                    'Are you sure you want to delete the current logo?',
                                    function () {
                                        // Call delete API
                                        TempleAPI.delete('/settings/logo/delete')
                                            .done(function (response) {
                                                if (response.success) {
                                                    // Hide current logo preview
                                                    $('.current-logo-preview').remove();

                                                    // Clear file input
                                                    $(`#${fieldId}`).val('');

                                                    // Mark as changed
                                                    self.hasUnsavedChanges = true;
                                                    $('#saveAllSettingsBtn').prop('disabled', false);

                                                    TempleCore.showToast('Logo deleted successfully', 'success');
                                                } else {
                                                    TempleCore.showToast(response.message || 'Failed to delete logo', 'danger');
                                                }
                                            })
                                            .fail(function () {
                                                TempleCore.showToast('Failed to delete logo', 'danger');
                                            });
                                    }
                                );
                            });
                        }, 100);
                        break;
                    default:
                        fieldHtml = `
                            <div class="${colSize} mb-3 ${conditionalClass}" ${conditionalAttributes}>
                                <label for="${fieldId}" class="form-label">
                                    ${field.label}
                                    ${isRequired ? '<span class="field-required">*</span>' : ''}
                                </label>
                                <input type="text" 
                                       class="form-control" 
                                       id="${fieldId}"
                                       name="${field.key}"
                                       value="${fieldValue}"
                                       placeholder="${field.placeholder || ''}"
                                       ${isRequired ? 'required' : ''}
                                       ${isReadonly ? 'readonly' : ''}>
                                ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                            </div>
                        `;
                }
            }

            return fieldHtml;
        },

        // Render country dropdown field
        renderCountryField: function (field, fieldId, isRequired, isReadonly, colSize, fieldValue) {
            let countryOptions = '';
            if (window.CountryData) {
                const countries = window.CountryData.getSortedCountries();
                countryOptions = countries.map(country => `
                    <option value="${country.name}" 
                            data-code="${country.code}" 
                            data-mobile-code="${country.mobileCode}"
                            ${country.name === fieldValue ? 'selected' : ''}>
                        ${country.name}
                    </option>
                `).join('');
            } else {
                countryOptions = '<option value="">Country data not loaded</option>';
            }

            return `
                <div class="${colSize} mb-3">
                    <label for="${fieldId}" class="form-label">
                        ${field.label}
                        ${isRequired ? '<span class="field-required">*</span>' : ''}
                    </label>
                    <select class="form-select" 
                            id="${fieldId}"
                            name="${field.key}"
                            ${isRequired ? 'required' : ''}
                            ${isReadonly ? 'disabled' : ''}>
                        <option value="">Select Country</option>
                        ${countryOptions}
                    </select>
                    ${field.description ? `<div class="form-text">${field.description}</div>` : ''}
                </div>
            `;
        },

        // Render phone code field
        renderPhoneCodeField: function (field, fieldId, isRequired, isReadonly, colSize, fieldValue) {
            return `
                <div class="${colSize} mb-3">
                    <label for="${fieldId}" class="form-label">
                        ${field.label}
                        ${isRequired ? '<span class="field-required">*</span>' : ''}
                    </label>
                    <input type="text" 
                           class="form-control" 
                           id="${fieldId}"
                           name="${field.key}"
                           value="${fieldValue || '+91'}"
                           placeholder="${field.placeholder || 'Phone code'}"
                           readonly
                           style="background-color: #e9ecef;">
                    ${field.description ? `<div class="form-text">${field.description || 'Automatically set based on country selection'}</div>` : ''}
                </div>
            `;
        },

        // Initialize field components
        initializeFieldComponents: function () {
            const self = this;
            // Load Select2 CSS if not already loaded
            if (!$('link[href*="select2.min.css"]').length) {
                $('head').append('<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />');
            }

            // Load Select2 JS if not already loaded
            if (!$.fn.select2) {
                $.getScript('https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js', function () {
                    // Re-initialize any multi-selects that were loaded before Select2
                    $('.dynamic-multiselect').each(function () {
                        const $select = $(this);
                        if (!$select.hasClass('select2-hidden-accessible')) {
                            $select.select2({
                                placeholder: 'Select options',
                                allowClear: true,
                                width: '100%',
                                closeOnSelect: false,
                                multiple: true
                            });
                        }
                    });
                });
            }

            // Load country data if needed
            if ($('#temple-country').length > 0 && !window.CountryData) {
                $.getScript('/js/data/countries.js').done(function () {
                    self.updateCountryField();
                });
            }

            // Handle country change to update phone code
            $(document).on('change', '#temple-country', function () {
                const selectedOption = $(this).find('option:selected');
                const mobileCode = selectedOption.data('mobile-code');

                if (mobileCode) {
                    $('#temple-phone-code').val(mobileCode);
                    self.hasUnsavedChanges = true;
                    $('#saveAllSettingsBtn').prop('disabled', false);
                }
            });

            // Initialize tooltips if available
            if ($.fn.tooltip) {
                $('[data-bs-toggle="tooltip"]').tooltip();
            }
        },

        // Initialize conditional fields

        initializeConditionalFields: function () {
            const self = this;

            // Check initial state of is_approval_payment
            const isApprovalPayment = $('#is-approval-payment').is(':checked');
            self.toggleConditionalFields('is_approval_payment', isApprovalPayment);

            // Check initial state of is_purchase_order_approval
            const isPurchaseOrderApproval = $('#is-purchase-order-approval').is(':checked');
            self.toggleConditionalFields('is_purchase_order_approval', isPurchaseOrderApproval);

            // Load organization positions for multiselects if on ACCOUNTS tab
            if (self.currentTab === 'ACCOUNTS') {
                if ($('#sign-authority').length > 0 || $('#payment-approval').length > 0) {
                    self.loadDropdownData('organization_positions');
                }
            }

            // Load organization positions for multiselects if on PURCHASE tab
            if (self.currentTab === 'PURCHASE') {
                if ($('#purchase-approval-authorities').length > 0) {
                    self.loadDropdownData('organization_positions', 'purchase-approval-authorities');
                }
            }
        },

        // Update country field after loading country data
        updateCountryField: function () {
            const $countrySelect = $('#temple-country');
            if ($countrySelect.length > 0 && window.CountryData) {
                const currentValue = $countrySelect.val();
                const countries = window.CountryData.getSortedCountries();

                $countrySelect.empty();
                $countrySelect.append('<option value="">Select Country</option>');

                countries.forEach(country => {
                    const option = $('<option></option>')
                        .attr('value', country.name)
                        .attr('data-code', country.code)
                        .attr('data-mobile-code', country.mobileCode)
                        .text(country.name);

                    if (country.name === currentValue) {
                        option.prop('selected', true);
                    }

                    $countrySelect.append(option);
                });

                if (currentValue) {
                    $countrySelect.trigger('change');
                }
            }
        },

        // Save tab settings
        saveTabSettings: function (callback) {
            const self = this;

            // Validate form
            const form = document.getElementById('settingsForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }

            // Check if financial year is being changed
            if (this.currentTab === 'ACCOUNTS') {
                const newFinancialYear = $('#financial-year-id').val();
                const currentFinancialYear = $('#financial-year-id').data('current-value');

                if (newFinancialYear && newFinancialYear !== currentFinancialYear) {
                    TempleCore.showConfirm(
                        'Change Financial Year',
                        'Changing the financial year will affect all accounting operations. Are you sure you want to continue?',
                        function () {
                            self.performSave(callback);
                        }
                    );
                    return;
                }
            }

            this.performSave(callback);
        },

        doSaveTabSettings: function (callback) {
            const self = this;

            // Validate form
            const form = document.getElementById('settingsForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }

            // Check if financial year is being changed (existing code)
            if (this.currentTab === 'ACCOUNTS') {
                const newFinancialYear = $('#financial-year-id').val();
                const currentFinancialYear = $('#financial-year-id').data('current-value');

                if (newFinancialYear && newFinancialYear !== currentFinancialYear) {
                    TempleCore.showConfirm(
                        'Change Financial Year',
                        'Changing the financial year will affect all accounting operations. Are you sure you want to continue?',
                        function () {
                            self.performSave(callback);
                        }
                    );
                    return;
                }
            }

            this.performSave(callback);
        },

        performSave: function (callback) {
            const self = this;

            // Check if there's a file to upload (temple logo)
            const logoInput = document.getElementById('temple-logo');

            const hasLogoFile = logoInput && logoInput.files && logoInput.files[0];

            if (hasLogoFile) {
                console.log('hasLogoFile', hasLogoFile);
                console.log('logoInput.files[0]', logoInput.files[0]);
                // Handle logo upload first
                const formData = new FormData();
                formData.append('logo', logoInput.files[0]);
                console.log('formData', formData);
                // Show loading
                TempleCore.showLoading(true);

                // Upload logo using the local postFormData method
                TempleAPI.postFormData('/settings/logo/upload', formData)  // Changed from TempleAPI.postFormData to self.postFormData
                    .done(function (response) {
                        if (response.success) {

                            // Update the hidden field with the logo path
                            $('#temple-logo').data('uploaded-path', response.data.path);

                            // Now save other settings
                            self.saveOtherSettings(callback);
                        } else {
                            TempleCore.showLoading(false);
                            TempleCore.showToast(response.message || 'Failed to upload logo', 'danger');
                        }
                    })
                    .fail(function (xhr) {
                        TempleCore.showLoading(false);
                        let errorMsg = 'Failed to upload logo';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMsg = xhr.responseJSON.message;
                        }
                        TempleCore.showToast(errorMsg, 'danger');
                    });
            } else {
                // No logo to upload, just save other settings
                this.saveOtherSettings(callback);
            }
        },

        // Keep the postFormData method as is (it's already in your code at line 1176)
        postFormData: function (endpoint, formData) {
            return $.ajax({
                url: APP_CONFIG.API.BASE_URL + endpoint,
                method: 'POST',
                data: formData,
                processData: false,  // Important for FormData
                contentType: false,  // Important for FormData
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(window.APP_CONFIG.STORAGE.TOKEN),
                    'X-Temple-Id': localStorage.getItem(window.APP_CONFIG.STORAGE.TEMPLE_ID)
                }
            });
        },

        saveOtherSettings: function (callback) {
            const self = this;

            // Collect form data (excluding file inputs)
            const formData = this.collectFormData();

            // If logo was uploaded, add its path to the form data
            const uploadedPath = $('#temple-logo').data('uploaded-path');
            if (uploadedPath) {
                formData.temple_logo = uploadedPath;
            }

            // Show loading if not already shown
            TempleCore.showLoading(true);

            // Prepare settings data
            const settingsData = {
                type: this.currentTab,
                settings: formData
            };

            // Make API call to update settings
            TempleAPI.post('/settings/update', settingsData)
                .done(function (response) {
                    if (response.success) {
                        self.hasUnsavedChanges = false;
                        $('#saveAllSettingsBtn').prop('disabled', true);

                        // Clear the uploaded path data
                        $('#temple-logo').removeData('uploaded-path');

                        // Clear file input
                        $('#temple-logo').val('');

                        TempleCore.showToast('Settings saved successfully', 'success');

                        // Update last updated time
                        self.updateLastUpdatedTime();

                        // Clear dropdown cache for next load
                        if (self.currentTab === 'ACCOUNTS') {
                            self.dropdownData.ac_years = [];
                            self.dropdownData.organization_positions = [];
                        }

                        // If it's SYSTEM settings, refresh temple settings
                        if (self.currentTab === 'SYSTEM') {
                            TempleCore.refreshTempleSettings();
                            // Reload the tab to show the updated logo
                            self.loadTabSettings(self.currentTab);
                        }

                        if (callback) callback();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save settings', 'danger');
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to save settings:', xhr);
                    let errorMsg = 'Failed to save settings';

                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }

                    TempleCore.showToast(errorMsg, 'danger');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Updated collectFormData to exclude file inputs
        collectFormData: function () {
            const formData = {};

            $('#settingsForm').find('input, select, textarea').each(function () {
                const $field = $(this);
                const name = $field.attr('name');

                if (!name) return;

                // Skip file inputs - they're handled separately
                if ($field.attr('type') === 'file') {
                    return;
                }

                // Skip disabled conditional fields
                if ($field.closest('.conditional-field').hasClass('disabled')) {
                    return;
                }

                // Handle multi-select fields
                if ($field.hasClass('dynamic-multiselect') || $field.prop('multiple')) {
                    // Get selected values as array
                    let selectedValues = $field.val() || [];

                    // If using Select2, ensure we get the values properly
                    if ($field.hasClass('select2-hidden-accessible')) {
                        selectedValues = $field.select2('val') || [];
                    }

                    // Convert to JSON string for backend
                    formData[name] = JSON.stringify(selectedValues);
                } else if ($field.attr('type') === 'checkbox') {
                    formData[name] = $field.is(':checked');
                } else {
                    formData[name] = $field.val();
                }
            });

            return formData;
        },

        // Update last updated time
        updateLastUpdatedTime: function () {
            const now = new Date();
            const timeString = now.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            $('#lastUpdatedTime').text(timeString);
        },

        // Show error
        showError: function (message) {
            $('#settingsLoader').hide();
            $('#settingsFormContainer').hide();
            $('#emptySettings').hide();
            $('#errorMessage').text(message);
            $('#settingsError').show();
        },

        // Check permission
        hasPermission: function (permission) {
            const user = this.currentUser;

            // Super Admin and Admin have all settings permissions
            if (user.user_type === 'SUPER_ADMIN' || user.user_type === 'ADMIN') {
                return true;
            }

            // Check specific permission
            return user.permissions && user.permissions.includes(permission);
        }
    };

})(jQuery, window);