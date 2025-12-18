// js/pages/special-occasions/services.js
// Occasion Services Master Management Module

(function ($, window) {
    'use strict';

    window.SpecialOccasionsServicesPage = {
        currentUser: null,
        services: [],
        selectedService: null,
        editMode: false,
        modal: null,

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.bindEvents();
            this.loadServices();
        },

        cleanup: function () {
            $(document).off('.occasionServices');
            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }
            this.services = [];
            this.selectedService = null;
            this.editMode = false;
        },

        // ========================================
        // RENDER MAIN PAGE
        // ========================================
        render: function () {
            const html = `
                <div class="occasion-services-page">
                    <!-- Page Header -->
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 class="mb-1">
                                <i class="bi bi-gear text-primary me-2"></i>Occasion Services
                            </h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb mb-0 small">
                                    <li class="breadcrumb-item"><a href="#/dashboard">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#/special-occasions/master">Special Occasions</a></li>
                                    <li class="breadcrumb-item active">Services</li>
                                </ol>
                            </nav>
                        </div>
                        <button class="btn btn-success" id="btnAddService">
                            <i class="bi bi-plus-circle me-1"></i> Add New Service
                        </button>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body py-3">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-3">
                                    <label class="form-label small text-muted">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label small text-muted">Search</label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by service name...">
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-secondary w-100" id="btnResetFilters">
                                        <i class="bi bi-arrow-clockwise me-1"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Services List -->
                    <div class="card">
                        <div class="card-header bg-white py-3">
                            <h6 class="mb-0">
                                <i class="bi bi-list-ul me-2"></i>Services List
                                <span class="badge bg-primary ms-2" id="serviceCount">0</span>
                            </h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="bg-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">Service Name</th>
                                            <th width="25%">Secondary Name</th>
                                            <th width="15%">Amount (RM)</th>
                                            <th width="10%">Status</th>
                                            <th width="20%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="servicesTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center py-4">
                                                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                                                Loading...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                ${this.renderModal()}
            `;

            $('#page-container').html(html);
        },

        // ========================================
        // RENDER MODAL
        // ========================================
        renderModal: function () {
            return `
                <div class="modal fade" id="serviceModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header border-bottom">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-plus-circle text-success me-2"></i>Add New Service
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="serviceForm">
                                    <input type="hidden" id="serviceId">
                                    
                                    <!-- Primary Name -->
                                    <div class="mb-3">
                                        <label class="form-label">Primary Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control bg-light" id="serviceName" required placeholder="">
                                        <small class="text-muted">Enter service name</small>
                                    </div>

                                    <!-- Secondary Name -->
                                    <div class="mb-3">
                                        <label class="form-label">Secondary Name</label>
                                        <input type="text" class="form-control bg-light" id="serviceNameSecondary" placeholder="Optional secondary name">
                                        <small class="text-muted">Optional alternative name (e.g., Chinese)</small>
                                    </div>

                                    <!-- Amount & Status -->
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Amount (RM) <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control bg-light" id="serviceAmount" required min="0" step="0.01" placeholder="0.00">
                                            <small class="text-muted">Service price</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Status <span class="text-danger">*</span></label>
                                            <select class="form-select bg-light" id="serviceStatus">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Description -->
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control bg-light" id="serviceDescription" rows="2" placeholder="Optional description..."></textarea>
                                        <small class="text-muted">Brief description of the service</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer border-top">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="btnSaveService">
                                    <i class="bi bi-check-circle me-1"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // EVENT BINDINGS
        // ========================================
        bindEvents: function () {
            const self = this;

            // Add Service
            $(document).on('click.occasionServices', '#btnAddService', function () {
                self.openModal('add');
            });

            // Save Service
            $(document).on('click.occasionServices', '#btnSaveService', function () {
                self.saveService();
            });

            // Edit Service
            $(document).on('click.occasionServices', '.btn-edit', function () {
                const id = $(this).data('id');
                self.editService(id);
            });

            // Delete Service
            $(document).on('click.occasionServices', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteService(id);
            });

            // Toggle Status
            $(document).on('click.occasionServices', '.btn-toggle-status', function () {
                const id = $(this).data('id');
                const status = $(this).data('status');
                self.toggleStatus(id, status);
            });

            // Filters
            $(document).on('change.occasionServices', '#filterStatus', function () {
                self.loadServices();
            });
            $(document).on('keyup.occasionServices', '#searchInput', function () {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(() => self.loadServices(), 500);
            });
            $(document).on('click.occasionServices', '#btnResetFilters', function () {
                $('#filterStatus').val('');
                $('#searchInput').val('');
                self.loadServices();
            });

            // Modal cleanup
            $(document).on('hidden.bs.modal.occasionServices', '#serviceModal', function () {
                self.resetForm();
            });
        },

        // ========================================
        // DATA LOADING
        // ========================================
        loadServices: function () {
            const self = this;
            const params = {
                status: $('#filterStatus').val(),
                search: $('#searchInput').val()
            };

            TempleAPI.get('/occasion-services', params)
                .done(function (response) {
                    if (response.success) {
                        self.services = response.data || [];
                        self.renderTable();
                        $('#serviceCount').text(self.services.length);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load services:', xhr);
                    $('#servicesTableBody').html(`
                        <tr>
                            <td colspan="6" class="text-center py-4 text-danger">
                                <i class="bi bi-exclamation-circle me-2"></i>Failed to load data
                            </td>
                        </tr>
                    `);
                });
        },

        renderTable: function () {
            if (!this.services || this.services.length === 0) {
                $('#servicesTableBody').html(`
                    <tr>
                        <td colspan="6" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                            <span class="text-muted">No services found</span>
                        </td>
                    </tr>
                `);
                return;
            }

            let html = '';
            this.services.forEach((service, index) => {
                const statusBadge = service.status === 'active' 
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-secondary">Inactive</span>';
                
                const toggleIcon = service.status === 'active' ? 'bi-toggle-on text-success' : 'bi-toggle-off text-secondary';
                const toggleTitle = service.status === 'active' ? 'Set Inactive' : 'Set Active';

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${service.name}</strong></td>
                        <td>${service.name_secondary || '<span class="text-muted">-</span>'}</td>
                        <td>RM ${parseFloat(service.amount).toFixed(2)}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary btn-edit me-1" data-id="${service.id}" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary btn-toggle-status me-1" data-id="${service.id}" data-status="${service.status}" title="${toggleTitle}">
                                <i class="bi ${toggleIcon}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${service.id}" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            $('#servicesTableBody').html(html);
        },

        // ========================================
        // MODAL OPERATIONS
        // ========================================
        openModal: function (mode, data = null) {
            this.editMode = mode === 'edit';
            this.resetForm();

            if (this.editMode && data) {
                $('#modalTitle').html('<i class="bi bi-pencil text-primary me-2"></i>Edit Service');
                $('#btnSaveService').html('<i class="bi bi-check-circle me-1"></i> Update');
                this.populateForm(data);
            } else {
                $('#modalTitle').html('<i class="bi bi-plus-circle text-success me-2"></i>Add New Service');
                $('#btnSaveService').html('<i class="bi bi-check-circle me-1"></i> Save');
            }

            this.modal = new bootstrap.Modal(document.getElementById('serviceModal'));
            this.modal.show();
        },

        populateForm: function (data) {
            $('#serviceId').val(data.id);
            $('#serviceName').val(data.name);
            $('#serviceNameSecondary').val(data.name_secondary || '');
            $('#serviceAmount').val(data.amount);
            $('#serviceStatus').val(data.status);
            $('#serviceDescription').val(data.description || '');
        },

        resetForm: function () {
            $('#serviceForm')[0].reset();
            $('#serviceId').val('');
            this.selectedService = null;
            this.editMode = false;
        },

        // ========================================
        // CRUD OPERATIONS
        // ========================================
        saveService: function () {
            const self = this;

            const serviceId = $('#serviceId').val();
            const data = {
                name: $('#serviceName').val().trim(),
                name_secondary: $('#serviceNameSecondary').val().trim() || null,
                amount: $('#serviceAmount').val(),
                status: $('#serviceStatus').val(),
                description: $('#serviceDescription').val().trim() || null
            };

            if (!data.name) {
                TempleCore.showToast('Please enter service name', 'error');
                return;
            }

            if (!data.amount || parseFloat(data.amount) < 0) {
                TempleCore.showToast('Please enter valid amount', 'error');
                return;
            }

            // Show loading
            $('#btnSaveService').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

            let apiCall;
            if (serviceId) {
                apiCall = TempleAPI.put(`/occasion-services/${serviceId}`, data);
            } else {
                apiCall = TempleAPI.post('/occasion-services', data);
            }

            apiCall
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'Service saved successfully', 'success');
                        self.modal.hide();
                        self.loadServices();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save', 'error');
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to save service';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    $('#btnSaveService').prop('disabled', false).html('<i class="bi bi-check-circle me-1"></i> Save');
                });
        },

        editService: function (id) {
            const service = this.services.find(s => s.id === id);
            if (service) {
                this.selectedService = service;
                this.openModal('edit', service);
            }
        },

        deleteService: function (id) {
            const self = this;
            Swal.fire({
                title: 'Delete Service?',
                text: 'This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.delete(`/occasion-services/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Service deleted successfully', 'success');
                                self.loadServices();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete service', 'error');
                        });
                }
            });
        },

        toggleStatus: function (id, currentStatus) {
            const self = this;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            $.ajax({
                url: window.APP_CONFIG.API.BASE_URL + `/occasion-services/${id}/status`,
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(window.APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'Content-Type': 'application/json',
                    'X-Temple-ID': TempleAPI.getTempleId ? TempleAPI.getTempleId() : ''
                },
                data: JSON.stringify({ status: newStatus })
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(`Status changed to ${newStatus}`, 'success');
                        self.loadServices();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to update status', 'error');
                });
        }
    };

})(jQuery, window);