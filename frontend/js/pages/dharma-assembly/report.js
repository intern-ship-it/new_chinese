// js/pages/dharma-assembly/report/index.js
// Dharma Assembly Report Page with Print functionality

(function($, window) {
    'use strict';
    
    if (!window.DharmaAssemblySharedModule) {
        window.DharmaAssemblySharedModule = {
            moduleId: 'dharma-assembly',
            eventNamespace: 'dharma-assembly',
            cssId: 'dharma-assembly-css',
            cssPath: '/css/dharma-assembly.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Dharma Assembly CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Dharma Assembly page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Dharma Assembly page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('Dharma Assembly CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all dharma-assembly-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Dharma Assembly module cleaned up');
            }
        };
    }
    
    window.DharmaAssemblyReportPage = {
        pageId: 'dharma-assembly-report',
        eventNamespace: window.DharmaAssemblySharedModule.eventNamespace,
        reportData: [],
        filteredData: [],
        templeSettings: null,
        
        // Page initialization
        init: function(params) {
            window.DharmaAssemblySharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.loadTempleSettings();
            this.loadReportData();
            this.bindEvents();
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.DharmaAssemblySharedModule.unregisterPage(this.pageId);
            
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
                <div class="dharma-assembly-page ${this.pageId}-page">
                    <!-- Page Header -->
                    <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-file-text-fill occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Dharma Assembly Report</h1>
                                            <p class="occasion-subtitle">Registration Reports & Analytics</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnBack">
                                        <i class="bi bi-arrow-left-circle"></i> Back to List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Report Filters -->
                    <div class="card shadow-sm filter-card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body">
                            <h5 class="card-title mb-3">
                                <i class="bi bi-funnel me-2"></i>Report Filters
                            </h5>
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">Assembly Type</label>
                                    <select class="form-select" id="reportAssemblyType">
                                        <option value="">All Types</option>
                                        <option value="longevity">Prayer for Longevity</option>
                                        <option value="departed">Prayer to The Departed</option>
                                        <option value="merit">Merit Dedication</option>
                                    </select>
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">Date From</label>
                                    <input type="date" class="form-control" id="reportDateFrom">
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">Date To</label>
                                    <input type="date" class="form-control" id="reportDateTo">
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">Status</label>
                                    <select class="form-select" id="reportStatus">
                                        <option value="">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-12 text-end">
                                    <button class="btn btn-secondary" id="btnResetReportFilters">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                    <button class="btn btn-primary" id="btnApplyReportFilters">
                                        <i class="bi bi-search"></i> Apply Filters
                                    </button>
                                    <button class="btn btn-success" id="btnPrintReport">
                                        <i class="bi bi-printer"></i> Print Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Stats -->
                    <div class="row g-3 mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="col-md-3">
                            <div class="stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-check-fill"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="reportTotalRegistrations">0</div>
                                        <div class="stat-label">Total Registrations</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <div class="stat-card stat-card-success">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-cash-stack"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="reportTotalAmount">RM 0</div>
                                        <div class="stat-label">Total Amount</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <div class="stat-card stat-card-info">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calculator"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="reportAverageAmount">RM 0</div>
                                        <div class="stat-label">Average Amount</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <div class="stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-star-fill"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="reportTopAssembly">-</div>
                                        <div class="stat-label">Top Assembly Type</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Report Table -->
                    <div class="card shadow-sm table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                        <div class="card-body">
                            <h5 class="card-title mb-3">
                                <i class="bi bi-table me-2"></i>Registration Details
                                <span class="badge bg-primary ms-2" id="reportRecordCount">0 records</span>
                            </h5>
                            <div class="table-responsive">
                                <table id="reportTable" class="table table-hover" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Name</th>
                                            <th>Assembly Type</th>
                                            <th>Option</th>
                                            <th>Contact</th>
                                            <th>Amount</th>
                                            <th>Payment Method</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="reportTableBody">
                                        <!-- Data will be populated dynamically -->
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
            AOS.init({
                duration: 800,
                easing: 'ease-out',
                once: true
            });
            
            // Animate header background
            gsap.to('.occasion-header-bg', {
                backgroundPosition: '100% 100%',
                duration: 20,
                repeat: -1,
                ease: 'none'
            });
            
            // Animate header icon
            gsap.to('.occasion-header-icon', {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
        },
        
        // Load temple settings
        loadTempleSettings: function() {
            const self = this;
            
            // Try to fetch fresh settings from server first
            if (typeof TempleAPI !== 'undefined') {
                TempleAPI.get('/settings?type=SYSTEM')
                    .done(function(response) {
                        if (response.success && response.data && response.data.values) {
                            self.templeSettings = response.data.values;
                        } else {
                            self.fallbackToLocalStorage();
                        }
                    })
                    .fail(function() {
                        self.fallbackToLocalStorage();
                    });
            } else {
                self.fallbackToLocalStorage();
            }
        },
        
        fallbackToLocalStorage: function() {
            // Fallback to localStorage or default values
            const stored = JSON.parse(localStorage.getItem(APP_CONFIG?.STORAGE?.TEMPLE) || '{}');
            this.templeSettings = {
                temple_name: stored.name || 'Persatuan Hainan Selangor & Wilayah Persekutuan',
                temple_address: stored.address || '65, Persiaran Endah, Off Jalan Syed Putra',
                temple_city: stored.city || '50460 Kuala Lumpur',
                temple_state: stored.state || '',
                temple_pincode: stored.pincode || '',
                temple_country: stored.country || 'Malaysia',
                temple_phone: stored.phone || '03-2273 7088',
                temple_email: stored.email || 'hainan@hainannet.com.my',
                temple_logo_url: stored.temple_logo || ''
            };
        },
        
        // Load report data (sample data for now)
        loadReportData: function() {
            // Using the same sample data structure as the listing page
            this.reportData = [
                {
                    id: 1,
                    date: '2024-11-15',
                    name: 'Wong Ah Kow',
                    assembly_type: 'longevity',
                    contact: '+60123456789',
                    amount: 30000.00,
                    status: 'confirmed',
                    details: {
                        nric: '800101-01-1234',
                        email: 'wong@example.com',
                        option: 'Chief Patron',
                        payment_methods: ['Cash', 'Cheque'],
                        remarks: 'Special request for front row seating'
                    }
                },
                {
                    id: 2,
                    date: '2024-11-14',
                    name: 'Tan Mei Ling',
                    assembly_type: 'departed',
                    contact: '+60187654321',
                    amount: 1000.00,
                    status: 'pending',
                    details: {
                        nric: '850505-05-5678',
                        email: 'tan@example.com',
                        option: '1 Tablet (Individual)',
                        dedicatees: ['Late Father', 'Late Mother'],
                        departed_name: 'Tan Ah Seng, Lim Ah Mooi',
                        payment_methods: ['E-banking'],
                        remarks: ''
                    }
                },
                {
                    id: 3,
                    date: '2024-11-13',
                    name: 'Lee Wei Ming',
                    assembly_type: 'merit',
                    contact: '+60162345678',
                    amount: 1000.00,
                    status: 'completed',
                    details: {
                        nric: '900303-03-9012',
                        email: 'lee@example.com',
                        option: 'Perfect Meal',
                        wisdom_light: 'Family',
                        devas_offering: 'Individual',
                        payment_methods: ['Credit Card'],
                        remarks: 'Thank you for the blessings'
                    }
                },
                {
                    id: 4,
                    date: '2024-11-12',
                    name: 'Lim Siew Lan',
                    assembly_type: 'longevity',
                    contact: '+60198765432',
                    amount: 5000.00,
                    status: 'confirmed',
                    details: {
                        nric: '750707-07-3456',
                        email: 'lim@example.com',
                        option: 'Mercy Patron',
                        payment_methods: ['DuitNow'],
                        remarks: ''
                    }
                },
                {
                    id: 5,
                    date: '2024-11-11',
                    name: 'Chen Yong Hui',
                    assembly_type: 'departed',
                    contact: '+60123334444',
                    amount: 500.00,
                    status: 'completed',
                    details: {
                        nric: '880909-09-7890',
                        email: 'chen@example.com',
                        option: '1 Tablet (4 Family Members)',
                        dedicatees: ['Late Grandfather', 'Late Grandmother'],
                        departed_name: 'Chen Ah Beng, Goh Ah Hwa',
                        payment_methods: ['Cash'],
                        remarks: 'Prayer for ancestors'
                    }
                }
            ];
            
            this.filteredData = [...this.reportData];
            this.updateReportDisplay();
        },
        
        // Update report display
        updateReportDisplay: function() {
            this.updateStats();
            this.updateTable();
        },
        
        // Update statistics
        updateStats: function() {
            const data = this.filteredData;
            
            const totalRegistrations = data.length;
            const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
            const averageAmount = totalRegistrations > 0 ? totalAmount / totalRegistrations : 0;
            
            // Find top assembly type
            const assemblyTypeCounts = {};
            data.forEach(item => {
                assemblyTypeCounts[item.assembly_type] = (assemblyTypeCounts[item.assembly_type] || 0) + 1;
            });
            
            const topAssemblyType = Object.keys(assemblyTypeCounts).reduce((a, b) => 
                assemblyTypeCounts[a] > assemblyTypeCounts[b] ? a : b, 'none');
            
            const assemblyTypeLabels = {
                'longevity': 'Longevity',
                'departed': 'Departed',
                'merit': 'Merit'
            };
            
            // Animate stat values
            this.animateValue('reportTotalRegistrations', 0, totalRegistrations, 1000);
            $('#reportTotalAmount').text(`RM ${this.formatCurrency(totalAmount)}`);
            $('#reportAverageAmount').text(`RM ${this.formatCurrency(averageAmount)}`);
            $('#reportTopAssembly').text(assemblyTypeLabels[topAssemblyType] || '-');
        },
        
        // Update table
        updateTable: function() {
            const tbody = $('#reportTableBody');
            tbody.empty();
            
            $('#reportRecordCount').text(`${this.filteredData.length} records`);
            
            const assemblyTypeLabels = {
                'longevity': 'Prayer for Longevity',
                'departed': 'Prayer to The Departed',
                'merit': 'Merit Dedication'
            };
            
            this.filteredData.forEach(item => {
                const row = `
                    <tr>
                        <td>${this.formatDate(item.date)}</td>
                        <td><strong>${item.name}</strong></td>
                        <td>
                            <span class="badge bg-${this.getAssemblyBadgeColor(item.assembly_type)}">
                                ${assemblyTypeLabels[item.assembly_type]}
                            </span>
                        </td>
                        <td>${item.details?.option || '-'}</td>
                        <td>${item.contact}</td>
                        <td><strong class="text-primary">RM ${this.formatCurrency(item.amount)}</strong></td>
                        <td>${item.details?.payment_methods?.join(', ') || '-'}</td>
                        <td>
                            <span class="badge bg-${this.getStatusBadgeColor(item.status)}">
                                ${item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
            
            // Animate table rows
            gsap.from('#reportTable tbody tr', {
                opacity: 0,
                y: 20,
                duration: 0.3,
                stagger: 0.05,
                ease: 'power2.out'
            });
        },
        
        // Get assembly badge color
        getAssemblyBadgeColor: function(type) {
            const colors = {
                'longevity': 'success',
                'departed': 'info',
                'merit': 'warning'
            };
            return colors[type] || 'secondary';
        },
        
        // Get status badge color
        getStatusBadgeColor: function(status) {
            const colors = {
                'pending': 'warning',
                'confirmed': 'primary',
                'completed': 'success',
                'cancelled': 'danger'
            };
            return colors[status] || 'secondary';
        },
        
        // Apply filters
        applyFilters: function() {
            const assemblyType = $('#reportAssemblyType').val();
            const dateFrom = $('#reportDateFrom').val();
            const dateTo = $('#reportDateTo').val();
            const status = $('#reportStatus').val();
            
            this.filteredData = this.reportData.filter(item => {
                // Assembly type filter
                if (assemblyType && item.assembly_type !== assemblyType) {
                    return false;
                }
                
                // Date range filter
                if (dateFrom && item.date < dateFrom) {
                    return false;
                }
                if (dateTo && item.date > dateTo) {
                    return false;
                }
                
                // Status filter
                if (status && item.status !== status) {
                    return false;
                }
                
                return true;
            });
            
            this.updateReportDisplay();
            
            // Animate filter application
            gsap.fromTo('.table-card', 
                { scale: 0.98, opacity: 0.7 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
            
            TempleCore.showToast('Filters applied', 'info');
        },
        
        // Reset filters
        resetFilters: function() {
            $('#reportAssemblyType').val('');
            $('#reportDateFrom').val('');
            $('#reportDateTo').val('');
            $('#reportStatus').val('');
            
            this.filteredData = [...this.reportData];
            this.updateReportDisplay();
            
            TempleCore.showToast('Filters reset', 'info');
        },
        
        // Print report
        printReport: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print report', 'warning');
                return;
            }
            
            const html = this.generateReportHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
        },
        
        // Generate report HTML
        generateReportHTML: function() {
            const temple = this.templeSettings;
            const logoHTML = this.getTempleLogoHTML();
            
            const assemblyType = $('#reportAssemblyType').val();
            const dateFrom = $('#reportDateFrom').val();
            const dateTo = $('#reportDateTo').val();
            const status = $('#reportStatus').val();
            
            // Calculate totals
            const totalAmount = this.filteredData.reduce((sum, item) => sum + item.amount, 0);
            const averageAmount = this.filteredData.length > 0 ? totalAmount / this.filteredData.length : 0;
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Dharma Assembly Report</title>
                    <meta charset="utf-8">
                    <style>
                        :root {
			--primary-color: #800000;
			}
			body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            background: white;
                            line-height: 1.4;
                        }
                        .btn {
                            padding: 8px 16px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            margin: 0 5px;
                        }
                        .btn-primary { background: #007bff; color: white; }
                        .btn-info { background: #17a2b8; color: white; }
                        .report-container {
                            max-width: 900px;
                            margin: 0 auto;
                            background: white;
                        }
                        .header-section {
                            border-bottom: 2px solid #c2c2c2;
                            padding-bottom: 20px;
                            margin-bottom: 20px;
                            display: flex;
                        }
                        .temple-logo {
                            align-items: center;
                            margin-right: 20px;
                        }
                        .temple-info {
                            font-size: 13px;
                            line-height: 1.5;
                        }
                        .temple-name {
                            font-size: 21px;
                            font-weight: bold;
                            color: var(--primary-color);
                            margin-bottom: 5px;
                        }
                        .report-title {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            margin: 20px 0;
                            color: #333;
                        }
                        .filter-info {
                            background-color: #f8f9fa;
                            padding: 15px;
                            margin: 20px 0;
                            border: 1px solid #dee2e6;
                            border-radius: 5px;
                        }
                        .summary-stats {
                            display: flex;
                            justify-content: space-around;
                            margin: 20px 0;
                            padding: 15px;
                            background-color: #f8f9fa;
                            border-radius: 5px;
                        }
                        .stat-item {
                            text-align: center;
                        }
                        .stat-value {
                            font-size: 18px;
                            font-weight: bold;
                            color: var(--primary-color);
                        }
                        .stat-label {
                            font-size: 12px;
                            color: #666;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        th, td {
                            border: 1px solid #dee2e6;
                            padding: 8px;
                            text-align: left;
                            font-size: 12px;
                        }
                        th {
                            background-color: #f8f9fa;
                            font-weight: bold;
                        }
                        .amount {
                            text-align: right;
                        }
                        .total-row {
                            font-weight: bold;
                            background-color: #f8f9fa;
                        }
                        .clear { clear: both; }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="100%" border="0" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="70%"></td>
                            <td width="15%" style="text-align: right;">
                                <button class="btn btn-primary" onclick="window.close()">Back</button>
                            </td>
                            <td width="15%" style="text-align: right;">
                                <button class="btn btn-info" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    <div class="report-container">
                        <!-- Header Section -->
                        <div class="header-section">
                            ${logoHTML}
                            <div class="temple-info">
                                <div class="temple-name">${temple.temple_name || 'Temple Name'}</div>
                                <div>${temple.temple_address || 'Temple Address'}</div>
                                <div>${temple.temple_city || ''} ${temple.temple_state || ''} ${temple.temple_pincode || ''}</div>
                                <div>${temple.temple_country || 'Malaysia'}</div>
                                ${temple.temple_phone ? `<div>Tel: ${temple.temple_phone}</div>` : ''}
                                ${temple.temple_email ? `<div>Email: ${temple.temple_email}</div>` : ''}
                            </div>
                            <div class="clear"></div>
                        </div>
                        
                        <!-- Report Title -->
                        <div class="report-title">Dharma Assembly Registration Report</div>
                        
                        <!-- Filter Information -->
                        <div class="filter-info">
                            <strong>Report Filters:</strong><br>
                            Assembly Type: ${assemblyType || 'All Types'}<br>
                            Date Range: ${dateFrom || 'All dates'} ${dateTo ? 'to ' + dateTo : ''}<br>
                            Status: ${status || 'All Status'}<br>
                            Generated on: ${new Date().toLocaleDateString()}
                        </div>
                        
                        <!-- Summary Statistics -->
                        <div class="summary-stats">
                            <div class="stat-item">
                                <div class="stat-value">${this.filteredData.length}</div>
                                <div class="stat-label">Total Registrations</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">RM ${this.formatCurrency(totalAmount)}</div>
                                <div class="stat-label">Total Amount</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">RM ${this.formatCurrency(averageAmount)}</div>
                                <div class="stat-label">Average Amount</div>
                            </div>
                        </div>
                        
                        <!-- Report Table -->
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Assembly Type</th>
                                    <th>Option</th>
                                    <th>Contact</th>
                                    <th>Amount</th>
                                    <th>Payment Method</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateTableRows()}
                                <tr class="total-row">
                                    <td colspan="5"><strong>TOTAL</strong></td>
                                    <td class="amount"><strong>RM ${this.formatCurrency(totalAmount)}</strong></td>
                                    <td colspan="2"><strong>${this.filteredData.length} Records</strong></td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
                            Report generated on ${new Date().toLocaleString()}
                        </div>
                    </div>
                    
                    <script>
                        window.onload = function() {
                            setTimeout(() => {
                                // window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
        },
        
        // Generate table rows for print
        generateTableRows: function() {
            const assemblyTypeLabels = {
                'longevity': 'Prayer for Longevity',
                'departed': 'Prayer to The Departed',
                'merit': 'Merit Dedication'
            };
            
            return this.filteredData.map(item => {
                return `
                    <tr>
                        <td>${this.formatDate(item.date)}</td>
                        <td>${item.name}</td>
                        <td>${assemblyTypeLabels[item.assembly_type]}</td>
                        <td>${item.details?.option || '-'}</td>
                        <td>${item.contact}</td>
                        <td class="amount">RM ${this.formatCurrency(item.amount)}</td>
                        <td>${item.details?.payment_methods?.join(', ') || '-'}</td>
                        <td style="text-transform: capitalize;">${item.status}</td>
                    </tr>
                `;
            }).join('');
        },
        
        // Get temple logo HTML
        getTempleLogoHTML: function() {
            if (this.templeSettings.temple_logo) {
                return `<div class="temple-logo">
                    <img src="${this.templeSettings.temple_logo}" style="width:205px;height:80px;object-fit:contain;" alt="Temple Logo" />
                </div>`;
            } else {
                return `
                    <div class="temple-logo" style="
                        width: 80px; 
                        height: 80px; 
                        background: var(--primary-color); 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: white; 
                        font-size: 12px;
                        text-align: center;
                    ">
                        DHARMA<br>ASSEMBLY
                    </div>
                `;
            }
        },
        
        // Format currency
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        // Format date
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        // Animate number value
        animateValue: function(id, start, end, duration) {
            const obj = document.getElementById(id);
            if (!obj) return;
            
            const range = end - start;
            const increment = end > start ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));
            let current = start;
            
            const timer = setInterval(function() {
                current += increment;
                obj.textContent = current;
                if (current === end) {
                    clearInterval(timer);
                }
            }, stepTime);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Back button
            $('#btnBack').on('click.' + this.eventNamespace, function() {
                self.cleanup();
                TempleRouter.navigate('dharma-assembly');
            });
            
            // Apply filters
            $('#btnApplyReportFilters').on('click.' + this.eventNamespace, function() {
                self.applyFilters();
            });
            
            // Reset filters
            $('#btnResetReportFilters').on('click.' + this.eventNamespace, function() {
                self.resetFilters();
            });
            
            // Print report
            $('#btnPrintReport').on('click.' + this.eventNamespace, function() {
                self.printReport();
            });
            
            // Filter input animations
            $('.form-select, .form-control').on('focus.' + this.eventNamespace, function() {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur.' + this.eventNamespace, function() {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });
        }
    };
    
})(jQuery, window);