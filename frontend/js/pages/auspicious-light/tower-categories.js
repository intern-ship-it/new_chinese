// js/pages/auspicious-light/tower-categories.js
// Tower Category Management Page

(function ($, window) {
    'use strict';

    window.PagodaTowerCategoriesPage = {
        // Initialize page
        init: function (params) {
            console.log('Initializing Tower Categories Management');
            this.params = params || {};
            this.render();
            this.loadCategories();
            this.attachEvents();
        },

        // Render page structure
        render: function () {
            const html = `
                <div class="tower-categories-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h1 class="page-title mb-2">
                                    <i class="bi bi-tags me-2"></i>
                                    Tower Categories
                                </h1>
                                <p class="text-muted mb-0">???? - Manage tower categories and classifications</p>
                            </div>
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <button class="btn btn-outline-secondary" id="btnRefresh">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                                <button class="btn btn-success" id="btnAddCategory">
                                    <i class="bi bi-plus-circle"></i> Add Category
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Content Container -->
                    <div class="card shadow-sm">
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="categoriesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="20%"><i class="bi bi-tag me-2"></i>Primary Name</th>
                                            <th width="20%"><i class="bi bi-translate me-2"></i>Secondary Name</th>
                                            <th width="25%"><i class="bi bi-info-circle me-2"></i>Description</th>
                                            <th width="10%" class="text-center"><i class="bi bi-building me-2"></i>Towers</th>
                                            <th width="10%" class="text-center"><i class="bi bi-sort-numeric-up me-2"></i>Order</th>
                                            <th width="10%"><i class="bi bi-toggle-on me-2"></i>Status</th>
                                            <th width="10%"><i class="bi bi-gear me-2"></i>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="categoriesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center py-5">
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

                <style>
                    .table-hover tbody tr {
                        transition: all 0.2s ease;
                    }
                    .table-hover tbody tr:hover {
                        background-color: rgba(13, 110, 253, 0.05);
                        transform: scale(1.01);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .badge {
                        padding: 0.5em 0.8em;
                        font-weight: 600;
                    }
                    .btn-group-sm .btn {
                        transition: all 0.2s ease;
                    }
                    .btn-group-sm .btn:hover {
                        transform: scale(1.1);
                    }
                </style>
            `;

            $('#page-container').html(html);
        },

        // Load categories
        loadCategories: function () {
            const self = this;

            TempleUtils.showLoading('Loading categories...');

            PagodaAPI.towerCategories.getAll()
                .done(function (response) {
                    if (response.success && response.data) {
                        const categories = Array.isArray(response.data) ? response.data : response.data.data || [];
                        self.renderCategories(categories);
                    } else {
                        self.showNoResults();
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load categories');
                    self.showNoResults();
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Render categories table
        renderCategories: function (categories) {
            if (!categories || categories.length === 0) {
                this.showNoResults();
                return;
            }

            const rows = categories.map((category, index) => `
                <tr class="align-middle">
                    <td>
                        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                            <strong>${index + 1}</strong>
                        </div>
                    </td>
                    <td>
                        <strong class="d-block">${category.name_primary}</strong>
                    </td>
                    <td>
                        <span class="text-muted">${category.name_secondary || '-'}</span>
                    </td>
                    <td>
                        <small class="text-muted">${category.description || '-'}</small>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-info-subtle text-info-emphasis border">
                            ${category.towers_count || 0} Towers
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-secondary-subtle text-secondary-emphasis border">
                            ${category.display_order}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${category.is_active ? 'bg-success' : 'bg-secondary'} fs-6">
                            <i class="bi bi-${category.is_active ? 'check-circle-fill' : 'x-circle-fill'} me-1"></i>
                            ${category.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-edit-category" data-id="${category.id}" title="Edit Category">
                                <i class="bi bi-pencil-fill"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-delete-category" data-id="${category.id}" title="Delete Category">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            $('#categoriesTableBody').html(rows);
        },

        // Show no results
        showNoResults: function () {
            $('#categoriesTableBody').html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-tags display-1 text-muted mb-4 d-block" style="opacity: 0.3;"></i>
                            <h4 class="text-muted mb-3">No categories found</h4>
                            <p class="text-muted mb-4">Get started by creating your first tower category</p>
                            <button class="btn btn-primary btn-lg" id="btnAddCategoryNoResults">
                                <i class="bi bi-plus-circle-fill me-2"></i> Add First Category
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        },

        // Detach all event handlers
        detachEvents: function () {
            $(document).off('.towerCategories');
        },

        // Attach event handlers
        attachEvents: function () {
            const self = this;
            this.detachEvents();

            $(document).on('click.towerCategories', '#btnRefresh', function () {
                self.loadCategories();
            });

            $(document).on('click.towerCategories', '#btnAddCategory, #btnAddCategoryNoResults', function () {
                self.showCategoryModal();
            });

            $(document).on('click.towerCategories', '.btn-edit-category', function () {
                const id = $(this).data('id');
                self.editCategory(id);
            });

            $(document).on('click.towerCategories', '.btn-delete-category', function () {
                const id = $(this).data('id');
                self.deleteCategory(id);
            });
        },

        // Show category modal
        showCategoryModal: function (category = null) {
            const self = this;
            const isEdit = !!category;

            const modalHtml = `
                <div class="modal fade" id="categoryModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-tags me-2"></i>
                                    ${isEdit ? 'Edit Category' : 'Add New Category'}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="categoryForm">
                                <div class="modal-body">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label class="form-label">Primary Name (English) *</label>
                                            <input type="text" class="form-control" name="name_primary" 
                                                   value="${category ? category.name_primary : ''}" 
                                                   placeholder="e.g., Main Tower" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Secondary Name (Chinese)</label>
                                            <input type="text" class="form-control" name="name_secondary" 
                                                   value="${category ? (category.name_secondary || '') : ''}" 
                                                   placeholder="e.g., ??">
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" name="description" rows="3">${category ? (category.description || '') : ''}</textarea>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Display Order</label>
                                            <input type="number" class="form-control" name="display_order" 
                                                   value="${category ? category.display_order : 0}" 
                                                   min="0">
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" name="is_active"
                                                       id="categoryActive"
                                                       ${!category || category.is_active ? 'checked' : ''}>
                                                <label class="form-check-label" for="categoryActive">Active</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> ${isEdit ? 'Update' : 'Create'} Category
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            $('#categoryModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();

            $('#categoryForm').on('submit', function (e) {
                e.preventDefault();

                const formData = {
                    name_primary: $('input[name="name_primary"]').val(),
                    name_secondary: $('input[name="name_secondary"]').val(),
                    description: $('textarea[name="description"]').val(),
                    display_order: parseInt($('input[name="display_order"]').val()) || 0,
                    is_active: $('input[name="is_active"]').is(':checked')
                };

                TempleUtils.showLoading(isEdit ? 'Updating category...' : 'Creating category...');

                const promise = isEdit ?
                    PagodaAPI.towerCategories.update(category.id, formData) :
                    PagodaAPI.towerCategories.create(formData);

                promise
                    .done(function (response) {
                        if (response.success) {
                            TempleUtils.showSuccess(isEdit ? 'Category updated successfully' : 'Category created successfully');
                            modal.hide();
                            self.loadCategories();
                        }
                    })
                    .fail(function (xhr) {
                        TempleUtils.handleAjaxError(xhr, isEdit ? 'Failed to update category' : 'Failed to create category');
                    })
                    .always(function () {
                        TempleUtils.hideLoading();
                    });
            });

            $('#categoryModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Edit category
        editCategory: function (id) {
            const self = this;

            TempleUtils.showLoading('Loading category...');

            PagodaAPI.towerCategories.getById(id)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.showCategoryModal(response.data);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load category');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Delete category
        deleteCategory: function (id) {
            const self = this;

            Swal.fire({
                title: 'Delete Category?',
                text: 'This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, delete it',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Deleting category...');

                    PagodaAPI.towerCategories.delete(id)
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Category deleted successfully');
                                self.loadCategories();
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to delete category');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },

        // Cleanup
        cleanup: function () {
            this.detachEvents();
        }
    };

})(jQuery, window);
