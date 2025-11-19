// js/pages/entries/payment/create.js
(function($, window) {
    'use strict';
    
    window.EntriesPaymentCreatePage = {
        bankLedgers: [],
        debitLedgers: [],
        funds: [],
        paymentItems: [],
        itemCounter: 0,
        
        init: function() {
            // CHANGE 1: Reset state on initialization
            this.resetState();
            
            this.render();
            this.loadMasterData();
            this.bindEvents();
            this.generateEntryCode();
            this.showApprovalInfo();
        },
        
        // CHANGE 2: Add reset state function
        resetState: function() {
            this.bankLedgers = [];
            this.debitLedgers = [];
            this.funds = [];
            this.paymentItems = [];
            this.itemCounter = 0;
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-credit-card"></i> Create Payment
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
                            <div class="card-header bg-danger text-white">
                                <h5 class="mb-0">Payment Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="entryDate" required 
                                               value="${new Date().toISOString().split('T')[0]}">
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
                                               placeholder="Name of person/vendor">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Credit Account (Bank/Cash) <span class="text-danger">*</span></label>
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
                                                <th>Debit Account</th>
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
                                            <i class="bi bi-check-circle"></i> Save Payment
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
            
            // CHANGE 3: Synchronize data loading
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
                        
                        // CHANGE 4: Clear existing options first
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
                        
                        // CHANGE 5: Clear existing options first
                        $('#creditAccount').find('option:not(:first)').remove();
                        
                        const options = response.data.map(ledger => 
                            `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
                        ).join('');
                        $('#creditAccount').append(options);
                    }
                })
                .fail(function() {
                    console.error('Failed to load bank ledgers');
                })
                .always(checkAllLoaded);
            
            // Load Debit Ledgers (Expense accounts)
            TempleAPI.get('/accounts/ledgers/type/normal')
                .done(function(response) {
                    if (response.success) {
                        self.debitLedgers = response.data;
                        console.log('Debit ledgers loaded:', self.debitLedgers);
                        // CHANGE 6: Removed non-existent discount ledger code
                        // No discount ledger in payment form
                    }
                })
                .fail(function() {
                    console.error('Failed to load debit ledgers');
                })
                .always(checkAllLoaded);
        },
        
        generateEntryCode: function() {
            const today = new Date().toISOString().slice(0, 10);
            
            TempleAPI.post('/accounts/entries/generate-code', {
                prefix: 'PAY',
                entrytype_id: 2,
                date: today
            })
            .done(function(response) {
                if (response.success) {
                    $('#entryCode').val(response.data.code);
                }
            });
        },
        
        addDefaultRow: function() {
            // CHANGE 7: Clear existing rows first
            $('#paymentItemsBody').empty();
            this.paymentItems = [];
            this.itemCounter = 0;
            
            this.addPaymentRow();
        },
        
        // CHANGE 8: Renamed to addPaymentRow for consistency
        addPaymentRow: function() {
            const rowId = ++this.itemCounter;
            const options = this.debitLedgers.map(ledger => 
                `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`
            ).join('');
            
            const rowHtml = `
                <tr data-row-id="${rowId}">
                    <td>${rowId}</td>
                    <td>
                        <select class="form-select ledger-select" data-row="${rowId}" required>
                            <option value="">Select Debit Account</option>
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
            
            $('#paymentItemsBody').append(rowHtml);
            this.paymentItems.push({
                id: rowId,
                ledger_id: null,
                amount: 0,
                details: ''
            });
        },
        
        bindEvents: function() {
            const self = this;
            
            // CHANGE 9: Unbind existing events first
            $('#entryDate').off('change');
            $('#paymentMode').off('change');
            $('#btnAddRow').off('click');
            $(document).off('click', '.remove-row');
            $(document).off('input', '.amount');
            $(document).off('change', '.ledger-select');
            $(document).off('input', '.details');
            $('#paymentForm').off('submit');
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
            
            // Amount changes (removed #discountAmount as it doesn't exist)
            $(document).on('input', '.amount', function() {
                const rowId = $(this).data('row');
                const item = self.paymentItems.find(i => i.id === rowId);
                if (item) {
                    item.amount = parseFloat($(this).val()) || 0;
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
            
            // Form submission
            $('#paymentForm').on('submit', function(e) {
                e.preventDefault();
                self.savePayment(false);
            });
            
            // Save and New
            $('#btnSaveAndNew').on('click', function() {
                if (self.validateForm()) {
                    self.savePayment(true);
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
            
            this.paymentItems.forEach(item => {
                total += item.amount;
            });
            
            $('#totalAmount').text(TempleCore.formatCurrency(total));
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
        
        savePayment: function(saveAndNew) {
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
                payment_code: $('#entryCode').val(),
                credit_account: $('#creditAccount').val(),
                fund_id: $('#fundId').val(),
                payment_mode: $('#paymentMode').val(),
                paid_to: $('#paidTo').val(),
                narration: $('#narration').val(),
                items: validItems,
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
            
            TempleAPI.post('/accounts/entries/payment', formData)
                .done(function(response) {
                    if (response.success) {
                        // Check if approval was needed
                        if (response.needs_approval) {
                            // Show approval notification
                            const modalHtml = `
                                <div class="modal fade" id="approvalNoticeModal" tabindex="-1">
                                    <div class="modal-dialog">
                                        <div class="modal-content">
                                            <div class="modal-header bg-info text-white">
                                                <h5 class="modal-title">
                                                    <i class="bi bi-info-circle"></i> Approval Required
                                                </h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <div class="alert alert-info">
                                                    <i class="bi bi-check2-square"></i> 
                                                    Your payment voucher has been created successfully and sent for approval.
                                                </div>
                                                <p><strong>Payment No:</strong> ${response.data.entry_code}</p>
                                                <p><strong>Amount:</strong> ${TempleCore.formatCurrency(response.data.dr_total)}</p>
                                                <p><strong>Status:</strong> <span class="badge bg-warning text-dark">Pending Approval</span></p>
                                                <hr>
                                                <p class="text-muted">
                                                    This payment exceeds the approval threshold and requires authorization 
                                                    from designated approvers before it can be processed.
                                                </p>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                <button type="button" class="btn btn-primary" id="viewApprovals">
                                                    View Approvals
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                            
                            $('body').append(modalHtml);
                            const modal = new bootstrap.Modal(document.getElementById('approvalNoticeModal'));
                            modal.show();
                            
                            $('#viewApprovals').on('click', function() {
                                modal.hide();
                                TempleRouter.navigate('payment-approvals');
                            });
                            
                            $('#approvalNoticeModal').on('hidden.bs.modal', function() {
                                $(this).remove();
                                if (saveAndNew) {
                                    location.reload();
                                } else {
                                    TempleRouter.navigate('entries');
                                }
                            });
                            
                        } else {
                            // Normal success without approval
                            TempleCore.showToast('Payment created successfully', 'success');
                            
                            if (saveAndNew) {
                                location.reload();
                            } else {
                                TempleRouter.navigate('entries');
                            }
                        }
                    }
                })
                .fail(function(xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'An error occurred', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        showApprovalInfo: function() {
            TempleAPI.get('/settings', { type: 'ACCOUNTS' })
                .done(function(response) {
                    if (response.success && response.data && response.data.fields) {
                        const settings = response.data.fields;
                        
                        // Find approval settings
                        const isApprovalEnabled = settings.find(s => s.key === 'is_approval_payment');
                        const minAmount = settings.find(s => s.key === 'minimum_payment_approval_amount');
                        
                        if (isApprovalEnabled && isApprovalEnabled.value === '1' && minAmount) {
                            // Show info message
                            const infoHtml = `
                                <div class="alert alert-info alert-dismissible fade show mb-3" role="alert">
                                    <i class="bi bi-info-circle"></i> 
                                    <strong>Note:</strong> Payments of ${TempleCore.formatCurrency(minAmount.value)} 
                                    and above require approval before processing.
                                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                                </div>
                            `;
                            
                            $('#paymentForm').prepend(infoHtml);
                        }
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load approval settings');
                });
        }
    };
    
})(jQuery, window);