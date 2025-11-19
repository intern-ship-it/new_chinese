// js/pages/purchase/orders/create.js
// Purchase Order Create Page with Select2 Integration
(function ($, window) {
    'use strict';

    window.PurchaseOrdersCreatePage = {
        items: [],
        editMode: false,
        orderId: null,

        init: function (params) {
            this.editMode = params && params.id;
            this.orderId = params?.id;

            this.render();
            this.loadMasterData();
            this.bindEvents();
            
            // Initialize Select2 after render
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);

            if (this.editMode) {
                this.loadOrderData();
            }
        },

        render: function () {
            const title = this.editMode ? 'Edit Purchase Order' : 'Create Purchase Order';

            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>${title}</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="backBtn">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    
                    <form id="poForm">
                        <!-- Header Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Order Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">PO Number</label>
                                        <input type="text" class="form-control" value="Auto-generated" disabled>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">PO Date</label>
                                        <input type="date" class="form-control" id="poDate" 
                                               value="${moment().format('YYYY-MM-DD')}" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplierId" required>
                                            <option value="">Select Supplier</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-md-3">
                                        <label class="form-label">Quotation Ref</label>
                                        <input type="text" class="form-control" id="quotationRef">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Delivery Date</label>
                                        <input type="date" class="form-control" id="deliveryDate" 
                                               min="${moment().add(1, 'day').format('YYYY-MM-DD')}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Delivery Address</label>
                                        <input type="text" class="form-control" id="deliveryAddress">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Items Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h5>Items</h5>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <button type="button" class="btn btn-sm btn-primary" id="addItemBtn">
                                            <i class="bi bi-plus"></i> Add Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table" id="itemsTable">
                                        <thead>
                                            <tr>
                                                <th width="20%">Item</th>
                                                <th width="20%">Description</th>
                                                <th width="10%">Quantity/Details</th>
                                                <th width="10%">Unit Price</th>
                                                <th width="10%">Tax</th>
                                                <th width="10%">Discount</th>
                                                <th width="15%">Total</th>
                                                <th width="5%"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="itemsTableBody">
                                            <tr class="no-items">
                                                <td colspan="8" class="text-center text-muted">
                                                    No items added
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="6" class="text-end"><strong>Subtotal:</strong></td>
                                                <td><strong id="subtotal">0.00</strong></td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td colspan="6" class="text-end"><strong>Total Tax:</strong></td>
                                                <td><strong id="totalTax">0.00</strong></td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td colspan="6" class="text-end">
                                                    <strong>Shipping Charges:</strong>
                                                    <input type="number" class="form-control form-control-sm d-inline w-auto" 
                                                           id="shippingCharges" value="0" min="0" step="0.01">
                                                </td>
                                                <td><strong id="shippingAmount">0.00</strong></td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td colspan="6" class="text-end">
                                                    <strong>Other Charges:</strong>
                                                    <input type="number" class="form-control form-control-sm d-inline w-auto" 
                                                           id="otherCharges" value="0" min="0" step="0.01">
                                                </td>
                                                <td><strong id="otherAmount">0.00</strong></td>
                                                <td></td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td colspan="6" class="text-end"><h5>Total Amount:</h5></td>
                                                <td><h5 id="totalAmount">0.00</h5></td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Terms Section -->
                        <div class="card">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Payment Terms</label>
                                        <textarea class="form-control" id="paymentTerms" rows="3">
Net 30 days from invoice date
2% discount if paid within 10 days</textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Terms & Conditions</label>
                                        <textarea class="form-control" id="termsConditions" rows="3">
1. Delivery within specified date
2. Quality as per specifications
3. Warranty as applicable</textarea>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-md-12">
                                        <label class="form-label">Internal Notes</label>
                                        <textarea class="form-control" id="internalNotes" rows="2"></textarea>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-12 text-end">
                                        <button type="button" class="btn btn-secondary" id="saveDraftBtn">
                                            Save as Draft
                                        </button>
                                        <button type="submit" class="btn btn-primary ms-2">
                                            Submit for Approval
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Item Modal -->
                <div class="modal fade" id="poItemModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Item</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Type <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalItemType">
                                            <option value="">Select Type</option>
                                            <option value="product">Product</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Item <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalItemSelect" disabled>
                                            <option value="">Select item type first</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="modalDescription" rows="2"></textarea>
                                    </div>
                                    
                                    <!-- Product-specific fields (Quantity and UOM) -->
                                    <div class="col-md-3 product-fields" style="display: none;">
                                        <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="modalQuantity" 
                                               min="0.001" step="0.001">
                                    </div>
                                    <div class="col-md-3 product-fields" style="display: none;">
                                        <label class="form-label">UOM <span class="text-danger">*</span></label>
                                        <select class="form-select" id="modalUom">
                                            <option value="">Select UOM</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Unit Price field (always visible, adjusted width based on type) -->
                                    <div class="col-md-3" id="unitPriceContainer">
                                        <label class="form-label">Unit Price <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="modalUnitPrice" 
                                               min="0" step="0.01">
                                    </div>
                                    
                                    <!-- Tax field (always visible, adjusted width based on type) -->
                                    <div class="col-md-3" id="taxContainer">
                                        <label class="form-label">Tax</label>
                                        <select class="form-select" id="modalTax">
                                            <option value="">No Tax</option>
                                        </select>
                                    </div>
                                    
                                    <div class="col-md-4">
                                        <label class="form-label">Discount Type</label>
                                        <select class="form-select" id="modalDiscountType">
                                            <option value="">No Discount</option>
                                            <option value="percent">Percentage</option>
                                            <option value="amount">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Discount Value</label>
                                        <input type="number" class="form-control" id="modalDiscountValue" 
                                               min="0" step="0.01" disabled>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Line Total</label>
                                        <input type="text" class="form-control" id="modalLineTotal" readonly>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePoItemBtn">Add Item</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        initializeSelect2: function() {
            // Initialize supplier dropdown with search
            $('#supplierId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select supplier...',
                allowClear: true,
                width: '100%'
            });
            
            // Initialize UOM dropdown
            $('#modalUom').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search UOM...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#poItemModal')
            });
            
            // Initialize Tax dropdown
            $('#modalTax').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search tax...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#poItemModal')
            });
            
            // Initialize Item Type dropdown
            $('#modalItemType').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select type...',
                width: '100%',
                minimumResultsForSearch: -1,
                dropdownParent: $('#poItemModal')
            });
            
            // Initialize discount type
            $('#modalDiscountType').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select discount type...',
                width: '100%',
                minimumResultsForSearch: -1,
                dropdownParent: $('#poItemModal')
            });
        },

        loadMasterData: function () {
            const self = this;

            // Load Suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Supplier</option>';
                        $.each(response.data.data, function (i, supplier) {
                            options += `<option value="${supplier.id}" 
                                data-payment-terms="${supplier.payment_terms || ''}"
                                data-credit-limit="${supplier.credit_limit || 0}">
                                ${supplier.name} (${supplier.supplier_code})
                            </option>`;
                        });
                        $('#supplierId').html(options);
                        
                        // Reinitialize Select2 after loading data
                        $('#supplierId').select2({
                            theme: 'bootstrap-5',
                            placeholder: 'Search and select supplier...',
                            allowClear: true,
                            width: '100%'
                        });
                    }
                });

            // Load UOMs
            TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select UOM</option>';
                        $.each(response.data, function (i, uom) {
                            options += `<option value="${uom.id}">${uom.name}</option>`;
                        });
                        $('#modalUom').html(options);
                        $('#modalUom').trigger('change.select2');
                    }
                });

            // Load Tax Master
            TempleAPI.get('/masters/tax')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">No Tax</option>';
                        const taxData = response.data.data || response.data;
                        $.each(taxData, function (i, tax) {
                            if (tax && tax.id && tax.name) {
                                const percent = tax.percent || 0;
                                options += `<option value="${tax.id}" data-percent="${percent}">
                                    ${tax.name} (${percent}%)
                                </option>`;
                            }
                        });
                        $('#modalTax').html(options);
                        $('#modalTax').trigger('change.select2');
                    }
                })
                .fail(function () {
                    console.error('Failed to load tax master data');
                    $('#modalTax').html('<option value="">No Tax</option>');
                });
        },

        bindEvents: function () {
            const self = this;

            // Back button
            $('#backBtn').on('click', function () {
                TempleRouter.navigate('purchase/orders');
            });

            // Supplier change with Select2 event
            $('#supplierId').on('select2:select', function (e) {
                const data = e.params.data;
                const paymentTerms = $(data.element).data('payment-terms');
                if (paymentTerms) {
                    const dueDate = moment().add(paymentTerms, 'days').format('YYYY-MM-DD');
                    $('#paymentTerms').val(`Net ${paymentTerms} days from invoice date`);
                }
            });

            // Clear payment terms when supplier is cleared
            $('#supplierId').on('select2:clear', function () {
                $('#paymentTerms').val('Net 30 days from invoice date\n2% discount if paid within 10 days');
            });

            // Add item
            $('#addItemBtn').on('click', function () {
                self.showItemModal();
            });

            // Item type change with Select2 event - UPDATED LOGIC
            $('#modalItemType').on('change', function () {
                const type = $(this).val();
                self.handleItemTypeChange(type);
                
                if (type) {
                    self.loadModalItems(type);
                } else {
                    $('#modalItemSelect').val('').trigger('change').prop('disabled', true)
                        .html('<option value="">Select item type first</option>');
                    
                    // Destroy and reinitialize Select2
                    if ($('#modalItemSelect').data('select2')) {
                        $('#modalItemSelect').select2('destroy');
                    }
                }
            });

            // Calculate line total on change
            $('#modalQuantity, #modalUnitPrice').on('change keyup', function () {
                self.calculateLineTotal();
            });

            // Tax change with Select2 event
            $('#modalTax').on('change', function () {
                self.calculateLineTotal();
            });

            // Discount type change with Select2 event
            $('#modalDiscountType').on('change', function () {
                const hasDiscount = $(this).val() !== '';
                $('#modalDiscountValue').prop('disabled', !hasDiscount);
                if (!hasDiscount) {
                    $('#modalDiscountValue').val('');
                }
                self.calculateLineTotal();
            });

            // Discount value change
            $('#modalDiscountValue').on('change keyup', function () {
                self.calculateLineTotal();
            });

            // Save item
            $('#savePoItemBtn').on('click', function () {
                self.saveItem();
            });

            // Edit item
            $(document).on('click', '.edit-item', function () {
                const index = $(this).data('index');
                self.showItemModal(index);
            });

            // Remove item
            $(document).on('click', '.remove-item', function () {
                const index = $(this).data('index');
                self.removeItem(index);
            });

            // Shipping/Other charges change
            $('#shippingCharges, #otherCharges').on('change keyup', function () {
                self.calculateTotals();
            });

            // Save draft
            $('#saveDraftBtn').on('click', function () {
                self.savePO('DRAFT');
            });

            // Submit form
            $('#poForm').on('submit', function (e) {
                e.preventDefault();
                self.savePO('PENDING_APPROVAL');
            });
        },

        // NEW METHOD: Handle item type change to show/hide fields
        handleItemTypeChange: function(type) {
            if (type === 'service') {
                // Hide product-specific fields
                $('.product-fields').hide();
                // Set default quantity for services only if it's empty or 0
                if (!$('#modalQuantity').val() || $('#modalQuantity').val() == '0') {
                    $('#modalQuantity').val('1');
                }
                $('#modalUom').val('').trigger('change.select2'); // Clear UOM selection
                
                // Adjust column widths for remaining fields
                $('#unitPriceContainer').removeClass('col-md-3').addClass('col-md-4');
                $('#taxContainer').removeClass('col-md-3').addClass('col-md-4');
            } else if (type === 'product') {
                // Show product-specific fields
                $('.product-fields').show();
                
                // Reset column widths
                $('#unitPriceContainer').removeClass('col-md-4').addClass('col-md-3');
                $('#taxContainer').removeClass('col-md-4').addClass('col-md-3');
            } else {
                // No type selected - hide product fields
                $('.product-fields').hide();
                $('#unitPriceContainer').removeClass('col-md-4').addClass('col-md-3');
                $('#taxContainer').removeClass('col-md-4').addClass('col-md-3');
            }
        },

        loadModalItems: function (type) {
            const self = this;
            const endpoint = type === 'product' ? '/inventory/products' : '/purchase/services';

            $('#modalItemSelect').html('<option value="">Loading...</option>').prop('disabled', true);

            TempleAPI.get(endpoint, { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        const items = response.data.data || response.data || [];

                        if (items.length === 0) {
                            $('#modalItemSelect').html(`<option value="">No ${type}s available - Please create ${type}s first</option>`)
                                .prop('disabled', true);

                            TempleCore.showToast(`No ${type}s found. Please create ${type}s in the system first.`, 'error');
                            $('#savePoItemBtn').prop('disabled', true);
                            return;
                        }

                        let options = '<option value="">Select ' + type + '</option>';
                        $.each(items, function (i, item) {
                            if (item.id) {
                                const description = item.description ? ` - ${item.description.substring(0, 30)}...` : '';
                                const price = parseFloat(item.unit_price || item.price || 0).toFixed(2);
                                const code = item.code ? ` (${item.code})` : '';
                                options += `<option value="${item.id}" 
                                    data-name="${item.name || ''}"
                                    data-price="${price}"
                                    data-description="${item.description || ''}">
                                    ${item.name}
                                </option>`;
                            }
                        });
                        $('#modalItemSelect').prop('disabled', false).html(options);
                        
                        // Initialize or reinitialize Select2 for items
                        if ($('#modalItemSelect').data('select2')) {
                            $('#modalItemSelect').select2('destroy');
                        }
                        
                        $('#modalItemSelect').select2({
                            theme: 'bootstrap-5',
                            placeholder: `Search ${type}...`,
                            allowClear: true,
                            width: '100%',
                            dropdownParent: $('#poItemModal'),
                            matcher: function(params, data) {
                                if ($.trim(params.term) === '') {
                                    return data;
                                }
                                
                                if (typeof data.text === 'undefined') {
                                    return null;
                                }
                                
                                // Search in text (includes name, code, description, price)
                                if (data.text.toLowerCase().indexOf(params.term.toLowerCase()) > -1) {
                                    return data;
                                }
                                
                                // Also search in data attributes
                                const $option = $(data.element);
                                const name = $option.data('name') || '';
                                const description = $option.data('description') || '';
                                
                                if (name.toLowerCase().indexOf(params.term.toLowerCase()) > -1 ||
                                    description.toLowerCase().indexOf(params.term.toLowerCase()) > -1) {
                                    return data;
                                }
                                
                                return null;
                            }
                        });
                        
                        // Auto-fill price when item is selected
                        $('#modalItemSelect').off('select2:select').on('select2:select', function(e) {
                            const data = e.params.data;
                            const $option = $(data.element);
                            const price = $option.data('price');
                            const description = $option.data('description');
                            
                            if (price) {
                                $('#modalUnitPrice').val(price);
                            }
                            if (description && !$('#modalDescription').val()) {
                                $('#modalDescription').val(description);
                            }
                            self.calculateLineTotal();
                        });
                        
                        $('#savePoItemBtn').prop('disabled', false);
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || `Failed to load ${type}s`;
                    TempleCore.showToast(error, 'error');
                    $('#modalItemSelect').html(`<option value="">Failed to load</option>`)
                        .prop('disabled', true);
                    $('#savePoItemBtn').prop('disabled', true);
                });
        },

        calculateLineTotal: function () {
            const itemType = $('#modalItemType').val();
            let quantity = 1; // Default quantity for services
            
            if (itemType === 'product') {
                quantity = parseFloat($('#modalQuantity').val()) || 0;
            }
            
            const unitPrice = parseFloat($('#modalUnitPrice').val()) || 0;
            const taxPercent = parseFloat($('#modalTax option:selected').data('percent')) || 0;
            const discountType = $('#modalDiscountType').val();
            const discountValue = parseFloat($('#modalDiscountValue').val()) || 0;

            let subtotal = quantity * unitPrice;
            let discountAmount = 0;

            if (discountType === 'percent') {
                discountAmount = subtotal * (discountValue / 100);
            } else if (discountType === 'amount') {
                discountAmount = Math.min(discountValue, subtotal);
            }

            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (taxPercent / 100);
            const total = taxableAmount + taxAmount;

            $('#modalLineTotal').val(total.toFixed(2));
        },

        showItemModal: function (editIndex = null) {
            const self = this;

            // Reset Select2 dropdowns
            $('#modalItemType').val('').trigger('change');
            $('#modalItemSelect').empty().append('<option value="">Select item type first</option>').val('').trigger('change').prop('disabled', true);
            
            // Destroy Select2 for item select if exists
            if ($('#modalItemSelect').data('select2')) {
                $('#modalItemSelect').select2('destroy');
            }
            
            $('#modalDescription').val('');
            $('#modalQuantity').val('');
            $('#modalUom').val('').trigger('change');
            $('#modalUnitPrice').val('');
            $('#modalTax').val('').trigger('change');
            $('#modalDiscountType').val('').trigger('change');
            $('#modalDiscountValue').val('').prop('disabled', true);
            $('#modalLineTotal').val('0.00');
            
            // Hide product-specific fields initially
            $('.product-fields').hide();
            $('#unitPriceContainer').removeClass('col-md-4').addClass('col-md-3');
            $('#taxContainer').removeClass('col-md-4').addClass('col-md-3');

            // If editing, populate the form
            if (editIndex !== null) {
                const item = this.items[editIndex];
                $('#modalItemType').val(item.item_type).trigger('change');
                
                // Handle field visibility based on item type
                this.handleItemTypeChange(item.item_type);
                
                this.loadModalItems(item.item_type);

                setTimeout(function () {
                    $('#modalItemSelect').val(item.item_type === 'product' ? item.product_id : item.service_id).trigger('change');
                    $('#modalDescription').val(item.description);
                    
                    if (item.item_type === 'product') {
                        $('#modalQuantity').val(item.quantity);
                        $('#modalUom').val(item.uom_id).trigger('change');
                    }
                    
                    $('#modalUnitPrice').val(item.unit_price);
                    $('#modalTax').val(item.tax_id || '').trigger('change');
                    $('#modalDiscountType').val(item.discount_type || '').trigger('change');
                    $('#modalDiscountValue').val(item.discount_value || '');

                    if (item.discount_type) {
                        $('#modalDiscountValue').prop('disabled', false);
                    }

                    self.calculateLineTotal();
                }, 700);

                $('#savePoItemBtn').text('Update Item').data('edit-index', editIndex);
                $('.modal-title').text('Edit Item');
            } else {
                $('#savePoItemBtn').text('Add Item').removeData('edit-index');
                $('.modal-title').text('Add Item');
            }

            $('#poItemModal').modal('show');
        },

        saveItem: function () {
            // Validation
            const type = $('#modalItemType').val();
            const itemId = $('#modalItemSelect').val();
            const itemName = $('#modalItemSelect option:selected').text();
            const unitPrice = parseFloat($('#modalUnitPrice').val());
            
            // Adjust validation based on type
            let quantity = 1;
            let uomId = null;
            let uomName = 'Service';
            
            if (type === 'product') {
                quantity = parseFloat($('#modalQuantity').val());
                uomId = $('#modalUom').val();
                uomName = $('#modalUom option:selected').text();
                
                if (!quantity || quantity <= 0) {
                    TempleCore.showToast('Please enter a valid quantity', 'warning');
                    return;
                }
                
                if (!uomId) {
                    TempleCore.showToast('Please select a UOM', 'warning');
                    return;
                }
            }

            if (!type) {
                TempleCore.showToast('Please select item type', 'warning');
                return;
            }

            if (!itemId || itemId === '' || itemName.includes('No products available') || itemName.includes('No services available')) {
                TempleCore.showToast(`Please select a valid ${type}`, 'warning');
                return;
            }

            if (!unitPrice || unitPrice < 0) {
                TempleCore.showToast('Please enter a valid unit price', 'warning');
                return;
            }

            // Calculate amounts
            const taxPercent = parseFloat($('#modalTax option:selected').data('percent')) || 0;
            const discountType = $('#modalDiscountType').val();
            const discountValue = parseFloat($('#modalDiscountValue').val()) || 0;

            let subtotal = quantity * unitPrice;
            let discountAmount = 0;

            if (discountType === 'percent') {
                discountAmount = subtotal * (discountValue / 100);
            } else if (discountType === 'amount') {
                discountAmount = Math.min(discountValue, subtotal);
            }

            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (taxPercent / 100);
            const total = taxableAmount + taxAmount;

            // Create item object
            const item = {
                item_type: type,
                product_id: type === 'product' ? itemId : null,
                service_id: type === 'service' ? itemId : null,
                item_name: $('#modalItemSelect option:selected').data('name'),
                description: $('#modalDescription').val(),
                quantity: quantity,
                uom_id: uomId,
                uom_name: uomName,
                unit_price: unitPrice,
                tax_id: $('#modalTax').val() || null,
                tax_name: $('#modalTax option:selected').text(),
                tax_percent: taxPercent,
                tax_amount: taxAmount,
                discount_type: discountType || null,
                discount_value: discountValue,
                discount_amount: discountAmount,
                subtotal: subtotal,
                total_amount: total
            };

            // Check if updating or adding
            const editIndex = $('#savePoItemBtn').data('edit-index');
            if (editIndex !== undefined) {
                this.items[editIndex] = item;
                TempleCore.showToast('Item updated successfully', 'success');
            } else {
                this.items.push(item);
                TempleCore.showToast('Item added successfully', 'success');
            }

            this.renderItemsTable();
            $('#poItemModal').modal('hide');
        },

        removeItem: function (index) {
            TempleCore.showConfirm(
                'Remove Item',
                'Are you sure you want to remove this item?',
                () => {
                    this.items.splice(index, 1);
                    this.renderItemsTable();
                    TempleCore.showToast('Item removed', 'success');
                }
            );
        },

        renderItemsTable: function () {
            if (this.items.length === 0) {
                $('#itemsTableBody').html(`
                    <tr class="no-items">
                        <td colspan="8" class="text-center text-muted">No items added</td>
                    </tr>
                `);
                this.calculateTotals();
                return;
            }

            let html = '';
            $.each(this.items, function (index, item) {
                const quantityDisplay = item.item_type === 'service' ? 
                    'Service' : 
                    `${item.quantity} ${item.uom_name}`;
                    
                html += `
                    <tr>
                        <td>${item.item_name}</td>
                        <td>${item.description || '-'}</td>
                        <td>${quantityDisplay}</td>
                        <td>RM ${item.unit_price.toFixed(2)}</td>
                        <td>${item.tax_name !== 'No Tax' ? item.tax_name : '-'}</td>
                        <td>${item.discount_type ?
                                (item.discount_type === 'percent' ?
                                    item.discount_value + '%' :
                                    'RM ' + item.discount_value.toFixed(2)) :
                                '-'}</td>
                        <td><strong>RM ${item.total_amount.toFixed(2)}</strong></td>
                        <td>
                            <button type="button" class="btn btn-sm btn-info edit-item me-1" 
                                    data-index="${index}" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-danger remove-item" 
                                    data-index="${index}" title="Remove">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            $('#itemsTableBody').html(html);
            this.calculateTotals();
        },

        calculateTotals: function () {
            let subtotal = 0;
            let totalTax = 0;
            let totalDiscount = 0;

            $.each(this.items, function (i, item) {
                subtotal += item.subtotal;
                totalTax += item.tax_amount;
                totalDiscount += item.discount_amount;
            });

            const shippingCharges = parseFloat($('#shippingCharges').val()) || 0;
            const otherCharges = parseFloat($('#otherCharges').val()) || 0;
            const totalAmount = subtotal - totalDiscount + totalTax + shippingCharges + otherCharges;

            $('#subtotal').text(subtotal.toFixed(2));
            $('#totalTax').text(totalTax.toFixed(2));
            $('#shippingAmount').text(shippingCharges.toFixed(2));
            $('#otherAmount').text(otherCharges.toFixed(2));
            $('#totalAmount').text(totalAmount.toFixed(2));
        },

        savePO: function (status) {
            const self = this;

            // Validation
            if (!$('#supplierId').val()) {
                TempleCore.showToast('Please select a supplier', 'warning');
                $('#supplierId').select2('open');
                return;
            }

            if (this.items.length === 0) {
                TempleCore.showToast('Please add at least one item', 'warning');
                return;
            }

            // Prepare data
            const data = {
                supplier_id: $('#supplierId').val(),
                quotation_ref: $('#quotationRef').val(),
                delivery_date: $('#deliveryDate').val(),
                delivery_address: $('#deliveryAddress').val(),
                shipping_charges: parseFloat($('#shippingCharges').val()) || 0,
                other_charges: parseFloat($('#otherCharges').val()) || 0,
                payment_terms: $('#paymentTerms').val(),
                terms_conditions: $('#termsConditions').val(),
                internal_notes: $('#internalNotes').val(),
                status: status,
                items: this.items
            };

            TempleCore.showLoading(true);

            const endpoint = this.editMode ?
                `/purchase/orders/${this.orderId}` :
                '/purchase/orders';
            const method = this.editMode ? 'put' : 'post';

            TempleAPI[method](endpoint, data)
                .done(function (response) {
                    if (response.success) {
                        const message = status === 'DRAFT' ?
                            'Purchase Order saved as draft successfully' :
                            'Purchase Order submitted for approval successfully';
                        TempleCore.showToast(message, 'success');
                        
                        setTimeout(() => {
                            TempleRouter.navigate('purchase/orders');
                        }, 1000);
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to save Purchase Order';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };
})(jQuery, window);