// js/pages/pos-sales/templates/template1.js
// Template 1 - POS Receipt Style (Thermal Optimized)
// Supports: 55mm, 80mm, 150mm thermal printers + A4/A3 paper
// 
// CRITICAL: dom-to-image converts individual .receipt-ticket elements
// The class MUST be "receipt-ticket" to match print.js selector:
//   const $receipts = $('#receipt-content .receipt-ticket');
// If this class doesn't match, print.js falls back to full-width #receipt-content
// All receipt styles MUST be inline for proper image capture

(function(window) {
    'use strict';
    
    window.PosSalesTemplate1 = {
        
        // Main render method
        render: function(data, settings, printerType) {
            const currency = (typeof TempleCore !== 'undefined' && TempleCore.getCurrency) 
                ? TempleCore.getCurrency() 
                : 'RM';
            
            const printSize = settings.print_size || 'Thermal';
            const headerFontSize = parseInt(settings.header_font_size) || 16;
            const contentFontSize = parseInt(settings.content_font_size) || 12;
            const slogan = settings.slogan || '';
            
            // Font size multiplier for thermal printing (3x for better readability)
            const fontMultiplier = 3;
            
            // Determine paper width based on print size
            let paperWidth = '150mm';
            let logoSize = '80px';
            let paddingBase = '12px';
            let fontBase = contentFontSize * fontMultiplier;        // 12 * 3 = 36px
            let fontLarge = (contentFontSize + 2) * fontMultiplier; // 14 * 3 = 42px
            let fontSmall = (contentFontSize - 2) * fontMultiplier; // 10 * 3 = 30px
            let fontTitle = headerFontSize * fontMultiplier;        // 16 * 3 = 48px
            
            if (printSize === 'A4') {
                paperWidth = '210mm';
                logoSize = '150px';
                paddingBase = '15px';
            } else if (printSize === 'A3') {
                paperWidth = '297mm';
                logoSize = '120px';
                paddingBase = '18px';
            } else if (printSize === 'Thermal_80mm') {
                paperWidth = '72mm';
                logoSize = '60px';
                paddingBase = '8px';
                fontBase = 11 * fontMultiplier;   // 33px
                fontLarge = 13 * fontMultiplier;  // 39px
                fontSmall = 9 * fontMultiplier;   // 27px
                fontTitle = 14 * fontMultiplier;  // 42px
            } else if (printSize === 'Thermal_55mm') {
                paperWidth = '48mm';
                logoSize = '50px';
                paddingBase = '6px';
                fontBase = 9 * fontMultiplier;    // 27px
                fontLarge = 11 * fontMultiplier;  // 33px
                fontSmall = 7 * fontMultiplier;   // 21px
                fontTitle = 12 * fontMultiplier;  // 36px
            }
            
            // Build style config object to pass to receipt generators
            const styleConfig = {
                paperWidth: paperWidth,
                logoSize: logoSize,
                paddingBase: paddingBase,
                fontBase: fontBase,
                fontLarge: fontLarge,
                fontSmall: fontSmall,
                fontTitle: fontTitle
            };
            
            // Determine if browser-based (shows size selector)
            const showSizeSelector = (printerType === 'browser');
            
            let receiptContent = '';
            
            if (data.print_option === 'SINGLE_PRINT') {
                receiptContent = this.generateSingleReceipt(data, currency, slogan, styleConfig);
            } else {
                // Separate receipts - one per item
                data.items.forEach(function(item, index) {
                    receiptContent += this.generateSeparateTicket(data, item, currency, slogan, styleConfig);
                }.bind(this));
            }
            
            return `
                ${this.getWrapperStyles()}
                <div class="print-wrapper">
                    ${this.getActionButtons(printerType, showSizeSelector, printSize)}
                    <div class="receipts-container" id="receipt-content">
                        ${receiptContent}
                    </div>
                </div>
            `;
        },
        
        // Action buttons based on printer type
        getActionButtons: function(printerType, showSizeSelector, currentSize) {
            let sizeOptions = '';
            if (showSizeSelector) {
                sizeOptions = `
                    <label>Printer Size:</label>
                    <select id="printerSize" onchange="changePrinterSize(this.value)">
                        <option value="55mm" ${currentSize === 'Thermal_55mm' ? 'selected' : ''}>55mm Printer</option>
                        <option value="80mm" ${currentSize === 'Thermal_80mm' ? 'selected' : ''}>80mm Printer</option>
                        <option value="150mm" ${currentSize === 'Thermal' ? 'selected' : ''}>150mm Printer</option>
                    </select>
                `;
            }
            
            let buttons = `
                <div class="print-controls no-print">
                    ${sizeOptions}
            `;
            
            if (printerType === 'imin_d4_pro' || printerType === 'imin_d4' || printerType === 'imin_swan2') {
                buttons += `
                    <button class="btn btn-imin-print" onclick="iminPrint()">
                        <i class="bi bi-printer"></i> Print to iMin
                    </button>
                    <button class="btn btn-browser-print" onclick="browserPrint()">
                        <i class="bi bi-printer-fill"></i> Browser Print
                    </button>
                `;
            } else {
                buttons += `
                    <button class="btn btn-print" onclick="browserPrint()">
                        ??? Print
                    </button>
                `;
            }
            
            buttons += `
                    <button class="btn btn-close" onclick="goBack()">
                        ? Close
                    </button>
                </div>
            `;
            
            return buttons;
        },
        
        // Temple header HTML (fully inline styles)
        getTempleHeader: function(temple, styleConfig) {
            const logo = temple.temple_logo 
                ? `<img src="${temple.temple_logo}" style="max-width:${styleConfig.logoSize};max-height:${styleConfig.logoSize};margin:0 auto 8px;display:block;" alt="" crossorigin="anonymous">` 
                : `<div style="width:${styleConfig.logoSize};height:${styleConfig.logoSize};margin:0 auto 8px;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;line-height:1.2;text-align:center;">TEMPLE<br>LOGO</div>`;
            
            const addr = [temple.temple_address, temple.temple_city, temple.temple_state, temple.temple_pincode]
                .filter(Boolean).join(', ');
            
            return `
                <div style="text-align:center;padding-bottom:${styleConfig.paddingBase};border-bottom:2px dashed #000;margin-bottom:${styleConfig.paddingBase};">
                    ${logo}
                    <div style="font-size:${styleConfig.fontTitle}px;font-weight:bold;margin-bottom:6px;line-height:1.2;">${temple.temple_name || 'Temple Name'}</div>
                    ${temple.temple_name_secondary ? `<div style="font-size:${styleConfig.fontBase}px;margin-bottom:6px;">${temple.temple_name_secondary}</div>` : ''}
                    <div style="font-size:${styleConfig.fontSmall}px;line-height:1.4;">${addr}</div>
                    ${temple.temple_phone ? `<div style="font-size:${styleConfig.fontSmall}px;line-height:1.4;">Tel: ${temple.temple_phone}</div>` : ''}
                </div>
            `;
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
        
        // Get item values
        getPrice: function(item) { 
            return parseFloat(item.price || item.unit_price || 0); 
        },
        
        getTotal: function(item) { 
            return parseFloat(item.total || item.total_price || (this.getPrice(item) * (item.quantity || 1))); 
        },
        
        getName: function(item) { 
            return item.name_primary || item.item_name || 'Item'; 
        },
        
        getSecondaryName: function(item) { 
            return item.name_secondary || item.item_name_secondary || ''; 
        },
        
        // Group items by deity
        groupByDeity: function(items) {
            const groups = new Map();
            items.forEach(function(item) {
                const id = item.deity_id || 0;
                const name = item.deity_name || item.item_deity_name || 'General Items';
                if (!groups.has(id)) groups.set(id, { deity_name: name, items: [] });
                groups.get(id).items.push(item);
            });
            return Array.from(groups.values());
        },
        
        // Generate single combined receipt (100% inline styles for dom-to-image)
        generateSingleReceipt: function(data, currency, slogan, sc) {
            const self = this;
            const groups = this.groupByDeity(data.items);
            const vehicleItems = data.items.filter(function(i) { 
                return (i.sale_type || i.item_type) === 'Vehicle' && i.vehicles && i.vehicles.length;
            });
            
            let itemsHTML = groups.map(function(g) {
                return `
                    <div style="margin-bottom:${sc.paddingBase};padding-bottom:${sc.paddingBase};border-bottom:2px solid #ddd;">
                        <div style="font-size:${sc.fontLarge}px;font-weight:bold;text-align:center;padding:10px;margin-bottom:10px;">${g.deity_name}</div>
                        ${g.items.map(function(i) {
                            return `
                                <div style="padding:8px 0;">
                                    <div style="font-size:${sc.fontBase}px;font-weight:bold;">${self.getName(i)}</div>
                                    <div style="font-size:${sc.fontSmall}px;text-align:center;margin-top:4px;">[${currency}${self.getPrice(i).toFixed(2)} x ${i.quantity||1} = ${currency}${self.getTotal(i).toFixed(2)}]</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('');
            
            let vehicleHTML = vehicleItems.length ? `
                <div style="padding:${sc.paddingBase} 0;border-top:2px dashed #000;">
                    <div style="font-weight:bold;text-align:center;margin-bottom:10px;font-size:${sc.fontBase}px;">Vehicle Details</div>
                    ${vehicleItems.map(function(i) {
                        return `
                            <div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px dotted #ccc;">
                                <div style="font-size:${sc.fontSmall}px;font-weight:bold;margin-bottom:6px;">${self.getName(i)}</div>
                                ${i.vehicles.map(function(v) {
                                    return `
                                        <div style="display:flex;justify-content:space-between;font-size:${sc.fontSmall}px;margin-bottom:4px;"><span>Name</span><span style="font-weight:bold;">${v.owner||'-'}</span></div>
                                        <div style="display:flex;justify-content:space-between;font-size:${sc.fontSmall}px;margin-bottom:4px;"><span>Vehicle No</span><span style="font-weight:bold;">${v.number}</span></div>
                                    `;
                                }).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';
            
            let devoteeHTML = data.devotee && data.devotee.name ? `
                <div style="padding:${sc.paddingBase} 0;border-top:2px dashed #000;">
                    <div style="display:flex;justify-content:space-between;font-size:${sc.fontSmall}px;margin-bottom:6px;"><span>Name</span><span style="font-weight:bold;">${data.devotee.name}</span></div>
                    ${data.devotee.phone ? `<div style="display:flex;justify-content:space-between;font-size:${sc.fontSmall}px;margin-bottom:6px;"><span>Phone</span><span style="font-weight:bold;">${data.devotee.phone_code||''}${data.devotee.phone}</span></div>` : ''}
                </div>
            ` : '';
            
            // IMPORTANT: .receipt-ticket has ALL styles inline for dom-to-image capture
            return `
                <div class="receipt-ticket" style="width:${sc.paperWidth};padding:${sc.paddingBase};background:#fff;font-size:${sc.fontBase}px;color:#000;box-sizing:border-box;">
                    ${this.getTempleHeader(data.temple, sc)}
                    <div style="padding:${sc.paddingBase} 0;border-bottom:2px dashed #000;">
                        <div style="margin-bottom:8px;font-size:${sc.fontBase}px;">Date: ${this.formatDate(data.booking_date)}</div>
                        <div style="font-size:${sc.fontBase}px;">Bill NO: ${data.booking_number}</div>
                    </div>
                    <div style="padding:${sc.paddingBase} 0;">${itemsHTML}</div>
                    <div style="padding:${sc.paddingBase} 0;border-top:2px dashed #000;border-bottom:2px dashed #000;">
                        <div style="font-weight:bold;text-align:center;font-size:${sc.fontBase}px;">PAID METHOD: ${(data.payment_method||'CASH').toUpperCase()}</div>
                    </div>
                    <div style="padding:${sc.paddingBase} 0;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:${sc.fontBase}px;"><span>SUB TOTAL :</span><span>${currency} ${data.totals.subtotal.toFixed(2)}</span></div>
                        ${data.totals.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:${sc.fontBase}px;"><span>DISCOUNT :</span><span>-${currency} ${data.totals.discount.toFixed(2)}</span></div>` : ''}
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:${sc.fontBase}px;"><span>PAID AMOUNT :</span><span>${currency} ${data.totals.total.toFixed(2)}</span></div>
                    </div>
                    ${vehicleHTML}
                    ${devoteeHTML}
                    <div style="padding:${sc.paddingBase} 0;border-top:3px solid #000;text-align:center;">
                        <div style="display:flex;justify-content:space-between;font-size:${sc.fontLarge}px;font-weight:bold;margin-bottom:10px;"><span>Total:</span><span>${currency} ${data.totals.total.toFixed(2)}</span></div>
                        <div style="font-size:${sc.fontSmall}px;color:#666;">Date ${this.formatDate(data.booking_date)} ${this.formatTime()}</div>
                    </div>
                    ${slogan ? `<div style="text-align:center;font-size:${sc.fontSmall}px;margin-top:${sc.paddingBase};padding-top:${sc.paddingBase};border-top:2px dashed #000;font-style:italic;">${slogan}</div>` : ''}
                </div>
            `;
        },
        
        // Generate separate ticket for each item (100% inline styles)
        generateSeparateTicket: function(data, item, currency, slogan, sc) {
            const saleType = item.sale_type || item.item_type || '';
            const deityName = item.deity_name || item.item_deity_name || '';
            const total = this.getTotal(item);
            
            let vehicleHTML = (saleType === 'Vehicle' && item.vehicles && item.vehicles.length) ? `
                <div style="padding:${sc.paddingBase} 0;border-top:2px dashed #000;">
                    ${item.vehicles.map(function(v) {
                        return `
                            <div style="display:flex;justify-content:space-between;font-size:${sc.fontSmall}px;margin-bottom:6px;"><span>Name</span><span style="font-weight:bold;">${v.owner||'-'}</span></div>
                            <div style="display:flex;justify-content:space-between;font-size:${sc.fontSmall}px;margin-bottom:6px;"><span>Vehicle No</span><span style="font-weight:bold;">${v.number}</span></div>
                        `;
                    }).join('')}
                </div>
            ` : '';
            
            // IMPORTANT: .receipt-ticket has ALL styles inline for dom-to-image capture
            return `
                <div class="receipt-ticket" style="width:${sc.paperWidth};padding:${sc.paddingBase};background:#fff;font-family:'Courier New',Courier,monospace;font-size:${sc.fontBase}px;color:#000;box-sizing:border-box;">
                    ${this.getTempleHeader(data.temple, sc)}
                    <div style="padding:${sc.paddingBase} 0;border-bottom:2px dashed #000;">
                        <div style="margin-bottom:8px;font-size:${sc.fontBase}px;">Date: ${this.formatDate(data.booking_date)}</div>
                        <div style="font-size:${sc.fontBase}px;">Bill NO: ${data.booking_number}</div>
                    </div>
                    <div style="padding:${sc.paddingBase} 0;">
                        <div style="margin-bottom:${sc.paddingBase};padding-bottom:${sc.paddingBase};border-bottom:2px solid #ddd;">
                            ${deityName ? `<div style="font-size:${sc.fontLarge}px;font-weight:bold;text-align:center;background:#f0f0f0;padding:10px;margin-bottom:10px;border:2px solid #000;">${deityName}</div>` : ''}
                            <div style="text-align:center;padding:15px 0;">
                                <div style="font-size:${sc.fontLarge}px;font-weight:bold;text-align:center;">${this.getName(item)}</div>
                                ${this.getSecondaryName(item) ? `<div style="font-size:${sc.fontBase}px;text-align:center;margin-top:6px;">${this.getSecondaryName(item)}</div>` : ''}
                                <div style="font-size:${sc.fontSmall}px;text-align:center;margin-top:8px;">[${currency}${this.getPrice(item).toFixed(2)} × ${item.quantity||1} = ${currency}${total.toFixed(2)}]</div>
                            </div>
                        </div>
                    </div>
                    <div style="padding:${sc.paddingBase} 0;border-top:2px dashed #000;border-bottom:2px dashed #000;">
                        <div style="font-weight:bold;text-align:center;font-size:${sc.fontBase}px;">PAID METHOD: ${(data.payment_method||'CASH').toUpperCase()}</div>
                    </div>
                    ${vehicleHTML}
                    <div style="padding:${sc.paddingBase} 0;border-top:3px solid #000;text-align:center;">
                        <div style="display:flex;justify-content:space-between;font-size:${sc.fontLarge}px;font-weight:bold;margin-bottom:10px;"><span>Total:</span><span>${currency} ${total.toFixed(2)}</span></div>
                        <div style="font-size:${sc.fontSmall}px;color:#666;">Date ${this.formatDate(data.booking_date)} ${this.formatTime()}</div>
                    </div>
                    ${slogan ? `<div style="text-align:center;font-size:${sc.fontSmall}px;margin-top:${sc.paddingBase};padding-top:${sc.paddingBase};border-top:2px dashed #000;font-style:italic;">${slogan}</div>` : ''}
                </div>
            `;
        },
        
        // Wrapper styles - for UI controls only (NOT captured by dom-to-image)
        getWrapperStyles: function() {
            return `
                <style>
                    /* =============================================
                       WRAPPER STYLES - For preview/controls only
                       NOT captured by dom-to-image
                       ============================================= */
                    
                    body {
                        font-family: Arial, sans-serif;
                        background: #f5f5f5;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .print-wrapper {
                        min-height: 100vh;
                        padding: 20px;
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
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                    }
                    
                    .btn-print, .btn-browser-print { 
                        background: linear-gradient(135deg, #28a745, #218838); 
                        color: white; 
                    }
                    .btn-print:hover, .btn-browser-print:hover { opacity: 0.9; }
                    
                    .btn-imin-print { 
                        background: linear-gradient(135deg, #007bff, #0056b3); 
                        color: white; 
                    }
                    .btn-imin-print:hover { opacity: 0.9; }
                    
                    .btn-close { background: #6c757d; color: white; }
                    .btn-close:hover { background: #5a6268; }
                    
                    /* Receipt container - for preview layout */
                    .receipts-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 20px;
                    }
                    
                    /* Preview border for receipts */
                    .receipt-ticket {
                        border: 1px dashed #ccc !important;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    
                    @media print {
                        body { background: white !important; padding: 0 !important; }
                        .print-controls, .no-print { display: none !important; }
                        .print-wrapper { padding: 0; min-height: auto; }
                        .receipts-container { gap: 0 !important; }
                        .receipt-ticket { 
                            border: none !important; 
                            box-shadow: none !important;
                            margin: 0 !important; 
                            page-break-after: always; 
                            page-break-inside: avoid; 
                        }
                        .receipt-ticket:last-child { page-break-after: auto; }
                    }
                    
                    @page { size: auto; margin: 3mm; }
                </style>
            `;
        }
    };
    
})(window);