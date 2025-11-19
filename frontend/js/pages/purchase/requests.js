// js/pages/purchase/requests/index.js
// Simplified Purchase Requests list page without status field

(function ($, window) {
    'use strict';

    window.PurchaseRequestsPage = {
        dataTable: null,
        selectedIds: [],
        permissions: {},
        currentUser: null,
        filters: {
            priority: '',
            date_from: '',
            date_to: '',
            converted: ''
        },

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadPermissions();
            this.render();
            this.bindEvents();
            this.loadRequests();
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_purchase_requests: false,
                can_edit_purchase_requests: false,
                can_delete_purchase_requests: false,
                can_convert_purchase_requests: false,
                can_view_purchase_requests: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_convert_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_purchase_requests: true
                };
            }
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Purchase Requests</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Purchase Requests</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            ${this.permissions.can_create_purchase_requests ? `

                            <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/requests/create'); return false;">
                                <i class="bi bi-plus-circle"></i> New Purchase Request
                            </button>    ` : ''}
                        </div>
                    </div>
                    
                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card border-left-primary">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="text-xs text-primary text-uppercase mb-1">Total Requests</div>
                                            <div class="h5 mb-0 font-weight-bold" id="statTotal">0</div>
                                        </div>
                                        <div class="text-primary">
                                            <i class="bi bi-file-text fs-2"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-left-warning">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="text-xs text-warning text-uppercase mb-1">Pending Conversion</div>
                                            <div class="h5 mb-0 font-weight-bold" id="statPending">0</div>
                                        </div>
                                        <div class="text-warning">
                                            <i class="bi bi-clock-history fs-2"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-left-success">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="text-xs text-success text-uppercase mb-1">Converted to PO</div>
                                            <div class="h5 mb-0 font-weight-bold" id="statConverted">0</div>
                                        </div>
                                        <div class="text-success">
                                            <i class="bi bi-cart-check fs-2"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6 class="card-title">Filters</h6>
                            <div class="row">
                                <div class="col-md-2">
                                    <label class="form-label">Priority</label>
                                    <select class="form-select form-select-sm" id="filterPriority">
                                        <option value="">All Priorities</option>
                                        <option value="LOW">Low</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Conversion Status</label>
                                    <select class="form-select form-select-sm" id="filterConverted">
                                        <option value="">All</option>
                                        <option value="no">Not Converted</option>
                                        <option value="yes">Converted</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control form-control-sm" id="filterFromDate">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control form-control-sm" id="filterToDate">
                                </div>
                                <div class="col-md-2 d-flex align-items-end">
                                    <button class="btn btn-sm btn-primary me-2" id="btnApplyFilter">
                                        <i class="bi bi-funnel"></i> Apply
                                    </button>
                                    <button class="btn btn-sm btn-secondary" id="btnResetFilter">
                                        <i class="bi bi-arrow-clockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="requestsTable">
                                    <thead>
                                        <tr>
                                          
                                            <th>PR Number</th>
                                            <th>Request Date</th>
                                            <th>Requested By</th>
                                            <th>Priority</th>
                                            <th>Required By</th>
                                         
                                          
                                            <th width="180">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="requestsTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div>
                                    Showing <span id="showingFrom">0</span> to <span id="showingTo">0</span> 
                                    of <span id="totalRecords">0</span> entries
                                </div>
                                <nav>
                                    <ul class="pagination pagination-sm" id="pagination">
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Bulk Actions Menu -->
                <div class="position-fixed bottom-0 start-50 translate-middle-x mb-3" id="bulkActions" style="display: none; z-index: 1050;">
                    <div class="card shadow">
                        <div class="card-body py-2">
                            <span class="me-3"><span id="selectedCount">0</span> selected</span>
                            <button class="btn btn-sm btn-success me-2" id="btnBulkConvert">
                                <i class="bi bi-cart"></i> Convert to PO
                            </button>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadRequests: function (page = 1) {
            const self = this;
            const params = {
                page: page,
                per_page: 10,
                ...this.filters
            };

            TempleCore.showLoading(true);

            TempleAPI.get('/purchase/requests', params)
                .done(function (response) {
                    if (response.success) {
                        if (response.data && response.data.data) {
                            self.displayRequests(response.data.data);
                            self.updatePagination({
                                current_page: response.data.current_page,
                                last_page: response.data.last_page,
                                from: response.data.from,
                                to: response.data.to,
                                total: response.data.total
                            });
                        }

                        if (response.statistics) {
                            self.updateStatistics(response.statistics);
                        }
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load purchase requests', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        displayRequests: function (requests) {
            const self = this;
            let html = '';

            if (!requests || requests.length === 0) {
                html = '<tr><td colspan="9" class="text-center">No purchase requests found</td></tr>';
            } else {
                $.each(requests, function (index, request) {
                    const priorityBadge = self.getPriorityBadge(request.priority || 'NORMAL');
                    const convertedBadge = request.converted_to_po
                        ? '<span class="badge bg-success">Yes</span>'
                        : '<span class="badge bg-secondary">No</span>';
                    const isDisabled = request.converted_to_po ? 'disabled' : '';

                    html += `
                        <tr data-id="${request.id}">
                           
                            <td>
                                <a href="#" onclick="TempleRouter.navigate('purchase/requests/view', {id: '${request.id}'}); return false;">
                                    ${request.pr_number || '-'}
                                </a>
                            </td>
                            <td>${request.request_date ? TempleCore.formatDate(request.request_date) : '-'}</td>
                            <td>${request.requester?.name || '-'}</td>
                            <td>${priorityBadge}</td>
                            <td>${request.required_by_date ? TempleCore.formatDate(request.required_by_date) : '-'}</td>
                          
                            <td>${self.getActionButtons(request)}</td>
                        </tr>
                    `;
                });
            }

            $('#requestsTableBody').html(html);
            this.selectedIds = [];
            $('#checkAll').prop('checked', false);
            this.updateBulkActions();
        },

        getActionButtons: function (request) {
            const isFullyConverted = request.converted_to_po === true;
            const canEdit = this.permissions.can_edit_purchase_requests;
            const canDelete = this.permissions.can_delete_purchase_requests;
            const canView = this.permissions.can_view_purchase_requests;
            const canConvertToPO = this.permissions.can_convert_purchase_requests;

            let buttons = `
        <div class="btn-group btn-group-sm" role="group">
          ${canView ? `<button class="btn btn-info" onclick="PurchaseRequestsPage.viewRequest('${request.id}')" title="View">` : ''}
                <i class="bi bi-eye"></i>
            </button>
              ${canEdit ? `<button class="btn btn-warning" onclick="PurchaseRequestsPage.editRequest('${request.id}')" title="Edit">
                <i class="bi bi-pencil"></i>
            </button>`: ''}
            ${canDelete ? `<button class="btn btn-danger" onclick="PurchaseRequestsPage.deleteRequest('${request.id}')" title="Delete">
                <i class="bi bi-trash"></i>
            </button>`: ''}
            ${!isFullyConverted && canConvertToPO ? `
                <button class="btn btn-success" onclick="PurchaseRequestsPage.convertToPO('${request.id}')" title="Convert to PO">
                    <i class="bi bi-cart"></i>
                </button>
            ` : ''}
            <button class="btn btn-primary" onclick="PurchaseRequestsPage.printPr('${request.id}')" title="Print">
                <i class="bi bi-printer"></i>
            </button>
        </div>
    `;
            return buttons;
        },

        bindEvents: function () {
            const self = this;

            // Filter events
            $('#btnApplyFilter').on('click', function () {
                self.filters = {
                    priority: $('#filterPriority').val(),
                    converted: $('#filterConverted').val(),
                    date_from: $('#filterFromDate').val(),
                    date_to: $('#filterToDate').val()
                };
                self.loadRequests(1);
            });

            $('#btnResetFilter').on('click', function () {
                $('#filterPriority, #filterConverted').val('');
                $('#filterFromDate, #filterToDate').val('');
                self.filters = {};
                self.loadRequests(1);
            });

            // Pagination
            $(document).on('click', '#pagination a', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && !$(this).parent().hasClass('disabled')) {
                    self.loadRequests(page);
                }
            });

            // Check all functionality
            $('#checkAll').on('change', function () {
                const isChecked = $(this).prop('checked');
                $('.row-checkbox:not(:disabled)').prop('checked', isChecked);
                self.updateSelectedIds();
                self.updateBulkActions();
            });

            // Individual checkbox
            $(document).on('change', '.row-checkbox', function () {
                self.updateSelectedIds();
                self.updateBulkActions();

                const totalCheckboxes = $('.row-checkbox:not(:disabled)').length;
                const checkedCheckboxes = $('.row-checkbox:checked').length;
                $('#checkAll').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
            });

            // Bulk convert button
            $('#btnBulkConvert').on('click', function () {
                self.bulkConvert();
            });
        },

        updateSelectedIds: function () {
            this.selectedIds = [];
            $('.row-checkbox:checked').each((index, element) => {
                this.selectedIds.push($(element).val());
            });
        },

        updateBulkActions: function () {
            const checkedCount = this.selectedIds.length;

            if (checkedCount > 0) {
                $('#selectedCount').text(checkedCount);
                $('#bulkActions').fadeIn(300);
            } else {
                $('#bulkActions').fadeOut(300);
            }
        },

        bulkConvert: function () {
            const self = this;

            if (this.selectedIds.length === 0) {
                TempleCore.showToast('No items selected', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            TempleAPI.post('/purchase/requests/get-prs-for-conversion', {
                pr_ids: this.selectedIds
            })
                .done(function (response) {
                    if (response.success && response.data.length > 0) {
                        sessionStorage.setItem('bulk_convert_prs', JSON.stringify(response.data));
                        sessionStorage.setItem('bulk_convert_ids', JSON.stringify(self.selectedIds));
                        TempleRouter.navigate('purchase/requests/bulk-convert');
                    } else {
                        TempleCore.showToast('No valid PRs found for conversion', 'warning');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load PRs for conversion', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        editRequest: function (id) {
            TempleRouter.navigate('purchase/requests/edit', { id: id });
        },
        viewRequest: function (id) {
            TempleRouter.navigate('purchase/requests/view', { id: id });
        },
        convertToPO: function (id) {
            TempleRouter.navigate('purchase/requests/convert', { id: id });
        },

        deleteRequest: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Request',
                'Are you sure you want to delete this purchase request?<br><small class="text-danger">This action cannot be undone!</small>',
                function () {
                    TempleCore.showLoading(true);
                    TempleAPI.delete('/purchase/requests/' + id)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Purchase request deleted successfully', 'success');
                                self.loadRequests();
                            }
                        })
                        .fail(function (xhr) {
                            const error = xhr.responseJSON?.message || 'Failed to delete request';
                            TempleCore.showToast(error, 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        printPr: function (id) {
            const url = '/' + TempleAPI.getTempleId() + '/purchase/requests/print/' + id;
            window.open(url, '_blank');
        },

        getPriorityBadge: function (priority) {
            const badges = {
                'LOW': '<span class="badge bg-secondary">Low</span>',
                'NORMAL': '<span class="badge bg-primary">Normal</span>',
                'HIGH': '<span class="badge bg-warning text-dark">High</span>',
                'URGENT': '<span class="badge bg-danger">Urgent</span>'
            };
            return badges[priority] || badges['NORMAL'];
        },

        updateStatistics: function (stats) {
            $('#statTotal').text(stats?.total || 0);
            $('#statPending').text(stats?.pending_conversion || 0);
            $('#statConverted').text(stats?.converted || 0);
        },

        updatePagination: function (pagination) {
            if (!pagination) return;

            $('#showingFrom').text(pagination.from || 0);
            $('#showingTo').text(pagination.to || 0);
            $('#totalRecords').text(pagination.total || 0);

            let paginationHtml = '';

            // Previous button
            paginationHtml += `
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">Previous</a>
                </li>
            `;

            // Page numbers
            for (let i = 1; i <= pagination.last_page; i++) {
                if (i === 1 || i === pagination.last_page ||
                    (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)) {
                    paginationHtml += `
                        <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
                    paginationHtml += `
                        <li class="page-item disabled">
                            <span class="page-link">...</span>
                        </li>
                    `;
                }
            }

            // Next button
            paginationHtml += `
                <li class="page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">Next</a>
                </li>
            `;

            $('#pagination').html(paginationHtml);
        }
    };

})(jQuery, window);