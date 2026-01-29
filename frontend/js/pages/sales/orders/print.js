// js/pages/sales/orders/print.js
// Sales Order Print View Page (Styled like Purchase Order)

(function ($, window) {
    'use strict';

    window.SalesOrdersPrintPage = {
        currentSoId: null,
        currentSo: null,
        templeSettings: null,

        init: function (params) {
            const self = this;
            this.currentSoId = params?.id || window.location.pathname.split('/').pop();

            if (!this.currentSoId) {
                this.showError('Sales Order ID not provided');
                return;
            }

            // Load temple settings first, then SO data
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
                    // Load SO after settings are loaded
                    self.loadSalesOrder();
                })
                .fail(function () {
                    // Fallback and continue
                    self.loadFromLocalStorage();
                    self.loadSalesOrder();
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

        loadSalesOrder: function () {
            const self = this;

            TempleAPI.get('/sales/orders/' + this.currentSoId)
                .done(function (response) {
                    if (response.success) {
                        self.currentSo = response.data;
                        self.renderPrintView();
                        // Auto trigger print dialog after a short delay
                        setTimeout(function () {
                            window.print();
                        }, 500);
                    } else {
                        self.showError('Failed to load sales order');
                    }
                })
                .fail(function () {
                    self.showError('Failed to load sales order');
                });
        },

        renderPrintView: function () {
            const so = this.currentSo;
            const temple = this.templeSettings;

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

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sales Order - ${so.so_number}</title>
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
                        
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 30px 0;
                        }
                        
                        .items-table thead td {
                            border-top: 2px solid black;
                            border-bottom: 2px solid black;
                            padding: 8px;
                            font-weight: bold;
                            font-size: 14px;
                            background: #f5f5f5;
                        }
                        
                        .items-table tbody td {
                            padding: 8px;
                            font-size: 13px;
                            border-bottom: 1px solid #ddd;
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
                        
                        .status-draft { background: #6c757d; color: white; }
                        .status-pending_approval { background: #ffc107; color: #000; }
                        .status-approved { background: #28a745; color: white; }
                        .status-rejected { background: #dc3545; color: white; }
                        .status-cancelled { background: #343a40; color: white; }
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
                            <div class="document-title">SALES ORDER</div>
                        </div>
                        
                        <!-- Document Details -->
                        <table class="info-table">
                            <tr>
                                <td class="info-label">SO Number:</td>
                                <td><strong>${so.so_number}</strong></td>
                                <td class="info-label">Date:</td>
                                <td>${this.formatDate(so.so_date)}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Quotation Ref:</td>
                                <td>${so.quotation_ref || '-'}</td>
                                <td class="info-label">Status:</td>
                                <td>${this.getStatusBadge(so.status || 'DRAFT')}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Delivery Date:</td>
                                <td>${so.delivery_date ? this.formatDate(so.delivery_date) : '-'}</td>
                                <td class="info-label">Payment Terms:</td>
                                <td>${so.payment_terms || '-'}</td>
                            </tr>
                        </table>
                        
                        <!-- Bill To Section -->
                        <div class="supplier-section">
                            <div class="supplier-title">Bill To:</div>
                            <strong>${so.devotee?.customer_name || 'Generic Customer'}</strong><br>
                            ${so.devotee?.mobile || ''}<br>
                            ${so.devotee?.email || ''}<br>
                            <div style="margin-top: 10px;">
                                <strong>Delivery Address:</strong><br>
                                ${so.delivery_address || 'Same as above'}
                            </div>
                        </div>
                        
                        <!-- Items Table -->
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <td width="50" align="center">S.No</td>
                                    <td>Description</td>
                                    <td align="center" width="80">Qty</td>
                                    <!-- <td align="center" width="80">UOM</td> -->
                                    <td align="right" width="100">Unit Price</td>
                                    <!-- <td align="right" width="80">Tax</td> -->
                                    <td align="right" width="80">Discount</td>
                                    <td align="right" width="100">Total</td>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderItemsRows(so.items)}
                            </tbody>
                        </table>
                        
                        <!-- Totals Section -->
                        <div class="total-section">
                            <table class="total-table">
                                <tr>
                                    <td width="60%"></td>
                                    <td width="25%" align="right">Subtotal:</td>
                                    <td width="15%" align="right">${this.formatCurrency(so.subtotal)}</td>
                                </tr>
                                ${so.total_tax > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Total Tax:</td>
                                    <td align="right">${this.formatCurrency(so.total_tax)}</td>
                                </tr>
                                ` : ''}
                                ${so.discount_amount > 0 ? `
                                <tr>
                                    <td></td>
                                    <td align="right">Discount:</td>
                                    <td align="right">-${this.formatCurrency(so.discount_amount)}</td>
                                </tr>
                                ` : ''}
                                <tr class="grand-total">
                                    <td></td>
                                    <td align="right"><strong>Grand Total:</strong></td>
                                    <td align="right"><strong>${this.formatCurrency(so.total_amount)}</strong></td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Notes -->
                        ${so.internal_notes ? `
                        <div class="terms-section">
                            <strong>Notes:</strong><br>
                            ${so.internal_notes.replace(/\n/g, '<br>')}
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

        renderItemsRows: function (items) {
            if (!items || items.length === 0) {
                return '<tr><td colspan="6" align="center" style="padding: 20px;">No items found</td></tr>';
            }

            return items.map((item, index) => {
                const description = item.description ||
                    item.product?.name ||
                    item.sale_item?.name_primary ||
                    'Item';

                return `
                    <tr>
                        <td align="center">${index + 1}</td>
                        <td>
                            <strong>${description}</strong>
                        </td>
                        <td align="center">${item.quantity}</td>
                        <td align="right">${this.formatCurrency(item.unit_price)}</td>
                        <td align="right">${item.discount_amount > 0 ? this.formatCurrency(item.discount_amount) : '-'}</td>
                        <td align="right"><strong>${this.formatCurrency(item.total_amount)}</strong></td>
                    </tr>
                `;
            }).join('');
        },

        getStatusBadge: function (status) {
            const statusClass = `status-${status.toLowerCase()}`;
            const statusText = status.replace(/_/g, ' ');
            return `<span class="status-badge ${statusClass}">${statusText}</span>`;
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
