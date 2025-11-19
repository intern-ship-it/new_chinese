// js/core/router.js
// Dynamic page routing system with support for member ID in URL - FIXED FOR EDIT ROUTES

(function ($, window) {
    'use strict';

    window.TempleRouter = {
        currentPage: null,
        pageCache: {},

        // Initialize router
        init: function () {
            const self = this;

            // Handle browser back/forward
            window.addEventListener('popstate', function (event) {
                self.loadCurrentPage();
            });

            // Get current page from URL
            this.loadCurrentPage();
        },

        // Get current page from URL
        getCurrentPage: function () {
            const pathParts = window.location.pathname.split('/').filter(Boolean);

            // Remove temple ID from path
            if (pathParts.length > 0) {
                pathParts.shift(); // Remove temple ID
            }
            if (pathParts[0] === 'fund-budget-templates') {
                return 'fund-budget-templates';
            }
            // If no page specified, use default
            if (pathParts.length === 0) {
                return APP_CONFIG.ROUTES.DEFAULT_PAGE;
            }
            if (pathParts[0] === 'reconciliation') {
                // Handle reconciliation/process/27
                if (pathParts[1] === 'process' && pathParts[2]) {
                    return 'reconciliation/process';
                }
                // Handle reconciliation/27/process
                if (pathParts[1] && !isNaN(pathParts[1]) && pathParts[2] === 'process') {
                    return 'reconciliation/process';
                }
                // Handle reconciliation/view/27 or reconciliation/27/view
                if (pathParts[1] === 'view' && pathParts[2]) {
                    return 'reconciliation/view';
                }
                if (pathParts[1] && !isNaN(pathParts[1]) && pathParts[2] === 'view') {
                    return 'reconciliation/view';
                }
                // Handle reconciliation/report/27
                if (pathParts[1] === 'report' && pathParts[2]) {
                    return 'reconciliation/report';
                }
            }
            // Handle purchase routes with view/edit/print actions
            if (pathParts[0] === 'purchase' && pathParts.length >= 4) {
                const module = pathParts[1]; // e.g., 'invoices'
                const action = pathParts[2]; // e.g., 'view', 'edit', 'print'
                const id = pathParts[3]; // The ID parameter

                if (['view', 'edit', 'print'].includes(action) && id) {
                    // Return the route without the ID
                    // e.g., purchase/invoices/view
                    return `${pathParts[0]}/${pathParts[1]}/${pathParts[2]}`;
                }
            }
            if (pathParts.length === 4 && pathParts[2] === 'print') {
                // Return the print page path
                return pathParts.slice(0, 3).join('/'); // returns "purchase/requests/print"
            }
            // Check if it's a member detail page with UUID
            // Pattern: members/uuid (where uuid is 36 characters with dashes)
            if (pathParts.length === 2 && pathParts[0] === 'members') {
                const possibleUuid = pathParts[1];
                // UUID pattern: 8-4-4-4-12 characters
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

                if (uuidPattern.test(possibleUuid)) {
                    // It's a member edit page with UUID
                    return 'members/edit';
                }
            }

            // Check for edit/view routes with ID parameter
            // Pattern: entries/receipt/edit/1 or entries/payment/view/2
            if (pathParts.length >= 4) {
                const lastPart = pathParts[pathParts.length - 1];
                const secondLastPart = pathParts[pathParts.length - 2];

                // Check if last part is a number (ID) and second last is edit/view/copy
                if (/^\d+$/.test(lastPart) && ['edit', 'view', 'copy'].includes(secondLastPart)) {
                    // Return path without the ID
                    return pathParts.slice(0, -1).join('/');
                }
            }

            // Join remaining parts with /
            return pathParts.join('/');
        },

        // Get parameters from URL
        getUrlParams: function () {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const params = {};

            // Remove temple ID
            if (pathParts.length > 0) {
                pathParts.shift();
            }
            if (pathParts[0] === 'reconciliation') {
                // Handle reconciliation/process/27
                if (pathParts[1] === 'process' && pathParts[2]) {
                    params.id = pathParts[2];
                }
                // Handle reconciliation/27/process
                else if (pathParts[1] && !isNaN(pathParts[1]) && pathParts[2] === 'process') {
                    params.id = pathParts[1];
                }
                // Handle reconciliation/view/27
                else if (pathParts[1] === 'view' && pathParts[2]) {
                    params.id = pathParts[2];
                }
                // Handle reconciliation/27/view
                else if (pathParts[1] && !isNaN(pathParts[1]) && pathParts[2] === 'view') {
                    params.id = pathParts[1];
                }
                // Handle reconciliation/report/27
                else if (pathParts[1] === 'report' && pathParts[2]) {
                    params.id = pathParts[2];
                }
            }
            // Handle purchase routes with ID parameter
            if (pathParts[0] === 'purchase' && pathParts.length >= 4) {
                const action = pathParts[2];
                const id = pathParts[3];

                if (['view', 'edit', 'print'].includes(action) && id) {
                    params.id = id;
                }
            }
            if (pathParts.length === 4 && pathParts[2] === 'print') {
                params.id = pathParts[3];
            }

            // Check for member UUID
            if (pathParts.length === 2 && pathParts[0] === 'members') {
                const possibleUuid = pathParts[1];
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

                if (uuidPattern.test(possibleUuid)) {
                    params.id = possibleUuid;
                }
            }

            // Check for edit/view/copy routes with ID
            if (pathParts.length >= 4) {
                const lastPart = pathParts[pathParts.length - 1];
                const secondLastPart = pathParts[pathParts.length - 2];

                // Check if last part is a number (ID) and second last is edit/view/copy
                if (/^\d+$/.test(lastPart) && ['edit', 'view', 'copy'].includes(secondLastPart)) {
                    params.id = lastPart;
                }
            }

            return params;
        },

        // Navigate to page
        navigate: function (page, params) {
            const templeId = TempleAPI.getTempleId();
            let url = '/' + templeId + '/' + page;
            console.log(url);
            // Handle routes with ID parameter
            if (params && params.id) {
                if (page === 'reconciliation/process' ||
                    page === 'reconciliation/view' ||
                    page === 'reconciliation/report') {
                    url = '/' + templeId + '/' + page + '/' + params.id;
                }
                // For member edit
                if (page === 'members/edit') {
                    url = '/' + templeId + '/members/' + params.id;
                }
                // For entries edit/view/copy - append the ID to the URL
                else if (page.includes('/edit') || page.includes('/view') || page.includes('/copy')) {
                    url = '/' + templeId + '/' + page + '/' + params.id;
                }
            }

            // Update URL without reload
            window.history.pushState({ page: page, params: params }, '', url);

            // Load the page
            this.loadPage(page, params);
        },

        // Load current page based on URL
        loadCurrentPage: function () {
            const page = this.getCurrentPage();
            const params = this.getUrlParams();
            console.log('Loading page:', page, 'with params:', params); // Debug log
            this.loadPage(page, params);
        },

        // Load a specific page
        loadPage: function (page, params) {
            const self = this;

            // Special handling for login page
            if (page === 'login') {
                this.loadLoginPage();
                return;
            }

            // Check authentication for other pages
            if (!this.checkAuth()) {
                return;
            }

            // Show loader
            this.showLoader(true);

            // Map page to file path with new structure
            const scriptPath = this.getScriptPath(page);
            console.log('Script path:', scriptPath); // Debug log

            // Check if page is already loaded
            if (this.pageCache[page]) {
                this.renderPage(page, params);
                return;
            }

            // Load page script dynamically
            $.getScript(scriptPath)
                .done(function () {
                    self.pageCache[page] = true;
                    self.renderPage(page, params);
                })
                .fail(function () {
                    console.error('Failed to load page:', page);
                    self.show404();
                })
                .always(function () {
                    self.showLoader(false);
                });
        },

        // Get script path based on new directory structure
        getScriptPath: function (page) {
            const parts = page.split('/');

            // Special handling for entries routes
            if (parts[0] === 'entries' && parts.length >= 3) {
                return '/js/pages/' + parts.join('/') + '.js';
            }
            if (parts[0] === 'purchase' && parts.length >= 3) {
                // purchase/requests/print -> /js/pages/purchase/requests/print.js
                return '/js/pages/' + parts.join('/') + '.js';
            }

            // Handle reconciliation routes
            // if (parts[0] === 'reconciliation') {
            //     // reconciliation -> /js/pages/reconciliation/index.js
            //     // reconciliation/process -> /js/pages/reconciliation/process.js
            //     if (parts.length === 1) {
            //         return '/js/pages/reconciliation/index.js';
            //     } else {
            //         return '/js/pages/reconciliation/' + parts[1] + '.js';
            //     }
            // }

            // Handle accounts/reconciliation routes
            if (parts[0] === 'accounts' && parts[1] === 'reconciliation') {
                // accounts/reconciliation -> /js/pages/accounts/reconciliation/index.js
                // accounts/reconciliation/process -> /js/pages/accounts/reconciliation/process.js
                if (parts.length === 2) {
                    return '/js/pages/accounts/reconciliation/index.js';
                } else {
                    return '/js/pages/accounts/reconciliation/' + parts[2] + '.js';
                }
            }

            // Rest of the logic remains the same...
            if (parts.length === 1) {
                return '/js/pages/' + parts[0] + '/index.js';
            } else if (parts.length === 2) {
                return '/js/pages/' + parts[0] + '/' + parts[1] + '.js';
            } else {
                const folder = parts.slice(0, -1).join('/');
                const file = parts[parts.length - 1];
                return '/js/pages/' + folder + '/' + file + '.js';
            }
        },

        // Render loaded page
        renderPage: function (page, params) {
            // Get page module name
            const moduleName = this.getModuleName(page);
            console.log('Looking for module:', moduleName); // Debug log

            // Check if page module exists
            if (window[moduleName] && typeof window[moduleName].init === 'function') {
                // Clear current page content
                $('#page-container').empty();

                // Initialize the page with params
                window[moduleName].init(params);

                // Update current page
                this.currentPage = page;

                // Update sidebar active state
                this.updateSidebarActive(page);

                // Update page title
                this.updatePageTitle(page);

                // Trigger page change event
                $(window).trigger('pagechange');
            } else {
                console.error('Page module not found:', moduleName);
                // Try alternative module names for entries
                if (page.startsWith('entries/')) {
                    const alternativeModuleName = this.getAlternativeModuleName(page);
                    console.log('Trying alternative module:', alternativeModuleName);

                    if (window[alternativeModuleName] && typeof window[alternativeModuleName].init === 'function') {
                        $('#page-container').empty();
                        window[alternativeModuleName].init(params);
                        this.currentPage = page;
                        this.updateSidebarActive(page);
                        this.updatePageTitle(page);
                        $(window).trigger('pagechange');
                        return;
                    }
                }
                this.show404();
            }
        },

        // Load login page
        loadLoginPage: function () {
            const self = this;

            // Hide main app, show loader
            $('#app').hide();
            $('#app-loader').show();

            $.getScript('/js/pages/login/index.js')
                .done(function () {
                    if (window.LoginPage && typeof window.LoginPage.init === 'function') {
                        // Clear body and init login
                        $('body').empty();
                        window.LoginPage.init();
                    }
                })
                .fail(function () {
                    console.error('Failed to load login page');
                    self.showError('Failed to load login page');
                });
        },

        // Get module name from page path
        getModuleName: function (page) {
            // Convert path to module name
            // dashboard -> DashboardPage
            // member_type/create -> MemberTypeCreatePage
            // members/edit -> MembersEditPage
            // entries/receipt/edit -> EntriesReceiptEditPage

            console.log('Getting module name for page:', page);

            const parts = page.split('/');
            let moduleName = '';

            parts.forEach(function (part) {
                // Handle hyphenated names (credit-note -> CreditNote)
                const words = part.split(/[-_]/);
                words.forEach(function (word) {
                    moduleName += word.charAt(0).toUpperCase() + word.slice(1);
                });
            });

            const finalModuleName = moduleName + 'Page';
            console.log('Generated module name:', finalModuleName);
            return finalModuleName;
        },

        // Get alternative module name for entries
        getAlternativeModuleName: function (page) {
            // For entries, try with "Entries" prefix
            // entries/receipt/edit -> EntriesReceiptEditPage
            const parts = page.split('/');
            if (parts[0] === 'entries' && parts.length >= 3) {
                let moduleName = 'Entries';
                for (let i = 1; i < parts.length; i++) {
                    const words = parts[i].split(/[-_]/);
                    words.forEach(function (word) {
                        moduleName += word.charAt(0).toUpperCase() + word.slice(1);
                    });
                }
                return moduleName + 'Page';
            }
            return null;
        },

        // Check authentication
        checkAuth: function () {
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            const temple = localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE);

            if (!token || !temple) {
                TempleAPI.redirectToLogin();
                return false;
            }

            return true;
        },

        // Update sidebar active state
        updateSidebarActive: function (page) {
            $('.sidebar .nav-link').removeClass('active');

            // Find matching link
            const pageName = page.split('/')[0];
            $('.sidebar .nav-link[data-page="' + pageName + '"]').addClass('active');

            // For entries pages, also highlight the entries menu
            if (page.startsWith('entries/')) {
                $('.sidebar .nav-link[data-page="entries"]').addClass('active');
                // Also highlight specific entry type if in create mode
                if (page.includes('/create')) {
                    $('.sidebar .nav-link[data-page="' + page + '"]').addClass('active');
                }
            }
        },

        // Update page title
        updatePageTitle: function (page) {
            const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
            let pageName = page.replace(/_/g, ' ').replace(/\//g, ' - ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Special handling for member edit
            if (page === 'members/edit') {
                const params = this.getUrlParams();
                if (params.id) {
                    pageName = 'Edit Member';
                }
            }

            // Special handling for entries edit/view/copy
            if (page.includes('entries/') && (page.includes('/edit') || page.includes('/view') || page.includes('/copy'))) {
                const params = this.getUrlParams();
                if (params.id) {
                    const action = page.includes('/edit') ? 'Edit' : page.includes('/view') ? 'View' : 'Copy';
                    const type = page.split('/')[1].replace(/-/g, ' ').split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    pageName = `${action} ${type}`;
                }
            }

            document.title = pageName + ' - ' + (temple.name || 'Temple Management System');
        },

        // Show loader
        showLoader: function (show) {
            if (show) {
                $('#page-container').html(`
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading page...</p>
                    </div>
                `);
            }
        },

        // Show 404 page
        show404: function () {
            $('#page-container').html(`
                <div class="text-center py-5">
                    <h1 class="display-1">404</h1>
                    <p class="fs-3"><span class="text-danger">Oops!</span> Page not found.</p>
                    <p class="lead">The page you're looking for doesn't exist.</p>
                    <a href="#" onclick="TempleRouter.navigate('dashboard'); return false;" class="btn btn-primary">Go to Dashboard</a>
                </div>
            `);
        },

        // Show error message
        showError: function (message) {
            $('#page-container').html(`
                <div class="alert alert-danger m-3">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                </div>
            `);
        }
    };

})(jQuery, window);