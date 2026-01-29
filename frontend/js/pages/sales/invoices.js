// js/pages/sales/invoices/list.js
// Sales Invoice List Page with FIUU Online payment gateway integration

(function ($, window) {
    'use strict';

    window.SalesInvoicesPage = {
        activeTab: 'all',
        permissions: {},
        currentUser: null,
        pendingPayment: null, // Store pending payment data
        paymentMessageHandler: null, // Store message handler reference

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.activeTab = 'all';
            this.pendingPayment = null;

            // Set permissions based on user type
            this.setDefaultPermissions();

            // Initialize page
            this.render();
            this.loadPaymentModes();
            this.loadData();
            this.bindEvents();
        },

        setDefaultPermissions: function () {
            const userType = this.currentUser?.user_type || '';
            this.permissions = {
                can_create_sales_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_sales_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_sales_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_payment_create_sales_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_migrate_to_accounting_sales_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_sales_invoices: true
            };
        },

        render: function () {
            const currencySymbol = TempleCore.getCurrency();

            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Sales Invoices</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-warning me-2 d-none" id="retryMigrationBtn" title="Retry Failed Migrations">
                                <i class="bi bi-arrow-repeat"></i> Retry Migrations
                            </button>
                            
                            ${this.permissions.can_create_sales_invoices ? `
                            <button class="btn btn-primary" id="createInvoiceBtn">
                                <i class="bi bi-plus-circle"></i> New Invoice
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Tabs -->
                    <ul class="nav nav-tabs mb-4" id="invoiceTabs">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-tab="all">
                                All Invoices
                                <span class="badge bg-secondary ms-1" id="countAll">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-tab="unpaid">
                                Unpaid
                                <span class="badge bg-danger ms-1" id="countUnpaid">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-tab="partial">
                                Partial
                                <span class="badge bg-warning ms-1" id="countPartial">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-tab="paid">
                                Paid
                                <span class="badge bg-success ms-1" id="countPaid">0</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-tab="overdue">
                                Overdue
                                <span class="badge bg-danger ms-1" id="countOverdue">0</span>
                            </a>
                        </li>
                    </ul>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Total Invoices</h6>
                                    <h4 id="totalInvoices">0</h4>
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
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Paid Amount</h6>
                                    <h4 id="paidAmount">${currencySymbol} 0.00</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Outstanding</h6>
                                    <h4 id="outstandingAmount" class="text-danger">${currencySymbol} 0.00</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                           
                                            <th>Total</th>
                                            <th>Paid</th>
                                            <th>Balance</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="invoiceTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
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
                                    <input type="hidden" id="paymentInvoiceId">
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
            `;

            $('#page-container').html(html);
        },

        loadData: function () {
            const self = this;

            const params = {
                payment_status: this.activeTab === 'all' ? '' : this.activeTab.toUpperCase()
            };

            TempleAPI.get('/sales/invoices', params)
                .done(function (response) {
                    if (response.success) {
                        self.renderTable(response.data, self.permissions);

                        if (response.summary) {
                            self.updateSummary(response.summary);
                        } else {
                            self.calculateSummaryFromData(response.data);
                        }

                        self.checkPendingMigrations(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load invoices', 'error');
                });
        },

        checkPendingMigrations: function (data) {
            let pendingCount = 0;
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(function (invoice) {
                    if (invoice.status === 'POSTED' && invoice.account_migration == 0) {
                        pendingCount++;
                    }
                });
            }

            if (pendingCount > 0) {
                $('#migrationAlert').removeClass('d-none');
                $('#migrationAlertText').text(`${pendingCount} invoice(s) pending account migration.`);
            } else {
                $('#migrationAlert').addClass('d-none');
            }
        },

        calculateSummaryFromData: function (data) {
            if (!data.data || !Array.isArray(data.data)) return;

            let totalAmount = 0;
            let paidAmount = 0;
            let outstandingAmount = 0;
            let unpaidCount = 0;
            let partialCount = 0;
            let paidCount = 0;
            let overdueCount = 0;

            const today = new Date();

            data.data.forEach(function (invoice) {
                totalAmount += parseFloat(invoice.total_amount) || 0;
                paidAmount += parseFloat(invoice.paid_amount) || 0;
                outstandingAmount += parseFloat(invoice.balance_amount) || 0;

                if (invoice.payment_status === 'UNPAID') unpaidCount++;
                else if (invoice.payment_status === 'PARTIAL') partialCount++;
                else if (invoice.payment_status === 'PAID') paidCount++;

                if (invoice.payment_status !== 'PAID' && invoice.payment_due_date) {
                    const dueDate = new Date(invoice.payment_due_date);
                    if (dueDate < today) overdueCount++;
                }
            });

            const summary = {
                total_count: data.total || data.data.length,
                total_amount: totalAmount,
                paid_amount: paidAmount,
                outstanding_amount: outstandingAmount,
                all_count: data.total || data.data.length,
                unpaid_count: unpaidCount,
                partial_count: partialCount,
                paid_count: paidCount,
                overdue_count: overdueCount
            };

            this.updateSummary(summary);
        },

        renderTable: function (data, permissions) {
            const tbody = $('#invoiceTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="9" class="text-center">No invoices found</td></tr>');
                return;
            }

            let html = '';
            const today = new Date();

            $.each(data.data, function (index, invoice) {
                const dueDate = invoice.payment_due_date ? new Date(invoice.payment_due_date) : null;
                const isOverdue = dueDate && dueDate < today && invoice.payment_status !== 'PAID';
                const currencySymbol = TempleCore.getCurrency();

                let customerName = 'N/A';
                if (invoice.devotee) {
                    customerName = invoice.devotee.customer_name ||
                        invoice.devotee.english_name ||
                        invoice.devotee.name ||
                        'N/A';
                } else if (invoice.customer) {
                    customerName = invoice.customer.name ||
                        invoice.customer.customer_name ||
                        'N/A';
                }

                let migrationStatus = '';
                let migrationButton = '';

                if (invoice.status === 'POSTED') {
                    if (invoice.account_migration == 1) {
                        migrationStatus = '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Migrated</span>';
                    } else {
                        migrationStatus = '<span class="badge bg-warning"><i class="bi bi-exclamation-circle"></i> Pending</span>';

                        migrationButton = permissions.can_migrate_to_accounting_sales_invoices
                            ? `<button class="btn btn-outline-info migrate-invoice" 
                                data-id="${invoice.id}"
                                data-number="${invoice.invoice_number}"
                                title="Migrate to Accounting">
                                <i class="bi bi-journal-arrow-up"></i>
                            </button>`
                            : '';
                    }
                }

                html += `
                    <tr data-id="${invoice.id}" class="${isOverdue ? 'table-danger' : ''}">
                        <td><strong>${invoice.invoice_number}</strong></td>
                        <td>${SalesInvoicesPage.formatDate(invoice.invoice_date)}</td>
                        <td>${customerName}</td>
                     
                        <td><strong>${currencySymbol} ${parseFloat(invoice.total_amount).toFixed(2)}</strong></td>
                        <td>${currencySymbol} ${parseFloat(invoice.paid_amount).toFixed(2)}</td>
                        <td>${currencySymbol} ${parseFloat(invoice.balance_amount).toFixed(2)}</td>
                        <td>${SalesInvoicesPage.getStatusBadge(invoice.payment_status)}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                ${permissions.can_view_sales_invoices ? `
                                <button class="btn btn-outline-primary view-invoice" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>`: ''}

                                ${invoice.payment_status !== 'PAID' && invoice.status !== 'CANCELLED' && permissions.can_edit_sales_invoices ? `
                                    <button class="btn btn-outline-warning edit-invoice" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : ''}
                  
                                ${invoice.payment_status !== 'PAID' && invoice.status === 'POSTED' ? `
                                    <button class="btn btn-outline-success add-payment" 
                                        data-invoice='${JSON.stringify({
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    balance_amount: invoice.balance_amount
                })}' title="Add Payment">
                                        <i class="bi bi-cash"></i>
                                    </button>
                                ` : ''}
                                
                                <button class="btn btn-outline-info print-invoice" title="Print">
                                    <i class="bi bi-printer"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.html(html);
        },

        updateSummary: function (summary) {
            const currencySymbol = TempleCore.getCurrency();
            if (summary) {
                const totalAmount = isNaN(summary.total_amount) ? 0 : summary.total_amount;
                const paidAmount = isNaN(summary.paid_amount) ? 0 : summary.paid_amount;
                const outstandingAmount = isNaN(summary.outstanding_amount) ? 0 : summary.outstanding_amount;

                $('#totalInvoices').text(summary.total_count || 0);
                $('#totalAmount').text(`${currencySymbol} ${totalAmount.toFixed(2)}`);
                $('#paidAmount').text(`${currencySymbol} ${paidAmount.toFixed(2)}`);
                $('#outstandingAmount').text(`${currencySymbol} ${outstandingAmount.toFixed(2)}`);

                $('#countAll').text(summary.all_count || 0);
                $('#countUnpaid').text(summary.unpaid_count || 0);
                $('#countPartial').text(summary.partial_count || 0);
                $('#countPaid').text(summary.paid_count || 0);
                $('#countOverdue').text(summary.overdue_count || 0);
            }
        },

        getStatusBadge: function (status) {
            const badges = {
                'UNPAID': '<span class="badge bg-danger">Unpaid</span>',
                'PARTIAL': '<span class="badge bg-warning">Partial</span>',
                'PAID': '<span class="badge bg-success">Paid</span>'
            };
            return badges[status] || status;
        },

        loadPaymentModes: function () {
            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Mode</option>';
                        let modes = [];

                        if (response.data && response.data.data) {
                            modes = response.data.data;
                        } else if (response.data && Array.isArray(response.data)) {
                            modes = response.data;
                        }

                        $.each(modes, function (index, mode) {
                            if (mode.status == 1) {
                                // Store payment gateway flag in data attribute
                                const isGateway = mode.is_payment_gateway ? 'true' : 'false';
                                options += `<option value="${mode.id}" data-is-gateway="${isGateway}">${mode.name}</option>`;
                            }
                        });

                        $('#paymentMode').html(options);
                    }
                })
                .fail(function (xhr) {
                    console.error('Payment modes API error:', xhr);
                    TempleCore.showToast('Failed to load payment modes', 'error');
                });
        },

        showPaymentModal: function (invoiceData) {
            const self = this;

            // Load payment modes if not already loaded
            if ($('#paymentMode option').length <= 1) {
                this.loadPaymentModes();
            }

            const currencySymbol = TempleCore.getCurrency();

            // FIX: Use toFixed(2) to avoid floating point precision issues
            const balanceAmount = parseFloat(invoiceData.balance_amount) || 0;
            const formattedBalance = balanceAmount.toFixed(2);

            $('#paymentForm')[0].reset();
            $('#paymentInvoiceId').val(invoiceData.id);
            $('#modalInvoiceNumber').val(invoiceData.invoice_number);
            $('#modalBalanceAmount').val(`${currencySymbol} ${formattedBalance}`);
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);

            // Set amount with proper formatting
            $('#paymentAmount').val(formattedBalance);
            $('#paymentAmount').attr('max', formattedBalance);

            const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
            modal.show();
        },
