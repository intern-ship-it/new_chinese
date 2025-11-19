// js/pages/entries/receipt/print.js
(function($, window) {
    'use strict';
    
    window.EntriesReceiptPrintPage = {
        entryId: null,
        entryData: null,
        templeSettings: null,
        
        init: function(params) {
            this.entryId = params?.id;
            
            if (!this.entryId) {
                TempleCore.showToast('Invalid receipt ID', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load both entry data and fresh settings
            Promise.all([
                this.loadEntryData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('entries');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadEntryData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get(`/accounts/entries/${this.entryId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.entryData = response.data;
                            
                            // Validate it's a receipt entry
                            if (self.entryData.entrytype_id !== 1) {
                                reject(new Error('This is not a receipt entry'));
                                return;
                            }
                            resolve();
                        } else {
                            reject(new Error('Failed to load receipt'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading receipt'));
                    });
            });
        },
        
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Fetch fresh settings from server
                TempleAPI.get('/settings?type=SYSTEM')
                    .done(function(response) {
                        if (response.success && response.data && response.data.values) {
                            self.templeSettings = response.data.values;
                            
                            // Optionally update localStorage for future use
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
                            // Fallback to localStorage if API fails
                            self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                            resolve();
                        }
                    })
                    .fail(function() {
                        // Fallback to localStorage if API fails
                        self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                        resolve();
                    });
            });
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
          
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to entries list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('entries');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const entry = this.entryData;
            const temple = this.templeSettings; // Use the fresh settings we loaded
            
            // Separate credit items and discount items
            const creditItems = entry.entry_items.filter(item => 
                item.dc === 'C' && !item.is_discount
            );
            const discountItem = entry.entry_items.find(item => 
                item.is_discount === 1 || item.is_discount === true
            );
            const debitItem = entry.entry_items.find(item => 
                item.dc === 'D' && !item.is_discount
            );
            
            // Calculate totals
            let totalAmount = creditItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
            let receivedAmount = debitItem ? parseFloat(debitItem.amount) : totalAmount;
            
            // Convert amount to words
            const amountInWords = this.numberToWords(receivedAmount);
            
            // Generate items HTML
            let itemsHTML = '';
            let itemNo = 1;
            
            creditItems.forEach(item => {
                itemsHTML += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:14px;">${itemNo++}</td>
                        <td align="left" style="padding:3px;font-size:14px;">
                            ${item.ledger?.name || 'Unknown Account'}
                            ${item.ledger?.left_code && item.ledger?.right_code ? 
                                `<br><small>(${item.ledger.left_code}/${item.ledger.right_code})</small>` : ''}
                        </td>
                        <td align="left" style="padding:3px;font-size:14px;">${item.details || '-'}</td>
                        <td align="right" style="padding:3px;font-size:14px;">${this.formatCurrency(item.amount)}</td>
                    </tr>
                `;
            });
            
            // Add discount row if exists
            if (discountItem) {
                itemsHTML += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:14px;">${itemNo++}</td>
                        <td align="left" style="padding:3px;font-size:14px;">
                            <b>[Discount]</b> ${discountItem.ledger?.name || 'Discount'}
                        </td>
                        <td align="left" style="padding:3px;font-size:14px;">${discountItem.details || 'Discount'}</td>
                        <td align="right" style="padding:3px;font-size:14px;color:red;">-${this.formatCurrency(discountItem.amount)}</td>
                    </tr>
                `;
            }
            
            // Payment details based on mode
            let paymentDetailsHTML = '';
            if (entry.payment === 'CHEQUE') {
                paymentDetailsHTML = `
                    <tr style="font-size:14px;">
                        <td><b>Cheque No:</b></td>
                        <td>${entry.cheque_no || '-'}</td>
                        <td><b>Cheque Date:</b></td>
                        <td>${entry.cheque_date ? this.formatDate(entry.cheque_date) : '-'}</td>
                    </tr>
                `;
            } else if (entry.payment === 'ONLINE') {
                paymentDetailsHTML = `
                    <tr style="font-size:14px;">
                        <td><b>Transaction No:</b></td>
                        <td>${entry.transaction_no || entry.cheque_no || '-'}</td>
                        <td><b>Transaction Date:</b></td>
                        <td>${entry.transaction_date || entry.cheque_date ? this.formatDate(entry.transaction_date || entry.cheque_date) : '-'}</td>
                    </tr>
                `;
            }
            
            // Handle logo - check if temple_logo exists in settings
            let logoHTML = '';
            if (temple.temple_logo) {
                // Assuming temple_logo contains the path or URL
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                // Fallback to placeholder
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt Voucher - ${entry.entry_code}</title>
                    <style>
                        @media print {
                            #backButton, #printButton {
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
                            line-height: 1.4;
                            color: #333;
                        }
                        
                        .btn {
                            display: inline-block;
                            padding: 8px 16px;
                            margin: 0 5px;
                            font-size: 14px;
                            font-weight: 400;
                            text-align: center;
                            white-space: nowrap;
                            vertical-align: middle;
                            cursor: pointer;
                            border: 1px solid transparent;
                            border-radius: 4px;
                            text-decoration: none;
                        }
                        
                        .btn-primary {
                            color: #fff;
                            background-color: #337ab7;
                            border-color: #2e6da4;
                        }
                        
                        .btn-info {
                            color: #fff;
                            background-color: #5bc0de;
                            border-color: #46b8da;
                        }
                        
                        .btn:hover {
                            opacity: 0.9;
                        }
                        
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        
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
                                <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
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
                                Receipt Voucher
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Entry Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Receipt No:</b></td>
                            <td width="250">${entry.entry_code || '-'}</td>
                            <td width="150"><b>Date:</b></td>
                            <td width="200">${this.formatDate(entry.date)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Received From:</b></td>
                            <td colspan="3"><b>${entry.paid_to || '-'}</b></td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Receipt Mode:</b></td>
                            <td>${entry.payment || '-'}</td>
                            <td><b>Fund:</b></td>
                            <td>${entry.fund?.name || 'General Fund'}</td>
                        </tr>
                        ${paymentDetailsHTML}
                    </table>
                    
                    <!-- Items Table -->
                    <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                        <thead>
                            <tr style="font-size: 14px;">   
                                <td width="50" height="35" align="center" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>S.No</b></td>
                                <td width="400" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="left"><b>Account</b></td>
                                <td width="150" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="left"><b>Details</b></td>
                                <td width="150" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Amount (RM)</b></td>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML || '<tr><td colspan="4" align="center" style="padding: 20px;">No items found</td></tr>'}
                        </tbody>
                    </table>
                    
                    <!-- Amount in Words -->
                    <table width="750" align="center" style="margin-top:20px; border-top:2px solid black; padding-top:15px;">
                        <tr style="font-size: 14px;">
                            <td><b>Amount in Words:</b> ${amountInWords}</td>
                        </tr>
                    </table>
                    
                    <!-- Total Amount -->
                    <table width="750" border="0" align="center" style="margin-top:20px; border-collapse:collapse;">
                        <tr style="font-size: 14px;">
                            <td align="right" width="600"><span style="font-size:14px;font-weight:bold;">Total Amount Received:</span></td>
                            <td align="right" style="border: 2px solid #000;width:150px;padding:8px;"><strong style="font-size:16px;"> ${this.formatCurrency(receivedAmount)}</strong></td>
                        </tr>
                    </table>
                    
                    <!-- Narration -->
                    ${entry.narration ? `
                        <table width="750" align="center" style="margin-top:20px;">
                            <tr>
                                <td style="font-size: 14px;"><b>Narration:</b></td>
                            </tr>
                            <tr>
                                <td style="border:1px solid #ccc; padding:10px; font-size: 14px;">${entry.narration}</td>
                            </tr>
                        </table>
                    ` : ''}
                    
                </body>
                </html>
            `;
            
            return html;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate().toString().padStart(2, '0')}/${months[date.getMonth()]}/${date.getFullYear()}`;
        },
        
        numberToWords: function(amount) {
            if (amount === 0) return 'Zero Ringgit Only';
            
            // Split into whole and decimal parts
            const [whole, decimal = '00'] = amount.toFixed(2).split('.');
            let words = this.convertToWords(parseInt(whole));
            
            // Add currency and cents
            words = words + ' Ringgit';
            if (decimal !== '00') {
                words += ' and ' + decimal + '/100';
            }
            words += ' Only';
            
            return words;
        },
        
        convertToWords: function(num) {
            if (num === 0) return '';
            
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