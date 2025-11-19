// js/pages/inventory/stock-out.js

(function ($, window) {
    'use strict';

    window.InventoryStockOutPage = {
        currentStock: 0,
        minStockLevel: 0,
        selectedProduct: null,
        selectedWarehouse: null,
        // UOM management properties
        currentUomFamily: null,
        selectedProductUomId: null,
        currentStockInBaseUnit: 0,
        baseUnitId: null,
        selectedUomConversionFactor: 1,

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
                            <h4>Manual Stock Out</h4>
                        </div>
                    </div>
                    
                    <!-- Success/Error Messages -->
                    <div id="alertContainer"></div>
                    
                    <div class="card">
                        <div class="card-body">
                            <form id="stockOutForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <!-- Product Selection -->
                                        <div class="form-group">
                                            <label for="product_id">Select Product <span class="text-danger">*</span></label>
                                            <select class="form-control" id="product_id" name="product_id" required>
                                                <option value="">Select Product</option>
                                            </select>
                                        </div>
                                        
                                        <!-- UOM Selection -->
                                        <div class="form-group">
                                            <label>Unit of Measure <span class="text-danger">*</span></label>
                                            <select id="uom_id" class="form-control" required disabled>
                                                <option value="">Select Product First</option>
                                            </select>
                                            <small class="form-text text-muted" id="uom_help_text"></small>
                                        </div>
                                        
                                        <!-- Current Stock Display -->
                                        <div class="form-group">
                                            <label>Current Stock</label>
                                            <input type="text" class="form-control" id="current_stock_display" readonly>
                                            <input type="hidden" id="current_stock_value">
                                            <input type="hidden" id="min_stock_level">
                                        </div>
                                        
                                        <!-- Quantity Out -->
                                        <div class="form-group">
                                            <label for="quantity">Quantity Out <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <input type="number" class="form-control" id="quantity" name="quantity" 
                                                       step="0.001" min="0.001" required>
                                                <span class="input-group-text" id="unit_display">-</span>
                                            </div>
                                            <small class="form-text text-info" id="quantity_conversion_display"></small>
                                            <small class="text-muted d-block" id="quantity_help"></small>
                                        </div>
                                        
                                        <!-- Remaining Stock -->
                                        <div class="form-group">
                                            <label>Remaining Stock</label>
                                            <input type="text" class="form-control" id="remaining_stock_display" readonly>
                                            <div id="stock_warning" class="text-warning mt-1" style="display:none;">
                                                <small><i class="bi bi-exclamation-triangle"></i> Stock will go below minimum level</small>
                                            </div>
                                            <div id="insufficient_warning" class="text-danger mt-1" style="display:none;">
                                                <small><i class="bi bi-x-circle"></i> Insufficient stock</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <!-- Warehouse Selection -->
                                        <div class="form-group">
                                            <label for="warehouse_id">Warehouse <span class="text-danger">*</span></label>
                                            <select class="form-control" id="warehouse_id" name="warehouse_id" required>
                                                <option value="">Select Warehouse</option>
                                            </select>
                                        </div>
                                        
                                        <!-- Reason -->
                                        <div class="form-group">
                                            <label for="reason">Reason <span class="text-danger">*</span></label>
                                            <select class="form-control" id="reason" name="reason" required>
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
                                        
                                        <!-- Reference Number -->
                                        <div class="form-group">
                                            <label for="reference_number">Reference Number</label>
                                            <input type="text" class="form-control" id="reference_number" 
                                                   name="reference_number" placeholder="Order/Invoice number">
                                        </div>
                                        
                                        <!-- Notes -->
                                        <div class="form-group">
                                            <label for="notes">Notes</label>
                                            <textarea class="form-control" id="notes" name="notes" 
                                                      rows="3" placeholder="Additional notes"></textarea>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Stock Out Summary -->
                                <div class="card bg-light mt-3">
                                    <div class="card-body">
                                        <h6 class="card-title">Stock Out Summary</h6>
                                        <div class="row">
                                            <div class="col-md-3">
                                                <strong>Product:</strong>
                                                <div id="summary_product">-</div>
                                            </div>
                                            <div class="col-md-2">
                                                <strong>Current Stock:</strong>
                                                <div id="summary_current">-</div>
                                            </div>
                                            <div class="col-md-2">
                                                <strong>Quantity Out:</strong>
                                                <div id="summary_quantity" class="text-danger">0</div>
                                            </div>
                                            <div class="col-md-2">
                                                <strong>Remaining:</strong>
                                                <div id="summary_remaining">-</div>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Reason:</strong>
                                                <div id="summary_reason">-</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Confirmation -->
                                <div class="alert alert-warning mt-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="confirm_stock_out" required>
                                        <label class="form-check-label" for="confirm_stock_out">
                                            I confirm that the stock out details are correct and want to proceed
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Actions -->
                                <div class="form-group text-right">
                                    <button type="button" class="btn btn-secondary" onclick="history.back()">
                                        <i class="bi bi-arrow-left"></i> Cancel
                                    </button>
                                    <button type="button" id="checkAvailabilityBtn" class="btn btn-info" disabled>
                                        <i class="bi bi-check-circle"></i> Check Availability
                                    </button>
                                    <button type="submit" id="processStockOutBtn" class="btn btn-danger" disabled>
                                        <i class="bi bi-arrow-up"></i> Process Stock Out
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
                                        data-stock="${product.current_stock || 0}"
                                        data-min="${product.min_stock_level || 0}"
                                        data-uom-id="${product.uom_id || ''}"
                                        data-unit="${product.uom?.name || ''}">
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
        },

        loadUomFamily: function (productId) {
            const self = this;
            
            TempleAPI.get(`/inventory/products/${productId}/uom-family`).done(function (response) {
                if (response.success) {
                    self.currentUomFamily = response.data.uom_family;
                    self.selectedProductUomId = response.data.product_uom_id;
                    self.baseUnitId = response.data.base_unit_id;
                    
                    // Populate UOM dropdown
                    let options = '<option value="">Select UOM</option>';
                    self.currentUomFamily.forEach(function (uom) {
                        const label = uom.is_base_unit ? 
                            `${uom.name} (Base Unit)` : 
                            `${uom.name} (1 ${uom.uom_short} = ${uom.conversion_factor} base units)`;
                        
                        const selected = uom.id === self.selectedProductUomId ? 'selected' : '';
                        
                        options += `<option value="${uom.id}" 
                                           data-conversion="${uom.conversion_factor}"
                                           data-short="${uom.uom_short}"
                                           data-is-base="${uom.is_base_unit}"
                                           ${selected}>
                                         ${label}
                                   </option>`;
                    });
                    
                    $('#uom_id').html(options).prop('disabled', false);
                    
                    // Set initial conversion factor
                    const selectedUom = self.currentUomFamily.find(u => u.id === self.selectedProductUomId);
                    if (selectedUom) {
                        self.selectedUomConversionFactor = selectedUom.conversion_factor;
                        $('#unit_display').text(selectedUom.uom_short);
                        
                        // Update help text
                        if (selectedUom.is_base_unit) {
                            $('#uom_help_text').text('This is the base unit for this product');
                        } else {
                            $('#uom_help_text').text(`1 ${selectedUom.uom_short} = ${selectedUom.conversion_factor} base units`);
                        }
                    }
                } else {
                    TempleCore.showToast('Failed to load UOM options', 'error');
                    $('#uom_id').html('<option value="">No UOM available</option>').prop('disabled', true);
                }
            }).fail(function () {
                TempleCore.showToast('Error loading UOM family', 'error');
                $('#uom_id').html('<option value="">Error loading UOMs</option>').prop('disabled', true);
            });
        },

        bindEvents: function () {
            const self = this;

            // Product selection change
            $(document).on('change', '#product_id', function () {
                const productId = $(this).val();
                const warehouseId = $('#warehouse_id').val();

                if (productId) {
                    const productName = $(this).find('option:selected').text();
                    $('#summary_product').html(`<strong>${productName}</strong>`);
                    
                    self.currentStockInBaseUnit = parseFloat($(this).find('option:selected').data('stock')) || 0;
                    
                    // Load UOM family
                    self.loadUomFamily(productId);
                    
                    // Clear previous values
                    $('#quantity').val('');
                    $('#quantity_conversion_display').text('');
                    $('#remaining_stock_display').val('');

                    if (warehouseId) {
                        self.checkLocationStock(productId, warehouseId);
                    }
                } else {
                    self.clearStockDisplay();
                    self.currentUomFamily = null;
                    self.selectedProductUomId = null;
                    self.currentStockInBaseUnit = 0;
                    $('#uom_id').html('<option value="">Select Product First</option>').prop('disabled', true);
                    $('#unit_display').text('-');
                    $('#uom_help_text').text('');
                }
            });

            // UOM selection change
            $(document).on('change', '#uom_id', function () {
                const selectedOption = $(this).find('option:selected');
                const conversionFactor = parseFloat(selectedOption.data('conversion')) || 1;
                const shortName = selectedOption.data('short') || '';
                const isBase = selectedOption.data('is-base');
                
                self.selectedUomConversionFactor = conversionFactor;
                $('#unit_display').text(shortName);
                
                // Update help text
                if (isBase) {
                    $('#uom_help_text').text('This is the base unit for this product');
                } else {
                    $('#uom_help_text').text(`1 ${shortName} = ${conversionFactor} base units`);
                }
                
                // Update current stock display in selected UOM
                if (self.currentStockInBaseUnit > 0) {
                    const stockInSelectedUom = self.currentStockInBaseUnit / conversionFactor;
                    $('#current_stock_display').val(stockInSelectedUom.toFixed(3) + ' ' + shortName);
                    $('#summary_current').text(stockInSelectedUom.toFixed(3) + ' ' + shortName);
                    self.currentStock = stockInSelectedUom;
                }
                
                // Update conversion display if quantity is entered
                self.updateConversionDisplay();
                
                // Recalculate remaining
                self.calculateRemaining();
            });

            // Warehouse selection change
            $(document).on('change', '#warehouse_id', function () {
                const productId = $('#product_id').val();
                const warehouseId = $(this).val();

                if (productId && warehouseId) {
                    self.checkLocationStock(productId, warehouseId);
                }
            });

            // Quantity input
            $(document).on('input', '#quantity', function () {
                self.updateConversionDisplay();
                self.calculateRemaining();
            });

            // Reason selection
            $(document).on('change', '#reason', function () {
                const reasonText = $(this).find('option:selected').text();
                $('#summary_reason').text(reasonText || '-');
            });

            // Check availability button
            $(document).on('click', '#checkAvailabilityBtn', function () {
                self.checkRealTimeAvailability();
            });

            // Form submission
            $(document).on('submit', '#stockOutForm', function (e) {
                e.preventDefault();
                self.processStockOut();
            });
        },

        updateConversionDisplay: function () {
            const quantity = parseFloat($('#quantity').val()) || 0;
            const conversionFactor = this.selectedUomConversionFactor;
            
            if (quantity > 0 && conversionFactor != 1) {
                // Calculate quantity in base units
                const quantityInBase = quantity * conversionFactor;
                const baseUom = this.currentUomFamily?.find(u => u.is_base_unit);
                
                if (baseUom) {
                    $('#quantity_conversion_display').text(
                        `≈ ${quantityInBase.toFixed(3)} ${baseUom.uom_short} (base unit)`
                    ).show();
                }
            } else {
                $('#quantity_conversion_display').text('').hide();
            }
        },

        checkLocationStock: function (productId, warehouseId) {
            const self = this;

            TempleAPI.get('/inventory/stock/item-info', {
                product_id: productId,
                warehouse_id: warehouseId
            })
                .done(function (response) {
                    if (response.success && response.data) {
                        const data = response.data;
                        self.currentStockInBaseUnit = parseFloat(data.current_stock) || 0;
                        self.minStockLevel = parseFloat(data.min_stock_level) || 0;

                        // Convert to selected UOM if one is selected
                        const selectedUom = $('#uom_id').val();
                        if (selectedUom) {
                            const conversionFactor = self.selectedUomConversionFactor;
                            const stockInSelectedUom = self.currentStockInBaseUnit / conversionFactor;
                            const shortName = $('#uom_id option:selected').data('short') || '';
                            $('#current_stock_display').val(stockInSelectedUom.toFixed(3) + ' ' + shortName);
                            $('#summary_current').text(stockInSelectedUom.toFixed(3) + ' ' + shortName);
                            self.currentStock = stockInSelectedUom;
                        } else {
                            const unit = data.unit || '';
                            $('#current_stock_display').val(self.currentStockInBaseUnit.toFixed(3) + ' ' + unit);
                            $('#summary_current').text(self.currentStockInBaseUnit.toFixed(3) + ' ' + unit);
                            self.currentStock = self.currentStockInBaseUnit;
                        }

                        $('#current_stock_value').val(self.currentStockInBaseUnit);
                        $('#min_stock_level').val(self.minStockLevel);

                        // Update help text
                        const shortName = $('#uom_id option:selected').data('short') || data.unit;
                        $('#quantity_help').text('Available at this location: ' + self.currentStock.toFixed(3) + ' ' + shortName);

                        self.updateButtonStates();

                        if ($('#quantity').val()) {
                            self.calculateRemaining();
                        }
                    } else {
                        $('#current_stock_display').val('0.000');
                        self.currentStock = 0;
                        self.updateButtonStates();
                    }
                })
                .fail(function (xhr) {
                    $('#current_stock_display').val('Error loading stock');
                    self.currentStock = 0;
                    self.updateButtonStates();
                    TempleCore.showToast('Failed to load stock information', 'error');
                });
        },

        clearStockDisplay: function () {
            $('#current_stock_display').val('');
            $('#quantity_help').text('Please select both product and warehouse');
            $('#summary_product').html('-');
            $('#summary_current').text('-');
            $('#summary_quantity').text('0');
            $('#summary_remaining').text('-');
            this.currentStock = 0;
            this.currentStockInBaseUnit = 0;
            this.updateButtonStates();
        },

        calculateRemaining: function () {
            const quantity = parseFloat($('#quantity').val()) || 0;
            const remaining = this.currentStock - quantity;
            const shortName = $('#uom_id option:selected').data('short') || '';

            $('#remaining_stock_display').val(remaining.toFixed(3) + ' ' + shortName);
            $('#summary_quantity').text(quantity.toFixed(3) + ' ' + shortName);
            $('#summary_remaining').text(remaining.toFixed(3) + ' ' + shortName);

            // Show warnings
            $('#stock_warning, #insufficient_warning').hide();
            $('#summary_remaining').removeClass('text-danger text-warning text-success');

            if (quantity > this.currentStock) {
                $('#insufficient_warning').show();
                $('#summary_remaining').addClass('text-danger');
            } else {
                // Convert min stock level to selected UOM for comparison
                const minStockInSelectedUom = this.minStockLevel / this.selectedUomConversionFactor;
                if (remaining < minStockInSelectedUom) {
                    $('#stock_warning').show();
                    $('#summary_remaining').addClass('text-warning');
                } else {
                    $('#summary_remaining').addClass('text-success');
                }
            }

            this.updateButtonStates();
        },

        updateButtonStates: function () {
            const productSelected = $('#product_id').val() !== '';
            const warehouseSelected = $('#warehouse_id').val() !== '';
            const uomSelected = $('#uom_id').val() !== '';
            const quantityEntered = parseFloat($('#quantity').val()) > 0;
            const quantityValid = parseFloat($('#quantity').val()) <= this.currentStock;

            $('#checkAvailabilityBtn').prop('disabled', !(productSelected && warehouseSelected && uomSelected && quantityEntered));
            $('#processStockOutBtn').prop('disabled', !(productSelected && warehouseSelected && uomSelected && quantityEntered && quantityValid));
        },

        checkRealTimeAvailability: function () {
            const self = this;
            const productId = $('#product_id').val();
            const warehouseId = $('#warehouse_id').val();

            TempleAPI.get('/inventory/stock/item-info', {
                product_id: productId,
                warehouse_id: warehouseId
            })
                .done(function (response) {
                    if (response.success) {
                        const availableStockBase = parseFloat(response.data.current_stock);
                        const availableStock = availableStockBase / self.selectedUomConversionFactor;
                        const requestedQty = parseFloat($('#quantity').val());
                        const shortName = $('#uom_id option:selected').data('short') || '';

                        if (availableStock >= requestedQty) {
                            TempleCore.showToast('Stock available for transaction', 'success');
                            self.currentStockInBaseUnit = availableStockBase;
                            self.currentStock = availableStock;
                            $('#current_stock_display').val(availableStock.toFixed(3) + ' ' + shortName);
                            self.calculateRemaining();
                        } else {
                            TempleCore.showToast(`Insufficient stock. Available: ${availableStock.toFixed(3)} ${shortName}`, 'error');
                        }
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to check stock availability', 'error');
                });
        },

        processStockOut: function () {
            const self = this;

            if (!$('#confirm_stock_out').is(':checked')) {
                TempleCore.showToast('Please confirm the stock out details', 'warning');
                return;
            }

            const quantity = parseFloat($('#quantity').val());
            const productName = $('#product_id option:selected').text();
            const reason = $('#reason option:selected').text();
            const shortName = $('#uom_id option:selected').data('short') || '';

            TempleCore.showConfirm(
                'Confirm Stock Out',
                `Are you sure you want to process this stock out?<br><br>
                Product: ${productName}<br>
                Quantity: ${quantity.toFixed(3)} ${shortName}<br>
                Reason: ${reason}`,
                function () {
                    self.submitStockOut();
                }
            );
        },

        submitStockOut: function () {
            const self = this;

            $('#processStockOutBtn').prop('disabled', true).html(
                '<span class="spinner-border spinner-border-sm"></span> Processing...'
            );

            const formData = {
                product_id: $('#product_id').val(),
                warehouse_id: $('#warehouse_id').val(),
                quantity: $('#quantity').val(),
                uom_id: $('#uom_id').val(),  // Include selected UOM
                reason: $('#reason').val(),
                reference_number: $('#reference_number').val(),
                notes: $('#notes').val()
            };

            TempleAPI.post('/inventory/stock/out', formData)
                .done(function (response) {
                    if (response.success) {
                        self.showAlert('success', 'Stock out processed successfully');

                        const data = response.data;
                        const shortName = $('#uom_id option:selected').data('short') || '';
                        const summaryHtml = `
                            <div class="alert alert-info mt-3">
                                <h6>Transaction Summary</h6>
                                <p>Previous Stock: ${parseFloat(data.previous_stock).toFixed(3)} ${shortName}<br>
                                Quantity Out: ${parseFloat(data.quantity_out).toFixed(3)} ${shortName}<br>
                                Remaining Stock: ${data.remaining_stock.toFixed(3)} ${shortName}</p>
                                ${data.below_minimum ? '<p class="text-warning">⚠️ Stock is now below minimum level</p>' : ''}
                            </div>
                        `;
                        $('#alertContainer').append(summaryHtml);

                        $('#stockOutForm')[0].reset();
                        self.clearStockDisplay();
                        $('#uom_id').html('<option value="">Select Product First</option>').prop('disabled', true);
                        $('#unit_display').text('-');
                        self.currentUomFamily = null;
                        self.selectedProductUomId = null;

                        setTimeout(function () {
                            TempleRouter.navigate('inventory/stock-movement');
                        }, 3000);
                    } else {
                        self.showAlert('danger', response.message || 'Failed to process stock out');
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'An error occurred';
                    self.showAlert('danger', error);
                })
                .always(function () {
                    $('#processStockOutBtn').prop('disabled', false).html(
                        '<i class="bi bi-arrow-up"></i> Process Stock Out'
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