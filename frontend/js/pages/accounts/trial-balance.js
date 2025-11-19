// js/pages/reports/trial-balance.js
// Trial Balance Report Page - With Financial Year Date Restrictions

(function($, window) {
    'use strict';
    
    window.AccountsTrialBalancePage = {
        reportData: null,
        
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
            
            // Add change event to dynamically update restrictions
            this.updateDynamicDateRestrictions();
        },
        
        updateDynamicDateRestrictions: function() {
            const self = this;
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            $('#fromDate').off('change.dateRestriction').on('change.dateRestriction', function() {
                const fromDate = $(this).val();
                
                if (self.isYearClosed) {
                    // from_date can't be more than to_year_month
                    if (fromDate && fromDate > toYearMonth) {
                        $(this).val(toYearMonth);
                        TempleCore.showToast('From date cannot be after financial year end date', 'warning');
                    }
                    
                    // Update to_date min
                    $('#toDate').attr('min', fromDate || fromYearMonth);
                } else {
                    // Update to_date min
                    if (fromDate) {
                        $('#toDate').attr('min', fromDate);
                    }
                }
                
                // Validate to_date
                const toDate = $('#toDate').val();
                if (fromDate && toDate && toDate < fromDate) {
                    $('#toDate').val(fromDate);
                    TempleCore.showToast('To date cannot be before from date', 'warning');
                }
            });
            
            $('#toDate').off('change.dateRestriction').on('change.dateRestriction', function() {
                const toDate = $(this).val();
                const fromDate = $('#fromDate').val();
                
                if (self.isYearClosed) {
                    // to_date can't be more than to_year_month
                    if (toDate && toDate > toYearMonth) {
                        $(this).val(toYearMonth);
                        TempleCore.showToast('To date cannot be after financial year end date', 'warning');
                    }
                }
                
                // to_date can't be less than from_date
                if (toDate && fromDate && toDate < fromDate) {
                    $(this).val(fromDate);
                    TempleCore.showToast('To date cannot be before from date', 'warning');
                }
                
                // Update from_date max
                if (self.isYearClosed) {
                    const maxFromDate = toDate && toDate < toYearMonth ? toDate : toYearMonth;
                    $('#fromDate').attr('max', maxFromDate);
                } else {
                    if (toDate) {
                        $('#fromDate').attr('max', toDate);
                    }
                }
            });
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
                        <div class="col-12">
                            <h2 class="page-title">
                                <i class="bi bi-grid-3x3"></i> Trial Balance Report
                            </h2>
                        </div>
                    </div>
                    
                    <!-- Filter Section -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="trialBalanceForm">
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">From Date</label>
                                            <input type="date" class="form-control" id="fromDate">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">To Date</label>
                                            <input type="date" class="form-control" id="toDate">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Display Options</label>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="showZeroBalances">
                                                <label class="form-check-label" for="showZeroBalances">
                                                    Show Zero Balance Accounts
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="expandAll" checked>
                                                <label class="form-check-label" for="expandAll">
                                                    Expand All Groups
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
                    
                    <!-- Balance Status -->
                    <div id="balanceStatus"></div>
                    
                    <!-- Report Content -->
                    <div id="reportContent"></div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Form submission
            $('#trialBalanceForm').on('submit', function(e) {
                e.preventDefault();
                
                // Validate dates before generating report
                if (!self.validateDates()) {
                    return;
                }
                
                self.generateReport();
            });
            
            // Export buttons
            $('#exportExcel').on('click', function() {
                // Validate dates before export
                if (!self.validateDates()) {
                    return;
                }
                self.exportReport('excel');
            });
            
            $('#exportPdf').on('click', function() {
                // Validate dates before export
                if (!self.validateDates()) {
                    return;
                }
                self.exportReport('pdf');
            });
            
            $('#printReport').on('click', function() {
                // Validate dates before print
                if (!self.validateDates()) {
                    return;
                }
                self.printReport();
            });
            
            // Toggle group expansion
            $(document).on('click', '.toggle-group', function(e) {
                e.preventDefault();
                const groupId = $(this).data('group-id');
                const $icon = $(this).find('i');
                const $childRows = $(`.child-of-${groupId}`);
                
                if ($icon.hasClass('bi-chevron-down')) {
                    $icon.removeClass('bi-chevron-down').addClass('bi-chevron-right');
                    $childRows.hide();
                    // Also hide all nested children
                    $childRows.find('.toggle-group i').removeClass('bi-chevron-down').addClass('bi-chevron-right');
                } else {
                    $icon.removeClass('bi-chevron-right').addClass('bi-chevron-down');
                    $childRows.show();
                }
            });
        },
        
        loadDefaults: function() {
            // After dates are set and restrictions applied, auto-generate report
            this.generateReport();
        },
        
        generateReport: function() {
            const self = this;
            
            const params = {
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val()
            };
            
            if (!params.from_date || !params.to_date) {
                TempleCore.showToast('Please select both dates', 'warning');
                return;
            }
            
            // Validate dates
            if (!this.validateDates()) {
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/reports/trial-balance', params)
                .done(function(response) {
                    if (response.success) {
                        self.reportData = response.data;
                        self.renderReport(response.data);
                        self.renderBalanceStatus(response.data);
                        // Enable export buttons
                        $('#exportExcel, #exportPdf, #printReport').prop('disabled', false);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to generate report', 'error');
                    }
                })
                .fail(function(xhr) {
                    const error = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred';
                    TempleCore.showToast(error, 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        renderBalanceStatus: function(data) {
            const isBalanced = data.is_balanced;
            const difference = Math.abs(data.grand_totals.closing_debit - data.grand_totals.closing_credit);
            
            let html = `
                <div class="alert ${isBalanced ? 'alert-success' : 'alert-warning'} mb-4">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi ${isBalanced ? 'bi-check-circle' : 'bi-exclamation-triangle'}"></i>
                            <strong>Trial Balance is ${isBalanced ? 'BALANCED' : 'NOT BALANCED'}</strong>
                            ${!isBalanced ? `<span class="ms-3">Difference: ${this.formatAmount(difference)}</span>` : ''}
                        </div>
                        <div>
                            Period: ${this.formatDate(data.from_date)} to ${this.formatDate(data.to_date)}
                        </div>
                    </div>
                </div>
            `;
            
            $('#balanceStatus').html(html);
        },
        
        renderReport: function(data) {
            const self = this;
            const showZero = $('#showZeroBalances').is(':checked');
            const expandAll = $('#expandAll').is(':checked');
            
            let html = `
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered table-hover" id="trialBalanceTable">
                                <thead class="table-dark">
                                    <tr>
                                        <th rowspan="2" width="100">Code</th>
                                        <th rowspan="2">Particulars</th>
                                        <th colspan="2" class="text-center">Opening Balance</th>
                                        <th colspan="2" class="text-center">Closing Balance</th>
                                    </tr>
                                    <tr>
                                        <th width="150" class="text-end">Debit</th>
                                        <th width="150" class="text-end">Credit</th>
                                        <th width="150" class="text-end">Debit</th>
                                        <th width="150" class="text-end">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            // Render groups and ledgers hierarchically
            if (data.trial_balance && data.trial_balance.length > 0) {
                data.trial_balance.forEach(function(group) {
                    html += self.renderGroup(group, 0, '', showZero, expandAll);
                });
            } else {
                html += `
                    <tr>
                        <td colspan="6" class="text-center text-muted">No data available for the selected period</td>
                    </tr>
                `;
            }
            
            // Grand totals
            html += `
                                    <tr class="table-dark">
                                        <td colspan="2"><strong>GRAND TOTAL</strong></td>
                                        <td class="text-end"><strong>${self.formatAmount(data.grand_totals.opening_debit)}</strong></td>
                                        <td class="text-end"><strong>${self.formatAmount(data.grand_totals.opening_credit)}</strong></td>
                                        <td class="text-end"><strong>${self.formatAmount(data.grand_totals.closing_debit)}</strong></td>
                                        <td class="text-end"><strong>${self.formatAmount(data.grand_totals.closing_credit)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            $('#reportContent').html(html);
        },
        
        renderGroup: function(group, level, parentClass, showZero, expandAll) {
            const self = this;
            let html = '';
            const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
            const hasChildren = (group.children && group.children.length > 0) || 
                               (group.ledgers && group.ledgers.length > 0);
            const groupClass = `group-${group.id}`;
            const childClass = parentClass ? `${parentClass} child-of-${group.id}` : `child-of-${group.id}`;
            const displayStyle = (!expandAll && parentClass) ? 'style="display:none;"' : '';
            
            // Skip if zero and not showing zero balances
            if (!showZero && 
                group.total_opening_debit == 0 && 
                group.total_opening_credit == 0 && 
                group.total_closing_debit == 0 && 
                group.total_closing_credit == 0) {
                return '';
            }
            
            // Group header row
            const rowClass = level === 0 ? 'table-primary' : (level === 1 ? 'table-info' : 'table-light');
            html += `
                <tr class="${rowClass} ${parentClass} ${groupClass}" ${displayStyle}>
                    <td><strong>${group.code}</strong></td>
                    <td>
                        ${hasChildren ? `<button class="btn btn-sm btn-link p-0 toggle-group" data-group-id="${group.id}">
                            <i class="bi bi-chevron-${expandAll ? 'down' : 'right'}"></i>
                        </button>` : ''}
                        ${indent}<strong>${group.name}</strong>
                    </td>
                    <td class="text-end"><strong>${self.formatAmount(group.total_opening_debit)}</strong></td>
                    <td class="text-end"><strong>${self.formatAmount(group.total_opening_credit)}</strong></td>
                    <td class="text-end"><strong>${self.formatAmount(group.total_closing_debit)}</strong></td>
                    <td class="text-end"><strong>${self.formatAmount(group.total_closing_credit)}</strong></td>
                </tr>
            `;
            
            let from_date = $('#fromDate').val(),
                to_date = $('#toDate').val();
            
            // Render ledgers
            if (group.ledgers && group.ledgers.length > 0) {
                group.ledgers.forEach(function(ledger) {
                    if (!showZero && 
                        ledger.opening_debit == 0 && 
                        ledger.opening_credit == 0 && 
                        ledger.closing_debit == 0 && 
                        ledger.closing_credit == 0) {
                        return;
                    }
                    
                    const ledgerDisplay = (!expandAll) ? 'style="display:none;"' : '';
                    html += `
                        <tr class="${childClass}" ${ledgerDisplay}>
                            <td>${ledger.code}</td>
                            <td><a href="${TempleCore.getTempleBaseUrl().full + '/accounts/general-ledger?ledger=' + ledger.id + '&from=' + from_date + '&to=' + to_date}" target="_blank">${indent}&nbsp;&nbsp;&nbsp;&nbsp;${ledger.name}</a></td>
                            <td class="text-end">${self.formatAmount(ledger.opening_debit)}</td>
                            <td class="text-end">${self.formatAmount(ledger.opening_credit)}</td>
                            <td class="text-end">${self.formatAmount(ledger.closing_debit)}</td>
                            <td class="text-end">${self.formatAmount(ledger.closing_credit)}</td>
                        </tr>
                    `;
                });
            }
            
            // Render child groups recursively
            if (group.children && group.children.length > 0) {
                group.children.forEach(function(childGroup) {
                    html += self.renderGroup(childGroup, level + 1, childClass, showZero, expandAll);
                });
            }
            
            return html;
        },
        
        formatAmount: function(amount) {
            if (amount == 0 || amount == null) return '-';
            return parseFloat(amount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        },
        
        exportReport: function(type) {
            if (!this.reportData) {
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
                url: TempleAPI.getBaseUrl() + '/accounts/reports/trial-balance/export',
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
                    let filename = 'trial_balance.' + (type === 'pdf' ? 'pdf' : 'xlsx');
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
                    
                    TempleCore.showToast(`Report exported successfully`, 'success');
                },
                error: function(xhr) {
                    TempleCore.showToast('Failed to export report', 'error');
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
            
            // Validate dates before print
            if (!this.validateDates()) {
                return;
            }
            
            const printContent = document.getElementById('reportContent').innerHTML;
            const balanceStatus = document.getElementById('balanceStatus').innerHTML;
            const templeInfo = JSON.parse(localStorage.getItem('temple') || '{}');
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Trial Balance Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            .table { font-size: 11px; }
                            .btn { display: none !important; }
                            .toggle-group { display: none !important; }
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
                    </style>
                </head>
                <body>
                    <div class="container-fluid">
                        <div class="header-info text-center">
                            <h2>${templeInfo.name || 'Temple Management System'}</h2>
                            <h3>Trial Balance Report</h3>
                            <p>Period: ${$('#fromDate').val()} to ${$('#toDate').val()}</p>
                        </div>
                        ${balanceStatus}
                        ${printContent}
                        <div class="mt-4">
                            <small>Generated on: ${new Date().toLocaleString('en-IN')}</small>
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            // Hide all toggle buttons
                            document.querySelectorAll('.toggle-group').forEach(function(el) {
                                el.style.display = 'none';
                            });
                            // Show all rows for printing
                            document.querySelectorAll('tr[style*="display:none"]').forEach(function(el) {
                                el.style.display = '';
                            });
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