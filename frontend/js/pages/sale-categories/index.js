// js/pages/categories/index.js
// Categories Master Management - Styled like Buddha Lamp

(function($, window) {
    'use strict';
    
    // Use a dedicated shared module for Sales/Masters pages
    if (!window.SalesSharedModule) {
        window.SalesSharedModule = {
            moduleId: 'sales',
            eventNamespace: 'sales',
            cssId: 'sales-module-css',
            cssPath: '/css/sales.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Sales Module CSS loaded:', this.cssPath);
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
                if (cssLink) {
                    cssLink.remove();
                    console.log('Sales Module CSS removed');
                }
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }
    
    window.SaleCategoriesPage = {
        pageId: 'category-master',
        eventNamespace: window.SalesSharedModule.eventNamespace,
        categoriesData: [],
        editingId: null,
        
        init: function(params) {
            window.SalesSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadData();
        },
        
        cleanup: function() {
            window.SalesSharedModule.unregisterPage(this.pageId);
            $(document).off('.' + this.eventNamespace);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('.categories-page *');
            }
            
            this.categoriesData = [];
            this.editingId = null;
            console.log('CategoriesPage cleanup completed');
        },
        
        render: function() {
            const html = `
                <div class="categories-page">
                    <!-- Inline Critical Styles -->
                    <style>
                        .categories-page {
                            padding: 1.5rem;
                            animation: fadeInPage 0.5s ease-in-out;
                        }
                        
                        @keyframes fadeInPage {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        
                        /* Header with Gradient */
                        .categories-header {
                            position: relative;
                            background: linear-gradient(135deg, var(--primary-color, #20c997) 0%, var(--secondary-color, #17a589) 100%);
                            padding: 40px 30px;
                            margin: -1.5rem -1.5rem 30px -1.5rem;
                            border-radius: 0 0 30px 30px;
                            overflow: hidden;
                            box-shadow: 0 10px 30px rgba(32, 201, 151, 0.3);
                            animation: gradientShift 8s ease infinite;
                            background-size: 200% 200%;
                        }
                        
                        .categories-header-bg {
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
                        
                        .categories-header .container-fluid {
                            position: relative;
                            z-index: 1;
                        }
                        
                        .categories-title-wrapper {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                            color: white;
                        }
                        
                        .categories-header-icon {
                            font-size: 48px;
                            color: #ffd700;
                            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                            animation: iconPulse 2s ease-in-out infinite;
                        }
                        
                        @keyframes iconPulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.1); }
                        }
                        
                        .categories-title {
                            font-size: 2.5rem;
                            font-weight: 700;
                            margin: 0;
                            color: white;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                        }
                        
                        .categories-subtitle {
                            font-size: 1.1rem;
                            margin: 5px 0 0 0;
                            color: rgba(255,255,255,0.9);
                            font-weight: 300;
                        }
                        
                        .categories-header .btn-outline-light {
                            background: rgba(255,255,255,0.2);
                            color: white;
                            border: 2px solid rgba(255,255,255,0.3);
                            backdrop-filter: blur(10px);
                            font-weight: 600;
                            transition: all 0.3s ease;
                            padding: 12px 24px;
                            border-radius: 10px;
                        }
                        
                        .categories-header .btn-outline-light:hover {
                            background: rgba(255,255,255,0.3);
                            border-color: rgba(255,255,255,0.5);
                            transform: translateY(-2px);
                            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                        }
                        
                        /* Stat Cards */
                        .stat-card {
                            border: none;
                            border-radius: 15px;
                            padding: 1.5rem;
                            transition: all 0.3s ease;
                            border-left: 4px solid;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                            background: white;
                        }
                        
                        .stat-card:hover {
                            transform: translateY(-5px);
                            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
                        }
                        
                        .stat-card-icon {
                            width: 60px;
                            height: 60px;
                            border-radius: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1.75rem;
                            transition: all 0.3s ease;
                        }
                        
                        .stat-card:hover .stat-card-icon {
                            transform: scale(1.1) rotate(5deg);
                        }
                        
                        .stat-card-primary { border-left-color: #20c997; }
                        .stat-card-primary .stat-card-icon {
                            background: linear-gradient(135deg, rgba(32,201,151,0.15) 0%, rgba(32,201,151,0.05) 100%);
                            color: #20c997;
                        }
                        
                        .stat-card-success { border-left-color: #28a745; }
                        .stat-card-success .stat-card-icon {
                            background: linear-gradient(135deg, rgba(40,167,69,0.15) 0%, rgba(40,167,69,0.05) 100%);
                            color: #28a745;
                        }
                        
                        .stat-card-warning { border-left-color: #ffc107; }
                        .stat-card-warning .stat-card-icon {
                            background: linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,193,7,0.05) 100%);
                            color: #e0a800;
                        }
                        
                        .stat-value {
                            font-size: 2rem;
                            font-weight: 700;
                            margin: 0.5rem 0 0 0;
                            color: #1a1a1a;
                        }
                        
                        .stat-label {
                            color: #6c757d;
                            font-size: 0.875rem;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            font-weight: 600;
                        }
                        
                        /* Table Styling */
                        .categories-table-card {
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                            overflow: hidden;
                        }
                        
                        .categories-table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        
                        .categories-table thead {
                            background: linear-gradient(135deg, var(--primary-color, #20c997) 0%, var(--secondary-color, #5a32a3) 100%);
                        }
                        
                        .categories-table th {
                            padding: 16px;
                            text-align: left;
                            font-size: 13px;
                            font-weight: 600;
                            color: white;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            border: none;
                        }
                        
                        .categories-table td {
                            padding: 16px;
                            font-size: 14px;
                            color: #4a4a4a;
                            border-bottom: 1px solid #f0f0f0;
                            vertical-align: middle;
                        }
                        
                        .categories-table tbody tr {
                            transition: all 0.2s ease;
                        }
                        
                        .categories-table tbody tr:hover {
                            background-color: rgba(32,201,151,0.05);
                        }
                        
                        .categories-table tbody tr:last-child td {
                            border-bottom: none;
                        }
                        
                        /* Status Badge */
                        .status-badge {
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            padding: 6px 14px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 600;
                        }
                        
                        .status-badge.active {
                            background: linear-gradient(135deg, rgba(40,167,69,0.15) 0%, rgba(40,167,69,0.05) 100%);
                            color: #28a745;
                            border: 1px solid rgba(40,167,69,0.3);
                        }
                        
                        .status-badge.inactive {
                            background: linear-gradient(135deg, rgba(108,117,125,0.15) 0%, rgba(108,117,125,0.05) 100%);
                            color: #6c757d;
                            border: 1px solid rgba(108,117,125,0.3);
                        }
                        
                        /* Category Type Badge */
                        .type-badge {
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            padding: 6px 12px;
                            border-radius: 8px;
                            font-size: 12px;
                            font-weight: 600;
                        }
                        
                        .type-badge.donation {
                            background: linear-gradient(135deg, rgba(220,53,69,0.15) 0%, rgba(220,53,69,0.05) 100%);
                            color: #dc3545;
                        }
                        
                        .type-badge.service {
                            background: linear-gradient(135deg, rgba(13,110,253,0.15) 0%, rgba(13,110,253,0.05) 100%);
                            color: #0d6efd;
                        }
                        
                        .type-badge.product {
                            background: linear-gradient(135deg, rgba(111,66,193,0.15) 0%, rgba(111,66,193,0.05) 100%);
                            color: #6f42c1;
                        }
                        
                        .type-badge.event {
                            background: linear-gradient(135deg, rgba(253,126,20,0.15) 0%, rgba(253,126,20,0.05) 100%);
                            color: #fd7e14;
                        }
                        
                        .type-badge.other {
                            background: linear-gradient(135deg, rgba(108,117,125,0.15) 0%, rgba(108,117,125,0.05) 100%);
                            color: #6c757d;
                        }
                        
                        /* Action Buttons */
                        .btn-action {
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            border: 2px solid;
                            background: transparent;
                            transition: all 0.2s ease;
                            cursor: pointer;
                        }
                        
                        .btn-action:hover {
                            transform: translateY(-2px);
                        }
                        
                        .btn-action.edit {
                            color: #0d6efd;
                            border-color: #0d6efd;
                        }
                        
                        .btn-action.edit:hover {
                            background: #0d6efd;
                            color: white;
                            box-shadow: 0 4px 12px rgba(13,110,253,0.3);
                        }
                        
                        .btn-action.delete {
                            color: #dc3545;
                            border-color: #dc3545;
                        }
                        
                        .btn-action.delete:hover {
                            background: #dc3545;
                            color: white;
                            box-shadow: 0 4px 12px rgba(220,53,69,0.3);
                        }
                        
                        /* Form Card */
                        .form-card {
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                            padding: 24px;
                            margin-bottom: 24px;
                            border-left: 4px solid #20c997;
                        }
                        
                        .form-card-header {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            color: var(--primary-color, #20c997);
                            font-size: 18px;
                            font-weight: 600;
                            margin-bottom: 20px;
                        }
                        
                        /* Loading & Empty States */
                        .loading-state {
                            text-align: center;
                            padding: 60px 20px;
                        }
                        
                        .loading-spinner {
                            width: 50px;
                            height: 50px;
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #20c997;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 16px;
                        }
                        
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        
                        .empty-state {
                            text-align: center;
                            padding: 80px 20px;
                        }
                        
                        .empty-state-icon {
                            font-size: 80px;
                            color: #d1d5db;
                            margin-bottom: 20px;
                            animation: floatIcon 3s ease-in-out infinite;
                        }
                        
                        @keyframes floatIcon {
                            0%, 100% { transform: translateY(0); }
                            50% { transform: translateY(-10px); }
                        }
                        
                        /* Toggle Switch */
                        .toggle-wrapper {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        
                        .toggle-switch {
                            position: relative;
                            width: 52px;
                            height: 28px;
                        }
                        
                        .toggle-switch input {
                            opacity: 0;
                            width: 0;
                            height: 0;
                        }
                        
                        .toggle-slider {
                            position: absolute;
                            cursor: pointer;
                            top: 0; left: 0; right: 0; bottom: 0;
                            background-color: #cbd5e0;
                            transition: 0.3s;
                            border-radius: 28px;
                        }
                        
                        .toggle-slider:before {
                            position: absolute;
                            content: "";
                            height: 22px;
                            width: 22px;
                            left: 3px;
                            bottom: 3px;
                            background-color: white;
                            transition: 0.3s;
                            border-radius: 50%;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                        
                        .toggle-switch input:checked + .toggle-slider {
                            background: linear-gradient(135deg, var(--primary-color, #20c997) 0%, var(--secondary-color, #5a32a3) 100%);
                        }
                        
                        .toggle-switch input:checked + .toggle-slider:before {
                            transform: translateX(24px);
                        }
                        
                        /* Responsive */
                        @media (max-width: 768px) {
                            .categories-header {
                                padding: 30px 20px;
                                margin: -1.5rem -1.5rem 20px -1.5rem;
                                border-radius: 0 0 20px 20px;
                            }
                            
                            .categories-title-wrapper {
                                flex-direction: column;
                                text-align: center;
                                gap: 15px;
                            }
                            
                            .categories-header-icon { font-size: 36px; }
                            .categories-title { font-size: 1.8rem; }
                            .categories-subtitle { font-size: 0.9rem; }
                            
                            .stat-card-icon {
                                width: 50px;
                                height: 50px;
                                font-size: 1.5rem;
                            }
                            
                            .stat-value { font-size: 1.5rem; }
                        }
                    </style>
                    
                    <!-- Header with Gradient Background -->
                    <div class="categories-header" data-aos="fade-down" data-aos-duration="800">
                        <div class="categories-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="categories-title-wrapper">
                                        <i class="bi bi-grid-3x3-gap-fill categories-header-icon"></i>
                                        <div>
                                            <h1 class="categories-title">Categories</h1>
                                            <p class="categories-subtitle">分类管理 • Manage service categories</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnShowForm">
                                        <i class="bi bi-plus-circle"></i> Add New Category
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="row mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="col-md-4 mb-3">
                            <div class="card stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-grid-3x3-gap"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Categories</div>
                                        <div class="stat-value" id="totalCategories">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 mb-3">
                            <div class="card stat-card stat-card-success">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Active</div>
                                        <div class="stat-value" id="activeCategories">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 mb-3">
                            <div class="card stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-pause-circle"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Inactive</div>
                                        <div class="stat-value" id="inactiveCategories">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Form Card (Hidden by default) -->
                    <div class="form-card" id="formCard" style="display: none;">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="form-card-header">
                                <i class="bi bi-pencil-square"></i>
                                <span id="formTitle">Add New Category</span>
                            </div>
                            <button class="btn btn-outline-secondary" id="btnCancelForm">
                                <i class="bi bi-x"></i> Cancel
                            </button>
                        </div>
                        
                        <form id="categoryForm">
                            <input type="hidden" id="category_id">
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Category Code <span class="text-danger">*</span></label>
                                        <input type="text" id="category_code" class="form-control" required maxlength="50" style="text-transform: uppercase;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Name (Primary) <span class="text-danger">*</span></label>
                                        <input type="text" id="name" class="form-control" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Name (Secondary)</label>
                                        <input type="text" id="name_secondary" class="form-control">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea id="description" class="form-control" rows="3"></textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Order No</label>
                                        <input type="number" id="order_no" class="form-control" value="0" min="0">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <div class="toggle-wrapper mt-2">
                                            <label class="toggle-switch">
                                                <input type="checkbox" id="status" checked>
                                                <span class="toggle-slider"></span>
                                            </label>
                                            <span>Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex gap-2 mt-3">
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-check-circle"></i> Save Category
                                </button>
                                <button type="button" class="btn btn-secondary" id="btnCancelForm2">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Table Card -->
                    <div class="categories-table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <!-- Loading State -->
                        <div id="tableLoading" class="loading-state" style="display: none;">
                            <div class="loading-spinner"></div>
                            <p class="text-muted">Loading categories...</p>
                        </div>
                        
                        <!-- Table -->
                        <div id="tableContainer" style="display: none;">
                            <table class="categories-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Name (Primary)</th>
                                        <th>Name (Secondary)</th>
                                        <th>Order No</th>
                                        <th>Status</th>
                                        <th style="width: 120px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="categoriesTableBody"></tbody>
                            </table>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="emptyState" class="empty-state" style="display: none;">
                            <i class="bi bi-inbox empty-state-icon"></i>
                            <h4 class="text-muted">No Categories Found</h4>
                            <p class="text-muted">Create your first category to get started.</p>
                            <button class="btn btn-primary mt-3" id="btnEmptyAdd">
                                <i class="bi bi-plus-circle"></i> Add New Category
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        initAnimations: function() {
            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }
            
            // GSAP animations for stat cards
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('.stat-card',
                    { scale: 0.9, opacity: 0, y: 20 },
                    {
                        scale: 1,
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.1,
                        ease: 'back.out(1.2)',
                        clearProps: 'all'
                    }
                );
                
                // Header icon animation
                gsap.fromTo('.categories-header-icon',
                    { scale: 0, rotation: -180 },
                    {
                        scale: 1,
                        rotation: 0,
                        duration: 0.8,
                        ease: 'elastic.out(1, 0.5)',
                        clearProps: 'all'
                    }
                );
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            // Show form
            $('#btnShowForm, #btnEmptyAdd').on('click.' + this.eventNamespace, function() {
                if (typeof gsap !== 'undefined') {
                    gsap.to(this, {
                        scale: 0.95,
                        duration: 0.1,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power2.inOut',
                        onComplete: () => self.showForm()
                    });
                } else {
                    self.showForm();
                }
            });
            
            // Cancel form
            $('#btnCancelForm, #btnCancelForm2').on('click.' + this.eventNamespace, function() {
                self.hideForm();
            });
            
            // Submit form
            $('#categoryForm').on('submit.' + this.eventNamespace, function(e) {
                e.preventDefault();
                self.saveCategory();
            });
            
            // Button hover animations
            if (typeof gsap !== 'undefined') {
                $('.btn').hover(
                    function() {
                        gsap.to(this, { scale: 1.05, duration: 0.2, ease: 'power1.out' });
                    },
                    function() {
                        gsap.to(this, { scale: 1, duration: 0.2 });
                    }
                );
            }
        },
        
        loadData: function() {
            const self = this;
            $('#tableLoading').show();
            $('#tableContainer').hide();
            $('#emptyState').hide();
            
            TempleAPI.get('/sales/categories').done(function(response) {
                self.categoriesData = response.data || [];
                self.renderTable();
                self.updateStats();
                $('#tableLoading').hide();
                
                if (self.categoriesData.length === 0) {
                    $('#emptyState').show();
                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo('#emptyState',
                            { opacity: 0, y: 20 },
                            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
                        );
                    }
                } else {
                    $('#tableContainer').show();
                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo('#categoriesTableBody tr',
                            { opacity: 0, x: -20 },
                            {
                                opacity: 1,
                                x: 0,
                                duration: 0.3,
                                stagger: 0.05,
                                ease: 'power2.out',
                                clearProps: 'all'
                            }
                        );
                    }
                }
            }).fail(function(xhr, status, error) {
                console.error('Failed to load categories:', error);
                TempleCore.showToast('Failed to load categories', 'error');
                $('#tableLoading').hide();
                $('#emptyState').show();
            });
        },
        
        updateStats: function() {
            const total = this.categoriesData.length;
            const active = this.categoriesData.filter(c => c.status).length;
            const inactive = total - active;
            
            this.animateCounter('#totalCategories', 0, total, 800);
            this.animateCounter('#activeCategories', 0, active, 800);
            this.animateCounter('#inactiveCategories', 0, inactive, 800);
        },
        
        animateCounter: function(selector, start, end, duration) {
            if (typeof gsap !== 'undefined') {
                const obj = { value: start };
                gsap.to(obj, {
                    value: end,
                    duration: duration / 1000,
                    ease: 'power1.out',
                    onUpdate: function() {
                        $(selector).text(Math.round(obj.value));
                    }
                });
            } else {
                $(selector).text(end);
            }
        },
        
        
        renderTable: function() {
            const self = this;
            const tbody = $('#categoriesTableBody');
            tbody.empty();
            
            const sorted = this.categoriesData.sort((a, b) => a.order_no - b.order_no);
            
            sorted.forEach(category => {
                const statusBadge = category.status 
                    ? '<span class="status-badge active"><i class="bi bi-check-circle-fill"></i> Active</span>'
                    : '<span class="status-badge inactive"><i class="bi bi-x-circle-fill"></i> Inactive</span>';
                
                const row = `
                    <tr class="category-row" data-id="${category.id}">
                        <td><span class="badge bg-secondary">${category.short_code}</span></td>
                        <td><strong>${category.name_primary}</strong></td>
                        <td>${category.name_secondary || '<span class="text-muted">-</span>'}</td>
                        <td>${category.order_no}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="d-flex gap-2">
                                <button class="btn-action edit" data-id="${category.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn-action delete" data-id="${category.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
            
            // Event delegation for action buttons
            tbody.off('click', '.btn-action.edit').on('click', '.btn-action.edit', function(e) {
                e.preventDefault();
                const $btn = $(this);
                const id = $btn.data('id');
                const category = self.categoriesData.find(c => c.id == id);
                
                if (category) {
                    if (typeof gsap !== 'undefined') {
                        gsap.to($btn[0], {
                            scale: 0.9,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut',
                            onComplete: () => self.editCategory(category)
                        });
                    } else {
                        self.editCategory(category);
                    }
                }
            });
            
            tbody.off('click', '.btn-action.delete').on('click', '.btn-action.delete', function(e) {
                e.preventDefault();
                const $btn = $(this);
                const id = $btn.data('id');
                const category = self.categoriesData.find(c => c.id == id);
                
                if (category) {
                    if (typeof gsap !== 'undefined') {
                        gsap.to($btn[0], {
                            scale: 0.9,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut',
                            onComplete: () => self.deleteCategory(id, category.name_primary)
                        });
                    } else {
                        self.deleteCategory(id, category.name_primary);
                    }
                }
            });
            
            // Row hover animation
            if (typeof gsap !== 'undefined') {
                tbody.find('tr').hover(
                    function() {
                        gsap.to(this, { x: 5, duration: 0.2 });
                    },
                    function() {
                        gsap.to(this, { x: 0, duration: 0.2 });
                    }
                );
            }
        },
        
        showForm: function(category = null) {
            this.editingId = category ? category.id : null;
            
            if (category) {
                $('#formTitle').text('Edit Category');
                $('#category_id').val(category.id);
                $('#category_code').val(category.short_code);
                $('#name').val(category.name_primary);
                $('#name_secondary').val(category.name_secondary || '');
                $('#description').val(category.description || '');
                $('#order_no').val(category.order_no);
                $('#status').prop('checked', category.status);
            } else {
                $('#formTitle').text('Add New Category');
                $('#categoryForm')[0].reset();
                $('#category_id').val('');
                $('#status').prop('checked', true);
                $('#order_no').val(0);
            }
            
            if (typeof gsap !== 'undefined') {
                $('#formCard').css({ display: 'block', opacity: 0, y: -20 });
                gsap.to('#formCard', {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    ease: 'power2.out',
                    onComplete: () => {
                        $('html, body').animate({ scrollTop: $('#formCard').offset().top - 100 }, 500);
                    }
                });
            } else {
                $('#formCard').slideDown();
                $('html, body').animate({ scrollTop: $('#formCard').offset().top - 100 }, 500);
            }
        },
        
        hideForm: function() {
            const self = this;
            
            if (typeof gsap !== 'undefined') {
                gsap.to('#formCard', {
                    opacity: 0,
                    y: -20,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: () => {
                        $('#formCard').hide();
                        $('#categoryForm')[0].reset();
                        self.editingId = null;
                    }
                });
            } else {
                $('#formCard').slideUp(function() {
                    $('#categoryForm')[0].reset();
                    self.editingId = null;
                });
            }
        },
        
        editCategory: function(category) {
            this.showForm(category);
        },
        
        saveCategory: function() {
            const self = this;
            
            const data = {
                short_code: $('#category_code').val().trim().toUpperCase(),
                name_primary: $('#name').val().trim(),
                name_secondary: $('#name_secondary').val().trim(),
                description: $('#description').val().trim(),
                order_no: parseInt($('#order_no').val()) || 0,
                status: $('#status').is(':checked')
            };
            
            if (!data.short_code) {
                TempleCore.showToast('Please enter category code', 'error');
                if (typeof gsap !== 'undefined') {
                    gsap.to('#category_code', { x: [-10, 10, -10, 10, 0], duration: 0.4 });
                }
                return;
            }
            
            if (!data.name_primary) {
                TempleCore.showToast('Please enter category name', 'error');
                if (typeof gsap !== 'undefined') {
                    gsap.to('#name', { x: [-10, 10, -10, 10, 0], duration: 0.4 });
                }
                return;
            }
            
            TempleCore.showLoading(true);
            
            const apiCall = this.editingId 
                ? TempleAPI.put('/sales/categories/' + this.editingId, data)
                : TempleAPI.post('/sales/categories', data);
            
            apiCall.done(function(response) {
                TempleCore.showLoading(false);
                TempleCore.showToast(
                    self.editingId ? 'Category updated successfully' : 'Category created successfully',
                    'success'
                );
                self.hideForm();
                self.loadData();
            }).fail(function(xhr, status, error) {
                TempleCore.showLoading(false);
                const message = xhr.responseJSON?.message || 'Failed to save category';
                TempleCore.showToast(message, 'error');
            });
        },
        
        deleteCategory: function(id, name) {
            const self = this;
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Delete Category?',
                    html: `Are you sure you want to delete <strong>"${name}"</strong>?<br><br>This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: '<i class="bi bi-trash"></i> Yes, Delete',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.performDelete(id, name);
                    }
                });
            } else {
                if (confirm(`Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
                    self.performDelete(id, name);
                }
            }
        },
        
        performDelete: function(id, name) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.delete('/sales/categories/' + id).done(function(response) {
                TempleCore.showLoading(false);
                TempleCore.showToast('Category deleted successfully', 'success');
                
                const $row = $(`.category-row[data-id="${id}"]`);
                if (typeof gsap !== 'undefined' && $row.length) {
                    gsap.to($row[0], {
                        opacity: 0,
                        x: -50,
                        height: 0,
                        padding: 0,
                        duration: 0.3,
                        ease: 'power2.in',
                        onComplete: () => self.loadData()
                    });
                } else {
                    self.loadData();
                }
            }).fail(function(xhr, status, error) {
                TempleCore.showLoading(false);
                const message = xhr.responseJSON?.message || 'Failed to delete category';
                TempleCore.showToast(message, 'error');
            });
        }
    };
    
})(jQuery, window);