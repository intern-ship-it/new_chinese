// js/pages/sales/invoices/create.js
// Create Sales Invoice - with Packages and Addons sections (like Sales Order)
// FIXED: Tax calculation now computes tax_amount from tax_rate

(function ($, window) {
    'use strict';

    window.SalesInvoicesCreatePage = {
        customers: [], // Devotees
        taxRates: [],
        packages: [],
        packagesData: [],  // Store full package data for calculations
        salesItems: [],
        products: [],
        uoms: [],
        items: [], // Combined items array
        soId: null,
        soData: null,

        init: function (params) {
            // Initialize arrays
            this.customers = [];
            this.taxRates = [];
            this.packages = [];
            this.packagesData = [];
            this.salesItems = [];
            this.products = [];
            this.uoms = [];
            this.items = [];

            // Check if creating from SO
            const urlParams = new URLSearchParams(window.location.search);
            this.soId = urlParams.get('so_id');

            this.loadInitialData();
        },

        loadInitialData: function () {
            TempleCore.showLoading(true);

            const promises = [
                this.loadCustomers(),
                this.loadTaxRates(),
                this.loadPackages(),
                this.loadSalesItems(),
                this.loadProducts(),
                this.loadUOMs()
            ];

            // If SO-based, load SO data
            if (this.soId) {
                promises.push(this.loadSOData());
            }

            $.when.apply($, promises)
                .done(() => {
                    this.render();
                    this.bindEvents();
                    setTimeout(() => {
                        this.initializeSelect2();
                    }, 100);
                })
                .fail((error) => {
                    console.error('Failed to load data:', error);
                    TempleCore.showToast('Failed to load data', 'error');
                    this.render();
                    this.bindEvents();
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },

        loadCustomers: function () {
            const self = this;
            return TempleAPI.get('/sales/devotees/active')
                .done((response) => {
                    if (response && response.success) {
                        self.customers = Array.isArray(response.data) ? response.data : [];
                    } else {
                        self.customers = [];
                    }
                })
                .fail((error) => {
                    console.error('Failed to load customers:', error);
                    self.customers = [];
                });
        },

        loadTaxRates: function () {
            const self = this;
            return TempleAPI.get('/masters/tax')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && typeof response.data === 'object' && response.data.data) {
                            self.taxRates = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            self.taxRates = response.data;
                        } else {
                            self.taxRates = [];
                        }
                    } else {
                        self.taxRates = [];
                    }
                })
                .fail((error) => {
                    console.error('Failed to load tax rates:', error);
                    self.taxRates = [];
                });
        },

        loadPackages: function () {
            const self = this;
            return TempleAPI.get('/sales/packages', { is_active: 1 })
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && response.data.data) {
                            self.packages = response.data.data;
                            self.packagesData = response.data.data;  // Store full data
                        } else if (Array.isArray(response.data)) {
                            self.packages = response.data;
                            self.packagesData = response.data;
                        } else {
                            self.packages = [];
                            self.packagesData = [];
                        }
                    }
                })
                .fail((error) => {
                    console.error('Failed to load packages:', error);
                    self.packages = [];
                    self.packagesData = [];
                });
        },

        loadSalesItems: function () {
            const self = this;
            return TempleAPI.get('/sales/items/active')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && response.data.data) {
                            self.salesItems = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            self.salesItems = response.data;
                        } else {
                            self.salesItems = [];
                        }
                    }
                })
                .fail((error) => {
                    console.error('Failed to load sales items:', error);
                    self.salesItems = [];
                });
        },

        loadProducts: function () {
            const self = this;
            return TempleAPI.get('/inventory/products?is_active=1')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && response.data.data) {
                            self.products = response.data.data;
                        } else if (Array.isArray(response.data)) {
                            self.products = response.data;
                        } else {
                            self.products = [];
                        }
                    }
                })
                .fail((error) => {
                    console.error('Failed to load products:', error);
                    self.products = [];
                });
        },

        loadUOMs: function () {
            const self = this;
            return TempleAPI.get('/inventory/uom')
                .done((response) => {
                    if (response && response.success) {
                        if (Array.isArray(response.data)) {
                            self.uoms = response.data;
                        } else if (response.data && response.data.data) {
                            self.uoms = response.data.data;
                        } else {
                            self.uoms = [];
                        }
                    }
                })
                .fail((error) => {
                    console.error('Failed to load UOMs:', error);
                    self.uoms = [];
                });
        },

        loadSOData: function () {
            // Placeholder if SO based implementation needed
            return $.Deferred().resolve().promise();
        },

        initializeSelect2: function () {
            $('#customer_id').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select customer...',
                allowClear: true,
                width: '100%'
            });

            $('#status').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select status...',
                width: '100%',
                minimumResultsForSearch: -1
            });

            $('#modalPackageSelect').select2({
                theme: 'bootstrap-5',
                dropdownParent: $('#packageModal'),
                placeholder: 'Select Package...',
                width: '100%'
            });

            $('#addonItem').select2({
                theme: 'bootstrap-5',
                dropdownParent: $('#addonModal'),
                placeholder: 'Select Item...',
                width: '100%'
            });
        },

        render: function () {
            const isSOBased = !!this.soId;
            const customers = Array.isArray(this.customers) ? this.customers : [];

            const html = `
                <div class="container-fluid">
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="page-title">Create Sales Invoice</h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('sales/invoices'); return false;">Sales Invoices</a></li>
                                        <li class="breadcrumb-item active">Create</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-end">
                                <button class="btn btn-secondary" id="backBtn">
                                    <i class="bi bi-arrow-left"></i> Back
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <form id="createInvoiceForm">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="card-title mb-0">Invoice Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <input type="hidden" id="invoice_type" value="${isSOBased ? 'SO_BASED' : 'DIRECT'}">
                                    
                                    <div class="col-md-4">
                                        <label class="form-label">Invoice Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="invoice_date" 
                                               value="${new Date().toISOString().split('T')[0]}" required>
                                    </div>
                                    
                                    <div class="col-md-4">
                                        <label class="form-label">Customer Invoice No.</label>
                                        <input type="text" class="form-control" id="customer_invoice_no" 
                                               placeholder="Customer's invoice reference">
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">Customer <span class="text-danger">*</span></label>
                                        <select class="form-select" id="customer_id" required>
                                            <option value="">Select Customer</option>
                                            ${customers.map(c => `
                                                <option value="${c.id}">
                                                    ${c.customer_name || c.name || ''} (${c.mobile || ''})
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Payment Due Date</label>
                                        <input type="date" class="form-control" id="payment_due_date" 
                                               min="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="status">
                                            <option value="DRAFT">Draft</option>
                                            <option value="POSTED">Posted</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Packages Section -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5 class="mb-0">Packages</h5>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <button class="btn btn-primary" type="button" id="addPackageBtn">
                                            <i class="bi bi-plus"></i> Add Package
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th width="20%">Item</th>
                                                <th width="20%">Description</th>
                                                <th width="10%">Quantity</th>
                                                <th width="10%">Amount</th>
                                                <th width="10%">Discount</th>
                                                <th width="10%">Tax</th>
                                                <th width="10%">Total</th>
                                                <th width="5%"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="packagesTableBody">
                                            <tr class="no-items">
                                                <td colspan="8" class="text-center text-muted">No packages added</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Addons Section -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5 class="mb-0">Addons</h5>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <button class="btn btn-info text-white" type="button" id="addAddonBtn">
                                            <i class="bi bi-plus"></i> Add Addon
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th width="30%">Item / Addon</th>
                                                <th width="15%">Type</th>
                                                <th width="10%">Qty</th>
                                                <th width="10%">Price</th>
                                                <th width="10%">Tax</th>
                                                <th width="10%">Discount</th>
                                                <th width="10%">Total</th>
                                                <th width="5%"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="addonsTableBody">
                                            <tr class="no-items">
                                                <td colspan="8" class="text-center text-muted">No addons added</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Summary Section -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row justify-content-end">
                                    <div class="col-md-4">
                                        <table class="table table-borderless table-sm">
                                            <tr>
                                                <td class="text-end"><strong>Subtotal:</strong></td>
                                                <td class="text-end" style="width: 120px;"><strong id="subtotal">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-end"><strong>Total Tax:</strong></td>
                                                <td class="text-end"><strong id="totalTax">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-end"><strong>Total Discount:</strong></td>
                                                <td class="text-end"><strong id="totalDiscount">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td class="text-end"><strong>Shipping Charges:</strong></td>
                                                <td class="text-end">
                                                    <input type="number" class="form-control form-control-sm text-end" 
                                                           id="shipping_charges" value="0" min="0" step="0.01" style="width: 100px; display: inline-block;">
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="text-end"><strong>Other Charges:</strong></td>
                                                <td class="text-end">
                                                    <input type="number" class="form-control form-control-sm text-end" 
                                                           id="other_charges" value="0" min="0" step="0.01" style="width: 100px; display: inline-block;">
                                                </td>
                                            </tr>
                                            <tr class="border-top mt-2">
                                                <td class="text-end pt-2"><h5>Grand Total:</h5></td>
                                                <td class="text-end pt-2"><h5 id="grandTotal">0.00</h5></td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Additional Information -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Terms & Conditions</label>
                                        <textarea class="form-control" id="terms_conditions" rows="3"></textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="notes" rows="3"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-secondary" onclick="window.history.back()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Create Invoice
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Package Modal -->
                <div class="modal fade" id="packageModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Package</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-12">
                                        <label class="form-label">Select Package</label>
                                        <select class="form-select" id="modalPackageSelect">
                                            <option value="">Select Package</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Description</label>
                                        <input type="text" class="form-control" id="pkgDescription" placeholder="Enter description">
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Quantity</label>
                                        <input type="number" class="form-control" id="pkgQty" value="1" min="1">
                                    </div>
                                    
                                    <!-- Package Calculation Details - FIXED -->
                                    <div class="col-md-12">
                                        <div class="card bg-light">
                                            <div class="card-body">
                                                <h6 class="card-title">Package Calculation</h6>
                                                <div class="row g-3">
                                                    <div class="col-md-3">
                                                        <label class="form-label small">Price (Amount)</label>
                                                        <input type="text" class="form-control form-control-sm" id="pkgPrice" value="0.00" readonly>
                                                    </div>
                                                    <div class="col-md-3">
                                                        <label class="form-label small">Discount</label>
                                                        <input type="text" class="form-control form-control-sm" id="pkgDiscount" value="0.00" readonly>
                                                    </div>
                                                    <div class="col-md-3">
                                                        <label class="form-label small">Tax Amount</label>
                                                        <input type="text" class="form-control form-control-sm" id="pkgTaxAmount" value="0.00" readonly>
                                                        <small class="text-muted" id="pkgTaxRateDisplay"></small>
                                                    </div>
                                                    <div class="col-md-3">
                                                        <label class="form-label small">Grand Total</label>
                                                        <input type="text" class="form-control form-control-sm fw-bold text-primary" id="pkgGrandTotal" value="0.00" readonly>
                                                    </div>
                                                </div>
                                                <!-- Hidden field for tax rate -->
                                                <input type="hidden" id="pkgTaxRate" value="0">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePackageBtn">Add Package</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Addon Modal -->
                <div class="modal fade" id="addonModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Addon</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Type</label>
                                        <select class="form-select" id="addonType">
                                            <option value="">Select Type</option>
                                            <option value="product">Product</option>
                                            <option value="sales_item">Sales Item</option>
                                        </select>
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Item</label>
                                        <select class="form-select" id="addonItem" disabled>
                                            <option value="">Select Type First</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Quantity</label>
                                        <input type="number" class="form-control" id="addonQty" value="1" min="1" step="0.001">
                                    </div>
                                    <div class="col-md-4" id="uomDiv" style="display:none;">
                                        <label class="form-label">UOM</label>
                                        <select class="form-select" id="addonUom"></select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Unit Price</label>
                                        <input type="number" class="form-control" id="addonPrice" step="0.01">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Tax</label>
                                        <select class="form-select" id="addonTaxSelect">
                                            <option value="" data-rate="0">No Tax</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Discount</label>
                                        <input type="number" class="form-control" id="addonDiscount" value="0" step="0.01">
                                    </div>
                                    
                                    <!-- Addon Calculation Preview -->
                                    <div class="col-md-12 mt-3">
                                        <div class="card bg-light">
                                            <div class="card-body py-2">
                                                <div class="row text-center">
                                                    <div class="col-md-3">
                                                        <small class="text-muted">Subtotal</small>
                                                        <div id="addonSubtotal">0.00</div>
                                                    </div>
                                                    <div class="col-md-3">
                                                        <small class="text-muted">After Discount</small>
                                                        <div id="addonAfterDiscount">0.00</div>
                                                    </div>
                                                    <div class="col-md-3">
                                                        <small class="text-muted">Tax Amount</small>
                                                        <div id="addonTaxAmount">0.00</div>
                                                    </div>
                                                    <div class="col-md-3">
                                                        <small class="text-muted">Total</small>
                                                        <div class="fw-bold text-primary" id="addonTotal">0.00</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveAddonBtn">Add Addon</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .select2-container--bootstrap-5 .select2-selection { border: 1px solid #dee2e6; min-height: calc(1.5em + 0.75rem + 2px); }
                    .select2-container--bootstrap-5.select2-container--focus .select2-selection,
                    .select2-container--bootstrap-5.select2-container--open .select2-selection { border-color: var(--primary-color); box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25); }
                </style>
            `;

            $('#page-container').html(html);
        },

        bindEvents: function () {
            const self = this;

            // Back button
            $('#backBtn').on('click', () => {
                window.history.back();
            });

            // Package Modal Events
            $('#addPackageBtn').on('click', (e) => {
                e.preventDefault();
                self.resetPackageModal();
                self.populatePackageSelect();
                $('#packageModal').modal('show');
            });

            // FIXED: When package is selected, CALCULATE tax amount from tax rate
            $('#modalPackageSelect').on('change', function () {
                const pkgId = $(this).val();
                if (pkgId) {
                    // Find full package data
                    const pkg = self.packagesData.find(p => p.id == pkgId);
                    if (pkg) {
                        const totalAmount = parseFloat(pkg.total_amount) || 0;  // Base price
                        const taxRate = parseFloat(pkg.tax_rate) || 0;          // Tax percentage (e.g., 12)
                        const discount = parseFloat(pkg.discount) || 0;         // Discount amount

                        // FORMULA: 
                        // subtotalAfter = total_amount - discount
                        // taxAmount = subtotalAfter * (tax_rate / 100)
                        // grandTotal = subtotalAfter + taxAmount
                        const subtotalAfter = totalAmount - discount;
                        const taxAmount = subtotalAfter * (taxRate / 100);
                        const grandTotal = subtotalAfter + taxAmount;

                        // Display calculated values
                        $('#pkgPrice').val(totalAmount.toFixed(2));
                        $('#pkgDiscount').val(discount.toFixed(2));
                        $('#pkgTaxAmount').val(taxAmount.toFixed(2));  // CALCULATED TAX AMOUNT, not rate!
                        $('#pkgGrandTotal').val(grandTotal.toFixed(2));
                        $('#pkgTaxRate').val(taxRate);
                        $('#pkgTaxRateDisplay').text(taxRate > 0 ? `(${taxRate}%)` : '');
                    }
                } else {
                    self.resetPackageCalculation();
                }
            });

            // Recalculate when quantity changes
            $('#pkgQty').on('change input', function () {
                self.recalculatePackageTotal();
            });

            $('#savePackageBtn').on('click', () => {
                const pkgId = $('#modalPackageSelect').val();
                if (!pkgId) {
                    TempleCore.showToast('Please select a package', 'warning');
                    return;
                }

                const pkg = self.packagesData.find(p => p.id == pkgId);
                const $opt = $('#modalPackageSelect').find(':selected');
                const qty = parseFloat($('#pkgQty').val()) || 1;
                const desc = $('#pkgDescription').val() || $opt.text().trim();

                // Read calculated values (per unit)
                const price = parseFloat($('#pkgPrice').val()) || 0;
                const discount = parseFloat($('#pkgDiscount').val()) || 0;
                const taxRate = parseFloat($('#pkgTaxRate').val()) || 0;

                // Calculate per-unit values
                const subtotalAfterPerUnit = price - discount;
                const taxAmountPerUnit = subtotalAfterPerUnit * (taxRate / 100);

                const pkgItem = {
                    is_addon: false,
                    type: 'package',
                    item_type: 'package',
                    package_id: pkgId,
                    item_id: pkgId,
                    description: desc,
                    unit_price: price,
                    tax_rate: taxRate,
                    tax_amount: taxAmountPerUnit * qty,      // Total tax for line
                    discount_amount: discount * qty,          // Total discount for line
                    quantity: qty,
                    type_display: 'Package'
                };

                // Calculate line total
                pkgItem.total = (subtotalAfterPerUnit * qty) + pkgItem.tax_amount;

                self.addItem(pkgItem);
                $('#packageModal').modal('hide');
            });

            // Addon Modal Events
            $('#addAddonBtn').on('click', (e) => {
                e.preventDefault();
                $('#addonType').val('').trigger('change');
                $('#addonItem').html('<option value="">Select Type First</option>').prop('disabled', true);
                $('#addonUom').html('');
                $('#uomDiv').hide();
                $('#addonQty').val(1);
                $('#addonPrice').val('');
                $('#addonDiscount').val('0');

                // Populate tax dropdown
                self.populateAddonTaxSelect();

                // Reset calculation preview
                self.resetAddonCalculation();

                $('#addonModal').modal('show');
            });

            $('#addonType').on('change', function () {
                const type = $(this).val();
                $('#addonItem').html('<option value="">Loading...</option>').prop('disabled', true);

                if (type === 'product') {
                    $('#uomDiv').show();
                    self.populateProductSelect();
                } else if (type === 'sales_item') {
                    $('#uomDiv').hide();
                    self.populateSalesItemSelect();
                } else {
                    $('#addonItem').html('<option value="">Select Type First</option>').prop('disabled', true);
                    $('#uomDiv').hide();
                }
            });

            $('#addonItem').on('change', function () {
                const $opt = $(this).find(':selected');
                if ($opt.val()) {
                    $('#addonPrice').val($opt.data('price') || 0);
                    if ($('#addonType').val() === 'product') {
                        self.loadUoms($opt.data('id'));
                    }
                    self.recalculateAddon();
                }
            });

            // Recalculate addon when any value changes
            $('#addonQty, #addonPrice, #addonDiscount').on('input change', function () {
                self.recalculateAddon();
            });

            $('#addonTaxSelect').on('change', function () {
                self.recalculateAddon();
            });

            // FIXED: Calculate addon tax amount from tax rate
            $('#saveAddonBtn').on('click', () => {
                const type = $('#addonType').val();
                const itemId = $('#addonItem').val();
                if (!type || !itemId) {
                    TempleCore.showToast('Please select type and item', 'warning');
                    return;
                }

                const price = parseFloat($('#addonPrice').val()) || 0;
                const qty = parseFloat($('#addonQty').val()) || 1;
                const discount = parseFloat($('#addonDiscount').val()) || 0;

                // Get tax rate from dropdown
                const $taxOpt = $('#addonTaxSelect').find(':selected');
                const taxRate = parseFloat($taxOpt.data('rate')) || 0;
                const taxId = $('#addonTaxSelect').val() || null;

                // CORRECT CALCULATION:
                // 1. Subtotal = price × qty
                // 2. Subtotal after discount = subtotal - discount
                // 3. Tax amount = subtotal after discount × (tax_rate / 100)
                // 4. Total = subtotal after discount + tax amount
                const subtotal = price * qty;
                const subtotalAfterDiscount = subtotal - discount;
                const taxAmount = subtotalAfterDiscount * (taxRate / 100);
                const total = subtotalAfterDiscount + taxAmount;

                const item = {
                    is_addon: true,
                    type: type,
                    item_type: type,
                    item_id: itemId,
                    description: $('#addonItem option:selected').text().trim(),
                    quantity: qty,
                    unit_price: price,
                    tax_id: taxId,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,           // CALCULATED TAX AMOUNT
                    discount_amount: discount,
                    total: total,
                    type_display: type === 'product' ? 'Product (Addon)' : 'Sales Item (Addon)',
                    uom_id: type === 'product' ? $('#addonUom').val() : null,
                    uom_name: type === 'product' ? $('#addonUom option:selected').text() : ''
                };

                self.addItem(item);
                $('#addonModal').modal('hide');
            });

            // Table Events
            $(document).on('click', '.remove-item', function () {
                const idx = $(this).data('index');
                self.items.splice(idx, 1);
                self.renderItems();
            });

            // Charges change
            $(document).on('input', '#shipping_charges, #other_charges', function () {
                self.calculateTotals();
            });

            // Form Submit
            $('#createInvoiceForm').on('submit', function (e) {
                e.preventDefault();
                self.saveInvoice();
            });
        },

        resetPackageModal: function () {
            $('#modalPackageSelect').val('').trigger('change');
            $('#pkgDescription').val('');
            $('#pkgQty').val('1');
            this.resetPackageCalculation();
        },

        resetPackageCalculation: function () {
            $('#pkgPrice').val('0.00');
            $('#pkgDiscount').val('0.00');
            $('#pkgTaxAmount').val('0.00');
            $('#pkgGrandTotal').val('0.00');
            $('#pkgTaxRate').val('0');
            $('#pkgTaxRateDisplay').text('');
        },

        recalculatePackageTotal: function () {
            const pkgId = $('#modalPackageSelect').val();
            if (!pkgId) return;

            const pkg = this.packagesData.find(p => p.id == pkgId);
            if (!pkg) return;

            const qty = parseFloat($('#pkgQty').val()) || 1;
            const totalAmount = parseFloat(pkg.total_amount) || 0;
            const taxRate = parseFloat(pkg.tax_rate) || 0;
            const discount = parseFloat(pkg.discount) || 0;

            // Calculate per-unit values
            const subtotalAfter = totalAmount - discount;
            const taxAmount = subtotalAfter * (taxRate / 100);

            // Grand total for all quantities
            const grandTotal = (subtotalAfter + taxAmount) * qty;

            // Update display (show per-unit values except grand total)
            $('#pkgPrice').val(totalAmount.toFixed(2));
            $('#pkgDiscount').val(discount.toFixed(2));
            $('#pkgTaxAmount').val(taxAmount.toFixed(2));
            $('#pkgGrandTotal').val(grandTotal.toFixed(2));
        },

        populatePackageSelect: function () {
            let opts = '<option value="">Select Package</option>';
            if (this.packagesData && this.packagesData.length > 0) {
                this.packagesData.forEach(p => {
                    const grandTotal = parseFloat(p.grand_total || 0).toFixed(2);
                    opts += `<option value="${p.id}">
                        ${p.package_name || p.name} ${p.package_number ? '(' + p.package_number + ')' : ''} 
                    </option>`;
                });
            }
            $('#modalPackageSelect').html(opts);
        },

        populateProductSelect: function () {
            let opts = '<option value="">Select Product</option>';
            if (this.products && this.products.length > 0) {
                this.products.forEach(p => {
                    opts += `<option value="${p.id}" data-price="${p.unit_price || 0}" data-id="${p.id}">${p.name}</option>`;
                });
            }
            $('#addonItem').html(opts).prop('disabled', false);
        },

        populateSalesItemSelect: function () {
            let opts = '<option value="">Select Sales Item</option>';
            if (this.salesItems && this.salesItems.length > 0) {
                this.salesItems.forEach(p => {
                    opts += `<option value="${p.id}" data-price="${p.price || p.unit_price || 0}" data-id="${p.id}">${p.name_primary || p.name}</option>`;
                });
            }
            $('#addonItem').html(opts).prop('disabled', false);
        },

        loadUoms: function (productId) {
            // Fetch UOM family for the product
            TempleAPI.get(`/inventory/products/${productId}/uom-family`).done(res => {
                let opts = '';
                const uoms = (res.data && res.data.uom_family) ? res.data.uom_family : [];

                if (Array.isArray(uoms) && uoms.length > 0) {
                    uoms.forEach(u => {
                        opts += `<option value="${u.id}">${u.name}</option>`;
                    });
                } else {
                    // Fallback to all UOMs
                    this.uoms.forEach(u => {
                        opts += `<option value="${u.id}">${u.name}</option>`;
                    });
                }
                $('#addonUom').html(opts);
            }).fail(() => {
                // Fallback to all UOMs
                let opts = '';
                this.uoms.forEach(u => {
                    opts += `<option value="${u.id}">${u.name}</option>`;
                });
                $('#addonUom').html(opts);
            });
        },

        populateAddonTaxSelect: function () {
            let opts = '<option value="" data-rate="0">No Tax</option>';
            if (this.taxRates && this.taxRates.length > 0) {
                this.taxRates.forEach(t => {
                    if (t.status == 1 || t.is_active) {
                        const rate = t.percent || t.rate || 0;
                        opts += `<option value="${t.id}" data-rate="${rate}">${t.name} (${rate}%)</option>`;
                    }
                });
            }
            $('#addonTaxSelect').html(opts);
        },

        resetAddonCalculation: function () {
            $('#addonSubtotal').text('0.00');
            $('#addonAfterDiscount').text('0.00');
            $('#addonTaxAmount').text('0.00');
            $('#addonTotal').text('0.00');
        },

        recalculateAddon: function () {
            const price = parseFloat($('#addonPrice').val()) || 0;
            const qty = parseFloat($('#addonQty').val()) || 1;
            const discount = parseFloat($('#addonDiscount').val()) || 0;

            // Get tax rate from dropdown
            const $taxOpt = $('#addonTaxSelect').find(':selected');
            const taxRate = parseFloat($taxOpt.data('rate')) || 0;

            // Calculate:
            // 1. Subtotal = price × qty
            // 2. Subtotal after discount = subtotal - discount
            // 3. Tax amount = subtotal after discount × (tax_rate / 100)
            // 4. Total = subtotal after discount + tax amount
            const subtotal = price * qty;
            const subtotalAfterDiscount = subtotal - discount;
            const taxAmount = subtotalAfterDiscount * (taxRate / 100);
            const total = subtotalAfterDiscount + taxAmount;

            // Update display
            $('#addonSubtotal').text(subtotal.toFixed(2));
            $('#addonAfterDiscount').text(subtotalAfterDiscount.toFixed(2));
            $('#addonTaxAmount').text(taxAmount.toFixed(2) + (taxRate > 0 ? ` (${taxRate}%)` : ''));
            $('#addonTotal').text(total.toFixed(2));
        },

        addItem: function (item) {
            this.items.push(item);
            this.renderItems();
        },

        renderItems: function () {
            const $pkgBody = $('#packagesTableBody');
            const $addonBody = $('#addonsTableBody');
            $pkgBody.empty();
            $addonBody.empty();

            let hasPackages = false;
            let hasAddons = false;

            this.items.forEach((item, index) => {
                if (item.is_addon) {
                    const row = `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.type_display}</td>
                            <td>${item.quantity} ${item.uom_name || ''}</td>
                            <td>${item.unit_price.toFixed(2)}</td>
                            <td>${item.tax_amount.toFixed(2)}</td>
                            <td>${item.discount_amount.toFixed(2)}</td>
                            <td>${item.total.toFixed(2)}</td>
                            <td>
                                <button type="button" class="btn btn-sm btn-danger remove-item" data-index="${index}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    $addonBody.append(row);
                    hasAddons = true;
                } else {
                    // Package row - FIXED column order: Item, Desc, Qty, Amount, Discount, Tax, Total
                    const row = `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td>${(item.unit_price * item.quantity).toFixed(2)}</td>
                            <td>${item.discount_amount.toFixed(2)}</td>
                            <td>${item.tax_amount.toFixed(2)}</td>
                            <td>${item.total.toFixed(2)}</td>
                            <td>
                                <button type="button" class="btn btn-sm btn-danger remove-item" data-index="${index}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    $pkgBody.append(row);
                    hasPackages = true;
                }
            });

            if (!hasPackages) {
                $pkgBody.html('<tr class="no-items"><td colspan="8" class="text-center text-muted">No packages added</td></tr>');
            }
            if (!hasAddons) {
                $addonBody.html('<tr class="no-items"><td colspan="8" class="text-center text-muted">No addons added</td></tr>');
            }

            this.calculateTotals();
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            this.items.forEach(item => {
                subtotal += (item.unit_price * item.quantity);
                totalTax += item.tax_amount;
                totalDiscount += item.discount_amount;
            });

            const shipping = parseFloat($('#shipping_charges').val()) || 0;
            const other = parseFloat($('#other_charges').val()) || 0;

            const grandTotal = subtotal + totalTax - totalDiscount + shipping + other;

            // ✅ Balance Amount = Grand Total (since no payments made yet on creation)
            const balanceAmount = grandTotal;

            $('#subtotal').text(subtotal.toFixed(2));
            $('#totalTax').text(totalTax.toFixed(2));
            $('#totalDiscount').text(totalDiscount.toFixed(2));
            $('#grandTotal').text(grandTotal.toFixed(2));
            $('#balanceAmount').text(balanceAmount.toFixed(2));  // ✅ Update balance display
        },
        saveInvoice: function () {
            const self = this;
            const devoteeId = $('#customer_id').val();
            if (!devoteeId) {
                TempleCore.showToast('Please select a customer', 'error');
                return;
            }
            if (this.items.length === 0) {
                TempleCore.showToast('Please add at least one item', 'error');
                return;
            }

            const data = {
                devotee_id: devoteeId,
                invoice_type: $('#invoice_type').val() || 'DIRECT',
                invoice_date: $('#invoice_date').val(),
                customer_invoice_no: $('#customer_invoice_no').val(),
                payment_due_date: $('#payment_due_date').val(),
                status: $('#status').val(),
                items: this.items.map(item => ({
                    item_type: item.item_type || item.type,
                    type: item.type,
                    item_id: item.item_id,
                    package_id: item.package_id || null,
                    product_id: item.type === 'product' ? item.item_id : null,
                    sales_item_id: item.type === 'sales_item' ? item.item_id : null,
                    description: item.description,
                    quantity: item.quantity,
                    uom_id: item.uom_id || null,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate || 0,
                    tax_amount: item.tax_amount,
                    discount_amount: item.discount_amount,
                    is_addon: item.is_addon
                })),
                shipping_charges: $('#shipping_charges').val(),
                other_charges: $('#other_charges').val(),
                terms_conditions: $('#terms_conditions').val(),
                notes: $('#notes').val()
            };

            TempleCore.showLoading(true);
            TempleAPI.post('/sales/invoices', data)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Invoice created successfully', 'success');
                        TempleRouter.navigate('sales/invoices');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create invoice', 'error');
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast(xhr.responseJSON?.message || 'Failed to create invoice', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        cleanup: function () {
            // Cleanup event handlers
            $(document).off('click', '.remove-item');
            $(document).off('input', '#shipping_charges, #other_charges');
            $('#addPackageBtn').off('click');
            $('#addAddonBtn').off('click');
            $('#modalPackageSelect').off('change');
            $('#pkgQty').off('change input');
            $('#addonType').off('change');
            $('#addonItem').off('change');
            $('#addonQty, #addonPrice, #addonDiscount').off('input change');
            $('#addonTaxSelect').off('change');
            $('#savePackageBtn').off('click');
            $('#saveAddonBtn').off('click');
            $('#createInvoiceForm').off('submit');
            $('#backBtn').off('click');
        }
    };
})(jQuery, window);