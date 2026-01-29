// js/pages/sales-packages/index.js
// Sales Packages Management Page

(function ($, window) {
    'use strict';

    window.SalesPackagesPage = {
        packages: [],
        currentPackage: null,
        items: [],
        products: [],
        salesItems: [],
        taxes: [],
        currentFilter: 'all', // Track current filter status

        init: function (params) {
            const self = this;
            this.render();
            this.loadProducts();
            this.loadSalesItems();
            this.loadTaxes();
            this.loadPackages();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Sales Packages</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('sales'); return false;">Sales</a></li>
                                    <li class="breadcrumb-item active">Packages</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="btnAddPackage">
                                <i class="bi bi-plus-circle"></i> Add New Package
                            </button>
                        </div>
                    </div>

                    <!-- Filter Section -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="form-label">Filter by Status</label>
                                    <select class="form-select" id="statusFilter">
                                        <option value="all">All Packages</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-secondary w-100" id="btnApplyFilter">
                                        <i class="bi bi-funnel"></i> Apply Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Packages List -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="packagesTable">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Package Number</th>
                                            <th>Package Name</th>
                                            <th>Date</th>
                                            <th>Items</th>
                                            <th>Grand Total</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="packagesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Package Modal -->
                <div class="modal fade" id="packageModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="packageModalTitle">Add Package</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="packageForm">
                                    <input type="hidden" id="packageId">
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Package Number <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="packageNumber" readonly>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Package Date <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" id="packageDate" required>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-10">
                                            <label class="form-label">Package Name</label>
                                            <input type="text" class="form-control" id="packageName" placeholder="Enter package name">
                                        </div>
                                        <div class="col-md-2">
                                            <label class="form-label">Status</label>
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="isActive" checked>
                                                <label class="form-check-label" for="isActive">
                                                    <span id="statusLabel">Active</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Add Item Section -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0">Add Items</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-2">
                                                    <label class="form-label">Type <span class="text-danger">*</span></label>
                                                    <select class="form-select" id="itemType">
                                                        <option value="">Select Type</option>
                                                        <option value="product">Product</option>
                                                        <option value="sales_item">Sales Item</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Item <span class="text-danger">*</span></label>
                                                    <select class="form-select" id="itemSelect">
                                                        <option value="">Select Item</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-2">
                                                    <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                                    <input type="number" class="form-control" id="itemQuantity" step="0.01" min="0.01">
                                                </div>
                                                <div class="col-md-3" id="uomContainer" style="display: none;">
                                                    <label class="form-label">UOM</label>
                                                    <select class="form-select" id="itemUom">
                                                        <option value="">Select UOM</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-1">
                                                    <label class="form-label">&nbsp;</label>
                                                    <button type="button" class="btn btn-success w-100" id="btnAddItem">
                                                        <i class="bi bi-plus"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Items Table -->
                                    <div class="table-responsive mb-3">
                                        <table class="table table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Type</th>
                                                    <th>Item</th>
                                                    <th>Quantity</th>
                                                    <th>UOM</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody id="itemsTableBody">
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted">No items added</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <!-- Amount Section -->
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <label class="form-label">Total Amount <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" id="totalAmount" step="0.01" min="0" value="0">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Tax</label>
                                            <select class="form-select" id="taxRate">
                                                <option value="0">Loading taxes...</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Discount</label>
                                            <input type="number" class="form-control" id="discount" step="0.01" min="0" value="0">
                                        </div>
                                    </div>

                                    <!-- Totals Section -->
                                    <div class="row">
                                        <div class="col-md-8">
                                            <div class="mb-3">
                                                <label class="form-label">Description</label>
                                                <textarea class="form-control" id="description" rows="4"></textarea>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="card border">
                                                <div class="card-body p-3">
                                                    <div class="d-flex justify-content-between mb-2">
                                                        <span>Subtotal:</span>
                                                        <span id="totalAmountDisplay">RM 0.00</span>
                                                    </div>
                                                    <div class="d-flex justify-content-between mb-2 text-danger">
                                                        <span>Discount:</span>
                                                        <span id="discountDisplay">- RM 0.00</span>
                                                    </div>
                                                    <hr class="my-2">
                                                    <div class="d-flex justify-content-between mb-2">
                                                        <span>Subtotal After:</span>
                                                        <span id="subtotalAfterDisplay">RM 0.00</span>
                                                    </div>
                                                    <div class="d-flex justify-content-between mb-2">
                                                        <span>Tax:</span>
                                                        <span id="taxDisplay">RM 0.00</span>
                                                    </div>
                                                    <hr class="my-2">
                                                    <div class="d-flex justify-content-between fw-bold bg-primary text-white p-2 rounded">
                                                        <span>Grand Total:</span>
                                                        <span id="grandTotalDisplay">RM 0.00</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnSavePackage">Save Package</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        bindEvents: function () {
            const self = this;

            $('#btnAddPackage').on('click', function () {
                self.showPackageModal();
            });

            $('#btnSavePackage').on('click', function () {
                self.savePackage();
            });

            $('#packageDate').on('change', function () {
                self.generatePackageNumber();
            });

            $('#itemType').on('change', function () {
                self.onItemTypeChange();
            });

            $('#itemSelect').on('change', function () {
                self.onItemSelect();
            });

            $('#btnAddItem').on('click', function () {
                self.addItem();
            });

            $('#totalAmount, #taxRate, #discount').on('input change', function () {
                self.calculateTotals();
            });

            // Handle status checkbox change
            $('#isActive').on('change', function () {
                const statusLabel = $(this).is(':checked') ? 'Active' : 'Inactive';
                $('#statusLabel').text(statusLabel);
            });

            // Handle filter apply button
            $('#btnApplyFilter').on('click', function () {
                self.currentFilter = $('#statusFilter').val();
                self.loadPackages();
            });

            // Handle filter change on enter key
            $('#statusFilter').on('change', function () {
                self.currentFilter = $(this).val();
                self.loadPackages();
            });
        },

        loadProducts: function () {
            const self = this;
            TempleAPI.get('/sales/packages/products')
                .done(function (response) {
                    if (response.success) {
                        self.products = response.data;
                    }
                });
        },

        loadSalesItems: function () {
            const self = this;
            TempleAPI.get('/sales/packages/sales-items')
                .done(function (response) {
                    if (response.success) {
                        self.salesItems = response.data;
                    }
                });
        },

        loadTaxes: function () {
            const self = this;
            TempleAPI.get('/sales/packages/taxes')
                .done(function (response) {
                    if (response.success) {
                        self.taxes = response.data;
                        self.populateTaxDropdown();
                    }
                })
                .fail(function () {
                    console.error('Failed to load taxes');
                });
        },

        populateTaxDropdown: function () {
            const self = this;
            let html = '<option value="0">No Tax</option>';

            $.each(this.taxes, function (index, tax) {
                html += `<option value="${tax.rate}">${tax.name} (${tax.rate}%)</option>`;
            });

            $('#taxRate').html(html);
        },

        loadPackages: function () {
            const self = this;
            
            // Build query parameters based on current filter
            let params = {};
            
            if (self.currentFilter === 'active') {
                params.is_active = 1;
            } else if (self.currentFilter === 'inactive') {
                params.is_active = 0;
            }
            // If 'all', don't add is_active parameter at all
            
            TempleAPI.get('/sales/packages', params)
                .done(function (response) {
                    if (response.success) {
                        self.packages = response.data.data;
                        self.displayPackages();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load packages', 'error');
                });
        },

        displayPackages: function () {
            let html = '';
            const self = this;

            if (this.packages.length === 0) {
                html = '<tr><td colspan="8" class="text-center">No packages found</td></tr>';
            } else {
                $.each(this.packages, function (index, pkg) {
                    // Display status badge based on is_active
                    const statusBadge = pkg.is_active ?
                        '<span class="badge bg-success">Active</span>' :
                        '<span class="badge bg-secondary">Inactive</span>';

                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${pkg.package_number}</td>
                            <td>${pkg.package_name || '-'}</td>
                            <td>${moment(pkg.package_date).format('DD/MM/YYYY')}</td>
                            <td>${pkg.items ? pkg.items.length : 0} items</td>
                            <td>RM ${parseFloat(pkg.grand_total).toFixed(2)}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="SalesPackagesPage.viewPackage('${pkg.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="SalesPackagesPage.editPackage('${pkg.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="SalesPackagesPage.deletePackage('${pkg.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#packagesTableBody').html(html);
        },

        showPackageModal: function () {
            this.items = [];
            $('#packageForm')[0].reset();
            $('#packageId').val('');
            $('#packageModalTitle').text('Add Package');
            $('#packageDate').val(moment().format('YYYY-MM-DD'));
            $('#isActive').prop('checked', true);
            $('#statusLabel').text('Active');
            this.generatePackageNumber();
            this.displayItems();
            this.calculateTotals();

            const modal = new bootstrap.Modal(document.getElementById('packageModal'));
            modal.show();
        },

        generatePackageNumber: function () {
            const self = this;
            const date = $('#packageDate').val();

            TempleAPI.get('/sales/packages/generate-number', { date: date })
                .done(function (response) {
                    if (response.success) {
                        $('#packageNumber').val(response.data.package_number);
                    }
                });
        },

        onItemTypeChange: function () {
            const type = $('#itemType').val();
            const self = this;

            $('#itemSelect').html('<option value="">Select Item</option>');
            $('#uomContainer').hide();

            if (type === 'product') {
                $.each(this.products, function (index, product) {
                    $('#itemSelect').append(`<option value="${product.id}" data-name="${product.product_name}" data-base-unit="${product.base_unit}" data-unit-display="${product.unit_display}" data-price="${product.price}">${product.product_name}</option>`);
                });
                $('#uomContainer').show();
            } else if (type === 'sales_item') {
                $.each(this.salesItems, function (index, item) {
                    $('#itemSelect').append(`<option value="${item.id}" data-name="${item.item_name}" data-price="${item.price}">${item.item_name}</option>`);
                });
            }
        },

        onItemSelect: function () {
            const type = $('#itemType').val();
            const selectedOption = $('#itemSelect option:selected');

            if (type === 'product') {
                const baseUnit = selectedOption.data('base-unit');
                const unitDisplay = selectedOption.data('unit-display');

                $('#itemUom').html('');
                if (baseUnit) {
                    $('#itemUom').append(`<option value="${baseUnit}">${baseUnit}</option>`);
                }
                if (unitDisplay && unitDisplay !== baseUnit) {
                    $('#itemUom').append(`<option value="${unitDisplay}">${unitDisplay}</option>`);
                }
            }
        },

        addItem: function () {
            const type = $('#itemType').val();
            const itemId = $('#itemSelect').val();
            const selectedOption = $('#itemSelect option:selected');
            const itemName = selectedOption.data('name');
            const quantity = parseFloat($('#itemQuantity').val());
            const uom = $('#itemUom').val();

            if (!type || !itemId || !quantity) {
                TempleCore.showToast('Please fill all required fields', 'error');
                return;
            }

            this.items.push({
                type: type,
                item_id: itemId,
                item_name: itemName,
                quantity: quantity,
                uom: uom || '-'
            });

            // Reset form
            $('#itemType').val('');
            $('#itemSelect').html('<option value="">Select Item</option>');
            $('#itemQuantity').val('');
            $('#itemUom').html('');
            $('#uomContainer').hide();

            this.displayItems();
        },

        displayItems: function () {
            let html = '';
            const self = this;

            if (this.items.length === 0) {
                html = '<tr><td colspan="5" class="text-center text-muted">No items added</td></tr>';
            } else {
                $.each(this.items, function (index, item) {
                    html += `
                        <tr>
                            <td>${item.type === 'product' ? 'Product' : 'Sales Item'}</td>
                            <td>${item.item_name}</td>
                            <td>${item.quantity}</td>
                            <td>${item.uom}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="SalesPackagesPage.removeItem(${index})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#itemsTableBody').html(html);
        },

        removeItem: function (index) {
            this.items.splice(index, 1);
            this.displayItems();
            this.calculateTotals();
        },

        calculateTotals: function () {
            const totalAmount = parseFloat($('#totalAmount').val()) || 0;
            const taxRate = parseFloat($('#taxRate').val()) || 0;
            const discount = parseFloat($('#discount').val()) || 0;

            // Calculate subtotal after discount
            const subtotalAfter = totalAmount - discount;

            // Calculate tax amount (on subtotal after discount)
            const taxAmount = (subtotalAfter * taxRate) / 100;

            // Calculate grand total
            const grandTotal = subtotalAfter + taxAmount;

            // Update displays with proper formatting
            $('#totalAmountDisplay').text('RM ' + totalAmount.toFixed(2));
            $('#discountDisplay').text('- RM ' + discount.toFixed(2));
            $('#subtotalAfterDisplay').text('RM ' + subtotalAfter.toFixed(2));
            $('#taxDisplay').text('+ RM ' + taxAmount.toFixed(2));
            $('#grandTotalDisplay').text('RM ' + grandTotal.toFixed(2));
        },

        savePackage: function () {
            const self = this;

            if (this.items.length === 0) {
                TempleCore.showToast('Please add at least one item', 'error');
                return;
            }

            const packageData = {
                package_date: $('#packageDate').val(),
                package_name: $('#packageName').val(),
                items: this.items,
                total_amount: parseFloat($('#totalAmount').val()) || 0,
                tax_rate: parseFloat($('#taxRate').val()) || 0,
                discount: parseFloat($('#discount').val()) || 0,
                description: $('#description').val(),
                is_active: $('#isActive').is(':checked')
            };

            const packageId = $('#packageId').val();
            const url = packageId ? `/sales/packages/${packageId}` : '/sales/packages';
            const method = packageId ? 'put' : 'post';

            TempleCore.showLoading(true);

            TempleAPI[method](url, packageData)
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('packageModal')).hide();
                        TempleCore.showToast('Package saved successfully', 'success');
                        self.loadPackages();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save package', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to save package', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        viewPackage: function (id) {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.get(`/sales/packages/${id}`)
                .done(function (response) {
                    if (response.success) {
                        const pkg = response.data;
                        self.showViewModal(pkg);
                    } else {
                        TempleCore.showToast('Failed to load package details', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load package details', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        showViewModal: function (pkg) {
            // Calculate totals
            const totalAmount = parseFloat(pkg.total_amount) || 0;
            const taxRate = parseFloat(pkg.tax_rate) || 0;
            const discount = parseFloat(pkg.discount) || 0;
            
            // Calculate subtotal after discount
            const subtotalAfter = totalAmount - discount;
            
            // Calculate tax on subtotal after discount
            const taxAmount = (subtotalAfter * taxRate) / 100;
            
            // Calculate grand total
            const grandTotal = subtotalAfter + taxAmount;

            // Build items table
            let itemsHtml = '';
            if (pkg.items && pkg.items.length > 0) {
                pkg.items.forEach(function (item) {
                    itemsHtml += `
                        <tr>
                            <td>${item.type === 'product' ? 'Product' : 'Sales Item'}</td>
                            <td>${item.item_name || '-'}</td>
                            <td>${item.quantity}</td>
                            <td>${item.uom || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                itemsHtml = '<tr><td colspan="4" class="text-center text-muted">No items</td></tr>';
            }

            // Determine status badge
            const statusBadge = pkg.is_active ?
                '<span class="badge bg-success">Active</span>' :
                '<span class="badge bg-secondary">Inactive</span>';

            const modalHtml = `
                <div class="modal fade" id="viewPackageModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">View Package - ${pkg.package_number}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <strong>Package Number:</strong> ${pkg.package_number}
                                    </div>
                                    <div class="col-md-4">
                                        <strong>Package Name:</strong> ${pkg.package_name || '-'}
                                    </div>
                                    <div class="col-md-4">
                                        <strong>Package Date:</strong> ${moment(pkg.package_date).format('DD/MM/YYYY')}
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Status:</strong> ${statusBadge}
                                    </div>
                                </div>

                                <h6 class="mb-3">Items</h6>
                                <div class="table-responsive mb-4">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>Item</th>
                                                <th>Quantity</th>
                                                <th>UOM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${itemsHtml}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row">
                                    <div class="col-md-8">
                                        <h6>Description</h6>
                                        <p>${pkg.description || 'No description'}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card border">
                                            <div class="card-body p-3">
                                                <div class="d-flex justify-content-between mb-2">
                                                    <span>Subtotal:</span>
                                                    <span>RM ${totalAmount.toFixed(2)}</span>
                                                </div>
                                                <div class="d-flex justify-content-between mb-2 text-danger">
                                                    <span>Discount:</span>
                                                    <span>- RM ${discount.toFixed(2)}</span>
                                                </div>
                                                <hr class="my-2">
                                                <div class="d-flex justify-content-between mb-2">
                                                    <span>Subtotal After:</span>
                                                    <span>RM ${subtotalAfter.toFixed(2)}</span>
                                                </div>
                                                <div class="d-flex justify-content-between mb-2">
                                                    <span>Tax (${taxRate}%):</span>
                                                    <span>+ RM ${taxAmount.toFixed(2)}</span>
                                                </div>
                                                <hr class="my-2">
                                                <div class="d-flex justify-content-between fw-bold bg-primary text-white p-2 rounded">
                                                    <span>Grand Total:</span>
                                                    <span>RM ${grandTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            $('#viewPackageModal').remove();

            // Append and show modal
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('viewPackageModal'));
            modal.show();

            // Clean up modal on hide
            $('#viewPackageModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        editPackage: function (id) {
            const self = this;

            TempleAPI.get(`/sales/packages/${id}`)
                .done(function (response) {
                    if (response.success) {
                        const pkg = response.data;
                        $('#packageId').val(pkg.id);
                        $('#packageNumber').val(pkg.package_number);
                        $('#packageName').val(pkg.package_name);
                        $('#packageDate').val(moment(pkg.package_date).format('YYYY-MM-DD'));
                        $('#totalAmount').val(pkg.total_amount);
                        $('#taxRate').val(pkg.tax_rate);
                        $('#discount').val(pkg.discount);
                        $('#description').val(pkg.description);

                        // Set active checkbox
                        const isActive = pkg.is_active === true || pkg.is_active === 1;
                        $('#isActive').prop('checked', isActive);
                        $('#statusLabel').text(isActive ? 'Active' : 'Inactive');

                        self.items = pkg.items || [];
                        self.displayItems();
                        self.calculateTotals();
                        $('#packageModalTitle').text('Edit Package');

                        const modal = new bootstrap.Modal(document.getElementById('packageModal'));
                        modal.show();
                    }
                });
        },

        deletePackage: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Package',
                'Are you sure you want to delete this package?',
                function () {
                    TempleAPI.delete(`/sales/packages/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Package deleted successfully', 'success');
                                self.loadPackages();
                            }
                        });
                }
            );
        }
    };

})(jQuery, window);