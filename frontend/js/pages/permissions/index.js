// js/pages/permissions/index.js
// Permission Management Page

(function($, window) {
    'use strict';
    
    window.PermissionsPage = {
        selectedPermission: null,
        modules: [],
        
        // Initialize the page
        init: function() {
            this.render();
            this.bindEvents();
            this.loadPermissions();
            this.loadModules();
            this.loadStatistics();
        },
        
        // Render the page HTML
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h2 class="page-title">
                                <i class="bi bi-key me-2"></i>Permission Management
                            </h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item active">Permissions</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="createPermissionBtn" data-permission="permissions.create">
                                <i class="bi bi-plus-circle me-2"></i>Create Permission
                            </button>
                            <button class="btn btn-outline-primary ms-2" id="generateCrudBtn" data-permission="permissions.create">
                                <i class="bi bi-magic me-2"></i>Generate CRUD
                            </button>
                            <button class="btn btn-outline-primary ms-2" id="refreshBtn">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon primary">
                                    <i class="bi bi-key"></i>
                                </div>
                                <div class="stat-value" id="totalPermissions">0</div>
                                <div class="stat-label">Total Permissions</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon info">
                                    <i class="bi bi-folder"></i>
                                </div>
                                <div class="stat-value" id="totalModules">0</div>
                                <div class="stat-label">Total Modules</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon success">
                                    <i class="bi bi-diagram-3"></i>
                                </div>
                                <div class="stat-value" id="avgPerModule">0</div>
                                <div class="stat-label">Avg Per Module</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon warning">
                                    <i class="bi bi-star"></i>
                                </div>
                                <div class="stat-value" id="mostUsed">0</div>
                                <div class="stat-label">Most Assigned</div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="input-group">
                                        <span class="input-group-text">
                                            <i class="bi bi-search"></i>
                                        </span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search permissions...">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <select class="form-select" id="moduleFilter">
                                        <option value="">All Modules</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <div class="form-check form-switch mt-2">
                                        <input class="form-check-input" type="checkbox" id="groupByModule" checked>
                                        <label class="form-check-label" for="groupByModule">Group by Module</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Permissions Display -->
                    <div id="permissionsContainer">
                        <div class="text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create/Edit Permission Modal -->
                <div class="modal fade" id="permissionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="permissionModalTitle">Create Permission</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="permissionForm">
                                    <div class="mb-3">
                                        <label class="form-label">Module <span class="text-danger">*</span></label>
                                        <select class="form-select" id="permissionModule" required>
                                            <option value="">Select Module</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Permission Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="permissionName" required>
                                        <div class="form-text">Format: module.action (e.g., users.create)</div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Display Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="permissionDisplayName" required>
                                        <div class="form-text">Human-readable name (e.g., Create Users)</div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="permissionDescription" rows="3"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePermissionBtn">Save Permission</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Generate CRUD Permissions Modal -->
                <div class="modal fade" id="generateCrudModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Generate CRUD Permissions</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="generateCrudForm">
                                    <div class="mb-3">
                                        <label class="form-label">Module Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="crudModule" required>
                                        <div class="form-text">e.g., products, categories</div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Module Display Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="crudModuleDisplay" required>
                                        <div class="form-text">e.g., Products, Categories</div>
                                    </div>
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle me-2"></i>
                                        This will generate 5 standard permissions:
                                        <ul class="mb-0 mt-2">
                                            <li>View</li>
                                            <li>Create</li>
                                            <li>Edit</li>
                                            <li>Delete</li>
                                            <li>Export</li>
                                        </ul>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="generatePermissionsBtn">Generate Permissions</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bulk Create Modal -->
                <div class="modal fade" id="bulkCreateModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Bulk Create Permissions</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="bulkCreateForm">
                                    <div class="mb-3">
                                        <label class="form-label">Module <span class="text-danger">*</span></label>
                                        <select class="form-select" id="bulkModule" required>
                                            <option value="">Select Module</option>
                                        </select>
                                    </div>
                                    <div id="bulkPermissionsContainer">
                                        <div class="permission-row mb-3">
                                            <div class="row g-2">
                                                <div class="col-md-4">
                                                    <input type="text" class="form-control" placeholder="Permission name" name="name[]">
                                                </div>
                                                <div class="col-md-4">
                                                    <input type="text" class="form-control" placeholder="Display name" name="display_name[]">
                                                </div>
                                                <div class="col-md-3">
                                                    <input type="text" class="form-control" placeholder="Description (optional)" name="description[]">
                                                </div>
                                                <div class="col-md-1">
                                                    <button type="button" class="btn btn-outline-danger remove-permission-btn">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-outline-primary" id="addPermissionRowBtn">
                                        <i class="bi bi-plus me-2"></i>Add Row
                                    </button>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="bulkSaveBtn">Create Permissions</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Permission Modal -->
                <div class="modal fade" id="viewPermissionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Permission Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="permissionDetailsContent">
                                <div class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            
            // Check permissions
            this.checkPermissions();
        },
        
        // Check permissions
        checkPermissions: function() {
            if (!TempleCore.hasPermission('permissions.create')) {
                $('#createPermissionBtn, #generateCrudBtn').hide();
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Create permission button
            $('#createPermissionBtn').on('click', function() {
                self.showCreateModal();
            });
            
            // Generate CRUD button
            $('#generateCrudBtn').on('click', function() {
                self.showGenerateCrudModal();
            });
            
            // Save permission button
            $('#savePermissionBtn').on('click', function() {
                self.savePermission();
            });
            
            // Generate permissions button
            $('#generatePermissionsBtn').on('click', function() {
                self.generateCrudPermissions();
            });
            
            // Search input
            $('#searchInput').on('keyup', function() {
                self.filterPermissions();
            });
            
            // Module filter
            $('#moduleFilter').on('change', function() {
                self.filterPermissions();
            });
            
            // Group by module toggle
            $('#groupByModule').on('change', function() {
                self.loadPermissions();
            });
            
            // Refresh button
            $('#refreshBtn').on('click', function() {
                self.loadPermissions();
                self.loadStatistics();
            });
            
            // Permission module change (auto-generate permission name)
            $('#permissionModule').on('change', function() {
                const module = $(this).val();
                if (module && !self.selectedPermission) {
                    const currentName = $('#permissionName').val();
                    if (!currentName || currentName.indexOf('.') === -1) {
                        $('#permissionName').val(module + '.');
                    }
                }
            });
            
            // Bulk create - add row
            $('#addPermissionRowBtn').on('click', function() {
                self.addBulkPermissionRow();
            });
            
            // Bulk create - remove row
            $(document).on('click', '.remove-permission-btn', function() {
                $(this).closest('.permission-row').remove();
            });
            
            // Bulk save
            $('#bulkSaveBtn').on('click', function() {
                self.bulkSavePermissions();
            });
            
            // Action buttons (delegation)
            $(document).on('click', '.edit-permission-btn', function() {
                const permissionId = $(this).data('id');
                self.showEditModal(permissionId);
            });
            
            $(document).on('click', '.view-permission-btn', function() {
                const permissionId = $(this).data('id');
                self.viewPermission(permissionId);
            });
            
            $(document).on('click', '.delete-permission-btn', function() {
                const permissionId = $(this).data('id');
                const permissionName = $(this).data('name');
                self.deletePermission(permissionId, permissionName);
            });
        },
        
        // Load permissions
        loadPermissions: function() {
            const self = this;
            const groupByModule = $('#groupByModule').is(':checked');
            
            TempleCore.showLoading(true);
            
            const endpoint = groupByModule ? '/permissions/grouped' : '/permissions';
            
            TempleAPI.get(endpoint)
                .done(function(response) {
                    if (response.success) {
                        if (groupByModule) {
                            self.renderGroupedPermissions(response.data);
                        } else {
                            self.renderFlatPermissions(response.data);
                        }
                    } else {
                        TempleCore.showToast('Failed to load permissions', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading permissions', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Render grouped permissions
        renderGroupedPermissions: function(modules) {
            let html = '';
            
            if (modules.length === 0) {
                html = `
                    <div class="card">
                        <div class="card-body text-center py-5">
                            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No permissions found</p>
                        </div>
                    </div>
                `;
            } else {
                modules.forEach(function(module) {
                    html += `
                        <div class="card mb-3 permission-module-card" data-module="${module.module}">
                            <div class="card-header">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="bi bi-folder me-2"></i>${module.display_name}
                                        <span class="badge bg-secondary ms-2">${module.count}</span>
                                    </h5>
                                    ${TempleCore.hasPermission('permissions.create') ? `
                                        <button class="btn btn-sm btn-outline-primary bulk-create-btn" data-module="${module.module}">
                                            <i class="bi bi-plus"></i> Add
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th width="25%">Permission Name</th>
                                                <th width="25%">Display Name</th>
                                                <th width="35%">Description</th>
                                                <th width="15%" class="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                    `;
                    
                    module.permissions.forEach(function(permission) {
                        html += `
                            <tr class="permission-row-item">
                                <td><code>${permission.name}</code></td>
                                <td>${permission.display_name}</td>
                                <td><small class="text-muted">${permission.description || '-'}</small></td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-info view-permission-btn" data-id="${permission.id}" title="View">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                        ${TempleCore.hasPermission('permissions.edit') ? `
                                            <button class="btn btn-outline-primary edit-permission-btn" data-id="${permission.id}" title="Edit">
                                                <i class="bi bi-pencil"></i>
                                            </button>
                                        ` : ''}
                                        ${TempleCore.hasPermission('permissions.delete') ? `
                                            <button class="btn btn-outline-danger delete-permission-btn" data-id="${permission.id}" data-name="${permission.display_name}" title="Delete">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            $('#permissionsContainer').html(html);
            
            // Bind bulk create button
            $('.bulk-create-btn').on('click', function() {
                const module = $(this).data('module');
                PermissionsPage.showBulkCreateModal(module);
            });
        },
        
        // Render flat permissions
        renderFlatPermissions: function(permissions) {
            let html = `
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th width="20%">Module</th>
                                        <th width="20%">Permission Name</th>
                                        <th width="20%">Display Name</th>
                                        <th width="30%">Description</th>
                                        <th width="10%" class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            if (permissions.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" class="text-center py-4">
                            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No permissions found</p>
                        </td>
                    </tr>
                `;
            } else {
                permissions.forEach(function(permission) {
                    html += `
                        <tr class="permission-row-item">
                            <td><span class="badge bg-secondary">${permission.module}</span></td>
                            <td><code>${permission.name}</code></td>
                            <td>${permission.display_name}</td>
                            <td><small class="text-muted">${permission.description || '-'}</small></td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-info view-permission-btn" data-id="${permission.id}" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${TempleCore.hasPermission('permissions.edit') ? `
                                        <button class="btn btn-outline-primary edit-permission-btn" data-id="${permission.id}" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                    ` : ''}
                                    ${TempleCore.hasPermission('permissions.delete') ? `
                                        <button class="btn btn-outline-danger delete-permission-btn" data-id="${permission.id}" data-name="${permission.display_name}" title="Delete">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            $('#permissionsContainer').html(html);
        },
        
        // Filter permissions
        filterPermissions: function() {
            const searchTerm = $('#searchInput').val().toLowerCase();
            const moduleFilter = $('#moduleFilter').val();
            const groupByModule = $('#groupByModule').is(':checked');
            
            if (groupByModule) {
                // Filter module cards
                $('.permission-module-card').each(function() {
                    const $card = $(this);
                    const module = $card.data('module');
                    
                    if (moduleFilter && module !== moduleFilter) {
                        $card.hide();
                    } else {
                        $card.show();
                        
                        // Filter rows within the module
                        $card.find('.permission-row-item').each(function() {
                            const $row = $(this);
                            const text = $row.text().toLowerCase();
                            
                            if (searchTerm && text.indexOf(searchTerm) === -1) {
                                $row.hide();
                            } else {
                                $row.show();
                            }
                        });
                    }
                });
            } else {
                // Filter table rows
                $('.permission-row-item').each(function() {
                    const $row = $(this);
                    const text = $row.text().toLowerCase();
                    const module = $row.find('.badge').text();
                    
                    let show = true;
                    
                    if (searchTerm && text.indexOf(searchTerm) === -1) {
                        show = false;
                    }
                    
                    if (moduleFilter && module !== moduleFilter) {
                        show = false;
                    }
                    
                    $row.toggle(show);
                });
            }
        },
        
        // Load modules
        loadModules: function() {
            const self = this;
            
            TempleAPI.get('/permissions/modules')
                .done(function(response) {
                    if (response.success) {
                        self.modules = response.data;
                        
                        // Update module filter
                        let filterHtml = '<option value="">All Modules</option>';
                        let modalHtml = '<option value="">Select Module</option>';
                        
                        response.data.forEach(function(module) {
                            filterHtml += `<option value="${module.value}">${module.display_name} (${module.count})</option>`;
                            modalHtml += `<option value="${module.value}">${module.display_name}</option>`;
                        });
                        
                        $('#moduleFilter').html(filterHtml);
                        $('#permissionModule, #bulkModule').html(modalHtml);
                    }
                })
                .fail(function() {
                    // Silent fail
                });
        },
        
        // Load statistics
        loadStatistics: function() {
            TempleAPI.get('/permissions/statistics')
                .done(function(response) {
                    if (response.success) {
                        const stats = response.data;
                        $('#totalPermissions').text(stats.total_permissions || 0);
                        $('#totalModules').text(stats.total_modules || 0);
                        
                        const avg = stats.total_modules > 0 
                            ? Math.round(stats.total_permissions / stats.total_modules) 
                            : 0;
                        $('#avgPerModule').text(avg);
                        
                        if (stats.most_assigned && stats.most_assigned.length > 0) {
                            $('#mostUsed').text(stats.most_assigned[0].assigned_count);
                        }
                    }
                })
                .fail(function() {
                    // Silent fail
                });
        },
        
        // Show create modal
        showCreateModal: function() {
            this.selectedPermission = null;
            $('#permissionModalTitle').text('Create Permission');
            $('#permissionForm')[0].reset();
            $('#permissionName').prop('readonly', false);
            const modal = new bootstrap.Modal(document.getElementById('permissionModal'));
            modal.show();
        },
        
        // Show edit modal
        showEditModal: function(permissionId) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/permissions/${permissionId}`)
                .done(function(response) {
                    if (response.success) {
                        self.selectedPermission = response.data;
                        $('#permissionModalTitle').text('Edit Permission');
                        $('#permissionModule').val(response.data.module);
                        $('#permissionName').val(response.data.name).prop('readonly', true);
                        $('#permissionDisplayName').val(response.data.display_name);
                        $('#permissionDescription').val(response.data.description);
                        
                        const modal = new bootstrap.Modal(document.getElementById('permissionModal'));
                        modal.show();
                    } else {
                        TempleCore.showToast('Failed to load permission', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading permission', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Save permission
        savePermission: function() {
            const self = this;
            
            const data = {
                module: $('#permissionModule').val(),
                name: $('#permissionName').val().trim(),
                display_name: $('#permissionDisplayName').val().trim(),
                description: $('#permissionDescription').val().trim()
            };
            
            // Validation
            if (!data.module || !data.name || !data.display_name) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            const request = this.selectedPermission
                ? TempleAPI.put(`/permissions/${this.selectedPermission.id}`, data)
                : TempleAPI.post('/permissions', data);
            
            request
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'Permission saved successfully', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('permissionModal')).hide();
                        self.loadPermissions();
                        self.loadModules();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save permission', 'error');
                    }
                })
                .fail(function(xhr) {
                    if (xhr.responseJSON && xhr.responseJSON.errors) {
                        const errors = xhr.responseJSON.errors;
                        const firstError = Object.values(errors)[0];
                        TempleCore.showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                    } else {
                        TempleCore.showToast('An error occurred while saving permission', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Show generate CRUD modal
        showGenerateCrudModal: function() {
            $('#generateCrudForm')[0].reset();
            const modal = new bootstrap.Modal(document.getElementById('generateCrudModal'));
            modal.show();
        },
        
        // Generate CRUD permissions
        generateCrudPermissions: function() {
            const self = this;
            
            const data = {
                module: $('#crudModule').val().trim().toLowerCase().replace(/\s+/g, '_'),
                module_display_name: $('#crudModuleDisplay').val().trim()
            };
            
            if (!data.module || !data.module_display_name) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/permissions/generate-crud', data)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'CRUD permissions generated successfully', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('generateCrudModal')).hide();
                        self.loadPermissions();
                        self.loadModules();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to generate permissions', 'error');
                    }
                })
                .fail(function(xhr) {
                    if (xhr.responseJSON && xhr.responseJSON.errors) {
                        const errors = xhr.responseJSON.errors;
                        const firstError = Object.values(errors)[0];
                        TempleCore.showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                    } else {
                        TempleCore.showToast('An error occurred while generating permissions', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Show bulk create modal
        showBulkCreateModal: function(module) {
            $('#bulkModule').val(module || '');
            $('#bulkPermissionsContainer').html(`
                <div class="permission-row mb-3">
                    <div class="row g-2">
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Permission name" name="name[]">
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Display name" name="display_name[]">
                        </div>
                        <div class="col-md-3">
                            <input type="text" class="form-control" placeholder="Description (optional)" name="description[]">
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-outline-danger remove-permission-btn">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `);
            
            const modal = new bootstrap.Modal(document.getElementById('bulkCreateModal'));
            modal.show();
        },
        
        // Add bulk permission row
        addBulkPermissionRow: function() {
            const html = `
                <div class="permission-row mb-3">
                    <div class="row g-2">
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Permission name" name="name[]">
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Display name" name="display_name[]">
                        </div>
                        <div class="col-md-3">
                            <input type="text" class="form-control" placeholder="Description (optional)" name="description[]">
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-outline-danger remove-permission-btn">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            $('#bulkPermissionsContainer').append(html);
        },
        
        // Bulk save permissions
        bulkSavePermissions: function() {
            const self = this;
            const module = $('#bulkModule').val();
            
            if (!module) {
                TempleCore.showToast('Please select a module', 'warning');
                return;
            }
            
            const permissions = [];
            
            $('#bulkPermissionsContainer .permission-row').each(function() {
                const $row = $(this);
                const name = $row.find('input[name="name[]"]').val().trim();
                const displayName = $row.find('input[name="display_name[]"]').val().trim();
                const description = $row.find('input[name="description[]"]').val().trim();
                
                if (name && displayName) {
                    permissions.push({
                        name: module + '.' + name,
                        display_name: displayName,
                        description: description
                    });
                }
            });
            
            if (permissions.length === 0) {
                TempleCore.showToast('Please add at least one valid permission', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/permissions/bulk', {
                module: module,
                permissions: permissions
            })
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast(response.message || 'Permissions created successfully', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('bulkCreateModal')).hide();
                    self.loadPermissions();
                    self.loadModules();
                    self.loadStatistics();
                } else {
                    TempleCore.showToast(response.message || 'Failed to create permissions', 'error');
                }
            })
            .fail(function(xhr) {
                if (xhr.responseJSON && xhr.responseJSON.errors) {
                    const errors = xhr.responseJSON.errors;
                    const firstError = Object.values(errors)[0];
                    TempleCore.showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                } else {
                    TempleCore.showToast('An error occurred while creating permissions', 'error');
                }
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        // View permission
        viewPermission: function(permissionId) {
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/permissions/${permissionId}`)
                .done(function(response) {
                    if (response.success) {
                        const permission = response.data;
                        
                        let rolesHtml = '';
                        if (permission.roles && permission.roles.length > 0) {
                            permission.roles.forEach(function(role) {
                                rolesHtml += `<span class="badge bg-secondary me-2">${role.display_name}</span>`;
                            });
                        } else {
                            rolesHtml = '<span class="text-muted">Not assigned to any role</span>';
                        }
                        
                        const html = `
                            <table class="table table-borderless">
                                <tr>
                                    <td width="30%"><strong>Module:</strong></td>
                                    <td><span class="badge bg-primary">${permission.module}</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Permission Name:</strong></td>
                                    <td><code>${permission.name}</code></td>
                                </tr>
                                <tr>
                                    <td><strong>Display Name:</strong></td>
                                    <td>${permission.display_name}</td>
                                </tr>
                                <tr>
                                    <td><strong>Description:</strong></td>
                                    <td>${permission.description || '-'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Assigned to Roles:</strong></td>
                                    <td>${rolesHtml}</td>
                                </tr>
                            </table>
                        `;
                        
                        $('#permissionDetailsContent').html(html);
                        const modal = new bootstrap.Modal(document.getElementById('viewPermissionModal'));
                        modal.show();
                    } else {
                        TempleCore.showToast('Failed to load permission details', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading permission details', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Delete permission
        deletePermission: function(permissionId, permissionName) {
            const self = this;
            
            TempleCore.showConfirm(
                'Delete Permission',
                `Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone.`,
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete(`/permissions/${permissionId}`)
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast(response.message || 'Permission deleted successfully', 'success');
                                self.loadPermissions();
                                self.loadModules();
                                self.loadStatistics();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete permission', 'error');
                            }
                        })
                        .fail(function(xhr) {
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                TempleCore.showToast(xhr.responseJSON.message, 'error');
                            } else {
                                TempleCore.showToast('An error occurred while deleting permission', 'error');
                            }
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        }
    };
    
})(jQuery, window);