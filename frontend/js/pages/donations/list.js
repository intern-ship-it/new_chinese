// js/pages/donations/list.js
// Donations List Page with DataTables and GSAP animations

(function($, window) {
    'use strict';
    if (!window.DonationsSharedModule) {
        window.DonationsSharedModule = {
            moduleId: 'donations',
			eventNamespace: 'donations',
            cssId: 'donations-css',
            cssPath: '/css/donations.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
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
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Donations page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Donations page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                // If no more pages active, cleanup CSS
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
                // Remove CSS
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Donations CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all donations-related event listeners
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
        // Page initialization
        init: function(params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.loadData();
            this.bindEvents();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.DonationsSharedModule.unregisterPage(this.pageId);
            
            // Cleanup page-specific events (with page namespace)
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            // Cleanup page-specific animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            // Clear any intervals/timeouts
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
                            <div>
                                <button class="btn btn-primary" id="btnNewDonation">
                                    <i class="bi bi-plus-circle"></i> New Donation
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
            
            // Animate stat cards on hover
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
        
        // Load data
        loadData: function() {
            const self = this;
            
            // Load stats
            this.loadStats();
            
            // Initialize DataTable
            this.initDataTable();
        },
        
        // Load statistics
        loadStats: function() {
            // Simulate loading stats (replace with actual API call)
            const stats = {
                todayDonations: 12,
                todayAmount: 5240.50,
                monthDonations: 267,
                totalDonors: 543
            };
            
            // Animate counter updates
            this.animateCounter('#todayDonations', stats.todayDonations);
            this.animateCounter('#todayAmount', stats.todayAmount, true);
            this.animateCounter('#monthDonations', stats.monthDonations);
            this.animateCounter('#totalDonors', stats.totalDonors);
            
            // Actual implementation:
            /*
            TempleAPI.get('/donations/stats')
                .done(function(response) {
                    if (response.success) {
                        self.animateCounter('#todayDonations', response.data.todayDonations);
                        self.animateCounter('#todayAmount', response.data.todayAmount, true);
                        self.animateCounter('#monthDonations', response.data.monthDonations);
                        self.animateCounter('#totalDonors', response.data.totalDonors);
                    }
                });
            */
        },
        
        // Animate counter
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
        
        // Initialize DataTable
        initDataTable: function() {
            const self = this;
            
            // Sample data (replace with actual API call)
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
                    // Animate rows on draw
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
            
            // Actual implementation with API:
            /*
            this.dataTable = $('#donationsTable').DataTable({
                processing: true,
                serverSide: true,
                ajax: {
                    url: TempleAPI.buildUrl('/donations'),
                    type: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + TempleAPI.getToken()
                    },
                    dataSrc: 'data'
                },
                columns: [...],
                ...
            });
            */
        },
        
        // Get sample data
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
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // New donation button
            $('#btnNewDonation').on('click.' + this.eventNamespace, function() {
                gsap.to(this, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        TempleRouter.navigate('donations/create');
                    }
                });
            });
            
            // Refresh button
            $('#btnRefresh').on('click.' + this.eventNamespace, function() {
                // Animate button
                const $btn = $(this);
                const $icon = $btn.find('i');
                
                gsap.to($icon[0], {
                    rotation: 360,
                    duration: 0.5,
                    ease: 'power2.inOut'
                });
                
                // Reload data
                if (self.dataTable) {
                    self.dataTable.ajax.reload();
                }
                
                self.loadStats();
                TempleCore.showToast('Data refreshed', 'success');
            });
            
            // Filter changes
            $('#filterType, #filterPayment, #filterFromDate, #filterToDate').on('change.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            // View button
            $(document).on('click.' + this.eventNamespace, '.btn-view', function() {
                const id = $(this).data('id');
                self.viewDonation(id);
            });
            
            // Edit button
            $(document).on('click.' + this.eventNamespace, '.btn-edit', function() {
                const id = $(this).data('id');
                self.editDonation(id);
            });
            
            // Print button
            $(document).on('click.' + this.eventNamespace, '.btn-print', function() {
                const id = $(this).data('id');
                self.printReceipt(id);
            });
            
            // Delete button
            $(document).on('click.' + this.eventNamespace, '.btn-delete', function() {
                const id = $(this).data('id');
                self.deleteDonation(id);
            });
        },
        
        // Apply filters
        applyFilters: function() {
            const type = $('#filterType').val();
            const payment = $('#filterPayment').val();
            const fromDate = $('#filterFromDate').val();
            const toDate = $('#filterToDate').val();
            
            // Apply filters to DataTable
            if (this.dataTable) {
                // Custom filtering logic
                $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
                    // Type filter
                    if (type && data[3].indexOf(type) === -1) {
                        return false;
                    }
                    
                    // Payment filter
                    if (payment && data[5].indexOf(payment) === -1) {
                        return false;
                    }
                    
                    // Date range filter
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
                
                // Remove filter after drawing
                $.fn.dataTable.ext.search.pop();
            }
            
            // Animate filter card
            gsap.fromTo('.filter-card', 
                { scale: 0.98 },
                { scale: 1, duration: 0.2, ease: 'back.out(1.2)' }
            );
        },
        
        // View donation
        viewDonation: function(id) {
            console.log('View donation:', id);
            // TempleRouter.navigate('donations/view/' + id);
            TempleCore.showToast('View feature coming soon', 'info');
        },
        
        // Edit donation
        editDonation: function(id) {
            console.log('Edit donation:', id);
            // TempleRouter.navigate('donations/edit/' + id);
            TempleCore.showToast('Edit feature coming soon', 'info');
        },
        
        // Print receipt
        printReceipt: function(id) {
            console.log('Print receipt:', id);
            TempleCore.showToast('Printing receipt...', 'info');
            // Implement print logic
        },
        
        // Delete donation
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
                    // Simulate deletion (replace with actual API call)
                    console.log('Delete donation:', id);
                    
                    // Show success and reload
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Donation record has been deleted.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    
                    // Reload table
                    if (self.dataTable) {
                        self.dataTable.ajax.reload();
                    }
                    
                    // Actual implementation:
                    /*
                    TempleAPI.delete('/donations/' + id)
                        .done(function(response) {
                            if (response.success) {
                                Swal.fire({
                                    title: 'Deleted!',
                                    text: 'Donation record has been deleted.',
                                    icon: 'success',
                                    timer: 1500,
                                    showConfirmButton: false
                                });
                                self.dataTable.ajax.reload();
                            }
                        })
                        .fail(function() {
                            Swal.fire('Error', 'Failed to delete donation', 'error');
                        });
                    */
                }
            });
        }
    };
    
})(jQuery, window);