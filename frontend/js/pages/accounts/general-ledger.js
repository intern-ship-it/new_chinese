// js/pages/reports/general-ledger.js
// General Ledger Report Page - With Financial Year Date Restrictions

(function($, window) {
    'use strict';
    
    window.AccountsGeneralLedgerPage = {
        selectedLedgers: [],
        
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        init: function(params) {
            const self = this;
            this.urlParams = this.getUrlParameters();
            this.render();
            
            // Load active year first, then initialize
            this.loadActiveYear().then(function() {
                self.bindEvents();
                self.loadLedgers();
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
            
            // Check if URL has date parameters
            if (this.urlParams && (this.urlParams.from_date || this.urlParams.to_date)) {
                // Use URL parameters but validate and auto-correct them
                const urlFromDate = this.urlParams.from_date || fromYearMonth;
                const urlToDate = this.urlParams.to_date || this.getDefaultToDate();
                
                // Auto-correct from_date
                let correctedFromDate = urlFromDate;
                if (urlFromDate < fromYearMonth) {
                    correctedFromDate = fromYearMonth;
                }
                if (this.isYearClosed && urlFromDate > this.activeYear.to_year_month) {
                    correctedFromDate = this.activeYear.to_year_month;
                }
                
                // Auto-correct to_date
                let correctedToDate = urlToDate;
                if (this.isYearClosed && urlToDate > this.activeYear.to_year_month) {
                    correctedToDate = this.activeYear.to_year_month;
                }
                if (correctedToDate < correctedFromDate) {
                    correctedToDate = correctedFromDate;
                }
                
                $('#fromDate').val(correctedFromDate);
                $('#toDate').val(correctedToDate);
            } else {
                // Use default values
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
            }
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
                                <i class="bi bi-journal-text"></i> General Ledger Report
                            </h2>
                        </div>
                    </div>
                    
                    <!-- Filter Section -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="generalLedgerForm">
                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="mb-3">
                                            <label class="form-label">From Date</label>
                                            <input type="date" class="form-control" id="fromDate">
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="mb-3">
                                            <label class="form-label">To Date</label>
                                            <input type="date" class="form-control" id="toDate">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Select Ledger(s)</label>
                                            <select class="form-select" id="ledgerSelect" multiple>
                                                <option value="">Loading...</option>
                                            </select>
                                            <small class="text-muted">Hold Ctrl/Cmd to select multiple</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="mb-3">
                                            <label class="form-label">Invoice Type</label>
                                            <select class="form-select" id="invoiceType">
                                                <option value="all">All</option>
                                                <option value="manual">Manual Entry</option>
                                                <option value="1">Sales Invoice</option>
                                                <option value="2">Purchase Invoice</option>
                                                <option value="3">Sales Payment</option>
                                                <option value="4">Purchase Payment</option>
                                            </select>
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
        
        getUrlParameters: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const params = {};
            
            // Get ledger IDs from URL (can be comma-separated)
            if (urlParams.has('ledger')) {
                const ledgerParam = urlParams.get('ledger');
                params.ledger_ids = ledgerParam.split(',').map(id => id.trim());
            }
            
            // Get from date
            if (urlParams.has('from')) {
                params.from_date = urlParams.get('from');
            }
            
            // Get to date
            if (urlParams.has('to')) {
                params.to_date = urlParams.get('to');
            }
            
            return params;
        },
        
        updateUrl: function() {
            const params = new URLSearchParams();
            
            // Get selected ledgers
            const selectedLedgers = $('#ledgerSelect').val();
            if (selectedLedgers && selectedLedgers.length > 0) {
                params.set('ledger', selectedLedgers.join(','));
            }
            
            // Get dates
            const fromDate = $('#fromDate').val();
            const toDate = $('#toDate').val();
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);
            
            // Update URL without page reload
            const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
            window.history.replaceState({}, '', newUrl);
        },

        selectLedgersFromUrl: function() {
            const self = this;
            if (self.urlParams && self.urlParams.ledger_ids) {
                // Select the ledgers in the dropdown
                $('#ledgerSelect').val(self.urlParams.ledger_ids);
                $('#ledgerSelect').trigger('change');
                
                // Auto-submit the form if URL parameters are present
                setTimeout(function() {
                    self.generateReport();
                }, 500);
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            // Form submission
            $('#generalLedgerForm').on('submit', function(e) {
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
            
            $('#fromDate, #toDate, #invoiceType').on('change', function() {
                self.updateUrl();
            });
            
            $('#ledgerSelect').on('change', function() {
                self.updateUrl();
            });
        },
        
        clearFilters: function() {
            // Reset to financial year dates
            const fromDate = this.activeYear.from_year_month;
            const toDate = this.getDefaultToDate();
            
            $('#fromDate').val(fromDate);
            $('#toDate').val(toDate);
            $('#ledgerSelect').val([]).trigger('change');
            $('#invoiceType').val('all');
            
            // Clear URL parameters
            window.history.replaceState({}, '', window.location.pathname);
            
            // Clear report content
            $('#reportContent').html('');
            
            // Disable export buttons
            $('#exportExcel, #exportPdf, #printReport').prop('disabled', true);
        },
        
        loadLedgers: function() {
            const self = this;
            
            TempleAPI.get('/accounts/reports/ledgers')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">-- Select Ledger(s) --</option>';
                        response.data.forEach(function(ledger) {
                            options += `<option value="${ledger.id}">${ledger.code} - ${ledger.name}</option>`;
                        });
                        $('#ledgerSelect').html(options);
                        $('#ledgerSelect').select2({
                            theme: 'bootstrap-5',
                            width: '100%',
                            placeholder: 'Search and select ledger(s)',
                            allowClear: true,
                            closeOnSelect: false,
                            multiple: true
                        });
                        
                        if (self.urlParams && self.urlParams.ledger_ids) {
                            self.selectLedgersFromUrl();
                        }
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load ledgers', 'error');
                });
        },
        
        generateReport: function() {
            const self = this;
            const selectedLedgers = $('#ledgerSelect').val();
            
            if (!selectedLedgers || selectedLedgers.length === 0) {
                TempleCore.showToast('Please select at least one ledger', 'warning');
                return;
            }
            
            // Validate dates
            if (!this.validateDates()) {
                return;
            }
            
            const params = {
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val(),
                ledger_ids: selectedLedgers,
                invoice_type: $('#invoiceType').val()
            };
            
            // Update URL with current parameters
            self.updateUrl();
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/reports/general-ledger', params)
                .done(function(response) {
                    if (response.success) {
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
            let html = '';
            
            if (!data.ledger_reports || data.ledger_reports.length === 0) {
                html = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> No transactions found for the selected criteria.
                    </div>
                `;
            } else {
                data.ledger_reports.forEach(function(report) {
                    html += `
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">
                                    ${report.ledger.name} (${report.ledger.code})
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="100">Date</th>
                                                <th width="120">Entry Code</th>
                                                <th>Narration</th>
                                                <th width="120" class="text-end">Debit</th>
                                                <th width="120" class="text-end">Credit</th>
                                                <th width="150" class="text-end">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr class="table-info">
                                                <td colspan="3"><strong>Opening Balance</strong></td>
                                                <td class="text-end"><strong>${AccountsGeneralLedgerPage.formatAmount(report.opening_balance.debit)}</strong></td>
                                                <td class="text-end"><strong>${AccountsGeneralLedgerPage.formatAmount(report.opening_balance.credit)}</strong></td>
                                                <td class="text-end">
                                                    <strong>
                                                        ${AccountsGeneralLedgerPage.formatAmount(Math.abs(report.opening_balance.debit - report.opening_balance.credit))}
                                                        ${report.opening_balance.debit >= report.opening_balance.credit ? 'Dr' : 'Cr'}
                                                    </strong>
                                                </td>
                                            </tr>
                    `;
                    
                    if (report.transactions.length > 0) {
                        report.transactions.forEach(function(transaction) {
                            html += `
                                <tr>
                                    <td>${AccountsGeneralLedgerPage.formatDate(transaction.date)}</td>
                                    <td>${transaction.entry_code || '-'}</td>
                                    <td>${transaction.narration || '-'}</td>
                                    <td class="text-end">${AccountsGeneralLedgerPage.formatAmount(transaction.debit)}</td>
                                    <td class="text-end">${AccountsGeneralLedgerPage.formatAmount(transaction.credit)}</td>
                                    <td class="text-end">
                                        ${AccountsGeneralLedgerPage.formatAmount(transaction.running_balance)}
                                        ${transaction.balance_type}
                                    </td>
                                </tr>
                            `;
                        });
                    } else {
                        html += `
                            <tr>
                                <td colspan="6" class="text-center text-muted">No transactions in this period</td>
                            </tr>
                        `;
                    }
                    
                    html += `
                                            <tr class="table-success">
                                                <td colspan="3"><strong>Closing Balance</strong></td>
                                                <td class="text-end"><strong>${AccountsGeneralLedgerPage.formatAmount(report.closing_balance.debit)}</strong></td>
                                                <td class="text-end"><strong>${AccountsGeneralLedgerPage.formatAmount(report.closing_balance.credit)}</strong></td>
                                                <td class="text-end">
                                                    <strong>
                                                        ${AccountsGeneralLedgerPage.formatAmount(Math.abs(report.closing_balance.debit - report.closing_balance.credit))}
                                                        ${report.closing_balance.debit >= report.closing_balance.credit ? 'Dr' : 'Cr'}
                                                    </strong>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            $('#reportContent').html(html);
        },
        
        formatAmount: function(amount) {
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
            const selectedLedgers = $('#ledgerSelect').val();
            if (!selectedLedgers || selectedLedgers.length === 0) {
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
                to_date: $('#toDate').val(),
                ledger_ids: selectedLedgers,
                invoice_type: $('#invoiceType').val()
            };
            
            TempleCore.showLoading(true);
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/accounts/reports/general-ledger/export',
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
                    // Get filename from response headers or create default
                    const disposition = xhr.getResponseHeader('Content-Disposition');
                    let filename = 'general_ledger.' + (type === 'pdf' ? 'pdf' : 'xlsx');
                    if (disposition && disposition.indexOf('filename=') !== -1) {
                        filename = disposition.split('filename=')[1].replace(/"/g, '');
                    }
                    
                    // Create blob link and download
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
            // Validate dates before print
            if (!this.validateDates()) {
                return;
            }
            
            const printContent = document.getElementById('reportContent').innerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>General Ledger Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            .table { font-size: 12px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container-fluid">
                        <h2>General Ledger Report</h2>
                        <p>Period: ${$('#fromDate').val()} to ${$('#toDate').val()}</p>
                        ${printContent}
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
                </html>
            `);
        }
    };
    
})(jQuery, window);