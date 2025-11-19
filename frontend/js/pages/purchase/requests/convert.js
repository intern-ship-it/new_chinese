// js/pages/purchase/requests/convert.js

(function ($, window) {
    'use strict';

    window.PurchaseRequestsConvertPage = {
        prId: null,
        prData: null,
        suppliers: [],
        taxRates: [],
        selectedItems: new Set(),
        currentSupplierId: null,

        init: function (params) {
            this.prId = params?.id || this.getPrIdFromUrl();

            if (!this.prId) {
                TempleCore.showToast('Invalid Purchase Request ID', 'error');
                TempleRouter.navigate('purchase/requests');
                return;
            }

            this.render();
            this.loadData();
        },

        getPrIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/');
            const convertIndex = pathParts.indexOf('convert');
            if (convertIndex >= 0 && pathParts[convertIndex + 1]) {
                return pathParts[convertIndex + 1];
            }
            return pathParts[pathParts.length - 1];
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="page-header mb-4">
                        <h3 class="page-title">Convert PR to Purchase Order</h3>
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/requests'); return false;">Purchase Requests</a></li>
                                <li class="breadcrumb-item active">Convert to PO</li>
                            </ol>
                        </nav>
                    </div>
                    
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading purchase request data...</p>
                    </div>
                    
                    <div id="convertFormContent" style="display: none;"></div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadData: function () {
            const self = this;

            $.when(
                this.loadPRDetails(),
                this.loadSuppliers(),
                this.loadTaxRates()
            ).done(function () {
                self.renderForm();
                $('#loadingState').hide();
                $('#convertFormContent').show();
                self.updateItemSelection();
            }).fail(function (error) {
                console.error('Failed to load data:', error);
                TempleCore.showToast('Failed to load required data', 'error');
                TempleRouter.navigate('purchase/requests');
            });
        },

        loadPRDetails: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/purchase/requests/' + this.prId)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.prData = response.data;

                        // Check if all items are already converted
                        // if (self.prData.conversion_stats && self.prData.conversion_stats.is_fully_converted) {
                        //     TempleCore.showToast('All items in this PR have been converted to PO', 'warning');
                        //     TempleRouter.navigate('purchase/requests/view', { id: self.prId });
                        //     deferred.reject();
                        //     return;
                        // }

                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred.promise();
        },

        loadSuppliers: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success && response.data) {
                        if (response.data.data && Array.isArray(response.data.data)) {
                            self.suppliers = response.data.data;
                        } else if (Array.isArray(response.data)) {
                            self.suppliers = response.data;
                        } else {
                            self.suppliers = [];
                        }
                    } else {
                        self.suppliers = [];
                    }
                    deferred.resolve();
                })
                .fail(function () {
                    self.suppliers = [];
                    deferred.resolve();
                });

            return deferred.promise();
        },

        loadTaxRates: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.get('/masters/tax')
                .done(function (response) {
                    if (response.success && response.data) {
                        if (response.data.data && Array.isArray(response.data.data)) {
                            self.taxRates = response.data.data;
                        } else if (Array.isArray(response.data)) {
                            self.taxRates = response.data;
                        } else {
                            self.taxRates = [];
                        }
                    } else {
                        self.taxRates = [];
                    }
                    deferred.resolve();
                })
                .fail(function () {
                    self.taxRates = [];
                    deferred.resolve();
                });

            return deferred.promise();
        },

        renderForm: function () {
            if (!this.prData) {
                TempleCore.showToast('PR data not loaded', 'error');
                return;
            }

            const conversionStats = this.prData.conversion_stats || {};

            const html = `
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">
                                PR Number: <strong>${this.prData.pr_number}</strong>
                            </h5>
                            <div>
                                ${this.renderConversionStatus(conversionStats)}
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <form id="convertPOForm">
                            <!-- Supplier Selection -->
                            <div class="row mb-4">
                              <div class="col-md-6">
        <label class="form-label">Supplier <span class="text-danger">*</span></label>
        <select class="form-select" id="supplier_id" required>
            <option value="">Select Supplier</option>
            ${this.renderSupplierOptions()}
        </select>
        <small class="text-muted">
            Select a supplier. Items will be filtered based on supplier type.
        </small>
        <div id="supplierTypeNotice"></div>
    </div>
                                <div class="col-md-3">
                                    <label class="form-label">Expected Delivery Date</label>
                                    <input type="date" class="form-control" id="delivery_date" 
                                           value="${this.prData.required_by_date || ''}"
                                           min="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Quotation Reference</label>
                                    <input type="text" class="form-control" id="quotation_ref" 
                                           placeholder="Supplier quotation number">
                                </div>
                            </div>
                            
                            <!-- Selection Controls -->
                            <div class="mb-3">
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="selectAll">
                                        <i class="bi bi-check2-square"></i> Select All Available
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" id="deselectAll">
                                        <i class="bi bi-square"></i> Deselect All
                                    </button>
                                </div>
                                <span class="ms-3 text-muted" id="selectionCount">0 items selected</span>
                            </div>
                            
                            <!-- Items Table -->
                            <div class="table-responsive mb-4">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="3%">
                                                <input type="checkbox" class="form-check-input" id="selectAllCheckbox">
                                            </th>
                                            <th width="5%">#</th>
                                            <th width="10%">Type</th>
                                            <th width="25%">Item Description</th>
                                            <th width="8%">Qty</th>
                                            <th width="8%">UOM</th>
                                            <th width="10%">Unit Price <span class="text-danger">*</span></th>
                                            <th width="10%">Tax</th>
                                            <th width="8%">Discount</th>
                                            <th width="8%">Total</th>
                                            <th width="5%">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="itemsTableBody">
                                        ${this.renderItems()}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="9" class="text-end"><strong>Subtotal:</strong></td>
                                            <td class="text-end" colspan="2">
                                                <strong>RM <span id="subtotal">0.00</span></strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="9" class="text-end"><strong>Total Tax:</strong></td>
                                            <td class="text-end" colspan="2">
                                                <strong>RM <span id="totalTax">0.00</span></strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="9" class="text-end"><strong>Total Discount:</strong></td>
                                            <td class="text-end" colspan="2">
                                                <strong>RM <span id="totalDiscount">0.00</span></strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="9" class="text-end">
                                                <strong>Additional Charges:</strong>
                                            </td>
                                            <td colspan="2">
                                                <input type="number" class="form-control form-control-sm" 
                                                       id="additionalCharges" value="0" min="0" step="0.01">
                                            </td>
                                        </tr>
                                        <tr class="table-primary">
                                            <td colspan="9" class="text-end"><strong>Grand Total:</strong></td>
                                            <td class="text-end" colspan="2">
                                                <strong>RM <span id="grandTotal">0.00</span></strong>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            <!-- Terms and Notes -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <label class="form-label">Payment Terms</label>
                                    <textarea class="form-control" id="payment_terms" rows="3"
                                              placeholder="e.g., Net 30 days, 2% discount for early payment"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Terms & Conditions</label>
                                    <textarea class="form-control" id="terms_conditions" rows="3"
                                              placeholder="Standard terms and conditions"></textarea>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-md-12">
                                    <label class="form-label">Internal Notes</label>
                                    <textarea class="form-control" id="internal_notes" rows="2"
                                              placeholder="Any internal notes (not visible to supplier)"></textarea>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="d-flex justify-content-end gap-2">
                                <button type="button" class="btn btn-secondary me-2" onclick="TempleRouter.navigate('purchase/requests'); return false;">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary" id="convertBtn" disabled>
                                    <i class="bi bi-arrow-right-circle"></i> Convert Selected Items to PO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            $('#convertFormContent').html(html);
            this.bindEvents();
        },

        renderConversionStatus: function (stats) {
            if (!stats || !stats.total_items) return '';

            const percentage = stats.conversion_percentage || 0;
            const progressClass = percentage === 100 ? 'bg-success' : percentage > 0 ? 'bg-warning' : 'bg-secondary';

            return `
                <div class="conversion-status">
                    <small class="text-muted d-block mb-1">
                        ${stats.converted_items} of ${stats.total_items} items converted (${percentage}%)
                    </small>
                    <div class="progress" style="width: 200px; height: 10px;">
                        <div class="progress-bar ${progressClass}" role="progressbar" 
                             style="width: ${percentage}%"
                             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            `;
        },

        renderSupplierOptions: function () {
            if (!Array.isArray(this.suppliers) || this.suppliers.length === 0) {
                return '<option value="">No suppliers available</option>';
            }

            return this.suppliers.map(supplier => `
        <option value="${supplier.id}" 
                data-supplier-type="${supplier.supplier_type || 'both'}"
                data-payment-terms="${supplier.payment_terms || ''}"
                data-credit-limit="${supplier.credit_limit || ''}">
            ${supplier.supplier_code ? supplier.supplier_code + ' - ' : ''}${supplier.name}
            ${supplier.supplier_type ? ' (' + supplier.supplier_type.charAt(0).toUpperCase() + supplier.supplier_type.slice(1) + ')' : ''}
        </option>
    `).join('');
        },
        renderItems: function () {
            if (!this.prData.items || this.prData.items.length === 0) {
                return '<tr><td colspan="11" class="text-center">No items found</td></tr>';
            }

            const currentSupplierId = this.currentSupplierId;

            return this.prData.items.map((item, index) => {
                const itemName = item.product?.name || item.service?.name || 'Unknown Item';
                const itemType = item.item_type === 'product' ? 'Product' : 'Service';
                const isService = item.item_type === 'service';
                const quantity = isService ? 1 : (item.quantity || 1);
                const uomDisplay = isService ? 'N/A' : (item.uom?.name || 'Unit');
                const isConverted = item.is_converted || false;
                // Check if converted for current supplier
                const isConvertedForCurrentSupplier = currentSupplierId &&
                    item.converted_suppliers &&
                    item.converted_suppliers.includes(currentSupplierId);

                const preferredSupplierName = item.preferred_supplier?.name || 'Any';

                // Show conversion status per supplier
                let conversionStatus = '';
                if (item.conversion_details && item.conversion_details.length > 0) {
                    const otherSuppliers = item.conversion_details
                        .filter(cd => cd.supplier_id !== currentSupplierId)
                        .map(cd => cd.supplier_name);

                    if (otherSuppliers.length > 0) {
                        conversionStatus = `<small class="text-warning d-block">
                    Also ordered from: ${otherSuppliers.join(', ')}
                </small>`;
                    }
                }

                return `
            <tr data-item-index="${index}" 
                data-item-id="${item.id}"
                data-item-type="${item.item_type}"
                data-preferred-supplier="${item.preferred_supplier_id || 'any'}"
                data-converted-for-supplier="${isConvertedForCurrentSupplier}"
                class="${isConvertedForCurrentSupplier ? 'table-secondary' : ''}">
                <td class="text-center">
                    <input type="checkbox" 
                           class="form-check-input item-checkbox" 
                           data-item-id="${item.id}"
                           ${isConvertedForCurrentSupplier ? 'disabled' : ''}>
                </td>
                <td>${index + 1}</td>
                <td>
                    <span class="badge bg-${isService ? 'info' : 'primary'}">${itemType}</span>
                </td>
                <td>
                    <strong>${itemName}</strong>
                    ${item.description ? `<br><small class="text-muted">${item.description}</small>` : ''}
                    <br><small class="text-info">Preferred: ${preferredSupplierName}</small>
                    ${conversionStatus}
                </td>
 <td class="text-center">
                    <input type="hidden" class="quantity" value="${quantity}">
                    <span class="${isService ? 'text-muted' : ''}">${isService ? 'N/A' : quantity}</span>
                </td>
                <td class="text-center">
                    <span class="${isService ? 'text-muted' : ''}">${uomDisplay}</span>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm unit-price" 
                           placeholder="0.00" min="0" step="0.01" 
                           ${isConverted ? 'disabled' : ''}>
                </td>
                <td>
                    <select class="form-select form-select-sm tax-select" ${isConverted ? 'disabled' : ''}>
                        <option value="0" data-percent="0">No Tax</option>
                        ${this.renderTaxOptions()}
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm discount" 
                           placeholder="0.00" value="0" min="0" step="0.01"
                           ${isConverted ? 'disabled' : ''}>
                </td>
                <td class="text-end item-total">
                    <strong>RM <span class="item-total-amount">0.00</span></strong>
                </td>

                <td class="text-center">
                    ${isConvertedForCurrentSupplier ?
                        `<span class="badge bg-success" title="Already ordered from this supplier">
                            <i class="bi bi-check-circle"></i> Ordered
                        </span>` :
                        '<span class="badge bg-secondary">Available</span>'}
                </td>
            </tr>
        `;
            }).join('');
        },
        renderTaxOptions: function () {
            if (!Array.isArray(this.taxRates) || this.taxRates.length === 0) {
                return '';
            }

            return this.taxRates.map(tax => `
                <option value="${tax.id}" data-percent="${tax.percent || 0}">
                    ${tax.name} (${tax.percent || 0}%)
                </option>
            `).join('');
        },

        bindEvents: function () {
            const self = this;

            // Supplier change
   // Supplier change
$('#supplier_id').on('change', function () {
    const supplierId = $(this).val();
    self.currentSupplierId = supplierId;
    
    const option = $(this).find('option:selected');
    const paymentTerms = option.data('payment-terms');
    const supplierType = option.data('supplier-type') || 'both';
    
    if (paymentTerms) {
        $('#payment_terms').val(`Net ${paymentTerms} days`);
    }
    
    // Update item selection based on supplier and type
    self.updateItemSelection();
    
    // Update select all checkbox based on available items
    const availableItems = $('.item-checkbox:not(:disabled)').length;
    if (availableItems === 0) {
        $('#selectAllCheckbox').prop('disabled', true);
        $('#selectAll, #deselectAll').prop('disabled', true);
    } else {
        $('#selectAllCheckbox').prop('disabled', false);
        $('#selectAll, #deselectAll').prop('disabled', false);
    }
});
            // Item checkbox change - ADD required attribute management
            $(document).on('change', '.item-checkbox', function () {
                const itemId = $(this).data('item-id');
                const $row = $(this).closest('tr');
                const $unitPrice = $row.find('.unit-price');

                if ($(this).prop('checked')) {
                    self.selectedItems.add(itemId.toString());
                    // Add required attribute and visual indicator when selected
                    $unitPrice.attr('required', 'required');

                    // Add visual feedback for required field
                    const $label = $('th:contains("Unit Price")');
                    if ($label.find('.text-danger').length === 0) {
                        $label.append(' <span class="text-danger">*</span>');
                    }
                } else {
                    self.selectedItems.delete(itemId.toString());
                    // Remove required attribute and clear validation state when deselected
                    $unitPrice.removeAttr('required');
                    $unitPrice.removeClass('is-invalid');
                }

                self.updateSelectionCount();
                self.calculateTotals();
            });

            // Select all checkbox
            $('#selectAllCheckbox').on('change', function () {
                const isChecked = $(this).prop('checked');
                $('.item-checkbox:not(:disabled)').each(function () {
                    const $row = $(this).closest('tr');
                    const $unitPrice = $row.find('.unit-price');

                    $(this).prop('checked', isChecked);
                    const itemId = $(this).data('item-id');

                    if (isChecked) {
                        self.selectedItems.add(itemId.toString());
                        $unitPrice.attr('required', 'required');
                    } else {
                        self.selectedItems.delete(itemId.toString());
                        $unitPrice.removeAttr('required');
                        $unitPrice.removeClass('is-invalid');
                    }
                });
                self.updateSelectionCount();
                self.calculateTotals();
            });

            // Select all button
            $('#selectAll').on('click', function () {
                $('.item-checkbox:not(:disabled)').each(function () {
                    const $row = $(this).closest('tr');
                    const $unitPrice = $row.find('.unit-price');

                    $(this).prop('checked', true);
                    const itemId = $(this).data('item-id');
                    self.selectedItems.add(itemId.toString());
                    $unitPrice.attr('required', 'required');
                });
                $('#selectAllCheckbox').prop('checked', true);
                self.updateSelectionCount();
                self.calculateTotals();
            });

            // Deselect all button
            $('#deselectAll').on('click', function () {
                $('.item-checkbox').each(function () {
                    const $row = $(this).closest('tr');
                    const $unitPrice = $row.find('.unit-price');

                    $(this).prop('checked', false);
                    $unitPrice.removeAttr('required');
                    $unitPrice.removeClass('is-invalid');
                });
                $('#selectAllCheckbox').prop('checked', false);
                self.selectedItems.clear();
                self.updateSelectionCount();
                self.calculateTotals();
            });

            // Price calculations - add validation feedback
            $(document).on('input change', '.unit-price, .tax-select, .discount, #additionalCharges', function () {
                const $row = $(this).closest('tr');
                if ($row.length) {
                    const itemId = $row.data('item-id');
                    if (self.selectedItems.has(itemId.toString())) {
                        // Clear validation error if price is entered
                        if ($(this).hasClass('unit-price') && $(this).val() && parseFloat($(this).val()) > 0) {
                            $(this).removeClass('is-invalid');
                        }
                        self.calculateLineTotal($row);
                        self.calculateTotals();
                    }
                }
            });

            // Form submission
            $('#convertPOForm').on('submit', function (e) {
                e.preventDefault();
                self.convertToPO();
            });
        },

        updateItemSelection: function () {
            const supplierId = this.currentSupplierId;
            const self = this;

            // Get supplier type from selected option
            const supplierType = $('#supplier_id option:selected').data('supplier-type') || 'both';

            $('.item-checkbox').each(function () {
                const $row = $(this).closest('tr');
                const $unitPrice = $row.find('.unit-price');
                const itemType = $row.data('item-type'); // 'product' or 'service'
                const pr_item_id = $row.data('item-id');
                const item = self.prData.items.find(i => i.id == pr_item_id);

                const isConvertedForCurrentSupplier = supplierId &&
                    item.converted_suppliers &&
                    item.converted_suppliers.includes(supplierId);

                // Check if item type matches supplier type
                const isTypeCompatible = supplierType === 'both' ||
                    supplierType === itemType ||
                    (supplierType === 'product' && itemType === 'product') ||
                    (supplierType === 'service' && itemType === 'service');

                if (!supplierId) {
                    // No supplier selected - disable all
                    $(this).prop('disabled', true);
                    $(this).prop('checked', false);
                    $row.find('.unit-price, .tax-select, .discount').prop('disabled', true);
                    $unitPrice.removeAttr('required');
                    $row.css('opacity', '0.5');
                    $row.removeClass('table-warning table-info');

                } else if (isConvertedForCurrentSupplier) {
                    // Already converted for this supplier
                    $(this).prop('disabled', true);
                    $(this).prop('checked', false);
                    $row.find('.unit-price, .tax-select, .discount').prop('disabled', true);
                    $unitPrice.removeAttr('required');
                    $row.css('opacity', '0.5');
                    $row.addClass('table-warning');
                    $row.removeClass('table-info');

                    // Update status badge
                    $row.find('td:last-child').html(`
                <span class="badge bg-success" title="Already ordered from this supplier">
                    <i class="bi bi-check-circle"></i> Ordered
                </span>
            `);

                } else if (!isTypeCompatible) {
                    // Item type doesn't match supplier type
                    $(this).prop('disabled', true);
                    $(this).prop('checked', false);
                    $row.find('.unit-price, .tax-select, .discount').prop('disabled', true);
                    $unitPrice.removeAttr('required');
                    $row.css('opacity', '0.4');
                    $row.addClass('table-secondary');

                    // Update status badge to show incompatibility
                    const supplierTypeDisplay = supplierType.charAt(0).toUpperCase() + supplierType.slice(1);
                    $row.find('td:last-child').html(`
                <span class="badge bg-warning" title="Supplier only handles ${supplierTypeDisplay}">
                    <i class="bi bi-exclamation-triangle"></i> Incompatible
                </span>
            `);

                } else {
                    // Available for conversion and compatible
                    $(this).prop('disabled', false);
                    $row.find('.unit-price, .tax-select, .discount').prop('disabled', false);
                    $row.css('opacity', '1');
                    $row.removeClass('table-warning table-secondary table-info');

                    // Update status badge
                    $row.find('td:last-child').html('<span class="badge bg-secondary">Available</span>');
                }
            });

            this.selectedItems.clear();
            this.updateSelectionCount();
            this.calculateTotals();

            // Show supplier type notification
            if (supplierId && supplierType !== 'both') {
                const typeMessage = supplierType === 'product' ?
                    'This supplier only handles products. Service items are disabled.' :
                    'This supplier only handles services. Product items are disabled.';

                // Add info message below supplier selection
                if (!$('#supplierTypeNotice').length) {
                    $('#supplier_id').after(`
                <div id="supplierTypeNotice" class="alert alert-info mt-2 py-2 px-3">
                    <i class="bi bi-info-circle"></i> ${typeMessage}
                </div>
            `);
                } else {
                    $('#supplierTypeNotice').html(`<i class="bi bi-info-circle"></i> ${typeMessage}`);
                }
            } else {
                $('#supplierTypeNotice').remove();
            }
        },
        updateSelectionCount: function () {
            const count = this.selectedItems.size;
            $('#selectionCount').text(`${count} item${count !== 1 ? 's' : ''} selected`);
            $('#convertBtn').prop('disabled', count === 0 || !this.currentSupplierId);
        },

        calculateLineTotal: function ($row) {
            if (!$row || $row.length === 0) return;

            const itemType = $row.data('item-type');
            const isService = itemType === 'service';
            const quantity = parseFloat($row.find('.quantity').val()) || 1;
            const unitPrice = parseFloat($row.find('.unit-price').val()) || 0;
            const taxPercent = parseFloat($row.find('.tax-select option:selected').data('percent')) || 0;
            const discount = parseFloat($row.find('.discount').val()) || 0;

            const itemSubtotal = quantity * unitPrice;
            const discountedAmount = Math.max(0, itemSubtotal - discount);
            const taxAmount = (discountedAmount * taxPercent) / 100;
            const itemTotal = discountedAmount + taxAmount;

            $row.find('.item-total-amount').text(itemTotal.toFixed(2));
            $row.data('subtotal', itemSubtotal);
            $row.data('tax-amount', taxAmount);
            $row.data('discount-amount', discount);
            $row.data('total', itemTotal);
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            this.selectedItems.forEach(itemId => {
                const $row = $(`tr[data-item-id="${itemId}"]`);
                if ($row.length) {
                    this.calculateLineTotal($row);
                    subtotal += $row.data('subtotal') || 0;
                    totalTax += $row.data('tax-amount') || 0;
                    totalDiscount += $row.data('discount-amount') || 0;
                }
            });

            const additionalCharges = parseFloat($('#additionalCharges').val()) || 0;
            const grandTotal = subtotal + totalTax - totalDiscount + additionalCharges;

            $('#subtotal').text(subtotal.toFixed(2));
            $('#totalTax').text(totalTax.toFixed(2));
            $('#totalDiscount').text(totalDiscount.toFixed(2));
            $('#grandTotal').text(grandTotal.toFixed(2));
        },

        convertToPO: function () {
            const self = this;

            if (!this.currentSupplierId) {
                TempleCore.showToast('Please select a supplier', 'warning');
                return;
            }

            if (this.selectedItems.size === 0) {
                TempleCore.showToast('Please select at least one item to convert', 'warning');
                return;
            }

            // Validate prices for selected items
            let valid = true;
            let invalidCount = 0;
            this.selectedItems.forEach(itemId => {
                const $row = $(`tr[data-item-id="${itemId}"]`);
                const $priceInput = $row.find('.unit-price');
                if (!$priceInput.val() || parseFloat($priceInput.val()) <= 0) {
                    valid = false;
                    invalidCount++;
                    $priceInput.addClass('is-invalid');
                    // Add feedback text if not present
                    if (!$priceInput.next('.invalid-feedback').length) {
                        $priceInput.after('<div class="invalid-feedback">Price is required</div>');
                    }
                } else {
                    $priceInput.removeClass('is-invalid');
                    $priceInput.next('.invalid-feedback').remove();
                }
            });
            if (!valid) {
                TempleCore.showToast(`Please enter unit prices for ${invalidCount} selected item${invalidCount > 1 ? 's' : ''}`, 'warning');
                // Scroll to first invalid field
                const firstInvalid = $('.unit-price.is-invalid').first();
                if (firstInvalid.length) {
                    $('html, body').animate({
                        scrollTop: firstInvalid.offset().top - 100
                    }, 500);
                }
                return;
            }


            // Prepare items data
            const items = [];
            this.selectedItems.forEach(itemId => {
                const $row = $(`tr[data-item-id="${itemId}"]`);
                items.push({
                    item_id: itemId,
                    unit_price: parseFloat($row.find('.unit-price').val()) || 0,
                    tax_id: $row.find('.tax-select').val() || null,
                    discount_amount: parseFloat($row.find('.discount').val()) || 0
                });
            });

            // const poData = {
            //     supplier_id: this.currentSupplierId,
            //     selected_items: Array.from(this.selectedItems),
            //     items: items,
            //      pr_item_id: this.pr_item_id
            // };
            const poData = {
                supplier_id: this.currentSupplierId,
                selected_items: Array.from(this.selectedItems), // Send selected item IDs
                items: [] // will hold details for selected items
            };

            // Only process checked items
            $('.item-checkbox:checked:not(:disabled)').each((index, checkbox) => {
                const $row = $(checkbox).closest('tr');
                const prItemId = $row.data('item-id');
                const unitPrice = parseFloat($row.find('.unit-price').val()) || 0;
                const discount = parseFloat($row.find('.discount').val()) || 0;
                const taxId = $row.find('.tax-select').val();
                const taxPercent = parseFloat($row.find('.tax-select option:selected').data('percent')) || 0;

                // Fix: Convert "0" to null for "No Tax" option
                const actualTaxId = (taxId === "0" || taxId === 0 || !taxId) ? null : taxId;

                poData.items.push({
                    pr_item_id: prItemId,
                    unit_price: unitPrice,
                    discount_amount: discount,
                    tax_id: actualTaxId, // Use actualTaxId instead of taxId
                    tax_percent: taxPercent
                });
            })

            // Add optional fields
            if ($('#delivery_date').val()) {
                poData.delivery_date = $('#delivery_date').val();
            }
            if ($('#quotation_ref').val()) {
                poData.quotation_ref = $('#quotation_ref').val();
            }
            if ($('#payment_terms').val()) {
                poData.payment_terms = $('#payment_terms').val();
            }
            if ($('#terms_conditions').val()) {
                poData.terms_conditions = $('#terms_conditions').val();
            }
            if ($('#internal_notes').val()) {
                poData.internal_notes = $('#internal_notes').val();
            }
            const additionalCharges = parseFloat($('#additionalCharges').val());
            if (additionalCharges > 0) {
                poData.other_charges = additionalCharges;
            }

            console.log('Converting PR to PO with data:', poData);

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/requests/' + this.prId + '/convert-po', poData)
                .done(function (response) {
                    if (response.success) {
                        const stats = response.data.conversion_stats;
                        const message = stats?.is_fully_converted ?
                            'All items converted to PO successfully' :
                            `${stats.items_converted} items converted to PO successfully`;

                        TempleCore.showToast(message, 'success');
                        TempleRouter.navigate('purchase/orders/view', { id: response.data.po.id });

                    } else {
                        TempleCore.showToast(response.message || 'Failed to create PO', 'error');
                    }
                })
                .fail(function (xhr) {
                    console.error('PO Conversion Error:', xhr.responseJSON);
                    const error = xhr.responseJSON?.message || 'Failed to convert PR to PO';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);