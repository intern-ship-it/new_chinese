// js/pages/sales/invoices/print.js
// Sales Invoice Print View Page - with Packages and Addons sections

(function ($, window) {
    'use strict';

    window.SalesInvoicesPrintPage = {
        currentInvoiceId: null,
        currentInvoice: null,
        templeSettings: null,

        init: function (params) {
            const self = this;
            this.currentInvoiceId = params?.id || window.location.pathname.split('/').pop();

            if (!this.currentInvoiceId) {
                this.showError('Invoice ID not provided');
                return;
            }

            // Load temple settings first, then Invoice data
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function (response) {
                    if (response.success && response.data && response.data.values) {
                        const settings = response.data.values;
                        self.templeSettings = {
                            name: settings.temple_name || 'Temple Management System',
                            temple_name: settings.temple_name,
                            temple_logo: settings.temple_logo,
                            address: settings.temple_address || '',
                            temple_address: settings.temple_address,
                            city: settings.temple_city || '',
                            temple_city: settings.temple_city,
                            state: settings.temple_state || '',
                            temple_state: settings.temple_state,
                            pincode: settings.temple_pincode || '',
                            temple_pincode: settings.temple_pincode,
                            country: settings.temple_country || 'Malaysia',
                            temple_country: settings.temple_country,
                            phone: settings.temple_phone || '',
                            temple_phone: settings.temple_phone,
                            email: settings.temple_email || '',
                            temple_email: settings.temple_email,
                            gst: settings.temple_gst || '',
                            registration_no: settings.temple_registration_no || ''
                        };
                    } else {
                        self.loadFromLocalStorage();
                    }
                    // Load Invoice after settings are loaded
                    self.loadInvoice();
                })
                .fail(function () {
                    // Fallback and continue
                    self.loadFromLocalStorage();
                    self.loadInvoice();
                });
        },

        loadFromLocalStorage: function () {
            const settings = JSON.parse(localStorage.getItem('temple_settings') || '{}');
            const temple = JSON.parse(localStorage.getItem('temple') || '{}');

            this.templeSettings = {
                name: settings.temple_name || temple.name || 'Temple Management System',
                temple_name: settings.temple_name || temple.name,
                temple_logo: settings.temple_logo || settings.logo_url || temple.logo,
                address: settings.temple_address || temple.address || '',
                temple_address: settings.temple_address || temple.address,
                city: settings.temple_city || temple.city || '',
                temple_city: settings.temple_city || temple.city,
                state: settings.temple_state || temple.state || '',
                temple_state: settings.temple_state || temple.state,
                pincode: settings.temple_pincode || temple.pincode || '',
                temple_pincode: settings.temple_pincode || temple.pincode,
                country: settings.temple_country || temple.country || 'Malaysia',
                temple_country: settings.temple_country || temple.country,
                phone: settings.temple_phone || temple.phone || '',
                temple_phone: settings.temple_phone || temple.phone,
                email: settings.temple_email || temple.email || '',
                temple_email: settings.temple_email || temple.email,
                gst: settings.temple_gst || '',
                registration_no: settings.temple_registration_no || ''
            };
        },

        loadInvoice: function () {
            const self = this;

            TempleAPI.get('/sales/invoices/' + this.currentInvoiceId)
                .done(function (response) {
                    if (response.success) {
                        self.currentInvoice = response.data;
                        self.renderPrintView();
                        // Auto trigger print dialog after a short delay
                        setTimeout(function () {
                            window.print();
                        }, 500);
                    } else {
                        self.showError('Failed to load invoice');
                    }
                })
                .fail(function () {
                    self.showError('Failed to load invoice');
                });
        },

        /**
         * Separate items into packages and addons
         */
        separateItems: function (items) {
            const packages = [];
            const addons = [];

            if (!items || !Array.isArray(items)) {
                return { packages, addons };
            }

            items.forEach(item => {
                // Check if it's a package or addon
                if (item.item_type === 'package' || item.is_addon === false) {
                    packages.push(item);
                } else {
                    addons.push(item);
                }
            });

            return { packages, addons };
        },

        renderPrintView: function () {
            const invoice = this.currentInvoice;
            const temple = this.templeSettings;

            // Separate items into packages and addons
            const { packages, addons } = this.separateItems(invoice.items);

            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 1px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }

            // Customer details logic from view.js
            const customerName = invoice.customer?.name || invoice.devotee?.english_name || invoice.devotee?.customer_name || 'Walk-in Customer';
            const customerMobile = invoice.customer?.mobile || invoice.devotee?.mobile_1 || '';
            const customerEmail = invoice.customer?.email || invoice.devotee?.email_1 || '';
            const customerAddress = invoice.customer?.address || invoice.devotee?.address_1 || 'Same as above';

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sales Invoice - ${invoice.invoice_number}</title>
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
                                size: A4;
                                margin: 15mm;
                            }
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                            line-height: 1.4;
                            color: #000;
                        }
                        
                        .container {
                            max-width: 750px;
                            margin: 0 auto;
                        }
                        
                        .header-table {
                            width: 100%;
                            margin-bottom: 20px;
                        }
                        
                        .header-table td {
                            vertical-align: top;
                            padding: 5px;
                        }
                        
                        .temple-name {
                            font-size: 21px;
                            font-weight: bold;
                            color: #ff00ff;
                        }
                        
                        .temple-info {
                            font-size: 13px;
                            line-height: 1.5;
                        }
                        
                        .title-section {
                            border-top: 2px solid #c2c2c2;
                            border-bottom: 2px solid #c2c2c2;
                            margin: 20px 0;
                            padding: 15px 0;
                            text-align: center;
                        }
                        
                        .document-title {
                            font-size: 24px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        
                        .info-table {
                            width: 100%;
                            margin: 20px 0;
                            border-collapse: collapse;
                        }
                        
                        .info-table td {
                            padding: 8px 5px;
                            font-size: 14px;
                        }
                        
                        .info-label {
                            font-weight: bold;
                            width: 150px;
                        }
                        
                        .supplier-section {
                            border: 1px solid #ddd;
                            padding: 15px;
                            margin: 20px 0;
                            background: #f9f9f9;
                        }
                        
                        .supplier-title {
                            font-weight: bold;
                            font-size: 16px;
                            margin-bottom: 10px;
                            color: #333;
                        }
                        
                        .section-header {
                            background: #f5f5f5;
                            padding: 10px 15px;
                            margin: 20px 0 10px 0;
                            border-left: 4px solid #337ab7;
                            font-weight: bold;
                            font-size: 14px;
                        }
                        
                        .section-header.addons {
                            border-left-color: #17a2b8;
                        }
                        
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        
                        .items-table thead td {
                            border-top: 2px solid black;
                            border-bottom: 2px solid black;
                            padding: 8px;
                            font-weight: bold;
                            font-size: 13px;
                            background: #f5f5f5;
                        }
                        
                        .items-table tbody td {
                            padding: 8px;
                            font-size: 12px;
                            border-bottom: 1px solid #ddd;
                        }
                        
                        .items-table .no-items td {
                            text-align: center;
                            color: #666;
                            font-style: italic;
                            padding: 15px;
                        }
                        
                        .total-section {
                            margin-top: 20px;
                            border-top: 2px solid #000;
                            padding-top: 10px;
                        }
                        
                        .total-table {
                            width: 100%;
                            margin-top: 10px;
                        }
                        
                        .total-table td {
                            padding: 5px;
                            font-size: 14px;
                        }
                        
                        .grand-total {
                            font-size: 16px;
                            font-weight: bold;
                            border-top: 2px solid #000;
                            border-bottom: 3px double #000;
                            padding: 10px 5px;
                        }
                        
                        .terms-section {
                            margin-top: 30px;
                            padding: 15px;
                            border: 1px solid #ddd;
                            background: #f9f9f9;
                        }
                        
                        .signature-section {
                            margin-top: 50px;
                            width: 100%;
                        }
                        
                        .signature-box {
                            width: 200px;
                            border-top: 2px solid #000;
                            padding-top: 5px;
                            text-align: center;
                            font-size: 14px;
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

                        .status-badge {
                            padding: 3px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                            display: inline-block;
                        }
                        
                        .status-unpaid { background: #dc3545; color: white; }
                        .status-partial { background: #ffc107; color: #000; }
                        .status-paid { background: #28a745; color: white; }
                        .status-overdue { background: #dc3545; color: white; }
                        .status-cancelled { background: #6c757d; color: white; }
                        
                        .type-badge {
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 10px;
                            font-weight: bold;
                        }
                        
                        .type-product { background: #6c757d; color: white; }
                        .type-sales-item { background: #17a2b8; color: white; }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="750" align="center" id="controlButtons" style="margin-bottom: 20px;">
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
                    
                    <div class="container">
                        <!-- Header with Temple Info -->
                        <table class="header-table">
                            <tr>
                                <td width="120">
                                    ${logoHTML}
                                </td>
                                <td class="temple-info" style="padding-left: 20px;">
                                    <div class="temple-name">${temple.temple_name || temple.name || 'Temple Name'}</div>
                                    ${temple.temple_address || temple.address || 'Temple Address'}<br>
                                    ${temple.temple_city || temple.city || 'City'}, ${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}<br>
                                    ${temple.temple_country || temple.country || 'Malaysia'}<br>
                                    ${temple.temple_phone ? 'Tel: ' + temple.temple_phone : ''}<br>
                                    ${temple.temple_email ? 'Email: ' + temple.temple_email : ''}<br>
                                    ${temple.gst ? 'GST No: ' + temple.gst : ''}
                                </td>
                            </tr>
                        </table>
                        
                        <!-- Title -->
                        <div class="title-section">
                            <div class="document-title">SALES INVOICE</div>
                        </div>
                        
                        <!-- Document Details -->
                        <table class="info-table">
                            <tr>
                                <td class="info-label">Invoice Number:</td>
                                <td><strong>${invoice.invoice_number}</strong></td>
                                <td class="info-label">Date:</td>
                                <td>${this.formatDate(invoice.invoice_date)}</td>
                            </tr>
                            <tr>
                                <td class="info-label">SO Reference:</td>
                                <td>${invoice.sales_order ? invoice.sales_order.order_number : (invoice.sales_order_id || '-')}</td>
                                <td class="info-label">Customer Ref:</td>
                                <td>${invoice.customer_invoice_no || '-'}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Status:</td>
                                <td>${this.getPaymentStatusBadge(invoice.payment_status || 'UNPAID')}</td>
                                <td class="info-label">Due Date:</td>
                                <td>${invoice.payment_due_date ? this.formatDate(invoice.payment_due_date) : '-'}</td>
                            </tr>
                        </table>
                        
                        <!-- Bill To Section -->
                        <div class="supplier-section">
                            <div class="supplier-title">Bill To:</div>
                            <strong>${customerName}</strong><br>
                            ${customerMobile ? customerMobile + '<br>' : ''}
                            ${customerEmail ? customerEmail + '<br>' : ''}
                            <div style="margin-top: 10px;">
                                <strong>Address:</strong><br>
                                ${customerAddress}
                            </div>
                        </div>
                        
                        <!-- Packages Section -->
                        <div class="section-header">
                            PACKAGES (${packages.length} item${packages.length !== 1 ? 's' : ''})
                        </div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <td width="40" align="center">S.No</td>
                                    <td width="180">Package</td>
                                    <td>Description</td>
                                    <td align="center" width="60">Qty</td>
                                    <td align="right" width="80">Tax</td>
                                    <td align="right" width="80">Amount</td>
                                    <td align="right" width="70">Discount</td>
                                    <td align="right" width="90">Total</td>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderPackagesRows(packages)}
                            </tbody>
                        </table>
                        
                        <!-- Addons Section -->
                        <div class="section-header addons">
                            ADDONS (${addons.length} item${addons.length !== 1 ? 's' : ''})
                        </div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <td width="40" align="center">S.No</td>
                                    <td width="180">Item / Addon</td>
                                    <td width="80">Type</td>
                                    <td align="center" width="60">Qty</td>
                                    <td align="right" width="80">Price</td>
                                    <td align="right" width="70">Tax</td>
                                    <td align="right" width="70">Discount</td>
                                    <td align="right" width="90">Total</td>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderAddonsRows(addons)}
                            </tbody>
                        </table>
                        
                        <!-- Totals Section -->
                        <div class="total-section">
                            <table class="total-table">
                                <tr>
                                    <td width="60%"></td>
                                    <td width="25%" align="right">Subtotal:</td>
                                    <td width="15%" align="right">${this.formatCurrency(invoice.subtotal)}</td>
                                </tr>
                                ${parseFloat(invoice.total_tax) > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Total Tax:</td>
                                    <td align="right">${this.formatCurrency(invoice.total_tax)}</td>
                                </tr>
                                ` : ''}
                                ${parseFloat(invoice.discount_amount) > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Discount:</td>
                                    <td align="right">-${this.formatCurrency(invoice.discount_amount)}</td>
                                </tr>
                                ` : ''}
                                ${parseFloat(invoice.shipping_charges) > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Shipping Charges:</td>
                                    <td align="right">${this.formatCurrency(invoice.shipping_charges)}</td>
                                </tr>
                                ` : ''}
                                ${parseFloat(invoice.other_charges) > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Other Charges:</td>
                                    <td align="right">${this.formatCurrency(invoice.other_charges)}</td>
                                </tr>
                                ` : ''}
                                <tr class="grand-total">
                                    <td></td>
                                    <td align="right"><strong>Grand Total:</strong></td>
                                    <td align="right"><strong>${this.formatCurrency(invoice.total_amount)}</strong></td>
                                </tr>
                                
                                ${parseFloat(invoice.paid_amount) > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Amount Paid:</td>
                                    <td align="right" style="color: green;">${this.formatCurrency(invoice.paid_amount)}</td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td align="right"><strong>Balance Due:</strong></td>
                                    <td align="right" style="color: red;"><strong>${this.formatCurrency(invoice.balance_amount)}</strong></td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        
                        <!-- Notes / Terms -->
                        ${invoice.notes ? `
                        <div class="terms-section">
                            <strong>Notes:</strong><br>
                            ${invoice.notes.replace(/\n/g, '<br>')}
                        </div>
                        ` : ''}
                        
                        ${invoice.terms_conditions ? `
                        <div class="terms-section">
                            <strong>Terms & Conditions:</strong><br>
                            ${invoice.terms_conditions.replace(/\n/g, '<br>')}
                        </div>
                        ` : ''}
                        
                        <!-- Signature Section -->
                        <div class="signature-section">
                            <table width="100%">
                                <tr>
                                    <td align="center">
                                        <div class="signature-box">
                                            Authorized Signature
                                        </div>
                                    </td>
                                    <td align="center">
                                        <div class="signature-box">
                                            Customer Signature
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Replace document content
            document.open();
            document.write(html);
            document.close();
        },

        renderPackagesRows: function (packages) {
            if (!packages || packages.length === 0) {
                return '<tr class="no-items"><td colspan="8">No packages added</td></tr>';
            }

            return packages.map((item, index) => {
                const itemName = item.package?.package_name || item.package?.name || item.description || 'Package';

                return `
                    <tr>
                        <td align="center">${index + 1}</td>
                        <td><strong>${itemName}</strong></td>
                        <td>${item.description || '-'}</td>
                        <td align="center">${parseFloat(item.quantity)}</td>
                        <td align="right">${this.formatCurrency(item.tax_amount || 0)}</td>
                        <td align="right">${this.formatCurrency(item.unit_price)}</td>
                        <td align="right">${parseFloat(item.discount_amount) > 0 ? this.formatCurrency(item.discount_amount) : '-'}</td>
                        <td align="right"><strong>${this.formatCurrency(item.total_amount)}</strong></td>
                    </tr>
                `;
            }).join('');
        },

        renderAddonsRows: function (addons) {
            if (!addons || addons.length === 0) {
                return '<tr class="no-items"><td colspan="8">No addons added</td></tr>';
            }

            return addons.map((item, index) => {
                const itemName = item.product?.name ||
                    item.sales_item?.name_primary || item.sales_item?.name ||
                    item.sale_item?.name_primary || item.sale_item?.name ||
                    item.description || 'Item';
                const uom = item.uom?.name || '';
                const itemType = item.item_type === 'product' ? 'Product' : 'Sales Item';
                const typeClass = item.item_type === 'product' ? 'type-product' : 'type-sales-item';

                return `
                    <tr>
                        <td align="center">${index + 1}</td>
                        <td>
                            <strong>${itemName}</strong>
                            ${item.description && item.description !== itemName ? `<br><small style="color:#666">${item.description}</small>` : ''}
                        </td>
                        <td><span class="type-badge ${typeClass}">${itemType}</span></td>
                        <td align="center">${parseFloat(item.quantity)}${uom ? ' ' + uom : ''}</td>
                        <td align="right">${this.formatCurrency(item.unit_price)}</td>
                        <td align="right">${this.formatCurrency(item.tax_amount || 0)}</td>
                        <td align="right">${parseFloat(item.discount_amount) > 0 ? this.formatCurrency(item.discount_amount) : '-'}</td>
                        <td align="right"><strong>${this.formatCurrency(item.total_amount)}</strong></td>
                    </tr>
                `;
            }).join('');
        },

        getPaymentStatusBadge: function (status) {
            const statusMap = {
                'UNPAID': 'unpaid',
                'PARTIAL': 'partial',
                'PAID': 'paid',
                'OVERDUE': 'overdue',
                'CANCELLED': 'cancelled'
            };
            const statusClass = `status-${statusMap[status] || 'cancelled'}`;
            return `<span class="status-badge ${statusClass}">${status}</span>`;
        },

        formatDate: function (date, includeTime = false) {
            if (!date) return '-';

            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();

            if (includeTime) {
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} ${hours}:${minutes}`;
            }

            return `${day}/${month}/${year}`;
        },

        formatCurrency: function (amount) {
            if (!amount && amount !== 0) return '0.00';

            const currency = localStorage.getItem('temple_currency') || 'MYR';
            const symbol = currency === 'MYR' ? 'RM' : currency === 'INR' ? '₹' : '$';

            return symbol + ' ' + parseFloat(amount).toFixed(2);
        },

        showError: function (message) {
            document.body.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3 style="color: #dc3545;">Error</h3>
                    <p>${message}</p>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close Window
                    </button>
                </div>
            `;
        }
    };

})(jQuery, window);