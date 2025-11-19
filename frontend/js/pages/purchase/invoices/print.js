// js/pages/purchase/invoices/print.js
// Purchase Invoice Print Page - Opens in new tab with professional invoice format

(function($, window) {
    'use strict';
    
    window.PurchaseInvoicesPrintPage = {
        invoiceId: null,
        invoiceData: null,
        templeSettings: null,
        
        init: function(params) {
            this.invoiceId = params?.id;
            
            if (!this.invoiceId) {
                TempleCore.showToast('Invalid invoice ID', 'error');
                TempleRouter.navigate('purchase/invoice');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load both invoice data and temple settings
            Promise.all([
                this.loadInvoiceData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('purchase/invoices');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadInvoiceData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get(`/purchase/invoices/${this.invoiceId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.invoiceData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load invoice'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading invoice'));
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
                                gst_no: self.templeSettings.temple_gst_no || '',
                                registration_no: self.templeSettings.temple_registration_no || ''
                            }));
                            
                            resolve();
                        } else {
                            // Fallback to localStorage
                            self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                            resolve();
                        }
                    })
                    .fail(function() {
                        // Fallback to localStorage
                        self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                        resolve();
                    });
            });
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow popups for printing', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Navigate back to invoice view after opening print window
            setTimeout(() => {
                TempleRouter.navigate('purchase/invoice');
            }, 100);
        },
        
        generatePrintHTML: function() {
            const invoice = this.invoiceData;
            const temple = this.templeSettings;
            const currencySymbol = TempleCore.getCurrency();
            // Generate items table
            const itemsHTML = this.generateItemsTable(invoice.items || []);
            
            // Payment history table
            const paymentsHTML = this.generatePaymentsTable(invoice.payments || []);
            
            // Calculate totals
            const subtotal = parseFloat(invoice.subtotal || 0);
            const totalTax = parseFloat(invoice.total_tax || 0);
            const shippingCharges = parseFloat(invoice.shipping_charges || 0);
            const otherCharges = parseFloat(invoice.other_charges || 0);
            const discountAmount = parseFloat(invoice.discount_amount || 0);
            const totalAmount = parseFloat(invoice.total_amount || 0);
            const paidAmount = parseFloat(invoice.paid_amount || 0);
            const balanceAmount = parseFloat(invoice.balance_amount || 0);
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width: 276px;height: 119px;object-fit:contain;padding-top: 9px;" alt="Temple Logo" />`;
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
    <title>Purchase Invoice - ${invoice.invoice_number}</title>
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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            line-height: 1.6;
            color: #333;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
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
            background-color: #007bff;
            border-color: #007bff;
        }
        
        .btn-info {
            color: #fff;
            background-color: #17a2b8;
            border-color: #17a2b8;
        }
        
        .btn:hover {
            opacity: 0.9;
        }
        
        .header-section {
            border-bottom: 3px solid #000000ff;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        
        .temple-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        
    
        
  
        
        .invoice-title {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .info-block {
            flex: 1;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            margin: 0 10px;
        }
        
        .info-block:first-child {
            margin-left: 0;
        }
        
        .info-block:last-child {
            margin-right: 0;
        }
        
        .info-block h3 {
            color: #000000ff;
            border-bottom: 2px solid #000000ff;
            padding-bottom: 5px;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .info-row {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .info-label {
            font-weight: bold;
            color: #666;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th {
      
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .items-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .totals-section {
            margin-left: auto;
            width: 350px;
            margin-top: 20px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .total-row.grand-total {
      
            font-size: 18px;
            font-weight: bold;
     
            padding: 12px 0;
            margin-top: 10px;
        }
        
        .payment-status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .status-paid {
            background: #d4edda;
            color: #155724;
        }
        
        .status-partial {
            background: #cce5ff;
            color: #004085;
        }
        
        .status-unpaid {
            background: #f8d7da;
            color: #721c24;
        }
        
        .notes-section {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .notes-section h4 {
            color: #666;
            margin-bottom: 10px;
        }
        
        .footer-section {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #dee2e6;
        }
        
        .signature-box {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
        }
        
        .signature-item {
            text-align: center;
            width: 200px;
        }
        
        .signature-line {
            border-top: 2px solid #333;
            margin-bottom: 5px;
        }
        
        .grn-info {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
        }
        
        .payment-history {
            margin-top: 30px;
            page-break-inside: avoid;
        }
        
        .payment-history h4 {
            color: #000000ff;
            border-bottom: 2px solid #000000ff;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .no-print {
            margin-bottom: 20px;
            text-align: center;
        }
        
        @media screen {
            .invoice-container {
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
                border: 1px solid #dee2e6;
            }
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
    </style>
</head>
<body>
    <!-- Control Buttons -->
    <div class="no-print">
        <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
        <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
    </div>
    
    <div class="">
        <!-- Header Section -->
        <table class="header-table">
                    <tr>
                        <td width="120">
                            ${logoHTML}
                        </td>
                        <td class="temple-info">
                            <div class="temple-name">${temple.temple_name || temple.name || 'Temple Name'}</div>
                            ${temple.temple_address || temple.address || 'Temple Address'}<br>
                            ${temple.temple_city || temple.city || 'City'}, ${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}<br>
                            ${temple.temple_country || temple.country || 'India'}<br>
                            ${temple.temple_phone ? 'Tel: ' + temple.temple_phone : ''}<br>
                            ${temple.temple_email ? 'E-mail: ' + temple.temple_email : ''}
                        </td>
                    </tr>
                </table>
        
        <!-- Invoice Title -->
        <div class="invoice-title">PURCHASE INVOICE</div>
        
        <!-- Invoice Information Section -->
        <div class="info-section">
            <div class="info-block">
                <h3>Invoice Details</h3>
                <div class="info-row">
                    <span class="info-label">Invoice No:</span> ${invoice.invoice_number}
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span> ${this.formatDate(invoice.invoice_date)}
                </div>
                <div class="info-row">
                    <span class="info-label">Due Date:</span> ${invoice.payment_due_date ? this.formatDate(invoice.payment_due_date) : 'N/A'}
                </div>
                <div class="info-row">
                    <span class="info-label">Supplier Invoice:</span> ${invoice.supplier_invoice_no || 'N/A'}
                </div>
                <div class="info-row">
                    <span class="info-label">Payment Status:</span> 
                    <span class="payment-status status-${invoice.payment_status.toLowerCase()}">${invoice.payment_status}</span>
                </div>
            </div>
            
            <div class="info-block">
                <h3>Supplier Details</h3>
                <div class="info-row">
                    <strong>${invoice.supplier?.name || 'N/A'}</strong>
                </div>
                ${invoice.supplier?.address ? `<div class="info-row">${invoice.supplier.address}</div>` : ''}
                ${invoice.supplier?.gst_no ? `<div class="info-row"><span class="info-label">GST:</span> ${invoice.supplier.gst_no}</div>` : ''}
                ${invoice.supplier?.mobile_no ? `<div class="info-row"><span class="info-label">Contact:</span> ${invoice.supplier.mobile_no}</div>` : ''}
                ${invoice.supplier?.email ? `<div class="info-row"><span class="info-label">Email:</span> ${invoice.supplier.email}</div>` : ''}
            </div>
            
            <div class="info-block">
                <h3>Reference Details</h3>
                ${invoice.po_id ? `
                    <div class="info-row">
                        <span class="info-label">PO Number:</span> ${invoice.purchase_order?.po_number || 'N/A'}
                    </div>
                    <div class="info-row">
                        <span class="info-label">PO Date:</span> ${invoice.purchase_order?.po_date ? this.formatDate(invoice.purchase_order.po_date) : 'N/A'}
                    </div>
                ` : '<div class="info-row">Direct Purchase (No PO)</div>'}
                <div class="info-row">
                    <span class="info-label">Type:</span> ${invoice.invoice_type === 'PO_BASED' ? 'PO Based' : 'Direct'}
                </div>
                ${invoice.grn_required ? `
                    <div class="grn-info">
                        <strong>GRN Status:</strong> ${invoice.grn_status}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Items Table -->
        <h3 style="color: #666; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Item Details</h3>
        ${itemsHTML}
        
        <!-- Totals Section -->
        <div class="totals-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${currencySymbol} ${this.formatCurrency(subtotal)}</span>
            </div>
            ${totalTax > 0 ? `
                <div class="total-row">
                    <span>Total Tax:</span>
                    <span>${currencySymbol} ${this.formatCurrency(totalTax)}</span>
                </div>
            ` : ''}
            ${shippingCharges > 0 ? `
                <div class="total-row">
                    <span>Shipping Charges:</span>
                    <span>${currencySymbol} ${this.formatCurrency(shippingCharges)}</span>
                </div>
            ` : ''}
            ${otherCharges > 0 ? `
                <div class="total-row">
                    <span>Other Charges:</span>
                    <span>${currencySymbol} ${this.formatCurrency(otherCharges)}</span>
                </div>
            ` : ''}
            ${discountAmount > 0 ? `
                <div class="total-row">
                    <span>Discount:</span>
                    <span style="color: red;">-${currencySymbol} ${this.formatCurrency(discountAmount)}</span>
                </div>
            ` : ''}
            <div class="total-row grand-total">
                <span>Total Amount:</span>
                <span>${currencySymbol} ${this.formatCurrency(totalAmount)}</span>
            </div>
            ${invoice.payment_status !== 'UNPAID' ? `
                <div class="total-row">
                    <span>Paid Amount:</span>
                    <span style="color: green;">${currencySymbol} ${this.formatCurrency(paidAmount)}</span>
                </div>
                <div class="total-row">
                    <span>Balance Due:</span>
                    <span style="color: ${balanceAmount > 0 ? 'red' : 'green'};">${currencySymbol} ${this.formatCurrency(balanceAmount)}</span>
                </div>
            ` : ''}
        </div>
        
        <!-- Payment History -->
        ${paymentsHTML}
        
        <!-- Terms and Notes -->
        ${(invoice.terms_conditions || invoice.notes) ? `
            <div class="notes-section">
                ${invoice.terms_conditions ? `
                    <h4>Terms & Conditions</h4>
                    <p>${invoice.terms_conditions}</p>
                ` : ''}
                ${invoice.notes ? `
                    <h4>Notes</h4>
                    <p>${invoice.notes}</p>
                ` : ''}
            </div>
        ` : ''}
        
    
    </div>
    
    <script>
        // Auto-print on load if needed
        // window.addEventListener('load', function() {
        //     window.print();
        // });
    </script>
</body>
</html>`;
            
            return html;
        },
        
        generateItemsTable: function(items) {
            if (!items || items.length === 0) {
                return '<p style="text-align: center; padding: 20px;">No items found</p>';
            }
            
            let html = `
                <table class="items-table">
                    <thead>
                        <tr>
                            <th width="5%">#</th>
                            <th width="25%">Item</th>
                            <th width="20%">Description</th>
                            <th width="10%">Qty</th>
                            <th width="10%">Unit Price</th>
                            <th width="10%">Discount</th>
                            <th width="10%">Tax</th>
                            <th width="10%">Total</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            items.forEach((item, index) => {
                const itemName = item.item_type === 'product' ? 
                    (item.product?.name || 'Product') : 
                    (item.service?.name || 'Service');
                const currencySymbol = TempleCore.getCurrency();
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <strong>${itemName}</strong>
                            ${item.item_type === 'product' ? '<br><small>(Product)</small>' : '<br><small>(Service)</small>'}
                        </td>
                        <td>${item.description || '-'}</td>
                     
                        <td>
  ${item.item_type === 'product' ? `${item.quantity} ${item.uom?.name || ''}` : '-'}
</td>

                        <td>RM ${this.formatCurrency(item.unit_price)}</td>
                       <td>
  ${item.discount_amount && !isNaN(item.discount_amount) && item.discount_amount > 0 
      ? `${currencySymbol}${this.formatCurrency(item.discount_amount)}` 
      : '-'}
</td>

                        <td>
                            ${item.tax_amount > 0 ? `
                                ${currencySymbol} ${this.formatCurrency(item.tax_amount)}
                                ${item.tax_percent > 0 ? `<br><small>(${item.tax_percent}%)</small>` : ''}
                            ` : '-'}
                        </td>
                        <td><strong>${currencySymbol} ${this.formatCurrency(item.total_amount)}</strong></td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            return html;
        },
        
        generatePaymentsTable: function(payments) {
            if (!payments || payments.length === 0) {
                return '';
            }
            
            let html = `
                <div class="payment-history">
                    <h4>Payment History</h4>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Payment #</th>
                                <th>Date</th>
                                <th>Mode</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            payments.forEach(payment => {
                const statusClass = payment.status === 'COMPLETED' ? 'status-paid' : 'status-partial';
                const currencySymbol = TempleCore.getCurrency();
                html += `
                    <tr>
                        <td>${payment.payment_number || 'N/A'}</td>
                        <td>${this.formatDate(payment.payment_date)}</td>
                        <td>${payment.payment_mode?.name || payment.paymentMode?.name || '-'}</td>
                        <td>${payment.reference_number || '-'}</td>
                        <td><strong>${currencySymbol} ${this.formatCurrency(payment.amount)}</strong></td>
                        <td><span class="payment-status ${statusClass}">${payment.status || 'COMPLETED'}</span></td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            return html;
        },
        
        formatCurrency: function(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
        }
    };
    
})(jQuery, window);