// js/pages/sales/delivery-orders.js
// Sales Delivery Orders List Page
// FIXED: Proper loading overlay management to prevent stuck loaders

(function ($, window) {
    'use strict';

    window.SalesDeliveryOrdersPage = {
        permissions: {},
        currentUser: null,
        
        init: function () {
            console.log('SalesDeliveryOrdersPage: Initializing...');
            
            // CRITICAL: Force hide any stuck loading overlays immediately on init
            this.hideLoadingSafe();
            
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG?.STORAGE?.USER || 'user') || '{}');
            this.permissions = {
                can_create: true,
                can_edit: true,
                can_delete: true,
                can_quality_check: true,
                can_complete: true,
                can_view: true
            };

            try {
                this.render();
                this.loadCustomers();
                this.loadWarehouses();
                this.bindEvents();
                
                // Load data and statistics after DOM is ready
                setTimeout(() => {
                    this.loadStatistics();
                    this.loadData();
                }, 200);
                
                // Extra safeguard: ensure loading is hidden after init completes
                setTimeout(() => {
                    this.hideLoadingSafe();
                }, 500);
            } catch (error) {
                console.error('Initialization error:', error);
                this.hideLoadingSafe();
            }
        },

        hideLoadingSafe: function() {
            // Safe wrapper to ensure loading overlays are always removed
            console.log('hideLoadingSafe called');
            try {
                // Use TempleCore if available
                if (typeof TempleCore !== 'undefined' && TempleCore.hideLoading) {
                    TempleCore.hideLoading();
                    console.log('TempleCore.hideLoading() executed');
                }
                
                // Forcefully remove any loading overlays that might be stuck
                $('.loading-overlay, .modal-backdrop, #loading-overlay, .spinner-overlay').remove();
                $('body').removeClass('loading modal-open');
                
                // Remove any inline spinners that might be stuck
                $('.page-loading, .table-loading').remove();
                
                // Clear any backdrop that might be preventing interaction
                $('.fade.show').filter(function() {
                    return $(this).css('opacity') === '0.5' && $(this).hasClass('modal-backdrop');
                }).remove();
                
            } catch (e) {
                console.error('Error hiding loading:', e);
            }
        },

        render: function () {
            console.log('SalesDeliveryOrdersPage: Rendering HTML...');
            
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3><i class="bi bi-truck"></i> Sales Delivery Orders</h3>
                        </div>
                         <div class="col-md-6 text-end">
                    <button class="btn btn-success me-2" id="createStandaloneDOBtn">
                        <i class="bi bi-plus-circle"></i> Create Delivery Order
                    </button>
                </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="text-muted">Total DOs</h6>
                                            <h3 id="totalDOs">0</h3>
                                        </div>
                                        <div class="stat-icon text-primary">
                                            <i class="bi bi-file-text fs-1"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="text-muted">Pending Quality</h6>
                                            <h3 id="pendingQuality">0</h3>
                                        </div>
                                        <div class="stat-icon text-warning">
                                            <i class="bi bi-clipboard-check fs-1"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="text-muted">Completed</h6>
                                            <h3 id="completedDOs">0</h3>
                                        </div>
                                        <div class="stat-icon text-success">
                                            <i class="bi bi-check-circle fs-1"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="text-muted">Total Value</h6>
                                            <h3 id="totalValue">RM 0.00</h3>
                                        </div>
                                        <div class="stat-icon text-info">
                                            <i class="bi bi-currency-dollar fs-1"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-2">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="QUALITY_CHECK">Quality Check</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Customer</label>
                                    <select class="form-select" id="filterCustomer">
                                        <option value="">All Customers</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Warehouse</label>
                                    <select class="form-select" id="filterWarehouse">
                                        <option value="">All Warehouses</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>
                                <div class="col-md-2 d-flex align-items-end">
                                    <button class="btn btn-secondary w-100" id="resetFilters">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="doTable">
                                    <thead>
                                        <tr>
                                            <th>DO Number</th>
                                            <th>DO Date</th>
                                            <th>SO Number</th>
                                            <th>Customer</th>
                                            <th>Warehouse</th>
                                            <th>Total Amount</th>
                                            <th>Quality Status</th>
                                            <th>Status</th>
                                            <th width="250">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="doTableBody">
                                        <tr><td colspan="9" class="text-center">
                                            <div class="spinner-border spinner-border-sm me-2"></div>Loading...
                                        </td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="pagination" class="mt-3"></div>
                        </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
        },

        bindEvents: function () {
            console.log('SalesDeliveryOrdersPage: Binding events...');
            const self = this;

            // Clean up first
            this.cleanup();

            // Filters with debounce
            let filterTimeout;
            $('#filterStatus, #filterCustomer, #filterWarehouse, #filterDateFrom, #filterDateTo')
                .on('change.deliveryorders', function() {
                    console.log('Filter changed:', $(this).attr('id'), '=', $(this).val());
                    clearTimeout(filterTimeout);
                    filterTimeout = setTimeout(() => {
                        self.loadData();
                    }, 300);
                });

            // Reset Filters
            $('#resetFilters').on('click.deliveryorders', function () {
                console.log('Resetting filters...');
                $('#filterStatus, #filterCustomer, #filterWarehouse').val('');
                $('#filterDateFrom, #filterDateTo').val('');
                self.loadData();
            });
   $('#createStandaloneDOBtn').on('click.deliveryorders', function () {
        console.log('Create Standalone DO clicked');
        TempleRouter.navigate('sales/delivery-orders/create');
    });

            // View DO - Using event delegation properly
            $(document).on('click.deliveryorders', '.view-do-btn', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                console.log('View DO clicked, ID:', id);
                if (id) {
                    TempleRouter.navigate('sales/delivery-orders/view', { id: id });
                } else {
                    console.error('No ID found for delivery order');
                }
            });

            // Quality Check
            $(document).on('click.deliveryorders', '.quality-check-btn', function (e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('Quality check clicked, ID:', id);
                self.showQualityCheckModal(id);
            });

            // Complete DO
            $(document).on('click.deliveryorders', '.complete-do-btn', function (e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('Complete DO clicked, ID:', id);
                self.completeDO(id);
            });

            // Cancel DO
            $(document).on('click.deliveryorders', '.cancel-do-btn', function (e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('Cancel DO clicked, ID:', id);
                self.cancelDO(id);
            });

            // Delete DO
            $(document).on('click.deliveryorders', '.delete-do-btn', function (e) {
                e.preventDefault();
                const id = $(this).data('id');
                console.log('Delete DO clicked, ID:', id);
                self.deleteDO(id);
            });
        },

