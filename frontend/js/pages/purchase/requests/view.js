// js/pages/purchase/requests/view.js
// View purchase request details page without status field

(function ($, window) {
    'use strict';

    window.PurchaseRequestsViewPage = {
        currentPrId: null,
        currentPr: null,
        permissions: {},
        currentUser: null,
        init: function (params) {
            this.currentPrId = params?.id || this.getPrIdFromUrl();
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadPermissions();
            if (!this.currentPrId) {
                TempleCore.showToast('Purchase Request ID not provided', 'error');
                TempleRouter.navigate('purchase/requests');
                return;
            }

            this.render();
            this.loadPurchaseRequest();
        },

        getPrIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_purchase_requests: false,
                can_edit_purchase_requests: false,
                can_delete_purchase_requests: false,
                can_convert_purchase_requests: false,
                can_view_purchase_requests: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_convert_purchase_requests: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_purchase_requests: true
                };
            }
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">View Purchase Request</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase/requests'); return false;">Purchase Requests</a></li>
                                    <li class="breadcrumb-item active">View PR</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <div id="actionButtons" class="d-inline-block me-2">
                                <!-- Buttons will be added dynamically -->
                            </div>
                            <button class="btn btn-secondary me-2" onclick="PurchaseRequestsViewPage.printPr(); return false;">
                                <i class="bi bi-printer"></i> Print
                            </button>
                            <button class="btn btn-primary" onclick="TempleRouter.navigate('purchase/requests'); return false;">
                                <i class="bi bi-arrow-left"></i> Back to List
                            </button>
                        </div>
                    </div>
                    
                    <!-- Loading -->
                    <div id="prLoading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- PR Content -->
                    <div id="prContent" style="display: none;">
                        <!-- Conversion Status Alert -->
                        <div id="conversionAlert" class="alert mb-4" style="display: none;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="bi bi-check-circle"></i>
                                    <strong>This PR has been converted to Purchase Order</strong>
                                </div>
                                <div>
                                    <a href="#" id="viewPoLink" class="btn btn-sm btn-primary">
                                        View PO <i class="bi bi-arrow-right"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        <!-- PR Header Information -->
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">Purchase Request Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label class="text-muted">PR Number:</label>
                                        <p class="fw-bold" id="prNumber"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Request Date:</label>
                                        <p id="requestDate"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Required By:</label>
                                        <p id="requiredDate"></p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Priority:</label>
                                        <p id="prPriority"></p>
                                    </div>
                                </div>
                                
                                <div class="row mt-3">
                                    <div class="col-md-3">
                                        <label class="text-muted">Requested By:</label>
                                        <p id="requestedBy"></p>
                                    </div>
                                    <div class="col-md-9">
                                        <label class="text-muted">Purpose:</label>
                                        <p id="purpose"></p>
                                    </div>
                                </div>
                                
                                <div class="row mt-3" id="conversionSection" style="display: none;">
                                    <div class="col-md-3">
                                        <label class="text-muted">Converted to PO:</label>
                                        <p id="poLink">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Converted By:</label>
                                        <p id="convertedBy">-</p>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="text-muted">Converted At:</label>
                                        <p id="convertedAt">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- PR Items -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h6 class="mb-0">Requested Items</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Type</th>
                                                <th>Item</th>
                                                <th>Description</th>
                                                <th>Quantity</th>
                                                <th>UOM</th>
                                                <th>Preferred Supplier</th>
                                                <th>Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody id="prItemsTable">
                                            <tr>
                                                <td colspan="8" class="text-center">Loading items...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Notes Section -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h6 class="mb-0">Additional Information</h6>
                            </div>
                            <div class="card-body">
                                <p id="prNotes">-</p>
                            </div>
                        </div>
                        
                        <!-- Metadata -->
                        <div class="card">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <small class="text-muted">Created By:</small> <span id="createdBy"></span><br>
                                        <small class="text-muted">Created At:</small> <span id="createdAt"></span>
                                    </div>
                                    <div class="col-md-6">
                                        <small class="text-muted">Updated By:</small> <span id="updatedBy"></span><br>
                                        <small class="text-muted">Updated At:</small> <span id="updatedAt"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadPurchaseRequest: function () {
            const self = this;

            TempleAPI.get('/purchase/requests/' + this.currentPrId)
                .done(function (response) {
                    if (response.permissions) {
                        self.permissions = response.permissions;
                    }
                    if (response.success) {
                        self.currentPr = response.data;
                        self.displayPurchaseRequest();
                        $('#prLoading').hide();
                        $('#prContent').show();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load purchase request', 'error');
                        TempleRouter.navigate('purchase/requests');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load purchase request', 'error');
                    TempleRouter.navigate('purchase/requests');
                });
        },

        displayPurchaseRequest: function () {
            const pr = this.currentPr;

            // Header Information
            $('#prNumber').text(pr.pr_number);
            $('#requestDate').text(TempleCore.formatDate(pr.request_date));
            $('#requiredDate').text(pr.required_by_date ? TempleCore.formatDate(pr.required_by_date) : 'Not specified');
            $('#requestedBy').text(pr.requester?.name || '-');
            $('#purpose').text(pr.purpose || '-');

            // Priority
            this.displayPriority(pr.priority);

            // Conversion Status
            if (pr.converted_to_po) {
                $('#conversionAlert').show();
                $('#conversionSection').show();

                if (pr.po_id) {
                    $('#poLink').html(`<a href="#" onclick="TempleRouter.navigate('purchase/orders/view', {id: '${pr.po_id}'}); return false;">${pr.purchase_order?.po_number || 'View PO'}</a>`);
                    $('#viewPoLink').attr('onclick', `TempleRouter.navigate('purchase/orders/view', {id: '${pr.po_id}'}); return false;`);
                }
                $('#convertedBy').text(pr.converter?.name || '-');
                $('#convertedAt').text(pr.converted_at ? TempleCore.formatDate(pr.converted_at, 'time') : '-');
            }

            // Items
            this.displayItems(pr.items || []);

            // Notes
            $('#prNotes').text(pr.notes || 'No additional notes');

            // Metadata
            $('#createdBy').text(pr.creator?.name || '-');
            $('#createdAt').text(TempleCore.formatDate(pr.created_at, 'time'));
            $('#updatedBy').text(pr.updater?.name || '-');
            $('#updatedAt').text(TempleCore.formatDate(pr.updated_at, 'time'));

            // Update action buttons
            this.updateActionButtons();
        },

        displayPriority: function (priority) {
            const priorityConfig = {
                'LOW': { class: 'bg-secondary', text: 'Low' },
                'NORMAL': { class: 'bg-info', text: 'Normal' },
                'HIGH': { class: 'bg-warning', text: 'High' },
                'URGENT': { class: 'bg-danger', text: 'Urgent' }
            };

            const config = priorityConfig[priority] || priorityConfig['NORMAL'];
            $('#prPriority').html(`<span class="badge ${config.class}">${config.text}</span>`);
        },

        displayItems: function (items) {
            let html = '';

            if (items.length === 0) {
                html = '<tr><td colspan="8" class="text-center">No items found</td></tr>';
            } else {
                $.each(items, function (index, item) {
                    const itemName = item.item_type === 'product' ?
                        (item.product?.name || 'Product') :
                        (item.service?.name || 'Service');

                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><span class="badge bg-secondary">${item.item_type}</span></td>
                            <td>${itemName}</td>
                            <td>${item.description || '-'}</td>
                            <td>${item.quantity}</td>
                            <td>${item.uom?.name || '-'}</td>
                            <td>${item.preferred_supplier?.name || '-'}</td>
                            <td>${item.remarks || '-'}</td>
                        </tr>
                    `;
                });
            }

            $('#prItemsTable').html(html);
        },

        updateActionButtons: function () {
            let buttonsHtml = '';

            const canEdit = this.permissions.can_edit_purchase_requests;
            const canConvert = this.permissions.can_convert_purchase_requests;

            // Only if not converted
            if (!this.currentPr.converted_to_po) {
                if (canEdit) {
                    buttonsHtml += `
                <button class="btn btn-warning me-2" onclick="PurchaseRequestsViewPage.editPr()">
                    <i class="bi bi-pencil"></i> Edit
                </button>`;
                }

                if (canConvert) {
                    buttonsHtml += `
                <button class="btn btn-success me-2" onclick="PurchaseRequestsViewPage.convertToPo()">
                    <i class="bi bi-arrow-right-circle"></i> Convert to PO
                </button>`;
                }
            }

            $('#actionButtons').html(buttonsHtml);
        },


        editPr: function () {
            TempleRouter.navigate('purchase/requests/edit', { id: this.currentPrId });
        },

        convertToPo: function () {
            TempleRouter.navigate('purchase/requests/convert', { id: this.currentPrId });
        },

        printPr: function () {
            const url = '/' + TempleAPI.getTempleId() + '/purchase/requests/print/' + this.currentPrId;
            window.open(url, '_blank');
        }
    };

})(jQuery, window);