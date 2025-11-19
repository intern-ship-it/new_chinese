// js/pages/purchase/service_types.js
// Service Types List Page

(function ($, window) {
    'use strict';

    window.PurchaseServiceTypesPage = {
        currentPage: 1,
        perPage: 10,
        permissions: {},
        currentUser: null,
        // Initialize page
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.loadServiceTypes();
            this.bindEvents();
            this.loadPermissions();
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_service_types: false,
                can_edit_service_types: false,
                can_delete_service_types: false,
                can_view_service_types: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_service_types: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_service_types: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_service_types: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_service_types: true
                };
            }
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="mb-0">Service Types</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Purchase</li>
                                    <li class="breadcrumb-item active">Service Types</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="addServiceTypeBtn">
                                <i class="bi bi-plus-circle"></i> Add Service Type
                            </button>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search by name, code...">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="perPageSelect">
                                        <option value="10">10 per page</option>
                                        <option value="25">25 per page</option>
                                        <option value="50">50 per page</option>
                                        <option value="100">100 per page</option>
                                    </select>
                                </div>
                              
                            </div>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th width="50">#</th>
                                            <th>Name</th>
                                            <th>Code</th>
                                            <th>Description</th>
                                            <th width="100">Services</th>
                                            <th width="100">Status</th>
                                            <th width="100">Created By</th>
                                            <th width="150">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="serviceTypesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Pagination -->
                            <div class="row mt-3">
                                <div class="col-md-6">
                                    <div id="paginationInfo"></div>
                                </div>
                                <div class="col-md-6">
                                    <nav aria-label="Page navigation">
                                        <ul class="pagination justify-content-end" id="pagination"></ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Modal -->
                <div class="modal fade" id="serviceTypeModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalTitle">Add Service Type</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="serviceTypeForm">
                                    <input type="hidden" id="serviceTypeId">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="name" required maxlength="100">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Code</label>
                                        <input type="text" class="form-control" id="code" maxlength="50">
                                        <small class="text-muted">Leave empty to auto-generate</small>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="description" rows="3"></textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="status">
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveServiceTypeBtn">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Load service types
        loadServiceTypes: function (page = 1) {
            const self = this;

            const params = {
                page: page,
                per_page: $('#perPageSelect').val() || this.perPage,
                search: $('#searchInput').val(),
                status: $('#statusFilter').val()
            };

            TempleAPI.get('/purchase/service-types', params)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.permissions;

                        self.renderTable(response.data);
                        self.renderPagination(response.pagination);
                    } else {
                        self.showError('Failed to load service types');
                    }
                })
                .fail(function () {
                    self.showError('Failed to load service types');
                });
        },

        // Render table
        renderTable: function (data) {
            let html = '';
            const self = this;
            if (data.length === 0) {
                html = `
                    <tr>
                        <td colspan="8" class="text-center py-4">
                            <div class="text-muted">
                                <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                                <p>No service types found</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                $.each(data, function (index, item) {
                    const statusBadge = item.status == 1
                        ? '<span class="badge bg-success">Active</span>'
                        : '<span class="badge bg-danger">Inactive</span>';

                    const servicesCount = item.services_count || 0;

                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.code || '-'}</td>
                            <td>${item.description || '-'}</td>
                            <td><span class="badge bg-info">${servicesCount}</span></td>
                            <td>${statusBadge}</td>
                            <td>${item.created_by ? item.created_by.name : '-'}</td>
                            <td>
                               ${self.permissions && self.permissions.can_edit_service_types ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${item.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>`: ''}
                               ${self.permissions && self.permissions.can_delete_service_types ? `<button class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}" title="Delete" ${servicesCount > 0 ? 'disabled' : ''}>
                                    <i class="bi bi-trash"></i>`: ''}
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#serviceTypesTableBody').html(html);
        },

        // Render pagination
        renderPagination: function (pagination) {
            const totalPages = pagination.total_pages;
            const currentPage = pagination.current_page;

            // Pagination info
            const start = ((currentPage - 1) * pagination.per_page) + 1;
            const end = Math.min(start + pagination.per_page - 1, pagination.total);
            $('#paginationInfo').html(`Showing ${start} to ${end} of ${pagination.total} entries`);

            // Pagination buttons
            let html = '';

            // Previous button
            html += `
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
                </li>
            `;

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                    html += `
                        <li class="page-item ${i === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === currentPage - 3 || i === currentPage + 3) {
                    html += `<li class="page-item disabled"><a class="page-link">...</a></li>`;
                }
            }

            // Next button
            html += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
                </li>
            `;

            $('#pagination').html(html);
        },

        // Show add modal
        showAddModal: function () {
            $('#modalTitle').text('Add Service Type');
            $('#serviceTypeForm')[0].reset();
            $('#serviceTypeId').val('');
            $('#status').val('1');

            const modal = new bootstrap.Modal(document.getElementById('serviceTypeModal'));
            modal.show();
        },

        // Show edit modal
        showEditModal: function (id) {
            const self = this;

            TempleAPI.get('/purchase/service-types/' + id)
                .done(function (response) {
                    if (response.success) {
                        const data = response.data;

                        $('#modalTitle').text('Edit Service Type');
                        $('#serviceTypeId').val(data.id);
                        $('#name').val(data.name);
                        $('#code').val(data.code);
                        $('#description').val(data.description);
                        $('#status').val(data.status);

                        const modal = new bootstrap.Modal(document.getElementById('serviceTypeModal'));
                        modal.show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load service type details', 'error');
                });
        },

        // Save service type
        saveServiceType: function () {
            const self = this;
            const id = $('#serviceTypeId').val();

            // Validate form
            if (!$('#name').val()) {
                TempleCore.showToast('Please enter service type name', 'warning');
                return;
            }

            const data = {
                name: $('#name').val(),
                code: $('#code').val(),
                description: $('#description').val(),
                status: $('#status').val()
            };

            TempleCore.showLoading(true);

            const request = id
                ? TempleAPI.put('/purchase/service-types/' + id, data)
                : TempleAPI.post('/purchase/service-types', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('serviceTypeModal')).hide();
                        TempleCore.showToast(response.message, 'success');
                        self.loadServiceTypes(self.currentPage);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save service type', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    if (response && response.errors) {
                        const firstError = Object.values(response.errors)[0];
                        TempleCore.showToast(firstError[0], 'error');
                    } else {
                        TempleCore.showToast('Failed to save service type', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Delete service type
        deleteServiceType: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Service Type',
                'Are you sure you want to delete this service type?',
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.delete('/purchase/service-types/' + id)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast(response.message, 'success');
                                self.loadServiceTypes(self.currentPage);
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete service type', 'error');
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete service type', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Add button
            $('#addServiceTypeBtn').on('click', function () {
                self.showAddModal();
            });




            // Edit button
            $(document).on('click', '.edit-btn', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            // Delete button
            $(document).on('click', '.delete-btn', function () {
                const id = $(this).data('id');
                self.deleteServiceType(id);
            });

            // Save button
            $('#saveServiceTypeBtn').on('click', function () {
                self.saveServiceType();
            });

            // Search
            let searchTimer;
            $('#searchInput').on('keyup', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self.currentPage = 1;
                    self.loadServiceTypes();
                }, 500);
            });

            // Filters
            $('#statusFilter, #perPageSelect').on('change', function () {
                self.currentPage = 1;
                self.loadServiceTypes();
            });

            // Refresh
            $('#refreshBtn').on('click', function () {
                self.loadServiceTypes(self.currentPage);
            });

            // Pagination
            $(document).on('click', '#pagination a', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentPage = page;
                    self.loadServiceTypes(page);
                }
            });

            // Form submit on Enter
            $('#serviceTypeForm').on('submit', function (e) {
                e.preventDefault();
                self.saveServiceType();
            });
        },

        // Show error
        showError: function (message) {
            $('#serviceTypesTableBody').html(`
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="alert alert-danger mb-0">${message}</div>
                    </td>
                </tr>
            `);
        }
    };

})(jQuery, window);