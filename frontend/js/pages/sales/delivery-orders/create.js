// js/pages/sales/delivery-order/create.js
// Create Standalone Delivery Order - WITH PACKAGE ITEMS DISPLAY
// Shows package items in expandable card format (similar to create-from-SO page)

(function ($, window) {
    'use strict';

    window.SalesDeliveryOrdersCreatePage = {
        devotees: [],
        warehouses: [],
        packages: [],
        selectedPackages: [], // Array of { packageData, quantity, items[] }
        stockData: {},

        init: function () {
            console.log('SalesDeliveryOrdersCreatePage: Initializing standalone DO creation...');
            
            // CRITICAL: Hide any stuck loading overlays on init
            this.hideLoadingSafe();
            
            this.selectedPackages = [];
            this.stockData = {};
            this.render();
            this.loadDropdownData();
            this.bindEvents();
            
            // Initialize Select2 after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);
        },

        hideLoadingSafe: function() {
            try {
                if (typeof TempleCore !== 'undefined' && TempleCore.hideLoading) {
                    TempleCore.hideLoading();
                }
                $('.loading-overlay, .modal-backdrop, #loading-overlay, .spinner-overlay').remove();
                $('body').removeClass('loading modal-open');
            } catch (e) {
                console.error('Error hiding loading:', e);
            }
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3><i class="bi bi-truck"></i> Create Delivery Order</h3>
                            <p class="text-muted">Standalone delivery order with packages only</p>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="backBtn">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-12">
                            <div class="card">
                                <div class="card-body">
                                    <form id="createDOForm">
                                        <!-- DO Details Section -->
                                        <div class="row mb-4">
                                            <div class="col-md-12">
                                                <h5 class="border-bottom pb-2">Delivery Order Details</h5>
                                            </div>
                                        </div>

                                        <div class="row mb-3">
                                            <div class="col-md-3">
                                                <label class="form-label">DO Number</label>
                                                <input type="text" class="form-control" value="Auto-generated" readonly>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">DO Date *</label>
                                                <input type="date" class="form-control" id="doDate" 
                                                       value="${new Date().toISOString().split('T')[0]}" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Delivery Order No</label>
                                                <input type="text" class="form-control" id="deliveryOrderNo">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Delivery Date</label>
                                                <input type="date" class="form-control" id="deliveryDate">
                                            </div>
                                        </div>

                                        <div class="row mb-3">
                                            <div class="col-md-4">
                                                <label class="form-label">Customer (Devotee) <span class="text-danger">*</span></label>
                                                <select class="form-select" id="devoteeId" required>
                                                    <option value="">Select Customer</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Warehouse *</label>
                                                <select class="form-select" id="warehouseId" required>
                                                    <option value="">Select Warehouse...</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Vehicle Number</label>
                                                <input type="text" class="form-control" id="vehicleNumber">
                                            </div>
                                        </div>

                                        <!-- Packages Section -->
                                        <div class="row mb-3 mt-4">
                                            <div class="col-md-12">
                                                <h5 class="border-bottom pb-2">
                                                    Packages
                                                    <small class="text-muted">(Select items within packages to deliver)</small>
                                                    <button type="button" class="btn btn-sm btn-primary float-end" id="addPackageBtn">
                                                        <i class="bi bi-plus-circle"></i> Add Package
                                                    </button>
                                                </h5>
                                            </div>
                                        </div>

                                        <!-- Packages Container - Expandable Cards -->
                                        <div id="packagesContainer">
                                            <div class="alert alert-secondary text-center">
                                                No packages added yet. Click "Add Package" to begin.
                                            </div>
                                        </div>

                                        <!-- Totals Section -->
                                        <div class="row mt-4">
                                            <div class="col-md-8"></div>
                                            <div class="col-md-4">
                                                <table class="table table-sm">
                                                    <tr>
                                                        <th>Subtotal:</th>
                                                        <td class="text-end" id="subtotal">0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <th>Tax:</th>
                                                        <td class="text-end" id="totalTax">0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <th>Discount:</th>
                                                        <td class="text-end" id="totalDiscount">0.00</td>
                                                    </tr>
                                                    <tr class="table-primary">
                                                        <th>Total Amount:</th>
                                                        <th class="text-end" id="grandTotal">0.00</th>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>

                                        <!-- Notes Section -->
                                        <div class="row mb-3">
                                            <div class="col-md-12">
                                                <label class="form-label">Notes</label>
                                                <textarea class="form-control" id="notes" rows="3"></textarea>
                                            </div>
                                        </div>

                                        <!-- Action Buttons -->
                                        <div class="row mt-4">
                                            <div class="col-md-12 text-end">
                                                <button type="button" class="btn btn-secondary me-2" id="cancelBtn">Cancel</button>
                                                <button type="submit" class="btn btn-primary" id="saveDraftBtn">
                                                    <i class="bi bi-save"></i> Save as Draft
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add Package Modal -->
                <div class="modal fade" id="packageModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Package</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-8">
                                        <label class="form-label">Select Package <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalPackageSelect"></select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="pkgQty" value="1" min="1">
                                    </div>
                                </div>
                                
                                <!-- Package Preview -->
                                <div id="packagePreview" class="mt-3" style="display: none;">
                                    <hr>
                                    <h6>Package Items Preview</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm table-bordered">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Item Name</th>
                                                    <th>Type</th>
                                                    <th>Qty/Package</th>
                                                    <th>Total Qty</th>
                                                    <th>Unit Price</th>
                                                </tr>
                                            </thead>
                                            <tbody id="packagePreviewBody"></tbody>
                                        </table>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-md-6">
                                            <strong>Package Price:</strong> <span id="previewPackagePrice">RM 0.00</span>
                                        </div>
                                        <div class="col-md-6 text-end">
                                            <strong>Total:</strong> <span id="previewTotal">RM 0.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePackageBtn">
                                    <i class="bi bi-plus-circle"></i> Add Package
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
        },

        initializeSelect2: function () {
            $('#devoteeId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search Devotee...',
                width: '100%',
                allowClear: true
            });

            $('#modalPackageSelect').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select Package...',
                dropdownParent: $('#packageModal'),
                width: '100%',
                allowClear: true
            });
        },

        bindEvents: function () {
            const self = this;

            // Back/Cancel buttons
            $(document).on('click', '#backBtn, #cancelBtn', function () {
                window.history.back();
            });

            // Warehouse change - check stock
            $(document).on('change', '#warehouseId', function () {
                self.checkStock();
            });

            // Add Package button
            $(document).on('click', '#addPackageBtn', function (e) {
                e.preventDefault();
                self.resetPackageModal();
                self.loadPackagesForModal();
                $('#packageModal').modal('show');
            });

            // Package selection change - show preview
            $('#modalPackageSelect').on('change', function () {
                self.showPackagePreview();
            });

            // Quantity change - update preview
            $('#pkgQty').on('input', function () {
                self.updatePackagePreview();
            });

            // Save Package button
            $('#savePackageBtn').on('click', function () {
                self.addSelectedPackage();
            });

            // Select all items in package
            $(document).on('change', '.select-all-package-items', function () {
                const pkgIndex = $(this).data('pkg-index');
                const isChecked = $(this).prop('checked');
                $(`.package-item-checkbox[data-pkg-index="${pkgIndex}"]:not(:disabled)`)
                    .prop('checked', isChecked)
                    .trigger('change');
            });

            // Item checkbox change
            $(document).on('change', '.package-item-checkbox', function () {
                const $checkbox = $(this);
                const isChecked = $checkbox.prop('checked');
                const uniqueId = $checkbox.data('unique-id');
                const $qtyInput = $(`#deliver-qty-${uniqueId}`);
                
                if (isChecked) {
                    const maxQty = parseFloat($qtyInput.data('max-qty')) || 0;
                    const availableStock = parseFloat($qtyInput.data('available-qty'));
                    
                    let deliverQty = maxQty;
                    if (!isNaN(availableStock) && availableStock >= 0) {
                        deliverQty = Math.min(maxQty, availableStock);
                    }
                    
                    $qtyInput.val(deliverQty.toFixed(3)).prop('readonly', false);
                } else {
                    $qtyInput.val('0.000').prop('readonly', true);
                }
                
                self.calculateTotals();
            });

            // Quantity input change
            $(document).on('input', '.deliver-qty', function () {
                const $input = $(this);
                const deliverQty = parseFloat($input.val()) || 0;
                const maxQty = parseFloat($input.data('max-qty')) || 0;
                const availableStock = parseFloat($input.data('available-qty'));
                
                if (deliverQty > maxQty) {
                    TempleCore.showToast('Quantity cannot exceed package quantity', 'warning');
                    $input.val(maxQty.toFixed(3));
                } else if (!isNaN(availableStock) && availableStock >= 0 && deliverQty > availableStock) {
                    TempleCore.showToast(`Quantity cannot exceed available stock (${availableStock})`, 'warning');
                    $input.val(availableStock.toFixed(3));
                }
                
                self.calculateTotals();
            });

            // Remove package
            $(document).on('click', '.remove-package-btn', function () {
                const pkgIndex = $(this).data('pkg-index');
                self.removePackage(pkgIndex);
            });

            // Update package quantity
            $(document).on('change', '.package-qty-input', function () {
                const pkgIndex = $(this).data('pkg-index');
                const newQty = parseInt($(this).val()) || 1;
                self.updatePackageQuantity(pkgIndex, newQty);
            });

            // Form submit
            $(document).on('submit', '#createDOForm', function (e) {
                e.preventDefault();
                self.saveDO();
            });
        },

        loadDropdownData: function () {
            const self = this;

            // Load Devotees
            TempleAPI.get('/sales/delivery-orders/devotees/active')
                .done((response) => {
                    if (response.success) {
                        self.devotees = response.data || [];
                        let options = '<option value="">Select Customer</option>';
                        self.devotees.forEach(d => {
                            const displayText = `${d.customer_name} (${d.mobile || ''})`;
                            options += `<option value="${d.id}">${displayText}</option>`;
                        });
                        $('#devoteeId').html(options);
                    }
                })
                .fail((xhr) => console.error('Failed to load devotees:', xhr));

            // Load Warehouses
            TempleAPI.get('/sales/delivery-orders/warehouses/active')
                .done((response) => {
                    if (response.success) {
                        self.warehouses = response.data || [];
                        let options = '<option value="">Select Warehouse...</option>';
                        self.warehouses.forEach(w => {
                            options += `<option value="${w.id}">${w.name} (${w.code})</option>`;
                        });
                        $('#warehouseId').html(options);
                    }
                })
                .fail((xhr) => console.error('Failed to load warehouses:', xhr));
        },

        loadPackagesForModal: function () {
            TempleAPI.get('/sales/packages', { is_active: 1 })
                .done(res => {
                    let opts = '<option value="">Select Package...</option>';
                    if (res.success && res.data && res.data.data) {
                        this.packages = res.data.data;
                        res.data.data.forEach(p => {
                            const itemCount = (p.items || []).length;
                            opts += `<option value="${p.id}" 
                                        data-items='${JSON.stringify(p.items || [])}'
                                        data-price="${p.total_amount || 0}"
                                        data-tax="${p.tax_rate || 0}"
                                        data-discount="${p.discount || 0}"
                                        data-name="${p.package_name || p.package_number}">
                                        ${p.package_name || p.package_number} (${itemCount} items)
                                    </option>`;
                        });
                    }
                    $('#modalPackageSelect').html(opts);
                })
                .fail(xhr => console.error('Failed to load packages:', xhr));
        },

        resetPackageModal: function () {
            $('#modalPackageSelect').val('').trigger('change');
            $('#pkgQty').val(1);
            $('#packagePreview').hide();
            $('#packagePreviewBody').empty();
        },

        showPackagePreview: function () {
            const $selected = $('#modalPackageSelect option:selected');
            const pkgId = $selected.val();
            
            if (!pkgId) {
                $('#packagePreview').hide();
                return;
            }
            
            const items = JSON.parse($selected.attr('data-items') || '[]');
            const price = parseFloat($selected.data('price')) || 0;
            const pkgName = $selected.data('name');
            
            let html = '';
            if (items.length > 0) {
                items.forEach((item, idx) => {
                    const itemName = item.item_name || 'Unknown Item';
                    const itemType = item.type === 'product' ? 'Product' : 'Sales Item';
                    const qtyPerPkg = parseFloat(item.quantity) || 0;
                    const unitPrice = parseFloat(item.unit_price || item.rate) || 0;
                    
                    html += `
                        <tr>
                            <td>${itemName}</td>
                            <td><span class="badge ${item.type === 'product' ? 'bg-primary' : 'bg-info'}">${itemType}</span></td>
                            <td class="text-end qty-per-pkg" data-qty="${qtyPerPkg}">${qtyPerPkg}</td>
                            <td class="text-end total-qty">${qtyPerPkg}</td>
                            <td class="text-end">${this.formatCurrency(unitPrice)}</td>
                        </tr>
                    `;
                });
            } else {
                html = '<tr><td colspan="5" class="text-center text-muted">No items in this package</td></tr>';
            }
            
            $('#packagePreviewBody').html(html);
            $('#previewPackagePrice').text(this.formatCurrency(price));
            $('#previewTotal').text(this.formatCurrency(price));
            $('#packagePreview').show();
            
            this.updatePackagePreview();
        },

        updatePackagePreview: function () {
            const qty = parseInt($('#pkgQty').val()) || 1;
            const $selected = $('#modalPackageSelect option:selected');
            const price = parseFloat($selected.data('price')) || 0;
            
            // Update total quantities
            $('#packagePreviewBody tr').each(function () {
                const qtyPerPkg = parseFloat($(this).find('.qty-per-pkg').data('qty')) || 0;
                $(this).find('.total-qty').text((qtyPerPkg * qty).toFixed(3));
            });
            
            // Update total price
            $('#previewTotal').text(this.formatCurrency(price * qty));
        },

        addSelectedPackage: function () {
            const $selected = $('#modalPackageSelect option:selected');
            const pkgId = $selected.val();
            
            if (!pkgId) {
                TempleCore.showToast('Please select a package', 'error');
                return;
            }
            
            const quantity = parseInt($('#pkgQty').val()) || 1;
            const items = JSON.parse($selected.attr('data-items') || '[]');
            const price = parseFloat($selected.data('price')) || 0;
            const tax = parseFloat($selected.data('tax')) || 0;
            const discount = parseFloat($selected.data('discount')) || 0;
            const pkgName = $selected.data('name');
            
            // Check if package already added
            const existingIndex = this.selectedPackages.findIndex(p => p.packageId === pkgId);
            if (existingIndex >= 0) {
                TempleCore.showToast('This package is already added. Please update quantity instead.', 'warning');
                return;
            }
            
            const packageData = {
                packageId: pkgId,
                packageName: pkgName,
                quantity: quantity,
                unitPrice: price,
                taxAmount: tax * quantity,
                discountAmount: discount * quantity,
                items: items.map((item, idx) => ({
                    index: idx,
                    item_id: item.item_id,
                    item_name: item.item_name || 'Unknown Item',
                    type: item.type,
                    quantity_per_package: parseFloat(item.quantity) || 0,
                    total_quantity: (parseFloat(item.quantity) || 0) * quantity,
                    unit_price: parseFloat(item.unit_price || item.rate) || 0,
                    uom: item.uom || ''
                }))
            };
            
            this.selectedPackages.push(packageData);
            this.renderPackages();
            $('#packageModal').modal('hide');
            TempleCore.showToast(`Package "${pkgName}" added successfully`, 'success');
        },

        renderPackages: function () {
            const self = this;
            
            if (this.selectedPackages.length === 0) {
                $('#packagesContainer').html(`
                    <div class="alert alert-secondary text-center">
                        No packages added yet. Click "Add Package" to begin.
                    </div>
                `);
                this.calculateTotals();
                return;
            }
            
            let html = '';
            
            this.selectedPackages.forEach((pkg, pkgIndex) => {
                const packageItems = pkg.items || [];
                
                html += `
                    <div class="card mb-3 package-card" data-pkg-index="${pkgIndex}">
                        <div class="card-header bg-light">
                            <div class="row align-items-center">
                                <div class="col-md-5">
                                    <h6 class="mb-0">
                                        <i class="bi bi-box-seam"></i> ${pkg.packageName}
                                        <span class="badge bg-secondary ms-2">${packageItems.length} items</span>
                                    </h6>
                                </div>
                                <div class="col-md-3">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text">Qty:</span>
                                        <input type="number" class="form-control package-qty-input" 
                                               data-pkg-index="${pkgIndex}" 
                                               value="${pkg.quantity}" min="1">
                                    </div>
                                </div>
                                <div class="col-md-2 text-end">
                                    <strong>${this.formatCurrency(pkg.unitPrice * pkg.quantity)}</strong>
                                </div>
                                <div class="col-md-2 text-end">
                                    <label class="form-check-label me-2">
                                        <input type="checkbox" 
                                               class="form-check-input select-all-package-items" 
                                               data-pkg-index="${pkgIndex}">
                                        Select All
                                    </label>
                                    <button type="button" class="btn btn-sm btn-danger remove-package-btn" 
                                            data-pkg-index="${pkgIndex}" title="Remove Package">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                `;
                
                if (packageItems.length > 0) {
                    html += `
                        <table class="table table-bordered table-hover table-sm mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th width="50"></th>
                                    <th>Item Name</th>
                                    <th>Type</th>
                                    <th>Qty/Package</th>
                                    <th>Total Qty</th>
                                    <th>Qty to Deliver *</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    packageItems.forEach((item, itemIndex) => {
                        const uniqueId = `${pkgIndex}-${itemIndex}`;
                        const totalQty = item.quantity_per_package * pkg.quantity;
                        const itemType = item.type === 'product' ? 'Product' : 'Sales Item';
                        
                        // Stock check logic
                        let isDisabled = false;
                        let stockInfo = '';
                        let availableStock = null;
                        
                        if (self.stockData && item.type === 'product' && item.item_id) {
                            const stockValue = self.stockData[item.item_id] ?? 
                                               self.stockData[String(item.item_id)] ?? null;
                            
                            if (stockValue !== null && stockValue !== undefined) {
                                availableStock = parseFloat(stockValue);
                                const stockClass = availableStock <= 0 ? 'text-danger' :
                                    (availableStock < totalQty ? 'text-warning' : 'text-success');
                                stockInfo = `<br><small class="${stockClass}">Stock: ${availableStock}</small>`;
                                
                                if (availableStock <= 0) {
                                    isDisabled = true;
                                }
                            }
                        }
                        
                        html += `
                            <tr class="${isDisabled ? 'table-secondary' : ''}">
                                <td class="text-center">
                                    <input type="checkbox" 
                                           class="form-check-input package-item-checkbox" 
                                           data-unique-id="${uniqueId}"
                                           data-pkg-index="${pkgIndex}"
                                           data-item-index="${itemIndex}"
                                           data-item-id="${item.item_id || ''}"
                                           data-item-type="${item.type || ''}"
                                           ${isDisabled ? 'disabled' : ''}>
                                </td>
                                <td>${item.item_name}</td>
                                <td><span class="badge ${item.type === 'product' ? 'bg-primary' : 'bg-info'}">${itemType}</span></td>
                                <td class="text-end">${item.quantity_per_package} ${item.uom}</td>
                                <td class="text-end" id="total-qty-${uniqueId}">
                                    ${totalQty.toFixed(3)} ${item.uom}
                                    ${stockInfo}
                                </td>
                                <td>
                                    <input type="number" 
                                           class="form-control form-control-sm deliver-qty" 
                                           id="deliver-qty-${uniqueId}"
                                           data-unique-id="${uniqueId}"
                                           data-unit-price="${item.unit_price}"
                                           data-max-qty="${totalQty}"
                                           data-available-qty="${availableStock !== null ? availableStock : ''}"
                                           value="0.000"
                                           min="0" 
                                           max="${totalQty}"
                                           step="0.001"
                                           ${isDisabled ? 'disabled' : 'readonly'}>
                                </td>
                                <td class="text-end">${this.formatCurrency(item.unit_price)}</td>
                                <td class="text-end item-total" id="item-total-${uniqueId}">0.00</td>
                            </tr>
                        `;
                    });
                    
                    html += `
                            </tbody>
                        </table>
                    `;
                } else {
                    html += `
                        <div class="p-3 text-center text-muted">
                            No items in this package
                        </div>
                    `;
                }
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            $('#packagesContainer').html(html);
            this.calculateTotals();
        },

        updatePackageQuantity: function (pkgIndex, newQty) {
            if (newQty < 1) newQty = 1;
            
            const pkg = this.selectedPackages[pkgIndex];
            if (!pkg) return;
            
            pkg.quantity = newQty;
            pkg.taxAmount = (parseFloat(pkg.taxAmount) / (pkg.quantity || 1)) * newQty;
            pkg.discountAmount = (parseFloat(pkg.discountAmount) / (pkg.quantity || 1)) * newQty;
            
            // Update item quantities
            pkg.items.forEach(item => {
                item.total_quantity = item.quantity_per_package * newQty;
            });
            
            this.renderPackages();
            
            // Check stock after updating
            if ($('#warehouseId').val()) {
                this.checkStock();
            }
        },

        removePackage: function (pkgIndex) {
            this.selectedPackages.splice(pkgIndex, 1);
            this.renderPackages();
        },

        checkStock: function () {
            const warehouseId = $('#warehouseId').val();
            const self = this;
            
            this.stockData = {};
            
            if (!warehouseId || this.selectedPackages.length === 0) {
                this.renderPackages();
                return;
            }
            
            // Collect all product IDs from selected packages
            const productIds = [];
            this.selectedPackages.forEach(pkg => {
                (pkg.items || []).forEach(item => {
                    if (item.type === 'product' && item.item_id) {
                        productIds.push(item.item_id);
                    }
                });
            });
            
            if (productIds.length === 0) {
                return;
            }
            
            const uniqueProductIds = [...new Set(productIds)];
            
            TempleCore.showLoading('Checking stock availability...');
            
            TempleAPI.post('/sales/delivery-orders/check-stock', {
                warehouse_id: warehouseId,
                product_ids: uniqueProductIds
            })
                .done((response) => {
                    if (response.success) {
                        self.stockData = response.data || {};
                        self.renderPackages();
                        TempleCore.showToast('Stock availability checked', 'success');
                    }
                })
                .fail((xhr) => {
                    console.error('Stock check failed:', xhr);
                    self.renderPackages();
                })
                .always(() => {
                    self.hideLoadingSafe();
                });
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;
            
            // Calculate from checked items
            $('.package-item-checkbox:checked').each(function () {
                const uniqueId = $(this).data('unique-id');
                const $deliverQtyInput = $(`#deliver-qty-${uniqueId}`);
                const deliverQty = parseFloat($deliverQtyInput.val()) || 0;
                const unitPrice = parseFloat($deliverQtyInput.data('unit-price')) || 0;
                
                if (deliverQty > 0) {
                    const itemTotal = deliverQty * unitPrice;
                    $(`#item-total-${uniqueId}`).text(this.formatCurrency ? this.formatCurrency(itemTotal) : itemTotal.toFixed(2));
                    subtotal += itemTotal;
                }
            }.bind(this));
            
            // Add package-level tax and discount
            this.selectedPackages.forEach(pkg => {
                totalTax += parseFloat(pkg.taxAmount) || 0;
                totalDiscount += parseFloat(pkg.discountAmount) || 0;
            });
            
            const grandTotal = subtotal + totalTax - totalDiscount;
            
            $('#subtotal').text(this.formatCurrency(subtotal));
            $('#totalTax').text(this.formatCurrency(totalTax));
            $('#totalDiscount').text(this.formatCurrency(totalDiscount));
            $('#grandTotal').text(this.formatCurrency(grandTotal));
        },

        formatCurrency: function (amount) {
            if (typeof TempleCore !== 'undefined' && TempleCore.formatCurrency) {
                return TempleCore.formatCurrency(amount);
            }
            return 'RM ' + parseFloat(amount || 0).toFixed(2);
        },

        saveDO: function () {
            const self = this;

            // Validation
            if (!$('#devoteeId').val()) {
                TempleCore.showToast('Please select a customer', 'error');
                return;
            }

            if (!$('#warehouseId').val()) {
                TempleCore.showToast('Please select a warehouse', 'error');
                return;
            }

            if (this.selectedPackages.length === 0) {
                TempleCore.showToast('Please add at least one package', 'error');
                return;
            }

            // Check if any items are selected
            const hasSelectedItems = $('.package-item-checkbox:checked').length > 0;
            if (!hasSelectedItems) {
                TempleCore.showToast('Please select at least one item to deliver', 'error');
                return;
            }

            // Prepare data
            const packages = this.selectedPackages.map((pkg, pkgIndex) => {
                // Collect selected items for this package
                const selectedItems = [];
                $(`.package-item-checkbox:checked[data-pkg-index="${pkgIndex}"]`).each(function () {
                    const itemIndex = $(this).data('item-index');
                    const uniqueId = $(this).data('unique-id');
                    const deliverQty = parseFloat($(`#deliver-qty-${uniqueId}`).val()) || 0;
                    
                    if (deliverQty > 0) {
                        const item = pkg.items[itemIndex];
                        selectedItems.push({
                            index: itemIndex,
                            item_id: item.item_id,
                            item_type: item.type,
                            delivered_quantity: deliverQty
                        });
                    }
                });
                
                return {
                    package_id: pkg.packageId,
                    quantity: pkg.quantity,
                    unit_price: pkg.unitPrice,
                    tax_amount: pkg.taxAmount / pkg.quantity, // Per package
                    discount_amount: pkg.discountAmount / pkg.quantity, // Per package
                    items: selectedItems
                };
            }).filter(pkg => pkg.items.length > 0); // Only include packages with selected items

            if (packages.length === 0) {
                TempleCore.showToast('No items selected for delivery', 'error');
                return;
            }

            const data = {
                do_date: $('#doDate').val(),
                delivery_order_no: $('#deliveryOrderNo').val() || null,
                delivery_date: $('#deliveryDate').val() || null,
                vehicle_number: $('#vehicleNumber').val() || null,
                devotee_id: $('#devoteeId').val(),
                warehouse_id: $('#warehouseId').val(),
                notes: $('#notes').val() || null,
                packages: packages
            };

            console.log('Saving DO:', data);

            TempleCore.showLoading('Creating delivery order...');

            TempleAPI.post('/sales/delivery-orders', data)
                .done((response) => {
                    if (response.success) {
                        self.hideLoadingSafe();
                        TempleCore.showToast('Delivery order created successfully', 'success');
                        
                        setTimeout(() => {
                            self.hideLoadingSafe();
                            TempleRouter.navigate('sales/delivery-orders');
                        }, 800);
                    } else {
                        self.hideLoadingSafe();
                        TempleCore.showToast(response.message || 'Failed to create delivery order', 'error');
                    }
                })
                .fail((xhr) => {
                    console.error('Create DO Error:', xhr);
                    self.hideLoadingSafe();
                    
                    const errorMessage = xhr.responseJSON?.message || xhr.statusText || 'Failed to create delivery order';
                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(() => {
                    setTimeout(() => self.hideLoadingSafe(), 100);
                });
        },

        cleanup: function () {
            console.log('Cleaning up SalesDeliveryOrdersCreatePage...');
            
            if ($('#devoteeId').data('select2')) {
                $('#devoteeId').select2('destroy');
            }
            if ($('#modalPackageSelect').data('select2')) {
                $('#modalPackageSelect').select2('destroy');
            }

            $(document).off('click', '#backBtn');
            $(document).off('click', '#cancelBtn');
            $(document).off('click', '#addPackageBtn');
            $(document).off('change', '#warehouseId');
            $('#modalPackageSelect').off('change');
            $('#pkgQty').off('input');
            $('#savePackageBtn').off('click');
            $(document).off('change', '.select-all-package-items');
            $(document).off('change', '.package-item-checkbox');
            $(document).off('input', '.deliver-qty');
            $(document).off('click', '.remove-package-btn');
            $(document).off('change', '.package-qty-input');
            $(document).off('submit', '#createDOForm');
            
            this.hideLoadingSafe();
        }
    };

})(jQuery, window);