// js/pages/login.js
// Login page module using jQuery

(function($, window) {
    'use strict';
    
    window.LoginPage = {
        templeConfig: null,
        templeId: null,
        loginAttempts: 0,
        maxAttempts: 5,
        
        // Initialize login page
        init: function() {
            this.extractTempleId();
            
            if (!this.templeId) {
                this.showError('Invalid URL', 'Please use a valid temple URL to access the login page.');
                return;
            }
            
            this.render();
            this.validateTemple();
        },
        
        // Extract temple ID from URL
        extractTempleId: function() {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            this.templeId = pathParts[0] || null;
        },
        
        // Render login page HTML
        render: function() {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Login - Temple Management System</title>
                    
                    <!-- Bootstrap CSS -->
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <!-- Bootstrap Icons -->
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
                    <!-- Google Fonts -->
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    
                    <style>
                        ${this.getLoginStyles()}
                    </style>
                </head>
                <body>
                    <!-- Loading Overlay -->
                    <div class="loading-overlay" id="loadingOverlay">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>

                    <div class="login-container">
                        <!-- Initial Loading State -->
                        <div class="login-card" id="loadingCard">
                            <div class="logo-container">
                                <div class="skeleton skeleton-logo"></div>
                                <div class="skeleton skeleton-text" style="width: 60%; margin: 0 auto;"></div>
                                <div class="skeleton skeleton-text" style="width: 40%; margin: 10px auto;"></div>
                            </div>
                        </div>

                        <!-- Error State -->
                        <div class="login-card" id="errorCard" style="display: none;">
                            <div class="error-container">
                                <i class="bi bi-exclamation-circle error-icon"></i>
                                <h2 class="error-title" id="errorTitle">Temple Not Found</h2>
                                <p class="error-message" id="errorMessage">The temple you're looking for doesn't exist or is not available.</p>
                                <button class="btn btn-secondary" onclick="window.location.href='/'">Go to Homepage</button>
                            </div>
                        </div>

                        <!-- Login Form -->
                        <div class="login-card" id="loginCard" style="display: none;">
                            <div class="logo-container">
                                <div id="logoContainer">
                                    <div class="logo-placeholder">
                                        <i class="bi bi-building"></i>
                                    </div>
                                </div>
                                <h1 id="templeName">Temple Management System</h1>
                                <p class="subtitle">Admin & Staff Login Portal</p>
                            </div>

                            <!-- Alert Messages -->
                            <div id="alertContainer"></div>

                            <form id="loginForm">
                                <!-- Username/Email Field -->
                                <div class="form-floating mb-3">
                                    <input type="text" class="form-control" id="username" placeholder="Username or Email" required autocomplete="username">
                                    <label for="username">Username or Email</label>
                                </div>

                                <!-- Password Field -->
                                <div class="form-floating mb-3 position-relative">
                                    <input type="password" class="form-control" id="password" placeholder="Password" required autocomplete="current-password">
                                    <label for="password">Password</label>
                                    <i class="bi bi-eye-slash password-toggle" id="passwordToggle"></i>
                                </div>

                                <!-- Remember Me -->
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="rememberMe">
                                    <label class="form-check-label" for="rememberMe">
                                        Remember me for 30 days
                                    </label>
                                </div>

                                <!-- Hidden Fields -->
                                <input type="hidden" id="requestThrough" value="COUNTER">
                                <input type="hidden" id="templeId" value="">

                                <!-- Captcha Container -->
                                <div class="captcha-container" id="captchaContainer" style="display: none;">
                                    <div class="captcha-box">
                                        <p class="mb-3">Please complete the captcha</p>
                                        <div id="captchaElement"></div>
                                        <input type="text" class="form-control mt-3" id="captchaInput" placeholder="Enter captcha code">
                                    </div>
                                </div>

                                <!-- Submit Button -->
                                <button type="submit" class="btn btn-primary" id="loginButton">
                                    <span id="loginButtonText">Sign In</span>
                                    <span id="loginButtonSpinner" style="display: none;">
                                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        Signing in...
                                    </span>
                                </button>

                                <!-- Forgot Password Link -->
                                <div class="text-center mt-3">
                                    <a href="#" id="forgotPasswordLink" class="text-muted small">Forgot your password?</a>
                                </div>
                            </form>

                            <div class="footer-text">
                                <p>&copy; 2024 Temple Management System. All rights reserved.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Forgot Password Modal -->
                    <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Reset Password</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <p>Enter your email address and we'll send you instructions to reset your password.</p>
                                    <form id="forgotPasswordForm">
                                        <div class="mb-3">
                                            <label for="resetEmail" class="form-label">Email Address</label>
                                            <input type="email" class="form-control" id="resetEmail" required>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="sendResetLink">Send Reset Link</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Scripts -->
                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                </body>
                </html>
            `;
            
            // Replace entire document
            document.open();
            document.write(html);
            document.close();
            
            // Re-bind after DOM is ready
            $(document).ready(() => {
                this.bindEvents();
            });
        },
        
        // Get login page styles
        getLoginStyles: function() {
            return `
                :root {
                    --primary-color: #ff00ff;
                    --secondary-color: #808000;
                    --background-color: #ffffff;
                    --text-color: #000000;
                    --primary-rgb: 255, 0, 255;
                    --secondary-rgb: 128, 128, 0;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Inter', sans-serif;
                    background-color: var(--background-color);
                    color: var(--text-color);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-image: 
                        radial-gradient(circle at 20% 80%, rgba(255, 0, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(128, 128, 0, 0.1) 0%, transparent 50%);
                }

                .login-container {
                    width: 100%;
                    max-width: 450px;
                    padding: 20px;
                }

                .login-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                    padding: 40px;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                .logo-container {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .temple-logo {
                    width: 100px;
                    height: 100px;
                    border-radius: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    object-fit: cover;
                }

                .logo-placeholder {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    border-radius: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }

                .logo-placeholder i {
                    font-size: 50px;
                    color: white;
                }

                h1 {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: var(--text-color);
                }

                .subtitle {
                    color: #6c757d;
                    font-size: 16px;
                    margin-bottom: 30px;
                }

                .error-container {
                    text-align: center;
                    padding: 60px 20px;
                }

                .error-icon {
                    font-size: 80px;
                    color: #dc3545;
                    margin-bottom: 20px;
                }

                .error-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: #dc3545;
                }

                .error-message {
                    color: #6c757d;
                    margin-bottom: 30px;
                }

                .form-floating {
                    margin-bottom: 20px;
                }

                .form-control {
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 12px 15px;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    height: 55px;
                }

                .form-control:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 0.2rem rgba(255, 0, 255, 0.1);
                }

                .form-floating label {
                    padding: 16px 15px;
                    color: #6c757d;
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    border: none;
                    border-radius: 12px;
                    padding: 14px 30px;
                    font-size: 16px;
                    font-weight: 600;
                    width: 100%;
                    transition: all 0.3s ease;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                .btn-primary:active {
                    transform: translateY(0);
                }

                .btn-primary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: #6c757d;
                    border: none;
                    border-radius: 12px;
                    padding: 14px 30px;
                    font-size: 16px;
                    font-weight: 600;
                    width: 100%;
                    transition: all 0.3s ease;
                    color: white;
                }

                .alert {
                    border-radius: 12px;
                    border: none;
                    padding: 15px 20px;
                    margin-bottom: 20px;
                    font-size: 14px;
                }

                .alert-danger {
                    background-color: #fee;
                    color: #dc3545;
                }

                .alert-success {
                    background-color: #efe;
                    color: #28a745;
                }

                .alert-warning {
                    background-color: #fff3cd;
                    color: #856404;
                }

                .alert-info {
                    background-color: #d1ecf1;
                    color: #0c5460;
                }

                .spinner-border {
                    width: 20px;
                    height: 20px;
                    border-width: 2px;
                    margin-right: 8px;
                }

                .captcha-container {
                    margin-bottom: 20px;
                }

                .captcha-box {
                    background-color: #f8f9fa;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 15px;
                    text-align: center;
                }

                .footer-text {
                    text-align: center;
                    margin-top: 30px;
                    color: #6c757d;
                    font-size: 14px;
                }

                .password-toggle {
                    cursor: pointer;
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6c757d;
                    z-index: 10;
                }

                .position-relative {
                    position: relative;
                }

                /* Loading states */
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .loading-overlay.active {
                    display: flex;
                }

                .skeleton {
                    animation: skeleton-loading 1s linear infinite alternate;
                }

                @keyframes skeleton-loading {
                    0% {
                        background-color: hsl(200, 20%, 80%);
                    }
                    100% {
                        background-color: hsl(200, 20%, 95%);
                    }
                }

                .skeleton-text {
                    width: 100%;
                    height: 20px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                }

                .skeleton-logo {
                    width: 100px;
                    height: 100px;
                    border-radius: 20px;
                    margin: 0 auto 20px;
                }

                /* Responsive */
                @media (max-width: 576px) {
                    .login-card {
                        padding: 30px 20px;
                    }
                    
                    h1 {
                        font-size: 20px;
                    }
                    
                    .subtitle {
                        font-size: 14px;
                    }
                }
            `;
        },
        
        // Validate temple with API
        validateTemple: function() {
            const self = this;
            
            TempleAPI.validateTemple(self.templeId)
                .done(function(response) {
                    if (response.success) {
                        self.templeConfig = response.data;
                        self.applyTheme(response.data.theme);
                        self.updateTempleUI(response.data);
                        
                        $('#loadingCard').hide();
                        $('#loginCard').show();
                        
                        // Check if user is already logged in
                        self.checkExistingSession();
                    } else {
                        self.showError('Temple Not Found', 'The temple you are looking for does not exist.');
                    }
                })
                .fail(function(xhr) {
                    $('#loadingCard').hide();
                    
                    if (xhr.status === 503) {
                        self.showError('Server Busy', 'The temple server is currently busy. Please try again later.');
                    } else if (xhr.status === 404) {
                        self.showError('Temple Not Found', 'The temple you are looking for does not exist.');
                    } else {
                        self.showError('Error', 'An error occurred while loading the temple.');
                    }
                });
        },
        
        // Apply theme colors
        applyTheme: function(theme) {
            if (!theme) return;
            
            document.documentElement.style.setProperty('--primary-color', theme.primary_color || '#ff00ff');
            document.documentElement.style.setProperty('--secondary-color', theme.secondary_color || '#808000');
            document.documentElement.style.setProperty('--background-color', theme.background_color || '#ffffff');
            document.documentElement.style.setProperty('--text-color', theme.text_color || '#000000');
            
            // Convert hex to RGB for gradients
            const primaryRgb = this.hexToRgb(theme.primary_color || '#ff00ff');
            const secondaryRgb = this.hexToRgb(theme.secondary_color || '#808000');
            document.documentElement.style.setProperty('--primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
            document.documentElement.style.setProperty('--secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
        },
        
        // Update UI with temple information
        updateTempleUI: function(config) {
            $('#templeName').text(config.temple_name);
            document.title = `${config.temple_name} - Login`;
            
            if (config.temple_logo) {
                $('#logoContainer').html(`
                    <img src="${config.temple_logo}" alt="${config.temple_name}" class="temple-logo" 
                         onerror="this.style.display='none'; document.querySelector('.logo-placeholder').style.display='inline-flex';">
                `);
            }
            
            $('#templeId').val(config.temple_id);
        },
        
        // Check existing session
        checkExistingSession: function() {
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            const temple = localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE);
            
            if (token && temple) {
                const storedTemple = JSON.parse(temple);
                if (storedTemple.id === this.templeConfig.temple_id) {
                    // Valid session exists, redirect to dashboard
                    this.redirectToDashboard();
                }
            }
            
            // Check remember me
            const rememberedUser = localStorage.getItem('remembered_user');
            if (rememberedUser) {
                $('#username').val(rememberedUser);
                $('#rememberMe').prop('checked', true);
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Form submission
            $('#loginForm').on('submit', function(e) {
                e.preventDefault();
                self.handleLogin();
            });
            
            // Password toggle
            $('#passwordToggle').on('click', function() {
                self.togglePassword();
            });
            
            // Clear alerts on input
            $('#username, #password').on('input', function() {
                $('#alertContainer').empty();
            });
            
            // Forgot password link
            $('#forgotPasswordLink').on('click', function(e) {
                e.preventDefault();
                self.showForgotPassword();
            });
            
            // Send reset link
            $('#sendResetLink').on('click', function() {
                self.sendPasswordResetLink();
            });
            
            // Detect login channel
            self.detectLoginChannel();
        },
        
        // Detect login channel based on URL
        detectLoginChannel: function() {
            const pathname = window.location.pathname;
            
            if (pathname.includes('admin')) {
                $('#requestThrough').val('ADMIN');
            } else if (pathname.includes('kiosk')) {
                $('#requestThrough').val('KIOSK');
            } else {
                $('#requestThrough').val('COUNTER');
            }
        },
        
        // Handle login
        handleLogin: function() {
            const self = this;
            const username = $('#username').val().trim();
            const password = $('#password').val();
            const requestThrough = $('#requestThrough').val();
            const captcha = $('#captchaInput').val();
            const rememberMe = $('#rememberMe').is(':checked');
            
            if (!username || !password) {
                self.showAlert('Please enter username and password', 'danger');
                return;
            }
            
            // Check if captcha is required
            if ($('#captchaContainer').is(':visible') && !captcha) {
                self.showAlert('Please enter the captcha code', 'danger');
                return;
            }
            
            // Show loading state
            self.setLoadingState(true);
            
            // Make login request
            TempleAPI.login(username, password, requestThrough)
                .done(function(response) {
                    if (response.success) {
                        // Store tokens and user info
                        localStorage.setItem(APP_CONFIG.STORAGE.ACCESS_TOKEN, response.data.access_token);
                        localStorage.setItem(APP_CONFIG.STORAGE.REFRESH_TOKEN, response.data.refresh_token);
                        localStorage.setItem(APP_CONFIG.STORAGE.USER, JSON.stringify(response.data.user));
                        localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify(response.data.temple));
                        
                        // Handle remember me
                        if (rememberMe) {
                            localStorage.setItem('remembered_user', username);
                        } else {
                            localStorage.removeItem('remembered_user');
                        }
                        
                        self.showAlert('Login successful! Redirecting...', 'success');
                        
                        // Redirect to dashboard after 1 second
                        setTimeout(function() {
                            self.redirectToDashboard();
                        }, 1000);
                    } else {
                        self.handleLoginError(response);
                    }
                })
                .fail(function(xhr) {
                    self.setLoadingState(false);
                    self.loginAttempts++;
                    
                    const response = xhr.responseJSON;
                    if (response) {
                        self.showAlert(response.message || 'Login failed', 'danger');
                        
                        // Show captcha after 3 failed attempts
                        if (self.loginAttempts >= 3 || response.require_captcha) {
                            self.showCaptcha();
                        }
                        
                        // Lock after max attempts
                        if (self.loginAttempts >= self.maxAttempts) {
                            self.lockLogin();
                        }
                    } else {
                        self.showAlert('Network error. Please check your connection and try again.', 'danger');
                    }
                });
        },
        
        // Handle login error
        handleLoginError: function(response) {
            this.setLoadingState(false);
            this.showAlert(response.message || 'Login failed', 'danger');
            
            if (response.require_captcha) {
                this.showCaptcha();
            }
        },
        
        // Set loading state
        setLoadingState: function(loading) {
            if (loading) {
                $('#loginButton').prop('disabled', true);
                $('#loginButtonText').hide();
                $('#loginButtonSpinner').show();
                $('#loadingOverlay').addClass('active');
            } else {
                $('#loginButton').prop('disabled', false);
                $('#loginButtonText').show();
                $('#loginButtonSpinner').hide();
                $('#loadingOverlay').removeClass('active');
            }
        },
        
        // Show alert message
        showAlert: function(message, type) {
            const alertHtml = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#alertContainer').html(alertHtml);
        },
        
        // Show error card
        showError: function(title, message) {
            $('#errorTitle').text(title);
            $('#errorMessage').text(message);
            $('#loadingCard').hide();
            $('#errorCard').show();
        },
        
        // Toggle password visibility
        togglePassword: function() {
            const $passwordInput = $('#password');
            const $icon = $('#passwordToggle');
            
            if ($passwordInput.attr('type') === 'password') {
                $passwordInput.attr('type', 'text');
                $icon.removeClass('bi-eye-slash').addClass('bi-eye');
            } else {
                $passwordInput.attr('type', 'password');
                $icon.removeClass('bi-eye').addClass('bi-eye-slash');
            }
        },
        
        // Show captcha
        showCaptcha: function() {
            $('#captchaContainer').slideDown();
            this.generateSimpleCaptcha();
        },
        
        // Generate simple captcha
        generateSimpleCaptcha: function() {
            const captchaCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            $('#captchaElement').html(`
                <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 24px; letter-spacing: 5px; user-select: none;">
                    ${captchaCode}
                </div>
            `);
            $('#captchaElement').data('code', captchaCode);
        },
        
        // Lock login after max attempts
        lockLogin: function() {
            $('#loginButton').prop('disabled', true);
            this.showAlert('Too many failed attempts. Please try again after 15 minutes.', 'danger');
            
            // Unlock after 15 minutes
            setTimeout(() => {
                $('#loginButton').prop('disabled', false);
                this.loginAttempts = 0;
                $('#alertContainer').empty();
            }, 900000);
        },
        
        // Show forgot password modal
        showForgotPassword: function() {
            const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
            modal.show();
        },
        
        // Send password reset link
        sendPasswordResetLink: function() {
            const self = this;
            const email = $('#resetEmail').val();
            
            if (!email) {
                alert('Please enter your email address');
                return;
            }
            
            // Disable button
            $('#sendResetLink').prop('disabled', true).text('Sending...');
            
            TempleAPI.post('/auth/forgot-password', {
                email: email,
                temple_id: self.templeId
            })
            .done(function(response) {
                if (response.success) {
                    bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal')).hide();
                    self.showAlert('Password reset link has been sent to your email.', 'success');
                    $('#forgotPasswordForm')[0].reset();
                } else {
                    alert(response.message || 'Failed to send reset link');
                }
            })
            .fail(function() {
                alert('An error occurred. Please try again.');
            })
            .always(function() {
                $('#sendResetLink').prop('disabled', false).text('Send Reset Link');
            });
        },
        
        // Redirect to dashboard
        redirectToDashboard: function() {
            window.location.href = `/${this.templeId}/dashboard`;
        },
        
        // Convert hex to RGB
        hexToRgb: function(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 0, b: 255 };
        }
    };
    
})(jQuery, window);