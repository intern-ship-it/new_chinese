// js/pages/pos-sales/index.js
// POS Sales Order Listing Page with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    // Shared Module for POS Sales
    if (!window.POSSalesPageSharedModule) {
        window.POSSalesPageSharedModule = {
            moduleId: 'pos-sales',
            eventNamespace: 'pos-sales',
            cssId: 'pos-sales-css',
            cssPath: '/css/pos-sales-pages.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('POS Sales CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`POS Sales page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`POS Sales page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            // Check if any pages are active
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            // Get active pages
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            // Cleanup module resources
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('POS Sales CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('POS Sales module cleaned up');
            }
        };
    }
    
    window.PosSalesPage = {
        dataTable: null,
        pageId: 'pos-sales-list',
        eventNamespace: window.POSSalesPageSharedModule.eventNamespace,
        ordersData: [],
        pagination: null,
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.POSSalesPageSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadData();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.POSSalesPageSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
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
            const today = new Date().toISOString().split('T')[0];
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            
            const html = `
                <div class="pos-sales-list-page">
                    <!-- Page Header with Animation -->
                    <div class="pos-sales-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="pos-sales-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="pos-sales-title-wrapper">
                                        <i class="bi bi-receipt-cutoff pos-sales-header-icon"></i>
                                        <div>
                                            <h1 class="pos-sales-title">POS Sales Orders</h1>
                                            <p class="pos-sales-subtitle">Point of Sale Transactions</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-outline-light btn-lg" id="btnPrintReport">
                                            <i class="bi bi-file-earmark-text"></i> Sales Report
                                        </button>
                                        <button class="btn btn-outline-light btn-lg" id="btnNewOrder">
                                            <i class="bi bi-plus-circle"></i> New Order
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Stats Cards -->
                    <div class="row mb-4" data-aos="fade-up" data-aos-duration="800">
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-receipt"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Orders</div>
                                        <div class="stat-value" id="totalOrders">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-success">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-cash-stack"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Sales</div>
                                        <div class="stat-value" id="totalSales">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-info">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-day"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Today's Orders</div>
                                        <div class="stat-value" id="todayOrders">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Confirmed</div>
                                        <div class="stat-value" id="confirmedOrders">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Card -->
                    <div class="card filter-card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-2">
                                    <label class="form-label"><i class="bi bi-calendar-event me-1"></i>From Date</label>
                                    <input type="date" class="form-control" id="filterDateFrom" value="${firstDayOfMonth}">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label"><i class="bi bi-calendar-event me-1"></i>To Date</label>
                                    <input type="date" class="form-control" id="filterDateTo" value="${today}">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label"><i class="bi bi-tag me-1"></i>Status</label>
                                    <select class="form-select" id="filterBookingStatus">
                                        <option value="">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label"><i class="bi bi-credit-card me-1"></i>Payment</label>
                                    <select class="form-select" id="filterPaymentStatus">
                                        <option value="">All Payment</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="PARTIAL">Partial</option>
                                        <option value="FULL">Full Paid</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label"><i class="bi bi-search me-1"></i>Search</label>
                                    <input type="text" class="form-control" id="filterSearch" placeholder="Order # / Name...">
                                </div>
                                <div class="col-md-2">
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-primary flex-grow-1" id="btnApplyFilter">
                                            <i class="bi bi-funnel"></i> Filter
                                        </button>
                                        <button class="btn btn-outline-secondary" id="btnClearFilter" title="Clear Filters">
                                            <i class="bi bi-x-circle"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Orders Table -->
                    <div class="card table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-table me-2"></i>Sales Orders</h5>
                            <button class="btn btn-sm btn-outline-primary" id="btnRefresh">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="ordersTable" class="table table-hover align-middle">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Order #</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Items</th>
                                            <th class="text-end">Amount</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Payment</th>
                                            <th class="text-center" style="width: 140px;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Data will be loaded here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Initialize animations
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
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.6,
                        stagger: 0.1,
                        ease: 'power2.out',
                        clearProps: 'all'
                    }
                );
                
                // Header icon pulse animation
                gsap.to('.pos-sales-header-icon', {
                    scale: 1.1,
                    duration: 1.5,
                    ease: 'power1.inOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            const ns = '.' + this.eventNamespace;
            
            // New Order button
            $('#btnNewOrder').on('click' + ns, function() {
                self.navigateToCreate();
            });
            
            // Print Report button
            $('#btnPrintReport').on('click' + ns, function() {
                self.openReportPrint();
            });
            
            // Refresh button
            $('#btnRefresh').on('click' + ns, function() {
                const $btn = $(this);
                $btn.find('i').addClass('spin-animation');
                self.loadData(self.getCurrentFilters());
                setTimeout(() => $btn.find('i').removeClass('spin-animation'), 1000);
            });
            
            // Filter buttons
            $('#btnApplyFilter').on('click' + ns, function() {
                self.applyFilters();
            });
            
            $('#btnClearFilter').on('click' + ns, function() {
                self.clearFilters();
            });
            
            // Search on Enter key
            $('#filterSearch').on('keypress' + ns, function(e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });
            
            // Date change auto-filter
            $('#filterDateFrom, #filterDateTo').on('change' + ns, function() {
                // Optional: Auto-apply filters on date change
                // self.applyFilters();
            });
            
            // Table row actions (delegated)
            $('#ordersTable tbody').on('click' + ns, '.btn-view', function() {
                const id = $(this).data('id');
                self.viewOrder(id);
            });
            
            $('#ordersTable tbody').on('click' + ns, '.btn-print', function() {
                const id = $(this).data('id');
                self.printOrder(id);
            });
            
            $('#ordersTable tbody').on('click' + ns, '.btn-cancel', function() {
                const id = $(this).data('id');
                const orderNumber = $(this).data('number');
                self.cancelOrder(id, orderNumber);
            });
            
            // Button hover animations
            if (typeof gsap !== 'undefined') {
                $('.btn-lg, .stat-card').on('mouseenter' + ns, function() {
                    gsap.to($(this), {
                        scale: 1.02,
                        duration: 0.2,
                        ease: 'power1.out'
                    });
                }).on('mouseleave' + ns, function() {
                    gsap.to($(this), {
                        scale: 1,
                        duration: 0.2
                    });
                });
            }
        },
        
        // Load data from API
        loadData: function(filters = {}) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            // Build query params
            const params = new URLSearchParams();
            if (filters.from_date) params.append('from_date', filters.from_date);
            if (filters.to_date) params.append('to_date', filters.to_date);
            if (filters.booking_status) params.append('status', filters.booking_status);
            if (filters.payment_status) params.append('payment_status', filters.payment_status);
            if (filters.search) params.append('search', filters.search);
            params.append('per_page', '100');
            
            const queryString = params.toString() ? '?' + params.toString() : '';
            
            TempleAPI.get(`/pos-sales/orders${queryString}`)
                .done(function(response) {
                    if (response.success) {
                        self.ordersData = response.data || [];
                        self.pagination = response.pagination || null;
                        self.renderTable();
                        self.updateStats(self.ordersData);
                        self.animateTableRows();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load orders', 'error');
                        self.ordersData = [];
                        self.renderTable();
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load orders:', xhr);
                    
                    // Load demo data for development
                    self.loadDemoData();
                    self.renderTable();
                    self.updateStats(self.ordersData);
                    self.animateTableRows();
                    
                    TempleCore.showToast('Using demo data - API unavailable', 'warning');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Load demo data for development
        loadDemoData: function() {
            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];
            
            this.ordersData = [
                {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    booking_number: 'SLBD2025011500000001',
                    booking_date: formatDate(today),
                    booking_status: 'CONFIRMED',
                    payment_status: 'FULL',
                    total_amount: 113.00,
                    paid_amount: 113.00,
                    items_count: 3,
                    devotee: { name: 'John Tan Ah Kow', phone: '123456789' },
                    payment: { payment_method: 'Cash', payment_reference: 'PYD2025011500000001' },
                    created_at: today.toISOString()
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    booking_number: 'SLBD2025011500000002',
                    booking_date: formatDate(today),
                    booking_status: 'CONFIRMED',
                    payment_status: 'PARTIAL',
                    total_amount: 250.00,
                    paid_amount: 150.00,
                    items_count: 5,
                    devotee: { name: 'Mary Lim', phone: '987654321' },
                    payment: { payment_method: 'QR Pay', payment_reference: 'PYD2025011500000002' },
                    created_at: today.toISOString()
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440003',
                    booking_number: 'SLBD2025011400000001',
                    booking_date: formatDate(new Date(today.setDate(today.getDate() - 1))),
                    booking_status: 'COMPLETED',
                    payment_status: 'FULL',
                    total_amount: 88.00,
                    paid_amount: 88.00,
                    items_count: 1,
                    devotee: { name: null },
                    payment: { payment_method: 'Credit Card', payment_reference: 'PYD2025011400000001' },
                    created_at: today.toISOString()
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440004',
                    booking_number: 'SLBD2025011300000001',
                    booking_date: formatDate(new Date(today.setDate(today.getDate() - 1))),
                    booking_status: 'CANCELLED',
                    payment_status: 'PENDING',
                    total_amount: 50.00,
                    paid_amount: 0,
                    items_count: 2,
                    devotee: { name: 'Wong Mei Ling', phone: '555123456' },
                    payment: null,
                    created_at: today.toISOString()
                },
                {
                    id: '550e8400-e29b-41d4-a716-446655440005',
                    booking_number: 'SLBD2025011200000001',
                    booking_date: formatDate(new Date(today.setDate(today.getDate() - 1))),
                    booking_status: 'CONFIRMED',
                    payment_status: 'FULL',
                    total_amount: 175.50,
                    paid_amount: 175.50,
                    items_count: 4,
                    devotee: { name: 'Chen Wei Ming', phone: '666789012' },
                    payment: { payment_method: 'Cash', payment_reference: 'PYD2025011200000001' },
                    created_at: today.toISOString()
                }
            ];
        },
        
        // Render table
        renderTable: function() {
            const self = this;
            const currency = TempleCore.getCurrency() || 'RM';
            
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            const tableBody = this.ordersData.map(order => {
                const customerName = order.devotee?.name || '<span class="text-muted">Walk-in</span>';
                const statusBadge = this.getStatusBadge(order.booking_status);
                const paymentBadge = this.getPaymentBadge(order.payment_status);
                const formattedDate = this.formatDate(order.booking_date);
                const formattedAmount = this.formatCurrency(order.total_amount);
                
                // Disable cancel button for completed/cancelled orders
                const canCancel = !['COMPLETED', 'CANCELLED'].includes(order.booking_status);
                const cancelBtnClass = canCancel ? 'btn-outline-danger' : 'btn-outline-secondary disabled';
                
                return `
                    <tr data-id="${order.id}">
                        <td>
                            <span class="order-number fw-semibold">${order.booking_number}</span>
                        </td>
                        <td>
                            <span class="text-muted">${formattedDate}</span>
                        </td>
                        <td>${customerName}</td>
                        <td>
                            <span class="badge bg-light text-dark">${order.items_count || 0} items</span>
                        </td>
                        <td class="text-end">
                            <span class="fw-semibold">${currency} ${formattedAmount}</span>
                        </td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">${paymentBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary btn-view" data-id="${order.id}" title="View Details">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-success btn-print" data-id="${order.id}" title="Print Receipt">
                                    <i class="bi bi-printer"></i>
                                </button>
                                <button class="btn ${cancelBtnClass} btn-cancel" data-id="${order.id}" data-number="${order.booking_number}" title="Cancel Order" ${canCancel ? '' : 'disabled'}>
                                    <i class="bi bi-x-circle"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            $('#ordersTable tbody').html(tableBody || '<tr><td colspan="8" class="text-center text-muted py-4">No orders found</td></tr>');
            
            // Initialize DataTable
            this.dataTable = $('#ordersTable').DataTable({
                paging: true,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
                ordering: true,
                order: [[0, 'desc']],
                searching: false, // We have our own search
                info: true,
                responsive: true,
                language: {
                    emptyTable: "No sales orders found",
                    info: "Showing _START_ to _END_ of _TOTAL_ orders",
                    infoEmpty: "No orders available",
                    lengthMenu: "Show _MENU_ orders"
                },
                columnDefs: [
                    { orderable: false, targets: [7] } // Actions column
                ]
            });
        },
        
        // Animate table rows
        animateTableRows: function() {
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('#ordersTable tbody tr',
                    { x: -30, opacity: 0 },
                    {
                        x: 0,
                        opacity: 1,
                        duration: 0.4,
                        stagger: 0.05,
                        ease: 'power2.out',
                        clearProps: 'all'
                    }
                );
            }
        },
        
        // Get status badge HTML
        getStatusBadge: function(status) {
            const badges = {
                'PENDING': '<span class="badge bg-secondary">Pending</span>',
                'CONFIRMED': '<span class="badge bg-primary">Confirmed</span>',
                'COMPLETED': '<span class="badge bg-success">Completed</span>',
                'CANCELLED': '<span class="badge bg-danger">Cancelled</span>'
            };
            return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
        },
        
        // Get payment badge HTML
        getPaymentBadge: function(status) {
            const badges = {
                'PENDING': '<span class="badge bg-warning text-dark">Pending</span>',
                'PARTIAL': '<span class="badge bg-info">Partial</span>',
                'FULL': '<span class="badge bg-success">Full Paid</span>'
            };
            return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
        },
        
        // Update statistics
        updateStats: function(data) {
            const totalOrders = data.length;
            const totalSales = data.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
            
            // Today's orders
            const today = new Date().toISOString().split('T')[0];
            const todayOrders = data.filter(item => item.booking_date === today).length;
            
            // Confirmed orders
            const confirmedOrders = data.filter(item => item.booking_status === 'CONFIRMED').length;
            
            // Animate counter updates
            this.animateCounter('#totalOrders', 0, totalOrders, 800);
            this.animateCounter('#totalSales', 0, totalSales, 1000, 'RM ');
            this.animateCounter('#todayOrders', 0, todayOrders, 800);
            this.animateCounter('#confirmedOrders', 0, confirmedOrders, 800);
        },
        
        // Animate counter
        animateCounter: function(selector, start, end, duration, prefix = '') {
            if (typeof gsap === 'undefined') {
                if (prefix === 'RM ') {
                    $(selector).text(prefix + end.toFixed(2));
                } else {
                    $(selector).text(end);
                }
                return;
            }
            
            const obj = { value: start };
            gsap.to(obj, {
                value: end,
                duration: duration / 1000,
                ease: 'power1.out',
                onUpdate: function() {
                    if (prefix === 'RM ') {
                        $(selector).text(prefix + obj.value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
                    } else {
                        $(selector).text(Math.round(obj.value));
                    }
                }
            });
        },
        
        // Get current filters
        getCurrentFilters: function() {
            const filters = {};
            
            const dateFrom = $('#filterDateFrom').val();
            const dateTo = $('#filterDateTo').val();
            const bookingStatus = $('#filterBookingStatus').val();
            const paymentStatus = $('#filterPaymentStatus').val();
            const search = $('#filterSearch').val();
            
            if (dateFrom) filters.from_date = dateFrom;
            if (dateTo) filters.to_date = dateTo;
            if (bookingStatus) filters.booking_status = bookingStatus;
            if (paymentStatus) filters.payment_status = paymentStatus;
            if (search) filters.search = search;
            
            return filters;
        },
        
        // Apply filters
        applyFilters: function() {
            const filters = this.getCurrentFilters();
            
            if (typeof gsap !== 'undefined') {
                gsap.to('#btnApplyFilter', {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1
                });
            }
            
            this.loadData(filters);
            TempleCore.showToast('Filters applied', 'info');
        },
        
        // Clear filters
        clearFilters: function() {
            const today = new Date().toISOString().split('T')[0];
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            
            $('#filterDateFrom').val(firstDayOfMonth);
            $('#filterDateTo').val(today);
            $('#filterBookingStatus').val('');
            $('#filterPaymentStatus').val('');
            $('#filterSearch').val('');
            
            this.loadData();
            TempleCore.showToast('Filters cleared', 'info');
        },
        
        // Navigate to create page
        navigateToCreate: function() {
            const self = this;
            
            if (typeof gsap !== 'undefined') {
                gsap.to('.pos-sales-list-page', {
                    opacity: 0,
                    y: -20,
                    duration: 0.3,
                    onComplete: () => {
                        self.cleanup();
                        TempleRouter.navigate('pos-sales/create');
                    }
                });
            } else {
                this.cleanup();
                TempleRouter.navigate('pos-sales/create');
            }
        },
        
        // View order
        viewOrder: function(id) {
            const self = this;
            console.log('View order:', id);
            
            if (typeof gsap !== 'undefined') {
                gsap.to('.pos-sales-list-page', {
                    opacity: 0,
                    x: -30,
                    duration: 0.3,
                    onComplete: () => {
                        self.cleanup();
                        TempleRouter.navigate('pos-sales/view', { id: id });
                    }
                });
            } else {
                this.cleanup();
                TempleRouter.navigate('pos-sales/view', { id: id });
            }
        },
        
        // Print order
        printOrder: function(id) {
            const self = this;
            const $printBtn = $(`.btn-print[data-id="${id}"]`);
            const originalHtml = $printBtn.html();
            
            $printBtn.html('<i class="bi bi-hourglass-split"></i>').prop('disabled', true);
            
            if (typeof gsap !== 'undefined') {
                gsap.to($printBtn[0], {
                    scale: 1.2,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        // Open print page in new window
                        const printUrl = TempleCore.buildTempleUrl(`/pos-sales/print?id=${encodeURIComponent(id)}&type=single`);
                        const printWindow = window.open(printUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
                        
                        if (!printWindow) {
                            TempleCore.showToast('Please allow popups to print receipt', 'warning');
                            self.cleanup();
                            TempleRouter.navigate('pos-sales/print', { id: id, type: 'single' });
                        }
                        
                        setTimeout(() => {
                            $printBtn.html(originalHtml).prop('disabled', false);
                        }, 500);
                    }
                });
            } else {
                const printUrl = TempleCore.buildTempleUrl(`/pos-sales/print?id=${encodeURIComponent(id)}&type=single`);
                window.open(printUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
                $printBtn.html(originalHtml).prop('disabled', false);
            }
            
            TempleCore.showToast('Opening receipt print...', 'info');
        },
        
        // Open report print
        openReportPrint: function() {
            console.log('Opening POS Sales report print...');
            
            const filters = {
                dateFrom: $('#filterDateFrom').val(),
                dateTo: $('#filterDateTo').val(),
                bookingStatus: $('#filterBookingStatus').val(),
                paymentStatus: $('#filterPaymentStatus').val()
            };
            
            this.cleanup();
            TempleRouter.navigate('pos-sales/report', filters);
        },
        
        // Cancel order
        cancelOrder: function(id, orderNumber) {
            const self = this;
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Cancel Order?',
                    html: `Are you sure you want to cancel order <strong>${orderNumber}</strong>?<br><br>This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: '<i class="bi bi-x-circle"></i> Yes, Cancel Order',
                    cancelButtonText: 'No, Keep It'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.performCancel(id, orderNumber);
                    }
                });
            } else {
                if (confirm(`Are you sure you want to cancel order "${orderNumber}"?\n\nThis action cannot be undone.`)) {
                    this.performCancel(id, orderNumber);
                }
            }
        },
        
        // Perform cancel API call
        performCancel: function(id, orderNumber) {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/pos-sales/orders/${id}/cancel`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(`Order ${orderNumber} cancelled successfully`, 'success');
                        
                        // Animate row and reload
                        if (typeof gsap !== 'undefined') {
                            const row = $(`.btn-cancel[data-id="${id}"]`).closest('tr');
                            gsap.to(row[0], {
                                opacity: 0,
                                x: -50,
                                backgroundColor: '#ffcccc',
                                duration: 0.3,
                                onComplete: () => {
                                    self.loadData(self.getCurrentFilters());
                                }
                            });
                        } else {
                            self.loadData(self.getCurrentFilters());
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to cancel order', 'error');
                    }
                })
                .fail(function(xhr) {
                    let errorMessage = 'Failed to cancel order';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    TempleCore.showToast(errorMessage, 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Helper: Format date
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },
        
        // Helper: Format currency
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }
    };
    
    // Alias for compatibility
    window.POSSalesIndexPage = window.PosSalesIndexPage;
    
})(jQuery, window);