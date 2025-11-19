// js/pages/purchase/due-report-enhanced.js
// Purchase Due Report Page with Enhanced Print Functionality

(function ($, window) {
    'use strict';

    window.PurchaseReportsDueReportPage = {
        currentView: 'summary',
        reportData: null,
        templeSettings: null,

        init: function (params) {
            this.params = params || {};
            this.render();
            this.loadTempleSettings();
            this.loadSuppliers();
            this.loadReport();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col">
                            <h2 class="page-title">
                                <i class="bi bi-calendar-x"></i> Purchase Due Report
                            </h2>
                        </div>
                        <div class="col-auto">
                            <div class="btn-group">
                                <button class="btn btn-secondary" id="printReport">
                                    <i class="bi bi-printer"></i> Print Report
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="supplierFilter">
                                        <option value="">All Suppliers</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">As of Date</label>
                                    <input type="date" class="form-control" id="asOfDate" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">View Type</label>
                                    <select class="form-select" id="viewType">
                                        <option value="summary">Summary View</option>
                                        <option value="detailed">Detailed View</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-primary w-100" id="applyFilters">
                                        <i class="bi bi-search"></i> Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4" id="summaryCards">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Current (0-30 days)</h6>
                                    <h3 class="mb-0" id="currentAmount">0.00</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">31-60 Days</h6>
                                    <h3 class="mb-0 text-warning" id="days31to60">0.00</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">61-90 Days</h6>
                                    <h3 class="mb-0 text-orange" id="days61to90">0.00</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted">Over 90 Days</h6>
                                    <h3 class="mb-0 text-danger" id="over90Days">0.00</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Report Content -->
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Aging Report</h5>
                                <div>
                                    <span class="badge bg-primary" id="totalSuppliers">0 Suppliers</span>
                                    <span class="badge bg-secondary" id="totalInvoices">0 Invoices</span>
                                    <span class="badge bg-danger" id="totalDue">Total: 0.00</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="reportContent">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-3">Loading report data...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Supplier Statement Modal -->
                <div class="modal fade" id="statementModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Supplier Statement of Account</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="statementContent">
                                <!-- Statement content will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="printStatement">
                                    <i class="bi bi-printer"></i> Print Statement
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Timeline Modal -->
                <div class="modal fade" id="timelineModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Payment Timeline</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="timelineContent">
                                <!-- Timeline will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .text-orange { color: #fd7e14; }
                    .aging-table th { background-color: #f8f9fa; }
                    .aging-table .supplier-row { background-color: #f0f8ff; font-weight: 600; }
                    .aging-table .invoice-row { font-size: 0.9rem; }
                    .aging-table .overdue-high { color: #dc3545; font-weight: 600; }
                    .aging-table .overdue-medium { color: #fd7e14; }
                    .aging-table .overdue-low { color: #ffc107; }
                    
                    .timeline-item {
                        position: relative;
                        padding-left: 50px;
                        padding-bottom: 30px;
                    }
                    
                    .timeline-item:before {
                        content: '';
                        position: absolute;
                        left: 20px;
                        top: 40px;
                        bottom: -10px;
                        width: 2px;
                        background: #dee2e6;
                    }
                    
                    .timeline-item:last-child:before {
                        display: none;
                    }
                    
                    .timeline-icon {
                        position: absolute;
                        left: 10px;
                        top: 5px;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        color: white;
                    }
                    
                    @media print {
                        .btn-group, #filters, .modal-footer { display: none; }
                        .card { border: 1px solid #000; }
                    }
                        
                </style>
            `;

            $('#page-container').html(html);
        },

        loadTempleSettings: function () {
            const self = this;
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function (response) {
                    if (response.success && response.data && response.data.values) {
                        self.templeSettings = response.data.values;
                    }
                })
                .fail(function () {
                    // Fallback to localStorage
                    self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                });
        },

        loadSuppliers: function () {
            TempleAPI.get('/suppliers/active').done(function (response) {
                if (response.success) {
                    let options = '<option value="">All Suppliers</option>';
                    $.each(response.data, function (index, supplier) {
                        options += `<option value="${supplier.id}">${supplier.name} (${supplier.supplier_code})</option>`;
                    });
                    $('#supplierFilter').html(options);
                }
            });
        },

        loadReport: function () {
            const self = this;
            const filters = {
                view: $('#viewType').val() || 'summary',
                supplier_id: $('#supplierFilter').val(),
                as_of_date: $('#asOfDate').val()
            };

            TempleAPI.get('/purchase/reports/due', filters).done(function (response) {
                if (response.success) {
                    self.reportData = response.data;
                    self.displayReport();
                    self.updateSummaryCards();
                }
            }).fail(function () {
                TempleCore.showToast('Failed to load report data', 'error');
            });
        },

        displayReport: function () {
            const view = $('#viewType').val();
            let html = '';

            if (view === 'summary') {
                html = this.renderSummaryView();
            } else {
                html = this.renderDetailedView();
            }

            $('#reportContent').html(html);
        },

        renderSummaryView: function () {
            const currency = TempleCore.getCurrency();
            let html = `
                <div class="table-responsive">
                    <table class="table table-hover aging-table">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th class="text-center">Invoices</th>
                                <th class="text-end">Current</th>
                                <th class="text-end">31-60 Days</th>
                                <th class="text-end">61-90 Days</th>
                                <th class="text-end">Over 90 Days</th>
                                <th class="text-end">Total Due</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (this.reportData.summary && this.reportData.summary.length > 0) {
                $.each(this.reportData.summary, (index, row) => {
                    html += `
                        <tr>
                            <td>
                                <strong>${row.supplier_name}</strong><br>
                                <small class="text-muted">${row.supplier_code}</small>
                            </td>
                            <td class="text-center">${row.invoice_count}</td>
                            <td class="text-end">${currency}${row.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="text-end text-warning">${currency}${row['31_60_days'].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="text-end text-orange">${currency}${row['61_90_days'].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="text-end text-danger">${currency}${row.over_90_days.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="text-end"><strong>${currency}${row.total_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-info" onclick="PurchaseReportsDueReportPage.showStatement('${row.supplier_id}')">
                                    <i class="bi bi-file-text"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="PurchaseReportsDueReportPage.printSupplier('${row.supplier_id}')">
                                    <i class="bi bi-printer"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="8" class="text-center">No overdue invoices found</td></tr>';
            }

            // Add totals row
            if (this.reportData.totals) {
                const totals = this.reportData.totals;
                html += `
                    <tr class="table-secondary fw-bold">
                        <td>TOTALS</td>
                        <td class="text-center">${totals.invoice_count}</td>
                        <td class="text-end">${currency}${totals.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td class="text-end">${currency}${totals['31_60_days'].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td class="text-end">${currency}${totals['61_90_days'].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td class="text-end">${currency}${totals.over_90_days.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td class="text-end">${currency}${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td></td>
                    </tr>
                `;
            }

            html += '</tbody></table></div>';
            return html;
        },

        renderDetailedView: function () {
            const currency = TempleCore.getCurrency();
            let html = '<div class="accordion" id="detailedReport">';

            if (this.reportData.detailed && this.reportData.detailed.length > 0) {
                $.each(this.reportData.detailed, (index, supplierData) => {
                    const supplier = supplierData.supplier;
                    const invoices = supplierData.invoices;
                    const buckets = supplierData.buckets;

                    html += `
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" 
                                    data-bs-toggle="collapse" data-bs-target="#supplier-${supplier.id}">
                                    <div class="w-100 d-flex justify-content-between me-3">
                                        <span>
                                            <strong>${supplier.name}</strong> (${supplier.code})
                                            <span class="badge bg-secondary ms-2">${invoices.length} invoices</span>
                                        </span>
                                        <span class="text-danger">
                                            <strong>Total: ${currency}${buckets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                        </span>
                                    </div>
                                </button>
                            </h2>
                            <div id="supplier-${supplier.id}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}">
                                <div class="accordion-body">
                                    <div class="mb-3 d-flex justify-content-between">
                                        <small class="text-muted">
                                            Contact: ${supplier.contact || 'N/A'} | Email: ${supplier.email || 'N/A'}
                                        </small>
                                        <button class="btn btn-sm btn-secondary" onclick="PurchaseReportsDueReportPage.printSupplier('${supplier.id}')">
                                            <i class="bi bi-printer"></i> Print
                                        </button>
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Invoice #</th>
                                                    <th>Invoice Date</th>
                                                    <th>Due Date</th>
                                                    <th class="text-center">Days Overdue</th>
                                                    <th class="text-end">Total</th>
                                                    <th class="text-end">Paid</th>
                                                    <th class="text-end">Balance</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                    `;

                    $.each(invoices, (idx, invoice) => {
                        let overdueClass = '';
                        if (invoice.days_overdue > 90) overdueClass = 'overdue-high';
                        else if (invoice.days_overdue > 60) overdueClass = 'overdue-medium';
                        else if (invoice.days_overdue > 30) overdueClass = 'overdue-low';

                        html += `
                            <tr class="invoice-row">
                                <td>${invoice.invoice_number}</td>
                                <td>${new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                <td>${new Date(invoice.due_date).toLocaleDateString()}</td>
                                <td class="text-center ${overdueClass}">${invoice.days_overdue} days</td>
                                <td class="text-end">${currency}${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td class="text-end">${currency}${invoice.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td class="text-end ${overdueClass}">${currency}${invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-info" onclick="PurchaseReportsDueReportPage.showTimeline('${invoice.invoice_number}')">
                                        <i class="bi bi-clock-history"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `
                                            </tbody>
                                            <tfoot>
                                                <tr class="table-light fw-bold">
                                                    <td colspan="4">Supplier Total</td>
                                                    <td class="text-end">${currency}${buckets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td></td>
                                                    <td class="text-end">${currency}${buckets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td>
                                                        <button class="btn btn-sm btn-primary" onclick="PurchaseReportsDueReportPage.showStatement('${supplier.id}')">
                                                            Statement
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                     
                    `;
                });
            } else {
                html += '<p class="text-center py-4">No overdue invoices found</p>';
            }

            html += '</div>';
            return html;
        },

        updateSummaryCards: function () {
            const currency = TempleCore.getCurrency();
            const totals = this.reportData.totals || {};

            $('#currentAmount').text(currency + (totals.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }));
            $('#days31to60').text(currency + (totals['31_60_days'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }));
            $('#days61to90').text(currency + (totals['61_90_days'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }));
            $('#over90Days').text(currency + (totals.over_90_days || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }));

            $('#totalSuppliers').text((totals.supplier_count || 0) + ' Suppliers');
            $('#totalInvoices').text((totals.invoice_count || 0) + ' Invoices');
            $('#totalDue').text('Total: ' + currency + (totals.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }));
        },

        showStatement: function (supplierId) {
            const self = this;
            self.currentStatementSupplier = supplierId;

            $('#statementContent').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-3">Loading statement...</p>
                </div>
            `);

            $('#statementModal').modal('show');

            TempleAPI.get('/purchase/suppliers/' + supplierId + '/suppliers-statement').done(function (response) {
                if (response.success) {
                    self.renderStatement(response.data);
                    self.currentStatementData = response.data;
                }
            }).fail(function () {
                TempleCore.showToast('Failed to load statement', 'error');
                $('#statementModal').modal('hide');
            });
        },

        renderStatement: function (data) {
            const currency = TempleCore.getCurrency();

            const fromDate = data.period?.from || data.period?.from_date || data.from_date || new Date().toLocaleDateString();
            const toDate = data.period?.to || data.period?.to_date || data.to_date || new Date().toLocaleDateString();

            let formattedFromDate, formattedToDate;
            try {
                formattedFromDate = new Date(fromDate).toLocaleDateString();
                formattedToDate = new Date(toDate).toLocaleDateString();
            } catch (e) {
                formattedFromDate = fromDate;
                formattedToDate = toDate;
            }

            let html = `
                <div class="statement-header mb-4">
                    <div class="row">
                        <div class="col-md-6">
                            <h4>${data.supplier.name}</h4>
                            <p class="mb-1">${data.supplier.address || ''}</p>
                            <p class="mb-1">Phone: ${data.supplier.mobile_no || 'N/A'}</p>
                            <p>Email: ${data.supplier.email || 'N/A'}</p>
                        </div>
                        <div class="col-md-6 text-end">
                            <h5>Statement of Account</h5>
                            <p>Period: ${formattedFromDate} to ${formattedToDate}</p>
                            <p>Generated: ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Description</th>
                            <th class="text-end">Debit</th>
                            <th class="text-end">Credit</th>
                            <th class="text-end">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5">Opening Balance</td>
                            <td class="text-end">${currency}${(data.opening_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
            `;

            if (data.transactions && data.transactions.length > 0) {
                $.each(data.transactions, (index, trans) => {
                    const transDate = trans.date ? new Date(trans.date).toLocaleDateString() : '';
                    html += `
                        <tr>
                            <td>${transDate}</td>
                            <td>${trans.reference || trans.reference_number || ''}</td>
                            <td>${trans.description || ''}</td>
<td class="text-end">
    ${(trans.debit ?? 0) ? currency + trans.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
</td>
<td class="text-end">
    ${(trans.credit ?? 0) ? currency + trans.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
</td>
<td class="text-end">
    ${(trans.balance ?? 0) > 0 
        ? currency + trans.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) 
        : (trans.balance ?? 0) < 0 
            ? currency + '(' + Math.abs(trans.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) + ')'
            : '-'}
</td>




                        </tr>
                    `;
                });
            }

            html += `
                    </tbody>
                    <tfoot>
                        <tr class="table-secondary fw-bold">
                            <td colspan="3">Totals</td>
                            <td class="text-end">${currency}${(data.total_invoices || data.total_purchases || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="text-end">${currency}${(data.total_payments || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                         <td class="text-end">
    ${(data.closing_balance ?? 0) !== 0 
        ? currency + Math.abs(data.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) + (data.closing_balance >= 0 ? ' (Payable)' : '') 
        : '-'}
</td>

                        </tr>
                    </tfoot>
                </table>
            `;

            $('#statementContent').html(html);
        },

        showTimeline: function (invoiceNumber) {
            $('#timelineContent').html(`
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-icon bg-primary">
                            <i class="bi bi-file-text"></i>
                        </div>
                        <div>
                            <h6>Invoice Created</h6>
                            <p class="text-muted mb-1">Invoice ${invoiceNumber} created</p>
                            <small>2 days ago</small>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon bg-warning">
                            <i class="bi bi-calendar"></i>
                        </div>
                        <div>
                            <h6>Payment Due</h6>
                            <p class="text-muted mb-1">Payment became due</p>
                            <small>Today</small>
                        </div>
                    </div>
                </div>
            `);

            $('#timelineModal').modal('show');
        },

        // Print Functions
        printFullReport: function () {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print', 'warning');
                return;
            }

            const html = this.generateFullReportHTML();
            printWindow.document.write(html);
            printWindow.document.close();
        },

        printSupplier: function (supplierId) {
            const self = this;
            
            // Find supplier data
            let supplierData = null;
            if (this.reportData.detailed) {
                supplierData = this.reportData.detailed.find(d => d.supplier.id == supplierId);
            } else if (this.reportData.summary) {
                const summaryData = this.reportData.summary.find(s => s.supplier_id == supplierId);
                if (summaryData) {
                    supplierData = {
                        supplier: {
                            name: summaryData.supplier_name,
                            code: summaryData.supplier_code
                        },
                        buckets: {
                            current: summaryData.current,
                            '31_60_days': summaryData['31_60_days'],
                            '61_90_days': summaryData['61_90_days'],
                            'over_90_days': summaryData.over_90_days,
                            total: summaryData.total_due
                        }
                    };
                }
            }

            if (!supplierData) {
                TempleCore.showToast('Supplier data not found', 'error');
                return;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print', 'warning');
                return;
            }

            const html = this.generateSupplierReportHTML(supplierData);
            printWindow.document.write(html);
            printWindow.document.close();
        },

        printStatement: function () {
            if (!this.currentStatementData) {
                TempleCore.showToast('No statement data available', 'error');
                return;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print', 'warning');
                return;
            }

            const html = this.generateStatementHTML(this.currentStatementData);
            printWindow.document.write(html);
            printWindow.document.close();
        },

        // HTML Generation Functions
        generatePrintHeader: function (title) {
            const temple = this.templeSettings || {};
            
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }

            return `
                <table width="750" border="0" align="center">
                    <tr>
                        <td width="120">
                            ${logoHTML}
                        </td>
                        <td width="580" align="left" style="font-size:13px; padding-left: 20px;">
                            <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                            <br>${temple.temple_address || temple.address || 'Temple Address'}
                            <br>${temple.temple_city || temple.city ? (temple.temple_city || temple.city) + ', ' : ''}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                            <br>${temple.temple_country || temple.country || 'India'}
                            ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                            ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                        </td>
                        <td width="50"></td>
                    </tr>
                </table>
                
                <table width="750" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                    <tr>
                        <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                            ${title}
                        </td>
                    </tr>
                </table>
            `;
        },

        generateFullReportHTML: function () {
            const currency = TempleCore.getCurrency();
            const viewType = $('#viewType').val();
            const asOfDate = $('#asOfDate').val();
            
            let contentHTML = '';
            if (viewType === 'summary') {
                contentHTML = this.generateSummaryTableHTML();
            } else {
                contentHTML = this.generateDetailedTableHTML();
            }

            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Purchase Due Report</title>
                    <style>
                        ${this.getPrintStyles()}
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="750" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="550"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    ${this.generatePrintHeader('Purchase Due Report')}
                    
                    <!-- Report Info -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>As of Date:</b></td>
                            <td width="250">${this.formatDate(asOfDate)}</td>
                            <td width="150"><b>Generated:</b></td>
                            <td width="200">${this.formatDate(new Date().toISOString())}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>View Type:</b></td>
                            <td>${viewType === 'summary' ? 'Summary View' : 'Detailed View'}</td>
                            <td><b>Total Suppliers:</b></td>
                            <td>${this.reportData.totals?.supplier_count || 0}</td>
                        </tr>
                    </table>
                    
                    <!-- Summary Cards -->
                    <table width="750" align="center" style="margin-top:20px;">
                        <tr>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">Current (0-30 days)</div>
                                <div style="font-size:18px;font-weight:bold;">${currency}${(this.reportData.totals?.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">31-60 Days</div>
                                <div style="font-size:18px;font-weight:bold;color:#ffc107;">${currency}${(this.reportData.totals?.['31_60_days'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">61-90 Days</div>
                                <div style="font-size:18px;font-weight:bold;color:#fd7e14;">${currency}${(this.reportData.totals?.['61_90_days'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">Over 90 Days</div>
                                <div style="font-size:18px;font-weight:bold;color:#dc3545;">${currency}${(this.reportData.totals?.over_90_days || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Main Content -->
                    ${contentHTML}
                    
                    <!-- Total Summary -->
                    <table width="750" align="center" style="margin-top:20px; border-top:2px solid #000; padding-top:15px;">
                        <tr style="font-size: 16px;">
                            <td align="right" width="600"><strong>Total Amount Due:</strong></td>
                            <td align="right" width="150"><strong>${currency}${(this.reportData.totals?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        },

        generateSummaryTableHTML: function () {
            const currency = TempleCore.getCurrency();
            let html = `
                <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                    <thead>
                        <tr style="font-size: 14px;">   
                            <td style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>Supplier</b></td>
                            <td align="center" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>Invoices</b></td>
                            <td align="right" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>Current</b></td>
                            <td align="right" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>31-60 Days</b></td>
                            <td align="right" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>61-90 Days</b></td>
                            <td align="right" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>Over 90 Days</b></td>
                            <td align="right" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>Total Due</b></td>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (this.reportData.summary && this.reportData.summary.length > 0) {
                $.each(this.reportData.summary, (index, row) => {
                    html += `
                        <tr style="font-size:14px;">
                            <td style="padding:5px;border-bottom:1px solid #ddd;">
                                <strong>${row.supplier_name}</strong><br>
                                <small style="color:#666;">${row.supplier_code}</small>
                            </td>
                            <td align="center" style="padding:5px;border-bottom:1px solid #ddd;">${row.invoice_count}</td>
                            <td align="right" style="padding:5px;border-bottom:1px solid #ddd;">${currency}${row.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td align="right" style="padding:5px;border-bottom:1px solid #ddd;color:#ffc107;">${currency}${row['31_60_days'].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td align="right" style="padding:5px;border-bottom:1px solid #ddd;color:#fd7e14;">${currency}${row['61_90_days'].toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td align="right" style="padding:5px;border-bottom:1px solid #ddd;color:#dc3545;">${currency}${row.over_90_days.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td align="right" style="padding:5px;border-bottom:1px solid #ddd;"><strong>${currency}${row.total_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table>';
            return html;
        },

        generateDetailedTableHTML: function () {
            const currency = TempleCore.getCurrency();
            let html = '<div style="margin-top:30px;">';

            if (this.reportData.detailed && this.reportData.detailed.length > 0) {
                $.each(this.reportData.detailed, (index, supplierData) => {
                    const supplier = supplierData.supplier;
                    const invoices = supplierData.invoices;
                    const buckets = supplierData.buckets;

                    html += `
                        <table width="750" align="center" style="margin-top:${index > 0 ? '30px' : '0'}; border-collapse:collapse;">
                            <tr style="background:#f0f8ff;">
                                <td colspan="7" style="padding:10px;border:1px solid #ddd;">
                                    <strong style="font-size:16px;">${supplier.name} (${supplier.code})</strong>
                                    <span style="float:right;color:#dc3545;font-weight:bold;">Total: ${currency}${buckets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </td>
                            </tr>
                            <tr style="font-size:12px;background:#f8f9fa;">
                                <th style="padding:5px;border:1px solid #ddd;">Invoice #</th>
                                <th style="padding:5px;border:1px solid #ddd;">Invoice Date</th>
                                <th style="padding:5px;border:1px solid #ddd;">Due Date</th>
                                <th style="padding:5px;border:1px solid #ddd;text-align:center;">Days Overdue</th>
                                <th style="padding:5px;border:1px solid #ddd;text-align:right;">Total</th>
                                <th style="padding:5px;border:1px solid #ddd;text-align:right;">Paid</th>
                                <th style="padding:5px;border:1px solid #ddd;text-align:right;">Balance</th>
                            </tr>
                    `;

                    $.each(invoices, (idx, invoice) => {
                        let overdueColor = '';
                        if (invoice.days_overdue > 90) overdueColor = '#dc3545';
                        else if (invoice.days_overdue > 60) overdueColor = '#fd7e14';
                        else if (invoice.days_overdue > 30) overdueColor = '#ffc107';

                        html += `
                            <tr style="font-size:12px;">
                                <td style="padding:5px;border:1px solid #ddd;">${invoice.invoice_number}</td>
                                <td style="padding:5px;border:1px solid #ddd;">${this.formatDate(invoice.invoice_date)}</td>
                                <td style="padding:5px;border:1px solid #ddd;">${this.formatDate(invoice.due_date)}</td>
                                <td style="padding:5px;border:1px solid #ddd;text-align:center;color:${overdueColor};">${invoice.days_overdue} days</td>
                                <td style="padding:5px;border:1px solid #ddd;text-align:right;">${currency}${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style="padding:5px;border:1px solid #ddd;text-align:right;">${currency}${invoice.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style="padding:5px;border:1px solid #ddd;text-align:right;color:${overdueColor};">${currency}${invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `;
                    });

                    html += '</table>';
                });
            }

            html += '</div>';
            return html;
        },

        generateSupplierReportHTML: function (supplierData) {
            const currency = TempleCore.getCurrency();
            const asOfDate = $('#asOfDate').val();

            let invoicesHTML = '';
            if (supplierData.invoices) {
                invoicesHTML = `
                    <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                        <thead>
                            <tr style="font-size: 14px;">
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;">Invoice #</th>
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;">Invoice Date</th>
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;">Due Date</th>
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;text-align:center;">Days Overdue</th>
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;text-align:right;">Total</th>
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;text-align:right;">Paid</th>
                                <th style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;text-align:right;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                $.each(supplierData.invoices, (idx, invoice) => {
                    let overdueColor = '';
                    if (invoice.days_overdue > 90) overdueColor = '#dc3545';
                    else if (invoice.days_overdue > 60) overdueColor = '#fd7e14';
                    else if (invoice.days_overdue > 30) overdueColor = '#ffc107';

                    invoicesHTML += `
                        <tr style="font-size:14px;">
                            <td style="padding:5px;border-bottom:1px solid #ddd;">${invoice.invoice_number}</td>
                            <td style="padding:5px;border-bottom:1px solid #ddd;">${this.formatDate(invoice.invoice_date)}</td>
                            <td style="padding:5px;border-bottom:1px solid #ddd;">${this.formatDate(invoice.due_date)}</td>
                            <td style="padding:5px;border-bottom:1px solid #ddd;text-align:center;color:${overdueColor};">${invoice.days_overdue} days</td>
                            <td style="padding:5px;border-bottom:1px solid #ddd;text-align:right;">${currency}${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style="padding:5px;border-bottom:1px solid #ddd;text-align:right;">${currency}${invoice.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style="padding:5px;border-bottom:1px solid #ddd;text-align:right;color:${overdueColor};">${currency}${invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `;
                });

                invoicesHTML += '</tbody></table>';
            }

            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Supplier Due Report - ${supplierData.supplier.name}</title>
                    <style>
                        ${this.getPrintStyles()}
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="750" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="550"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    ${this.generatePrintHeader('Supplier Due Report')}
                    
                    <!-- Supplier Info -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Supplier:</b></td>
                            <td width="250"><strong>${supplierData.supplier.name}</strong></td>
                            <td width="150"><b>Code:</b></td>
                            <td width="200">${supplierData.supplier.code}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>As of Date:</b></td>
                            <td>${this.formatDate(asOfDate)}</td>
                            <td><b>Generated:</b></td>
                            <td>${this.formatDate(new Date().toISOString())}</td>
                        </tr>
                    </table>
                    
                    <!-- Aging Summary -->
                    <table width="750" align="center" style="margin-top:20px;">
                        <tr>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">Current (0-30 days)</div>
                                <div style="font-size:18px;font-weight:bold;">${currency}${(supplierData.buckets.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">31-60 Days</div>
                                <div style="font-size:18px;font-weight:bold;color:#ffc107;">${currency}${(supplierData.buckets['31_60_days'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">61-90 Days</div>
                                <div style="font-size:18px;font-weight:bold;color:#fd7e14;">${currency}${(supplierData.buckets['61_90_days'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td width="187.5" style="border:1px solid #ddd;padding:10px;text-align:center;">
                                <div style="font-size:12px;color:#666;">Over 90 Days</div>
                                <div style="font-size:18px;font-weight:bold;color:#dc3545;">${currency}${(supplierData.buckets.over_90_days || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </td>
                        </tr>
                    </table>
                    
                    ${invoicesHTML}
                    
                    <!-- Total -->
                    <table width="750" align="center" style="margin-top:20px; border-top:2px solid #000; padding-top:15px;">
                        <tr style="font-size: 16px;">
                            <td align="right" width="600"><strong>Total Amount Due:</strong></td>
                            <td align="right" width="150"><strong>${currency}${(supplierData.buckets.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        },

        generateStatementHTML: function (statementData) {
            const currency = TempleCore.getCurrency();
            const fromDate = statementData.period?.from || statementData.period?.from_date || statementData.from_date;
            const toDate = statementData.period?.to || statementData.period?.to_date || statementData.to_date;

            let transactionsHTML = '';
            if (statementData.transactions && statementData.transactions.length > 0) {
                $.each(statementData.transactions, (index, trans) => {
                    const transDate = trans.date ? this.formatDate(trans.date) : '';
                    transactionsHTML += `
                        <tr style="font-size:14px;">
                            <td style="padding:5px;border:1px solid #ddd;">${transDate}</td>
                            <td style="padding:5px;border:1px solid #ddd;">${trans.reference || trans.reference_number || ''}</td>
                            <td style="padding:5px;border:1px solid #ddd;">${trans.description || ''}</td>
                            <td align="right" style="padding:5px;border:1px solid #ddd;">${trans.debit > 0 ? currency + trans.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                            <td align="right" style="padding:5px;border:1px solid #ddd;">${trans.credit > 0 ? currency + trans.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                            <td align="right" style="padding:5px;border:1px solid #ddd;">${currency}${(trans.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `;
                });
            }

            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Statement of Account - ${statementData.supplier.name}</title>
                    <style>
                        ${this.getPrintStyles()}
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="750" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="550"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    ${this.generatePrintHeader('Statement of Account')}
                    
                    <!-- Supplier Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Supplier:</b></td>
                            <td width="250"><strong>${statementData.supplier.name}</strong></td>
                            <td width="150"><b>Period:</b></td>
                            <td width="200">${this.formatDate(fromDate)} to ${this.formatDate(toDate)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Address:</b></td>
                            <td>${statementData.supplier.address || 'N/A'}</td>
                            <td><b>Generated:</b></td>
                            <td>${this.formatDate(new Date().toISOString())}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Phone:</b></td>
                            <td>${statementData.supplier.mobile_no || 'N/A'}</td>
                            <td><b>Email:</b></td>
                            <td>${statementData.supplier.email || 'N/A'}</td>
                        </tr>
                    </table>
                    
                    <!-- Transactions Table -->
                    <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                        <thead>
                            <tr style="font-size: 14px;">
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;">Date</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;">Reference</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;">Description</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;text-align:right;">Debit</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;text-align:right;">Credit</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;text-align:right;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="font-size:14px;">
                                <td colspan="5" style="padding:5px;border:1px solid #ddd;background:#f0f0f0;"><b>Opening Balance</b></td>
                                <td align="right" style="padding:5px;border:1px solid #ddd;background:#f0f0f0;"><b>${currency}${(statementData.opening_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></td>
                            </tr>
                            ${transactionsHTML}
                        </tbody>
                        <tfoot>
                            <tr style="font-size:14px;background:#e9ecef;">
                                <td colspan="3" style="padding:8px;border:1px solid #000;"><b>TOTALS</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;"><b>${currency}${(statementData.total_invoices || statementData.total_purchases || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;"><b>${currency}${(statementData.total_payments || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;"><b>${currency}${(statementData.closing_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `;
        },

        getPrintStyles: function () {
            return `
                @media print {
                    #backButton, #printButton, #controlButtons {
                        display: none !important;
                    }
                    body {
                        margin: 0;
                        padding: 10px;
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
                
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                
                @media screen {
                    body {
                        max-width: 900px;
                        margin: 0 auto;
                    }
                }
            `;
        },

        formatDate: function (dateString) {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate().toString().padStart(2, '0')}/${months[date.getMonth()]}/${date.getFullYear()}`;
        },

        formatCurrency: function (amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        bindEvents: function () {
            const self = this;

            $('#applyFilters').on('click', function () {
                self.loadReport();
            });

            $('#viewType').on('change', function () {
                self.currentView = $(this).val();
            });

            // Print Report button
            $('#printReport').on('click', function () {
                self.printFullReport();
            });

            // Print Statement button in modal
            $('#printStatement').on('click', function () {
                self.printStatement();
            });
        }
    };

})(jQuery, window);