loadStatistics: function () {
    console.log('SalesDeliveryOrdersPage: Loading statistics...');
    
    // Set defaults immediately
    $('#totalDOs').text('0');
    $('#pendingQuality').text('0');
    $('#completedDOs').text('0');
    $('#totalValue').text('RM 0.00');
    
    // Try to load from API, but don't show errors if it fails
    TempleAPI.get('/sales/delivery-orders/statistics/overview')
        .done((response) => {
            console.log('Statistics loaded:', response);
            if (response.success && response.data) {
                const stats = response.data;
                $('#totalDOs').text(stats.total_dos || 0);
                $('#pendingQuality').text(stats.pending_quality || 0);
                $('#completedDOs').text(stats.completed || 0);
                
                // Use TempleCore if available, otherwise format manually
                const totalValue = stats.total_value || 0;
                if (typeof TempleCore !== 'undefined' && TempleCore.formatCurrency) {
                    $('#totalValue').text(TempleCore.formatCurrency(totalValue));
                } else {
                    $('#totalValue').text('RM ' + parseFloat(totalValue).toFixed(2));
                }
            }
        })
                .fail((xhr) => {
                    console.error('Failed to load statistics:', xhr);
                    // Set defaults on error
                    $('#totalDOs').text('0');
                    $('#pendingQuality').text('0');
                    $('#completedDOs').text('0');
                    $('#totalValue').text('RM 0.00');
                });
        },

        loadCustomers: function () {
            console.log('SalesDeliveryOrdersPage: Loading customers...');
            
            TempleAPI.get('/sales/devotees/active')
                .done((response) => {
                    console.log('Customers loaded:', response);
                    let options = '<option value="">All Customers</option>';
                    if (response.success && response.data) {
                        response.data.forEach(d => {
                            options += `<option value="${d.id}">${d.customer_name}</option>`;
                        });
                    }
                    $('#filterCustomer').html(options);
                })
                .fail((xhr) => {
                    console.error('Failed to load customers:', xhr);
                    $('#filterCustomer').html('<option value="">All Customers</option>');
                });
        },

        loadWarehouses: function () {
            console.log('SalesDeliveryOrdersPage: Loading warehouses...');
            
            // Try multiple endpoints
            const endpoints = [
                '/sales/delivery-orders/warehouses/active',
                '/inventory/warehouses/active',
                '/sales/warehouses/active'
            ];
            
            const tryEndpoint = (index) => {
                if (index >= endpoints.length) {
                    console.error('All warehouse endpoints failed');
                    $('#filterWarehouse').html('<option value="">All Warehouses</option>');
                    return;
                }
                
                TempleAPI.get(endpoints[index])
                    .done((response) => {
                        console.log('Warehouses loaded from', endpoints[index], ':', response);
                        let options = '<option value="">All Warehouses</option>';
                        if (response.success && response.data) {
                            response.data.forEach(w => {
                                const name = w.name || w.warehouse_name || w.warehouse_code;
                                options += `<option value="${w.id}">${name}</option>`;
                            });
                        }
                        $('#filterWarehouse').html(options);
                    })
                    .fail((xhr) => {
                        console.warn('Failed endpoint', endpoints[index], '- trying next...');
                        tryEndpoint(index + 1);
                    });
            };
            
            tryEndpoint(0);
        },

        loadData: function (page = 1) {
            console.log('SalesDeliveryOrdersPage: Loading data for page', page);
            const self = this;
            
            const params = {
                page: page,
                per_page: 50,
                status: $('#filterStatus').val(),
                devotee_id: $('#filterCustomer').val(),
                warehouse_id: $('#filterWarehouse').val(),
                date_from: $('#filterDateFrom').val(),
                date_to: $('#filterDateTo').val(),
            };

            // Remove empty parameters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            console.log('Request params:', params);

            // Show loading state
            $('#doTableBody').html(`
                <tr><td colspan="9" class="text-center">
                    <div class="spinner-border spinner-border-sm me-2"></div>Loading delivery orders...
                </td></tr>
            `);

            TempleAPI.get('/sales/delivery-orders', params)
                .done((response) => {
                    console.log('Delivery orders loaded:', response);
                    if (response.success) {
                        self.renderTable(response.data);
                    } else {
                        $('#doTableBody').html(`
                            <tr><td colspan="9" class="text-center text-danger">
                                Error: ${response.message || 'Unknown error'}
                            </td></tr>
                        `);
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast(response.message || 'Failed to load delivery orders', 'error');
                        }
                    }
                })
                .fail((xhr) => {
                    console.error('Failed to load delivery orders:', xhr);
                    let errorMsg = 'Failed to load delivery orders';
                    if (xhr.responseJSON?.message) {
                        errorMsg = xhr.responseJSON.message;
                    } else if (xhr.statusText) {
                        errorMsg = xhr.statusText;
                    }
                    
                    $('#doTableBody').html(`
                        <tr><td colspan="9" class="text-center text-danger">
                            ${errorMsg}<br>
                            <small class="text-muted">Check console for details (F12)</small>
                        </td></tr>
                    `);
                    
                    if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                        TempleCore.showToast(errorMsg, 'error');
                    }
                });
        },

        renderTable: function (data) {
            console.log('SalesDeliveryOrdersPage: Rendering table with', data?.data?.length || 0, 'records');
            const self = this;
            let html = '';

            if (!data || !data.data || data.data.length === 0) {
                html = '<tr><td colspan="9" class="text-center">No delivery orders found</td></tr>';
                $('#doTableBody').html(html);
                $('#pagination').empty();
                return;
            }

            data.data.forEach(doRecord => {
                const statusBadge = self.getStatusBadge(doRecord.status);
                const qualityBadge = self.getQualityBadge(doRecord);
                const actions = self.getActions(doRecord);

                // Helper function for date formatting
                const formatDate = (date) => {
                    if (!date) return '-';
                    if (typeof TempleCore !== 'undefined' && TempleCore.formatDate) {
                        return TempleCore.formatDate(date);
                    }
                    return moment(date).format('DD/MM/YYYY');
                };

                // Helper function for currency formatting
                const formatCurrency = (amount) => {
                    if (typeof TempleCore !== 'undefined' && TempleCore.formatCurrency) {
                        return TempleCore.formatCurrency(amount);
                    }
                    return 'RM ' + parseFloat(amount || 0).toFixed(2);
                };

                html += `
                    <tr data-id="${doRecord.id}">
                        <td><strong>${doRecord.do_number || '-'}</strong></td>
                        <td>${formatDate(doRecord.do_date)}</td>
                        <td>${doRecord.sales_order?.so_number || doRecord.so_number || '-'}</td>
                        <td>${doRecord.devotee?.customer_name || doRecord.customer_name || '-'}</td>
                        <td>${doRecord.warehouse?.name || doRecord.warehouse?.warehouse_name || doRecord.warehouse_name || '-'}</td>
                        <td>${formatCurrency(doRecord.total_amount)}</td>
                        <td>${qualityBadge}</td>
                        <td>${statusBadge}</td>
                        <td>${actions}</td>
                    </tr>
                `;
            });

            $('#doTableBody').html(html);
            self.renderPagination(data);
        },

        renderPagination: function (data) {
            if (!data || data.total <= data.per_page) {
                $('#pagination').empty();
                return;
            }
            
            let html = `<nav><ul class="pagination justify-content-end">`;
            if (data.prev_page_url) {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a></li>`;
            }
            html += `<li class="page-item disabled"><a class="page-link">Page ${data.current_page} of ${data.last_page}</a></li>`;
            if (data.next_page_url) {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a></li>`;
            }
            html += `</ul></nav>`;

            $('#pagination').html(html);
            $('#pagination .page-link').on('click', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    window.SalesDeliveryOrdersPage.loadData(page);
                }
            });
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'PENDING': '<span class="badge bg-info">Pending</span>',
                'QUALITY_CHECK': '<span class="badge bg-warning">Quality Check</span>',
                'COMPLETED': '<span class="badge bg-success">Completed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>',
            };
            return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
        },

        getQualityBadge: function (doRecord) {
            if (!doRecord.quality_check_done) {
                return '<span class="badge bg-secondary">Pending</span>';
            }
            const badges = {
                'PASSED': '<span class="badge bg-success">Passed</span>',
                'FAILED': '<span class="badge bg-danger">Failed</span>',
                'PARTIAL': '<span class="badge bg-warning">Partial</span>',
            };
            return badges[doRecord.quality_check_status] || '<span class="badge bg-secondary">N/A</span>';
        },

        getActions: function (doRecord) {
            let actions = `
                <button class="btn btn-sm btn-info view-do-btn" data-id="${doRecord.id}" title="View">
                    <i class="bi bi-eye"></i>
                </button>
            `;

            if (!doRecord.quality_check_done && doRecord.status !== 'CANCELLED' && doRecord.status !== 'COMPLETED') {
                actions += `
                    <button class="btn btn-sm btn-warning quality-check-btn" data-id="${doRecord.id}" title="Quality Check">
                        <i class="bi bi-clipboard-check"></i>
                    </button>
                `;
            }

            if ((doRecord.status === 'QUALITY_CHECK' || (doRecord.status === 'DRAFT' && doRecord.quality_check_done)) && doRecord.status !== 'COMPLETED') {
                actions += `
                    <button class="btn btn-sm btn-success complete-do-btn" data-id="${doRecord.id}" title="Complete">
                        <i class="bi bi-check-circle"></i>
                    </button>
                `;
            }

            if (doRecord.status !== 'COMPLETED' && doRecord.status !== 'CANCELLED') {
                actions += `
                    <button class="btn btn-sm btn-danger cancel-do-btn" data-id="${doRecord.id}" title="Cancel">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `;
            }

            if (doRecord.status === 'DRAFT') {
                actions += `
                    <button class="btn btn-sm btn-danger delete-do-btn" data-id="${doRecord.id}" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
            }

            return actions;
        },

        showQualityCheckModal: function (doId) {
            const self = this;
            console.log('Loading DO for quality check:', doId);
            
            // Load DO details first
            TempleAPI.get(`/sales/delivery-orders/${doId}`)
                .done((response) => {
                    if (response.success) {
                        self.renderQualityCheckModal(response.data);
                    } else {
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Failed to load delivery order details', 'error');
                        } else {
                            alert('Failed to load delivery order details');
                        }
                    }
                })
                .fail((xhr) => {
                    console.error('Failed to load DO:', xhr);
                    if (typeof TempleCore !== 'undefined' && TempleCore.handleAjaxError) {
                        TempleCore.handleAjaxError(xhr);
                    } else {
                        alert('Failed to load delivery order details');
                    }
                });
        },

        renderQualityCheckModal: function (doRecord) {
            const self = this;
            console.log('Rendering quality check modal for:', doRecord);
            
            let itemsHtml = '';
            if (doRecord.items && doRecord.items.length > 0) {
                doRecord.items.forEach((item, index) => {
                    itemsHtml += `
                        <tr>
                            <td>${item.description || item.item_name || '-'}</td>
                            <td>${item.delivered_quantity || item.quantity || 0}</td>
                            <td>
                                <input type="number" class="form-control form-control-sm accepted-qty" 
                                       data-index="${index}" 
                                       data-item-id="${item.id}"
                                       value="${item.delivered_quantity || item.quantity || 0}" 
                                       min="0" 
                                       max="${item.delivered_quantity || item.quantity || 0}" 
                                       step="0.001">
                            </td>
                            <td>
                                <input type="number" class="form-control form-control-sm rejected-qty" 
                                       data-index="${index}"
                                       value="0" 
                                       min="0" 
                                       max="${item.delivered_quantity || item.quantity || 0}" 
                                       step="0.001" 
                                       readonly>
                            </td>
                            <td>
                                <select class="form-select form-select-sm condition-select" data-index="${index}">
                                    <option value="GOOD">Good</option>
                                    <option value="DAMAGED">Damaged</option>
                                    <option value="DEFECTIVE">Defective</option>
                                </select>
                            </td>
                            <td>
                                <textarea class="form-control form-control-sm rejection-reason" 
                                          data-index="${index}" 
                                          rows="1" 
                                          placeholder="Reason..."></textarea>
                            </td>
                        </tr>
                    `;
                });
            }

            const modalHtml = `
                <div class="modal fade" id="qualityCheckModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Quality Check - ${doRecord.do_number}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Quality Check Date *</label>
                                        <input type="date" class="form-control" id="qualityCheckDate" 
                                               value="${new Date().toISOString().split('T')[0]}" required>
                                    </div>
                                </div>

                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Delivered Qty</th>
                                                <th>Accepted Qty *</th>
                                                <th>Rejected Qty</th>
                                                <th>Condition *</th>
                                                <th>Rejection Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody id="qualityCheckItems">
                                            ${itemsHtml}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Quality Notes</label>
                                    <textarea class="form-control" id="qualityNotes" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveQualityCheck">Save Quality Check</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if present
            $('#qualityCheckModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('qualityCheckModal'));
            modal.show();

            // Auto-calculate rejected quantity
            $(document).off('input.qcmodal').on('input.qcmodal', '.accepted-qty', function () {
                const index = $(this).data('index');
                const deliveredQty = parseFloat(doRecord.items[index].delivered_quantity || doRecord.items[index].quantity || 0);
                const acceptedQty = parseFloat($(this).val()) || 0;
                const rejectedQty = deliveredQty - acceptedQty;
                $(`.rejected-qty[data-index="${index}"]`).val(rejectedQty.toFixed(3));
            });

            // Save quality check
            $(document).off('click.qcmodal').on('click.qcmodal', '#saveQualityCheck', function () {
                self.performQualityCheck(doRecord.id, doRecord.items);
            });
        },

        performQualityCheck: function (doId, items) {
            const self = this;
            console.log('Performing quality check for DO:', doId);
            
            // Collect quality check data
            const itemsData = items.map((item, index) => {
                return {
                    id: $(`.accepted-qty[data-index="${index}"]`).data('item-id'),
                    accepted_quantity: parseFloat($(`.accepted-qty[data-index="${index}"]`).val()) || 0,
                    rejected_quantity: parseFloat($(`.rejected-qty[data-index="${index}"]`).val()) || 0,
                    condition: $(`.condition-select[data-index="${index}"]`).val(),
                    rejection_reason: $(`.rejection-reason[data-index="${index}"]`).val()
                };
            });

            const data = {
                quality_check_date: $('#qualityCheckDate').val(),
                quality_notes: $('#qualityNotes').val(),
                items: itemsData
            };

            console.log('Quality check data:', data);

            TempleAPI.post(`/sales/delivery-orders/${doId}/quality-check`, data)
                .done((response) => {
                    console.log('Quality check response:', response);
                    if (response.success) {
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Quality check completed successfully', 'success');
                        } else {
                            alert('Quality check completed successfully');
                        }
                        $('#qualityCheckModal').modal('hide');
                        self.loadData();
                        self.loadStatistics();
                    }
                })
                .fail((xhr) => {
                    console.error('Quality check failed:', xhr);
                    if (typeof TempleCore !== 'undefined' && TempleCore.handleAjaxError) {
                        TempleCore.handleAjaxError(xhr);
                    } else {
                        alert('Failed to save quality check');
                    }
                });
        },

        completeDO: function (doId) {
            const self = this;
            console.log('Completing DO:', doId);
            
            if (confirm('Complete Delivery Order? This will mark the delivery order as completed.')) {
                TempleAPI.post(`/sales/delivery-orders/${doId}/complete`)
                    .done((response) => {
                        if (response.success) {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Delivery order completed successfully', 'success');
                            } else {
                                alert('Delivery order completed successfully');
                            }
                            self.loadData();
                            self.loadStatistics();
                        }
                    })
                    .fail((xhr) => {
                        console.error('Failed to complete DO:', xhr);
                        if (typeof TempleCore !== 'undefined' && TempleCore.handleAjaxError) {
                            TempleCore.handleAjaxError(xhr);
                        } else {
                            alert('Failed to complete delivery order');
                        }
                    });
            }
        },

        cancelDO: function (doId) {
            const self = this;
            console.log('Cancelling DO:', doId);
            
            const reason = prompt('Please provide a reason for cancellation:');
            if (reason) {
                TempleAPI.post(`/sales/delivery-orders/${doId}/cancel`, { reason })
                    .done((response) => {
                        if (response.success) {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Delivery order cancelled successfully', 'success');
                            } else {
                                alert('Delivery order cancelled successfully');
                            }
                            self.loadData();
                            self.loadStatistics();
                        }
                    })
                    .fail((xhr) => {
                        console.error('Failed to cancel DO:', xhr);
                        if (typeof TempleCore !== 'undefined' && TempleCore.handleAjaxError) {
                            TempleCore.handleAjaxError(xhr);
                        } else {
                            alert('Failed to cancel delivery order');
                        }
                    });
            }
        },

        deleteDO: function (doId) {
            const self = this;
            console.log('Deleting DO:', doId);
            
            if (confirm('Delete Delivery Order? This action cannot be undone. The delivery quantities will be reversed in the sales order.')) {
                TempleAPI.delete(`/sales/delivery-orders/${doId}`)
                    .done((response) => {
                        if (response.success) {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Delivery order deleted successfully', 'success');
                            } else {
                                alert('Delivery order deleted successfully');
                            }
                            self.loadData();
                            self.loadStatistics();
                        }
                    })
                    .fail((xhr) => {
                        console.error('Failed to delete DO:', xhr);
                        if (typeof TempleCore !== 'undefined' && TempleCore.handleAjaxError) {
                            TempleCore.handleAjaxError(xhr);
                        } else {
                            alert('Failed to delete delivery order');
                        }
                    });
            }
        },

        cleanup: function () {
            console.log('SalesDeliveryOrdersPage: Cleaning up...');
            
            // Unbind all namespaced events
            $(document).off('.deliveryorders');
            $(document).off('.qcmodal');
               $('#createStandaloneDOBtn').off('click.deliveryorders'); 
            $('#filterStatus, #filterCustomer, #filterWarehouse, #filterDateFrom, #filterDateTo').off('change.deliveryorders');
            $('#resetFilters').off('click.deliveryorders');
            $('#pagination').off('click');
            
            // CRITICAL: Hide any loading overlays on cleanup
            this.hideLoadingSafe();
        }
    };

})(jQuery, window);