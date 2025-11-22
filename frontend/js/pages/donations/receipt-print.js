// js/pages/donations/receipt-print.js
// Donations Receipt Print Page

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

    window.DonationsReceiptPrintPage = {
        donationId: null,
        donationData: null,
        templeSettings: null,
        pageId: 'donations-receipt-print',
        eventNamespace: window.DonationsSharedModule.eventNamespace,
        
        init: function(params) {
            window.DonationsSharedModule.registerPage(this.pageId);
            this.donationId = 'DON-2024-002';
            
            if (!this.donationId) {
                TempleCore.showToast('Invalid donation ID', 'error');
				this.cleanup();
                TempleRouter.navigate('donations/list');
                return;
            }
            
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
                this.loadDonationData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
				self.cleanup();
                TempleRouter.navigate('donations/list');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadDonationData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Simulate loading donation data (replace with actual API call)
                setTimeout(() => {
                    // Sample donation data - replace with actual API call
                    self.donationData = {
                        id: self.donationId,
                        donation_code: 'DON-2025-' + self.donationId,
                        date: '2025-11-21',
                        time: '10:30 AM',
                        donor: {
                            name_english: 'John Tan Wei Ming',
                            name_chinese: '',
                            nric: '940815-01-5678',
                            email: 'john.tan@email.com',
                            contact_no: '+60123456789'
                        },
                        donation_type: 'donation',
                        donation_subtype: 'general',
                        amount: 500.00,
                        payment_method: 'cash',
                        notes: 'Monthly donation for temple maintenance',
                        status: 'Confirmed',
                        receipt_no: 'RCP-' + self.donationId,
                        created_at: '2025-11-21T10:30:00Z'
                    };
                    resolve();
                }, 500);
                
                // Actual API implementation:
                /*
                TempleAPI.get(`/donations/${this.donationId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.donationData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load donation'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading donation'));
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
                TempleCore.showToast('Please allow popups to print receipt', 'warning');
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
            const donation = this.donationData;
            const temple = this.templeSettings;
            
            // Generate receipt number
            const receiptNumber = this.generateReceiptNumber(donation.date);
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amountInWords = this.numberToWords(donation.amount);
            
            // Get donation type display
            const donationTypeDisplay = this.getDonationTypeDisplay(donation);
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Donation Receipt - ${donation.donation_code}</title>
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
                        .receipt-container {
                            max-width: 750px;
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
                        .receipt-title {
                            text-align: center;
                            font-size: 28px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 20px 0;
                            border-top: 2px solid #c2c2c2;
                            padding-top: 15px;
                        }
                        .receipt-details {
                            margin: 20px 0;
                        }
                        .receipt-details table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .receipt-details td {
                            padding: 8px 5px;
                            font-size: 14px;
                            border-bottom: 1px solid #f0f0f0;
                            vertical-align: top;
                        }
                        .receipt-details .label {
                            font-weight: bold;
                            width: 150px;
                        }
                        .amount-highlight {
                            background: #f8f9fa;
                            border: 2px solid #ff00ff;
                            padding: 10px;
                            text-align: center;
                            margin: 20px 0;
                            border-radius: 5px;
                        }
                        .amount-highlight .amount {
                            font-size: 24px;
                            font-weight: bold;
                            color: #ff00ff;
                        }
                        .signature-section {
                            margin-top: 50px;
                            text-align: right;
                        }
                        .signature-line {
                            border-bottom: 1px solid #000;
                            width: 200px;
                            margin: 0 0 5px auto;
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
                    <table width="750" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="550"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    <div class="receipt-container">
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
                                ${temple.temple_website ? `<div>Website: ${temple.temple_website}</div>` : ''}
                            </div>
                            <div class="clear"></div>
                        </div>
                        
                        <!-- Receipt Title -->
                        <div class="receipt-title">Donation Receipt</div>
                        
                        <!-- Receipt Details -->
                        <div class="receipt-details">
                            <table>
                                <tr>
                                    <td class="label">Receipt No:</td>
                                    <td><strong>${donation.receipt_no || receiptNumber}</strong></td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right; width: 120px;">${this.formatDate(donation.date)}</td>
                                </tr>
                                <tr>
                                    <td class="label">Time:</td>
                                    <td>${donation.time || this.formatTime(donation.created_at)}</td>
                                    <td class="label" style="text-align: right;">Donation Code:</td>
                                    <td style="text-align: right;">${donation.donation_code}</td>
                                </tr>
                                <tr>
                                    <td class="label">Received from:</td>
                                    <td colspan="3">
                                        <strong>${donation.donor.name_english}</strong>
                                        ${donation.donor.name_chinese ? '<br><strong>' + donation.donor.name_chinese + '</strong>' : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">NRIC No:</td>
                                    <td>${donation.donor.nric}</td>
                                    <td class="label" style="text-align: right;">Contact:</td>
                                    <td style="text-align: right;">${donation.donor.contact_no}</td>
                                </tr>
                                <tr>
                                    <td class="label">Email:</td>
                                    <td colspan="3">${donation.donor.email}</td>
                                </tr>
                                <tr>
                                    <td class="label">Donation Type:</td>
                                    <td colspan="3"><strong>${donationTypeDisplay}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">Payment Method:</td>
                                    <td>${this.getPaymentMethodDisplay(donation.payment_method)}</td>
                                    <td class="label" style="text-align: right;">Status:</td>
                                    <td style="text-align: right;"><strong style="color: green;">Confirmed</strong></td>
                                </tr>
                                ${donation.notes ? `
                                <tr>
                                    <td class="label">Notes:</td>
                                    <td colspan="3">${donation.notes}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        
                        <!-- Amount Highlight -->
                        <div class="amount-highlight">
                            <div class="amount">RM ${this.formatCurrency(donation.amount)}</div>
                            <div style="margin-top: 5px; font-size: 14px;">Amount in Words:</div>
                            <div style="font-weight: bold; font-size: 16px;">${amountInWords}</div>
                        </div>
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <div style="margin-right: 50px;">
                                <strong>Authorized Signature</strong><br>
                                <small>Temple Administrator</small>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="footer-section">
                            <div>Thank you for your generous donation!</div>
                            <div style="margin-top: 10px;">
                                This is a computer-generated receipt. No signature required.
                            </div>
                            <div style="margin-top: 5px;">
                                Generated on: ${this.formatDateTime(new Date())}
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
        
        generateReceiptNumber: function(date) {
            const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
            const randomNum = Math.floor(Math.random() * 9999) + 1;
            return `RCP-${dateStr}-${randomNum.toString().padStart(4, '0')}`;
        },
        
        getDonationTypeDisplay: function(donation) {
            const types = {
                'donation': {
                    'general': 'General Donation',
                    'meal': 'Meal Donation',
                    'maintenance': 'Temple Maintenance',
                    'other': 'Other Donation'
                },
                'voucher': {
                    'merciful': 'Merciful Voucher',
                    'candle': 'Candle Voucher',
                    'gold_block': 'Gold Block'
                }
            };
            
            if (donation.donation_type === 'voucher') {
                return types.voucher[donation.voucher_type] || 'Voucher Donation';
            } else {
                return types.donation[donation.donation_subtype] || 'General Donation';
            }
        },
        
        getPaymentMethodDisplay: function(method) {
            const methods = {
                'cash': 'Cash',
                'cheque': 'Cheque',
                'ebanking': 'E-banking',
                'card': 'Card',
                'duitnow': 'DuitNow'
            };
            return methods[method] || method;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        formatTime: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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
        },
        
        numberToWords: function(amount) {
            if (amount === 0) return 'Zero Ringgit Only';
            
            const [whole, decimal = '00'] = amount.toFixed(2).split('.');
            let words = this.convertToWords(parseInt(whole));
            
            words = words + ' Ringgit';
            if (decimal !== '00') {
                words += ' and ' + decimal + '/100';
            }
            words += ' Only';
            
            return words;
        },
        
        convertToWords: function(num) {
            if (num === 0) return 'Zero';
            
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            
            if (num < 10) return ones[num];
            if (num < 20) return teens[num - 10];
            if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
            if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + this.convertToWords(num % 100) : '');
            if (num < 100000) return this.convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.convertToWords(num % 1000) : '');
            if (num < 10000000) return this.convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + this.convertToWords(num % 100000) : '');
            return this.convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + this.convertToWords(num % 10000000) : '');
        }
    };
    
})(jQuery, window);