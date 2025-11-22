// js/pages/special-occasions/report.js
// Special Occasions Report Print Module

(function($, window) {
    'use strict';
    
    window.SpecialOccasionsReportPage = {
        reportData: null,
        templeSettings: {},
        filters: {
            dateFrom: null,
            dateTo: null,
            occasionType: '',
            status: ''
        },
        
        // Page initialization
        init: function(params) {
            console.log('Special Occasions Report Page initialized with params:', params);
            this.loadTempleSettings()
                .then(() => {
                    this.loadReportData();
                })
                .catch(() => {
                    this.showError('Failed to load temple settings');
                });
        },
        
        // Load temple settings
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve) => {
                // Try to get from API first
                if (window.TempleAPI && typeof TempleAPI.getTempleSettings === 'function') {
                    TempleAPI.getTempleSettings()
                        .done(function(response) {
                            self.templeSettings = response.data || response;
                            resolve();
                        })
                        .fail(function() {
                            // Fallback to localStorage
                            self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                            resolve();
                        });
                } else {
                    // Fallback to localStorage if API not available
                    self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                    resolve();
                }
            });
        },
        
        // Load report data
        loadReportData: function() {
            const self = this;
            
            // Show loading
            this.showLoading(true);
            
            // For now, use sample data - replace with actual API call later
            setTimeout(() => {
                self.reportData = self.getSampleReportData();
                self.showLoading(false);
                self.openPrintWindow();
            }, 500);
            
            // TODO: Replace with actual API call when backend is ready
            // TempleAPI.get('/special-occasions/report', { 
            //     params: this.filters 
            // })
            //     .then(response => {
            //         self.reportData = response.data;
            //         self.showLoading(false);
            //         self.openPrintWindow();
            //     })
            //     .catch(error => {
            //         console.error('Error loading report data:', error);
            //         self.showLoading(false);
            //         self.showError('Failed to load report data');
            //     });
        },
        
        // Get sample report data (remove when API is ready)
        getSampleReportData: function() {
            const bookings = [
                {
                    booking_code: 'SOB2025001',
                    booking_date: '2025-11-21',
                    devotee_name: 'Tan Ah Kow',
                    mobile: '+60123456789',
                    occasion_type: 'wesak-day',
                    occasion_name: 'Wesak Day Light Offering',
                    option_label: 'Hopeful Light ????',
                    amount: 300.00,
                    payment_method: 'cash',
                    status: 'confirmed'
                },
                {
                    booking_code: 'SOB2025002',
                    booking_date: '2025-11-20',
                    devotee_name: 'Lim Swee Choo',
                    mobile: '+60187654321',
                    occasion_type: 'guanyin-bodhisattva',
                    occasion_name: 'Guanyin Bodhisattva Light',
                    option_label: 'Bodhisattva Day ???????',
                    amount: 38.00,
                    payment_method: 'ebanking',
                    status: 'completed'
                },
                {
                    booking_code: 'SOB2025003',
                    booking_date: '2025-11-19',
                    devotee_name: 'Wong Mei Ling',
                    mobile: '+60195555555',
                    occasion_type: 'mazu-blessing',
                    occasion_name: 'Mazu Blessing Light',
                    option_label: 'RM 108',
                    amount: 108.00,
                    payment_method: 'card',
                    status: 'confirmed'
                },
                {
                    booking_code: 'SOB2025004',
                    booking_date: '2025-11-18',
                    devotee_name: 'Chen Wei Ming',
                    mobile: '+60176666666',
                    occasion_type: 'lunar-lantern',
                    occasion_name: 'Lunar Lantern Festival',
                    option_label: 'Family Devotion ???????',
                    amount: 108.00,
                    payment_method: 'duitnow',
                    status: 'pending'
                },
                {
                    booking_code: 'SOB2025005',
                    booking_date: '2025-11-17',
                    devotee_name: 'Kumar Selvam',
                    mobile: '+60198888888',
                    occasion_type: 'wesak-day',
                    occasion_name: 'Wesak Day Light Offering',
                    option_label: 'Merciful Light ????',
                    amount: 60.00,
                    payment_method: 'cash',
                    status: 'completed'
                },
                {
                    booking_code: 'SOB2025006',
                    booking_date: '2025-11-16',
                    devotee_name: 'Sarah Abdullah',
                    mobile: '+60123333333',
                    occasion_type: 'shui-wei',
                    occasion_name: 'Shui Wei Light Offering',
                    option_label: 'RM 38',
                    amount: 38.00,
                    payment_method: 'cash',
                    status: 'confirmed'
                },
                {
                    booking_code: 'SOB2025007',
                    booking_date: '2025-11-15',
                    devotee_name: 'Rachel Ng',
                    mobile: '+60147777777',
                    occasion_type: 'chai-sen-ceremony',
                    occasion_name: 'Welcoming Chai Sen Ceremony',
                    option_label: 'Welcoming Chai Sen Ceremony ?????',
                    amount: 88.00,
                    payment_method: 'ebanking',
                    status: 'completed'
                }
            ];

            // Calculate summary statistics
            const totalBookings = bookings.length;
            const totalAmount = bookings.reduce((sum, booking) => sum + booking.amount, 0);
            const statusSummary = bookings.reduce((summary, booking) => {
                summary[booking.status] = (summary[booking.status] || 0) + 1;
                return summary;
            }, {});
            const occasionSummary = bookings.reduce((summary, booking) => {
                summary[booking.occasion_type] = (summary[booking.occasion_type] || 0) + 1;
                return summary;
            }, {});

            return {
                bookings,
                summary: {
                    totalBookings,
                    totalAmount,
                    statusSummary,
                    occasionSummary,
                    reportDate: new Date(),
                    dateRange: {
                        from: '2025-11-15',
                        to: '2025-11-21'
                    }
                }
            };
        },
        
        // Open print window
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                this.showError('Pop-up blocked. Please allow pop-ups and try again.');
                return;
            }
            
            const html = this.generateReportHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to special occasions list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('special-occasions/listing');
            }, 100);
        },
        
        // Generate report HTML
        generateReportHTML: function() {
            const data = this.reportData;
            const temple = this.templeSettings;
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:120px;height:100px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            // Generate bookings table rows
            const bookingsHTML = data.bookings.map((booking, index) => `
                <tr style="font-size:12px;">
                    <td style="text-align:center;padding:5px;border:1px solid #ddd;">${index + 1}</td>
                    <td style="padding:5px;border:1px solid #ddd;">${booking.booking_code}</td>
                    <td style="text-align:center;padding:5px;border:1px solid #ddd;">${this.formatDate(booking.booking_date)}</td>
                    <td style="padding:5px;border:1px solid #ddd;">${booking.devotee_name}</td>
                    <td style="padding:5px;border:1px solid #ddd;">${booking.mobile}</td>
                    <td style="padding:5px;border:1px solid #ddd;">${booking.occasion_name}</td>
                    <td style="padding:5px;border:1px solid #ddd;">${booking.option_label}</td>
                    <td style="text-align:right;padding:5px;border:1px solid #ddd;">RM ${booking.amount.toFixed(2)}</td>
                    <td style="text-align:center;padding:5px;border:1px solid #ddd;">${this.formatPaymentMethod(booking.payment_method)}</td>
                    <td style="text-align:center;padding:5px;border:1px solid #ddd;">${this.formatStatus(booking.status)}</td>
                </tr>
            `).join('');
            
            // Generate summary statistics
            const statusSummaryHTML = Object.entries(data.summary.statusSummary)
                .map(([status, count]) => `<li>${this.formatStatus(status)}: ${count}</li>`)
                .join('');
            
            const occasionSummaryHTML = Object.entries(data.summary.occasionSummary)
                .map(([occasion, count]) => `<li>${this.formatOccasionType(occasion)}: ${count}</li>`)
                .join('');
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Special Occasions Report - ${this.formatDate(data.summary.reportDate)}</title>
                    <style>
                        @media print {
                            #controlButtons {
                                display: none !important;
                            }
                            body {
                                margin: 0;
                                padding: 10px;
                            }
                            .page-break {
                                page-break-before: always;
                            }
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                            font-size: 12px;
                        }
                        
                        .btn {
                            padding: 8px 16px;
                            margin: 0 5px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            text-decoration: none;
                            display: inline-block;
                            font-size: 14px;
                        }
                        
                        .btn-primary {
                            background-color: #007bff;
                            color: white;
                        }
                        
                        .btn-info {
                            background-color: #17a2b8;
                            color: white;
                        }
                        
                        .summary-section {
                            background-color: #f8f9fa;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 8px;
                            border: 1px solid #dee2e6;
                        }
                        
                        @media screen {
                            body {
                                max-width: 1200px;
                                margin: 0 auto;
                            }
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
                                <button class="btn btn-info" onclick="window.print()">Print Report</button>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Header -->
                    <table width="100%" border="0">
                        <tr>
                            <td width="120">
                                ${logoHTML}
                            </td>
                            <td align="left" style="font-size:13px; padding-left: 20px;">
                                <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                                <br>${temple.temple_address || temple.address || 'Temple Address'}
                                <br>${temple.temple_city || temple.city ? (temple.temple_city || temple.city) + ', ' : ''}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                                <br>${temple.temple_country || temple.country || 'Malaysia'}
                                ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                                ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                            </td>
                            <td width="200" style="text-align: right;">
                                <div style="font-size:14px;">
                                    <strong>Report Date:</strong><br>
                                    ${this.formatDate(data.summary.reportDate)}<br><br>
                                    <strong>Date Range:</strong><br>
                                    ${this.formatDate(data.summary.dateRange.from)} to<br>
                                    ${this.formatDate(data.summary.dateRange.to)}
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="100%" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                                Special Occasions Bookings Report<br>
                                <span style="font-size:18px; color:#666;">????????</span>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Summary Statistics -->
                    <div class="summary-section">
                        <table width="100%" border="0">
                            <tr>
                                <td width="25%">
                                    <h4 style="margin: 0 0 10px 0; color: #495057;">?? Overall Statistics</h4>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        <li><strong>Total Bookings:</strong> ${data.summary.totalBookings}</li>
                                        <li><strong>Total Amount:</strong> RM ${data.summary.totalAmount.toFixed(2)}</li>
                                        <li><strong>Average Amount:</strong> RM ${(data.summary.totalAmount / data.summary.totalBookings).toFixed(2)}</li>
                                    </ul>
                                </td>
                                <td width="25%">
                                    <h4 style="margin: 0 0 10px 0; color: #495057;">?? Status Summary</h4>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        ${statusSummaryHTML}
                                    </ul>
                                </td>
                                <td width="50%">
                                    <h4 style="margin: 0 0 10px 0; color: #495057;">?? Occasion Types</h4>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        ${occasionSummaryHTML}
                                    </ul>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Detailed Bookings Table -->
                    <table width="100%" border="1" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f8f9fa; font-weight: bold; font-size: 13px;">
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:4%;">No</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:10%;">Booking ID</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:8%;">Date</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:15%;">Devotee Name</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:12%;">Mobile</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:18%;">Occasion</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:15%;">Option</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:8%;">Amount</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:8%;">Payment</th>
                                <th style="padding:8px;border:1px solid #ddd;text-align:center;width:8%;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookingsHTML}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f8f9fa; font-weight: bold; font-size: 14px;">
                                <td colspan="7" style="text-align: right; padding: 8px; border: 1px solid #ddd;">
                                    <strong>TOTAL:</strong>
                                </td>
                                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">
                                    <strong>RM ${data.summary.totalAmount.toFixed(2)}</strong>
                                </td>
                                <td colspan="2" style="text-align: center; padding: 8px; border: 1px solid #ddd;">
                                    <strong>${data.summary.totalBookings} Bookings</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <!-- Footer -->
                    <table width="100%" border="0" style="margin-top: 40px;">
                        <tr>
                            <td style="text-align: center; font-size:12px; color:#666; border-top: 1px solid #ddd; padding-top: 20px;">
                                <div style="margin-bottom: 10px;">
                                    <strong>May all devotees receive blessings and spiritual fulfillment</strong><br>
                                    <span style="font-size:11px;">??????????????</span>
                                </div>
                                
                                <div style="color:#999; font-size:10px;">
                                    Report generated on: ${this.formatDateTime(new Date())}<br>
                                    This is a computer generated report for ${temple.temple_name || 'Temple'}<br>
                                    For any queries, please contact the temple administration.
                                </div>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            
            return html;
        },
        
        // Format date
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        },
        
        // Format datetime
        formatDateTime: function(date) {
            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        },
        
        // Format payment method
        formatPaymentMethod: function(method) {
            const methods = {
                'cash': 'Cash',
                'cheque': 'Cheque',
                'ebanking': 'E-banking',
                'card': 'Card',
                'duitnow': 'DuitNow'
            };
            return methods[method] || method;
        },
        
        // Format status
        formatStatus: function(status) {
            const statuses = {
                'confirmed': 'Confirmed',
                'pending': 'Pending',
                'completed': 'Completed',
                'cancelled': 'Cancelled'
            };
            return statuses[status] || status;
        },
        
        // Format occasion type
        formatOccasionType: function(type) {
            const types = {
                'wesak-day': 'Wesak Day Light Offering',
                'guanyin-bodhisattva': 'Guanyin Bodhisattva Light',
                'mazu-blessing': 'Mazu Blessing Light',
                'shui-wei': 'Shui Wei Light Offering',
                'lunar-lantern': 'Lunar Lantern Festival',
                'chai-sen-ceremony': 'Welcoming Chai Sen Ceremony'
            };
            return types[type] || type;
        },
        
        // Show loading state
        showLoading: function(show) {
            if (show) {
                // Show loading in current page
                $('#page-container').html(`
                    <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div>Generating report...</div>
                        </div>
                    </div>
                `);
            }
        },
        
        // Show error message
        showError: function(message) {
            $('#page-container').html(`
                <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                    <div class="alert alert-danger text-center">
                        <i class="bi bi-exclamation-circle fs-1 mb-3 d-block"></i>
                        <h5>Error</h5>
                        <p>${message}</p>
                        <button class="btn btn-primary" onclick="TempleRouter.navigate('special-occasions/listing')">
                            <i class="bi bi-arrow-left"></i> Back to List
                        </button>
                    </div>
                </div>
            `);
        }
    };

})(jQuery, window);