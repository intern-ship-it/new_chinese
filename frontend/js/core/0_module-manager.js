// js/core/module-manager.js
// Dynamic Module Management System

(function($, window) {
    'use strict';
    
    window.TempleModuleManager = {
        // Registry to store active modules
        activeModules: new Map(),
        currentRoute: null,
        
        // Register a module when it's loaded
        register: function(moduleName, moduleInstance) {
            this.activeModules.set(moduleName, moduleInstance);
            console.log(`Module registered: ${moduleName}`);
        },
        
        // Unregister a module
        unregister: function(moduleName) {
            const module = this.activeModules.get(moduleName);
            if (module && typeof module.cleanup === 'function') {
                try {
                    module.cleanup();
                    console.log(`Module cleaned up: ${moduleName}`);
                } catch (error) {
                    console.warn(`Error cleaning up module ${moduleName}:`, error);
                }
            }
            this.activeModules.delete(moduleName);
        },
        
        // Cleanup all active modules
        cleanupAll: function() {
            for (const [moduleName, module] of this.activeModules) {
                if (module && typeof module.cleanup === 'function') {
                    try {
                        module.cleanup();
                        console.log(`Module cleaned up: ${moduleName}`);
                    } catch (error) {
                        console.warn(`Error cleaning up module ${moduleName}:`, error);
                    }
                }
            }
            this.activeModules.clear();
        },
        
        // Cleanup modules for a specific route
        cleanupForRoute: function(newRoute) {
            const newModuleName = this.getModuleNameFromRoute(newRoute);
            
            for (const [moduleName, module] of this.activeModules) {
                // Only cleanup modules that are not part of the new route
                if (moduleName !== newModuleName) {
                    this.unregister(moduleName);
                }
            }
            
            this.currentRoute = newRoute;
        },
        
        // Get module name from route
        getModuleNameFromRoute: function(route) {
            if (!route) return null;
            const parts = route.split('/');
            return parts[0]; // First part is the module name
        },
        
        // Enhanced navigation with cleanup
        navigate: function(route, params = {}) {
            // Cleanup modules for the new route
            this.cleanupForRoute(route);
            
            // Continue with normal navigation
            if (window.TempleRouter && typeof window.TempleRouter.navigate === 'function') {
                return window.TempleRouter.navigate(route, params);
            }
        },
        
        // Auto-register modules by scanning window object
        autoRegister: function() {
            const modulePatterns = [
                /^(.+)CreatePage$/,
                /^(.+)ListingPage$/,
                /^(.+)Page$/
            ];
            
            for (const key in window) {
                if (window.hasOwnProperty(key)) {
                    for (const pattern of modulePatterns) {
                        const match = key.match(pattern);
                        if (match) {
                            const moduleName = this.camelCaseToKebab(match[1]);
                            this.register(moduleName, window[key]);
                            break;
                        }
                    }
                }
            }
        },
        
        // Convert camelCase to kebab-case
        camelCaseToKebab: function(str) {
            return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        },
        
        // Initialize the module manager
        init: function() {
            // Auto-register existing modules
            this.autoRegister();
            
            // Set up periodic cleanup check
            setInterval(() => {
                this.autoRegister();
            }, 5000);
            
            // Cleanup on page unload
            $(window).on('beforeunload', () => {
                this.cleanupAll();
            });
        }
    };
    
})(jQuery, window);

// Initialize the module manager
$(document).ready(function() {
    TempleModuleManager.init();
});