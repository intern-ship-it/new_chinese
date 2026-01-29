// js/pages/sales/delivery-order/create-from-so.js
// Create Delivery Order from Sales Order - WITH JSONB PACKAGE ITEMS

(function ($, window) {
    'use strict';

    window.SalesDeliveryOrdersCreateFromSoPage = {
        salesOrderId: null,
        salesOrderData: null,
        selectedItems: [],
        warehouses: [],
        stockData: {},

        init: function (params = null) {
            console.log('SalesDeliveryOrdersCreateFromSoPage init called with:', params, typeof params);

            // Extract salesOrderId from various possible parameter formats
            let salesOrderId = null;

            if (params) {
                if (typeof params === 'string') {
                    // Direct string ID
                    salesOrderId = params;
                } else if (typeof params === 'object') {
                    // Object with various possible property names
                    salesOrderId = params.id ||
                        params.salesOrderId ||
                        params.sales_order_id ||
                        params.so_id ||
                        params[0] ||  // Array-like access
                        null;

                    // If still an object, try to get first value
                    if (salesOrderId && typeof salesOrderId === 'object') {
                        salesOrderId = Object.values(params)[0];
                    }
                }
            }

            // ========== CHECK sessionStorage as fallback (for page refresh) ==========
            if (!salesOrderId) {
                salesOrderId = sessionStorage.getItem('create_do_so_id');
                console.log('Checking sessionStorage, found:', salesOrderId);
            }
            // ========== END sessionStorage check ==========

            // Also check URL for sales order ID as fallback (existing logic)
            if (!salesOrderId) {
                const urlParts = window.location.hash.split('/');
                // Look for UUID pattern in URL
                for (const part of urlParts) {
                    // Clean the part from any query strings first
                    const cleanPart = part.split('?')[0];
                    if (cleanPart && cleanPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                        salesOrderId = cleanPart;
                        break;
                    }
                }
            }

            // Also check pathname for UUID (for non-hash routing)
            if (!salesOrderId) {
                const pathParts = window.location.pathname.split('/');
                for (const part of pathParts) {
                    // Clean the part from any query strings first
                    const cleanPart = part.split('?')[0];
                    if (cleanPart && cleanPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                        salesOrderId = cleanPart;
                        break;
                    }
                }
            }

            console.log('Extracted salesOrderId:', salesOrderId);

            this.salesOrderId = salesOrderId;
            this.selectedItems = [];
            this.stockData = {};
            this.render();
            this.loadWarehouses();

            if (this.salesOrderId) {
                this.loadSalesOrderForDO(this.salesOrderId);
            } else {
                console.error('No sales order ID provided');
                if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                    TempleCore.showToast('No sales order ID provided', 'error');
                }
                setTimeout(() => window.history.back(), 2000);
            }

            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3><i class="bi bi-truck"></i> Create Delivery Order</h3>
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
                                                <label class="form-label">Customer *</label>
                                                <input type="text" class="form-control" id="customerName" readonly>
                                                <input type="hidden" id="devoteeId">
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

                                        <!-- Sales Order Info -->
                                        <div id="salesOrderInfo" class="alert alert-info mb-3" style="display: none;">
                                            <strong>Sales Order:</strong> <span id="soNumber"></span><br>
                                            <strong>Date:</strong> <span id="soDate"></span>
                                        </div>

                                        <!-- PACKAGES Section -->
                                        <div class="row mb-3 mt-4">
                                            <div class="col-md-12">
                                                <h5 class="border-bottom pb-2">
                                                    Packages
                                                    <small class="text-muted">(Select items within packages to deliver)</small>
                                                </h5>
                                            </div>
                                        </div>

                                        <div id="packagesContainer">
                                            <!-- Package sections will be dynamically rendered here -->
                                        </div>

                                        <!-- ADDONS Section -->
                                        <div class="row mb-3 mt-4">
                                            <div class="col-md-12">
                                                <h5 class="border-bottom pb-2">
                                                    Add-ons
                                                    <small class="text-muted">(Select add-ons to deliver)</small>
                                                </h5>
                                            </div>
                                        </div>

                                        <div class="table-responsive">
                                            <table class="table table-bordered table-hover">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th width="50">
                                                            <input type="checkbox" id="selectAllAddons" title="Select All Add-ons">
                                                        </th>
                                                        <th>Item Name</th>
                                                        <th>Ordered Qty</th>
                                                        <th>Delivered Qty</th>
                                                        <th>Remaining Qty</th>
                                                        <th>Qty to Deliver *</th>
                                                        <th>Unit Price</th>
                                                        <th>Total</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="addonsTableBody">
                                                    <tr>
                                                        <td colspan="9" class="text-center text-muted">
                                                            No add-ons available
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
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
            `;
            $('#page-container').html(html);
        },

        bindEvents: function () {
            const self = this;

            $(document).on('click', '#backBtn, #cancelBtn', function () {
                window.history.back();
            });

            $(document).on('change', '#warehouseId', function () {
                self.checkStock();
            });

            $(document).on('change', '#selectAllAddons', function () {
                const isChecked = $(this).prop('checked');
                $('.addon-checkbox:not(:disabled)').prop('checked', isChecked).trigger('change');
            });

            $(document).on('change', '.select-all-package-items', function () {
                const packageId = $(this).data('package-id');
                const isChecked = $(this).prop('checked');
                $(`.package-item-checkbox[data-package-id="${packageId}"]:not(:disabled)`)
                    .prop('checked', isChecked)
                    .trigger('change');
            });

            $(document).on('change', '.item-checkbox', function () {
                const $checkbox = $(this);
                const isChecked = $checkbox.prop('checked');
                const uniqueId = $checkbox.data('unique-id');

                if (isChecked) {
                    const remainingQty = parseFloat($(`#remaining-${uniqueId}`).text()) || 0;
                    const availableQty = parseFloat($checkbox.data('available-qty'));

                    let maxQty = remainingQty;
                    if (!isNaN(availableQty) && availableQty >= 0) {
                        maxQty = Math.min(remainingQty, availableQty);
                    }

                    $(`#deliver-qty-${uniqueId}`).val(maxQty.toFixed(3)).prop('readonly', false);
                } else {
                    $(`#deliver-qty-${uniqueId}`).val('0.000').prop('readonly', true);
                }

                self.calculateTotals();
            });

            $(document).on('input', '.deliver-qty', function () {
                const uniqueId = $(this).data('unique-id');
                const deliverQty = parseFloat($(this).val()) || 0;
                const remainingQty = parseFloat($(`#remaining-${uniqueId}`).text()) || 0;
                const availableQty = parseFloat($(this).data('available-qty'));

                if (deliverQty > remainingQty) {
                    if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                        TempleCore.showToast('Deliver quantity cannot exceed remaining quantity', 'error');
                    }
                    $(this).val(remainingQty.toFixed(3));
                } else if (!isNaN(availableQty) && availableQty >= 0 && deliverQty > availableQty) {
                    if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                        TempleCore.showToast(`Deliver quantity cannot exceed available stock (${availableQty})`, 'error');
                    }
                    $(this).val(availableQty.toFixed(3));
                }

                self.calculateTotals();
            });

            $(document).on('submit', '#createDOForm', function (e) {
                e.preventDefault();
                self.saveDO();
            });
        },

        hideLoadingSafe: function () {
            // Safe wrapper to ensure loading is always hidden
            console.log('hideLoadingSafe called');
            try {
                if (typeof TempleCore !== 'undefined' && TempleCore.hideLoading) {
                    TempleCore.hideLoading();
                    console.log('TempleCore.hideLoading() executed');
                }

                // Also try to forcefully remove any loading overlays
                $('.loading-overlay, .modal-backdrop, #loading-overlay, .spinner-overlay').remove();
                $('body').removeClass('loading');

                // Remove any inline spinners that might be stuck
                $('#salesOrderInfo .spinner-border, #salesOrderInfo .spinner-grow').remove();
            } catch (e) {
                console.error('Error hiding loading:', e);
            }
        },

        checkStock: function () {
            const warehouseId = $('#warehouseId').val();
            const self = this;

            this.stockData = {}; // Reset stock data

            if (!warehouseId) {
                // Re-render without stock restrictions if warehouse is cleared
                if (this.salesOrderData) {
                    try {
                        this.populateSalesOrderData();
                    } catch (e) {
                        console.error('Error populating sales order data:', e);
                    }
                }
                return;
            }

            // Check if we have a sales order loaded
            if (!this.salesOrderId || !this.salesOrderData) {
                console.warn('No sales order data available for stock check');
                return;
            }

            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading('Checking stock availability...');
            }

            const requestData = {
                sales_order_id: this.salesOrderId,
                warehouse_id: warehouseId
            };

            console.log('Check Stock Request:', requestData);

            // Set a failsafe timeout to hide loading after 10 seconds
            const loadingTimeout = setTimeout(() => {
                console.warn('Loading timeout reached - forcing hide');
                self.hideLoadingSafe();
            }, 10000);

            TempleAPI.post('/sales/delivery-orders/check-stock', requestData)
                .done((response) => {
                    console.log('Check Stock Response:', response);

                    try {
                        if (response.success) {
                            // Handle both object and array response formats
                            self.stockData = response.data || {};

                            // If data is an array, convert to object keyed by product_id
                            if (Array.isArray(response.data)) {
                                self.stockData = {};
                                response.data.forEach(item => {
                                    if (item.product_id) {
                                        self.stockData[item.product_id] = item.available_quantity || item.quantity || 0;
                                    }
                                });
                            }

                            self.populateSalesOrderData();

                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Stock availability checked', 'success');
                            }
                        } else {
                            console.error('Stock check failed:', response);
                            self.stockData = {};
                            self.populateSalesOrderData();

                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast(response.message || 'Failed to check stock', 'warning');
                            }
                        }
                    } catch (e) {
                        console.error('Error processing stock response:', e);
                        self.stockData = {};
                        try {
                            self.populateSalesOrderData();
                        } catch (e2) {
                            console.error('Error in populateSalesOrderData:', e2);
                        }
                    }
                })
                .fail((xhr) => {
                    console.error('Check Stock Error:', xhr);

                    self.stockData = {};
                    try {
                        self.populateSalesOrderData();
                    } catch (e) {
                        console.error('Error in populateSalesOrderData after fail:', e);
                    }

                    const errorMessage = xhr.responseJSON?.message || 'Failed to check stock availability';
                    if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                        TempleCore.showToast(errorMessage, 'warning');
                    }
                })
                .always(() => {
                    // Clear the failsafe timeout
                    clearTimeout(loadingTimeout);

                    // Hide loading immediately
                    console.log('Check Stock .always() - hiding loading');
                    self.hideLoadingSafe();

                    // Double-check with a slight delay in case of race condition
                    setTimeout(() => {
                        self.hideLoadingSafe();
                    }, 100);
                });
        },

        loadWarehouses: function () {
            TempleAPI.get('/sales/delivery-orders/warehouses/active').done((response) => {
                if (response.success) {
                    this.warehouses = response.data || [];
                    let options = '<option value="">Select Warehouse...</option>';
                    (response.data || []).forEach(w => {
                        options += `<option value="${w.id}">${w.name} (${w.code})</option>`;
                    });
                    $('#warehouseId').html(options);
                }
            }).fail((xhr) => {
                console.error('Load Warehouses Error:', xhr);
            });
        },

        loadSalesOrderForDO: function (salesOrderId) {
            const self = this;

            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading('Loading sales order...');
            }

            // Set a failsafe timeout
            const loadingTimeout = setTimeout(() => {
                console.warn('Sales order loading timeout - forcing hide');
                self.hideLoadingSafe();
            }, 15000);

            TempleAPI.get(`/sales/delivery-orders/sales-order/${salesOrderId}/details`)
                .done((response) => {
                    try {
                        console.log('Sales Order Response:', response);

                        if (response.success) {
                            self.salesOrderData = response.data;
                            self.populateSalesOrderData();
                        } else {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast(response.message || 'Failed to load sales order', 'error');
                            }
                            setTimeout(() => window.history.back(), 2000);
                        }
                    } catch (e) {
                        console.error('Error processing sales order response:', e);
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Error processing sales order data', 'error');
                        }
                    }
                })
                .fail((xhr) => {
                    console.error('Load Sales Order Error:', xhr);
                    const errorMessage = xhr.responseJSON?.message || xhr.statusText || 'Failed to load sales order details';

                    if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                        TempleCore.showToast(errorMessage, 'error');
                    }

                    setTimeout(() => window.history.back(), 2000);
                })
                .always(() => {
                    clearTimeout(loadingTimeout);
                    console.log('Sales Order .always() - hiding loading');
                    self.hideLoadingSafe();

                    // Double-check with delay
                    setTimeout(() => {
                        self.hideLoadingSafe();
                    }, 100);
                });
        },

        populateSalesOrderData: function () {
            const so = this.salesOrderData;

            if (!so) {
                console.warn('No sales order data to populate');
                return;
            }

            // Clear any spinners and update sales order info
            const salesOrderInfoHtml = `
                <strong>Sales Order:</strong> ${so.so_number || ''}<br>
                <strong>Date:</strong> ${so.so_date ? TempleCore.formatDate(so.so_date) : ''}
            `;
            $('#salesOrderInfo').html(salesOrderInfoHtml).show();

            $('#customerName').val(so.devotee?.customer_name || so.customer_name || '');
            $('#devoteeId').val(so.devotee_id || '');

            const items = so.items || [];
            const packages = items.filter(item => !item.is_addon);
            const addons = items.filter(item => item.is_addon);

            this.renderPackagesWithItems(packages);
            this.renderAddonsTable(addons);
        },

        renderPackagesWithItems: function (packages) {
            const self = this;
            let html = '';

            if (!packages || packages.length === 0) {
                html = '<div class="alert alert-secondary">No packages available for delivery</div>';
            } else {
                packages.forEach((packageItem) => {
                    const packageName = packageItem.sales_package?.package_name ||
                        packageItem.description || 'Unknown Package';
                    const packageCanDeliver = packageItem.can_deliver;
                    const packageItems = packageItem.package_items || [];

                    html += `
                        <div class="card mb-3 ${!packageCanDeliver ? 'border-success' : ''}">
                            <div class="card-header bg-light">
                                <div class="row align-items-center">
                                    <div class="col-md-8">
                                        <h6 class="mb-0">
                                            <i class="bi bi-box-seam"></i> ${packageName}
                                            <span class="badge ${packageCanDeliver ? 'bg-secondary' : 'bg-success'} ms-2">
                                                ${packageCanDeliver ? 'Pending' : 'Fully Delivered'}
                                            </span>
                                        </h6>
                                        <small class="text-muted">
                                            Package Qty: ${packageItem.quantity || 0} | 
                                            Delivered: ${packageItem.delivered_quantity || 0} | 
                                            Remaining: ${packageItem.remaining_quantity || 0}
                                        </small>
                                    </div>
                                    <div class="col-md-4 text-end">
                                        ${packageCanDeliver ? `
                                            <label class="form-check-label">
                                                <input type="checkbox" 
                                                       class="form-check-input select-all-package-items" 
                                                       data-package-id="${packageItem.id}">
                                                Select All Items
                                            </label>
                                        ` : ''}
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
                                        <th>Ordered Qty</th>
                                        <th>Delivered Qty</th>
                                        <th>Remaining Qty</th>
                                        <th>Qty to Deliver *</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;

                        packageItems.forEach((pkgItem, idx) => {
                            // Use index from item or fallback to loop index
                            const itemIndex = pkgItem.index !== undefined ? pkgItem.index : idx;
                            let isDisabled = !pkgItem.can_deliver;
                            const itemName = pkgItem.item_name || 'Unknown Item';
                            const itemType = pkgItem.type === 'product' ? 'Product' : 'Sales Item';
                            const uomName = pkgItem.uom || '';

                            // Stock check logic
                            const productId = pkgItem.item_id;
                            let availableStock = null;
                            let stockInfo = '';

                            if (self.stockData && pkgItem.type === 'product' && productId) {
                                // Check various possible keys
                                const stockValue = self.stockData[productId] ??
                                    self.stockData[String(productId)] ??
                                    null;

                                if (stockValue !== null && stockValue !== undefined) {
                                    availableStock = parseFloat(stockValue);

                                    const remainingQty = parseFloat(pkgItem.remaining_quantity) || 0;
                                    const stockClass = availableStock <= 0 ? 'text-danger' :
                                        (availableStock < remainingQty ? 'text-warning' : 'text-success');

                                    stockInfo = `<br><small class="${stockClass}">Stock: ${availableStock}</small>`;

                                    if (availableStock <= 0) {
                                        isDisabled = true;
                                    }
                                }
                            }

                            const uniqueId = `${packageItem.id}-${itemIndex}`;

                            html += `
                                <tr class="${isDisabled ? 'table-secondary' : ''}">
                                    <td class="text-center">
                                        <input type="checkbox" 
                                               class="item-checkbox package-item-checkbox" 
                                               data-unique-id="${uniqueId}"
                                               data-package-id="${packageItem.id}"
                                               data-so-item-id="${packageItem.id}"
                                               data-package-item-index="${itemIndex}"
                                               data-item-id="${pkgItem.item_id || ''}"
                                               data-item-type="${pkgItem.type || ''}"
                                               data-is-package-item="true"
                                               data-available-qty="${availableStock !== null ? availableStock : ''}"
                                               ${isDisabled ? 'disabled' : ''}>
                                    </td>
                                    <td>${itemName}</td>
                                    <td>${itemType}</td>
                                    <td class="text-end">${pkgItem.ordered_quantity || 0} ${uomName}</td>
                                    <td class="text-end">${pkgItem.delivered_quantity || 0} ${uomName}</td>
                                    <td class="text-end" id="remaining-${uniqueId}">
                                        ${pkgItem.remaining_quantity || 0} ${uomName}
                                        ${stockInfo}
                                    </td>
                                    <td>
                                        <input type="number" 
                                               class="form-control form-control-sm deliver-qty" 
                                               id="deliver-qty-${uniqueId}"
                                               data-unique-id="${uniqueId}"
                                               data-unit-price="${pkgItem.unit_price || 0}"
                                               data-available-qty="${availableStock !== null ? availableStock : ''}"
                                               value="0.000"
                                               min="0" 
                                               max="${pkgItem.remaining_quantity || 0}"
                                               step="0.001"
                                               ${isDisabled ? 'disabled' : 'readonly'}>
                                    </td>
                                    <td class="text-end">${TempleCore.formatCurrency(pkgItem.unit_price || 0)}</td>
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
            }

            $('#packagesContainer').html(html);
        },

        renderAddonsTable: function (addons) {
            const self = this;
            let html = '';

            if (!addons || addons.length === 0) {
                html = '<tr><td colspan="9" class="text-center text-muted">No add-ons available for delivery</td></tr>';
            } else {
                addons.forEach((item) => {
                    let isDisabled = !item.can_deliver;
                    const statusBadge = self.getItemStatusBadge(item);
                    const itemName = item.description || item.product?.product_name ||
                        item.sale_item?.item_name || 'Unknown Item';

                    let availableStock = null;
                    let stockInfo = '';

                    const productId = item.product_id;
                    if (self.stockData && productId) {
                        const stockValue = self.stockData[productId] ??
                            self.stockData[String(productId)] ??
                            null;

                        if (stockValue !== null && stockValue !== undefined) {
                            availableStock = parseFloat(stockValue);

                            const remainingQty = parseFloat(item.remaining_quantity) || 0;
                            const stockClass = availableStock <= 0 ? 'text-danger' :
                                (availableStock < remainingQty ? 'text-warning' : 'text-success');

                            stockInfo = `<br><small class="${stockClass}">Stock: ${availableStock}</small>`;

                            if (availableStock <= 0) {
                                isDisabled = true;
                            }
                        }
                    }

                    html += `
                        <tr class="${isDisabled ? 'table-secondary' : ''}">
                            <td class="text-center">
                                <input type="checkbox" class="item-checkbox addon-checkbox" 
                                       data-unique-id="${item.id}"
                                       data-is-addon="true"
                                       data-so-item-id="${item.id}"
                                       data-available-qty="${availableStock !== null ? availableStock : ''}"
                                       ${isDisabled ? 'disabled' : ''}>
                            </td>
                            <td>${itemName}</td>
                            <td class="text-end">${item.quantity || 0}</td>
                            <td class="text-end">${item.delivered_quantity || 0}</td>
                            <td class="text-end" id="remaining-${item.id}">
                                ${item.remaining_quantity || 0}
                                ${stockInfo}
                            </td>
                            <td>
                                <input type="number" class="form-control form-control-sm deliver-qty" 
                                       id="deliver-qty-${item.id}"
                                       data-unique-id="${item.id}"
                                       data-unit-price="${item.unit_price || 0}"
                                       data-tax-amount="${item.tax_amount || 0}"
                                       data-discount-amount="${item.discount_amount || 0}"
                                       data-ordered-qty="${item.quantity || 1}"
                                       data-available-qty="${availableStock !== null ? availableStock : ''}"
                                       value="0.000"
                                       min="0" 
                                       max="${item.remaining_quantity || 0}"
                                       step="0.001"
                                       ${isDisabled ? 'disabled' : 'readonly'}>
                            </td>
                            <td class="text-end">${TempleCore.formatCurrency(item.unit_price || 0)}</td>
                            <td class="text-end item-total" id="item-total-${item.id}">0.00</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                });
            }

            $('#addonsTableBody').html(html);
        },

        getItemStatusBadge: function (item) {
            if (!item.can_deliver) {
                return '<span class="badge bg-success">Fully Delivered</span>';
            }
            if (item.has_existing_do) {
                return '<span class="badge bg-warning">Partial</span>';
            }
            return '<span class="badge bg-secondary">Pending</span>';
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            $('.package-item-checkbox:checked').each(function () {
                const uniqueId = $(this).data('unique-id');
                const $deliverQtyInput = $(`#deliver-qty-${uniqueId}`);
                const deliverQty = parseFloat($deliverQtyInput.val()) || 0;
                const unitPrice = parseFloat($deliverQtyInput.data('unit-price')) || 0;

                if (deliverQty > 0) {
                    const itemSubtotal = deliverQty * unitPrice;
                    $(`#item-total-${uniqueId}`).text(TempleCore.formatCurrency(itemSubtotal));
                    subtotal += itemSubtotal;
                }
            });

            $('.addon-checkbox:checked').each(function () {
                const uniqueId = $(this).data('unique-id');
                const $deliverQtyInput = $(`#deliver-qty-${uniqueId}`);
                const deliverQty = parseFloat($deliverQtyInput.val()) || 0;
                const unitPrice = parseFloat($deliverQtyInput.data('unit-price')) || 0;
                const orderedQty = parseFloat($deliverQtyInput.data('ordered-qty')) || 1;
                const taxAmount = parseFloat($deliverQtyInput.data('tax-amount')) || 0;
                const discountAmount = parseFloat($deliverQtyInput.data('discount-amount')) || 0;

                if (deliverQty > 0) {
                    const itemSubtotal = deliverQty * unitPrice;
                    const itemTax = taxAmount * (deliverQty / orderedQty);
                    const itemDiscount = discountAmount * (deliverQty / orderedQty);
                    const itemTotal = itemSubtotal + itemTax - itemDiscount;

                    $(`#item-total-${uniqueId}`).text(TempleCore.formatCurrency(itemTotal));

                    subtotal += itemSubtotal;
                    totalTax += itemTax;
                    totalDiscount += itemDiscount;
                }
            });

            const grandTotal = subtotal + totalTax - totalDiscount;

            $('#subtotal').text(TempleCore.formatCurrency(subtotal));
            $('#totalTax').text(TempleCore.formatCurrency(totalTax));
            $('#totalDiscount').text(TempleCore.formatCurrency(totalDiscount));
            $('#grandTotal').text(TempleCore.formatCurrency(grandTotal));
        },

        saveDO: function () {
            const self = this;

            if (!$('#warehouseId').val()) {
                if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                    TempleCore.showToast('Please select a warehouse', 'error');
                }
                return;
            }

            const items = [];

            $('.package-item-checkbox:checked').each(function () {
                const $checkbox = $(this);
                const soItemId = $checkbox.data('so-item-id');
                const packageItemIndex = $checkbox.data('package-item-index');
                const itemId = $checkbox.data('item-id');
                const itemType = $checkbox.data('item-type');
                const uniqueId = $checkbox.data('unique-id');
                const deliverQty = parseFloat($(`#deliver-qty-${uniqueId}`).val()) || 0;

                if (deliverQty > 0) {
                    const itemData = {
                        sales_order_item_id: String(soItemId),
                        package_item_index: parseInt(packageItemIndex, 10),
                        delivered_quantity: deliverQty
                    };

                    // Only include item_id and item_type if they have values
                    // Convert item_id to string as backend expects string
                    if (itemId !== undefined && itemId !== null && itemId !== '') {
                        itemData.item_id = String(itemId);
                    }
                    if (itemType) {
                        itemData.item_type = itemType;
                    }

                    items.push(itemData);
                }
            });

            $('.addon-checkbox:checked').each(function () {
                const $checkbox = $(this);
                const soItemId = $checkbox.data('so-item-id');
                const uniqueId = $checkbox.data('unique-id');
                const deliverQty = parseFloat($(`#deliver-qty-${uniqueId}`).val()) || 0;

                if (deliverQty > 0) {
                    items.push({
                        sales_order_item_id: String(soItemId),
                        delivered_quantity: deliverQty
                    });
                }
            });

            if (items.length === 0) {
                if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                    TempleCore.showToast('Please select at least one item to deliver', 'error');
                }
                return;
            }

            const data = {
                sales_order_id: String(self.salesOrderId),
                do_date: $('#doDate').val(),
                delivery_order_no: $('#deliveryOrderNo').val() || null,
                delivery_date: $('#deliveryDate').val() || null,
                vehicle_number: $('#vehicleNumber').val() || null,
                warehouse_id: $('#warehouseId').val(),
                notes: $('#notes').val() || null,
                items: items
            };

            console.log('Submitting DO Data:', JSON.stringify(data, null, 2));

            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading('Creating delivery order...');
            }

            TempleAPI.post('/sales/delivery-orders/from-sales-order', data)
                .done((response) => {
                    if (response.success) {
                        // Clear the sessionStorage after successful creation
                        sessionStorage.removeItem('create_do_so_id');

                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Delivery order created successfully', 'success');
                        }
                        setTimeout(() => {
                            TempleRouter.navigate('sales/delivery-orders');
                        }, 1000);
                    } else {
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast(response.message || 'Failed to create delivery order', 'error');
                        }
                    }
                })
                .fail((xhr) => {
                    console.error('Delivery Order Creation Error:', xhr);
                    const errorMessage = xhr.responseJSON?.message || xhr.responseJSON?.error ||
                        xhr.statusText || 'Failed to create delivery order';

                    if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                        TempleCore.showToast(errorMessage, 'error');
                    }
                })
                .always(() => {
                    self.hideLoadingSafe();
                });
        },

        cleanup: function () {
            $(document).off('click', '#backBtn');
            $(document).off('click', '#cancelBtn');
            $(document).off('change', '#selectAllAddons');
            $(document).off('change', '.select-all-package-items');
            $(document).off('change', '.item-checkbox');
            $(document).off('input', '.deliver-qty');
            $(document).off('submit', '#createDOForm');
            $(document).off('change', '#warehouseId');
        }
    };

})(jQuery, window);