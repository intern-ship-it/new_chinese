// js/pages/purchase/invoices/payment.js
// Standalone payment processing page for purchase invoices

(function ($, window) {
    'use strict';

    window.InvoicePaymentPage = {
        currentInvoiceId: null,
        currentInvoice: null,
        paymentModes: [],

        init: function (params) {
            // Can be initialized with invoice ID or show list of pending invoices
            this.currentInvoiceId = params?.id || null;

            if (this.currentInvoiceId) {
                this.renderSinglePayment();
                this.loadInvoice();
            } else {
                this.renderBulkPayment();
                this.loadPendingInvoices();
            }

            this.loadPaymentModes();
            this.bindEvents();
        },

        renderSinglePayment: function () {
            const currencySymbol = TempleCore.getCurrency();
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Process Payment</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/invoices'); return false;">Invoices</a></li>
                                    <li class="breadcrumb-item active">Payment</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" onclick="TempleRouter.navigate('purchase/invoices'); return false;">
                                <i class="bi bi-arrow-left"></i> Back to Invoices
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading State -->
                    <div id="paymentLoading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- Payment Content -->
                    <div id="paymentContent" style="display: none;">
                        <div class="row">
                            <!-- Invoice Details -->
                            <div class="col-md-5">
                                <div class="card mb-4">
                                    <div class="card-header bg-info text-white">
                                        <h6 class="mb-0">Invoice Details</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-sm">
                                            <tr>
                                                <td>Invoice Number:</td>
                                                <td class="fw-bold" id="invoiceNumber">-</td>
                                            </tr>
                                            <tr>
                                                <td>Supplier:</td>
                                                <td id="supplierName">-</td>
                                            </tr>
                                            <tr>
                                                <td>Invoice Date:</td>
                                                <td id="invoiceDate">-</td>
                                            </tr>
                                            <tr>
                                                <td>Due Date:</td>
                                                <td id="dueDate">-</td>
                                            </tr>
                                            <tr class="table-light">
                                                <td>Total Amount:</td>
                                                <td class="fw-bold" id="totalAmount">0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Paid Amount:</td>
                                                <td class="text-success" id="paidAmount">0.00</td>
                                            </tr>
                                            <tr class="table-warning">
                                                <td>Balance Due:</td>
                                                <td class="fw-bold text-danger" id="balanceAmount">0.00</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                
                                <!-- Previous Payments -->
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Payment History</h6>
                                    </div>
                                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                                        <div id="paymentHistoryList">
                                            <p class="text-muted text-center">No payments recorded</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Payment Form -->
                            <div class="col-md-7">
                                <div class="card">
                                    <div class="card-header bg-primary text-white">
                                        <h6 class="mb-0">New Payment</h6>
                                    </div>
                                    <div class="card-body">
                                        <form id="paymentForm">
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
                                                    <div class="input-group">
                                                        <span class="input-group-text" id="currencySymbol">${currencySymbol}</span>
                                                        <input type="number" class="form-control" id="paymentAmount" step="0.01" min="0.01" required>
                                                        <button class="btn btn-outline-secondary" type="button" id="btnPayFull">
                                                            Pay Full
                                                        </button>
                                                    </div>
                                                    <small class="text-muted">Maximum: <span id="maxAmount">0.00</span></small>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Reference Number</label>
                                                    <input type="text" class="form-control" id="referenceNumber" placeholder="Cheque/Transaction #">
                                                </div>
                                            </div>
                                            
                                            <!-- Bank Details Section -->
                                            <div id="bankDetailsSection" style="display: none;">
                                                <h6 class="text-muted mb-3">Bank Details</h6>
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
                                                    <div class="col-md-6">
                                                        <label class="form-label">Cheque Number</label>
                                                        <input type="text" class="form-control" id="chequeNumber">
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Online Payment Details -->
                                            <div id="onlineDetailsSection" style="display: none;">
                                                <h6 class="text-muted mb-3">Online Transaction Details</h6>
                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <label class="form-label">Transaction ID</label>
                                                        <input type="text" class="form-control" id="transactionId">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label">Payment Gateway</label>
                                                        <input type="text" class="form-control" id="paymentGateway" placeholder="e.g., PayPal, Stripe">
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Notes</label>
                                                <textarea class="form-control" id="paymentNotes" rows="3"></textarea>
                                            </div>
                                            
                                            <!-- Payment Summary -->
                                            <div class="alert alert-info">
                                                <h6>Payment Summary</h6>
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <small>Payment Amount:</small><br>
                                                        <strong id="summaryAmount">0.00</strong>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <small>Remaining Balance:</small><br>
                                                        <strong id="summaryRemaining">0.00</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="text-end">
                                                <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('purchase/invoices'); return false;">
                                                    Cancel
                                                </button>
                                                <button type="submit" class="btn btn-success" id="btnProcessPayment">
                                                    <i class="bi bi-check-circle"></i> Process Payment
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        renderBulkPayment: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Bulk Payment Processing</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Bulk Payment</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-info" id="btnSupplierStatement">
                                <i class="bi bi-file-text"></i> Supplier Statement
                            </button>
                            <button class="btn btn-primary" id="btnProcessSelected">
                                <i class="bi bi-cash-stack"></i> Process Selected
                            </button>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="filterSupplier">
                                        <option value="">All Suppliers</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="UNPAID">Unpaid</option>
                                        <option value="PARTIAL">Partially Paid</option>
                                        <option value="OVERDUE">Overdue</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Due Date Range</label>
                                    <input type="date" class="form-control" id="filterDueDate">
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-primary me-2" id="btnApplyFilter">
                                        <i class="bi bi-funnel"></i> Filter
                                    </button>
                                    <button class="btn btn-secondary" id="btnResetFilter">
                                        <i class="bi bi-arrow-clockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card border-danger">
                                <div class="card-body">
                                    <h6 class="text-danger">Overdue</h6>
                                    <h4 id="overdueAmount">0.00</h4>
                                    <small><span id="overdueCount">0</span> invoices</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <h6 class="text-warning">Due This Week</h6>
                                    <h4 id="dueWeekAmount">0.00</h4>
                                    <small><span id="dueWeekCount">0</span> invoices</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-info">
                                <div class="card-body">
                                    <h6 class="text-info">Due This Month</h6>
                                    <h4 id="dueMonthAmount">0.00</h4>
                                    <small><span id="dueMonthCount">0</span> invoices</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-success">
                                <div class="card-body">
                                    <h6 class="text-success">Total Outstanding</h6>
                                    <h4 id="totalOutstanding">0.00</h4>
                                    <small><span id="totalCount">0</span> invoices</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pending Invoices Table -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Pending Invoices</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>
                                                <input type="checkbox" class="form-check-input" id="selectAll">
                                            </th>
                                            <th>Invoice #</th>
                                            <th>Date</th>
                                            <th>Supplier</th>
                                            <th>Due Date</th>
                                            <th class="text-end">Total</th>
                                            <th class="text-end">Paid</th>
                                            <th class="text-end">Balance</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="invoicesTableBody">
                                        <tr>
                                            <td colspan="10" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-light">
                                            <th colspan="5">Selected Total:</th>
                                            <th class="text-end" id="selectedTotal">0.00</th>
                                            <th class="text-end" id="selectedPaid">0.00</th>
                                            <th class="text-end" id="selectedBalance">0.00</th>
                                            <th colspan="2"></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Bulk Payment Modal -->
                <div class="modal fade" id="bulkPaymentModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">Process Bulk Payment</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    <strong>Selected Invoices:</strong> <span id="modalSelectedCount">0</span><br>
                                    <strong>Total Amount:</strong> <span id="modalTotalAmount">0.00</span>
                                </div>
                                
                                <form id="bulkPaymentForm">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="bulkPaymentDate" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                            <select class="form-select" id="bulkPaymentMode" required>
                                                <option value="">Select Mode</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Payment Distribution</label>
                                        <div id="paymentDistribution"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="bulkPaymentNotes" rows="2"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="btnProcessBulkPayment">
                                    <i class="bi bi-check-circle"></i> Process Payments
                                </button>
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
                        self.displayInvoiceDetails();
                        self.loadPaymentHistory();
                        $('#paymentLoading').hide();
                        $('#paymentContent').show();
                    } else {
                        TempleCore.showToast('Failed to load invoice', 'error');
                        TempleRouter.navigate('purchase/invoices');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load invoice', 'error');
                    TempleRouter.navigate('purchase/invoices');
                });
        },

        displayInvoiceDetails: function () {
            const invoice = this.currentInvoice;
            const currency = TempleCore.formatCurrency(0).split('0')[0];

            $('#invoiceNumber').text(invoice.invoice_number);
            $('#supplierName').text(invoice.supplier?.name || '-');
            $('#invoiceDate').text(TempleCore.formatDate(invoice.invoice_date));
            $('#dueDate').text(invoice.payment_due_date ? TempleCore.formatDate(invoice.payment_due_date) : '-');

            $('#totalAmount').text(currency + parseFloat(invoice.total_amount).toFixed(2));
            $('#paidAmount').text(currency + parseFloat(invoice.paid_amount || 0).toFixed(2));
            $('#balanceAmount').text(currency + parseFloat(invoice.balance_amount || 0).toFixed(2));

            // Set payment defaults
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);
            $('#paymentAmount').val(invoice.balance_amount);
            $('#paymentAmount').attr('max', invoice.balance_amount);
            $('#maxAmount').text(currency + parseFloat(invoice.balance_amount).toFixed(2));
            $('#currencySymbol').text(currency);

            this.updatePaymentSummary();
        },

        loadPaymentHistory: function () {
            const self = this;

            TempleAPI.get('/purchase/invoices/' + this.currentInvoiceId + '/payments')
                .done(function (response) {
                    if (response.success && response.data.length > 0) {
                        self.displayPaymentHistory(response.data);
                    }
                });
        },

        displayPaymentHistory: function (payments) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';

            $.each(payments, function (index, payment) {
                const statusBadge = payment.status === 'COMPLETED' ?
                    '<span class="badge bg-success">?</span>' :
                    '<span class="badge bg-warning">?</span>';

                html += `
                    <div class="payment-history-item mb-2 p-2 border-start border-3 border-primary">
                        <div class="d-flex justify-content-between">
                            <div>
                                <small class="text-muted">${TempleCore.formatDate(payment.payment_date)}</small><br>
                                <strong>${currency}${payment.amount}</strong> via ${payment.payment_mode?.name || 'Unknown'}
                                ${payment.reference_number ? `<br><small>Ref: ${payment.reference_number}</small>` : ''}
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                `;
            });

            $('#paymentHistoryList').html(html);
        },

        loadPendingInvoices: function () {
            const self = this;

            TempleAPI.get('/purchase/invoices/pending')
                .done(function (response) {
                    if (response.success) {
                        self.displayPendingInvoices(response.data);
                        self.updateSummaryCards(response.summary);
                    }
                });
        },

        displayPendingInvoices: function (invoices) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';

            if (invoices.length === 0) {
                html = '<tr><td colspan="10" class="text-center">No pending invoices found</td></tr>';
            } else {
                $.each(invoices, function (index, invoice) {
                    const isOverdue = new Date(invoice.payment_due_date) < new Date();
                    const rowClass = isOverdue ? 'table-danger' : '';

                    html += `
                        <tr class="${rowClass}">
                            <td>
                                <input type="checkbox" class="form-check-input invoice-select" 
                                    value="${invoice.id}" data-balance="${invoice.balance_amount}">
                            </td>
                            <td>${invoice.invoice_number}</td>
                            <td>${TempleCore.formatDate(invoice.invoice_date)}</td>
                            <td>${invoice.supplier?.name || '-'}</td>
                            <td>${TempleCore.formatDate(invoice.payment_due_date)}</td>
                            <td class="text-end">${currency}${invoice.total_amount}</td>
                            <td class="text-end">${currency}${invoice.paid_amount || 0}</td>
                            <td class="text-end">${currency}${invoice.balance_amount}</td>
                            <td>
                                ${isOverdue ? '<span class="badge bg-danger">Overdue</span>' :
                            invoice.payment_status === 'PARTIAL' ? '<span class="badge bg-warning">Partial</span>' :
                                '<span class="badge bg-secondary">Unpaid</span>'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="InvoicePaymentPage.payInvoice('${invoice.id}')">
                                    <i class="bi bi-cash"></i> Pay
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#invoicesTableBody').html(html);
        },

        updateSummaryCards: function (summary) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];

            $('#overdueAmount').text(currency + (summary?.overdue_amount || 0).toFixed(2));
            $('#overdueCount').text(summary?.overdue_count || 0);

            $('#dueWeekAmount').text(currency + (summary?.due_week_amount || 0).toFixed(2));
            $('#dueWeekCount').text(summary?.due_week_count || 0);

            $('#dueMonthAmount').text(currency + (summary?.due_month_amount || 0).toFixed(2));
            $('#dueMonthCount').text(summary?.due_month_count || 0);

            $('#totalOutstanding').text(currency + (summary?.total_outstanding || 0).toFixed(2));
            $('#totalCount').text(summary?.total_count || 0);
        },

// Fixed loadPaymentModes function to handle paginated API response
// This should be updated in both payment.js and view.js files

loadPaymentModes: function() {
    const self = this;
    
    TempleAPI.get('/masters/payment-modes')
        .done(function(response) {
            if (response.success) {
                let options = '<option value="">Select Mode</option>';
                let hasActiveMode = false;
                
                // Handle paginated response structure
                // The API returns data in response.data.data for paginated results
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
                $.each(modes, function(index, mode) {
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
        .fail(function(xhr) {
            console.error('Payment modes API error:', xhr);
            TempleCore.showToast('Failed to load payment modes. Please refresh the page.', 'error');
        });
},


        bindEvents: function () {
            const self = this;

            // Payment form submission
            $('#paymentForm').on('submit', function (e) {
                e.preventDefault();
                self.processPayment();
            });

            // Pay full amount button
            $('#btnPayFull').on('click', function () {
                $('#paymentAmount').val(self.currentInvoice.balance_amount);
                self.updatePaymentSummary();
            });

            // Payment amount change
            $('#paymentAmount').on('input', function () {
                self.validatePaymentAmount();
                self.updatePaymentSummary();
            });

            // Payment mode change
            $('#paymentMode').on('change', function () {
                const modeName = $(this).find('option:selected').text().toLowerCase();

                $('#bankDetailsSection, #onlineDetailsSection').hide();

                if (modeName.includes('cheque') || modeName.includes('bank')) {
                    $('#bankDetailsSection').show();
                } else if (modeName.includes('online') || modeName.includes('transfer')) {
                    $('#onlineDetailsSection').show();
                }
            });

            // Bulk payment events
            $('#selectAll').on('change', function () {
                $('.invoice-select').prop('checked', this.checked);
                self.updateSelectedTotals();
            });

            $(document).on('change', '.invoice-select', function () {
                self.updateSelectedTotals();
            });

            $('#btnProcessSelected').on('click', function () {
                self.showBulkPaymentModal();
            });

            $('#btnProcessBulkPayment').on('click', function () {
                self.processBulkPayment();
            });
        },

        validatePaymentAmount: function () {
            const amount = parseFloat($('#paymentAmount').val());
            const maxAmount = parseFloat(this.currentInvoice.balance_amount);

            if (amount > maxAmount) {
                $('#paymentAmount').val(maxAmount);
                TempleCore.showToast('Amount cannot exceed balance', 'warning');
            }
        },

        updatePaymentSummary: function () {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            const amount = parseFloat($('#paymentAmount').val() || 0);
            const balance = parseFloat(this.currentInvoice?.balance_amount || 0);
            const remaining = balance - amount;

            $('#summaryAmount').text(currency + amount.toFixed(2));
            $('#summaryRemaining').text(currency + remaining.toFixed(2));

            if (remaining < 0) {
                $('#summaryRemaining').addClass('text-danger');
            } else {
                $('#summaryRemaining').removeClass('text-danger');
            }
        },

        processPayment: function () {
            const self = this;

            if (!$('#paymentForm')[0].checkValidity()) {
                $('#paymentForm')[0].reportValidity();
                return;
            }

            const paymentData = {
                invoice_id: this.currentInvoiceId,
                payment_date: $('#paymentDate').val(),
                payment_mode_id: $('#paymentMode').val(),
                amount: $('#paymentAmount').val(),
                reference_number: $('#referenceNumber').val() || $('#chequeNumber').val() || $('#transactionId').val(),
                bank_name: $('#bankName').val(),
                bank_branch: $('#bankBranch').val(),
                cheque_date: $('#chequeDate').val(),
                payment_gateway: $('#paymentGateway').val(),
                notes: $('#paymentNotes').val()
            };

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/invoices/' + this.currentInvoiceId + '/payments', paymentData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Payment processed successfully', 'success');

                        // Redirect based on remaining balance
                        if (parseFloat(response.data.remaining_balance) > 0) {
                            // Reload page for another payment
                            self.loadInvoice();
                        } else {
                            // Invoice fully paid, go to invoice view
                            TempleRouter.navigate('purchase/invoices/view', { id: self.currentInvoiceId });
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Payment failed', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to process payment', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        payInvoice: function (invoiceId) {
            TempleRouter.navigate('purchase/invoices/payment', { id: invoiceId });
        },

        updateSelectedTotals: function () {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let totalBalance = 0;
            let count = 0;

            $('.invoice-select:checked').each(function () {
                totalBalance += parseFloat($(this).data('balance'));
                count++;
            });

            $('#selectedBalance').text(currency + totalBalance.toFixed(2));
        },

        showBulkPaymentModal: function () {
            const selected = $('.invoice-select:checked');

            if (selected.length === 0) {
                TempleCore.showToast('Please select at least one invoice', 'warning');
                return;
            }

            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let totalAmount = 0;
            let distributionHtml = '';

            selected.each(function () {
                const balance = parseFloat($(this).data('balance'));
                totalAmount += balance;

                const invoiceNumber = $(this).closest('tr').find('td:eq(1)').text();
                distributionHtml += `
                    <div class="mb-2">
                        <label>${invoiceNumber}</label>
                        <input type="number" class="form-control" value="${balance}" 
                            data-invoice="${$(this).val()}" data-max="${balance}">
                    </div>
                `;
            });

            $('#modalSelectedCount').text(selected.length);
            $('#modalTotalAmount').text(currency + totalAmount.toFixed(2));
            $('#paymentDistribution').html(distributionHtml);
            $('#bulkPaymentDate').val(new Date().toISOString().split('T')[0]);

            const modal = new bootstrap.Modal(document.getElementById('bulkPaymentModal'));
            modal.show();
        },

        processBulkPayment: function () {
            // Implementation for bulk payment processing
            TempleCore.showToast('Bulk payment processing...', 'info');
        },

        loadSuppliers: function () {
            TempleAPI.get('/purchase/suppliers')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Suppliers</option>';
                        $.each(response.data, function (index, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#filterSupplier').html(options);
                    }
                });
        }
    };

})(jQuery, window);