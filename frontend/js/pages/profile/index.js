// js/pages/profile/index.js
// User Profile Page - Styled to match Donation UI exactly

(function($, window) {
    'use strict';
    
    window.ProfilePage = {
        pageId: 'profile-page',
        eventNamespace: 'profile',
        userData: null,
        isEditing: false,
        originalData: null,
        
        // Initialize the page
        init: function() {
            console.log('ProfilePage.init() called');
            
            // Inject CSS first
            this.injectCSS();
            
            // Show immediate feedback
            $('#page-container').html('<div style="padding: 20px; color: #333;">Loading profile page...</div>');
            
            // Load user data
            this.loadUserData();
        },
        
        // Cleanup when leaving the page
        cleanup: function() {
            console.log('ProfilePage.cleanup() called');
            $(document).off('.' + this.eventNamespace);
            $(window).off('.' + this.eventNamespace);
            this.userData = null;
            this.isEditing = false;
            this.originalData = null;
            $('#profile-page-css').remove();
        },
        
        // Inject CSS - Matching Donation UI Style Exactly
        injectCSS: function() {
            if (document.getElementById('profile-page-css')) return;
            
            const css = `
                /* ========================================
                   Profile Page - Exact Donation UI Style
                   ======================================== */
                
                .profile-page {
                    padding: 1.5rem;
                    animation: profileFadeIn 0.5s ease-in-out;
                }
                
                @keyframes profileFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* Main Header - Orange Gradient (NO bottom radius - flows into card) */
                .profile-header {
                    position: relative;
                    background: linear-gradient(135deg, #800000 0%, #FFCB05 100%);
                    padding: 40px 30px;
                    border-radius: 12px 12px 0 0;
                    overflow: hidden;
                }
                
                .profile-header-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        45deg,
                        rgba(255, 255, 255, 0.1) 25%,
                        transparent 25%,
                        transparent 50%,
                        rgba(255, 255, 255, 0.1) 50%,
                        rgba(255, 255, 255, 0.1) 75%,
                        transparent 75%,
                        transparent
                    );
                    background-size: 50px 50px;
                    opacity: 0.3;
                }
                
                .profile-header .container-fluid {
                    position: relative;
                    z-index: 1;
                }
                
                .profile-title-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    color: white;
                }
                
                .profile-header-icon {
                    font-size: 48px;
                    color: #fff;
                    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
                }
                
                .profile-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    margin: 0;
                    color: white;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .profile-subtitle {
                    font-size: 1rem;
                    margin: 5px 0 0 0;
                    color: rgba(255, 255, 255, 0.9);
                    font-weight: 400;
                }
                
                /* Header Button - Matching Donation Cancel button exactly */
                .btn-profile-action {
                    background: transparent;
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    padding: 8px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                }
                
                .btn-profile-action:hover {
                    color: white;
                    background: rgba(255, 255, 255, 0.15);
                    border-color: white;
                }
                
                .btn-profile-save {
                    background: #28a745;
                    border-color: #28a745;
                }
                
                .btn-profile-save:hover {
                    background: #218838;
                    border-color: #218838;
                }
                
                /* Form Card - Flows directly from header */
                .profile-form-card {
                    border: none;
                    border-radius: 0 0 12px 12px;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
                    margin-top: 0;
                }
                
                .profile-form-card .card-body {
                    padding: 2rem;
                }
                
                /* Section Headers - Maroon Gradient (matching Donation exactly) */
                .section-header-gradient {
                    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                    margin-top: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .section-header-gradient:first-child {
                    margin-top: 0;
                }
                
                .section-header-gradient i {
                    font-size: 1.25rem;
                    color: white;
                }
                
                .section-header-gradient span {
                    font-size: 1rem;
                    font-weight: 600;
                    color: white;
                }
                
                /* Avatar Section - Clean white background inside card */
                .profile-avatar-section {
                    text-align: center;
                    padding: 30px 20px;
                    margin-bottom: 1.5rem;
                }
                
                .profile-avatar-placeholder {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 45px;
                    color: #F7941D;
                    background: #FFF5E6;
                    border: 3px solid #F7941D;
                    margin-bottom: 15px;
                }
                
                .profile-avatar {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid #F7941D;
                    margin-bottom: 15px;
                }
                
                .profile-name {
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 3px;
                }
                
                .profile-role {
                    font-size: 0.95rem;
                    color: #666;
                    margin-bottom: 12px;
                }
                
                .profile-badge {
                    display: inline-block;
                    padding: 5px 14px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .badge-verified {
                    background: #28a745;
                    color: #fff;
                }
                
                .badge-unverified {
                    background: #F7941D;
                    color: #fff;
                }
                
                /* Stats Row - Simple bordered cards */
                .profile-stats-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .profile-stat-card {
                    flex: 1;
                    background: #fff;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 20px 15px;
                    text-align: center;
                }
                
                .profile-stat-icon {
                    font-size: 1.5rem;
                    margin-bottom: 8px;
                    color: #F7941D;
                }
                
                .profile-stat-value {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #333;
                }
                
                .profile-stat-label {
                    font-size: 0.8rem;
                    color: #666;
                    margin-top: 4px;
                }
                
                /* Status Colors */
                .status-active { 
                    color: #28a745; 
                    font-weight: 600;
                }
                .status-inactive { 
                    color: #dc3545; 
                    font-weight: 600;
                }
                
                /* Form Labels - Matching Donation form */
                .form-label {
                    font-weight: 500;
                    color: #495057;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }
                
                /* Info Display (View Mode) */
                .profile-info-value {
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 10px 14px;
                    color: #333;
                    font-size: 0.9rem;
                    min-height: 42px;
                }
                
                .profile-info-value.empty {
                    color: #999;
                }
                
                /* Form Inputs - Edit Mode (matching Donation form inputs) */
                .profile-info-input {
                    display: none;
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 10px 14px;
                    color: #333;
                    width: 100%;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                }
                
                .profile-info-input:focus {
                    outline: none;
                    border-color: #F7941D;
                    box-shadow: 0 0 0 3px rgba(247, 148, 29, 0.15);
                }
                
                .edit-mode .profile-info-value { 
                    display: none; 
                }
                
                .edit-mode .profile-info-input { 
                    display: block; 
                }
                
                /* Wrapper for the whole card section */
                .profile-card-wrapper {
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .profile-page {
                        padding: 1rem;
                    }
                    
                    .profile-header {
                        padding: 25px 20px;
                    }
                    
                    .profile-title-wrapper {
                        flex-direction: column;
                        gap: 10px;
                        text-align: center;
                    }
                    
                    .profile-header-icon {
                        font-size: 36px;
                    }
                    
                    .profile-title {
                        font-size: 1.6rem;
                    }
                    
                    .profile-subtitle {
                        font-size: 0.85rem;
                    }
                    
                    .section-header-gradient {
                        padding: 0.75rem 1rem;
                    }
                    
                    .section-header-gradient i {
                        font-size: 1.1rem;
                    }
                    
                    .section-header-gradient span {
                        font-size: 0.9rem;
                    }
                    
                    .profile-stats-row {
                        flex-direction: column;
                    }
                    
                    .profile-form-card .card-body {
                        padding: 1.25rem;
                    }
                }
            `;
            
            const style = document.createElement('style');
            style.id = 'profile-page-css';
            style.textContent = css;
            document.head.appendChild(style);
            console.log('CSS injected');
        },
        
        // Load user data
        loadUserData: function() {
            const self = this;
            
            console.log('loadUserData() called');
            
            // Get cached data from localStorage
            let cachedUser = {};
            try {
                const stored = localStorage.getItem(APP_CONFIG.STORAGE.USER);
                console.log('Raw localStorage USER:', stored);
                if (stored) {
                    cachedUser = JSON.parse(stored);
                }
            } catch (e) {
                console.error('Failed to parse localStorage user:', e);
            }
            
            console.log('Cached user:', cachedUser);
            this.userData = cachedUser;
            
            // Try API call
            console.log('Calling API /auth/user...');
            
            TempleAPI.get('/auth/user')
                .done(function(response) {
                    console.log('API /auth/user response:', response);
                    
                    // Handle nested response structure: response.data.user
                    if (response && response.success && response.data) {
                        // Check if user is nested inside data
                        if (response.data.user) {
                            self.userData = response.data.user;
                        } else if (response.data.id) {
                            // data itself is the user object
                            self.userData = response.data;
                        } else {
                            self.userData = response.data;
                        }
                    } else if (response && response.data && response.data.user) {
                        self.userData = response.data.user;
                    } else if (response && response.user) {
                        self.userData = response.user;
                    } else if (response && response.id) {
                        self.userData = response;
                    }
                    
                    console.log('Final userData:', self.userData);
                    self.render();
                    self.bindEvents();
                })
                .fail(function(xhr, status, error) {
                    console.error('API call failed:', status, error);
                    console.log('Using cached data instead');
                    self.render();
                    self.bindEvents();
                });
        },
        
        // Main render function - Single Column Layout matching Donation UI exactly
        render: function() {
            const data = this.userData || {};
            console.log('render() called with data:', data);
            
            // Get temple info
            let temple = {};
            try {
                temple = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
            } catch (e) {
                console.error('Failed to parse temple:', e);
            }
            
            // Build HTML - Matching Donation UI structure exactly
            const html = `
                <div class="profile-page" id="profilePageContent">
                    <!-- Card Wrapper - Contains header and form card -->
                    <div class="profile-card-wrapper">
                        <!-- Page Header - Orange Gradient (same as Donation - no bottom radius) -->
                        <div class="profile-header">
                            <div class="profile-header-bg"></div>
                            <div class="container-fluid">
                                <div class="row align-items-center">
                                    <div class="col-md-8">
                                        <div class="profile-title-wrapper">
                                            <i class="bi bi-person-circle profile-header-icon"></i>
                                            <div>
                                                <h1 class="profile-title">My Profile</h1>
                                                <p class="profile-subtitle">个人资料 • View and manage your account information</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4 text-md-end mt-3 mt-md-0">
                                        <div class="d-flex gap-2 justify-content-md-end justify-content-center">
                                            <button class="btn btn-profile-action" id="btnEditProfile">
                                                <i class="bi bi-pencil-square"></i> Edit Profile
                                            </button>
                                            <button class="btn btn-profile-action btn-profile-save d-none" id="btnSaveProfile">
                                                <i class="bi bi-check-lg"></i> Save
                                            </button>
                                            <button class="btn btn-profile-action d-none" id="btnCancelEdit">
                                                <i class="bi bi-x-lg"></i> Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Profile Form Card - Flows directly from header -->
                        <div class="card profile-form-card">
                            <div class="card-body">
                                <!-- Avatar Section -->
                                <div class="profile-avatar-section">
                                    ${data.profile_photo 
                                        ? `<img src="${data.profile_photo}" alt="Profile" class="profile-avatar">`
                                        : `<div class="profile-avatar-placeholder"><i class="bi bi-person"></i></div>`
                                    }
                                    <h3 class="profile-name">${this.esc(data.name) || 'User'}</h3>
                                    <p class="profile-role">${this.formatUserType(data.user_type) || '-'}</p>
                                    ${data.is_verified 
                                        ? '<span class="profile-badge badge-verified"><i class="bi bi-check-circle me-1"></i>Verified</span>'
                                        : '<span class="profile-badge badge-unverified"><i class="bi bi-exclamation-circle me-1"></i>Unverified</span>'
                                    }
                                </div>
                                
                                <!-- Account Statistics -->
                                <div class="profile-stats-row">
                                    <div class="profile-stat-card">
                                        <i class="bi bi-box-arrow-in-right profile-stat-icon"></i>
                                        <div class="profile-stat-value">${data.login_count || 0}</div>
                                        <div class="profile-stat-label">Total Logins 登录次数</div>
                                    </div>
                                    <div class="profile-stat-card">
                                        <i class="bi bi-calendar-check profile-stat-icon"></i>
                                        <div class="profile-stat-value">${this.daysSince(data.created_at)}</div>
                                        <div class="profile-stat-label">Days Active 活跃天数</div>
                                    </div>
                                    <div class="profile-stat-card">
                                        <i class="bi bi-shield-check profile-stat-icon"></i>
                                        <div class="profile-stat-value">
                                            ${data.is_active !== false 
                                                ? '<span class="status-active">Active</span>'
                                                : '<span class="status-inactive">Inactive</span>'
                                            }
                                        </div>
                                        <div class="profile-stat-label">Account Status 账户状态</div>
                                    </div>
                                </div>
                                
                                <!-- Personal Information Section -->
                                <div class="section-header-gradient">
                                    <i class="bi bi-person-badge"></i>
                                    <span>Personal Information 个人资料</span>
                                </div>
                                
                                <div class="row g-3 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Full Name 姓名</label>
                                        <div class="profile-info-value ${!data.name ? 'empty' : ''}">${this.esc(data.name) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="name" value="${this.esc(data.name) || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Username 用户名</label>
                                        <div class="profile-info-value ${!data.username ? 'empty' : ''}">${this.esc(data.username) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="username" value="${this.esc(data.username) || ''}" readonly style="background: #f5f5f5; cursor: not-allowed;">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Email 电邮</label>
                                        <div class="profile-info-value ${!data.email ? 'empty' : ''}">${this.esc(data.email) || '-'}</div>
                                        <input type="email" class="form-control profile-info-input" name="email" value="${this.esc(data.email) || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Date of Birth 出生日期</label>
                                        <div class="profile-info-value ${!data.date_of_birth ? 'empty' : ''}">${this.formatD(data.date_of_birth)}</div>
                                        <input type="date" class="form-control profile-info-input" name="date_of_birth" value="${data.date_of_birth || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Gender 性别</label>
                                        <div class="profile-info-value ${!data.gender ? 'empty' : ''}">${this.formatGender(data.gender)}</div>
                                        <select class="form-control profile-info-input" name="gender">
                                            <option value="">Select Gender</option>
                                            <option value="MALE" ${data.gender === 'MALE' ? 'selected' : ''}>Male 男</option>
                                            <option value="FEMALE" ${data.gender === 'FEMALE' ? 'selected' : ''}>Female 女</option>
                                            <option value="OTHER" ${data.gender === 'OTHER' ? 'selected' : ''}>Other 其他</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">User Type 用户类型</label>
                                        <div class="profile-info-value">${this.formatUserType(data.user_type)}</div>
                                    </div>
                                </div>
                                
                                <!-- Contact Information Section -->
                                <div class="section-header-gradient">
                                    <i class="bi bi-telephone"></i>
                                    <span>Contact Information 联系方式</span>
                                </div>
                                
                                <div class="row g-3 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Mobile Number 手机号码</label>
                                        <div class="profile-info-value ${!data.mobile_no ? 'empty' : ''}">${(data.mobile_code || '')} ${this.esc(data.mobile_no) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="mobile_no" value="${this.esc(data.mobile_no) || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Alternate Mobile 备用号码</label>
                                        <div class="profile-info-value ${!data.alternate_mobile ? 'empty' : ''}">${this.esc(data.alternate_mobile) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="alternate_mobile" value="${this.esc(data.alternate_mobile) || ''}">
                                    </div>
                                </div>
                                
                                <!-- Address Information Section -->
                                <div class="section-header-gradient">
                                    <i class="bi bi-geo-alt"></i>
                                    <span>Address Information 地址信息</span>
                                </div>
                                
                                <div class="row g-3 mb-3">
                                    <div class="col-12">
                                        <label class="form-label">Address 地址</label>
                                        <div class="profile-info-value ${!data.address ? 'empty' : ''}">${this.esc(data.address) || '-'}</div>
                                        <textarea class="form-control profile-info-input" name="address" rows="2">${this.esc(data.address) || ''}</textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">City 城市</label>
                                        <div class="profile-info-value ${!data.city ? 'empty' : ''}">${this.esc(data.city) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="city" value="${this.esc(data.city) || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">State 州属</label>
                                        <div class="profile-info-value ${!data.state ? 'empty' : ''}">${this.esc(data.state) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="state" value="${this.esc(data.state) || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Country 国家</label>
                                        <div class="profile-info-value ${!data.country ? 'empty' : ''}">${this.esc(data.country) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="country" value="${this.esc(data.country) || ''}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Postal Code 邮编</label>
                                        <div class="profile-info-value ${!data.pincode ? 'empty' : ''}">${this.esc(data.pincode) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="pincode" value="${this.esc(data.pincode) || ''}">
                                    </div>
                                </div>
                                
                                <!-- Identification Section -->
                                <div class="section-header-gradient">
                                    <i class="bi bi-card-text"></i>
                                    <span>Identification 身份证明</span>
                                </div>
                                
                                <div class="row g-3 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">ID Type 证件类型</label>
                                        <div class="profile-info-value ${!data.id_proof_type ? 'empty' : ''}">${this.formatIdType(data.id_proof_type)}</div>
                                        <select class="form-control profile-info-input" name="id_proof_type">
                                            <option value="">Select ID Type</option>
                                            <option value="IC" ${data.id_proof_type === 'IC' ? 'selected' : ''}>IC (MyKad) 身份证</option>
                                            <option value="PASSPORT" ${data.id_proof_type === 'PASSPORT' ? 'selected' : ''}>Passport 护照</option>
                                            <option value="DRIVING_LICENSE" ${data.id_proof_type === 'DRIVING_LICENSE' ? 'selected' : ''}>Driving License 驾照</option>
                                            <option value="OTHER" ${data.id_proof_type === 'OTHER' ? 'selected' : ''}>Other 其他</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">ID Number 证件号码</label>
                                        <div class="profile-info-value ${!data.id_proof_number ? 'empty' : ''}">${this.esc(data.id_proof_number) || '-'}</div>
                                        <input type="text" class="form-control profile-info-input" name="id_proof_number" value="${this.esc(data.id_proof_number) || ''}">
                                    </div>
                                </div>
                                
                                <!-- Account Details Section -->
                                <div class="section-header-gradient">
                                    <i class="bi bi-clock-history"></i>
                                    <span>Account Details 账户详情</span>
                                </div>
                                
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Last Login 最后登录</label>
                                        <div class="profile-info-value">${this.formatDT(data.last_login_at)}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Member Since 注册日期</label>
                                        <div class="profile-info-value">${this.formatD(data.created_at)}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Temple 寺庙</label>
                                        <div class="profile-info-value">${this.esc(temple.name) || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('Inserting HTML into #page-container');
            $('#page-container').html(html);
            console.log('HTML inserted, page-container contents length:', $('#page-container').html().length);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            $(document).off('.' + this.eventNamespace);
            
            $(document).on('click.' + this.eventNamespace, '#btnEditProfile', function() {
                self.enterEditMode();
            });
            
            $(document).on('click.' + this.eventNamespace, '#btnSaveProfile', function() {
                self.saveProfile();
            });
            
            $(document).on('click.' + this.eventNamespace, '#btnCancelEdit', function() {
                self.exitEditMode();
            });
            
            console.log('Events bound');
        },
        
        // Enter edit mode
        enterEditMode: function() {
            this.isEditing = true;
            this.originalData = JSON.parse(JSON.stringify(this.userData || {}));
            
            $('#btnEditProfile').addClass('d-none');
            $('#btnSaveProfile, #btnCancelEdit').removeClass('d-none');
            $('#profilePageContent').addClass('edit-mode');
            
            if (typeof TempleCore !== 'undefined' && TempleCore.showToast) {
                TempleCore.showToast('You can now edit your profile', 'info');
            }
        },
        
        // Exit edit mode
        exitEditMode: function() {
            this.isEditing = false;
            
            $('#btnEditProfile').removeClass('d-none');
            $('#btnSaveProfile, #btnCancelEdit').addClass('d-none');
            $('#profilePageContent').removeClass('edit-mode');
            
            if (this.originalData) {
                this.userData = this.originalData;
            }
        },
        
        // Save profile
        saveProfile: function() {
            const self = this;
            
            const formData = {
                name: $('input[name="name"]').val(),
                email: $('input[name="email"]').val(),
                date_of_birth: $('input[name="date_of_birth"]').val() || null,
                gender: $('select[name="gender"]').val() || null,
                mobile_no: $('input[name="mobile_no"]').val(),
                alternate_mobile: $('input[name="alternate_mobile"]').val(),
                address: $('textarea[name="address"]').val(),
                city: $('input[name="city"]').val(),
                state: $('input[name="state"]').val(),
                country: $('input[name="country"]').val(),
                pincode: $('input[name="pincode"]').val(),
                id_proof_type: $('select[name="id_proof_type"]').val() || null,
                id_proof_number: $('input[name="id_proof_number"]').val()
            };
            
            if (!formData.name || !formData.email) {
                TempleCore.showToast('Name and email are required', 'warning');
                return;
            }
            
            TempleCore.showLoading(true);
            
            TempleAPI.put('/auth/profile', formData)
                .done(function(response) {
                    console.log('Save profile response:', response);
                    
                    if (response.success) {
                        // Use response data if available, otherwise merge form data
                        if (response.data && response.data.user) {
                            self.userData = response.data.user;
                        } else if (response.data && response.data.id) {
                            self.userData = response.data;
                        } else if (response.user) {
                            self.userData = response.user;
                        } else {
                            // Fallback: merge form data with existing data
                            self.userData = { ...self.userData, ...formData };
                        }
                        
                        // Update localStorage
                        localStorage.setItem(APP_CONFIG.STORAGE.USER, JSON.stringify(self.userData));
                        
                        // Update header if available
                        if (window.HeaderComponent && HeaderComponent.updateInfo) {
                            HeaderComponent.updateInfo();
                        }
                        
                        self.exitEditMode();
                        self.render();
                        self.bindEvents();
                        
                        TempleCore.showToast('Profile updated successfully', 'success');
                        
                        // Reload fresh data from API to ensure sync
                        setTimeout(function() {
                            self.reloadUserData();
                        }, 500);
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update profile', 'error');
                    }
                })
                .fail(function(xhr) {
                    console.error('Save profile failed:', xhr);
                    TempleCore.showToast(xhr.responseJSON?.message || 'Failed to update profile', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Reload user data from API (silent refresh)
        reloadUserData: function() {
            const self = this;
            
            TempleAPI.get('/auth/user')
                .done(function(response) {
                    console.log('Reload user data response:', response);
                    
                    if (response && response.success && response.data) {
                        if (response.data.user) {
                            self.userData = response.data.user;
                        } else if (response.data.id) {
                            self.userData = response.data;
                        } else {
                            self.userData = response.data;
                        }
                        
                        // Update localStorage
                        localStorage.setItem(APP_CONFIG.STORAGE.USER, JSON.stringify(self.userData));
                        
                        // Re-render with fresh data
                        self.render();
                        self.bindEvents();
                    }
                })
                .fail(function(xhr, status, error) {
                    console.error('Reload user data failed:', status, error);
                });
        },
        
        // Helper: Escape HTML
        esc: function(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/[&<>"']/g, function(m) {
                return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
            });
        },
        
        // Helper: Format date
        formatD: function(d) {
            if (!d) return '-';
            try {
                return new Date(d).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
            } catch (e) { return '-'; }
        },
        
        // Helper: Format datetime
        formatDT: function(d) {
            if (!d) return '-';
            try {
                return new Date(d).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            } catch (e) { return '-'; }
        },
        
        // Helper: Format user type
        formatUserType: function(t) {
            return { 'SUPER_ADMIN': 'Super Admin', 'ADMIN': 'Administrator', 'MANAGER': 'Manager', 'STAFF': 'Staff', 'MEMBER': 'Member', 'DEVOTEE': 'Devotee', 'AGENT': 'Agent' }[t] || t || '-';
        },
        
        // Helper: Format gender
        formatGender: function(g) {
            return { 'MALE': 'Male', 'FEMALE': 'Female', 'OTHER': 'Other' }[g] || g || '-';
        },
        
        // Helper: Format ID type
        formatIdType: function(t) {
            return { 'IC': 'IC (MyKad)', 'PASSPORT': 'Passport', 'DRIVING_LICENSE': 'Driving License', 'OTHER': 'Other' }[t] || t || '-';
        },
        
        // Helper: Days since
        daysSince: function(d) {
            if (!d) return 0;
            try {
                return Math.ceil(Math.abs(new Date() - new Date(d)) / 86400000);
            } catch (e) { return 0; }
        }
    };
    
})(jQuery, window);