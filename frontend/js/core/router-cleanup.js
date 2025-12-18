// Auto Cleanup Enhancement for router.js
// Add this code to your existing router.js file

(function($, window) {
    'use strict';
    
    // Store reference to original router methods
    const originalRouter = window.TempleRouter;
    
    // Enhance the existing router with cleanup functionality
    $.extend(window.TempleRouter, {
        
        // Store currently active modules/pages for cleanup tracking
        activeModules: new Set(),
        currentModulePage: null,
        
        // Enhanced renderPage method with auto cleanup
        renderPage: function(page, params) {
            // STEP 1: Auto cleanup before loading new page
            this.performAutoCleanup(page);
            
            // STEP 2: Call original renderPage method
            this.renderPageOriginal(page, params);
            
            // STEP 3: Track new page as active
            this.trackActivePage(page);
        },
        
        // Store original renderPage method
        renderPageOriginal: originalRouter.renderPage,
        
        // Enhanced navigate method with cleanup
        navigate: function(page, params) {
            console.log(`Navigating from "${this.currentPage}" to "${page}"`);
            
            // STEP 1: Cleanup before navigation
            this.performAutoCleanup(page);
            
            // STEP 2: Call original navigate method
            const templeId = TempleAPI.getTempleId();
            let url = '/' + templeId + '/' + page;
            console.log(url);
            
            // Handle routes with ID parameter (original logic)
            if (params && params.id) {
                if (page === 'reconciliation/process' ||
                    page === 'reconciliation/view' ||
                    page === 'reconciliation/report') {
                    url = '/' + templeId + '/' + page + '/' + params.id;
                }
                if (page === 'members/edit') {
                    url = '/' + templeId + '/members/' + params.id;
                }
                else if (page.includes('/edit') || page.includes('/view') || page.includes('/copy')) {
                    url = '/' + templeId + '/' + page + '/' + params.id;
                }
            }
            
            // Update URL without reload
            window.history.pushState({ page: page, params: params }, '', url);
            
            // Load the page
            this.loadPage(page, params);
        },
        
        // Auto cleanup before loading new page
        performAutoCleanup: function(newPage) {
            console.log('?? Performing auto cleanup...');
            
            // STRATEGY 1: Cleanup all registered page modules
            this.cleanupRegisteredModules();
            
            // STRATEGY 2: Cleanup by page pattern matching
            this.cleanupByPagePattern(newPage);
            
            // STRATEGY 3: Cleanup shared modules if switching modules
            this.cleanupSharedModules(newPage);
            
            // STRATEGY 4: Generic event cleanup
            this.cleanupGenericEvents();
            
            console.log('? Auto cleanup completed');
        },
        
        // Cleanup all registered page modules
        cleanupRegisteredModules: function() {
            // Look for all *Page objects with cleanup methods
            const pageModules = [];
            
            for (const key in window) {
                if (key.endsWith('Page') && 
                    window[key] && 
                    typeof window[key] === 'object' &&
                    typeof window[key].cleanup === 'function') {
                    pageModules.push(key);
                }
            }
            
            console.log(`Found ${pageModules.length} page modules with cleanup:`, pageModules);
            
            pageModules.forEach(moduleName => {
                try {
                    window[moduleName].cleanup();
                    console.log(`? Cleaned up: ${moduleName}`);
                } catch (error) {
                    console.warn(`?? Cleanup error for ${moduleName}:`, error);
                }
            });
        },
        
        // Cleanup by page pattern matching
        cleanupByPagePattern: function(newPage) {
            const currentModule = this.getModuleFromPage(this.currentPage);
            const newModule = this.getModuleFromPage(newPage);
            
            // If switching between different modules, cleanup current module
            if (currentModule && currentModule !== newModule) {
                console.log(`Switching modules: ${currentModule} ? ${newModule}`);
                this.cleanupModuleByName(currentModule);
            }
        },
        
        // Cleanup shared modules when switching between different modules
        cleanupSharedModules: function(newPage) {
            const newModule = this.getModuleFromPage(newPage);
            
            // List of known shared modules to check
            const sharedModules = [
                'DonationsSharedModule',
                'HallSharedModule',
                'RomSharedModule',
                'DharmaAssemblySharedModule',
                'BuddhaLampSharedModule',
                'OccasionsSharedModule',
                'SalesSharedModule'
            ];
            
            sharedModules.forEach(moduleName => {
                if (window[moduleName] && typeof window[moduleName].cleanup === 'function') {
                    const moduleType = moduleName.replace('SharedModule', '').toLowerCase();
                    
                    // Only cleanup shared module if we're leaving that module entirely
                    if (!newPage.toLowerCase().includes(moduleType)) {
                        try {
                            window[moduleName].cleanup();
                            console.log(`? Cleaned up shared module: ${moduleName}`);
                        } catch (error) {
                            console.warn(`?? Shared module cleanup error for ${moduleName}:`, error);
                        }
                    }
                }
            });
        },
        
        // Generic event and resource cleanup
        cleanupGenericEvents: function() {
            // Remove all events from page container
            $('#page-container').off();
            $('#page-container *').off();
            
            // Cleanup common animation libraries
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf("*");
                gsap.globalTimeline && gsap.globalTimeline.clear();
            }
            
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
            
            // Cleanup any DataTables
            if ($.fn.DataTable) {
                $('.dataTable').each(function() {
                    if ($.fn.DataTable.isDataTable(this)) {
                        $(this).DataTable().destroy();
                    }
                });
            }
            
            // Clear form validation states
            $('.was-validated').removeClass('was-validated');
            $('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
            
            console.log('?? Generic cleanup completed');
        },
        
        // Cleanup a specific module by name
        cleanupModuleByName: function(moduleName) {
            // Try different naming patterns
            const possibleModuleNames = [
                `${this.capitalize(moduleName)}CreatePage`,
                `${this.capitalize(moduleName)}ListingPage`,
                `${this.capitalize(moduleName)}EditPage`,
                `${this.capitalize(moduleName)}IndexPage`,
                `${this.capitalize(moduleName)}Page`,
                `${this.capitalize(moduleName)}SharedModule`
            ];
            
            possibleModuleNames.forEach(name => {
                if (window[name] && typeof window[name].cleanup === 'function') {
                    try {
                        window[name].cleanup();
                        console.log(`? Cleaned up module: ${name}`);
                    } catch (error) {
                        console.warn(`?? Module cleanup error for ${name}:`, error);
                    }
                }
            });
        },
        
        // Extract module name from page path
        getModuleFromPage: function(page) {
            if (!page) return null;
            
            const parts = page.split('/');
            
            // Convert different formats to module names
            // donations/create -> donations
            // hall-booking/list -> hall-booking
            // special-occasions -> special-occasions
            return parts[0];
        },
        
        // Track active page
        trackActivePage: function(page) {
            this.currentModulePage = page;
            const module = this.getModuleFromPage(page);
            if (module) {
                this.activeModules.add(module);
            }
        },
        
        // Helper function to capitalize strings
        capitalize: function(str) {
            return str.split('-')
                     .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                     .join('');
        },
        
        // Manual cleanup trigger (for debugging)
        forceCleanup: function() {
            console.log('?? Force cleanup triggered');
            this.performAutoCleanup(null);
        },
        
        // Get info about active modules (for debugging)
        getCleanupInfo: function() {
            const pageModules = [];
            const sharedModules = [];
            
            for (const key in window) {
                if (key.endsWith('Page') && window[key] && typeof window[key].cleanup === 'function') {
                    pageModules.push(key);
                }
                if (key.endsWith('SharedModule') && window[key] && typeof window[key].cleanup === 'function') {
                    sharedModules.push(key);
                }
            }
            
            return {
                currentPage: this.currentPage,
                currentModulePage: this.currentModulePage,
                activeModules: Array.from(this.activeModules),
                availablePageModules: pageModules,
                availableSharedModules: sharedModules
            };
        }
    });
    
    // Add cleanup on browser navigation (back/forward buttons)
    const originalLoadCurrentPage = originalRouter.loadCurrentPage;
    window.TempleRouter.loadCurrentPage = function() {
        const newPage = this.getCurrentPage();
        this.performAutoCleanup(newPage);
        originalLoadCurrentPage.call(this);
    };
    
    // Add cleanup on page unload
    $(window).on('beforeunload', function() {
        console.log('?? Page unload cleanup');
        if (window.TempleRouter && window.TempleRouter.performAutoCleanup) {
            window.TempleRouter.performAutoCleanup(null);
        }
    });
    
    // Debug: Add global cleanup trigger
    window.debugCleanup = function() {
        console.log('Debug cleanup info:', window.TempleRouter.getCleanupInfo());
        window.TempleRouter.forceCleanup();
    };
    
    console.log('?? Auto cleanup enhancement loaded for TempleRouter');
    
})(jQuery, window);

// ========================================
// INTEGRATION INSTRUCTIONS:
// ========================================
// 
// 1. Add this code to the END of your existing router.js file
// 
// 2. Or create a separate file (router-cleanup.js) and load it AFTER router.js:
//    <script src="/js/core/router.js"></script>
//    <script src="/js/core/router-cleanup.js"></script>
//
// 3. Your modules will be automatically cleaned up when:
//    - Navigating via sidebar menu
//    - Using TempleRouter.navigate()
//    - Browser back/forward buttons
//    - Page refresh/unload
//
// 4. Debug commands available in console:
//    debugCleanup() - Show cleanup info and force cleanup
//    TempleRouter.getCleanupInfo() - Get current state info
//
// ========================================