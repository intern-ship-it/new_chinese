// frontend/js/services/donation-api.js
// Donation API Service - FINAL WORKING VERSION

(function (window) {
    'use strict';

    window.DonationAPI = {
        /**
         * Get all donation masters with filters
         * @param {Object} params - Query parameters (page, per_page, type, status, search)
         * @returns {Promise}
         */
        list: function (params) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            // Build query string - ADD LEADING SLASH
            let endpoint = '/donation-masters';
            if (params && Object.keys(params).length > 0) {
                const queryString = $.param(params);
                endpoint = '/donation-masters?' + queryString;
            }

            return window.TempleAPI.get(endpoint);
        },

        /**
         * Get single donation master by ID
         * @param {string|number} id - Donation master ID
         * @returns {Promise}
         */
        get: function (id) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            const endpoint = '/donation-masters/' + id;
            return window.TempleAPI.get(endpoint);
        },

        /**
         * Create new donation master
         * @param {Object} data - Donation data
         * @returns {Promise}
         */
        create: function (data) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            return window.TempleAPI.post('/donation-masters', data);
        },

        /**
         * Update donation master
         * @param {string|number} id - Donation master ID
         * @param {Object} data - Updated data
         * @returns {Promise}
         */
        update: function (id, data) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            const endpoint = '/donation-masters/' + id;
            return window.TempleAPI.put(endpoint, data);
        },

        /**
         * Delete donation master
         * @param {string|number} id - Donation master ID
         * @returns {Promise}
         */
        delete: function (id) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            const endpoint = '/donation-masters/' + id;
            return window.TempleAPI.delete(endpoint);
        },

        /**
         * Get active donations for dropdown
         * @param {string} type - Optional type filter
         * @returns {Promise}
         */
        getActive: function (type) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            let endpoint = '/donation-masters/active';
            if (type) {
                endpoint = '/donation-masters/active?type=' + type;
            }

            return window.TempleAPI.get(endpoint);
        },

        /**
         * Get user permissions
         * @param {string|number} userId - User ID
         * @returns {Promise}
         */
        getUserPermissions: function (userId) {
            if (typeof window.TempleAPI === 'undefined') {
                console.error('TempleAPI is not loaded');
                return Promise.reject(new Error('TempleAPI not available'));
            }

            const endpoint = '/donation-masters/user/' + userId + '/permissions';
            return window.TempleAPI.get(endpoint);
        }
    };

    console.log('✅ DonationAPI initialized successfully');

})(window);