// js/pages/purchase/requests/print.js
// Purchase Request Print View Page

(function ($, window) {
    'use strict';

    window.PurchaseRequestsPrintPage = {
        currentPrId: null,
        currentPr: null,
        templeSettings: null,

        init: function (params) {
            const self = this;
            this.currentPrId = params?.id || this.getPrIdFromUrl();

            if (!this.currentPrId) {
                this.showError('Purchase Request ID not provided');
                return;
            }

            // Load temple settings first, then PR data
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
                            temple_email: settings.temple_email
                        };
                    } else {
                        self.loadFromLocalStorage();
                    }
                    // Load PR after settings are loaded
                    self.loadPurchaseRequest();
                })
                .fail(function () {
                    // Fallback and continue
                    self.loadFromLocalStorage();
                    self.loadPurchaseRequest();
                });
        },

        getPrIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },


        // Update the loadTempleSettings function

        loadTempleSettings: function () {
            const self = this;

            // First try to get fresh settings from API
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function (response) {
                    if (response.success && response.data && response.data.values) {
                        const settings = response.data.values;

                        self.templeSettings = {
                            name: settings.temple_name || 'Temple Management System',
                            temple_name: settings.temple_name,
                            temple_logo: settings.temple_logo || settings.logo_url,
                            address: settings.temple_address || '',
                            temple_address: settings.temple_address,
                            city: settings.temple_city || 'Chennai',
                            temple_city: settings.temple_city,
                            state: settings.temple_state || 'Tamil Nadu',
                            temple_state: settings.temple_state,
                            pincode: settings.temple_pincode || '600001',
                            temple_pincode: settings.temple_pincode,
                            country: settings.temple_country || 'India',
                            temple_country: settings.temple_country,
                            phone: settings.temple_phone || '',
                            temple_phone: settings.temple_phone,
                            email: settings.temple_email || '',
                            temple_email: settings.temple_email,
                            website: settings.temple_website || ''
                        };
                    } else {
                        // Fallback to localStorage
                        self.loadFromLocalStorage();
                    }
                })
                .fail(function () {
                    // Fallback to localStorage if API fails
                    self.loadFromLocalStorage();
                });
        },

        loadFromLocalStorage: function () {
            const settings = JSON.parse(localStorage.getItem('temple_settings') || '{}');
            const temple = JSON.parse(localStorage.getItem('temple') || '{}');

            this.templeSettings = {
                name: settings.temple_name || temple.name || 'Temple Management System',
                temple_name: settings.temple_name || temple.name,
                temple_logo: settings.temple_logo || settings.logo_url || temple.logo,
                address: settings.temple_address || temple.address || '1234 Temple Street',
                temple_address: settings.temple_address || temple.address,
                city: settings.temple_city || temple.city || 'Chennai',
                temple_city: settings.temple_city || temple.city,
                state: settings.temple_state || temple.state || 'Tamil Nadu',
                temple_state: settings.temple_state || temple.state,
                pincode: settings.temple_pincode || temple.pincode || '600001',
                temple_pincode: settings.temple_pincode || temple.pincode,
                country: settings.temple_country || temple.country || 'India',
                temple_country: settings.temple_country || temple.country,
                phone: settings.temple_phone || temple.phone || '',
                temple_phone: settings.temple_phone || temple.phone,
                email: settings.temple_email || temple.email || '',
                temple_email: settings.temple_email || temple.email,
                website: settings.temple_website || temple.website || ''
            };
        },

        loadPurchaseRequest: function () {
            const self = this;

            TempleAPI.get('/purchase/requests/' + this.currentPrId)
                .done(function (response) {
                    if (response.success) {
                        self.currentPr = response.data;
                        self.renderPrintView();
                        // Auto trigger print dialog after a short delay
                        setTimeout(function () {
                            window.print();
                        }, 500);
                    } else {
                        self.showError('Failed to load purchase request');
                    }
                })
                .fail(function () {
                    self.showError('Failed to load purchase request');
                });
        },


