// js/pages/inventory/product/index.js

(function ($, window) {
    'use strict';

    window.InventoryProductPage = {
        products: [],
        categories: [],

        ledgers: [],
        uoms: [],
        warehouses: [],
        productTypes: [],
        currentPage: 1,
        totalPages: 1,
        currentProductId: null,
        openingStockData: [],
                permissions: {},
        currentUser: null,

        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadBarcodeLibrary();
            this.render();
            this.loadInitialData();
            this.bindEvents();
        },

        loadBarcodeLibrary: function () {
            if (!window.JsBarcode) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
                document.head.appendChild(script);
            }
        },

        render: function () {
            const self = this;
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col">
                            <h3 class="page-title">
                                <i class="bi bi-box"></i> Products Management
                            </h3>
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-info" id="btnPrintAllBarcodes">
                                <i class="bi bi-upc"></i> Print All Barcodes
                            </button>

        <button type="button" class="btn btn-primary" id="btnAddProduct">
            <i class="bi bi-plus-circle"></i> Add Product
        </button>

                            
                    
                        </div>
                    </div>
                    
                    <!-- Filters -->
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="searchProduct" 
                                           placeholder="Search by name, code...">
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterCategory">
                                        <option value="">All Categories</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterProductType">
                                        <option value="">All Types</option>
                                        <option value="PRODUCT">Finished Product</option>
                                        <option value="RAW_MATERIAL">Raw Material</option>
                                        <option value="BOTH">Both</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-primary" id="btnSearch">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                    <button class="btn btn-secondary" id="btnReset">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                    <button class="btn btn-warning" id="btnLowStock">
                                        <i class="bi bi-exclamation-triangle"></i> Low Stock
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Products Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="10%">Code</th>
                                            <th width="15%">Product Name</th>
                                            <th width="10%">Type</th>
                                            <th width="10%">Category</th>
                                            <th width="12%">Ledger</th>
                                            <th width="8%">UOM</th>
                                            <th width="10%">Price</th>
                                            <th width="10%">Stock</th>
                                            <th width="5%" class="text-center">Status</th>
                                            <th width="5%" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productTableBody">
                                        <!-- Dynamic content -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <nav id="paginationContainer">
                                <!-- Dynamic pagination -->
                            </nav>
                        </div>
                    </div>
                </div>
                
                ${this.getProductModal()}
                ${this.getViewModal()}
                ${this.getOpeningStockModal()}
            `;

            $('#page-container').html(html);
        },

        getProductModal: function () {
            return `
                <div class="modal fade" id="productModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="productModalTitle">Add Product</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="productForm">
                                <div class="modal-body">
                                    <input type="hidden" id="productId">
                                    
                                    <div class="row" id="productCodeRow" style="display:none;">
                                        <div class="col-md-12">
                                            <div class="mb-3">
                                                <label class="form-label">Product Code</label>
                                                <input type="text" class="form-control" id="product_code" 
                                                       name="product_code" disabled>
                                                <small class="text-muted">Product code is auto-generated and cannot be changed</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-8">
                                            <div class="mb-3">
                                                <label class="form-label">Product Name <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="name" 
                                                       name="name" required maxlength="255">
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Product Type</label>
                                                <select class="form-select" id="product_type" name="product_type">
                                                    <option value="PRODUCT">Finished Product</option>
                                                    <option value="RAW_MATERIAL">Raw Material</option>
                                                    <option value="BOTH">Both</option>
                                        
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="description" name="description" 
                                                  rows="3" placeholder="Enter product description..."></textarea>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Category</label>
                                                <select class="form-select" id="category_id" name="category_id">
                                                    <option value="">Select Category</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Ledger</label>
                                                <select class="form-select" id="ledger_id" name="ledger_id">
                                                    <option value="">Select Ledger</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Unit of Measurement</label>
                                                <select class="form-select" id="uom_id" name="uom_id">
                                                    <option value="">Select UOM</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Sale Price <span class="text-danger">*</span></label>
                                                <input type="number" class="form-control" id="unit_price" 
                                                       name="unit_price" required step="0.01" min="0">
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Special Price</label>
                                                <input type="number" class="form-control" id="cost_price" 
                                                       name="cost_price" step="0.01" min="0">
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">HSN Code</label>
                                                <input type="text" class="form-control" id="hsn_code" 
                                                       name="hsn_code" maxlength="50">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-3">
                                            <div class="form-check mb-3">
                                                <input class="form-check-input" type="checkbox" id="is_stockable" 
                                                       name="is_stockable" checked>
                                                <label class="form-check-label" for="is_stockable">
                                                    Stockable Item
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="mb-3">
                                                <label class="form-label">Min Stock</label>
                                                <input type="number" class="form-control stock-field" id="min_stock" 
                                                       name="min_stock" step="0.001" min="0">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="mb-3">
                                                <label class="form-label">Low Stock Alert</label>
                                                <input type="number" class="form-control stock-field" id="low_stock_alert" 
                                                       name="low_stock_alert" step="0.001" min="0" 
                                                       placeholder="Alert threshold">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="mb-3">
                                                <label class="form-label">Current Stock</label>
                                                <input type="number" class="form-control stock-field" id="current_stock" 
                                                       name="current_stock" step="0.001" min="0" readonly>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="is_active" name="is_active">
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> Save Product
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        },

        getViewModal: function () {
            return `
                <div class="modal fade" id="viewProductModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Product Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="productDetailsContent">
                                <!-- Dynamic content -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        getOpeningStockModal: function () {
            return `
                <div class="modal fade" id="openingStockModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-box-seam"></i> Opening Stock Management - 
                                    <span id="osProductName"></span>
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="card mb-3">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">Add Opening Stock</h6>
                                    </div>
                                    <div class="card-body">
                                        <form id="openingStockForm">
                                            <input type="hidden" id="os_product_id">
                                            <input type="hidden" id="os_entry_id">
                                            
                                            <div class="row">
                                                <div class="col-md-3">
                                                    <div class="mb-3">
                                                        <label class="form-label">Warehouse <span class="text-danger">*</span></label>
                                                        <select class="form-select" id="os_warehouse_id" required>
                                                            <option value="">Select Warehouse</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div class="col-md-2">
                                                    <div class="mb-3">
                                                        <label class="form-label">Quantity <span class="text-danger">*</span></label>
                                                        <input type="number" class="form-control" id="os_quantity" 
                                                               step="0.001" min="0" required>
                                                    </div>
                                                </div>
                                                <div class="col-md-2">
                                                    <div class="mb-3">
                                                        <label class="form-label">Sale Price <span class="text-danger">*</span></label>
                                                        <input type="number" class="form-control" id="os_unit_price" 
                                                               step="0.01" min="0" required>
                                                    </div>
                                                </div>
                                                <div class="col-md-2">
                                                    <div class="mb-3">
                                                        <label class="form-label">Total Value</label>
                                                        <input type="text" class="form-control" id="os_total_value" readonly>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-3">
                                                    <div class="mb-3">
                                                        <label class="form-label">Reference No</label>
                                                        <input type="text" class="form-control" id="os_reference_no">
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <label class="form-label">Notes</label>
                                                        <input type="text" class="form-control" id="os_notes">
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">&nbsp;</label>
                                                    <div>
                                                        <button type="submit" class="btn btn-primary">
                                                            <i class="bi bi-plus-circle"></i> Add Stock
                                                        </button>
                                                        <button type="button" class="btn btn-secondary" id="btnCancelEdit" style="display:none;">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <div class="card bg-primary text-white">
                                            <div class="card-body">
                                                <h6 class="card-title">Total Quantity</h6>
                                                <h4 id="osTotalQuantity">0</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card bg-success text-white">
                                            <div class="card-body">
                                                <h6 class="card-title">Total Value</h6>
                                                <h4 id="osTotalValue">RM 0.00</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card bg-info text-white">
                                            <div class="card-body">
                                                <h6 class="card-title">Warehouses</h6>
                                                <h4 id="osWarehouseCount">0</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">Current Opening Stock</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="table-responsive">
                                            <table class="table table-sm table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>Warehouse</th>
                                                        <th>Quantity</th>
                                                        <th>Sale Price</th>
                                                        <th>Total Value</th>
                                                        <th>Reference</th>
                                                        <th>Notes</th>
                                                        <th width="10%">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="openingStockTableBody">
                                                    <!-- Dynamic content -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        formatProductType: function (type) {
            if (!type) return 'Finished Product';

            const typeMap = {
                'PRODUCT': 'Finished Product',
                'RAW_MATERIAL': 'Raw Material',
                'BOTH': 'Both',
            };

            return typeMap[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        },

        getProductTypeBadge: function (type) {
            const badges = {
                'PRODUCT': '<span class="badge bg-primary">Finished</span>',
                'RAW_MATERIAL': '<span class="badge bg-warning">Raw Material</span>',
                'BOTH': '<span class="badge bg-info">Both</span>',
            };

            return badges[type] || '<span class="badge bg-primary">Finished</span>';
        },

        loadInitialData: function () {
            const self = this;
            TempleCore.showLoading(true);

            Promise.all([
                this.loadProducts(),
                this.loadCategories(),
                this.loadLedgers(),
                this.loadUoms(),
                this.loadWarehouses(),
                this.loadProductTypes(),
                this.loadPermissions()
            ]).then(function () {
                self.populateFilters();
            }).finally(function () {
                TempleCore.showLoading(false);
            });
        },
        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_product: false,
                can_edit_product: false,
                can_delete_product: false,
                can_view_product: true
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_product: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_product: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_product: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_product: true
                };
            }
        },
        loadProducts: function (filters = {}) {
            const self = this;

            return TempleAPI.get('/inventory/products', filters)
                .done(function (response) {

                    if (response.success) {

                        self.products = response.data.data || [];
                        self.currentPage = response.data.current_page || 1;
                        self.permissions = response.data.permissions || self.permissions;

                        self.totalPages = response.data.last_page || 1;
                        self.renderTable();
                        self.renderPagination();
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast('Error loading products', 'error');
                });
        },

        loadCategories: function () {
            const self = this;

            return TempleAPI.get('/inventory/categories')
                .done(function (response) {
                    if (response.success) {
                        self.categories = response.data || [];
                    }
                });
        },

        loadLedgers: function () {
            const self = this;

            return TempleAPI.get('/inventory/products/ledgers')
                .done(function (response) {
                    if (response.success) {
                        self.ledgers = response.data || [];
                        self.populateLedgerSelect();
                    }
                });
        },

        loadUoms: function () {
            const self = this;

            return TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success) {
                        self.uoms = response.data || [];
                    }
                });
        },

        loadWarehouses: function () {
            const self = this;

            return TempleAPI.get('/inventory/warehouse')
                .done(function (response) {
                    if (response.success) {
                        self.warehouses = response.data || [];
                        self.populateWarehouseSelect();
                    }
                });
        },

        loadProductTypes: function () {
            const self = this;

            // Static product types - can be replaced with API call if needed
            self.productTypes = [
                { value: 'PRODUCT', label: 'Finished Product' },
                { value: 'RAW_MATERIAL', label: 'Raw Material' },
                { value: 'BOTH', label: 'Both' },
            ];

            return Promise.resolve();
        },

        renderTable: function () {
            const tbody = $('#productTableBody');
            tbody.empty();

            if (this.products.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="11" class="text-center">No products found</td>
                    </tr>
                `);
                return;
            }

            let sl = (this.currentPage - 1) * 50 + 1;
            this.products.forEach(product => {
                const stockStatus = this.getStockStatusBadge(product);
                const statusBadge = product.is_active ?
                    '<span class="badge bg-success">Active</span>' :
                    '<span class="badge bg-danger">Inactive</span>';

                const productTypeBadge = this.getProductTypeBadge(product.product_type);
                const categoryName = product.category ? product.category.category_name : 'N/A';
                const ledgerName = product.ledger ?
                    `${product.ledger.left_code}/${product.ledger.right_code} - ${product.ledger.name}` :
                    'N/A';
                const uomName = product.uom ? product.uom.uom_short : 'N/A';

                const row = `
                    <tr>
                        <td>${sl++}</td>
                        <td><strong>${product.product_code}</strong></td>
                        <td>${product.name}</td>
                        <td>${productTypeBadge}</td>
                        <td>${categoryName}</td>
                        <td style="font-size: 0.85em;">${ledgerName}</td>
                        <td>${uomName}</td>
                        <td>${TempleCore.formatCurrency(product.unit_price)}</td>
                        <td>${stockStatus}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-success print-barcode" 
                                        data-id="${product.id}"
                                        data-code="${product.product_code}"
                                        data-name="${product.name}"
                                        title="Print Barcode">
                                    <i class="bi bi-upc"></i>
                                </button>
                                 ${this.permissions.can_view_product ? `
                                <button class="btn btn-info view-product" 
                                        data-id="${product.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>`
                        : ''}
                                ${this.permissions.can_edit_product ? `
                                <button class="btn btn-primary edit-product" 
                                        data-id="${product.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>`
                        : ''}
                                     ${this.permissions.can_delete_product ? `
                                <button class="btn btn-danger delete-product" 
                                        data-id="${product.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>`
                        : ''}
                            </div>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        },

        getStockStatusBadge: function (product) {
            if (!product.is_stockable) {
                return '<span class="badge bg-info">Non-Stock</span>';
            }

            const currentStock = parseFloat(product.current_stock);
            const lowStockAlert = parseFloat(product.low_stock_alert) || 0;

            if (currentStock <= 0) {
                return '<span class="badge bg-danger">Out of Stock</span>';
            } else if (lowStockAlert > 0 && currentStock <= lowStockAlert) {
                return `<span class="badge bg-warning">${currentStock} (Low)</span>`;
            } else {
                return `<span class="badge bg-success">${currentStock}</span>`;
            }
        },

        renderPagination: function () {
            const container = $('#paginationContainer');
            container.empty();

            if (this.totalPages <= 1) return;

            let html = '<ul class="pagination">';

            html += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
                     </li>`;

            for (let i = 1; i <= this.totalPages; i++) {
                if (i === 1 || i === this.totalPages ||
                    (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    html += `<li class="page-item ${i === this.currentPage ? 'active' : ''}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                             </li>`;
                }
            }

            html += `<li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
                     </li>`;

            html += '</ul>';
            container.html(html);
        },

        populateFilters: function () {
            const categorySelect = $('#filterCategory, #category_id');
            categorySelect.empty();
            categorySelect.append('<option value="">Select Category</option>');
            this.categories.forEach(cat => {
                categorySelect.append(`<option value="${cat.id}">${cat.category_name}</option>`);
            });

            const uomSelect = $('#uom_id');
            uomSelect.empty();
            uomSelect.append('<option value="">Select UOM</option>');
            this.uoms.forEach(uom => {
                if (uom.is_active) {
                    uomSelect.append(`<option value="${uom.id}">${uom.name} (${uom.uom_short})</option>`);
                }
            });
        },

        populateLedgerSelect: function () {
            const select = $('#ledger_id');
            select.empty();
            select.append('<option value="">Select Ledger</option>');

            this.ledgers.forEach(ledger => {
                const ledgerCode = `${ledger.left_code}/${ledger.right_code}`;
                select.append(`<option value="${ledger.id}">${ledgerCode} - ${ledger.name}</option>`);
            });
        },

        populateWarehouseSelect: function () {
            const select = $('#os_warehouse_id');
            select.empty();
            select.append('<option value="">Select Warehouse</option>');

            this.warehouses.forEach(warehouse => {
                if (warehouse.is_active) {
                    select.append(`<option value="${warehouse.id}">${warehouse.name}</option>`);
                }
            });
        },

        bindEvents: function () {
            const self = this;

            // Product CRUD Events
            if (this.permissions.can_create_product) {
                $('#btnAddProduct').show().on('click', function () {
                    self.showAddModal();
                });
            } else {
                $('#btnAddProduct').hide();
            }

            $(document).on('click', '.edit-product', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            $(document).on('click', '.view-product', function () {
                const id = $(this).data('id');
                self.viewProduct(id);
            });

            $(document).on('click', '.delete-product', function () {
                const id = $(this).data('id');
                self.deleteProduct(id);
            });

            // Barcode Events
            $(document).on('click', '.print-barcode', function (e) {
                e.preventDefault();
                const code = $(this).data('code');
                const name = $(this).data('name');
                self.printBarcodeDirectly(code, name);
            });

            $('#btnPrintAllBarcodes').on('click', function (e) {
                e.preventDefault();
                self.printAllBarcodesDirectly();
            });

            $('#productForm').on('submit', function (e) {
                e.preventDefault();
                self.saveProduct();
            });


            // Opening Stock Events
            $(document).on('click', '.opening-stock', function () {
                const productId = $(this).data('id');
                const productName = $(this).data('name');
                self.showOpeningStockModal(productId, productName);
            });

            $('#openingStockForm').on('submit', function (e) {
                e.preventDefault();
                self.saveOpeningStock();
            });

            $('#os_quantity, #os_unit_price').on('input', function () {
                const quantity = parseFloat($('#os_quantity').val()) || 0;
                const price = parseFloat($('#os_unit_price').val()) || 0;
                const total = quantity * price;
                $('#os_total_value').val(TempleCore.formatCurrency(total));
            });

            $(document).on('click', '.edit-stock', function () {
                const stockId = $(this).data('id');
                self.editOpeningStock(stockId);
            });

            $(document).on('click', '.delete-stock', function () {
                const stockId = $(this).data('id');
                self.deleteOpeningStock(stockId);
            });

            $('#btnCancelEdit').on('click', function () {
                self.resetOpeningStockForm();
            });

            // Search and Filter Events
            $('#btnSearch').on('click', function () {
                self.searchProducts();
            });

            $('#btnReset').on('click', function () {
                $('#searchProduct').val('');
                $('#filterCategory').val('');
                $('#filterProductType').val('');
                $('#filterStatus').val('');
                self.loadProducts();
            });

            $('#btnLowStock').on('click', function () {
                self.loadProducts({ low_stock: true });
            });

            // Pagination
            $(document).on('click', '.page-link', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page && !$(this).parent().hasClass('disabled')) {
                    self.loadProducts({ page: page });
                }
            });

            $('#searchProduct').on('keypress', function (e) {
                if (e.which === 13) {
                    self.searchProducts();
                }
            });
        },

        showAddModal: function () {
            $('#productForm')[0].reset();
            $('#productModalTitle').text('Add Product');
            $('#productId').val('');
            $('#productCodeRow').hide();
            $('#current_stock').closest('.col-md-3').hide();
            $('#product_type').val('PRODUCT');
            $('#is_stockable').prop('disabled', false).prop('checked', true).trigger('change');

            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        },

        showEditModal: function (id) {
            const product = this.products.find(p => p.id === id);
            if (!product) return;

            $('#productModalTitle').text('Edit Product');
            $('#productId').val(product.id);

            $('#productCodeRow').show();
            $('#product_code').val(product.product_code);
            $('#name').val(product.name);
            $('#description').val(product.description);
            $('#category_id').val(product.category_id);
            $('#ledger_id').val(product.ledger_id);
            $('#uom_id').val(product.uom_id);
            $('#product_type').val(product.product_type || 'PRODUCT');
            $('#unit_price').val(product.unit_price);
            $('#cost_price').val(product.cost_price);
            $('#hsn_code').val(product.hsn_code);
            $('#is_stockable').prop('checked', product.is_stockable);
            $('#low_stock_alert').val(product.low_stock_alert || 0);
            $('#min_stock').val(product.min_stock);
            $('#current_stock').val(product.current_stock);
            $('#is_active').val(product.is_active ? '1' : '0');

            $('#current_stock').closest('.col-md-3').show();



            $('#is_stockable').trigger('change');

            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        },

        saveProduct: function () {
            const id = $('#productId').val();
            const data = {
                name: $('#name').val().trim(),
                description: $('#description').val().trim(),
                category_id: $('#category_id').val() || null,
                ledger_id: $('#ledger_id').val() || null,
                uom_id: $('#uom_id').val() || null,
                product_type: $('#product_type').val(),
                unit_price: $('#unit_price').val(),
                cost_price: $('#cost_price').val() || 0,
                hsn_code: $('#hsn_code').val().trim(),
                is_stockable: $('#is_stockable').is(':checked'),
                low_stock_alert: parseFloat($('#low_stock_alert').val()) || 0,
                min_stock: $('#min_stock').val() || 0,
                is_active: $('#is_active').val()
            };

            if (!id) {
                data.current_stock = 0;
            }

            TempleCore.showLoading(true);

            const request = id ?
                TempleAPI.put(`/inventory/products/${id}`, data) :
                TempleAPI.post('/inventory/products', data);

            request
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
                        TempleCore.showToast(response.message || 'Product saved successfully', 'success');
                        InventoryProductPage.loadProducts();
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    if (response.errors) {
                        const firstError = Object.values(response.errors)[0][0];
                        TempleCore.showToast(firstError, 'error');
                    } else {
                        TempleCore.showToast(response?.message || 'Error saving product', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        viewProduct: function (id) {
            TempleCore.showLoading(true);

            TempleAPI.get(`/inventory/products/${id}`)
                .done(function (response) {
                    if (response.success) {
                        const product = response.data;
                        const ledgerInfo = product.ledger ?
                            `${product.ledger.left_code}/${product.ledger.right_code} - ${product.ledger.name}` :
                            'N/A';
                        const productType = InventoryProductPage.formatProductType(product.product_type);

                        const html = `
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Basic Information</h6>
                                    <table class="table table-sm">
                                        <tr><th width="40%">Product Code:</th><td>${product.product_code}</td></tr>
                                        <tr><th>Name:</th><td>${product.name}</td></tr>
                                        <tr><th>Product Type:</th><td>${productType}</td></tr>
                                        <tr><th>Category:</th><td>${product.category ? product.category.category_name : 'N/A'}</td></tr>
                                        <tr><th>Ledger:</th><td>${ledgerInfo}</td></tr>
                                        <tr><th>UOM:</th><td>${product.uom ? `${product.uom.name} (${product.uom.uom_short})` : 'N/A'}</td></tr>
                                        <tr><th>HSN Code:</th><td>${product.hsn_code || 'N/A'}</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6>Pricing & Stock</h6>
                                    <table class="table table-sm">
                                        <tr><th width="40%">Sale Price:</th><td>${TempleCore.formatCurrency(product.unit_price)}</td></tr>
                                        <tr><th>Special Price:</th><td>${TempleCore.formatCurrency(product.cost_price)}</td></tr>
                                        <tr><th>Stockable:</th><td>${product.is_stockable ? 'Yes' : 'No'}</td></tr>
                                        <tr><th>Current Stock:</th><td>${product.current_stock}</td></tr>
                                        <tr><th>Low Stock Alert:</th><td>${product.low_stock_alert || 'Disabled'}</td></tr>
                                        <tr><th>Min Stock:</th><td>${product.min_stock}</td></tr>
                                        <tr><th>Status:</th><td>${product.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>'}</td></tr>
                                    </table>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6>Description</h6>
                                    <p>${product.description || 'No description available'}</p>
                                </div>
                            </div>
                        `;

                        $('#productDetailsContent').html(html);

                        const modal = new bootstrap.Modal(document.getElementById('viewProductModal'));
                        modal.show();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Error loading product details', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        deleteProduct: function (id) {
            const product = this.products.find(p => p.id === id);
            if (!product) return;

            TempleCore.showConfirm(
                'Delete Product',
                `Are you sure you want to delete "${product.name} (${product.product_code})"?`,
                function () {
                    TempleCore.showLoading(true);

                    TempleAPI.delete(`/inventory/products/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Product deleted successfully', 'success');
                                InventoryProductPage.loadProducts();
                            }
                        })
                        .fail(function (xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'Error deleting product', 'error');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        showOpeningStockModal: function (productId, productName) {
            this.currentProductId = productId;
            $('#osProductName').text(productName);
            $('#os_product_id').val(productId);

            this.resetOpeningStockForm();
            this.loadOpeningStock(productId);

            const modal = new bootstrap.Modal(document.getElementById('openingStockModal'));
            modal.show();
        },

        loadOpeningStock: function (productId) {
            const self = this;

            TempleAPI.get(`/inventory/opening-stock/product/${productId}`)
                .done(function (response) {
                    if (response.success) {
                        self.openingStockData = response.data;
                        self.renderOpeningStockTable();

                        $('#osTotalQuantity').text(response.summary.total_quantity);
                        $('#osTotalValue').text(TempleCore.formatCurrency(response.summary.total_value));
                        $('#osWarehouseCount').text(response.summary.warehouse_count);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Error loading opening stock', 'error');
                });
        },

        renderOpeningStockTable: function () {
            const tbody = $('#openingStockTableBody');
            tbody.empty();

            if (this.openingStockData.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="7" class="text-center">No opening stock entries found</td>
                    </tr>
                `);
                return;
            }

            this.openingStockData.forEach(stock => {
                const row = `
                    <tr>
                        <td>${stock.warehouse ? stock.warehouse.name : 'N/A'}</td>
                        <td>${stock.quantity}</td>
                        <td>${TempleCore.formatCurrency(stock.unit_price)}</td>
                        <td>${TempleCore.formatCurrency(stock.total_value)}</td>
                        <td>${stock.reference_no || '-'}</td>
                        <td>${stock.notes || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-stock" 
                                    data-id="${stock.id}" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-stock" 
                                    data-id="${stock.id}" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        },

        saveOpeningStock: function () {
            const id = $('#os_entry_id').val();
            const data = {
                product_id: $('#os_product_id').val(),
                warehouse_id: $('#os_warehouse_id').val(),
                quantity: $('#os_quantity').val(),
                unit_price: $('#os_unit_price').val(),
                reference_no: $('#os_reference_no').val(),
                notes: $('#os_notes').val()
            };

            if (!data.warehouse_id || !data.quantity || !data.unit_price) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }

            TempleCore.showLoading(true);

            const request = id ?
                TempleAPI.put(`/inventory/opening-stock/${id}`, data) :
                TempleAPI.post('/inventory/opening-stock', data);

            request
                .done((response) => {
                    if (response.success) {
                        TempleCore.showToast(response.message, 'success');
                        this.resetOpeningStockForm();
                        this.loadOpeningStock(this.currentProductId);
                        this.loadProducts();
                    }
                })
                .fail((xhr) => {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Error saving opening stock', 'error');
                })
                .always(() => {
                    TempleCore.showLoading(false);
                });
        },

        editOpeningStock: function (stockId) {
            const stock = this.openingStockData.find(s => s.id === stockId);
            if (!stock) return;

            $('#os_entry_id').val(stock.id);
            $('#os_warehouse_id').val(stock.warehouse_id).prop('disabled', true);
            $('#os_quantity').val(stock.quantity);
            $('#os_unit_price').val(stock.unit_price);
            $('#os_reference_no').val(stock.reference_no);
            $('#os_notes').val(stock.notes);

            $('#os_quantity').trigger('input');
            $('#btnCancelEdit').show();
        },

        deleteOpeningStock: function (stockId) {
            TempleCore.showConfirm(
                'Delete Opening Stock',
                'Are you sure you want to delete this opening stock entry?',
                () => {
                    TempleCore.showLoading(true);

                    TempleAPI.delete(`/inventory/opening-stock/${stockId}`)
                        .done((response) => {
                            if (response.success) {
                                TempleCore.showToast('Opening stock deleted successfully', 'success');
                                this.loadOpeningStock(this.currentProductId);
                                this.loadProducts();
                            }
                        })
                        .fail(() => {
                            TempleCore.showToast('Error deleting opening stock', 'error');
                        })
                        .always(() => {
                            TempleCore.showLoading(false);
                        });
                }
            );
        },

        resetOpeningStockForm: function () {
            $('#openingStockForm')[0].reset();
            $('#os_entry_id').val('');
            $('#os_warehouse_id').prop('disabled', false);
            $('#os_total_value').val('');
            $('#btnCancelEdit').hide();
        },

        searchProducts: function () {
            const filters = {
                search: $('#searchProduct').val(),
                category_id: $('#filterCategory').val(),
                product_type: $('#filterProductType').val(),
                is_active: $('#filterStatus').val()
            };

            Object.keys(filters).forEach(key => {
                if (!filters[key]) {
                    delete filters[key];
                }
            });

            this.loadProducts(filters);
        },

        // Barcode Printing Methods
        printBarcodeDirectly: function (productCode, productName) {
            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                TempleCore.showToast('Please allow pop-ups for barcode printing', 'warning');
                return;
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Barcode - ${productName}</title>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                    <style>
                        * { 
                            margin: 0; 
                            padding: 0; 
                            box-sizing: border-box; 
                        }
                        
                        @media print {
                            @page { 
                                size: auto; 
                                margin: 0;
                            }
                            body { 
                                margin: 10mm;
                            }
                        }
                        
                        body { 
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            background: white;
                        }
                        
                        .barcode-label {
                            width: 100%;
                            max-width: 400px;
                            margin: 0 auto;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100px;
                        }
                        
                        .product-name {
                            flex: 0 0 40%;
                            text-align: center;
                            font-size: 14px;
                            font-weight: normal;
                            text-transform: uppercase;
                            padding-right: 20px;
                        }
                        
                        .barcode-container {
                            flex: 0 0 60%;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="barcode-label">
                        <div class="product-name">
                            ${productName}
                        </div>
                        <div class="barcode-container">
                            <canvas id="barcode"></canvas>
                        </div>
                    </div>
                    
                    <script>
                        JsBarcode("#barcode", "${productCode}", {
                            format: "CODE128",
                            width: 2,
                            height: 60,
                            displayValue: true,
                            fontSize: 15,
                            margin: 0,
                            textMargin: 0
                        });
                        
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        },

        printAllBarcodesDirectly: function () {
            if (this.products.length === 0) {
                TempleCore.showToast('No products to print', 'warning');
                return;
            }

            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                TempleCore.showToast('Please allow pop-ups for barcode printing', 'warning');
                return;
            }

            let barcodeItems = '';
            this.products.forEach((product, index) => {
                barcodeItems += `
                    <div class="barcode-label">
                        <div class="product-name">${product.name}</div>
                        <div class="barcode-container">
                            <canvas id="barcode-${index}"></canvas>
                        </div>
                    </div>
                `;
            });

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Print All Barcodes</title>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        
                        @media print {
                            @page { 
                                size: A4; 
                                margin: 10mm;
                            }
                            .barcode-label {
                                page-break-inside: avoid;
                            }
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            background: white;
                            padding: 10px;
                        }
                        
                        .barcode-grid {
                            max-width: 500px;
                            margin: 0 auto;
                        }
                        
                        .barcode-label {
                            display: flex;
                            align-items: center;
                            padding: 10px;
                            min-height: 80px;
                        }
                        
                        .product-name {
                            flex: 0 0 40%;
                            text-align: center;
                            font-size: 11px;
                            text-transform: uppercase;
                            padding-right: 10px;
                        }
                        
                        .barcode-container {
                            flex: 0 0 60%;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="barcode-grid">
                        ${barcodeItems}
                    </div>
                    
                    <script>
                        ${this.products.map((product, index) => `
                            JsBarcode("#barcode-${index}", "${product.product_code}", {
                                format: "CODE128",
                                width: 1.5,
                                height: 50,
                                displayValue: true,
                                fontSize: 10,
                                margin: 0,
                                textMargin: 0
                            });
                        `).join('\n')}
                        
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 1000);
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    };

})(jQuery, window);