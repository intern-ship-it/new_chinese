// js/pages/purchase/payments.js
// Purchase payments list page

(function ($, window) {
    'use strict';

    window.PurchasePaymentsPage = {
        paymentsTable: null,
        currentFilters: {},

        init: function () {
            this.render();
            this.initializeDataTable();
            this.loadPayments();
            this.loadFilters();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Purchase Payments</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Payments</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                          
                            <button class="btn btn-primary" id="btnNewPayment">
                                <i class="bi bi-plus-circle"></i> New Payment
                            </button>
                        </div>
                    </div>
                    
                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Today's Payments</h6>
                                    <h3 id="todayPayments">0.00</h3>
                                    <small><span id="todayCount">0</span> transactions</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <h6 class="card-title">This Month</h6>
                                    <h3 id="monthPayments">0.00</h3>
                                    <small><span id="monthCount">0</span> transactions</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Pending Approval</h6>
                                    <h3 id="pendingPayments">0.00</h3>
                                    <small><span id="pendingCount">0</span> payments</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Total Outstanding</h6>
                                    <h3 id="outstandingAmount">0.00</h3>
                                    <small>Across all invoices</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <form id="filterForm">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="form-label">Date Range</label>
                                        <select class="form-select" id="dateRange">
                                            <option value="">All Time</option>
                                            <option value="today">Today</option>
                                            <option value="week">This Week</option>
                                            <option value="month" selected>This Month</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2" id="fromDateContainer" style="display: none;">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="fromDate">
                                    </div>
                                    <div class="col-md-2" id="toDateContainer" style="display: none;">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="toDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Supplier</label>
                                        <select class="form-select" id="supplierFilter">
                                            <option value="">All Suppliers</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Payment Mode</label>
                                        <select class="form-select" id="paymentModeFilter">
                                            <option value="">All Modes</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="statusFilter">
                                            <option value="">All Status</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="FAILED">Failed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary me-2" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Apply
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="btnResetFilter">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Payments Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="paymentsTable">
                                    <thead>
                                        <tr>
                                            <th>
                                                <input type="checkbox" id="selectAll" class="form-check-input">
                                            </th>
                                            <th>Payment #</th>
                                            <th>Date</th>
                                            <th>Supplier</th>
                                            <th>Invoice #</th>
                                            <th>Payment Mode</th>
                                            <th>Reference</th>
                                            <th class="text-end">Amount</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="paymentsTableBody">
                                        <tr>
                                            <td colspan="10" class="text-center">Loading payments...</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-light">
                                            <th colspan="7" class="text-end">Page Total:</th>
                                            <th class="text-end" id="pageTotal">0.00</th>
                                            <th colspan="2"></th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <nav aria-label="Payments pagination">
                                <ul class="pagination justify-content-center" id="pagination">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
                
                
            `;

            $('#page-container').html(html);
        },

        initializeDataTable: function () {
            // Initialize any data table specific settings if needed
        },

        loadPayments: function (page = 1) {
            const self = this;
            const filters = this.getFilters();
            filters.page = page;

            TempleCore.showLoading(true);

            TempleAPI.get('/purchase/payments', filters)
                .done(function (response) {
                    if (response.success) {
                        self.displayPayments(response.data.payments);
                        self.updateStatistics(response.data.statistics);
                        self.buildPagination(response.data.pagination);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load payments', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load payments', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        displayPayments: function (payments) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            let html = '';
            let pageTotal = 0;

            if (!payments || payments.length === 0) {
                html = '<tr><td colspan="10" class="text-center">No payments found</td></tr>';
            } else {
                $.each(payments, function (index, payment) {
                    pageTotal += parseFloat(payment.amount);

                    const statusBadge = self.getStatusBadge(payment.status);
                    const isEditable = payment.status === 'PENDING';

                    html += `
                        <tr data-payment-id="${payment.id}">
                            <td>
                                <input type="checkbox" class="form-check-input payment-checkbox" value="${payment.id}">
                            </td>
                            <td>
                                <a href="#" onclick="TempleRouter.navigate('purchase/payments/view', {id: '${payment.id}'}); return false;">
                                    ${payment.payment_number}
                                </a>
                            </td>
                            <td>${TempleCore.formatDate(payment.payment_date)}</td>
                            <td>${payment.supplier?.name || '-'}</td>
                            <td>
                                <a href="#" onclick="TempleRouter.navigate('purchase/invoices/view', {id: '${payment.invoice_id}'}); return false;">
                                    ${payment.invoice?.invoice_number || '-'}
                                </a>
                            </td>
                            <td>${payment.payment_mode?.name || '-'}</td>
                            <td>${payment.reference_number || '-'}</td>
                            <td class="text-end">${currency}${parseFloat(payment.amount).toFixed(2)}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-info" onclick="TempleRouter.navigate('purchase/payments/view', {id: '${payment.id}'}); return false;" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${isEditable ? `
                                        <button class="btn btn-warning" onclick="TempleRouter.navigate('purchase/payments/edit', {id: '${payment.id}'}); return false;" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-secondary" onclick="PurchasePaymentsPage.printPayment('${payment.id}')" title="Print">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#paymentsTableBody').html(html);
            $('#pageTotal').text(currency + pageTotal.toFixed(2));
        },

        getStatusBadge: function (status) {
            const badges = {
                'PENDING': '<span class="badge bg-warning">Pending</span>',
                'COMPLETED': '<span class="badge bg-success">Completed</span>',
                'FAILED': '<span class="badge bg-danger">Failed</span>',
                'CANCELLED': '<span class="badge bg-secondary">Cancelled</span>'
            };
            return badges[status] || badges['PENDING'];
        },

        updateStatistics: function (stats) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];

            $('#todayPayments').text(currency + ((stats?.today_amount) || 0).toFixed(2));

            $('#todayCount').text(stats?.today_count || 0);

            $('#monthPayments').text(currency + (stats?.month_amount || 0).toFixed(2));
            $('#monthCount').text(stats?.month_count || 0);

            $('#pendingPayments').text(currency + (stats?.pending_amount || 0).toFixed(2));
            $('#pendingCount').text(stats?.pending_count || 0);

            $('#outstandingAmount').text(currency + (stats?.outstanding_amount || 0).toFixed(2));
        },

        buildPagination: function (pagination) {
            let html = '';

            if ((pagination?.total_pages || 0) > 1) {
                // Previous button
                html += `
                    <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${pagination.current_page - 1}">Previous</a>
                    </li>
                `;

                // Page numbers
                for (let i = 1; i <= pagination.total_pages; i++) {
                    if (i === 1 || i === pagination.total_pages || (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)) {
                        html += `
                            <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `;
                    } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
                        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                    }
                }

                // Next button
                html += `
                    <li class="page-item ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${pagination.current_page + 1}">Next</a>
                    </li>
                `;
            }

            $('#pagination').html(html);
        },

        loadFilters: function () {
            // Load suppliers
            TempleAPI.get('/purchase/suppliers')
                .done(function (response) {
                    if (response.success && response.data && Array.isArray(response.data.data)) {
                        let suppliers = response.data.data;
                        let options = '<option value="">All Suppliers</option>';

                        suppliers.forEach(supplier => {
                            if (supplier && supplier.id && supplier.name) {
                                options += `<option value="${supplier.id}">${supplier.name}</option>`;
                            }
                        });

                        $('#supplierFilter').html(options);
                    } else {
                        $('#supplierFilter').html('<option value="">No suppliers found</option>');
                    }
                })
                .fail(function () {
                    $('#supplierFilter').html('<option value="">Failed to load suppliers</option>');
                });




            // Load payment modes
            TempleAPI.get('/masters/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        // Check if it's paginated (data.data) or plain array (data)
                        let modes = Array.isArray(response.data) ? response.data : response.data.data || [];

                        let options = '<option value="">All Modes</option>';
                        modes.forEach(mode => {
                            if (mode && mode.id && mode.name) {
                                options += `<option value="${mode.id}">${mode.name}</option>`;
                            }
                        });

                        $('#paymentModeFilter').html(options);
                    } else {
                        $('#paymentModeFilter').html('<option value="">No payment modes found</option>');
                    }
                })
                .fail(function () {
                    $('#paymentModeFilter').html('<option value="">Failed to load payment modes</option>');
                });

        },

        getFilters: function () {
            const filters = {
                date_range: $('#dateRange').val(),
                supplier_id: $('#supplierFilter').val(),
                payment_mode_id: $('#paymentModeFilter').val(),
                status: $('#statusFilter').val()
            };

            if (filters.date_range === 'custom') {
                filters.from_date = $('#fromDate').val();
                filters.to_date = $('#toDate').val();
            }

            return filters;
        },

        bindEvents: function () {
            const self = this;

            // New Payment
            $('#btnNewPayment').on('click', function () {
                TempleRouter.navigate('purchase/payments/create');
            });

            // Date range change
            $('#dateRange').on('change', function () {
                if ($(this).val() === 'custom') {
                    $('#fromDateContainer, #toDateContainer').show();
                } else {
                    $('#fromDateContainer, #toDateContainer').hide();
                }
            });

            // Apply filters
            $('#btnApplyFilter').on('click', function () {
                self.loadPayments(1);
            });

            // Reset filters
            $('#btnResetFilter').on('click', function () {
                $('#filterForm')[0].reset();
                $('#fromDateContainer, #toDateContainer').hide();
                self.loadPayments(1);
            });

            // Pagination
            $(document).on('click', '#pagination a', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.loadPayments(page);
                }
            });

          

      

        },

   

        printPayment: function (paymentId) {
            window.open(TempleAPI.getBaseUrl() + '/purchase/payments/' + paymentId + '/print', '_blank');
        },

    };

})(jQuery, window);