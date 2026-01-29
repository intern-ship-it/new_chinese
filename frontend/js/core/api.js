// js/core/api.js
// Centralized API handler using jQuery - Updated with Temple Settings

(function($, window) {
    'use strict';
    
    window.TempleAPI = {
        // Get base URL from config
        getBaseUrl: function() {
            return window.APP_CONFIG.API.BASE_URL;
        },
        
        // Get current temple from URL
        getTempleId: function() {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            return pathParts[0] || null;
        },
        
        // Get headers for request
        getHeaders: function() {
            const headers = {
                'Content-Type': 'application/json',
                'X-Temple-ID': this.getTempleId()
            };
            
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            return headers;
        },
        
        // Make API request
        request: function(options) {
            const self = this;
            const deferred = $.Deferred();
            
            const settings = $.extend({
                url: this.getBaseUrl() + options.endpoint,
                method: options.method || 'GET',
                headers: this.getHeaders(),
                timeout: APP_CONFIG.API.TIMEOUT,
                dataType: 'json'
            }, options);
            
            // Add data for POST/PUT requests
        if (settings.data && (settings.method === 'POST' || settings.method === 'PUT' || settings.method === 'PATCH')) {

                settings.data = JSON.stringify(settings.data);
            }
            
            $.ajax(settings)
                .done(function(response) {
                    deferred.resolve(response);
                })
                .fail(function(xhr, status, error) {
                    // Handle 401 Unauthorized
                    if (xhr.status === 401) {
                        self.handleUnauthorized().then(function() {
                            // Retry request with new token
                            self.request(options).then(
                                response => deferred.resolve(response),
                                error => deferred.reject(error)
                            );
                        }).fail(function() {
                            deferred.reject(xhr);
                        });
                    } else {
                        deferred.reject(xhr);
                    }
                });
            
            return deferred.promise();
        },
        
        // Handle unauthorized response
        handleUnauthorized: function() {
            const self = this;
            const deferred = $.Deferred();
            
            const refreshToken = localStorage.getItem(APP_CONFIG.STORAGE.REFRESH_TOKEN);
            if (!refreshToken) {
                const currentPath = window.location.pathname;
				if (!currentPath.includes('/login')) {
					this.redirectToLogin();
				}
				deferred.reject();
				return deferred.promise();
            }
            
            $.ajax({
                url: this.getBaseUrl() + '/auth/refresh',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Temple-ID': this.getTempleId()
                },
                data: JSON.stringify({
                    refresh_token: refreshToken,
                    temple_id: this.getTempleId()
                })
            }).done(function(response) {
                if (response.success && response.data.access_token) {
                    localStorage.setItem(APP_CONFIG.STORAGE.ACCESS_TOKEN, response.data.access_token);
                    deferred.resolve();
                } else {
                    self.redirectToLogin();
                    deferred.reject();
                }
            }).fail(function() {
                self.redirectToLogin();
                deferred.reject();
            });
            
            return deferred.promise();
        },
        
        // Redirect to login
        redirectToLogin: function() {
            const currentPath = window.location.pathname;
    
			// Prevent redirect loop - don't redirect if already on login page
			if (currentPath.includes('/login')) {
				console.log('Already on login page, skipping redirect');
				return;
			}
			
			const templeId = this.getTempleId();
			window.location.href = '/' + templeId + '/login';
        },
        
        // Convenience methods
        get: function(endpoint, params) {
            return this.request({
                method: 'GET',
                endpoint: endpoint,
                data: params
            });
        },
        
        post: function(endpoint, data) {
            return this.request({
                method: 'POST',
                endpoint: endpoint,
                data: data
            });
        },
        
        put: function(endpoint, data) {
            return this.request({
                method: 'PUT',
                endpoint: endpoint,
                data: data
            });
        },
        patch: function(endpoint, data) {
    return this.request({
        method: 'PATCH',
        endpoint: endpoint,
        data: data
    });
},
		postFormData: function(endpoint, formData) {
			return $.ajax({
				url: this.getBaseUrl() + endpoint,
				method: 'POST',
				data: formData,
				processData: false,  // Important: Don't process FormData
				contentType: false,  // Important: Let browser set multipart boundary
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
					'X-Temple-ID': this.getTempleId()
				},
				timeout: APP_CONFIG.API.TIMEOUT,
				dataType: 'json'
			});
		},
        
        delete: function(endpoint) {
            return this.request({
                method: 'DELETE',
                endpoint: endpoint
            });
        },
        
        // Special login method (doesn't require auth)
        login: function(username, password, requestThrough) {
            const templeId = this.getTempleId();
            
            return $.ajax({
                url: this.getBaseUrl() + '/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Temple-ID': templeId
                },
                data: JSON.stringify({
                    username: username,
                    password: password,
                    request_through: requestThrough || 'COUNTER',
                    temple_id: templeId
                }),
                dataType: 'json'
            });
        },
        
        // Validate temple
        validateTemple: function(templeId) {
            return $.ajax({
                url: this.getBaseUrl() + '/temple/validate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    temple_id: templeId
                }),
                dataType: 'json'
            });
        },
        
        // Get temple settings - NEW METHOD
        getTempleSettings: function() {
            return this.get('/temple/settings');
        },
        
        // Update temple settings - NEW METHOD
        updateTempleSettings: function(settings) {
            return this.post('/temple/settings', settings);
        },
        
        // Logout
        logout: function() {
            const self = this;
            
            this.post('/auth/logout', {}).always(function() {
                // Clear storage
                localStorage.removeItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
                localStorage.removeItem(APP_CONFIG.STORAGE.REFRESH_TOKEN);
                localStorage.removeItem(APP_CONFIG.STORAGE.USER);
                localStorage.removeItem(APP_CONFIG.STORAGE.TEMPLE);
                localStorage.removeItem(APP_CONFIG.STORAGE.TEMPLE_SETTINGS);
                sessionStorage.clear();
                
                // Redirect to login
                self.redirectToLogin();
            });
        }
    };
    
})(jQuery, window);