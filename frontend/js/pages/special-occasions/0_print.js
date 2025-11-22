// js/pages/special-occasions/print.js
// Special Occasions Booking Receipt Print Module

(function($, window) {
    'use strict';
    
    window.SpecialOccasionsPrintPage = {
        bookingData: null,
        templeSettings: {},
        
        // Page initialization
        init: function(params) {
            console.log('Special Occasions Print Page initialized with params:', params);
            
            if (params && params.id) {
                this.loadBookingData(params.id);
            } else {
                this.showError('No booking ID provided');
            }
        },
        
        // Load booking data
        loadBookingData: function(bookingId) {
            const self = this;
            
            // Show loading
            this.showLoading(true);
            
            // For now, use sample data - replace with actual API call later
            setTimeout(() => {
                self.bookingData = self.getSampleBookingData(bookingId);
                self.loadTempleSettings()
                    .then(() => {
                        self.showLoading(false);
                        self.openPrintWindow();
                    })
                    .catch(() => {
                        self.showLoading(false);
                        self.showError('Failed to load temple settings');
                    });
            }, 500);
            
            // TODO: Replace with actual API call when backend is ready
            // TempleAPI.get('/special-occasions/' + bookingId)
            //     .then(response => {
            //         self.bookingData = response.data;
            //         return self.loadTempleSettings();
            //     })
            //     .then(() => {
            //         self.showLoading(false);
            //         self.openPrintWindow();
            //     })
            //     .catch(error => {
            //         console.error('Error loading booking data:', error);
            //         self.showLoading(false);
            //         self.showError('Failed to load booking data');
            //     });
        },
        
        // Get sample booking data (remove when API is ready)
        getSampleBookingData: function(bookingId) {
            return {
                booking_code: bookingId || 'SOB2025001',
                booking_date: '2025-11-21',
                occasion_type: 'wesak-day',
                occasion_name: 'Wesak Day Light Offering',
                occasion_chinese: '???? Wesak Day Light Offering',
                option_selected: 'hopeful-light',
                option_label: 'Hopeful Light ????',
                amount: 300.00,
                payment_method: 'cash',
                devotee: {
                    name: 'Tan Ah Kow',
                    mobile: '+60123456789',
                    email: 'tankow@email.com',
                    ic: '850123-10-5678'
                },
                prayers: [
                    'Health and wellness for family',
                    'Success in business ventures',
                    'Peace and harmony'
                ],
                special_dedication: 'For late grandmother Lim Ah Moi',
                status: 'confirmed',
                created_at: '2025-11-21 10:30:00',
                receipt_no: 'SO' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
            };
        },
        
        // Load temple settings
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve) => {
                // Try to get from API first
                if (window.TempleAPI && typeof TempleAPI.getTempleSettings === 'function') {
                    TempleAPI.getTempleSettings()
                        .done(function(response) {
                            self.templeSettings = response.data || response;
                            resolve();
                        })
                        .fail(function() {
                            // Fallback to localStorage
                            self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                            resolve();
                        });
                } else {
                    // Fallback to localStorage if API not available
                    self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                    resolve();
                }
            });
        },
        
        // Open print window
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                this.showError('Pop-up blocked. Please allow pop-ups and try again.');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to special occasions list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('special-occasions/listing');
            }, 100);
        },
        
        // Generate print HTML
        generatePrintHTML: function() {
            const booking = this.bookingData;
            const temple = this.templeSettings;
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:120px;height:100px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            // Format prayers list
            const prayersHTML = booking.prayers && booking.prayers.length > 0 
                ? booking.prayers.map(prayer => `<li style="margin-bottom:5px;">${prayer}</li>`).join('')
                : '<li style="margin-bottom:5px;">General blessings and prayers</li>';
            
            // Convert amount to words
            const amountInWords = this.numberToWords(booking.amount);
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Special Occasions Receipt - ${booking.booking_code}</title>
                    <style>
                        @media print {
                            #controlButtons {
                                display: none !important;
                            }
                            body {
                                margin: 0;
                                padding: 10px;
                            }
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        
                        .btn {
                            padding: 8px 16px;
                            margin: 0 5px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            text-decoration: none;
                            display: inline-block;
                            font-size: 14px;
                        }
                        
                        .btn-primary {
                            background-color: #007bff;
                            color: white;
                        }
                        
                        .btn-info {
                            background-color: #17a2b8;
                            color: white;
                        }
                        
                        @media screen {
                            body {
                                max-width: 900px;
                                margin: 0 auto;
                            }
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
                    
                    <!-- Header -->
                    <table width="750" border="0" align="center">
                        <tr>
                            <td width="120">
                                ${logoHTML}
                            </td>
                            <td width="580" align="left" style="font-size:13px; padding-left: 20px;">
                                <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                                <br>${temple.temple_address || temple.address || 'Temple Address'}
                                <br>${temple.temple_city || temple.city ? (temple.temple_city || temple.city) + ', ' : ''}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                                <br>${temple.temple_country || temple.country || 'Malaysia'}
                                ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                                ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                            </td>
                            <td width="50"></td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="750" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                                Special Occasions Receipt<br>
                                <span style="font-size:18px; color:#666;">??????</span>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Booking Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Receipt No:</b></td>
                            <td width="250">${booking.receipt_no || booking.booking_code}</td>
                            <td width="150"><b>Date:</b></td>
                            <td width="200">${this.formatDate(booking.booking_date)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Devotee Name:</b></td>
                            <td colspan="3"><b>${booking.devotee.name}</b></td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Mobile:</b></td>
                            <td>${booking.devotee.mobile}</td>
                            <td><b>Email:</b></td>
                            <td>${booking.devotee.email}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>IC No:</b></td>
                            <td>${booking.devotee.ic}</td>
                            <td><b>Payment Method:</b></td>
                            <td>${this.formatPaymentMethod(booking.payment_method)}</td>
                        </tr>
                    </table>
                    
                    <!-- Occasion Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Occasion:</b></td>
                            <td colspan="3"><b>${booking.occasion_name}</b><br><span style="color:#666;">${booking.occasion_chinese}</span></td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Option Selected:</b></td>
                            <td colspan="3">${booking.option_label}</td>
                        </tr>
                        ${booking.special_dedication ? `
                        <tr style="font-size:14px;">
                            <td><b>Special Dedication:</b></td>
                            <td colspan="3" style="color:#666;">${booking.special_dedication}</td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <!-- Prayer Requests -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150" style="vertical-align: top;"><b>Prayer Requests:</b></td>
                            <td>
                                <ul style="margin: 0; padding-left: 20px;">
                                    ${prayersHTML}
                                </ul>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Amount Details -->
                    <table width="750" border="1" align="center" cellpadding="8" style="margin-top: 30px; border-collapse: collapse;">
                        <thead style="background-color: #f8f9fa;">
                            <tr style="font-size:14px;">
                                <th width="50" style="text-align: center; border: 1px solid #dee2e6;">No</th>
                                <th width="400" style="text-align: left; border: 1px solid #dee2e6;">Description</th>
                                <th width="100" style="text-align: center; border: 1px solid #dee2e6;">Quantity</th>
                                <th width="100" style="text-align: center; border: 1px solid #dee2e6;">Unit Price</th>
                                <th width="100" style="text-align: center; border: 1px solid #dee2e6;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="font-size:14px;">
                                <td style="text-align: center; border: 1px solid #dee2e6;">1</td>
                                <td style="border: 1px solid #dee2e6;">${booking.option_label}</td>
                                <td style="text-align: center; border: 1px solid #dee2e6;">1</td>
                                <td style="text-align: center; border: 1px solid #dee2e6;">RM ${booking.amount.toFixed(2)}</td>
                                <td style="text-align: center; border: 1px solid #dee2e6;">RM ${booking.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr style="font-size:16px; font-weight: bold; background-color: #f8f9fa;">
                                <td colspan="4" style="text-align: right; border: 1px solid #dee2e6; padding-right: 10px;">
                                    <b>TOTAL AMOUNT:</b>
                                </td>
                                <td style="text-align: center; border: 1px solid #dee2e6;">
                                    <b>RM ${booking.amount.toFixed(2)}</b>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <!-- Amount in Words -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 15px;">
                        <tr style="font-size:14px;">
                            <td><b>Amount in Words:</b> ${amountInWords} Only</td>
                        </tr>
                    </table>
                    
                    <!-- Footer Message -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 40px;">
                        <tr>
                            <td style="text-align: center; font-size:14px; color:#666; border-top: 1px solid #ddd; padding-top: 20px;">
                                <b>May all your prayers be answered and blessings be upon you</b><br>
                                <span style="font-size:12px;">???????????,??????</span><br><br>
                                
                                <div style="font-size:12px; color:#999;">
                                    Receipt generated on: ${this.formatDateTime(new Date())}<br>
                                    This is a computer generated receipt.
                                </div>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            
            return html;
        },
        
        // Format date
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        },
        
        // Format datetime
        formatDateTime: function(date) {
            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        },
        
        // Format payment method
        formatPaymentMethod: function(method) {
            const methods = {
                'cash': 'Cash ??',
                'cheque': 'Cheque ??',
                'ebanking': 'E-banking ????',
                'card': 'Credit/Debit Card ???',
                'duitnow': 'DuitNow (E-wallet) ????'
            };
            return methods[method] || method;
        },
        
        // Convert number to words (simplified version)
        numberToWords: function(amount) {
            if (!amount || amount === 0) return 'Zero Ringgit';
            
            const num = Math.floor(amount);
            const cents = Math.round((amount - num) * 100);
            
            // Simple implementation - you can enhance this
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            
            if (num < 10) {
                return ones[num] + ' Ringgit' + (cents > 0 ? ' and ' + cents + ' Sen' : '');
            } else if (num < 20) {
                return teens[num - 10] + ' Ringgit' + (cents > 0 ? ' and ' + cents + ' Sen' : '');
            } else if (num < 100) {
                const tenDigit = Math.floor(num / 10);
                const oneDigit = num % 10;
                return tens[tenDigit] + (oneDigit > 0 ? ' ' + ones[oneDigit] : '') + ' Ringgit' + (cents > 0 ? ' and ' + cents + ' Sen' : '');
            } else if (num < 1000) {
                const hundredDigit = Math.floor(num / 100);
                const remainder = num % 100;
                let result = ones[hundredDigit] + ' Hundred';
                if (remainder > 0) {
                    if (remainder < 10) {
                        result += ' ' + ones[remainder];
                    } else if (remainder < 20) {
                        result += ' ' + teens[remainder - 10];
                    } else {
                        const tenDigit = Math.floor(remainder / 10);
                        const oneDigit = remainder % 10;
                        result += ' ' + tens[tenDigit] + (oneDigit > 0 ? ' ' + ones[oneDigit] : '');
                    }
                }
                return result + ' Ringgit' + (cents > 0 ? ' and ' + cents + ' Sen' : '');
            }
            
            // For larger amounts, use a simplified approach
            return amount.toFixed(2) + ' Ringgit';
        },
        
        // Show loading state
        showLoading: function(show) {
            if (show) {
                // Show loading in current page
                $('#page-container').html(`
                    <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div>Generating receipt...</div>
                        </div>
                    </div>
                `);
            }
        },
        
        // Show error message
        showError: function(message) {
            $('#page-container').html(`
                <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                    <div class="alert alert-danger text-center">
                        <i class="bi bi-exclamation-circle fs-1 mb-3 d-block"></i>
                        <h5>Error</h5>
                        <p>${message}</p>
                        <button class="btn btn-primary" onclick="TempleRouter.navigate('special-occasions/listing')">
                            <i class="bi bi-arrow-left"></i> Back to List
                        </button>
                    </div>
                </div>
            `);
        }
    };

})(jQuery, window);