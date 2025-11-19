// js/pages/purchase/invoices/view.js
// View purchase invoice details with payment functionality and payment details modal

(function ($, window) {
    'use strict';

    window.PurchaseInvoicesViewPage = {
        currentInvoiceId: null,
        currentInvoice: null,
        currentPaymentDetails: null,
        permissions: {},
        currentUser: null,
        init: function (params) {
            this.currentInvoiceId = params?.id || this.getInvoiceIdFromUrl();
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            if (!this.currentInvoiceId) {
                TempleCore.showToast('Invoice ID not provided', 'error');
                TempleRouter.navigate('purchase/invoice');
                return;
            }
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.loadInvoice();
                self.bindEvents();
            });
        },
        // Load permissions

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
                can_view_purchase_invoices: true
            };
        },
        getInvoiceIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },

        render: function () {
            const self = this;
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">View Purchase Invoice</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/invoices'); return false;">Invoices</a></li>
                                    <li class="breadcrumb-item active">View Invoice</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                        ${this.permissions.can_payment_create_purchase_invoices ? `
                            <button class="btn btn-success" id="btnAddPayment">
                                <i class="bi bi-cash"></i> Add Payment
                            </button>`: ''}
                       <button class="btn btn-secondary" onclick="PurchaseInvoicesViewPage.printInvoice('${this.currentInvoiceId}'); return false;" style="height: 41px;">
    <i class="bi bi-printer"></i> Print
</button>

                              ${this.permissions.can_edit_purchase_invoices ? `
                            <button class="btn btn-warning" id="btnEditInvoice">
                                <i class="bi bi-pencil"></i> Edit
                            </button>`: ''}
                            <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/invoice'); return false;">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading -->
                    <div id="invoiceLoading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- Invoice Content -->
                    <div id="invoiceContent" style="display: none;">
                        <!-- Payment Status Alert -->
                        <div id="paymentStatusAlert" class="alert mb-4">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-0">
                                        <span id="paymentStatusBadge" class="badge"></span>
                                        <span id="paymentStatusText" class="ms-2"></span>
                                    </h5>
                                </div>
                             
                            </div>
                        </div>
                        
                        <!-- Invoice Details Card -->
                        <div class="card mb-4" id="invoiceCard">
                            <div class="card-body">
                                <!-- Invoice Header -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <h5 class="text-primary">PURCHASE INVOICE</h5>
                                        <p class="mb-1"><strong>Invoice #:</strong> <span id="invoiceNumber"></span></p>
                                        <p class="mb-1"><strong>Date:</strong> <span id="invoiceDate"></span></p>
                                        <p class="mb-1"><strong>Due Date:</strong> <span id="dueDate"></span></p>
                                        <p class="mb-1"><strong>Supplier Invoice #:</strong> <span id="supplierInvoiceNo"></span></p>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <img id="templeLogo" src="/assets/logo-placeholder.png" alt="Temple Logo" style="height: 60px;">
                                        <div class="mt-2">
                                            <p class="mb-0" id="templeName"></p>
                                            <p class="mb-0 small text-muted" id="templeAddress"></p>
                                        </div>
                                    </div>
                                </div>
                                
                                <hr>
                                
                                <!-- Supplier Details -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <h6 class="text-muted">Bill From:</h6>
                                        <p class="mb-1"><strong id="supplierName"></strong></p>
                                        <p class="mb-1" id="supplierAddress"></p>
                                        <p class="mb-1">GST: <span id="supplierGst"></span></p>
                                        <p class="mb-0">Contact: <span id="supplierContact"></span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6 class="text-muted">References:</h6>
                                        <p class="mb-1"><strong>PO #:</strong> <span id="poReference">-</span></p>
                                        <p class="mb-1"><strong>Type:</strong> <span id="invoiceType"></span></p>
                                        <p class="mb-0"><strong>Status:</strong> <span id="invoiceStatus"></span></p>
                                    </div>
                                </div>
                                
                                <!-- Invoice Items -->
                                <div class="table-responsive mb-4">
                                    <table class="table">
                                        <thead class="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Item</th>
                                                <th>Description</th>
                                                <th class="text-end">Qty</th>
                                                <th class="text-end">Unit Price</th>
                                                <th class="text-end">Discount</th>
                                                <th class="text-end">Tax</th>
                                                <th class="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody id="invoiceItemsTable">
                                            <tr>
                                                <td colspan="8" class="text-center">Loading items...</td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="7" class="text-end"><strong>Subtotal:</strong></td>
                                                <td class="text-end" id="subtotal">0.00</td>
                                            </tr>
                                            <tr>
                                                <td colspan="7" class="text-end"><strong>Total Tax:</strong></td>
                                                <td class="text-end" id="totalTax">0.00</td>
                                            </tr>
                                            <tr>
                                                <td colspan="7" class="text-end"><strong>Shipping:</strong></td>
                                                <td class="text-end" id="shippingCharges">0.00</td>
                                            </tr>
                                            <tr>
                                                <td colspan="7" class="text-end"><strong>Other Charges:</strong></td>
                                                <td class="text-end" id="otherCharges">0.00</td>
                                            </tr>
                                            <tr>
                                                <td colspan="7" class="text-end"><strong>Discount:</strong></td>
                                                <td class="text-end text-danger" id="discountAmount">0.00</td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td colspan="7" class="text-end"><h5>Total Amount:</h5></td>
                                                <td class="text-end"><h5 id="totalAmount">0.00</h5></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                
                                <!-- Terms and Notes -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Terms & Conditions:</h6>
                                        <p class="small" id="termsConditions">-</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Notes:</h6>
                                        <p class="small" id="notes">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment History -->
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h6 class="mb-0">Payment History</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Payment #</th>
                                                <th>Date</th>
                                                <th>Mode</th>
                                                <th>Reference</th>
                                                <th class="text-end">Amount</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="paymentHistoryTable">
                                            <tr>
                                                <td colspan="7" class="text-center">No payments found</td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-light">
                                                <td colspan="4" class="text-end"><strong>Total Paid:</strong></td>
                                                <td class="text-end"><strong id="totalPaid">0.00</strong></td>
                                                <td colspan="2"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Modal -->
                <div class="modal fade" id="paymentModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">Add Payment</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="paymentForm">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label>Invoice Number:</label>
                                            <input type="text" class="form-control" id="modalInvoiceNumber" readonly>
                                        </div>
                                        <div class="col-md-6">
                                            <label>Balance Amount:</label>
                                            <input type="text" class="form-control" id="modalBalanceAmount" readonly>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="paymentDate" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                            <select class="form-select" id="paymentMode" required>
                                                <option value="">Select Mode</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Amount <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="paymentAmount" step="0.01" min="0.01" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Reference Number</label>
                                            <input type="text" class="form-control" id="referenceNumber" placeholder="Cheque/Transaction #">
                                        </div>
                                    </div>
                                    
                                    <div id="bankDetails" style="display: none;">
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Bank Name</label>
                                                <input type="text" class="form-control" id="bankName">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Bank Branch</label>
                                                <input type="text" class="form-control" id="bankBranch">
                                            </div>
                                        </div>
                                        
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Cheque Date</label>
                                                <input type="date" class="form-control" id="chequeDate">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="paymentNotes" rows="2"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnSavePayment">
                                    <i class="bi bi-check-circle"></i> Save Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Details Modal -->
                <div class="modal fade" id="paymentDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">Payment Details</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="paymentDetailsLoading" class="text-center py-3">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                                <div id="paymentDetailsContent" style="display: none;">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="fw-bold">Payment Number:</label>
                                            <p id="detailPaymentNumber">-</p>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="fw-bold">Payment Date:</label>
                                            <p id="detailPaymentDate">-</p>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="fw-bold">Invoice Number:</label>
                                            <p id="detailInvoiceNumber">-</p>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="fw-bold">Supplier:</label>
                                            <p id="detailSupplier">-</p>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="fw-bold">Payment Mode:</label>
                                            <p id="detailPaymentMode">-</p>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="fw-bold">Amount:</label>
                                            <p class="fs-5 text-primary fw-bold" id="detailAmount">-</p>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="fw-bold">Reference Number:</label>
                                            <p id="detailReference">-</p>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="fw-bold">Status:</label>
                                            <p id="detailStatus">-</p>
                                        </div>
                                    </div>
                                    
                                    <div id="detailBankInfo" style="display: none;">
                                        <hr>
                                        <h6 class="text-muted mb-3">Bank Details</h6>
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="fw-bold">Bank Name:</label>
                                                <p id="detailBankName">-</p>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="fw-bold">Bank Branch:</label>
                                                <p id="detailBankBranch">-</p>
                                            </div>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="fw-bold">Cheque Date:</label>
                                                <p id="detailChequeDate">-</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-12">
                                            <label class="fw-bold">Notes:</label>
                                            <p id="detailNotes" class="text-muted">-</p>
                                        </div>
                                    </div>
                                    
                                    <hr>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <label class="fw-bold">Created By:</label>
                                            <p id="detailCreatedBy">-</p>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="fw-bold">Created At:</label>
                                            <p id="detailCreatedAt">-</p>
                                        </div>
                                    </div>
                                </div>
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

        loadInvoice: function () {
            const self = this;

            TempleAPI.get('/purchase/invoices/' + this.currentInvoiceId)
                .done(function (response) {
                    if (response.success) {
                        self.currentInvoice = response.data;
                        self.displayInvoice();
                        self.loadPaymentHistory();
                        self.loadPaymentModes();
                        $('#invoiceLoading').hide();
                        $('#invoiceContent').show();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load invoice', 'error');
                        TempleRouter.navigate('purchase/invoice');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load invoice', 'error');
                    TempleRouter.navigate('purchase/invoice');
                });
        },

        displayInvoice: function () {
            const invoice = this.currentInvoice;
            const temple = TempleCore.getTemple();
            const currency = TempleCore.formatCurrency(0).split('0')[0];

            // Temple Info
            $('#templeName').text(temple.name || 'Temple Management System');
            $('#templeAddress').text(temple.address || '');
            if (temple.logo) {
                $('#templeLogo').attr('src', temple.logo);
            }

            // Invoice Header
            $('#invoiceNumber').text(invoice.invoice_number);
            $('#invoiceDate').text(TempleCore.formatDate(invoice.invoice_date));
            $('#dueDate').text(invoice.payment_due_date ? TempleCore.formatDate(invoice.payment_due_date) : '-');
            $('#supplierInvoiceNo').text(invoice.supplier_invoice_no || '-');

            // Supplier Details
            $('#supplierName').text(invoice.supplier?.name || '-');
            $('#supplierAddress').text(invoice.supplier?.address || '-');
            $('#supplierGst').text(invoice.supplier?.gst_no || '-');
            $('#supplierContact').text(invoice.supplier?.mobile_no || '-');

            // References
            if (invoice.po_id) {
                $('#poReference').html(`<a href="#" onclick="TempleRouter.navigate('purchase/orders/view', {id: '${invoice.po_id}'}); return false;">${invoice.purchase_order?.po_number || '-'}</a>`);
            }
            $('#invoiceType').text(invoice.invoice_type === 'PO_BASED' ? 'PO Based' : 'Direct');

            const statusBadge = this.getStatusBadge(invoice.status);
            $('#invoiceStatus').html(statusBadge);

            // Items
            this.displayItems(invoice.items || []);

            // Totals
            $('#subtotal').text(currency + parseFloat(invoice.subtotal || 0).toFixed(2));
            $('#totalTax').text(currency + parseFloat(invoice.total_tax || 0).toFixed(2));
            $('#shippingCharges').text(currency + parseFloat(invoice.shipping_charges || 0).toFixed(2));
            $('#otherCharges').text(currency + parseFloat(invoice.other_charges || 0).toFixed(2));
            $('#discountAmount').text('-' + currency + parseFloat(invoice.discount_amount || 0).toFixed(2));
            $('#totalAmount').text(currency + parseFloat(invoice.total_amount || 0).toFixed(2));

            // Payment Status
            this.updatePaymentStatus(invoice);

            // Terms and Notes
            $('#termsConditions').text(invoice.terms_conditions || 'Standard terms apply');
            $('#notes').text(invoice.notes || '-');

            // Button visibility
            if (invoice.status === 'CANCELLED' || invoice.payment_status === 'PAID') {
                $('#btnAddPayment').hide();
                $('#btnEditInvoice').hide();
            }
        },

        displayItems: function (items) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';

            $.each(items, function (index, item) {
                const itemName = item.item_type === 'product' ?
                    (item.product?.name || 'Product') :
                    (item.service?.name || 'Service');

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${itemName}</td>
                        <td>${item.description || '-'}</td>
                  <td class="text-end">
  ${item.item_type === 'product' ? `${item.quantity} ${item.uom?.name || ''}` : '-'}
</td>

                        <td class="text-end">${currency}${item.unit_price}</td>
                        <td class="text-end">${currency}${item.discount_amount || 0}</td>
                        <td class="text-end">${currency}${item.tax_amount || 0}</td>
                        <td class="text-end">${currency}${item.total_amount}</td>
                    </tr>
                `;
            });

            $('#invoiceItemsTable').html(html);
        },

        updatePaymentStatus: function (invoice) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            const balance = parseFloat(invoice.balance_amount || 0);

            let alertClass = 'alert-warning';
            let badgeClass = 'bg-warning';
            let statusText = 'Unpaid';

            if (invoice.payment_status === 'PAID') {
                alertClass = 'alert-success';
                badgeClass = 'bg-success';
                statusText = 'Fully Paid';
            } else if (invoice.payment_status === 'PARTIAL') {
                alertClass = 'alert-info';
                badgeClass = 'bg-info';
                statusText = 'Partially Paid';
            }

            $('#paymentStatusAlert').removeClass().addClass('alert ' + alertClass);
            $('#paymentStatusBadge').removeClass().addClass('badge ' + badgeClass).text(invoice.payment_status);
            $('#paymentStatusText').text(statusText);
            $('#balanceAmount').text(currency + balance.toFixed(2));
        },

        loadPaymentHistory: function () {
            const self = this;

            TempleAPI.get('/purchase/invoices/' + this.currentInvoiceId + '/payments')
                .done(function (response) {
                    if (response.success) {
                        // Handle both direct array and nested data structure
                        let payments = [];
                        if (Array.isArray(response.data)) {
                            payments = response.data;
                        } else if (response.data && response.data.payments) {
                            payments = response.data.payments;
                        } else if (response.data && response.data.data) {
                            payments = response.data.data;
                        }

                        self.displayPayments(payments);
                    } else {
                        // Display empty state if no payments
                        self.displayPayments([]);
                    }
                })
                .fail(function () {
                    // Display empty state on error
                    self.displayPayments([]);
                    console.error('Failed to load payment history');
                });
        },

        displayPayments: function (payments) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            let totalPaid = 0;

            if (!payments || payments.length === 0) {
                html = '<tr><td colspan="7" class="text-center">No payments found</td></tr>';
            } else {
                $.each(payments, function (index, payment) {
                    // Ensure amount is a valid number
                    const amount = parseFloat(payment.amount || 0);
                    totalPaid += amount;

                    // Handle different possible status values
                    let statusBadge = '';
                    if (payment.status === 'COMPLETED' || payment.status === 'completed') {
                        statusBadge = '<span class="badge bg-success">Completed</span>';
                    } else if (payment.status === 'PENDING' || payment.status === 'pending') {
                        statusBadge = '<span class="badge bg-warning">Pending</span>';
                    } else {
                        statusBadge = '<span class="badge bg-secondary">' + (payment.status || 'Unknown') + '</span>';
                    }

                    html += `
                        <tr>
                            <td>${payment.payment_number || 'N/A'}</td>
                            <td>${payment.payment_date ? TempleCore.formatDate(payment.payment_date) : 'N/A'}</td>
                            <td>${payment.payment_mode?.name || payment.paymentMode?.name || '-'}</td>
                            <td>${payment.reference_number || '-'}</td>
                            <td class="text-end">${currency}${amount.toFixed(2)}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="PurchaseInvoicesViewPage.viewPaymentDetails('${payment.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#paymentHistoryTable').html(html);
            $('#totalPaid').text(currency + (isNaN(totalPaid) ? '0.00' : totalPaid.toFixed(2)));
        },

        loadPaymentModes: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Mode</option>';
                        let hasActiveMode = false;

                        // Handle paginated response structure
                        let modes = [];
                        if (response.data && response.data.data) {
                            // Paginated response
                            modes = response.data.data;
                        } else if (response.data && Array.isArray(response.data)) {
                            // Direct array response
                            modes = response.data;
                        } else {
                            console.error('Unexpected payment modes response structure:', response);
                            TempleCore.showToast('Failed to load payment modes', 'error');
                            return;
                        }

                        // Build options from the modes array
                        $.each(modes, function (index, mode) {
                            if (mode.status == 1) {
                                options += `<option value="${mode.id}">${mode.name}</option>`;
                                hasActiveMode = true;
                            }
                        });

                        // Update both payment mode dropdowns if they exist
                        if ($('#paymentMode').length) {
                            $('#paymentMode').html(options);
                        }
                        if ($('#bulkPaymentMode').length) {
                            $('#bulkPaymentMode').html(options);
                        }

                        if (!hasActiveMode) {
                            TempleCore.showToast('No active payment modes available. Please contact administrator.', 'warning');
                        }

                        console.log('Payment modes loaded successfully:', modes.length + ' modes');
                    } else {
                        TempleCore.showToast('Failed to load payment modes', 'error');
                    }
                })
                .fail(function (xhr) {
                    console.error('Payment modes API error:', xhr);
                    TempleCore.showToast('Failed to load payment modes. Please refresh the page.', 'error');
                });
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'POSTED': '<span class="badge bg-success">Posted</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>'
            };
            return badges[status] || badges['DRAFT'];
        },

        bindEvents: function () {
            const self = this;

            // Add Payment
            $('#btnAddPayment').on('click', function () {
                self.showPaymentModal();
            });

            // Save Payment
            $('#btnSavePayment').on('click', function () {
                self.savePayment();
            });

            // Payment Mode Change
            $('#paymentMode').on('change', function () {
                const mode = $(this).find('option:selected').text().toLowerCase();
                if (mode.includes('cheque') || mode.includes('bank')) {
                    $('#bankDetails').show();
                } else {
                    $('#bankDetails').hide();
                }
            });

            // Edit Invoice
            $('#btnEditInvoice').on('click', function () {
                TempleRouter.navigate('purchase/invoices/edit', { id: self.currentInvoiceId });
            });

            // Payment Amount Validation
            $('#paymentAmount').on('input', function () {
                const amount = parseFloat($(this).val());
                const balance = parseFloat(self.currentInvoice.balance_amount);

                if (amount > balance) {
                    $(this).val(balance);
                    TempleCore.showToast('Amount cannot exceed balance', 'warning');
                }
            });


        },

        showPaymentModal: function () {
            const currency = TempleCore.formatCurrency(0).split('0')[0];

            $('#paymentForm')[0].reset();
            $('#modalInvoiceNumber').val(this.currentInvoice.invoice_number);
            $('#modalBalanceAmount').val(currency + this.currentInvoice.balance_amount);
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);
            $('#paymentAmount').val(this.currentInvoice.balance_amount);
            $('#paymentAmount').attr('max', this.currentInvoice.balance_amount);

            const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
            modal.show();
        },

        savePayment: function () {
            const self = this;

            // Check form validity first
            if (!$('#paymentForm')[0].checkValidity()) {
                $('#paymentForm')[0].reportValidity();
                return;
            }

            // Additional validation for payment mode
            const paymentModeId = $('#paymentMode').val();
            if (!paymentModeId || paymentModeId === '') {
                TempleCore.showToast('Please select a payment mode', 'warning');
                $('#paymentMode').addClass('is-invalid');
                $('#paymentMode').focus();
                return;
            }

            // Validate amount
            const amount = parseFloat($('#paymentAmount').val());
            const maxAmount = parseFloat(self.currentInvoice.balance_amount);

            if (!amount || amount <= 0) {
                TempleCore.showToast('Please enter a valid amount', 'warning');
                $('#paymentAmount').addClass('is-invalid');
                return;
            }

            if (amount > maxAmount) {
                TempleCore.showToast('Amount cannot exceed balance of ' + TempleCore.formatCurrency(maxAmount), 'warning');
                $('#paymentAmount').addClass('is-invalid');
                return;
            }

            // Prepare payment data
            const paymentData = {
                payment_date: $('#paymentDate').val(),
                payment_mode_id: paymentModeId,
                amount: amount,
                reference_number: $('#referenceNumber').val() || null,
                bank_name: $('#bankName').val() || null,
                bank_branch: $('#bankBranch').val() || null,
                cheque_date: $('#chequeDate').val() || null,
                notes: $('#paymentNotes').val() || null
            };

            // Show loading
            $('#btnSavePayment').prop('disabled', true).html('<i class="spinner-border spinner-border-sm"></i> Processing...');
            TempleCore.showLoading(true);

            // Make API call
            TempleAPI.post('/purchase/invoices/' + this.currentInvoiceId + '/payment', paymentData)
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                        TempleCore.showToast('Payment processed successfully', 'success');

                        // Reload invoice to show updated payment status
                        self.loadInvoice();
                        self.loadPaymentHistory();
                    } else {
                        TempleCore.showToast(response.message || 'Payment processing failed', 'error');

                        // Show field-specific errors if available
                        if (response.errors) {
                            $.each(response.errors, function (field, messages) {
                                const $field = $('#' + field.replace('_', ''));
                                if ($field.length) {
                                    $field.addClass('is-invalid');
                                    $field.after('<div class="invalid-feedback">' + messages[0] + '</div>');
                                }
                            });
                        }
                    }
                })
                .fail(function (xhr) {
                    let errorMessage = 'Failed to process payment';

                    // Parse error response
                    if (xhr.responseJSON) {
                        if (xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                        if (xhr.responseJSON.errors) {
                            const firstError = Object.values(xhr.responseJSON.errors)[0];
                            if (Array.isArray(firstError)) {
                                errorMessage = firstError[0];
                            }
                        }
                    }

                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                    $('#btnSavePayment').prop('disabled', false).html('<i class="bi bi-check-circle"></i> Save Payment');
                });
        },

        viewPaymentDetails: function (paymentId) {
            const self = this;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
            modal.show();

            // Show loading, hide content
            $('#paymentDetailsLoading').show();
            $('#paymentDetailsContent').hide();

            // Fetch payment details
            TempleAPI.get('/purchase/payments/' + paymentId)
                .done(function (response) {
                    if (response.success) {
                        self.displayPaymentDetails(response.data);
                    } else {
                        TempleCore.showToast('Failed to load payment details', 'error');
                        bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal')).hide();
                    }
                })
                .fail(function () {
                    // If the specific payment endpoint doesn't exist, try to find it from the current payments
                    const payment = self.findPaymentFromHistory(paymentId);
                    if (payment) {
                        self.displayPaymentDetails(payment);
                    } else {
                        TempleCore.showToast('Failed to load payment details', 'error');
                        bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal')).hide();
                    }
                })
                .always(function () {
                    $('#paymentDetailsLoading').hide();
                    $('#paymentDetailsContent').show();
                });
        },

        findPaymentFromHistory: function (paymentId) {
            // Try to find the payment in the current invoice's payment history
            if (this.currentInvoice && this.currentInvoice.payments) {
                const payment = this.currentInvoice.payments.find(p => p.id == paymentId);
                if (payment) {
                    // Add invoice and supplier info to the payment object
                    payment.invoice_number = this.currentInvoice.invoice_number;
                    payment.supplier_name = this.currentInvoice.supplier?.name;
                    return payment;
                }
            }
            return null;
        },

        // Replace the displayPaymentDetails function with this corrected version:

        displayPaymentDetails: function (payment) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];

            // Basic Details
            $('#detailPaymentNumber').text(payment.payment_number || 'N/A');
            $('#detailPaymentDate').text(payment.payment_date ? TempleCore.formatDate(payment.payment_date) : 'N/A');
            $('#detailInvoiceNumber').text(payment.invoice_number || this.currentInvoice.invoice_number || 'N/A');
            $('#detailSupplier').text(payment.supplier_name || this.currentInvoice.supplier?.name || 'N/A');

            // Payment Info
            const modeName = payment.payment_mode?.name || payment.paymentMode?.name || '-';
            $('#detailPaymentMode').text(modeName);
            $('#detailAmount').text(currency + parseFloat(payment.amount || 0).toFixed(2));
            $('#detailReference').text(payment.reference_number || 'N/A');

            // Status with badge
            let statusHtml = '';
            const status = payment.status || 'COMPLETED';
            if (status === 'COMPLETED' || status === 'completed') {
                statusHtml = '<span class="badge bg-success">Completed</span>';
            } else if (status === 'PENDING' || status === 'pending') {
                statusHtml = '<span class="badge bg-warning">Pending</span>';
            } else if (status === 'FAILED' || status === 'failed') {
                statusHtml = '<span class="badge bg-danger">Failed</span>';
            } else {
                statusHtml = '<span class="badge bg-secondary">' + status + '</span>';
            }
            $('#detailStatus').html(statusHtml);

            // Bank Details (if available)
            if (payment.bank_name || payment.bank_branch || payment.cheque_date) {
                $('#detailBankInfo').show();
                $('#detailBankName').text(payment.bank_name || 'N/A');
                $('#detailBankBranch').text(payment.bank_branch || 'N/A');
                $('#detailChequeDate').text(payment.cheque_date ? TempleCore.formatDate(payment.cheque_date) : 'N/A');
            } else {
                $('#detailBankInfo').hide();
            }

            // Notes
            $('#detailNotes').text(payment.notes || 'No notes available');

            // Metadata
            $('#detailCreatedBy').text(payment.created_by_name || payment.creator?.name || 'System');

            // Format created_at date and time
            // Option 1: Use TempleCore.formatDate if it exists
            if (payment.created_at) {
                const createdDate = new Date(payment.created_at);
                const formattedDateTime = TempleCore.formatDate(payment.created_at) + ' ' +
                    createdDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                $('#detailCreatedAt').text(formattedDateTime);
            } else {
                $('#detailCreatedAt').text('N/A');
            }

            // Store payment data for printing
            this.currentPaymentDetails = payment;
        },

        // Alternative: Add this helper function to format date and time if you prefer
        formatDateTime: function (dateTimeString) {
            if (!dateTimeString) return 'N/A';

            try {
                const date = new Date(dateTimeString);

                // Check if date is valid
                if (isNaN(date.getTime())) return 'N/A';

                // Format date part
                const dateOptions = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                };
                const datePart = date.toLocaleDateString('en-US', dateOptions);

                // Format time part
                const timeOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                };
                const timePart = date.toLocaleTimeString('en-US', timeOptions);

                return `${datePart} at ${timePart}`;
            } catch (e) {
                return 'N/A';
            }
        },
        printInvoice: function (invoiceId) {
            // Navigate to the print page with the invoice ID
            TempleRouter.navigate('purchase/invoices/print', { id: invoiceId });
        },

    };

})(jQuery, window);