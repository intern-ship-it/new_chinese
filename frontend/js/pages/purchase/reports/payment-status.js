// js/pages/purchase/reports/payment-status.js
// Payment status report for purchase invoices

(function($, window) {
    'use strict';
    
    window.PaymentStatusReportPage = {
        currentFilters: {},
        
        init: function() {
            this.render();
            this.loadSuppliers();
            this.setDefaultDates();
            this.bindEvents();
            this.loadReport();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Payment Status Report</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Payment Status</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-success" id="btnExportExcel">
                                <i class="bi bi-file-earmark-excel"></i> Export Excel
                            </button>
                            <button class="btn btn-info" id="btnExportPdf">
                                <i class="bi bi-file-earmark-pdf"></i> Export PDF
                            </button>
                            <button class="btn btn-secondary" onclick="window.print();">
                                <i class="bi bi-printer"></i> Print
                            </button>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="filterForm">
                                <div class="row">
                                    <div class="col-md-2">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="fromDate">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="toDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Supplier</label>
                                        <select class="form-select" id="supplierFilter">
                                            <option value="">All Suppliers</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Payment Status</label>
                                        <select class="form-select" id="paymentStatusFilter">
                                            <option value="">All Status</option>
                                            <option value="UNPAID">Unpaid</option>
                                            <option value="PARTIAL">Partially Paid</option>
                                            <option value="PAID">Fully Paid</option>
                                            <option value="OVERDUE">Overdue</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary me-2" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Apply
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="btnResetFilter">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Total Invoices</h6>
                                            <h4 class="mb-0" id="totalInvoices">0</h4>
                                        </div>
                                        <div class="fs-1 text-primary">
                                            <i class="bi bi-receipt"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Total Outstanding</h6>
                                            <h4 class="mb-0 text-warning" id="totalOutstanding">0.00</h4>
                                        </div>
                                        <div class="fs-1 text-warning">
                                            <i class="bi bi-clock-history"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-danger">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Overdue Amount</h6>
                                            <h4 class="mb-0 text-danger" id="overdueAmount">0.00</h4>
                                        </div>
                                        <div class="fs-1 text-danger">
                                            <i class="bi bi-exclamation-triangle"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-success">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-1">Paid Amount</h6>
                                            <h4 class="mb-0 text-success" id="paidAmount">0.00</h4>
                                        </div>
                                        <div class="fs-1 text-success">
                                            <i class="bi bi-check-circle"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Aging Analysis -->
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0">Payment Aging Analysis</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <canvas id="agingChart" height="80"></canvas>
                                </div>
                                <div class="col-md-4">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Period</th>
                                                <th class="text-end">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody id="agingTableBody">
                                            <tr><td colspan="2" class="text-center">Loading...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed Payment Status Table -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Invoice Payment Details</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="paymentStatusTable">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Invoice Date</th>
                                            <th>Supplier</th>
                                            <th>Due Date</th>
                                            <th class="text-end">Invoice Amount</th>
                                            <th class="text-end">Paid Amount</th>
                                            <th class="text-end">Balance</th>
                                            <th>Days Overdue</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="paymentTableBody">
                                        <tr>
                                            <td colspan="10" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-light">
                                            <th colspan="4">Total</th>
                                            <th class="text-end" id="footerInvoiceTotal">0.00</th>
                                            <th class="text-end" id="footerPaidTotal">0.00</th>
                                            <th class="text-end" id="footerBalanceTotal">0.00</th>
                                            <th colspan="3"></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Modal -->
                <div class="modal fade" id="quickPaymentModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">Quick Payment</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="quickPaymentForm">
                                    <input type="hidden" id="qpInvoiceId">
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label>Invoice Number:</label>
                                            <input type="text" class="form-control" id="qpInvoiceNumber" readonly>
                                        </div>
                                        <div class="col-md-6">
                                            <label>Balance Amount:</label>
                                            <input type="text" class="form-control" id="qpBalanceAmount" readonly>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="qpPaymentDate" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                        <select class="form-select" id="qpPaymentMode" required>
                                            <option value="">Select Mode</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Amount <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="qpAmount" step="0.01" min="0.01" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Reference Number</label>
                                        <input type="text" class="form-control" id="qpReference" placeholder="Cheque/Transaction #">
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="btnSaveQuickPayment">
                                    <i class="bi bi-check-circle"></i> Save Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .btn, .breadcrumb, .card-header { display: none !important; }
                        .card { border: 1px solid #000 !important; }
                        .table { font-size: 12px; }
                    }
                    
                    .table-hover tbody tr:hover {
                        background-color: rgba(0,123,255,0.05);
                    }
                    
                    .badge-overdue {
                        animation: pulse 2s infinite;
                    }
                    
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        setDefaultDates: function() {
            // Set default date range (last 30 days)
            const today = new Date();
            const fromDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
            
            $('#toDate').val(today.toISOString().split('T')[0]);
            $('#fromDate').val(fromDate.toISOString().split('T')[0]);
        },
        
        loadSuppliers: function() {
            TempleAPI.get('/purchase/suppliers')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">All Suppliers</option>';
                        $.each(response.data, function(index, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#supplierFilter').html(options);
                    }
                });
        },
        
        loadReport: function() {
            const self = this;
            this.currentFilters = this.getFilters();
            
            TempleAPI.get('/purchase/reports/payment-status', this.currentFilters)
                .done(function(response) {
                    if (response.success) {
                        self.displaySummary(response.data.summary);
                        self.displayAging(response.data.aging);
                        self.displayInvoices(response.data.invoices);
                        self.renderAgingChart(response.data.aging);
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load report', 'error');
                    $('#paymentTableBody').html('<tr><td colspan="10" class="text-center text-danger">Failed to load data</td></tr>');
                });
        },
        
        getFilters: function() {
            return {
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val(),
                supplier_id: $('#supplierFilter').val(),
                payment_status: $('#paymentStatusFilter').val()
            };
        },
        
        displaySummary: function(summary) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            $('#totalInvoices').text(summary.total_invoices || 0);
            $('#totalOutstanding').text(currency + (summary.total_outstanding || 0).toFixed(2));
            $('#overdueAmount').text(currency + (summary.overdue_amount || 0).toFixed(2));
            $('#paidAmount').text(currency + (summary.paid_amount || 0).toFixed(2));
        },
        
        displayAging: function(aging) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            
            if (aging && aging.length > 0) {
                $.each(aging, function(index, item) {
                    html += `
                        <tr>
                            <td>${item.period}</td>
                            <td class="text-end">${currency}${item.amount.toFixed(2)}</td>
                        </tr>
                    `;
                });
            } else {
                html = '<tr><td colspan="2" class="text-center">No data</td></tr>';
            }
            
            $('#agingTableBody').html(html);
        },
        
        displayInvoices: function(invoices) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            let totalInvoice = 0;
            let totalPaid = 0;
            let totalBalance = 0;
            
            if (!invoices || invoices.length === 0) {
                html = '<tr><td colspan="10" class="text-center">No invoices found</td></tr>';
            } else {
                $.each(invoices, function(index, invoice) {
                    totalInvoice += parseFloat(invoice.total_amount);
                    totalPaid += parseFloat(invoice.paid_amount);
                    totalBalance += parseFloat(invoice.balance_amount);
                    
                    const statusBadge = PaymentStatusReportPage.getStatusBadge(invoice.payment_status, invoice.is_overdue);
                    const daysOverdue = invoice.days_overdue > 0 ? 
                        `<span class="text-danger">${invoice.days_overdue} days</span>` : '-';
                    
                    html += `
                        <tr>
                            <td>${invoice.invoice_number}</td>
                            <td>${TempleCore.formatDate(invoice.invoice_date)}</td>
                            <td>${invoice.supplier_name}</td>
                            <td>${invoice.payment_due_date ? TempleCore.formatDate(invoice.payment_due_date) : '-'}</td>
                            <td class="text-end">${currency}${invoice.total_amount}</td>
                            <td class="text-end">${currency}${invoice.paid_amount}</td>
                            <td class="text-end ${invoice.balance_amount > 0 ? 'text-danger' : ''}">${currency}${invoice.balance_amount}</td>
                            <td>${daysOverdue}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-info" title="View Invoice" 
                                    onclick="TempleRouter.navigate('purchase/invoices/view', {id: '${invoice.id}'}); return false;">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${invoice.payment_status !== 'PAID' ? `
                                <button class="btn btn-sm btn-success" title="Add Payment" 
                                    onclick="PaymentStatusReportPage.showQuickPayment('${invoice.id}', '${invoice.invoice_number}', ${invoice.balance_amount})">
                                    <i class="bi bi-cash"></i>
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#paymentTableBody').html(html);
            $('#footerInvoiceTotal').text(currency + totalInvoice.toFixed(2));
            $('#footerPaidTotal').text(currency + totalPaid.toFixed(2));
            $('#footerBalanceTotal').text(currency + totalBalance.toFixed(2));
        },
        
        getStatusBadge: function(status, isOverdue) {
            if (isOverdue && status !== 'PAID') {
                return '<span class="badge bg-danger badge-overdue">OVERDUE</span>';
            }
            
            const badges = {
                'UNPAID': '<span class="badge bg-warning">Unpaid</span>',
                'PARTIAL': '<span class="badge bg-info">Partial</span>',
                'PAID': '<span class="badge bg-success">Paid</span>'
            };
            
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        renderAgingChart: function(aging) {
            const ctx = document.getElementById('agingChart');
            if (!ctx) return;
            
            // Destroy existing chart if any
            if (this.agingChartInstance) {
                this.agingChartInstance.destroy();
            }
            
            if (!aging || aging.length === 0) return;
            
            const labels = aging.map(item => item.period);
            const data = aging.map(item => item.amount);
            
            this.agingChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Outstanding Amount',
                        data: data,
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(255, 0, 0, 0.6)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 0, 0, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    const currency = TempleCore.formatCurrency(0).split('0')[0];
                                    return currency + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const currency = TempleCore.formatCurrency(0).split('0')[0];
                                    return currency + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnApplyFilter').on('click', function() {
                self.loadReport();
            });
            
            $('#btnResetFilter').on('click', function() {
                $('#filterForm')[0].reset();
                self.setDefaultDates();
                self.loadReport();
            });
            
            $('#btnExportExcel').on('click', function() {
                self.exportExcel();
            });
            
            $('#btnExportPdf').on('click', function() {
                self.exportPdf();
            });
            
            $('#btnSaveQuickPayment').on('click', function() {
                self.saveQuickPayment();
            });
        },
        
        showQuickPayment: function(invoiceId, invoiceNumber, balanceAmount) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            $('#qpInvoiceId').val(invoiceId);
            $('#qpInvoiceNumber').val(invoiceNumber);
            $('#qpBalanceAmount').val(currency + balanceAmount.toFixed(2));
            $('#qpAmount').val(balanceAmount);
            $('#qpAmount').attr('max', balanceAmount);
            $('#qpPaymentDate').val(new Date().toISOString().split('T')[0]);
            
            // Load payment modes
            this.loadPaymentModes();
            
            const modal = new bootstrap.Modal(document.getElementById('quickPaymentModal'));
            modal.show();
        },
        
        loadPaymentModes: function() {
            TempleAPI.get('/purchase/masters/payment-modes')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">Select Mode</option>';
                        $.each(response.data, function(index, mode) {
                            if (mode.status == 1) {
                                options += `<option value="${mode.id}">${mode.name}</option>`;
                            }
                        });
                        $('#qpPaymentMode').html(options);
                    }
                });
        },
        
        saveQuickPayment: function() {
            const self = this;
            
            if (!$('#quickPaymentForm')[0].checkValidity()) {
                $('#quickPaymentForm')[0].reportValidity();
                return;
            }
            
            const paymentData = {
                invoice_id: $('#qpInvoiceId').val(),
                payment_date: $('#qpPaymentDate').val(),
                payment_mode_id: $('#qpPaymentMode').val(),
                amount: $('#qpAmount').val(),
                reference_number: $('#qpReference').val()
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/purchase/invoices/' + paymentData.invoice_id + '/payments', paymentData)
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('quickPaymentModal')).hide();
                        TempleCore.showToast('Payment added successfully', 'success');
                        self.loadReport(); // Reload report
                    } else {
                        TempleCore.showToast(response.message || 'Failed to add payment', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to add payment', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        exportExcel: function() {
            const params = $.param(this.currentFilters);
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/payment-status/excel?' + params, '_blank');
        },
        
        exportPdf: function() {
            const params = $.param(this.currentFilters);
            window.open(TempleAPI.getBaseUrl() + '/purchase/reports/payment-status/pdf?' + params, '_blank');
        }
    };
    
})(jQuery, window);