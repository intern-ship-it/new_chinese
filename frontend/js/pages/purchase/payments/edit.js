// js/pages/purchase/payments/edit.js
// Edit purchase payment

(function($, window) {
    'use strict';
    
    window.PaymentsEditPage = {
        paymentId: null,
        currentPayment: null,
        
        init: function(params) {
            this.paymentId = params?.id || this.getPaymentIdFromUrl();
            
            if (!this.paymentId) {
                TempleCore.showToast('Payment ID not provided', 'error');
                TempleRouter.navigate('purchase/payments');
                return;
            }
            
            this.render();
            this.loadPayment();
            this.bindEvents();
        },
        
        getPaymentIdFromUrl: function() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Edit Payment</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/payments'); return false;">Payments</a></li>
                                    <li class="breadcrumb-item active">Edit</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" onclick="TempleRouter.navigate('purchase/payments'); return false;">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading -->
                    <div id="paymentLoading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- Edit Form -->
                    <div id="paymentContent" style="display: none;">
                        <form id="editPaymentForm">
                            <div class="row">
                                <div class="col-md-8">
                                    <!-- Payment Information -->
                                    <div class="card mb-4">
                                        <div class="card-header bg-primary text-white">
                                            <h6 class="mb-0">Payment Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Payment Number</label>
                                                    <input type="text" class="form-control" id="paymentNumber" readonly>
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                                    <input type="date" class="form-control" id="paymentDate" required>
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Status</label>
                                                    <select class="form-select" id="paymentStatus">
                                                        <option value="PENDING">Pending</option>
                                                        <option value="COMPLETED">Completed</option>
                                                        <option value="FAILED">Failed</option>
                                                        <option value="CANCELLED">Cancelled</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Supplier</label>
                                                    <input type="text" class="form-control" id="supplierName" readonly>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Invoice</label>
                                                    <input type="text" class="form-control" id="invoiceNumber" readonly>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                                    <select class="form-select" id="paymentModeId" required>
                                                        <option value="">Select Mode</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Reference Number</label>
                                                    <input type="text" class="form-control" id="referenceNumber">
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Amount <span class="text-danger">*</span></label>
                                                    <input type="number" class="form-control" id="amount" step="0.01" min="0" required>
                                                </div>
                                            </div>
                                            
                                            <!-- Bank Details -->
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
                                                <textarea class="form-control" id="notes" rows="3"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <!-- Original Values -->
                                    <div class="card mb-4">
                                        <div class="card-header">
                                            <h6 class="mb-0">Original Values</h6>
                                        </div>
                                        <div class="card-body">
                                            <p class="mb-2"><small class="text-muted">Original Amount:</small><br>
                                                <span id="originalAmount" class="fw-bold">0.00</span>
                                            </p>
                                            <p class="mb-2"><small class="text-muted">Invoice Balance:</small><br>
                                                <span id="invoiceBalance" class="fw-bold">0.00</span>
                                            </p>
                                            <p class="mb-2"><small class="text-muted">Created By:</small><br>
                                                <span id="createdBy">-</span>
                                            </p>
                                            <p class="mb-0"><small class="text-muted">Created At:</small><br>
                                                <span id="createdAt">-</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <!-- Actions -->
                                    <div class="d-grid gap-2">
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-check-circle"></i> Update Payment
                                        </button>
                                        <button type="button" class="btn btn-info" id="btnViewPayment">
                                            <i class="bi bi-eye"></i> View Details
                                        </button>
                                        <button type="button" class="btn btn-danger" id="btnDeletePayment">
                                            <i class="bi bi-trash"></i> Delete Payment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadPayment: function() {
            const self = this;
            
            TempleAPI.get('/purchase/payments/' + this.paymentId)
                .done(function(response) {
                    if (response.success) {
                        self.currentPayment = response.data;
                        self.populateForm();
                        self.loadPaymentModes();
                        $('#paymentLoading').hide();
                        $('#paymentContent').show();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load payment', 'error');
                        TempleRouter.navigate('purchase/payments');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load payment', 'error');
                    TempleRouter.navigate('purchase/payments');
                });
        },
        
        populateForm: function() {
            const payment = this.currentPayment;
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            // Basic Information
            $('#paymentNumber').val(payment.payment_number);
            $('#paymentDate').val(payment.payment_date);
            $('#paymentStatus').val(payment.status);
            $('#supplierName').val(payment.supplier?.name || '-');
            $('#invoiceNumber').val(payment.invoice?.invoice_number || '-');
            $('#referenceNumber').val(payment.reference_number || '');
            $('#amount').val(payment.amount);
            
            // Bank Details
            $('#bankName').val(payment.bank_name || '');
            $('#bankBranch').val(payment.bank_branch || '');
            $('#chequeDate').val(payment.cheque_date || '');
            
            // Notes
            $('#notes').val(payment.notes || '');
            
            // Original Values
            $('#originalAmount').text(currency + parseFloat(payment.amount).toFixed(2));
            $('#invoiceBalance').text(currency + parseFloat(payment.invoice?.balance_amount || 0).toFixed(2));
            $('#createdBy').text(payment.creator?.name || '-');
            $('#createdAt').text(TempleCore.formatDate(payment.created_at, 'time'));
            
            // Check if payment can be edited
            if (payment.status !== 'PENDING') {
                this.disableEditing();
            }
        },
        
        loadPaymentModes: function() {
            const self = this;
            
            TempleAPI.get('/purchase/masters/payment-modes?status=1')
                .done(function(response) {
                    if (response.success) {
                        let options = '<option value="">Select Mode</option>';
                        $.each(response.data, function(index, mode) {
                            options += `<option value="${mode.id}" data-name="${mode.name}">${mode.name}</option>`;
                        });
                        $('#paymentModeId').html(options);
                        
                        // Set selected mode
                        $('#paymentModeId').val(self.currentPayment.payment_mode_id);
                        
                        // Check if bank details needed
                        const modeName = $('#paymentModeId option:selected').data('name');
                        if (modeName && (modeName.toLowerCase().includes('cheque') || 
                            modeName.toLowerCase().includes('bank'))) {
                            $('#bankDetailsSection').show();
                        }
                    }
                });
        },
        
        disableEditing: function() {
            $('#editPaymentForm :input').prop('disabled', true);
            $('#editPaymentForm button[type="submit"]').hide();
            
            const statusText = this.currentPayment.status === 'COMPLETED' ? 
                'This payment has been completed and cannot be edited.' : 
                'This payment cannot be edited in its current status.';
            
            $('#paymentContent').prepend(`
                <div class="alert alert-warning mb-4">
                    <i class="bi bi-exclamation-triangle"></i> ${statusText}
                </div>`);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Payment mode change
            $('#paymentModeId').on('change', function() {
                const modeName = $(this).find('option:selected').data('name');
                
                if (modeName && (modeName.toLowerCase().includes('cheque') || 
                    modeName.toLowerCase().includes('bank'))) {
                    $('#bankDetailsSection').show();
                } else {
                    $('#bankDetailsSection').hide();
                }
            });
            
            // Form submit
            $('#editPaymentForm').on('submit', function(e) {
                e.preventDefault();
                self.updatePayment();
            });
            
            // View payment
            $('#btnViewPayment').on('click', function() {
                TempleRouter.navigate('purchase/payments/view', { id: self.paymentId });
            });
            
            // Delete payment
            $('#btnDeletePayment').on('click', function() {
                self.deletePayment();
            });
        },
        
        updatePayment: function() {
            const self = this;
            
            const paymentData = {
                payment_date: $('#paymentDate').val(),
                payment_mode_id: $('#paymentModeId').val(),
                reference_number: $('#referenceNumber').val(),
                amount: $('#amount').val(),
                bank_name: $('#bankName').val(),
                bank_branch: $('#bankBranch').val(),
                cheque_date: $('#chequeDate').val(),
                notes: $('#notes').val(),
                status: $('#paymentStatus').val()
            };
            
            TempleCore.showLoading(true);
            
            TempleAPI.put('/purchase/payments/' + this.paymentId, paymentData)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Payment updated successfully', 'success');
                        TempleRouter.navigate('purchase/payments/view', { id: self.paymentId });
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update payment', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to update payment', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        deletePayment: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Delete Payment',
                'Are you sure you want to delete this payment? This action cannot be undone.',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete('/purchase/payments/' + self.paymentId)
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('Payment deleted successfully', 'success');
                                TempleRouter.navigate('purchase/payments');
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete payment', 'error');
                            }
                        })
                        .fail(function() {
                            TempleCore.showToast('Failed to delete payment', 'error');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        }
    };
    
})(jQuery, window);

