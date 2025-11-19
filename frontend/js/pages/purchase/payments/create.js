// js/pages/purchase/payments/create.js
// Create new purchase payment - Fixed to handle API properly

(function ($, window) {
    'use strict';

    window.PurchasePaymentsCreatePage = {
        selectedInvoices: [],
        paymentModes: [],

        init: function () {
            this.render();
            this.loadInitialData();
            this.bindEvents();
            this.setDefaults();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Create Payment</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/payments'); return false;">Payments</a></li>
                                    <li class="breadcrumb-item active">Create</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" onclick="TempleRouter.navigate('purchase/payments'); return false;">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <form id="paymentForm">
                        <div class="row">
                            <!-- Left Column -->
                            <div class="col-md-8">
                                <!-- Payment Information -->
                                <div class="card mb-4">
                                    <div class="card-header bg-primary text-white">
                                        <h6 class="mb-0">Payment Information</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                                <input type="date" class="form-control" id="paymentDate" required>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                                <select class="form-select" id="supplierId" required>
                                                    <option value="">Select Supplier</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                                <select class="form-select" id="paymentModeId" required>
                                                    <option value="">Select Payment Mode</option>
                                                </select>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Reference Number</label>
                                                <input type="text" class="form-control" id="referenceNumber" placeholder="Cheque/Transaction #">
                                            </div>
                                        </div>
                                        
                                        <!-- Bank Details (conditional) -->
                                        <div id="bankDetailsSection" style="display: none;">
                                            <hr>
                                            <h6 class="mb-3">Bank/Cheque Details</h6>
                                            <div class="row">
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Bank Name</label>
                                                    <input type="text" class="form-control" id="bankName">
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Bank Branch</label>
                                                    <input type="text" class="form-control" id="bankBranch">
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Cheque Date</label>
                                                    <input type="date" class="form-control" id="chequeDate">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">Notes</label>
                                            <textarea class="form-control" id="notes" rows="2" placeholder="Additional notes..."></textarea>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Outstanding Invoices -->
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Outstanding Invoices</h6>
                                    </div>
                                    <div class="card-body">
                                        <div id="invoicesLoading" class="text-center py-3">
                                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <p class="mt-2">Select a supplier to load outstanding invoices</p>
                                        </div>
                                        
                                        <div id="invoicesContainer" style="display: none;">
                                            <div class="table-responsive">
                                                <table class="table table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>
                                                                <input type="checkbox" class="form-check-input" id="selectAllInvoices">
                                                            </th>
                                                            <th>Invoice #</th>
                                                            <th>Date</th>
                                                            <th>Due Date</th>
                                                            <th class="text-end">Invoice Amount</th>
                                                            <th class="text-end">Paid Amount</th>
                                                            <th class="text-end">Balance</th>
                                                            <th class="text-end">Payment Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="invoicesTableBody">
                                                        <tr>
                                                            <td colspan="8" class="text-center">No outstanding invoices</td>
                                                        </tr>
                                                    </tbody>
                                                    <tfoot>
                                                        <tr class="table-light">
                                                            <th colspan="7" class="text-end">Total Payment:</th>
                                                            <th class="text-end" id="totalPaymentAmount">0.00</th>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                        
                                        <div id="noInvoicesMessage" class="alert alert-info" style="display: none;">
                                            <i class="bi bi-info-circle"></i> No outstanding invoices found for this supplier.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right Column -->
                            <div class="col-md-4">
                                <!-- Payment Summary -->
                                <div class="card mb-4">
                                    <div class="card-header bg-success text-white">
                                        <h6 class="mb-0">Payment Summary</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <label class="text-muted">Supplier:</label>
                                            <p class="mb-0" id="summarySupplier">Not selected</p>
                                        </div>
                                        <div class="mb-3">
                                            <label class="text-muted">Payment Mode:</label>
                                            <p class="mb-0" id="summaryMode">Not selected</p>
                                        </div>
                                        <div class="mb-3">
                                            <label class="text-muted">Selected Invoices:</label>
                                            <p class="mb-0" id="summaryInvoices">0</p>
                                        </div>
                                        <hr>
                                        <div class="d-flex justify-content-between mb-2">
                                            <strong>Total Amount:</strong>
                                            <strong class="text-success" id="summaryTotal">0.00</strong>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Quick Actions -->
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Quick Actions</h6>
                                    </div>
                                    <div class="card-body">
                                        <button type="button" class="btn btn-sm btn-outline-primary w-100 mb-2" id="btnPayAllInvoices">
                                            <i class="bi bi-check-all"></i> Pay All Invoices
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-warning w-100 mb-2" id="btnClearSelection">
                                            <i class="bi bi-x-square"></i> Clear Selection
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-info w-100" id="btnSupplierStatement">
                                            <i class="bi bi-file-text"></i> View Statement
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Action Buttons -->
                                <div class="d-grid gap-2 mt-4">
                                    <button type="submit" class="btn btn-primary btn-lg">
                                        <i class="bi bi-check-circle"></i> Create Payment
                                    </button>
                                    <button type="button" class="btn btn-success" id="btnSaveAndNew">
                                        <i class="bi bi-plus-circle"></i> Save & Create Another
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadInitialData: function () {
            const self = this;

            // Load suppliers
            TempleAPI.get('/purchase/suppliers/list')
                .done(function (response) {
                    if (response.success && response.data) {
                        let options = '<option value="">Select Supplier</option>';
                        
                        if (Array.isArray(response.data)) {
                            $.each(response.data, function (index, supplier) {
                                if (supplier && supplier.id && supplier.name) {
                                    const balance = supplier.current_balance || 0;
                                    const outstanding = balance > 0 ? 
                                        ` (${TempleCore.formatCurrency(balance)})` : '';
                                    
                                    options += `<option value="${supplier.id}" data-balance="${balance}">
                                        ${supplier.name}${outstanding}
                                    </option>`;
                                }
                            });
                        }
                        
                        $('#supplierId').html(options);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load suppliers', 'error');
                });

            // Load payment modes
            TempleAPI.get('/masters/payment-modes/active')
                .done(function (response) {
                    if (response.success) {
                        const paymentModes = response.data.data ? response.data.data : response.data;
                        self.paymentModes = paymentModes;
                        
                        let options = '<option value="">Select Payment Mode</option>';
                        
                        if (Array.isArray(paymentModes)) {
                            $.each(paymentModes, function (index, mode) {
                                if (mode && mode.id && mode.name) {
                                    options += `<option value="${mode.id}" data-name="${mode.name}">${mode.name}</option>`;
                                }
                            });
                        }
                        
                        $('#paymentModeId').html(options);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load payment modes', 'error');
                });
        },

        setDefaults: function () {
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);
        },

        bindEvents: function () {
            const self = this;

            // Supplier change
            $('#supplierId').on('change', function () {
                const supplierId = $(this).val();
                const supplierName = $(this).find('option:selected').text();
                
                if (supplierId) {
                    $('#summarySupplier').text(supplierName);
                    self.loadSupplierInvoices(supplierId);
                } else {
                    $('#summarySupplier').text('Not selected');
                    $('#invoicesContainer').hide();
                    $('#invoicesLoading').show();
                    self.selectedInvoices = [];
                }
            });

            // Payment mode change
            $('#paymentModeId').on('change', function () {
                const modeName = $(this).find('option:selected').data('name');
                $('#summaryMode').text(modeName || 'Not selected');
                
                // Show bank details for cheque/bank payments
                if (modeName && (modeName.toLowerCase().includes('cheque') || 
                    modeName.toLowerCase().includes('bank'))) {
                    $('#bankDetailsSection').show();
                } else {
                    $('#bankDetailsSection').hide();
                }
            });

            // Select all invoices
            $('#selectAllInvoices').on('change', function () {
                const isChecked = $(this).prop('checked');
                $('.invoice-checkbox').prop('checked', isChecked);
                
                if (isChecked) {
                    self.payAllInvoices();
                } else {
                    self.clearAllPayments();
                }
            });

            // Individual invoice selection
            $(document).on('change', '.invoice-checkbox', function () {
                const invoiceId = $(this).val();
                const isChecked = $(this).prop('checked');
                
                if (isChecked) {
                    const balance = parseFloat($(this).data('balance')) || 0;
                    $(`#paymentAmount_${invoiceId}`).val(balance.toFixed(2)).prop('readonly', false);
                    
                    // Add to selected invoices
                    if (!self.selectedInvoices.includes(invoiceId)) {
                        self.selectedInvoices.push(invoiceId);
                    }
                } else {
                    $(`#paymentAmount_${invoiceId}`).val('0.00').prop('readonly', true);
                    
                    // Remove from selected invoices
                    self.selectedInvoices = self.selectedInvoices.filter(id => id !== invoiceId);
                }
                
                self.calculateTotalPayment();
            });

            // Payment amount change
            $(document).on('input', '.payment-amount-input', function () {
                const maxAmount = parseFloat($(this).data('max')) || 0;
                const enteredAmount = parseFloat($(this).val()) || 0;
                
                if (enteredAmount > maxAmount) {
                    $(this).val(maxAmount.toFixed(2));
                    TempleCore.showToast('Payment amount cannot exceed invoice balance', 'warning');
                }
                
                self.calculateTotalPayment();
            });

            // Pay all invoices
            $('#btnPayAllInvoices').on('click', function () {
                $('.invoice-checkbox').prop('checked', true);
                $('#selectAllInvoices').prop('checked', true);
                self.payAllInvoices();
            });

            // Clear selection  
            $('#btnClearSelection').on('click', function () {
                $('.invoice-checkbox').prop('checked', false);
                $('#selectAllInvoices').prop('checked', false);
                self.clearAllPayments();
            });

            // View supplier statement
            $('#btnSupplierStatement').on('click', function () {
                const supplierId = $('#supplierId').val();
                if (supplierId) {
                    window.open(TempleAPI.getBaseUrl() + '/purchase/suppliers/' + supplierId + '/statement', '_blank');
                } else {
                    TempleCore.showToast('Please select a supplier first', 'warning');
                }
            });

            // Form submit
            $('#paymentForm').on('submit', function (e) {
                e.preventDefault();
                self.savePayment(false);
            });

            // Save and new
            $('#btnSaveAndNew').on('click', function () {
                if ($('#paymentForm')[0].checkValidity()) {
                    self.savePayment(true);
                } else {
                    $('#paymentForm')[0].reportValidity();
                }
            });
        },

        loadSupplierInvoices: function (supplierId) {
            const self = this;
       
            $('#invoicesLoading').show();
            $('#invoicesContainer, #noInvoicesMessage').hide();
            
            // Alternative: Use the general invoices endpoint with filters
            TempleAPI.get('/purchase/invoices', {
                supplier_id: supplierId,
                status: 'POSTED',
                payment_status: ['UNPAID', 'PARTIAL']
            })
            .done(function (response) {
                if (response.success) {
                    let invoices = [];
                    
                    // Handle paginated response
                    if (response.data && response.data.data) {
                        invoices = response.data.data;
                    } else if (response.data) {
                        invoices = Array.isArray(response.data) ? response.data : [];
                    }
                    
                    // Filter for invoices with balance
                    const outstandingInvoices = invoices.filter(invoice => {
                        const balance = parseFloat(invoice.balance_amount || 
                            (invoice.total_amount - (invoice.paid_amount || 0)));
                        return balance > 0;
                    });
                    
                    if (outstandingInvoices.length > 0) {
                        self.displayInvoices(outstandingInvoices);
                        $('#invoicesContainer').show();
                    } else {
                        $('#noInvoicesMessage').show();
                    }
                    $('#invoicesLoading').hide();
                }
            })
            .fail(function (xhr) {
                // If the specific endpoint fails, try a more general approach
                console.warn('Failed to load outstanding invoices, trying alternative method');
                
                // Alternative: Get all invoices and filter client-side
                TempleAPI.get('/purchase/invoices')
                    .done(function (response) {
                        if (response.success) {
                            let allInvoices = response.data.data || response.data || [];
                            
                            // Filter for this supplier with outstanding balance
                            const supplierInvoices = allInvoices.filter(invoice => {
                                return invoice.supplier_id === supplierId && 
                                       invoice.status === 'POSTED' &&
                                       (invoice.payment_status === 'UNPAID' || invoice.payment_status === 'PARTIAL');
                            });
                            
                            if (supplierInvoices.length > 0) {
                                self.displayInvoices(supplierInvoices);
                                $('#invoicesContainer').show();
                            } else {
                                $('#noInvoicesMessage').show();
                            }
                        } else {
                            $('#noInvoicesMessage').show();
                        }
                        $('#invoicesLoading').hide();
                    })
                    .fail(function () {
                        TempleCore.showToast('Failed to load invoices', 'error');
                        $('#invoicesLoading').hide();
                        $('#noInvoicesMessage').show();
                    });
            });
        },

        displayInvoices: function (invoices) {
            const currency = TempleCore.getCurrency ? TempleCore.getCurrency() : 'RM ';
            let html = '';
            
            $.each(invoices, function (index, invoice) {
                // Calculate balance if not provided
                const totalAmount = parseFloat(invoice.total_amount) || 0;
                const paidAmount = parseFloat(invoice.paid_amount) || 0;
                const balance = parseFloat(invoice.balance_amount) || (totalAmount - paidAmount);
                
                // Only show invoices with positive balance
                if (balance <= 0) return;
                
                const isOverdue = invoice.payment_due_date && new Date(invoice.payment_due_date) < new Date();
                
                html += `
                    <tr class="${isOverdue ? 'table-warning' : ''}">
                        <td>
                            <input type="checkbox" class="form-check-input invoice-checkbox" 
                                value="${invoice.id}" data-balance="${balance}">
                        </td>
                        <td>
                            <a href="#" onclick="window.open('${TempleAPI.getBaseUrl()}/purchase/invoices/${invoice.id}/view', '_blank'); return false;">
                                ${invoice.invoice_number || 'N/A'}
                            </a>
                            ${isOverdue ? '<span class="badge bg-danger ms-1">Overdue</span>' : ''}
                        </td>
                        <td>${TempleCore.formatDate(invoice.invoice_date)}</td>
                        <td>${invoice.payment_due_date ? TempleCore.formatDate(invoice.payment_due_date) : '-'}</td>
                        <td class="text-end">${currency}${totalAmount.toFixed(2)}</td>
                        <td class="text-end">${currency}${paidAmount.toFixed(2)}</td>
                        <td class="text-end fw-bold">${currency}${balance.toFixed(2)}</td>
                        <td class="text-end">
                            <input type="number" class="form-control form-control-sm payment-amount-input" 
                                id="paymentAmount_${invoice.id}" 
                                data-invoice-id="${invoice.id}"
                                data-max="${balance}"
                                step="0.01" 
                                min="0" 
                                max="${balance}"
                                value="0.00"
                                readonly>
                        </td>
                    </tr>
                `;
            });
            
            if (html === '') {
                html = '<tr><td colspan="8" class="text-center">No outstanding invoices found</td></tr>';
            }
            
            $('#invoicesTableBody').html(html);
        },

        payAllInvoices: function () {
            const self = this;
            self.selectedInvoices = [];
            
            $('.invoice-checkbox:checked').each(function () {
                const balance = parseFloat($(this).data('balance')) || 0;
                const invoiceId = $(this).val();
                $(`#paymentAmount_${invoiceId}`).val(balance.toFixed(2)).prop('readonly', false);
                self.selectedInvoices.push(invoiceId);
            });
            
            this.calculateTotalPayment();
        },

        clearAllPayments: function () {
            $('.payment-amount-input').val('0.00').prop('readonly', true);
            this.selectedInvoices = [];
            this.calculateTotalPayment();
        },

        calculateTotalPayment: function () {
            let total = 0;
            let invoiceCount = 0;
            
            $('.invoice-checkbox:checked').each(function () {
                const invoiceId = $(this).val();
                const amount = parseFloat($(`#paymentAmount_${invoiceId}`).val()) || 0;
                total += amount;
                invoiceCount++;
            });
            
            $('#totalPaymentAmount').text(total.toFixed(2));
            $('#summaryTotal').text(TempleCore.formatCurrency(total));
            $('#summaryInvoices').text(invoiceCount);
        },

        savePayment: function (createAnother) {
            const self = this;
            
            // Validate at least one invoice is selected
            if (self.selectedInvoices.length === 0) {
                TempleCore.showToast('Please select at least one invoice', 'warning');
                return;
            }
            
            // Get the first selected invoice and its payment amount
            const firstInvoiceId = self.selectedInvoices[0];
            const paymentAmount = parseFloat($(`#paymentAmount_${firstInvoiceId}`).val()) || 0;
            
            if (paymentAmount <= 0) {
                TempleCore.showToast('Payment amount must be greater than zero', 'warning');
                return;
            }
            
            // Prepare payment data for single invoice (based on backend validation requirements)
            const paymentData = {
                invoice_id: firstInvoiceId,  // Backend expects a single invoice_id
                payment_date: $('#paymentDate').val(),
                payment_mode_id: $('#paymentModeId').val(),
                amount: paymentAmount,
                reference_number: $('#referenceNumber').val() || null,
                bank_name: $('#bankName').val() || null,
                bank_branch: $('#bankBranch').val() || null,
                cheque_date: $('#chequeDate').val() || null,
                notes: $('#notes').val() || null
            };
            
            TempleCore.showLoading(true);
            
            // Process payments one by one if multiple invoices selected
            const processPayments = async function() {
                let successCount = 0;
                let failedCount = 0;
                
                for (let i = 0; i < self.selectedInvoices.length; i++) {
                    const invoiceId = self.selectedInvoices[i];
                    const amount = parseFloat($(`#paymentAmount_${invoiceId}`).val()) || 0;
                    
                    if (amount <= 0) continue;
                    
                    const currentPayment = {
                        ...paymentData,
                        invoice_id: invoiceId,
                        amount: amount
                    };
                    
                    try {
                        const response = await $.ajax({
                            url: TempleAPI.getBaseUrl() + '/purchase/payments',
                            method: 'POST',
                            headers: TempleAPI.getHeaders(),
                            data: JSON.stringify(currentPayment),
                            contentType: 'application/json'
                        });
                        
                        if (response.success) {
                            successCount++;
                        } else {
                            failedCount++;
                        }
                    } catch (error) {
                        failedCount++;
                        console.error('Payment failed for invoice:', invoiceId, error);
                    }
                }
                
                return { successCount, failedCount };
            };
            
            processPayments()
                .then(result => {
                    if (result.successCount > 0) {
                        const message = result.failedCount > 0 ? 
                            `${result.successCount} payment(s) created successfully, ${result.failedCount} failed` :
                            `${result.successCount} payment(s) created successfully`;
                        
                        TempleCore.showToast(message, result.failedCount > 0 ? 'warning' : 'success');
                        
                        if (createAnother) {
                            $('#paymentForm')[0].reset();
                            self.setDefaults();
                            $('#invoicesContainer, #noInvoicesMessage').hide();
                            $('#invoicesLoading').show();
                            $('#summarySupplier').text('Not selected');
                            $('#summaryMode').text('Not selected');
                            $('#summaryInvoices').text('0');
                            $('#summaryTotal').text('0.00');
                            self.selectedInvoices = [];
                        } else {
                            TempleRouter.navigate('purchase/payments');
                        }
                    } else {
                        TempleCore.showToast('Failed to create payments', 'error');
                    }
                })
                .catch(error => {
                    TempleCore.showToast('Failed to create payment', 'error');
                    console.error('Payment processing error:', error);
                })
                .finally(() => {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);