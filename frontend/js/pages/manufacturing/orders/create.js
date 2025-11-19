// js/pages/manufacturing/orders/create.js
// Create Manufacturing Order Page - FIXED

(function($, window) {
    'use strict';
    
    window.ManufacturingOrdersCreatePage = {
        activeBoms: [],
        warehouses: [],
        selectedBom: null,
        
        init: function(params) {
            this.render();
            this.loadInitialData();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Create Manufacturing Order</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('manufacturing/orders'); return false;">Production Orders</a></li>
                                    <li class="breadcrumb-item active">Create</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    
                    <form id="manufacturingOrderForm">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="mb-0">Order Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Select BOM (Recipe) <span class="text-danger">*</span></label>
                                        <select class="form-select" id="bomMasterId" required>
                                            <option value="">Select BOM</option>
                                        </select>
                                        <small class="text-muted">Select the Bill of Materials for the product to manufacture</small>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Warehouse <span class="text-danger">*</span></label>
                                        <select class="form-select" id="warehouseId" required>
                                            <option value="">Select Warehouse</option>
                                        </select>
                                        <small class="text-muted">Where manufacturing will take place</small>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Quantity to Produce <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="quantityToProduce" step="0.001" min="0.001" required>
                                        <small class="text-muted" id="bomOutputHint"></small>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Priority</label>
                                        <select class="form-select" id="priority">
                                            <option value="NORMAL" selected>Normal</option>
                                            <option value="LOW">Low</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Scheduled Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="scheduledDate" required min="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Quality Check</label>
                                        <div class="form-check mt-2">
                                            <input class="form-check-input" type="checkbox" id="qualityCheckRequired">
                                            <label class="form-check-label" for="qualityCheckRequired">
                                                Require Quality Check
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="notes" rows="2"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- BOM Details (shown after BOM selection) -->
                        <div class="card mb-3" id="bomDetailsCard" style="display: none;">
                            <div class="card-header">
                                <h5 class="mb-0">BOM Details</h5>
                            </div>
                            <div class="card-body" id="bomDetailsContent">
                                <!-- BOM details will be loaded here -->
                            </div>
                        </div>
                        
                        <!-- Raw Materials Requirement -->
                        <div class="card mb-3" id="rawMaterialsCard" style="display: none;">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Raw Materials Requirement</h5>
                                <button type="button" class="btn btn-sm btn-info" id="checkAvailabilityBtn">
                                    <i class="bi bi-box-seam"></i> Check Stock Availability
                                </button>
                            </div>
                            <div class="card-body">
                                <div id="availabilityAlert"></div>
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Raw Material</th>
                                                <th>Required per Unit</th>
                                                <th>Total Required</th>
                                                <th>Unit Cost</th>
                                                <th>Total Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody id="rawMaterialsTableBody">
                                            <!-- Content will be loaded here -->
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <th colspan="4" class="text-end">Total Material Cost:</th>
                                                <th id="totalMaterialCost">0.00</th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cost Summary -->
                        <div class="card mb-3" id="costSummaryCard" style="display: none;">
                            <div class="card-body">
                                <h5>Cost Summary</h5>
                                <div class="row">
                                    <div class="col-md-4">
                                        <table class="table table-sm">
                                            <tr>
                                                <td>Material Cost:</td>
                                                <td class="text-end" id="summaryMaterialCost">0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Labor Cost:</td>
                                                <td class="text-end" id="summaryLaborCost">0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Overhead Cost:</td>
                                                <td class="text-end" id="summaryOverheadCost">0.00</td>
                                            </tr>
                                            <tr class="fw-bold">
                                                <td>Total Cost:</td>
                                                <td class="text-end" id="summaryTotalCost">0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Unit Cost:</td>
                                                <td class="text-end" id="summaryUnitCost">0.00</td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="col-md-8">
                                        <div class="alert alert-info">
                                            <i class="bi bi-info-circle"></i> 
                                            <strong>Manufacturing Process:</strong>
                                            <ol class="mb-0 mt-2">
                                                <li>After creating, the order will be in <strong>Draft</strong> status</li>
                                                <li><strong>Validate</strong> the order to check and reserve raw materials</li>
                                                <li><strong>Start Manufacturing</strong> to begin production</li>
                                                <li>Perform <strong>Quality Check</strong> if required</li>
                                                <li><strong>Complete</strong> the order to consume materials and add product to stock</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-12">
                                <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('manufacturing/orders'); return false;">
                                    <i class="bi bi-arrow-left"></i> Back to List
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-save"></i> Create Order
                                </button>
                                <button type="button" class="btn btn-success" id="createAndValidateBtn">
                                    <i class="bi bi-check-circle"></i> Create & Validate
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Stock Availability Modal -->
                <div class="modal fade" id="stockAvailabilityModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Stock Availability Check</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="stockAvailabilityContent">
                                <!-- Content will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadInitialData: function() {
            const self = this;
            
            // Set default scheduled date to today
            $('#scheduledDate').val(new Date().toISOString().split('T')[0]);
            
            // Load active BOMs
            TempleAPI.get('/manufacturing/orders/active-boms')
                .done(function(response) {
                    if (response.success) {
                        self.activeBoms = response.data;
                        let options = '<option value="">Select BOM</option>';
                        response.data.forEach(function(bom) {
                            options += `
                                <option value="${bom.id}" 
                                        data-product-id="${bom.product_id}"
                                        data-product="${bom.product_name}"
                                        data-output-qty="${bom.output_quantity}"
                                        data-output-uom="${bom.output_uom}"
                                        data-output-uom-id="${bom.output_uom_id}"
                                        data-cost="${bom.total_cost}">
                                    ${bom.bom_code} - ${bom.product_name} (${bom.output_quantity} ${bom.output_uom})
                                </option>`;
                        });
                        $('#bomMasterId').html(options);
                    }
                });
            
            // Load warehouses
            TempleAPI.get('/manufacturing/orders/warehouses')
                .done(function(response) {
                    if (response.success) {
                        self.warehouses = response.data;
                        let options = '<option value="">Select Warehouse</option>';
                        response.data.forEach(function(warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                        });
                        $('#warehouseId').html(options);
                    }
                });
        },
        
        bindEvents: function() {
            const self = this;
            
            // BOM selection change
            $('#bomMasterId').on('change', function() {
                const bomId = $(this).val();
                if (bomId) {
                    self.loadBomDetails(bomId);
                    
                    // Update output hint
                    const $selectedOption = $(this).find('option:selected');
                    const outputQty = $selectedOption.data('output-qty');
                    const outputUom = $selectedOption.data('output-uom');
                    $('#bomOutputHint').text(`BOM produces ${outputQty} ${outputUom} per batch`);
                    
                    // Set default quantity
                    if (!$('#quantityToProduce').val()) {
                        $('#quantityToProduce').val(outputQty);
                    }
                } else {
                    $('#bomDetailsCard, #rawMaterialsCard, #costSummaryCard').hide();
                    $('#bomOutputHint').text('');
                }
            });
            
            // Quantity change
            $('#quantityToProduce').on('input', function() {
                if (self.selectedBom) {
                    self.calculateRequirements();
                }
            });
            
            // Check availability button
            $('#checkAvailabilityBtn').on('click', function() {
                self.checkStockAvailability();
            });
            
            // Form submit
            $('#manufacturingOrderForm').on('submit', function(e) {
                e.preventDefault();
                self.createOrder(false);
            });
            
            // Create and validate button
            $('#createAndValidateBtn').on('click', function() {
                if (self.validateForm()) {
                    self.createOrder(true);
                }
            });
        },
        
        loadBomDetails: function(bomId) {
            const self = this;
            
            TempleAPI.get('/manufacturing/bom/' + bomId)
                .done(function(response) {
                    if (response.success) {
                        self.selectedBom = response.data;
                        self.renderBomDetails();
                        self.calculateRequirements();
                        
                        // Show cards
                        $('#bomDetailsCard, #rawMaterialsCard, #costSummaryCard').show();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load BOM details', 'error');
                });
        },
        
        renderBomDetails: function() {
            const bom = this.selectedBom;
            
            const html = `
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <td width="40%">BOM Code:</td>
                                <td><strong>${bom.bom_code}</strong></td>
                            </tr>
                            <tr>
                                <td>Product:</td>
                                <td>${bom.product.name}</td>
                            </tr>
                            <tr>
                                <td>Output Quantity:</td>
                                <td>${bom.output_quantity} ${bom.output_uom.uom_short}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <td width="40%">Material Cost:</td>
                                <td>${TempleCore.formatCurrency(bom.total_cost - bom.labor_cost - bom.overhead_cost)}</td>
                            </tr>
                            <tr>
                                <td>Labor Cost:</td>
                                <td>${TempleCore.formatCurrency(bom.labor_cost)}</td>
                            </tr>
                            <tr>
                                <td>Overhead Cost:</td>
                                <td>${TempleCore.formatCurrency(bom.overhead_cost)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            `;
            
            $('#bomDetailsContent').html(html);
        },
        
        calculateRequirements: function() {
            const bom = this.selectedBom;
            const quantityToProduce = parseFloat($('#quantityToProduce').val()) || 0;
            
            if (!bom || quantityToProduce <= 0) {
                return;
            }
            
            const multiplier = quantityToProduce / bom.output_quantity;
            let html = '';
            let totalMaterialCost = 0;
            
            bom.details.forEach(function(detail) {
                const requiredQuantity = detail.quantity * multiplier;
                const totalCost = detail.unit_cost * requiredQuantity;
                totalMaterialCost += totalCost;
                
                html += `
                    <tr>
                        <td>${detail.raw_material.product_code} - ${detail.raw_material.name}</td>
                        <td>${detail.quantity} ${detail.uom.uom_short}</td>
                        <td>${requiredQuantity.toFixed(3)} ${detail.uom.uom_short}</td>
                        <td>${TempleCore.formatCurrency(detail.unit_cost)}</td>
                        <td>${TempleCore.formatCurrency(totalCost)}</td>
                    </tr>
                `;
            });
            
            $('#rawMaterialsTableBody').html(html);
            $('#totalMaterialCost').text(TempleCore.formatCurrency(totalMaterialCost));
            
            // Calculate total costs
            const laborCost = bom.labor_cost * multiplier;
            const overheadCost = bom.overhead_cost * multiplier;
            const totalCost = totalMaterialCost + laborCost + overheadCost;
            const unitCost = totalCost / quantityToProduce;
            
            // Update cost summary
            $('#summaryMaterialCost').text(TempleCore.formatCurrency(totalMaterialCost));
            $('#summaryLaborCost').text(TempleCore.formatCurrency(laborCost));
            $('#summaryOverheadCost').text(TempleCore.formatCurrency(overheadCost));
            $('#summaryTotalCost').text(TempleCore.formatCurrency(totalCost));
            $('#summaryUnitCost').text(TempleCore.formatCurrency(unitCost) + ' per ' + bom.output_uom.uom_short);
        },
        
        checkStockAvailability: function() {
            const bomId = $('#bomMasterId').val();
            const warehouseId = $('#warehouseId').val();
            const quantityToProduce = $('#quantityToProduce').val();
            
            if (!bomId || !warehouseId || !quantityToProduce) {
                TempleCore.showToast('Please fill all required fields first', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/manufacturing/orders/check-availability', {
                bom_master_id: bomId,
                quantity_to_produce: parseFloat(quantityToProduce),
                warehouse_id: parseInt(warehouseId)
            })
            .done(function(response) {
                if (response.success) {
                    ManufacturingOrdersCreatePage.showAvailabilityResult(response);
                }
            })
            .fail(function() {
                TempleCore.showToast('Failed to check stock availability', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        showAvailabilityResult: function(response) {
            let html = '';
            
            if (response.available) {
                html = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> All raw materials are available in stock!
                    </div>
                    <p>You can proceed to create and validate the manufacturing order.</p>
                `;
                
                // Update alert in main form
                $('#availabilityAlert').html(`
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="bi bi-check-circle"></i> Stock availability confirmed!
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `);
            } else {
                html = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> Insufficient stock for some raw materials
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Required</th>
                                <th>Available</th>
                                <th>Shortage</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                if (response.shortages) {
                    response.shortages.forEach(function(shortage) {
                        html += `
                            <tr>
                                <td>${shortage.product_name}</td>
                                <td class="text-end">${shortage.required.toFixed(3)}</td>
                                <td class="text-end">${shortage.available.toFixed(3)}</td>
                                <td class="text-end text-danger">${shortage.shortage.toFixed(3)}</td>
                            </tr>
                        `;
                    });
                }
                
                html += `
                        </tbody>
                    </table>
                    <p class="mt-3">You can still create the order in <strong>Draft</strong> status, but validation will fail until sufficient stock is available.</p>
                `;
                
                // Update alert in main form
                $('#availabilityAlert').html(`
                    <div class="alert alert-warning alert-dismissible fade show" role="alert">
                        <i class="bi bi-exclamation-triangle"></i> Stock shortage detected! Order can be created but not validated.
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `);
            }
            
            $('#stockAvailabilityContent').html(html);
            const modal = new bootstrap.Modal(document.getElementById('stockAvailabilityModal'));
            modal.show();
        },
        
        validateForm: function() {
            if (!$('#bomMasterId').val()) {
                TempleCore.showToast('Please select a BOM', 'warning');
                return false;
            }
            
            if (!$('#warehouseId').val()) {
                TempleCore.showToast('Please select a warehouse', 'warning');
                return false;
            }
            
            const quantity = parseFloat($('#quantityToProduce').val());
            if (!quantity || quantity <= 0) {
                TempleCore.showToast('Please enter valid quantity to produce', 'warning');
                return false;
            }
            
            if (!$('#scheduledDate').val()) {
                TempleCore.showToast('Please select scheduled date', 'warning');
                return false;
            }
            
            return true;
        },
        
        createOrder: function(shouldValidate) {
            if (!this.validateForm()) {
                return;
            }
            
            // Get the selected BOM option to extract product_id
            const $selectedBomOption = $('#bomMasterId').find('option:selected');
            const productId = $selectedBomOption.data('product-id');
            const outputUomId = $selectedBomOption.data('output-uom-id');
            
            if (!productId) {
                TempleCore.showToast('Product information not found for selected BOM', 'error');
                return;
            }
            
            const orderData = {
                bom_master_id: $('#bomMasterId').val(),
                product_id: parseInt(productId), // IMPORTANT: Include product_id from BOM
                quantity_to_produce: parseFloat($('#quantityToProduce').val()),
                warehouse_id: parseInt($('#warehouseId').val()),
                priority: $('#priority').val(),
                scheduled_date: $('#scheduledDate').val(),
                notes: $('#notes').val() || null
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/manufacturing/orders', orderData)
                .done(function(response) {
                    if (response.success) {
                        if (shouldValidate && response.data && response.data.id) {
                            // Validate the order
                            TempleAPI.post('/manufacturing/orders/' + response.data.id + '/validate')
                                .done(function(validateResponse) {
                                    if (validateResponse.success) {
                                        TempleCore.showToast('Order created and validated successfully', 'success');
                                        TempleRouter.navigate('manufacturing/orders');
                                    } else {
                                        TempleCore.showToast('Order created but validation failed. Please check stock availability.', 'warning');
                                        TempleRouter.navigate('manufacturing/orders');
                                    }
                                })
                                .fail(function(xhr) {
                                    const validateResponse = xhr.responseJSON;
                                    if (validateResponse && validateResponse.shortages) {
                                        TempleCore.showToast('Order created but has stock shortages. Please review.', 'warning');
                                    } else {
                                        TempleCore.showToast('Order created but validation failed', 'warning');
                                    }
                                    TempleRouter.navigate('manufacturing/orders');
                                });
                        } else {
                            TempleCore.showToast('Manufacturing order created successfully', 'success');
                            TempleRouter.navigate('manufacturing/orders');
                        }
                    }
                })
                .fail(function(xhr) {
                    const response = xhr.responseJSON;
                    if (response && response.errors) {
                        // Handle validation errors
                        let errorMessage = 'Validation failed:\n';
                        Object.keys(response.errors).forEach(function(field) {
                            errorMessage += '- ' + response.errors[field][0] + '\n';
                        });
                        TempleCore.showToast(errorMessage, 'error');
                    } else if (response && response.message) {
                        TempleCore.showToast(response.message, 'error');
                    } else {
                        TempleCore.showToast('Failed to create order', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        }
    };
    
})(jQuery, window);