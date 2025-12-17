// js/pages/donations/report-print.js
// Donations Report Print Page - WITH PLEDGE STATISTICS

(function($, window) {
    'use strict';
    
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
            
            console.log('Report filters received:', this.reportFilters);
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
                console.error('Error loading report:', error);
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
                const params = new URLSearchParams();
                
                if (self.reportFilters.donation_type) {
                    params.append('donation_type', self.reportFilters.donation_type);
                }
                if (self.reportFilters.payment_mode_id) {
                    params.append('payment_mode_id', self.reportFilters.payment_mode_id);
                }
                if (self.reportFilters.from_date) {
                    params.append('from_date', self.reportFilters.from_date);
                }
                if (self.reportFilters.to_date) {
                    params.append('to_date', self.reportFilters.to_date);
                }
                if (self.reportFilters.search) {
                    params.append('search', self.reportFilters.search);
                }
                if (self.reportFilters.pledge_status) {
                    params.append('pledge_status', self.reportFilters.pledge_status);
                }
                
                const queryString = params.toString();
                const apiUrl = queryString ? `/donations/report?${queryString}` : '/donations/report';
                
                console.log('Loading report from API:', apiUrl);
                
                TempleAPI.get(apiUrl)
                    .done(function(response) {
                        if (response.success && response.data) {
                            self.reportData = response.data;
                            console.log('Report data loaded:', self.reportData);
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Failed to load report data'));
                        }
                    })
                    .fail(function(xhr) {
                        console.error('API Error:', xhr);
                        console.warn('Report endpoint not found, using donations list as fallback');
                        self.loadReportFromDonationsList()
                            .then(resolve)
                            .catch(reject);
                    });
            });
        },
        
        loadReportFromDonationsList: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                const params = new URLSearchParams();
                params.append('per_page', 1000);
                
                if (self.reportFilters.donation_type) {
                    params.append('donation_type', self.reportFilters.donation_type);
                }
                if (self.reportFilters.payment_mode_id) {
                    params.append('payment_mode_id', self.reportFilters.payment_mode_id);
                }
                if (self.reportFilters.from_date) {
                    params.append('from_date', self.reportFilters.from_date);
                }
                if (self.reportFilters.to_date) {
                    params.append('to_date', self.reportFilters.to_date);
                }
                if (self.reportFilters.search) {
                    params.append('search', self.reportFilters.search);
                }
                if (self.reportFilters.pledge_status) {
                    params.append('pledge_status', self.reportFilters.pledge_status);
                }
                
                TempleAPI.get(`/donations?${params.toString()}`)
                    .done(function(response) {
                        if (response.success && response.data) {
                            const donations = response.data;
                            const summary = self.calculateSummary(donations);
                            
                            self.reportData = {
                                title: 'Donations Report',
                                period: {
                                    from: self.reportFilters.from_date || donations[0]?.date || new Date().toISOString().split('T')[0],
                                    to: self.reportFilters.to_date || donations[donations.length - 1]?.date || new Date().toISOString().split('T')[0]
                                },
                                filters: {
                                    type: self.reportFilters.donation_type || '',
                                    payment_method: self.reportFilters.payment_mode_id || '',
                                    pledge_status: self.reportFilters.pledge_status || ''
                                },
                                summary: summary,
                                donations: donations.map(d => ({
                                    id: d.booking_number || d.id,
                                    date: d.date,
                                    donor_name: d.name_english + (d.name_chinese ? ' / ' + d.name_chinese : ''),
                                    type: d.donation_type || d.donation_name || 'General',
                                    amount: parseFloat(d.amount),
                                    payment_method: d.payment_method,
                                    // ========== PLEDGE FIELDS ==========
                                    is_pledge: d.is_pledge || false,
                                    pledge_amount: parseFloat(d.pledge_amount || 0),
                                    pledge_balance: parseFloat(d.pledge_balance || 0),
                                    pledge_status: d.pledge_status || '',
                                    paid_amount: parseFloat(d.paid_amount || d.amount || 0)
                                })),
                                generated_at: new Date().toISOString()
                            };
                            
                            console.log('Report built from donations list:', self.reportData);
                            resolve();
                        } else {
                            reject(new Error('Failed to load donations data'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading donations data'));
                    });
            });
        },
        
        calculateSummary: function(donations) {
            const summary = {
                total_donations: donations.length,
                total_amount: 0,
                average_amount: 0,
                cash_amount: 0,
                card_amount: 0,
                ebanking_amount: 0,
                cheque_amount: 0,
                duitnow_amount: 0,
                // ========== PLEDGE STATISTICS ==========
                total_pledges: 0,
                active_pledges: 0,
                fulfilled_pledges: 0,
                total_pledge_amount: 0,
                total_pledge_paid: 0,
                total_pledge_balance: 0
            };
            
            donations.forEach(donation => {
                const amount = parseFloat(donation.amount || 0);
                summary.total_amount += amount;
                
                // Group by payment method
                const method = (donation.payment_method || '').toLowerCase();
                if (method.includes('cash')) {
                    summary.cash_amount += amount;
                } else if (method.includes('card')) {
                    summary.card_amount += amount;
                } else if (method.includes('banking') || method.includes('bank')) {
                    summary.ebanking_amount += amount;
                } else if (method.includes('cheque')) {
                    summary.cheque_amount += amount;
                } else if (method.includes('duitnow')) {
                    summary.duitnow_amount += amount;
                }
                
                // ========== CALCULATE PLEDGE STATISTICS ==========
                if (donation.is_pledge) {
                    summary.total_pledges++;
                    const pledgeAmount = parseFloat(donation.pledge_amount || 0);
                    const paidAmount = parseFloat(donation.paid_amount || donation.amount || 0);
                    const pledgeBalance = parseFloat(donation.pledge_balance || 0);
                    
                    summary.total_pledge_amount += pledgeAmount;
                    summary.total_pledge_paid += paidAmount;
                    summary.total_pledge_balance += pledgeBalance;
                    
                    if (donation.pledge_status === 'FULFILLED') {
                        summary.fulfilled_pledges++;
                    } else {
                        summary.active_pledges++;
                    }
                }
            });
            
            summary.average_amount = donations.length > 0 ? summary.total_amount / donations.length : 0;
            
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
                TempleRouter.navigate('donations/list');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const report = this.reportData;
            const temple = this.templeSettings;
            
            const logoHTML = this.getTempleLogoHTML();
            const filtersHTML = this.generateFiltersHTML();
            const donationsTableHTML = this.generateDonationsTableHTML();
            const pledgeSummaryHTML = this.generatePledgeSummaryHTML();
            
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
                        /* NEW: Pledge Summary Section */
                  
                    
                 
                     
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
                            font-size: 11px;
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
  
                            font-weight: bold;
                        }
                        /* NEW: Pledge Badge in Table */
                        .pledge-badge {
                            display: inline-block;
                            background: #666;
                            color: white;
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 9px;
                            font-weight: bold;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 9px;
                            font-weight: bold;
                        }
                        .status-fulfilled {
                            background: #4caf50;
                            color: white;
                        }
                        .status-pending {
                            background: #666;
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
                        <div class="report-title">Donations Report</div>
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
                            ${this.generatePaymentBreakdownHTML()}
                        </div>
                        
                        <!-- PLEDGE SUMMARY SECTION (if pledges exist) -->
                        ${pledgeSummaryHTML}
                        
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
                            ${report.summary.total_pledges > 0 ? `
                            <div style="margin-top: 5px; color: #000;">
                                Includes ${report.summary.total_pledges} pledge donation(s) | Outstanding: RM ${this.formatCurrency(report.summary.total_pledge_balance)}
                            </div>
                            ` : ''}
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
            
            if (filters.type) {
                appliedFilters.push(`Type: ${filters.type}`);
            }
            if (filters.payment_method) {
                appliedFilters.push(`Payment Method: ${filters.payment_method}`);
            }
            if (filters.pledge_status) {
                const pledgeStatusMap = {
                    'pledge_only': 'Pledges Only',
                    'non_pledge': 'Non-Pledges Only',
                    'PENDING': 'Pending Pledges',
                    'FULFILLED': 'Fulfilled Pledges'
                };
                appliedFilters.push(`Pledge Filter: ${pledgeStatusMap[filters.pledge_status] || filters.pledge_status}`);
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
        
        // ========== NEW: PLEDGE SUMMARY HTML ==========
generatePledgeSummaryHTML: function () {
    const summary = this.reportData.summary;

    if (summary.total_pledges === 0) {
        return '';
    }

    const pledgeFulfillmentRate = summary.total_pledges > 0
        ? ((summary.fulfilled_pledges / summary.total_pledges) * 100).toFixed(1)
        : 0;

    const pledgeCollectionRate = summary.total_pledge_amount > 0
        ? ((summary.total_pledge_paid / summary.total_pledge_amount) * 100).toFixed(1)
        : 0;

    return `
        <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-weight: bold; color: #333; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; margin-bottom: 15px;">
                 Pledge Donations Summary
            </h3>

            <table border="1" cellpadding="8" cellspacing="0" width="100%" style="border-collapse: collapse; background: #fff; border: 1px solid #dee2e6;">
                <tbody>
                    <tr style="background: #f8f9fa;">
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold;">Total Pledges</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px;">${summary.total_pledges}</td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Active Pledges</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px;">${summary.active_pledges}</td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Fulfilled Pledges</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px;">${summary.fulfilled_pledges}</td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Total Pledge Amount</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px;">RM ${this.formatCurrency(summary.total_pledge_amount)}</td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Total Paid</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px;">RM ${this.formatCurrency(summary.total_pledge_paid)}</td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Outstanding Balance</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px;">RM ${this.formatCurrency(summary.total_pledge_balance)}</td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Fulfillment Rate</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; color: ${pledgeFulfillmentRate > 0 ? '#4caf50' : '#333'};">
                            ${pledgeFulfillmentRate}%
                        </td>
                    </tr>
                    <tr>
                        <th align="left" style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold; background: #f8f9fa;">Collection Rate</th>
                        <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 11px; font-weight: bold;">
                            ${pledgeCollectionRate}%
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
},

        generatePaymentBreakdownHTML: function() {
            const summary = this.reportData.summary;
            const total = summary.total_amount;
            
            if (total === 0) return '';
            
            const paymentMethods = [];
            
            if (summary.cash_amount > 0) {
                paymentMethods.push({
                    name: 'Cash',
                    amount: summary.cash_amount,
                    percentage: ((summary.cash_amount / total) * 100).toFixed(1)
                });
            }
            if (summary.card_amount > 0) {
                paymentMethods.push({
                    name: 'Card',
                    amount: summary.card_amount,
                    percentage: ((summary.card_amount / total) * 100).toFixed(1)
                });
            }
            if (summary.ebanking_amount > 0) {
                paymentMethods.push({
                    name: 'E-banking',
                    amount: summary.ebanking_amount,
                    percentage: ((summary.ebanking_amount / total) * 100).toFixed(1)
                });
            }
            if (summary.cheque_amount > 0) {
                paymentMethods.push({
                    name: 'Cheque',
                    amount: summary.cheque_amount,
                    percentage: ((summary.cheque_amount / total) * 100).toFixed(1)
                });
            }
            if (summary.duitnow_amount > 0) {
                paymentMethods.push({
                    name: 'DuitNow',
                    amount: summary.duitnow_amount,
                    percentage: ((summary.duitnow_amount / total) * 100).toFixed(1)
                });
            }
            
            if (paymentMethods.length === 0) return '';
            
            let html = `
                <div style="margin-top: 20px;">
                    <strong>Payment Method Breakdown:</strong>
                    <table class="donations-table" style="margin-top: 10px;">
                        <tr>
                            <th>Payment Method</th>
                            <th>Amount</th>
                            <th>Percentage</th>
                        </tr>
            `;
            
            paymentMethods.forEach(method => {
                html += `
                    <tr>
                        <td>${method.name}</td>
                        <td class="amount">RM ${this.formatCurrency(method.amount)}</td>
                        <td class="amount">${method.percentage}%</td>
                    </tr>
                `;
            });
            
            html += `
                    </table>
                </div>
            `;
            
            return html;
        },
        
        // ========== UPDATED: DONATIONS TABLE WITH PLEDGE INFO ==========
        generateDonationsTableHTML: function() {
            const donations = this.reportData.donations;
            
            if (!donations || donations.length === 0) {
                return '<p class="text-center">No donations found for the selected criteria.</p>';
            }
            
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
                            <th>Pledge Info</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            donations.forEach((donation, index) => {
                const pledgeInfo = donation.is_pledge 
                    ? `<span class="pledge-badge">PLEDGE</span><br>
                       <small>Total: RM ${this.formatCurrency(donation.pledge_amount)}<br>
                       Paid: RM ${this.formatCurrency(donation.paid_amount)}<br>
                       Bal: RM ${this.formatCurrency(donation.pledge_balance)}</small><br>
                       <span class="status-badge ${donation.pledge_status === 'FULFILLED' ? 'status-fulfilled' : 'status-pending'}">
                           ${donation.pledge_status}
                       </span>`
                    : '-';
                    
                tableHTML += `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td>${donation.id}</td>
                        <td>${this.formatDate(donation.date)}</td>
                        <td>${donation.donor_name}</td>
                        <td>${donation.type}</td>
                        <td>${donation.payment_method}</td>
                        <td class="amount">RM ${this.formatCurrency(donation.amount)}</td>
                        <td style="text-align: center;">${pledgeInfo}</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    <tr class="total-row">
                        <td colspan="6" style="text-align: right; font-weight: bold;">TOTAL:</td>
                        <td class="amount">RM ${this.formatCurrency(this.reportData.summary.total_amount)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            `;
            
            return tableHTML;
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