// js/pages/hall-booking/report/print.js
// Hall Booking Report Print Page

(function($, window) {
    'use strict';
    
    window.HallBookingReportPage = {
        reportData: null,
        templeSettings: null,
        filters: {},
        
        init: function(params) {
            this.filters = params || {};
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
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('hall-booking/listing');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadReportData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // For now, use sample data. Replace with actual API call
                // TempleAPI.get('/hall-booking/report', { params: this.filters })
                
                setTimeout(() => {
                    self.reportData = {
                        title: 'Hall Booking Report',
                        period: this.getReportPeriod(),
                        generated_date: new Date().toISOString(),
                        summary: {
                            total_bookings: 25,
                            confirmed_bookings: 20,
                            pending_bookings: 3,
                            cancelled_bookings: 2,
                            total_revenue: 650000.00,
                            confirmed_revenue: 550000.00,
                            pending_revenue: 75000.00
                        },
                        bookings: [
                            {
                                booking_code: 'HB20241001',
                                booking_date: '2024-11-01',
                                customer_name: 'Mr. John Doe',
                                event_title: 'Wedding Reception',
                                event_date: '2024-12-25',
                                session: 'Second Session',
                                total_amount: 33000.00,
                                paid_amount: 10000.00,
                                status: 'confirmed'
                            },
                            {
                                booking_code: 'HB20241002',
                                customer_name: 'Mrs. Jane Smith',
                                event_title: 'Birthday Party',
                                event_date: '2024-12-30',
                                session: 'First Session',
                                total_amount: 15000.00,
                                paid_amount: 15000.00,
                                status: 'confirmed'
                            },
                            {
                                booking_code: 'HB20241003',
                                customer_name: 'Mr. Ahmad Rahman',
                                event_title: 'Corporate Event',
                                event_date: '2025-01-05',
                                session: 'Full Day',
                                total_amount: 45000.00,
                                paid_amount: 0.00,
                                status: 'pending'
                            }
                        ]
                    };
                    resolve();
                }, 500);
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
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print report', 'warning');
                return;
            }
            
            const html = this.generateReportHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            setTimeout(() => {
                TempleRouter.navigate('hall-booking/listing');
            }, 100);
        },
        
        generateReportHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            
            // Generate summary HTML
            const summaryHTML = `
                <table width="750" border="1" align="center" cellpadding="5" style="margin-top: 20px; border-color: #333;">
                    <tr style="background-color:#f5f5f5; font-weight:bold; font-size:14px;">
                        <td colspan="2" align="center" style="padding:8px;">BOOKING SUMMARY</td>
                    </tr>
                    <tr style="font-size:13px;">
                        <td style="padding:5px;">Total Bookings</td>
                        <td style="padding:5px; text-align:right;"><strong>${report.summary.total_bookings}</strong></td>
                    </tr>
                    <tr style="font-size:13px;">
                        <td style="padding:5px;">Confirmed Bookings</td>
                        <td style="padding:5px; text-align:right; color:green;"><strong>${report.summary.confirmed_bookings}</strong></td>
                    </tr>
                    <tr style="font-size:13px;">
                        <td style="padding:5px;">Pending Bookings</td>
                        <td style="padding:5px; text-align:right; color:orange;"><strong>${report.summary.pending_bookings}</strong></td>
                    </tr>
                    <tr style="font-size:13px;">
                        <td style="padding:5px;">Cancelled Bookings</td>
                        <td style="padding:5px; text-align:right; color:red;"><strong>${report.summary.cancelled_bookings}</strong></td>
                    </tr>
                    <tr style="background-color:var(--primary-color); color:white; font-size:14px;">
                        <td style="padding:8px;"><strong>Total Revenue</strong></td>
                        <td style="padding:8px; text-align:right;"><strong>RM ${this.formatMoney(report.summary.total_revenue)}</strong></td>
                    </tr>
                </table>
            `;
            
            // Generate bookings list HTML
            let bookingsHTML = '';
            let rowNo = 1;
            
            report.bookings.forEach(booking => {
                const statusColor = this.getStatusColor(booking.status);
                bookingsHTML += `
                    <tr style="font-size:12px;">
                        <td align="center" style="padding:3px;">${rowNo++}</td>
                        <td style="padding:3px;">${booking.booking_code}</td>
                        <td style="padding:3px;">${booking.customer_name}</td>
                        <td style="padding:3px;">${booking.event_title}</td>
                        <td style="padding:3px;">${this.formatDate(booking.event_date)}</td>
                        <td style="padding:3px;">${booking.session}</td>
                        <td align="right" style="padding:3px;">RM ${this.formatMoney(booking.total_amount)}</td>
                        <td align="center" style="padding:3px; color:${statusColor}; font-weight:bold;">${booking.status.toUpperCase()}</td>
                    </tr>
                `;
            });
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:120px;height:100px;object-fit:contain;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Hall Booking Report - ${temple.temple_name}</title>
                    <style>
                        :root {
    			--primary-color: #800000;
			}
			@media print {
                            #backButton, #printButton { display: none !important; }
                            body { margin: 0; padding: 10px; }
                        }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
                        table { border-collapse: collapse; }
                        .btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
                        .btn-primary { background: #007bff; }
                        .btn-info { background: #17a2b8; }
                        @media screen { body { max-width: 1000px; margin: 0 auto; } }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="900" border="0" align="center" style="margin-bottom: 20px;">
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
                    
                    <!-- Header -->
                    <table width="900" border="0" align="center">
                        <tr>
                            <td width="120">${logoHTML}</td>
                            <td width="680" align="left" style="font-size:13px; padding-left: 20px;">
                                <strong style="font-size: 24px; color:var(--primary-color);">${temple.temple_name}</strong>
                                <br>${temple.temple_address}
                                <br>${temple.temple_city ? temple.temple_city + ', ' : ''}${temple.temple_state} ${temple.temple_pincode}
                                <br>${temple.temple_country}
                                ${temple.temple_phone ? '<br>Tel: ' + temple.temple_phone : ''}
                                ${temple.temple_email ? '<br>E-mail: ' + temple.temple_email : ''}
                            </td>
                            <td width="100"></td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="900" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; color: var(--primary-color);">
                                HALL BOOKING REPORT
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:14px; text-align:center; color: #666; padding-top:5px;">
                                ${report.period}
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Summary -->
                    ${summaryHTML}
                    
                    <!-- Bookings List -->
                    <table width="900" border="1" align="center" cellpadding="3" style="margin-top: 30px; border-color: #333;">
                        <tr style="background-color:#f5f5f5; font-weight:bold; font-size:13px;">
                            <td width="40" align="center" style="padding:8px;">No</td>
                            <td width="100" align="center" style="padding:8px;">Booking No</td>
                            <td width="140" align="center" style="padding:8px;">Customer</td>
                            <td width="140" align="center" style="padding:8px;">Event</td>
                            <td width="80" align="center" style="padding:8px;">Event Date</td>
                            <td width="100" align="center" style="padding:8px;">Session</td>
                            <td width="100" align="center" style="padding:8px;">Amount</td>
                            <td width="80" align="center" style="padding:8px;">Status</td>
                        </tr>
                        ${bookingsHTML}
                    </table>
                    
                    <!-- Footer -->
                    <table width="900" border="0" align="center" style="margin-top: 30px;">
                        <tr>
                            <td style="font-size:11px; color:#666;">
                                <strong>Report Notes:</strong><br>
                                • This report includes all hall bookings for the specified period.<br>
                                • Revenue figures are based on confirmed bookings only.<br>
                                • Pending bookings may be subject to changes.<br>
                                • For detailed booking information, please refer to individual receipts.
                            </td>
                        </tr>
                    </table>
                    
                    <div style="text-align:center; margin-top:20px; font-size:11px; color:#888;">
                        Generated on ${this.formatDateTime(report.generated_date)} | Temple Management System
                    </div>
                </body>
                </html>
            `;
        },
        
        getReportPeriod: function() {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            return `${this.formatDate(firstDay.toISOString())} to ${this.formatDate(lastDay.toISOString())}`;
        },
        
        getStatusColor: function(status) {
            const colors = {
                'confirmed': 'green',
                'pending': 'orange',
                'cancelled': 'red'
            };
            return colors[status] || 'black';
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        },
        
        formatDateTime: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        },
        
        formatMoney: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }
    };
    
})(jQuery, window);