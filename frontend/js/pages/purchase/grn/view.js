// js/pages/purchase/grn/view.js
// View GRN details page with Print functionality

(function($, window) {
    'use strict';
    
    window.PurchaseGrnViewPage = {
        currentGrnId: null,
        currentGrn: null,
        
        init: function(params) {
            this.currentGrnId = params?.id || this.getGrnIdFromUrl();
            
            if (!this.currentGrnId) {
                TempleCore.showToast('GRN ID not provided', 'error');
                TempleRouter.navigate('purchase/grn');
                return;
            }
            
            this.render();
            this.loadGrn();
            this.bindEvents();
        },
        
        getGrnIdFromUrl: function() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">View GRN</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/grn'); return false;">GRN List</a></li>
                                    <li class="breadcrumb-item active">View GRN</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-secondary" id="btnPrintGrn">
                                <i class="bi bi-printer"></i> Print
                            </button>
                            <button class="btn btn-info" id="btnEditGrn">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-danger" id="btnCancelGrn">
                                <i class="bi bi-x-circle"></i> Cancel
                            </button>
                            <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/grn'); return false;">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading -->
                    <div id="grnLoading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- GRN Details -->
                    <div id="grnContent" style="display: none;">
                        <!-- Status Banner -->
                        <div id="statusBanner" class="alert mb-4">
                            <h5 class="mb-0">
                                <span id="grnStatusBadge" class="badge"></span>
                                <span id="grnStatusText" class="ms-2"></span>
                            </h5>
                        </div>
                        
                        <!-- GRN Header -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">GRN Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="text-muted">GRN Number:</label>
                                        <p class="fw-bold" id="grnNumber"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">GRN Date:</label>
                                        <p id="grnDate"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">GRN Type:</label>
                                        <p id="grnType"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Warehouse:</label>
                                        <p id="warehouse"></p>
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <div class="col-md-3">
                                        <label class="text-muted">Supplier:</label>
                                        <p id="supplierName"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">PO Reference:</label>
                                        <p id="poReference">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Invoice Reference:</label>
                                        <p id="invoiceReference">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Challan Number:</label>
                                        <p id="challanNumber">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delivery Information -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h6 class="mb-0">Delivery Information</h6>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="text-muted">Delivery Date:</label>
                                        <p id="deliveryDate">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Vehicle Number:</label>
                                        <p id="vehicleNumber">-</p>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="text-muted">Notes:</label>
                                        <p id="deliveryNotes">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quality Check -->
                        <div class="card mb-4" id="qualityCheckCard" style="display: none;">
                            <div class="card-header bg-warning text-dark">
                                <h6 class="mb-0">Quality Check Information</h6>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="text-muted">QC Done:</label>
                                        <p><span id="qcStatus" class="badge"></span></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">QC By:</label>
                                        <p id="qcBy">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">QC Date:</label>
                                        <p id="qcDate">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">QC Notes:</label>
                                        <p id="qcNotes">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- GRN Items -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h6 class="mb-0">Received Items</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Product</th>
                                                <th>Description</th>
                                                <th>Ordered</th>
                                                <th>Received</th>
                                                <th>Accepted</th>
                                                <th>Rejected</th>
                                                <th>Unit</th>
                                                <th>Batch</th>
                                                <th>Expiry</th>
                                                <th>Location</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody id="grnItemsTable">
                                            <tr>
                                                <td colspan="12" class="text-center">Loading items...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- Serial Numbers Section -->
                                <div id="serialNumbersSection" class="mt-3" style="display: none;">
                                    <h6>Serial Numbers</h6>
                                    <div id="serialNumbersList"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Summary -->
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Quantity Summary</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-sm">
                                            <tr>
                                                <td>Total Items:</td>
                                                <td class="text-end" id="totalItems">0</td>
                                            </tr>
                                            <tr>
                                                <td>Total Received:</td>
                                                <td class="text-end" id="totalReceived">0</td>
                                            </tr>
                                            <tr>
                                                <td>Total Accepted:</td>
                                                <td class="text-end text-success" id="totalAccepted">0</td>
                                            </tr>
                                            <tr>
                                                <td>Total Rejected:</td>
                                                <td class="text-end text-danger" id="totalRejected">0</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Document Information</h6>
                                    </div>
                                    <div class="card-body">
                                        <p><small class="text-muted">Created By:</small> <span id="createdBy"></span></p>
                                        <p><small class="text-muted">Created At:</small> <span id="createdAt"></span></p>
                                        <p><small class="text-muted">Updated By:</small> <span id="updatedBy"></span></p>
                                        <p><small class="text-muted">Updated At:</small> <span id="updatedAt"></span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        loadGrn: function() {
            const self = this;
            
            TempleAPI.get('/purchase/grn/' + this.currentGrnId)
                .done(function(response) {
                    if (response.success) {
                        self.currentGrn = response.data;
                        self.displayGrn();
                        $('#grnLoading').hide();
                        $('#grnContent').show();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load GRN', 'error');
                        TempleRouter.navigate('purchase/grn');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load GRN', 'error');
                    TempleRouter.navigate('purchase/grn');
                });
        },
        
        displayGrn: function() {
            const grn = this.currentGrn;
            
            // Header Information
            $('#grnNumber').text(grn.grn_number);
            $('#grnDate').text(TempleCore.formatDate(grn.grn_date));
            $('#grnType').text(grn.grn_type === 'PO_BASED' ? 'PO Based' : 'Direct');
            $('#warehouse').text(grn.warehouse?.name || '-');
            
            // Supplier and References
            $('#supplierName').text(grn.supplier?.name || '-');
            if (grn.po_id) {
                $('#poReference').html(`<a href="#" onclick="TempleRouter.navigate('purchase/orders/view', {id: '${grn.po_id}'}); return false;">${grn.purchase_order?.po_number || '-'}</a>`);
            }
            if (grn.invoice_id) {
                $('#invoiceReference').html(`<a href="#" onclick="TempleRouter.navigate('purchase/invoices/view', {id: '${grn.invoice_id}'}); return false;">${grn.purchase_invoice?.invoice_number || '-'}</a>`);
            }
            $('#challanNumber').text(grn.delivery_challan_no || '-');
            
            // Delivery Information
            $('#deliveryDate').text(grn.delivery_date ? TempleCore.formatDate(grn.delivery_date) : '-');
            $('#vehicleNumber').text(grn.vehicle_number || '-');
            $('#deliveryNotes').text(grn.notes || '-');
            
            // Quality Check
            if (grn.quality_check_done) {
                $('#qualityCheckCard').show();
                $('#qcStatus').text('Completed').addClass('badge-success');
                $('#qcBy').text(grn.quality_checker?.name || '-');
                $('#qcDate').text(grn.quality_check_date ? TempleCore.formatDate(grn.quality_check_date, 'time') : '-');
                $('#qcNotes').text(grn.quality_check_notes || '-');
            }
            
            // Status
            this.updateStatusDisplay(grn.status);
            
            // Items
            this.displayItems(grn.items || []);
            
            // Summary
            this.calculateSummary(grn.items || []);
            
            // Metadata
            $('#createdBy').text(grn.creator?.name || '-');
            $('#createdAt').text(TempleCore.formatDate(grn.created_at, 'time'));
            $('#updatedBy').text(grn.updater?.name || '-');
            $('#updatedAt').text(TempleCore.formatDate(grn.updated_at, 'time'));
            
            // Update button visibility
            this.updateButtonVisibility(grn.status);
        },
        
        displayItems: function(items) {
            let html = '';
            let hasSerialNumbers = false;
            
            if (items.length === 0) {
                html = '<tr><td colspan="12" class="text-center">No items found</td></tr>';
            } else {
                $.each(items, function(index, item) {
                    const statusBadge = item.received_quantity === item.accepted_quantity ? 
                        '<span class="badge bg-success">OK</span>' : 
                        '<span class="badge bg-warning">Partial</span>';
                    
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.product?.name || '-'}</td>
                            <td>${item.description || '-'}</td>
                            <td>${item.ordered_quantity || '-'}</td>
                            <td>${item.received_quantity}</td>
                            <td class="text-success">${item.accepted_quantity}</td>
                            <td class="text-danger">${item.rejected_quantity || 0}</td>
                            <td>${item.uom?.name || '-'}</td>
                            <td>${item.batch_number || '-'}</td>
                            <td>${item.expiry_date ? TempleCore.formatDate(item.expiry_date) : '-'}</td>
                            <td>${item.rack_location || '-'}</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                    
                    // Check for serial numbers
                    let serialNumbers = null;
                    if (item.serial_numbers) {
                        if (typeof item.serial_numbers === 'string') {
                            try {
                                serialNumbers = JSON.parse(item.serial_numbers);
                            } catch (e) {
                                console.error('Failed to parse serial numbers:', e);
                                serialNumbers = null;
                            }
                        } else if (Array.isArray(item.serial_numbers)) {
                            serialNumbers = item.serial_numbers;
                        }
                        
                        if (serialNumbers && serialNumbers.length > 0) {
                            hasSerialNumbers = true;
                        }
                    }
                });
            }
            
            $('#grnItemsTable').html(html);
            
            // Display serial numbers if any
            if (hasSerialNumbers) {
                this.displaySerialNumbers(items);
            }
        },
        
        displaySerialNumbers: function(items) {
            let html = '';
            
            $.each(items, function(index, item) {
                let serialNumbers = null;
                
                // Parse serial numbers safely
                if (item.serial_numbers) {
                    if (typeof item.serial_numbers === 'string') {
                        try {
                            serialNumbers = JSON.parse(item.serial_numbers);
                        } catch (e) {
                            console.error('Failed to parse serial numbers for item:', item.product?.name, e);
                            serialNumbers = null;
                        }
                    } else if (Array.isArray(item.serial_numbers)) {
                        serialNumbers = item.serial_numbers;
                    }
                }
                
                if (serialNumbers && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
                    html += `
                        <div class="mb-2">
                            <strong>${item.product?.name || 'Product ' + (index + 1)}:</strong>
                            <div class="d-flex flex-wrap gap-2 mt-1">
                    `;
                    
                    $.each(serialNumbers, function(i, sn) {
                        html += `<span class="badge bg-secondary">${sn}</span>`;
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
            });
            
            if (html) {
                $('#serialNumbersSection').show();
                $('#serialNumbersList').html(html);
            }
        },
        
        calculateSummary: function(items) {
            let totalReceived = 0;
            let totalAccepted = 0;
            let totalRejected = 0;
            
            $.each(items, function(index, item) {
                totalReceived += parseFloat(item.received_quantity || 0);
                totalAccepted += parseFloat(item.accepted_quantity || 0);
                totalRejected += parseFloat(item.rejected_quantity || 0);
            });
            
            $('#totalItems').text(items.length);
            $('#totalReceived').text(totalReceived.toFixed(2));
            $('#totalAccepted').text(totalAccepted.toFixed(2));
            $('#totalRejected').text(totalRejected.toFixed(2));
        },
        
        updateStatusDisplay: function(status) {
            const statusConfig = {
                'DRAFT': { class: 'alert-secondary', badge: 'bg-secondary', text: 'Draft GRN' },
                'COMPLETED': { class: 'alert-success', badge: 'bg-success', text: 'GRN Completed' },
                'CANCELLED': { class: 'alert-danger', badge: 'bg-danger', text: 'GRN Cancelled' }
            };
            
            const config = statusConfig[status] || statusConfig['DRAFT'];
            
            $('#statusBanner').removeClass().addClass('alert ' + config.class);
            $('#grnStatusBadge').removeClass().addClass('badge ' + config.badge).text(status);
            $('#grnStatusText').text(config.text);
        },
        
        updateButtonVisibility: function(status) {
            if (status === 'COMPLETED' || status === 'CANCELLED') {
                $('#btnEditGrn').hide();
                $('#btnCancelGrn').hide();
            } else {
                $('#btnEditGrn').show();
                $('#btnCancelGrn').show();
            }
        },
        
        bindEvents: function() {
            const self = this;
            
            $('#btnEditGrn').on('click', function() {
                TempleRouter.navigate('purchase/grn/edit', { id: self.currentGrnId });
            });
            
            $('#btnCancelGrn').on('click', function() {
                self.cancelGrn();
            });
            
            // Print button event
            $('#btnPrintGrn').on('click', function() {
                self.printGrn();
            });
        },
        
        // Print functionality
        printGrn: function() {
            const self = this;
            
            // Load temple settings for print
            TempleCore.showLoading(true);
            
            TempleAPI.get('/settings?type=SYSTEM')
                .done(function(response) {
                    let templeSettings = {};
                    if (response.success && response.data && response.data.values) {
                        templeSettings = response.data.values;
                    } else {
                        // Fallback to localStorage
                        templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                    }
                    
                    self.openPrintWindow(self.currentGrn, templeSettings);
                })
                .fail(function() {
                    // Fallback to localStorage
                    const templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                    self.openPrintWindow(self.currentGrn, templeSettings);
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        openPrintWindow: function(grn, temple) {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow pop-ups to print', 'warning');
                return;
            }
            
            const printContent = this.generatePrintHTML(grn, temple);
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Auto-focus for print dialog
            printWindow.onload = function() {
                printWindow.focus();
            };
        },
        
        generatePrintHTML: function(grn, temple) {
            // Temple logo HTML
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            // Generate items table rows
            let itemsHTML = '';
            let totalReceived = 0;
            let totalAccepted = 0;
            let totalRejected = 0;
            
            if (grn.items && grn.items.length > 0) {
                grn.items.forEach(function(item, index) {
                    totalReceived += parseFloat(item.received_quantity || 0);
                    totalAccepted += parseFloat(item.accepted_quantity || 0);
                    totalRejected += parseFloat(item.rejected_quantity || 0);
                    
                    itemsHTML += `
                        <tr>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${index + 1}</td>
                            <td style="border:1px solid #000;padding:8px;">${item.product?.name || '-'}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${item.batch_number || '-'}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${item.ordered_quantity || '-'}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${item.received_quantity || 0}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;color:green;">${item.accepted_quantity || 0}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;color:red;">${item.rejected_quantity || 0}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${item.rack_location || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                itemsHTML = '<tr><td colspan="8" style="border:1px solid #000;padding:20px;text-align:center;">No items found</td></tr>';
            }
            
            // Status badge color
            let statusColor = '#6c757d';
            if (grn.status === 'COMPLETED') statusColor = '#28a745';
            if (grn.status === 'CANCELLED') statusColor = '#dc3545';
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>GRN - ${grn.grn_number}</title>
                    <style>
                        @media print {
                            body { margin: 0; padding: 10px; }
                            #controlButtons { display: none !important; }
                            @page { size: A4; margin: 15mm; }
                        }
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                            color: #333;
                            line-height: 1.4;
                        }
                        .btn {
                            display: inline-block;
                            padding: 8px 16px;
                            margin: 0 5px;
                            font-size: 14px;
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
                        table { border-collapse: collapse; }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="800" align="center" id="controlButtons" style="margin-bottom:20px;">
                        <tr>
                            <td width="600"></td>
                            <td width="100"><button class="btn btn-primary" onclick="window.close()">Back</button></td>
                            <td width="100"><button class="btn btn-info" onclick="window.print()">Print</button></td>
                        </tr>
                    </table>
                    
                    <!-- Header with Temple Info -->
                    <table width="800" border="0" align="center">
                        <tr>
                            <td width="120" valign="top">${logoHTML}</td>
                            <td width="680" style="padding-left:20px;">
                                <h2 style="margin:0;color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</h2>
                                <p style="margin:5px 0;font-size:14px;">
                                    ${temple.temple_address || temple.address || 'Temple Address'}<br>
                                    ${temple.temple_city || temple.city || ''}, ${temple.temple_state || temple.state || ''} ${temple.temple_pincode || temple.pincode || ''}<br>
                                    ${temple.temple_country || temple.country || 'Malaysia'}<br>
                                    ${temple.temple_phone || temple.phone ? 'Tel: ' + (temple.temple_phone || temple.phone) : ''}<br>
                                    ${temple.temple_email || temple.email ? 'Email: ' + (temple.temple_email || temple.email) : ''}
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="800" align="center" style="margin:20px auto;border-top:2px solid #000;border-bottom:2px solid #000;">
                        <tr>
                            <td style="text-align:center;padding:15px;">
                                <h1 style="margin:0;font-size:24px;text-transform:uppercase;">GOODS RECEIVED NOTE</h1>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- GRN Details -->
                    <table width="800" align="center" style="margin:20px auto;">
                        <tr>
                            <td width="400">
                                <table width="100%">
                                    <tr>
                                        <td width="120"><strong>GRN Number:</strong></td>
                                        <td>${grn.grn_number}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>GRN Date:</strong></td>
                                        <td>${this.formatDate(grn.grn_date)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Supplier:</strong></td>
                                        <td>${grn.supplier?.name || '-'}</td>
                                    </tr>
                                </table>
                            </td>
                            <td width="400">
                                <table width="100%">
                                    <tr>
                                        <td width="120"><strong>PO Reference:</strong></td>
                                        <td>${grn.purchase_order?.po_number || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Warehouse:</strong></td>
                                        <td>${grn.warehouse?.name || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Status:</strong></td>
                                        <td><span style="color:${statusColor};font-weight:bold;">${grn.status}</span></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Delivery Info -->
                    <table width="800" align="center" style="margin:20px auto;">
                        <tr>
                            <td width="200"><strong>Delivery Challan No:</strong></td>
                            <td width="200">${grn.delivery_challan_no || '-'}</td>
                            <td width="200"><strong>Vehicle Number:</strong></td>
                            <td width="200">${grn.vehicle_number || '-'}</td>
                        </tr>
                    </table>
                    
                    <!-- Items Table -->
                    <table width="800" align="center" style="margin:20px auto;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f0f0f0;">
                                <th style="border:1px solid #000;padding:10px;text-align:center;">S.No</th>
                                <th style="border:1px solid #000;padding:10px;">Product</th>
                                <th style="border:1px solid #000;padding:10px;text-align:center;">Batch</th>
                                <th style="border:1px solid #000;padding:10px;text-align:center;">Ordered</th>
                                <th style="border:1px solid #000;padding:10px;text-align:center;">Received</th>
                                <th style="border:1px solid #000;padding:10px;text-align:center;">Accepted</th>
                                <th style="border:1px solid #000;padding:10px;text-align:center;">Rejected</th>
                                <th style="border:1px solid #000;padding:10px;text-align:center;">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                        <tfoot>
                            <tr style="background:#f9f9f9;font-weight:bold;">
                                <td colspan="4" style="border:1px solid #000;padding:10px;text-align:right;">Total:</td>
                                <td style="border:1px solid #000;padding:10px;text-align:center;">${totalReceived.toFixed(2)}</td>
                                <td style="border:1px solid #000;padding:10px;text-align:center;color:green;">${totalAccepted.toFixed(2)}</td>
                                <td style="border:1px solid #000;padding:10px;text-align:center;color:red;">${totalRejected.toFixed(2)}</td>
                                <td style="border:1px solid #000;padding:10px;"></td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <!-- Quality Check Info -->
                    ${grn.quality_check_done ? `
                        <table width="800" align="center" style="margin:20px auto;border:1px solid #ddd;padding:15px;">
                            <tr>
                                <td colspan="4" style="background:#f0f0f0;padding:10px;"><strong>Quality Check Information</strong></td>
                            </tr>
                            <tr>
                                <td width="150" style="padding:8px;"><strong>QC Done:</strong></td>
                                <td width="250" style="padding:8px;color:green;">✓ Yes</td>
                                <td width="150" style="padding:8px;"><strong>QC By:</strong></td>
                                <td width="250" style="padding:8px;">${grn.quality_checker?.name || '-'}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px;"><strong>QC Date:</strong></td>
                                <td style="padding:8px;">${grn.quality_check_date ? this.formatDate(grn.quality_check_date) : '-'}</td>
                                <td style="padding:8px;"><strong>QC Notes:</strong></td>
                                <td style="padding:8px;">${grn.quality_check_notes || '-'}</td>
                            </tr>
                        </table>
                    ` : ''}
                    
                    <!-- Notes -->
                    ${grn.notes ? `
                        <table width="800" align="center" style="margin:20px auto;">
                            <tr>
                                <td style="border:1px solid #ddd;padding:15px;">
                                    <strong>Notes:</strong><br>
                                    <p style="margin:10px 0;">${grn.notes}</p>
                                </td>
                            </tr>
                        </table>
                    ` : ''}
                    
                    <!-- Footer -->
                    <table width="800" align="center" style="margin-top:30px;font-size:12px;color:#666;">
                        <tr>
                            <td style="text-align:center;padding-top:20px;border-top:1px solid #ddd;">
                                Generated on: ${new Date().toLocaleString()} | 
                                GRN Status: ${grn.status}
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            
            return html;
        },
        
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },
        
        cancelGrn: function() {
            const self = this;
            
            TempleCore.showConfirm(
                'Cancel GRN',
                'Are you sure you want to cancel this GRN? This action cannot be undone.',
                function() {
                    TempleCore.showLoading(true);
                    
                    TempleAPI.post('/purchase/grn/' + self.currentGrnId + '/cancel')
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast('GRN cancelled successfully', 'success');
                                self.loadGrn(); // Reload to show updated status
                            } else {
                                TempleCore.showToast(response.message || 'Failed to cancel GRN', 'error');
                            }
                        })
                        .fail(function() {
                            TempleCore.showToast('Failed to cancel GRN', 'error');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            );
        }
    };
    
})(jQuery, window);