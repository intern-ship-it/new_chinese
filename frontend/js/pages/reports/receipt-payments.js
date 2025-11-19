// js/pages/reports/receipt-payments.js
// Receipt & Payments Report Page - With Financial Year Date Restrictions

(function($, window) {
    'use strict';
    
    window.ReportsReceiptPaymentsPage = {
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        init: function() {
            const self = this;
            this.currentData = null;
            this.render();
            
            // Load active year first, then initialize
            this.loadActiveYear().then(function() {
                self.bindEvents();
            }).fail(function() {
                TempleCore.showToast('Failed to load financial year data', 'error');
            });
        },
        
        loadActiveYear: function() {
            const self = this;
            const deferred = $.Deferred();
            
            TempleAPI.get('/accounts/chart-of-accounts/active_year')
                .done(function(response) {
                    if (response.success && response.data.active_year) {
                        self.activeYear = response.data.active_year;
                        self.isYearClosed = self.activeYear.has_closed == 1;
                        
                        // Set initial date values
                        self.setInitialDates();
                        
                        // Apply date restrictions
                        self.applyDateRestrictions();
                        
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                })
                .fail(function() {
                    deferred.reject();
                });
            
            return deferred.promise();
        },
        
        setInitialDates: function() {
            const fromYearMonth = this.activeYear.from_year_month;
            let toDate;
            
            // Default values based on financial year status
            if (this.isYearClosed) {
                toDate = this.activeYear.to_year_month;
            } else {
                const toYearMonth = new Date(this.activeYear.to_year_month);
                const currentDate = new Date();
                
                if (toYearMonth > currentDate) {
                    toDate = this.activeYear.to_year_month;
                } else {
                    toDate = this.formatDateValue(currentDate);
                }
            }
            
            $('#fromDate').val(fromYearMonth);
            $('#toDate').val(toDate);
        },
        
        getDefaultToDate: function() {
            if (this.isYearClosed) {
                return this.activeYear.to_year_month;
            } else {
                const toYearMonth = new Date(this.activeYear.to_year_month);
                const currentDate = new Date();
                
                if (toYearMonth > currentDate) {
                    return this.activeYear.to_year_month;
                } else {
                    return this.formatDateValue(currentDate);
                }
            }
        },
        
        applyDateRestrictions: function() {
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            if (this.isYearClosed) {
                // Year closed restrictions
                $('#fromDate').attr('min', fromYearMonth);
                $('#fromDate').attr('max', toYearMonth);
                
                $('#toDate').attr('min', fromYearMonth);
                $('#toDate').attr('max', toYearMonth);
            } else {
                // Year open restrictions
                $('#fromDate').attr('min', fromYearMonth);
                $('#fromDate').removeAttr('max');
                
                $('#toDate').removeAttr('min');
                $('#toDate').removeAttr('max');
            }
        },
        
        formatDateValue: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        
        validateDates: function() {
            const fromDate = $('#fromDate').val();
            const toDate = $('#toDate').val();
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            if (!fromDate || !toDate) {
                TempleCore.showToast('Please select both from and to dates', 'warning');
                return false;
            }
            
            // Check from_date is not before financial year start
            if (fromDate < fromYearMonth) {
                TempleCore.showToast('From date cannot be before financial year start date', 'warning');
                return false;
            }
            
            // Check dates don't exceed financial year if closed
            if (this.isYearClosed) {
                if (fromDate > toYearMonth) {
                    TempleCore.showToast('From date cannot be after financial year end date', 'warning');
                    return false;
                }
                if (toDate > toYearMonth) {
                    TempleCore.showToast('To date cannot be after financial year end date', 'warning');
                    return false;
                }
            }
            
            // Check to_date is not before from_date
            if (toDate < fromDate) {
                TempleCore.showToast('To date cannot be before from date', 'warning');
                return false;
            }
            
            return true;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Receipt & Payments Report</h4>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-success" id="exportExcel" style="display: none;">
                                <i class="bi bi-file-earmark-excel"></i> Export Excel
                            </button>
                            <button class="btn btn-danger ms-2" id="exportPdf" style="display: none;">
                                <i class="bi bi-file-earmark-pdf"></i> Export PDF
                            </button>
                            <button class="btn btn-secondary ms-2" id="printReport" style="display: none;">
                                <i class="bi bi-printer"></i> Print
                            </button>
                        </div>
                    </div>
                    
                    <!-- Filter Card -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="filterForm">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">From Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="fromDate" required>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">To Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="toDate" required>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">&nbsp;</label>
                                        <div>
                                            <button type="submit" class="btn btn-primary">
                                                <i class="bi bi-search"></i> Generate Report
                                            </button>
                                            <button type="button" class="btn btn-outline-secondary ms-2" id="resetFilter">
                                                <i class="bi bi-arrow-clockwise"></i> Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Report Content -->
                    <div id="reportContent" style="display: none;">
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">Receipt & Payments Statement</h5>
                                <small id="reportPeriod"></small>
                            </div>
                            <div class="card-body">
                                <div id="reportTable"></div>
                                
                                <!-- Grand Totals -->
                                <div class="row mt-4">
                                    <div class="col-md-12">
                                        <table class="table table-bordered">
                                            <thead class="table-secondary">
                                                <tr>
                                                    <th colspan="2" class="text-center">Summary</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Total Opening Balance</strong></td>
                                                    <td class="text-end" id="totalOpening">0.00</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Total Receipts</strong></td>
                                                    <td class="text-end text-success" id="totalReceipts">0.00</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Total Payments</strong></td>
                                                    <td class="text-end text-danger" id="totalPayments">0.00</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Total Contra In</strong></td>
                                                    <td class="text-end text-info" id="totalContraIn">0.00</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Total Contra Out</strong></td>
                                                    <td class="text-end text-warning" id="totalContraOut">0.00</td>
                                                </tr>
                                                <tr class="table-primary">
                                                    <td><strong>Total Closing Balance</strong></td>
                                                    <td class="text-end"><strong id="totalClosing">0.00</strong></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Loading -->
                    <div id="loadingDiv" class="text-center py-5" style="display: none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Generating report...</p>
                    </div>
                    
                    <!-- No Data -->
                    <div id="noDataDiv" class="alert alert-info" style="display: none;">
                        <i class="bi bi-info-circle"></i> No data available for the selected period.
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Filter form submit
            $('#filterForm').on('submit', function(e) {
                e.preventDefault();
                
                // Validate dates before generating report
                if (!self.validateDates()) {
                    return;
                }
                
                self.loadReport();
            });
            
            // Reset filter
            $('#resetFilter').on('click', function() {
                self.setInitialDates();
                $('#reportContent').hide();
                $('#noDataDiv').hide();
                $('.btn-success, .btn-danger, .btn-secondary').hide();
            });
            
            // Export Excel
            $('#exportExcel').on('click', function() {
                // Validate dates before export
                if (!self.validateDates()) {
                    return;
                }
                self.exportReport('excel');
            });
            
            // Export PDF
            $('#exportPdf').on('click', function() {
                // Validate dates before export
                if (!self.validateDates()) {
                    return;
                }
                self.exportReport('pdf');
            });
            
            // Print
            $('#printReport').on('click', function() {
                // Validate dates before print
                if (!self.validateDates()) {
                    return;
                }
                self.printReport();
            });
        },
        
        loadReport: function() {
            const self = this;
            const fromDate = $('#fromDate').val();
            const toDate = $('#toDate').val();
            
            $('#reportContent').hide();
            $('#noDataDiv').hide();
            $('#loadingDiv').show();
            $('.btn-success, .btn-danger, .btn-secondary').hide();
            
            TempleAPI.get('/accounts/reports/receipt-payments', {
                from_date: fromDate,
                to_date: toDate
            })
            .done(function(response) {
                if (response.success) {
                    self.currentData = response.data;
                    self.displayReport(response.data);
                } else {
                    TempleCore.showToast(response.message || 'Failed to load report', 'error');
                }
            })
            .fail(function() {
                TempleCore.showToast('Error loading report', 'error');
            })
            .always(function() {
                $('#loadingDiv').hide();
            });
        },
        
        displayReport: function(data) {
            if (!data.accounts || data.accounts.length === 0) {
                $('#noDataDiv').show();
                return;
            }
            
            // Update period
            $('#reportPeriod').text(`From ${this.formatDisplayDate(data.from_date)} to ${this.formatDisplayDate(data.to_date)}`);
            
            // Build accounts table
            let tableHtml = '';
            
            data.accounts.forEach((account, index) => {
                tableHtml += `
                    <div class="mb-4">
                        <h6 class="text-primary">
                            <i class="bi bi-bank"></i> ${account.account.name} 
                            <small class="text-muted">(${account.account.code})</small>
                        </h6>
                        <table class="table table-sm table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Entry Code</th>
                                    <th>Party/Description</th>
                                    <th>Narration</th>
                                    <th class="text-end">Receipts</th>
                                    <th class="text-end">Payments</th>
                                    <th class="text-end">Contra In</th>
                                    <th class="text-end">Contra Out</th>
                                    <th class="text-end">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="table-secondary">
                                    <td colspan="4"><strong>Opening Balance</strong></td>
                                    <td colspan="4"></td>
                                    <td class="text-end"><strong>${this.formatCurrency(account.opening_balance)}</strong></td>
                                </tr>
                `;
                
                let runningBalance = account.opening_balance;
                
                // Combine all transactions and sort by date
                const allTransactions = [];
                
                account.receipts.forEach(r => {
                    allTransactions.push({
                        date: r.date,
                        code: r.entry_code,
                        party: r.paid_to,
                        narration: r.narration,
                        type: 'receipt',
                        amount: r.amount
                    });
                });
                
                account.payments.forEach(p => {
                    allTransactions.push({
                        date: p.date,
                        code: p.entry_code,
                        party: p.paid_to,
                        narration: p.narration,
                        type: 'payment',
                        amount: p.amount
                    });
                });
                
                account.contra_in.forEach(c => {
                    allTransactions.push({
                        date: c.date,
                        code: c.entry_code,
                        party: 'Transfer In',
                        narration: c.narration,
                        type: 'contra_in',
                        amount: c.amount
                    });
                });
                
                account.contra_out.forEach(c => {
                    allTransactions.push({
                        date: c.date,
                        code: c.entry_code,
                        party: 'Transfer Out',
                        narration: c.narration,
                        type: 'contra_out',
                        amount: c.amount
                    });
                });
                
                // Sort by date
                allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Display transactions
                allTransactions.forEach(t => {
                    if (t.type === 'receipt') runningBalance += parseFloat(t.amount);
                    else if (t.type === 'payment') runningBalance -= parseFloat(t.amount);
                    else if (t.type === 'contra_in') runningBalance += parseFloat(t.amount);
                    else if (t.type === 'contra_out') runningBalance -= parseFloat(t.amount);
                    
                    tableHtml += `
                        <tr>
                            <td>${this.formatDisplayDate(t.date)}</td>
                            <td>${t.code}</td>
                            <td>${t.party || '-'}</td>
                            <td>${t.narration || '-'}</td>
                            <td class="text-end">${t.type === 'receipt' ? this.formatCurrency(t.amount) : '-'}</td>
                            <td class="text-end">${t.type === 'payment' ? this.formatCurrency(t.amount) : '-'}</td>
                            <td class="text-end">${t.type === 'contra_in' ? this.formatCurrency(t.amount) : '-'}</td>
                            <td class="text-end">${t.type === 'contra_out' ? this.formatCurrency(t.amount) : '-'}</td>
                            <td class="text-end">${this.formatCurrency(runningBalance)}</td>
                        </tr>
                    `;
                });
                
                // Account totals
                tableHtml += `
                    <tr class="table-info">
                        <td colspan="4"><strong>Total</strong></td>
                        <td class="text-end"><strong>${this.formatCurrency(account.total_receipts)}</strong></td>
                        <td class="text-end"><strong>${this.formatCurrency(account.total_payments)}</strong></td>
                        <td class="text-end"><strong>${this.formatCurrency(account.total_contra_in)}</strong></td>
                        <td class="text-end"><strong>${this.formatCurrency(account.total_contra_out)}</strong></td>
                        <td class="text-end"><strong>${this.formatCurrency(account.closing_balance)}</strong></td>
                    </tr>
                `;
                
                tableHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            });
            
            $('#reportTable').html(tableHtml);
            
            // Update grand totals
            $('#totalOpening').text(this.formatCurrency(data.grand_totals.opening_balance));
            $('#totalReceipts').text(this.formatCurrency(data.grand_totals.total_receipts));
            $('#totalPayments').text(this.formatCurrency(data.grand_totals.total_payments));
            $('#totalContraIn').text(this.formatCurrency(data.grand_totals.total_contra_in));
            $('#totalContraOut').text(this.formatCurrency(data.grand_totals.total_contra_out));
            $('#totalClosing').text(this.formatCurrency(data.grand_totals.closing_balance));
            
            $('#reportContent').show();
            $('.btn-success, .btn-danger, .btn-secondary').show();
        },
        
        exportReport: function(type) {
            if (!this.currentData) {
                TempleCore.showToast('Please generate the report first', 'warning');
                return;
            }
            
            const params = {
                format: type,
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val()
            };
            
            TempleCore.showLoading(true);
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/accounts/reports/receipt-payments/export',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'Content-Type': 'application/json',
                    'X-Temple-ID': TempleAPI.getTempleId()
                },
                data: JSON.stringify(params),
                xhrFields: {
                    responseType: 'blob'
                },
                success: function(data, status, xhr) {
                    const disposition = xhr.getResponseHeader('Content-Disposition');
                    let filename = 'receipt_payment_report.' + (type === 'pdf' ? 'pdf' : 'xlsx');
                    if (disposition && disposition.indexOf('filename=') !== -1) {
                        filename = disposition.split('filename=')[1].replace(/"/g, '');
                    }
                    
                    const blob = new Blob([data], {
                        type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    
                    TempleCore.showToast(`Receipt and Payment Report exported successfully`, 'success');
                },
                error: function(xhr) {
                    let errorMessage = 'Failed to export report';
                    try {
                        const reader = new FileReader();
                        reader.onload = function() {
                            try {
                                const error = JSON.parse(reader.result);
                                if (error.message) {
                                    errorMessage = error.message;
                                }
                            } catch(e) {
                                // Use default error message
                            }
                            TempleCore.showToast(errorMessage, 'error');
                        };
                        reader.readAsText(xhr.responseJSON || new Blob());
                    } catch(e) {
                        TempleCore.showToast(errorMessage, 'error');
                    }
                },
                complete: function() {
                    TempleCore.showLoading(false);
                }
            });
        },
        
        printReport: function() {
            window.print();
        },
        
        formatDate: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        
        formatDisplayDate: function(date) {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        },
        
        formatCurrency: function(amount) {
            return TempleCore.formatCurrency(amount);
        }
    };
    
})(jQuery, window);