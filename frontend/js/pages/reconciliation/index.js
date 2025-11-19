// js/pages/reconciliation/index.js
// Bank Reconciliation Page - With Financial Year Month Restrictions

(function($, window) {
    'use strict';
    
    window.ReconciliationPage = {
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
                self.loadReconciliations();
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
            const currentMonth = this.formatMonthValue(currentDate);
            
            // Check if current month is within FY range
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            if (currentMonth >= fyStartMonth && currentMonth <= fyEndMonth) {
                // Current month is within FY range
                $('#filterMonth').val(currentMonth);
            } else if (currentMonth < fyStartMonth) {
                // Current month is before FY start - use FY start month
                $('#filterMonth').val(fyStartMonth);
            } else {
                // Current month is after FY end - use FY end month
                $('#filterMonth').val(fyEndMonth);
            }
        },
        
        applyMonthRestrictions: function() {
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            // Set min and max attributes for month input
            $('#filterMonth').attr('min', fyStartMonth);
            $('#filterMonth').attr('max', fyEndMonth);
            
            // Add change event listener for validation
            this.bindMonthValidation();
        },
        
        bindMonthValidation: function() {
            const self = this;
            const fyStartMonth = this.formatMonthValue(new Date(this.activeYear.from_year_month));
            const fyEndMonth = this.formatMonthValue(new Date(this.activeYear.to_year_month));
            
            $('#filterMonth').off('change.monthValidation').on('change.monthValidation', function() {
                const selectedMonth = $(this).val();
                
                if (!selectedMonth) {
                    return; // Allow empty selection
                }
                
                // Validate selected month
                if (selectedMonth < fyStartMonth) {
                    $(this).val(fyStartMonth);
                    TempleCore.showToast('Month cannot be before financial year start', 'warning');
                } else if (selectedMonth > fyEndMonth) {
                    $(this).val(fyEndMonth);
                    TempleCore.showToast('Month cannot be after financial year end', 'warning');
                }
                
                // Auto-apply filter when month changes
                self.applyFilter();
            });
        },
        
        formatMonthValue: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        },
        
        validateMonth: function() {
            const selectedMonth = $('#filterMonth').val();
            
            if (!selectedMonth) {
                return true; // Empty is valid (means "All months")
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
                        <div class="col-md-6">
                            <h1 class="h3 mb-0">Bank Reconciliation</h1>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item active">Bank Reconciliation</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" onclick="TempleRouter.navigate('reconciliation/create'); return false;">
                                <i class="bi bi-plus-circle"></i> New Reconciliation
                            </button>
                        </div>
                    </div>
                    
                    <!-- Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="form-label">Bank Account</label>
                                    <select class="form-select" id="filterLedger">
                                        <option value="">All Accounts</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="draft">Draft</option>
                                        <option value="completed">Completed</option>
                                        <option value="locked">Locked</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Month</label>
                                    <input type="month" class="form-control" id="filterMonth">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-secondary w-100" onclick="ReconciliationPage.applyFilter()">
                                        <i class="bi bi-filter"></i> Apply Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Reconciliation List -->
                    <div class="card">
                        <div class="card-body">
                            <div id="reconciliationList">
                                <div class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadBankAccounts: function() {
            const self = this;
            
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
            .done(function(response) {
                if (response.success) {
                    let options = '<option value="">All Accounts</option>';
                    response.data.forEach(function(ledger) {
                        options += `<option value="${ledger.id}">${ledger.name}</option>`;
                    });
                    $('#filterLedger').html(options);
                    
                    // Bind change event to auto-apply filter
                    $('#filterLedger').off('change').on('change', function() {
                        self.applyFilter();
                    });
                }
            })
            .fail(function() {
                TempleCore.showToast('Failed to load bank accounts', 'error');
            });
        },
        
        loadReconciliations: function() {
            const self = this;
            
            // Validate month before loading
            if (!this.validateMonth()) {
                return;
            }
            
            const filters = {
                ledger_id: $('#filterLedger').val(),
                status: $('#filterStatus').val(),
                month: $('#filterMonth').val()
            };
            
            // Show loading
            $('#reconciliationList').html(`
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);
            
            TempleAPI.get('/accounts/reconciliation', filters)
            .done(function(response) {
                if (response.success) {
                    self.renderReconciliations(response.data);
                } else {
                    TempleCore.showToast(response.message || 'Failed to load reconciliations', 'error');
                    $('#reconciliationList').html(`
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i> ${response.message || 'Failed to load reconciliations'}
                        </div>
                    `);
                }
            })
            .fail(function(xhr) {
                const error = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred while loading reconciliations';
                TempleCore.showToast(error, 'error');
                $('#reconciliationList').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${error}
                    </div>
                `);
            });
        },
        
        renderReconciliations: function(reconciliations) {
            if (!reconciliations || reconciliations.length === 0) {
                $('#reconciliationList').html(`
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> No reconciliations found. 
                        Click "New Reconciliation" to start.
                    </div>
                `);
                return;
            }
            
            let html = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Bank Account</th>
                                <th>Statement Balance</th>
                                <th>Reconciled Balance</th>
                                <th>Difference</th>
                                <th>Status</th>
                                <th>Reconciled By</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            reconciliations.forEach(function(item) {
                const statusBadge = ReconciliationPage.getStatusBadge(item.status);
                const difference = parseFloat(item.difference || 0);
                const differenceClass = Math.abs(difference) > 0.01 ? 'text-danger' : 'text-success';
                
                html += `
                    <tr>
                        <td>${item.month_display || item.month}</td>
                        <td>${item.ledger?.name || 'N/A'}</td>
                        <td>${TempleCore.formatCurrency(item.statement_closing_balance)}</td>
                        <td>${TempleCore.formatCurrency(item.reconciled_balance)}</td>
                        <td class="${differenceClass}">${TempleCore.formatCurrency(difference)}</td>
                        <td>${statusBadge}</td>
                        <td>${item.reconciled_by?.name || '-'}</td>
                        <td>${item.reconciled_date ? ReconciliationPage.formatDate(item.reconciled_date) : '-'}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                `;
                
                if (item.status === 'draft') {
                    html += `
                        <button class="btn btn-outline-primary" 
                                onclick="TempleRouter.navigate('reconciliation/process', {id: ${item.id}}); return false;">
                            <i class="bi bi-pencil"></i> Continue
                        </button>
                    `;
                } else {
                    html += `
                        <button class="btn btn-outline-info" 
                                onclick="TempleRouter.navigate('reconciliation/view', {id: ${item.id}}); return false;">
                            <i class="bi bi-eye"></i> View
                        </button>
                    `;
                }
                
                html += `
                        <button class="btn btn-outline-success" 
                                onclick="TempleRouter.navigate('reconciliation/report', {id: ${item.id}}); return false;">
                            <i class="bi bi-file-pdf"></i> Report
                        </button>
                `;
                
                if (item.status === 'completed') {
                    html += `
                        <button class="btn btn-outline-warning" 
                                onclick="ReconciliationPage.lockReconciliation(${item.id}); return false;">
                            <i class="bi bi-lock"></i> Lock
                        </button>
                    `;
                }
                
                if (item.status !== 'locked') {
                    html += `
                        <button class="btn btn-outline-danger" 
                                onclick="ReconciliationPage.deleteReconciliation(${item.id}); return false;">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                }
                
                html += `
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            $('#reconciliationList').html(html);
        },
        
        applyFilter: function() {
            // Validate month before applying filter
            if (!this.validateMonth()) {
                return;
            }
            
            this.loadReconciliations();
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'draft': '<span class="badge bg-secondary">Draft</span>',
                'completed': '<span class="badge bg-success">Completed</span>',
                'locked': '<span class="badge bg-info">Locked</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },
        
        lockReconciliation: function(id) {
            TempleCore.showConfirm(
                'Lock Reconciliation',
                'Are you sure you want to lock this reconciliation? This action cannot be undone.',
                function() {
                    TempleCore.showLoading(true);
                    TempleAPI.put('/accounts/reconciliation/' + id + '/lock')
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast('Reconciliation locked successfully', 'success');
                            ReconciliationPage.loadReconciliations();
                        } else {
                            TempleCore.showToast(response.message || 'Failed to lock reconciliation', 'error');
                        }
                    })
                    .fail(function() {
                        TempleCore.showToast('An error occurred', 'error');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        },
        
        deleteReconciliation: function(id) {
            TempleCore.showConfirm(
                'Delete Reconciliation',
                'Are you sure you want to delete this reconciliation? This will unmark all reconciled transactions.',
                function() {
                    TempleCore.showLoading(true);
                    TempleAPI.delete('/accounts/reconciliation/' + id)
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast('Reconciliation deleted successfully', 'success');
                            ReconciliationPage.loadReconciliations();
                        } else {
                            TempleCore.showToast(response.message || 'Failed to delete reconciliation', 'error');
                        }
                    })
                    .fail(function() {
                        TempleCore.showToast('An error occurred', 'error');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        }
    };
    
})(jQuery, window);