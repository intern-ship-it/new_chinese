// js/pages/purchase/suppliers/statement.js
// Supplier statement and transaction history

(function($, window) {
    'use strict';
    
    window.PurchaseSuppliersStatementPage = {
        currentSupplier: null,
        transactions: [],
        
        init: function(params) {
            this.supplierId = params?.id || this.getSupplierIdFromUrl();
            this.render();
            this.loadSuppliers();
            this.bindEvents();
            
            // Load statement if supplier ID provided
            if (this.supplierId) {
                $('#supplierSelect').val(this.supplierId);
                this.loadStatement();
            }
        },
        
        getSupplierIdFromUrl: function() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('supplier_id');
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Supplier Statement</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/suppliers'); return false;">Suppliers</a></li>
                                    <li class="breadcrumb-item active">Statement</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            
                           
                            <button class="btn btn-secondary" id="btnPrint" style="display: none;">
                                <i class="bi bi-printer"></i> Print
                            </button>
                           
                        </div>
                    </div>
                    
                    <!-- Filter Section -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="statementFilterForm">
                                <div class="row">
                                    <div class="col-md-4">
                                        <label class="form-label">Select Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplierSelect" required>
                                            <option value="">-- Select Supplier --</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="fromDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="toDate">
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary w-100" id="btnGenerateStatement">
                                            <i class="bi bi-search"></i> Generate
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Statement Content -->
                    <div id="statementContent" style="display: none;">
                        <!-- Supplier Info Card -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">Supplier Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h5 id="supplierName" class="text-primary"></h5>
                                        <p class="mb-1"><strong>Code:</strong> <span id="supplierCode"></span></p>
                                        <p class="mb-1"><strong>Contact:</strong> <span id="supplierContact"></span></p>
                                        <p class="mb-1"><strong>Email:</strong> <span id="supplierEmail"></span></p>
                                        <p class="mb-0"><strong>GST:</strong> <span id="supplierGst"></span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="text-md-end">
                                            <p class="mb-1"><strong>Statement Period:</strong></p>
                                            <p class="mb-2"><span id="statementPeriod"></span></p>
                                            <p class="mb-1"><strong>Statement Date:</strong></p>
                                            <p class="mb-0"><span id="statementDate"></span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Balance Summary -->
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <h6 class="text-muted">Opening Balance</h6>
                                        <h4 id="openingBalance" class="mb-0">0.00</h4>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-success text-white">
                                    <div class="card-body">
                                        <h6>Total Purchases</h6>
                                        <h4 id="totalPurchases" class="mb-0">0.00</h4>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body">
                                        <h6>Total Payments</h6>
                                        <h4 id="totalPayments" class="mb-0">0.00</h4>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-warning text-white">
                                    <div class="card-body">
                                        <h6>Closing Balance</h6>
                                        <h4 id="closingBalance" class="mb-0">0.00</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Transaction Details -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Transaction Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover" id="transactionTable">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Reference #</th>
                                                <th>Description</th>
                                                <th class="text-end">Debit</th>
                                                <th class="text-end">Credit</th>
                                                <th class="text-end">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody id="transactionTableBody">
                                            <tr>
                                                <td colspan="7" class="text-center">No transactions to display</td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-light fw-bold">
                                                <td colspan="4">Total</td>
                                                <td class="text-end" id="totalDebit">0.00</td>
                                                <td class="text-end" id="totalCredit">0.00</td>
                                                <td class="text-end" id="finalBalance">0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Aging Analysis -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5 class="mb-0">Aging Analysis</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-12">
                                        <canvas id="agingChart" height="80"></canvas>
                                    </div>
                                </div>
                                <div class="table-responsive mt-3">
                                    <table class="table table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Current</th>
                                                <th>1-30 Days</th>
                                                <th>31-60 Days</th>
                                                <th>61-90 Days</th>
                                                <th>Over 90 Days</th>
                                                <th>Total Outstanding</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr id="agingRow">
                                                <td id="agingCurrent">0.00</td>
                                                <td id="aging30">0.00</td>
                                                <td id="aging60">0.00</td>
                                                <td id="aging90">0.00</td>
                                                <td id="agingOver90">0.00</td>
                                                <td class="fw-bold" id="agingTotal">0.00</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Outstanding Invoices -->
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Outstanding Invoices</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Invoice #</th>
                                                <th>Date</th>
                                                <th>Due Date</th>
                                                <th>Days Overdue</th>
                                                <th class="text-end">Invoice Amount</th>
                                                <th class="text-end">Paid Amount</th>
                                                <th class="text-end">Balance</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody id="outstandingTableBody">
                                            <tr>
                                                <td colspan="8" class="text-center">No outstanding invoices</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Loading State -->
                    <div id="statementLoading" class="text-center py-5" style="display: none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Generating statement...</p>
                    </div>
                </div>
                
               
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .btn, .breadcrumb, .card-header { display: none !important; }
                        .card { border: 1px solid #000 !important; }
                        .table { font-size: 12px; }
                        #statementFilterForm { display: none !important; }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
loadSuppliers: function() {
    const self = this;
    
    TempleAPI.get('/purchase/suppliers?status=active')
        .done(function(response) {
            if (response.success) {
                let options = '<option value="">-- Select Supplier --</option>';
                
                // Handle paginated response - suppliers are in data.data
                const suppliers = response.data.data || response.data || [];
                
                $.each(suppliers, function(index, supplier) {
                    if(supplier && supplier.id && supplier.name) {
                        options += `<option value="${supplier.id}">${supplier.name} (${supplier.supplier_code || 'N/A'})</option>`;
                    }
                });
                
                $('#supplierSelect').html(options);
                
                // If supplier was pre-selected, trigger load
                if (self.supplierId) {
                    $('#supplierSelect').val(self.supplierId);
                }
            }
        })
        .fail(function(xhr) {
            console.error('Failed to load suppliers:', xhr);
            TempleCore.showToast('Failed to load suppliers', 'error');
        });
},
        
        loadStatement: function() {
            const supplierId = $('#supplierSelect').val();
            
            if (!supplierId) {
                TempleCore.showToast('Please select a supplier', 'warning');
                return;
            }
            
            const params = {
                supplier_id: supplierId,
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val()
            };
            
            $('#statementLoading').show();
            $('#statementContent').hide();
            
            TempleAPI.get('/purchase/suppliers/' + supplierId + '/statement', params)
                .done(response => {
                    if (response.success) {
                        this.currentSupplier = response.data.supplier;
                        this.transactions = response.data.transactions || [];
                        this.displayStatement(response.data);
                        $('#statementContent').show();
                      
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load statement', 'error');
                    }
                })
                .fail(() => {
                    TempleCore.showToast('Failed to load statement', 'error');
                })
                .always(() => {
                    $('#statementLoading').hide();
                });
        },
        
        displayStatement: function(data) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            // Supplier Info
            $('#supplierName').text(data.supplier.name);
            $('#supplierCode').text(data.supplier.supplier_code);
            $('#supplierContact').text(data.supplier.mobile_no || '-');
            $('#supplierEmail').text(data.supplier.email || '-');
            $('#supplierGst').text(data.supplier.gst_no || '-');
            
            // Statement Period
            const fromDate = $('#fromDate').val() || data.from_date;
            const toDate = $('#toDate').val() || data.to_date;
            $('#statementPeriod').text(
                TempleCore.formatDate(fromDate) + ' to ' + TempleCore.formatDate(toDate)
            );
            $('#statementDate').text(TempleCore.formatDate(new Date()));
            
            // Balance Summary
            $('#openingBalance').text(currency + (data.opening_balance || 0).toFixed(2));
            $('#totalPurchases').text(currency + (data.total_purchases || 0).toFixed(2));
            $('#totalPayments').text(currency + (data.total_payments || 0).toFixed(2));
            $('#closingBalance').text(currency + (data.closing_balance || 0).toFixed(2));
            
            // Transactions
            this.displayTransactions(data.transactions || []);
            
            // Aging Analysis
            this.displayAging(data.aging || {});
            
            // Outstanding Invoices
            this.displayOutstanding(data.outstanding_invoices || []);
            
            // Update email field with supplier email
            $('#toEmail').val(data.supplier.email || '');
        },
        
        displayTransactions: function(transactions) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            let runningBalance = 0;
            let totalDebit = 0;
            let totalCredit = 0;
            
            if (transactions.length === 0) {
                html = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
            } else {
                $.each(transactions, function(index, txn) {
                    const debit = parseFloat(txn.debit || 0);
                    const credit = parseFloat(txn.credit || 0);
                    runningBalance += debit - credit;
                    totalDebit += debit;
                    totalCredit += credit;
                    
                    const typeClass = txn.type === 'INVOICE' ? 'text-danger' : 
                                     txn.type === 'PAYMENT' ? 'text-success' : '';
                    
                    html += `
                        <tr>
                            <td>${TempleCore.formatDate(txn.date)}</td>
                            <td class="${typeClass}">${txn.type}</td>
                            <td>${txn.reference_number}</td>
                            <td>${txn.description}</td>
                            <td class="text-end">${debit > 0 ? currency + debit.toFixed(2) : '-'}</td>
                            <td class="text-end">${credit > 0 ? currency + credit.toFixed(2) : '-'}</td>
                            <td class="text-end ${runningBalance < 0 ? 'text-danger' : ''}">${currency}${Math.abs(runningBalance).toFixed(2)}</td>
                        </tr>
                    `;
                });
            }
            
            $('#transactionTableBody').html(html);
            $('#totalDebit').text(currency + totalDebit.toFixed(2));
            $('#totalCredit').text(currency + totalCredit.toFixed(2));
            $('#finalBalance').text(currency + Math.abs(runningBalance).toFixed(2));
        },
        
        displayAging: function(aging) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            const current = aging.current || 0;
            const days30 = aging.days_30 || 0;
            const days60 = aging.days_60 || 0;
            const days90 = aging.days_90 || 0;
            const over90 = aging.over_90 || 0;
            const total = current + days30 + days60 + days90 + over90;
            
            $('#agingCurrent').text(currency + current.toFixed(2));
            $('#aging30').text(currency + days30.toFixed(2));
            $('#aging60').text(currency + days60.toFixed(2));
            $('#aging90').text(currency + days90.toFixed(2));
            $('#agingOver90').text(currency + over90.toFixed(2));
            $('#agingTotal').text(currency + total.toFixed(2));
            
            // Render aging chart
            this.renderAgingChart([current, days30, days60, days90, over90]);
        },
        
        renderAgingChart: function(data) {
            const ctx = document.getElementById('agingChart');
            if (!ctx) return;
            
            // Destroy existing chart if any
            if (this.agingChartInstance) {
                this.agingChartInstance.destroy();
            }
            
            this.agingChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', 'Over 90 Days'],
                    datasets: [{
                        label: 'Outstanding Amount',
                        data: data,
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        },
        
        displayOutstanding: function(invoices) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            
            if (invoices.length === 0) {
                html = '<tr><td colspan="8" class="text-center">No outstanding invoices</td></tr>';
            } else {
                $.each(invoices, function(index, invoice) {
                    const daysOverdue = invoice.days_overdue || 0;
                    const statusClass = daysOverdue > 30 ? 'text-danger' : 
                                       daysOverdue > 0 ? 'text-warning' : '';
                    
                    html += `
                        <tr>
                            <td>${invoice.invoice_number}</td>
                            <td>${TempleCore.formatDate(invoice.invoice_date)}</td>
                            <td>${invoice.due_date ? TempleCore.formatDate(invoice.due_date) : '-'}</td>
                            <td class="${statusClass}">${daysOverdue > 0 ? daysOverdue : '-'}</td>
                            <td class="text-end">${currency}${invoice.total_amount}</td>
                            <td class="text-end">${currency}${invoice.paid_amount}</td>
                            <td class="text-end">${currency}${invoice.balance_amount}</td>
                            <td>
                                <span class="badge ${invoice.payment_status === 'PARTIAL' ? 'bg-warning' : 'bg-danger'}">
                                    ${invoice.payment_status}
                                </span>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#outstandingTableBody').html(html);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Set default dates
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            $('#fromDate').val(firstDay.toISOString().split('T')[0]);
            $('#toDate').val(today.toISOString().split('T')[0]);
            
            // Generate statement
            $('#btnGenerateStatement').on('click', function() {
                self.loadStatement();
            });
            

            
            // Print
            $('#btnPrint').on('click', function() {
                window.print();
            });


        },
        

       
    

    };
    
})(jQuery, window);