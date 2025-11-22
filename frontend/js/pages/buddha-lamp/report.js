// js/pages/buddha-lamp/report/print.js
// Buddha Lamp Booking Report Print Page

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
                // Simulate loading report data (replace with actual API call)
                setTimeout(() => {
                    // Generate sample report data based on filters
                    self.reportData = self.generateReportData();
                    resolve();
                }, 500);
                
                // Actual API implementation:
                /*
                const params = new URLSearchParams();
                if (self.filters.dateFrom) params.append('date_from', self.filters.dateFrom);
                if (self.filters.dateTo) params.append('date_to', self.filters.dateTo);
                if (self.filters.paymentMethod) params.append('payment_method', self.filters.paymentMethod);
                
                TempleAPI.get(`/buddha-lamp/report?${params.toString()}`)
                    .done(function(response) {
                        if (response.success) {
                            self.reportData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load report'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading report'));
                    });
                */
            });
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
            const stored = JSON.parse(localStorage.getItem(APP_CONFIG?.STORAGE?.TEMPLE) || '{}');
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
        
        generateReportData: function() {
            // Generate sample data for report
            const data = [];
            const paymentMethods = ['cash', 'cheque', 'ebanking', 'card', 'duitnow'];
            const chineseNames = ['', '', '', '', '', '', '', '', '', ''];
            const englishNames = ['Li Ming Hua', 'Wang Fang', 'Zhang Wei', 'Liu Jing', 'Chen Jie', 'Huang Li', 'Zhao Min', 'Sun Tao', 'Zhou Hui', 'Wu Qiang'];
            
            // Apply date filters
            const startDate = this.filters.dateFrom ? new Date(this.filters.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = this.filters.dateTo ? new Date(this.filters.dateTo) : new Date();
            
            // Generate records for each day in range
            let currentDate = new Date(startDate);
            let recordId = 1;
            
            while (currentDate <= endDate) {
                // Generate 1-3 records per day
                const recordsPerDay = Math.floor(Math.random() * 3) + 1;
                
                for (let i = 0; i < recordsPerDay; i++) {
                    const randomIndex = Math.floor(Math.random() * chineseNames.length);
                    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                    
                    // Apply payment method filter
                    if (this.filters.paymentMethod && paymentMethod !== this.filters.paymentMethod) {
                        continue;
                    }
                    
                    data.push({
                        id: 'BL' + String(recordId).padStart(5, '0'),
                        name_chinese: chineseNames[randomIndex],
                        name_english: englishNames[randomIndex],
                        nric: '******-**-' + String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
                        email: englishNames[randomIndex].toLowerCase().replace(' ', '.') + '@email.com',
                        contact_no: '+60 1' + Math.floor(Math.random() * 90000000 + 10000000),
                        amount: Math.random() > 0.6 ? 5000.00 : parseFloat((Math.random() * 1000 + 100).toFixed(2)),
                        payment_method: paymentMethod,
                        booking_date: currentDate.toISOString().split('T')[0],
                        notes: 'Buddha Lamp Offering for Family Blessing'
                    });
                    
                    recordId++;
                }
                
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return {
                bookings: data,
                summary: {
                    total_bookings: data.length,
                    total_amount: data.reduce((sum, item) => sum + parseFloat(item.amount), 0),
                    payment_breakdown: this.calculatePaymentBreakdown(data),
                    date_range: {
                        from: this.formatDate(startDate.toISOString().split('T')[0]),
                        to: this.formatDate(endDate.toISOString().split('T')[0])
                    }
                }
            };
        },
        
        calculatePaymentBreakdown: function(data) {
            const breakdown = {};
            data.forEach(item => {
                if (!breakdown[item.payment_method]) {
                    breakdown[item.payment_method] = {
                        count: 0,
                        amount: 0
                    };
                }
                breakdown[item.payment_method].count++;
                breakdown[item.payment_method].amount += parseFloat(item.amount);
            });
            return breakdown;
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
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Buddha Lamp Bookings Report</title>
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
                        }
                        .btn-primary { background: #007bff; color: white; }
                        .btn-info { background: #17a2b8; color: white; }
                        .report-container {
                            max-width: 1000px;
                            margin: 0 auto;
                            background: white;
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
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
                            font-size: 12px;
                            color: #666;
                            margin-top: 5px;
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
                        .report-number {
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            font-size: 14px;
                            font-weight: bold;
                            color: var(--primary-color);
                        }
                        .page-break {
                            page-break-before: always;
                        }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; font-size: 11px; }
                            .data-table { font-size: 10px; }
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
                                <div>${temple.temple_city || ''} ${temple.temple_state || ''} ${temple.temple_pincode || ''}</div>
                                <div>${temple.temple_country || 'Malaysia'}</div>
                                ${temple.temple_phone ? `<div>Tel: ${temple.temple_phone}</div>` : ''}
                                ${temple.temple_email ? `<div>Email: ${temple.temple_email}</div>` : ''}
                            </div>
                        </div>
                        
                        <!-- Report Title -->
                        <div class="report-title">Buddha Lamp Bookings Report</div>
                        
                        <!-- Report Information -->
                        <div class="report-info">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div><strong>Report Period:</strong> ${report.summary.date_range.from} to ${report.summary.date_range.to}</div>
                                <div><strong>Generated Date:</strong> ${this.formatDate(new Date().toISOString().split('T')[0])}</div>
                                <div><strong>Generated Time:</strong> ${new Date().toLocaleTimeString()}</div>
                                <div><strong>Total Records:</strong> ${report.summary.total_bookings}</div>
                            </div>
                        </div>
                        
                        <!-- Summary Section -->
                        <div class="summary-section">
                            <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">Summary Statistics</h3>
                            <div class="summary-grid">
                                <div class="summary-card">
                                    <div class="value">${report.summary.total_bookings}</div>
                                    <div class="label">Total Bookings</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.total_amount)}</div>
                                    <div class="label">Total Amount</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.total_amount / report.summary.total_bookings)}</div>
                                    <div class="label">Average Amount</div>
                                </div>
                            </div>
                            
                            <!-- Payment Method Breakdown -->
                            <div class="payment-breakdown">
                                <h4 style="margin: 15px 0 10px 0; color: var(--primary-color);">Payment Method Breakdown</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Payment Method</th>
                                            <th>Count</th>
                                            <th>Amount (RM)</th>
                                            <th>Percentage</th>
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
                            <h3 style="color: var(--primary-color);">Detailed Booking Records</h3>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Booking ID</th>
                                        <th>Date</th>
                                        <th>Name (Chinese)</th>
                                        <th>Name (English)</th>
                                        <th>Contact</th>
                                        <th>Payment Method</th>
                                        <th>Amount (RM)</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.generateDataRows(report.bookings)}
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Footer -->
                        <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #666;">
                            <div>Generated by Temple Management System | Report #${reportNumber}</div>
                            <div style="margin-top: 5px;">This is a system-generated report.</div>
                            <div style="margin-top: 10px;">May the Buddha's Light illuminate all beings</div>
                        </div>
                    </div>
                </body>
                </html>
            `;
        },
        
        generatePaymentBreakdownRows: function(breakdown, totalAmount) {
            let rows = '';
            const methodNames = {
                'cash': 'Cash',
                'cheque': 'Cheque',
                'ebanking': 'e-Banking',
                'card': 'Credit/Debit Card',
                'duitnow': 'DuitNow'
            };
            
            Object.keys(breakdown).forEach(method => {
                const data = breakdown[method];
                const percentage = ((data.amount / totalAmount) * 100).toFixed(1);
                
                rows += `
                    <tr>
                        <td>${methodNames[method] || method}</td>
                        <td style="text-align: center;">${data.count}</td>
                        <td style="text-align: right;">${this.formatCurrency(data.amount)}</td>
                        <td style="text-align: center;">${percentage}%</td>
                    </tr>
                `;
            });
            
            return rows;
        },
        
        generateDataRows: function(bookings) {
            let rows = '';
            
            bookings.forEach((booking, index) => {
                rows += `
                    <tr>
                        <td><strong>${booking.id}</strong></td>
                        <td>${this.formatDate(booking.booking_date)}</td>
                        <td>${booking.name_chinese}</td>
                        <td>${booking.name_english}</td>
                        <td>${booking.contact_no}</td>
                        <td>${this.formatPaymentMethod(booking.payment_method)}</td>
                        <td style="text-align: right; font-weight: bold;">${this.formatCurrency(booking.amount)}</td>
                        <td style="font-size: 10px;">${booking.notes || '-'}</td>
                    </tr>
                `;
            });
            
            return rows;
        },
        
        formatPaymentMethod: function(method) {
            const methods = {
                'cash': 'Cash',
                'cheque': 'Cheque',
                'ebanking': 'e-Banking',
                'card': 'Card',
                'duitnow': 'DuitNow'
            };
            return methods[method] || method;
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
                        BUDDHA<br>LIGHT
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
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
    };
    
})(jQuery, window);