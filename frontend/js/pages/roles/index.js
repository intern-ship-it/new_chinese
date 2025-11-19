// js/pages/roles/index.js
// Role Management Page

(function($, window) {
    'use strict';
    
    window.RolesPage = {
        currentPage: 1,
        searchTimer: null,
        selectedRole: null,
        
        // Initialize the page
        init: function() {
            this.render();
            this.bindEvents();
            this.loadRoles();
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
                                <i class="bi bi-shield-lock me-2"></i>Role Management
                            </h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item active">Roles</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="createRoleBtn" data-permission="roles.create">
                                <i class="bi bi-plus-circle me-2"></i>Create New Role
                            </button>
                            <button class="btn btn-outline-primary ms-2" id="refreshBtn">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4" id="statisticsContainer">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon primary">
                                    <i class="bi bi-shield"></i>
                                </div>
                                <div class="stat-value" id="totalRoles">0</div>
                                <div class="stat-label">Total Roles</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon info">
                                    <i class="bi bi-gear"></i>
                                </div>
                                <div class="stat-value" id="systemRoles">0</div>
                                <div class="stat-label">System Roles</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon success">
                                    <i class="bi bi-person-badge"></i>
                                </div>
                                <div class="stat-value" id="customRoles">0</div>
                                <div class="stat-label">Custom Roles</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon warning">
                                    <i class="bi bi-people"></i>
                                </div>
                                <div class="stat-value" id="rolesWithUsers">0</div>
                                <div class="stat-label">Roles with Users</div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters and Search -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="input-group">
                                        <span class="input-group-text">
                                            <i class="bi bi-search"></i>
                                        </span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search roles by name or description...">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="typeFilter">
                                        <option value="">All Types</option>
                                        <option value="1">System Roles</option>
                                        <option value="0">Custom Roles</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="perPageSelect">
                                        <option value="20">20 per page</option>
                                        <option value="50">50 per page</option>
                                        <option value="100">100 per page</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Roles Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="20%">Role Name</th>
                                            <th width="20%">Display Name</th>
                                            <th width="30%">Description</th>
                                            <th width="10%" class="text-center">Permissions</th>
                                            <th width="5%" class="text-center">Type</th>
                                            <th width="10%" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="rolesTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div id="paginationInfo"></div>
                                <nav>
                                    <ul class="pagination mb-0" id="paginationContainer"></ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create/Edit Role Modal -->
                <div class="modal fade" id="roleModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="roleModalTitle">Create New Role</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="roleForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Role Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="roleName" required>
                                            <div class="form-text">Unique identifier (e.g., branch_manager)</div>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Display Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="roleDisplayName" required>
                                            <div class="form-text">Human-readable name (e.g., Branch Manager)</div>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" id="roleDescription" rows="3"></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveRoleBtn">Save Role</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Assign Permissions Modal -->
                <div class="modal fade" id="permissionsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Assign Permissions to <span id="roleNameInModal"></span></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                                <div class="mb-3">
                                    <div class="btn-group" role="group">
                                        <button type="button" class="btn btn-outline-primary btn-sm" id="selectAllPermissions">Select All</button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm" id="deselectAllPermissions">Deselect All</button>
                                    </div>
                                </div>
                                <div id="permissionsContainer">
                                    <div class="text-center">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading permissions...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="savePermissionsBtn">Save Permissions</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Role Modal -->
                <div class="modal fade" id="viewRoleModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Role Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="roleDetailsContent">
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
            
            // Check permissions and hide/show buttons
            this.checkPermissions();
        },
        
        // Check permissions
        checkPermissions: function() {
            if (!TempleCore.hasPermission('roles.create')) {
                $('#createRoleBtn').hide();
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Create role button
            $('#createRoleBtn').on('click', function() {
                self.showCreateModal();
            });
            
            // Save role button
            $('#saveRoleBtn').on('click', function() {
                self.saveRole();
            });
            
            // Save permissions button
            $('#savePermissionsBtn').on('click', function() {
                self.savePermissions();
            });
            
            // Search input
            $('#searchInput').on('keyup', function() {
                clearTimeout(self.searchTimer);
                self.searchTimer = setTimeout(function() {
                    self.currentPage = 1;
                    self.loadRoles();
                }, 500);
            });
            
            // Type filter
            $('#typeFilter').on('change', function() {
                self.currentPage = 1;
                self.loadRoles();
            });
            
            // Per page select
            $('#perPageSelect').on('change', function() {
                self.currentPage = 1;
                self.loadRoles();
            });
            
            // Refresh button
            $('#refreshBtn').on('click', function() {
                self.loadRoles();
                self.loadStatistics();
            });
            
            // Select/Deselect all permissions
            $('#selectAllPermissions').on('click', function() {
                $('#permissionsContainer input[type="checkbox"]').prop('checked', true);
            });
            
            $('#deselectAllPermissions').on('click', function() {
                $('#permissionsContainer input[type="checkbox"]').prop('checked', false);
            });
            
            // Table action buttons (using delegation)
            $(document).on('click', '.edit-role-btn', function() {
                const roleId = $(this).data('id');
                self.showEditModal(roleId);
            });
            
            $(document).on('click', '.permissions-role-btn', function() {
                const roleId = $(this).data('id');
                const roleName = $(this).data('name');
                self.showPermissionsModal(roleId, roleName);
            });
            
            $(document).on('click', '.view-role-btn', function() {
                const roleId = $(this).data('id');
                self.viewRole(roleId);
            });
            
            $(document).on('click', '.duplicate-role-btn', function() {
                const roleId = $(this).data('id');
                self.duplicateRole(roleId);
            });
            
            $(document).on('click', '.delete-role-btn', function() {
                const roleId = $(this).data('id');
                const roleName = $(this).data('name');
                self.deleteRole(roleId, roleName);
            });
        },
        
        // Load roles
        loadRoles: function() {
            const self = this;
            
            const params = {
                page: this.currentPage,
                per_page: $('#perPageSelect').val(),
                search: $('#searchInput').val(),
                is_system: $('#typeFilter').val()
            };
            
            // Remove empty parameters
            Object.keys(params).forEach(key => !params[key] && delete params[key]);
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/roles', params)
                .done(function(response) {
                    if (response.success) {
                        self.renderRoles(response.data);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load roles', 'error');
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast('An error occurred while loading roles', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Render roles table
        renderRoles: function(data) {
            const roles = data.data || data;
            let html = '';
            
            if (roles.length === 0) {
                html = `
                    <tr>
                        <td colspan="7" class="text-center py-4">
                            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No roles found</p>
                        </td>
                    </tr>
                `;
            } else {
                roles.forEach(function(role, index) {
                    const typeLabel = role.is_system 
                        ? '<span class="badge bg-info">System</span>' 
                        : '<span class="badge bg-success">Custom</span>';
                    
                    const isProtected = role.is_system || role.name === 'super_admin';
                    
                    html += `
                        <tr>
                            <td>${(data.current_page - 1) * data.per_page + index + 1}</td>
                            <td>
                                <code>${role.name}</code>
                            </td>
                            <td>${role.display_name || '-'}</td>
                            <td>${role.description || '-'}</td>
                            <td class="text-center">
                                <span class="badge bg-primary">${role.permissions_count || 0}</span>
                            </td>
                            <td class="text-center">${typeLabel}</td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-info view-role-btn" data-id="${role.id}" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${!isProtected && TempleCore.hasPermission('roles.edit') ? `
                                        <button class="btn btn-outline-primary edit-role-btn" data-id="${role.id}" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                    ` : ''}
                                    ${role.name !== 'super_admin' && TempleCore.hasPermission('roles.edit') ? `
                                        <button class="btn btn-outline-warning permissions-role-btn" data-id="${role.id}" data-name="${role.display_name}" title="Manage Permissions">
                                            <i class="bi bi-shield-check"></i>
                                        </button>
                                    ` : ''}
                                    ${!isProtected && TempleCore.hasPermission('roles.create') ? `
                                        <button class="btn btn-outline-success duplicate-role-btn" data-id="${role.id}" title="Duplicate">
                                            <i class="bi bi-copy"></i>
                                        </button>
                                    ` : ''}
                                    ${!isProtected && TempleCore.hasPermission('roles.delete') ? `
                                        <button class="btn btn-outline-danger delete-role-btn" data-id="${role.id}" data-name="${role.display_name}" title="Delete">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#rolesTableBody').html(html);
            
            // Update pagination
            if (data.last_page) {
                this.renderPagination(data);
            }
        },
        
        // Render pagination
        renderPagination: function(data) {
            let paginationHtml = '';
            
            // Previous button
            paginationHtml += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                </li>
            `;
            
            // Page numbers
            const maxPages = 5;
            let startPage = Math.max(1, data.current_page - Math.floor(maxPages / 2));
            let endPage = Math.min(data.last_page, startPage + maxPages - 1);
            
            if (endPage - startPage < maxPages - 1) {
                startPage = Math.max(1, endPage - maxPages + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <li class="page-item ${i === data.current_page ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
            
            // Next button
            paginationHtml += `
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                </li>
            `;
            
            $('#paginationContainer').html(paginationHtml);
            
            // Update info
            const from = (data.current_page - 1) * data.per_page + 1;
            const to = Math.min(data.current_page * data.per_page, data.total);
            $('#paginationInfo').text(`Showing ${from} to ${to} of ${data.total} roles`);
            
            // Bind pagination events
            const self = this;
            $('#paginationContainer .page-link').on('click', function(e) {
                e.preventDefault();
                if (!$(this).parent().hasClass('disabled')) {
                    self.currentPage = parseInt($(this).data('page'));
                    self.loadRoles();
                }
            });
        },
        
        // Load statistics
        loadStatistics: function() {
            TempleAPI.get('/roles/statistics')
                .done(function(response) {
                    if (response.success) {
                        const stats = response.data;
                        $('#totalRoles').text(stats.total_roles || 0);
                        $('#systemRoles').text(stats.system_roles || 0);
                        $('#customRoles').text(stats.custom_roles || 0);
                        $('#rolesWithUsers').text(stats.roles_with_users || 0);
                    }
                })
                .fail(function() {
                    // Silent fail for statistics
                });
        },
        
        // Show create modal
        showCreateModal: function() {
            this.selectedRole = null;
            $('#roleModalTitle').text('Create New Role');
            $('#roleForm')[0].reset();
            $('#roleName').prop('readonly', false);
            const modal = new bootstrap.Modal(document.getElementById('roleModal'));
            modal.show();
        },
        
        // Show edit modal
        showEditModal: function(roleId) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/roles/${roleId}`)
                .done(function(response) {
                    if (response.success) {
                        self.selectedRole = response.data;
                        $('#roleModalTitle').text('Edit Role');
                        $('#roleName').val(response.data.name).prop('readonly', true);
                        $('#roleDisplayName').val(response.data.display_name);
                        $('#roleDescription').val(response.data.description);
                        
                        const modal = new bootstrap.Modal(document.getElementById('roleModal'));
                        modal.show();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load role', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading role', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Save role (create or update)
        saveRole: function() {
            const self = this;
            
            const data = {
                name: $('#roleName').val().trim(),
                display_name: $('#roleDisplayName').val().trim(),
                description: $('#roleDescription').val().trim()
            };
            
            // Validation
            if (!data.name || !data.display_name) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            const request = this.selectedRole 
                ? TempleAPI.put(`/roles/${this.selectedRole.id}`, data)
                : TempleAPI.post('/roles', data);
            
            request
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'Role saved successfully', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('roleModal')).hide();
                        self.loadRoles();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save role', 'error');
                    }
                })
                .fail(function(xhr) {
                    if (xhr.responseJSON && xhr.responseJSON.errors) {
                        const errors = xhr.responseJSON.errors;
                        const firstError = Object.values(errors)[0];
                        TempleCore.showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                    } else {
                        TempleCore.showToast('An error occurred while saving role', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Show permissions modal
        showPermissionsModal: function(roleId, roleName) {
            const self = this;
            
            this.selectedRole = { id: roleId };
            $('#roleNameInModal').text(roleName);
            $('#permissionsContainer').html(`
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading permissions...</span>
                    </div>
                </div>
            `);
            
            const modal = new bootstrap.Modal(document.getElementById('permissionsModal'));
            modal.show();
            
            // Load permissions and role permissions
            Promise.all([
                TempleAPI.get('/roles/permissions-for-assignment'),
                TempleAPI.get(`/roles/${roleId}`)
            ]).then(function(responses) {
                const modules = responses[0].data;
                const role = responses[1].data;
                const assignedPermissions = role.permissions.map(p => p.id);
                
                self.renderPermissionsForm(modules, assignedPermissions);
            }).catch(function() {
                TempleCore.showToast('Failed to load permissions', 'error');
            });
        },
        
        // Render permissions form
        renderPermissionsForm: function(modules, assignedPermissions) {
            let html = '';
            
            modules.forEach(function(module) {
                html += `
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="bi bi-folder me-2"></i>${module.display_name}
                                <span class="badge bg-secondary ms-2">${module.permissions.length}</span>
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                `;
                
                module.permissions.forEach(function(permission) {
                    const isChecked = assignedPermissions.includes(permission.id);
                    html += `
                        <div class="col-md-4 mb-2">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                    value="${permission.id}" 
                                    id="perm_${permission.id}"
                                    ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label" for="perm_${permission.id}">
                                    ${permission.display_name}
                                    <small class="text-muted d-block">${permission.name}</small>
                                </label>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
            
            $('#permissionsContainer').html(html);
        },
        
        // Save permissions
        savePermissions: function() {
            const self = this;
            
            const permissions = [];
            $('#permissionsContainer input[type="checkbox"]:checked').each(function() {
                permissions.push($(this).val());
            });
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/roles/${this.selectedRole.id}/assign-permissions`, { permissions: permissions })
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'Permissions updated successfully', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('permissionsModal')).hide();
                        self.loadRoles();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update permissions', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while updating permissions', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // View role details
        viewRole: function(roleId) {
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/roles/${roleId}`)
                .done(function(response) {
                    if (response.success) {
                        const role = response.data;
                        
                        let permissionsHtml = '';
                        const permissionsByModule = {};
                        
                        role.permissions.forEach(function(permission) {
                            if (!permissionsByModule[permission.module]) {
                                permissionsByModule[permission.module] = [];
                            }
                            permissionsByModule[permission.module].push(permission);
                        });
                        
                        Object.keys(permissionsByModule).forEach(function(module) {
                            const modulePerms = permissionsByModule[module];
                            permissionsHtml += `
                                <div class="mb-3">
                                    <h6>${module.replace(/_/g, ' ').toUpperCase()}</h6>
                                    <div class="d-flex flex-wrap gap-2">
                                        ${modulePerms.map(p => `<span class="badge bg-secondary">${p.display_name}</span>`).join('')}
                                    </div>
                                </div>
                            `;
                        });
                        
                        const html = `
                            <div class="row">
                                <div class="col-md-6">
                                    <label class="text-muted">Role Name</label>
                                    <p><code>${role.name}</code></p>
                                </div>
                                <div class="col-md-6">
                                    <label class="text-muted">Display Name</label>
                                    <p>${role.display_name || '-'}</p>
                                </div>
                                <div class="col-12">
                                    <label class="text-muted">Description</label>
                                    <p>${role.description || '-'}</p>
                                </div>
                                <div class="col-12">
                                    <label class="text-muted">Type</label>
                                    <p>${role.is_system ? '<span class="badge bg-info">System Role</span>' : '<span class="badge bg-success">Custom Role</span>'}</p>
                                </div>
                                <div class="col-12">
                                    <label class="text-muted">Assigned Permissions (${role.permissions.length})</label>
                                    ${permissionsHtml || '<p>No permissions assigned</p>'}
                                </div>
                            </div>
                        `;
                        
                        $('#roleDetailsContent').html(html);
                        const modal = new bootstrap.Modal(document.getElementById('viewRoleModal'));
                        modal.show();
                    } else {
                        TempleCore.showToast('Failed to load role details', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading role details', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Duplicate role
        duplicateRole: function(roleId) {
            const self = this;
            
            const newName = prompt('Enter name for the new role:');
            if (!newName) return;
            
            const newDisplayName = prompt('Enter display name for the new role:');
            if (!newDisplayName) return;
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/roles/${roleId}/duplicate`, {
                name: newName,
                display_name: newDisplayName
            })
            .done(function(response) {
                if (response.success) {
                    TempleCore.showToast('Role duplicated successfully', 'success');
                    self.loadRoles();
                    self.loadStatistics();
                } else {
                    TempleCore.showToast(response.message || 'Failed to duplicate role', 'error');
                }
            })
            .fail(function(xhr) {
                if (xhr.responseJSON && xhr.responseJSON.errors) {
                    const errors = xhr.responseJSON.errors;
                    const firstError = Object.values(errors)[0];
                    TempleCore.showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                } else {
                    TempleCore.showToast('An error occurred while duplicating role', 'error');
                }
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        // Delete role
        deleteRole: function(roleId, roleName) {
            const self = this;
            
            TempleCore.showConfirm(
                'Delete Role',
                `Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`,
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete(`/roles/${roleId}`)
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast(response.message || 'Role deleted successfully', 'success');
                                self.loadRoles();
                                self.loadStatistics();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete role', 'error');
                            }
                        })
                        .fail(function(xhr) {
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                TempleCore.showToast(xhr.responseJSON.message, 'error');
                            } else {
                                TempleCore.showToast('An error occurred while deleting role', 'error');
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