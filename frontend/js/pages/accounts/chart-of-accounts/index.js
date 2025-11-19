// js/pages/accounts/chart-of-accounts/index.js
// Chart of Accounts Management Module

(function($, window) {
    'use strict';
    
    window.AccountsChartOfAccountsPage = {
        currentUser: null,
        permissions: {},
        groups: [],
        ledgers: [],
        treeData: [],
        summaryTotals: {},
        selectedNode: null,
        viewMode: 'tree', // 'tree' or 'list'
        
        // Initialize page
        init: function(params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.bindEvents();
            this.loadInitialData();
        },
        
        // Render page HTML
        render: function() {
             const self = this;
                let amount = 0.00;
            const html = `
                <div class="chart-of-accounts-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-diagram-3"></i> Chart of Accounts
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item">Accounts</li>
                                        <li class="breadcrumb-item active">Chart of Accounts</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-primary" id="treeViewBtn" title="Tree View">
                                        <i class="bi bi-diagram-3"></i> Tree View
                                    </button>
                                    <button class="btn btn-outline-primary" id="listViewBtn" title="List View">
                                        <i class="bi bi-list-ul"></i> List View
                                    </button>
                                </div>
                                <button class="btn btn-primary ms-2" id="addGroupBtn" style="display:none;">
                                    <i class="bi bi-folder-plus"></i> Add Group
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row mb-4" id="summaryCards">
                        <div class="col-md-3">
                            <div class="summary-card assets">
                                <div class="card-icon">
                                    <i class="bi bi-bank2"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Assets</h6>
                                    <h3 id="assetsTotal">${self.formatCurrency(amount)}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="summary-card liabilities">
                                <div class="card-icon">
                                    <i class="bi bi-credit-card"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Liabilities</h6>
                                    <h3 id="liabilitiesTotal">${self.formatCurrency(amount)}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="summary-card income">
                                <div class="card-icon">
                                    <i class="bi bi-arrow-down-circle"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Income</h6>
                                    <h3 id="incomeTotal">${self.formatCurrency(amount)}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="summary-card expenses">
                                <div class="card-icon">
                                    <i class="bi bi-arrow-up-circle"></i>
                                </div>
                                <div class="card-content">
                                    <h6>Expenses</h6>
                                    <h3 id="expensesTotal">${self.formatCurrency(amount)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="row">
                        <!-- Tree/List View -->
                        <div class="col-lg-8">
                            <div class="content-card">
                                <div class="card-header">
                                    <h5>
                                        <i class="bi bi-diagram-3"></i> Account Structure
                                        <button class="btn btn-sm btn-outline-secondary float-end" id="expandAllBtn">
                                            <i class="bi bi-arrows-expand"></i> Expand All
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary float-end me-2" id="collapseAllBtn">
                                            <i class="bi bi-arrows-collapse"></i> Collapse All
                                        </button>
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <!-- Search Bar -->
                                    <div class="mb-3">
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                                            <input type="text" class="form-control" id="searchInput" placeholder="Search accounts...">
                                        </div>
                                    </div>
                                    
                                    <!-- Tree Container -->
                                    <div id="treeContainer" class="tree-container">
                                        <div class="text-center py-5">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <p class="mt-2">Loading chart of accounts...</p>
                                        </div>
                                    </div>

                                    <!-- List Container (hidden by default) -->
                                    <div id="listContainer" class="list-container" style="display: none;">
                                        <!-- List view will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Details Panel -->
                        <div class="col-lg-4">
                            <div class="content-card">
                                <div class="card-header">
                                    <h5><i class="bi bi-info-circle"></i> Details</h5>
                                </div>
                                <div class="card-body" id="detailsPanel">
                                    <div class="text-center text-muted py-5">
                                        <i class="bi bi-mouse" style="font-size: 48px;"></i>
                                        <p class="mt-3">Select an account or group to view details</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="content-card mt-3" id="quickActionsCard" style="display:none;">
                                <div class="card-header">
                                    <h5><i class="bi bi-lightning"></i> Quick Actions</h5>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2" id="quickActionsContainer">
                                        <!-- Actions will be rendered based on selection and permissions -->
                                    </div>
                                </div>
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
        getModalsHTML: function() {
            return `
                <!-- Add/Edit Group Modal -->
                <div class="modal fade" id="groupModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="groupModalTitle">Add New Group</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="groupForm">
                                    <div class="mb-3">
                                        <label class="form-label">Group Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="groupName" required maxlength="200">
                                        <div class="form-text">Enter a descriptive name for the group</div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Group Code <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="groupCode" required maxlength="4" pattern="[0-9]{4}">
                                        <div class="form-text">4-digit numeric code (e.g., 1001)</div>
                                        <div id="codeRangeHelp" class="form-text text-info"></div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Parent Group <span class="text-danger">*</span></label>
                                        <select class="form-select" id="parentGroup" required>
                                            <option value="">Select parent group...</option>
                                        </select>
                                        <div class="form-text">Select the parent group for hierarchical organization</div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveGroupBtn">
                                    <i class="bi bi-check-circle"></i> Save Group
                                </button>
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
                                    <p class="mb-0 mt-2" id="deleteMessage">Are you sure you want to delete this item?</p>
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
        getPageStyles: function() {
            return `
                .chart-of-accounts-page {
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

                .summary-card.assets .card-icon {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .summary-card.liabilities .card-icon {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .summary-card.income .card-icon {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .summary-card.expenses .card-icon {
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

                .content-card .card-header {
                    background: #f8f9fa;
                    padding: 15px 20px;
                    border-bottom: 1px solid #dee2e6;
                }

                .content-card .card-header h5 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .content-card .card-body {
                    padding: 20px;
                }

                .tree-container {
                    min-height: 400px;
                    max-height: 600px;
                    overflow-y: auto;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                }

                /* Tree View Styles */
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

                .tree-node-icon {
                    margin-right: 8px;
                    color: #6c757d;
                }

                .tree-node.expanded > .tree-node-children {
                    display: block;
                }

                .tree-node-children {
                    display: none;
                    margin-left: 20px;
                    border-left: 1px dashed #dee2e6;
                }

                .tree-node-label {
                    flex-grow: 1;
                    font-weight: 500;
                }

                .tree-node-code {
                    color: #6c757d;
                    font-size: 12px;
                    margin-left: 8px;
                }

                .tree-node-actions {
                    display: none;
                    gap: 5px;
                }

                .tree-node-content:hover .tree-node-actions {
                    display: flex;
                }

                .tree-node-content.selected .tree-node-actions {
                    display: flex;
                }

                .tree-node-badge {
                    background: #e9ecef;
                    color: #495057;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    margin-left: 8px;
                }

                .tree-node-content.selected .tree-node-badge {
                    background: rgba(255,255,255,0.3);
                    color: white;
                }

                /* Group type colors */
                .tree-node[data-type="group"] > .tree-node-content .tree-node-icon {
                    color: #ffc107;
                }

                .tree-node[data-type="ledger"] > .tree-node-content .tree-node-icon {
                    color: #28a745;
                }

                /* Details Panel */
                .detail-item {
                    padding: 10px 0;
                    border-bottom: 1px solid #e9ecef;
                }

                .detail-item:last-child {
                    border-bottom: none;
                }

                .detail-label {
                    font-size: 12px;
                    color: #6c757d;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }

                .detail-value {
                    font-size: 16px;
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .summary-card {
                        margin-bottom: 15px;
                    }
                    
                    .content-card {
                        margin-bottom: 20px;
                    }
                }
            `;
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // View toggle
            $('#treeViewBtn').on('click', function() {
                self.viewMode = 'tree';
                $(this).addClass('active');
                $('#listViewBtn').removeClass('active');
                $('#treeContainer').show();
                $('#listContainer').hide();
                self.renderTree();
            });
            
            $('#listViewBtn').on('click', function() {
                self.viewMode = 'list';
                $(this).addClass('active');
                $('#treeViewBtn').removeClass('active');
                $('#treeContainer').hide();
                $('#listContainer').show();
                self.renderList();
            });
            
            // Search
            let searchTimeout;
            $('#searchInput').on('input', function() {
                clearTimeout(searchTimeout);
                const searchTerm = $(this).val().toLowerCase();
                searchTimeout = setTimeout(function() {
                    self.filterTree(searchTerm);
                }, 300);
            });
            
            // Expand/Collapse all
            $('#expandAllBtn').on('click', function() {
                $('.tree-node').addClass('expanded');
            });
            
            $('#collapseAllBtn').on('click', function() {
                $('.tree-node').removeClass('expanded');
            });
            
            // Add group button
            $('#addGroupBtn').on('click', function() {
                self.showGroupModal();
            });
            
            // Save group
            $('#saveGroupBtn').on('click', function() {
                self.saveGroup();
            });
            
            // Parent group change - update code range help
            $('#parentGroup').on('change', function() {
                self.updateCodeRangeHelp($(this).val());
            });
            
            // Confirm delete
            $('#confirmDeleteBtn').on('click', function() {
                self.executeDelete();
            });
            
            // Set default active view
            $('#treeViewBtn').addClass('active');
        },
        
        // Load initial data
        loadInitialData: function() {
            this.loadPermissions();
            this.loadSummaryTotals();
            this.loadTreeData();
        },
        
        // Load permissions
        loadPermissions: function() {
            const self = this;
            
            // These will come from the API response
            // For now, checking based on user role
            const userType = this.currentUser.user_type;
            
            this.permissions = {
                can_create_group: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_group: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_group: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_details: true
            };
            
            // Show/hide UI elements based on permissions
            if (this.permissions.can_create_group) {
                $('#addGroupBtn').show();
            }
        },
        
        // Load summary totals
        loadSummaryTotals: function() {
            const self = this;
            
            TempleAPI.get('/accounts/chart-of-accounts/summary-totals')
                .done(function(response) {
                    if (response.success) {
                        const totals = response.data.formatted;
                        $('#assetsTotal').text(`${self.formatCurrency(totals.assets)}`);
                        $('#liabilitiesTotal').text(`${self.formatCurrency(totals.liabilities)}`);
                        $('#incomeTotal').text(`${self.formatCurrency(totals.income)}`);
                        $('#expensesTotal').text(`${self.formatCurrency(totals.expenses)}`);
                    }
                })
                .fail(function() {
                    console.error('Failed to load summary totals');
                });
        },
        
        // Load tree data
        loadTreeData: function() {
            const self = this;
            
            TempleAPI.get('/accounts/chart-of-accounts/tree')
                .done(function(response) {
                    if (response.success) {
                        self.treeData = response.data.tree;
                        self.permissions = response.data.permissions || self.permissions;
                        self.renderTree();
                    }
                })
                .fail(function() {
                    self.showError('Failed to load chart of accounts');
                });
        },
        
        // Render tree view
        renderTree: function() {
            if (this.treeData.length === 0) {
                $('#treeContainer').html(`
                    <div class="text-center py-5">
                        <i class="bi bi-folder-x" style="font-size: 48px; color: #dee2e6;"></i>
                        <p class="mt-3 text-muted">No accounts found</p>
                    </div>
                `);
                return;
            }
            
            const treeHtml = this.buildTreeHtml(this.treeData, 0);
            $('#treeContainer').html(treeHtml);
            
            this.bindTreeEvents();
        },
        
        // Build tree HTML recursively
        buildTreeHtml: function(nodes, level) {
            let html = '';
            const self = this;
            
            nodes.forEach(function(node) {
                const hasChildren = node.children && node.children.length > 0;
                const isGroup = node.type === 'group';
                const icon = isGroup ? 'bi-folder' : 'bi-file-text';
                const nodeId = node.id;
                
                html += `
                    <div class="tree-node" data-id="${nodeId}" data-type="${node.type}" data-level="${level}">
                        <div class="tree-node-content">
                            ${hasChildren ? `
                                <span class="tree-node-toggle">
                                    <i class="bi bi-chevron-right"></i>
                                </span>
                            ` : '<span class="tree-node-toggle"></span>'}
                            <i class="tree-node-icon bi ${icon}"></i>
                            <span class="tree-node-label">${node.data.name}</span>
                            <span class="tree-node-code">[${node.data.code}]</span>
                            ${isGroup && node.data.ledgers_count > 0 ? 
                                `<span class="tree-node-badge">${node.data.ledgers_count} ledgers</span>` : ''}
                            <div class="tree-node-actions">
                                ${self.permissions.can_edit_group && isGroup && !node.data.fixed ? `
                                    <button class="btn btn-sm btn-outline-secondary edit-node-btn" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : ''}
                                ${self.permissions.can_delete_group && isGroup && !node.data.fixed ? `
                                    <button class="btn btn-sm btn-outline-danger delete-node-btn" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
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
        bindTreeEvents: function() {
            const self = this;
            
            // Toggle expand/collapse
            $('.tree-node-toggle').on('click', function(e) {
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
            
            // Node selection
            $('.tree-node-content').on('click', function() {
                $('.tree-node-content').removeClass('selected');
                $(this).addClass('selected');
                
                const $node = $(this).closest('.tree-node');
                const nodeId = $node.data('id');
                const nodeType = $node.data('type');
                
                self.selectNode(nodeId, nodeType);
            });
            
            // Edit button
            $('.edit-node-btn').on('click', function(e) {
                e.stopPropagation();
                const $node = $(this).closest('.tree-node');
                const nodeId = $node.data('id');
                self.editGroup(nodeId);
            });
            
            // Delete button
            $('.delete-node-btn').on('click', function(e) {
                e.stopPropagation();
                const $node = $(this).closest('.tree-node');
                const nodeId = $node.data('id');
                self.deleteGroup(nodeId);
            });
        },
        
        // Select node and show details
        selectNode: function(nodeId, nodeType) {
            const self = this;
            this.selectedNode = { id: nodeId, type: nodeType };
            
            // Find node data
            const node = this.findNodeById(nodeId, this.treeData);
            if (!node) return;
            
            // Render details panel
            this.renderDetailsPanel(node);
            
            // Show quick actions if permissions allow
            if (this.permissions.can_edit_group || this.permissions.can_delete_group) {
                this.renderQuickActions(node);
            }
        },
        
        // Find node by ID recursively
        findNodeById: function(nodeId, nodes) {
            for (let node of nodes) {
                if (node.id === nodeId) {
                    return node;
                }
                if (node.children) {
                    const found = this.findNodeById(nodeId, node.children);
                    if (found) return found;
                }
            }
            return null;
        },
        
        // Render details panel
        renderDetailsPanel: function(node) {
            const isGroup = node.type === 'group';
            const data = node.data;
            
            let detailsHtml = `
                <div class="detail-item">
                    <div class="detail-label">Type</div>
                    <div class="detail-value">
                        <span class="badge ${isGroup ? 'bg-warning' : 'bg-success'}">
                            ${isGroup ? 'Group' : 'Ledger'}
                        </span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${data.name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Code</div>
                    <div class="detail-value">${data.code}</div>
                </div>
            `;
            
            if (isGroup) {
                detailsHtml += `
                    <div class="detail-item">
                        <div class="detail-label">Sub-Groups</div>
                        <div class="detail-value">${data.children_count || 0}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Ledgers</div>
                        <div class="detail-value">${data.ledgers_count || 0}</div>
                    </div>
                    ${data.parent_name ? `
                        <div class="detail-item">
                            <div class="detail-label">Parent Group</div>
                            <div class="detail-value">${data.parent_name}</div>
                        </div>
                    ` : ''}
                    ${data.fixed ? `
                        <div class="detail-item">
                            <div class="detail-label">Status</div>
                            <div class="detail-value">
                                <span class="badge bg-secondary">System Group</span>
                            </div>
                        </div>
                    ` : ''}
                `;
            }
            
            $('#detailsPanel').html(detailsHtml);
        },
        
        // Render quick actions
        renderQuickActions: function(node) {
            const isGroup = node.type === 'group';
            const data = node.data;
            
            if (!isGroup) {
                $('#quickActionsCard').hide();
                return;
            }
            
            let actionsHtml = '';
            
            if (this.permissions.can_create_group) {
                actionsHtml += `
                    <button class="btn btn-outline-primary" onclick="AccountsChartOfAccountsPage.addSubGroup('${node.id}')">
                        <i class="bi bi-folder-plus"></i> Add Sub-Group
                    </button>
                `;
            }
            
            if (!data.fixed) {
                if (this.permissions.can_edit_group) {
                    actionsHtml += `
                        <button class="btn btn-outline-secondary" onclick="AccountsChartOfAccountsPage.editGroup('${node.id}')">
                            <i class="bi bi-pencil"></i> Edit Group
                        </button>
                    `;
                }
                
                if (this.permissions.can_delete_group && data.children_count === 0 && data.ledgers_count === 0) {
                    actionsHtml += `
                        <button class="btn btn-outline-danger" onclick="AccountsChartOfAccountsPage.deleteGroup('${node.id}')">
                            <i class="bi bi-trash"></i> Delete Group
                        </button>
                    `;
                }
            }
            
            if (actionsHtml) {
                $('#quickActionsContainer').html(actionsHtml);
                $('#quickActionsCard').show();
            } else {
                $('#quickActionsCard').hide();
            }
        },
        
        // Show group modal
        showGroupModal: function(editId = null, parentId = null) {
            const self = this;
            
            // Reset form
            $('#groupForm')[0].reset();
            $('#codeRangeHelp').text('');
            
            // Load parent groups
            this.loadParentGroups(editId);
            
            if (editId) {
                // Edit mode
                $('#groupModalTitle').text('Edit Group');
                const groupId = editId.replace('g_', '');
                
                TempleAPI.get('/accounts/chart-of-accounts/groups/' + groupId)
                    .done(function(response) {
                        if (response.success) {
                            const group = response.data.group;
                            $('#groupName').val(group.name);
                            $('#groupCode').val(group.code);
                            $('#parentGroup').val(group.parent_id);
                            self.updateCodeRangeHelp(group.parent_id);
                            
                            $('#groupModal').data('edit-id', groupId);
                            const modal = new bootstrap.Modal(document.getElementById('groupModal'));
                            modal.show();
                        }
                    });
            } else {
                // Add mode
                $('#groupModalTitle').text('Add New Group');
                
                if (parentId) {
                    const actualParentId = parentId.replace('g_', '');
                    $('#parentGroup').val(actualParentId);
                    this.updateCodeRangeHelp(actualParentId);
                }
                
                $('#groupModal').removeData('edit-id');
                const modal = new bootstrap.Modal(document.getElementById('groupModal'));
                modal.show();
            }
        },
        
        // Load parent groups for dropdown
        loadParentGroups: function(excludeId) {
            const self = this;
            
            TempleAPI.get('/accounts/chart-of-accounts/hierarchical-groups', {
                exclude_id: excludeId ? excludeId.replace('g_', '') : null
            })
            .done(function(response) {
                if (response.success) {
                    const $select = $('#parentGroup');
                    $select.empty();
                    $select.append('<option value="">Select parent group...</option>');
                    
                    response.data.groups.forEach(function(group) {
                        const indent = '&nbsp;&nbsp;'.repeat(group.level * 2);
                        $select.append(`<option value="${group.id}">${indent}${group.display_name}</option>`);
                    });
                }
            });
        },
        
        // Update code range help text
        updateCodeRangeHelp: function(parentId) {
            if (!parentId) {
                $('#codeRangeHelp').text('');
                return;
            }
            
            const parentNode = this.findNodeById('g_' + parentId, this.treeData);
            if (parentNode) {
                const parentCode = parseInt(parentNode.data.code);
                const rangeStart = Math.floor(parentCode / 1000) * 1000;
                const rangeEnd = rangeStart + 999;
                $('#codeRangeHelp').text(`Code must be between ${rangeStart} and ${rangeEnd} for this parent group`);
            }
        },
        
        // Save group
        saveGroup: function() {
            const self = this;
            
            const $form = $('#groupForm')[0];
            if (!$form.checkValidity()) {
                $form.classList.add('was-validated');
                return;
            }
            
            const data = {
                name: $('#groupName').val(),
                code: $('#groupCode').val(),
                parent_id: $('#parentGroup').val()
            };
            
            const editId = $('#groupModal').data('edit-id');
            
            TempleCore.showLoading(true);
            
            const request = editId 
                ? TempleAPI.put('/accounts/chart-of-accounts/groups/' + editId, data)
                : TempleAPI.post('/accounts/chart-of-accounts/groups', data);
            
            request
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('groupModal')).hide();
                        TempleCore.showToast(editId ? 'Group updated successfully' : 'Group created successfully', 'success');
                        self.loadTreeData();
                        self.loadSummaryTotals();
                    }
                })
                .fail(function(xhr) {
                    let message = 'Failed to save group';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(message, 'danger');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Add sub-group
        addSubGroup: function(parentId) {
            this.showGroupModal(null, parentId);
        },
        
        // Edit group
        editGroup: function(nodeId) {
            this.showGroupModal(nodeId);
        },
        
        // Delete group
        deleteGroup: function(nodeId) {
            const node = this.findNodeById(nodeId, this.treeData);
            if (!node) return;
            
            $('#deleteMessage').html(`Are you sure you want to delete the group "<strong>${node.data.name}</strong>"?`);
            $('#deleteModal').data('delete-id', nodeId);
            $('#deleteModal').data('delete-type', 'group');
            
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        },
        
        // Execute delete
        executeDelete: function() {
            const self = this;
            const deleteId = $('#deleteModal').data('delete-id');
            const deleteType = $('#deleteModal').data('delete-type');
            
            if (!deleteId) return;
            
            const actualId = deleteId.replace('g_', '').replace('l_', '');
            
            TempleCore.showLoading(true);
            
            const endpoint = deleteType === 'group' 
                ? '/accounts/chart-of-accounts/groups/' + actualId
                : '/accounts/chart-of-accounts/ledgers/' + actualId;
            
            TempleAPI.delete(endpoint)
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                        TempleCore.showToast(`${deleteType === 'group' ? 'Group' : 'Ledger'} deleted successfully`, 'success');
                        self.loadTreeData();
                        self.loadSummaryTotals();
                        $('#detailsPanel').html(`
                            <div class="text-center text-muted py-5">
                                <i class="bi bi-mouse" style="font-size: 48px;"></i>
                                <p class="mt-3">Select an account or group to view details</p>
                            </div>
                        `);
                        $('#quickActionsCard').hide();
                    }
                })
                .fail(function(xhr) {
                    let message = 'Failed to delete';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(message, 'danger');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Filter tree based on search
        filterTree: function(searchTerm) {
            if (!searchTerm) {
                $('.tree-node').show();
                return;
            }
            
            $('.tree-node').each(function() {
                const $node = $(this);
                const label = $node.find('.tree-node-label').first().text().toLowerCase();
                const code = $node.find('.tree-node-code').first().text().toLowerCase();
                
                if (label.includes(searchTerm) || code.includes(searchTerm)) {
                    $node.show();
                    // Show all parents
                    $node.parents('.tree-node').show().addClass('expanded');
                } else {
                    $node.hide();
                }
            });
        },
        
        // Render list view
        renderList: function() {
            // This would render a flat list/table view of all accounts
            // Implementation would be similar to the members list view
            $('#listContainer').html(`
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> List view will be implemented in the next phase
                </div>
            `);
        },
        
        // Show error message
        showError: function(message) {
            $('#treeContainer').html(`
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                </div>
            `);
        },
            // Format currency
        formatCurrency: function(amount) {
             
            return TempleCore.formatCurrency(amount);
        }
    };
    
})(jQuery, window);