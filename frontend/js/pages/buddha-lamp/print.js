// js/pages/buddha-lamp/receipt/print.js
// Buddha Lamp Booking Receipt Print Page

(function($, window) {
    'use strict';
    
    window.BuddhaLampPrintPage = {
        bookingId: null,
        bookingData: null,
        templeSettings: null,
        
        init: function(params) {
            this.bookingId = params?.id;
            
            if (!this.bookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                TempleRouter.navigate('buddha-lamp');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load both booking data and temple settings
            Promise.all([
                this.loadBookingData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('buddha-lamp');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadBookingData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Simulate loading Buddha Lamp booking data (replace with actual API call)
                setTimeout(() => {
                    // Sample booking data - replace with actual API call
                    self.bookingData = {
                        id: self.bookingId,
                        booking_code: 'BL' + String(Math.floor(Math.random() * 90000) + 10000),
                        date: new Date().toISOString().split('T')[0],
                        time: '10:00 AM',
                        customer: {
                            name_chinese: '',
                            name_english: 'Li Ming Hua',
                            nric: '******-**-1234',
                            email: 'li.minghua@email.com',
                            contact_no: '+60 12-345 6789'
                        },
                        payment_mode: 'Cash',
                        amount: 5000.00,
                        notes: 'Buddha Lamp Offering for Family Blessing',
                        status: 'Confirmed',
                        reference_no: '902864(11.01)',
                        created_at: new Date().toISOString()
                    };
                    resolve();
                }, 500);
                
                // Actual API implementation:
                /*
                TempleAPI.get(`/buddha-lamp/${this.bookingId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.bookingData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load booking'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading booking'));
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
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print receipt', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to buddha-lamp list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('buddha-lamp');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const booking = this.bookingData;
            const temple = this.templeSettings;
            
            // Generate receipt number
            const receiptNumber = this.generateReceiptNumber();
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amountInWords = this.numberToWords(booking.amount);
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Buddha Lamp Receipt - ${booking.booking_code}</title>
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
                        .receipt-title {
                            text-align: center;
                            font-size: 28px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin: 20px 0;
                            border-top: 2px solid #c2c2c2;
                            border-bottom: 2px solid #c2c2c2;
                            padding: 15px 0;
                            color: var(--primary-color);
                        }
                        .booking-details {
                            margin: 20px 0;
                        }
                        .booking-details table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .booking-details td {
                            padding: 8px 5px;
                            font-size: 14px;
                            border-bottom: 1px solid #f0f0f0;
                            vertical-align: top;
                        }
                        .booking-details .label {
                            font-weight: bold;
                            width: 180px;
                        }
                        .amount-section {
                            margin: 30px 0;
                            border: 2px solid var(--primary-color);
                            padding: 15px;
                            background: #fff9f5;
                        }
                        .total-amount {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            color: var(--primary-color);
                            margin: 10px 0;
                        }
                        .signature-section {
                            margin-top: 50px;
                            text-align: right;
                        }
                        .clear { clear: both; }
                        .blessing-section {
                            text-align: center;
                            margin: 30px 0;
                            padding: 15px;
                            background: #f8f9fa;
                            border-left: 4px solid var(--primary-color);
                        }
                        .blessing-icon {
                            font-size: 2rem;
                            color: var(--primary-color);
                            margin-bottom: 10px;
                        }
                        .receipt-number {
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            font-size: 18px;
                            font-weight: bold;
                            color: var(--primary-color);
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
                        <!-- Receipt Number -->
                        <div class="receipt-number">Receipt #${receiptNumber}</div>
                        
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
                            <div class="clear"></div>
                        </div>
                        
                        <!-- Receipt Title -->
                        <div class="receipt-title">Buddha Lamp Offering Receipt</div>
                        
                        <!-- Blessing Section -->
                        <div class="blessing-section">
                            <div class="blessing-icon"></div>
                            <div><strong>May the Buddha's Light illuminate your path</strong></div>
                            <div><em></em></div>
                        </div>
                        
                        <!-- Booking Details -->
                        <div class="booking-details">
                            <table>
                                <tr>
                                    <td class="label">Booking No:</td>
                                    <td><strong>${booking.booking_code || '-'}</strong></td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right; width: 120px;">${this.formatDate(booking.date)}</td>
                                </tr>
                                <tr>
                                    <td class="label">Devotee Name (Chinese):</td>
                                    <td colspan="3"><strong>${booking.customer.name_chinese || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">Devotee Name (English):</td>
                                    <td colspan="3"><strong>${booking.customer.name_english || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">NRIC:</td>
                                    <td>${booking.customer.nric || '-'}</td>
                                    <td class="label" style="text-align: right;">Contact:</td>
                                    <td style="text-align: right;">${booking.customer.contact_no || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Email:</td>
                                    <td colspan="3">${booking.customer.email || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Offering for:</td>
                                    <td colspan="3">Buddha Lamp Light Offering</td>
                                </tr>
                                <tr>
                                    <td class="label">Purpose:</td>
                                    <td colspan="3">${booking.notes || 'Family blessing and merit accumulation'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Payment Mode:</td>
                                    <td>${booking.payment_mode || 'Cash'}</td>
                                    <td class="label" style="text-align: right;">Reference:</td>
                                    <td style="text-align: right;">${booking.reference_no || '-'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Amount Section -->
                        <div class="amount-section">
                            <table width="100%">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <div><strong>Amount in Words:</strong></div>
                                        <div style="font-size: 16px; margin-top: 5px;">${amountInWords}</div>
                                    </td>
                                    <td style="text-align: right; vertical-align: middle; width: 200px;">
                                        <div class="total-amount">
                                            RM ${this.formatCurrency(booking.amount)}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Merit Dedication -->
                        <div style="margin: 30px 0; padding: 15px; border: 1px solid #dee2e6; background: #f8f9fa;">
                            <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">Merit Dedication</div>
                            <div style="text-align: center; font-size: 14px; color: #666;">
                                May the merit from this offering bring peace, happiness, and wisdom to all beings<br>
                                <em></em>
                            </div>
                        </div>
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div style="border-bottom: 1px solid #000; width: 200px; float: right; margin-bottom: 5px;"></div>
                            <div style="clear: both; text-align: right; margin-right: 50px;">
                                <strong>Temple Administrator</strong><br>
                                <small>Receiver</small>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                            <div>Thank you for your devotion and support to the temple</div>
                            <div style="margin-top: 5px;">This is a computer-generated receipt.</div>
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
        
        generateReceiptNumber: function() {
            // Generate receipt number with current date + time
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
            const timeStr = now.getHours().toString().padStart(2, '0') + 
                          now.getMinutes().toString().padStart(2, '0');
            return `BL${dateStr}${timeStr}`;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        numberToWords: function(amount) {
            if (amount === 0) return 'Zero Ringgit Only';
            
            // Split into whole and decimal parts
            const [whole, decimal = '00'] = amount.toFixed(2).split('.');
            let words = this.convertToWords(parseInt(whole));
            
            // Add currency
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