// js/pages/inventory/bulk-stock-out.js

(function ($, window) {
    'use strict';

    window.InventoryBulkStockOutPage = {
        productsList: [],
        currentWarehouseId: null,
        productsData: [],
        warehousesData: [],
        currentStock: 0,
        selectedProductData: null,
        currentEditingId: null,

        init: function () {
            this.loadInitialData();
            this.bindEvents();
            this.render();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-3">
                        <div class="col-12">
                            <h4>Bulk Stock Out</h4>
                        </div>
                    </div>
                    
                    <!-- Success/Error Messages -->
                    <div id="alertContainer"></div>
                    
                    <!-- Warehouse Selection (Fixed at top) -->
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <i class="bi bi-building"></i> Warehouse Selection
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="warehouse_id">Select Warehouse <span class="text-danger">*</span></label>
                                        <select class="form-control" id="warehouse_id" name="warehouse_id" required>
                                            <option value="">Select Warehouse</option>
                                        </select>
                                        <small class="text-muted">All products will be taken from this warehouse</small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="reference_number">Reference Number (Optional)</label>
                                        <input type="text" class="form-control" id="reference_number" 
                                               name="reference_number" placeholder="Batch reference number">
                                        <small class="text-muted">Common reference for all items in this batch</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Product Addition Form -->
                    <div class="card mb-3">
                        <div class="card-header">
                            <i class="bi bi-box"></i> Add Product to List
                        </div>
                        <div class="card-body">
                            <form id="addProductForm">
                                <div class="row">
                                    <!-- First Row -->
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="product_id">Select Product <span class="text-danger">*</span></label>
                                            <select class="form-control" id="product_id" required>
                                                <option value="">Select Product</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="quantity">Quantity Out <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="quantity" 
                                                   step="0.001" min="0.001" required>
                                            <small class="text-muted" id="stock_available">Available at this location: 0.00</small>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="reason">Reason <span class="text-danger">*</span></label>
                                            <select class="form-control" id="reason" required>
                                                <option value="">Select Reason</option>
                                                <option value="sale">Sale/Consumption</option>
                                                <option value="production">Production/Puja Use</option>
                                                <option value="waste">Waste/Spoilage</option>
                                                <option value="damaged">Damaged</option>
                                                <option value="expired">Expired</option>
                                                <option value="transfer">Transfer Out</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <!-- Second Row - Stock Information -->
                                    <div class="col-md-3">
                                        <div class="form-group">
                                            <label>Current Stock</label>
                                            <input type="text" class="form-control" id="current_stock_display" readonly 
                                                   style="background-color: #f8f9fa;">
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-3">
                                        <div class="form-group">
                                            <label>Remaining Stock</label>
                                            <input type="text" class="form-control" id="remaining_stock_display" readonly 
                                                   style="background-color: #f8f9fa;">
                                            <div id="stock_warning" class="text-warning mt-1" style="display:none;">
                                                <small><i class="bi bi-exclamation-triangle"></i> Stock will go below minimum level</small>
                                            </div>
                                            <div id="insufficient_warning" class="text-danger mt-1" style="display:none;">
                                                <small><i class="bi bi-x-circle"></i> Insufficient stock</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <label for="notes">Notes</label>
                                            <input type="text" class="form-control" id="notes" 
                                                   placeholder="Additional notes">
                                        </div>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <div class="form-group w-100">
                                            <button type="button" id="checkStockBtn" class="btn btn-info w-100 mb-1" disabled>
                                                <i class="bi bi-check-circle"></i> Check Availability
                                            </button>
                                            <button type="button" id="addToListBtn" class="btn btn-success w-100" disabled>
                                                <i class="bi bi-plus-circle"></i> Add to List
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Stock Out Summary for current item -->
                                <div class="card bg-light mt-3" id="currentItemSummary" style="display:none;">
                                    <div class="card-body py-2">
                                        <div class="row small">
                                            <div class="col-md-3">
                                                <strong>Product:</strong> <span id="item_product">-</span>
                                            </div>
                                            <div class="col-md-2">
                                                <strong>Current Stock:</strong> <span id="item_current">-</span>
                                            </div>
                                            <div class="col-md-2">
                                                <strong>Quantity Out:</strong> <span id="item_quantity" class="text-danger">-</span>
                                            </div>
                                            <div class="col-md-2">
                                                <strong>Remaining:</strong> <span id="item_remaining">-</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Reason:</strong> <span id="item_reason">-</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Products List Table -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="bi bi-list"></i> Products to Process</span>
                            <span class="badge bg-primary" id="itemsCount">0 items</span>
                        </div>
                        <div class="card-body">
                            <div id="emptyListMessage" class="text-center text-muted py-4">
                                <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                                <p>No products added yet. Select a warehouse and add products above.</p>
                            </div>
                            <div id="productTableContainer" style="display: none;">
                                <div class="table-responsive">
                                    <table class="table table-bordered table-hover">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="5%">#</th>
                                                <th width="20%">Product</th>
                                                <th width="10%">Code</th>
                                                <th width="10%">Current Stock</th>
                                                <th width="10%">Quantity Out</th>
                                                <th width="10%">Remaining</th>
                                                <th width="8%">Unit</th>
                                                <th width="12%">Reason</th>
                                                <th width="15%">Notes</th>
                                                <th width="5%">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="productsTableBody">
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-info">
                                                <th colspan="4">Total</th>
                                                <th colspan="6">
                                                    <span id="totalItems">0</span> items
                                                </th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Confirmation Checkbox - ALWAYS VISIBLE -->
                    <div class="custom-alert mt-3" style="display: block !important;">
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input" id="confirm_bulk_stock_out">
                            <label class="form-check-label" for="confirm_bulk_stock_out">
                                I confirm that all stock out details are correct and want to proceed with bulk stock out
                            </label>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="form-group text-right mt-3">
                        <button type="button" class="btn btn-secondary" onclick="history.back()">
                            <i class="bi bi-arrow-left"></i> Cancel
                        </button>
                        <button type="button" id="clearAllBtn" class="btn btn-warning">
                            <i class="bi bi-trash"></i> Clear All
                        </button>
                        <button type="button" id="processBulkStockOutBtn" class="btn btn-danger" disabled>
                            <i class="bi bi-arrow-up-circle"></i> Process Bulk Stock Out
                        </button>
                    </div>
                </div>
                <style>
                .custom-alert {
    background-color: #fff3cd; /* light yellow */

    color: #856404; /* dark text */
    padding: 15px 20px;
    border-radius: 8px; /* rounded corners */

    margin-top: 20px;
   
}
    </style>
            `;

            $('#page-container').html(html);
        },

        loadInitialData: function () {
            const self = this;

            // Load warehouses
            TempleAPI.get('/inventory/warehouse')
                .done(function (response) {
                    if (response.success) {
                        self.warehousesData = response.data;
                        const $select = $('#warehouse_id');
                        $select.empty().append('<option value="">Select Warehouse</option>');

                        response.data.forEach(function (warehouse) {
                            if (warehouse.is_active) {
                                $select.append(`
                                    <option value="${warehouse.id}">
                                        ${warehouse.name} (${warehouse.code})
                                    </option>
                                `);
                            }
                        });
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load warehouses', 'error');
                });

            // Load products
            TempleAPI.get('/inventory/products')
                .done(function (response) {
                    if (response.success) {
                        self.productsData = response.data.data || [];
                        self.populateProductDropdown();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load products', 'error');
                });
        },

        populateProductDropdown: function () {
            const $select = $('#product_id');
            $select.empty().append('<option value="">Select Product</option>');

            this.productsData.forEach(function (product) {
                if (!product.is_stockable) return; // Skip non-stockable items

                $select.append(`
                    <option value="${product.id}" 
                            data-code="${product.product_code || ''}"
                            data-unit="${product.uom?.name || ''}"
                            data-stock="${product.current_stock || 0}"
                            data-min="${product.min_stock_level || 0}"
                            data-name="${product.name}"
                            data-type="${product.product_type || 'N/A'}">
                        ${product.name} (${product.product_type || 'N/A'})
                    </option>
                `);
            });
        },

        bindEvents: function () {
            const self = this;

            // Product selection change
            $(document).on('change', '#product_id', function () {
                const productId = $(this).val();
                const warehouseId = $('#warehouse_id').val();

                if (productId) {
                    const $selectedOption = $(this).find('option:selected');

                    // Store the selected product data
                    self.selectedProductData = {
                        product_id: productId,
                        product_code: $selectedOption.data('code') || '',
                        unit: $selectedOption.data('unit') || '',
                        stock: parseFloat($selectedOption.data('stock')) || 0,
                        min_stock: parseFloat($selectedOption.data('min')) || 0,
                        name: $selectedOption.data('name') || $selectedOption.text(),
                        type: $selectedOption.data('type') || 'N/A'
                    };

                    const productName = $selectedOption.text();
                    $('#summary_product').html(`<strong>${productName}</strong>`);

                    // Update item summary with product info
                    $('#item_product').text(self.selectedProductData.name);

                    if (warehouseId) {
                        self.checkLocationStock(productId, warehouseId);
                    } else {
                        // Show product's total stock (not warehouse-specific)
                        const totalStock = self.selectedProductData.stock;
                        const unit = self.selectedProductData.unit;
                        $('#current_stock_display').val(totalStock.toFixed(2) + ' ' + unit);
                        self.currentStock = totalStock;
                    }
                } else {
                    self.selectedProductData = null;
                    self.clearStockDisplay();
                }
            });

            // Warehouse selection change
            $(document).on('change', '#warehouse_id', function () {
                const newWarehouseId = $(this).val();

                // If no current warehouse set (first selection), just set it
                if (!self.currentWarehouseId) {
                    self.currentWarehouseId = newWarehouseId;

                    // If product is selected, refresh stock for new warehouse
                    const productId = $('#product_id').val();
                    if (productId && newWarehouseId) {
                        self.checkLocationStock(productId, newWarehouseId);
                    }
                    return;
                }

                // If changing warehouse and there are products in list
                if (self.currentWarehouseId !== newWarehouseId && self.productsList.length > 0) {
                    self.showWarehouseChangeConfirmation(newWarehouseId);
                } else {
                    self.currentWarehouseId = newWarehouseId;

                    // If product is selected, refresh stock for new warehouse
                    const productId = $('#product_id').val();
                    if (productId && newWarehouseId) {
                        self.checkLocationStock(productId, newWarehouseId);
                    }
                }
            });

            // Quantity input change
            $(document).on('input', '#quantity', function () {
                self.calculateRemaining();
            });

            // Reason change
            $(document).on('change', '#reason', function () {
                const reasonText = $(this).find('option:selected').text();
                $('#item_reason').text(reasonText || '-');
            });

            // Check Stock button
            $(document).on('click', '#checkStockBtn', function () {
                self.checkStockAvailability();
            });

            // Edit product button
            $(document).on('click', '.edit-product', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const productId = String($(this).data('product-id'));
                self.editProductFromList(productId);
            });

            // Remove product from list
            $(document).on('click', '.remove-product', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const productId = String($(this).data('product-id'));
                self.removeProductFromList(productId);
            });

            // Add to List button
            $(document).on('click', '#addToListBtn', function () {
                self.addProductToList();
            });

            // Clear All button
            $(document).on('click', '#clearAllBtn', function () {
                TempleCore.showConfirm(
                    'Clear All Products',
                    'Are you sure you want to remove all products from the list?',
                    function () {
                        self.clearAllProducts();
                    }
                );
            });

            // Process Bulk Stock Out button
            $(document).on('click', '#processBulkStockOutBtn', function () {
                self.processBulkStockOut();
            });

            // Confirmation checkbox - controls button enable/disable
            $(document).on('change', '#confirm_bulk_stock_out', function () {
                const isChecked = $(this).is(':checked');
                const hasProducts = self.productsList.length > 0;
                $('#processBulkStockOutBtn').prop('disabled', !(isChecked && hasProducts));
            });
        },

        checkLocationStock: function (productId, warehouseId) {
            const self = this;

            if (!productId || !warehouseId) return;

            // Show loading state
            $('#current_stock_display').val('Loading...');
            $('#remaining_stock_display').val('');

            TempleAPI.get('/inventory/stock/item-info', {
                product_id: productId,
                warehouse_id: warehouseId
            })
                .done(function (response) {
                    if (response.success && response.data) {
                        const data = response.data;
                        self.currentStock = parseFloat(data.current_stock) || 0;
                        const unit = data.unit || (self.selectedProductData ? self.selectedProductData.unit : '');

                        // Update selectedProductData with current unit
                        if (self.selectedProductData) {
                            self.selectedProductData.unit = unit;
                        }

                        // Update displays
                        $('#current_stock_display').val(self.currentStock.toFixed(3) + ' ' + unit);
                        $('#stock_available').text('Available at this location: ' + self.currentStock.toFixed(3) + ' ' + unit);

                        // Update item summary
                        $('#item_current').text(self.currentStock.toFixed(3) + ' ' + unit);

                        // Enable buttons if stock available
                        if (self.currentStock > 0) {
                            $('#checkStockBtn, #addToListBtn').prop('disabled', false);
                        } else {
                            $('#checkStockBtn, #addToListBtn').prop('disabled', true);
                            self.showAlert('warning', 'No stock available at this location');
                        }

                        // If quantity is entered, recalculate
                        if ($('#quantity').val()) {
                            self.calculateRemaining();
                        }
                    }
                })
                .fail(function () {
                    $('#current_stock_display').val('0.000');
                    self.currentStock = 0;
                    self.showAlert('error', 'Failed to load stock information');
                });
        },

        calculateRemaining: function () {
            const quantity = parseFloat($('#quantity').val()) || 0;
            const remaining = this.currentStock - quantity;
            const unit = this.selectedProductData?.unit || '';
            const minStock = this.selectedProductData?.min_stock || 0;

            // Update displays
            $('#remaining_stock_display').val(remaining.toFixed(3) + ' ' + unit);
            $('#item_quantity').text(quantity.toFixed(3) + ' ' + unit);
            $('#item_remaining').text(remaining.toFixed(3) + ' ' + unit);

            // Show/hide warnings
            $('#stock_warning, #insufficient_warning').hide();
            $('#item_remaining').removeClass('text-danger text-warning text-success');

            if (quantity > this.currentStock) {
                $('#insufficient_warning').show();
                $('#item_remaining').addClass('text-danger');
                $('#addToListBtn').prop('disabled', true);
            } else {
                $('#addToListBtn').prop('disabled', false);

                if (remaining < minStock && remaining >= 0) {
                    $('#stock_warning').show();
                    $('#item_remaining').addClass('text-warning');
                } else if (remaining >= 0) {
                    $('#item_remaining').addClass('text-success');
                }
            }

            // Show current item summary when calculating
            if (quantity > 0) {
                $('#currentItemSummary').show();
            }
        },

        checkStockAvailability: function () {
            const self = this;
            const productId = $('#product_id').val();
            const warehouseId = $('#warehouse_id').val();
            const quantity = parseFloat($('#quantity').val());

            if (!productId || !warehouseId) {
                self.showAlert('warning', 'Please select both warehouse and product');
                return;
            }

            if (!quantity || quantity <= 0) {
                self.showAlert('warning', 'Please enter a valid quantity');
                return;
            }

            // Show loading
            $('#checkStockBtn').prop('disabled', true).html(
                '<span class="spinner-border spinner-border-sm"></span> Checking...'
            );

            TempleAPI.get('/inventory/stock/item-info', {
                product_id: productId,
                warehouse_id: warehouseId
            })
                .done(function (response) {
                    if (response.success && response.data) {
                        const availableStock = parseFloat(response.data.current_stock);
                        const unit = response.data.unit || '';

                        if (availableStock >= quantity) {
                            self.showAlert('success', `Stock available: ${availableStock.toFixed(3)} ${unit}`);
                        } else {
                            self.showAlert('danger', `Insufficient stock. Available: ${availableStock.toFixed(3)} ${unit}`);
                        }

                        // Update current stock display
                        self.currentStock = availableStock;
                        $('#current_stock_display').val(availableStock.toFixed(3) + ' ' + unit);
                        self.calculateRemaining();
                    }
                })
                .fail(function () {
                    self.showAlert('error', 'Failed to check stock availability');
                })
                .always(function () {
                    $('#checkStockBtn').prop('disabled', false).html(
                        '<i class="bi bi-check-circle"></i> Check Availability'
                    );
                });
        },

        addProductToList: function () {
            const self = this;
            const productId = $('#product_id').val();
            const warehouseId = $('#warehouse_id').val();
            const quantity = parseFloat($('#quantity').val());
            const reason = $('#reason').val();
            const notes = $('#notes').val();

            // Validation
            if (!productId || !warehouseId || !quantity || !reason) {
                self.showAlert('warning', 'Please fill all required fields');
                return;
            }

            // Check if quantity exceeds available stock
            if (quantity > self.currentStock) {
                self.showAlert('error', 'Quantity exceeds available stock');
                return;
            }

            // Check if we're editing or adding
            if (self.currentEditingId) {
                // Update existing product
                const index = self.productsList.findIndex(p => p.product_id === self.currentEditingId);

                if (index !== -1) {
                    // Update the product in the list
                    self.productsList[index] = {
                        product_id: productId,
                        product_name: $('#product_id option:selected').text(),
                        product_code: self.selectedProductData.product_code,
                        quantity: quantity,
                        unit: self.selectedProductData.unit,
                        reason: reason,
                        reason_text: $('#reason option:selected').text(),
                        notes: notes,
                        current_stock: self.currentStock,
                        remaining_stock: self.currentStock - quantity
                    };

                    self.showAlert('success', 'Product updated successfully');

                    // Reset button text
                    $('#addToListBtn').html('<i class="bi bi-plus-circle"></i> Add to List');
                    self.currentEditingId = null;
                }
            } else {
                // Check for duplicate only when adding new
                const existingProduct = self.productsList.find(p => p.product_id === productId);
                if (existingProduct) {
                    self.showAlert('warning', 'This product is already in the list. Click edit to modify it.');
                    return;
                }

                // Add new product to list
                const product = {
                    product_id: productId,
                    product_name: $('#product_id option:selected').text(),
                    product_code: self.selectedProductData.product_code,
                    quantity: quantity,
                    unit: self.selectedProductData.unit,
                    reason: reason,
                    reason_text: $('#reason option:selected').text(),
                    notes: notes,
                    current_stock: self.currentStock,
                    remaining_stock: self.currentStock - quantity
                };

                self.productsList.push(product);
                self.showAlert('success', 'Product added to list');
            }

            self.updateProductsTable();
            self.clearProductForm();
        },

        removeProductFromList: function (productId) {
            const self = this;
            const product = self.productsList.find(p => p.product_id === productId);

            if (!product) {
                return;
            }

            // Show confirmation before removing
            TempleCore.showConfirm(
                'Remove Product',
                `Are you sure you want to remove ${product.product_name} from the list?`,
                function () {
                    const index = self.productsList.findIndex(p => p.product_id === productId);
                    if (index !== -1) {
                        self.productsList.splice(index, 1);
                        self.updateProductsTable();
                        self.showAlert('success', `${product.product_name} removed from list`);
                    }
                }
            );
        },

        showWarehouseChangeConfirmation: function (newWarehouseId) {
            const self = this;

            TempleCore.showConfirm(
                'Change Warehouse',
                'Changing the warehouse will clear all items from the list. Do you want to continue?',
                function () {
                    // Clear all products
                    self.productsList = [];
                    self.updateProductsTable();
                    // Update warehouse
                    self.currentWarehouseId = newWarehouseId;
                    // Clear any form data
                    self.clearProductForm();
                    self.showAlert('info', 'Warehouse changed. All items have been cleared from the list.');

                    // If product is selected, refresh stock for new warehouse
                    const productId = $('#product_id').val();
                    if (productId && newWarehouseId) {
                        self.checkLocationStock(productId, newWarehouseId);
                    }
                },
                function () {
                    // On cancel, revert to previous warehouse
                    $('#warehouse_id').val(self.currentWarehouseId || '');
                }
            );
        },

        editProductFromList: function (productId) {
            const self = this;
            const product = self.productsList.find(p => p.product_id === productId);

            if (!product) {
                return;
            }

            // Set warehouse if not already set
            if (!$('#warehouse_id').val()) {
                $('#warehouse_id').val(self.currentWarehouseId);
            }

            // Load product data into form
            $('#product_id').val(product.product_id).trigger('change');

            // Wait for product change event to complete, then set other fields
            setTimeout(function () {
                $('#quantity').val(product.quantity);
                $('#reason').val(product.reason).trigger('change');
                $('#notes').val(product.notes || '');

                // Store the editing ID
                self.currentEditingId = product.product_id;

                // Change button text
                $('#addToListBtn').html('<i class="bi bi-refresh"></i> Update Product');

                // Show current item summary
                $('#currentItemSummary').show();

                // Calculate remaining
                self.calculateRemaining();
            }, 100);

            // Scroll to form
            $('html, body').animate({
                scrollTop: $('#addProductForm').offset().top - 100
            }, 500);

            self.showAlert('info', 'Product loaded for editing. Update details and click "Update Product".');
        },

        clearAllProducts: function () {
            this.productsList = [];
            this.updateProductsTable();
            this.clearProductForm();
            this.showAlert('info', 'All products have been removed from the list');
        },

        clearProductForm: function () {
            $('#product_id').val('').trigger('change');
            $('#quantity').val('');
            $('#reason').val('');
            $('#notes').val('');
            $('#current_stock_display').val('');
            $('#remaining_stock_display').val('');
            $('#stock_available').text('');
            $('#currentItemSummary').hide();
            $('#stock_warning, #insufficient_warning').hide();

            // Reset button text if in edit mode
            if (this.currentEditingId) {
                $('#addToListBtn').html('<i class="bi bi-plus-circle"></i> Add to List');
                this.currentEditingId = null;
            }

            this.currentStock = 0;
            this.selectedProductData = null;
        },

        updateProductsTable: function () {
            const self = this;

            if (self.productsList.length === 0) {
                $('#emptyListMessage').show();
                $('#productTableContainer').hide();
                $('#clearAllBtn').hide();
                // Always keep the confirmation section visible
                // Just disable the button when no products
                $('#processBulkStockOutBtn').prop('disabled', true);
            } else {
                $('#emptyListMessage').hide();
                $('#productTableContainer').show();
                $('#clearAllBtn').show();

                // Check confirmation checkbox state
                const isConfirmed = $('#confirm_bulk_stock_out').is(':checked');
                $('#processBulkStockOutBtn').prop('disabled', !isConfirmed);

                // Update table body
                let tableHtml = '';

                self.productsList.forEach(function (product, index) {
                    const rowClass = product.remaining_stock < 0 ? 'table-danger' : '';
                    tableHtml += `
                        <tr class="${rowClass}">
                            <td>${index + 1}</td>
                            <td>${product.product_name}</td>
                            <td>${product.product_code || '-'}</td>
                            <td>${product.current_stock.toFixed(3)}</td>
                            <td class="text-danger">${product.quantity.toFixed(3)}</td>
                            <td class="${product.remaining_stock < 0 ? 'text-danger' : ''}">${product.remaining_stock.toFixed(3)}</td>
                            <td>${product.unit || '-'}</td>
                            <td>${product.reason_text}</td>
                            <td>${product.notes || '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-product" 
                                        data-product-id="${product.product_id}" 
                                        title="Edit">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button class="btn btn-sm btn-danger remove-product" 
                                        data-product-id="${product.product_id}" 
                                        title="Remove">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });

                $('#productsTableBody').html(tableHtml);

                // Update counts
                $('#itemsCount').text(self.productsList.length + ' items');
                $('#totalItems').text(self.productsList.length);
            }
        },

        processBulkStockOut: function () {
            const self = this;

            // Validate
            if (self.productsList.length === 0) {
                self.showAlert('warning', 'No products in the list');
                return;
            }

            if (!$('#confirm_bulk_stock_out').is(':checked')) {
                self.showAlert('warning', 'Please confirm the bulk stock out details');
                return;
            }

            const warehouseName = $('#warehouse_id option:selected').text();
            const itemsCount = self.productsList.length;

            // Final confirmation
            TempleCore.showConfirm(
                'Confirm Bulk Stock Out',
                `Are you sure you want to process bulk stock out?<br><br>
                Warehouse: ${warehouseName}<br>
                Total Items: ${itemsCount}`,
                function () {
                    self.submitBulkStockOut();
                }
            );
        },

        submitBulkStockOut: function () {
            const self = this;

            // Show loading
            $('#processBulkStockOutBtn').prop('disabled', true).html(
                '<span class="spinner-border spinner-border-sm"></span> Processing...'
            );

            const formData = {
                warehouse_id: $('#warehouse_id').val(),
                reference_number: $('#reference_number').val() || null,
                items: self.productsList.map(function (product) {
                    return {
                        product_id: product.product_id,
                        quantity: product.quantity,
                        reason: product.reason,
                        notes: product.notes
                    };
                })
            };

            TempleAPI.post('/inventory/stock/bulk-out', formData)
                .done(function (response) {
                    if (response.success) {
                        self.showAlert('success', 'Bulk stock out processed successfully');

                        // Show summary
                        const summaryHtml = `
                            <div class="alert alert-info mt-3">
                                <h6>Transaction Summary</h6>
                                <p>Reference Number: ${response.data.reference_number}<br>
                                Total Items Processed: ${response.data.total_items}<br>
                                Total Value: ${TempleCore.formatCurrency(response.data.total_value)}</p>
                                
                                <h6 class="mt-3">Items with Low Stock Warning:</h6>
                                <ul>
                                ${response.data.items
                                .filter(item => item.below_minimum)
                                .map(item => `<li>${item.movement.product.name} - Stock: ${item.new_stock.toFixed(3)}</li>`)
                                .join('') || '<li>None</li>'}
                                </ul>
                            </div>
                        `;
                        $('#alertContainer').append(summaryHtml);

                        // Clear form and list
                        self.clearAllProducts();
                        $('#warehouse_id').val('').trigger('change');
                        $('#reference_number').val('');
                        $('#confirm_bulk_stock_out').prop('checked', false);

                        // Redirect after delay
                        setTimeout(function () {
                            TempleRouter.navigate('inventory/stock-movement');
                        }, 3000);
                    } else {
                        // Handle insufficient stock error
                        if (response.insufficient_products) {
                            let errorMsg = 'Insufficient stock for the following products:<ul>';
                            response.insufficient_products.forEach(function (item) {
                                errorMsg += `<li>${item.product}: Requested ${item.requested}, Available ${item.available}</li>`;
                            });
                            errorMsg += '</ul>';
                            self.showAlert('danger', errorMsg);
                        } else {
                            self.showAlert('danger', response.message || 'Failed to process bulk stock out');
                        }
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'An error occurred';
                    self.showAlert('danger', error);
                })
                .always(function () {
                    $('#processBulkStockOutBtn').prop('disabled', false).html(
                        '<i class="bi bi-arrow-up-circle"></i> Process Bulk Stock Out'
                    );
                });
        },

        clearStockDisplay: function () {
            $('#current_stock_display').val('');
            $('#remaining_stock_display').val('');
            $('#stock_available').text('');
            $('#currentItemSummary').hide();
            $('#stock_warning, #insufficient_warning').hide();
            this.currentStock = 0;
            this.selectedProductData = null;
        },

        showAlert: function (type, message) {
            const alertHtml = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#alertContainer').html(alertHtml);

            // Auto-hide success alerts
            if (type === 'success' || type === 'info') {
                setTimeout(function () {
                    $('.alert').fadeOut();
                }, 5000);
            }
        }
    };

})(jQuery, window);