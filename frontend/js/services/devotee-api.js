// js/services/devotee-api.js
// Sales Devotees API Service (for devotees table)

(function (window) {
    'use strict';

    window.DevoteeAPI = {
        // ========================================
        // DEVOTEES API (Sales Module)
        // ========================================
        devotees: {
            // Get all devotees (with pagination and filters)
            getAll: function (params = {}) {
                return TempleAPI.get('/devotees', params);
            },

            // Get single devotee by ID
            getById: function (id) {
                return TempleAPI.get(`/devotees/${id}`);
            },

            // Get active devotees only
            getActive: function (params = {}) {
                return TempleAPI.get('/devotees/active', params);
            },

            // Get devotees by customer type
            getByType: function (type) {
                return TempleAPI.get(`/devotees/type/${type}`);
            },

            // Get customer types
            getCustomerTypes: function () {
                return TempleAPI.get('/devotees/customer-types');
            },

            // Create new devotee
            create: function (data) {
                return TempleAPI.post('/devotees', data);
            },

            // Update devotee
            update: function (id, data) {
                return TempleAPI.put(`/devotees/${id}`, data);
            },

            // Delete devotee
            delete: function (id) {
                return TempleAPI.delete(`/devotees/${id}`);
            },

            // Toggle active status
            toggleStatus: function (id) {
                return TempleAPI.patch(`/devotees/${id}/toggle-status`);
            },

            // Toggle verified status
            toggleVerified: function (id) {
                return TempleAPI.patch(`/devotees/${id}/toggle-verified`);
            },

            // Export devotees
            export: function (params = {}) {
                return TempleAPI.download('/devotees/export', params);
            }
        }
    };

})(window);
