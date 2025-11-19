// js/core/temple.core.js
// Main application core using jQuery - Updated with Temple Settings and Conditional Script Loading

(function ($, window) {
    'use strict';

    window.TempleCore = {
        // Track loaded scripts
        loadedScripts: {},
        
        // Initialize application
        init: function () {
            const self = this;
            const currentPath = window.location.pathname;

            // Check if it's login page
            if (currentPath.includes('/login')) {
                TempleRouter.loadLoginPage();
                return;
            }

            // Check authentication
            if (!this.checkAuth()) {
                return;
            }

            // Load temple settings from API
            this.loadTempleSettings().then(function () {
                // After settings are loaded, initialize components
                self.initComponents();

                // Initialize router
                TempleRouter.init();

                // Show app
                $('#app-loader').fadeOut();
                $('#app').fadeIn();
            }).fail(function () {
                // If settings fail to load, still try to initialize with defaults
                console.warn('Failed to load temple settings, using defaults');
                self.loadThemeFromLocalStorage();
                self.initComponents();
                TempleRouter.init();
                $('#app-loader').fadeOut();
                $('#app').fadeIn();
            });
        },

        // Load script if not already loaded
        loadScriptOnce: function(scriptUrl, checkCondition) {
            const self = this;
            const deferred = $.Deferred();
            
            // Check if script is already loaded using provided condition
            if (checkCondition && checkCondition()) {
                console.log('Script already loaded:', scriptUrl);
                deferred.resolve();
                return deferred.promise();
            }
            
            // Check if we've already initiated loading for this script
            if (self.loadedScripts[scriptUrl]) {
                console.log('Script loading already initiated:', scriptUrl);
                return self.loadedScripts[scriptUrl];
            }
            
            console.log('Loading script:', scriptUrl);
            
            // Load the script
            $.getScript(scriptUrl)
                .done(function() {
                    console.log('Script loaded successfully:', scriptUrl);
                    deferred.resolve();
                })
                .fail(function(jqxhr, settings, exception) {
                    console.error('Failed to load script:', scriptUrl, exception);
                    deferred.reject();
                });
            
            // Store the promise to avoid duplicate loading
            self.loadedScripts[scriptUrl] = deferred.promise();
            
            return deferred.promise();
        },

        // Check authentication
        checkAuth: function () {
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);

            if (!token) {
                TempleAPI.redirectToLogin();
                return false;
            }

            return true;
        },

        // Load temple settings from API
        loadTempleSettings: function () {
            const self = this;
            const deferred = $.Deferred();

            TempleAPI.getTempleSettings()
                .done(function (response) {
                    if (response.success) {
                        const settings = response.data;

                        // Store complete settings
                        localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE_SETTINGS, JSON.stringify(settings));

                        // Prepare temple data with theme
                        const templeData = {
                            id: settings.temple_id,
                            name: settings.temple_name,
                            code: settings.temple_code,
                            description: settings.temple_description,
                            email: settings.temple_email,
                            phone: settings.temple_phone,
                            address: settings.temple_address,
                            city: settings.temple_city,
                            phone_code: settings.temple_phone_code,
                            state: settings.temple_state,
                            country: settings.temple_country,
                            pincode: settings.temple_pincode,
                            logo: settings.temple_logo_url,
                            banner: settings.temple_banner_url,
                            favicon: settings.temple_favicon_url,
                            theme: {
                                primary_color: settings.primary_color,
                                secondary_color: settings.secondary_color,
                                background_color: settings.background_color,
                                text_color: settings.text_color
                            },
                            // Operation settings
                            currency: settings.temple_currency,
                            timezone: settings.temple_timezone,
                            date_format: settings.temple_date_format,
                            time_format: settings.temple_time_format,
                            opening_time: settings.temple_opening_time,
                            closing_time: settings.temple_closing_time,
                            // Booking settings
                            booking_advance_days: settings.temple_booking_advance_days,
                            booking_cancellation_hours: settings.temple_booking_cancellation_hours,
                            // Social media
                            social: {
                                facebook: settings.temple_facebook_url,
                                twitter: settings.temple_twitter_url,
                                instagram: settings.temple_instagram_url,
                                youtube: settings.temple_youtube_url,
                                whatsapp: settings.temple_whatsapp_number
                            },
                            // Legal
                            registration_number: settings.temple_registration_number,
                            tax_number: settings.temple_tax_number,
                            pan_number: settings.temple_pan_number,
                            // System settings
                            status: settings.temple_status,
                            domain: settings.temple_domain,
                            database_name: settings.database_name
                        };

                        // Store temple data
                        localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify(templeData));

                        // Apply theme
                        self.applyTheme(templeData.theme);

                        // Update favicon if available
                        if (settings.temple_favicon_url) {
                            self.updateFavicon(settings.temple_favicon_url);
                        }

                        // Update page title
                        document.title = settings.temple_name + ' - Management System';

                        deferred.resolve(templeData);
                    } else {
                        console.error('Temple settings response not successful');
                        deferred.reject();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load temple settings:', xhr);
                    deferred.reject();
                });

            return deferred.promise();
        },

        // Load theme from localStorage (fallback)
        loadThemeFromLocalStorage: function () {
            const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');

            if (temple.theme) {
                this.applyTheme(temple.theme);
            } else {
                // Load default theme
                this.applyTheme(APP_CONFIG.THEME);
            }
        },

        // Apply theme
        applyTheme: function (theme) {
            const root = document.documentElement;

            // Apply colors
            root.style.setProperty('--primary-color', theme.primary_color || theme.PRIMARY_COLOR || '#00D4FF');
            root.style.setProperty('--secondary-color', theme.secondary_color || theme.SECONDARY_COLOR || '#FF6B35');
            root.style.setProperty('--background-color', theme.background_color || theme.BACKGROUND_COLOR || '#1A1A2E');
            root.style.setProperty('--text-color', theme.text_color || theme.TEXT_COLOR || '#F5F5F5');

            // Convert hex to RGB for gradients and transparency
            const primaryRgb = this.hexToRgb(theme.primary_color || theme.PRIMARY_COLOR || '#00D4FF');
            const secondaryRgb = this.hexToRgb(theme.secondary_color || theme.SECONDARY_COLOR || '#FF6B35');
            root.style.setProperty('--primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
            root.style.setProperty('--secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);

            // Apply background color to body if dark theme
            const bgColor = theme.background_color || theme.BACKGROUND_COLOR;
            if (bgColor && this.isDarkColor(bgColor)) {
                $('body').css('background-color', bgColor);
                $('body').addClass('dark-theme');
            } else {
                $('body').removeClass('dark-theme');
            }
        },

        // Update favicon
        updateFavicon: function (faviconUrl) {
            if (!faviconUrl) return;

            // Remove existing favicon
            $('link[rel="icon"], link[rel="shortcut icon"]').remove();

            // Add new favicon
            $('head').append(`
                <link rel="icon" type="image/x-icon" href="${faviconUrl}">
                <link rel="shortcut icon" type="image/x-icon" href="${faviconUrl}">
            `);
        },

        // Check if color is dark
        isDarkColor: function (hexColor) {
            const rgb = this.hexToRgb(hexColor);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness < 128;
        },

        // Convert hex to RGB
        hexToRgb: function (hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 0, b: 255 };
        },

        // Initialize UI components
        initComponents: function () {
            // Load header
            if (window.HeaderComponent) {
                HeaderComponent.init();
            }

            // Load sidebar
            if (window.SidebarComponent) {
                SidebarComponent.init();
            }

            // Load footer (if needed)
            if (window.FooterComponent) {
                FooterComponent.init();
            }
        },

        // Refresh temple settings (can be called from settings page after update)
        refreshTempleSettings: function (callback) {
            const self = this;

            this.loadTempleSettings().then(function (templeData) {
                // Update all components with new data
                if (window.HeaderComponent) {
                    HeaderComponent.updateInfo();
                }
                if (window.SidebarComponent) {
                    SidebarComponent.updateInfo();
                }
                if (window.FooterComponent) {
                    FooterComponent.updateInfo();
                }

                if (callback) callback(true, templeData);
            }).fail(function () {
                if (callback) callback(false, null);
            });
        },

        // Show toast notification
        showToast: function (message, type, duration) {
            type = type || 'info';
            duration = duration || 5000;

            const toastHtml = `
                <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="bi bi-${this.getToastIcon(type)} me-2"></i>
                            ${message}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            `;

            const $toast = $(toastHtml);
            $('#toast-container').append($toast);

            const toast = new bootstrap.Toast($toast[0], {
                delay: duration
            });
            toast.show();

            // Remove after hidden
            $toast.on('hidden.bs.toast', function () {
                $(this).remove();
            });
        },

        // Get toast icon
        getToastIcon: function (type) {
            const icons = {
                success: 'check-circle-fill',
                error: 'x-circle-fill',
                warning: 'exclamation-triangle-fill',
                info: 'info-circle-fill'
            };
            return icons[type] || icons.info;
        },

        // Show loading
        showLoading: function (show) {
            if (show) {
                // Check if loader already exists to avoid duplicates
                if ($('#globalLoader').length === 0) {
                    $('body').append(`
                        <div class="loading-overlay active" id="globalLoader">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    `);
                }
            } else {
                $('#globalLoader').remove();
            }
        },

        // Show confirm dialog
        showConfirm: function (title, message, onConfirm, onCancel) {
            const modalHtml = `
                <div class="modal fade" id="confirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${message}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="confirmBtn">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const $modal = $(modalHtml);
            $('body').append($modal);

            const modal = new bootstrap.Modal($modal[0]);
            modal.show();

            $('#confirmBtn').on('click', function () {
                modal.hide();
                if (onConfirm) onConfirm();
            });

            $modal.on('hidden.bs.modal', function () {
                $(this).remove();
                if (onCancel) onCancel();
            });
        },

        // Format currency - Load countries data if needed
        formatCurrency: function (amount, fraction=2) {
    
            const self = this;
            const temple = this.getTemple();
            var currency = temple.currency || 'MYR';

            // Check if CountryData is loaded
            if (!window.CountryData || !window.CountryData.currencySymbols) {
                // Load countries.js and try again
                self.loadScriptOnce('/js/data/countries.js', function() {
                    return window.CountryData && window.CountryData.currencySymbols;
                }).done(function() {
                    // Script loaded, but for now return basic format
                    console.log('Countries data loaded for currency formatting');
                });
                
                // Return basic format while loading
                const basicSymbols = {
					'MYR': 'RM',      // Malaysian Ringgit
					'INR': '₹',       // Indian Rupee
					'USD': '$',       // US Dollar
					'EUR': '€',       // Euro
					'GBP': '£',       // British Pound
					'SGD': 'S$',      // Singapore Dollar
					'JPY': '¥',       // Japanese Yen
					'CNY': '¥',       // Chinese Yuan
					'CAD': 'C$',      // Canadian Dollar
					'AUD': 'A$',      // Australian Dollar
					'CHF': 'CHF',     // Swiss Franc
					'HKD': 'HK$',     // Hong Kong Dollar
					'NZD': 'NZ$',     // New Zealand Dollar
					'SEK': 'kr',      // Swedish Krona
					'NOK': 'kr',      // Norwegian Krone
					'DKK': 'kr',      // Danish Krone
					'AED': 'د.إ',     // UAE Dirham
					'SAR': 'ر.س',     // Saudi Riyal
					'ZAR': 'R',       // South African Rand
					'THB': '฿',       // Thai Baht
					'PHP': '₱',       // Philippine Peso
					'IDR': 'Rp',      // Indonesian Rupiah
					'VND': '₫',       // Vietnamese Dong
					'KRW': '₩',       // South Korean Won
					'TWD': 'NT$',     // Taiwan Dollar
					'BRL': 'R$',      // Brazilian Real
					'MXN': '$',       // Mexican Peso
					'RUB': '₽',       // Russian Ruble
					'TRY': '₺',       // Turkish Lira
					'ILS': '₪'        // Israeli Shekel
				};
                
                const symbol = basicSymbols[currency] || currency;
                const numAmount = parseFloat(amount);
                const formattedAmount = Math.abs(numAmount).toLocaleString('en-IN', {
                    minimumFractionDigits: fraction,
                    maximumFractionDigits: fraction
                });
                
                return numAmount < 0 ? `(${symbol} ${formattedAmount})` : `${symbol} ${formattedAmount}`;
            }

            // CountryData is loaded, use it
            const currencySymbols = window.CountryData.currencySymbols;
            const symbol = currencySymbols[currency] || currency;
            const numAmount = parseFloat(amount);
            const formattedAmount = Math.abs(numAmount).toLocaleString('en-IN', {
                minimumFractionDigits: fraction,
                maximumFractionDigits: fraction
            });

            // Check if amount is negative
            if (numAmount < 0) {
                return `(${symbol} ${formattedAmount})`;
            } else {
                return `${symbol} ${formattedAmount}`;
            }
        },

        // Format date
        formatDate: function (dateString, format) {
            if (!dateString) return 'N/A';

            const date = new Date(dateString);
            const temple = this.getTemple();

            // Use temple's date format if available
            if (temple.date_format && !format) {
                // Convert PHP date format to JS format (simplified)
                // This is a basic conversion, you might need to expand it
                let jsFormat = temple.date_format;
                jsFormat = jsFormat.replace('d', 'DD').replace('m', 'MM').replace('Y', 'YYYY');
                // Use the format with a date library or fallback to default
            }

            const options = {
                short: { year: 'numeric', month: 'short', day: 'numeric' },
                long: { year: 'numeric', month: 'long', day: 'numeric' },
                full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
                time: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            };

            return date.toLocaleDateString('en-US', options[format || 'short']);
        },

        // Format time
        formatTime: function (timeString) {
            if (!timeString) return 'N/A';

            const temple = this.getTemple();
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(hours);
            date.setMinutes(minutes);

            // Use temple's time format if available
            const use12Hour = temple.time_format && temple.time_format.includes('A');

            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: use12Hour !== false
            });
        },

        // Check permission
        hasPermission: function (permission) {
            const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.USER) || '{}');

            // Super Admin has all permissions
            if (user.user_type === 'SUPER_ADMIN') {
                return true;
            }

            // Check if user has specific permission
            return user.permissions && user.permissions.includes(permission);
        },

        // Get user info
        getUser: function () {
            return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.USER) || '{}');
        },

        // Get temple info
        getTemple: function () {
            return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
        },

        // Get temple settings
        getTempleSettings: function () {
            return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE_SETTINGS) || '{}');
        },

        // Logout
        logout: function () {
            TempleCore.showConfirm(
                'Logout',
                'Are you sure you want to logout?',
                function () {
                    TempleAPI.logout();
                }
            );
        },
    

// Get phone code from temple settings
getPhoneCode: function() {
    // Try to get from temple settings first
    const templeSettings = this.getTempleSettings();
    if (templeSettings.temple_phone_code) {
        return templeSettings.temple_phone_code;
    }
    
    // Fallback to temple object
    const temple = this.getTemple();
    if (temple.phone_code) {
        return temple.phone_code;
    }
    
    // Default fallback
    return '+60'; // Based on your system_settings default
},

// Get array of common phone codes (for dropdown)
getPhoneCodes: function() {
    const defaultCode = this.getPhoneCode();
    const codes = [
        { code: '+60', country: 'Malaysia' },
        { code: '+91', country: 'India' },
        { code: '+65', country: 'Singapore' },
        { code: '+1', country: 'USA/Canada' },
        { code: '+44', country: 'UK' },
        { code: '+61', country: 'Australia' },
        { code: '+971', country: 'UAE' },
        { code: '+966', country: 'Saudi Arabia' },
        { code: '+62', country: 'Indonesia' },
        { code: '+63', country: 'Philippines' },
        { code: '+66', country: 'Thailand' },
        { code: '+84', country: 'Vietnam' },
        { code: '+86', country: 'China' },
        { code: '+81', country: 'Japan' },
        { code: '+82', country: 'South Korea' }
    ];
    
    // Sort to put default code first
    return codes.sort((a, b) => {
        if (a.code === defaultCode) return -1;
        if (b.code === defaultCode) return 1;
        return a.country.localeCompare(b.country);
    });
},
// Get currency symbol
getCurrency: function() {
    // Try temple settings first
    const templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE_SETTINGS) || '{}');
    if (templeSettings.currency) {
        const currencyCode = templeSettings.currency;
        return APP_CONFIG.CURRENCY_SYMBOLS[currencyCode] || currencyCode + ' ';
    }
    
    // Try temple object
    const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
    if (temple.currency) {
        return APP_CONFIG.CURRENCY_SYMBOLS[temple.currency] || temple.currency + ' ';
    }
    
    // Use default from config
    return APP_CONFIG.CURRENCY_SYMBOLS[APP_CONFIG.DEFAULT_TEMPLE.currency] || 'RM ';
},
getCurrencyCode: function() {
    const templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE_SETTINGS) || '{}');
    const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
    
    return templeSettings.currency || temple.currency || APP_CONFIG.DEFAULT_TEMPLE.currency || 'MYR';
},
        getTempleBaseUrl: function () {
            const temple = this.getTemple();
            const templeSlug = temple.id || this.getTempleIdFromUrl();

            return {
                full: `${window.location.origin}/${templeSlug}`,
                relative: `/${templeSlug}`,
                slug: templeSlug,
                origin: window.location.origin
            };
        },

        getTempleIdFromUrl: function () {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            return pathParts[0] || null;
        },

        // Build temple-specific URLs
        buildTempleUrl: function (path) {
            const baseUrl = this.getTempleBaseUrl();
            // Remove leading slash from path if present
            path = path.replace(/^\//, '');
            return `${baseUrl.full}/${path}`;
        },
    };

    // Initialize application
    window.TempleApp = {
        init: function () {
            // Load countries data if not already loaded
            // This checks if window.CountryData exists and has the expected structure
            TempleCore.loadScriptOnce('/js/data/countries.js', function() {
                return window.CountryData && 
                       window.CountryData.countries && 
                       window.CountryData.currencySymbols;
            }).always(function() {
                // Initialize the app regardless of whether countries.js loads
                TempleCore.init();
            });
        }
    };

})(jQuery, window);