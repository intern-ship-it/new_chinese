// js/pages/manufacturing/bom.js
// BOM List Page

(function ($, window) {
    'use strict';

    window.ManufacturingBomPage = {
        currentPage: 1,
        perPage: 15,
        permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.bindEvents();
                self.loadBoms();
            });
        },
        loadPermissions: function () {
            const self = this;
            const userId = this.currentUser.id;

            return TempleAPI.get(`/manufacturing/bom/user/${userId}/permissions`)
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
                can_create_manufacturing_bom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_manufacturing_bom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_manufacturing_bom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_manufacturing_bom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_approve_manufacturing_bom: userType === 'SUPER_ADMIN' || userType === 'ADMIN',

            };
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Bill of Materials (BOM)</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Manufacturing</li>
                                    <li class="breadcrumb-item active">BOM</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                        ${this.permissions.can_create_manufacturing_bom ? `
                            <button class="btn btn-primary" id="createBomBtn">
                                <i class="bi bi-plus-circle"></i> Create BOM
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search BOM code, name...">
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="productFilter">
                                        <option value="">All Products</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-secondary w-100" id="resetFiltersBtn">
                                        <i class="bi bi-arrow-clockwise"></i> Reset Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- BOM List -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>BOM Code</th>
                                            <th>Product</th>
                                            <th>Output Qty</th>
                                            <th>Total Cost</th>
                                            <th>Status</th>
                                            <th>Created Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bomsTableBody">
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
                            <div id="paginationContainer" class="mt-3"></div>
                        </div>
                    </div>
                </div>

                <!-- BOM Details Modal -->
                <div class="modal fade" id="bomDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">BOM Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="bomDetailsContent">
                                <!-- Content will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
            this.loadManufacturableProducts();
        },

        bindEvents: function () {
            const self = this;

            // Create BOM button
            $('#createBomBtn').on('click', function () {
                TempleRouter.navigate('manufacturing/bom/create');
            });

            // Search input with debounce
            let searchTimeout;
            $('#searchInput').on('keyup', function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function () {
                    self.currentPage = 1;
                    self.loadBoms();
                }, 500);
            });

            // Filters
            $('#statusFilter, #productFilter').on('change', function () {
                self.currentPage = 1;
                self.loadBoms();
            });

            // Reset filters
            $('#resetFiltersBtn').on('click', function () {
                $('#searchInput').val('');
                $('#statusFilter').val('');
                $('#productFilter').val('');
                self.currentPage = 1;
                self.loadBoms();
            });
        },

        loadManufacturableProducts: function () {
            TempleAPI.get('/manufacturing/bom/manufacturable-products')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Products</option>';
                        response.data.forEach(function (product) {
                            options += `<option value="${product.id}">${product.product_code} - ${product.name}</option>`;
                        });
                        $('#productFilter').html(options);
                    }
                })
                .fail(function () {
                    console.error('Failed to load manufacturable products');
                });
        },

        loadBoms: function () {
            const self = this;
            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                search: $('#searchInput').val(),
                status: $('#statusFilter').val(),
                product_id: $('#productFilter').val()
            };

            TempleAPI.get('/manufacturing/bom', params)
                .done(function (response) {
                    if (response.success) {
                        self.renderBoms(response.data.data, self.permissions);
                        self.renderPagination(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load BOMs', 'error');
                });
        },

        renderBoms: function (boms, permissions) {
            const self = this;

            if (boms.length === 0) {
                $('#bomsTableBody').html(`
                    <tr>
                        <td colspan="7" class="text-center">No BOMs found</td>
                    </tr>
                `);
                return;
            }

            let html = '';
            boms.forEach(function (bom) {
                const statusBadge = self.getStatusBadge(bom.status);

                html += `
                    <tr>
                        <td>
                            <a href="#" class="text-primary view-bom" data-id="${bom.id}">
                                ${bom.bom_code}
                            </a>
                        </td>
                        <td>${bom.product.name}</td>
                        <td>${bom.output_quantity} ${bom.output_uom.uom_short}</td>
                        <td>${TempleCore.formatCurrency(bom.total_cost)}</td>
                        <td>${statusBadge}</td>
                        <td>${TempleCore.formatDate(bom.created_at)}</td>
                        <td>
                            <div class="btn-group" role="group">
                            ${permissions.can_view_manufacturing_bom ? `
                                <button class="btn btn-sm btn-info view-bom" data-id="${bom.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>`: ''}

                `;

                if (permissions.can_edit_manufacturing_bom) {
                    html += `
                        <button class="btn btn-sm btn-warning edit-bom" data-id="${bom.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                  
                    `;
                }
                if (bom.status === 'DRAFT' && permissions.can_approve_manufacturing_bom) {
                    html += `
                      <button class="btn btn-sm btn-success approve-bom" data-id="${bom.id}" title="Approve">
                            <i class="bi bi-check-circle"></i>
                        </button>
                `;
                }

                html += `
                        <button class="btn btn-sm btn-primary duplicate-bom" data-id="${bom.id}" title="Duplicate">
                            <i class="bi bi-copy"></i>
                        </button>
                `;

                if (permissions.can_delete_manufacturing_bom) {
                    html += `
                        <button class="btn btn-sm btn-danger delete-bom" data-id="${bom.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                }

                html += `
                            </div>
                        </td>
                    </tr>
                `;
            });

            $('#bomsTableBody').html(html);
            this.bindTableEvents();
        },

        bindTableEvents: function () {
            const self = this;

            // View BOM
            $('.view-bom').on('click', function (e) {
                e.preventDefault();
                const bomId = $(this).data('id');
                self.viewBomDetails(bomId);
            });

            // Edit BOM
            $('.edit-bom').on('click', function () {
                const bomId = $(this).data('id');
                TempleRouter.navigate('manufacturing/bom/edit', { id: bomId });
            });

            // Approve BOM
            $('.approve-bom').on('click', function () {
                const bomId = $(this).data('id');
                self.approveBom(bomId);
            });

            // Duplicate BOM
            $('.duplicate-bom').on('click', function () {
                const bomId = $(this).data('id');
                self.duplicateBom(bomId);
            });

            // Delete BOM
            $('.delete-bom').on('click', function () {
                const bomId = $(this).data('id');
                self.deleteBom(bomId);
            });
        },

        viewBomDetails: function (bomId) {
            const self = this;

            $('#bomDetailsContent').html(`
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);

            const modal = new bootstrap.Modal(document.getElementById('bomDetailsModal'));
            modal.show();

            TempleAPI.get('/manufacturing/bom/' + bomId)
                .done(function (response) {
                    if (response.success) {
                        self.renderBomDetails(response.data);
                    }
                })
                .fail(function () {
                    $('#bomDetailsContent').html('<p class="text-danger">Failed to load BOM details</p>');
                });
        },

        renderBomDetails: function (bom) {
            let rawMaterialsHtml = '';
            let totalMaterialCost = 0;

            bom.details.forEach(function (detail) {
                totalMaterialCost += parseFloat(detail.total_cost);
                rawMaterialsHtml += `
                    <tr>
                        <td>${detail.raw_material.product_code}</td>
                        <td>${detail.raw_material.name}</td>
                        <td>${detail.quantity}</td>
                        <td>${detail.uom.uom_short}</td>
                        <td>${TempleCore.formatCurrency(detail.unit_cost)}</td>
                        <td>${TempleCore.formatCurrency(detail.total_cost)}</td>
                    </tr>
                `;
            });

            const html = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="fw-bold">BOM Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <td width="40%">BOM Code:</td>
                                <td><strong>${bom.bom_code}</strong></td>
                            </tr>
                            <tr>
                                <td>BOM Name:</td>
                                <td>${bom.bom_name}</td>
                            </tr>
                            <tr>
                                <td>Product:</td>
                                <td>${bom.product.name}</td>
                            </tr>
                            <tr>
                                <td>Output Quantity:</td>
                                <td>${bom.output_quantity} ${bom.output_uom.uom_short}</td>
                            </tr>
                            <tr>
                                <td>Status:</td>
                                <td>${this.getStatusBadge(bom.status)}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold">Cost Summary</h6>
                        <table class="table table-sm">
                            <tr>
                                <td width="40%">Material Cost:</td>
                                <td>${TempleCore.formatCurrency(totalMaterialCost)}</td>
                            </tr>
                            <tr>
                                <td>Labor Cost:</td>
                                <td>${TempleCore.formatCurrency(bom.labor_cost)}</td>
                            </tr>
                            <tr>
                                <td>Overhead Cost:</td>
                                <td>${TempleCore.formatCurrency(bom.overhead_cost)}</td>
                            </tr>
                            <tr>
                                <td><strong>Total Cost:</strong></td>
                                <td><strong>${TempleCore.formatCurrency(bom.total_cost)}</strong></td>
                            </tr>
                            <tr>
                                <td>Unit Cost:</td>
                                <td>${TempleCore.formatCurrency(bom.total_cost / bom.output_quantity)} per ${bom.output_uom.uom_short}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <h6 class="fw-bold mt-3">Raw Materials</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Material</th>
                                <th>Quantity</th>
                                <th>UOM</th>
                                <th>Unit Cost</th>
                                <th>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rawMaterialsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="5" class="text-end">Total Material Cost:</th>
                                <th>${TempleCore.formatCurrency(totalMaterialCost)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            $('#bomDetailsContent').html(html);
        },

        approveBom: function (bomId) {
            TempleCore.showConfirm(
                'Approve BOM',
                'Are you sure you want to approve this BOM? Once approved, it will become active and can be used for manufacturing.',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/manufacturing/bom/' + bomId + '/approve')
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('BOM approved successfully', 'success');
                                ManufacturingBomPage.loadBoms();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to approve BOM', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        duplicateBom: function (bomId) {
            TempleCore.showConfirm(
                'Duplicate BOM',
                'Are you sure you want to create a copy of this BOM?',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/manufacturing/bom/' + bomId + '/duplicate')
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('BOM duplicated successfully', 'success');
                                ManufacturingBomPage.loadBoms();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to duplicate BOM', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        deleteBom: function (bomId) {
            TempleCore.showConfirm(
                'Delete BOM',
                'Are you sure you want to delete this BOM? This action cannot be undone.',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.delete('/manufacturing/bom/' + bomId)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('BOM deleted successfully', 'success');
                                ManufacturingBomPage.loadBoms();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete BOM', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'ACTIVE': '<span class="badge bg-success">Active</span>',
                'INACTIVE': '<span class="badge bg-warning">Inactive</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },

        renderPagination: function (data) {
            if (data.last_page <= 1) {
                $('#paginationContainer').html('');
                return;
            }

            let html = '<nav><ul class="pagination">';

            // Previous button
            html += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                </li>
            `;

            // Page numbers
            for (let i = 1; i <= data.last_page; i++) {
                if (i === data.current_page) {
                    html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
                } else if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            // Next button
            html += `
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                </li>
            `;

            html += '</ul></nav>';

            $('#paginationContainer').html(html);

            // Bind pagination events
            const self = this;
            $('.page-link').on('click', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentPage = page;
                    self.loadBoms();
                }
            });
        }
    };

})(jQuery, window);