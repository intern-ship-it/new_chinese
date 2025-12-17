// js/pages/buddha-lamp/print.js
// Buddha Lamp Booking Receipt Print Page - Dynamic Version

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
        
        cleanup: function() {
            this.bookingId = null;
            this.bookingData = null;
            this.templeSettings = null;
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
                console.error('Print error:', error);
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
                // First check if data was passed via sessionStorage (from create page)
                const tempData = sessionStorage.getItem('temp_booking_data');
                if (tempData) {
                    try {
                        const parsedData = JSON.parse(tempData);
                        // Check if this is the right booking
                        if (parsedData.id === self.bookingId || parsedData.booking_number === self.bookingId) {
                            self.bookingData = self.normalizeBookingData(parsedData);
                            // Clear the temp data after use
                            sessionStorage.removeItem('temp_booking_data');
                            resolve();
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to parse temp booking data:', e);
                    }
                }
                
                // Fetch from API if not in sessionStorage
                TempleAPI.get(`/bookings/buddha-lamp/${self.bookingId}`)
                    .done(function(response) {
                        if (response.success && response.data) {
                            self.bookingData = self.normalizeBookingData(response.data);
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Failed to load booking'));
                        }
                    })
                    .fail(function(xhr) {
                        let errorMessage = 'Error loading booking';
                        if (xhr.status === 404) {
                            errorMessage = 'Booking not found';
                        } else if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                        reject(new Error(errorMessage));
                    });
            });
        },
        
        // Normalize booking data from API response to print format
        normalizeBookingData: function(data) {
            return {
                id: data.id,
                booking_number: data.booking_number,
                booking_code: data.booking_number,
                date: data.booking_date,
                time: this.formatTime(data.created_at),
                customer: {
                    name_chinese: data.name_secondary || '',
                    name_english: data.name_primary || '',
                    nric: data.nric || '',
                    email: data.email || '',
                    contact_no: data.phone_no || ''
                },
                payment_mode: data.payment?.payment_method || data.payment_method || 'Cash',
                payment_reference: data.payment?.payment_reference || '',
                amount: parseFloat(data.total_amount) || 0,
                paid_amount: parseFloat(data.paid_amount) || 0,
                notes: data.special_instructions || data.additional_notes || '',
                booking_status: data.booking_status || 'CONFIRMED',
                payment_status: data.payment_status || 'FULL',
                print_option: data.print_option || 'SINGLE_PRINT',
                created_at: data.created_at,
                created_by: data.created_by?.name || ''
            };
        },
        
        formatTime: function(dateTimeStr) {
            if (!dateTimeStr) return '';
            const date = new Date(dateTimeStr);
            return date.toLocaleTimeString('en-MY', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
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
                                        temple_logo: self.templeSettings.temple_logo || ''
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
            let stored = {};
            try {
                const storageKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE) 
                    ? APP_CONFIG.STORAGE.TEMPLE 
                    : 'temple_settings';
                stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
            } catch (e) {
                console.warn('Failed to parse stored temple settings:', e);
            }
            
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
            
            // Use booking number as receipt number, or generate one
            const receiptNumber = booking.booking_number || this.generateReceiptNumber();
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amountInWords = this.numberToWords(booking.amount);
            
            // Get status badges
            const bookingStatusBadge = this.getBookingStatusBadge(booking.booking_status);
            const paymentStatusBadge = this.getPaymentStatusBadge(booking.payment_status);
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Buddha Lamp Receipt - ${booking.booking_number}</title>
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
                            font-size: 14px;
                        }
                        .btn-primary { background: #007bff; color: white; }
                        .btn-info { background: #17a2b8; color: white; }
                        .btn:hover { opacity: 0.9; }
                        .receipt-container {
                            max-width: 750px;
                            margin: 0 auto;
                            background: white;
                            position: relative;
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
                            color: #555;
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
                            top: 0;
                            right: 0;
                            font-size: 16px;
                            font-weight: bold;
                            color: var(--primary-color);
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                        }
                        .status-confirmed { background: #d4edda; color: #155724; }
                        .status-pending { background: #fff3cd; color: #856404; }
                        .status-completed { background: #cce5ff; color: #004085; }
                        .status-cancelled { background: #f8d7da; color: #721c24; }
                        .status-paid { background: #d4edda; color: #155724; }
                        .status-partial { background: #fff3cd; color: #856404; }
                        .status-unpaid { background: #e2e3e5; color: #383d41; }
                        .merit-dedication {
                            margin: 30px 0;
                            padding: 15px;
                            border: 1px solid #dee2e6;
                            background: #f8f9fa;
                            text-align: center;
                        }
                        .footer-note {
                            margin-top: 40px;
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                        }
                        @media print {
                            .btn, #controlButtons { display: none !important; }
                            body { margin: 0; padding: 10px; }
                            .receipt-container { max-width: 100%; }
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
                                <div>${[temple.temple_city, temple.temple_state, temple.temple_pincode].filter(Boolean).join(' ')}</div>
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
                            <div class="blessing-icon">☸</div>
                            <div><strong>May the Buddha's Light illuminate your path</strong></div>
                            <div><em>愿佛光普照，福慧双修</em></div>
                        </div>
                        
                        <!-- Booking Details -->
                        <div class="booking-details">
                            <table>
                                <tr>
                                    <td class="label">Booking No:</td>
                                    <td><strong>${booking.booking_number || '-'}</strong></td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right; width: 120px;">${this.formatDate(booking.date)}</td>
                                </tr>
                                <tr>
                                    <td class="label">Status:</td>
                                    <td colspan="3">
                                        ${bookingStatusBadge}
                                        ${paymentStatusBadge}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Devotee Name (Chinese):</td>
                                    <td colspan="3"><strong style="font-size: 16px;">${booking.customer.name_chinese || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">Devotee Name (English):</td>
                                    <td colspan="3"><strong>${booking.customer.name_english || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td class="label">NRIC:</td>
                                    <td>${this.maskNRIC(booking.customer.nric) || '-'}</td>
                                    <td class="label" style="text-align: right;">Contact:</td>
                                    <td style="text-align: right;">${booking.customer.contact_no || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Email:</td>
                                    <td colspan="3">${booking.customer.email || '-'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Offering for:</td>
                                    <td colspan="3">Buddha Lamp Light Offering 佛前灯供奉</td>
                                </tr>
                                ${booking.notes ? `
                                <tr>
                                    <td class="label">Purpose / Notes:</td>
                                    <td colspan="3">${booking.notes}</td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td class="label">Payment Mode:</td>
                                    <td>${booking.payment_mode || 'Cash'}</td>
                                    <td class="label" style="text-align: right;">Payment Ref:</td>
                                    <td style="text-align: right;">${booking.payment_reference || '-'}</td>
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
                        <div class="merit-dedication">
                            <div style="font-weight: bold; margin-bottom: 10px;">Merit Dedication 功德回向</div>
                            <div style="font-size: 14px; color: #666;">
                                May the merit from this offering bring peace, happiness, and wisdom to all beings<br>
                                <em>愿此功德，普及一切，我等众生，皆共成佛</em>
                            </div>
                        </div>
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div style="border-bottom: 1px solid #000; width: 200px; float: right; margin-bottom: 5px;"></div>
                            <div style="clear: both; text-align: right; margin-right: 50px;">
                                <strong>Temple Administrator</strong><br>
                                <small>Receiver 收款人</small>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div class="footer-note">
                            <div>Thank you for your devotion and support to the temple</div>
                            <div>感谢您对寺庙的虔诚奉献与支持</div>
                            <div style="margin-top: 10px; font-size: 11px; color: #999;">
                                This is a computer-generated receipt. | 此为电脑生成收据<br>
                                ${booking.created_by ? `Processed by: ${booking.created_by} | ` : ''}
                                Printed on: ${this.formatDateTime(new Date())}
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Auto focus print dialog
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
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
                        TEMPLE<br>LOGO
                    </div>`;
            }
             
            return logoHTML;
        },
        
        getBookingStatusBadge: function(status) {
            const statusMap = {
                'CONFIRMED': '<span class="status-badge status-confirmed">Confirmed 已确认</span>',
                'PENDING': '<span class="status-badge status-pending">Pending 待处理</span>',
                'COMPLETED': '<span class="status-badge status-completed">Completed 已完成</span>',
                'CANCELLED': '<span class="status-badge status-cancelled">Cancelled 已取消</span>'
            };
            return statusMap[status] || `<span class="status-badge">${status}</span>`;
        },
        
        getPaymentStatusBadge: function(status) {
            const statusMap = {
                'FULL': '<span class="status-badge status-paid">Paid 已付款</span>',
                'PARTIAL': '<span class="status-badge status-partial">Partial 部分付款</span>',
                'PENDING': '<span class="status-badge status-unpaid">Unpaid 未付款</span>'
            };
            return statusMap[status] || '';
        },
        
        maskNRIC: function(nric) {
            if (!nric) return '';
            // Mask the middle portion of NRIC for privacy
            if (nric.length > 8) {
                return nric.substring(0, 6) + '****' + nric.substring(nric.length - 4);
            }
            return nric;
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
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },
        
        formatDateTime: function(date) {
            if (!date) return '-';
            return `${this.formatDate(date)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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