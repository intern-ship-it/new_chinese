// js/pages/buddha-lamp/index.js
// Buddha Lamp Booking Listing Page with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    window.BuddhaLampPage = {
        dataTable: null,
        
        // Page initialization
        init: function(params) {
            this.loadCSS();
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadData();
        },
        
        // Load CSS dynamically
        loadCSS: function() {
            if (!document.getElementById('buddha-lamp-css')) {
                const link = document.createElement('link');
                link.id = 'buddha-lamp-css';
                link.rel = 'stylesheet';
                link.href = '/css/buddha-lamp.css';
                document.head.appendChild(link);
            }
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="buddha-lamp-list-page">
                    <!-- Page Header with Animation -->
                    <div class="buddha-lamp-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-brightness-high-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Buddha Lamp Bookings</h1>
                                            <p class="buddha-lamp-subtitle">佛前灯预订 • Temple Buddha Lamp Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnAddNew">
                                        <i class="bi bi-plus-circle"></i> New Booking
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="row mb-4" data-aos="fade-up" data-aos-duration="800">
                        <div class="col-md-4 mb-3">
                            <div class="card stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-brightness-high"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Bookings</div>
                                        <div class="stat-value" id="totalBookings">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 mb-3">
                            <div class="card stat-card stat-card-success">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-cash-stack"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">Total Amount</div>
                                        <div class="stat-value" id="totalAmount">RM 0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 mb-3">
                            <div class="card stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-check"></i>
                                    </div>
                                    <div class="ms-3 flex-grow-1">
                                        <div class="stat-label">This Month</div>
                                        <div class="stat-value" id="thisMonth">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Card -->
                    <div class="card shadow-sm mb-4 filter-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Date From</label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Date To</label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Payment Method</label>
                                    <select class="form-select" id="filterPaymentMethod">
                                        <option value="">All Methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="ebanking">e-Banking</option>
                                        <option value="card">Credit/Debit Card</option>
                                        <option value="duitnow">DuitNow</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-primary w-100" id="btnApplyFilter">
                                        <i class="bi bi-funnel"></i> Apply Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table Card -->
                    <div class="card shadow-sm table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="buddhaLampTable" class="table table-hover" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>Booking ID</th>
                                            <th>Name (Chinese)</th>
                                            <th>Name (English)</th>
                                            <th>Contact No.</th>
                                            <th>Amount (RM)</th>
                                            <th>Payment Method</th>
                                            <th>Booking Date</th>
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
            
            // Animate stat cards on load
            gsap.from('.stat-card', {
                scale: 0.9,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'back.out(1.2)'
            });
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Add new booking button
            $('#btnAddNew').on('click', function() {
                gsap.to(this, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        TempleRouter.navigate('buddha-lamp/create');
                    }
                });
            });
            
            // Apply filter button
            $('#btnApplyFilter').on('click', function() {
                self.applyFilters();
            });
            
            // Button hover animations
            $('.btn').hover(
                function() {
                    gsap.to($(this), {
                        scale: 1.05,
                        duration: 0.2,
                        ease: 'power1.out'
                    });
                },
                function() {
                    gsap.to($(this), {
                        scale: 1,
                        duration: 0.2
                    });
                }
            );
        },
        
        // Load data and initialize DataTable
        loadData: function() {
            const self = this;
            
            // Sample data (replace with actual API call)
            const sampleData = this.generateSampleData();
            
            // Initialize DataTable
            this.dataTable = $('#buddhaLampTable').DataTable({
                data: sampleData,
                columns: [
                    { data: 'id' },
                    { data: 'name_chinese' },
                    { data: 'name_english' },
                    { data: 'contact_no' },
                    { 
                        data: 'amount',
                        render: function(data) {
                            const amount = typeof data === 'string' ? parseFloat(data) : data;
                            return amount.toFixed(2);
                        }
                    },
                    { 
                        data: 'payment_method',
                        render: function(data) {
                            return self.getPaymentMethodBadge(data);
                        }
                    },
                    { data: 'booking_date' },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-primary btn-view" data-id="${row.id}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-success btn-edit" data-id="${row.id}">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-delete" data-id="${row.id}">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[6, 'desc']], // Sort by booking date descending
                responsive: true,
                pageLength: 25,
                language: {
                    search: "Search bookings:",
                    lengthMenu: "Show _MENU_ bookings per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ bookings",
                    infoEmpty: "No bookings found",
                    infoFiltered: "(filtered from _MAX_ total bookings)",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                drawCallback: function() {
                    self.bindTableActions();
                    self.animateTableRows();
                }
            });
            
            // Update stats
            this.updateStats(sampleData);
            
            // Actual implementation would use API:
            /*
            TempleAPI.get('/buddha-lamp')
                .done(function(response) {
                    if (response.success) {
                        self.dataTable = $('#buddhaLampTable').DataTable({
                            data: response.data,
                            // ... rest of configuration
                        });
                        self.updateStats(response.data);
                    }
                })
                .fail(function(error) {
                    TempleCore.showToast('Failed to load bookings', 'error');
                });
            */
        },
        
        // Generate sample data
        generateSampleData: function() {
            const data = [];
            const paymentMethods = ['cash', 'cheque', 'ebanking', 'card', 'duitnow'];
            const chineseNames = ['李明', '王芳', '张伟', '刘静', '陈杰'];
            const englishNames = ['Li Ming', 'Wang Fang', 'Zhang Wei', 'Liu Jing', 'Chen Jie'];
            
            for (let i = 1; i <= 50; i++) {
                const randomIndex = Math.floor(Math.random() * chineseNames.length);
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 90));
                
                data.push({
                    id: 'BL' + String(i).padStart(5, '0'),
                    name_chinese: chineseNames[randomIndex],
                    name_english: englishNames[randomIndex],
                    nric: '******-**-' + String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
                    email: englishNames[randomIndex].toLowerCase().replace(' ', '.') + '@email.com',
                    contact_no: '+60 1' + Math.floor(Math.random() * 90000000 + 10000000),
                    amount: Math.random() > 0.5 ? 5000.00 : parseFloat((Math.random() * 1000 + 100).toFixed(2)),
                    payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                    booking_date: date.toISOString().split('T')[0]
                });
            }
            
            return data;
        },
        
        // Get payment method badge
        getPaymentMethodBadge: function(method) {
            const badges = {
                'cash': '<span class="badge bg-success">Cash</span>',
                'cheque': '<span class="badge bg-info">Cheque</span>',
                'ebanking': '<span class="badge bg-primary">e-Banking</span>',
                'card': '<span class="badge bg-warning">Card</span>',
                'duitnow': '<span class="badge bg-danger">DuitNow</span>'
            };
            return badges[method] || '<span class="badge bg-secondary">' + method + '</span>';
        },
        
        // Bind table actions
        bindTableActions: function() {
            const self = this;
            
            // View button
            $('.btn-view').off('click').on('click', function() {
                const id = $(this).data('id');
                self.viewBooking(id);
            });
            
            // Edit button
            $('.btn-edit').off('click').on('click', function() {
                const id = $(this).data('id');
                self.editBooking(id);
            });
            
            // Delete button
            $('.btn-delete').off('click').on('click', function() {
                const id = $(this).data('id');
                self.deleteBooking(id);
            });
        },
        
        // Animate table rows
        animateTableRows: function() {
            const visibleRows = $('#buddhaLampTable tbody tr:visible').slice(0, 25);
			gsap.fromTo(visibleRows, 
				{ opacity: 0, y: 20 },           // Start state
				{ 
					opacity: 1,                  // ✅ Explicit end state
					y: 0,                        // ✅ Explicit end state
					duration: 0.4,
					stagger: 0.03,               // ✅ Faster (25 × 0.03 = 0.75s)
					ease: 'power2.out',
					clearProps: 'all'            // ✅ Remove inline styles
				}
			);
        },
        
        // View booking
        viewBooking: function(id) {
            console.log('View booking:', id);
            // Implement view logic
            TempleCore.showToast('View booking: ' + id, 'info');
        },
        
        // Edit booking
        editBooking: function(id) {
            console.log('Edit booking:', id);
            // Implement edit logic
            TempleRouter.navigate('buddha-lamp/edit', { id: id });
        },
        
        // Delete booking
        deleteBooking: function(id) {
            const self = this;
            
            // Show confirmation dialog
            if (confirm('Are you sure you want to delete this booking?')) {
                // Animate row removal
                const row = $('.btn-delete[data-id="' + id + '"]').closest('tr');
                gsap.to(row[0], {
                    opacity: 0,
                    x: -50,
                    duration: 0.3,
                    onComplete: () => {
                        // Remove from DataTable
                        self.dataTable.row(row).remove().draw();
                        TempleCore.showToast('Booking deleted successfully', 'success');
                    }
                });
                
                // Actual implementation:
                /*
                TempleAPI.delete('/buddha-lamp/' + id)
                    .done(function(response) {
                        if (response.success) {
                            self.dataTable.row(row).remove().draw();
                            TempleCore.showToast('Booking deleted successfully', 'success');
                        }
                    })
                    .fail(function(error) {
                        TempleCore.showToast('Failed to delete booking', 'error');
                    });
                */
            }
        },
        
        // Apply filters
        applyFilters: function() {
            const dateFrom = $('#filterDateFrom').val();
            const dateTo = $('#filterDateTo').val();
            const paymentMethod = $('#filterPaymentMethod').val();
            
            // Animate filter button
            gsap.to('#btnApplyFilter', {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
            
            // Apply custom filter logic
            $.fn.dataTable.ext.search.push(
                function(settings, data, dataIndex) {
                    const bookingDate = data[6]; // Booking date column
                    const rowPaymentMethod = $(data[5]).text().toLowerCase(); // Payment method
                    
                    let dateMatch = true;
                    let paymentMatch = true;
                    
                    // Date filter
                    if (dateFrom && bookingDate < dateFrom) dateMatch = false;
                    if (dateTo && bookingDate > dateTo) dateMatch = false;
                    
                    // Payment method filter
                    if (paymentMethod && !rowPaymentMethod.includes(paymentMethod)) {
                        paymentMatch = false;
                    }
                    
                    return dateMatch && paymentMatch;
                }
            );
            
            this.dataTable.draw();
            $.fn.dataTable.ext.search.pop();
            
            TempleCore.showToast('Filters applied', 'success');
        },
        
        // Update statistics
        updateStats: function(data) {
            // Calculate stats
            const totalBookings = data.length;
            const totalAmount = data.reduce((sum, item) => sum + parseFloat(item.amount), 0);
            
            // This month count
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const thisMonth = data.filter(item => {
                const bookingDate = new Date(item.booking_date);
                return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
            }).length;
            
            // Animate counter updates
            this.animateCounter('#totalBookings', 0, totalBookings, 1000);
            this.animateCounter('#totalAmount', 0, totalAmount, 1000, 'RM ');
            this.animateCounter('#thisMonth', 0, thisMonth, 1000);
        },
        
        // Animate counter
        animateCounter: function(selector, start, end, duration, prefix = '') {
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
        }
    };
    
})(jQuery, window);