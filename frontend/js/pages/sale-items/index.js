// js/pages/sales/items/index.js
// Sale Items Listing Page with Filters and DataTable

(function($, window) {
    'use strict';
    
    // Use shared module
    if (!window.SalesSharedModule) {
        window.SalesSharedModule = {
            moduleId: 'sales',
            eventNamespace: 'sales',
            cssId: 'sales-css',
            cssPath: '/css/sales.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Sales CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Sales page registered: ${pageId}`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Sales page unregistered: ${pageId}`);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
                console.log('Sales module cleaned up');
            }
        };
    }
    
    window.SaleItemsPage = {
        dataTable: null,
        pageId: 'sale-item-list',
        eventNamespace: window.SalesSharedModule.eventNamespace,
        itemsData: [],
        categories: [],
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.SalesSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.loadCategories();
            this.bindEvents();
            this.loadData();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.SalesSharedModule.unregisterPage(this.pageId);
            
            $(document).off('.' + this.eventNamespace);
            $(window).off('.' + this.eventNamespace);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('*');
            }
            
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="sales-container">
                    <!-- Page Header -->
                     <div class="sales-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="sales-header-bg"></div>
                        <div class="container-fluid">
							<div class="row align-items-center">
								<div class="col-md-6">
									<h1 class="sales-card-title mb-2">
										<i class="bi bi-box-seam"></i> Sale Items
									</h1>
									<p class="sales-card-subtitle">Manage your temple sale items catalog</p>
								</div>
								<div class="col-md-6 text-md-end">
									<button class="sales-btn-primary" id="btnAddNew">
										<i class="bi bi-plus-circle"></i> Add New Item
									</button>
								</div>
							</div>
						</div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="sales-row">
                        <div class="sales-col sales-col-4">
                            <div class="sales-card">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-primary">
                                        <i class="bi bi-box-seam"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-label">Total Items</div>
                                        <div class="stat-value" id="totalItems">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="sales-col sales-col-4">
                            <div class="sales-card">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-success">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-label">Active Items</div>
                                        <div class="stat-value" id="activeItems">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="sales-col sales-col-4">
                            <div class="sales-card">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-warning">
                                        <i class="bi bi-box"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-label">With Inventory</div>
                                        <div class="stat-value" id="inventoryItems">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Card -->
                    <div class="sales-card">
                        <div class="sales-row">
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Category</label>
                                    <select class="sales-form-select" id="filterCategory">
                                        <option value="">All Categories</option>
                                    </select>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Sale Type</label>
                                    <select class="sales-form-select" id="filterSaleType">
                                        <option value="">All Types</option>
                                        <option value="General">General</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="Token">Token</option>
                                        <option value="Special">Special</option>
                                    </select>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Status</label>
                                    <select class="sales-form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Search</label>
                                    <input type="text" class="sales-form-input" id="filterSearch" placeholder="Search name, code...">
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <button class="sales-btn-primary" id="btnApplyFilter">
                                <i class="bi bi-funnel"></i> Apply Filter
                            </button>
                            <button class="sales-btn-secondary" id="btnClearFilter">
                                <i class="bi bi-x-circle"></i> Clear
                            </button>
                        </div>
                    </div>

                    <!-- Data Table Card -->
                    <div class="sales-card">
                        <!-- Loading State -->
                        <div id="tableLoading" class="sales-loading" style="display: none;">
                            <div class="sales-spinner"></div>
                            <p class="mt-3 text-muted">Loading sale items...</p>
                        </div>
                        
                        <!-- Table -->
                        <div class="table-responsive" id="tableContainer" style="display: none;">
                            <table id="saleItemsTable" class="sales-table" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Name (English)</th>
                                        <th>Name (Secondary)</th>
                                        <th>Type</th>
                                        <th>Price (RM)</th>
                                        <th>Special Price</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Data will be loaded via API -->
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="emptyState" class="sales-empty-state" style="display: none;">
                            <i class="bi bi-inbox sales-empty-state-icon"></i>
                            <h4 class="sales-empty-state-title">No Sale Items Found</h4>
                            <p class="sales-empty-state-text">There are no sale items matching your criteria.</p>
                            <button class="sales-btn-primary mt-3" id="btnEmptyAddNew">
                                <i class="bi bi-plus-circle"></i> Create New Item
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load categories for filter
        loadCategories: function() {
            const self = this;
            TempleAPI.get('/sales/categories/active').done(function(response) {
                self.categories = response.data || [];
                let options = '<option value="">All Categories</option>';
                self.categories.forEach(cat => {
                    options += `<option value="${cat.id}">${cat.name_primary}</option>`;
                });
                $('#filterCategory').html(options);
            });
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Add new item button
            $('#btnAddNew, #btnEmptyAddNew').on('click.' + this.eventNamespace, function() {
                TempleRouter.navigate('sale-items/create');
            });
            
            // Apply filter button
            $('#btnApplyFilter').on('click.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            // Clear filter button
            $('#btnClearFilter').on('click.' + this.eventNamespace, function() {
                self.clearFilters();
            });
            
            // Search on Enter key
            $('#filterSearch').on('keypress.' + this.eventNamespace, function(e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });
        },
        
        // Load data from API
        loadData: function() {
            const self = this;
            $('#tableLoading').show();
            $('#tableContainer').hide();
            $('#emptyState').hide();
            
            TempleAPI.get('/sales/items').done(function(response) {
                self.itemsData = response.data || [];
                self.updateStats();
                self.initDataTable();
                $('#tableLoading').hide();
                
                if (self.itemsData.length === 0) {
                    $('#emptyState').show();
                } else {
                    $('#tableContainer').show();
                }
            }).fail(function(xhr, status, error) {
                console.error('Failed to load sale items:', error);
                TempleCore.showToast('Failed to load sale items', 'error');
                $('#tableLoading').hide();
                $('#emptyState').show();
            });
        },
        
        // Update stats
        updateStats: function() {
            const total = this.itemsData.length;
            const active = this.itemsData.filter(item => item.status).length;
            const withInventory = this.itemsData.filter(item => item.is_inventory).length;
            
            $('#totalItems').text(total);
            $('#activeItems').text(active);
            $('#inventoryItems').text(withInventory);
        },
        
        // Initialize DataTable
        initDataTable: function() {
            const self = this;
            
            if (this.dataTable) {
                this.dataTable.destroy();
            }
            
            this.dataTable = $('#saleItemsTable').DataTable({
                data: this.itemsData,
                columns: [
                    {
                        data: 'short_code',
                        render: function(data, type, row) {
                            return `<span class="badge bg-secondary">${data}</span>`;
                        }
                    },
                    { data: 'name_primary' },
                    {
                        data: 'name_secondary',
                        render: function(data) {
                            return data || '<span class="text-muted">-</span>';
                        }
                    },
                    {
                        data: 'sale_type',
                        render: function(data) {
                            const colors = {
                                'General': 'primary',
                                'Vehicle': 'success',
                                'Token': 'warning',
                                'Special': 'danger'
                            };
                            return `<span class="badge bg-${colors[data] || 'secondary'}">${data}</span>`;
                        }
                    },
                    {
                        data: 'price',
                        render: function(data) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    {
                        data: 'special_price',
                        render: function(data) {
                            return data ? `<span class="text-success fw-bold">${parseFloat(data).toFixed(2)}</span>` : '<span class="text-muted">-</span>';
                        }
                    },
                    {
                        data: 'status',
                        render: function(data) {
                            return data 
                                ? '<span class="sales-status-badge active">Active</span>' 
                                : '<span class="sales-status-badge inactive">Inactive</span>';
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary view-item" data-id="${row.id}" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-success edit-item" data-id="${row.id}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger delete-item" data-id="${row.id}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[1, 'asc']],
                pageLength: 25,
                responsive: true,
                language: {
                    emptyTable: "No sale items available"
                }
            });
            
            // Action button events
            $('#saleItemsTable tbody').on('click', '.view-item', function() {
                const id = $(this).data('id');
                TempleRouter.navigate('sale-items/view', { id: id });
            });
            
            $('#saleItemsTable tbody').on('click', '.edit-item', function() {
                const id = $(this).data('id');
                TempleRouter.navigate('sale-items/edit', { id: id });
            });
            
            $('#saleItemsTable tbody').on('click', '.delete-item', function() {
                const id = $(this).data('id');
                const item = self.itemsData.find(i => i.id == id);
                self.deleteItem(id, item.name_primary);
            });
        },
        
        // Apply filters
        applyFilters: function() {
            const category = $('#filterCategory').val();
            const saleType = $('#filterSaleType').val();
            const status = $('#filterStatus').val();
            const search = $('#filterSearch').val().toLowerCase();
            
            let filtered = this.itemsData;
            
            if (category) {
                filtered = filtered.filter(item => {
                    return item.categories && item.categories.some(cat => cat.id == category);
                });
            }
            
            if (saleType) {
                filtered = filtered.filter(item => item.sale_type === saleType);
            }
            
            if (status !== '') {
                const isActive = status === 'true';
                filtered = filtered.filter(item => item.status === isActive);
            }
            
            if (search) {
                filtered = filtered.filter(item => {
                    return item.name_primary.toLowerCase().includes(search) ||
                           (item.name_secondary && item.name_secondary.toLowerCase().includes(search)) ||
                           item.short_code.toLowerCase().includes(search);
                });
            }
            
            this.dataTable.clear();
            this.dataTable.rows.add(filtered);
            this.dataTable.draw();
        },
        
        // Clear filters
        clearFilters: function() {
            $('#filterCategory').val('');
            $('#filterSaleType').val('');
            $('#filterStatus').val('');
            $('#filterSearch').val('');
            
            this.dataTable.clear();
            this.dataTable.rows.add(this.itemsData);
            this.dataTable.draw();
        },
        initAnimations: function() {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }
            
            gsap.fromTo('.stat-card',
                { scale: 0.9, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'back.out(1.2)',
                    clearProps: 'all'
                }
            );
        },
        // Delete item
        deleteItem: function(id, name) {
            const self = this;
            
            if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
                return;
            }
            
            TempleCore.showLoading(true);
            TempleAPI.delete(`/sales/items/${id}`).done(function(response) {
                TempleCore.showLoading(false);
                TempleCore.showToast('Sale item deleted successfully', 'success');
                self.loadData();
            }).fail(function(xhr, status, error) {
                TempleCore.showLoading(false);
                const message = xhr.responseJSON?.message || 'Failed to delete sale item';
                TempleCore.showToast(message, 'error');
            });
        }
    };
    
})(jQuery, window);