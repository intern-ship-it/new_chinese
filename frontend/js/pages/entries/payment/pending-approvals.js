// js/pages/entries/payment-approval.js
(function($, window) {
    'use strict';
    
    window.PaymentApprovalPage = {
        currentFilter: {
            from_date: null,
            to_date: null,
            fund_id: null,
            status: 'pending',
            page: 1,
            per_page: 20
        },
        
        currentTab: 'pending',
        
        init: function() {
            this.render();
            this.loadFunds();
            this.loadApprovals();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-check2-square"></i> Payment Approvals
                            </h3>
                        </div>
                    </div>
                    
                    <!-- Status Tabs -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <ul class="nav nav-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-tab="pending" href="#pending">
                                        <i class="bi bi-clock-history"></i> Pending Approvals
                                        <span class="badge bg-warning ms-2" id="pendingCount">0</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-tab="approved" href="#approved">
                                        <i class="bi bi-check-circle"></i> Approved
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-tab="rejected" href="#rejected">
                                        <i class="bi bi-x-circle"></i> Rejected
                                    </a>
                                </li>
                            </ul>
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
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-primary w-100" id="btnFilter">
                                        <i class="bi bi-funnel"></i> Apply Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Approvals Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="approvalsTable">
                                    <thead>
                                        <tr>
                                            <th width="100">Date</th>
                                            <th width="140">Entry Code</th>
                                            <th>Paid To</th>
                                            <th>Payment Mode</th>
                                            <th>Fund</th>
                                            <th width="120" class="text-end">Amount</th>
                                            <th>Created By</th>
                                            <th width="120">Status</th>
                                            <th width="200">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="approvalsTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">
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
                
                <!-- View Details Modal -->
                <div class="modal fade" id="viewApprovalModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Payment Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="viewApprovalContent">
                                <!-- Content will be loaded dynamically -->
                            </div>
                            <div class="modal-footer" id="approvalModalFooter">
                                <!-- Buttons will be added dynamically based on status -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Rejection Reason Modal -->
                <div class="modal fade" id="rejectionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reject Payment</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Rejection Reason <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="rejectionReason" rows="4" 
                                        placeholder="Please provide a reason for rejection..." required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="btnConfirmReject">
                                    <i class="bi bi-x-circle"></i> Reject Payment
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
        
        loadApprovals: function() {
            const self = this;
            const endpoint = this.currentTab === 'pending' 
                ? '/accounts/entries/pending-approvals'
                : '/accounts/entries/approval-history';
            
            const filters = {...this.currentFilter};
            if (this.currentTab !== 'pending') {
                filters.status = this.currentTab;
            }
            
            TempleAPI.get(endpoint, filters)
                .done(function(response) {
                    if (response.success) {
                        self.renderApprovals(response.data);
                        
                        // Update pending count
                        if (self.currentTab === 'pending') {
                            $('#pendingCount').text(response.data.total || 0);
                        }
                    }
                })
                .fail(function(jqXHR) {
                    if (jqXHR.status === 403) {
                        TempleCore.showToast('You are not authorized to view payment approvals', 'error');
                        // Redirect to dashboard or entries page
                        setTimeout(() => {
                            TempleRouter.navigate('dashboard');
                        }, 2000);
                    } else {
                        TempleCore.showToast('Failed to load approvals', 'error');
                    }
                });
        },
        
        renderApprovals: function(data) {
            const approvals = data.data || [];
            
            if (approvals.length === 0) {
                $('#approvalsTableBody').html(`
                    <tr>
                        <td colspan="9" class="text-center py-4 text-muted">
                            <i class="bi bi-inbox fs-1"></i>
                            <p>No ${this.currentTab} payments found</p>
                        </td>
                    </tr>
                `);
                return;
            }
            
            const rows = approvals.map(approval => {
                const statusBadge = this.getStatusBadge(approval.approval_status);
                const actions = this.getActions(approval);
                
                return `
                    <tr>
                        <td>${TempleCore.formatDate(approval.date)}</td>
                        <td><code>${approval.entry_code}</code></td>
                        <td>${approval.paid_to || '-'}</td>
                        <td>
                            <span class="badge bg-secondary">${approval.payment}</span>
                            ${approval.cheque_no ? `<br><small>Cheque: ${approval.cheque_no}</small>` : ''}
                        </td>
                        <td>${approval.fund?.name || '-'}</td>
                        <td class="text-end"><strong>${TempleCore.formatCurrency(approval.dr_total)}</strong></td>
                        <td>${approval.creator?.name || '-'}</td>
                        <td>${statusBadge}</td>
                        <td>${actions}</td>
                    </tr>
                `;
            }).join('');
            
            $('#approvalsTableBody').html(rows);
            this.renderPagination(data);
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'pending': '<span class="badge bg-warning">Pending</span>',
                'approved': '<span class="badge bg-success">Approved</span>',
                'rejected': '<span class="badge bg-danger">Rejected</span>'
            };
            return badges[status] || '';
        },
        
        getActions: function(approval) {
            if (approval.approval_status === 'pending') {
                return `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info btn-view" data-id="${approval.id}" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-success btn-approve" data-id="${approval.id}" title="Approve">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-danger btn-reject" data-id="${approval.id}" title="Reject">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                `;
            } else {
                let additionalInfo = '';
                if (approval.approval_status === 'approved') {
                    additionalInfo = `<br><small>By: ${approval.approver?.name || '-'}<br>${TempleCore.formatDate(approval.approved_at)}</small>`;
                } else if (approval.approval_status === 'rejected') {
                    additionalInfo = `<br><small>By: ${approval.rejector?.name || '-'}<br>${TempleCore.formatDate(approval.rejected_at)}</small>`;
                }
                
                return `
                    <button class="btn btn-sm btn-info btn-view" data-id="${approval.id}" title="View Details">
                        <i class="bi bi-eye"></i> View
                    </button>
                    ${additionalInfo}
                `;
            }
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
            
            // Tab switching
            $('.nav-link[data-tab]').on('click', function(e) {
                e.preventDefault();
                $('.nav-link[data-tab]').removeClass('active');
                $(this).addClass('active');
                
                self.currentTab = $(this).data('tab');
                self.currentFilter.status = self.currentTab === 'pending' ? 'pending' : self.currentTab;
                self.currentFilter.page = 1;
                self.loadApprovals();
            });
            
            // Filter
            $('#btnFilter').on('click', function() {
                self.currentFilter.from_date = $('#filterFromDate').val();
                self.currentFilter.to_date = $('#filterToDate').val();
                self.currentFilter.fund_id = $('#filterFund').val();
                self.currentFilter.page = 1;
                self.loadApprovals();
            });
            
            // View details
            $(document).on('click', '.btn-view', function() {
                const approvalId = $(this).data('id');
                self.viewApproval(approvalId);
            });
            
            // Approve
            $(document).on('click', '.btn-approve', function() {
                const approvalId = $(this).data('id');
                TempleCore.showConfirm(
                    'Approve Payment',
                    'Are you sure you want to approve this payment?',
                    function() {
                        self.processApproval(approvalId, 'approve');
                    }
                );
            });
            
            // Reject
            $(document).on('click', '.btn-reject', function() {
                const approvalId = $(this).data('id');
                self.currentApprovalId = approvalId;
                $('#rejectionReason').val('');
                const modal = new bootstrap.Modal(document.getElementById('rejectionModal'));
                modal.show();
            });
            
            // Confirm rejection
            $('#btnConfirmReject').on('click', function() {
                const reason = $('#rejectionReason').val().trim();
                if (!reason) {
                    TempleCore.showToast('Please provide a rejection reason', 'error');
                    return;
                }
                
                self.processApproval(self.currentApprovalId, 'reject', reason);
                bootstrap.Modal.getInstance(document.getElementById('rejectionModal')).hide();
            });
            
            // Pagination
            $(document).on('click', '.pagination a', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentFilter.page = page;
                    self.loadApprovals();
                }
            });
        },
        
        viewApproval: function(approvalId) {
            const endpoint = this.currentTab === 'pending' 
                ? '/accounts/entries/pending-approvals'
                : '/accounts/entries/approval-history';
            
            TempleAPI.get(`${endpoint}/${approvalId}`)
                .done(function(response) {
                    if (response.success) {
                        const approval = response.data;
                        const itemsHtml = approval.entry_items.map(item => `
                            <tr>
                                <td>${item.ledger.name} (${item.ledger.left_code}/${item.ledger.right_code})</td>
                                <td class="text-end">${item.dc === 'D' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                                <td class="text-end">${item.dc === 'C' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                            </tr>
                        `).join('');
                        
                        const content = `
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Entry Code:</strong> ${approval.entry_code}<br>
                                    <strong>Date:</strong> ${TempleCore.formatDate(approval.date)}<br>
                                    <strong>Fund:</strong> ${approval.fund?.name || '-'}<br>
                                    <strong>Created By:</strong> ${approval.creator?.name || '-'}<br>
                                    <strong>Created At:</strong> ${TempleCore.formatDate(approval.created_at)}
                                </div>
                                <div class="col-md-6">
                                    <strong>Payment Mode:</strong> ${approval.payment}<br>
                                    <strong>Paid To:</strong> ${approval.paid_to}<br>
                                    ${approval.cheque_no ? `<strong>Cheque No:</strong> ${approval.cheque_no}<br>` : ''}
                                    ${approval.cheque_date ? `<strong>Cheque Date:</strong> ${TempleCore.formatDate(approval.cheque_date)}<br>` : ''}
                                    <strong>Status:</strong> ${PaymentApprovalPage.getStatusBadge(approval.approval_status)}
                                </div>
                            </div>
                            
                            ${approval.narration ? `
                                <div class="mb-3">
                                    <strong>Narration:</strong><br>
                                    ${approval.narration}
                                </div>
                            ` : ''}
                            
                            ${approval.rejection_reason ? `
                                <div class="alert alert-danger">
                                    <strong>Rejection Reason:</strong><br>
                                    ${approval.rejection_reason}<br>
                                    <small>Rejected by: ${approval.rejector?.name} on ${TempleCore.formatDate(approval.rejected_at)}</small>
                                </div>
                            ` : ''}
                            
                            ${approval.approved_at ? `
                                <div class="alert alert-success">
                                    <strong>Approved by:</strong> ${approval.approver?.name}<br>
                                    <strong>Approved on:</strong> ${TempleCore.formatDate(approval.approved_at)}
                                </div>
                            ` : ''}
                            
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Account</th>
                                        <th width="120" class="text-end">Debit</th>
                                        <th width="120" class="text-end">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th>Total</th>
                                        <th class="text-end">${TempleCore.formatCurrency(approval.dr_total)}</th>
                                        <th class="text-end">${TempleCore.formatCurrency(approval.cr_total)}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        `;
                        
                        $('#viewApprovalContent').html(content);
                        
                        // Update modal footer based on status
                        let footerHtml = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
                        
                        if (approval.approval_status === 'pending') {
                            footerHtml += `
                                <button type="button" class="btn btn-success" onclick="PaymentApprovalPage.processApproval(${approval.id}, 'approve')">
                                    <i class="bi bi-check-lg"></i> Approve
                                </button>
                                <button type="button" class="btn btn-danger" onclick="PaymentApprovalPage.showRejectModal(${approval.id})">
                                    <i class="bi bi-x-lg"></i> Reject
                                </button>
                            `;
                        }
                        
                        $('#approvalModalFooter').html(footerHtml);
                        
                        const modal = new bootstrap.Modal(document.getElementById('viewApprovalModal'));
                        modal.show();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load approval details', 'error');
                });
        },
        
        showRejectModal: function(approvalId) {
            this.currentApprovalId = approvalId;
            bootstrap.Modal.getInstance(document.getElementById('viewApprovalModal')).hide();
            $('#rejectionReason').val('');
            const modal = new bootstrap.Modal(document.getElementById('rejectionModal'));
            modal.show();
        },
        
        processApproval: function(approvalId, action, reason) {
            const self = this;
            const data = { action: action };
            
            if (action === 'reject' && reason) {
                data.rejection_reason = reason;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/accounts/entries/${approvalId}/approve`, data)
                .done(function(response) {
                    if (response.success) {
                        const message = action === 'approve' 
                            ? 'Payment approved successfully' 
                            : 'Payment rejected successfully';
                        TempleCore.showToast(message, 'success');
                        
                        // Close any open modals
                        $('.modal').modal('hide');
                        
                        // Reload the list
                        self.loadApprovals();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to process approval', 'error');
                    }
                })
                .fail(function(jqXHR) {
                    if (jqXHR.status === 403) {
                        TempleCore.showToast('You are not authorized to approve payments', 'error');
                    } else {
                        TempleCore.showToast('An error occurred while processing approval', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        }
    };
    
})(jQuery, window);