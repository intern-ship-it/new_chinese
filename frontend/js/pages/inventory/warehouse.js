// js/pages/inventory/warehouse.js
(function ($, window) {
    'use strict';

    window.InventoryWarehousePage = {
        warehouses: [],
        currentWarehouse: null,
        permissions: {},
        currentUser: null,
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadPermissions();
            this.render();
            this.bindEvents();
            this.loadWarehouses();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-building"></i> Warehouses
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-primary" id="btnAddWarehouse">
                                <i class="bi bi-plus-circle"></i> Add Warehouse
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="warehouseTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="15%">Code</th>
                                            <th width="25%">Name</th>
                                            <th width="35%">Description</th>
                                            <th width="10%" class="text-center">Status</th>
                                            <th width="10%" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="warehouseTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.getWarehouseModal()}
            `;

            $('#page-container').html(html);
        },

        getWarehouseModal: function () {
            return `
                <!-- Add/Edit Warehouse Modal -->
                <div class="modal fade" id="warehouseModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="warehouseModalTitle">Add Warehouse</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="warehouseForm">
                                <div class="modal-body">
                                    <input type="hidden" id="warehouseId">
                                    
                                    <div class="alert alert-info mb-3">
                                        <i class="bi bi-info-circle"></i> 
                                        Code will be auto-generated in format: WA[Year][Sequence]
                                        <br>
                                        <small>Example: WA20250001, WA20250002...</small>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Warehouse Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="name" name="name" 
                                               required maxlength="255">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="description" name="description" 
                                                  rows="3"></textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="is_active" name="is_active">
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        },

        loadWarehouses: function () {
            const self = this;

            const params = {};
            const statusVal = $('#filterStatus').val();

            if (statusVal !== '') params.is_active = statusVal;

            console.log('Loading warehouses with params:', params);

            TempleAPI.get('/inventory/warehouse', params)
                .done(function (response) {
               
                    if (response.success) {
                        self.warehouses = response.data || [];
                           self.permissions = response.data.permissions || self.permissions;
                        self.renderTable();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load warehouses', 'error');
                        self.renderTable();
                    }
                })
                .fail(function (xhr) {
                    console.error('Warehouse load error:', xhr);
                    TempleCore.showToast('Error loading warehouses', 'error');
                    self.warehouses = [];
                    self.renderTable();
                });
        },

        renderTable: function () {
            const tbody = $('#warehouseTableBody');
            tbody.empty();

            if (this.warehouses.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="6" class="text-center">No warehouses found</td>
                    </tr>
                `);
                return;
            }

            let sl = 1;
            this.warehouses.forEach(warehouse => {
                // Handle different possible values for is_active
                const isActive = warehouse.is_active == 1 || warehouse.is_active === true;
                const statusBadge = isActive ?
                    '<span class="badge bg-success">Active</span>' :
                    '<span class="badge bg-danger">Inactive</span>';

                const row = `
                    <tr>
                        <td>${sl++}</td>
                        <td><code>${warehouse.code}</code></td>
                        <td><strong>${warehouse.name}</strong></td>
                        <td>${warehouse.description || '-'}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">
                        ${this.permissions.can_edit_warehouses ? `
                            <button class="btn btn-sm btn-primary edit-warehouse" 
                                    data-id="${warehouse.id}" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>`: ''}
                           ${this.permissions.can_delete_warehouses ? `
                            <button class="btn btn-sm btn-danger delete-warehouse" 
                                    data-id="${warehouse.id}" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>`: ''}
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_warehouses: false,
                can_edit_warehouses: false,
                can_delete_warehouses: false,
                can_view_warehouses: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_warehouses: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_warehouses: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_warehouses: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_warehouses: true
                };
            }
        },
        bindEvents: function () {
            const self = this;

            // Add warehouse
            // $('#btnAddWarehouse').on('click', function () {
            //     self.showAddModal();
            // });
        if (this.permissions.can_create_warehouses) {
                $('#btnAddWarehouse').show().on('click', function () {
                    self.showAddModal();
                });
            } else {
                $('#btnAddWarehouse').hide();
            }
            // Edit warehouse
            $(document).on('click', '.edit-warehouse', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            // Delete warehouse
            $(document).on('click', '.delete-warehouse', function () {
                const id = $(this).data('id');
                self.deleteWarehouse(id);
            });

            // Toggle status
            $(document).on('click', '.toggle-status', function () {
                const id = $(this).data('id');
                self.toggleStatus(id);
            });

            // Form submission
            $('#warehouseForm').on('submit', function (e) {
                e.preventDefault();
                self.saveWarehouse();
            });

            // Filter by status
            $('#filterStatus').on('change', function () {
                self.loadWarehouses();
            });
        },

        showAddModal: function () {
            $('#warehouseForm')[0].reset();
            $('#warehouseModalTitle').text('Add Warehouse');
            $('#warehouseId').val('');
            $('#is_active').val('1');

            const modal = new bootstrap.Modal(document.getElementById('warehouseModal'));
            modal.show();
        },

        showEditModal: function (id) {
            const warehouse = this.warehouses.find(w => w.id == id);
            if (!warehouse) return;

            $('#warehouseModalTitle').text('Edit Warehouse');
            $('#warehouseId').val(warehouse.id);
            $('#name').val(warehouse.name);
            $('#description').val(warehouse.description || '');
            // Handle different possible values for is_active
            const isActive = warehouse.is_active == 1 || warehouse.is_active === true;
            $('#is_active').val(isActive ? '1' : '0');

            const modal = new bootstrap.Modal(document.getElementById('warehouseModal'));
            modal.show();
        },

        saveWarehouse: function () {
            const id = $('#warehouseId').val();
            const data = {
                name: $('#name').val().trim(),
                description: $('#description').val().trim() || null,
                is_active: parseInt($('#is_active').val())
            };

            if (!data.name) {
                TempleCore.showToast('Please enter warehouse name', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            const request = id ?
                TempleAPI.put(`/inventory/warehouse/${id}`, data) :
                TempleAPI.post('/inventory/warehouse', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('warehouseModal')).hide();
                        TempleCore.showToast(response.message || 'Warehouse saved successfully', 'success');
                        InventoryWarehousePage.loadWarehouses();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save warehouse', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Error saving warehouse', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        deleteWarehouse: function (id) {
            const warehouse = this.warehouses.find(w => w.id == id);
            if (!warehouse) return;

            TempleCore.showConfirm(
                'Delete Warehouse',
                `Are you sure you want to delete "${warehouse.name}" (${warehouse.code})?`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.delete(`/inventory/warehouse/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Warehouse deleted successfully', 'success');
                                InventoryWarehousePage.loadWarehouses();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Error deleting warehouse', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        toggleStatus: function (id) {
            TempleCore.showLoading(true);

            TempleAPI.patch(`/inventory/warehouse/${id}/toggle-status`)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Status updated successfully', 'success');
                        InventoryWarehousePage.loadWarehouses();
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Error updating status', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);