// js/pages/forgot-password/index.js
// Forgot Password module with OTP verification

(function ($, window) {
    'use strict';

    window.ForgotPasswordModal = {
        modal: null,
        currentStep: 1,
        email: null,
        resetToken: null,
        resendTimer: null,
        resendCountdown: 60,

        // Initialize the forgot password modal
        init: function () {
            this.createModal();
            this.bindEvents();
        },

        // Create modal HTML
        createModal: function () {
            const modalHtml = `
                <div class="modal fade" id="forgotPasswordModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header border-0">
                                <h5 class="modal-title">Reset Password</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body px-4">
                                <!-- Alert Container -->
                                <div id="fpAlertContainer"></div>

                                <!-- Step 1: Enter Email -->
                                <div id="step1" class="step-container">
                                    <div class="text-center mb-4">
                                        <div class="fp-icon-container">
                                            <i class="bi bi-envelope-fill"></i>
                                        </div>
                                        <h6 class="mt-3 mb-2">Forgot Your Password?</h6>
                                        <p class="text-muted small">Enter your email address and we'll send you an OTP to reset your password.</p>
                                    </div>

                                    <form id="emailForm">
                                        <div class="mb-3">
                                            <label for="fpEmail" class="form-label">Email Address</label>
                                            <input type="email" class="form-control" id="fpEmail" placeholder="Enter your email" required>
                                        </div>
                                        <button type="submit" class="btn btn-primary w-100" id="sendOtpBtn">
                                            <span id="sendOtpText">Send OTP</span>
                                            <span id="sendOtpSpinner" style="display: none;">
                                                <span class="spinner-border spinner-border-sm me-2"></span>Sending...
                                            </span>
                                        </button>
                                    </form>
                                </div>

                                <!-- Step 2: Verify OTP -->
                                <div id="step2" class="step-container" style="display: none;">
                                    <div class="text-center mb-4">
                                        <div class="fp-icon-container">
                                            <i class="bi bi-shield-lock-fill"></i>
                                        </div>
                                        <h6 class="mt-3 mb-2">Verify OTP</h6>
                                        <p class="text-muted small">We've sent a 6-digit OTP to <strong id="displayEmail"></strong></p>
                                    </div>

                                    <form id="otpForm">
                                        <div class="mb-3">
                                            <label for="fpOtp" class="form-label">Enter OTP</label>
                                            <div class="otp-input-container d-flex justify-content-center gap-2">
                                                <input type="text" class="form-control otp-input text-center" maxlength="1" data-index="0">
                                                <input type="text" class="form-control otp-input text-center" maxlength="1" data-index="1">
                                                <input type="text" class="form-control otp-input text-center" maxlength="1" data-index="2">
                                                <input type="text" class="form-control otp-input text-center" maxlength="1" data-index="3">
                                                <input type="text" class="form-control otp-input text-center" maxlength="1" data-index="4">
                                                <input type="text" class="form-control otp-input text-center" maxlength="1" data-index="5">
                                            </div>
                                        </div>

                                        <div class="text-center mb-3">
                                            <small class="text-muted">OTP expires in <strong>10 minutes</strong></small>
                                        </div>

                                        <div class="d-flex gap-2 mb-3">
                                            <button type="button" class="btn btn-outline-secondary" id="resendOtpBtn" disabled>
                                                <span id="resendOtpText">Resend OTP</span>
                                                <span id="resendTimer" style="display: none;">(60s)</span>
                                            </button>
                                            <button type="submit" class="btn btn-primary flex-grow-1" id="verifyOtpBtn">
                                                <span id="verifyOtpText">Verify OTP</span>
                                                <span id="verifyOtpSpinner" style="display: none;">
                                                    <span class="spinner-border spinner-border-sm me-2"></span>Verifying...
                                                </span>
                                            </button>
                                        </div>

                                        <button type="button" class="btn btn-link w-100 text-muted" id="backToEmailBtn">
                                            <i class="bi bi-arrow-left me-1"></i> Change Email
                                        </button>
                                    </form>
                                </div>

                                <!-- Step 3: Reset Password -->
                                <div id="step3" class="step-container" style="display: none;">
                                    <div class="text-center mb-4">
                                        <div class="fp-icon-container">
                                            <i class="bi bi-key-fill"></i>
                                        </div>
                                        <h6 class="mt-3 mb-2">Set New Password</h6>
                                        <p class="text-muted small">Create a strong password for your account</p>
                                    </div>

                                    <form id="resetPasswordForm">
                                        <div class="mb-3 position-relative">
                                            <label for="fpNewPassword" class="form-label">New Password</label>
                                            <input type="password" class="form-control" id="fpNewPassword" placeholder="Enter new password" required>
                                            <i class="bi bi-eye-slash password-toggle-fp" id="toggleNewPassword"></i>
                                        </div>

                                        <div class="mb-3 position-relative">
                                            <label for="fpConfirmPassword" class="form-label">Confirm Password</label>
                                            <input type="password" class="form-control" id="fpConfirmPassword" placeholder="Confirm new password" required>
                                            <i class="bi bi-eye-slash password-toggle-fp" id="toggleConfirmPassword"></i>
                                        </div>

                                        <!-- Password Requirements -->
                                        <div class="password-requirements mb-3">
                                            <small class="text-muted">Password must contain:</small>
                                            <ul class="small text-muted mb-0">
                                                <li id="req-length">At least 8 characters</li>
                                                <li id="req-uppercase">One uppercase letter</li>
                                                <li id="req-lowercase">One lowercase letter</li>
                                                <li id="req-number">One number</li>
                                                <li id="req-special">One special character (@$!%*?&)</li>
                                            </ul>
                                        </div>

                                        <button type="submit" class="btn btn-primary w-100" id="resetPasswordBtn">
                                            <span id="resetPasswordText">Reset Password</span>
                                            <span id="resetPasswordSpinner" style="display: none;">
                                                <span class="spinner-border spinner-border-sm me-2"></span>Resetting...
                                            </span>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to body if not exists
            if (!document.getElementById('forgotPasswordModal')) {
                $('body').append(modalHtml);
                this.addStyles();
            }

            this.modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        },

        // Add custom styles
        addStyles: function () {
            const styles = `
                <style>
                    .fp-icon-container {
                        width: 70px;
                        height: 70px;
                        margin: 0 auto;
                        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .fp-icon-container i {
                        font-size: 30px;
                        color: white;
                    }
                    
                    .otp-input {
                        width: 50px;
                        height: 50px;
                        font-size: 24px;
                        font-weight: 600;
                        text-align: center;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        transition: all 0.3s ease;
                    }
                    
                    .otp-input:focus {
                        border-color: var(--primary-color);
                        box-shadow: 0 0 0 0.2rem rgba(255, 0, 255, 0.1);
                    }
                    
                    .otp-input:not(:placeholder-shown) {
                        border-color: var(--primary-color);
                        background-color: rgba(255, 0, 255, 0.05);
                    }
                    
                    .password-toggle-fp {
                        position: absolute;
                        right: 15px;
                        top: 38px;
                        cursor: pointer;
                        color: #6c757d;
                        z-index: 10;
                    }
                    
                    .password-requirements ul {
                        list-style: none;
                        padding-left: 0;
                    }
                    
                    .password-requirements li {
                        padding-left: 20px;
                        position: relative;
                    }
                    
                    .password-requirements li::before {
                        content: '?';
                        position: absolute;
                        left: 0;
                        color: #dc3545;
                    }
                    
                    .password-requirements li.valid::before {
                        content: '?';
                        color: #28a745;
                    }
                </style>
            `;

            if (!document.getElementById('forgotPasswordStyles')) {
                $('head').append($(styles).attr('id', 'forgotPasswordStyles'));
            }
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Show modal when forgot password link is clicked
            $(document).on('click', '#forgotPasswordLink', function (e) {
                e.preventDefault();
                self.show();
            });

            // Step 1: Send OTP
            $('#emailForm').on('submit', function (e) {
                e.preventDefault();
                self.sendOTP();
            });

            // Step 2: OTP input handling
            $('.otp-input').on('input', function () {
                self.handleOtpInput($(this));
            });

            $('.otp-input').on('keydown', function (e) {
                self.handleOtpKeydown($(this), e);
            });

            $('.otp-input').on('paste', function (e) {
                self.handleOtpPaste(e);
            });

            // Verify OTP
            $('#otpForm').on('submit', function (e) {
                e.preventDefault();
                self.verifyOTP();
            });

            // Resend OTP
            $('#resendOtpBtn').on('click', function () {
                self.resendOTP();
            });

            // Back to email
            $('#backToEmailBtn').on('click', function () {
                self.goToStep(1);
            });

            // Step 3: Reset password
            $('#resetPasswordForm').on('submit', function (e) {
                e.preventDefault();
                self.resetPassword();
            });

            // Password validation
            $('#fpNewPassword').on('input', function () {
                self.validatePasswordRequirements($(this).val());
            });

            // Password toggle
            $('#toggleNewPassword, #toggleConfirmPassword').on('click', function () {
                self.togglePasswordVisibility($(this));
            });

            // Reset on modal close
            $('#forgotPasswordModal').on('hidden.bs.modal', function () {
                self.reset();
            });
        },

        // Show modal
        show: function () {
            this.reset();
            this.modal.show();
        },

        // Send OTP
        sendOTP: function () {
            const self = this;
            const email = $('#fpEmail').val().trim();

            if (!email) {
                self.showAlert('Please enter your email address', 'danger');
                return;
            }

            self.setLoadingState('sendOtp', true);
            self.clearAlert();

            TempleAPI.post('/auth/forgot-password', { email: email })
                .done(function (response) {
                    if (response.success) {
                        self.email = email;
                        self.showAlert(response.message, 'success');

                        setTimeout(function () {
                            self.goToStep(2);
                            self.startResendTimer();
                        }, 1000);
                    } else {
                        self.showAlert(response.message || 'Failed to send OTP', 'danger');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    self.showAlert(response?.message || 'Failed to send OTP', 'danger');
                })
                .always(function () {
                    self.setLoadingState('sendOtp', false);
                });
        },

        // Verify OTP
        verifyOTP: function () {
            const self = this;
            const otp = self.getOtpValue();

            if (otp.length !== 6) {
                self.showAlert('Please enter the complete 6-digit OTP', 'danger');
                return;
            }

            self.setLoadingState('verifyOtp', true);
            self.clearAlert();

            TempleAPI.post('/auth/verify-otp', {
                email: self.email,
                otp: otp
            })
                .done(function (response) {
                    if (response.success && response.data.verified) {
                        self.resetToken = response.data.reset_token;
                        self.showAlert('OTP verified successfully!', 'success');

                        setTimeout(function () {
                            self.goToStep(3);
                        }, 1000);
                    } else {
                        self.showAlert(response.message || 'Invalid OTP', 'danger');
                        self.clearOtpInputs();
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    self.showAlert(response?.message || 'Invalid OTP', 'danger');
                    self.clearOtpInputs();
                })
                .always(function () {
                    self.setLoadingState('verifyOtp', false);
                });
        },

        // Reset password
        resetPassword: function () {
            const self = this;
            const newPassword = $('#fpNewPassword').val();
            const confirmPassword = $('#fpConfirmPassword').val();

            if (!newPassword || !confirmPassword) {
                self.showAlert('Please fill in all password fields', 'danger');
                return;
            }

            if (newPassword !== confirmPassword) {
                self.showAlert('Passwords do not match', 'danger');
                return;
            }

            if (!self.isPasswordValid(newPassword)) {
                self.showAlert('Password does not meet requirements', 'danger');
                return;
            }

            self.setLoadingState('resetPassword', true);
            self.clearAlert();

            TempleAPI.post('/auth/reset-password', {
                email: self.email,
                reset_token: self.resetToken,
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            })
                .done(function (response) {
                    if (response.success) {
                        self.showAlert('Password reset successfully! You can now login with your new password.', 'success');

                        setTimeout(function () {
                            self.modal.hide();
                            // Optionally pre-fill username in login form
                            $('#username').val(self.email);
                        }, 2000);
                    } else {
                        self.showAlert(response.message || 'Failed to reset password', 'danger');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    self.showAlert(response?.message || 'Failed to reset password', 'danger');
                })
                .always(function () {
                    self.setLoadingState('resetPassword', false);
                });
        },

        // Resend OTP
        resendOTP: function () {
            const self = this;

            self.clearAlert();

            TempleAPI.post('/auth/resend-otp', { email: self.email })
                .done(function (response) {
                    if (response.success) {
                        self.showAlert('A new OTP has been sent to your email', 'success');
                        self.clearOtpInputs();
                        self.startResendTimer();
                    } else {
                        self.showAlert(response.message || 'Failed to resend OTP', 'danger');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    self.showAlert(response?.message || 'Failed to resend OTP', 'danger');
                });
        },

        // Handle OTP input
        handleOtpInput: function ($input) {
            const value = $input.val();

            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                $input.val('');
                return;
            }

            // Move to next input
            if (value.length === 1) {
                const index = parseInt($input.data('index'));
                if (index < 5) {
                    $('.otp-input[data-index="' + (index + 1) + '"]').focus();
                }
            }

            // Auto-submit if all fields filled
            if (this.getOtpValue().length === 6) {
                setTimeout(() => {
                    $('#otpForm').trigger('submit');
                }, 500);
            }
        },

        // Handle OTP keydown
        handleOtpKeydown: function ($input, e) {
            // Backspace handling
            if (e.key === 'Backspace' && !$input.val()) {
                const index = parseInt($input.data('index'));
                if (index > 0) {
                    const $prevInput = $('.otp-input[data-index="' + (index - 1) + '"]');
                    $prevInput.val('').focus();
                }
            }

            // Arrow key navigation
            const index = parseInt($input.data('index'));

            if (e.key === 'ArrowLeft' && index > 0) {
                $('.otp-input[data-index="' + (index - 1) + '"]').focus();
            }

            if (e.key === 'ArrowRight' && index < 5) {
                $('.otp-input[data-index="' + (index + 1) + '"]').focus();
            }
        },

        // Handle OTP paste
        handleOtpPaste: function (e) {
            e.preventDefault();

            const pasteData = (e.originalEvent.clipboardData || window.clipboardData).getData('text');
            const digits = pasteData.replace(/\D/g, '').slice(0, 6);

            if (digits.length === 6) {
                digits.split('').forEach((digit, index) => {
                    $('.otp-input[data-index="' + index + '"]').val(digit);
                });

                $('.otp-input[data-index="5"]').focus();

                // Auto-submit
                setTimeout(() => {
                    $('#otpForm').trigger('submit');
                }, 500);
            }
        },

        // Get OTP value
        getOtpValue: function () {
            let otp = '';
            $('.otp-input').each(function () {
                otp += $(this).val();
            });
            return otp;
        },

        // Clear OTP inputs
        clearOtpInputs: function () {
            $('.otp-input').val('');
            $('.otp-input[data-index="0"]').focus();
        },

        // Start resend timer
        startResendTimer: function () {
            const self = this;

            self.resendCountdown = 60;
            $('#resendOtpBtn').prop('disabled', true);
            $('#resendTimer').show().text('(' + self.resendCountdown + 's)');

            self.resendTimer = setInterval(function () {
                self.resendCountdown--;
                $('#resendTimer').text('(' + self.resendCountdown + 's)');

                if (self.resendCountdown <= 0) {
                    clearInterval(self.resendTimer);
                    $('#resendOtpBtn').prop('disabled', false);
                    $('#resendTimer').hide();
                }
            }, 1000);
        },

        // Validate password requirements
        validatePasswordRequirements: function (password) {
            const requirements = {
                'req-length': password.length >= 8,
                'req-uppercase': /[A-Z]/.test(password),
                'req-lowercase': /[a-z]/.test(password),
                'req-number': /\d/.test(password),
                'req-special': /[@$!%*?&]/.test(password)
            };

            Object.keys(requirements).forEach(function (req) {
                if (requirements[req]) {
                    $('#' + req).addClass('valid');
                } else {
                    $('#' + req).removeClass('valid');
                }
            });

            return Object.values(requirements).every(v => v);
        },

        // Check if password is valid
        isPasswordValid: function (password) {
            return password.length >= 8 &&
                /[A-Z]/.test(password) &&
                /[a-z]/.test(password) &&
                /\d/.test(password) &&
                /[@$!%*?&]/.test(password);
        },

        // Toggle password visibility
        togglePasswordVisibility: function ($icon) {
            const $input = $icon.siblings('input');

            if ($input.attr('type') === 'password') {
                $input.attr('type', 'text');
                $icon.removeClass('bi-eye-slash').addClass('bi-eye');
            } else {
                $input.attr('type', 'password');
                $icon.removeClass('bi-eye').addClass('bi-eye-slash');
            }
        },

        // Go to step
        goToStep: function (step) {
            this.currentStep = step;

            // Hide all steps
            $('.step-container').hide();

            // Show current step
            $('#step' + step).fadeIn();

            // Update display email
            if (step === 2) {
                $('#displayEmail').text(this.email);
                setTimeout(() => {
                    $('.otp-input[data-index="0"]').focus();
                }, 300);
            }

            // Clear alert
            this.clearAlert();
        },

        // Show alert
        showAlert: function (message, type) {
            const alertHtml = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#fpAlertContainer').html(alertHtml);
        },

        // Clear alert
        clearAlert: function () {
            $('#fpAlertContainer').empty();
        },

        // Set loading state
        setLoadingState: function (button, loading) {
            const buttonId = button + 'Btn';
            const textId = button + 'Text';
            const spinnerId = button + 'Spinner';

            if (loading) {
                $('#' + buttonId).prop('disabled', true);
                $('#' + textId).hide();
                $('#' + spinnerId).show();
            } else {
                $('#' + buttonId).prop('disabled', false);
                $('#' + textId).show();
                $('#' + spinnerId).hide();
            }
        },

        // Reset modal
        reset: function () {
            // Clear timers
            if (this.resendTimer) {
                clearInterval(this.resendTimer);
            }

            // Reset state
            this.currentStep = 1;
            this.email = null;
            this.resetToken = null;

            // Reset forms
            $('#emailForm')[0].reset();
            $('#otpForm')[0].reset();
            $('#resetPasswordForm')[0].reset();
            this.clearOtpInputs();

            // Reset password requirements
            $('.password-requirements li').removeClass('valid');

            // Go to step 1
            this.goToStep(1);

            // Clear alert
            this.clearAlert();
        }
    };

})(jQuery, window);