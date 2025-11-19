// js/pages/inventory/categories.js
(function ($, window) {
    'use strict';

    window.InventoryCategoriesPage = {
        categories: [],
        dataTable: null,
        permissions: {},
        currentUser: null,


        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.loadCategories();
            this.bindEvents();
            this.loadPermissions();
        },
        // Load permissions
        loadPermissions: function () {
            const self = this;

            // These will come from the API response
            // For now, checking based on user role
            const userType = this.currentUser.user_type;

            this.permissions = {
                can_create_categories: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_categories: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_categories: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_categories: true
            };
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-tags"></i> Item Categories
                            </h3>
                        </div>
                        <div class="col-auto">
                        

                            <button type="button" class="btn btn-primary" id="btnAddCategory">
                                <i class="bi bi-plus-circle"></i> Add Category
                            </button>
                        
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="categoriesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="15%">Category Code</th>
                                            <th width="35%">Category Name</th>
                                            <th width="25%">Parent Category</th>
                                            <th width="10%" class="text-center">Status</th>
                                            <th width="15%" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="categoriesTableBody">
                                        <!-- Dynamic content -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.getCategoryModal()}
            `;

            $('#page-container').html(html);
        },

        getCategoryModal: function () {
            return `
                <!-- Add/Edit Category Modal -->
                <div class="modal fade" id="categoryModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="categoryModalTitle">Add Category</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="categoryForm">
                                <div class="modal-body">
                                    <input type="hidden" id="categoryId">
                                    <input type="hidden" id="categoryCode">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Category Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="categoryName" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Parent Category</label>
                                        <select class="form-select" id="parentId">
                                            <!-- Options will be populated dynamically -->
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3" id="statusGroup" style="display:none;">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="isActive">
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

        loadCategories: function () {
            const self = this;
            TempleCore.showLoading(true);

            TempleAPI.get('/inventory/categories')
                .done(function (response) {
                    if (response.success) {
                        self.categories = response.data || [];
                        self.permissions = response.data.permissions || self.permissions;
                        self.renderTable();
                        // Don't populate dropdown here - do it when modal opens
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast('Error loading categories', 'error');
                    self.categories = [];
                    self.renderTable();
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        renderTable: function () {
            const tbody = $('#categoriesTableBody');
            tbody.empty();

            if (this.categories.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="5" class="text-center">No categories found</td>
                    </tr>
                `);
                return;
            }

            this.categories.forEach(category => {
                const parentName = category.parent ? category.parent.category_name :
                    '<span class="text-muted">Root Category</span>';
                const statusBadge = category.is_active ?
                    '<span class="badge bg-success">Active</span>' :
                    '<span class="badge bg-danger">Inactive</span>';

                const row = `
                    <tr>
                        <td><strong>${category.category_code}</strong></td>
                        <td>
                            ${category.parent_id ? '<i class="bi bi-chevron-right text-muted me-1"></i>' : ''}
                            ${category.category_name}
                        </td>
                        <td>${parentName}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">
                          ${this.permissions.can_edit_categories ? `
                            <button class="btn btn-sm btn-primary edit-category" 
                                    data-id="${category.id}">
                                <i class="bi bi-pencil"></i>
                            </button>`: ''}
                            
${this.permissions.can_delete_categories ? `
                            <button class="btn btn-sm btn-danger delete-category" 
                                    data-id="${category.id}">
                                <i class="bi bi-trash"></i>`: ''}
                            </button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

            // Initialize DataTable if not already
            if (!this.dataTable) {
                this.dataTable = $('#categoriesTable').DataTable({
                    order: [[0, 'asc']],
                    pageLength: 25,
                    searching: true,
                    paging: true,
                    info: true
                });
            } else {
                this.dataTable.clear().destroy();
                this.dataTable = $('#categoriesTable').DataTable({
                    order: [[0, 'asc']],
                    pageLength: 25,
                    searching: true,
                    paging: true,
                    info: true
                });
            }
        },

        populateParentDropdown: function (excludeId) {
            const select = $('#parentId');

            // Clear existing options
            select.empty();

            // Add default option
            select.append('<option value="">No Parent (Root Category)</option>');

            // Only show categories that can be parents
            // For now, we'll show all categories except the one being edited
            const availableCategories = this.categories.filter(cat => {
                // Don't include the category being edited
                if (excludeId && cat.id === excludeId) {
                    return false;
                }
                // Don't include children of the category being edited (to prevent circular references)
                if (excludeId && cat.parent_id === excludeId) {
                    return false;
                }
                return true;
            });

            // Group categories by parent for better display
            const rootCategories = availableCategories.filter(cat => !cat.parent_id);
            const childCategories = availableCategories.filter(cat => cat.parent_id);

            // Add root categories first
            rootCategories.forEach(category => {
                select.append(`<option value="${category.id}">${category.category_name} (${category.category_code})</option>`);

                // Add children of this root category (indented)
                childCategories.filter(child => child.parent_id === category.id).forEach(child => {
                    select.append(`<option value="${child.id}">— ${child.category_name} (${child.category_code})</option>`);
                });
            });
        },

        bindEvents: function () {
            const self = this;

            // Add category button
            $('#btnAddCategory').on('click', function () {
                self.showAddModal();
            });

            // Edit category
            $(document).on('click', '.edit-category', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            // Delete category
            $(document).on('click', '.delete-category', function () {
                const id = $(this).data('id');
                self.deleteCategory(id);
            });

            // Form submission
            $('#categoryForm').on('submit', function (e) {
                e.preventDefault();
                self.saveCategory();
            });

            // Generate code when name is entered (for new categories)
            $('#categoryName').on('blur', function () {
                if (!$('#categoryId').val() && !$('#categoryCode').val()) {
                    self.generateCategoryCode();
                }
            });
        },

        showAddModal: function () {
            // Reset form
            $('#categoryForm')[0].reset();
            $('#categoryModalTitle').text('Add Category');
            $('#categoryId').val('');
            $('#categoryCode').val('');
            $('#statusGroup').hide();

            // Generate new code
            this.generateCategoryCode();

            // Populate parent dropdown (no exclusions for new category)
            this.populateParentDropdown();

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();
        },

        showEditModal: function (id) {
            const category = this.categories.find(c => c.id === id);
            if (!category) {
                TempleCore.showToast('Category not found', 'error');
                return;
            }

            // Set form values
            $('#categoryModalTitle').text('Edit Category');
            $('#categoryId').val(category.id);
            $('#categoryCode').val(category.category_code);
            $('#categoryName').val(category.category_name);
            $('#isActive').val(category.is_active ? '1' : '0');
            $('#statusGroup').show();

            // Populate parent dropdown (exclude current category and its children)
            this.populateParentDropdown(id);

            // Set selected parent
            $('#parentId').val(category.parent_id || '');

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();
        },

        generateCategoryCode: function () {
            // Find the highest code number
            let maxNumber = 0;
            this.categories.forEach(category => {
                const match = category.category_code.match(/CT(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNumber) {
                        maxNumber = num;
                    }
                }
            });

            const newCode = 'CT' + String(maxNumber + 1).padStart(4, '0');
            $('#categoryCode').val(newCode);
        },

        saveCategory: function () {
            const id = $('#categoryId').val();
            const data = {
                category_name: $('#categoryName').val().trim(),
                category_code: $('#categoryCode').val(),
                parent_id: $('#parentId').val() || null,
                is_active: $('#isActive').val() === '1'
            };

            // Validation
            if (!data.category_name) {
                TempleCore.showToast('Category name is required', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            const request = id ?
                TempleAPI.put(`/inventory/categories/${id}`, data) :
                TempleAPI.post('/inventory/categories', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                        TempleCore.showToast(response.message || 'Category saved successfully', 'success');
                        InventoryCategoriesPage.loadCategories();
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    if (response && response.errors) {
                        // Show validation errors
                        let errorMessage = 'Validation errors:\n';
                        Object.keys(response.errors).forEach(field => {
                            errorMessage += response.errors[field].join('\n') + '\n';
                        });
                        TempleCore.showToast(errorMessage, 'error');
                    } else {
                        TempleCore.showToast(response?.message || 'Error saving category', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        deleteCategory: function (id) {
            const category = this.categories.find(c => c.id === id);
            if (!category) return;

            TempleCore.showConfirm(
                'Delete Category',
                `Are you sure you want to delete "${category.category_name}"?<br>
                <small class="text-muted">This action cannot be undone.</small>`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.delete(`/inventory/categories/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast(response.message || 'Category deleted successfully', 'success');
                                InventoryCategoriesPage.loadCategories();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Error deleting category', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        }
    };

})(jQuery, window);