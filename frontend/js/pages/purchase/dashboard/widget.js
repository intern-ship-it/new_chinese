// js/pages/purchase/dashboard/widget.js
// Purchase module dashboard widget

(function($, window) {
    'use strict';
    
    window.PurchaseDashboardWidget = {
        init: function(containerId) {
            this.containerId = containerId || 'purchaseWidget';
            this.render();
            this.loadData();
        },
        
        render: function() {
            const html = `
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="bi bi-cart-check"></i> Purchase Overview
                            </h6>
                            <a href="#" onclick="TempleRouter.navigate('purchase'); return false;" class="text-white">
                                <i class="bi bi-arrow-right-circle"></i>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Loading State -->
                        <div id="purchaseWidgetLoading" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        
                        <!-- Content -->
                        <div id="purchaseWidgetContent" style="display: none;">
                            <!-- Summary Stats -->
                            <div class="row g-2 mb-3">
                                <div class="col-6">
                                    <div class="border rounded p-2">
                                        <small class="text-muted d-block">Today's POs</small>
                                        <h5 class="mb-0" id="widgetTodayPOs">0</h5>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-2">
                                        <small class="text-muted d-block">Today's Value</small>
                                        <h5 class="mb-0" id="widgetTodayValue">0.00</h5>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Status Overview -->
                            <div class="mb-3">
                                <h6 class="text-muted mb-2">Purchase Orders Status</h6>
                                <div class="progress mb-2" style="height: 25px;">
                                    <div class="progress-bar bg-warning" id="draftBar" role="progressbar" style="width: 0%">
                                        <span id="draftCount">0</span> Draft
                                    </div>
                                    <div class="progress-bar bg-info" id="pendingBar" role="progressbar" style="width: 0%">
                                        <span id="pendingCount">0</span> Pending
                                    </div>
                                    <div class="progress-bar bg-success" id="approvedBar" role="progressbar" style="width: 0%">
                                        <span id="approvedCount">0</span> Approved
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Payment Status -->
                            <div class="mb-3">
                                <h6 class="text-muted mb-2">Payment Status</h6>
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span>Total Outstanding:</span>
                                    <strong id="widgetOutstanding" class="text-danger">0.00</strong>
                                </div>
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span>Due Today:</span>
                                    <strong id="widgetDueToday" class="text-warning">0.00</strong>
                                </div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>Overdue:</span>
                                    <strong id="widgetOverdue" class="text-danger">0.00</strong>
                                </div>
                            </div>
                            
                            <!-- Recent Activity -->
                            <div>
                                <h6 class="text-muted mb-2">Recent Activity</h6>
                                <div id="widgetRecentActivity" class="small">
                                    <div class="text-center py-2">No recent activity</div>
                                </div>
                            </div>
                            
                            <!-- Quick Actions -->
                            <div class="mt-3 pt-3 border-top">
                                <div class="row g-2">
                                    <div class="col-4">
                                        <button class="btn btn-sm btn-outline-primary w-100" onclick="TempleRouter.navigate('purchase/requests/create'); return false;">
                                            <i class="bi bi-plus"></i> PR
                                        </button>
                                    </div>
                                    <div class="col-4">
                                        <button class="btn btn-sm btn-outline-success w-100" onclick="TempleRouter.navigate('purchase/orders/create'); return false;">
                                            <i class="bi bi-plus"></i> PO
                                        </button>
                                    </div>
                                    <div class="col-4">
                                        <button class="btn btn-sm btn-outline-info w-100" onclick="TempleRouter.navigate('purchase/invoices/create'); return false;">
                                            <i class="bi bi-plus"></i> Invoice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Error State -->
                        <div id="purchaseWidgetError" class="text-center py-3" style="display: none;">
                            <i class="bi bi-exclamation-triangle text-warning fs-3"></i>
                            <p class="mt-2 mb-0">Failed to load data</p>
                            <button class="btn btn-sm btn-link" onclick="PurchaseDashboardWidget.loadData()">
                                <i class="bi bi-arrow-clockwise"></i> Retry
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            $('#' + this.containerId).html(html);
        },
        
        loadData: function() {
            const self = this;
            
            $('#purchaseWidgetLoading').show();
            $('#purchaseWidgetContent, #purchaseWidgetError').hide();
            
            TempleAPI.get('/purchase/dashboard/summary')
                .done(function(response) {
                    if (response.success) {
                        self.displayData(response.data);
                        $('#purchaseWidgetLoading').hide();
                        $('#purchaseWidgetContent').show();
                    } else {
                        self.showError();
                    }
                })
                .fail(function() {
                    self.showError();
                });
        },
        
        displayData: function(data) {
            const currency = TempleCore.formatCurrency(0).split('0')[0];
            
            // Today's stats
            $('#widgetTodayPOs').text(data.today_pos || 0);
            $('#widgetTodayValue').text(currency + (data.today_value || 0).toFixed(2));
            
            // PO Status
            const totalPOs = (data.draft_count || 0) + (data.pending_count || 0) + (data.approved_count || 0);
            if (totalPOs > 0) {
                const draftPercent = (data.draft_count / totalPOs * 100).toFixed(0);
                const pendingPercent = (data.pending_count / totalPOs * 100).toFixed(0);
                const approvedPercent = (data.approved_count / totalPOs * 100).toFixed(0);
                
                $('#draftBar').css('width', draftPercent + '%');
                $('#pendingBar').css('width', pendingPercent + '%');
                $('#approvedBar').css('width', approvedPercent + '%');
                
                $('#draftCount').text(data.draft_count || 0);
                $('#pendingCount').text(data.pending_count || 0);
                $('#approvedCount').text(data.approved_count || 0);
            }
            
            // Payment status
            $('#widgetOutstanding').text(currency + (data.total_outstanding || 0).toFixed(2));
            $('#widgetDueToday').text(currency + (data.due_today || 0).toFixed(2));
            $('#widgetOverdue').text(currency + (data.overdue || 0).toFixed(2));
            
            // Recent activity
            if (data.recent_activity && data.recent_activity.length > 0) {
                let activityHtml = '';
                $.each(data.recent_activity.slice(0, 3), function(index, activity) {
                    const icon = self.getActivityIcon(activity.type);
                    activityHtml += `
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi ${icon} me-2"></i>
                            <div class="flex-grow-1">
                                <div>${activity.description}</div>
                                <small class="text-muted">${activity.time_ago}</small>
                            </div>
                        </div>
                    `;
                });
                $('#widgetRecentActivity').html(activityHtml);
            }
        },
        
        getActivityIcon: function(type) {
            const icons = {
                'pr_created': 'bi-file-earmark-plus',
                'po_created': 'bi-cart-plus',
                'po_approved': 'bi-check-circle',
                'invoice_created': 'bi-receipt',
                'payment_made': 'bi-cash-coin',
                'grn_created': 'bi-box-seam'
            };
            return icons[type] || 'bi-circle';
        },
        
        showError: function() {
            $('#purchaseWidgetLoading').hide();
            $('#purchaseWidgetContent').hide();
            $('#purchaseWidgetError').show();
        },
        
        refresh: function() {
            this.loadData();
        }
    };
    
})(jQuery, window);