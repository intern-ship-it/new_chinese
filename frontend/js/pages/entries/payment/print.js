// js/pages/entries/payment/print.js
(function($, window) {
    'use strict';
    
    window.EntriesPaymentPrintPage = {
        entryId: null,
        entryData: null,
        templeSettings: null,
        signingAuthorities: null,
        authoritySignatures: {},
        
        init: function(params) {
            this.entryId = params?.id;
            
            if (!this.entryId) {
                TempleCore.showToast('Invalid payment ID', 'error');
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
                this.loadSigningAuthoritiesWithSignatures()
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
                            
                            // Validate it's a payment entry
                            if (self.entryData.entrytype_id !== 2) {
                                reject(new Error('This is not a payment entry'));
                                return;
                            }
                            resolve();
                        } else {
                            reject(new Error('Failed to load payment entry'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading payment entry'));
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
        
        loadSigningAuthoritiesWithSignatures: function() {
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
                            
                            // Get organization positions with current holders
                            TempleAPI.get('/organization/positions')
                                .done(function(positionsResponse) {
                                    if (positionsResponse.success && positionsResponse.data) {
                                        // Filter positions based on selected IDs and get current holders
                                        const selectedPositions = positionsResponse.data
                                            .filter(pos => authorityIds.includes(pos.id))
                                            .map(pos => ({
                                                id: pos.id,
                                                name: pos.display_name,
                                                hierarchy_level: pos.hierarchy_level,
                                                current_holder: pos.current_holders && pos.current_holders.length > 0 
                                                    ? pos.current_holders[0] 
                                                    : null
                                            }));
                                        
                                        // Sort by hierarchy level (President first, etc.)
                                        selectedPositions.sort((a, b) => a.hierarchy_level - b.hierarchy_level);
                                        
                                        self.signingAuthorities = selectedPositions;
                                        
                                        // Now fetch signatures for current holders
                                        const signaturePromises = [];
                                        
                                        selectedPositions.forEach(position => {
                                            if (position.current_holder && position.current_holder.user) {
                                                const userId = position.current_holder.user.id;
                                                
                                                const promise = new Promise((resolveSignature) => {
                                                    TempleAPI.get(`/signatures/${userId}`)
                                                        .done(function(signatureResponse) {
                                                            if (signatureResponse.success && signatureResponse.data) {
                                                                self.authoritySignatures[userId] = signatureResponse.data.signature_url;
                                                            }
                                                            resolveSignature();
                                                        })
                                                        .fail(function() {
                                                            // Signature not found, continue without it
                                                            resolveSignature();
                                                        });
                                                });
                                                
                                                signaturePromises.push(promise);
                                            }
                                        });
                                        
                                        // Wait for all signature fetches to complete
                                        Promise.all(signaturePromises).then(() => {
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
                    const hasHolder = authority.current_holder && authority.current_holder.user;
                    const userId = hasHolder ? authority.current_holder.user.id : null;
                    const holderName = hasHolder ? authority.current_holder.user.name : 'Vacant';
                    const signatureUrl = userId ? this.authoritySignatures[userId] : null;
                    
                    signaturesHTML += `
                        <td width="${colWidth}" align="center">
                            <div style="position: relative; width: 200px; margin: 0 auto;">
                    `;
                    
                    // Add signature image if available
                    if (signatureUrl) {
                        signaturesHTML += `
                            <div style="height: 60px; margin-bottom: 5px; position: relative;">
                                <img src="${signatureUrl}" 
                                     style="max-width: 180px; max-height: 60px; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); object-fit: contain;" 
                                     alt="${authority.name} Signature"
                                     onerror="this.style.display='none';" />
                            </div>
                        `;
                    } else {
                        // Empty space for signature if not available
                        signaturesHTML += `
                            <div style="height: 60px; margin-bottom: 5px;">
                                <!-- Signature placeholder -->
                            </div>
                        `;
                    }
                    
                    // Add the signature line and details
                    signaturesHTML += `
                                <div style="border-top: 1px solid #000; text-align: center; padding-top: 5px;">
                                    <div style="font-size: 14px; font-weight: bold;">${authority.name}</div>
                                    <div style="font-size: 12px; color: #666; margin-top: 2px;">${holderName}</div>
                                </div>
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
            
            // Find credit account (Bank/Cash account) and debit items
            let creditAccount = null;
            let debitItems = [];
            let discountItem = null;
            
            if (entry.entry_items && entry.entry_items.length > 0) {
                entry.entry_items.forEach(item => {
                    if (item.dc === 'C') {
                        creditAccount = item;
                    } else if (item.dc === 'D') {
                        if (item.is_discount === 1) {
                            discountItem = item;
                        } else {
                            debitItems.push(item);
                        }
                    }
                });
            }
            
            // Calculate total
            let totalAmount = 0;
            debitItems.forEach(item => {
                totalAmount += parseFloat(item.amount) || 0;
            });
            
            // Calculate net amount after discount
            const discountAmount = discountItem ? parseFloat(discountItem.amount) || 0 : 0;
            const netAmount = totalAmount - discountAmount;
            
            // Convert to words
            const amountInWords = this.numberToWords(netAmount);
            
            // Generate items rows
            let itemsHtml = '';
            let serialNo = 1;
            
            debitItems.forEach(item => {
                itemsHtml += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:14px;">${serialNo++}</td>
                        <td align="left" style="padding:3px;font-size:14px;">
                            ${item.ledger?.name || 'Unknown Account'}
                            ${item.ledger?.left_code && item.ledger?.right_code ? 
                                `<span style="font-size:12px;color:#666;"> (${item.ledger.left_code}/${item.ledger.right_code})</span>` : ''}
                        </td>
                        <td align="left" style="padding:3px;font-size:14px;">${item.details || '-'}</td>
                        <td align="right" style="padding:3px;font-size:14px;">${this.formatCurrency(item.amount)}</td>
                    </tr>
                `;
            });
            
            // Add discount row if exists
            if (discountItem) {
                itemsHtml += `
                    <tr style="height:30px;">
                        <td align="center" style="padding:3px;font-size:14px;">${serialNo++}</td>
                        <td align="left" style="padding:3px;font-size:14px;">
                            <b>[Discount]</b> ${discountItem.ledger?.name || 'Discount'}
                        </td>
                        <td align="left" style="padding:3px;font-size:14px;">${discountItem.details || 'Discount'}</td>
                        <td align="right" style="padding:3px;font-size:14px;color:red;">-${this.formatCurrency(discountItem.amount)}</td>
                    </tr>
                `;
            }
            
            // Payment mode details
            let paymentModeDetails = '';
            if (entry.payment === 'CHEQUE') {
                paymentModeDetails = `
                    <tr style="font-size:14px;">
                        <td><b>Cheque No:</b></td>
                        <td>${entry.cheque_no || '-'}</td>
                        <td><b>Cheque Date:</b></td>
                        <td>${entry.cheque_date ? this.formatDate(entry.cheque_date) : '-'}</td>
                    </tr>
                    ${entry.bank_name ? `
                    <tr style="font-size:14px;">
                        <td><b>Bank Name:</b></td>
                        <td colspan="3">${entry.bank_name}</td>
                    </tr>` : ''}
                `;
            } else if (entry.payment === 'ONLINE') {
                paymentModeDetails = `
                    <tr style="font-size:14px;">
                        <td><b>Transaction No:</b></td>
                        <td>${entry.transaction_no || '-'}</td>
                        <td><b>Transaction Date:</b></td>
                        <td>${entry.transaction_date ? this.formatDate(entry.transaction_date) : '-'}</td>
                    </tr>
                `;
            }
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            // Generate signatures section
            const signaturesHTML = this.generateSignaturesHTML();
            
            // Generate complete HTML
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Voucher - ${entry.entry_code}</title>
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
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase; color: #dc3545;">
                                Payment Voucher
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Payment Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Payment No:</b></td>
                            <td width="250">${entry.entry_code || '-'}</td>
                            <td width="150"><b>Date:</b></td>
                            <td width="200">${this.formatDate(entry.date)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Paid To:</b></td>
                            <td colspan="3"><b style="font-size:16px;">${entry.paid_to || '-'}</b></td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Payment Mode:</b></td>
                            <td>${entry.payment || 'CASH'}</td>
                            <td><b>Fund:</b></td>
                            <td>${entry.fund?.name || 'General Fund'}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>From Account:</b></td>
                            <td colspan="3">
                                ${creditAccount ? creditAccount.ledger?.name || 'Bank/Cash Account' : 'N/A'}
                                ${creditAccount?.ledger?.left_code && creditAccount?.ledger?.right_code ? 
                                    ` <span style="font-size:12px;color:#666;">(${creditAccount.ledger.left_code}/${creditAccount.ledger.right_code})</span>` : ''}
                            </td>
                        </tr>
                        ${paymentModeDetails}
                    </table>
                    
                    <!-- Payment Items -->
                    <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                        <thead>
                            <tr style="font-size: 14px;">   
                                <td width="50" height="35" align="center" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;"><b>S.No</b></td>
                                <td width="350" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="left"><b>Account</b></td>
                                <td width="200" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="left"><b>Details</b></td>
                                <td width="150" style="border-top:2px solid black; border-bottom:2px solid black; padding:8px;" align="center"><b>Amount (RM)</b></td>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml || '<tr><td colspan="4" align="center" style="padding: 20px;">No items found</td></tr>'}
                        </tbody>
                    </table>
                    
                    <!-- Amount in Words -->
                    <table width="750" align="center" style="margin-top:20px; border-top:2px solid black; padding-top:15px;">
                        <tr style="font-size: 14px;">
                            <td><b>Amount in Words:</b> ${amountInWords}</td>
                        </tr>
                    </table>
                    
                    <!-- Total Amount Box -->
                    <table width="750" border="0" align="center" style="margin-top:15px; border-collapse:collapse;">
                        <tr style="font-size: 14px;">
                            <td align="right" width="600">
                                <span style="font-size:14px;font-weight:bold;">Total Amount Paid:</span>
                            </td>
                            <td align="right" style="border: 2px solid #000;width:150px;padding:8px;background:#f9f9f9;">
                                <strong style="font-size:16px;">RM ${this.formatCurrency(netAmount)}</strong>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Narration -->
                    ${entry.narration ? `
                        <table width="750" align="center" style="margin-top:20px;">
                            <tr>
                                <td style="font-size: 14px;"><b>Narration:</b></td>
                            </tr>
                            <tr>
                                <td style="border:1px solid #ccc; padding:10px; font-size: 14px; background:#f9f9f9;">
                                    ${entry.narration}
                                </td>
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