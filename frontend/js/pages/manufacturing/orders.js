// js/pages/manufacturing/orders/index.js
// Manufacturing Orders List Page - FIXED

(function ($, window) {
    'use strict';

    window.ManufacturingOrdersPage = {
        currentPage: 1,
        perPage: 15,
        warehouses: [],
        permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.loadInitialData();
                self.bindEvents();
                self.loadDashboard();
                self.loadOrders();
            });
        },
        loadPermissions: function () {
            const self = this;
            const userId = this.currentUser.id;

            return TempleAPI.get(`/manufacturing/orders/user/${userId}/permissions`)
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
                can_create_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_cancel_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_complete_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_start_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_validate_manufacturing_order: userType === 'SUPER_ADMIN' || userType === 'ADMIN',

            };
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Manufacturing Orders</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Manufacturing</li>
                                    <li class="breadcrumb-item active">Production Orders</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                         ${this.permissions.can_create_manufacturing_order ? `
                            <button class="btn btn-primary" id="createOrderBtn">
                                <i class="bi bi-plus-circle"></i> Create Production Order
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Dashboard Statistics -->
                    <div class="row mb-3" id="dashboardStats">
                        <div class="col-md-2 col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body p-2">
                                    <h5 class="mb-1" id="statDraft">0</h5>
                                    <small class="text-muted">Draft</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2 col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body p-2">
                                    <h5 class="mb-1" id="statValidated">0</h5>
                                    <small class="text-muted">Validated</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2 col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body p-2">
                                    <h5 class="mb-1" id="statInProgress">0</h5>
                                    <small class="text-muted">In Progress</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2 col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body p-2">
                                    <h5 class="mb-1" id="statCompleted">0</h5>
                                    <small class="text-muted">Completed</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2 col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body p-2">
                                    <h5 class="mb-1" id="statToday">0</h5>
                                    <small class="text-muted">Today</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2 col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body p-2">
                                    <h5 class="mb-1 text-danger" id="statOverdue">0</h5>
                                    <small class="text-muted">Overdue</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search order number, product...">
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="VALIDATED">Validated</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="priorityFilter">
                                        <option value="">All Priority</option>
                                        <option value="LOW">Low</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="warehouseFilter">
                                        <option value="">All Warehouses</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <input type="date" class="form-control" id="scheduledDateFilter">
                                </div>
                                <div class="col-md-1">
                                    <button class="btn btn-secondary w-100" id="resetFiltersBtn">
                                        <i class="bi bi-arrow-clockwise"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Orders List -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Order Number</th>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Warehouse</th>
                                            <th>Scheduled Date</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ordersTableBody">
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
                            <div id="paginationContainer" class="mt-3"></div>
                        </div>
                    </div>
                </div>

                <!-- Order Details Modal -->
                <div class="modal fade" id="orderDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Manufacturing Order Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="orderDetailsContent">
                                <!-- Content will be loaded here -->
                            </div>
                            <div class="modal-footer" id="orderDetailsFooter">
                                <!-- Action buttons will be added here based on order status -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stock Shortage Modal -->
                <div class="modal fade" id="stockShortageModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">Stock Shortage</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="stockShortageContent">
                                <!-- Shortage details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quality Check Modal -->
                <div class="modal fade" id="qualityCheckModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Quality Check</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" id="qualityCheckOrderId">
                                <div class="mb-3">
                                    <label class="form-label">Quality Status <span class="text-danger">*</span></label>
                                    <select class="form-select" id="qualityStatus" required>
                                        <option value="">Select Status</option>
                                        <option value="PASSED">Passed</option>
                                        <option value="FAILED">Failed</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" id="qualityNotes" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="submitQualityCheckBtn">Submit</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Complete Manufacturing Modal -->
                <div class="modal fade" id="completeManufacturingModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Complete Manufacturing</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" id="completeOrderId">
                                <div class="mb-3">
                                    <label class="form-label">Planned Quantity</label>
                                    <input type="text" class="form-control" id="plannedQuantity" readonly>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Actual Quantity Produced</label>
                                    <input type="number" class="form-control" id="actualQuantityProduced" step="0.001" min="0.001">
                                    <small class="text-muted">Leave blank to use planned quantity</small>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmCompleteBtn">Complete Manufacturing</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadInitialData: function () {
            // Load warehouses
            TempleAPI.get('/manufacturing/orders/warehouses')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Warehouses</option>';
                        response.data.forEach(function (warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name || warehouse.warehouse_name}</option>`;
                        });
                        $('#warehouseFilter').html(options);
                        ManufacturingOrdersPage.warehouses = response.data;
                    }
                })
                .fail(function () {
                    console.log('Failed to load warehouses');
                });
        },

        loadDashboard: function () {
            TempleAPI.get('/manufacturing/orders/dashboard')
                .done(function (response) {
                    if (response.success && response.data) {
                        const stats = response.data.statistics || {};
                        $('#statDraft').text(stats.draft_orders || 0);
                        $('#statValidated').text(stats.validated_orders || 0);
                        $('#statInProgress').text(stats.in_progress_orders || 0);
                        $('#statCompleted').text(stats.completed_orders || 0);
                        $('#statToday').text(stats.today_scheduled || 0);
                        $('#statOverdue').text(stats.overdue_orders || 0);
                    }
                })
                .fail(function () {
                    console.log('Failed to load dashboard statistics');
                });
        },

        bindEvents: function () {
            const self = this;

            // Create order button
            $('#createOrderBtn').on('click', function () {
                TempleRouter.navigate('manufacturing/orders/create');
            });

            // Filters
            let searchTimeout;
            $('#searchInput').on('keyup', function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function () {
                    self.currentPage = 1;
                    self.loadOrders();
                }, 500);
            });

            $('#statusFilter, #priorityFilter, #warehouseFilter, #scheduledDateFilter').on('change', function () {
                self.currentPage = 1;
                self.loadOrders();
            });

            // Reset filters
            $('#resetFiltersBtn').on('click', function () {
                $('#searchInput').val('');
                $('#statusFilter').val('');
                $('#priorityFilter').val('');
                $('#warehouseFilter').val('');
                $('#scheduledDateFilter').val('');
                self.currentPage = 1;
                self.loadOrders();
            });

            // Quality check submit
            $('#submitQualityCheckBtn').on('click', function () {
                self.submitQualityCheck();
            });

            // Complete manufacturing confirm
            $('#confirmCompleteBtn').on('click', function () {
                self.completeManufacturing();
            });
        },

        loadOrders: function () {
            const self = this;
            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                search: $('#searchInput').val(),
                status: $('#statusFilter').val(),
                priority: $('#priorityFilter').val(),
                warehouse_id: $('#warehouseFilter').val(),
                scheduled_date: $('#scheduledDateFilter').val()
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            TempleAPI.get('/manufacturing/orders', params)
                .done(function (response) {
                    if (response.success) {
                        // Handle different response formats
                        let orders = [];
                        let paginationData = null;

                        // Check if response.data is an array (direct data)
                        if (Array.isArray(response.data)) {
                            orders = response.data;
                            paginationData = response.meta || null;
                        }
                        // Check if response.data has a data property (paginated)
                        else if (response.data && Array.isArray(response.data.data)) {
                            orders = response.data.data;
                            paginationData = response.data;
                        }
                        // Check if response.data is the orders directly with meta
                        else if (response.data && !Array.isArray(response.data) && response.meta) {
                            orders = response.data;
                            paginationData = response.meta;
                        }

                        self.renderOrders(orders, self.permissions);

                        if (paginationData) {
                            self.renderPagination(paginationData);
                        }
                    } else {
                        self.renderEmptyState('No orders found');
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load orders:', xhr);
                    self.renderEmptyState('Failed to load manufacturing orders');
                });
        },

        renderEmptyState: function (message) {
            $('#ordersTableBody').html(`
                <tr>
                    <td colspan="8" class="text-center">${message}</td>
                </tr>
            `);
            $('#paginationContainer').html('');
        },

        renderOrders: function (orders, permissions) {
            const self = this;

            // Check if orders is valid and is an array
            if (!orders || !Array.isArray(orders) || orders.length === 0) {
                this.renderEmptyState('No manufacturing orders found');
                return;
            }

            let html = '';
            orders.forEach(function (order) {
                // Safely access nested properties with fallbacks
                const product = order.product || {};
                const warehouse = order.warehouse || {};
                const uom = order.uom || {};

                const statusBadge = self.getStatusBadge(order.status);
                const priorityBadge = self.getPriorityBadge(order.priority);
                const isOverdue = order.scheduled_date &&
                    new Date(order.scheduled_date) < new Date() &&
                    !['COMPLETED', 'CANCELLED'].includes(order.status);

                html += `
                    <tr class="${isOverdue ? 'table-warning' : ''}">
                        <td>
                            <a href="#" class="text-primary view-order" data-id="${order.id}">
                                ${order.order_number || 'N/A'}
                            </a>
                            ${order.batch_number ? `<br><small class="text-muted">Batch: ${order.batch_number}</small>` : ''}
                        </td>
                        <td>${product.name || 'N/A'}</td>
                        <td>${order.quantity_to_produce || 0} ${uom.uom_short || ''}</td>
                        <td>${warehouse.name || warehouse.warehouse_name || 'N/A'}</td>
                        <td>
                            ${order.scheduled_date ? TempleCore.formatDate(order.scheduled_date, 'short') : 'N/A'}
                            ${isOverdue ? '<i class="bi bi-exclamation-triangle text-danger ms-1"></i>' : ''}
                        </td>
                        <td>${priorityBadge}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                ${permissions.can_view_manufacturing_order ? `
                                <button class="btn btn-info view-order" data-id="${order.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>`: ''}
                `;

                // Add action buttons based on status
                if (order.status === 'DRAFT' && permissions.can_edit_manufacturing_order) {
                    html += `
                        <button class="btn btn-warning edit-order" data-id="${order.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>  `;
                }
                if (order.status === 'DRAFT' && permissions.can_validate_manufacturing_order) {
                    html += `    <button class="btn btn-success validate-order" data-id="${order.id}" title="Validate">
                            <i class="bi bi-check-circle"></i>
                        </button>
                    `;
                }

                if (order.status === 'VALIDATED' && permissions.can_start_manufacturing_order) {
                    html += `
                        <button class="btn btn-primary start-manufacturing" data-id="${order.id}" title="Start Manufacturing">
                            <i class="bi bi-play-circle"></i>
                        </button>
                    `;
                }
                if (order.status === 'CANCELLED' && permissions.can_delete_manufacturing_order) {
                    html += `
        <button class="btn btn-danger delete-order" data-id="${order.id}" title="Delete">
            <i class="bi bi-trash"></i>
        </button>
    `;
                }
                if (order.status === 'IN_PROGRESS') {
                    if (order.quality_check_required && !order.quality_status) {
                        html += `
                            <button class="btn btn-warning quality-check" data-id="${order.id}" title="Quality Check">
                                <i class="bi bi-clipboard-check"></i>
                            </button>
                        `;
                    } else {
                        if (permissions.can_complete_manufacturing_order) {
                            html += `
                            <button class="btn btn-success complete-order" data-id="${order.id}" 
                                    data-quantity="${order.quantity_to_produce}" 
                                    data-uom="${uom.uom_short || ''}" title="Complete">
                                <i class="bi bi-check-square"></i>
                            </button>
                        `;
                        }
                    }
                }

                if (!['COMPLETED', 'CANCELLED'].includes(order.status)) {
                    html += `
                        <button class="btn btn-danger cancel-order" data-id="${order.id}" title="Cancel">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    `;
                }

                html += `
                            </div>
                        </td>
                    </tr>
                `;
            });

            $('#ordersTableBody').html(html);
            this.bindTableEvents();
        },

        bindTableEvents: function () {
            const self = this;

            // View order
            $('.view-order').on('click', function (e) {
                e.preventDefault();
                const orderId = $(this).data('id');
                self.viewOrderDetails(orderId);
            });

            // Edit order
            $('.edit-order').on('click', function () {
                const orderId = $(this).data('id');
                TempleRouter.navigate('manufacturing/orders/edit', { id: orderId });
            });

            // Validate order
            $('.validate-order').on('click', function () {
                const orderId = $(this).data('id');
                self.validateOrder(orderId);
            });

            // Start manufacturing
            $('.start-manufacturing').on('click', function () {
                const orderId = $(this).data('id');
                self.startManufacturing(orderId);
            });

            // Quality check
            $('.quality-check').on('click', function () {
                const orderId = $(this).data('id');
                self.showQualityCheckModal(orderId);
            });
            // Delete order 
            $('.delete-order').on('click', function () {
                const orderId = $(this).data('id');
                self.deleteOrder(orderId);
            });
            // Complete order
            $('.complete-order').on('click', function () {
                const orderId = $(this).data('id');
                const quantity = $(this).data('quantity');
                const uom = $(this).data('uom');
                self.showCompleteModal(orderId, quantity, uom);
            });

            // Cancel order
            $('.cancel-order').on('click', function () {
                const orderId = $(this).data('id');
                self.cancelOrder(orderId);
            });
        },

        viewOrderDetails: function (orderId) {
            const self = this;

            $('#orderDetailsContent').html(`
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);

            const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
            modal.show();

            TempleAPI.get('/manufacturing/orders/' + orderId)
                .done(function (response) {
                    if (response.success) {
                        self.renderOrderDetails(response.data);
                    }
                })
                .fail(function () {
                    $('#orderDetailsContent').html('<p class="text-danger">Failed to load order details</p>');
                });
        },
        deleteOrder: function (orderId) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Manufacturing Order',
                'Are you sure you want to delete this order? This action cannot be undone.',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.delete('/manufacturing/orders/' + orderId)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Manufacturing order deleted successfully', 'success');
                                self.loadOrders();
                                self.loadDashboard();

                                // Close modal if open
                                const orderModal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
                                if (orderModal) {
                                    orderModal.hide();
                                }
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(
                                response?.message || 'Failed to delete manufacturing order',
                                'error'
                            );
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        renderOrderDetails: function (order) {
            // Safely access nested properties
            const product = order.product || {};
            const warehouse = order.warehouse || {};
            const uom = order.uom || {};
            const items = order.items || [];

            let rawMaterialsHtml = '';
            items.forEach(function (item) {
                const rawMaterial = item.raw_material || {};
                const itemUom = item.uom || {};
                const statusClass = item.status === 'CONSUMED' ? 'text-success' :
                    item.status === 'RESERVED' ? 'text-info' : '';
                rawMaterialsHtml += `
                    <tr>
                        <td>${rawMaterial.product_code || 'N/A'}</td>
                        <td>${rawMaterial.name || 'N/A'}</td>
                        <td>${item.required_quantity || 0} ${itemUom.uom_short || ''}</td>
                        <td>${item.consumed_quantity || 0} ${itemUom.uom_short || ''}</td>
                        <td><span class="${statusClass}">${item.status || 'N/A'}</span></td>
                    </tr>
                `;
            });

            const html = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="fw-bold">Order Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <td width="40%">Order Number:</td>
                                <td><strong>${order.order_number || 'N/A'}</strong></td>
                            </tr>
                            <tr>
                                <td>Status:</td>
                                <td>${this.getStatusBadge(order.status)}</td>
                            </tr>
                            <tr>
                                <td>Priority:</td>
                                <td>${this.getPriorityBadge(order.priority)}</td>
                            </tr>
                            <tr>
                                <td>Product:</td>
                                <td>${product.name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td>Quantity to Produce:</td>
                                <td>${order.quantity_to_produce || 0} ${uom.uom_short || ''}</td>
                            </tr>
                            <tr>
                                <td>Quantity Produced:</td>
                                <td>${order.quantity_produced || 0} ${uom.uom_short || ''}</td>
                            </tr>
                            <tr>
                                <td>Warehouse:</td>
                                <td>${warehouse.name || warehouse.warehouse_name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td>Scheduled Date:</td>
                                <td>${order.scheduled_date ? TempleCore.formatDate(order.scheduled_date) : 'N/A'}</td>
                            </tr>
                            ${order.batch_number ? `
                                <tr>
                                    <td>Batch Number:</td>
                                    <td>${order.batch_number}</td>
                                </tr>
                            ` : ''}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold">Cost Summary</h6>
                        <table class="table table-sm">
                            <tr>
                                <td width="40%">Material Cost:</td>
                                <td>${TempleCore.formatCurrency(order.material_cost || 0)}</td>
                            </tr>
                            <tr>
                                <td>Labor Cost:</td>
                                <td>${TempleCore.formatCurrency(order.labor_cost || 0)}</td>
                            </tr>
                            <tr>
                                <td>Overhead Cost:</td>
                                <td>${TempleCore.formatCurrency(order.overhead_cost || 0)}</td>
                            </tr>
                            <tr>
                                <td><strong>Total Cost:</strong></td>
                                <td><strong>${TempleCore.formatCurrency(order.total_cost || 0)}</strong></td>
                            </tr>
                            <tr>
                                <td>Unit Cost:</td>
                                <td>${order.quantity_to_produce ? TempleCore.formatCurrency((order.total_cost || 0) / order.quantity_to_produce) : 'N/A'} per ${uom.uom_short || 'unit'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                ${items.length > 0 ? `
                    <h6 class="fw-bold mt-3">Raw Materials</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Material</th>
                                    <th>Required</th>
                                    <th>Consumed</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rawMaterialsHtml}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                ${order.notes ? `
                    <div class="mt-3">
                        <h6 class="fw-bold">Notes</h6>
                        <p>${order.notes}</p>
                    </div>
                ` : ''}
            `;

            $('#orderDetailsContent').html(html);

            // Update footer with action buttons
            let footerHtml = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
            $('#orderDetailsFooter').html(footerHtml);
        },

        validateOrder: function (orderId) {
            const self = this;

            TempleCore.showConfirm(
                'Validate Order',
                'Are you sure you want to validate this order? This will reserve the required raw materials.',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/manufacturing/orders/' + orderId + '/validate')
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Order validated successfully', 'success');
                                self.loadOrders();
                                self.loadDashboard();
                                bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'))?.hide();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Failed to validate order', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        startManufacturing: function (orderId) {
            const self = this;

            TempleCore.showConfirm(
                'Start Manufacturing',
                'Are you sure you want to start manufacturing? This will consume raw materials from stock.',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/manufacturing/orders/' + orderId + '/start')
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Manufacturing started successfully', 'success');
                                self.loadOrders();
                                self.loadDashboard();
                                bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'))?.hide();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Failed to start manufacturing', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        showQualityCheckModal: function (orderId) {
            $('#qualityCheckOrderId').val(orderId);
            $('#qualityStatus').val('');
            $('#qualityNotes').val('');
            const modal = new bootstrap.Modal(document.getElementById('qualityCheckModal'));
            modal.show();
        },

        submitQualityCheck: function () {
            const orderId = $('#qualityCheckOrderId').val();
            const status = $('#qualityStatus').val();
            const notes = $('#qualityNotes').val();

            if (!status) {
                TempleCore.showToast('Please select quality status', 'warning');
                return;
            }

            TempleCore.showLoading(true);
            TempleAPI.post('/manufacturing/orders/' + orderId + '/quality-check', {
                quality_status: status,
                quality_notes: notes
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Quality check completed', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('qualityCheckModal')).hide();
                        ManufacturingOrdersPage.loadOrders();
                        bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'))?.hide();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to submit quality check', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        showCompleteModal: function (orderId, quantity, uom) {
            $('#completeOrderId').val(orderId);
            $('#plannedQuantity').val(quantity + ' ' + uom);
            $('#actualQuantityProduced').val('');
            const modal = new bootstrap.Modal(document.getElementById('completeManufacturingModal'));
            modal.show();
        },

        completeManufacturing: function () {
            const orderId = $('#completeOrderId').val();
            const actualQuantity = $('#actualQuantityProduced').val();

            const data = {};
            if (actualQuantity) {
                data.quantity_produced = parseFloat(actualQuantity);
            }

            TempleCore.showConfirm(
                'Complete Manufacturing',
                'This will add the manufactured product to inventory. Continue?',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/manufacturing/orders/' + orderId + '/complete', data)
                        .done(function (response) {
                            if (response.success) {
                                bootstrap.Modal.getInstance(document.getElementById('completeManufacturingModal')).hide();
                                TempleCore.showToast('Manufacturing completed successfully!', 'success');
                                ManufacturingOrdersPage.loadOrders();
                                ManufacturingOrdersPage.loadDashboard();
                                bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'))?.hide();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Failed to complete manufacturing', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        cancelOrder: function (orderId) {
            const self = this;

            const reason = prompt('Please provide a reason for cancellation:');
            if (!reason) {
                return;
            }

            TempleCore.showConfirm(
                'Cancel Order',
                'Are you sure you want to cancel this manufacturing order? Any reserved stock will be released.',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.post('/manufacturing/orders/' + orderId + '/cancel', {
                        cancellation_reason: reason
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Order cancelled successfully', 'success');
                                self.loadOrders();
                                self.loadDashboard();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to cancel order', 'error');
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
                'VALIDATED': '<span class="badge bg-info">Validated</span>',
                'IN_PROGRESS': '<span class="badge bg-warning">In Progress</span>',
                'COMPLETED': '<span class="badge bg-success">Completed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },

        getPriorityBadge: function (priority) {
            const badges = {
                'LOW': '<span class="badge bg-secondary">Low</span>',
                'NORMAL': '<span class="badge bg-primary">Normal</span>',
                'HIGH': '<span class="badge bg-warning">High</span>',
                'URGENT': '<span class="badge bg-danger">Urgent</span>'
            };
            return badges[priority] || '<span class="badge bg-secondary">Normal</span>';
        },

        getQualityBadge: function (status) {
            const badges = {
                'PENDING': '<span class="badge bg-warning">Pending</span>',
                'PASSED': '<span class="badge bg-success">Passed</span>',
                'FAILED': '<span class="badge bg-danger">Failed</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">N/A</span>';
        },

        renderPagination: function (data) {
            // Check if pagination data exists
            if (!data || !data.last_page || data.last_page <= 1) {
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
                    self.loadOrders();
                }
            });
        }
    };

})(jQuery, window);