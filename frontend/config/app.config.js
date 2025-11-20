// config/app.config.js
// Single source of truth for all configuration - Updated with Temple Settings

window.APP_CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://temple3.chinesetemplesystems.xyz/api/v1',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3
    },

    // Application Settings
    APP: {
        NAME: 'Temple Management System',
        VERSION: '1.0.0',
        DEBUG: true
    },

    // Storage Keys
    STORAGE: {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
        USER: 'user',
        TEMPLE: 'temple',
        TEMPLE_SETTINGS: 'temple_settings', // NEW: Store complete settings
        THEME: 'theme',
        PAGODA_FILTER: 'pagoda_filter'
    },

    // Route Configuration
    ROUTES: {
        LOGIN: 'login',
        DASHBOARD: 'dashboard',
        DEFAULT_PAGE: 'dashboard',
        PAGODA: {
            DASHBOARD: 'pagoda/dashboard',
            TOWERS: 'pagoda/towers',
            BLOCKS: 'pagoda/blocks',
            LIGHTS: 'pagoda/lights',
            REGISTER: 'pagoda/register',
            REGISTRATIONS: 'pagoda/registrations',
            DEVOTEES: 'pagoda/devotees',
            REPORTS: 'pagoda/reports',
            SETTINGS: 'pagoda/settings'
        }
    },

    // Permission Mappings
    PERMISSIONS: {
        SUPER_ADMIN: ['*'],
        ADMIN: ['view_*', 'create_*', 'edit_*', 'delete_*'],
        MANAGER: ['view_*', 'create_*', 'edit_*'],
        STAFF: ['view_*', 'create_bookings', 'edit_bookings'],
        MEMBER: ['view_dashboard', 'view_profile']
    },

    // Theme Defaults (Fallback when API is unavailable)
    THEME: {
        PRIMARY_COLOR: '#00D4FF',     // Updated to match sample
        SECONDARY_COLOR: '#FF6B35',   // Updated to match sample
        BACKGROUND_COLOR: '#1A1A2E',  // Updated to match sample
        TEXT_COLOR: '#F5F5F5'         // Updated to match sample
    },

    // Currency Symbols Mapping
    CURRENCY_SYMBOLS: {
        'MYR': 'RM',
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'SGD': 'S$',
        'AUD': 'A$',
        'CAD': 'C$',
        'THB': '฿',
        'JPY': '¥',
        'CNY': '¥',
        'AED': 'د.إ'
    },

    // Default Temple Settings (used when API fails)
    DEFAULT_TEMPLE: {
        name: 'Temple Management System',
        currency: 'MYR',
        timezone: 'Asia/Kuala_Lumpur',
        date_format: 'd/m/Y',
        time_format: 'h:i A',
        opening_time: '06:00',
        closing_time: '21:00'
    },

    // NEW: Pagoda Configuration
    PAGODA: {
        LIGHT_OPTIONS: [
            { value: 'new_light', label: 'New Light (Individual)', icon: 'bi-lightbulb' },
            { value: 'family_light', label: 'Family Light (Whole Family)', icon: 'bi-people' }
        ],
        MERIT_AMOUNTS: [
            { value: 38, label: 'RM 38', description: 'Basic Merit' },
            { value: 60, label: 'RM 60', description: 'Standard Merit' },
            { value: 100, label: 'RM 100', description: 'Premium Merit' },
            { value: 300, label: 'RM 300', description: 'Supreme Merit' }
        ],
        PAYMENT_METHODS: [
            { value: 'cash', label: 'Cash', icon: 'bi-cash' },
            { value: 'card', label: 'Credit/Debit Card', icon: 'bi-credit-card' },
            { value: 'online_banking', label: 'Online Banking', icon: 'bi-bank' },
            { value: 'ewallet', label: 'E-Wallet', icon: 'bi-wallet2' }
        ],
        STATUS_COLORS: {
            'available': 'success',
            'registered': 'primary',
            'expired': 'warning',
            'terminated': 'danger',
            'maintenance': 'secondary'
        },
        REGISTRATION_STATUS_COLORS: {
            'active': 'success',
            'expired': 'warning',
            'terminated': 'danger',
            'renewed': 'info'
        },
        DEFAULT_EXPIRY_MONTHS: 12,
        REMINDER_DAYS: [60, 30, 7]
    }
};

// Freeze configuration to prevent modifications
Object.freeze(window.APP_CONFIG);