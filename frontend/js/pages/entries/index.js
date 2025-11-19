// Updated js/pages/entries/index.js - With Financial Year Restrictions
(function($, window) {
    'use strict';
    
    window.EntriesPage = {
        currentFilter: {
            entrytype_id: null,
            from_date: null,
            to_date: null,
            fund_id: null,
            search: '',
            page: 1,
            per_page: 20
        },
        
        entryTypes: [
            { id: 1, name: 'Receipt', code: 'REC', color: 'success', icon: 'cash-stack' },
            { id: 2, name: 'Payment', code: 'PAY', color: 'danger', icon: 'credit-card' },
            { id: 3, name: 'Contra', code: 'CON', color: 'info', icon: 'arrow-left-right' },
            { id: 4, name: 'Journal', code: 'JOR', color: 'warning', icon: 'journal-text' },
            { id: 5, name: 'Credit Note', code: 'CRN', color: 'secondary', icon: 'file-minus' },
            { id: 6, name: 'Debit Note', code: 'DBN', color: 'primary', icon: 'file-plus' },
            { id: 7, name: 'Inventory Journal', code: 'IVJ', color: 'dark', icon: 'box-seam' }
        ],
        
        canApprovePayments: false,
        pendingApprovalsCount: 0,
        viewModal: null,
        
        // Financial Year Data
        activeYear: null,
        isYearClosed: false,
        
        init: function() {
            const self = this;
            this.render();
            
            // Load active year first, then load other data
            this.loadActiveYear().then(function() {
                self.loadFunds();
                self.checkApprovalPermissions();
                self.loadEntries();
                self.bindEvents();
                self.initializeModal();
            }).fail(function() {
                TempleCore.showToast('Failed to load financial year data', 'error');
            });
        },
        
        loadActiveYear: function() {
            const self = this;
            const deferred = $.Deferred();
            
            TempleAPI.get('/accounts/chart-of-accounts/active_year')
                .done(function(response) {
                    if (response.success && response.data.active_year) {
                        self.activeYear = response.data.active_year;
                        self.isYearClosed = self.activeYear.has_closed == 1;
                        
                        // Set initial date values
                        self.setInitialDates();
                        
                        // Update UI based on year status
                        self.updateUIForYearStatus();
                        
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                })
                .fail(function() {
                    deferred.reject();
                });
            
            return deferred.promise();
        },
        
        setInitialDates: function() {
            const fromDate = this.activeYear.from_year_month;
            let toDate;
            
            if (this.isYearClosed) {
                // Year closed: use to_year_month
                toDate = this.activeYear.to_year_month;
            } else {
                // Year open: compare to_year_month with current date
                const toYearMonth = new Date(this.activeYear.to_year_month);
                const currentDate = new Date();
                
                if (toYearMonth > currentDate) {
                    toDate = this.activeYear.to_year_month;
                } else {
                    toDate = this.formatDate(currentDate);
                }
            }
            
            // Set the date inputs
            $('#filterFromDate').val(fromDate);
            $('#filterToDate').val(toDate);
            
            // Set in current filter
            this.currentFilter.from_date = fromDate;
            this.currentFilter.to_date = toDate;
            
            // Apply date restrictions
            this.applyDateRestrictions();
        },
        
        applyDateRestrictions: function() {
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            if (this.isYearClosed) {
                // Year closed restrictions
                $('#filterFromDate').attr('min', fromYearMonth);
                $('#filterFromDate').attr('max', toYearMonth);
                
                $('#filterToDate').attr('min', fromYearMonth);
                $('#filterToDate').attr('max', toYearMonth);
            } else {
                // Year open restrictions
                $('#filterFromDate').attr('min', fromYearMonth);
                $('#filterFromDate').removeAttr('max');
                
                $('#filterToDate').removeAttr('min');
                $('#filterToDate').removeAttr('max');
            }
            
            // Add change event to dynamically update restrictions
            this.updateDynamicDateRestrictions();
        },
        
        updateDynamicDateRestrictions: function() {
            const self = this;
            const fromYearMonth = this.activeYear.from_year_month;
            const toYearMonth = this.activeYear.to_year_month;
            
            $('#filterFromDate').off('change.dateRestriction').on('change.dateRestriction', function() {
                const fromDate = $(this).val();
                
                if (self.isYearClosed) {
                    // from_date can't be more than to_year_month
                    if (fromDate && fromDate > toYearMonth) {
                        $(this).val(toYearMonth);
                        TempleCore.showToast('From date cannot be after financial year end date', 'warning');
                    }
                    
                    // Update to_date min
                    $('#filterToDate').attr('min', fromDate || fromYearMonth);
                } else {
                    // Update to_date min
                    if (fromDate) {
                        $('#filterToDate').attr('min', fromDate);
                    }
                }
                
                // Validate to_date
                const toDate = $('#filterToDate').val();
                if (fromDate && toDate && toDate < fromDate) {
                    $('#filterToDate').val(fromDate);
                    TempleCore.showToast('To date cannot be before from date', 'warning');
                }
            });
            
            $('#filterToDate').off('change.dateRestriction').on('change.dateRestriction', function() {
                const toDate = $(this).val();
                const fromDate = $('#filterFromDate').val();
                
                if (self.isYearClosed) {
                    // to_date can't be more than to_year_month
                    if (toDate && toDate > toYearMonth) {
                        $(this).val(toYearMonth);
                        TempleCore.showToast('To date cannot be after financial year end date', 'warning');
                    }
                }
                
                // to_date can't be less than from_date
                if (toDate && fromDate && toDate < fromDate) {
                    $(this).val(fromDate);
                    TempleCore.showToast('To date cannot be before from date', 'warning');
                }
                
                // Update from_date max
                if (self.isYearClosed) {
                    const maxFromDate = toDate && toDate < toYearMonth ? toDate : toYearMonth;
                    $('#filterFromDate').attr('max', maxFromDate);
                } else {
                    if (toDate) {
                        $('#filterFromDate').attr('max', toDate);
                    }
                }
            });
        },
        
        updateUIForYearStatus: function() {
            if (this.isYearClosed) {
                // Show closed year alert
                this.showClosedYearAlert();
                
                // Disable new entry buttons
                this.disableNewEntryButtons();
            } else {
                // Remove any existing alert
                $('#closedYearAlert').remove();
                
                // Enable new entry buttons
                this.enableNewEntryButtons();
            }
        },
        
        showClosedYearAlert: function() {
            const alert = `
                <div class="alert alert-warning alert-dismissible fade show" id="closedYearAlert" role="alert">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                        <div>
                            <h5 class="alert-heading mb-1">Financial Year Closed</h5>
                            <p class="mb-0">
                                The financial year (${this.formatDateDisplay(this.activeYear.from_year_month)} to ${this.formatDateDisplay(this.activeYear.to_year_month)}) 
                                is closed. You cannot create, edit, delete, or copy entries for this period.
                            </p>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            
            // Insert alert after page title
            $('.page-title').closest('.row').after(alert);
        },
        
        disableNewEntryButtons: function() {
            $('.btn-create-entry').each(function() {
                $(this)
                    .prop('disabled', true)
                    .attr('title', 'Cannot create new entries - Financial year is closed')
                    .attr('data-bs-toggle', 'tooltip')
                    .addClass('disabled');
            });
            
            // Initialize tooltips
            $('[data-bs-toggle="tooltip"]').each(function() {
                new bootstrap.Tooltip(this);
            });
        },
        
        enableNewEntryButtons: function() {
            $('.btn-create-entry').each(function() {
                $(this)
                    .prop('disabled', false)
                    .removeAttr('title')
                    .removeAttr('data-bs-toggle')
                    .removeClass('disabled');
            });
        },
        
        formatDate: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        
        formatDateDisplay: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        },
        
        initializeModal: function() {
            const modalElement = document.getElementById('viewEntryModal');
            if (modalElement) {
                this.viewModal = new bootstrap.Modal(modalElement, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
                
                modalElement.addEventListener('hidden.bs.modal', function() {
                    $('#viewEntryContent').empty();
                });
            }
        },
        
        checkApprovalPermissions: function() {
            const self = this;
            TempleAPI.get('/accounts/entries/pending-approvals', { per_page: 1 })
                .done(function(response) {
                    if (response.success) {
                        self.canApprovePayments = true;
                        self.pendingApprovalsCount = response.data.total || 0;
                        self.updateApprovalButton();
                    }
                })
                .fail(function(jqXHR) {
                    if (jqXHR.status === 403) {
                        self.canApprovePayments = false;
                        self.updateApprovalButton();
                    }
                });
        },
        
        updateApprovalButton: function() {
            if (this.canApprovePayments) {
                const badge = this.pendingApprovalsCount > 0 
                    ? `<span class="badge bg-warning ms-2">${this.pendingApprovalsCount}</span>` 
                    : '';
                
                $('#paymentApprovalBtn').html(`
                    <i class="bi bi-check2-square"></i> Payment Approvals${badge}
                `).show();
            } else {
                $('#paymentApprovalBtn').hide();
            }
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-journal-bookmark"></i> Accounting Entries
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button class="btn btn-warning" id="paymentApprovalBtn" style="display:none;">
                                <i class="bi bi-check2-square"></i> Payment Approvals
                            </button>
                        </div>
                    </div>
                    
                    <!-- Entry Type Tabs -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="btn-group w-100 entry-type-tabs" role="group">
                                <button type="button" class="btn btn-outline-primary active" data-type="">
                                    <i class="bi bi-list"></i> All Entries
                                </button>
                                ${this.entryTypes.map(type => `
                                    <button type="button" class="btn btn-outline-${type.color}" data-type="${type.id}">
                                        <i class="bi bi-${type.icon}"></i> ${type.name}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterFromDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterToDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Fund</label>
                                    <select class="form-select" id="filterFund">
                                        <option value="">All Funds</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Search</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="searchEntry" placeholder="Entry code, narration...">
                                        <button class="btn btn-primary" id="btnSearch">
                                            <i class="bi bi-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Actions Bar -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="btn-group">
                                    ${this.entryTypes.map(type => `
                                        <button class="btn btn-${type.color} btn-create-entry" data-type="${type.id}">
                                            <i class="bi bi-plus-circle"></i> New ${type.name}
                                        </button>
                                    `).join('')}
                                </div>
                                <div>
                                    <button class="btn btn-outline-secondary" id="btnExport">
                                        <i class="bi bi-download"></i> Export
                                    </button>
                                    <button class="btn btn-outline-secondary" id="btnPrint">
                                        <i class="bi bi-printer"></i> Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Entries Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="entriesTable">
                                    <thead>
                                        <tr>
                                            <th width="120">Date</th>
                                            <th width="150">Entry Code</th>
                                            <th width="120">Type</th>
                                            <th>Particulars</th>
                                            <th width="120">Fund</th>
                                            <th width="120" class="text-end">Debit</th>
                                            <th width="120" class="text-end">Credit</th>
                                            <th width="150">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="entriesTableBody">
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
                            
                            <!-- Pagination -->
                            <div id="paginationContainer" class="mt-3"></div>
                        </div>
                    </div>
                </div>
                
                <!-- View Entry Modal -->
                <div class="modal fade" id="viewEntryModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Entry Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="viewEntryContent">
                                <!-- Content will be loaded dynamically -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="btnPrintEntry">
                                    <i class="bi bi-printer"></i> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadFunds: function() {
            TempleAPI.get('/accounts/funds')
                .done(function(response) {
                    if (response.success) {
                        const options = response.data.map(fund => 
                            `<option value="${fund.id}">${fund.name} (${fund.code})</option>`
                        ).join('');
                        $('#filterFund').append(options);
                    }
                });
        },
        
        loadEntries: function() {
            const self = this;
            
            TempleAPI.get('/accounts/entries', this.currentFilter)
                .done(function(response) {
                    if (response.success) {
                        self.renderEntries(response.data);
                        self.checkApprovalPermissions();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load entries', 'error');
                });
        },
        
        renderEntries: function(data) {
            const self = this;
            const entries = data.data || [];
            
            if (entries.length === 0) {
                $('#entriesTableBody').html(`
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">
                            <i class="bi bi-inbox fs-1"></i>
                            <p>No entries found</p>
                        </td>
                    </tr>
                `);
                return;
            }
            
            const rows = entries.map(entry => {
                const typeInfo = this.entryTypes.find(t => t.id == entry.entrytype_id) || {};
                
                // Determine if actions should be disabled
                const canEdit = entry.can_edit && !self.isYearClosed;
                const canDelete = entry.can_delete && !self.isYearClosed;
                const canCopy = !self.isYearClosed;
                
                const isApprovedEntry = entry.inv_type == 11;
                const approvalBadge = isApprovedEntry ? '<span class="badge bg-success ms-2" title="Approved Payment">Approved</span>' : '';
                
                return `
                    <tr>
                        <td>${TempleCore.formatDate(entry.date)}</td>
                        <td>
                            <code>${entry.entry_code}</code>
                            ${approvalBadge}
                        </td>
                        <td>
                            <span class="badge bg-${typeInfo.color}">
                                <i class="bi bi-${typeInfo.icon}"></i> ${typeInfo.name}
                            </span>
                        </td>
                        <td>
                            ${entry.narration || entry.paid_to || '-'}
                            ${entry.inv_type && entry.inv_type != 11 ? '<span class="badge bg-info ms-2">From Booking</span>' : ''}
                        </td>
                        <td>${entry.fund?.name || '-'}</td>
                        <td class="text-end">${TempleCore.formatCurrency(entry.dr_total)}</td>
                        <td class="text-end">${TempleCore.formatCurrency(entry.cr_total)}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-info btn-view" data-id="${entry.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-primary btn-print" data-id="${entry.id}" data-type="${entry.entrytype_id}" title="Print">
                                    <i class="bi bi-printer"></i>
                                </button>
                                ${canEdit ? `
                                    <button class="btn btn-warning btn-edit" data-id="${entry.id}" data-type="${entry.entrytype_id}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : (entry.can_edit ? `
                                    <button class="btn btn-warning disabled" title="Cannot edit - Financial year is closed" data-bs-toggle="tooltip">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : '')}
                                ${canCopy ? `
                                    <button class="btn btn-success btn-copy" data-id="${entry.id}" data-type="${entry.entrytype_id}" title="Copy">
                                        <i class="bi bi-files"></i>
                                    </button>
                                ` : `
                                    <button class="btn btn-success disabled" title="Cannot copy - Financial year is closed" data-bs-toggle="tooltip">
                                        <i class="bi bi-files"></i>
                                    </button>
                                `}
                                ${canDelete ? `
                                    <button class="btn btn-danger btn-delete" data-id="${entry.id}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : (entry.can_delete ? `
                                    <button class="btn btn-danger disabled" title="Cannot delete - Financial year is closed" data-bs-toggle="tooltip">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : '')}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            $('#entriesTableBody').html(rows);
            
            // Initialize tooltips
            $('[data-bs-toggle="tooltip"]').each(function() {
                new bootstrap.Tooltip(this);
            });
            
            this.renderPagination(data);
        },
        
        renderPagination: function(data) {
            if (data.last_page <= 1) {
                $('#paginationContainer').empty();
                return;
            }
            
            let paginationHtml = `
                <nav>
                    <ul class="pagination justify-content-center">
                        <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                        </li>
            `;
            
            for (let i = 1; i <= data.last_page; i++) {
                if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    paginationHtml += `
                        <li class="page-item ${i === data.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }
            
            paginationHtml += `
                        <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                            <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                        </li>
                    </ul>
                </nav>
            `;
            
            $('#paginationContainer').html(paginationHtml);
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#paymentApprovalBtn').on('click', function() {
                TempleRouter.navigate('entries/payment-approval');
            });
            
            $('.entry-type-tabs button').on('click', function() {
                $('.entry-type-tabs button').removeClass('active');
                $(this).addClass('active');
                
                self.currentFilter.entrytype_id = $(this).data('type') || null;
                self.currentFilter.page = 1;
                self.loadEntries();
            });
            
            $('#filterFromDate, #filterToDate, #filterFund').on('change', function() {
                self.currentFilter.from_date = $('#filterFromDate').val();
                self.currentFilter.to_date = $('#filterToDate').val();
                self.currentFilter.fund_id = $('#filterFund').val();
                self.currentFilter.page = 1;
                self.loadEntries();
            });
            
            $('#btnSearch').on('click', function() {
                self.currentFilter.search = $('#searchEntry').val();
                self.currentFilter.page = 1;
                self.loadEntries();
            });
            
            $('#searchEntry').on('keypress', function(e) {
                if (e.which === 13) {
                    $('#btnSearch').click();
                }
            });
            
            $(document).on('click', '.btn-create-entry', function() {
                if (self.isYearClosed) {
                    TempleCore.showToast('Cannot create new entries - Financial year is closed', 'warning');
                    return;
                }
                
                const entryType = $(this).data('type');
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                
                TempleRouter.navigate(`entries/${typeMap[entryType]}/create`);
            });
            
            $(document).on('click', '.btn-view', function() {
                const entryId = $(this).data('id');
                self.viewEntry(entryId);
            });
            
            $(document).on('click', '.btn-edit', function() {
                if (self.isYearClosed) {
                    TempleCore.showToast('Cannot edit entries - Financial year is closed', 'warning');
                    return;
                }
                
                const entryId = $(this).data('id');
                const entryType = $(this).data('type');
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                
                TempleRouter.navigate(`entries/${typeMap[entryType]}/edit`, { id: entryId });
            });
            
            $(document).on('click', '.btn-copy', function() {
                if (self.isYearClosed) {
                    TempleCore.showToast('Cannot copy entries - Financial year is closed', 'warning');
                    return;
                }
                
                const entryId = $(this).data('id');
                const entryType = $(this).data('type');
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                
                TempleRouter.navigate(`entries/${typeMap[entryType]}/copy`, { id: entryId });
            });
            
            $(document).on('click', '.btn-delete', function() {
                if (self.isYearClosed) {
                    TempleCore.showToast('Cannot delete entries - Financial year is closed', 'warning');
                    return;
                }
                
                const entryId = $(this).data('id');
                
                TempleCore.showConfirm(
                    'Delete Entry',
                    'Are you sure you want to delete this entry? This action cannot be undone.',
                    function() {
                        self.deleteEntry(entryId);
                    }
                );
            });
            
            $(document).on('click', '.btn-print', function() {
                const entryId = $(this).data('id');
                const entryType = $(this).data('type');
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                
                TempleRouter.navigate(`entries/${typeMap[entryType]}/print`, { id: entryId });
            });
            
            $(document).on('click', '#btnPrintEntry', function() {
                const entryId = $(this).data('id');
                const entryType = $(this).data('type');
                
                if (self.viewModal) {
                    self.viewModal.hide();
                }
                
                const typeMap = {
                    1: 'receipt',
                    2: 'payment',
                    3: 'contra',
                    4: 'journal',
                    5: 'credit-note',
                    6: 'debit-note',
                    7: 'inventory-journal'
                };
                
                TempleRouter.navigate(`entries/${typeMap[entryType]}/print`, { id: entryId });
            });
            
            $(document).on('click', '.pagination a', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentFilter.page = page;
                    self.loadEntries();
                }
            });
        },
        
        viewEntry: function(entryId) {
            const self = this;
            
            TempleAPI.get(`/accounts/entries/${entryId}`)
                .done(function(response) {
                    if (response.success) {
                        const entry = response.data;
                        const typeInfo = self.entryTypes.find(t => t.id == entry.entrytype_id) || {};
                        
                        const approvalInfo = entry.inv_type == 11 ? `
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i> This entry was created through the payment approval process.
                            </div>
                        ` : '';
                        
                        let itemsHtml = '';
                        entry.entry_items.forEach(item => {
                            itemsHtml += `
                                <tr>
                                    <td>${item.ledger.name} (${item.ledger.left_code}/${item.ledger.right_code})</td>
                                    <td class="text-end">${item.dc === 'D' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                                    <td class="text-end">${item.dc === 'C' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                                    ${entry.entrytype_id === 7 ? `
                                        <td class="text-center">${item.quantity || '-'}</td>
                                        <td class="text-end">${item.unit_price ? TempleCore.formatCurrency(item.unit_price) : '-'}</td>
                                    ` : ''}
                                </tr>
                            `;
                        });
                        
                        const content = `
                            ${approvalInfo}
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Entry Code:</strong> ${entry.entry_code}<br>
                                    <strong>Date:</strong> ${TempleCore.formatDate(entry.date)}<br>
                                    <strong>Type:</strong> <span class="badge bg-${typeInfo.color}">${typeInfo.name}</span><br>
                                    <strong>Fund:</strong> ${entry.fund?.name || '-'}
                                </div>
                                <div class="col-md-6">
                                    ${entry.payment ? `<strong>Payment Mode:</strong> ${entry.payment}<br>` : ''}
                                    ${entry.cheque_no ? `<strong>Cheque No:</strong> ${entry.cheque_no}<br>` : ''}
                                    ${entry.cheque_date ? `<strong>Cheque Date:</strong> ${TempleCore.formatDate(entry.cheque_date)}<br>` : ''}
                                    ${entry.paid_to ? `<strong>Paid To:</strong> ${entry.paid_to}<br>` : ''}
                                </div>
                            </div>
                            
                            ${entry.narration ? `
                                <div class="mb-3">
                                    <strong>Narration:</strong><br>
                                    ${entry.narration}
                                </div>
                            ` : ''}
                            
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Account</th>
                                        <th width="120" class="text-end">Debit</th>
                                        <th width="120" class="text-end">Credit</th>
                                        ${entry.entrytype_id === 7 ? `
                                            <th width="100" class="text-center">Quantity</th>
                                            <th width="120" class="text-end">Unit Price</th>
                                        ` : ''}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th>Total</th>
                                        <th class="text-end">${TempleCore.formatCurrency(entry.dr_total)}</th>
                                        <th class="text-end">${TempleCore.formatCurrency(entry.cr_total)}</th>
                                        ${entry.entrytype_id === 7 ? '<th colspan="2"></th>' : ''}
                                    </tr>
                                </tfoot>
                            </table>
                        `;
                        
                        $('#viewEntryContent').html(content);
                        $('#btnPrintEntry').data('id', entryId).data('type', entry.entrytype_id);
                        
                        if (self.viewModal) {
                            self.viewModal.show();
                        } else {
                            self.initializeModal();
                            if (self.viewModal) {
                                self.viewModal.show();
                            }
                        }
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load entry details', 'error');
                });
        },
        
        deleteEntry: function(entryId) {
            TempleCore.showLoading(true);
            
            TempleAPI.delete(`/accounts/entries/${entryId}`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Entry deleted successfully', 'success');
                        EntriesPage.loadEntries();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to delete entry', 'error');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('An error occurred while deleting entry', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        cleanup: function() {
            if (this.viewModal) {
                this.viewModal.dispose();
                this.viewModal = null;
            }
        }
    };
    
})(jQuery, window);