// js/pages/budgets/create.js
// Create Budget Page

(function($, window) {
    'use strict';
    
    window.BudgetsCreatePage = {
        eligibleLedgers: {},
        selectedLedgers: [],
        
        // Initialize page
        init: function() {
            this.render();
            this.loadEligibleLedgers();
            this.loadCurrentYearSummary();
            this.bindEvents();
        },
        
        // Render page HTML
        render: function() {
            const currencySymbol = TempleCore.getCurrency();
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col">
                                <h1 class="page-title">
                                    <i class="bi bi-plus-circle"></i> Create Budget
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('budgets'); return false;">Budgets</a></li>
                                        <li class="breadcrumb-item active">Create</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-auto">
                                <button class="btn btn-secondary" onclick="TempleRouter.navigate('budgets'); return false;">
                                    <i class="bi bi-arrow-left"></i> Back to List
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Budget Form -->
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">Budget Details</h5>
                                </div>
                                <div class="card-body">
                                    <form id="createBudgetForm">
                                        <div class="mb-3">
                                            <label class="form-label">Group <span class="text-danger">*</span></label>
                                            <select class="form-select" id="groupCode" required>
                                                <option value="">Select Group</option>
                                                <option value="4000">Revenue (4000)</option>
                                                <option value="5000">Direct Costs (5000)</option>
                                                <option value="6000">Expenses (6000)</option>
                                                <option value="8000">Other Income (8000)</option>
                                            </select>
                                            <small class="text-muted">Budget can only be created for these groups</small>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Ledger <span class="text-danger">*</span></label>
                                            <select class="form-select" id="ledgerId" required disabled>
                                                <option value="">Select Group First</option>
                                            </select>
                                        </div>

                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Budget Type</label>
                                                <input type="text" class="form-control" id="budgetType" readonly>
                                                <small class="text-muted">Auto-determined based on selected group</small>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Budget Amount <span class="text-danger">*</span></label>
                                                <div class="input-group">
                                                    <span class="input-group-text">${currencySymbol}</span>
                                                    <input type="number" class="form-control" id="budgetAmount" step="0.01" min="0" required>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Notes</label>
                                            <textarea class="form-control" id="budgetNotes" rows="3" placeholder="Optional notes or justification for this budget"></textarea>
                                        </div>
                                    </form>
                                </div>
                                <div class="card-footer">
                                    <button type="button" class="btn btn-primary" id="saveDraftBtn">
                                        <i class="bi bi-save"></i> Save as Draft
                                    </button>
                                    <button type="button" class="btn btn-success" id="saveSubmitBtn">
                                        <i class="bi bi-send"></i> Save & Submit for Approval
                                    </button>
                                    <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('budgets');">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Info Panel -->
                        <div class="col-md-4">
                            <!-- Budget Info -->
                            <div class="card mb-3">
                                <div class="card-header bg-info text-white">
                                    <h6 class="mb-0"><i class="bi bi-info-circle"></i> Budget Information</h6>
                                </div>
                                <div class="card-body">
                                    <p class="small mb-2">
                                        <strong>Budget Types:</strong>
                                    </p>
                                    <ul class="small mb-3">
                                        <li><strong>Income:</strong> Revenue (4000) & Other Income (8000)</li>
                                        <li><strong>Expense:</strong> Direct Costs (5000) & Expenses (6000)</li>
                                    </ul>
                                    <p class="small mb-2">
                                        <strong>Workflow:</strong>
                                    </p>
                                    <ol class="small mb-0">
                                        <li>Create budget as draft</li>
                                        <li>Submit for approval</li>
                                        <li>Admin reviews and approves</li>
                                        <li>Track actual vs budget</li>
                                    </ol>
                                </div>
                            </div>

                            <!-- Previous Year Budget -->
                            <div class="card" id="previousBudgetCard" style="display: none;">
                                <div class="card-header bg-warning text-white">
                                    <h6 class="mb-0"><i class="bi bi-clock-history"></i> Previous Year Budget</h6>
                                </div>
                                <div class="card-body">
                                    <div id="previousBudgetInfo">
                                        <p class="small mb-2">No previous budget data available</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Stats -->
                            <div class="card mt-3">
                                <div class="card-header">
                                    <h6 class="mb-0"><i class="bi bi-graph-up"></i> Current Year Summary</h6>
                                </div>
                                <div class="card-body" id="currentYearSummary">
                                    <div class="text-center">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="text-muted small mt-2">Loading summary...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load eligible ledgers
        loadEligibleLedgers: function() {
            TempleAPI.get('/budgets/eligible-ledgers')
                .done(function(response) {
                    if (response.success) {
                        BudgetsCreatePage.eligibleLedgers = response.data;
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load eligible ledgers', 'error');
                });
        },
        
        // Load current year summary
        loadCurrentYearSummary: function() {
            TempleAPI.get('/budgets', { per_page: 100 })
                .done(function(response) {
                    if (response.success) {
                        let totalIncome = 0;
                        let totalExpense = 0;
                        let approvedCount = 0;
                        let draftCount = 0;
                        
                        $.each(response.data.data, function(i, budget) {
                            if (budget.budget_type === 'INCOME') {
                                totalIncome += parseFloat(budget.budget_amount);
                            } else {
                                totalExpense += parseFloat(budget.budget_amount);
                            }
                            
                            if (budget.status === 'APPROVED') approvedCount++;
                            if (budget.status === 'DRAFT') draftCount++;
                        });
                        
                        const html = `
                            <div class="small">
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Total Income:</span>
                                    <strong class="text-success">${TempleCore.formatCurrency(totalIncome)}</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Total Expense:</span>
                                    <strong class="text-danger">${TempleCore.formatCurrency(totalExpense)}</strong>
                                </div>
                                <hr>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Net Budget:</span>
                                    <strong class="${totalIncome - totalExpense >= 0 ? 'text-success' : 'text-danger'}">
                                        ${TempleCore.formatCurrency(totalIncome - totalExpense)}
                                    </strong>
                                </div>
                                <hr>
                                <div class="d-flex justify-content-between mb-1">
                                    <span>Approved:</span>
                                    <span class="badge bg-success">${approvedCount}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Draft:</span>
                                    <span class="badge bg-secondary">${draftCount}</span>
                                </div>
                            </div>
                        `;
                        
                        $('#currentYearSummary').html(html);
                    }
                })
                .fail(function() {
                    $('#currentYearSummary').html('<p class="text-muted small">Unable to load summary</p>');
                });
        },
        
        // Update ledger dropdown based on group
        updateLedgerDropdown: function(groupCode) {
            if (!groupCode) {
                $('#ledgerId').prop('disabled', true).html('<option value="">Select Group First</option>');
                $('#budgetType').val('');
                return;
            }
            
            // Set budget type based on group
            const budgetType = (groupCode === '4000' || groupCode === '8000') ? 'INCOME' : 'EXPENSE';
            $('#budgetType').val(budgetType);
            
            // Update ledgers dropdown
            const ledgers = this.eligibleLedgers[groupCode] || [];
            
            if (ledgers.length > 0) {
                let options = '<option value="">Select Ledger</option>';
                $.each(ledgers, function(i, ledger) {
                    options += `<option value="${ledger.id}">${ledger.name}</option>`;
                });
                $('#ledgerId').prop('disabled', false).html(options);
            } else {
                $('#ledgerId').prop('disabled', true).html('<option value="">No ledgers available for this group</option>');
            }
        },
        
        // Check for previous budget
        checkPreviousBudget: function(ledgerId) {
            if (!ledgerId) return;
            
            $('#previousBudgetCard').show();
            $('#previousBudgetInfo').html(`
                <div class="small">
                    <p class="mb-2">Checking previous budget...</p>
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);
            
            // Check if this ledger has any budget in the system
            TempleAPI.get('/budgets', { 
                per_page: 1,
                ledger_id: ledgerId 
            })
            .done(function(response) {
                if (response.success && response.data.data.length > 0) {
                    const prevBudget = response.data.data[0];
                    $('#previousBudgetInfo').html(`
                        <div class="small">
                            <div class="d-flex justify-content-between mb-2">
                                <span>Amount:</span>
                                <strong>${TempleCore.formatCurrency(prevBudget.budget_amount)}</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Status:</span>
                                <span class="badge bg-${prevBudget.status === 'APPROVED' ? 'success' : 'secondary'}">
                                    ${prevBudget.status}
                                </span>
                            </div>
                            ${prevBudget.utilization_percentage ? `
                                <div class="d-flex justify-content-between">
                                    <span>Utilization:</span>
                                    <strong>${prevBudget.utilization_percentage}%</strong>
                                </div>
                            ` : ''}
                        </div>
                    `);
                } else {
                    $('#previousBudgetInfo').html(`
                        <div class="small">
                            <p class="text-muted">No previous budget data found for this ledger</p>
                        </div>
                    `);
                }
            })
            .fail(function() {
                $('#previousBudgetInfo').html(`
                    <div class="small">
                        <p class="text-muted">Unable to load previous budget data</p>
                    </div>
                `);
            });
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Group change
            $('#groupCode').on('change', function() {
                self.updateLedgerDropdown($(this).val());
            });
            
            // Ledger change
            $('#ledgerId').on('change', function() {
                const ledgerId = $(this).val();
                if (ledgerId) {
                    self.checkPreviousBudget(ledgerId);
                } else {
                    $('#previousBudgetCard').hide();
                }
            });
            
            // Save as draft
            $('#saveDraftBtn').on('click', function() {
                self.saveBudget(false);
            });
            
            // Save and submit
            $('#saveSubmitBtn').on('click', function() {
                self.saveBudget(true);
            });
            
            // Form validation
            $('#budgetAmount').on('input', function() {
                const value = $(this).val();
                if (value && value < 0) {
                    $(this).val(0);
                }
            });
        },
        
        // Save budget
        saveBudget: function(submitForApproval) {
            const ledgerId = $('#ledgerId').val();
            const budgetAmount = $('#budgetAmount').val();
            const budgetType = $('#budgetType').val();
            
            // Validation
            if (!ledgerId) {
                TempleCore.showToast('Please select ledger', 'warning');
                return;
            }
            if (!budgetAmount || budgetAmount <= 0) {
                TempleCore.showToast('Please enter valid budget amount', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            const data = {
                ledger_id: ledgerId,
                budget_amount: budgetAmount,
                budget_type: budgetType,
            };
            
            TempleAPI.post('/budgets', data)
                .done(function(response) {
                    if (response.success) {
                        const budgetId = response.data.id;
                        
                        if (submitForApproval) {
                            // Submit for approval
                            TempleAPI.post('/budgets/' + budgetId + '/submit', {})
                                .done(function(submitResponse) {
                                    if (submitResponse.success) {
                                        TempleCore.showToast('Budget created and submitted for approval', 'success');
                                        TempleRouter.navigate('budgets');
                                    } else {
                                        TempleCore.showToast('Budget created but failed to submit', 'warning');
                                        TempleRouter.navigate('budgets');
                                    }
                                })
                                .fail(function() {
                                    TempleCore.showToast('Budget created but failed to submit', 'warning');
                                    TempleRouter.navigate('budgets');
                                });
                        } else {
                            TempleCore.showToast('Budget saved as draft', 'success');
                            TempleRouter.navigate('budgets');
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create budget', 'error');
                    }
                })
                .fail(function(xhr) {
                    if (xhr.status === 422) {
                        const errors = xhr.responseJSON.errors;
                        let message = 'Validation error: ';
                        $.each(errors, function(field, messages) {
                            message += messages.join(', ');
                        });
                        TempleCore.showToast(message, 'error');
                    } else {
                        TempleCore.showToast('An error occurred while creating budget', 'error');
                    }
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        }
    };
    
})(jQuery, window);