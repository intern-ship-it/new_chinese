// js/pages/sales/orders.js
// Sales Orders List Page
(function ($, window) {
    'use strict';

    window.SalesOrdersPage = {
        permissions: {},
        currentUser: null,
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.currentFilter = {
                status: '',
                devotee_id: '',
                date_from: '',
                date_to: ''
            };
            this.permissions = {
                can_create: true,
                can_edit: true,
                can_delete: true,
                can_approve: true,
                can_view: true
            };

            this.render();
            this.loadData();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Sales Orders</h3>
                        </div>
                
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="createSOBtn">
                                <i class="bi bi-plus-circle"></i> Create Sales Order
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
                                            <h6 class="text-muted">Total SOs</h6>
                                            <h3 id="totalSOs">0</h3>
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
                                            <h6 class="text-muted">Pending Approval</h6>
                                            <h3 id="pendingApproval">0</h3>
                                        </div>
                                        <div class="stat-icon text-warning">
                                            <i class="bi bi-clock-history fs-1"></i>
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
                                            <h3 id="totalValue">0.00</h3>
                                        </div>
                                        <div class="stat-icon text-success">
                                            <i class="bi bi-currency-dollar fs-1"></i>
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
                                            <h6 class="text-muted">Outstanding</h6>
                                            <h3 id="outstandingAmount">0.00</h3>
                                        </div>
                                        <div class="stat-icon text-danger">
                                            <i class="bi bi-exclamation-triangle fs-1"></i>
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
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="PENDING_APPROVAL">Pending Approval</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Customer</label>
                                    <select class="form-select" id="filterCustomer">
                                        <option value="">All Customers</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                     <label class="form-label">Search</label>
                                     <input type="text" class="form-control" id="filterSearch" placeholder="SO Number...">
                                </div>
                                <div class="col-md-2 d-flex align-items-end">
                                    <button class="btn btn-secondary w-100" id="resetFilters">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="soTable">
                                    <thead>
                                        <tr>
                                            <th>SO Number</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Total Amount</th>
                                            <th>Status</th>
                                            <th width="200">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="soTableBody">
                                        <tr><td colspan="6" class="text-center">Loading...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="pagination" class="mt-3"></div>
                        </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
            this.loadCustomers();
        },

        loadCustomers: function () {
            TempleAPI.get('/sales/devotees/active').done((response) => {
                let options = '<option value="">All Customers</option>';
                if (response.success) {
                    response.data.forEach(d => {
                        options += `<option value="${d.id}">${d.customer_name}</option>`;
                    });
                }
                $('#filterCustomer').html(options);
            });
        },

        loadData: function (page = 1) {
            const self = this;
            const params = {
                page: page,
                per_page: 50,
                status: $('#filterStatus').val(),
                devotee_id: $('#filterCustomer').val(),
                search: $('#filterSearch').val()
            };

            TempleAPI.get('/sales/orders', params).done((response) => {
                if (response.success) {
                    self.renderTable(response.data);
                }
            }).fail(() => {
                if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                    TempleCore.showToast('Failed to load orders', 'error');
                }
            });

            // Load Statistics
            TempleAPI.get('/sales/orders/statistics').done((response) => {
                console.log('Statistics Response:', response);
                if (response.success) {
                    $('#totalSOs').text(response.data.total_sos);
                    $('#pendingApproval').text(response.data.pending_approval);
                    $('#totalValue').text(parseFloat(response.data.total_value || 0).toFixed(2));
                    $('#outstandingAmount').text(parseFloat(response.data.outstanding_amount || 0).toFixed(2));
                } else {
                    console.error('Statistics API failed:', response);
                }
            }).fail((xhr) => {
                console.error('Statistics API error:', xhr.responseJSON);
            });
        },

        renderTable: function (data) {
            const self = this;
            const tbody = $('#soTableBody');
            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="6" class="text-center">No records found</td></tr>');
                return;
            }

            let html = '';
            data.data.forEach(so => {
                const statusBadge = self.getStatusBadge(so.status);
                let actions = `
                    <button class="btn btn-sm btn-info view-so" data-id="${so.id}" title="View"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-secondary print-so" data-id="${so.id}" title="Print"><i class="bi bi-printer"></i></button>
                `;

                if (so.status === 'DRAFT') {
                    actions += `<button class="btn btn-sm btn-primary edit-so" data-id="${so.id}" title="Edit"><i class="bi bi-pencil"></i></button>`;
                    actions += `
                        <button class="btn btn-sm btn-danger delete-so-btn" data-id="${so.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                    // Approve/Reject buttons for draft orders
                    actions += `
                        <button class="btn btn-sm btn-success approve-so" data-id="${so.id}" title="Approve"><i class="bi bi-check-circle"></i></button>
                        <button class="btn btn-sm btn-danger reject-so" data-id="${so.id}" title="Reject"><i class="bi bi-x-circle"></i></button>
                    `;
                }

                // Create DO and Invoice buttons for approved orders
                if (so.status === 'APPROVED') {
                    // DO button
                    actions += `
                        <button class="btn btn-sm btn-info create-do-btn" data-id="${so.id}" title="Create Delivery Order">
                            <i class="bi bi-truck"></i> DO
                        </button>
                    `;

                    // Invoice button - check if invoice already created
                     if (so.status === 'APPROVED') {
                        actions += `
                            <button class="btn btn-sm btn-primary create-invoice-btn" data-id="${so.id}" title="Create Invoice">
                                <i class="bi bi-file-earmark-text"></i> 
                            </button>
                        `;
                    }
                }

                html += `
                    <tr data-id="${so.id}">
                        <td>${so.so_number}</td>
                        <td>${moment(so.so_date).format('DD/MM/YYYY')}</td>
                        <td>${so.devotee?.customer_name || '-'}</td>
                        <td>${parseFloat(so.total_amount).toFixed(2)}</td>
                        <td>${statusBadge}</td>
                        <td>${actions}</td>
                    </tr>
                `;
            });
            tbody.html(html);
            self.renderPagination(data);
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'PENDING_APPROVAL': '<span class="badge bg-warning">Pending Approval</span>',
                'APPROVED': '<span class="badge bg-success">Approved</span>',
                'REJECTED': '<span class="badge bg-danger">Rejected</span>',
                'CANCELLED': '<span class="badge bg-dark">Cancelled</span>'
            };
            return badges[status] || status;
        },

        bindEvents: function () {
            const self = this;

            // Clean up previous event handlers to prevent duplicates
            this.cleanup();

            // Bind new events
            $('#createSOBtn').on('click', () => TempleRouter.navigate('sales/orders/create'));

            $('#filterStatus, #filterCustomer, #filterSearch').on('change keyup', () => self.loadData());
            $('#resetFilters').on('click', () => {
                $('#filterStatus, #filterCustomer, #filterSearch').val('');
                self.loadData();
            });

            $(document).on('click.salesorders', '.view-so', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('sales/orders/view', { id: id });
            });

            $(document).on('click.salesorders', '.edit-so', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('sales/orders/create', { id: id });
            });

            $(document).on('click.salesorders', '.print-so', function () {
                const id = $(this).closest('tr').data('id');
                self.printSO(id);
            });

            // Create DO button
            $(document).on('click.salesorders', '.create-do-btn', function () {
                const id = $(this).closest('tr').data('id');
                sessionStorage.setItem('create_do_so_id', id);
                TempleRouter.navigate('sales/delivery-orders/create-from-so', { id: id });
            });

            // ========================================
            // Create Invoice button - Navigate to conversion page
            // No confirmation needed since user will review on the conversion page
            // ========================================
            $(document).on('click.salesorders', '.create-invoice-btn', function () {
                const id = $(this).closest('tr').data('id');
                const soNumber = $(this).closest('tr').find('td:first').text();
                self.convertSOToInvoice(id, soNumber);
            });

            // View existing invoice button
            $(document).on('click.salesorders', '.view-invoice-btn', function () {
                const soId = $(this).data('so-id');

                // Show loading
                if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                    TempleCore.showLoading(true);
                }

                // Find and navigate to the invoice
                TempleAPI.get(`/sales/invoices`, { sales_order_id: soId })
                    .done((response) => {
                        if (response.success && response.data.data && response.data.data.length > 0) {
                            const invoiceId = response.data.data[0].id;
                            TempleRouter.navigate('sales/invoices/view', { id: invoiceId });
                        } else {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Invoice not found', 'error');
                            }
                        }
                    })
                    .fail(() => {
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Failed to find invoice', 'error');
                        }
                    })
                    .always(() => {
                        if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                            TempleCore.showLoading(false);
                        }
                    });
            });

            $(document).on('click.salesorders', '.approve-so', function () {
                const id = $(this).closest('tr').data('id');
                self.approveSO(id);
            });

            $(document).on('click.salesorders', '.reject-so', function () {
                const id = $(this).closest('tr').data('id');
                self.rejectSO(id);
            });

            $(document).on('click.salesorders', '.delete-so-btn', function () {
                const id = $(this).closest('tr').data('id');
                self.deleteSO(id);
            });
        },

        // ========================================
        // NEW METHOD: Navigate to Invoice Conversion Page
        // Instead of automatically converting, we navigate to a page
        // where users can review and edit the invoice before creation
        // ========================================
        convertSOToInvoice: function (soId, soNumber) {
            // Navigate to the conversion page with SO ID
            TempleRouter.navigate('sales/invoices/convert-from-so', { so_id: soId });
        },

        printSO: function (id) {
            const templeId = TempleAPI.getTempleId ? TempleAPI.getTempleId() : 'temple';
            window.open(`/${templeId}/sales/orders/print/${id}`, '_blank');
        },

        approveSO: function (id) {
            const self = this;
            if (typeof TempleCore !== 'undefined' && TempleCore.showConfirm) {
                TempleCore.showConfirm('Approve Order', 'Are you sure you want to approve this order?', () => {
                    TempleAPI.post(`/sales/orders/${id}/approve`)
                        .done((res) => {
                            if (res.success) {
                                if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                    TempleCore.showToast('Order Approved', 'success');
                                }
                                self.loadData();
                            }
                        })
                        .fail((xhr) => {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Failed to approve order', 'error');
                            }
                        });
                });
            } else {
                if (confirm('Are you sure you want to approve this order?')) {
                    TempleAPI.post(`/sales/orders/${id}/approve`)
                        .done((res) => {
                            if (res.success) {
                                alert('Order Approved');
                                self.loadData();
                            }
                        });
                }
            }
        },

        rejectSO: function (id) {
            const self = this;
            const reason = prompt("Enter rejection reason:");
            if (reason) {
                TempleAPI.post(`/sales/orders/${id}/reject`, { rejection_reason: reason })
                    .done((res) => {
                        if (res.success) {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Order Rejected', 'success');
                            } else {
                                alert('Order Rejected');
                            }
                            self.loadData();
                        }
                    })
                    .fail((xhr) => {
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Failed to reject order', 'error');
                        }
                    });
            }
        },

        deleteSO: function (id) {
            const self = this;
            if (typeof TempleCore !== 'undefined' && TempleCore.showConfirm) {
                TempleCore.showConfirm('Delete Order', 'Are you sure you want to delete this order?', () => {
                    TempleAPI.delete(`/sales/orders/${id}`)
                        .done((res) => {
                            if (res.success) {
                                if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                    TempleCore.showToast('Order Deleted', 'success');
                                }
                                self.loadData();
                            }
                        })
                        .fail((xhr) => {
                            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                                TempleCore.showToast('Failed to delete order', 'error');
                            }
                        });
                });
            } else {
                if (confirm('Are you sure you want to delete this order?')) {
                    TempleAPI.delete(`/sales/orders/${id}`)
                        .done((res) => {
                            if (res.success) {
                                alert('Order Deleted');
                                self.loadData();
                            }
                        });
                }
            }
        },

        renderPagination: function (data) {
            if (!data || data.total <= data.per_page) {
                $('#pagination').empty();
                return;
            }

            let html = `<nav><ul class="pagination justify-content-end">`;
            if (data.prev_page_url) html += `<li class="page-item"><a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a></li>`;
            html += `<li class="page-item disabled"><a class="page-link">Page ${data.current_page} of ${data.last_page}</a></li>`;
            if (data.next_page_url) html += `<li class="page-item"><a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a></li>`;
            html += `</ul></nav>`;

            $('#pagination').html(html);
            $('#pagination .page-link').on('click', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) window.SalesOrdersPage.loadData(page);
            });
        },

        cleanup: function () {
            // Unbind all namespaced events
            $(document).off('.salesorders');
            $('#createSOBtn').off('click');
            $('#filterStatus, #filterCustomer, #filterSearch').off('change keyup');
            $('#resetFilters').off('click');
        }
    };
})(jQuery, window);