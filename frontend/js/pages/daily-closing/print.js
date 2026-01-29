// js/pages/daily-closing/print.js
// Daily Closing Print Page - UPDATED with Donations-style warm gradient
// Created: December 27, 2025

(function($, window) {
    'use strict';
    
    if (!window.dailyClosingSharedModule) {
        window.dailyClosingSharedModule = {
            moduleId: 'daily-closing',
            eventNamespace: 'daily-closing',
            cssId: 'daily-closing-css',
            cssPath: '/css/daily-closing.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                if (typeof gsap !== 'undefined') gsap.killTweensOf("*");
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }

    window.DailyClosingPrintPage = {
        reportData: null,
        templeSettings: null,
        reportFilters: null,
        pageId: 'daily-closing-print',
        eventNamespace: window.dailyClosingSharedModule.eventNamespace,
        
        init: function(params) {
            window.dailyClosingSharedModule.registerPage(this.pageId);
            this.reportFilters = params || {};
            
            console.log('Print filters received:', this.reportFilters);
            this.loadAndPrint();
        },
        
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            window.dailyClosingSharedModule.unregisterPage(this.pageId);
            
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
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
                console.error('Error loading report:', error);
                TempleCore.showToast(error.message || 'Error loading report data', 'error');
                self.cleanup();
                TempleRouter.navigate('daily-closing');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadReportData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                const extractResponse = function(response) {
                    if (Array.isArray(response)) {
                        return response[0];
                    }
                    return response;
                };

                $.when(
                    TempleAPI.get('/daily-closing/sales', self.reportFilters),
                    TempleAPI.get('/daily-closing/donation', self.reportFilters),
                    TempleAPI.get('/daily-closing/buddha-lamp', self.reportFilters),
                    TempleAPI.get('/daily-closing/temple-events', self.reportFilters)
                ).done(function(salesRes, donationRes, buddhaLampRes, templeEventsRes) {
                    
                    const salesData = extractResponse(salesRes);
                    const donationData = extractResponse(donationRes);
                    const buddhaLampData = extractResponse(buddhaLampRes);
                    const templeEventsData = extractResponse(templeEventsRes);
                    
                    self.reportData = {
                        period: {
                            from: self.reportFilters.from_date,
                            to: self.reportFilters.to_date
                        },
                        filters: self.reportFilters,
                        sales: {
                            transactions: (salesData && salesData.data && salesData.data.transactions) || [],
                            summary: (salesData && salesData.data && salesData.data.summary) || {}
                        },
                        donations: {
                            transactions: (donationData && donationData.data && donationData.data.transactions) || [],
                            summary: (donationData && donationData.data && donationData.data.summary) || {}
                        },
                        buddhaLamp: {
                            transactions: (buddhaLampData && buddhaLampData.data && buddhaLampData.data.transactions) || [],
                            summary: (buddhaLampData && buddhaLampData.data && buddhaLampData.data.summary) || {}
                        },
                        templeEvents: {
                            transactions: (templeEventsData && templeEventsData.data && templeEventsData.data.transactions) || [],
                            summary: (templeEventsData && templeEventsData.data && templeEventsData.data.summary) || {}
                        },
                        generated_at: new Date().toISOString()
                    };
                    
                    console.log('Report data loaded:', self.reportData);
                    resolve();
                }).fail(function(xhr) {
                    console.error('API Error:', xhr);
                    reject(new Error('Failed to load daily closing data'));
                });
            });
        },
        
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                if (typeof TempleAPI !== 'undefined') {
                    TempleAPI.get('/settings?type=SYSTEM')
                        .done(function(response) {
                            if (response.success && response.data && response.data.values) {
                                self.templeSettings = response.data.values;
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
                TempleRouter.navigate('daily-closing');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            
            const logoHTML = this.getTempleLogoHTML();
            
            // Calculate grand totals
            const salesTotal = parseFloat(report.sales.summary.total_sales) || 0;
            const donationTotal = parseFloat(report.donations.summary.total_paid) || 0;
            const buddhaLampTotal = parseFloat(report.buddhaLamp.summary.total_amount) || 0;
            const templeEventsTotal = parseFloat(report.templeEvents.summary.total_amount) || 0;
            const grandTotal = salesTotal + donationTotal + buddhaLampTotal + templeEventsTotal;
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Daily Closing Report - ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}</title>
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
                            font-weight: 600;
                        }
                        .btn-primary { background: #b8651b; color: white; }
                        .btn-info { background: #d4782a; color: white; }
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
                            color: #b8651b;
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
                        .summary-section {
                            margin-bottom: 30px;
                        }
                        .summary-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        .summary-table th,
                        .summary-table td {
                            border: 1px solid #dee2e6;
                            padding: 12px;
                            text-align: left;
                            font-size: 12px;
                        }
                        .summary-table th {
                            background: #f8f9fa;
                            font-weight: bold;
                        }
                        .summary-table .grand-total-row {
                            background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);
                            color: white;
                            font-weight: bold;
                            font-size: 14px;
                        }
                        .details-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        .details-table th,
                        .details-table td {
                            border: 1px solid #dee2e6;
                            padding: 8px;
                            text-align: left;
                            font-size: 11px;
                        }
                        .details-table th {
                            background: #f8f9fa;
                            font-weight: bold;
                            text-align: center;
                        }
                        .details-table .amount {
                            text-align: right;
                            font-family: monospace;
                        }
                        .details-table .total-row {
                            background: #e9ecef;
                            font-weight: bold;
                        }
                        .section-title {
                            font-size: 16px;
                            font-weight: bold;
                            color: #333;
                            border-bottom: 2px solid #dee2e6;
                            padding-bottom: 5px;
                            margin: 30px 0 15px 0;
                        }
                        .section-header {
                            padding: 10px 15px;
                            border-radius: 5px;
                            margin: 20px 0 10px 0;
                            font-weight: bold;
                            color: white;
                        }
                        .sales-header { background: linear-gradient(135deg, #4e73df 0%, #224abe 100%); }
                        .donation-header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
                        .buddha-header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); }
                        .temple-events-header { background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%); }
                        .footer-section {
                            margin-top: 40px;
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                            border-top: 1px solid #eee;
                            padding-top: 20px;
                        }
                        .badge {
                            display: inline-block;
                            padding: 3px 8px;
                            border-radius: 4px;
                            font-size: 10px;
                            font-weight: bold;
                        }
                        .badge-pledge { background: #ffc107; color: #000; }
                        .badge-anonymous { background: #6c757d; color: #fff; }
                        .clear { clear: both; }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; }
                            .summary-table .grand-total-row,
                            .section-header {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
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
                        <div class="report-title">Daily Closing Report</div>
                        <div class="report-period">
                            Period: ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}
                        </div>
                        
                        <!-- Summary Section -->
                        <div class="summary-section">
                            <div class="section-title">Summary</div>
                            <table class="summary-table">
                                <thead>
                                    <tr>
                                        <th>Module</th>
                                        <th>Transactions</th>
                                        <th style="text-align: right;">Amount (RM)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Sales 🛒</td>
                                        <td>${report.sales.transactions.length}</td>
                                        <td style="text-align: right;">${this.formatCurrency(salesTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td>Donation 🎁</td>
                                        <td>${report.donations.transactions.length}</td>
                                        <td style="text-align: right;">${this.formatCurrency(donationTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td>Buddha Lamp 💡</td>
                                        <td>${report.buddhaLamp.transactions.length}</td>
                                        <td style="text-align: right;">${this.formatCurrency(buddhaLampTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td>Temple Events 📅</td>
                                        <td>${report.templeEvents.transactions.length}</td>
                                        <td style="text-align: right;">${this.formatCurrency(templeEventsTotal)}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr class="grand-total-row">
                                        <td>GRAND TOTAL 💰</td>
                                        <td>${report.sales.transactions.length + report.donations.transactions.length + report.buddhaLamp.transactions.length + report.templeEvents.transactions.length}</td>
                                        <td style="text-align: right;">${this.formatCurrency(grandTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <!-- SALES DETAILS -->
                        ${this.generateSalesDetailsHTML(report.sales)}
                        
                        <!-- DONATION DETAILS -->
                        ${this.generateDonationDetailsHTML(report.donations)}
                        
                        <!-- BUDDHA LAMP DETAILS -->
                        ${this.generateBuddhaLampDetailsHTML(report.buddhaLamp)}
                        
                        <!-- TEMPLE EVENTS DETAILS -->
                        ${this.generateTempleEventsDetailsHTML(report.templeEvents)}
                        
                        <!-- Footer -->
                        <div class="footer-section">
                            <div><strong>Report Generated:</strong> ${this.formatDateTime(new Date(report.generated_at))}</div>
                            <div style="margin-top: 10px;">
                                This is a computer-generated report. No signature required.
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        window.onload = function() {
                            // Auto-print disabled for review
                            // setTimeout(() => { window.print(); }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
        },
        
        getTempleLogoHTML: function() {
            if (this.templeSettings.temple_logo) {
                return `<div class="temple-logo"><img src="${this.templeSettings.temple_logo}" style="width:100px;height:100px;object-fit:contain;" alt="Temple Logo" /></div>`;
            }
            return `
                <div class="temple-logo" style="
                    width: 100px; 
                    height: 100px; 
                    background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%); 
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
        },
        
        generateSalesDetailsHTML: function(salesData) {
            if (!salesData.transactions || salesData.transactions.length === 0) {
                return '';
            }
            
            let html = `
                <div class="section-header sales-header">
                    <i class="bi bi-cart4"></i> SALES DETAILS 🛒 (${salesData.transactions.length} transactions)
                </div>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Entry Code</th>
                            <th>Booking No</th>
                            <th>Payment</th>
                            <th>Items</th>
                            <th>Amount (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            let total = 0;
            salesData.transactions.forEach((tx, index) => {
                const amount = parseFloat(tx.total_amount) || 0;
                total += amount;
                const itemCount = (Array.isArray(tx.booking_items) ? tx.booking_items : []).reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${this.formatDate(tx.entry_date)}</td>
                        <td>${tx.entry_code || 'N/A'}</td>
                        <td>${tx.booking_number || 'N/A'}</td>
                        <td>${tx.payment_mode_name || 'N/A'}</td>
                        <td style="text-align: center;">${itemCount}</td>
                        <td class="amount">${this.formatCurrency(amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                    <tr class="total-row">
                        <td colspan="6" style="text-align: right;">Total:</td>
                        <td class="amount">${this.formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return html;
        },
        
        generateDonationDetailsHTML: function(donationData) {
            if (!donationData.transactions || donationData.transactions.length === 0) {
                return '';
            }
            
            let html = `
                <div class="section-header donation-header">
                    <i class="bi bi-gift"></i> DONATION DETAILS 🎁 (${donationData.transactions.length} donations)
                </div>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Booking No</th>
                            <th>Type</th>
                            <th>Donor</th>
                            <th>Payment</th>
                            <th>Pledge</th>
                            <th>Amount (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            let total = 0;
            donationData.transactions.forEach((donation, index) => {
                const meta = donation.meta || {};
                const amount = parseFloat(donation.paid_amount) || 0;
                total += amount;
                
                const isPledge = meta.is_pledge || false;
                const isAnonymous = meta.is_anonymous || false;
                const donorName = isAnonymous ? 'Anonymous' : (meta.name_secondary || meta.name_primary || '-');
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${this.formatDate(donation.booking_date)}</td>
                        <td>${donation.booking_number || 'N/A'}</td>
                        <td>${meta.donation_name || 'General'}</td>
                        <td>${donorName}</td>
                        <td>${donation.payment_mode_name || '-'}</td>
                        <td style="text-align: center;">${isPledge ? '<span class="badge badge-pledge">PLEDGE</span>' : '-'}</td>
                        <td class="amount">${this.formatCurrency(amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                    <tr class="total-row">
                        <td colspan="7" style="text-align: right;">Total:</td>
                        <td class="amount">${this.formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return html;
        },
        
        generateBuddhaLampDetailsHTML: function(buddhaLampData) {
            if (!buddhaLampData.transactions || buddhaLampData.transactions.length === 0) {
                return '';
            }
            
            let html = `
                <div class="section-header buddha-header">
                    <i class="bi bi-brightness-high"></i> BUDDHA LAMP DETAILS 💡 (${buddhaLampData.transactions.length} bookings)
                </div>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Booking No</th>
                            <th>Lamp Type</th>
                            <th>Name (Chinese)</th>
                            <th>Name (English)</th>
                            <th>Payment</th>
                            <th>Amount (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            let total = 0;
            buddhaLampData.transactions.forEach((booking, index) => {
                const meta = booking.meta || {};
                const amount = parseFloat(booking.total_amount) || 0;
                total += amount;
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${this.formatDate(booking.booking_date)}</td>
                        <td>${booking.booking_number || 'N/A'}</td>
                        <td>${meta.buddha_lamp_name || 'Custom'}</td>
                        <td>${meta.name_secondary || '-'}</td>
                        <td>${meta.name_primary || '-'}</td>
                        <td>${booking.payment_mode_name || '-'}</td>
                        <td class="amount">${this.formatCurrency(amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                    <tr class="total-row">
                        <td colspan="7" style="text-align: right;">Total:</td>
                        <td class="amount">${this.formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return html;
        },
        
        generateTempleEventsDetailsHTML: function(templeEventsData) {
            if (!templeEventsData.transactions || templeEventsData.transactions.length === 0) {
                return '';
            }
            
            let html = `
                <div class="section-header temple-events-header">
                    <i class="bi bi-calendar-event"></i> TEMPLE EVENTS DETAILS 📅 (${templeEventsData.transactions.length} bookings)
                </div>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Booking No</th>
                            <th>Occasion</th>
                            <th>Devotee</th>
                            <th>Payment</th>
                            <th>Discount (RM)</th>
                            <th>Amount (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            let total = 0;
            templeEventsData.transactions.forEach((booking, index) => {
                const occasion = booking.occasion || {};
                const devotee = booking.devotee || {};
                const amount = parseFloat(booking.total_amount) || 0;
                const discount = parseFloat(booking.discount_amount) || 0;
                total += amount;
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${this.formatDate(booking.booking_date)}</td>
                        <td>${booking.booking_number || 'N/A'}</td>
                        <td>${occasion.occasion_name || booking.booking_type || 'N/A'}</td>
                        <td>${devotee.name || devotee.name_secondary || '-'}</td>
                        <td>${booking.payment_mode_name || '-'}</td>
                        <td class="amount">${this.formatCurrency(discount)}</td>
                        <td class="amount">${this.formatCurrency(amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                    <tr class="total-row">
                        <td colspan="7" style="text-align: right;">Total:</td>
                        <td class="amount">${this.formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return html;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
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