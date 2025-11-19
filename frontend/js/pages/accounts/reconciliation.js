// Save this file as: js/pages/accounts/reconciliation.js
// OR js/pages/reconciliation.js (depending on your routing structure)

(function($, window) {
    'use strict';
    
    window.ReconciliationComponent = {
        currentReconciliations: [],
        selectedReconciliation: null,
        
        init: function() {
            this.render();
            this.loadReconciliations();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="page-header">
                    <h2><i class="bi bi-check2-square"></i> Bank Reconciliation</h2>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="row">
                            <div class="col-md-6">
                                <h5>Reconciliation List</h5>
                            </div>
                            <div class="col-md-6 text-end">
                                <button class="btn btn-primary" id="btnStartReconciliation">
                                    <i class="bi bi-plus-circle"></i> Start New Reconciliation
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Filters -->
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <label>Bank Account</label>
                                <select class="form-control" id="filterBankAccount">
                                    <option value="">All Accounts</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label>Status</label>
                                <select class="form-control" id="filterStatus">
                                    <option value="">All Status</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="locked">Locked</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label>From Date</label>
                                <input type="date" class="form-control" id="filterFromDate">
                            </div>
                            <div class="col-md-3">
                                <label>To Date</label>
                                <input type="date" class="form-control" id="filterToDate">
                            </div>
                        </div>
                        
                        <!-- Reconciliations Table -->
                        <div class="table-responsive">
                            <table class="table table-hover" id="reconciliationsTable">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Bank Account</th>
                                        <th>Period</th>
                                        <th>Opening Balance</th>
                                        <th>Closing Balance</th>
                                        <th>Status</th>
                                        <th>Created By</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan="8" class="text-center">Loading...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Start Reconciliation Modal -->
                <div class="modal fade" id="startReconciliationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Start New Reconciliation</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="startReconciliationForm">
                                    <div class="mb-3">
                                        <label>Bank Account <span class="text-danger">*</span></label>
                                        <select class="form-control" id="bankAccountId" required>
                                            <option value="">Select Bank Account</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label>Statement Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="statementDate" required>
                                    </div>
                                    <div class="mb-3">
                                        <label>Statement Closing Balance <span class="text-danger">*</span></label>
                                        <input type="number" step="0.01" class="form-control" id="statementBalance" required>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnConfirmStart">Start Reconciliation</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#main-content').html(html);
        },
        
        loadReconciliations: function() {
            const self = this;
            
            $.ajax({
                url: `${APP_CONFIG.API_URL}/accounts/reconciliation`,
                method: 'GET',
                headers: TempleCore.getApiHeaders(),
                success: function(response) {
                    if (response.success && response.data) {
                        self.displayReconciliations(response.data);
                    } else {
                        self.displayEmptyState();
                    }
                },
                error: function(xhr) {
                    console.error('Failed to load reconciliations:', xhr);
                    self.displayErrorState();
                }
            });
        },
        
        displayReconciliations: function(reconciliations) {
            const tbody = $('#reconciliationsTable tbody');
            
            if (!reconciliations || reconciliations.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center">
                            <div class="py-4">
                                <i class="bi bi-inbox fs-1 text-muted"></i>
                                <p class="text-muted mt-2">No reconciliations found</p>
                                <button class="btn btn-primary btn-sm" onclick="ReconciliationComponent.showStartModal()">
                                    Start Your First Reconciliation
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
                return;
            }
            
            let html = '';
            reconciliations.forEach(function(rec) {
                const statusBadge = self.getStatusBadge(rec.status);
                html += `
                    <tr>
                        <td>${rec.id}</td>
                        <td>${rec.bank_account_name || '-'}</td>
                        <td>${rec.start_date} to ${rec.end_date}</td>
                        <td>${self.formatCurrency(rec.opening_balance)}</td>
                        <td>${self.formatCurrency(rec.closing_balance)}</td>
                        <td>${statusBadge}</td>
                        <td>${rec.created_by_name || '-'}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                ${rec.status === 'in_progress' ? `
                                    <button class="btn btn-primary" onclick="ReconciliationComponent.processReconciliation(${rec.id})">
                                        <i class="bi bi-play"></i> Process
                                    </button>
                                ` : ''}
                                <button class="btn btn-info" onclick="ReconciliationComponent.viewReconciliation(${rec.id})">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                ${rec.status === 'completed' ? `
                                    <button class="btn btn-success" onclick="ReconciliationComponent.generateReport(${rec.id})">
                                        <i class="bi bi-file-pdf"></i> Report
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tbody.html(html);
        },
        
        displayEmptyState: function() {
            $('#reconciliationsTable tbody').html(`
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="py-5">
                            <i class="bi bi-bank2 fs-1 text-muted"></i>
                            <h5 class="mt-3">No Reconciliations Yet</h5>
                            <p class="text-muted">Start your first bank reconciliation to match your bank statements with your accounts.</p>
                            <button class="btn btn-primary" onclick="ReconciliationComponent.showStartModal()">
                                <i class="bi bi-plus-circle"></i> Start Reconciliation
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        },
        
        displayErrorState: function() {
            $('#reconciliationsTable tbody').html(`
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> Failed to load reconciliations. Please try again.
                    </td>
                </tr>
            `);
        },
        
        showStartModal: function() {
            // Load bank accounts first
            this.loadBankAccounts();
            $('#startReconciliationModal').modal('show');
        },
        
        loadBankAccounts: function() {
            $.ajax({
                url: `${APP_CONFIG.API_URL}/accounts/ledgers/type/bank-accounts`,
                method: 'GET',
                headers: TempleCore.getApiHeaders(),
                success: function(response) {
                    if (response.success && response.data) {
                        let options = '<option value="">Select Bank Account</option>';
                        response.data.forEach(function(account) {
                            options += `<option value="${account.id}">${account.name}</option>`;
                        });
                        $('#bankAccountId').html(options);
                        $('#filterBankAccount').html('<option value="">All Accounts</option>' + options);
                    }
                },
                error: function(xhr) {
                    console.error('Failed to load bank accounts:', xhr);
                    TempleCore.showToast('Failed to load bank accounts', 'error');
                }
            });
        },
        
        startReconciliation: function() {
            const data = {
                bank_account_id: $('#bankAccountId').val(),
                statement_date: $('#statementDate').val(),
                statement_balance: $('#statementBalance').val()
            };
            
            if (!data.bank_account_id || !data.statement_date || !data.statement_balance) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            $.ajax({
                url: `${APP_CONFIG.API_URL}/accounts/reconciliation/start`,
                method: 'POST',
                headers: TempleCore.getApiHeaders(),
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: function(response) {
                    if (response.success) {
                        $('#startReconciliationModal').modal('hide');
                        TempleCore.showToast('Reconciliation started successfully', 'success');
                        // Navigate to process page
                        if (response.data && response.data.id) {
                            window.ReconciliationComponent.processReconciliation(response.data.id);
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to start reconciliation', 'error');
                    }
                },
                error: function(xhr) {
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error?.message || 'Failed to start reconciliation', 'error');
                }
            });
        },
        
        processReconciliation: function(id) {
            // Navigate to reconciliation process page
            window.location.href = `#/accounts/reconciliation/process/${id}`;
        },
        
        viewReconciliation: function(id) {
            window.location.href = `#/accounts/reconciliation/view/${id}`;
        },
        
        generateReport: function(id) {
            window.open(`${APP_CONFIG.API_URL}/accounts/reconciliation/${id}/report`, '_blank');
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'in_progress': '<span class="badge bg-warning">In Progress</span>',
                'completed': '<span class="badge bg-success">Completed</span>',
                'locked': '<span class="badge bg-secondary">Locked</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        formatCurrency: function(amount) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount || 0);
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnStartReconciliation').on('click', function() {
                self.showStartModal();
            });
            
            $('#btnConfirmStart').on('click', function() {
                self.startReconciliation();
            });
            
            // Filter events
            $('#filterBankAccount, #filterStatus, #filterFromDate, #filterToDate').on('change', function() {
                self.loadReconciliations();
            });
        }
    };
    
    // Initialize when page loads
    $(document).ready(function() {
        if (window.location.hash.includes('reconciliation')) {
            ReconciliationComponent.init();
        }
    });
    
})(jQuery, window)