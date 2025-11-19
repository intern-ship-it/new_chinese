// js/pages/entries/contra/copy.js
(function($, window) {
    'use strict';
    
    window.EntriesContraCopyPage = {
        originalEntry: null,
        assetLedgers: [],
        funds: [],
        entryItems: [],
        itemCounter: 0,
        
        init: function(params) {
            if (!params || !params.id) {
                TempleCore.showToast('Entry ID is required', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            this.loadOriginalEntry(params.id);
        },
        
        loadOriginalEntry: function(entryId) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/accounts/entries/${entryId}`)
                .done(function(response) {
                    if (response.success) {
                        self.originalEntry = response.data;
                        self.render();
                        self.loadMasterData();
                        self.bindEvents();
                    } else {
                        TempleCore.showToast('Failed to load entry', 'error');
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
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-files"></i> Copy Contra Entry
                                <small class="text-muted ms-2">Copy from: ${this.originalEntry.entry_code}</small>
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        You are creating a new contra entry based on <strong>${this.originalEntry.entry_code}</strong>.
                        The amounts and accounts will be copied, but you can modify them before saving.
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
                                        <small class="text-muted">New code will be generated</small>
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
                                                  placeholder="Enter details of this internal transfer...">${this.originalEntry.narration || ''}</textarea>
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
            const totalLoads = 2;
            
            function checkAllLoaded() {
                loadedCount++;
                if (loadedCount === totalLoads) {
                    // All master data loaded, now populate with copied data
                    self.populateCopiedData();
                    self.generateEntryCode();
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
                        
                        // Set the original fund
                        if (self.originalEntry.fund_id) {
                            $('#fundId').val(self.originalEntry.fund_id);
                        }
                    }
                })
                .fail(function() {
                    console.error('Failed to load funds');
                })
                .always(checkAllLoaded);
            
            // Load Asset Ledgers (Bank/Cash accounts)
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
                .done(function(response) {
                    if (response.success) {
                        self.assetLedgers = response.data;
                    }
                })
                .fail(function() {
                    console.error('Failed to load asset ledgers');
                })
                .always(checkAllLoaded);
        },
        
        populateCopiedData: function() {
            // Clear existing rows
            $('#entryItemsBody').empty();
            this.entryItems = [];
            this.itemCounter = 0;
            
            // Add rows based on original entry items
            if (this.originalEntry.entry_items) {
                this.originalEntry.entry_items.forEach(item => {
                    this.addEntryRowWithData(item);
                });
            }
            
            // Calculate totals
            this.calculateTotals();
        },
        
        addEntryRowWithData: function(itemData) {
            const rowId = ++this.itemCounter;
            const options = this.assetLedgers.map(ledger => 
                `<option value="${ledger.id}" ${itemData.ledger_id == ledger.id ? 'selected' : ''}>
                    (${ledger.left_code}/${ledger.right_code}) - ${ledger.name}
                </option>`
            ).join('');
            
            const debitAmount = itemData.dc === 'D' ? itemData.amount : '0.00';
            const creditAmount = itemData.dc === 'C' ? itemData.amount : '0.00';
            
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
                               data-row="${rowId}" min="0" step="0.01" value="${debitAmount}">
                    </td>
                    <td>
                        <input type="number" class="form-control credit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" value="${creditAmount}">
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
                ledger_id: itemData.ledger_id,
                dr_amount: parseFloat(debitAmount) || 0,
                cr_amount: parseFloat(creditAmount) || 0
            });
        },
        
        generateEntryCode: function() {
            const today = new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'CON',
                entrytype_id: 3,
                date: today
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            })
            .fail(function() {
                console.error('Failed to generate entry code');
            });
        },
        
        addEntryRow: function() {
            const rowId = ++this.itemCounter;
            const options = this.assetLedgers.map(ledger => 
                `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
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
                               data-row="${rowId}" min="0" step="0.01" value="0.00">
                    </td>
                    <td>
                        <input type="number" class="form-control credit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" value="0.00">
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
                ledger_id: null,
                dr_amount: 0,
                cr_amount: 0
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
                    self.reindexRows();
                } else {
                    TempleCore.showToast('Minimum 2 rows required for contra entry', 'warning');
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
                
                // Check for duplicate selection
                const selectedLedger = $(this).val();
                if (selectedLedger) {
                    let duplicateCount = 0;
                    $('.ledger-select').each(function() {
                        if ($(this).val() === selectedLedger) {
                            duplicateCount++;
                        }
                    });
                    
                    if (duplicateCount > 1) {
                        TempleCore.showToast('This account is already selected in another row', 'warning');
                        $(this).val('');
                        if (item) {
                            item.ledger_id = null;
                        }
                    }
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
        
        reindexRows: function() {
            let counter = 1;
            $('#entryItemsBody tr').each(function() {
                $(this).find('td:first').text(counter++);
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
            let hasDebitEntry = false;
            let hasCreditEntry = false;
            
            this.entryItems.forEach(item => {
                if (item.ledger_id && (item.dr_amount > 0 || item.cr_amount > 0)) {
                    hasValidItems = true;
                    totalDebit += item.dr_amount;
                    totalCredit += item.cr_amount;
                    
                    if (item.dr_amount > 0) hasDebitEntry = true;
                    if (item.cr_amount > 0) hasCreditEntry = true;
                }
            });
            
            if (!hasValidItems) {
                TempleCore.showToast('Please add at least one valid entry', 'error');
                return false;
            }
            
            if (!hasDebitEntry || !hasCreditEntry) {
                TempleCore.showToast('Contra entry must have at least one debit and one credit entry', 'error');
                return false;
            }
            
            if (Math.abs(totalDebit - totalCredit) >= 0.01) {
                TempleCore.showToast('Entry must be balanced. Debit and Credit totals must be equal.', 'error');
                return false;
            }
            
            // Check for duplicate accounts
            const usedAccounts = new Set();
            for (const item of this.entryItems) {
                if (item.ledger_id) {
                    if (usedAccounts.has(item.ledger_id)) {
                        TempleCore.showToast('Each account can only be used once in a contra entry', 'error');
                        return false;
                    }
                    usedAccounts.add(item.ledger_id);
                }
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
                entry_code: $('#entryCode').val(),
                fund_id: $('#fundId').val(),
                narration: $('#narration').val(),
                contra_items: validItems
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/entries/contra', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Contra entry created successfully (Copy)', 'success');
                        
                        if (saveAndNew) {
                            // Reload for new entry
                            location.reload();
                        } else {
                            TempleRouter.navigate('entries');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create contra entry', 'error');
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