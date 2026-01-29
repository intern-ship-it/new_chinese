// js/pages/rom-booking/print.js
// ROM Booking Receipt Print Page - DYNAMIC VERSION

(function($, window) {
    'use strict';
    
    window.RomBookingPrintPage = {
        bookingId: null,
        bookingData: null,
        templeSettings: null,
        
        init: function(params) {
            this.bookingId = params.id;
            
            if (!this.bookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                TempleRouter.navigate('rom-booking');
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
                TempleRouter.navigate('rom-booking');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadBookingData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get(`/rom-booking/${self.bookingId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.bookingData = response.data;
                            console.log('Booking data loaded:', self.bookingData);
                            resolve();
                        } else {
                            reject(new Error('Failed to load booking'));
                        }
                    })
                    .fail(function(error) {
                        console.error('Failed to load booking:', error);
                        reject(new Error('Error loading booking'));
                    });
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
                                if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE) {
                                    localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify({
                                        name: self.templeSettings.temple_name || '',
                                        address: self.templeSettings.temple_address || '',
                                        city: self.templeSettings.temple_city || '',
                                        state: self.templeSettings.temple_state || '',
                                        pincode: self.templeSettings.temple_pincode || '',
                                        country: self.templeSettings.temple_country || 'Malaysia',
                                        phone: self.templeSettings.temple_phone || '',
                                        email: self.templeSettings.temple_email || '',
                                        logo: self.templeSettings.temple_logo || ''
                                    }));
                                }
                                
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
                temple_logo: stored.logo || ''
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
            
            // Navigate back to rom-booking list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('rom-booking');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const booking = this.bookingData;
            const temple = this.templeSettings;
            
            // Generate token number based on date
            const tokenNumber = this.generateTokenNumber(booking.booking_date);
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amountInWords = this.numberToWords(booking.total_amount);
            
            // Get couple names
            const coupleNames = this.getCoupleNames(booking.couples);
            
            // Get payment info
            const paymentInfo = this.getPaymentInfo(booking.payments);
            
            // Format date and time
            const bookingDate = this.formatDate(booking.booking_date);
            const bookingTime = booking.session?.from_time || '09:00 AM';
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>ROM Booking Receipt - ${booking.booking_number}</title>
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
                        .booking-details {
                            margin: 20px 0;
                        }
                        .booking-details table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .booking-details td {
                            padding: 5px;
                            font-size: 14px;
                            border-bottom: 1px solid #f0f0f0;
                        }
                        .booking-details .label {
                            font-weight: bold;
                            width: 150px;
                        }
                        .token-circle {
                            top: 180px;
                            right: 20px;
                            width: 80px;
                            height: 80px;
                            border: 2px solid #000;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            font-weight: bold;
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
                        .reference-section {
                            margin-top: 40px;
                            clear: both;
                        }
                        .signature-section {
                            margin-top: 50px;
                            text-align: right;
                        }
                        .clear { clear: both; }
                        .token_no {
                            width: 80px;
                            text-align: center;
                            font-weight: bold;
                            font-size: 18px;
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
                                ${temple.temple_website ? `<div>Website: ${temple.temple_website}</div>` : ''}
                            </div>
                            <div class="clear"></div>
                        </div>
                        
                        <!-- Receipt Title -->
                        <div class="receipt-title">Official Receipt</div>
                        
                        <!-- Direct Lines (Phone Numbers) -->
                        <div style="text-align: center; font-size: 14px; margin: 10px 0;">
                            Marriage Registration Direct Lines : 03-2273 7882 / 03-2273 9419
                        </div>
                        
                        <!-- Booking Details -->
                        <div class="booking-details">
                            <table>
                                <tr>
                                    <td class="label">No:</td>
                                    <td>${booking.booking_number || '-'}</td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right; width: 100px;">${bookingDate}</td>
                                </tr>
                                <tr>
                                    <td class="label">Registration Date / Time:</td>
                                    <td colspan="2">${bookingDate} &nbsp;&nbsp; ${bookingTime}</td>
                                    <td rowspan="3">
                                        <div class="token_no">Number</div>
                                        <div class="token-circle">
                                           <div style="text-align: center;">
                                                <div style="font-size: 32px; margin: 5px 0;">${tokenNumber}</div>
                                           </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Received from:</td>
                                    <td colspan="2">
                                        ${coupleNames}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Being payment of:</td>
                                    <td colspan="2">Marriage Registration Fee</td>
                                </tr>
                                <tr>
                                    <td class="label">The sum of Ringgit:</td>
                                    <td colspan="3">${amountInWords}</td>
                                </tr>
                                <tr>
                                    <td class="label">Amount:</td>
                                    <td><strong>RM ${this.formatCurrency(booking.total_amount)}</strong></td>
                                    <td class="label" style="text-align: right;">Payment Mode:</td>
                                    <td style="text-align: right;">${paymentInfo.mode}</td>
                                </tr>
                                <tr>
                                    <td class="label">Cash/Cheque No:</td>
                                    <td>${paymentInfo.reference || '_________________'}</td>
                                    <td class="label" style="text-align: right;">Session:</td>
                                    <td style="text-align: right;">${booking.session?.name_primary || 'AM'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Duty/Row Refer No:</td>
                                    <td>${paymentInfo.reference || '-'}</td>
                                    <td class="label" style="text-align: right;">Venue:</td>
                                    <td style="text-align: right;">${booking.venue?.name_primary || 'Main Hall'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div style="border-bottom: 1px solid #000; width: 200px; float: right; margin-bottom: 5px;"></div>
                            <div style="clear: both; text-align: right; margin-right: 50px;">
                                <strong>MATH</strong><br>
                                <small>Receiver</small>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Auto focus print dialog
                        window.onload = function() {
                            setTimeout(() => {
                                // Auto-print can be uncommented if needed
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
                logoHTML = `<div class="temple-logo"><img src="${this.templeSettings.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" /></div>`;
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
                    </div>
                `;
            }
            
            return logoHTML;
        },
        
        getCoupleNames: function(couples) {
            if (!couples || couples.length === 0) {
                return 'N/A';
            }
            
            return couples.map(couple => {
                const groom = couple.groom?.name || 'N/A';
                const bride = couple.bride?.name || 'N/A';
                return `<strong>${groom}</strong><br><strong>${bride}</strong>`;
            }).join('<br>');
        },
        
        getPaymentInfo: function(payments) {
            if (!payments || payments.length === 0) {
                return {
                    mode: 'Cash',
                    reference: ''
                };
            }
            
            const payment = payments[0]; // Get first payment
            return {
                mode: payment.payment_mode?.name || payment.payment_method || 'Cash',
                reference: payment.payment_reference || ''
            };
        },
        
        generateTokenNumber: function(bookingDate) {
            // Generate a simple token based on date
            // You can customize this logic based on your requirements
            const date = new Date(bookingDate);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString().substr(-2);
            
            // Simple counter - in production, this should come from database
            const counter = Math.floor(Math.random() * 9999) + 1;
            
            return counter.toString().padStart(4, '0');
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
            const [whole, decimal = '00'] = parseFloat(amount).toFixed(2).split('.');
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