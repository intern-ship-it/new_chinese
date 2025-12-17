// js/pages/buddha-lamp/report.js
// Buddha Lamp Booking Report Print Page - Dynamic Version

(function($, window) {
    'use strict';
    
    window.BuddhaLampReportPage = {
        filters: null,
        reportData: null,
        templeSettings: null,
        
        init: function(params) {
            this.filters = params || {};
            this.loadAndPrint();
        },
        
        cleanup: function() {
            this.filters = null;
            this.reportData = null;
            this.templeSettings = null;
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load both report data and temple settings
            Promise.all([
                this.loadReportData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                console.error('Report error:', error);
                TempleCore.showToast(error.message || 'Error loading report data', 'error');
                TempleRouter.navigate('buddha-lamp');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadReportData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Build query parameters from filters
                const params = {
                    per_page: 1000, // Get all records for report
                    sort_by: 'booking_date',
                    sort_order: 'asc'
                };
                
                // Apply date filters
                if (self.filters.dateFrom) {
                    params.from_date = self.filters.dateFrom;
                }
                if (self.filters.dateTo) {
                    params.to_date = self.filters.dateTo;
                }
                
                // Apply status filters
                if (self.filters.bookingStatus) {
                    params.booking_status = self.filters.bookingStatus;
                }
                if (self.filters.paymentStatus) {
                    params.payment_status = self.filters.paymentStatus;
                }
                
                // Apply search filter
                if (self.filters.search) {
                    params.search = self.filters.search;
                }
                
                // Fetch data from API
                TempleAPI.get('/bookings/buddha-lamp', params)
                    .done(function(response) {
                        if (response.success) {
                            const bookings = response.data || [];
                            self.reportData = self.processReportData(bookings);
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Failed to load report data'));
                        }
                    })
                    .fail(function(xhr) {
                        let errorMessage = 'Error loading report data';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                        reject(new Error(errorMessage));
                    });
            });
        },
        
        // Process and normalize booking data for report
        processReportData: function(bookings) {
            const self = this;
            
            // Normalize booking data
            const normalizedBookings = bookings.map(booking => ({
                id: booking.id,
                booking_number: booking.booking_number,
                name_chinese: booking.name_secondary || '',
                name_english: booking.name_primary || '',
                nric: booking.nric || '',
                email: booking.email || '',
                contact_no: booking.phone_no || '',
                amount: parseFloat(booking.total_amount) || 0,
                paid_amount: parseFloat(booking.paid_amount) || 0,
                payment_method: booking.payment?.payment_method || booking.payment_method || '-',
                payment_reference: booking.payment?.payment_reference || '',
                booking_date: booking.booking_date,
                booking_status: booking.booking_status,
                payment_status: booking.payment_status,
                notes: booking.special_instructions || booking.additional_notes || '',
                created_at: booking.created_at,
                created_by: booking.created_by?.name || ''
            }));
            
            // Calculate date range
            let dateFrom, dateTo;
            if (this.filters.dateFrom) {
                dateFrom = this.filters.dateFrom;
            } else if (normalizedBookings.length > 0) {
                dateFrom = normalizedBookings[0].booking_date;
            } else {
                dateFrom = new Date().toISOString().split('T')[0];
            }
            
            if (this.filters.dateTo) {
                dateTo = this.filters.dateTo;
            } else if (normalizedBookings.length > 0) {
                dateTo = normalizedBookings[normalizedBookings.length - 1].booking_date;
            } else {
                dateTo = new Date().toISOString().split('T')[0];
            }
            
            // Calculate summary statistics
            const totalBookings = normalizedBookings.length;
            const totalAmount = normalizedBookings.reduce((sum, item) => sum + item.amount, 0);
            const totalPaid = normalizedBookings.reduce((sum, item) => sum + item.paid_amount, 0);
            
            // Calculate payment method breakdown
            const paymentBreakdown = this.calculatePaymentBreakdown(normalizedBookings);
            
            // Calculate booking status breakdown
            const statusBreakdown = this.calculateStatusBreakdown(normalizedBookings);
            
            // Calculate payment status breakdown
            const paymentStatusBreakdown = this.calculatePaymentStatusBreakdown(normalizedBookings);
            
            return {
                bookings: normalizedBookings,
                summary: {
                    total_bookings: totalBookings,
                    total_amount: totalAmount,
                    total_paid: totalPaid,
                    outstanding: totalAmount - totalPaid,
                    average_amount: totalBookings > 0 ? totalAmount / totalBookings : 0,
                    payment_breakdown: paymentBreakdown,
                    status_breakdown: statusBreakdown,
                    payment_status_breakdown: paymentStatusBreakdown,
                    date_range: {
                        from: this.formatDate(dateFrom),
                        to: this.formatDate(dateTo)
                    },
                    filters_applied: this.getAppliedFiltersText()
                }
            };
        },
        
        // Calculate payment method breakdown
        calculatePaymentBreakdown: function(bookings) {
            const breakdown = {};
            bookings.forEach(item => {
                const method = item.payment_method || 'Unknown';
                if (!breakdown[method]) {
                    breakdown[method] = {
                        count: 0,
                        amount: 0
                    };
                }
                breakdown[method].count++;
                breakdown[method].amount += item.amount;
            });
            return breakdown;
        },
        
        // Calculate booking status breakdown
        calculateStatusBreakdown: function(bookings) {
            const breakdown = {
                CONFIRMED: 0,
                PENDING: 0,
                COMPLETED: 0,
                CANCELLED: 0
            };
            bookings.forEach(item => {
                if (breakdown.hasOwnProperty(item.booking_status)) {
                    breakdown[item.booking_status]++;
                }
            });
            return breakdown;
        },
        
        // Calculate payment status breakdown
        calculatePaymentStatusBreakdown: function(bookings) {
            const breakdown = {
                FULL: 0,
                PARTIAL: 0,
                PENDING: 0
            };
            bookings.forEach(item => {
                if (breakdown.hasOwnProperty(item.payment_status)) {
                    breakdown[item.payment_status]++;
                }
            });
            return breakdown;
        },
        
        // Get applied filters as text
        getAppliedFiltersText: function() {
            const filters = [];
            if (this.filters.dateFrom) filters.push(`From: ${this.formatDate(this.filters.dateFrom)}`);
            if (this.filters.dateTo) filters.push(`To: ${this.formatDate(this.filters.dateTo)}`);
            if (this.filters.bookingStatus) filters.push(`Status: ${this.filters.bookingStatus}`);
            if (this.filters.paymentStatus) filters.push(`Payment: ${this.filters.paymentStatus}`);
            if (this.filters.search) filters.push(`Search: "${this.filters.search}"`);
            return filters.length > 0 ? filters.join(' | ') : 'None';
        },
        
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Try to fetch fresh settings from server first
                if (typeof TempleAPI !== 'undefined') {
                    TempleAPI.get('/settings?type=SYSTEM')
                        .done(function(response) {
                            if (response.success && response.data && response.data.values) {
                                self.templeSettings = response.data.values;
                                
                                // Update localStorage for future use
                                if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE) {
                                    localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify({
                                        name: self.templeSettings.temple_name || '',
                                        address: self.templeSettings.temple_address || '',
                                        city: self.templeSettings.temple_city || '',
                                        state: self.templeSettings.temple_state || '',
                                        pincode: self.templeSettings.temple_pincode || '',
                                        country: self.templeSettings.temple_country || 'Malaysia',
                                        phone: self.templeSettings.temple_phone || '',
                                        email: self.templeSettings.temple_email || '',
                                        temple_logo: self.templeSettings.temple_logo || ''
                                    }));
                                }
                                
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
            // Fallback to localStorage or default values
            let stored = {};
            try {
                const storageKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE) 
                    ? APP_CONFIG.STORAGE.TEMPLE 
                    : 'temple_settings';
                stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
            } catch (e) {
                console.warn('Failed to parse stored temple settings:', e);
            }
            
            this.templeSettings = {
                temple_name: stored.name || 'Buddha Light Temple',
                temple_address: stored.address || 'Temple Address',
                temple_city: stored.city || 'Kuala Lumpur',
                temple_state: stored.state || '',
                temple_pincode: stored.pincode || '',
                temple_country: stored.country || 'Malaysia',
                temple_phone: stored.phone || '03-1234 5678',
                temple_email: stored.email || 'temple@email.com',
                temple_logo: stored.temple_logo || ''
            };
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print report', 'warning');
                return;
            }
            
            const html = this.generateReportHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to buddha-lamp list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('buddha-lamp');
            }, 100);
        },
        
        generateReportHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Generate report number
            const reportNumber = this.generateReportNumber();
            
            // Check if there are no records
            const noRecordsMessage = report.summary.total_bookings === 0 
                ? `<div class="no-records">
                    <p style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
                        <strong>No bookings found</strong><br>
                        No Buddha Lamp bookings match the selected criteria.
                    </p>
                   </div>`
                : '';
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Buddha Lamp Bookings Report - ${reportNumber}</title>
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
                            font-size: 12px;
                        }
                        .btn {
                            padding: 8px 16px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            margin: 0 5px;
                            font-size: 14px;
                        }
                        .btn-primary { background: #007bff; color: white; }
                        .btn-info { background: #17a2b8; color: white; }
                        .btn:hover { opacity: 0.9; }
                        .report-container {
                            max-width: 1000px;
                            margin: 0 auto;
                            background: white;
                            position: relative;
                        }
                        .header-section {
                            border-bottom: 2px solid #c2c2c2;
                            padding-bottom: 20px;
                            margin-bottom: 20px;
                            display: flex;
                            align-items: center;
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
                            color: var(--primary-color);
                            margin-bottom: 5px;
                        }
                        .report-title {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 20px 0;
                            color: var(--primary-color);
                        }
                        .report-subtitle {
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                            margin-top: -15px;
                            margin-bottom: 20px;
                        }
                        .report-info {
                            background: #f8f9fa;
                            padding: 15px;
                            border-left: 4px solid var(--primary-color);
                            margin: 20px 0;
                        }
                        .summary-section {
                            margin: 20px 0;
                            background: #fff;
                            border: 1px solid #ddd;
                            padding: 15px;
                        }
                        .summary-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                            gap: 15px;
                            margin-bottom: 15px;
                        }
                        .summary-card {
                            background: #f8f9fa;
                            padding: 15px;
                            text-align: center;
                            border-radius: 5px;
                            border: 1px solid #e9ecef;
                        }
                        .summary-card .value {
                            font-size: 20px;
                            font-weight: bold;
                            color: var(--primary-color);
                        }
                        .summary-card .label {
                            font-size: 11px;
                            color: #666;
                            margin-top: 5px;
                        }
                        .summary-card.highlight {
                            background: linear-gradient(135deg, var(--primary-color), #b30000);
                            color: white;
                        }
                        .summary-card.highlight .value,
                        .summary-card.highlight .label {
                            color: white;
                        }
                        .data-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                            font-size: 11px;
                        }
                        .data-table th {
                            background: var(--primary-color);
                            color: white;
                            padding: 8px 5px;
                            text-align: left;
                            font-weight: bold;
                        }
                        .data-table td {
                            padding: 6px 5px;
                            border-bottom: 1px solid #ddd;
                            vertical-align: top;
                        }
                        .data-table tbody tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        .data-table tbody tr:hover {
                            background-color: #f5f5f5;
                        }
                        .data-table tfoot {
                            font-weight: bold;
                            background: #f0f0f0;
                        }
                        .data-table tfoot td {
                            padding: 10px 5px;
                            border-top: 2px solid var(--primary-color);
                        }
                        .payment-breakdown {
                            margin: 20px 0;
                        }
                        .payment-breakdown table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .payment-breakdown th,
                        .payment-breakdown td {
                            padding: 8px;
                            text-align: left;
                            border-bottom: 1px solid #ddd;
                        }
                        .payment-breakdown th {
                            background: #f8f9fa;
                            font-weight: bold;
                        }
                        .status-breakdown {
                            display: flex;
                            gap: 20px;
                            margin: 15px 0;
                        }
                        .status-breakdown-section {
                            flex: 1;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 10px;
                            font-weight: bold;
                        }
                        .status-confirmed { background: #d4edda; color: #155724; }
                        .status-pending { background: #fff3cd; color: #856404; }
                        .status-completed { background: #cce5ff; color: #004085; }
                        .status-cancelled { background: #f8d7da; color: #721c24; }
                        .status-paid { background: #d4edda; color: #155724; }
                        .status-partial { background: #fff3cd; color: #856404; }
                        .status-unpaid { background: #e2e3e5; color: #383d41; }
                        .report-number {
                            position: absolute;
                            top: 0;
                            right: 0;
                            font-size: 14px;
                            font-weight: bold;
                            color: var(--primary-color);
                        }
                        .section-title {
                            color: var(--primary-color);
                            border-bottom: 2px solid var(--primary-color);
                            padding-bottom: 5px;
                            margin: 25px 0 15px 0;
                        }
                        .page-break {
                            page-break-before: always;
                        }
                        .no-records {
                            background: #fff3cd;
                            border: 1px solid #ffc107;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; font-size: 10px; }
                            .data-table { font-size: 9px; }
                            .summary-card .value { font-size: 16px; }
                            .report-container { max-width: 100%; }
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
                        <!-- Report Number -->
                        <div class="report-number">Report #${reportNumber}</div>
                        
                        <!-- Header Section -->
                        <div class="header-section">
                            ${logoHTML}
                            <div class="temple-info">
                                <div class="temple-name">${temple.temple_name || 'Buddha Light Temple'}</div>
                                <div>${temple.temple_address || 'Temple Address'}</div>
                                <div>${[temple.temple_city, temple.temple_state, temple.temple_pincode].filter(Boolean).join(' ')}</div>
                                <div>${temple.temple_country || 'Malaysia'}</div>
                                ${temple.temple_phone ? `<div>Tel: ${temple.temple_phone}</div>` : ''}
                                ${temple.temple_email ? `<div>Email: ${temple.temple_email}</div>` : ''}
                            </div>
                        </div>
                        
                        <!-- Report Title -->
                        <div class="report-title">Buddha Lamp Bookings Report</div>
                        <div class="report-subtitle">佛前灯预订报告</div>
                        
                        <!-- Report Information -->
                        <div class="report-info">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                                <div><strong>Report Period:</strong> ${report.summary.date_range.from} to ${report.summary.date_range.to}</div>
                                <div><strong>Generated Date:</strong> ${this.formatDate(new Date().toISOString().split('T')[0])}</div>
                                <div><strong>Generated Time:</strong> ${new Date().toLocaleTimeString()}</div>
                                <div><strong>Total Records:</strong> ${report.summary.total_bookings}</div>
                            </div>
                            ${report.summary.filters_applied !== 'None' ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                                <strong>Filters Applied:</strong> ${report.summary.filters_applied}
                            </div>
                            ` : ''}
                        </div>
                        
                        ${noRecordsMessage}
                        
                        ${report.summary.total_bookings > 0 ? `
                        <!-- Summary Section -->
                        <div class="summary-section">
                            <h3 class="section-title" style="margin-top: 0;">Summary Statistics 统计摘要</h3>
                            <div class="summary-grid">
                                <div class="summary-card highlight">
                                    <div class="value">${report.summary.total_bookings}</div>
                                    <div class="label">Total Bookings<br>总预订数</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.total_amount)}</div>
                                    <div class="label">Total Amount<br>总金额</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.total_paid)}</div>
                                    <div class="label">Total Paid<br>已付款</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.outstanding)}</div>
                                    <div class="label">Outstanding<br>待付款</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.average_amount)}</div>
                                    <div class="label">Average Amount<br>平均金额</div>
                                </div>
                            </div>
                            
                            <!-- Status Breakdowns -->
                            <div class="status-breakdown">
                                <div class="status-breakdown-section">
                                    <h4 style="margin: 10px 0; color: var(--primary-color);">Booking Status 预订状态</h4>
                                    ${this.generateStatusBreakdownHTML(report.summary.status_breakdown)}
                                </div>
                                <div class="status-breakdown-section">
                                    <h4 style="margin: 10px 0; color: var(--primary-color);">Payment Status 付款状态</h4>
                                    ${this.generatePaymentStatusBreakdownHTML(report.summary.payment_status_breakdown)}
                                </div>
                            </div>
                            
                            <!-- Payment Method Breakdown -->
                            <div class="payment-breakdown">
                                <h4 style="margin: 15px 0 10px 0; color: var(--primary-color);">Payment Method Breakdown 付款方式明细</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Payment Method 付款方式</th>
                                            <th style="text-align: center;">Count 数量</th>
                                            <th style="text-align: right;">Amount (RM) 金额</th>
                                            <th style="text-align: center;">Percentage 百分比</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.generatePaymentBreakdownRows(report.summary.payment_breakdown, report.summary.total_amount)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Detailed Records -->
                        <div style="margin: 30px 0;">
                            <h3 class="section-title">Detailed Booking Records 详细预订记录</h3>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Booking No.<br>预订号</th>
                                        <th>Date<br>日期</th>
                                        <th>Name (Chinese)<br>姓名(中文)</th>
                                        <th>Name (English)<br>姓名(英文)</th>
                                        <th>Contact<br>联系方式</th>
                                        <th>Payment<br>付款方式</th>
                                        <th style="text-align: right;">Amount (RM)<br>金额</th>
                                        <th>Status<br>状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.generateDataRows(report.bookings)}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="6" style="text-align: right;"><strong>Grand Total 总计:</strong></td>
                                        <td style="text-align: right;"><strong>RM ${this.formatCurrency(report.summary.total_amount)}</strong></td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- Footer -->
                        <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
                            <div>Generated by Temple Management System | Report #${reportNumber}</div>
                            <div style="margin-top: 5px;">This is a system-generated report. 此为系统生成报告</div>
                            <div style="margin-top: 10px;">May the Buddha's Light illuminate all beings 愿佛光普照众生</div>
                        </div>
                    </div>
                    
                    <script>
                        // Auto focus print dialog for reports with data
                        window.onload = function() {
                            ${report.summary.total_bookings > 0 ? `
                            setTimeout(() => {
                                window.print();
                            }, 500);
                            ` : ''}
                        };
                    </script>
                </body>
                </html>
            `;
        },
        
        generateStatusBreakdownHTML: function(breakdown) {
            const statusLabels = {
                CONFIRMED: { label: 'Confirmed 已确认', class: 'status-confirmed' },
                PENDING: { label: 'Pending 待处理', class: 'status-pending' },
                COMPLETED: { label: 'Completed 已完成', class: 'status-completed' },
                CANCELLED: { label: 'Cancelled 已取消', class: 'status-cancelled' }
            };
            
            let html = '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
            Object.keys(breakdown).forEach(status => {
                const info = statusLabels[status] || { label: status, class: '' };
                html += `<span class="status-badge ${info.class}">${info.label}: ${breakdown[status]}</span>`;
            });
            html += '</div>';
            return html;
        },
        
        generatePaymentStatusBreakdownHTML: function(breakdown) {
            const statusLabels = {
                FULL: { label: 'Paid 已付款', class: 'status-paid' },
                PARTIAL: { label: 'Partial 部分付款', class: 'status-partial' },
                PENDING: { label: 'Unpaid 未付款', class: 'status-unpaid' }
            };
            
            let html = '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
            Object.keys(breakdown).forEach(status => {
                const info = statusLabels[status] || { label: status, class: '' };
                html += `<span class="status-badge ${info.class}">${info.label}: ${breakdown[status]}</span>`;
            });
            html += '</div>';
            return html;
        },
        
        generatePaymentBreakdownRows: function(breakdown, totalAmount) {
            let rows = '';
            
            // Sort by amount descending
            const sortedMethods = Object.keys(breakdown).sort((a, b) => 
                breakdown[b].amount - breakdown[a].amount
            );
            
            sortedMethods.forEach(method => {
                const data = breakdown[method];
                const percentage = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0.0';
                
                rows += `
                    <tr>
                        <td>${method}</td>
                        <td style="text-align: center;">${data.count}</td>
                        <td style="text-align: right;">${this.formatCurrency(data.amount)}</td>
                        <td style="text-align: center;">${percentage}%</td>
                    </tr>
                `;
            });
            
            // Add total row
            rows += `
                <tr style="font-weight: bold; background: #f0f0f0;">
                    <td>Total 总计</td>
                    <td style="text-align: center;">${Object.values(breakdown).reduce((sum, d) => sum + d.count, 0)}</td>
                    <td style="text-align: right;">${this.formatCurrency(totalAmount)}</td>
                    <td style="text-align: center;">100.0%</td>
                </tr>
            `;
            
            return rows;
        },
        
        generateDataRows: function(bookings) {
            let rows = '';
            
            bookings.forEach((booking, index) => {
                const statusBadge = this.getBookingStatusBadge(booking.booking_status);
                const paymentBadge = this.getPaymentStatusBadge(booking.payment_status);
                
                rows += `
                    <tr>
                        <td><strong>${booking.booking_number}</strong></td>
                        <td>${this.formatDate(booking.booking_date)}</td>
                        <td>${booking.name_chinese || '-'}</td>
                        <td>${booking.name_english || '-'}</td>
                        <td style="font-size: 10px;">${booking.contact_no || '-'}</td>
                        <td style="font-size: 10px;">${booking.payment_method || '-'}</td>
                        <td style="text-align: right; font-weight: bold;">${this.formatCurrency(booking.amount)}</td>
                        <td style="font-size: 10px;">${statusBadge}<br>${paymentBadge}</td>
                    </tr>
                `;
            });
            
            return rows;
        },
        
        getBookingStatusBadge: function(status) {
            const statusMap = {
                'CONFIRMED': '<span class="status-badge status-confirmed">Confirmed</span>',
                'PENDING': '<span class="status-badge status-pending">Pending</span>',
                'COMPLETED': '<span class="status-badge status-completed">Completed</span>',
                'CANCELLED': '<span class="status-badge status-cancelled">Cancelled</span>'
            };
            return statusMap[status] || `<span class="status-badge">${status}</span>`;
        },
        
        getPaymentStatusBadge: function(status) {
            const statusMap = {
                'FULL': '<span class="status-badge status-paid">Paid</span>',
                'PARTIAL': '<span class="status-badge status-partial">Partial</span>',
                'PENDING': '<span class="status-badge status-unpaid">Unpaid</span>'
            };
            return statusMap[status] || '';
        },
        
        getTempleLogoHTML: function() {
            let logoHTML = '';
            
            if (this.templeSettings.temple_logo) {
                logoHTML = `<div class="temple-logo">
                    <img src="${this.templeSettings.temple_logo}" 
                         style="width:205px;height: 80px;object-fit:contain;" 
                         alt="Temple Logo" />
                </div>`;
            } else {
                // Fallback to placeholder
                logoHTML = `
                    <div class="temple-logo" style="
                        width: 80px; 
                        height: 80px; 
                        background: linear-gradient(135deg, var(--primary-color), #f7931e); 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: white; 
                        font-size: 12px;
                        text-align: center;
                        font-weight: bold;
                    ">
                        TEMPLE<br>LOGO
                    </div>`;
            }
             
            return logoHTML;
        },
        
        generateReportNumber: function() {
            // Generate report number with current date + time
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
            const timeStr = now.getHours().toString().padStart(2, '0') + 
                          now.getMinutes().toString().padStart(2, '0');
            return `BLR${dateStr}${timeStr}`;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
    };
    
})(jQuery, window);