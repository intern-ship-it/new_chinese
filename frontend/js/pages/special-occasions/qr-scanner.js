// js/pages/special-occasions/qr-scanner.js
// QR Code Scanner and Verification Page for Special Occasions

(function ($, window) {
    'use strict';

    // Ensure shared module exists
    if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
            eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                if (typeof gsap !== 'undefined') gsap.killTweensOf("*");
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }

    // ========================================
    // QR SCANNER PAGE MODULE
    // ========================================
    window.SpecialOccasionsQrScannerPage = {
        pageId: 'occasions-qr-scanner',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,

        // Scanner instance
        html5QrCode: null,
        isScanning: false,

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            console.log('Initializing QR Scanner Page...');
            window.OccasionsSharedModule.registerPage(this.pageId);

            this.render();
            this.bindEvents();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            // Stop scanner if running
            if (this.isScanning && this.html5QrCode) {
                this.stopScanner();
            }

            window.OccasionsSharedModule.unregisterPage(this.pageId);
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
        },

        // ========================================
        // RENDER HTML
        // ========================================
        render: function () {
            const html = `
                <div class="qr-scanner-page">
                    <style>
                        .qr-scanner-page {
                            padding: 20px;
                            background: #f8f9fa;
                            min-height: 100vh;
                        }
                        
                        .scanner-header {
                            background: linear-gradient(135deg, #8b2500 0%, #b8621b 50%, #e09145 100%);
                            padding: 30px 40px;
                            margin-bottom: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .header-content {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                        }
                        
                        .header-icon {
                            font-size: 48px;
                            color: white;
                        }
                        
                        .header-text h1 {
                            font-size: 32px;
                            font-weight: 700;
                            color: white;
                            margin: 0 0 5px 0;
                        }
                        
                        .header-text p {
                            font-size: 16px;
                            color: rgba(255,255,255,0.9);
                            margin: 0;
                        }
                        
                        .scanner-container {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            margin-bottom: 20px;
                        }
                        
                        #qr-reader {
                            width: 100%;
                            max-width: 600px;
                            margin: 0 auto;
                            border: 2px solid #8b4513;
                            border-radius: 8px;
                        }
                        
                        .scanner-controls {
                            text-align: center;
                            margin-top: 20px;
                        }
                        
                        .btn-scanner {
                            padding: 12px 30px;
                            font-size: 16px;
                            font-weight: 600;
                            border-radius: 8px;
                            margin: 0 10px;
                        }
                        
                        .btn-start-scan {
                            background: #28a745;
                            border: none;
                            color: white;
                        }
                        
                        .btn-stop-scan {
                            background: #dc3545;
                            border: none;
                            color: white;
                        }
                        
                        .verification-result {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            display: none;
                        }
                        
                        .verification-result.success {
                            border-left: 5px solid #28a745;
                        }
                        
                        .verification-result.error {
                            border-left: 5px solid #dc3545;
                        }
                        
                        .result-header {
                            display: flex;
                            align-items: center;
                            gap: 15px;
                            margin-bottom: 20px;
                        }
                        
                        .result-icon {
                            font-size: 48px;
                        }
                        
                        .result-icon.success {
                            color: #28a745;
                        }
                        
                        .result-icon.error {
                            color: #dc3545;
                        }
                        
                        .result-title {
                            font-size: 24px;
                            font-weight: 700;
                            margin: 0;
                        }
                        
                        .result-details table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        
                        .result-details th,
                        .result-details td {
                            padding: 12px;
                            text-align: left;
                            border-bottom: 1px solid #dee2e6;
                        }
                        
                        .result-details th {
                            font-weight: 600;
                            color: #495057;
                            width: 200px;
                        }
                        
                        .result-details td {
                            color: #212529;
                        }
                        
                        .status-badge {
                            padding: 5px 15px;
                            border-radius: 20px;
                            font-weight: 600;
                            font-size: 14px;
                        }
                        
                        .status-confirmed {
                            background: #d4edda;
                            color: #155724;
                        }
                        
                        .status-pending {
                            background: #fff3cd;
                            color: #856404;
                        }
                        
                        .status-cancelled {
                            background: #f8d7da;
                            color: #721c24;
                        }
                        
                        .manual-verify-section {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            margin-top: 20px;
                        }
                        
                        .manual-verify-section h3 {
                            color: #8b4513;
                            margin-bottom: 20px;
                        }
                    </style>

                    <!-- Header -->
                    <div class="scanner-header">
                        <div class="header-content">
                            <i class="bi bi-qr-code-scan header-icon"></i>
                            <div class="header-text">
                                <h1>QR Code Scanner</h1>
                                <p>Scan booking QR codes to verify and view details</p>
                            </div>
                        </div>
                    </div>

                    <!-- Scanner Container -->
                    <div class="scanner-container">
                        <h3 class="text-center mb-4">Scan QR Code</h3>
                        <div id="qr-reader"></div>
                        <div class="scanner-controls">
                            <button class="btn btn-scanner btn-start-scan" id="btnStartScan">
                                <i class="bi bi-camera me-2"></i>Start Scanner
                            </button>
                            <button class="btn btn-scanner btn-stop-scan" id="btnStopScan" style="display: none;">
                                <i class="bi bi-stop-circle me-2"></i>Stop Scanner
                            </button>
                        </div>
                    </div>

                    <!-- Verification Result -->
                    <div class="verification-result" id="verificationResult">
                        <div class="result-header">
                            <i class="bi result-icon" id="resultIcon"></i>
                            <h2 class="result-title" id="resultTitle"></h2>
                        </div>
                        <div class="result-details" id="resultDetails"></div>
                        <div class="text-center mt-4">
                            <button class="btn btn-primary" id="btnScanAnother">
                                <i class="bi bi-arrow-repeat me-2"></i>Scan Another
                            </button>
                        </div>
                    </div>

                    <!-- Manual Verification -->
                    <div class="manual-verify-section">
                        <h3><i class="bi bi-keyboard me-2"></i>Manual Verification</h3>
                        <p class="text-muted">Enter QR code data manually if scanner is not available</p>
                        <div class="row">
                            <div class="col-md-9">
                                <textarea class="form-control" id="manualQRData" rows="3" 
                                    placeholder="Paste QR code data here..."></textarea>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-primary w-100 h-100" id="btnManualVerify">
                                    <i class="bi bi-check-circle me-2"></i>Verify
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Render into content area
            if ($('#content').length) {
                $('#content').html(html);
            } else if ($('.main-content').length) {
                $('.main-content').html(html);
            } else if ($('#main-content').length) {
                $('#main-content').html(html);
            } else {
                const fullHtml = `
                    <div id="sidebar-container"></div>
                    <div id="content" class="main-content">
                        ${html}
                    </div>
                `;
                $('#app').html(fullHtml);

                if (window.SidebarComponent && typeof window.SidebarComponent.init === 'function') {
                    window.SidebarComponent.init();
                }
            }
        },

        // ========================================
        // EVENT BINDINGS
        // ========================================
        bindEvents: function () {
            const self = this;

            // Start scanner
            $('#btnStartScan').on('click', function () {
                self.startScanner();
            });

            // Stop scanner
            $('#btnStopScan').on('click', function () {
                self.stopScanner();
            });

            // Scan another
            $('#btnScanAnother').on('click', function () {
                $('#verificationResult').hide();
                self.startScanner();
            });

            // Manual verification
            $('#btnManualVerify').on('click', function () {
                const qrData = $('#manualQRData').val().trim();
                if (qrData) {
                    self.verifyQRCode(qrData);
                } else {
                    TempleCore.showToast('Please enter QR code data', 'warning');
                }
            });
        },

        // ========================================
        // SCANNER FUNCTIONS
        // ========================================
        startScanner: function () {
            const self = this;

            // Check if Html5Qrcode library is loaded
            if (typeof Html5Qrcode === 'undefined') {
                TempleCore.showToast('QR Scanner library not loaded. Please refresh the page.', 'error');
                console.error('Html5Qrcode library not found. Include: https://unpkg.com/html5-qrcode');
                return;
            }

            if (this.isScanning) {
                return;
            }

            this.html5QrCode = new Html5Qrcode("qr-reader");

            this.html5QrCode.start(
                { facingMode: "environment" }, // Use back camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText, decodedResult) => {
                    // QR code successfully scanned
                    console.log(`QR Code detected: ${decodedText}`);
                    self.stopScanner();
                    self.verifyQRCode(decodedText);
                },
                (errorMessage) => {
                    // Scanning error (usually just "no QR code found")
                    // Don't show these errors as they're too frequent
                }
            ).then(() => {
                self.isScanning = true;
                $('#btnStartScan').hide();
                $('#btnStopScan').show();
                $('#verificationResult').hide();
            }).catch((err) => {
                console.error('Failed to start scanner:', err);
                TempleCore.showToast('Failed to start camera. Please check permissions.', 'error');
            });
        },

        stopScanner: function () {
            if (this.html5QrCode && this.isScanning) {
                this.html5QrCode.stop().then(() => {
                    this.isScanning = false;
                    $('#btnStartScan').show();
                    $('#btnStopScan').hide();
                }).catch((err) => {
                    console.error('Failed to stop scanner:', err);
                });
            }
        },

        // ========================================
        // VERIFICATION
        // ========================================
        verifyQRCode: function (qrData) {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.post('/qr/verify', { qr_data: qrData })
                .done(function (response) {
                    if (response.success) {
                        self.showSuccessResult(response.data);
                    } else {
                        self.showErrorResult(response.message || 'Invalid QR code');
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to verify QR code';
                    self.showErrorResult(error);
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        showSuccessResult: function (data) {
            const statusClass = this.getStatusClass(data.booking_status);
            const statusText = this.formatStatus(data.booking_status);

            const detailsHTML = `
                <table>
                    <tr>
                        <th>Booking Number:</th>
                        <td><strong>${data.booking_number}</strong></td>
                    </tr>
                    <tr>
                        <th>Status:</th>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    </tr>
                    <tr>
                        <th>Devotee:</th>
                        <td>${data.devotee.display_name}</td>
                    </tr>
                    <tr>
                        <th>NRIC:</th>
                        <td>${data.devotee.nric || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Contact:</th>
                        <td>${data.devotee.contact_no || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Event:</th>
                        <td>${data.event.event_name || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Event Date:</th>
                        <td>${data.event.event_date || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Current Seat:</th>
                        <td><strong>${data.current_seat?.location || 'Not assigned'}</strong></td>
                    </tr>
                    <tr>
                        <th>Last Updated:</th>
                        <td>${this.formatDateTime(data.last_updated)}</td>
                    </tr>
                    <tr>
                        <th>Verified At:</th>
                        <td>${this.formatDateTime(data.verified_at)}</td>
                    </tr>
                </table>
            `;

            $('#resultIcon').removeClass().addClass('bi bi-check-circle-fill result-icon success');
            $('#resultTitle').text('Valid Booking');
            $('#resultDetails').html(detailsHTML);
            $('#verificationResult').removeClass('error').addClass('success').show();

            TempleCore.showToast('Booking verified successfully', 'success');
        },

        showErrorResult: function (message) {
            const detailsHTML = `
                <div class="alert alert-danger">
                    <h5><i class="bi bi-exclamation-triangle me-2"></i>Verification Failed</h5>
                    <p class="mb-0">${message}</p>
                </div>
                <p class="text-muted mt-3">Possible reasons:</p>
                <ul class="text-muted">
                    <li>QR code is invalid or corrupted</li>
                    <li>Booking has been cancelled</li>
                    <li>QR code has expired</li>
                    <li>Network connection issue</li>
                </ul>
            `;

            $('#resultIcon').removeClass().addClass('bi bi-x-circle-fill result-icon error');
            $('#resultTitle').text('Invalid QR Code');
            $('#resultDetails').html(detailsHTML);
            $('#verificationResult').removeClass('success').addClass('error').show();

            TempleCore.showToast(message, 'error');
        },

        // ========================================
        // HELPER FUNCTIONS
        // ========================================
        getStatusClass: function (status) {
            const statusMap = {
                'CONFIRMED': 'status-confirmed',
                'PENDING': 'status-pending',
                'CANCELLED': 'status-cancelled'
            };
            return statusMap[status] || 'status-pending';
        },

        formatStatus: function (status) {
            return status.charAt(0) + status.slice(1).toLowerCase();
        },

        formatDateTime: function (dateTimeString) {
            if (!dateTimeString) return 'N/A';

            try {
                const date = new Date(dateTimeString);
                return date.toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            } catch (e) {
                return dateTimeString;
            }
        }
    };

})(jQuery, window);
