// js/pages/pos-sales/view.js
// POS Sales Order View Page - Read Only Detail View with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    // Shared Module Management
    if (!window.POSSalesPageSharedModule) {
        window.POSSalesPageSharedModule = {
            moduleId: 'pos-sales',
            eventNamespace: 'pos-sales',
            cssId: 'pos-sales-css',
            cssPath: '/css/pos-sales-pages.css',
            activePages: new Set(),
            
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
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`POS Sales page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`POS Sales page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
    
    window.PosSalesViewPage = {
        pageId: 'pos-sales-view',
        eventNamespace: window.POSSalesPageSharedModule.eventNamespace,
        orderId: null,
        orderData: null,
        intervals: [],
        timeouts: [],
        
        // Page initialization
        init: function(params) {
            window.POSSalesPageSharedModule.registerPage(this.pageId);
            
            this.orderId = params?.id || null;
            
            if (!this.orderId) {
                TempleCore.showToast('Order ID is required', 'error');
                this.navigateBack();
                return;
            }
            
            this.renderLoading();
            this.loadOrderData();
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
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            this.orderData = null;
            this.orderId = null;
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render loading state
        renderLoading: function() {
            const html = `
                <div class="pos-sales-view-page">
                    <div class="pos-sales-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="pos-sales-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="pos-sales-title-wrapper">
                                        <i class="bi bi-receipt-cutoff pos-sales-header-icon"></i>
                                        <div>
                                            <h1 class="pos-sales-title">Order Details</h1>
                                            <p class="pos-sales-subtitle">Loading...</p>
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
                        <p class="mt-3 text-muted">Loading order details...</p>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.bindBackButton();
        },
        
        // Load order data from API
        loadOrderData: function() {
            const self = this;
            
            TempleAPI.get(`/sales/orders/${this.orderId}`)
                .done(function(response) {
                    if (response.success && response.data) {
                        self.orderData = response.data;
                        self.render();
                        self.initAnimations();
                        self.bindEvents();
                    } else {
                        TempleCore.showToast(response.message || 'Order not found', 'error');
                        self.navigateBack();
                    }
                })
                .fail(function(xhr) {
                    console.error('Failed to load order:', xhr);
                    
                    // Load demo data for development
                    if (xhr.status === 0 || xhr.status === 404) {
                        self.loadDemoData();
                        self.render();
                        self.initAnimations();
                        self.bindEvents();
                        TempleCore.showToast('Using demo data - API unavailable', 'warning');
                    } else {
                        let errorMessage = 'Failed to load order details';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                        TempleCore.showToast(errorMessage, 'error');
                        self.navigateBack();
                    }
                });
        },
        
        // Load demo data
        loadDemoData: function() {
            this.orderData = {
                id: this.orderId,
                booking_number: 'SLBD2025011500000001',
                booking_type: 'SALES',
                booking_date: new Date().toISOString().split('T')[0],
                booking_status: 'CONFIRMED',
                payment_status: 'FULL',
                subtotal: 113.00,
                discount_amount: 0,
                deposit_amount: 0,
                total_amount: 113.00,
                paid_amount: 113.00,
                balance_amount: 0,
                print_option: 'SINGLE_PRINT',
                special_instructions: '',
                items: [
                    {
                        id: '1',
                        item_id: 1,
                        deity_id: 1,
                        item_type: 'General',
                        item_name: 'Blessed String',
                        item_name_secondary: '',
                        short_code: 'BLS',
                        quantity: 2,
                        unit_price: 5.00,
                        total_price: 10.00,
                        status: 'COMPLETED'
                    },
                    {
                        id: '2',
                        item_id: 2,
                        deity_id: 1,
                        item_type: 'General',
                        item_name: 'Lotus Lamp',
                        item_name_secondary: '',
                        short_code: 'LTL',
                        quantity: 3,
                        unit_price: 5.00,
                        total_price: 15.00,
                        status: 'COMPLETED'
                    },
                    {
                        id: '3',
                        item_id: 3,
                        deity_id: 1,
                        item_type: 'Vehicle',
                        item_name: 'Vehicle Blessing',
                        item_name_secondary: '',
                        short_code: 'VBL',
                        quantity: 1,
                        unit_price: 88.00,
                        total_price: 88.00,
                        status: 'COMPLETED'
                    }
                ],
                items_count: 3,
                devotee: {
                    name: 'John Tan Ah Kow',
                    email: 'john.tan@email.com',
                    nric: '880515-14-5678',
                    phone_code: '+60',
                    phone: '123456789',
                    dob: '1988-05-15',
                    address: '123 Jalan Temple, Taman Sri, 12345 Kuala Lumpur',
                    remarks: 'Regular devotee'
                },
                payment: {
                    id: 'pay-001',
                    amount: 113.00,
                    payment_reference: 'PYD2025011500000001',
                    payment_method: 'Cash',
                    payment_status: 'SUCCESS',
                    payment_date: new Date().toISOString()
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: {
                    id: 'user-001',
                    name: 'Admin User'
                }
            };
        },
        
        // Render page HTML
        render: function() {
            const data = this.orderData;
            const currency = TempleCore.getCurrency() || 'RM';
            
            const statusBadge = this.getStatusBadge(data.booking_status);
            const paymentBadge = this.getPaymentBadge(data.payment_status);
            const printOptionBadge = this.getPrintOptionBadge(data.print_option);
            
            // Build items table
            const itemsHtml = this.buildItemsTable(data.items);
            
            // Build devotee info
            const devoteeHtml = this.buildDevoteeInfo(data.devotee);
            
            // Build payment info
            const paymentHtml = this.buildPaymentInfo(data.payment, currency);
            
            const html = `
                <div class="pos-sales-view-page">
                    <!-- Page Header -->
                    <div class="pos-sales-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="pos-sales-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="pos-sales-title-wrapper">
                                        <i class="bi bi-receipt-cutoff pos-sales-header-icon"></i>
                                        <div>
                                            <h1 class="pos-sales-title">${data.booking_number}</h1>
                                            <p class="pos-sales-subtitle">Order Details</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-outline-light btn-lg" id="btnPrint">
                                            <i class="bi bi-printer"></i> Print Receipt
                                        </button>
                                        <button class="btn btn-outline-light btn-lg" id="btnBack">
                                            <i class="bi bi-arrow-left"></i> Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Status Cards -->
                    <div class="row mb-4" data-aos="fade-up" data-aos-duration="800">
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-event"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Order Date</div>
                                        <div class="stat-value fs-6">${this.formatDate(data.booking_date)}</div>
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
                                        <div class="stat-label">Total Amount</div>
                                        <div class="stat-value fs-6">${currency} ${this.formatCurrency(data.total_amount)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-info">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-tag"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Status</div>
                                        <div class="stat-value fs-6">${statusBadge}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3 col-6 mb-3">
                            <div class="card stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-credit-card"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Payment</div>
                                        <div class="stat-value fs-6">${paymentBadge}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <!-- Main Content Column -->
                        <div class="col-lg-8">
                            <!-- Order Items Card -->
                            <div class="card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                                <div class="card-header bg-primary text-white">
                                    <h5 class="mb-0"><i class="bi bi-cart3 me-2"></i>Order Items (${data.items_count || data.items?.length || 0})</h5>
                                </div>
                                <div class="card-body p-0">
                                    ${itemsHtml}
                                </div>
                            </div>

                            <!-- Amount Summary Card -->
                            <div class="card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="150">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="bi bi-calculator me-2"></i>Amount Summary</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <table class="table table-borderless mb-0">
                                                <tr>
                                                    <td class="text-muted">Subtotal:</td>
                                                    <td class="text-end fw-semibold">${currency} ${this.formatCurrency(data.subtotal)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Discount:</td>
                                                    <td class="text-end ${parseFloat(data.discount_amount) > 0 ? 'text-danger' : ''}">${parseFloat(data.discount_amount) > 0 ? '-' : ''} ${currency} ${this.formatCurrency(data.discount_amount)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Deposit:</td>
                                                    <td class="text-end">${currency} ${this.formatCurrency(data.deposit_amount)}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        <div class="col-md-6">
                                            <table class="table table-borderless mb-0">
                                                <tr class="fs-5">
                                                    <td class="fw-bold text-primary">Total:</td>
                                                    <td class="text-end fw-bold text-primary">${currency} ${this.formatCurrency(data.total_amount)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Paid:</td>
                                                    <td class="text-end text-success fw-semibold">${currency} ${this.formatCurrency(data.paid_amount)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Balance:</td>
                                                    <td class="text-end ${parseFloat(data.balance_amount) > 0 ? 'text-danger fw-semibold' : ''}">${currency} ${this.formatCurrency(data.balance_amount)}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Special Instructions -->
                            ${data.special_instructions ? `
                            <div class="card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="bi bi-chat-left-text me-2"></i>Special Instructions</h5>
                                </div>
                                <div class="card-body">
                                    <p class="mb-0">${data.special_instructions}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Sidebar Column -->
                        <div class="col-lg-4">
                            <!-- Customer Info Card -->
                            <div class="card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                                <div class="card-header bg-info text-white">
                                    <h5 class="mb-0"><i class="bi bi-person me-2"></i>Customer Details</h5>
                                </div>
                                <div class="card-body">
                                    ${devoteeHtml}
                                </div>
                            </div>

                            <!-- Payment Info Card -->
                            <div class="card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="150">
                                <div class="card-header bg-success text-white">
                                    <h5 class="mb-0"><i class="bi bi-credit-card-2-front me-2"></i>Payment Details</h5>
                                </div>
                                <div class="card-body">
                                    ${paymentHtml}
                                </div>
                            </div>

                            <!-- Order Meta Card -->
                            <div class="card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                                <div class="card-header">
                                    <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>Order Information</h5>
                                </div>
                                <div class="card-body">
                                    <div class="detail-item d-flex justify-content-between mb-2">
                                        <span class="text-muted">Order Type:</span>
                                        <span class="badge bg-secondary">${data.booking_type || 'SALES'}</span>
                                    </div>
                                    <div class="detail-item d-flex justify-content-between mb-2">
                                        <span class="text-muted">Print Option:</span>
                                        ${printOptionBadge}
                                    </div>
                                    <hr>
                                    <div class="detail-item d-flex justify-content-between mb-2">
                                        <span class="text-muted">Created By:</span>
                                        <span>${data.created_by?.name || '-'}</span>
                                    </div>
                                    <div class="detail-item d-flex justify-content-between mb-2">
                                        <span class="text-muted">Created At:</span>
                                        <span class="small">${this.formatDateTime(data.created_at)}</span>
                                    </div>
                                    <div class="detail-item d-flex justify-content-between">
                                        <span class="text-muted">Updated At:</span>
                                        <span class="small">${this.formatDateTime(data.updated_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons Card -->
                            <div class="card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="250">
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary btn-lg" id="btnPrintBottom">
                                            <i class="bi bi-printer me-2"></i>Print Receipt
                                        </button>
                                        ${!['COMPLETED', 'CANCELLED'].includes(data.booking_status) ? `
                                        <button class="btn btn-outline-danger" id="btnCancel">
                                            <i class="bi bi-x-circle me-2"></i>Cancel Order
                                        </button>
                                        ` : ''}
                                        <button class="btn btn-outline-secondary" id="btnBackBottom">
                                            <i class="bi bi-arrow-left me-2"></i>Back to List
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Build items table HTML
        buildItemsTable: function(items) {
            if (!items || items.length === 0) {
                return '<div class="p-4 text-center text-muted">No items found</div>';
            }
            
            const currency = TempleCore.getCurrency() || 'RM';
            
            const rows = items.map((item, index) => {
                const typeBadge = this.getItemTypeBadge(item.item_type);
                return `
                    <tr class="item-row">
                        <td class="text-center">${index + 1}</td>
                        <td>
                            <span class="badge bg-secondary me-1">${item.short_code || '-'}</span>
                        </td>
                        <td>
                            <div class="fw-semibold">${item.item_name}</div>
                            <small class="text-muted">${item.item_name_secondary || ''}</small>
                        </td>
                        <td class="text-center">${typeBadge}</td>
                        <td class="text-end">${currency} ${this.formatCurrency(item.unit_price)}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end fw-semibold">${currency} ${this.formatCurrency(item.total_price)}</td>
                    </tr>
                `;
            }).join('');
            
            return `
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th class="text-center" style="width: 50px;">#</th>
                                <th style="width: 80px;">Code</th>
                                <th>Item</th>
                                <th class="text-center" style="width: 100px;">Type</th>
                                <th class="text-end" style="width: 100px;">Price</th>
                                <th class="text-center" style="width: 60px;">Qty</th>
                                <th class="text-end" style="width: 120px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        },
        
        // Build devotee info HTML
        buildDevoteeInfo: function(devotee) {
            if (!devotee || !this.hasDevoteeData(devotee)) {
                return `
                    <div class="text-center text-muted py-3">
                        <i class="bi bi-person-x fs-1 mb-2 d-block"></i>
                        <p class="mb-0">Walk-in Customer<br><small>No details captured</small></p>
                    </div>
                `;
            }
            
            let html = '<div class="devotee-details">';
            
            if (devotee.name) {
                html += `
                    <div class="detail-item mb-2">
                        <i class="bi bi-person text-primary me-2"></i>
                        <strong>${devotee.name}</strong>
                    </div>
                `;
            }
            
            if (devotee.phone) {
                html += `
                    <div class="detail-item mb-2">
                        <i class="bi bi-telephone text-primary me-2"></i>
                        ${devotee.phone_code || ''} ${devotee.phone}
                    </div>
                `;
            }
            
            if (devotee.email) {
                html += `
                    <div class="detail-item mb-2">
                        <i class="bi bi-envelope text-primary me-2"></i>
                        ${devotee.email}
                    </div>
                `;
            }
            
            if (devotee.nric) {
                html += `
                    <div class="detail-item mb-2">
                        <i class="bi bi-card-text text-primary me-2"></i>
                        ${devotee.nric}
                    </div>
                `;
            }
            
            if (devotee.dob) {
                html += `
                    <div class="detail-item mb-2">
                        <i class="bi bi-calendar-heart text-primary me-2"></i>
                        ${this.formatDate(devotee.dob)}
                    </div>
                `;
            }
            
            if (devotee.address) {
                html += `
                    <div class="detail-item mb-2">
                        <i class="bi bi-geo-alt text-primary me-2"></i>
                        <span class="small">${devotee.address}</span>
                    </div>
                `;
            }
            
            if (devotee.remarks) {
                html += `
                    <hr>
                    <div class="detail-item">
                        <i class="bi bi-chat-dots text-primary me-2"></i>
                        <span class="small text-muted">${devotee.remarks}</span>
                    </div>
                `;
            }
            
            html += '</div>';
            return html;
        },
        
        // Build payment info HTML
        buildPaymentInfo: function(payment, currency) {
            if (!payment) {
                return `
                    <div class="text-center text-muted py-3">
                        <i class="bi bi-credit-card fs-1 mb-2 d-block"></i>
                        <p class="mb-0">No payment recorded</p>
                    </div>
                `;
            }
            
            const statusBadge = payment.payment_status === 'SUCCESS' 
                ? '<span class="badge bg-success">Success</span>'
                : `<span class="badge bg-warning">${payment.payment_status}</span>`;
            
            return `
                <div class="payment-details">
                    <div class="detail-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Method:</span>
                        <span class="fw-semibold">${payment.payment_method || '-'}</span>
                    </div>
                    <div class="detail-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Reference:</span>
                        <span class="font-monospace small">${payment.payment_reference || '-'}</span>
                    </div>
                    <div class="detail-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Amount:</span>
                        <span class="fw-bold text-success">${currency} ${this.formatCurrency(payment.amount)}</span>
                    </div>
                    <div class="detail-item d-flex justify-content-between mb-2">
                        <span class="text-muted">Status:</span>
                        ${statusBadge}
                    </div>
                    <div class="detail-item d-flex justify-content-between">
                        <span class="text-muted">Date:</span>
                        <span class="small">${this.formatDateTime(payment.payment_date)}</span>
                    </div>
                </div>
            `;
        },
        
        // Check if devotee has any data
        hasDevoteeData: function(devotee) {
            if (!devotee) return false;
            return devotee.name || devotee.email || devotee.phone || devotee.nric || devotee.address;
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
        
        // Get print option badge HTML
        getPrintOptionBadge: function(option) {
            const badges = {
                'NO_PRINT': '<span class="badge bg-secondary">No Print</span>',
                'SINGLE_PRINT': '<span class="badge bg-primary">Single Receipt</span>',
                'SEP_PRINT': '<span class="badge bg-info">Separate Receipts</span>'
            };
            return badges[option] || `<span class="badge bg-secondary">${option}</span>`;
        },
        
        // Get item type badge HTML
        getItemTypeBadge: function(type) {
            const badges = {
                'General': '<span class="badge bg-primary">General</span>',
                'Vehicle': '<span class="badge bg-info">Vehicle</span>',
                'Token': '<span class="badge bg-warning text-dark">Token</span>',
                'Special': '<span class="badge bg-success">Special</span>'
            };
            return badges[type] || `<span class="badge bg-secondary">${type}</span>`;
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
                        stagger: 0.03,
                        ease: 'power2.out',
                        delay: 0.3,
                        clearProps: 'all'
                    }
                );
                
                // Animate table rows
                gsap.fromTo('.item-row',
                    { x: -30, opacity: 0 },
                    {
                        x: 0,
                        opacity: 1,
                        duration: 0.3,
                        stagger: 0.05,
                        ease: 'power2.out',
                        delay: 0.4,
                        clearProps: 'all'
                    }
                );
                
                // Header icon animation
                gsap.to('.pos-sales-header-icon', {
                    rotateY: 360,
                    duration: 2,
                    ease: 'power1.inOut'
                });
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            const ns = '.' + this.eventNamespace;
            
            this.bindBackButton();
            
            // Print buttons
            $('#btnPrint, #btnPrintBottom').on('click' + ns, function() {
                self.printOrder();
            });
            
            // Cancel button
            $('#btnCancel').on('click' + ns, function() {
                self.cancelOrder();
            });
            
            // Button hover animations
            if (typeof gsap !== 'undefined') {
                $('.btn, .card').on('mouseenter' + ns, function() {
                    if (!$(this).hasClass('stat-card')) {
                        gsap.to($(this), {
                            scale: 1.02,
                            duration: 0.2,
                            ease: 'power1.out'
                        });
                    }
                }).on('mouseleave' + ns, function() {
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
            const ns = '.' + this.eventNamespace;
            
            $('#btnBack, #btnBackBottom').off('click').on('click' + ns, function() {
                if (typeof gsap !== 'undefined') {
                    gsap.to('.pos-sales-view-page', {
                        opacity: 0,
                        x: 30,
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
        
        // Print order
        printOrder: function() {
            const self = this;
            const data = this.orderData;
            
            // Open print page in new window
            const printUrl = TempleCore.buildTempleUrl(`/pos-sales/print?id=${encodeURIComponent(data.id)}&type=single`);
            const printWindow = window.open(printUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print receipt', 'warning');
                
                // Alternative: Navigate using router
                if (typeof TempleRouter !== 'undefined') {
                    this.cleanup();
                    TempleRouter.navigate('pos-sales/print', { 
                        id: data.id,
                        type: 'single' 
                    });
                }
            } else {
                TempleCore.showToast('Opening receipt print...', 'info');
            }
        },
        
        // Cancel order
        cancelOrder: function() {
            const self = this;
            const data = this.orderData;
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Cancel Order?',
                    html: `Are you sure you want to cancel order <strong>${data.booking_number}</strong>?<br><br>This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: '<i class="bi bi-x-circle"></i> Yes, Cancel Order',
                    cancelButtonText: 'No, Keep It'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.performCancel();
                    }
                });
            } else {
                if (confirm(`Are you sure you want to cancel order "${data.booking_number}"?\n\nThis action cannot be undone.`)) {
                    this.performCancel();
                }
            }
        },
        
        // Perform cancel API call
        performCancel: function() {
            const self = this;
            const data = this.orderData;
            
            TempleCore.showLoading(true);
            
            TempleAPI.post(`/sales/orders/${this.orderId}/cancel`)
                .done(function(response) {
                    if (response.success) {
                        TempleCore.showToast(`Order ${data.booking_number} cancelled successfully`, 'success');
                        self.navigateBack();
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
        
        // Navigate back to list
        navigateBack: function() {
            this.cleanup();
            TempleRouter.navigate('pos-sales');
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
        
        // Helper: Format datetime
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
        
        // Helper: Format currency
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }
    };
    
    // Alias for compatibility
    window.POSSalesViewPage = window.PosSalesViewPage;
    
})(jQuery, window);