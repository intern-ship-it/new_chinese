//js/pages/purchase/grn/create.js
// GRN Create Page
(function ($, window) {
    'use strict';

    window.PurchaseGrnCreatePage = {
        grnType: 'DIRECT',
        items: [],
        poData: null,

        init: function (params) {
            if (params && params.po_id) {
                this.grnType = 'PO_BASED';
                this.loadPOData(params.po_id);
            } else {
                this.render();
                this.loadMasterData();
                this.bindEvents();
            }
        },
        initializeSelect2: function () {
            // Initialize supplier dropdown
            $('#supplierId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select supplier...',
                allowClear: true,
                width: '100%'
            });

            // Initialize warehouse dropdown
            $('#warehouseId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select warehouse...',
                allowClear: true,
                width: '100%'
            });

            // Initialize quality status dropdown
            $('#qualityStatus').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select status...',
                width: '100%',
                minimumResultsForSearch: -1  // Disable search for small list
            });
        },
        render: function () {
            const title = this.grnType === 'PO_BASED' ? 'Create GRN from PO' : 'Create Direct GRN';

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
                    
                    ${this.grnType === 'PO_BASED' ? `
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i> 
                            Creating GRN from PO #${this.poData?.po_number || ''}. 
                            Only products will be included (services are excluded).
                        </div>
                    ` : ''}
                    
                    <form id="grnForm">
                        <!-- GRN Header -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>GRN Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">GRN Number</label>
                                        <input type="text" class="form-control" value="Auto-generated" disabled>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">GRN Date</label>
                                        <input type="date" class="form-control" id="grnDate" 
                                               value="${moment().format('YYYY-MM-DD')}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplierId" 
                                                ${this.grnType === 'PO_BASED' ? 'disabled' : ''} required>
                                            <option value="">Select Supplier</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row g-3 mt-2">
                                    <div class="col-md-3">
                                        <label class="form-label">Delivery Order No</label>
                                        <input type="text" class="form-control" id="challanNo">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Delivery Date</label>
                                        <input type="date" class="form-control" id="deliveryDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Vehicle Number</label>
                                        <input type="text" class="form-control" id="vehicleNumber">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Warehouse <span class="text-danger">*</span></label>
                                        <select class="form-select" id="warehouseId" required>
                                            <option value="">Select Warehouse</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Items Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h5>Products</h5>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        ${this.grnType === 'DIRECT' ? `
                                            <button type="button" class="btn btn-sm btn-primary" id="addGRNItemBtn">
                                                <i class="bi bi-plus"></i> Add Product
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table" id="grnItemsTable">
                                        <thead>
                                            <tr>
                                                <th width="15%">Product</th>
                                                <th width="10%">Ordered Qty</th>
                                                <th width="10%">Already Received</th>
                                                <th width="10%">Received Qty</th>
                                                <th width="10%">Accepted Qty</th>
                                                <th width="10%">Rejected Qty</th>
                                                <th width="10%">Batch No</th>
                                                <th width="10%">Expiry Date</th>
                                                <th width="10%">Serial Numbers</th>
                                                <th width="5%"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="grnItemsBody">
                                            <tr class="no-items">
                                                <td colspan="10" class="text-center text-muted">
                                                    ${this.grnType === 'PO_BASED' ? 'Loading PO products...' : 'No products added'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quality Check Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Quality Check</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="qualityCheckDone">
                                            <label class="form-check-label" for="qualityCheckDone">
                                                Quality Check Completed
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Checked By</label>
                                        <input type="text" class="form-control" id="qualityCheckBy" disabled>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Check Date</label>
                                        <input type="date" class="form-control" id="qualityCheckDate" disabled>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Overall Status</label>
                                        <select class="form-select" id="qualityStatus" disabled>
                                            <option value="">Select Status</option>
                                            <option value="GOOD">Good</option>
                                            <option value="ACCEPTABLE">Acceptable</option>
                                            <option value="POOR">Poor</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Quality Notes</label>
                                        <textarea class="form-control" id="qualityNotes" rows="2" disabled></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="card">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-12">
                                        <label class="form-label">GRN Notes</label>
                                        <textarea class="form-control" id="grnNotes" rows="3"></textarea>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-12 text-end">
                                        <button type="button" class="btn btn-secondary" id="saveGRNDraftBtn">
                                            Save as Draft
                                        </button>
                                        <button type="submit" class="btn btn-primary ms-2">
                                            Complete GRN
                                        </button>
                                       
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Product Details Modal -->
                <div class="modal fade" id="productDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Product Receipt Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" id="modalProductIndex">
                                <div class="row g-3">
                                    <div class="col-md-12">
                                        <h6 id="modalProductName">Product Name</h6>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Batch Number</label>
                                        <input type="text" class="form-control" id="modalBatchNo">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Manufacture Date</label>
                                        <input type="date" class="form-control" id="modalMfgDate">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Expiry Date</label>
                                        <input type="date" class="form-control" id="modalExpiryDate">
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Serial Numbers (Enter each on new line)</label>
                                        <textarea class="form-control" id="modalSerialNumbers" rows="4" 
                                                  placeholder="SN001&#10;SN002&#10;SN003"></textarea>
                                        <div class="form-text">
                                            Quantity: <span id="modalQuantity">0</span> | 
                                            Serial Numbers Entered: <span id="serialCount">0</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Warranty Period (Months)</label>
                                        <input type="number" class="form-control" id="modalWarrantyPeriod" min="0">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Rack/Bin Location</label>
                                        <input type="text" class="form-control" id="modalRackLocation">
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Condition on Receipt</label>
                                        <select class="form-select" id="modalCondition">
                                            <option value="GOOD">Good</option>
                                            <option value="DAMAGED">Damaged</option>
                                            <option value="EXPIRED">Expired</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12" id="rejectionSection" style="display: none;">
                                        <label class="form-label">Rejection Reason</label>
                                        <textarea class="form-control" id="modalRejectionReason" rows="2"></textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveProductDetailsBtn">Save Details</button>
                            </div>
                        </div>
                    </div>
                </div>
                            <!-- Custom CSS for Select2 -->
                <style>
                    .select2-container--bootstrap-5 .select2-selection {
                        border: 1px solid #dee2e6;
                        min-height: calc(1.5em + 0.75rem + 2px);
                    }
                    
                    .select2-container--bootstrap-5.select2-container--focus .select2-selection,
                    .select2-container--bootstrap-5.select2-container--open .select2-selection {
                        border-color: var(--primary-color);
                        box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
                    }
                    
                    .select2-dropdown {
                        border: 1px solid #dee2e6;
                        border-radius: 0.375rem;
                    }
                    
                    .select2-search--dropdown .select2-search__field {
                        border: 1px solid #dee2e6;
                        border-radius: 0.375rem;
                    }
                    
                    .select2-results__option--highlighted {
                        background-color: var(--primary-color) !important;
                    }
                    
                    .select2-ledger-option {
                        padding: 2px 0;
                    }
                    
                    .modal .select2-container {
                        width: 100% !important;
                    }
                    
                    .select2-container--bootstrap-5 .select2-dropdown {
                        z-index: 1056;
                    }
                        span.select2-selection.select2-selection--single {
    height: 38px;
    padding: 8px;
}
                </style>
            `;

            $('#page-container').html(html);
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);
        },
        removeProductModal: function () {
            // Destroy Select2 instances before removing modal
            $('#modalProductId').select2('destroy');
            $('#modalUomId').select2('destroy');
            $('#addProductModal').modal('hide');
            $('#addProductModal').remove();
        },

        removeProductDetailsModal: function () {
            // Destroy Select2 instance before removing modal
            $('#modalCondition').select2('destroy');
            $('#productDetailsModal').modal('hide');
        },
        loadMasterData: function () {
            // Load suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Supplier</option>';
                        $.each(response.data.data, function (i, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#supplierId').html(options);

                        // Trigger Select2 update
                        $('#supplierId').trigger('change.select2');
                    }
                });

            // Load warehouses
            TempleAPI.get('/inventory/warehouse', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Warehouse</option>';
                        $.each(response.data, function (i, warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                        });
                        $('#warehouseId').html(options);

                        // Trigger Select2 update
                        $('#warehouseId').trigger('change.select2');
                    }
                });
        },
        loadPOData: function (poId) {
            const self = this;

            TempleAPI.get(`/purchase/orders/${poId}`)
                .done(function (response) {
                    if (response.success) {
                        self.poData = response.data;

                        // Validate PO status
                        if (self.poData.status === 'CANCELLED' || self.poData.status === 'REJECTED') {
                            TempleCore.showToast('Cannot create GRN for cancelled/rejected PO', 'error');
                            TempleRouter.navigate('purchase/grn');
                            return;
                        }

                        // Filter only product items (exclude services)
                        self.items = response.data.items.filter(item => item.item_type === 'product')
                            .map(item => ({
                                ...item,
                                product_id: item.product_id || item.item_id,
                                quantity: item.quantity,
                                received_quantity: item.received_quantity || 0,
                                unit_price: item.unit_price,
                                uom_id: item.uom_id,
                                description: item.description,
                                item_name: item.product?.name || item.description
                            }));

                        if (self.items.length === 0) {
                            TempleCore.showToast('No products found in this PO to receive', 'warning');
                            TempleRouter.navigate('purchase/grn');
                            return;
                        }

                        self.render();
                        self.loadMasterData();
                        self.bindEvents();
                        setTimeout(function () {
                            $('#supplierId').val(self.poData.supplier_id).trigger('change.select2');
                            self.renderGRNItems();
                        }, 500);


                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load PO:', xhr.responseJSON);
                    TempleCore.showToast('Failed to load PO data', 'error');
                    TempleRouter.navigate('purchase/grn');
                });
        },

        bindEvents: function () {
            const self = this;

            // Back button
            $('#backBtn').on('click', function () {
                TempleRouter.navigate('purchase/grn');
            });

            // Quality check toggle
            $('#qualityCheckDone').on('change', function () {
                const isChecked = $(this).is(':checked');
                $('#qualityCheckBy, #qualityCheckDate, #qualityNotes')
                    .prop('disabled', !isChecked);

                // Handle Select2 dropdown
                if (isChecked) {
                    $('#qualityStatus').prop('disabled', false);
                    $('#qualityCheckBy').val(TempleCore.getUser().name);
                    $('#qualityCheckDate').val(moment().format('YYYY-MM-DD'));
                } else {
                    $('#qualityStatus').prop('disabled', true).val('').trigger('change.select2');
                }
            });

            // Add product (Direct GRN)
            $('#addGRNItemBtn').on('click', function () {
                self.showProductModal();
            });

            // Edit product details
            $(document).on('click', '.edit-details', function () {
                const index = $(this).data('index');
                self.showProductDetailsModal(index);
            });

            // Serial numbers counter
            $('#modalSerialNumbers').on('keyup', function () {
                const lines = $(this).val().split('\n').filter(line => line.trim() !== '');
                $('#serialCount').text(lines.length);
            });

            // Condition change
            $(document).on('select2:select', '#modalCondition', function (e) {
                const value = $(this).val();
                if (value === 'DAMAGED' || value === 'EXPIRED') {
                    $('#rejectionSection').show();
                } else {
                    $('#rejectionSection').hide();
                    $('#modalRejectionReason').val('');
                }


            });

            // Received quantity change
            $(document).on('change', '.received-qty', function () {
                const index = $(this).data('index');
                const received = parseFloat($(this).val()) || 0;
                const $row = $(this).closest('tr');

                // Auto-set accepted quantity
                $row.find('.accepted-qty').val(received);
                $row.find('.rejected-qty').val(0);

                // Check over-delivery
                const ordered = parseFloat($row.find('.ordered-qty').text()) || 0;
                const alreadyReceived = parseFloat($row.find('.already-received').text()) || 0;
                const tolerance = 10; // 10% tolerance

                if (received > (ordered - alreadyReceived) * (1 + tolerance / 100)) {
                    TempleCore.showToast('Over-delivery detected. Requires approval.', 'warning');
                    $row.addClass('table-warning');
                } else {
                    $row.removeClass('table-warning');
                }
            });

            // Accepted quantity change
            $(document).on('change', '.accepted-qty', function () {
                const received = parseFloat($(this).closest('tr').find('.received-qty').val()) || 0;
                const accepted = parseFloat($(this).val()) || 0;

                if (accepted > received) {
                    $(this).val(received);
                    TempleCore.showToast('Accepted quantity cannot exceed received quantity', 'warning');
                }

                // Calculate rejected
                const rejected = received - accepted;
                $(this).closest('tr').find('.rejected-qty').val(rejected);
            });

            // Save product details
            $('#saveProductDetailsBtn').on('click', function () {
                self.saveProductDetails();
            });

            // Save draft
            $('#saveGRNDraftBtn').on('click', function () {
                self.saveGRN('DRAFT');
            });

            // Submit form
            $('#grnForm').on('submit', function (e) {
                e.preventDefault();
                self.saveGRN('COMPLETED');
            });


        },
        // Add this to the PurchaseGrnCreatePage object after the bindEvents function:

        showProductModal: function () {
            const self = this;

            // Create and show the product selection modal
            const modalHtml = `
        <div class="modal fade" id="addProductModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Product to GRN</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3">
                            <div class="col-md-12">
                                <label class="form-label">Product <span class="text-danger">*</span></label>
                                <select class="form-select" id="modalProductId">
                                    <option value="">Select Product</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                <input type="number" class="form-control" id="modalProductQty" 
                                       min="0.001" step="0.001">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Unit Price</label>
                                <input type="number" class="form-control" id="modalUnitPrice" 
                                       min="0" step="0.01">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">UOM</label>
                                <select class="form-select" id="modalUomId">
                                    <option value="">Default UOM</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Tax Rate (%)</label>
                                <input type="number" class="form-control" id="modalTaxRate" 
                                       min="0" max="100" step="0.01" value="0">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="addProductToGRNBtn">Add Product</button>
                    </div>
                </div>
            </div>
        </div>
    `;

            // Remove existing modal if any
            $('#addProductModal').remove();

            // Append modal to body
            $('body').append(modalHtml);

            // Initialize Select2 for modal dropdowns
            $('#modalProductId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select product...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#addProductModal')
            });

            $('#modalUomId').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select UOM...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#addProductModal')
            });

            // Load products
            TempleAPI.get('/inventory/products', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Product</option>';
                        $.each(response.data.data || response.data, function (i, product) {
                            options += `<option value="${product.id}" data-name="${product.name}">${product.name}</option>`;
                        });
                        $('#modalProductId').html(options);
                        $('#modalProductId').trigger('change.select2');
                    }
                });

            // Load UOMs
            TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Default UOM</option>';
                        $.each(response.data, function (i, uom) {
                            options += `<option value="${uom.id}">${uom.name}</option>`;
                        });
                        $('#modalUomId').html(options);
                        $('#modalUomId').trigger('change.select2');
                    }
                });

            // Add product button handler
            $('#addProductToGRNBtn').off('click').on('click', function () {
                const productId = $('#modalProductId').val();
                const productName = $('#modalProductId option:selected').data('name');
                const quantity = parseFloat($('#modalProductQty').val()) || 0;
                const unitPrice = parseFloat($('#modalUnitPrice').val()) || 0;
                const uomId = $('#modalUomId').val();
                const taxRate = parseFloat($('#modalTaxRate').val()) || 0;

                // Debug logging
                console.log('Adding product with values:', {
                    productId,
                    productName,
                    quantity,
                    unitPrice,
                    uomId,
                    taxRate
                });

                if (!productId) {
                    TempleCore.showToast('Please select a product', 'warning');
                    return;
                }

                if (quantity <= 0) {
                    TempleCore.showToast('Please enter valid quantity', 'warning');
                    return;
                }

                // Check if product already exists
                const existingItem = self.items.find(item => item.product_id == productId);
                if (existingItem) {
                    TempleCore.showToast('Product already added to GRN', 'warning');
                    return;
                }

                // Add to items array
                const newItem = {
                    product_id: productId,
                    product: { name: productName },
                    item_name: productName,
                    quantity: quantity,
                    received_quantity: 0,
                    unit_price: unitPrice,
                    uom_id: uomId,
                    tax_rate: taxRate,
                    item_type: 'product'
                };

                console.log('New item being added:', newItem);
                self.items.push(newItem);

                // Re-render items table
                self.renderGRNItems();

                // Close modal
                $('#addProductModal').modal('hide');

                // Clear form
                $('#modalProductId').val('').trigger('change.select2');
                $('#modalProductQty').val('');
                $('#modalUnitPrice').val('');
                $('#modalUomId').val('').trigger('change.select2');
                $('#modalTaxRate').val('0');

                TempleCore.showToast('Product added successfully', 'success');
            });

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
            modal.show();
        },


        // Also add a remove item function
        removeGRNItem: function (index) {
            const self = this;

            TempleCore.showConfirm(
                'Remove Product',
                'Are you sure you want to remove this product from GRN?',
                function () {
                    self.items.splice(index, 1);
                    self.renderGRNItems();
                    TempleCore.showToast('Product removed', 'success');
                }
            );
        },
        renderGRNItems: function () {
            if (this.items.length === 0) {
                $('#grnItemsBody').html(`
            <tr class="no-items">
                <td colspan="10" class="text-center text-muted">No products to receive</td>
            </tr>
        `);
                return;
            }

            let html = '';
            const self = this;

            $.each(this.items, function (index, item) {
                // Debug log each item
                console.log(`Rendering item ${index}:`, item);

                const orderedQty = parseFloat(item.quantity) || 0;
                const alreadyReceived = parseFloat(item.received_quantity) || 0;
                const toReceive = orderedQty - alreadyReceived;

                html += `
            <tr data-index="${index}">
                <td>${item.product?.name || item.item_name}</td>
                <td class="ordered-qty">${orderedQty.toFixed(3)}</td>
                <td class="already-received">${alreadyReceived.toFixed(3)}</td>
                <td>
                    <input type="number" class="form-control form-control-sm received-qty" 
                           data-index="${index}" min="0" step="0.001" 
                           value="${toReceive > 0 ? toReceive.toFixed(3) : '0.000'}">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm accepted-qty" 
                           data-index="${index}" min="0" step="0.001" 
                           value="${toReceive > 0 ? toReceive.toFixed(3) : '0.000'}">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm rejected-qty" 
                           data-index="${index}" min="0" step="0.001" value="0" readonly>
                </td>
                <td class="batch-no">${item.batch_number || '-'}</td>
                <td class="expiry-date">${item.expiry_date || '-'}</td>
                <td class="serial-numbers">
                    ${item.serial_numbers && item.serial_numbers.length > 0 ?
                        `<span class="badge bg-info">${item.serial_numbers.length} SNs</span>` : ''}
                    <button type="button" class="btn btn-sm btn-outline-primary edit-details" 
                            data-index="${index}">
                        <i class="bi bi-pencil"></i> Details
                    </button>
                </td>
                <td>
                    ${self.grnType === 'DIRECT' ? `
                        <button type="button" class="btn btn-sm btn-outline-danger remove-item" 
                                data-index="${index}">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
            });

            $('#grnItemsBody').html(html);

            // Bind remove button events for Direct GRN
            if (this.grnType === 'DIRECT') {
                $('.remove-item').off('click').on('click', function () {
                    const index = $(this).data('index');
                    self.removeGRNItem(index);
                });
            }
        },
        showProductDetailsModal: function (index) {
            const item = this.items[index];

            $('#modalProductIndex').val(index);
            $('#modalProductName').text(item.product?.name || item.item_name);
            $('#modalQuantity').text(item.quantity);

            // Load existing details if any
            $('#modalBatchNo').val(item.batch_number || '');
            $('#modalMfgDate').val(item.manufacture_date || '');
            $('#modalExpiryDate').val(item.expiry_date || '');
            $('#modalSerialNumbers').val(item.serial_numbers?.join('\n') || '');
            $('#modalWarrantyPeriod').val(item.warranty_period_months || '');
            $('#modalRackLocation').val(item.rack_location || '');
            $('#modalCondition').val(item.condition || 'GOOD');

            // Initialize Select2 for condition dropdown
            $('#modalCondition').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select condition...',
                width: '100%',
                minimumResultsForSearch: -1,
                dropdownParent: $('#productDetailsModal')
            });

            // Set value and trigger change
            $('#modalCondition').val(item.condition || 'GOOD').trigger('change.select2');

            $('#productDetailsModal').modal('show');
        },

        saveProductDetails: function () {
            const index = $('#modalProductIndex').val();
            const serialNumbers = $('#modalSerialNumbers').val()
                .split('\n')
                .filter(line => line.trim() !== '');

            // Update item details
            this.items[index].batch_number = $('#modalBatchNo').val();
            this.items[index].manufacture_date = $('#modalMfgDate').val();
            this.items[index].expiry_date = $('#modalExpiryDate').val();
            this.items[index].serial_numbers = serialNumbers;
            this.items[index].warranty_period_months = $('#modalWarrantyPeriod').val();
            this.items[index].rack_location = $('#modalRackLocation').val();
            this.items[index].condition = $('#modalCondition').val();
            this.items[index].rejection_reason = $('#modalRejectionReason').val();

            // Update table display
            const $row = $(`#grnItemsBody tr[data-index="${index}"]`);
            $row.find('.batch-no').text($('#modalBatchNo').val() || '-');
            $row.find('.expiry-date').text($('#modalExpiryDate').val() || '-');
            $row.find('.serial-numbers').html(`
                <span class="badge bg-info">${serialNumbers.length} SNs</span>
                <button type="button" class="btn btn-sm btn-outline-primary edit-details ms-1" 
                        data-index="${index}">
                    <i class="bi bi-pencil"></i>
                </button>
            `);

            $('#productDetailsModal').modal('hide');
            TempleCore.showToast('Product details saved', 'success');
        },

        saveGRN: function (status) {
            const self = this;

            // Validation
            if (!$('#supplierId').val() || !$('#warehouseId').val()) {
                TempleCore.showToast('Please fill required fields', 'warning');
                return;
            }

            // Add validation for GRN date
            if (!$('#grnDate').val()) {
                TempleCore.showToast('GRN date is required', 'warning');
                return;
            }

            // Prepare items data
            const grnItems = [];
            $('#grnItemsBody tr:not(.no-items)').each(function () {
                const index = $(this).data('index');
                const item = self.items[index];

                grnItems.push({
                    po_item_id: item.id || null,
                    product_id: item.product_id,
                    description: item.description || item.item_name || '',
                    ordered_quantity: item.quantity || 0,
                    received_quantity: parseFloat($(this).find('.received-qty').val()) || 0,
                    accepted_quantity: parseFloat($(this).find('.accepted-qty').val()) || 0,
                    rejected_quantity: parseFloat($(this).find('.rejected-qty').val()) || 0,
                    batch_number: item.batch_number || null,
                    manufacture_date: item.manufacture_date || null,
                    expiry_date: item.expiry_date || null,
                    serial_numbers: item.serial_numbers || null,
                    warranty_period_months: item.warranty_period_months || null,
                    rack_location: item.rack_location || null,
                    condition_on_receipt: item.condition || 'GOOD',
                    rejection_reason: item.rejection_reason || null,
                    warehouse_id: $('#warehouseId').val(),
                    uom_id: item.uom_id || null,
                    unit_price: item.unit_price || null,
                });
            });

            // Check if there are items to save
            if (grnItems.length === 0) {
                TempleCore.showToast('Please add at least one product to the GRN', 'warning');
                return;
            }

            const data = {
                grn_type: this.grnType,
                po_id: this.poData?.id || null,
                supplier_id: $('#supplierId').val(),
                grn_date: $('#grnDate').val(), // ADD THIS LINE - was missing!
                delivery_challan_no: $('#challanNo').val() || null,
                delivery_date: $('#deliveryDate').val() || null,
                vehicle_number: $('#vehicleNumber').val() || null,
                warehouse_id: $('#warehouseId').val(),
                quality_check_done: $('#qualityCheckDone').is(':checked'),
                quality_check_by: $('#qualityCheckBy').val() || null,
                quality_check_date: $('#qualityCheckDate').val() || null,
                quality_check_notes: $('#qualityNotes').val() || null,
                status: status,
                notes: $('#grnNotes').val() || null,
                items: grnItems
            };
            console.log('GRN Data being sent:', data);
            console.log('PO Data:', this.poData);


            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/grn', data)
                .done(function (response) {
                    if (response.success) {
                        if (status === 'COMPLETED') {
                            // Complete the GRN after creation if status is COMPLETED
                            TempleAPI.post(`/purchase/grn/${response.data.id}/complete`)
                                .done(function (completeResponse) {
                                    if (completeResponse.success) {
                                        TempleCore.showToast('GRN completed. Stock updated successfully', 'success');
                                        TempleRouter.navigate('purchase/grn');
                                    }
                                })
                                .fail(function () {
                                    TempleCore.showToast('GRN created but failed to complete. Please complete manually.', 'warning');
                                    TempleRouter.navigate('purchase/grn');
                                });
                        } else {
                            TempleCore.showToast('GRN saved as draft', 'success');
                            TempleRouter.navigate('purchase/grn');
                        }
                    }
                })
                .fail(function (xhr) {
                    console.error('GRN Save Error:', xhr.responseJSON);
                    const error = xhr.responseJSON;
                    if (error && error.errors) {
                        // Show specific validation errors
                        let errorMessages = [];
                        for (let field in error.errors) {
                            errorMessages.push(error.errors[field].join(', '));
                        }
                        TempleCore.showToast(errorMessages.join(' | '), 'error');
                    } else {
                        TempleCore.showToast(error?.message || 'Failed to save GRN', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };
})(jQuery, window);