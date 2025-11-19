// js/components/footer.js
// Footer component using jQuery (Optional)

(function($, window) {
    'use strict';
    
    window.FooterComponent = {
        // Initialize footer
        init: function() {
            // Check if footer should be displayed
            if (this.shouldShowFooter()) {
                this.render();
                this.updateInfo();
                this.bindEvents();
            }
        },
        
        // Check if footer should be shown
        shouldShowFooter: function() {
            // You can add logic here to determine when to show footer
            // For example, show only on certain pages or based on settings
            const showFooter = localStorage.getItem('show_footer') !== 'false';
            return showFooter;
        },
        
        // Render footer HTML
        render: function() {
            const html = `
                <footer class="footer mt-auto py-3 bg-light">
                    <div class="container-fluid">
                        <div class="row">
                            <div class="col-md-6">
                                <span class="text-muted">
                                    &copy; <span id="currentYear">2024</span> <span id="footerTempleName">Temple Management System</span>. All rights reserved.
                                </span>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <span class="text-muted">
                                    Version <span id="appVersion">1.0.0</span> | 
                                    <a href="#" id="supportLink" class="text-decoration-none">Support</a> | 
                                    <a href="#" id="aboutLink" class="text-decoration-none">About</a> | 
                                    <a href="#" id="privacyLink" class="text-decoration-none">Privacy</a> | 
                                    <a href="#" id="termsLink" class="text-decoration-none">Terms</a>
                                </span>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-12 text-center">
                                <small class="text-muted" id="connectionStatus">
                                    <i class="bi bi-circle-fill text-success" style="font-size: 8px;"></i> Connected
                                </small>
                                <small class="text-muted ms-3" id="lastSync">
                                    Last sync: <span id="lastSyncTime">Never</span>
                                </small>
                            </div>
                        </div>
                    </div>
                </footer>

                <!-- Support Modal -->
                <div class="modal fade" id="supportModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Support</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <h6>Contact Support</h6>
                                <p>For technical support, please contact:</p>
                                <ul>
                                    <li>Email: support@templemanagement.com</li>
                                    <li>Phone: +91 1234567890</li>
                                    <li>Hours: Mon-Fri 9:00 AM - 6:00 PM IST</li>
                                </ul>
                                <hr>
                                <h6>Quick Help</h6>
                                <ul>
                                    <li><a href="#" class="text-decoration-none">User Guide</a></li>
                                    <li><a href="#" class="text-decoration-none">FAQs</a></li>
                                    <li><a href="#" class="text-decoration-none">Video Tutorials</a></li>
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- About Modal -->
                <div class="modal fade" id="aboutModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">About Temple Management System</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <img src="/assets/logo-placeholder.png" alt="Logo" style="width: 100px;">
                                </div>
                                <h6>Temple Management System</h6>
                                <p>Version: <span id="aboutVersion">1.0.0</span></p>
                                <p>A comprehensive solution for managing temple operations, including member management, bookings, donations, and more.</p>
                                <hr>
                                <h6>Features</h6>
                                <ul>
                                    <li>Multi-temple support</li>
                                    <li>Member and organization management</li>
                                    <li>Booking and scheduling</li>
                                    <li>Donation tracking</li>
                                    <li>Financial reporting</li>
                                    <li>Customizable themes</li>
                                </ul>
                                <hr>
                                <p class="text-muted small">
                                    &copy; 2024 Temple Management System. All rights reserved.
                                </p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#footer-container').html(html);
        },
        
        // Update footer information
        updateInfo: function() {
            const currentYear = new Date().getFullYear();
            const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
            
            $('#currentYear').text(currentYear);
            $('#appVersion, #aboutVersion').text(APP_CONFIG.APP.VERSION);
            
            if (temple.name) {
                $('#footerTempleName').text(temple.name);
            }
            
            // Update last sync time
            this.updateLastSyncTime();
            
            // Check connection status
            this.checkConnectionStatus();
        },
        
        // Update last sync time
        updateLastSyncTime: function() {
            const lastSync = localStorage.getItem('last_sync_time');
            if (lastSync) {
                const date = new Date(lastSync);
                const timeAgo = this.getTimeAgo(date);
                $('#lastSyncTime').text(timeAgo);
            }
        },
        
        // Get time ago string
        getTimeAgo: function(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            
            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
            return Math.floor(seconds / 86400) + ' days ago';
        },
        
        // Check connection status
        checkConnectionStatus: function() {
            const self = this;
            
            const updateStatus = function(online) {
                const $status = $('#connectionStatus');
                if (online) {
                    $status.html('<i class="bi bi-circle-fill text-success" style="font-size: 8px;"></i> Connected');
                } else {
                    $status.html('<i class="bi bi-circle-fill text-danger" style="font-size: 8px;"></i> Offline');
                }
            };
            
            // Initial check
            updateStatus(navigator.onLine);
            
            // Listen for online/offline events
            $(window).on('online', function() {
                updateStatus(true);
                TempleCore.showToast('Connection restored', 'success');
            });
            
            $(window).on('offline', function() {
                updateStatus(false);
                TempleCore.showToast('Connection lost', 'warning');
            });
            
            // Periodic connection check (every 30 seconds)
            setInterval(function() {
                updateStatus(navigator.onLine);
            }, 30000);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Support link
            $('#supportLink').on('click', function(e) {
                e.preventDefault();
                self.showSupport();
            });
            
            // About link
            $('#aboutLink').on('click', function(e) {
                e.preventDefault();
                self.showAbout();
            });
            
            // Privacy link
            $('#privacyLink').on('click', function(e) {
                e.preventDefault();
                self.showPrivacy();
            });
            
            // Terms link
            $('#termsLink').on('click', function(e) {
                e.preventDefault();
                self.showTerms();
            });
            
            // Update last sync time every minute
            setInterval(function() {
                self.updateLastSyncTime();
            }, 60000);
        },
        
        // Show support modal
        showSupport: function() {
            const modal = new bootstrap.Modal(document.getElementById('supportModal'));
            modal.show();
        },
        
        // Show about modal
        showAbout: function() {
            const modal = new bootstrap.Modal(document.getElementById('aboutModal'));
            modal.show();
        },
        
        // Show privacy policy
        showPrivacy: function() {
            // You can either show a modal or navigate to privacy page
            TempleRouter.navigate('privacy');
        },
        
        // Show terms of service
        showTerms: function() {
            // You can either show a modal or navigate to terms page
            TempleRouter.navigate('terms');
        },
        
        // Hide footer
        hide: function() {
            $('#footer-container').hide();
        },
        
        // Show footer
        show: function() {
            $('#footer-container').show();
        },
        
        // Update sync status
        updateSyncStatus: function(syncing) {
            const $lastSync = $('#lastSync');
            
            if (syncing) {
                $lastSync.html('<i class="spinner-border spinner-border-sm"></i> Syncing...');
            } else {
                const now = new Date().toISOString();
                localStorage.setItem('last_sync_time', now);
                this.updateLastSyncTime();
            }
        }
    };
    
})(jQuery, window);