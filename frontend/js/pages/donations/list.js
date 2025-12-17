// js/pages/donations/list.js
// Donations List Page with Buddha Lamp-style UI

(function($, window) {
    'use strict';
    
    if (!window.DonationsSharedModule) {
        window.DonationsSharedModule = {
            moduleId: 'donations',
            eventNamespace: 'donations',
            cssId: 'donations-css',
            cssPath: '/css/donations.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Donations CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Donations page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Donations page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('Donations CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Donations module cleaned up');
            }
        };
    }
    
    window.DonationsListPage = {
        dataTable: null,
        pageId: 'donations-list',
        eventNamespace: window.DonationsSharedModule.eventNamespace,
        donationTypes: [],
        paymentModes: [],
        currentPage: 1,
        perPage: 25,
        totalRecords: 0,
        currentSpiritMoneyData: null,
        
        init: function(params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.loadFilterData();
            this.bindEvents();
        },
        
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.DonationsSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        render: function() {
            const html = `
                <div class="donations-list-page">
                    <!-- Hero Header Banner - Buddha Lamp Style -->
                    <div class="hero-banner" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%); border-radius: 12px; padding: 30px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(184, 101, 27, 0.3);">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; margin-right: 20px;">
                                    <i class="bi bi-gift-fill" style="font-size: 35px; color: white;"></i>
                                </div>
                                <div>
                                    <h1 class="mb-1" style="color: white; font-size: 32px; font-weight: 700;">Donations</h1>
                                    <p class="mb-0" style="color: rgba(255,255,255,0.9); font-size: 15px;">捐款管理 • Temple Donation Management</p>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-light" id="btnPrintReport" style="background: white; color: #b8651b; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">
                                    <i class="bi bi-printer-fill me-2"></i>Print Report
                                </button>
                                <button class="btn" id="btnNewDonation" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 10px 20px; border-radius: 8px; font-weight: 600;">
                                    <i class="bi bi-plus-circle me-2"></i>New Donation
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Cards - Buddha Lamp Style -->
                    <div class="row mb-4 g-3" id="statsContainer">
                        <div class="col-xl-3 col-md-6">
                            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #e83e8c; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s;">
                                <div class="d-flex align-items-center">
                                    <div style="background: rgba(232, 62, 140, 0.1); border-radius: 10px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                        <i class="bi bi-calendar-day" style="font-size: 24px; color: #e83e8c;"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Today's Donations</div>
                                        <div style="font-size: 28px; font-weight: 700; color: #2d3748;" id="todayDonations">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-xl-3 col-md-6">
                            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s;">
                                <div class="d-flex align-items-center">
                                    <div style="background: rgba(40, 167, 69, 0.1); border-radius: 10px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px; font-weight: 700; color: #28a745;">
                                        RM
                                    </div>
                                    <div class="flex-grow-1">
                                        <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Today's Amount</div>
                                        <div style="font-size: 28px; font-weight: 700; color: #2d3748;">RM <span id="todayAmount">0.00</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-xl-3 col-md-6">
                            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s;">
                                <div class="d-flex align-items-center">
                                    <div style="background: rgba(23, 162, 184, 0.1); border-radius: 10px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                        <i class="bi bi-calendar-month" style="font-size: 24px; color: #17a2b8;"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">This Month</div>
                                        <div style="font-size: 28px; font-weight: 700; color: #2d3748;" id="monthDonations">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-xl-3 col-md-6">
                            <div style="background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #2d3748; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s;">
                                <div class="d-flex align-items-center">
                                    <div style="background: rgba(45, 55, 72, 0.1); border-radius: 10px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                        <i class="bi bi-check-circle" style="font-size: 24px; color: #2d3748;"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Total Donors</div>
                                        <div style="font-size: 28px; font-weight: 700; color: #2d3748;" id="totalDonors">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Section - Buddha Lamp Style -->
                    <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <div class="row g-3">
                            <div class="col-md-2">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">Donation Type</label>
                                <select class="form-select" id="filterType" style="border: 1px solid #dee2e6; border-radius: 6px;">
                                    <option value="">All Types</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">Payment Method</label>
                                <select class="form-select" id="filterPayment" style="border: 1px solid #dee2e6; border-radius: 6px;">
                                    <option value="">All Methods</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">From Date</label>
                                <input type="date" class="form-control" id="filterFromDate" placeholder="yyyy-mm-dd" style="border: 1px solid #dee2e6; border-radius: 6px;">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">To Date</label>
                                <input type="date" class="form-control" id="filterToDate" placeholder="yyyy-mm-dd" style="border: 1px solid #dee2e6; border-radius: 6px;">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">Search</label>
                                <input type="text" class="form-control" id="filterSearch" placeholder="Name, NRIC, Booking No." style="border: 1px solid #dee2e6; border-radius: 6px;">
                            </div>
                            <div class="col-md-1 d-flex align-items-end">
                                <button class="btn w-100" id="btnFilter" style="background: #b8651b; color: white; border: none; border-radius: 6px; padding: 10px; font-weight: 600;">
                                    <i class="bi bi-funnel-fill"></i> Filter
                                </button>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-12">
                                <button class="btn btn-sm btn-outline-primary" id="btnClearFilters" style="border-radius: 6px;">
                                    <i class="bi bi-x-circle me-1"></i>Clear Filters
                                </button>
                                <button class="btn btn-sm btn-outline-primary ms-2" id="btnRefresh" style="border-radius: 6px;">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Table Section -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div style="color: #495057; font-size: 14px;">
                                Show 
                                <select id="perPageSelect" style="border: 1px solid #dee2e6; border-radius: 4px; padding: 4px 8px; margin: 0 5px;">
                                    <option value="10">10</option>
                                    <option value="25" selected>25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                                per page
                            </div>
                            <div style="color: #495057; font-size: 14px;">
                                Search: <input type="text" id="tableSearch" placeholder="" style="border: 1px solid #dee2e6; border-radius: 4px; padding: 4px 12px; width: 200px;">
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-hover mb-0" id="donationsTable">
                                <thead style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                    <tr>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Booking No.</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Date</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Donor Name</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Donation Type</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Amount<br/>(RM)</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Payment Method</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Contact</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="donationsTableBody">
                                    <tr>
                                        <td colspan="8" class="text-center py-5">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <p class="mt-2 text-muted">Loading donations...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination -->
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <div class="text-muted" style="font-size: 14px;">
                                Showing <span id="showingFrom">0</span> to <span id="showingTo">0</span> of <span id="totalRecords">0</span> entries
                            </div>
                            <nav>
                                <ul class="pagination mb-0" id="pagination">
                                    <!-- Pagination will be rendered here -->
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
                
                <!-- View Donation Modal -->
                <div class="modal fade" id="viewDonationModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                <h5 class="modal-title text-white">
                                    <i class="bi bi-eye me-2"></i>
                                    Donation Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="viewDonationContent">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Close
                                </button>
                                <button type="button" class="btn" id="btnPrintFromView" style="background: #b8651b; color: white;">
                                    <i class="bi bi-printer"></i> Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Spirit Money Preview Modal -->
                <div class="modal fade" id="spiritMoneyModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">
                                    <i class="bi bi-file-earmark-image me-2"></i>
                                    Spirit Money Preview
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="spiritMoneyPreview" class="text-center mb-3">
                                    <div class="spinner-border text-warning" role="status">
                                        <span class="visually-hidden">Generating...</span>
                                    </div>
                                    <p class="mt-2">Generating spirit money image...</p>
                                </div>
                                <div id="spiritMoneyInfo" class="text-start" style="display:none;">
                                    <div class="alert alert-info">
                                        <h6 class="mb-2"><i class="bi bi-info-circle me-2"></i>Donor Information:</h6>
                                        <div class="row">
                                            <div class="col-6">
                                                <small class="text-muted">Name (Chinese):</small><br>
                                                <strong id="previewNameChinese"></strong>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Name (English):</small><br>
                                                <strong id="previewNameEnglish"></strong>
                                            </div>
                                            <div class="col-6 mt-2">
                                                <small class="text-muted">Amount:</small><br>
                                                <strong id="previewAmount" class="text-success"></strong>
                                            </div>
                                            <div class="col-6 mt-2">
                                                <small class="text-muted">Donation ID:</small><br>
                                                <strong id="previewDonationId"></strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Close
                                </button>
                                <button type="button" class="btn btn-warning" id="btnDownloadSpiritMoney" disabled>
                                    <i class="bi bi-download"></i> Download Image
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        initAnimations: function() {
            // Add hover animations to stat cards
            $('[style*="border-left"]').each(function() {
                $(this).hover(
                    function() {
                        $(this).css({
                            'transform': 'translateY(-5px)',
                            'box-shadow': '0 8px 20px rgba(0,0,0,0.12)'
                        });
                    },
                    function() {
                        $(this).css({
                            'transform': 'translateY(0)',
                            'box-shadow': '0 2px 8px rgba(0,0,0,0.08)'
                        });
                    }
                );
            });
        },

        loadFilterData: async function() {
            try {
                const [donationsResponse, paymentModesResponse] = await Promise.all([
                    TempleAPI.get('/donations/types/active'),
                    TempleAPI.get('/masters/payment-modes/active')
                ]);

                if (donationsResponse.success) {
                    this.donationTypes = donationsResponse.data;
                    this.renderDonationTypeFilter();
                }

                if (paymentModesResponse.success) {
                    this.paymentModes = paymentModesResponse.data;
                    this.renderPaymentModeFilter();
                }

                await Promise.all([
                    this.loadStats(),
                    this.loadDonations()
                ]);

            } catch (error) {
                console.error('Error loading filter data:', error);
                TempleCore.showToast('Failed to load filter data', 'error');
            }
        },

        renderDonationTypeFilter: function() {
            const $filterType = $('#filterType');
            this.donationTypes.forEach(donation => {
                $filterType.append(`
                    <option value="${donation.type}">
                        ${donation.name}${donation.secondary_name ? ' • ' + donation.secondary_name : ''}
                    </option>
                `);
            });
        },

        renderPaymentModeFilter: function() {
            const $filterPayment = $('#filterPayment');
            this.paymentModes.forEach(mode => {
                $filterPayment.append(`
                    <option value="${mode.id}">${mode.name}</option>
                `);
            });
        },
        
        loadStats: async function() {
            try {
                const response = await TempleAPI.get('/donations/statistics');
                
                if (response.success) {
                    const stats = response.data;
                    this.animateCounter('#todayDonations', stats.today_donations);
                    this.animateCounter('#todayAmount', stats.today_amount, true);
                    this.animateCounter('#monthDonations', stats.month_donations);
                    this.animateCounter('#totalDonors', stats.total_donors);
                }
            } catch (error) {
                console.error('Error loading statistics:', error);
            }
        },
        
        animateCounter: function(selector, endValue, isDecimal = false) {
            const $element = $(selector);
            const obj = { value: 0 };
            
            gsap.to(obj, {
                value: endValue,
                duration: 1.5,
                ease: 'power2.out',
                onUpdate: function() {
                    if (isDecimal) {
                        $element.text(obj.value.toFixed(2));
                    } else {
                        $element.text(Math.floor(obj.value));
                    }
                }
            });
        },

        loadDonations: async function() {
            try {
                const filters = this.getFilters();
                
                const params = new URLSearchParams({
                    page: this.currentPage,
                    per_page: this.perPage,
                    ...filters
                });

                const response = await TempleAPI.get(`/donations?${params.toString()}`);
                
                if (response.success) {
                    this.renderDonations(response.data);
                    this.renderPagination(response.pagination);
                } else {
                    throw new Error(response.message || 'Failed to load donations');
                }
            } catch (error) {
                console.error('Error loading donations:', error);
                $('#donationsTableBody').html(`
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <div class="alert alert-danger d-inline-block">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                Failed to load donations. Please try again.
                            </div>
                        </td>
                    </tr>
                `);
                TempleCore.showToast('Failed to load donations', 'error');
            }
        },

        getFilters: function() {
            const filters = {};

            const donationType = $('#filterType').val();
            if (donationType) filters.donation_type = donationType;

            const paymentModeId = $('#filterPayment').val();
            if (paymentModeId) filters.payment_mode_id = paymentModeId;

            const fromDate = $('#filterFromDate').val();
            if (fromDate) filters.from_date = fromDate;

            const toDate = $('#filterToDate').val();
            if (toDate) filters.to_date = toDate;

            const search = $('#filterSearch').val();
            if (search) filters.search = search;

            return filters;
        },

        renderDonations: function(donations) {
            const $tbody = $('#donationsTableBody');

            if (!donations || donations.length === 0) {
                $tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted"></i>
                            <p class="mt-2 text-muted">No donations found</p>
                        </td>
                    </tr>
                `);
                return;
            }

            const rows = donations.map((donation, index) => {
                const donationType = this.getDonationTypeBadge(donation.donation_type);
                const paymentMethod = this.getPaymentMethodDisplay(donation.payment_method, donation.payment_mode_id);
                const rowBg = index % 2 === 0 ? 'background: #fafafa;' : '';

                return `
                    <tr data-id="${donation.id}" style="${rowBg}">
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <span class="fw-semibold">${donation.booking_number}</span>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">${moment(donation.date).format('DD MMM YYYY')}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <div>
                                <div class="fw-semibold">${donation.name_chinese}</div>
                                <small class="text-muted">${donation.name_english}</small>
                            </div>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">${donationType}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <span class="fw-semibold">${parseFloat(donation.amount).toFixed(2)}</span>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">${paymentMethod}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <div class="small">
                                <div>${donation.email}</div>
                                <div class="text-muted">${donation.contact_no}</div>
                            </div>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-view" data-id="${donation.id}" title="View" style="border-radius: 4px 0 0 4px;">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-success btn-edit" data-id="${donation.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-warning btn-spirit-money" 
                                        data-id="${donation.id}"
                                        data-name-chinese="${donation.name_chinese}"
                                        data-name-english="${donation.name_english}"
                                        data-amount="${donation.amount}"
                                        data-booking-number="${donation.booking_number}"
                                        title="Spirit Money">
                                    <i class="bi bi-file-earmark-image"></i>
                                </button>
                                <button class="btn btn-outline-info btn-print" data-id="${donation.id}" title="Print">
                                    <i class="bi bi-printer"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-delete" data-id="${donation.id}" title="Delete" style="border-radius: 0 4px 4px 0;">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            $tbody.html(rows);
        },

        getDonationTypeBadge: function(type) {
            const badges = {
                'general': '<span class="badge" style="background: #28a745; color: white; padding: 5px 10px; border-radius: 4px;">Meal</span>',
                'voucher': '<span class="badge" style="background: #17a2b8; color: white; padding: 5px 10px; border-radius: 4px;">Voucher</span>',
                'meal': '<span class="badge" style="background: #28a745; color: white; padding: 5px 10px; border-radius: 4px;">Meal</span>',
                'maintenance': '<span class="badge" style="background: #ffc107; color: #333; padding: 5px 10px; border-radius: 4px;">Maintenance</span>',
                'other': '<span class="badge" style="background: #6c757d; color: white; padding: 5px 10px; border-radius: 4px;">Other</span>'
            };
            return badges[type] || `<span class="badge" style="background: #6c757d; color: white; padding: 5px 10px; border-radius: 4px;">${type}</span>`;
        },

        getPaymentMethodDisplay: function(method, paymentModeId = null) {
            if (paymentModeId && this.paymentModes.length > 0) {
                const mode = this.paymentModes.find(m => m.id === paymentModeId || m.name === method);
                if (mode && mode.icon_display_url_data) {
                    const iconDisplay = mode.icon_display_url_data;
                    const iconHtml = iconDisplay.type === 'bootstrap' 
                        ? `<i class="bi ${iconDisplay.value}"></i>`
                        : `<img src="${iconDisplay.value}" alt="${mode.name}" style="width: ${iconDisplay.width || 62}px; height: ${iconDisplay.height || 28}px; object-fit: contain; vertical-align: middle;">`;
                    return `<div style="background: #f8f9fa; padding: 5px 12px; border-radius: 6px; display: inline-block;">${iconHtml} <span style="margin-left: 5px;">${method}</span></div>`;
                }
            }
            
            const icons = {
                'Cash': '<i class="bi bi-cash-stack text-success"></i>',
                'Cheque': '<i class="bi bi-bank text-primary"></i>',
                'E-banking': '<i class="bi bi-laptop text-info"></i>',
                'Online Banking': '<i class="bi bi-bank text-info"></i>',
                'Card': '<i class="bi bi-credit-card text-warning"></i>',
                'DuitNow': '<i class="bi bi-wallet2 text-danger"></i>'
            };
            
            const icon = icons[method] || '<i class="bi bi-cash"></i>';
            return `<div style="background: #f8f9fa; padding: 5px 12px; border-radius: 6px; display: inline-block;">${icon} <span style="margin-left: 5px;">${method}</span></div>`;
        },

        renderPagination: function(pagination) {
            if (!pagination) return;

            this.totalRecords = pagination.total;
            const showingFrom = (pagination.current_page - 1) * pagination.per_page + 1;
            const showingTo = Math.min(pagination.current_page * pagination.per_page, pagination.total);

            $('#showingFrom').text(showingFrom);
            $('#showingTo').text(showingTo);
            $('#totalRecords').text(pagination.total);

            const $pagination = $('#pagination');
            $pagination.empty();

            if (pagination.last_page <= 1) return;

            $pagination.append(`
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">Previous</a>
                </li>
            `);

            for (let i = 1; i <= pagination.last_page; i++) {
                if (
                    i === 1 ||
                    i === pagination.last_page ||
                    (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)
                ) {
                    $pagination.append(`
                        <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `);
                } else if (
                    i === pagination.current_page - 3 ||
                    i === pagination.current_page + 3
                ) {
                    $pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
                }
            }

            $pagination.append(`
                <li class="page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">Next</a>
                </li>
            `);
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnNewDonation').on('click.' + this.eventNamespace, function() {
                self.cleanup();
                TempleRouter.navigate('donations/create');
            });
            
            $('#btnPrintReport').on('click.' + this.eventNamespace, function() {
                const filters = self.getFilters();
                self.cleanup();
                TempleRouter.navigate('donations/report-print', filters);
            });
            
            $('#btnRefresh, #btnFilter').on('click.' + this.eventNamespace, function() {
                self.loadStats();
                self.loadDonations();
                TempleCore.showToast('Data refreshed', 'success');
            });
            
            $('#filterType, #filterPayment, #filterFromDate, #filterToDate').on('change.' + this.eventNamespace, function() {
                self.currentPage = 1;
                self.loadDonations();
            });

            let searchTimeout;
            $('#filterSearch').on('keyup.' + this.eventNamespace, function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    self.currentPage = 1;
                    self.loadDonations();
                }, 500);
            });

            $('#btnClearFilters').on('click.' + this.eventNamespace, function() {
                $('#filterType').val('');
                $('#filterPayment').val('');
                $('#filterFromDate').val('');
                $('#filterToDate').val('');
                $('#filterSearch').val('');
                self.currentPage = 1;
                self.loadDonations();
            });

            $(document).on('click.' + this.eventNamespace, '#pagination a.page-link', function(e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && page !== self.currentPage) {
                    self.currentPage = page;
                    self.loadDonations();
                    $('html, body').animate({ scrollTop: 0 }, 300);
                }
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-view', function() {
                const id = $(this).data('id');
                self.viewDonation(id);
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-edit', function() {
                const id = $(this).data('id');
                self.editDonation(id);
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-spirit-money', function() {
                const $btn = $(this);
                const donorData = {
                    id: $btn.data('id'),
                    name_chinese: $btn.data('name-chinese'),
                    name_english: $btn.data('name-english'),
                    amount: $btn.data('amount'),
                    booking_number: $btn.data('booking-number')
                };
                self.generateSpiritMoney(donorData);
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-print', function() {
                const id = $(this).data('id');
                self.printReceipt(id);
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function() {
                const id = $(this).data('id');
                self.deleteDonation(id);
            });
            
            $('#btnPrintFromView').on('click.' + this.eventNamespace, function() {
                const id = $(this).data('id');
                if (id) {
                    bootstrap.Modal.getInstance(document.getElementById('viewDonationModal')).hide();
                    self.printReceipt(id);
                }
            });
            
            $('#btnDownloadSpiritMoney').on('click.' + this.eventNamespace, function() {
                self.downloadCurrentSpiritMoney();
            });
        },
        
        viewDonation: async function(id) {
            try {
                const modal = new bootstrap.Modal(document.getElementById('viewDonationModal'));
                modal.show();
                
                $('#viewDonationContent').html(`
                    <div class="text-center py-5">
                        <div class="spinner-border" style="color: #b8651b;" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading donation details...</p>
                    </div>
                `);
                
                const response = await TempleAPI.get(`/donations/${id}`);
                
                if (response.success) {
                    const donation = response.data;
                    $('#btnPrintFromView').data('id', id);
                    
                    const html = `
                        <div class="donation-details">
                            <div class="row g-3">
                                <div class="col-12">
                                    <div class="card" style="background: #f8f9fa; border: none;">
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-6">
                                                    <h6 class="text-muted mb-1">Donation Number</h6>
                                                    <p class="mb-0 fw-bold fs-5">${donation.booking_number}</p>
                                                </div>
                                                <div class="col-6 text-end">
                                                    <h6 class="text-muted mb-1">Date</h6>
                                                    <p class="mb-0 fw-bold">${moment(donation.date).format('DD MMMM YYYY')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="card h-100" style="border: 1px solid #dee2e6;">
                                        <div class="card-body">
                                            <h6 class="card-title mb-3" style="color: #b8651b;">
                                                <i class="bi bi-person-circle me-2"></i>
                                                Donor Information
                                            </h6>
                                            <table class="table table-sm table-borderless">
                                                <tr>
                                                    <td class="text-muted" width="40%">Name (English)</td>
                                                    <td class="fw-semibold">${donation.name_english}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Name (Chinese)</td>
                                                    <td class="fw-semibold">${donation.name_chinese}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">NRIC</td>
                                                    <td>${donation.nric}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Email</td>
                                                    <td>${donation.email}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Contact No.</td>
                                                    <td>${donation.contact_no}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="card h-100" style="border: 1px solid #dee2e6;">
                                        <div class="card-body">
                                            <h6 class="card-title mb-3" style="color: #28a745;">
                                                <i class="bi bi-credit-card me-2"></i>
                                                Payment Information
                                            </h6>
                                            <table class="table table-sm table-borderless">
                                                <tr>
                                                    <td class="text-muted" width="40%">Donation Type</td>
                                                    <td>${this.getDonationTypeBadge(donation.donation_type)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Amount</td>
                                                    <td class="fw-bold text-success fs-5">RM ${parseFloat(donation.amount).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Payment Method</td>
                                                    <td>${this.getPaymentMethodDisplay(donation.payment_method)}</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Reference</td>
                                                    <td><code>${donation.payment_reference}</code></td>
                                                </tr>
                                                <tr>
                                                    <td class="text-muted">Status</td>
                                                    <td><span class="badge bg-success">${donation.payment_status}</span></td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                ${donation.notes ? `
                                <div class="col-12">
                                    <div class="card" style="border: 1px solid #dee2e6;">
                                        <div class="card-body">
                                            <h6 class="card-title mb-2" style="color: #17a2b8;">
                                                <i class="bi bi-chat-left-text me-2"></i>
                                                Notes
                                            </h6>
                                            <p class="mb-0">${donation.notes}</p>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <div class="col-12">
                                    <div class="card" style="background: #f8f9fa; border: none;">
                                        <div class="card-body">
                                            <div class="row text-center">
                                                <div class="col-6">
                                                    <small class="text-muted d-block">Created By</small>
                                                    <strong>${donation.created_by || 'System'}</strong>
                                                </div>
                                                <div class="col-6">
                                                    <small class="text-muted d-block">Created At</small>
                                                    <strong>${moment(donation.created_at).format('DD MMM YYYY, HH:mm')}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    $('#viewDonationContent').html(html);
                } else {
                    throw new Error(response.message || 'Failed to load donation details');
                }
            } catch (error) {
                console.error('Error viewing donation:', error);
                $('#viewDonationContent').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Failed to load donation details. Please try again.
                    </div>
                `);
                TempleCore.showToast('Failed to load donation details', 'error');
            }
        },
        
        editDonation: function(id) {
            this.cleanup();
            TempleRouter.navigate('donations/edit', { id: id });
        },
        
        deleteDonation: function(id) {
            const self = this;
            
            Swal.fire({
                title: 'Delete Donation?',
                html: `
                    <p>Are you sure you want to delete this donation record?</p>
                    <p class="text-danger mb-0"><strong>This action cannot be undone!</strong></p>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="bi bi-trash me-2"></i>Yes, delete it!',
                cancelButtonText: '<i class="bi bi-x-circle me-2"></i>Cancel',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Deleting...',
                            html: 'Please wait while we delete the donation record.',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: false,
                            willOpen: () => {
                                Swal.showLoading();
                            }
                        });
                        
                        const response = await TempleAPI.delete(`/donations/${id}`);
                        
                        if (response.success) {
                            Swal.fire({
                                title: 'Deleted!',
                                text: 'Donation record has been deleted successfully.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            
                            self.loadDonations();
                            self.loadStats();
                        } else {
                            throw new Error(response.message || 'Failed to delete donation');
                        }
                    } catch (error) {
                        console.error('Error deleting donation:', error);
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to delete donation. ' + error.message,
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                    }
                }
            });
        },
        
        printReceipt: function(id) {
            TempleCore.showToast('Generating receipt...', 'info');
            this.cleanup();
            TempleRouter.navigate('donations/receipt-print', { id: id });
        },
        
        generateSpiritMoney: function(donorData) {
            const self = this;
            
            const modal = new bootstrap.Modal(document.getElementById('spiritMoneyModal'));
            modal.show();
            
            $('#spiritMoneyPreview').html(`
                <div class="spinner-border text-warning" role="status">
                    <span class="visually-hidden">Generating...</span>
                </div>
                <p class="mt-2">Generating spirit money image...</p>
            `);
            $('#spiritMoneyInfo').hide();
            $('#btnDownloadSpiritMoney').prop('disabled', true);
            
            $('#previewNameChinese').text(donorData.name_chinese);
            $('#previewNameEnglish').text(donorData.name_english);
            $('#previewAmount').text('RM ' + parseFloat(donorData.amount).toFixed(2));
            $('#previewDonationId').text(donorData.booking_number);
            
            if (typeof window.SpiritMoneyGenerator === 'undefined') {
                $('#spiritMoneyPreview').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        Spirit Money Generator not loaded. Please ensure the script is included.
                    </div>
                `);
                return;
            }
            
            window.SpiritMoneyGenerator.generate(donorData)
                .then(dataUrl => {
                    self.currentSpiritMoneyData = {
                        dataUrl: dataUrl,
                        filename: `spirit-money-${donorData.booking_number}.png`
                    };
                    
                    $('#spiritMoneyPreview').html(`
                        <img src="${dataUrl}" alt="Spirit Money" class="img-fluid border rounded shadow-sm" style="max-height: 500px;">
                    `);
                    $('#spiritMoneyInfo').show();
                    $('#btnDownloadSpiritMoney').prop('disabled', false);
                    
                    TempleCore.showToast('Spirit money generated successfully!', 'success');
                })
                .catch(error => {
                    console.error('Spirit Money Generation Error:', error);
                    $('#spiritMoneyPreview').html(`
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                            Failed to generate spirit money image. Error: ${error.message}
                        </div>
                    `);
                    TempleCore.showToast('Failed to generate spirit money', 'error');
                });
        },
        
        downloadCurrentSpiritMoney: function() {
            if (this.currentSpiritMoneyData) {
                window.SpiritMoneyGenerator.download(
                    this.currentSpiritMoneyData.dataUrl,
                    this.currentSpiritMoneyData.filename
                );
                
                TempleCore.showToast('Spirit money downloaded!', 'success');
                
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('spiritMoneyModal')).hide();
                }, 800);
            }
        }
    };
    
})(jQuery, window);