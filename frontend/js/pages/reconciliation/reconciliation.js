// js/pages/accounts/reconciliation.js
(function($, window) {
    'use strict';
    
    window.AccountsReconciliationPage = {
        reconciliations: [],
        
        init: function() {
            this.render();
            this.loadReconciliations();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-check2-square"></i> Bank Reconciliation
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-primary" id="btnNewReconciliation">
                                <i class="bi bi-plus-circle"></i> New Reconciliation
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="reconciliationTable">
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
                                    <tbody id="reconciliationTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Create Reconciliation Modal -->
                <div class="modal fade" id="createReconciliationModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Start New Bank Reconciliation</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createReconciliationForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Select Bank Account <span class="text-danger">*</span></label>
                                            <select class="form-select" id="ledgerId" required>
                                                <option value="">-- Select Bank Account --</option>
                                            </select>
                                            <small class="text-muted">Only bank accounts enabled for reconciliation are shown</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Reconciliation Month <span class="text-danger">*</span></label>
                                            <input type="month" class="form-control" id="reconciliationMonth" required>
                                            <small class="text-muted">Select the month you want to reconcile</small>
                                        </div>
                                    </div>
                                    <div class="row g-3 mt-2">
                                        <div class="col-md-6">
                                            <label class="form-label">Bank Statement Closing Balance <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="statementBalance" 
                                                   step="0.01" placeholder="0.00" required>
                                            <small class="text-muted">Enter the closing balance from your bank statement</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Current Accounting Year</label>
                                            <input type="text" class="form-control" id="currentYear" readonly>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnStartReconciliation">
                                    <i class="bi bi-arrow-right"></i> Start Reconciliation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadReconciliations: function() {
            const self = this;
            
            // For now, just clear the loading state since the backend isn't ready
            $('#reconciliationTableBody').html(`
                <tr>
                    <td colspan="9" class="text-center">No reconciliations found. Click "New Reconciliation" to start.</td>
                </tr>
            `);
            
            // When backend is ready, uncomment this:
            /*
            TempleAPI.get('/accounts/reconciliation')
                .done(function(response) {
                    if (response.success) {
                        self.reconciliations = response.data;
                        self.renderTable();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load reconciliations', 'error');
                });
            */
        },
        
        renderTable: function() {
            const tbody = $('#reconciliationTableBody');
            
            if (this.reconciliations.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="9" class="text-center">No reconciliations found</td>
                    </tr>
                `);
                return;
            }
            
            let html = '';
            this.reconciliations.forEach(rec => {
                const statusBadge = this.getStatusBadge(rec.status);
                const differenceClass = Math.abs(rec.difference) > 0.01 ? 'text-danger' : 'text-success';
                
                html += `
                    <tr>
                        <td>${rec.month_display || rec.month}</td>
                        <td>${rec.ledger?.name || ''}</td>
                        <td>${TempleCore.formatCurrency(rec.statement_closing_balance)}</td>
                        <td>${TempleCore.formatCurrency(rec.reconciled_balance)}</td>
                        <td class="${differenceClass}">${TempleCore.formatCurrency(rec.difference)}</td>
                        <td>${statusBadge}</td>
                        <td>${rec.reconciled_by?.name || '-'}</td>
                        <td>${rec.reconciled_date ? new Date(rec.reconciled_date).toLocaleDateString() : '-'}</td>
                        <td>
                            ${this.getActionButtons(rec)}
                        </td>
                    </tr>
                `;
            });
            
            tbody.html(html);
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'draft': '<span class="badge bg-warning">Draft</span>',
                'completed': '<span class="badge bg-success">Completed</span>',
                'locked': '<span class="badge bg-danger">Locked</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        getActionButtons: function(rec) {
            let buttons = '';
            
            if (rec.status === 'draft') {
                buttons += `
                    <button class="btn btn-sm btn-primary" onclick="AccountsReconciliationPage.processReconciliation('${rec.id}')" title="Continue">
                        <i class="bi bi-pencil"></i>
                    </button>
                `;
            } else {
                buttons += `
                    <button class="btn btn-sm btn-info" onclick="AccountsReconciliationPage.viewReconciliation('${rec.id}')" title="View">
                        <i class="bi bi-eye"></i>
                    </button>
                `;
            }
            
            return buttons;
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnNewReconciliation').on('click', function() {
                self.showCreateModal();
            });
            
            $('#btnStartReconciliation').on('click', function() {
                self.startReconciliation();
            });
        },
        
        showCreateModal: function() {
            // Reset form
            $('#createReconciliationForm')[0].reset();
            
            // Set default month to previous month
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            $('#reconciliationMonth').val(lastMonth.toISOString().slice(0, 7));
            
            // Load bank accounts
            this.loadBankAccounts();
            
            // Load current year
            this.loadCurrentYear();
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('createReconciliationModal'));
            modal.show();
        },
        
        loadBankAccounts: function() {
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
                .done(function(response) {
                    if (response.success) {
                        const options = response.data
                            .filter(ledger => ledger.reconciliation === 1)
                            .map(ledger => `<option value="${ledger.id}">${ledger.name}</option>`)
                            .join('');
                        $('#ledgerId').html('<option value="">-- Select Bank Account --</option>' + options);
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load bank accounts', 'error');
                });
        },
        
        loadCurrentYear: function() {
            TempleAPI.get('/accounts/chart-of-accounts/active_year')
                .done(function(response) {
                    if (response.success && response.data) {
                        const year = response.data;
                        $('#currentYear').val(`${year.from_year_month} to ${year.to_year_month}`);
                    }
                })
                .fail(function() {
                    $('#currentYear').val('No active year set');
                });
        },
        
        startReconciliation: function() {
            const form = document.getElementById('createReconciliationForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const data = {
                ledger_id: $('#ledgerId').val(),
                month: $('#reconciliationMonth').val(),
                statement_closing_balance: parseFloat($('#statementBalance').val())
            };
            
            // For now, just show a message since backend isn't ready
            TempleCore.showToast('Reconciliation feature will be available soon', 'info');
            bootstrap.Modal.getInstance(document.getElementById('createReconciliationModal')).hide();
            
            // When backend is ready, uncomment this:
            /*
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/reconciliation/start', data)
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('createReconciliationModal')).hide();
                        TempleCore.showToast('Reconciliation started successfully', 'success');
                        
                        // Navigate to process page
                        TempleRouter.navigate('accounts/reconciliation/process', { id: response.data.id });
                    } else {
                        TempleCore.showToast(response.message || 'Failed to start reconciliation', 'error');
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast(xhr.responseJSON?.message || 'An error occurred', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
            */
        },
        
        processReconciliation: function(id) {
            TempleRouter.navigate('accounts/reconciliation/process', { id: id });
        },
        
        viewReconciliation: function(id) {
            TempleRouter.navigate('accounts/reconciliation/view', { id: id });
        }
    };
    
})(jQuery, window);