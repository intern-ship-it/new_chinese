// js/pages/manufacturing/settings/index.js
// Manufacturing Settings Page

(function($, window) {
    'use strict';
    
    window.ManufacturingSettingsPage = {
        currentPage: 1,
        perPage: 20,
        allProducts: [],
        
        init: function() {
            this.render();
            this.bindEvents();
            this.loadProducts();
            this.loadSettings();
        },
        
        render: function() {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Manufacturing Settings</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item">Manufacturing</li>
                                    <li class="breadcrumb-item active">Settings</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-success" id="saveAllSettingsBtn">
                                <i class="bi bi-save"></i> Save All Changes
                            </button>
                        </div>
                    </div>
                    
                    <!-- Product Type Configuration -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Product Manufacturing Configuration</h5>
                            <small class="text-muted">Configure which products can be manufactured and which can be used as raw materials</small>
                        </div>
                        <div class="card-body">
                            <!-- Quick Actions -->
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-outline-primary btn-sm" id="selectAllBtn">
                                            <i class="bi bi-check-square"></i> Select All
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm" id="unselectAllBtn">
                                            <i class="bi bi-square"></i> Unselect All
                                        </button>
                                        <button class="btn btn-outline-info btn-sm" id="markAsRawMaterialBtn">
                                            <i class="bi bi-box-seam"></i> Mark Selected as Raw Material
                                        </button>
                                        <button class="btn btn-outline-success btn-sm" id="markAsManufacturableBtn">
                                            <i class="bi bi-gear"></i> Mark Selected as Manufacturable
                                        </button>
                                        <button class="btn btn-outline-warning btn-sm" id="markAsBothBtn">
                                            <i class="bi bi-arrows-angle-expand"></i> Mark Selected as Both
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Filters -->
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="searchProduct" placeholder="Search products...">
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="MANUFACTURABLE">Manufacturable Only</option>
                                        <option value="RAW_MATERIAL">Raw Material Only</option>
                                        <option value="BOTH">Both</option>
                                        <option value="NOT_CONFIGURED">Not Configured</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="filterCategory">
                                        <option value="">All Categories</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-secondary w-100" id="resetFiltersBtn">
                                        <i class="bi bi-arrow-clockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Products Table -->
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th width="30">
                                                <input type="checkbox" class="form-check-input" id="selectAllCheckbox">
                                            </th>
                                            <th>Product Code</th>
                                            <th>Product Name</th>
                                            <th>Current Type</th>
                                            <th>Manufacturing Type</th>
                                            <th>Quality Check</th>
                                            <th>Track Batches</th>
                                            <th>Standard Batch Size</th>
                                            <th>Production Time (hrs)</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productsTableBody">
                                        <tr>
                                            <td colspan="10" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div id="paginationContainer" class="mt-3"></div>
                        </div>
                    </div>
                    
                    <!-- Global Manufacturing Settings -->
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">Default Settings</h5>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label class="form-label">Default Quality Check Required</label>
                                        <select class="form-select" id="defaultQualityCheck">
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Default Batch Tracking</label>
                                        <select class="form-select" id="defaultBatchTracking">
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Auto-approve BOMs</label>
                                        <select class="form-select" id="autoApproveBoms">
                                            <option value="0">No (Save as Draft)</option>
                                            <option value="1">Yes (Auto Approve)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">Manufacturing Rules</h5>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label class="form-label">Allow Negative Stock in Manufacturing</label>
                                        <select class="form-select" id="allowNegativeStock">
                                            <option value="0">No</option>
                                            <option value="1">Yes (Allow Overdraft)</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Require Stock Reservation</label>
                                        <select class="form-select" id="requireReservation">
                                            <option value="1">Yes (Reserve on Order Creation)</option>
                                            <option value="0">No (Check on Production)</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Cost Calculation Method</label>
                                        <select class="form-select" id="costMethod">
                                            <option value="AVERAGE">Average Cost</option>
                                            <option value="LAST_PURCHASE">Last Purchase Cost</option>
                                            <option value="STANDARD">Standard Cost</option>
                                            <option value="FIFO">FIFO</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Statistics -->
                    <div class="card mt-4">
                        <div class="card-body">
                            <h5 class="mb-3">Configuration Statistics</h5>
                            <div class="row text-center">
                                <div class="col-md-3">
                                    <div class="stat-box">
                                        <h3 class="text-primary" id="totalProductsCount">0</h3>
                                        <p class="text-muted">Total Products</p>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-box">
                                        <h3 class="text-success" id="manufacturableCount">0</h3>
                                        <p class="text-muted">Manufacturable</p>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-box">
                                        <h3 class="text-info" id="rawMaterialCount">0</h3>
                                        <p class="text-muted">Raw Materials</p>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-box">
                                        <h3 class="text-warning" id="notConfiguredCount">0</h3>
                                        <p class="text-muted">Not Configured</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .stat-box {
                        padding: 20px;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        background: #f8f9fa;
                    }
                    .stat-box h3 {
                        margin-bottom: 10px;
                        font-weight: bold;
                    }
                    .stat-box p {
                        margin: 0;
                        font-size: 14px;
                    }
                    .product-row.selected {
                        background-color: #e8f4f8;
                    }
                    .manufacturing-type-badge {
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 600;
                    }
                    .type-manufacturable {
                        background-color: #d4edda;
                        color: #155724;
                    }
                    .type-raw-material {
                        background-color: #d1ecf1;
                        color: #0c5460;
                    }
                    .type-both {
                        background-color: #fff3cd;
                        color: #856404;
                    }
                    .type-none {
                        background-color: #f8d7da;
                        color: #721c24;
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        bindEvents: function() {
            const self = this;
            
            // Save all settings
            $('#saveAllSettingsBtn').on('click', function() {
                self.saveAllSettings();
            });
            
            // Select/Unselect all
            $('#selectAllBtn').on('click', function() {
                $('.product-checkbox:visible').prop('checked', true);
                self.updateSelectedCount();
            });
            
            $('#unselectAllBtn').on('click', function() {
                $('.product-checkbox').prop('checked', false);
                self.updateSelectedCount();
            });
            
            $('#selectAllCheckbox').on('change', function() {
                $('.product-checkbox:visible').prop('checked', $(this).prop('checked'));
                self.updateSelectedCount();
            });
            
            // Bulk actions
            $('#markAsRawMaterialBtn').on('click', function() {
                self.bulkUpdateType('RAW_MATERIAL');
            });
            
            $('#markAsManufacturableBtn').on('click', function() {
                self.bulkUpdateType('MANUFACTURABLE');
            });
            
            $('#markAsBothBtn').on('click', function() {
                self.bulkUpdateType('BOTH');
            });
            
            // Search with debounce
            let searchTimeout;
            $('#searchProduct').on('keyup', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function() {
                    self.filterProducts();
                }, 300);
            });
            
            // Filters
            $('#filterType, #filterCategory').on('change', function() {
                self.filterProducts();
            });
            
            // Reset filters
            $('#resetFiltersBtn').on('click', function() {
                $('#searchProduct').val('');
                $('#filterType').val('');
                $('#filterCategory').val('');
                self.filterProducts();
            });
        },
        
        loadProducts: function() {
            const self = this;
            
            // Load all products
            TempleAPI.get('/inventory/products', { per_page: 1000 })
                .done(function(response) {
                    if (response.success && response.data) {
                        self.allProducts = response.data.data || response.data;
                        self.loadCategories();
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load products', 'error');
                });
        },
        
        loadCategories: function() {
            // Extract unique categories from products
            const categories = [...new Set(this.allProducts.map(p => p.category?.category_name).filter(c => c))];
            
            let options = '<option value="">All Categories</option>';
            categories.forEach(function(category) {
                options += `<option value="${category}">${category}</option>`;
            });
            $('#filterCategory').html(options);
        },
        
        loadSettings: function() {
            const self = this;
            
            // Load manufacturing settings
            TempleAPI.get('/manufacturing/settings/products')
                .done(function(response) {
                    if (response.success && response.data) {
                        const settings = response.data.data || response.data;
                        
                        // Map settings to products
                        settings.forEach(function(setting) {
                            const product = self.allProducts.find(p => p.id == setting.product_id);
                            if (product) {
                                product.manufacturingSetting = setting;
                            }
                        });
                        
                        self.renderProducts();
                        self.updateStatistics();
                    }
                })
                .fail(function() {
                    // If no settings, just render products
                    self.renderProducts();
                    self.updateStatistics();
                });
            
            // Load global settings from system settings if available
            this.loadGlobalSettings();
        },
        
        loadGlobalSettings: function() {
            // Load from system settings if implemented
            // For now, use defaults
            $('#defaultQualityCheck').val('0');
            $('#defaultBatchTracking').val('0');
            $('#autoApproveBoms').val('0');
            $('#allowNegativeStock').val('0');
            $('#requireReservation').val('1');
            $('#costMethod').val('AVERAGE');
        },
        
        renderProducts: function() {
            const self = this;
            const filteredProducts = this.getFilteredProducts();
            
            if (filteredProducts.length === 0) {
                $('#productsTableBody').html(`
                    <tr>
                        <td colspan="10" class="text-center">No products found</td>
                    </tr>
                `);
                return;
            }
            
            let html = '';
            filteredProducts.forEach(function(product) {
                const setting = product.manufacturingSetting || {};
                const type = setting.manufacturing_type || 'NOT_CONFIGURED';
                
                html += `
                    <tr class="product-row" data-product-id="${product.id}">
                        <td>
                            <input type="checkbox" class="form-check-input product-checkbox" 
                                   data-product-id="${product.id}">
                        </td>
                        <td>${product.product_code}</td>
                        <td>${product.name}</td>
                        <td>${self.getCurrentTypeBadge(product)}</td>
                        <td>
                            <select class="form-select form-select-sm manufacturing-type" 
                                    data-product-id="${product.id}">
                                <option value="">Not Configured</option>
                                <option value="MANUFACTURABLE" ${type === 'MANUFACTURABLE' ? 'selected' : ''}>
                                    Manufacturable
                                </option>
                                <option value="RAW_MATERIAL" ${type === 'RAW_MATERIAL' ? 'selected' : ''}>
                                    Raw Material
                                </option>
                                <option value="BOTH" ${type === 'BOTH' ? 'selected' : ''}>
                                    Both
                                </option>
                            </select>
                        </td>
                        <td>
                            <input type="checkbox" class="form-check-input quality-check" 
                                   data-product-id="${product.id}"
                                   ${setting.requires_quality_check ? 'checked' : ''}>
                        </td>
                        <td>
                            <input type="checkbox" class="form-check-input track-batches" 
                                   data-product-id="${product.id}"
                                   ${setting.track_batches ? 'checked' : ''}>
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm batch-size" 
                                   data-product-id="${product.id}"
                                   value="${setting.standard_batch_size || ''}"
                                   placeholder="0" step="0.001" min="0">
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm production-time" 
                                   data-product-id="${product.id}"
                                   value="${setting.standard_production_time || ''}"
                                   placeholder="0" step="0.01" min="0">
                        </td>
                        <td>
                            <div class="form-check form-switch">
                                <input type="checkbox" class="form-check-input is-active" 
                                       data-product-id="${product.id}"
                                       ${setting.is_active !== false ? 'checked' : ''}>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            $('#productsTableBody').html(html);
            
            // Bind individual row events
            this.bindRowEvents();
        },
        
        bindRowEvents: function() {
            const self = this;
            
            // Checkbox selection
            $('.product-checkbox').on('change', function() {
                const $row = $(this).closest('tr');
                if ($(this).prop('checked')) {
                    $row.addClass('selected');
                } else {
                    $row.removeClass('selected');
                }
                self.updateSelectedCount();
            });
            
            // Track changes
            $('.manufacturing-type, .quality-check, .track-batches, .batch-size, .production-time, .is-active')
                .on('change', function() {
                    $(this).addClass('changed');
                    $(this).closest('tr').addClass('has-changes');
                });
        },
        
        getFilteredProducts: function() {
            const searchText = $('#searchProduct').val().toLowerCase();
            const filterType = $('#filterType').val();
            const filterCategory = $('#filterCategory').val();
            
            return this.allProducts.filter(function(product) {
                // Search filter
                if (searchText && !product.name.toLowerCase().includes(searchText) && 
                    !product.product_code.toLowerCase().includes(searchText)) {
                    return false;
                }
                
                // Type filter
                if (filterType) {
                    const setting = product.manufacturingSetting;
                    if (filterType === 'NOT_CONFIGURED') {
                        if (setting && setting.manufacturing_type) return false;
                    } else {
                        if (!setting || setting.manufacturing_type !== filterType) return false;
                    }
                }
                
                // Category filter
                if (filterCategory && product.category?.category_name !== filterCategory) {
                    return false;
                }
                
                return true;
            });
        },
        
        filterProducts: function() {
            this.renderProducts();
        },
        
        getCurrentTypeBadge: function(product) {
            let currentType = 'Purchase Only';
            let badgeClass = 'badge bg-secondary';
            
            if (product.is_stockable === false) {
                currentType = 'Service';
                badgeClass = 'badge bg-info';
            }
            
            return `<span class="${badgeClass}">${currentType}</span>`;
        },
        
        updateSelectedCount: function() {
            const count = $('.product-checkbox:checked').length;
            if (count > 0) {
                $('#selectAllCheckbox').prop('indeterminate', count < $('.product-checkbox').length);
            }
        },
        
        bulkUpdateType: function(type) {
            const selectedProducts = [];
            $('.product-checkbox:checked').each(function() {
                const productId = $(this).data('product-id');
                selectedProducts.push(productId);
                $(`.manufacturing-type[data-product-id="${productId}"]`).val(type).trigger('change');
            });
            
            if (selectedProducts.length === 0) {
                TempleCore.showToast('Please select products first', 'warning');
                return;
            }
            
            TempleCore.showToast(`${selectedProducts.length} products marked as ${type}`, 'success');
        },
        
        saveAllSettings: function() {
            const self = this;
            const updates = [];
            
            // Collect all changes
            $('.product-row').each(function() {
                const $row = $(this);
                const productId = $row.data('product-id');
                
                const manufacturingType = $(`.manufacturing-type[data-product-id="${productId}"]`).val();
                
                // Only save if type is configured
                if (manufacturingType) {
                    updates.push({
                        product_id: productId,
                        manufacturing_type: manufacturingType,
                        requires_quality_check: $(`.quality-check[data-product-id="${productId}"]`).prop('checked'),
                        track_batches: $(`.track-batches[data-product-id="${productId}"]`).prop('checked'),
                        standard_batch_size: parseFloat($(`.batch-size[data-product-id="${productId}"]`).val()) || null,
                        standard_production_time: parseFloat($(`.production-time[data-product-id="${productId}"]`).val()) || null,
                        is_active: $(`.is-active[data-product-id="${productId}"]`).prop('checked')
                    });
                }
            });
            
            if (updates.length === 0) {
                TempleCore.showToast('No changes to save', 'info');
                return;
            }
            
            // Save each update
            TempleCore.showLoading(true);
            let savedCount = 0;
            let failedCount = 0;
            
            const savePromises = updates.map(function(update) {
                return TempleAPI.post('/manufacturing/settings/products/' + update.product_id, update)
                    .done(function() {
                        savedCount++;
                    })
                    .fail(function() {
                        failedCount++;
                    });
            });
            
            $.when.apply($, savePromises).always(function() {
                TempleCore.showLoading(false);
                
                if (failedCount > 0) {
                    TempleCore.showToast(`Saved ${savedCount} products, ${failedCount} failed`, 'warning');
                } else {
                    TempleCore.showToast(`Successfully saved ${savedCount} product settings`, 'success');
                    
                    // Remove change indicators
                    $('.changed').removeClass('changed');
                    $('.has-changes').removeClass('has-changes');
                    
                    // Reload to refresh data
                    self.loadSettings();
                }
            });
            
            // Save global settings
            this.saveGlobalSettings();
        },
        
        saveGlobalSettings: function() {
            // Save to system settings if API is available
            const globalSettings = {
                manufacturing_default_quality_check: $('#defaultQualityCheck').val(),
                manufacturing_default_batch_tracking: $('#defaultBatchTracking').val(),
                manufacturing_auto_approve_boms: $('#autoApproveBoms').val(),
                manufacturing_allow_negative_stock: $('#allowNegativeStock').val(),
                manufacturing_require_reservation: $('#requireReservation').val(),
                manufacturing_cost_method: $('#costMethod').val()
            };
            
            // If you have system settings API, save here
            // TempleAPI.post('/settings/update', { type: 'MANUFACTURING', settings: globalSettings });
        },
        
        updateStatistics: function() {
            const stats = {
                total: this.allProducts.length,
                manufacturable: 0,
                rawMaterial: 0,
                both: 0,
                notConfigured: 0
            };
            
            this.allProducts.forEach(function(product) {
                const setting = product.manufacturingSetting;
                if (setting && setting.manufacturing_type) {
                    switch (setting.manufacturing_type) {
                        case 'MANUFACTURABLE':
                            stats.manufacturable++;
                            break;
                        case 'RAW_MATERIAL':
                            stats.rawMaterial++;
                            break;
                        case 'BOTH':
                            stats.both++;
                            stats.manufacturable++;
                            stats.rawMaterial++;
                            break;
                    }
                } else {
                    stats.notConfigured++;
                }
            });
            
            $('#totalProductsCount').text(stats.total);
            $('#manufacturableCount').text(stats.manufacturable);
            $('#rawMaterialCount').text(stats.rawMaterial);
            $('#notConfiguredCount').text(stats.notConfigured);
        }
    };
    
})(jQuery, window);