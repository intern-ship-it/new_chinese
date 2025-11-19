// js/pages/accounts/year-end-closing/index.js
// Year End Closing Page

(function($, window) {
    'use strict';
    
    window.AccountsYearEndClosingPage = {
        summary: null,
        progressInterval: null,
        
        // Initialize page
        init: function() {
            this.render();
            this.loadSummary();
            this.bindEvents();
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-12">
                            <h2 class="mb-0">
                                <i class="bi bi-calendar-x text-danger"></i> Year End Closing
                            </h2>
                            <p class="text-muted">Close the current accounting year and carry forward balances</p>
                        </div>
                    </div>
                    
                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading year end summary...</p>
                    </div>
                    
                    <!-- Summary Content -->
                    <div id="summaryContent" style="display: none;">
                        <!-- Warning Alert -->
                        <div class="alert alert-warning border-warning" role="alert">
                            <div class="d-flex align-items-center">
                                <i class="bi bi-exclamation-triangle-fill fs-3 me-3"></i>
                                <div>
                                    <h5 class="alert-heading mb-1">?? Important: This Action Cannot Be Undone!</h5>
                                    <p class="mb-0">Year end closing will permanently lock all entries for the current year and create a new accounting year. Please review the summary carefully before proceeding.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <!-- Current Year Card -->
                            <div class="col-md-6 mb-4">
                                <div class="card shadow-sm h-100">
                                    <div class="card-header bg-primary text-white">
                                        <h5 class="mb-0">
                                            <i class="bi bi-calendar-check"></i> Current Year (Closing)
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <label class="text-muted small">Period</label>
                                            <div class="fw-bold" id="currentYearPeriod">-</div>
                                        </div>
                                        <div class="mb-3">
                                            <label class="text-muted small">Status</label>
                                            <div>
                                                <span class="badge bg-success">Active</span>
                                                <i class="bi bi-arrow-right mx-2"></i>
                                                <span class="badge bg-danger">Will be Closed</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Next Year Card -->
                            <div class="col-md-6 mb-4">
                                <div class="card shadow-sm h-100">
                                    <div class="card-header bg-success text-white">
                                        <h5 class="mb-0">
                                            <i class="bi bi-calendar-plus"></i> Next Year (New)
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <label class="text-muted small">Period</label>
                                            <div class="fw-bold" id="nextYearPeriod">-</div>
                                        </div>
                                        <div class="mb-3">
                                            <label class="text-muted small">Status</label>
                                            <div>
                                                <span class="badge bg-success">Will be Created & Set Active</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Balance Sheet Summary -->
                        <div class="card shadow-sm mb-4">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-file-earmark-spreadsheet"></i> Balance Sheet Summary
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Account Type</th>
                                                <th class="text-end">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td><strong>Total Assets</strong></td>
                                                <td class="text-end" id="totalAssets">-</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Total Liabilities</strong></td>
                                                <td class="text-end" id="totalLiabilities">-</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Total Equity</strong></td>
                                                <td class="text-end" id="totalEquity">-</td>
                                            </tr>
                                            <tr class="table-info">
                                                <td><strong>Net Profit/(Loss)</strong></td>
                                                <td class="text-end fw-bold" id="netProfitLoss">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- P&L Transfer Information -->
                        <div class="card shadow-sm mb-4">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-arrow-left-right"></i> Profit & Loss Transfer
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info mb-0">
                                    <div class="d-flex align-items-start">
                                        <i class="bi bi-info-circle fs-4 me-3"></i>
                                        <div>
                                            <p class="mb-2">The net <strong id="plType">Profit/Loss</strong> of <strong id="plAmount">-</strong> will be transferred to:</p>
                                            <div class="card bg-white">
                                                <div class="card-body py-2">
                                                    <div class="d-flex align-items-center">
                                                        <i class="bi bi-folder text-primary fs-4 me-3"></i>
                                                        <div>
                                                            <div class="fw-bold" id="paLedgerName">-</div>
                                                            <small class="text-muted" id="paLedgerCode">-</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Ledger Statistics -->
                        <div class="card shadow-sm mb-4">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-graph-up"></i> Processing Summary
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <div class="p-3 bg-light rounded">
                                            <div class="fs-2 fw-bold text-primary" id="totalLedgers">-</div>
                                            <div class="text-muted">Total Ledgers</div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="p-3 bg-light rounded">
                                            <div class="fs-2 fw-bold text-success" id="ledgersWithBalance">-</div>
                                            <div class="text-muted">Ledgers with Balance</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="card shadow-sm mb-4">
                            <div class="card-body text-center py-4">
                                <button type="button" class="btn btn-lg btn-outline-secondary me-3" id="validateBtn">
                                    <i class="bi bi-check-circle"></i> Validate Prerequisites
                                </button>
                                <button type="button" class="btn btn-lg btn-danger" id="executeBtn">
                                    <i class="bi bi-calendar-x"></i> Execute Year End Closing
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Progress Modal -->
                    <div class="modal fade" id="progressModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content">
                                <div class="modal-header bg-primary text-white">
                                    <h5 class="modal-title">
                                        <i class="bi bi-hourglass-split"></i> Year End Closing in Progress
                                    </h5>
                                </div>
                                <div class="modal-body">
                                    <div class="text-center mb-4">
                                        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                                            <span class="visually-hidden">Processing...</span>
                                        </div>
                                        <p class="text-muted mb-0">Please do not close this window or navigate away</p>
                                    </div>
                                    
                                    <div class="progress mb-3" style="height: 30px;">
                                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                             role="progressbar" 
                                             id="progressBar"
                                             style="width: 0%">
                                            <span id="progressPercent">0%</span>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info mb-0">
                                        <small id="progressMessage">Initializing...</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Success Modal -->
                    <div class="modal fade" id="successModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered modal-lg">
                            <div class="modal-content">
                                <div class="modal-header bg-success text-white">
                                    <h5 class="modal-title">
                                        <i class="bi bi-check-circle"></i> Year End Closing Completed Successfully!
                                    </h5>
                                </div>
                                <div class="modal-body">
                                    <div class="text-center mb-4">
                                        <i class="bi bi-check-circle-fill text-success" style="font-size: 5rem;"></i>
                                        <h4 class="mt-3">Year End Closing Completed</h4>
                                        <p class="text-muted">All balances have been successfully transferred to the new year</p>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <div class="card bg-light">
                                                <div class="card-body">
                                                    <h6 class="text-muted mb-2">Closed Year</h6>
                                                    <div class="fw-bold" id="successOldYear">-</div>
                                                    <span class="badge bg-danger mt-2">Closed</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <div class="card bg-light">
                                                <div class="card-body">
                                                    <h6 class="text-muted mb-2">New Active Year</h6>
                                                    <div class="fw-bold" id="successNewYear">-</div>
                                                    <span class="badge bg-success mt-2">Active</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle"></i>
                                        <strong>Note:</strong> All entries for the closed year have been locked and cannot be modified.
                                        The system has automatically switched to the new accounting year.
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-primary" id="closeSuccessBtn">
                                        <i class="bi bi-speedometer2"></i> Go to Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load summary data
        loadSummary: function() {
            const self = this;
            
            TempleAPI.get('/accounts/year-end-closing/summary')
                .done(function(response) {
                    if (response.success) {
                        self.summary = response.data;
                        self.displaySummary();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load summary', 'error');
                    }
                })
                .fail(function(xhr) {
                    const error = xhr.responseJSON?.message || 'Error loading summary';
                    TempleCore.showToast(error, 'error');
                    $('#loadingState').html(`
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i> ${error}
                        </div>
                    `);
                });
        },
        
        // Display summary data
        displaySummary: function() {
            const data = this.summary;
            
            // Current Year
            $('#currentYearPeriod').text(data.current_year.period);
            
            // Next Year
            $('#nextYearPeriod').text(data.next_year.period);
            
            // Balance Sheet
            $('#totalAssets').text(TempleCore.formatCurrency(data.balance_sheet_summary.assets));
            $('#totalLiabilities').text(TempleCore.formatCurrency(data.balance_sheet_summary.liabilities));
            $('#totalEquity').text(TempleCore.formatCurrency(data.balance_sheet_summary.equity));
            
            const profitLoss = data.balance_sheet_summary.profit_loss;
            const plFormatted = TempleCore.formatCurrency(Math.abs(profitLoss));
            const plType = profitLoss >= 0 ? 'Profit' : 'Loss';
            const plClass = profitLoss >= 0 ? 'text-success' : 'text-danger';
            
            $('#netProfitLoss').html(`<span class="${plClass}">${plType}: ${plFormatted}</span>`);
            $('#plType').text(plType);
            $('#plAmount').html(`<span class="${plClass}">${plFormatted}</span>`);
            
            // P&L Ledger
            $('#paLedgerName').text(data.pa_ledger.name);
            $('#paLedgerCode').text('Code: ' + data.pa_ledger.code);
            
            // Ledger Counts
            $('#totalLedgers').text(data.ledger_counts.total);
            $('#ledgersWithBalance').text(data.ledger_counts.with_balance);
            
            // Show content
            $('#loadingState').hide();
            $('#summaryContent').fadeIn();
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Validate button
            $('#validateBtn').on('click', function() {
                self.validateClosing();
            });
            
            // Execute button
            $('#executeBtn').on('click', function() {
                self.confirmExecution();
            });
            
            // Close success modal
            $('#closeSuccessBtn').on('click', function() {
                bootstrap.Modal.getInstance(document.getElementById('successModal')).hide();
                TempleRouter.navigate('dashboard');
            });
        },
        
        // Validate closing
        validateClosing: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.post('/accounts/year-end-closing/validate')
                .done(function(response) {
                    TempleCore.showLoading(false);
                    
                    if (response.success) {
                        TempleCore.showToast('? All validations passed! Ready for year end closing.', 'success', 5000);
                    } else {
                        self.showValidationErrors(response.errors);
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showLoading(false);
                    
                    if (xhr.responseJSON?.errors) {
                        self.showValidationErrors(xhr.responseJSON.errors);
                    } else {
                        const error = xhr.responseJSON?.message || 'Validation failed';
                        TempleCore.showToast(error, 'error');
                    }
                });
        },
        
        // Show validation errors
        showValidationErrors: function(errors) {
            let errorHtml = '<ul class="mb-0">';
            errors.forEach(function(error) {
                errorHtml += `<li>${error}</li>`;
            });
            errorHtml += '</ul>';
            
            TempleCore.showConfirm(
                '? Validation Failed',
                `<div class="text-start">${errorHtml}</div>`,
                null,
                function() {
                    // Do nothing on cancel
                }
            );
        },
        
        // Confirm execution
        confirmExecution: function() {
            const self = this;
            const profitLoss = this.summary.balance_sheet_summary.profit_loss;
            const plType = profitLoss >= 0 ? 'Profit' : 'Loss';
            const plFormatted = TempleCore.formatCurrency(Math.abs(profitLoss));
            
            const message = `
                <div class="text-start">
                    <h5>Are you absolutely sure?</h5>
                    <p>This will:</p>
                    <ul>
                        <li>Close the current year: <strong>${this.summary.current_year.period}</strong></li>
                        <li>Create new year: <strong>${this.summary.next_year.period}</strong></li>
                        <li>Transfer ${plType}: <strong>${plFormatted}</strong> to <strong>${this.summary.pa_ledger.name}</strong></li>
                        <li>Lock all entries for the closed year (cannot be modified)</li>
                        <li>Carry forward ${this.summary.ledger_counts.with_balance} ledger balances</li>
                    </ul>
                    <div class="alert alert-danger mt-3">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <strong>Warning:</strong> This action cannot be undone!
                    </div>
                </div>
            `;
            
            TempleCore.showConfirm(
                '?? Execute Year End Closing',
                message,
                function() {
                    self.executeClosing();
                }
            );
        },
        
        // Execute closing
        executeClosing: function() {
            const self = this;
            
            // Show progress modal
            const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
            progressModal.show();
            
            // Start progress tracking
            this.startProgressTracking();
            
            // Execute year end closing
            TempleAPI.post('/accounts/year-end-closing/execute')
                .done(function(response) {
                    self.stopProgressTracking();
                    
                    if (response.success) {
                        setTimeout(function() {
                            progressModal.hide();
                            self.showSuccess(response.data);
                        }, 1000);
                    } else {
                        progressModal.hide();
                        TempleCore.showToast(response.message || 'Year end closing failed', 'error');
                    }
                })
                .fail(function(xhr) {
                    self.stopProgressTracking();
                    progressModal.hide();
                    
                    const error = xhr.responseJSON?.message || 'Error during year end closing';
                    TempleCore.showToast(error, 'error');
                });
        },
        
        // Start progress tracking
        startProgressTracking: function() {
            const self = this;
            
            this.progressInterval = setInterval(function() {
                TempleAPI.get('/accounts/year-end-closing/progress')
                    .done(function(response) {
                        if (response.success && response.data) {
                            const data = response.data;
                            
                            $('#progressBar').css('width', data.progress + '%');
                            $('#progressPercent').text(data.progress + '%');
                            $('#progressMessage').text(data.message);
                            
                            if (data.status === 'complete' || data.progress >= 100) {
                                self.stopProgressTracking();
                            }
                        }
                    });
            }, 1000); // Update every second
        },
        
        // Stop progress tracking
        stopProgressTracking: function() {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }
        },
        
        // Show success
        showSuccess: function(data) {
            $('#successOldYear').text(data.old_year.period);
            $('#successNewYear').text(data.new_year.period);
            
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
        }
    };
    
})(jQuery, window);