// js/pages/purchase/requests/bulk-convert.js
// Improved Bulk Convert Purchase Requests to Purchase Orders

(function ($, window) {
    'use strict';

    window.PurchaseRequestsBulkConvertPage = {
        selectedIds: [],
        requests: [],
        suppliers: [],
        taxRates: [],
        
        init: function () {
            // Get selected IDs and PR data from session storage
            const storedIds = sessionStorage.getItem('bulk_convert_ids');
            const storedPRs = sessionStorage.getItem('bulk_convert_prs');
            
            if (!storedIds || !storedPRs) {
                TempleCore.showToast('No purchase requests selected', 'warning');
                TempleRouter.navigate('purchase/requests');
                return;
            }
            
            this.selectedIds = JSON.parse(storedIds);
            this.requests = JSON.parse(storedPRs);
            
            this.render();
            this.loadSuppliers();
            this.loadTaxRates();
            this.bindEvents();
        },

        render: function () {
            const currencySymbol = TempleCore.getCurrency();
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <h4 class="page-title">Bulk Convert to Purchase Orders</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/requests'); return false;">Purchase Requests</a></li>
                                    <li class="breadcrumb-item active">Bulk Convert</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-secondary" onclick="PurchaseRequestsBulkConvertPage.cancel()">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                        </div>
                    </div>

                    <!-- Info Alert -->
                    <div class="alert alert-info mb-4">
                        <i class="bi bi-info-circle"></i> 
                        Converting <strong>${this.requests.length} approved purchase request(s)</strong> to purchase orders.
                        Please select suppliers and enter pricing information for each request.
                    </div>

                    <!-- Bulk Actions Bar -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6>Quick Actions</h6>
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="form-label">Set All Suppliers</label>
                                    <select class="form-select" id="bulkSupplier">
                                        <option value="">Select Supplier</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Apply Tax to All</label>
                                    <select class="form-select" id="bulkTax">
                                        <option value="">No Tax</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Markup %</label>
                                    <input type="number" class="form-control" id="bulkMarkup" 
                                           placeholder="e.g., 10" min="0" max="100">
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-primary btn-sm me-2" onclick="PurchaseRequestsBulkConvertPage.applyBulkSettings()">
                                        <i class="bi bi-check-all"></i> Apply to All
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="PurchaseRequestsBulkConvertPage.autoPricing()">
                                        <i class="bi bi-magic"></i> Auto-Price
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Selected Requests -->
                    <div id="requestsContainer">
                        ${this.renderRequests()}
                    </div>

                    <!-- Summary Section -->
                    <div class="card mt-4">
                        <div class="card-body">
                            <h6>Conversion Summary</h6>
                            <div class="row">
                                <div class="col-md-3">
                                    <strong>Total PRs:</strong> <span id="totalPRs">${this.requests.length}</span>
                                </div>
                                <div class="col-md-3">
                                    <strong>Ready to Convert:</strong> <span id="readyCount" class="text-success">0</span>
                                </div>
                                <div class="col-md-3">
                                    <strong>Missing Info:</strong> <span id="missingCount" class="text-warning">${this.requests.length}</span>
                                </div>
                                <div class="col-md-3">
                                    <strong>Est. Total:</strong> ${currencySymbol} <span id="grandTotal">0.00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="row mt-4">
                        <div class="col-md-12">
                            <hr>
                            <div class="d-flex justify-content-between">
                                <button class="btn btn-secondary" onclick="PurchaseRequestsBulkConvertPage.cancel()">
                                    <i class="bi bi-arrow-left"></i> Back to List
                                </button>
                                <div>
                                    <button class="btn btn-success me-2" id="btnValidate" onclick="PurchaseRequestsBulkConvertPage.validateAll()">
                                        <i class="bi bi-check-circle"></i> Validate All
                                    </button>
                                    <button class="btn btn-primary" id="btnConvertAll" onclick="PurchaseRequestsBulkConvertPage.convertAll()">
                                        <i class="bi bi-cart-check"></i> Convert All to PO
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom Styles -->
                <style>
                    .request-card {
                        border-left: 3px solid #007bff;
                        transition: all 0.3s ease;
                        margin-bottom: 20px;
                    }
                    .request-card.ready {
                        border-left-color: #28a745;
                    }
                    .request-card.error {
                        border-left-color: #dc3545;
                    }
                    .item-row {
                        border-bottom: 1px solid #e0e0e0;
                        padding: 10px 0;
                    }
                    .item-row:last-child {
                        border-bottom: none;
                    }
                    .validation-error {
                        color: #dc3545;
                        font-size: 0.875rem;
                        margin-top: 5px;
                    }
                    .validation-success {
                        color: #28a745;
                        font-size: 0.875rem;
                        margin-top: 5px;
                    }
                </style>
            `;

            $('#page-container').html(html);
        },

        renderRequests: function () {
            const self = this;
            let html = '';

            $.each(this.requests, function (index, request) {
                html += self.generateRequestCard(request, index);
            });

            return html || '<div class="alert alert-warning">No valid requests to convert</div>';
        },

        generateRequestCard: function (request, index) {
            let itemsHtml = '';
            let totalAmount = 0;
      const currencySymbol = TempleCore.getCurrency();
            $.each(request.items || [], function (itemIndex, item) {
                const itemName = item.product?.name || item.service?.name || item.description || 'Item';
                const quantity = item.quantity || 0;
                const uomName = item.uom?.name || 'Unit';
          
                itemsHtml += `
                    <div class="item-row" data-item-index="${itemIndex}">
                        <div class="row align-items-center">
                            <div class="col-md-4">
                                <strong>${itemName}</strong>
                                ${item.description ? `<br><small class="text-muted">${item.description}</small>` : ''}
                            </div>
                            <div class="col-md-2">
                                <span class="badge bg-secondary">${quantity} ${uomName}</span>
                            </div>
                            <div class="col-md-2">
                                <input type="number" 
                                       class="form-control form-control-sm price-input" 
                                       data-request-id="${request.id}"
                                       data-item-index="${itemIndex}"
                                       placeholder="Unit Price"
                                       value="${item.estimated_price || ''}"
                                       step="0.01"
                                       min="0"
                                       required>
                            </div>
                            <div class="col-md-2">
                                <select class="form-select form-select-sm tax-select"
                                        data-request-id="${request.id}"
                                        data-item-index="${itemIndex}">
                                    <option value="">No Tax</option>
                                </select>
                            </div>
                            <div class="col-md-2 text-end">
                                <span class="item-total" data-request-id="${request.id}" data-item-index="${itemIndex}">
                                    ${currencySymbol} 0.00
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            });

            return `
                <div class="card request-card" data-request-id="${request.id}" id="pr-${request.id}">
                    <div class="card-header">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <strong>PR Number:</strong> ${request.pr_number}
                                <span class="ms-3 text-muted">
                                    <i class="bi bi-calendar"></i> ${TempleCore.formatDate(request.request_date)}
                                </span>
                            </div>
                            <div class="col-md-4">
                                <select class="form-select form-select-sm supplier-select" 
                                        data-request-id="${request.id}"
                                        required>
                                    <option value="">Select Supplier</option>
                                </select>
                            </div>
                            <div class="col-md-2 text-end">
                                <span class="badge bg-${this.getPriorityColor(request.priority)}">
                                    ${request.priority}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <strong>Purpose:</strong> ${request.purpose || '-'}
                            ${request.required_by_date ? `<span class="ms-3"><strong>Required By:</strong> ${TempleCore.formatDate(request.required_by_date)}</span>` : ''}
                        </div>
                        
                        <h6>Items:</h6>
                        <div class="items-container">
                            ${itemsHtml}
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <input type="text" class="form-control form-control-sm" 
                                       placeholder="Payment Terms (optional)"
                                       data-request-id="${request.id}"
                                       id="payment-terms-${request.id}">
                            </div>
                            <div class="col-md-6 text-end">
                                <strong>Total:</strong> 
                                <span class="request-total h5" data-request-id="${request.id}">
                                    ${currencySymbol} 0.00
                                </span>
                            </div>
                        </div>
                        
                        <div class="validation-message mt-2" id="validation-${request.id}"></div>
                    </div>
                </div>
            `;
        },

        loadSuppliers: function () {
            const self = this;
            
            TempleAPI.get('/purchase/suppliers', { is_active: 1, per_page: 100 })
                .done(function (response) {
                    if (response.success && response.data) {
                        // Handle paginated response
                        self.suppliers = response.data.data || response.data;
                        self.populateSupplierDropdowns();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load suppliers', 'error');
                });
        },

loadTaxRates: function() {
    const self = this;
    
    TempleAPI.get('/masters/tax')
        .done(function(response) {
            if (response.success && response.data) {
                // Handle both paginated and non-paginated responses
                if (response.data.data && Array.isArray(response.data.data)) {
                    // Paginated response
                    self.taxRates = response.data.data;
                } else if (Array.isArray(response.data)) {
                    // Direct array response
                    self.taxRates = response.data;
                } else {
                    console.error('Unexpected tax rates data structure:', response.data);
                    self.taxRates = [];
                }
                
                // ADD THIS LINE - Actually populate the dropdowns!
                self.populateTaxDropdowns();
            } else {
                self.taxRates = [];
            }
        })
        .fail(function() {
            console.error('Failed to load tax rates');
            self.taxRates = [];
        });
},

        populateSupplierDropdowns: function () {
            let options = '<option value="">Select Supplier</option>';
            $.each(this.suppliers, function (i, supplier) {
                if (supplier.is_active) {
                    options += `<option value="${supplier.id}">${supplier.name}</option>`;
                }
            });
            
            $('.supplier-select').html(options);
            $('#bulkSupplier').html(options);
        },

       populateTaxDropdowns: function () {
    let options = '<option value="">No Tax</option>';
    $.each(this.taxRates, function (i, tax) {
        // Check both status and is_active fields
        if (tax.status == 1 || tax.is_active) {
            options += `<option value="${tax.id}" data-rate="${tax.percent}">${tax.name} (${tax.percent}%)</option>`;
        }
    });
    
    $('.tax-select').html(options);
    $('#bulkTax').html(options);
},
        bindEvents: function () {
            const self = this;

            // Price input change
            $(document).on('input', '.price-input', function () {
                self.calculateItemTotal($(this));
                self.calculateRequestTotal($(this).data('request-id'));
                self.updateSummary();
            });

            // Tax select change
            $(document).on('change', '.tax-select', function () {
                const $priceInput = $(this).closest('.item-row').find('.price-input');
                self.calculateItemTotal($priceInput);
                self.calculateRequestTotal($(this).data('request-id'));
                self.updateSummary();
            });

            // Supplier select change
            $(document).on('change', '.supplier-select', function () {
                const requestId = $(this).data('request-id');
                self.validateRequest(requestId);
                self.updateSummary();
            });
        },

        calculateItemTotal: function ($priceInput) {
            const requestId = $priceInput.data('request-id');
            const itemIndex = $priceInput.data('item-index');
            const request = this.requests.find(r => r.id == requestId);
            
            if (!request || !request.items[itemIndex]) return;

            const item = request.items[itemIndex];
            const unitPrice = parseFloat($priceInput.val()) || 0;
            const quantity = item.quantity || 0;
            const $taxSelect = $(`.tax-select[data-request-id="${requestId}"][data-item-index="${itemIndex}"]`);
            const taxRate = parseFloat($taxSelect.find(':selected').data('rate')) || 0;
            
            const subtotal = unitPrice * quantity;
            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;
       const currencySymbol = TempleCore.getCurrency();
const safeTotal = isNaN(total) || total === null ? 0 : total;
$(`.item-total[data-request-id="${requestId}"][data-item-index="${itemIndex}"]`).text(`${currencySymbol}${safeTotal.toFixed(2)}`);

        },

        calculateRequestTotal: function (requestId) {
            let total = 0;
            const currencySymbol = TempleCore.getCurrency();
            $(`.item-total[data-request-id="${requestId}"]`).each(function () {
               const amount = parseFloat($(this).text().replace(`${currencySymbol}`, '')) || 0;

                total += amount;
            });
            
            $(`.request-total[data-request-id="${requestId}"]`).text(`${currencySymbol}` + total.toFixed(2));
        },

        validateRequest: function (requestId) {
            const $card = $(`#pr-${requestId}`);
            const $validationMsg = $(`#validation-${requestId}`);
            const supplierId = $card.find('.supplier-select').val();
            
            let isValid = true;
            let errors = [];

            if (!supplierId) {
                errors.push('Supplier is required');
                isValid = false;
            }

            $card.find('.price-input').each(function () {
                const price = parseFloat($(this).val());
                if (!price || price <= 0) {
                    errors.push('All items must have valid prices');
                    isValid = false;
                    return false; // Break loop
                }
            });

            if (isValid) {
                $card.removeClass('error').addClass('ready');
                $validationMsg.html('<div class="validation-success"><i class="bi bi-check-circle"></i> Ready for conversion</div>');
            } else {
                $card.removeClass('ready').addClass('error');
                $validationMsg.html('<div class="validation-error"><i class="bi bi-exclamation-circle"></i> ' + errors.join(', ') + '</div>');
            }

            return isValid;
        },

        validateAll: function () {
            const self = this;
            let allValid = true;

            $('.request-card').each(function () {
                const requestId = $(this).data('request-id');
                if (!self.validateRequest(requestId)) {
                    allValid = false;
                }
            });

            if (allValid) {
                TempleCore.showToast('All requests are valid and ready for conversion', 'success');
            } else {
                TempleCore.showToast('Some requests have validation errors', 'warning');
            }

            this.updateSummary();
        },

        updateSummary: function () {
            let readyCount = 0;
            let missingCount = 0;
            let grandTotal = 0;

            $('.request-card').each(function () {
                if ($(this).hasClass('ready')) {
                    readyCount++;
                } else {
                    missingCount++;
                }
const currencySymbol = TempleCore.getCurrency();
                const total = parseFloat($(this).find('.request-total').text().replace(`${currencySymbol}`, '')) || 0;
                grandTotal += total;
            });

            $('#readyCount').text(readyCount);
            $('#missingCount').text(missingCount);
            $('#grandTotal').text(grandTotal.toFixed(2));

            // Enable/disable convert button
            $('#btnConvertAll').prop('disabled', readyCount === 0);
        },

        applyBulkSettings: function () {
            const supplierId = $('#bulkSupplier').val();
            const taxId = $('#bulkTax').val();
            const markup = parseFloat($('#bulkMarkup').val()) || 0;

            if (supplierId) {
                $('.supplier-select').val(supplierId).trigger('change');
            }

            if (taxId) {
                $('.tax-select').val(taxId).trigger('change');
            }

            if (markup > 0) {
                $('.price-input').each(function () {
                    const currentPrice = parseFloat($(this).val()) || 0;
                    if (currentPrice > 0) {
                        const newPrice = currentPrice * (1 + markup / 100);
                        $(this).val(newPrice.toFixed(2)).trigger('input');
                    }
                });
            }

            TempleCore.showToast('Bulk settings applied', 'success');
        },

        autoPricing: function () {
            // Set estimated prices or default prices
            $('.price-input').each(function () {
                if (!$(this).val()) {
                    const estimatedPrice = $(this).attr('value') || '10.00';
                    $(this).val(estimatedPrice).trigger('input');
                }
            });

            TempleCore.showToast('Auto-pricing applied to empty fields', 'info');
        },

        convertAll: function () {
            const self = this;
            
            // Validate all first
            this.validateAll();

            const validRequests = [];
            $('.request-card.ready').each(function () {
                const requestId = $(this).data('request-id');
                const request = self.requests.find(r => r.id == requestId);
                if (request) {
                    validRequests.push(self.getConversionData(requestId));
                }
            });

            if (validRequests.length === 0) {
                TempleCore.showToast('No valid requests to convert', 'warning');
                return;
            }

            TempleCore.showConfirm(
                'Convert to Purchase Orders',
                `Are you sure you want to convert ${validRequests.length} request(s) to purchase orders?`,
                function () {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/purchase/requests/bulk-convert', {
                        conversions: validRequests
                    })
                    .done(function (response) {
                        if (response.success) {
                            const msg = `Conversion completed. ${response.data.converted_count} converted, ${response.data.failed_count} failed`;
                            TempleCore.showToast(msg, 'success');
                            
                            // Clear session storage
                            sessionStorage.removeItem('bulk_convert_ids');
                            sessionStorage.removeItem('bulk_convert_prs');
                            
                            // Navigate to PO list after delay
                            setTimeout(function () {
                                TempleRouter.navigate('purchase/orders');
                            }, 2000);
                        } else {
                            TempleCore.showToast(response.message || 'Conversion failed', 'error');
                        }
                    })
                    .fail(function (xhr) {
                        const error = xhr.responseJSON?.message || 'Failed to convert requests';
                        TempleCore.showToast(error, 'error');
                    })
                    .always(function () {
                        TempleCore.showLoading(false);
                    });
                }
            );
        },

        getConversionData: function (requestId) {
            const $card = $(`#pr-${requestId}`);
            const request = this.requests.find(r => r.id == requestId);
            
            if (!request) return null;

            const items = [];
            $card.find('.item-row').each(function (index) {
                const unitPrice = parseFloat($(this).find('.price-input').val()) || 0;
                const taxId = $(this).find('.tax-select').val() || null;
                
                items.push({
                    unit_price: unitPrice,
                    tax_id: taxId,
                    discount_amount: 0
                });
            });

            return {
                pr_id: requestId,
                supplier_id: $card.find('.supplier-select').val(),
                items: items,
                payment_terms: $(`#payment-terms-${requestId}`).val() || null,
                delivery_date: request.required_by_date || null
            };
        },

        getPriorityColor: function (priority) {
            const colors = {
                'LOW': 'secondary',
                'NORMAL': 'primary',
                'HIGH': 'warning',
                'URGENT': 'danger'
            };
            return colors[priority] || 'secondary';
        },

        cancel: function () {
            sessionStorage.removeItem('bulk_convert_ids');
            sessionStorage.removeItem('bulk_convert_prs');
            TempleRouter.navigate('purchase/requests');
        }
    };

})(jQuery, window);