// js/pages/purchase/grn/edit.js
// GRN Edit Page
(function ($, window) {
    'use strict';

    window.PurchaseGrnEditPage = {
        grnId: null,
        currentGRN: null,
        items: [],

        init: function (params) {
            if (!params || !params.id) {
                TempleCore.showToast('Invalid GRN ID', 'error');
                TempleRouter.navigate('purchase/grn');
                return;
            }

            this.grnId = params.id;
            this.loadGRN();
        },
        initializeSelect2: function () {
            // Initialize GRN Type dropdown
            $('#grnType').select2({
                theme: 'bootstrap-5',
                width: '100%',
                minimumResultsForSearch: -1 // Disable search for 2 options
            });

            // Initialize Warehouse dropdown
            $('#warehouse').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select warehouse...',
                allowClear: true,
                width: '100%'
            });

            // Initialize Supplier dropdown
            $('#supplier').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select supplier...',
                allowClear: true,
                width: '100%'
            });

            // Initialize Purchase Order dropdown
            $('#purchaseOrder').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select PO...',
                allowClear: true,
                width: '100%'
            });

            // Initialize Invoice Reference dropdown
            $('#invoiceRef').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search and select invoice...',
                allowClear: true,
                width: '100%'
            });

            // Initialize dynamic dropdowns for existing items
            this.initializeDynamicSelect2();
        },
        initializeDynamicSelect2: function () {
            // Initialize product dropdowns
            $('.item-product').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                placeholder: 'Search product...',
                allowClear: true,
                width: '100%'
            });

            // Initialize condition dropdowns
            $('.item-condition').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                width: '100%',
                minimumResultsForSearch: -1 // Disable search for condition (only 3 options)
            });

            // Initialize warehouse dropdowns
            $('.item-warehouse').not('.select2-hidden-accessible').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select warehouse...',
                allowClear: true,
                width: '100%'
            });
        },
        loadGRN: function () {
            const self = this;

            TempleCore.showLoading(true);
            TempleAPI.get(`/purchase/grn/${this.grnId}`)
                .done(function (response) {
                    if (response.success) {
                        self.currentGRN = response.data;
                        self.items = response.data.items || [];
                        self.render();
                        self.loadMasterData();
                        self.bindEvents();
                    } else {
                        TempleCore.showToast('Failed to load GRN', 'error');
                        TempleRouter.navigate('purchase/grn');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load GRN', 'error');
                    TempleRouter.navigate('purchase/grn');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        render: function () {
            const grn = this.currentGRN;
            const isCompleted = grn.status === 'COMPLETED';
            const isCancelled = grn.status === 'CANCELLED';
            const isEditable = grn.status === 'DRAFT';

            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <h3>Edit GRN: ${grn.grn_number}</h3>
                            <span class="badge bg-${grn.status === 'COMPLETED' ? 'success' : grn.status === 'CANCELLED' ? 'danger' : 'secondary'}">
                                ${grn.status}
                            </span>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-secondary" onclick="TempleRouter.navigate('purchase/grn')">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    ${!isEditable ? `
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i> 
                            This GRN is ${grn.status.toLowerCase()} and cannot be edited.
                        </div>
                    ` : ''}
                    
                    <form id="grnEditForm">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>GRN Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">GRN Number</label>
                                        <input type="text" class="form-control" value="${grn.grn_number}" readonly>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">GRN Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="grnDate" value="${grn.grn_date}" 
                                               ${!isEditable ? 'readonly' : ''} required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">GRN Type</label>
                                        <select class="form-select" id="grnType" ${!isEditable ? 'disabled' : ''}>
                                            <option value="DIRECT" ${grn.grn_type === 'DIRECT' ? 'selected' : ''}>Direct</option>
                                            <option value="PO_BASED" ${grn.grn_type === 'PO_BASED' ? 'selected' : ''}>PO Based</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Warehouse <span class="text-danger">*</span></label>
                                        <select class="form-select" id="warehouse" ${!isEditable ? 'disabled' : ''} required>
                                            <option value="">Select Warehouse</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="row g-3 mt-2">
                                    <div class="col-md-4">
                                        <label class="form-label">Supplier <span class="text-danger">*</span></label>
                                        <select class="form-select" id="supplier" ${!isEditable ? 'disabled' : ''} required>
                                            <option value="">Select Supplier</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4" id="poSection" style="${grn.grn_type === 'PO_BASED' ? '' : 'display:none'}">
                                        <label class="form-label">Purchase Order</label>
                                        <select class="form-select" id="purchaseOrder" ${!isEditable ? 'disabled' : ''}>
                                            <option value="">Select PO</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Invoice Reference</label>
                                        <select class="form-select" id="invoiceRef" ${!isEditable ? 'disabled' : ''}>
                                            <option value="">Select Invoice</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delivery Information -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Delivery Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Delivery Order No</label>
                                        <input type="text" class="form-control" id="challanNo" 
                                               value="${grn.delivery_challan_no || ''}" ${!isEditable ? 'readonly' : ''}>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Delivery Date</label>
                                        <input type="date" class="form-control" id="deliveryDate" 
                                               value="${grn.delivery_date || ''}" ${!isEditable ? 'readonly' : ''}>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Vehicle Number</label>
                                        <input type="text" class="form-control" id="vehicleNumber" 
                                               value="${grn.vehicle_number || ''}" ${!isEditable ? 'readonly' : ''}>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Items Section -->
                        <div class="card mb-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5>Items</h5>
                                ${isEditable ? `
                                    <button type="button" class="btn btn-sm btn-primary" id="addItemBtn">
                                        <i class="bi bi-plus"></i> Add Item
                                    </button>
                                ` : ''}
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th width="25%">Product</th>
                                                <th>Ordered Qty</th>
                                                <th>Received Qty</th>
                                                <th>Accepted Qty</th>
                                                <th>Rejected Qty</th>
                                                <th>Condition</th>
                                                <th>Batch No</th>
                                                <th>Expiry Date</th>
                                                <th>Warehouse</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="itemsTableBody">
                                            <!-- Items will be rendered here -->
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
                                            <input class="form-check-input" type="checkbox" id="qualityCheckDone" 
                                                   ${grn.quality_check_done ? 'checked' : ''} ${!isEditable ? 'disabled' : ''}>
                                            <label class="form-check-label" for="qualityCheckDone">
                                                Quality Check Done
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Check Date</label>
                                        <input type="date" class="form-control" id="qualityCheckDate" 
                                               value="${grn.quality_check_date || ''}" ${!isEditable ? 'readonly' : ''}>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Quality Notes</label>
                                        <textarea class="form-control" id="qualityNotes" rows="2" 
                                                  ${!isEditable ? 'readonly' : ''}>${grn.quality_check_notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Notes Section -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-12">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="notes" rows="3" 
                                                  ${!isEditable ? 'readonly' : ''}>${grn.notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        ${isEditable ? `
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex gap-2 justify-content-end">
                                        <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('purchase/grn')">
                                            Cancel
                                        </button>
                                        <button type="submit" class="btn btn-primary" id="saveBtn">
                                            <i class="bi bi-save"></i> Save Changes
                                        </button>
                                        <button type="button" class="btn btn-success" id="saveAndCompleteBtn">
                                            <i class="bi bi-check-circle"></i> Save & Complete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </form>
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
            this.renderItems();
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);
        },

        renderItems: function () {
            const self = this;
            const isEditable = this.currentGRN.status === 'DRAFT';
            let html = '';

            if (this.items.length === 0) {
                html = `<tr><td colspan="10" class="text-center">No items added</td></tr>`;
            } else {
                $.each(this.items, function (index, item) {
                    html += self.renderItemRow(item, index, isEditable);
                });
            }

            $('#itemsTableBody').html(html);
        },

        renderItemRow: function (item, index, isEditable) {
            return `
                <tr data-index="${index}">
                    <td>
                        <select class="form-select form-select-sm item-product" data-index="${index}" 
                                ${!isEditable ? 'disabled' : ''}>
                            <option value="${item.product_id}">${item.product?.name || item.description}</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm item-ordered-qty" 
                               value="${item.ordered_quantity || 0}" readonly>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm item-received-qty" 
                               data-index="${index}" value="${item.received_quantity}" min="0" 
                               ${!isEditable ? 'readonly' : ''}>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm item-accepted-qty" 
                               data-index="${index}" value="${item.accepted_quantity}" min="0" 
                               ${!isEditable ? 'readonly' : ''}>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm item-rejected-qty" 
                               value="${item.rejected_quantity || 0}" readonly>
                    </td>
                    <td>
                        <select class="form-select form-select-sm item-condition" data-index="${index}"
                                ${!isEditable ? 'disabled' : ''}>
                            <option value="GOOD" ${item.condition_on_receipt === 'GOOD' ? 'selected' : ''}>Good</option>
                            <option value="DAMAGED" ${item.condition_on_receipt === 'DAMAGED' ? 'selected' : ''}>Damaged</option>
                            <option value="EXPIRED" ${item.condition_on_receipt === 'EXPIRED' ? 'selected' : ''}>Expired</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm item-batch" 
                               data-index="${index}" value="${item.batch_number || ''}" 
                               ${!isEditable ? 'readonly' : ''}>
                    </td>
                    <td>
                        <input type="date" class="form-control form-control-sm item-expiry" 
                               data-index="${index}" value="${item.expiry_date || ''}" 
                               ${!isEditable ? 'readonly' : ''}>
                    </td>
                    <td>
                        <select class="form-select form-select-sm item-warehouse" data-index="${index}"
                                ${!isEditable ? 'disabled' : ''}>
                            <option value="${item.warehouse_id}">${item.warehouse?.name || 'Select'}</option>
                        </select>
                    </td>
                    <td>
                        ${isEditable ? `
                            <button type="button" class="btn btn-sm btn-danger remove-item" data-index="${index}">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        },

        loadMasterData: function () {
            const self = this;
            const grn = this.currentGRN;

            // Load suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Supplier</option>';
                        $.each(response.data.data, function (i, supplier) {
                            const selected = supplier.id == grn.supplier_id ? 'selected' : '';
                            options += `<option value="${supplier.id}" ${selected}>${supplier.name}</option>`;
                        });
                        $('#supplier').html(options);

                        // Trigger Select2 update and set value
                        $('#supplier').val(grn.supplier_id).trigger('change.select2');
                    }
                });

            // Load warehouses
            TempleAPI.get('/inventory/warehouse', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Warehouse</option>';
                        $.each(response.data, function (i, warehouse) {
                            const selected = warehouse.id == grn.warehouse_id ? 'selected' : '';
                            options += `<option value="${warehouse.id}" ${selected}>${warehouse.name}</option>`;
                        });
                        $('#warehouse').html(options);

                        // Trigger Select2 update and set value
                        $('#warehouse').val(grn.warehouse_id).trigger('change.select2');

                        // Also update item warehouses
                        self.updateItemWarehouses(response.data);
                    }
                });

            // Load POs if supplier is selected
            if (grn.supplier_id) {
                TempleAPI.get('/purchase/orders', {
                    supplier_id: grn.supplier_id,
                    status: 'APPROVED'
                })
                    .done(function (response) {
                        if (response.success) {
                            let options = '<option value="">Select PO</option>';
                            $.each(response.data.data, function (i, po) {
                                const selected = po.id == grn.po_id ? 'selected' : '';
                                options += `<option value="${po.id}" ${selected}>${po.po_number}</option>`;
                            });
                            $('#purchaseOrder').html(options);

                            // Trigger Select2 update
                            $('#purchaseOrder').val(grn.po_id).trigger('change.select2');
                        }
                    });

                // Load invoices
                TempleAPI.get('/purchase/invoices', {
                    supplier_id: grn.supplier_id,
                    status: 'POSTED'
                })
                    .done(function (response) {
                        if (response.success) {
                            let options = '<option value="">Select Invoice</option>';
                            $.each(response.data.data, function (i, invoice) {
                                const selected = invoice.id == grn.invoice_id ? 'selected' : '';
                                options += `<option value="${invoice.id}" ${selected}>${invoice.invoice_number}</option>`;
                            });
                            $('#invoiceRef').html(options);

                            // Trigger Select2 update
                            $('#invoiceRef').val(grn.invoice_id).trigger('change.select2');
                        }
                    });
            }

            // Load products
            this.loadProducts();
        },

        loadProducts: function () {
            const self = this;

            TempleAPI.get('/inventory/products', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        // Make sure we're getting the products array correctly
                        self.products = response.data.data || response.data || [];
                        console.log('Products loaded:', self.products.length);
                        self.updateItemProducts();
                    }
                })
                .fail(function () {
                    console.error('Failed to load products');
                    self.products = [];
                });
        },

        updateItemProducts: function () {
            const self = this;

            $('.item-product').each(function () {
                const $select = $(this);
                const index = parseInt($select.data('index'));
                const item = self.items[index];

                if (!item) return;

                // Destroy existing Select2 if present
                if ($select.hasClass('select2-hidden-accessible')) {
                    $select.select2('destroy');
                }

                const currentValue = String(item.product_id || '');

                let options = '<option value="">Select Product</option>';
                if (self.products && self.products.length > 0) {
                    $.each(self.products, function (i, product) {
                        if (!product || !product.id) return;

                        const productId = String(product.id);
                        const selected = (productId === currentValue) ? 'selected' : '';
                        options += `<option value="${productId}" ${selected}>${product.name || 'Unknown Product'}</option>`;
                    });
                }

                $select.html(options);

                // Reinitialize Select2
                $select.select2({
                    theme: 'bootstrap-5',
                    placeholder: 'Search product...',
                    allowClear: true,
                    width: '100%'
                });

                // Set value through Select2
                if (currentValue) {
                    $select.val(currentValue).trigger('change.select2');
                }
            });
        },

        updateItemWarehouses: function (warehouses) {
            const self = this;

            $('.item-warehouse').each(function () {
                const $select = $(this);
                const index = $select.data('index');
                const currentValue = self.items[index]?.warehouse_id;

                // Destroy existing Select2 if present
                if ($select.hasClass('select2-hidden-accessible')) {
                    $select.select2('destroy');
                }

                let options = '<option value="">Select Warehouse</option>';
                $.each(warehouses, function (i, warehouse) {
                    const selected = warehouse.id == currentValue ? 'selected' : '';
                    options += `<option value="${warehouse.id}" ${selected}>${warehouse.name}</option>`;
                });
                $select.html(options);

                // Reinitialize Select2
                $select.select2({
                    theme: 'bootstrap-5',
                    placeholder: 'Select warehouse...',
                    allowClear: true,
                    width: '100%'
                });

                // Set value through Select2
                if (currentValue) {
                    $select.val(currentValue).trigger('change.select2');
                }
            });
        },
        bindEvents: function () {
            const self = this;

            // GRN Type change
            $('#grnType').on('select2:select', function (e) {
                if ($(this).val() === 'PO_BASED') {
                    $('#poSection').show();
                } else {
                    $('#poSection').hide();
                    $('#purchaseOrder').val('').trigger('change.select2');
                }
            });
            // Supplier change
            $('#supplier').on('select2:select select2:unselect', function (e) {
                const supplierId = $(this).val();
                if (supplierId) {
                    // Load POs for supplier
                    TempleAPI.get('/purchase/orders', {
                        supplier_id: supplierId,
                        status: 'APPROVED'
                    })
                        .done(function (response) {
                            if (response.success) {
                                let options = '<option value="">Select PO</option>';
                                $.each(response.data.data, function (i, po) {
                                    options += `<option value="${po.id}">${po.po_number}</option>`;
                                });
                                $('#purchaseOrder').html(options).trigger('change.select2');
                            }
                        });

                    // Load invoices for supplier
                    TempleAPI.get('/purchase/invoices', {
                        supplier_id: supplierId,
                        status: 'POSTED'
                    })
                        .done(function (response) {
                            if (response.success) {
                                let options = '<option value="">Select Invoice</option>';
                                $.each(response.data.data, function (i, invoice) {
                                    options += `<option value="${invoice.id}">${invoice.invoice_number}</option>`;
                                });
                                $('#invoiceRef').html(options).trigger('change.select2');
                            }
                        });
                } else {
                    $('#purchaseOrder').html('<option value="">Select PO</option>').trigger('change.select2');
                    $('#invoiceRef').html('<option value="">Select Invoice</option>').trigger('change.select2');
                }
            });

            // Update item data - use both regular and Select2 events
            $(document).on('select2:select select2:unselect change',
                '.item-product, .item-condition, .item-batch, .item-expiry, .item-warehouse',
                function () {
                    const index = $(this).data('index');
                    self.updateItemData(index);
                }
            );


            // Add item button
            $('#addItemBtn').on('click', function () {
                self.addNewItem();
            });

            // Remove item
            $(document).on('click', '.remove-item', function () {
                const index = $(this).data('index');
                self.removeItem(index);
            });

            // Update quantities
            $(document).on('change', '.item-received-qty', function () {
                const index = $(this).data('index');
                self.updateQuantities(index);
            });

            $(document).on('change', '.item-accepted-qty', function () {
                const index = $(this).data('index');
                self.updateQuantities(index);
            });

            // Update item data


            // Form submission
            $('#grnEditForm').on('submit', function (e) {
                e.preventDefault();
                self.saveGRN(false);
            });

            // Save and Complete
            $('#saveAndCompleteBtn').on('click', function () {
                self.saveGRN(true);
            });
        },

        addNewItem: function () {
            const newItem = {
                product_id: '',
                ordered_quantity: 0,
                received_quantity: 0,
                accepted_quantity: 0,
                rejected_quantity: 0,
                condition_on_receipt: 'GOOD',
                batch_number: '',
                expiry_date: '',
                warehouse_id: $('#warehouse').val(),
                serial_numbers: null,
                rack_location: null,
                warranty_period_months: null,
                warranty_end_date: null
            };

            this.items.push(newItem);
            this.renderItems();
            this.updateItemProducts();

            // Initialize Select2 for the new row
            const newIndex = this.items.length - 1;

            // Initialize condition Select2 for new item
            $(`.item-condition[data-index="${newIndex}"]`).select2({
                theme: 'bootstrap-5',
                width: '100%',
                minimumResultsForSearch: -1
            });

            // Load warehouses for new item
            const warehouses = [];
            $('#warehouse option').each(function () {
                if ($(this).val()) {
                    warehouses.push({
                        id: $(this).val(),
                        name: $(this).text()
                    });
                }
            });
            this.updateItemWarehouses(warehouses);
        },

        removeItem: function (index) {
            // Destroy Select2 instances before removing
            const $row = $(`tr[data-index="${index}"]`);
            $row.find('.select2-hidden-accessible').each(function () {
                $(this).select2('destroy');
            });

            this.items.splice(index, 1);
            this.renderItems();
            this.updateItemProducts();

            // Reinitialize Select2 for remaining items
            this.initializeDynamicSelect2();
        },

        updateQuantities: function (index) {
            const receivedQty = parseFloat($(`.item-received-qty[data-index="${index}"]`).val()) || 0;
            const acceptedQty = parseFloat($(`.item-accepted-qty[data-index="${index}"]`).val()) || 0;

            if (acceptedQty > receivedQty) {
                TempleCore.showToast('Accepted quantity cannot exceed received quantity', 'warning');
                $(`.item-accepted-qty[data-index="${index}"]`).val(receivedQty);
                this.items[index].accepted_quantity = receivedQty;
            } else {
                this.items[index].received_quantity = receivedQty;
                this.items[index].accepted_quantity = acceptedQty;
            }

            const rejectedQty = receivedQty - acceptedQty;
            $(`.item-rejected-qty[data-index="${index}"]`).val(rejectedQty);
            this.items[index].rejected_quantity = rejectedQty;
        },

        updateItemData: function (index) {
            if (!this.items[index]) return;

            this.items[index].product_id = $(`.item-product[data-index="${index}"]`).val();
            this.items[index].condition_on_receipt = $(`.item-condition[data-index="${index}"]`).val();
            this.items[index].batch_number = $(`.item-batch[data-index="${index}"]`).val();
            this.items[index].expiry_date = $(`.item-expiry[data-index="${index}"]`).val();
            this.items[index].warehouse_id = $(`.item-warehouse[data-index="${index}"]`).val();

            // Handle serial_numbers - ensure it's always an array or null
            const serialNumbers = $(`.item-serial[data-index="${index}"]`).val();
            if (serialNumbers && serialNumbers.trim()) {
                // If serial numbers exist, split by comma and trim each value
                this.items[index].serial_numbers = serialNumbers.split(',').map(s => s.trim()).filter(s => s);
            } else {
                // If empty, set to null or empty array
                this.items[index].serial_numbers = null;
            }
        },

        validateForm: function () {
            // Check required fields
            if (!$('#grnDate').val()) {
                TempleCore.showToast('GRN Date is required', 'warning');
                return false;
            }

            if (!$('#supplier').val()) {
                TempleCore.showToast('Supplier is required', 'warning');
                return false;
            }

            if (!$('#warehouse').val()) {
                TempleCore.showToast('Warehouse is required', 'warning');
                return false;
            }

            // Check items
            if (this.items.length === 0) {
                TempleCore.showToast('At least one item is required', 'warning');
                return false;
            }

            // Validate each item
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];

                if (!item.product_id) {
                    TempleCore.showToast(`Product is required for item ${i + 1}`, 'warning');
                    return false;
                }

                if (!item.warehouse_id) {
                    TempleCore.showToast(`Warehouse is required for item ${i + 1}`, 'warning');
                    return false;
                }

                if (item.accepted_quantity > item.received_quantity) {
                    TempleCore.showToast(`Accepted quantity cannot exceed received quantity for item ${i + 1}`, 'warning');
                    return false;
                }
            }

            return true;
        },

        saveGRN: function (complete) {
            const self = this;

            if (!this.validateForm()) {
                return;
            }

            // Process items to ensure proper data types
            const processedItems = this.items.map(item => {
                const processedItem = {
                    product_id: item.product_id,
                    ordered_quantity: item.ordered_quantity || 0,
                    received_quantity: parseFloat(item.received_quantity) || 0,
                    accepted_quantity: parseFloat(item.accepted_quantity) || 0,
                    rejected_quantity: parseFloat(item.rejected_quantity) || 0,
                    condition_on_receipt: item.condition_on_receipt || 'GOOD',
                    batch_number: item.batch_number || null,
                    expiry_date: item.expiry_date || null,
                    warehouse_id: item.warehouse_id,
                    rack_location: item.rack_location || null,
                    warranty_period_months: item.warranty_period_months || null,
                    warranty_end_date: item.warranty_end_date || null,
                    unit_price: item.unit_price || null,
                    uom_id: item.uom_id || null,
                    notes: item.notes || null
                };

                // Handle serial_numbers - must be array or null
                if (item.serial_numbers) {
                    if (Array.isArray(item.serial_numbers)) {
                        processedItem.serial_numbers = item.serial_numbers;
                    } else if (typeof item.serial_numbers === 'string') {
                        // Convert string to array
                        processedItem.serial_numbers = item.serial_numbers
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s);
                    } else {
                        processedItem.serial_numbers = null;
                    }
                } else {
                    processedItem.serial_numbers = null;
                }

                // Include ID if updating existing item
                if (item.id) {
                    processedItem.id = item.id;
                }

                return processedItem;
            });

            const data = {
                grn_type: $('#grnType').val(),
                grn_date: $('#grnDate').val(),
                supplier_id: $('#supplier').val(),
                warehouse_id: $('#warehouse').val(),
                po_id: $('#purchaseOrder').val() || null,
                invoice_id: $('#invoiceRef').val() || null,
                delivery_challan_no: $('#challanNo').val(),
                delivery_date: $('#deliveryDate').val() || null,
                vehicle_number: $('#vehicleNumber').val(),
                quality_check_done: $('#qualityCheckDone').is(':checked'),
                quality_check_date: $('#qualityCheckDate').val() || null,
                quality_check_notes: $('#qualityNotes').val(),
                notes: $('#notes').val(),
                items: processedItems
            };

            console.log('Sending data:', data); // Debug log

            TempleCore.showLoading(true);

            TempleAPI.put(`/purchase/grn/${this.grnId}`, data)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('GRN updated successfully', 'success');

                        if (complete) {
                            self.completeGRN();
                        } else {
                            TempleRouter.navigate('purchase/grn');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update GRN', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    console.error('Save error:', response); // Debug log
                    TempleCore.showToast(response?.message || 'Failed to update GRN', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },
        completeGRN: function () {
            TempleCore.showConfirm(
                'Complete GRN',
                'Completing GRN will update stock levels. This action cannot be undone. Are you sure?',
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post(`/purchase/grn/${self.grnId}/complete`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('GRN completed and stock updated successfully', 'success');
                                TempleRouter.navigate('purchase/grn');
                            } else {
                                TempleCore.showToast(response.message || 'Failed to complete GRN', 'error');
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to complete GRN', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        }
    };
})(jQuery, window);