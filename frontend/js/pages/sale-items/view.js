// js/pages/sale-items/view.js
// Sale Item View Page - Read Only Detail View with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    // Shared Module Management
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
                console.log(`Sales page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Sales page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Sales CSS removed');
                }
                
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
    
    window.SaleItemsViewPage = {
        pageId: 'sale-item-view',
        eventNamespace: window.SalesSharedModule.eventNamespace,
        itemId: null,
        itemData: null,
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.SalesSharedModule.registerPage(this.pageId);
            
            this.itemId = params?.id || null;
            
            if (!this.itemId) {
                TempleCore.showToast('Sale Item ID is required', 'error');
                this.navigateBack();
                return;
            }
            
            this.renderLoading();
            this.loadItemData();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.SalesSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            this.itemData = null;
            this.itemId = null;
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render loading state
        renderLoading: function() {
            const html = `
                <div class="sale-item-view-page">
                    <div class="sales-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="sales-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="sales-title-wrapper">
                                        <i class="bi bi-box-seam sales-header-icon"></i>
                                        <div>
                                            <h1 class="sales-title">Sale Item Details</h1>
                                            <p class="sales-subtitle">Loading...</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnBack">
                                        <i class="bi bi-arrow-left"></i> Back to List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted">Loading sale item details...</p>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.bindBackButton();
        },
        
        // Load sale item data from API
        loadItemData: function() {
            const self = this;
            
            TempleAPI.get(`/sales/items/${this.itemId}`)
                .done(function(response) {
                    if (response.success && response.data) {
                        self.itemData = response.data;
                        self.render();
                        self.initAnimations();
                        self.bindEvents();
                    } else {
                        TempleCore.showToast(response.message || 'Sale item not found', 'error');
                        self.navigateBack();
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load sale item:', xhr);
                    let errorMessage = 'Failed to load sale item details';
                    if (xhr.status === 404) {
                        errorMessage = 'Sale item not found';
                    } else if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                    self.navigateBack();
                });
        },
        
        // Render page HTML
        render: function() {
            const data = this.itemData;
            const currency = TempleCore.getCurrency() || 'RM';
            
            // Build categories HTML
            const categoriesHtml = this.buildTagsHtml(data.categories, 'name_primary', 'bg-primary');
            
            // Build sessions HTML
            const sessionsHtml = this.buildTagsHtml(data.sessions, 'name', 'bg-info');
            
            // Build deities HTML
            const deitiesHtml = this.buildTagsHtml(data.deities, 'name', 'bg-success');
            
            // Build BOM products HTML
            const bomProductsHtml = this.buildBomProductsHtml(data.bom_products || []);
            
            // Build commissions HTML
            const commissionsHtml = this.buildCommissionsHtml(data.commissions || []);
            
            const html = `
                <div class="sale-item-view-page">
                    <!-- Page Header -->
                    <div class="sales-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="sales-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="sales-title-wrapper">
                                        <i class="bi bi-box-seam sales-header-icon"></i>
                                        <div>
                                            <h1 class="sales-title">Sale Item Details</h1>
                                            <p class="sales-subtitle">${data.short_code} - ${data.name_primary}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <div class="d-flex gap-2 justify-content-md-end flex-wrap">
                                        <button class="btn btn-outline-light" id="btnBack">
                                            <i class="bi bi-arrow-left"></i> Back
                                        </button>
                                        <button class="btn btn-warning" id="btnEdit">
                                            <i class="bi bi-pencil"></i> Edit
                                        </button>
                                        <button class="btn btn-danger" id="btnDelete">
                                            <i class="bi bi-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Stat Cards -->
                    <div class="row g-3 mb-4" data-aos="fade-up" data-aos-delay="100">
                        <div class="col-6 col-md-3">
                            <div class="stat-card stat-card-primary">
                                <div class="stat-card-icon">
                                    <i class="bi bi-currency-dollar"></i>
                                </div>
                                <div class="stat-card-value">${currency} ${this.formatAmount(data.price)}</div>
                                <div class="stat-card-label">Price</div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="stat-card stat-card-success">
                                <div class="stat-card-icon">
                                    <i class="bi bi-tag"></i>
                                </div>
                                <div class="stat-card-value">${data.special_price ? currency + ' ' + this.formatAmount(data.special_price) : '-'}</div>
                                <div class="stat-card-label">Special Price</div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="stat-card ${data.status ? 'stat-card-info' : 'stat-card-secondary'}">
                                <div class="stat-card-icon">
                                    <i class="bi bi-${data.status ? 'check-circle' : 'x-circle'}"></i>
                                </div>
                                <div class="stat-card-value">${data.status ? 'Active' : 'Inactive'}</div>
                                <div class="stat-card-label">Status</div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="stat-card stat-card-warning">
                                <div class="stat-card-icon">
                                    <i class="bi bi-grid"></i>
                                </div>
                                <div class="stat-card-value">${data.sale_type}</div>
                                <div class="stat-card-label">Sale Type</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Main Content -->
                    <div class="sales-card" data-aos="fade-up" data-aos-delay="200">
                        <!-- Basic Information Section -->
                        <div class="sales-section-header">
                            <i class="bi bi-info-circle"></i>
                            Basic Information
                        </div>
                        
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Short Code</span>
                                <span class="detail-value"><span class="badge bg-dark fs-6">${data.short_code}</span></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Name (English)</span>
                                <span class="detail-value">${data.name_primary || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Name (Tamil)</span>
                                <span class="detail-value">${data.name_secondary || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Sale Type</span>
                                <span class="detail-value">
                                    <span class="badge ${this.getSaleTypeBadgeClass(data.sale_type)}">${data.sale_type}</span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Order No</span>
                                <span class="detail-value">${data.order_no || 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status</span>
                                <span class="detail-value">
                                    <span class="badge ${data.status ? 'bg-success' : 'bg-secondary'}">${data.status ? 'Active' : 'Inactive'}</span>
                                </span>
                            </div>
                        </div>
                        
                        ${data.description ? `
                        <div class="detail-item mt-3">
                            <span class="detail-label">Description</span>
                            <p class="detail-value mb-0">${data.description}</p>
                        </div>
                        ` : ''}
                        
                        <!-- Master Links Section -->
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-link-45deg"></i>
                            Master Links
                        </div>
                        
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Ledger</span>
                                <span class="detail-value">${data.ledger ? data.ledger.name : '-'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Categories</span>
                                <span class="detail-value">${categoriesHtml || '<span class="text-muted">None assigned</span>'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Sessions</span>
                                <span class="detail-value">${sessionsHtml || '<span class="text-muted">None assigned</span>'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Deities</span>
                                <span class="detail-value">${deitiesHtml || '<span class="text-muted">None assigned</span>'}</span>
                            </div>
                        </div>
                        
                        <!-- Pricing Section -->
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-currency-dollar"></i>
                            Pricing
                        </div>
                        
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Price</span>
                                <span class="detail-value price-value">${currency} ${this.formatAmount(data.price)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Special Price</span>
                                <span class="detail-value ${data.special_price ? 'price-value text-success' : ''}">${data.special_price ? currency + ' ' + this.formatAmount(data.special_price) : '-'}</span>
                            </div>
                        </div>
                        
                        <!-- Settings Section -->
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-gear"></i>
                            Settings
                        </div>
                        
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Track Inventory</span>
                                <span class="detail-value">
                                    ${data.is_inventory 
                                        ? '<span class="badge bg-success"><i class="bi bi-check"></i> Yes</span>'
                                        : '<span class="badge bg-secondary"><i class="bi bi-x"></i> No</span>'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Enable Commission</span>
                                <span class="detail-value">
                                    ${data.is_commission 
                                        ? '<span class="badge bg-success"><i class="bi bi-check"></i> Yes</span>'
                                        : '<span class="badge bg-secondary"><i class="bi bi-x"></i> No</span>'}
                                </span>
                            </div>
                        </div>
                        
                        <!-- BOM Products Section (if inventory tracking enabled) -->
                        ${data.is_inventory && data.bom_products && data.bom_products.length > 0 ? `
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-box-seam"></i>
                            BOM Products
                            <span class="badge bg-primary ms-2">${data.bom_products.length}</span>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="sales-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product Code</th>
                                        <th>Product Name</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${bomProductsHtml}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- Commission Settings Section (if commission enabled) -->
                        ${data.is_commission && data.commissions && data.commissions.length > 0 ? `
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-people"></i>
                            Commission Settings
                            <span class="badge bg-primary ms-2">${data.commissions.length}</span>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="sales-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Staff Name</th>
                                        <th>Commission %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${commissionsHtml}
                                </tbody>
                                <tfoot>
                                    <tr class="table-primary">
                                        <td colspan="2" class="text-end fw-bold">Total Commission:</td>
                                        <td class="fw-bold">${this.calculateTotalCommission(data.commissions)}%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- Images Section -->
                        ${(data.image_signed_url || data.grayscale_image_signed_url) ? `
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-image"></i>
                            Images
                        </div>
                        
                        <div class="row">
                            ${data.image_signed_url ? `
                            <div class="col-md-6 mb-3">
                                <div class="detail-label mb-2">Main Image</div>
                                <img src="${data.image_signed_url}" alt="Sale Item Image" class="img-fluid rounded shadow-sm" style="max-height: 200px;">
                            </div>
                            ` : ''}
                            ${data.grayscale_image_signed_url ? `
                            <div class="col-md-6 mb-3">
                                <div class="detail-label mb-2">Grayscale Image</div>
                                <img src="${data.grayscale_image_signed_url}" alt="Grayscale Image" class="img-fluid rounded shadow-sm" style="max-height: 200px;">
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                        
                        <!-- Metadata Section -->
                        <div class="sales-section-header mt-4">
                            <i class="bi bi-clock-history"></i>
                            System Information
                        </div>
                        
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Created At</span>
                                <span class="detail-value">${this.formatDateTime(data.created_at)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Updated At</span>
                                <span class="detail-value">${this.formatDateTime(data.updated_at)}</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="sales-btn-group mt-4">
                            <button type="button" class="sales-btn-primary" id="btnEditBottom">
                                <i class="bi bi-pencil"></i>
                                Edit Sale Item
                            </button>
                            <button type="button" class="sales-btn-danger" id="btnDeleteBottom">
                                <i class="bi bi-trash"></i>
                                Delete
                            </button>
                            <button type="button" class="sales-btn-secondary" id="btnBackBottom">
                                <i class="bi bi-arrow-left"></i>
                                Back to List
                            </button>
                        </div>
                    </div>
                </div>
                
                <style>
                    .sale-item-view-page {
                        padding: 1.5rem;
                        animation: fadeInPage 0.5s ease-in-out;
                    }
                    
                    @keyframes fadeInPage {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .sales-header {
                        position: relative;
                        background: linear-gradient(135deg, var(--primary-color, #6f42c1) 0%, var(--secondary-color, #5a32a3) 100%);
                        padding: 40px 30px;
                        margin: -1.5rem -1.5rem 30px -1.5rem;
                        border-radius: 0 0 30px 30px;
                        overflow: hidden;
                        box-shadow: 0 10px 30px rgba(111, 66, 193, 0.3);
                        animation: gradientShift 8s ease infinite;
                        background-size: 200% 200%;
                    }
                    
                    .sales-header-bg {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: linear-gradient(45deg,
                            rgba(255,255,255,0.1) 25%, transparent 25%,
                            transparent 50%, rgba(255,255,255,0.1) 50%,
                            rgba(255,255,255,0.1) 75%, transparent 75%, transparent
                        );
                        background-size: 50px 50px;
                        opacity: 0.3;
                        animation: movePattern 20s linear infinite;
                    }
                    
                    @keyframes movePattern {
                        0% { background-position: 0 0; }
                        100% { background-position: 50% 50%; }
                    }
                    
                    @keyframes gradientShift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    
                    .sales-title-wrapper {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        color: white;
                    }
                    
                    .sales-header-icon {
                        font-size: 48px;
                        color: #ffd700;
                        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                        animation: iconPulse 2s ease-in-out infinite;
                    }
                    
                    @keyframes iconPulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                    
                    .sales-title {
                        font-size: 2rem;
                        font-weight: 700;
                        margin: 0;
                        color: white;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                    }
                    
                    .sales-subtitle {
                        font-size: 1rem;
                        margin: 5px 0 0 0;
                        color: rgba(255,255,255,0.9);
                        font-weight: 300;
                    }
                    
                    .stat-card {
                        border: none;
                        border-radius: 15px;
                        padding: 1.5rem;
                        text-align: center;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                        transition: all 0.3s ease;
                        height: 100%;
                    }
                    
                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    }
                    
                    .stat-card-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                    .stat-card-success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
                    .stat-card-info { background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%); color: white; }
                    .stat-card-warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
                    .stat-card-secondary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; opacity: 0.6; }
                    
                    .stat-card-icon {
                        font-size: 2rem;
                        margin-bottom: 0.5rem;
                        opacity: 0.9;
                    }
                    
                    .stat-card-value {
                        font-size: 1.5rem;
                        font-weight: 700;
                    }
                    
                    .stat-card-label {
                        font-size: 0.85rem;
                        opacity: 0.9;
                    }
                    
                    .detail-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 1.5rem;
                    }
                    
                    .detail-item {
                        padding: 1rem;
                        background: rgba(0, 0, 0, 0.02);
                        border-radius: 10px;
                        border-left: 4px solid var(--primary-color, #6f42c1);
                    }
                    
                    .detail-label {
                        display: block;
                        font-size: 0.85rem;
                        color: #6c757d;
                        margin-bottom: 0.5rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .detail-value {
                        font-size: 1rem;
                        font-weight: 500;
                        color: #333;
                    }
                    
                    .price-value {
                        font-size: 1.25rem;
                        font-weight: 700;
                        color: var(--primary-color, #6f42c1);
                    }
                    
                    .sales-btn-danger {
                        padding: 12px 24px;
                        border-radius: 10px;
                        font-weight: 600;
                        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                        color: white;
                        border: none;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    
                    .sales-btn-danger:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Build tags HTML from array
        buildTagsHtml: function(items, nameField, badgeClass) {
            if (!items || items.length === 0) return '';
            
            return items.map(item => {
                const name = item[nameField] || item.name_primary || item.name;
                return `<span class="badge ${badgeClass} me-1 mb-1">${name}</span>`;
            }).join('');
        },
        
        // Build BOM products table rows
        buildBomProductsHtml: function(products) {
            if (!products || products.length === 0) return '';
            
            return products.map((bp, index) => {
                const product = bp.product || {};
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code>${product.product_code || bp.product_code || '-'}</code></td>
                        <td>${product.name || bp.product_name || '-'}</td>
                        <td>${parseFloat(bp.quantity).toFixed(3)}</td>
                        <td>${product.uom_short || product.uom_name || bp.uom || '-'}</td>
                    </tr>
                `;
            }).join('');
        },
        
        // Build commissions table rows
        buildCommissionsHtml: function(commissions) {
            if (!commissions || commissions.length === 0) return '';
            
            return commissions.map((c, index) => {
                const staff = c.staff || {};
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${staff.full_name || c.staff_name || '-'}</td>
                        <td><span class="badge bg-info">${parseFloat(c.commission_percent).toFixed(2)}%</span></td>
                    </tr>
                `;
            }).join('');
        },
        
        // Calculate total commission
        calculateTotalCommission: function(commissions) {
            if (!commissions || commissions.length === 0) return '0.00';
            return commissions.reduce((sum, c) => sum + (parseFloat(c.commission_percent) || 0), 0).toFixed(2);
        },
        
        // Initialize animations
        initAnimations: function() {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }
            
            if (typeof gsap !== 'undefined') {
                // Animate stat cards
                gsap.fromTo('.stat-card',
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.5,
                        stagger: 0.1,
                        ease: 'power2.out',
                        clearProps: 'all'
                    }
                );
                
                // Animate detail items
                gsap.fromTo('.detail-item',
                    { x: -20, opacity: 0 },
                    {
                        x: 0,
                        opacity: 1,
                        duration: 0.4,
                        stagger: 0.05,
                        ease: 'power2.out',
                        delay: 0.3,
                        clearProps: 'all'
                    }
                );
                
                // Animate tables
                gsap.fromTo('.sales-table tbody tr',
                    { x: -20, opacity: 0 },
                    {
                        x: 0,
                        opacity: 1,
                        duration: 0.3,
                        stagger: 0.05,
                        ease: 'power2.out',
                        delay: 0.5,
                        clearProps: 'all'
                    }
                );
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            this.bindBackButton();
            
            // Edit buttons
            $('#btnEdit, #btnEditBottom').on('click.' + this.eventNamespace, function() {
                const itemId = self.itemId;
                self.cleanup();
                TempleRouter.navigate('sale-items/edit', { id: itemId });
            });
            
            // Delete buttons
            $('#btnDelete, #btnDeleteBottom').on('click.' + this.eventNamespace, function() {
                self.deleteItem();
            });
            
            // Button hover animations
            if (typeof gsap !== 'undefined') {
                $('.btn, .sales-btn-primary, .sales-btn-secondary, .sales-btn-danger')
                    .on('mouseenter.' + this.eventNamespace, function() {
                        gsap.to($(this), {
                            scale: 1.05,
                            duration: 0.2,
                            ease: 'power1.out'
                        });
                    })
                    .on('mouseleave.' + this.eventNamespace, function() {
                        gsap.to($(this), {
                            scale: 1,
                            duration: 0.2
                        });
                    });
            }
        },
        
        // Bind back button
        bindBackButton: function() {
            const self = this;
            
            $('#btnBack, #btnBackBottom').off('click').on('click.' + this.eventNamespace, function() {
                if (typeof gsap !== 'undefined') {
                    gsap.to('.sale-item-view-page', {
                        opacity: 0,
                        y: -30,
                        duration: 0.3,
                        onComplete: () => {
                            self.navigateBack();
                        }
                    });
                } else {
                    self.navigateBack();
                }
            });
        },
        
        // Delete item
        deleteItem: function() {
            const self = this;
            const data = this.itemData;
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Delete Sale Item?',
                    html: `Are you sure you want to delete <strong>"${data.name_primary}"</strong>?<br><br>This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: '<i class="bi bi-trash"></i> Yes, Delete',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.performDelete();
                    }
                });
            } else {
                if (confirm(`Are you sure you want to delete "${data.name_primary}"?\n\nThis action cannot be undone.`)) {
                    self.performDelete();
                }
            }
        },
        
        // Perform delete API call
        performDelete: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.delete(`/sales/items/${this.itemId}`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast('Sale item deleted successfully', 'success');
                        self.cleanup();
                        TempleRouter.navigate('sale-items');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to delete sale item', 'error');
                    }
                })
                .fail(function(xhr) {
                    let errorMessage = 'Failed to delete sale item';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Navigate back to list
        navigateBack: function() {
            this.cleanup();
            TempleRouter.navigate('sale-items');
        },
        
        // Helper functions
        formatAmount: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        },
        
        formatDateTime: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        getSaleTypeBadgeClass: function(type) {
            const classMap = {
                'General': 'bg-primary',
                'Vehicle': 'bg-info',
                'Token': 'bg-warning text-dark',
                'Special': 'bg-success'
            };
            return classMap[type] || 'bg-secondary';
        }
    };
    
})(jQuery, window);