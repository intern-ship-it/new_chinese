// js/pages/inventory/bulk-stock-in.js
window.InventoryBulkStockInPage = {
    stockItems: [],
    editMode: false,
    editId: null,
    commonReferenceNumber: null,

    init: function (params) {
        this.editMode = params?.mode === 'edit';
        this.editId = params?.id || null;

        if (this.editMode && this.editId) {
            this.loadExistingData(this.editId);
        } else {
            this.setupPage();
            this.loadWarehouses();
            this.loadProducts();
            this.bindEvents();
            this.generateReferenceNumber();
        }
    },

    generateReferenceNumber: function () {
        this.commonReferenceNumber = 'BULK-STK-' + Date.now();
    },

    setupPage: function () {
        const html = `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h4 class="mb-0">
                                    <i class="bi bi-box-arrow-in-down-fill"></i> 
                                    ${this.editMode ? 'Edit' : ''} Bulk Stock In
                                </h4>
                                <small class="d-block mt-1">Reference: ${this.commonReferenceNumber}</small>
                            </div>
                            <div class="card-body">
                                <!-- Warehouse Selection (Common for all) -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Storage Location <span class="text-danger">*</span></label>
                                            <select id="warehouse_id" class="form-control" required ${this.editMode ? 'disabled' : ''}>
                                                <option value="">Select Warehouse</option>
                                            </select>
                                            <small class="text-muted">This warehouse will apply to all items in this bulk operation</small>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Stock In Type <span class="text-danger">*</span></label>
                                            <select id="movement_subtype" class="form-control" required>
                                                <option value="">Select Type</option>
                                                <option value="OPENING_STOCK">Opening Stock</option>
                                                <option value="PURCHASE">Purchase</option>
                                                <option value="DONATION_RECEIVED">Donation Received</option>
                                                <option value="ADJUSTMENT">Adjustment</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Product Addition Section -->
                                <div class="card mb-4">
                                    <div class="card-header bg-light">
                                        <h5 class="mb-0">Add Product</h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-4">
                                                <div class="form-group">
                                                    <label>Select Product</label>
                                                    <select id="product_id" class="form-control">
                                                        <option value="">Select Product</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label>Quantity</label>
                                                    <input type="number" id="quantity" class="form-control" 
                                                           step="0.001" min="0.001" placeholder="0.00">
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label>Unit Cost</label>
                                                    <input type="number" id="unit_cost" class="form-control" 
                                                           step="0.01" min="0" placeholder="0.00">
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label>Batch Number</label>
                                                    <input type="text" id="batch_number" class="form-control" 
                                                           placeholder="Optional">
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label>Expiry Date</label>
                                                    <input type="date" id="expiry_date" class="form-control">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-10">
                                                <div class="form-group">
                                                    <label>Notes</label>
                                                    <input type="text" id="notes" class="form-control" 
                                                           placeholder="Optional notes for this item">
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label>&nbsp;</label>
                                                    <button type="button" id="addItemBtn" class="btn btn-success btn-block">
                                                        <i class="bi bi-plus-circle"></i> Add Item
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Items List -->
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <h5 class="mb-0">Stock Items List</h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="table-responsive">
                                            <table class="table table-bordered" id="stockItemsTable">
                                                <thead>
                                                    <tr>
                                                        <th width="5%">#</th>
                                                        <th width="20%">Product</th>
                                                        <th width="10%">Quantity</th>
                                                        <th width="10%">Unit Cost</th>
                                                        <th width="10%">Total Cost</th>
                                                        <th width="10%">Batch</th>
                                                        <th width="10%">Expiry</th>
                                                        <th width="15%">Notes</th>
                                                        <th width="10%">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="stockItemsBody">
                                                    <tr id="emptyRow">
                                                        <td colspan="9" class="text-center text-muted">
                                                            No items added yet. Please add products using the form above.
                                                        </td>
                                                    </tr>
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <th colspan="4" class="text-right">Grand Total:</th>
                                                        <th id="grandTotal">0.00</th>
                                                        <th colspan="4"></th>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Action Buttons -->
                                <div class="row mt-4">
                                    <div class="col-12 text-right">
                                        <button type="button" class="btn btn-secondary" onclick="history.back()">
                                            <i class="bi bi-arrow-left"></i> Cancel
                                        </button>
                                        <button type="button" id="saveAsDraftBtn" class="btn btn-warning">
                                            <i class="bi bi-save"></i> Save as Draft
                                        </button>
                                        <button type="button" id="processBulkStockInBtn" class="btn btn-primary">
                                            <i class="bi bi-check-circle"></i> Process Bulk Stock In
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Edit Item Modal -->
                <div class="modal fade" id="editItemModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Edit Item</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" id="editItemIndex">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label>Product</label>
                                            <input type="text" id="editProductName" class="form-control" readonly>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Quantity</label>
                                            <input type="number" id="editQuantity" class="form-control" 
                                                   step="0.001" min="0.001">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Unit Cost</label>
                                            <input type="number" id="editUnitCost" class="form-control" 
                                                   step="0.01" min="0">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Batch Number</label>
                                            <input type="text" id="editBatchNumber" class="form-control">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label>Expiry Date</label>
                                            <input type="date" id="editExpiryDate" class="form-control">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label>Notes</label>
                                            <textarea id="editNotes" class="form-control" rows="2"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="InventoryBulkStockInPage.saveEditedItem()">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#page-container').html(html);
    },

    loadWarehouses: function () {
        TempleAPI.get('/inventory/warehouse').done(function (response) {
            if (response.success) {
                let options = '<option value="">Select Warehouse</option>';
                response.data.forEach(function (warehouse) {
                    if (warehouse.is_active) {
                        options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                    }
                });
                $('#warehouse_id').html(options);
            }
        });
    },

    loadProducts: function () {
        TempleAPI.get('/inventory/products').done(function (response) {
            if (response.success) {
                let options = '<option value="">Select Product</option>';
                const products = response.data.data || response.data || [];

                products.forEach(function (product) {
                    if (product.is_active && product.is_stockable) {
                        options += `<option value="${product.id}" 
                                           data-name="${product.name}"
                                           data-code="${product.product_code}"
                                           data-uom="${product.uom?.name || ''}"
                                           data-current-stock="${product.current_stock || 0}">
                                       ${product.name} (${product.product_code})
                                   </option>`;
                    }
                });

                $('#product_id').html(options);
            }
        });
    },

    bindEvents: function () {
        const self = this;

        // Warehouse change handler
        $('#warehouse_id').on('change', function () {
            const $select = $(this); // keep reference
            const newWarehouseId = $select.val();

            if (InventoryBulkStockInPage.stockItems.length > 0 && newWarehouseId) {
                TempleCore.showConfirm(
                    'Change Warehouse',
                    'Changing the warehouse will clear all items from the list. Do you want to continue?',
                    function () {
                        // User confirmed
                        InventoryBulkStockInPage.stockItems = [];
                        InventoryBulkStockInPage.renderItemsList();
                        TempleCore.showToast('Items list cleared due to warehouse change', 'info');
                        $select.data('previous-value', newWarehouseId); // update stored value
                    },
                    function () {
                        // User cancelled
                        const previousWarehouse = $select.data('previous-value') || '';
                        $select.val(previousWarehouse);
                    }
                );
            } else {
                // No items, just update previous
                $select.data('previous-value', newWarehouseId);
            }
        });


        // Store initial warehouse value
        $('#warehouse_id').data('previous-value', $('#warehouse_id').val());

        // Add item button
        $('#addItemBtn').on('click', function () {
            self.addItem();
        });

        // Process bulk stock in
        $('#processBulkStockInBtn').on('click', function () {
            self.processBulkStockIn();
        });

        // Save as draft
        $('#saveAsDraftBtn').on('click', function () {
            self.saveAsDraft();
        });

        // Auto-calculate on quantity/cost change
        $('#quantity, #unit_cost').on('input', function () {
            const quantity = parseFloat($('#quantity').val()) || 0;
            const unitCost = parseFloat($('#unit_cost').val()) || 0;
            // Can show total in UI if needed
        });

        // Movement subtype change handler
        $('#movement_subtype').on('change', function () {
            const selectedType = $(this).val();

            // If Opening Stock is selected and there are items, warn the user
            if (selectedType === 'OPENING_STOCK' && self.stockItems.length > 0) {
                TempleCore.showToast('Note: Opening Stock validation will be checked for each product', 'info');
            }
        });
    },

    addItem: function () {
        // Validation
        const warehouseId = $('#warehouse_id').val();
        if (!warehouseId) {
            TempleCore.showToast('Please select warehouse first', 'warning');
            return;
        }

        const productId = $('#product_id').val();
        const quantity = $('#quantity').val();
        const unitCost = $('#unit_cost').val() || 0;

        if (!productId || !quantity) {
            TempleCore.showToast('Please select product and enter quantity', 'warning');
            return;
        }

        // Check for duplicate
        const duplicate = this.stockItems.find(item => item.product_id === productId);
        if (duplicate) {
            TempleCore.showToast('This product is already added to the list', 'error');
            return;
        }

        const selectedOption = $('#product_id option:selected');
        const productName = selectedOption.data('name');
        const productCode = selectedOption.data('code');
        const uom = selectedOption.data('uom');

        // Check for opening stock validation if type is OPENING_STOCK
        const movementSubtype = $('#movement_subtype').val();
        if (movementSubtype === 'OPENING_STOCK') {
            this.validateOpeningStock(productId, warehouseId, function (canAdd) {
                if (canAdd) {
                    InventoryBulkStockInPage.addItemToList({
                        product_id: productId,
                        product_name: productName,
                        product_code: productCode,
                        quantity: parseFloat(quantity),
                        unit_cost: parseFloat(unitCost),
                        batch_number: $('#batch_number').val(),
                        expiry_date: $('#expiry_date').val(),
                        notes: $('#notes').val(),
                        uom: uom,
                        total_cost: parseFloat(quantity) * parseFloat(unitCost)
                    });
                }
            });
        } else {
            this.addItemToList({
                product_id: productId,
                product_name: productName,
                product_code: productCode,
                quantity: parseFloat(quantity),
                unit_cost: parseFloat(unitCost),
                batch_number: $('#batch_number').val(),
                expiry_date: $('#expiry_date').val(),
                notes: $('#notes').val(),
                uom: uom,
                total_cost: parseFloat(quantity) * parseFloat(unitCost)
            });
        }
    },

    addItemToList: function (item) {
        this.stockItems.push(item);
        this.renderItemsList();
        this.clearItemForm();
        TempleCore.showToast('Item added successfully', 'success');
    },

    renderItemsList: function () {
        const tbody = $('#stockItemsBody');
        tbody.empty();

        if (this.stockItems.length === 0) {
            tbody.html(`
                <tr id="emptyRow">
                    <td colspan="9" class="text-center text-muted">
                        No items added yet. Please add products using the form above.
                    </td>
                </tr>
            `);
            $('#grandTotal').text('0.00');
            return;
        }

        let grandTotal = 0;

        this.stockItems.forEach((item, index) => {
            const total = item.total_cost;
            grandTotal += total;

            const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${item.product_name}</strong><br>
                        <small class="text-muted">${item.product_code}</small>
                    </td>
                    <td>${item.quantity.toFixed(3)} ${item.uom || ''}</td>
                    <td>${item.unit_cost.toFixed(2)}</td>
                    <td>${total.toFixed(2)}</td>
                    <td>${item.batch_number || '-'}</td>
                    <td>${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</td>
                    <td>${item.notes || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="InventoryBulkStockInPage.editItem(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="InventoryBulkStockInPage.removeItem(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        $('#grandTotal').text(grandTotal.toFixed(2));
    },

    editItem: function (index) {
        const item = this.stockItems[index];

        $('#editItemIndex').val(index);
        $('#editProductName').val(item.product_name + ' (' + item.product_code + ')');
        $('#editQuantity').val(item.quantity);
        $('#editUnitCost').val(item.unit_cost);
        $('#editBatchNumber').val(item.batch_number);
        $('#editExpiryDate').val(item.expiry_date);
        $('#editNotes').val(item.notes);

        const modal = new bootstrap.Modal(document.getElementById('editItemModal'));
        modal.show();
    },

    saveEditedItem: function () {
        const index = parseInt($('#editItemIndex').val());
        const item = this.stockItems[index];

        item.quantity = parseFloat($('#editQuantity').val());
        item.unit_cost = parseFloat($('#editUnitCost').val());
        item.batch_number = $('#editBatchNumber').val();
        item.expiry_date = $('#editExpiryDate').val();
        item.notes = $('#editNotes').val();
        item.total_cost = item.quantity * item.unit_cost;

        this.renderItemsList();

        const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
        modal.hide();

        TempleCore.showToast('Item updated successfully', 'success');
    },

    removeItem: function (index) {
        TempleCore.showConfirm(
            'Remove Item',
            'Are you sure you want to remove this item?',
            () => {
                this.stockItems.splice(index, 1);
                this.renderItemsList();
                TempleCore.showToast('Item removed successfully', 'success');
            }
        );
    },

    clearItemForm: function () {
        $('#product_id').val('');
        $('#quantity').val('');
        $('#unit_cost').val('');
        $('#batch_number').val('');
        $('#expiry_date').val('');
        $('#notes').val('');
    },

    validateOpeningStock: function (productId, warehouseId, callback) {
        TempleAPI.get('/inventory/stock/validate-opening', {
            product_id: productId,
            warehouse_id: warehouseId
        }).done(function (response) {
            if (response.has_opening_stock) {
                TempleCore.showToast('Opening stock already exists for this product in selected warehouse', 'error');
                callback(false);
            } else {
                callback(true);
            }
        }).fail(function () {
            // If validation endpoint doesn't exist, proceed
            callback(true);
        });
    },

    processBulkStockIn: function () {
        const self = this;

        // Validation
        if (this.stockItems.length === 0) {
            TempleCore.showToast('Please add at least one item', 'warning');
            return;
        }

        const warehouseId = $('#warehouse_id').val();
        const movementSubtype = $('#movement_subtype').val();

        if (!warehouseId || !movementSubtype) {
            TempleCore.showToast('Please select warehouse and stock type', 'warning');
            return;
        }

        const data = {
            warehouse_id: warehouseId,
            movement_subtype: movementSubtype,
            reference_number: this.commonReferenceNumber,
            items: this.stockItems,
            is_draft: false
        };

        // Disable button
        $('#processBulkStockInBtn').prop('disabled', true)
            .html('<i class="bi bi-hourglass-split"></i> Processing...');

        TempleAPI.post('/inventory/stock-in/bulk', data)
            .done(function (response) {
                if (response.success) {
                    TempleCore.showToast('Bulk stock in processed successfully', 'success');
                    setTimeout(() => {
                        TempleRouter.navigate('inventory/stock-movement');
                    }, 1500);
                } else {
                    TempleCore.showToast(response.message, 'error');
                }
            })
            .fail(function (xhr) {
                const response = xhr.responseJSON;
                TempleCore.showToast(response?.message || 'Failed to process bulk stock in', 'error');
            })
            .always(function () {
                $('#processBulkStockInBtn').prop('disabled', false)
                    .html('<i class="bi bi-check-circle"></i> Process Bulk Stock In');
            });
    },

    saveAsDraft: function () {
        // Similar to processBulkStockIn but with is_draft: true
        const self = this;

        if (this.stockItems.length === 0) {
            TempleCore.showToast('Please add at least one item', 'warning');
            return;
        }

        const data = {
            warehouse_id: $('#warehouse_id').val(),
            movement_subtype: $('#movement_subtype').val(),
            reference_number: this.commonReferenceNumber,
            items: this.stockItems,
            is_draft: true
        };

        TempleAPI.post('/inventory/stock-in/bulk', data)
            .done(function (response) {
                if (response.success) {
                    TempleCore.showToast('Draft saved successfully', 'success');
                }
            });
    },

    loadExistingData: function (referenceNumber) {
        const self = this;

        TempleAPI.get('/inventory/stock-in/bulk/' + referenceNumber)
            .done(function (response) {
                if (response.success) {
                    self.setupPage();
                    self.loadWarehouses();
                    self.loadProducts();
                    self.bindEvents();

                    // Set the data
                    setTimeout(() => {
                        $('#warehouse_id').val(response.data.warehouse_id).prop('disabled', true);
                        $('#movement_subtype').val(response.data.movement_subtype);
                        self.commonReferenceNumber = response.data.reference_number;
                        self.stockItems = response.data.items;
                        self.renderItemsList();
                    }, 500);
                }
            });
    }
};