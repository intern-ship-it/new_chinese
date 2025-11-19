// js/pages/inventory/uom/index.js
(function ($, window) {
    'use strict';

    window.InventoryUomPage = {
        uoms: [],
        dataTable: null,
        currentUser: null,
        permissions: {},
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.loadUoms();
            this.bindEvents();
            this.loadPermissions();
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_uom: false,
                can_edit_uom: false,
                can_delete_uom: false,
                can_view_uom: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_uom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_uom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_uom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_uom: true
                };
            }
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-activity"></i> Unit of Measurements
                            </h3>
                        </div>
                        <div class="col-auto">
                       
                       
                            <button type="button" class="btn btn-primary" id="btnAddUom">
                                <i class="bi bi-plus-circle"></i> Add UOM
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="uomTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">UOM Name</th>
                                            <th width="15%">Short Name</th>
                                            <th width="20%">Base Unit</th>
                                            <th width="15%">Conversion Factor</th>
                                            <th width="10%" class="text-center">Status</th>
                                            <th width="10%" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="uomTableBody">
                                        <!-- Dynamic content -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.getUomModal()}
   

            `;

            $('#page-container').html(html);
        },

        getUomModal: function () {
            return `
        <!-- Add/Edit UOM Modal -->
        <div class="modal fade" id="uomModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="uomModalTitle">Add Unit of Measurement</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="uomForm">
                        <div class="modal-body">
                            <input type="hidden" id="uomId">
                            
                            <div class="mb-3">
                                <label class="form-label">UOM Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="name" name="name" 
                                       required maxlength="255" placeholder="e.g., Kilogram">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Short Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="uom_short" name="uom_short" 
                                       required maxlength="100" placeholder="e.g., KG">
                                <small class="text-muted">Abbreviation (max 20 characters)</small>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Base Unit</label>
                                <select class="form-select" id="base_unit" name="base_unit">
                                    <option value="">Select Base Unit</option>
                                </select>
                                <small class="text-muted">Leave empty if this is a base unit</small>
                            </div>
                            
                            <div class="mb-3" id="conversionFactorGroup">
                                <label class="form-label">Conversion Factor <span class="text-danger">*</span></label>
                                <input type="number" class="form-control" id="conversion_factor" 
                                       name="conversion_factor" step="0.0001" min="0.0001" 
                                       value="1.0000" placeholder="1.0000">
                                <small class="text-muted">How many base units equal 1 of this unit?</small>
                            </div>
                            
                            <div class="mb-3" id="statusGroup">
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

        loadUoms: function () {
            const self = this;
            TempleCore.showLoading(true);

            TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success) {
                        self.uoms = response.data || [];
                        self.permissions = response.data.permissions || self.permissions;
                        self.renderTable();
                        self.populateConverterDropdowns();
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast('Error loading UOMs', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderTable: function () {
            const tbody = $('#uomTableBody');
            tbody.empty();

            if (this.uoms.length === 0) {
                tbody.html(`
            <tr>
                <td colspan="7" class="text-center">No units of measurement found</td>
            </tr>
        `);
                return;
            }

            let sl = 1;
            this.uoms.forEach(uom => {

                // FIX: Use base_unit_name and base_unit_short directly
                const baseUnitName = uom.base_unit ?
                    (uom.base_unit_name ? `${uom.base_unit_name} (${uom.base_unit_short})` : 'N/A') :
                    '<span class="badge bg-primary">Base Unit</span>';

                const conversionFactor = uom.base_unit ?
                    parseFloat(uom.conversion_factor).toFixed(4) :
                    '<span class="text-muted">1.0000</span>';

                const statusBadge = uom.is_active ?
                    '<span class="badge bg-success">Active</span>' :
                    '<span class="badge bg-danger">Inactive</span>';

                const row = `
            <tr>
                <td>${sl++}</td>
                <td><strong>${uom.name}</strong></td>
                <td><span class="badge bg-info">${uom.uom_short}</span></td>
                <td>${baseUnitName}</td>
                <td class="text-center">${conversionFactor}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">
                
${this.permissions.can_edit_uom ? `
                    <button class="btn btn-sm btn-primary edit-uom" 
                            data-id="${uom.id}" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>`: ''}
                   ${this.permissions.can_delete_uom ? `
                    <button class="btn btn-sm btn-danger delete-uom" 
                            data-id="${uom.id}" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>`: ''}
                </td>
            </tr>
        `;
                tbody.append(row);
            });
        },

        populateConverterDropdowns: function () {
            const activeUoms = this.uoms.filter(u => u.is_active);
            const options = '<option value="">Select Unit</option>' +
                activeUoms.map(u => `<option value="${u.id}">${u.name} (${u.uom_short})</option>`).join('');

            $('#fromUnit, #toUnit').html(options);
        },

        bindEvents: function () {
            const self = this;

            // Add UOM
            $('#btnAddUom').on('click', function () {
                self.showAddModal();
            });



            // Edit UOM
            $(document).on('click', '.edit-uom', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            // Delete UOM
            $(document).on('click', '.delete-uom', function () {
                const id = $(this).data('id');
                self.deleteUom(id);
            });

            // Form submission
            $('#uomForm').on('submit', function (e) {
                e.preventDefault();
                self.saveUom();
            });

            // Base unit change - FIXED
            $(document).on('change', '#base_unit', function () {
                const hasBaseUnit = $(this).val() !== '';

                if (hasBaseUnit) {
                    $('#conversionFactorGroup').show();
                    $('#conversion_factor').attr('required', true);
                    // Clear the default value when showing
                    if ($('#conversion_factor').val() === '1.0000') {
                        $('#conversion_factor').val('');
                    }
                } else {
                    $('#conversionFactorGroup').hide();
                    $('#conversion_factor').attr('required', false);
                    $('#conversion_factor').val('1.0000'); // Auto-set to 1 for base units
                }
            });

            // UOM Short uppercase
            $('#uom_short').on('input', function () {
                this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });

            // Convert button (if you have a converter section)
            $('#btnConvert').on('click', function () {
                self.performConversion();
            });
        },

        showAddModal: function () {
            $('#uomForm')[0].reset();
            $('#uomModalTitle').text('Add Unit of Measurement');
            $('#uomId').val('');
            $('#statusGroup').hide(); // Hide status for new items

            // Hide conversion factor initially
            $('#conversionFactorGroup').hide();
            $('#conversion_factor').val('1.0000');
            $('#conversion_factor').attr('required', false);

            // Populate base units
            this.populateBaseUnits();

            const modal = new bootstrap.Modal(document.getElementById('uomModal'));
            modal.show();
        },
        showEditModal: function (id) {
            const uom = this.uoms.find(u => u.id === id);
            if (!uom) return;

            $('#uomModalTitle').text('Edit Unit of Measurement');
            $('#uomId').val(uom.id);
            $('#name').val(uom.name);
            $('#uom_short').val(uom.uom_short);
            $('#is_active').val(uom.is_active);
            $('#statusGroup').show();

            // Populate base units dropdown
            this.populateBaseUnits(id);

            // Set the base unit value
            $('#base_unit').val(uom.base_unit || '');

            // Set conversion factor
            $('#conversion_factor').val(parseFloat(uom.conversion_factor).toFixed(4));

            // Show/hide conversion factor based on base unit
            if (uom.base_unit) {
                $('#conversionFactorGroup').show();
                $('#conversion_factor').attr('required', true);
            } else {
                $('#conversionFactorGroup').hide();
                $('#conversion_factor').attr('required', false);
                $('#conversion_factor').val('1.0000');
            }

            const modal = new bootstrap.Modal(document.getElementById('uomModal'));
            modal.show();
        },

        // Update the populateBaseUnits function in your index.js
        populateBaseUnits: function (excludeId) {
            const select = $('#base_unit');
            select.empty();
            select.append('<option value="">Select Base Unit</option>');
			let avail = true;
			this.uoms.forEach(uom => {
				console.log('uom.base_unit');
				console.log(uom.base_unit);
				console.log('excludeId');
				console.log(excludeId);
				if(excludeId == uom.base_unit && (excludeId != '' && excludeId != null && excludeId != 0)) avail = false;
			});
			let availableUnits = [];
			console.log('avail');
			console.log(avail);
			if(avail){
				// Get available base units
				availableUnits = this.uoms.filter(u => {
					if (excludeId && u.id == excludeId) return false;
					if (excludeId && u.base_unit == excludeId) return false;
					if (u.base_unit != '' && u.base_unit != null && u.base_unit != 0) return false;
					return u.is_active == 1;
				});
			}

            // Populate dropdown
            availableUnits.forEach(uom => {
                select.append(`<option value="${uom.id}">${uom.name} (${uom.uom_short})</option>`);
            });
        },
        saveUom: function () {
            const id = $('#uomId').val();
            const data = {
                name: $('#name').val().trim(),
                uom_short: $('#uom_short').val().trim(),
                base_unit: $('#base_unit').val() || null,
                conversion_factor: $('#conversion_factor').val() || 1.0000,
                is_active: $('#is_active').val() || 1
            };

            if (!data.name || !data.uom_short) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            const request = id ?
                TempleAPI.put(`/inventory/uom/${id}`, data) :
                TempleAPI.post('/inventory/uom', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('uomModal')).hide();
                        TempleCore.showToast(response.message || 'UOM saved successfully', 'success');
                        InventoryUomPage.loadUoms();
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Error saving UOM', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        deleteUom: function (id) {
            const uom = this.uoms.find(u => u.id === id);
            if (!uom) return;

            TempleCore.showConfirm(
                'Delete UOM',
                `Are you sure you want to delete "${uom.name} (${uom.uom_short})"?`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.delete(`/inventory/uom/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('UOM deleted successfully', 'success');
                                InventoryUomPage.loadUoms();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Error deleting UOM', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        toggleStatus: function (id) {
            TempleCore.showLoading(true);

            TempleAPI.patch(`/inventory/uom/${id}/toggle-status`)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Status updated successfully', 'success');
                        InventoryUomPage.loadUoms();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Error updating status', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        performConversion: function () {
            const fromQty = parseFloat($('#fromQuantity').val());
            const fromUnit = $('#fromUnit').val();
            const toUnit = $('#toUnit').val();

            if (!fromQty || !fromUnit || !toUnit) {
                TempleCore.showToast('Please fill all fields', 'warning');
                return;
            }

            TempleAPI.post('/inventory/uom/convert', {
                from_uom_id: fromUnit,
                to_uom_id: toUnit,
                quantity: fromQty
            })
                .done(function (response) {
                    if (response.success) {
                        $('#toQuantity').val(response.data.to_quantity.toFixed(4));
                        $('#conversionResult').html(
                            `<strong>${response.data.from_quantity} ${response.data.from_unit}</strong> = 
                         <strong>${response.data.to_quantity.toFixed(4)} ${response.data.to_unit}</strong>`
                        ).show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Error performing conversion', 'error');
                });
        }
    };

})(jQuery, window);