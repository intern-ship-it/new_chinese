// js/pages/rom-booking/report-print.js
// ROM Booking Report Print Page - Professional Print Layout

(function($, window) {
    'use strict';
    
    if (!window.RomSharedModule) {
        window.RomSharedModule = {
            moduleId: 'rom',
            eventNamespace: 'rom',
            cssId: 'rom-css',
            cssPath: '/css/rom-booking.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('ROM CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`ROM page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`ROM page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('ROM CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('ROM module cleaned up');
            }
        };
    }

    window.RomBookingReportPrintPage = {
        reportData: null,
        templeSettings: null,
        reportFilters: null,
        pageId: 'rom-booking-report-print',
        eventNamespace: window.RomSharedModule.eventNamespace,
        
        init: function(params) {
            window.RomSharedModule.registerPage(this.pageId);
            this.reportFilters = params || {};
            
            console.log('ROM Report filters received:', this.reportFilters);
            this.loadAndPrint();
        },
        
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            window.RomSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            Promise.all([
                this.loadReportData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                console.error('Error loading ROM report:', error);
                TempleCore.showToast(error.message || 'Error loading report data', 'error');
                self.cleanup();
                TempleRouter.navigate('rom-booking');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadReportData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                const params = new URLSearchParams();
                
                // Apply filters
                if (self.reportFilters.status) {
                    params.append('status', self.reportFilters.status);
                }
                if (self.reportFilters.payment_status) {
                    params.append('payment_status', self.reportFilters.payment_status);
                }
                if (self.reportFilters.date_from) {
                    params.append('date_from', self.reportFilters.date_from);
                }
                if (self.reportFilters.date_to) {
                    params.append('date_to', self.reportFilters.date_to);
                }
                if (self.reportFilters.search) {
                    params.append('search', self.reportFilters.search);
                }
                
                const queryString = params.toString();
                const apiUrl = queryString ? `/rom-booking/report?${queryString}` : '/rom-booking/report';
                
                console.log('Loading ROM report from API:', apiUrl);
                
                TempleAPI.get(apiUrl)
                    .done(function(response) {
                        if (response.success && response.data) {
                            self.reportData = response.data;
                            console.log('ROM Report data loaded:', self.reportData);
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Failed to load report data'));
                        }
                    })
                    .fail(function(xhr) {
                        console.error('API Error:', xhr);
                        console.warn('ROM Report endpoint not found, using bookings list as fallback');
                        self.loadReportFromBookingsList()
                            .then(resolve)
                            .catch(reject);
                    });
            });
        },
        
        loadReportFromBookingsList: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                const params = new URLSearchParams();
                params.append('per_page', 1000);
                
                if (self.reportFilters.status) {
                    params.append('status', self.reportFilters.status);
                }
                if (self.reportFilters.payment_status) {
                    params.append('payment_status', self.reportFilters.payment_status);
                }
                if (self.reportFilters.date_from) {
                    params.append('date_from', self.reportFilters.date_from);
                }
                if (self.reportFilters.date_to) {
                    params.append('date_to', self.reportFilters.date_to);
                }
                if (self.reportFilters.search) {
                    params.append('search', self.reportFilters.search);
                }
                
                TempleAPI.get(`/rom-booking?${params.toString()}`)
                    .done(function(response) {
                        if (response.success && response.data) {
                            const bookings = response.data;
                            const summary = self.calculateSummary(bookings);
                            
                            self.reportData = {
                                title: 'ROM Booking Report',
                                period: {
                                    from: self.reportFilters.date_from || bookings[0]?.booking_date || new Date().toISOString().split('T')[0],
                                    to: self.reportFilters.date_to || bookings[bookings.length - 1]?.booking_date || new Date().toISOString().split('T')[0]
                                },
                                filters: {
                                    status: self.reportFilters.status || '',
                                    payment_status: self.reportFilters.payment_status || ''
                                },
                                summary: summary,
                                bookings: bookings.map(b => ({
                                    id: b.booking_number || b.id,
                                    date: b.booking_date,
                                    register_name: b.register_name,
                                    register_phone: b.register_phone,
                                    register_email: b.register_details?.email || '',
                                    register_ic: b.register_details?.ic || '',
                                    couples_count: b.couples?.length || 0,
                                    couples: b.couples || [],
                                    witnesses_count: b.witnesses?.length || 0,
                                    venue: b.venue?.name_primary || b.venue?.name_secondary || 'N/A',
                                    session: b.session?.name_primary || b.session?.name_secondary || 'N/A',
                                    session_time: b.session?.from_time && b.session?.to_time 
                                        ? `${b.session.from_time} - ${b.session.to_time}` 
                                        : 'N/A',
                                    amount: parseFloat(b.total_amount || 0),
                                    payment_status: b.payment_status || 'PENDING',
                                    booking_status: b.booking_status || 'PENDING',
                                    notes: b.additional_notes || ''
                                })),
                                generated_at: new Date().toISOString()
                            };
                            
                            console.log('ROM Report built from bookings list:', self.reportData);
                            resolve();
                        } else {
                            reject(new Error('Failed to load ROM bookings data'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading ROM bookings data'));
                    });
            });
        },
        
        calculateSummary: function(bookings) {
            const summary = {
                total_bookings: bookings.length,
                total_couples: 0,
                total_amount: 0,
                average_amount: 0,
                pending_count: 0,
                confirmed_count: 0,
                completed_count: 0,
                cancelled_count: 0,
                payment_pending: 0,
                payment_partial: 0,
                payment_full: 0,
                venue_breakdown: {},
                status_amounts: {
                    pending: 0,
                    confirmed: 0,
                    completed: 0,
                    cancelled: 0
                }
            };
            
            bookings.forEach(booking => {
                const amount = parseFloat(booking.total_amount || 0);
                summary.total_amount += amount;
                summary.total_couples += booking.couples?.length || 0;
                
                // Count by booking status
                const status = (booking.booking_status || 'PENDING').toUpperCase();
                if (status === 'PENDING') {
                    summary.pending_count++;
                    summary.status_amounts.pending += amount;
                } else if (status === 'CONFIRMED') {
                    summary.confirmed_count++;
                    summary.status_amounts.confirmed += amount;
                } else if (status === 'COMPLETED') {
                    summary.completed_count++;
                    summary.status_amounts.completed += amount;
                } else if (status === 'CANCELLED') {
                    summary.cancelled_count++;
                    summary.status_amounts.cancelled += amount;
                }
                
                // Count by payment status
                const paymentStatus = (booking.payment_status || 'PENDING').toUpperCase();
                if (paymentStatus === 'PENDING') {
                    summary.payment_pending++;
                } else if (paymentStatus === 'PARTIAL') {
                    summary.payment_partial++;
                } else if (paymentStatus === 'FULL') {
                    summary.payment_full++;
                }
                
                // Venue breakdown
                const venue = booking.venue?.name_primary || booking.venue?.name_secondary || 'Unknown';
                if (!summary.venue_breakdown[venue]) {
                    summary.venue_breakdown[venue] = {
                        count: 0,
                        amount: 0
                    };
                }
                summary.venue_breakdown[venue].count++;
                summary.venue_breakdown[venue].amount += amount;
            });
            
            summary.average_amount = bookings.length > 0 ? summary.total_amount / bookings.length : 0;
            
            return summary;
        },
        
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                if (typeof TempleAPI !== 'undefined') {
                    TempleAPI.get('/settings?type=SYSTEM')
                        .done(function(response) {
                            if (response.success && response.data && response.data.values) {
                                self.templeSettings = response.data.values;
                                
                                localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify({
                                    name: self.templeSettings.temple_name || '',
                                    address: self.templeSettings.temple_address || '',
                                    city: self.templeSettings.temple_city || '',
                                    state: self.templeSettings.temple_state || '',
                                    pincode: self.templeSettings.temple_pincode || '',
                                    country: self.templeSettings.temple_country || 'Malaysia',
                                    phone: self.templeSettings.temple_phone || '',
                                    email: self.templeSettings.temple_email || ''
                                }));
                                
                                resolve();
                            } else {
                                self.fallbackToLocalStorage();
                                resolve();
                            }
                        })
                        .fail(function() {
                            self.fallbackToLocalStorage();
                            resolve();
                        });
                } else {
                    self.fallbackToLocalStorage();
                    resolve();
                }
            });
        },
        
        fallbackToLocalStorage: function() {
            const stored = JSON.parse(localStorage.getItem(APP_CONFIG?.STORAGE?.TEMPLE) || '{}');
            this.templeSettings = {
                temple_name: stored.name || 'Persatuan Hainan Selangor & Wilayah Persekutuan',
                temple_address: stored.address || '65, Persiaran Endah, Off Jalan Syed Putra',
                temple_city: stored.city || '50460 Kuala Lumpur',
                temple_state: stored.state || '',
                temple_pincode: stored.pincode || '',
                temple_country: stored.country || 'Malaysia',
                temple_phone: stored.phone || '03-2273 7088',
                temple_email: stored.email || 'hainan@hainannet.com.my'
            };
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            const self = this;
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print report', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            setTimeout(() => {
                self.cleanup();
                TempleRouter.navigate('rom-booking');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            
            const logoHTML = this.getTempleLogoHTML();
            const filtersHTML = this.generateFiltersHTML();
            const bookingsTableHTML = this.generateBookingsTableHTML();
            const venueBreakdownHTML = this.generateVenueBreakdownHTML();
            const statusBreakdownHTML = this.generateStatusBreakdownHTML();
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>ROM Booking Report - ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}</title>
                    <meta charset="utf-8">
                    <style>
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
                            margin-right: 20px;
                        }
                        .temple-info {
                            font-size: 13px;
                            line-height: 1.5;
                        }
                        .temple-name {
                            font-size: 21px;
                            font-weight: bold;
                            color: #800000;
                            margin-bottom: 5px;
                        }
                        .report-title {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 20px 0;
                            color: #333;
                        }
                        .report-period {
                            text-align: center;
                            font-size: 16px;
                            color: #666;
                            margin-bottom: 30px;
                        }
                        .filters-section {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 5px;
                            margin-bottom: 30px;
                            font-size: 14px;
                        }
                        .summary-section {
                            margin-bottom: 30px;
                        }
                        .summary-cards {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                            margin-bottom: 20px;
                        }
                        .summary-card {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 5px;
                            text-align: center;
                            border: 1px solid #dee2e6;
                        }
                        .summary-card .value {
                            font-size: 20px;
                            font-weight: bold;
                            color: #800000;
                            margin-bottom: 5px;
                        }
                        .summary-card .label {
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                        }
                        .bookings-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        .bookings-table th,
                        .bookings-table td {
                            border: 1px solid #dee2e6;
                            padding: 8px;
                            text-align: left;
                            font-size: 11px;
                        }
                        .bookings-table th {
                            background: #f8f9fa;
                            font-weight: bold;
                            text-align: center;
                        }
                        .bookings-table .amount {
                            text-align: right;
                            font-family: monospace;
                        }
                        .bookings-table .total-row {
                            font-weight: bold;
                            background: #f8f9fa;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-size: 9px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .status-pending {
                            background: #ffc107;
                            color: #000;
                        }
                        .status-confirmed {
                            background: #28a745;
                            color: white;
                        }
                        .status-completed {
                            background: #007bff;
                            color: white;
                        }
                        .status-cancelled {
                            background: #dc3545;
                            color: white;
                        }
                        .payment-pending {
                            background: #ffc107;
                            color: #000;
                        }
                        .payment-partial {
                            background: #17a2b8;
                            color: white;
                        }
                        .payment-full {
                            background: #28a745;
                            color: white;
                        }
                        .section-title {
                            font-size: 16px;
                            font-weight: bold;
                            color: #333;
                            border-bottom: 1px solid #dee2e6;
                            padding-bottom: 5px;
                            margin-bottom: 15px;
                        }
                        .footer-section {
                            margin-top: 40px;
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                            border-top: 1px solid #eee;
                            padding-top: 20px;
                        }
                        .breakdown-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }
                        .breakdown-table th,
                        .breakdown-table td {
                            border: 1px solid #dee2e6;
                            padding: 8px;
                            font-size: 11px;
                        }
                        .breakdown-table th {
                            background: #f8f9fa;
                            font-weight: bold;
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
                    <table width="900" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="700"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
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
                        <div class="report-title">ROM Booking Report</div>
                        <div class="report-period">
                            Period: ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}
                        </div>
                        
                        <!-- Filters -->
                        ${filtersHTML}
                        
                        <!-- Summary Section -->
                        <div class="summary-section">
                            <div class="section-title">Overall Summary</div>
                            <div class="summary-cards">
                                <div class="summary-card">
                                    <div class="value">${report.summary.total_bookings}</div>
                                    <div class="label">Total Bookings</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">${report.summary.total_couples}</div>
                                    <div class="label">Total Couples</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.total_amount)}</div>
                                    <div class="label">Total Amount</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.average_amount)}</div>
                                    <div class="label">Average Amount</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">${report.summary.confirmed_count}</div>
                                    <div class="label">Confirmed</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">${report.summary.completed_count}</div>
                                    <div class="label">Completed</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Status Breakdown -->
                        ${statusBreakdownHTML}
                        
                        <!-- Venue Breakdown -->
                        ${venueBreakdownHTML}
                        
                        <!-- Bookings Details -->
                        <div class="bookings-section">
                            <div class="section-title">Booking Details</div>
                            ${bookingsTableHTML}
                        </div>
                        
                        <!-- Footer -->
                        <div class="footer-section">
                            <div><strong>Report Generated:</strong> ${this.formatDateTime(new Date(report.generated_at))}</div>
                            <div style="margin-top: 10px;">
                                This is a computer-generated report. No signature required.
                            </div>
                            <div style="margin-top: 5px;">
                                Total records: ${report.bookings.length} | Total couples: ${report.summary.total_couples} | Total amount: RM ${this.formatCurrency(report.summary.total_amount)}
                            </div>
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
        
        getTempleLogoHTML: function() {
            let logoHTML = '';
            if (this.templeSettings.temple_logo) {
                logoHTML = `<div class="temple-logo"><img src="${this.templeSettings.temple_logo}" style="width:205px;height:80px;object-fit:contain;" alt="Temple Logo" /></div>`;
            } else {
                logoHTML = `
                    <div class="temple-logo" style="
                        width: 100px; 
                        height: 100px; 
                        background: #800000; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: white; 
                        font-size: 12px;
                        text-align: center;
                    ">
                        TEMPLE<br>LOGO
                    </div>`;
            }
            return logoHTML;
        },
        
        generateFiltersHTML: function() {
            const filters = this.reportData.filters;
            const appliedFilters = [];
            
            if (filters.status) {
                appliedFilters.push(`Status: ${filters.status}`);
            }
            if (filters.payment_status) {
                appliedFilters.push(`Payment Status: ${filters.payment_status}`);
            }
            
            if (appliedFilters.length > 0) {
                return `
                    <div class="filters-section">
                        <strong>Applied Filters:</strong> ${appliedFilters.join(' | ')}
                    </div>
                `;
            }
            
            return '';
        },
        
        generateStatusBreakdownHTML: function() {
            const summary = this.reportData.summary;
            
            return `
                <div style="margin-bottom: 30px;">
                    <div class="section-title">Status Breakdown</div>
                    <table class="breakdown-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="status-badge status-pending">PENDING</span></td>
                                <td>${summary.pending_count}</td>
                                <td class="amount">RM ${this.formatCurrency(summary.status_amounts.pending)}</td>
                                <td class="amount">${this.calculatePercentage(summary.pending_count, summary.total_bookings)}%</td>
                            </tr>
                            <tr>
                                <td><span class="status-badge status-confirmed">CONFIRMED</span></td>
                                <td>${summary.confirmed_count}</td>
                                <td class="amount">RM ${this.formatCurrency(summary.status_amounts.confirmed)}</td>
                                <td class="amount">${this.calculatePercentage(summary.confirmed_count, summary.total_bookings)}%</td>
                            </tr>
                            <tr>
                                <td><span class="status-badge status-completed">COMPLETED</span></td>
                                <td>${summary.completed_count}</td>
                                <td class="amount">RM ${this.formatCurrency(summary.status_amounts.completed)}</td>
                                <td class="amount">${this.calculatePercentage(summary.completed_count, summary.total_bookings)}%</td>
                            </tr>
                            <tr>
                                <td><span class="status-badge status-cancelled">CANCELLED</span></td>
                                <td>${summary.cancelled_count}</td>
                                <td class="amount">RM ${this.formatCurrency(summary.status_amounts.cancelled)}</td>
                                <td class="amount">${this.calculatePercentage(summary.cancelled_count, summary.total_bookings)}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        },
        
        generateVenueBreakdownHTML: function() {
            const venueBreakdown = this.reportData.summary.venue_breakdown;
            const venues = Object.keys(venueBreakdown);
            
            if (venues.length === 0) {
                return '';
            }
            
            let html = `
                <div style="margin-bottom: 30px;">
                    <div class="section-title">Venue Breakdown</div>
                    <table class="breakdown-table">
                        <thead>
                            <tr>
                                <th>Venue</th>
                                <th>Bookings</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            const totalBookings = this.reportData.summary.total_bookings;
            
            venues.forEach(venue => {
                const data = venueBreakdown[venue];
                const percentage = this.calculatePercentage(data.count, totalBookings);
                
                html += `
                    <tr>
                        <td>${venue}</td>
                        <td>${data.count}</td>
                        <td class="amount">RM ${this.formatCurrency(data.amount)}</td>
                        <td class="amount">${percentage}%</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            return html;
        },
        
        generateBookingsTableHTML: function() {
            const bookings = this.reportData.bookings;
            
            if (!bookings || bookings.length === 0) {
                return '<p class="text-center">No bookings found for the selected criteria.</p>';
            }
            
            let tableHTML = `
                <table class="bookings-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Booking No.</th>
                            <th>Date</th>
                            <th>Register</th>
                            <th>Couples</th>
                            <th>Venue</th>
                            <th>Session</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            bookings.forEach((booking, index) => {
                const statusClass = `status-${booking.booking_status.toLowerCase()}`;
                const paymentClass = `payment-${booking.payment_status.toLowerCase()}`;
                
                // Format couples list
                let couplesInfo = `${booking.couples_count} couple(s)`;
                if (booking.couples && booking.couples.length > 0) {
                    const coupleNames = booking.couples.map((couple, idx) => {
                        const brideName = couple.bride?.name || 'N/A';
                        const groomName = couple.groom?.name || 'N/A';
                        return `<div style="font-size: 9px; margin-top: 2px;">?? ${brideName}<br>?? ${groomName}</div>`;
                    }).join('');
                    couplesInfo = `${booking.couples_count}<br>${coupleNames}`;
                }
                
                tableHTML += `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td>${booking.id}</td>
                        <td>${this.formatDate(booking.date)}</td>
                        <td>
                            <strong>${booking.register_name}</strong><br>
                            <small>${booking.register_phone}</small>
                        </td>
                        <td>${couplesInfo}</td>
                        <td>${booking.venue}</td>
                        <td>
                            ${booking.session}<br>
                            <small>${booking.session_time}</small>
                        </td>
                        <td class="amount">RM ${this.formatCurrency(booking.amount)}</td>
                        <td style="text-align: center;">
                            <span class="status-badge ${statusClass}">${booking.booking_status}</span><br>
                            <small><span class="status-badge ${paymentClass}">${booking.payment_status}</span></small>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    <tr class="total-row">
                        <td colspan="7" style="text-align: right; font-weight: bold;">TOTAL:</td>
                        <td class="amount">RM ${this.formatCurrency(this.reportData.summary.total_amount)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return tableHTML;
        },
        
        calculatePercentage: function(value, total) {
            if (total === 0) return '0.0';
            return ((value / total) * 100).toFixed(1);
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        formatDateTime: function(date) {
            return date.toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: '2-digit',
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            });
        }
    };
    
})(jQuery, window);