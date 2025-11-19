// js/pages/entries/credit-note/create.js
(function($, window) {
    'use strict';
    
    window.EntriesCreditNoteCreatePage = {
        ledgers: [],
        creditLedgers: [], // Store credit ledgers separately
        funds: [],
        entryItems: [],
        itemCounter: 0,
        
        init: function() {
            // CHANGE 1: Reset state on initialization
            this.resetState();
            
            this.render();
            this.loadMasterData();
            this.bindEvents();
            this.generateEntryCode();
            // CHANGE 2: Removed addDefaultRows() from here - will be called after data loads
        },
        
        // CHANGE 3: Add resetState function
        resetState: function() {
            this.ledgers = [];
            this.creditLedgers = [];
            this.funds = [];
            this.entryItems = [];
            this.itemCounter = 0;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-file-minus"></i> Create Credit Note
                            </h3>
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
                                                  placeholder="Enter reason for issuing credit note (e.g., Sales return, Discount allowed, etc.)"></textarea>
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
                                    <strong>Credit Note Usage:</strong> Used for sales returns, discounts given after invoice, 
                                    or any adjustment that reduces customer receivables. Typically: Dr Sales Returns, Cr Customer Account.
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
                                            <i class="bi bi-check-circle"></i> Save Credit Note
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
            
            // CHANGE 4: Add synchronization function
            function checkAllLoaded() {
                loadCount++;
                if (loadCount === totalLoads) {
                    // All data loaded, now add default rows
                    self.addDefaultRows();
                }
            }
            
            // Load Funds
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        self.funds = response.data;
                        
                        // CHANGE 5: Clear existing options first
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
            
            // Load Credit Ledgers (excluding inventory ledgers)
            TempleAPI.get('/accounts/entries/ledgers/credit')
                .done(function(response) {
                    if (response.success) {
                        self.creditLedgers = response.data;
                        self.ledgers = response.data; // Also store in ledgers for compatibility
                        console.log('Credit ledgers loaded:', self.creditLedgers.length);
                        
                        // Update any existing rows with the new ledger options
                        self.updateExistingRowOptions();
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load credit ledgers:', xhr.responseJSON);
                    // Fallback to loading all ledgers if the credit endpoint fails
                    self.loadAllLedgers();
                })
                .always(checkAllLoaded);
        },
        
        loadAllLedgers: function() {
            // Fallback method to load all ledgers
            const self = this;
            TempleAPI.get('/ledgers')
                .done(function(response) {
                    if (response.success) {
                        // Filter out inventory ledgers manually if needed
                        self.ledgers = response.data.filter(ledger => !ledger.iv || ledger.iv !== 1);
                        self.creditLedgers = self.ledgers;
                        console.log('Fallback: All ledgers loaded and filtered:', self.ledgers.length);
                        self.updateExistingRowOptions();
                    }
                });
        },
        
        updateExistingRowOptions: function() {
            // Update options for any existing rows
            const self = this;
            $('.ledger-select').each(function() {
                const currentValue = $(this).val();
                const options = self.getLedgerOptions();
                $(this).html(options);
                if (currentValue) {
                    $(this).val(currentValue);
                }
            });
        },
        
        getLedgerOptions: function() {
            // Generate ledger options from creditLedgers
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
        
        addDefaultRows: function() {
            // CHANGE 6: Clear any existing rows first
            $('#entryItemsBody').empty();
            this.entryItems = [];
            this.itemCounter = 0;
            
            // Add two default rows
            this.addEntryRow();
            this.addEntryRow();
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
            
            // CHANGE 7: Unbind existing events first
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
                credit_note_items: validItems
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/entries/credit-note', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Credit Note created successfully', 'success');
                        
                        if (saveAndNew) {
                            location.reload();
                        } else {
                            TempleRouter.navigate('entries');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create credit note', 'error');
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