// js/pages/inventory/stock-movements.js
(function ($, window) {
    'use strict';

    window.InventoryStockMovementPage = {
        filters: {
            from_date: '',
            to_date: '',
            product_id: '',
            warehouse_id: '',
            movement_type: ''
        },
        currentPage: 1,
        permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadPermissions()
            this.render();
            this.setupDateDefaults();
            this.setupFilters();
            this.bindEvents();
            this.loadMovements();
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_stock_view: false,
                can_stock_in: false,
                can_stock_out: false,
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_stock_view: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_stock_in: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_stock_out: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                };
            }
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h4>Stock Movements</h4>
                        </div>
                        <div class="col-md-6 text-end">
                     ${this.permissions.can_stock_in ? `
                        
                            <button class="btn btn-success btn-sm" onclick="TempleRouter.navigate('inventory/stock-in')">
                                <i class="bi bi-arrow-down-circle"></i> Stock In
                            </button>`: ''}
                            ${this.permissions.can_stock_out ? `
                            <button class="btn btn-danger btn-sm" onclick="TempleRouter.navigate('inventory/stock-out')">
                                <i class="bi bi-arrow-up-circle"></i> Stock Out
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <form id="filterForm">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="from_date">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="to_date">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Product</label>
                                        <select class="form-control" id="product_filter">
                                            <option value="">All Products</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Warehouse</label>
                                        <select class="form-control" id="warehouse_filter">
                                            <option value="">All Warehouses</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Type</label>
                                        <select class="form-control" id="movement_type_filter">
                                            <option value="">All Types</option>
                                            <option value="IN">Stock In</option>
                                            <option value="OUT">Stock Out</option>
                                        </select>
                                    </div>
                                    <div class="col-md-12 mt-3">
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-search"></i> Apply Filters
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="resetFilters">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                        <div class="btn-group">
                                            <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="bi bi-download"></i> Export
                                            </button>
                                            <ul class="dropdown-menu">
                                    
                                                <li><a class="dropdown-item" href="#" id="exportExcel"><i class="bi bi-file-earmark-excel"></i> Export as Excel</a></li>
                                                <li><a class="dropdown-item" href="#" id="exportPDF"><i class="bi bi-file-earmark-pdf"></i> Export as PDF</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-3" id="summaryCards" style="display:none;">
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <h6>Total In</h6>
                                    <h4 id="totalIn">0</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-danger text-white">
                                <div class="card-body">
                                    <h6>Total Out</h6>
                                    <h4 id="totalOut">0</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <h6>Net Movement</h6>
                                    <h4 id="netMovement">0</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <h6>Total Value</h6>
                                    <h4 id="totalValue">0</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Movements Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="movementsTable">
                                    <thead>
                                        <tr>
                                            <th>Date/Time</th>
                                            <th>Movement #</th>
                                            <th>Type</th>
                                            <th>Product</th>
                                            <th>Product Type</th>
                                            <th>Warehouse</th>
                                            <th>Quantity</th>
                                            <th>Unit Cost</th>
                                            <th>Total Cost</th>
                                            <th>Reference</th>
                                            <th>Created By</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colspan="12" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <nav id="pagination"></nav>
                        </div>
                    </div>
                </div>
                
                <!-- View Details Modal -->
                <div class="modal fade" id="movementDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Movement Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="movementDetailsContent">
                                <!-- Content will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        setupDateDefaults: function () {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

            $('#from_date').val(firstDay.toISOString().split('T')[0]);
            $('#to_date').val(today.toISOString().split('T')[0]);

            this.filters.from_date = firstDay.toISOString().split('T')[0];
            this.filters.to_date = today.toISOString().split('T')[0];
        },

        setupFilters: function () {
            TempleAPI.get('/inventory/products')
                .done(function (response) {
                    if (response.success) {
                        const products = response.data.data || response.data || [];
                        let options = '<option value="">All Products</option>';
                        products.forEach(p => {
                            options += `<option value="${p.id}">${p.name} (${p.product_type})</option>`;
                        });
                        $('#product_filter').html(options);
                    }
                })
                .fail(function () {
                    console.error('Failed to load products for filter');
                });

            TempleAPI.get('/inventory/warehouse')
                .done(function (response) {
                    if (response.success) {
                        const warehouses = response.data || [];
                        let options = '<option value="">All Warehouses</option>';
                        warehouses.forEach(w => {
                            options += `<option value="${w.id}">${w.name}</option>`;
                        });
                        $('#warehouse_filter').html(options);
                    }
                })
                .fail(function () {
                    console.error('Failed to load warehouses for filter');
                });
        },

        bindEvents: function () {
            const self = this;

            $('#filterForm').on('submit', function (e) {
                e.preventDefault();
                self.applyFilters();
            });

            $('#resetFilters').on('click', function () {
                $('#filterForm')[0].reset();
                self.setupDateDefaults();
                self.filters = {
                    from_date: $('#from_date').val(),
                    to_date: $('#to_date').val(),
                    product_id: '',
                    warehouse_id: '',
                    movement_type: ''
                };
                self.currentPage = 1;
                self.loadMovements();
            });


            $('#exportExcel').on('click', function (e) {
                e.preventDefault();
                self.exportMovements('excel');
            });

            $('#exportPDF').on('click', function (e) {
                e.preventDefault();
                self.exportMovements('pdf');
            });

            $('#from_date, #to_date, #product_filter, #warehouse_filter, #movement_type_filter').on('change', function () {
                self.applyFilters();
            });
        },

        applyFilters: function () {
            this.filters = {
                from_date: $('#from_date').val(),
                to_date: $('#to_date').val(),
                product_id: $('#product_filter').val(),
                warehouse_id: $('#warehouse_filter').val(),
                movement_type: $('#movement_type_filter').val()
            };

            this.currentPage = 1;
            this.loadMovements();
        },

        loadMovements: function (page) {
            const self = this;
            page = page || this.currentPage;

            $('#movementsTable tbody').html(`
                <tr>
                    <td colspan="12" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `);

            const queryParams = { page: page };

            Object.keys(this.filters).forEach(key => {
                if (this.filters[key] && this.filters[key] !== '') {
                    queryParams[key] = this.filters[key];
                }
            });

            console.log('Sending query params:', queryParams);

            TempleAPI.get('/inventory/stock', queryParams)
                .done(function (response) {
                    console.log('Response received:', response);
                    if (response.success) {
                        self.currentPage = page;
                        self.permissions = response.data.permissions || self.permissions;

                        self.renderMovements(response.data);
                        self.updateSummary(response.data);
                    } else {
                        self.showError('Failed to load movements');
                    }
                })
                .fail(function (xhr) {
                    console.error('Request failed:', xhr);
                    self.showError('Failed to load stock movements');
                });
        },

        renderMovements: function (data) {
            const tbody = $('#movementsTable tbody');
            const self = this
            tbody.empty();
            const movements = data.data || data;
            self.permissions = data.permissions || self.permissions || { can_stock_view: false };


            if (Array.isArray(movements) && movements.length > 0) {
                movements.forEach(function (movement) {
                    const typeClass = movement.movement_type === 'IN' ? 'success' : 'danger';
                    const typeIcon = movement.movement_type === 'IN' ? 'arrow-down-circle' : 'arrow-up-circle';

                    const movementDate = new Date(movement.created_at);
                    const dateStr = movementDate.toLocaleDateString('en-GB');
                    const timeStr = movementDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const row = `
                        <tr>
                            <td>
                                ${dateStr}<br>
                                <small class="text-muted">${timeStr}</small>
                            </td>
                            <td>
                                <code>${movement.movement_number || '-'}</code>
                            </td>
                            <td>
                                <span class="badge bg-${typeClass}">
                                    <i class="bi bi-${typeIcon}"></i> ${movement.movement_type}
                                </span>
                                ${movement.movement_subtype ? '<br><small class="text-muted">' + movement.movement_subtype + '</small>' : ''}
                            </td>
                            <td>
                                ${movement.product?.name || '-'}
                                ${movement.product?.code ? '<br><small class="text-muted">Code: ' + movement.product.code + '</small>' : ''}
                            </td>
                            <td>
                                ${movement.product?.product_type
                            ? movement.product.product_type.charAt(0).toUpperCase() + movement.product.product_type.slice(1).toLowerCase()
                            : '-'}
                            </td>
                            <td>${movement.warehouse?.name || '-'}</td>
                       
                             <td class="text-end">
							  ${parseFloat(movement.quantity).toFixed(4)} 
							  ${movement.product?.uom?.base_unit?.uom_short || movement.product?.uom?.uom_short || ''}
							</td>

                            </td>
                            <td class="text-end">${TempleCore.formatCurrency(movement.unit_cost || 0, 4)}</td>
                            <td class="text-end"><strong>${TempleCore.formatCurrency(movement.total_cost || 0, 4)}</strong></td>
                            <td>
                                ${movement.reference_type || '-'}
                                ${movement.reference_id ? '<br><small class="text-muted">#' + movement.reference_id + '</small>' : ''}
                            </td>
                            <td>
                                ${movement.creator?.name || '-'}
                                ${movement.approval_status === 'APPROVED' ? '<br><span class="badge bg-success">Approved</span>' : ''}
                            </td>
                            <td>
                                                    ${self.permissions.can_stock_view ? `<button class="btn btn-sm btn-info" onclick="InventoryStockMovementPage.viewDetails('${movement.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>`: ''}
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });

                if (data.links) {
                    this.renderPagination(data);
                }
            } else {
                tbody.html(`
                    <tr>
                        <td colspan="12" class="text-center text-muted">
                            <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                            <p>No stock movements found for the selected filters</p>
                        </td>
                    </tr>
                `);
            }
        },

        renderPagination: function (data) {
            if (!data.links || data.links.length <= 3) {
                $('#pagination').empty();
                return;
            }

            let paginationHtml = '<ul class="pagination justify-content-center">';

            data.links.forEach((link, index) => {
                if (!link.url && (index === 0 || index === data.links.length - 1)) {
                    return;
                }

                const isActive = link.active ? 'active' : '';
                const isDisabled = !link.url ? 'disabled' : '';

                let label = link.label;
                if (label.includes('Previous')) {
                    label = '<i class="bi bi-chevron-left"></i>';
                } else if (label.includes('Next')) {
                    label = '<i class="bi bi-chevron-right"></i>';
                }

                paginationHtml += `
                    <li class="page-item ${isActive} ${isDisabled}">
                        <a class="page-link" href="#" data-page="${link.url ? new URL(link.url).searchParams.get('page') : ''}">${label}</a>
                    </li>
                `;
            });

            paginationHtml += '</ul>';

            $('#pagination').html(paginationHtml);

            $('#pagination .page-link').off('click').on('click', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    InventoryStockMovementPage.loadMovements(parseInt(page));
                }
            });
        },

        updateSummary: function (data) {
            const movements = data.data || data;
            let totalIn = 0;
            let totalOut = 0;
            let totalValue = 0;

            if (Array.isArray(movements)) {
                movements.forEach(movement => {
                    const qty = parseFloat(movement.quantity) || 0;
                    const cost = parseFloat(movement.total_cost) || 0;

                    if (movement.movement_type === 'IN') {
                        totalIn += qty;
                    } else {
                        totalOut += qty;
                    }
                    totalValue += cost;
                });
            }

            $('#totalIn').text(totalIn.toFixed(3));
            $('#totalOut').text(totalOut.toFixed(3));
            $('#netMovement').text((totalIn - totalOut).toFixed(3));
            $('#totalValue').text(TempleCore.formatCurrency(totalValue));

            $('#summaryCards').toggle(movements.length > 0);
        },

        viewDetails: function (movementId) {
            const self = this;

            TempleAPI.get(`/inventory/stock/show/${movementId}`)
                .done(function (response) {
                    if (response.success) {
                        self.showMovementDetails(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load movement details', 'error');
                });
        },

        showMovementDetails: function (movement) {
            const modalContent = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Movement Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <th>Movement #:</th>
                                <td>${movement.movement_number || '-'}</td>
                            </tr>
                            <tr>
                                <th>Type:</th>
                                <td>
                                    <span class="badge bg-${movement.movement_type === 'IN' ? 'success' : 'danger'}">
                                        ${movement.movement_type}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <th>Subtype:</th>
                                <td>${movement.movement_subtype || '-'}</td>
                            </tr>
                            <tr>
                                <th>Date/Time:</th>
                                <td>${new Date(movement.created_at).toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Product Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <th>Product:</th>
                                <td>${movement.product?.name || '-'}</td>
                            </tr>
                            <tr>
                                <th>Product Type:</th>
                                <td>${movement.product?.product_type || '-'}</td>
                            </tr>
                            <tr>
                                <th>Warehouse:</th>
                                <td>${movement.warehouse?.name || '-'}</td>
                            </tr>
                            <tr>
                                <th>Batch #:</th>
                                <td>${movement.batch_number || '-'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12">
                        <h6>Quantity & Cost</h6>
                        <table class="table table-sm">
                            <tr>
                                <th>Quantity:</th>
                                <td>${parseFloat(movement.quantity).toFixed(3)} ${movement.product?.uom?.name || ''}</td>
                            </tr>
                            <tr>
                                <th>Unit Cost:</th>
                                <td>${TempleCore.formatCurrency(movement.unit_cost || 0)}</td>
                            </tr>
                            <tr>
                                <th>Total Cost:</th>
                                <td><strong>${TempleCore.formatCurrency(movement.total_cost || 0)}</strong></td>
                            </tr>
                        </table>
                    </div>
                </div>
                ${movement.notes ? `
                    <div class="row mt-3">
                        <div class="col-12">
                            <h6>Notes</h6>
                            <p>${movement.notes}</p>
                        </div>
                    </div>
                ` : ''}
            `;

            $('#movementDetailsContent').html(modalContent);
            const modal = new bootstrap.Modal(document.getElementById('movementDetailsModal'));
            modal.show();
        },

        exportMovements: function (format) {
            format = format || 'csv';

            const queryParams = Object.assign({}, this.filters, { format: format });

            Object.keys(queryParams).forEach(key => {
                if (!queryParams[key] || queryParams[key] === '') {
                    delete queryParams[key];
                }
            });

            const queryString = $.param(queryParams);
            const exportUrl = TempleAPI.getBaseUrl() + '/inventory/stock/export?' + queryString;

            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);

            TempleCore.showToast('Preparing ' + format.toUpperCase() + ' export...', 'info');

            fetch(exportUrl, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'X-Temple-ID': TempleAPI.getTempleId()
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Export failed');
                    }
                    return response.blob();
                })
                .then(blob => {
                    let extension = 'csv';
                    let mimeType = 'text/csv';

                    if (format === 'excel') {
                        extension = 'xlsx';
                        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    } else if (format === 'pdf') {
                        extension = 'pdf';
                        mimeType = 'application/pdf';
                    }

                    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `stock_movements_${new Date().toISOString().split('T')[0]}.${extension}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                    TempleCore.showToast('Export completed successfully', 'success');
                })
                .catch(error => {
                    console.error('Export error:', error);
                    TempleCore.showToast('Export failed. Please try again.', 'error');
                });
        },

        showError: function (message) {
            $('#movementsTable tbody').html(`
                <tr>
                    <td colspan="12" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${message}
                    </td>
                </tr>
            `);
        }
    };

})(jQuery, window);