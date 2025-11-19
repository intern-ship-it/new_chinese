// js/pages/purchase/services.js
// Services List Page with Select2 for Ledger Account

(function ($, window) {
    'use strict';

    window.PurchaseServicesPage = {
        currentPage: 1,
        perPage: 10,
        formData: null,
        permissions: {},
        currentUser: null,
        // Initialize page
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            this.render();
            this.loadFormData();
            this.loadServices();
            this.bindEvents();
            this.loadPermissions();
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_services: false,
                can_edit_services: false,
                can_delete_services: false,
                can_view_services: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_services: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_services: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_services: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_services: true
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
                            <h4 class="mb-0">Services</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Purchase</li>
                                    <li class="breadcrumb-item active">Services</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="addServiceBtn">
                                <i class="bi bi-plus-circle"></i> Add Service
                            </button>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search by name, code...">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="serviceTypeFilter">
                                        <option value="">All Service Types</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
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
                                            <th>Service Name</th>
                                            <th>Code</th>
                                            <th>Service Type</th>
                                            <th>Ledger Account</th>
                                            <th>Price</th>
                                            <th width="100">Status</th>
                                            <th width="100">Created By</th>
                                            <th width="150">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="servicesTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">
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
                <div class="modal fade" id="serviceModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalTitle">Add Service</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="serviceForm">
                                    <input type="hidden" id="serviceId">
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Service Type <span class="text-danger">*</span></label>
                                                <select class="form-select" id="service_type_id" required>
                                                    <option value="">Select Service Type</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Ledger Account <span class="text-danger">*</span></label>
                                                <select class="form-select" id="ledger_id" required>
                                                    <option value="">Select Ledger</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-8">
                                            <div class="mb-3">
                                                <label class="form-label">Service Name <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="name" required maxlength="255">
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Code</label>
                                                <input type="text" class="form-control" id="code" maxlength="50">
                                                <small class="text-muted">Optional</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="description" rows="3"></textarea>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Price</label>
                                                <input type="number" class="form-control" id="price" step="0.01" min="0">
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Status</label>
                                                <select class="form-select" id="status">
                                                    <option value="1">Active</option>
                                                    <option value="0">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveServiceBtn">Save</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Modal -->
                <div class="modal fade" id="viewServiceModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Service Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="serviceDetails">
                                <!-- Details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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
                    
                    .select2-ledger-option {
                        padding: 2px 0;
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

        // Load form data (service types and ledgers)
        loadFormData: function () {
            const self = this;

            TempleAPI.get('/purchase/services/form-data')
                .done(function (response) {
                    if (response.success) {
                        self.formData = response.data;
                        self.populateDropdowns();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load form data', 'error');
                });
        },

        // Populate dropdowns
        populateDropdowns: function () {
            if (!this.formData) return;

            // Service types dropdown
            let serviceTypeOptions = '<option value="">All Service Types</option>';
            let modalServiceTypeOptions = '<option value="">Select Service Type</option>';
            $.each(this.formData.service_types, function (index, item) {
                serviceTypeOptions += `<option value="${item.id}">${item.name}</option>`;
                modalServiceTypeOptions += `<option value="${item.id}">${item.name} ${item.code ? '(' + item.code + ')' : ''}</option>`;
            });
            $('#serviceTypeFilter').html(serviceTypeOptions);
            $('#service_type_id').html(modalServiceTypeOptions);

            // Ledgers dropdown with Select2
            let ledgerOptions = '<option value="">Select Ledger</option>';
            $.each(this.formData.ledgers, function (index, item) {
           
                ledgerOptions += `<option value="${item.id}">(${item.left_code})/(${item.right_code}) - ${item.name}</option>`;

            });
            $('#ledger_id').html(ledgerOptions);

            this.initializeLedgerSelect2();

            // Also initialize Select2 on service type if needed
            this.initializeServiceTypeSelect2();
        },

        initializeLedgerSelect2: function () {
            $('#ledger_id').select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Search and select ledger',
                allowClear: true,
                dropdownParent: $('#serviceModal'),
                minimumInputLength: 0
            });
        },


        // Initialize Select2 for Service Type
        initializeServiceTypeSelect2: function () {
            $('#service_type_id').select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Search and select service type',
                allowClear: true,
                dropdownParent: $('#serviceModal'),
                minimumInputLength: 0
            });
        },





        // Load services
        loadServices: function (page = 1) {
            const self = this;

            const params = {
                page: page,
                per_page: $('#perPageSelect').val() || this.perPage,
                search: $('#searchInput').val(),
                service_type_id: $('#serviceTypeFilter').val(),
                status: $('#statusFilter').val()
            };

            TempleAPI.get('/purchase/services', params)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.permissions || self.permissions;
                        self.renderTable(response.data, self.permissions);

                        self.renderPagination(response.pagination);

                    } else {
                        self.showError('Failed to load services');
                    }
                })
                .fail(function () {
                    self.showError('Failed to load services');
                });
        },

        // Render table
        renderTable: function (data, permissions) {

            const self = this;
            let html = '';

            if (data.length === 0) {
                html = `
                    <tr>
                        <td colspan="9" class="text-center py-4">
                            <div class="text-muted">
                                <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                                <p>No services found</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                $.each(data, function (index, item) {
               
                    const statusBadge = item.status == 1
                        ? '<span class="badge bg-success">Active</span>'
                        : '<span class="badge bg-danger">Inactive</span>';

                    const price = parseFloat(item.price || 0).toFixed(2);

                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.code || '-'}</td>
                            <td>${item.service_type ? item.service_type.name : '-'}</td>
                            <td>${item.ledger ? item.ledger.name : '-'}</td>
                            <td>${self.formatCurrency(price)}</td>
                            <td>${statusBadge}</td>
                            <td>${item.created_by ? item.created_by.name : '-'}</td>
                            <td>
                            
                                                    ${permissions && permissions.can_view_services ? `

                                <button class="btn btn-sm btn-outline-info view-btn" data-id="${item.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>` : ''}
                                ${permissions && permissions.can_edit_services ? `
                                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${item.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>` : ''}
                                  ${permissions && permissions.can_delete_services ? `
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>` : ''}
                            </td>
                        </tr>
                    `;
                });
            }

            $('#servicesTableBody').html(html);
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
            $('#modalTitle').text('Add Service');
            $('#serviceForm')[0].reset();
            $('#serviceId').val('');
            $('#status').val('1');

            // Reset Select2 dropdowns

            $('#service_type_id').val(null).trigger('change');
            $('#ledger_id').val(null).trigger('change');

            const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
            modal.show();
        },

        // Show edit modal
        showEditModal: function (id) {
            const self = this;

            TempleAPI.get('/purchase/services/' + id)
                .done(function (response) {
                    if (response.success) {
                        const data = response.data;

                        $('#modalTitle').text('Edit Service');
                        $('#serviceId').val(data.id);

                        // Set service type
                        $('#service_type_id').val(data.service_type_id);
                        if ($('#service_type_id').hasClass('select2-hidden-accessible')) {
                            $('#service_type_id').trigger('change');
                        }

                        $('#ledger_id').val(data.ledger_id);
                        if ($('#ledger_id').hasClass('select2-hidden-accessible')) {
                            $('#ledger_id').trigger('change');
                        }

                        $('#name').val(data.name);
                        $('#code').val(data.code);
                        $('#description').val(data.description);
                        $('#price').val(data.price);
                        $('#status').val(data.status);

                        const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
                        modal.show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load service details', 'error');
                });
        },

        // Show view modal
        showViewModal: function (id) {
            const self = this;

            TempleAPI.get('/purchase/services/' + id)
                .done(function (response) {
                    if (response.success) {
                        const data = response.data;

                        const statusBadge = data.status == 1
                            ? '<span class="badge bg-success">Active</span>'
                            : '<span class="badge bg-danger">Inactive</span>';

                        const html = `
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">Service Name:</th>
                                    <td><strong>${data.name}</strong></td>
                                </tr>
                                <tr>
                                    <th>Code:</th>
                                    <td>${data.code || '-'}</td>
                                </tr>
                                <tr>
                                    <th>Service Type:</th>
                                    <td>${data.service_type ? data.service_type.name : '-'}</td>
                                </tr>
                                <tr>
                                    <th>Ledger Account:</th>
                                    <td>${data.ledger ? data.ledger.name : '-'}</td>
                                </tr>
                                <tr>
                                    <th>Price:</th>
                                    <td><strong>${self.formatCurrency(parseFloat(data.price || 0).toFixed(2))}</strong></td>
                                </tr>
                                <tr>
                                    <th>Description:</th>
                                    <td>${data.description || '-'}</td>
                                </tr>
                                <tr>
                                    <th>Status:</th>
                                    <td>${statusBadge}</td>
                                </tr>
                                <tr>
                                    <th>Created By:</th>
                                    <td>${data.created_by ? data.created_by.name : '-'}</td>
                                </tr>
                                <tr>
                                    <th>Created At:</th>
                                    <td>${new Date(data.created_at).toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                    <th>Updated At:</th>
                                    <td>${new Date(data.updated_at).toLocaleDateString()}</td>
                                </tr>
                            </table>
                        `;

                        $('#serviceDetails').html(html);

                        const modal = new bootstrap.Modal(document.getElementById('viewServiceModal'));
                        modal.show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load service details', 'error');
                });
        },

        // Save service
        saveService: function () {
            const self = this;
            const id = $('#serviceId').val();

            // Validate form
            if (!$('#service_type_id').val()) {
                TempleCore.showToast('Please select service type', 'warning');
                return;
            }

            if (!$('#ledger_id').val()) {
                TempleCore.showToast('Please select ledger account', 'warning');
                return;
            }

            if (!$('#name').val()) {
                TempleCore.showToast('Please enter service name', 'warning');
                return;
            }

            const data = {
                service_type_id: $('#service_type_id').val(),
                ledger_id: $('#ledger_id').val(),
                name: $('#name').val(),
                code: $('#code').val(),
                description: $('#description').val(),
                price: $('#price').val() || 0,
                status: $('#status').val()
            };

            TempleCore.showLoading(true);

            const request = id
                ? TempleAPI.put('/purchase/services/' + id, data)
                : TempleAPI.post('/purchase/services', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
                        TempleCore.showToast(response.message || 'Service saved successfully', 'success');
                        self.loadServices(self.currentPage);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save service', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    if (response && response.errors) {
                        const firstError = Object.values(response.errors)[0];
                        TempleCore.showToast(firstError[0], 'error');
                    } else {
                        TempleCore.showToast('Failed to save service', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Delete service
        deleteService: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Service',
                'Are you sure you want to delete this service?',
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.delete('/purchase/services/' + id)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast(response.message || 'Service deleted successfully', 'success');
                                self.loadServices(self.currentPage);
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete service', 'error');
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete service', 'error');
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
            $('#addServiceBtn').on('click', function () {
                self.showAddModal();
            });

            // View button
            $(document).on('click', '.view-btn', function () {
                const id = $(this).data('id');
                self.showViewModal(id);
            });

            // Edit button
            $(document).on('click', '.edit-btn', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            // Delete button
            $(document).on('click', '.delete-btn', function () {
                const id = $(this).data('id');
                self.deleteService(id);
            });

            // Save button
            $('#saveServiceBtn').on('click', function () {
                self.saveService();
            });

            // Search
            let searchTimer;
            $('#searchInput').on('keyup', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self.currentPage = 1;
                    self.loadServices();
                }, 500);
            });

            // Filters
            $('#serviceTypeFilter, #statusFilter, #perPageSelect').on('change', function () {
                self.currentPage = 1;
                self.loadServices();
            });

            // Refresh
            $('#refreshBtn').on('click', function () {
                self.loadServices(self.currentPage);
            });

            // Pagination
            $(document).on('click', '#pagination a', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentPage = page;
                    self.loadServices(page);
                }
            });

            // Form submit on Enter
            $('#serviceForm').on('submit', function (e) {
                e.preventDefault();
                self.saveService();
            });

            // Reinitialize Select2 when modal is shown
            $('#serviceModal').on('shown.bs.modal', function () {
                // Reinitialize if needed
                if (!$('#ledger_id').hasClass('select2-hidden-accessible')) {
                    self.initializeLedgerSelect2();
                }
                if (!$('#service_type_id').hasClass('select2-hidden-accessible')) {
                    self.initializeServiceTypeSelect2();
                }
            });

            // Destroy Select2 when modal is hidden to prevent issues
            $('#serviceModal').on('hidden.bs.modal', function () {
                if ($('#ledger_id').hasClass('select2-hidden-accessible')) {
                    $('#ledger_id').select2('destroy');
                }
                if ($('#service_type_id').hasClass('select2-hidden-accessible')) {
                    $('#service_type_id').select2('destroy');
                }
            });
        },

        // Show error
        showError: function (message) {
            $('#servicesTableBody').html(`
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="alert alert-danger mb-0">${message}</div>
                    </td>
                </tr>
            `);
        },

        // Format currency
        formatCurrency: function (amount) {

            return TempleCore.formatCurrency(amount);
        }
    };

})(jQuery, window);