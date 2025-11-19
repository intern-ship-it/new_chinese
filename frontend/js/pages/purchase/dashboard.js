// js/pages/purchase/dashboard.js
// Purchase Dashboard Page - FIXED

(function($, window) {
    'use strict';
    
    window.PurchaseDashboardPage = {
        init: function(params) {
            // When called from router, params is an object
            // When used as a widget, it would be a string containerId
            if (typeof params === 'string') {
                // Widget mode
                this.containerId = params;
                this.isWidget = true;
            } else {
                // Page mode (called from router)
                this.containerId = 'page-container';
                this.isWidget = false;
                this.params = params || {};
            }
            
            this.render();
            this.loadData();
            this.bindEvents();
        },
        
        render: function() {
            let html = '';
            
            if (this.isWidget) {
                // Widget mode - compact view
                html = this.renderWidget();
            } else {
                // Full page mode
                html = this.renderFullPage();
            }
            
            $('#' + this.containerId).html(html);
        },
        
        renderFullPage: function() {
            return `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col">
                            <h2 class="page-title">
                                <i class="bi bi-cart-check"></i> Purchase Dashboard
                            </h2>
                        </div>
                        <div class="col-auto">
                            <div class="btn-group">
                                <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/requests/create'); return false;">
                                    <i class="bi bi-plus-circle"></i> New PR
                                </button>
                                <button class="btn btn-success" onclick="TempleRouter.navigate('purchase/orders/create'); return false;">
                                    <i class="bi bi-plus-circle"></i> New PO
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Stats Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-2">Total PRs</h6>
                                            <h3 class="mb-0" id="totalPRs">0</h3>
                                        </div>
                                        <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                                            <i class="bi bi-file-text"></i>
                                        </div>
                                    </div>
                                    <small class="text-success"><i class="bi bi-arrow-up"></i> <span id="prChange">0%</span> from last month</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-2">Total POs</h6>
                                            <h3 class="mb-0" id="totalPOs">0</h3>
                                        </div>
                                        <div class="stat-icon bg-success bg-opacity-10 text-success">
                                            <i class="bi bi-cart"></i>
                                        </div>
                                    </div>
                                    <small class="text-success"><i class="bi bi-arrow-up"></i> <span id="poChange">0%</span> from last month</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-2">Total Spend</h6>
                                            <h3 class="mb-0" id="totalSpend">0.00</h3>
                                        </div>
                                        <div class="stat-icon bg-info bg-opacity-10 text-info">
                                            <i class="bi bi-currency-rupee"></i>
                                        </div>
                                    </div>
                                    <small class="text-danger"><i class="bi bi-arrow-down"></i> <span id="spendChange">0%</span> from last month</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="text-muted mb-2">Outstanding</h6>
                                            <h3 class="mb-0 text-danger" id="outstanding">0.00</h3>
                                        </div>
                                        <div class="stat-icon bg-danger bg-opacity-10 text-danger">
                                            <i class="bi bi-exclamation-triangle"></i>
                                        </div>
                                    </div>
                                    <small class="text-muted"><span id="overdueCount">0</span> overdue invoices</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <!-- Recent Purchase Requests -->
                        <div class="col-md-6 mb-4">
                            <div class="card">
                                <div class="card-header">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="mb-0">Recent Purchase Requests</h5>
                                        <a href="#" onclick="TempleRouter.navigate('purchase/requests'); return false;" class="btn btn-sm btn-link">
                                            View All
                                        </a>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div id="recentPRs">
                                        <div class="text-center py-3">
                                            <div class="spinner-border spinner-border-sm" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Recent Purchase Orders -->
                        <div class="col-md-6 mb-4">
                            <div class="card">
                                <div class="card-header">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="mb-0">Recent Purchase Orders</h5>
                                        <a href="#" onclick="TempleRouter.navigate('purchase/orders'); return false;" class="btn btn-sm btn-link">
                                            View All
                                        </a>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div id="recentPOs">
                                        <div class="text-center py-3">
                                            <div class="spinner-border spinner-border-sm" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pending Approvals and Charts -->
                    <div class="row">
                        <!-- Pending Approvals -->
                        <div class="col-md-4 mb-4">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">Pending Approvals</h5>
                                </div>
                                <div class="card-body">
                                    <div id="pendingApprovals">
                                        <div class="text-center py-3">
                                            <div class="spinner-border spinner-border-sm" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Vendor Performance -->
                        <div class="col-md-4 mb-4">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">Top Vendors</h5>
                                </div>
                                <div class="card-body">
                                    <div id="topVendors">
                                        <div class="text-center py-3">
                                            <div class="spinner-border spinner-border-sm" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Category Spending -->
                        <div class="col-md-4 mb-4">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">Spending by Category</h5>
                                </div>
                                <div class="card-body">
                                    <canvas id="categoryChart" style="max-height: 200px;"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderWidget: function() {
            return `
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="bi bi-cart-check"></i> Purchase Overview
                            </h6>
                            <a href="#" onclick="TempleRouter.navigate('purchase/dashboard'); return false;" class="text-white">
                                <i class="bi bi-arrow-right-circle"></i>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="purchaseWidgetContent">
                            <div class="text-center py-3">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        loadData: function() {
            const self = this;
            
            // Simulate API call - replace with actual API
            setTimeout(function() {
                const mockData = {
                    total_prs: 45,
                    pr_change: 12,
                    total_pos: 38,
                    po_change: 8,
                    total_spend: 125000.50,
                    spend_change: -5,
                    outstanding: 45000,
                    overdue_count: 3,
                    recent_prs: [
                        { id: 'PR-2024-001', date: '2024-01-15', vendor: 'ABC Suppliers', amount: 5000, status: 'Pending' },
                        { id: 'PR-2024-002', date: '2024-01-14', vendor: 'XYZ Corp', amount: 3500, status: 'Approved' }
                    ],
                    recent_pos: [
                        { id: 'PO-2024-001', date: '2024-01-15', vendor: 'ABC Suppliers', amount: 5000, status: 'Draft' },
                        { id: 'PO-2024-002', date: '2024-01-14', vendor: 'XYZ Corp', amount: 3500, status: 'Sent' }
                    ]
                };
                
                self.displayData(mockData);
            }, 1000);
        },
        
        displayData: function(data) {
            const currency = TempleCore.getCurrency();
            
            if (this.isWidget) {
                // Update widget view
                let widgetHtml = `
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <div class="border rounded p-2">
                                <small class="text-muted d-block">Total POs</small>
                                <h5 class="mb-0">${data.total_pos}</h5>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border rounded p-2">
                                <small class="text-muted d-block">Outstanding</small>
                                <h5 class="mb-0 text-danger">${currency}${data.outstanding.toLocaleString()}</h5>
                            </div>
                        </div>
                    </div>
                    <div class="d-grid">
                        <button class="btn btn-sm btn-primary" onclick="TempleRouter.navigate('purchase/dashboard'); return false;">
                            View Dashboard
                        </button>
                    </div>
                `;
                $('#purchaseWidgetContent').html(widgetHtml);
            } else {
                // Update full dashboard
                $('#totalPRs').text(data.total_prs);
                $('#prChange').text(data.pr_change + '%');
                $('#totalPOs').text(data.total_pos);
                $('#poChange').text(data.po_change + '%');
                $('#totalSpend').text(currency + data.total_spend.toLocaleString());
                $('#spendChange').text(Math.abs(data.spend_change) + '%');
                $('#outstanding').text(currency + data.outstanding.toLocaleString());
                $('#overdueCount').text(data.overdue_count);
                
                // Render recent lists
                this.renderRecentPRs(data.recent_prs);
                this.renderRecentPOs(data.recent_pos);
                this.renderPendingApprovals();
                this.renderTopVendors();
                this.renderCategoryChart();
            }
        },
        
        renderRecentPRs: function(prs) {
            if (!prs || prs.length === 0) {
                $('#recentPRs').html('<p class="text-muted">No recent purchase requests</p>');
                return;
            }
            
            let html = '<div class="list-group">';
            $.each(prs, function(index, pr) {
                const statusBadge = pr.status === 'Approved' ? 'success' : 'warning';
                html += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${pr.id}</h6>
                                <small class="text-muted">${pr.vendor} • ${pr.date}</small>
                            </div>
                            <div class="text-end">
                                <div class="mb-1">${TempleCore.getCurrency()}${pr.amount.toLocaleString()}</div>
                                <span class="badge bg-${statusBadge}">${pr.status}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            $('#recentPRs').html(html);
        },
        
        renderRecentPOs: function(pos) {
            if (!pos || pos.length === 0) {
                $('#recentPOs').html('<p class="text-muted">No recent purchase orders</p>');
                return;
            }
            
            let html = '<div class="list-group">';
            $.each(pos, function(index, po) {
                const statusBadge = po.status === 'Sent' ? 'success' : 'secondary';
                html += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${po.id}</h6>
                                <small class="text-muted">${po.vendor} • ${po.date}</small>
                            </div>
                            <div class="text-end">
                                <div class="mb-1">${TempleCore.getCurrency()}${po.amount.toLocaleString()}</div>
                                <span class="badge bg-${statusBadge}">${po.status}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            $('#recentPOs').html(html);
        },
        
        renderPendingApprovals: function() {
            const html = `
                <div class="list-group">
                    <div class="list-group-item list-group-item-action">
                        <div class="d-flex justify-content-between">
                            <span>PR-2024-003</span>
                            <span class="badge bg-warning">Pending</span>
                        </div>
                    </div>
                    <div class="list-group-item list-group-item-action">
                        <div class="d-flex justify-content-between">
                            <span>PO-2024-003</span>
                            <span class="badge bg-warning">Pending</span>
                        </div>
                    </div>
                </div>
            `;
            $('#pendingApprovals').html(html);
        },
        
        renderTopVendors: function() {
            const html = `
                <div class="list-group">
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between">
                            <span>ABC Suppliers</span>
                            <strong>${TempleCore.getCurrency()}45,000</strong>
                        </div>
                    </div>
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between">
                            <span>XYZ Corp</span>
                            <strong>${TempleCore.getCurrency()}32,000</strong>
                        </div>
                    </div>
                </div>
            `;
            $('#topVendors').html(html);
        },
        
        renderCategoryChart: function() {
            const canvas = document.getElementById('categoryChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Simple chart rendering (you would use Chart.js in production)
            ctx.fillStyle = 'rgba(var(--primary-rgb), 0.8)';
            ctx.fillRect(10, 10, 100, 30);
            ctx.fillStyle = 'rgba(var(--secondary-rgb), 0.8)';
            ctx.fillRect(10, 50, 80, 30);
            ctx.fillStyle = 'rgba(var(--primary-rgb), 0.5)';
            ctx.fillRect(10, 90, 60, 30);
        },
        
        bindEvents: function() {
            // Any additional event bindings
        },
        
        refresh: function() {
            this.loadData();
        }
    };
    
})(jQuery, window);