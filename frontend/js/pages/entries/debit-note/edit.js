// js/pages/entries/debit-note/edit.js
(function($, window) {
    'use strict';
    
    window.EntriesDebitNoteEditPage = {
        ledgers: [],
        funds: [],
        entryItems: [],
        itemCounter: 0,
        entryId: null,
        entryData: null,
        
        init: function(params) {
            // Get entry ID from params
            this.entryId = params?.id;
            
            if (!this.entryId) {
                TempleCore.showToast('Entry ID not provided', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            this.loadEntry();
        },
        
        loadEntry: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/accounts/entries/${this.entryId}`)
                .done(function(response) {
                    if (response.success) {
                        self.entryData = response.data;
                        
                        // Verify it's a debit note
                        if (self.entryData.entrytype_id !== 6) {
                            TempleCore.showToast('This is not a debit note entry', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        // Check if editable
                        if (!self.entryData.can_edit) {
                            TempleCore.showToast('This entry cannot be edited', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        self.render();
                        self.loadMasterData();
                        self.bindEvents();
                        self.populateForm();
                    } else {
                        TempleCore.showToast('Failed to load entry', 'error');
                        TempleRouter.navigate('entries');
                    }
                })
                .fail(function(xhr) {
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
                                <i class="bi bi-pencil-square"></i> Edit Debit Note
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <form id="debitNoteForm">
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">Debit Note Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Debit Note No.</label>
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
                                    <div class="col-md-6">
                                        <label class="form-label">Reference Purchase Bill</label>
                                        <input type="text" class="form-control" id="referenceNo" 
                                               placeholder="Original bill number (optional)">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Vendor/Supplier</label>
                                        <input type="text" class="form-control" id="partyName" 
                                               placeholder="Vendor name (optional)">
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-12">
                                        <label class="form-label">Reason for Debit Note</label>
                                        <textarea class="form-control" id="narration" rows="2" 
                                                  placeholder="Enter reason for issuing debit note"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Entry Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Debit Note Items</h5>
                                <button type="button" class="btn btn-light btn-sm" id="btnAddRow">
                                    <i class="bi bi-plus-circle"></i> Add Row
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> 
                                    <strong>Debit Note Usage:</strong> Used for purchase returns, overcharge adjustments, 
                                    or any adjustment that reduces vendor payables. Typically: Dr Vendor Account, Cr Purchase Returns.
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-bordered" id="entryItemsTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="40">#</th>
                                                <th>Account</th>
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
                                    <button type="submit" class="btn btn-success">
                                        <i class="bi bi-check-circle"></i> Update Debit Note
                                    </button>
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
            
            // Load Funds
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        self.funds = response.data;
                        const options = response.data.map(fund => 
                            `<option value="${fund.id}">${fund.name} (${fund.code})</option>`
                        ).join('');
                        $('#fundId').append(options);
                        
                        // Set selected fund
                        if (self.entryData?.fund_id) {
                            $('#fundId').val(self.entryData.fund_id);
                        }
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load funds:', xhr.responseJSON);
                    TempleCore.showToast('Failed to load funds', 'error');
                });
            
            // Load Credit Ledgers
            TempleAPI.get('/accounts/entries/ledgers/credit')
                .done(function(response) {
                    if (response.success) {
                        self.ledgers = response.data;
                        console.log('Loaded credit ledgers:', self.ledgers.length);
                        
                        // Populate existing entry items after ledgers are loaded
                        if (self.entryData) {
                            self.populateEntryItems();
                        }
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load ledgers:', xhr.responseJSON);
                    
                    // Fallback to loading all ledgers
                    TempleAPI.get('/accounts/ledgers')
                        .done(function(response) {
                            if (response.success) {
                                self.ledgers = response.data.filter(ledger => ledger.iv !== 1);
                                console.log('Loaded ledgers (fallback):', self.ledgers.length);
                                
                                if (self.entryData) {
                                    self.populateEntryItems();
                                }
                            }
                        })
                        .fail(function(xhr) {
                            console.error('Failed to load ledgers (fallback):', xhr.responseJSON);
                            TempleCore.showToast('Failed to load ledgers', 'error');
                        });
                });
        },
        
        populateForm: function() {
            // Populate basic fields
            if (this.entryData.date) {
        let dateStr = this.entryData.date.split('T')[0]; // Get YYYY-MM-DD part
        let [year, month, day] = dateStr.split('-').map(num => parseInt(num));
        
        // Create date in local timezone (month is 0-indexed in JavaScript)
        let localDate = new Date(year, month - 1, day);
        
        // Format back to YYYY-MM-DD
        let formattedDate = localDate.getFullYear() + '-' + 
                           String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(localDate.getDate()).padStart(2, '0');
        
        $('#entryDate').val(formattedDate);
    }
            $('#entryCode').val(this.entryData.entry_code);
            $('#narration').val(this.entryData.narration || '');
            $('#referenceNo').val(this.entryData.reference_no || '');
            $('#partyName').val(this.entryData.paid_to || '');
        },
        
        populateEntryItems: function() {
            // Clear existing items
            $('#entryItemsBody').empty();
            this.entryItems = [];
            this.itemCounter = 0;
            
            // Add rows for each existing entry item
            if (this.entryData.entry_items && this.entryData.entry_items.length > 0) {
                this.entryData.entry_items.forEach((item, index) => {
                    this.addEntryRow(item);
                });
            } else {
                // Add default rows if no items
                this.addEntryRow();
                this.addEntryRow();
            }
            
            // Calculate totals
            this.calculateTotals();
        },
        
        getLedgerOptions: function() {
            return this.ledgers.map(ledger => {
                const groupName = ledger.group ? ` - ${ledger.group.name}` : '';
                const codes = (ledger.left_code && ledger.right_code) 
                    ? `(${ledger.left_code}/${ledger.right_code}) ` 
                    : '';
                return `<option value="${ledger.id}">${codes}${ledger.name}${groupName}</option>`;
            }).join('');
        },
        
        addEntryRow: function(existingItem) {
            const rowId = ++this.itemCounter;
            const options = this.getLedgerOptions();
            
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
            
            $('#entryItemsBody').append(rowHtml);
            
            // Set values if existing item
            if (existingItem) {
                $(`.ledger-select[data-row="${rowId}"]`).val(existingItem.ledger_id);
                
                if (existingItem.dc === 'D') {
                    $(`.debit-amount[data-row="${rowId}"]`).val(existingItem.amount);
                    $(`.credit-amount[data-row="${rowId}"]`).val('0.00');
                } else {
                    $(`.debit-amount[data-row="${rowId}"]`).val('0.00');
                    $(`.credit-amount[data-row="${rowId}"]`).val(existingItem.amount);
                }
            }
            
            // Add to items array
            this.entryItems.push({
                id: rowId,
                ledger_id: existingItem ? existingItem.ledger_id : null,
                dr_amount: existingItem && existingItem.dc === 'D' ? parseFloat(existingItem.amount) : 0,
                cr_amount: existingItem && existingItem.dc === 'C' ? parseFloat(existingItem.amount) : 0
            });
        },
        
        bindEvents: function() {
            const self = this;
            
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
                const item = self.entryItems.find(i => i.id === rowId);
                if (item) {
                    item.ledger_id = $(this).val();
                }
            });
            
            // Form submission
            $('#debitNoteForm').on('submit', function(e) {
                e.preventDefault();
                self.updateEntry();
            });
        },
        
        reindexRows: function() {
            $('#entryItemsBody tr').each(function(index) {
                $(this).find('td:first').text(index + 1);
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
            const form = document.getElementById('debitNoteForm');
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
        
        updateEntry: function() {
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
                reference_no: $('#referenceNo').val(),
                party_name: $('#partyName').val(),
                debit_note_items: validItems
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.put(`/accounts/entries/debit-note/${this.entryId}`, formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Debit Note updated successfully', 'success');
                        TempleRouter.navigate('entries');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update debit note', 'error');
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