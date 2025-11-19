//js/pages/purchase/orders/index.js
// Purchase Order List Page with Icon Actions
(function ($, window) {
    'use strict';

    window.PurchaseOrdersPage = {
        permissions: {},
        currentUser: null,
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

            this.currentFilter = {
                status: '',
                supplier_id: '',
                date_from: '',
                date_to: '',
                payment_status: ''
            };

            this.render();
            this.loadData();
            this.bindEvents();
            this.loadPermissions();
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_purchase_orders: false,
                can_edit_purchase_orders: false,
                can_delete_purchase_orders: false,
                can_approve_purchase_orders: false,
                can_cancel_purchase_orders: false,
                can_purchase_orders_grn_create: false,
         

                can_view_purchase_orders: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_approve_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_cancel_purchase_orders: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_purchase_orders_grn_create: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_purchase_orders: true
                };
            }
        },
        render: function () {
            const self = this;
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Purchase Orders</h3>
                        </div>
                        <div class="col-md-6 text-end">
           

                            <button class="btn btn-primary" id="createPOBtn">
                                <i class="bi bi-plus-circle"></i> New Purchase Order
                            </button>
                
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6 class="text-muted">Total POs</h6>
                                            <h3 id="totalPOs">0</h3>
                                        </div>
                                        <div class="stat-icon primary">
                                            <i class="bi bi-file-text"></i>
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
                                        <div class="stat-icon warning">
                                            <i class="bi bi-clock-history"></i>
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
                                            <h3 id="totalValue">${self.formatCurrency(0)}</h3>
                                        </div>
                                        <div class="stat-icon success">
                                            <i class="bi bi-currency-dollar"></i>
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
                                            <h3 id="outstanding">${self.formatCurrency(0)}</h3>
                                        </div>
                                        <div class="stat-icon danger">
                                            <i class="bi bi-exclamation-triangle"></i>
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
                                        <option value="PENDING_APPROVAL">Pending Approval</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                        <option value="PARTIAL_RECEIVED">Partial Received</option>
                                        <option value="RECEIVED">Received</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="filterSupplier">
                                        <option value="">All Suppliers</option>
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
                                <div class="col-md-2">
                                    <label class="form-label">Payment Status</label>
                                    <select class="form-select" id="filterPaymentStatus">
                                        <option value="">All</option>
                                        <option value="UNPAID">Unpaid</option>
                                        <option value="PARTIAL">Partial</option>
                                        <option value="PAID">Paid</option>
                                    </select>
                                </div>
                                <div class="col-md-1 d-flex align-items-end">
                                    <button class="btn btn-secondary w-100" id="resetFilters">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="poTable">
                                    <thead>
                                        <tr>
                                            <th>PO Number</th>
                                            <th>Date</th>
                                            <th>Supplier</th>
                                            <th>Items</th>
                                            <th>Total Amount</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>GRN</th>
                                            <th width="200">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="poTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="pagination" class="mt-3"></div>
                        </div>
                    </div>
                </div>

                <!-- Custom CSS for action buttons -->
                <style>
                    .action-buttons {
                        display: flex;
                        gap: 5px;
                        flex-wrap: wrap;
                    }
                    
                    .action-btn {
                        padding: 4px 8px;
                        border-radius: 4px;
                        border: 1px solid transparent;
                        background-color: transparent;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .action-btn:hover {
                        transform: scale(1.1);
                    }
                    
                    .action-btn.btn-view {
                        color: #17a2b8;
                    }
                    .action-btn.btn-view:hover {
                        background-color: rgba(23, 162, 184, 0.1);
                        border-color: #17a2b8;
                    }
                    
                    .action-btn.btn-edit {
                        color: #007bff;
                    }
                    .action-btn.btn-edit:hover {
                        background-color: rgba(0, 123, 255, 0.1);
                        border-color: #007bff;
                    }
                    
                    .action-btn.btn-approve {
                        color: #28a745;
                    }
                    .action-btn.btn-approve:hover {
                        background-color: rgba(40, 167, 69, 0.1);
                        border-color: #28a745;
                    }
                    
                    .action-btn.btn-reject {
                        color: #dc3545;
                    }
                    .action-btn.btn-reject:hover {
                        background-color: rgba(220, 53, 69, 0.1);
                        border-color: #dc3545;
                    }
                    
                    .action-btn.btn-submit {
                        color: #6610f2;
                    }
                    .action-btn.btn-submit:hover {
                        background-color: rgba(102, 16, 242, 0.1);
                        border-color: #6610f2;
                    }
                    
                    .action-btn.btn-invoice {
                        color: #fd7e14;
                    }
                    .action-btn.btn-invoice:hover {
                        background-color: rgba(253, 126, 20, 0.1);
                        border-color: #fd7e14;
                    }
                    
                    .action-btn.btn-grn {
                        color: #20c997;
                    }
                    .action-btn.btn-grn:hover {
                        background-color: rgba(32, 201, 151, 0.1);
                        border-color: #20c997;
                    }
                    
            
                    
                    .action-btn.btn-delete {
                        color: #dc3545;
                    }
                    .action-btn.btn-delete:hover {
                        background-color: rgba(220, 53, 69, 0.1);
                        border-color: #dc3545;
                    }
                </style>
            `;

            $('#page-container').html(html);
            this.loadSuppliers();
        },

        loadSuppliers: function () {
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Suppliers</option>';
                        $.each(response.data.data, function (i, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#filterSupplier').html(options);
                    }
                });
        },

        loadData: function (page = 1) {
            const self = this;

            const params = {
                page: page,
                per_page: 50,
                ...this.currentFilter
            };

            TempleAPI.get('/purchase/orders', params)
                .done(function (response) {
                    if (response.success) {
                        if (response.permissions) {
                            self.permissions = response.permissions;
                        }
                        self.renderTable(response.data);
                        self.updateSummary(response.summary);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load purchase orders', 'error');
                });
            TempleAPI.get('/purchase/orders/statistics')
                .done(function (response) {
                    if (response.success) {
                        $('#totalPOs').text(response.data.total_pos);
                        $('#pendingApproval').text(response.data.pending_approval);
                        $('#totalValue').text(
                            self.formatCurrency(parseFloat(response.data.total_value || 0).toFixed(2))
                        );

                        $('#outstanding').text(
                            self.formatCurrency(parseFloat(response.data.outstanding_amount || 0).toFixed(2))
                        );
                    }
                });
        },

        renderTable: function (data) {
            const self = this;
            const tbody = $('#poTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="9" class="text-center">No records found</td></tr>');
                return;
            }

            let html = '';
            $.each(data.data, function (index, po) {
                const statusBadge = PurchaseOrdersPage.getStatusBadge(po.status);
                const paymentBadge = PurchaseOrdersPage.getPaymentBadge(po.payment_status);
                const grnBadge = PurchaseOrdersPage.getGRNBadge(po.grn_status);
                const user = TempleCore.getUser();
                let approvalInfo = '';
                if (po.status === 'APPROVED') { // or whatever value your status uses
                    approvalInfo = `
                  <small class="text-muted">${po.approver?.name || '-'}</small><br>
            <small class="text-muted">${po.approved_at ? TempleCore.formatDate(po.approved_at, 'time') : '-'}</small>
        `;
                }
                html += `
                    <tr data-id="${po.id}">
                        <td><strong>${po.po_number}</strong></td>
                        <td>${moment(po.po_date).format('DD/MM/YYYY')}</td>
                        <td>${po.supplier?.name || 'N/A'}</td>
                        <td>${po.items?.length || 0}</td>
<td><strong>${self.formatCurrency(parseFloat(po.total_amount).toFixed(2))}</strong></td>
                        <td>${statusBadge}<br>
                                        ${approvalInfo}

                        </td>
                        <td>${paymentBadge}</td>
                        <td>${grnBadge}</td>
                        <td>
                            <div class="action-buttons">
                                ${self.permissions.can_view_purchase_orders ? `
                                <button class="action-btn btn-view view-po" title="View" data-bs-toggle="tooltip">
                                    <i class="bi bi-eye"></i>
                                </button>` : ''}
                                 <button class="action-btn btn-print print-po" title="Print" data-bs-toggle="tooltip">
    <i class="bi bi-printer"></i>
</button>
                `;

                // Add conditional action icons
                if (po.status === 'DRAFT' && self.permissions.can_edit_purchase_orders) {
                    html += `
                        <button class="action-btn btn-edit edit-po" title="Edit" data-bs-toggle="tooltip">
                            <i class="bi bi-pencil"></i>
                        </button>`;

                }
                 if (self.permissions.can_approve_purchase_orders) {
                html += `   <button class="action-btn btn-submit submit-approval" title="Submit for Approval" data-bs-toggle="tooltip">
                            <i class="bi bi-send"></i>
                        </button>
                    `;
                 }


                if (po.status === 'PENDING_APPROVAL' && self.permissions.can_approve_purchase_orders) {
                    html += `
                        <button class="action-btn btn-approve approve-po" title="Approve" data-bs-toggle="tooltip">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button class="action-btn btn-reject reject-po" title="Reject" data-bs-toggle="tooltip">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    `;
                }

                // if (po.status === 'APPROVED' && po.invoice_status !== 'INVOICED') {
                //     html += `
                //         <button class="action-btn btn-invoice create-invoice" title="Create Invoice" data-bs-toggle="tooltip">
                //             <i class="bi bi-receipt"></i>
                //         </button>
                //     `;
                // }

                if (po.status === 'APPROVED' && po.grn_status !== 'RECEIVED' && self.permissions.can_purchase_orders_grn_create) {
                    html += `
                        <button class="action-btn btn-grn create-grn" title="Create GRN" data-bs-toggle="tooltip">
                            <i class="bi bi-box-seam"></i>
                        </button>
                    `;
                }



                // Add delete button only for draft status
                if (po.status === 'DRAFT' && self.permissions.can_delete_purchase_orders) {
                    html += `
                        <button class="action-btn btn-delete delete-po" title="Delete" data-bs-toggle="tooltip">
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

            tbody.html(html);

            // Initialize tooltips
            $('[data-bs-toggle="tooltip"]').tooltip();

            this.renderPagination(data);
        },

        updateSummary: function (summary) {
            if (summary) {
                $('#totalPOs').text(summary.total_count || 0);
                $('#pendingApproval').text(summary.pending_approval || 0);
                $('#totalValue').text(self.formatCurrency(summary.total_value || 0).toFixed(2));
                $('#outstanding').text(self.formatCurrency(summary.total_value || 0).toFixed(2));
            }
        },

        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'PENDING_APPROVAL': '<span class="badge bg-warning">Pending</span>',
                'APPROVED': '<span class="badge bg-success">Approved</span>',
                'REJECTED': '<span class="badge bg-danger">Rejected</span>',
                'PARTIAL_RECEIVED': '<span class="badge bg-info">Partial</span>',
                'RECEIVED': '<span class="badge bg-primary">Received</span>',
                'CANCELLED': '<span class="badge bg-dark">Cancelled</span>'
            };
            return badges[status] || status;
        },

        getPaymentBadge: function (status) {
            const badges = {
                'UNPAID': '<span class="badge bg-danger">Unpaid</span>',
                'PARTIAL': '<span class="badge bg-warning">Partial</span>',
                'PAID': '<span class="badge bg-success">Paid</span>'
            };
            return badges[status] || '-';
        },

        getGRNBadge: function (status) {
            const badges = {
                'PENDING': '<span class="badge bg-warning">Pending</span>',
                'PARTIAL': '<span class="badge bg-info">Partial</span>',
                'RECEIVED': '<span class="badge bg-success">Received</span>'
            };
            return badges[status] || '-';
        },

        bindEvents: function () {
            const self = this;

            // Create new PO
            $('#createPOBtn').on('click', function () {
                TempleRouter.navigate('purchase/orders/create');
            });

            // Filter events
            $('#filterStatus, #filterSupplier, #filterDateFrom, #filterDateTo, #filterPaymentStatus')
                .on('change', function () {
                    self.currentFilter.status = $('#filterStatus').val();
                    self.currentFilter.supplier_id = $('#filterSupplier').val();
                    self.currentFilter.date_from = $('#filterDateFrom').val();
                    self.currentFilter.date_to = $('#filterDateTo').val();
                    self.currentFilter.payment_status = $('#filterPaymentStatus').val();
                    self.loadData();
                });

            // Reset filters
            $('#resetFilters').on('click', function () {
                $('#filterStatus, #filterSupplier, #filterDateFrom, #filterDateTo, #filterPaymentStatus').val('');
                self.currentFilter = {};
                self.loadData();
            });

            // Table action buttons
            $(document).on('click', '.view-po', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/orders/view', { id: id });
            });


            $(document).on('click', '.print-po', function () {
                const id = $(this).closest('tr').data('id');
                self.printPO(id);
            });


            $(document).on('click', '.edit-po', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/orders/edit', { id: id });
            });

            $(document).on('click', '.submit-approval', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                self.submitForApproval(id);
            });

            $(document).on('click', '.approve-po', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                self.approvePO(id);
            });

            $(document).on('click', '.reject-po', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                self.rejectPO(id);
            });

            // $(document).on('click', '.create-invoice', function (e) {
            //     e.preventDefault();
            //     const id = $(this).closest('tr').data('id');
            //     // Navigate with query parameter for PO-based invoice
            //     window.location.href = '/' + TempleAPI.getTempleId() + '/purchase/invoices/create?po_id=' + id;
            // });

            $(document).on('click', '.create-grn', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/grn/create', { po_id: id });
            });



            $(document).on('click', '.delete-po', function (e) {
                e.preventDefault();
                const id = $(this).closest('tr').data('id');
                self.deletePO(id);
            });
        },


        printPO: function (poid) {
            const templeId = TempleAPI.getTempleId();
            const printUrl = '/' + templeId + '/purchase/orders/print/' + poid;
            window.open(printUrl, '_blank');
        },
        submitForApproval: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Submit for Approval',
                'Are you sure you want to submit this PO for approval?',
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.post(`/purchase/orders/${id}/submit`)
                        .done(function (response) {
                            if (response.success) {
                                let message = 'PO submitted for approval';
                                if (response.data && response.data.invoice_number) {
                                    message += ` and Invoice ${response.data.invoice_number} created`;
                                }
                                TempleCore.showToast(message, 'success');
                                self.loadData();
                            }
                        })
                        .fail(function (xhr) {
                            const error = xhr.responseJSON?.message || 'Failed to submit PO';
                            TempleCore.showToast(error, 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },
        approvePO: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Approve Purchase Order',
                'Are you sure you want to approve this PO? An invoice will be automatically created.',
                function () {
                    TempleAPI.post(`/purchase/orders/${id}/approve`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('PO approved successfully', 'success');
                                self.loadData();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to approve PO', 'error');
                        });
                }
            );
        },

        rejectPO: function (id) {
            const self = this;

            // Show modal to get rejection reason
            const reasonModal = `
                <div class="modal fade" id="rejectModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reject Purchase Order</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label class="form-label">Rejection Reason</label>
                                    <textarea class="form-control" id="rejectionReason" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmReject">Reject PO</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(reasonModal);
            const modal = new bootstrap.Modal(document.getElementById('rejectModal'));
            modal.show();

            $('#confirmReject').on('click', function () {
                const reason = $('#rejectionReason').val();
                if (!reason) {
                    TempleCore.showToast('Please provide a rejection reason', 'warning');
                    return;
                }

                TempleAPI.post(`/purchase/orders/${id}/reject`, { rejection_reason: reason })  // <- Changed here
                    .done(function (response) {
                        if (response.success) {
                            TempleCore.showToast('PO rejected', 'success');
                            modal.hide();
                            $('#rejectModal').remove();
                            self.loadData();
                        }
                    })
                    .fail(function () {
                        TempleCore.showToast('Failed to reject PO', 'error');
                    });
            });

            $('#rejectModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },



        deletePO: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Purchase Order',
                'Are you sure you want to delete this PO? This action cannot be undone.',
                function () {
                    TempleAPI.delete(`/purchase/orders/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('PO deleted successfully', 'success');
                                self.loadData();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete PO', 'error');
                        });
                }
            );
        },

        renderPagination: function (data) {
            if (!data || data.total <= data.per_page) {
                $('#pagination').empty();
                return;
            }

            const currentPage = data.current_page;
            const lastPage = data.last_page;
            let html = '<nav><ul class="pagination justify-content-center">';

            // Previous button
            html += `
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
                </li>
            `;

            // Page numbers
            for (let i = 1; i <= lastPage; i++) {
                if (i === 1 || i === lastPage || (i >= currentPage - 2 && i <= currentPage + 2)) {
                    html += `
                        <li class="page-item ${i === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === currentPage - 3 || i === currentPage + 3) {
                    html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                }
            }

            // Next button
            html += `
                <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
                </li>
            `;

            html += '</ul></nav>';
            $('#pagination').html(html);

            // Bind pagination events
            const self = this;
            $('#pagination .page-link').on('click', function (e) {
                e.preventDefault();
                if (!$(this).parent().hasClass('disabled')) {
                    const page = $(this).data('page');
                    self.loadData(page);
                }
            });
        },
        formatCurrency: function (amount) {
            return TempleCore.formatCurrency(amount);
        },


    };
})(jQuery, window);