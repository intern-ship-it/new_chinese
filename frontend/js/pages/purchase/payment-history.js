// js/pages/purchase/payment-history.js
// Purchase Payment History Page with Payment Modal

(function ($, window) {
    'use strict';

    window.PurchasePaymentHistoryPage = {
        paymentModes: [],
        permissions: {},
        currentUser: null,
        init: function (params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            this.params = params || {};
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.bindEvents();
                self.loadData();
                self.loadPaymentModes();
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
                can_payment_view_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_migrate_to_accounting_purchase_invoices: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_purchase_invoices: true
            };
        },
        render: function () {
            const currencySymbol = TempleCore.getCurrency();
            const html = `
                <div class="container-fluid">
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h4 class="page-title">
                                    <i class="bi bi-clock-history"></i> Payment History
                                </h4>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/dashboard'); return false;">Purchase</a></li>
                                        <li class="breadcrumb-item active">Payment History</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                             ${this.permissions.can_view_purchase_invoices ? `
                                <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/invoice'); return false;">
                                    <i class="bi bi-receipt"></i> View Invoices
                                </button>`: ''}
                                <button class="btn btn-outline-secondary ms-2" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Invoice Number</label>
                                    <input type="text" class="form-control" id="filterInvoice" placeholder="Search invoice...">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="filterSupplier">
                                        <option value="">All Suppliers</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterFromDate">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterToDate">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="PAID">Fully Paid</option>
                                        <option value="PARTIAL">Partially Paid</option>
                                        <option value="PENDING">Pending</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <button class="btn btn-primary" id="btnSearch">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                    <button class="btn btn-secondary" id="btnReset">
                                        <i class="bi bi-x-circle"></i> Reset
                                    </button>
                                  
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payment History Table -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Payment Records</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="paymentHistoryTable">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Supplier</th>
                                            <th>Invoice Date</th>
                                            <th>Total Amount</th>
                                            <th>Paid Amount</th>
                                            <th>Balance</th>
                                            <th>Status</th>
                                            <th>Last Payment</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="paymentHistoryList">
                                        <tr>
                                            <td colspan="9" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <nav id="pagination" class="mt-3">
                                <!-- Pagination will be rendered here -->
                            </nav>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Details Modal -->
                <div class="modal fade" id="paymentDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Payment Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="paymentDetailsContent">
                                <!-- Content will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="PurchasePaymentHistoryPage.printDetails()">
                                    <i class="bi bi-printer"></i> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Add Payment Modal -->
                <div class="modal fade" id="paymentModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-cash-coin"></i> Record Payment
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Invoice Summary -->
                                <div class="alert alert-info mb-3">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <strong>Invoice:</strong> <span id="modalInvoiceNumber"></span>
                                        </div>
                                        <div class="col-md-4">
                                            <strong>Supplier:</strong> <span id="modalSupplierName"></span>
                                        </div>
                                        <div class="col-md-4">
                                            <strong>Balance:</strong> <span id="modalBalanceAmount" class="text-danger fw-bold"></span>
                                        </div>
                                    </div>
                                </div>

                                <form id="paymentForm">
                                    <input type="hidden" id="paymentInvoiceId">
                                    
                                    <!-- Payment Details -->
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="paymentDate" required>
                                            <small class="text-muted">Date when payment was made</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                            <select class="form-select" id="paymentMode" required>
                                                <option value="">Select Payment Mode</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Amount <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <span class="input-group-text">${currencySymbol}</span>
                                                <input type="number" class="form-control" id="paymentAmount" step="0.01" min="0.01" required>
                                                <button class="btn btn-outline-secondary" type="button" id="btnPayFull" title="Pay Full Amount">
                                                    Full
                                                </button>
                                            </div>
                                            <small class="text-muted">Enter amount to pay now</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Reference Number</label>
                                            <input type="text" class="form-control" id="referenceNumber" placeholder="Cheque/Transaction #">
                                            <small class="text-muted">Payment reference for tracking</small>
                                        </div>
                                    </div>
                                    
                                    <!-- Bank Details Section (Conditional) -->
                                    <div id="bankDetails" class="border rounded p-3 mb-3" style="display: none;">
                                        <h6 class="mb-3">
                                            <i class="bi bi-bank"></i> Bank Details
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-md-6">
                                                <label class="form-label">Bank Name</label>
                                                <input type="text" class="form-control" id="bankName" placeholder="Enter bank name">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Bank Branch</label>
                                                <input type="text" class="form-control" id="bankBranch" placeholder="Enter branch name">
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <label class="form-label">Cheque Date</label>
                                                <input type="date" class="form-control" id="chequeDate">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Cheque Number</label>
                                                <input type="text" class="form-control" id="chequeNumber" placeholder="Enter cheque number">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Notes Section -->
                                    <div class="mb-3">
                                        <label class="form-label">Payment Notes</label>
                                        <textarea class="form-control" id="paymentNotes" rows="2" placeholder="Any additional notes about this payment..."></textarea>
                                    </div>

                                    <!-- Payment Summary -->
                                    <div class="alert alert-warning" id="paymentSummary" style="display: none;">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <strong>Paying Now:</strong> <span id="summaryPayingAmount"></span>
                                            </div>
                                            <div class="col-md-6">
                                                <strong>Remaining Balance:</strong> <span id="summaryRemainingBalance"></span>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-success" id="btnSavePayment">
                                    <i class="bi bi-check-circle"></i> Record Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);

            // Initialize date inputs with default values
            const today = new Date();
            const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
            $('#filterFromDate').val(thirtyDaysAgo.toISOString().split('T')[0]);
            $('#filterToDate').val(today.toISOString().split('T')[0]);
        },

        bindEvents: function () {
            const self = this;

            $('#btnSearch').on('click', function () {
                self.loadData();
            });

            $('#btnReset').on('click', function () {
                $('#filterInvoice').val('');
                $('#filterSupplier').val('');
                $('#filterStatus').val('');
                const today = new Date();
                const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                $('#filterFromDate').val(thirtyDaysAgo.toISOString().split('T')[0]);
                $('#filterToDate').val(today.toISOString().split('T')[0]);
                self.loadData();
            });



            // Enter key search
            $('#filterInvoice').on('keypress', function (e) {
                if (e.which === 13) {
                    self.loadData();
                }
            });

            // Add payment button click
            $(document).on('click', '.add-payment', function () {
                const invoiceData = JSON.parse($(this).attr('data-invoice'));

                self.showPaymentModal(invoiceData);
            });

            // Save Payment button
            $('#btnSavePayment').on('click', function () {
                self.savePayment();
            });

            // Pay Full button
            $('#btnPayFull').on('click', function () {
                const balance = $('#paymentAmount').attr('data-balance');
                $('#paymentAmount').val(balance);
                self.updatePaymentSummary();
            });

            // Payment Mode Change - Show/hide bank details
            $('#paymentMode').on('change', function () {
                const selectedOption = $(this).find('option:selected');
                const modeName = selectedOption.text().toLowerCase();
                const modeType = selectedOption.data('type');

                // Show bank details for cheque/bank transfer modes
                if (modeName.includes('cheque') || modeName.includes('check') ||
                    modeName.includes('bank') || modeType === 'bank') {
                    $('#bankDetails').slideDown();

                    // Make bank fields required for cheque
                    if (modeName.includes('cheque') || modeName.includes('check')) {
                        $('#bankName').attr('required', true);
                        $('#chequeNumber').attr('required', true);
                    }
                } else {
                    $('#bankDetails').slideUp();
                    // Remove required attributes
                    $('#bankName').attr('required', false);
                    $('#chequeNumber').attr('required', false);
                }
            });

            // Payment amount input - Update summary
            $('#paymentAmount').on('input', function () {
                const amount = parseFloat($(this).val()) || 0;
                const maxAmount = parseFloat($(this).attr('max'));

                if (amount > maxAmount) {
                    $(this).val(maxAmount.toFixed(2));
                    TempleCore.showToast('Amount cannot exceed balance', 'warning');
                }

                self.updatePaymentSummary();
            });

            // Enter key submits payment form
            $('#paymentForm').on('keypress', function (e) {
                if (e.which === 13 && !$(e.target).is('textarea')) {
                    e.preventDefault();
                    $('#btnSavePayment').click();
                }
            });
        },

        loadData: function () {
            const self = this;
            const filters = {
                invoice: $('#filterInvoice').val(),
                supplier: $('#filterSupplier').val(),
                from_date: $('#filterFromDate').val(),
                to_date: $('#filterToDate').val(),
                status: $('#filterStatus').val()
            };

            TempleAPI.get('/purchase/payments/history', filters)
                .done(function (response) {
                    if (response.success) {
                        self.renderTable(response.data || [],self.permissions);
                        self.loadSuppliers();
                    } else {
                        self.renderTable([]);
                        TempleCore.showToast(response.message || 'Failed to load payment history', 'error');
                    }
                })
                .fail(function (xhr) {
                    self.renderTable([]);
                    const error = xhr.responseJSON?.message || 'Error loading payment history';
                    TempleCore.showToast(error, 'error');
                });
        },

        loadSuppliers: function () {
            TempleAPI.get('/purchase/suppliers/list')
                .done(function (response) {
                    if (response.success) {
                        let html = '<option value="">All Suppliers</option>';
                        $.each(response.data, function (i, supplier) {
                            html += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#filterSupplier').html(html);
                    }
                });
        },

        loadPaymentModes: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Payment Mode</option>';
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

                        // Store payment modes for later use
                        self.paymentModes = modes;

                        // Build options from the modes array
                        $.each(modes, function (index, mode) {
                            if (mode.status == 1) {
                                options += `<option value="${mode.id}" data-type="${mode.type || ''}">${mode.name}</option>`;
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

        renderTable: function (data,permissions) {
            const self = this;
            const currency = TempleCore.getCurrency();
            let html = '';

            if (!data || data.length === 0) {
                html = '<tr><td colspan="9" class="text-center">No payment records found</td></tr>';
            } else {
                $.each(data, function (i, record) {
                    const statusBadge = self.getStatusBadge(record.payment_status);
                    const lastPayment = record.last_payment_date ? new Date(record.last_payment_date).toLocaleDateString() : '-';

                    html += `
                        <tr>
                            <td><strong>${record.invoice_number}</strong></td>
                            <td>${record.supplier_name}</td>
                            <td>${new Date(record.invoice_date).toLocaleDateString()}</td>
                            <td>${currency}${parseFloat(record.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>${currency}${parseFloat(record.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>${currency}${parseFloat(record.balance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>${statusBadge}</td>
                            <td>${lastPayment}</td>
                            <td>
                            ${permissions.can_payment_view_purchase_invoices ? `
                                <button class="btn btn-sm btn-info" onclick="PurchasePaymentHistoryPage.viewDetails('${record.invoice_id}')">
                                    <i class="bi bi-eye"></i> View
                                </button> ` : ''}
                                ${record.balance_amount > 0 && permissions.can_payment_view_purchase_invoices ? `
                                    <button class="btn btn-sm btn-success add-payment" 
                                        data-invoice='${JSON.stringify({
                        id: record.invoice_id,
                        invoice_number: record.invoice_number,
                        supplier_name: record.supplier_name,
                        balance_amount: record.balance_amount
                    })}'>
                                        <i class="bi bi-cash"></i> Pay
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });
            }

            $('#paymentHistoryList').html(html);
        },

        getStatusBadge: function (status) {
            const badges = {
                'PAID': '<span class="badge bg-success">Fully Paid</span>',
                'PARTIAL': '<span class="badge bg-warning">Partially Paid</span>',
                'PENDING': '<span class="badge bg-danger">Pending</span>',
                'OVERDUE': '<span class="badge bg-dark">Overdue</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },

        showPaymentModal: function (invoiceData) {
            const self = this;

            // Load payment modes if not already loaded
            if ($('#paymentMode option').length <= 1) {
                this.loadPaymentModes();
            }

            const currencySymbol = TempleCore.getCurrency();
            const balanceAmount = parseFloat(invoiceData.balance_amount) || 0;

            // Reset form
            $('#paymentForm')[0].reset();
            $('#bankDetails').hide();
            $('#paymentSummary').hide();

            // Set invoice details
            $('#paymentInvoiceId').val(invoiceData.id);
            $('#modalInvoiceNumber').text(invoiceData.invoice_number);
            $('#modalSupplierName').text(invoiceData.supplier_name || 'N/A');
            $('#modalBalanceAmount').text(`${currencySymbol}${balanceAmount.toFixed(2)}`);

            // Set payment date to today
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);

            // Set payment amount and max
            $('#paymentAmount').val(balanceAmount.toFixed(2));
            $('#paymentAmount').attr('max', balanceAmount);
            $('#paymentAmount').attr('data-balance', balanceAmount);

            // Show modal
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

            // Additional validation for amount
            const amount = parseFloat($('#paymentAmount').val());
            const maxAmount = parseFloat($('#paymentAmount').attr('max'));

            if (amount <= 0) {
                TempleCore.showToast('Payment amount must be greater than 0', 'error');
                return;
            }

            if (amount > maxAmount) {
                TempleCore.showToast('Payment amount cannot exceed balance amount', 'error');
                return;
            }

            const invoiceId = $('#paymentInvoiceId').val();
            const paymentData = {
                payment_date: $('#paymentDate').val(),
                payment_mode_id: $('#paymentMode').val(),
                amount: amount,
                reference_number: $('#referenceNumber').val(),
                bank_name: $('#bankName').val(),
                bank_branch: $('#bankBranch').val(),
                cheque_date: $('#chequeDate').val(),
                cheque_number: $('#chequeNumber').val(),
                notes: $('#paymentNotes').val()
            };

            // Show loading state on button
            const $saveBtn = $('#btnSavePayment');
            const originalText = $saveBtn.html();
            $saveBtn.html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...').prop('disabled', true);

            TempleAPI.post('/purchase/invoices/' + invoiceId + '/payment', paymentData)
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                        TempleCore.showToast('Payment recorded successfully', 'success');

                        // Reload the payment history to show updated status
                        self.loadData();

                        // Optional: Show payment receipt/details
                        if (response.data && response.data.payment_id) {
                            self.showPaymentReceipt(response.data.payment_id);
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to record payment', 'error');
                    }
                })
                .fail(function (xhr) {
                    const errorMsg = xhr.responseJSON?.message || 'Failed to process payment';
                    TempleCore.showToast(errorMsg, 'error');
                })
                .always(function () {
                    $saveBtn.html(originalText).prop('disabled', false);
                });
        },

        updatePaymentSummary: function () {
            const currencySymbol = TempleCore.getCurrency();
            const paymentAmount = parseFloat($('#paymentAmount').val()) || 0;
            const balanceAmount = parseFloat($('#paymentAmount').attr('data-balance')) || 0;

            if (paymentAmount > 0) {
                const remaining = balanceAmount - paymentAmount;
                $('#summaryPayingAmount').text(`${currencySymbol}${paymentAmount.toFixed(2)}`);
                $('#summaryRemainingBalance').text(`${currencySymbol}${remaining.toFixed(2)}`);
                $('#paymentSummary').show();
            } else {
                $('#paymentSummary').hide();
            }
        },

        showPaymentReceipt: function (paymentId) {
            // Optional: Show payment receipt in a new window or download PDF
            if (confirm('Payment recorded successfully. Would you like to print the receipt?')) {
                window.open('/purchase/payments/' + paymentId + '/receipt', '_blank');
            }
        },

        viewDetails: function (invoiceId) {
            const self = this;

            TempleAPI.get('/purchase/invoices/' + invoiceId + '/payments')
                .done(function (response) {
                    if (response.success) {
                        self.renderDetailsModal(response.data);
                    } else {
                        TempleCore.showToast('Failed to load payment details', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Error loading payment details', 'error');
                });
        },

        renderDetailsModal: function (data) {
            const currency = TempleCore.getCurrency();

            if (!data || !data.length) {
                $('#paymentDetailsContent').html('<p class="text-center">No payment details available</p>');
                $('#paymentDetailsModal').modal('show');
                return;
            }

            // Get invoice info from first payment or passed data
            const firstPayment = data[0];
            const invoiceInfo = firstPayment.invoice || {};
            let html = `
        <div class="invoice-details mb-4">
            <h6>Invoice Information</h6>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Invoice Number:</strong> ${invoiceInfo.invoice_number || 'N/A'}</p>
                    <p><strong>Supplier:</strong> ${firstPayment.supplier_name || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Total Amount:</strong> ${currency}${parseFloat(invoiceInfo.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p><strong>Paid Amount:</strong> ${currency}${parseFloat(invoiceInfo.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p><strong>Balance:</strong> ${currency}${parseFloat(invoiceInfo.balance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
        </div>
        
        <h6>Payment History</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Payment #</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Reference</th>
                    
                        <th>Approved By</th>
                            <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

            $.each(data, function (i, payment) {
                // Handle payment mode properly
                const paymentModeName = payment.payment_mode?.name ||
                    payment.paymentMode?.name ||
                    'Cash';

                // Format approval info
                let approvalInfo = '-';
                if (payment.approver_name && payment.approval_time) {
                    approvalInfo = `${payment.approver_name}<br><small class="text-muted">${payment.approval_time}</small>`;
                } else if (payment.approval_required && payment.status === 'PENDING') {
                    approvalInfo = '<small class="text-warning">Pending Approval</small>';
                }

                html += `
            <tr class="">
                <td>${payment.payment_number || 'N/A'}</td>
                <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}</td>
                <td>${currency}${parseFloat(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>${paymentModeName}</td>
                <td>${payment.reference_number || '-'}</td>
               
                <td>${approvalInfo}</td>
                 <td><span class="badge bg-${payment.status === 'COMPLETED' ? 'success' : payment.status === 'PENDING' ? 'warning' : 'secondary'}">${payment.status || 'Unknown'}</span></td>
            </tr>
        `;
            });

            html += '</tbody></table></div>';

            $('#paymentDetailsContent').html(html);
            $('#paymentDetailsModal').modal('show');
        },


        printDetails: function () {
            const self = this;

            // First check if modal is open and has content
            const modal = $('#paymentDetailsModal');
            if (!modal.hasClass('show')) {
                TempleCore.showToast('Please open payment details first', 'warning');
                return;
            }

            // Check if modal content is loaded
            const modalContent = $('#paymentDetailsContent');
            const htmlContent = modalContent.html();

            if (!htmlContent || htmlContent.includes('spinner-border') || htmlContent.trim() === '') {
                TempleCore.showToast('Please wait for payment details to load', 'warning');
                return;
            }

            if (htmlContent.includes('No payment details')) {
                TempleCore.showToast('No payment details to print', 'warning');
                return;
            }

            // Show loading
            TempleCore.showLoading(true);

            // Load temple settings from API then print
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function (response) {
                    let templeSettings = {};

                    if (response.success && response.data && response.data.values) {
                        templeSettings = response.data.values;
                    } else {
                        // Fallback to localStorage if API fails
                        const storedSettings = localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE);
                        if (storedSettings) {
                            templeSettings = JSON.parse(storedSettings);
                        }
                    }

                    // Open print window with settings
                    self.openPaymentPrintWindow(templeSettings);
                })
                .fail(function () {
                    // Fallback to localStorage if API fails completely
                    const storedSettings = localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}';
                    const templeSettings = JSON.parse(storedSettings);
                    self.openPaymentPrintWindow(templeSettings);
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        openPaymentPrintWindow: function (temple) {
            const self = this;

            // Extract data from modal before opening print window
            const printData = self.extractPaymentData();

            if (!printData || printData.payments.length === 0) {
                TempleCore.showToast('Unable to extract payment data', 'error');
                return;
            }

            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                TempleCore.showToast('Please allow pop-ups to print', 'warning');
                return;
            }

            const html = self.generatePaymentPrintHTML(temple, printData);

            printWindow.document.write(html);
            printWindow.document.close();

            // Auto print after a short delay
            setTimeout(() => {
                printWindow.print();
            }, 500);
        },

        extractPaymentData: function () {
            const currency = TempleCore.getCurrency();
            const data = {
                invoice: {
                    invoice_number: '',
                    supplier_name: '',
                    total_amount: 0,
                    paid_amount: 0,
                    balance_amount: 0
                },
                payments: []
            };

            // Get the modal content element
            const modalContent = document.getElementById('paymentDetailsContent');
            if (!modalContent) return data;

            // Method 1: Try to extract from invoice-details div
            const invoiceDetailsDiv = modalContent.querySelector('.invoice-details');
            if (invoiceDetailsDiv) {
                // Extract from all paragraphs in the invoice details section
                const allText = invoiceDetailsDiv.innerText || invoiceDetailsDiv.textContent;

                // Parse invoice number
                const invoiceMatch = allText.match(/Invoice Number:\s*([^\n]+)/i);
                if (invoiceMatch) data.invoice.invoice_number = invoiceMatch[1].trim();

                // Parse supplier
                const supplierMatch = allText.match(/Supplier:\s*([^\n]+)/i);
                if (supplierMatch) data.invoice.supplier_name = supplierMatch[1].trim();

                // Parse total amount - more flexible regex
                const totalMatch = allText.match(/Total Amount:\s*[^\d]*([0-9,]+\.?\d*)/i);
                if (totalMatch) data.invoice.total_amount = parseFloat(totalMatch[1].replace(/,/g, ''));

                // Parse paid amount
                const paidMatch = allText.match(/Paid Amount:\s*[^\d]*([0-9,]+\.?\d*)/i);
                if (paidMatch) data.invoice.paid_amount = parseFloat(paidMatch[1].replace(/,/g, ''));

                // Parse balance
                const balanceMatch = allText.match(/Balance:\s*[^\d]*([0-9,]+\.?\d*)/i);
                if (balanceMatch) data.invoice.balance_amount = parseFloat(balanceMatch[1].replace(/,/g, ''));
            }

            // Method 2: If no invoice-details div, try extracting from raw HTML
            if (!data.invoice.invoice_number) {
                const htmlContent = modalContent.innerHTML;

                // Try to extract from raw HTML patterns
                if (htmlContent.includes('Invoice Information') || htmlContent.includes('Invoice Number')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = htmlContent;

                    // Look for strong or b tags that might contain the invoice info
                    const strongs = tempDiv.querySelectorAll('strong, b');
                    strongs.forEach(strong => {
                        const text = strong.textContent;
                        const nextText = strong.nextSibling ? strong.nextSibling.textContent : '';

                        if (text.includes('Invoice Number')) {
                            data.invoice.invoice_number = nextText.trim().replace(':', '').trim();
                        }
                        if (text.includes('Supplier')) {
                            data.invoice.supplier_name = nextText.trim().replace(':', '').trim();
                        }
                    });
                }
            }

            // Extract payment records from the table
            const tables = modalContent.querySelectorAll('table');
            tables.forEach(table => {
                const tbody = table.querySelector('tbody');
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');

                        // Check if this row has the expected number of columns (7-8)
                        if (cells.length >= 7 && !row.textContent.includes('No payment')) {
                            const paymentData = {
                                payment_number: cells[0].textContent.trim(),
                                date: cells[1].textContent.trim(),
                                amount: cells[2].textContent.trim(),
                                mode: cells[3].textContent.trim(),
                                reference: cells[4].textContent.trim(),
                                approved_by: '-',
                                status: 'COMPLETED'
                            };

                            // Handle approved_by - might have HTML content
                            if (cells[5]) {
                                paymentData.approved_by = cells[5].innerHTML.trim();
                            }

                            // Handle status - might be in a span
                            if (cells[6]) {
                                const statusSpan = cells[6].querySelector('span');
                                if (statusSpan) {
                                    paymentData.status = statusSpan.textContent.trim();
                                } else {
                                    paymentData.status = cells[6].textContent.trim();
                                }
                            }

                            // Only add if we have valid payment data
                            if (paymentData.payment_number && paymentData.payment_number !== '-') {
                                data.payments.push(paymentData);
                            }
                        }
                    });
                }
            });

            // Debug: Log what we extracted
            console.log('Extracted payment data:', data);

            return data;
        },

        // Update the generatePaymentPrintHTML function in your payment-history.js file:

        generatePaymentPrintHTML: function (temple, printData) {
            const currency = TempleCore.getCurrency();
            const invoiceInfo = printData.invoice;
            const paymentRecords = printData.payments;

            // Format current date
            const currentDate = new Date();
            const formatDate = (date) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${date.getDate().toString().padStart(2, '0')}/${months[date.getMonth()]}/${date.getFullYear()}`;
            };

            // Handle logo
            let logoHTML = '';
            if (temple && temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
            <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
            </div>
        `;
            }

            // Generate payment records HTML
            let paymentRecordsHTML = '';
            let recordNo = 1;

            if (paymentRecords && paymentRecords.length > 0) {
                paymentRecords.forEach(record => {
                    // Clean up the amount - remove currency symbols
                    const cleanAmount = record.amount.toString().replace(/[^0-9.,]/g, '');

                    // Format approved_by - handle HTML content
                    let approvedByText = record.approved_by || '-';
                    if (approvedByText.includes('<br')) {
                        // Keep line breaks but clean up the HTML
                        approvedByText = approvedByText.replace(/<br\s*\/?>/gi, '<br>');
                    } else if (approvedByText.includes('Pending')) {
                        approvedByText = '<small style="color:#666;">Pending Approval</small>';
                    }

                    // All status badges will be black
                    const statusColor = '#000000'; // Always black

                    paymentRecordsHTML += `
                <tr style="height:35px;">
                    <td align="center" style="padding:5px;font-size:13px;">${recordNo++}</td>
                    <td align="center" style="padding:5px;font-size:13px;">${record.payment_number}</td>
                    <td align="center" style="padding:5px;font-size:13px;">${record.date}</td>
                    <td align="right" style="padding:5px;font-size:13px;">${currency}${cleanAmount}</td>
                    <td align="center" style="padding:5px;font-size:13px;">${record.mode}</td>
                    <td align="center" style="padding:5px;font-size:13px;">${record.reference || '-'}</td>
                    <td align="center" style="padding:5px;font-size:12px;">${approvedByText}</td>
                    <td align="center" style="padding:5px;font-size:13px;">
                        
                            ${record.status}
                     
                    </td>
                </tr>
            `;
                });
            } else {
                paymentRecordsHTML = '<tr><td colspan="8" align="center" style="padding: 20px;">No payment records found</td></tr>';
            }

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Details - ${invoiceInfo.invoice_number || 'N/A'}</title>
            <style>
                @media print {
                    #backButton, #printButton {
                        display: none !important;
                    }
                    body {
                        margin: 0;
                        padding: 10px;
                    }
                    @page {
                        margin: 15mm;
                    }
                }
                
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    line-height: 1.4;
                    color: #333;
                }
                
                .btn {
                    display: inline-block;
                    padding: 8px 16px;
                    margin: 0 5px;
                    font-size: 14px;
                    font-weight: 400;
                    text-align: center;
                    white-space: nowrap;
                    vertical-align: middle;
                    cursor: pointer;
                    border: 1px solid transparent;
                    border-radius: 4px;
                    text-decoration: none;
                }
                
                .btn-primary {
                    color: #fff;
                    background-color: #337ab7;
                    border-color: #2e6da4;
                }
                
                .btn-info {
                    color: #fff;
                    background-color: #5bc0de;
                    border-color: #46b8da;
                }
                
                .btn:hover {
                    opacity: 0.9;
                }
                
                table { 
                    page-break-inside: auto;
                    border-collapse: collapse;
                }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                
                @media screen {
                    body {
                        max-width: 900px;
                        margin: 0 auto;
                    }
                }
            </style>
        </head>
        <body>
            <!-- Control Buttons -->
            <table width="850" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                <tr>
                    <td width="650"></td>
                    <td width="100" style="text-align: right;">
                        <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                    </td>
                    <td width="100" style="text-align: right;">
                        <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
                    </td>
                </tr>
            </table>
            
            <!-- Header -->
            <table width="850" border="0" align="center">
                <tr>
                    <td width="120" valign="top">
                        ${logoHTML}
                    </td>
                    <td width="680" align="left" style="font-size:13px; padding-left: 20px;">
                        <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                        <br>${temple.temple_address || temple.address || 'Temple Address'}
                        <br>${(temple.temple_city || temple.city || '') + (temple.temple_city || temple.city ? ', ' : '')}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                        <br>${temple.temple_country || temple.country || 'Malaysia'}
                        ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                        ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                    </td>
                    <td width="50"></td>
                </tr>
            </table>
            
            <!-- Title -->
            <table width="850" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                <tr>
                    <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                        Payment Details
                    </td>
                </tr>
            </table>
            
            <!-- Invoice Summary -->
            <table width="850" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                <tr style="font-size:14px;">
                    <td width="150"><b>Invoice Number:</b></td>
                    <td width="300">${invoiceInfo.invoice_number || 'N/A'}</td>
                    <td width="150"><b>Print Date:</b></td>
                    <td width="250">${formatDate(currentDate)}</td>
                </tr>
                <tr style="font-size:14px;">
                    <td><b>Supplier:</b></td>
                    <td colspan="3"><b>${invoiceInfo.supplier_name || 'N/A'}</b></td>
                </tr>
                <tr style="font-size:14px;">
                    <td><b>Total Invoice:</b></td>
                    <td>${currency}${(invoiceInfo.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><b>Total Paid:</b></td>
                    <td>${currency}${(invoiceInfo.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr style="font-size:14px;">
                    <td><b>Outstanding:</b></td>
                    <td colspan="3" style="color:${invoiceInfo.balance_amount > 0 ? '#000000' : '#000000'};font-weight:bold;font-size:16px;">
                        ${currency}${(invoiceInfo.balance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
            </table>
            
            <!-- Payment Records Table -->
            <table width="850" align="center" style="margin-top:30px; border-collapse:collapse;">
                <thead>
                    <tr style="font-size: 14px;">   
                        <td width="50" height="35" align="center" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;"><b>S.No</b></td>
                        <td width="120" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Payment #</b></td>
                        <td width="100" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Date</b></td>
                        <td width="120" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Amount (${currency})</b></td>
                        <td width="100" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Mode</b></td>
                        <td width="120" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Reference</b></td>
                        <td width="140" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Approved By</b></td>
                        <td width="100" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;background:#f8f9fa;" align="center"><b>Status</b></td>
                    </tr>
                </thead>
                <tbody>
                    ${paymentRecordsHTML}
                </tbody>
            </table>
            
            <!-- Footer Summary -->
            <table width="850" align="center" style="margin-top:30px; border-top:2px solid black; padding-top:15px;">
                <tr style="font-size: 14px;">
                    <td align="right" width="700"><b>Total Payments Made:</b></td>
                    <td align="right" width="150" style="padding:8px;font-size:16px;font-weight:bold;">
                        ${currency}${(invoiceInfo.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
                ${invoiceInfo.balance_amount > 0 ? `
                <tr style="font-size: 14px;">
                    <td align="right"><b>Remaining Balance:</b></td>
                    <td align="right" style="padding:8px;font-size:16px;font-weight:bold;">
                        ${currency}${(invoiceInfo.balance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
                ` : ''}
            </table>
            
        </body>
        </html>
    `;

            return html;
        }
    };

})(jQuery, window);