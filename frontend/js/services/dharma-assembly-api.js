// frontend/js/services/dharma-assembly-api.js
// API service for Dharma Assembly module

(function($, window) {
    'use strict';
    
    window.DharmaAssemblyAPI = {
        
        // ========================================
        // MASTERS API
        // ========================================
        masters: {
            /**
             * Get all masters
             */
            getAll: function(params = {}) {
                return TempleAPI.get('/dharma-assembly/masters', params);
            },
            
            /**
             * Get single master by ID
             */
            getById: function(id) {
                return TempleAPI.get(`/dharma-assembly/masters/${id}`);
            },
            
            /**
             * Get active masters only
             */
            getActive: function() {
                return TempleAPI.get('/dharma-assembly/masters/active/list');
            },
            
            /**
             * Get statistics
             */
            getStatistics: function() {
                return TempleAPI.get('/dharma-assembly/masters/statistics/overview');
            },
            
            /**
             * Create new master
             */
            create: function(data) {
                return TempleAPI.post('/dharma-assembly/masters', data);
            },
            
            /**
             * Update master
             */
            update: function(id, data) {
                return TempleAPI.put(`/dharma-assembly/masters/${id}`, data);
            },
            
            /**
             * Delete master (soft delete)
             */
            delete: function(id) {
                return TempleAPI.delete(`/dharma-assembly/masters/${id}`);
            },
            
            /**
             * Toggle master status
             */
            toggleStatus: function(id) {
                return TempleAPI.patch(`/dharma-assembly/masters/${id}/toggle-status`);
            },
            
            /**
             * Duplicate master
             */
            duplicate: function(id) {
                return TempleAPI.post(`/dharma-assembly/masters/${id}/duplicate`);
            }
        }
        
        // Future: Add bookings API here
        // bookings: { ... }
    };
    
})(jQuery, window);