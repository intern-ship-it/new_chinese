// js/pages/purchase/invoices.js - Updated with Account Migration
// Purchase Invoice List Page with payment functionality, print integration, and account migration

(function ($, window) {
    'use strict';

    window.PurchaseInvoicePage = {
        activeTab: 'all',
        permissions: {},
        currentUser: null,
        init: function () {

            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            this.activeTab = 'all';
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.loadPaymentModes();
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
                can_view_purchase_invoices: true
            };
        },

        render: function () {
            const currencySymbol = TempleCore.getCurrency();

            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Purchase Invoices</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-warning me-2" id="retryMigrationBtn" title="Retry Failed Migrations">
                                <i class="bi bi-arrow-repeat"></i> Retry Migrations
                            </button>
                     
          
${this.permissions.can_create_purchase_invoices ? `

                            <button class="btn btn-primary" id="createInvoiceBtn">
                                <i class="bi bi-plus-circle"></i> New Invoice
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Migration Status Alert -->
                    <div id="migrationAlert" class="alert alert-info d-none mb-4">
                        <i class="bi bi-info-circle"></i> <span id="migrationAlertText"></span>
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
                                            <th>Supplier</th>
                                            <th>PO Ref</th>
                                            <th>Total</th>
                                            <th>Paid</th>
                                            <th>Balance</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="invoiceTableBody">
                                        <tr>
                                            <td colspan="10" class="text-center">Loading...</td>
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

            TempleAPI.get('/purchase/invoices', params)
                .done(function (response) {
                    if (response.success) {
                        self.renderTable(response.data, self.permissions);

                        // Update summary
                        if (response.summary) {
                            self.updateSummary(response.summary);
                        } else {
                            // Calculate summary from data if not provided by backend
                            self.calculateSummaryFromData(response.data);
                        }

                        // Check for pending migrations
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
                $('#migrationAlertText').text(`${pendingCount} invoice(s) pending account migration. Click the journal icon to migrate individually or use "Retry Migrations" for bulk processing.`);
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

                // Check if overdue
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
                tbody.html('<tr><td colspan="10" class="text-center">No invoices found</td></tr>');
                return;
            }

            let html = '';
            const today = new Date();

            $.each(data.data, function (index, invoice) {
                const dueDate = invoice.payment_due_date ? new Date(invoice.payment_due_date) : null;
                const isOverdue = dueDate && dueDate < today && invoice.payment_status !== 'PAID';
                const currencySymbol = TempleCore.getCurrency();

                // Migration status display
                let migrationStatus = '';
                let migrationButton = '';

                if (invoice.status === 'POSTED') {
                    if (invoice.account_migration == 1) {
                        migrationStatus = '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Migrated</span>';
                    } else {
                        migrationStatus = '<span class="badge bg-warning"><i class="bi bi-exclamation-circle"></i> Pending</span>';

                        migrationButton = permissions.can_migrate_to_accounting_purchase_invoices
                            ? `
            <button class="btn btn-outline-info migrate-invoice" 
                data-id="${invoice.id}"
                data-number="${invoice.invoice_number}"
                title="Migrate to Accounting">
                <i class="bi bi-journal-arrow-up"></i>
            </button>`
                            : '';
                    }

                } else if (invoice.status === 'DRAFT') {
                    migrationStatus = '<span class="badge bg-secondary">Draft</span>';
                } else {
                    migrationStatus = '<span class="badge bg-dark">' + invoice.status + '</span>';
                }

                html += `
                    <tr data-id="${invoice.id}" class="${isOverdue ? 'table-danger' : ''}">
                        <td><strong>${invoice.invoice_number}</strong></td>
                        <td>${PurchaseInvoicePage.formatDate(invoice.invoice_date)}</td>
                        <td>${invoice.supplier?.name || 'N/A'}</td>
                        <td>${invoice.purchase_order?.po_number || '-'}</td>
                        <td><strong>${currencySymbol} ${parseFloat(invoice.total_amount).toFixed(2)}</strong></td>
                        <td>${currencySymbol} ${parseFloat(invoice.paid_amount).toFixed(2)}</td>
                        <td>${currencySymbol} ${parseFloat(invoice.balance_amount).toFixed(2)}</td>
                        <td>${PurchaseInvoicePage.getStatusBadge(invoice.payment_status)}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                            ${permissions.can_view_purchase_invoices ? `
                                <button class="btn btn-outline-primary view-invoice" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>`: ''}

                                ${invoice.payment_status !== 'PAID' && invoice.status !== 'CANCELLED' && permissions.can_edit_purchase_invoices ? `
                                    <button class="btn btn-outline-warning edit-invoice" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : ''}
                                ${invoice.payment_status !== 'PAID' && permissions.can_payment_create_purchase_invoices ? `
                                    <button class="btn btn-outline-success add-payment" 
                                        data-invoice='${JSON.stringify({
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    balance_amount: invoice.balance_amount
                })}' title="Add Payment">
                                        <i class="bi bi-cash"></i>
                                    </button>
                                ` : ''}
                                ${migrationButton}
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
                $('#totalAmount').text(`${currencySymbol}${totalAmount.toFixed(2)}`);
                $('#paidAmount').text(`${currencySymbol}${paidAmount.toFixed(2)}`);
                $('#outstandingAmount').text(`${currencySymbol}${outstandingAmount.toFixed(2)}`);

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
            const self = this;

            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Mode</option>';
                        let hasActiveMode = false;

                        // Handle paginated response structure
                        let modes = [];
                        if (response.data && response.data.data) {
                            modes = response.data.data;
                        } else if (response.data && Array.isArray(response.data)) {
                            modes = response.data;
                        } else {
                            console.error('Unexpected payment modes response structure:', response);
                            return;
                        }

                        // Build options from the modes array
                        $.each(modes, function (index, mode) {
                            if (mode.status == 1) {
                                options += `<option value="${mode.id}">${mode.name}</option>`;
                                hasActiveMode = true;
                            }
                        });

                        $('#paymentMode').html(options);

                        if (!hasActiveMode) {
                            TempleCore.showToast('No active payment modes available. Please contact administrator.', 'warning');
                        }
                    }
                })
                .fail(function (xhr) {
                    console.error('Payment modes API error:', xhr);
                    TempleCore.showToast('Failed to load payment modes. Please refresh the page.', 'error');
                });
        },

        showPaymentModal: function (invoiceData) {
            // Load payment modes if not already loaded
            if ($('#paymentMode option').length <= 1) {
                this.loadPaymentModes();
            }

            const currencySymbol = TempleCore.getCurrency();
            const balanceAmount = isNaN(parseFloat(invoiceData.balance_amount)) ? 0 : parseFloat(invoiceData.balance_amount);

            // Reset form
            $('#paymentForm')[0].reset();

            // Set invoice details
            $('#paymentInvoiceId').val(invoiceData.id);
            $('#modalInvoiceNumber').val(invoiceData.invoice_number);
            $('#modalBalanceAmount').val(`${currencySymbol}${balanceAmount.toFixed(2)}`);

            // Set payment date to today
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);

            // Set payment amount and max
            $('#paymentAmount').val(balanceAmount);
            $('#paymentAmount').attr('max', balanceAmount);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
            modal.show();
        },

        savePayment: function () {
            const self = this;

            if (!$('#paymentForm')[0].checkValidity()) {
                $('#paymentForm')[0].reportValidity();
                return;
            }

            const invoiceId = $('#paymentInvoiceId').val();
            const paymentData = {
                payment_date: $('#paymentDate').val(),
                payment_mode_id: $('#paymentMode').val(),
                amount: $('#paymentAmount').val(),
                reference_number: $('#referenceNumber').val(),
                bank_name: $('#bankName').val(),
                bank_branch: $('#bankBranch').val(),
                cheque_date: $('#chequeDate').val(),
                notes: $('#paymentNotes').val()
            };

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/invoices/' + invoiceId + '/payment', paymentData)
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                        TempleCore.showToast(response.message, 'success');
                        self.loadData(); // Reload the list
                    } else {
                        // Show the error message from the backend
                        TempleCore.showToast(response.message || 'Payment failed', 'error');
                    }
                })
                .fail(function (xhr) {
                    // Handle failed requests and show the actual error message
                    let errorMessage = 'Failed to process payment';

                    if (xhr.responseJSON) {
                        // If there's a JSON response with a message, use it
                        errorMessage = xhr.responseJSON.message || errorMessage;

                        // If there are validation errors, show the first one
                        if (xhr.responseJSON.errors) {
                            const errors = xhr.responseJSON.errors;
                            const firstError = Object.values(errors)[0];
                            if (Array.isArray(firstError)) {
                                errorMessage = firstError[0];
                            } else {
                                errorMessage = firstError;
                            }
                        }
                    } else if (xhr.responseText) {
                        // Try to parse text response if JSON parsing failed
                        try {
                            const response = JSON.parse(xhr.responseText);
                            errorMessage = response.message || errorMessage;
                        } catch (e) {
                            // If parsing fails, use generic message
                            console.error('Error parsing response:', e);
                        }
                    }

                    // Show the error message as a toast alert
                    TempleCore.showToast(errorMessage, 'error');

                    // Also log to console for debugging
                    console.error('Payment error:', xhr);
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Migrate single invoice to accounting
        migrateInvoice: function (invoiceId, invoiceNumber) {
            const self = this;

            TempleCore.showConfirm(
                'Migrate to Accounting',
                `Are you sure you want to migrate invoice ${invoiceNumber} to accounting? This will create journal entries.`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post('/purchase/invoices/' + invoiceId + '/migrate-to-accounting', {})
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Invoice migrated successfully', 'success');
                                self.loadData(); // Reload to show updated status
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

        // Retry all failed migrations
        retryFailedMigrations: function () {
            const self = this;

            TempleCore.showConfirm(
                'Retry Failed Migrations',
                'This will attempt to migrate all posted invoices that haven\'t been migrated yet. Continue?',
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post('/purchase/invoices/retry-failed-migrations', {})
                        .done(function (response) {
                            if (response.success) {
                                const summary = response.summary;
                                const message = `Migration completed: ${summary.success} successful, ${summary.failed} failed out of ${summary.total} total`;

                                if (summary.failed > 0 && response.results.failed) {
                                    // Show detailed error message
                                    let errorDetails = 'Failed invoices:\n';
                                    response.results.failed.forEach(function (fail) {
                                        errorDetails += `- ${fail.invoice_number}: ${fail.error}\n`;
                                    });
                                    console.error(errorDetails);
                                    TempleCore.showToast(message, 'warning');
                                } else {
                                    TempleCore.showToast(message, 'success');
                                }

                                self.loadData(); // Reload to show updated status
                            } else {
                                TempleCore.showToast(response.message || 'Retry failed', 'error');
                            }
                        })
                        .fail(function (xhr) {
                            const errorMsg = xhr.responseJSON?.message || 'Failed to retry migrations';
                            TempleCore.showToast(errorMsg, 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        bindEvents: function () {
            const self = this;

            // Create invoice
            $('#createInvoiceBtn').on('click', function () {
                TempleRouter.navigate('purchase/invoices/create');
            });
            // Retry migrations button
            $('#retryMigrationBtn').on('click', function () {
                self.retryFailedMigrations();
            });

            // Single invoice migration
            $(document).on('click', '.migrate-invoice', function () {
                const invoiceId = $(this).data('id');
                const invoiceNumber = $(this).data('number');
                self.migrateInvoice(invoiceId, invoiceNumber);
            });

            // Tab switching
            $('#invoiceTabs .nav-link').on('click', function (e) {
                e.preventDefault();
                $('#invoiceTabs .nav-link').removeClass('active');
                $(this).addClass('active');
                self.activeTab = $(this).data('tab');
                self.loadData();
            });

            // View invoice
            $(document).on('click', '.view-invoice', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/invoices/view', { id: id });
            });

            // Edit invoice
            $(document).on('click', '.edit-invoice', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/invoices/edit', { id: id });
            });

            // Add payment
            $(document).on('click', '.add-payment', function () {
                const invoiceData = JSON.parse($(this).attr('data-invoice'));
                self.showPaymentModal(invoiceData);
            });

            // Save Payment button
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

            // Payment amount validation
            $('#paymentAmount').on('input', function () {
                const amount = parseFloat($(this).val());
                const maxAmount = parseFloat($(this).attr('max'));

                if (amount > maxAmount) {
                    $(this).val(maxAmount);
                    TempleCore.showToast('Amount cannot exceed balance', 'warning');
                }
            });

            // Print invoice
            $(document).on('click', '.print-invoice', function () {
                const id = $(this).closest('tr').data('id');
                self.printInvoice(id);
            });
        },

        // Print invoice function that navigates to the new print page
        printInvoice: function (invoiceId) {
            // Navigate to the print page with the invoice ID
            TempleRouter.navigate('purchase/invoices/print', { id: invoiceId });
        },

        // Helper function to format dates
        formatDate: function (dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    };

})(jQuery, window);