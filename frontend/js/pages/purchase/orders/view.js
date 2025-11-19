// js/pages/purchase/orders/view.js
// View and Approve Purchase Order

(function($, window) {
    'use strict';
    
    window.PurchaseOrdersViewPage = {
        poId: null,
        poData: null,
                permissions: {},
        currentUser: null,
        init: function(params) {
            this.poId = params?.id;
                        this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            if (!this.poId) {
                TempleCore.showToast('Invalid Purchase Order ID', 'error');
                TempleRouter.navigate('purchase/orders');
                return;
            }
               this.loadPermissions();
            this.loadPODetails();
        },
                // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_purchase_orders: false,
                can_edit_purchase_orders: false,
                can_delete_purchase_orders: false,
                can_approve_purchase_orders: false,
                can_cancel_purchase_orders: false,
                can_purchase_orders_grn_create: false,
         

                can_view_purchase_orders: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_approve_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_cancel_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_purchase_orders_grn_create: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_purchase_orders: true
                };
            }
        },
        loadPODetails: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/purchase/orders/${this.poId}`)
                .done(function(response) {
                    if (response.success) {
                              if (response.permissions) {
                self.permissions = response.permissions;
            }
                        self.poData = response.data;
                        self.render();
                    } else {
                        TempleCore.showToast('Failed to load Purchase Order', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading PO', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        render: function() {
            const po = this.poData;
            const user = TempleCore.getUser();
  const canApprove = this.permissions.can_approve_purchase_orders && po.status === 'PENDING_APPROVAL';
const canReject = this.permissions.can_reject_purchase_orders && po.status === 'PENDING_APPROVAL';
const canCreateGRN = this.permissions.can_purchase_orders_grn_create && ['APPROVED', 'PARTIAL_RECEIVED'].includes(po.status);

            
            const html = `
                <div class="container-fluid">
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h1 class="page-title">Purchase Order Details</h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/orders'); return false;">Purchase Orders</a></li>
                                        <li class="breadcrumb-item active">View</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                                <button class="btn btn-secondary" onclick="PurchaseOrdersViewPage.printPO()">
        <i class="bi bi-printer"></i> Print
    </button>
                               ${canReject ? `
                                    <button class="btn btn-danger" onclick="PurchaseOrdersViewPage.rejectPO()">
                                        <i class="bi bi-x-circle"></i> Reject
                                    </button>    ` : ''}
                                        ${canApprove ? `
                                    <button class="btn btn-success" onclick="PurchaseOrdersViewPage.approvePO()">
                                        <i class="bi bi-check-circle"></i> Approve
                                    </button>
                                ` : ''}
                            
                                   ${canCreateGRN && po.items.some(i => i.item_type === 'product') ? `

                                    <button class="btn btn-primary" onclick="PurchaseOrdersViewPage.createGRN()">
                                        <i class="bi bi-box-seam"></i> Create GRN
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- PO Header Card -->
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <div class="row">
                                <div class="col-md-6">
                                    <h5 class="mb-0">
                                        PO Number: <strong>${po.po_number}</strong>
                                    </h5>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    ${this.getStatusBadge(po.status)}
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-muted">Supplier Information</h6>
                                    <address>
                                        <strong>${po.supplier.name}</strong><br>
                                        ${po.supplier.address || ''}<br>
                                        ${po.supplier.city ? `${po.supplier.city}, ` : ''}
                                        ${po.supplier.state || ''} ${po.supplier.pincode || ''}<br>
                                        ${po.supplier.email ? `Email: ${po.supplier.email}<br>` : ''}
                                        ${po.supplier.mobile_no ? `Phone: ${po.supplier.mobile_code} ${po.supplier.mobile_no}` : ''}
                                    </address>
                                    ${po.supplier.gst_no ? `<p><strong>GST:</strong> ${po.supplier.gst_no}</p>` : ''}
                                </div>
                                <div class="col-md-6">
                                    <table class="table table-sm table-borderless">
                                        <tr>
                                            <th width="40%">PO Date:</th>
                                            <td>${TempleCore.formatDate(po.po_date)}</td>
                                        </tr>
                                        ${po.pr_number ? `
                                        <tr>
                                            <th>PR Reference:</th>
                                            <td>${po.pr_number}</td>
                                        </tr>
                                        ` : ''}
                                        ${po.quotation_ref ? `
                                        <tr>
                                            <th>Quotation Ref:</th>
                                            <td>${po.quotation_ref}</td>
                                        </tr>
                                        ` : ''}
                                        ${po.delivery_date ? `
                                        <tr>
                                            <th>Expected Delivery:</th>
                                            <td>${TempleCore.formatDate(po.delivery_date)}</td>
                                        </tr>
                                        ` : ''}
                                        <tr>
                                            <th>Payment Terms:</th>
                                            <td>${po.payment_terms || 'N/A'}</td>
                                        </tr>
                                        ${po.payment_due_date ? `
                                        <tr>
                                            <th>Payment Due:</th>
                                            <td>${TempleCore.formatDate(po.payment_due_date)}</td>
                                        </tr>
                                        ` : ''}
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Items Table -->
                    <div class="card mb-3">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Order Items</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="30%">Description</th>
                                            <th width="10%">Quantity</th>
                                            <th width="10%">Unit Price</th>
                                            <th width="10%">Tax</th>
                                            <th width="10%">Discount</th>
                                            <th width="12%">Total</th>
                                            <th width="13%">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${po.items.map((item, index) => `
                                            <tr>
                                                <td>${index + 1}</td>
                                                <td>
                                                    <strong>${item.item_type === 'product' ? 'Product' : 'Service'}:</strong><br>
                                                    ${item.description || item.product?.name || item.service?.name}
                                                </td>
                                           <td>
  ${item.item_type === 'product' 
    ? `${item.quantity} ${item.uom?.name || 'Unit'} 
        ${item.received_quantity > 0 
          ? `<br><small class="text-success">Received: ${item.received_quantity}</small>` 
          : ''}`
    : '-'
  }
</td>

                                                <td>${TempleCore.formatCurrency(item.unit_price)}</td>
                                                <td>
                                                    ${item.tax_percent > 0 ? `
                                                        ${item.tax_percent}%<br>
                                                        <small>${TempleCore.formatCurrency(item.tax_amount)}</small>
                                                    ` : '-'}
                                                </td>
                                                <td>${item.discount_amount > 0 ? TempleCore.formatCurrency(item.discount_amount) : '-'}</td>
                                                <td><strong>${TempleCore.formatCurrency(item.total_amount)}</strong></td>
                                                <td>
                                                    ${this.getItemStatusBadge(item.status)}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="6" class="text-end"><strong>Subtotal:</strong></td>
                                            <td colspan="2"><strong>${TempleCore.formatCurrency(po.subtotal)}</strong></td>
                                        </tr>
                                        ${po.total_tax > 0 ? `
                                        <tr>
                                            <td colspan="6" class="text-end">Total Tax:</td>
                                            <td colspan="2">${TempleCore.formatCurrency(po.total_tax)}</td>
                                        </tr>
                                        ` : ''}
                                        ${po.discount_amount > 0 ? `
                                        <tr>
                                            <td colspan="6" class="text-end">Discount:</td>
                                            <td colspan="2">-${TempleCore.formatCurrency(po.discount_amount)}</td>
                                        </tr>
                                        ` : ''}
                                        ${po.shipping_charges > 0 ? `
                                        <tr>
                                            <td colspan="6" class="text-end">Shipping Charges:</td>
                                            <td colspan="2">${TempleCore.formatCurrency(po.shipping_charges)}</td>
                                        </tr>
                                        ` : ''}
                                        ${po.other_charges > 0 ? `
                                        <tr>
                                            <td colspan="6" class="text-end">Other Charges:</td>
                                            <td colspan="2">${TempleCore.formatCurrency(po.other_charges)}</td>
                                        </tr>
                                        ` : ''}
                                        <tr class="table-info">
                                            <td colspan="6" class="text-end"><strong>Grand Total:</strong></td>
                                            <td colspan="2"><strong>${TempleCore.formatCurrency(po.total_amount)}</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Additional Information -->
                    ${po.terms_conditions || po.internal_notes ? `
                    <div class="card mb-3">
                        <div class="card-body">
                            ${po.terms_conditions ? `
                            <div class="mb-3">
                                <h6>Terms & Conditions</h6>
                                <p>${po.terms_conditions.replace(/\n/g, '<br>')}</p>
                            </div>
                            ` : ''}
                            ${po.internal_notes ? `
                            <div>
                                <h6>Internal Notes</h6>
                                <p class="text-muted">${po.internal_notes.replace(/\n/g, '<br>')}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Approval History -->
                    ${po.approved_by ? `
                    <div class="card mb-3">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Approval Information</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Approved By:</strong> ${po.approved_by_name}</p>
                            <p><strong>Approved At:</strong> ${TempleCore.formatDate(po.approved_at, 'time')}</p>
                            ${po.approval_notes ? `<p><strong>Notes:</strong> ${po.approval_notes}</p>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${po.rejection_reason ? `
                    <div class="card mb-3 border-danger">
                        <div class="card-header bg-danger text-white">
                            <h5 class="card-title mb-0">Rejection Information</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-danger"><strong>Reason:</strong> ${po.rejection_reason}</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        getStatusBadge: function(status) {
            const statusConfig = {
                'DRAFT': { class: 'secondary', text: 'Draft' },
                'PENDING_APPROVAL': { class: 'warning', text: 'Pending Approval' },
                'APPROVED': { class: 'success', text: 'Approved' },
                'REJECTED': { class: 'danger', text: 'Rejected' },
                'PARTIAL_RECEIVED': { class: 'info', text: 'Partial Received' },
                'RECEIVED': { class: 'primary', text: 'Received' },
                'CANCELLED': { class: 'dark', text: 'Cancelled' },
                'CLOSED': { class: 'secondary', text: 'Closed' }
            };
            
            const config = statusConfig[status] || { class: 'secondary', text: status };
            return `<span class="badge bg-${config.class}">${config.text}</span>`;
        },
        
        getItemStatusBadge: function(status) {
            const statusConfig = {
                'PENDING': { class: 'warning', text: 'Pending' },
                'PARTIAL_RECEIVED': { class: 'info', text: 'Partial' },
                'RECEIVED': { class: 'success', text: 'Received' },
                'CANCELLED': { class: 'danger', text: 'Cancelled' }
            };
            
            const config = statusConfig[status] || { class: 'secondary', text: status };
            return `<span class="badge bg-${config.class}">${config.text}</span>`;
        },
        
        approvePO: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Approve Purchase Order',
                'Are you sure you want to approve this Purchase Order?',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post(`/purchase/orders/${self.poId}/approve`, {
                        approval_notes: ''
                    })
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast('Purchase Order approved successfully', 'success');
                            self.loadPODetails(); // Reload to show updated status
                        } else {
                            TempleCore.showToast(response.message || 'Failed to approve PO', 'error');
                        }
                    })
                    .fail(function() {
                        TempleCore.showToast('An error occurred while approving PO', 'error');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        },
        
        rejectPO: function() {
            const self = this;
            
            // Show rejection reason dialog
            const modalHtml = `
                <div class="modal fade" id="rejectModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reject Purchase Order</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Rejection Reason <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="rejectionReason" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" onclick="PurchaseOrdersViewPage.confirmReject()">Reject PO</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('rejectModal'));
            modal.show();
        },
        
        confirmReject: function() {
            const self = this;
            const reason = $('#rejectionReason').val().trim();
            
            if (!reason) {
                TempleCore.showToast('Please provide a rejection reason', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/purchase/orders/${this.poId}/reject`, {
                rejection_reason: reason
            })
            .done(function(response) {
                if (response.success) {
                    bootstrap.Modal.getInstance(document.getElementById('rejectModal')).hide();
                    $('#rejectModal').remove();
                    TempleCore.showToast('Purchase Order rejected', 'success');
                    self.loadPODetails();
                } else {
                    TempleCore.showToast(response.message || 'Failed to reject PO', 'error');
                }
            })
            .fail(function() {
                TempleCore.showToast('An error occurred while rejecting PO', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        createInvoice: function() {
            TempleRouter.navigate(`purchase/invoices/create?po_id=${this.poId}`);
        },
        
    createGRN: function() {
    TempleRouter.navigate('purchase/grn/create', { po_id: this.poId });
},
        


printPO: function() {
    const templeId = TempleAPI.getTempleId();
    const printUrl = '/' + templeId + '/purchase/orders/print/' + this.poId;
    
    // Open in new tab instead of popup
    window.open(printUrl, '_blank');
},
    };
    
})(jQuery, window);