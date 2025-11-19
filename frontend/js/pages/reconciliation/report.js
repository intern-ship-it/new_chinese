// js/pages/reconciliation/report.js
(function($, window) {
    'use strict';
    console.log('fsdfds');
    window.ReconciliationReportPage = {
        reconciliationId: null,
        reportData: null,
        
        init: function(params) {
            this.params = params || {};
            this.reconciliationId = params.id;
            
            if (!this.reconciliationId) {
                TempleCore.showToast('Invalid reconciliation ID', 'error');
                TempleRouter.navigate('reconciliation');
                return;
            }
            
            this.loadReport();
        },
        
        loadReport: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/reconciliation/' + this.reconciliationId + '/report')
            .done(function(response) {
                if (response.success) {
                    self.reportData = response.data;
                    self.render();
                } else {
                    TempleCore.showToast(response.message || 'Failed to load report', 'error');
                    TempleRouter.navigate('reconciliation');
                }
            })
            .fail(function() {
                TempleCore.showToast('An error occurred loading the report', 'error');
                TempleRouter.navigate('reconciliation');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        render: function() {
            const data = this.reportData;
            const rec = data.reconciliation;
            const temple = TempleCore.getTemple();
            console.log('this.reportData');
            console.log(this.reportData);
            // Calculate summary values
            const statementBalance = parseFloat(rec.statement_closing_balance || 0);
            const reconciledBalance = parseFloat(rec.reconciled_balance || 0);
            const difference = parseFloat(rec.difference || 0);
            const totalUnpresented = parseFloat(data.total_unpresented || 0);
            const totalUncleared = parseFloat(data.total_uncleared || 0);
            
            const html = `
                <div class="container-fluid" id="reportContainer">
                    <!-- Action Buttons (No Print) -->
                    <div class="row mb-3 no-print">
                        <div class="col-md-12 text-end">
                            <button class="btn btn-primary" onclick="ReconciliationReportPage.print()">
                                <i class="bi bi-printer"></i> Print Report
                            </button>
                            
                            <a href="#" onclick="TempleRouter.navigate('reconciliation'); return false;" class="btn btn-secondary">
                                <i class="bi bi-arrow-left"></i> Back
                            </a>
                        </div>
                    </div>
                    
                    <!-- Report Content -->
                    <div class="report-content bg-white p-4">
                        <!-- Header -->
                        <div class="report-header text-center mb-4">
                            ${temple.logo ? `<img src="${temple.logo}" alt="${temple.name}" style="height: 80px;" class="mb-3">` : ''}
                            <h2 class="mb-1">${temple.name || 'Temple Management System'}</h2>
                            <p class="mb-0">${temple.address || ''}</p>
                            ${temple.phone ? `<p class="mb-0">Phone: ${temple.phone}</p>` : ''}
                            ${temple.email ? `<p class="mb-0">Email: ${temple.email}</p>` : ''}
                            <hr class="my-3">
                            <h3>Bank Reconciliation Statement</h3>
                            <h5>${rec.ledger?.name || 'Bank Account'}</h5>
                            <h6>For the month of ${rec.month_display || rec.month}</h6>
                        </div>
                        
                        <!-- Summary Section -->
                        <div class="summary-section mb-4">
                            <table class="table table-bordered">
                                <tbody>
                                    <tr>
                                        <td width="70%"><strong>Balance as per Bank Statement</strong></td>
                                        <td width="30%" class="text-end">${TempleCore.formatCurrency(statementBalance)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Unpresented Cheques -->
                        ${data.unpresented_cheques && data.unpresented_cheques.length > 0 ? `
                        <div class="section mb-4">
                            <h6 class="mb-3">Add: Cheques Issued but Not Presented</h6>
                            <table class="table table-bordered table-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Entry No</th>
                                        <th>Particulars</th>
                                        <th class="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderUnreconciledItems(data.unpresented_cheques)}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="3">Total</th>
                                        <th class="text-end">${TempleCore.formatCurrency(totalUnpresented)}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- Uncleared Deposits -->
                        ${data.uncleared_deposits && data.uncleared_deposits.length > 0 ? `
                        <div class="section mb-4">
                            <h6 class="mb-3">Less: Cheques Deposited but Not Cleared</h6>
                            <table class="table table-bordered table-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Entry No</th>
                                        <th>Particulars</th>
                                        <th class="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderUnreconciledItems(data.uncleared_deposits)}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="3">Total</th>
                                        <th class="text-end">${TempleCore.formatCurrency(totalUncleared)}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- Adjustments -->
                        ${rec.adjustments && rec.adjustments.length > 0 ? `
                        <div class="section mb-4">
                            <h6 class="mb-3">Reconciliation Adjustments</h6>
                            <table class="table table-bordered table-sm">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Type</th>
                                        <th class="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderAdjustments(rec.adjustments)}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- Final Balance -->
                        <div class="final-balance mb-4">
                            <table class="table table-bordered">
                                <tbody>
                                    <tr>
                                        <td width="70%"><strong>Balance as per Books</strong></td>
                                        <td width="30%" class="text-end"><strong>${TempleCore.formatCurrency(reconciledBalance)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Difference</strong></td>
                                        <td class="text-end">
                                            <strong class="${Math.abs(difference) > 0.01 ? 'text-danger' : 'text-success'}">
                                                ${TempleCore.formatCurrency(difference)}
                                            </strong>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Notes -->
                        ${rec.notes ? `
                        <div class="notes-section mb-4">
                            <h6>Notes:</h6>
                            <p>${rec.notes}</p>
                        </div>
                        ` : ''}
                        
                        <!-- Reconciled Transactions Details -->
                        <div class="details-section mb-4">
                            <h6 class="mb-3">Reconciled Transactions</h6>
                            <table class="table table-bordered table-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Entry No</th>
                                        <th>Particulars</th>
                                        <th class="text-end">Debit</th>
                                        <th class="text-end">Credit</th>
                                        <th class="text-end">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderReconciledItems(data.reconciled_items)}
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Signature Section -->
                        
                        <!-- Footer -->
                        <div class="report-footer text-center mt-4 text-muted small">
                            <p>Generated on: ${TempleCore.formatDate(new Date(), 'full')} at ${new Date().toLocaleTimeString()}</p>
                            <p>Status: ${this.getStatusBadge(rec.status)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Print Styles -->
                <style>
                    @media print {
                        .no-print {
                            display: none !important;
                        }
                        
                        .report-content {
                            margin: 0;
                            padding: 20px !important;
                        }
                        
                        .table {
                            font-size: 12px;
                        }
                        
                        h2 { font-size: 20px; }
                        h3 { font-size: 18px; }
                        h5 { font-size: 14px; }
                        h6 { font-size: 13px; }
                        
                        .signature-section {
                            page-break-inside: avoid;
                        }
                    }
                    
                    .report-content {
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        border-radius: 8px;
                    }
                    
                    .report-header {
                        border-bottom: 2px solid #dee2e6;
                        padding-bottom: 20px;
                    }
                    
                    .section {
                        page-break-inside: avoid;
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        renderUnreconciledItems: function(items) {
            let html = '';
            items.forEach(function(item) {
                html += `
                    <tr>
                        <td>${TempleCore.formatDate(item.entry?.date)}</td>
                        <td>${item.entry?.entry_code || 'N/A'}</td>
                        <td>${item.entry?.narration || ''}</td>
                        <td class="text-end">${TempleCore.formatCurrency(item.amount)}</td>
                    </tr>
                `;
            });
            return html;
        },
        
        renderReconciledItems: function(items) {
            let html = '';
            let runningBalance = parseFloat(this.reportData.reconciliation.opening_balance || 0);
            
            if (!items || items.length === 0) {
                return '<tr><td colspan="6" class="text-center">No reconciled transactions</td></tr>';
            }
            console.log('items');
            console.log(items);
            const itemsArray = Object.values(items);

			itemsArray.forEach(function(item) {
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
						<td class="text-end">${isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
						<td class="text-end">${!isDebit ? TempleCore.formatCurrency(amount) : '-'}</td>
						<td class="text-end">${TempleCore.formatCurrency(runningBalance)}</td>
					</tr>
				`;
			});
            
            return html;
        },
        
        renderAdjustments: function(adjustments) {
            let html = '';
            adjustments.forEach(function(adj) {
                html += `
                    <tr>
                        <td>${adj.description}</td>
                        <td>${adj.adjustment_type === 'manual_entry' ? 'Manual Entry' : 'Investigation'}</td>
                        <td class="text-end">${TempleCore.formatCurrency(adj.amount)}</td>
                    </tr>
                `;
            });
            return html;
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'draft': '<span class="badge bg-secondary">Draft</span>',
                'completed': '<span class="badge bg-success">Completed</span>',
                'locked': '<span class="badge bg-danger">Locked</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        print: function() {
            window.print();
        },
   
        
    
    };
    
})(jQuery, window);