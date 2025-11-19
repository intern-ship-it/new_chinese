// js/pages/purchase/invoices/edit.js  
// Edit Purchase Invoice with UOM and conditional fields

(function ($, window) {
    'use strict';

    window.PurchaseInvoicesEditPage = {
        invoiceId: null,
        invoiceData: null,
        suppliers: [],
        taxRates: [],
        products: [],
        services: [],
        uoms: [],
        isPosted: false,
        hasPayments: false,

        init: function (params) {
            this.invoiceId = params?.id || this.getInvoiceIdFromUrl();

            if (!this.invoiceId) {
                TempleCore.showToast('Invalid invoice ID', 'error');
                TempleRouter.navigate('purchase/invoices');
                return;
            }

            this.loadInitialData();
        },

        getInvoiceIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },

        loadInitialData: function () {
            TempleCore.showLoading(true);

            const promises = [
                this.loadInvoice(),
                this.loadSuppliers(),
                this.loadTaxRates(),
                this.loadProducts(),
                this.loadServices(),
                this.loadUOMs()
            ];

            $.when.apply($, promises)
                .done(() => {
                    this.render();
                    this.bindEvents();
                    this.populateForm();
                })
                .fail((error) => {
                    console.error('Failed to load data:', error);
                    TempleCore.showToast('Failed to load invoice data', 'error');
                    TempleRouter.navigate('purchase/invoices');
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },

        loadInvoice: function () {
            const self = this;
            return TempleAPI.get(`/purchase/invoices/${this.invoiceId}`)
                .done((response) => {
                    if (response && response.success) {
                        self.invoiceData = response.data;
                        self.isPosted = self.invoiceData.status === 'POSTED';
                        self.hasPayments = parseFloat(self.invoiceData.paid_amount) > 0;
                        console.log('Loaded invoice:', self.invoiceData);
                    } else {
                        throw new Error('Invalid invoice data');
                    }
                })
                .fail((error) => {
                    console.error('Failed to load invoice:', error);
                    throw error;
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
                    }
                })
                .fail(() => {
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
                    }
                })
                .fail(() => {
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
                    }
                })
                .fail(() => {
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

        initializeDynamicSelect2: function() {
            const self = this;
            
            $('.item-select').not('.select2-hidden-accessible').each(function() {
                const $this = $(this);
                const $row = $this.closest('tr');
                const itemType = $row.find('.item-type').val();
                
                $this.select2({
                    theme: 'bootstrap-5',
                    placeholder: itemType ? `Search ${itemType}...` : 'Select item type first',
                    allowClear: true,
                    width: '100%'
                });
            });
            
            $('.uom-select').not('.select2-hidden-accessible').each(function() {
                $(this).select2({
                    theme: 'bootstrap-5',
                    placeholder: 'Select UOM...',
                    allowClear: true,
                    width: '100%'
                });
            });
            
            $('.tax-select').not('.select2-hidden-accessible').each(function() {
                $(this).select2({
                    theme: 'bootstrap-5',
                    placeholder: 'Select tax...',
                    allowClear: true,
                    width: '100%'
                });
            });
        },

        render: function () {
            if (!this.invoiceData) return;

            const isPOBased = this.invoiceData.invoice_type === 'PO_BASED';
            const isEditable = !this.isPosted;
            const canEditItems = isEditable && !isPOBased;
            const suppliers = Array.isArray(this.suppliers) ? this.suppliers : [];
            const taxRates = Array.isArray(this.taxRates) ? this.taxRates : [];
            const uoms = Array.isArray(this.uoms) ? this.uoms : [];

            const html = `
                <div class="container-fluid">
                    <div class="page-header mb-4">
                        <h1 class="page-title">Edit Purchase Invoice</h1>
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/invoices'); return false;">Purchase Invoices</a></li>
                                <li class="breadcrumb-item active">Edit #${this.invoiceData.invoice_number}</li>
                            </ol>
                        </nav>
                    </div>
                    
                    ${this.isPosted ? `
                    <div class="alert alert-info mb-3">
                        <i class="bi bi-info-circle"></i> This invoice is posted. Only limited fields can be edited.
                    </div>
                    ` : ''}
                    
                    ${this.hasPayments ? `
                    <div class="alert alert-warning mb-3">
                        <i class="bi bi-exclamation-triangle"></i> This invoice has payments. Some fields cannot be modified.
                    </div>
                    ` : ''}
                    
                    <form id="editInvoiceForm">
                        <div class="card mb-3">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0">Invoice Information</h5>
                                <div>
                                    <span class="badge bg-primary">Invoice #${this.invoiceData.invoice_number}</span>
                                    ${this.getPaymentStatusBadge(this.invoiceData.payment_status)}
                                    ${this.getStatusBadge(this.invoiceData.status)}
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="form-label">Invoice Type</label>
                                        <input type="text" class="form-control" value="${isPOBased ? 'PO Based' : 'Direct'}" readonly>
                                        <input type="hidden" id="invoice_type" value="${this.invoiceData.invoice_type}">
                                        ${isPOBased ? `<input type="hidden" id="po_id" value="${this.invoiceData.po_id}">` : ''}
                                    </div>
                                    
                                    ${isPOBased && this.invoiceData.po ? `
                                    <div class="col-md-3">
                                        <label class="form-label">PO Number</label>
                                        <input type="text" class="form-control" value="${this.invoiceData.po.po_number}" readonly>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Invoice Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="invoice_date" 
                                               value="${this.invoiceData.invoice_date}" 
                                               ${!isEditable ? 'readonly' : ''} required>
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Supplier Invoice No.</label>
                                        <input type="text" class="form-control" id="supplier_invoice_no" 
                                               value="${this.invoiceData.supplier_invoice_no || ''}"
                                               ${!isEditable ? 'readonly' : ''}>
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplier_id" required ${this.hasPayments ? 'disabled' : ''}>
                                            ${suppliers.map(s => `
                                                <option value="${s.id}" 
                                                    ${this.invoiceData.supplier_id === s.id ? 'selected' : ''}>
                                                    ${s.name}
                                                </option>
                                            `).join('')}
                                        </select>
                                        ${this.hasPayments ? `<input type="hidden" name="supplier_id" value="${this.invoiceData.supplier_id}">` : ''}
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Payment Due Date</label>
                                        <input type="date" class="form-control" id="payment_due_date" 
                                               value="${this.invoiceData.payment_due_date || ''}"
                                               ${!isEditable ? 'readonly' : ''}>
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="status" ${this.isPosted ? 'disabled' : ''}>
                                            <option value="DRAFT" ${this.invoiceData.status === 'DRAFT' ? 'selected' : ''}>Draft</option>
                                            <option value="POSTED" ${this.invoiceData.status === 'POSTED' ? 'selected' : ''}>Posted</option>
                                        </select>
                                        ${this.isPosted ? `<input type="hidden" name="status" value="${this.invoiceData.status}">` : ''}
                                    </div>
                                </div>
                                
                                ${this.hasPayments ? `
                                <div class="row mt-3">
                                    <div class="col-md-12">
                                        <div class="alert alert-light mb-0">
                                            <strong>Payment Information:</strong>
                                            Total: RM ${parseFloat(this.invoiceData.total_amount).toFixed(2)} | 
                                            Paid: RM ${parseFloat(this.invoiceData.paid_amount).toFixed(2)} | 
                                            Balance: RM ${parseFloat(this.invoiceData.balance_amount).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Items Section -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="card-title mb-0">Invoice Items</h5>
                                    ${canEditItems ? `
                                    <button type="button" class="btn btn-sm btn-primary" onclick="PurchaseInvoicesEditPage.addItemRow()">
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
                                                ${canEditItems ? '<th width="5%">Action</th>' : ''}
                                            </tr>
                                        </thead>
                                        <tbody id="itemsTableBody">
                                            <!-- Items will be populated here -->
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="${canEditItems ? 9 : 8}" class="text-end"><strong>Subtotal:</strong></td>
                                                <td class="text-end"><strong id="subtotal">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${canEditItems ? 9 : 8}" class="text-end"><strong>Total Tax:</strong></td>
                                                <td class="text-end"><strong id="totalTax">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${canEditItems ? 9 : 8}" class="text-end"><strong>Total Discount:</strong></td>
                                                <td class="text-end"><strong id="totalDiscount">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${canEditItems ? 9 : 8}" class="text-end">
                                                    <strong>Shipping Charges:</strong>
                                                </td>
                                                <td>
                                                    <input type="number" class="form-control form-control-sm" 
                                                           id="shipping_charges" min="0" step="0.01"
                                                           ${!isEditable ? 'readonly' : ''}>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="${canEditItems ? 9 : 8}" class="text-end">
                                                    <strong>Other Charges:</strong>
                                                </td>
                                                <td>
                                                    <input type="number" class="form-control form-control-sm" 
                                                           id="other_charges" min="0" step="0.01"
                                                           ${!isEditable ? 'readonly' : ''}>
                                                </td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td colspan="${canEditItems ? 9 : 8}" class="text-end">
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
                                        <textarea class="form-control" id="terms_conditions" rows="3" ${!isEditable ? 'readonly' : ''}></textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="notes" rows="3" ${!isEditable ? 'readonly' : ''}></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="d-flex justify-content-between">
                            <button type="button" class="btn btn-secondary" onclick="window.history.back()">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                            <div class="d-flex gap-2">
                                ${isEditable ? `
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-save"></i> Update Invoice
                                </button>
                                ` : ''}
                                
                                ${!this.isPosted || !this.hasPayments ? `
                                <button type="button" class="btn btn-success" onclick="PurchaseInvoicesEditPage.postInvoice()">
                                    <i class="bi bi-check-circle"></i> Post Invoice
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Custom CSS for Select2 and fields -->
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
                        height: 38px !important;
                        padding: 8px !important;
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
        },

        populateForm: function() {
            if (!this.invoiceData) return;
            
            $('#shipping_charges').val(this.invoiceData.shipping_charges || 0);
            $('#other_charges').val(this.invoiceData.other_charges || 0);
            $('#terms_conditions').val(this.invoiceData.terms_conditions || '');
            $('#notes').val(this.invoiceData.notes || '');
            
            this.renderItems();
            
            setTimeout(() => {
                this.initializeSelect2();
                this.initializeDynamicSelect2();
            }, 100);
            
            this.calculateTotals();
        },

        renderItems: function() {
            if (!this.invoiceData || !Array.isArray(this.invoiceData.items)) return;
            
            const canEditItems = !this.isPosted && this.invoiceData.invoice_type !== 'PO_BASED';
            const taxRates = Array.isArray(this.taxRates) ? this.taxRates : [];
            const uoms = Array.isArray(this.uoms) ? this.uoms : [];
            
            let html = '';
            this.invoiceData.items.forEach((item, index) => {
                const isService = item.item_type === 'service';
                
                if (canEditItems) {
                    // Editable row format
                    html += `
                        <tr data-item-index="${index}" data-item-id="${item.id}">
                            <td>${index + 1}</td>
                            <td>
                                <select class="form-select form-select-sm item-type" required>
                                    <option value="">Select type...</option>
                                    <option value="product" ${item.item_type === 'product' ? 'selected' : ''}>Product</option>
                                    <option value="service" ${item.item_type === 'service' ? 'selected' : ''}>Service</option>
                                </select>
                                ${item.po_item_id ? `<input type="hidden" class="po-item-id" value="${item.po_item_id}">` : ''}
                            </td>
                            <td>
                                <select class="form-select form-select-sm item-select" required>
                                    ${item.item_type === 'product' ? `
                                        <option value="${item.product_id}" selected>${item.product?.name || item.description || ''}</option>
                                    ` : item.item_type === 'service' ? `
                                        <option value="${item.service_id}" selected>${item.service?.name || item.description || ''}</option>
                                    ` : `
                                        <option value="">Select item type first</option>
                                    `}
                                </select>
                            </td>
                            <td class="quantity-cell">
                                ${isService ? 
                                    `<span class="service-na-cell">N/A</span>
                                     <input type="hidden" class="quantity" value="${item.quantity || 1}">` :
                                    `<input type="number" class="form-control form-control-sm quantity" 
                                            value="${item.quantity}" min="0.001" step="0.001" required>`
                                }
                            </td>
                            <td class="uom-cell">
                                ${isService ? 
                                    `<span class="service-na-cell">N/A</span>
                                     <input type="hidden" class="uom-id" value="">` :
                                    `<select class="form-select form-select-sm uom-select" required>
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
                            <td>
                                <button type="button" class="btn btn-sm btn-danger" onclick="PurchaseInvoicesEditPage.removeItemRow(this)">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                } else {
                    // Read-only row format
                    html += `
                        <tr data-item-index="${index}" data-item-id="${item.id}">
                            <td>${index + 1}</td>
                            <td>
                                ${item.item_type === 'product' ? 'Product' : 'Service'}
                                <input type="hidden" class="item-type" value="${item.item_type}">
                                ${item.po_item_id ? `<input type="hidden" class="po-item-id" value="${item.po_item_id}">` : ''}
                            </td>
                            <td>
                                ${item.description || (item.product && item.product.name) || (item.service && item.service.name) || ''}
                                <input type="hidden" class="product-id" value="${item.product_id || ''}">
                                <input type="hidden" class="service-id" value="${item.service_id || ''}">
                            </td>
                            <td class="quantity-cell">
                                ${isService ? 
                                    `<span class="service-na-cell">N/A</span>
                                     <input type="hidden" class="quantity" value="${item.quantity || 1}">` :
                                    `<input type="number" class="form-control form-control-sm quantity" 
                                            value="${item.quantity}" min="0.001" step="0.001" readonly required>`
                                }
                            </td>
                            <td class="uom-cell">
                                ${isService ? 
                                    `<span class="service-na-cell">N/A</span>
                                     <input type="hidden" class="uom-id" value="">` :
                                    `<select class="form-select form-select-sm uom-select" disabled>
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
                                       value="${item.unit_price}" min="0" step="0.01" readonly required>
                            </td>
                            <td>
                                <select class="form-select form-select-sm tax-select" disabled>
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
                                       value="${item.discount_amount || 0}" min="0" step="0.01" readonly>
                            </td>
                            <td class="text-end item-total">0.00</td>
                        </tr>
                    `;
                }
            });
            
            $('#itemsTableBody').html(html);
            
            if (canEditItems) {
                this.loadExistingItemsData();
            }
        },

        loadExistingItemsData: function() {
            const self = this;
            
            $('#itemsTableBody tr').each(function() {
                const $row = $(this);
                const $typeSelect = $row.find('.item-type');
                const $itemSelect = $row.find('.item-select');
                const itemType = $typeSelect.val();
                
                if (itemType) {
                    const items = itemType === 'product' ? self.products : self.services;
                    const currentValue = $itemSelect.find('option:selected').val();
                    const currentText = $itemSelect.find('option:selected').text();
                    
                    if (items && items.length > 0) {
                        let options = `<option value="">Select ${itemType === 'product' ? 'Product' : 'Service'}</option>`;
                        items.forEach(item => {
                            const selected = item.id == currentValue ? 'selected' : '';
                            const price = item.unit_price || item.selling_price || item.price || 0;
                            options += `
                                <option value="${item.id}" data-price="${price}" ${selected}>
                                    ${item.name || ''}
                                </option>
                            `;
                        });
                        $itemSelect.html(options);
                        
                        if (currentValue && !$itemSelect.find(`option[value="${currentValue}"]`).length) {
                            $itemSelect.prepend(`<option value="${currentValue}" selected>${currentText}</option>`);
                        }
                    }
                }
            });
        },

        addItemRow: function() {
            const index = $('#itemsTableBody tr').length;
            const taxRates = Array.isArray(this.taxRates) ? this.taxRates : [];
            const uoms = Array.isArray(this.uoms) ? this.uoms : [];
            
            const html = `
                <tr data-item-index="${index}">
                    <td>${index + 1}</td>
                    <td>
                        <select class="form-select form-select-sm item-type" required>
                            <option value="">Select type...</option>
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="PurchaseInvoicesEditPage.removeItemRow(this)">
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
            const itemId = $row.data('item-id');

            $row.find('.select2-hidden-accessible').each(function () {
                $(this).select2('destroy');
            });

            if (itemId) {
                $row.hide();
                $row.append(`<input type="hidden" class="deleted-item" value="${itemId}">`);
            } else {
                $row.remove();
            }

            this.updateRowNumbers();
            this.calculateTotals();
        },

        updateRowNumbers: function () {
            $('#itemsTableBody tr:visible').each(function (index) {
                $(this).find('td:first').text(index + 1);
            });
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            $('#itemsTableBody tr:visible').each(function () {
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

        bindEvents: function () {
            const self = this;

            // Item type change - handle quantity and UOM field visibility
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
                    $itemSelect.html(`
                        <option value="">Select Product</option>
                        ${products.map(p => `
                            <option value="${p.id}" data-price="${p.unit_price || p.selling_price || 0}">
                                ${p.name}
                            </option>
                        `).join('')}
                    `).prop('disabled', false);
                } else if (type === 'service') {
                    $itemSelect.html(`
                        <option value="">Select Service</option>
                        ${services.map(s => `
                            <option value="${s.id}" data-price="${s.price || 0}">
                                ${s.name}
                            </option>
                        `).join('')}
                    `).prop('disabled', false);
                } else {
                    $itemSelect.html('<option value="">Select item type first</option>').prop('disabled', true);
                }

                // Reinitialize Select2
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

            // Price and quantity changes
            $(document).on('input change select2:select select2:unselect',
                '.quantity, .unit-price, .tax-select, .discount, #shipping_charges, #other_charges',
                function () {
                    self.calculateTotals();
                }
            );

            // Form submission
            $('#editInvoiceForm').on('submit', function (e) {
                e.preventDefault();
                self.updateInvoice();
            });
        },

        updateInvoice: function () {
            const self = this;

            const items = [];
            const deletedItems = [];
            const supplierId = $('#supplier_id').val() || $('input[name="supplier_id"]').val();
            
            if (!supplierId) {
                TempleCore.showToast('Please select a supplier', 'warning');
                return;
            }

            $('.deleted-item').each(function () {
                deletedItems.push($(this).val());
            });

            $('#itemsTableBody tr:visible').each(function () {
                const $row = $(this);
                const itemId = $row.data('item-id');
                const itemType = $row.find('.item-type').val() || $row.find('input.item-type').val();

                const item = {
                    id: itemId || null,
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

            const invoiceData = {
                supplier_id: $('#supplier_id').val() || $('input[name="supplier_id"]').val(),
                supplier_invoice_no: $('#supplier_invoice_no').val(),
                invoice_date: $('#invoice_date').val(),
                payment_due_date: $('#payment_due_date').val(),
                status: $('#status').val() || $('input[name="status"]').val(),
                shipping_charges: parseFloat($('#shipping_charges').val()) || 0,
                other_charges: parseFloat($('#other_charges').val()) || 0,
                terms_conditions: $('#terms_conditions').val(),
                notes: $('#notes').val(),
                items: items,
                deleted_items: deletedItems
            };

            TempleCore.showLoading(true);

            TempleAPI.put(`/purchase/invoices/${this.invoiceId}`, invoiceData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Invoice updated successfully', 'success');
                        TempleRouter.navigate('purchase/invoice');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update invoice', 'error');
                    }
                })
                .fail(function (xhr) {
                    console.error('Invoice update error:', xhr);
                    if (xhr.responseJSON && xhr.responseJSON.errors) {
                        const errors = xhr.responseJSON.errors;
                        let errorMessage = 'Validation errors:\n';
                        for (const field in errors) {
                            errorMessage += `- ${errors[field].join(', ')}\n`;
                        }
                        TempleCore.showToast(errorMessage, 'error');
                    } else {
                        TempleCore.showToast('An error occurred while updating invoice', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        postInvoice: function () {
            const self = this;

            TempleCore.showConfirm(
                'Post Invoice',
                'Are you sure you want to post this invoice? This action cannot be undone.',
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post(`/purchase/invoices/${self.invoiceId}/post`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Invoice posted successfully', 'success');
                                self.loadInitialData();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to post invoice', 'error');
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('An error occurred while posting invoice', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'POSTED': '<span class="badge bg-primary">Posted</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>'
            };
            return badges[status] || status;
        },

        getPaymentStatusBadge: function (status) {
            const badges = {
                'UNPAID': '<span class="badge bg-danger">Unpaid</span>',
                'PARTIAL': '<span class="badge bg-warning">Partial Payment</span>',
                'PAID': '<span class="badge bg-success">Paid</span>'
            };
            return badges[status] || status;
        }
    };
})(jQuery, window);