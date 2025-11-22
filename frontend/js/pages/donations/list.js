// js/pages/donations/list.js
// Donations List Page with DataTables, GSAP animations, and Spirit Money Generation

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
        
        init: function(params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.loadData();
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
        
        render: function() {
            const html = `
                <div class="donations-list-page">
                    <!-- Page Header -->
                    <div class="page-header" data-aos="fade-down" data-aos-duration="800">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h1 class="h2 mb-2">
                                    <i class="bi bi-gift-fill me-2 text-primary"></i>
                                    Donations
                                </h1>
                                <p class="text-muted mb-0">Manage all donation records</p>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-primary" id="btnNewDonation">
                                    <i class="bi bi-plus-circle"></i> New Donation
                                </button>
                                <button class="btn btn-outline-secondary" id="btnPrintReport">
                                    <i class="bi bi-printer-fill"></i> Print Report
                                </button>
                                <button class="btn btn-outline-primary" id="btnRefresh">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="row mb-4 g-3" id="statsContainer">
                        <div class="col-xl-3 col-md-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                            <div class="stat-card stat-card-primary">
                                <div class="stat-card-icon">
                                    <i class="bi bi-calendar-day"></i>
                                </div>
                                <div class="stat-card-body">
                                    <div class="stat-value" id="todayDonations">0</div>
                                    <div class="stat-label">Today's Donations</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                            <div class="stat-card stat-card-success">
                                <div class="stat-card-icon">
                                    <i class="bi bi-currency-rupee"></i>
                                </div>
                                <div class="stat-card-body">
                                    <div class="stat-value">RM <span id="todayAmount">0.00</span></div>
                                    <div class="stat-label">Today's Amount</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                            <div class="stat-card stat-card-info">
                                <div class="stat-card-icon">
                                    <i class="bi bi-calendar-month"></i>
                                </div>
                                <div class="stat-card-body">
                                    <div class="stat-value" id="monthDonations">0</div>
                                    <div class="stat-label">This Month</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="400">
                            <div class="stat-card stat-card-warning">
                                <div class="stat-card-icon">
                                    <i class="bi bi-people"></i>
                                </div>
                                <div class="stat-card-body">
                                    <div class="stat-value" id="totalDonors">0</div>
                                    <div class="stat-label">Total Donors</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card shadow-sm mb-4 filter-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Donation Type</label>
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="donation">General Donation</option>
                                        <option value="voucher">Voucher Donation</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Payment Method</label>
                                    <select class="form-select" id="filterPayment">
                                        <option value="">All Methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="ebanking">E-banking</option>
                                        <option value="card">Card</option>
                                        <option value="duitnow">DuitNow</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterFromDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterToDate">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Donations Table -->
                    <div class="card shadow-sm table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="donationsTable" class="table table-hover" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Date</th>
                                            <th>Donor Name</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Payment</th>
                                            <th>Contact</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Data will be loaded via DataTables -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Spirit Money Preview Modal -->
                <div class="modal fade" id="spiritMoneyModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-file-earmark-image me-2"></i>
                                    Spirit Money Preview
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                <div id="spiritMoneyPreview" class="mb-3">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Generating...</span>
                                    </div>
                                    <p class="mt-2">Generating spirit money image...</p>
                                </div>
                                <div id="spiritMoneyInfo" class="text-start" style="display:none;">
                                    <div class="alert alert-info">
                                        <h6 class="mb-2">Donor Information:</h6>
                                        <div class="row">
                                            <div class="col-6">
                                                <small><strong>Name (Chinese):</strong></small><br>
                                                <span id="previewNameChinese"></span>
                                            </div>
                                            <div class="col-6">
                                                <small><strong>Name (English):</strong></small><br>
                                                <span id="previewNameEnglish"></span>
                                            </div>
                                            <div class="col-6 mt-2">
                                                <small><strong>Amount:</strong></small><br>
                                                <span id="previewAmount"></span>
                                            </div>
                                            <div class="col-6 mt-2">
                                                <small><strong>Donation ID:</strong></small><br>
                                                <span id="previewDonationId"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Close
                                </button>
                                <button type="button" class="btn btn-primary" id="btnDownloadSpiritMoney" disabled>
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
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }
            
            $('.stat-card').each(function(index) {
                const card = this;
                
                $(card).on('mouseenter.' + this.eventNamespace, function() {
                    gsap.to(card, {
                        y: -10,
                        boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
                
                $(card).on('mouseleave.' + this.eventNamespace, function() {
                    gsap.to(card, {
                        y: 0,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });
        },
        
        loadData: function() {
            this.loadStats();
            this.initDataTable();
        },
        
        loadStats: function() {
            const stats = {
                todayDonations: 12,
                todayAmount: 5240.50,
                monthDonations: 267,
                totalDonors: 543
            };
            
            this.animateCounter('#todayDonations', stats.todayDonations);
            this.animateCounter('#todayAmount', stats.todayAmount, true);
            this.animateCounter('#monthDonations', stats.monthDonations);
            this.animateCounter('#totalDonors', stats.totalDonors);
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
        
        initDataTable: function() {
            const self = this;
            const sampleData = this.getSampleData();
            
            this.dataTable = $('#donationsTable').DataTable({
                data: sampleData,
                columns: [
                    { data: 'id' },
                    { 
                        data: 'date',
                        render: function(data) {
                            return moment(data).format('DD MMM YYYY');
                        }
                    },
                    { 
                        data: null,
                        render: function(data) {
                            return `
                                <div>
                                    <div class="fw-semibold">${data.name_english}</div>
                                    <small class="text-muted">${data.name_chinese}</small>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: 'type',
                        render: function(data, type, row) {
                            const badges = {
                                'donation': '<span class="badge bg-primary">General</span>',
                                'meal': '<span class="badge bg-success">Meal</span>',
                                'maintenance': '<span class="badge bg-warning">Maintenance</span>',
                                'voucher': '<span class="badge bg-info">Voucher</span>',
                                'other': '<span class="badge bg-secondary">Other</span>'
                            };
                            return badges[data] || data;
                        }
                    },
                    { 
                        data: 'amount',
                        render: function(data) {
                            return 'RM ' + parseFloat(data).toFixed(2);
                        }
                    },
                    { 
                        data: 'payment_method',
                        render: function(data) {
                            const icons = {
                                'cash': '<i class="bi bi-cash-stack text-success"></i> Cash',
                                'cheque': '<i class="bi bi-bank text-primary"></i> Cheque',
                                'ebanking': '<i class="bi bi-laptop text-info"></i> E-banking',
                                'card': '<i class="bi bi-credit-card text-warning"></i> Card',
                                'duitnow': '<i class="bi bi-wallet2 text-danger"></i> DuitNow'
                            };
                            return icons[data] || data;
                        }
                    },
                    { 
                        data: null,
                        render: function(data) {
                            return `
                                <div class="small">
                                    <div>${data.email}</div>
                                    <div class="text-muted">${data.contact_no}</div>
                                </div>
                            `;
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        searchable: false,
                        render: function(data) {
                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary btn-view" data-id="${data.id}" 
                                            title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-success btn-edit" data-id="${data.id}" 
                                            title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-warning btn-spirit-money" 
                                            data-id="${data.id}"
                                            data-name-chinese="${data.name_chinese}"
                                            data-name-english="${data.name_english}"
                                            data-amount="${data.amount}"
                                            title="Generate Spirit Money">
                                        <i class="bi bi-file-earmark-image"></i>
                                    </button>
                                    <button class="btn btn-outline-info btn-print" data-id="${data.id}" 
                                            title="Print Receipt">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-delete" data-id="${data.id}" 
                                            title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[1, 'desc']],
                pageLength: 25,
                responsive: true,
                language: {
                    search: '',
                    searchPlaceholder: 'Search donations...',
                    lengthMenu: 'Show _MENU_ entries',
                    info: 'Showing _START_ to _END_ of _TOTAL_ donations',
                    infoEmpty: 'No donations found',
                    infoFiltered: '(filtered from _MAX_ total donations)',
                    emptyTable: 'No donations recorded yet'
                },
                drawCallback: function() {
                    $('#donationsTable tbody tr').each(function(index) {
                        gsap.from(this, {
                            opacity: 0,
                            x: -20,
                            duration: 0.3,
                            delay: index * 0.03,
                            ease: 'power2.out'
                        });
                    });
                }
            });
        },
        
        getSampleData: function() {
            return [
                {
                    id: 'DON-2024-001',
                    date: '2024-01-15',
                    name_english: 'John Tan',
                    name_chinese: '陈约翰',
                    type: 'donation',
                    amount: 500.00,
                    payment_method: 'cash',
                    email: 'john.tan@email.com',
                    contact_no: '+60123456789',
                    nric: '940815-01-5678'
                },
                {
                    id: 'DON-2024-002',
                    date: '2024-01-15',
                    name_english: 'Mary Lim',
                    name_chinese: '林玛丽',
                    type: 'voucher',
                    amount: 100.00,
                    payment_method: 'card',
                    email: 'mary.lim@email.com',
                    contact_no: '+60129876543',
                    nric: '880422-14-2345'
                },
                {
                    id: 'DON-2024-003',
                    date: '2024-01-14',
                    name_english: 'David Wong',
                    name_chinese: '黄大伟',
                    type: 'meal',
                    amount: 250.00,
                    payment_method: 'ebanking',
                    email: 'david.w@email.com',
                    contact_no: '+60187654321',
                    nric: '920308-10-9876'
                },
                {
                    id: 'DON-2024-004',
                    date: '2024-01-14',
                    name_english: 'Sarah Lee',
                    name_chinese: '李莎拉',
                    type: 'maintenance',
                    amount: 1000.00,
                    payment_method: 'cheque',
                    email: 'sarah.lee@email.com',
                    contact_no: '+60165432198',
                    nric: '850615-11-3456'
                },
                {
                    id: 'DON-2024-005',
                    date: '2024-01-13',
                    name_english: 'Michael Ng',
                    name_chinese: '黄米高',
                    type: 'donation',
                    amount: 300.00,
                    payment_method: 'duitnow',
                    email: 'michael.ng@email.com',
                    contact_no: '+60143219876',
                    nric: '900125-12-6789'
                }
            ];
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnNewDonation').on('click.' + this.eventNamespace, function() {
                gsap.to(this, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        self.cleanup();
                        TempleRouter.navigate('donations/create');
                    }
                });
            });
            
            $('#btnPrintReport').on('click.' + this.eventNamespace, function() {
                const $btn = $(this);
                const $icon = $btn.find('i');
                
                gsap.to($icon[0], {
                    rotation: 360,
                    duration: 0.5,
                    ease: 'power2.inOut'
                });
                
                const reportParams = {
                    type: $('#filterType').val(),
                    payment_method: $('#filterPayment').val(),
                    from_date: $('#filterFromDate').val(),
                    to_date: $('#filterToDate').val()
                };
                self.cleanup();
                TempleRouter.navigate('donations/report-print', reportParams);
            });
            
            $('#btnRefresh').on('click.' + this.eventNamespace, function() {
                const $btn = $(this);
                const $icon = $btn.find('i');
                
                gsap.to($icon[0], {
                    rotation: 360,
                    duration: 0.5,
                    ease: 'power2.inOut'
                });
                
                if (self.dataTable) {
                    self.dataTable.ajax.reload();
                }
                
                self.loadStats();
                TempleCore.showToast('Data refreshed', 'success');
            });
            
            $('#filterType, #filterPayment, #filterFromDate, #filterToDate').on('change.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-view', function() {
                const id = $(this).data('id');
                self.viewDonation(id);
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-edit', function() {
                const id = $(this).data('id');
                self.editDonation(id);
            });
            
            // Spirit Money button - NEW
            $(document).on('click.' + this.eventNamespace, '.btn-spirit-money', function() {
                const $btn = $(this);
                const donorData = {
                    id: $btn.data('id'),
                    name_chinese: $btn.data('name-chinese'),
                    name_english: $btn.data('name-english'),
                    amount: $btn.data('amount')
                };
                
                // Animate button
                const $icon = $btn.find('i');
                gsap.to($icon[0], {
                    scale: 1.3,
                    rotation: 15,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        self.generateSpiritMoney(donorData);
                    }
                });
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-print', function() {
                const id = $(this).data('id');
                const $btn = $(this);
                const $icon = $btn.find('i');
                
                gsap.to($icon[0], {
                    scale: 1.2,
                    rotation: 10,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        self.printReceipt(id);
                    }
                });
            });
            
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function() {
                const id = $(this).data('id');
                self.deleteDonation(id);
            });
            
            // Spirit Money Modal download button
            $('#btnDownloadSpiritMoney').on('click.' + this.eventNamespace, function() {
                self.downloadCurrentSpiritMoney();
            });
        },
        
        applyFilters: function() {
            const type = $('#filterType').val();
            const payment = $('#filterPayment').val();
            const fromDate = $('#filterFromDate').val();
            const toDate = $('#filterToDate').val();
            
            if (this.dataTable) {
                $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
                    if (type && data[3].indexOf(type) === -1) {
                        return false;
                    }
                    
                    if (payment && data[5].indexOf(payment) === -1) {
                        return false;
                    }
                    
                    const rowDate = moment(data[1], 'DD MMM YYYY');
                    if (fromDate && rowDate.isBefore(moment(fromDate))) {
                        return false;
                    }
                    if (toDate && rowDate.isAfter(moment(toDate))) {
                        return false;
                    }
                    
                    return true;
                });
                
                this.dataTable.draw();
                $.fn.dataTable.ext.search.pop();
            }
            
            gsap.fromTo('.filter-card', 
                { scale: 0.98 },
                { scale: 1, duration: 0.2, ease: 'back.out(1.2)' }
            );
        },
        
        viewDonation: function(id) {
            console.log('View donation:', id);
            TempleCore.showToast('View feature coming soon', 'info');
        },
        
        editDonation: function(id) {
            console.log('Edit donation:', id);
            TempleCore.showToast('Edit feature coming soon', 'info');
        },
        
        printReceipt: function(id) {
            console.log('Print receipt for donation:', id);
            TempleCore.showToast('Generating receipt...', 'info');
            this.cleanup();
            let params = {id: id};
            TempleRouter.navigate('donations/receipt-print', params);
        },
        
        // Spirit Money Generation - NEW METHODS
        generateSpiritMoney: function(donorData) {
            const self = this;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('spiritMoneyModal'));
            modal.show();
            
            // Reset preview
            $('#spiritMoneyPreview').html(`
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Generating...</span>
                </div>
                <p class="mt-2">Generating spirit money image...</p>
            `);
            $('#spiritMoneyInfo').hide();
            $('#btnDownloadSpiritMoney').prop('disabled', true);
            
            // Update info display
            $('#previewNameChinese').text(donorData.name_chinese);
            $('#previewNameEnglish').text(donorData.name_english);
            $('#previewAmount').text('RM ' + parseFloat(donorData.amount).toFixed(2));
            $('#previewDonationId').text(donorData.id);
            
            // Check if SpiritMoneyGenerator is available
            if (typeof window.SpiritMoneyGenerator === 'undefined') {
                $('#spiritMoneyPreview').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        Spirit Money Generator not loaded. Please ensure the script is included.
                    </div>
                `);
                return;
            }
            
            // Generate image
            window.SpiritMoneyGenerator.generate(donorData)
                .then(dataUrl => {
                    // Store for download
                    self.currentSpiritMoneyData = {
                        dataUrl: dataUrl,
                        filename: `spirit-money-${donorData.id}.png`
                    };
                    
                    // Show preview
                    $('#spiritMoneyPreview').html(`
                        <img src="${dataUrl}" alt="Spirit Money" class="img-fluid border rounded shadow-sm" style="max-height: 500px;">
                    `);
                    $('#spiritMoneyInfo').show();
                    $('#btnDownloadSpiritMoney').prop('disabled', false);
                    
                    // Animate preview
                    gsap.from('#spiritMoneyPreview img', {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.5,
                        ease: 'back.out(1.2)'
                    });
                    
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
                
                // Close modal after download
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('spiritMoneyModal')).hide();
                }, 800);
            }
        },
        
        deleteDonation: function(id) {
            const self = this;
            
            Swal.fire({
                title: 'Delete Donation?',
                text: 'Are you sure you want to delete this donation record?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff00ff',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    console.log('Delete donation:', id);
                    
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Donation record has been deleted.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    
                    if (self.dataTable) {
                        self.dataTable.ajax.reload();
                    }
                }
            });
        }
    };
    
})(jQuery, window);