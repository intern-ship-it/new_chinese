// js/pages/purchase/requests/create.js


(function ($, window) {
    'use strict';

    window.PurchaseRequestsCreatePage = {
        items: [],

        init: function () {
            this.render();
            this.loadMasterData();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Create Purchase Request</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="backBtn">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>
                    
                    <form id="prForm">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Request Details</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">PR Number</label>
                                        <input type="text" class="form-control" value="Auto-generated" disabled>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Request Date</label>
                                        <input type="date" class="form-control" id="requestDate" 
                                               value="${new Date().toISOString().split('T')[0]}" readonly>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Priority</label>
                                        <select class="form-select" id="priority">
                                            <option value="NORMAL" selected>Normal</option>
                                            <option value="LOW">Low</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Required By Date</label>
                                        <input type="date" class="form-control" id="requiredByDate" 
                                               min="${(() => {
                                                   const tomorrow = new Date();
                                                   tomorrow.setDate(tomorrow.getDate() + 1);
                                                   return tomorrow.toISOString().split('T')[0];
                                               })()}">
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Purpose <span class="text-danger">*</span></label>
                                        <textarea class="form-control" id="purpose" rows="2" required 
                                                  placeholder="Enter the purpose of this purchase request"></textarea>
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
                                                    No items added. Click "Add Item" to begin.
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
                                        <textarea class="form-control" id="notes" rows="3" 
                                                  placeholder="Additional notes (optional)"></textarea>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-12 text-end">
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-check-circle"></i> Save Purchase Request
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Item Modal -->
                <div class="modal fade" id="itemModal" tabindex="-1">
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
                                        <select class="form-select" id="itemType">
                                            <option value="">Select Type</option>
                                            <option value="product">Product</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Item <span class="text-danger">*</span></label>
                                        <select class="form-select select2" id="itemSelect" disabled>
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
                                <button type="button" class="btn btn-primary" id="saveItemBtn">Add Item</button>
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

        loadMasterData: function () {
            // Load UOMs
            TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success && response.data && response.data.length > 0) {
                        let options = '<option value="">Select UOM</option>';
                        $.each(response.data, function (i, uom) {
                            const id = uom.id || uom.uom_id;
                            const name = uom.name || uom.uom_name;
                            options += `<option value="${id}">${name}</option>`;
                        });
                        $('#itemUom').html(options);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load UOMs:', xhr);
                });

            // Load Suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Supplier</option>';
                        $.each(response.data.data, function (i, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#itemSupplier').html(options);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load Suppliers:', xhr);
                });
        },

        initializeSelect2: function () {
            $('#itemSelect').select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Search and select item',
                allowClear: true,
                dropdownParent: $('#itemModal'),
                minimumInputLength: 0
            });

            $('#itemUom').select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Search and select UOM',
                allowClear: true,
                dropdownParent: $('#itemModal'),
                minimumInputLength: 0
            });

            $('#itemSupplier').select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Search and select supplier',
                allowClear: true,
                dropdownParent: $('#itemModal'),
                minimumInputLength: 0
            });
        },

        bindEvents: function () {
            const self = this;
            
            $('#itemModal').on('shown.bs.modal', function () {
                PurchaseRequestsCreatePage.initializeSelect2();
            });
            
            $('#itemModal').on('hidden.bs.modal', function () {
                if ($('#itemSelect').hasClass('select2-hidden-accessible')) {
                    $('#itemSelect').select2('destroy');
                }
                if ($('#itemUom').hasClass('select2-hidden-accessible')) {
                    $('#itemUom').select2('destroy');
                }
                if ($('#itemSupplier').hasClass('select2-hidden-accessible')) {
                    $('#itemSupplier').select2('destroy');
                }
            });

            $('#backBtn').on('click', function () {
                TempleRouter.navigate('purchase/requests');
            });

            $('#addItemBtn').on('click', function () {
                self.showItemModal();
            });

            $('#itemType').on('change', function () {
                const type = $(this).val();
                if (type) {
                    self.loadItems(type);
                    self.toggleFieldsByType(type);
                } else {
                    $('#itemSelect').prop('disabled', true).html('<option>Select item type first</option>');
                    self.toggleFieldsByType('');
                }
            });

            $('#saveItemBtn').on('click', function () {
                self.saveItem();
            });

            $(document).on('click', '.remove-item', function () {
                const index = $(this).data('index');
                self.removeItem(index);
            });

            $('#prForm').on('submit', function (e) {
                e.preventDefault();
                self.savePR();
            });
        },

        toggleFieldsByType: function (type) {
            if (type === 'product') {
                // Show quantity and UOM fields for products
                $('#quantityField').show();
                $('#uomField').show();
                // Adjust supplier field width
                $('#supplierField').removeClass('col-md-4').addClass('col-md-4');
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

        loadItems: function (type) {
            const endpoint = type === 'product' ? '/inventory/products' : '/purchase/services';

            TempleAPI.get(endpoint, { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select ' + type + '</option>';
                        $.each(response.data.data || response.data, function (i, item) {
                            options += `<option value="${item.id}" data-name="${item.name}">${item.name}</option>`;
                        });
                        $('#itemSelect').prop('disabled', false).html(options);

                        $('#itemSelect').select2('destroy');
                        $('#itemSelect').select2({
                            theme: 'bootstrap-5',
                            width: '100%',
                            placeholder: 'Search and select ' + type,
                            allowClear: true,
                            dropdownParent: $('#itemModal'),
                            minimumInputLength: 0
                        });
                    }
                });
        },

        showItemModal: function () {
            $('#itemModal').modal('show');
            $('#itemType').val('').trigger('change');
            $('#itemDescription').val('');
            $('#itemQuantity').val('');
            $('#itemSelect').val(null).trigger('change');
            $('#itemUom').val(null).trigger('change');
            $('#itemSupplier').val(null).trigger('change');
            this.toggleFieldsByType(''); // Reset field visibility
            this.initializeSelect2();
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

                if (!uomId || uomId === "") {
                    TempleCore.showToast('Please select a valid UOM', 'warning');
                    return;
                }

                const uomIdInt = parseInt(uomId);
                if (isNaN(uomIdInt)) {
                    TempleCore.showToast('Invalid UOM selected', 'warning');
                    return;
                }
                uomId = uomIdInt;
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
                uom_name: type === 'product' ? uomName : '-',
                preferred_supplier_id: supplierId || null,
                supplier_name: supplierName !== 'Select Supplier' ? supplierName : ''
            };

            this.items.push(item);
            this.renderItemsTable();
            $('#itemModal').modal('hide');

            // Clear form
            $('#itemType').val('').trigger('change');
            $('#itemDescription').val('');
            $('#itemQuantity').val('');
            $('#itemUom').val('');
            $('#itemSupplier').val('');
            this.toggleFieldsByType('');
        },

        removeItem: function (index) {
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
                            <button type="button" class="btn btn-sm btn-danger remove-item" data-index="${index}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            $('#itemsTableBody').html(html);
        },

        savePR: function () {
            const self = this;

            // Validation
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
                items: this.items
            };

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/requests', data)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Purchase request created successfully', 'success');
                        TempleRouter.navigate('purchase/requests');
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