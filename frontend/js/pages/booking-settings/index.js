// js/pages/booking-settings/index.js
// Booking Settings Page with Tab View - SALES (formerly ARCHANAI) - IMPROVED UI

(function ($, window) {
    'use strict';

    window.BookingSettingsPage = {
        settings: {},
        usersList: [],
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
            this.loadAllData();
            this.bindEvents();
            this.addCustomStyles();
        },

        addCustomStyles: function () {
            // Add custom CSS for better tab layout
            const style = `
                <style>
                    /* Better tab layout */
                    .booking-settings-tabs {
                        border-bottom: 2px solid #dee2e6;
                        overflow-x: auto;
                        white-space: nowrap;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: thin;
                        padding-bottom: 0;
                    }
                    
                    .booking-settings-tabs::-webkit-scrollbar {
                        height: 6px;
                    }
                    
                    .booking-settings-tabs::-webkit-scrollbar-thumb {
                        background-color: rgba(0,0,0,0.2);
                        border-radius: 3px;
                    }
                    
                    .booking-settings-tabs .nav-link {
                        border: 1px solid transparent;
                        border-top-left-radius: 0.375rem;
                        border-top-right-radius: 0.375rem;
                        padding: 0.75rem 1.25rem;
                        color: #6c757d;
                        font-weight: 500;
                        transition: all 0.3s ease;
                        white-space: nowrap;
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-right: 0.25rem;
                    }
                    
                    .booking-settings-tabs .nav-link:hover:not(.disabled) {
                        color: #0d6efd;
                        background-color: #f8f9fa;
                        border-color: #dee2e6 #dee2e6 transparent;
                    }
                    
                    .booking-settings-tabs .nav-link.active {
                        color: #0d6efd;
                        background-color: #fff;
                        border-color: #dee2e6 #dee2e6 #fff;
                        font-weight: 600;
                        position: relative;
                    }
                    
                    .booking-settings-tabs .nav-link.active::after {
                        content: '';
                        position: absolute;
                        bottom: -2px;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background-color: #0d6efd;
                    }
                    
                    .booking-settings-tabs .nav-link.disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    
                    .booking-settings-tabs .nav-link i {
                        font-size: 1.1rem;
                    }
                    
                    .booking-settings-tabs .badge {
                        font-size: 0.65rem;
                        padding: 0.2rem 0.4rem;
                        margin-left: 0.25rem;
                    }
                    
                    /* Responsive adjustments */
                    @media (max-width: 1400px) {
                        .booking-settings-tabs .nav-link {
                            padding: 0.6rem 1rem;
                            font-size: 0.9rem;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .booking-settings-tabs .nav-link {
                            padding: 0.5rem 0.75rem;
                            font-size: 0.85rem;
                        }
                        
                        .booking-settings-tabs .nav-link i {
                            font-size: 1rem;
                        }
                    }
                    
                    /* Tab content animation */
                    .tab-pane {
                        animation: fadeIn 0.3s ease-in;
                    }
                    
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                </style>
            `;
            
            $('head').append(style);
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
                                <small class="text-muted">Configure settings for different booking modules</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-12">
                            <div class="card shadow-sm">
                                <div class="card-body p-0">
                                    <!-- Nav tabs with improved layout -->
                                    <ul class="nav booking-settings-tabs" id="bookingSettingsTabs" role="tablist">
                                        <!-- Active Tabs -->
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link active" id="general-tab" 
                                                data-bs-toggle="tab" data-bs-target="#general" 
                                                type="button" role="tab" aria-controls="general" aria-selected="true">
                                                <i class="bi bi-gear"></i>
                                                <span>General</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link" id="sales-tab" 
                                                data-bs-toggle="tab" data-bs-target="#sales" 
                                                type="button" role="tab" aria-controls="sales" aria-selected="false">
                                                <i class="bi bi-cart-check"></i>
                                                <span>Sales</span>
                                            </button>
                                        </li>
                                        
                                        <!-- Future/Disabled Tabs -->
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="buddhalamp-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-lightbulb"></i>
                                                <span>Buddha Lamp</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="hall-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-building"></i>
                                                <span>Hall</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="auspicious_light-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-brightness-high"></i>
                                                <span>Auspicious Light</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="rom-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-journal-text"></i>
                                                <span>ROM</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="dharma_assembly-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-people"></i>
                                                <span>Dharma Assembly</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="donation-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-heart"></i>
                                                <span>Donation</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                        
                                        <li class="nav-item" role="presentation">
                                            <button class="nav-link disabled" id="templeevents-tab" 
                                                type="button" role="tab" disabled>
                                                <i class="bi bi-calendar-event"></i>
                                                <span>Temple Events</span>
                                                <span class="badge bg-secondary">Future</span>
                                            </button>
                                        </li>
                                    </ul>
                                    
                                    <!-- Tab content -->
                                    <div class="tab-content p-4" id="bookingSettingsContent">
                                        <!-- General Tab -->
                                        <div class="tab-pane fade show active" id="general" role="tabpanel" aria-labelledby="general-tab">
                                            <div class="mb-3">
                                                <h5 class="text-primary">
                                                    <i class="bi bi-gear"></i> General Settings
                                                </h5>
                                                <p class="text-muted mb-4">Configure global settings that apply across all booking modules</p>
                                            </div>
                                            
                                            <form id="generalSettingsForm">
                                                <div class="row g-4">
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Secondary Language</label>
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
                                                            <label class="form-label fw-semibold">Print Option</label>
                                                            <select class="form-select" id="print_option" name="print_option" multiple size="3">
                                                                ${this.printOptions.map(option =>
                `<option value="${option.value}">${option.text}</option>`
            ).join('')}
                                                            </select>
                                                            <small class="text-muted">Hold Ctrl/Cmd to select multiple options</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="card bg-light border-0">
                                                            <div class="card-body">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox" id="is_tender_concept" name="is_tender_concept">
                                                                    <label class="form-check-label fw-semibold" for="is_tender_concept">
                                                                        Enable Tender Concept
                                                                    </label>
                                                                </div>
                                                                <small class="text-muted d-block mt-2">Enable tender-based payment processing</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="card bg-light border-0">
                                                            <div class="card-body">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox" id="is_discount" name="is_discount">
                                                                    <label class="form-check-label fw-semibold" for="is_discount">
                                                                        Enable Discount Feature
                                                                    </label>
                                                                </div>
                                                                <small class="text-muted d-block mt-2">Allow discounts on bookings</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6" id="discount_ledger_group" style="display:none;">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Discount Ledger</label>
                                                            <select class="form-select" id="discount_ledger_id" name="discount_ledger_id">
                                                                <option value="">Select Ledger</option>
                                                            </select>
                                                            <small class="text-muted">Ledger account for discount entries</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="card bg-light border-0">
                                                            <div class="card-body">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox" id="is_deposit" name="is_deposit">
                                                                    <label class="form-check-label fw-semibold" for="is_deposit">
                                                                        Enable Deposit Feature
                                                                    </label>
                                                                </div>
                                                                <small class="text-muted d-block mt-2">Allow deposits for bookings</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6" id="deposit_ledger_group" style="display:none;">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Deposit Ledger</label>
                                                            <select class="form-select" id="deposit_ledger_id" name="deposit_ledger_id">
                                                                <option value="">Select Ledger</option>
                                                            </select>
                                                            <small class="text-muted">Ledger account for deposit entries</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="mt-4 pt-3 border-top">
                                                    <button type="button" class="btn btn-primary" id="saveGeneralSettings">
                                                        <i class="bi bi-check-circle me-1"></i> Save Settings
                                                    </button>
                                                    <button type="button" class="btn btn-outline-secondary ms-2" id="resetGeneralSettings">
                                                        <i class="bi bi-arrow-clockwise me-1"></i> Reset to Default
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                        
                                        <!-- Sales Tab -->
                                        <div class="tab-pane fade" id="sales" role="tabpanel" aria-labelledby="sales-tab">
                                            <div class="mb-3">
                                                <h5 class="text-primary">
                                                    <i class="bi bi-cart-check"></i> Sales Settings
                                                </h5>
                                                <p class="text-muted mb-4">Configure receipt printing and sales-specific options</p>
                                            </div>
                                            
                                            <form id="salesSettingsForm">
                                                <div class="row g-4">
                                                    <div class="col-12">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Slogan (for receipts)</label>
                                                            <textarea class="form-control" id="slogan" name="slogan" rows="2" 
                                                                placeholder="Enter slogan to print on receipts"></textarea>
                                                            <small class="text-muted">This text will appear on all sales receipts</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Minimum Deposit Amount</label>
                                                            <div class="input-group">
                                                                <span class="input-group-text">$</span>
                                                                <input type="number" class="form-control" id="minimum_deposit_amount" 
                                                                    name="minimum_deposit_amount" min="0" step="0.01" value="0"
                                                                    placeholder="0.00">
                                                            </div>
                                                            <small class="text-muted">Minimum deposit required for sales bookings (0 = no minimum)</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Print Design Template</label>
                                                            <select class="form-select" id="print_design_template" name="print_design_template">
                                                                ${this.printTemplates.map(template =>
                `<option value="${template.value}">${template.text}</option>`
            ).join('')}
                                                            </select>
                                                            <small class="text-muted">Choose receipt design template</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Print Size</label>
                                                            <select class="form-select" id="print_size" name="print_size">
                                                                ${this.printSizes.map(size =>
                `<option value="${size.value}">${size.text}</option>`
            ).join('')}
                                                            </select>
                                                            <small class="text-muted">Paper size for printing receipts</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-3">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Header Font Size</label>
                                                            <input type="number" class="form-control" id="header_font_size" 
                                                                name="header_font_size" min="10" max="30" value="16">
                                                            <small class="text-muted">10-30 px</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-3">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-semibold">Content Font Size</label>
                                                            <input type="number" class="form-control" id="content_font_size" 
                                                                name="content_font_size" min="8" max="20" value="12">
                                                            <small class="text-muted">8-20 px</small>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="card bg-light border-0">
                                                            <div class="card-body">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox" id="enable_barcode" name="enable_barcode">
                                                                    <label class="form-check-label fw-semibold" for="enable_barcode">
                                                                        Enable Barcode on Receipts
                                                                    </label>
                                                                </div>
                                                                <small class="text-muted d-block mt-2">Print barcode for tracking</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <div class="card bg-light border-0">
                                                            <div class="card-body">
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox" id="enable_qr_code" name="enable_qr_code">
                                                                    <label class="form-check-label fw-semibold" for="enable_qr_code">
                                                                        Enable QR Code on Receipts
                                                                    </label>
                                                                </div>
                                                                <small class="text-muted d-block mt-2">Print QR code for verification</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-12">
                                                        <hr class="my-3">
                                                        <h6 class="mb-3 fw-semibold">
                                                            <i class="bi bi-printer me-2"></i>Printer Mappings
                                                        </h6>
                                                        <p class="text-muted small mb-3">Assign specific printers to users for automatic routing</p>
                                                        
                                                        <div id="printerMappingsContainer">
                                                            <!-- Dynamic printer mappings will be added here -->
                                                        </div>
                                                        
                                                        <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="addPrinterMapping">
                                                            <i class="bi bi-plus-circle me-1"></i> Add User Printer Mapping
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div class="mt-4 pt-3 border-top">
                                                    <button type="button" class="btn btn-primary" id="saveSalesSettings">
                                                        <i class="bi bi-check-circle me-1"></i> Save Settings
                                                    </button>
                                                    <button type="button" class="btn btn-outline-secondary ms-2" id="resetSalesSettings">
                                                        <i class="bi bi-arrow-clockwise me-1"></i> Reset to Default
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

        loadAllData: function () {
            const self = this;
            TempleCore.showLoading(true);

            const promises = [
                this.loadLedgersPromise(),
                this.loadUsersPromise(),
                this.loadSettingsPromise()
            ];

            Promise.all(promises)
                .then(function (results) {
                    self.usersList = results[1] || [];
                    self.settings = results[2] || {};
                    console.log('All data loaded:', {
                        users: self.usersList.length,
                        settings: Object.keys(self.settings).length
                    });
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
                                `<option value="${ledger.id}">${ledger.left_code}/${ledger.right_code} ${ledger.name}</option>`
                            ).join('');
                        $('#discount_ledger_id').html(options);
                    }

                    if (taxResponse.success) {
                        const options = '<option value="">Select Ledger</option>' +
                            taxResponse.data.ledgers.map(ledger =>
                                `<option value="${ledger.id}">${ledger.left_code}/${ledger.right_code} ${ledger.name}</option>`
                            ).join('');
                        $('#deposit_ledger_id').html(options);
                    }

                    return { expense: expenseResponse, tax: taxResponse };
                });
        },

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

                if (general.is_discount?.value === '1') {
                    $('#discount_ledger_group').show();
                }
                if (general.is_deposit?.value === '1') {
                    $('#deposit_ledger_group').show();
                }
            }

            // Populate Sales Settings
            if (this.settings.SALES) {
                const sales = this.settings.SALES;

                $('#slogan').val(sales.slogan?.value || '');
                $('#minimum_deposit_amount').val(sales.minimum_deposit_amount?.value || '0');
                $('#print_design_template').val(sales.print_design_template?.value || 'template1');
                $('#print_size').val(sales.print_size?.value || 'Thermal');
                $('#header_font_size').val(sales.header_font_size?.value || '16');
                $('#content_font_size').val(sales.content_font_size?.value || '12');
                $('#enable_barcode').prop('checked', sales.enable_barcode?.value === '1');
                $('#enable_qr_code').prop('checked', sales.enable_qr_code?.value === '1');
                
                $('#printerMappingsContainer').empty();
                if (sales.printer_mappings?.value) {
                    try {
                        const mappings = JSON.parse(sales.printer_mappings.value) || [];
                        mappings.forEach(m => {
                            if (m.printer_type === 'imin') m.printer_type = 'imin_d4';
                        });
                        mappings.forEach(mapping => this.addPrinterMappingRow(mapping));
                        if (!mappings.length) this.addPrinterMappingRow();
                    } catch (e) {
                        console.error('Failed to parse printer mappings', e);
                        this.addPrinterMappingRow();
                    }
                } else {
                    this.addPrinterMappingRow();
                }
            }
        },

        addPrinterMappingRow: function (mapping = {}) {
            const index = $('.printer-mapping-row').length;

            const html = `
                <div class="row printer-mapping-row mb-3 align-items-center" data-index="${index}">
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
                        <button type="button" class="btn btn-outline-danger btn-sm w-100 remove-printer-mapping">
                            <i class="bi bi-trash"></i> Remove
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
                $(this).closest('.printer-mapping-row').fadeOut(300, function() {
                    $(this).remove();
                });
            });

            // Save General Settings
            $('#saveGeneralSettings').on('click', function () {
                self.saveSettings('GENERAL');
            });

            // Save Sales Settings
            $('#saveSalesSettings').on('click', function () {
                self.saveSettings('SALES');
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

            // Reset Sales Settings
            $('#resetSalesSettings').on('click', function () {
                TempleCore.showConfirm(
                    'Reset Settings',
                    'Are you sure you want to reset Sales settings to default?',
                    function () {
                        self.resetSettings('SALES');
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
            } else if (type === 'SALES') {
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
                        self.loadAllData();
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

                        if (type === 'GENERAL') {
                            $('#generalSettingsForm')[0].reset();
                            $('#discount_ledger_group, #deposit_ledger_group').hide();
                        } else if (type === 'SALES') {
                            $('#salesSettingsForm')[0].reset();
                            $('#printerMappingsContainer').empty();
                        }

                        self.loadAllData();
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