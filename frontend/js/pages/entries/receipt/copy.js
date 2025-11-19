// js/pages/entries/receipt/copy.js
(function ($, window) {
    'use strict';

    window.EntriesReceiptCopyPage = {
        entryId: null,
        originalEntry: null,
        bankLedgers: [],
        creditLedgers: [],
        funds: [],
        receiptItems: [],
        itemCounter: 0,

        init: function (params) {
            this.entryId = params?.id;

            if (!this.entryId) {
                TempleCore.showToast('Invalid entry ID', 'error');
                TempleRouter.navigate('entries');
                return;
            }

            this.render();
            this.loadMasterData();
            this.loadOriginalEntry();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-files"></i> Copy Receipt
                                <small class="text-muted ms-2">Creating copy from #<span id="originalCode"></span></small>
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
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0">Receipt Details (Copy)</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Receipt No. (New)</label>
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
                                        <input type="text" class="form-control" id="receivedFrom" required>
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
                                        <textarea class="form-control" id="narration" rows="2"></textarea>
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
                                        <button type="submit" class="btn btn-success">
                                            <i class="bi bi-check-circle"></i> Create Copy
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

        loadOriginalEntry: function () {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get(`/accounts/entries/${this.entryId}`)
                .done(function (response) {
                    if (response.success) {
                        self.originalEntry = response.data;
                        self.populateFromOriginal();
                    } else {
                        TempleCore.showToast('Failed to load original entry', 'error');
                        TempleRouter.navigate('entries');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load original entry', 'error');
                    TempleRouter.navigate('entries');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        populateFromOriginal: function () {
            const entry = this.originalEntry;

            // Show original code
            $('#originalCode').text(entry.entry_code);

            // Populate basic fields
            $('#paymentMode').val(entry.payment);
            $('#fundId').val(entry.fund_id);
            $('#receivedFrom').val(entry.paid_to);
            $('#narration').val(entry.narration ? 'Copy of: ' + entry.narration : 'Copy of receipt ' + entry.entry_code);

            // Render payment details
            this.renderPaymentDetails(entry.payment);

            // Populate payment-specific fields
            if (entry.payment === 'CHEQUE') {
                $('#chequeNo').val(entry.cheque_no);
                $('#chequeDate').val(entry.cheque_date);
                $('#bankName').val(entry.bank_name);
            } else if (entry.payment === 'ONLINE') {
                $('#transactionNo').val(entry.transaction_no);
                $('#transactionDate').val(entry.transaction_date);
            }

            // Find and set debit account (bank/cash)
            const debitItem = entry.entry_items.find(item => item.dc === 'D' && !item.is_discount);
            if (debitItem) {
                $('#debitAccount').val(debitItem.ledger_id);
            }

            // Find and set discount if exists
            const discountItem = entry.entry_items.find(item => item.is_discount);
            if (discountItem) {
                $('#discountAmount').val(discountItem.amount);
                $('#discountLedger').val(discountItem.ledger_id);
            }

            // Populate credit items
            const creditItems = entry.entry_items.filter(item => item.dc === 'C');
            creditItems.forEach((item, index) => {
                this.addReceiptRow(item);
            });

            // Calculate totals
            this.calculateTotals();
        },

        loadMasterData: function () {
            const self = this;

            // Load all master data in parallel
            $.when(
                TempleAPI.get('/accounts/funds'),
                TempleAPI.get('/accounts/ledgers/type/bank-accounts'),
                TempleAPI.get('/accounts/ledgers/type/normal')
            ).done(function (fundsResp, bankResp, creditResp) {
            // Process funds
if (fundsResp && fundsResp.success) {
    self.funds = fundsResp.data;
    const fundOptions = fundsResp.data.map(fund =>
        `<option value="${fund.id}">${fund.name} (${fund.code})</option>`
    ).join('');
    $('#fundId').append(fundOptions);
} else {
    console.error('Funds response is invalid:', fundsResp);
}

// Bank ledgers
if (bankResp && bankResp.success) {
    self.bankLedgers = bankResp.data;
    const bankOptions = bankResp.data.map(ledger =>
        `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
    ).join('');
    $('#debitAccount').append(bankOptions);
}

// Credit ledgers
if (creditResp && creditResp.success) {
    self.creditLedgers = creditResp.data;
    const discountOptions = creditResp.data.map(ledger =>
        `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
    ).join('');
    $('#discountLedger').append(discountOptions);
}

                // Generate new entry code
                self.generateEntryCode();
            });
        },

        generateEntryCode: function () {
            const today = new Date().toISOString().slice(0, 10);

            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'REC',
                entrytype_id: 1,
                date: today
            })
                .done(function (response) {
                    if (response.success) {
                        $('#entryCode').val(response.data.code);
                    }
                });
        },

        addReceiptRow: function (itemData) {
            const rowId = ++this.itemCounter;
            const options = this.creditLedgers.map(ledger =>
                `<option value="${ledger.id}" ${itemData && itemData.ledger_id == ledger.id ? 'selected' : ''}>
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
                               data-row="${rowId}" min="0.01" step="0.01" required
                               value="${itemData ? itemData.amount : ''}">
                    </td>
                    <td>
                        <input type="text" class="form-control details" 
                               data-row="${rowId}" value="${itemData ? itemData.details || '' : ''}">
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
                ledger_id: itemData ? itemData.ledger_id : null,
                amount: itemData ? parseFloat(itemData.amount) : 0,
                details: itemData ? itemData.details : ''
            });
        },

        renderPaymentDetails: function (mode) {
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

        calculateTotals: function () {
            let total = 0;

            this.receiptItems.forEach(item => {
                total += item.amount;
            });

            const discount = parseFloat($('#discountAmount').val()) || 0;
            const netAmount = total - discount;

            $('#totalAmount').text(TempleCore.formatCurrency(total));
            $('#netAmount').text(TempleCore.formatCurrency(netAmount));
        },

        bindEvents: function () {
            const self = this;

            // Date change
            $('#entryDate').on('change', function () {
                self.generateEntryCode();
            });

            // Payment mode change
            $('#paymentMode').on('change', function () {
                self.renderPaymentDetails($(this).val());
            });

            // Add row
            $('#btnAddRow').on('click', function () {
                self.addReceiptRow();
            });

            // Remove row
            $(document).on('click', '.remove-row', function () {
                const rowId = $(this).data('row');
                if ($('#receiptItemsBody tr').length > 1) {
                    $(`tr[data-row-id="${rowId}"]`).remove();
                    self.receiptItems = self.receiptItems.filter(item => item.id !== rowId);
                    self.calculateTotals();
                } else {
                    TempleCore.showToast('At least one item is required', 'warning');
                }
            });

            // Amount/discount changes
            $(document).on('input', '.amount, #discountAmount', function () {
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
            $(document).on('change', '.ledger-select', function () {
                const rowId = $(this).data('row');
                const item = self.receiptItems.find(i => i.id === rowId);
                if (item) {
                    item.ledger_id = $(this).val();
                }
            });

            // Details change
            $(document).on('input', '.details', function () {
                const rowId = $(this).data('row');
                const item = self.receiptItems.find(i => i.id === rowId);
                if (item) {
                    item.details = $(this).val();
                }
            });

            // Form submission
            $('#receiptForm').on('submit', function (e) {
                e.preventDefault();
                self.saveReceipt();
            });
        },

        saveReceipt: function () {
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
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Receipt copy created successfully', 'success');
                        TempleRouter.navigate('entries');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create receipt', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'An error occurred', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        validateForm: function () {
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
        }
    };

})(jQuery, window);