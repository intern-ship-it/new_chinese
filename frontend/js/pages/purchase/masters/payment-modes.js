// js/pages/masters/payment-modes.js
// Payment modes management with icon selection and upload support

(function ($, window) {
    'use strict';

    window.PurchaseMastersPaymentModesPage = {
        roles: [],
        modules: [],
        availableIcons: [],
        superAdminRoleId: null,
        currentIconFile: null,
        selectedBootstrapIcon: null,
        permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.loadRoles();
                self.loadModules();
                self.loadAvailableIcons();
                self.loadPaymentModes();
                self.bindEvents();
            });

        },

        loadPermissions: function () {
            const self = this;
            const userId = this.currentUser.id;

            return TempleAPI.get(`/masters/payment-modes/user/${userId}/permissions`)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.data || self.permissions;
                    } else {
                        self.setDefaultPermissions();
                    }
                })
                .fail(function () {
                    self.setDefaultPermissions();
                });
        },
        setDefaultPermissions: function () {
            const userType = this.currentUser?.user_type || '';
            this.permissions = {
                can_create_payment_modes: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_payment_modes: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_payment_modes: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_payment_modes: userType === 'SUPER_ADMIN' || userType === 'ADMIN',

            };
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Payment Modes</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Payment Modes</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                          ${this.permissions.can_create_payment_modes ? `
                            <button class="btn btn-primary" id="btnAddMode">
                                <i class="bi bi-plus-circle"></i> Add Payment Mode
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Payment Modes List -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Icon</th>
                                            <th>Mode Name</th>
                                            <th>Ledger Account</th>
                                            <th>Description</th>
                                            <th>Modules</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="modesTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Mode Modal -->
                <div class="modal fade" id="modeModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modeModalTitle">Add Payment Mode</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="modeForm">
                                    <input type="hidden" id="modeId">
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Mode Name <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="modeName" required>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Ledger Account</label>
                                                <select class="form-select" id="modeLedgerId">
                                                    <option value="">Select Ledger</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="modeDescription" rows="2"></textarea>
                                    </div>
                                    
                                    <!-- Icon Selection Section -->
                                    <hr>
                                    <h6 class="mb-3">Payment Mode Icon</h6>
                                    
                                    <!-- Icon Type Selection -->
                                    <div class="mb-3">
                                        <label class="form-label">Icon Type <span class="text-danger">*</span></label>
                                        <div class="btn-group w-100" role="group">
                                            <input type="radio" class="btn-check" name="iconType" id="iconTypeBootstrap" value="bootstrap" checked>
                                            <label class="btn btn-outline-primary" for="iconTypeBootstrap">
                                                <i class="bi bi-palette"></i> Select from Library
                                            </label>
                                            
                                            <input type="radio" class="btn-check" name="iconType" id="iconTypeUpload" value="upload">
                                            <label class="btn btn-outline-primary" for="iconTypeUpload">
                                                <i class="bi bi-upload"></i> Upload Custom Icon
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <!-- Bootstrap Icon Selection -->
                                    <div id="bootstrapIconSection" class="mb-3">
                                        <label class="form-label">Select Icon</label>
                                        <div class="mb-2">
                                            <input type="text" class="form-control" id="iconSearch" placeholder="Search icons...">
                                        </div>
                                        <div class="border rounded p-3" style="max-height: 300px; overflow-y: auto;">
                                            <div class="row g-2" id="iconGrid">
                                                <div class="col-12 text-center text-muted">
                                                    Loading icons...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Custom Upload Section -->
                                    <div id="uploadIconSection" class="mb-3" style="display: none;">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Upload Icon</label>
                                                    <input type="file" class="form-control" id="modeIcon" 
                                                           accept="image/png,image/jpeg,image/jpg,image/svg+xml">
                                                    <small class="text-muted">
                                                        Allowed formats: PNG, JPG, JPEG, SVG. Max size: 2MB<br>
                                                        Recommended size: 128x128px or 256x256px
                                                    </small>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Icon Preview</label>
                                                    <div class="border rounded p-3 text-center bg-light" style="min-height: 150px;">
                                                        <img id="uploadIconPreview" src="" alt="Icon Preview" 
                                                             class="img-fluid" style="max-height: 120px; display: none;">
                                                        <div id="uploadIconPlaceholder" class="text-muted">
                                                            <i class="bi bi-image" style="font-size: 48px;"></i>
                                                            <p class="mb-0 mt-2">No icon selected</p>
                                                        </div>
                                                    </div>
                                                    <div class="mt-2" id="uploadIconActions" style="display: none;">
                                                        <button type="button" class="btn btn-sm btn-danger" id="btnRemoveUploadIcon">
                                                            <i class="bi bi-trash"></i> Remove Icon
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Current Icon Preview -->
                                    <div class="mb-3">
                                        <label class="form-label">Current Selection</label>
                                        <div class="border rounded p-3 text-center bg-light">
                                            <div id="currentIconPreview">
                                                <i class="bi bi-currency-dollar" style="font-size: 48px;"></i>
                                                <p class="mb-0 mt-2 text-muted">Default Icon</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <hr>
                                    
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Status</label>
                                                <select class="form-select" id="modeStatus">
                                                    <option value="1">Active</option>
                                                    <option value="0">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <div class="form-check mt-4">
                                                    <input class="form-check-input" type="checkbox" id="isPaymentGateway">
                                                    <label class="form-check-label" for="isPaymentGateway">
                                                        Is Payment Gateway
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <div class="form-check mt-4">
                                                    <input class="form-check-input" type="checkbox" id="isLive">
                                                    <label class="form-check-label" for="isLive">
                                                        Is Live
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Gateway Fields -->
                                    <div id="paymentGatewayFields" style="display: none;">
                                        <hr>
                                        <h6 class="mb-3">Payment Gateway Details</h6>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Merchant Code</label>
                                                    <input type="text" class="form-control" id="merchantCode" maxlength="255">
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Merchant Key</label>
                                                    <input type="password" class="form-control" id="merchantKey" maxlength="255">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Password</label>
                                                    <input type="password" class="form-control" id="gatewayPassword" maxlength="255">
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label class="form-label">Gateway URL</label>
                                                    <input type="url" class="form-control" id="gatewayUrl" maxlength="255" placeholder="https://">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <hr>
                                    
                                    <!-- Module Assignment -->
                                    <div class="mb-3">
                                        <label class="form-label">Assign to Modules <span class="text-danger">*</span></label>
                                        <div id="modulesCheckboxList" class="border rounded p-3">
                                            <div class="text-center text-muted">Loading modules...</div>
                                        </div>
                                        <small class="text-muted">Select at least one module</small>
                                    </div>
                                    
                                    <hr>
                                    
                                    <!-- Role Assignment -->
                                    <div class="mb-3">
                                        <label class="form-label">Assign to Roles <span class="text-danger">*</span></label>
                                        <div id="rolesCheckboxList" class="border rounded p-3">
                                            <div class="text-center text-muted">Loading roles...</div>
                                        </div>
                                        <small class="text-muted">Select at least one role (Super Administrator is always selected)</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnSaveMode">Save Payment Mode</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadPaymentModes: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.permissions || self.permissions;
                        self.displayPaymentModes(response.data.data, self.permissions);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load payment modes', 'error');
                });
        },

        displayPaymentModes: function (modes, permissions) {
            let html = '';

            if (modes.length === 0) {
                html = '<tr><td colspan="7" class="text-center">No payment modes found</td></tr>';
            } else {
                $.each(modes, function (index, mode) {
                    const statusBadge = mode.status == 1 ?
                        '<span class="badge bg-success">Active</span>' :
                        '<span class="badge bg-secondary">Inactive</span>';

                    const modulesList = mode.assigned_modules && mode.assigned_modules.length > 0
                        ? mode.assigned_modules.map(m => m.display_name || m.name).join(', ')
                        : '-';

                    // Render icon
                    let iconHtml = '';
                    if (mode.icon_display_url_data) {
                        if (mode.icon_display_url_data.type === 'bootstrap') {
                            iconHtml = `<i class="bi ${mode.icon_display_url_data.value}" style="font-size: 24px;"></i>`;
                        } else if (mode.icon_display_url_data.type === 'upload') {
                            iconHtml = `<img src="${mode.icon_display_url_data.value}" alt="${mode.name}" style="width: 32px; height: 32px; object-fit: contain;">`;
                        }
                    } else {
                        iconHtml = '<i class="bi bi-currency-dollar" style="font-size: 24px;"></i>';
                    }

                    html += `
                        <tr>
                            <td>${iconHtml}</td>
                            <td>${mode.name}</td>
                            <td>${mode.ledger_name || '-'}</td>
                            <td>${mode.description || '-'}</td>
                            <td><small>${modulesList}</small></td>
                            <td>${statusBadge}</td>
                            <td>
                            
     ${permissions.can_edit_payment_modes ? `
                                <button class="btn btn-sm btn-info" onclick="PurchaseMastersPaymentModesPage.editMode('${mode.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>`: ''}
                                  ${permissions.can_delete_payment_modes ? `
                                <button class="btn btn-sm btn-danger" onclick="PurchaseMastersPaymentModesPage.deleteMode('${mode.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>`: ''}
                            </td>
                        </tr>
                    `;
                });
            }

            $('#modesTableBody').html(html);
        },

        loadAvailableIcons: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes/icons')
                .done(function (response) {
                    if (response.success) {
                        self.availableIcons = response.data;
                        self.renderIconGrid();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load icons', 'error');
                });
        },

        renderIconGrid: function (filter = '') {
            const self = this;
            let filteredIcons = this.availableIcons;

            if (filter) {
                const searchTerm = filter.toLowerCase();
                filteredIcons = this.availableIcons.filter(icon =>
                    icon.label.toLowerCase().includes(searchTerm) ||
                    icon.category.toLowerCase().includes(searchTerm) ||
                    icon.value.toLowerCase().includes(searchTerm)
                );
            }

            if (filteredIcons.length === 0) {
                $('#iconGrid').html('<div class="col-12 text-center text-muted">No icons found</div>');
                return;
            }

            let html = '';
            $.each(filteredIcons, function (index, icon) {
                const isSelected = self.selectedBootstrapIcon === icon.value;
                html += `
                    <div class="col-6 col-sm-4 col-md-3 col-lg-2">
                        <div class="icon-option ${isSelected ? 'selected' : ''}" 
                             data-icon="${icon.value}" 
                             title="${icon.label}">
                            <i class="bi ${icon.value}" style="font-size: 32px;"></i>
                            <small class="d-block mt-1">${icon.label}</small>
                        </div>
                    </div>
                `;
            });

            $('#iconGrid').html(html);
        },

        loadRoles: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes/roles')
                .done(function (response) {
                    if (response.success) {
                        self.roles = response.data;

                        const superAdminRole = self.roles.find(r =>
                            r.name === 'super_admin' ||
                            r.display_name === 'Super Administrator' ||
                            (r.name.toLowerCase().includes('super') && r.name.toLowerCase().includes('admin'))
                        );

                        if (superAdminRole) {
                            self.superAdminRoleId = superAdminRole.id;
                        }

                        self.renderRolesCheckboxes();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load roles', 'error');
                });
        },

        loadModules: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes/modules')
                .done(function (response) {
                    if (response.success) {
                        self.modules = response.data;
                        self.renderModulesCheckboxes();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load modules', 'error');
                });
        },

        renderRolesCheckboxes: function () {
            if (this.roles.length === 0) {
                $('#rolesCheckboxList').html('<div class="text-muted">No roles available</div>');
                return;
            }

            let html = '<div class="row g-3">';

            $.each(this.roles, function (index, role) {
                const isSuperAdmin = role.name === 'super_admin' ||
                    role.display_name === 'Super Administrator' ||
                    (role.name.toLowerCase().includes('super') && role.name.toLowerCase().includes('admin'));

                const checkedAttr = isSuperAdmin ? 'checked' : '';
                const disabledAttr = isSuperAdmin ? 'disabled' : '';

                html += `
                    <div class="col-md-3 col-sm-4 col-6">
                        <div class="form-check">
                            <input class="form-check-input role-checkbox" type="checkbox" 
                                   value="${role.id}" id="role_${role.id}" 
                                   ${checkedAttr} ${disabledAttr}
                                   data-role-name="${role.name}"
                                   data-is-super-admin="${isSuperAdmin}">
                            <label class="form-check-label" for="role_${role.id}">
                                ${role.display_name || role.name}
                            </label>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('#rolesCheckboxList').html(html);
        },

        renderModulesCheckboxes: function () {
            if (this.modules.length === 0) {
                $('#modulesCheckboxList').html('<div class="text-muted">No modules available</div>');
                return;
            }

            let html = '<div class="row g-3">';

            $.each(this.modules, function (index, module) {
                html += `
                    <div class="col-md-3 col-sm-4 col-6">
                        <div class="form-check">
                            <input class="form-check-input module-checkbox" type="checkbox" 
                                   value="${module.id}" id="module_${module.id}">
                            <label class="form-check-label" for="module_${module.id}">
                                ${module.display_name || module.name}
                            </label>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('#modulesCheckboxList').html(html);
        },

        bindEvents: function () {
            const self = this;

            $('#btnAddMode').on('click', function () {
                self.showModeModal();
            });

            $('#btnSaveMode').on('click', function () {
                self.saveMode();
            });

            $('#modeModal').on('show.bs.modal', function () {
                self.loadLedgers();
            });

            $('#isPaymentGateway').on('change', function () {
                self.togglePaymentGatewayFields($(this).is(':checked'));
            });

            // Icon type radio buttons
            $('input[name="iconType"]').on('change', function () {
                const selectedType = $(this).val();
                self.toggleIconSections(selectedType);
            });

            // Icon search
            $('#iconSearch').on('input', function () {
                self.renderIconGrid($(this).val());
            });

            // Icon selection
            $(document).on('click', '.icon-option', function () {
                $('.icon-option').removeClass('selected');
                $(this).addClass('selected');
                self.selectedBootstrapIcon = $(this).data('icon');
                self.updateCurrentIconPreview();
            });

            // Custom icon upload
            $('#modeIcon').on('change', function (e) {
                self.handleIconUpload(e.target.files[0]);
            });

            $('#btnRemoveUploadIcon').on('click', function () {
                self.removeUploadedIcon();
            });
        },

        toggleIconSections: function (type) {
            if (type === 'bootstrap') {
                $('#bootstrapIconSection').show();
                $('#uploadIconSection').hide();
                this.updateCurrentIconPreview();
            } else {
                $('#bootstrapIconSection').hide();
                $('#uploadIconSection').show();
                this.updateCurrentIconPreview();
            }
        },

        handleIconUpload: function (file) {
            const self = this;

            if (!file) return;

            // Validate file size (2MB)
            const maxSize = 2 * 1024 * 1024;
            if (file.size > maxSize) {
                TempleCore.showToast('File size exceeds 2MB limit', 'error');
                $('#modeIcon').val('');
                return;
            }

            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
                TempleCore.showToast('Invalid file type. Only PNG, JPG, JPEG, and SVG are allowed', 'error');
                $('#modeIcon').val('');
                return;
            }

            self.currentIconFile = file;

            // Show preview
            const reader = new FileReader();
            reader.onload = function (e) {
                $('#uploadIconPreview').attr('src', e.target.result).show();
                $('#uploadIconPlaceholder').hide();
                $('#uploadIconActions').show();
                self.updateCurrentIconPreview();
            };
            reader.readAsDataURL(file);
        },

        removeUploadedIcon: function () {
            this.currentIconFile = null;
            $('#modeIcon').val('');
            $('#uploadIconPreview').attr('src', '').hide();
            $('#uploadIconPlaceholder').show();
            $('#uploadIconActions').hide();
            this.updateCurrentIconPreview();
        },

        updateCurrentIconPreview: function () {
            const iconType = $('input[name="iconType"]:checked').val();
            let previewHtml = '';

            if (iconType === 'bootstrap' && this.selectedBootstrapIcon) {
                previewHtml = `
                    <i class="bi ${this.selectedBootstrapIcon}" style="font-size: 48px;"></i>
                    <p class="mb-0 mt-2">Selected Icon</p>
                `;
            } else if (iconType === 'upload' && this.currentIconFile) {
                const imgSrc = $('#uploadIconPreview').attr('src');
                previewHtml = `
                    <img src="${imgSrc}" style="max-height: 80px; max-width: 80px; object-fit: contain;">
                    <p class="mb-0 mt-2">Custom Icon</p>
                `;
            } else {
                previewHtml = `
                    <i class="bi bi-currency-dollar" style="font-size: 48px;"></i>
                    <p class="mb-0 mt-2 text-muted">Default Icon</p>
                `;
            }

            $('#currentIconPreview').html(previewHtml);
        },

        togglePaymentGatewayFields: function (show) {
            if (show) {
                $('#paymentGatewayFields').slideDown();
            } else {
                $('#paymentGatewayFields').slideUp();
            }
        },

        showModeModal: function () {
            $('#modeForm')[0].reset();
            $('#modeId').val('');
            $('#modeModalTitle').text('Add Payment Mode');

            // Reset icon selection
            this.selectedBootstrapIcon = 'bi-currency-dollar';
            this.currentIconFile = null;
            $('#iconTypeBootstrap').prop('checked', true);
            this.toggleIconSections('bootstrap');
            this.removeUploadedIcon();

            // Select default icon
            $('.icon-option').removeClass('selected');
            $(`.icon-option[data-icon="bi-currency-dollar"]`).addClass('selected');
            this.updateCurrentIconPreview();

            // Reset checkboxes
            $('.role-checkbox').each(function () {
                const isSuperAdmin = $(this).data('is-super-admin') === true ||
                    $(this).data('is-super-admin') === 'true' ||
                    $(this).attr('disabled') === 'disabled';
                $(this).prop('checked', isSuperAdmin);
            });

            $('.module-checkbox').prop('checked', false);
            $('#isPaymentGateway, #isLive').prop('checked', false);
            this.togglePaymentGatewayFields(false);

            const modal = new bootstrap.Modal(document.getElementById('modeModal'));
            modal.show();
        },

        editMode: function (modeId) {
            const self = this;
            const modal = new bootstrap.Modal(document.getElementById('modeModal'));
            modal.show();

            TempleAPI.get('/masters/payment-modes/' + modeId)
                .done(function (response) {
                    if (response.success) {
                        const mode = response.data;
                        $('#modeId').val(mode.id);
                        $('#modeName').val(mode.name);
                        $('#modeLedgerId').val(mode.ledger_id);
                        $('#modeDescription').val(mode.description);
                        $('#modeStatus').val(mode.status);
                        $('#isPaymentGateway').prop('checked', mode.is_payment_gateway);
                        $('#isLive').prop('checked', mode.is_live);

                        // Load icon
                        if (mode.icon_display_url) {
                            if (mode.icon_display_url.type === 'bootstrap') {
                                $('#iconTypeBootstrap').prop('checked', true);
                                self.toggleIconSections('bootstrap');
                                self.selectedBootstrapIcon = mode.icon_display_url.value;
                                $('.icon-option').removeClass('selected');
                                $(`.icon-option[data-icon="${mode.icon_display_url.value}"]`).addClass('selected');
                            } else if (mode.icon_display_url.type === 'upload') {
                                $('#iconTypeUpload').prop('checked', true);
                                self.toggleIconSections('upload');
                                $('#uploadIconPreview').attr('src', mode.icon_display_url.value).show();
                                $('#uploadIconPlaceholder').hide();
                                $('#uploadIconActions').show();
                            }
                            self.updateCurrentIconPreview();
                        }

                        // Load payment gateway fields
                        if (mode.is_payment_gateway) {
                            $('#merchantCode').val(mode.merchant_code);
                            $('#merchantKey').val(mode.merchant_key);
                            $('#gatewayPassword').val(mode.password);
                            $('#gatewayUrl').val(mode.url);
                            self.togglePaymentGatewayFields(true);
                        } else {
                            self.togglePaymentGatewayFields(false);
                        }

                        // Check assigned roles
                        $('.role-checkbox').each(function () {
                            const roleId = $(this).val();
                            const isSuperAdmin = $(this).data('is-super-admin') === true ||
                                $(this).data('is-super-admin') === 'true' ||
                                $(this).attr('disabled') === 'disabled';

                            if (isSuperAdmin) {
                                $(this).prop('checked', true);
                            } else if (mode.role_ids && mode.role_ids.includes(roleId)) {
                                $(this).prop('checked', true);
                            } else {
                                $(this).prop('checked', false);
                            }
                        });

                        // Check assigned modules
                        $('.module-checkbox').each(function () {
                            const moduleId = parseInt($(this).val());
                            if (mode.module_ids && mode.module_ids.includes(moduleId)) {
                                $(this).prop('checked', true);
                            } else {
                                $(this).prop('checked', false);
                            }
                        });

                        $('#modeModalTitle').text('Edit Payment Mode');
                    } else {
                        modal.hide();
                    }
                })
                .fail(function () {
                    modal.hide();
                    TempleCore.showToast('Failed to load payment mode details', 'error');
                });
        },

        saveMode: function () {
            const self = this;

            // Validate form
            if (!$('#modeForm')[0].checkValidity()) {
                $('#modeForm')[0].reportValidity();
                return;
            }

            // Get selected roles
            const selectedRoles = [];
            $('.role-checkbox').each(function () {
                if ($(this).is(':checked')) {
                    selectedRoles.push($(this).val());
                }
            });

            if (self.superAdminRoleId && !selectedRoles.includes(self.superAdminRoleId)) {
                selectedRoles.push(self.superAdminRoleId);
            }

            if (selectedRoles.length === 0) {
                TempleCore.showToast('Please select at least one role', 'error');
                return;
            }

            // Get selected modules
            const selectedModules = [];
            $('.module-checkbox:checked').each(function () {
                selectedModules.push(parseInt($(this).val()));
            });

            if (selectedModules.length === 0) {
                TempleCore.showToast('Please select at least one module', 'error');
                return;
            }

            // Validate icon selection
            const iconType = $('input[name="iconType"]:checked').val();
            if (iconType === 'bootstrap' && !self.selectedBootstrapIcon) {
                TempleCore.showToast('Please select an icon from the library', 'error');
                return;
            }
            if (iconType === 'upload' && !self.currentIconFile && !$('#modeId').val()) {
                TempleCore.showToast('Please upload a custom icon', 'error');
                return;
            }

            // Prepare FormData
            const formData = new FormData();
            formData.append('name', $('#modeName').val());
            formData.append('ledger_id', $('#modeLedgerId').val() || '');
            formData.append('description', $('#modeDescription').val());
            formData.append('status', parseInt($('#modeStatus').val()));
            formData.append('is_payment_gateway', $('#isPaymentGateway').is(':checked') ? 1 : 0);
            formData.append('is_live', $('#isLive').is(':checked') ? 1 : 0);

            // Add icon data
            formData.append('icon_type', iconType);
            if (iconType === 'bootstrap') {
                formData.append('icon_bootstrap', self.selectedBootstrapIcon);
            } else if (iconType === 'upload' && self.currentIconFile) {
                formData.append('icon', self.currentIconFile);
            }

            // Add role and module IDs
            selectedRoles.forEach(roleId => {
                formData.append('role_ids[]', roleId);
            });
            selectedModules.forEach(moduleId => {
                formData.append('module_ids[]', moduleId);
            });

            // Add payment gateway fields if applicable
            const isPaymentGateway = $('#isPaymentGateway').is(':checked');
            if (isPaymentGateway) {
                formData.append('merchant_code', $('#merchantCode').val() || '');
                formData.append('merchant_key', $('#merchantKey').val() || '');
                formData.append('password', $('#gatewayPassword').val() || '');
                formData.append('url', $('#gatewayUrl').val() || '');
            }

            const modeId = $('#modeId').val();

            TempleCore.showLoading(true);

            // Determine create or update
            let request;
            if (modeId) {
                formData.append('_method', 'PUT'); // Laravel PUT override
                request = TempleAPI.postFormData(`/masters/payment-modes/${modeId}`, formData);
            } else {
                request = TempleAPI.postFormData('/masters/payment-modes', formData);
            }

            request
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Payment mode saved successfully', 'success');
                        $('#modeModal').modal('hide');
                        self.loadPaymentModes();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save payment mode', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;

                    // Clear old errors
                    $('#modeForm').find('.is-invalid').removeClass('is-invalid');
                    $('#modeForm').find('.invalid-feedback').remove();

                    if (response && response.errors) {
                        $.each(response.errors, function (field, messages) {
                            let fieldElement = $(`[name="${field}"]`);

                            // Handle array fields like role_ids[]
                            if (field.includes('.')) {
                                const parts = field.split('.');
                                fieldElement = $(`[name="${parts[0]}"]`);
                            }

                            if (fieldElement.length) {
                                fieldElement.addClass('is-invalid');
                                fieldElement.after(`<div class="invalid-feedback">${messages[0]}</div>`);
                            }
                        });
                        TempleCore.showToast('Please fix validation errors', 'error');
                    } else {
                        TempleCore.showToast(response?.message || 'Failed to save payment mode', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        deleteMode: function (modeId) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Payment Mode',
                'Are you sure you want to delete this payment mode?',
                function () {
                    TempleAPI.delete('/masters/payment-modes/' + modeId)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast(response.message || 'Payment mode deleted successfully', 'success');
                                self.loadPaymentModes();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete payment mode', 'error');
                        });
                }
            );
        },

        loadLedgers: function () {
            TempleAPI.get('/accounts/ledgers/type/bank-accounts')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Ledger</option>';
                        $.each(response.data, function (index, ledger) {
                            options += `<option value="${ledger.id}">${ledger.left_code}/${ledger.right_code} ${ledger.name}</option>`;
                        });
                        $('#modeLedgerId').html(options);
                    }
                });
        }
    };

})(jQuery, window);

// Add CSS for icon selection
const iconStyles = document.createElement('style');
iconStyles.textContent = `
    .icon-option {
        padding: 15px;
        text-align: center;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #fff;
    }
    
    .icon-option:hover {
        border-color: #0d6efd;
        background: #f8f9fa;
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .icon-option.selected {
        border-color: #0d6efd;
        background: #e7f1ff;
        box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }
    
    .icon-option small {
        font-size: 0.7rem;
        color: #666;
    }
    
    .icon-option.selected small {
        color: #0d6efd;
        font-weight: 600;
    }
`;
document.head.appendChild(iconStyles);