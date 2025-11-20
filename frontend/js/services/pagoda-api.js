// js/services/pagoda-api.js
// Pagoda Tower Auspicious Light System API Service

(function(window) {
    'use strict';

    window.PagodaAPI = {
        
        // ========================================
        // TOWERS API
        // ========================================
        towers: {
            getAll: function(params = {}) {
                return TempleAPI.get('/pagoda/towers', params);
            },
            
            getById: function(id) {
                return TempleAPI.get(`/pagoda/towers/${id}`);
            },
            
            getStatistics: function(id) {
                return TempleAPI.get(`/pagoda/towers/${id}/statistics`);
            },
            
            create: function(data) {
                return TempleAPI.post('/pagoda/towers', data);
            },
            
            update: function(id, data) {
                return TempleAPI.put(`/pagoda/towers/${id}`, data);
            },
            
            delete: function(id) {
                return TempleAPI.delete(`/pagoda/towers/${id}`);
            }
        },

        // ========================================
        // BLOCKS API
        // ========================================
        blocks: {
            getAll: function(params = {}) {
                return TempleAPI.get('/pagoda/blocks', params);
            },
            
            getByTower: function(towerId) {
                return TempleAPI.get(`/pagoda/blocks/tower/${towerId}`);
            },
            
            getById: function(id) {
                return TempleAPI.get(`/pagoda/blocks/${id}`);
            },
            
            getLightMap: function(id, floor = 1) {
                return TempleAPI.get(`/pagoda/blocks/${id}/light-map`, { floor });
            },
            
            create: function(data) {
                return TempleAPI.post('/pagoda/blocks', data);
            },
            
            update: function(id, data) {
                return TempleAPI.put(`/pagoda/blocks/${id}`, data);
            },
            
            delete: function(id) {
                return TempleAPI.delete(`/pagoda/blocks/${id}`);
            },
            
            generateLights: function(id) {
                return TempleAPI.post(`/pagoda/blocks/${id}/generate-lights`);
            }
        },

        // ========================================
        // LIGHTS API
        // ========================================
        lights: {
            search: function(params = {}) {
                return TempleAPI.get('/pagoda/lights', params);
            },
            
            getById: function(id) {
                return TempleAPI.get(`/pagoda/lights/${id}`);
            },
            
            getNextAvailable: function(blockId = null) {
                const params = blockId ? { block_id: blockId } : {};
                return TempleAPI.get('/pagoda/lights/available/next', params);
            },
            
            checkAvailability: function(lightNumber) {
                return TempleAPI.get(`/pagoda/lights/check-availability/${lightNumber}`);
            },
            
            getStatistics: function(params = {}) {
                return TempleAPI.get('/pagoda/lights/statistics/overview', params);
            }
        },

        // ========================================
        // REGISTRATIONS API
        // ========================================
        registrations: {
            getAll: function(params = {}) {
                return TempleAPI.get('/pagoda/registrations', params);
            },
            
            getById: function(id) {
                return TempleAPI.get(`/pagoda/registrations/${id}`);
            },
            
            searchByReceipt: function(receiptNumber) {
                return TempleAPI.get(`/pagoda/registrations/search/receipt/${receiptNumber}`);
            },
            
            getExpiring: function(days = 30) {
                return TempleAPI.get('/pagoda/registrations/expiring/list', { days });
            },
            
            getStatistics: function(params = {}) {
                return TempleAPI.get('/pagoda/registrations/statistics/overview', params);
            },
            
            generateReceiptNumber: function() {
                return TempleAPI.get('/pagoda/registrations/generate/receipt-number');
            },
            
            create: function(data) {
                return TempleAPI.post('/pagoda/registrations', data);
            },
            
            update: function(id, data) {
                return TempleAPI.put(`/pagoda/registrations/${id}`, data);
            },
            
            renew: function(id, data) {
                return TempleAPI.post(`/pagoda/registrations/${id}/renew`, data);
            },
            
            terminate: function(id, reason) {
                return TempleAPI.post(`/pagoda/registrations/${id}/terminate`, { 
                    termination_reason: reason 
                });
            }
        },

        // ========================================
        // DEVOTEES API
        // ========================================
        devotees: {
            getAll: function(params = {}) {
                return TempleAPI.get('/pagoda/devotees', params);
            },
            
            getById: function(id) {
                return TempleAPI.get(`/pagoda/devotees/${id}`);
            },
            
            search: function(data) {
                return TempleAPI.post('/pagoda/devotees/search', data);
            },
            
            create: function(data) {
                return TempleAPI.post('/pagoda/devotees', data);
            },
            
            update: function(id, data) {
                return TempleAPI.put(`/pagoda/devotees/${id}`, data);
            }
        },

        // ========================================
        // SETTINGS API
        // ========================================
        settings: {
            getAll: function() {
                return TempleAPI.get('/pagoda/settings');
            },
            
            getByKey: function(key) {
                return TempleAPI.get(`/pagoda/settings/${key}`);
            },
            
            getBookingConfig: function() {
                return TempleAPI.get('/pagoda/settings/config/booking');
            },
            
            save: function(data) {
                return TempleAPI.post('/pagoda/settings', data);
            },
            
            bulkUpdate: function(settings) {
                return TempleAPI.post('/pagoda/settings/bulk-update', { settings });
            },
            
            delete: function(key) {
                return TempleAPI.delete(`/pagoda/settings/${key}`);
            }
        },

        // ========================================
        // REPORTS API
        // ========================================
        reports: {
            getDashboard: function() {
                return TempleAPI.get('/pagoda/reports/dashboard');
            },
            
            getRevenue: function(params = {}) {
                return TempleAPI.get('/pagoda/reports/revenue', params);
            },
            
            getOccupancy: function() {
                return TempleAPI.get('/pagoda/reports/occupancy');
            },
            
            getExpiryForecast: function(months = 6) {
                return TempleAPI.get('/pagoda/reports/expiry-forecast', { months });
            },
            
            getDevoteeAnalytics: function(params = {}) {
                return TempleAPI.get('/pagoda/reports/devotees', params);
            },
            
            exportRegistrations: function(params = {}) {
                return TempleAPI.download('/pagoda/reports/export/registrations', params);
            },
            
            exportRevenue: function(params = {}) {
                return TempleAPI.download('/pagoda/reports/export/revenue', params);
            },
            
            exportDevotees: function(params = {}) {
                return TempleAPI.download('/pagoda/reports/export/devotees', params);
            }
        },

        // ========================================
        // UTILITY FUNCTIONS
        // ========================================
        utils: {
            formatLightCode: function(towerCode, blockCode, floor, position) {
                return `${towerCode}-${blockCode}-${String(floor).padStart(2, '0')}-${String(position).padStart(3, '0')}`;
            },
            
            calculateExpiryDate: function(offerDate, months = 12) {
                const date = new Date(offerDate);
                date.setMonth(date.getMonth() + months);
                return date.toISOString().split('T')[0];
            },
            
            getDaysUntilExpiry: function(expiryDate) {
                const today = new Date();
                const expiry = new Date(expiryDate);
                const diffTime = expiry - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            },
            
            getStatusBadgeClass: function(status, type = 'light') {
                const colors = type === 'light' 
                    ? APP_CONFIG.PAGODA.STATUS_COLORS 
                    : APP_CONFIG.PAGODA.REGISTRATION_STATUS_COLORS;
                return `badge bg-${colors[status] || 'secondary'}`;
            },
            
            formatCurrency: function(amount, currency = 'MYR') {
                const symbol = APP_CONFIG.CURRENCY_SYMBOLS[currency] || currency;
                return `${symbol} ${parseFloat(amount).toFixed(2)}`;
            }
        }
    };

})(window);