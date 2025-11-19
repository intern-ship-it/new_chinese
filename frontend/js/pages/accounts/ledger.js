// js/pages/accounts/ledgers/index.js
// Ledger Management Module

(function ($, window) {
    'use strict';

    window.AccountsLedgerPage = {
        currentUser: null,
        ledgers: [],
        groups: [],
        selectedLedger: null,
        viewMode: 'list', // 'list' or 'tree'
        filters: {
            search: '',
            group_id: '',
            type: '',
            with_balance: true
        },
        currentPage: 1,
        totalPages: 1,

        // Initialize page
        init: function (params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.bindEvents();
            this.loadInitialData();
        },

        // Render page HTML
        render: function () {
            const self = this;
            const currencySymbol = TempleCore.getCurrency();
            const amount = '0.00';
            const html = `
                <div class="ledgers-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-journal-text"></i> Ledger Management
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Home</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('accounts/chart-of-accounts'); return false;">Chart of Accounts</a></li>
                                        <li class="breadcrumb-item active">Ledgers</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <div class="btn-group me-2" role="group">
                                    <button class="btn btn-outline-primary active" id="listViewBtn" title="List View">
                                        <i class="bi bi-list-ul"></i> List View
                                    </button>
                                    <button class="btn btn-outline-primary" id="treeViewBtn" title="Tree View">
                                        <i class="bi bi-diagram-3"></i> Tree View
                                    </button>
                                </div>
                                <button class="btn btn-primary" id="addLedgerBtn">
                                    <i class="bi bi-plus-circle"></i> Add Ledger
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row mb-4" id="summaryCards">
                        <div class="col-md-3">
                            <div class="summary-card total">
                                <div class="card-icon">
                                    <i class="bi bi-journal-text"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Total Ledgers</h6>
                                    <h3 id="totalLedgers">0</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="summary-card bank">
                                <div class="card-icon">
                                    <i class="bi bi-bank"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Bank Accounts</h6>
                                    <h3 id="bankAccounts">${self.formatCurrency(amount)}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="summary-card cash">
                                <div class="card-icon">
                                    <i class="bi bi-cash-stack"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Cash Accounts</h6>
                                    <h3 id="cashAccounts">0</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="summary-card groups">
                                <div class="card-icon">
                                    <i class="bi bi-folder"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Groups</h6>
                                    <h3 id="totalGroups">0</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="content-card mb-4">
                        <div class="card-body">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-4">
                                    <label class="form-label">Search</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Search ledgers...">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Group</label>
                                    <select class="form-select" id="filterGroup">
                                        <option value="">All Groups</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Type</label>
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="0">Normal</option>
                                        <option value="1">Bank Account</option>
                                        <option value="2">Cash Account</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-secondary" id="clearFiltersBtn">
                                            <i class="bi bi-x-circle"></i> Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- List View Container -->
                    <div id="listViewContainer" class="content-card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="ledgersTable">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Ledger Name</th>
                                            <th>Group</th>
                                            <th>Type</th>
                                            <th>Balance</th>
                                            <th>Features</th>
                                            <th width="120">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ledgersTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2">Loading ledgers...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div id="paginationInfo">
                                    Showing <span id="showingFrom">0</span> to <span id="showingTo">0</span> of <span id="totalRecords">0</span> entries
                                </div>
                                <nav>
                                    <ul class="pagination mb-0" id="pagination">
                                        <!-- Pagination will be rendered here -->
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>

                    <!-- Tree View Container (hidden by default) -->
                    <div id="treeViewContainer" class="content-card" style="display: none;">
                        <div class="card-body">
                            <div id="treeContainer" class="tree-container">
                                <!-- Tree will be rendered here -->
                            </div>
                        </div>
                    </div>

                    ${this.getModalsHTML()}
                </div>

                <style>
                    ${this.getPageStyles()}
                </style>
            `;

            $('#page-container').html(html);
        },

        // Get modals HTML
        getModalsHTML: function () {
            const currencySymbol = TempleCore.getCurrency();
            return `
                <!-- Add/Edit Ledger Modal -->
                <div class="modal fade" id="ledgerModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="ledgerModalTitle">ADD NEW LEDGER</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="ledgerForm">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Ledger Name <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="ledgerName" required maxlength="300">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Under Group <span class="text-danger">*</span></label>
                                                <select class="form-select" id="ledgerGroup" required>
                                                    <option value="">Select Group</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
										<label class="form-label">Ledger Code</label>
										<div class="row">
											<div class="col-md-6">
												<div class="mb-2">
													<label class="form-label text-muted small">Group Code (Auto)</label>
													<input type="text" class="form-control" id="leftCode" readonly placeholder="Select a group first">
													<div class="form-text">Automatically set from selected group</div>
												</div>
											</div>
											<div class="col-md-6">
												<div class="mb-2">
													<label class="form-label text-muted small">Ledger Code</label>
													<input type="text" class="form-control" id="rightCode" maxlength="4" pattern="[0-9]{1,4}" placeholder="0001">
													<div class="form-text">4-digit numeric code (auto-padded with zeros)</div>
												</div>
											</div>
										</div>
										<div class="form-text">
											<i class="bi bi-info-circle"></i> Complete Code: <span id="completeCodePreview" class="fw-bold">-</span>
										</div>
									</div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Ledger Features</label>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-check mb-2">
                                                    <input class="form-check-input" type="checkbox" id="bankCashAccount">
                                                    <label class="form-check-label" for="bankCashAccount">
                                                        Bank/Cash Account
                                                    </label>
                                                </div>
                                                <div class="form-check mb-2">
                                                    <input class="form-check-input" type="checkbox" id="enableAging">
                                                    <label class="form-check-label" for="enableAging">
                                                        Enable Aging (Receivables)
                                                    </label>
                                                </div>
                                                <div class="form-check mb-2">
                                                    <input class="form-check-input" type="checkbox" id="profitLoss">
                                                    <label class="form-check-label" for="profitLoss">
                                                        Profit & Loss Accumulation
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-check mb-2">
                                                    <input class="form-check-input" type="checkbox" id="enableReconciliation">
                                                    <label class="form-check-label" for="enableReconciliation">
                                                        Enable Reconciliation
                                                    </label>
                                                </div>
                                                <div class="form-check mb-2">
                                                    <input class="form-check-input" type="checkbox" id="enableCreditAging">
                                                    <label class="form-check-label" for="enableCreditAging">
                                                        Enable Credit Aging (Payables)
                                                    </label>
                                                </div>
                                                <div class="form-check mb-2">
                                                    <input class="form-check-input" type="checkbox" id="inventoryLedger">
                                                    <label class="form-check-label" for="inventoryLedger">
                                                        Inventory Ledger
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Opening Balance</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">${currencySymbol}</span>
                                                    <input type="number" class="form-control" id="openingBalance" value="0" step="0.01" min="0">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Balance Type</label>
                                                <select class="form-select" id="balanceType">
                                                    <option value="Dr">Debit</option>
                                                    <option value="Cr">Credit</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Notes</label>
                                        <textarea class="form-control" id="ledgerNotes" rows="3" maxlength="200"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="saveLedgerBtn">
                                    <i class="bi bi-check-circle"></i> Save Ledger
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Ledger Details Modal -->
                <div class="modal fade" id="ledgerDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Ledger Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="ledgerDetailsBody">
                                <!-- Details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" id="viewTransactionsBtn">
                                    <i class="bi bi-list-ul"></i> View Transactions
                                </button>
                                
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Delete Confirmation Modal -->
                <div class="modal fade" id="deleteModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">Confirm Delete</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i> <strong>Warning!</strong>
                                    <p class="mb-0 mt-2" id="deleteMessage">Are you sure you want to delete this ledger?</p>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // Get page styles
        getPageStyles: function () {
            return `
                .ledgers-page {
                    padding: 20px 0;
                }

                .page-header {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                }

                .breadcrumb {
                    background: none;
                    padding: 0;
                    margin: 10px 0 0 0;
                }

                .summary-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    display: flex;
                    align-items: center;
                    transition: transform 0.3s ease;
                }

                .summary-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 5px 15px rgba(0,0,0,.15);
                }

                .summary-card .card-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin-right: 15px;
                    color: white;
                }

                .summary-card.total .card-icon {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .summary-card.bank .card-icon {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .summary-card.cash .card-icon {
                    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                }

                .summary-card.groups .card-icon {
                    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                }

                .summary-card .card-content h6 {
                    margin: 0;
                    color: #6c757d;
                    font-size: 14px;
                    font-weight: 600;
                }

                .summary-card .card-content h3 {
                    margin: 5px 0 0 0;
                    font-size: 24px;
                    font-weight: 700;
                }

                .content-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    overflow: hidden;
                }

                .content-card .card-body {
                    padding: 20px;
                }

                .table-responsive {
                    margin: -20px;
                    padding: 20px;
                }

                .table th {
                    font-weight: 600;
                    color: #495057;
                    border-bottom: 2px solid #dee2e6;
                }

                .balance-debit {
                    color: #28a745;
                    font-weight: 600;
                }

                .balance-credit {
                    color: #dc3545;
                    font-weight: 600;
                }

                .feature-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    margin: 2px;
                    background: #e9ecef;
                    border-radius: 12px;
                    font-size: 11px;
                    color: #495057;
                }

                .tree-container {
                    min-height: 400px;
                    max-height: 600px;
                    overflow-y: auto;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                }

                .tree-node {
                    position: relative;
                    padding-left: 20px;
                }

                .tree-node-content {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    margin: 2px 0;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .tree-node-content:hover {
                    background: #f8f9fa;
                }

                .tree-node-content.selected {
                    background: var(--primary-color);
                    color: white;
                }

                .tree-node-toggle {
                    width: 20px;
                    height: 20px;
                    margin-right: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tree-node.expanded > .tree-node-children {
                    display: block;
                }

                .tree-node-children {
                    display: none;
                    margin-left: 20px;
                    border-left: 1px dashed #dee2e6;
                }

                #ledgerModal .modal-body {
                    max-height: 70vh;
                    overflow-y: auto;
                }

                @media (max-width: 768px) {
                    .summary-card {
                        margin-bottom: 15px;
                    }
                    
                    .table-responsive {
                        margin: -10px;
                        padding: 10px;
                    }
                }
				.action-buttons {
					display: flex;
					gap: 4px;
				}

				.btn-group-sm > .btn {
					padding: 0.25rem 0.5rem;
					font-size: 0.875rem;
					border-radius: 0.2rem;
				}

				.btn-group > .btn:not(:last-child) {
					border-right: 0;
				}

				.btn-group > .btn:first-child {
					border-top-left-radius: 0.375rem;
					border-bottom-left-radius: 0.375rem;
				}

				.btn-group > .btn:last-child {
					border-top-right-radius: 0.375rem;
					border-bottom-right-radius: 0.375rem;
				}

				.btn-group > .btn:hover {
					z-index: 1;
				}

				.btn-outline-primary:hover,
				.btn-outline-info:hover,
				.btn-outline-danger:hover {
					color: #fff;
				}

				table td:last-child {
					white-space: nowrap;
				}

				.table > :not(caption) > * > * {
					vertical-align: middle;
				}

				/* Improve delete modal appearance */
				#deleteModal .modal-header {
					background: linear-gradient(135deg, #f56565 0%, #ed8936 100%);
				}

				#deleteModal .alert-warning {
					border: 2px solid #ffc107;
					background: #fff3cd;
				}
            `;
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // View toggle
            $('#listViewBtn').on('click', function () {
                self.viewMode = 'list';
                $(this).addClass('active');
                $('#treeViewBtn').removeClass('active');
                $('#listViewContainer').show();
                $('#treeViewContainer').hide();
            });

            $('#treeViewBtn').on('click', function () {
                self.viewMode = 'tree';
                $(this).addClass('active');
                $('#listViewBtn').removeClass('active');
                $('#listViewContainer').hide();
                $('#treeViewContainer').show();
                self.loadTreeView();
            });

            // Add ledger button
            $('#addLedgerBtn').on('click', function () {
                self.showLedgerModal();
            });
            $('#ledgerGroup').on('change', function () {
                const selectedGroupId = $(this).val();

                if (selectedGroupId) {
                    // Find the selected group from the loaded groups array
                    const selectedGroup = self.groups.find(g => g.id == selectedGroupId);

                    if (selectedGroup && selectedGroup.code) {
                        // Set the group code as left code
                        $('#leftCode').val(selectedGroup.code);
                        self.updateCodePreview();
                    }
                } else {
                    // Clear left code if no group is selected
                    $('#leftCode').val('');
                    self.updateCodePreview();
                }
            });
            $('#rightCode').on('input', function () {
                // Only allow numbers
                this.value = this.value.replace(/[^0-9]/g, '');

                // Limit to 4 characters
                if (this.value.length > 4) {
                    this.value = this.value.substring(0, 4);
                }

                self.updateCodePreview();
            });
            $('#rightCode').on('blur', function () {
                if (this.value) {
                    // Pad with zeros to make it 4 digits
                    this.value = this.value.padStart(4, '0');
                    self.updateCodePreview();
                }
            });
            // Save ledger
            $('#saveLedgerBtn').on('click', function () {
                self.saveLedger();
            });

            // Filters
            $('#searchInput').on('input', function () {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(function () {
                    self.filters.search = $('#searchInput').val();
                    self.currentPage = 1;
                    self.loadLedgers();
                }, 300);
            });

            $('#filterGroup').on('change', function () {
                self.filters.group_id = $(this).val();
                self.currentPage = 1;
                self.loadLedgers();
            });

            $('#filterType').on('change', function () {
                self.filters.type = $(this).val();
                self.currentPage = 1;
                self.loadLedgers();
            });

            $('#clearFiltersBtn').on('click', function () {
                $('#searchInput').val('');
                $('#filterGroup').val('');
                $('#filterType').val('');
                self.filters = {
                    search: '',
                    group_id: '',
                    type: '',
                    with_balance: true
                };
                self.currentPage = 1;
                self.loadLedgers();
            });


            // Bank/Cash account checkbox
            $('#bankCashAccount').on('change', function () {
                if ($(this).is(':checked')) {
                    $('#bankCashTypeSelector').show();
                } else {
                    $('#bankCashTypeSelector').hide();
                }
            });

            // Confirm delete
            $('#confirmDeleteBtn').on('click', function () {
                self.executeDelete();
            });

            // View transactions button
            // View transactions button
            $('#viewTransactionsBtn').on('click', function () {
                if (self.selectedLedger) {
                    let fromDate, toDate;

                    // Use active year's from_date and today's date
                    if (self.selectedLedger.active_year) {
                        fromDate = self.selectedLedger.active_year.from_date;  // AC year start date
                        toDate = new Date().toISOString().split('T')[0];       // Today's date
                    } else {
                        // Fallback if no active year (shouldn't happen normally)
                        const now = new Date();
                        fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];  // Jan 1st of current year
                        toDate = now.toISOString().split('T')[0];  // Today
                    }

                    // Build URL with parameters
                    const params = new URLSearchParams({
                        ledger: self.selectedLedger.id,
                        from: fromDate,
                        to: toDate
                    });

                    // Close the modal first
                    bootstrap.Modal.getInstance(document.getElementById('ledgerDetailsModal')).hide();

                    // Navigate to general ledger report with parameters
                    window.open(
                        '/' + TempleAPI.getTempleId() + '/accounts/general-ledger?' + params.toString(),
                        '_blank'
                    );
                }
            });




            $('#ledgerGroup').on('change', function () {
                const selectedGroupId = $(this).val();

                if (selectedGroupId) {
                    // Find the selected group from the loaded groups array
                    const selectedGroup = self.groups.find(g => g.id == selectedGroupId);

                    if (selectedGroup && selectedGroup.code) {
                        // Set the group code as left code
                        $('#leftCode').val(selectedGroup.code);

                        // Auto-generate the next right code
                        self.getNextRightCode(selectedGroupId);
                    }
                } else {
                    // Clear codes if no group is selected
                    $('#leftCode').val('');
                    $('#rightCode').val('');
                    self.updateCodePreview();
                }
            });
        },
        getNextRightCode: function (groupId) {
            const self = this;

            // Show loading indicator on the right code field
            $('#rightCode').prop('disabled', true).attr('placeholder', 'Loading...');

            TempleAPI.get('/accounts/ledgers/next-code', { group_id: groupId })
                .done(function (response) {
                    if (response.success && response.data) {
                        // Set the auto-generated code
                        $('#rightCode').val(response.data.next_code);

                        // Update the preview
                        self.updateCodePreview();

                        // Get count of available codes (optional)
                        self.getAvailableCodesCount(groupId);

                        // Show info message with animation
                        const $helpText = $('#rightCode').siblings('.form-text');
                        $helpText.html(`
							<i class="bi bi-check-circle text-success"></i> 
							Auto-generated: ${response.data.next_code} 
							<small class="text-muted">(You can change this manually)</small>
							<span id="availableCodesInfo" class="ms-2"></span>
						`).hide().fadeIn(300);
                    }
                })
                .fail(function () {
                    // On failure, just enable the field for manual entry
                    $('#rightCode').val('');
                    console.error('Failed to get next code, manual entry required');
                })
                .always(function () {
                    // Re-enable the field
                    $('#rightCode').prop('disabled', false).attr('placeholder', '0001');
                });
        },
        getAvailableCodesCount: function (groupId) {
            TempleAPI.get('/accounts/ledgers/available-codes-count', { group_id: groupId })
                .done(function (response) {
                    if (response.success && response.data) {
                        const count = response.data.available_count;
                        const $info = $('#availableCodesInfo');

                        if (count < 100) {
                            $info.html(`<span class="badge bg-warning">Only ${count} codes left</span>`);
                        } else if (count < 500) {
                            $info.html(`<span class="badge bg-info">${count} codes available</span>`);
                        }
                    }
                });
        },
        updateCodePreview: function () {
            const leftCode = $('#leftCode').val();
            const rightCode = $('#rightCode').val();

            if (leftCode && rightCode) {
                $('#completeCodePreview').text(leftCode + '/'  + rightCode.padStart(4, '0'));
            } else if (leftCode) {
                $('#completeCodePreview').text(leftCode + '____');
            } else {
                $('#completeCodePreview').text('-');
            }
        },

        // Load initial data
        loadInitialData: function () {
            this.loadGroups();
            this.loadLedgers();
            this.loadSummary();
        },

        // Load groups for dropdown
        loadGroups: function () {
            const self = this;

            TempleAPI.get('/accounts/chart-of-accounts/groups')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.groups = response.data;
                        self.renderGroupDropdowns();

                        // Update total groups count
                        $('#totalGroups').text(self.groups.length);
                    }
                })
                .fail(function () {
                    console.error('Failed to load groups');
                });
        },

        // Render group dropdowns
        renderGroupDropdowns: function () {
            const self = this;

            // Filter dropdown
            const $filterSelect = $('#filterGroup');
            $filterSelect.empty();
            $filterSelect.append('<option value="">All Groups</option>');

            // Modal dropdown
            const $modalSelect = $('#ledgerGroup');
            $modalSelect.empty();
            $modalSelect.append('<option value="">Select Group</option>');

            self.groups.forEach(function (group) {
                const displayText = `${group.name} (${group.code})`;
                $filterSelect.append(`<option value="${group.id}">${displayText}</option>`);
                $modalSelect.append(`<option value="${group.id}">${displayText}</option>`);
            });
        },

        // Load ledgers
        loadLedgers: function () {
            const self = this;

            const params = {
                page: self.currentPage,
                per_page: 20,
                ...self.filters
            };

            // Show loading
            $('#ledgersTableBody').html(`
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading ledgers...</p>
                    </td>
                </tr>
            `);

            TempleAPI.get('/accounts/ledgers', params)
                .done(function (response) {
                    if (response.success) {
                        self.ledgers = response.data.data || response.data;
                        self.renderLedgersList();

                        // Update pagination if available
                        if (response.data.current_page) {
                            self.currentPage = response.data.current_page;
                            self.totalPages = response.data.last_page;
                            self.renderPagination(response.data);
                        }
                    }
                })
                .fail(function () {
                    self.showError('Failed to load ledgers');
                });
        },

        // Render ledgers list
        renderLedgersList: function () {
            const self = this;

            if (!self.ledgers || self.ledgers.length === 0) {
                $('#ledgersTableBody').html(`
					<tr>
						<td colspan="7" class="text-center py-4">
							<i class="bi bi-inbox" style="font-size: 48px; color: #dee2e6;"></i>
							<p class="mt-2 text-muted">No ledgers found</p>
						</td>
					</tr>
				`);
                return;
            }

            let html = '';
            self.ledgers.forEach(function (ledger) {
                // Combine left and right codes for display
                let code = '-';
                if (ledger.left_code && ledger.right_code) {
                    code = ledger.left_code + (ledger.right_code ? '/' + ledger.right_code.padStart(4, '0') : '');
                } else if (ledger.left_code) {
                    code = ledger.left_code;
                } else if (ledger.right_code) {
                    code = ledger.right_code;
                }

                const typeName = ledger.type === 1 ? 'Bank' : ledger.type === 2 ? 'Cash' : 'Normal';
                const typeClass = ledger.type === 1 ? 'info' : ledger.type === 2 ? 'success' : 'secondary';

                let balanceDisplay = '-';
                if (ledger.formatted_balance) {
                    balanceDisplay = `<span class="">${ledger.formatted_balance}</span>`;
                }

                let features = [];
                if (ledger.reconciliation) features.push('<span class="feature-badge">Reconciliation</span>');
                if (ledger.pa) features.push('<span class="feature-badge">P&L</span>');
                if (ledger.aging) features.push('<span class="feature-badge">Aging</span>');
                if (ledger.credit_aging) features.push('<span class="feature-badge">Credit Aging</span>');
                if (ledger.iv) features.push('<span class="feature-badge">Inventory</span>');

                // FIXED: Use AccountsLedgerPage (without 's') and improved button group styling
                html += `
					<tr>
						<td>${code}</td>
						<td>
							<a href="#" onclick="AccountsLedgerPage.viewLedger(${ledger.id}); return false;" class="text-decoration-none">
								${ledger.name}
							</a>
						</td>
						<td>${ledger.group ? ledger.group.name : '-'}</td>
						<td><span class="badge bg-${typeClass}">${typeName}</span></td>
						<td>${balanceDisplay}</td>
						<td>${features.join(' ') || '-'}</td>
						<td>
							<div class="btn-group btn-group-sm" role="group">
								<button class="btn btn-outline-primary" style="border:0;" onclick="AccountsLedgerPage.editLedger(${ledger.id})" title="Edit">
									<i class="bi bi-pencil-square"></i>
								</button>
								<button class="btn btn-outline-info" onclick="AccountsLedgerPage.viewLedger(${ledger.id})" title="View">
									<i class="bi bi-eye"></i>
								</button>
								<button class="btn btn-outline-danger" onclick="AccountsLedgerPage.deleteLedger(${ledger.id}, '${ledger.name.replace(/'/g, "\\'")}')" title="Delete">
									<i class="bi bi-trash"></i>
								</button>
							</div>
						</td>
					</tr>
				`;
            });

            $('#ledgersTableBody').html(html);
        },

        // Load summary
        loadSummary: function () {
            const self = this;

            // Get bank and cash accounts
            TempleAPI.get('/accounts/ledgers/bank-cash')
                .done(function (response) {
                    if (response.success) {
                        const accounts = response.data;
                        const bankCount = accounts.filter(a => a.type === 'Bank').length;
                        const cashCount = accounts.filter(a => a.type === 'Cash').length;

                        $('#bankAccounts').text(bankCount);
                        $('#cashAccounts').text(cashCount);
                    }
                });

            // Get total ledgers count
            TempleAPI.get('/accounts/ledgers', { all: true })
                .done(function (response) {
                    if (response.success) {
                        const total = Array.isArray(response.data) ? response.data.length : 0;
                        $('#totalLedgers').text(total);
                    }
                });
        },

        // Load tree view
        loadTreeView: function () {
            const self = this;

            $('#treeContainer').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading tree view...</p>
                </div>
            `);

            TempleAPI.get('/accounts/ledgers/tree')
                .done(function (response) {
                    if (response.success) {
                        self.renderTree(response.data);
                    }
                })
                .fail(function () {
                    self.showError('Failed to load tree view');
                });
        },

        // Render tree
        renderTree: function (treeData) {
            const self = this;

            if (!treeData || treeData.length === 0) {
                $('#treeContainer').html(`
                    <div class="text-center py-5">
                        <i class="bi bi-diagram-3" style="font-size: 48px; color: #dee2e6;"></i>
                        <p class="mt-2 text-muted">No data to display</p>
                    </div>
                `);
                return;
            }

            const treeHtml = this.buildTreeHtml(treeData, 0);
            $('#treeContainer').html(treeHtml);

            this.bindTreeEvents();
        },

        // Build tree HTML
        buildTreeHtml: function (nodes, level) {
            let html = '';
            const self = this;
            const currencySymbol = TempleCore.getCurrency();
            nodes.forEach(function (node) {
                const hasChildren = node.children && node.children.length > 0;
                const isGroup = node.type === 'group';
                const icon = isGroup ? 'bi-folder' : 'bi-file-text';
                const currencySymbol = TempleCore.getCurrency();
                html += `
                    <div class="tree-node" data-id="${node.id}" data-type="${node.type}" data-level="${level}">
                        <div class="tree-node-content">
                            ${hasChildren ? `
                                <span class="tree-node-toggle">
                                    <i class="bi bi-chevron-right"></i>
                                </span>
                            ` : '<span class="tree-node-toggle"></span>'}
                            <i class="bi ${icon}" style="margin-right: 8px; color: ${isGroup ? '#ffc107' : '#28a745'};"></i>
                            <span style="flex-grow: 1;">${node.name}</span>
                            <span style="color: #6c757d; font-size: 12px;">[${node.code || '-'}]</span>
                            ${node.balance ? `
                                <span class="ms-2 badge bg-info">${currencySymbol} ${node.balance.balance} ${node.balance.balance_type}</span>
                            ` : ''}
                        </div>
                        ${hasChildren ? `
                            <div class="tree-node-children">
                                ${self.buildTreeHtml(node.children, level + 1)}
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            return html;
        },

        // Bind tree events
        bindTreeEvents: function () {
            $('.tree-node-toggle').on('click', function (e) {
                e.stopPropagation();
                const $node = $(this).closest('.tree-node');
                $node.toggleClass('expanded');

                const $icon = $(this).find('i');
                if ($node.hasClass('expanded')) {
                    $icon.removeClass('bi-chevron-right').addClass('bi-chevron-down');
                } else {
                    $icon.removeClass('bi-chevron-down').addClass('bi-chevron-right');
                }
            });

            $('.tree-node-content').on('click', function () {
                const $node = $(this).closest('.tree-node');
                const nodeType = $node.data('type');

                if (nodeType === 'ledger') {
                    const ledgerId = $node.data('id').replace('l_', '');
                    AccountsLedgersPage.viewLedger(ledgerId);
                }
            });
        },

        // Show ledger modal
        showLedgerModal: function (editId = null) {
            const self = this;

            // Reset form
            $('#ledgerForm')[0].reset();
            $('#leftCode').val('').prop('readonly', true); // Always readonly
            $('#rightCode').val('').prop('disabled', false); // Always enabled
            $('#bankCashTypeSelector').hide();
            $('#completeCodePreview').text('-');

            // Reset the help text under right code
            $('#rightCode').siblings('.form-text').html('4-digit numeric code (auto-padded with zeros)');

            if (editId) {
                // Edit mode - existing code remains the same
                $('#ledgerModalTitle').text('EDIT LEDGER');

                TempleAPI.get('/accounts/ledgers/' + editId)
                    .done(function (response) {
                        if (response.success) {
                            const ledger = response.data;

                            $('#ledgerName').val(ledger.name);
                            $('#ledgerGroup').val(ledger.group_id);

                            // Set the codes
                            if (ledger.left_code) {
                                $('#leftCode').val(ledger.left_code);
                            } else if (ledger.group && ledger.group.code) {
                                $('#leftCode').val(ledger.group.code);
                            }

                            if (ledger.right_code) {
                                $('#rightCode').val(ledger.right_code.padStart(4, '0'));
                            }

                            // Update preview
                            self.updateCodePreview();

                            // Set features and other fields...
                            $('#enableReconciliation').prop('checked', ledger.reconciliation);
                            $('#profitLoss').prop('checked', ledger.pa);
                            $('#enableAging').prop('checked', ledger.aging);
                            $('#enableCreditAging').prop('checked', ledger.credit_aging);
                            $('#inventoryLedger').prop('checked', ledger.iv);
                            $('#bankCashAccount').prop('checked', ledger.type);

                            // Set opening balance if available
                            if (ledger.opening_balance) {
                                $('#openingBalance').val(ledger.opening_balance.balance);
                                $('#balanceType').val(ledger.opening_balance.balance_type);
                            }

                            $('#ledgerNotes').val(ledger.notes || '');

                            $('#ledgerModal').data('edit-id', editId);
                            const modal = new bootstrap.Modal(document.getElementById('ledgerModal'));
                            modal.show();
                        }
                    });
            } else {
                // Add mode - will auto-generate when group is selected
                $('#ledgerModalTitle').text('ADD NEW LEDGER');
                $('#ledgerModal').removeData('edit-id');
                const modal = new bootstrap.Modal(document.getElementById('ledgerModal'));
                modal.show();
            }
        },

        // Save ledger
        saveLedger: function () {
            const self = this;

            const $form = $('#ledgerForm')[0];
            if (!$form.checkValidity()) {
                $form.classList.add('was-validated');
                return;
            }

            // Validate that group is selected
            if (!$('#ledgerGroup').val()) {
                TempleCore.showToast('Please select a group', 'danger');
                return;
            }

            // Get and validate right code
            let rightCode = $('#rightCode').val();
            if (rightCode) {
                // Pad with zeros to 4 digits
                rightCode = rightCode.padStart(4, '0');
            }

            const data = {
                name: $('#ledgerName').val(),
                group_id: $('#ledgerGroup').val(),
                notes: $('#ledgerNotes').val(),
                reconciliation: $('#enableReconciliation').is(':checked') ? 1 : 0,
                pa: $('#profitLoss').is(':checked') ? 1 : 0,
                aging: $('#enableAging').is(':checked') ? 1 : 0,
                credit_aging: $('#enableCreditAging').is(':checked') ? 1 : 0,
                iv: $('#inventoryLedger').is(':checked') ? 1 : 0,
                // Always set both codes
                left_code: $('#leftCode').val(),
                right_code: rightCode || null
            };

            // Set type based on bank/cash selection
            if ($('#bankCashAccount').is(':checked')) {
                data.type = 1;
            } else {
                data.type = 0;
            }

            // Set opening balance
            const openingBalance = parseFloat($('#openingBalance').val()) || 0;
            // if (openingBalance > 0) {
            data.opening_balance = openingBalance;
            data.opening_balance_type = $('#balanceType').val();
            // }

            const editId = $('#ledgerModal').data('edit-id');

            TempleCore.showLoading(true);

            const request = editId
                ? TempleAPI.put('/accounts/ledgers/' + editId, data)
                : TempleAPI.post('/accounts/ledgers', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('ledgerModal')).hide();
                        TempleCore.showToast(editId ? 'Ledger updated successfully' : 'Ledger created successfully', 'success');
                        self.loadLedgers();
                        self.loadSummary();
                    }
                })
                .fail(function (xhr) {
                    let message = 'Failed to save ledger';
                    if (xhr.responseJSON) {
                        if (xhr.responseJSON.message) {
                            message = xhr.responseJSON.message;
                        } else if (xhr.responseJSON.errors) {
                            const errors = xhr.responseJSON.errors;
                            message = Object.values(errors).flat().join(', ');
                        }
                    }
                    TempleCore.showToast(message, 'danger');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // View ledger
        viewLedger: function (ledgerId) {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get('/accounts/ledgers/' + ledgerId)
                .done(function (response) {
                    if (response.success) {
                        self.selectedLedger = response.data;
                        self.renderLedgerDetails(response.data);
                        const modal = new bootstrap.Modal(document.getElementById('ledgerDetailsModal'));
                        modal.show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load ledger details', 'danger');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Render ledger details
        renderLedgerDetails: function (ledger) {
            let features = [];
            if (ledger.reconciliation) features.push('Reconciliation');
            if (ledger.pa) features.push('P&L Accumulation');
            if (ledger.aging) features.push('Aging');
            if (ledger.credit_aging) features.push('Credit Aging');
            if (ledger.iv) features.push('Inventory');

            const typeName = ledger.type === 1 ? 'Bank Account' : ledger.type === 2 ? 'Cash Account' : 'Normal';
            const currencySymbol = TempleCore.getCurrency();
            let balanceHtml = '-';
            if (ledger.balance_info) {
                const balanceClass = ledger.balance_info.balance_type === 'Dr' ? 'text-success' : 'text-danger';
                balanceHtml = `<span class="${balanceClass} fs-4">${currencySymbol} ${parseFloat(ledger.balance_info.balance).toFixed(2)} ${ledger.balance_info.balance_type}</span>`;
            }

            let summaryHtml = '';
            if (ledger.transaction_summary) {
                summaryHtml = `
                    <div class="row mt-3">
                        <div class="col-md-4">
                            <div class="text-center">
                                <h6>Total Debit</h6>
                                <p class="fs-5 text-success">${currencySymbol} ${ledger.transaction_summary.total_debit}</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center">
                                <h6>Total Credit</h6>
                                <p class="fs-5 text-danger">${currencySymbol} ${ledger.transaction_summary.total_credit}</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center">
                                <h6>Transaction Count</h6>
                                <p class="fs-5">${ledger.transaction_summary.count}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            const html = `
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">Ledger Name:</th>
                                <td><strong>${ledger.name}</strong></td>
                            </tr>
                            <tr>
                                <th>Group:</th>
                                <td>${ledger.group ? ledger.group.name : '-'}</td>
                            </tr>
                            <tr>
                                <th>Type:</th>
                                <td><span class="badge bg-info">${typeName}</span></td>
                            </tr>
                            <tr>
                                <th>Code:</th>
                                <td>${ledger.left_code || ledger.right_code || '-'}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">Current Balance:</th>
                                <td>${balanceHtml}</td>
                            </tr>
                            <tr>
                                <th>Features:</th>
                                <td>${features.join(', ') || 'None'}</td>
                            </tr>
                            <tr>
                                <th>Notes:</th>
                                <td>${ledger.notes || '-'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                ${summaryHtml}
            `;

            $('#ledgerDetailsBody').html(html);
        },

        // Edit ledger
        editLedger: function (ledgerId) {
            this.showLedgerModal(ledgerId);
        },

        // Delete ledger
        // js/pages/accounts/ledgers/index.js
        // Update the deleteLedger method

        deleteLedger: function (ledgerId, ledgerName) {
            const self = this;

            // First check if deletion is possible
            TempleCore.showLoading(true);

            TempleAPI.get('/accounts/ledgers/' + ledgerId)
                .done(function (response) {
                    if (response.success) {
                        const ledger = response.data;
                        let warningMessage = `Are you sure you want to delete the ledger "<strong>${ledgerName}</strong>"?`;

                        // Check if ledger has references
                        if (ledger.referenced_by && Object.keys(ledger.referenced_by).length > 0) {
                            warningMessage = `
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle-fill"></i> <strong>Cannot Delete!</strong>
                            <p class="mt-2">This ledger is referenced by:</p>
                            <ul class="mb-0">`;

                            Object.entries(ledger.referenced_by).forEach(([entity, count]) => {
                                warningMessage += `<li>${count} ${entity}</li>`;
                            });

                            warningMessage += `
                            </ul>
                            <p class="mt-2 mb-0">Please remove these references before deleting.</p>
                        </div>`;

                            $('#deleteMessage').html(warningMessage);
                            $('#confirmDeleteBtn').hide();
                        } else if (ledger.has_transactions) {
                            warningMessage = `
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle-fill"></i> <strong>Cannot Delete!</strong>
                            <p class="mt-2">This ledger has existing transactions.</p>
                            <p class="mb-0">Please remove or transfer all transactions before deleting.</p>
                        </div>`;

                            $('#deleteMessage').html(warningMessage);
                            $('#confirmDeleteBtn').hide();
                        } else {
                            // Can be deleted
                            $('#deleteMessage').html(warningMessage);
                            $('#confirmDeleteBtn').show();
                            $('#deleteModal').data('delete-id', ledgerId);
                        }

                        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
                        modal.show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to check ledger status', 'danger');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Execute delete
        executeDelete: function () {
            const self = this;
            const deleteId = $('#deleteModal').data('delete-id');

            if (!deleteId) return;

            TempleCore.showLoading(true);

            // Using the correct delete endpoint format
            TempleAPI.delete('/accounts/ledgers/' + deleteId)
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                        TempleCore.showToast('Ledger deleted successfully', 'success');
                        self.loadLedgers();
                        self.loadSummary();
                    }
                })
                .fail(function (xhr) {
                    let message = 'Failed to delete ledger';
                    if (xhr.responseJSON) {
                        if (xhr.responseJSON.message) {
                            message = xhr.responseJSON.message;
                        } else if (xhr.responseJSON.error) {
                            message = xhr.responseJSON.error;
                        }
                    }
                    TempleCore.showToast(message, 'danger');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Render pagination
        renderPagination: function (data) {
            // Update info
            $('#showingFrom').text(data.from || 0);
            $('#showingTo').text(data.to || 0);
            $('#totalRecords').text(data.total || 0);

            // Build pagination
            let paginationHtml = '';

            // Previous button
            if (data.current_page > 1) {
                paginationHtml += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="AccountsLedgersPage.goToPage(${data.current_page - 1}); return false;">Previous</a>
                    </li>
                `;
            }

            // Page numbers
            for (let i = 1; i <= data.last_page; i++) {
                if (i === data.current_page) {
                    paginationHtml += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
                } else if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    paginationHtml += `
                        <li class="page-item">
                            <a class="page-link" href="#" onclick="AccountsLedgersPage.goToPage(${i}); return false;">${i}</a>
                        </li>
                    `;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            // Next button
            if (data.current_page < data.last_page) {
                paginationHtml += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="AccountsLedgersPage.goToPage(${data.current_page + 1}); return false;">Next</a>
                    </li>
                `;
            }

            $('#pagination').html(paginationHtml);
        },

        // Go to page
        goToPage: function (page) {
            this.currentPage = page;
            this.loadLedgers();
        },
        formatCurrency: function (amount) {
            return TempleCore.formatCurrency(amount);
        },
        // Show error
        showError: function (message) {
            $('#ledgersTableBody').html(`
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle"></i> ${message}
                        </div>
                    </td>
                </tr>
            `);
        }
    };

})(jQuery, window);