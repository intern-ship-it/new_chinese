// js/pages/reconciliation/view.js
(function($, window) {
    'use strict';
    
    window.ReconciliationViewPage = {
        reconciliationId: null,
        
        init: function(params) {
            this.params = params || {};
            this.reconciliationId = params.id;
            
            if (!this.reconciliationId) {
                TempleCore.showToast('Invalid reconciliation ID', 'error');
                TempleRouter.navigate('reconciliation');
                return;
            }
            
            this.loadReconciliation();
        },
        
        loadReconciliation: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/reconciliation/' + this.reconciliationId + '/view')
            .done(function(response) {
                if (response.success) {
                    self.renderView(response.data);
                } else {
                    TempleCore.showToast(response.message || 'Failed to load reconciliation', 'error');
                    TempleRouter.navigate('reconciliation');
                }
            })
            .fail(function() {
                TempleCore.showToast('An error occurred', 'error');
                TempleRouter.navigate('reconciliation');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        renderView: function(data) {
            const rec = data.reconciliation;
            const items = data.reconciled_items || [];
            const adjustments = data.adjustments || [];
            
            const statusBadge = this.getStatusBadge(rec.status);
            const difference = parseFloat(rec.difference || 0);
            const differenceClass = Math.abs(difference) > 0.01 ? 'text-danger' : 'text-success';
            
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-9">
                            <h1 class="h3 mb-0">View Reconciliation - ${rec.month_display || rec.month}</h1>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('reconciliation'); return false;">Bank Reconciliation</a></li>
                                    <li class="breadcrumb-item active">View</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-3 text-end">
                            ${statusBadge}
                        </div>
                    </div>
                    
                    <!-- Reconciliation Details -->
                    <div class="card mb-3">
                        <div class="card-header">
                            <h5 class="mb-0">Reconciliation Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <p><strong>Bank Account:</strong><br>${rec.ledger?.name || 'N/A'}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Period:</strong><br>${rec.month_display || rec.month}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Reconciled By:</strong><br>${rec.reconciled_by?.name || '-'}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Reconciled Date:</strong><br>${rec.reconciled_date ? TempleCore.formatDate(rec.reconciled_date) : '-'}</p>
                                </div>
                            </div>
                            
                            <hr>
                            
                            <div class="row">
                                <div class="col-md-3">
                                    <p><strong>Opening Balance:</strong><br>${TempleCore.formatCurrency(rec.opening_balance)}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Statement Closing Balance:</strong><br>${TempleCore.formatCurrency(rec.statement_closing_balance)}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Reconciled Balance:</strong><br>${TempleCore.formatCurrency(rec.reconciled_balance)}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Difference:</strong><br>
                                        <span class="${differenceClass}">${TempleCore.formatCurrency(difference)}</span>
                                    </p>
                                </div>
                            </div>
                            
                            ${rec.notes ? `
                            <hr>
                            <div class="row">
                                <div class="col-md-12">
                                    <p><strong>Notes:</strong><br>${rec.notes}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Reconciled Transactions -->
                    <div class="card mb-3">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0">Reconciled Transactions</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Entry No</th>
                                            <th>Particulars</th>
                                            <th>Debit</th>
                                            <th>Credit</th>
                                            <th>Balance</th>
                                            <th>Reconciled Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderReconciledItems(items, rec.opening_balance)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Adjustments -->
                    ${adjustments.length > 0 ? `
                    <div class="card mb-3">
                        <div class="card-header bg-warning">
                            <h5 class="mb-0">Reconciliation Adjustments</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Created By</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderAdjustments(adjustments)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Action Buttons -->
                    <div class="mt-3">
                        <button class="btn btn-success" onclick="ReconciliationViewPage.generateReport()">
                            <i class="bi bi-file-pdf"></i> Generate Report
                        </button>
                        <button class="btn btn-secondary" onclick="TempleRouter.navigate('reconciliation'); return false;">
                            <i class="bi bi-arrow-left"></i> Back to List
                        </button>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        renderReconciledItems: function(items, openingBalance) {
            if (!items || items.length === 0) {
                return '<tr><td colspan="7" class="text-center">No reconciled transactions</td></tr>';
            }
            
            let runningBalance = parseFloat(openingBalance || 0);
            let html = '';
            
            items.forEach(function(item) {
                const isDebit = item.dc === 'D';
                const amount = parseFloat(item.amount || 0);
                
                if (isDebit) {
                    runningBalance += amount;
                } else {
                    runningBalance -= amount;
                }
                
                html += `
                    <tr>
                        <td>${TempleCore.formatDate(item.entry?.date)}</td>
                        <td>${item.entry?.entry_code || 'N/A'}</td>
                        <td>${item.entry?.narration || ''}</td>
                        <td>${isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
                        <td>${!isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
                        <td>${TempleCore.formatCurrency(runningBalance)}</td>
                        <td>${item.reconciliation_date ? TempleCore.formatDate(item.reconciliation_date) : '-'}</td>
                    </tr>
                `;
            });
            
            html += `
                <tr class="table-info">
                    <th colspan="5" class="text-end">Closing Reconciled Balance:</th>
                    <th>${TempleCore.formatCurrency(runningBalance)}</th>
                    <th></th>
                </tr>
            `;
            
            return html;
        },
        
        renderAdjustments: function(adjustments) {
            let html = '';
            
            adjustments.forEach(function(adj) {
                html += `
                    <tr>
                        <td>${adj.type_display || adj.adjustment_type}</td>
                        <td>${adj.description}</td>
                        <td>${TempleCore.formatCurrency(adj.amount)}</td>
                        <td>${adj.creator?.name || '-'}</td>
                        <td>${TempleCore.formatDate(adj.created_at)}</td>
                    </tr>
                `;
            });
            
            return html;
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'draft': '<span class="badge bg-secondary fs-6">Draft</span>',
                'completed': '<span class="badge bg-success fs-6">Completed</span>',
                'locked': '<span class="badge bg-info fs-6">Locked</span>'
            };
            return badges[status] || '<span class="badge bg-secondary fs-6">Unknown</span>';
        },
        
        generateReport: function() {
            window.open(TempleCore.buildTempleUrl('reconciliation/report/' + this.reconciliationId), '_blank');
        }
    };
    
})(jQuery, window);