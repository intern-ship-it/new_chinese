// js/pages/special-occasions/receipt/print.js
// Special Occasions Receipt Print Page

(function($, window) {
    'use strict';
    
    window.SpecialOccasionsPrintPage = {
        bookingId: null,
        bookingData: null,
        templeSettings: null,
        
        init: function(params) {
            this.bookingId = params?.id;
            
            if (!this.bookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                TempleRouter.navigate('special-occasions');
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
                TempleRouter.navigate('special-occasions');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadBookingData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Simulate loading booking data (replace with actual API call)
                setTimeout(() => {
                    const today = new Date();
                    
                    // Sample booking data - replace with actual API call
                    self.bookingData = {
                        id: self.bookingId,
                        booking_code: `SO${today.getFullYear()}${String(self.bookingId).padStart(4, '0')}`,
                        booking_date: today.toISOString().split('T')[0],
                        special_occasion_id: 2,
                        occasion_name: 'Guanyin Bodhisattva',
                        occasion_option: 'Premium Package',
                        occasion_amount: 288.00,
                        name_chinese: '',
                        name_english: 'Li Ming Hua',
                        nric: '850123-10-5678',
                        email: 'liminghua@example.com',
                        contact_no: '+60123456789',
                        payment_methods: 'Cash',
                        status: 'confirmed',
                        remark: 'Special blessing ceremony',
                        created_at: today.toISOString()
                    };
                    resolve();
                }, 500);
                
                // Actual API implementation:
                /*
                TempleAPI.get(`/special-occasions/bookings/${this.bookingId}`)
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
                                    logo: self.templeSettings.temple_logo || ''
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
            
            // Navigate back to special-occasions list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('special-occasions');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const booking = this.bookingData;
            const temple = this.templeSettings;
            
            // Generate receipt number
            const receiptNumber = this.generateReceiptNumber(booking.booking_code);
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amountInWords = this.numberToWords(booking.occasion_amount);
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Special Occasion Receipt - ${booking.booking_code}</title>
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
                            color: #333;
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
                            color: #333;
                        }
                        .receipt-subtitle {
                            text-align: center;
                            font-size: 18px;
                            color: #666;
                            margin: -10px 0 20px 0;
                        }
                        .receipt-number {
                            text-align: right;
                            font-size: 16px;
                            font-weight: bold;
                            margin-bottom: 20px;
                            color: #007bff;
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
                        }
                        .booking-details .label {
                            font-weight: bold;
                            width: 180px;
                            color: #555;
                        }
                        .section-header {
                            background: #f8f9fa;
                            padding: 10px;
                            margin: 20px 0 10px 0;
                            font-weight: bold;
                            border-left: 4px solid #007bff;
                            color: #333;
                        }
                        .amount-section {
                            margin: 30px 0;
                            padding: 20px;
                            background: #f8f9fa;
                            border: 2px solid #dee2e6;
                            border-radius: 8px;
                        }
                        .amount-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 10px;
                        }
                        .amount-label {
                            font-size: 16px;
                            font-weight: bold;
                            color: #555;
                        }
                        .amount-value {
                            font-size: 24px;
                            font-weight: bold;
                            color: #28a745;
                        }
                        .amount-words {
                            font-size: 14px;
                            color: #666;
                            font-style: italic;
                            margin-top: 5px;
                        }
                        .signature-section {
                            margin-top: 50px;
                            display: flex;
                            justify-content: space-between;
                        }
                        .signature-box {
                            width: 45%;
                            text-align: center;
                        }
                        .signature-line {
                            border-bottom: 2px solid #000;
                            margin-bottom: 10px;
                            height: 60px;
                        }
                        .signature-label {
                            font-weight: bold;
                            color: #555;
                        }
                        .footer-note {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 2px solid #dee2e6;
                            text-align: center;
                            font-size: 12px;
                            color: #999;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 4px 12px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .status-confirmed {
                            background: #d4edda;
                            color: #155724;
                        }
                        .status-pending {
                            background: #fff3cd;
                            color: #856404;
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
                        </div>
                        
                        <!-- Receipt Title -->
                        <div class="receipt-title">Official Receipt</div>
                        <div class="receipt-subtitle">Special Occasions Booking</div>
                        
                        <!-- Receipt Number -->
                        <div class="receipt-number">Receipt No: ${receiptNumber}</div>
                        
                        <!-- Booking Information Section -->
                        <div class="section-header">Booking Information</div>
                        <div class="booking-details">
                            <table>
                                <tr>
                                    <td class="label">Booking Code:</td>
                                    <td><strong>${booking.booking_code || '-'}</strong></td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right;">${this.formatDate(booking.booking_date)}</td>
                                </tr>
                                <tr>
                                    <td class="label">Status:</td>
                                    <td colspan="3">
                                        <span class="status-badge status-${booking.status}">
                                            ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Personal Information Section -->
                        <div class="section-header">Personal Information</div>
                        <div class="booking-details">
                            <table>
                                <tr>
                                    <td class="label">Name (Chinese):</td>
                                    <td colspan="3"><strong>${booking.name_chinese || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">Name (English):</td>
                                    <td colspan="3"><strong>${booking.name_english || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">NRIC No.:</td>
                                    <td>${booking.nric || '-'}</td>
                                    <td class="label" style="text-align: right;">Contact:</td>
                                    <td style="text-align: right;">${booking.contact_no || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Email:</td>
                                    <td colspan="3">${booking.email || '-'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Occasion Details Section -->
                        <div class="section-header">Occasion Details</div>
                        <div class="booking-details">
                            <table>
                                <tr>
                                    <td class="label">Occasion Type:</td>
                                    <td colspan="3"><strong>${booking.occasion_name || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">Selected Option:</td>
                                    <td colspan="3">${booking.occasion_option || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Payment Method:</td>
                                    <td colspan="3">${booking.payment_methods || '-'}</td>
                                </tr>
                                ${booking.remark ? `
                                <tr>
                                    <td class="label">Remarks:</td>
                                    <td colspan="3">${booking.remark}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        
                        <!-- Amount Section -->
                        <div class="amount-section">
                            <div class="amount-row">
                                <span class="amount-label">Total Amount:</span>
                                <span class="amount-value">RM ${this.formatCurrency(booking.occasion_amount)}</span>
                            </div>
                            <div class="amount-words">
                                In Words : ${amountInWords}
                            </div>
                        </div>
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <div class="signature-label">Customer Signature</div>
                                <div style="font-size: 11px; color: #999; margin-top: 5px;">
                                    ${booking.name_english || 'Customer Name'}
                                </div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <div class="signature-label">Authorized By </div>
                                <div style="font-size: 11px; color: #999; margin-top: 5px;">
                                    Temple Staff
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div class="footer-note">
                            <p><strong>Thank you for your booking!</strong></p>
                            <p>This is a computer-generated receipt. No signature is required.</p>
                            <p>Generated on: ${new Date().toLocaleString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</p>
                            <p>${temple.temple_name || 'Temple Name'} - Special Occasions Management System</p>
                        </div>
                    </div>
                    
                    <script>
                        // Auto focus print dialog (optional)
                        window.onload = function() {
                            // Uncomment to auto-print on load
                            // setTimeout(() => {
                            //     window.print();
                            // }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
        },
        
        getTempleLogoHTML: function() {
            let logoHTML = '';
            
            if (this.templeSettings.temple_logo) {
                // Assuming temple_logo contains the path or URL
                logoHTML = `
                    <div class="temple-logo">
                        <img src="${this.templeSettings.temple_logo}" 
                             style="width: 205px; height: 120px; object-fit: contain;" 
                             alt="Temple Logo" />
                    </div>
                `;
            } else {
                // Fallback to placeholder
                logoHTML = `
                    <div class="temple-logo" style="
                        width: 120px; 
                        height: 120px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        border-radius: 12px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: white; 
                        font-size: 14px;
                        font-weight: bold;
                        text-align: center;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    ">
                        TEMPLE<br>LOGO
                    </div>
                `;
            }
            
            return logoHTML;
        },
        
        generateReceiptNumber: function(bookingCode) {
            // Generate receipt number based on booking code and timestamp
            const timestamp = new Date().getTime().toString().slice(-6);
            return `RCP-${bookingCode}-${timestamp}`;
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