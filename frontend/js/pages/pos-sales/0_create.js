// js/pages/pos-sales/create.js
// POS Sales Order Create Page - Dynamic Version with GSAP animations

(function($, window) {
    'use strict';
    
    // Shared Module for POS Sales
    if (!window.POSSalesSharedModule) {
        window.POSSalesSharedModule = {
            moduleId: 'pos-sales',
            eventNamespace: 'pos-sales',
            cssId: 'pos-sales-css',
            cssPath: '/css/pos-sales.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('POS Sales CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`POS Sales page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`POS Sales page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            // Check if any pages are active
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            // Get active pages
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            // Cleanup module resources
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('POS Sales CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('POS Sales module cleaned up');
            }
        };
    }
    
    window.PosSalesCreatePage = {
        pageId: 'pos-sales-create',
        eventNamespace: window.POSSalesSharedModule.eventNamespace,
        intervals: [],
        timeouts: [],
        
        // Data stores
        categories: [],
        sessions: [],
        deities: [],
        saleItems: [],
        paymentModes: [],
        cart: [],
        
        // State
        selectedCategory: 'all',
        selectedSession: 'all',
        selectedPaymentMode: null,
        printOption: 'single',
        currentVehicleCartIndex: null,
        isProcessing: false,
        pendingPaymentData: null, // Stores booking data while waiting for payment
        
        // Temple settings for print
        templeSettings: {
            temple_name: '',
            temple_name_secondary: '',
            temple_address: '',
            temple_city: '',
            temple_state: '',
            temple_pincode: '',
            temple_country: '',
            temple_phone: '',
            temple_email: '',
            temple_logo: '',
            slogan: ''
        },
        
        // Devotee details
        devoteeDetails: {
            name: '',
            email: '',
            nric: '',
            phone_code: '+60',
            phone: '',
            dob: '',
            address: '',
            remarks: ''
        },
        
        // Page initialization
        init: function(params) {
            window.POSSalesSharedModule.registerPage(this.pageId);
            this.hideSidebar(); // Auto-hide sidebar on page load
            this.loadTempleSettings();
            this.loadMasterData();
        },
        
        // Load temple settings from localStorage
        loadTempleSettings: function() {
            try {
                const storageKey = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE && APP_CONFIG.STORAGE.TEMPLE 
                    ? APP_CONFIG.STORAGE.TEMPLE 
                    : 'temple_settings';
                const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                
                this.templeSettings = {
                    temple_name: stored.name || stored.temple_name || 'Temple Name',
                    temple_name_secondary: stored.name_secondary || stored.temple_name_secondary || '',
                    temple_address: stored.address || stored.temple_address || '',
                    temple_city: stored.city || stored.temple_city || '',
                    temple_state: stored.state || stored.temple_state || '',
                    temple_pincode: stored.pincode || stored.temple_pincode || '',
                    temple_country: stored.country || stored.temple_country || 'Malaysia',
                    temple_phone: stored.phone || stored.temple_phone || '',
                    temple_email: stored.email || stored.temple_email || '',
                    temple_logo: stored.temple_logo || stored.logo || '',
                    slogan: stored.slogan || ''
                };
            } catch (e) {
                console.warn('Failed to load temple settings:', e);
            }
        },
        
        // Hide sidebar for full-width POS
        hideSidebar: function() {
            // Store original state
            this.sidebarWasVisible = true;
            
            // Add class to body for full-width mode
            $('body').addClass('pos-fullwidth-mode');
            
            // Hide sidebar container using class AND inline style for maximum compatibility
            $('#sidebar-container')
                .addClass('pos-sidebar-hidden')
                .css({
                    'display': 'none',
                    'width': '0',
                    'max-width': '0',
                    'flex': '0 0 0',
                    'visibility': 'hidden'
                });
            
            // Expand main content using class AND inline style
            $('#page-container')
                .addClass('pos-main-expanded')
                .css({
                    'flex': '0 0 100%',
                    'max-width': '100%',
                    'width': '100%',
                    'margin-left': '0'
                });
        },
        
        // Show sidebar
        showSidebar: function() {
            $('body').removeClass('pos-fullwidth-mode');
            
            // Show sidebar container - remove class and reset inline styles
            $('#sidebar-container')
                .removeClass('pos-sidebar-hidden')
                .css({
                    'display': '',
                    'width': '',
                    'max-width': '',
                    'flex': '',
                    'visibility': ''
                });
            
            // Reset main content - remove class and reset inline styles
            $('#page-container')
                .removeClass('pos-main-expanded')
                .css({
                    'flex': '',
                    'max-width': '',
                    'width': '',
                    'margin-left': ''
                });
        },
        
        // Toggle sidebar
        toggleSidebar: function() {
            if ($('body').hasClass('pos-fullwidth-mode')) {
                this.showSidebar();
                $('#btnSidebarToggle i').removeClass('bi-arrow-bar-right').addClass('bi-list');
            } else {
                this.hideSidebar();
                $('#btnSidebarToggle i').removeClass('bi-list').addClass('bi-arrow-bar-right');
            }
        },
        
        // Load all master data
        loadMasterData: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load all required data in parallel including payment modes
            $.when(
                TempleAPI.get('/sales/categories/active'),
                TempleAPI.get('/sales/sessions/active'),
                TempleAPI.get('/deities/active'),
                TempleAPI.get('/sales/items/active'),
                TempleAPI.get('/masters/payment-modes/active')
            ).done(function(categoriesRes, sessionsRes, deitiesRes, itemsRes, paymentRes) {
                // Extract data from responses (jQuery when returns arrays)
                self.categories = categoriesRes[0]?.data || categoriesRes?.data || [];
                self.sessions = sessionsRes[0]?.data || sessionsRes?.data || [];
                self.deities = deitiesRes[0]?.data || deitiesRes?.data || [];
                self.saleItems = itemsRes[0]?.data || itemsRes?.data || [];
                self.paymentModes = paymentRes[0]?.data || paymentRes?.data || [];
                
                console.log('Loaded categories:', self.categories.length);
                console.log('Loaded sessions:', self.sessions.length);
                console.log('Loaded deities:', self.deities.length);
                console.log('Loaded items:', self.saleItems.length);
                console.log('Loaded payment modes:', self.paymentModes.length);
                
                self.render();
                self.initAnimations();
                self.bindEvents();
            }).fail(function(error) {
                console.error('Failed to load master data:', error);
                
                // Use demo data for development
                self.loadDemoData();
                self.render();
                self.initAnimations();
                self.bindEvents();
                
                TempleCore.showToast('Using demo data - API unavailable', 'warning');
            }).always(function() {
                TempleCore.showLoading(false);
            });
        },
        
        // Load demo data for development/testing
        loadDemoData: function() {
            // Demo Categories
            this.categories = [
                { id: 1, name_primary: 'Lamps', name_secondary: '灯', short_code: 'LAMP', order_no: 1 },
                { id: 2, name_primary: 'Archanai', name_secondary: '祈祷', short_code: 'ARCH', order_no: 2 },
                { id: 3, name_primary: 'Poojas', name_secondary: '法会', short_code: 'POOJA', order_no: 3 },
                { id: 4, name_primary: 'Vehicle', name_secondary: '车辆', short_code: 'VEH', order_no: 4 }
            ];
            
            // Demo Sessions
            this.sessions = [
                { id: 1, name: 'Morning', from_time: '07:00', to_time: '11:00' },
                { id: 2, name: 'Afternoon', from_time: '11:00', to_time: '16:00' },
                { id: 3, name: 'Evening', from_time: '16:00', to_time: '20:00' },
                { id: 4, name: 'Full Day', from_time: '07:00', to_time: '20:00' }
            ];
            
            // Demo Deities
            this.deities = [
                { id: 1, name: 'Chi Tian Da Sheng', name_secondary: '齐天大圣', deity_code: 'CTDS', image_url: null, order_no: 1 },
                { id: 2, name: 'Guan Yin Bodhisattva', name_secondary: '观音菩萨', deity_code: 'GYB', image_url: null, order_no: 2 },
                { id: 3, name: 'Vinayagar', name_secondary: '象头神', deity_code: 'VIN', image_url: null, order_no: 3 },
                { id: 4, name: 'Murugan', name_secondary: '穆鲁甘', deity_code: 'MUR', image_url: null, order_no: 4 }
            ];
            
            // Demo Payment Modes
            this.paymentModes = [
                { id: 1, name: 'Cash', icon_display_url_data: { type: 'bootstrap', value: 'bi-cash' } },
                { id: 2, name: 'Credit Card', icon_display_url_data: { type: 'bootstrap', value: 'bi-credit-card' } },
                { id: 3, name: 'QR Pay', icon_display_url_data: { type: 'bootstrap', value: 'bi-qr-code' } },
                { id: 4, name: 'Bank Transfer', icon_display_url_data: { type: 'bootstrap', value: 'bi-bank' } }
            ];
            
            // Demo Sale Items
            this.saleItems = [
                { id: 1, name_primary: 'Blessed String', name_secondary: '祝福之弦', short_code: 'BLS', sale_type: 'General', price: 5.00, effective_price: 5.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 2, name_primary: 'Candle (single)', name_secondary: '蜡烛（单支）', short_code: 'CND', sale_type: 'General', price: 3.00, effective_price: 3.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 3, name_primary: 'Flower Offering', name_secondary: '供花', short_code: 'FLO', sale_type: 'General', price: 20.00, effective_price: 20.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 4, name_primary: 'Fruit Offering Set', name_secondary: '水果供品套装', short_code: 'FRS', sale_type: 'General', price: 30.00, effective_price: 30.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 5, name_primary: 'Gold Paper', name_secondary: '金纸', short_code: 'GDP', sale_type: 'General', price: 15.00, effective_price: 15.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 6, name_primary: 'Incense Bundle', name_secondary: '香束', short_code: 'ICB', sale_type: 'General', price: 15.00, effective_price: 15.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 7, name_primary: 'Joss Sticks', name_secondary: '香', short_code: 'JST', sale_type: 'General', price: 5.00, effective_price: 5.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 8, name_primary: 'Lotus Lamp', name_secondary: '莲花灯', short_code: 'LTL', sale_type: 'General', price: 5.00, effective_price: 5.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}, {id: 2, name: 'Guan Yin Bodhisattva'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 9, name_primary: 'Oil Lamp', name_secondary: '油灯', short_code: 'OLP', sale_type: 'General', price: 5.00, effective_price: 5.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 10, name_primary: 'Prayer Offering Set', name_secondary: '祈祷祭品套装', short_code: 'POS', sale_type: 'General', price: 25.00, effective_price: 25.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 11, name_primary: 'Red String', name_secondary: '红绳', short_code: 'RDS', sale_type: 'General', price: 5.00, effective_price: 5.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 12, name_primary: 'Silver Paper', name_secondary: '银纸', short_code: 'SVP', sale_type: 'General', price: 10.00, effective_price: 10.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 13, name_primary: 'Small Amulet', name_secondary: '小护身符', short_code: 'SAM', sale_type: 'General', price: 15.00, effective_price: 15.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 14, name_primary: 'Tharpanam', name_secondary: 'தர்ப்பணம்', short_code: 'THP', sale_type: 'Token', price: 5.00, effective_price: 5.00, deities: [{id: 3, name: 'Vinayagar'}], categories: [{id: 2}], sessions: [{id: 1}], image_signed_url: null },
                { id: 15, name_primary: 'Tharpanam 1', name_secondary: 'தர்ப்பணம்', short_code: 'TH1', sale_type: 'Token', price: 10.00, effective_price: 10.00, deities: [{id: 3, name: 'Vinayagar'}], categories: [{id: 2}], sessions: [{id: 1}], image_signed_url: null },
                { id: 16, name_primary: 'Tharpanam 11', name_secondary: 'தர்ப்பணம்', short_code: 'T11', sale_type: 'General', price: 12.00, effective_price: 12.00, deities: [{id: 3, name: 'Vinayagar'}], categories: [{id: 2}], sessions: [{id: 4}], image_signed_url: null },
                { id: 20, name_primary: 'Fruit Archanai', name_secondary: 'பழ அர்ச்சனை', short_code: 'FRA', sale_type: 'Special', price: 3.00, effective_price: 3.00, deities: [{id: 3, name: 'Vinayagar'}, {id: 4, name: 'Murugan'}], categories: [{id: 2}], sessions: [{id: 1}, {id: 2}], image_signed_url: null },
                { id: 21, name_primary: 'Sesame Lamp', name_secondary: 'எள் விளக்கு', short_code: 'SSL', sale_type: 'General', price: 3.00, effective_price: 3.00, deities: [{id: 3, name: 'Vinayagar'}], categories: [{id: 1}], sessions: [{id: 4}], image_signed_url: null },
                { id: 22, name_primary: 'Tharpanam', name_secondary: 'தர்ப்பணம்', short_code: 'MTHP', sale_type: 'Token', price: 5.00, effective_price: 5.00, deities: [{id: 4, name: 'Murugan'}], categories: [{id: 2}], sessions: [{id: 1}], image_signed_url: null },
                { id: 25, name_primary: 'Car Blessing', name_secondary: '汽车祝福', short_code: 'CRB', sale_type: 'Vehicle', price: 30.00, effective_price: 30.00, deities: [{id: 1, name: 'Chi Tian Da Sheng'}], categories: [{id: 4}], sessions: [{id: 4}], image_signed_url: null },
                { id: 26, name_primary: 'Motorcycle Blessing', name_secondary: '摩托车祝福', short_code: 'MCB', sale_type: 'Vehicle', price: 20.00, effective_price: 20.00, deities: [{id: 3, name: 'Vinayagar'}], categories: [{id: 4}], sessions: [{id: 4}], image_signed_url: null }
            ];
        },
        
        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Restore sidebar when leaving page
            this.showSidebar();
            
            // Clear any GSAP tweens
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('.pos-sales-page *');
            }
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
            }
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
            }
            
            // Clear pending payment data
            this.pendingPaymentData = null;
            
            // Remove any payment message listeners (they are added with function reference, so this is general cleanup)
            // Note: Individual message handlers should remove themselves, but this ensures cleanup
            
            window.POSSalesSharedModule.unregisterPage(this.pageId);
        },
        
        // Utility functions
        formatCurrency: function(amount) {
            const currency = (typeof TempleCore !== 'undefined' && TempleCore.getCurrency) ? TempleCore.getCurrency() : 'RM';
            return currency + parseFloat(amount || 0).toFixed(2);
        },
        
        formatDate: function(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        
        formatDateTime: function(date) {
            const d = new Date(date);
            const dateStr = this.formatDate(d);
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${dateStr} ${hours}:${minutes}:${seconds}`;
        },
        
        formatDisplayDate: function(dateStr) {
            const d = new Date(dateStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        },
        
        getSaleTypeBadgeClass: function(saleType) {
            const classes = {
                'General': 'badge-general',
                'Vehicle': 'badge-vehicle',
                'Token': 'badge-token',
                'Special': 'badge-special'
            };
            return classes[saleType] || 'badge-general';
        },
        
        getFilteredItems: function() {
            let items = [...this.saleItems];
            
            if (this.selectedCategory !== 'all') {
                items = items.filter(item => {
                    if (!item.categories) return false;
                    return item.categories.some(cat => cat.id === parseInt(this.selectedCategory));
                });
            }
            
            if (this.selectedSession !== 'all') {
                items = items.filter(item => {
                    if (!item.sessions) return true;
                    return item.sessions.some(sess => sess.id === parseInt(this.selectedSession));
                });
            }
            
            return items;
        },
        
        groupItemsByDeity: function(items) {
            const groups = new Map();
            
            items.forEach(item => {
                const itemDeities = item.deities && item.deities.length > 0 
                    ? item.deities 
                    : [{ id: 0, name: 'General Items', name_secondary: '一般物品' }];
                
                itemDeities.forEach(deity => {
                    const deityId = deity.id || 0;
                    if (!groups.has(deityId)) {
                        groups.set(deityId, {
                            deity: this.deities.find(d => d.id === deityId) || deity,
                            items: []
                        });
                    }
                    groups.get(deityId).items.push(item);
                });
            });
            
            return Array.from(groups.values()).sort((a, b) => {
                if (a.deity.id === 0) return 1;
                if (b.deity.id === 0) return -1;
                return (a.deity.order_no || 0) - (b.deity.order_no || 0);
            });
        },
        
        generateCategoryTabsHTML: function() {
            let html = `<button class="pos-category-tab active" data-category="all"><span>All</span></button>`;
            this.categories.forEach(cat => {
                html += `<button class="pos-category-tab" data-category="${cat.id}"><span>${cat.name_primary}</span></button>`;
            });
            return html;
        },
        
        generateSessionOptionsHTML: function() {
            let html = `<option value="all">All Sessions</option>`;
            this.sessions.forEach(sess => {
                html += `<option value="${sess.id}">${sess.name}</option>`;
            });
            return html;
        },
        
        generatePaymentMethodsHTML: function() {
            if (!this.paymentModes || this.paymentModes.length === 0) {
                return `<div class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle me-2"></i>No payment methods available.</div>`;
            }
            return this.paymentModes.map((mode, index) => {
                const iconDisplay = mode.icon_display_url_data || { type: 'bootstrap', value: 'bi-currency-dollar' };
                const iconHtml = iconDisplay.type === 'bootstrap' 
                    ? `<i class="bi ${iconDisplay.value}"></i>`
                    : `<img src="${iconDisplay.value}" alt="${mode.name}" style="width: ${iconDisplay.width || 40}px; height: ${iconDisplay.height || 28}px; object-fit: contain;">`;
                return `
                    <div class="pos-payment-option">
                        <input class="form-check-input" type="radio" name="payment_method" id="payment${mode.id}" value="${mode.id}" ${index === 0 ? 'checked' : ''}>
                        <label class="form-check-label" for="payment${mode.id}">${iconHtml}<span>${mode.name}</span></label>
                    </div>`;
            }).join('');
        },
        
        getCartKey: function(itemId, deityId) {
            return `${itemId}_${deityId}`;
        },
        
        isItemInCart: function(itemId, deityId) {
            const cartKey = this.getCartKey(itemId, deityId);
            return this.cart.some(item => item.cartKey === cartKey);
        },
        
        generateItemCardHTML: function(item, deity) {
            const isInCart = this.isItemInCart(item.id, deity.id);
            const inCartClass = isInCart ? 'in-cart' : '';
            const badgeClass = this.getSaleTypeBadgeClass(item.sale_type);
            const deityName = deity.name || '';
            let imageHTML = '';
            if (item.image_signed_url) {
                imageHTML = `<img src="${item.image_signed_url}" alt="${item.name_primary}">`;
            } else {
                const icons = { 'General': 'bi-brightness-high', 'Vehicle': 'bi-car-front', 'Token': 'bi-ticket-perforated', 'Special': 'bi-star-fill' };
                const icon = icons[item.sale_type] || 'bi-box';
                imageHTML = `<i class="bi ${icon}"></i>`;
            }
            return `
                <div class="pos-item-card ${inCartClass}" data-item-id="${item.id}" data-deity-id="${deity.id}">
                    <div class="pos-item-badges"><span class="pos-item-badge ${badgeClass}">${item.sale_type}</span></div>
                    <div class="pos-item-image">${imageHTML}</div>
                    <div class="pos-item-deity">${deityName}</div>
                    <div class="pos-item-name">${item.name_primary}</div>
                    <div class="pos-item-name-secondary">${item.name_secondary || ''}</div>
                    <div class="pos-item-price">${this.formatCurrency(item.effective_price || item.price)}</div>
                </div>`;
        },
        
        generateItemsGridHTML: function() {
            const filteredItems = this.getFilteredItems();
            if (filteredItems.length === 0) {
                return `<div class="pos-no-items"><i class="bi bi-inbox"></i><h4>No items found</h4><p>Try changing the category or session filter</p></div>`;
            }
            const groupedItems = this.groupItemsByDeity(filteredItems);
            let html = '';
            groupedItems.forEach((group) => {
                const deity = group.deity;
                const deityImage = deity.image_url ? `<img src="${deity.image_url}" alt="${deity.name}">` : `<i class="bi bi-star"></i>`;
                html += `
                    <div class="pos-deity-section">
                        <div class="pos-deity-header">
                            <div class="pos-deity-icon">${deityImage}</div>
                            <div class="pos-deity-info">
                                <h3 class="pos-deity-name">${deity.name}</h3>
                                <p class="pos-deity-name-secondary">${deity.name_secondary || ''}</p>
                            </div>
                        </div>
                        <div class="pos-items-grid">${group.items.map(item => this.generateItemCardHTML(item, deity)).join('')}</div>
                    </div>`;
            });
            return html;
        },
        
        generateCartItemsHTML: function() {
            if (this.cart.length === 0) {
                return `<div class="pos-cart-empty"><i class="bi bi-cart3"></i><span>No Data Available</span></div>`;
            }
            let html = `<table class="pos-cart-table"><thead><tr><th>Item</th><th>Action</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>`;
            this.cart.forEach((cartItem, index) => {
                const itemTotal = cartItem.quantity * cartItem.price;
                const isVehicle = cartItem.sale_type === 'Vehicle';
                const vehicleCount = cartItem.vehicles ? cartItem.vehicles.length : 0;
                const hasAllVehicles = vehicleCount >= cartItem.quantity;
                html += `
                    <tr data-cart-index="${index}">
                        <td>
                            <div class="pos-cart-item-name">${cartItem.name_primary}</div>
                            <div class="pos-cart-item-deity">${cartItem.deity_name || ''}</div>
                            ${cartItem.name_secondary ? `<div class="pos-cart-item-secondary">${cartItem.name_secondary}</div>` : ''}
                        </td>
                        <td>
                            <div class="pos-cart-item-action">
                                ${isVehicle ? `<button class="btn-vehicle ${hasAllVehicles ? 'has-vehicle' : ''}" data-cart-index="${index}" title="Add Vehicle Details (${vehicleCount}/${cartItem.quantity})"><i class="bi bi-car-front"></i></button>` : ''}
                                <button class="btn-remove" data-cart-index="${index}" title="Remove Item"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                        <td>
                            <div class="pos-qty-control">
                                <button class="pos-qty-btn" data-action="decrease" data-cart-index="${index}">-</button>
                                <span class="pos-qty-value">${cartItem.quantity}</span>
                                <button class="pos-qty-btn" data-action="increase" data-cart-index="${index}">+</button>
                            </div>
                        </td>
                        <td>${this.formatCurrency(cartItem.price)}</td>
                        <td><strong>${this.formatCurrency(itemTotal)}</strong></td>
                    </tr>`;
            });
            html += `</tbody></table>`;
            return html;
        },
        
        calculateTotals: function() {
            const subtotal = this.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const totalQty = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            const discount = parseFloat($('#discountAmount').val()) || 0;
            const deposit = parseFloat($('#depositAmount').val()) || 0;
            const total = Math.max(0, subtotal - discount);
            const balanceDue = Math.max(0, total - deposit);
            return { totalQty, subtotal, discount, total, deposit, balanceDue };
        },
        
        generateCartSummaryHTML: function() {
            const totals = this.calculateTotals();
            return `
                <div class="pos-cart-summary-row"><span class="pos-cart-summary-label">Total QTY:</span><span class="pos-cart-summary-value">${totals.totalQty}</span></div>
                <div class="pos-cart-summary-row"><span class="pos-cart-summary-label">Sub Total:</span><span class="pos-cart-summary-value">${this.formatCurrency(totals.subtotal)}</span></div>
                <div class="pos-cart-summary-row"><span class="pos-cart-summary-label">Discount:</span><span class="pos-cart-summary-value text-success">${this.formatCurrency(totals.discount)}</span></div>
                <div class="pos-cart-summary-row total"><span class="pos-cart-summary-label">Total:</span><span class="pos-cart-summary-value">${this.formatCurrency(totals.total)}</span></div>
                <div class="pos-cart-summary-row"><span class="pos-cart-summary-label">Deposit:</span><span class="pos-cart-summary-value text-primary">${this.formatCurrency(totals.deposit)}</span></div>
                <div class="pos-cart-summary-row"><span class="pos-cart-summary-label">Balance Due:</span><span class="pos-cart-summary-value text-primary">${this.formatCurrency(totals.balanceDue)}</span></div>`;
        },
        
        generateDevoteeModalHTML: function() {
            return `
                <div class="modal fade" id="devoteeModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="bi bi-person-plus me-2"></i>Devotee Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">NAME</label>
                                        <input type="text" class="form-control" id="devoteeName" placeholder="Enter name" value="${this.devoteeDetails.name}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">EMAIL ADDRESS</label>
                                        <input type="email" class="form-control" id="devoteeEmail" placeholder="Enter email" value="${this.devoteeDetails.email}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">IC NO / PASSPORT NO</label>
                                        <input type="text" class="form-control" id="devoteeNric" placeholder="Enter IC / Passport No" value="${this.devoteeDetails.nric}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">MOBILE NO</label>
                                        <div class="input-group">
                                            <select class="form-select" id="devoteePhoneCode" style="max-width: 100px;">
                                                <option value="+60" ${this.devoteeDetails.phone_code === '+60' ? 'selected' : ''}>+60</option>
                                                <option value="+65" ${this.devoteeDetails.phone_code === '+65' ? 'selected' : ''}>+65</option>
                                                <option value="+91" ${this.devoteeDetails.phone_code === '+91' ? 'selected' : ''}>+91</option>
                                                <option value="+62" ${this.devoteeDetails.phone_code === '+62' ? 'selected' : ''}>+62</option>
                                                <option value="+66" ${this.devoteeDetails.phone_code === '+66' ? 'selected' : ''}>+66</option>
                                                <option value="+1" ${this.devoteeDetails.phone_code === '+1' ? 'selected' : ''}>+1</option>
                                                <option value="+44" ${this.devoteeDetails.phone_code === '+44' ? 'selected' : ''}>+44</option>
                                                <option value="+86" ${this.devoteeDetails.phone_code === '+86' ? 'selected' : ''}>+86</option>
                                            </select>
                                            <input type="text" class="form-control" id="devoteePhone" placeholder="Enter mobile number" value="${this.devoteeDetails.phone}">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">DOB</label>
                                        <input type="date" class="form-control" id="devoteeDob" value="${this.devoteeDetails.dob}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">ADDRESS</label>
                                        <textarea class="form-control" id="devoteeAddress" rows="2" placeholder="Enter address">${this.devoteeDetails.address}</textarea>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">REMARKS</label>
                                        <textarea class="form-control" id="devoteeRemarks" rows="2" placeholder="Enter remarks">${this.devoteeDetails.remarks}</textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnSaveDevotee"><i class="bi bi-check-circle me-2"></i>Submit</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        },
        
        render: function() {
            const today = this.formatDate(new Date());
            const html = `
                <div class="pos-sales-page">
                    <div class="pos-header">
                        <div class="pos-header-content">
                            <div class="pos-header-left">
                                <button class="pos-sidebar-toggle" id="btnSidebarToggle" title="Toggle Sidebar">
                                    <i class="bi bi-list"></i>
                                </button>
                                <h1 class="pos-title"><i class="bi bi-shop"></i> POS Sales Order</h1>
                            </div>
                            <div class="pos-header-actions">
                                <input type="date" class="pos-date-input" id="bookingDate" value="${today}">
                                <button class="btn-reprint" id="btnReprint"><i class="bi bi-printer"></i> Reprint</button>
                                <button class="btn-add-detail" id="btnAddDetail"><i class="bi bi-person-plus"></i> Add Detail</button>
                                <button class="btn-clear-all" id="btnClearAll"><i class="bi bi-x-circle"></i> Clear All</button>
                                <select class="pos-session-select" id="sessionFilter">${this.generateSessionOptionsHTML()}</select>
                            </div>
                        </div>
                    </div>
                    <div class="pos-main-container">
                        <div class="pos-items-section" id="itemsScrollContainer">
                            <div class="pos-category-tabs">${this.generateCategoryTabsHTML()}</div>
                            <div id="itemsContainer">${this.generateItemsGridHTML()}</div>
                        </div>
                        <div class="pos-cart-section" id="cartSection">
                            <div class="pos-cart-header">
                                <h2 class="pos-cart-title">Cart Details</h2>
                                <button class="pos-cart-clear" id="btnClearCart"><i class="bi bi-trash"></i> Clear</button>
                            </div>
                            <div class="pos-cart-items" id="cartItems">${this.generateCartItemsHTML()}</div>
                            <div class="pos-cart-footer">
                                <div class="pos-amount-fields">
                                    <div class="pos-amount-field">
                                        <label>Discount Amount</label>
                                        <input type="number" id="discountAmount" placeholder="0.00" min="0" step="0.01">
                                    </div>
                                    <div class="pos-amount-field d-none">
                                        <label>Deposit Amount</label>
                                        <input type="number" id="depositAmount" placeholder="0.00" min="0" step="0.01">
                                        <small class="text-muted">Minimum: RM10.00</small>
                                    </div>
                                </div>
                                <div class="pos-payment-methods">
                                    <label class="pos-payment-label">Payment Method</label>
                                    <div class="pos-payment-options" id="paymentMethods">${this.generatePaymentMethodsHTML()}</div>
                                </div>
                                <div class="pos-print-options">
                                    <button class="pos-print-btn active" data-print="single"><i class="bi bi-printer"></i> Single Print</button>
                                    <button class="pos-print-btn" data-print="separate"><i class="bi bi-files"></i> Separate</button>
                                    <button class="pos-print-btn" data-print="none"><i class="bi bi-x-circle"></i> No Print</button>
                                </div>
                                <div class="pos-cart-summary" id="cartSummary">${this.generateCartSummaryHTML()}</div>
                                <button class="pos-proceed-btn" id="btnProceed" disabled><i class="bi bi-check-circle"></i> Proceed Booking</button>
                            </div>
                        </div>
                    </div>
                    <div class="pos-floating-cart" id="floatingCart" style="display: none;">
                        <button id="btnFloatingCart"><i class="bi bi-cart3"></i><span class="cart-badge" id="cartBadge">0</span></button>
                    </div>
                    <div class="pos-cart-overlay" id="cartOverlay"></div>
                </div>
                <div class="modal fade pos-vehicle-modal" id="vehicleModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="bi bi-car-front me-2"></i> Vehicle Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body"><div id="vehicleModalContent"></div></div>
                        </div>
                    </div>
                </div>
                ${this.generateDevoteeModalHTML()}`;
            $('#page-container').html(html);
            if (this.paymentModes.length > 0) { this.selectedPaymentMode = this.paymentModes[0].id; }
        },
        
        initAnimations: function() {
            // Set sidebar toggle icon to show "expand" state since sidebar is hidden
            $('#btnSidebarToggle i').removeClass('bi-list').addClass('bi-arrow-bar-right');
            
            // Use GSAP only - no AOS dependency
            gsap.set('.pos-header, .pos-category-tab, .pos-deity-section, .pos-item-card, .pos-cart-section', { opacity: 1 });
            
            gsap.fromTo('.pos-header', { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'all' });
            gsap.fromTo('.pos-category-tab', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2, clearProps: 'all' });
            gsap.fromTo('.pos-deity-section', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.3, clearProps: 'all' });
            gsap.fromTo('.pos-item-card', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, ease: 'back.out(1.2)', delay: 0.4, clearProps: 'all' });
            gsap.fromTo('.pos-cart-section', { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', delay: 0.3, clearProps: 'all' });
        },
        
        bindEvents: function() {
            const self = this;
            const ns = this.eventNamespace;
            
            $(document).on(`click.${ns}`, '.pos-category-tab', function() {
                const category = $(this).data('category');
                self.selectedCategory = category;
                $('.pos-category-tab').removeClass('active');
                $(this).addClass('active');
                self.refreshItems();
            });
            
            $(document).on(`change.${ns}`, '#sessionFilter', function() {
                self.selectedSession = $(this).val();
                self.refreshItems();
            });
            
            $(document).on(`click.${ns}`, '.pos-item-card', function() {
                const itemId = $(this).data('item-id');
                const deityId = $(this).data('deity-id');
                self.addToCart(itemId, deityId);
            });
            
            $(document).on(`click.${ns}`, '.pos-qty-btn', function() {
                const action = $(this).data('action');
                const index = $(this).data('cart-index');
                if (action === 'increase') { self.updateQuantity(index, 1); } else { self.updateQuantity(index, -1); }
            });
            
            $(document).on(`click.${ns}`, '.btn-remove', function() { self.removeFromCart($(this).data('cart-index')); });
            
            $(document).on(`click.${ns}`, '#btnClearCart', function() {
                if (self.cart.length > 0 && confirm('Are you sure you want to clear the cart?')) { self.clearCart(); }
            });
            
            $(document).on(`click.${ns}`, '#btnClearAll', function() {
                if (confirm('Are you sure you want to clear all data including cart and devotee details?')) { 
                    self.clearCart();
                    self.resetDevoteeDetails();
                    $('#discountAmount').val('');
                    $('#depositAmount').val('');
                    TempleCore.showToast('All data cleared', 'info');
                }
            });
            
            $(document).on(`click.${ns}`, '.btn-vehicle', function() { self.openVehicleModal($(this).data('cart-index')); });
            
            $(document).on(`change.${ns}`, 'input[name="payment_method"]', function() { self.selectedPaymentMode = $(this).val(); });
            
            $(document).on(`click.${ns}`, '.pos-print-btn', function() {
                self.printOption = $(this).data('print');
                $('.pos-print-btn').removeClass('active');
                $(this).addClass('active');
            });
            
            $(document).on(`input.${ns}`, '#discountAmount, #depositAmount', function() { self.updateCartSummary(); });
            $(document).on(`click.${ns}`, '#btnProceed', function() { self.proceedBooking(); });
            $(document).on(`click.${ns}`, '#btnReprint', function() { self.openReprintModal(); });
            
            // Add Detail button
            $(document).on(`click.${ns}`, '#btnAddDetail', function() { self.openDevoteeModal(); });
            $(document).on(`click.${ns}`, '#btnSaveDevotee', function() { self.saveDevoteeDetails(); });
            
            // Sidebar toggle
            $(document).on(`click.${ns}`, '#btnSidebarToggle', function() { self.toggleSidebar(); });
            
            $(document).on(`click.${ns}`, '#btnFloatingCart', function() { $('#cartSection').addClass('show'); $('#cartOverlay').addClass('show'); });
            $(document).on(`click.${ns}`, '#cartOverlay', function() { $('#cartSection').removeClass('show'); $('#cartOverlay').removeClass('show'); });
            
            $(document).on(`click.${ns}`, '.pos-vehicle-tab', function() {
                const vehicleIndex = $(this).data('vehicle-index');
                $('.pos-vehicle-tab').removeClass('active');
                $(this).addClass('active');
                $('.pos-vehicle-form').removeClass('active');
                $(`.pos-vehicle-form[data-vehicle-index="${vehicleIndex}"]`).addClass('active');
            });
            
            $(document).on(`click.${ns}`, '.pos-vehicle-save-btn', function() { self.saveVehicleDetails(); });
        },
        
        refreshItems: function() {
            const itemsHTML = this.generateItemsGridHTML();
            $('#itemsContainer').html(itemsHTML);
            
            // Ensure visibility then animate
            gsap.set('.pos-deity-section, .pos-item-card', { opacity: 1 });
            gsap.fromTo('.pos-deity-section', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
            gsap.fromTo('.pos-item-card', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.02, ease: 'power2.out', delay: 0.1, clearProps: 'all' });
        },
        
        addToCart: function(itemId, deityId) {
            const item = this.saleItems.find(i => i.id === itemId);
            if (!item) return;
            
            const deity = this.deities.find(d => d.id === deityId) || (item.deities && item.deities.find(d => d.id === deityId)) || { id: deityId, name: '', name_secondary: '' };
            const cartKey = this.getCartKey(itemId, deityId);
            const existingIndex = this.cart.findIndex(i => i.cartKey === cartKey);
            
            if (existingIndex >= 0) {
                this.cart[existingIndex].quantity += 1;
            } else {
                this.cart.push({
                    cartKey: cartKey, id: item.id, deity_id: deityId, deity_name: deity.name, deity_name_secondary: deity.name_secondary || '',
                    name_primary: item.name_primary, name_secondary: item.name_secondary, short_code: item.short_code, sale_type: item.sale_type,
                    price: parseFloat(item.effective_price || item.price), quantity: 1, vehicles: item.sale_type === 'Vehicle' ? [] : null
                });
            }
            
            const $card = $(`.pos-item-card[data-item-id="${itemId}"][data-deity-id="${deityId}"]`);
            gsap.fromTo($card, { scale: 1 }, { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.inOut' });
            
            this.updateCartDisplay();
            this.updateItemCards();
            TempleCore.showToast(`${item.name_primary} added to cart`, 'success');
        },
        
        updateQuantity: function(index, change) {
            if (index < 0 || index >= this.cart.length) return;
            const newQty = this.cart[index].quantity + change;
            if (newQty <= 0) { this.removeFromCart(index); }
            else {
                this.cart[index].quantity = newQty;
                if (this.cart[index].sale_type === 'Vehicle' && this.cart[index].vehicles) {
                    while (this.cart[index].vehicles.length > newQty) { this.cart[index].vehicles.pop(); }
                }
                this.updateCartDisplay();
            }
        },
        
        removeFromCart: function(index) {
            if (index < 0 || index >= this.cart.length) return;
            const item = this.cart[index];
            this.cart.splice(index, 1);
            this.updateCartDisplay();
            this.updateItemCards();
            TempleCore.showToast(`${item.name_primary} removed from cart`, 'info');
        },
        
        clearCart: function() {
            this.cart = [];
            this.updateCartDisplay();
            this.updateItemCards();
            TempleCore.showToast('Cart cleared', 'info');
        },
        
        updateCartDisplay: function() {
            $('#cartItems').html(this.generateCartItemsHTML());
            this.updateCartSummary();
            const totalQty = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            $('#cartBadge').text(totalQty);
            $('#btnProceed').prop('disabled', this.cart.length === 0);
            gsap.fromTo('#cartItems tr', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'all' });
        },
        
        updateCartSummary: function() { $('#cartSummary').html(this.generateCartSummaryHTML()); },
        
        updateItemCards: function() {
            const self = this;
            $('.pos-item-card').each(function() {
                const itemId = $(this).data('item-id');
                const deityId = $(this).data('deity-id');
                if (self.isItemInCart(itemId, deityId)) { $(this).addClass('in-cart'); } else { $(this).removeClass('in-cart'); }
            });
        },
        
        openVehicleModal: function(cartIndex) {
            const cartItem = this.cart[cartIndex];
            if (!cartItem || cartItem.sale_type !== 'Vehicle') return;
            this.currentVehicleCartIndex = cartIndex;
            
            let tabsHTML = '', formsHTML = '';
            for (let i = 0; i < cartItem.quantity; i++) {
                const isActive = i === 0 ? 'active' : '';
                const vehicle = cartItem.vehicles && cartItem.vehicles[i] ? cartItem.vehicles[i] : null;
                tabsHTML += `<button class="pos-vehicle-tab ${isActive}" data-vehicle-index="${i}">Vehicle ${i + 1}${vehicle ? '<i class="bi bi-check-circle-fill text-success ms-1"></i>' : ''}</button>`;
                formsHTML += `
                    <div class="pos-vehicle-form ${isActive}" data-vehicle-index="${i}">
                        <div class="form-group"><label>Vehicle Number <span class="text-danger">*</span></label><input type="text" class="vehicle-number" placeholder="e.g., ABC 1234" value="${vehicle?.number || ''}"></div>
                        <div class="form-group"><label>Vehicle Type</label><input type="text" class="vehicle-type" placeholder="e.g., Car, Motorcycle, Lorry" value="${vehicle?.type || ''}"></div>
                        <div class="form-group"><label>Owner Name</label><input type="text" class="vehicle-owner" placeholder="Enter owner name" value="${vehicle?.owner || ''}"></div>
                    </div>`;
            }
            
            $('#vehicleModalContent').html(`<div class="pos-vehicle-tabs">${tabsHTML}</div>${formsHTML}<button class="pos-vehicle-save-btn mt-3"><i class="bi bi-check-circle me-2"></i>Save Vehicle Details</button>`);
            new bootstrap.Modal(document.getElementById('vehicleModal')).show();
        },
        
        saveVehicleDetails: function() {
            const cartIndex = this.currentVehicleCartIndex;
            if (cartIndex === null || !this.cart[cartIndex]) return;
            
            const vehicles = [];
            $('.pos-vehicle-form').each(function() {
                const number = $(this).find('.vehicle-number').val().trim();
                const type = $(this).find('.vehicle-type').val().trim();
                const owner = $(this).find('.vehicle-owner').val().trim();
                if (number) { vehicles.push({ number, type: type || '', owner: owner || '' }); }
            });
            
            if (vehicles.length === 0) { TempleCore.showToast('Please enter at least one vehicle number', 'warning'); return; }
            
            this.cart[cartIndex].vehicles = vehicles;
            bootstrap.Modal.getInstance(document.getElementById('vehicleModal')).hide();
            this.updateCartDisplay();
            TempleCore.showToast(`${vehicles.length} vehicle(s) saved`, 'success');
        },
        
        // Devotee details methods
        openDevoteeModal: function() {
            // Update modal HTML with current values
            $('#devoteeName').val(this.devoteeDetails.name);
            $('#devoteeEmail').val(this.devoteeDetails.email);
            $('#devoteeNric').val(this.devoteeDetails.nric);
            $('#devoteePhoneCode').val(this.devoteeDetails.phone_code);
            $('#devoteePhone').val(this.devoteeDetails.phone);
            $('#devoteeDob').val(this.devoteeDetails.dob);
            $('#devoteeAddress').val(this.devoteeDetails.address);
            $('#devoteeRemarks').val(this.devoteeDetails.remarks);
            
            new bootstrap.Modal(document.getElementById('devoteeModal')).show();
        },
        
        saveDevoteeDetails: function() {
            this.devoteeDetails = {
                name: $('#devoteeName').val().trim(),
                email: $('#devoteeEmail').val().trim(),
                nric: $('#devoteeNric').val().trim(),
                phone_code: $('#devoteePhoneCode').val(),
                phone: $('#devoteePhone').val().trim(),
                dob: $('#devoteeDob').val(),
                address: $('#devoteeAddress').val().trim(),
                remarks: $('#devoteeRemarks').val().trim()
            };
            
            bootstrap.Modal.getInstance(document.getElementById('devoteeModal')).hide();
            TempleCore.showToast('Devotee details saved', 'success');
            
            // Update the Add Detail button to show it has data
            if (this.hasDevoteeData()) {
                $('#btnAddDetail').addClass('has-data').html('<i class="bi bi-person-check"></i> Edit Detail');
            } else {
                $('#btnAddDetail').removeClass('has-data').html('<i class="bi bi-person-plus"></i> Add Detail');
            }
        },
        
        resetDevoteeDetails: function() {
            this.devoteeDetails = {
                name: '',
                email: '',
                nric: '',
                phone_code: '+60',
                phone: '',
                dob: '',
                address: '',
                remarks: ''
            };
            $('#btnAddDetail').removeClass('has-data').html('<i class="bi bi-person-plus"></i> Add Detail');
        },
        
        hasDevoteeData: function() {
            return this.devoteeDetails.name || this.devoteeDetails.email || 
                   this.devoteeDetails.nric || this.devoteeDetails.phone || 
                   this.devoteeDetails.dob || this.devoteeDetails.address || 
                   this.devoteeDetails.remarks;
        },
        
        getPrintOptionValue: function() {
            const printMap = {
                'single': 'SINGLE_PRINT',
                'separate': 'SEP_PRINT',
                'none': 'NO_PRINT'
            };
            return printMap[this.printOption] || 'SINGLE_PRINT';
        },
        
        getPaymentModeName: function() {
            const mode = this.paymentModes.find(m => m.id === parseInt(this.selectedPaymentMode));
            return mode ? mode.name : 'Cash';
        },
        
        proceedBooking: function() {
            const self = this;
            
            if (this.cart.length === 0) { 
                TempleCore.showToast('Please add items to cart', 'warning'); 
                return; 
            }
            
            // Validate vehicle items
            const vehicleItems = this.cart.filter(item => item.sale_type === 'Vehicle');
            for (const item of vehicleItems) {
                if (!item.vehicles || item.vehicles.length < item.quantity) {
                    TempleCore.showToast(`Please add vehicle details for "${item.name_primary}"`, 'warning');
                    return;
                }
            }
            
            if (!this.selectedPaymentMode) { 
                TempleCore.showToast('Please select a payment method', 'warning'); 
                return; 
            }
            
            if (this.isProcessing) {
                TempleCore.showToast('Order is being processed, please wait...', 'info');
                return;
            }
            
            const bookingDate = $('#bookingDate').val() || this.formatDate(new Date());
            const totals = this.calculateTotals();
            
            // Prepare order data
            const orderData = {
                booking_date: bookingDate,
                subtotal: totals.subtotal,
                discount_amount: totals.discount,
                deposit_amount: totals.deposit,
                total_amount: totals.total,
                paid_amount: totals.total, // For now, full payment
                print_option: this.getPrintOptionValue(),
                special_instructions: '',
                items: this.cart.map(item => ({
                    id: item.id,
                    deity_id: item.deity_id,
                    deity_name: item.deity_name,
                    name_primary: item.name_primary,
                    name_secondary: item.name_secondary || '',
                    short_code: item.short_code || '',
                    sale_type: item.sale_type,
                    price: item.price,
                    quantity: item.quantity,
                    total: item.price * item.quantity,
                    vehicles: item.vehicles
                })),
                devotee: this.hasDevoteeData() ? this.devoteeDetails : null,
                payment: {
                    amount: totals.total,
                    payment_mode_id: parseInt(this.selectedPaymentMode)
                }
            };
            
            console.log('Order Data:', orderData);
            
            // Confirm before saving
            const confirmMsg = `Confirm Order:\n\n` +
                `Items: ${this.cart.length}\n` +
                `Total Qty: ${totals.totalQty}\n` +
                `Total: ${this.formatCurrency(totals.total)}\n` +
                `Print Option: ${this.printOption.toUpperCase()}\n\n` +
                `Proceed with booking?`;
            
            if (!confirm(confirmMsg)) {
                return;
            }
            
            // Show loading
            this.isProcessing = true;
            $('#btnProceed').prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            TempleCore.showLoading(true);
            
            // Send to API
            TempleAPI.post('/pos-sales/orders', orderData)
                .done(function(response) {
                    if (response.success) {
						if(response.data.payment_status == 'PENDING'){
							// Payment gateway - open payment URL in popup
							TempleCore.showToast('Order created! Opening payment gateway...', 'success');
							self.openPaymentPopup(response.data, orderData, totals);
						}else{
							// Direct payment success
							TempleCore.showToast('Order saved successfully!', 'success');
							
							// Handle print option
							self.handlePrintOption(response.data, orderData, totals);
						}
                        
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save order', 'error');
                    }
                })
                .fail(function(xhr) {
                    console.error('Order save failed:', xhr);
                    const errorMsg = xhr.responseJSON?.message || 'Failed to save order. Please try again.';
                    TempleCore.showToast(errorMsg, 'error');
                    
                    // For demo mode, simulate success
                    if (xhr.status === 0 || xhr.status === 404) {
                        self.simulateOrderSuccess(orderData, totals);
                    }
                })
                .always(function() {
                    self.isProcessing = false;
                    $('#btnProceed').prop('disabled', self.cart.length === 0).html('<i class="bi bi-check-circle"></i> Proceed Booking');
                    TempleCore.showLoading(false);
                });
        },
        
        // Simulate order success for demo mode
        simulateOrderSuccess: function(orderData, totals) {
            const self = this;
            const fakeBookingNumber = 'SLBD' + this.formatDate(new Date()).replace(/-/g, '') + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
            const fakePaymentRef = 'PYD' + this.formatDate(new Date()).replace(/-/g, '') + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
            
            TempleCore.showToast('Demo: Order simulated successfully!', 'success');
            
            const fakeBooking = {
                booking_number: fakeBookingNumber,
                booking_date: orderData.booking_date,
                total_amount: totals.total,
                paid_amount: totals.total,
                payment_status: 'FULL',
                booking_status: 'CONFIRMED',
                items: orderData.items,
                payment: {
                    payment_reference: fakePaymentRef
                }
            };
            
            this.handlePrintOption(fakeBooking, orderData, totals);
        },
        
        // Open payment gateway popup and monitor status
        openPaymentPopup: function(bookingData, orderData, totals) {
            const self = this;
            
            if (!bookingData.payment_url) {
                TempleCore.showToast('Payment URL not available', 'error');
                this.handlePaymentFailure();
                return;
            }
            
            // Store booking data for later use
            this.pendingPaymentData = {
                booking: bookingData,
                orderData: orderData,
                totals: totals
            };
            
            // Open payment gateway in popup window
            const popupWidth = 600;
            const popupHeight = 700;
            const left = (screen.width - popupWidth) / 2;
            const top = (screen.height - popupHeight) / 2;
            
            const popupFeatures = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},` +
                                 `scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no`;
            
            const paymentWindow = window.open(bookingData.payment_url, 'PaymentGateway', popupFeatures);
            
            if (!paymentWindow) {
                TempleCore.showToast('Please allow popups for payment processing', 'error');
                this.handlePaymentFailure();
                return;
            }
            
            // Show loading overlay
            TempleCore.showLoading(true);
            
            // Monitor payment popup
            this.monitorPaymentStatus(paymentWindow, bookingData.booking_id);
        },
        
        // Monitor payment status via popup window and message listener
        monitorPaymentStatus: function(paymentWindow, bookingId) {
            const self = this;
            let checkInterval = null;
            let messageReceived = false;
            
            // Listen for postMessage from payment callback page
            const messageHandler = function(event) {
                // Verify message origin for security (adjust domain as needed)
                // if (event.origin !== window.location.origin) return;
                
                if (event.data && event.data.type === 'PAYMENT_CALLBACK') {
                    messageReceived = true;
                    
                    // Clear interval
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                    }
                    
                    // Remove event listener
                    window.removeEventListener('message', messageHandler);
                    
                    // Close payment window
                    if (paymentWindow && !paymentWindow.closed) {
                        paymentWindow.close();
                    }
                    
                    // Handle payment result
                    if (event.data.status === 'success' || event.data.status === 'SUCCESS') {
                        self.handlePaymentSuccess(event.data);
                    } else {
                        self.handlePaymentFailure(event.data);
                    }
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Fallback: Poll to check if popup is closed
            checkInterval = setInterval(function() {
                if (paymentWindow.closed) {
                    clearInterval(checkInterval);
                    window.removeEventListener('message', messageHandler);
                    
                    if (!messageReceived) {
                        // Popup closed without message - check payment status via API
                        TempleCore.showToast('Payment window closed. Checking payment status...', 'info');
                        self.checkPaymentStatusViaAPI(bookingId);
                    }
                }
            }, 500);
            
            // Timeout after 15 minutes (900000ms)
            setTimeout(function() {
                if (checkInterval) {
                    clearInterval(checkInterval);
                    window.removeEventListener('message', messageHandler);
                    
                    if (paymentWindow && !paymentWindow.closed) {
                        paymentWindow.close();
                    }
                    
                    if (!messageReceived) {
                        TempleCore.showToast('Payment timeout. Please check payment status manually.', 'warning');
                        self.handlePaymentFailure({ message: 'Payment timeout' });
                    }
                }
            }, 900000);
        },
        
        // Check payment status via API (fallback method)
        checkPaymentStatusViaAPI: function(bookingId) {
            const self = this;
            
            TempleAPI.get(`/pos-sales/orders/${bookingId}/payment-status`)
                .done(function(response) {
                    if (response.success) {
                        if (response.data.payment_status === 'SUCCESS' || response.data.payment_status === 'PAID' || response.data.booking_status == 'CONFIRMED') {
                            self.handlePaymentSuccess(response.data);
                        } else if (response.data.payment_status === 'FAILED' || response.data.payment_status === 'CANCELLED') {
                            self.handlePaymentFailure(response.data);
                        } else {
                            // Still pending
                            TempleCore.showToast('Payment is still pending. Please check later.', 'warning');
                            TempleCore.showLoading(false);
                            self.clearCart();
                            self.resetDevoteeDetails();
                        }
                    } else {
                        self.handlePaymentFailure({ message: 'Unable to verify payment status' });
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Unable to verify payment status. Please check manually.', 'error');
                    TempleCore.showLoading(false);
                });
        },
        
        // Handle successful payment
        handlePaymentSuccess: function(paymentData) {
            TempleCore.showLoading(false);
            TempleCore.showToast('Payment completed successfully!', 'success');
            
            if (this.pendingPaymentData) {
                // Update booking data with payment info
                const booking = this.pendingPaymentData.booking;
                booking.payment_status = 'SUCCESS';
                booking.payment = paymentData.payment || {};
                
                // Call print option handler
                this.handlePrintOption(
                    booking,
                    this.pendingPaymentData.orderData,
                    this.pendingPaymentData.totals
                );
                
                // Clear pending data
                this.pendingPaymentData = null;
            } else {
                // No pending data - just clear cart
                this.clearCart();
                this.resetDevoteeDetails();
                $('#discountAmount').val('');
                $('#depositAmount').val('');
            }
        },
        
        // Handle failed payment
        handlePaymentFailure: function(paymentData) {
            TempleCore.showLoading(false);
            
            const errorMessage = paymentData?.message || 'Payment was cancelled or failed';
            TempleCore.showToast(errorMessage, 'error');
            
            // Clear cart and reset form
            this.clearCart();
            this.resetDevoteeDetails();
            $('#discountAmount').val('');
            $('#depositAmount').val('');
            
            // Clear pending data
            this.pendingPaymentData = null;
            
            // Show error details if available
            if (paymentData?.booking_number) {
                alert(`Payment Failed\n\n` +
                    `Booking Number: ${paymentData.booking_number}\n` +
                    `Status: PAYMENT FAILED\n\n` +
                    `Please try again or contact support if the amount was deducted.`);
            }
        },
        
        // Handle print option after successful order
        handlePrintOption: function(booking, orderData, totals) {
            const self = this;
            
            if (this.printOption === 'none') {
                // No print - just show success and reset
                alert(`Order Created Successfully!\n\n` +
                    `Booking Number: ${booking.booking_number}\n` +
                    `Total Amount: ${this.formatCurrency(booking.total_amount || totals.total)}\n` +
                    `Payment Reference: ${booking.payment?.payment_reference || 'N/A'}\n\n` +
                    `Status: ${booking.booking_status || 'CONFIRMED'}`);
                
                // Clear cart and reset form
                this.clearCart();
                this.resetDevoteeDetails();
                $('#discountAmount').val('');
                $('#depositAmount').val('');
            } else {
                // Single or Separate print - open print page
                this.openPrintPage(booking, orderData, totals);
            }
        },
        
        // Open print page in new window
        openPrintPage: function(booking, orderData, totals) {
            const self = this;
            
            // Prepare print data
            const printData = {
                booking_number: booking.booking_number,
                booking_date: orderData.booking_date,
                items: orderData.items,
                devotee: orderData.devotee,
                totals: totals,
                payment_method: this.getPaymentModeName(),
                payment_reference: booking.payment?.payment_reference || '',
                print_type: this.printOption // 'single' or 'separate'
            };
            
            // Store print data in sessionStorage for the print page
            sessionStorage.setItem('pos_sales_print_data', JSON.stringify(printData));
            
            // Build the print page URL
            const printUrl = TempleCore.buildTempleUrl(`/pos-sales/print?id=${encodeURIComponent(booking.id)}&type=${this.printOption}`);
            // Open print page in new window/popup
            const printWindow = window.open(printUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
            
            if (!printWindow) {
                // Popup blocked - try alternative method
                TempleCore.showToast('Please allow popups to print receipt. Trying alternative method...', 'warning');
                
                // Alternative: Navigate using router if available
                if (typeof TempleRouter !== 'undefined') {
                    TempleRouter.navigate('pos-sales/print', { 
                        id: booking.booking_number,
                        type: this.printOption 
                    });
                }
            }
            
            // Clear cart and reset form after opening print
            this.clearCart();
            this.resetDevoteeDetails();
            $('#discountAmount').val('');
            $('#depositAmount').val('');
        },
        
        // Open reprint modal
        openReprintModal: function() {
            const self = this;
            
            // Create reprint modal HTML
            const modalHtml = `
                <div class="modal fade" id="reprintModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="bi bi-printer me-2"></i>Reprint Receipt</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Booking Number</label>
                                    <input type="text" class="form-control" id="reprintBookingNumber" placeholder="Enter booking number (e.g., SLBD2025121900000001)">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Print Type</label>
                                    <div class="d-flex gap-2">
                                        <label class="btn btn-outline-primary flex-fill">
                                            <input type="radio" name="reprintType" value="single" checked class="d-none">
                                            <i class="bi bi-file-text"></i> Single
                                        </label>
                                        <label class="btn btn-outline-primary flex-fill">
                                            <input type="radio" name="reprintType" value="separate" class="d-none">
                                            <i class="bi bi-files"></i> Separate
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnReprintConfirm">
                                    <i class="bi bi-printer"></i> Reprint
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#reprintModal').remove();
            $('body').append(modalHtml);
            
            // Handle radio button selection
            $('#reprintModal input[name="reprintType"]').on('change', function() {
                $('#reprintModal label.btn').removeClass('active btn-primary').addClass('btn-outline-primary');
                $(this).closest('label').removeClass('btn-outline-primary').addClass('active btn-primary');
            });
            
            // Initialize first option as active
            $('#reprintModal input[name="reprintType"]:checked').closest('label').removeClass('btn-outline-primary').addClass('active btn-primary');
            
            // Handle reprint confirm
            $('#btnReprintConfirm').on('click', function() {
                const bookingNumber = $('#reprintBookingNumber').val().trim();
                const printType = $('input[name="reprintType"]:checked').val();
                
                if (!bookingNumber) {
                    TempleCore.showToast('Please enter a booking number', 'warning');
                    return;
                }
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('reprintModal')).hide();
                
                // Open print page
                const printUrl = TempleCore.buildTempleUrl(`/pos-sales/print?id=${encodeURIComponent(booking.id)}&type=${this.printOption}`);
                const printWindow = window.open(printUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
                
                if (!printWindow) {
                    TempleCore.showToast('Please allow popups to print receipt', 'warning');
                    
                    // Alternative: Navigate using router
                    if (typeof TempleRouter !== 'undefined') {
                        TempleRouter.navigate('pos-sales/print', { 
                            id: bookingNumber,
                            type: printType 
                        });
                    }
                }
            });
            
            // Show modal
            new bootstrap.Modal(document.getElementById('reprintModal')).show();
            
            // Focus on input
            setTimeout(() => {
                $('#reprintBookingNumber').focus();
            }, 300);
        }
    };
    
    // Alias for compatibility
    window.POSSalesCreatePage = window.PosSalesCreatePage;
    
})(jQuery, window);