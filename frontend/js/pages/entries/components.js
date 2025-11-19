// js/pages/entries/components.js
(function($, window) {
    'use strict';
    
    window.EntryComponents = {
        // Common entry validation
        validateBalance: function(debitTotal, creditTotal) {
            return Math.abs(debitTotal - creditTotal) < 0.01;
        },
        
        // Format ledger option
        formatLedgerOption: function(ledger) {
            return `<option value="${ledger.id}">(${ledger.left_code}/${ledger.right_code}) - ${ledger.name}</option>`;
        },
        
        // Create entry row template
        createEntryRow: function(rowId, ledgers, type = 'journal') {
            const options = ledgers.map(l => this.formatLedgerOption(l)).join('');
            
            if (type === 'journal' || type === 'contra' || type === 'credit-note' || type === 'debit-note') {
                return `
                    <tr data-row-id="${rowId}">
                        <td>${rowId}</td>
                        <td>
                            <select class="form-select ledger-select" data-row="${rowId}" required>
                                <option value="">Select Account</option>
                                ${options}
                            </select>
                        </td>
                        <td>
                            <input type="number" class="form-control debit-amount text-end" 
                                   data-row="${rowId}" min="0" step="0.01" value="0.00">
                        </td>
                        <td>
                            <input type="number" class="form-control credit-amount text-end" 
                                   data-row="${rowId}" min="0" step="0.01" value="0.00">
                        </td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            if (type === 'receipt' || type === 'payment') {
                return `
                    <tr data-row-id="${rowId}">
                        <td>${rowId}</td>
                        <td>
                            <select class="form-select ledger-select" data-row="${rowId}" required>
                                <option value="">Select Account</option>
                                ${options}
                            </select>
                        </td>
                        <td>
                            <input type="number" class="form-control amount text-end" 
                                   data-row="${rowId}" min="0.01" step="0.01" required>
                        </td>
                        <td>
                            <input type="text" class="form-control details" 
                                   data-row="${rowId}" placeholder="Details...">
                        </td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-danger remove-row" data-row="${rowId}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        },
        
        // Generate month navigation
        generateMonthNav: function(currentDate) {
            const date = new Date(currentDate);
            const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            
            return `
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary month-nav" 
                            data-date="${prevMonth.toISOString().split('T')[0]}">
                        <i class="bi bi-chevron-left"></i> ${prevMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" disabled>
                        ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary month-nav" 
                            data-date="${nextMonth.toISOString().split('T')[0]}">
                        ${nextMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            `;
        },
        
        // Payment mode fields
        renderPaymentModeFields: function(mode) {
            if (mode === 'CHEQUE') {
                return `
                    <div class="row g-3 mt-2" id="chequeDetails">
                        <div class="col-md-6">
                            <label class="form-label">Cheque Number <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="chequeNo" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Cheque Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" id="chequeDate" required>
                        </div>
                    </div>
                `;
            }
            
            if (mode === 'ONLINE') {
                return `
                    <div class="row g-3 mt-2" id="onlineDetails">
                        <div class="col-md-6">
                            <label class="form-label">Transaction Number <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="transactionNo" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Transaction Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" id="transactionDate" required>
                        </div>
                    </div>
                `;
            }
            
            return '';
        },
        
        // Export functionality
        exportEntries: function(filters) {
            const params = new URLSearchParams(filters);
            const url = `/accounts/entries/export?${params.toString()}`;
            window.open(url, '_blank');
        },
        
        // Print preview
        printEntry: function(entryId, entryType) {
            const printWindow = window.open('', '_blank');
            
            TempleAPI.get(`/accounts/entries/${entryId}`)
                .done(function(response) {
                    if (response.success) {
                        const entry = response.data;
                        const printContent = EntryComponents.generatePrintContent(entry, entryType);
                        
                        printWindow.document.write(printContent);
                        printWindow.document.close();
                        printWindow.focus();
                        
                        setTimeout(function() {
                            printWindow.print();
                        }, 250);
                    }
                });
        },
        
        // Generate print content
        generatePrintContent: function(entry, entryType) {
            const temple = TempleCore.getTemple();
            const typeNames = {
                1: 'RECEIPT VOUCHER',
                2: 'PAYMENT VOUCHER',
                3: 'CONTRA VOUCHER',
                4: 'JOURNAL VOUCHER',
                5: 'CREDIT NOTE',
                6: 'DEBIT NOTE',
                7: 'INVENTORY JOURNAL'
            };
            
            let itemsHtml = '';
            entry.entry_items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.ledger.name}</td>
                        <td class="text-end">${item.dc === 'D' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                        <td class="text-end">${item.dc === 'C' ? TempleCore.formatCurrency(item.amount) : '-'}</td>
                    </tr>
                `;
            });
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${typeNames[entry.entrytype_id]} - ${entry.entry_code}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { margin: 5px 0; }
                        .header h2 { margin: 5px 0; color: #333; }
                        .info-table { width: 100%; margin-bottom: 20px; }
                        .info-table td { padding: 5px; }
                        .items-table { width: 100%; border-collapse: collapse; }
                        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; }
                        .items-table th { background-color: #f2f2f2; }
                        .footer { margin-top: 50px; }
                        .signature { display: inline-block; width: 200px; text-align: center; }
                        .amount-words { margin: 20px 0; padding: 10px; background: #f9f9f9; }
                        @media print {
                            body { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${temple.name}</h1>
                        <p>${temple.address}</p>
                        <h2>${typeNames[entry.entrytype_id]}</h2>
                    </div>
                    
                    <table class="info-table">
                        <tr>
                            <td><strong>Voucher No:</strong> ${entry.entry_code}</td>
                            <td style="text-align: right;"><strong>Date:</strong> ${TempleCore.formatDate(entry.date)}</td>
                        </tr>
                        ${entry.paid_to ? `
                        <tr>
                            <td colspan="2"><strong>Paid To:</strong> ${entry.paid_to}</td>
                        </tr>
                        ` : ''}
                        ${entry.narration ? `
                        <tr>
                            <td colspan="2"><strong>Narration:</strong> ${entry.narration}</td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Particulars</th>
                                <th width="120">Debit</th>
                                <th width="120">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th>Total</th>
                                <th style="text-align: right;">${TempleCore.formatCurrency(entry.dr_total)}</th>
                                <th style="text-align: right;">${TempleCore.formatCurrency(entry.cr_total)}</th>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div class="footer">
                        <div class="signature">
                            <p>___________________</p>
                            <p>Prepared By</p>
                        </div>
                        <div class="signature" style="margin-left: 100px;">
                            <p>___________________</p>
                            <p>Checked By</p>
                        </div>
                        <div class="signature" style="margin-left: 100px;">
                            <p>___________________</p>
                            <p>Approved By</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        }
    };
    
})(jQuery, window);