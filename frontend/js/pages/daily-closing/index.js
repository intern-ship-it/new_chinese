// js/pages/daily-closing/index.js
(function ($, window) {
    'use strict';

    // ================================================================
    // SHARED MODULE - Used by all Daily Closing pages
    // ================================================================
    if (!window.dailyClosingSharedModule) {
        window.dailyClosingSharedModule = {
            moduleId: 'daily-closing',
            eventNamespace: 'daily-closing',
            cssId: 'daily-closing-css',
            cssPath: '/css/daily-closing.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                if (typeof gsap !== 'undefined') gsap.killTweensOf("*");
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }

    // ================================================================
    // UNIFIED DAILY CLOSING PAGE
    // ================================================================
    window.DailyClosingPage = {
        pageId: 'daily-closing-unified',
        eventNamespace: window.dailyClosingSharedModule.eventNamespace,

        // Data stores
        salesTransactions: [],
        salesSummary: {},
        donationTransactions: [],
        donationSummary: {},
        buddhaLampTransactions: [],
        buddhaLampSummary: {},
        templeEventsTransactions: [],
        templeEventsSummary: {},
        paymentModes: [],
        staffList: [],
        accessInfo: { is_full_access: true, user_type: 'SUPER_ADMIN' },
        filters: { from_date: '', to_date: '', payment_mode_id: '', created_by: '' },

        init: function (params) {
            window.dailyClosingSharedModule.registerPage(this.pageId);
            const today = this.formatDate(new Date());
            this.filters.from_date = today;
            this.filters.to_date = today;
            this.render();
            this.initAnimations();
            this.loadFilterData();
            this.bindEvents();
            
            // Auto-load today's data on page initialization
            this.loadData();
        },

        cleanup: function () {
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            if (typeof gsap !== 'undefined') gsap.killTweensOf(`.${this.pageId}-page *`);
            window.dailyClosingSharedModule.unregisterPage(this.pageId);
        },

        formatDate: function(date) {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        },

        formatDisplayDate: function(dateStr) {
            if (!dateStr) return 'N/A';
            const d = new Date(dateStr);
            return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        },

        formatCurrency: function(amount) {
            const currency = (typeof TempleCore !== 'undefined' && TempleCore.getCurrency) ? TempleCore.getCurrency() : 'RM';
            return currency + ' ' + parseFloat(amount || 0).toFixed(2);
        },

        isAdminUser: function() {
            try {
                const storageKey = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE && APP_CONFIG.STORAGE.USER ? APP_CONFIG.STORAGE.USER : 'user';
                const user = JSON.parse(localStorage.getItem(storageKey) || '{}');
                return ['SUPER_ADMIN', 'ADMIN'].includes(user.user_type);
            } catch (e) { return false; }
        },

        render: function () {
            const today = this.formatDate(new Date());
            const isAdmin = this.isAdminUser();
            
            const html = `
                <div class="daily-closing-page">
                    <!-- Page Header with Animation (Donations Style) -->
                    <div class="daily-closing-header">
                        <div class="daily-closing-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="daily-closing-title-wrapper">
                                        <i class="bi bi-calendar-check-fill daily-closing-header-icon"></i>
                                        <div>
                                            <h1 class="daily-closing-title">Daily Closing</h1>
                                            <p class="daily-closing-subtitle">每日结算 • Consolidated Report</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnPrint" disabled>
                                        <i class="bi bi-printer-fill me-2"></i>Print Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Section (Donations Style) -->
                    <div class="container-fluid mt-4">
                        <div class="card shadow-sm border-0" style="border-radius: 12px;">
                            <div class="card-body" style="padding: 25px;">
                                <div class="row g-3">
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold" style="color: #495057; font-size: 13px;">From Date 从日期</label>
                                        <input type="date" class="form-control" id="filterFromDate" value="${today}" style="border-radius: 6px;">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold" style="color: #495057; font-size: 13px;">To Date 至日期</label>
                                        <input type="date" class="form-control" id="filterToDate" value="${today}" style="border-radius: 6px;">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label fw-semibold" style="color: #495057; font-size: 13px;">Payment Method 付款方式</label>
                                        <select class="form-select" id="filterPaymentMode" style="border-radius: 6px;">
                                            <option value="">All Methods</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2 ${isAdmin ? '' : 'd-none'}">
                                        <label class="form-label fw-semibold" style="color: #495057; font-size: 13px;">Created By 创建者</label>
                                        <select class="form-select" id="filterCreatedBy" style="border-radius: 6px;">
                                            <option value="">All Staff</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button class="btn btn-primary w-100" id="btnSearch" style="border-radius: 6px; padding: 10px; font-weight: 600;">
                                            <i class="bi bi-funnel-fill me-1"></i> Filter
                                        </button>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button class="btn btn-outline-secondary w-100" id="btnReset" style="border-radius: 6px; padding: 10px;">
                                            <i class="bi bi-arrow-counterclockwise me-1"></i> Reset
                                        </button>
                                    </div>
                                </div>
                                <div class="row mt-2">
                                    <div class="col-12">
                                        <button class="btn btn-sm btn-outline-primary" id="btnRefresh" style="border-radius: 6px;">
                                            <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Grand Total Summary (Stats Cards Style) -->
                    <div class="container-fluid mt-4" id="grandTotalSection" style="display: none;">
                        <div class="row g-3">
                            <div class="col-xl-2 col-md-4 col-sm-6">
                                <div class="stat-card stat-card-sales">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-cart4"></i>
                                    </div>
                                    <div class="stat-card-body">
                                        <div class="stat-label">Sales 销售</div>
                                        <div class="stat-value" id="grandSalesTotal">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-2 col-md-4 col-sm-6">
                                <div class="stat-card stat-card-donation">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-gift"></i>
                                    </div>
                                    <div class="stat-card-body">
                                        <div class="stat-label">Donation 捐款</div>
                                        <div class="stat-value" id="grandDonationTotal">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-2 col-md-4 col-sm-6">
                                <div class="stat-card stat-card-buddha">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-brightness-high"></i>
                                    </div>
                                    <div class="stat-card-body">
                                        <div class="stat-label">Buddha Lamp 佛灯</div>
                                        <div class="stat-value" id="grandBuddhaLampTotal">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-2 col-md-4 col-sm-6">
                                <div class="stat-card stat-card-temple">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-event"></i>
                                    </div>
                                    <div class="stat-card-body">
                                        <div class="stat-label">Temple Events 法会</div>
                                        <div class="stat-value" id="grandTempleEventsTotal">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-4 col-md-8 col-sm-12">
                                <div class="stat-card stat-card-grand-total">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calculator"></i>
                                    </div>
                                    <div class="stat-card-body">
                                        <div class="stat-label">GRAND TOTAL 总计</div>
                                        <div class="stat-value fs-3" id="grandTotal">RM 0.00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SALES SECTION -->
                    <div class="container-fluid mt-4" id="salesSection" style="display: none;">
                        <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                            <div class="card-header py-3 text-white" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-cart4-fill fs-4 me-2"></i>
                                        <div>
                                            <h5 class="mb-0">Sales Details 销售明细</h5>
                                            <small class="opacity-75">POS Sales Transactions</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-white text-primary" id="salesCount">0 transactions</span>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr>
                                                <th>#</th>
                                                <th>Date 日期</th>
                                                <th>Entry Code</th>
                                                <th>Booking No</th>
                                                <th>Payment 付款</th>
                                                <th class="text-center">Items 项目</th>
                                                <th class="text-end">Sub Total 小计</th>
                                                <th class="text-end">Discount 折扣</th>
                                                <th class="text-end">Total 总额</th>
                                            </tr>
                                        </thead>
                                        <tbody id="salesBody">
                                            <tr><td colspan="9" class="text-center py-4 text-muted">No data</td></tr>
                                        </tbody>
                                        <tfoot id="salesFooter" style="display: none; background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr style="font-weight: bold;">
                                                <td colspan="5" class="text-end">Sales Total 销售总计:</td>
                                                <td id="salesFooterItems" class="text-center">0</td>
                                                <td id="salesFooterSubTotal" class="text-end">RM 0.00</td>
                                                <td id="salesFooterDiscount" class="text-end">RM 0.00</td>
                                                <td id="salesFooterTotal" class="text-end fs-5">RM 0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- DONATION SECTION -->
                    <div class="container-fluid mt-4" id="donationSection" style="display: none;">
                        <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                            <div class="card-header py-3 text-white" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-gift-fill fs-4 me-2"></i>
                                        <div>
                                            <h5 class="mb-0">Donation Details 捐款明细</h5>
                                            <small class="opacity-75">Temple Donations & Pledges</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-white text-success" id="donationCount">0 donations</span>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr>
                                                <th>#</th>
                                                <th>Date 日期</th>
                                                <th>Booking No</th>
                                                <th>Donation Type 捐款类型</th>
                                                <th>Donor 捐款人</th>
                                                <th>Payment 付款</th>
                                                <th class="text-center">Pledge 承诺</th>
                                                <th class="text-end">Pledge Amt 承诺额</th>
                                                <th class="text-end">Paid 已付</th>
                                            </tr>
                                        </thead>
                                        <tbody id="donationBody">
                                            <tr><td colspan="9" class="text-center py-4 text-muted">No data</td></tr>
                                        </tbody>
                                        <tfoot id="donationFooter" style="display: none; background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr style="font-weight: bold;">
                                                <td colspan="6" class="text-end">Donation Total 捐款总计:</td>
                                                <td id="donationFooterPledgeCount" class="text-center">0 pledges</td>
                                                <td id="donationFooterPledgeAmount" class="text-end">RM 0.00</td>
                                                <td id="donationFooterTotal" class="text-end fs-5">RM 0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BUDDHA LAMP SECTION -->
                    <div class="container-fluid mt-4" id="buddhaLampSection" style="display: none;">
                        <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                            <div class="card-header py-3 text-white" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-brightness-high-fill fs-4 me-2"></i>
                                        <div>
                                            <h5 class="mb-0">Buddha Lamp Details 佛灯明细</h5>
                                            <small class="opacity-75">Buddha Lamp Offerings</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-white text-warning" id="buddhaLampCount">0 bookings</span>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr>
                                                <th>#</th>
                                                <th>Date 日期</th>
                                                <th>Booking No</th>
                                                <th>Lamp Type 佛灯类型</th>
                                                <th>Name (Chinese) 中文名</th>
                                                <th>Name (English) 英文名</th>
                                                <th>Payment 付款</th>
                                                <th class="text-end">Amount 金额</th>
                                            </tr>
                                        </thead>
                                        <tbody id="buddhaLampBody">
                                            <tr><td colspan="8" class="text-center py-4 text-muted">No data</td></tr>
                                        </tbody>
                                        <tfoot id="buddhaLampFooter" style="display: none; background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr style="font-weight: bold;">
                                                <td colspan="7" class="text-end">Buddha Lamp Total 佛灯总计:</td>
                                                <td id="buddhaLampFooterTotal" class="text-end fs-5">RM 0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TEMPLE EVENTS SECTION -->
                    <div class="container-fluid mt-4" id="templeEventsSection" style="display: none;">
                        <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                            <div class="card-header py-3 text-white" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-calendar-event-fill fs-4 me-2"></i>
                                        <div>
                                            <h5 class="mb-0">Temple Events Details 法会明细</h5>
                                            <small class="opacity-75">Special Occasions & Ceremonies</small>
                                        </div>
                                    </div>
                                    <span class="badge bg-white text-purple" id="templeEventsCount">0 bookings</span>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr>
                                                <th>#</th>
                                                <th>Date 日期</th>
                                                <th>Booking No</th>
                                                <th>Occasion 活动</th>
                                                <th>Devotee 信众</th>
                                                <th>Payment 付款</th>
                                                <th class="text-end">Discount 折扣</th>
                                                <th class="text-end">Deposit 订金</th>
                                                <th class="text-end">Total 总额</th>
                                            </tr>
                                        </thead>
                                        <tbody id="templeEventsBody">
                                            <tr><td colspan="9" class="text-center py-4 text-muted">No data</td></tr>
                                        </tbody>
                                        <tfoot id="templeEventsFooter" style="display: none; background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                            <tr style="font-weight: bold;">
                                                <td colspan="6" class="text-end">Temple Events Total 法会总计:</td>
                                                <td id="templeEventsFooterDiscount" class="text-end">RM 0.00</td>
                                                <td id="templeEventsFooterDeposit" class="text-end">RM 0.00</td>
                                                <td id="templeEventsFooterTotal" class="text-end fs-5">RM 0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- No Data -->
                    <div class="container-fluid mt-4" id="noDataSection">
                        <div class="card border-0 shadow-sm" style="border-radius: 12px;">
                            <div class="card-body text-center py-5">
                                <i class="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                                <h5 class="text-muted">No transactions found for today</h5>
                                <p class="text-muted">Adjust filters or select a different date range</p>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .text-purple { color: #7b1fa2 !important; }
                    .badge-pledge { background-color: #ffc107; color: #000; }
                    .badge-anonymous { background-color: #6c757d; color: #fff; }
                </style>
            `;

            $('#page-container').html(html);
        },

        initAnimations: function () {
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('.daily-closing-header', { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
                
                // Animate header icon like donations page
                gsap.to('.daily-closing-header-icon', {
                    y: -10,
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut'
                });
            }
        },

        loadFilterData: function() {
            const self = this;
            
            TempleAPI.get('/masters/payment-modes/active').done(function(response) {
                if (response.success && response.data) {
                    self.paymentModes = response.data;
                    let options = '<option value="">All Methods</option>';
                    response.data.forEach(mode => { options += `<option value="${mode.id}">${mode.name}</option>`; });
                    $('#filterPaymentMode').html(options);
                }
            });

            TempleAPI.get('/daily-closing/sales/staff').done(function(response) {
                if (response.success && response.data) {
                    self.staffList = response.data;
                    let options = '<option value="">All Staff</option>';
                    response.data.forEach(staff => { options += `<option value="${staff.id}">${staff.name}</option>`; });
                    $('#filterCreatedBy').html(options);
                }
            });
        },

        bindEvents: function() {
            const self = this;
            const ns = this.eventNamespace;

            $(document).on(`click.${ns}`, '#btnSearch, #btnRefresh', function() { self.loadData(); });
            $(document).on(`click.${ns}`, '#btnReset', function() { self.resetFilters(); });
            $(document).on(`click.${ns}`, '#btnPrint', function() { self.printReport(); });
            $(document).on(`keypress.${ns}`, '#filterFromDate, #filterToDate', function(e) { if (e.which === 13) self.loadData(); });
        },

        loadData: function() {
            const self = this;
            
            this.filters.from_date = $('#filterFromDate').val();
            this.filters.to_date = $('#filterToDate').val();
            this.filters.payment_mode_id = $('#filterPaymentMode').val();
            this.filters.created_by = $('#filterCreatedBy').val();

            if (!this.filters.from_date || !this.filters.to_date) {
                TempleCore.showToast('Please select both dates', 'warning');
                return;
            }

            if (new Date(this.filters.from_date) > new Date(this.filters.to_date)) {
                TempleCore.showToast('From Date cannot be greater than To Date', 'warning');
                return;
            }

            TempleCore.showLoading(true);
            $('#noDataSection').hide();

            const extractResponse = function(response) {
                if (Array.isArray(response)) {
                    return response[0];
                }
                return response;
            };

            $.when(
                TempleAPI.get('/daily-closing/sales', this.filters),
                TempleAPI.get('/daily-closing/donation', this.filters),
                TempleAPI.get('/daily-closing/buddha-lamp', this.filters),
                TempleAPI.get('/daily-closing/temple-events', this.filters)
            ).done(function(salesRes, donationRes, buddhaLampRes, templeEventsRes) {
                
                const salesData = extractResponse(salesRes);
                const donationData = extractResponse(donationRes);
                const buddhaLampData = extractResponse(buddhaLampRes);
                const templeEventsData = extractResponse(templeEventsRes);

                if (salesData && salesData.success && salesData.data) {
                    self.salesTransactions = salesData.data.transactions || [];
                    self.salesSummary = salesData.data.summary || {};
                    if (salesData.data.access_info) {
                        self.accessInfo = salesData.data.access_info;
                    }
                } else {
                    self.salesTransactions = [];
                    self.salesSummary = {};
                }

                if (donationData && donationData.success && donationData.data) {
                    self.donationTransactions = donationData.data.transactions || [];
                    self.donationSummary = donationData.data.summary || {};
                } else {
                    self.donationTransactions = [];
                    self.donationSummary = {};
                }

                if (buddhaLampData && buddhaLampData.success && buddhaLampData.data) {
                    self.buddhaLampTransactions = buddhaLampData.data.transactions || [];
                    self.buddhaLampSummary = buddhaLampData.data.summary || {};
                } else {
                    self.buddhaLampTransactions = [];
                    self.buddhaLampSummary = {};
                }

                if (templeEventsData && templeEventsData.success && templeEventsData.data) {
                    self.templeEventsTransactions = templeEventsData.data.transactions || [];
                    self.templeEventsSummary = templeEventsData.data.summary || {};
                } else {
                    self.templeEventsTransactions = [];
                    self.templeEventsSummary = {};
                }

                self.updateUI();
                self.enableExportButtons(true);
                
                const total = self.salesTransactions.length + 
                              self.donationTransactions.length +
                              self.buddhaLampTransactions.length + 
                              self.templeEventsTransactions.length;
                
                // if (total === 0) {
                //     TempleCore.showToast('No data found for selected period', 'info');
                // } else {
                //     TempleCore.showToast(`Loaded ${total} transaction(s)`, 'success');
                // }
            }).fail(function(xhr, status, error) {
                console.error('Failed to load daily closing data:', {xhr, status, error});
                TempleCore.showToast('Failed to load data: ' + (error || 'Unknown error'), 'error');
            }).always(function() {
                TempleCore.showLoading(false);
            });
        },

        resetFilters: function() {
            const today = this.formatDate(new Date());
            $('#filterFromDate').val(today);
            $('#filterToDate').val(today);
            $('#filterPaymentMode').val('');
            $('#filterCreatedBy').val('');
            this.filters = { from_date: today, to_date: today, payment_mode_id: '', created_by: '' };
            
            // Reload data with reset filters (today's data)
            this.loadData();
        },

        clearData: function() {
            this.salesTransactions = [];
            this.donationTransactions = [];
            this.buddhaLampTransactions = [];
            this.templeEventsTransactions = [];
            
            $('#salesSection, #donationSection, #buddhaLampSection, #templeEventsSection, #grandTotalSection').hide();
            $('#noDataSection').show();
            this.enableExportButtons(false);
        },

        updateUI: function() {
            this.updateSalesSection();
            this.updateDonationSection();
            this.updateBuddhaLampSection();
            this.updateTempleEventsSection();
            this.updateGrandTotal();
        },

        updateSalesSection: function() {
            const self = this;
            
            if (this.salesTransactions.length === 0) {
                $('#salesSection').hide();
                return;
            }

            $('#salesSection').show();
            let html = '';
            let totalItems = 0, totalSubTotal = 0, totalDiscount = 0, totalAmount = 0;

            this.salesTransactions.forEach((tx, index) => {
                const bookingItems = Array.isArray(tx.booking_items) ? tx.booking_items : [];
                const itemCount = bookingItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
                const discountAmount = parseFloat(tx.discount_amount) || 0;
                const totalAmt = parseFloat(tx.total_amount) || 0;
                const subTotal = totalAmt + discountAmount;
                
                totalItems += itemCount;
                totalSubTotal += subTotal;
                totalDiscount += discountAmount;
                totalAmount += totalAmt;

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${self.formatDisplayDate(tx.entry_date)}</td>
                        <td><span class="badge bg-light text-dark">${tx.entry_code || 'N/A'}</span></td>
                        <td>${tx.booking_number || 'N/A'}</td>
                        <td>${tx.payment_mode_name || 'N/A'}</td>
                        <td class="text-center">${itemCount}</td>
                        <td class="text-end">${self.formatCurrency(subTotal)}</td>
                        <td class="text-end">${self.formatCurrency(discountAmount)}</td>
                        <td class="text-end fw-bold">${self.formatCurrency(totalAmt)}</td>
                    </tr>
                `;
            });

            $('#salesBody').html(html);
            $('#salesCount').text(`${this.salesTransactions.length} transactions`);
            $('#salesFooterItems').text(totalItems);
            $('#salesFooterSubTotal').text(this.formatCurrency(totalSubTotal));
            $('#salesFooterDiscount').text(this.formatCurrency(totalDiscount));
            $('#salesFooterTotal').text(this.formatCurrency(totalAmount));
            $('#salesFooter').show();
        },

        updateDonationSection: function() {
            const self = this;
            
            if (this.donationTransactions.length === 0) {
                $('#donationSection').hide();
                return;
            }

            $('#donationSection').show();
            let html = '';
            let totalAmount = 0;
            let totalPledgeAmount = 0;
            let pledgeCount = 0;
            
            this.donationTransactions.forEach((donation, index) => {
                const meta = donation.meta || {};
                const devotee = donation.devotee || {};
                
                const donationType = meta.donation_name || 'General Donation';
                const isPledge = meta.is_pledge || false;
                const isAnonymous = meta.is_anonymous || false;
                const pledgeAmount = parseFloat(meta.pledge_amount) || 0;
                const paidAmount = parseFloat(donation.paid_amount) || 0;
                
                let donorName = '-';
                if (isAnonymous) {
                    donorName = '<span class="badge badge-anonymous"><i class="bi bi-incognito me-1"></i>Anonymous</span>';
                } else {
                    donorName = meta.name_secondary || meta.name_primary || devotee.name || '-';
                }
                
                totalAmount += paidAmount;
                
                if (isPledge) {
                    pledgeCount++;
                    totalPledgeAmount += pledgeAmount;
                }
                
                const pledgeBadge = isPledge 
                    ? `<span class="badge badge-pledge"><i class="bi bi-clipboard-check me-1"></i>Yes</span>`
                    : '<span class="text-muted">-</span>';
                
                const pledgeAmtDisplay = isPledge ? self.formatCurrency(pledgeAmount) : '-';
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${self.formatDisplayDate(donation.booking_date)}</td>
                        <td>${donation.booking_number || 'N/A'}</td>
                        <td>${donationType}</td>
                        <td>${donorName}</td>
                        <td>${donation.payment_mode_name || '-'}</td>
                        <td class="text-center">${pledgeBadge}</td>
                        <td class="text-end">${pledgeAmtDisplay}</td>
                        <td class="text-end fw-bold">${self.formatCurrency(paidAmount)}</td>
                    </tr>
                `;
            });
            
            $('#donationBody').html(html);
            $('#donationCount').text(`${this.donationTransactions.length} donations`);
            $('#donationFooterPledgeCount').text(`${pledgeCount} pledges`);
            $('#donationFooterPledgeAmount').text(this.formatCurrency(totalPledgeAmount));
            $('#donationFooterTotal').text(this.formatCurrency(totalAmount));
            $('#donationFooter').show();
        },

        updateBuddhaLampSection: function() {
            const self = this;
            
            if (this.buddhaLampTransactions.length === 0) {
                $('#buddhaLampSection').hide();
                return;
            }

            $('#buddhaLampSection').show();
            let html = '';
            let totalAmount = 0;
            
            this.buddhaLampTransactions.forEach((booking, index) => {
                const meta = booking.meta || {};
                const typeName = meta.buddha_lamp_name || 'Custom Amount';
                const nameChinese = meta.name_secondary || '-';
                const nameEnglish = meta.name_primary || '-';
                const amount = parseFloat(booking.total_amount) || 0;
                
                totalAmount += amount;
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${self.formatDisplayDate(booking.booking_date)}</td>
                        <td>${booking.booking_number || 'N/A'}</td>
                        <td>${typeName}</td>
                        <td>${nameChinese}</td>
                        <td>${nameEnglish}</td>
                        <td>${booking.payment_mode_name || '-'}</td>
                        <td class="text-end fw-bold">${self.formatCurrency(amount)}</td>
                    </tr>
                `;
            });
            
            $('#buddhaLampBody').html(html);
            $('#buddhaLampCount').text(`${this.buddhaLampTransactions.length} bookings`);
            $('#buddhaLampFooterTotal').text(this.formatCurrency(totalAmount));
            $('#buddhaLampFooter').show();
        },

        updateTempleEventsSection: function() {
            const self = this;
            
            if (this.templeEventsTransactions.length === 0) {
                $('#templeEventsSection').hide();
                return;
            }

            $('#templeEventsSection').show();
            let html = '';
            let totalDiscount = 0, totalDeposit = 0, totalAmount = 0;
            
            this.templeEventsTransactions.forEach((booking, index) => {
                const occasion = booking.occasion || {};
                const devotee = booking.devotee || {};
                const occasionName = occasion.occasion_name || booking.booking_type || 'N/A';
                const devoteeName = devotee.name || devotee.name_secondary || '-';
                const discountAmt = parseFloat(booking.discount_amount) || 0;
                const depositAmt = parseFloat(booking.deposit_amount) || 0;
                const totalAmt = parseFloat(booking.total_amount) || 0;
                
                totalDiscount += discountAmt;
                totalDeposit += depositAmt;
                totalAmount += totalAmt;
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${self.formatDisplayDate(booking.booking_date)}</td>
                        <td>${booking.booking_number || 'N/A'}</td>
                        <td>${occasionName}</td>
                        <td>${devoteeName}</td>
                        <td>${booking.payment_mode_name || '-'}</td>
                        <td class="text-end">${self.formatCurrency(discountAmt)}</td>
                        <td class="text-end">${self.formatCurrency(depositAmt)}</td>
                        <td class="text-end fw-bold">${self.formatCurrency(totalAmt)}</td>
                    </tr>
                `;
            });
            
            $('#templeEventsBody').html(html);
            $('#templeEventsCount').text(`${this.templeEventsTransactions.length} bookings`);
            $('#templeEventsFooterDiscount').text(this.formatCurrency(totalDiscount));
            $('#templeEventsFooterDeposit').text(this.formatCurrency(totalDeposit));
            $('#templeEventsFooterTotal').text(this.formatCurrency(totalAmount));
            $('#templeEventsFooter').show();
        },

        updateGrandTotal: function() {
            const salesTotal = parseFloat(this.salesSummary.total_sales) || 0;
            const donationTotal = parseFloat(this.donationSummary.total_paid) || 0;
            const buddhaLampTotal = parseFloat(this.buddhaLampSummary.total_amount) || 0;
            const templeEventsTotal = parseFloat(this.templeEventsSummary.total_amount) || 0;
            const grandTotal = salesTotal + donationTotal + buddhaLampTotal + templeEventsTotal;

            $('#grandSalesTotal').text(this.formatCurrency(salesTotal));
            $('#grandDonationTotal').text(this.formatCurrency(donationTotal));
            $('#grandBuddhaLampTotal').text(this.formatCurrency(buddhaLampTotal));
            $('#grandTempleEventsTotal').text(this.formatCurrency(templeEventsTotal));
            $('#grandTotal').text(this.formatCurrency(grandTotal));

            const hasData = this.salesTransactions.length > 0 || 
                           this.donationTransactions.length > 0 ||
                           this.buddhaLampTransactions.length > 0 || 
                           this.templeEventsTransactions.length > 0;
            
            if (hasData) {
                $('#grandTotalSection').show();
                $('#noDataSection').hide();
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo('#grandTotalSection', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 });
                }
            } else {
                $('#grandTotalSection').hide();
                $('#noDataSection').show();
            }
        },

        enableExportButtons: function(enabled) {
            $('#btnPrint').prop('disabled', !enabled);
        },

        printReport: function() {
            if (!this.filters.from_date || !this.filters.to_date) {
                TempleCore.showToast('Please load data first', 'warning');
                return;
            }

            const params = {
                from_date: this.filters.from_date,
                to_date: this.filters.to_date,
                payment_mode_id: this.filters.payment_mode_id,
                created_by: this.filters.created_by
            };

            this.cleanup();
            TempleRouter.navigate('daily-closing/print', params);
        }
    };

})(jQuery, window);