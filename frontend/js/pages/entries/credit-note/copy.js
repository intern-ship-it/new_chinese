// js/pages/entries/credit-note/copy.js
(function($, window) {
    'use strict';
    
    window.EntriesCreditNoteCopyPage = {
        ledgers: [],
        creditLedgers: [],
        funds: [],
        entryItems: [],
        itemCounter: 0,
        originalEntryId: null,
        
        init: function(params) {
            // Reset state on initialization
            this.resetState();
            
            // Get the entry ID from URL params
            this.originalEntryId = params?.id;
            
            if (!this.originalEntryId) {
                TempleCore.showToast('No credit note ID provided', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            // Load the original entry data
            this.loadOriginalEntry();
        },
        
        resetState: function() {
            this.ledgers = [];
            this.creditLedgers = [];
            this.funds = [];
            this.entryItems = [];
            this.itemCounter = 0;
            this.originalEntryId = null;
        },
        
        loadOriginalEntry: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            // Fetch the original credit note
            TempleAPI.get('/accounts/entries/' + this.originalEntryId)
                .done(function(response) {
                    if (response.success) {
                        const entry = response.data;
                        
                        console.log('Original entry loaded:', entry);
                        
                        // Verify it's a credit note
                        if (entry.entrytype_id !== 5) {
                            TempleCore.showToast('Selected entry is not a credit note', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        // Store the original data temporarily - check both entry_items and entryItems
                        self.originalData = {
                            fund_id: entry.fund_id,
                            narration: entry.narration,
                            reference_no: entry.reference_no,
                            party_name: entry.paid_to,
                            items: entry.entry_items || entry.entryItems || []
                        };
                        
                        console.log('Original data stored:', self.originalData);
                        
                        // Now render and load master data
                        self.render();
                        self.loadMasterData();
                    } else {
                        TempleCore.showToast('Failed to load original credit note', 'error');
                        TempleRouter.navigate('entries');
                    }
                })
                .fail(function(xhr) {
                    console.error('Error loading original credit note:', xhr);
                    TempleCore.showToast('Error loading original credit note', 'error');
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
                                <i class="bi bi-files"></i> Copy Credit Note
                            </h3>
                            <small class="text-muted">Creating copy from Credit Note #${this.originalEntryId}</small>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <form id="creditNoteForm">
                        <div class="card mb-4">
                            <div class="card-header bg-secondary text-white">
                                <h5 class="mb-0">Credit Note Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Credit Note No.</label>
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
                                        <label class="form-label">Reference Invoice/Bill</label>
                                        <input type="text" class="form-control" id="referenceNo" 
                                               placeholder="Original invoice number (optional)">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Customer/Party</label>
                                        <input type="text" class="form-control" id="partyName" 
                                               placeholder="Customer name (optional)">
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-12">
                                        <label class="form-label">Reason for Credit Note</label>
                                        <textarea class="form-control" id="narration" rows="2" 
                                                  placeholder="Enter reason for issuing credit note"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Entry Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Credit Note Items</h5>
                                <button type="button" class="btn btn-light btn-sm" id="btnAddRow">
                                    <i class="bi bi-plus-circle"></i> Add Row
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> 
                                    <strong>Copying Credit Note:</strong> All items from the original credit note have been copied. 
                                    You can modify amounts or add/remove items as needed.
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
                                    <div>
                                        <button type="button" class="btn btn-primary me-2" id="btnSaveAndNew">
                                            <i class="bi bi-plus-circle"></i> Save & New
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-check-circle"></i> Save Credit Note Copy
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
            let loadCount = 0;
            const totalLoads = 2;
            
            function checkAllLoaded() {
                loadCount++;
                if (loadCount === totalLoads) {
                    // All data loaded, populate form with original data
                    self.populateFromOriginal();
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
            
            // Load Credit Ledgers
            TempleAPI.get('/accounts/entries/ledgers/credit')
                .done(function(response) {
                    if (response.success) {
                        self.creditLedgers = response.data;
                        self.ledgers = response.data;
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load credit ledgers:', xhr.responseJSON);
                    // Fallback to loading all ledgers
                    self.loadAllLedgers();
                })
                .always(checkAllLoaded);
        },
        
        loadAllLedgers: function() {
            const self = this;
            TempleAPI.get('/ledgers')
                .done(function(response) {
                    if (response.success) {
                        self.ledgers = response.data.filter(ledger => !ledger.iv || ledger.iv !== 1);
                        self.creditLedgers = self.ledgers;
                    }
                });
        },
        
        populateFromOriginal: function() {
            const self = this;
            const data = this.originalData;
            
            console.log('Populating from original data:', data);
            
            // Set fund
            if (data.fund_id) {
                $('#fundId').val(data.fund_id);
            }
            
            // Set narration with "Copy of" prefix
            $('#narration').val('Copy of: ' + (data.narration || ''));
            
            // Set reference and party
            $('#referenceNo').val(data.reference_no || '');
            $('#partyName').val(data.party_name || '');
            
            // Generate new entry code for the copy
            this.generateEntryCode();
            
            // Clear existing items first
            $('#entryItemsBody').empty();
            this.entryItems = [];
            this.itemCounter = 0;
            
            // Add items from original
            if (data.items && data.items.length > 0) {
                console.log('Adding items from original:', data.items);
                data.items.forEach(function(item) {
                    self.addEntryRowWithData(item);
                });
            } else {
                console.log('No items found, adding default rows');
                // Add default empty rows if no items
                this.addEntryRow();
                this.addEntryRow();
            }
            
            // Calculate totals after adding all items
            setTimeout(function() {
                self.calculateTotals();
            }, 100);
            
            // Bind events after DOM is ready
            this.bindEvents();
        },
        
        addEntryRowWithData: function(itemData) {
            const rowId = ++this.itemCounter;
            const options = this.getLedgerOptions();
            
            console.log('Adding row with data:', itemData);
            
            // Parse amounts ensuring they're numbers
            const amount = parseFloat(itemData.amount) || 0;
            const debitAmount = itemData.dc === 'D' ? amount : 0;
            const creditAmount = itemData.dc === 'C' ? amount : 0;
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control debit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" value="${debitAmount.toFixed(2)}">
                    </td>
                    <td>
                        <input type="number" class="form-control credit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" value="${creditAmount.toFixed(2)}">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#entryItemsBody').append(rowHtml);
            
            // Set the ledger selection after the row is added to DOM
            setTimeout(function() {
                if (itemData.ledger_id) {
                    $(`.ledger-select[data-row="${rowId}"]`).val(itemData.ledger_id);
                }
            }, 50);
            
            // Add to items array
            this.entryItems.push({
                id: rowId,
                ledger_id: itemData.ledger_id,
                dr_amount: debitAmount,
                cr_amount: creditAmount
            });
        },
        
        getLedgerOptions: function() {
            const options = this.creditLedgers.map(ledger => {
                const groupName = ledger.group ? ` - ${ledger.group.name}` : '';
                const code = ledger.left_code && ledger.right_code ? 
                    `(${ledger.left_code}/${ledger.right_code})` : '';
                return `<option value="${ledger.id}">${code} ${ledger.name}${groupName}</option>`;
            }).join('');
            
            return '<option value="">Select Account</option>' + options;
        },
        
        generateEntryCode: function() {
            const date = new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'CRN',
                entrytype_id: 5,
                date: date
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            });
        },
        
        addEntryRow: function() {
            const rowId = ++this.itemCounter;
            const options = this.getLedgerOptions();
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
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
            
            // Unbind existing events first
            $('#entryDate').off('change');
            $('#btnAddRow').off('click');
            $(document).off('click', '.remove-row');
            $(document).off('input', '.debit-amount, .credit-amount');
            $(document).off('change', '.ledger-select');
            $('#creditNoteForm').off('submit');
            $('#btnSaveAndNew').off('click');
            
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
                    self.renumberRows();
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
            $('#creditNoteForm').on('submit', function(e) {
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
        
        renumberRows: function() {
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
            const form = document.getElementById('creditNoteForm');
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
                entry_code: $('#entryCode').val(),
                fund_id: $('#fundId').val(),
                narration: $('#narration').val(),
                reference_no: $('#referenceNo').val(),
                party_name: $('#partyName').val(),
                credit_note_items: validItems,
                copied_from: this.originalEntryId // Track the source
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/entries/credit-note', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Credit Note copy created successfully', 'success');
                        
                        if (saveAndNew) {
                            // Reload to create another copy
                            location.reload();
                        } else {
                            TempleRouter.navigate('entries');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create credit note copy', 'error');
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