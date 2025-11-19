// js/pages/booking-settings/index.js
// Booking Settings Page with Tab View - FIXED USER LOADING ISSUE

(function ($, window) {
    'use strict';

    window.BookingSettingsPage = {
        settings: {},
        usersList: [], // Initialize as empty array
        secondaryLanguages: [
            { value: '', text: 'None' },
            { value: 'Tamil', text: 'Tamil' },
            { value: 'Chinese', text: 'Chinese' },
            { value: 'Hindi', text: 'Hindi' },
            { value: 'Malay', text: 'Malay' }
        ],
        printOptions: [
            { value: 'SINGLE_PRINT', text: 'Single Print' },
            { value: 'SEPARATE_PRINT', text: 'Separate Print' },
            { value: 'NO_PRINT', text: 'No Print' }
        ],
        printTemplates: [
            { value: 'template1', text: 'Template 1' },
            { value: 'template2', text: 'Template 2' },
            { value: 'default', text: 'Default' }
        ],
        printSizes: [
            { value: 'A4', text: 'A4' },
            { value: 'Thermal', text: 'Thermal' },
            { value: 'A3', text: 'A3' }
        ],
        printerTypes: [
            { value: 'imin_d4', text: 'iMin Printer D4' },
            { value: 'imin_d4_pro', text: 'iMin Printer D4 Pro' },
            { value: 'imin_swan2', text: 'iMin Printer Swan 2' },
            { value: 'raw_bt', text: 'Raw BT Printer' },
            { value: 'default', text: 'Default Printer' }
        ],

        init: function () {
            this.render();
            this.loadAllData(); // Changed to load all data properly
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="mb-0">
                                    <i class="bi bi-gear-fill text-primary"></i> Booking Settings
                                </h4>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <!-- Nav tabs -->
                                    <ul class="nav nav-tabs nav-fill" id="bookingSettingsTabs" role="tablist">
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link active" id="general-tab" data-bs-toggle="tab" 
                                                data-bs-target="#general" type="button" role="tab">
                                                <i class="bi bi-sliders"></i> General
                                            </button>
                                        </li>
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link" id="archanai-tab" data-bs-toggle="tab" 
                                                data-bs-target="#archanai" type="button" role="tab">
                                                <i class="bi bi-flower1"></i> Archanai
                                            </button>
                                        </li>
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="ubayam-tab" data-bs-toggle="tab" 
                                                data-bs-target="#ubayam" type="button" role="tab">
                                                <i class="bi bi-gift"></i> Ubayam <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="hall-tab" data-bs-toggle="tab" 
                                                data-bs-target="#hall" type="button" role="tab">
                                                <i class="bi bi-building"></i> Hall <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="annathanam-tab" data-bs-toggle="tab" 
                                                data-bs-target="#annathanam" type="button" role="tab">
                                                <i class="bi bi-bowl"></i> Annathanam <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                    </ul>
                                    
                                    <!-- Tab content -->
                                    <div class="tab-content mt-4" id="bookingSettingsContent">
                                        <!-- General Tab -->
                                        <div class="tab-pane fade show active" id="general" role="tabpanel">
                                            <form id="generalSettingsForm">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">Secondary Language</label>
                                                            <select class="form-select" id="secondary_language" name="secondary_language">
                                                                ${this.secondaryLanguages.map(lang =>
                `<option value="${lang.value}">${lang.text}</option>`
            ).join('')}
                                                            </select>
                                                            <small class="text-muted">This language will be used across all masters</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">Print Option</label>
                                                            <select class="form-select" id="print_option" name="print_option" multiple>
                                                                ${this.printOptions.map(option =>
                `<option value="${option.value}">${option.text}</option>`
            ).join('')}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox" id="is_tender_concept" name="is_tender_concept">
                                                                <label class="form-check-label" for="is_tender_concept">
                                                                    Enable Tender Concept
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox" id="is_discount" name="is_discount">
                                                                <label class="form-check-label" for="is_discount">
                                                                    Enable Discount Feature
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6" id="discount_ledger_group" style="display:none;">
                                                        <div class="mb-3">
                                                            <label class="form-label">Discount Ledger</label>
                                                            <select class="form-select" id="discount_ledger_id" name="discount_ledger_id">
                                                                <option value="">Select Ledger</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox" id="is_deposit" name="is_deposit">
                                                                <label class="form-check-label" for="is_deposit">
                                                                    Enable Deposit Feature
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6" id="deposit_ledger_group" style="display:none;">
                                                        <div class="mb-3">
                                                            <label class="form-label">Deposit Ledger</label>
                                                            <select class="form-select" id="deposit_ledger_id" name="deposit_ledger_id">
                                                                <option value="">Select Ledger</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="mt-4">
                                                    <button type="button" class="btn btn-primary" id="saveGeneralSettings">
                                                        <i class="bi bi-check-circle"></i> Save Settings
                                                    </button>
                                                    <button type="button" class="btn btn-outline-secondary ms-2" id="resetGeneralSettings">
                                                        <i class="bi bi-arrow-clockwise"></i> Reset to Default
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                        
                                        <!-- Archanai Tab -->
                                        <div class="tab-pane fade" id="archanai" role="tabpanel">
                                            <form id="archanaiSettingsForm">
                                                <div class="row">
                                                    <div class="col-12">
                                                        <div class="mb-3">
                                                            <label class="form-label">Slogan (for receipts)</label>
                                                            <textarea class="form-control" id="slogan" name="slogan" rows="2" 
                                                                placeholder="Enter slogan to print on receipts"></textarea>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">Minimum Deposit Amount</label>
                                                            <div class="input-group">
                                                                <span class="input-group-text">$</span>
                                                                <input type="number" class="form-control" id="minimum_deposit_amount" 
                                                                    name="minimum_deposit_amount" min="0" step="0.01" value="0"
                                                                    placeholder="0.00">
                                                            </div>
                                                            <small class="text-muted">Minimum deposit amount required for archanai bookings (0 = no minimum)</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">Print Design Template</label>
                                                            <select class="form-select" id="print_design_template" name="print_design_template">
                                                                ${this.printTemplates.map(template =>
                `<option value="${template.value}">${template.text}</option>`
            ).join('')}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">Print Size</label>
                                                            <select class="form-select" id="print_size" name="print_size">
                                                                ${this.printSizes.map(size =>
                `<option value="${size.value}">${size.text}</option>`
            ).join('')}
                                                            </select>
                                                            <small class="text-muted">Select the paper size for printing receipts</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-3">
                                                        <div class="mb-3">
                                                            <label class="form-label">Header Font Size</label>
                                                            <input type="number" class="form-control" id="header_font_size" 
                                                                name="header_font_size" min="10" max="30" value="16">
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-3">
                                                        <div class="mb-3">
                                                            <label class="form-label">Content Font Size</label>
                                                            <input type="number" class="form-control" id="content_font_size" 
                                                                name="content_font_size" min="8" max="20" value="12">
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox" id="enable_barcode" name="enable_barcode">
                                                                <label class="form-check-label" for="enable_barcode">
                                                                    Enable Barcode on Receipts
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox" id="enable_qr_code" name="enable_qr_code">
                                                                <label class="form-check-label" for="enable_qr_code">
                                                                    Enable QR Code on Receipts
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-12">
                                                        <h5 class="mb-3">Printer Mappings</h5>
                                                        <div id="printerMappingsContainer">
                                                            <!-- Dynamic printer mappings will be added here -->
                                                        </div>
                                                        <button type="button" class="btn btn-outline-primary btn-sm" id="addPrinterMapping">
                                                            <i class="bi bi-plus-circle"></i> Add User Printer Mapping
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div class="mt-4">
                                                    <button type="button" class="btn btn-primary" id="saveArchanaiSettings">
                                                        <i class="bi bi-check-circle"></i> Save Settings
                                                    </button>
                                                    <button type="button" class="btn btn-outline-secondary ms-2" id="resetArchanaiSettings">
                                                        <i class="bi bi-arrow-clockwise"></i> Reset to Default
                                                    </button>
                                                </div>
                                            </form>
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

        // FIXED: Load all data with proper promise handling
        loadAllData: function () {
            const self = this;

            TempleCore.showLoading(true);

            // Create promises for all API calls
            const promises = [
                this.loadLedgersPromise(),
                this.loadUsersPromise(),
                this.loadSettingsPromise()
            ];

            // Wait for all data to be loaded
            Promise.all(promises)
                .then(function (results) {
                    // results[0] = ledgers (not needed for populateSettings)
                    // results[1] = users
                    // results[2] = settings

                    self.usersList = results[1] || [];
                    self.settings = results[2] || {};

                    console.log('All data loaded:', {
                        users: self.usersList.length,
                        settings: Object.keys(self.settings).length
                    });

                    // Now populate the settings with all data available
                    self.populateSettings();
                })
                .catch(function (error) {
                    console.error('Failed to load data:', error);
                    TempleCore.showToast('Failed to load some data. Please refresh the page.', 'warning');
                })
                .finally(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Convert loadLedgers to return a promise
        loadLedgersPromise: function () {
            const expensePromise = TempleAPI.get('/accounts/ledgers/type/expense');
            const taxPromise = TempleAPI.get('/accounts/ledgers/type/tax');

            return Promise.all([expensePromise, taxPromise])
                .then(function (results) {
                    const expenseResponse = results[0];
                    const taxResponse = results[1];

                    if (expenseResponse.success) {
                        const options = '<option value="">Select Ledger</option>' +
                            expenseResponse.data.ledgers.map(ledger =>
                                `<option value="${ledger.id}">${ledger.left_code + '/' + ledger.right_code + ' ' + ledger.name}</option>`
                            ).join('');
                        $('#discount_ledger_id').html(options);
                    }

                    if (taxResponse.success) {
                        const options = '<option value="">Select Ledger</option>' +
                            taxResponse.data.ledgers.map(ledger =>
                                `<option value="${ledger.id}">${ledger.left_code + '/' + ledger.right_code + ' ' + ledger.name}</option>`
                            ).join('');
                        $('#deposit_ledger_id').html(options);
                    }

                    return { expense: expenseResponse, tax: taxResponse };
                });
        },

        // Convert loadUsers to return a promise
        loadUsersPromise: function () {
            const dedupeById = (arr) => {
                const seen = new Set();
                return (arr || []).filter(u => {
                    if (!u || seen.has(u.id)) return false;
                    seen.add(u.id);
                    return true;
                });
            };

            return TempleAPI.get('/users')
                .then(function (response) {
                    if (response.success) return dedupeById(response.data);
                    throw new Error('Failed to load users');
                })
                .catch(function () {
                    return TempleAPI.get('/users/active-staff')
                        .then(function (response) {
                            if (response.success) return dedupeById(response.data);
                            throw new Error('Failed to load staff');
                        });
                });
        },


        // Convert loadSettings to return a promise
        loadSettingsPromise: function () {
            return TempleAPI.get('/booking-settings')
                .then(function (response) {
                    if (response.success) {
                        return response.data;
                    }
                    throw new Error('Failed to load booking settings');
                });
        },

        populateSettings: function () {
            const self = this;

            console.log('Populating settings with users:', this.usersList);

            // Populate General Settings
            if (this.settings.GENERAL) {
                const general = this.settings.GENERAL;

                $('#secondary_language').val(general.secondary_language?.value || '');
                $('#print_option').val(general.print_option?.value || 'SINGLE_PRINT');
                $('#is_tender_concept').prop('checked', general.is_tender_concept?.value === '1');
                $('#is_discount').prop('checked', general.is_discount?.value === '1');
                $('#discount_ledger_id').val(general.discount_ledger_id?.value || '');
                $('#is_deposit').prop('checked', general.is_deposit?.value === '1');
                $('#deposit_ledger_id').val(general.deposit_ledger_id?.value || '');

                // Show/hide ledger dropdowns
                if (general.is_discount?.value === '1') {
                    $('#discount_ledger_group').show();
                }
                if (general.is_deposit?.value === '1') {
                    $('#deposit_ledger_group').show();
                }
            }

            // Populate Archanai Settings
            if (this.settings.ARCHANAI) {
                const archanai = this.settings.ARCHANAI;

                $('#slogan').val(archanai.slogan?.value || '');
                $('#minimum_deposit_amount').val(archanai.minimum_deposit_amount?.value || '0');
                $('#print_design_template').val(archanai.print_design_template?.value || 'template1');
                $('#print_size').val(archanai.print_size?.value || 'Thermal');
                $('#header_font_size').val(archanai.header_font_size?.value || '16');
                $('#content_font_size').val(archanai.content_font_size?.value || '12');
                $('#enable_barcode').prop('checked', archanai.enable_barcode?.value === '1');
                $('#enable_qr_code').prop('checked', archanai.enable_qr_code?.value === '1');
                $('#printerMappingsContainer').empty();
                // Populate printer mappings - NOW USERS ARE AVAILABLE
                if (archanai.printer_mappings?.value) {
                    try {
                        const mappings = JSON.parse(archanai.printer_mappings.value) || [];
                        // Optional legacy migration for old "imin" values:
                        mappings.forEach(m => {
                            if (m.printer_type === 'imin') m.printer_type = 'imin_d4';
                        });
                        mappings.forEach(mapping => this.addPrinterMappingRow(mapping));
                        if (!mappings.length) this.addPrinterMappingRow(); // keep one empty row
                    } catch (e) {
                        console.error('Failed to parse printer mappings', e);
                        this.addPrinterMappingRow(); // fallback to one row
                    }
                } else {
                    // If nothing persisted, start with one blank row
                    this.addPrinterMappingRow();
                }
            }
        },

        addPrinterMappingRow: function (mapping = {}) {
            const self = this;
            const index = $('.printer-mapping-row').length;

            console.log('Adding printer mapping row:', mapping, 'Users available:', this.usersList.length);

            const html = `
                <div class="row printer-mapping-row mb-2" data-index="${index}">
                    <div class="col-md-5">
                        <select class="form-select user-select" name="printer_user_${index}">
                            <option value="">Select User</option>
                            ${(this.usersList || []).map(user => {
                const selected = mapping.user_id == user.id ? 'selected' : '';
                return `<option value="${user.id}" ${selected}>${user.name}</option>`;
            }).join('')}
                        </select>
                    </div>
                    <div class="col-md-5">
                        <select class="form-select printer-type-select" name="printer_type_${index}">
                            <option value="">Select Printer</option>
                            ${this.printerTypes.map(printer => {
                const selected = mapping.printer_type == printer.value ? 'selected' : '';
                return `<option value="${printer.value}" ${selected}>${printer.text}</option>`;
            }).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button type="button" class="btn btn-outline-danger btn-sm remove-printer-mapping">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            $('#printerMappingsContainer').append(html);
        },

        bindEvents: function () {
            const self = this;

            // Toggle ledger dropdowns
            $('#is_discount').on('change', function () {
                if ($(this).is(':checked')) {
                    $('#discount_ledger_group').slideDown();
                } else {
                    $('#discount_ledger_group').slideUp();
                    $('#discount_ledger_id').val('');
                }
            });

            $('#is_deposit').on('change', function () {
                if ($(this).is(':checked')) {
                    $('#deposit_ledger_group').slideDown();
                } else {
                    $('#deposit_ledger_group').slideUp();
                    $('#deposit_ledger_id').val('');
                }
            });

            // Add printer mapping
            $('#addPrinterMapping').on('click', function () {
                self.addPrinterMappingRow();
            });

            // Remove printer mapping
            $(document).on('click', '.remove-printer-mapping', function () {
                $(this).closest('.printer-mapping-row').remove();
            });

            // Save General Settings
            $('#saveGeneralSettings').on('click', function () {
                self.saveSettings('GENERAL');
            });

            // Save Archanai Settings
            $('#saveArchanaiSettings').on('click', function () {
                self.saveSettings('ARCHANAI');
            });

            // Reset General Settings
            $('#resetGeneralSettings').on('click', function () {
                TempleCore.showConfirm(
                    'Reset Settings',
                    'Are you sure you want to reset General settings to default?',
                    function () {
                        self.resetSettings('GENERAL');
                    }
                );
            });

            // Reset Archanai Settings
            $('#resetArchanaiSettings').on('click', function () {
                TempleCore.showConfirm(
                    'Reset Settings',
                    'Are you sure you want to reset Archanai settings to default?',
                    function () {
                        self.resetSettings('ARCHANAI');
                    }
                );
            });
        },

        saveSettings: function (type) {
            const self = this;
            let settings = {};

            if (type === 'GENERAL') {
                settings = {
                    secondary_language: $('#secondary_language').val(),
                    print_option: $('#print_option').val(),
                    is_tender_concept: $('#is_tender_concept').is(':checked') ? '1' : '0',
                    is_discount: $('#is_discount').is(':checked') ? '1' : '0',
                    discount_ledger_id: $('#discount_ledger_id').val(),
                    is_deposit: $('#is_deposit').is(':checked') ? '1' : '0',
                    deposit_ledger_id: $('#deposit_ledger_id').val()
                };
            } else if (type === 'ARCHANAI') {
                // Collect printer mappings
                const printerMappings = [];
                $('.printer-mapping-row').each(function () {
                    const userId = $(this).find('.user-select').val();
                    const printerType = $(this).find('.printer-type-select').val();

                    if (userId && printerType) {
                        printerMappings.push({
                            user_id: userId,
                            printer_type: printerType
                        });
                    }
                });

                settings = {
                    slogan: $('#slogan').val(),
                    minimum_deposit_amount: $('#minimum_deposit_amount').val(),
                    print_design_template: $('#print_design_template').val(),
                    print_size: $('#print_size').val(),
                    header_font_size: $('#header_font_size').val(),
                    content_font_size: $('#content_font_size').val(),
                    enable_barcode: $('#enable_barcode').is(':checked') ? '1' : '0',
                    enable_qr_code: $('#enable_qr_code').is(':checked') ? '1' : '0',
                    printer_mappings: JSON.stringify(printerMappings)
                };
            }

            TempleCore.showLoading(true);

            TempleAPI.post('/booking-settings/update', {
                type: type,
                settings: settings
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Settings saved successfully', 'success');
                        self.loadAllData(); // Reload all data
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save settings', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to save settings', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        resetSettings: function (type) {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.post('/booking-settings/reset', {
                type: type
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Settings reset to defaults', 'success');

                        // Clear form
                        if (type === 'GENERAL') {
                            $('#generalSettingsForm')[0].reset();
                            $('#discount_ledger_group, #deposit_ledger_group').hide();
                        } else if (type === 'ARCHANAI') {
                            $('#archanaiSettingsForm')[0].reset();
                            $('#printerMappingsContainer').empty();
                        }

                        self.loadAllData(); // Reload all data
                    } else {
                        TempleCore.showToast(response.message || 'Failed to reset settings', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to reset settings', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);