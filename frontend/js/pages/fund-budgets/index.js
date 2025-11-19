// js/pages/fund-budgets/index.js
// Fund Budget Management Main Page - Complete Implementation

(function ($, window) {
    'use strict';

    window.FundBudgetsPage = {
        currentFund: null,
        currentView: 'list',

        currentFilters: {
            fund_id: null,
            status: null,
            is_active: null,
            from_date: null,
            to_date: null
        },
        currentPage: 1,
        templeCurrency: null,
        funds: [],
        ledgers: [],
        templates: [],

        // Initialize page
        init: function () {
            // Get temple settings
            const temple = JSON.parse(localStorage.getItem('temple') || '{}');
            this.templeCurrency = temple.currency || 'MYR';

            this.render();
            this.loadInitialData();
            this.bindEvents();
            this.loadFundBudgets();
        },

        // Load initial data
        loadInitialData: function () {
            // Load funds
            this.loadFunds();
            // Load ledgers for budget items
            this.loadLedgers();
            // Load templates
            this.loadTemplates();
        },

        // Get currency symbol
        getCurrencySymbol: function () {
            const symbols = {
                'MYR': 'RM',
                'INR': '₹',
                'USD': '$',
                'EUR': '€',
                'GBP': '£',
                'SGD': 'S$',
                'JPY': '¥',
                'CNY': '¥',
                'CAD': 'C$',
                'AUD': 'A$'
            };
            return symbols[this.templeCurrency] || this.templeCurrency;
        },

        // Format currency
        formatCurrency: function (amount) {
            return this.getCurrencySymbol() + ' ' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        // Format date
        formatDate: function (date) {
            return moment(date).format('DD/MM/YYYY');
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h1 class="page-title">
                                    <i class="bi bi-wallet2"></i> Job Budget Management
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item">
                                            <a href="#" onclick="window.location.hash='dashboard'; return false;">Dashboard</a>
                                        </li>
                                        <li class="breadcrumb-item active">Job Budgets</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                                <div class="btn-group">
                                    <button class="btn btn-primary" id="createBudgetBtn">
                                        <i class="bi bi-plus-circle"></i> Create Budget
                                    </button>
                                    <button class="btn btn-success" id="createRecurringBtn" style="display:none;">
                                        <i class="bi bi-arrow-repeat"></i> Create Recurring
                                    </button>
                                    <button class="btn btn-warning" id="manageTemplatesBtn" style="display:none;">
                                        <i class="bi bi-file-text"></i> Templates
                                    </button>
                                    <button class="btn btn-info" id="viewReportBtn">
                                        <i class="bi bi-graph-up"></i> Reports
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <h6 class="card-title text-primary">Total Budget</h6>
                                    <h3 class="mb-0" id="totalBudgetAmount">-</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-success">
                                <div class="card-body">
                                    <h6 class="card-title text-success">Total Utilized</h6>
                                    <h3 class="mb-0" id="totalUtilizedAmount">-</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <h6 class="card-title text-warning">Total Remaining</h6>
                                    <h3 class="mb-0" id="totalRemainingAmount">-</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-info">
                                <div class="card-body">
                                    <h6 class="card-title text-info">Active Budgets</h6>
                                    <h3 class="mb-0" id="activeBudgetsCount">-</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Fund</label>
                                    <select class="form-select" id="fundFilter">
                                        <option value="">All Jobs</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="SUBMITTED">Submitted</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="fromDateFilter">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="toDateFilter">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Active Only</label>
                                    <div class="form-check mt-2">
                                        <input class="form-check-input" type="checkbox" id="activeFilter">
                                        <label class="form-check-label" for="activeFilter">
                                            Show Active Only
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-primary w-100" id="applyFiltersBtn">
                                        <i class="bi bi-funnel"></i> Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- View Tabs -->
                    <div class="card">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#listView">
                                        <i class="bi bi-list-ul"></i> List View
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#calendarView">
                                        <i class="bi bi-calendar-month"></i> Calendar View
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#timelineView">
                                        <i class="bi bi-diagram-3"></i> Timeline View
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="listView">
                                    <div id="fundBudgetsTable">
                                        <div class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="tab-pane fade" id="calendarView">
                                 
                                         <div id="calendarContainer">
                                        <!-- Calendar will be rendered here -->
                                    </div>
                                </div>

                        

    <div class="tab-pane fade" id="timelineView">
                                    <div id="timelineContainer">
                                        <p class="text-center text-muted py-5">Timeline view coming soon...</p>
                                    </div>
                                </div>
                             
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modals -->
                ${this.getCreateBudgetModal()}
                ${this.getCreateRecurringModal()}
                ${this.getViewDetailsModal()}
            `;

            $('#page-container').html(html);
        },


        loadFunds: function () {
            const self = this;

            TempleAPI.get('/accounts/funds')
                .done(function (response) {
                    if (response.success || response.data) {
                        self.funds = response.data || response; // use self

                        const select = $('#fundFilter');
                        select.empty().append('<option value="">All Job</option>');

                        self.funds.forEach(fund => {
                            select.append(`<option value="${fund.id}">${fund.name}</option>`);
                        });

                        // Also populate in create modal
                        $('#budgetFundId, #recurringFundId').empty().append('<option value="">Select Job</option>');
                        self.funds.forEach(fund => {
                            $('#budgetFundId, #recurringFundId').append(`<option value="${fund.id}">${fund.name}</option>`);
                        });
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load funds:', xhr);
                });
        },

        // Load ledgers for budget items
        loadLedgers: function () {
            const self = this;

            TempleAPI.get('/accounts/ledgers')
                .done(function (response) {
                    // Make sure it's an array from the paginated response
                    self.ledgers = Array.isArray(response.data.data) ? response.data.data : [];

                    // Populate ledger dropdowns
                    const select = $('#ledgerFilter');
                    select.empty().append('<option value="">All Ledgers</option>');
                    self.ledgers.forEach(ledger => {
                        select.append(`<option value="${ledger.id}">${ledger.name}</option>`);
                    });

                    // Also populate in create modal
                    $('#budgetLedgerId, #recurringLedgerId').empty().append('<option value="">Select Ledger</option>');
                    self.ledgers.forEach(ledger => {
                        $('#budgetLedgerId, #recurringLedgerId').append(`<option value="${ledger.id}">${ledger.name}</option>`);
                    });
                })
                .fail(function (xhr) {
                    console.error('Failed to load ledgers:', xhr);
                });
        },



        // Load templates
        loadTemplates: function () {
            const self = this;

            TempleAPI.get('/fund-budget-templates')  // Fetch templates
                .done(function (response) {
                    // Ensure we have an array
                    const templates = Array.isArray(response.data?.data) ? response.data.data : [];
                    self.templates = templates;

                    // Populate the template dropdown
                    const select = $('#recurringTemplate');
                    select.empty().append('<option value="">No Template</option>');  // Default option

                    templates.forEach(template => {
                        select.append(`<option value="${template.id}">${template.template_name}</option>`);  // Add each template
                    });
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error?.message || 'Failed to load templates', 'error');
                    console.error('Failed to load templates:', xhr);
                });
        },



        // Load fund budgets
        loadFundBudgets: function () {
            const self = this;
            const params = {
                ...this.currentFilters,
                page: this.currentPage,
                per_page: 20
            };

            // Remove empty values
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            TempleAPI.request({
                endpoint: '/fund-budgets',
                method: 'GET',
                data: params
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderBudgetsTable(response.data);
                        self.updateSummaryCards(response.data);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load fund budgets:', xhr);
                    $('#fundBudgetsTable').html(`
                    <div class="alert alert-danger">
                        Failed to load fund budgets. Please try again.
                    </div>
                `);
                });
        },

        // Update summary cards
        updateSummaryCards: function (data) {
            const budgets = data.data || [];

            let totalBudget = 0;
            let totalUtilized = 0;
            let totalRemaining = 0;
            let activeCount = 0;

            budgets.forEach(budget => {
                totalBudget += parseFloat(budget.budget_amount || 0);
                totalUtilized += parseFloat(budget.utilized_amount || 0);
                totalRemaining += parseFloat(budget.remaining_amount || 0);
                if (budget.is_active) activeCount++;
            });

            $('#totalBudgetAmount').text(this.formatCurrency(totalBudget));
            $('#totalUtilizedAmount').text(this.formatCurrency(totalUtilized));
            $('#totalRemainingAmount').text(this.formatCurrency(totalRemaining));
            $('#activeBudgetsCount').text(activeCount);
        },

        // Render budgets table
        renderBudgetsTable: function (data) {
            const budgets = data.data || [];
            const currencySymbol = this.getCurrencySymbol();

            let html = `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Budget Name</th>
                                <th>Fund</th>
                                <th>Period</th>
                                <th>Budget Amount</th>
                                <th>Utilization</th>
                                <th>Status</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (budgets.length === 0) {
                html += `
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No fund budgets found</p>
                            <button class="btn btn-primary btn-sm" onclick="$('#createBudgetBtn').click()">
                                <i class="bi bi-plus-circle"></i> Create First Budget
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                budgets.forEach(budget => {
                    const utilizationPercentage = parseFloat(budget.utilization_percentage || 0);
                    const utilizationClass = utilizationPercentage >= 90 ? 'danger' :
                        utilizationPercentage >= 75 ? 'warning' : 'success';

                    html += `
                        <tr>
                            <td>
                                <div>
                                    <strong>${budget.budget_name}</strong>
                                    ${budget.is_recurring ? '<span class="badge bg-info ms-2">Recurring</span>' : ''}
                                    ${budget.is_active ? '<span class="badge bg-success ms-2">Active</span>' : ''}
                                </div>
                                ${budget.notes ? `<small class="text-muted">${budget.notes}</small>` : ''}
                            </td>
                            <td>${budget.fund ? budget.fund.name : '-'}</td>
                            <td>
                                <small>
                                    ${this.formatDate(budget.from_date)} - ${this.formatDate(budget.to_date)}
                                </small>
                            </td>
                            <td>
                                <strong>${this.formatCurrency(budget.budget_amount)}</strong>
                            </td>
                            <td>
                                <div>
                                    <div class="d-flex justify-content-between mb-1">
                                        <small>Used: ${this.formatCurrency(budget.utilized_amount)}</small>
                                        <small>${utilizationPercentage}%</small>
                                    </div>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar bg-${utilizationClass}" 
                                             style="width: ${utilizationPercentage}%"
                                             role="progressbar"></div>
                                    </div>
                                    <small class="text-muted">
                                        Remaining: ${this.formatCurrency(budget.remaining_amount)}
                                    </small>
                                </div>
                            </td>
                            <td>${this.getStatusBadge(budget.status)}</td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-info" 
                                            onclick="FundBudgetsPage.viewDetails(${budget.id})"
                                            title="View Details">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${this.getActionButtons(budget)}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            // Add pagination
            if (data.last_page > 1) {
                html += this.getPaginationHtml(data);
            }

            $('#fundBudgetsTable').html(html);
        },

        // Get status badge
        getStatusBadge: function (status) {
            const badges = {
                'DRAFT': '<span class="badge bg-secondary">Draft</span>',
                'SUBMITTED': '<span class="badge bg-warning text-dark">Submitted</span>',
                'APPROVED': '<span class="badge bg-success">Approved</span>',
                'REJECTED': '<span class="badge bg-danger">Rejected</span>',
                'CLOSED': '<span class="badge bg-dark">Closed</span>'
            };
            return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
        },

        // Get action buttons based on status
        getActionButtons: function (budget) {
            let buttons = '';

            if (budget.can_edit) {
                buttons += `
                    <button class="btn btn-outline-primary" 
                            onclick="FundBudgetsPage.editBudget(${budget.id})"
                            title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                `;
            }

            if (budget.status === 'DRAFT') {
                buttons += `
                    <button class="btn btn-outline-success" 
                            onclick="FundBudgetsPage.submitBudget(${budget.id})"
                            title="Submit for Approval">
                        <i class="bi bi-send"></i>
                    </button>
                    <button class="btn btn-outline-danger" 
                            onclick="FundBudgetsPage.deleteBudget(${budget.id})"
                            title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
            }

            if (budget.status === 'SUBMITTED') {
                // Check user role for approval buttons
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                    buttons += `
                        <button class="btn btn-outline-success" 
                                onclick="FundBudgetsPage.approveBudget(${budget.id})"
                                title="Approve">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-outline-danger" 
                                onclick="FundBudgetsPage.rejectBudget(${budget.id})"
                                title="Reject">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    `;
                }
            }

            if (budget.can_close) {
                buttons += `
                    <button class="btn btn-outline-dark" 
                            onclick="FundBudgetsPage.closeBudget(${budget.id})"
                            title="Close Budget">
                        <i class="bi bi-lock"></i>
                    </button>
                `;
            }

            if (budget.can_reopen) {
                buttons += `
                    <button class="btn btn-outline-info" 
                            onclick="FundBudgetsPage.reopenBudget(${budget.id})"
                            title="Reopen Budget">
                        <i class="bi bi-unlock"></i>
                    </button>
                `;
            }

            return buttons;
        },

        // Get pagination HTML
        getPaginationHtml: function (data) {
            let html = `
                <nav aria-label="Fund budgets pagination">
                    <ul class="pagination justify-content-center mt-4">
            `;

            // Previous button
            html += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="FundBudgetsPage.goToPage(${data.current_page - 1}); return false;">
                        Previous
                    </a>
                </li>
            `;

            // Page numbers
            for (let i = 1; i <= data.last_page; i++) {
                if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    html += `
                        <li class="page-item ${i === data.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="FundBudgetsPage.goToPage(${i}); return false;">
                                ${i}
                            </a>
                        </li>
                    `;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            // Next button
            html += `
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="FundBudgetsPage.goToPage(${data.current_page + 1}); return false;">
                        Next
                    </a>
                </li>
            `;

            html += `
                    </ul>
                </nav>
            `;

            return html;
        },

        // Go to page
        goToPage: function (page) {
            this.currentPage = page;
            this.loadFundBudgets();
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Filter events
            $('#applyFiltersBtn').on('click', function () {
                self.currentFilters = {
                    fund_id: $('#fundFilter').val(),
                    status: $('#statusFilter').val(),
                    is_active: $('#activeFilter').is(':checked') ? 1 : null,
                    from_date: $('#fromDateFilter').val(),
                    to_date: $('#toDateFilter').val()
                };
                self.currentPage = 1;
                self.loadFundBudgets();
            });

            // Clear filters on fund change
            $('#fundFilter').on('change', function () {
                if ($(this).val()) {
                    $('#statusFilter').val('');
                    $('#activeFilter').prop('checked', false);
                }
            });

            // Create budget button
            $('#createBudgetBtn').on('click', function () {
                self.showCreateBudgetModal();
            });

            // Create recurring button
            $('#createRecurringBtn').on('click', function () {
                self.showCreateRecurringModal();
            });

            // View report button
            $('#viewReportBtn').on('click', function () {
                TempleRouter.navigate('fund-budgets/report');
            });



            // Manage templates button
            $('#manageTemplatesBtn').on('click', function () {
                // window.location.hash = 'fund-budget-templates';
                //    TempleRouter.navigate('fund-budget-templates');
                FundBudgetTemplatesPage.showTemplatesListModal();
            });

            // Tab change events
            $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
                const target = $(e.target).attr('href');
                if (target === '#calendarView') {
                    // Initialize calendar view
                    self.initCalendarView();
                } else if (target === '#timelineView') {
                    // Initialize timeline view
                    self.initTimelineView();
                }
            });

        },



          // Initialize Timeline View
        initTimelineView: function () {
            // Check if timeline is already initialized
            if (window.FundBudgetTimeline && window.FundBudgetTimeline.isInitialized) {
                // Reload timeline data
                window.FundBudgetTimeline.loadTimelineData();
                return;
            }

            // Load timeline view script if not already loaded
            if (!window.FundBudgetTimeline) {
                $.getScript('/js/pages/fund-budgets/timeline-view.js')
                    .done(() => {
                        if (window.FundBudgetTimeline) {
                            window.FundBudgetTimeline.init('#timelineContainer');
                        }
                    })
                    .fail(() => {
                        TempleCore.showToast('Failed to load timeline view', 'error');
                    });
            } else {
                window.FundBudgetTimeline.init('#timelineContainer');
            }
        },
        // Initialize Calendar View
        initCalendarView: function () {
            // Check if calendar is already initialized
            if (window.FundBudgetCalendar && window.FundBudgetCalendar.isInitialized) {
                // Reload budgets for current month
                window.FundBudgetCalendar.loadBudgetsForMonth();
                return;
            }

            // Load calendar view script if not already loaded
            if (!window.FundBudgetCalendar) {
                $.getScript('/js/pages/fund-budgets/calendar-view.js')
                    .done(() => {
                        if (window.FundBudgetCalendar) {
                            window.FundBudgetCalendar.init('#calendarContainer');
                        }
                    })
                    .fail(() => {
                        TempleCore.showToast('Failed to load calendar view', 'error');
                    });
            } else {
                window.FundBudgetCalendar.init('#calendarContainer');
            }
        },
        // Show create budget modal
        showCreateBudgetModal: function () {
            const self = this;

            // Reset the form completely
            $('#createBudgetForm')[0].reset();

            // Clear budget items container
            $('#budgetItemsContainer').empty();

            // Reset modal title
            $('#createBudgetModal .modal-title').text('Create Fund Budget');

            // Reset save button to create mode
            $('#saveBudgetBtn').off('click').on('click', function () {
                self.saveBudget();
            });

            // Show modal
            $('#createBudgetModal').modal('show');

            // Initialize the form (this will add the first empty row)
            this.initCreateBudgetForm();
        },

        // Initialize create budget form
        initCreateBudgetForm: function () {
            const self = this;

            // Add budget item row
            $('#addBudgetItem').off('click').on('click', function () {
                self.addBudgetItemRow();
            });

            // Save budget
            $('#saveBudgetBtn').off('click').on('click', function () {
                self.saveBudget();
            });

            // Add first budget item row
            this.addBudgetItemRow();

            // Calculate total on amount change
            $(document).on('input', '.budget-item-amount', function () {
                self.calculateBudgetTotal();
            });
        },

        // Add budget item row
        addBudgetItemRow: function (preset = {}) {
            const html = `
        <div class="row budget-item-row mb-2">
            <div class="col-md-2">
                <select class="form-select budget-item-group" required>
                    <option value="">Select Group</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select budget-item-ledger" required disabled>
                    <option value="">Select Group First</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control budget-item-amount" placeholder="Budget Amount" 
                       min="0" step="0.01" required>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control budget-item-description" 
                       placeholder="Description (optional)">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-sm remove-item">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;

            $('#budgetItemsContainer').append(html);

            const $newRow = $('#budgetItemsContainer .budget-item-row').last();
            const $groupSelect = $newRow.find('.budget-item-group');
            const $ledgerSelect = $newRow.find('.budget-item-ledger');

            // Load groups
            TempleAPI.get('/fund-budgets/groups')
                .done(function (response) {
                    if (response.success) {
                        response.data.forEach(g => {
                            $groupSelect.append(`<option value="${g.id}">${g.name} (${g.code})</option>`);
                        });

                        //  Wait until groups loaded, then preselect
                        if (preset.group_id) {
                            $groupSelect.val(preset.group_id);
                            // Trigger ledger load automatically
                            $groupSelect.trigger('change');
                        }
                    }
                });

            // When a group is selected, load its ledgers
            $groupSelect.on('change', function () {
                const groupId = $(this).val();
                $ledgerSelect.prop('disabled', true).empty();

                if (groupId) {
                    TempleAPI.get(`/fund-budgets/ledgers/${groupId}`)
                        .done(function (response) {
                            if (response.success) {
                                $ledgerSelect.append('<option value="">Select Ledger</option>');
                                response.data.forEach(l => {
                                    $ledgerSelect.append(`<option value="${l.id}">${l.name}</option>`);
                                });

                                $ledgerSelect.prop('disabled', false);

                                // ✅ Preselect ledger when editing
                                if (preset.ledger_id) {
                                    $ledgerSelect.val(preset.ledger_id);
                                }
                            }
                        });
                } else {
                    $ledgerSelect.append('<option value="">Select Group First</option>');
                }
            });

            // Set amount and description if provided
            if (preset.amount) $newRow.find('.budget-item-amount').val(preset.amount);
            if (preset.description) $newRow.find('.budget-item-description').val(preset.description);

            // Remove row
            $newRow.find('.remove-item').on('click', function () {
                $(this).closest('.budget-item-row').remove();
                FundBudgetsPage.calculateBudgetTotal();
            });
        },



        // Calculate budget total
        calculateBudgetTotal: function () {
            let total = 0;
            $('.budget-item-amount').each(function () {
                const amount = parseFloat($(this).val()) || 0;
                total += amount;
            });
            $('#budgetAmount').val(total.toFixed(2));
        },

        // Save budget
        saveBudget: function () {
            const token = localStorage.getItem('access_token');

            // Collect budget items
            const budgetItems = [];
            let isValid = true;

            $('.budget-item-row').each(function () {
                const ledgerId = $(this).find('.budget-item-ledger').val();
                const amount = $(this).find('.budget-item-amount').val();
                const description = $(this).find('.budget-item-description').val();

                if (!ledgerId || !amount) {
                    isValid = false;
                    return false;
                }

                budgetItems.push({
                    ledger_id: ledgerId,
                    amount: parseFloat(amount),
                    description: description
                });
            });

            if (!isValid) {
                TempleCore.showToast('Please fill all required fields', 'error');
                return;
            }

            const data = {
                fund_id: $('#budgetFundId').val(),
                budget_name: $('#budgetName').val(),
                budget_amount: parseFloat($('#budgetAmount').val()),
                from_date: $('#budgetFromDate').val(),
                to_date: $('#budgetToDate').val(),
                notes: $('#budgetNotes').val(),
                budget_items: budgetItems
            };

            // Validate required fields
            if (!data.fund_id || !data.budget_name || !data.from_date || !data.to_date) {
                TempleCore.showToast('Please fill all required fields', 'error');
                return;
            }

            const self = this;
            TempleAPI.request({
                endpoint: '/fund-budgets',
                method: 'POST',
                data: data
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Budget created successfully', 'success');
                        $('#createBudgetModal').modal('hide');
                        self.loadFundBudgets();

                        // Reset form
                        $('#createBudgetForm')[0].reset();
                        $('#budgetItemsContainer').empty();
                    }
                })
                .fail(function (xhr) {
                    let errorMessage = "Failed to create budget"; // Default fallback

                    if (xhr.responseJSON) {
                        // Case 1: Laravel validation errors
                        if (xhr.responseJSON.errors) {
                            const errors = xhr.responseJSON.errors;
                            // Join all validation error messages (handles multiple fields)
                            errorMessage = Object.values(errors).flat().join('<br>');
                        }
                        // Case 2: Laravel sends a general message
                        else if (xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                    }

                    TempleCore.showToast(errorMessage, 'error');
                });


        },

        // Show create recurring modal
        showCreateRecurringModal: function () {
            $('#createRecurringModal').modal('show');
            this.initCreateRecurringForm();
        },

        // Initialize create recurring form
        initCreateRecurringForm: function () {
            const self = this;

            // Recurrence type change
            $('#recurringType').on('change', function () {
                const type = $(this).val();
                const occurrences = $('#recurringOccurrences');

                if (type === 'WEEKLY') {
                    occurrences.attr('max', 52);
                    occurrences.attr('placeholder', 'Max 52 weeks');
                } else if (type === 'MONTHLY') {
                    occurrences.attr('max', 12);
                    occurrences.attr('placeholder', 'Max 12 months');
                }
            });

            // Generate recurring budgets preview
            $('#generatePreviewBtn').off('click').on('click', function () {
                self.generateRecurringPreview();
            });

            // Save recurring budgets
            $('#saveRecurringBtn').off('click').on('click', function () {
                self.saveRecurringBudgets();
            });
        },

        // Save recurring budgets
        saveRecurringBudgets: function () {
            const self = this;
            const token = localStorage.getItem('access_token');

            // Validate required fields
            const fundId = $('#recurringFundId').val();
            const baseName = $('#recurringBaseName').val();
            const recurrenceType = $('#recurringType').val();
            const occurrences = parseInt($('#recurringOccurrences').val());
            const startDate = $('#recurringStartDate').val();
            const duration = parseInt($('#recurringDuration').val());
            const templateId = $('#recurringTemplate').val();

            if (!fundId || !baseName || !recurrenceType || !occurrences || !startDate || !duration) {
                TempleCore.showToast('Please fill all required fields', 'error');
                return;
            }

            // Build budget items array
            // If using template, load template items
            // Otherwise, create a default structure
            const budgetItems = [];

            // For now, we'll need to collect budget items from the template or form
            // Since the preview doesn't show item editing yet, we'll create a simple structure
            if (templateId) {
                const template = this.templates.find(t => t.id == templateId);
                if (template && template.items) {
                    console.log(template.items);
                    template.items.forEach(item => {
                        // Create amounts array with same amount for all occurrences
                        const amounts = Array(occurrences).fill(parseFloat(item.default_amount));
                        budgetItems.push({
                            ledger_id: item.ledger_id,
                            amounts: amounts,
                            description: item.description
                        });
                    });
                }
            } else {
                // If no template, user must add items manually
                // For now, show error if no template selected
                TempleCore.showToast('Please select a template or add budget items', 'error');
                return;
            }

            if (budgetItems.length === 0) {
                TempleCore.showToast('Please add at least one budget item', 'error');
                return;
            }

            // Prepare data
            const data = {
                fund_id: fundId,
                template_id: templateId || null,
                base_name: baseName,
                recurrence_type: recurrenceType,
                occurrences: occurrences,
                start_date: startDate,
                duration_days: duration,
                budget_items: budgetItems
            };

            // Show loading
            $('#saveRecurringBtn').prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Creating...');

            // Send request
            TempleAPI.request({
                endpoint: '/fund-budgets/recurring',
                method: 'POST',
                data: data
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(`Successfully created ${response.data.created_count} recurring budgets`, 'success');
                        $('#createRecurringModal').modal('hide');
                        self.loadFundBudgets();

                        // Reset form
                        $('#createRecurringForm')[0].reset();
                        $('#recurringPreviewContainer').empty();
                    }
                })
                .fail(function (xhr) {
                    let errorMessage = "Failed to create recurring budgets";

                    if (xhr.responseJSON) {
                        if (xhr.responseJSON.errors) {
                            const errors = xhr.responseJSON.errors;
                            errorMessage = Object.values(errors).flat().join('<br>');
                        } else if (xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                    }

                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function () {
                    $('#saveRecurringBtn').prop('disabled', false).html('<i class="bi bi-save"></i> Create Budgets');
                });
        },

        // View budget details
        viewDetails: function (id) {
            const self = this;

            TempleAPI.request({
                endpoint: '/fund-budgets/' + id,
                method: 'GET'
            })
                .done(function (response) {
                    if (response.success) {
                        self.showBudgetDetails(response.data);
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast('Failed to load budget details', 'error');
                });
        },

        // Show budget details modal
        showBudgetDetails: function (data) {
            const budget = data.budget;
            const summary = data.summary;

            let itemsHtml = '';
            if (budget.budget_items && budget.budget_items.length > 0) {
                budget.budget_items.forEach(item => {
                    const percentage = item.utilization_percentage || 0;
                    const progressClass = percentage >= 90 ? 'danger' : percentage >= 75 ? 'warning' : 'success';

                    itemsHtml += `
                        <tr>
                            <td>${item.ledger ? item.ledger.name : '-'}</td>
                            <td class="text-end">${this.formatCurrency(item.budgeted_amount)}</td>
                            <td class="text-end">${this.formatCurrency(item.utilized_amount)}</td>
                            <td class="text-end">${this.formatCurrency(item.remaining_amount)}</td>
                            <td>
                                <div class="progress" style="height: 10px;">
                                    <div class="progress-bar bg-${progressClass}" style="width: ${percentage}%"></div>
                                </div>
                                <small>${percentage}%</small>
                            </td>
                        </tr>
                    `;
                });
            }

            const modalContent = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Budget Name:</strong> ${budget.budget_name}
                    </div>
                    <div class="col-md-6">
                        <strong>Job:</strong> ${budget.fund ? budget.fund.name : '-'}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Period:</strong> ${this.formatDate(budget.from_date)} - ${this.formatDate(budget.to_date)}
                    </div>
                    <div class="col-md-6">
                        <strong>Status:</strong> ${this.getStatusBadge(budget.status)}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-4">
                        <strong>Total Budget:</strong> ${this.formatCurrency(budget.budget_amount)}
                    </div>
                    <div class="col-md-4">
                        <strong>Utilized:</strong> ${this.formatCurrency(budget.utilized_amount)}
                    </div>
                    <div class="col-md-4">
                        <strong>Remaining:</strong> ${this.formatCurrency(budget.remaining_amount)}
                    </div>
                </div>
                
                <h6 class="mt-4">Budget Items</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Ledger</th>
                                <th class="text-end">Budget</th>
                                <th class="text-end">Used</th>
                                <th class="text-end">Remaining</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
            `;

            $('#viewDetailsModalBody').html(modalContent);
            $('#viewDetailsModal').modal('show');
        },

        // Edit budget
        editBudget: function (id) {
            const self = this;

            // Load budget details first
            TempleAPI.request({
                endpoint: '/fund-budgets/' + id,
                method: 'GET'
            })
                .done(function (response) {
                    if (response.success) {
                        const budget = response.data.budget;

                        // Populate the edit form
                        $('#budgetFundId').val(budget.fund_id);
                        $('#budgetName').val(budget.budget_name);
                        $('#budgetAmount').val(budget.budget_amount);
                        $('#budgetFromDate').val(budget.from_date);
                        $('#budgetToDate').val(budget.to_date);
                        $('#budgetNotes').val(budget.notes);

                        // Clear and populate budget items
                        $('#budgetItemsContainer').empty();
                        if (budget.budget_items && budget.budget_items.length > 0) {
                            budget.budget_items.forEach(function (item) {
                                self.addBudgetItemRow({
                                    group_id: item.ledger?.group_id || null,
                                    ledger_id: item.ledger_id,
                                    amount: item.budgeted_amount,
                                    description: item.description
                                });
                            });
                        }



                        // Change the save button to update mode
                        $('#saveBudgetBtn').off('click').on('click', function () {
                            self.updateBudget(id);
                        });

                        // Change modal title
                        $('#createBudgetModal .modal-title').text('Edit Fund Budget');

                        // Show modal
                        $('#createBudgetModal').modal('show');
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast('Failed to load budget details', 'error');
                });
        },

        // Update budget
        updateBudget: function (id) {
            const self = this;

            // Collect budget items
            const budgetItems = [];
            let isValid = true;

            $('.budget-item-row').each(function () {
                const ledgerId = $(this).find('.budget-item-ledger').val();
                const amount = $(this).find('.budget-item-amount').val();
                const description = $(this).find('.budget-item-description').val();

                if (!ledgerId || !amount) {
                    isValid = false;
                    return false;
                }

                budgetItems.push({
                    ledger_id: ledgerId,
                    amount: parseFloat(amount),
                    description: description
                });
            });

            if (!isValid) {
                TempleCore.showToast('Please fill all required fields in budget items', 'error');
                return;
            }

            const data = {
                fund_id: $('#budgetFundId').val(),
                budget_name: $('#budgetName').val(),
                budget_amount: parseFloat($('#budgetAmount').val()),
                from_date: $('#budgetFromDate').val(),
                to_date: $('#budgetToDate').val(),
                notes: $('#budgetNotes').val(),
                budget_items: budgetItems
            };

            // Validate required fields
            if (!data.fund_id || !data.budget_name || !data.from_date || !data.to_date) {
                TempleCore.showToast('Please fill all required fields', 'error');
                return;
            }

            TempleAPI.request({
                endpoint: '/fund-budgets/' + id,
                method: 'PUT',
                data: data
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Budget updated successfully', 'success');
                        $('#createBudgetModal').modal('hide');
                        self.loadFundBudgets();

                        // Reset form and button
                        $('#createBudgetForm')[0].reset();
                        $('#budgetItemsContainer').empty();
                        $('#createBudgetModal .modal-title').text('Create Fund Budget');
                        $('#saveBudgetBtn').off('click').on('click', function () {
                            self.saveBudget();
                        });
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error.message || 'Failed to update budget', 'error');
                });
        },

        // Submit budget for approval
        submitBudget: function (id) {
            const token = localStorage.getItem('access_token');

            Swal.fire({
                title: 'Submit Budget?',
                text: 'Submit this budget for approval?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Submit',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    const self = this;
                    TempleAPI.request({
                        endpoint: '/fund-budgets/' + id + '/submit',
                        method: 'POST'
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Budget submitted for approval', 'success');
                                self.loadFundBudgets();
                            }
                        })
                        .fail(function (xhr) {
                            TempleCore.showToast('Failed to submit budget', 'error');
                        });
                }
            });
        },

        // Approve budget
        approveBudget: function (id) {
            const token = localStorage.getItem('access_token');

            Swal.fire({
                title: 'Approve Budget?',
                input: 'textarea',
                inputLabel: 'Approval Notes (optional)',
                showCancelButton: true,
                confirmButtonText: 'Approve',
                confirmButtonColor: '#28a745'
            }).then((result) => {
                if (result.isConfirmed) {
                    const self = this;
                    TempleAPI.request({
                        endpoint: '/fund-budgets/' + id + '/approve',
                        method: 'POST',
                        data: {
                            action: 'approve',
                            notes: result.value
                        }
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Budget approved successfully', 'success');
                                self.loadFundBudgets();
                            }
                        })
                        .fail(function (xhr) {
                            TempleCore.showToast('Failed to approve budget', 'error');
                        });
                }
            });
        },

        // Reject budget
        rejectBudget: function (id) {
            const token = localStorage.getItem('access_token');

            Swal.fire({
                title: 'Reject Budget?',
                input: 'textarea',
                inputLabel: 'Rejection Reason',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Please provide a reason for rejection';
                    }
                },
                showCancelButton: true,
                confirmButtonText: 'Reject',
                confirmButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    const self = this;
                    TempleAPI.request({
                        endpoint: '/fund-budgets/' + id + '/approve',
                        method: 'POST',
                        data: {
                            action: 'reject',
                            notes: result.value
                        }
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Budget rejected', 'success');
                                self.loadFundBudgets();
                            }
                        })
                        .fail(function (xhr) {
                            TempleCore.showToast('Failed to reject budget', 'error');
                        });
                }
            });
        },

        // Close budget
        closeBudget: function (id) {
            const token = localStorage.getItem('access_token');

            Swal.fire({
                title: 'Close Budget?',
                text: 'Are you sure you want to close this budget?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Close',
                confirmButtonColor: '#6c757d'
            }).then((result) => {
                if (result.isConfirmed) {
                    const self = this;
                    TempleAPI.request({
                        endpoint: '/fund-budgets/' + id + '/close',
                        method: 'POST'
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Budget closed successfully', 'success');
                                self.loadFundBudgets();
                            }
                        })
                        .fail(function (xhr) {
                            TempleCore.showToast('Failed to close budget', 'error');
                        });
                }
            });
        },

        // Reopen budget
        reopenBudget: function (id) {
            const token = localStorage.getItem('access_token');

            Swal.fire({
                title: 'Reopen Budget?',
                input: 'textarea',
                inputLabel: 'Reason for reopening (optional)',
                showCancelButton: true,
                confirmButtonText: 'Reopen',
                confirmButtonColor: '#17a2b8'
            }).then((result) => {
                if (result.isConfirmed) {
                    const self = this;
                    TempleAPI.request({
                        endpoint: '/fund-budgets/' + id + '/reopen',
                        method: 'POST',
                        data: {
                            notes: result.value
                        }
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Budget reopened successfully', 'success');
                                self.loadFundBudgets();
                            }
                        })
                        .fail(function (xhr) {
                            TempleCore.showToast('Failed to reopen budget', 'error');
                        });
                }
            });
        },

        // Delete budget
        deleteBudget: function (id) {
            const token = localStorage.getItem('access_token');

            Swal.fire({
                title: 'Delete Budget?',
                text: 'This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete',
                confirmButtonColor: '#dc3545'
            }).then((result) => {
                if (result.isConfirmed) {
                    const self = this;
                    TempleAPI.request({
                        endpoint: '/fund-budgets/' + id,
                        method: 'DELETE'
                    })
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Budget deleted successfully', 'success');
                                self.loadFundBudgets();
                            }
                        })
                        .fail(function (xhr) {
                            TempleCore.showToast('Failed to delete budget', 'error');
                        });
                }
            });
        },

        // Get create budget modal HTML
        getCreateBudgetModal: function () {
            return `
                <div class="modal fade" id="createBudgetModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create Job Budget</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createBudgetForm">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Job <span class="text-danger">*</span></label>
                                            <select class="form-select" id="budgetFundId" required>
                                                <option value="">Select Job</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Budget Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="budgetName" 
                                                   placeholder="e.g., Ammavasai Pooja - January 2025" required>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <label class="form-label">From Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="budgetFromDate" required>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">To Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="budgetToDate" required>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Total Amount</label>
                                            <input type="number" class="form-control" id="budgetAmount" 
                                                   step="0.01" min="0" readonly>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="budgetNotes" rows="2"></textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <label class="form-label mb-0">Budget Items <span class="text-danger">*</span></label>
                                            <button type="button" class="btn btn-sm btn-success" id="addBudgetItem">
                                                <i class="bi bi-plus"></i> Add Item
                                            </button>
                                        </div>
                                        <div id="budgetItemsContainer"></div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveBudgetBtn">
                                    <i class="bi bi-save"></i> Save Budget
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // Get create recurring modal HTML
        getCreateRecurringModal: function () {
            return `
                <div class="modal fade" id="createRecurringModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create Recurring Job Budgets</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createRecurringForm">
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <label class="form-label">Job <span class="text-danger">*</span></label>
                                            <select class="form-select" id="recurringFundId" required>
                                                <option value="">Select Job</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Base Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="recurringBaseName" 
                                                   placeholder="e.g., Ammavasai Pooja" required>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Template</label>
                                            <select class="form-select" id="recurringTemplate">
                                                <option value="">No Template</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-3">
                                            <label class="form-label">Recurrence Type <span class="text-danger">*</span></label>
                                            <select class="form-select" id="recurringType" required>
                                                <option value="">Select Type</option>
                                                <option value="WEEKLY">Weekly</option>
                                                <option value="MONTHLY">Monthly</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Occurrences <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="recurringOccurrences" 
                                                   min="1" max="52" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Start Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="recurringStartDate" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Duration (days) <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="recurringDuration" 
                                                   min="1" max="30" value="1" required>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <button type="button" class="btn btn-info" id="generatePreviewBtn">
                                            <i class="bi bi-eye"></i> Generate Preview
                                        </button>
                                    </div>
                                    
                                    <div id="recurringPreviewContainer"></div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveRecurringBtn">
                                    <i class="bi bi-save"></i> Create Budgets
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        generateRecurringPreview: function () {
            const baseName = $('#recurringBaseName').val();
            const recurrenceType = $('#recurringType').val();
            const occurrences = $('#recurringOccurrences').val();
            const startDate = $('#recurringStartDate').val();
            const duration = $('#recurringDuration').val();

            // Basic validation to ensure all fields are filled
            if (!baseName || !recurrenceType || !occurrences || !startDate || !duration) {
                TempleCore.showToast('Please fill in all required fields', 'error');
                return;
            }

            // Generate a preview HTML for the recurring budget
            const previewHtml = `
        <div class="preview-container">
            <h5>Recurring Budget Preview</h5>
            <p><strong>Base Name:</strong> ${baseName}</p>
            <p><strong>Recurrence Type:</strong> ${recurrenceType}</p>
            <p><strong>Occurrences:</strong> ${occurrences} times</p>
            <p><strong>Start Date:</strong> ${startDate}</p>
            <p><strong>Duration:</strong> ${duration} days</p>
        </div>
    `;

            $('#recurringPreviewContainer').html(previewHtml);

            // Enable the save button
            $('#saveRecurringBtn').prop('disabled', false);
        },


        // Get view details modal HTML
        getViewDetailsModal: function () {
            return `
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Budget Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="viewDetailsModalBody">
                                <!-- Content will be loaded dynamically -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    // Initialize when document is ready
    $(document).ready(function () {
        // Check if we're on the fund budgets page
        if (window.location.hash === '#fund-budgets' || window.location.pathname.includes('fund-budgets')) {
            FundBudgetsPage.init();
        }
    });

})(jQuery, window);