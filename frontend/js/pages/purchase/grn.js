// js/pages/purchase/grn.js - Updated with print functionality
// GRN List Page with Print Feature
(function ($, window) {
    'use strict';

    window.PurchaseGrnPage = {
        permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            const self = this;
            this.loadPermissions().then(function () {
                self.currentFilter = {
                    status: '',
                    supplier_id: '',
                    warehouse_id: '',
                    date_from: '',
                    date_to: ''
                };


                self.render();
                self.loadData();
                self.bindEvents();
            });
        },
        loadPermissions: function () {
            const self = this;
            const userId = this.currentUser.id;

            return TempleAPI.get(`/purchase/grn/user/${userId}/permissions`)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.data || self.permissions;
                    } else {
                        self.setDefaultPermissions();
                    }
                })
                .fail(function () {
                    self.setDefaultPermissions();
                });
        },
        setDefaultPermissions: function () {
            const userType = this.currentUser?.user_type || '';
            this.permissions = {
                can_create_grn: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_grn: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_grn: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_grn: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
            };
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Goods Received Notes</h3>
                        </div>
                        <div class="col-md-6 text-end">
                          ${this.permissions.can_create_grn ? `
                            <button class="btn btn-primary" id="createGRNBtn">
                                <i class="bi bi-plus-circle"></i> New GRN
                            </button>`: ''}
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-2">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="filterSupplier">
                                        <option value="">All Suppliers</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Warehouse</label>
                                    <select class="form-select" id="filterWarehouse">
                                        <option value="">All Warehouses</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">From Date</label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">To Date</label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>
                                <div class="col-md-1 d-flex align-items-end">
                                    <button class="btn btn-secondary w-100" id="resetFilters">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>GRN Number</th>
                                            <th>Date</th>
                                            <th>Supplier</th>
                                            <th>PO Reference</th>
                                            <th>Warehouse</th>
                                            <th>Items</th>
                                            <th>Quality Check</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="grnTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
            this.loadMasterData();
        },

        loadMasterData: function () {
            // Load suppliers
            TempleAPI.get('/purchase/suppliers', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Suppliers</option>';
                        $.each(response.data.data, function (i, supplier) {
                            options += `<option value="${supplier.id}">${supplier.name}</option>`;
                        });
                        $('#filterSupplier').html(options);
                    }
                });

            // Load warehouses
            TempleAPI.get('/inventory/warehouse', { is_active: 1 })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">All Warehouses</option>';
                        $.each(response.data, function (i, warehouse) {
                            options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                        });
                        $('#filterWarehouse').html(options);
                    }
                });
        },

        loadData: function () {
            const self = this;

            TempleAPI.get('/purchase/grn', this.currentFilter)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.permissions || self.permissions;
      
                        self.renderTable(response.data, self.permissions);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load GRNs', 'error');
                });
        },

        renderTable: function (data, permissions) {
            const tbody = $('#grnTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="9" class="text-center">No GRNs found</td></tr>');
                return;
            }

            let html = '';
            $.each(data.data, function (index, grn) {
                const qualityBadge = grn.quality_check_done ?
                    '<span class="badge bg-success">Checked</span>' :
                    '<span class="badge bg-warning">Pending</span>';

                const statusBadge = grn.status === 'COMPLETED' ?
                    '<span class="badge bg-success">Completed</span>' :
                    '<span class="badge bg-secondary">Draft</span>';

                html += `
                    <tr data-id="${grn.id}">
                        <td><strong>${grn.grn_number}</strong></td>
                        <td>${moment(grn.grn_date).format('DD/MM/YYYY')}</td>
                        <td>${grn.supplier?.name || 'N/A'}</td>
                        <td>${grn.po?.po_number || '-'}</td>
                        <td>${grn.warehouse?.name || 'N/A'}</td>
                        <td>${grn.items?.length || 0} items</td>
                        <td>${qualityBadge}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                             ${permissions.can_view_grn ? `
                                <button class="btn btn-outline-primary view-grn" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>`: ''}
                                 ${permissions.can_edit_grn ? `
                                <button class="btn btn-outline-info edit-grn" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>`: ''}
                                ${grn.status === 'DRAFT' ? `
                                    <button class="btn btn-outline-success complete-grn" title="Complete">
                                        <i class="bi bi-check"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-info print-grn" title="Print">
                                    <i class="bi bi-printer"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.html(html);
        },

        bindEvents: function () {
            const self = this;

            // Create GRN
            $('#createGRNBtn').on('click', function () {
                TempleRouter.navigate('purchase/grn/create');
            });

            // Filters
            $('#filterStatus, #filterSupplier, #filterWarehouse, #filterDateFrom, #filterDateTo')
                .on('change', function () {
                    self.currentFilter = {
                        status: $('#filterStatus').val(),
                        supplier_id: $('#filterSupplier').val(),
                        warehouse_id: $('#filterWarehouse').val(),
                        date_from: $('#filterDateFrom').val(),
                        date_to: $('#filterDateTo').val()
                    };
                    self.loadData();
                });

            // Reset filters
            $('#resetFilters').on('click', function () {
                $('.form-select, .form-control').val('');
                self.currentFilter = {};
                self.loadData();
            });

            // View GRN
            $(document).on('click', '.view-grn', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/grn/view', { id: id });
            });

            $(document).on('click', '.edit-grn', function () {
                const id = $(this).closest('tr').data('id');
                TempleRouter.navigate('purchase/grn/edit', { id: id });
            });

            // Complete GRN
            $(document).on('click', '.complete-grn', function () {
                const id = $(this).closest('tr').data('id');
                self.completeGRN(id);
            });

            // Print GRN
            $(document).on('click', '.print-grn', function () {
                const id = $(this).closest('tr').data('id');
                self.printGRN(id);
            });
        },

        printGRN: function (id) {
            const self = this;

            TempleCore.showLoading(true);

            // Load both GRN data and temple settings
            Promise.all([
                this.loadGRNData(id),
                this.loadTempleSettings()
            ])
                .then(function (results) {
                    const grnData = results[0];
                    const templeSettings = results[1];
                    self.openPrintWindow(grnData, templeSettings);
                })
                .catch(function (error) {
                    TempleCore.showToast(error.message || 'Failed to load data for printing', 'error');
                })
                .finally(function () {
                    TempleCore.showLoading(false);
                });
        },

        loadGRNData: function (id) {
            return new Promise((resolve, reject) => {
                TempleAPI.get('/purchase/grn/' + id)
                    .done(function (response) {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error('Failed to load GRN data'));
                        }
                    })
                    .fail(function () {
                        reject(new Error('Failed to load GRN data'));
                    });
            });
        },

        loadTempleSettings: function () {
            return new Promise((resolve, reject) => {
                TempleAPI.get('/settings?type=SYSTEM')
                    .done(function (response) {
                        if (response.success && response.data && response.data.values) {
                            resolve(response.data.values);
                        } else {
                            // Fallback to localStorage
                            const localSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                            resolve(localSettings);
                        }
                    })
                    .fail(function () {
                        // Fallback to localStorage
                        const localSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                        resolve(localSettings);
                    });
            });
        },

        openPrintWindow: function (grn, temple) {
            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                TempleCore.showToast('Please allow pop-ups to print', 'warning');
                return;
            }

            const printContent = this.generatePrintHTML(grn, temple);

            printWindow.document.write(printContent);
            printWindow.document.close();

            // Auto-focus for print dialog
            printWindow.onload = function () {
                printWindow.focus();
            };
        },

        generatePrintHTML: function (grn, temple) {
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
                grn.items.forEach(function (item, index) {
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

        formatDate: function (dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },

        completeGRN: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Complete GRN',
                'Completing GRN will update stock. Are you sure?',
                function () {
                    TempleAPI.post(`/purchase/grn/${id}/complete`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('GRN completed and stock updated', 'success');
                                self.loadData();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to complete GRN', 'error');
                        });
                }
            );
        }
    };
})(jQuery, window);