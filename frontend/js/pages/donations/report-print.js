// js/pages/donations/report-print.js
// Donations Report Print Page

(function($, window) {
    'use strict';
    
    // Ensure shared module exists
    if (!window.DonationsSharedModule) {
        window.DonationsSharedModule = {
            moduleId: 'donations',
            eventNamespace: 'donations',
            cssId: 'donations-css',
            cssPath: '/css/donations.css',
            activePages: new Set(),
            
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
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Donations page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Donations page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('Donations CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Donations module cleaned up');
            }
        };
    }

    window.DonationsReportPrintPage = {
        reportData: null,
        templeSettings: null,
        reportFilters: null,
        pageId: 'donations-report-print',
        eventNamespace: window.DonationsSharedModule.eventNamespace,
        
        init: function(params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            this.reportFilters = params || {};
            this.loadAndPrint();
        },
        
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            window.DonationsSharedModule.unregisterPage(this.pageId);
            
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
                TempleCore.showToast(error.message || 'Error loading report data', 'error');
				self.cleanup();
                TempleRouter.navigate('donations/list');
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
                    // Sample report data - replace with actual API call
                    self.reportData = {
                        title: 'Donations Report',
                        period: {
                            from: self.reportFilters.from_date || '2025-01-01',
                            to: self.reportFilters.to_date || '2025-11-21'
                        },
                        filters: {
                            type: self.reportFilters.type || '',
                            payment_method: self.reportFilters.payment_method || ''
                        },
                        summary: {
                            total_donations: 45,
                            total_amount: 12750.00,
                            average_amount: 283.33,
                            cash_amount: 8500.00,
                            card_amount: 2250.00,
                            ebanking_amount: 2000.00
                        },
                        donations: [
                            {
                                id: 'DON-001',
                                date: '2025-11-20',
                                donor_name: 'John Tan Wei Ming',
                                type: 'General',
                                amount: 500.00,
                                payment_method: 'Cash'
                            },
                            {
                                id: 'DON-002',
                                date: '2025-11-20',
                                donor_name: 'Mary Lim',
                                type: 'Voucher',
                                amount: 100.00,
                                payment_method: 'Card'
                            },
                            {
                                id: 'DON-003',
                                date: '2025-11-19',
                                donor_name: 'David Wong',
                                type: 'Meal',
                                amount: 250.00,
                                payment_method: 'E-banking'
                            },
                            {
                                id: 'DON-004',
                                date: '2025-11-19',
                                donor_name: 'Sarah Lee',
                                type: 'Maintenance',
                                amount: 1000.00,
                                payment_method: 'Cheque'
                            },
                            {
                                id: 'DON-005',
                                date: '2025-11-18',
                                donor_name: 'Michael Ng',
                                type: 'General',
                                amount: 300.00,
                                payment_method: 'DuitNow'
                            }
                        ],
                        generated_at: new Date().toISOString()
                    };
                    resolve();
                }, 500);
                
                // Actual API implementation:
                /*
                TempleAPI.get('/donations/report', {
                    data: self.reportFilters
                })
                .done(function(response) {
                    if (response.success) {
                        self.reportData = response.data;
                        resolve();
                    } else {
                        reject(new Error('Failed to load report data'));
                    }
                })
                .fail(function() {
                    reject(new Error('Error loading report data'));
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
            
            // Navigate back to donations list after opening print window
            setTimeout(() => {
                this.cleanup();
				self.cleanup();
                TempleRouter.navigate('donations/list');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Generate filters description
            const filtersHTML = this.generateFiltersHTML();
            
            // Generate donations table
            const donationsTableHTML = this.generateDonationsTableHTML();
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Donations Report - ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}</title>
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
                            max-width: 800px;
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
                            color: #ff00ff;
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
                            display: flex;
                            gap: 15px;
                            margin-bottom: 20px;
                        }
                        .summary-card {
                            flex: 1;
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 5px;
                            text-align: center;
                            border: 1px solid #dee2e6;
                        }
                        .summary-card .value {
                            font-size: 20px;
                            font-weight: bold;
                            color: #ff00ff;
                            margin-bottom: 5px;
                        }
                        .summary-card .label {
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                        }
                        .donations-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        .donations-table th,
                        .donations-table td {
                            border: 1px solid #dee2e6;
                            padding: 8px;
                            text-align: left;
                            font-size: 12px;
                        }
                        .donations-table th {
                            background: #f8f9fa;
                            font-weight: bold;
                            text-align: center;
                        }
                        .donations-table .amount {
                            text-align: right;
                            font-family: monospace;
                        }
                        .donations-table .total-row {
                            background: #fff3cd;
                            font-weight: bold;
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
                        .clear { clear: both; }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="800" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="600"></td>
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
                        <div class="report-title">Donations Report</div>
                        <div class="report-period">
                            Period: ${this.formatDate(report.period.from)} to ${this.formatDate(report.period.to)}
                        </div>
                        
                        <!-- Filters -->
                        ${filtersHTML}
                        
                        <!-- Summary Section -->
                        <div class="summary-section">
                            <div class="section-title">Summary</div>
                            <div class="summary-cards">
                                <div class="summary-card">
                                    <div class="value">${report.summary.total_donations}</div>
                                    <div class="label">Total Donations</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.total_amount)}</div>
                                    <div class="label">Total Amount</div>
                                </div>
                                <div class="summary-card">
                                    <div class="value">RM ${this.formatCurrency(report.summary.average_amount)}</div>
                                    <div class="label">Average Amount</div>
                                </div>
                            </div>
                            
                            <!-- Payment Method Breakdown -->
                            <div style="margin-top: 20px;">
                                <strong>Payment Method Breakdown:</strong>
                                <table class="donations-table" style="margin-top: 10px;">
                                    <tr>
                                        <th>Payment Method</th>
                                        <th>Amount</th>
                                        <th>Percentage</th>
                                    </tr>
                                    <tr>
                                        <td>Cash</td>
                                        <td class="amount">RM ${this.formatCurrency(report.summary.cash_amount)}</td>
                                        <td class="amount">${((report.summary.cash_amount / report.summary.total_amount) * 100).toFixed(1)}%</td>
                                    </tr>
                                    <tr>
                                        <td>Card</td>
                                        <td class="amount">RM ${this.formatCurrency(report.summary.card_amount)}</td>
                                        <td class="amount">${((report.summary.card_amount / report.summary.total_amount) * 100).toFixed(1)}%</td>
                                    </tr>
                                    <tr>
                                        <td>E-banking</td>
                                        <td class="amount">RM ${this.formatCurrency(report.summary.ebanking_amount)}</td>
                                        <td class="amount">${((report.summary.ebanking_amount / report.summary.total_amount) * 100).toFixed(1)}%</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Donations Details -->
                        <div class="donations-section">
                            <div class="section-title">Donation Details</div>
                            ${donationsTableHTML}
                        </div>
                        
                        <!-- Footer -->
                        <div class="footer-section">
                            <div><strong>Report Generated:</strong> ${this.formatDateTime(new Date(report.generated_at))}</div>
                            <div style="margin-top: 10px;">
                                This is a computer-generated report. No signature required.
                            </div>
                            <div style="margin-top: 5px;">
                                Total records: ${report.donations.length} | Total amount: RM ${this.formatCurrency(report.summary.total_amount)}
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Auto focus print dialog
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
                logoHTML = `<div class="temple-logo"><img src="${this.templeSettings.temple_logo}" style="width:100px;height:100px;object-fit:contain;" alt="Temple Logo" /></div>`;
            } else {
                logoHTML = `
                    <div class="temple-logo" style="
                        width: 100px; 
                        height: 100px; 
                        background: #ff00ff; 
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
            
            if (filters.type) {
                appliedFilters.push(`Type: ${filters.type}`);
            }
            if (filters.payment_method) {
                appliedFilters.push(`Payment Method: ${filters.payment_method}`);
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
        
        generateDonationsTableHTML: function() {
            const donations = this.reportData.donations;
            let tableHTML = `
                <table class="donations-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Donor Name</th>
                            <th>Type</th>
                            <th>Payment</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            donations.forEach((donation, index) => {
                tableHTML += `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td>${donation.id}</td>
                        <td>${this.formatDate(donation.date)}</td>
                        <td>${donation.donor_name}</td>
                        <td>${donation.type}</td>
                        <td>${donation.payment_method}</td>
                        <td class="amount">RM ${this.formatCurrency(donation.amount)}</td>
                    </tr>
                `;
            });
            
            // Add total row
            tableHTML += `
                    <tr class="total-row">
                        <td colspan="6" style="text-align: right; font-weight: bold;">TOTAL:</td>
                        <td class="amount">RM ${this.formatCurrency(this.reportData.summary.total_amount)}</td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return tableHTML;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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