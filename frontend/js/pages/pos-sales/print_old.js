// js/pages/pos-sales/print.js
// POS Sales Print Page - Replaces entire document with print content
// URL: pos-sales/print?id=BOOKING_NUMBER&type=single|separate

(function($, window) {
    'use strict';
    
    window.PosSalesPrintPage = {
        pageId: 'pos-sales-print',
        
        // Data
        bookingData: null,
        printType: 'single',
        templeSettings: {},
        
        // Initialize - replaces entire document
        init: function(params) {
            console.log('POS Sales Print Page initialized', params);
            
            this.loadTempleSettings();
            
            // Get params from URL or route params
            const bookingId = params?.id || this.getUrlParam('id');
            const printType = params?.type || this.getUrlParam('type') || 'single';
            
            this.printType = printType;
            
            // Check sessionStorage first (from create page)
            const tempData = sessionStorage.getItem('pos_sales_print_data');
            
            if (tempData) {
                try {
                    this.bookingData = JSON.parse(tempData);
                    this.printType = this.bookingData.print_type || printType;
                    sessionStorage.removeItem('pos_sales_print_data');
                    this.renderFullPage();
                } catch (e) {
                    console.error('Failed to parse temp data:', e);
                    this.loadFromAPI(bookingId);
                }
            } else if (bookingId) {
                this.loadFromAPI(bookingId);
            } else {
                this.showError('No booking ID provided');
            }
        },
        
        // Get URL parameter
        getUrlParam: function(param) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        },
        
        // Load temple settings
        loadTempleSettings: function() {
            try {
                const storageKey = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE && APP_CONFIG.STORAGE.TEMPLE 
                    ? APP_CONFIG.STORAGE.TEMPLE 
                    : 'temple_settings';
                const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                
                this.templeSettings = {
                    temple_name: stored.name || stored.temple_name || 'Temple Name',
                    temple_name_secondary: stored.name_secondary || stored.temple_name_secondary || '',
                    temple_address: stored.address || stored.temple_address || '',
                    temple_city: stored.city || stored.temple_city || '',
                    temple_state: stored.state || stored.temple_state || '',
                    temple_pincode: stored.pincode || stored.temple_pincode || '',
                    temple_phone: stored.phone || stored.temple_phone || '',
                    temple_logo: stored.temple_logo || stored.logo || '',
                    slogan: stored.slogan || ''
                };
            } catch (e) {
                console.warn('Failed to load temple settings:', e);
            }
        },
        
        // Load from API
        loadFromAPI: function(bookingId) {
            const self = this;
            
            if (typeof TempleAPI !== 'undefined') {
                TempleAPI.get(`/sales/orders/${bookingId}`)
                    .done(function(response) {
                        if (response.success && response.data) {
                            self.bookingData = self.formatAPIData(response.data);
                            self.renderFullPage();
                        } else {
                            self.showError('Booking not found');
                        }
                    })
                    .fail(function(xhr) {
                        console.error('API Error:', xhr);
                        self.showError('Failed to load booking');
                    });
            } else {
                this.showError('API not available');
            }
        },
        
        // Format API response
        formatAPIData: function(data) {
            return {
                booking_number: data.booking_number,
                booking_date: data.booking_date,
                items: data.items || [],
                devotee: data.devotee || null,
                totals: {
                    subtotal: parseFloat(data.subtotal) || 0,
                    discount: parseFloat(data.discount_amount) || 0,
                    total: parseFloat(data.total_amount) || 0
                },
                payment_method: data.payment_method || 'Cash',
                print_type: this.printType
            };
        },
        
        // Show error - replaces entire page
        showError: function(message) {
            const html = this.getFullHTML(`
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;">
                    <div style="font-size:60px;margin-bottom:20px;">⚠️</div>
                    <h2 style="color:#dc3545;margin-bottom:10px;">Error</h2>
                    <p style="color:#666;margin-bottom:20px;">${message}</p>
                    <button onclick="window.history.back()" style="padding:10px 30px;background:#6c757d;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;">Go Back</button>
                </div>
            `);
            this.replacePage(html);
        },
        
        // Replace entire page
        replacePage: function(html) {
            document.open();
            document.write(html);
            document.close();
        },
        
        // Render full page
        renderFullPage: function() {
            const data = this.bookingData;
            const currency = this.getCurrency();
            
            let receiptsHTML = '';
            if (this.printType === 'single') {
                receiptsHTML = this.generateSingleReceipt(data, currency);
            } else {
                receiptsHTML = this.generateSeparateReceipts(data, currency);
            }
            
            const bodyContent = `
                <div class="print-controls">
                    <label>Printer Size:</label>
                    <select id="printerSize" onchange="changePrinterSize(this.value)">
                        <option value="55mm">55mm Printer</option>
                        <option value="80mm" selected>80mm Printer</option>
                        <option value="150mm">150mm Printer</option>
                    </select>
                    <button class="btn btn-print" onclick="window.print()">🖨 Print</button>
                    <button class="btn btn-close" onclick="window.history.back()">✕ Close</button>
                </div>
                <div class="receipts-container">
                    ${receiptsHTML}
                </div>
            `;
            
            const fullHTML = this.getFullHTML(bodyContent);
            this.replacePage(fullHTML);
        },
        
        // Get currency
        getCurrency: function() {
            return (typeof TempleCore !== 'undefined' && TempleCore.getCurrency) ? TempleCore.getCurrency() : 'RM';
        },
        
        // Format date
        formatDate: function(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
        },
        
        // Format time
        formatTime: function() {
            const d = new Date();
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        },
        
        // Temple header HTML
        getTempleHeader: function() {
            const t = this.templeSettings;
            const logo = t.temple_logo 
                ? `<img src="${t.temple_logo}" class="temple-logo" alt="">` 
                : `<div class="temple-logo-placeholder">TEMPLE<br>LOGO</div>`;
            
            const addr = [t.temple_address, t.temple_city, t.temple_state, t.temple_pincode].filter(Boolean).join(', ');
            
            return `
                <div class="temple-header">
                    ${logo}
                    <div class="temple-name">${t.temple_name}</div>
                    ${t.temple_name_secondary ? `<div class="temple-name-secondary">${t.temple_name_secondary}</div>` : ''}
                    <div class="temple-address">${addr}</div>
                    ${t.temple_phone ? `<div class="temple-phone">Tel: ${t.temple_phone}</div>` : ''}
                </div>
            `;
        },
        
        // Group items by deity
        groupByDeity: function(items) {
            const groups = new Map();
            items.forEach(item => {
                const id = item.deity_id || 0;
                const name = item.deity_name || item.item_deity_name || 'General Items';
                if (!groups.has(id)) groups.set(id, { deity_name: name, items: [] });
                groups.get(id).items.push(item);
            });
            return Array.from(groups.values());
        },
        
        // Get item values
        getPrice: function(item) { return parseFloat(item.price || item.unit_price || 0); },
        getTotal: function(item) { return parseFloat(item.total || item.total_price || (this.getPrice(item) * (item.quantity || 1))); },
        getName: function(item) { return item.name_primary || item.item_name || 'Item'; },
        getSecondaryName: function(item) { return item.name_secondary || item.item_name_secondary || ''; },
        
        // Single receipt
        generateSingleReceipt: function(data, currency) {
            const t = this.templeSettings;
            const groups = this.groupByDeity(data.items);
            const vehicleItems = data.items.filter(i => (i.sale_type || i.item_type) === 'Vehicle' && i.vehicles?.length);
            
            let itemsHTML = groups.map(g => `
                <div class="deity-group">
                    <div class="deity-name">${g.deity_name}</div>
                    ${g.items.map(i => `
                        <div class="receipt-item">
                            <div class="item-name">${this.getName(i)}</div>
                            <div class="item-calc">[${currency}${this.getPrice(i).toFixed(2)} × ${i.quantity||1} = ${currency}${this.getTotal(i).toFixed(2)}]</div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
            
            let vehicleHTML = vehicleItems.length ? `
                <div class="vehicle-section">
                    <div class="section-title">Vehicle Details</div>
                    ${vehicleItems.map(i => `
                        <div class="vehicle-group">
                            <div class="vehicle-item-name">${this.getName(i)}</div>
                            ${i.vehicles.map(v => `
                                <div class="detail-row"><span>Name</span><span class="detail-value">${v.owner||'-'}</span></div>
                                <div class="detail-row"><span>Vehicle No</span><span class="detail-value">${v.number}</span></div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            ` : '';
            
            let devoteeHTML = data.devotee?.name ? `
                <div class="devotee-section">
                    <div class="detail-row"><span>Name</span><span class="detail-value">${data.devotee.name}</span></div>
                    ${data.devotee.phone ? `<div class="detail-row"><span>Phone</span><span class="detail-value">${data.devotee.phone_code||''}${data.devotee.phone}</span></div>` : ''}
                </div>
            ` : '';
            
            return `
                <div class="receipt-page">
                    ${this.getTempleHeader()}
                    <div class="receipt-info">
                        <div>Date: ${this.formatDate(data.booking_date)}</div>
                        <div>Bill NO: ${data.booking_number}</div>
                    </div>
                    <div class="receipt-items">${itemsHTML}</div>
                    <div class="payment-info">
                        <div class="payment-method">PAID METHOD: ${(data.payment_method||'CASH').toUpperCase()}</div>
                    </div>
                    <div class="receipt-summary">
                        <div class="summary-row"><span>SUB TOTAL :</span><span>${currency} ${data.totals.subtotal.toFixed(2)}</span></div>
                        ${data.totals.discount > 0 ? `<div class="summary-row"><span>DISCOUNT :</span><span>-${currency} ${data.totals.discount.toFixed(2)}</span></div>` : ''}
                        <div class="summary-row"><span>PAID AMOUNT :</span><span>${currency} ${data.totals.total.toFixed(2)}</span></div>
                    </div>
                    ${vehicleHTML}
                    ${devoteeHTML}
                    <div class="receipt-total">
                        <div class="total-row"><span>Total:</span><span>${currency} ${data.totals.total.toFixed(2)}</span></div>
                        <div class="total-date">Date ${this.formatDate(data.booking_date)} ${this.formatTime()}</div>
                    </div>
                    ${t.slogan ? `<div class="receipt-slogan">${t.slogan}</div>` : ''}
                </div>
            `;
        },
        
        // Separate receipts
        generateSeparateReceipts: function(data, currency) {
            const t = this.templeSettings;
            
            return data.items.map(item => {
                const saleType = item.sale_type || item.item_type || '';
                const deityName = item.deity_name || item.item_deity_name || '';
                const total = this.getTotal(item);
                
                let vehicleHTML = (saleType === 'Vehicle' && item.vehicles?.length) ? `
                    <div class="vehicle-section">
                        ${item.vehicles.map(v => `
                            <div class="detail-row"><span>Name</span><span class="detail-value">${v.owner||'-'}</span></div>
                            <div class="detail-row"><span>Vehicle No</span><span class="detail-value">${v.number}</span></div>
                        `).join('')}
                    </div>
                ` : '';
                
                return `
                    <div class="receipt-page">
                        ${this.getTempleHeader()}
                        <div class="receipt-info">
                            <div>Date: ${this.formatDate(data.booking_date)}</div>
                            <div>Bill NO: ${data.booking_number}</div>
                        </div>
                        <div class="receipt-items">
                            <div class="deity-group">
                                ${deityName ? `<div class="deity-name">${deityName}</div>` : ''}
                                <div class="receipt-item single-item">
                                    <div class="item-name-large">${this.getName(item)}</div>
                                    ${this.getSecondaryName(item) ? `<div class="item-name-secondary">${this.getSecondaryName(item)}</div>` : ''}
                                    <div class="item-calc">[${currency}${this.getPrice(item).toFixed(2)} × ${item.quantity||1} = ${currency}${total.toFixed(2)}]</div>
                                </div>
                            </div>
                        </div>
                        <div class="payment-info">
                            <div class="payment-method">PAID METHOD: ${(data.payment_method||'CASH').toUpperCase()}</div>
                        </div>
                        ${vehicleHTML}
                        <div class="receipt-total">
                            <div class="total-row"><span>Total:</span><span>${currency} ${total.toFixed(2)}</span></div>
                            <div class="total-date">Date ${this.formatDate(data.booking_date)} ${this.formatTime()}</div>
                        </div>
                        ${t.slogan ? `<div class="receipt-slogan">${t.slogan}</div>` : ''}
                    </div>
                `;
            }).join('');
        },
        
        // Full HTML document
        getFullHTML: function(bodyContent) {
            return `<!DOCTYPE html>
<html>
<head>
    <title>Receipt - ${this.bookingData?.booking_number || 'Print'}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Courier New', Courier, monospace;
            color: #000;
            background: #f5f5f5;
            padding: 20px;
            --receipt-width: 72mm;
            --font-size-base: 12px;
            --font-size-large: 14px;
            --font-size-small: 10px;
            --font-size-title: 16px;
            --padding-base: 8px;
            --logo-size: 60px;
        }
        
        body.printer-55mm {
            --receipt-width: 48mm;
            --font-size-base: 10px;
            --font-size-large: 12px;
            --font-size-small: 8px;
            --font-size-title: 13px;
            --padding-base: 5px;
            --logo-size: 45px;
        }
        
        body.printer-80mm {
            --receipt-width: 72mm;
            --font-size-base: 12px;
            --font-size-large: 14px;
            --font-size-small: 10px;
            --font-size-title: 16px;
            --padding-base: 8px;
            --logo-size: 60px;
        }
        
        body.printer-150mm {
            --receipt-width: 140mm;
            --font-size-base: 14px;
            --font-size-large: 16px;
            --font-size-small: 12px;
            --font-size-title: 20px;
            --padding-base: 12px;
            --logo-size: 80px;
        }
        
        .print-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            padding: 15px 20px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            flex-wrap: wrap;
            font-family: Arial, sans-serif;
        }
        
        .print-controls label { font-weight: 600; color: #333; }
        
        .print-controls select {
            padding: 10px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            background: #fff;
            cursor: pointer;
            min-width: 150px;
        }
        
        .print-controls select:focus { outline: none; border-color: #800000; }
        
        .btn {
            padding: 10px 25px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
        }
        
        .btn-print { background: linear-gradient(135deg, #28a745, #218838); color: white; }
        .btn-print:hover { opacity: 0.9; }
        .btn-close { background: #6c757d; color: white; }
        .btn-close:hover { background: #5a6268; }
        
        .receipts-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        
        .receipt-page {
            width: var(--receipt-width);
            padding: var(--padding-base);
            background: #fff;
            border: 1px dashed #ccc;
            font-size: var(--font-size-base);
        }
        
        .temple-header {
            text-align: center;
            padding-bottom: var(--padding-base);
            border-bottom: 1px dashed #000;
            margin-bottom: var(--padding-base);
        }
        
        .temple-logo {
            max-width: var(--logo-size);
            max-height: var(--logo-size);
            margin: 0 auto 5px;
            display: block;
        }
        
        .temple-logo-placeholder {
            width: var(--logo-size);
            height: var(--logo-size);
            margin: 0 auto 5px;
            border: 1px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            line-height: 1.2;
        }
        
        .temple-name { font-size: var(--font-size-title); font-weight: bold; margin-bottom: 3px; line-height: 1.2; }
        .temple-name-secondary { font-size: var(--font-size-base); margin-bottom: 3px; }
        .temple-address, .temple-phone { font-size: var(--font-size-small); line-height: 1.3; }
        
        .receipt-info { padding: var(--padding-base) 0; border-bottom: 1px dashed #000; }
        .receipt-info div { margin-bottom: 3px; }
        
        .receipt-items { padding: var(--padding-base) 0; }
        
        .deity-group {
            margin-bottom: var(--padding-base);
            padding-bottom: var(--padding-base);
            border-bottom: 1px solid #ddd;
        }
        .deity-group:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        
        .deity-name {
            font-size: var(--font-size-large);
            font-weight: bold;
            text-align: center;
            background: #f0f0f0;
            padding: 5px;
            margin-bottom: 5px;
            border: 1px solid #000;
        }
        
        .receipt-item { padding: 3px 0; }
        .item-name { font-size: var(--font-size-base); font-weight: bold; }
        .item-name-large { font-size: var(--font-size-large); font-weight: bold; text-align: center; }
        .item-name-secondary { font-size: var(--font-size-base); text-align: center; }
        .item-calc { font-size: var(--font-size-small); text-align: center; }
        .single-item { text-align: center; padding: 10px 0; }
        
        .payment-info { padding: var(--padding-base) 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        .payment-method { font-weight: bold; text-align: center; }
        
        .receipt-summary { padding: var(--padding-base) 0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        
        .vehicle-section, .devotee-section { padding: var(--padding-base) 0; border-top: 1px dashed #000; }
        .section-title { font-weight: bold; text-align: center; margin-bottom: 5px; }
        
        .vehicle-group { margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px dotted #ccc; }
        .vehicle-group:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .vehicle-item-name { font-size: var(--font-size-small); font-weight: bold; margin-bottom: 3px; }
        
        .detail-row { display: flex; justify-content: space-between; font-size: var(--font-size-small); margin-bottom: 2px; }
        .detail-value { font-weight: bold; }
        
        .receipt-total { padding: var(--padding-base) 0; border-top: 2px solid #000; text-align: center; }
        .total-row { display: flex; justify-content: space-between; font-size: var(--font-size-large); font-weight: bold; margin-bottom: 5px; }
        .total-date { font-size: var(--font-size-small); color: #666; }
        
        .receipt-slogan {
            text-align: center;
            font-size: var(--font-size-small);
            margin-top: var(--padding-base);
            padding-top: var(--padding-base);
            border-top: 1px dashed #000;
            font-style: italic;
        }
        
        @media print {
            body { background: white !important; padding: 0 !important; }
            .print-controls { display: none !important; }
            .receipts-container { gap: 0 !important; }
            .receipt-page { border: none !important; margin: 0 !important; page-break-after: always; page-break-inside: avoid; }
            .receipt-page:last-child { page-break-after: auto; }
        }
        
        @page { size: auto; margin: 3mm; }
    </style>
</head>
<body class="printer-80mm">
    ${bodyContent}
    <script>
        function changePrinterSize(size) {
            document.body.className = 'printer-' + size;
        }
    </script>
</body>
</html>`;
        },
        
        // Cleanup (won't be called since we replace the page)
        cleanup: function() {}
    };
    
    window.POSSalesPrintPage = window.PosSalesPrintPage;
    
})(jQuery, window);