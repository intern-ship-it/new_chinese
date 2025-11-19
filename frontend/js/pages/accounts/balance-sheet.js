// js/pages/reports/balance-sheet.js
// Balance Sheet Report Page - With Financial Year Date Restrictions

(function($, window) {
    'use strict';
    
    window.AccountsBalanceSheetPage = {
        reportData: null,
        active_year: null,
        
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        init: function() {
            const self = this;
            this.render();
            
            // Load active year first, then initialize
            this.loadActiveYear().then(function() {
                self.bindEvents();
                self.loadDefaults();
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
                        self.active_year = response.data.active_year; // Keep backward compatibility
                        self.isYearClosed = self.activeYear.has_closed == 1;
                        
                        // Set initial date value
                        self.setInitialDate();
                        
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
        
        setInitialDate: function() {
            let asOnDate;
            
            if (this.isYearClosed) {
                // Year is closed - use FY end date
                asOnDate = this.activeYear.to_year_month;
            } else {
                // Year is open - use current date or FY end, whichever is earlier
                const toYearMonth = new Date(this.activeYear.to_year_month);
                const currentDate = new Date();
                
                if (currentDate > toYearMonth) {
                    asOnDate = this.activeYear.to_year_month;
                } else {
                    asOnDate = this.formatDateValue(currentDate);
                }
            }
            
            $('#asOnDate').val(asOnDate);
        },
        
        applyDateRestrictions: function() {
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            // Set minimum date to FY start
            $('#asOnDate').attr('min', fromYearMonth);
            
            if (this.isYearClosed) {
                // Year closed - restrict to FY range
                $('#asOnDate').attr('max', toYearMonth);
            } else {
                // Year open - no max restriction
                $('#asOnDate').removeAttr('max');
            }
        },
        
        formatDateValue: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        
        validateDate: function() {
            const asOnDate = $('#asOnDate').val();
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            if (!asOnDate) {
                TempleCore.showToast('Please select a date', 'warning');
                return false;
            }
            
            // Check date is not before financial year start
            if (asOnDate < fromYearMonth) {
                TempleCore.showToast('Date cannot be before financial year start date', 'warning');
                return false;
            }
            
            // Check date doesn't exceed financial year if closed
            if (this.isYearClosed && asOnDate > toYearMonth) {
                TempleCore.showToast('Date cannot be after financial year end date', 'warning');
                return false;
            }
            
            return true;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-12">
                            <h2 class="page-title">
                                <i class="bi bi-file-earmark-spreadsheet"></i> Balance Sheet Report
                            </h2>
                        </div>
                    </div>
                    
                    <!-- Filter Section -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="balanceSheetForm">
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">As On Date</label>
                                            <input type="date" class="form-control" id="asOnDate">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Format</label>
                                            <select class="form-select" id="reportFormat">
                                                <option value="detailed">Detailed (All Ledgers)</option>
                                                <option value="grouped">Grouped (By Categories)</option>
                                                <option value="condensed">Condensed (Summary Only)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Display Options</label>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="showPreviousYear" checked>
                                                <label class="form-check-label" for="showPreviousYear">
                                                    Show Previous Year Column
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="showZeroBalances">
                                                <label class="form-check-label" for="showZeroBalances">
                                                    Show Zero Balance Accounts
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12">
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-search"></i> Generate Report
                                        </button>
                                        <button type="button" class="btn btn-success ms-2" id="exportExcel" disabled>
                                            <i class="bi bi-file-earmark-excel"></i> Export Excel
                                        </button>
                                        <button type="button" class="btn btn-danger ms-2" id="exportPdf" disabled>
                                            <i class="bi bi-file-earmark-pdf"></i> Export PDF
                                        </button>
                                        <button type="button" class="btn btn-info ms-2" id="printReport" disabled>
                                            <i class="bi bi-printer"></i> Print
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Report Content -->
                    <div id="reportContent"></div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadDefaults: function() {
            // After date is set and restrictions applied, auto-generate report
            this.generateReport();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Form submission
            $('#balanceSheetForm').on('submit', function(e) {
                e.preventDefault();
                
                // Validate date before generating report
                if (!self.validateDate()) {
                    return;
                }
                
                self.generateReport();
            });
            
            // Export buttons
            $('#exportExcel').on('click', function() {
                // Validate date before export
                if (!self.validateDate()) {
                    return;
                }
                self.exportReport('excel');
            });
            
            $('#exportPdf').on('click', function() {
                // Validate date before export
                if (!self.validateDate()) {
                    return;
                }
                self.exportReport('pdf');
            });
            
            $('#printReport').on('click', function() {
                // Validate date before print
                if (!self.validateDate()) {
                    return;
                }
                self.printReport();
            });
            
            // Toggle group expansion
            $(document).on('click', '.toggle-group', function() {
                const groupId = $(this).data('group-id');
                const $icon = $(this).find('i');
                const $childRows = $(`.child-of-${groupId}`);
                
                if ($icon.hasClass('bi-chevron-down')) {
                    $icon.removeClass('bi-chevron-down').addClass('bi-chevron-right');
                    $childRows.hide();
                } else {
                    $icon.removeClass('bi-chevron-right').addClass('bi-chevron-down');
                    $childRows.show();
                }
            });
        },
        
        generateReport: function() {
            const self = this;
            
            const params = {
                date: $('#asOnDate').val()
            };
            
            if (!params.date) {
                TempleCore.showToast('Please select a date', 'warning');
                return;
            }
            
            // Validate date
            if (!this.validateDate()) {
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/reports/balance-sheet', params)
                .done(function(response) {
                    if (response.success) {
                        self.reportData = response.data;
                        self.renderReport(response.data);
                        // Enable export buttons
                        $('#exportExcel, #exportPdf, #printReport').prop('disabled', false);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to generate report', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while generating report', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        renderReport: function(data) {
            const self = this;
            const showPrevious = $('#showPreviousYear').is(':checked');
            const showZero = $('#showZeroBalances').is(':checked');
            const format = $('#reportFormat').val();
            
            let html = `
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">Balance Sheet as on ${this.formatDate(data.as_on_date)}</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <!-- Assets Side -->
                            <div class="${showPrevious ? 'col-md-6' : 'col-md-12'}">
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <thead class="table-dark">
                                            <tr>
                                                <th colspan="${showPrevious ? '3' : '2'}" class="text-center">ASSETS</th>
                                            </tr>
                                            <tr>
                                                <th>Particulars</th>
                                                ${showPrevious ? '<th width="120" class="text-end">Previous Year</th>' : ''}
                                                <th width="120" class="text-end">Current Year</th>
                                            </tr>
                                        </thead>
                                        <tbody>
            `;
            
            // Render Assets
            const assetsGroup = data.balance_sheet.find(g => g.code === '1000');
            if (assetsGroup) {
                html += this.renderBalanceSheetGroup(assetsGroup, 0, showPrevious, showZero, format);
            }
            
            // Total Assets
            html += `
                                            <tr class="table-info">
                                                <td><strong>TOTAL ASSETS</strong></td>
                                                ${showPrevious ? `<td class="text-end"><strong>${this.formatAmount(data.totals.assets.previous)}</strong></td>` : ''}
                                                <td class="text-end"><strong>${this.formatAmount(data.totals.assets.current)}</strong></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <!-- Liabilities & Equity Side -->
                            <div class="${showPrevious ? 'col-md-6' : 'col-md-12'}">
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <thead class="table-dark">
                                            <tr>
                                                <th colspan="${showPrevious ? '3' : '2'}" class="text-center">LIABILITIES & EQUITY</th>
                                            </tr>
                                            <tr>
                                                <th>Particulars</th>
                                                ${showPrevious ? '<th width="120" class="text-end">Previous Year</th>' : ''}
                                                <th width="120" class="text-end">Current Year</th>
                                            </tr>
                                        </thead>
                                        <tbody>
            `;
            
            // Render Liabilities
            const liabilitiesGroup = data.balance_sheet.find(g => g.code === '2000');
            if (liabilitiesGroup) {
                html += this.renderBalanceSheetGroup(liabilitiesGroup, 0, showPrevious, showZero, format);
            }
            
            // Subtotal Liabilities
            html += `
                                            <tr class="table-secondary">
                                                <td><strong>Total Liabilities</strong></td>
                                                ${showPrevious ? `<td class="text-end"><strong>${this.formatAmount(data.totals.liabilities.previous)}</strong></td>` : ''}
                                                <td class="text-end"><strong>${this.formatAmount(data.totals.liabilities.current)}</strong></td>
                                            </tr>
            `;
            
            // Render Equity
            const equityGroup = data.balance_sheet.find(g => g.code === '3000');
            if (equityGroup) {
                html += this.renderBalanceSheetGroup(equityGroup, 0, showPrevious, showZero, format);
                
                // Add Current P&L if exists
                if (equityGroup.profit_loss) {
                    const plClass = equityGroup.profit_loss.current >= 0 ? 'text-success' : 'text-danger';
                    html += `
                        <tr>
                            <td>&nbsp;&nbsp;&nbsp;&nbsp;<em>${equityGroup.profit_loss.name}</em></td>
                            ${showPrevious ? `<td class="text-end">-</td>` : ''}
                            <td class="text-end ${plClass}"><strong>${equityGroup.profit_loss.current >= 0 ? '(' + this.formatAmount(Math.abs(equityGroup.profit_loss.current)) + ')' : this.formatAmount(Math.abs(equityGroup.profit_loss.current))}</strong></td>
                        </tr>
                    `;
                }
            }
            
            // Subtotal Equity
            html += `
                                            <tr class="table-secondary">
                                                <td><strong>Total Equity</strong></td>
                                                ${showPrevious ? `<td class="text-end"><strong>${this.formatAmount(data.totals.equity.previous)}</strong></td>` : ''}
                                                <td class="text-end"><strong>${this.formatAmount(data.totals.equity.current)}</strong></td>
                                            </tr>
            `;
            
            // Total Liabilities & Equity
            const totalLiabilitiesEquity = {
                current: data.totals.liabilities.current + data.totals.equity.current,
                previous: data.totals.liabilities.previous + data.totals.equity.previous
            };
            
            html += `
                                            <tr class="table-info">
                                                <td><strong>TOTAL LIABILITIES & EQUITY</strong></td>
                                                ${showPrevious ? `<td class="text-end"><strong>${this.formatAmount(totalLiabilitiesEquity.previous)}</strong></td>` : ''}
                                                <td class="text-end"><strong>${this.formatAmount(totalLiabilitiesEquity.current)}</strong></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Balance Check -->
                        <div class="mt-4">
                            ${this.renderBalanceCheck(data.totals, totalLiabilitiesEquity)}
                        </div>
                    </div>
                </div>
            `;
            
            $('#reportContent').html(html);
        },
        
        renderBalanceSheetGroup: function(group, level, showPrevious, showZero, format) {
            const self = this;
            let html = '';
            const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
            
            // Skip if zero and not showing zero balances
            if (!showZero && group.current_balance == 0 && group.previous_balance == 0) {
                return '';
            }
            
            // Group header (only for non-root groups or detailed format)
            if (level > 0 || format === 'detailed') {
                html += `
                    <tr class="${level === 0 ? 'table-primary' : ''}">
                        <td>${indent}<strong>${group.name}</strong></td>
                        ${showPrevious ? `<td class="text-end">${level === 0 ? '' : self.formatAmount(group.previous_balance)}</td>` : ''}
                        <td class="text-end">${level === 0 ? '' : self.formatAmount(group.current_balance)}</td>
                    </tr>
                `;
            }
            
            // Render ledgers (only in detailed format)
            if (format === 'detailed') {
                group.ledgers.forEach(function(ledger) {
                    if (!showZero && ledger.current_balance == 0 && ledger.previous_balance == 0) {
                        return;
                    }
                    
                    html += `
                        <tr>
                            <td><a href="${TempleCore.getTempleBaseUrl().full + '/accounts/general-ledger?ledger=' + ledger.id + '&from=' + self.active_year.from_year_month + '&to=' + $('#asOnDate').val()}" target="_blank">${indent}&nbsp;&nbsp;&nbsp;&nbsp;${ledger.name}</a></td>
                            ${showPrevious ? `<td class="text-end">${self.formatAmount(ledger.previous_balance)}</td>` : ''}
                            <td class="text-end">${self.formatAmount(ledger.current_balance)}</td>
                        </tr>
                    `;
                });
            }
            
            // Render child groups
            if (format !== 'condensed') {
                group.children.forEach(function(childGroup) {
                    html += self.renderBalanceSheetGroup(childGroup, level + 1, showPrevious, showZero, format);
                });
            }
            
            return html;
        },
        
        renderBalanceCheck: function(totals, totalLiabilitiesEquity) {
            const isBalanced = Math.abs(totals.assets.current + totalLiabilitiesEquity.current) < 0.01;
            const difference = Math.abs(totals.assets.current + totalLiabilitiesEquity.current);
            
            return `
                <div class="alert ${isBalanced ? 'alert-success' : 'alert-danger'}">
                    <i class="bi ${isBalanced ? 'bi-check-circle' : 'bi-x-circle'}"></i>
                    <strong>Balance Sheet is ${isBalanced ? 'BALANCED' : 'NOT BALANCED'}</strong>
                    ${!isBalanced ? `<br>Difference: ${this.formatAmount(difference)}` : ''}
                </div>
            `;
        },
        
        formatAmount: function(amount) {
            if (amount == 0) return '-';
            const isNegative = amount < 0;
            const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            return isNegative ? `(${formattedAmount})` : formattedAmount;
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        },
        
        exportReport: function(type) {
            if (!this.reportData) {
                TempleCore.showToast('Please generate the report first', 'warning');
                return;
            }
            
            // Validate date before export
            if (!this.validateDate()) {
                return;
            }
            
            const params = {
                format: type,
                date: $('#asOnDate').val(),
                show_previous_year: $('#showPreviousYear').is(':checked'),
                show_zero_balances: $('#showZeroBalances').is(':checked'),
                report_format: $('#reportFormat').val()
            };
            
            TempleCore.showLoading(true);
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/accounts/reports/balance-sheet/export',
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
                    let filename = 'balance_sheet.' + (type === 'pdf' ? 'pdf' : 'xlsx');
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
                    
                    TempleCore.showToast(`Balance Sheet exported successfully`, 'success');
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
            if (!this.reportData) {
                TempleCore.showToast('Please generate the report first', 'warning');
                return;
            }
            
            // Validate date before print
            if (!this.validateDate()) {
                return;
            }
            
            const printContent = document.getElementById('reportContent').innerHTML;
            const templeInfo = JSON.parse(localStorage.getItem('temple') || '{}');
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Balance Sheet Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            .table { font-size: 11px; }
                            .card { border: none; }
                            @page {
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
                    </style>
                </head>
                <body>
                    <div class="container-fluid">
                        <div class="header-info text-center">
                            <h2>${templeInfo.name || 'Temple Management System'}</h2>
                            <h3>Balance Sheet</h3>
                            <p>As on: ${$('#asOnDate').val()}</p>
                        </div>
                        ${printContent}
                        <div class="mt-4">
                            <small>Generated on: ${new Date().toLocaleString('en-IN')}</small>
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
                </html>
            `);
        }
    };
    
})(jQuery, window);