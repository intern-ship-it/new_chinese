// js/pages/purchase/payments/view.js
// View purchase payment details

(function($, window) {
    'use strict';
    
    window.PaymentsViewPage = {
        paymentId: null,
        currentPayment: null,
        
        init: function(params) {
            this.paymentId = params?.id || this.getPaymentIdFromUrl();
            
            if (!this.paymentId) {
                TempleCore.showToast('Payment ID not provided', 'error');
                TempleRouter.navigate('purchase/payments');
                return;
            }
            
            this.render();
            this.loadPayment();
            this.bindEvents();
        },
        
        getPaymentIdFromUrl: function() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">View Payment</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/payments'); return false;">Payments</a></li>
                                    <li class="breadcrumb-item active">View</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-warning" id="btnEditPayment">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-info" id="btnPrintPayment">
                                <i class="bi bi-printer"></i> Print
                            </button>
                            <button class="btn btn-secondary" id="btnEmailPayment">
                                <i class="bi bi-envelope"></i> Email
                            </button>
                            <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/payments'); return false;">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading -->
                    <div id="paymentLoading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- Payment Content -->
                    <div id="paymentContent" style="display: none;">
                        <!-- Status Alert -->
                        <div id="statusAlert" class="alert mb-4">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-0">
                                        <span id="statusBadge" class="badge"></span>
                                        <span id="statusText" class="ms-2"></span>
                                    </h5>
                                </div>
                                <div id="statusActions"></div>
                            </div>
                        </div>
                        
                        <!-- Payment Receipt Card -->
                        <div class="card mb-4" id="paymentReceipt">
                            <div class="card-body">
                                <!-- Header -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <h4 class="text-primary">PAYMENT RECEIPT</h4>
                                        <p class="mb-1"><strong>Receipt #:</strong> <span id="paymentNumber"></span></p>
                                        <p class="mb-1"><strong>Date:</strong> <span id="paymentDate"></span></p>
                                        <p class="mb-0"><strong>Status:</strong> <span id="paymentStatusBadge"></span></p>
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
                                
                                <!-- Payment Details -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <h6 class="text-muted">Paid To:</h6>
                                        <p class="mb-1"><strong id="supplierName"></strong></p>
                                        <p class="mb-1" id="supplierAddress"></p>
                                        <p class="mb-0">Contact: <span id="supplierContact"></span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6 class="text-muted">Payment Details:</h6>
                                        <p class="mb-1"><strong>Mode:</strong> <span id="paymentMode"></span></p>
                                        <p class="mb-1"><strong>Reference:</strong> <span id="referenceNumber">-</span></p>
                                        <p class="mb-0"><strong>Invoice:</strong> <span id="invoiceRef">-</span></p>
                                    </div>
                                </div>
                                
                                <!-- Bank Details (if applicable) -->
                                <div id="bankDetailsSection" class="row mb-4" style="display: none;">
                                    <div class="col-12">
                                        <h6 class="text-muted">Bank/Cheque Details:</h6>
                                        <div class="row">
                                            <div class="col-md-4">
                                                <p class="mb-1"><strong>Bank:</strong> <span id="bankName">-</span></p>
                                            </div>
                                            <div class="col-md-4">
                                                <p class="mb-1"><strong>Branch:</strong> <span id="bankBranch">-</span></p>
                                            </div>
                                            <div class="col-md-4">
                                                <p class="mb-1"><strong>Cheque Date:</strong> <span id="chequeDate">-</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Amount Section -->
                                <div class="bg-light p-4 rounded mb-4">
                                    <div class="row">
                                        <div class="col-md-8">
                                            <h5>Payment Amount:</h5>
                                            <p class="mb-0" id="amountInWords"></p>
                                        </div>
                                        <div class="col-md-4 text-end">
                                            <h3 class="text-success" id="paymentAmount">0.00</h3>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Invoice Details -->
                                <div id="invoiceDetailsSection" class="mb-4">
                                    <h6 class="text-muted mb-3">Invoice Details:</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Invoice #</th>
                                                    <th>Date</th>
                                                    <th class="text-end">Invoice Amount</th>
                                                    <th class="text-end">Previous Payments</th>
                                                    <th class="text-end">This Payment</th>
                                                    <th class="text-end">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody id="invoiceDetailsTable">
                                                <tr>
                                                    <td colspan="6" class="text-center">Loading...</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <!-- Notes -->
                                <div id="notesSection" class="mb-4" style="display: none;">
                                    <h6 class="text-muted">Notes:</h6>
                                    <p id="notes"></p>
                                </div>
                                
                                <!-- Footer -->
                                <div class="row mt-5 pt-3 border-top">
                                    <div class="col-md-6">
                                        <p class="small text-muted mb-0">
                                            <strong>Created By:</strong> <span id="createdBy"></span><br>
                                            <strong>Created At:</strong> <span id="createdAt"></span>
                                        </p>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <p class="small text-muted mb-0">
                                            <strong>Updated By:</strong> <span id="updatedBy"></span><br>
                                            <strong>Updated At:</strong> <span id="updatedAt"></span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action History -->
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Payment History</h6>
                            </div>
                            <div class="card-body">
                                <div id="paymentHistory">
                                    <p class="text-center text-muted">Loading history...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .btn, .breadcrumb, #statusAlert, .card-header { 
                            display: none !important; 
                        }
                        #paymentReceipt {
                            border: none !important;
                            box-shadow: none !important;
                        }
                        .table {
                            border: 1px solid #000;
                        }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        loadPayment: function() {
            const self = this;
            
            TempleAPI.get('/purchase/payments/' + this.paymentId)
                .done(function(response) {
                    if (response.success) {
                        self.currentPayment = response.data;
                        self.displayPayment();
                        self.loadPaymentHistory();
                        $('#paymentLoading').hide();
                        $('#paymentContent').show();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load payment', 'error');
                        TempleRouter.navigate('purchase/payments');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load payment', 'error');
                    TempleRouter.navigate('purchase/payments');
                });
        },
        
        displayPayment: function() {
            const payment = this.currentPayment;
            const temple = TempleCore.getTemple();
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            // Temple Info
            $('#templeName').text(temple.name || 'Temple Management System');
            $('#templeAddress').text(temple.address || '');
            if (temple.logo) {
                $('#templeLogo').attr('src', temple.logo);
            }
            
            // Payment Header
            $('#paymentNumber').text(payment.payment_number);
            $('#paymentDate').text(TempleCore.formatDate(payment.payment_date));
            
            // Status
            this.updateStatusDisplay(payment.status);
            
            // Supplier Details
            $('#supplierName').text(payment.supplier?.name || '-');
            $('#supplierAddress').text(payment.supplier?.address || '-');
            $('#supplierContact').text(payment.supplier?.mobile_no || '-');
            
            // Payment Details
            $('#paymentMode').text(payment.payment_mode?.name || '-');
            $('#referenceNumber').text(payment.reference_number || '-');
            
            // Invoice Reference
            if (payment.invoice_id) {
                $('#invoiceRef').html(`
                    <a href="#" onclick="TempleRouter.navigate('purchase/invoices/view', {id: '${payment.invoice_id}'}); return false;">
                        ${payment.invoice?.invoice_number || '-'}
                    </a>
                `);
            }
            
            // Bank Details
            if (payment.bank_name || payment.cheque_date) {
                $('#bankDetailsSection').show();
                $('#bankName').text(payment.bank_name || '-');
                $('#bankBranch').text(payment.bank_branch || '-');
                $('#chequeDate').text(payment.cheque_date ? TempleCore.formatDate(payment.cheque_date) : '-');
            }
            
            // Amount
            $('#paymentAmount').text(currency + parseFloat(payment.amount).toFixed(2));
            $('#amountInWords').text(this.numberToWords(payment.amount) + ' only');
            
            // Invoice Details
            this.displayInvoiceDetails(payment);
            
            // Notes
            if (payment.notes) {
                $('#notesSection').show();
                $('#notes').text(payment.notes);
            }
            
            // Metadata
            $('#createdBy').text(payment.creator?.name || '-');
            $('#createdAt').text(TempleCore.formatDate(payment.created_at, 'time'));
            $('#updatedBy').text(payment.updater?.name || '-');
            $('#updatedAt').text(TempleCore.formatDate(payment.updated_at, 'time'));
            
            // Update button visibility
            this.updateButtonVisibility(payment.status);
        },
        
        displayInvoiceDetails: function(payment) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            if (payment.invoice) {
                const invoice = payment.invoice;
                const balance = parseFloat(invoice.balance_amount) + parseFloat(payment.amount);
                
                const html = `
                    <tr>
                        <td>${invoice.invoice_number}</td>
                        <td>${TempleCore.formatDate(invoice.invoice_date)}</td>
                        <td class="text-end">${currency}${parseFloat(invoice.total_amount).toFixed(2)}</td>
                        <td class="text-end">${currency}${(parseFloat(invoice.paid_amount) - parseFloat(payment.amount)).toFixed(2)}</td>
                        <td class="text-end">${currency}${parseFloat(payment.amount).toFixed(2)}</td>
                        <td class="text-end">${currency}${parseFloat(invoice.balance_amount).toFixed(2)}</td>
                    </tr>
                `;
                
                $('#invoiceDetailsTable').html(html);
            } else {
                $('#invoiceDetailsSection').hide();
            }
        },
        
        updateStatusDisplay: function(status) {
            const statusConfig = {
                'PENDING': { alert: 'alert-warning', badge: 'bg-warning', text: 'Payment Pending' },
                'COMPLETED': { alert: 'alert-success', badge: 'bg-success', text: 'Payment Completed' },
                'FAILED': { alert: 'alert-danger', badge: 'bg-danger', text: 'Payment Failed' },
                'CANCELLED': { alert: 'alert-secondary', badge: 'bg-secondary', text: 'Payment Cancelled' }
            };
            
            const config = statusConfig[status] || statusConfig['PENDING'];
            
            $('#statusAlert').removeClass().addClass('alert ' + config.alert);
            $('#statusBadge').removeClass().addClass('badge ' + config.badge).text(status);
            $('#statusText').text(config.text);
            $('#paymentStatusBadge').html(`<span class="badge ${config.badge}">${status}</span>`);
            
            // Add status actions
            if (status === 'PENDING') {
                $('#statusActions').html(`
                    <button class="btn btn-sm btn-success" onclick="PaymentsViewPage.completePayment()">
                        <i class="bi bi-check-circle"></i> Mark as Complete
                    </button>
                `);
            }
        },
        
        updateButtonVisibility: function(status) {
            if (status === 'COMPLETED' || status === 'CANCELLED') {
                $('#btnEditPayment').hide();
            }
        },
        
        loadPaymentHistory: function() {
            const self = this;
            
            TempleAPI.get('/purchase/payments/' + this.paymentId + '/history')
                .done(function(response) {
                    if (response.success) {
                        self.displayHistory(response.data);
                    }
                })
                .fail(function() {
                    $('#paymentHistory').html('<p class="text-center text-muted">No history available</p>');
                });
        },
        
        displayHistory: function(history) {
            if (history.length === 0) {
                $('#paymentHistory').html('<p class="text-center text-muted">No history available</p>');
                return;
            }
            
            let html = '<div class="timeline">';
            
            $.each(history, function(index, item) {
                html += `
                    <div class="timeline-item mb-3">
                        <div class="d-flex">
                            <div class="timeline-icon me-3">
                                <i class="bi bi-circle-fill text-${self.getHistoryColor(item.action)}"></i>
                            </div>
                            <div class="flex-grow-1">
                                <p class="mb-0">
                                    <strong>${item.action}</strong> by ${item.user?.name || 'System'}
                                </p>
                                <small class="text-muted">${TempleCore.formatDate(item.created_at, 'time')}</small>
                                ${item.notes ? `<p class="mb-0 mt-1 small">${item.notes}</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            $('#paymentHistory').html(html);
        },
        
        getHistoryColor: function(action) {
            const colors = {
                'created': 'primary',
                'updated': 'info',
                'completed': 'success',
                'cancelled': 'secondary',
                'failed': 'danger'
            };
            return colors[action.toLowerCase()] || 'secondary';
        },
        
        numberToWords: function(num) {
            // Simple number to words converter
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            
            if (num === 0) return 'Zero';
            
            const convert = function(n) {
                if (n < 10) return ones[n];
                else if (n >= 10 && n < 20) return teens[n - 10];
                else if (n >= 20 && n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
                else if (n >= 100 && n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
                else if (n >= 1000 && n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
                else if (n >= 100000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
                return '';
            };
            
            const intPart = Math.floor(num);
            const decPart = Math.round((num - intPart) * 100);
            
            let words = convert(intPart);
            if (decPart > 0) {
                words += ' and ' + convert(decPart) + ' Cents';
            }
            
            return words;
        },
        
        bindEvents: function() {
            const self = this;
            
            // Edit payment
            $('#btnEditPayment').on('click', function() {
                TempleRouter.navigate('purchase/payments/edit', { id: self.paymentId });
            });
            
            // Print payment
            $('#btnPrintPayment').on('click', function() {
                window.print();
            });
            
            // Email payment
            $('#btnEmailPayment').on('click', function() {
                self.emailPayment();
            });
        },
        
        completePayment: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Complete Payment',
                'Are you sure you want to mark this payment as completed?',
                function() {
                    TempleAPI.post('/purchase/payments/' + self.paymentId + '/complete')
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('Payment marked as completed', 'success');
                                self.loadPayment();
                            }
                        });
                }
            );
        },
        
        emailPayment: function() {
            const self = this;
            
            const email = prompt('Enter email address:');
            if (email) {
                TempleCore.showLoading(true);
                
                TempleAPI.post('/purchase/payments/' + this.paymentId + '/email', { email: email })
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast('Payment receipt sent successfully', 'success');
                        }
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
            }
        }
    };
    
})(jQuery, window);