savePayment: function () {
    const self = this;

    // Validate form
    if (!$('#paymentForm')[0].checkValidity()) {
        $('#paymentForm')[0].reportValidity();
        return;
    }

    const invoiceId = $('#paymentInvoiceId').val();
    const paymentAmount = parseFloat($('#paymentAmount').val());
    const maxAmount = parseFloat($('#paymentAmount').attr('max'));
    
    // Additional validation: amount must not exceed balance
    if (paymentAmount > maxAmount) {
        TempleCore.showToast('Payment amount cannot exceed balance amount', 'error');
        return;
    }

    if (paymentAmount <= 0) {
        TempleCore.showToast('Payment amount must be greater than zero', 'error');
        return;
    }

    const paymentData = {
        payment_date: $('#paymentDate').val(),
        payment_mode_id: $('#paymentMode').val(),
        amount: paymentAmount.toFixed(2), // Send with 2 decimal precision
        reference_number: $('#referenceNumber').val(),
        bank_name: $('#bankName').val(),
        bank_branch: $('#bankBranch').val(),
        cheque_date: $('#chequeDate').val(),
        notes: $('#paymentNotes').val()
    };

    // Check if selected payment mode is a payment gateway
    const selectedOption = $('#paymentMode option:selected');
    const isPaymentGateway = selectedOption.data('is-gateway') === 'true' || 
                             selectedOption.data('is-gateway') === true;

    if (isPaymentGateway) {
        TempleCore.showToast('Processing online payment...', 'info');
    }

    TempleCore.showLoading(true);

    TempleAPI.post('/sales/invoices/' + invoiceId + '/payment', paymentData)
        .done(function (response) {
            if (response.success) {
                if (response.data.is_payment_gateway && response.data.payment_url) {
                    console.log('Payment gateway detected, opening popup', response.data);

                    self.pendingPayment = {
                        invoice_id: invoiceId,
                        payment_id: response.data.payment_id,
                        payment_reference: response.data.payment_reference,
                        invoice_number: response.data.invoice_number,
                        amount: response.data.amount
                    };

                    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                    self.openPaymentGateway(response.data);
                } else {
                    // Direct payment success
                    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                    TempleCore.showToast(response.message, 'success');
                    TempleCore.showLoading(false);
                    self.loadData();
                }
            } else {
                TempleCore.showToast(response.message || 'Payment failed', 'error');
                TempleCore.showLoading(false);
            }
        })
        .fail(function (xhr) {
            let errorMessage = 'Failed to process payment';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            }
            TempleCore.showToast(errorMessage, 'error');
            TempleCore.showLoading(false);
        });
},
        /**
         * Open payment gateway in popup window
         */
        openPaymentGateway: function (paymentData) {
            const self = this;

            console.log('Opening payment gateway popup', paymentData);

            // Calculate popup position (centered)
            const popupWidth = 800;
            const popupHeight = 600;
            const left = (screen.width - popupWidth) / 2;
            const top = (screen.height - popupHeight) / 2;

            const popupFeatures = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},` +
                `scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no`;

            const paymentWindow = window.open(paymentData.payment_url, 'PaymentGateway', popupFeatures);

            if (!paymentWindow) {
                TempleCore.showLoading(false);
                TempleCore.showToast('Please allow popups for payment processing', 'error');
                this.handlePaymentFailure({ message: 'Popup blocked' });
                return;
            }

            // Monitor payment popup
            this.monitorPaymentStatus(paymentWindow, paymentData.payment_id);
        },

        /**
         * Monitor payment status via popup window and message listener
         */
        monitorPaymentStatus: function (paymentWindow, paymentId) {
            const self = this;
            let checkInterval = null;
            let messageReceived = false;

            console.log('Monitoring payment status for payment ID:', paymentId);

            // Listen for postMessage from payment callback page
            self.paymentMessageHandler = function (event) {
                console.log('Payment message received:', event.data);

                if (event.data && event.data.type === 'PAYMENT_CALLBACK') {
                    messageReceived = true;

                    console.log('Payment callback message confirmed');

                    // Clear interval
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                    }

                    // Remove event listener
                    window.removeEventListener('message', self.paymentMessageHandler);

                    // Close payment window
                    if (paymentWindow && !paymentWindow.closed) {
                        paymentWindow.close();
                    }

                    // Handle payment result
                    if (event.data.status === 'success' || event.data.status === 'SUCCESS') {
                        self.handlePaymentSuccess(event.data);
                    } else {
                        self.handlePaymentFailure(event.data);
                    }
                }
            };

            window.addEventListener('message', self.paymentMessageHandler);

            // Fallback: Poll to check if popup is closed
            checkInterval = setInterval(function () {
                if (paymentWindow.closed) {
                    console.log('Payment popup closed');
                    clearInterval(checkInterval);
                    checkInterval = null;
                    window.removeEventListener('message', self.paymentMessageHandler);

                    if (!messageReceived) {
                        // Popup closed without message - check payment status via API
                        console.log('Popup closed without message, checking API...');
                        TempleCore.showToast('Payment window closed. Checking payment status...', 'info');
                        self.checkPaymentStatusViaAPI(paymentId);
                    }
                }
            }, 500);

            // Timeout after 15 minutes (900000ms)
            setTimeout(function () {
                if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                    window.removeEventListener('message', self.paymentMessageHandler);

                    if (paymentWindow && !paymentWindow.closed) {
                        paymentWindow.close();
                    }

                    if (!messageReceived) {
                        console.log('Payment timeout reached');
                        TempleCore.showLoading(false);
                        TempleCore.showToast('Payment timeout. Please check payment status manually.', 'warning');
                        self.loadData(); // Reload to check status
                    }
                }
            }, 900000); // 15 minutes
        },

        /**
         * Check payment status via API (fallback method)
         */
        checkPaymentStatusViaAPI: function (paymentId) {
            const self = this;

            console.log('Checking payment status via API for payment ID:', paymentId);

            TempleAPI.get(`/sales/invoices/payments/${paymentId}/status`)
                .done(function (response) {
                    console.log('Payment status response:', response);

                    if (response.success) {
                        if (response.data.payment_status === 'SUCCESS') {
                            self.handlePaymentSuccess(response.data);
                        } else if (response.data.payment_status === 'FAILED') {
                            self.handlePaymentFailure(response.data);
                        } else {
                            // Still pending
                            TempleCore.showToast('Payment is still pending. Please check later.', 'warning');
                            TempleCore.showLoading(false);
                            self.loadData(); // Reload to show current status
                        }
                    } else {
                        self.handlePaymentFailure({ message: 'Unable to verify payment status' });
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Unable to verify payment status. Please check manually.', 'error');
                    TempleCore.showLoading(false);
                    self.loadData(); // Reload anyway
                });
        },

        /**
         * Handle successful payment
         */
        handlePaymentSuccess: function (paymentData) {
            const self = this;
            console.log('Payment successful:', paymentData);

            TempleCore.showLoading(false);

            // Show success details
            if (this.pendingPayment) {
                const currencySymbol = TempleCore.getCurrency ? TempleCore.getCurrency() : 'RM';
                const message = `Payment of ${currencySymbol} ${parseFloat(this.pendingPayment.amount).toFixed(2)} for invoice ${this.pendingPayment.invoice_number} completed successfully!`;

                Swal.fire({
                    icon: 'success',
                    title: 'Payment Successful',
                    text: message,
                    confirmButtonText: 'OK'
                }).then(function () {
                    // Reload invoice list
                    self.loadData();
                });
            } else {
                TempleCore.showToast('Payment completed successfully!', 'success');
                self.loadData();
            }

            // Clear pending payment data
            this.pendingPayment = null;
        },

        /**
         * Handle failed payment
         */
        handlePaymentFailure: function (paymentData) {
            const self = this;
            console.log('Payment failed:', paymentData);

            TempleCore.showLoading(false);

            const errorMessage = paymentData?.message || paymentData?.error_desc || 'Payment was cancelled or failed';

            // Show detailed error if available
            if (this.pendingPayment) {
                Swal.fire({
                    icon: 'error',
                    title: 'Payment Failed',
                    text: `Payment for invoice ${this.pendingPayment.invoice_number} failed. ${errorMessage}`,
                    confirmButtonText: 'OK'
                }).then(function () {
                    // Reload invoice list to reflect any changes
                    self.loadData();
                });
            } else {
                TempleCore.showToast(errorMessage, 'error');
                self.loadData();
            }

            // Clear pending payment data
            this.pendingPayment = null;
        },

        migrateInvoice: function (invoiceId, invoiceNumber) {
            const self = this;

            TempleCore.showConfirm(
                'Migrate to Accounting',
                `Are you sure you want to migrate invoice ${invoiceNumber} to accounting? This will create journal entries.`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post('/sales/invoices/' + invoiceId + '/migrate-to-accounting', {})
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Invoice migrated successfully', 'success');
                                self.loadData();
                            } else {
                                TempleCore.showToast(response.message || 'Migration failed', 'error');
                            }
                        })
                        .fail(function (xhr) {
                            const errorMsg = xhr.responseJSON?.message || 'Failed to migrate invoice';
                            TempleCore.showToast(errorMsg, 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        retryFailedMigrations: function () {
            const self = this;
            TempleCore.showConfirm(
                'Retry Failed Migrations',
                'This will attempt to migrate all posted invoices that haven\'t been migrated yet. Continue?',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/sales/invoices/retry-failed-migrations', {})
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Retry completed', 'success');
                                self.loadData();
                            } else {
                                TempleCore.showToast(response.message || 'Retry failed', 'error');
                            }
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        formatDate: function (dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        },

        bindEvents: function () {
            const self = this;

            $('#createInvoiceBtn').on('click', function () {
                TempleRouter.navigate('sales/invoices/create');
            });

            $('#retryMigrationBtn').on('click', function () {
                self.retryFailedMigrations();
            });

            $(document).on('click', '.migrate-invoice', function () {
                const invoiceId = $(this).data('id');
                const invoiceNumber = $(this).data('number');
                self.migrateInvoice(invoiceId, invoiceNumber);
            });

            $('#invoiceTabs .nav-link').on('click', function (e) {
                e.preventDefault();
                $('#invoiceTabs .nav-link').removeClass('active');
                $(this).addClass('active');
                self.activeTab = $(this).data('tab');
                self.loadData();
            });

            $(document).on('click', '.view-invoice', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('sales/invoices/view', { id: id });
            });

            $(document).on('click', '.edit-invoice', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('sales/invoices/edit', { id: id });
            });

            $(document).on('click', '.add-payment', function () {
                const invoiceData = JSON.parse($(this).attr('data-invoice'));
                self.showPaymentModal(invoiceData);
            });

            $('#btnSavePayment').on('click', function () {
                self.savePayment();
            });

            $('#paymentMode').on('change', function () {
                const mode = $(this).find('option:selected').text().toLowerCase();
                if (mode.includes('cheque') || mode.includes('bank')) {
                    $('#bankDetails').show();
                } else {
                    $('#bankDetails').hide();
                }
            });

            $('#paymentAmount').on('input', function () {
                const amount = parseFloat($(this).val());
                const maxAmount = parseFloat($(this).attr('max'));
                if (amount > maxAmount) {
                    $(this).val(maxAmount);
                    TempleCore.showToast('Amount cannot exceed balance', 'warning');
                }
            });

            $(document).on('click', '.print-invoice', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('sales/invoices/print', { id: id });
            });
        },

        cleanup: function () {
            console.log('Cleaning up Sales Invoices page');

            // Cleanup event handlers
            $(document).off('click', '.view-invoice');
            $(document).off('click', '.edit-invoice');
            $(document).off('click', '.add-payment');
            $(document).off('click', '.print-invoice');
            $(document).off('click', '.migrate-invoice');
            $('#createInvoiceBtn').off('click');
            $('#retryMigrationBtn').off('click');
            $('#btnSavePayment').off('click');
            $('#paymentMode').off('change');
            $('#paymentAmount').off('input');
            $('#invoiceTabs .nav-link').off('click');

            // Remove window message listener if exists
            if (this.paymentMessageHandler) {
                window.removeEventListener('message', this.paymentMessageHandler);
                this.paymentMessageHandler = null;
            }

            // Clean up pending payment data
            this.pendingPayment = null;
        }
    };

})(jQuery, window);