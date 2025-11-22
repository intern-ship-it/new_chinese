// js/pages/dharma-assembly/receipt/print.js
// Dharma Assembly Receipt Print Page

(function($, window) {
    'use strict';
    
    window.DharmaAssemblyPrintPage = {
        registrationId: null,
        registrationData: null,
        templeSettings: null,
        
        init: function(params) {
            this.registrationId = 1;
            
            if (!this.registrationId) {
                TempleCore.showToast('Invalid registration ID', 'error');
                TempleRouter.navigate('dharma-assembly');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load both registration data and temple settings
            Promise.all([
                this.loadRegistrationData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('dharma-assembly');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadRegistrationData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Simulate loading registration data (replace with actual API call)
                setTimeout(() => {
                    // Get sample data that matches the dharma assembly structure
                    const sampleData = [
                        {
                            id: 1,
                            date: '2024-11-15',
                            name: 'Wong Ah Kow',
                            assembly_type: 'longevity',
                            contact: '+60123456789',
                            amount: 30000.00,
                            status: 'confirmed',
                            details: {
                                nric: '800101-01-1234',
                                email: 'wong@example.com',
                                option: 'Chief Patron',
                                payment_methods: ['Cash', 'Cheque'],
                                remarks: 'Special request for front row seating'
                            }
                        },
                        {
                            id: 2,
                            date: '2024-11-14',
                            name: 'Tan Mei Ling',
                            assembly_type: 'departed',
                            contact: '+60187654321',
                            amount: 1000.00,
                            status: 'pending',
                            details: {
                                nric: '850505-05-5678',
                                email: 'tan@example.com',
                                option: '1 Tablet (Individual)',
                                dedicatees: ['Late Father', 'Late Mother'],
                                departed_name: 'Tan Ah Seng, Lim Ah Mooi',
                                payment_methods: ['E-banking'],
                                remarks: ''
                            }
                        },
                        {
                            id: 3,
                            date: '2024-11-13',
                            name: 'Lee Wei Ming',
                            assembly_type: 'merit',
                            contact: '+60162345678',
                            amount: 1000.00,
                            status: 'completed',
                            details: {
                                nric: '900303-03-9012',
                                email: 'lee@example.com',
                                option: 'Perfect Meal',
                                wisdom_light: 'Family',
                                devas_offering: 'Individual',
                                payment_methods: ['Credit Card'],
                                remarks: 'Thank you for the blessings'
                            }
                        }
                    ];
                    
                    const foundData = sampleData.find(d => d.id == self.registrationId);
                    if (foundData) {
                        self.registrationData = {
                            ...foundData,
                            registration_code: `DA${String(foundData.id).padStart(6, '0')}`,
                            created_at: new Date().toISOString(),
                            assembly_date: '2024-12-25', // Sample dharma assembly date
                            reference_no: `DA${Math.floor(Math.random() * 90000) + 10000}`
                        };
                        resolve();
                    } else {
                        reject(new Error('Registration not found'));
                    }
                }, 500);
                
                // Actual API implementation:
                /*
                TempleAPI.get(`/dharma-assembly/${this.registrationId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.registrationData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load registration'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading registration'));
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
                                    temple_logo: self.templeSettings.temple_logo || ''
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
            
            // Navigate back to dharma-assembly list after opening print window
            setTimeout(() => {
                TempleRouter.navigate('dharma-assembly');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const registration = this.registrationData;
            const temple = this.templeSettings;
            
            // Generate token number based on date
            const tokenNumber = this.generateTokenNumber(registration.date);
            
            // Generate temple logo HTML
            const logoHTML = this.getTempleLogoHTML();
            
            // Format amount in words
            const amountInWords = this.numberToWords(registration.amount);
            
            // Get assembly type labels
            const assemblyTypeLabels = {
                'longevity': 'Prayer for Longevity',
                'departed': 'Prayer to The Departed',
                'merit': 'Merit Dedication'
            };
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Dharma Assembly Receipt - ${registration.registration_code}</title>
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
                            padding-top: 15px;
                        }
                        .assembly-type-header {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            color: var(--primary-color);
                            margin: 15px 0;
                            padding: 10px;
                            border: 2px solid var(--primary-color);
                            border-radius: 8px;
                        }
                        .registration-details {
                            margin: 20px 0;
                        }
                        .registration-details table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .registration-details td {
                            padding: 5px;
                            font-size: 14px;
                            border-bottom: 1px solid #f0f0f0;
                        }
                        .registration-details .label {
                            font-weight: bold;
                            width: 150px;
                        }
                        .token-circle {
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
                        .dharma-specific-section {
                            background-color: #f8f9fa;
                            padding: 15px;
                            margin: 20px 0;
                            border: 1px solid #dee2e6;
                            border-radius: 5px;
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
                        
                        <!-- Assembly Type Header -->
                        <div class="assembly-type-header">
                            ${assemblyTypeLabels[registration.assembly_type] || 'Dharma Assembly'}
                        </div>
                        
                        <!-- Registration Details -->
                        <div class="registration-details">
                            <table>
                                <tr>
                                    <td class="label">Receipt No.:</td>
                                    <td>${registration.registration_code || '-'}</td>
                                    <td class="label" style="text-align: right;">Date:</td>
                                    <td style="text-align: right; width: 100px;">${this.formatDate(registration.date)}</td>
                                </tr>
                                <tr>
                                    <td class="label">Assembly Date:</td>
                                    <td colspan="2">${this.formatDate(registration.assembly_date || registration.date)}</td>
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
                                        <strong>${registration.name || 'Name'}</strong><br>
                                        <small>NRIC: ${registration.details?.nric || '-'}</small>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Being payment of:</td>
                                    <td colspan="2">${assemblyTypeLabels[registration.assembly_type]} - ${registration.details?.option || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">The sum of Ringgit:</td>
                                    <td colspan="3">${amountInWords}</td>
                                </tr>
                                <tr>
                                    <td class="label">Amount:</td>
                                    <td><strong>RM ${this.formatCurrency(registration.amount)}</strong></td>
                                    <td class="label" style="text-align: right;">Payment Mode:</td>
                                    <td style="text-align: right;">${registration.details?.payment_methods?.join(', ') || 'Cash'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Contact:</td>
                                    <td>${registration.contact || '-'}</td>
                                    <td class="label" style="text-align: right;">Status:</td>
                                    <td style="text-align: right; text-transform: capitalize;">${registration.status || 'Pending'}</td>
                                </tr>
                                <tr>
                                    <td class="label">Ref No:</td>
                                    <td>${registration.reference_no || '-'}</td>
                                    <td class="label" style="text-align: right;">Email:</td>
                                    <td style="text-align: right;">${registration.details?.email || '-'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Assembly Specific Details -->
                        ${this.getAssemblySpecificHTML(registration)}
                        
                        <!-- Remarks Section -->
                        ${registration.details?.remarks ? `
                        <div class="dharma-specific-section">
                            <strong>Remarks:</strong><br>
                            ${registration.details.remarks}
                        </div>
                        ` : ''}
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <div style="border-bottom: 1px solid #000; width: 200px; float: right; margin-bottom: 5px;"></div>
                            <div style="clear: both; text-align: right; margin-right: 50px;">
                                <strong>DHARMA ASSEMBLY OFFICE</strong><br>
                                <small>Authorized Signature</small>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Auto focus print dialog
                        window.onload = function() {
                            setTimeout(() => {
                                // window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
        },
        
        getAssemblySpecificHTML: function(registration) {
            const details = registration.details || {};
            let html = '';
            
            if (registration.assembly_type === 'departed' && details.dedicatees) {
                html += `
                    <div class="dharma-specific-section">
                        <strong>Dedicatees:</strong><br>
                        ${details.dedicatees.join(', ')}<br>
                        ${details.departed_name ? `<strong>Names:</strong> ${details.departed_name}` : ''}
                    </div>
                `;
            } else if (registration.assembly_type === 'merit') {
                html += `
                    <div class="dharma-specific-section">
                        ${details.wisdom_light ? `<strong>Wisdom Light:</strong> ${details.wisdom_light}<br>` : ''}
                        ${details.devas_offering ? `<strong>Devas Offering:</strong> ${details.devas_offering}` : ''}
                    </div>
                `;
            }
            
            return html;
        },
        
        getTempleLogoHTML: function() {
            let logoHTML = '';
            if (this.templeSettings.temple_logo) {
                logoHTML = `<div class="temple-logo">
                    <img src="${this.templeSettings.temple_logo}" style="width:205px;height:80px;object-fit:contain;" alt="Temple Logo" />
                </div>`;
            } else {
                logoHTML = `
                    <div class="temple-logo" style="
                        width: 80px; 
                        height: 80px; 
                        background: var(--primary-color); 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        color: white; 
                        font-size: 12px;
                        text-align: center;
                    ">
                        DHARMA<br>ASSEMBLY
                    </div>
                `;
            }
            return logoHTML;
        },
        
        generateTokenNumber: function(date) {
            // Generate a dynamic token number based on date and registration ID
            const dateObj = new Date(date);
            const dayOfYear = Math.floor((dateObj - new Date(dateObj.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            return String(dayOfYear + parseInt(this.registrationId)).padStart(4, '0');
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