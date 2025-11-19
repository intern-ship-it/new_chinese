// js/pages/purchase/suppliers/statement.js
// Supplier Statement of Account Page with Enhanced Print

(function($, window) {
    'use strict';
    
    window.PurchaseReportsSupplierStatementsPage = {
        supplierId: null,
        statementData: null,
        templeSettings: null,
        
        init: function(params) {
            this.params = params || {};
            
            // Get supplier ID from URL params or passed params
            if (this.params.id) {
                this.supplierId = this.params.id;
            } else {
                // Try to extract from URL path
                const pathParts = window.location.pathname.split('/');
                const supplierIndex = pathParts.indexOf('suppliers');
                if (supplierIndex > -1 && pathParts[supplierIndex + 1]) {
                    this.supplierId = pathParts[supplierIndex + 1];
                }
            }
            
            // Load temple settings
            this.loadTempleSettings();
            
            if (!this.supplierId) {
                this.renderSupplierSelection();
            } else {
                this.render();
                this.loadStatement();
            }
            
            this.bindEvents();
        },
        
        loadTempleSettings: function() {
            const self = this;
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function(response) {
                    if (response.success && response.data && response.data.values) {
                        self.templeSettings = response.data.values;
                    }
                })
                .fail(function() {
                    // Fallback to localStorage if available
                    try {
                        const storedData = localStorage.getItem('temple_settings');
                        if (storedData) {
                            self.templeSettings = JSON.parse(storedData);
                        }
                    } catch (e) {
                        self.templeSettings = {};
                    }
                });
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col">
                            <h2 class="page-title">
                                <i class="bi bi-file-text"></i> Supplier Statement of Account
                            </h2>
                        </div>
                        <div class="col-auto">
                            <div class="btn-group">
                                <button class="btn btn-secondary" id="printStatement">
                                    <i class="bi bi-printer"></i> Print
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="supplierSelect">
                                        <option value="">Loading...</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="fromDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="toDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-primary w-100" id="generateStatement">
                                        <i class="bi bi-file-text"></i> Generate Statement
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Statement Content -->
                    <div id="statementContainer">
                        <div class="card">
                            <div class="card-body">
                                <div id="statementContent">
                                    <div class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p class="mt-3">Loading statement...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    @media print {
                        .btn-group, .card:first-child, .navbar, .sidebar { display: none !important; }
                        #statementContainer { margin: 0 !important; }
                        .statement-header { page-break-after: avoid; }
                        .statement-table { page-break-inside: avoid; }
                    }
                    
                    .statement-header {
                        border-bottom: 2px solid #dee2e6;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    
                    .statement-table th {
                        background-color: #f8f9fa;
                        font-weight: 600;
                    }
                    
                    .statement-table .debit {
                        color: #dc3545;
                    }
                    
                    .statement-table .credit {
                        color: #28a745;
                    }
                    
                    .statement-summary {
                        background-color: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin-top: 30px;
                    }
                    
                    .running-balance {
                        font-weight: 600;
                    }
                    
                    .running-balance.negative {
                        color: #dc3545;
                    }
                </style>
            `;
            
            $('#page-container').html(html);
            
            // Set default dates (6 months range)
            const today = new Date();
            const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
            
            $('#toDate').val(today.toISOString().split('T')[0]);
            $('#fromDate').val(sixMonthsAgo.toISOString().split('T')[0]);
            
            // Load suppliers list
            this.loadSuppliers();
        },
        
        renderSupplierSelection: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row justify-content-center mt-5">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h4>Select Supplier</h4>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label class="form-label">Choose a supplier to view statement</label>
                                        <select class="form-select" id="supplierSelectMain">
                                            <option value="">Loading suppliers...</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-primary" id="selectSupplierBtn" disabled>
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.loadSuppliersForSelection();
        },
        
        loadSuppliers: function() {
            const self = this;
            
            TempleAPI.get('/suppliers/active').done(function(response) {
                if (response.success) {
                    let options = '<option value="">Select Supplier</option>';
                    $.each(response.data, function(index, supplier) {
                        const selected = supplier.id === self.supplierId ? 'selected' : '';
                        options += `<option value="${supplier.id}" ${selected}>
                            ${supplier.name} (${supplier.supplier_code})
                        </option>`;
                    });
                    $('#supplierSelect').html(options);
                }
            }).fail(function() {
                TempleCore.showToast('Failed to load suppliers', 'error');
            });
        },
        
        loadSuppliersForSelection: function() {
            const self = this;
            
            TempleAPI.get('/suppliers/active').done(function(response) {
                if (response.success) {
                    let options = '<option value="">Select Supplier</option>';
                    $.each(response.data, function(index, supplier) {
                        options += `<option value="${supplier.id}">
                            ${supplier.name} (${supplier.supplier_code})
                        </option>`;
                    });
                    $('#supplierSelectMain').html(options);
                    
                    $('#supplierSelectMain').on('change', function() {
                        $('#selectSupplierBtn').prop('disabled', !$(this).val());
                    });
                    
                    $('#selectSupplierBtn').on('click', function() {
                        const supplierId = $('#supplierSelectMain').val();
                        if (supplierId) {
                            self.supplierId = supplierId;
                            self.render();
                            self.loadStatement();
                        }
                    });
                }
            });
        },
        
        loadStatement: function() {
            const self = this;
            
            if (!this.supplierId) {
                TempleCore.showToast('Please select a supplier', 'warning');
                return;
            }
            
            const params = {
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val()
            };
            
            $('#statementContent').html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Generating statement...</p>
                </div>
            `);
            
            TempleAPI.get('/purchase/suppliers/' + this.supplierId + '/suppliers-statement', params)
                .done(function(response) {
                    if (response.success) {
                        self.statementData = response.data;
                        self.renderStatement(response.data);
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load statement', 'error');
                    $('#statementContent').html(`
                        <div class="alert alert-danger">
                            Failed to load statement. Please try again.
                        </div>
                    `);
                });
        },
        
        renderStatement: function(data) {
            const currency = TempleCore.getCurrency();
            const temple = TempleCore.getTemple();
            
            // Use period from the data, not from temple object
            const periodFrom = data.period ? data.period.from : $('#fromDate').val();
            const periodTo = data.period ? data.period.to : $('#toDate').val();
            console.log(data);
            let html = `
                <!-- Statement Header -->
                <div class="statement-header">
                    <div class="row">
                        <div class="col-md-6">
                            <h3>${temple.name || 'Temple Management System'}</h3>
                            <p class="mb-1">${temple.address || ''}</p>
                            <p class="mb-1">Phone: ${temple.phone || ''}</p>
                            <p>Email: ${temple.email || ''}</p>
                        </div>
                        <div class="col-md-6 text-end">
                            <h4>STATEMENT OF ACCOUNT</h4>
                            <p class="mb-1"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>Period:</strong> ${new Date(periodFrom).toLocaleDateString()} to ${new Date(periodTo).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="text-muted mb-2">Bill To:</h6>
                                    <h5>${data.supplier.name}</h5>
                                    <p class="mb-1">${data.supplier.address || ''}</p>
                                    <p class="mb-1">${data.supplier.city || ''} ${data.supplier.state || ''} ${data.supplier.pincode || ''}</p>
                                    <p class="mb-1">Phone: ${data.supplier.mobile_no || 'N/A'}</p>
                                    <p class="mb-0">Email: ${data.supplier.email || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <table class="table table-sm mb-0">
                                        <tr>
                                            <td>Supplier Code:</td>
                                            <th>${data.supplier.supplier_code || data.supplier.code || 'N/A'}</th>
                                        </tr>
                                        <tr>
                                            <td>GST No:</td>
                                            <th>${data.supplier.gst_no || 'N/A'}</th>
                                        </tr>
                                        <tr>
                                            <td>Credit Limit:</td>
                                             <th>${currency}${(data.supplier.credit_limit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                        </tr>
                                        <tr>
                                            <td>Payment Terms:</td>
                                            <th>${data.supplier.payment_terms || 0} days</th>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Opening Balance -->
                <div class="row mb-3">
                    <div class="col-12">
                        <div class="alert alert-info">
                            <strong>Opening Balance as on ${new Date(periodFrom).toLocaleDateString()}:</strong> 
                            <span class="float-end">${currency} ${Math.abs(data.opening_balance).toLocaleString(undefined, {minimumFractionDigits: 2})} ${data.opening_balance >= 0 ? '(Payable)' : '(Advance)'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Transaction Table -->
                <div class="table-responsive">
                    <table class="table table-bordered statement-table">
                        <thead>
                            <tr>
                                <th width="100">Date</th>
                                <th width="120">Type</th>
                                <th width="150">Reference</th>
                                <th>Description</th>
                                <th width="120" class="text-end">Debit</th>
                                <th width="120" class="text-end">Credit</th>
                                <th width="120" class="text-end">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add opening balance row
            html += `
                <tr>
                    <td colspan="6"><strong>Opening Balance</strong></td>
                    <td class="text-end running-balance ${data.opening_balance < 0 ? 'negative' : ''}">
                        ${currency}${Math.abs(data.opening_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        ${data.opening_balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                </tr>
            `;
            
            // Add transactions
            if (data.transactions && data.transactions.length > 0) {
                $.each(data.transactions, function(index, trans) {
                    const typeClass = trans.type === 'INVOICE' ? 'debit' : 'credit';
                    const typeBadge = trans.type === 'INVOICE' ? 'danger' : 'success';
                    console.log(trans);
                    html += `
                        <tr>
                            <td>${new Date(trans.date).toLocaleDateString()}</td>
                            <td><span class="badge bg-${typeBadge}">${trans.type}</span></td>
                            <td>${trans.reference || trans.reference_number || ''}</td>
                            <td>${trans.description}</td>
                            <td class="text-end ${typeClass}">
                                ${trans.debit > 0 ? currency + trans.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                            </td>
                            <td class="text-end ${typeClass}">
                                ${trans.credit > 0 ? currency + trans.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                            </td>
                      <td class="text-end running-balance ${trans.balance < 0 ? 'negative' : ''}">
    ${currency}${Math.abs(trans.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
    ${(trans.balance ?? 0) >= 0 ? 'Dr' : 'Cr'}
</td>
                        </tr>
                    `;
                });
            } else {
                html += `
                    <tr>
                        <td colspan="7" class="text-center">No transactions found for the selected period</td>
                    </tr>
                `;
            }
            
            // Calculate totals
            const totalInvoices = data.total_invoices || data.total_purchases || 0;
            const totalPayments = data.total_payments || 0;
       
            // Add totals row
            html += `
                        </tbody>
                        <tfoot>
                            <tr class="table-secondary">
                                <th colspan="4">Period Totals</th>
                                <th class="text-end">${currency}${totalInvoices.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                <th class="text-end">${currency}${totalPayments.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                <th></th>
                            </tr>
                            <tr class="table-primary">
                                <th colspan="6">Closing Balance as on ${new Date(periodTo).toLocaleDateString()}</th>
                                <th class="text-end ${data.closing_balance < 0 ? 'negative' : ''}">
                                    ${currency}${Math.abs(data.closing_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    ${data.closing_balance >= 0 ? '(Payable)' : '(Advance)'}
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <!-- Summary Section -->
                <div class="statement-summary">
                    <div class="row">
                        <div class="col-md-6">
                            <h5>Transaction Summary</h5>
                            <table class="table table-sm">
                                <tr>
                                    <td>Total Invoices:</td>
                                    <th class="text-end">${currency}${totalInvoices.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                </tr>
                                <tr>
                                    <td>Total Payments:</td>
                                    <th class="text-end">${currency}${totalPayments.toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                </tr>
                                <tr>
                                    <td>Net Change:</td>
                                    <th class="text-end">${currency}${Math.abs(totalInvoices - totalPayments).toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h5>Balance Summary</h5>
                            <table class="table table-sm">
                                <tr>
                                    <td>Opening Balance:</td>
                                    <th class="text-end">${currency}${Math.abs(data.opening_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                </tr>
                                <tr>
                                    <td>Movement:</td>
                                    <th class="text-end">${currency}${Math.abs(totalInvoices - totalPayments).toLocaleString(undefined, {minimumFractionDigits: 2})}</th>
                                </tr>
                                <tr class="table-primary">
                                    <td><strong>Closing Balance:</strong></td>
                                    <th class="text-end">
                                        <strong>${currency}${Math.abs(data.closing_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                                        ${data.closing_balance >= 0 ? '(Payable)' : '(Advance)'}
                                    </th>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Footer Note -->
                <div class="mt-4 text-center text-muted">
                    <small>This is a computer generated statement and does not require signature.</small><br>
                    <small>For any queries, please contact our accounts department.</small>
                </div>
            `;
            
            $('#statementContent').html(html);
        },
        
        printStatement: function() {
            if (!this.statementData) {
                TempleCore.showToast('Please generate a statement first', 'warning');
                return;
            }
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                TempleCore.showToast('Please allow popups to print', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML(this.statementData);
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Auto-trigger print dialog after a small delay
            setTimeout(function() {
                printWindow.focus();
                printWindow.print();
            }, 250);
        },
        
        generatePrintHTML: function(data) {
            const self = this;
            const currency = TempleCore.getCurrency();
            const temple = this.templeSettings || {};
            
            const periodFrom = data.period ? data.period.from : $('#fromDate').val();
            const periodTo = data.period ? data.period.to : $('#toDate').val();
            
            // Generate header
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
            
            // Generate transactions HTML
            let transactionsHTML = '';
            
            // Opening balance row
            transactionsHTML += `
                <tr>
                    <td colspan="5" style="padding:5px;border:1px solid #ddd;background:#f0f0f0;"><b>Opening Balance</b></td>
                    <td align="right" style="padding:5px;border:1px solid #ddd;background:#f0f0f0;">
                        <b>${currency}${Math.abs(data.opening_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</b>
                        ${data.opening_balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                </tr>
            `;
            
            // Transaction rows
            if (data.transactions && data.transactions.length > 0) {
                $.each(data.transactions, function(index, trans) {
                    const transDate = trans.date ? self.formatDate(trans.date) : '';
                    transactionsHTML += `
                        <tr style="font-size:14px;">
                            <td style="padding:5px;border:1px solid #ddd;">${transDate}</td>
                            <td style="padding:5px;border:1px solid #ddd;">${trans.reference || trans.reference_number || ''}</td>
                            <td style="padding:5px;border:1px solid #ddd;">${trans.description || ''}</td>
                            <td align="right" style="padding:5px;border:1px solid #ddd;">${trans.debit > 0 ? currency + trans.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}</td>
                            <td align="right" style="padding:5px;border:1px solid #ddd;">${trans.credit > 0 ? currency + trans.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}</td>
                            <td align="right" style="padding:5px;border:1px solid #ddd;">
                                ${currency}${Math.abs(trans.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                ${trans.balance >= 0 ? 'Dr' : 'Cr'}
                            </td>
                        </tr>
                    `;
                });
            } else {
                transactionsHTML += `
                    <tr>
                        <td colspan="6" style="padding:10px;border:1px solid #ddd;text-align:center;">No transactions found for the selected period</td>
                    </tr>
                `;
            }
            
            const totalInvoices = data.total_invoices || data.total_purchases || 0;
            const totalPayments = data.total_payments || 0;
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Statement of Account - ${data.supplier.name}</title>
                    <style>
                        @media print {
                            #backButton, #printButton, #controlButtons {
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
                                <br>${temple.temple_country || temple.country || 'India'}
                                ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                                ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                            </td>
                            <td width="50"></td>
                        </tr>
                    </table>
                    
                    <table width="750" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                                Statement of Account
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Supplier Details -->
                    <table width="750" border="0" align="center" cellpadding="5" style="margin-top: 20px;">
                        <tr style="font-size:14px;">
                            <td width="150"><b>Supplier:</b></td>
                            <td width="250"><strong>${data.supplier.name}</strong></td>
                            <td width="150"><b>Period:</b></td>
                            <td width="200">${this.formatDate(periodFrom)} to ${this.formatDate(periodTo)}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Address:</b></td>
                            <td>${data.supplier.address || 'N/A'}</td>
                            <td><b>Generated:</b></td>
                            <td>${this.formatDate(new Date().toISOString())}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>Phone:</b></td>
                            <td>${data.supplier.mobile_no || 'N/A'}</td>
                            <td><b>Email:</b></td>
                            <td>${data.supplier.email || 'N/A'}</td>
                        </tr>
                        <tr style="font-size:14px;">
                            <td><b>GST No:</b></td>
                            <td>${data.supplier.gst_no || 'N/A'}</td>
                            <td><b>Payment Terms:</b></td>
                            <td>${data.supplier.payment_terms || 0} days</td>
                        </tr>
                    </table>
                    
                    <!-- Transactions Table -->
                    <table width="750" align="center" style="margin-top:30px; border-collapse:collapse;">
                        <thead>
                            <tr style="font-size: 14px;">
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;">Date</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;">Reference</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;">Description</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;text-align:right;">Debit</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;text-align:right;">Credit</th>
                                <th style="border:1px solid #000; padding:8px;background:#f8f9fa;text-align:right;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionsHTML}
                        </tbody>
                        <tfoot>
                            <tr style="font-size:14px;background:#e9ecef;">
                                <td colspan="3" style="padding:8px;border:1px solid #000;"><b>Period Totals</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;"><b>${currency}${totalInvoices.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;"><b>${currency}${totalPayments.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;"></td>
                            </tr>
                            <tr style="font-size:14px;background:#c3e6fb;">
                                <td colspan="5" style="padding:8px;border:1px solid #000;"><b>CLOSING BALANCE</b></td>
                                <td align="right" style="padding:8px;border:1px solid #000;">
                                    <b>${currency}${Math.abs(data.closing_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</b>
                                    ${data.closing_balance >= 0 ? '(Payable)' : '(Advance)'}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <!-- Summary Section -->
                    <table width="750" align="center" style="margin-top:30px;">
                        <tr>
                            <td width="375" style="padding-right:15px;">
                                <table width="100%" style="border:1px solid #ddd;padding:10px;">
                                    <tr>
                                        <td colspan="2" style="padding:5px;border-bottom:1px solid #ddd;"><b>Transaction Summary</b></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:5px;">Total Invoices:</td>
                                        <td align="right" style="padding:5px;"><b>${currency}${totalInvoices.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:5px;">Total Payments:</td>
                                        <td align="right" style="padding:5px;"><b>${currency}${totalPayments.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:5px;">Net Movement:</td>
                                        <td align="right" style="padding:5px;"><b>${currency}${Math.abs(totalInvoices - totalPayments).toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                    </tr>
                                </table>
                            </td>
                            <td width="375" style="padding-left:15px;">
                                <table width="100%" style="border:1px solid #ddd;padding:10px;">
                                    <tr>
                                        <td colspan="2" style="padding:5px;border-bottom:1px solid #ddd;"><b>Balance Summary</b></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:5px;">Opening Balance:</td>
                                        <td align="right" style="padding:5px;"><b>${currency}${Math.abs(data.opening_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:5px;">Movement:</td>
                                        <td align="right" style="padding:5px;"><b>${currency}${Math.abs(totalInvoices - totalPayments).toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
                                    </tr>
                                    <tr style="background:#f0f0f0;">
                                        <td style="padding:5px;"><b>Closing Balance:</b></td>
                                        <td align="right" style="padding:5px;">
                                            <b>${currency}${Math.abs(data.closing_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</b>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Footer Note -->
                    <table width="750" align="center" style="margin-top:40px;">
                        <tr>
                            <td align="center" style="font-size:12px;color:#666;">
                                This is a computer generated statement and does not require signature.<br>
                                For any queries, please contact our accounts department.
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return date.getDate().toString().padStart(2, '0') + '/' + months[date.getMonth()] + '/' + date.getFullYear();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Generate statement button
            $('#page-container').on('click', '#generateStatement', function() {
                const supplierId = $('#supplierSelect').val();
                if (supplierId) {
                    self.supplierId = supplierId;
                    self.loadStatement();
                } else {
                    TempleCore.showToast('Please select a supplier', 'warning');
                }
            });
            
            // Print statement button
            $(document).on('click', '#printStatement', function() {
                self.printStatement();
            });
            
            // Supplier change
            $('#page-container').on('change', '#supplierSelect', function() {
                const supplierId = $(this).val();
                if (supplierId) {
                    self.supplierId = supplierId;
                }
            });
        }
    };
    
})(jQuery, window);