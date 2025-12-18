// js/pages/sale-items/edit.js
// Sale Item Edit Page with BOM Products and Commission Management

(function($, window) {
    'use strict';
    
    // Use shared module
    if (!window.SalesSharedModule) {
        window.SalesSharedModule = {
            moduleId: 'sales',
            eventNamespace: 'sales',
            cssId: 'sales-css',
            cssPath: '/css/sales.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Sales CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Sales page registered: ${pageId}`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Sales page unregistered: ${pageId}`);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
                console.log('Sales module cleaned up');
            }
        };
    }
    
    window.SaleItemsEditPage = {
        pageId: 'sale-item-edit',
        eventNamespace: window.SalesSharedModule.eventNamespace,
        
        // Item ID
        itemId: null,
        
        // Master Data
        categories: [],
        sessions: [],
        deities: [],
        ledgers: [],
        staff: [],
        products: [],
        
        // Selected Data
        selectedCategories: [],
        selectedSessions: [],
        selectedDeities: [],
        bomProducts: [],
        commissions: [],
        
        // Image Data - Now storing base64
        imageFile: null,
        grayscaleImageFile: null,
        imageBase64: null,
        grayscaleImageBase64: null,
        
        // Original image URLs (for tracking changes)
        originalImageUrl: null,
        originalGrayscaleImageUrl: null,
        
        // Current image URLs
        imageUrl: null,
        grayscaleImageUrl: null,
        
        // Flags for image removal
        removeImage: false,
        removeGrayscaleImage: false,
        
        // Track changes
        hasChanges: false,
        
        // Page initialization
        init: function(params) {
            window.SalesSharedModule.registerPage(this.pageId);
            
            // Get item ID from params
            this.itemId = params?.id || this.getIdFromUrl();
            
            if (!this.itemId) {
                TempleCore.showToast('Sale item ID not found', 'error');
				self.cleanup();
                TempleRouter.navigate('sale-items');
                return;
            }
            
            this.render();
            this.initAnimations();
            this.loadMasterData();
            this.attachEventHandlers();
        },
        
        // Get ID from URL
        getIdFromUrl: function() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        },
        
        // Render the page HTML
        render: function() {
            const html = `
                <div class="sales-container">
                    <div class="sales-card">
                        <div class="sales-header" data-aos="fade-down" data-aos-duration="1000">
                            <div class="sales-header-bg"></div>
                            <div class="container-fluid">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h1 class="sales-card-title mb-2">
                                            <i class="bi bi-pencil-square"></i> Edit Sale Item
                                        </h1>
                                        <p class="sales-card-subtitle" id="item-subtitle">Loading...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Basic Information Section -->
                        <div class="sales-section-header">
                            <i class="bi bi-info-circle"></i>
                            Basic Information
                        </div>
                        
                        <div class="sales-row">
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">
                                        Short Code <span class="required"></span>
                                    </label>
                                    <input type="text" id="short_code" class="sales-form-input" placeholder="e.g., GHL">
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">
                                        Type <span class="required"></span>
                                    </label>
                                    <select id="sale_type" class="sales-form-select">
                                        <option value="">Select Type</option>
                                        <option value="General">General</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="Token">Token</option>
                                        <option value="Special">Special</option>
                                    </select>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Order No</label>
                                    <input type="number" id="order_no" class="sales-form-input" value="0" min="0">
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Status</label>
                                    <div class="sales-toggle-wrapper">
                                        <label class="sales-toggle">
                                            <input type="checkbox" id="status" checked>
                                            <span class="sales-toggle-slider"></span>
                                        </label>
                                        <span class="sales-toggle-label">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sales-row">
                            <div class="sales-col sales-col-2">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">
                                        Name (English) <span class="required"></span>
                                    </label>
                                    <input type="text" id="name_primary" class="sales-form-input" placeholder="Enter English name">
                                </div>
                            </div>
                            <div class="sales-col sales-col-2">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Name (Tamil)</label>
                                    <input type="text" id="name_secondary" class="sales-form-input" placeholder="Enter Tamil name">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Master Links Section -->
                        <div class="sales-section-header">
                            <i class="bi bi-link-45deg"></i>
                            Master Links
                        </div>
                        
                        <div class="sales-row">
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Group</label>
                                    <div class="sales-multiselect" id="categories-multiselect">
                                        <div class="sales-multiselect-input" tabindex="0">
                                            <span id="categories-placeholder">Select...</span>
                                            <i class="bi bi-chevron-down"></i>
                                        </div>
                                        <div class="sales-multiselect-dropdown" id="categories-dropdown"></div>
                                    </div>
                                    <div class="sales-multiselect-tags" id="categories-tags"></div>
                                    <span class="sales-help-text">Select one or more categories</span>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Deities</label>
                                    <div class="sales-multiselect" id="deities-multiselect">
                                        <div class="sales-multiselect-input" tabindex="0">
                                            <span id="deities-placeholder">Select...</span>
                                            <i class="bi bi-chevron-down"></i>
                                        </div>
                                        <div class="sales-multiselect-dropdown" id="deities-dropdown"></div>
                                    </div>
                                    <div class="sales-multiselect-tags" id="deities-tags"></div>
                                    <span class="sales-help-text">Select one or more deities</span>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Sessions</label>
                                    <div class="sales-multiselect" id="sessions-multiselect">
                                        <div class="sales-multiselect-input" tabindex="0">
                                            <span id="sessions-placeholder">Select...</span>
                                            <i class="bi bi-chevron-down"></i>
                                        </div>
                                        <div class="sales-multiselect-dropdown" id="sessions-dropdown"></div>
                                    </div>
                                    <div class="sales-multiselect-tags" id="sessions-tags"></div>
                                    <span class="sales-help-text">Select one or more sessions</span>
                                </div>
                            </div>
                            <div class="sales-col sales-col-3">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Ledger</label>
                                    <select id="ledger_id" class="sales-form-select">
                                        <option value="">Select Ledger</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pricing Section -->
                        <div class="sales-section-header">
                            <i class="bi bi-currency-dollar"></i>
                            Pricing
                        </div>
                        
                        <div class="sales-row">
                            <div class="sales-col sales-col-2">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">
                                        Price <span class="required"></span>
                                    </label>
                                    <div class="sales-input-group">
                                        <span class="sales-input-prefix">RM</span>
                                        <input type="number" id="price" class="sales-form-input" placeholder="0.00" min="0" step="0.01">
                                    </div>
                                </div>
                            </div>
                            <div class="sales-col sales-col-2">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Special Price</label>
                                    <div class="sales-input-group">
                                        <span class="sales-input-prefix">RM</span>
                                        <input type="number" id="special_price" class="sales-form-input" placeholder="0.00" min="0" step="0.01">
                                    </div>
                                    <span class="sales-help-text">Override price if set</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Additional Settings Section -->
                        <div class="sales-section-header">
                            <i class="bi bi-gear"></i>
                            Additional Settings
                        </div>
                        
                        <div class="sales-row">
                            <div class="sales-col sales-col-5">
                                <div class="sales-checkbox-wrapper">
                                    <input type="checkbox" id="is_inventory" class="sales-checkbox">
                                    <label for="is_inventory" class="sales-checkbox-label">Track Inventory</label>
                                </div>
                            </div>
                            <div class="sales-col sales-col-5">
                                <div class="sales-checkbox-wrapper">
                                    <input type="checkbox" id="is_commission" class="sales-checkbox">
                                    <label for="is_commission" class="sales-checkbox-label">Enable Commission</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- BOM Products Section (Hidden by default) -->
                        <div id="bom-section" style="display: none;">
                            <div class="sales-section-header">
                                <i class="bi bi-box-seam"></i>
                                BOM Products
                            </div>
                            
                            <div class="sales-table-wrapper" id="bom-table-wrapper" style="display: none;">
                                <table class="sales-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 40%;">Product</th>
                                            <th style="width: 20%;">Code</th>
                                            <th style="width: 20%;">Quantity</th>
                                            <th style="width: 15%;">UOM</th>
                                            <th style="width: 5%;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="bom-products-tbody"></tbody>
                                </table>
                            </div>
                            
                            <button type="button" class="sales-add-btn" id="add-bom-product">
                                <i class="bi bi-plus-circle"></i>
                                Add Product
                            </button>
                        </div>
                        
                        <!-- Commission Settings Section (Hidden by default) -->
                        <div id="commission-section" style="display: none;">
                            <div class="sales-section-header">
                                <i class="bi bi-people"></i>
                                Commission Settings
                            </div>
                            
                            <div class="sales-warning-alert" id="commission-warning" style="display: none;">
                                <i class="bi bi-exclamation-triangle-fill"></i>
                                <span>Total commission is less than 100%. Remaining: <span id="remaining-commission">100.00</span>%</span>
                            </div>
                            
                            <div class="sales-commission-summary">
                                <i class="bi bi-info-circle"></i>
                                <span>Total Commission: <span class="sales-commission-value" id="total-commission">0.00%</span></span>
                            </div>
                            
                            <div class="sales-table-wrapper" id="commission-table-wrapper" style="display: none;">
                                <table class="sales-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 70%;">Select Staff</th>
                                            <th style="width: 25%;">Commission</th>
                                            <th style="width: 5%;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="commissions-tbody"></tbody>
                                </table>
                            </div>
                            
                            <button type="button" class="sales-add-btn" id="add-staff-commission">
                                <i class="bi bi-plus-circle"></i>
                                Add Staff Commission
                            </button>
                        </div>
                        
                        <!-- Images Section -->
                        <div class="sales-section-header">
                            <i class="bi bi-images"></i>
                            Images
                        </div>
                        
                        <div class="sales-row">
                            <div class="sales-col sales-col-2">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Image</label>
                                    <div class="sales-image-upload" id="image-upload">
                                        <i class="bi bi-cloud-upload sales-image-upload-icon"></i>
                                        <div class="sales-image-upload-text">Choose File</div>
                                        <span class="sales-help-text" id="image-help-text">No file chosen</span>
                                        <input type="file" id="image_file" accept="image/*">
                                        <img id="image-preview" class="sales-image-preview" style="display: none;">
                                        <button type="button" class="sales-image-remove-btn" id="remove-image" style="display: none;">
                                            <i class="bi bi-x-circle"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="sales-col sales-col-2">
                                <div class="sales-form-group">
                                    <label class="sales-form-label">Grayscale Image</label>
                                    <div class="sales-image-upload" id="grayscale-image-upload">
                                        <i class="bi bi-cloud-upload sales-image-upload-icon"></i>
                                        <div class="sales-image-upload-text">Choose File</div>
                                        <span class="sales-help-text" id="grayscale-help-text">No file chosen</span>
                                        <input type="file" id="grayscale_image_file" accept="image/*">
                                        <img id="grayscale-image-preview" class="sales-image-preview" style="display: none;">
                                        <button type="button" class="sales-image-remove-btn" id="remove-grayscale-image" style="display: none;">
                                            <i class="bi bi-x-circle"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Form Actions -->
                        <div class="sales-btn-group">
                            <button type="button" class="sales-btn-primary" id="save-sale-item">
                                <i class="bi bi-check-circle"></i>
                                Update Sale Item
                            </button>
                            <button type="button" class="sales-btn-secondary" id="cancel-btn">
                                <i class="bi bi-x-circle"></i>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Load all master data then load item
        loadMasterData: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            $.when(
                TempleAPI.get('/sales/categories/active'),
                TempleAPI.get('/sales/sessions/active'),
                TempleAPI.get('/deities/active'),
                TempleAPI.get('/accounts/ledgers/type/income'),
                TempleAPI.get('/staff/active')
            ).done(function(categoriesRes, sessionsRes, deitiesRes, ledgersRes, staffRes) {
                // Store master data
                self.categories = categoriesRes[0]?.data || categoriesRes.data || [];
                self.sessions = sessionsRes[0]?.data || sessionsRes.data || [];
                self.deities = deitiesRes[0]?.data || deitiesRes.data || [];
                self.ledgers = ledgersRes[0]?.data?.ledgers || ledgersRes.data?.ledgers || [];
                self.staff = staffRes[0]?.data || staffRes.data || [];
                
                // Populate dropdowns and multiselects
                self.populateCategories();
                self.populateSessions();
                self.populateDeities();
                self.populateLedgers();
                
                // Now load the sale item data
                self.loadItemData();
            }).fail(function(xhr, status, error) {
                console.error('Failed to load master data:', error);
                TempleCore.showToast('Failed to load master data', 'error');
                TempleCore.showLoading(false);
            });
        },
        
        // Load sale item data
        loadItemData: function() {
            const self = this;
            
            TempleAPI.get(`/sales/items/${this.itemId}`).done(function(response) {
                if (response.success && response.data) {
                    self.populateForm(response.data);
                } else {
                    TempleCore.showToast('Sale item not found', 'error');
					self.cleanup();
                    TempleRouter.navigate('sale-items');
                }
                TempleCore.showLoading(false);
            }).fail(function(xhr, status, error) {
                console.error('Failed to load sale item:', error);
                TempleCore.showToast('Failed to load sale item', 'error');
                TempleCore.showLoading(false);
				self.cleanup();
                TempleRouter.navigate('sale-items');
            });
        },
        
        // Populate form with item data
        populateForm: function(data) {
            const self = this;
            
            // Update subtitle
            $('#item-subtitle').text(data.name_primary + (data.name_secondary ? ` (${data.name_secondary})` : ''));
            
            // Basic Information
            $('#short_code').val(data.short_code);
            $('#sale_type').val(data.sale_type);
            $('#order_no').val(data.order_no || 0);
            $('#status').prop('checked', data.status);
            $('#name_primary').val(data.name_primary);
            $('#name_secondary').val(data.name_secondary || '');
            
            // Master Links
            $('#ledger_id').val(data.ledger_id || '');
            
            // Categories
            if (data.categories && data.categories.length > 0) {
                data.categories.forEach(cat => {
                    const catId = cat.id || cat.pivot?.sale_category_id;
                    if (catId) {
                        this.selectedCategories.push(catId);
                        $(`#categories-dropdown .sales-multiselect-option[data-value="${catId}"]`)
                            .addClass('selected')
                            .find('input[type="checkbox"]')
                            .prop('checked', true);
                    }
                });
                this.updateMultiselectTags('categories', this.selectedCategories);
            }
            
            // Sessions
            if (data.sessions && data.sessions.length > 0) {
                data.sessions.forEach(session => {
                    const sessionId = session.id || session.pivot?.sale_session_id;
                    if (sessionId) {
                        this.selectedSessions.push(sessionId);
                        $(`#sessions-dropdown .sales-multiselect-option[data-value="${sessionId}"]`)
                            .addClass('selected')
                            .find('input[type="checkbox"]')
                            .prop('checked', true);
                    }
                });
                this.updateMultiselectTags('sessions', this.selectedSessions);
            }
            
            // Deities
            if (data.deities && data.deities.length > 0) {
                data.deities.forEach(deity => {
                    const deityId = deity.id || deity.pivot?.deity_id;
                    if (deityId) {
                        this.selectedDeities.push(deityId);
                        $(`#deities-dropdown .sales-multiselect-option[data-value="${deityId}"]`)
                            .addClass('selected')
                            .find('input[type="checkbox"]')
                            .prop('checked', true);
                    }
                });
                this.updateMultiselectTags('deities', this.selectedDeities);
            }
            
            // Pricing
            $('#price').val(data.price);
            $('#special_price').val(data.special_price || '');
            
            // Additional Settings
            $('#is_inventory').prop('checked', data.is_inventory);
            $('#is_commission').prop('checked', data.is_commission);
            
            // Show/hide sections based on checkboxes
            if (data.is_inventory) {
                $('#bom-section').show();
            }
            if (data.is_commission) {
                $('#commission-section').show();
            }
            
            // BOM Products
            if (data.bom_products && data.bom_products.length > 0) {
                data.bom_products.forEach(bp => {
                    this.bomProducts.push({
                        product_id: bp.product_id,
                        product_name: bp.product?.name || 'Unknown Product',
                        product_code: bp.product?.product_code || '',
                        quantity: bp.quantity,
                        uom: bp.product?.uom_short || bp.product?.uom_name || ''
                    });
                });
                this.renderBomProducts();
            }
            
            // Commissions
            if (data.commissions && data.commissions.length > 0) {
                data.commissions.forEach(comm => {
                    this.commissions.push({
                        staff_id: comm.staff_id,
                        staff_name: comm.staff?.name || 'Unknown Staff',
                        commission_percent: comm.commission_percent
                    });
                });
                this.renderCommissions();
            }
            
            // Images - Store original URLs and display
            this.originalImageUrl = data.image_url;
            this.originalGrayscaleImageUrl = data.grayscale_image_url;
            this.imageUrl = data.image_url;
            this.grayscaleImageUrl = data.grayscale_image_url;
            
            // Display existing images using signed URLs
            if (data.image_signed_url || data.image_url) {
                const imageDisplayUrl = data.image_signed_url || data.image_url;
                $('#image-preview').attr('src', imageDisplayUrl).show();
                $('#image-help-text').text('Current image');
                $('#remove-image').show();
                $('#image-upload').find('.sales-image-upload-icon, .sales-image-upload-text').hide();
            }
            
            if (data.grayscale_image_signed_url || data.grayscale_image_url) {
                const grayscaleDisplayUrl = data.grayscale_image_signed_url || data.grayscale_image_url;
                $('#grayscale-image-preview').attr('src', grayscaleDisplayUrl).show();
                $('#grayscale-help-text').text('Current grayscale image');
                $('#remove-grayscale-image').show();
                $('#grayscale-image-upload').find('.sales-image-upload-icon, .sales-image-upload-text').hide();
            }
            
            // Mark initial state as no changes
            this.hasChanges = false;
        },
        
        // Populate categories multiselect
        populateCategories: function() {
            const dropdown = $('#categories-dropdown');
            dropdown.empty();
            
            this.categories.forEach(cat => {
                const option = $(`
                    <div class="sales-multiselect-option" data-value="${cat.id}">
                        <input type="checkbox" class="sales-checkbox">
                        <span>${cat.name_primary}${cat.name_secondary ? ' (' + cat.name_secondary + ')' : ''}</span>
                    </div>
                `);
                dropdown.append(option);
            });
        },
        
        // Populate sessions multiselect
        populateSessions: function() {
            const dropdown = $('#sessions-dropdown');
            dropdown.empty();
            
            this.sessions.forEach(session => {
                const option = $(`
                    <div class="sales-multiselect-option" data-value="${session.id}">
                        <input type="checkbox" class="sales-checkbox">
                        <span>${session.name_primary}${session.name_secondary ? ' (' + session.name_secondary + ')' : ''}</span>
                    </div>
                `);
                dropdown.append(option);
            });
        },
        
        // Populate deities multiselect
        populateDeities: function() {
            const dropdown = $('#deities-dropdown');
            dropdown.empty();
            
            this.deities.forEach(deity => {
                const option = $(`
                    <div class="sales-multiselect-option" data-value="${deity.id}">
                        <input type="checkbox" class="sales-checkbox">
                        <span>${deity.name_primary || deity.name}${deity.name_secondary ? ' (' + deity.name_secondary + ')' : ''}</span>
                    </div>
                `);
                dropdown.append(option);
            });
        },
        
        // Populate ledgers dropdown
        populateLedgers: function() {
            let ledgerOptions = '<option value="">Select Ledger</option>';
            this.ledgers.forEach(ledger => {
                ledgerOptions += `<option value="${ledger.id}">${ledger.name}</option>`;
            });
            $('#ledger_id').html(ledgerOptions);
        },
        
        // Attach event handlers
        attachEventHandlers: function() {
            const self = this;
            
            // Multiselect handlers
            this.initMultiselect('categories', this.selectedCategories);
            this.initMultiselect('sessions', this.selectedSessions);
            this.initMultiselect('deities', this.selectedDeities);
            
            // Track inventory checkbox
            $('#is_inventory').on('change', function() {
                self.hasChanges = true;
                if ($(this).is(':checked')) {
                    $('#bom-section').fadeIn();
                } else {
                    $('#bom-section').fadeOut();
                    self.bomProducts = [];
                    self.renderBomProducts();
                }
            });
            
            // Enable commission checkbox
            $('#is_commission').on('change', function() {
                self.hasChanges = true;
                if ($(this).is(':checked')) {
                    $('#commission-section').fadeIn();
                } else {
                    $('#commission-section').fadeOut();
                    self.commissions = [];
                    self.renderCommissions();
                }
            });
            
            // Add BOM product
            $('#add-bom-product').on('click', function() {
                self.showProductSelectionModal();
            });
            
            // Add staff commission
            $('#add-staff-commission').on('click', function() {
                self.addCommissionRow();
            });
            
            // Image upload
            $('#image_file').on('change', function(e) {
                self.handleImageUpload(e, 'image');
            });
            
            $('#grayscale_image_file').on('change', function(e) {
                self.handleImageUpload(e, 'grayscale');
            });
            
            // Click on upload area
            $('#image-upload').on('click', function(e) {
                if (e.target.tagName !== 'INPUT' && !$(e.target).hasClass('sales-image-remove-btn') && !$(e.target).closest('.sales-image-remove-btn').length) {
                    $('#image_file').click();
                }
            });
            
            $('#grayscale-image-upload').on('click', function(e) {
                if (e.target.tagName !== 'INPUT' && !$(e.target).hasClass('sales-image-remove-btn') && !$(e.target).closest('.sales-image-remove-btn').length) {
                    $('#grayscale_image_file').click();
                }
            });
            
            // Remove image buttons
            $('#remove-image').on('click', function(e) {
                e.stopPropagation();
                self.handleRemoveImage('image');
            });
            
            $('#remove-grayscale-image').on('click', function(e) {
                e.stopPropagation();
                self.handleRemoveImage('grayscale');
            });
            
            // Save button
            $('#save-sale-item').on('click', function() {
                self.saveSaleItem();
            });
            
            // Cancel button
            $('#cancel-btn').on('click', function() {
                if (self.hasChanges) {
                    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
                        self.cleanup();
                        TempleRouter.navigate('sale-items');
                    }
                } else {
                    self.cleanup();
                    TempleRouter.navigate('sale-items');
                }
            });
            
            // Track form changes
            $('input, select, textarea').on('change input', function() {
                self.hasChanges = true;
            });
        },
        
        // Initialize multiselect
        initMultiselect: function(name, selectedArray) {
            const self = this;
            const $multiselect = $(`#${name}-multiselect`);
            const $input = $multiselect.find('.sales-multiselect-input');
            const $dropdown = $(`#${name}-dropdown`);
            
            // Toggle dropdown
            $input.on('click', function(e) {
                e.stopPropagation();
                $('.sales-multiselect-dropdown').not($dropdown).removeClass('active');
                $dropdown.toggleClass('active');
            });
            
            // Select option
            $dropdown.on('click', '.sales-multiselect-option', function(e) {
                e.stopPropagation();
                self.hasChanges = true;
                const value = $(this).data('value');
                const checkbox = $(this).find('input[type="checkbox"]');
                
                const index = selectedArray.indexOf(value);
                if (index > -1) {
                    selectedArray.splice(index, 1);
                    $(this).removeClass('selected');
                    checkbox.prop('checked', false);
                } else {
                    selectedArray.push(value);
                    $(this).addClass('selected');
                    checkbox.prop('checked', true);
                }
                
                self.updateMultiselectTags(name, selectedArray);
            });
            
            // Close dropdown when clicking outside
            $(document).on('click.' + this.eventNamespace, function(e) {
                if (!$(e.target).closest('.sales-multiselect').length) {
                    $('.sales-multiselect-dropdown').removeClass('active');
                }
            });
        },
        
        // Update multiselect tags
        updateMultiselectTags: function(name, selectedArray) {
            const self = this;
            const $tags = $(`#${name}-tags`);
            $tags.empty();
            
            let dataSource;
            if (name === 'categories') dataSource = this.categories;
            else if (name === 'sessions') dataSource = this.sessions;
            else if (name === 'deities') dataSource = this.deities;
            
            selectedArray.forEach(id => {
                const item = dataSource.find(i => i.id == id);
                if (item) {
                    const label = item.name_primary || item.name;
                    const tag = $(`
                        <div class="sales-multiselect-tag">
                            <span>${label}</span>
                            <span class="sales-multiselect-tag-remove" data-value="${id}">&times;</span>
                        </div>
                    `);
                    
                    tag.find('.sales-multiselect-tag-remove').on('click', function(e) {
                        e.stopPropagation();
                        self.hasChanges = true;
                        const val = $(this).data('value');
                        const idx = selectedArray.indexOf(val);
                        if (idx > -1) {
                            selectedArray.splice(idx, 1);
                            self.updateMultiselectTags(name, selectedArray);
                            $(`#${name}-dropdown .sales-multiselect-option[data-value="${val}"]`)
                                .removeClass('selected')
                                .find('input[type="checkbox"]')
                                .prop('checked', false);
                        }
                    });
                    
                    $tags.append(tag);
                }
            });
        },
        
        // Show product selection modal
        showProductSelectionModal: function() {
            const self = this;
            
            if (this.products.length === 0) {
                TempleCore.showLoading(true);
                TempleAPI.get('/sales/items/available-products').done(function(response) {
                    self.products = response.data || [];
                    self.displayProductModal();
                    TempleCore.showLoading(false);
                }).fail(function(xhr, status, error) {
                    console.error('Failed to load products:', error);
                    TempleCore.showToast('Failed to load products', 'error');
                    TempleCore.showLoading(false);
                });
            } else {
                this.displayProductModal();
            }
        },
        
        // Display product selection modal
        displayProductModal: function() {
            const self = this;
            const selectedProductIds = this.bomProducts.map(bp => bp.product_id);
            
            let modalHtml = `
                <div class="modal fade" id="product-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Select Product</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <input type="text" id="product-search" class="form-control" placeholder="Search products...">
                                </div>
                                <div class="list-group" id="product-list">
            `;
            
            this.products.forEach(product => {
                const isDisabled = selectedProductIds.includes(product.id);
                const disabledClass = isDisabled ? 'disabled' : '';
                const uom = product.uom_short || product.uom_name || '';
                const productDataStr = btoa(JSON.stringify(product));
                
                modalHtml += `
                    <a href="#" class="list-group-item list-group-item-action ${disabledClass}" 
                       data-product-encoded="${productDataStr}" ${isDisabled ? 'disabled' : ''}>
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${product.name}</h6>
                            <small>${product.product_code}</small>
                        </div>
                        <p class="mb-1">Stock: ${product.current_stock} ${uom}</p>
                    </a>
                `;
            });
            
            modalHtml += `
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#product-modal').remove();
            $('body').append(modalHtml);
            
            const $modal = new bootstrap.Modal(document.getElementById('product-modal'));
            $modal.show();
            
            $('#product-list').on('click', 'a:not(.disabled)', function(e) {
                e.preventDefault();
                const productDataStr = $(this).attr('data-product-encoded');
                const product = JSON.parse(atob(productDataStr));
                self.addBomProduct(product);
                $modal.hide();
            });
            
            $('#product-search').on('keyup', function() {
                const search = $(this).val().toLowerCase();
                $('#product-list a').each(function() {
                    const text = $(this).text().toLowerCase();
                    $(this).toggle(text.includes(search));
                });
            });
            
            $('#product-modal').on('hidden.bs.modal', function() {
                $(this).remove();
            });
        },
        
        // Add BOM product
        addBomProduct: function(product) {
            this.hasChanges = true;
            this.bomProducts.push({
                product_id: product.id,
                product_name: product.name,
                product_code: product.product_code,
                quantity: 1,
                uom: product.uom_short || product.uom_name || ''
            });
            this.renderBomProducts();
        },
        
        // Render BOM products table
        renderBomProducts: function() {
            const self = this;
            const $tbody = $('#bom-products-tbody');
            $tbody.empty();
            
            if (this.bomProducts.length === 0) {
                $('#bom-table-wrapper').hide();
                return;
            }
            
            $('#bom-table-wrapper').show();
            
            this.bomProducts.forEach((bp, index) => {
                const row = $(`
                    <tr data-index="${index}">
                        <td>${bp.product_name}</td>
                        <td>${bp.product_code}</td>
                        <td>
                            <input type="number" class="sales-form-input bom-quantity" 
                                   value="${bp.quantity}" min="0.001" step="0.001" data-index="${index}">
                        </td>
                        <td>${bp.uom}</td>
                        <td>
                            <button type="button" class="sales-delete-btn remove-bom" data-index="${index}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
                $tbody.append(row);
            });
            
            $tbody.find('.bom-quantity').on('change', function() {
                self.hasChanges = true;
                const index = $(this).data('index');
                self.bomProducts[index].quantity = parseFloat($(this).val()) || 1;
            });
            
            $tbody.find('.remove-bom').on('click', function() {
                self.hasChanges = true;
                const index = $(this).data('index');
                self.bomProducts.splice(index, 1);
                self.renderBomProducts();
            });
        },
        
        // Add commission row
        addCommissionRow: function() {
            this.hasChanges = true;
            this.commissions.push({
                staff_id: null,
                staff_name: '',
                commission_percent: 0
            });
            this.renderCommissions();
        },
        
        // Render commissions table
        renderCommissions: function() {
            const self = this;
            const $tbody = $('#commissions-tbody');
            $tbody.empty();
            
            if (this.commissions.length === 0) {
                $('#commission-table-wrapper').hide();
                this.updateCommissionTotal();
                return;
            }
            
            $('#commission-table-wrapper').show();
            
            this.commissions.forEach((comm, index) => {
                let staffOptions = '<option value="">Select Staff</option>';
                this.staff.forEach(s => {
                    const selected = s.id == comm.staff_id ? 'selected' : '';
                    staffOptions += `<option value="${s.id}" ${selected}>${s.name}</option>`;
                });
                
                const row = $(`
                    <tr data-index="${index}">
                        <td>
                            <select class="sales-form-select commission-staff" data-index="${index}">
                                ${staffOptions}
                            </select>
                        </td>
                        <td>
                            <div class="sales-input-group">
                                <input type="number" class="sales-form-input commission-percent" 
                                       value="${comm.commission_percent}" min="0" max="100" step="0.01" data-index="${index}">
                                <span class="sales-input-suffix">%</span>
                            </div>
                        </td>
                        <td>
                            <button type="button" class="sales-delete-btn remove-commission" data-index="${index}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
                $tbody.append(row);
            });
            
            $tbody.find('.commission-staff').on('change', function() {
                self.hasChanges = true;
                const index = $(this).data('index');
                self.commissions[index].staff_id = $(this).val();
                const staffMember = self.staff.find(s => s.id == $(this).val());
                self.commissions[index].staff_name = staffMember ? staffMember.name : '';
            });
            
            $tbody.find('.commission-percent').on('change', function() {
                self.hasChanges = true;
                const index = $(this).data('index');
                self.commissions[index].commission_percent = parseFloat($(this).val()) || 0;
                self.updateCommissionTotal();
            });
            
            $tbody.find('.remove-commission').on('click', function() {
                self.hasChanges = true;
                const index = $(this).data('index');
                self.commissions.splice(index, 1);
                self.renderCommissions();
            });
            
            this.updateCommissionTotal();
        },
        
        // Update commission total
        updateCommissionTotal: function() {
            const total = this.commissions.reduce((sum, c) => sum + (parseFloat(c.commission_percent) || 0), 0);
            const remaining = 100 - total;
            
            $('#total-commission').text(total.toFixed(2) + '%');
            $('#remaining-commission').text(remaining.toFixed(2));
            
            if (total < 100 && this.commissions.length > 0) {
                $('#commission-warning').fadeIn();
            } else {
                $('#commission-warning').fadeOut();
            }
            
            if (total > 100) {
                $('#total-commission').css('color', '#dc3545');
            } else {
                $('#total-commission').css('color', 'var(--primary-color, #0066cc)');
            }
        },
        
        // Handle image upload - Convert to base64
        handleImageUpload: function(e, type) {
            const self = this;
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type
            if (!file.type.match('image.*')) {
                TempleCore.showToast('Please select an image file', 'error');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                TempleCore.showToast('Image size must be less than 5MB', 'error');
                return;
            }
            
            this.hasChanges = true;
            
            // Read file and convert to base64
            const reader = new FileReader();
            reader.onload = function(evt) {
                const base64Data = evt.target.result;
                
                if (type === 'image') {
                    $('#image-preview').attr('src', base64Data).show();
                    $('#image-help-text').text(file.name);
                    $('#remove-image').show();
                    $('#image-upload').find('.sales-image-upload-icon, .sales-image-upload-text').hide();
                    self.imageFile = file;
                    self.imageBase64 = base64Data;
                    self.removeImage = false; // Clear remove flag if user uploads new image
                } else {
                    $('#grayscale-image-preview').attr('src', base64Data).show();
                    $('#grayscale-help-text').text(file.name);
                    $('#remove-grayscale-image').show();
                    $('#grayscale-image-upload').find('.sales-image-upload-icon, .sales-image-upload-text').hide();
                    self.grayscaleImageFile = file;
                    self.grayscaleImageBase64 = base64Data;
                    self.removeGrayscaleImage = false; // Clear remove flag if user uploads new image
                }
            };
            reader.readAsDataURL(file);
        },
        
        // Handle remove image (marks for deletion)
        handleRemoveImage: function(type) {
            this.hasChanges = true;
            
            if (type === 'image') {
                this.imageFile = null;
                this.imageBase64 = null;
                this.removeImage = true; // Flag to delete from S3
                $('#image_file').val('');
                $('#image-preview').attr('src', '').hide();
                $('#image-help-text').text('No file chosen');
                $('#remove-image').hide();
                $('#image-upload').find('.sales-image-upload-icon, .sales-image-upload-text').show();
            } else {
                this.grayscaleImageFile = null;
                this.grayscaleImageBase64 = null;
                this.removeGrayscaleImage = true; // Flag to delete from S3
                $('#grayscale_image_file').val('');
                $('#grayscale-image-preview').attr('src', '').hide();
                $('#grayscale-help-text').text('No file chosen');
                $('#remove-grayscale-image').hide();
                $('#grayscale-image-upload').find('.sales-image-upload-icon, .sales-image-upload-text').show();
            }
        },
        
        // Save sale item - UPDATED to include base64 images and removal flags
        saveSaleItem: async function() {
            const self = this;
            
            // Validate form
            if (!this.validateForm()) {
                return;
            }
            
            TempleCore.showLoading(true);
            
            try {
                // Prepare JSON data
                const data = {
                    name_primary: $('#name_primary').val().trim(),
                    name_secondary: $('#name_secondary').val().trim() || null,
                    short_code: $('#short_code').val().trim().toUpperCase(),
                    sale_type: $('#sale_type').val(),
                    price: parseFloat($('#price').val()) || 0,
                    special_price: $('#special_price').val() ? parseFloat($('#special_price').val()) : null,
                    ledger_id: $('#ledger_id').val() || null,
                    status: $('#status').is(':checked'),
                    is_inventory: $('#is_inventory').is(':checked'),
                    is_commission: $('#is_commission').is(':checked'),
                    order_no: parseInt($('#order_no').val()) || 0,
                    enable_rasi: $('#enable_rasi').is(':checked')
                };
                
                // Add categories if selected
                if (this.selectedCategories.length > 0) {
                    data.categories = this.selectedCategories;
                }
                
                // Add sessions if selected
                if (this.selectedSessions.length > 0) {
                    data.sessions = this.selectedSessions;
                }
                
                // Add deities if selected
                if (this.selectedDeities.length > 0) {
                    data.deities = this.selectedDeities;
                }
                
                // Add BOM Products if inventory tracking is enabled
                if (data.is_inventory && this.bomProducts.length > 0) {
                    data.bom_products = this.bomProducts.map(bp => ({
                        product_id: bp.product_id,
                        quantity: parseFloat(bp.quantity) || 1
                    }));
                }
                
                // Add Commissions if commission is enabled
                if (data.is_commission && this.commissions.length > 0) {
                    data.commissions = this.commissions
                        .filter(c => c.staff_id)
                        .map(c => ({
                            staff_id: c.staff_id,
                            commission_percent: parseFloat(c.commission_percent) || 0
                        }));
                }
                
                // Handle image updates
                // If new image uploaded, send base64
                if (this.imageBase64) {
                    data.image_base64 = this.imageBase64;
                }
                // If image marked for removal
                if (this.removeImage) {
                    data.remove_image = true;
                }
                
                // Handle grayscale image updates
                if (this.grayscaleImageBase64) {
                    data.grayscale_image_base64 = this.grayscaleImageBase64;
                }
                if (this.removeGrayscaleImage) {
                    data.remove_grayscale_image = true;
                }
                
                console.log('Updating sale item with data:', data);
                
                // Update via API - send as JSON
                TempleAPI.put(`/sales/items/${this.itemId}`, data)
                    .done(function(response) {
                        TempleCore.showLoading(false);
                        if (response.success) {
                            TempleCore.showToast('Sale item updated successfully', 'success');
                            self.cleanup();
                            TempleRouter.navigate('sale-items');
                        } else {
                            TempleCore.showToast(response.message || 'Failed to update sale item', 'error');
                        }
                    })
                    .fail(function(xhr, status, error) {
                        TempleCore.showLoading(false);
                        console.error('Update error:', xhr.responseJSON);
                        
                        if (xhr.status === 422 && xhr.responseJSON?.errors) {
                            const errors = xhr.responseJSON.errors;
                            const firstError = Object.values(errors)[0];
                            const message = Array.isArray(firstError) ? firstError[0] : firstError;
                            TempleCore.showToast(message, 'error');
                        } else {
                            const message = xhr.responseJSON?.message || 'Failed to update sale item';
                            TempleCore.showToast(message, 'error');
                        }
                    });
                    
            } catch (error) {
                TempleCore.showLoading(false);
                console.error('Update error:', error);
                TempleCore.showToast('An error occurred while updating', 'error');
            }
        },
        
        // Initialize animations
        initAnimations: function() {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }
            
            if (typeof gsap !== 'undefined') {
                gsap.fromTo('.sales-card',
                    { y: 20, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.5,
                        ease: 'power2.out',
                        clearProps: 'all'
                    }
                );
            }
        },
        
        // Validate form
        validateForm: function() {
            const name = $('#name_primary').val().trim();
            const shortCode = $('#short_code').val().trim();
            const saleType = $('#sale_type').val();
            const price = parseFloat($('#price').val());
            
            if (!name) {
                TempleCore.showToast('Please enter name (English)', 'error');
                $('#name_primary').focus();
                return false;
            }
            
            if (!shortCode) {
                TempleCore.showToast('Please enter Short code', 'error');
                $('#short_code').focus();
                return false;
            }
            
            if (!saleType) {
                TempleCore.showToast('Please select sale type', 'error');
                $('#sale_type').focus();
                return false;
            }
            
            if (isNaN(price) || price < 0) {
                TempleCore.showToast('Please enter a valid price', 'error');
                $('#price').focus();
                return false;
            }
            
            // Validate commission total
            if ($('#is_commission').is(':checked') && this.commissions.length > 0) {
                const total = this.commissions.reduce((sum, c) => sum + (parseFloat(c.commission_percent) || 0), 0);
                if (total > 100) {
                    TempleCore.showToast('Total commission cannot exceed 100%', 'error');
                    return false;
                }
                
                for (let i = 0; i < this.commissions.length; i++) {
                    if (!this.commissions[i].staff_id && this.commissions[i].commission_percent > 0) {
                        TempleCore.showToast('Please select staff for all commission rows', 'error');
                        return false;
                    }
                }
            }
            
            return true;
        },
        
        // Cleanup
        cleanup: function() {
            window.SalesSharedModule.unregisterPage(this.pageId);
            $(document).off('.' + this.eventNamespace);
            $(window).off('.' + this.eventNamespace);
            
            // Clear data
            this.itemId = null;
            this.selectedCategories = [];
            this.selectedSessions = [];
            this.selectedDeities = [];
            this.bomProducts = [];
            this.commissions = [];
            this.imageFile = null;
            this.grayscaleImageFile = null;
            this.imageBase64 = null;
            this.grayscaleImageBase64 = null;
            this.originalImageUrl = null;
            this.originalGrayscaleImageUrl = null;
            this.imageUrl = null;
            this.grayscaleImageUrl = null;
            this.removeImage = false;
            this.removeGrayscaleImage = false;
            this.hasChanges = false;
            
            // Remove any open modals
            $('#product-modal').remove();
        }
    };
    
})(jQuery, window);