// Update the renderPrintView function with Journal Voucher style

renderPrintView: function() {
    const pr = this.currentPr;
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
            <title>Purchase Request - ${pr.pr_number}</title>
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
                    margin: 20px 0;
                    padding: 15px 0;
                    text-align: center;
                }
                
                .document-title {
                    font-size: 28px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                
                .info-table {
                    width: 100%;
                    margin: 20px 0;
                }
                
                .info-table td {
                    padding: 8px 5px;
                    font-size: 14px;
                }
                
                .info-label {
                    font-weight: bold;
                    width: 150px;
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
                }
                
                .items-table tbody td {
                    padding: 8px;
                    font-size: 14px;
                    border-bottom: 1px solid #ddd;
                }
                
                .total-row {
                    border-top: 2px solid black;
                    padding-top: 15px;
                    margin-top: 20px;
                }
                
                .total-table {
                    width: 100%;
                    margin-top: 20px;
                }
                
                .total-table td {
                    padding: 8px;
                    font-size: 14px;
                }
                
                .total-box {
                    border: 2px solid #000;
                    padding: 8px;
                    font-weight: bold;
                    font-size: 16px;
                }
                
                .narration-section {
                    margin-top: 20px;
                }
                
                .narration-box {
                    border: 1px solid #ccc;
                    padding: 10px;
                    min-height: 50px;
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
                }
                
                .status-draft { background: #6c757d; color: white; }
                .status-submitted { background: #17a2b8; color: white; }
                .status-approved { background: #28a745; color: white; }
                .status-rejected { background: #dc3545; color: white; }
                .status-converted { background: #007bff; color: white; }
                
                .balanced {
                    color: #28a745;
                    font-weight: bold;
                }
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
                            ${temple.temple_country || temple.country || 'India'}<br>
                            ${temple.temple_phone ? 'Tel: ' + temple.temple_phone : ''}<br>
                            ${temple.temple_email ? 'E-mail: ' + temple.temple_email : ''}
                        </td>
                    </tr>
                </table>
                
                <!-- Title -->
                <div class="title-section">
                    <div class="document-title">PURCHASE REQUEST</div>
                </div>
                
                <!-- Document Details -->
                <table class="info-table">
                    <tr>
                        <td class="info-label">Request No:</td>
                        <td>${pr.pr_number}</td>
                        <td class="info-label">Date:</td>
                        <td>${this.formatDate(pr.request_date)}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Fund:</td>
                        <td>${pr.fund?.name || 'General'}</td>
                        <td class="info-label">Status:</td>
                        <td>${pr.status}</td>
                    </tr>
                    
                    <tr>
                        <td class="info-label">Requested By:</td>
                        <td colspan="3">${pr.requester?.name || '-'}</td>
                    </tr>
                </table>
                
                <!-- Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <td width="50" align="center">S.No</td>
                            <td>Item Description</td>
                            <td align="center" width="100">Quantity</td>
                            <td align="center" width="80">UOM</td>
                            <td width="150">Preferred Supplier</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderItemsRows(pr.items)}
                    </tbody>
                </table>
                
                                
               
              
            </div>
        </body>
        </html>
    `;
    
    // Replace document content
    document.open();
    document.write(html);
    document.close();
},

renderItemsRows: function(items) {
    if (!items || items.length === 0) {
        return '<tr><td colspan="5" align="center" style="padding: 20px;">No items found</td></tr>';
    }
    
    return items.map((item, index) => {
        const itemName = item.item_type === 'product' 
            ? (item.product?.name || 'Product') 
            : (item.service?.name || 'Service');
        
        return `
            <tr>
                <td align="center">${index + 1}</td>
                <td>
                    <strong>${itemName}</strong>
                    ${item.description ? '<br><small>(' + item.description + ')</small>' : ''}
                </td>
                <td align="center">${item.quantity}</td>
                <td align="center">${item.uom?.name || '-'}</td>
                <td>${item.preferred_supplier?.name || '-'}</td>
            </tr>
        `;
    }).join('');
},


        getStatusBadge: function (status) {
            const statusClass = `status-${status.toLowerCase()}`;
            return `<span class="status-badge ${statusClass}">${status}</span>`;
        },

        getApprovalSection: function (pr) {
            if (pr.status === 'APPROVED' || pr.status === 'CONVERTED') {
                return `
                    <div class="status-box approved">
                        <div class="section-header" style="margin-top: 0; background: none; border: none;">
                            ✓ Approval Information
                        </div>
                        <div style="display: table; width: 100%;">
                            <div style="display: table-row;">
                                <div style="display: table-cell; width: 150px; font-weight: bold;">Approved By:</div>
                                <div style="display: table-cell;">${pr.approver?.name || '-'}</div>
                            </div>
                            <div style="display: table-row;">
                                <div style="display: table-cell; font-weight: bold;">Approved Date:</div>
                                <div style="display: table-cell;">${pr.approved_at ? this.formatDate(pr.approved_at, true) : '-'}</div>
                            </div>
                            ${pr.approval_notes ? `
                                <div style="display: table-row;">
                                    <div style="display: table-cell; font-weight: bold;">Approval Notes:</div>
                                    <div style="display: table-cell;">${pr.approval_notes}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            } else if (pr.status === 'REJECTED') {
                return `
                    <div class="status-box rejected">
                        <div class="section-header" style="margin-top: 0; background: none; border: none;">
                            ✗ Rejection Information
                        </div>
                        <div style="display: table; width: 100%;">
                            <div style="display: table-row;">
                                <div style="display: table-cell; width: 150px; font-weight: bold;">Rejected By:</div>
                                <div style="display: table-cell;">${pr.approver?.name || '-'}</div>
                            </div>
                            <div style="display: table-row;">
                                <div style="display: table-cell; font-weight: bold;">Rejected Date:</div>
                                <div style="display: table-cell;">${pr.rejected_at ? this.formatDate(pr.rejected_at, true) : '-'}</div>
                            </div>
                            <div style="display: table-row;">
                                <div style="display: table-cell; font-weight: bold;">Rejection Reason:</div>
                                <div style="display: table-cell; color: #dc3545;">${pr.rejection_reason || '-'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            return '';
        },

        getConversionSection: function (pr) {
            if (pr.converted_to_po) {
                return `
                    <div class="status-box converted">
                        <div class="section-header" style="margin-top: 0; background: none; border: none;">
                            → Purchase Order Conversion
                        </div>
                        <div style="display: table; width: 100%;">
                            <div style="display: table-row;">
                                <div style="display: table-cell; width: 150px; font-weight: bold;">PO Number:</div>
                                <div style="display: table-cell;">
                                    ${pr.purchase_order?.po_number || 'PO-' + pr.po_id}
                                </div>
                            </div>
                            <div style="display: table-row;">
                                <div style="display: table-cell; font-weight: bold;">Converted By:</div>
                                <div style="display: table-cell;">${pr.converter?.name || '-'}</div>
                            </div>
                            <div style="display: table-row;">
                                <div style="display: table-cell; font-weight: bold;">Conversion Date:</div>
                                <div style="display: table-cell;">${pr.converted_at ? this.formatDate(pr.converted_at, true) : '-'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            return '';
        },

        renderItemsTable: function (items) {
            if (!items || items.length === 0) {
                return '<tr><td colspan="7" class="text-center">No items found</td></tr>';
            }

            return items.map((item, index) => {
                const itemName = item.item_type === 'product'
                    ? (item.product?.name || 'Product')
                    : (item.service?.name || 'Service');

                return `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td class="text-center">${item.item_type.toUpperCase()}</td>
                        <td>
                            <strong>${itemName}</strong>
                            ${item.description ? '<br><small>' + item.description + '</small>' : ''}
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-center">${item.uom?.name || '-'}</td>
                        <td>${item.preferred_supplier?.name || '-'}</td>
                        <td>${item.remarks || '-'}</td>
                    </tr>
                `;
            }).join('');
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