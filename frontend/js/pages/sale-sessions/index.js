// js/pages/sessions/index.js
// Sessions Master Management - Styled like Buddha Lamp

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
    
    window.SaleSessionsPage = {
        pageId: 'session-master',
        eventNamespace: window.SalesSharedModule.eventNamespace,
        sessionsData: [],
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
                gsap.killTweensOf('.sessions-page *');
            }
            
            this.sessionsData = [];
            this.editingId = null;
            console.log('SessionsPage cleanup completed');
        },
        
        render: function() {
            const html = `
                <div class="sessions-page">
                    <!-- Inline Critical Styles -->
                    <style>
                        .sessions-page {
                            padding: 1.5rem;
                            animation: fadeInPage 0.5s ease-in-out;
                        }
                        
                        @keyframes fadeInPage {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        
                        /* Header with Gradient */
                        .sessions-header {
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
                        
                        .sessions-header-bg {
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
                        
                        .sessions-header .container-fluid {
                            position: relative;
                            z-index: 1;
                        }
                        
                        .sessions-title-wrapper {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                            color: white;
                        }
                        
                        .sessions-header-icon {
                            font-size: 48px;
                            color: #ffd700;
                            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                            animation: iconPulse 2s ease-in-out infinite;
                        }
                        
                        @keyframes iconPulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.1); }
                        }
                        
                        .sessions-title {
                            font-size: 2.5rem;
                            font-weight: 700;
                            margin: 0;
                            color: white;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                        }
                        
                        .sessions-subtitle {
                            font-size: 1.1rem;
                            margin: 5px 0 0 0;
                            color: rgba(255,255,255,0.9);
                            font-weight: 300;
                        }
                        
                        .sessions-header .btn-outline-light {
                            background: rgba(255,255,255,0.2);
                            color: white;
                            border: 2px solid rgba(255,255,255,0.3);
                            backdrop-filter: blur(10px);
                            font-weight: 600;
                            transition: all 0.3s ease;
                            padding: 12px 24px;
                            border-radius: 10px;
                        }
                        
                        .sessions-header .btn-outline-light:hover {
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
                        
                        .stat-card-primary { border-left-color: #6f42c1; }
                        .stat-card-primary .stat-card-icon {
                            background: linear-gradient(135deg, rgba(111,66,193,0.15) 0%, rgba(111,66,193,0.05) 100%);
                            color: #6f42c1;
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
                        .sessions-table-card {
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                            overflow: hidden;
                        }
                        
                        .sessions-table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        
                        .sessions-table thead {
                            background: linear-gradient(135deg, var(--primary-color, #20c997) 0%, var(--secondary-color, #5a32a3) 100%);
                        }
                        
                        .sessions-table th {
                            padding: 16px;
                            text-align: left;
                            font-size: 13px;
                            font-weight: 600;
                            color: white;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            border: none;
                        }
                        
                        .sessions-table td {
                            padding: 16px;
                            font-size: 14px;
                            color: #4a4a4a;
                            border-bottom: 1px solid #f0f0f0;
                            vertical-align: middle;
                        }
                        
                        .sessions-table tbody tr {
                            transition: all 0.2s ease;
                        }
                        
                        .sessions-table tbody tr:hover {
                            background-color: rgba(111,66,193,0.05);
                        }
                        
                        .sessions-table tbody tr:last-child td {
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
                            border-left: 4px solid #6f42c1;
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
                            border-top: 4px solid #6f42c1;
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
                        
                        /* Time Badge */
                        .time-badge {
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            padding: 6px 12px;
                            background: linear-gradient(135deg, rgba(111,66,193,0.1) 0%, rgba(111,66,193,0.05) 100%);
                            color: #6f42c1;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: 500;
                        }
                        
                        /* Responsive */
                        @media (max-width: 768px) {
                            .sessions-header {
                                padding: 30px 20px;
                                margin: -1.5rem -1.5rem 20px -1.5rem;
                                border-radius: 0 0 20px 20px;
                            }
                            
                            .sessions-title-wrapper {
                                flex-direction: column;
                                text-align: center;
                                gap: 15px;
                            }
                            
                            .sessions-header-icon { font-size: 36px; }
                            .sessions-title { font-size: 1.8rem; }
                            .sessions-subtitle { font-size: 0.9rem; }
                            
                            .stat-card-icon {
                                width: 50px;
                                height: 50px;
                                font-size: 1.5rem;
                            }
                            
                            .stat-value { font-size: 1.5rem; }
                        }
                    </style>
                    
                    <!-- Header with Gradient Background -->
                    <div class="sessions-header" data-aos="fade-down" data-aos-duration="800">
                        <div class="sessions-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="sessions-title-wrapper">
                                        <i class="bi bi-clock-history sessions-header-icon"></i>
                                        <div>
                                            <h1 class="sessions-title">Sessions</h1>
                                            <p class="sessions-subtitle">时段管理 • Manage booking sessions</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnShowForm">
                                        <i class="bi bi-plus-circle"></i> Add New Session
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
                                        <i class="bi bi-clock-history"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Sessions</div>
                                        <div class="stat-value" id="totalSessions">0</div>
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
                                        <div class="stat-value" id="activeSessions">0</div>
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
                                        <div class="stat-value" id="inactiveSessions">0</div>
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
                                <span id="formTitle">Add New Session</span>
                            </div>
                            <button class="btn btn-outline-secondary" id="btnCancelForm">
                                <i class="bi bi-x"></i> Cancel
                            </button>
                        </div>
                        
                        <form id="sessionForm">
                            <input type="hidden" id="session_id">
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Name<span class="text-danger">*</span></label>
                                        <input type="text" id="name" class="form-control" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Start Time <span class="text-danger">*</span></label>
                                        <input type="time" id="start_time" class="form-control" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">End Time <span class="text-danger">*</span></label>
                                        <input type="time" id="end_time" class="form-control" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
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
                                    <i class="bi bi-check-circle"></i> Save Session
                                </button>
                                <button type="button" class="btn btn-secondary" id="btnCancelForm2">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Table Card -->
                    <div class="sessions-table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <!-- Loading State -->
                        <div id="tableLoading" class="loading-state" style="display: none;">
                            <div class="loading-spinner"></div>
                            <p class="text-muted">Loading sessions...</p>
                        </div>
                        
                        <!-- Table -->
                        <div id="tableContainer" style="display: none;">
                            <table class="sessions-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th style="width: 120px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="sessionsTableBody"></tbody>
                            </table>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="emptyState" class="empty-state" style="display: none;">
                            <i class="bi bi-inbox empty-state-icon"></i>
                            <h4 class="text-muted">No Sessions Found</h4>
                            <p class="text-muted">Create your first session to get started.</p>
                            <button class="btn btn-primary mt-3" id="btnEmptyAdd">
                                <i class="bi bi-plus-circle"></i> Add New Session
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
                gsap.fromTo('.sessions-header-icon',
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
            $('#sessionForm').on('submit.' + this.eventNamespace, function(e) {
                e.preventDefault();
                self.saveSession();
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
            
            TempleAPI.get('/sales/sessions').done(function(response) {
                self.sessionsData = response.data || [];
                self.renderTable();
                self.updateStats();
                $('#tableLoading').hide();
                
                if (self.sessionsData.length === 0) {
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
                        gsap.fromTo('#sessionsTableBody tr',
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
                console.error('Failed to load sessions:', error);
                TempleCore.showToast('Failed to load sessions', 'error');
                $('#tableLoading').hide();
                $('#emptyState').show();
            });
        },
        
        updateStats: function() {
            const total = this.sessionsData.length;
            const active = this.sessionsData.filter(s => s.status).length;
            const inactive = total - active;
            
            this.animateCounter('#totalSessions', 0, total, 800);
            this.animateCounter('#activeSessions', 0, active, 800);
            this.animateCounter('#inactiveSessions', 0, inactive, 800);
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
        
        formatTime: function(time) {
            if (!time) return '-';
            // Convert 24hr to 12hr format
            const [hours, minutes] = time.split(':');
            const h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        },
        
        renderTable: function() {
            const self = this;
            const tbody = $('#sessionsTableBody');
            tbody.empty();
            
            const sorted = this.sessionsData.sort((a, b) => a.order_no - b.order_no);
            
            sorted.forEach(session => {
                const timeDisplay = `
                    <span class="time-badge">
                        <i class="bi bi-clock"></i>
                        ${self.formatTime(session.from_time)} - ${self.formatTime(session.to_time)}
                    </span>
                `;
                
                const statusBadge = session.status 
                    ? '<span class="status-badge active"><i class="bi bi-check-circle-fill"></i> Active</span>'
                    : '<span class="status-badge inactive"><i class="bi bi-x-circle-fill"></i> Inactive</span>';
                
                const row = `
                    <tr class="session-row" data-id="${session.id}">
                        <td><strong>${session.name}</strong></td>
                        <td>${timeDisplay}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="d-flex gap-2">
                                <button class="btn-action edit" data-id="${session.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn-action delete" data-id="${session.id}" title="Delete">
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
                const session = self.sessionsData.find(s => s.id == id);
                
                if (session) {
                    if (typeof gsap !== 'undefined') {
                        gsap.to($btn[0], {
                            scale: 0.9,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut',
                            onComplete: () => self.editSession(session)
                        });
                    } else {
                        self.editSession(session);
                    }
                }
            });
            
            tbody.off('click', '.btn-action.delete').on('click', '.btn-action.delete', function(e) {
                e.preventDefault();
                const $btn = $(this);
                const id = $btn.data('id');
                const session = self.sessionsData.find(s => s.id == id);
                
                if (session) {
                    if (typeof gsap !== 'undefined') {
                        gsap.to($btn[0], {
                            scale: 0.9,
                            duration: 0.1,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut',
                            onComplete: () => self.deleteSession(id, session.name)
                        });
                    } else {
                        self.deleteSession(id, session.name);
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
        
        showForm: function(session = null) {
            this.editingId = session ? session.id : null;
            
            if (session) {
                $('#formTitle').text('Edit Session');
                $('#session_id').val(session.id);
                $('#name').val(session.name);
                $('#start_time').val(session.from_time || '');
                $('#end_time').val(session.to_time || '');
                $('#status').prop('checked', session.status);
            } else {
                $('#formTitle').text('Add New Session');
                $('#sessionForm')[0].reset();
                $('#session_id').val('');
                $('#status').prop('checked', true);
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
                        $('#sessionForm')[0].reset();
                        self.editingId = null;
                    }
                });
            } else {
                $('#formCard').slideUp(function() {
                    $('#sessionForm')[0].reset();
                    self.editingId = null;
                });
            }
        },
        
        editSession: function(session) {
            this.showForm(session);
        },
        
        saveSession: function() {
            const self = this;
            
            const data = {
                name: $('#name').val().trim(),
                from_time: $('#start_time').val(),
                to_time: $('#end_time').val(),
                status: $('#status').is(':checked')
            };
            
            if (!data.name) {
                TempleCore.showToast('Please enter session name', 'error');
                if (typeof gsap !== 'undefined') {
                    gsap.to('#name', { x: [-10, 10, -10, 10, 0], duration: 0.4 });
                }
                return;
            }
            
            if (!data.from_time || !data.to_time) {
                TempleCore.showToast('Please enter start and end time', 'error');
                return;
            }
            
            TempleCore.showLoading(true);
            
            const apiCall = this.editingId 
                ? TempleAPI.put('/sales/sessions/' + this.editingId, data)
                : TempleAPI.post('/sales/sessions', data);
            
            apiCall.done(function(response) {
                TempleCore.showLoading(false);
                TempleCore.showToast(
                    self.editingId ? 'Session updated successfully' : 'Session created successfully',
                    'success'
                );
                self.hideForm();
                self.loadData();
            }).fail(function(xhr, status, error) {
                TempleCore.showLoading(false);
                const message = xhr.responseJSON?.message || 'Failed to save session';
                TempleCore.showToast(message, 'error');
            });
        },
        
        deleteSession: function(id, name) {
            const self = this;
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Delete Session?',
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
            
            TempleAPI.delete('/sales/sessions/' + id).done(function(response) {
                TempleCore.showLoading(false);
                TempleCore.showToast('Session deleted successfully', 'success');
                
                const $row = $(`.session-row[data-id="${id}"]`);
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
                const message = xhr.responseJSON?.message || 'Failed to delete session';
                TempleCore.showToast(message, 'error');
            });
        }
    };
    
})(jQuery, window);