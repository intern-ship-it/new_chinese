// js/pages/budgets/index.js
// Budget Management Main Page - Updated with Dynamic Currency

(function ($, window) {
    'use strict';

    window.BudgetsPage = {
        currentFilters: {
            status: null,
            budget_type: null,
            group_code: null
        },

        currentPage: 1,
        templeCurrency: null, // Store currency for this page

        // Initialize page
        init: function () {
            // Get temple settings including currency
            const temple = TempleCore.getTemple();
            this.templeCurrency = temple.currency || 'MYR'; // Default to MYR if not set

            this.render();
            this.bindEvents();
            this.loadBudgets();
        },

        // Get currency symbol
        getCurrencySymbol: function () {
            const currencySymbols = {
                'MYR': 'RM',
                'INR': '₹',
                'USD': '$',
                'EUR': '€',
                'GBP': '£',
                'SGD': 'S$',
                'JPY': '¥',
                'CNY': '¥',
                'CAD': 'C$',
                'AUD': 'A$',
                'CHF': 'CHF',
                'HKD': 'HK$',
                'NZD': 'NZ$',
                'SEK': 'kr',
                'NOK': 'kr',
                'DKK': 'kr',
                'AED': 'د.إ',
                'SAR': 'ر.س',
                'ZAR': 'R',
                'THB': '฿',
                'PHP': '₱',
                'IDR': 'Rp',
                'VND': '₫',
                'KRW': '₩',
                'TWD': 'NT$',
                'BRL': 'R$',
                'MXN': '$',
                'RUB': '₽',
                'TRY': '₺',
                'ILS': '₪'
            };

            return currencySymbols[this.templeCurrency] || this.templeCurrency;
        },

        // Render page HTML
        render: function () {
            const currencySymbol = this.getCurrencySymbol();

            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h1 class="page-title">
                                    <i class="bi bi-calculator"></i> Budget Management
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item active">Budgets</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                                <div class="btn-group">
                                    <button class="btn btn-primary" id="createBudgetBtn">
                                        <i class="bi bi-plus-circle"></i> Create Budget
                                    </button>
                                    <button class="btn btn-success" id="createJobBudget">
                                        <i class="bi bi-file-earmark-plus"></i> Create Job Budget
                                    </button>
                                    <button class="btn btn-success" id="bulkCreateBtn" style="display:none;">
                                        <i class="bi bi-file-earmark-plus"></i> Bulk Create
                                    </button>
                                    <button class="btn btn-info" id="viewReportBtn">
                                        <i class="bi bi-graph-up"></i> View Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4" id="budgetStats">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Total Budget</h6>
                                    <h3 class="mb-0" id="totalBudget">${currencySymbol} 0.00</h3>
                                    <small>Current Financial Year</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Approved</h6>
                                    <h3 class="mb-0" id="approvedBudgets">0</h3>
                                    <small>Budgets</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Pending Approval</h6>
                                    <h3 class="mb-0" id="pendingBudgets">0</h3>
                                    <small>Budgets</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body">
                                    <h6 class="card-title">Avg. Utilization</h6>
                                    <h3 class="mb-0" id="avgUtilization">0%</h3>
                                    <small>YTD</small>
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
                                        <option value="SUBMITTED">Submitted</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Budget Type</label>
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="INCOME">Income</option>
                                        <option value="EXPENSE">Expense</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Group</label>
                                    <select class="form-select" id="filterGroup">
                                        <option value="">All Groups</option>
                                        <option value="4000">Revenue (4000)</option>
                                        <option value="5000">Direct Costs (5000)</option>
                                        <option value="6000">Expenses (6000)</option>
                                        <option value="8000">Other Income (8000)</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <div>
                                        <button class="btn btn-primary" id="applyFiltersBtn">
                                            <i class="bi bi-funnel"></i> Apply Filters
                                        </button>
                                        <button class="btn btn-secondary" id="clearFiltersBtn">
                                            <i class="bi bi-x-circle"></i> Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Budgets Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Ledger</th>
                                            <th>Group</th>
                                            <th>Type</th>
                                            <th>Budget Amount</th>
                                            <th>Actual Amount</th>
                                            <th>Variance</th>
                                            <th>Utilization</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="budgetsTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">
                                                <div class="spinner-border" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <nav id="budgetsPagination">
                                <ul class="pagination justify-content-center">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>

                <!-- Edit Budget Modal -->
                <div class="modal fade" id="editBudgetModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Edit Budget</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editBudgetForm">
                                    <input type="hidden" id="editBudgetId">
                                    <div class="mb-3">
                                        <label class="form-label">Ledger</label>
                                        <input type="text" class="form-control" id="editLedgerName" readonly>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Budget Amount (${currencySymbol})</label>
                                        <input type="number" class="form-control" id="editBudgetAmount" step="0.01" required>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveEditBtn">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Approval Modal -->
                <div class="modal fade" id="approvalModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Process Budget Approval</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="approvalForm">
                                    <input type="hidden" id="approvalBudgetId">
                                    <div class="mb-3">
                                        <label class="form-label">Action</label>
                                        <select class="form-select" id="approvalAction" required>
                                            <option value="">Select Action</option>
                                            <option value="approve">Approve</option>
                                            <option value="reject">Reject</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="approvalNotes" rows="3"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="processApprovalBtn">Process</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Load budgets (with currency from backend if available)
        loadBudgets: function (page = 1) {
            const self = this;
            this.currentPage = page;

            const params = {
                page: page,
                per_page: 20
            };

            // Add filters
            $.each(this.currentFilters, function (key, value) {
                if (value) params[key] = value;
            });

            TempleAPI.get('/budgets', params)
                .done(function (response) {
                    if (response.success) {
                        // Update currency if provided in response
                        if (response.currency) {
                            self.templeCurrency = response.currency;
                        }

                        self.renderBudgets(response.data);
                        self.updateStatistics(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load budgets', 'error');
                });
        },

        // Render budgets table
        renderBudgets: function (data) {
            const self = this;
            let html = '';

            if (data.data && data.data.length > 0) {
                $.each(data.data, function (i, budget) {
                    const statusBadge = self.getStatusBadge(budget.status);
                    const typeBadge = budget.budget_type === 'INCOME'
                        ? '<span class="badge bg-success">Income</span>'
                        : '<span class="badge bg-warning">Expense</span>';

                    const variance = budget.variance || 0;
                    const varianceClass = variance < 0 ? 'text-danger' : 'text-success';

                    const utilization = budget.utilization_percentage || 0;
                    const progressClass = utilization > 100 ? 'bg-danger' : utilization > 75 ? 'bg-warning' : 'bg-success';

                    html += `
                        <tr>
                            <td>${budget.ledger.name}</td>
                            <td><small>${budget.ledger.group.name} (${budget.ledger.group.code})</small></td>
                            <td>${typeBadge}</td>
                            <td>${TempleCore.formatCurrency(budget.budget_amount, self.templeCurrency)}</td>
                            <td>${TempleCore.formatCurrency(budget.actual_amount || 0, self.templeCurrency)}</td>
                            <td class="${varianceClass}">${TempleCore.formatCurrency(Math.abs(variance), self.templeCurrency)}</td>
                            <td>
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar ${progressClass}" style="width: ${Math.min(utilization, 100)}%">
                                        ${utilization}%
                                    </div>
                                </div>
                            </td>
                            <td>${statusBadge}</td>
                            <td>
                                <div class="btn-group btn-group-sm">
                    `;

                    // Add action buttons based on status
                    if (budget.status === 'DRAFT') {
                        html += `
                            <button class="btn btn-outline-primary edit-budget" data-id="${budget.id}" 
                                data-ledger="${budget.ledger.name}" data-amount="${budget.budget_amount}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-success submit-budget" data-id="${budget.id}">
                                <i class="bi bi-send"></i> Submit
                            </button>
                        `;
                    } else if (budget.status === 'SUBMITTED' && TempleCore.hasPermission('approve_budgets')) {
                        html += `
                            <button class="btn btn-outline-info approve-budget" data-id="${budget.id}">
                                <i class="bi bi-check-circle"></i> Process
                            </button>
                        `;
                    }

                    html += `
                            <button class="btn btn-outline-info view-budget" data-id="${budget.id}">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                    `;
                });
            } else {
                html = `
                    <tr>
                        <td colspan="9" class="text-center py-4">
                            <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                            <p class="text-muted">No budgets found</p>
                        </td>
                    </tr>
                `;
            }

            $('#budgetsTableBody').html(html);
            this.renderPagination(data);
        },

        // Get status badge
        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'SUBMITTED': '<span class="badge bg-warning">Submitted</span>',
                'APPROVED': '<span class="badge bg-success">Approved</span>',
                'REJECTED': '<span class="badge bg-danger">Rejected</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },

        // Update statistics with dynamic currency
        updateStatistics: function (data) {
            let totalBudget = 0;
            let approved = 0;
            let pending = 0;
            let totalUtilization = 0;
            let utilizationCount = 0;

            if (data.data) {
                $.each(data.data, function (i, budget) {
                    totalBudget += parseFloat(budget.budget_amount);
                    if (budget.status === 'APPROVED') approved++;
                    if (budget.status === 'SUBMITTED') pending++;
                    if (budget.utilization_percentage) {
                        totalUtilization += budget.utilization_percentage;
                        utilizationCount++;
                    }
                });
            }

            // Use dynamic currency for total budget display
            $('#totalBudget').text(TempleCore.formatCurrency(totalBudget, this.templeCurrency));
            $('#approvedBudgets').text(approved);
            $('#pendingBudgets').text(pending);
            $('#avgUtilization').text(utilizationCount > 0 ?
                Math.round(totalUtilization / utilizationCount) + '%' : '0%');
        },

        // Render pagination
        renderPagination: function (data) {
            let html = '';

            if (data.last_page > 1) {
                // Previous button
                html += `
                    <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                    </li>
                `;

                // Page numbers
                for (let i = 1; i <= data.last_page; i++) {
                    if (i === 1 || i === data.last_page ||
                        (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                        html += `
                            <li class="page-item ${i === data.current_page ? 'active' : ''}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                            </li>
                        `;
                    } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                    }
                }

                // Next button
                html += `
                    <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                    </li>
                `;
            }

            $('#budgetsPagination .pagination').html(html);
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Create budget button
            $('#createBudgetBtn').on('click', function () {
                TempleRouter.navigate('budgets/create');
            });

            // Bulk create button
            $('#bulkCreateBtn').on('click', function () {
                TempleRouter.navigate('budgets/bulk-create');
            });
            $('#createJobBudget').on('click', function () {
                TempleRouter.navigate('fund-budgets');
            });

            // View report button
            $('#viewReportBtn').on('click', function () {
                TempleRouter.navigate('budgets/report');
            });

            // Apply filters
            $('#applyFiltersBtn').on('click', function () {
                self.currentFilters = {
                    status: $('#filterStatus').val(),
                    budget_type: $('#filterType').val(),
                    group_code: $('#filterGroup').val()
                };
                self.loadBudgets();
            });

            // Clear filters
            $('#clearFiltersBtn').on('click', function () {
                $('#filterStatus, #filterType, #filterGroup').val('');
                self.currentFilters = {};
                self.loadBudgets();
            });

            // Edit budget
            $(document).on('click', '.edit-budget', function () {
                const $btn = $(this);
                $('#editBudgetId').val($btn.data('id'));
                $('#editLedgerName').val($btn.data('ledger'));
                $('#editBudgetAmount').val($btn.data('amount'));
                new bootstrap.Modal(document.getElementById('editBudgetModal')).show();
            });

            // Save edit
            $('#saveEditBtn').on('click', function () {
                self.updateBudget();
            });

            // Submit budget
            $(document).on('click', '.submit-budget', function () {
                const budgetId = $(this).data('id');
                TempleCore.showConfirm(
                    'Submit Budget',
                    'Are you sure you want to submit this budget for approval?',
                    function () {
                        self.submitBudget(budgetId);
                    }
                );
            });

            // Process approval
            $(document).on('click', '.approve-budget', function () {
                const budgetId = $(this).data('id');
                $('#approvalBudgetId').val(budgetId);
                $('#approvalAction').val('');
                $('#approvalNotes').val('');
                new bootstrap.Modal(document.getElementById('approvalModal')).show();
            });

            // Process approval button
            $('#processApprovalBtn').on('click', function () {
                self.processApproval();
            });

            // View budget details
            $(document).on('click', '.view-budget', function () {
                const budgetId = $(this).data('id');
                TempleRouter.navigate('budgets/view', { id: budgetId });
            });

            // Pagination
            $(document).on('click', '#budgetsPagination .page-link', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.loadBudgets(page);
                }
            });
        },

        // Update budget
        updateBudget: function () {
            const budgetId = $('#editBudgetId').val();
            const amount = $('#editBudgetAmount').val();

            if (!amount || amount <= 0) {
                TempleCore.showToast('Please enter a valid budget amount', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            TempleAPI.put('/budgets/' + budgetId, {
                budget_amount: amount
            })
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('editBudgetModal')).hide();
                        TempleCore.showToast('Budget updated successfully', 'success');
                        BudgetsPage.loadBudgets(BudgetsPage.currentPage);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update budget', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('An error occurred', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Submit budget for approval
        submitBudget: function (budgetId) {
            TempleCore.showLoading(true);

            TempleAPI.post('/budgets/' + budgetId + '/submit', {})
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Budget submitted for approval', 'success');
                        BudgetsPage.loadBudgets(BudgetsPage.currentPage);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to submit budget', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('An error occurred', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Process approval
        processApproval: function () {
            const budgetId = $('#approvalBudgetId').val();
            const action = $('#approvalAction').val();
            const notes = $('#approvalNotes').val();

            if (!action) {
                TempleCore.showToast('Please select an action', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            TempleAPI.post('/budgets/' + budgetId + '/approval', {
                action: action,
                notes: notes
            })
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('approvalModal')).hide();
                        TempleCore.showToast('Budget ' + action + 'd successfully', 'success');
                        BudgetsPage.loadBudgets(BudgetsPage.currentPage);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to process approval', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('An error occurred', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };

})(jQuery, window);