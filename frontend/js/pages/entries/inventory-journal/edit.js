// js/pages/entries/inventory-journal/edit.js
(function($, window) {
    'use strict';
    
    window.EntriesInventoryJournalEditPage = {
        entryId: null,
        entryData: null,
        ledgers: [],
        inventoryLedgers: [],
        funds: [],
        inventoryItems: [],
        accountingItems: [],
        inventoryCounter: 0,
        accountingCounter: 0,
        
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
                        
                        // Check if entry can be edited
                        if (!self.entryData.can_edit) {
                            TempleCore.showToast('This entry cannot be edited', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        // Check if it's an inventory journal
                        if (self.entryData.entrytype_id !== 7) {
                            TempleCore.showToast('This is not an inventory journal entry', 'error');
                            TempleRouter.navigate('entries');
                            return;
                        }
                        
                        self.render();
                        self.loadMasterData();
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
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-box-seam"></i> Edit Inventory Journal
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <form id="inventoryJournalForm">
                        <!-- Entry Details -->
                        <div class="card mb-4">
                            <div class="card-header bg-dark text-white">
                                <h5 class="mb-0">Entry Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required>
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
                        
                        <!-- Entry Summary -->
                        <div class="card mb-4">
                            <div class="card-header bg-secondary text-white">
                                <h5 class="mb-0">Entry Summary</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Account</th>
                                                <th class="text-center">Qty</th>
                                                <th class="text-end">Unit Price</th>
                                                <th class="text-end">Debit</th>
                                                <th class="text-end">Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody id="entrySummary">
                                            <tr>
                                                <td colspan="5" class="text-center text-muted">
                                                    Loading...
                                                </td>
                                            </tr>
                                        </tbody>
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
                                        <i class="bi bi-check-circle"></i> Update Entry
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
            let loadedCount = 0;
            const totalLoads = 3;
            
            function checkAllLoaded() {
                loadedCount++;
                if (loadedCount === totalLoads) {
                    // All master data loaded, now populate the form
                    self.populateForm();
                    self.bindEvents();
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
            
            // Load Regular Ledgers (non-inventory)
            TempleAPI.get('/accounts/ledgers/type/normal')
                .done(function(response) {
                    if (response.success) {
                        self.ledgers = response.data;
                    }
                }).always(checkAllLoaded);
            
            // Load Inventory Ledgers
            TempleAPI.get('/accounts/ledgers/type/inventory')
                .done(function(response) {
                    if (response.success) {
                        self.inventoryLedgers = response.data;
                    }
                }).always(checkAllLoaded);
        },
        
        populateForm: function() {
            const entry = this.entryData;
            
            // Set basic fields
            console.log(entry);
            const formattedDate = new Date(entry.date).toISOString().split('T')[0];
            $('#entryDate').val(formattedDate);
            $('#entryCode').val(entry.entry_code);
            $('#fundId').val(entry.fund_id);
            $('#referenceNo').val(entry.reference_no || '');
            $('#narration').val(entry.narration || '');
            
            // Separate inventory and accounting items
            const inventoryItems = [];
            const accountingItems = [];
            
            entry.entry_items.forEach(item => {
                if (item.quantity && item.quantity > 0) {
                    // This is an inventory item
                    inventoryItems.push({
                        ledger_id: item.ledger_id,
                        ledger_name: item.ledger ? item.ledger.name : '',
                        transaction_type: item.dc === 'D' ? 'Purchase' : 'Sale',
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        amount: item.amount
                    });
                } else {
                    // This is an accounting entry
                    accountingItems.push({
                        ledger_id: item.ledger_id,
                        ledger_name: item.ledger ? item.ledger.name : '',
                        debit_amount: item.dc === 'D' ? item.amount : 0,
                        credit_amount: item.dc === 'C' ? item.amount : 0
                    });
                }
            });
            
            // Add inventory rows
            if (inventoryItems.length > 0) {
                inventoryItems.forEach(item => {
                    this.addInventoryRow(item);
                });
            } else {
                // Add at least one empty row
                this.addInventoryRow();
            }
            
            // Add accounting rows
            if (accountingItems.length > 0) {
                accountingItems.forEach(item => {
                    this.addAccountingRow(item);
                });
            } else {
                // Add at least one empty row
                this.addAccountingRow();
            }
            
            // Update summary
            this.updateSummary();
        },
        
        // Check for duplicate ledger selection
        checkDuplicateLedger: function(ledgerId, currentRowId) {
            let isDuplicate = false;
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                if (rowId !== currentRowId) {
                    const existingLedgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                    if (existingLedgerId && existingLedgerId === ledgerId) {
                        isDuplicate = true;
                        return false; // Break the loop
                    }
                }
            });
            return isDuplicate;
        },
        
        // Revalidate duplicates after row removal
        revalidateDuplicates: function() {
            const self = this;
            const ledgerCounts = {};
            
            // Count occurrences of each ledger
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                if (ledgerId) {
                    ledgerCounts[ledgerId] = (ledgerCounts[ledgerId] || 0) + 1;
                }
            });
            
            // Clear errors for non-duplicate ledgers
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                const $select = $(`.inventory-ledger[data-row="${rowId}"]`);
                
                if (ledgerId && ledgerCounts[ledgerId] === 1) {
                    // No longer a duplicate
                    $select.removeClass('is-invalid');
                    $select.next('.invalid-feedback').remove();
                }
            });
        },
        
        addInventoryRow: function(data = null) {
            const self = this;
            const rowId = ++this.inventoryCounter;
            
            const options = this.inventoryLedgers.map(ledger => 
                `<option value="${ledger.id}" ${data && data.ledger_id == ledger.id ? 'selected' : ''}>
                    ${ledger.name}
                </option>`
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
                            <option value="Purchase" ${data && data.transaction_type === 'Purchase' ? 'selected' : ''}>Stock In</option>
                            <option value="Sale" ${data && data.transaction_type === 'Sale' ? 'selected' : ''}>Stock Out</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center available-qty" 
                               readonly data-row="${rowId}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-center quantity" 
                               min="0.01" step="0.01" required data-row="${rowId}"
                               value="${data ? data.quantity : ''}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end unit-price" 
                               min="0.01" step="0.01" required data-row="${rowId}"
                               value="${data ? data.unit_price : ''}">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-end item-amount" 
                               readonly data-row="${rowId}" value="${data ? data.amount : ''}">
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
            
            // Load inventory balance if ledger is selected
            if (data && data.ledger_id) {
                this.loadInventoryBalance(data.ledger_id, rowId, data.quantity);
            }
        },
        
        addAccountingRow: function(data = null) {
            const self = this;
            const rowId = ++this.accountingCounter;
            
            const options = this.ledgers.map(ledger => 
                `<option value="${ledger.id}" ${data && data.ledger_id == ledger.id ? 'selected' : ''}>
                    ${ledger.name}
                </option>`
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
                               min="0" step="0.01" data-row="${rowId}"
                               value="${data && data.debit_amount ? data.debit_amount : ''}"
                               ${data && data.credit_amount > 0 ? 'readonly' : ''}>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm text-end credit-amount" 
                               min="0" step="0.01" data-row="${rowId}"
                               value="${data && data.credit_amount ? data.credit_amount : ''}"
                               ${data && data.debit_amount > 0 ? 'readonly' : ''}>
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
            const self = this;
            
            // Inventory ledger change with duplicate prevention
            $(`.inventory-ledger[data-row="${rowId}"]`).on('change', function() {
                const ledgerId = $(this).val();
                const $select = $(this);
                
                if (ledgerId) {
                    // Check for duplicate
                    if (self.checkDuplicateLedger(ledgerId, rowId)) {
                        // Show error message
                        TempleCore.showToast('This inventory item has already been added', 'error');
                        
                        // Clear the selection
                        $select.val('');
                        
                        // Clear related fields
                        $(`.available-qty[data-row="${rowId}"]`).val('');
                        $(`.avg-price[data-row="${rowId}"]`).val('');
                        
                        // Add visual feedback
                        $select.addClass('is-invalid');
                        if (!$select.next('.invalid-feedback').length) {
                            $select.after('<div class="invalid-feedback">This item is already selected in another row</div>');
                        }
                        
                        return;
                    }
                    
                    // Remove any previous error styling
                    $select.removeClass('is-invalid');
                    $select.next('.invalid-feedback').remove();
                    
                    // Continue with loading inventory balance
                    const currentQty = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
                    self.loadInventoryBalance(ledgerId, rowId, currentQty);
                } else {
                    // Clear fields when no ledger is selected
                    $(`.available-qty[data-row="${rowId}"]`).val('');
                    $(`.avg-price[data-row="${rowId}"]`).val('');
                    $select.removeClass('is-invalid');
                    $select.next('.invalid-feedback').remove();
                }
                self.updateSummary();
            });
            
            // Transaction type change
            $(`.transaction-type[data-row="${rowId}"]`).on('change', function() {
                self.validateQuantity(rowId);
                self.updateSummary();
            });
            
            // Quantity or Unit Price change
            $(`.quantity[data-row="${rowId}"], .unit-price[data-row="${rowId}"]`).on('input', function() {
                const qty = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
                const price = parseFloat($(`.unit-price[data-row="${rowId}"]`).val()) || 0;
                const amount = qty * price;
                $(`.item-amount[data-row="${rowId}"]`).val(amount.toFixed(2));
                
                self.validateQuantity(rowId);
                self.updateSummary();
            });
            
            // Remove button
            $(`.remove-inventory[data-row="${rowId}"]`).on('click', function() {
                if ($('.inventory-row').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    
                    // After removing, clear any duplicate errors on remaining rows
                    self.revalidateDuplicates();
                    self.updateSummary();
                } else {
                    TempleCore.showToast('At least one inventory item is required', 'warning');
                }
            });
        },
        
        bindAccountingRowEvents: function(rowId) {
            const self = this;
            
            // Ledger change
            $(`.accounting-ledger[data-row="${rowId}"]`).on('change', function() {
                self.updateSummary();
            });
            
            // Debit amount change
            $(`.debit-amount[data-row="${rowId}"]`).on('input', function() {
                const value = $(this).val();
                if (value && value > 0) {
                    $(`.credit-amount[data-row="${rowId}"]`).val('').prop('readonly', true);
                } else {
                    $(`.credit-amount[data-row="${rowId}"]`).prop('readonly', false);
                }
                self.updateSummary();
            });
            
            // Credit amount change
            $(`.credit-amount[data-row="${rowId}"]`).on('input', function() {
                const value = $(this).val();
                if (value && value > 0) {
                    $(`.debit-amount[data-row="${rowId}"]`).val('').prop('readonly', true);
                } else {
                    $(`.debit-amount[data-row="${rowId}"]`).prop('readonly', false);
                }
                self.updateSummary();
            });
            
            // Remove button
            $(`.remove-accounting[data-row="${rowId}"]`).on('click', function() {
                if ($('.accounting-row').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.updateSummary();
                } else {
                    TempleCore.showToast('At least one accounting entry is required', 'warning');
                }
            });
        },
        
        loadInventoryBalance: function(ledgerId, rowId, currentQty = 0) {
            const self = this;
            
            // For editing, we need to consider the original quantity
            const originalItem = this.entryData.entry_items.find(item => 
                item.ledger_id == ledgerId && item.quantity > 0
            );
            const originalQty = originalItem ? originalItem.quantity : 0;
            const originalType = originalItem ? (originalItem.dc === 'D' ? 'Purchase' : 'Sale') : '';
            
            TempleAPI.get(`/accounts/entries/inventory/${ledgerId}/balance`)
                .done(function(response) {
                    if (response.success) {
                        let availableQty = response.data.quantity || 0;
                        
                        // Adjust available quantity for editing
                        // If it was a sale, add back the original quantity
                        // If it was a purchase, subtract the original quantity
                        if (originalType === 'Sale') {
                            availableQty += originalQty;
                        } else if (originalType === 'Purchase') {
                            availableQty -= originalQty;
                        }
                        
                        $(`.available-qty[data-row="${rowId}"]`).val(availableQty);
                        
                        // Calculate weighted average price
                        const avgPrice = response.data.quantity > 0 ? 
                            (response.data.value / response.data.quantity) : 0;
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
            let summaryRows = [];
            
            // Process inventory items
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                const ledgerText = $(`.inventory-ledger[data-row="${rowId}"] option:selected`).text().trim();
                const type = $(`.transaction-type[data-row="${rowId}"]`).val();
                const qty = parseFloat($(`.quantity[data-row="${rowId}"]`).val()) || 0;
                const price = parseFloat($(`.unit-price[data-row="${rowId}"]`).val()) || 0;
                const amount = qty * price;
                
                if (ledgerId && type && amount > 0) {
                    totalInventoryValue += amount;
                    
                    if (type === 'Purchase') {
                        totalQtyIn += qty;
                        totalDebit += amount;
                        summaryRows.push({
                            account: ledgerText,
                            qty: qty,
                            price: price,
                            debit: amount,
                            credit: 0,
                            type: 'inventory'
                        });
                    } else {
                        totalQtyOut += qty;
                        totalCredit += amount;
                        summaryRows.push({
                            account: ledgerText,
                            qty: qty,
                            price: price,
                            debit: 0,
                            credit: amount,
                            type: 'inventory'
                        });
                    }
                }
            });
            
            // Process accounting entries
            $('.accounting-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.accounting-ledger[data-row="${rowId}"]`).val();
                const ledgerText = $(`.accounting-ledger[data-row="${rowId}"] option:selected`).text().trim();
                const debit = parseFloat($(`.debit-amount[data-row="${rowId}"]`).val()) || 0;
                const credit = parseFloat($(`.credit-amount[data-row="${rowId}"]`).val()) || 0;
                
                if (ledgerId && (debit > 0 || credit > 0)) {
                    totalDebit += debit;
                    totalCredit += credit;
                    summaryRows.push({
                        account: ledgerText,
                        qty: null,
                        price: null,
                        debit: debit,
                        credit: credit,
                        type: 'accounting'
                    });
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
            
            // Update summary table
            if (summaryRows.length > 0) {
                const summaryHtml = summaryRows.map(row => `
                    <tr>
                        <td>${row.account}</td>
                        <td class="text-center">${row.qty !== null ? row.qty.toFixed(2) : '-'}</td>
                        <td class="text-end">${row.price !== null ? TempleCore.formatCurrency(row.price) : '-'}</td>
                        <td class="text-end">${row.debit > 0 ? TempleCore.formatCurrency(row.debit) : '-'}</td>
                        <td class="text-end">${row.credit > 0 ? TempleCore.formatCurrency(row.credit) : '-'}</td>
                    </tr>
                `).join('');
                
                $('#entrySummary').html(summaryHtml);
            } else {
                $('#entrySummary').html(`
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            Add items above to see the entry preview
                        </td>
                    </tr>
                `);
            }
        },
        
        autoBalance: function() {
            // Same implementation as create page
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
                $(`.credit-amount[data-row="${targetRow}"]`).val(difference.toFixed(2));
                $(`.debit-amount[data-row="${targetRow}"]`).val('').prop('readonly', true);
            } else {
                $(`.debit-amount[data-row="${targetRow}"]`).val(Math.abs(difference).toFixed(2));
                $(`.credit-amount[data-row="${targetRow}"]`).val('').prop('readonly', true);
            }
            
            this.updateSummary();
            TempleCore.showToast('Entry balanced successfully', 'success');
        },
        
        bindEvents: function() {
            const self = this;
            
            // Add inventory button
            $('#btnAddInventory').on('click', function() {
                self.addInventoryRow();
            });
            
            // Add accounting button
            $('#btnAddAccounting').on('click', function() {
                self.addAccountingRow();
            });
            
            // Auto balance button
            $('#btnAutoBalance').on('click', function() {
                self.autoBalance();
            });
            
            // Form submission
            $('#inventoryJournalForm').on('submit', function(e) {
                e.preventDefault();
                self.updateEntry();
            });
        },
        
        validateForm: function() {
            const form = document.getElementById('inventoryJournalForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            // Check for duplicate inventory ledgers
            const inventoryLedgers = new Set();
            let hasDuplicate = false;
            
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                const ledgerId = $(`.inventory-ledger[data-row="${rowId}"]`).val();
                
                if (ledgerId) {
                    if (inventoryLedgers.has(ledgerId)) {
                        hasDuplicate = true;
                        // Highlight the duplicate
                        $(`.inventory-ledger[data-row="${rowId}"]`).addClass('is-invalid');
                    } else {
                        inventoryLedgers.add(ledgerId);
                    }
                }
            });
            
            if (hasDuplicate) {
                TempleCore.showToast('Duplicate inventory items found. Each item can only be added once.', 'error');
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
            $('.inventory-row').each(function() {
                const rowId = $(this).data('row-id');
                if (!EntriesInventoryJournalEditPage.validateQuantity(rowId)) {
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
        
        updateEntry: function() {
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
                fund_id: parseInt($('#fundId').val()),
                reference_no: $('#referenceNo').val(),
                narration: $('#narration').val(),
                inventory_items: inventoryItems,
                accounting_entries: accountingEntries
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.put(`/accounts/entries/update/${this.entryId}`, formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Inventory Journal updated successfully', 'success');
                        TempleRouter.navigate('entries');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update entry', 'error');
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