// js/pages/special-occasions/report/print.js
// Special Occasions Report Print Page - DYNAMIC VERSION

(function($, window) {
    'use strict';
    
    window.SpecialOccasionsReportPage = {
        reportData: null,
        templeSettings: null,
        dateRange: {
            from: null,
            to: null
        },
        occasionFilter: null,
        
        init: function(params) {
            console.log('Initializing Special Occasions Report with params:', params);
            
            this.dateRange.from = params?.from || params?.from_date || null;
            this.dateRange.to = params?.to || params?.to_date || null;
            this.occasionFilter = params?.occasion_id || null;
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            Promise.all([
                this.loadReportData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                TempleCore.showLoading(false);
                self.openPrintWindow();
            })
            .catch(function(error) {
                console.error('Error loading report:', error);
                TempleCore.showLoading(false);
                TempleCore.showToast(error.message || 'Error loading report data', 'error');
                TempleRouter.navigate('special-occasions');
            });
        },
        
        loadReportData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Build API parameters
                const params = {};
                if (self.dateRange.from) params.from_date = self.dateRange.from;
                if (self.dateRange.to) params.to_date = self.dateRange.to;
                if (self.occasionFilter) params.occasion_id = self.occasionFilter;
                
                console.log('Loading report with params:', params);
                
                // Call actual API endpoint
                TempleAPI.get('/special-occasions/bookings', params)
                    .done(function(response) {
                        console.log('API Response:', response);
                        
                        if (response.success) {
                            // Process the raw booking data into report format
                            self.reportData = self.processBookingData(response.data);
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Failed to load report'));
                        }
                    })
                    .fail(function(xhr) {
                        console.error('API Error:', xhr);
                        const errorMsg = xhr.responseJSON?.message || 'Error loading report data';
                        reject(new Error(errorMsg));
                    });
            });
        },
        
        processBookingData: function(bookings) {
            console.log('Processing booking data:', bookings);
            
            // If bookings is paginated, extract the data array
            const bookingsList = Array.isArray(bookings) ? bookings : (bookings.data || []);
            
            // Initialize statistics
            const occasions = {};
            let totalAmount = 0;
            let totalConfirmed = 0;
            let totalPending = 0;
            let totalCancelled = 0;
            let totalCompleted = 0;
            
            // Process each booking
            const processedBookings = bookingsList.map(booking => {
                // Normalize booking data
                const bookingCode = booking.booking_number || booking.booking_code || `SO${booking.id}`;
                const bookingDate = booking.booking_date || booking.event_date || booking.created_at;
                const occasionName = booking.occasion_name || 'Unknown Occasion';
                const occasionId = booking.occasion_id || booking.special_occasion_id || 'unknown';
                const optionName = booking.occasion_option || booking.option_name || 'N/A';
                const amount = parseFloat(booking.occasion_amount || booking.total_amount || 0);
                const status = (booking.booking_status || booking.status || 'pending').toLowerCase();
                const nameChinese = booking.name_chinese || booking.devotee_name_chinese || '-';
                const nameEnglish = booking.name_english || booking.devotee_name || booking.name || '-';
                
                // Update occasion statistics
                if (!occasions[occasionId]) {
                    occasions[occasionId] = {
                        name: occasionName,
                        count: 0,
                        amount: 0
                    };
                }
                occasions[occasionId].count++;
                occasions[occasionId].amount += amount;
                
                // Update totals
                totalAmount += amount;
                
                // Update status counts
                switch(status) {
                    case 'confirmed':
                    case 'booked':
                        totalConfirmed++;
                        break;
                    case 'pending':
                    case 'waiting':
                        totalPending++;
                        break;
                    case 'cancelled':
                    case 'failed':
                        totalCancelled++;
                        break;
                    case 'completed':
                        totalCompleted++;
                        break;
                }
                
                return {
                    id: booking.id,
                    booking_code: bookingCode,
                    booking_date: bookingDate,
                    occasion_id: occasionId,
                    occasion_name: occasionName,
                    occasion_option: optionName,
                    occasion_amount: amount,
                    name_chinese: nameChinese,
                    name_english: nameEnglish,
                    status: status
                };
            });
            
            // Sort bookings by date
            processedBookings.sort((a, b) => {
                const dateA = new Date(a.booking_date);
                const dateB = new Date(b.booking_date);
                return dateA - dateB;
            });
            
            // Determine period
            const today = new Date();
            const fromDate = this.dateRange.from ? new Date(this.dateRange.from) : 
                            (processedBookings.length > 0 ? new Date(processedBookings[0].booking_date) : 
                             new Date(today.getFullYear(), today.getMonth(), 1));
            const toDate = this.dateRange.to ? new Date(this.dateRange.to) : today;
            
            return {
                period: {
                    from: fromDate.toISOString().split('T')[0],
                    to: toDate.toISOString().split('T')[0]
                },
                summary: {
                    total_bookings: processedBookings.length,
                    total_amount: totalAmount,
                    confirmed: totalConfirmed,
                    pending: totalPending,
                    cancelled: totalCancelled,
                    completed: totalCompleted
                },
                occasions: occasions,
                bookings: processedBookings
            };
        },
        
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve) => {
                if (typeof TempleAPI !== 'undefined') {
                    TempleAPI.get('/settings?type=SYSTEM')
                        .done(function(response) {
                            if (response.success && response.data && response.data.values) {
                                self.templeSettings = response.data.values;
                                
                                // Update localStorage
                                localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify({
                                    name: self.templeSettings.temple_name || '',
                                    address: self.templeSettings.temple_address || '',
                                    city: self.templeSettings.temple_city || '',
                                    state: self.templeSettings.temple_state || '',
                                    pincode: self.templeSettings.temple_pincode || '',
                                    country: self.templeSettings.temple_country || 'Malaysia',
                                    phone: self.templeSettings.temple_phone || '',
                                    email: self.templeSettings.temple_email || '',
                                    logo: self.templeSettings.temple_logo || ''
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
                temple_name: stored.name || 'Temple Name',
                temple_address: stored.address || 'Temple Address',
                temple_city: stored.city || '',
                temple_state: stored.state || '',
                temple_pincode: stored.pincode || '',
                temple_country: stored.country || 'Malaysia',
                temple_phone: stored.phone || '',
                temple_email: stored.email || '',
                temple_logo: stored.logo || ''
            };
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print report', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to special-occasions list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('special-occasions');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            const logoHTML = this.getTempleLogoHTML();
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Special Occasions Report - ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}</title>
                    <meta charset="utf-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            background: white;
                            line-height: 1.6;
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
                            max-width: 1000px;
                            margin: 0 auto;
                            background: white;
                        }
                        .header-section {
                            border-bottom: 3px solid #333;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                            display: flex;
                            align-items: flex-start;
                        }
                        .temple-logo {
                            margin-right: 20px;
                        }
                        .temple-info {
                            font-size: 13px;
                            line-height: 1.6;
                        }
                        .temple-name {
                            font-size: 22px;
                            font-weight: bold;
                            color: #ff00ff;
                            margin-bottom: 8px;
                        }
                        .report-title {
                            text-align: center;
                            font-size: 26px;
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
                        .summary-section {
                            background: #f8f9fa;
                            border: 2px solid #dee2e6;
                            padding: 20px;
                            margin-bottom: 30px;
                            border-radius: 8px;
                        }
                        .summary-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 15px;
                            color: #333;
                            border-bottom: 2px solid #007bff;
                            padding-bottom: 5px;
                        }
                        .summary-grid {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        .summary-card {
                            background: white;
                            padding: 15px;
                            border-radius: 6px;
                            border-left: 4px solid #007bff;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .summary-card.success { border-left-color: #28a745; }
                        .summary-card.warning { border-left-color: #ffc107; }
                        .summary-card.danger { border-left-color: #dc3545; }
                        .summary-card.info { border-left-color: #17a2b8; }
                        .summary-label {
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                            margin-bottom: 5px;
                        }
                        .summary-value {
                            font-size: 24px;
                            font-weight: bold;
                            color: #333;
                        }
                        .occasions-breakdown {
                            margin-bottom: 30px;
                        }
                        .breakdown-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }
                        .breakdown-table th {
                            background: #343a40;
                            color: white;
                            padding: 12px;
                            text-align: left;
                            font-weight: 600;
                        }
                        .breakdown-table td {
                            padding: 10px 12px;
                            border-bottom: 1px solid #dee2e6;
                        }
                        .breakdown-table tr:hover {
                            background: #f8f9fa;
                        }
                        .bookings-section {
                            margin-top: 30px;
                        }
                        .bookings-table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 12px;
                        }
                        .bookings-table th {
                            background: #495057;
                            color: white;
                            padding: 10px 8px;
                            text-align: left;
                            font-weight: 600;
                        }
                        .bookings-table td {
                            padding: 8px;
                            border-bottom: 1px solid #dee2e6;
                        }
                        .bookings-table tr:nth-child(even) {
                            background: #f8f9fa;
                        }
                        .status-badge {
                            padding: 3px 8px;
                            border-radius: 3px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                        }
                        .status-pending { background: #fff3cd; color: #856404; }
                        .status-waiting { background: #fff3cd; color: #856404; }
                        .status-confirmed { background: #d4edda; color: #155724; }
                        .status-booked { background: #d4edda; color: #155724; }
                        .status-cancelled { background: #f8d7da; color: #721c24; }
                        .status-failed { background: #f8d7da; color: #721c24; }
                        .status-completed { background: #d1ecf1; color: #0c5460; }
                        .footer-section {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 2px solid #dee2e6;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                        .no-data {
                            text-align: center;
                            color: #999;
                            padding: 40px 20px;
                            font-size: 16px;
                        }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; }
                            .summary-grid { page-break-inside: avoid; }
                            .occasions-breakdown { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="1000" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="800"></td>
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
                        </div>
                        
                        <!-- Report Title -->
                        <div class="report-title">Special Occasions Bookings Report</div>
                        <div class="report-period">
                            Period: ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}
                        </div>
                        
                        ${report.summary.total_bookings > 0 ? `
                        <!-- Summary Section -->
                        <div class="summary-section">
                            <div class="summary-title">Summary Statistics</div>
                            <div class="summary-grid">
                                <div class="summary-card">
                                    <div class="summary-label">Total Bookings</div>
                                    <div class="summary-value">${report.summary.total_bookings}</div>
                                </div>
                                <div class="summary-card success">
                                    <div class="summary-label">Total Amount</div>
                                    <div class="summary-value">RM ${this.formatCurrency(report.summary.total_amount)}</div>
                                </div>
                                <div class="summary-card success">
                                    <div class="summary-label">Confirmed</div>
                                    <div class="summary-value">${report.summary.confirmed}</div>
                                </div>
                                <div class="summary-card warning">
                                    <div class="summary-label">Pending</div>
                                    <div class="summary-value">${report.summary.pending}</div>
                                </div>
                                <div class="summary-card danger">
                                    <div class="summary-label">Cancelled</div>
                                    <div class="summary-value">${report.summary.cancelled}</div>
                                </div>
                                <div class="summary-card info">
                                    <div class="summary-label">Completed</div>
                                    <div class="summary-value">${report.summary.completed}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Occasions Breakdown -->
                        <div class="occasions-breakdown">
                            <div class="summary-title">Breakdown by Occasion Type</div>
                            <table class="breakdown-table">
                                <thead>
                                    <tr>
                                        <th width="10%">#</th>
                                        <th width="50%">Occasion Name</th>
                                        <th width="20%" style="text-align: center;">Total Bookings</th>
                                        <th width="20%" style="text-align: right;">Total Amount (RM)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.generateOccasionsBreakdown(report.occasions)}
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Detailed Bookings List -->
                        <div class="bookings-section">
                            <div class="summary-title">Detailed Bookings List</div>
                            <table class="bookings-table">
                                <thead>
                                    <tr>
                                        <th width="8%">Code</th>
                                        <th width="10%">Date</th>
                                        <th width="15%">Name (Chinese)</th>
                                        <th width="15%">Name (English)</th>
                                        <th width="22%">Occasion</th>
                                        <th width="12%">Option</th>
                                        <th width="10%" style="text-align: right;">Amount</th>
                                        <th width="8%" style="text-align: center;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.generateBookingsRows(report.bookings)}
                                </tbody>
                            </table>
                        </div>
                        ` : `
                        <!-- No Data Message -->
                        <div class="no-data">
                            <i class="bi bi-inbox" style="font-size: 48px; display: block; margin-bottom: 10px; color: #ccc;"></i>
                            <strong>No Bookings Found</strong><br>
                            <span style="font-size: 14px;">There are no bookings for the selected period.</span>
                        </div>
                        `}
                        
                        <!-- Footer -->
                        <div class="footer-section">
                            <p>Generated on: ${new Date().toLocaleString('en-GB', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</p>
                            <p>${temple.temple_name || 'Temple Name'} - Special Occasions Management System</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        },
        
        getTempleLogoHTML: function() {
            if (this.templeSettings.temple_logo) {
                return `
                    <div class="temple-logo">
                        <img src="${this.templeSettings.temple_logo}" 
                             style="width: 120px; height: 100px; object-fit: contain; padding-top: 14px;" 
                             alt="Temple Logo" />
                    </div>
                `;
            } else {
                return `
                    <div class="temple-logo" style="
                        width: 120px; 
                        height: 100px; 
                        border: 1px solid #ddd;
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        background: #f5f5f5;
                    ">
                        <span style="font-size:12px;color:#666;">TEMPLE<br>LOGO</span>
                    </div>
                `;
            }
        },
        
        generateOccasionsBreakdown: function(occasions) {
            let html = '';
            let index = 1;
            
            // Sort occasions by count (descending)
            const sortedOccasions = Object.entries(occasions).sort((a, b) => b[1].count - a[1].count);
            
            sortedOccasions.forEach(([id, data]) => {
                if (data.count > 0) {
                    html += `
                        <tr>
                            <td style="text-align: center;">${index}</td>
                            <td><strong>${data.name}</strong></td>
                            <td style="text-align: center;">${data.count}</td>
                            <td style="text-align: right;"><strong>${this.formatCurrency(data.amount)}</strong></td>
                        </tr>
                    `;
                    index++;
                }
            });
            
            if (!html) {
                html = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #999; padding: 20px;">
                            No bookings found for this period
                        </td>
                    </tr>
                `;
            }
            
            return html;
        },
        
        generateBookingsRows: function(bookings) {
            let html = '';
            
            bookings.forEach(booking => {
                const statusClass = `status-${booking.status}`;
                const statusText = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
                
                html += `
                    <tr>
                        <td>${booking.booking_code}</td>
                        <td>${this.formatDate(booking.booking_date)}</td>
                        <td>${booking.name_chinese}</td>
                        <td>${booking.name_english}</td>
                        <td>${booking.occasion_name}</td>
                        <td>${booking.occasion_option}</td>
                        <td style="text-align: right;">${this.formatCurrency(booking.occasion_amount)}</td>
                        <td style="text-align: center;">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </td>
                    </tr>
                `;
            });
            
            if (!html) {
                html = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: #999; padding: 20px;">
                            No bookings found
                        </td>
                    </tr>
                `;
            }
            
            return html;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
    };
    
})(jQuery, window);