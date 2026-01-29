// js/pages/sales/delivery-orders/view.js
// Sales Delivery Order View Page

(function ($, window) {
    'use strict';

    window.SalesDeliveryOrdersViewPage = {
        deliveryOrderId: null,
        deliveryOrderData: null,
        permissions: {},
        
        init: function (params) {
            // Extract ID from params object
            if (params && params.id) {
                this.deliveryOrderId = params.id;
            } else if (params && typeof params === 'string') {
                this.deliveryOrderId = params;
            }

            if (!this.deliveryOrderId) {
                TempleCore.showToast('Delivery Order ID is required', 'error');
                setTimeout(() => window.history.back(), 1000);
                return;
            }

            this.permissions = {
                can_quality_check: true,
                can_complete: true,
                can_cancel: true,
                can_delete: true
            };

            this.render();
            this.loadDeliveryOrder();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3><i class="bi bi-truck"></i> Delivery Order Details</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="backBtn">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                            <button class="btn btn-primary" id="printBtn">
                                <i class="bi bi-printer"></i> Print
                            </button>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading delivery order details...</p>
                    </div>

                    <!-- Content Container (hidden initially) -->
                    <div id="contentContainer" style="display: none;">
                        <!-- Header Card -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h5 class="mb-0" id="doNumber">DO-XXXX</h5>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <span id="statusBadge" class="badge bg-secondary">Status</span>
                                        <span id="qualityBadge" class="badge bg-info ms-2">Quality Status</span>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <th width="150">DO Date:</th>
                                                <td id="doDate">-</td>
                                            </tr>
                                            <tr>
                                                <th>Delivery Order No:</th>
                                                <td id="deliveryOrderNo">-</td>
                                            </tr>
                                            <tr>
                                                <th>Delivery Date:</th>
                                                <td id="deliveryDate">-</td>
                                            </tr>
                                            <tr>
                                                <th>Sales Order:</th>
                                                <td id="salesOrderNumber">-</td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="col-md-6">
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <th width="150">Customer:</th>
                                                <td id="customerName">-</td>
                                            </tr>
                                            <tr>
                                                <th>Warehouse:</th>
                                                <td id="warehouseName">-</td>
                                            </tr>
                                            <tr>
                                                <th>Vehicle Number:</th>
                                                <td id="vehicleNumber">-</td>
                                            </tr>
                                            <tr>
                                                <th>Created By:</th>
                                                <td id="createdBy">-</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Items Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Delivery Items</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered table-hover">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Item Description</th>
                                                <th>Type</th>
                                                <th>Ordered Qty</th>
                                                <th>Delivered Qty</th>
                                                <th>Accepted Qty</th>
                                                <th>Rejected Qty</th>
                                                <th>Unit Price</th>
                                                <th>Tax</th>
                                                <th>Discount</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody id="itemsTableBody">
                                            <tr>
                                                <td colspan="10" class="text-center">No items</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Quality Check Section -->
                        <div class="card mb-4" id="qualityCheckSection" style="display: none;">
                            <div class="card-header bg-warning">
                                <h5 class="mb-0">Quality Check Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4">
                                        <p><strong>Quality Status:</strong> <span id="qcStatus">-</span></p>
                                    </div>
                                    <div class="col-md-4">
                                        <p><strong>Checked By:</strong> <span id="qcCheckedBy">-</span></p>
                                    </div>
                                    <div class="col-md-4">
                                        <p><strong>Check Date:</strong> <span id="qcDate">-</span></p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-12">
                                        <p><strong>Notes:</strong></p>
                                        <p id="qcNotes" class="text-muted">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Totals Section -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row justify-content-end">
                                    <div class="col-md-4">
                                        <table class="table table-sm">
                                            <tr>
                                                <th>Subtotal:</th>
                                                <td class="text-end" id="subtotal">0.00</td>
                                            </tr>
                                            <tr>
                                                <th>Total Tax:</th>
                                                <td class="text-end" id="totalTax">0.00</td>
                                            </tr>
                                            <tr>
                                                <th>Total Discount:</th>
                                                <td class="text-end" id="totalDiscount">0.00</td>
                                            </tr>
                                            <tr class="table-primary">
                                                <th>Grand Total:</th>
                                                <th class="text-end" id="grandTotal">0.00</th>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Notes Section -->
                        <div class="card mb-4" id="notesSection" style="display: none;">
                            <div class="card-header">
                                <h5 class="mb-0">Notes</h5>
                            </div>
                            <div class="card-body">
                                <p id="notes" class="mb-0">-</p>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="card" id="actionButtons">
                            <div class="card-body text-end">
                                <!-- Dynamic buttons will be inserted here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
        },

        bindEvents: function () {
            const self = this;

            // Back button
            $(document).on('click', '#backBtn', function () {
                TempleRouter.navigate('sales/delivery-orders');
            });

            // Print button
            $(document).on('click', '#printBtn', function () {
                self.printDeliveryOrder();
            });

            // Quality Check button
            $(document).on('click', '#qualityCheckBtn', function () {
                self.showQualityCheckModal();
            });

            // Complete button
            $(document).on('click', '#completeBtn', function () {
                self.completeDeliveryOrder();
            });

            // Cancel button
            $(document).on('click', '#cancelBtn', function () {
                self.cancelDeliveryOrder();
            });

            // Delete button
            $(document).on('click', '#deleteBtn', function () {
                self.deleteDeliveryOrder();
            });
        },

        loadDeliveryOrder: function () {
            const self = this;

            $('#loadingState').show();
            $('#contentContainer').hide();

            TempleAPI.get(`/sales/delivery-orders/${this.deliveryOrderId}`)
                .done((response) => {
                    if (response.success) {
                        self.deliveryOrderData = response.data;
                        self.populateData();
                        $('#loadingState').hide();
                        $('#contentContainer').show();
                    }
                })
                .fail((xhr) => {
                    $('#loadingState').html(`
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                            Failed to load delivery order details
                        </div>
                    `);
                    TempleCore.handleAjaxError(xhr);
                });
        },

        populateData: function () {
            const d = this.deliveryOrderData;

            // Header
            $('#doNumber').text(d.do_number);
            $('#statusBadge').html(this.getStatusBadge(d.status));
            $('#qualityBadge').html(this.getQualityBadge(d));

            // Basic Info
            $('#doDate').text(TempleCore.formatDate(d.do_date));
            $('#deliveryOrderNo').text(d.delivery_order_no || '-');
            $('#deliveryDate').text(d.delivery_date ? TempleCore.formatDate(d.delivery_date) : '-');
            $('#salesOrderNumber').text(d.sales_order?.so_number || '-');
            $('#customerName').text(d.devotee?.customer_name || '-');
            $('#warehouseName').text(d.warehouse?.name || '-');
            $('#vehicleNumber').text(d.vehicle_number || '-');
            $('#createdBy').text(d.creator?.name || '-');

            // Items
            this.renderItems();

            // Quality Check
            if (d.quality_check_done) {
                $('#qualityCheckSection').show();
                $('#qcStatus').html(this.getQualityStatusBadge(d.quality_check_status));
                $('#qcCheckedBy').text(d.quality_checker?.name || '-');
                $('#qcDate').text(d.quality_check_date ? TempleCore.formatDate(d.quality_check_date) : '-');
                $('#qcNotes').text(d.quality_notes || 'No notes');
            }

            // Totals
            $('#subtotal').text(TempleCore.formatCurrency(d.subtotal));
            $('#totalTax').text(TempleCore.formatCurrency(d.total_tax));
            $('#totalDiscount').text(TempleCore.formatCurrency(d.discount_amount));
            $('#grandTotal').text(TempleCore.formatCurrency(d.total_amount));

            // Notes
            if (d.notes) {
                $('#notesSection').show();
                $('#notes').text(d.notes);
            }

            // Action Buttons
            this.renderActionButtons();
        },

        renderItems: function () {
            const items = this.deliveryOrderData.items || [];
            let html = '';

            if (items.length === 0) {
                html = '<tr><td colspan="10" class="text-center">No items found</td></tr>';
            } else {
                items.forEach(item => {
                    const itemType = item.is_addon ? 
                        (item.item_type === 'product' ? 'Product (Addon)' : 'Sales Item (Addon)') : 
                        'Package';
                    
                    html += `
                        <tr>
                            <td>${item.description || '-'}</td>
                            <td>${itemType}</td>
                            <td class="text-end">${item.ordered_quantity}</td>
                            <td class="text-end">${item.delivered_quantity}</td>
                            <td class="text-end">${item.accepted_quantity || '-'}</td>
                            <td class="text-end">${item.rejected_quantity || '-'}</td>
                            <td class="text-end">${TempleCore.formatCurrency(item.unit_price)}</td>
                            <td class="text-end">${TempleCore.formatCurrency(item.tax_amount)}</td>
                            <td class="text-end">${TempleCore.formatCurrency(item.discount_amount)}</td>
                            <td class="text-end">${TempleCore.formatCurrency(item.total_amount)}</td>
                        </tr>
                    `;
                });
            }

            $('#itemsTableBody').html(html);
        },

        renderActionButtons: function () {
            const d = this.deliveryOrderData;
            let buttons = '';

            if (!d.quality_check_done && d.status !== 'CANCELLED') {
                buttons += `
                    <button class="btn btn-warning me-2" id="qualityCheckBtn">
                        <i class="bi bi-clipboard-check"></i> Perform Quality Check
                    </button>
                `;
            }

            if ((d.status === 'QUALITY_CHECK' || (d.status === 'DRAFT' && d.quality_check_done)) 
                && d.status !== 'COMPLETED') {
                buttons += `
                    <button class="btn btn-success me-2" id="completeBtn">
                        <i class="bi bi-check-circle"></i> Complete Delivery
                    </button>
                `;
            }

            if (d.status !== 'COMPLETED' && d.status !== 'CANCELLED') {
                buttons += `
                    <button class="btn btn-danger me-2" id="cancelBtn">
                        <i class="bi bi-x-circle"></i> Cancel
                    </button>
                `;
            }

            if (d.status === 'DRAFT') {
                buttons += `
                    <button class="btn btn-danger" id="deleteBtn">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                `;
            }

            $('#actionButtons .card-body').html(buttons || '<p class="text-muted mb-0">No actions available</p>');
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'QUALITY_CHECK': '<span class="badge bg-warning">Quality Check</span>',
                'COMPLETED': '<span class="badge bg-success">Completed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>',
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },

        getQualityBadge: function (d) {
            if (!d.quality_check_done) {
                return '<span class="badge bg-secondary">Pending Quality Check</span>';
            }
            return this.getQualityStatusBadge(d.quality_check_status);
        },

        getQualityStatusBadge: function (status) {
            const badges = {
                'PASSED': '<span class="badge bg-success">Passed</span>',
                'FAILED': '<span class="badge bg-danger">Failed</span>',
                'PARTIAL': '<span class="badge bg-warning">Partial</span>',
            };
            return badges[status] || '<span class="badge bg-secondary">N/A</span>';
        },

        showQualityCheckModal: function () {
            // Redirect to the list page which has the quality check modal
            TempleRouter.navigate('sales/delivery-orders');
            
            // Or we can implement the modal here too
            // This would require copying the quality check modal from delivery-orders.js
        },

        completeDeliveryOrder: function () {
            const self = this;
            
            TempleCore.confirm(
                'Complete Delivery Order?',
                'This will mark the delivery order as completed.',
                () => {
                    TempleAPI.post(`/sales/delivery-orders/${self.deliveryOrderId}/complete`)
                        .done((response) => {
                            if (response.success) {
                                TempleCore.showToast('Delivery order completed successfully', 'success');
                                self.loadDeliveryOrder(); // Reload data
                            }
                        })
                        .fail((xhr) => {
                            TempleCore.handleAjaxError(xhr);
                        });
                }
            );
        },

        cancelDeliveryOrder: function () {
            const self = this;
            
            TempleCore.prompt(
                'Cancel Delivery Order',
                'Please provide a reason for cancellation:',
                (reason) => {
                    TempleAPI.post(`/sales/delivery-orders/${self.deliveryOrderId}/cancel`, { reason })
                        .done((response) => {
                            if (response.success) {
                                TempleCore.showToast('Delivery order cancelled successfully', 'success');
                                self.loadDeliveryOrder(); // Reload data
                            }
                        })
                        .fail((xhr) => {
                            TempleCore.handleAjaxError(xhr);
                        });
                }
            );
        },

        deleteDeliveryOrder: function () {
            const self = this;
            
            TempleCore.confirm(
                'Delete Delivery Order?',
                'This action cannot be undone. The delivery quantities will be reversed in the sales order.',
                () => {
                    TempleAPI.delete(`/sales/delivery-orders/${self.deliveryOrderId}`)
                        .done((response) => {
                            if (response.success) {
                                TempleCore.showToast('Delivery order deleted successfully', 'success');
                                setTimeout(() => {
                                    TempleRouter.navigate('sales/delivery-orders');
                                }, 1000);
                            }
                        })
                        .fail((xhr) => {
                            TempleCore.handleAjaxError(xhr);
                        });
                }
            );
        },

        printDeliveryOrder: function () {
            window.print();
        },

        cleanup: function () {
            $(document).off('click', '#backBtn');
            $(document).off('click', '#printBtn');
            $(document).off('click', '#qualityCheckBtn');
            $(document).off('click', '#completeBtn');
            $(document).off('click', '#cancelBtn');
            $(document).off('click', '#deleteBtn');
        }
    };

})(jQuery, window);