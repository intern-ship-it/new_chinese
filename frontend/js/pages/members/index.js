// js/pages/members/index.js
// Member Management Module with updated navigation

(function($, window) {
    'use strict';
    
    window.MembersPage = {
        currentUser: null,
        members: [],
        memberTypes: [],
        currentPage: 1,
        perPage: 20,
        totalPages: 1,
        filters: {
            search: '',
            member_type_id: '',
            status: '',
            has_position: '',
            from_date: '',
            to_date: ''
        },
        selectedMembers: [],
        activeTab: 'all',
        
        // Initialize page
        init: function(params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.bindEvents();
            this.loadInitialData();
        },
        
        // Render page HTML (keeping most of the original render method)
        render: function() {
            const html = `
                <div class="members-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-people"></i> Members Management
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item active">Members</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                ${this.hasPermission('create') ? `
                                    <button class="btn btn-primary" id="addMemberBtn">
                                        <i class="bi bi-person-plus"></i> Add New Member
                                    </button>
                                ` : ''}
                                ${this.hasPermission('export') ? `
                                    <button class="btn btn-outline-primary ms-2" id="exportBtn">
                                        <i class="bi bi-download"></i> Export
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4" id="statisticsCards">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon bg-primary">
                                    <i class="bi bi-people"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="totalMembersCount">0</h3>
                                    <p>Total Members</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon bg-success">
                                    <i class="bi bi-check-circle"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="activeMembersCount">0</h3>
                                    <p>Active Members</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon bg-info">
                                    <i class="bi bi-person-plus"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="newMembersCount">0</h3>
                                    <p>New This Month</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-icon bg-warning">
                                    <i class="bi bi-clock-history"></i>
                                </div>
                                <div class="stat-content">
                                    <h3 id="expiringCount">0</h3>
                                    <p>Expiring Soon</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="row">
                        <!-- Filters Sidebar -->
                        <div class="col-lg-3 mb-4">
                            <div class="filter-card">
                                <h5 class="mb-3">
                                    <i class="bi bi-funnel"></i> Filters
                                    <button class="btn btn-sm btn-link float-end" id="clearFiltersBtn">Clear</button>
                                </h5>
                                
                                <!-- Search -->
                                <div class="mb-3">
                                    <label class="form-label small">Search</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="searchInput" placeholder="Name, Email, Code...">
                                    </div>
                                </div>

                                <!-- Member Type Filter -->
                                <div class="mb-3">
                                    <label class="form-label small">Member Type</label>
                                    <select class="form-select" id="memberTypeFilter">
                                        <option value="">All Types</option>
                                    </select>
                                </div>

                                <!-- Status Filter -->
                                <div class="mb-3">
                                    <label class="form-label small">Status</label>
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="subscription_expired">Subscription Expired</option>
                                    </select>
                                </div>

                                <!-- Position Filter -->
                                <div class="mb-3">
                                    <label class="form-label small">Organization Position</label>
                                    <select class="form-select" id="positionFilter">
                                        <option value="">All Members</option>
                                        <option value="true">Has Position</option>
                                        <option value="false">No Position</option>
                                    </select>
                                </div>

                                <!-- Date Range -->
                                <div class="mb-3">
                                    <label class="form-label small">Membership Date Range</label>
                                    <input type="date" class="form-control mb-2" id="fromDateFilter">
                                    <input type="date" class="form-control" id="toDateFilter">
                                </div>

                                <button class="btn btn-primary w-100" id="applyFiltersBtn">
                                    <i class="bi bi-funnel"></i> Apply Filters
                                </button>
                            </div>

                            <!-- Quick Actions -->
                            ${this.hasPermission('update') ? `
                                <div class="filter-card mt-3">
                                    <h5 class="mb-3"><i class="bi bi-lightning"></i> Quick Actions</h5>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-sm btn-outline-primary" id="bulkActivateBtn" disabled>
                                            <i class="bi bi-check-circle"></i> Activate Selected
                                        </button>
                                        <button class="btn btn-sm btn-outline-warning" id="bulkDeactivateBtn" disabled>
                                            <i class="bi bi-x-circle"></i> Deactivate Selected
                                        </button>
                                        <button class="btn btn-sm btn-outline-info" id="bulkChangeTypeBtn" disabled>
                                            <i class="bi bi-arrow-repeat"></i> Change Type
                                        </button>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Members List -->
                        <div class="col-lg-9">
                            <!-- Tabs -->
                            <ul class="nav nav-tabs member-tabs mb-3">
                                <li class="nav-item">
                                    <a class="nav-link active" data-tab="all" href="#">
                                        All Members <span class="badge bg-secondary ms-1" id="allCount">0</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-tab="active" href="#">
                                        Active <span class="badge bg-success ms-1" id="activeCount">0</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-tab="inactive" href="#">
                                        Inactive <span class="badge bg-warning ms-1" id="inactiveCount">0</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-tab="expired" href="#">
                                        Expired <span class="badge bg-danger ms-1" id="expiredCount">0</span>
                                    </a>
                                </li>
                            </ul>

                            <!-- View Toggle and Bulk Select -->
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    ${this.hasPermission('update') ? `
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="selectAllCheckbox">
                                            <label class="form-check-label" for="selectAllCheckbox">
                                                Select All
                                            </label>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-outline-secondary active" id="tableViewBtn">
                                        <i class="bi bi-table"></i>
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" id="cardViewBtn">
                                        <i class="bi bi-grid-3x3"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Members Container -->
                            <div id="membersContainer">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Loading members...</p>
                                </div>
                            </div>

                            <!-- Pagination -->
                            <nav aria-label="Members pagination" class="mt-4">
                                <ul class="pagination justify-content-center" id="paginationContainer">
                                </ul>
                            </nav>
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
                <!-- Member Details Modal -->
                <div class="modal fade" id="memberDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Member Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="memberDetailsBody">
                                <!-- Details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                ${this.hasPermission('update') ? `
                                    <button type="button" class="btn btn-primary" id="editMemberFromDetails">
                                        <i class="bi bi-pencil"></i> Edit
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bulk Change Type Modal -->
                <div class="modal fade" id="bulkChangeTypeModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Change Member Type</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>You have selected <strong id="selectedMembersCount">0</strong> members.</p>
                                
                                <div class="mb-3">
                                    <label class="form-label">New Member Type <span class="text-danger">*</span></label>
                                    <select class="form-select" id="bulkMemberTypeSelect" required>
                                        <option value="">Select Type...</option>
                                    </select>
                                </div>
                                
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i> This will change the member type for all selected members.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="confirmBulkChangeType">
                                    <i class="bi bi-check-circle"></i> Change Type
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Get page styles (keeping original styles)
        getPageStyles: function() {
            return `
                .members-page {
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

                .stat-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    display: flex;
                    align-items: center;
                    transition: transform 0.3s ease;
                }

                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 5px 15px rgba(0,0,0,.15);
                }

                .stat-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    margin-right: 15px;
                }

                .stat-content h3 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }

                .stat-content p {
                    margin: 0;
                    color: #6c757d;
                    font-size: 14px;
                }

                .filter-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                }

                .member-tabs .nav-link {
                    color: #6c757d;
                    border: none;
                    padding: 10px 20px;
                    font-weight: 600;
                }

                .member-tabs .nav-link.active {
                    color: var(--primary-color);
                    border-bottom: 3px solid var(--primary-color);
                }

                .member-table {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    overflow-x: auto;
                }

                .member-table table {
                    margin-bottom: 0;
                }

                .member-table th {
                    background: #f8f9fa;
                    font-weight: 600;
                    border-bottom: 2px solid #dee2e6;
                    padding: 15px;
                }

                .member-table td {
                    padding: 15px;
                    vertical-align: middle;
                }

                .member-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    margin-right: 10px;
                }

                .member-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                    margin-bottom: 20px;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .member-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 5px 15px rgba(0,0,0,.15);
                }

                .member-card-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .member-card-avatar {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    font-weight: 600;
                    margin-right: 15px;
                }

                .member-status {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .status-active {
                    background: #d4edda;
                    color: #155724;
                }

                .status-inactive {
                    background: #fff3cd;
                    color: #856404;
                }

                .status-expired {
                    background: #f8d7da;
                    color: #721c24;
                }

                .member-type-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    background: #e3f2fd;
                    color: #1976d2;
                }

                .action-buttons .btn {
                    padding: 5px 10px;
                    font-size: 14px;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                }

                .empty-state i {
                    font-size: 64px;
                    color: #dee2e6;
                    margin-bottom: 20px;
                }

                .pagination {
                    margin-top: 20px;
                }

                .btn-group-vertical .btn {
                    text-align: left;
                }

                .signature-preview {
                    max-width: 200px;
                    max-height: 100px;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 5px;
                }

                @media (max-width: 768px) {
                    .filter-card {
                        margin-bottom: 20px;
                    }
                    
                    .stat-card {
                        margin-bottom: 15px;
                    }
                }
            `;
        },
        
        // Bind events (updated with proper navigation)
        bindEvents: function() {
            const self = this;
            
            // Add member button
            $(document).on('click', '#addMemberBtn', function() {
                TempleRouter.navigate('members/create');
            });
            
            // Export button
            $(document).on('click', '#exportBtn', function() {
                self.exportMembers();
            });
            
            // Search input (with debounce)
            let searchTimeout;
            $(document).on('input', '#searchInput', function() {
                clearTimeout(searchTimeout);
                const value = $(this).val();
                searchTimeout = setTimeout(function() {
                    self.filters.search = value;
                    if (value.length === 0 || value.length >= 3) {
                        self.loadMembers();
                    }
                }, 500);
            });
            
            // Apply filters
            $(document).on('click', '#applyFiltersBtn', function() {
                self.applyFilters();
            });
            
            // Clear filters
            $(document).on('click', '#clearFiltersBtn', function() {
                self.clearFilters();
            });
            
            // Tab switching
            $(document).on('click', '.member-tabs .nav-link', function(e) {
                e.preventDefault();
                const tab = $(this).data('tab');
                self.switchTab(tab);
            });
            
            // View toggle
            $(document).on('click', '#tableViewBtn', function() {
                $('#tableViewBtn').addClass('active');
                $('#cardViewBtn').removeClass('active');
                self.renderMembersTable();
            });
            
            $(document).on('click', '#cardViewBtn', function() {
                $('#cardViewBtn').addClass('active');
                $('#tableViewBtn').removeClass('active');
                self.renderMembersCards();
            });
            
            // Select all checkbox
            $(document).on('change', '#selectAllCheckbox', function() {
                const isChecked = $(this).is(':checked');
                $('.member-checkbox').prop('checked', isChecked);
                self.updateSelectedMembers();
            });
            
            // Individual member checkbox
            $(document).on('change', '.member-checkbox', function() {
                self.updateSelectedMembers();
            });
            
            // Bulk actions
            $(document).on('click', '#bulkActivateBtn', function() {
                self.bulkUpdateMembers('activate');
            });
            
            $(document).on('click', '#bulkDeactivateBtn', function() {
                self.bulkUpdateMembers('deactivate');
            });
            
            $(document).on('click', '#bulkChangeTypeBtn', function() {
                self.showBulkChangeTypeModal();
            });
            
            $(document).on('click', '#confirmBulkChangeType', function() {
                self.bulkChangeType();
            });
            
            // Pagination
            $(document).on('click', '.page-link', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && page !== self.currentPage) {
                    self.currentPage = page;
                    self.loadMembers();
                }
            });
            
            // View member details
            $(document).on('click', '.view-member-btn', function() {
                const memberId = $(this).data('member-id');
                self.viewMemberDetails(memberId);
            });
            
            // Edit member - UPDATED to use new URL format
            $(document).on('click', '.edit-member-btn', function() {
                const memberId = $(this).data('member-id');
                // This will create URL like /temple2/members/uuid
                TempleRouter.navigate('members/edit', { id: memberId });
            });
            
            // Delete member
            $(document).on('click', '.delete-member-btn', function() {
                const memberId = $(this).data('member-id');
                const memberName = $(this).data('member-name');
                self.deleteMember(memberId, memberName);
            });
            
            // Edit from details modal - UPDATED
            $(document).on('click', '#editMemberFromDetails', function() {
                const memberId = $(this).data('member-id');
                bootstrap.Modal.getInstance(document.getElementById('memberDetailsModal')).hide();
                // This will create URL like /temple2/members/uuid
                TempleRouter.navigate('members/edit', { id: memberId });
            });
            
            // Member card click
            $(document).on('click', '.member-card', function() {
                const memberId = $(this).data('member-id');
                self.viewMemberDetails(memberId);
            });
        },
        
        // Load initial data
        loadInitialData: function() {
            this.loadMemberTypes();
            this.loadStatistics();
            this.loadMembers();
        },
        
        // Load member types for filters
        loadMemberTypes: function() {
            const self = this;
            
            TempleAPI.get('/member-types')
                .done(function(response) {
                    if (response.success) {
                        self.memberTypes = response.data;
                        
                        // Populate filter dropdown
                        const $select = $('#memberTypeFilter, #bulkMemberTypeSelect');
                        $select.empty();
                        $select.append('<option value="">All Types</option>');
                        
                        $.each(self.memberTypes, function(index, type) {
                            $select.append(`<option value="${type.id}">${type.display_name}</option>`);
                        });
                    }
                })
                .fail(function() {
                    console.error('Failed to load member types');
                });
        },
        
        // Load statistics
        loadStatistics: function() {
            const self = this;
            
            if (!this.hasPermission('statistics')) {
                $('#statisticsCards').hide();
                return;
            }
            
            TempleAPI.get('/members/statistics')
                .done(function(response) {
                    if (response.success) {
                        const stats = response.data;
                        $('#totalMembersCount').text(stats.total_members || 0);
                        $('#activeMembersCount').text(stats.active_members || 0);
                        $('#newMembersCount').text(stats.new_members_this_month || 0);
                        $('#expiringCount').text(stats.subscription_statistics?.expiring_soon || 0);
                    }
                })
                .fail(function() {
                    console.error('Failed to load statistics');
                });
        },
        
        // Load members
        loadMembers: function() {
            const self = this;
            
            $('#membersContainer').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);
            
            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.filters
            };
            
            // Add tab-specific filters
            if (this.activeTab === 'active') {
                params.status = 'active';
            } else if (this.activeTab === 'inactive') {
                params.status = 'inactive';
            } else if (this.activeTab === 'expired') {
                params.status = 'subscription_expired';
            }
            
            TempleAPI.get('/members', params)
                .done(function(response) {
                    if (response.success) {
                        // Handle both paginated and non-paginated responses
                        const memberData = response.data.data || response.data;
                        
                        self.members = memberData.data || memberData;
                        self.totalPages = memberData.last_page || 1;
                        self.currentPage = memberData.current_page || 1;
                        
                        // Update counts
                        $('#allCount').text(memberData.total || self.members.length || 0);
                        
                        // Render members
                        if ($('#tableViewBtn').hasClass('active')) {
                            self.renderMembersTable();
                        } else {
                            self.renderMembersCards();
                        }
                        
                        // Render pagination
                        self.renderPagination(memberData);
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load members:', xhr);
                    let errorMsg = 'Failed to load members';
                    
                    if (xhr.responseJSON) {
                        errorMsg = xhr.responseJSON.message || errorMsg;
                    }
                    
                    self.showError(errorMsg);
                });
        },
        
        // Render members table (updated with signature display)
        renderMembersTable: function() {
            const self = this;
            
            if (this.members.length === 0) {
                $('#membersContainer').html(this.getEmptyState());
                return;
            }
            
            let html = `
                <div class="member-table">
                    <table class="table">
                        <thead>
                            <tr>
                                ${this.hasPermission('update') ? '<th width="40"><input type="checkbox" id="selectAllCheckbox"></th>' : ''}
                                <th>Member</th>
                                <th>Code</th>
                                <th>Type</th>
                                <th>Contact</th>
                                <th>Position</th>
                                <th>Signature</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            $.each(this.members, function(index, member) {
                const status = self.getMemberStatus(member);
                const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
                
                html += `
                    <tr>
                        ${self.hasPermission('update') ? `
                            <td><input type="checkbox" class="member-checkbox" value="${member.id}"></td>
                        ` : ''}
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="member-avatar">${initials}</div>
                                <div>
                                    <strong>${member.name}</strong><br>
                                    <small class="text-muted">${member.email}</small>
                                </div>
                            </div>
                        </td>
                        <td><span class="badge bg-secondary">${member.member_details?.member_code || 'N/A'}</span></td>
                        <td>
                            <span class="member-type-badge">
                                ${member.member_details?.member_type?.name || 'Normal'}
                            </span>
                        </td>
                        <td>
                            <small>
                                <i class="bi bi-phone"></i> ${member.mobile_no || 'N/A'}<br>
                                ${member.city ? `<i class="bi bi-geo-alt"></i> ${member.city}` : ''}
                            </small>
                        </td>
                        <td>
                            ${member.current_position ? 
                                `<span class="badge bg-info">${member.current_position.position}</span>` : 
                                '<span class="text-muted">-</span>'}
                        </td>
                        <td>
                            ${self.renderSignature(member)}
                        </td>
                        <td>
                            <span class="member-status status-${status.class}">${status.text}</span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary view-member-btn" data-member-id="${member.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${self.hasPermission('update') ? `
                                    <button class="btn btn-outline-secondary edit-member-btn" data-member-id="${member.id}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : ''}
                                ${self.hasPermission('delete') ? `
                                    <button class="btn btn-outline-danger delete-member-btn" 
                                        data-member-id="${member.id}" 
                                        data-member-name="${member.name}" 
                                        title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            $('#membersContainer').html(html);
        },
        
        // Render signature
        renderSignature: function(member) {
            // Check if member has signature data
            if (member.signature || member.member_details?.signature_url) {
                const signatureUrl = member.signature || member.member_details?.signature_url;
                
                // Check if it's a valid URL or base64 data
                if (signatureUrl.startsWith('http') || signatureUrl.startsWith('/')) {
                    return `<img src="${signatureUrl}" alt="Signature" class="signature-preview" />`;
                } else if (signatureUrl.startsWith('data:image')) {
                    return `<img src="${signatureUrl}" alt="Signature" class="signature-preview" />`;
                } else {
                    // Assume it's a path and prepend the API base URL
                    const apiBase = TempleAPI.getBaseUrl().replace('/api', '');
                    return `<img src="${apiBase}/storage/${signatureUrl}" alt="Signature" class="signature-preview" />`;
                }
            }
            
            return '<span class="text-muted">No signature</span>';
        },
        
        // Render members cards (keeping original implementation)
        renderMembersCards: function() {
            const self = this;
            
            if (this.members.length === 0) {
                $('#membersContainer').html(this.getEmptyState());
                return;
            }
            
            let html = '<div class="row">';
            
            $.each(this.members, function(index, member) {
                const status = self.getMemberStatus(member);
                const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
                
                html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="member-card" data-member-id="${member.id}">
                            ${self.hasPermission('update') ? `
                                <div class="form-check position-absolute top-0 end-0 m-2">
                                    <input class="form-check-input member-checkbox" type="checkbox" value="${member.id}">
                                </div>
                            ` : ''}
                            
                            <div class="member-card-header">
                                <div class="member-card-avatar">${initials}</div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-1">${member.name}</h6>
                                    <span class="badge bg-secondary">${member.member_details?.member_code || 'N/A'}</span>
                                    <span class="member-status status-${status.class} ms-2">${status.text}</span>
                                </div>
                            </div>
                            
                            <div class="member-card-body">
                                <div class="row small">
                                    <div class="col-6">
                                        <strong>Type:</strong><br>
                                        <span class="member-type-badge">${member.member_details?.member_type?.name || 'Normal'}</span>
                                    </div>
                                    <div class="col-6">
                                        <strong>Position:</strong><br>
                                        ${member.current_position ? 
                                            `<span class="badge bg-info">${member.current_position.position}</span>` : 
                                            '<span class="text-muted">None</span>'}
                                    </div>
                                </div>
                                
                                <hr>
                                
                                <div class="small text-muted">
                                    <i class="bi bi-envelope"></i> ${member.email}<br>
                                    <i class="bi bi-phone"></i> ${member.mobile_no || 'N/A'}<br>
                                    ${member.city ? `<i class="bi bi-geo-alt"></i> ${member.city}` : ''}
                                </div>
                                
                                ${self.renderSignature(member) !== '<span class="text-muted">No signature</span>' ? `
                                    <div class="mt-2">
                                        <strong>Signature:</strong><br>
                                        ${self.renderSignature(member)}
                                    </div>
                                ` : ''}
                                
                                <div class="mt-3 text-end">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary view-member-btn" data-member-id="${member.id}">
                                            <i class="bi bi-eye"></i> View
                                        </button>
                                        ${self.hasPermission('update') ? `
                                            <button class="btn btn-outline-secondary edit-member-btn" data-member-id="${member.id}">
                                                <i class="bi bi-pencil"></i> Edit
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            $('#membersContainer').html(html);
        },
        
        // Get empty state HTML
        getEmptyState: function() {
            return `
                <div class="empty-state">
                    <i class="bi bi-people"></i>
                    <h4>No Members Found</h4>
                    <p class="text-muted">Try adjusting your filters or add a new member.</p>
                    ${this.hasPermission('create') ? `
                        <button class="btn btn-primary" onclick="TempleRouter.navigate('members/create')">
                            <i class="bi bi-person-plus"></i> Add First Member
                        </button>
                    ` : ''}
                </div>
            `;
        },
        
        // Render pagination
        renderPagination: function(data) {
            const $container = $('#paginationContainer');
            $container.empty();
            
            if (data.last_page <= 1) return;
            
            // Previous button
            $container.append(`
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                </li>
            `);
            
            // Page numbers
            for (let i = 1; i <= data.last_page; i++) {
                if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    $container.append(`
                        <li class="page-item ${i === data.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `);
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    $container.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
                }
            }
            
            // Next button
            $container.append(`
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                </li>
            `);
        },
        
        // Other methods remain the same...
        applyFilters: function() {
            this.filters.member_type_id = $('#memberTypeFilter').val();
            this.filters.status = $('#statusFilter').val();
            this.filters.has_position = $('#positionFilter').val();
            this.filters.from_date = $('#fromDateFilter').val();
            this.filters.to_date = $('#toDateFilter').val();
            
            this.currentPage = 1;
            this.loadMembers();
        },
        
        clearFilters: function() {
            $('#searchInput').val('');
            $('#memberTypeFilter').val('');
            $('#statusFilter').val('');
            $('#positionFilter').val('');
            $('#fromDateFilter').val('');
            $('#toDateFilter').val('');
            
            this.filters = {
                search: '',
                member_type_id: '',
                status: '',
                has_position: '',
                from_date: '',
                to_date: ''
            };
            
            this.currentPage = 1;
            this.loadMembers();
        },
        
        switchTab: function(tab) {
            $('.member-tabs .nav-link').removeClass('active');
            $(`.member-tabs .nav-link[data-tab="${tab}"]`).addClass('active');
            
            this.activeTab = tab;
            this.currentPage = 1;
            this.loadMembers();
        },
        
        updateSelectedMembers: function() {
            this.selectedMembers = [];
            $('.member-checkbox:checked').each((index, checkbox) => {
                this.selectedMembers.push($(checkbox).val());
            });
            
            const hasSelection = this.selectedMembers.length > 0;
            $('#bulkActivateBtn, #bulkDeactivateBtn, #bulkChangeTypeBtn').prop('disabled', !hasSelection);
            
            const totalCheckboxes = $('.member-checkbox').length;
            const checkedCheckboxes = $('.member-checkbox:checked').length;
            $('#selectAllCheckbox').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
        },
        
 viewMemberDetails: function(memberId) {
    const self = this;
    
    console.log('Loading member details for ID:', memberId);
    
    // Clean up any existing modal instances first
    const existingModal = bootstrap.Modal.getInstance(document.getElementById('memberDetailsModal'));
    if (existingModal) {
        existingModal.dispose();
    }
    
    // Remove any lingering backdrop elements
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    
    // Check if modal element exists
    const modalElement = document.getElementById('memberDetailsModal');
    if (!modalElement) {
        console.error('Modal element not found');
        self.showError('Modal not found. Please refresh the page.');
        return;
    }
    
    // Reset modal aria-hidden attribute
    modalElement.removeAttribute('aria-hidden');
    
    // Set loading content
    $('#memberDetailsBody').html(`
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `);
    
    // Create new modal instance
    let modal;
    try {
        modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: true,
            focus: true
        });
        modal.show();
    } catch (error) {
        console.error('Error creating modal:', error);
        // Fallback to jQuery
        $('#memberDetailsModal').modal('show');
    }
    
    // Load member data
    TempleAPI.get('/members/' + memberId)
        .done(function(response) {
            console.log('Member data received:', response);
            if (response.success) {
                self.renderMemberDetails(response.data);
                $('#editMemberFromDetails').data('member-id', memberId);
            } else {
                $('#memberDetailsBody').html('<div class="alert alert-danger">Failed to load member details</div>');
            }
        })
        .fail(function(xhr) {
            console.error('Failed to load member:', xhr);
            $('#memberDetailsBody').html('<div class="alert alert-danger">Failed to load member details</div>');
        });
},
        renderMemberDetails: function(member) {
            const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
            const status = this.getMemberStatus(member);
            
            let html = `
                <div class="row">
                    <div class="col-md-4 text-center">
                        <div class="member-card-avatar mx-auto mb-3" style="width: 100px; height: 100px; font-size: 36px;">
                            ${initials}
                        </div>
                        <h5>${member.name}</h5>
                        <p class="text-muted">${member.member_details?.member_code || 'N/A'}</p>
                        <span class="member-status status-${status.class}">${status.text}</span>
                        
                        ${member.signature || member.member_details?.signature_url ? `
                            <div class="mt-3">
                                <strong>Signature:</strong><br>
                                ${this.renderSignature(member)}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="col-md-8">
                        <h6 class="mb-3">Personal Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">Email:</th>
                                <td>${member.email}</td>
                            </tr>
                            <tr>
                                <th>Mobile:</th>
                                <td>${member.mobile_code} ${member.mobile_no}</td>
                            </tr>
                            ${member.alternate_mobile ? `
                                <tr>
                                    <th>Alternate Mobile:</th>
                                    <td>${member.alternate_mobile}</td>
                                </tr>
                            ` : ''}
                            <tr>
                                <th>Gender:</th>
                                <td>${member.gender || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Date of Birth:</th>
                                <td>${member.date_of_birth ? this.formatDate(member.date_of_birth) : 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Address:</th>
                                <td>${member.address || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>City:</th>
                                <td>${member.city || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>State:</th>
                                <td>${member.state || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Pincode:</th>
                                <td>${member.pincode || 'N/A'}</td>
                            </tr>
                        </table>
                        
                        ${member.member_details ? `
                            <h6 class="mb-3 mt-4">Membership Details</h6>
                            <table class="table table-sm">
                                <tr>
                                    <th width="40%">Member Type:</th>
                                    <td>
                                        <span class="member-type-badge">
                                            ${member.member_details.member_type?.name || 'Normal'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Membership Date:</th>
                                    <td>${this.formatDate(member.member_details.membership_date)}</td>
                                </tr>
                                ${member.member_details.referred_by ? `
                                    <tr>
                                        <th>Referred By:</th>
                                        <td>${member.member_details.referred_by.name}</td>
                                    </tr>
                                ` : ''}
                                ${member.member_details.family_head ? `
                                    <tr>
                                        <th>Family Head:</th>
                                        <td>${member.member_details.family_head.name}</td>
                                    </tr>
                                ` : ''}
                            </table>
                        ` : ''}
                    </div>
                </div>
            `;
            
            $('#memberDetailsBody').html(html);
        },
        
        deleteMember: function(memberId, memberName) {
            const self = this;
            
            TempleCore.showConfirm(
                'Delete Member',
                `Are you sure you want to delete <strong>${memberName}</strong>? This action will deactivate the member account.`,
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete('/members/' + memberId)
                        .done(function(response) {
                            if (response.success) {
                                self.showSuccess('Member deleted successfully');
                                self.loadMembers();
                                self.loadStatistics();
                            } else {
                                self.showError(response.message || 'Failed to delete member');
                            }
                        })
                        .fail(function() {
                            self.showError('An error occurred while deleting member');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },
        
        exportMembers: function() {
            const params = $.param({
                ...this.filters,
                format: 'csv'
            });
            
            window.location.href = TempleAPI.getBaseUrl() + '/members/export?' + params;
        },
        
        getMemberStatus: function(member) {
            if (!member.is_active) {
                return { text: 'Inactive', class: 'inactive' };
            }
            
            if (member.member_details?.subscription_end_date) {
                const endDate = new Date(member.member_details.subscription_end_date);
                if (endDate < new Date()) {
                    return { text: 'Expired', class: 'expired' };
                }
            }
            
            return { text: 'Active', class: 'active' };
        },
        
        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        },
        
        hasPermission: function(action) {
            const user = this.currentUser;
            
            if (user.user_type === 'SUPER_ADMIN') return true;
            
            if (action === 'view') {
                return user.user_type === 'ADMIN' || user.user_type === 'STAFF' || 
                       (user.permissions && user.permissions.includes('view_members'));
            }
            
            if (action === 'create') {
                return user.user_type === 'ADMIN' || 
                       (user.permissions && user.permissions.includes('create_members'));
            }
            
            if (action === 'update') {
                return user.user_type === 'ADMIN' || 
                       (user.permissions && user.permissions.includes('edit_members'));
            }
            
            if (action === 'delete') {
                return user.permissions && user.permissions.includes('delete_members');
            }
            
            if (action === 'export' || action === 'statistics') {
                return user.user_type === 'SUPER_ADMIN' || user.user_type === 'ADMIN';
            }
            
            return false;
        },
        
        showSuccess: function(message) {
            TempleCore.showToast(message, 'success');
        },
        
        showError: function(message) {
            TempleCore.showToast(message, 'danger');
        },
        
        showWarning: function(message) {
            TempleCore.showToast(message, 'warning');
        },
        
        bulkUpdateMembers: function(action) {
            const self = this;
            
            if (this.selectedMembers.length === 0) {
                this.showWarning('Please select at least one member');
                return;
            }
            
            const actionText = action === 'activate' ? 'activate' : 'deactivate';
            
            TempleCore.showConfirm(
                'Bulk Update',
                `Are you sure you want to ${actionText} ${this.selectedMembers.length} selected member(s)?`,
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/members/bulk-update', {
                        member_ids: self.selectedMembers,
                        action: action
                    })
                    .done(function(response) {
                        if (response.success) {
                            self.showSuccess(`Successfully updated ${response.data.updated_count} member(s)`);
                            self.selectedMembers = [];
                            self.loadMembers();
                            self.loadStatistics();
                        } else {
                            self.showError(response.message || 'Failed to update members');
                        }
                    })
                    .fail(function() {
                        self.showError('An error occurred during bulk update');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        },
        
        showBulkChangeTypeModal: function() {
            if (this.selectedMembers.length === 0) {
                this.showWarning('Please select at least one member');
                return;
            }
            
            $('#selectedMembersCount').text(this.selectedMembers.length);
            const modal = new bootstrap.Modal(document.getElementById('bulkChangeTypeModal'));
            modal.show();
        },
        
        bulkChangeType: function() {
            const self = this;
            const newTypeId = $('#bulkMemberTypeSelect').val();
            
            if (!newTypeId) {
                this.showWarning('Please select a member type');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/members/bulk-update', {
                member_ids: this.selectedMembers,
                action: 'change_type',
                member_type_id: newTypeId
            })
            .done(function(response) {
                if (response.success) {
                    bootstrap.Modal.getInstance(document.getElementById('bulkChangeTypeModal')).hide();
                    self.showSuccess(`Successfully updated ${response.data.updated_count} member(s)`);
                    self.selectedMembers = [];
                    self.loadMembers();
                } else {
                    self.showError(response.message || 'Failed to change member types');
                }
            })
            .fail(function() {
                self.showError('An error occurred while changing member types');
            })
            .always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        // Export members
        exportMembers: function() {
            const params = $.param({
                ...this.filters,
                format: 'csv'
            });
            
            window.location.href = TempleAPI.getBaseUrl() + '/members/export?' + params;
        },
        
        // Helper functions
        getMemberStatus: function(member) {
            if (!member.is_active) {
                return { text: 'Inactive', class: 'inactive' };
            }
            
            if (member.member_details?.subscription_end_date) {
                const endDate = new Date(member.member_details.subscription_end_date);
                if (endDate < new Date()) {
                    return { text: 'Expired', class: 'expired' };
                }
            }
            
            return { text: 'Active', class: 'active' };
        },
        
        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        },
        
        hasPermission: function(action) {
            const user = this.currentUser;
            
            if (user.user_type === 'SUPER_ADMIN') return true;
            
            if (action === 'view') {
                return user.user_type === 'ADMIN' || user.user_type === 'STAFF' || 
                       (user.permissions && user.permissions.includes('view_members'));
            }
            
            if (action === 'create') {
                return user.user_type === 'ADMIN' || 
                       (user.permissions && user.permissions.includes('create_members'));
            }
            
            if (action === 'update') {
                return user.user_type === 'ADMIN' || 
                       (user.permissions && user.permissions.includes('edit_members'));
            }
            
            if (action === 'delete') {
                return user.permissions && user.permissions.includes('delete_members');
            }
            
            if (action === 'export' || action === 'statistics') {
                return user.user_type === 'SUPER_ADMIN' || user.user_type === 'ADMIN';
            }
            
            return false;
        },
        
        showSuccess: function(message) {
            TempleCore.showToast(message, 'success');
        },
        
        showError: function(message) {
            TempleCore.showToast(message, 'danger');
        },
        
        showWarning: function(message) {
            TempleCore.showToast(message, 'warning');
        },

        // Add this as a new method in MembersPage object
cleanup: function() {
    // Clean up any open modals when leaving the page
    const modals = ['memberDetailsModal', 'bulkChangeTypeModal'];
    modals.forEach(function(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
                modalInstance.dispose();
            }
        }
    });
    
    // Clean up any modal backdrops
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    
    // Clear any focused elements
    if (document.activeElement) {
        document.activeElement.blur();
    }
},
    };
    
})(jQuery, window);