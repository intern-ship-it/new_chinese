// js/pages/special-occasions/print.js
// Special Occasions Booking Receipt Print Module - WITH INCLUDED SERVICES SUPPORT

(function ($, window) {
    'use strict';

    if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
            eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Special Occasions page registered: ${pageId}`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }

    window.SpecialOccasionsPrintPage = {
        bookingId: null,
        bookingData: null,
        templeSettings: null,
        pageId: 'occasions-print',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,

        init: function (params) {
            window.OccasionsSharedModule.registerPage(this.pageId);

            this.bookingId = params?.id || null;

            if (!this.bookingId) {
                TempleCore.showToast('Invalid booking ID', 'error');
                this.cleanup();
                TempleRouter.navigate('special-occasions');
                return;
            }

            console.log('Printing receipt for booking ID:', this.bookingId);
            this.loadAndPrint();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);
            window.OccasionsSharedModule.unregisterPage(this.pageId);
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
        },

        loadAndPrint: function () {
            const self = this;
            TempleCore.showLoading(true);

            Promise.all([
                this.loadBookingData(),
                this.loadTempleSettings()
            ])
                .then(function () {
                    self.openPrintWindow();
                })
                .catch(function (error) {
                    console.error('Error loading data:', error);
                    TempleCore.showToast(error.message || 'Error loading data', 'error');
                    self.cleanup();
                    TempleRouter.navigate('special-occasions');
                })
                .finally(function () {
                    TempleCore.showLoading(false);
                });
        },

        loadBookingData: function () {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get(`/special-occasions/bookings/${this.bookingId}`)
                    .done(function (response) {
                        if (response.success && response.data) {
                            self.bookingData = response.data;
                            console.log('Booking data loaded:', self.bookingData);
                            console.log('Included services:', self.bookingData.included_services);
                            console.log('Addon services:', self.bookingData.addon_services);
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Failed to load booking'));
                        }
                    })
                    .fail(function (xhr) {
                        console.error('API Error:', xhr);
                        reject(new Error('Error loading booking data'));
                    });
            });
        },

        loadTempleSettings: function () {
            const self = this;
            return new Promise((resolve) => {
                if (typeof TempleAPI !== 'undefined') {
                    TempleAPI.get('/settings?type=SYSTEM')
                        .done(function (response) {
                            if (response.success && response.data && response.data.values) {
                                self.templeSettings = response.data.values;
                                resolve();
                            } else {
                                self.fallbackToLocalStorage();
                                resolve();
                            }
                        })
                        .fail(function () {
                            self.fallbackToLocalStorage();
                            resolve();
                        });
                } else {
                    self.fallbackToLocalStorage();
                    resolve();
                }
            });
        },

        fallbackToLocalStorage: function () {
            const stored = JSON.parse(localStorage.getItem(APP_CONFIG?.STORAGE?.TEMPLE) || '{}');
            this.templeSettings = {
                temple_name: stored.name || 'Temple Name',
                temple_address: stored.address || 'Temple Address',
                temple_city: stored.city || '',
                temple_state: stored.state || '',
                temple_pincode: stored.pincode || '',
                temple_country: stored.country || 'Malaysia',
                temple_phone: stored.phone || '',
                temple_email: stored.email || ''
            };
        },

        openPrintWindow: function () {
            const printWindow = window.open('', '_blank');
            const self = this;

            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print receipt', 'warning');
                return;
            }

            const html = this.generatePrintHTML();

            printWindow.document.write(html);
            printWindow.document.close();

            setTimeout(() => {
                self.cleanup();
                TempleRouter.navigate('special-occasions');
            }, 100);
        },

        generatePrintHTML: function () {
            const booking = this.bookingData;
            const temple = this.templeSettings;

            const receiptNumber = booking.booking_number || booking.booking_code;
            const logoHTML = this.getTempleLogoHTML();

            // Extract values with fallbacks
            const bookingCode = booking.booking_number || booking.booking_code || '';
            const bookingDate = booking.booking_date || booking.event_date || new Date().toISOString();
            const devoteeNameEnglish = booking.name_english || '-';
            const devoteeNameChinese = booking.name_chinese || '';
            const devoteeNric = booking.nric || '-';
            const devoteeEmail = booking.email || '-';
            const devoteeContact = booking.contact_no || '-';
            const occasionName = booking.occasion_name || 'N/A';
            const occasionNameSecondary = booking.occasion_name_secondary || '';
            const optionName = booking.occasion_option || 'N/A';
            const optionNameSecondary = booking.occasion_option_secondary || '';
            const slotInfo = booking.slot_info || '';
            const packageAmount = parseFloat(booking.occasion_amount || booking.package_amount || 0);
            const paymentMethod = booking.payment_method || booking.payment_methods || 'Cash';
            const status = booking.booking_status || booking.status || 'Confirmed';
            const remarks = booking.remark || booking.remarks || booking.special_instructions || '';

            // ========================================================================
            // PROCESS INCLUDED SERVICES (Part of package - NO charge)
            // ========================================================================
            const includedServices = Array.isArray(booking.included_services) ? booking.included_services : [];
            const hasIncludedServices = includedServices.length > 0;

            console.log('Print: Included services count:', includedServices.length);

            // ========================================================================
            // PROCESS ADDON SERVICES (Separate services WITH charge)
            // ========================================================================
            const addonServices = Array.isArray(booking.addon_services) ? booking.addon_services : [];
            const hasAddons = addonServices.length > 0;

            console.log('Print: Addon services count:', addonServices.length);

            // Calculate amounts
            const addonTotal = addonServices.reduce((sum, addon) => {
                return sum + parseFloat(addon.total_price || addon.amount || addon.unit_price || 0);
            }, 0);

            const discountAmount = parseFloat(booking.discount_amount || 0);
            const depositAmount = parseFloat(booking.deposit_amount || 0);
            const subtotal = packageAmount + addonTotal;
            const totalAmount = subtotal - discountAmount;
            const balanceDue = totalAmount - depositAmount;

            const amountInWords = this.numberToWords(totalAmount);

            // Build addon services rows HTML
            let addonRowsHTML = '';
            if (hasAddons) {
                addonServices.forEach((addon, index) => {
                    const addonName = addon.service_name || addon.item_name || addon.name || 'Addon Service';
                    const addonNameSecondary = addon.service_name_secondary || addon.item_name_secondary || addon.name_secondary || '';
                    const addonQty = addon.quantity || 1;
                    const addonUnitPrice = parseFloat(addon.unit_price || addon.amount || addon.total_price || 0) / addonQty;
                    const addonTotalPrice = parseFloat(addon.total_price || addon.amount || addon.unit_price || 0);

                    addonRowsHTML += `
                <tr class="addon-row">
                    <td style="text-align: center;">${index + 2}</td>
                    <td>
                        <strong>${addonName}</strong>
                        ${addonNameSecondary ? '<br><span style="color:#666;font-size:12px;">' + addonNameSecondary + '</span>' : ''}
                        <br><small style="color:#17a2b8;"><i>🧩 Add-on Service</i></small>
                    </td>
                    <td style="text-align: center;">${addonQty}</td>
                    <td style="text-align: center;">RM ${this.formatCurrency(addonUnitPrice)}</td>
                    <td style="text-align: center;">RM ${this.formatCurrency(addonTotalPrice)}</td>
</tr>
            `;
                });
            }

            // ========================================================================
            // BUILD INCLUDED SERVICES HTML (for Package Details section)
            // ========================================================================
            let includedServicesHTML = '';
            if (hasIncludedServices) {
                const servicesList = includedServices.map(service => {
                    const serviceName = service.service_name || 'Service';
                    const serviceNameSecondary = service.service_name_secondary || '';
                    return `${serviceName}${serviceNameSecondary ? ' (' + serviceNameSecondary + ')' : ''}`;
                }).join(', ');

                includedServicesHTML = `
                <tr>
                    <td class="label">Included Services:</td>
                    <td colspan="3">
                        <span style="color: #28a745; font-weight: bold;">
                            ✓ ${servicesList}
                        </span>
                        <br><small style="color: #666; font-style: italic;">Part of package, no additional charge</small>
                    </td>
                </tr>
            `;
            }

            return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Special Occasions Receipt - ${bookingCode}</title>
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
                    margin-right: 20px;
                }
                .temple-info {
                    font-size: 13px;
                    line-height: 1.5;
                }
                .temple-name {
                    font-size: 21px;
                    font-weight: bold;
                    color: #ff00ff;
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
                .receipt-title-secondary {
                    font-size: 18px;
                    color: #666;
                    margin-top: 5px;
                }
                .receipt-details {
                    margin: 20px 0;
                }
                .receipt-details table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .receipt-details td {
                    padding: 8px 5px;
                    font-size: 14px;
                    border-bottom: 1px solid #f0f0f0;
                    vertical-align: top;
                }
                .receipt-details .label {
                    font-weight: bold;
                    width: 150px;
                }
                .amount-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 30px;
                }
                .amount-table th,
                .amount-table td {
                    border: 1px solid #dee2e6;
                    padding: 10px;
                    text-align: left;
                }
                .amount-table thead {
                    background-color: #f8f9fa;
                }
                .amount-table tbody tr.addon-row {
                    background-color: #e7f5f7;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .amount-table tbody tr.included-row {
                    background-color: #f1f9f5;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .amount-table tfoot {
                    background-color: #f8f9fa;
                    font-weight: bold;
                }
                .amount-highlight {
                    background: #f8f9fa;
                    border: 2px solid #800000;
                    padding: 15px;
                    text-align: center;
                    margin: 20px 0;
                    border-radius: 5px;
                }
                .amount-highlight .amount {
                    font-size: 24px;
                    font-weight: bold;
                    color: #800000;
                }
                .signature-section {
                    margin-top: 50px;
                    text-align: right;
                }
                .signature-line {
                    border-bottom: 1px solid #000;
                    width: 200px;
                    margin: 0 0 5px auto;
                }
                .footer-section {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                .services-summary-box {
                    background: #f1f9f5;
                    border: 2px solid #28a745;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .addon-summary-box {
                    background: #e7f5f7;
                    border: 2px solid #17a2b8;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .clear { clear: both; }
                @media print {
                    .btn, #controlButtons { display: none !important; }
                    body { margin: 0; padding: 10px; }
                    .addon-row, .included-row, .services-summary-box, .addon-summary-box {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
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
                    <div class="clear"></div>
                </div>
                
                <!-- Receipt Title -->
                <div class="receipt-title">
                    Special Occasions Receipt
                    <div class="receipt-title-secondary">特别场合收据</div>
                </div>
                
                <!-- Receipt Details -->
                <div class="receipt-details">
                    <table>
                        <tr>
                            <td class="label">Receipt No:</td>
                            <td><strong>${receiptNumber}</strong></td>
                            <td class="label" style="text-align: right;">Date:</td>
                            <td style="text-align: right; width: 120px;">${this.formatDate(bookingDate)}</td>
                        </tr>
                        <tr>
                            <td class="label">Booking Code:</td>
                            <td><strong>${bookingCode}</strong></td>
                            <td class="label" style="text-align: right;">Status:</td>
                            <td style="text-align: right;"><strong style="color: green;">${status}</strong></td>
                        </tr>
                        <tr>
                            <td class="label">Devotee Name:</td>
                            <td colspan="3">
                                <strong>${devoteeNameEnglish}</strong>
                                ${devoteeNameChinese ? '<br><strong>' + devoteeNameChinese + '</strong>' : ''}
                            </td>
                        </tr>
                        <tr>
                            <td class="label">NRIC No:</td>
                            <td>${devoteeNric}</td>
                            <td class="label" style="text-align: right;">Contact:</td>
                            <td style="text-align: right;">${devoteeContact}</td>
                        </tr>
                        <tr>
                            <td class="label">Email:</td>
                            <td colspan="3">${devoteeEmail}</td>
                        </tr>
                        <tr>
                            <td class="label">Payment Method:</td>
                            <td colspan="3">${this.getPaymentMethodDisplay(paymentMethod)}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Occasion Details -->
                <div class="receipt-details">
                    <table>
                        <tr>
                            <td class="label">Occasion:</td>
                            <td colspan="3">
                                <strong>${occasionName}</strong>
                                ${occasionNameSecondary ? '<br><span style="color:#666;">' + occasionNameSecondary + '</span>' : ''}
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Package Selected:</td>
                            <td colspan="3">
                                ${optionName}
                                ${optionNameSecondary ? '<br><span style="color:#666;">' + optionNameSecondary + '</span>' : ''}
                            </td>
                        </tr>
                        ${slotInfo ? `
                        <tr>
                            <td class="label">Time Slot:</td>
                            <td colspan="3">${slotInfo}</td>
                        </tr>
                        ` : ''}
                        ${includedServicesHTML}
                        ${remarks ? `
                        <tr>
                            <td class="label">Remarks:</td>
                            <td colspan="3" style="color:#666;">${remarks}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>
                
                <!-- Amount Details -->
                <table class="amount-table">
                    <thead>
                        <tr>
                            <th width="50" style="text-align: center;">No</th>
                            <th width="400">Description</th>
                            <th width="100" style="text-align: center;">Quantity</th>
                            <th width="100" style="text-align: center;">Unit Price</th>
                            <th width="100" style="text-align: center;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Main Package -->
                        <tr>
                            <td style="text-align: center;">1</td>
                            <td>
                                <strong>${occasionName}</strong><br>
                                ${optionName}
                                ${slotInfo ? '<br><small>' + slotInfo + '</small>' : ''}
                                ${hasIncludedServices ? '<br><small style="color:#28a745;"><i>✓ Includes: ' + includedServices.map(s => s.service_name).join(', ') + '</i></small>' : ''}
                            </td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: center;">RM ${this.formatCurrency(packageAmount)}</td>
                            <td style="text-align: center;">RM ${this.formatCurrency(packageAmount)}</td>
                        </tr>
                        
                        <!-- Addon Services -->
                        ${addonRowsHTML}
                        
                        ${hasAddons ? `
                        <!-- Subtotal Row -->
                        <tr style="background-color: #f0f0f0;">
                            <td colspan="4" style="text-align: right; padding-right: 10px;">
                                <strong>SUBTOTAL:</strong>
                            </td>
                            <td style="text-align: center;">
                                <strong>RM ${this.formatCurrency(subtotal)}</strong>
                            </td>
                        </tr>
                        ` : ''}
                        
                        ${discountAmount > 0 ? `
                        <!-- Discount Row -->
                        <tr style="background-color: #fff3cd;">
                            <td colspan="4" style="text-align: right; padding-right: 10px; color: #856404;">
                                <strong>DISCOUNT:</strong>
                            </td>
                            <td style="text-align: center; color: #dc3545;">
                                <strong>- RM ${this.formatCurrency(discountAmount)}</strong>
                            </td>
                        </tr>
                        ` : ''}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align: right; padding-right: 10px; font-size: 16px;">
                                <strong>TOTAL AMOUNT:</strong>
                            </td>
                            <td style="text-align: center; font-size: 16px;">
                                <strong>RM ${this.formatCurrency(totalAmount)}</strong>
                            </td>
                        </tr>
                        ${depositAmount > 0 ? `
                        <tr style="background-color: #e7f5f7;">
                            <td colspan="4" style="text-align: right; padding-right: 10px;">
                                <strong>DEPOSIT PAID:</strong>
                            </td>
                            <td style="text-align: center;">
                                <strong style="color: #17a2b8;">RM ${this.formatCurrency(depositAmount)}</strong>
                            </td>
                        </tr>
                        <tr style="background-color: #f8d7da;">
                            <td colspan="4" style="text-align: right; padding-right: 10px;">
                                <strong>BALANCE DUE:</strong>
                            </td>
                            <td style="text-align: center;">
                                <strong style="color: #dc3545;">RM ${this.formatCurrency(balanceDue)}</strong>
                            </td>
                        </tr>
                        ` : ''}
                    </tfoot>
                </table>
                
                <!-- Amount in Words -->
                <div class="receipt-details">
                    <table>
                        <tr>
                            <td><strong>Amount in Words:</strong> ${amountInWords}</td>
                        </tr>
                    </table>
                </div>
                
                ${hasIncludedServices ? `
                <!-- Included Services Summary -->
                <div class="services-summary-box">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td colspan="2" style="border-bottom: 2px solid #28a745; padding-bottom: 10px; margin-bottom: 10px;">
                                <strong style="font-size: 16px; color: #28a745;">
                                    ✓ Included Services (Part of Package - No Additional Charge)
                                </strong>
                            </td>
                        </tr>
                        ${includedServices.map((service, index) => {
                    const serviceName = service.service_name || 'Service';
                    const serviceNameSecondary = service.service_name_secondary || '';
                    return `
                                <tr>
                                    <td style="padding: 5px 10px;">
                                        ${index + 1}. ${serviceName}
                                        ${serviceNameSecondary ? '<br><span style="color:#666;font-size:12px;">' + serviceNameSecondary + '</span>' : ''}
                                    </td>
                                    <td style="text-align: right; padding: 5px 10px;">
                                        <strong style="color: #28a745;">INCLUDED</strong>
                                    </td>
                                </tr>
                            `;
                }).join('')}
                    </table>
                </div>
                ` : ''}
                
                ${hasAddons ? `
                <!-- Addon Services Summary -->
                <div class="addon-summary-box">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td colspan="2" style="border-bottom: 2px solid #17a2b8; padding-bottom: 10px; margin-bottom: 10px;">
                                <strong style="font-size: 16px; color: #17a2b8;">
                                    🧩 Add-on Services (Additional Services with Separate Charges)
                                </strong>
                            </td>
                        </tr>
                        ${addonServices.map((addon, index) => {
                    const addonName = addon.service_name || addon.item_name || addon.name || 'Addon Service';
                    const addonNameSecondary = addon.service_name_secondary || addon.item_name_secondary || addon.name_secondary || '';
                    const addonPrice = parseFloat(addon.total_price || addon.amount || addon.unit_price || 0);
                    return `
                                <tr>
                                    <td style="padding: 5px 10px;">
                                        ${index + 1}. ${addonName}
                                        ${addonNameSecondary ? '<br><span style="color:#666;font-size:12px;">' + addonNameSecondary + '</span>' : ''}
                                    </td>
                                    <td style="text-align: right; padding: 5px 10px;">
                                        <strong>RM ${this.formatCurrency(addonPrice)}</strong>
                                    </td>
                                </tr>
                            `;
                }).join('')}
                        <tr style="border-top: 2px solid #17a2b8;">
                            <td style="padding: 10px; font-size: 15px;">
                                <strong>Total Add-ons (${addonServices.length}):</strong>
                            </td>
                            <td style="text-align: right; padding: 10px;">
                                <strong style="font-size: 16px; color: #17a2b8;">RM ${this.formatCurrency(addonTotal)}</strong>
                            </td>
                        </tr>
                    </table>
                </div>
                ` : ''}
                
                <!-- Signature Section -->
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div style="margin-right: 50px;">
                        <strong>Authorized Signature</strong><br>
                        <small>Temple Administrator</small>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="footer-section">
                    <div><strong>May all your prayers be answered and blessings be upon you</strong></div>
                    <div style="margin-top: 5px;">愿您的所有祈祷得到回应,祝福降临于您</div>
                    <div style="margin-top: 15px;">
                        This is a computer-generated receipt. No signature required.
                    </div>
                    <div style="margin-top: 5px;">
                        Generated on: ${this.formatDateTime(new Date())}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
        },
        
        getTempleLogoHTML: function () {
            if (this.templeSettings.temple_logo) {
                return `<div class="temple-logo"><img src="${this.templeSettings.temple_logo}" style="width:120px;height:100px;object-fit:contain;padding-top:14px;" alt="Temple Logo" /></div>`;
            } else {
                return `
                    <div class="temple-logo" style="
                        width: 120px; 
                        height: 100px; 
                        border: 1px solid #ddd; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        background: #f5f5f5;
                    ">
                        <span style="font-size:12px;color:#666;">TEMPLE<br>LOGO</span>
                    </div>`;
            }
        },

        getPaymentMethodDisplay: function (method) {
            const methods = {
                'cash': 'Cash 现金',
                'Cash': 'Cash 现金',
                'cheque': 'Cheque 支票',
                'Cheque': 'Cheque 支票',
                'ebanking': 'E-banking 网上银行',
                'E-banking': 'E-banking 网上银行',
                'card': 'Credit/Debit Card 信用卡',
                'Card': 'Credit/Debit Card 信用卡',
                'duitnow': 'DuitNow (E-wallet) 电子钱包',
                'DuitNow': 'DuitNow (E-wallet) 电子钱包'
            };
            return methods[method] || method || 'Cash 现金';
        },

        formatCurrency: function (amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        formatDate: function (dateString) {
            const date = new Date(dateString);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        },

        formatDateTime: function (date) {
            return date.toLocaleString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        },

        numberToWords: function (amount) {
            if (amount === 0) return 'Zero Ringgit Only';

            const [whole, decimal = '00'] = parseFloat(amount).toFixed(2).split('.');
            let words = this.convertToWords(parseInt(whole));

            words = words + ' Ringgit';
            if (decimal !== '00') {
                words += ' and ' + decimal + '/100';
            }
            words += ' Only';

            return words;
        },

        convertToWords: function (num) {
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