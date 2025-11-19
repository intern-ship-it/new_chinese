// js/pages/entries/inventory-journal/copy.js
(function($, window) {
    'use strict';
    
    window.EntriesInventoryJournalCopyPage = {
        entryId: null,
        originalEntry: null,
        ledgers: [],
        inventoryLedgers: [],
        funds: [],
        inventoryItems: [],
        accountingItems: [],
        inventoryCounter: 0,
        accountingCounter: 0,
        
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
            this.inventoryLedgers = [];
            this.funds = [];
            this.inventoryItems = [];
            this.accountingItems = [];
            this.inventoryCounter = 0;
            this.accountingCounter = 0;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-files"></i> Copy Inventory Journal
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
                    <form id="inventoryJournalForm" style="display: none;">
                        <div class="alert alert-info mb-4">
                            <i class="bi bi-info-circle"></i> 
                            Creating a copy from Inventory Journal: <strong id="originalCode"></strong>
                        </div>
                        
                        <!-- Entry Details -->
                        <div class="card mb-4">
                            <div class="card-header bg-dark text-white">
                                <h5 class="mb-0">Entry Details</h5>
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
                                    <div class="col-md-3">
                                        <label class="form-label">Fund <span class="text-danger">*</span></label>
                                        <select class="form-select" id="fundId" required>
                                            <option value="">Select Fund</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Reference No.</label>
                                        <input type="text" class="form-control" id="referenceNo" 
                                               placeholder="Invoice/Bill No.">
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-12">
                                        <label class="form-label">Narration</label>
                                        <textarea class="form-control" id="narration" rows="2" 
                                                  placeholder="Enter transaction details..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Inventory Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Inventory Items</h5>
                                <button type="button" class="btn btn-light btn-sm" id="btnAddInventory">
                                    <i class="bi bi-plus-circle"></i> Add Item
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th width="30%">Inventory Ledger</th>
                                                <th width="15%">Type</th>
                                                <th width="10%">Available</th>
                                                <th width="10%">Quantity</th>
                                                <th width="10%">Unit Price</th>
                                                <th width="10%">Amount</th>
                                                <th width="10%">Avg. Price</th>
                                                <th width="5%">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="inventoryItemsTable">
                                            <!-- Dynamic rows will be added here -->
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-active">
                                                <th colspan="3">Total Inventory Value</th>
                                                <th class="text-center" id="totalQtyIn">In: 0</th>
                                                <th class="text-center" id="totalQtyOut">Out: 0</th>
                                                <th colspan="2" class="text-end" id="totalInventoryValue">0.00</th>
                                                <th></th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Accounting Entries -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Accounting Entries</h5>
                                <div>
                                    <button type="button" class="btn btn-warning btn-sm me-2" id="btnAutoBalance">
                                        <i class="bi bi-calculator"></i> Auto Balance
                                    </button>
                                    <button type="button" class="btn btn-light btn-sm" id="btnAddAccounting">
                                        <i class="bi bi-plus-circle"></i> Add Entry
                                    </button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th width="40%">Account Ledger</th>
                                                <th width="25%">Debit</th>
                                                <th width="25%">Credit</th>
                                                <th width="10%">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="accountingItemsTable">
                                            <!-- Dynamic rows will be added here -->
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-active">
                                                <th>Total</th>
                                                <th class="text-end" id="totalDebit">0.00</th>
                                                <th class="text-end" id="totalCredit">0.00</th>
                                                <th></th>
                                            </tr>
                                            <tr>
                                                <th colspan="4" class="text-center">
                                                    <span id="balanceStatus" class="badge bg-warning">Not Balanced</span>
                                                    <span id="balanceDifference" class="ms-2"></span>
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
        
        loadOriginalEntry: function() {
            const self = this;
            
            TempleAPI.get(`/accounts/entries/${this.entryId}`)
                .done(function(response) {
                    if (response.success) {
                        self.originalEntry = response.data;
                        
                        console.log('Original entry loaded:', self.originalEntry);
                        
                        // Verify it's an inventory journal
                        if (self.originalEntry.entrytype_id !== 7) {
                            TempleCore.showToast('Selected entry is not an inventory journal', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
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
            const promises = [];
            
            // Load Funds
            const fundsPromise = TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success && response.data) {
                        self.funds = response.data;
                        const options = self.funds.map(fund => 
                            `<option value="${fund.id}">${fund.name} (${fund.code})</option>`
                        ).join('');
                        $('#fundId').append(options);
                    }
                });
            promises.push(fundsPromise);
            
            // Load Regular Ledgers
            const ledgersPromise = TempleAPI.get('/accounts/ledgers/type/normal')
                .done(function(response) {
                    if (response.success && response.data) {
                        self.ledgers = response.data;
                    }
                })
                .fail(function() {
                    // Fallback to all ledgers
                    TempleAPI.get('/accounts/ledgers')
                        .done(function(response) {
                            if (response.success) {
                                self.ledgers = response.data.filter(l => l.iv !== 1);
                            }
                        });
                });
            promises.push(ledgersPromise);
            
            // Load Inventory Ledgers
            const inventoryPromise = TempleAPI.get('/accounts/ledgers/type/inventory')
                .done(function(response) {
                    if (response.success && response.data) {
                        self.inventoryLedgers = response.data;
                    }
                })
                .fail(function() {
                    // Fallback to filtered ledgers
                    TempleAPI.get('/accounts/ledgers')
                        .done(function(response) {
                            if (response.success) {
                                self.inventoryLedgers = response.data.filter(l => l.iv === 1);
                            }
                        });
                });
            promises.push(inventoryPromise);
            
            // When all data is loaded, populate the form
            $.when.apply($, promises).always(function() {
                self.populateFormWithOriginalData();
            });
        },
        
        populateFormWithOriginalData: function() {
            const self = this;
            
            console.log('Populating form with original data');
            console.log('Original entry:', this.originalEntry);
            
            // Hide loading, show form
            $('#loadingState').hide();
            $('#inventoryJournalForm').show();
            
            // Generate new entry code
            this.generateEntryCode();
            
            // Populate basic fields
            $('#fundId').val(this.originalEntry.fund_id);
            $('#referenceNo').val(this.originalEntry.reference_no || '');
            $('#narration').val(this.originalEntry.narration || '');
            
            // Process entry items
            const items = this.originalEntry.entry_items || this.originalEntry.entryItems || [];
            console.log('Items to copy:', items);
            
            // Create a map to consolidate duplicate inventory items
            const inventoryMap = new Map();
            const accountingItems = [];
            
            items.forEach(item => {
                // Items with quantity are inventory items
                if (item.quantity && item.quantity > 0) {
                    const key = `${item.ledger_id}_${item.dc}`;
                    
                    if (inventoryMap.has(key)) {
                        // Consolidate quantities for duplicate items
                        const existing = inventoryMap.get(key);
                        existing.quantity = parseFloat(existing.quantity) + parseFloat(item.quantity);
                        // Use weighted average for price if different
                        const totalValue = (existing.quantity * existing.unit_price) + (item.quantity * item.unit_price);
                        const totalQty = existing.quantity + parseFloat(item.quantity);
                        existing.unit_price = totalValue / totalQty;
                    } else {
                        inventoryMap.set(key, {
                            ledger_id: item.ledger_id,
                            ledger: item.ledger,
                            dc: item.dc,
                            quantity: parseFloat(item.quantity),
                            unit_price: parseFloat(item.unit_price || 0)
                        });
                    }
                } else {
                    // Regular accounting entry
                    accountingItems.push(item);
                }
            });
            
            // Add unique inventory items
            if (inventoryMap.size > 0) {
                inventoryMap.forEach(item => {
                    self.addInventoryRowWithData(item);
                });
            } else {
                self.addInventoryRow(); // Add one default row
            }
            
            // Add accounting items
            if (accountingItems.length > 0) {
                accountingItems.forEach(item => {
                    self.addAccountingRowWithData(item);
                });
            } else {
                self.addAccountingRow(); // Add one default row
            }
            
            // Update summary
            this.updateSummary();
            
            // Bind events
            this.bindEvents();
        },
        
        addInventoryRowWithData: function(itemData) {
            const rowId = ++this.inventoryCounter;
            
            const options = this.inventoryLedgers.map(ledger => 
                `<option value="${ledger.id}" data-code="${ledger.left_code}/${ledger.right_code}">${ledger.name}</option>`
            ).join('');
            
            // Determine transaction type from debit/credit
            const transactionType = itemData.dc === 'D' ? 'Purchase' : 'Sale';
            const quantity = itemData.quantity || 0;
            const unitPrice = itemData.unit_price || 0;
            const amount = quantity * unitPrice;
            
            const row = `
                <tr data-row-id="${rowId}" class="inventory-row">
                    <td>
                        <select class="form-select form-select-sm inventory-ledger" data-row="${rowId}" required>
                            <option value="">Select Inventory Item</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <select class="form-select form-select-sm transaction-type" data-row="${rowId}" required>
                            <option value="">Select</option>
                            <option value="Purchase" ${transactionType === 'Purchase' ? 'selected' : ''}>Stock In</option>
                            <option value="Sale" ${transactionType === 'Sale' ? 'selected' : ''}>Stock Out</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center available-qty" readonly data-row="${rowId}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-center quantity" 
                               min="0.01" step="0.01" required data-row="${rowId}" value="${quantity}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end unit-price" 
                               min="0.01" step="0.01" required data-row="${rowId}" value="${unitPrice}">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-end item-amount" 
                               readonly data-row="${rowId}" value="${amount.toFixed(2)}">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center avg-price" 
                               readonly data-row="${rowId}" title="Average purchase price">
                    </td>
                    <td>
                        <button type="button" class="btn btn-danger btn-sm remove-inventory" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#inventoryItemsTable').append(row);
            
            // Set the ledger value
            setTimeout(() => {
                $(`.inventory-ledger[data-row="${rowId}"]`).val(itemData.ledger_id);
                // Load inventory balance for the selected ledger
                if (itemData.ledger_id) {
                    this.loadInventoryBalance(itemData.ledger_id, rowId);
                }
            }, 100);
            
            this.bindInventoryRowEvents(rowId);
        },
        
        addAccountingRowWithData: function(itemData) {
            const rowId = ++this.accountingCounter;
            
            const options = this.ledgers.map(ledger => 
                `<option value="${ledger.id}" data-code="${ledger.left_code}/${ledger.right_code}">${ledger.name}</option>`
            ).join('');
            
            const debitAmount = itemData.dc === 'D' ? itemData.amount : 0;
            const creditAmount = itemData.dc === 'C' ? itemData.amount : 0;
            
            const row = `
                <tr data-row-id="${rowId}" class="accounting-row">
                    <td>
                        <select class="form-select form-select-sm accounting-ledger" data-row="${rowId}" required>
                            <option value="">Select Account</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end debit-amount" 
                               min="0" step="0.01" data-row="${rowId}" value="${debitAmount}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end credit-amount" 
                               min="0" step="0.01" data-row="${rowId}" value="${creditAmount}">
                    </td>
                    <td>
                        <button type="button" class="btn btn-danger btn-sm remove-accounting" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#accountingItemsTable').append(row);
            
            // Set the ledger value
            setTimeout(() => {
                $(`.accounting-ledger[data-row="${rowId}"]`).val(itemData.ledger_id);
            }, 100);
            
            this.bindAccountingRowEvents(rowId);
        },
        
        addInventoryRow: function() {
            const self = this;
            const rowId = ++this.inventoryCounter;
            
            const options = this.inventoryLedgers.map(ledger => 
                `<option value="${ledger.id}" data-code="${ledger.left_code}/${ledger.right_code}">${ledger.name}</option>`
            ).join('');
            
            const row = `
                <tr data-row-id="${rowId}" class="inventory-row">
                    <td>
                        <select class="form-select form-select-sm inventory-ledger" data-row="${rowId}" required>
                            <option value="">Select Inventory Item</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <select class="form-select form-select-sm transaction-type" data-row="${rowId}" required>
                            <option value="">Select</option>
                            <option value="Purchase">Stock In</option>
                            <option value="Sale">Stock Out</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center available-qty" readonly data-row="${rowId}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-center quantity" 
                               min="0.01" step="0.01" required data-row="${rowId}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end unit-price" 
                               min="0.01" step="0.01" required data-row="${rowId}">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-end item-amount" 
                               readonly data-row="${rowId}">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center avg-price" 
                               readonly data-row="${rowId}" title="Average purchase price">
                    </td>
                    <td>
                        <button type="button" class="btn btn-danger btn-sm remove-inventory" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#inventoryItemsTable').append(row);
            this.bindInventoryRowEvents(rowId);
        },
        
        addAccountingRow: function() {
            const self = this;
            const rowId = ++this.accountingCounter;
            
            const options = this.ledgers.map(ledger => 
                `<option value="${ledger.id}" data-code="${ledger.left_code}/${ledger.right_code}">${ledger.name}</option>`
            ).join('');
            
            const row = `
                <tr data-row-id="${rowId}" class="accounting-row">
                    <td>
                        <select class="form-select form-select-sm accounting-ledger" data-row="${rowId}" required>
                            <option value="">Select Account</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end debit-amount" 
                               min="0" step="0.01" data-row="${rowId}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end credit-amount" 
                               min="0" step="0.01" data-row="${rowId}">
                    </td>
                    <td>
                        <button type="button" class="btn btn-danger btn-sm remove-accounting" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#accountingItemsTable').append(row);
            this.bindAccountingRowEvents(rowId);
        },
        
        bindInventoryRowEvents: function(rowId) {
            // Copy the event binding logic from create page
            const self = this;
            
            $(`.inventory-ledger[data-row="${rowId}"]`).on('change', function() {
                const ledgerId = $(this).val();
                if (ledgerId) {
                    self.loadInventoryBalance(ledgerId, rowId);
                }
                self.updateSummary();
            });
            
            $(`.transaction-type[data-row="${rowId}"]`).on('change', function() {
                self.validateQuantity(rowId);
                self.updateSummary();
            });
            
            $(`.quantity[data-row="${rowId}"], .unit-price[data-row="${rowId}"]`).on('input', function() {
                const qty = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
                const price = parseFloat($(`.unit-price[data-row="${rowId}"]`).val()) || 0;
                const amount = qty * price;
                $(`.item-amount[data-row="${rowId}"]`).val(amount.toFixed(2));
                
                self.validateQuantity(rowId);
                self.updateSummary();
            });
            
            $(`.remove-inventory[data-row="${rowId}"]`).on('click', function() {
                if ($('.inventory-row').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.updateSummary();
                } else {
                    TempleCore.showToast('At least one inventory item is required', 'warning');
                }
            });
        },
        
        bindAccountingRowEvents: function(rowId) {
            const self = this;
            
            $(`.accounting-ledger[data-row="${rowId}"]`).on('change', function() {
                self.updateSummary();
            });
            
            $(`.debit-amount[data-row="${rowId}"]`).on('input', function() {
                const value = $(this).val();
                if (value && value > 0) {
                    $(`.credit-amount[data-row="${rowId}"]`).val('').prop('readonly', true);
                } else {
                    $(`.credit-amount[data-row="${rowId}"]`).prop('readonly', false);
                }
                self.updateSummary();
            });
            
            $(`.credit-amount[data-row="${rowId}"]`).on('input', function() {
                const value = $(this).val();
                if (value && value > 0) {
                    $(`.debit-amount[data-row="${rowId}"]`).val('').prop('readonly', true);
                } else {
                    $(`.debit-amount[data-row="${rowId}"]`).prop('readonly', false);
                }
                self.updateSummary();
            });
            
            $(`.remove-accounting[data-row="${rowId}"]`).on('click', function() {
                if ($('.accounting-row').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.updateSummary();
                } else {
                    TempleCore.showToast('At least one accounting entry is required', 'warning');
                }
            });
        },
        
        generateEntryCode: function() {
            const date = $('#entryDate').val() || new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'IVJ',
                entrytype_id: 7,
                date: date
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            });
        },
        
        loadInventoryBalance: function(ledgerId, rowId) {
            TempleAPI.get(`/accounts/entries/inventory/${ledgerId}/balance`)
                .done(function(response) {
                    if (response.success) {
                        const data = response.data;
                        $(`.available-qty[data-row="${rowId}"]`).val(data.quantity || 0);
                        
                        const avgPrice = data.quantity > 0 ? (data.value / data.quantity) : 0;
                        $(`.avg-price[data-row="${rowId}"]`).val(avgPrice.toFixed(2));
                    }
                });
        },
        
        validateQuantity: function(rowId) {
            const type = $(`.transaction-type[data-row="${rowId}"]`).val();
            const quantity = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
            const available = parseFloat($(`.available-qty[data-row="${rowId}"]`).val()) || 0;
            
            const $qtyInput = $(`.quantity[data-row="${rowId}"]`);
            
            if (type === 'Sale' && quantity > available) {
                $qtyInput.addClass('is-invalid');
                if (!$qtyInput.next('.invalid-feedback').length) {
                    $qtyInput.after(`<div class="invalid-feedback">Insufficient stock (Available: ${available})</div>`);
                }
                return false;
            } else {
                $qtyInput.removeClass('is-invalid');
                $qtyInput.next('.invalid-feedback').remove();
                return true;
            }
        },
        
        updateSummary: function() {
            let totalInventoryValue = 0;
            let totalQtyIn = 0;
            let totalQtyOut = 0;
            let totalDebit = 0;
            let totalCredit = 0;
            
            // Process inventory items
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                const type = $(`.transaction-type[data-row="${rowId}"]`).val();
                const qty = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
                const price = parseFloat($(`.unit-price[data-row="${rowId}"]`).val()) || 0;
                const amount = qty * price;
                
                if (ledgerId && type && amount > 0) {
                    totalInventoryValue += amount;
                    
                    if (type === 'Purchase') {
                        totalQtyIn += qty;
                        totalDebit += amount;
                    } else {
                        totalQtyOut += qty;
                        totalCredit += amount;
                    }
                }
            });
            
            // Process accounting entries
            $('.accounting-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.accounting-ledger[data-row="${rowId}"]`).val();
                const debit = parseFloat($(`.debit-amount[data-row="${rowId}"]`).val()) || 0;
                const credit = parseFloat($(`.credit-amount[data-row="${rowId}"]`).val()) || 0;
                
                if (ledgerId && (debit > 0 || credit > 0)) {
                    totalDebit += debit;
                    totalCredit += credit;
                }
            });
            
            // Update totals
            $('#totalQtyIn').text(`In: ${totalQtyIn.toFixed(2)}`);
            $('#totalQtyOut').text(`Out: ${totalQtyOut.toFixed(2)}`);
            $('#totalInventoryValue').text(TempleCore.formatCurrency(totalInventoryValue));
            $('#totalDebit').text(TempleCore.formatCurrency(totalDebit));
            $('#totalCredit').text(TempleCore.formatCurrency(totalCredit));
            
            // Check balance
            const difference = Math.abs(totalDebit - totalCredit);
            if (difference < 0.01) {
                $('#balanceStatus').removeClass('bg-warning bg-danger').addClass('bg-success').text('Balanced');
                $('#balanceDifference').text('');
            } else {
                $('#balanceStatus').removeClass('bg-success').addClass('bg-danger').text('Not Balanced');
                const diffText = totalDebit > totalCredit ? 
                    `Credit short by ${TempleCore.formatCurrency(difference)}` : 
                    `Debit short by ${TempleCore.formatCurrency(difference)}`;
                $('#balanceDifference').text(diffText);
            }
        },
        
        autoBalance: function() {
            // Calculate current totals
            let inventoryDebit = 0;
            let inventoryCredit = 0;
            
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const type = $(`.transaction-type[data-row="${rowId}"]`).val();
                const amount = parseFloat($(`.item-amount[data-row="${rowId}"]`).val()) || 0;
                
                if (type === 'Purchase') {
                    inventoryDebit += amount;
                } else if (type === 'Sale') {
                    inventoryCredit += amount;
                }
            });
            
            let accountingDebit = 0;
            let accountingCredit = 0;
            
            $('.accounting-row').each(function() {
                const rowId = $(this).data('row-id');
                accountingDebit += parseFloat($(`.debit-amount[data-row="${rowId}"]`).val()) || 0;
                accountingCredit += parseFloat($(`.credit-amount[data-row="${rowId}"]`).val()) || 0;
            });
            
            const totalDebit = inventoryDebit + accountingDebit;
            const totalCredit = inventoryCredit + accountingCredit;
            const difference = totalDebit - totalCredit;
            
            if (Math.abs(difference) < 0.01) {
                TempleCore.showToast('Entry is already balanced', 'info');
                return;
            }
            
            // Find the last accounting row with no amount
            let targetRow = null;
            $('.accounting-row').each(function() {
                const rowId = $(this).data('row-id');
                const debit = $(`.debit-amount[data-row="${rowId}"]`).val();
                const credit = $(`.credit-amount[data-row="${rowId}"]`).val();
                const ledger = $(`.accounting-ledger[data-row="${rowId}"]`).val();
                
                if (ledger && !debit && !credit) {
                    targetRow = rowId;
                }
            });
            
            if (!targetRow) {
                TempleCore.showToast('Select an empty accounting entry to auto-balance', 'warning');
                return;
            }
            
            // Apply the balancing amount
            if (difference > 0) {
                // Need more credit
                $(`.credit-amount[data-row="${targetRow}"]`).val(difference.toFixed(2));
                $(`.debit-amount[data-row="${targetRow}"]`).val('').prop('readonly', true);
            } else {
                // Need more debit
                $(`.debit-amount[data-row="${targetRow}"]`).val(Math.abs(difference).toFixed(2));
                $(`.credit-amount[data-row="${targetRow}"]`).val('').prop('readonly', true);
            }
            
            this.updateSummary();
            TempleCore.showToast('Entry balanced successfully', 'success');
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#entryDate').on('change', function() {
                self.generateEntryCode();
            });
            
            $('#btnAddInventory').on('click', function() {
                self.addInventoryRow();
            });
            
            $('#btnAddAccounting').on('click', function() {
                self.addAccountingRow();
            });
            
            $('#btnAutoBalance').on('click', function() {
                self.autoBalance();
            });
            
            $('#inventoryJournalForm').on('submit', function(e) {
                e.preventDefault();
                self.saveEntry(false);
            });
            
            $('#btnSaveAndNew').on('click', function() {
                if (self.validateForm()) {
                    self.saveEntry(true);
                }
            });
        },
        
        validateForm: function() {
            const form = document.getElementById('inventoryJournalForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            // Check for at least one inventory item
            let hasInventory = false;
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledger = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                const amount = $(`.item-amount[data-row="${rowId}"]`).val();
                if (ledger && parseFloat(amount) > 0) {
                    hasInventory = true;
                }
            });
            
            if (!hasInventory) {
                TempleCore.showToast('Add at least one inventory item', 'error');
                return false;
            }
            
            // Check for at least one accounting entry
            let hasAccounting = false;
            $('.accounting-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledger = $(`.accounting-ledger[data-row="${rowId}"]`).val();
                const debit = $(`.debit-amount[data-row="${rowId}"]`).val();
                const credit = $(`.credit-amount[data-row="${rowId}"]`).val();
                if (ledger && (parseFloat(debit) > 0 || parseFloat(credit) > 0)) {
                    hasAccounting = true;
                }
            });
            
            if (!hasAccounting) {
                TempleCore.showToast('Add at least one accounting entry', 'error');
                return false;
            }
            
            // Validate quantities
            let quantityValid = true;
            const self = this;
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                if (!self.validateQuantity(rowId)) {
                    quantityValid = false;
                }
            });
            
            if (!quantityValid) {
                TempleCore.showToast('Please check inventory quantities', 'error');
                return false;
            }
            
            // Check balance
            const totalDebit = parseFloat($('#totalDebit').text().replace(/[^0-9.-]+/g, '')) || 0;
            const totalCredit = parseFloat($('#totalCredit').text().replace(/[^0-9.-]+/g, '')) || 0;
            
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                TempleCore.showToast('Entry must be balanced before saving', 'error');
                return false;
            }
            
            return true;
        },
        
        saveEntry: function(saveAndNew) {
            if (!this.validateForm()) {
                return;
            }
            
            // Collect inventory items
            const inventoryItems = [];
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                const type = $(`.transaction-type[data-row="${rowId}"]`).val();
                const qty = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
                const price = parseFloat($(`.unit-price[data-row="${rowId}"]`).val()) || 0;
                
                if (ledgerId && qty > 0) {
                    inventoryItems.push({
                        ledger_id: parseInt(ledgerId),
                        transaction_type: type,
                        quantity: qty,
                        unit_price: price
                    });
                }
            });
            
            // Collect accounting entries
            const accountingEntries = [];
            $('.accounting-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.accounting-ledger[data-row="${rowId}"]`).val();
                const debit = parseFloat($(`.debit-amount[data-row="${rowId}"]`).val()) || 0;
                const credit = parseFloat($(`.credit-amount[data-row="${rowId}"]`).val()) || 0;
                
                if (ledgerId && (debit > 0 || credit > 0)) {
                    accountingEntries.push({
                        ledger_id: parseInt(ledgerId),
                        debit_amount: debit,
                        credit_amount: credit
                    });
                }
            });
            
            const formData = {
                date: $('#entryDate').val(),
                entry_code: $('#entryCode').val(),
                fund_id: parseInt($('#fundId').val()),
                reference_no: $('#referenceNo').val(),
                narration: $('#narration').val(),
                inventory_items: inventoryItems,
                accounting_entries: accountingEntries
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/entries/inventory-journal', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Inventory Journal created successfully (copied)', 'success');
                        
                        if (saveAndNew) {
                            window.location.reload();
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