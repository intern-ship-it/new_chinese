// js/pages/designations/index.js
// Designations Management Page - Complete Fixed Version

(function($, window) {
    'use strict';
    
    window.DesignationPage = {
        designations: [],
        roles: [],
        currentDesignation: null,
        viewMode: 'list', // list or hierarchy
        
        init: function() {
            this.renderPage();
            this.loadRoles();
            this.loadDesignations();
            this.bindEvents();
        },
        
        renderPage: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h2><i class="bi bi-diagram-3-fill"></i> Designations Management</h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard')">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('staff')">Staff</a></li>
                                    <li class="breadcrumb-item active">Designations</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="addDesignationBtn">
                                <i class="bi bi-plus-circle"></i> Add Designation
                            </button>
                            <div class="btn-group" role="group">
                                <button class="btn btn-outline-secondary" id="listViewBtn">
                                    <i class="bi bi-list"></i> List View
                                </button>
                                <button class="btn btn-outline-secondary" id="hierarchyViewBtn">
                                    <i class="bi bi-diagram-3"></i> Hierarchy View
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Department Tabs -->
                    <ul class="nav nav-tabs mb-4" id="departmentTabs">
                        <li class="nav-item">
                            <a class="nav-link active" data-department="ALL" href="#">All Departments</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="ADMINISTRATION" href="#">Administration</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="RELIGIOUS" href="#">Religious</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="FINANCE" href="#">Finance</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="OPERATIONS" href="#">Operations</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="MAINTENANCE" href="#">Maintenance</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="SECURITY" href="#">Security</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="IT" href="#">IT</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-department="HR" href="#">HR</a>
                        </li>
                    </ul>

                    <!-- Content Area -->
                    <div id="contentArea">
                        <!-- List View -->
                        <div id="listView">
                            <div class="card">
                                <div class="card-header">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h5 class="mb-0">Designations List</h5>
                                        </div>
                                        <div class="col-md-6 text-end">
                                            <input type="text" class="form-control form-control-sm d-inline-block w-auto" 
                                                id="searchDesignation" placeholder="Search designation...">
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Designation Name</th>
                                                    <th>Department</th>
                                                    <th>Level</th>
                                                    <th>Reports To</th>
                                                    <th>Assigned Role</th>
                                                    <th>Staff Count</th>
                                                    <th>Approvals</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody id="designationsTableBody">
                                                <tr>
                                                    <td colspan="10" class="text-center">
                                                        <div class="spinner-border text-primary" role="status">
                                                            <span class="visually-hidden">Loading...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Hierarchy View -->
                        <div id="hierarchyView" style="display:none;">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">Organization Hierarchy</h5>
                                </div>
                                <div class="card-body">
                                    <div id="hierarchyContainer" style="min-height: 500px; overflow: auto;">
                                        <!-- Hierarchy will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Designation Modal -->
                <div class="modal fade" id="designationModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="designationModalTitle">Add New Designation</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="designationForm">
                                    <div class="row g-3">
                                        <!-- Basic Information -->
                                        <div class="col-md-6">
                                            <label class="form-label">Designation Code</label>
                                            <input type="text" class="form-control" name="designation_code" 
                                                placeholder="Auto-generated if empty" readonly>
                                            <small class="text-muted">Leave empty for auto-generation</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label required">Designation Name</label>
                                            <input type="text" class="form-control" name="designation_name" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label required">Department</label>
                                            <select class="form-select" name="department" required>
                                                <option value="">Select Department</option>
                                                <option value="ADMINISTRATION">Administration</option>
                                                <option value="RELIGIOUS">Religious</option>
                                                <option value="FINANCE">Finance</option>
                                                <option value="OPERATIONS">Operations</option>
                                                <option value="MAINTENANCE">Maintenance</option>
                                                <option value="SECURITY">Security</option>
                                                <option value="IT">IT</option>
                                                <option value="HR">HR</option>
                                                <option value="MARKETING">Marketing</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label required">Hierarchy Level</label>
                                            <select class="form-select" name="level" required>
                                                <option value="">Select Level</option>
                                                <option value="1">1 - Top Management</option>
                                                <option value="2">2 - Senior Management</option>
                                                <option value="3">3 - Middle Management</option>
                                                <option value="4">4 - Junior Management</option>
                                                <option value="5">5 - Senior Staff</option>
                                                <option value="6">6 - Junior Staff</option>
                                                <option value="7">7 - Entry Level</option>
                                                <option value="8">8 - Trainee</option>
                                                <option value="9">9 - Volunteer</option>
                                                <option value="10">10 - Support Staff</option>
                                            </select>
                                        </div>

                                        <!-- Role Assignment -->
                                        <div class="col-md-6">
                                            <label class="form-label">Assign System Role</label>
                                            <select class="form-select" name="role_id" id="roleSelect">
                                                <option value="">Select Role</option>
                                            </select>
                                            <small class="text-muted">Staff with this designation will get this role</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Reports To</label>
                                            <select class="form-select" name="parent_designation_id" id="parentDesignationSelect">
                                                <option value="">None (Top Level)</option>
                                            </select>
                                        </div>

                                       
                                        <!-- Description -->
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" name="description" rows="3" 
                                                placeholder="Enter designation description and responsibilities"></textarea>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-md-6">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" name="is_active" id="isActive" checked>
                                                <label class="form-check-label" for="isActive">
                                                    Active Status
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveDesignationBtn">
                                    <i class="bi bi-save"></i> Save Designation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Designation Details Modal -->
                <div class="modal fade" id="viewDesignationModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Designation Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="designationDetailsContent">
                                <!-- Details will be loaded here -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add CSS Styles -->
                <style>
                    .permissions-checkboxes {
                        background-color: #f8f9fa;
                    }
                    .permissions-checkboxes .form-check {
                        margin-bottom: 0.5rem;
                    }
                    .permissions-checkboxes .form-check-label {
                        cursor: pointer;
                        user-select: none;
                    }
                    .permissions-checkboxes .form-check-input:checked + .form-check-label {
                        font-weight: 600;
                        color: #0d6efd;
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        //  <!-- Approval Authorities -->
        //                                 <div class="col-12">
        //                                     <h6 class="mt-3 mb-2">Approval Authorities</h6>
        //                                 </div>
        //                                 <div class="col-md-3">
        //                                     <div class="form-check">
        //                                         <input class="form-check-input" type="checkbox" name="can_approve_leave" id="canApproveLeave">
        //                                         <label class="form-check-label" for="canApproveLeave">
        //                                             Can Approve Leave
        //                                         </label>
        //                                     </div>
        //                                 </div>
        //                                 <div class="col-md-3">
        //                                     <div class="form-check">
        //                                         <input class="form-check-input" type="checkbox" name="can_approve_payments" id="canApprovePayments">
        //                                         <label class="form-check-label" for="canApprovePayments">
        //                                             Can Approve Payments
        //                                         </label>
        //                                     </div>
        //                                 </div>
        //                                 <div class="col-md-3">
        //                                     <div class="form-check">
        //                                         <input class="form-check-input" type="checkbox" name="can_approve_bookings" id="canApproveBookings">
        //                                         <label class="form-check-label" for="canApproveBookings">
        //                                             Can Approve Bookings
        //                                         </label>
        //                                     </div>
        //                                 </div>
        //                                 <div class="col-md-3">
        //                                     <div class="form-check">
        //                                         <input class="form-check-input" type="checkbox" name="is_head_of_department" id="isHeadOfDepartment">
        //                                         <label class="form-check-label" for="isHeadOfDepartment">
        //                                             Head of Department
        //                                         </label>
        //                                     </div>
        //                                 </div>

        //                                 <!-- Approval Limits -->
        //                                 <div class="col-md-6" id="leaveApprovalLimit" style="display:none;">
        //                                     <label class="form-label">Max Leave Approval Days</label>
        //                                     <input type="number" class="form-control" name="max_leave_approval_days" min="1">
        //                                 </div>
        //                                 <div class="col-md-6" id="paymentApprovalLimit" style="display:none;">
        //                                     <label class="form-label">Max Payment Approval Amount</label>
        //                                     <div class="input-group">
        //                                         <span class="input-group-text">RM</span>
        //                                         <input type="number" class="form-control" name="max_payment_approval_amount" min="0" step="0.01">
        //                                     </div>
        //                                 </div>

        //                                 <!-- Additional Permissions - Changed to Checkboxes -->
        //                                 <div class="col-12">
        //                                     <label class="form-label">Additional Permissions</label>
        //                                     <div class="permissions-checkboxes border rounded p-3" style="max-height: 200px; overflow-y: auto;">
        //                                         <div class="row">
        //                                             <div class="col-md-6">
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="view_all_staff" id="perm_view_all_staff" name="permission_view_all_staff">
        //                                                     <label class="form-check-label" for="perm_view_all_staff">
        //                                                         View All Staff
        //                                                     </label>
        //                                                 </div>
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="edit_staff_salary" id="perm_edit_staff_salary" name="permission_edit_staff_salary">
        //                                                     <label class="form-check-label" for="perm_edit_staff_salary">
        //                                                         Edit Staff Salary
        //                                                     </label>
        //                                                 </div>
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="manage_schedules" id="perm_manage_schedules" name="permission_manage_schedules">
        //                                                     <label class="form-check-label" for="perm_manage_schedules">
        //                                                         Manage Schedules
        //                                                     </label>
        //                                                 </div>
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="access_reports" id="perm_access_reports" name="permission_access_reports">
        //                                                     <label class="form-check-label" for="perm_access_reports">
        //                                                         Access Reports
        //                                                     </label>
        //                                                 </div>
        //                                             </div>
        //                                             <div class="col-md-6">
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="manage_inventory" id="perm_manage_inventory" name="permission_manage_inventory">
        //                                                     <label class="form-check-label" for="perm_manage_inventory">
        //                                                         Manage Inventory
        //                                                     </label>
        //                                                 </div>
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="approve_purchases" id="perm_approve_purchases" name="permission_approve_purchases">
        //                                                     <label class="form-check-label" for="perm_approve_purchases">
        //                                                         Approve Purchases
        //                                                     </label>
        //                                                 </div>
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="manage_events" id="perm_manage_events" name="permission_manage_events">
        //                                                     <label class="form-check-label" for="perm_manage_events">
        //                                                         Manage Events
        //                                                     </label>
        //                                                 </div>
        //                                                 <div class="form-check">
        //                                                     <input class="form-check-input permission-checkbox" type="checkbox" 
        //                                                         value="handle_donations" id="perm_handle_donations" name="permission_handle_donations">
        //                                                     <label class="form-check-label" for="perm_handle_donations">
        //                                                         Handle Donations
        //                                                     </label>
        //                                                 </div>
        //                                             </div>
        //                                         </div>
        //                                     </div>
        //                                 </div>

        loadRoles: function() {
            const self = this;
            
            TempleAPI.get('/staff/designations/roles')
                .done(function(response) {
                    if (response.success) {
                        self.roles = response.data;
                        self.populateRolesDropdown();
                    }
                })
                .fail(function() {
                    console.error('Failed to load roles');
                });
        },
        
        populateRolesDropdown: function() {
            let options = '<option value="">Select Role</option>';
            
            $.each(this.roles, function(index, role) {
                options += `<option value="${role.id}">${role.display_name || role.name}</option>`;
            });
            
            $('#roleSelect').html(options);
        },
        
        loadDesignations: function() {
            const self = this;
            const department = $('#departmentTabs .nav-link.active').data('department');
            
            const params = {
                all: true
            };
            
            if (department && department !== 'ALL') {
                params.department = department;
            }
            
            TempleAPI.get('/staff/designations', params)
                .done(function(response) {
                    if (response.success) {
                        self.designations = response.data;
                        
                        if (self.viewMode === 'list') {
                            self.renderListView();
                        } else {
                            self.renderHierarchyView();
                        }
                        
                        self.populateParentDesignations();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load designations', 'error');
                });
        },
        
        renderListView: function() {
            const tbody = $('#designationsTableBody');
            
            if (this.designations.length === 0) {
                tbody.html('<tr><td colspan="10" class="text-center">No designations found</td></tr>');
                return;
            }
            
            let html = '';
            $.each(this.designations, function(index, designation) {
                const statusBadge = designation.is_active 
                    ? '<span class="badge bg-success">Active</span>' 
                    : '<span class="badge bg-secondary">Inactive</span>';
                
                const approvals = [];
                if (designation.can_approve_leave) approvals.push('Leave');
                if (designation.can_approve_payments) approvals.push('Payments');
                if (designation.can_approve_bookings) approvals.push('Bookings');
                
                const approvalsText = approvals.length > 0 
                    ? approvals.join(', ') 
                    : '<span class="text-muted">None</span>';
                
                html += `
                    <tr>
                        <td><code>${designation.designation_code}</code></td>
                        <td>
                            <strong>${designation.designation_name}</strong>
                            ${designation.is_head_of_department ? '<span class="badge bg-info ms-2">HOD</span>' : ''}
                        </td>
                        <td>${designation.department}</td>
                        <td>
                            <span class="badge bg-primary">Level ${designation.level}</span>
                        </td>
                        <td>${designation.parent_designation ? designation.parent_designation.designation_name : '<span class="text-muted">-</span>'}</td>
                        <td>${designation.role ? `<span class="badge bg-warning">${designation.role.display_name || designation.role.name}</span>` : '<span class="text-muted">No role</span>'}</td>
                        <td>
                            <span class="badge bg-secondary">${designation.staff ? designation.staff.length : 0} Staff</span>
                        </td>
                        <td>${approvalsText}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-info" onclick="DesignationPage.viewDesignation('${designation.id}')" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-warning" onclick="DesignationPage.editDesignation('${designation.id}')" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-danger" onclick="DesignationPage.deleteDesignation('${designation.id}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tbody.html(html);
        },
        
        renderHierarchyView: function() {
            const self = this;
            
            TempleAPI.get('/staff/designations/hierarchy')
                .done(function(response) {
                    if (response.success) {
                        const hierarchyHtml = self.buildHierarchyHtml(response.data);
                        $('#hierarchyContainer').html(hierarchyHtml);
                    }
                })
                .fail(function() {
                    $('#hierarchyContainer').html('<div class="alert alert-danger">Failed to load hierarchy</div>');
                });
        },
        
        buildHierarchyHtml: function(nodes, level = 0) {
            let html = '<ul class="hierarchy-list" style="list-style: none; padding-left: ' + (level * 30) + 'px;">';
            
            $.each(nodes, function(index, node) {
                const roleInfo = node.role ? `<span class="badge bg-warning ms-2">${node.role}</span>` : '';
                const icon = node.children && node.children.length > 0 
                    ? '<i class="bi bi-diagram-3-fill"></i>' 
                    : '<i class="bi bi-person-fill"></i>';
                
                html += `
                    <li class="hierarchy-item mb-2">
                        <div class="card d-inline-block">
                            <div class="card-body py-2 px-3">
                                ${icon}
                                <strong>${node.name}</strong>
                                <span class="text-muted">(${node.code})</span>
                                ${roleInfo}
                                <span class="badge bg-info ms-2">${node.department}</span>
                                <span class="badge bg-primary ms-1">L${node.level}</span>
                                <div class="btn-group btn-group-sm ms-3">
                                    <button class="btn btn-sm btn-outline-primary" onclick="DesignationPage.editDesignation('${node.id}')">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        ${node.children && node.children.length > 0 ? DesignationPage.buildHierarchyHtml(node.children, level + 1) : ''}
                    </li>
                `;
            });
            
            html += '</ul>';
            return html;
        },
        
        populateParentDesignations: function() {
            const currentId = $('#designationForm').data('designation-id');
            let options = '<option value="">None (Top Level)</option>';
            
            $.each(this.designations, function(index, designation) {
                // Don't show current designation or its children as parent options
                if (designation.id !== currentId) {
                    options += `<option value="${designation.id}">${designation.designation_name} (${designation.department})</option>`;
                }
            });
            
            $('#parentDesignationSelect').html(options);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Add designation button
            $('#addDesignationBtn').on('click', function() {
                self.openDesignationModal();
            });
            
            // View mode buttons
            $('#listViewBtn').on('click', function() {
                self.viewMode = 'list';
                $('#listView').show();
                $('#hierarchyView').hide();
                $('#listViewBtn').addClass('active');
                $('#hierarchyViewBtn').removeClass('active');
                self.renderListView();
            });
            
            $('#hierarchyViewBtn').on('click', function() {
                self.viewMode = 'hierarchy';
                $('#listView').hide();
                $('#hierarchyView').show();
                $('#hierarchyViewBtn').addClass('active');
                $('#listViewBtn').removeClass('active');
                self.renderHierarchyView();
            });
            
            // Department tabs
            $('#departmentTabs .nav-link').on('click', function(e) {
                e.preventDefault();
                $('#departmentTabs .nav-link').removeClass('active');
                $(this).addClass('active');
                self.loadDesignations();
            });
            
            // Search
            $('#searchDesignation').on('keyup', function() {
                const searchText = $(this).val().toLowerCase();
                
                $('#designationsTableBody tr').each(function() {
                    const text = $(this).text().toLowerCase();
                    $(this).toggle(text.includes(searchText));
                });
            });
            
            // Approval checkboxes
            $('#canApproveLeave').on('change', function() {
                $('#leaveApprovalLimit').toggle(this.checked);
            });
            
            $('#canApprovePayments').on('change', function() {
                $('#paymentApprovalLimit').toggle(this.checked);
            });
            
            // Save designation
            $('#saveDesignationBtn').on('click', function() {
                self.saveDesignation();
            });
            
            // Department change in form
            $('[name="department"]').on('change', function() {
                // Auto-generate code based on department if code field is empty
                if (!$('[name="designation_code"]').val()) {
                    // Code will be auto-generated by backend
                    $('[name="designation_code"]').attr('placeholder', 'Will be auto-generated for ' + $(this).val());
                }
            });
            
            // Modal shown event - Initialize permissions
            $('#designationModal').on('shown.bs.modal', function() {
                // Any special initialization if needed
                console.log('Modal opened - permissions checkboxes ready');
            });
        },
        
        openDesignationModal: function(designationId = null) {
            // Reset form
            $('#designationForm')[0].reset();
            $('#designationForm').removeData('designation-id');
            $('#leaveApprovalLimit').hide();
            $('#paymentApprovalLimit').hide();
            
            // Reset all permission checkboxes
            $('.permission-checkbox').prop('checked', false);
            
            if (designationId) {
                $('#designationModalTitle').text('Edit Designation');
                this.loadDesignationData(designationId);
            } else {
                $('#designationModalTitle').text('Add New Designation');
                $('#isActive').prop('checked', true);
                $('[name="designation_code"]').val('').attr('readonly', true);
            }
            
            $('#designationModal').modal('show');
        },
        
        loadDesignationData: function(designationId) {
            const self = this;
            
            TempleAPI.get(`/staff/designations/${designationId}`)
                .done(function(response) {
                    if (response.success) {
                        const designation = response.data;
                        
                        // Populate form fields
                        $.each(designation, function(key, value) {
                            const field = $(`[name="${key}"]`);
                            if (field.length) {
                                if (field.attr('type') === 'checkbox') {
                                    field.prop('checked', value);
                                } else {
                                    field.val(value);
                                }
                            }
                        });
                        
                        // Handle additional permissions checkboxes
                        if (designation.additional_permissions && Array.isArray(designation.additional_permissions)) {
                            designation.additional_permissions.forEach(function(permission) {
                                $(`#perm_${permission}`).prop('checked', true);
                            });
                        }
                        
                        // Show/hide approval limits
                        if (designation.can_approve_leave) {
                            $('#leaveApprovalLimit').show();
                        }
                        if (designation.can_approve_payments) {
                            $('#paymentApprovalLimit').show();
                        }
                        
                        // Make code field readonly for existing designation
                        $('[name="designation_code"]').attr('readonly', true);
                        
                        // Store designation ID for update
                        $('#designationForm').data('designation-id', designationId);
                        
                        // Update parent designations dropdown (exclude current and children)
                        self.populateParentDesignations();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load designation data', 'error');
                });
        },
        
        saveDesignation: function() {
            const self = this;
            const formData = this.getFormData();
            const designationId = $('#designationForm').data('designation-id');
            
            // Validate form
            if (!this.validateForm()) {
                return;
            }
            
            TempleCore.showLoading(true);
            
            const request = designationId 
                ? TempleAPI.put(`/staff/designations/${designationId}`, formData)
                : TempleAPI.post('/staff/designations', formData);
            
            request
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Designation saved successfully', 'success');
                        $('#designationModal').modal('hide');
                        self.loadDesignations();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save designation', 'error');
                    }
                })
                .fail(function(xhr) {
                    const response = xhr.responseJSON;
                    if (response && response.errors) {
                        let errorMessage = 'Validation errors:<br>';
                        $.each(response.errors, function(field, errors) {
                            errorMessage += errors.join('<br>') + '<br>';
                        });
                        TempleCore.showToast(errorMessage, 'error');
                    } else {
                        TempleCore.showToast(response.message || 'An error occurred', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        getFormData: function() {
            const formData = {};
            
            // Handle regular form fields
            $('#designationForm').find('input, select, textarea').each(function() {
                const field = $(this);
                const name = field.attr('name');
                
                if (!name) return;
                
                // Skip permission checkboxes for now (handled separately)
                if (name.startsWith('permission_')) return;
                
                if (field.attr('type') === 'checkbox') {
                    formData[name] = field.is(':checked');
                } else if (field.is('select[multiple]')) {
                    formData[name] = field.val() || [];
                } else if (field.val()) {
                    formData[name] = field.val();
                }
            });
            
            // Collect permission checkboxes
            formData.additional_permissions = [];
            $('.permission-checkbox:checked').each(function() {
                formData.additional_permissions.push($(this).val());
            });
            
            return formData;
        },
        
        validateForm: function() {
            const requiredFields = $('#designationForm').find('[required]');
            let isValid = true;
            
            requiredFields.each(function() {
                if (!$(this).val()) {
                    $(this).addClass('is-invalid');
                    isValid = false;
                } else {
                    $(this).removeClass('is-invalid');
                }
            });
            
            if (!isValid) {
                TempleCore.showToast('Please fill all required fields', 'warning');
            }
            
            return isValid;
        },
        
        viewDesignation: function(designationId) {
            const self = this;
            
            TempleAPI.get(`/staff/designations/${designationId}`)
                .done(function(response) {
                    if (response.success) {
                        const designation = response.data;
                        const html = self.buildDetailsHtml(designation);
                        $('#designationDetailsContent').html(html);
                        $('#viewDesignationModal').modal('show');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load designation details', 'error');
                });
        },
        
        buildDetailsHtml: function(designation) {
            const approvals = [];
            if (designation.can_approve_leave) {
                approvals.push(`Leave (Max: ${designation.max_leave_approval_days || 'Unlimited'} days)`);
            }
            if (designation.can_approve_payments) {
                approvals.push(`Payments (Max: RM ${designation.max_payment_approval_amount || 'Unlimited'})`);
            }
            if (designation.can_approve_bookings) {
                approvals.push('Bookings');
            }
            
            let html = `
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">Code:</th>
                                <td><code>${designation.designation_code}</code></td>
                            </tr>
                            <tr>
                                <th>Name:</th>
                                <td><strong>${designation.designation_name}</strong></td>
                            </tr>
                            <tr>
                                <th>Department:</th>
                                <td>${designation.department}</td>
                            </tr>
                            <tr>
                                <th>Level:</th>
                                <td><span class="badge bg-primary">Level ${designation.level}</span></td>
                            </tr>
                            <tr>
                                <th>Reports To:</th>
                                <td>${designation.parent_designation ? designation.parent_designation.designation_name : 'None (Top Level)'}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr>
                                <th width="40%">System Role:</th>
                                <td>${designation.role ? `<span class="badge bg-warning">${designation.role.display_name || designation.role.name}</span>` : 'No role assigned'}</td>
                            </tr>
                            <tr>
                                <th>Status:</th>
                                <td>${designation.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                            </tr>
                            <tr>
                                <th>HOD:</th>
                                <td>${designation.is_head_of_department ? '<span class="badge bg-info">Yes</span>' : 'No'}</td>
                            </tr>
                            <tr>
                                <th>Active Staff:</th>
                                <td><span class="badge bg-secondary">${designation.staff ? designation.staff.length : 0} Staff</span></td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <h6 class="mt-3">Approval Authorities</h6>
                <p>${approvals.length > 0 ? approvals.join('<br>') : '<span class="text-muted">No approval authorities</span>'}</p>
                
                ${designation.additional_permissions && designation.additional_permissions.length > 0 ? `
                    <h6 class="mt-3">Additional Permissions</h6>
                    <ul>
                        ${designation.additional_permissions.map(p => `<li>${p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>`).join('')}
                    </ul>
                ` : ''}
                
                ${designation.description ? `
                    <h6 class="mt-3">Description</h6>
                    <p>${designation.description}</p>
                ` : ''}
                
                ${designation.child_designations && designation.child_designations.length > 0 ? `
                    <h6 class="mt-3">Subordinate Designations</h6>
                    <ul>
                        ${designation.child_designations.map(d => `<li>${d.designation_name} (${d.designation_code})</li>`).join('')}
                    </ul>
                ` : ''}
            `;
            
            return html;
        },
        
        editDesignation: function(designationId) {
            this.openDesignationModal(designationId);
        },
        
        deleteDesignation: function(designationId) {
            const self = this;
            
            TempleCore.showConfirm(
                'Delete Designation',
                'Are you sure you want to delete this designation? This designation will be deactivated if it has active staff.',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete(`/staff/designations/${designationId}`)
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('Designation deleted successfully', 'success');
                                self.loadDesignations();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete designation', 'error');
                            }
                        })
                        .fail(function(xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response.message || 'An error occurred', 'error');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        }
    };
    
})(jQuery, window);