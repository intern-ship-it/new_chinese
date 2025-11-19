// js/pages/entries/payment/approval-list.js
(function($, window) {
    'use strict';
    
    window.EntriesPaymentApprovalListPage = {
        approvals: [],
        currentFilter: 'pending',
        statistics: {},
        
        init: function() {
            this.render();
            this.loadStatistics();
            this.loadApprovals();
            this.bindEvents();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-check-circle"></i> Payment Approvals
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('entries')">
                                <i class="bi bi-arrow-left"></i> Back to Entries
                            </button>
                        </div>
                    </div>
                    
                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-icon warning mx-auto">
                                    <i class="bi bi-clock-history"></i>
                                </div>
                                <div class="stat-value" id="statPending">0</div>
                                <div class="stat-label">Pending</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-icon info mx-auto">
                                    <i class="bi bi-hourglass-split"></i>
                                </div>
                                <div class="stat-value" id="statPartial">0</div>
                                <div class="stat-label">Partially Approved</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-icon success mx-auto">
                                    <i class="bi bi-check-circle"></i>
                                </div>
                                <div class="stat-value" id="statApproved">0</div>
                                <div class="stat-label">Approved (This Month)</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-icon danger mx-auto">
                                    <i class="bi bi-x-circle"></i>
                                </div>
                                <div class="stat-value" id="statRejected">0</div>
                                <div class="stat-label">Rejected (This Month)</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- My Pending Badge -->
                    <div class="alert alert-info" id="myPendingAlert" style="display:none;">
                        <i class="bi bi-info-circle"></i> You have <strong id="myPendingCount">0</strong> payment(s) waiting for your approval.
                    </div>
                    
                    <!-- Filter Tabs -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs">
                                <li class="nav-item">
                                    <a class="nav-link active" href="#" data-filter="pending">
                                        Pending <span class="badge bg-warning text-dark ms-1" id="badgePending">0</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="#" data-filter="partial_approved">
                                        Partially Approved <span class="badge bg-info text-white ms-1" id="badgePartial">0</span>
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="#" data-filter="approved">
                                        Approved
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" href="#" data-filter="rejected">
                                        Rejected
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <!-- Date Filter -->
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterFromDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterToDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-primary d-block" id="btnApplyFilter">
                                        <i class="bi bi-filter"></i> Apply Filter
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Approvals Table -->
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="100">Date</th>
                                            <th width="120">Payment No.</th>
                                            <th>Paid To</th>
                                            <th width="120">Amount</th>
                                            <th width="100">Mode</th>
                                            <th width="150">Status</th>
                                            <th width="120">Approval Progress</th>
                                            <th width="200">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="approvalsTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center">
                                                <div class="spinner-border spinner-border-sm" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                Loading approvals...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <nav id="paginationContainer"></nav>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadStatistics: function() {
            const self = this;
            
            TempleAPI.get('/accounts/entries/approval/statistics')
                .done(function(response) {
                    if (response.success) {
                        self.statistics = response.data;
                        
                        $('#statPending').text(response.data.pending || 0);
                        $('#statPartial').text(response.data.partial_approved || 0);
                        $('#statApproved').text(response.data.approved || 0);
                        $('#statRejected').text(response.data.rejected || 0);
                        
                        $('#badgePending').text(response.data.pending || 0);
                        $('#badgePartial').text(response.data.partial_approved || 0);
                        
                        if (response.data.my_pending > 0) {
                            $('#myPendingCount').text(response.data.my_pending);
                            $('#myPendingAlert').show();
                        }
                        
                        // Format pending amount
                        if (response.data.pending_amount) {
                            $('#statPending').append(`<br><small>${TempleCore.formatCurrency(response.data.pending_amount)}</small>`);
                        }
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load statistics');
                });
        },
        
        loadApprovals: function(page = 1) {
            const self = this;
            
            const params = {
                status: this.currentFilter === 'pending' ? 'pending' : this.currentFilter,
                page: page,
                per_page: 20
            };
            
            // Add date filters
            const fromDate = $('#filterFromDate').val();
            const toDate = $('#filterToDate').val();
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;
            
            TempleAPI.get('/accounts/entries/approval/list', params)
                .done(function(response) {
                    if (response.success) {
                        self.approvals = response.data.data;
                        self.renderApprovals();
                        self.renderPagination(response.data);
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast('Failed to load approvals', 'error');
                });
        },
        
        renderApprovals: function() {
            const self = this;
            const $tbody = $('#approvalsTableBody');
            
            if (this.approvals.length === 0) {
                $tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center text-muted py-4">
                            No approvals found
                        </td>
                    </tr>
                `);
                return;
            }
            
            let html = '';
            $.each(this.approvals, function(index, approval) {
                const statusBadge = self.getStatusBadge(approval.approval_status);
                const approvalProgress = `${approval.approval_count}/${approval.required_approvals}`;
                const progressPercent = (approval.approval_count / approval.required_approvals) * 100;
                
                html += `
                    <tr>
                        <td>${TempleCore.formatDate(approval.date)}</td>
                        <td>${approval.entry_code}</td>
                        <td>${approval.paid_to}</td>
                        <td class="text-end">${TempleCore.formatCurrency(approval.dr_total)}</td>
                        <td>
                            <span class="badge bg-secondary">${approval.payment}</span>
                        </td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${progressPercent}%"
                                     aria-valuenow="${approval.approval_count}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="${approval.required_approvals}">
                                    ${approvalProgress}
                                </div>
                            </div>
                        </td>
                        <td>
                            ${self.getActionButtons(approval)}
                        </td>
                    </tr>
                `;
            });
            
            $tbody.html(html);
        },
        
        getStatusBadge: function(status) {
            const badges = {
                'pending': '<span class="badge bg-warning text-dark">Pending</span>',
                'partial_approved': '<span class="badge bg-info">Partially Approved</span>',
                'approved': '<span class="badge bg-success">Approved</span>',
                'rejected': '<span class="badge bg-danger">Rejected</span>'
            };
            return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
        },
        
        getActionButtons: function(approval) {
            let buttons = '';
            
            // View button - always show
            buttons += `
                <button class="btn btn-sm btn-info view-approval" data-id="${approval.id}" title="View">
                    <i class="bi bi-eye"></i>
                </button>
            `;
            
            // Approve/Reject buttons
            if (approval.can_approve && !approval.has_user_approved && 
                ['pending', 'partial_approved'].includes(approval.approval_status)) {
                buttons += `
                    <button class="btn btn-sm btn-success approve-payment" data-id="${approval.id}" title="Approve">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-danger reject-payment" data-id="${approval.id}" title="Reject">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `;
            }
            
            // Edit button - only for pending and created by user
            if (approval.approval_status === 'pending' && approval.can_edit) {
                buttons += `
                    <button class="btn btn-sm btn-warning edit-approval" data-id="${approval.id}" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                `;
            }
            
            // Cancel button - only for pending and created by user
            if (approval.approval_status === 'pending' && approval.can_edit) {
                buttons += `
                    <button class="btn btn-sm btn-secondary cancel-payment" data-id="${approval.id}" title="Cancel">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
            }
            
            return buttons;
        },
        
        renderPagination: function(data) {
            if (data.last_page <= 1) {
                $('#paginationContainer').empty();
                return;
            }
            
            let html = '<ul class="pagination justify-content-center">';
            
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
            
            html += '</ul>';
            $('#paginationContainer').html(html);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Tab filter clicks
            $('.nav-tabs .nav-link').on('click', function(e) {
                e.preventDefault();
                $('.nav-tabs .nav-link').removeClass('active');
                $(this).addClass('active');
                self.currentFilter = $(this).data('filter');
                self.loadApprovals();
            });
            
            // Apply filter
            $('#btnApplyFilter').on('click', function() {
                self.loadApprovals();
            });
            
            // Pagination clicks
            $(document).on('click', '.pagination .page-link', function(e) {
                e.preventDefault();
                if (!$(this).parent().hasClass('disabled')) {
                    const page = $(this).data('page');
                    self.loadApprovals(page);
                }
            });
            
            // View approval
            $(document).on('click', '.view-approval', function() {
                const id = $(this).data('id');
                self.viewApproval(id);
            });
            
            // Approve payment
            $(document).on('click', '.approve-payment', function() {
                const id = $(this).data('id');
                self.approvePayment(id);
            });
            
            // Reject payment
            $(document).on('click', '.reject-payment', function() {
                const id = $(this).data('id');
                self.rejectPayment(id);
            });
            
            // Edit approval
            $(document).on('click', '.edit-approval', function() {
                const id = $(this).data('id');
                TempleRouter.navigate('entries/payment/approval-edit', { id: id });
            });
            
            // Cancel payment
            $(document).on('click', '.cancel-payment', function() {
                const id = $(this).data('id');
                self.cancelPayment(id);
            });
        },
        
        viewApproval: function(id) {
            TempleAPI.get(`/accounts/entries/approval/${id}`)
                .done(function(response) {
                    if (response.success) {
                        EntriesPaymentApprovalListPage.showApprovalModal(response.data);
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast('Failed to load approval details', 'error');
                });
        },
        
        showApprovalModal: function(approval) {
            // Build items table
            let itemsHtml = '';
            let debitTotal = 0;
            let creditTotal = 0;
            
            approval.entry_items.forEach(function(item) {
                itemsHtml += `
                    <tr>
                        <td>${item.ledger.name}</td>
                        <td class="text-end">${item.dc === 'D' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                        <td class="text-end">${item.dc === 'C' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                        <td>${item.details || '-'}</td>
                    </tr>
                `;
                
                if (item.dc === 'D') debitTotal += parseFloat(item.amount);
                if (item.dc === 'C') creditTotal += parseFloat(item.amount);
            });
            
            // Build approval logs
            let logsHtml = '';
            if (approval.approval_logs && approval.approval_logs.length > 0) {
                approval.approval_logs.forEach(function(log) {
                    const actionBadge = log.action === 'approved' 
                        ? '<span class="badge bg-success">Approved</span>'
                        : '<span class="badge bg-danger">Rejected</span>';
                    
                    logsHtml += `
                        <tr>
                            <td>${log.approver.name}</td>
                            <td>${log.position ? log.position.name : '-'}</td>
                            <td>${actionBadge}</td>
                            <td>${log.comments || '-'}</td>
                            <td>${TempleCore.formatDate(log.created_at, 'time')}</td>
                        </tr>
                    `;
                });
            } else {
                logsHtml = '<tr><td colspan="5" class="text-center text-muted">No approval actions yet</td></tr>';
            }
            
            const modalHtml = `
                <div class="modal fade" id="approvalModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Payment Approval Details - ${approval.entry_code}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-3">
                                        <strong>Date:</strong><br>${TempleCore.formatDate(approval.date)}
                                    </div>
                                    <div class="col-md-3">
                                        <strong>Payment Mode:</strong><br>${approval.payment}
                                    </div>
                                    <div class="col-md-3">
                                        <strong>Paid To:</strong><br>${approval.paid_to}
                                    </div>
                                    <div class="col-md-3">
                                        <strong>Status:</strong><br>${EntriesPaymentApprovalListPage.getStatusBadge(approval.approval_status)}
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-3">
                                        <strong>Fund:</strong><br>${approval.fund.name}
                                    </div>
                                    <div class="col-md-3">
                                        <strong>Created By:</strong><br>${approval.creator.name}
                                    </div>
                                    <div class="col-md-3">
                                        <strong>Approval Progress:</strong><br>
                                        ${approval.approval_count}/${approval.required_approvals}
                                    </div>
                                    <div class="col-md-3">
                                        <strong>Amount:</strong><br>${TempleCore.formatCurrency(approval.dr_total)}
                                    </div>
                                </div>
                                
                                ${approval.narration ? `
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <strong>Narration:</strong><br>${approval.narration}
                                    </div>
                                </div>
                                ` : ''}
                                
                                <h6 class="mt-4">Payment Items</h6>
                                <table class="table table-sm table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Account</th>
                                            <th width="120">Debit</th>
                                            <th width="120">Credit</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsHtml}
                                    </tbody>
                                    <tfoot>
                                        <tr class="table-active">
                                            <th>Total</th>
                                            <th class="text-end">${TempleCore.formatCurrency(debitTotal)}</th>
                                            <th class="text-end">${TempleCore.formatCurrency(creditTotal)}</th>
                                            <th></th>
                                        </tr>
                                    </tfoot>
                                </table>
                                
                                <h6 class="mt-4">Approval History</h6>
                                <table class="table table-sm table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Approver</th>
                                            <th>Position</th>
                                            <th>Action</th>
                                            <th>Comments</th>
                                            <th>Date/Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${logsHtml}
                                    </tbody>
                                </table>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('approvalModal'));
            modal.show();
            
            $('#approvalModal').on('hidden.bs.modal', function() {
                $(this).remove();
            });
        },
        
        approvePayment: function(id) {
            TempleCore.showConfirm(
                'Approve Payment',
                'Are you sure you want to approve this payment?',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post(`/accounts/entries/approval/${id}/approve`, {
                        comments: ''
                    })
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast(response.message, 'success');
                            EntriesPaymentApprovalListPage.loadStatistics();
                            EntriesPaymentApprovalListPage.loadApprovals();
                        }
                    })
                    .fail(function(xhr) {
                        const response = xhr.responseJSON;
                        TempleCore.showToast(response?.message || 'Failed to approve payment', 'error');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        },
        
        rejectPayment: function(id) {
            const modalHtml = `
                <div class="modal fade" id="rejectModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reject Payment</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Rejection Reason <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="rejectionReason" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Comments <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="rejectionComments" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmReject">Reject Payment</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('rejectModal'));
            modal.show();
            
            $('#confirmReject').on('click', function() {
                const reason = $('#rejectionReason').val();
                const comments = $('#rejectionComments').val();
                
                if (!reason || !comments) {
                    TempleCore.showToast('Please provide rejection reason and comments', 'warning');
                    return;
                }
                
                TempleCore.showLoading(true);
                
                TempleAPI.post(`/accounts/entries/approval/${id}/reject`, {
                    rejection_reason: reason,
                    comments: comments
                })
                .done(function(response) {
                    if (response.success) {
                        modal.hide();
                        TempleCore.showToast(response.message, 'success');
                        EntriesPaymentApprovalListPage.loadStatistics();
                        EntriesPaymentApprovalListPage.loadApprovals();
                    }
                })
                .fail(function(xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Failed to reject payment', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
            });
            
            $('#rejectModal').on('hidden.bs.modal', function() {
                $(this).remove();
            });
        },
        
        cancelPayment: function(id) {
            TempleCore.showConfirm(
                'Cancel Payment',
                'Are you sure you want to cancel this payment? This action cannot be undone.',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete(`/accounts/entries/approval/${id}/cancel`)
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast(response.message, 'success');
                            EntriesPaymentApprovalListPage.loadStatistics();
                            EntriesPaymentApprovalListPage.loadApprovals();
                        }
                    })
                    .fail(function(xhr) {
                        const response = xhr.responseJSON;
                        TempleCore.showToast(response?.message || 'Failed to cancel payment', 'error');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        }
    };
    
})(jQuery, window);