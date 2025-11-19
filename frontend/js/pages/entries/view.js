// js/pages/entries/view.js
(function($, window) {
    'use strict';
    
    window.EntriesViewPage = {
        entryId: null,
        entryData: null,
        
        init: function(params) {
            this.entryId = params.id;
            this.loadEntry();
        },
        
        loadEntry: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/accounts/entries/${this.entryId}`)
                .done(function(response) {
                    if (response.success) {
                        self.entryData = response.data;
                        self.render();
                        self.bindEvents();
                    } else {
                        TempleCore.showToast('Entry not found', 'error');
                        TempleRouter.navigate('entries');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load entry', 'error');
                    TempleRouter.navigate('entries');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        render: function() {
            const entry = this.entryData;
            const typeInfo = this.getEntryTypeInfo(entry.entrytype_id);
            
            let itemsHtml = '';
            let hasInventory = false;
            
            entry.entry_items.forEach(item => {
                if (item.quantity) hasInventory = true;
                
                itemsHtml += `
                    <tr>
                        <td>${item.ledger.name} (${item.ledger.left_code}/${item.ledger.right_code})</td>
                        <td class="text-end">${item.dc === 'D' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                        <td class="text-end">${item.dc === 'C' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                        ${hasInventory ? `
                            <td class="text-center">${item.quantity || '-'}</td>
                            <td class="text-end">${item.unit_price ? TempleCore.formatCurrency(item.unit_price) : '-'}</td>
                        ` : ''}
                        <td>${item.details || '-'}</td>
                    </tr>
                `;
            });
            
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-${typeInfo.icon}"></i> View ${typeInfo.name}
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <div class="card mb-4">
                        <div class="card-header bg-${typeInfo.color} text-white">
                            <h5 class="mb-0">Entry Information</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <table class="table table-sm">
                                        <tr>
                                            <th width="150">Entry Code:</th>
                                            <td><code>${entry.entry_code}</code></td>
                                        </tr>
                                        <tr>
                                            <th>Date:</th>
                                            <td>${TempleCore.formatDate(entry.date)}</td>
                                        </tr>
                                        <tr>
                                            <th>Type:</th>
                                            <td><span class="badge bg-${typeInfo.color}">${typeInfo.name}</span></td>
                                        </tr>
                                        <tr>
                                            <th>Fund:</th>
                                            <td>${entry.fund?.name || '-'}</td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <table class="table table-sm">
                                        ${entry.payment ? `
                                        <tr>
                                            <th width="150">Payment Mode:</th>
                                            <td>${entry.payment}</td>
                                        </tr>
                                        ` : ''}
                                        ${entry.cheque_no ? `
                                        <tr>
                                            <th>Cheque No:</th>
                                            <td>${entry.cheque_no}</td>
                                        </tr>
                                        <tr>
                                            <th>Cheque Date:</th>
                                            <td>${TempleCore.formatDate(entry.cheque_date)}</td>
                                        </tr>
                                        ` : ''}
                                        ${entry.paid_to ? `
                                        <tr>
                                            <th>Paid To/Received From:</th>
                                            <td>${entry.paid_to}</td>
                                        </tr>
                                        ` : ''}
                                        <tr>
                                            <th>Created By:</th>
                                            <td>${entry.creator?.name || '-'}</td>
                                        </tr>
                                        <tr>
                                            <th>Created At:</th>
                                            <td>${TempleCore.formatDate(entry.created_at, 'time')}</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            
                            ${entry.narration ? `
                            <div class="row mt-3">
                                <div class="col-12">
                                    <strong>Narration:</strong>
                                    <p class="mb-0">${entry.narration}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Entry Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Account</th>
                                            <th width="120" class="text-end">Debit</th>
                                            <th width="120" class="text-end">Credit</th>
                                            ${hasInventory ? `
                                                <th width="100" class="text-center">Quantity</th>
                                                <th width="120" class="text-end">Unit Price</th>
                                            ` : ''}
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsHtml}
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-active">
                                            <th>Total</th>
                                            <th class="text-end">${TempleCore.formatCurrency(entry.dr_total)}</th>
                                            <th class="text-end">${TempleCore.formatCurrency(entry.cr_total)}</th>
                                            ${hasInventory ? '<th colspan="2"></th>' : ''}
                                            <th></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            ${entry.inv_type ? `
                            <div class="alert alert-info mt-3">
                                <i class="bi bi-info-circle"></i> 
                                This entry was automatically created from bookings and cannot be edited or deleted.
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                    <i class="bi bi-arrow-left"></i> Back
                                </button>
                                <div>
                                    <button type="button" class="btn btn-info" id="btnPrint">
                                        <i class="bi bi-printer"></i> Print
                                    </button>
                                    ${entry.can_edit ? `
                                    <button type="button" class="btn btn-warning ms-2" id="btnEdit">
                                        <i class="bi bi-pencil"></i> Edit
                                    </button>
                                    ` : ''}
                                    <button type="button" class="btn btn-success ms-2" id="btnCopy">
                                        <i class="bi bi-files"></i> Copy
                                    </button>
                                    ${entry.can_delete ? `
                                    <button type="button" class="btn btn-danger ms-2" id="btnDelete">
                                        <i class="bi bi-trash"></i> Delete
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        getEntryTypeInfo: function(entryTypeId) {
            const types = {
                1: { name: 'Receipt', color: 'success', icon: 'cash-stack' },
                2: { name: 'Payment', color: 'danger', icon: 'credit-card' },
                3: { name: 'Contra', color: 'info', icon: 'arrow-left-right' },
                4: { name: 'Journal', color: 'warning', icon: 'journal-text' },
                5: { name: 'Credit Note', color: 'secondary', icon: 'file-minus' },
                6: { name: 'Debit Note', color: 'primary', icon: 'file-plus' },
                7: { name: 'Inventory Journal', color: 'dark', icon: 'box-seam' }
            };
            return types[entryTypeId] || { name: 'Unknown', color: 'secondary', icon: 'file' };
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnPrint').on('click', function() {
                self.printEntry();
            });
            
            $('#btnEdit').on('click', function() {
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                const entryType = typeMap[self.entryData.entrytype_id];
                TempleRouter.navigate(`entries/${entryType}/edit/${self.entryId}`);
            });
            
            $('#btnCopy').on('click', function() {
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                const entryType = typeMap[self.entryData.entrytype_id];
                TempleRouter.navigate(`entries/${entryType}/copy/${self.entryId}`);
            });
            
            $('#btnDelete').on('click', function() {
                TempleCore.showConfirm(
                    'Delete Entry',
                    'Are you sure you want to delete this entry? This action cannot be undone.',
                    function() {
                        self.deleteEntry();
                    }
                );
            });
        },
        
        printEntry: function() {
            EntryComponents.printEntry(this.entryId, this.entryData.entrytype_id);
        },
        
        deleteEntry: function() {
            TempleCore.showLoading(true);
            
            TempleAPI.delete(`/accounts/entries/${this.entryId}`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Entry deleted successfully', 'success');
                        TempleRouter.navigate('entries');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to delete entry', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while deleting entry', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        }
    };
    
})(jQuery, window);