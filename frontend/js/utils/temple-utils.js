// js/utils/temple-utils.js
// Utility wrapper for Temple Management System

(function (window) {
    'use strict';

    window.TempleUtils = {

        // Show loading overlay
        showLoading: function (message = 'Loading...') {
            TempleCore.showLoading(true, message);
        },

        // Hide loading overlay
        hideLoading: function () {
            TempleCore.showLoading(false);
        },

        // Show success message
        showSuccess: function (message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: message,
                    timer: 3000,
                    showConfirmButton: false
                });
            } else if (typeof toastr !== 'undefined') {
                toastr.success(message);
            } else {
                alert(message);
            }
        },

        // Show error message
        showError: function (message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: message
                });
            } else if (typeof toastr !== 'undefined') {
                toastr.error(message);
            } else {
                alert(message);
            }
        },

        // Show warning message
        showWarning: function (message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Warning',
                    text: message
                });
            } else if (typeof toastr !== 'undefined') {
                toastr.warning(message);
            } else {
                alert(message);
            }
        },

        // Show info message
        showInfo: function (message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info',
                    title: 'Info',
                    text: message
                });
            } else if (typeof toastr !== 'undefined') {
                toastr.info(message);
            } else {
                alert(message);
            }
        },

        // Handle AJAX errors
        handleAjaxError: function (xhr, defaultMessage = 'An error occurred') {
            let message = defaultMessage;

            if (xhr.responseJSON) {
                if (xhr.responseJSON.message) {
                    message = xhr.responseJSON.message;
                } else if (xhr.responseJSON.error) {
                    message = xhr.responseJSON.error;
                } else if (xhr.responseJSON.errors) {
                    // Handle validation errors
                    const errors = xhr.responseJSON.errors;
                    message = Object.values(errors).flat().join('\n');
                }
            } else if (xhr.statusText) {
                message = xhr.statusText;
            }

            this.showError(message);
        },

        // Show confirmation dialog
        showConfirm: function (title, message, onConfirm, onCancel) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: title,
                    text: message,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    cancelButtonText: 'No'
                }).then((result) => {
                    if (result.isConfirmed && onConfirm) {
                        onConfirm();
                    } else if (result.isDismissed && onCancel) {
                        onCancel();
                    }
                });
            } else {
                if (confirm(message)) {
                    if (onConfirm) onConfirm();
                } else {
                    if (onCancel) onCancel();
                }
            }
        },

        // Format date
        formatDate: function (dateString, format = 'DD/MM/YYYY') {
            if (!dateString) return '-';

            if (typeof moment !== 'undefined') {
                return moment(dateString).format(format);
            }

            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB');
        },

        // Format currency
        formatCurrency: function (amount, currency = 'MYR') {
            const symbol = APP_CONFIG.CURRENCY_SYMBOLS[currency] || currency;
            return `${symbol} ${parseFloat(amount).toFixed(2)}`;
        },

        // Get stored temple settings
        getStoredTempleSettings: function () {
            const settings = localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE_SETTINGS);
            return settings ? JSON.parse(settings) : APP_CONFIG.DEFAULT_TEMPLE;
        },

        // Get current user
        getCurrentUser: function () {
            const user = localStorage.getItem(APP_CONFIG.STORAGE.USER);
            return user ? JSON.parse(user) : null;
        },

        // Check if user has permission
        hasPermission: function (permission) {
            const user = this.getCurrentUser();
            if (!user) return false;

            // Super admin has all permissions
            if (user.user_type === 'SUPER_ADMIN') return true;

            // Check user permissions
            if (user.permissions && Array.isArray(user.permissions)) {
                return user.permissions.includes(permission);
            }

            return false;
        },

        // Debounce function
        debounce: function (func, wait = 300) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Generate unique ID
        generateId: function () {
            return 'id_' + Math.random().toString(36).substr(2, 9);
        },

        // Validate email
        isValidEmail: function (email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        // Validate phone
        isValidPhone: function (phone) {
            const re = /^[\d\s\-\+\(\)]+$/;
            return re.test(phone);
        },

        // Deep clone object
        deepClone: function (obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        // Check if object is empty
        isEmpty: function (obj) {
            return Object.keys(obj).length === 0;
        }
    };

    // Make it globally accessible
    window.TempleUtils = TempleUtils;

})(window);