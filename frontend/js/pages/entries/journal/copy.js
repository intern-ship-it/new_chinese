// js/pages/entries/journal/copy.js
(function($, window) {
    'use strict';
    
    window.EntriesJournalCopyPage = {
        ledgers: [],
        funds: [],
        journalItems: [],
        itemCounter: 0,
        originalEntryId: null,
        
        init: function(params) {
            if (!params || !params.id) {
                TempleCore.showToast('Entry ID is required', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            this.originalEntryId = params.id;
            this.resetState();
            this.loadOriginalEntry();
        },
        
        resetState: function() {
            this.ledgers = [];
            this.funds = [];
            this.journalItems = [];
            this.itemCounter = 0;
        },
        
        loadOriginalEntry: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/accounts/entries/' + this.originalEntryId)
                .done(function(response) {
                    if (response.success) {
                        const entry = response.data;
                        
                        // Check if it's a journal entry
                        if (entry.entrytype_id !== 4) {
                            TempleCore.showToast('Selected entry is not a journal entry', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        self.render(entry);
                        self.loadMasterData(function() {
                            self.populateFromOriginal(entry);
                        });
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
        
        render: function(originalEntry) {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-journal-text"></i> Copy Journal Entry
                                <small class="text-muted ms-2">from ${originalEntry.entry_code}</small>
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <div class="alert alert-info mb-4">
                        <i class="bi bi-info-circle"></i>
                        You are creating a copy of Journal Entry <strong>${originalEntry.entry_code}</strong> dated ${originalEntry.date}.
                        Please update the date and make necessary changes before saving.
                    </div>
                    
                    <form id="journalForm">
                        <div class="card mb-4">
                            <div class="card-header bg-warning text-dark">
                                <h5 class="mb-0">Journal Entry Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Journal No.</label>
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
                                                  placeholder="Enter journal entry details..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Journal Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Journal Items</h5>
                                <button type="button" class="btn btn-light btn-sm" id="btnAddRow">
                                    <i class="bi bi-plus-circle"></i> Add Row
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered" id="journalItemsTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="40">#</th>
                                                <th>Account</th>
                                                <th width="150">Debit Amount</th>
                                                <th width="150">Credit Amount</th>
                                                <th width="80">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="journalItemsBody">
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
                                        <button type="button" class="btn btn-info me-2" id="btnReset">
                                            <i class="bi bi-arrow-clockwise"></i> Reset to Original
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-check-circle"></i> Save as New Journal
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
        
        loadMasterData: function(callback) {
            const self = this;
            let loadedCount = 0;
            const totalLoads = 2;
            
            function checkAllLoaded() {
                loadedCount++;
                if (loadedCount === totalLoads && callback) {
                    callback();
                }
            }
            
            // Load Funds
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        self.funds = response.data;
                        $('#fundId').find('option:not(:first)').remove();
                        const options = response.data.map(fund => 
                            `<option value="${fund.id}">${fund.name} (${fund.code})</option>`
                        ).join('');
                        $('#fundId').append(options);
                    }
                })
                .fail(function() {
                    console.error('Failed to load funds');
                })
                .always(checkAllLoaded);
            
            // Load All Ledgers (excluding bank/cash for journal)
            TempleAPI.get('/accounts/ledgers/type/normal')
                .done(function(response) {
                    if (response.success) {
                        self.ledgers = response.data.filter(l => l.type != 1);
                    }
                })
                .fail(function() {
                    console.error('Failed to load ledgers');
                })
                .always(checkAllLoaded);
        },
        
        populateFromOriginal: function(entry) {
            const self = this;
            
            // Set fund
            $('#fundId').val(entry.fund_id);
            
            // Set narration with "Copy of" prefix
            $('#narration').val('Copy of: ' + (entry.narration || ''));
            
            // Generate new entry code
            this.generateEntryCode();
            
            // Clear existing rows
            $('#journalItemsBody').empty();
            this.journalItems = [];
            this.itemCounter = 0;
            
            // Group items by ledger to reconstruct original format
            const itemsByLedger = {};
            entry.entry_items.forEach(item => {
                if (!itemsByLedger[item.ledger_id]) {
                    itemsByLedger[item.ledger_id] = {
                        ledger_id: item.ledger_id,
                        ledger: item.ledger,
                        dr_amount: 0,
                        cr_amount: 0
                    };
                }
                
                if (item.dc === 'D') {
                    itemsByLedger[item.ledger_id].dr_amount += parseFloat(item.amount);
                } else {
                    itemsByLedger[item.ledger_id].cr_amount += parseFloat(item.amount);
                }
            });
            
            // Add rows for each ledger
            Object.values(itemsByLedger).forEach(item => {
                this.addJournalRowWithData(item);
            });
            
            this.calculateTotals();
        },
        
        addJournalRowWithData: function(data) {
            const rowId = ++this.itemCounter;
            const options = this.ledgers.map(ledger => 
                `<option value="${ledger.id}" ${ledger.id == data.ledger_id ? 'selected' : ''}>
                    (${ledger.left_code}/${ledger.right_code}) - ${ledger.name}
                </option>`
            ).join('');
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
                            <option value="">Select Account</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control debit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" 
                               value="${data.dr_amount.toFixed(2)}">
                    </td>
                    <td>
                        <input type="number" class="form-control credit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" 
                               value="${data.cr_amount.toFixed(2)}">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#journalItemsBody').append(rowHtml);
            this.journalItems.push({
                id: rowId,
                ledger_id: data.ledger_id,
                dr_amount: data.dr_amount,
                cr_amount: data.cr_amount
            });
        },
        
        generateEntryCode: function() {
            const date = $('#entryDate').val() || new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'JOR',
                entrytype_id: 4,
                date: date
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            });
        },
        
        addJournalRow: function() {
            const rowId = ++this.itemCounter;
            const options = this.ledgers.map(ledger => 
                `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
            ).join('');
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
                            <option value="">Select Account</option>
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
            
            $('#journalItemsBody').append(rowHtml);
            this.journalItems.push({
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
                self.addJournalRow();
            });
            
            // Reset to original
            $('#btnReset').on('click', function() {
                TempleCore.showConfirm(
                    'Reset to Original',
                    'This will reset all values to the original entry. Continue?',
                    function() {
                        self.loadOriginalEntry();
                    }
                );
            });
            
            // Remove row
            $(document).on('click', '.remove-row', function() {
                const rowId = $(this).data('row');
                if ($('#journalItemsBody tr').length > 2) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.journalItems = self.journalItems.filter(item => item.id !== rowId);
                    self.calculateTotals();
                    self.renumberRows();
                } else {
                    TempleCore.showToast('Minimum 2 rows required for journal entry', 'warning');
                }
            });
            
            // Amount changes
            $(document).on('input', '.debit-amount, .credit-amount', function() {
                const rowId = $(this).data('row');
                const item = self.journalItems.find(i => i.id === rowId);
                
                if (item) {
                    if ($(this).hasClass('debit-amount')) {
                        item.dr_amount = parseFloat($(this).val()) || 0;
                        if (item.dr_amount > 0) {
                            item.cr_amount = 0;
                            $(`.credit-amount[data-row="${rowId}"]`).val('0.00');
                        }
                    } else {
                        item.cr_amount = parseFloat($(this).val()) || 0;
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
                const item = self.journalItems.find(i => i.id === rowId);
                if (item) {
                    item.ledger_id = $(this).val();
                }
            });
            
            // Form submission
            $('#journalForm').on('submit', function(e) {
                e.preventDefault();
                self.saveJournal();
            });
        },
        
        renumberRows: function() {
            let counter = 1;
            $('#journalItemsBody tr').each(function() {
                $(this).find('td:first').text(counter++);
            });
        },
        
        calculateTotals: function() {
            let totalDebit = 0;
            let totalCredit = 0;
            
            this.journalItems.forEach(item => {
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
            const form = document.getElementById('journalForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            let totalDebit = 0;
            let totalCredit = 0;
            let hasValidItems = false;
            
            this.journalItems.forEach(item => {
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
                TempleCore.showToast('Journal entry must be balanced', 'error');
                return false;
            }
            
            return true;
        },
        
        saveJournal: function() {
            if (!this.validateForm()) {
                return;
            }
            
            const validItems = this.journalItems
                .filter(item => item.ledger_id && (item.dr_amount > 0 || item.cr_amount > 0))
                .map(item => ({
                    ledger_id: item.ledger_id,
                    dr_amount: item.dr_amount,
                    cr_amount: item.cr_amount
                }));
            
            const formData = {
                date: $('#entryDate').val(),
                fund_id: $('#fundId').val(),
                entry_code: $('#entryCode').val(),
                narration: $('#narration').val(),
                journal_items: validItems
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/entries/journal', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Journal entry copied successfully', 'success');
                        TempleRouter.navigate('entries');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create journal entry', 'error');
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