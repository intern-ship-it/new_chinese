// js/services/thermal-printer.js
// Thermal printer template generator for iMin printers

(function($, window) {
    'use strict';

    window.ThermalPrinter = {
        
        /**
         * Generate thermal receipt template
         */
        generateReceipt(bookingData, settings, options = {}) {
            const width = options.printWidth || 80; // mm
            const currency = TempleCore.getCurrency();
            
            // Calculate pixel width (1mm ˜ 8 pixels for thermal printers)
            const pixelWidth = width * 8;
            
            return this.buildReceiptHTML(bookingData, settings, currency, pixelWidth);
        },

        /**
         * Build receipt HTML
         */
        buildReceiptHTML(booking, settings, currency, width) {
            const logoHtml = settings.temple_logo_url ? 
                `<div class="logo"><img src="${settings.temple_logo_url}" alt="Logo"></div>` : '';

            let itemsHtml = '';
            if (booking.items && booking.items.length > 0) {
                itemsHtml = booking.items.map((item, index) => {
                    const deityName = item.deity_name ? ` (${item.deity_name})` : '';
                    return `
                        <div class="item">
                            <div class="item-number">${index + 1}.</div>
                            <div class="item-details">
                                <div class="item-name">${item.item_name}${deityName}</div>
                                ${item.item_name_secondary ? `<div class="item-secondary">${item.item_name_secondary}</div>` : ''}
                                <div class="item-price">
                                    ${currency}${parseFloat(item.unit_price || item.price).toFixed(2)} × ${item.quantity} = 
                                    ${currency}${parseFloat(item.total_price || (item.price * item.quantity)).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        ${item.token_number ? `<div class="token">Token: <span>${item.token_number}</span></div>` : ''}
                    `;
                }).join('');
            }

            // Rasi entries
            let rasiHtml = '';
            if (booking.rasi_entries && booking.rasi_entries.length > 0) {
                rasiHtml = '<div class="section-divider"></div><div class="rasi-section">';
                rasiHtml += '<div class="rasi-title">Rasi/Natchathram Details</div>';
                booking.rasi_entries.forEach(entry => {
                    rasiHtml += `
                        <div class="rasi-entry">
                            <span class="rasi-name">${entry.name}</span>
                            ${entry.rasi_text ? `<span>${entry.rasi_text}</span>` : ''}
                            ${entry.natchathram_text ? `<span>${entry.natchathram_text}</span>` : ''}
                        </div>
                    `;
                });
                rasiHtml += '</div>';
            }

            // Calculate amounts
            const subtotal = parseFloat(booking.subtotal) || 0;
            const discount = parseFloat(booking.discount_amount) || 0;
            const deposit = parseFloat(booking.deposit_amount) || 0;
            const total = parseFloat(booking.total_amount) || subtotal - discount;
            const balance = total - deposit;

            return `
                <div class="thermal-receipt" style="width: ${width}px; font-family: monospace; background: #fff; color: #000; padding: 10px;">
                    <style>
                        .thermal-receipt { box-sizing: border-box; }
                        .thermal-receipt * { margin: 0; padding: 0; }
                        .header { text-align: center; margin-bottom: 15px; }
                        .logo img { max-width: 100px; height: auto; margin: 0 auto 10px; display: block; }
                        .temple-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                        .temple-info { font-size: 11px; line-height: 1.4; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .section-divider { border-top: 2px solid #000; margin: 15px 0; }
                        .info-row { font-size: 12px; margin: 5px 0; text-align: center; }
                        .items { margin: 15px 0; }
                        .item { display: flex; margin: 10px 0; font-size: 12px; gap: 8px; }
                        .item-number { font-weight: bold; flex-shrink: 0; }
                        .item-details { flex: 1; }
                        .item-name { font-weight: bold; font-size: 14px; margin-bottom: 3px; }
                        .item-secondary { font-size: 11px; color: #333; margin-bottom: 3px; }
                        .item-price { font-size: 11px; margin-top: 3px; }
                        .token { text-align: center; font-size: 16px; font-weight: bold; 
                                 border: 2px solid #000; padding: 8px; margin: 10px 0; }
                        .token span { font-size: 20px; }
                        .rasi-section { font-size: 11px; }
                        .rasi-title { font-weight: bold; text-align: center; margin-bottom: 8px; }
                        .rasi-entry { padding: 5px 0; border-bottom: 1px dotted #ccc; }
                        .rasi-name { font-weight: bold; display: block; margin-bottom: 2px; }
                        .payment-method { text-align: center; font-size: 14px; font-weight: bold; 
                                         background: #000; color: #fff; padding: 8px; margin: 15px 0; }
                        .totals { margin-top: 15px; }
                        .total-row { display: flex; justify-content: space-between; 
                                    font-size: 12px; margin: 5px 0; }
                        .total-row.grand { font-size: 16px; font-weight: bold; 
                                          border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
                        .footer { text-align: center; font-size: 10px; margin-top: 15px; }
                    </style>

                    <div class="header">
                        ${logoHtml}
                        <div class="temple-name">${settings.temple_name || 'Temple'}</div>
                        <div class="temple-info">
                            ${settings.temple_address || ''}${settings.temple_city ? ', ' + settings.temple_city : ''}
                            ${settings.temple_pincode ? ' - ' + settings.temple_pincode : ''}<br>
                            ${settings.temple_phone ? 'Tel: ' + settings.temple_phone : ''}
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="info-row">Date: ${new Date().toLocaleDateString('en-GB')}</div>
                    <div class="info-row">Bill No: ${booking.booking_number}</div>

                    <div class="divider"></div>

                    <div class="items">
                        ${itemsHtml}
                    </div>

                    ${rasiHtml}

                    <div class="section-divider"></div>

                    <div class="payment-method">
                        PAID: ${booking.payment_method_name || 'CASH'}
                    </div>

                    <div class="totals">
                        <div class="total-row">
                            <span>Sub Total:</span>
                            <span>${currency}${subtotal.toFixed(2)}</span>
                        </div>
                        ${discount > 0 ? `
                        <div class="total-row">
                            <span>Discount:</span>
                            <span>-${currency}${discount.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        ${deposit > 0 ? `
                        <div class="total-row">
                            <span>Paid:</span>
                            <span>${currency}${deposit.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>Balance:</span>
                            <span>${currency}${balance.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="total-row grand">
                            <span>TOTAL:</span>
                            <span>${currency}${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="footer">
                        ${new Date().toLocaleString('en-GB')}<br>
                        Thank you for your visit!<br>
                        ${settings.temple_whatsapp_number || ''}
                    </div>
                </div>
            `;
        },

        /**
         * Generate separate ticket for each item
         */
        generateSeparateTicket(booking, item, settings, options = {}) {
            const width = options.printWidth || 80;
            const currency = TempleCore.getCurrency();
            const pixelWidth = width * 8;

            const logoHtml = settings.temple_logo_url ? 
                `<div class="logo"><img src="${settings.temple_logo_url}" alt="Logo"></div>` : '';

            const deityName = item.deity_name ? ` (${item.deity_name})` : '';

            return `
                <div class="thermal-receipt" style="width: ${pixelWidth}px; font-family: monospace; background: #fff; color: #000; padding: 10px;">
                    <style>
                        .thermal-receipt { box-sizing: border-box; }
                        .thermal-receipt * { margin: 0; padding: 0; }
                        .header { text-align: center; margin-bottom: 15px; }
                        .logo img { max-width: 100px; height: auto; margin: 0 auto 10px; display: block; }
                        .temple-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                        .temple-info { font-size: 11px; line-height: 1.4; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .info-row { font-size: 12px; margin: 5px 0; text-align: center; }
                        .deity-box { background: #f0f0f0; border: 2px solid #000; 
                                    padding: 10px; margin: 15px 0; text-align: center; font-size: 16px; font-weight: bold; }
                        .item-box { border: 3px solid #000; padding: 15px; margin: 15px 0; text-align: center; }
                        .item-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                        .item-secondary { font-size: 14px; color: #333; }
                        .token { text-align: center; font-size: 18px; font-weight: bold; 
                                border: 3px solid #000; padding: 12px; margin: 15px 0; }
                        .token-label { font-size: 14px; margin-bottom: 5px; }
                        .token-number { font-size: 28px; }
                        .price-box { font-size: 14px; text-align: center; margin: 10px 0; }
                        .payment-method { text-align: center; font-size: 14px; font-weight: bold; 
                                         background: #000; color: #fff; padding: 8px; margin: 15px 0; }
                        .total { text-align: center; font-size: 20px; font-weight: bold; margin: 15px 0; }
                        .footer { text-align: center; font-size: 10px; margin-top: 15px; }
                    </style>

                    <div class="header">
                        ${logoHtml}
                        <div class="temple-name">${settings.temple_name || 'Temple'}</div>
                        <div class="temple-info">
                            ${settings.temple_address || ''}${settings.temple_city ? ', ' + settings.temple_city : ''}
                            ${settings.temple_pincode ? ' - ' + settings.temple_pincode : ''}<br>
                            ${settings.temple_phone ? 'Tel: ' + settings.temple_phone : ''}
                        </div>
                    </div>

                    <div class="divider"></div>

                    ${item.token_number ? `
                    <div class="token">
                        <div class="token-label">TOKEN NO</div>
                        <div class="token-number">${item.token_number}</div>
                    </div>
                    <div class="divider"></div>
                    ` : ''}

                    <div class="info-row">Date: ${new Date().toLocaleDateString('en-GB')}</div>
                    <div class="info-row">Bill No: ${booking.booking_number}</div>

                    <div class="divider"></div>

                    ${item.deity_name ? `<div class="deity-box">${item.deity_name}</div>` : ''}

                    <div class="item-box">
                        <div class="item-name">${item.item_name}</div>
                        ${item.item_name_secondary ? `<div class="item-secondary">${item.item_name_secondary}</div>` : ''}
                    </div>

                    <div class="price-box">
                        ${currency}${parseFloat(item.unit_price || item.price).toFixed(2)} × 1 = 
                        ${currency}${parseFloat(item.unit_price || item.price).toFixed(2)}
                    </div>

                    <div class="divider"></div>

                    <div class="payment-method">
                        PAID: ${booking.payment_method_name || 'CASH'}
                    </div>

                    <div class="total">
                        TOTAL: ${currency}${parseFloat(item.total_price || item.price).toFixed(2)}
                    </div>

                    <div class="divider"></div>

                    <div class="footer">
                        ${new Date().toLocaleString('en-GB')}<br>
                        Thank you for your visit!
                    </div>
                </div>
            `;
        }
    };

})(jQuery, window);