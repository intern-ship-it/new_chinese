// js/pages/special-occasions/receipt/print.js
// Special Occasions Receipt Print Page - Dynamic Version

(function($, window) {
    'use strict';
    
    window.SpecialOccasionsPrintPage = {
        bookingId: null,
        bookingData: null,
        slotData: null,
        packageData: null,
        templeSettings: null,
        
        init: function(params) {
            this.bookingId = params?.id;
            
            if (!this.bookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                TempleRouter.navigate('special-occasions/create');
                return;
            }
            
            this.render();
            this.loadAndPrint();
        },
        
        render: function() {
            // Show loading state while fetching data
            const html = `
                <div class="container-fluid py-5">
                    <div class="row justify-content-center">
                        <div class="col-md-6 text-center">
                            <div class="card shadow-sm">
                                <div class="card-body py-5">
                                    <div class="spinner-border text-primary mb-3" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <h5>Preparing Receipt...</h5>
                                    <p class="text-muted">Please wait while we generate your receipt.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
        },
        
        loadAndPrint: function() {
            const self = this;
            
            // Load both booking data and temple settings
            Promise.all([
                this.loadBookingData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                console.error('Error loading data:', error);
                TempleCore.showToast(error.message || 'Error loading booking data', 'error');
                setTimeout(() => {
                    TempleRouter.navigate('special-occasions/create');
                }, 1500);
            });
        },
        
        loadBookingData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get(`/special-occasions/bookings/${this.bookingId}`)
                    .done(function(response) {
                        if (response.success && response.data) {
                            self.bookingData = response.data;
                            
                            // Load slot data if slot_id exists
                            if (self.bookingData.slot_id) {
                                self.loadSlotData(self.bookingData.slot_id)
                                    .then(resolve)
                                    .catch(resolve); // Continue even if slot load fails
                            } else {
                                resolve();
                            }
                        } else {
                            reject(new Error('Booking not found'));
                        }
                    })
                    .fail(function(xhr) {
                        const error = xhr.responseJSON?.message || 'Failed to load booking';
                        reject(new Error(error));
                    });
            });
        },
        
        loadSlotData: function(slotId) {
            const self = this;
            return new Promise((resolve, reject) => {
                // Try to get slot info from the booking's option
                if (self.bookingData.option_id) {
                    TempleAPI.get('/special-occasions/bookings/slots', {
                        option_id: self.bookingData.option_id,
                        event_date: self.bookingData.event_date
                    })
                    .done(function(response) {
                        if (response.success && response.data) {
                            // Find the matching slot
                            self.slotData = response.data.find(s => s.id == slotId);
                        }
                        resolve();
                    })
                    .fail(function() {
                        resolve(); // Continue even if fails
                    });
                } else {
                    resolve();
                }
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
            let stored = {};
            try {
                if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE) {
                    stored = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                }
            } catch (e) {
                stored = {};
            }
            
            this.templeSettings = {
                temple_name: stored.name || 'Chinese Temple Management System',
                temple_address: stored.address || '',
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
            const printWindow = window.open('', '_blank', 'width=850,height=700');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print receipt', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to booking page after opening print window
            setTimeout(() => {
                TempleRouter.navigate('special-occasions/create');
            }, 500);
        },
        
        generatePrintHTML: function() {
            const booking = this.bookingData;
            const temple = this.templeSettings;
            const slot = this.slotData;
            
            // Generate receipt number
            const receiptNumber = booking.receipt_number || this.generateReceiptNumber(booking.booking_code);
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amount = parseFloat(booking.occasion_amount || booking.amount_paid || 0);
            const amountInWords = this.numberToWords(amount);
            
            // Format slot display
            const slotDisplay = slot 
                ? `${slot.slot_name} (${slot.start_time} - ${slot.end_time})`
                : (booking.slot_id ? 'Time Slot #' + booking.slot_id : 'N/A');
            
            // Format event date
            const eventDate = booking.event_date ? this.formatDate(booking.event_date) : '-';
            const bookingDate = booking.booking_date ? this.formatDate(booking.booking_date) : this.formatDate(booking.created_at);
            
            // Payment method display
            const paymentMethod = this.formatPaymentMethod(booking.payment_methods);
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt - ${booking.booking_code}</title>
                    <meta charset="utf-8">
                    <style>
                        * { box-sizing: border-box; }
                        body { 
                            font-family: 'Segoe UI', Arial, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            background: #f5f5f5;
                            line-height: 1.5;
                            color: #333;
                        }
                        .btn {
                            padding: 10px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            margin: 0 5px;
                            transition: all 0.2s;
                        }
                        .btn-primary { background: #8B0000; color: white; }
                        .btn-primary:hover { background: #6B0000; }
                        .btn-info { background: #17a2b8; color: white; }
                        .btn-info:hover { background: #138496; }
                        .receipt-container {
                            max-width: 800px;
                            margin: 0 auto;
                            background: white;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        .header-section {
                            background: linear-gradient(135deg, #8B0000, #CD5C5C);
                            color: white;
                            padding: 25px 30px;
                            display: flex;
                            align-items: center;
                        }
                        .temple-logo {
                            margin-right: 20px;
                            flex-shrink: 0;
                        }
                        .temple-logo img {
                            width: 100px;
                            height: 100px;
                            object-fit: contain;
                            background: white;
                            border-radius: 8px;
                            padding: 5px;
                        }
                        .temple-info {
                            font-size: 13px;
                            line-height: 1.6;
                        }
                        .temple-name {
                            font-size: 22px;
                            font-weight: bold;
                            margin-bottom: 8px;
                        }
                        .receipt-title-bar {
                            background: #f8f9fa;
                            padding: 15px 30px;
                            border-bottom: 3px solid #ffc107;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .receipt-title {
                            font-size: 20px;
                            font-weight: bold;
                            color: #8B0000;
                            text-transform: uppercase;
                        }
                        .booking-code {
                            background: #28a745;
                            color: white;
                            padding: 8px 20px;
                            border-radius: 5px;
                            font-weight: bold;
                            font-size: 16px;
                        }
                        .receipt-body {
                            padding: 30px;
                        }
                        .section-header {
                            background: linear-gradient(135deg, #8B0000, #a52a2a);
                            color: white;
                            padding: 10px 15px;
                            margin: 20px 0 15px 0;
                            font-weight: bold;
                            font-size: 14px;
                            border-radius: 5px;
                        }
                        .section-header:first-child {
                            margin-top: 0;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 15px;
                        }
                        .info-item {
                            padding: 10px;
                            background: #f8f9fa;
                            border-radius: 5px;
                            border-left: 3px solid #8B0000;
                        }
                        .info-item label {
                            display: block;
                            font-size: 11px;
                            color: #666;
                            text-transform: uppercase;
                            margin-bottom: 3px;
                        }
                        .info-item span {
                            font-size: 14px;
                            font-weight: 500;
                            color: #333;
                        }
                        .info-item.full-width {
                            grid-column: 1 / -1;
                        }
                        .amount-section {
                            margin: 30px 0;
                            padding: 25px;
                            background: linear-gradient(135deg, #fff3cd, #ffeeba);
                            border: 2px solid #ffc107;
                            border-radius: 10px;
                            text-align: center;
                        }
                        .amount-label {
                            font-size: 14px;
                            color: #856404;
                            text-transform: uppercase;
                            margin-bottom: 5px;
                        }
                        .amount-value {
                            font-size: 36px;
                            font-weight: bold;
                            color: #28a745;
                        }
                        .amount-words {
                            font-size: 13px;
                            color: #666;
                            font-style: italic;
                            margin-top: 10px;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 5px 15px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .status-confirmed { background: #d4edda; color: #155724; }
                        .status-pending { background: #fff3cd; color: #856404; }
                        .status-completed { background: #cce5ff; color: #004085; }
                        .status-cancelled { background: #f8d7da; color: #721c24; }
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
                            border-bottom: 2px solid #333;
                            margin-bottom: 10px;
                            height: 50px;
                        }
                        .signature-label {
                            font-weight: bold;
                            color: #555;
                            font-size: 13px;
                        }
                        .footer-note {
                            margin-top: 40px;
                            padding: 20px;
                            background: #f8f9fa;
                            border-top: 2px solid #dee2e6;
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                        }
                        .footer-note p { margin: 5px 0; }
                        .footer-note .thank-you {
                            color: #8B0000;
                            font-size: 16px;
                            font-weight: bold;
                            margin-bottom: 15px;
                        }
                        .control-buttons {
                            max-width: 800px;
                            margin: 0 auto 20px auto;
                            text-align: right;
                        }
                        @media print {
                            body { background: white; padding: 0; margin: 0; }
                            .control-buttons { display: none !important; }
                            .receipt-container { box-shadow: none; border-radius: 0; }
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <div class="control-buttons">
                        <button class="btn btn-primary" onclick="window.close()">
                            ← Close
                        </button>
                        <button class="btn btn-info" onclick="window.print()">
                            🖨️ Print Receipt
                        </button>
                    </div>
                    
                    <div class="receipt-container">
                        <!-- Header Section -->
                        <div class="header-section">
                            ${logoHTML}
                            <div class="temple-info">
                                <div class="temple-name">${temple.temple_name || 'Temple Name'}</div>
                                ${temple.temple_address ? `<div>${temple.temple_address}</div>` : ''}
                                ${(temple.temple_city || temple.temple_state || temple.temple_pincode) ? 
                                    `<div>${[temple.temple_city, temple.temple_state, temple.temple_pincode].filter(Boolean).join(', ')}</div>` : ''}
                                ${temple.temple_country ? `<div>${temple.temple_country}</div>` : ''}
                                ${temple.temple_phone ? `<div>Tel: ${temple.temple_phone}</div>` : ''}
                                ${temple.temple_email ? `<div>Email: ${temple.temple_email}</div>` : ''}
                            </div>
                        </div>
                        
                        <!-- Receipt Title Bar -->
                        <div class="receipt-title-bar">
                            <div class="receipt-title">Official Receipt - Special Occasion Booking</div>
                            <div class="booking-code">${booking.booking_code}</div>
                        </div>
                        
                        <!-- Receipt Body -->
                        <div class="receipt-body">
                            <!-- Booking Information -->
                            <div class="section-header">📋 Booking Information</div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Receipt No.</label>
                                    <span>${receiptNumber}</span>
                                </div>
                                <div class="info-item">
                                    <label>Booking Date</label>
                                    <span>${bookingDate}</span>
                                </div>
                                <div class="info-item">
                                    <label>Status</label>
                                    <span><span class="status-badge status-${booking.status}">${this.capitalizeFirst(booking.status)}</span></span>
                                </div>
                                <div class="info-item">
                                    <label>Payment Method</label>
                                    <span>${paymentMethod}</span>
                                </div>
                            </div>
                            
                            <!-- Event Details -->
                            <div class="section-header">🎋 Event Details</div>
                            <div class="info-grid">
                                <div class="info-item full-width">
                                    <label>Temple Event</label>
                                    <span style="font-size: 16px;">${booking.occasion_name || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Package Selected</label>
                                    <span>${booking.occasion_option || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Event Date</label>
                                    <span style="color: #8B0000; font-weight: bold;">${eventDate}</span>
                                </div>
                                <div class="info-item full-width">
                                    <label>Time Slot</label>
                                    <span>${slotDisplay}</span>
                                </div>
                            </div>
                            
                            <!-- Personal Information -->
                            <div class="section-header">👤 Devotee Information</div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Name (Chinese)</label>
                                    <span style="font-size: 16px;">${booking.name_chinese || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Name (English)</label>
                                    <span style="font-size: 16px;">${booking.name_english || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <label>NRIC / Passport</label>
                                    <span>${booking.nric || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Contact No.</label>
                                    <span>${booking.contact_no || '-'}</span>
                                </div>
                                <div class="info-item full-width">
                                    <label>Email</label>
                                    <span>${booking.email || '-'}</span>
                                </div>
                                ${booking.remark ? `
                                <div class="info-item full-width">
                                    <label>Remarks</label>
                                    <span>${booking.remark}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <!-- Amount Section -->
                            <div class="amount-section">
                                <div class="amount-label">Total Amount Paid</div>
                                <div class="amount-value">RM ${this.formatCurrency(amount)}</div>
                                <div class="amount-words">(${amountInWords})</div>
                            </div>
                            
                            <!-- Signature Section -->
                            <div class="signature-section">
                                <div class="signature-box">
                                    <div class="signature-line"></div>
                                    <div class="signature-label">Customer Signature</div>
                                    <div style="font-size: 11px; color: #999; margin-top: 5px;">
                                        ${booking.name_english || booking.name_chinese || ''}
                                    </div>
                                </div>
                                <div class="signature-box">
                                    <div class="signature-line"></div>
                                    <div class="signature-label">Authorized By</div>
                                    <div style="font-size: 11px; color: #999; margin-top: 5px;">
                                        Temple Staff
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div class="footer-note">
                            <p class="thank-you">Thank you for your booking! 感谢您的预订！</p>
                            <p>This is a computer-generated receipt. No signature is required.</p>
                            <p>Generated on: ${new Date().toLocaleString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</p>
                            <p style="margin-top: 10px; color: #8B0000;">
                                ${temple.temple_name || ''} - Special Occasions Management System
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        },
        
        getTempleLogoHTML: function() {
            if (this.templeSettings.temple_logo) {
                return `
                    <div class="temple-logo">
                        <img src="${this.templeSettings.temple_logo}" alt="Temple Logo" 
                             onerror="this.style.display='none'" />
                    </div>
                `;
            }
            
            // Fallback placeholder
            return `
                <div class="temple-logo">
                    <div style="
                        width: 100px; 
                        height: 100px; 
                        background: white;
                        border-radius: 8px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: #8B0000; 
                        font-size: 12px;
                        font-weight: bold;
                        text-align: center;
                    ">
                        <span>🏛️<br>TEMPLE</span>
                    </div>
                </div>
            `;
        },
        
        generateReceiptNumber: function(bookingCode) {
            if (!bookingCode) {
                return 'RCP-' + Date.now();
            }
            return 'RCP-' + bookingCode;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },
        
        formatPaymentMethod: function(method) {
            if (!method) return '-';
            
            const methods = {
                'cash': 'Cash 现款',
                'cheque': 'Cheque 支票',
                'ebanking': 'E-Banking 银行转账',
                'card': 'Credit/Debit Card 信用卡',
                'duitnow': 'DuitNow (E-wallet) 电子钱包'
            };
            
            return methods[method.toLowerCase()] || this.capitalizeFirst(method);
        },
        
        capitalizeFirst: function(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
        
        numberToWords: function(amount) {
            if (!amount || amount === 0) return 'Zero Ringgit Only';
            
            const [whole, decimal = '00'] = parseFloat(amount).toFixed(2).split('.');
            let words = this.convertToWords(parseInt(whole));
            
            words = words + ' Ringgit';
            if (decimal !== '00') {
                words += ' and ' + this.convertToWords(parseInt(decimal)) + ' Sen';
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
            if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + this.convertToWords(num % 100) : '');
            if (num < 1000000) return this.convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.convertToWords(num % 1000) : '');
            if (num < 1000000000) return this.convertToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + this.convertToWords(num % 1000000) : '');
            return this.convertToWords(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + this.convertToWords(num % 1000000000) : '');
        },
        
        cleanup: function() {
            // Cleanup if needed
        }
    };
    
})(jQuery, window);