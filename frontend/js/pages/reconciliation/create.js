// js/pages/reconciliation/create.js
// Reconciliation Create Page - With Financial Year Month Restrictions

(function($, window) {
    'use strict';
    
    window.ReconciliationCreatePage = {
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        init: function(params) {
            const self = this;
            this.params = params || {};
            this.render();
            
            // Load active year first, then initialize
            this.loadActiveYear().then(function() {
                self.loadBankAccounts();
                self.loadAccountingYear();
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
                        
                        // Set initial month value
                        self.setInitialMonth();
                        
                        // Apply month restrictions
                        self.applyMonthRestrictions();
                        
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
        
        setInitialMonth: function() {
            const currentDate = new Date();
            // Get previous month
            const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const previousMonth = this.formatMonthValue(previousMonthDate);
            
            // Get FY range
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            // Check if previous month is within FY range
            if (previousMonth >= fyStartMonth && previousMonth <= fyEndMonth) {
                // Previous month is within FY range - use it
                $('#month').val(previousMonth);
            } else if (previousMonth < fyStartMonth) {
                // Previous month is before FY start - use FY start month
                $('#month').val(fyStartMonth);
            } else {
                // Previous month is after FY end - use FY end month
                $('#month').val(fyEndMonth);
            }
        },
        
        applyMonthRestrictions: function() {
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            // Set min and max attributes for month input
            $('#month').attr('min', fyStartMonth);
            $('#month').attr('max', fyEndMonth);
            
            // Add change event listener for validation
            this.bindMonthValidation();
        },
        
        bindMonthValidation: function() {
            const self = this;
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            $('#month').off('change.monthValidation').on('change.monthValidation', function() {
                const selectedMonth = $(this).val();
                
                if (!selectedMonth) {
                    return;
                }
                
                // Validate selected month
                if (selectedMonth < fyStartMonth) {
                    $(this).val(fyStartMonth);
                    TempleCore.showToast('Month cannot be before financial year start', 'warning');
                } else if (selectedMonth > fyEndMonth) {
                    $(this).val(fyEndMonth);
                    TempleCore.showToast('Month cannot be after financial year end', 'warning');
                }
            });
        },
        
        formatMonthValue: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        },
        
        validateMonth: function() {
            const selectedMonth = $('#month').val();
            
            if (!selectedMonth) {
                TempleCore.showToast('Please select a month', 'warning');
                return false;
            }
            
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            if (selectedMonth < fyStartMonth) {
                TempleCore.showToast('Month cannot be before financial year start', 'warning');
                return false;
            }
            
            if (selectedMonth > fyEndMonth) {
                TempleCore.showToast('Month cannot be after financial year end', 'warning');
                return false;
            }
            
            return true;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-12">
                            <h1 class="h3 mb-0">Start New Reconciliation</h1>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('reconciliation'); return false;">Bank Reconciliation</a></li>
                                    <li class="breadcrumb-item active">Start New</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Start New Bank Reconciliation</h5>
                        </div>
                        <div class="card-body">
                            <form id="reconciliationForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Select Bank Account <span class="text-danger">*</span></label>
                                            <select class="form-select" id="ledger_id" name="ledger_id" required>
                                                <option value="">-- Select Bank Account --</option>
                                            </select>
                                            <small class="text-muted">Only bank accounts enabled for reconciliation are shown</small>
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Reconciliation Month <span class="text-danger">*</span></label>
                                            <input type="month" class="form-control" id="month" name="month" required>
                                            <small class="text-muted">Select the month you want to reconcile</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Bank Statement Closing Balance <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="statement_closing_balance" 
                                                   name="statement_closing_balance" step="0.01" placeholder="0.00" required>
                                            <small class="text-muted">Enter the closing balance as shown in your bank statement</small>
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Current Accounting Year</label>
                                            <input type="text" class="form-control" id="accounting_year" readonly 
                                                   placeholder="Loading...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="alert alert-info mt-3">
                                    <h6>Reconciliation Process:</h6>
                                    <ol class="mb-0">
                                        <li>Select the bank account you want to reconcile</li>
                                        <li>Choose the month for reconciliation</li>
                                        <li>Enter the closing balance from your bank statement</li>
                                        <li>The system will show all transactions for that month</li>
                                        <li>Mark the transactions that appear in your bank statement</li>
                                        <li>Resolve any differences and finalize the reconciliation</li>
                                    </ol>
                                </div>
                                
                                <div class="mt-4">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-arrow-right"></i> Start Reconciliation
                                    </button>
                                    <button type="button" class="btn btn-secondary" 
                                            onclick="TempleRouter.navigate('reconciliation'); return false;">
                                        <i class="bi bi-x"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.bindEvents();
        },
        
        loadBankAccounts: function() {
            TempleAPI.get('/accounts/reconciliation/ledgers/type/bank-accounts')
            .done(function(response) {
                if (response.success) {
                    let options = '<option value="">-- Select Bank Account --</option>';
                    response.data.forEach(function(ledger) {
                        if (ledger.reconciliation == 1) {
                            options += `<option value="${ledger.id}">${ledger.name}</option>`;
                        }
                    });
                    $('#ledger_id').html(options);
                }
            })
            .fail(function() {
                TempleCore.showToast('Failed to load bank accounts', 'error');
            });
        },
        
        loadAccountingYear: function() {
            const self = this;
            
            TempleAPI.get('/accounts/reconciliation/ac-years')
            .done(function(response) {
                if (response.success && response.data) {
                    const activeYear = response.data;
                    
                    if (activeYear) {
                        const fromDate = self.formatDateDisplay(activeYear.from_year_month);
                        const toDate = self.formatDateDisplay(activeYear.to_year_month);
                        $('#accounting_year').val(`${fromDate} to ${toDate}`);
                    } else {
                        $('#accounting_year').val('No active accounting year found');
                    }
                } else {
                    $('#accounting_year').val('Unable to load');
                }
            })
            .fail(function() {
                $('#accounting_year').val('Unable to load');
            });
        },
        
        formatDateDisplay: function(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#reconciliationForm').on('submit', function(e) {
                e.preventDefault();
                self.startReconciliation();
            });
        },
        
        startReconciliation: function() {
            const formData = {
                ledger_id: $('#ledger_id').val(),
                month: $('#month').val(),
                statement_closing_balance: $('#statement_closing_balance').val()
            };
            
            // Validation
            if (!formData.ledger_id) {
                TempleCore.showToast('Please select a bank account', 'warning');
                return;
            }
            
            if (!formData.month) {
                TempleCore.showToast('Please select a month', 'warning');
                return;
            }
            
            // Validate month against FY range
            if (!this.validateMonth()) {
                return;
            }
            
            if (!formData.statement_closing_balance) {
                TempleCore.showToast('Please enter the statement closing balance', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/reconciliation/start', formData)
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast('Reconciliation started successfully', 'success');
                    TempleRouter.navigate('reconciliation/process', { id: response.data.id });
                } else {
                    TempleCore.showToast(response.message || 'Failed to start reconciliation', 'error');
                }
            })
            .fail(function(xhr) {
                const response = xhr.responseJSON;
                TempleCore.showToast(response?.message || 'An error occurred', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        }
    };
    
})(jQuery, window);