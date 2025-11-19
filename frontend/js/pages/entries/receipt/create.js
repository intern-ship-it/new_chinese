// js/pages/entries/receipt/create.js
(function($, window) {
    'use strict';
    
    window.EntriesReceiptCreatePage = {
        bankLedgers: [],
        creditLedgers: [],
        funds: [],
        receiptItems: [],
        itemCounter: 0,
        
        init: function() {
            // Reset state on initialization
            this.resetState();
            
            this.render();
            this.loadMasterData();
            this.bindEvents();
            this.generateEntryCode();
            // Note: addDefaultRow() is called after credit ledgers are loaded
        },
        
        resetState: function() {
            // Clear all arrays and reset counters
            this.bankLedgers = [];
            this.creditLedgers = [];
            this.funds = [];
            this.receiptItems = [];
            this.itemCounter = 0;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-cash-stack"></i> Create Receipt
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <form id="receiptForm">
                        <div class="card mb-4">
                            <div class="card-header bg-success text-white">
                                <h5 class="mb-0">Receipt Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Receipt No.</label>
                                        <input type="text" class="form-control" id="entryCode" readonly>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Receipt Mode <span class="text-danger">*</span></label>
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
                                        <label class="form-label">Received From <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="receivedFrom" required 
                                               placeholder="Name of person/organization">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Debit Account (Bank/Cash) <span class="text-danger">*</span></label>
                                        <select class="form-select" id="debitAccount" required>
                                            <option value="">Select Bank/Cash Account</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div id="paymentDetails"></div>
                                
                                <div class="row g-3 mt-2">
                                    <div class="col-12">
                                        <label class="form-label">Narration</label>
                                        <textarea class="form-control" id="narration" rows="2" 
                                                  placeholder="Enter receipt details..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Receipt Items -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Receipt Items</h5>
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
                                        <tbody id="receiptItemsBody">
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
                                
                                <!-- Discount Section -->
                                <div class="card mt-3">
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-4">
                                                <label class="form-label">Discount Amount (Optional)</label>
                                                <input type="number" class="form-control" id="discountAmount" 
                                                       min="0" step="0.01" value="0">
                                            </div>
                                            <div class="col-md-8">
                                                <label class="form-label">Discount Ledger</label>
                                                <select class="form-select" id="discountLedger">
                                                    <option value="">Select Discount Account</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="row mt-2">
                                            <div class="col">
                                                <h5>Net Receipt Amount: <span id="netAmount" class="text-success">0.00</span></h5>
                                            </div>
                                        </div>
                                    </div>
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
                                        <button type="button" class="btn btn-info me-2" id="btnPrint" style="display:none;">
                                            <i class="bi bi-printer"></i> Print
                                        </button>
                                        <button type="button" class="btn btn-primary me-2" id="btnSaveAndNew">
                                            <i class="bi bi-plus-circle"></i> Save & New
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-check-circle"></i> Save Receipt
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
            const totalLoads = 3;
            
            // Function to check if all data is loaded
            function checkAllLoaded() {
                loadCount++;
                if (loadCount === totalLoads) {
                    // Add default row only after all data is loaded
                    self.addDefaultRow();
                }
            }
            
            // Load Funds
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        self.funds = response.data;
                        
                        // Clear existing options first (except the default)
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
            
            // Load Bank/Cash Ledgers
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
                .done(function(response) {
                    if (response.success) {
                        self.bankLedgers = response.data;
                        
                        // Clear existing options first (except the default)
                        $('#debitAccount').find('option:not(:first)').remove();
                        
                        const options = response.data.map(ledger => 
                            `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
                        ).join('');
                        $('#debitAccount').append(options);
                    }
                })
                .fail(function() {
                    console.error('Failed to load bank ledgers');
                })
                .always(checkAllLoaded);
            
            // Load Credit Ledgers (Revenue accounts)
            TempleAPI.get('/accounts/ledgers/type/normal')
                .done(function(response) {
                    if (response.success) {
                        self.creditLedgers = response.data;
                        console.log('Credit ledgers loaded:', self.creditLedgers);
                        
                        // Clear existing options first (except the default)
                        $('#discountLedger').find('option:not(:first)').remove();
                        
                        // Filter for discount accounts
                        const discountOptions = response.data
                            .map(ledger => 
                                `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
                            ).join('');
                        $('#discountLedger').append(discountOptions);
                    }
                })
                .fail(function() {
                    console.error('Failed to load credit ledgers');
                })
                .always(checkAllLoaded);
        },
        
        generateEntryCode: function() {
            const today = new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'REC',
                entrytype_id: 1,
                date: today
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            });
        },
        
        addDefaultRow: function() {
            // Clear any existing rows first
            $('#receiptItemsBody').empty();
            this.receiptItems = [];
            this.itemCounter = 0;
            
            // Add a single default row
            this.addReceiptRow();
        },
        
        addReceiptRow: function() {
            const rowId = ++this.itemCounter;
            const options = this.creditLedgers.map(ledger => 
                `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
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
                               data-row="${rowId}" min="0.01" step="0.01" required>
                    </td>
                    <td>
                        <input type="text" class="form-control details" 
                               data-row="${rowId}" placeholder="Item details...">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            $('#receiptItemsBody').append(rowHtml);
            this.receiptItems.push({
                id: rowId,
                ledger_id: null,
                amount: 0,
                details: ''
            });
        },
        
        bindEvents: function() {
            const self = this;
            
            // Unbind existing events first to prevent duplicate bindings
            $('#entryDate').off('change');
            $('#paymentMode').off('change');
            $('#btnAddRow').off('click');
            $(document).off('click', '.remove-row');
            $(document).off('input', '.amount, #discountAmount');
            $(document).off('change', '.ledger-select');
            $(document).off('input', '.details');
            $('#receiptForm').off('submit');
            $('#btnSaveAndNew').off('click');
            
            // Date change
            $('#entryDate').on('change', function() {
                self.generateEntryCode();
            });
            
            // Payment mode change
            $('#paymentMode').on('change', function() {
                const mode = $(this).val();
                self.renderPaymentDetails(mode);
            });
            
            // Add row
            $('#btnAddRow').on('click', function() {
                self.addReceiptRow();
            });
            
            // Remove row
            $(document).on('click', '.remove-row', function() {
                const rowId = $(this).data('row');
                if ($('#receiptItemsBody tr').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.receiptItems = self.receiptItems.filter(item => item.id !== rowId);
                    self.calculateTotals();
                } else {
                    TempleCore.showToast('At least one item is required', 'warning');
                }
            });
            
            // Amount changes
            $(document).on('input', '.amount, #discountAmount', function() {
                if ($(this).hasClass('amount')) {
                    const rowId = $(this).data('row');
                    const item = self.receiptItems.find(i => i.id === rowId);
                    if (item) {
                        item.amount = parseFloat($(this).val()) || 0;
                    }
                }
                self.calculateTotals();
            });
            
            // Ledger selection
            $(document).on('change', '.ledger-select', function() {
                const rowId = $(this).data('row');
                const item = self.receiptItems.find(i => i.id === rowId);
                if (item) {
                    item.ledger_id = $(this).val();
                }
            });
            
            // Details change
            $(document).on('input', '.details', function() {
                const rowId = $(this).data('row');
                const item = self.receiptItems.find(i => i.id === rowId);
                if (item) {
                    item.details = $(this).val();
                }
            });
            
            // Form submission
            $('#receiptForm').on('submit', function(e) {
                e.preventDefault();
                self.saveReceipt(false);
            });
            
            // Save and New
            $('#btnSaveAndNew').on('click', function() {
                if (self.validateForm()) {
                    self.saveReceipt(true);
                }
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
                            <input type="date" class="form-control" id="transactionDate" required 
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                `;
            }
            
            $('#paymentDetails').html(html);
        },
        
        calculateTotals: function() {
            let total = 0;
            
            this.receiptItems.forEach(item => {
                total += item.amount;
            });
            
            const discount = parseFloat($('#discountAmount').val()) || 0;
            const netAmount = total - discount;
            
            $('#totalAmount').text(TempleCore.formatCurrency(total));
            $('#netAmount').text(TempleCore.formatCurrency(netAmount));
        },
        
        validateForm: function() {
            const form = document.getElementById('receiptForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            // Check discount
            const discount = parseFloat($('#discountAmount').val()) || 0;
            if (discount > 0 && !$('#discountLedger').val()) {
                TempleCore.showToast('Please select discount account', 'error');
                return false;
            }
            
            // Check items
            const validItems = this.receiptItems.filter(item => item.ledger_id && item.amount > 0);
            if (validItems.length === 0) {
                TempleCore.showToast('Please add at least one valid item', 'error');
                return false;
            }
            
            return true;
        },
        
        saveReceipt: function(saveAndNew) {
            if (!this.validateForm()) {
                return;
            }
            
            const validItems = this.receiptItems
                .filter(item => item.ledger_id && item.amount > 0)
                .map(item => ({
                    ledger_id: item.ledger_id,
                    amount: item.amount,
                    details: item.details
                }));
            
            const formData = {
                date: $('#entryDate').val(),
                receipt_code: $('#entryCode').val(),
                debit_account: $('#debitAccount').val(),
                fund_id: $('#fundId').val(),
                payment_mode: $('#paymentMode').val(),
                received_from: $('#receivedFrom').val(),
                narration: $('#narration').val(),
                items: validItems,
                discount_amount: parseFloat($('#discountAmount').val()) || 0,
                discount_ledger: $('#discountLedger').val()
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
            
            TempleAPI.post('/accounts/entries/receipt', formData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Receipt created successfully', 'success');
                        
                        if (saveAndNew) {
                            // Reset the page for new entry
                            location.reload();
                        } else {
                            TempleRouter.navigate('entries');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create receipt', 'error');
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