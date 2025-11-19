// js/pages/purchase/orders/edit.js
// Purchase Order Edit/View Page
(function ($, window) {
    'use strict';

    window.PurchaseOrdersEditPage = {
        orderId: null,
        orderData: null,
        items: [],
        isEditable: false,

        init: function (params) {
            if (!params || !params.id) {
                TempleCore.showToast('Invalid order ID', 'error');
                TempleRouter.navigate('purchase/orders');
                return;
            }

            this.orderId = params.id;
            this.loadOrderData();
        },

        loadOrderData: function () {
            const self = this;
            TempleCore.showLoading(true);

            TempleAPI.get('/purchase/orders/' + this.orderId)
                .done(function (response) {
                    if (response.success) {
                        // Parse numeric values to ensure they're numbers
                        self.orderData = response.data;
                        self.orderData.total_amount = parseFloat(self.orderData.total_amount) || 0;
                        self.orderData.subtotal = parseFloat(self.orderData.subtotal) || 0;
                        self.orderData.total_tax = parseFloat(self.orderData.total_tax) || 0;
                        self.orderData.shipping_charges = parseFloat(self.orderData.shipping_charges) || 0;
                        self.orderData.other_charges = parseFloat(self.orderData.other_charges) || 0;
                        self.orderData.discount_amount = parseFloat(self.orderData.discount_amount) || 0;

                        // Parse item amounts
                        self.items = (response.data.items || []).map(item => {
                            item.quantity = parseFloat(item.quantity) || 0;
                            item.unit_price = parseFloat(item.unit_price) || 0;
                            item.tax_amount = parseFloat(item.tax_amount) || 0;
                            item.tax_percent = parseFloat(item.tax_percent) || 0;
                            item.discount_value = parseFloat(item.discount_value) || 0;
                            item.discount_amount = parseFloat(item.discount_amount) || 0;
                            item.subtotal = parseFloat(item.subtotal) || 0;
                            item.total_amount = parseFloat(item.total_amount) || 0;
                            return item;
                        });

                        self.isEditable = response.data.status === 'DRAFT';
                        self.render();
                        self.populateData();
                        self.loadMasterData();
                        self.bindEvents();
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to load order';
                    TempleCore.showToast(error, 'error');
                    TempleRouter.navigate('purchase/orders');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Helper function to safely format currency
        formatCurrency: function (value) {
            const num = parseFloat(value) || 0;
            return num.toFixed(2);
        },

        render: function () {
            const order = this.orderData;
            const statusBadge = this.getStatusBadge(order.status);
            const title = this.isEditable ? 'Edit Purchase Order' : 'View Purchase Order';
            const readOnly = !this.isEditable ? 'readonly disabled' : '';

            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>${title}</h3>
                            <span class="badge ${statusBadge.class}">${statusBadge.text}</span>
                        </div>
                        <div class="col-md-6 text-end">
                            ${this.renderActionButtons()}
                        </div>
                    </div>
                    
                    <!-- Order Info Bar -->
                    <div class="alert alert-info">
                        <div class="row">
                            <div class="col-md-3">
                                <strong>PO Number:</strong> ${order.po_number}
                            </div>
                            <div class="col-md-3">
                                <strong>Created:</strong> ${moment(order.created_at).format('DD/MM/YYYY')}
                            </div>
                            <div class="col-md-3">
                                <strong>Created By:</strong> ${order.created_by_name || 'System'}
                            </div>
                            <div class="col-md-3">
                                <strong>Total Amount:</strong> RM ${this.formatCurrency(order.total_amount)}
                            </div>
                        </div>
                        ${order.approved_by ? `
                        <div class="row mt-2">
                            <div class="col-md-6">
                                <strong>Approved By:</strong> ${order.approved_by_name}
                            </div>
                            <div class="col-md-6">
                                <strong>Approved At:</strong> ${moment(order.approved_at).format('DD/MM/YYYY HH:mm')}
                            </div>
                        </div>
                        ` : ''}
                        ${order.rejection_reason ? `
                        <div class="row mt-2">
                            <div class="col-12">
                                <strong class="text-danger">Rejection Reason:</strong> ${order.rejection_reason}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <form id="poEditForm">
                        <!-- Order Details -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Order Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">PO Number</label>
                                        <input type="text" class="form-control" value="${order.po_number}" readonly>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">PO Date</label>
                                        <input type="date" class="form-control" id="poDate" 
                                               value="${moment(order.po_date).format('YYYY-MM-DD')}" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplierId" required ${readOnly}>
                                            <option value="">Select Supplier</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-md-3">
                                        <label class="form-label">Quotation Ref</label>
                                        <input type="text" class="form-control" id="quotationRef" ${readOnly}>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Delivery Date</label>
                                        <input type="date" class="form-control" id="deliveryDate" 
                                               min="${moment().add(1, 'day').format('YYYY-MM-DD')}" ${readOnly}>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Delivery Address</label>
                                        <input type="text" class="form-control" id="deliveryAddress" ${readOnly}>
                                    </div>
                                </div>
                                ${order.pr_number ? `
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="alert alert-secondary mb-0">
                                            <i class="bi bi-link"></i> Created from PR: <strong>${order.pr_number}</strong>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Items Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h5>Items</h5>
                                    </div>
                                    ${this.isEditable ? `
                                    <div class="col-md-6 text-end">
                                        <button type="button" class="btn btn-sm btn-primary" id="addItemBtn">
                                            <i class="bi bi-plus"></i> Add Item
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table" id="itemsTable">
                                        <thead>
                                            <tr>
                                                <th width="20%">Item</th>
                                                <th width="20%">Description</th>
                                                <th width="10%">Quantity</th>
                                                <th width="10%">Unit Price</th>
                                                <th width="10%">Tax</th>
                                                <th width="10%">Discount</th>
                                                <th width="15%">Total</th>
                                                ${this.isEditable ? '<th width="5%"></th>' : ''}
                                            </tr>
                                        </thead>
                                        <tbody id="itemsTableBody">
                                            <!-- Items will be rendered here -->
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="${this.isEditable ? 6 : 5}" class="text-end"><strong>Subtotal:</strong></td>
                                                <td colspan="2"><strong id="subtotal">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${this.isEditable ? 6 : 5}" class="text-end"><strong>Total Tax:</strong></td>
                                                <td colspan="2"><strong id="totalTax">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${this.isEditable ? 6 : 5}" class="text-end">
                                                    <strong>Shipping Charges:</strong>
                                                    ${this.isEditable ? `
                                                    <input type="number" class="form-control form-control-sm d-inline w-auto" 
                                                           id="shippingCharges" value="0" min="0" step="0.01">
                                                    ` : ''}
                                                </td>
                                                <td colspan="2"><strong id="shippingAmount">0.00</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="${this.isEditable ? 6 : 5}" class="text-end">
                                                    <strong>Other Charges:</strong>
                                                    ${this.isEditable ? `
                                                    <input type="number" class="form-control form-control-sm d-inline w-auto" 
                                                           id="otherCharges" value="0" min="0" step="0.01">
                                                    ` : ''}
                                                </td>
                                                <td colspan="2"><strong id="otherAmount">0.00</strong></td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td colspan="${this.isEditable ? 6 : 5}" class="text-end"><h5>Total Amount:</h5></td>
                                                <td colspan="2"><h5 id="totalAmount">0.00</h5></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Terms Section -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Payment Terms</label>
                                        <textarea class="form-control" id="paymentTerms" rows="3" ${readOnly}></textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Terms & Conditions</label>
                                        <textarea class="form-control" id="termsConditions" rows="3" ${readOnly}></textarea>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-md-12">
                                        <label class="form-label">Internal Notes</label>
                                        <textarea class="form-control" id="internalNotes" rows="2" ${readOnly}></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Related Documents -->
                        ${this.renderRelatedDocuments()}
                        
                        <!-- Action Buttons -->
                        ${this.isEditable ? `
                        <div class="card">
                            <div class="card-body text-end">
                                <button type="button" class="btn btn-secondary" id="saveDraftBtn">
                                    Save Changes
                                </button>
                                <button type="submit" class="btn btn-primary ms-2">
                                    Submit for Approval
                                </button>
                            </div>
                        </div>
                        ` : ''}
                    </form>
                </div>
                
                <!-- Modals -->
                ${this.renderModals()}
            `;

            $('#page-container').html(html);
        },

        renderActionButtons: function () {
            const order = this.orderData;
            const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.USER) || '{}');
            let buttons = '<button class="btn btn-secondary" id="backBtn"><i class="bi bi-arrow-left"></i> Back</button>';


            // Status-specific actions
            if (order.status === 'PENDING_APPROVAL' && user.user_type === 'SUPER_ADMIN') {
                buttons += ' <button class="btn btn-success ms-2" id="approveBtn"><i class="bi bi-check"></i> Approve</button>';
                buttons += ' <button class="btn btn-danger ms-2" id="rejectBtn"><i class="bi bi-x"></i> Reject</button>';
            }

            if (['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status)) {
                buttons += ' <button class="btn btn-warning ms-2" id="cancelBtn"><i class="bi bi-x-circle"></i> Cancel</button>';
            }

            if (order.status === 'APPROVED' && order.grn_status === 'PENDING') {
                buttons += ' <button class="btn btn-primary ms-2" id="createGrnBtn"><i class="bi bi-box-seam"></i> Create GRN</button>';
            }

            if (order.status === 'APPROVED' && order.invoice_status === 'PENDING') {
                buttons += ' <button class="btn btn-primary ms-2" id="createInvoiceBtn"><i class="bi bi-receipt"></i> Create Invoice</button>';
            }

            return buttons;
        },

        renderRelatedDocuments: function () {
            const order = this.orderData;

            if (!order.grns?.length && !order.invoices?.length) {
                return '';
            }

            let html = `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>Related Documents</h5>
                    </div>
                    <div class="card-body">
            `;

            // GRNs
            if (order.grns?.length > 0) {
                html += `
                    <h6>Goods Received Notes</h6>
                    <div class="table-responsive mb-3">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>GRN Number</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                order.grns.forEach(grn => {
                    html += `
                        <tr>
                            <td>${grn.grn_number}</td>
                            <td>${moment(grn.created_at).format('DD/MM/YYYY')}</td>
                            <td><span class="badge bg-${grn.status === 'COMPLETED' ? 'success' : 'warning'}">${grn.status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info view-grn" data-id="${grn.id}">
                                    <i class="bi bi-eye"></i> View
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
            }

            // Invoices
            if (order.invoices?.length > 0) {
                html += `
                    <h6>Purchase Invoices</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Invoice Number</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Payment Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                order.invoices.forEach(invoice => {
                    const invoiceAmount = parseFloat(invoice.total_amount) || 0;
                    html += `
                        <tr>
                            <td>${invoice.invoice_number}</td>
                            <td>${moment(invoice.invoice_date).format('DD/MM/YYYY')}</td>
                            <td>RM ${this.formatCurrency(invoiceAmount)}</td>
                            <td><span class="badge bg-${invoice.payment_status === 'PAID' ? 'success' : 'warning'}">${invoice.payment_status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info view-invoice" data-id="${invoice.id}">
                                    <i class="bi bi-eye"></i> View
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
            }

            html += '</div></div>';
            return html;
        },

        renderModals: function () {
            return `
                <!-- Item Modal (reuse from create) -->
                ${this.isEditable ? this.renderItemModal() : ''}
                
                <!-- Approval Modal -->
                <div class="modal fade" id="approvalModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Approve Purchase Order</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    You are about to approve PO: <strong>${this.orderData.po_number}</strong>
                                    <br>Total Amount: <strong>RM ${this.formatCurrency(this.orderData.total_amount)}</strong>
                                </div>
                                <div class="form-group">
                                    <label>Approval Notes (Optional)</label>
                                    <textarea class="form-control" id="approvalNotes" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmApproveBtn">Approve</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Rejection Modal -->
                <div class="modal fade" id="rejectionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reject Purchase Order</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-warning">
                                    You are about to reject PO: <strong>${this.orderData.po_number}</strong>
                                </div>
                                <div class="form-group">
                                    <label>Rejection Reason <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="rejectionReason" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmRejectBtn">Reject</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderItemModal: function () {
            return `
                <div class="modal fade" id="poItemModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add/Edit Item</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Type <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalItemType">
                                            <option value="">Select Type</option>
                                            <option value="product">Product</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Item <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalItemSelect" disabled>
                                            <option value="">Select item type first</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="modalDescription" rows="2"></textarea>
                                    </div>
                                    
                                    <!-- Product-specific fields (Quantity and UOM) -->
                                    <div class="col-md-3 product-fields" style="display: none;">
                                        <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="modalQuantity" 
                                               min="0.001" step="0.001">
                                    </div>
                                    <div class="col-md-3 product-fields" style="display: none;">
                                        <label class="form-label">UOM <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalUom">
                                            <option value="">Select UOM</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Unit Price field (always visible, adjusted width based on type) -->
                                    <div class="col-md-3" id="unitPriceContainer">
                                        <label class="form-label">Unit Price <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="modalUnitPrice" 
                                               min="0" step="0.01">
                                    </div>
                                    
                                    <!-- Tax field (always visible, adjusted width based on type) -->
                                    <div class="col-md-3" id="taxContainer">
                                        <label class="form-label">Tax</label>
                                        <select class="form-select" id="modalTax">
                                            <option value="">No Tax</option>
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-4">
                                        <label class="form-label">Discount Type</label>
                                        <select class="form-select" id="modalDiscountType">
                                            <option value="">No Discount</option>
                                            <option value="percent">Percentage</option>
                                            <option value="amount">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Discount Value</label>
                                        <input type="number" class="form-control" id="modalDiscountValue" 
                                               min="0" step="0.01" disabled>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Line Total</label>
                                        <input type="text" class="form-control" id="modalLineTotal" readonly>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePoItemBtn">Save Item</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        populateData: function () {
            const order = this.orderData;

            // Populate form fields
            $('#supplierId').data('selected', order.supplier_id);
            $('#quotationRef').val(order.quotation_ref || '');
            $('#deliveryDate').val(order.delivery_date ? moment(order.delivery_date).format('YYYY-MM-DD') : '');
            $('#deliveryAddress').val(order.delivery_address || '');
            $('#shippingCharges').val(order.shipping_charges || 0);
            $('#otherCharges').val(order.other_charges || 0);
            $('#paymentTerms').val(order.payment_terms || '');
            $('#termsConditions').val(order.terms_conditions || '');
            $('#internalNotes').val(order.internal_notes || '');

            // Render items table
            this.renderItemsTable();
        },
        
        initializeSelect2: function () {
            // Initialize supplier dropdown with search
            $('#supplierId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select supplier...',
                allowClear: true,
                width: '100%'
            });

            // Initialize Item Select dropdown (this was missing!)
            $('#modalItemSelect').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select item...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#poItemModal')
            });

            // Initialize UOM dropdown
            $('#modalUom').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search UOM...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#poItemModal')
            });

            // Initialize Tax dropdown
            $('#modalTax').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search tax...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#poItemModal')
            });

            // Initialize Item Type dropdown
            $('#modalItemType').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select type...',
                width: '100%',
                minimumResultsForSearch: -1,
                dropdownParent: $('#poItemModal')
            });

            // Initialize discount type
            $('#modalDiscountType').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select discount type...',
                width: '100%',
                minimumResultsForSearch: -1,
                dropdownParent: $('#poItemModal')
            });
        },
        
        loadMasterData: function () {
            const self = this;

            // Load Suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Supplier</option>';
                        $.each(response.data.data, function (i, supplier) {
                            const selected = supplier.id == self.orderData.supplier_id ? 'selected' : '';
                            options += `<option value="${supplier.id}" ${selected}>${supplier.name} (${supplier.supplier_code})</option>`;
                        });
                        $('#supplierId').html(options);

                        // Just trigger change, don't re-initialize (it's already initialized in initializeSelect2)
                        $('#supplierId').trigger('change.select2');
                    }
                });

            // Only load these if editable
            if (this.isEditable) {
                // Load UOMs
                TempleAPI.get('/inventory/uom')
                    .done(function (response) {
                        if (response.success) {
                            let options = '<option value="">Select UOM</option>';
                            $.each(response.data, function (i, uom) {
                                options += `<option value="${uom.id}">${uom.name}</option>`;
                            });
                            $('#modalUom').html(options);
                            // Just trigger change event to update Select2
                            $('#modalUom').trigger('change.select2');
                        }
                    });

                // Load Tax Master
                TempleAPI.get('/masters/tax')
                    .done(function (response) {
                        if (response.success) {
                            let options = '<option value="">No Tax</option>';
                            const taxData = response.data.data || response.data;
                            $.each(taxData, function (i, tax) {
                                if (tax && tax.id && tax.name) {
                                    const percent = tax.percent || 0;
                                    options += `<option value="${tax.id}" data-percent="${percent}">
                                ${tax.name} (${percent}%)
                            </option>`;
                                }
                            });
                            $('#modalTax').html(options);
                            // Just trigger change event to update Select2
                            $('#modalTax').trigger('change.select2');
                        }
                    });
            }
        },

        renderItemsTable: function () {
            const self = this;
            let html = '';

            if (!this.items || this.items.length === 0) {
                html = `<tr><td colspan="${this.isEditable ? 8 : 7}" class="text-center text-muted">No items</td></tr>`;
            } else {
                $.each(this.items, function (index, item) {
                    // Skip invalid items
                    if (!item) return;

                    // Get item name - handle different possible structures
                    let itemName = '';
                    if (item.product && item.product.name) {
                        itemName = item.product.name;
                    } else if (item.service && item.service.name) {
                        itemName = item.service.name;
                    } else if (item.item_name) {
                        itemName = item.item_name;
                    } else if (item.description) {
                        itemName = item.description;
                    } else {
                        itemName = 'Unknown Item';
                    }

                    // Get quantity/details display
                    let quantityDisplay = '';
                    if (item.item_type === 'service') {
                        quantityDisplay = '-';
                    } else {
                        const quantity = parseFloat(item.quantity) || 0;
                        const uomName = item.uom ? item.uom.name : (item.uom_name || 'Units');
                        quantityDisplay = `${quantity} ${uomName}`;
                    }

                    // Get tax display
                    let taxName = '-';
                    if (item.tax && item.tax.name) {
                        taxName = `${item.tax.name} (${item.tax_percent || 0}%)`;
                    } else if (item.tax_name && item.tax_name !== 'No Tax') {
                        taxName = item.tax_name;
                        if (item.tax_percent) {
                            taxName = `${item.tax_name} (${item.tax_percent}%)`;
                        }
                    }

                    // Get discount display
                    let discountDisplay = '-';
                    if (item.discount_type && item.discount_value > 0) {
                        if (item.discount_type === 'percent') {
                            discountDisplay = item.discount_value + '%';
                        } else {
                            discountDisplay = 'RM ' + self.formatCurrency(item.discount_value);
                        }
                    }

                    // Ensure numeric values
                    const unitPrice = parseFloat(item.unit_price) || 0;
                    const totalAmount = parseFloat(item.total_amount) || 0;

                    html += `
                        <tr>
                            <td>${itemName}</td>
                            <td>${item.description || '-'}</td>
                            <td>${quantityDisplay}</td>
                            <td>RM ${self.formatCurrency(unitPrice)}</td>
                            <td>${taxName}</td>
                            <td>${discountDisplay}</td>
                            <td><strong>RM ${self.formatCurrency(totalAmount)}</strong></td>
                            ${self.isEditable ? `
                            <td>
                                <button type="button" class="btn btn-sm btn-info edit-item me-1" data-index="${index}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-danger remove-item" data-index="${index}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                            ` : ''}
                        </tr>
                    `;
                });

                // If no valid items were rendered
                if (html === '') {
                    html = `<tr><td colspan="${this.isEditable ? 8 : 7}" class="text-center text-muted">No items</td></tr>`;
                }
            }

            $('#itemsTableBody').html(html);
            this.calculateTotals();
        },

        calculateTotals: function () {
            const order = this.orderData;
            $('#subtotal').text(this.formatCurrency(order.subtotal));
            $('#totalTax').text(this.formatCurrency(order.total_tax));
            $('#shippingAmount').text(this.formatCurrency(order.shipping_charges));
            $('#otherAmount').text(this.formatCurrency(order.other_charges));
            $('#totalAmount').text(this.formatCurrency(order.total_amount));
        },

        bindEvents: function () {
            const self = this;
            this.initializeSelect2();
            // Back button
            $('#backBtn').on('click', function () {
                TempleRouter.navigate('purchase/orders');
            });

            // Approve button
            $('#approveBtn').on('click', function () {
                $('#approvalModal').modal('show');
            });

            // Confirm approve
            $('#confirmApproveBtn').on('click', function () {
                self.approveOrder();
            });

            // Reject button
            $('#rejectBtn').on('click', function () {
                $('#rejectionModal').modal('show');
            });

            // Confirm reject
            $('#confirmRejectBtn').on('click', function () {
                self.rejectOrder();
            });

            // Cancel button
            $('#cancelBtn').on('click', function () {
                TempleCore.showConfirm(
                    'Cancel Purchase Order',
                    'Are you sure you want to cancel this PO? This action cannot be undone.',
                    function () {
                        self.cancelOrder();
                    }
                );
            });

            // Create GRN
            $('#createGrnBtn').on('click', function () {
                TempleRouter.navigate('purchase/grn/create', { po_id: self.orderId });
            });

            // Create Invoice
            $('#createInvoiceBtn').on('click', function () {
                TempleRouter.navigate('purchase/invoices/create', { po_id: self.orderId });
            });

            // View related documents
            $(document).on('click', '.view-grn', function () {
                const grnId = $(this).data('id');
                TempleRouter.navigate('purchase/grn/view/' + grnId);
            });

            $(document).on('click', '.view-invoice', function () {
                const invoiceId = $(this).data('id');
                TempleRouter.navigate('purchase/invoices/view/' + invoiceId);
            });

            // If editable, bind edit events
            if (this.isEditable) {
                this.bindEditEvents();
            }
        },

        bindEditEvents: function () {
            const self = this;

            // Save draft
            $('#saveDraftBtn').on('click', function () {
                self.updateOrder('DRAFT');
            });

            // Submit for approval
            $('#poEditForm').on('submit', function (e) {
                e.preventDefault();
                self.updateOrder('PENDING_APPROVAL');
            });

            // Add item button
            $('#addItemBtn').on('click', function () {
                self.showItemModal();
            });

            // Item type change with Select2 event - UPDATED LOGIC
            $('#modalItemType').on('change', function () {
                const type = $(this).val();
                self.handleItemTypeChange(type);
                
                if (type) {
                    self.loadModalItems(type);
                } else {
                    $('#modalItemSelect').val('').trigger('change').prop('disabled', true)
                        .html('<option value="">Select item type first</option>');
                    
                    // Destroy and reinitialize Select2
                    if ($('#modalItemSelect').data('select2')) {
                        $('#modalItemSelect').select2('destroy');
                    }
                }
            });

            // Calculate line total on change
            $('#modalQuantity, #modalUnitPrice, #modalTax, #modalDiscountType, #modalDiscountValue')
                .on('change keyup', function () {
                    self.calculateLineTotal();
                });

            // Discount type change
            $('#modalDiscountType').on('change', function () {
                const hasDiscount = $(this).val() !== '';
                $('#modalDiscountValue').prop('disabled', !hasDiscount);
                if (!hasDiscount) {
                    $('#modalDiscountValue').val('');
                }
                self.calculateLineTotal();
            });

            // Save item
            $('#savePoItemBtn').on('click', function () {
                self.saveItem();
            });

            // Edit item
            $(document).on('click', '.edit-item', function () {
                const index = $(this).data('index');
                self.showItemModal(index);
            });

            // Remove item
            $(document).on('click', '.remove-item', function () {
                const index = $(this).data('index');
                self.removeItem(index);
            });

            // Shipping/Other charges change
            $('#shippingCharges, #otherCharges').on('change keyup', function () {
                self.recalculateTotals();
            });
        },

        // NEW METHOD: Handle item type change to show/hide fields
        handleItemTypeChange: function(type) {
            if (type === 'service') {
                // Hide product-specific fields
                $('.product-fields').hide();
                // Set default quantity for services only if it's empty or 0
                if (!$('#modalQuantity').val() || $('#modalQuantity').val() == '0') {
                    $('#modalQuantity').val('1');
                }
                $('#modalUom').val('').trigger('change.select2'); // Clear UOM selection
                
                // Adjust column widths for remaining fields
                $('#unitPriceContainer').removeClass('col-md-3').addClass('col-md-4');
                $('#taxContainer').removeClass('col-md-3').addClass('col-md-4');
            } else if (type === 'product') {
                // Show product-specific fields
                $('.product-fields').show();
                
                // Reset column widths
                $('#unitPriceContainer').removeClass('col-md-4').addClass('col-md-3');
                $('#taxContainer').removeClass('col-md-4').addClass('col-md-3');
            } else {
                // No type selected - hide product fields
                $('.product-fields').hide();
                $('#unitPriceContainer').removeClass('col-md-4').addClass('col-md-3');
                $('#taxContainer').removeClass('col-md-4').addClass('col-md-3');
            }
        },

        // Complete implementation of item modal methods
        showItemModal: function (editIndex = null) {
            const self = this;

            // Clear modal form
            $('#modalItemType').val('').trigger('change.select2');
            $('#modalItemSelect').val('').prop('disabled', true).html('<option value="">Select item type first</option>').trigger('change.select2');
            $('#modalDescription').val('');
            $('#modalQuantity').val('');
            $('#modalUom').val('').trigger('change.select2');
            $('#modalUnitPrice').val('');
            $('#modalTax').val('').trigger('change.select2');
            $('#modalDiscountType').val('').trigger('change.select2');
            $('#modalDiscountValue').val('').prop('disabled', true);
            $('#modalLineTotal').val('0.00');
            
            // Hide product-specific fields initially
            $('.product-fields').hide();
            $('#unitPriceContainer').removeClass('col-md-4').addClass('col-md-3');
            $('#taxContainer').removeClass('col-md-4').addClass('col-md-3');

            // If editing, populate the form
            if (editIndex !== null) {
                const item = this.items[editIndex];
                $('#modalItemType').val(item.item_type).trigger('change.select2');
                
                // Handle field visibility based on item type
                this.handleItemTypeChange(item.item_type);
                
                this.loadModalItems(item.item_type);

                setTimeout(function () {
                    $('#modalItemSelect').val(item.item_type === 'product' ? item.product_id : item.service_id).trigger('change.select2');
                    $('#modalDescription').val(item.description);
                    
                    if (item.item_type === 'product') {
                        $('#modalQuantity').val(item.quantity);
                        $('#modalUom').val(item.uom_id).trigger('change.select2');
                    }
                    
                    $('#modalUnitPrice').val(item.unit_price);
                    $('#modalTax').val(item.tax_id).trigger('change.select2');
                    $('#modalDiscountType').val(item.discount_type || '').trigger('change.select2');
                    $('#modalDiscountValue').val(item.discount_value || '');

                    if (item.discount_type) {
                        $('#modalDiscountValue').prop('disabled', false);
                    }

                    self.calculateLineTotal();
                }, 500);

                $('#savePoItemBtn').text('Update Item').data('edit-index', editIndex);
            } else {
                $('#savePoItemBtn').text('Add Item').removeData('edit-index');
            }

            // Show modal
            $('#poItemModal').modal('show');
        },

        loadModalItems: function (type) {
            const self = this;
            const endpoint = type === 'product' ? '/inventory/products' : '/purchase/services';

            $('#modalItemSelect').html('<option value="">Loading...</option>').prop('disabled', true);

            TempleAPI.get(endpoint, { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        const items = response.data.data || response.data || [];

                        if (items.length === 0) {
                            $('#modalItemSelect').html(`<option value="">No ${type}s available - Please create ${type}s first</option>`)
                                .prop('disabled', true);

                            TempleCore.showToast(`No ${type}s found. Please create ${type}s in the system first.`, 'error');
                            $('#savePoItemBtn').prop('disabled', true);
                            return;
                        }

                        let options = '<option value="">Select ' + type + '</option>';
                        $.each(items, function (i, item) {
                            if (item.id) {
                                options += `<option value="${item.id}" 
                            data-name="${item.name || ''}"
                            data-price="${item.unit_price || item.price || 0}">
                            ${item.name}
                        </option>`;
                            }
                        });
                        $('#modalItemSelect').prop('disabled', false).html(options);

                        // IMPORTANT: Trigger Select2 update after changing options
                        $('#modalItemSelect').trigger('change.select2');

                        $('#savePoItemBtn').prop('disabled', false);
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || `Failed to load ${type}s`;
                    TempleCore.showToast(error, 'error');
                    $('#modalItemSelect').html(`<option value="">Failed to load</option>`)
                        .prop('disabled', true);
                    $('#savePoItemBtn').prop('disabled', true);
                });
        },

        calculateLineTotal: function () {
            const itemType = $('#modalItemType').val();
            let quantity = 1; // Default quantity for services
            
            if (itemType === 'product') {
                quantity = parseFloat($('#modalQuantity').val()) || 0;
            }
            
            const unitPrice = parseFloat($('#modalUnitPrice').val()) || 0;
            const taxPercent = parseFloat($('#modalTax option:selected').data('percent')) || 0;
            const discountType = $('#modalDiscountType').val();
            const discountValue = parseFloat($('#modalDiscountValue').val()) || 0;

            let subtotal = quantity * unitPrice;
            let discountAmount = 0;

            if (discountType === 'percent') {
                discountAmount = subtotal * (discountValue / 100);
            } else if (discountType === 'amount') {
                discountAmount = discountValue;
            }

            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (taxPercent / 100);
            const total = taxableAmount + taxAmount;

            $('#modalLineTotal').val(total.toFixed(2));
        },

        saveItem: function () {
            // Validation
            const type = $('#modalItemType').val();
            const itemId = $('#modalItemSelect').val();
            const itemName = $('#modalItemSelect option:selected').text();
            const unitPrice = parseFloat($('#modalUnitPrice').val());
            
            // Adjust validation based on type
            let quantity = 1;
            let uomId = null;
            let uomName = 'Service';
            
            if (type === 'product') {
                quantity = parseFloat($('#modalQuantity').val());
                uomId = $('#modalUom').val();
                uomName = $('#modalUom option:selected').text();
                
                if (!quantity || quantity <= 0) {
                    TempleCore.showToast('Please enter a valid quantity', 'warning');
                    return;
                }
                
                if (!uomId) {
                    TempleCore.showToast('Please select a UOM', 'warning');
                    return;
                }
            }

            if (!type) {
                TempleCore.showToast('Please select item type', 'warning');
                return;
            }

            if (!itemId || itemId === '' || itemName.includes('No products available') || itemName.includes('No services available')) {
                TempleCore.showToast(`Please select a valid ${type}. If none exist, create them first.`, 'warning');
                return;
            }

            if (!unitPrice || unitPrice < 0) {
                TempleCore.showToast('Please enter a valid unit price', 'warning');
                return;
            }

            // Calculate amounts
            const taxPercent = parseFloat($('#modalTax option:selected').data('percent')) || 0;
            const discountType = $('#modalDiscountType').val();
            const discountValue = parseFloat($('#modalDiscountValue').val()) || 0;

            let subtotal = quantity * unitPrice;
            let discountAmount = 0;

            if (discountType === 'percent') {
                discountAmount = subtotal * (discountValue / 100);
            } else if (discountType === 'amount') {
                discountAmount = discountValue;
            }

            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (taxPercent / 100);
            const total = taxableAmount + taxAmount;

            // Create item object
            const item = {
                item_type: type,
                product_id: type === 'product' ? itemId : null,
                service_id: type === 'service' ? itemId : null,
                item_name: $('#modalItemSelect option:selected').data('name'),
                description: $('#modalDescription').val(),
                quantity: quantity,
                uom_id: uomId,
                uom_name: uomName,
                unit_price: unitPrice,
                tax_id: $('#modalTax').val() || null,
                tax_name: $('#modalTax option:selected').text(),
                tax_percent: taxPercent,
                tax_amount: taxAmount,
                discount_type: discountType || null,
                discount_value: discountValue,
                discount_amount: discountAmount,
                subtotal: subtotal,
                total_amount: total
            };

            // Check if updating or adding
            const editIndex = $('#savePoItemBtn').data('edit-index');
            if (editIndex !== undefined) {
                this.items[editIndex] = item;
            } else {
                this.items.push(item);
            }

            this.renderItemsTable();
            this.recalculateTotals();
            $('#poItemModal').modal('hide');
        },

        removeItem: function (index) {
            this.items.splice(index, 1);
            this.renderItemsTable();
        },

        recalculateTotals: function () {
            // Recalculate based on items
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            $.each(this.items, function (i, item) {
                subtotal += parseFloat(item.subtotal) || 0;
                totalTax += parseFloat(item.tax_amount) || 0;
                totalDiscount += parseFloat(item.discount_amount) || 0;
            });

            const shippingCharges = parseFloat($('#shippingCharges').val()) || 0;
            const otherCharges = parseFloat($('#otherCharges').val()) || 0;
            const totalAmount = subtotal - totalDiscount + totalTax + shippingCharges + otherCharges;

            // Update display
            $('#subtotal').text(this.formatCurrency(subtotal));
            $('#totalTax').text(this.formatCurrency(totalTax));
            $('#shippingAmount').text(this.formatCurrency(shippingCharges));
            $('#otherAmount').text(this.formatCurrency(otherCharges));
            $('#totalAmount').text(this.formatCurrency(totalAmount));

            // Update orderData
            this.orderData.subtotal = subtotal;
            this.orderData.total_tax = totalTax;
            this.orderData.discount_amount = totalDiscount;
            this.orderData.shipping_charges = shippingCharges;
            this.orderData.other_charges = otherCharges;
            this.orderData.total_amount = totalAmount;
        },

        updateOrder: function (status) {
            const self = this;

            // Validation
            if (!$('#supplierId').val()) {
                TempleCore.showToast('Please select a supplier', 'warning');
                return;
            }

            if (this.items.length === 0) {
                TempleCore.showToast('Please add at least one item', 'warning');
                return;
            }

            // Prepare data
            const data = {
                supplier_id: $('#supplierId').val(),
                quotation_ref: $('#quotationRef').val(),
                delivery_date: $('#deliveryDate').val(),
                delivery_address: $('#deliveryAddress').val(),
                shipping_charges: parseFloat($('#shippingCharges').val()) || 0,
                other_charges: parseFloat($('#otherCharges').val()) || 0,
                payment_terms: $('#paymentTerms').val(),
                terms_conditions: $('#termsConditions').val(),
                internal_notes: $('#internalNotes').val(),
                status: status,
                items: this.items
            };

            TempleCore.showLoading(true);

            TempleAPI.put('/purchase/orders/' + this.orderId, data)
                .done(function (response) {
                    if (response.success) {
                        const message = status === 'DRAFT' ?
                            'Changes saved successfully' :
                            'PO submitted for approval';
                        TempleCore.showToast(message, 'success');

                        // Reload the page to show updated status
                        setTimeout(function () {
                            TempleRouter.navigate('purchase/orders');
                        }, 500);
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to update PO';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        approveOrder: function () {
            const self = this;
            const approvalNotes = $('#approvalNotes').val();

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/orders/' + this.orderId + '/approve', {
                approval_notes: approvalNotes
            })
                .done(function (response) {
                    if (response.success) {
                        $('#approvalModal').modal('hide');
                        TempleCore.showToast('Purchase Order approved successfully', 'success');
                        self.loadOrderData();
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to approve PO';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        rejectOrder: function () {
            const self = this;
            const rejectionReason = $('#rejectionReason').val();

            if (!rejectionReason) {
                TempleCore.showToast('Please provide a rejection reason', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/orders/' + this.orderId + '/reject', {
                rejection_reason: rejectionReason
            })
                .done(function (response) {
                    if (response.success) {
                        $('#rejectionModal').modal('hide');
                        TempleCore.showToast('Purchase Order rejected', 'success');
                        self.loadOrderData();
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to reject PO';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        cancelOrder: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/orders/' + this.orderId + '/cancel')
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Purchase Order cancelled successfully', 'success');
                        self.loadOrderData();
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to cancel PO';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': { class: 'bg-secondary', text: 'Draft' },
                'PENDING_APPROVAL': { class: 'bg-warning text-dark', text: 'Pending Approval' },
                'APPROVED': { class: 'bg-success', text: 'Approved' },
                'REJECTED': { class: 'bg-danger', text: 'Rejected' },
                'CANCELLED': { class: 'bg-dark', text: 'Cancelled' },
                'PARTIAL_RECEIVED': { class: 'bg-info', text: 'Partially Received' },
                'RECEIVED': { class: 'bg-primary', text: 'Received' },
                'CLOSED': { class: 'bg-dark', text: 'Closed' }
            };

            return badges[status] || { class: 'bg-secondary', text: status };
        }
    };

})(jQuery, window);