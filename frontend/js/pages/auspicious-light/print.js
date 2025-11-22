// frontend/js/pages/auspicious-light/print.js
// Auspicious Light Individual Receipt Print Page

(function($, window) {
    'use strict';
    
    window.AuspiciousLightPrintPage = {
        registrationId: null,
        registrationData: null,
        templeSettings: null,
        
        init: function(params) {
            this.registrationId = 1;
            
            if (!this.registrationId) {
                TempleUtils.showError('Invalid registration ID');
                TempleRouter.navigate('auspicious-light/index');
                return;
            }
            
            this.loadAndPrint();
        },
        
        cleanup: function() {
            this.registrationId = null;
            this.registrationData = null;
            this.templeSettings = null;
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleUtils.showLoading('Loading receipt...');
            
            // Load both registration data and temple settings
            Promise.all([
                this.loadRegistrationData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleUtils.showError(error.message || 'Error loading data');
                TempleRouter.navigate('auspicious-light/index');
            })
            .finally(function() {
                TempleUtils.hideLoading();
            });
        },
        
        loadRegistrationData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Sample registration data - replace with actual API call
                setTimeout(() => {
                    // Simulate loading from sample data
                    const sampleRegistrations = [
                        {
                            id: 1,
                            receipt_number: 'AL2025001',
                            offer_date: '2025-01-15',
                            expiry_date: '2026-01-15',
                            devotee: {
                                name_chinese: '',
                                name_english: 'TAN AH MING',
                                nric: 'S1234567A',
                                contact_no: '+65 9123 4567',
                                email: 'tan@email.com',
                                address: '123 Serangoon Road, Singapore 218042'
                            },
                            light_number: '001',
                            light_code: 'A-B1-01-001',
                            tower_code: 'A',
                            block_code: 'B1',
                            floor_number: 1,
                            rag_position: 'R1',
                            light_option: 'new_light',
                            merit_amount: 200.00,
                            payment_mode: 'Cash',
                            payment_method: 'Cash',
                            payment_reference: null,
                            remarks: null,
                            status: 'active',
                            created_at: '2025-01-15T10:30:00Z'
                        }
                    ];
                    
                    const registration = sampleRegistrations.find(r => r.id == self.registrationId);
                    
                    if (registration) {
                        self.registrationData = registration;
                        resolve();
                    } else {
                        reject(new Error('Registration not found'));
                    }
                }, 500);
                
                // Actual API implementation:
                /*
                PagodaAPI.registrations.getById(this.registrationId)
                    .done(function(response) {
                        if (response.success) {
                            self.registrationData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load registration'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading registration'));
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
                temple_email: stored.email || 'hainan@hainannet.com.my',
                temple_logo: stored.logo || null
            };
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleUtils.showWarning('Please allow popups to print receipt');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to auspicious-light list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('auspicious-light/index');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const reg = this.registrationData;
            const temple = this.templeSettings;
            
            // Calculate remaining days
            const today = moment();
            const expiry = moment(reg.expiry_date);
            const daysRemaining = expiry.diff(today, 'days');
            const daysRemainingText = daysRemaining >= 0 
                ? `${daysRemaining} days remaining` 
                : `Expired ${Math.abs(daysRemaining)} days ago`;
            
            // Format amount in words
            const amountInWords = this.numberToWords(reg.merit_amount);
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Light option display
            const lightOptionText = reg.light_option === 'new_light' 
                ? 'New Light (Individual)' 
                : 'Family Light ';
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Auspicious Light Receipt - ${reg.receipt_number}</title>
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
                        .receipt-title {
                            text-align: center;
                            font-size: 28px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 20px 0;
                            border-top: 2px solid #c2c2c2;
                            padding-top: 15px;
                        }
                        .chinese-title {
                            text-align: center;
                            font-size: 20px;
                            color: #d946a6;
                            margin-bottom: 10px;
                        }
                        .registration-details {
                            margin: 20px 0;
                        }
                        .registration-details table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .registration-details td {
                            padding: 8px 5px;
                            font-size: 14px;
                            border-bottom: 1px solid #f0f0f0;
                        }
                        .registration-details .label {
                            font-weight: bold;
                            width: 200px;
                        }
                        .light-info-box {
                            border: 2px solid #f59e0b;
                            background: #fef3c7;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 8px;
                        }
                        .light-info-box h4 {
                            margin: 0 0 10px 0;
                            color: #d946a6;
                            font-size: 16px;
                        }
                        .light-details {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 10px;
                        }
                        .light-detail-item {
                            text-align: center;
                            padding: 10px;
                            background: white;
                            border-radius: 4px;
                        }
                        .light-detail-label {
                            font-size: 11px;
                            color: #666;
                            margin-bottom: 5px;
                        }
                        .light-detail-value {
                            font-size: 16px;
                            font-weight: bold;
                            color: #d946a6;
                        }
                        .expiry-warning {
                            background: ${daysRemaining < 30 ? '#fee2e2' : '#dcfce7'};
                            border: 2px solid ${daysRemaining < 30 ? '#ef4444' : '#22c55e'};
                            color: ${daysRemaining < 30 ? '#991b1b' : '#166534'};
                            padding: 10px;
                            text-align: center;
                            font-weight: bold;
                            border-radius: 4px;
                            margin: 15px 0;
                        }
                        .amount-section {
                            margin: 30px 0;
                            border-top: 2px solid #000;
                            padding-top: 15px;
                        }
                        .total-amount {
                            text-align: right;
                            font-size: 16px;
                            font-weight: bold;
                            border: 2px solid #000;
                            padding: 10px;
                            display: inline-block;
                            float: right;
                            margin-top: 10px;
                        }
                        .signature-section {
                            margin-top: 50px;
                            text-align: right;
                        }
                        .clear { clear: both; }
                        .footer-note {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px dashed #ccc;
                            font-size: 12px;
                            color: #666;
                            text-align: center;
                        }
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
                            </div>
                            <div class="clear"></div>
                        </div>
                        
                        <!-- Receipt Title -->
                        <div class="chinese-title"></div>
                        <div class="receipt-title">Auspicious Light Receipt</div>
                        
                        <!-- Registration Details -->
                        <div class="registration-details">
                            <table>
                                <tr>
                                    <td class="label">Receipt No.:</td>
                                    <td><strong>${reg.receipt_number}</strong></td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right; width: 120px;">${this.formatDate(reg.offer_date)}</td>
                                </tr>
                                <tr>
                                    <td class="label">Devotee Name:</td>
                                    <td colspan="3">
                                        <strong>${reg.devotee.name_english}</strong>
                                        ${reg.devotee.name_chinese ? ' / ' + reg.devotee.name_chinese : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">NRIC:</td>
                                    <td>${reg.devotee.nric}</td>
                                    <td class="label" style="text-align: right;">Contact:</td>
                                    <td style="text-align: right;">${reg.devotee.contact_no}</td>
                                </tr>
                                <tr>
                                    <td class="label">Address:</td>
                                    <td colspan="3">${reg.devotee.address || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Light Option:</td>
                                    <td colspan="3"><strong>${lightOptionText}</strong></td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Light Information Box -->
                        <div class="light-info-box">
                            <h4>Light Position Details</h4>
                            <div class="light-details">
                                <div class="light-detail-item">
                                    <div class="light-detail-label">Light Number</div>
                                    <div class="light-detail-value">${reg.light_number}</div>
                                </div>
                                <div class="light-detail-item">
                                    <div class="light-detail-label">Light Code</div>
                                    <div class="light-detail-value" style="font-size: 14px;">${reg.light_code}</div>
                                </div>
                                <div class="light-detail-item">
                                    <div class="light-detail-label">Location</div>
                                    <div class="light-detail-value" style="font-size: 12px;">
                                        Tower ${reg.tower_code}<br>
                                        Block ${reg.block_code}<br>
                                        Floor ${reg.floor_number}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Date Information -->
                        <div class="registration-details">
                            <table>
                                <tr>
                                    <td class="label">Offer Date:</td>
                                    <td>${this.formatDate(reg.offer_date)}</td>
                                    <td class="label" style="text-align: right;">Expiry Date:</td>
                                    <td style="text-align: right;">${this.formatDate(reg.expiry_date)}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Expiry Warning -->
                        <div class="expiry-warning">
                            ${daysRemaining >= 0 ? '?' : '?'} ${daysRemainingText}
                        </div>
                        
                        <!-- Payment Details -->
                        <div class="registration-details">
                            <table>
                                <tr>
                                    <td class="label">Merit Amount:</td>
                                    <td colspan="3">
                                        <strong>SGD ${this.formatCurrency(reg.merit_amount)}</strong>
                                        <br>
                                        <small>(${amountInWords})</small>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Payment Mode:</td>
                                    <td>${reg.payment_method}</td>
                                    <td class="label" style="text-align: right;">Reference:</td>
                                    <td style="text-align: right;">${reg.payment_reference || '-'}</td>
                                </tr>
                                ${reg.remarks ? `
                                <tr>
                                    <td class="label">Remarks:</td>
                                    <td colspan="3">${reg.remarks}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div style="border-bottom: 1px solid #000; width: 200px; float: right; margin-bottom: 5px;"></div>
                            <div style="clear: both; text-align: right; margin-right: 50px;">
                                <strong>Authorized Signature</strong><br>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div class="footer-note">
                            <p>Thank you for your generous merit donation</p>
                            <p>May the blessings of light illuminate your path</p>
                            <p style="margin-top: 10px; font-size: 10px;">
                                Generated on: ${moment().format('DD/MM/YYYY HH:mm:ss')}
                            </p>
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
        
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        numberToWords: function(amount) {
            if (amount === 0) return 'Zero Dollars Only';
            
            const [whole, decimal = '00'] = amount.toFixed(2).split('.');
            let words = this.convertToWords(parseInt(whole));
            
            words = words + ' Dollars';
            if (decimal !== '00') {
                words += ' and ' + decimal + '/100 Cents';
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