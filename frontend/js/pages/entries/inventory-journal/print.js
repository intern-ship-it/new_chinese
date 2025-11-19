// js/pages/entries/inventory-journal/print.js
(function($, window) {
    'use strict';
    
    window.EntriesInventoryJournalPrintPage = {
        entryId: null,
        entryData: null,
        templeSettings: null,
        
        init: function(params) {
            this.entryId = params?.id;
            
            if (!this.entryId) {
                TempleCore.showToast('Invalid inventory journal ID', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load entry data, temple settings, and inventory balances
            Promise.all([
                this.loadEntryData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                // After entry data and settings are loaded, load inventory balances
                return self.loadInventoryBalances();
            })
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
                            
                            // Validate it's an inventory journal entry
                            if (self.entryData.entrytype_id !== 7) {
                                reject(new Error('This is not an inventory journal entry'));
                                return;
                            }
                            resolve();
                        } else {
                            reject(new Error('Failed to load inventory journal data'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading inventory journal'));
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
        
        loadInventoryBalances: function() {
            const self = this;
            const promises = [];
            
            // Load balance for each inventory item
            if (self.entryData.entry_items) {
                self.entryData.entry_items.forEach(function(item) {
                    if (item.quantity && item.quantity > 0) {
                        const promise = TempleAPI.get(`/accounts/entries/inventory/${item.ledger_id}/balance`)
                            .done(function(response) {
                                if (response.success) {
                                    item.balance_data = response.data;
                                }
                            });
                        promises.push(promise);
                    }
                });
            }
            
            return Promise.all(promises);
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
              
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back after opening print window
            setTimeout(() => {
                TempleRouter.navigate('entries');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const entry = this.entryData;
            const temple = this.templeSettings; // Use the fresh settings we loaded
            
            // Separate inventory and accounting items
            const inventoryItems = [];
            const accountingItems = [];
            let totalDebit = 0;
            let totalCredit = 0;
            
            if (entry.entry_items && entry.entry_items.length > 0) {
                entry.entry_items.forEach(function(item) {
                    if (item.quantity && item.quantity > 0) {
                        // This is an inventory item
                        inventoryItems.push(item);
                    } else {
                        // This is an accounting entry
                        accountingItems.push(item);
                    }
                    
                    const amount = parseFloat(item.amount) || 0;
                    if (item.dc === 'D') {
                        totalDebit += amount;
                    } else {
                        totalCredit += amount;
                    }
                });
            }
            
            // Generate inventory items HTML
            let inventoryHtml = '';
            let serialNo = 1;
            
            inventoryItems.forEach(function(item) {
                const isStockIn = item.dc === 'D';
                const transactionType = isStockIn ? 'Stock In' : 'Stock Out';
                const amount = parseFloat(item.amount) || 0;
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unit_price) || 0;
                
                // Calculate balances
                const balanceData = item.balance_data || {};
                const currentQty = balanceData.quantity || 0;
                const currentValue = balanceData.value || 0;
                const avgPrice = currentQty > 0 ? (currentValue / currentQty).toFixed(2) : '0.00';
                
                // Calculate running balance (this is simplified - actual would need transaction history)
                let runningQty = currentQty;
                if (isStockIn) {
                    runningQty = currentQty - quantity; // Before transaction
                } else {
                    runningQty = currentQty + quantity; // Before transaction
                }
                
                inventoryHtml += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:13px;">${serialNo++}</td>
                        <td align="left" style="padding:3px;font-size:13px;">
                            ${item.ledger?.name || 'Unknown Item'}
                            ${item.ledger?.left_code && item.ledger?.right_code ? 
                                `<br><small style="color:#666;">(${item.ledger.left_code}/${item.ledger.right_code})</small>` : ''}
                        </td>
                        <td align="center" style="padding:3px;font-size:13px;">${transactionType}</td>
                        <td align="right" style="padding:3px;font-size:13px;">${runningQty.toFixed(2)}</td>
                        <td align="right" style="padding:3px;font-size:13px;">${quantity.toFixed(2)}</td>
                        <td align="right" style="padding:3px;font-size:13px;">${currentQty.toFixed(2)}</td>
                        <td align="right" style="padding:3px;font-size:13px;">${this.formatCurrency(unitPrice)}</td>
                        <td align="right" style="padding:3px;font-size:13px;">${this.formatCurrency(avgPrice)}</td>
                        <td align="right" style="padding:3px;font-size:13px;">${this.formatCurrency(amount)}</td>
                    </tr>
                `;
            }.bind(this));
            
            // Generate accounting entries HTML
            let accountingHtml = '';
            let accountingSerialNo = 1;
            
            accountingItems.forEach(function(item) {
                const isDebit = item.dc === 'D';
                const amount = parseFloat(item.amount) || 0;
                
                accountingHtml += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:13px;">${accountingSerialNo++}</td>
                        <td align="left" style="padding:3px;font-size:13px;">
                            ${item.ledger?.name || 'Unknown Account'}
                            ${item.ledger?.left_code && item.ledger?.right_code ? 
                                `<br><small style="color:#666;">(${item.ledger.left_code}/${item.ledger.right_code})</small>` : ''}
                        </td>
                        <td align="right" style="padding:3px;font-size:13px;">
                            ${isDebit ? this.formatCurrency(amount) : '-'}
                        </td>
                        <td align="right" style="padding:3px;font-size:13px;">
                            ${!isDebit ? this.formatCurrency(amount) : '-'}
                        </td>
                    </tr>
                `;
            }.bind(this));
            
            // Check if balanced
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
            const difference = Math.abs(totalDebit - totalCredit);
            
            // Convert total to words
            const amountInWords = this.numberToWords(totalDebit);
            
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
            const currencySymbol = TempleCore.getCurrency();
            // Generate complete HTML
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Inventory Journal - ${entry.entry_code}</title>
                    <style>
                        @media print {
                            #backButton, #printButton {
                                display: none !important;
                            }
                            body {
                                margin: 0;
                                padding: 10px;
                            }
                            @page {
                                size: A4 landscape;
                                margin: 10mm;
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
                        
                        .section-header {
                            background-color: #f5f5f5;
                            padding: 8px;
                            margin-top: 20px;
                            margin-bottom: 10px;
                            font-weight: bold;
                            font-size: 15px;
                            border-left: 4px solid #337ab7;
                        }
                        
                        @media screen {
                            body {
                                max-width: 1200px;
                                margin: 0 auto;
                            }
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="100%" border="0" align="center" id="controlButtons" style="margin-bottom: 20px; max-width: 1100px;">
                        <tr>
                            <td width="70%"></td>
                            <td width="15%" style="text-align: right;">
                                <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                            </td>
                            <td width="15%" style="text-align: right;">
                                <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Header -->
                    <table width="100%" border="0" align="center" style="max-width: 1100px;">
                        <tr>
                            <td width="120">
                                ${logoHTML}
                            </td>
                            <td width="70%" align="left" style="font-size:13px; padding-left: 20px;">
                                <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                                <br>${temple.temple_address || temple.address || 'Temple Address'}
                                <br>${temple.temple_city || temple.city ? (temple.temple_city || temple.city) + ', ' : ''}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                                <br>${temple.temple_country || temple.country || 'Malaysia'}
                                ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                                ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                            </td>
                            <td width="10%"></td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="100%" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px; max-width: 1100px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                                Inventory Journal
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Entry Details -->
                    <table width="100%" border="0" align="center" cellpadding="5" style="margin-top: 20px; max-width: 1100px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Journal No:</b></td>
                            <td width="250">${entry.entry_code || '-'}</td>
                            <td width="150"><b>Date:</b></td>
                            <td width="200">${this.formatDate(entry.date)}</td>
                            <td width="150"><b>Reference No:</b></td>
                            <td width="200">${entry.reference_no || '-'}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Fund:</b></td>
                            <td>${entry.fund?.name || 'General Fund'}</td>
                            <td><b>Status:</b></td>
                            <td>
                                ${isBalanced 
                                    ? '<span style="color:green;font-weight:bold;">Balanced</span>'
                                    : '<span style="color:red;font-weight:bold;">Unbalanced (Diff: RM ' + difference.toFixed(2) + ')</span>'
                                }
                            </td>
                            <td><b>Created By:</b></td>
                            <td>${entry.creator?.name || '-'}</td>
                        </tr>
                    </table>
                    
                    <!-- Inventory Items Section -->
                    <div class="section-header" style="max-width: 1100px; margin-left: auto; margin-right: auto;">
                        <i style="font-size: 16px;"></i> Inventory Items
                    </div>
                    <table width="100%" align="center" style="margin-top:10px; border-collapse:collapse; max-width: 1100px;">
                        <thead>
                            <tr style="font-size: 13px;">   
                                <td width="5%" height="35" align="center" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>S.No</b></td>
                                <td width="25%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="left"><b>Item Description</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Type</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Before Qty</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Trans. Qty</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>After Qty</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Unit Price</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Avg. Cost</b></td>
                                <td width="10%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Amount (${currencySymbol})</b></td>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryHtml || '<tr><td colspan="9" align="center" style="padding: 20px;">No inventory items found</td></tr>'}
                        </tbody>
                    </table>
                    
                    <!-- Accounting Entries Section -->
                    <div class="section-header" style="max-width: 1100px; margin-left: auto; margin-right: auto;">
                        <i style="font-size: 16px;"></i> Accounting Entries
                    </div>
                    <table width="100%" align="center" style="margin-top:10px; border-collapse:collapse; max-width: 1100px;">
                        <thead>
                            <tr style="font-size: 13px;">   
                                <td width="10%" height="35" align="center" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>S.No</b></td>
                                <td width="50%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="left"><b>Account</b></td>
                                <td width="20%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Debit (${currencySymbol}))</b></td>
                                <td width="20%" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Credit (${currencySymbol})</b></td>
                            </tr>
                        </thead>
                        <tbody>
                            ${accountingHtml || '<tr><td colspan="4" align="center" style="padding: 20px;">No accounting entries found</td></tr>'}
                        </tbody>
                    </table>
                    
                    <!-- Total Summary -->
                    <table width="100%" align="center" style="margin-top:20px; max-width: 1100px;">
                        <tr style="border-top:2px solid black;">
                            <td width="60%" align="right" style="padding:8px; font-size:14px; font-weight:bold;">Grand Total:</td>
                            <td width="20%" align="right" style="padding:8px; font-size:14px; font-weight:bold; border-bottom:3px double black;">
                                Debit: ${currencySymbol} ${this.formatCurrency(totalDebit)}
                            </td>
                            <td width="20%" align="right" style="padding:8px; font-size:14px; font-weight:bold; border-bottom:3px double black;">
                                Credit: ${currencySymbol} ${this.formatCurrency(totalCredit)}
                            </td>
                        </tr>
                        ${!isBalanced ? `
                            <tr>
                                <td align="right" style="padding:8px; font-size:14px; font-weight:bold; color:red;">
                                    Difference:
                                </td>
                                <td colspan="2" align="center" style="padding:8px; font-size:14px; font-weight:bold; color:red;">
                                    ${currencySymbol} ${this.formatCurrency(difference)}
                                </td>
                            </tr>
                        ` : ''}
                    </table>
                    
                    <!-- Amount in Words -->
                    <table width="100%" align="center" style="margin-top:20px; border-top:2px solid black; padding-top:15px; max-width: 1100px;">
                        <tr style="font-size: 14px;">
                            <td><b>Amount in Words:</b> ${amountInWords}</td>
                        </tr>
                    </table>
                    
                    <!-- Narration -->
                    ${entry.narration ? `
                        <table width="100%" align="center" style="margin-top:20px; max-width: 1100px;">
                            <tr>
                                <td style="font-size: 14px;"><b>Narration:</b></td>
                            </tr>
                            <tr>
                                <td style="border:1px solid #ccc; padding:10px; font-size: 14px; background-color:#f9f9f9;">${entry.narration}</td>
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