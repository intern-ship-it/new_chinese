// js/core/css-manager.js
// Dynamic CSS Management System

(function($, window) {
    'use strict';
    
    window.TempleCSSManager = {
        loadedStyles: new Map(),
        
        // Load CSS with automatic cleanup tracking
        loadCSS: function(moduleId, cssPath, scope = null) {
            if (this.loadedStyles.has(moduleId)) {
                console.log(`CSS already loaded for module: ${moduleId}`);
                return Promise.resolve();
            }
            
            return new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.id = `${moduleId}-css`;
                link.rel = 'stylesheet';
                link.href = cssPath;
                
                link.onload = () => {
                    this.loadedStyles.set(moduleId, {
                        element: link,
                        scope: scope,
                        path: cssPath
                    });
                    console.log(`CSS loaded for module: ${moduleId}`);
                    resolve();
                };
                
                link.onerror = () => {
                    console.error(`Failed to load CSS for module: ${moduleId}`);
                    reject(new Error(`Failed to load CSS: ${cssPath}`));
                };
                
                document.head.appendChild(link);
            });
        },
        
        // Load CSS as inline styles with scoping
        loadScopedCSS: function(moduleId, cssContent, scopeSelector) {
            if (this.loadedStyles.has(moduleId)) {
                console.log(`Scoped CSS already loaded for module: ${moduleId}`);
                return;
            }
            
            // Add scope prefix to all CSS rules
            const scopedCSS = this.scopeCSS(cssContent, scopeSelector);
            
            const style = document.createElement('style');
            style.id = `${moduleId}-css`;
            style.textContent = scopedCSS;
            document.head.appendChild(style);
            
            this.loadedStyles.set(moduleId, {
                element: style,
                scope: scopeSelector,
                content: scopedCSS,
                isInline: true
            });
            
            console.log(`Scoped CSS loaded for module: ${moduleId}`);
        },
        
        // Remove CSS for a specific module
        removeCSS: function(moduleId) {
            const styleInfo = this.loadedStyles.get(moduleId);
            if (styleInfo && styleInfo.element) {
                styleInfo.element.remove();
                this.loadedStyles.delete(moduleId);
                console.log(`CSS removed for module: ${moduleId}`);
                return true;
            }
            return false;
        },
        
        // Remove all CSS for modules except specified ones
        removeAllExcept: function(keepModules = []) {
            for (const [moduleId, styleInfo] of this.loadedStyles) {
                if (!keepModules.includes(moduleId)) {
                    if (styleInfo.element) {
                        styleInfo.element.remove();
                        console.log(`CSS removed for module: ${moduleId}`);
                    }
                    this.loadedStyles.delete(moduleId);
                }
            }
        },
        
        // Scope CSS rules to a specific selector
        scopeCSS: function(cssContent, scopeSelector) {
            // Simple CSS scoping - adds scope selector before each rule
            // This is a basic implementation, you might want to use a more robust CSS parser
            
            return cssContent.replace(/([^{}]+)\s*{/g, (match, selectors) => {
                // Skip @rules like @media, @keyframes
                if (selectors.trim().startsWith('@')) {
                    return match;
                }
                
                // Split multiple selectors
                const scopedSelectors = selectors
                    .split(',')
                    .map(selector => {
                        const trimmed = selector.trim();
                        if (trimmed.startsWith(scopeSelector)) {
                            return trimmed;
                        }
                        return `${scopeSelector} ${trimmed}`;
                    })
                    .join(', ');
                
                return `${scopedSelectors} {`;
            });
        },
        
        // Get all loaded modules
        getLoadedModules: function() {
            return Array.from(this.loadedStyles.keys());
        },
        
        // Check if module CSS is loaded
        isLoaded: function(moduleId) {
            return this.loadedStyles.has(moduleId);
        },
        
        // Cleanup all CSS
        cleanup: function() {
            for (const [moduleId, styleInfo] of this.loadedStyles) {
                if (styleInfo.element) {
                    styleInfo.element.remove();
                }
            }
            this.loadedStyles.clear();
            console.log('All module CSS cleaned up');
        }
    };
    
    // Enhanced module base class
    window.TempleModuleBase = {
        // Enhanced CSS loading
        loadCSS: function(cssPath, useScoping = false) {
            if (!this.moduleId) {
                console.error('Module must define moduleId for CSS management');
                return;
            }
            
            if (useScoping) {
                // Load CSS content and apply scoping
                fetch(cssPath)
                    .then(response => response.text())
                    .then(cssContent => {
                        const scopeSelector = `.${this.moduleId}-page`;
                        TempleCSSManager.loadScopedCSS(this.moduleId, cssContent, scopeSelector);
                    })
                    .catch(error => {
                        console.error(`Failed to load scoped CSS for ${this.moduleId}:`, error);
                        // Fallback to regular loading
                        TempleCSSManager.loadCSS(this.moduleId, cssPath);
                    });
            } else {
                return TempleCSSManager.loadCSS(this.moduleId, cssPath);
            }
        },
        
        // Enhanced cleanup
        cleanup: function() {
            if (this.moduleId) {
                TempleCSSManager.removeCSS(this.moduleId);
            }
            
            // Cleanup animations, events, etc.
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf("*");
            }
            
            if (this.eventNamespace) {
                $(document).off(`.${this.eventNamespace}`);
            }
        }
    };
    
})(jQuery, window);

// Usage example in your modules:
/*
window.DonationsCreatePage = {
    ...TempleModuleBase,
    moduleId: 'donations',
    eventNamespace: 'donations',
    
    init: function(params) {
        this.loadCSS('/css/donations.css', true); // Use scoping
        this.render();
        // ... rest of init
    },
    
    // Your other methods...
};
*/