// js/pages/budgets/bulk-create.js
// Bulk Create Budgets Page

(function($, window) {
    'use strict';
    
    window.BudgetsBulkCreatePage = {
        eligibleLedgers: {},
        budgetEntries: [],
        
        // Initialize page
        init: function() {
            this.render();
            this.loadEligibleLedgers();
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
                                    <i class="bi bi-file-earmark-plus"></i> Bulk Create Budgets
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('budgets'); return false;">Budgets</a></li>
                                        <li class="breadcrumb-item active">Bulk Create</li>
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

                    <!-- Info Card -->
                    <div class="alert alert-info mb-4">
                        <i class="bi bi-info-circle"></i> <strong>Bulk Budget Creation</strong>
                        <p class="mb-0 mt-1">Select multiple ledgers across different groups and set their budget amounts for the current financial year.</p>
                    </div>

                    <!-- Group Selection Tabs -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#group4000">
                                        Revenue (4000)
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#group5000">
                                        Direct Costs (5000)
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#group6000">
                                        Expenses (6000)
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#group8000">
                                        Other Income (8000)
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <!-- Revenue Tab -->
                                <div class="tab-pane fade show active" id="group4000">
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle"></i> Revenue budgets are INCOME type budgets
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th width="50">
                                                        <input type="checkbox" class="form-check-input group-select-all" data-group="4000">
                                                    </th>
                                                    <th>Ledger Name</th>
                                                    <th width="200">Budget Amount (${currencySymbol})</th>
                                                    <th width="150">Previous Budget</th>
                                                    <th width="100">% Change</th>
                                                </tr>
                                            </thead>
                                            <tbody id="ledgers4000">
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted">
                                                        Loading ledgers...
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Direct Costs Tab -->
                                <div class="tab-pane fade" id="group5000">
                                    <div class="alert alert-warning">
                                        <i class="bi bi-info-circle"></i> Direct Cost budgets are EXPENSE type budgets
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th width="50">
                                                        <input type="checkbox" class="form-check-input group-select-all" data-group="5000">
                                                    </th>
                                                    <th>Ledger Name</th>
                                                    <th width="200">Budget Amount (${currencySymbol})</th>
                                                    <th width="150">Previous Budget</th>
                                                    <th width="100">% Change</th>
                                                </tr>
                                            </thead>
                                            <tbody id="ledgers5000">
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted">
                                                        Loading ledgers...
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Expenses Tab -->
                                <div class="tab-pane fade" id="group6000">
                                    <div class="alert alert-warning">
                                        <i class="bi bi-info-circle"></i> Expense budgets are EXPENSE type budgets
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th width="50">
                                                        <input type="checkbox" class="form-check-input group-select-all" data-group="6000">
                                                    </th>
                                                    <th>Ledger Name</th>
                                                    <th width="200">Budget Amount (${currencySymbol})</th>
                                                    <th width="150">Previous Budget</th>
                                                    <th width="100">% Change</th>
                                                </tr>
                                            </thead>
                                            <tbody id="ledgers6000">
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted">
                                                        Loading ledgers...
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Other Income Tab -->
                                <div class="tab-pane fade" id="group8000">
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle"></i> Other Income budgets are INCOME type budgets
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th width="50">
                                                        <input type="checkbox" class="form-check-input group-select-all" data-group="8000">
                                                    </th>
                                                    <th>Ledger Name</th>
                                                    <th width="200">Budget Amount (${currencySymbol})</th>
                                                    <th width="150">Previous Budget</th>
                                                    <th width="100">% Change</th>
                                                </tr>
                                            </thead>
                                            <tbody id="ledgers8000">
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted">
                                                        Loading ledgers...
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Card -->
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">Budget Summary</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h6>Total Income Budget</h6>
                                        <h4 class="text-success" id="totalIncomeBudget">${currencySymbol} 0.00</h4>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h6>Total Expense Budget</h6>
                                        <h4 class="text-danger" id="totalExpenseBudget">${currencySymbol} 0.00</h4>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h6>Net Budget</h6>
                                        <h4 id="netBudget">${currencySymbol} 0.00</h4>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h6>Selected Ledgers</h6>
                                        <h4 id="selectedCount">0</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary" id="saveBudgetsBtn" disabled>
                                <i class="bi bi-save"></i> Save All Budgets
                            </button>
                            <button class="btn btn-success" id="applyPercentageBtn">
                                <i class="bi bi-percent"></i> Apply % Increase
                            </button>
                            <button class="btn btn-info" id="loadPreviousBtn">
                                <i class="bi bi-clock-history"></i> Load Previous Budgets
                            </button>
                            <button class="btn btn-warning" id="clearAllBtn">
                                <i class="bi bi-x-circle"></i> Clear All
                            </button>
                            <button class="btn btn-secondary" onclick="TempleRouter.navigate('budgets');">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Percentage Increase Modal -->
                <div class="modal fade" id="percentageModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Apply Percentage Increase</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Percentage Increase/Decrease</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" id="percentageValue" step="0.01" placeholder="Enter percentage (e.g., 10 for 10% increase, -5 for 5% decrease)">
                                        <span class="input-group-text">%</span>
                                    </div>
                                    <small class="text-muted">This will apply to all selected ledgers with existing amounts</small>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="applyPercentageConfirm">Apply</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load eligible ledgers
        loadEligibleLedgers: function() {
            const self = this;
            
            TempleAPI.get('/budgets/eligible-ledgers')
                .done(function(response) {
                    if (response.success) {
                        self.eligibleLedgers = response.data;
                        self.renderLedgerTables();
                        self.loadExistingBudgets();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load eligible ledgers', 'error');
                });
        },
        
        // Load existing budgets for reference
        loadExistingBudgets: function() {
            const self = this;
            
            // Load current year budgets to show as reference
            TempleAPI.get('/budgets', { per_page: 200 })
                .done(function(response) {
                    if (response.success && response.data.data) {
                        $.each(response.data.data, function(i, budget) {
                            // Show existing budget amount as previous budget
                            const $prevBudget = $(`.last-year-amount[data-ledger-id="${budget.ledger_id}"]`);
                            if ($prevBudget.length) {
                                $prevBudget.text(TempleCore.formatCurrency(budget.budget_amount));
                                $prevBudget.data('amount', budget.budget_amount);
                            }
                        });
                    }
                });
        },
        
        // Render ledger tables
        renderLedgerTables: function() {
            const self = this;
            const groups = ['4000', '5000', '6000', '8000'];
            
            $.each(groups, function(i, groupCode) {
                const ledgers = self.eligibleLedgers[groupCode] || [];
                let html = '';
                
                if (ledgers.length > 0) {
                    $.each(ledgers, function(j, ledger) {
                        html += `
                            <tr>
                                <td>
                                    <input type="checkbox" class="form-check-input ledger-select" 
                                        data-ledger-id="${ledger.id}" 
                                        data-ledger-name="${ledger.name}"
                                        data-group="${groupCode}">
                                </td>
                                <td>${ledger.name}</td>
                                <td>
                                    <input type="number" class="form-control form-control-sm budget-amount" 
                                        data-ledger-id="${ledger.id}"
                                        data-group="${groupCode}"
                                        step="0.01" min="0" disabled>
                                </td>
                                <td class="last-year-amount" data-ledger-id="${ledger.id}">-</td>
                                <td class="percentage-change" data-ledger-id="${ledger.id}">-</td>
                            </tr>
                        `;
                    });
                } else {
                    html = `
                        <tr>
                            <td colspan="5" class="text-center text-muted">
                                No ledgers available for this group
                            </td>
                        </tr>
                    `;
                }
                
                $('#ledgers' + groupCode).html(html);
            });
        },
        
        // Calculate summary
        calculateSummary: function() {
            let totalIncome = 0;
            let totalExpense = 0;
            let selectedCount = 0;
            
            $('.ledger-select:checked').each(function() {
                const $checkbox = $(this);
                const ledgerId = $checkbox.data('ledger-id');
                const groupCode = $checkbox.data('group');
                const amount = parseFloat($(`.budget-amount[data-ledger-id="${ledgerId}"]`).val()) || 0;
                
                if (amount > 0) {
                    selectedCount++;
                    
                    if (groupCode === '4000' || groupCode === '8000') {
                        totalIncome += amount;
                    } else {
                        totalExpense += amount;
                    }
                }
            });
            
            $('#totalIncomeBudget').text(TempleCore.formatCurrency(totalIncome));
            $('#totalExpenseBudget').text(TempleCore.formatCurrency(totalExpense));
            
            const netBudget = totalIncome - totalExpense;
            $('#netBudget').text(TempleCore.formatCurrency(netBudget))
                .removeClass('text-success text-danger')
                .addClass(netBudget >= 0 ? 'text-success' : 'text-danger');
            
            $('#selectedCount').text(selectedCount);
            
            // Enable/disable save button
            $('#saveBudgetsBtn').prop('disabled', selectedCount === 0);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Ledger selection
            $(document).on('change', '.ledger-select', function() {
                const $checkbox = $(this);
                const ledgerId = $checkbox.data('ledger-id');
                const $amountField = $(`.budget-amount[data-ledger-id="${ledgerId}"]`);
                
                if ($checkbox.prop('checked')) {
                    $amountField.prop('disabled', false).focus();
                } else {
                    $amountField.prop('disabled', true).val('');
                }
                
                self.calculateSummary();
            });
            
            // Group select all
            $('.group-select-all').on('change', function() {
                const $checkbox = $(this);
                const groupCode = $checkbox.data('group');
                const isChecked = $checkbox.prop('checked');
                
                $(`.ledger-select[data-group="${groupCode}"]`).prop('checked', isChecked).trigger('change');
            });
            
            // Budget amount change
            $(document).on('input', '.budget-amount', function() {
                const $field = $(this);
                const ledgerId = $field.data('ledger-id');
                const amount = parseFloat($field.val()) || 0;
                const prevAmount = parseFloat($(`.last-year-amount[data-ledger-id="${ledgerId}"]`).data('amount')) || 0;
                
                if (prevAmount > 0 && amount > 0) {
                    const change = ((amount - prevAmount) / prevAmount * 100).toFixed(2);
                    $(`.percentage-change[data-ledger-id="${ledgerId}"]`).text(change + '%')
                        .removeClass('text-success text-danger')
                        .addClass(change >= 0 ? 'text-success' : 'text-danger');
                } else {
                    $(`.percentage-change[data-ledger-id="${ledgerId}"]`).text('-');
                }
                
                self.calculateSummary();
            });
            
            // Load previous budgets
            $('#loadPreviousBtn').on('click', function() {
                self.loadPreviousBudgets();
            });
            
            // Apply percentage
            $('#applyPercentageBtn').on('click', function() {
                $('#percentageValue').val('');
                new bootstrap.Modal(document.getElementById('percentageModal')).show();
            });
            
            // Apply percentage confirm
            $('#applyPercentageConfirm').on('click', function() {
                self.applyPercentageIncrease();
            });
            
            // Clear all
            $('#clearAllBtn').on('click', function() {
                TempleCore.showConfirm(
                    'Clear All',
                    'Are you sure you want to clear all budget amounts?',
                    function() {
                        $('.ledger-select').prop('checked', false);
                        $('.budget-amount').val('').prop('disabled', true);
                        $('.percentage-change').text('-').removeClass('text-success text-danger');
                        self.calculateSummary();
                    }
                );
            });
            
            // Save budgets
            $('#saveBudgetsBtn').on('click', function() {
                self.saveBudgets();
            });
        },
        
        // Load previous budgets (from existing data)
        loadPreviousBudgets: function() {
            let loadedCount = 0;
            
            $('.last-year-amount').each(function() {
                const $cell = $(this);
                const ledgerId = $cell.data('ledger-id');
                const prevAmount = parseFloat($cell.data('amount')) || 0;
                
                if (prevAmount > 0) {
                    const $checkbox = $(`.ledger-select[data-ledger-id="${ledgerId}"]`);
                    const $amountField = $(`.budget-amount[data-ledger-id="${ledgerId}"]`);
                    
                    $checkbox.prop('checked', true);
                    $amountField.prop('disabled', false).val(prevAmount);
                    loadedCount++;
                }
            });
            
            this.calculateSummary();
            
            if (loadedCount > 0) {
                TempleCore.showToast(`Loaded ${loadedCount} previous budgets`, 'success');
            } else {
                TempleCore.showToast('No previous budgets found to load', 'info');
            }
        },
        
        // Apply percentage increase
        applyPercentageIncrease: function() {
            const percentage = parseFloat($('#percentageValue').val());
            
            if (isNaN(percentage)) {
                TempleCore.showToast('Please enter a valid percentage', 'warning');
                return;
            }
            
            let appliedCount = 0;
            $('.ledger-select:checked').each(function() {
                const ledgerId = $(this).data('ledger-id');
                const $amountField = $(`.budget-amount[data-ledger-id="${ledgerId}"]`);
                const currentAmount = parseFloat($amountField.val()) || 0;
                
                if (currentAmount > 0) {
                    const newAmount = currentAmount * (1 + percentage / 100);
                    $amountField.val(newAmount.toFixed(2)).trigger('input');
                    appliedCount++;
                }
            });
            
            bootstrap.Modal.getInstance(document.getElementById('percentageModal')).hide();
            
            if (appliedCount > 0) {
                this.calculateSummary();
                TempleCore.showToast(`Applied ${percentage}% to ${appliedCount} budgets`, 'success');
            } else {
                TempleCore.showToast('No budgets with amounts to apply percentage', 'warning');
            }
        },
        
        // Save budgets
        saveBudgets: function() {
            const budgets = [];
            $('.ledger-select:checked').each(function() {
                const ledgerId = $(this).data('ledger-id');
                const amount = parseFloat($(`.budget-amount[data-ledger-id="${ledgerId}"]`).val()) || 0;
                
                if (amount > 0) {
                    budgets.push({
                        ledger_id: ledgerId,
                        budget_amount: amount
                    });
                }
            });
            
            if (budgets.length === 0) {
                TempleCore.showToast('No valid budgets to save', 'warning');
                return;
            }
            
            TempleCore.showConfirm(
                'Save Budgets',
                `Are you sure you want to save ${budgets.length} budgets?`,
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/budgets/bulk', {
                        budgets: budgets
                    })
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast(response.message || 'Budgets saved successfully', 'success');
                            TempleRouter.navigate('budgets');
                        } else {
                            TempleCore.showToast(response.message || 'Failed to save budgets', 'error');
                        }
                    })
                    .fail(function() {
                        TempleCore.showToast('An error occurred while saving budgets', 'error');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
                }
            );
        }
    };
    
})(jQuery, window);