// js/pages/purchase/invoices/create.js
// Create Purchase Invoice - Direct or PO-based with UOM and conditional fields

(function ($, window) {
    'use strict';

    window.PurchaseInvoicesCreatePage = {
        suppliers: [],
        taxRates: [],
        products: [],
        services: [],
        uoms: [],
        poId: null,
        poData: null,

        init: function (params) {
            // Initialize arrays to ensure they're always arrays
            this.suppliers = [];
            this.taxRates = [];
            this.products = [];
            this.services = [];
            this.uoms = [];

            // Check if creating from PO
            const urlParams = new URLSearchParams(window.location.search);
            this.poId = urlParams.get('po_id');

            this.loadInitialData();
        },

        loadInitialData: function () {
            TempleCore.showLoading(true);

            const promises = [
                this.loadSuppliers(),
                this.loadTaxRates(),
                this.loadProducts(),
                this.loadServices(),
                this.loadUOMs()
            ];

            // If PO-based, load PO data
            if (this.poId) {
                promises.push(this.loadPOData());
            }

            $.when.apply($, promises)
                .done(() => {
                    this.render();
                    this.bindEvents();
                })
                .fail((error) => {
                    console.error('Failed to load data:', error);
                    TempleCore.showToast('Failed to load data', 'error');
                    // Still render with empty data
                    this.render();
                    this.bindEvents();
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },

        loadSuppliers: function () {
            const self = this;
            return TempleAPI.get('/purchase/suppliers?status=active')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && typeof response.data === 'object' && response.data.data) {
                            self.suppliers = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            self.suppliers = response.data;
                        } else {
                            self.suppliers = [];
                        }
                    } else {
                        self.suppliers = [];
                    }
                    console.log('Loaded suppliers:', self.suppliers);
                })
                .fail((error) => {
                    console.error('Failed to load suppliers:', error);
                    self.suppliers = [];
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
                    console.log('Loaded tax rates:', self.taxRates);
                })
                .fail((error) => {
                    console.error('Failed to load tax rates:', error);
                    self.taxRates = [];
                });
        },

        loadProducts: function () {
            const self = this;
            return TempleAPI.get('/inventory/products?is_active=1')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && typeof response.data === 'object' && response.data.data) {
                            self.products = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            self.products = response.data;
                        } else {
                            self.products = [];
                        }
                    } else {
                        self.products = [];
                    }
                    console.log('Loaded products:', self.products);
                })
                .fail((error) => {
                    console.error('Failed to load products:', error);
                    self.products = [];
                });
        },

        loadServices: function () {
            const self = this;
            return TempleAPI.get('/purchase/services?is_active=1')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && typeof response.data === 'object' && response.data.data) {
                            self.services = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            self.services = response.data;
                        } else {
                            self.services = [];
                        }
                    } else {
                        self.services = [];
                    }
                    console.log('Loaded services:', self.services);
                })
                .fail((error) => {
                    console.error('Failed to load services:', error);
                    self.services = [];
                });
        },

        loadUOMs: function () {
            const self = this;
            return TempleAPI.get('/inventory/uom')
                .done((response) => {
                    if (response && response.success) {
                        if (Array.isArray(response.data)) {
                            self.uoms = response.data;
                        } else if (response.data && Array.isArray(response.data.data)) {
                            self.uoms = response.data.data;
                        } else {
                            self.uoms = [];
                        }
                    } else {
                        self.uoms = [];
                    }
                    console.log('Loaded UOMs:', self.uoms);
                })
                .fail((error) => {
                    console.error('Failed to load UOMs:', error);
                    self.uoms = [];
                });
        },

        loadPOData: function () {
            const self = this;
            return TempleAPI.get(`/purchase/orders/${this.poId}`)
                .done((response) => {
                    console.log('PO Data loaded:', response);

                    if (response && response.success) {
                        self.poData = response.data;

                        if (!self.poData || !self.poData.id) {
                            console.error('Invalid PO data:', self.poData);
                            TempleCore.showToast('Invalid Purchase Order data', 'error');
                            TempleRouter.navigate('purchase/invoices');
                            return;
                        }

                        if (self.poData.status !== 'APPROVED') {
                            TempleCore.showToast('Only approved POs can be invoiced', 'warning');
                            TempleRouter.navigate('purchase/invoices');
                        }
                    } else {
                        console.error('Failed to load PO:', response);
                        TempleCore.showToast('Failed to load purchase order', 'error');
                        TempleRouter.navigate('purchase/invoices');
                    }
                })
                .fail((error) => {
                    console.error('Failed to load PO data:', error);
                    TempleCore.showToast('Failed to load purchase order', 'error');
                    TempleRouter.navigate('purchase/invoices');
                });
        },

        initializeSelect2: function () {
            $('#supplier_id').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select supplier...',
                allowClear: true,
                width: '100%'
            });

            $('#status').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select status...',
                width: '100%',
                minimumResultsForSearch: -1
            });

            this.initializeDynamicSelect2();
        },

        initializeDynamicSelect2: function () {
            $('.item-type').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select type...',
                width: '100%',
                minimumResultsForSearch: -1
            });

            $('.item-select').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search item...',
                allowClear: true,
                width: '100%'
            });

            $('.uom-select').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select UOM...',
                allowClear: true,
                width: '100%'
            });

            $('.tax-select').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select tax...',
                allowClear: true,
                width: '100%'
            });
        },

        render: function () {
            const isPOBased = !!this.poId;
            const suppliers = Array.isArray(this.suppliers) ? this.suppliers : [];
            const taxRates = Array.isArray(this.taxRates) ? this.taxRates : [];
            const uoms = Array.isArray(this.uoms) ? this.uoms : [];

            console.log('Rendering with suppliers:', suppliers.length, 'tax rates:', taxRates.length, 'UOMs:', uoms.length);

            const html = `
                <div class="container-fluid">
                    <div class="page-header mb-4">
                        <h1 class="page-title">Create Purchase Invoice</h1>
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/invoices'); return false;">Purchase Invoices</a></li>
                                <li class="breadcrumb-item active">Create</li>
                            </ol>
                        </nav>
                    </div>
                    
                    <form id="createInvoiceForm">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="card-title mb-0">Invoice Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="form-label">Invoice Type</label>
                                        <input type="text" class="form-control" value="${isPOBased ? 'PO Based' : 'Direct'}" readonly>
                                        <input type="hidden" id="invoice_type" value="${isPOBased ? 'PO_BASED' : 'DIRECT'}">
                                        ${isPOBased ? `<input type="hidden" id="po_id" value="${this.poId}">` : ''}
                                    </div>
                                    
                                    ${isPOBased && this.poData ? `
                                    <div class="col-md-3">
                                        <label class="form-label">PO Number</label>
                                        <input type="text" class="form-control" value="${this.poData.po_number || ''}" readonly>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Invoice Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="invoice_date" 
                                               value="${new Date().toISOString().split('T')[0]}" required>
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Supplier Invoice No.</label>
                                        <input type="text" class="form-control" id="supplier_invoice_no" 
                                               placeholder="Supplier's invoice reference">
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplier_id" required ${isPOBased ? 'disabled' : ''}>
                                            <option value="">Select Supplier</option>
                                            ${suppliers.length > 0 ? suppliers.map(s => `
                                                <option value="${s.id}" 
                                                    ${isPOBased && this.poData && this.poData.supplier_id === s.id ? 'selected' : ''}>
                                                    ${s.name || ''}
                                                </option>
                                            `).join('') : '<option value="" disabled>No suppliers available</option>'}
                                        </select>
                                        ${isPOBased && this.poData ? `<input type="hidden" name="supplier_id" value="${this.poData.supplier_id}">` : ''}
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Payment Due Date</label>
                                        <input type="date" class="form-control" id="payment_due_date" 
                                               min="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="status">
                                            <option value="DRAFT">Draft</option>
                                            <option value="POSTED">Posted</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Items Section -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="card-title mb-0">Invoice Items</h5>
                                    ${!isPOBased ? `
                                    <button type="button" class="btn btn-sm btn-primary" onclick="PurchaseInvoicesCreatePage.addItemRow()">
                                        <i class="bi bi-plus-circle"></i> Add Item
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="5%">#</th>
                                                <th width="12%">Type</th>
                                                <th width="20%">Item</th>
                                                <th width="10%" class="quantity-header">Quantity</th>
                                                <th width="10%" class="uom-header">UOM</th>
                                                <th width="10%">Unit Price</th>
                                                <th width="10%">Tax</th>
                                                <th width="8%">Discount</th>
                                                <th width="10%">Total</th>
                                                ${!isPOBased ? '<th width="5%">Action</th>' : ''}
                                            </tr>
                                        </thead>
                                        <tbody id="itemsTableBody">
                                            ${isPOBased ? this.renderPOItems() : ''}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="${isPOBased ? 8 : 9}" class="text-end"><strong>Subtotal:</strong></td>
                                                <td class="text-end"><strong id="subtotal">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${isPOBased ? 8 : 9}" class="text-end"><strong>Total Tax:</strong></td>
                                                <td class="text-end"><strong id="totalTax">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${isPOBased ? 8 : 9}" class="text-end"><strong>Total Discount:</strong></td>
                                                <td class="text-end"><strong id="totalDiscount">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${isPOBased ? 8 : 9}" class="text-end">
                                                    <strong>Shipping Charges:</strong>
                                                </td>
                                                <td>
                                                    <input type="number" class="form-control form-control-sm" 
                                                           id="shipping_charges" value="0" min="0" step="0.01">
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="${isPOBased ? 8 : 9}" class="text-end">
                                                    <strong>Other Charges:</strong>
                                                </td>
                                                <td>
                                                    <input type="number" class="form-control form-control-sm" 
                                                           id="other_charges" value="0" min="0" step="0.01">
                                                </td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td colspan="${isPOBased ? 8 : 9}" class="text-end">
                                                    <strong>Grand Total:</strong>
                                                </td>
                                                <td class="text-end">
                                                    <strong id="grandTotal">0.00</strong>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
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
                
                <!-- Custom CSS for Select2 -->
                <style>
                    .select2-container--bootstrap-5 .select2-selection {
                        border: 1px solid #dee2e6;
                        min-height: calc(1.5em + 0.75rem + 2px);
                    }
                    
                    .select2-container--bootstrap-5.select2-container--focus .select2-selection,
                    .select2-container--bootstrap-5.select2-container--open .select2-selection {
                        border-color: var(--primary-color);
                        box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
                    }
                    
                    .select2-dropdown {
                        border: 1px solid #dee2e6;
                        border-radius: 0.375rem;
                    }
                    
                    .select2-search--dropdown .select2-search__field {
                        border: 1px solid #dee2e6;
                        border-radius: 0.375rem;
                    }
                    
                    .select2-results__option--highlighted {
                        background-color: var(--primary-color) !important;
                    }
                    
                    .select2-ledger-option {
                        padding: 2px 0;
                    }
                    
                    .modal .select2-container {
                        width: 100% !important;
                    }
                    
                    .select2-container--bootstrap-5 .select2-dropdown {
                        z-index: 1056;
                    }
                    
                    span.select2-selection.select2-selection--single {
                        height: 38px;
                        padding: 8px;
                    }
                    
                    /* Style for hidden quantity/UOM fields for services */
                    .service-na-cell {
                        text-align: center;
                        color: #6c757d;
                        font-style: italic;
                    }
                </style>
            `;

            $('#page-container').html(html);
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);

            if (!isPOBased) {
                this.addItemRow();
            } else {
                this.calculateTotals();
            }
        },

        renderPOItems: function () {
            if (!this.poData || !Array.isArray(this.poData.items)) return '';

            const taxRates = Array.isArray(this.taxRates) ? this.taxRates : [];
            const uoms = Array.isArray(this.uoms) ? this.uoms : [];

            return this.poData.items.map((item, index) => {
                const isService = item.item_type === 'service';
                return `
                    <tr data-item-index="${index}">
                        <td>${index + 1}</td>
                        <td>
                            ${item.item_type === 'product' ? 'Product' : 'Service'}
                            <input type="hidden" class="item-type" value="${item.item_type}">
                            <input type="hidden" class="po-item-id" value="${item.id}">
                        </td>
                        <td>
                            ${item.description || (item.product && item.product.name) || (item.service && item.service.name) || ''}
                            <input type="hidden" class="product-id" value="${item.product_id || ''}">
                            <input type="hidden" class="service-id" value="${item.service_id || ''}">
                        </td>
                        <td class="quantity-cell">
                            ${isService ? 
                                `<span class="service-na-cell">N/A</span>
                                 <input type="hidden" class="quantity" value="1">` :
                                `<input type="number" class="form-control form-control-sm quantity" 
                                        value="${item.quantity}" min="0.001" step="0.001" required>`
                            }
                        </td>
                        <td class="uom-cell">
                            ${isService ? 
                                `<span class="service-na-cell">N/A</span>
                                 <input type="hidden" class="uom-id" value="">` :
                                `<select class="form-select form-select-sm uom-select">
                                    <option value="">Select UOM</option>
                                    ${uoms.map(uom => `
                                        <option value="${uom.id}" ${item.uom_id == uom.id ? 'selected' : ''}>
                                            ${uom.name}
                                        </option>
                                    `).join('')}
                                </select>`
                            }
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm unit-price" 
                                   value="${item.unit_price}" min="0" step="0.01" required>
                        </td>
                        <td>
                            <select class="form-select form-select-sm tax-select">
                                <option value="0">No Tax</option>
                                ${taxRates.map(tax => `
                                    <option value="${tax.id}" data-percent="${tax.percent}"
                                        ${item.tax_id == tax.id ? 'selected' : ''}>
                                        ${tax.name} (${tax.percent}%)
                                    </option>
                                `).join('')}
                            </select>
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm discount" 
                                   value="${item.discount_amount || 0}" min="0" step="0.01">
                        </td>
                        <td class="text-end item-total">0.00</td>
                    </tr>
                `;
            }).join('');
        },

        addItemRow: function () {
            const index = $('#itemsTableBody tr').length;
            const taxRates = Array.isArray(this.taxRates) ? this.taxRates : [];
            const uoms = Array.isArray(this.uoms) ? this.uoms : [];

            const html = `
                <tr data-item-index="${index}">
                    <td>${index + 1}</td>
                    <td>
                        <select class="form-select form-select-sm item-type" required>
                            <option value="">Select</option>
                            <option value="product">Product</option>
                            <option value="service">Service</option>
                        </select>
                    </td>
                    <td>
                        <select class="form-select form-select-sm item-select" required disabled>
                            <option value="">Select item type first</option>
                        </select>
                    </td>
                    <td class="quantity-cell">
                        <input type="number" class="form-control form-control-sm quantity" 
                               value="1" min="0.001" step="0.001" required>
                    </td>
                    <td class="uom-cell">
                        <select class="form-select form-select-sm uom-select" required>
                            <option value="">Select UOM</option>
                            ${uoms.map(uom => `
                                <option value="${uom.id}">${uom.name}</option>
                            `).join('')}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm unit-price" 
                               placeholder="0.00" min="0" step="0.01" required>
                    </td>
                    <td>
                        <select class="form-select form-select-sm tax-select">
                            <option value="0">No Tax</option>
                            ${taxRates.map(tax => `
                                <option value="${tax.id}" data-percent="${tax.percent}">
                                    ${tax.name} (${tax.percent}%)
                                </option>
                            `).join('')}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm discount" 
                               value="0" min="0" step="0.01">
                    </td>
                    <td class="text-end item-total">0.00</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger" onclick="PurchaseInvoicesCreatePage.removeItemRow(this)">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;

            $('#itemsTableBody').append(html);
            const $newRow = $(`#itemsTableBody tr[data-item-index="${index}"]`);

            $newRow.find('.item-type').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select type...',
                width: '100%',
                minimumResultsForSearch: -1
            });

            $newRow.find('.item-select').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select item type first',
                width: '100%'
            });

            $newRow.find('.uom-select').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select UOM...',
                allowClear: true,
                width: '100%'
            });

            $newRow.find('.tax-select').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select tax...',
                allowClear: true,
                width: '100%'
            });
        },

        removeItemRow: function (button) {
            const $row = $(button).closest('tr');

            $row.find('.select2-hidden-accessible').each(function () {
                $(this).select2('destroy');
            });

            $row.remove();
            this.updateRowNumbers();
            this.calculateTotals();
        },

        updateRowNumbers: function () {
            $('#itemsTableBody tr').each(function (index) {
                $(this).find('td:first').text(index + 1);
                $(this).attr('data-item-index', index);
            });
        },

        bindEvents: function () {
            const self = this;

            // Item type change event - handle quantity and UOM field visibility
            $(document).on('select2:select', '.item-type', function (e) {
                const $row = $(this).closest('tr');
                const type = $(this).val();
                const $itemSelect = $row.find('.item-select');
                const $quantityCell = $row.find('.quantity-cell');
                const $uomCell = $row.find('.uom-cell');

                const products = Array.isArray(self.products) ? self.products : [];
                const services = Array.isArray(self.services) ? self.services : [];
                const uoms = Array.isArray(self.uoms) ? self.uoms : [];

                // Handle quantity and UOM field visibility
                if (type === 'service') {
                    // Hide quantity and UOM fields for services
                    $quantityCell.html(`
                        <span class="service-na-cell">N/A</span>
                        <input type="hidden" class="quantity" value="1">
                    `);
                    $uomCell.html(`
                        <span class="service-na-cell">N/A</span>
                        <input type="hidden" class="uom-id" value="">
                    `);
                } else if (type === 'product') {
                    // Show quantity and UOM fields for products
                    $quantityCell.html(`
                        <input type="number" class="form-control form-control-sm quantity" 
                               value="1" min="0.001" step="0.001" required>
                    `);
                    $uomCell.html(`
                        <select class="form-select form-select-sm uom-select" required>
                            <option value="">Select UOM</option>
                            ${uoms.map(uom => `
                                <option value="${uom.id}">${uom.name}</option>
                            `).join('')}
                        </select>
                    `);
                    // Initialize Select2 for the new UOM select
                    $uomCell.find('.uom-select').select2({
                        theme: 'bootstrap-5',
                        placeholder: 'Select UOM...',
                        allowClear: true,
                        width: '100%'
                    });
                } else {
                    // Default state when nothing selected
                    $quantityCell.html(`
                        <input type="number" class="form-control form-control-sm quantity" 
                               value="1" min="0.001" step="0.001" required>
                    `);
                    $uomCell.html(`
                        <select class="form-select form-select-sm uom-select" required>
                            <option value="">Select UOM</option>
                            ${uoms.map(uom => `
                                <option value="${uom.id}">${uom.name}</option>
                            `).join('')}
                        </select>
                    `);
                    $uomCell.find('.uom-select').select2({
                        theme: 'bootstrap-5',
                        placeholder: 'Select UOM...',
                        allowClear: true,
                        width: '100%'
                    });
                }

                // Destroy existing Select2 instance before updating options
                if ($itemSelect.hasClass('select2-hidden-accessible')) {
                    $itemSelect.select2('destroy');
                }

                if (type === 'product') {
                    if (products.length > 0) {
                        $itemSelect.html(`
                            <option value="">Select Product</option>
                            ${products.map(p => `
                                <option value="${p.id}" data-price="${p.unit_price || p.selling_price || 0}">
                                    ${p.name || ''}
                                </option>
                            `).join('')}
                        `).prop('disabled', false);
                    } else {
                        $itemSelect.html('<option value="">No products available</option>').prop('disabled', true);
                    }
                } else if (type === 'service') {
                    if (services.length > 0) {
                        $itemSelect.html(`
                            <option value="">Select Service</option>
                            ${services.map(s => `
                                <option value="${s.id}" data-price="${s.price || 0}">
                                    ${s.name || ''}
                                </option>
                            `).join('')}
                        `).prop('disabled', false);
                    } else {
                        $itemSelect.html('<option value="">No services available</option>').prop('disabled', true);
                    }
                } else {
                    $itemSelect.html('<option value="">Select item type first</option>').prop('disabled', true);
                }

                // Reinitialize Select2 for the updated item select
                $itemSelect.select2({
                    theme: 'bootstrap-5',
                    placeholder: type ? `Search ${type}...` : 'Select item type first',
                    allowClear: true,
                    width: '100%',
                    disabled: !type || (type === 'product' && products.length === 0) || (type === 'service' && services.length === 0)
                });

                // Recalculate totals
                self.calculateTotals();
            });

            // Item selection change
            $(document).on('select2:select', '.item-select', function (e) {
                const $row = $(this).closest('tr');
                const price = $(this).find('option:selected').data('price') || 0;
                $row.find('.unit-price').val(price);
                self.calculateTotals();
            });

            // For regular inputs and Select2 dropdowns
            $(document).on('input change select2:select select2:unselect', 
                '.quantity, .unit-price, .tax-select, .discount, #shipping_charges, #other_charges', 
                function () {
                    self.calculateTotals();
                }
            );

            // Form submission
            $('#createInvoiceForm').on('submit', function (e) {
                e.preventDefault();
                self.createInvoice();
            });
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            $('#itemsTableBody tr').each(function () {
                const $row = $(this);
                const quantity = parseFloat($row.find('.quantity').val()) || 1; // Default to 1 for services
                const unitPrice = parseFloat($row.find('.unit-price').val()) || 0;
                const taxPercent = parseFloat($row.find('.tax-select option:selected').data('percent')) || 0;
                const discount = parseFloat($row.find('.discount').val()) || 0;

                const itemSubtotal = quantity * unitPrice;
                const taxAmount = (itemSubtotal * taxPercent) / 100;
                const itemTotal = itemSubtotal + taxAmount - discount;

                $row.find('.item-total').text(itemTotal.toFixed(2));

                subtotal += itemSubtotal;
                totalTax += taxAmount;
                totalDiscount += discount;
            });

            const shippingCharges = parseFloat($('#shipping_charges').val()) || 0;
            const otherCharges = parseFloat($('#other_charges').val()) || 0;
            const grandTotal = subtotal + totalTax - totalDiscount + shippingCharges + otherCharges;

            $('#subtotal').text(subtotal.toFixed(2));
            $('#totalTax').text(totalTax.toFixed(2));
            $('#totalDiscount').text(totalDiscount.toFixed(2));
            $('#grandTotal').text(grandTotal.toFixed(2));
        },

        createInvoice: function () {
            const self = this;

            // Prepare items data
            const items = [];
            let hasError = false;
            const supplierId = $('#supplier_id').val() || $('input[name="supplier_id"]').val();
            
            if (!supplierId) {
                TempleCore.showToast('Please select a supplier', 'warning');
                return;
            }
            
            $('#itemsTableBody tr').each(function () {
                const $row = $(this);
                const itemType = $row.find('.item-type').val() || $row.find('input.item-type').val();

                if (!self.poId && !itemType) {
                    hasError = true;
                    return;
                }

                const item = {
                    item_type: itemType,
                    product_id: itemType === 'product' ? ($row.find('.product-id').val() || $row.find('.item-select').val()) : null,
                    service_id: itemType === 'service' ? ($row.find('.service-id').val() || $row.find('.item-select').val()) : null,
                    po_item_id: $row.find('.po-item-id').val() || null,
                    quantity: parseFloat($row.find('.quantity').val()) || 1, // Default to 1 for services
                    uom_id: itemType === 'product' ? ($row.find('.uom-select').val() || $row.find('.uom-id').val()) : null,
                    unit_price: parseFloat($row.find('.unit-price').val()),
                    tax_id: $row.find('.tax-select').val() || null,
                    tax_percent: parseFloat($row.find('.tax-select option:selected').data('percent')) || 0,
                    discount_amount: parseFloat($row.find('.discount').val()) || 0
                };

                items.push(item);
            });

            if (hasError || items.length === 0) {
                TempleCore.showToast('Please add at least one valid item', 'warning');
                return;
            }

            const invoiceData = {
                invoice_type: $('#invoice_type').val(),
                po_id: $('#po_id').val() || null,
                supplier_id: $('#supplier_id').val() || $('input[name="supplier_id"]').val(),
                supplier_invoice_no: $('#supplier_invoice_no').val(),
                invoice_date: $('#invoice_date').val(),
                payment_due_date: $('#payment_due_date').val(),
                status: $('#status').val(),
                shipping_charges: parseFloat($('#shipping_charges').val()) || 0,
                other_charges: parseFloat($('#other_charges').val()) || 0,
                terms_conditions: $('#terms_conditions').val(),
                notes: $('#notes').val(),
                items: items
            };

            console.log('Invoice Data being sent:', invoiceData);

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/invoices', invoiceData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Invoice created successfully', 'success');
                        TempleRouter.navigate(`purchase/invoice`);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create invoice', 'error');
                    }
                })
                .fail(function (xhr) {
                    console.error('Invoice creation error:', xhr);

                    if (xhr.responseJSON && xhr.responseJSON.errors) {
                        const errors = xhr.responseJSON.errors;
                        let errorMessage = 'Validation errors:\n';

                        for (const field in errors) {
                            errorMessage += `- ${field}: ${errors[field].join(', ')}\n`;
                        }

                        console.error('Validation errors:', errors);
                        TempleCore.showToast(errorMessage, 'error');
                    } else {
                        TempleCore.showToast('An error occurred while creating invoice', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);