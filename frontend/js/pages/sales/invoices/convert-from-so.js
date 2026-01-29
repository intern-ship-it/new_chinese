// js/pages/sales/invoices/convert-from-so.js
// Convert Sales Order to Invoice - Editable Form
(function ($, window) {
    'use strict';

    window.SalesInvoicesConvertFromSoPage = {
        soId: null,
        soData: null,
        customers: [],
        taxRates: [],
        packages: [],
        packagesData: [],
        salesItems: [],
        products: [],
        uoms: [],
        items: [],

        init: function (params) {
            console.log('=== SalesInvoicesConvertFromSoPage.init called ===');
            console.log('Params passed:', params);
            console.log('Current URL:', window.location.href);
            console.log('URL Search:', window.location.search);
            
            // Get SO ID from multiple sources (in order of priority)
            const urlParams = new URLSearchParams(window.location.search);
            const soIdFromUrl = urlParams.get('so_id');
            const soIdFromParams = params?.so_id;
            const soIdFromSession = sessionStorage.getItem('convert_so_id');
            
            console.log('SO ID from URL:', soIdFromUrl);
            console.log('SO ID from params:', soIdFromParams);
            console.log('SO ID from session:', soIdFromSession);
            
            // Try to get SO ID from any available source
            this.soId = soIdFromUrl || soIdFromParams || soIdFromSession;
            
            console.log('Final SO ID:', this.soId);

            if (!this.soId) {
                console.error('❌ No SO ID found!');
                console.error('Cannot proceed without Sales Order ID');
                TempleCore.showToast('Sales Order ID is required', 'error');
                setTimeout(() => {
                    TempleRouter.navigate('sales/orders');
                }, 1500);
                return;
            }

            // Store in sessionStorage for page refresh
            sessionStorage.setItem('convert_so_id', this.soId);
            console.log('✅ SO ID stored in session:', this.soId);
            console.log('Proceeding with data load...');

            // Initialize arrays
            this.customers = [];
            this.taxRates = [];
            this.packages = [];
            this.packagesData = [];
            this.salesItems = [];
            this.products = [];
            this.uoms = [];
            this.items = [];

            this.loadInitialData();
        },

        loadInitialData: function () {
            TempleCore.showLoading(true);

            const promises = [
                this.loadSOData(),
                this.loadCustomers(),
                this.loadTaxRates(),
                this.loadPackages(),
                this.loadSalesItems(),
                this.loadProducts(),
                this.loadUOMs()
            ];

            $.when.apply($, promises)
                .done(() => {
                    this.render();
                    this.bindEvents();
                    this.populateFromSO();
                    setTimeout(() => {
                        this.initializeSelect2();
                    }, 100);
                })
                .fail((error) => {
                    console.error('Failed to load data:', error);
                    TempleCore.showToast('Failed to load data. Please try again.', 'error');
                    setTimeout(() => {
                        TempleRouter.navigate('sales/orders');
                    }, 2000);
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },

        loadSOData: function () {
            const self = this;
            return TempleAPI.get(`/sales/orders/${this.soId}`)
                .done((response) => {
                    if (response && response.success) {
                        self.soData = response.data;
                        console.log('SO Data loaded:', self.soData);
                    } else {
                        throw new Error('Failed to load Sales Order data');
                    }
                })
                .fail((error) => {
                    console.error('Failed to load SO data:', error);
                    TempleCore.showToast('Sales Order not found', 'error');
                    throw error;
                });
        },

        loadCustomers: function () {
            const self = this;
            return TempleAPI.get('/sales/devotees/active')
                .done((response) => {
                    if (response && response.success) {
                        self.customers = Array.isArray(response.data) ? response.data : [];
                    }
                });
        },

        loadTaxRates: function () {
            const self = this;
            return TempleAPI.get('/masters/tax')
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && response.data.data) {
                            self.taxRates = Array.isArray(response.data.data) ? response.data.data : [];
                        } else if (Array.isArray(response.data)) {
                            self.taxRates = response.data;
                        }
                    }
                });
        },

        loadPackages: function () {
            const self = this;
            return TempleAPI.get('/sales/packages', { is_active: 1 })
                .done((response) => {
                    if (response && response.success) {
                        if (response.data && response.data.data) {
                            self.packages = response.data.data;
                            self.packagesData = response.data.data;
                        } else if (Array.isArray(response.data)) {
                            self.packages = response.data;
                            self.packagesData = response.data;
                        }
                    }
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
                        }
                    }
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
                        }
                    }
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
                        }
                    }
                });
        },

        render: function () {
            console.log('Rendering page...');
            
            const soNumber = this.soData?.so_number || '';
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <h3>Create Invoice from Sales Order</h3>
                            <p class="text-muted">Converting SO: <strong>${soNumber}</strong></p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button type="button" class="btn btn-secondary" id="cancelBtn">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                            <button type="button" class="btn btn-primary" id="createInvoiceBtn">
                                <i class="bi bi-check-circle"></i> Create Invoice
                            </button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <form id="invoiceForm">
                                <!-- Basic Information -->
                                <div class="row mb-3">
                                    <div class="col-md-3">
                                        <label class="form-label required">Customer</label>
                                        <select class="form-select" id="customer_id" required disabled>
                                            <option value="">Select Customer</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label required">Invoice Date</label>
                                        <input type="date" class="form-control" id="invoice_date" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Payment Due Date</label>
                                        <input type="date" class="form-control" id="payment_due_date">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="status">
                                            <option value="DRAFT">Draft</option>
                                            <option value="POSTED">Posted</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Customer Invoice No</label>
                                        <input type="text" class="form-control" id="customer_invoice_no">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">SO Reference</label>
                                        <input type="text" class="form-control" id="so_reference" readonly>
                                    </div>
                                </div>

                                <!-- Items Section -->
                                <h5 class="mt-4 mb-3">Invoice Items</h5>
                                
                                <!-- Packages Table -->
                                <div class="mb-4">
                                    <h6 class="text-muted">Packages</h6>
                                    <div class="table-responsive">
                                        <table class="table table-bordered">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Description</th>
                                                    <th>Qty</th>
                                                    <th>Amount</th>
                                                    <th>Discount</th>
                                                    <th>Tax</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody id="packagesTableBody">
                                                <tr class="no-items">
                                                    <td colspan="7" class="text-center text-muted">No packages</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Addons Table -->
                                <div class="mb-4">
                                    <h6 class="text-muted">Add-ons</h6>
                                    <div class="table-responsive">
                                        <table class="table table-bordered">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Description</th>
                                                    <th>Type</th>
                                                    <th>Qty</th>
                                                    <th>Price</th>
                                                    <th>Tax</th>
                                                    <th>Discount</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody id="addonsTableBody">
                                                <tr class="no-items">
                                                    <td colspan="7" class="text-center text-muted">No add-ons</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Additional Charges -->
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Shipping Charges</label>
                                        <input type="number" class="form-control" id="shipping_charges" 
                                               step="0.01" min="0" value="0">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Other Charges</label>
                                        <input type="number" class="form-control" id="other_charges" 
                                               step="0.01" min="0" value="0">
                                    </div>
                                </div>

                                <!-- Terms & Notes -->
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Terms & Conditions</label>
                                        <textarea class="form-control" id="terms_conditions" rows="3"></textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Internal Notes</label>
                                        <textarea class="form-control" id="notes" rows="3"></textarea>
                                    </div>
                                </div>

                                <!-- Totals Summary -->
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-8"></div>
                                            <div class="col-md-4">
                                                <table class="table table-sm table-borderless">
                                                    <tr>
                                                        <td class="text-end"><strong>Subtotal:</strong></td>
                                                        <td class="text-end" id="subtotal">0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="text-end"><strong>Tax:</strong></td>
                                                        <td class="text-end" id="totalTax">0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="text-end"><strong>Discount:</strong></td>
                                                        <td class="text-end text-danger" id="totalDiscount">0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="text-end"><strong>Shipping:</strong></td>
                                                        <td class="text-end" id="shippingDisplay">0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="text-end"><strong>Other Charges:</strong></td>
                                                        <td class="text-end" id="otherDisplay">0.00</td>
                                                    </tr>
                                                    <tr class="border-top">
                                                        <td class="text-end"><h5>Grand Total:</h5></td>
                                                        <td class="text-end"><h5 id="grandTotal">0.00</h5></td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            console.log('Setting HTML to #page-container...');
            $('#page-container').html(html);
            console.log('HTML set successfully. Content length:', html.length);
        },

        initializeSelect2: function () {
            console.log('Initializing Select2...');
            
            // Populate customers FIRST
            const customerSelect = $('#customer_id');
            customerSelect.empty().append('<option value="">Select Customer</option>');
            
            this.customers.forEach(customer => {
                const option = new Option(
                    customer.customer_name || customer.english_name || customer.name,
                    customer.id,
                    false,
                    false
                );
                customerSelect.append(option);
            });
            
            // Set the value from SO data BEFORE initializing Select2
            if (this.soData && this.soData.devotee_id) {
                customerSelect.val(this.soData.devotee_id);
                console.log('Pre-selected customer:', this.soData.devotee_id);
            }
            
            // NOW initialize Select2
            customerSelect.select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Customer',
                allowClear: false,
                width: '100%',
                disabled: true  // Disable since we can't change customer from SO
            });
            
            console.log('Select2 initialized. Selected value:', customerSelect.val());
        },

        populateFromSO: function () {
            if (!this.soData) {
                console.error('No SO data to populate');
                return;
            }

            console.log('Populating form from SO data:', this.soData);

            // Set basic fields (customer is now set in initializeSelect2)
            $('#so_reference').val(this.soData.so_number);
            $('#customer_invoice_no').val(this.soData.so_number);
            
            // Set dates
            const today = new Date().toISOString().split('T')[0];
            $('#invoice_date').val(today);
            
            // Set payment due date (30 days from today by default)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            $('#payment_due_date').val(dueDate.toISOString().split('T')[0]);

            // Set default status
            $('#status').val('DRAFT');

            // Copy terms and notes from SO
            if (this.soData.terms_conditions) {
                $('#terms_conditions').val(this.soData.terms_conditions);
            }
            if (this.soData.internal_notes) {
                $('#notes').val(this.soData.internal_notes);
            }

            // Populate items
            this.items = [];
            
            if (this.soData.items && Array.isArray(this.soData.items)) {
                this.soData.items.forEach(soItem => {
                    const item = {
                        item_type: soItem.item_type || this.determineItemType(soItem),
                        type: soItem.item_type || this.determineItemType(soItem),
                        item_id: soItem.sales_package_id || soItem.product_id || soItem.sale_item_id || soItem.sales_item_id,
                        package_id: soItem.sales_package_id || null,
                        product_id: soItem.product_id || null,
                        sales_item_id: soItem.sale_item_id || soItem.sales_item_id || null,
                        description: soItem.description || '',
                        quantity: parseFloat(soItem.quantity) || 1,
                        uom_id: soItem.uom_id || null,
                        uom_name: soItem.uom?.abbreviation || soItem.uom?.name || '',
                        unit_price: parseFloat(soItem.unit_price) || 0,
                        tax_rate: parseFloat(soItem.tax_percent || soItem.tax_rate) || 0,
                        tax_amount: parseFloat(soItem.tax_amount) || 0,
                        discount_amount: parseFloat(soItem.discount_amount) || 0,
                        is_addon: soItem.is_addon || false,
                        total: parseFloat(soItem.total_amount) || 0,
                        type_display: this.getTypeDisplay(soItem)
                    };

                    this.items.push(item);
                });
            }

            this.renderItems();
        },

        determineItemType: function (soItem) {
            if (soItem.sales_package_id) return 'package';
            if (soItem.product_id) return 'product';
            if (soItem.sale_item_id || soItem.sales_item_id) return 'sales_item';
            return 'package'; // default
        },

        getTypeDisplay: function (soItem) {
            if (soItem.sales_package_id || soItem.item_type === 'package') return 'Package';
            if (soItem.product_id || soItem.item_type === 'product') return 'Product';
            if (soItem.sale_item_id || soItem.sales_item_id || soItem.item_type === 'sales_item') return 'Sales Item';
            return 'Item';
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
                        </tr>
                    `;
                    $addonBody.append(row);
                    hasAddons = true;
                } else {
                    const row = `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td>${(item.unit_price * item.quantity).toFixed(2)}</td>
                            <td>${item.discount_amount.toFixed(2)}</td>
                            <td>${item.tax_amount.toFixed(2)}</td>
                            <td>${item.total.toFixed(2)}</td>
                        </tr>
                    `;
                    $pkgBody.append(row);
                    hasPackages = true;
                }
            });

            if (!hasPackages) {
                $pkgBody.html('<tr class="no-items"><td colspan="7" class="text-center text-muted">No packages</td></tr>');
            }
            if (!hasAddons) {
                $addonBody.html('<tr class="no-items"><td colspan="7" class="text-center text-muted">No add-ons</td></tr>');
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

            $('#subtotal').text(subtotal.toFixed(2));
            $('#totalTax').text(totalTax.toFixed(2));
            $('#totalDiscount').text(totalDiscount.toFixed(2));
            $('#shippingDisplay').text(shipping.toFixed(2));
            $('#otherDisplay').text(other.toFixed(2));
            $('#grandTotal').text(grandTotal.toFixed(2));
        },

        bindEvents: function () {
            const self = this;

            // Recalculate when charges change
            $('#shipping_charges, #other_charges').on('input change', function () {
                self.calculateTotals();
            });

            // Create invoice button
            $('#createInvoiceBtn').off('click').on('click', function () {
                self.createInvoice();
            });

            // Cancel button
            $('#cancelBtn').off('click').on('click', function () {
                if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
                    // Clear the stored SO ID
                    sessionStorage.removeItem('convert_so_id');
                    TempleRouter.navigate('sales/orders');
                }
            });

            // Form submit
            $('#invoiceForm').off('submit').on('submit', function (e) {
                e.preventDefault();
                self.createInvoice();
            });
        },

        createInvoice: function () {
            const self = this;

            // Validate
            if (!$('#customer_id').val()) {
                TempleCore.showToast('Please select a customer', 'error');
                return;
            }

            if (!$('#invoice_date').val()) {
                TempleCore.showToast('Please enter invoice date', 'error');
                return;
            }

            if (this.items.length === 0) {
                TempleCore.showToast('No items to invoice', 'error');
                return;
            }

            // Prepare data
            const data = {
                invoice_type: 'SO_BASED',
                so_id: this.soId,
                devotee_id: $('#customer_id').val(),
                invoice_date: $('#invoice_date').val(),
                payment_due_date: $('#payment_due_date').val() || null,
                customer_invoice_no: $('#customer_invoice_no').val() || null,
                status: $('#status').val() || 'DRAFT',
                shipping_charges: parseFloat($('#shipping_charges').val()) || 0,
                other_charges: parseFloat($('#other_charges').val()) || 0,
                terms_conditions: $('#terms_conditions').val() || null,
                notes: $('#notes').val() || null,
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
                }))
            };

            console.log('Creating invoice with data:', data);

            TempleCore.showLoading(true);
            
            TempleAPI.post('/sales/invoices', data)
                .done(function (response) {
                    if (response.success) {
                        // Clear the stored SO ID
                        sessionStorage.removeItem('convert_so_id');
                        
                        TempleCore.showToast('Invoice created successfully!', 'success');
                        
                        // Ask if user wants to view the invoice
                        setTimeout(() => {
                            if (confirm('Invoice created successfully! Would you like to view it now?')) {
                                TempleRouter.navigate('sales/invoices/view', { id: response.data.id });
                            } else {
                                TempleRouter.navigate('sales/orders');
                            }
                        }, 500);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create invoice', 'error');
                    }
                })
                .fail(function (xhr) {
                    console.error('Invoice creation failed:', xhr);
                    const errorMsg = xhr.responseJSON?.message || 'Failed to create invoice';
                    TempleCore.showToast(errorMsg, 'error');
                    
                    // Show validation errors if any
                    if (xhr.responseJSON?.errors) {
                        console.error('Validation errors:', xhr.responseJSON.errors);
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        cleanup: function () {
            console.log('Cleaning up SalesInvoicesConvertFromSoPage...');
            
            // DO NOT clear sessionStorage here!
            // Reason: On page refresh, cleanup() runs BEFORE init()
            // This would clear the SO ID before the page can reload
            // SessionStorage is cleared only when:
            // 1. Invoice is successfully created
            // 2. User clicks Cancel button
            console.log('Keeping convert_so_id in sessionStorage (cleared on create/cancel)');
            
            // Remove event handlers
            $('#shipping_charges, #other_charges').off('input change');
            $('#createInvoiceBtn').off('click');
            $('#cancelBtn').off('click');
            $('#invoiceForm').off('submit');
            
            // Destroy select2
            if ($('#customer_id').data('select2')) {
                $('#customer_id').select2('destroy');
            }
        }
    };
})(jQuery, window);