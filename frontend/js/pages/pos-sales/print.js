// js/pages/pos-sales/print.js
// POS Sales Print Page - Template-based with Dynamic Library Loading
// URL: pos-sales/print?id=BOOKING_NUMBER&type=single|separate
// Uses iframe-based rendering to preserve vConsole for debugging

(function($, window) {
    'use strict';
    
    window.PosSalesPrintPage = {
        pageId: 'pos-sales-print',
        
        // Data
        bookingData: null,
        printType: 'single',
        templeSettings: {},
        salesSettings: {},
        printerType: 'browser',
        currentUserId: null,
        activeTemplate: null,
        
        // Print frame reference
        printFrame: null,
        printContainer: null,
        
        // Default settings fallback
        defaultSettings: {
            print_design_template: 'template1',
            print_size: 'Thermal',
            header_font_size: '16',
            content_font_size: '12',
            enable_barcode: '0',
            enable_qr_code: '0',
            slogan: '',
            printer_mappings: '[]'
        },
        
        // Initialize
        init: function(params) {
            console.log('POS Sales Print Page initialized', params);
            const self = this;
            var vConsole = new VConsole();
            // Get current user
            this.getCurrentUser();
            
            // Get params from URL or route params
            const bookingId = params?.id || this.getUrlParam('id');
            const printType = params?.type || this.getUrlParam('type') || 'single';
            this.printType = printType;
            
            // Show loading state (without replacing document)
            this.showLoadingState();
            
            // Load temple settings first (from API), then proceed
            this.loadTempleSettings()
                .then(function() {
                    // Load sales settings
                    return self.loadSalesSettings();
                })
                .then(function() {
                    setTimeout(function() {            
                        // Determine printer type based on user mapping
                        self.determinePrinterType();
                        
                        // Load required libraries (if iMin printer)
                        return self.loadRequiredLibraries();
                    }, 100);	
                })
                .then(function() {
                    // Load booking data
                    return self.loadBookingData(bookingId);
                })
                .then(function() {
                    // Render the page with appropriate template
                    self.renderFullPage();
                })
                .catch(function(error) {
                    console.error('Print initialization error:', error);
                    self.showError(error.message || 'Failed to initialize print page');
                });
        },
        
        // Get current user
        getCurrentUser: function() {
            try {
                if (typeof TempleCore !== 'undefined' && TempleCore.getUser) {
                    const user = TempleCore.getUser();
                    this.currentUserId = user?.id || null;
                }
            } catch (e) {
                console.warn('Failed to get current user:', e);
            }
        },
        
        // Get URL parameter
        getUrlParam: function(param) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        },
        
        // Load temple settings from API (with localStorage fallback)
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Check if TempleAPI is available
                if (typeof TempleAPI !== 'undefined') {
                    console.log('→ Loading temple settings from API...');
                    
                    // Fetch fresh settings from server
                    TempleAPI.get('/settings?type=SYSTEM')
                        .done(function(response) {
                            if (response.success && response.data && response.data.values) {
                                const values = response.data.values;
                                
                                self.templeSettings = {
                                    temple_name: values.temple_name || 'Temple Name',
                                    temple_name_secondary: values.temple_name_secondary || '',
                                    temple_address: values.temple_address || '',
                                    temple_city: values.temple_city || '',
                                    temple_state: values.temple_state || '',
                                    temple_pincode: values.temple_pincode || '',
                                    temple_phone: values.temple_phone || '',
                                    temple_logo: values.temple_logo || '',
                                    slogan: values.slogan || ''
                                };
                                
                                console.log('✓ Temple settings loaded from API:', self.templeSettings);
                                
                                // Update localStorage for future use
                                try {
                                    const storageKey = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STORAGE && APP_CONFIG.STORAGE.TEMPLE 
                                        ? APP_CONFIG.STORAGE.TEMPLE 
                                        : 'temple_settings';
                                    localStorage.setItem(storageKey, JSON.stringify({
                                        name: self.templeSettings.temple_name,
                                        name_secondary: self.templeSettings.temple_name_secondary,
                                        address: self.templeSettings.temple_address,
                                        city: self.templeSettings.temple_city,
                                        state: self.templeSettings.temple_state,
                                        pincode: self.templeSettings.temple_pincode,
                                        phone: self.templeSettings.temple_phone,
                                        temple_logo: self.templeSettings.temple_logo,
                                        slogan: self.templeSettings.slogan
                                    }));
                                } catch (e) {
                                    console.warn('Failed to update localStorage:', e);
                                }
                                
                                // Convert logo to base64 to avoid CORS issues with dom-to-image
                                if (self.templeSettings.temple_logo) {
                                    self.convertLogoToBase64(self.templeSettings.temple_logo)
                                        .then(function(base64) {
                                            self.templeSettings.temple_logo = base64;
                                            console.log('✓ Logo converted to base64');
                                            resolve();
                                        })
                                        .catch(function(err) {
                                            console.warn('Failed to convert logo to base64, using original URL:', err);
                                            resolve(); // Continue without base64 conversion
                                        });
                                } else {
                                    resolve();
                                }
                            } else {
                                console.warn('No temple settings in API response, falling back to localStorage');
                                self.loadTempleSettingsFromStorage();
                                resolve();
                            }
                        })
                        .fail(function(xhr) {
                            console.warn('Failed to load temple settings from API, falling back to localStorage:', xhr);
                            self.loadTempleSettingsFromStorage();
                            resolve();
                        });
                } else {
                    console.warn('TempleAPI not available, loading from localStorage');
                    self.loadTempleSettingsFromStorage();
                    resolve();
                }
            });
        },
        
        // Convert image URL to base64 (bypasses CORS for dom-to-image)
        convertLogoToBase64: function(imageUrl) {
            return new Promise((resolve, reject) => {
                // Use fetch with no-cors mode won't work, so we use server-side proxy or direct approach
                // Try using a canvas approach first
                const img = new Image();
                img.crossOrigin = 'anonymous'; // Request CORS
                
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const base64 = canvas.toDataURL('image/png');
                        resolve(base64);
                    } catch (e) {
                        reject(e);
                    }
                };
                
                img.onerror = function() {
                    // If CORS fails, try fetching through our API proxy
                    console.log('Direct image load failed, trying API proxy...');
                    
                    if (typeof TempleAPI !== 'undefined') {
                        // Try to fetch via server proxy
                        TempleAPI.get('/proxy-image?url=' + encodeURIComponent(imageUrl))
                            .done(function(response) {
                                if (response.success && response.data) {
                                    resolve(response.data); // Base64 from server
                                } else {
                                    reject(new Error('Proxy failed'));
                                }
                            })
                            .fail(function() {
                                reject(new Error('Image proxy not available'));
                            });
                    } else {
                        reject(new Error('CORS blocked and no proxy available'));
                    }
                };
                
                // Add cache buster and start loading
                const separator = imageUrl.includes('?') ? '&' : '?';
                img.src = imageUrl + separator + '_t=' + Date.now();
            });
        },
        
        // Fallback: Load temple settings from localStorage
        loadTempleSettingsFromStorage: function() {
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
                    temple_phone: stored.phone || stored.temple_phone || '',
                    temple_logo: stored.temple_logo || stored.logo || '',
                    slogan: stored.slogan || ''
                };
                
                console.log('✓ Temple settings loaded from localStorage:', this.templeSettings);
            } catch (e) {
                console.warn('Failed to load temple settings from localStorage:', e);
                this.templeSettings = {
                    temple_name: 'Temple Name',
                    temple_name_secondary: '',
                    temple_address: '',
                    temple_city: '',
                    temple_state: '',
                    temple_pincode: '',
                    temple_phone: '',
                    temple_logo: '',
                    slogan: ''
                };
            }
        },
        
        // Load sales settings from API
        loadSalesSettings: function() {
            const self = this;
            const deferred = $.Deferred();
            
            if (typeof TempleAPI !== 'undefined') {
                console.log('→ Loading sales settings from API...');
                TempleAPI.get('/booking-settings?type=SALES')
                    .done(function(response) {
                        if (response.success && response.data) {
                            // Convert array to object
                            const settingsObj = Object.entries(response.data.SALES).reduce((acc, [key, obj]) => {
								let val = obj.value;
								
								// Try parsing JSON strings
								if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
									try { val = JSON.parse(val); } catch (e) {}
								}
								// Convert numeric strings to numbers
								else if (!isNaN(val) && val !== null && val !== '') {
									val = Number(val);
								}
								
								acc[key] = val;
								return acc;
							}, {});
                            
                            self.salesSettings = Object.assign({}, self.defaultSettings, settingsObj);
                            console.log('✓ Sales settings loaded:', self.salesSettings);
                        } else {
                            console.warn('No sales settings in response, using defaults');
                            self.salesSettings = Object.assign({}, self.defaultSettings);
                        }
                        deferred.resolve();
                    })
                    .fail(function(xhr) {
                        console.warn('Failed to load sales settings, using defaults:', xhr);
                        self.salesSettings = Object.assign({}, self.defaultSettings);
                        deferred.resolve(); // Continue with defaults
                    });
            } else {
                console.warn('TempleAPI not available, using default settings');
                this.salesSettings = Object.assign({}, this.defaultSettings);
                deferred.resolve();
            }
            
            return deferred.promise();
        },
        
        // Determine printer type based on user mapping
        determinePrinterType: function() {
            const self = this;
            try {
                const mappings = this.salesSettings.printer_mappings || [];
                console.log('mappings');
                console.log(this.salesSettings);
                console.log(this.currentUserId);
                if (Array.isArray(mappings) && this.currentUserId) {
                    const userMapping = mappings.find(function(m) {
                        return m.user_id === self.currentUserId || 
                               m.user_id === String(self.currentUserId);
                    });
                    
                    if (userMapping && userMapping.printer_type) {
                        this.printerType = userMapping.printer_type;
                        console.log('✓ Printer type from mapping:', this.printerType);
                        return;
                    }
                }
            } catch (e) {
                console.warn('Failed to parse printer mappings:', e);
            }
            return;
            // Default to browser print
            this.printerType = 'browser';
            console.log('✓ Using default browser print');
        },
        
        // Load required libraries based on printer type
        loadRequiredLibraries: function() {
            const self = this;
            const deferred = $.Deferred();
            console.log(self.printerType);
            if (self.printerType === 'imin_d4' || self.printerType === 'imin_d4_pro' || self.printerType === 'imin_swan2') {
                console.log('→ Loading iMin libraries for printer type:', self.printerType);
                
                // Determine which iMin library version to load based on device
                const iminLibrary = (self.printerType === 'imin_d4' || self.printerType === 'imin_swan2') 
                    ? '/js/libs/imin/imin-printer-1.4.js'
                    : (self.printerType === 'imin_d4_pro' 
                        ? '/js/libs/imin/imin-printer-1.5.js' 
                        : '/js/libs/imin/imin-printer-2.min.js');
                
                // Load dom-to-image first, then iMin library
                self.loadScript('/js/libs/imin/dom-to-image.js')
                    .then(function() {
                        console.log('✓ dom-to-image loaded successfully');
                        return self.loadScript(iminLibrary);
                    })
                    .then(function() {
                        console.log('✓ iMin printer library loaded successfully(' + iminLibrary + ')');
                        deferred.resolve();
                    })
                    .fail(function(error) {
                        console.error('❌ Failed to load libraries:', error);
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('Failed to load printer libraries. Using browser print instead.', 'warning');
                        }
                        self.printerType = 'browser';
                        deferred.resolve();
                    });
            } else {
                console.log('✓ Using default browser print - no libraries to load');
                deferred.resolve();
            }
            
            return deferred.promise();
        },
        
        // Load script dynamically
        loadScript: function(src) {
            const deferred = $.Deferred();
            
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                deferred.resolve();
                return deferred.promise();
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = function() {
                deferred.resolve();
            };
            script.onerror = function() {
                deferred.reject(new Error('Failed to load: ' + src));
            };
            document.head.appendChild(script);
            
            return deferred.promise();
        },
        
        // Load booking data
        loadBookingData: function(bookingId) {
            const self = this;
            const deferred = $.Deferred();
            
            // Check sessionStorage first (from create page)
            const tempData = sessionStorage.getItem('pos_sales_print_data');
            
            if (tempData) {
                try {
                    self.bookingData = JSON.parse(tempData);
                    self.printType = self.bookingData.print_type || self.printType;
                    sessionStorage.removeItem('pos_sales_print_data');
                    console.log('✓ Booking data loaded from sessionStorage');
                    deferred.resolve();
                    return deferred.promise();
                } catch (e) {
                    console.warn('Failed to parse temp data:', e);
                }
            }
            
            // Load from API if not in sessionStorage
            if (bookingId && typeof TempleAPI !== 'undefined') {
                console.log('→ Loading booking data from API...');
                TempleAPI.get('/sales/orders/' + bookingId)
                    .done(function(response) {
                        if (response.success && response.data) {
                            self.bookingData = self.formatAPIData(response.data);
                            console.log('✓ Booking data loaded from API');
                            deferred.resolve();
                        } else {
                            deferred.reject(new Error('Booking not found'));
                        }
                    })
                    .fail(function(xhr) {
                        console.error('API Error:', xhr);
                        deferred.reject(new Error('Failed to load booking'));
                    });
            } else if (!bookingId) {
                deferred.reject(new Error('No booking ID provided'));
            } else {
                deferred.reject(new Error('API not available'));
            }
            
            return deferred.promise();
        },
        
        // Format API response
        formatAPIData: function(data) {
            return {
                booking_number: data.booking_number,
                booking_date: data.booking_date,
                items: data.items || [],
                devotee: data.devotee || null,
                totals: {
                    subtotal: parseFloat(data.subtotal) || 0,
                    discount: parseFloat(data.discount_amount) || 0,
                    total: parseFloat(data.total_amount) || 0
                },
                payment_method: data.payment_method || 'Cash',
                print_type: this.printType
            };
        },
        
        // Show loading state (without replacing document - keeps jQuery alive)
        showLoadingState: function() {
            // Show loading using TempleCore if available
            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading(true);
            }
            
            // Also update the container if it exists
            const container = document.getElementById('app-container') || document.getElementById('main-content') || document.body;
            if (container) {
                container.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;">
                        <div style="font-size:40px;margin-bottom:20px;">⏳</div>
                        <h2 style="color:#333;margin-bottom:10px;">Loading...</h2>
                        <p style="color:#666;">Please wait while we prepare your receipt</p>
                    </div>
                `;
            }
        },
        
        // Show error using overlay (preserves vConsole)
        showError: function(message) {
            const self = this;
            
            // Hide loading if shown
            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading(false);
            }
            
            const errorContent = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;">
                    <div style="font-size:60px;margin-bottom:20px;">⚠️</div>
                    <h2 style="color:#dc3545;margin-bottom:10px;">Error</h2>
                    <p style="color:#666;margin-bottom:20px;">${message}</p>
                    <button id="print-error-back-btn" style="padding:10px 30px;background:#6c757d;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;">Go Back</button>
                </div>
            `;
            
            // Use overlay approach instead of document.write
            this.createPrintContainer(errorContent, false);
            
            // Attach back button handler
            setTimeout(function() {
                const backBtn = document.getElementById('print-error-back-btn');
                if (backBtn) {
                    backBtn.onclick = function() { 
                        self.closePrintView();
                        window.history.back(); 
                    };
                }
            }, 100);
        },
        
        // Create print container overlay (preserves main document and vConsole)
        createPrintContainer: function(content, includeLibraries) {
            const self = this;
            
            // Remove existing container if any
            this.closePrintView();
            
            // Create full-screen overlay container
            const container = document.createElement('div');
            container.id = 'print-overlay-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #fff;
                z-index: 9998;
                overflow: auto;
            `;
            
            // Add content directly to container
            container.innerHTML = content;
            
            // Append to body
            document.body.appendChild(container);
            
            // Store reference
            this.printContainer = container;
            
            // Load external libraries into the container if needed
            if (includeLibraries && (self.printerType === 'imin_d4' || self.printerType === 'imin_d4_pro' || self.printerType === 'imin_swan2')) {
                // Libraries are already loaded in the main document via loadRequiredLibraries
                console.log('✓ iMin libraries available in main document');
            }
            
            // Add Bootstrap Icons CSS if not already present
            if (!document.querySelector('link[href*="bootstrap-icons"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
                document.head.appendChild(link);
            }
            
            // Store print config globally
            window.PRINT_CONFIG = {
                printerType: self.printerType,
                printSize: self.salesSettings.print_size || 'Thermal'
            };
        },
        
        // Close print view and restore main content
        closePrintView: function() {
            if (this.printContainer) {
                this.printContainer.remove();
                this.printContainer = null;
            }
            if (this.printFrame) {
                this.printFrame.remove();
                this.printFrame = null;
            }
            // Remove any existing overlay
            const existing = document.getElementById('print-overlay-container');
            if (existing) {
                existing.remove();
            }
        },
        
        // Get currency
        getCurrency: function() {
            return (typeof TempleCore !== 'undefined' && TempleCore.getCurrency) ? TempleCore.getCurrency() : 'RM';
        },
        
        // Load template dynamically
        loadTemplate: function(templateName) {
            const deferred = $.Deferred();
            const templatePath = `/js/pages/pos-sales/templates/${templateName}.js`;
            
            console.log('→ Loading template:', templatePath);
            
            // Check if template already loaded
            const existingTemplate = this.getTemplateRenderer(templateName);
            if (existingTemplate) {
                console.log('✓ Template already loaded:', templateName);
                deferred.resolve();
                return deferred.promise();
            }
            
            // Load template via $.getScript
            $.getScript(templatePath)
                .done(function() {
                    console.log('✓ Template loaded successfully:', templateName);
                    deferred.resolve();
                })
                .fail(function(jqxhr, settings, exception) {
                    console.error('❌ Failed to load template:', templateName, exception);
                    deferred.reject(new Error('Failed to load template: ' + templateName));
                });
            
            return deferred.promise();
        },
        
        // Render full page
        renderFullPage: function() {
            const self = this;
            const templateName = this.salesSettings.print_design_template || 'template1';
            
            // Load template first, then render
            this.loadTemplate(templateName)
                .then(function() {
                    self.executeRender(templateName);
                })
                .fail(function(error) {
                    self.showError(error.message || 'Template "' + templateName + '" not found');
                });
        },
        
        // Execute render after template is loaded
        executeRender: function(templateName) {
            const self = this;
            
            // Hide loading if shown
            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading(false);
            }
            
            // Get template renderer
            const templateRenderer = this.getTemplateRenderer(templateName);
            
            if (!templateRenderer) {
                this.showError('Template "' + templateName + '" not found');
                return;
            }
            
            // Prepare data for template
            const templateData = {
                booking_number: this.bookingData.booking_number,
                booking_date: this.bookingData.booking_date,
                items: this.bookingData.items,
                devotee: this.bookingData.devotee,
                totals: this.bookingData.totals,
                payment_method: this.bookingData.payment_method,
                print_option: this.printType === 'single' ? 'SINGLE_PRINT' : 'SEPARATE_PRINT',
                temple: this.templeSettings
            };
            
            // Prepare settings for template
            const templateSettings = {
                print_size: this.salesSettings.print_size || 'Thermal',
                header_font_size: this.salesSettings.header_font_size || '16',
                content_font_size: this.salesSettings.content_font_size || '12',
                enable_barcode: this.salesSettings.enable_barcode === '1',
                enable_qr_code: this.salesSettings.enable_qr_code === '1',
                slogan: this.salesSettings.slogan || this.templeSettings.slogan || ''
            };
            
            // Render template content
            const templateContent = templateRenderer.render(templateData, templateSettings, this.printerType);
            
            // Use overlay approach instead of replacing document
            this.createPrintContainer(templateContent, true);
            
            // Attach event handlers after DOM is ready
            setTimeout(function() {
                self.attachEventHandlers();
            }, 100);
        },
        
        // Get template renderer based on template name
        getTemplateRenderer: function(templateName) {
            // Template mapping
            const templates = {
                'template1': window.PosSalesTemplate1 || null,
                'template2': window.PosSalesTemplate2 || null,
                'template3': window.PosSalesTemplate3 || null
            };
            
            return templates[templateName] || templates['template1'];
        },
        
        // Attach event handlers after page render
        attachEventHandlers: function() {
            const self = this;
            
            // Back button
            const backBtn = document.querySelector('.btn-back');
            if (backBtn) {
                backBtn.onclick = function() { 
                    self.closePrintView();
                    window.history.back(); 
                };
            }
            
            // Browser print button
            const printBtn = document.querySelector('.btn-print');
            if (printBtn) {
                printBtn.onclick = function() { self.triggerBrowserPrint(); };
            }
            
            const browserPrintBtn = document.querySelector('.btn-browser-print');
            if (browserPrintBtn) {
                browserPrintBtn.onclick = function() { self.triggerBrowserPrint(); };
            }
            
            // iMin print button
            const iminPrintBtn = document.querySelector('.btn-imin-print');
            if (iminPrintBtn) {
                iminPrintBtn.onclick = function() { self.triggerIminPrint(); };
            }
            
            // Printer size selector
            const printerSizeSelect = document.getElementById('printerSize');
            if (printerSizeSelect) {
                printerSizeSelect.onchange = function() {
                    self.changePrinterSize(this.value);
                };
            }
            
            // Expose global functions for inline onclick handlers in templates
            window.goBack = function() {
                self.closePrintView();
                window.history.back();
            };
            window.browserPrint = function() { self.triggerBrowserPrint(); };
            window.iminPrint = function() { self.triggerIminPrint(); };
            window.changePrinterSize = function(size) { self.changePrinterSize(size); };
			 if (self.printerType === 'imin_d4' || self.printerType === 'imin_d4_pro' || self.printerType === 'imin_swan2'){
				 self.triggerIminPrint();
			 }
        },
        
        // Change printer size
        changePrinterSize: function(size) {
            const container = this.printContainer || document.body;
            container.className = 'printer-' + size;
        },
        
        // Trigger browser print using iframe for better isolation
        triggerBrowserPrint: function() {
            const self = this;
            const receiptContent = document.getElementById('receipt-content');
            
            if (!receiptContent) {
                console.error('Receipt content not found');
                alert('Receipt content not found');
                return;
            }
            
            // Clone the receipt content
            const printContent = receiptContent.cloneNode(true);
            
            // Create hidden iframe for printing
            const iframe = document.createElement('iframe');
            iframe.id = 'print-frame';
            iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:0;height:0;border:none;';
            document.body.appendChild(iframe);
            
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // Build print document
            const printHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receipt - ${this.bookingData?.booking_number || 'Print'}</title>
                    <meta charset="utf-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
                    <style>
                        ${this.getPrintStyles()}
                        @media print {
                            body { margin: 0; padding: 0; }
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.outerHTML}
                </body>
                </html>
            `;
            
            iframeDoc.open();
            iframeDoc.write(printHTML);
            iframeDoc.close();
            
            // Wait for content to load, then print
            setTimeout(function() {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (e) {
                    console.error('Print failed:', e);
                    // Fallback to direct window.print()
                    window.print();
                }
                
                // Remove iframe after printing
                setTimeout(function() {
                    iframe.remove();
                }, 1000);
            }, 500);
        },
        
        // Get print styles from current document
        getPrintStyles: function() {
            let styles = '';
            
            // Collect all style tags
            document.querySelectorAll('style').forEach(function(styleTag) {
                styles += styleTag.innerHTML + '\n';
            });
            
            // Also get any inline styles from the receipt content
            const receiptContent = document.getElementById('receipt-content');
            if (receiptContent) {
                const styleAttr = receiptContent.getAttribute('style');
                if (styleAttr) {
                    styles += `#receipt-content { ${styleAttr} }\n`;
                }
            }
            
            return styles;
        },
        
        // Helper function for delays (async/await compatible)
        delay: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        // Trigger iMin print with queue-based approach (async/await version)
        triggerIminPrint: async function() {
            const self = this;
            
            // Find all receipt elements (supports multiple receipts for SEPARATE_PRINT)
            const $receipts = $('#receipt-content .receipt-ticket');
            
            // Fallback to single receipt-content if no individual tickets found
            const $printTargets = $receipts.length > 0 ? $receipts : $('#receipt-content');
            
            if ($printTargets.length === 0) {
                console.error('Receipt content not found');
                alert('Receipt content not found');
                return;
            }
            
            console.log('→ Starting iMin print... Found ' + $printTargets.length + ' receipt(s)');
            
            // Check if iMin SDK is available
            if (typeof IminPrinter === 'undefined' && typeof iminPrinter === 'undefined') {
                console.warn('iMin printer SDK not available. Using browser print instead.');
                alert('iMin printer SDK not available. Using browser print instead.');
                this.triggerBrowserPrint();
                return;
            }
            
            // Check if dom-to-image is available
            if (typeof domtoimage === 'undefined') {
                console.error('dom-to-image library not loaded');
                alert('Print library not loaded. Using browser print instead.');
                this.triggerBrowserPrint();
                return;
            }
            
            // Check if page is served over HTTPS (will cause mixed content issues)
            if (window.location.protocol === 'https:') {
                console.warn('⚠️ Page is served over HTTPS. iMin printer uses ws:// and http:// which may be blocked by browser.');
                console.warn('⚠️ If printing fails, try accessing this page via HTTP instead of HTTPS.');
            }
            
            // Get printer instance
            const IminPrintInstance = new IminPrinter();
            console.log('IminPrintInstance created');
            
            // Show print status overlay
            this.showPrintStatus($printTargets.length);
            
            // Show loading
            if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                TempleCore.showLoading(true);
            }
            
            try {
                // Connect to printer first (CRITICAL!)
                console.log('Attempting to connect to printer...');
                const isConnect = await IminPrintInstance.connect();
                
                if (!isConnect) {
                    throw new Error('Failed to connect to printer');
                }
                
                console.log('Printer connected successfully');
                
                // Get printer status before printing
                try {
                    const printerStatus = await IminPrintInstance.getPrinterStatus();
                    console.log('Printer Status:', printerStatus);
                    
                    // Check if printer has errors
                    if (printerStatus && printerStatus.value && printerStatus.value !== '0') {
                        console.warn('Printer status warning:', printerStatus.text);
                    }
                } catch (statusError) {
                    console.warn('Could not get initial printer status:', statusError);
                }
                
                // Initialize printer (CRITICAL!)
                IminPrintInstance.initPrinter();
                console.log('Printer initialized');
                
                // Wait for initialization
                await this.delay(100);
                
                // Convert receipts to images and print
                await this.initiateIminPrintLoad(IminPrintInstance, $printTargets);
                
                console.log('✓ Print job completed successfully');
                
            } catch (error) {
                console.error('Print error:', error);
                
                // More helpful error message for mixed content issues
                let errorMessage = error.message || 'Unknown error';
                if (window.location.protocol === 'https:' && 
                    (errorMessage.includes('WebSocket') || errorMessage.includes('connect') || errorMessage.includes('network'))) {
                    errorMessage = 'Connection blocked. This page is on HTTPS but iMin printer requires HTTP. Please access this page via HTTP.';
                }
                
                alert('Print failed: ' + errorMessage);
                
                // Fallback to browser print
                this.triggerBrowserPrint();
                
            } finally {
                this.hidePrintStatus();
                if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                    TempleCore.showLoading(false);
                }
            }
        },
        
        // Show print status overlay
        showPrintStatus: function(totalCount) {
            // Remove existing status if any
            this.hidePrintStatus();
            
            const statusHtml = `
                <div id="print_status" style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.9);
                    color: white;
                    padding: 30px 50px;
                    border-radius: 12px;
                    z-index: 10000;
                    text-align: center;
                    min-width: 300px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                ">
                    <div style="font-size: 24px; margin-bottom: 15px;">🖨️ Printing...</div>
                    <div style="margin-bottom: 10px;">
                        Receipt <span id="current_receipt">1</span> of <span id="total_receipts">${totalCount}</span>
                    </div>
                    <div style="background: #333; border-radius: 10px; height: 20px; overflow: hidden; margin-top: 15px;">
                        <div id="print_progress" style="
                            background: linear-gradient(90deg, #4CAF50, #8BC34A);
                            height: 100%;
                            width: 0%;
                            transition: width 0.3s ease;
                            border-radius: 10px;
                        "></div>
                    </div>
                    <div id="print_status_text" style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        Converting images...
                    </div>
                </div>
            `;
            
            $(document.body).append(statusHtml);
        },
        
        // Hide print status overlay
        hidePrintStatus: function() {
            $('#print_status').remove();
        },
        
        // Update print status text
        updatePrintStatusText: function(text) {
            $('#print_status_text').text(text);
        },
        
        // Convert a single receipt to image (returns Promise)
        convertReceiptToImage: function(node) {
            return domtoimage.toJpeg(node, {
                quality: 0.95,
                bgcolor: '#ffffff'
            });
        },
        
        // Initiate iMin print load - converts all receipts to images first (async/await version)
        initiateIminPrintLoad: async function(IminPrintInstance, $receipts) {
            const self = this;
            const tickets = [];
            const totalCount = $receipts.length;
            
            console.log('Total receipts to convert: ' + totalCount);
            this.updatePrintStatusText('Converting receipts to images...');
            
            // Convert all receipts to images
            for (let index = 0; index < totalCount; index++) {
                const node = $receipts[index];
                
                try {
                    // Stagger conversion to avoid memory issues
                    if (index > 0) {
                        await this.delay(100);
                    }
                    
                    const dataUrl = await this.convertReceiptToImage(node);
                    tickets[index] = dataUrl;
                    
                    console.log('Converted receipt ' + (index + 1) + ' of ' + totalCount);
                    
                    // Update progress (0-50% for conversion)
                    const progress = ((index + 1) / totalCount) * 50;
                    $('#print_progress').css('width', progress + '%');
                    
                } catch (error) {
                    console.error('Error generating image for receipt ' + (index + 1), error);
                    tickets[index] = null; // Mark as failed, will be skipped
                }
            }
            
            console.log('All images converted, starting print queue');
            this.updatePrintStatusText('Sending to printer...');
            
            // Wait a bit before starting print
            await this.delay(500);
            
            // Print all receipts
            await this.iminPrintQueue(IminPrintInstance, tickets, 0, totalCount);
        },
        
        // Print queue - prints receipts one by one (async/await version)
        iminPrintQueue: async function(IminPrintInstance, tickets, currentIndex, totalCount) {
            const self = this;
            
            // Process all remaining receipts
            for (let i = currentIndex; i < tickets.length; i++) {
                // Skip if no image data for this receipt
                if (!tickets[i]) {
                    console.log('Skipping receipt ' + (i + 1) + ' - no image data');
                    continue;
                }
                
                // Update UI
                $('#current_receipt').text(i + 1);
                const progress = 50 + ((i + 1) / totalCount) * 50;
                $('#print_progress').css('width', progress + '%');
                this.updatePrintStatusText('Printing receipt ' + (i + 1) + ' of ' + totalCount + '...');
                
                console.log('Printing receipt ' + (i + 1) + ' of ' + tickets.length);
                
                try {
                    // Check printer status periodically (every 3 receipts or first one)
                    if (i === 0 || i % 3 === 0) {
                        try {
                            const status = await IminPrintInstance.getPrinterStatus();
                            console.log('Printer status at receipt ' + (i + 1) + ':', status);
                            
                            // If printer has error, wait before continuing
                            if (status && status.value && status.value !== '0') {
                                console.log('Printer error detected, waiting...');
                                await this.delay(2000);
                            }
                        } catch (statusError) {
                            console.warn('Could not get printer status:', statusError);
                        }
                    }
                    
                    // Print the bitmap
                    console.log('Printing bitmap for receipt ' + (i + 1));
                    await IminPrintInstance.printSingleBitmap(tickets[i]);
                    console.log('Bitmap printed for receipt ' + (i + 1));
                    
                    await this.delay(100);
                    
                    const isLastReceipt = i === tickets.length - 1;
                    
                    if (isLastReceipt) {
                        // Last receipt - finalize print job
                        console.log('Last receipt - finalizing print job');
                        this.updatePrintStatusText('Finalizing...');
                        
                        // Feed paper before cut
                        console.log('Feeding paper before cut');
                        if (IminPrintInstance.printAndFeedPaper) {
                            IminPrintInstance.printAndFeedPaper(100);
                        }
                        
                        await this.delay(300);
                        
                        // Cut paper
                        console.log('Cutting paper');
                        if (IminPrintInstance.partialCut) {
                            IminPrintInstance.partialCut();
                        }
                        
                        await this.delay(300);
                        
                        // Open cash box
                        console.log('Opening cash box');
                        if (IminPrintInstance.openCashBox) {
                            IminPrintInstance.openCashBox();
                        }
                        
                        await this.delay(500);
                        
                        this.hidePrintStatus();
                        
                        if (typeof TempleCore !== 'undefined' && TempleCore.showLoading) {
                            TempleCore.showLoading(false);
                        }
                        
                        console.log('Print job completed successfully');
                        if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                            TempleCore.showToast('All receipts printed successfully!', 'success');
                        }
                        
                    } else {
                        // Not last receipt - add spacing and continue
                        console.log('Adding spacing between receipts (no cut)');
                        if (IminPrintInstance.printAndFeedPaper) {
                            IminPrintInstance.printAndFeedPaper(50);
                        }
                        
                        // Increase wait time for later receipts to prevent buffer overflow
                        let waitTime = 300;
                        if (i >= 2) waitTime = 400;
                        if (i >= 4) waitTime = 500;
                        
                        console.log('Waiting ' + waitTime + 'ms before next receipt');
                        await this.delay(waitTime);
                    }
                    
                } catch (error) {
                    console.error('Error printing receipt ' + (i + 1), error);
                    // Continue to next receipt even on error
                    await this.delay(500);
                }
            }
            
            // Fallback: ensure cash box is opened if we get here
            if (IminPrintInstance.openCashBox) {
                IminPrintInstance.openCashBox();
            }
        },
        
        // Cleanup
        cleanup: function() {
            this.closePrintView();
            
            // Clean up global functions
            delete window.goBack;
            delete window.browserPrint;
            delete window.iminPrint;
            delete window.changePrinterSize;
            delete window.PRINT_CONFIG;
        }
    };
    
    // Alias for backward compatibility
    window.POSSalesPrintPage = window.PosSalesPrintPage;
    
})(jQuery, window);