// js/pages/purchase/requests/edit.js


(function ($, window) {
    'use strict';

    window.PurchaseRequestsEditPage = {
        currentPrId: null,
        currentPr: null,
        items: [],
        deletedItems: [],

        init: function (params) {
            this.currentPrId = params?.id || this.getPrIdFromUrl();

            if (!this.currentPrId) {
                TempleCore.showToast('Purchase Request ID not provided', 'error');
                TempleRouter.navigate('purchase/requests');
                return;
            }

            this.render();
            this.loadPr();
            this.bindEvents();
        },

        getPrIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },

        initializeSelect2: function () {
            // Initialize Priority dropdown
            $('#priority').select2({
                theme: 'bootstrap-5',
                width: '100%',
                minimumResultsForSearch: -1
            });

            // Initialize modal dropdowns
            $('#itemType').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select type...',
                width: '100%',
                minimumResultsForSearch: -1,
                dropdownParent: $('#itemModal')
            });

            $('#itemSelect').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select item...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#itemModal')
            });

            $('#itemUom').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select UOM...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#itemModal')
            });

            $('#itemSupplier').select2({
                theme: 'bootstrap-5',
                placeholder: 'Select supplier...',
                allowClear: true,
                width: '100%',
                dropdownParent: $('#itemModal')
            });
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Edit Purchase Request</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="backBtn">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading purchase request...</p>
                    </div>
                    
                    <!-- Form Content -->
                    <div id="formContent" style="display: none;">
                        <!-- Conversion Alert (shown only if converted) -->
                        <div class="alert alert-warning mb-3" id="conversionAlert" style="display: none;">
                            <i class="bi bi-exclamation-triangle"></i> 
                            This PR has been converted to PO and cannot be edited.
                        </div>
                        
                        <form id="prEditForm">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <h5>Request Details</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <div class="col-md-3">
                                            <label class="form-label">PR Number</label>
                                            <input type="text" class="form-control" id="prNumber" disabled>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Request Date</label>
                                            <input type="date" class="form-control" id="requestDate" disabled>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Priority</label>
                                            <select class="form-select" id="priority">
                                                <option value="NORMAL">Normal</option>
                                                <option value="LOW">Low</option>
                                                <option value="HIGH">High</option>
                                                <option value="URGENT">Urgent</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Required By Date</label>
                                            <input type="date" class="form-control" id="requiredByDate" 
                                                   min="${new Date().toISOString().split('T')[0]}">
                                        </div>
                                        <div class="col-md-12">
                                            <label class="form-label">Purpose <span class="text-danger">*</span></label>
                                            <textarea class="form-control" id="purpose" rows="2" required></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
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
                                                    <th width="15%">Type</th>
                                                    <th width="25%">Item</th>
                                                    <th width="25%">Description</th>
                                                    <th width="10%">Quantity</th>
                                                    <th width="10%">UOM</th>
                                                    <th width="10%">Supplier</th>
                                                    <th width="5%"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="itemsTableBody">
                                                <tr class="no-items">
                                                    <td colspan="7" class="text-center text-muted">
                                                        Loading items...
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-12">
                                            <label class="form-label">Notes</label>
                                            <textarea class="form-control" id="notes" rows="3"></textarea>
                                        </div>
                                    </div>
                                    <div class="row mt-3">
                                        <div class="col-md-12 text-end">
                                            <button type="button" class="btn btn-secondary" id="cancelBtn">
                                                Cancel
                                            </button>
                                            <button type="submit" class="btn btn-primary ms-2" id="saveBtn">
                                                <i class="bi bi-check-circle"></i> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Item Modal -->
                <div class="modal fade" id="itemModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="itemModalTitle">Add Item</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <input type="hidden" id="editItemIndex" value="">
                                    <div class="col-md-4">
                                        <label class="form-label">Type <span class="text-danger">*</span></label>
                                        <select class="form-select" id="itemType">
                                            <option value="">Select Type</option>
                                            <option value="product">Product</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Item <span class="text-danger">*</span></label>
                                        <select class="form-select" id="itemSelect" disabled>
                                            <option value="">Select item type first</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="itemDescription" rows="2"></textarea>
                                    </div>
                                    
                                    <!-- Quantity field - shown only for products -->
                                    <div class="col-md-4" id="quantityField" style="display: none;">
                                        <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="itemQuantity" 
                                               min="0.001" step="0.001">
                                    </div>
                                    
                                    <!-- UOM field - shown only for products -->
                                    <div class="col-md-4" id="uomField" style="display: none;">
                                        <label class="form-label">UOM <span class="text-danger">*</span></label>
                                        <select class="form-select" id="itemUom">
                                            <option value="">Select UOM</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Supplier field - always shown -->
                                    <div class="col-md-4" id="supplierField">
                                        <label class="form-label">Preferred Supplier</label>
                                        <select class="form-select" id="itemSupplier">
                                            <option value="">Select Supplier</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveItemBtn">Save Item</button>
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
                    
                    .modal .select2-container {
                        width: 100% !important;
                    }
                    
                    .select2-container--bootstrap-5 .select2-dropdown {
                        z-index: 1056;
                    }
                </style>
            `;

            $('#page-container').html(html);
        },

        loadPr: function () {
            const self = this;

            TempleAPI.get('/purchase/requests/' + this.currentPrId)
                .done(function (response) {
                    if (response.success) {
                        self.currentPr = response.data;
                        
                        // Check if already converted
                        if (self.currentPr.converted_to_po) {
                            $('#conversionAlert').show();
                            self.disableForm();
                        }
                        
                        self.displayPr();
                        self.loadMasterData();
                        $('#loadingState').hide();
                        $('#formContent').show();
                    } else {
                        TempleCore.showToast('Failed to load purchase request', 'error');
                        TempleRouter.navigate('purchase/requests');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load purchase request', 'error');
                    TempleRouter.navigate('purchase/requests');
                });
        },

        displayPr: function () {
            const pr = this.currentPr;

            // Set basic fields
            $('#prNumber').val(pr.pr_number);
            $('#requestDate').val(pr.request_date);
            $('#priority').val(pr.priority);
            $('#purpose').val(pr.purpose);
            $('#requiredByDate').val(pr.required_by_date);
            $('#notes').val(pr.notes || '');
            
            setTimeout(() => {
                this.initializeSelect2();
            }, 100);

            // Load items
            if (pr.items && pr.items.length > 0) {
                this.items = pr.items.map(item => {
                    // Clean up service items - set quantity to 0 and UOM to null
                    if (item.item_type === 'service') {
                        return {
                            id: item.id,
                            item_type: item.item_type,
                            product_id: null,
                            service_id: item.service_id,
                            item_name: item.service?.name || '',
                            description: item.description,
                            quantity: 0.00,
                            uom_id: null,
                            uom_name: '-',
                            preferred_supplier_id: item.preferred_supplier_id,
                            supplier_name: item.preferredSupplier?.name ||
                                item.preferred_supplier?.name ||
                                item.supplier?.name ||
                                ''
                        };
                    } else {
                        return {
                            id: item.id,
                            item_type: item.item_type,
                            product_id: item.product_id,
                            service_id: null,
                            item_name: item.product?.name || '',
                            description: item.description,
                            quantity: item.quantity,
                            uom_id: item.uom_id,
                            uom_name: item.uom?.name || '',
                            preferred_supplier_id: item.preferred_supplier_id,
                            supplier_name: item.preferredSupplier?.name ||
                                item.preferred_supplier?.name ||
                                item.supplier?.name ||
                                ''
                        };
                    }
                });
                this.renderItemsTable();
            }
        },

        disableForm: function () {
            // Disable all form inputs when converted
            $('#purpose, #requiredByDate, #notes').prop('disabled', true);
            $('#priority').prop('disabled', true).trigger('change.select2');
            $('#addItemBtn, #saveBtn').hide();
            $('.remove-item, .edit-item').hide();
        },

        loadMasterData: function () {
            // Load UOMs
            TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success && response.data) {
                        let options = '<option value="">Select UOM</option>';
                        $.each(response.data, function (i, uom) {
                            options += `<option value="${uom.id}">${uom.name}</option>`;
                        });
                        $('#itemUom').html(options);
                        $('#itemUom').trigger('change.select2');
                    }
                });

            // Load Suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success && response.data) {
                        let options = '<option value="">Select Supplier</option>';
                        const suppliers = response.data.data || response.data;
                        $.each(suppliers, function (i, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#itemSupplier').html(options);
                        $('#itemSupplier').trigger('change.select2');
                    }
                });
        },

        toggleFieldsByType: function (type) {
            if (type === 'product') {
                // Show quantity and UOM fields for products
                $('#quantityField').show();
                $('#uomField').show();
                // Adjust supplier field width
                $('#supplierField').removeClass('col-md-12').addClass('col-md-4');
            } else if (type === 'service') {
                // Hide quantity and UOM fields for services
                $('#quantityField').hide();
                $('#uomField').hide();
                // Adjust supplier field width to take full remaining space
                $('#supplierField').removeClass('col-md-4').addClass('col-md-12');
                // Clear values when hiding
                $('#itemQuantity').val('');
                $('#itemUom').val('').trigger('change');
            } else {
                // Default state - hide fields
                $('#quantityField').hide();
                $('#uomField').hide();
                $('#supplierField').removeClass('col-md-12').addClass('col-md-4');
            }
        },

        bindEvents: function () {
            const self = this;

            $('#backBtn, #cancelBtn').on('click', function () {
                TempleRouter.navigate('purchase/requests');
            });

            $('#addItemBtn').on('click', function () {
                self.showItemModal();
            });

            $('#itemType').on('select2:select', function (e) {
                const type = $(this).val();
                if (type) {
                    self.loadItems(type);
                    self.toggleFieldsByType(type);
                } else {
                    $('#itemSelect').prop('disabled', true)
                        .html('<option value="">Select item type first</option>')
                        .trigger('change.select2');
                    self.toggleFieldsByType('');
                }
            });

            $('#saveItemBtn').on('click', function () {
                self.saveItem();
            });

            $(document).on('click', '.edit-item', function () {
                const index = $(this).data('index');
                self.editItem(index);
            });

            $(document).on('click', '.remove-item', function () {
                const index = $(this).data('index');
                self.removeItem(index);
            });

            $('#prEditForm').on('submit', function (e) {
                e.preventDefault();
                self.savePr();
            });
        },

        loadItems: function (type) {
            const endpoint = type === 'product' ? '/inventory/products' : '/purchase/services';

            TempleAPI.get(endpoint, { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select ' + type + '</option>';
                        const items = response.data.data || response.data;
                        $.each(items, function (i, item) {
                            options += `<option value="${item.id}" data-name="${item.name}">${item.name}</option>`;
                        });
                        $('#itemSelect').prop('disabled', false).html(options);
                        $('#itemSelect').trigger('change.select2');
                    }
                });
        },

        showItemModal: function (editIndex) {
            const isEdit = editIndex !== undefined;

            $('#itemModalTitle').text(isEdit ? 'Edit Item' : 'Add Item');
            $('#editItemIndex').val(isEdit ? editIndex : '');

            // Reset form
            $('#itemType').val('').trigger('change.select2');
            $('#itemSelect').val('').trigger('change.select2');
            $('#itemDescription').val('');
            $('#itemQuantity').val('');
            $('#itemUom').val('').trigger('change.select2');
            $('#itemSupplier').val('').trigger('change.select2');
            this.toggleFieldsByType(''); // Reset field visibility

            if (isEdit) {
                const item = this.items[editIndex];
                $('#itemType').val(item.item_type).trigger('change.select2');
                this.loadItems(item.item_type);
                this.toggleFieldsByType(item.item_type);

                setTimeout(function () {
                    $('#itemSelect').val(item.product_id || item.service_id).trigger('change.select2');
                    $('#itemDescription').val(item.description);
                    
                    if (item.item_type === 'product') {
                        $('#itemQuantity').val(item.quantity);
                        $('#itemUom').val(item.uom_id).trigger('change.select2');
                    }
                    
                    $('#itemSupplier').val(item.preferred_supplier_id || '').trigger('change.select2');
                }, 500);
            }

            $('#itemModal').modal('show');
        },

        editItem: function (index) {
            this.showItemModal(index);
        },

        saveItem: function () {
            const type = $('#itemType').val();
            const itemId = $('#itemSelect').val();
            const itemName = $('#itemSelect option:selected').data('name');
            const description = $('#itemDescription').val();
            const supplierId = $('#itemSupplier').val();
            const supplierName = $('#itemSupplier option:selected').text();

            // Validation
            if (!type || !itemId) {
                TempleCore.showToast('Please select an item type and item', 'warning');
                return;
            }

            let quantity = 0.00;
            let uomId = null;
            let uomName = '-';

            if (type === 'product') {
                // For products, validate and get quantity and UOM
                quantity = parseFloat($('#itemQuantity').val());
                uomId = $('#itemUom').val();
                uomName = $('#itemUom option:selected').text();

                if (!quantity || quantity <= 0) {
                    TempleCore.showToast('Please enter a valid quantity', 'warning');
                    return;
                }

                if (!uomId) {
                    TempleCore.showToast('Please select a UOM', 'warning');
                    return;
                }
                
                uomId = parseInt(uomId);
            }
            // For services, quantity stays 0.00 and uomId stays null

            const item = {
                item_type: type,
                product_id: type === 'product' ? parseInt(itemId) : null,
                service_id: type === 'service' ? parseInt(itemId) : null,
                item_name: itemName,
                description: description,
                quantity: quantity,
                uom_id: uomId,
                uom_name: type === 'product' && uomName !== 'Select UOM' ? uomName : '-',
                preferred_supplier_id: supplierId || null,
                supplier_name: supplierName !== 'Select Supplier' ? supplierName : ''
            };

            const editIndex = $('#editItemIndex').val();
            if (editIndex !== '') {
                if (this.items[editIndex].id) {
                    item.id = this.items[editIndex].id;
                }
                this.items[editIndex] = item;
            } else {
                this.items.push(item);
            }

            this.renderItemsTable();
            $('#itemModal').modal('hide');
        },

        removeItem: function (index) {
            const item = this.items[index];

            if (item.id) {
                this.deletedItems.push(item.id);
            }

            this.items.splice(index, 1);
            this.renderItemsTable();
        },

        renderItemsTable: function () {
            if (this.items.length === 0) {
                $('#itemsTableBody').html(`
                    <tr class="no-items">
                        <td colspan="7" class="text-center text-muted">
                            No items added. Click "Add Item" to begin.
                        </td>
                    </tr>
                `);
                return;
            }

            let html = '';
            const isEditable = !this.currentPr?.converted_to_po;

            $.each(this.items, function (index, item) {
                const displayQuantity = item.item_type === 'service' ? '-' : item.quantity;
                const displayUom = item.item_type === 'service' ? '-' : item.uom_name;
                
                html += `
                    <tr>
                        <td>${item.item_type === 'product' ? 'Product' : 'Service'}</td>
                        <td>${item.item_name}</td>
                        <td>${item.description || '-'}</td>
                        <td>${displayQuantity}</td>
                        <td>${displayUom}</td>
                        <td>${item.supplier_name || '-'}</td>
                        <td>
                            ${isEditable ? `
                                <button type="button" class="btn btn-sm btn-warning edit-item me-1" 
                                        data-index="${index}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-danger remove-item" 
                                        data-index="${index}" title="Remove">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            });

            $('#itemsTableBody').html(html);
        },

        savePr: function () {
            const self = this;

            if (!$('#purpose').val().trim()) {
                TempleCore.showToast('Please enter the purpose', 'warning');
                return;
            }

            if (this.items.length === 0) {
                TempleCore.showToast('Please add at least one item', 'warning');
                return;
            }

            const data = {
                purpose: $('#purpose').val(),
                required_by_date: $('#requiredByDate').val() || null,
                priority: $('#priority').val(),
                notes: $('#notes').val(),
                items: this.items.map(item => ({
                    id: item.id || null,
                    item_type: item.item_type,
                    product_id: item.product_id,
                    service_id: item.service_id,
                    description: item.description,
                    quantity: item.quantity,
                    uom_id: item.uom_id,
                    preferred_supplier_id: item.preferred_supplier_id
                })),
                deleted_items: this.deletedItems
            };

            TempleCore.showLoading(true);

            TempleAPI.put('/purchase/requests/' + this.currentPrId, data)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Purchase request updated successfully', 'success');
                        TempleRouter.navigate('purchase/requests');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save PR', 'error');
                    }
                })
                .fail(function (xhr) {
                    if (xhr.status === 422 && xhr.responseJSON?.errors) {
                        let errorMessage = 'Validation errors:<br>';
                        $.each(xhr.responseJSON.errors, function (field, messages) {
                            errorMessage += `${field}: ${messages.join(', ')}<br>`;
                        });
                        TempleCore.showToast(errorMessage, 'error');
                    } else {
                        const error = xhr.responseJSON?.message || 'Failed to save PR';
                        TempleCore.showToast(error, 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);