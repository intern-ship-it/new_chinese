// js/pages/manufacturing/orders/edit.js
// Edit Manufacturing Order Page

(function($, window) {
    'use strict';
    
    window.ManufacturingOrdersEditPage = {
        orderId: null,
        currentOrder: null,
        originalData: null,
        activeBoms: [],
        warehouses: [],
        
        init: function(params) {
            if (!params || !params.id) {
                TempleCore.showToast('Invalid order ID', 'error');
                TempleRouter.navigate('manufacturing/orders');
                return;
            }
            
            this.orderId = params.id;
            this.render();
            this.loadInitialData();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Edit Manufacturing Order</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('manufacturing/orders'); return false;">Production Orders</a></li>
                                    <li class="breadcrumb-item active">Edit</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <span id="orderStatus"></span>
                        </div>
                    </div>
                    
                    <!-- Loading indicator -->
                    <div id="loadingIndicator" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading order details...</p>
                    </div>
                    
                    <!-- Main form (hidden initially) -->
                    <form id="manufacturingOrderForm" style="display: none;">
                        <!-- Order Info Card -->
                        <div class="card mb-3">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Order Information</h5>
                                <span class="badge" id="orderNumberBadge"></span>
                            </div>
                            <div class="card-body">
                                <!-- Status alerts -->
                                <div id="statusAlerts"></div>
                                
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">BOM (Recipe)</label>
                                        <select class="form-select" id="bomMasterId" disabled>
                                            <option value="">Loading...</option>
                                        </select>
                                        <small class="text-muted">BOM cannot be changed after creation</small>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Warehouse</label>
                                        <select class="form-select" id="warehouseId" disabled>
                                            <option value="">Loading...</option>
                                        </select>
                                        <small class="text-muted">Warehouse cannot be changed after creation</small>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Quantity to Produce <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="quantityToProduce" step="0.001" min="0.001" required>
                                        <small class="text-muted" id="bomOutputHint"></small>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Priority</label>
                                        <select class="form-select" id="priority">
                                            <option value="LOW">Low</option>
                                            <option value="NORMAL">Normal</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Scheduled Date</label>
                                        <input type="date" class="form-control" id="scheduledDate">
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
                        
                        <!-- Production Status Card (for non-draft orders) -->
                        <div class="card mb-3" id="productionStatusCard" style="display: none;">
                            <div class="card-header">
                                <h5 class="mb-0">Production Status</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <table class="table table-sm">
                                            <tr>
                                                <td width="50%">Created By:</td>
                                                <td id="createdBy">-</td>
                                            </tr>
                                            <tr>
                                                <td>Created At:</td>
                                                <td id="createdAt">-</td>
                                            </tr>
                                            <tr id="validatedRow" style="display: none;">
                                                <td>Validated By:</td>
                                                <td id="validatedBy">-</td>
                                            </tr>
                                            <tr id="startedRow" style="display: none;">
                                                <td>Started At:</td>
                                                <td id="startedAt">-</td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="col-md-6">
                                        <table class="table table-sm">
                                            <tr>
                                                <td width="50%">Quantity Produced:</td>
                                                <td id="quantityProduced">0</td>
                                            </tr>
                                            <tr>
                                                <td>Batch Number:</td>
                                                <td id="batchNumber">-</td>
                                            </tr>
                                            <tr id="qualityRow" style="display: none;">
                                                <td>Quality Status:</td>
                                                <td id="qualityStatus">-</td>
                                            </tr>
                                            <tr id="completedRow" style="display: none;">
                                                <td>Completed At:</td>
                                                <td id="completedAt">-</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Raw Materials Card -->
                        <div class="card mb-3" id="rawMaterialsCard">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Raw Materials Requirement</h5>
                                <button type="button" class="btn btn-sm btn-info" id="recheckAvailabilityBtn">
                                    <i class="bi bi-arrow-clockwise"></i> Recheck Availability
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
                                                <th>Status</th>
                                                <th>Unit Cost</th>
                                                <th>Total Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody id="rawMaterialsTableBody">
                                            <!-- Content will be loaded here -->
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <th colspan="5" class="text-end">Total Material Cost:</th>
                                                <th id="totalMaterialCost">0.00</th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cost Summary Card -->
                        <div class="card mb-3" id="costSummaryCard">
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
                                                <td class="text-end">
                                                    <input type="number" class="form-control form-control-sm text-end" 
                                                           id="laborCost" step="0.01" min="0" style="width: 100px; display: inline;">
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Overhead Cost:</td>
                                                <td class="text-end">
                                                    <input type="number" class="form-control form-control-sm text-end" 
                                                           id="overheadCost" step="0.01" min="0" style="width: 100px; display: inline;">
                                                </td>
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
                                        <div id="orderActionHints" class="alert alert-info">
                                            <!-- Dynamic hints based on status -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="row mt-3">
                            <div class="col-12">
                                <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('manufacturing/orders'); return false;">
                                    <i class="bi bi-arrow-left"></i> Back to List
                                </button>
                                <button type="submit" class="btn btn-primary" id="saveChangesBtn">
                                    <i class="bi bi-save"></i> Save Changes
                                </button>
                                <button type="button" class="btn btn-warning" id="cancelChangesBtn">
                                    <i class="bi bi-x-circle"></i> Cancel Changes
                                </button>
                                
                                <!-- Status-specific action buttons -->
                                <div id="statusActions" class="d-inline-block ms-3">
                                    <!-- Dynamic buttons will be added here -->
                                </div>
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

                <!-- Cancel Order Confirmation Modal -->
                <div class="modal fade" id="cancelOrderModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">Cancel Manufacturing Order</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Are you sure you want to cancel this manufacturing order?</p>
                                <div class="form-group">
                                    <label class="form-label">Cancellation Reason <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="cancellationReason" rows="3" required></textarea>
                                </div>
                                <div class="alert alert-warning mt-3">
                                    <i class="bi bi-exclamation-triangle"></i> 
                                    This action cannot be undone. Any reserved stock will be released.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No, Keep Order</button>
                                <button type="button" class="btn btn-danger" id="confirmCancelOrderBtn">Yes, Cancel Order</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadInitialData: function() {
            const self = this;
            
            // Load order details
            TempleAPI.get('/manufacturing/orders/' + this.orderId)
                .done(function(response) {
                    if (response.success) {
                        self.currentOrder = response.data;
                        self.originalData = JSON.parse(JSON.stringify(response.data));
                        
                        // Load related data
                        Promise.all([
                            self.loadBoms(),
                            self.loadWarehouses()
                        ]).then(function() {
                            self.populateForm();
                            self.updateEditableFields();
                            self.updateStatusActions();
                            $('#loadingIndicator').hide();
                            $('#manufacturingOrderForm').show();
                        });
                    }
                })
                .fail(function(xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Failed to load order details', 'error');
                    TempleRouter.navigate('manufacturing/orders');
                });
        },
        
        loadBoms: function() {
            const self = this;
            return new Promise(function(resolve) {
                TempleAPI.get('/manufacturing/orders/active-boms')
                    .done(function(response) {
                        if (response.success) {
                            self.activeBoms = response.data;
                            
                            let options = '';
                            response.data.forEach(function(bom) {
                                const selected = bom.id === self.currentOrder.bom_master_id ? 'selected' : '';
                                options += `
                                    <option value="${bom.id}" ${selected}>
                                        ${bom.bom_code} - ${bom.product_name} (${bom.output_quantity} ${bom.output_uom})
                                    </option>`;
                            });
                            $('#bomMasterId').html(options);
                        }
                        resolve();
                    })
                    .fail(resolve);
            });
        },
        
        loadWarehouses: function() {
            const self = this;
            return new Promise(function(resolve) {
                TempleAPI.get('/manufacturing/orders/warehouses')
                    .done(function(response) {
                        if (response.success) {
                            self.warehouses = response.data;
                            
                            let options = '';
                            response.data.forEach(function(warehouse) {
                                const selected = warehouse.id === self.currentOrder.id ? 'selected' : '';
                                options += `<option value="${warehouse.id}" ${selected}>${warehouse.name}</option>`;
                            });
                            $('#warehouseId').html(options);
                        }
                        resolve();
                    })
                    .fail(resolve);
            });
        },
        
        populateForm: function() {
            const order = this.currentOrder;
            
            // Basic info
            $('#orderNumberBadge').text(order.order_number).addClass('bg-primary');
            $('#orderStatus').html(this.getStatusBadge(order.status));
            
            // Form fields
            $('#quantityToProduce').val(order.quantity_to_produce);
            $('#priority').val(order.priority);
            $('#scheduledDate').val(order.scheduled_date);
            $('#qualityCheckRequired').prop('checked', order.quality_check_required);
            $('#notes').val(order.notes || '');
            $('#laborCost').val(order.labor_cost || 0);
            $('#overheadCost').val(order.overhead_cost || 0);
            
            // BOM hint
            if (order.bom_master) {
                $('#bomOutputHint').text(`BOM produces ${order.bom_master.output_quantity} ${order.bom_master.output_uom.uom_short} per batch`);
            }
            
            // Production status (if not draft)
            if (order.status !== 'DRAFT') {
                $('#productionStatusCard').show();
                $('#createdBy').text(order.creator?.name || '-');
                $('#createdAt').text(TempleCore.formatDate(order.created_at, 'time'));
                $('#quantityProduced').text(order.quantity_produced + ' ' + order.uom.uom_short);
                $('#batchNumber').text(order.batch_number || '-');
                
                if (order.validated_at) {
                    $('#validatedRow').show();
                    $('#validatedBy').text(order.validator?.name || '-');
                }
                
                if (order.started_at) {
                    $('#startedRow').show();
                    $('#startedAt').text(TempleCore.formatDate(order.started_at, 'time'));
                }
                
                if (order.quality_check_required) {
                    $('#qualityRow').show();
                    $('#qualityStatus').html(order.quality_status ? this.getQualityBadge(order.quality_status) : 'Pending');
                }
                
                if (order.completed_at) {
                    $('#completedRow').show();
                    $('#completedAt').text(TempleCore.formatDate(order.completed_at, 'time'));
                }
            }
            
            // Load raw materials
            this.loadRawMaterials();
            
            // Update costs
            this.calculateCosts();
        },
        
        loadRawMaterials: function() {
            const order = this.currentOrder;
            let html = '';
            let totalMaterialCost = 0;
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(function(item) {
                    const statusBadge = ManufacturingOrdersEditPage.getItemStatusBadge(item.status);
                    const totalCost = item.required_quantity * item.unit_cost;
                    totalMaterialCost += totalCost;
                    
                    html += `
                        <tr>
                            <td>${item.raw_material.product_code} - ${item.raw_material.name}</td>
                            <td>${item.bom_quantity || '-'} ${item.uom.uom_short}</td>
                            <td>${item.required_quantity} ${item.uom.uom_short}</td>
                            <td>${statusBadge}</td>
                            <td>${TempleCore.formatCurrency(item.unit_cost)}</td>
                            <td>${TempleCore.formatCurrency(totalCost)}</td>
                        </tr>
                    `;
                });
            } else {
                html = '<tr><td colspan="6" class="text-center">No raw materials loaded</td></tr>';
            }
            
            $('#rawMaterialsTableBody').html(html);
            $('#totalMaterialCost').text(TempleCore.formatCurrency(totalMaterialCost));
            $('#summaryMaterialCost').text(TempleCore.formatCurrency(totalMaterialCost));
        },
        
        updateEditableFields: function() {
            const status = this.currentOrder.status;
            
            // Disable fields based on status
            if (status !== 'DRAFT') {
                // Cannot change quantity after validation
                $('#quantityToProduce').prop('disabled', true);
                
                // Cannot change quality check requirement after validation
                $('#qualityCheckRequired').prop('disabled', true);
            }
            
            if (status === 'COMPLETED' || status === 'CANCELLED') {
                // Disable all editing for completed/cancelled orders
                $('#manufacturingOrderForm input, #manufacturingOrderForm select, #manufacturingOrderForm textarea')
                    .prop('disabled', true);
                $('#saveChangesBtn, #cancelChangesBtn').hide();
            }
            
            // Show appropriate alerts
            this.showStatusAlerts();
        },
        
        showStatusAlerts: function() {
            const status = this.currentOrder.status;
            let alertHtml = '';
            
            if (status === 'VALIDATED') {
                alertHtml = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        Order is validated and raw materials are reserved. Limited editing allowed.
                    </div>
                `;
            } else if (status === 'IN_PROGRESS') {
                alertHtml = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> 
                        Manufacturing is in progress. Only notes and scheduled date can be updated.
                    </div>
                `;
            } else if (status === 'COMPLETED') {
                alertHtml = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> 
                        Order is completed. View-only mode.
                    </div>
                `;
            } else if (status === 'CANCELLED') {
                alertHtml = `
                    <div class="alert alert-danger">
                        <i class="bi bi-x-circle"></i> 
                        Order is cancelled. View-only mode.
                        ${this.currentOrder.cancellation_reason ? `<br>Reason: ${this.currentOrder.cancellation_reason}` : ''}
                    </div>
                `;
            }
            
            $('#statusAlerts').html(alertHtml);
        },
        
        updateStatusActions: function() {
            const status = this.currentOrder.status;
            let actionsHtml = '';
            let hintsHtml = '';
            
            switch(status) {
                case 'DRAFT':
                    actionsHtml = `
                        <button type="button" class="btn btn-success" id="validateOrderBtn">
                            <i class="bi bi-check-circle"></i> Validate Order
                        </button>
                        <button type="button" class="btn btn-danger" id="cancelOrderBtn">
                            <i class="bi bi-x-circle"></i> Cancel Order
                        </button>
                    `;
                    hintsHtml = `
                        <i class="bi bi-info-circle"></i> 
                        <strong>Next Step:</strong> Validate the order to check and reserve raw materials.
                    `;
                    break;
                    
                case 'VALIDATED':
                    actionsHtml = `
                        <button type="button" class="btn btn-primary" id="startManufacturingBtn">
                            <i class="bi bi-play-circle"></i> Start Manufacturing
                        </button>
                        <button type="button" class="btn btn-danger" id="cancelOrderBtn">
                            <i class="bi bi-x-circle"></i> Cancel Order
                        </button>
                    `;
                    hintsHtml = `
                        <i class="bi bi-info-circle"></i> 
                        <strong>Next Step:</strong> Start manufacturing to begin production and consume raw materials.
                    `;
                    break;
                    
                case 'IN_PROGRESS':
                    if (this.currentOrder.quality_check_required && !this.currentOrder.quality_status) {
                        actionsHtml = `
                            <button type="button" class="btn btn-warning" id="qualityCheckBtn">
                                <i class="bi bi-clipboard-check"></i> Perform Quality Check
                            </button>
                        `;
                        hintsHtml = `
                            <i class="bi bi-info-circle"></i> 
                            <strong>Next Step:</strong> Perform quality check before completing the order.
                        `;
                    } else {
                        actionsHtml = `
                            <button type="button" class="btn btn-success" id="completeOrderBtn">
                                <i class="bi bi-check-square"></i> Complete Manufacturing
                            </button>
                        `;
                        hintsHtml = `
                            <i class="bi bi-info-circle"></i> 
                            <strong>Next Step:</strong> Complete manufacturing to add finished product to inventory.
                        `;
                    }
                    actionsHtml += `
                        <button type="button" class="btn btn-danger" id="cancelOrderBtn">
                            <i class="bi bi-x-circle"></i> Cancel Order
                        </button>
                    `;
                    break;
                    
                case 'COMPLETED':
                    hintsHtml = `
                        <i class="bi bi-check-circle"></i> 
                        Manufacturing completed successfully. Product added to inventory.
                    `;
                    break;
                    
                case 'CANCELLED':
                    hintsHtml = `
                        <i class="bi bi-x-circle"></i> 
                        Order was cancelled. No further actions available.
                    `;
                    break;
            }
            
            $('#statusActions').html(actionsHtml);
            $('#orderActionHints').html(hintsHtml);
            
            // Bind action button events
            this.bindActionButtons();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Quantity change
            $('#quantityToProduce').on('input', function() {
                self.recalculateRequirements();
            });
            
            // Cost inputs change
            $('#laborCost, #overheadCost').on('input', function() {
                self.calculateCosts();
            });
            
            // Recheck availability
            $('#recheckAvailabilityBtn').on('click', function() {
                self.checkStockAvailability();
            });
            
            // Form submit
            $('#manufacturingOrderForm').on('submit', function(e) {
                e.preventDefault();
                self.saveChanges();
            });
            
            // Cancel changes
            $('#cancelChangesBtn').on('click', function() {
                if (self.hasUnsavedChanges()) {
                    TempleCore.showConfirm(
                        'Discard Changes',
                        'Are you sure you want to discard unsaved changes?',
                        function() {
                            TempleRouter.navigate('manufacturing/orders');
                        }
                    );
                } else {
                    TempleRouter.navigate('manufacturing/orders');
                }
            });
            
            // Cancel order confirmation
            $('#confirmCancelOrderBtn').on('click', function() {
                self.cancelOrder();
            });
        },
        
        bindActionButtons: function() {
            const self = this;
            
            // Validate order
            $('#validateOrderBtn').on('click', function() {
                self.validateOrder();
            });
            
            // Start manufacturing
            $('#startManufacturingBtn').on('click', function() {
                self.startManufacturing();
            });
            
            // Complete order
            $('#completeOrderBtn').on('click', function() {
                self.completeManufacturing();
            });
            
            // Quality check
            $('#qualityCheckBtn').on('click', function() {
                TempleRouter.navigate('manufacturing/orders/quality-check', { id: self.orderId });
            });
            
            // Cancel order
            $('#cancelOrderBtn').on('click', function() {
                $('#cancellationReason').val('');
                const modal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));
                modal.show();
            });
        },
        
        recalculateRequirements: function() {
            if (!this.currentOrder.bom_master) return;
            
            const newQuantity = parseFloat($('#quantityToProduce').val()) || 0;
            const originalQuantity = this.originalData.quantity_to_produce;
            const multiplier = newQuantity / this.currentOrder.bom_master.output_quantity;
            
            // Update raw materials table
            let html = '';
            let totalMaterialCost = 0;
            
            this.currentOrder.items.forEach(function(item) {
                const newRequired = (item.bom_quantity || 0) * multiplier;
                const totalCost = newRequired * item.unit_cost;
                totalMaterialCost += totalCost;
                
                const statusBadge = ManufacturingOrdersEditPage.getItemStatusBadge(item.status);
                
                html += `
                    <tr>
                        <td>${item.raw_material.product_code} - ${item.raw_material.name}</td>
                        <td>${item.bom_quantity || '-'} ${item.uom.uom_short}</td>
                       <td>
    ${(newRequired ?? 0).toFixed(3)} ${item.uom?.uom_short || ''}
    ${newQuantity !== originalQuantity ? 
        `<small class="text-muted">(was ${item.required_quantity ?? 0})</small>` : ''}
</td>

                        <td>${statusBadge}</td>
                        <td>${TempleCore.formatCurrency(item.unit_cost)}</td>
                        <td>${TempleCore.formatCurrency(totalCost)}</td>
                    </tr>
                `;
            });
            
            $('#rawMaterialsTableBody').html(html);
            $('#totalMaterialCost').text(TempleCore.formatCurrency(totalMaterialCost));
            $('#summaryMaterialCost').text(TempleCore.formatCurrency(totalMaterialCost));
            
            this.calculateCosts();
        },
        
        calculateCosts: function() {
            const materialCost = parseFloat($('#summaryMaterialCost').text().replace(/[^0-9.-]/g, '')) || 0;
            const laborCost = parseFloat($('#laborCost').val()) || 0;
            const overheadCost = parseFloat($('#overheadCost').val()) || 0;
            const totalCost = materialCost + laborCost + overheadCost;
            
            const quantity = parseFloat($('#quantityToProduce').val()) || 1;
            const unitCost = totalCost / quantity;
            
            $('#summaryTotalCost').text(TempleCore.formatCurrency(totalCost));
            $('#summaryUnitCost').text(TempleCore.formatCurrency(unitCost) + ' per ' + (this.currentOrder.uom?.uom_short || 'unit'));
        },
        
        checkStockAvailability: function() {
            const quantity = parseFloat($('#quantityToProduce').val());
            if (!quantity) {
                TempleCore.showToast('Please enter quantity first', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/manufacturing/orders/' + this.orderId + '/check-availability', {
                quantity_to_produce: quantity
            })
            .done(function(response) {
                if (response.success) {
                    ManufacturingOrdersEditPage.showAvailabilityResult(response.data);
                }
            })
            .fail(function() {
                TempleCore.showToast('Failed to check stock availability', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        showAvailabilityResult: function(data) {
            let html = '';
            
            if (data.available) {
                html = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i> All raw materials are available!
                    </div>
                `;
                $('#availabilityAlert').html(`
                    <div class="alert alert-success alert-dismissible">
                        <i class="bi bi-check-circle"></i> Stock availability confirmed
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `);
            } else {
                html = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> Insufficient stock for some materials
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
                
                data.shortages.forEach(function(shortage) {
                    html += `
                        <tr>
                            <td>${shortage.product_name}</td>
                           <td>${(shortage?.required_quantity ?? 0).toFixed(3)}</td>
<td>${(shortage?.available_quantity ?? 0).toFixed(3)}</td>
<td class="text-danger">${(shortage?.shortage_quantity ?? 0).toFixed(3)}</td>
                   
                        </tr>
                    `;
                });
                
                html += '</tbody></table>';
                
                $('#availabilityAlert').html(`
                    <div class="alert alert-warning alert-dismissible">
                        <i class="bi bi-exclamation-triangle"></i> Stock shortage detected
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `);
            }
            
            $('#stockAvailabilityContent').html(html);
            const modal = new bootstrap.Modal(document.getElementById('stockAvailabilityModal'));
            modal.show();
        },
        
        hasUnsavedChanges: function() {
            // Check if any editable fields have changed
            if (this.currentOrder.status === 'DRAFT') {
                return $('#quantityToProduce').val() != this.originalData.quantity_to_produce ||
                       $('#priority').val() != this.originalData.priority ||
                       $('#scheduledDate').val() != this.originalData.scheduled_date ||
                       $('#qualityCheckRequired').is(':checked') != this.originalData.quality_check_required ||
                       $('#notes').val() != (this.originalData.notes || '') ||
                       $('#laborCost').val() != (this.originalData.labor_cost || 0) ||
                       $('#overheadCost').val() != (this.originalData.overhead_cost || 0);
            }
            
            // For other statuses, check limited fields
            return $('#priority').val() != this.originalData.priority ||
                   $('#scheduledDate').val() != this.originalData.scheduled_date ||
                   $('#notes').val() != (this.originalData.notes || '');
        },
        
        saveChanges: function() {
            const self = this;
            
            // Prepare update data based on status
            let updateData = {
                priority: $('#priority').val(),
                scheduled_date: $('#scheduledDate').val() || null,
                notes: $('#notes').val()
            };
            
            // Additional fields for DRAFT status
            if (this.currentOrder.status === 'DRAFT') {
                updateData.quantity_to_produce = parseFloat($('#quantityToProduce').val());
                updateData.quality_check_required = $('#qualityCheckRequired').is(':checked');
                updateData.labor_cost = parseFloat($('#laborCost').val()) || 0;
                updateData.overhead_cost = parseFloat($('#overheadCost').val()) || 0;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.put('/manufacturing/orders/' + this.orderId, updateData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Order updated successfully', 'success');
                        // Reload order data
                        self.loadInitialData();
                             TempleRouter.navigate('manufacturing/orders');
                    }
                })
                .fail(function(xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Failed to update order', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        validateOrder: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Validate Order',
                'This will check and reserve raw materials. Continue?',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/manufacturing/orders/' + self.orderId + '/validate')
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('Order validated successfully', 'success');
                                self.loadInitialData();
                            }
                        })
                        .fail(function(xhr) {
                            const response = xhr.responseJSON;
                            if (response && response.shortages) {
                                self.showAvailabilityResult({
                                    available: false,
                                    shortages: response.shortages
                                });
                            } else {
                                TempleCore.showToast(response?.message || 'Validation failed', 'error');
                            }
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },
        
        startManufacturing: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Start Manufacturing',
                'This will consume raw materials from inventory and begin production. Continue?',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/manufacturing/orders/' + self.orderId + '/start')
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('Manufacturing started successfully', 'success');
                                self.loadInitialData();
                            }
                        })
                        .fail(function(xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Failed to start manufacturing', 'error');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },
        
        completeManufacturing: function() {
            const self = this;
            
            const actualQuantity = prompt('Enter actual quantity produced (leave blank for planned quantity):');
            
            const data = {};
            if (actualQuantity && parseFloat(actualQuantity) > 0) {
                data.actual_quantity_produced = parseFloat(actualQuantity);
            }
            
            TempleCore.showConfirm(
                'Complete Manufacturing',
                'This will add the finished product to inventory. Continue?',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/manufacturing/orders/' + self.orderId + '/complete', data)
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('Manufacturing completed successfully', 'success');
                                TempleRouter.navigate('manufacturing/orders');
                            }
                        })
                        .fail(function(xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Failed to complete manufacturing', 'error');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },
        
        cancelOrder: function() {
            const self = this;
            const reason = $('#cancellationReason').val().trim();
            
            if (!reason) {
                TempleCore.showToast('Please provide a cancellation reason', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            bootstrap.Modal.getInstance(document.getElementById('cancelOrderModal')).hide();
            
            TempleAPI.post('/manufacturing/orders/' + this.orderId + '/cancel', {
                cancellation_reason: reason
            })
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast('Order cancelled successfully', 'success');
                    TempleRouter.navigate('manufacturing/orders');
                }
            })
            .fail(function(xhr) {
                const response = xhr.responseJSON;
                TempleCore.showToast(response?.message || 'Failed to cancel order', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'VALIDATED': '<span class="badge bg-info">Validated</span>',
                'IN_PROGRESS': '<span class="badge bg-warning">In Progress</span>',
                'COMPLETED': '<span class="badge bg-success">Completed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        getItemStatusBadge: function(status) {
            const badges = {
                'PENDING': '<span class="badge bg-secondary">Pending</span>',
                'RESERVED': '<span class="badge bg-info">Reserved</span>',
                'CONSUMED': '<span class="badge bg-success">Consumed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        getQualityBadge: function(status) {
            const badges = {
                'PENDING': '<span class="badge bg-warning">Pending</span>',
                'PASSED': '<span class="badge bg-success">Passed</span>',
                'FAILED': '<span class="badge bg-danger">Failed</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">N/A</span>';
        }
    };
    
})(jQuery, window);