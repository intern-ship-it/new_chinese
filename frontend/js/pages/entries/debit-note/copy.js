// js/pages/entries/debit-note/copy.js
(function($, window) {
    'use strict';
    
    window.EntriesDebitNoteCopyPage = {
        entryId: null,
        originalEntry: null,
        ledgers: [],
        funds: [],
        entryItems: [],
        itemCounter: 0,
        
        init: function(params) {
            // Get entry ID from params
            this.entryId = params?.id;
            
            if (!this.entryId) {
                TempleCore.showToast('Invalid entry ID', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            // Reset state
            this.resetState();
            
            this.render();
            this.loadOriginalEntry();
        },
        
        resetState: function() {
            this.originalEntry = null;
            this.ledgers = [];
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
                                <i class="bi bi-files"></i> Copy Debit Note
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading original entry...</p>
                    </div>
                    
                    <!-- Form (Hidden initially) -->
                    <form id="debitNoteForm" style="display: none;">
                        <div class="alert alert-info mb-4">
                            <i class="bi bi-info-circle"></i> 
                            Creating a copy from Debit Note: <strong id="originalCode"></strong>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">Debit Note Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
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
                                            <i class="bi bi-check-circle"></i> Save Debit Note
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
        
        loadOriginalEntry: function() {
            const self = this;
            
            // Load original entry data
            TempleAPI.get(`/accounts/entries/${this.entryId}`)
                .done(function(response) {
                    if (response.success) {
                        self.originalEntry = response.data;
                        
                        console.log('Original entry loaded:', self.originalEntry);
                        
                        // Verify it's a debit note
                        if (self.originalEntry.entrytype_id !== 6) {
                            TempleCore.showToast('Selected entry is not a debit note', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        // Update original code display
                        $('#originalCode').text(self.originalEntry.entry_code);
                        
                        // Load master data
                        self.loadMasterData();
                    } else {
                        TempleCore.showToast('Failed to load original entry', 'error');
                        TempleRouter.navigate('entries');
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load entry:', xhr.responseJSON);
                    TempleCore.showToast('Failed to load original entry', 'error');
                    TempleRouter.navigate('entries');
                });
        },
        
        loadMasterData: function() {
            const self = this;
            let loadCount = 0;
            const totalLoads = 2;
            
            function checkAllLoaded() {
                loadCount++;
                if (loadCount === totalLoads) {
                    self.populateFormWithOriginalData();
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
                })
                .fail(function(xhr) {
                    console.error('Failed to load funds:', xhr.responseJSON);
                })
                .always(checkAllLoaded);
            
            // Load Credit Ledgers
            TempleAPI.get('/accounts/entries/ledgers/credit')
                .done(function(response) {
                    if (response.success) {
                        self.ledgers = response.data;
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load ledgers:', xhr.responseJSON);
                    // Fallback to all ledgers
                    TempleAPI.get('/accounts/ledgers')
                        .done(function(response) {
                            if (response.success) {
                                self.ledgers = response.data.filter(ledger => ledger.iv !== 1);
                            }
                        });
                })
                .always(checkAllLoaded);
        },
        
        populateFormWithOriginalData: function() {
            const self = this;
            
            console.log('Populating form with original data:', this.originalEntry);
            
            // Hide loading, show form
            $('#loadingState').hide();
            $('#debitNoteForm').show();
            
            // Generate new entry code
            this.generateEntryCode();
            
            // Populate basic fields (keep today's date)
            $('#fundId').val(this.originalEntry.fund_id);
            $('#referenceNo').val(this.originalEntry.reference_no || '');
            $('#partyName').val(this.originalEntry.paid_to || '');
            $('#narration').val(this.originalEntry.narration || '');
            
            // Clear existing items
            $('#entryItemsBody').empty();
            this.entryItems = [];
            this.itemCounter = 0;
            
            // Populate entry items - check both entry_items and entryItems
            const items = this.originalEntry.entry_items || this.originalEntry.entryItems || [];
            console.log('Items to copy:', items);
            
            if (items.length > 0) {
                items.forEach(item => {
                    self.addEntryRowWithData(item);
                });
            } else {
                // If no items found, add two default rows
                console.log('No items found, adding default rows');
                self.addEntryRow();
                self.addEntryRow();
            }
            
            // Calculate totals
            this.calculateTotals();
            
            // Bind events
            this.bindEvents();
        },
        
        addEntryRowWithData: function(itemData) {
            const rowId = ++this.itemCounter;
            const options = this.getLedgerOptions();
            
            console.log('Adding row with data:', itemData);
            
            // Determine amounts based on dc field
            const drAmount = (itemData.dc === 'D' || itemData.dc === 'd') ? parseFloat(itemData.amount) : 0;
            const crAmount = (itemData.dc === 'C' || itemData.dc === 'c') ? parseFloat(itemData.amount) : 0;
            
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
                               data-row="${rowId}" min="0" step="0.01" value="${drAmount.toFixed(2)}">
                    </td>
                    <td>
                        <input type="number" class="form-control credit-amount text-end" 
                               data-row="${rowId}" min="0" step="0.01" value="${crAmount.toFixed(2)}">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#entryItemsBody').append(rowHtml);
            
            // Set the ledger value after adding the row
            setTimeout(() => {
                $(`.ledger-select[data-row="${rowId}"]`).val(itemData.ledger_id);
            }, 100);
            
            // Add to items array
            this.entryItems.push({
                id: rowId,
                ledger_id: itemData.ledger_id,
                dr_amount: drAmount,
                cr_amount: crAmount
            });
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
        
        generateEntryCode: function() {
            const date = $('#entryDate').val() || new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'DBN',
                entrytype_id: 6,
                date: date
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            })
            .fail(function(xhr) {
                console.error('Failed to generate entry code:', xhr.responseJSON);
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
            let index = 1;
            $('#entryItemsBody tr').each(function() {
                $(this).find('td:first').text(index++);
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
                entry_code: $('#entryCode').val(),
                narration: $('#narration').val(),
                reference_no: $('#referenceNo').val(),
                party_name: $('#partyName').val(),
                debit_note_items: validItems
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/entries/debit-note', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Debit Note created successfully (copied)', 'success');
                        
                        if (saveAndNew) {
                            // Reload for new entry
                            window.location.reload();
                        } else {
                            TempleRouter.navigate('entries');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create debit note', 'error');
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