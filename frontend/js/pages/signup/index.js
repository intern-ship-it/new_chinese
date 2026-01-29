// js/pages/signup/index.js
// Signup/Registration page module using jQuery

(function($, window) {
    'use strict';
    
    window.SignupPage = {
        templeConfig: null,
        templeId: null,
        currentStep: 1,
        totalSteps: 3,
        formData: {},
        
        // Initialize signup page
        init: function() {
            this.extractTempleId();
            
            if (!this.templeId) {
                this.showError('Invalid URL', 'Please use a valid temple URL to access the registration page.');
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
        
        // Render signup page HTML
        render: function() {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sign Up - Temple Management System</title>
                    
                    <!-- Bootstrap CSS -->
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <!-- Bootstrap Icons -->
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
                    <!-- Google Fonts -->
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    
                    <style>
                        ${this.getSignupStyles()}
                    </style>
                </head>
                <body>
                    <!-- Loading Overlay -->
                    <div class="loading-overlay" id="loadingOverlay">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>

                    <div class="signup-container">
                        <!-- Initial Loading State -->
                        <div class="signup-card" id="loadingCard">
                            <div class="logo-container">
                                <div class="skeleton skeleton-logo"></div>
                                <div class="skeleton skeleton-text" style="width: 60%; margin: 0 auto;"></div>
                                <div class="skeleton skeleton-text" style="width: 40%; margin: 10px auto;"></div>
                            </div>
                        </div>

                        <!-- Error State -->
                        <div class="signup-card" id="errorCard" style="display: none;">
                            <div class="error-container">
                                <i class="bi bi-exclamation-circle error-icon"></i>
                                <h2 class="error-title" id="errorTitle">Temple Not Found</h2>
                                <p class="error-message" id="errorMessage">The temple you're looking for doesn't exist or is not available.</p>
                                <button class="btn btn-secondary" onclick="window.location.href='/'">Go to Homepage</button>
                            </div>
                        </div>

                        <!-- Signup Form -->
                        <div class="signup-card" id="signupCard" style="display: none;">
                            <div class="logo-container">
                                <div id="logoContainer">
                                    <div class="logo-placeholder">
                                        <i class="bi bi-building"></i>
                                    </div>
                                </div>
                                <h1 id="templeName">Temple Management System</h1>
                                <p class="subtitle">Create Your Account</p>
                            </div>

                            <!-- Progress Steps -->
                            <div class="steps-container mb-4">
                                <div class="step-item active" data-step="1">
                                    <div class="step-circle">1</div>
                                    <div class="step-label">Account</div>
                                </div>
                                <div class="step-line"></div>
                                <div class="step-item" data-step="2">
                                    <div class="step-circle">2</div>
                                    <div class="step-label">Personal</div>
                                </div>
                                <div class="step-line"></div>
                                <div class="step-item" data-step="3">
                                    <div class="step-circle">3</div>
                                    <div class="step-label">Confirm</div>
                                </div>
                            </div>

                            <!-- Alert Messages -->
                            <div id="alertContainer"></div>

                            <form id="signupForm">
                                <input type="hidden" id="templeId" value="">
                                <input type="hidden" id="userType" value="MEMBER">

                                <!-- Step 1: Account Information -->
                                <div class="form-step active" id="step1">
                                    <h5 class="step-title mb-4">Account Information</h5>
                                    
                                    <div class="form-floating mb-3">
                                        <input type="text" class="form-control" id="username" 
                                               placeholder="Username" required 
                                               pattern="[a-zA-Z0-9_]{4,20}"
                                               autocomplete="username">
                                        <label for="username">Username <span class="text-danger">*</span></label>
                                        <div class="input-feedback" id="usernameFeedback"></div>
                                        <div class="form-text">4-20 characters, letters, numbers, and underscore only</div>
                                    </div>

                                    <div class="form-floating mb-3">
                                        <input type="email" class="form-control" id="email" 
                                               placeholder="Email" required autocomplete="email">
                                        <label for="email">Email Address <span class="text-danger">*</span></label>
                                        <div class="input-feedback" id="emailFeedback"></div>
                                    </div>

                                    <div class="form-floating mb-3 position-relative">
                                        <input type="password" class="form-control" id="password" 
                                               placeholder="Password" required 
                                               minlength="8"
                                               autocomplete="new-password">
                                        <label for="password">Password <span class="text-danger">*</span></label>
                                        <i class="bi bi-eye-slash password-toggle" id="passwordToggle"></i>
                                        <div class="password-strength" id="passwordStrength"></div>
                                        <div class="form-text">Min 8 characters with uppercase, lowercase, number & special character</div>
                                    </div>

                                    <div class="form-floating mb-3 position-relative">
                                        <input type="password" class="form-control" id="confirmPassword" 
                                               placeholder="Confirm Password" required 
                                               autocomplete="new-password">
                                        <label for="confirmPassword">Confirm Password <span class="text-danger">*</span></label>
                                        <i class="bi bi-eye-slash password-toggle" id="confirmPasswordToggle"></i>
                                        <div class="input-feedback" id="confirmPasswordFeedback"></div>
                                    </div>

                                    <div class="d-grid gap-2">
                                        <button type="button" class="btn btn-primary" id="nextStep1">
                                            Next <i class="bi bi-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Step 2: Personal Information -->
                                <div class="form-step" id="step2" style="display: none;">
                                    <h5 class="step-title mb-4">Personal Information</h5>
                                    
                                    <div class="form-floating mb-3">
                                        <input type="text" class="form-control" id="fullName" 
                                               placeholder="Full Name" required>
                                        <label for="fullName">Full Name <span class="text-danger">*</span></label>
                                    </div>

                                    <div class="row g-3 mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Gender <span class="text-danger">*</span></label>
                                            <div class="btn-group w-100" role="group">
                                                <input type="radio" class="btn-check" name="gender" id="genderMale" value="MALE" required>
                                                <label class="btn btn-outline-primary" for="genderMale">Male</label>
                                                
                                                <input type="radio" class="btn-check" name="gender" id="genderFemale" value="FEMALE">
                                                <label class="btn btn-outline-primary" for="genderFemale">Female</label>
                                                
                                                <input type="radio" class="btn-check" name="gender" id="genderOther" value="OTHER">
                                                <label class="btn btn-outline-primary" for="genderOther">Other</label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-floating">
                                                <input type="date" class="form-control" id="dateOfBirth" 
                                                       max="${new Date().toISOString().split('T')[0]}">
                                                <label for="dateOfBirth">Date of Birth</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row g-3 mb-3">
                                        <div class="col-4">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="mobileCode" 
                                                       value="+60" placeholder="Code">
                                                <label for="mobileCode">Code</label>
                                            </div>
                                        </div>
                                        <div class="col-8">
                                            <div class="form-floating">
                                                <input type="tel" class="form-control" id="mobileNo" 
                                                       placeholder="Mobile Number" required
                                                       pattern="[0-9]{8,15}">
                                                <label for="mobileNo">Mobile Number <span class="text-danger">*</span></label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-floating mb-3">
                                        <input type="text" class="form-control" id="idProofNumber" 
                                               placeholder="ID Proof Number">
                                        <label for="idProofNumber">NRIC / Passport Number</label>
                                    </div>

                                    <div class="form-floating mb-3">
                                        <textarea class="form-control" id="address" 
                                                  placeholder="Address" style="height: 80px"></textarea>
                                        <label for="address">Address</label>
                                    </div>

                                    <div class="row g-3 mb-3">
                                        <div class="col-md-6">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="city" placeholder="City">
                                                <label for="city">City</label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="state" placeholder="State">
                                                <label for="state">State</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row g-3 mb-3">
                                        <div class="col-md-6">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="country" 
                                                       value="Malaysia" placeholder="Country">
                                                <label for="country">Country</label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="pincode" 
                                                       placeholder="Pincode" pattern="[0-9]{5,6}">
                                                <label for="pincode">Pincode</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="d-grid gap-2">
                                        <button type="button" class="btn btn-secondary mb-2" id="prevStep2">
                                            <i class="bi bi-arrow-left"></i> Back
                                        </button>
                                        <button type="button" class="btn btn-primary" id="nextStep2">
                                            Next <i class="bi bi-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Step 3: Confirmation -->
                                <div class="form-step" id="step3" style="display: none;">
                                    <h5 class="step-title mb-4">Review & Confirm</h5>
                                    
                                    <div class="review-section mb-4">
                                        <h6 class="text-muted mb-3">Account Information</h6>
                                        <div class="review-item">
                                            <strong>Username:</strong>
                                            <span id="reviewUsername"></span>
                                        </div>
                                        <div class="review-item">
                                            <strong>Email:</strong>
                                            <span id="reviewEmail"></span>
                                        </div>
                                    </div>

                                    <div class="review-section mb-4">
                                        <h6 class="text-muted mb-3">Personal Information</h6>
                                        <div class="review-item">
                                            <strong>Full Name:</strong>
                                            <span id="reviewFullName"></span>
                                        </div>
                                        <div class="review-item">
                                            <strong>Gender:</strong>
                                            <span id="reviewGender"></span>
                                        </div>
                                        <div class="review-item">
                                            <strong>Date of Birth:</strong>
                                            <span id="reviewDob"></span>
                                        </div>
                                        <div class="review-item">
                                            <strong>Mobile:</strong>
                                            <span id="reviewMobile"></span>
                                        </div>
                                        <div class="review-item">
                                            <strong>Address:</strong>
                                            <span id="reviewAddress"></span>
                                        </div>
                                    </div>

                                    <div class="form-check mb-3">
                                        <input class="form-check-input" type="checkbox" id="agreeTerms" required>
                                        <label class="form-check-label" for="agreeTerms">
                                            I agree to the <a href="#" id="termsLink">Terms & Conditions</a> and 
                                            <a href="#" id="privacyLink">Privacy Policy</a>
                                        </label>
                                    </div>

                                    <div class="form-check mb-4">
                                        <input class="form-check-input" type="checkbox" id="subscribeNewsletter">
                                        <label class="form-check-label" for="subscribeNewsletter">
                                            Subscribe to newsletter and updates
                                        </label>
                                    </div>

                                    <div class="d-grid gap-2">
                                        <button type="button" class="btn btn-secondary mb-2" id="prevStep3">
                                            <i class="bi bi-arrow-left"></i> Back
                                        </button>
                                        <button type="submit" class="btn btn-primary" id="signupButton">
                                            <span id="signupButtonText">
                                                <i class="bi bi-check-circle"></i> Create Account
                                            </span>
                                            <span id="signupButtonSpinner" style="display: none;">
                                                <span class="spinner-border spinner-border-sm" role="status"></span>
                                                Creating Account...
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div class="text-center mt-4">
                                <p class="mb-0">Already have an account? 
                                    <a href="#" id="loginLink" class="text-primary">Sign In</a>
                                </p>
                            </div>

                            <div class="footer-text">
                                <p>&copy; 2024 Temple Management System. All rights reserved.</p>
                            </div>
                        </div>

                        <!-- Success State -->
                        <div class="signup-card" id="successCard" style="display: none;">
                            <div class="success-container">
                                <i class="bi bi-check-circle-fill success-icon"></i>
                                <h2 class="success-title">Account Created Successfully!</h2>
                                <p class="success-message">
                                    Your account has been created. Please check your email for verification link.
                                </p>
                                <div class="d-grid gap-2 mt-4">
                                    <button class="btn btn-primary" id="goToLogin">
                                        Proceed to Login <i class="bi bi-arrow-right"></i>
                                    </button>
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
        
        // Get signup page styles
        getSignupStyles: function() {
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
                    padding: 20px 0;
                    background-image: 
                        radial-gradient(circle at 20% 80%, rgba(255, 0, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(128, 128, 0, 0.1) 0%, transparent 50%);
                }

                .signup-container {
                    width: 100%;
                    max-width: 550px;
                    padding: 20px;
                }

                .signup-card {
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
                    width: 80px;
                    height: 80px;
                    border-radius: 16px;
                    margin-bottom: 15px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                    object-fit: cover;
                }

                .logo-placeholder {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    border-radius: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                }

                .logo-placeholder i {
                    font-size: 40px;
                    color: white;
                }

                h1 {
                    font-size: 22px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    color: var(--text-color);
                }

                .subtitle {
                    color: #6c757d;
                    font-size: 15px;
                    margin-bottom: 20px;
                }

                /* Progress Steps */
                .steps-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    position: relative;
                }

                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    position: relative;
                    z-index: 2;
                }

                .step-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #e9ecef;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    margin-bottom: 8px;
                    transition: all 0.3s ease;
                }

                .step-item.active .step-circle {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    color: white;
                    box-shadow: 0 4px 12px rgba(255, 0, 255, 0.3);
                }

                .step-item.completed .step-circle {
                    background: #28a745;
                    color: white;
                }

                .step-label {
                    font-size: 12px;
                    color: #6c757d;
                    font-weight: 500;
                }

                .step-item.active .step-label {
                    color: var(--primary-color);
                    font-weight: 600;
                }

                .step-line {
                    flex: 1;
                    height: 2px;
                    background: #e9ecef;
                    position: relative;
                    top: -15px;
                    margin: 0 -10px;
                    z-index: 1;
                }

                .step-item.completed ~ .step-line {
                    background: #28a745;
                }

                /* Form Steps */
                .form-step {
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .step-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-color);
                }

                .form-floating {
                    margin-bottom: 20px;
                }

                .form-control, .form-select {
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 12px 15px;
                    font-size: 15px;
                    transition: all 0.3s ease;
                    height: 55px;
                }

                .form-control:focus, .form-select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 0.2rem rgba(255, 0, 255, 0.1);
                }

                .form-floating label {
                    padding: 16px 15px;
                    color: #6c757d;
                }

                .form-text {
                    font-size: 12px;
                    color: #6c757d;
                    margin-top: 4px;
                }

                textarea.form-control {
                    min-height: 80px;
                    resize: vertical;
                }

                /* Input Feedback */
                .input-feedback {
                    font-size: 12px;
                    margin-top: 5px;
                    min-height: 18px;
                }

                .input-feedback.success {
                    color: #28a745;
                }

                .input-feedback.error {
                    color: #dc3545;
                }

                .input-feedback.checking {
                    color: #6c757d;
                }

                /* Password Strength Indicator */
                .password-strength {
                    margin-top: 8px;
                    height: 4px;
                    border-radius: 2px;
                    background: #e9ecef;
                    overflow: hidden;
                }

                .password-strength::before {
                    content: '';
                    display: block;
                    height: 100%;
                    width: 0;
                    transition: all 0.3s ease;
                }

                .password-strength.weak::before {
                    width: 33%;
                    background: #dc3545;
                }

                .password-strength.medium::before {
                    width: 66%;
                    background: #ffc107;
                }

                .password-strength.strong::before {
                    width: 100%;
                    background: #28a745;
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

                /* Review Section */
                .review-section {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 20px;
                }

                .review-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                }

                .review-item:last-child {
                    border-bottom: none;
                }

                .review-item strong {
                    color: #495057;
                    font-weight: 600;
                }

                .review-item span {
                    color: #6c757d;
                }

                /* Buttons */
                .btn-primary {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    border: none;
                    border-radius: 12px;
                    padding: 14px 30px;
                    font-size: 15px;
                    font-weight: 600;
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
                    font-size: 15px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    color: white;
                }

                .btn-outline-primary {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }

                .btn-outline-primary:hover,
                .btn-outline-primary.active,
                .btn-check:checked + .btn-outline-primary {
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                    color: white;
                }

                /* Success/Error States */
                .success-container, .error-container {
                    text-align: center;
                    padding: 60px 20px;
                }

                .success-icon {
                    font-size: 80px;
                    color: #28a745;
                    margin-bottom: 20px;
                    animation: scaleIn 0.5s ease;
                }

                .error-icon {
                    font-size: 80px;
                    color: #dc3545;
                    margin-bottom: 20px;
                }

                @keyframes scaleIn {
                    from {
                        transform: scale(0);
                    }
                    to {
                        transform: scale(1);
                    }
                }

                .success-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: #28a745;
                }

                .error-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: #dc3545;
                }

                .success-message, .error-message {
                    color: #6c757d;
                    margin-bottom: 30px;
                    line-height: 1.6;
                }

                /* Alert */
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

                /* Loading Overlay */
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

                /* Skeleton Loading */
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
                    width: 80px;
                    height: 80px;
                    border-radius: 16px;
                    margin: 0 auto 20px;
                }

                .footer-text {
                    text-align: center;
                    margin-top: 30px;
                    color: #6c757d;
                    font-size: 13px;
                }

                /* Form Check */
                .form-check-label {
                    font-size: 14px;
                }

                .form-check-label a {
                    color: var(--primary-color);
                    text-decoration: none;
                    font-weight: 600;
                }

                .form-check-label a:hover {
                    text-decoration: underline;
                }

                .form-check-input:checked {
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                }

                /* Responsive */
                @media (max-width: 576px) {
                    .signup-card {
                        padding: 30px 20px;
                    }
                    
                    h1 {
                        font-size: 20px;
                    }
                    
                    .subtitle {
                        font-size: 14px;
                    }

                    .step-circle {
                        width: 35px;
                        height: 35px;
                        font-size: 14px;
                    }

                    .step-label {
                        font-size: 11px;
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
                        $('#signupCard').show();
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
            
            const primaryRgb = this.hexToRgb(theme.primary_color || '#ff00ff');
            const secondaryRgb = this.hexToRgb(theme.secondary_color || '#808000');
            document.documentElement.style.setProperty('--primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
            document.documentElement.style.setProperty('--secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
        },
        
        // Update UI with temple information
        updateTempleUI: function(config) {
            $('#templeName').text(config.temple_name);
            document.title = `${config.temple_name} - Sign Up`;
            
            if (config.temple_logo) {
                $('#logoContainer').html(`
                    <img src="${config.temple_logo}" alt="${config.temple_name}" class="temple-logo" 
                         onerror="this.style.display='none'; document.querySelector('.logo-placeholder').style.display='inline-flex';">
                `);
            }
            
            $('#templeId').val(config.temple_id);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Form submission
            $('#signupForm').on('submit', function(e) {
                e.preventDefault();
                self.handleSignup();
            });
            
            // Step navigation
            $('#nextStep1').on('click', function() {
                if (self.validateStep(1)) {
                    self.saveStepData(1);
                    self.goToStep(2);
                }
            });
            
            $('#nextStep2').on('click', function() {
                if (self.validateStep(2)) {
                    self.saveStepData(2);
                    self.updateReview();
                    self.goToStep(3);
                }
            });
            
            $('#prevStep2').on('click', function() {
                self.goToStep(1);
            });
            
            $('#prevStep3').on('click', function() {
                self.goToStep(2);
            });
            
            // Password toggles
            $('#passwordToggle').on('click', function() {
                self.togglePassword('password', 'passwordToggle');
            });
            
            $('#confirmPasswordToggle').on('click', function() {
                self.togglePassword('confirmPassword', 'confirmPasswordToggle');
            });
            
            // Password strength check
            $('#password').on('input', function() {
                self.checkPasswordStrength($(this).val());
            });
            
            // Confirm password validation
            $('#confirmPassword').on('input', function() {
                self.validatePasswordMatch();
            });
            
            // Username availability check (debounced)
            let usernameTimeout;
            $('#username').on('blur', function() {
                clearTimeout(usernameTimeout);
                const username = $(this).val();
                
                if (username.length >= 4) {
                    usernameTimeout = setTimeout(function() {
                        self.checkUsernameAvailability(username);
                    }, 300);
                }
            });
            
            // Email availability check (debounced)
            let emailTimeout;
            $('#email').on('blur', function() {
                clearTimeout(emailTimeout);
                const email = $(this).val();
                
                if (email.includes('@')) {
                    emailTimeout = setTimeout(function() {
                        self.checkEmailAvailability(email);
                    }, 300);
                }
            });
            
            // Login link
            $('#loginLink').on('click', function(e) {
                e.preventDefault();
                window.location.href = `/${self.templeId}/login`;
            });
            
            // Go to login after success
            $('#goToLogin').on('click', function() {
                window.location.href = `/${self.templeId}/login`;
            });
        },
        
        // Validate current step
        validateStep: function(step) {
            const self = this;
            let isValid = true;
            
            if (step === 1) {
                // Validate account information
                const username = $('#username').val().trim();
                const email = $('#email').val().trim();
                const password = $('#password').val();
                const confirmPassword = $('#confirmPassword').val();
                
                if (!username || username.length < 4) {
                    self.showAlert('Username must be at least 4 characters', 'danger');
                    return false;
                }
                
                if (!email || !self.isValidEmail(email)) {
                    self.showAlert('Please enter a valid email address', 'danger');
                    return false;
                }
                
                if (!password || !self.isStrongPassword(password)) {
                    self.showAlert('Password does not meet requirements', 'danger');
                    return false;
                }
                
                if (password !== confirmPassword) {
                    self.showAlert('Passwords do not match', 'danger');
                    return false;
                }
            } else if (step === 2) {
                // Validate personal information
                const fullName = $('#fullName').val().trim();
                const gender = $('input[name="gender"]:checked').val();
                const mobileNo = $('#mobileNo').val().trim();
                
                if (!fullName) {
                    self.showAlert('Please enter your full name', 'danger');
                    return false;
                }
                
                if (!gender) {
                    self.showAlert('Please select your gender', 'danger');
                    return false;
                }
                
                if (!mobileNo || mobileNo.length < 8) {
                    self.showAlert('Please enter a valid mobile number', 'danger');
                    return false;
                }
            }
            
            return isValid;
        },
        
        // Save step data
        saveStepData: function(step) {
            if (step === 1) {
                this.formData.username = $('#username').val().trim();
                this.formData.email = $('#email').val().trim();
                this.formData.password = $('#password').val();
                this.formData.password_confirmation = $('#confirmPassword').val();
            } else if (step === 2) {
                this.formData.name = $('#fullName').val().trim();
                this.formData.gender = $('input[name="gender"]:checked').val();
                this.formData.date_of_birth = $('#dateOfBirth').val() || null;
                this.formData.mobile_code = $('#mobileCode').val();
                this.formData.mobile_no = $('#mobileNo').val().trim();
                this.formData.id_proof_number = $('#idProofNumber').val().trim() || null;
                this.formData.address = $('#address').val().trim() || null;
                this.formData.city = $('#city').val().trim() || null;
                this.formData.state = $('#state').val().trim() || null;
                this.formData.country = $('#country').val().trim() || 'Malaysia';
                this.formData.pincode = $('#pincode').val().trim() || null;
            }
        },
        
        // Go to specific step
        goToStep: function(step) {
            // Hide all steps
            $('.form-step').hide();
            
            // Show target step
            $(`#step${step}`).show();
            
            // Update progress
            $('.step-item').removeClass('active completed');
            
            for (let i = 1; i <= this.totalSteps; i++) {
                const $stepItem = $(`.step-item[data-step="${i}"]`);
                
                if (i < step) {
                    $stepItem.addClass('completed');
                } else if (i === step) {
                    $stepItem.addClass('active');
                }
            }
            
            this.currentStep = step;
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        
        // Update review section
        updateReview: function() {
            $('#reviewUsername').text(this.formData.username);
            $('#reviewEmail').text(this.formData.email);
            $('#reviewFullName').text(this.formData.name);
            $('#reviewGender').text(this.formData.gender);
            
            const dob = this.formData.date_of_birth;
            $('#reviewDob').text(dob ? new Date(dob).toLocaleDateString() : 'Not provided');
            
            const mobile = this.formData.mobile_code + ' ' + this.formData.mobile_no;
            $('#reviewMobile').text(mobile);
            
            const addressParts = [
                this.formData.address,
                this.formData.city,
                this.formData.state,
                this.formData.country,
                this.formData.pincode
            ].filter(Boolean);
            
            $('#reviewAddress').text(addressParts.join(', ') || 'Not provided');
        },
        
        // Handle signup submission
        handleSignup: function() {
            const self = this;
            
            if (!$('#agreeTerms').is(':checked')) {
                self.showAlert('Please agree to the Terms & Conditions', 'danger');
                return;
            }
            
            self.setLoadingState(true);
            
            const signupData = {
                temple_id: $('#templeId').val(),
                user_type: $('#userType').val(),
                username: this.formData.username,
                email: this.formData.email,
                password: this.formData.password,
                password_confirmation: this.formData.password_confirmation,
                name: this.formData.name,
                gender: this.formData.gender,
                date_of_birth: this.formData.date_of_birth,
                mobile_code: this.formData.mobile_code,
                mobile_no: this.formData.mobile_no,
                id_proof_number: this.formData.id_proof_number,
                address: this.formData.address,
                city: this.formData.city,
                state: this.formData.state,
                country: this.formData.country,
                pincode: this.formData.pincode,
                subscribe_newsletter: $('#subscribeNewsletter').is(':checked')
            };
            
            TempleAPI.post('/auth/signup', signupData)
                .done(function(response) {
                    if (response.success) {
                        self.showSuccess();
                    } else {
                        self.handleSignupError(response);
                    }
                })
                .fail(function(xhr) {
                    self.setLoadingState(false);
                    const response = xhr.responseJSON;
                    
                    if (response && response.errors) {
                        self.showValidationErrors(response.errors);
                    } else {
                        self.showAlert(response?.message || 'Signup failed. Please try again.', 'danger');
                    }
                });
        },
        
        // Show success state
        showSuccess: function() {
            $('#signupCard').hide();
            $('#successCard').show();
        },
        
        // Handle signup error
        handleSignupError: function(response) {
            this.setLoadingState(false);
            this.showAlert(response.message || 'Signup failed', 'danger');
        },
        
        // Show validation errors
        showValidationErrors: function(errors) {
            let errorMessage = 'Please fix the following errors:<ul class="mb-0 mt-2">';
            
            $.each(errors, function(field, messages) {
                errorMessage += `<li>${messages[0]}</li>`;
            });
            
            errorMessage += '</ul>';
            
            this.showAlert(errorMessage, 'danger');
        },
        
        // Set loading state
        setLoadingState: function(loading) {
            if (loading) {
                $('#signupButton').prop('disabled', true);
                $('#signupButtonText').hide();
                $('#signupButtonSpinner').show();
                $('#loadingOverlay').addClass('active');
            } else {
                $('#signupButton').prop('disabled', false);
                $('#signupButtonText').show();
                $('#signupButtonSpinner').hide();
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
            
            // Scroll to alert
            $('html, body').animate({
                scrollTop: $('#alertContainer').offset().top - 100
            }, 300);
        },
        
        // Show error card
        showError: function(title, message) {
            $('#errorTitle').text(title);
            $('#errorMessage').text(message);
            $('#loadingCard').hide();
            $('#errorCard').show();
        },
        
        // Toggle password visibility
        togglePassword: function(inputId, iconId) {
            const $input = $(`#${inputId}`);
            const $icon = $(`#${iconId}`);
            
            if ($input.attr('type') === 'password') {
                $input.attr('type', 'text');
                $icon.removeClass('bi-eye-slash').addClass('bi-eye');
            } else {
                $input.attr('type', 'password');
                $icon.removeClass('bi-eye').addClass('bi-eye-slash');
            }
        },
        
        // Check password strength
        checkPasswordStrength: function(password) {
            const $strength = $('#passwordStrength');
            
            if (!password) {
                $strength.removeClass('weak medium strong');
                return;
            }
            
            let strength = 0;
            
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (/\d/.test(password)) strength++;
            if (/[@$!%*?&]/.test(password)) strength++;
            
            $strength.removeClass('weak medium strong');
            
            if (strength <= 2) {
                $strength.addClass('weak');
            } else if (strength === 3) {
                $strength.addClass('medium');
            } else {
                $strength.addClass('strong');
            }
        },
        
        // Validate password match
        validatePasswordMatch: function() {
            const password = $('#password').val();
            const confirmPassword = $('#confirmPassword').val();
            
            const $feedback = $('#confirmPasswordFeedback');
            
            if (!confirmPassword) {
                $feedback.html('').removeClass('success error');
                return;
            }
            
            if (password === confirmPassword) {
                $feedback.html('<i class="bi bi-check-circle"></i> Passwords match').addClass('success').removeClass('error');
            } else {
                $feedback.html('<i class="bi bi-x-circle"></i> Passwords do not match').addClass('error').removeClass('success');
            }
        },
        
        // Check username availability
        checkUsernameAvailability: function(username) {
            const $feedback = $('#usernameFeedback');
            
            $feedback.html('<i class="spinner-border spinner-border-sm"></i> Checking...').addClass('checking').removeClass('success error');
            
            TempleAPI.post('/auth/check-username', {
                username: username,
                temple_id: this.templeId
            })
            .done(function(response) {
                if (response.available) {
                    $feedback.html('<i class="bi bi-check-circle"></i> Username is available').addClass('success').removeClass('error checking');
                } else {
                    $feedback.html('<i class="bi bi-x-circle"></i> Username is already taken').addClass('error').removeClass('success checking');
                }
            })
            .fail(function() {
                $feedback.html('').removeClass('success error checking');
            });
        },
        
        // Check email availability
        checkEmailAvailability: function(email) {
            const $feedback = $('#emailFeedback');
            
            $feedback.html('<i class="spinner-border spinner-border-sm"></i> Checking...').addClass('checking').removeClass('success error');
            
            TempleAPI.post('/auth/check-email', {
                email: email,
                temple_id: this.templeId
            })
            .done(function(response) {
                if (response.available) {
                    $feedback.html('<i class="bi bi-check-circle"></i> Email is available').addClass('success').removeClass('error checking');
                } else {
                    $feedback.html('<i class="bi bi-x-circle"></i> Email is already registered').addClass('error').removeClass('success checking');
                }
            })
            .fail(function() {
                $feedback.html('').removeClass('success error checking');
            });
        },
        
        // Validate email format
        isValidEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        // Check if password is strong
        isStrongPassword: function(password) {
            const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            return re.test(password);
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