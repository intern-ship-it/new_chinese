// js/pages/hall-booking/receipt/print.js
// Hall Booking Receipt Print Page

(function($, window) {
    'use strict';
    
    window.HallBookingPrintPage = {
        bookingId: null,
        bookingData: null,
        templeSettings: null,
        
        init: function(params) {
            /* this.bookingId = params?.id;
            
            if (!this.bookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                TempleRouter.navigate('hall-booking');
                return;
            } */
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            Promise.all([
                this.loadBookingData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('hall-booking/listing');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadBookingData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Replace with actual API call
                // TempleAPI.get(`/hall-booking/${this.bookingId}`)
                
                setTimeout(() => {
                    self.bookingData = {
                        id: self.bookingId,
                        booking_code: 'HB' + new Date().getFullYear() + String(self.bookingId).padStart(4, '0'),
                        booking_date: new Date().toISOString().split('T')[0],
                        customer: {
                            name: 'Mr. John Doe',
                            phone: '+60123456789',
                            email: 'john.doe@email.com',
                            address: '123 Main Street, Kuala Lumpur'
                        },
                        event: {
                            title: 'Wedding Reception',
                            date: '2024-12-25',
                            session: 'Second Session (6:00 PM - 11:00 PM)',
                            estimated_guests: 150
                        },
                        items: [
                            {
                                type: 'Hall Rental',
                                description: 'Second Session - 5 hours',
                                amount: 8000.00
                            },
                            {
                                type: 'Dinner Package',
                                description: 'Package B - 150 pax',
                                amount: 22500.00
                            },
                            {
                                type: 'Sound System',
                                description: 'Basic Audio System',
                                amount: 500.00
                            }
                        ],
                        payment: {
                            method: 'Bank Transfer',
                            total_amount: 33000.00,
                            paid_amount: 10000.00,
                            balance_amount: 23000.00,
                            deposit_percentage: 30
                        },
                        status: 'confirmed',
                        created_at: new Date().toISOString(),
                        notes: 'Customer requested special dietary accommodations.'
                    };
                    resolve();
                }, 500);
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
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print receipt', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            setTimeout(() => {
                TempleRouter.navigate('hall-booking/listing');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const booking = this.bookingData;
            const temple = this.templeSettings;
            
            const subtotal = booking.items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
            const totalAmount = booking.payment.total_amount;
            const amountInWords = this.numberToWords(booking.payment.paid_amount);
            
            let itemsHTML = '';
            let itemNo = 1;
            
            booking.items.forEach(item => {
                itemsHTML += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:14px;">${itemNo++}</td>
                        <td align="left" style="padding:3px;font-size:14px;">
                            <strong>${item.type}</strong><br>
                            <small>${item.description}</small>
                        </td>
                        <td align="right" style="padding:3px;font-size:14px;">RM ${this.formatMoney(item.amount)}</td>
                    </tr>
                `;
            });
            
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height:100px;object-fit:contain;padding-top:14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Hall Booking Receipt - ${booking.booking_code}</title>
                    <style>
                        :root {
    			--primary-color: #800000;
			}
			@media print {
                            #backButton, #printButton { display: none !important; }
                            body { margin: 0; padding: 10px; }
                        }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
                        table { border-collapse: collapse; }
                        .btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
                        .btn-primary { background: #007bff; }
                        .btn-info { background: #17a2b8; }
                        @media screen { body { max-width: 900px; margin: 0 auto; } }
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
                            <td width="120">${logoHTML}</td>
                            <td width="580" align="left" style="font-size:13px; padding-left: 20px;">
                                <strong style="font-size: 21px; color:var(--primary-color);">${temple.temple_name}</strong>
                                <br>${temple.temple_address}
                                <br>${temple.temple_city ? temple.temple_city + ', ' : ''}${temple.temple_state} ${temple.temple_pincode}
                                <br>${temple.temple_country}
                                ${temple.temple_phone ? '<br>Tel: ' + temple.temple_phone : ''}
                                ${temple.temple_email ? '<br>E-mail: ' + temple.temple_email : ''}
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="750" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; color: var(--primary-color);">
                                HALL BOOKING RECEIPT
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Booking Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Booking No:</b></td>
                            <td width="250">${booking.booking_code}</td>
                            <td width="150"><b>Date:</b></td>
                            <td width="200">${this.formatDate(booking.booking_date)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Customer:</b></td>
                            <td colspan="3"><b>${booking.customer.name}</b></td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Event:</b></td>
                            <td><b>${booking.event.title}</b></td>
                            <td><b>Event Date:</b></td>
                            <td><b>${this.formatDate(booking.event.date)}</b></td>
                        </tr>
                    </table>
                    
                    <!-- Items Table -->
                    <table width="750" border="1" align="center" cellpadding="3" style="margin-top: 30px; border-color: #333;">
                        <tr style="background-color:#f5f5f5; font-weight:bold; font-size:14px;">
                            <td width="60" align="center" style="padding:8px;">S.No</td>
                            <td width="550" align="center" style="padding:8px;">Service Details</td>
                            <td width="140" align="center" style="padding:8px;">Amount (RM)</td>
                        </tr>
                        ${itemsHTML}
                        <tr style="background-color:var(--primary-color); color:white;">
                            <td colspan="2" align="right" style="padding:8px; font-weight:bold; font-size:16px;">Total Amount:</td>
                            <td align="right" style="padding:8px; font-weight:bold; font-size:16px;">RM ${this.formatMoney(totalAmount)}</td>
                        </tr>
                    </table>
                    
                    <!-- Payment Information -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Payment Method:</b></td>
                            <td width="250">${booking.payment.method}</td>
                            <td width="150"><b>Deposit:</b></td>
                            <td width="200"><b>RM ${this.formatMoney(booking.payment.paid_amount)}</b></td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Amount in Words:</b></td>
                            <td colspan="3"><b>${amountInWords} Only</b></td>
                        </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table width="750" border="0" align="center" style="margin-top: 40px;">
                        <tr>
                            <td width="250" align="center" style="font-size:12px; border-top:1px solid #333; padding-top:10px;">Customer Signature</td>
                            <td width="250"></td>
                            <td width="250" align="center" style="font-size:12px; border-top:1px solid #333; padding-top:10px;">Authorized Signature</td>
                        </tr>
                    </table>
                    
                    <div style="text-align:center; margin-top:20px; font-size:11px; color:#888;">
                        Generated on ${this.formatDateTime(new Date().toISOString())} | Temple Management System
                    </div>
                </body>
                </html>
            `;
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        },
        
        formatDateTime: function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        },
        
        formatMoney: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        },
        
        numberToWords: function(num) {
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            
            function convertHundreds(num) {
                let result = '';
                if (num >= 100) {
                    result += ones[Math.floor(num / 100)] + ' Hundred ';
                    num %= 100;
                }
                if (num >= 20) {
                    result += tens[Math.floor(num / 10)] + ' ';
                    num %= 10;
                } else if (num >= 10) {
                    result += teens[num - 10] + ' ';
                    return result;
                }
                if (num > 0) {
                    result += ones[num] + ' ';
                }
                return result;
            }
            
            if (num === 0) return 'Zero';
            
            let result = '';
            let integerPart = Math.floor(num);
            const decimalPart = Math.round((num - integerPart) * 100);
            
            if (integerPart >= 1000) {
                result += convertHundreds(Math.floor(integerPart / 1000)) + 'Thousand ';
                integerPart %= 1000;
            }
            if (integerPart > 0) {
                result += convertHundreds(integerPart);
            }
            
            result += 'Ringgit';
            if (decimalPart > 0) {
                result += ' and ' + convertHundreds(decimalPart) + 'Sen';
            }
            
            return result.trim();
        }
    };
    
})(jQuery, window);