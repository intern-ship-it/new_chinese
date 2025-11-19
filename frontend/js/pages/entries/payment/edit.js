// js/pages/entries/payment/edit.js
(function($, window) {
    'use strict';
    
    window.EntriesPaymentEditPage = {
        entryId: null,
        bankLedgers: [],
        debitLedgers: [],
        funds: [],
        paymentItems: [],
        itemCounter: 0,
        originalData: null,
        
        init: function(params) {
            this.entryId = params.id;
            this.render();
            this.loadMasterData();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-pencil-square"></i> Edit Payment
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <form id="paymentForm">
                        <div class="card mb-4">
                            <div class="card-header bg-warning text-white">
                                <h5 class="mb-0">Edit Payment Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Payment No.</label>
                                        <input type="text" class="form-control" id="entryCode" readonly>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                        <select class="form-select" id="paymentMode" required>
                                            <option value="">Select Mode</option>
                                            <option value="CASH">Cash</option>
                                            <option value="CHEQUE">Cheque</option>
                                            <option value="ONLINE">Online Transfer</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Fund <span class="text-danger">*</span></label>
                                        <select class="form-select" id="fundId" required>
                                            <option value="">Select Fund</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="row g-3 mt-2">
                                    <div class="col-md-6">
                                        <label class="form-label">Paid To <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="paidTo" required 
                                               placeholder="Name of person/organization">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Debit Account (Bank/Cash) <span class="text-danger">*</span></label>
                                        <select class="form-select" id="creditAccount" required>
                                            <option value="">Select Bank/Cash Account</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div id="paymentDetails"></div>
                                
                                <div class="row g-3 mt-2">
                                    <div class="col-12">
                                        <label class="form-label">Narration</label>
                                        <textarea class="form-control" id="narration" rows="2" 
                                                  placeholder="Enter payment details..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Payment Items</h5>
                                <button type="button" class="btn btn-light btn-sm" id="btnAddRow">
                                    <i class="bi bi-plus-circle"></i> Add Row
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="40">#</th>
                                                <th>Credit Account</th>
                                                <th width="150">Amount</th>
                                                <th>Details</th>
                                                <th width="80">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="paymentItemsBody">
                                            <!-- Dynamic rows -->
                                        </tbody>
                                        <tfoot>
                                            <tr class="table-active">
                                                <th colspan="2" class="text-end">Total</th>
                                                <th class="text-end">
                                                    <span id="totalAmount">0.00</span>
                                                </th>
                                                <th colspan="2"></th>
                                            </tr>
                                        </tfoot>
                                    </table>
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
                                        <button type="button" class="btn btn-info me-2" id="btnPrint">
                                            <i class="bi bi-printer"></i> Print
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-check-circle"></i> Update Payment
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
            const totalLoads = 4;
            
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
                })
                .always(checkAllLoaded);
            
            // Load Bank/Cash Ledgers
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
                .done(function(response) {
                    if (response.success) {
                        self.bankLedgers = response.data;
                        const options = response.data.map(ledger => 
                            `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
                        ).join('');
                        $('#creditAccount').append(options);
                    }
                })
                .always(checkAllLoaded);
				
			// Load Credit Ledgers (Revenue accounts)
            TempleAPI.get('/accounts/ledgers/type/normal')
                .done(function(response) {
                    if (response.success) {
                        self.debitLedgers = response.data;
                    }
                })
                .always(checkAllLoaded);
            
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
        
        populateFormData: function() {
			console.log(this.originalData);
            if (!this.originalData) return;
            
            const data = this.originalData;
            
            // Format date properly (remove time portion)
            const formattedDate = data.date ? data.date.split('T')[0] : '';
            
            // Set basic fields
            $('#entryDate').val(formattedDate);
            $('#entryCode').val(data.entry_code || data.number);
            $('#paymentMode').val(data.payment).trigger('change');
            $('#fundId').val(data.fund_id);
            $('#paidTo').val(data.paid_to);
            $('#narration').val(data.narration || '');
            
            // Extract debit account (bank/cash account) from entry_items
            const creditItem = data.entry_items.find(item => 
                item.dc === 'C' && item.is_discount === 0
            );
			
			if (creditItem) {
                $('#creditAccount').val(creditItem.ledger_id);
            }
            
            // Wait for payment details to render, then populate
            setTimeout(() => {
                if (data.payment === 'CHEQUE') {
                    $('#chequeNo').val(data.cheque_no || '');
                    $('#chequeDate').val(data.cheque_date || '');
                    $('#bankName').val(data.bank_name || '');
                } else if (data.payment === 'ONLINE') {
                    $('#transactionNo').val(data.transaction_no || '');
                    $('#transactionDate').val(data.transaction_date || '');
                }
            }, 100);
            
            // Clear and populate credit items (payment items)
            this.paymentItems = [];
            $('#paymentItemsBody').empty();
            
            // Filter for credit items (excluding discount)
            const debitItems = data.entry_items.filter(item => 
                item.dc === 'D' && item.is_discount === 0
            );
            
            if (debitItems.length > 0) {
                debitItems.forEach(item => {
                    this.addPaymentRow({
                        ledger_id: item.ledger_id,
                        amount: item.amount,
                        details: item.details || ''
                    });
                });
            } else {
                // Add default empty row if no items
                this.addPaymentRow();
            }
            
            this.calculateTotals();
        },
        
        addPaymentRow: function(existingItem = null) {
            const rowId = ++this.itemCounter;
            const options = this.debitLedgers.map(ledger => 
                `<option value="${ledger.id}" ${existingItem && existingItem.ledger_id == ledger.id ? 'selected' : ''}>
                    (${ledger.left_code}/${ledger.right_code}) - ${ledger.name}
                </option>`
            ).join('');
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
                            <option value="">Select Credit Account</option>
                            ${options}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control amount text-end" 
                               data-row="${rowId}" min="0.01" step="0.01" 
                               value="${existingItem ? existingItem.amount : ''}" required>
                    </td>
                    <td>
                        <input type="text" class="form-control details" 
                               data-row="${rowId}" placeholder="Item details..."
                               value="${existingItem ? (existingItem.details || '') : ''}">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#paymentItemsBody').append(rowHtml);
            
            const newItem = {
                id: rowId,
                ledger_id: existingItem ? existingItem.ledger_id : null,
                amount: existingItem ? parseFloat(existingItem.amount) : 0,
                details: existingItem ? (existingItem.details || '') : ''
            };
            
            this.paymentItems.push(newItem);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Payment mode change
            $('#paymentMode').on('change', function() {
                const mode = $(this).val();
                self.renderPaymentDetails(mode);
            });
            
            // Add row
            $('#btnAddRow').on('click', function() {
                self.addPaymentRow();
            });
            
            // Remove row
            $(document).on('click', '.remove-row', function() {
                const rowId = $(this).data('row');
                if ($('#paymentItemsBody tr').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.paymentItems = self.paymentItems.filter(item => item.id !== rowId);
                    self.calculateTotals();
                } else {
                    TempleCore.showToast('At least one item is required', 'warning');
                }
            });
            
            // Amount changes
            $(document).on('input', '.amount', function() {
                if ($(this).hasClass('amount')) {
                    const rowId = $(this).data('row');
                    const item = self.paymentItems.find(i => i.id === rowId);
                    if (item) {
                        item.amount = parseFloat($(this).val()) || 0;
                    }
                }
                self.calculateTotals();
            });
            
            // Ledger selection
            $(document).on('change', '.ledger-select', function() {
                const rowId = $(this).data('row');
                const item = self.paymentItems.find(i => i.id === rowId);
                if (item) {
                    item.ledger_id = $(this).val();
                }
            });
            
            // Details change
            $(document).on('input', '.details', function() {
                const rowId = $(this).data('row');
                const item = self.paymentItems.find(i => i.id === rowId);
                if (item) {
                    item.details = $(this).val();
                }
            });
            
            // Print button
            $('#btnPrint').on('click', function() {
                window.open(`/accounts/entries/print/${self.entryId}`, '_blank');
            });
            
            // Form submission
            $('#paymentForm').on('submit', function(e) {
                e.preventDefault();
                self.updatePayment();
            });
        },
        
        renderPaymentDetails: function(mode) {
            let html = '';
            
            if (mode === 'CHEQUE') {
                html = `
                    <div class="row g-3 mt-2">
                        <div class="col-md-4">
                            <label class="form-label">Cheque Number <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="chequeNo" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Cheque Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" id="chequeDate" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Bank Name</label>
                            <input type="text" class="form-control" id="bankName">
                        </div>
                    </div>
                `;
            } else if (mode === 'ONLINE') {
                html = `
                    <div class="row g-3 mt-2">
                        <div class="col-md-6">
                            <label class="form-label">Transaction Number <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="transactionNo" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Transaction Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" id="transactionDate" required>
                        </div>
                    </div>
                `;
            }
            
            $('#paymentDetails').html(html);
        },
        
        calculateTotals: function() {
            let total = 0;
            
            this.paymentItems.forEach(item => {
                total += item.amount;
            });
            
            const netAmount = total;
            
            $('#totalAmount').text(TempleCore.formatCurrency(total));
            $('#netAmount').text(TempleCore.formatCurrency(netAmount));
        },
        
        validateForm: function() {
            const form = document.getElementById('paymentForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            // Check items
            const validItems = this.paymentItems.filter(item => item.ledger_id && item.amount > 0);
            if (validItems.length === 0) {
                TempleCore.showToast('Please add at least one valid item', 'error');
                return false;
            }
            
            return true;
        },
        
        updatePayment: function() {
            if (!this.validateForm()) {
                return;
            }
            
            const validItems = this.paymentItems
                .filter(item => item.ledger_id && item.amount > 0)
                .map(item => ({
                    ledger_id: item.ledger_id,
                    amount: item.amount,
                    details: item.details
                }));
            
            const formData = {
                date: $('#entryDate').val(),
                credit_account: $('#creditAccount').val(),
                fund_id: $('#fundId').val(),
                payment_mode: $('#paymentMode').val(),
                paid_to: $('#paidTo').val(),
                narration: $('#narration').val(),
                items: validItems
            };
            
            // Add payment-specific fields
            if (formData.payment_mode === 'CHEQUE') {
                formData.cheque_no = $('#chequeNo').val();
                formData.cheque_date = $('#chequeDate').val();
                formData.bank_name = $('#bankName').val();
            } else if (formData.payment_mode === 'ONLINE') {
                formData.transaction_no = $('#transactionNo').val();
                formData.transaction_date = $('#transactionDate').val();
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.put(`/accounts/entries/update/${this.entryId}`, formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Payment updated successfully', 'success');
                        TempleRouter.navigate('entries');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update payment', 'error');
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