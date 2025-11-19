// js/pages/entries/credit-note/print.js
(function($, window) {
    'use strict';
    
    window.EntriesCreditNotePrintPage = {
        entryId: null,
        entryData: null,
        templeSettings: null,
        signingAuthorities: null,
        
        init: function(params) {
            this.entryId = params?.id;
            
            if (!this.entryId) {
                TempleCore.showToast('Invalid credit note ID', 'error');
                TempleRouter.navigate('entries');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load entry data, temple settings, and signing authorities
            Promise.all([
                this.loadEntryData(),
                this.loadTempleSettings(),
                this.loadSigningAuthorities()
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
                            
                            // Validate it's a credit note entry
                            if (self.entryData.entrytype_id !== 5) {
                                reject(new Error('This is not a credit note entry'));
                                return;
                            }
                            resolve();
                        } else {
                            reject(new Error('Failed to load credit note data'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading credit note'));
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
        
        loadSigningAuthorities: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // First get the ACCOUNTS settings to get sign_authority IDs
                TempleAPI.get('/settings?type=ACCOUNTS')
                    .done(function(settingsResponse) {
                        if (settingsResponse.success && settingsResponse.data && settingsResponse.data.values) {
                            const signAuthorityIds = settingsResponse.data.values.sign_authority;
                            
                            // Parse the IDs if they're in JSON string format
                            let authorityIds = [];
                            try {
                                if (typeof signAuthorityIds === 'string') {
                                    authorityIds = JSON.parse(signAuthorityIds);
                                } else if (Array.isArray(signAuthorityIds)) {
                                    authorityIds = signAuthorityIds;
                                }
                            } catch (e) {
                                console.log('No signing authorities configured');
                                self.signingAuthorities = [];
                                resolve();
                                return;
                            }
                            
                            if (!authorityIds || authorityIds.length === 0) {
                                self.signingAuthorities = [];
                                resolve();
                                return;
                            }
                            
                            // Now get the organization positions to get the names
                            TempleAPI.get('/settings/organization-positions')
                                .done(function(positionsResponse) {
                                    if (positionsResponse.success && positionsResponse.data) {
                                        // Filter positions based on selected IDs
                                        self.signingAuthorities = positionsResponse.data
                                            .filter(pos => authorityIds.includes(pos.id))
                                            .map(pos => ({
                                                id: pos.id,
                                                name: pos.label || pos.display_name
                                            }));
                                    } else {
                                        self.signingAuthorities = [];
                                    }
                                    resolve();
                                })
                                .fail(function() {
                                    self.signingAuthorities = [];
                                    resolve();
                                });
                        } else {
                            self.signingAuthorities = [];
                            resolve();
                        }
                    })
                    .fail(function() {
                        self.signingAuthorities = [];
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
            
            // Auto-trigger print dialog
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };
            
            // Navigate back after opening print window
            setTimeout(() => {
                TempleRouter.navigate('entries');
            }, 100);
        },
        
        generateSignaturesHTML: function() {
            // If no signing authorities, return empty section
            if (!this.signingAuthorities || this.signingAuthorities.length === 0) {
                return '';
            }
            
            // Calculate how many signatures per row (max 3 per row for better layout)
            const signaturesPerRow = 3;
            const rows = [];
            
            for (let i = 0; i < this.signingAuthorities.length; i += signaturesPerRow) {
                const rowAuthorities = this.signingAuthorities.slice(i, i + signaturesPerRow);
                rows.push(rowAuthorities);
            }
            
            let signaturesHTML = '';
            
            rows.forEach((row, rowIndex) => {
                // Add spacing between rows
                const marginTop = rowIndex === 0 ? '80px' : '60px';
                
                signaturesHTML += `
                    <table width="750" align="center" style="margin-top:${marginTop};">
                        <tr>
                `;
                
                // Calculate column width based on number of signatures in this row
                const colWidth = Math.floor(750 / row.length);
                
                row.forEach(authority => {
                    signaturesHTML += `
                        <td width="${colWidth}" align="center">
                            <div style="border-top:1px solid #000; width:200px; margin: 0 auto; text-align:center; padding-top:5px; font-size:14px;">
                                ${authority.name}
                            </div>
                        </td>
                    `;
                });
                
                // Add empty cells if this row has fewer items than signaturesPerRow
                for (let j = row.length; j < signaturesPerRow && rowIndex === 0; j++) {
                    signaturesHTML += `<td width="${colWidth}"></td>`;
                }
                
                signaturesHTML += `
                        </tr>
                    </table>
                `;
            });
            
            return signaturesHTML;
        },
        
        generatePrintHTML: function() {
            const entry = this.entryData;
            const temple = this.templeSettings;
            
            // Calculate totals and determine credit amount
            let totalDebit = 0;
            let totalCredit = 0;
            let creditedAmount = 0;
            
            // Generate entry items rows
            let itemsHtml = '';
            let serialNo = 1;
            
            if (entry.entry_items && entry.entry_items.length > 0) {
                entry.entry_items.forEach(function(item) {
                    const isDebit = item.dc === 'D';
                    const amount = parseFloat(item.amount) || 0;
                    totalDebit += isDebit ? amount : 0;
                    totalCredit += !isDebit ? amount : 0;
                    
                    // For credit notes, credit amounts are typically what's being refunded/credited
                    if (!isDebit) {
                        creditedAmount += amount;
                    }
                    
                    itemsHtml += `
                        <tr style="height:30px;">
                            <td align="center" style="padding:3px;font-size:14px;">${serialNo++}</td>
                            <td align="left" style="padding:3px;font-size:14px;">
                                ${item.ledger?.name || 'Unknown Account'}
                                ${item.ledger?.left_code && item.ledger?.right_code ? 
                                    `<br><small style="color:#666;">(${item.ledger.left_code}/${item.ledger.right_code})</small>` : ''}
                                ${item.details ? `<br><small style="color:#666;">${item.details}</small>` : ''}
                            </td>
                            <td align="right" style="padding:3px;font-size:14px;">
                                ${isDebit ? this.formatCurrency(amount) : '-'}
                            </td>
                            <td align="right" style="padding:3px;font-size:14px;">
                                ${!isDebit ? this.formatCurrency(amount) : '-'}
                            </td>
                        </tr>
                    `;
                }.bind(this));
            }
            
            // Check if balanced
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
            const difference = Math.abs(totalDebit - totalCredit);
            
            // Convert credit amount to words
            const amountInWords = this.numberToWords(creditedAmount);
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style=""width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            // Generate signatures section
            const signaturesHTML = this.generateSignaturesHTML();
            const currencySymbol = TempleCore.getCurrency();
            // Generate complete HTML
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Credit Note - ${entry.entry_code}</title>
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
                        
                        .credit-amount-box {
                            background-color: #f0f8ff;
                            border: 2px solid #000000;
                            border-radius: 8px;
                            padding: 15px;
                            margin: 20px 0;
                            text-align: center;
                        }
                        
                        .credit-amount {
                            font-size: 24px;
                            font-weight: bold;
                            color: #000000;
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
                    <table width="750" style="border-top:2px solid black; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase; color:black;">
                                Credit Note
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Entry Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Credit Note No:</b></td>
                            <td width="250">${entry.entry_code || '-'}</td>
                            <td width="150"><b>Date:</b></td>
                            <td width="200">${this.formatDate(entry.date)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Reference No:</b></td>
                            <td>${entry.reference_no || '-'}</td>
                            <td><b>Fund:</b></td>
                            <td>${entry.fund?.name || 'General Fund'}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Party Name:</b></td>
                            <td>${entry.paid_to || '-'}</td>
                            <td><b>Amount Credited:</b></td>
                            <td>${currencySymbol} ${this.formatCurrency(creditedAmount)}</td>
                        </tr>
                    </table>
                    
                    <!-- Entry Items -->
                    <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                        <thead>
                            <tr style="font-size: 14px;">   
                                <td width="50" height="35" align="center" style="border-top:2px solid #000000; border-bottom:2px solid #000000; padding:8px; background-color:#f0f8ff;"><b>S.No</b></td>
                                <td width="400" style="border-top:2px solid #000000; border-bottom:2px solid #000000; padding:8px; background-color:#f0f8ff;" align="left"><b>Account</b></td>
                                <td width="150" style="border-top:2px solid #000000; border-bottom:2px solid #000000; padding:8px; background-color:#f0f8ff;" align="center"><b>Debit (${currencySymbol})</b></td>
                                <td width="150" style="border-top:2px solid #000000; border-bottom:2px solid #000000; padding:8px; background-color:#f0f8ff;" align="center"><b>Credit (${currencySymbol})</b></td>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml || '<tr><td colspan="4" align="center" style="padding: 20px;">No items found</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr style="border-top:2px solid #000000;">
                                <td colspan="2" align="right" style="padding:8px; font-size:14px; font-weight:bold;">Total:</td>
                                <td align="right" style="padding:8px; font-size:14px; font-weight:bold;">
                                    ${currencySymbol} ${this.formatCurrency(totalDebit)}
                                </td>
                                <td align="right" style="padding:8px; font-size:14px; font-weight:bold;">
                                    ${currencySymbol} ${this.formatCurrency(totalCredit)}
                                </td>
                            </tr>
                            ${!isBalanced ? `
                                <tr>
                                    <td colspan="2" align="right" style="padding:8px; font-size:14px; font-weight:bold; color:red;">
                                        Difference:
                                    </td>
                                    <td colspan="2" align="center" style="padding:8px; font-size:14px; font-weight:bold; color:red;">
                                        ${currencySymbol} ${this.formatCurrency(difference)}
                                    </td>
                                </tr>
                            ` : ''}
                        </tfoot>
                    </table>
                    
                    <!-- Amount in Words -->
                    <table width="750" align="center" style="margin-top:20px; border-top:2px solid #000000; padding-top:15px;">
                        <tr style="font-size: 14px;">
                            <td><b>Amount Credited in Words:</b> <span style="color:#000000; font-weight:bold;">${amountInWords}</span></td>
                        </tr>
                    </table>
                    
                    <!-- Narration -->
                    ${entry.narration ? `
                        <table width="750" align="center" style="margin-top:20px;">
                            <tr>
                                <td style="font-size: 14px;"><b>Narration / Reason for Credit:</b></td>
                            </tr>
                            <tr>
                                <td style="border:1px solid #000000; padding:10px; font-size: 14px; background-color:#fafafa;">${entry.narration}</td>
                            </tr>
                        </table>
                    ` : ''}
                    
                    <!-- Dynamic Signatures Section -->
                    ${signaturesHTML}
                    
                    <!-- Footer Note -->
                    <table width="750" align="center" style="margin-top:50px;">
                        <tr>
                            <td align="center" style="font-size:12px; color:#666;">
                                <i>This is a computer generated document</i>
                            </td>
                        </tr>
                    </table>
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