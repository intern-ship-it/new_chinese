///js/pages/fund-budget-templates/index.js
// Fund Budget Templates Management


(function ($, window) {
    'use strict';

    window.FundBudgetTemplatesPage = {
        templates: [],
        funds: [],
        ledgers: [],
        currentTemplate: null,
        currentPage: 1,
        perPage: 20,
        totalPages: 1,
        templeCurrency: 'MYR',
        filters: {
            fund_id: null,
            is_active: null,
            search: ''
        },

        // Initialize
        init: function () {
            console.log('Initializing Fund Budget Templates');

            // Get temple settings
            const temple = JSON.parse(localStorage.getItem('temple') || '{}');
            this.templeCurrency = temple.currency || 'MYR';

            this.renderModals();
            this.renderModals();
            this.bindEvents();
            this.loadInitialData();
        },

        // Get currency symbol
        getCurrencySymbol: function () {
            const symbols = {
                'MYR': 'RM', 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£',
                'SGD': 'S$', 'JPY': '¥', 'CNY': '¥', 'CAD': 'C$', 'AUD': 'A$'
            };
            return symbols[this.templeCurrency] || this.templeCurrency;
        },

        // Format currency
        formatCurrency: function (amount) {
            return this.getCurrencySymbol() + ' ' + parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        // Format date
        formatDate: function (date) {
            return moment(date).format('DD/MM/YYYY HH:mm');
        },

        // Render modals HTML
        renderModals: function () {
            const modalsHtml = `
                <!-- Templates List Modal -->
                <div class="modal fade" id="templatesListModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header bg-warning text-dark">
                                <h5 class="modal-title">
                                    <i class="bi bi-file-text"></i> Fund Budget Templates
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Filters -->
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-3">
                                                <label class="form-label">Fund</label>
                                                <select class="form-select form-select-sm" id="templateFilterFund">
                                                    <option value="">All Funds</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Status</label>
                                                <select class="form-select form-select-sm" id="templateFilterStatus">
                                                    <option value="">All Status</option>
                                                    <option value="1">Active</option>
                                                    <option value="0">Inactive</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Search</label>
                                                <input type="text" class="form-control form-control-sm" 
                                                       id="templateSearchInput" placeholder="Search template name...">
                                            </div>
                                            <div class="col-md-2 d-flex align-items-end">
                                                <button class="btn btn-sm btn-primary w-100" id="templateApplyFiltersBtn">
                                                    <i class="bi bi-funnel"></i> Filter
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="mb-3 d-flex justify-content-between">
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-primary" id="createNewTemplateBtn">
                                            <i class="bi bi-plus-circle"></i> Create Template
                                        </button>
                                
                                  
                                    </div>
                                </div>

                                <!-- Templates List Container -->
                                <div id="templatesListContainer">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create/Edit Template Modal -->
                <div class="modal fade" id="templateFormModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="templateFormModalTitle">
                                    <i class="bi bi-file-text"></i> Create Template
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                                <form id="templateForm">
                                    <input type="hidden" id="templateId" value="">
                                    
                                    <!-- Basic Info -->
                                    <div class="row g-3 mb-4">
                                        <div class="col-md-4">
                                            <label class="form-label required">Template Name</label>
                                            <input type="text" class="form-control" id="templateName" 
                                                   required maxlength="255" placeholder="Enter template name">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label required">Fund</label>
                                            <select class="form-select" id="templateFund" required>
                                                <option value="">Select Fund</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Status</label>
                                            <div class="form-check form-switch mt-2">
                                                <input class="form-check-input" type="checkbox" 
                                                       id="templateIsActive" checked>
                                                <label class="form-check-label" for="templateIsActive">
                                                    <strong>Active</strong>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row g-3 mb-4">
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" id="templateDescription" 
                                                      rows="2" placeholder="Optional description"></textarea>
                                        </div>
                                    </div>

                                    <!-- Template Items -->
                                    <div class="card border-primary">
                                        <div class="card-header bg-light">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <h6 class="mb-0">
                                                    <i class="bi bi-list-ul"></i> Template Items
                                                    <span class="badge bg-primary ms-2" id="itemsCount">0</span>
                                                </h6>
                                                <button type="button" class="btn btn-sm btn-success" 
                                                        id="addTemplateItemBtn">
                                                    <i class="bi bi-plus-circle"></i> Add Item
                                                </button>
                                            </div>
                                        </div>
                                        <div class="card-body p-0">
                                            <div id="templateItemsTableContainer" class="table-responsive">
                                                <table class="table table-sm table-hover mb-0">
                                                    <thead class="table-light">
                                                        <tr>
                                                            <th width="5%">#</th>
                                                            <th width="35%">Ledger <span class="text-danger">*</span></th>
                                                            <th width="20%">Default Amount <span class="text-danger">*</span></th>
                                                            <th width="30%">Description</th>
                                                            <th width="10%" class="text-center">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="templateItemsBody">
                                                        <!-- Items will be added here -->
                                                    </tbody>
                                                    <tfoot class="table-light">
                                                        <tr>
                                                            <td colspan="2" class="text-end">
                                                                <strong>Total Amount:</strong>
                                                            </td>
                                                            <td colspan="3">
                                                                <strong id="totalTemplateAmount" class="text-primary fs-5">
                                                                    ${this.formatCurrency(0)}
                                                                </strong>
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                            <div id="noItemsMessage" class="alert alert-info m-3">
                                                <i class="bi bi-info-circle"></i> 
                                                No items added yet. Click "Add Item" to start building your template.
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="saveTemplateBtn">
                                    <i class="bi bi-save"></i> Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Template Modal -->
                <div class="modal fade" id="viewTemplateModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-eye"></i> Template Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="viewTemplateContent">
                                <!-- Content will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .required::after {
                        content: " *";
                        color: red;
                    }
                    
                    .template-row:hover {
                        background-color: #f8f9fa;
                    }
                    
                    #templateItemsBody tr:hover {
                        background-color: #f8f9fa;
                    }
                    
                    .modal-xl {
                        max-width: 95%;
                    }
                </style>
            `;

            // Append modals to body
            $('body').append(modalsHtml);
        },

        // Bind event handlers
        bindEvents: function () {
            const self = this;

            // Show templates list modal (from main page button)
            $(document).on('click', '#manageTemplatesBtn', function () {
                self.showTemplatesListModal();
            });

            // Create new template
            $(document).on('click', '#createNewTemplateBtn', function () {
                self.showTemplateFormModal();
            });

            // Add template item
            $(document).on('click', '#addTemplateItemBtn', function () {
                self.addTemplateItem();
            });

            // Remove template item
            $(document).on('click', '.remove-template-item-btn', function () {
                $(this).closest('tr').remove();
                self.updateItemNumbers();
                self.calculateTotal();
                self.checkItemsEmpty();
            });

            // Calculate total on amount change
            $(document).on('input', '.item-amount', function () {
                self.calculateTotal();
            });

            // Save template
            $(document).on('click', '#saveTemplateBtn', function () {
                self.saveTemplate();
            });

            // Apply filters
            $(document).on('click', '#templateApplyFiltersBtn', function () {
                self.applyFilters();
            });

            // Search on enter
            $(document).on('keypress', '#templateSearchInput', function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            // View template
            $(document).on('click', '.view-template-btn', function () {
                const id = $(this).data('id');
                self.viewTemplate(id);
            });

            // Edit template
            $(document).on('click', '.edit-template-btn', function () {
                const id = $(this).data('id');
                self.editTemplate(id);
            });

            // Delete template
            $(document).on('click', '.delete-template-btn', function () {
                const id = $(this).data('id');
                const name = $(this).data('name');
                self.deleteTemplate(id, name);
            });

            // Toggle status
            $(document).on('click', '.toggle-template-status-btn', function () {
                const id = $(this).data('id');
                const isActive = $(this).data('active');
                self.toggleTemplateStatus(id, isActive);
            });

            // Duplicate template
            $(document).on('click', '.duplicate-template-btn', function () {
                const id = $(this).data('id');
                self.duplicateTemplate(id);
            });
            // Pagination
            $(document).on('click', '.template-pagination-btn', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page > 0 && page <= self.totalPages) {
                    self.currentPage = page;
                    self.loadTemplates();
                }
            });

            // Close template form modal and return to list
            $('#templateFormModal').on('hidden.bs.modal', function () {
                // If list modal was open, refresh it
                if ($('#templatesListModal').hasClass('show')) {
                    self.loadTemplates();
                }
            });
        },

        // Load initial data
        loadInitialData: function () {
            this.loadFunds();
            this.loadLedgers();
        },

        // Show templates list modal
        showTemplatesListModal: function () {
            this.loadTemplates();
            $('#templatesListModal').modal('show');
        },

        // Load funds
        // loadFunds: function () {
        //     const self = this;

        //     $.ajax({
        //         url: API_BASE_URL + '/funds',
        //         method: 'GET',
        //         headers: {
        //             'Authorization': 'Bearer ' + localStorage.getItem('token'),
        //             'X-Temple-Slug': localStorage.getItem('temple_slug')
        //         },
        //         success: function (response) {
        //             if (response.success) {
        //                 self.funds = response.data;
        //                 self.populateFundDropdowns();
        //             }
        //         },
        //         error: function (xhr) {
        //             console.error('Error loading funds:', xhr);
        //         }
        //     });
        // },
        loadFunds: function () {
            const self = this;

            TempleAPI.get('/accounts/funds')
                .done(function (response) {
                    if (response.success) {
                        self.funds = response.data;
                        self.populateFundDropdowns();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load funds:', xhr);
                });
        },

        // Populate fund dropdowns
        populateFundDropdowns: function () {
            const options = this.funds.map(fund =>
                `<option value="${fund.id}">${fund.name}</option>`
            ).join('');

            $('#templateFilterFund, #templateFund').append(options);
        },

        // Load ledgers
        // loadLedgers: function () {
        //     const self = this;

        //     $.ajax({
        //         url: API_BASE_URL + '/ledgers',
        //         method: 'GET',
        //         headers: {
        //             'Authorization': 'Bearer ' + localStorage.getItem('token'),
        //             'X-Temple-Slug': localStorage.getItem('temple_slug')
        //         },
        //         data: {
        //             per_page: 1000,
        //             is_active: 1
        //         },
        //         success: function (response) {
        //             if (response.success) {
        //                 self.ledgers = response.data.data || response.data;
        //             }
        //         },
        //         error: function (xhr) {
        //             console.error('Error loading ledgers:', xhr);
        //         }
        //     });
        // },
        loadLedgers: function () {
            TempleAPI.get('/accounts/ledgers')
                .done((response) => {
                    if (response.success) {
                        // The actual array of ledgers is in response.data.data
                        this.ledgers = Array.isArray(response.data.data) ? response.data.data : [];
                    }
                })
                .fail((xhr) => {
                    console.error('Failed to load ledgers:', xhr);
                    this.ledgers = [];
                });
        },
        // Apply filters
        applyFilters: function () {
            this.filters.fund_id = $('#templateFilterFund').val();
            this.filters.is_active = $('#templateFilterStatus').val();
            this.filters.search = $('#templateSearchInput').val().trim();
            this.currentPage = 1;
            this.loadTemplates();
        },

        // Load templates
        // loadTemplates: function () {
        //     const self = this;

        //     const params = {
        //         page: this.currentPage,
        //         per_page: this.perPage
        //     };

        //     if (this.filters.fund_id) params.fund_id = this.filters.fund_id;
        //     if (this.filters.is_active !== '') params.is_active = this.filters.is_active;
        //     if (this.filters.search) params.search = this.filters.search;

        //     $('#templatesListContainer').html(`
        //         <div class="text-center py-5">
        //             <div class="spinner-border text-primary" role="status">
        //                 <span class="visually-hidden">Loading...</span>
        //             </div>
        //             <p class="mt-2 text-muted">Loading templates...</p>
        //         </div>
        //     `);

        //     $.ajax({
        //         url: API_BASE_URL + '/fund-budget-templates',
        //         method: 'GET',
        //         headers: {
        //             'Authorization': 'Bearer ' + localStorage.getItem('token'),
        //             'X-Temple-Slug': localStorage.getItem('temple_slug')
        //         },
        //         data: params,
        //         success: function (response) {
        //             if (response.success) {
        //                 self.templates = response.data.data;
        //                 self.totalPages = response.data.last_page;
        //                 self.renderTemplatesList();
        //             }
        //         },
        //         error: function (xhr) {
        //             const error = xhr.responseJSON?.message || 'Failed to load templates';
        //             $('#templatesListContainer').html(`
        //                 <div class="alert alert-danger">
        //                     <i class="bi bi-exclamation-triangle"></i> ${error}
        //                 </div>
        //             `);
        //         }
        //     });
        // },
        loadTemplates: function () {
            const self = this;

            const params = {
                page: this.currentPage,
                per_page: this.perPage
            };

            if (this.filters.fund_id) params.fund_id = this.filters.fund_id;
            if (this.filters.is_active !== '') params.is_active = this.filters.is_active;
            if (this.filters.search) params.search = this.filters.search;

            // Show loading spinner
            $('#templatesListContainer').html(`
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading templates...</p>
        </div>
    `);

            // Use TempleAPI helper instead of $.ajax
            TempleAPI.get('/fund-budget-templates', params)
                .done((response) => {
                    if (response.success) {
                        // Ensure it's an array
                        self.templates = Array.isArray(response.data.data) ? response.data.data : [];
                        self.totalPages = response.data.last_page || 1;
                        self.renderTemplatesList();
                    } else {
                        $('#templatesListContainer').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${response.message || 'Failed to load templates'}
                    </div>
                `);
                    }
                })
                .fail((xhr) => {
                    const error = xhr.responseJSON?.message || 'Failed to load templates';
                    $('#templatesListContainer').html(`
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${error}
                </div>
            `);
                });
        },

        // Render templates list
        renderTemplatesList: function () {
            if (this.templates.length === 0) {
                $('#templatesListContainer').html(`
                    <div class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
                        <p class="text-muted mt-3 mb-4">No templates found</p>
                        <button class="btn btn-primary" id="createNewTemplateBtn">
                            <i class="bi bi-plus-circle"></i> Create Your First Template
                        </button>
                    </div>
                `);
                return;
            }

            const rows = this.templates.map(template => {
                const statusBadge = template.is_active
                    ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Active</span>'
                    : '<span class="badge bg-secondary"><i class="bi bi-pause-circle"></i> Inactive</span>';

                return `
                    <tr class="template-row">
                        <td>
                            <strong class="text-primary">${template.template_name}</strong>
                            ${template.description ? `<br><small class="text-muted">${template.description}</small>` : ''}
                        </td>
                        <td><span class="badge bg-info">${template.fund?.name || '-'}</span></td>
                        <td class="text-center"><span class="badge bg-secondary">${template.items_count || 0}</span></td>
                        <td class="text-end"><strong>${this.formatCurrency(template.total_amount || 0)}</strong></td>
                        <td class="text-center"><span class="badge bg-primary">${template.times_used || 0}</span></td>
                        <td class="text-center">${statusBadge}</td>
                        <td><small>${this.formatDate(template.created_at)}</small></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-info view-template-btn" data-id="${template.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-primary edit-template-btn" data-id="${template.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-warning duplicate-template-btn" data-id="${template.id}" title="Duplicate">
                                    <i class="bi bi-files"></i>
                                </button>
                             
                                <button class="btn btn-outline-${template.is_active ? 'secondary' : 'success'} toggle-template-status-btn" 
                                        data-id="${template.id}" data-active="${template.is_active}"
                                        title="${template.is_active ? 'Deactivate' : 'Activate'}">
                                    <i class="bi bi-${template.is_active ? 'pause' : 'play'}-fill"></i>
                                </button>
                                <button class="btn btn-outline-danger delete-template-btn" 
                                        data-id="${template.id}" data-name="${template.template_name}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            const html = `
                <div class="table-responsive">
                    <table class="table table-hover table-sm align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Template Name</th>
                                <th>Fund</th>
                                <th class="text-center">Items</th>
                                <th class="text-end">Total Amount</th>
                                <th class="text-center">Times Used</th>
                                <th class="text-center">Status</th>
                                <th>Created</th>
                                <th style="width: 280px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
                ${this.renderPagination()}
            `;

            $('#templatesListContainer').html(html);
        },

        // Render pagination
        renderPagination: function () {
            if (this.totalPages <= 1) return '';

            let pages = [];
            const maxPages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
            let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

            if (endPage - startPage < maxPages - 1) {
                startPage = Math.max(1, endPage - maxPages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(`
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link template-pagination-btn" href="#" data-page="${i}">${i}</a>
                    </li>
                `);
            }

            return `
                <nav class="mt-3">
                    <ul class="pagination pagination-sm justify-content-center">
                        <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                            <a class="page-link template-pagination-btn" href="#" data-page="${this.currentPage - 1}">Previous</a>
                        </li>
                        ${pages.join('')}
                        <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                            <a class="page-link template-pagination-btn" href="#" data-page="${this.currentPage + 1}">Next</a>
                        </li>
                    </ul>
                </nav>
            `;
        },

        // Show template form modal
        showTemplateFormModal: function (template = null) {
            this.currentTemplate = template;

            if (template) {
                $('#templateFormModalTitle').html('<i class="bi bi-pencil"></i> Edit Template');
                $('#templateId').val(template.id);
                $('#templateName').val(template.template_name);
                $('#templateFund').val(template.fund_id);
                $('#templateDescription').val(template.description || '');
                $('#templateIsActive').prop('checked', template.is_active);

                // Load items
                $('#templateItemsBody').empty();
                if (template.items && template.items.length > 0) {
                    template.items.forEach(item => {
                        this.addTemplateItem(item);
                    });
                }
            } else {
                $('#templateFormModalTitle').html('<i class="bi bi-plus-circle"></i> Create Template');
                $('#templateForm')[0].reset();
                $('#templateId').val('');
                $('#templateItemsBody').empty();
                $('#templateIsActive').prop('checked', true);
            }

            this.checkItemsEmpty();
            this.calculateTotal();
            $('#templateFormModal').modal('show');
        },

        // Add template item row
        addTemplateItem: function (item = null) {
            const itemNumber = $('#templateItemsBody tr').length + 1;
            const ledgersArray = Array.isArray(this.ledgers) ? this.ledgers : [];

            const ledgerOptions = ledgersArray.map(ledger =>
                `<option value="${ledger.id}" ${item && item.ledger_id === ledger.id ? 'selected' : ''}>
        ${ledger.name}
    </option>`
            ).join('');


            const row = `
                <tr>
                    <td class="text-center item-number">${itemNumber}</td>
                    <td>
                        <select class="form-select form-select-sm item-ledger" required>
                            <option value="">Select Ledger</option>
                            ${ledgerOptions}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm item-amount" 
                               value="${item?.default_amount || 0}" step="0.01" min="0" required>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm item-description" 
                               value="${item?.description || ''}" placeholder="Optional">
                    </td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-template-item-btn">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;

            $('#templateItemsBody').append(row);
            this.checkItemsEmpty();
            this.calculateTotal();
        },

        // Update item numbers
        updateItemNumbers: function () {
            $('#templateItemsBody tr').each(function (index) {
                $(this).find('.item-number').text(index + 1);
            });
            $('#itemsCount').text($('#templateItemsBody tr').length);
        },

        // Check if items empty
        checkItemsEmpty: function () {
            const hasItems = $('#templateItemsBody tr').length > 0;
            $('#noItemsMessage').toggleClass('d-none', hasItems);
            $('#templateItemsTableContainer').toggleClass('d-none', !hasItems);
            $('#itemsCount').text($('#templateItemsBody tr').length);
        },

        // Calculate total
        calculateTotal: function () {
            let total = 0;
            $('.item-amount').each(function () {
                total += parseFloat($(this).val() || 0);
            });
            $('#totalTemplateAmount').text(this.formatCurrency(total));
        },

        // Save template
        // saveTemplate: function () {
        //     const self = this;

        //     // Validate form
        //     if (!$('#templateForm')[0].checkValidity()) {
        //         $('#templateForm')[0].reportValidity();
        //         return;
        //     }

        //     // Get items
        //     const items = [];
        //     let hasError = false;
        //     const usedLedgers = new Set();

        //     $('#templateItemsBody tr').each(function (index) {
        //         const ledgerId = $(this).find('.item-ledger').val();
        //         const amount = $(this).find('.item-amount').val();
        //         const description = $(this).find('.item-description').val();

        //         if (!ledgerId || !amount) {
        //             hasError = true;
        //             return false;
        //         }

        //         // Check for duplicate ledgers
        //         if (usedLedgers.has(ledgerId)) {
        //             toastr.error('Duplicate ledgers are not allowed');
        //             hasError = true;
        //             return false;
        //         }
        //         usedLedgers.add(ledgerId);

        //         items.push({
        //             ledger_id: parseInt(ledgerId),
        //             default_amount: parseFloat(amount),
        //             description: description,
        //             sort_order: index
        //         });
        //     });

        //     if (hasError) return;

        //     if (items.length === 0) {
        //         toastr.error('Please add at least one item');
        //         return;
        //     }

        //     // Prepare data
        //     const data = {
        //         fund_id: parseInt($('#templateFund').val()),
        //         template_name: $('#templateName').val(),
        //         description: $('#templateDescription').val(),
        //         is_active: $('#templateIsActive').is(':checked'),
        //         items: items
        //     };

        //     const templateId = $('#templateId').val();
        //     const url = templateId
        //         ? TempleAPI.getBaseUrl() + '/fund-budget-templates/' + templateId
        //         : TempleAPI.getBaseUrl() + '/fund-budget-templates';
        //     const method = templateId ? 'PUT' : 'POST';

        //     // Show loading
        //     $('#saveTemplateBtn').prop('disabled', true).html(
        //         '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
        //     );

        //     $.ajax({
        //         url: url,
        //         method: method,
        //         headers: {
        //             'Authorization': 'Bearer ' + localStorage.getItem('token'),
        //             'X-Temple-Slug': localStorage.getItem('temple_slug'),
        //             'Content-Type': 'application/json'
        //         },
        //         data: JSON.stringify(data),
        //         success: function (response) {
        //             if (response.success) {
        //                 toastr.success(response.message || 'Template saved successfully');
        //                 $('#templateFormModal').modal('hide');
        //                 self.loadTemplates();
        //             }
        //         },
        //         error: function (xhr) {
        //             const errors = xhr.responseJSON?.errors;
        //             if (errors) {
        //                 Object.values(errors).forEach(errorArray => {
        //                     errorArray.forEach(error => toastr.error(error));
        //                 });
        //             } else {
        //                 toastr.error(xhr.responseJSON?.message || 'Failed to save template');
        //             }
        //         },
        //         complete: function () {
        //             $('#saveTemplateBtn').prop('disabled', false).html(
        //                 '<i class="bi bi-save"></i> Save Template'
        //             );
        //         }
        //     });
        // },
        saveTemplate: function () {
            const self = this;

            // Validate form
            if (!$('#templateForm')[0].checkValidity()) {
                $('#templateForm')[0].reportValidity();
                return;
            }

            // Get items
            const items = [];
            let hasError = false;
            const usedLedgers = new Set();

            $('#templateItemsBody tr').each(function (index) {
                const ledgerId = $(this).find('.item-ledger').val();
                const amount = $(this).find('.item-amount').val();
                const description = $(this).find('.item-description').val();

                if (!ledgerId || !amount) {
                    hasError = true;
                    return false;
                }

                if (usedLedgers.has(ledgerId)) {

                    TempleCore.showToast('Duplicate ledgers are not allowed', 'error');
                    hasError = true;
                    return false;
                }
                usedLedgers.add(ledgerId);

                items.push({
                    ledger_id: parseInt(ledgerId),
                    default_amount: parseFloat(amount),
                    description: description,
                    sort_order: index
                });
            });

            if (hasError) return;
            if (items.length === 0) {

                TempleCore.showToast('Please add at least one item', 'error');
                return;
            }

            // Prepare data
            const data = {
                fund_id: parseInt($('#templateFund').val()),
                template_name: $('#templateName').val(),
                description: $('#templateDescription').val(),
                is_active: $('#templateIsActive').is(':checked'),
                items: items
            };

            const templateId = $('#templateId').val();
            const url = templateId
                ? `/fund-budget-templates/${templateId}`
                : '/fund-budget-templates';
            const method = templateId ? 'PUT' : 'POST';

            // Show loading
            $('#saveTemplateBtn').prop('disabled', true).html(
                '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
            );

            // Use TempleAPI instead of $.ajax
            // TempleAPI.request(url, method, data)
            TempleAPI.request({
                endpoint: url,
                method: method,
                data: data
            }).done(function (response) {
                if (response.success) {

                    TempleCore.showToast('Template saved successfully', 'success');
                    $('#templateFormModal').modal('hide');
                    self.loadTemplates();
                }
            })
                .fail(function (xhr) {
                    const errors = xhr.responseJSON?.errors;
                    if (errors) {
                        Object.values(errors).forEach(errorArray => {
                            errorArray.forEach(error => TempleCore.showToast(error, 'error'));
                        });
                    } else {
                        const error = xhr.responseJSON;
                        TempleCore.showToast(error.message || 'Failed to save template', 'error');
                    }
                })
                .always(function () {
                    $('#saveTemplateBtn').prop('disabled', false).html(
                        '<i class="bi bi-save"></i> Save Template'
                    );
                });
        },

        // View template
        viewTemplate: function (id) {
            const self = this;

            TempleAPI.request({
                endpoint: `/fund-budget-templates/${id}`,
                method: 'GET'
            })
                .done(function (response) {
                    if (response.success) {
                        self.renderViewTemplate(response.data);
                    }
                })
                .fail(function (error) {

                    TempleCore.showToast(error?.message || 'Failed to load template', 'error');

                });
        },

        // Render view template
        renderViewTemplate: function (template) {
            const statusBadge = template.is_active
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';

            const items = template.items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.ledger?.name || '-'}</td>
                    <td class="text-end">${this.formatCurrency(item.default_amount)}</td>
                    <td>${item.description || '-'}</td>
                </tr>
            `).join('');

            const html = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Template Name:</strong><br>
                        ${template.template_name}
                    </div>
                    <div class="col-md-6">
                        <strong>Fund:</strong><br>
                        ${template.fund?.name || '-'}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Status:</strong><br>
                        ${statusBadge}
                    </div>
                    <div class="col-md-6">
                        <strong>Times Used:</strong><br>
                        <span class="badge bg-primary">${template.times_used || 0}</span>
                    </div>
                </div>
                ${template.description ? `
                    <div class="row mb-3">
                        <div class="col-12">
                            <strong>Description:</strong><br>
                            ${template.description}
                        </div>
                    </div>
                ` : ''}
                <div class="row mb-3">
                    <div class="col-12">
                        <strong>Created:</strong> ${this.formatDate(template.created_at)}
                        ${template.creator ? ` by ${template.creator.name}` : ''}
                    </div>
                </div>
                <hr>
                <h6><strong>Template Items (${template.items_count || 0})</strong></h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th width="10%">#</th>
                                <th width="40%">Ledger</th>
                                <th width="20%" class="text-end">Amount</th>
                                <th width="30%">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items}
                        </tbody>
                        <tfoot class="table-light">
                            <tr>
                                <td colspan="2" class="text-end"><strong>Total:</strong></td>
                                <td class="text-end"><strong>${this.formatCurrency(template.total_amount)}</strong></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            $('#viewTemplateContent').html(html);
            $('#viewTemplateModal').modal('show');
        },

        // Edit template
        editTemplate: function (id) {
            const self = this;

            TempleAPI.request({
                endpoint: `/fund-budget-templates/${id}`,
                method: 'GET'
            })
                .done(function (response) {
                    if (response.success) {
                        self.showTemplateFormModal(response.data);
                    }
                })
                .fail(function (error) {

                    TempleCore.showToast(error?.message || 'Failed to load template', 'error');

                });
        },


        // Delete template
        deleteTemplate: function (id, name) {
            const self = this;

            if (!confirm(`Are you sure you want to delete template "${name}"? This action cannot be undone.`)) {
                return;
            }

            TempleAPI.request({
                endpoint: `/fund-budget-templates/${id}`,
                method: 'DELETE'
            })
                .done(function (response) {
                    if (response.success) {

                        TempleCore.showToast(error?.message || 'Template deleted successfully', 'success');

                        self.loadTemplates();
                    }
                })
                .fail(function (error) {


                    TempleCore.showToast(error?.message || 'Failed to delete template', 'error');
                });
        },


        // Toggle template status
        toggleTemplateStatus: function (id, currentStatus) {
            const self = this;
            const action = currentStatus ? 'deactivate' : 'activate';

            TempleAPI.request({
                endpoint: `/fund-budget-templates/${id}/${action}`,
                method: 'POST'
            })
                .done(function (response) {
                    if (response.success) {

                        TempleCore.showToast(`Template ${action}d successfully`, 'success');

                        self.loadTemplates();
                    }
                })
                .fail(function (error) {

                    TempleCore.showToast(error?.message || 'Failed to update template status', 'error');
                });
        },

        // Duplicate template
        duplicateTemplate: function (id) {
            const self = this;

            TempleAPI.request({
                endpoint: `/fund-budget-templates/${id}`,
                method: 'GET'
            })
                .done(function (response) {
                    if (response.success) {
                        const template = response.data;
                        template.template_name = template.template_name + ' (Copy)';
                        template.id = null; // Reset ID for duplication
                        self.showTemplateFormModal(template);
                    }
                })
                .fail(function (error) {

                    TempleCore.showToast(error?.message || 'Failed to duplicate template', 'error');
                });
        },



    };

    // Initialize when document is ready
    $(document).ready(function () {
        window.FundBudgetTemplatesPage.init();
    });

})(jQuery, window);