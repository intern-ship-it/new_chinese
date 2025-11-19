// js/pages/reports/cash-flow.js
// Cash Flow Report Page - With Financial Year Date Restrictions

(function($, window) {
    'use strict';
    
    window.ReportsCashFlowPage = {
        currentData: null,
        
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        init: function() {
            const self = this;
            this.render();
            
            // Load active year first, then initialize
            this.loadActiveYear().then(function() {
                self.bindEvents();
                self.loadInitialData();
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
                            <h4 class="page-title">Cash Flow Report</h4>
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
                                <h5 class="mb-0">Cash Flow Statement</h5>
                                <small id="reportPeriod"></small>
                            </div>
                            <div class="card-body">
                                <!-- Summary Card -->
                                <div class="row mb-4">
                                    <div class="col-md-12">
                                        <div class="card border-primary">
                                            <div class="card-body">
                                                <div class="row text-center">
                                                    <div class="col">
                                                        <h6>Opening Cash</h6>
                                                        <h4 id="openingCash">0.00</h4>
                                                    </div>
                                                    <div class="col">
                                                        <h6 class="text-success">Total Inflows</h6>
                                                        <h4 class="text-success" id="totalInflows">0.00</h4>
                                                    </div>
                                                    <div class="col">
                                                        <h6 class="text-danger">Total Outflows</h6>
                                                        <h4 class="text-danger" id="totalOutflows">0.00</h4>
                                                    </div>
                                                    <div class="col">
                                                        <h6>Net Cash Flow</h6>
                                                        <h4 id="netCashFlow">0.00</h4>
                                                    </div>
                                                    <div class="col">
                                                        <h6>Closing Cash</h6>
                                                        <h4 id="closingCash">0.00</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Cash Inflows -->
                                <div class="row">
                                    <div class="col-md-6">
                                        <h5 class="text-success">
                                            <i class="bi bi-arrow-down-circle"></i> Cash Inflows
                                        </h5>
                                        <div id="inflowsTable"></div>
                                    </div>
                                    
                                    <!-- Cash Outflows -->
                                    <div class="col-md-6">
                                        <h5 class="text-danger">
                                            <i class="bi bi-arrow-up-circle"></i> Cash Outflows
                                        </h5>
                                        <div id="outflowsTable"></div>
                                    </div>
                                </div>
                                
                                <!-- Detailed Transactions Toggle -->
                                <div class="mt-4">
                                    <button class="btn btn-outline-primary" type="button" data-bs-toggle="collapse" 
                                            data-bs-target="#detailedTransactions">
                                        <i class="bi bi-list-ul"></i> Show Detailed Transactions
                                    </button>
                                    <div class="collapse mt-3" id="detailedTransactions">
                                        <div id="detailedTransactionsContent"></div>
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
                        <i class="bi bi-info-circle"></i> No cash transactions found for the selected period.
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadInitialData: function() {
            // Dates are already set by setInitialDates() after FY load
            // Auto-generate report
            this.loadReport();
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
            
            if (!fromDate || !toDate) {
                TempleCore.showToast('Please select both dates', 'warning');
                return;
            }
            
            // Validate dates
            if (!this.validateDates()) {
                return;
            }
            
            $('#reportContent').hide();
            $('#noDataDiv').hide();
            $('#loadingDiv').show();
            $('.btn-success, .btn-danger, .btn-secondary').hide();
            
            TempleAPI.get('/accounts/reports/cash-flow', {
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
            // Check if there's any data
            const hasData = data.summary.total_inflows > 0 || data.summary.total_outflows > 0;
            
            if (!hasData) {
                $('#noDataDiv').show();
                return;
            }
            
            // Update period
            $('#reportPeriod').text(`From ${this.formatDisplayDate(data.from_date)} to ${this.formatDisplayDate(data.to_date)}`);
            
            // Update summary
            $('#openingCash').text(this.formatCurrency(data.summary.opening_cash));
            $('#totalInflows').text(this.formatCurrency(data.summary.total_inflows));
            $('#totalOutflows').text(this.formatCurrency(data.summary.total_outflows));
            
            const netFlow = data.summary.net_cash_flow;
            $('#netCashFlow')
                .text(this.formatCurrency(netFlow))
                .removeClass('text-success text-danger')
                .addClass(netFlow >= 0 ? 'text-success' : 'text-danger');
            
            $('#closingCash').text(this.formatCurrency(data.summary.closing_cash));
            
            // Build inflows table
            let inflowsHtml = `
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Category</th>
                            <th class="text-end">Amount</th>
                            <th class="text-end">%</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            Object.keys(data.cash_flows.inflows).forEach(key => {
                const category = data.cash_flows.inflows[key];
                if (category.amount > 0) {
                    const percentage = (category.amount / data.summary.total_inflows * 100).toFixed(1);
                    inflowsHtml += `
                        <tr class="cursor-pointer" onclick="ReportsCashFlowPage.showTransactions('inflows', '${key}')">
                            <td>
                                <i class="bi bi-chevron-right"></i> ${category.name}
                                <span class="badge bg-secondary ms-2">${category.transactions.length}</span>
                            </td>
                            <td class="text-end">${this.formatCurrency(category.amount)}</td>
                            <td class="text-end">${percentage}%</td>
                        </tr>
                    `;
                }
            });
            
            inflowsHtml += `
                    </tbody>
                    <tfoot class="table-success">
                        <tr>
                            <th>Total Inflows</th>
                            <th class="text-end">${this.formatCurrency(data.summary.total_inflows)}</th>
                            <th class="text-end">100%</th>
                        </tr>
                    </tfoot>
                </table>
            `;
            
            $('#inflowsTable').html(inflowsHtml);
            
            // Build outflows table
            let outflowsHtml = `
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Category</th>
                            <th class="text-end">Amount</th>
                            <th class="text-end">%</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            Object.keys(data.cash_flows.outflows).forEach(key => {
                const category = data.cash_flows.outflows[key];
                if (category.amount > 0) {
                    const percentage = (category.amount / data.summary.total_outflows * 100).toFixed(1);
                    outflowsHtml += `
                        <tr class="cursor-pointer" onclick="ReportsCashFlowPage.showTransactions('outflows', '${key}')">
                            <td>
                                <i class="bi bi-chevron-right"></i> ${category.name}
                                <span class="badge bg-secondary ms-2">${category.transactions.length}</span>
                            </td>
                            <td class="text-end">${this.formatCurrency(category.amount)}</td>
                            <td class="text-end">${percentage}%</td>
                        </tr>
                    `;
                }
            });
            
            outflowsHtml += `
                    </tbody>
                    <tfoot class="table-danger">
                        <tr>
                            <th>Total Outflows</th>
                            <th class="text-end">${this.formatCurrency(data.summary.total_outflows)}</th>
                            <th class="text-end">100%</th>
                        </tr>
                    </tfoot>
                </table>
            `;
            
            $('#outflowsTable').html(outflowsHtml);
            
            // Build detailed transactions (hidden by default)
            this.buildDetailedTransactions(data);
            
            $('#reportContent').show();
            $('.btn-success, .btn-danger, .btn-secondary').show();
        },
        
        buildDetailedTransactions: function(data) {
            let html = '<div class="accordion" id="transactionAccordion">';
            
            // Inflows
            html += '<h6 class="text-success mt-3">Cash Inflows - Detailed</h6>';
            Object.keys(data.cash_flows.inflows).forEach((key, index) => {
                const category = data.cash_flows.inflows[key];
                if (category.transactions.length > 0) {
                    html += this.buildCategoryAccordion(category, `inflow_${key}`, index);
                }
            });
            
            // Outflows
            html += '<h6 class="text-danger mt-3">Cash Outflows - Detailed</h6>';
            Object.keys(data.cash_flows.outflows).forEach((key, index) => {
                const category = data.cash_flows.outflows[key];
                if (category.transactions.length > 0) {
                    html += this.buildCategoryAccordion(category, `outflow_${key}`, index + 10);
                }
            });
            
            html += '</div>';
            
            $('#detailedTransactionsContent').html(html);
        },
        
        buildCategoryAccordion: function(category, key, index) {
            let html = `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#collapse_${key}">
                            ${category.name} - ${this.formatCurrency(category.amount)}
                            <span class="badge bg-primary ms-2">${category.transactions.length} transactions</span>
                        </button>
                    </h2>
                    <div id="collapse_${key}" class="accordion-collapse collapse" 
                         data-bs-parent="#transactionAccordion">
                        <div class="accordion-body">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Entry Code</th>
                                        <th>Ledger</th>
                                        <th>Narration</th>
                                        <th class="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            category.transactions.forEach(t => {
                html += `
                    <tr>
                        <td>${this.formatDisplayDate(t.date)}</td>
                        <td>${t.code}</td>
                        <td>${t.ledger}</td>
                        <td>${t.narration || '-'}</td>
                        <td class="text-end">${this.formatCurrency(t.amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            return html;
        },
        
        showTransactions: function(type, category) {
            const data = this.currentData;
            if (!data) return;
            
            const categoryData = data.cash_flows[type][category];
            if (!categoryData || categoryData.transactions.length === 0) return;
            
            // Expand the detailed transactions section
            const collapse = new bootstrap.Collapse(document.getElementById('detailedTransactions'), {
                show: true
            });
            
            // Scroll to and expand the specific category
            setTimeout(() => {
                const targetId = `collapse_${type.slice(0, -1)}_${category}`;
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    // Expand the specific accordion item
                    const accordionButton = targetElement.previousElementSibling.querySelector('.accordion-button');
                    if (accordionButton && accordionButton.classList.contains('collapsed')) {
                        accordionButton.click();
                    }
                    
                    // Scroll to view
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 500);
        },
        
        exportReport: function(type) {
            if (!this.currentData) {
                TempleCore.showToast('Please generate the report first', 'warning');
                return;
            }
            
            // Validate dates before export
            if (!this.validateDates()) {
                return;
            }
            
            const params = {
                format: type,
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val()
            };
            
            TempleCore.showLoading(true);
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/accounts/reports/cash-flow/export',
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
                    let filename = 'cash_flow_report.' + (type === 'pdf' ? 'pdf' : 'xlsx');
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
                    
                    TempleCore.showToast(`Cash Flow Report exported successfully`, 'success');
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
            if (!this.currentData) {
                TempleCore.showToast('Please generate the report first', 'warning');
                return;
            }
            
            // Validate dates before print
            if (!this.validateDates()) {
                return;
            }
            
            const printContent = document.getElementById('reportContent').innerHTML;
            const templeInfo = JSON.parse(localStorage.getItem('temple') || '{}');
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Cash Flow Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            .table { font-size: 11px; }
                            .btn { display: none !important; }
                            .accordion-button { display: none !important; }
                            .accordion-collapse { display: block !important; }
                            @page {
                                size: landscape;
                                margin: 0.5in;
                            }
                        }
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        h2 {
                            color: #333;
                            border-bottom: 2px solid #333;
                            padding-bottom: 10px;
                        }
                        .header-info {
                            margin-bottom: 20px;
                        }
                        .header-info p {
                            margin: 5px 0;
                        }
                        .cursor-pointer { cursor: default !important; }
                    </style>
                </head>
                <body>
                    <div class="container-fluid">
                        <div class="header-info text-center">
                            <h2>${templeInfo.name || 'Temple Management System'}</h2>
                            <h3>Cash Flow Statement</h3>
                            <p>Period: ${$('#fromDate').val()} to ${$('#toDate').val()}</p>
                        </div>
                        ${printContent}
                        <div class="mt-4">
                            <small>Generated on: ${new Date().toLocaleString('en-IN')}</small>
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            // Show all accordion content for printing
                            document.querySelectorAll('.accordion-collapse').forEach(function(el) {
                                el.classList.add('show');
                            });
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
                </html>
            `);
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