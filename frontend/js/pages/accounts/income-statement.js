// js/pages/accounts/income-statement.js
// Income Statement (Profit & Loss) Page - With Financial Year Date Restrictions

(function($, window) {
    'use strict';
    
    window.AccountsIncomeStatementPage = {
        // Current state
        currentFilters: {
            from_date: null,
            to_date: null,
            display_type: 'full',
            fund_id: null
        },
        
        incomeData: null,
        
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        // Initialize page
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
            
            // Update current filters
            this.currentFilters.from_date = fromYearMonth;
            this.currentFilters.to_date = toDate;
            
            // Set input values
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
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-12">
                            <h4 class="page-title">Income Statement (Profit & Loss)</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Accounts</li>
                                    <li class="breadcrumb-item active">Income Statement</li>
                                </ol>
                            </nav>
                        </div>
                    </div>

                    <!-- Filters Card -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="incomeStatementFilterForm">
                                <div class="row g-3">
                                    <div class="col-md-2">
                                        <label class="form-label">Display Type</label>
                                        <select class="form-select" id="displayType">
                                            <option value="full">Full</option>
                                            <option value="monthly">Monthly</option>
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
                                    <div class="col-md-2">
                                        <label class="form-label">Fund</label>
                                        <select class="form-select" id="fundSelect">
                                            <option value="">Loading...</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">&nbsp;</label>
                                        <button type="submit" class="btn btn-primary w-100">
                                            <i class="bi bi-search"></i> Submit
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Export Buttons -->
                    <div class="card mb-3">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-end gap-2">
                                <button class="btn btn-sm btn-outline-primary" id="exportPdfBtn">
                                    <i class="bi bi-file-pdf"></i> Export PDF
                                </button>
                                <button class="btn btn-sm btn-outline-success" id="exportExcelBtn">
                                    <i class="bi bi-file-excel"></i> Export Excel
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" id="printBtn">
                                    <i class="bi bi-printer"></i> Print
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Income Statement Content -->
                    <div class="card">
                        <div class="card-body">
                            <div id="incomeStatementContent">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-3">Loading Income Statement...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Print Style -->
                <style id="printStyles">
                    @media print {
                        .navbar, .sidebar, .card, .btn, .form-control, .form-select {
                            display: none !important;
                        }
                        #incomeStatementContent {
                            display: block !important;
                        }
                        .table {
                            font-size: 12px;
                        }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Filter form submit
            $('#incomeStatementFilterForm').on('submit', function(e) {
                e.preventDefault();
                
                // Validate dates before applying filters
                if (!self.validateDates()) {
                    return;
                }
                
                self.applyFilters();
            });
            
            // Display type change
            $('#displayType').on('change', function() {
                const displayType = $(this).val();
                if (displayType === 'monthly') {
                    self.validateMonthlyRange();
                }
            });
            
            // Export buttons
            $('#exportPdfBtn').on('click', function() {
                // Validate dates before export
                if (!self.validateDates()) {
                    return;
                }
                self.exportReport('pdf');
            });
            
            $('#exportExcelBtn').on('click', function() {
                // Validate dates before export
                if (!self.validateDates()) {
                    return;
                }
                self.exportReport('excel');
            });
            
            $('#printBtn').on('click', function() {
                // Validate dates before print
                if (!self.validateDates()) {
                    return;
                }
                self.printReport();
            });
        },
        
        // Load initial data
        loadInitialData: function() {
            // Load funds from API
            this.loadFunds();
            
            // Auto-generate income statement with initial dates
            this.loadIncomeStatement();
        },
        
        // Load funds for dropdown from API
        loadFunds: function() {
            const self = this;
            
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">All Funds</option>';
                        $.each(response.data, function(index, fund) {
                            options += `<option value="${fund.id}">${fund.code} - ${fund.name}</option>`;
                        });
                        $('#fundSelect').html(options);
                    } else {
                        $('#fundSelect').html('<option value="">All Funds</option>');
                    }
                })
                .fail(function() {
                    console.error('Failed to load funds');
                    $('#fundSelect').html('<option value="">All Funds</option>');
                });
        },
        
        // Apply filters
        applyFilters: function() {
            this.currentFilters = {
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val(),
                display_type: $('#displayType').val(),
                fund_id: $('#fundSelect').val() || null
            };
            
            // Validate dates
            if (!this.validateDates()) {
                return;
            }
            
            // Validate monthly range
            if (this.currentFilters.display_type === 'monthly') {
                if (!this.validateMonthlyRange()) {
                    return;
                }
            }
            
            this.loadIncomeStatement();
        },
        
        // Validate monthly range
        validateMonthlyRange: function() {
            const fromDate = new Date($('#fromDate').val());
            const toDate = new Date($('#toDate').val());
            const fromYearMonth = new Date(this.activeYear.from_year_month);
            const toYearMonth = new Date(this.activeYear.to_year_month);
            
            // Calculate months difference
            const monthsDiff = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + 
                (toDate.getMonth() - fromDate.getMonth());
            
            // Check 12-month limit
            if (monthsDiff > 11) {
                TempleCore.showToast('Monthly view cannot exceed 12 months', 'warning');
                return false;
            }
            
            // Check financial year boundaries if year is closed
            if (this.isYearClosed) {
                if (fromDate < fromYearMonth) {
                    TempleCore.showToast('From date cannot be before financial year start', 'warning');
                    return false;
                }
                if (toDate > toYearMonth) {
                    TempleCore.showToast('To date cannot be after financial year end', 'warning');
                    return false;
                }
            }
            
            return true;
        },
        
        // Load income statement data
        loadIncomeStatement: function() {
            const self = this;
            
            // Validate dates before loading
            if (!this.validateDates()) {
                return;
            }
            
            $('#incomeStatementContent').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading Income Statement...</p>
                </div>
            `);
            
            TempleAPI.get('/accounts/income-statement', this.currentFilters)
                .done(function(response) {
                    if (response.success) {
                        self.incomeData = response.data;
                        if (self.currentFilters.display_type === 'monthly') {
                            self.renderMonthlyView(response.data, response.meta);
                        } else {
                            self.renderFullView(response.data, response.meta);
                        }
                    } else {
                        self.showError(response.message);
                    }
                })
                .fail(function(xhr) {
                    self.showError('Failed to load income statement');
                });
        },
        
        // Render full view
        renderFullView: function(data, meta) {
            const temple = TempleCore.getTemple();
            const currency = temple.currency || 'MYR';
            
            let html = `
                <div class="income-statement-full">
                    <div class="text-center mb-4">
                        <h5>${temple.name || 'Temple'}</h5>
                        <h6>Income Statement</h6>
                        <p class="text-muted">
                            Period: ${this.formatDate(meta.from_date)} to ${this.formatDate(meta.to_date)}
                        </p>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th style="width: 70%;">Account Name</th>
                                    <th style="width: 30%;" class="text-end">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            // Revenue Section
            html += this.renderSectionFull('Revenue', data.revenue, currency, 'success');
            
            // Direct Cost Section
            if (data.direct_cost.total > 0) {
                html += this.renderSectionFull('Direct Cost', data.direct_cost, currency, 'warning');
            }
            
            // Gross Surplus
            html += `
                <tr class="table-secondary fw-bold">
                    <td>Gross Surplus/Deficit</td>
                    <td class="text-end">${this.formatCurrency(data.gross_surplus, currency)}</td>
                </tr>
            `;
            
            // Other Income Section
            if (data.other_income.total > 0) {
                html += this.renderSectionFull('Incomes', data.other_income, currency, 'info');
            }
            
            // Expenses Section
            html += this.renderSectionFull('Expenses', data.expenses, currency, 'danger');
            
            // Surplus Before Tax
            html += `
                <tr class="table-secondary fw-bold">
                    <td>Surplus/Deficit Before Taxation</td>
                    <td class="text-end">${this.formatCurrency(data.surplus_before_tax, currency)}</td>
                </tr>
            `;
            
            // Taxation Section
            if (data.taxation.total > 0) {
                html += this.renderSectionFull('Taxation', data.taxation, currency, 'secondary');
            }
            
            // Final Surplus/Deficit
            const profitClass = data.surplus_after_tax >= 0 ? 'success' : 'danger';
            html += `
                <tr class="table-${profitClass} fw-bold">
                    <td>Surplus/Deficit After Taxation</td>
                    <td class="text-end">${this.formatCurrency(data.surplus_after_tax, currency)}</td>
                </tr>
            `;
            
            html += `
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-4 p-3 bg-dark text-white text-center">
                        <h5>Total Profit Amount is ${this.formatCurrency(data.net_profit, currency)}</h5>
                    </div>
                </div>
            `;
            
            $('#incomeStatementContent').html(html);
        },
        
        // Render a section for full view
        renderSectionFull: function(title, section, currency, colorClass) {
            let html = `
                <tr class="table-${colorClass}">
                    <td colspan="2" class="fw-bold">${title}</td>
                </tr>
            `;
            
            if (section.items && section.items.length > 0) {
                $.each(section.items, function(index, item) {
                    html += `
                        <tr>
                            <td class="ps-4">
                                <span class="text-muted">(${item.code})</span> ${item.name}
                            </td>
                            <td class="text-end">${AccountsIncomeStatementPage.formatCurrency(item.balance, currency)}</td>
                        </tr>
                    `;
                });
                
                html += `
                    <tr class="fw-bold">
                        <td class="text-end">Total ${title}</td>
                        <td class="text-end">${this.formatCurrency(section.total, currency)}</td>
                    </tr>
                `;
            } else {
                html += `
                    <tr>
                        <td colspan="2" class="text-center text-muted">No items</td>
                    </tr>
                `;
            }
            
            return html;
        },
        
        // Render monthly view
        renderMonthlyView: function(data, meta) {
            const temple = TempleCore.getTemple();
            const currency = temple.currency || 'MYR';
            
            let html = `
                <div class="income-statement-monthly">
                    <div class="text-center mb-4">
                        <h5>${temple.name || 'Temple'}</h5>
                        <h6>Monthly Income Statement</h6>
                        <p class="text-muted">
                            Period: ${this.formatDate(meta.from_date)} to ${this.formatDate(meta.to_date)}
                        </p>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th style="min-width: 250px;">Account Name</th>
            `;
            
            // Add month columns
            $.each(data.months, function(index, month) {
                html += `<th class="text-center" style="min-width: 120px;">${month.label}</th>`;
            });
            
            html += `
                                    <th class="text-center" style="min-width: 120px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // Revenue Section
            html += this.renderSectionMonthly('Revenue', data.item_wise_data.revenue, 
                data.months, data.totals.revenue, currency, 'success');
            
            // Total Revenue Row
            html += this.renderTotalRow('Total Revenue', data.monthly_summary, 
                data.months, 'revenue', data.totals.revenue, currency);
            
            // Direct Cost Section
            if (data.item_wise_data.direct_cost && data.item_wise_data.direct_cost.length > 0) {
                html += this.renderSectionMonthly('Direct Cost', data.item_wise_data.direct_cost, 
                    data.months, data.totals.direct_cost, currency, 'warning');
                
                html += this.renderTotalRow('Total Direct Cost', data.monthly_summary, 
                    data.months, 'direct_cost', data.totals.direct_cost, currency);
            }
            
            // Gross Surplus Row
            html += this.renderTotalRow('Gross Surplus/Deficit', data.monthly_summary, 
                data.months, 'gross_surplus', data.totals.gross_surplus, currency, 'table-secondary');
            
            // Other Income Section
            if (data.item_wise_data.other_income && data.item_wise_data.other_income.length > 0) {
                html += this.renderSectionMonthly('Incomes', data.item_wise_data.other_income, 
                    data.months, data.totals.other_income, currency, 'info');
                
                html += this.renderTotalRow('Total Incomes', data.monthly_summary, 
                    data.months, 'other_income', data.totals.other_income, currency);
            }
            
            // Expenses Section
            html += this.renderSectionMonthly('Expenses', data.item_wise_data.expenses, 
                data.months, data.totals.expenses, currency, 'danger');
            
            html += this.renderTotalRow('Total Expenses', data.monthly_summary, 
                data.months, 'expenses', data.totals.expenses, currency);
            
            // Surplus Before Tax Row
            html += this.renderTotalRow('Surplus/Deficit Before Taxation', data.monthly_summary, 
                data.months, 'surplus_before_tax', data.totals.surplus_before_tax, currency, 'table-secondary');
            
            // Taxation Section
            if (data.item_wise_data.taxation && data.item_wise_data.taxation.length > 0) {
                html += this.renderSectionMonthly('Taxation', data.item_wise_data.taxation, 
                    data.months, data.totals.taxation, currency, 'secondary');
                
                html += this.renderTotalRow('Total Taxation', data.monthly_summary, 
                    data.months, 'taxation', data.totals.taxation, currency);
            }
            
            // Final Total Row
            const profitClass = data.totals.surplus_after_tax >= 0 ? 'success' : 'danger';
            html += `
                <tr class="table-${profitClass} fw-bold">
                    <td>Total Profit Amount</td>
            `;
            
            $.each(data.months, function(index, month) {
                const monthKey = month.key;
                const value = data.monthly_summary[monthKey].surplus_after_tax;
                html += `<td class="text-end">${AccountsIncomeStatementPage.formatCurrency(value, currency)}</td>`;
            });
            
            html += `
                    <td class="text-end">${this.formatCurrency(data.totals.surplus_after_tax, currency)}</td>
                </tr>
            `;
            
            html += `
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-4 p-3 bg-dark text-white text-center">
                        <h5>Total Profit Amount is ${this.formatCurrency(data.totals.surplus_after_tax, currency)}</h5>
                    </div>
                </div>
            `;
            
            $('#incomeStatementContent').html(html);
        },
        
        // Render a section for monthly view
        renderSectionMonthly: function(title, items, months, total, currency, colorClass) {
            let html = `
                <tr class="table-${colorClass}">
                    <td colspan="${months.length + 2}" class="fw-bold">${title}</td>
                </tr>
            `;
            
            if (items && items.length > 0) {
                $.each(items, function(index, item) {
                    html += `<tr><td class="ps-4">`;
                    html += `<span class="text-muted">(${item.code})</span> ${item.name}</td>`;
                    
                    $.each(months, function(mIndex, month) {
                        const value = item.monthly_balances[month.key] || 0;
                        html += `<td class="text-end">${AccountsIncomeStatementPage.formatCurrency(value, currency)}</td>`;
                    });
                    
                    html += `<td class="text-end fw-bold">${AccountsIncomeStatementPage.formatCurrency(item.total, currency)}</td>`;
                    html += `</tr>`;
                });
            }
            
            return html;
        },
        
        // Render total row for monthly view
        renderTotalRow: function(label, monthlySummary, months, field, total, currency, extraClass) {
            let html = `
                <tr class="fw-bold ${extraClass || ''}">
                    <td>${label}</td>
            `;
            
            $.each(months, function(index, month) {
                const value = monthlySummary[month.key][field];
                html += `<td class="text-end">${AccountsIncomeStatementPage.formatCurrency(value, currency)}</td>`;
            });
            
            html += `<td class="text-end">${this.formatCurrency(total, currency)}</td></tr>`;
            
            return html;
        },
        
        // Format currency
        formatCurrency: function(amount, currency) {
            const isNegative = amount < 0;
            const absAmount = Math.abs(amount);
            
            const formatted = TempleCore.formatCurrency(absAmount, currency);
            
            if (isNegative) {
                return `(${formatted})`;
            }
            return formatted;
        },
        
        // Format date
        formatDate: function(dateString) {
            return TempleCore.formatDate(dateString, 'short');
        },
        
        // Export report
        exportReport: function(type) {
            const self = this;
            
            // Validate filters
            if (!this.currentFilters.from_date || !this.currentFilters.to_date) {
                TempleCore.showToast('Please select date range', 'warning');
                return;
            }
            
            // Validate dates
            if (!this.validateDates()) {
                return;
            }
            
            TempleCore.showLoading(true);
            TempleCore.showToast(`Generating ${type.toUpperCase()} export...`, 'info');
            
            // Prepare export parameters
            const exportParams = $.extend({}, this.currentFilters, { 
                format: type 
            });
            
            // Alternative approach using blob download
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            const xhr = new XMLHttpRequest();
            xhr.open('GET', APP_CONFIG.API.BASE_URL + '/accounts/income-statement/export?' + $.param(exportParams), true);
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('X-Temple-ID', TempleAPI.getTempleId());
            xhr.responseType = 'blob';
            
            xhr.onload = function() {
                TempleCore.showLoading(false);
                
                if (xhr.status === 200) {
                    // Create download link
                    const blob = xhr.response;
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    
                    // Set filename based on type
                    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    if (type === 'pdf') {
                        a.download = `income_statement_${date}.pdf`;
                    } else {
                        a.download = `income_statement_${date}.xlsx`;
                    }
                    
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    TempleCore.showToast(`${type.toUpperCase()} export completed successfully`, 'success');
                } else {
                    TempleCore.showToast('Export failed. Please try again.', 'error');
                }
            };
            
            xhr.onerror = function() {
                TempleCore.showLoading(false);
                TempleCore.showToast('Export failed. Please check your connection.', 'error');
            };
            
            xhr.send();
        },
        
        // Print report
        printReport: function() {
            // Validate dates before print
            if (!this.validateDates()) {
                return;
            }
            
            window.print();
        },
        
        // Show error message
        showError: function(message) {
            $('#incomeStatementContent').html(`
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                </div>
            `);
        }
    };
    
})(jQuery, window);