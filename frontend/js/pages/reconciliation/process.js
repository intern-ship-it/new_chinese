// js/pages/reconciliation/process.js
(function($, window) {
    'use strict';
    
    window.ReconciliationProcessPage = {
        reconciliationId: null,
        reconciliation: null,
        selectedItems: [],
        currentFilter: 'all', // Track current filter state
        
        init: function(params) {
            this.params = params || {};
            
            // Get ID from URL path or params
            // Support both formats: /reconciliation/process/27 and /reconciliation/27/process
           const pathParts = window.location.pathname.split('/');
            let reconciliationId = null;
            
            // Check for /reconciliation/process/27 format
            if (pathParts.includes('process')) {
                const processIndex = pathParts.indexOf('process');
                if (processIndex > -1 && pathParts[processIndex + 1]) {
                    reconciliationId = pathParts[processIndex + 1];
                }
            }
            
            // Check for /reconciliation/27/process format
            if (!reconciliationId && pathParts.includes('reconciliation')) {
                const recIndex = pathParts.indexOf('reconciliation');
                if (recIndex > -1 && pathParts[recIndex + 1] && !isNaN(pathParts[recIndex + 1])) {
                    reconciliationId = pathParts[recIndex + 1];
                }
            }
            
            // Fallback to params.id if not found in URL
            this.reconciliationId = params.id;
			console.log('this.reconciliationId');
			console.log(this.reconciliationId);
			if (!this.reconciliationId) {
				TempleCore.showToast('Invalid reconciliation ID', 'error');
				TempleRouter.navigate('reconciliation');
				return;
			}
			// Update browser URL to standard format if needed
			const templeId = TempleAPI.getTempleId();
			const expectedUrl = '/' + templeId + '/reconciliation/process/' + this.reconciliationId;
			console.log('expectedUrl');
			console.log(expectedUrl);
			console.log('window.location.pathname');
			console.log(window.location.pathname);
			if (window.location.pathname !== expectedUrl) {
				window.history.replaceState(null, '', expectedUrl);
			}
            
            this.loadReconciliation();
        },
        
        loadReconciliation: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/reconciliation/' + this.reconciliationId + '/process')
            .done(function(response) {
                if (response.success) {
                    self.reconciliation = response.data.reconciliation;
                    self.transactions = response.data.transactions;
                    self.pendingTransactions = response.data.pending_transactions;
                    self.render();
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
        
        render: function() {
            const rec = this.reconciliation;
            const difference = parseFloat(rec.difference || 0);
            const differenceClass = Math.abs(difference) > 0.01 ? 'text-danger' : 'text-success';
            
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-12">
                            <h1 class="h3 mb-0">Bank Reconciliation - ${rec.month_display || rec.month}</h1>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('reconciliation'); return false;">Bank Reconciliation</a></li>
                                    <li class="breadcrumb-item active">Process</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    
                    <!-- Header Information -->
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
                                    <p><strong>Opening Balance:</strong><br>${TempleCore.formatCurrency(rec.opening_balance)}</p>
                                </div>
                                <div class="col-md-3">
                                    <p><strong>Statement Closing Balance:</strong><br>${TempleCore.formatCurrency(rec.statement_closing_balance)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Reconciliation Status -->
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">Reconciliation Status</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="form-label">Reconciled Balance</label>
                                    <input type="text" class="form-control" id="reconciledBalance" 
                                           value="${TempleCore.formatCurrency(rec.reconciled_balance)}" readonly>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Statement Balance</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="statementBalance" 
                                               value="${TempleCore.formatCurrency(rec.statement_closing_balance)}" readonly>
                                        ${rec.status === 'draft' ? `
                                        <button class="btn btn-outline-secondary" onclick="ReconciliationProcessPage.editBalance()" title="Edit Balance">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Difference</label>
                                    <input type="text" class="form-control ${differenceClass}" id="difference" 
                                           value="${TempleCore.formatCurrency(difference)}" readonly>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Actions</label><br>
                                    <div id="reconciliationActions">
                                    ${Math.abs(difference) > 0.01 ? `
                                        <button class="btn btn-warning btn-sm" onclick="ReconciliationProcessPage.showAdjustmentModal()">
                                            <i class="bi bi-plus"></i> Add Adjustment
                                        </button>
                                    ` : `
                                        <button class="btn btn-success btn-sm" onclick="ReconciliationProcessPage.finalizeReconciliation()">
                                            <i class="bi bi-check"></i> Finalize
                                        </button>
                                    `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filter Controls for Tick/Untick -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="btn-group" role="group" aria-label="Transaction Filter">
                                        <button type="button" class="btn btn-outline-primary active" id="filterAll" 
                                                onclick="ReconciliationProcessPage.applyTransactionFilter('all')">
                                            <i class="bi bi-list-ul"></i> All Transactions
                                        </button>
                                        <button type="button" class="btn btn-outline-success" id="filterTicked" 
                                                onclick="ReconciliationProcessPage.applyTransactionFilter('ticked')">
                                            <i class="bi bi-check-square"></i> Ticked Only
                                        </button>
                                        <button type="button" class="btn btn-outline-danger" id="filterUnticked" 
                                                onclick="ReconciliationProcessPage.applyTransactionFilter('unticked')">
                                            <i class="bi bi-square"></i> Unticked Only
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-6 text-end">
                                    <span class="badge bg-info" id="transactionCount">
                                        Showing: <span id="visibleCount">0</span> / <span id="totalCount">0</span> transactions
                                    </span>
                                </div>
                            </div>
                            <!-- Totals Section -->
                            <div class="row mt-3">
                                <div class="col-md-12">
                                    <div class="alert alert-light mb-0">
                                        <div class="row text-center">
                                            <div class="col-md-4">
                                                <strong>Total Debit:</strong> <span id="totalDebit" class="text-success">RM 0.00</span>
                                            </div>
                                            <div class="col-md-4">
                                                <strong>Total Credit:</strong> <span id="totalCredit" class="text-danger">RM 0.00</span>
                                            </div>
                                            <div class="col-md-4">
                                                <strong>Net Total:</strong> <span id="netTotal" class="text-primary">RM 0.00</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Current Month Transactions -->
                    <div class="card mb-3">
                        <div class="card-header bg-danger text-white">
                            <h5 class="mb-0">Current Month Transactions</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered" id="currentTransactions">
                                    <thead>
                                        <tr>
                                            <th width="5%">
                                                <input type="checkbox" id="selectAllCurrent" 
                                                       onchange="ReconciliationProcessPage.toggleSelectAll('current')">
                                            </th>
                                            <th>Date</th>
                                            <th>Entry No</th>
                                            <th>Particulars</th>
                                            <th>Debit</th>
                                            <th>Credit</th>
                                            <th>Balance</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="currentTransactionsList"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pending Transactions -->
                    ${this.pendingTransactions && this.pendingTransactions.length > 0 ? `
                    <div class="card">
                        <div class="card-header bg-warning">
                            <h5 class="mb-0">Pending Transactions from Previous Months</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered" id="pendingTransactions">
                                    <thead>
                                        <tr>
                                            <th width="5%">
                                                <input type="checkbox" id="selectAllPending" 
                                                       onchange="ReconciliationProcessPage.toggleSelectAll('pending')">
                                            </th>
                                            <th>Date</th>
                                            <th>Entry No</th>
                                            <th>Particulars</th>
                                            <th>Debit</th>
                                            <th>Credit</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="pendingTransactionsList"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Modals -->
                ${this.renderModals()}
            `;
            
            $('#page-container').html(html);
            this.renderTransactions();
            this.bindEvents();
            this.updateTransactionCount();
            // Add delay to ensure DOM is ready before calculating
            setTimeout(function() {
                ReconciliationProcessPage.calculateVisibleTotals();
            }, 200);
        },
        
        renderTransactions: function() {
            // Render current month transactions
            let runningBalance = parseFloat(this.reconciliation.opening_balance || 0);
            let currentHtml = '';
            
            if (this.transactions) {
                this.transactions.forEach(function(trans) {
                    const isDebit = trans.dc === 'D';
                    const amount = parseFloat(trans.amount || 0);
                    
                    if (isDebit) {
                        runningBalance += amount;
                    } else {
                        runningBalance -= amount;
                    }
                    
                    const isReconciled = trans.reconciliation_id == ReconciliationProcessPage.reconciliationId && trans.is_reconciled == 1;
					const rowClass = isReconciled ? 'table-success' : '';
                    
                    // Check if transaction has investigation note
                    const hasNote = trans.narration && trans.narration.includes('Investigation:');
                    
                    currentHtml += `
                        <tr class="${rowClass} transaction-row" data-item-id="${trans.id}" data-reconciled="${isReconciled ? 'true' : 'false'}" data-amount-debit="${isDebit ? amount : 0}" data-amount-credit="${!isDebit ? amount : 0}">
                            <td>
                                <input type="checkbox" class="reconcile-item" value="${trans.id}" 
                                       ${isReconciled ? 'checked' : ''}
                                       onchange="ReconciliationProcessPage.updateReconciliation()">
                            </td>
                            <td>${TempleCore.formatDate(trans.entry?.date)}</td>
                            <td>${trans.entry?.entry_code || 'N/A'}</td>
                            <td>
                                ${trans.entry?.narration || ''}
                                ${hasNote ? '<br><small class="text-warning"><i class="bi bi-tag-fill"></i> ' + trans.narration.split('Investigation:')[1] + '</small>' : ''}
                            </td>
                            <td class="debit-amount">${isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
                            <td class="credit-amount">${!isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
                            <td>${TempleCore.formatCurrency(runningBalance)}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="ReconciliationProcessPage.showInvestigationModal(${trans.id})" 
                                        title="Add Investigation Note">
                                    <i class="bi bi-tag"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#currentTransactionsList').html(currentHtml || '<tr><td colspan="8" class="text-center">No transactions found</td></tr>');
            
            // Render pending transactions
            if (this.pendingTransactions && this.pendingTransactions.length > 0) {
				let pendingHtml = '';
				
				this.pendingTransactions.forEach(function(trans) {
					const isDebit = trans.dc === 'D';
					const amount = parseFloat(trans.amount || 0);
					const hasNote = trans.narration && trans.narration.includes('Investigation:');
					
					// Check if this transaction is reconciled in THIS reconciliation
					const isReconciled = trans.reconciliation_id == ReconciliationProcessPage.reconciliationId && trans.is_reconciled == 1;
					const rowClass = isReconciled ? 'table-success' : '';
					
					pendingHtml += `
						<tr class="${rowClass} transaction-row" data-item-id="${trans.id}" data-reconciled="${isReconciled ? 'true' : 'false'}" data-amount-debit="${isDebit ? amount : 0}" data-amount-credit="${!isDebit ? amount : 0}">
							<td>
								<input type="checkbox" class="reconcile-item" value="${trans.id}"
									   ${isReconciled ? 'checked' : ''}
									   onchange="ReconciliationProcessPage.updateReconciliation()">
							</td>
							<td>${TempleCore.formatDate(trans.entry?.date)}</td>
							<td>${trans.entry?.entry_code || 'N/A'}</td>
							<td>
								${trans.entry?.narration || ''}
								${hasNote ? '<br><small class="text-warning"><i class="bi bi-tag-fill"></i> ' + trans.narration.split('Investigation:')[1] + '</small>' : ''}
							</td>
							<td class="debit-amount">${isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
							<td class="credit-amount">${!isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
							<td>
								<button class="btn btn-sm btn-info" onclick="ReconciliationProcessPage.showInvestigationModal(${trans.id})" 
										title="Add Investigation Note">
									<i class="bi bi-tag"></i>
								</button>
							</td>
						</tr>
					`;
				});
				
				$('#pendingTransactionsList').html(pendingHtml);
			}
            
            // Calculate totals after DOM is updated
            this.updateTransactionCount();
            this.calculateVisibleTotals();
        },
        
        applyTransactionFilter: function(filter) {
            this.currentFilter = filter;
            
            // Update button states
            $('#filterAll, #filterTicked, #filterUnticked').removeClass('active');
            
            if (filter === 'all') {
                $('#filterAll').addClass('active');
                $('.transaction-row').show();
            } else if (filter === 'ticked') {
                $('#filterTicked').addClass('active');
                $('.transaction-row').hide();
                $('.transaction-row[data-reconciled="true"]').show();
            } else if (filter === 'unticked') {
                $('#filterUnticked').addClass('active');
                $('.transaction-row').hide();
                $('.transaction-row[data-reconciled="false"]').show();
            }
            
            this.updateTransactionCount();
            this.calculateVisibleTotals();
            
            // Update select all checkbox state based on visible rows
            this.updateSelectAllState();
        },
        
        calculateVisibleTotals: function() {
            let totalDebit = 0;
            let totalCredit = 0;
            
            // Calculate totals for visible transactions by reading the actual cell values
            $('.transaction-row:visible').each(function() {
                const $row = $(this);
                
                // Get debit value from the 5th column (index 4)
                const debitCell = $row.find('td:eq(4)').text().trim();
                if (debitCell !== '-' && debitCell !== '') {
                    // Remove RM, spaces, and commas, then parse
                    const debitValue = debitCell.replace(/RM\s*/g, '').replace(/,/g, '');
                    const debitAmount = parseFloat(debitValue) || 0;
                    totalDebit += debitAmount;
                }
                
                // Get credit value from the 6th column (index 5)
                const creditCell = $row.find('td:eq(5)').text().trim();
                if (creditCell !== '-' && creditCell !== '') {
                    // Remove RM, spaces, and commas, then parse
                    const creditValue = creditCell.replace(/RM\s*/g, '').replace(/,/g, '');
                    const creditAmount = parseFloat(creditValue) || 0;
                    totalCredit += creditAmount;
                }
            });
            
            const netTotal = totalDebit - totalCredit;
            
            // Update display with proper formatting
            $('#totalDebit').text(TempleCore.formatCurrency(totalDebit));
            $('#totalCredit').text(TempleCore.formatCurrency(totalCredit));
            
            // Format net total with appropriate color
            const $netTotal = $('#netTotal');
            
            if (netTotal > 0) {
                $netTotal.removeClass('text-danger text-primary').addClass('text-success');
                $netTotal.text('+' + TempleCore.formatCurrency(netTotal));
            } else if (netTotal < 0) {
                $netTotal.removeClass('text-success text-primary').addClass('text-danger');
                $netTotal.text(TempleCore.formatCurrency(netTotal));
            } else {
                $netTotal.removeClass('text-success text-danger').addClass('text-primary');
                $netTotal.text(TempleCore.formatCurrency(0));
            }
            
            console.log('Totals calculated - Debit:', totalDebit, 'Credit:', totalCredit, 'Net:', netTotal);
        },
        
        updateTransactionCount: function() {
            const totalCount = $('.transaction-row').length;
            const visibleCount = $('.transaction-row:visible').length;
            
            $('#totalCount').text(totalCount);
            $('#visibleCount').text(visibleCount);
            
            // Show/hide no results message
            if (visibleCount === 0 && totalCount > 0) {
                const filterText = this.currentFilter === 'ticked' ? 'ticked' : 'unticked';
                const noResultsHtml = `
                    <tr class="no-results">
                        <td colspan="8" class="text-center text-muted">
                            No ${filterText} transactions found
                        </td>
                    </tr>
                `;
                
                // Remove existing no results message
                $('.no-results').remove();
                
                // Add no results message if needed
                if ($('#currentTransactionsList .transaction-row:visible').length === 0) {
                    $('#currentTransactionsList').append(noResultsHtml);
                }
                if ($('#pendingTransactionsList .transaction-row:visible').length === 0) {
                    $('#pendingTransactionsList').append(noResultsHtml);
                }
            } else {
                $('.no-results').remove();
            }
        },
        
        updateSelectAllState: function() {
            // Update select all checkbox for current transactions
            const visibleCurrentItems = $('#currentTransactions .transaction-row:visible .reconcile-item');
            const checkedCurrentItems = $('#currentTransactions .transaction-row:visible .reconcile-item:checked');
            
            if (visibleCurrentItems.length > 0) {
                $('#selectAllCurrent').prop('checked', visibleCurrentItems.length === checkedCurrentItems.length);
                $('#selectAllCurrent').prop('indeterminate', 
                    checkedCurrentItems.length > 0 && checkedCurrentItems.length < visibleCurrentItems.length);
            } else {
                $('#selectAllCurrent').prop('checked', false);
                $('#selectAllCurrent').prop('indeterminate', false);
            }
            
            // Update select all checkbox for pending transactions
            const visiblePendingItems = $('#pendingTransactions .transaction-row:visible .reconcile-item');
            const checkedPendingItems = $('#pendingTransactions .transaction-row:visible .reconcile-item:checked');
            
            if (visiblePendingItems.length > 0) {
                $('#selectAllPending').prop('checked', visiblePendingItems.length === checkedPendingItems.length);
                $('#selectAllPending').prop('indeterminate', 
                    checkedPendingItems.length > 0 && checkedPendingItems.length < visiblePendingItems.length);
            } else {
                $('#selectAllPending').prop('checked', false);
                $('#selectAllPending').prop('indeterminate', false);
            }
        },
        
        toggleSelectAll: function(type) {
            const isChecked = type === 'current' ? 
                $('#selectAllCurrent').prop('checked') : 
                $('#selectAllPending').prop('checked');
                
            const selector = type === 'current' ? 
                '#currentTransactions .transaction-row:visible .reconcile-item' : 
                '#pendingTransactions .transaction-row:visible .reconcile-item';
                
            $(selector).prop('checked', isChecked);
            this.updateReconciliation();
        },
        
        updateReconciliation: function() {
            const selectedItems = [];
            $('.reconcile-item:checked').each(function() {
                selectedItems.push($(this).val());
            });
            
            TempleAPI.post('/accounts/reconciliation/' + this.reconciliationId + '/update-items', {
                items: selectedItems
            })
            .done(function(response) {
                if (response.success) {
                    $('#reconciledBalance').val(TempleCore.formatCurrency(response.data.reconciled_balance));
                    $('#difference').val(TempleCore.formatCurrency(response.data.difference));
                    
                    const difference = parseFloat(response.data.difference);
                    if (Math.abs(difference) > 0.01) {
                        $('#difference').removeClass('text-success').addClass('text-danger');
                    } else {
                        $('#difference').removeClass('text-danger').addClass('text-success');
                    }
                    
                    // Update the Actions button based on the difference
                    ReconciliationProcessPage.updateActionsButton(difference);
                    
                    // Update row highlighting and data attributes
                    $('.reconcile-item').each(function() {
                        const $row = $(this).closest('tr');
                        if ($(this).prop('checked')) {
                            $row.addClass('table-success');
                            $row.attr('data-reconciled', 'true');
                        } else {
                            $row.removeClass('table-success');
                            $row.attr('data-reconciled', 'false');
                        }
                    });
                    
                    // Update counters and select all states
                    ReconciliationProcessPage.updateTransactionCount();
                    ReconciliationProcessPage.calculateVisibleTotals();
                    ReconciliationProcessPage.updateSelectAllState();
                }
            })
            .fail(function() {
                TempleCore.showToast('Failed to update reconciliation', 'error');
            });
        },
        
        updateActionsButton: function(difference) {
            // Find the Actions div by ID
            const actionsDiv = $('#reconciliationActions');
            
            if (actionsDiv.length) {
                let actionsHtml = '';
                
                if (Math.abs(difference) > 0.01) {
                    // Show Add Adjustment button if there's a difference
                    actionsHtml = `
                        <button class="btn btn-warning btn-sm" onclick="ReconciliationProcessPage.showAdjustmentModal()">
                            <i class="bi bi-plus"></i> Add Adjustment
                        </button>
                    `;
                } else {
                    // Show Finalize button if reconciled
                    actionsHtml = `
                        <button class="btn btn-success btn-sm" onclick="ReconciliationProcessPage.finalizeReconciliation()">
                            <i class="bi bi-check"></i> Finalize
                        </button>
                    `;
                }
                
                actionsDiv.html(actionsHtml);
            }
        },
        
        renderModals: function() {
            return `
                <!-- Adjustment Modal -->
                <div class="modal fade" id="adjustmentModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create Manual Adjustment</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="adjustmentForm">
                                    <div class="mb-3">
                                        <label class="form-label">Adjustment Type <span class="text-danger">*</span></label>
                                        <select class="form-select" id="adjustmentType" required>
                                            <option value="">Select Type</option>
                                            <option value="debit">Debit (Increase Balance)</option>
                                            <option value="credit">Credit (Decrease Balance)</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Adjustment Ledger <span class="text-danger">*</span></label>
                                        <select class="form-select" id="adjustmentLedger" required>
                                            <option value="">Select Ledger</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Amount <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="adjustmentAmount" 
                                               step="0.01" min="0.01" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Description <span class="text-danger">*</span></label>
                                        <textarea class="form-control" id="adjustmentDescription" rows="3" required></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="ReconciliationProcessPage.createAdjustment()">
                                    Create Adjustment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Investigation Note Modal -->
                <div class="modal fade" id="investigationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Investigation Note</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" id="investigationItemId">
                                <div class="mb-3">
                                    <label class="form-label">Investigation Note <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="investigationNote" rows="3" 
                                              placeholder="Enter your investigation notes here..." required></textarea>
                                    <small class="text-muted">This note will be attached to the transaction for tracking purposes.</small>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="ReconciliationProcessPage.saveInvestigationNote()">
                                    <i class="bi bi-save"></i> Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Finalize Modal -->
                <div class="modal fade" id="finalizeModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Finalize Reconciliation</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Are you sure you want to finalize this reconciliation?</p>
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> Once finalized, the reconciliation will be marked as completed and can be locked.
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes (Optional)</label>
                                    <textarea class="form-control" id="finalizeNotes" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" onclick="ReconciliationProcessPage.confirmFinalize()">
                                    <i class="bi bi-check-circle"></i> Finalize Reconciliation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        bindEvents: function() {
            // Load ledgers for adjustment modal
            TempleAPI.get('/accounts/ledgers/type/normal')
            .done(function(response) {
                if (response.success) {
                    let options = '<option value="">Select Ledger</option>';
                    response.data.forEach(function(ledger) {
                        options += `<option value="${ledger.id}">${ledger.left_code}/${ledger.right_code} - ${ledger.name}</option>`;
                    });
                    $('#adjustmentLedger').html(options);
                }
            });
        },
        
        showAdjustmentModal: function() {
            $('#adjustmentForm')[0].reset();
            const modal = new bootstrap.Modal(document.getElementById('adjustmentModal'));
            modal.show();
        },
        
        showInvestigationModal: function(itemId) {
            $('#investigationItemId').val(itemId);
            $('#investigationNote').val('');
            const modal = new bootstrap.Modal(document.getElementById('investigationModal'));
            modal.show();
        },
        
        saveInvestigationNote: function() {
            const itemId = $('#investigationItemId').val();
            const note = $('#investigationNote').val().trim();
            
            if (!note) {
                TempleCore.showToast('Please enter an investigation note', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/reconciliation/' + this.reconciliationId + '/investigation-note', {
                item_id: itemId,
                note: note
            })
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast('Investigation note added successfully', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('investigationModal')).hide();
                    ReconciliationProcessPage.loadReconciliation();
                } else {
                    TempleCore.showToast(response.message || 'Failed to add investigation note', 'error');
                }
            })
            .fail(function() {
                TempleCore.showToast('An error occurred while saving the note', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        createAdjustment: function() {
            const data = {
                type: $('#adjustmentType').val(),
                adjustment_ledger_id: $('#adjustmentLedger').val(),
                amount: $('#adjustmentAmount').val(),
                description: $('#adjustmentDescription').val()
            };
            
            // Validation
            if (!data.type || !data.adjustment_ledger_id || !data.amount || !data.description) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/reconciliation/' + this.reconciliationId + '/adjustment', data)
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast('Adjustment created successfully', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('adjustmentModal')).hide();
                    ReconciliationProcessPage.loadReconciliation();
                } else {
                    TempleCore.showToast(response.message || 'Failed to create adjustment', 'error');
                }
            })
            .fail(function() {
                TempleCore.showToast('An error occurred', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        finalizeReconciliation: function() {
            const modal = new bootstrap.Modal(document.getElementById('finalizeModal'));
            modal.show();
        },
        
        confirmFinalize: function() {
            const notes = $('#finalizeNotes').val();
            
            TempleCore.showLoading(true);
            
            TempleAPI.put('/accounts/reconciliation/' + this.reconciliationId + '/finalize', {
                notes: notes
            })
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast('Reconciliation finalized successfully', 'success');
                    TempleRouter.navigate('reconciliation');
                } else {
                    TempleCore.showToast(response.message || 'Failed to finalize reconciliation', 'error');
                }
            })
            .fail(function() {
                TempleCore.showToast('An error occurred', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        editBalance: function() {
            const currentBalance = this.reconciliation.statement_closing_balance;
            const newBalance = prompt('Enter new statement closing balance:', currentBalance);
            
            if (newBalance && !isNaN(newBalance)) {
                TempleAPI.post('/accounts/reconciliation/' + this.reconciliationId + '/update-balance', {
                    statement_closing_balance: newBalance
                })
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Balance updated successfully', 'success');
                        ReconciliationProcessPage.loadReconciliation();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update balance', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to update balance', 'error');
                });
            }
        }
    };
    
})(jQuery, window);