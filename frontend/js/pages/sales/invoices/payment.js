// js/pages/sales/invoices/payment.js
// Sales Invoice Payment Processing

(function ($, window) {
    'use strict';

    window.SalesInvoicePayment = {
        init: function (params) {
            this.invoiceId = params?.id;
            this.render();
            if (this.invoiceId) {
                this.loadInvoice(this.invoiceId);
            } else {
                this.loadPendingInvoices();
            }
            this.loadPaymentModes();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4>Sales Invoice Payment</h4>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" onclick="window.history.back()">Back</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <form id="paymentForm">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Select Invoice</label>
                                            <select class="form-select" id="invoiceSelect" ${this.invoiceId ? 'disabled' : ''}>
                                                <option value="">Select Invoice...</option>
                                            </select>
                                        </div>
                                        
                                        <div id="invoiceDetails" style="display: none;" class="card bg-light mb-3">
                                            <div class="card-body">
                                                <h6>Invoice Details</h6>
                                                <div class="row">
                                                    <div class="col-6">Invoice #: <strong id="dispInvoiceNo"></strong></div>
                                                    <div class="col-6">Date: <span id="dispDate"></span></div>
                                                    <div class="col-6">Customer: <span id="dispCustomer"></span></div>
                                                    <div class="col-6">Total: <strong id="dispTotal"></strong></div>
                                                    <div class="col-6">Paid: <span id="dispPaid"></span></div>
                                                    <div class="col-6">Balance: <strong id="dispBalance" class="text-danger"></strong></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                                <input type="date" class="form-control" id="paymentDate" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                                <select class="form-select" id="paymentMode" required>
                                                    <option value="">Select Mode</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Amount <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <span class="input-group-text currency-symbol">$</span>
                                                <input type="number" class="form-control" id="paymentAmount" step="0.01" min="0.01" required>
                                            </div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Reference Number</label>
                                            <input type="text" class="form-control" id="referenceNumber" placeholder="Cheque/Transaction No">
                                        </div>

                                        <div id="bankDetails" style="display: none;">
                                            <div class="row mb-3">
                                                <div class="col-md-6">
                                                    <label class="form-label">Bank Name</label>
                                                    <input type="text" class="form-control" id="bankName">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Bank Branch</label>
                                                    <input type="text" class="form-control" id="bankBranch">
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label">Cheque Date</label>
                                                <input type="date" class="form-control" id="chequeDate">
                                            </div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Notes</label>
                                            <textarea class="form-control" id="notes" rows="2"></textarea>
                                        </div>

                                        <div class="text-end">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="bi bi-check-circle"></i> Process Payment
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
            $('#paymentDate').val(new Date().toISOString().split('T')[0]);

            const currency = TempleCore.getCurrency();
            $('.currency-symbol').text(currency);
        },

        loadPendingInvoices: function () {
            const self = this;
            // Assuming this endpoint returns pending sales invoices
            TempleAPI.get('/sales/invoices?payment_status=UNPAID,PARTIAL')
                .done(function (response) {
                    if (response.success && response.data) {
                        const invoices = response.data.data || response.data;
                        let options = '<option value="">Select Invoice...</option>';
                        invoices.forEach(inv => {
                            options += `<option value="${inv.id}">${inv.invoice_number} - ${inv.customer?.name || 'Unknown'} (${inv.balance_amount})</option>`;
                        });
                        $('#invoiceSelect').html(options);

                        // Initialize select2
                        $('#invoiceSelect').select2({
                            theme: 'bootstrap-5',
                            width: '100%'
                        });
                    }
                });
        },

        loadInvoice: function (id) {
            const self = this;
            TempleAPI.get('/sales/invoices/' + id)
                .done(function (response) {
                    if (response.success) {
                        const data = response.data;

                        // If dropdown exists, set it
                        if ($('#invoiceSelect option[value="' + id + '"]').length === 0) {
                            $('#invoiceSelect').append(new Option(`${data.invoice_number}`, data.id, true, true));
                        } else {
                            $('#invoiceSelect').val(data.id).trigger('change');
                        }

                        self.displayInvoiceDetails(data);
                    }
                });
        },

        loadPaymentModes: function () {
            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Mode</option>';
                        let modes = response.data.data || response.data || [];

                        modes.forEach(mode => {
                            if (mode.status == 1) {
                                options += `<option value="${mode.id}">${mode.name}</option>`;
                            }
                        });
                        $('#paymentMode').html(options);
                    }
                });
        },

        displayInvoiceDetails: function (data) {
            const currency = TempleCore.getCurrency();

            $('#dispInvoiceNo').text(data.invoice_number);
            $('#dispDate').text(TempleCore.formatDate(data.invoice_date));
            $('#dispCustomer').text(data.customer?.name || data.devotee?.english_name || 'N/A');
            $('#dispTotal').text(currency + parseFloat(data.total_amount).toFixed(2));
            $('#dispPaid').text(currency + parseFloat(data.paid_amount).toFixed(2));
            $('#dispBalance').text(currency + parseFloat(data.balance_amount).toFixed(2));

            $('#paymentAmount').val(data.balance_amount);
            $('#paymentAmount').attr('max', data.balance_amount);

            $('#invoiceDetails').slideDown();
        },

        bindEvents: function () {
            const self = this;

            $('#invoiceSelect').on('change', function () {
                const id = $(this).val();
                if (id) {
                    self.loadInvoice(id);
                } else {
                    $('#invoiceDetails').slideUp();
                }
            });

            $('#paymentMode').on('change', function () {
                const text = $(this).find('option:selected').text().toLowerCase();
                if (text.includes('cheque') || text.includes('bank')) {
                    $('#bankDetails').slideDown();
                } else {
                    $('#bankDetails').slideUp();
                }
            });

            $('#paymentAmount').on('input', function () {
                const max = parseFloat($(this).attr('max')) || 0;
                const val = parseFloat($(this).val()) || 0;
                if (val > max) {
                    TempleCore.showToast('Amount cannot exceed balance', 'warning');
                    $(this).val(max);
                }
            });

            $('#paymentForm').on('submit', function (e) {
                e.preventDefault();

                const invoiceId = self.invoiceId || $('#invoiceSelect').val();
                if (!invoiceId) {
                    TempleCore.showToast('Please select an invoice', 'error');
                    return;
                }

                const data = {
                    payment_date: $('#paymentDate').val(),
                    payment_mode_id: $('#paymentMode').val(),
                    amount: $('#paymentAmount').val(),
                    reference_number: $('#referenceNumber').val(),
                    bank_name: $('#bankName').val(),
                    bank_branch: $('#bankBranch').val(),
                    cheque_date: $('#chequeDate').val(),
                    notes: $('#notes').val()
                };

                TempleCore.showLoading(true);
                TempleAPI.post(`/sales/invoices/${invoiceId}/payment`, data)
                    .done(function (response) {
                        if (response.success) {
                            TempleCore.showToast('Payment processed successfully', 'success');
                            TempleRouter.navigate('sales/invoices/list');
                        } else {
                            TempleCore.showToast(response.message || 'Payment failed', 'error');
                        }
                    })
                    .fail(function (xhr) {
                        TempleCore.showToast(xhr.responseJSON?.message || 'Payment error', 'error');
                    })
                    .always(function () {
                        TempleCore.showLoading(false);
                    });
            });
        }
    };
})(jQuery, window);
