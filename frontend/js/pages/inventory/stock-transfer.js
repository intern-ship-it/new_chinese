// js/pages/inventory/stock-transfer.js
(function ($, window) {
    'use strict';

    window.InventoryStockTransferPage = {
        currentSourceStock: 0,
        currentDestStock: 0,
        selectedProduct: null,

        init: function () {
            this.render();
            this.loadInitialData();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-3">
                        <div class="col-12">
                            <h4><i class="bi bi-arrow-left-right"></i> Stock Transfer Between Warehouses</h4>
                        </div>
                    </div>
                    
                    <!-- Alert Container -->
                    <div id="alertContainer"></div>
                    
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h5 class="mb-0">Transfer Details</h5>
                        </div>
                        <div class="card-body">
                            <form id="transferForm">
                                <!-- Product Selection -->
                                <div class="card mb-3 bg-light">
                                    <div class="card-body">
                                        <h6 class="card-title">Product Information</h6>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="product_id">Select Product <span class="text-danger">*</span></label>
                                                    <select class="form-control" id="product_id" name="product_id" required>
                                                        <option value="">Select Product</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-group">
                                                    <label>Product Code</label>
                                                    <input type="text" class="form-control" id="product_code" readonly>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-group">
                                                    <label>Unit</label>
                                                    <input type="text" class="form-control" id="product_unit" readonly>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Transfer Details -->
                                <div class="row">
                                    <!-- Source Warehouse -->
                                    <div class="col-md-5">
                                        <div class="card border-danger">
                                            <div class="card-header bg-danger text-white">
                                                <h6 class="mb-0">From (Source)</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-group">
                                                    <label>Source Warehouse <span class="text-danger">*</span></label>
                                                    <select class="form-control" id="from_warehouse_id" name="from_warehouse_id" required>
                                                        <option value="">Select Source</option>
                                                    </select>
                                                </div>
                                                <div class="form-group">
                                                    <label>Available Stock</label>
                                                    <input type="text" class="form-control" id="source_stock" readonly>
                                                    <small class="text-muted" id="source_stock_info"></small>
                                                </div>
                                                <div class="form-group">
                                                    <label>After Transfer</label>
                                                    <input type="text" class="form-control" id="source_after" readonly>
                                                    <div id="source_warning" class="text-danger mt-1" style="display:none;">
                                                        <small><i class="bi bi-exclamation-triangle"></i> Stock will be below minimum</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Transfer Arrow -->
                                    <div class="col-md-2 text-center d-flex align-items-center justify-content-center">
                                        <div>
                                            <i class="bi bi-arrow-right-circle-fill text-primary" style="font-size: 3rem;"></i>
                                            <div class="mt-3">
                                                <label>Quantity <span class="text-danger">*</span></label>
                                                <input type="number" class="form-control text-center" id="quantity" 
                                                       name="quantity" step="0.001" min="0.001" required>
                                                <small class="text-muted" id="quantity_unit">units</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Destination Warehouse -->
                                    <div class="col-md-5">
                                        <div class="card border-success">
                                            <div class="card-header bg-success text-white">
                                                <h6 class="mb-0">To (Destination)</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-group">
                                                    <label>Destination Warehouse <span class="text-danger">*</span></label>
                                                    <select class="form-control" id="to_warehouse_id" name="to_warehouse_id" required>
                                                        <option value="">Select Destination</option>
                                                    </select>
                                                </div>
                                                <div class="form-group">
                                                    <label>Current Stock</label>
                                                    <input type="text" class="form-control" id="dest_stock" readonly>
                                                </div>
                                                <div class="form-group">
                                                    <label>After Transfer</label>
                                                    <input type="text" class="form-control" id="dest_after" readonly>
                                                    <div id="dest_info" class="text-success mt-1" style="display:none;">
                                                        <small><i class="bi bi-check-circle"></i> Stock will be updated</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Additional Information -->
                                <div class="card mt-3">
                                    <div class="card-body">
                                        <h6 class="card-title">Additional Information</h6>
                                        <div class="row">
                                            <div class="col-md-4">
                                                <div class="form-group">
                                                    <label>Batch Number</label>
                                                    <input type="text" class="form-control" id="batch_number" 
                                                           name="batch_number" placeholder="Optional">
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-group">
                                                    <label>Expiry Date</label>
                                                    <input type="date" class="form-control" id="expiry_date" 
                                                           name="expiry_date">
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-group">
                                                    <label>Transfer Reason <span class="text-danger">*</span></label>
                                                    <select class="form-control" id="transfer_reason" name="transfer_reason" required>
                                                        <option value="">Select Reason</option>
                                                        <option value="Stock Balancing">Stock Balancing</option>
                                                        <option value="High Demand">High Demand at Destination</option>
                                                        <option value="Low Stock">Low Stock at Destination</option>
                                                        <option value="Warehouse Reorganization">Warehouse Reorganization</option>
                                                        <option value="Emergency Request">Emergency Request</option>
                                                        <option value="Seasonal Adjustment">Seasonal Adjustment</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-12">
                                                <div class="form-group">
                                                    <label>Notes</label>
                                                    <textarea class="form-control" id="notes" name="notes" 
                                                              rows="2" placeholder="Additional notes about this transfer"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Transfer Summary -->
                                <div class="card mt-3 bg-light">
                                    <div class="card-body">
                                        <h6 class="card-title">Transfer Summary</h6>
                                        <div class="row">
                                            <div class="col-md-3">
                                                <strong>Product:</strong>
                                                <div id="summary_product">-</div>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>From:</strong>
                                                <div id="summary_from">-</div>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>To:</strong>
                                                <div id="summary_to">-</div>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Quantity:</strong>
                                                <div id="summary_quantity" class="text-primary">-</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Confirmation -->
                                <div class="alert alert-warning mt-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="confirm_transfer" required>
                                        <label class="form-check-label" for="confirm_transfer">
                                            I confirm that the transfer details are correct and want to proceed
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Actions -->
                                <div class="form-group text-right">
                                    <button type="button" class="btn btn-secondary" onclick="history.back()">
                                        <i class="bi bi-arrow-left"></i> Cancel
                                    </button>
                                    <button type="button" id="checkFeasibilityBtn" class="btn btn-warning" disabled style="display:none;">
                                        <i class="bi bi-check-circle"></i> Check Feasibility
                                    </button>
                                    <button type="submit" id="processTransferBtn" class="btn btn-success" disabled>
                                        <i class="bi bi-arrow-left-right"></i> Process Transfer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadInitialData: function () {
            this.loadProducts();
            this.loadWarehouses();
        },

        loadProducts: function () {
            TempleAPI.get('/inventory/products')
                .done(function (response) {
                    if (response.success) {
                        const $select = $('#product_id');
                        $select.empty().append('<option value="">Select Product</option>');

                        const products = response.data.data || [];
                        products.forEach(function (product) {
                            $select.append(`
                                <option value="${product.id}" 
                                        data-code="${product.product_code}"
                                        data-unit="${product.uom?.name || ''}"
                                        data-min="${product.min_stock_level || 0}">
                                         ${product.name} (${product.product_type})
                                         
                                </option>
                            `);
                        });
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load products', 'error');
                });
        },

        loadWarehouses: function () {
            TempleAPI.get('/inventory/warehouse')
                .done(function (response) {
                    if (response.success) {
                        const warehouses = response.data.filter(w => w.is_active);

                        let options = '<option value="">Select Source</option>';
                        warehouses.forEach(function (warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name} (${warehouse.code})</option>`;
                        });
                        $('#from_warehouse_id').html(options);

                        options = '<option value="">Select Destination</option>';
                        warehouses.forEach(function (warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name} (${warehouse.code})</option>`;
                        });
                        $('#to_warehouse_id').html(options);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load warehouses', 'error');
                });
        },

        bindEvents: function () {
            const self = this;

            // Product selection
            $('#product_id').on('change', function () {
                const $selected = $(this).find('option:selected');
                const code = $selected.data('code') || '';
                const unit = $selected.data('unit') || '';

                $('#product_code').val(code);
                $('#product_unit').val(unit);
                $('#quantity_unit').text(unit);

                self.selectedProduct = {
                    id: $(this).val(),
                    name: $selected.text(),
                    code: code,
                    unit: unit,
                    min_stock: $selected.data('min') || 0
                };

                self.updateSummary();
                self.checkStockLevels();
            });

            // Warehouse selection
            $('#from_warehouse_id, #to_warehouse_id').on('change', function () {
                self.validateWarehouses();
                self.checkStockLevels();
                self.updateSummary();
            });

            // Quantity change
            $('#quantity').on('input', function () {
                self.calculateTransferImpact();
                self.updateSummary();
            });

            // Transfer reason change
            $('#transfer_reason').on('change', function () {
                self.updateButtonStates();
            });

            // Check feasibility
            $('#checkFeasibilityBtn').on('click', function () {
                self.checkTransferFeasibility();
            });

            // Form submission
            $('#transferForm').on('submit', function (e) {
                e.preventDefault();
                self.processTransfer();
            });
        },

        validateWarehouses: function () {
            const fromId = $('#from_warehouse_id').val();
            const toId = $('#to_warehouse_id').val();

            if (fromId && toId && fromId === toId) {
                this.showAlert('warning', 'Source and destination warehouses cannot be the same');
                $('#to_warehouse_id').val('').trigger('change');
            }
        },

        checkStockLevels: function () {
            const self = this;
            const productId = $('#product_id').val();
            const fromWarehouseId = $('#from_warehouse_id').val();
            const toWarehouseId = $('#to_warehouse_id').val();

            // Check source warehouse stock
            if (productId && fromWarehouseId) {
                TempleAPI.post('/inventory/stock/check-location', {
                    product_id: productId,
                    warehouse_id: fromWarehouseId
                })
                    .done(function (response) {
                        if (response.success) {
                            self.currentSourceStock = response.data.location_stock;
                            const stock = parseFloat(self.currentSourceStock) || 0;
                            $('#source_stock').val(stock.toFixed(3) + ' ' + response.data.unit);

                            $('#source_stock_info').text('Min level: ' + (self.selectedProduct?.min_stock || 0));
                            self.calculateTransferImpact();
                        }
                    });
            }

            // Check destination warehouse stock
            if (productId && toWarehouseId) {
                TempleAPI.post('/inventory/stock/check-location', {
                    product_id: productId,
                    warehouse_id: toWarehouseId
                })
                    .done(function (response) {
                        if (response.success) {
                            self.currentDestStock = response.data.location_stock;
                            const destStock = parseFloat(self.currentDestStock) || 0;
                            $('#dest_stock').val(destStock.toFixed(3) + ' ' + response.data.unit);

                            self.calculateTransferImpact();
                        }
                    });
            }
        },

        calculateTransferImpact: function () {
            const quantity = parseFloat($('#quantity').val()) || 0;
            const unit = this.selectedProduct?.unit || '';

            if (quantity > 0) {
                // Source impact
                const sourceAfter = this.currentSourceStock - quantity;
                const safeSourceAfter = parseFloat(sourceAfter) || 0;
                $('#source_after').val(safeSourceAfter.toFixed(3) + ' ' + unit);


                // Check if source will go below minimum
                $('#source_warning').hide();
                if (sourceAfter < 0) {
                    $('#source_after').addClass('text-danger').removeClass('text-warning');
                    this.showAlert('danger', 'Insufficient stock at source warehouse');
                } else if (sourceAfter < (this.selectedProduct?.min_stock || 0)) {
                    $('#source_after').addClass('text-warning').removeClass('text-danger');
                    $('#source_warning').show();
                } else {
                    $('#source_after').removeClass('text-danger text-warning');
                }

                // Destination impact
                const destAfter = this.currentDestStock + quantity;
                $('#dest_after').val(destAfter.toFixed(3) + ' ' + unit);
                $('#dest_info').show();
            }

            this.updateButtonStates();
        },

        updateSummary: function () {
            const productName = $('#product_id option:selected').text() || '-';
            const fromWarehouse = $('#from_warehouse_id option:selected').text() || '-';
            const toWarehouse = $('#to_warehouse_id option:selected').text() || '-';
            const quantity = parseFloat($('#quantity').val()) || 0;
            const unit = this.selectedProduct?.unit || '';

            $('#summary_product').html(`<strong>${productName}</strong>`);
            $('#summary_from').text(fromWarehouse);
            $('#summary_to').text(toWarehouse);
            $('#summary_quantity').text(quantity > 0 ? quantity.toFixed(3) + ' ' + unit : '-');
        },

        updateButtonStates: function () {
            const productSelected = $('#product_id').val() !== '';
            const fromSelected = $('#from_warehouse_id').val() !== '';
            const toSelected = $('#to_warehouse_id').val() !== '';
            const quantityValid = parseFloat($('#quantity').val()) > 0 &&
                parseFloat($('#quantity').val()) <= this.currentSourceStock;
            const reasonSelected = $('#transfer_reason').val() !== '';

            $('#checkFeasibilityBtn').prop('disabled',
                !(productSelected && fromSelected && toSelected && parseFloat($('#quantity').val()) > 0)
            );

            $('#processTransferBtn').prop('disabled',
                !(productSelected && fromSelected && toSelected && quantityValid && reasonSelected)
            );
        },

        checkTransferFeasibility: function () {
            const self = this;

            TempleAPI.post('/inventory/stock/transfer/check', {
                product_id: $('#product_id').val(),
                from_warehouse_id: $('#from_warehouse_id').val(),
                quantity: $('#quantity').val()
            })
                .done(function (response) {
                    if (response.success) {
                        const data = response.data;
                        if (data.can_transfer) {
                            self.showAlert('success', 'Transfer is feasible. Stock available: ' + data.available_stock.toFixed(3));
                        } else {
                            self.showAlert('danger', `Cannot transfer. Available: ${data.available_stock.toFixed(3)}, Shortage: ${data.shortage.toFixed(3)}`);
                        }
                    }
                });
        },

        processTransfer: function () {
            const self = this;

            if (!$('#confirm_transfer').is(':checked')) {
                TempleCore.showToast('Please confirm the transfer details', 'warning');
                return;
            }

            const quantity = parseFloat($('#quantity').val());
            const fromWarehouse = $('#from_warehouse_id option:selected').text();
            const toWarehouse = $('#to_warehouse_id option:selected').text();

            TempleCore.showConfirm(
                'Confirm Stock Transfer',
                `Transfer ${quantity.toFixed(3)} ${this.selectedProduct.unit} of ${this.selectedProduct.name}<br>
                From: ${fromWarehouse}<br>
                To: ${toWarehouse}`,
                function () {
                    self.submitTransfer();
                }
            );
        },

        submitTransfer: function () {
            const self = this;

            $('#processTransferBtn').prop('disabled', true).html(
                '<span class="spinner-border spinner-border-sm"></span> Processing...'
            );

            const formData = {
                product_id: $('#product_id').val(),
                from_warehouse_id: $('#from_warehouse_id').val(),
                to_warehouse_id: $('#to_warehouse_id').val(),
                quantity: $('#quantity').val(),
                batch_number: $('#batch_number').val(),
                expiry_date: $('#expiry_date').val(),
                transfer_reason: $('#transfer_reason').val(),
                notes: $('#notes').val()
            };

            TempleAPI.post('/inventory/stock/transfer/process', formData)
                .done(function (response) {
                    if (response.success) {
                        self.showAlert('success', 'Stock transfer completed successfully');

                        // Show transfer summary
                        const data = response.data;
                        const summaryHtml = `
                            <div class="alert alert-info mt-3">
                                <h6>Transfer Summary</h6>
                                <p><strong>Transfer Number:</strong> ${data.transfer_number}</p>
                                <p><strong>Product:</strong> ${data.product.name}</p>
                                <p><strong>Quantity Transferred:</strong> ${data.quantity_transferred}</p>
                                <p><strong>${data.from_warehouse.name}:</strong> 
                                   ${data.from_warehouse.previous_stock} ? ${data.from_warehouse.current_stock}</p>
                                <p><strong>${data.to_warehouse.name}:</strong> 
                                   ${data.to_warehouse.previous_stock} ? ${data.to_warehouse.current_stock}</p>
                            </div>
                        `;
                        $('#alertContainer').append(summaryHtml);

                        // Reset form
                        $('#transferForm')[0].reset();
                        self.currentSourceStock = 0;
                        self.currentDestStock = 0;

                        // Redirect after delay
                        setTimeout(function () {
                            TempleRouter.navigate('inventory/stock-movement');
                        }, 3000);
                    } else {
                        self.showAlert('danger', response.message || 'Transfer failed');
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'An error occurred';
                    self.showAlert('danger', error);
                })
                .always(function () {
                    $('#processTransferBtn').prop('disabled', false).html(
                        '<i class="bi bi-arrow-left-right"></i> Process Transfer'
                    );
                });
        },

        showAlert: function (type, message) {
            const alertHtml = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#alertContainer').html(alertHtml);

            if (type === 'success') {
                setTimeout(function () {
                    $('.alert').fadeOut();
                }, 5000);
            }
        }
    };

})(jQuery, window);