// js/pages/users/roles.js
// User Role Assignment Page

(function($, window) {
    'use strict';
    
    window.UsersRolesPage = {
        currentPage: 1,
        searchTimer: null,
        selectedUser: null,
        availableRoles: [],
        availablePermissions: [],
        
        // Initialize the page
        init: function(params) {
            // Check if we're editing a specific user
            if (params && params.id) {
                this.loadUserRoles(params.id);
            } else {
                this.render();
                this.bindEvents();
                this.loadUsers();
                this.loadRoles();
            }
        },
        
        // Render the page HTML
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h2 class="page-title">
                                <i class="bi bi-person-badge me-2"></i>User Role Management
                            </h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('users'); return false;">Users</a></li>
                                    <li class="breadcrumb-item active">Role Assignment</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-outline-primary" id="refreshBtn">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="input-group">
                                        <span class="input-group-text">
                                            <i class="bi bi-search"></i>
                                        </span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search users...">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="userTypeFilter">
                                        <option value="">All User Types</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="STAFF">Staff</option>
                                        <option value="MEMBER">Member</option>
                                        <option value="AGENT">Agent</option>
                                        <option value="DEVOTEE">Devotee</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="roleFilter">
                                        <option value="">All Roles</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Users Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="20%">Name</th>
                                            <th width="20%">Email</th>
                                            <th width="10%">User Type</th>
                                            <th width="25%">Current Roles</th>
                                            <th width="10%" class="text-center">Status</th>
                                            <th width="10%" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="usersTableBody">
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

                <!-- Assign Roles Modal -->
                <div class="modal fade" id="assignRolesModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    Assign Roles to <span id="userNameInModal" class="text-primary"></span>
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle me-2"></i>
                                    Select one or more roles to assign to this user. The user will inherit all permissions from the assigned roles.
                                </div>
                                
                                <div id="rolesContainer">
                                    <div class="text-center">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading roles...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveRolesBtn">Save Roles</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Direct Permissions Modal -->
                <div class="modal fade" id="directPermissionsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    Direct Permissions for <span id="userNameInPermModal" class="text-primary"></span>
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    Direct permissions override role-based permissions. Use with caution.
                                </div>
                                
                                <div class="mb-3">
                                    <div class="btn-group" role="group">
                                        <button type="button" class="btn btn-outline-primary btn-sm" id="selectAllPerms">Select All</button>
                                        <button type="button" class="btn btn-outline-secondary btn-sm" id="deselectAllPerms">Deselect All</button>
                                    </div>
                                </div>
                                
                                <div id="directPermissionsContainer">
                                    <div class="text-center">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading permissions...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveDirectPermissionsBtn">Save Permissions</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View User Permissions Modal -->
                <div class="modal fade" id="viewPermissionsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">User Permissions Overview</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="userPermissionsContent" style="max-height: 70vh; overflow-y: auto;">
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
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Search input
            $('#searchInput').on('keyup', function() {
                clearTimeout(self.searchTimer);
                self.searchTimer = setTimeout(function() {
                    self.currentPage = 1;
                    self.loadUsers();
                }, 500);
            });
            
            // Filters
            $('#userTypeFilter, #roleFilter, #statusFilter').on('change', function() {
                self.currentPage = 1;
                self.loadUsers();
            });
            
            // Refresh button
            $('#refreshBtn').on('click', function() {
                self.loadUsers();
            });
            
            // Save roles button
            $('#saveRolesBtn').on('click', function() {
                self.saveUserRoles();
            });
            
            // Save direct permissions button
            $('#saveDirectPermissionsBtn').on('click', function() {
                self.saveDirectPermissions();
            });
            
            // Select/Deselect all permissions
            $('#selectAllPerms').on('click', function() {
                $('#directPermissionsContainer input[type="checkbox"]').prop('checked', true);
            });
            
            $('#deselectAllPerms').on('click', function() {
                $('#directPermissionsContainer input[type="checkbox"]').prop('checked', false);
            });
            
            // Table action buttons (delegation)
            $(document).on('click', '.assign-roles-btn', function() {
                const userId = $(this).data('id');
                const userName = $(this).data('name');
                self.showAssignRolesModal(userId, userName);
            });
            
            $(document).on('click', '.direct-permissions-btn', function() {
                const userId = $(this).data('id');
                const userName = $(this).data('name');
                self.showDirectPermissionsModal(userId, userName);
            });
            
            $(document).on('click', '.view-permissions-btn', function() {
                const userId = $(this).data('id');
                self.viewUserPermissions(userId);
            });
        },
        
        // Load users
        loadUsers: function() {
            const self = this;
            
            const params = {
                page: this.currentPage,
                per_page: 20,
                search: $('#searchInput').val(),
                user_type: $('#userTypeFilter').val(),
                role: $('#roleFilter').val(),
                is_active: $('#statusFilter').val()
            };
            
            // Remove empty parameters
            Object.keys(params).forEach(key => !params[key] && delete params[key]);
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/users', params)
                .done(function(response) {
                    if (response.success) {
                        self.renderUsers(response.data);
                    } else {
                        TempleCore.showToast('Failed to load users', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading users', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Render users table
        renderUsers: function(data) {
            const users = data.data || data;
            let html = '';
            
            if (users.length === 0) {
                html = `
                    <tr>
                        <td colspan="7" class="text-center py-4">
                            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No users found</p>
                        </td>
                    </tr>
                `;
            } else {
                users.forEach(function(user, index) {
                    const statusLabel = user.is_active 
                        ? '<span class="badge bg-success">Active</span>' 
                        : '<span class="badge bg-danger">Inactive</span>';
                    
                    let rolesHtml = '';
                    if (user.roles && user.roles.length > 0) {
                        user.roles.forEach(function(role) {
                            rolesHtml += `<span class="badge bg-primary me-1">${role.display_name || role.name}</span>`;
                        });
                    } else {
                        rolesHtml = '<span class="text-muted">No roles assigned</span>';
                    }
                    
                    const userTypeClass = {
                        'SUPER_ADMIN': 'danger',
                        'ADMIN': 'warning',
                        'STAFF': 'info',
                        'MEMBER': 'success',
                        'AGENT': 'secondary',
                        'DEVOTEE': 'light'
                    }[user.user_type] || 'secondary';
                    
                    html += `
                        <tr>
                            <td>${(data.current_page - 1) * data.per_page + index + 1}</td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="avatar-sm me-2">
                                        <span class="avatar-title rounded-circle bg-${userTypeClass}">
                                            ${user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <div class="fw-semibold">${user.name}</div>
                                        <small class="text-muted">${user.username || '-'}</small>
                                    </div>
                                </div>
                            </td>
                            <td>${user.email}</td>
                            <td>
                                <span class="badge bg-${userTypeClass}">${user.user_type}</span>
                            </td>
                            <td>${rolesHtml}</td>
                            <td class="text-center">${statusLabel}</td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-primary assign-roles-btn" 
                                        data-id="${user.id}" 
                                        data-name="${user.name}" 
                                        title="Assign Roles"
                                        ${user.user_type === 'SUPER_ADMIN' && !TempleCore.getUser().user_type === 'SUPER_ADMIN' ? 'disabled' : ''}>
                                        <i class="bi bi-shield-check"></i>
                                    </button>
                                    <button class="btn btn-outline-warning direct-permissions-btn" 
                                        data-id="${user.id}" 
                                        data-name="${user.name}" 
                                        title="Direct Permissions"
                                        ${user.user_type === 'SUPER_ADMIN' && !TempleCore.getUser().user_type === 'SUPER_ADMIN' ? 'disabled' : ''}>
                                        <i class="bi bi-key"></i>
                                    </button>
                                    <button class="btn btn-outline-info view-permissions-btn" 
                                        data-id="${user.id}" 
                                        title="View Permissions">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#usersTableBody').html(html);
            
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
            $('#paginationInfo').text(`Showing ${from} to ${to} of ${data.total} users`);
            
            // Bind pagination events
            const self = this;
            $('#paginationContainer .page-link').on('click', function(e) {
                e.preventDefault();
                if (!$(this).parent().hasClass('disabled')) {
                    self.currentPage = parseInt($(this).data('page'));
                    self.loadUsers();
                }
            });
        },
        
        // Load roles for dropdown
        loadRoles: function() {
            TempleAPI.get('/roles')
                .done(function(response) {
                    if (response.success) {
                        const roles = response.data.data || response.data;
                        
                        let filterHtml = '<option value="">All Roles</option>';
                        roles.forEach(function(role) {
                            filterHtml += `<option value="${role.name}">${role.display_name}</option>`;
                        });
                        
                        $('#roleFilter').html(filterHtml);
                        UsersRolesPage.availableRoles = roles;
                    }
                })
                .fail(function() {
                    // Silent fail
                });
        },
        
        // Show assign roles modal
        showAssignRolesModal: function(userId, userName) {
            const self = this;
            
            this.selectedUser = { id: userId, name: userName };
            $('#userNameInModal').text(userName);
            $('#rolesContainer').html(`
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading roles...</span>
                    </div>
                </div>
            `);
            
            const modal = new bootstrap.Modal(document.getElementById('assignRolesModal'));
            modal.show();
            
            // Load user's current roles
            TempleAPI.get(`/users/${userId}`)
                .then(function(response) {
                    const user = response.data;
                    const userRoles = user.roles ? user.roles.map(r => r.id) : [];
                    
                    self.renderRolesCheckboxes(userRoles);
                })
                .catch(function() {
                    TempleCore.showToast('Failed to load user roles', 'error');
                });
        },
        
        // Render roles checkboxes
        renderRolesCheckboxes: function(userRoles) {
            let html = '<div class="row">';
            
            this.availableRoles.forEach(function(role) {
                const isChecked = userRoles.includes(role.id);
                const isDisabled = role.name === 'super_admin' && TempleCore.getUser().user_type !== 'SUPER_ADMIN';
                
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" 
                                value="${role.id}" 
                                id="role_${role.id}"
                                ${isChecked ? 'checked' : ''}
                                ${isDisabled ? 'disabled' : ''}>
                            <label class="form-check-label" for="role_${role.id}">
                                <strong>${role.display_name}</strong>
                                ${role.is_system ? '<span class="badge bg-info ms-1">System</span>' : ''}
                                <br>
                                <small class="text-muted">${role.description || 'No description'}</small>
                            </label>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            $('#rolesContainer').html(html);
        },
        
        // Save user roles
        saveUserRoles: function() {
            const self = this;
            
            const roles = [];
            $('#rolesContainer input[type="checkbox"]:checked').each(function() {
                roles.push($(this).val());
            });
            
            if (roles.length === 0) {
                TempleCore.showToast('Please select at least one role', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/users/${this.selectedUser.id}/assign-roles`, { roles: roles })
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Roles assigned successfully', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('assignRolesModal')).hide();
                        self.loadUsers();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to assign roles', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while assigning roles', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Show direct permissions modal
        showDirectPermissionsModal: function(userId, userName) {
            const self = this;
            
            this.selectedUser = { id: userId, name: userName };
            $('#userNameInPermModal').text(userName);
            $('#directPermissionsContainer').html(`
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading permissions...</span>
                    </div>
                </div>
            `);
            
            const modal = new bootstrap.Modal(document.getElementById('directPermissionsModal'));
            modal.show();
            
            // Load permissions
            Promise.all([
                TempleAPI.get('/permissions/grouped'),
                TempleAPI.get(`/users/${userId}/permissions`)
            ]).then(function(responses) {
                const modules = responses[0].data;
                const userPermData = responses[1].data;
                const directPermissions = userPermData.direct_permissions ? userPermData.direct_permissions.map(p => p.id) : [];
                
                self.renderDirectPermissionsForm(modules, directPermissions);
            }).catch(function() {
                TempleCore.showToast('Failed to load permissions', 'error');
            });
        },
        
        // Render direct permissions form
        renderDirectPermissionsForm: function(modules, directPermissions) {
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
                    const isChecked = directPermissions.includes(permission.id);
                    html += `
                        <div class="col-md-4 mb-2">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                    value="${permission.id}" 
                                    id="direct_perm_${permission.id}"
                                    ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label" for="direct_perm_${permission.id}">
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
            
            $('#directPermissionsContainer').html(html);
        },
        
        // Save direct permissions
        saveDirectPermissions: function() {
            const self = this;
            
            const permissions = [];
            $('#directPermissionsContainer input[type="checkbox"]:checked').each(function() {
                permissions.push($(this).val());
            });
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/users/${this.selectedUser.id}/sync-permissions`, { permissions: permissions })
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Direct permissions updated successfully', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('directPermissionsModal')).hide();
                        self.loadUsers();
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
        
        // View user permissions
        viewUserPermissions: function(userId) {
            TempleCore.showLoading(true);
            
            TempleAPI.get(`/users/${userId}/permissions`)
                .done(function(response) {
                    if (response.success) {
                        const data = response.data;
                        
                        let rolesHtml = '';
                        if (data.roles && data.roles.length > 0) {
                            data.roles.forEach(function(role) {
                                rolesHtml += `
                                    <span class="badge bg-primary me-2">
                                        ${role.display_name}
                                        ${role.is_system ? '<i class="bi bi-shield-lock ms-1"></i>' : ''}
                                    </span>
                                `;
                            });
                        } else {
                            rolesHtml = '<span class="text-muted">No roles assigned</span>';
                        }
                        
                        let directPermsHtml = '';
                        if (data.direct_permissions && data.direct_permissions.length > 0) {
                            directPermsHtml = '<div class="mt-2">';
                            data.direct_permissions.forEach(function(perm) {
                                directPermsHtml += `<span class="badge bg-warning me-1">${perm.display_name}</span>`;
                            });
                            directPermsHtml += '</div>';
                        }
                        
                        let allPermsHtml = '';
                        if (data.all_permissions && data.all_permissions.length > 0) {
                            data.all_permissions.forEach(function(module) {
                                allPermsHtml += `
                                    <div class="mb-3">
                                        <h6 class="text-primary">${module.display_name}</h6>
                                        <div class="d-flex flex-wrap gap-1">
                                `;
                                
                                module.permissions.forEach(function(perm) {
                                    allPermsHtml += `<span class="badge bg-secondary">${perm.display_name}</span>`;
                                });
                                
                                allPermsHtml += `
                                        </div>
                                    </div>
                                `;
                            });
                        }
                        
                        const html = `
                            <div class="user-info mb-4">
                                <h5>${data.user.name}</h5>
                                <p class="text-muted mb-1">${data.user.email}</p>
                                <span class="badge bg-info">${data.user.user_type}</span>
                            </div>
                            
                            <div class="mb-4">
                                <h6>Assigned Roles</h6>
                                ${rolesHtml}
                            </div>
                            
                            ${directPermsHtml ? `
                                <div class="mb-4">
                                    <h6>Direct Permissions</h6>
                                    ${directPermsHtml}
                                </div>
                            ` : ''}
                            
                            <div>
                                <h6>All Effective Permissions</h6>
                                ${allPermsHtml || '<p class="text-muted">No permissions</p>'}
                            </div>
                        `;
                        
                        $('#userPermissionsContent').html(html);
                        const modal = new bootstrap.Modal(document.getElementById('viewPermissionsModal'));
                        modal.show();
                    } else {
                        TempleCore.showToast('Failed to load user permissions', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while loading permissions', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        }
    };
    
})(jQuery, window);