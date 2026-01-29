// js/components/header.js
// Header component using jQuery

(function ($, window) {
    'use strict';

    window.HeaderComponent = {
        // Initialize header
        init: function () {
            this.render();
            this.updateInfo();
            this.bindEvents();
            this.loadNotifications();
        },

        // Render header HTML
        render: function () {
            const html = `
                <nav class="navbar navbar-expand-lg navbar-light">
                    <div class="container-fluid">
                        <button class="btn btn-link d-md-none" id="sidebarToggle" style="font-size: 1.5rem;">
                            <i class="bi bi-list"></i>
                        </button>
                        <a class="navbar-brand" href="#" id="navbarBrand">
                            <img src="/assets/logo-placeholder.png" alt="Logo" class="temple-logo-nav" id="templeLogoNav" style="display: none;">
                            <span id="templeNameNav">Temple Management System</span>
                        </a>
                        
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                            <span class="navbar-toggler-icon"></span>
                        </button>
                        
                        <div class="collapse navbar-collapse" id="navbarNav">
                            <ul class="navbar-nav ms-auto">
                                <!-- Notifications -->
                                <li class="nav-item dropdown me-3">
                                    <a class="nav-link position-relative" href="#" id="notificationDropdown" role="button" data-bs-toggle="dropdown">
                                        <i class="bi bi-bell"></i>
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="notificationCount" style="display: none;">
                                            0
                                        </span>
                                    </a>
                                    <ul class="dropdown-menu dropdown-menu-end" style="width: 300px;">
                                        <li class="dropdown-header">Notifications</li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li id="notificationList">
                                            <a class="dropdown-item" href="#">
                                                <small class="text-muted">No new notifications</small>
                                            </a>
                                        </li>
                                    </ul>
                                </li>
                                
                                <!-- User Menu -->
                                <li class="nav-item dropdown">
                                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                                        <i class="bi bi-person-circle"></i> <span id="userName">User</span>
                                    </a>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                            <div class="dropdown-item-text">
                                                <div class="small text-muted" id="userRole">Role</div>
                                                <div class="small text-muted" id="userTemple">Temple</div>
                                            </div>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item" href="#" id="profileLink"><i class="bi bi-person"></i> Profile</a></li>
                                        <li><a class="dropdown-item" href="#" id="settingsLink"><i class="bi bi-gear"></i> Settings</a></li>
                                        <li><a class="dropdown-item" href="#" id="changePasswordLink"><i class="bi bi-key"></i> Change Password</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" href="#" id="logoutLink"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>

                <!-- Change Password Modal -->
                <div class="modal fade" id="changePasswordModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Change Password</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="changePasswordForm">
                                    <div class="mb-3">
                                        <label class="form-label">Current Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="currentPassword" required>
                                            <button class="btn btn-outline-secondary password-toggle" type="button" data-target="currentPassword">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">New Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="newPassword" required>
                                            <button class="btn btn-outline-secondary password-toggle" type="button" data-target="newPassword">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </div>
                                        <div class="form-text">Minimum 8 characters with at least one uppercase, lowercase, number and special character</div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Confirm New Password</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="confirmPassword" required>
                                            <button class="btn btn-outline-secondary password-toggle" type="button" data-target="confirmPassword">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="changePasswordBtn">Change Password</button>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                  .pos-button {

    border: 2px solid #ff00ff;
    color: #ff00ff !important;
    background: transparent;
    border-radius: 110px;

    font-weight: 600;
    display: flex;
    align-items: center;


            }
            
        .pos-button:hover {
               background: #ff00ff;
    color: white !important;
            }
            
            .pos-button i {
                font-size: 20px;
            }
            
            @media (max-width: 991px) {
                .pos-button {
                    justify-content: center;
                    margin: 10px 0;
                }
            }
                </style>
            `;

            $('#header-container').html(html);
        },

        // Update header information
        updateInfo: function () {
            const user = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.USER) || '{}');
            const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');

            $('#userName').text(user.name || 'User');
            $('#userRole').text(user.user_type || 'Role');
            $('#userTemple').text(temple.name || 'Temple');

            if (temple.name) {
                $('#templeNameNav').text(temple.name);
            }

            if (temple.logo) {
                $('#templeLogoNav').attr('src', temple.logo).show();
            }
        },

        // Load notifications
        loadNotifications: function () {
            TempleAPI.get('/notifications/unread')
                .done(function (response) {
                    if (response.success && response.data.length > 0) {
                        HeaderComponent.renderNotifications(response.data);
                    }
                })
                .fail(function () {
                    // Silent fail for notifications
                });
        },

        // Render notifications
        renderNotifications: function (notifications) {
            const $count = $('#notificationCount');
            const $list = $('#notificationList');

            if (notifications.length > 0) {
                $count.text(notifications.length).show();

                let html = '';
                $.each(notifications, function (index, notification) {
                    html += `
                        <li>
                            <a class="dropdown-item notification-item" href="#" data-id="${notification.id}">
                                <div class="d-flex">
                                    <div class="flex-shrink-0">
                                        <i class="bi bi-${notification.icon || 'bell'} text-primary"></i>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <h6 class="mb-1">${notification.title}</h6>
                                        <p class="mb-0 small text-muted">${notification.message}</p>
                                        <small class="text-muted">${notification.time}</small>
                                    </div>
                                </div>
                            </a>
                        </li>
                    `;
                });

                html += `
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-center" href="#" id="viewAllNotifications">
                            View All Notifications
                        </a>
                    </li>
                `;

                $list.html(html);
            }
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Profile link
            $('#profileLink').on('click', function (e) {
                e.preventDefault();
                TempleRouter.navigate('profile');
            });

            // Settings link
            $('#settingsLink').on('click', function (e) {
                e.preventDefault();
                TempleRouter.navigate('settings');
            });
            // POS button click

            $('#posButton').on('click', function (e) {
                e.preventDefault();
                TempleRouter.navigate('archanai/booking');
            });
            // Change password link
            $('#changePasswordLink').on('click', function (e) {
                e.preventDefault();
                self.showChangePasswordModal();
            });

            // Logout link
            $('#logoutLink').on('click', function (e) {
                e.preventDefault();
                self.logout();
            });

            // Password toggle buttons
            $('.password-toggle').on('click', function () {
                const target = $(this).data('target');
                self.togglePassword(target);
            });

            // Change password button
            $('#changePasswordBtn').on('click', function () {
                self.changePassword();
            });

            // Navbar brand click
            $('#navbarBrand').on('click', function (e) {
                e.preventDefault();
                TempleRouter.navigate('dashboard');
            });

            // Mobile sidebar toggle
            $('#sidebarToggle').on('click', function () {
                self.toggleMobileSidebar();
            });

            // View all notifications
            $(document).on('click', '#viewAllNotifications', function (e) {
                e.preventDefault();
                TempleRouter.navigate('notifications');
            });

            // Mark notification as read
            $(document).on('click', '.notification-item', function (e) {
                e.preventDefault();
                const notificationId = $(this).data('id');
                self.markNotificationAsRead(notificationId);
            });

            // Refresh notifications every 5 minutes
            setInterval(function () {
                self.loadNotifications();
            }, 300000);
        },

        // Show change password modal
        showChangePasswordModal: function () {
            $('#changePasswordForm')[0].reset();
            const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
            modal.show();
        },

        // Toggle password visibility
        togglePassword: function (fieldId) {
            const $field = $('#' + fieldId);
            const $button = $(`button[data-target="${fieldId}"]`);
            const $icon = $button.find('i');

            if ($field.attr('type') === 'password') {
                $field.attr('type', 'text');
                $icon.removeClass('bi-eye').addClass('bi-eye-slash');
            } else {
                $field.attr('type', 'password');
                $icon.removeClass('bi-eye-slash').addClass('bi-eye');
            }
        },

        // Change password
        // Change password
        changePassword: function () {
            const currentPassword = $('#currentPassword').val();
            const newPassword = $('#newPassword').val();
            const confirmPassword = $('#confirmPassword').val();

            // Validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                TempleCore.showToast('Please fill all fields', 'warning');
                return;
            }

            if (newPassword !== confirmPassword) {
                TempleCore.showToast('New passwords do not match', 'warning');
                return;
            }

            // Validate password strength
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                TempleCore.showToast('Password does not meet requirements', 'warning');
                return;
            }

            // Submit change password request
            TempleCore.showLoading(true);

            TempleAPI.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            })
                .done(function (response) {
                    if (response.success) {
                        // Close modal
                        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                        $('#changePasswordForm')[0].reset();

                        // Show success message
                        TempleCore.showToast('Password changed successfully. Please login with your new password.', 'success');

                        // ✅ Get temple code BEFORE clearing storage
                        const temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                        const templeCode = temple.code || 'temple1'; // Default fallback

                        // Wait 2 seconds then logout and redirect to login
                        setTimeout(function () {
                            // Clear storage
                            localStorage.removeItem(APP_CONFIG.STORAGE.TOKEN);
                            localStorage.removeItem(APP_CONFIG.STORAGE.REFRESH_TOKEN);
                            localStorage.removeItem(APP_CONFIG.STORAGE.USER);
                            localStorage.removeItem(APP_CONFIG.STORAGE.TEMPLE);
                            TempleAPI.logout();

                        }, 300);
                    } else {
                        // Handle validation errors properly
                        let errorMessage = response.message || 'Failed to change password';

                        if (response.errors) {
                            const errors = [];
                            $.each(response.errors, function (field, messages) {
                                if (Array.isArray(messages)) {
                                    errors.push(...messages);
                                } else {
                                    errors.push(messages);
                                }
                            });
                            if (errors.length > 0) {
                                errorMessage = errors.join('<br>');
                            }
                        }

                        TempleCore.showToast(errorMessage, 'error');
                        TempleCore.showLoading(false);
                    }
                })
                .fail(function (xhr) {
                    let errorMessage = 'An error occurred while changing password';

                    if (xhr.responseJSON) {
                        if (xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }

                        if (xhr.responseJSON.errors) {
                            const errors = [];
                            $.each(xhr.responseJSON.errors, function (field, messages) {
                                if (Array.isArray(messages)) {
                                    errors.push(...messages);
                                } else {
                                    errors.push(messages);
                                }
                            });
                            if (errors.length > 0) {
                                errorMessage = errors.join('<br>');
                            }
                        }
                    }

                    TempleCore.showToast(errorMessage, 'error');
                    TempleCore.showLoading(false);
                });
        },


        // Toggle mobile sidebar
        toggleMobileSidebar: function () {
            $('.sidebar').toggleClass('show');
            $('#sidebarOverlay').toggleClass('show');
        },

        // Mark notification as read
        markNotificationAsRead: function (notificationId) {
            TempleAPI.post('/notifications/mark-read', {
                notification_id: notificationId
            })
                .done(function () {
                    // Reload notifications
                    HeaderComponent.loadNotifications();
                });
        },

        // Logout
        logout: function () {
            TempleCore.showConfirm(
                'Logout',
                'Are you sure you want to logout?',
                function () {
                    TempleAPI.logout();
                }
            );
        }
    };

})(jQuery, window);