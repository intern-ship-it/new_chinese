// js/pages/purchase/payment-approvals.js
// Payment Approval Management Page

(function ($, window) {
    'use strict';

    window.PurchasePaymentApprovalsPage = {
        permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            const self = this;
            this.loadPermissions().then(function () {
                self.checkPermissions();
                self.render();
                self.loadData();
                self.bindEvents();
            });
        },
        loadPermissions: function () {
            const self = this;
            const userId = this.currentUser.id;

            return TempleAPI.get(`/purchase/invoices/user/${userId}/permissions`)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.data || self.permissions;
                    } else {
                        self.setDefaultPermissions();
                    }
                })
                .fail(function () {
                    self.setDefaultPermissions();
                });
        },
        setDefaultPermissions: function () {
            const userType = this.currentUser?.user_type || '';
            this.permissions = {
                can_create_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_payment_create_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_migrate_to_accounting_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_payment_view_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_payment_approve_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_payment_reject_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_purchase_invoices: true
            };
        },


        checkPermissions: function () {
            const user = TempleCore.getUser();
            if (user.user_type !== 'SUPER_ADMIN') {
                TempleCore.showToast('Unauthorized access to payment approvals', 'error');
                TempleRouter.navigate('dashboard');
                return false;
            }
            return true;
        },

        render: function () {
            const currencySymbol = TempleCore.getCurrency();

            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Payment Approvals</h3>
                            <p class="text-muted">Review and approve pending payment requests</p>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-outline-primary" id="refreshBtn">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <h6 class="text-muted">Pending Approvals</h6>
                                    <h4 class="text-warning" id="pendingCount">0</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Total Amount</h6>
                                    <h4 id="totalAmount">${currencySymbol} 0.00</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-success">
                                <div class="card-body">
                                    <h6 class="text-muted">Approved Today</h6>
                                    <h4 class="text-success" id="approvedToday">0</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-danger">
                                <div class="card-body">
                                    <h6 class="text-muted">Rejected Today</h6>
                                    <h4 class="text-danger" id="rejectedToday">0</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pending Approvals Table -->
                    <div class="card">
                        <div class="card-header bg-warning bg-opacity-10">
                            <h5 class="mb-0">Pending Payment Approvals</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Payment #</th>
                                            <th>Date</th>
                                            <th>Invoice #</th>
                                            <th>Supplier</th>
                                            <th>Amount</th>
                                            <th>Payment Mode</th>
                                            <th>Requested By</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="approvalTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Approval Modal -->
                <div class="modal fade" id="approvalModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Payment Approval</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="paymentDetails">
                                    <!-- Payment details will be loaded here -->
                                </div>
                                
                                <hr>
                                
                                <div class="form-group">
                                    <label class="form-label">Approval Notes</label>
                                    <textarea class="form-control" id="approvalNotes" rows="3" 
                                        placeholder="Enter any notes for this approval/rejection"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                              ${this.permissions.can_payment_reject_purchase_invoices ? `
                                <button type="button" class="btn btn-danger" id="btnReject">
                                    <i class="bi bi-x-circle"></i> Reject
                                </button>`: ''}
                                  ${this.permissions.can_payment_approve_purchase_invoices ? `
                                <button type="button" class="btn btn-success" id="btnApprove">
                                    <i class="bi bi-check-circle"></i> Approve
                                </button>`: ''}
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadData: function () {
            const self = this;

            TempleAPI.get('/purchase/payments/pending-approvals')
                .done(function (response) {
                    if (response.success) {
                        self.renderTable(response.data);
                        self.updateSummary(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load pending approvals', 'error');
                });
        },

        renderTable: function (data) {
            const self = this;
            const tbody = $('#approvalTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="8" class="text-center">No pending approvals</td></tr>');
                return;
            }

            let html = '';
            const currencySymbol = TempleCore.getCurrency();

            $.each(data.data, function (index, payment) {
                html += `
                    <tr data-payment='${JSON.stringify(payment)}'>
                        <td><strong>${payment.payment_number}</strong></td>
                        <td>${self.formatDate(payment.payment_date)}</td>
                        <td>${payment.invoice?.invoice_number || 'N/A'}</td>
                        <td>${payment.supplier?.name || 'N/A'}</td>
                        <td class="text-end">
                            <strong>${currencySymbol} ${parseFloat(payment.amount).toFixed(2)}</strong>
                        </td>
                        <td>${payment.payment_mode?.name || 'N/A'}</td>
                        <td>${payment.creator?.name || 'N/A'}</td>
                        ${self.permissions.can_payment_view_purchase_invoices ? `
                        <td>
                            <button class="btn btn-sm btn-primary review-payment">
                                <i class="bi bi-eye"></i> Review
                            </button>
                        </td>`: ''}
                    </tr>
                `;
            });

            tbody.html(html);
        },

        updateSummary: function (data) {
            const currencySymbol = TempleCore.getCurrency();

            // Calculate totals
            let totalAmount = 0;
            let pendingCount = 0;

            if (data.data && Array.isArray(data.data)) {
                pendingCount = data.data.length;
                data.data.forEach(function (payment) {
                    totalAmount += parseFloat(payment.amount) || 0;
                });
            }

            $('#pendingCount').text(pendingCount);
            $('#totalAmount').text(`${currencySymbol} ${totalAmount.toFixed(2)}`);

            // TODO: Get approved/rejected today from backend
            // For now, just show 0
            $('#approvedToday').text('0');
            $('#rejectedToday').text('0');
        },

        showApprovalModal: function (payment) {
            const self = this;
            const currencySymbol = TempleCore.getCurrency();

            // First, fetch complete invoice details if we have an invoice
            if (payment.invoice?.id) {
              
                TempleCore.showLoading(true);

                TempleAPI.get('/purchase/invoices/' + payment.invoice.id)
                    .done(function (response) {
                        
                        if (response.success && response.data) {
                            // Merge invoice details with payment
                            payment.invoiceDetails = response.data;
                            self.renderApprovalModal(payment);
                        } else {
                            console.log('No invoice data in response');
                            self.renderApprovalModal(payment);
                        }
                    })
                    .fail(function (xhr) {
                        console.error('Failed to fetch invoice details:', xhr);
                        // If fetch fails, show modal with available data
                        self.renderApprovalModal(payment);
                    })
                    .always(function () {
                        TempleCore.showLoading(false);
                    });
            } else {
                console.log('No invoice ID available');
                self.renderApprovalModal(payment);
            }
        },

        renderApprovalModal: function (payment) {
            const currencySymbol = TempleCore.getCurrency();
            const invoice = payment.invoiceDetails || payment.invoice;

            // Build payment details HTML with invoice details always shown
            const detailsHtml = `
                <!-- Payment Information Section -->
                <div class="card mb-3">
                    <div class="card-header bg-light">
                        <h6 class="mb-0">Payment Information</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <table class="table table-sm table-borderless">
                                    <tr>
                                        <th width="40%">Payment Number:</th>
                                        <td><strong>${payment.payment_number}</strong></td>
                                    </tr>
                                    <tr>
                                        <th>Payment Date:</th>
                                        <td>${this.formatDate(payment.payment_date)}</td>
                                    </tr>
                                <tr>
    <th>Invoice Number:</th>
    <td>
        ${invoice?.invoice_number ?
                    `<a href="#" class="text-primary view-invoice-link" data-invoice-id="${invoice.id || payment.invoice?.id}">
                <strong>${invoice.invoice_number}</strong>
            </a>` :
                    '<strong>N/A</strong>'
                }
    </td>
</tr>
                                    <tr>
                                        <th>Supplier:</th>
                                        <td>${invoice?.supplier?.name || payment.supplier?.name || 'N/A'}</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <table class="table table-sm table-borderless">
                                    <tr>
                                        <th width="40%">Amount:</th>
                                        <td class="">
                                            <strong class="text-primary fs-5">
                                                ${currencySymbol} ${parseFloat(payment.amount).toFixed(2)}
                                            </strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Payment Mode:</th>
                                        <td>${payment.payment_mode?.name || 'Cash'}</td>
                                    </tr>
                                    <tr>
                                        <th>Reference Number:</th>
                                        <td>${payment.reference_number || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Requested By:</th>
                                        <td>${payment.creator?.name || 'N/A'}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Invoice Details Accordion -->
                <div class="accordion mb-3" id="invoiceAccordion">
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="headingInvoice">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" 
                                    data-bs-target="#collapseInvoice" aria-expanded="true" aria-controls="collapseInvoice">
                                <i class="bi bi-receipt me-2"></i> Invoice Details
                            </button>
                        </h2>
                        <div id="collapseInvoice" class="accordion-collapse collapse" 
                             aria-labelledby="headingInvoice" data-bs-parent="#invoiceAccordion">
                            <div class="accordion-body">
                                ${invoice ? `
                                  
                                    
                                    <!-- Invoice Items Table -->
                                    ${invoice.items && invoice.items.length > 0 ? `
                                    <h6 class="mb-2">
                                        Invoice Items
                                    </h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm table-bordered">
                                            <thead class="table-light">
                                                <tr>
                                                    <th width="5%">#</th>
                                                    <th width="30%">Item</th>
                                                    <th width="20%">Description</th>
                                                    <th width="5%" class="text-center">Qty</th>
                                                    <th width="10%" class="text-end">Unit Price</th>
                                                    <th width="10%" class="text-end">Discount</th>
                                                    <th width="10%" class="text-end">Tax</th>
                                                    <th width="20%" class="text-end">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${invoice.items.map((item, index) => `
                                                <tr>
                                                    <td>${index + 1}</td>
                                                    <td>
                                                        <strong>${item.product?.name || item.service?.name || 'Item ' + (index + 1)}</strong>
                                                    </td>
                                                    <td>
                                                        <small>${item.description || '-'}</small>
                                                    </td>
                                                    <td class="text-center">
                                                        ${parseFloat(item.quantity || 0)}
                                                    </td>
                                                    <td class="text-end">
                                                        ${currencySymbol} ${parseFloat(item.unit_price || 0).toFixed(2)}
                                                    </td>
                                                    <td class="text-end">
                                                        ${currencySymbol} ${parseFloat(item.discount_amount || 0).toFixed(2)}
                                                    </td>
                                                    <td class="text-end">
                                                        ${currencySymbol} ${parseFloat(item.tax_amount || 0).toFixed(2)}
                                                    </td>
                                                    <td class="text-end">
                                                        <strong>${currencySymbol} ${parseFloat(item.total_amount || item.subtotal || 0).toFixed(2)}</strong>
                                                    </td>
                                                </tr>
                                                `).join('')}
                                            </tbody>
                                            <tfoot class="table-light">
                                                <tr>
                                                    <td colspan="7" class="text-end"><strong>Subtotal:</strong></td>
                                                    <td class="text-end">
                                                        <strong>${currencySymbol} ${parseFloat(invoice.subtotal || 0).toFixed(2)}</strong>
                                                    </td>
                                                </tr>
                                                ${invoice.total_tax > 0 ? `
                                                <tr>
                                                    <td colspan="7" class="text-end">Total Tax:</td>
                                                    <td class="text-end">${currencySymbol} ${parseFloat(invoice.total_tax).toFixed(2)}</td>
                                                </tr>
                                                ` : ''}
                                                ${invoice.shipping_charges > 0 ? `
                                                <tr>
                                                    <td colspan="7" class="text-end">Shipping:</td>
                                                    <td class="text-end">${currencySymbol} ${parseFloat(invoice.shipping_charges).toFixed(2)}</td>
                                                </tr>
                                                ` : ''}
                                                ${invoice.other_charges > 0 ? `
                                                <tr>
                                                    <td colspan="7" class="text-end">Other Charges:</td>
                                                    <td class="text-end">${currencySymbol} ${parseFloat(invoice.other_charges).toFixed(2)}</td>
                                                </tr>
                                                ` : ''}
                                                ${invoice.discount_amount > 0 ? `
                                                <tr>
                                                    <td colspan="7" class="text-end">Discount:</td>
                                                    <td class="text-end text-danger">-${currencySymbol} ${parseFloat(invoice.discount_amount).toFixed(2)}</td>
                                                </tr>
                                                ` : ''}
                                                <tr class="fw-bold bg-light">
                                                    <td colspan="7" class="text-end">Total Amount:</td>
                                                    <td class="text-end text-primary">
                                                        ${currencySymbol} ${parseFloat(invoice.total_amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    ` : '<div class="alert alert-info">No items found for this invoice.</div>'}
                                ` : '<div class="alert alert-warning">Unable to load invoice details.</div>'}
                            </div>
                        </div>
                    </div>
                </div>
                
                ${payment.notes ? `
                    <div class="alert alert-info mb-0">
                        <strong>Payment Notes:</strong> ${payment.notes}
                    </div>
                ` : ''}
            `;

            $('#paymentDetails').html(detailsHtml);
            $('#approvalNotes').val('');

            // Store payment data for approval/rejection
            $('#approvalModal').data('payment', payment);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('approvalModal'));
            modal.show();
        },

        processApproval: function (action) {
            const self = this;
            const payment = $('#approvalModal').data('payment');
            const notes = $('#approvalNotes').val();

            if (!payment) {
                TempleCore.showToast('No payment selected', 'error');
                return;
            }

            const actionText = action === 'APPROVE' ? 'approve' : 'reject';

            TempleCore.showConfirm(
                `${action === 'APPROVE' ? 'Approve' : 'Reject'} Payment`,
                `Are you sure you want to ${actionText} this payment of ${TempleCore.getCurrency()} ${payment.amount}?`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post('/purchase/payments/' + payment.id + '/approve', {
                        action: action,
                        notes: notes
                    })
                        .done(function (response) {
                            if (response.success) {
                                bootstrap.Modal.getInstance(document.getElementById('approvalModal')).hide();
                                TempleCore.showToast(response.message, 'success');
                                self.loadData(); // Reload the list
                            } else {
                                TempleCore.showToast(response.message || 'Operation failed', 'error');
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to process approval', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        bindEvents: function () {
            const self = this;

            // Refresh button
            $('#refreshBtn').on('click', function () {
                self.loadData();
            });

            // Review payment
            $(document).on('click', '.review-payment', function () {
                const payment = JSON.parse($(this).closest('tr').attr('data-payment'));
                self.showApprovalModal(payment);
            });

            // Approve button
            $('#btnApprove').on('click', function () {
                self.processApproval('APPROVE');
            });

            // Reject button
            $('#btnReject').on('click', function () {
                self.processApproval('REJECT');
            });
            $(document).on('click', '.view-invoice-link', function (e) {
                e.preventDefault();
                const invoiceId = $(this).data('invoice-id');

                if (invoiceId) {
                    // Close the modal first
                    const modalElement = document.getElementById('approvalModal');
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }

                    // Use the correct URL construction with temple ID
                    const templeId = TempleAPI.getTempleId();
                    const invoiceViewUrl = '/' + templeId + '/purchase/invoices/view/' + invoiceId;

                    // Open in new tab with the correct URL
                    window.open(invoiceViewUrl, '_blank');
                }
            });
        },

        formatDate: function (dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        },

    };

})(jQuery, window);