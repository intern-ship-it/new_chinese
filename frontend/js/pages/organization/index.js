// js/pages/organization.js
// Organization page module using jQuery

(function($, window) {
    'use strict';
    
    window.OrganizationPage = {
        currentUser: null,
        positions: [],
        memberTypes: [],
        activeTab: 'positions',
        
        // Initialize page
        init: function(params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.bindEvents();
            this.loadData();
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="organization-page">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h2">Organization Management</h1>
                        <div id="adminActions" style="${this.isAdmin() ? '' : 'display: none;'}">
                            <button class="btn btn-primary" id="addPositionBtn">
                                <i class="bi bi-plus-circle"></i> Add Position
                            </button>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <ul class="nav nav-tabs tab-nav">
                        <li class="nav-item">
                            <a class="nav-link active" data-tab="positions" href="#">
                                <i class="bi bi-diagram-3"></i> Positions
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-tab="memberTypes" href="#">
                                <i class="bi bi-card-list"></i> Member Types
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-tab="history" href="#">
                                <i class="bi bi-clock-history"></i> History
                            </a>
                        </li>
                    </ul>

                    <!-- Tab Content -->
                    <div class="tab-content mt-4">
                        <!-- Positions Tab -->
                        <div class="tab-pane show active" id="positions">
                            <div class="row">
                                <div class="col-lg-8">
                                    <div class="org-card">
                                        <h5 class="mb-4">Organization Structure</h5>
                                        <div id="positionsList">
                                            <div class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="org-card">
                                        <h5 class="mb-4">Hierarchy Chart</h5>
                                        <div id="hierarchyChart" class="hierarchy-chart">
                                            <!-- Hierarchy will be displayed here -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Member Types Tab -->
                        <div class="tab-pane" id="memberTypes">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <h5>Member Types Management</h5>
                                <button class="btn btn-primary" id="addMemberTypeBtn" style="${this.isAdmin() ? '' : 'display: none;'}">
                                    <i class="bi bi-plus-circle"></i> Add Member Type
                                </button>
                            </div>
                            
                            <div class="row" id="memberTypesList">
                                <div class="col-12 text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- History Tab -->
                        <div class="tab-pane" id="history">
                            <div class="org-card">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <h5>Position Change History</h5>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="search-box">
                                            <i class="bi bi-search"></i>
                                            <input type="text" class="form-control" placeholder="Search history..." id="historySearch">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="history-timeline" id="historyTimeline">
                                    <div class="text-center py-4">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
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
                <!-- Assign Position Modal -->
                <div class="modal fade" id="assignPositionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Assign Position</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="assignPositionForm">
                                    <input type="hidden" id="assignPositionId">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Position</label>
                                        <input type="text" class="form-control" id="assignPositionName" readonly>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Select Member <span class="text-danger">*</span></label>
                                        <select class="form-select" id="assignMemberId" required>
                                            <option value="">Choose a member...</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Term Start Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="assignStartDate" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Term End Date <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="assignEndDate" required>
                                        <small class="text-muted">Default term is 3 years</small>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Appointment Reason (Optional)</label>
                                        <textarea class="form-control" id="assignReason" rows="2" placeholder="Enter reason for appointment"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="assignPositionSubmit">
                                    <i class="bi bi-check-circle"></i> Assign Position
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Remove Position Modal -->
                <div class="modal fade" id="removePositionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">Remove Position</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Are you sure you want to remove <strong id="removeMemberName"></strong> from the position of <strong id="removePositionName"></strong>?</p>
                                
                                <input type="hidden" id="removeUserId">
                                
                                <div class="mb-3">
                                    <label class="form-label">Reason for Removal <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="removeReason" rows="3" required placeholder="Please provide a reason for removing this member from the position"></textarea>
                                </div>
                                
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i> <strong>Warning:</strong> This action will revert the member's role to basic member and remove all position-specific permissions.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="removePositionSubmit">
                                    <i class="bi bi-x-circle"></i> Remove Position
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add Position Modal -->
                <div class="modal fade" id="addPositionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add New Position</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="addPositionForm">
                                    <div class="mb-3">
                                        <label class="form-label">Position Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="newPositionName" required placeholder="e.g., Trustee">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Display Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="newPositionDisplayName" required placeholder="e.g., Board Trustee">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="newPositionDescription" rows="2" placeholder="Brief description of the position"></textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Hierarchy Level <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="newPositionHierarchy" min="6" required>
                                        <small class="text-muted">Levels 1-5 are reserved for default positions. Use 6 or higher.</small>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Maximum Holders <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="newPositionMaxHolders" min="1" max="10" value="1" required>
                                        <small class="text-muted">How many people can hold this position simultaneously</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="createPositionSubmit">
                                    <i class="bi bi-plus-circle"></i> Create Position
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add Member Type Modal -->
                <div class="modal fade" id="addMemberTypeModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add New Member Type</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="addMemberTypeForm">
                                    <div class="mb-3">
                                        <label class="form-label">Type Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="memberTypeName" required placeholder="e.g., patron">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Display Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="memberTypeDisplayName" required placeholder="e.g., Patron Member">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="memberTypeDescription" rows="2" placeholder="Brief description of this member type"></textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="memberTypeIsPaid">
                                            <label class="form-check-label" for="memberTypeIsPaid">
                                                Paid Subscription Required
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div id="subscriptionDetails" style="display: none;">
                                        <div class="mb-3">
                                            <label class="form-label">Subscription Amount (?) <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="memberTypeAmount" min="0" step="0.01" placeholder="0.00">
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">Subscription Period (Months)</label>
                                            <input type="number" class="form-control" id="memberTypePeriod" min="1" placeholder="12">
                                            <small class="text-muted">Leave empty for lifetime membership</small>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Priority Level</label>
                                        <input type="number" class="form-control" id="memberTypePriority" min="0" max="100" value="0">
                                        <small class="text-muted">Higher number = higher priority</small>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="createMemberTypeSubmit">
                                    <i class="bi bi-plus-circle"></i> Create Type
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Get page specific styles
        getPageStyles: function() {
            return `
                .org-card {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    margin-bottom: 20px;
                }

                .position-card {
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 15px;
                    border: 1px solid #e9ecef;
                    transition: all 0.3s ease;
                }

                .position-card:hover {
                    box-shadow: 0 5px 15px rgba(0,0,0,.1);
                    transform: translateY(-2px);
                }

                .position-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .position-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--primary-color);
                }

                .position-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .badge-default {
                    background-color: #e3f2fd;
                    color: #1976d2;
                }

                .badge-custom {
                    background-color: #f3e5f5;
                    color: #7b1fa2;
                }

                .member-info {
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 10px;
                }

                .member-avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 18px;
                }

                .hierarchy-chart {
                    position: relative;
                    padding: 20px;
                }

                .hierarchy-level {
                    margin-bottom: 30px;
                    padding-left: 20px;
                    border-left: 3px solid var(--primary-color);
                }

                .empty-position {
                    border: 2px dashed #dee2e6;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px;
                    color: #6c757d;
                }

                .member-type-card {
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 15px;
                    border: 1px solid #e9ecef;
                    transition: all 0.3s ease;
                }

                .member-type-card:hover {
                    box-shadow: 0 5px 15px rgba(0,0,0,.1);
                    transform: translateY(-2px);
                }

                .subscription-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .badge-free {
                    background-color: #e8f5e9;
                    color: #2e7d32;
                }

                .badge-paid {
                    background-color: #fff3e0;
                    color: #e65100;
                }

                .tab-nav {
                    border-bottom: 2px solid #e9ecef;
                    margin-bottom: 30px;
                }

                .tab-nav .nav-link {
                    color: #6c757d;
                    border: none;
                    padding: 12px 24px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .tab-nav .nav-link.active {
                    color: var(--primary-color);
                    border-bottom: 3px solid var(--primary-color);
                }

                .history-timeline {
                    position: relative;
                    padding-left: 40px;
                }

                .history-timeline::before {
                    content: '';
                    position: absolute;
                    left: 15px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background-color: #e9ecef;
                }

                .history-item {
                    position: relative;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }

                .history-item::before {
                    content: '';
                    position: absolute;
                    left: -30px;
                    top: 20px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background-color: var(--primary-color);
                }

                .search-box {
                    position: relative;
                    margin-bottom: 20px;
                }

                .search-box input {
                    padding-left: 40px;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                }

                .search-box i {
                    position: absolute;
                    left: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6c757d;
                }
            `;
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Tab switching
            $(document).on('click', '.nav-link[data-tab]', function(e) {
                e.preventDefault();
                const tab = $(this).data('tab');
                self.switchTab(tab);
            });
            
            // Add position button
            $(document).on('click', '#addPositionBtn', function() {
                self.showAddPositionModal();
            });
            
            // Add member type button
            $(document).on('click', '#addMemberTypeBtn', function() {
                self.showAddMemberTypeModal();
            });
            
            // Assign position submit
            $(document).on('click', '#assignPositionSubmit', function() {
                self.assignPosition();
            });
            
            // Remove position submit
            $(document).on('click', '#removePositionSubmit', function() {
                self.removePosition();
            });
            
            // Create position submit
            $(document).on('click', '#createPositionSubmit', function() {
                self.createPosition();
            });
            
            // Create member type submit
            $(document).on('click', '#createMemberTypeSubmit', function() {
                self.createMemberType();
            });
            
            // Toggle subscription details
            $(document).on('change', '#memberTypeIsPaid', function() {
                if ($(this).is(':checked')) {
                    $('#subscriptionDetails').show();
                    $('#memberTypeAmount').attr('required', true);
                } else {
                    $('#subscriptionDetails').hide();
                    $('#memberTypeAmount').attr('required', false);
                }
            });
            
            // History search
            $(document).on('input', '#historySearch', function() {
                const searchTerm = $(this).val().toLowerCase();
                $('.history-item').each(function() {
                    const text = $(this).text().toLowerCase();
                    $(this).toggle(text.includes(searchTerm));
                });
            });
        },
        
        // Load all data
        loadData: function() {
            this.loadPositions();
            this.loadMemberTypes();
            this.loadHistory();
        },
        
        // Load positions
        loadPositions: function() {
            const self = this;
            
            TempleAPI.get('/organization/positions')
                .done(function(response) {
                    if (response.success) {
                        self.positions = response.data;
                        self.renderPositions();
                        self.renderHierarchy();
                    }
                })
                .fail(function() {
                    self.showAlert('Failed to load organization positions', 'error');
                });
        },
        
        // Render positions
        renderPositions: function() {
            const self = this;
            const container = $('#positionsList');
            container.empty();
            
            if (self.positions.length === 0) {
                container.html(`
                    <div class="text-center py-4">
                        <i class="bi bi-diagram-3 text-muted" style="font-size: 48px;"></i>
                        <p class="text-muted mt-2">No positions found</p>
                    </div>
                `);
                return;
            }
            
            $.each(self.positions, function(index, position) {
                const isDefault = position.is_default;
                const hasHolder = position.current_holders && position.current_holders.length > 0;
                
                let positionHtml = `
                    <div class="position-card">
                        <div class="position-header">
                            <div>
                                <span class="position-title">${position.display_name}</span>
                                <span class="position-badge ${isDefault ? 'badge-default' : 'badge-custom'} ms-2">
                                    ${isDefault ? 'Default' : 'Custom'}
                                </span>
                                ${position.max_holders > 1 ? `<small class="text-muted ms-2">(Max: ${position.max_holders})</small>` : ''}
                            </div>
                            <div>
                                ${self.isAdmin() && (!hasHolder || position.current_holders.length < position.max_holders) ? 
                                    `<button class="btn btn-sm btn-primary assign-btn" data-position-id="${position.id}" data-position-name="${position.display_name}">
                                        <i class="bi bi-person-plus"></i> Assign
                                    </button>` : ''}
                                ${!isDefault && self.isAdmin() && !hasHolder ? 
                                    `<button class="btn btn-sm btn-outline-danger ms-2 delete-position-btn" data-position-id="${position.id}">
                                        <i class="bi bi-trash"></i>
                                    </button>` : ''}
                            </div>
                        </div>
                `;
                
                if (hasHolder) {
                    $.each(position.current_holders, function(i, holder) {
                        positionHtml += `
                            <div class="member-info">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <div class="member-avatar me-3">
                                            ${holder.user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h6 class="mb-1">${holder.user.name}</h6>
                                            <small class="text-muted">
                                                <i class="bi bi-envelope"></i> ${holder.user.email}<br>
                                                <i class="bi bi-phone"></i> ${holder.user.mobile_no || 'N/A'}<br>
                                                <i class="bi bi-calendar"></i> Term: ${self.formatDate(holder.term_start_date)} to ${self.formatDate(holder.term_end_date)}
                                            </small>
                                        </div>
                                    </div>
                                    ${self.isAdmin() ? 
                                        `<button class="btn btn-sm btn-danger remove-position-btn" 
                                            data-user-id="${holder.user.id}" 
                                            data-user-name="${holder.user.name}" 
                                            data-position-name="${position.display_name}">
                                            <i class="bi bi-x-circle"></i> Remove
                                        </button>` : ''}
                                </div>
                            </div>
                        `;
                    });
                } else {
                    positionHtml += `<div class="empty-position"><i class="bi bi-person-x"></i> No member assigned</div>`;
                }
                
                positionHtml += '</div>';
                container.append(positionHtml);
            });
            
            // Bind position-specific events
            $('.assign-btn').on('click', function() {
                const positionId = $(this).data('position-id');
                const positionName = $(this).data('position-name');
                self.showAssignModal(positionId, positionName);
            });
            
            $('.remove-position-btn').on('click', function() {
                const userId = $(this).data('user-id');
                const userName = $(this).data('user-name');
                const positionName = $(this).data('position-name');
                self.showRemoveModal(userId, userName, positionName);
            });
            
            $('.delete-position-btn').on('click', function() {
                const positionId = $(this).data('position-id');
                self.deletePosition(positionId);
            });
        },
        
        // Render hierarchy
        renderHierarchy: function() {
            const self = this;
            const container = $('#hierarchyChart');
            container.empty();
            
            const levels = {};
            $.each(self.positions, function(index, pos) {
                if (!levels[pos.hierarchy_level]) {
                    levels[pos.hierarchy_level] = [];
                }
                levels[pos.hierarchy_level].push(pos);
            });
            
            const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
            
            $.each(sortedLevels, function(index, level) {
                let levelHtml = `<div class="hierarchy-level">`;
                $.each(levels[level], function(i, pos) {
                    const hasHolder = pos.current_holders && pos.current_holders.length > 0;
                    levelHtml += `
                        <div class="mb-2">
                            <strong>${pos.display_name}</strong>
                            ${hasHolder ? 
                                pos.current_holders.map(h => 
                                    `<br><small class="text-success"><i class="bi bi-check-circle"></i> ${h.user.name}</small>`
                                ).join('') : 
                                '<br><small class="text-muted"><i class="bi bi-dash-circle"></i> Vacant</small>'}
                        </div>
                    `;
                });
                levelHtml += '</div>';
                container.append(levelHtml);
            });
        },
        
        // Load member types
        loadMemberTypes: function() {
            const self = this;
            
            TempleAPI.get('/member-types')
                .done(function(response) {
                    if (response.success) {
                        self.memberTypes = response.data;
                        self.renderMemberTypes();
                    }
                })
                .fail(function() {
                    console.error('Failed to load member types');
                });
        },
        
        // Render member types
        renderMemberTypes: function() {
            const self = this;
            const container = $('#memberTypesList');
            container.empty();
            
            if (self.memberTypes.length === 0) {
                container.html(`
                    <div class="col-12 text-center py-4">
                        <i class="bi bi-card-list text-muted" style="font-size: 48px;"></i>
                        <p class="text-muted mt-2">No member types found</p>
                    </div>
                `);
                return;
            }
            
            $.each(self.memberTypes, function(index, type) {
                const typeHtml = `
                    <div class="col-md-6 col-lg-4">
                        <div class="member-type-card">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6>${type.display_name}</h6>
                                    ${type.is_default ? '<span class="badge bg-primary">Default</span>' : ''}
                                </div>
                                <span class="subscription-badge ${type.is_paid ? 'badge-paid' : 'badge-free'}">
                                    ${type.is_paid ? 'Paid' : 'Free'}
                                </span>
                            </div>
                            <p class="text-muted small">${type.description || 'No description'}</p>
                            ${type.is_paid ? `
                                <div class="mb-2">
                                    <strong>?${type.subscription_amount}</strong>
                                    ${type.subscription_period ? `/ ${type.subscription_period} months` : ' (Lifetime)'}
                                </div>
                            ` : ''}
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted"><i class="bi bi-people"></i> ${type.member_count || 0} members</small>
                                ${!type.is_default && type.is_deletable && self.isAdmin() ? 
                                    `<button class="btn btn-sm btn-outline-danger delete-member-type-btn" data-type-id="${type.id}">
                                        <i class="bi bi-trash"></i>
                                    </button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                container.append(typeHtml);
            });
            
            // Bind delete events
            $('.delete-member-type-btn').on('click', function() {
                const typeId = $(this).data('type-id');
                self.deleteMemberType(typeId);
            });
        },
        
        // Load history
        loadHistory: function() {
            const self = this;
            
            TempleAPI.get('/organization/history')
                .done(function(response) {
                    if (response.success) {
                        self.renderHistory(response.data.data || response.data);
                    }
                })
                .fail(function() {
                    console.error('Failed to load history');
                });
        },
        
        // Render history
        renderHistory: function(history) {
            const self = this;
            const container = $('#historyTimeline');
            container.empty();
            
            if (!history || history.length === 0) {
                container.html(`
                    <div class="text-center py-4">
                        <i class="bi bi-clock-history text-muted" style="font-size: 48px;"></i>
                        <p class="text-muted mt-2">No history records found</p>
                    </div>
                `);
                return;
            }
            
            $.each(history, function(index, item) {
                const actionColor = item.action === 'APPOINTED' ? 'success' : 'danger';
                const actionIcon = item.action === 'APPOINTED' ? 'person-plus' : 'person-dash';
                
                const historyHtml = `
                    <div class="history-item">
                        <div class="d-flex justify-content-between">
                            <div>
                                <i class="bi bi-${actionIcon} text-${actionColor}"></i>
                                <strong>${item.user?.name || 'Unknown'}</strong> was 
                                <span class="text-${actionColor}">${item.action.toLowerCase()}</span>
                                ${item.action === 'APPOINTED' ? 'to' : 'from'} 
                                <strong>${item.position?.display_name || 'Unknown Position'}</strong>
                            </div>
                            <small class="text-muted">${self.formatDate(item.action_date)}</small>
                        </div>
                        ${item.reason ? `<div class="mt-2"><small class="text-muted">Reason: ${item.reason}</small></div>` : ''}
                        ${item.actionBy ? `<div><small class="text-muted">By: ${item.actionBy.name}</small></div>` : ''}
                    </div>
                `;
                container.append(historyHtml);
            });
        },
        
        // Switch tab
        switchTab: function(tab) {
            $('.nav-link[data-tab]').removeClass('active');
            $(`.nav-link[data-tab="${tab}"]`).addClass('active');
            
            $('.tab-pane').removeClass('show active');
            $(`#${tab}`).addClass('show active');
            
            this.activeTab = tab;
        },
        
        // Show assign modal
        showAssignModal: function(positionId, positionName) {
            const self = this;
            
            $('#assignPositionId').val(positionId);
            $('#assignPositionName').val(positionName);
            
            // Set default dates
            const today = new Date();
            const threeYearsLater = new Date(today);
            threeYearsLater.setFullYear(today.getFullYear() + 3);
            
            $('#assignStartDate').val(today.toISOString().split('T')[0]);
            $('#assignEndDate').val(threeYearsLater.toISOString().split('T')[0]);
            
            // Load available members
            TempleAPI.get('/organization/available-members')
                .done(function(response) {
                    if (response.success) {
                        const select = $('#assignMemberId');
                        select.empty();
                        select.append('<option value="">Choose a member...</option>');
                        
                        $.each(response.data, function(index, member) {
                            select.append(`<option value="${member.id}">${member.name} (${member.member_code || 'No Code'})</option>`);
                        });
                    }
                })
                .fail(function() {
                    console.error('Failed to load members');
                });
            
            const modal = new bootstrap.Modal(document.getElementById('assignPositionModal'));
            modal.show();
        },
        
        // Assign position
        assignPosition: function() {
            const self = this;
            
            const data = {
                position_id: $('#assignPositionId').val(),
                user_id: $('#assignMemberId').val(),
                term_start_date: $('#assignStartDate').val(),
                term_end_date: $('#assignEndDate').val(),
                appointment_reason: $('#assignReason').val()
            };
            
            if (!data.user_id) {
                self.showAlert('Please select a member', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/organization/assign-position', data)
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('assignPositionModal')).hide();
                        self.loadPositions();
                        self.loadHistory();
                        self.showAlert('Position assigned successfully', 'success');
                    } else {
                        self.showAlert(response.message || 'Failed to assign position', 'error');
                    }
                })
                .fail(function() {
                    self.showAlert('An error occurred while assigning position', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Show remove modal
        showRemoveModal: function(userId, userName, positionName) {
            $('#removeUserId').val(userId);
            $('#removeMemberName').text(userName);
            $('#removePositionName').text(positionName);
            $('#removeReason').val('');
            
            const modal = new bootstrap.Modal(document.getElementById('removePositionModal'));
            modal.show();
        },
        
        // Remove position
        removePosition: function() {
            const self = this;
            
            const reason = $('#removeReason').val();
            if (!reason) {
                self.showAlert('Please provide a reason for removal', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/organization/remove-position', {
                user_id: $('#removeUserId').val(),
                reason: reason
            })
            .done(function(response) {
                if (response.success) {
                    bootstrap.Modal.getInstance(document.getElementById('removePositionModal')).hide();
                    self.loadPositions();
                    self.loadHistory();
                    self.showAlert('Position removed successfully', 'success');
                } else {
                    self.showAlert(response.message || 'Failed to remove position', 'error');
                }
            })
            .fail(function() {
                self.showAlert('An error occurred while removing position', 'error');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        // Show add position modal
        showAddPositionModal: function() {
            $('#addPositionForm')[0].reset();
            const modal = new bootstrap.Modal(document.getElementById('addPositionModal'));
            modal.show();
        },
        
        // Create position
        createPosition: function() {
            const self = this;
            
            const data = {
                name: $('#newPositionName').val(),
                display_name: $('#newPositionDisplayName').val(),
                description: $('#newPositionDescription').val(),
                hierarchy_level: parseInt($('#newPositionHierarchy').val()),
                max_holders: parseInt($('#newPositionMaxHolders').val())
            };
            
            if (!data.name || !data.display_name || !data.hierarchy_level) {
                self.showAlert('Please fill all required fields', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/organization/positions', data)
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('addPositionModal')).hide();
                        self.loadPositions();
                        self.showAlert('Position created successfully', 'success');
                    } else {
                        self.showAlert(response.message || 'Failed to create position', 'error');
                    }
                })
                .fail(function() {
                    self.showAlert('An error occurred while creating position', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Delete position
        deletePosition: function(positionId) {
            const self = this;
            
            if (!confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.delete(`/organization/positions/${positionId}`)
                .done(function(response) {
                    if (response.success) {
                        self.loadPositions();
                        self.showAlert('Position deleted successfully', 'success');
                    } else {
                        self.showAlert(response.message || 'Failed to delete position', 'error');
                    }
                })
                .fail(function() {
                    self.showAlert('An error occurred while deleting position', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Show add member type modal
        showAddMemberTypeModal: function() {
            $('#addMemberTypeForm')[0].reset();
            $('#subscriptionDetails').hide();
            const modal = new bootstrap.Modal(document.getElementById('addMemberTypeModal'));
            modal.show();
        },
        
        // Create member type
        createMemberType: function() {
            const self = this;
            
            const isPaid = $('#memberTypeIsPaid').is(':checked');
            const data = {
                name: $('#memberTypeName').val(),
                display_name: $('#memberTypeDisplayName').val(),
                description: $('#memberTypeDescription').val(),
                is_paid: isPaid,
                subscription_amount: isPaid ? parseFloat($('#memberTypeAmount').val()) : null,
                subscription_period: isPaid && $('#memberTypePeriod').val() ? parseInt($('#memberTypePeriod').val()) : null,
                priority_level: parseInt($('#memberTypePriority').val() || 0)
            };
            
            if (!data.name || !data.display_name) {
                self.showAlert('Please fill all required fields', 'warning');
                return;
            }
            
            if (isPaid && !data.subscription_amount) {
                self.showAlert('Please enter subscription amount for paid membership', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/member-types', data)
                .done(function(response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('addMemberTypeModal')).hide();
                        self.loadMemberTypes();
                        self.showAlert('Member type created successfully', 'success');
                    } else {
                        self.showAlert(response.message || 'Failed to create member type', 'error');
                    }
                })
                .fail(function() {
                    self.showAlert('An error occurred while creating member type', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Delete member type
        deleteMemberType: function(typeId) {
            const self = this;
            
            if (!confirm('Are you sure you want to delete this member type?')) {
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.delete(`/member-types/${typeId}`)
                .done(function(response) {
                    if (response.success) {
                        self.loadMemberTypes();
                        self.showAlert('Member type deleted successfully', 'success');
                    } else {
                        self.showAlert(response.message || 'Failed to delete member type', 'error');
                    }
                })
                .fail(function() {
                    self.showAlert('An error occurred while deleting member type', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Helper functions
        isAdmin: function() {
            return this.currentUser.user_type === 'SUPER_ADMIN' || this.currentUser.user_type === 'ADMIN';
        },
        
        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        },
        
        showAlert: function(message, type) {
            TempleCore.showToast(message, type === 'error' ? 'danger' : type);
        }
    };
    
})(jQuery, window);