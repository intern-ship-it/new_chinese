// frontend/js/pages/auspicious-light/report-print.js
// Auspicious Light Bulk Report Print Page

(function($, window) {
    'use strict';
    
    window.AuspiciousLightReportPage = {
        reportData: [],
        filters: {},
        templeSettings: null,
        
        init: function(params) {
            this.loadReportData();
            this.loadTempleSettings()
                .then(() => {
                    this.openPrintWindow();
                })
                .catch(() => {
                    TempleUtils.showError('Failed to load temple settings');
                    TempleRouter.navigate('auspicious-light/index');
                });
        },
        
        cleanup: function() {
            this.reportData = [];
            this.filters = {};
            this.templeSettings = null;
            sessionStorage.removeItem('reportFilters');
            sessionStorage.removeItem('reportData');
        },
        
        loadReportData: function() {
            // Load data from sessionStorage (passed from index page)
            const storedData = sessionStorage.getItem('reportData');
            const storedFilters = sessionStorage.getItem('reportFilters');
            
            if (storedData) {
                this.reportData = JSON.parse(storedData);
            }
            
            if (storedFilters) {
                this.filters = JSON.parse(storedFilters);
            }
            
            // Apply filters to data
            this.applyFilters();
        },
        
        applyFilters: function() {
            if (!this.filters) return;
            
            let filteredData = this.reportData;
            
            // Date range filter
            if (this.filters.fromDate) {
                filteredData = filteredData.filter(r => 
                    moment(r.offer_date).isSameOrAfter(this.filters.fromDate)
                );
            }
            
            if (this.filters.toDate) {
                filteredData = filteredData.filter(r => 
                    moment(r.offer_date).isSameOrBefore(this.filters.toDate)
                );
            }
            
            // Light option filter
            if (this.filters.lightOption) {
                filteredData = filteredData.filter(r => 
                    r.light_option === this.filters.lightOption
                );
            }
            
            // Status filter
            if (this.filters.status) {
                filteredData = filteredData.filter(r => 
                    r.status === this.filters.status
                );
            }
            
            this.reportData = filteredData;
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
                temple_name: stored.name || 'Persatuan Hainan Selangor & Wilayah Persekutuan',
                temple_address: stored.address || '65, Persiaran Endah, Off Jalan Syed Putra',
                temple_city: stored.city || '50460 Kuala Lumpur',
                temple_state: stored.state || '',
                temple_pincode: stored.pincode || '',
                temple_country: stored.country || 'Malaysia',
                temple_phone: stored.phone || '03-2273 7088',
                temple_email: stored.email || 'hainan@hainannet.com.my',
                temple_logo: stored.logo || null
            };
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleUtils.showWarning('Please allow popups to print report');
                return;
            }
            
            const html = this.generateReportHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to auspicious-light list
            setTimeout(() => {
                TempleRouter.navigate('auspicious-light/index');
            }, 100);
        },
        
        generateReportHTML: function() {
            const temple = this.templeSettings;
            const logoHTML = this.getTempleLogoHTML();
            
            // Calculate statistics
            const stats = this.calculateStatistics();
            
            // Group data
            const groupedByDate = this.groupByDate();
            const groupedByPayment = this.groupByPaymentMode();
            const groupedByOption = this.groupByLightOption();
            
            // Filter info
            const filterInfo = this.getFilterInfo();
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Auspicious Light Report</title>
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
                            color: #ff00ff;
                            margin-bottom: 5px;
                        }
                        .report-title {
                            text-align: center;
                            font-size: 28px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 20px 0;
                            color: #d946a6;
                        }
                        .chinese-title {
                            text-align: center;
                            font-size: 20px;
                            color: #666;
                            margin-bottom: 10px;
                        }
                        .filter-info {
                            background: #f0f9ff;
                            border: 1px solid #0284c7;
                            padding: 10px 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                            font-size: 13px;
                        }
                        .stats-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 15px;
                            margin: 30px 0;
                        }
                        .stat-card {
                            background: linear-gradient(135deg, #d946a6 0%, #f59e0b 100%);
                            color: white;
                            padding: 20px;
                            border-radius: 8px;
                            text-align: center;
                        }
                        .stat-value {
                            font-size: 32px;
                            font-weight: bold;
                            margin: 10px 0;
                        }
                        .stat-label {
                            font-size: 13px;
                            opacity: 0.9;
                        }
                        .section-title {
                            font-size: 18px;
                            font-weight: bold;
                            color: #d946a6;
                            margin: 30px 0 15px 0;
                            padding-bottom: 10px;
                            border-bottom: 2px solid #f59e0b;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                            font-size: 13px;
                        }
                        table thead {
                            background: #f3f4f6;
                        }
                        table th {
                            padding: 10px;
                            text-align: left;
                            font-weight: bold;
                            border-bottom: 2px solid #d1d5db;
                        }
                        table td {
                            padding: 8px 10px;
                            border-bottom: 1px solid #e5e7eb;
                        }
                        table tr:hover {
                            background: #f9fafb;
                        }
                        .summary-table {
                            background: #fef3c7;
                            border: 2px solid #f59e0b;
                        }
                        .summary-table th {
                            background: #fbbf24;
                            color: white;
                        }
                        .total-row {
                            background: #d946a6 !important;
                            color: white;
                            font-weight: bold;
                        }
                        .total-row td {
                            border-top: 2px solid #a21caf;
                        }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .clear { clear: both; }
                        .footer-section {
                            margin-top: 50px;
                            padding-top: 20px;
                            border-top: 1px solid #ccc;
                            font-size: 12px;
                            color: #666;
                        }
                        .signature-area {
                            display: flex;
                            justify-content: space-between;
                            margin-top: 40px;
                        }
                        .signature-box {
                            width: 200px;
                            text-align: center;
                        }
                        .signature-line {
                            border-bottom: 1px solid #000;
                            margin-bottom: 5px;
                            height: 50px;
                        }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; }
                            .stats-grid {
                                grid-template-columns: repeat(2, 1fr);
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
                        <div class="chinese-title"></div>
                        <div class="report-title">Auspicious Light Registration Report</div>
                        
                        <!-- Filter Information -->
                        ${filterInfo}
                        
                        <!-- Statistics Summary -->
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">Total Registrations</div>
                                <div class="stat-value">${stats.totalRegistrations}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Total Amount</div>
                                <div class="stat-value">$${this.formatCurrency(stats.totalAmount)}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Active Lights</div>
                                <div class="stat-value">${stats.activeLights}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Expired Lights</div>
                                <div class="stat-value">${stats.expiredLights}</div>
                            </div>
                        </div>
                        
                        <!-- Grouped by Date -->
                        <div class="section-title">Summary by Date</div>
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th class="text-center">Count</th>
                                    <th class="text-right">Amount (SGD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateDateGroupHTML(groupedByDate)}
                            </tbody>
                        </table>
                        
                        <!-- Grouped by Payment Mode -->
                        <div class="section-title">Summary by Payment Mode</div>
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>Payment Mode</th>
                                    <th class="text-center">Count</th>
                                    <th class="text-right">Amount (SGD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generatePaymentGroupHTML(groupedByPayment)}
                            </tbody>
                        </table>
                        
                        <!-- Grouped by Light Option -->
                        <div class="section-title">Summary by Light Option</div>
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>Light Option</th>
                                    <th class="text-center">Count</th>
                                    <th class="text-right">Amount (SGD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateOptionGroupHTML(groupedByOption)}
                            </tbody>
                        </table>
                        
                        <!-- Detailed Registration List -->
                        <div class="section-title">Detailed Registration List</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Receipt No.</th>
                                    <th>Date</th>
                                    <th>Devotee</th>
                                    <th>Light</th>
                                    <th>Option</th>
                                    <th class="text-right">Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateDetailedListHTML()}
                            </tbody>
                        </table>
                        
                        <!-- Signature Section -->
                        <div class="signature-area">
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <strong>Prepared By</strong><br>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <strong>Verified By</strong><br>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <strong>Approved By</strong><br>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="footer-section">
                            <div style="text-align: center;">
                                <p>Generated on: ${moment().format('DD/MM/YYYY HH:mm:ss')}</p>
                                <p style="margin-top: 10px; color: #999; font-size: 11px;">
                                    This is a computer-generated report. No signature is required.
                                </p>
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
                logoHTML = `<div class="temple-logo"><img src="${this.templeSettings.temple_logo}" style="width:205px;height:119px;object-fit:contain;padding-top:14px;" alt="Temple Logo" /></div>`;
            } else {
                logoHTML = `
                    <div class="temple-logo" style="
                        width: 100px; 
                        height: 100px; 
                        background: #d946a6; 
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
        
        getFilterInfo: function() {
            const filters = this.filters;
            let info = '<div class="filter-info"><strong>Report Filters:</strong> ';
            
            const parts = [];
            
            if (filters.fromDate && filters.toDate) {
                parts.push(`Date Range: ${this.formatDate(filters.fromDate)} to ${this.formatDate(filters.toDate)}`);
            } else if (filters.fromDate) {
                parts.push(`From Date: ${this.formatDate(filters.fromDate)}`);
            } else if (filters.toDate) {
                parts.push(`To Date: ${this.formatDate(filters.toDate)}`);
            }
            
            if (filters.lightOption) {
                const optionText = filters.lightOption === 'new_light' ? 'New Light' : 'Family Light';
                parts.push(`Light Option: ${optionText}`);
            }
            
            if (filters.status) {
                const statusText = filters.status === 'active' ? 'Active' : 'Expired';
                parts.push(`Status: ${statusText}`);
            }
            
            if (parts.length === 0) {
                parts.push('All Registrations');
            }
            
            info += parts.join(' | ');
            info += '</div>';
            
            return info;
        },
        
        calculateStatistics: function() {
            const stats = {
                totalRegistrations: this.reportData.length,
                totalAmount: 0,
                activeLights: 0,
                expiredLights: 0
            };
            
            this.reportData.forEach(reg => {
                stats.totalAmount += parseFloat(reg.merit_amount);
                if (reg.status === 'active') {
                    stats.activeLights++;
                } else {
                    stats.expiredLights++;
                }
            });
            
            return stats;
        },
        
        groupByDate: function() {
            const grouped = {};
            
            this.reportData.forEach(reg => {
                const date = reg.offer_date;
                if (!grouped[date]) {
                    grouped[date] = {
                        count: 0,
                        amount: 0
                    };
                }
                grouped[date].count++;
                grouped[date].amount += parseFloat(reg.merit_amount);
            });
            
            return grouped;
        },
        
        groupByPaymentMode: function() {
            const grouped = {};
            
            this.reportData.forEach(reg => {
                const mode = reg.payment_method;
                if (!grouped[mode]) {
                    grouped[mode] = {
                        count: 0,
                        amount: 0
                    };
                }
                grouped[mode].count++;
                grouped[mode].amount += parseFloat(reg.merit_amount);
            });
            
            return grouped;
        },
        
        groupByLightOption: function() {
            const grouped = {};
            
            this.reportData.forEach(reg => {
                const option = reg.light_option === 'new_light' ? 'New Light' : 'Family Light';
                if (!grouped[option]) {
                    grouped[option] = {
                        count: 0,
                        amount: 0
                    };
                }
                grouped[option].count++;
                grouped[option].amount += parseFloat(reg.merit_amount);
            });
            
            return grouped;
        },
        
        generateDateGroupHTML: function(grouped) {
            let html = '';
            let totalCount = 0;
            let totalAmount = 0;
            
            Object.keys(grouped).sort().forEach(date => {
                const data = grouped[date];
                totalCount += data.count;
                totalAmount += data.amount;
                
                html += `
                    <tr>
                        <td>${this.formatDate(date)}</td>
                        <td class="text-center">${data.count}</td>
                        <td class="text-right">$${this.formatCurrency(data.amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                <tr class="total-row">
                    <td><strong>TOTAL</strong></td>
                    <td class="text-center"><strong>${totalCount}</strong></td>
                    <td class="text-right"><strong>$${this.formatCurrency(totalAmount)}</strong></td>
                </tr>
            `;
            
            return html;
        },
        
        generatePaymentGroupHTML: function(grouped) {
            let html = '';
            let totalCount = 0;
            let totalAmount = 0;
            
            Object.keys(grouped).forEach(mode => {
                const data = grouped[mode];
                totalCount += data.count;
                totalAmount += data.amount;
                
                html += `
                    <tr>
                        <td>${mode}</td>
                        <td class="text-center">${data.count}</td>
                        <td class="text-right">$${this.formatCurrency(data.amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                <tr class="total-row">
                    <td><strong>TOTAL</strong></td>
                    <td class="text-center"><strong>${totalCount}</strong></td>
                    <td class="text-right"><strong>$${this.formatCurrency(totalAmount)}</strong></td>
                </tr>
            `;
            
            return html;
        },
        
        generateOptionGroupHTML: function(grouped) {
            let html = '';
            let totalCount = 0;
            let totalAmount = 0;
            
            Object.keys(grouped).forEach(option => {
                const data = grouped[option];
                totalCount += data.count;
                totalAmount += data.amount;
                
                html += `
                    <tr>
                        <td>${option}</td>
                        <td class="text-center">${data.count}</td>
                        <td class="text-right">$${this.formatCurrency(data.amount)}</td>
                    </tr>
                `;
            });
            
            html += `
                <tr class="total-row">
                    <td><strong>TOTAL</strong></td>
                    <td class="text-center"><strong>${totalCount}</strong></td>
                    <td class="text-right"><strong>$${this.formatCurrency(totalAmount)}</strong></td>
                </tr>
            `;
            
            return html;
        },
        
        generateDetailedListHTML: function() {
            let html = '';
            let totalAmount = 0;
            
            this.reportData.forEach((reg, index) => {
                totalAmount += parseFloat(reg.merit_amount);
                
                const statusBadge = reg.status === 'active' 
                    ? '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Active</span>' 
                    : '<span style="background: #6b7280; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Expired</span>';
                
                const optionText = reg.light_option === 'new_light' ? 'New' : 'Family';
                
                html += `
                    <tr>
                        <td>${reg.receipt_number}</td>
                        <td>${this.formatDate(reg.offer_date)}</td>
                        <td>${reg.devotee.name_english}</td>
                        <td>${reg.light_number}</td>
                        <td>${optionText}</td>
                        <td class="text-right">$${this.formatCurrency(reg.merit_amount)}</td>
                        <td class="text-center">${statusBadge}</td>
                    </tr>
                `;
            });
            
            html += `
                <tr class="total-row">
                    <td colspan="5"><strong>TOTAL</strong></td>
                    <td class="text-right"><strong>$${this.formatCurrency(totalAmount)}</strong></td>
                    <td></td>
                </tr>
            `;
            
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