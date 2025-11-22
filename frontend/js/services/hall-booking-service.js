// frontend/js/services/hall-booking-service.js

(function (window) {
  "use strict";

  /**
   * Hall Booking API Service
   * Handles all API calls for Hall Booking modules
   */
  window.HallBookingService = {
    /**
     * Get API base URL with temple header
     * Auto-detects temple subdomain from current URL
     */
    getConfig: function () {
      // Extract temple subdomain from current URL
      const hostname = window.location.hostname;
      const templeMatch = hostname.match(/^temple(\d+)\./);
      const templeId = templeMatch ? templeMatch[1] : "1";

      // Build base URL using the detected temple subdomain
      let baseUrl;
      if (
        window.APP_CONFIG?.API_BASE_URL &&
        window.APP_CONFIG.API_BASE_URL.startsWith("http")
      ) {
        baseUrl = window.APP_CONFIG.API_BASE_URL;
      } else {
        // Construct full URL with temple subdomain
        const protocol = window.location.protocol;
        const domain = hostname.replace(/^temple\d+\./, ""); // Remove temple prefix
        baseUrl = `${protocol}//temple${templeId}.${domain}/api`;
      }

      return {
        baseUrl: baseUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Temple-ID": templeId,
        },
      };
    },

    /**
     * Generic AJAX Request Handler
     */
    request: function (
      method,
      url,
      data = null,
      successCallback,
      errorCallback,
      completeCallback
    ) {
      const config = this.getConfig();
      const fullUrl = url.startsWith("http") ? url : config.baseUrl + url;

      const options = {
        method: method,
        headers: config.headers,
      };

      // Add body for POST/PUT/PATCH
      if (data && ["POST", "PUT", "PATCH"].includes(method)) {
        options.body = JSON.stringify(data);
      }

      // Add query params for GET
      if (data && method === "GET") {
        const params = new URLSearchParams(data);
        const separator = fullUrl.includes("?") ? "&" : "?";
        url = fullUrl + separator + params.toString();
      } else {
        url = fullUrl;
      }

      fetch(url, options)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (successCallback) successCallback(data);
        })
        .catch((error) => {
          console.error("API Error:", error);
          if (errorCallback) errorCallback(error);
        })
        .finally(() => {
          if (completeCallback) completeCallback();
        });
    },

    // ========================================
    // VENUE MASTER API
    // ========================================

    venue: {
      /**
       * Get all venues with pagination and filters
       */
      getAll: function (params, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          "/hall-booking/venue-master",
          params,
          successCallback,
          errorCallback
        );
      },

      /**
       * Get single venue by ID
       */
      getById: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          `/hall-booking/venue-master/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },

      /**
       * Create new venue
       */
      create: function (
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "POST",
          "/hall-booking/venue-master",
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Update venue
       */
      update: function (
        id,
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "PUT",
          `/hall-booking/venue-master/${id}`,
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Delete venue
       */
      delete: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "DELETE",
          `/hall-booking/venue-master/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },
    },

    // ========================================
    // SESSION MASTER API
    // ========================================

    session: {
      /**
       * Get all sessions with pagination and filters
       */
      getAll: function (params, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          "/hall-booking/session-master",
          params,
          successCallback,
          errorCallback
        );
      },

      /**
       * Get single session by ID
       */
      getById: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          `/hall-booking/session-master/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },

      /**
       * Create new session
       */
      create: function (
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "POST",
          "/hall-booking/session-master",
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Update session
       */
      update: function (
        id,
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "PUT",
          `/hall-booking/session-master/${id}`,
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Delete session
       */
      delete: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "DELETE",
          `/hall-booking/session-master/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },
    },

    // ========================================
    // ADDON GROUPS API
    // ========================================

    addonGroup: {
      /**
       * Get all addon groups with pagination and filters
       */
      getAll: function (params, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          "/hall-booking/addon-groups",
          params,
          successCallback,
          errorCallback
        );
      },

      /**
       * Get active addon groups only
       */
      getActive: function (successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          "/hall-booking/addon-groups/active",
          null,
          successCallback,
          errorCallback
        );
      },

      /**
       * Get single addon group by ID
       */
      getById: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          `/hall-booking/addon-groups/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },

      /**
       * Create new addon group
       */
      create: function (
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "POST",
          "/hall-booking/addon-groups",
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Update addon group
       */
      update: function (
        id,
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "PUT",
          `/hall-booking/addon-groups/${id}`,
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Delete addon group
       */
      delete: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "DELETE",
          `/hall-booking/addon-groups/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },
    },

    // ========================================
    // ADDON SERVICES API
    // ========================================

    addonService: {
      /**
       * Get all addon services with pagination and filters
       */
      getAll: function (params, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          "/hall-booking/addon-services",
          params,
          successCallback,
          errorCallback
        );
      },

      /**
       * Get single addon service by ID
       */
      getById: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          `/hall-booking/addon-services/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },

      /**
       * Create new addon service
       */
      create: function (
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "POST",
          "/hall-booking/addon-services",
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Update addon service
       */
      update: function (
        id,
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "PUT",
          `/hall-booking/addon-services/${id}`,
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Delete addon service
       */
      delete: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "DELETE",
          `/hall-booking/addon-services/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },
    },

    // ========================================
    // PACKAGE MASTER API
    // ========================================

    package: {
      /**
       * Get all packages with pagination and filters
       */
      getAll: function (params, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          "/hall-booking/package-master",
          params,
          successCallback,
          errorCallback
        );
      },

      /**
       * Get single package by ID
       */
      getById: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "GET",
          `/hall-booking/package-master/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },

      /**
       * Create new package
       */
      create: function (
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "POST",
          "/hall-booking/package-master",
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Update package
       */
      update: function (
        id,
        data,
        successCallback,
        errorCallback,
        completeCallback
      ) {
        HallBookingService.request(
          "PUT",
          `/hall-booking/package-master/${id}`,
          data,
          successCallback,
          errorCallback,
          completeCallback
        );
      },

      /**
       * Delete package
       */
      delete: function (id, successCallback, errorCallback) {
        HallBookingService.request(
          "DELETE",
          `/hall-booking/package-master/${id}`,
          null,
          successCallback,
          errorCallback
        );
      },
    },

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Show toast notification
     */
    showToast: function (message, type = "info") {
      // Check if Toastify or similar library is available
      if (window.Toastify) {
        Toastify({
          text: message,
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: this.getToastColor(type),
        }).showToast();
      }
      // Fallback to SweetAlert2 if available
      else if (window.Swal) {
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
        Toast.fire({
          icon: type,
          title: message,
        });
      }
      // Fallback to console
      else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    },

    /**
     * Get toast background color based on type
     */
    getToastColor: function (type) {
      const colors = {
        success: "linear-gradient(to right, #00b09b, #96c93d)",
        error: "linear-gradient(to right, #ff5f6d, #ffc371)",
        warning: "linear-gradient(to right, #f7b733, #fc4a1a)",
        info: "linear-gradient(to right, #4facfe, #00f2fe)",
      };
      return colors[type] || colors.info;
    },
  };
})(window);
