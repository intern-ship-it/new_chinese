// js/pages/inventory/stock-in.js
window.InventoryStockInPage = {
    currentUomFamily: null,
    selectedProductUomId: null,
    currentStockInBaseUnit: 0,
    baseUnitId: null,
    selectedUomConversionFactor: 1,

    init: function () {
        this.setupPage();
        this.loadProducts();
        this.loadWarehouses();
        this.bindEvents();
        this.loadRecentTransactions();
    },

    setupPage: function () {
        const html = `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                <h4 class="mb-0"><i class="bi bi-arrow-down-circle"></i> Direct Stock In</h4>
                            </div>
                            <div class="card-body">
                                <form id="stockInForm">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label>Select Product <span class="text-danger">*</span></label>
                                                <select id="item_id" class="form-control" required>
                                                    <option value="">Select Product</option>
                                                </select>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Unit of Measure <span class="text-danger">*</span></label>
                                                <select id="uom_id" class="form-control" required disabled>
                                                    <option value="">Select Product First</option>
                                                </select>
                                                <small class="form-text text-muted" id="uom_help_text"></small>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Current Stock</label>
                                                <input type="text" id="current_stock_display" class="form-control" readonly>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Quantity <span class="text-danger">*</span></label>
                                                <div class="input-group">
                                                    <input type="number" id="quantity" class="form-control" 
                                                           step="0.001" min="0.001" required>
                                                    <span class="input-group-text" id="unit_display">-</span>
                                                </div>
                                                <small class="form-text text-info" id="quantity_conversion_display"></small>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Unit Cost</label>
                                                <input type="number" id="unit_cost" class="form-control" 
                                                       step="0.01" min="0">
                                                <small class="form-text text-info" id="cost_conversion_display"></small>
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Total Cost</label>
                                                <input type="text" id="total_cost" class="form-control" readonly
                                                       style="background-color: #e8f5e8; font-weight: bold;">
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label>Storage Location <span class="text-danger">*</span></label>
                                                <select id="location_id" class="form-control" required>
                                                    <option value="">Select Location</option>
                                                </select>
                                            </div>
                                            
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
                                            
                                            <div class="form-group">
                                                <label>Batch Number</label>
                                                <input type="text" id="batch_number" class="form-control">
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Expiry Date</label>
                                                <input type="date" id="expiry_date" class="form-control">
                                            </div>
                                            
                                            <div class="form-group">
                                                <label>Notes</label>
                                                <textarea id="notes" class="form-control" rows="3"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-group text-right">
                                        <button type="button" class="btn btn-secondary" onclick="InventoryStockInPage.resetForm()">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-arrow-down"></i> Process Stock In
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Transactions -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Recent Stock In Transactions</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-striped" id="recent_stock_in_table">
                                        <thead>
                                            <tr>
                                                <th>Date Time</th>
                                                <th>Product Name</th>
                                                <th>Product Type</th>
                                                <th>Location</th>
                                                <th class="text-center">Quantity</th>
                                                <th class="text-center">Unit Cost</th>
                                                <th class="text-center">Total Cost</th>
                                                <th>Batch Number</th>
                                                <th>Expiry Date</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="10" class="text-center text-muted">Loading...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#page-container').html(html);
    },

    loadProducts: function () {
        TempleAPI.get('/inventory/products').done(function (response) {
            if (response.success) {
                let options = '<option value="">Select Product</option>';
                const products = response.data.data || response.data || [];

                products.forEach(function (product) {
                    options += `<option value="${product.id}" 
                                       data-current-stock="${product.current_stock || 0}"
                                       data-uom-id="${product.uom_id || ''}"
                                       data-item-code="${product.code}">
                                     ${product.name} (${product.product_type})
                               </option>`;
                });

                $('#item_id').html(options);
            }
        });
    },

    loadWarehouses: function () {
        TempleAPI.get('/inventory/warehouse').done(function (response) {
            if (response.success) {
                let options = '<option value="">Select Location</option>';
                response.data.forEach(function (warehouse) {
                    options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                });
                $('#location_id').html(options);
            }
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

        // Item selection change
        $('#item_id').on('change', function () {
            const productId = $(this).val();
            const selectedOption = $(this).find('option:selected');
            const currentStock = selectedOption.data('current-stock') || 0;

            if (productId) {
                self.currentStockInBaseUnit = currentStock;
                
                // Load UOM family
                self.loadUomFamily(productId);
                
                // Clear previous values
                $('#quantity').val('');
                $('#unit_cost').val('');
                $('#total_cost').val('');
                $('#quantity_conversion_display').text('');
                $('#cost_conversion_display').text('');

                // Update location-specific stock if location is selected
                if ($('#location_id').val()) {
                    self.updateLocationStock();
                }
            } else {
                // Reset everything
                self.currentUomFamily = null;
                self.selectedProductUomId = null;
                self.currentStockInBaseUnit = 0;
                $('#uom_id').html('<option value="">Select Product First</option>').prop('disabled', true);
                $('#current_stock_display').val('');
                $('#unit_display').text('-');
                $('#uom_help_text').text('');
            }
        });

        // UOM selection change
        $('#uom_id').on('change', function () {
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
            
            // Update current stock display
            if (self.currentStockInBaseUnit > 0) {
                const stockInSelectedUom = self.currentStockInBaseUnit / conversionFactor;
                $('#current_stock_display').val(stockInSelectedUom.toFixed(3) + ' ' + shortName);
            }
            
            // Update conversion displays if quantity is entered
            self.updateConversionDisplays();
            
            // Recalculate total cost
            self.calculateTotalCost();
        });

        // Location change
        $('#location_id').on('change', function () {
            if ($('#item_id').val()) {
                self.updateLocationStock();
            }
        });

        // Quantity input
        $('#quantity').on('input', function () {
            self.updateConversionDisplays();
            self.calculateTotalCost();
        });

        // Unit cost input
        $('#unit_cost').on('input', function () {
            self.updateConversionDisplays();
            self.calculateTotalCost();
        });

        // Form submission
        $('#stockInForm').on('submit', function (e) {
            e.preventDefault();
            self.processStockIn();
        });
    },

    updateConversionDisplays: function () {
        const quantity = parseFloat($('#quantity').val()) || 0;
        const unitCost = parseFloat($('#unit_cost').val()) || 0;
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
        
        if (unitCost > 0 && conversionFactor != 1) {
            // Calculate cost in base units
            const costInBase = unitCost / conversionFactor;
            const baseUom = this.currentUomFamily?.find(u => u.is_base_unit);
            
            if (baseUom) {
                $('#cost_conversion_display').text(
                    `≈ ${costInBase.toFixed(2)} per ${baseUom.uom_short} (base unit)`
                ).show();
            }
        } else {
            $('#cost_conversion_display').text('').hide();
        }
    },

    calculateTotalCost: function () {
        const quantity = parseFloat($('#quantity').val()) || 0;
        const unitCost = parseFloat($('#unit_cost').val()) || 0;
        const totalCost = quantity * unitCost;
        
        $('#total_cost').val(totalCost.toFixed(2));
    },

    updateLocationStock: function () {
        const self = this;
        const productId = $('#item_id').val();
        const warehouseId = $('#location_id').val();

        if (productId && warehouseId) {
            TempleAPI.get('/inventory/stock/item-info', {
                product_id: productId,
                warehouse_id: warehouseId
            }).done(function (response) {
                if (response.success) {
                    const data = response.data;
                    self.currentStockInBaseUnit = parseFloat(data.current_stock) || 0;
                    
                    // Convert to selected UOM if one is selected
                    const selectedUom = $('#uom_id').val();
                    if (selectedUom) {
                        const conversionFactor = self.selectedUomConversionFactor;
                        const stockInSelectedUom = self.currentStockInBaseUnit / conversionFactor;
                        const shortName = $('#uom_id option:selected').data('short') || '';
                        $('#current_stock_display').val(stockInSelectedUom.toFixed(3) + ' ' + shortName);
                    } else {
                        $('#current_stock_display').val(parseFloat(data.current_stock).toFixed(3) + ' ' + data.unit);
                    }
                }
            });
        }
    },

    processStockIn: function () {
        const data = {
            product_id: $('#item_id').val(),
            warehouse_id: $('#location_id').val(),
            quantity: $('#quantity').val(),
            uom_id: $('#uom_id').val(), // Send selected UOM
            unit_cost: $('#unit_cost').val() || 0,
            batch_number: $('#batch_number').val(),
            expiry_date: $('#expiry_date').val(),
            notes: $('#notes').val(),
            movement_subtype: $('#movement_subtype').val()
        };

        // Disable submit button
        $('button[type="submit"]').prop('disabled', true)
            .html('<i class="bi bi-hourglass-split"></i> Processing...');

        TempleAPI.post('/inventory/stock-in/process', data)
            .done(function (response) {
                if (response.success) {
                    TempleCore.showToast(response.message, 'success');
                    InventoryStockInPage.resetForm();
                    InventoryStockInPage.loadRecentTransactions();
                } else {
                    TempleCore.showToast(response.message, 'error');
                }
            })
            .fail(function (xhr) {
                const response = xhr.responseJSON;
                TempleCore.showToast(response?.message || 'Failed to process stock in', 'error');
            })
            .always(function () {
                $('button[type="submit"]').prop('disabled', false)
                    .html('<i class="bi bi-arrow-down"></i> Process Stock In');
            });
    },

    resetForm: function () {
        $('#stockInForm')[0].reset();
        $('#current_stock_display').val('');
        $('#unit_display').text('-');
        $('#total_cost').val('');
        $('#quantity_conversion_display').text('').hide();
        $('#cost_conversion_display').text('').hide();
        $('#uom_help_text').text('');
        $('#uom_id').html('<option value="">Select Product First</option>').prop('disabled', true);
        
        // Reset state
        this.currentUomFamily = null;
        this.selectedProductUomId = null;
        this.currentStockInBaseUnit = 0;
        this.baseUnitId = null;
        this.selectedUomConversionFactor = 1;
    },

    loadRecentTransactions: function () {
        TempleAPI.get('/inventory/stock-in/recent')
            .done(function (response) {
                const tbody = $('#recent_stock_in_table tbody');
                tbody.empty();

                if (response.success && response.data.length > 0) {
                    response.data.forEach(function (item) {
                        const expiryDate = item.expiry_date ?
                            new Date(item.expiry_date).toLocaleDateString() : '-';
                        const batchNumber = item.batch_number || '-';
                        const notes = item.notes || '-';
                        
                        // Format quantity with UOM
                        const quantityDisplay = item.uom_short ? 
                            `${parseFloat(item.quantity).toFixed(4)} ${item.uom_short}` : 
                            parseFloat(item.quantity).toFixed(4);
                        
                        // Format unit cost with UOM
                        const unitCostDisplay = item.uom_short ? 
                            `${parseFloat(item.unit_cost || 0).toFixed(4)} / ${item.uom_short}` : 
                            parseFloat(item.unit_cost || 0).toFixed(4);

                        const row = `
                            <tr>
                                <td>${new Date(item.movement_date).toLocaleString()}</td>
                                <td><strong>${item.item_name}</strong></td>
                               <td>${item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1).toLowerCase()}</td>
                                <td>${item.location_name}</td>
                                <td class="text-center">${quantityDisplay}</td>
                                <td class="text-center">${unitCostDisplay}</td>
                                <td class="text-center">${parseFloat(item.total_cost || 0).toFixed(2)}</td>
                                <td>${batchNumber}</td>
                                <td>${expiryDate}</td>
                                <td>${notes}</td>
                            </tr>
                        `;
                        tbody.append(row);
                    });
                } else {
                    tbody.html('<tr><td colspan="10" class="text-center text-muted">No data found</td></tr>');
                }
            })
            .fail(function () {
                $('#recent_stock_in_table tbody').html(
                    '<tr><td colspan="10" class="text-center text-danger">Error loading data</td></tr>'
                );
            });
    }
};