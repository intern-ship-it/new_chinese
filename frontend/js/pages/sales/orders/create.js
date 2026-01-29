// js/pages/sales/orders/create.js
// Sales Order Create Page - FIXED VERSION
(function ($, window) {
    'use strict';

    window.SalesOrdersCreatePage = {
        items: [],
        editMode: false,
        orderId: null,
        packagesData: [], // Store full package data for calculations

        init: function (params) {
            this.editMode = params && params.id;
            this.orderId = params?.id;

            this.render();
            this.bindEvents();

            // Initialize Select2 first
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);

            // ✅ FIX: Load master data first, THEN load order data
            this.loadMasterData().then(() => {
                if (this.editMode) {
                    // Add small delay to ensure Select2 is fully initialized
                    setTimeout(() => {
                        this.loadOrderData();
                    }, 200);
                }
            });
        },

        render: function () {
            const title = this.editMode ? 'Edit Sales Order' : 'Create Sales Order';

            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>${title}</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="backBtn">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    
                    <form id="soForm">
                        <!-- Order Details -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Order Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">SO Number</label>
                                        <input type="text" class="form-control" value="Auto-generated" disabled>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">SO Date</label>
                                        <input type="date" class="form-control" id="soDate" 
                                               value="${moment().format('YYYY-MM-DD')}" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Customer (Devotee) <span class="text-danger">*</span></label>
                                        <select class="form-select" id="devoteeId" required>
                                            <option value="">Select Customer</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-md-4">
                                        <label class="form-label">Quotation Ref</label>
                                        <input type="text" class="form-control" id="quotationRef">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Delivery Date</label>
                                        <input type="date" class="form-control" id="deliveryDate" 
                                               min="${moment().format('YYYY-MM-DD')}">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Delivery Address</label>
                                        <input type="text" class="form-control" id="deliveryAddress">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Packages Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5>Packages</h5>
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
                        <div class="card mb-4">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5>Addons</h5>
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
                        <div class="card mb-4">
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
                                            <tr class="border-top mt-2">
                                                <td class="text-end pt-2"><h5>Total Amount:</h5></td>
                                                <td class="text-end pt-2"><h5 id="totalAmount">0.00</h5></td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Internal Notes -->
                         <div class="card mb-3">
                            <div class="card-body">
                                <label class="form-label">Internal Notes</label>
                                <textarea class="form-control" id="internalNotes" rows="2"></textarea>
                            </div>
                        </div>

                        <div class="row mt-3">
                            <div class="col-md-12 text-end">
                                <button type="button" class="btn btn-secondary" id="saveDraftBtn">Save as Draft</button>
                                <button type="submit" class="btn btn-primary ms-2">Submit</button>
                            </div>
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
                                        <select class="form-select" id="modalPackageSelect"></select>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Description</label>
                                        <input type="text" class="form-control" id="pkgDescription" placeholder="Enter description">
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Quantity</label>
                                        <input type="number" class="form-control" id="pkgQty" value="1" min="1">
                                    </div>
                                    <div class="col-md-12">
                                        <div class="row g-3" id="packageDetails">
                                            <div class="col-md-3">
                                                <label class="form-label">Price (Amount)</label>
                                                <input type="text" class="form-control" id="pkgPrice" value="0.00" readonly>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Discount</label>
                                                <input type="text" class="form-control" id="pkgDiscount" value="0.00" readonly>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Tax Amount</label>
                                                <input type="text" class="form-control" id="pkgTax" value="0.00" readonly>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Grand Total</label>
                                                <input type="text" class="form-control" id="pkgGrandTotal" value="0.00" readonly>
                                            </div>
                                        </div>
                                        <!-- Hidden fields for calculations -->
                                        <input type="hidden" id="pkgTaxRate" value="0">
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
                                        <select class="form-select" id="addonItem" disabled></select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Quantity</label>
                                        <input type="number" class="form-control" id="addonQty" value="1" min="1">
                                    </div>
                                    <div class="col-md-4" id="uomDiv" style="display:none;">
                                        <label class="form-label">UOM</label>
                                        <select class="form-select" id="addonUom"></select>
                                    </div>
                                     <div class="col-md-4">
                                        <label class="form-label">Unit Price</label>
                                        <input type="number" class="form-control" id="addonPrice">
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
            `;

            $('#page-container').html(html);
        },

        loadOrderData: function () {
            if (!this.orderId) return;

            TempleAPI.get(`/sales/orders/${this.orderId}`).done((response) => {
                if (response.success) {
                    const so = response.data;

                    // Populate Form
                    $('#soForm').find('input[value="Auto-generated"]').val(so.so_number);
                    $('#soDate').val(moment(so.so_date).format('YYYY-MM-DD'));
                    $('#quotationRef').val(so.quotation_ref);
                    $('#deliveryAddress').val(so.delivery_address);
                    $('#internalNotes').val(so.internal_notes);

                    if (so.delivery_date) {
                        $('#deliveryDate').val(moment(so.delivery_date).format('YYYY-MM-DD'));
                    }

                    // ✅ Set Devotee (options are now loaded)
                    if (so.devotee_id) {
                        console.log('Setting devotee_id:', so.devotee_id); // Debug log
                        $('#devoteeId').val(so.devotee_id).trigger('change');
                    }

                    // Populate Items
                    this.items = [];
                    if (so.items && so.items.length > 0) {
                        so.items.forEach(item => {
                            let newItem = {
                                sales_order_item_id: item.id,
                                is_addon: !!item.is_addon,
                                description: item.description,
                                quantity: parseFloat(item.quantity),
                                unit_price: parseFloat(item.unit_price),
                                tax_amount: parseFloat(item.tax_amount),
                                discount_amount: parseFloat(item.discount_amount),
                                total: parseFloat(item.total_amount),
                            };

                            if (newItem.is_addon) {
                                newItem.type = item.item_type || (item.product_id ? 'product' : 'sales_item');
                                newItem.item_id = item.product_id || item.sale_item_id;
                                newItem.type_display = newItem.type === 'product' ? 'Product (Addon)' : 'Sales Item (Addon)';
                                newItem.uom_id = item.uom_id;
                                newItem.uom_name = item.uom ? item.uom.name : '';
                            } else {
                                newItem.package_id = item.sales_package_id;
                                newItem.type_display = 'Package';
                            }

                            this.items.push(newItem);
                        });
                        this.renderItems();
                    }
                }
            }).fail(() => {
                TempleCore.showToast('Failed to load order details', 'error');
            });
        },

        initializeSelect2: function () {
            $('#devoteeId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search Devotee...',
                width: '100%'
            });
            $('#modalPackageSelect').select2({
                theme: 'bootstrap-5',
                dropdownParent: $('#packageModal'),
                width: '100%'
            });
            $('#addonItem').select2({
                theme: 'bootstrap-5',
                dropdownParent: $('#addonModal'),
                width: '100%'
            });
        },

        // ✅ FIXED: Return a promise so we can chain it
        loadMasterData: function () {
            // Load Active Devotees
            return TempleAPI.get('/sales/devotees/active').done((response) => {
                let options = '<option value="">Select Customer</option>';
                if (response.success) {
                    response.data.forEach(d => {
                        options += `<option value="${d.id}">${d.customer_name} (${d.mobile})</option>`;
                    });
                }
                $('#devoteeId').html(options);
                console.log('Devotees loaded:', response.data ? response.data.length : 0); // Debug log
            });
        },

        bindEvents: function () {
            const self = this;

            $('#backBtn').on('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    TempleRouter.navigate('sales/orders');
                }
            });

            // Package Modal Events
            $('#addPackageBtn').on('click', (e) => {
                e.preventDefault();

                // Reset form fields
                $('#modalPackageSelect').val('').trigger('change');
                $('#pkgDescription').val('');
                $('#pkgQty').val('1');
                $('#pkgPrice').val('0.00');
                $('#pkgTax').val('0.00');
                $('#pkgDiscount').val('0.00');
                $('#pkgGrandTotal').val('0.00');
                $('#pkgTaxRate').val('0');

                self.loadPackages();
                $('#packageModal').modal('show');
            });

            // When package is selected, calculate and display proper values
            $('#modalPackageSelect').on('change', function () {
                const pkgId = $(this).val();
                if (pkgId) {
                    // Find the full package data
                    const pkg = self.packagesData.find(p => p.id == pkgId);
                    if (pkg) {
                        const totalAmount = parseFloat(pkg.total_amount) || 0;  // Base price
                        const taxRate = parseFloat(pkg.tax_rate) || 0;          // Tax percentage
                        const discount = parseFloat(pkg.discount) || 0;         // Discount amount

                        // Calculate using the same formula as SalesPackage model:
                        // subtotalAfter = total_amount - discount
                        // taxAmount = subtotalAfter * (tax_rate / 100)
                        // grandTotal = subtotalAfter + taxAmount
                        const subtotalAfter = totalAmount - discount;
                        const taxAmount = subtotalAfter * (taxRate / 100);
                        const grandTotal = subtotalAfter + taxAmount;

                        // Display calculated values
                        $('#pkgPrice').val(totalAmount.toFixed(2));
                        $('#pkgDiscount').val(discount.toFixed(2));
                        $('#pkgTax').val(taxAmount.toFixed(2));           // FIXED: Now shows calculated tax AMOUNT
                        $('#pkgGrandTotal').val(grandTotal.toFixed(2));
                        $('#pkgTaxRate').val(taxRate);                    // Store tax rate for reference
                    }
                } else {
                    $('#pkgPrice').val('0.00');
                    $('#pkgTax').val('0.00');
                    $('#pkgDiscount').val('0.00');
                    $('#pkgGrandTotal').val('0.00');
                    $('#pkgTaxRate').val('0');
                    $('#pkgDescription').val('');
                }
            });

            // Recalculate when quantity changes
            $('#pkgQty').on('change input', function () {
                const pkgId = $('#modalPackageSelect').val();
                if (pkgId) {
                    const pkg = self.packagesData.find(p => p.id == pkgId);
                    if (pkg) {
                        const qty = parseFloat($(this).val()) || 1;
                        const totalAmount = parseFloat(pkg.total_amount) || 0;
                        const taxRate = parseFloat(pkg.tax_rate) || 0;
                        const discount = parseFloat(pkg.discount) || 0;

                        // Calculate per unit first
                        const subtotalAfter = totalAmount - discount;
                        const taxAmount = subtotalAfter * (taxRate / 100);
                        const grandTotal = subtotalAfter + taxAmount;

                        // Display per-unit values (not multiplied by quantity)
                        // The multiplication happens when saving
                        $('#pkgPrice').val(totalAmount.toFixed(2));
                        $('#pkgDiscount').val(discount.toFixed(2));
                        $('#pkgTax').val(taxAmount.toFixed(2));
                        $('#pkgGrandTotal').val((grandTotal * qty).toFixed(2)); // Only grand total shows qty effect
                    }
                }
            });

            $('#savePackageBtn').on('click', () => {
                const pkgId = $('#modalPackageSelect').val();
                if (!pkgId) {
                    TempleCore.showToast('Please select a package', 'error');
                    return;
                }

                const $opt = $('#modalPackageSelect').find(':selected');
                const qty = parseFloat($('#pkgQty').val()) || 1;
                const desc = $('#pkgDescription').val() || $opt.text().trim();

                // Read calculated values from inputs (per unit values)
                const price = parseFloat($('#pkgPrice').val()) || 0;         // total_amount (base price)
                const taxAmount = parseFloat($('#pkgTax').val()) || 0;       // Calculated tax amount per unit
                const discount = parseFloat($('#pkgDiscount').val()) || 0;   // Discount per unit

                // Create package item
                const pkg = {
                    is_addon: false,
                    package_id: pkgId,
                    description: desc,
                    unit_price: price,              // Base price per unit
                    quantity: qty,
                    type_display: 'Package'
                };

                // Calculate total line amounts (multiply by quantity)
                pkg.tax_amount = taxAmount * qty;
                pkg.discount_amount = discount * qty;

                // Calculate line total: (unit_price * qty) + tax_amount - discount_amount
                // But since tax is calculated on (price - discount), we use grand_total formula:
                // total = (price - discount) * qty + tax_amount_total
                const subtotalAfterPerUnit = price - discount;
                pkg.total = (subtotalAfterPerUnit * qty) + pkg.tax_amount;

                self.addItem(pkg);
                $('#packageModal').modal('hide');
            });

            // Addon Modal Events
            $('#addAddonBtn').on('click', (e) => {
                e.preventDefault();
                $('#addonType').val('').trigger('change');
                $('#addonItem').html('').prop('disabled', true);
                $('#addonUom').html('');
                $('#uomDiv').hide();
                $('#addonQty').val(1);
                $('#addonPrice').val('');
                $('#addonModal').modal('show');
            });

            $('#addonType').on('change', function () {
                const type = $(this).val();
                $('#addonItem').html('<option value="">Loading...</option>').prop('disabled', true);

                if (type === 'product') {
                    $('#uomDiv').show();
                    self.loadProducts();
                } else if (type === 'sales_item') {
                    $('#uomDiv').hide();
                    self.loadSalesItems();
                } else {
                    $('#addonItem').html('').prop('disabled', true);
                    $('#uomDiv').hide();
                }
            });

            $('#addonItem').on('change', function () {
                const $opt = $(this).find(':selected');
                if ($opt.val()) {
                    $('#addonPrice').val($opt.data('price'));
                    if ($('#addonType').val() === 'product') {
                        self.loadUoms($opt.data('id'));
                    }
                }
            });

            $('#saveAddonBtn').on('click', () => {
                const type = $('#addonType').val();
                const itemId = $('#addonItem').val();
                if (!type || !itemId) return;

                const price = parseFloat($('#addonPrice').val()) || 0;
                const qty = parseFloat($('#addonQty').val()) || 1;
                const total = price * qty;

                const item = {
                    is_addon: true,
                    type: type,
                    item_id: itemId,
                    description: $('#addonItem option:selected').text(),
                    quantity: qty,
                    unit_price: price,
                    tax_amount: 0,
                    discount_amount: 0,
                    total: total,
                    type_display: type === 'product' ? 'Product (Addon)' : 'Sales Item (Addon)',
                    uom_id: type === 'product' ? $('#addonUom').val() : null
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

            // Form Submit
            $('#soForm').on('submit', (e) => {
                e.preventDefault();
                self.saveOrder();
            });
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

            let subtotal = 0, totalTax = 0, totalDiscount = 0;
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
                    // For packages: show tax, amount (price), discount, total
                    const row = `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.description}</td>
                         <td>${item.quantity}</td>
<td>${item.unit_price.toFixed(2)}</td>
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

                // Calculate totals
                // For packages: subtotal is the base price before discount
                // For addons: subtotal is unit_price * quantity
                subtotal += (item.unit_price * item.quantity);
                totalTax += item.tax_amount;
                totalDiscount += item.discount_amount;
            });

            if (!hasPackages) {
                $pkgBody.html('<tr class="no-items"><td colspan="8" class="text-center text-muted">No packages added</td></tr>');
            }
            if (!hasAddons) {
                $addonBody.html('<tr class="no-items"><td colspan="8" class="text-center text-muted">No addons added</td></tr>');
            }

            $('#subtotal').text(subtotal.toFixed(2));
            $('#totalTax').text(totalTax.toFixed(2));
            $('#totalDiscount').text(totalDiscount.toFixed(2));

            // Total Amount = Subtotal + Tax - Discount
            const totalAmount = subtotal + totalTax - totalDiscount;
            $('#totalAmount').text(totalAmount.toFixed(2));
        },

        loadPackages: function () {
            const self = this;
            TempleAPI.get('/sales/packages', { is_active: 1 }).done(res => {
                let opts = '<option value="">Select Package</option>';
                if (res.success && res.data && res.data.data) {
                    // Store full package data for calculations
                    self.packagesData = res.data.data;

                    res.data.data.forEach(p => {
                        opts += `<option value="${p.id}">
                             ${p.package_name} (${p.package_number})
                        </option>`;
                    });
                }
                $('#modalPackageSelect').html(opts);
            });
        },

        loadProducts: function () {
            TempleAPI.get('/inventory/products', { is_active: 1 }).done(res => {
                let opts = '<option value="">Select Product</option>';
                const items = res.data.data || res.data || [];
                items.forEach(p => {
                    opts += `<option value="${p.id}" data-price="${p.unit_price}" data-id="${p.id}">${p.name}</option>`;
                });
                $('#addonItem').html(opts).prop('disabled', false);
            });
        },

        loadSalesItems: function () {
            TempleAPI.get('/sales/items/active').done(res => {
                let opts = '<option value="">Select Sales Item</option>';
                const items = res.data || [];
                items.forEach(p => {
                    opts += `<option value="${p.id}" data-price="${p.price}" data-id="${p.id}">${p.name_primary}</option>`;
                });
                $('#addonItem').html(opts).prop('disabled', false);
            });
        },

        loadUoms: function (productId) {
            TempleAPI.get(`/inventory/products/${productId}/uom-family`).done(res => {
                let opts = '';
                const uoms = (res.data && res.data.uom_family) ? res.data.uom_family : [];

                if (Array.isArray(uoms)) {
                    uoms.forEach(u => {
                        opts += `<option value="${u.id}">${u.name}</option>`;
                    });
                }
                $('#addonUom').html(opts);
            });
        },

        saveOrder: function () {
            const devoteeId = $('#devoteeId').val();
            if (!devoteeId) {
                TempleCore.showToast('Please select a customer', 'error');
                return;
            }
            if (this.items.length === 0) {
                TempleCore.showToast('Please add items to the order', 'error');
                return;
            }

            const payload = {
                devotee_id: devoteeId,
                quotation_ref: $('#quotationRef').val(),
                delivery_date: $('#deliveryDate').val(),
                delivery_address: $('#deliveryAddress').val(),
                internal_notes: $('#internalNotes').val(),
                items: this.items
            };

            const url = this.editMode ? `/sales/orders/${this.orderId}` : '/sales/orders';
            const method = this.editMode ? 'PUT' : 'POST';

            TempleAPI.request({
                endpoint: url,
                method: method,
                data: payload
            })
                .done((response) => {
                    if (response.success) {
                        TempleCore.showToast(response.message, 'success');

                        // ✅ If invoice was created, show the invoice info
                        if (response.invoice) {
                            TempleCore.showToast(
                                `Invoice ${response.invoice.invoice_number} created successfully!`,
                                'success'
                            );

                            // Option: Navigate to invoice view
                            // TempleRouter.navigate(`sales/invoices/view/${response.invoice.id}`);
                        }

                        setTimeout(() => {
                            if (window.SalesOrdersListPage) {
                                TempleRouter.navigate('sales/orders');
                            } else {
                                window.history.back();
                            }
                        }, 1500);
                    }
                })

                .fail((xhr) => {
                    TempleCore.showToast(xhr.responseJSON?.message || 'Failed to save order', 'error');
                });
        }
    };
})(jQuery, window);