// js/pages/entries/contra/edit.js
(function($, window) {
    'use strict';
    
    window.EntriesContraEditPage = {
        assetLedgers: [],
        funds: [],
        entryItems: [],
        itemCounter: 0,
        
        init: function(params) {
			this.entryId = params.id;
            this.render();
            this.loadMasterData();
            this.bindEvents();
            this.generateEntryCode();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-arrow-left-right"></i> Edit Contra Entry
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <form id="contraForm">
                        <div class="card mb-4">
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0">Contra Entry Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Entry Code</label>
                                        <input type="text" class="form-control" id="entryCode" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Fund <span class="text-danger">*</span></label>
                                        <select class="form-select" id="fundId" required>
                                            <option value="">Select Fund</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-12">
                                        <label class="form-label">Narration</label>
                                        <textarea class="form-control" id="narration" rows="2" 
                                                  placeholder="Enter details of this internal transfer..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Entry Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Asset Account Transfers</h5>
                                <button type="button" class="btn btn-light btn-sm" id="btnAddRow">
                                    <i class="bi bi-plus-circle"></i> Add Row
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> 
                                    <strong>Contra entries are for internal transfers between Cash or Bank accounts only.</strong>
                                    Only Cash or Bank accounts are available for selection.
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-bordered" id="entryItemsTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="40">#</th>
                                                <th>Asset Account</th>
                                                <th width="150">Debit Amount</th>
                                                <th width="150">Credit Amount</th>
                                                <th width="80">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="entryItemsBody">
                                            <!-- Dynamic rows will be added here -->
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-active">
                                                <th colspan="2" class="text-end">Total</th>
                                                <th class="text-end">
                                                    <span id="totalDebit">0.00</span>
                                                </th>
                                                <th class="text-end">
                                                    <span id="totalCredit">0.00</span>
                                                </th>
                                                <th></th>
                                            </tr>
                                            <tr>
                                                <th colspan="5" class="text-center">
                                                    <span id="balanceStatus" class="badge bg-warning">Not Balanced</span>
                                                    <span id="differenceAmount" class="ms-2"></span>
                                                </th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                    <div>
                                        <button type="button" class="btn btn-primary me-2" id="btnSaveAndNew">
                                            <i class="bi bi-plus-circle"></i> Save & New
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-check-circle"></i> Save Entry
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadMasterData: function() {
            const self = this;
            let loadedCount = 0;
            const totalLoads = 3;
            
            function checkAllLoaded() {
                loadedCount++;
                if (loadedCount === totalLoads) {
                    // All master data loaded, now load existing entry data
                    self.populateFormData();
                }
            }
            
            // Load Funds
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        self.funds = response.data;
                        const options = response.data.map(fund => 
                            `<option value="${fund.id}">${fund.name} (${fund.code})</option>`
                        ).join('');
                        $('#fundId').append(options);
                    }
                }).always(checkAllLoaded);
            
            // Load Asset Ledgers (Group 1000)
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
                .done(function(response) {
                    if (response.success) {
                        self.assetLedgers = response.data;
                    }
                }).always(checkAllLoaded);
			TempleCore.showLoading(true);
            
            TempleAPI.get(`/accounts/entries/${this.entryId}`)
                .done(function(response) {
                    if (response.success) {
                        self.originalData = response.data;
                        // Don't populate immediately - wait for master data to load
                    } else {
                        TempleCore.showToast('Failed to load payment data', 'error');
                        // setTimeout(() => TempleRouter.navigate('entries'), 2000);
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast('Error loading payment', 'error');
                    // setTimeout(() => TempleRouter.navigate('entries'), 2000);
                })
                .always(function() {
					checkAllLoaded();
                    TempleCore.showLoading(false);
                });
        },
        
        generateEntryCode: function() {
            const date = $('#entryDate').val();
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'CON',
                entrytype_id: 3,
                date: date
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            });
        },
        
        populateFormData: function() {
            // Add two default rows
            console.log(this.originalData);
            if (!this.originalData) return;
            
            const data = this.originalData;
			const formattedDate = data.date ? data.date.split('T')[0] : '';
            
            // Set basic fields
            $('#entryDate').val(formattedDate);
            $('#entryCode').val(data.entry_code || data.number);
			$('#fundId').val(data.fund_id);
			$('#narration').val(data.narration || '');
			data.entry_items.forEach(item => {
				if(item.dc === 'D'){
					this.addEntryRow({
						ledger_id: item.ledger_id,
						dr_amount: item.amount,
						cr_amount: 0,
						details: item.details || ''
					});
				}else{
					this.addEntryRow({
						ledger_id: item.ledger_id,
						dr_amount: 0,
						cr_amount: item.amount,
						details: item.details || ''
					});
				}
			});
			this.calculateTotals();
        },
        
        addEntryRow: function(existingItem = null) {
            const rowId = ++this.itemCounter;
            const options = this.assetLedgers.map(ledger => 
                `<option value="${ledger.id}" ${existingItem && existingItem.ledger_id == ledger.id ? 'selected' : ''}>(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
            ).join('');
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
                            <option value="">Select Asset Account</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control debit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01"  
                               value="${existingItem ? existingItem.dr_amount : '0.00'}">
                    </td>
                    <td>
                        <input type="number" class="form-control credit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" value="${existingItem ? existingItem.cr_amount : '0.00'}">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#entryItemsBody').append(rowHtml);
            this.entryItems.push({
                id: rowId,
                ledger_id: existingItem.ledger_id,
                dr_amount: existingItem.dr_amount,
                cr_amount: existingItem.cr_amount
            });
        },
        
        bindEvents: function() {
            const self = this;
            
            // Date change
            $('#entryDate').on('change', function() {
                self.generateEntryCode();
            });
            
            // Add row
            $('#btnAddRow').on('click', function() {
                self.addEntryRow();
            });
            
            // Remove row
            $(document).on('click', '.remove-row', function() {
                const rowId = $(this).data('row');
                if ($('#entryItemsBody tr').length > 2) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.entryItems = self.entryItems.filter(item => item.id !== rowId);
                    self.calculateTotals();
                } else {
                    TempleCore.showToast('Minimum 2 rows required', 'warning');
                }
            });
            
            // Amount changes
            $(document).on('input', '.debit-amount, .credit-amount', function() {
                const rowId = $(this).data('row');
                const item = self.entryItems.find(i => i.id === rowId);
                
                if (item) {
                    if ($(this).hasClass('debit-amount')) {
                        item.dr_amount = parseFloat($(this).val()) || 0;
                        // Clear credit if debit is entered
                        if (item.dr_amount > 0) {
                            item.cr_amount = 0;
                            $(`.credit-amount[data-row="${rowId}"]`).val('0.00');
                        }
                    } else {
                        item.cr_amount = parseFloat($(this).val()) || 0;
                        // Clear debit if credit is entered
                        if (item.cr_amount > 0) {
                            item.dr_amount = 0;
                            $(`.debit-amount[data-row="${rowId}"]`).val('0.00');
                        }
                    }
                }
                
                self.calculateTotals();
            });
            
            // Ledger selection
            $(document).on('change', '.ledger-select', function() {
                const rowId = $(this).data('row');
                const item = self.entryItems.find(i => i.id === rowId);
                if (item) {
                    item.ledger_id = $(this).val();
                }
            });
            
            // Form submission
            $('#contraForm').on('submit', function(e) {
                e.preventDefault();
                self.saveEntry(false);
            });
            
            // Save and New
            $('#btnSaveAndNew').on('click', function() {
                if (self.validateForm()) {
                    self.saveEntry(true);
                }
            });
        },
        
        calculateTotals: function() {
            let totalDebit = 0;
            let totalCredit = 0;
            
            this.entryItems.forEach(item => {
                totalDebit += item.dr_amount;
                totalCredit += item.cr_amount;
            });
            
            $('#totalDebit').text(TempleCore.formatCurrency(totalDebit));
            $('#totalCredit').text(TempleCore.formatCurrency(totalCredit));
            
            const difference = Math.abs(totalDebit - totalCredit);
            
            if (difference < 0.01) {
                $('#balanceStatus').removeClass('bg-warning bg-danger').addClass('bg-success').text('Balanced');
                $('#differenceAmount').text('');
            } else {
                $('#balanceStatus').removeClass('bg-success').addClass('bg-danger').text('Not Balanced');
                $('#differenceAmount').text(`Difference: ${TempleCore.formatCurrency(difference)}`);
            }
        },
        
        validateForm: function() {
            const form = document.getElementById('contraForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            // Check if balanced
            let totalDebit = 0;
            let totalCredit = 0;
            let hasValidItems = false;
            
            this.entryItems.forEach(item => {
                if (item.ledger_id && (item.dr_amount > 0 || item.cr_amount > 0)) {
                    hasValidItems = true;
                    totalDebit += item.dr_amount;
                    totalCredit += item.cr_amount;
                }
            });
            
            if (!hasValidItems) {
                TempleCore.showToast('Please add at least one valid entry', 'error');
                return false;
            }
            
            if (Math.abs(totalDebit - totalCredit) >= 0.01) {
                TempleCore.showToast('Entry must be balanced. Debit and Credit totals must be equal.', 'error');
                return false;
            }
            
            return true;
        },
        
        saveEntry: function(saveAndNew) {
            if (!this.validateForm()) {
                return;
            }
            
            const validItems = this.entryItems
                .filter(item => item.ledger_id && (item.dr_amount > 0 || item.cr_amount > 0))
                .map(item => ({
                    ledger_id: item.ledger_id,
                    dr_amount: item.dr_amount,
                    cr_amount: item.cr_amount
                }));
            
            const formData = {
                date: $('#entryDate').val(),
                fund_id: $('#fundId').val(),
                narration: $('#narration').val(),
                contra_items: validItems
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.put(`/accounts/entries/update/${this.entryId}`, formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Contra entry updated successfully', 'success');
                        
                        if (saveAndNew) {
                            // Reset form
                            location.reload(); // Simple reload for new entry
                        } else {
                            TempleRouter.navigate('entries');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create entry', 'error');
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