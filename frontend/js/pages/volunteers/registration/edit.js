// js/pages/volunteers/registration/edit.js
// Volunteer Registration Edit Page - Same structure as create.js
// Loads existing data and allows editing for pending_approval volunteers

(function ($, window) {
    'use strict';

    // ========================================
    // VOLUNTEERS SHARED MODULE
    // ========================================
    if (!window.VolunteersSharedModule) {
        window.VolunteersSharedModule = {
            moduleId: 'volunteers',
            eventNamespace: 'volunteers',
            cssId: 'volunteers-css',
            cssPath: '/css/volunteers.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('✅ Volunteers CSS loaded');
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`✅ Volunteers page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`🧹 Volunteers page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            hasActivePages: function () {
                return this.activePages.size > 0;
            },

            getActivePages: function () {
                return Array.from(this.activePages);
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('🧹 Volunteers CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('✅ Volunteers module cleaned up');
            }
        };
    }

    // ========================================
    // VOLUNTEER REGISTRATION EDIT PAGE
    // ========================================
    window.VolunteersRegistrationEditPage = {
        pageId: 'volunteers-registration-edit',
        eventNamespace: 'volunteers',
        currentStep: 1,
        totalSteps: 4,
        volunteerId: null,
        volunteerData: {},
        existingDocuments: {},
        uploadedDocuments: {},
        documentsToUpload: {},
        departments: [],
        tasks: [],

        init: function (params) {
            console.log('🚀 Initializing Volunteer Registration Edit Page');

            // Extract volunteer ID from params
            if (params && params.id) {
                this.volunteerId = params.id;
                console.log('📝 Editing volunteer:', this.volunteerId);
            } else {
                TempleCore.showToast('No volunteer ID provided', 'error');
                TempleRouter.navigate('volunteers/registration/list');
                return;
            }

            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);

            // Initialize duplicate tracking
            this.hasDuplicates = false;

            this.render();
            this.initAnimations();
            this.setupEventListeners();
            this.loadDepartments();
            
            // Load existing volunteer data first
            this.loadVolunteerData();

            console.log('✅ Registration Edit Page Initialized');
        },

        cleanup: function () {
            console.log(`🧹 Cleaning up ${this.pageId}...`);

            // Unregister from shared module
            window.VolunteersSharedModule.unregisterPage(this.pageId);

            // Remove event handlers
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            // Kill GSAP animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }

            // Reset data
            this.currentStep = 1;
            this.volunteerId = null;
            this.volunteerData = {};
            this.existingDocuments = {};
            this.uploadedDocuments = {};
            this.documentsToUpload = {};
            this.departments = [];
            this.tasks = [];

            console.log(`✅ ${this.pageId} cleanup completed`);
        },

        initAnimations: function () {
            console.log('🎨 Initializing animations');

            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }

            if (typeof gsap !== 'undefined') {
                gsap.to('.volunteers-header-icon', {
                    y: -10,
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut'
                });
            }

            console.log('✅ Animations initialized');
        },

        render: function () {
            console.log('📝 Rendering Registration Edit Page HTML');

            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header with Animation -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-pencil-square volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">Edit Volunteer Registration</h1>
                                            <p class="volunteers-subtitle">义工编辑 • Update Volunteer Information</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-light btn-lg" id="cancelBtn">
                                        <i class="bi bi-x-circle me-2"></i>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="card shadow-sm volunteers-content-card text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted">Loading volunteer data...</p>
                    </div>

                    <!-- Wizard Container (hidden initially) -->
                    <div class="card shadow-sm volunteers-content-card" id="wizardContainer" style="display: none;" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-4">
                            <!-- Progress Steps -->
                            <div class="wizard-progress mb-4" data-aos="fade-up" data-aos-delay="300">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div class="step-indicator active" data-step="1">
                                        <div class="step-number">1</div>
                                        <div class="step-label">Personal Info</div>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="2">
                                        <div class="step-number">2</div>
                                        <div class="step-label">Contact</div>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="3">
                                        <div class="step-number">3</div>
                                        <div class="step-label">Preferences</div>
                                    </div>
                                    <div class="step-line"></div>
                                    <div class="step-indicator" data-step="4">
                                        <div class="step-number">4</div>
                                        <div class="step-label">Documents</div>
                                    </div>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-primary" id="wizardProgressBar" style="width: 0%"></div>
                                </div>
                            </div>

                            <!-- Current Step Title -->
                            <h4 class="mb-4 text-center" id="currentStepTitle" data-aos="fade-up" data-aos-delay="400">
                                Step 1: Personal Information
                            </h4>

                            <!-- Step 1: Personal Information -->
                            <div class="wizard-step active" id="step1">
                                <div class="row g-4">
                                    <div class="col-12">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-person-badge"></i>
                                            <span>Personal Information 个人信息</span>
                                        </div>
                                    </div>

                                  <div class="col-md-6">
            <label class="form-label">
                Full Name (Chinese) <span class="text-danger">*</span>
                <small class="text-muted d-block">全名（中文）</small>
            </label>
            <input type="text" class="form-control" id="fullName" 
                   placeholder="Enter full name in Chinese" required>
            <div class="invalid-feedback">Please enter full name in Chinese</div>
        </div>

        <!-- Full Name (English) - Optional -->
        <div class="col-md-6">
            <label class="form-label">
                Full Name (English)
                <small class="text-muted">(Optional) 全名（英文）</small>
            </label>
            <input type="text" class="form-control" id="fullNameEn" 
                   placeholder="Enter full name in English (optional)">
            <small class="text-muted d-block">Optional: English translation of name</small>
        </div>


                                    <div class="col-md-4">
                                        <label class="form-label">Gender <span class="text-danger">*</span></label>
                                        <select class="form-select" id="gender" required>
                                            <option value="">Select Gender</option>
                                            <option value="male">Male 男</option>
                                            <option value="female">Female 女</option>
                                            <option value="other">Other 其他</option>
                                        </select>
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">ID Type <span class="text-danger">*</span></label>
                                        <select class="form-select" id="idType" required>
                                            <option value="">Select ID Type</option>
                                            <option value="ic">IC (NRIC) 身份证</option>
                                            <option value="passport">Passport 护照</option>
                                        </select>
                                    </div>

                                    <div class="col-md-4" id="icNumberGroup" style="display: none;">
                                        <label class="form-label">IC Number <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="icNumber" placeholder="XXXXXX-XX-XXXX">
                                        <small class="text-muted">Date of birth will be auto-extracted</small>
                                    </div>

                                    <div class="col-md-4" id="passportNumberGroup" style="display: none;">
                                        <label class="form-label">Passport Number <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="passportNumber" placeholder="Enter passport number">
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">Date of Birth <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="dateOfBirth" required>
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">Marital Status</label>
                                        <select class="form-select" id="maritalStatus">
                                            <option value="">Select Status</option>
                                            <option value="single">Single 单身</option>
                                            <option value="married">Married 已婚</option>
                                            <option value="divorced">Divorced 离婚</option>
                                            <option value="widowed">Widowed 丧偶</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 2: Contact Information -->
                            <div class="wizard-step" id="step2">
                                <div class="row g-4">
                                    <div class="col-12">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-telephone"></i>
                                            <span>Contact Information 联系信息</span>
                                        </div>
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Mobile Number <span class="text-danger">*</span></label>
                                        <input type="tel" class="form-control" id="mobileNumber" placeholder="+60 12-345 6789" required>
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Email Address</label>
                                        <input type="email" class="form-control" id="email" placeholder="volunteer@example.com">
                                    </div>

                                    <div class="col-12">
                                        <label class="form-label">Address</label>
                                        <textarea class="form-control" id="address" rows="2" placeholder="Street address"></textarea>
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">City</label>
                                        <input type="text" class="form-control" id="city" placeholder="City">
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">State</label>
                                        <input type="text" class="form-control" id="state" placeholder="State">
                                    </div>

                                    <div class="col-md-4">
                                        <label class="form-label">Postal Code</label>
                                        <input type="text" class="form-control" id="postalCode" placeholder="Postal code">
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Country</label>
                                        <input type="text" class="form-control" id="country" value="Malaysia">
                                    </div>

                                    <div class="col-12 mt-4">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-exclamation-triangle"></i>
                                            <span>Emergency Contact 紧急联系人</span>
                                        </div>
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Emergency Contact Name</label>
                                        <input type="text" class="form-control" id="emergencyContactName" placeholder="Name">
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Relationship</label>
                                        <input type="text" class="form-control" id="emergencyContactRelationship" placeholder="e.g., Spouse, Parent">
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Emergency Contact Phone</label>
                                        <input type="tel" class="form-control" id="emergencyContactPhone" placeholder="+60 12-345 6789">
                                    </div>
                                </div>
                            </div>

                            <!-- Step 3: Background & Preferences -->
                            <div class="wizard-step" id="step3">
                                <div class="row g-4">
                                    <div class="col-12">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-star"></i>
                                            <span>Background & Preferences 背景与偏好</span>
                                        </div>
                                    </div>

                                    <div class="col-12">
                                        <label class="form-label">Languages Spoken 语言能力</label>
                                        <div class="row g-2">
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="languages[]" value="English" id="langEnglish">
                                                    <label class="form-check-label" for="langEnglish">English 英语</label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="languages[]" value="Chinese" id="langChinese">
                                                    <label class="form-check-label" for="langChinese">Chinese 中文</label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="languages[]" value="Malay" id="langMalay">
                                                    <label class="form-check-label" for="langMalay">Malay 马来语</label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="languages[]" value="Tamil" id="langTamil">
                                                    <label class="form-check-label" for="langTamil">Tamil 淡米尔语</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-12">
                                        <label class="form-label">Skills & Strengths 技能与优势</label>
                                        <textarea class="form-control" id="skillsStrengths" rows="3" placeholder="Describe your skills, talents, and strengths..."></textarea>
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Preferred Department 首选部门</label>
                                        <select class="form-select" id="preferredDepartment">
                                            <option value="">Loading departments...</option>
                                        </select>
                                    </div>

                                    <div class="col-md-6">
                                        <label class="form-label">Preferred Tasks 首选任务</label>
                                        <select class="form-select" id="preferredTasks" multiple size="3">
                                            <option value="">Select department first</option>
                                        </select>
                                        <small class="text-muted">Hold Ctrl/Cmd to select multiple</small>
                                    </div>

                                    <div class="col-12">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="pastExperience">
                                            <label class="form-check-label" for="pastExperience">
                                                I have past volunteer experience 我有志愿服务经验
                                            </label>
                                        </div>
                                    </div>

                                    <div class="col-12">
                                        <label class="form-label">Physical Limitations 身体限制</label>
                                        <textarea class="form-control" id="physicalLimitations" rows="2" placeholder="Any physical limitations we should be aware of..."></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 4: Document Upload -->
                            <div class="wizard-step" id="step4">
                                <div class="row g-4">
                                    <div class="col-12">
                                        <div class="section-header-gradient">
                                            <i class="bi bi-file-earmark-arrow-up"></i>
                                            <span>Document Upload 文件上传</span>
                                        </div>
                                    </div>

                                    <div class="col-12">
                                        <div class="alert alert-info">
                                            <i class="bi bi-info-circle me-2"></i>
                                            <strong>Documents:</strong> Upload new files to replace existing documents (JPG, PNG, or PDF, max 5MB each)
                                        </div>
                                    </div>

                                    <!-- IC Photostat -->
                                    <div class="col-md-6">
                                        <label class="form-label">
                                            IC Photostat 身份证复印件
                                        </label>
                                        <input type="file" class="form-control" id="icPhotostatFile" accept="image/*,application/pdf">
                                        <div id="icPhotostatPreview" class="mt-2"></div>
                                    </div>

                                    <!-- Passport Photo -->
                                    <div class="col-md-6">
                                        <label class="form-label">
                                            Passport Photo 护照照片
                                        </label>
                                        <input type="file" class="form-control" id="passportPhotoFile" accept="image/*">
                                        <div id="passportPhotoPreview" class="mt-2"></div>
                                    </div>

                                    <!-- Passport Photostat (conditional) -->
                                    <div class="col-md-6" id="passportPhotostatGroup" style="display: none;">
                                        <label class="form-label">
                                            Passport Photostat 护照复印件
                                        </label>
                                        <input type="file" class="form-control" id="passportPhotostatFile" accept="image/*,application/pdf">
                                        <div id="passportPhotostatPreview" class="mt-2"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Navigation Buttons -->
                            <div class="d-flex justify-content-between mt-4 pt-4 border-top">
                                <button class="btn btn-secondary" id="prevBtn" style="display: none;">
                                    <i class="bi bi-arrow-left me-2"></i>Previous
                                </button>
                                <div class="ms-auto">
                                    <button class="btn btn-primary" id="nextBtn">
                                        Next<i class="bi bi-arrow-right ms-2"></i>
                                    </button>
                                    <button class="btn btn-success" id="submitBtn" style="display: none;">
                                        <i class="bi bi-check-circle me-2"></i>Update Registration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
            console.log('✅ HTML rendered successfully');
        },

        loadVolunteerData: async function () {
            console.log('📡 Loading volunteer data for ID:', this.volunteerId);

            try {
                const response = await TempleAPI.get(`/volunteers/registration/${this.volunteerId}`);

                if (response.success) {
                    this.volunteerData = response.data;
                    this.existingDocuments = {};

                    // Store existing documents
                    if (response.data.documents && response.data.documents.length > 0) {
                        response.data.documents.forEach(doc => {
                            this.existingDocuments[doc.document_type] = doc;
                        });
                    }

                    console.log('✅ Volunteer data loaded');
                    console.log('Existing documents:', this.existingDocuments);

                    // Check if volunteer can be edited
                    if (response.data.status !== 'pending_approval') {
                        TempleCore.showToast('Only pending volunteers can be edited', 'error');
                        TempleRouter.navigate('volunteers/registration/list');
                        return;
                    }

                    // Hide loading, show wizard
                    $('#loadingState').hide();
                    $('#wizardContainer').show();

                    // Populate form with existing data
                    this.populateForm();
                    this.showStep(1);

                } else {
                    throw new Error(response.message || 'Failed to load volunteer');
                }
            } catch (error) {
                console.error('❌ Error loading volunteer:', error);
                TempleCore.showToast('Error loading volunteer data', 'error');
                TempleRouter.navigate('volunteers/registration/list');
            }
        },

        populateForm: function () {
            console.log('📝 Populating form with existing data');

            const data = this.volunteerData;

            // Step 1: Personal Information
            $('#fullName').val(data.full_name || '');
            $('#fullNameEn').val(data.full_name_en || '');
            $('#gender').val(data.gender || '');
            $('#idType').val(data.id_type || 'ic');
            $('#icNumber').val(data.ic_number || '');
            $('#passportNumber').val(data.passport_number || '');
            $('#dateOfBirth').val(data.date_of_birth || '');
            $('#maritalStatus').val(data.marital_status || '');

            // Show correct ID field
            this.handleIdTypeChange(data.id_type || 'ic');

            // Step 2: Contact Information
            $('#mobileNumber').val(data.mobile_primary || '');
            $('#email').val(data.email || '');
            $('#address').val(data.address || '');
            $('#city').val(data.city || '');
            $('#state').val(data.state || '');
            $('#postalCode').val(data.postal_code || '');
            $('#country').val(data.country || 'Malaysia');
            $('#emergencyContactName').val(data.emergency_contact_name || '');
            $('#emergencyContactRelationship').val(data.emergency_contact_relationship || '');
            $('#emergencyContactPhone').val(data.emergency_contact_phone || '');

            // Step 3: Background & Preferences
            // Languages spoken (checkboxes)
            if (data.languages_spoken && Array.isArray(data.languages_spoken)) {
                data.languages_spoken.forEach(lang => {
                    $(`input[name="languages[]"][value="${lang}"]`).prop('checked', true);
                });
            }

            $('#skillsStrengths').val(data.skills_strengths || '');
            $('#preferredDepartment').val(data.preferred_department_id || '');
            $('#pastExperience').prop('checked', data.past_volunteer_experience || false);
            $('#physicalLimitations').val(data.physical_limitations || '');

            // Load tasks for selected department
            if (data.preferred_department_id) {
                this.loadTasksForDepartment(data.preferred_department_id, data.preferred_tasks);
            }

            // Step 4: Show existing documents
            this.showExistingDocuments();

            console.log('✅ Form populated');
        },

        showExistingDocuments: function () {
            console.log('📄 Showing existing documents');

            const documentTypes = ['ic_photostat', 'passport_photo', 'passport_photostat'];

            documentTypes.forEach(docType => {
                const doc = this.existingDocuments[docType];
                const previewIdMap = {
                    'ic_photostat': '#icPhotostatPreview',
                    'passport_photo': '#passportPhotoPreview',
                    'passport_photostat': '#passportPhotostatPreview'
                };

                const previewContainer = $(previewIdMap[docType]);

                if (doc) {
                    const isImage = doc.mime_type && doc.mime_type.startsWith('image/');
                    const isPdf = doc.mime_type === 'application/pdf';

                    let displayHTML = `
                        <div class="border rounded p-3 mt-2 bg-light">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center flex-grow-1">
                    `;

                    if (isImage && doc.file_display_url) {
                        displayHTML += `
                                    <img src="${doc.file_display_url}" alt="${doc.file_name}"
                                         class="img-thumbnail me-3"
                                         style="max-height: 60px; max-width: 60px;">
                        `;
                    } else if (isPdf) {
                        displayHTML += `
                                    <i class="bi bi-file-pdf text-danger me-3" style="font-size: 36px;"></i>
                        `;
                    }

                    displayHTML += `
                                    <div>
                                        <h6 class="mb-1 small">${doc.file_name}</h6>
                                        <small class="text-muted">${this.formatFileSize(doc.file_size || 0)}</small>
                                        <div><span class="badge bg-success">Current file</span></div>
                                    </div>
                                </div>
                                <div>
                                    <button type="button" 
                                            class="btn btn-sm btn-outline-primary me-2 btn-view-doc"
                                            data-url="${doc.file_display_url}"
                                            title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;

                    previewContainer.html(displayHTML);

                    // Bind view button
                    $('.btn-view-doc').on('click', function () {
                        window.open($(this).data('url'), '_blank');
                    });
                }
            });
        },

        setupEventListeners: function () {
            const self = this;
            console.log('🔗 Binding events');

            // Navigation buttons
            $(document).on('click.' + this.eventNamespace, '#nextBtn', function (e) {
                e.preventDefault();
                self.nextStep();
            });

            $(document).on('click.' + this.eventNamespace, '#prevBtn', function (e) {
                e.preventDefault();
                self.prevStep();
            });

            $(document).on('click.' + this.eventNamespace, '#submitBtn', function (e) {
                e.preventDefault();
                self.submitUpdate();
            });

            $(document).on('click.' + this.eventNamespace, '#cancelBtn', function (e) {
                e.preventDefault();
                self.cancel();
            });

            // Step 1: Personal Information
            $(document).on('change.' + this.eventNamespace, '#idType', function (e) {
                self.handleIdTypeChange($(this).val());
            });

            $(document).on('blur.' + this.eventNamespace, '#icNumber', function (e) {
                self.extractDobFromIc($(this).val());
            });

            // Step 3: Preferred department change
            $(document).on('change.' + this.eventNamespace, '#preferredDepartment', function (e) {
                self.loadTasksForDepartment($(this).val());
            });

            // Document upload handlers - Store files for upload on submit
            $(document).on('change.' + this.eventNamespace, '#icPhotostatFile', function (e) {
                self.handleFileSelect(e, 'ic_photostat');
            });

            $(document).on('change.' + this.eventNamespace, '#passportPhotoFile', function (e) {
                self.handleFileSelect(e, 'passport_photo');
            });

            $(document).on('change.' + this.eventNamespace, '#passportPhotostatFile', function (e) {
                self.handleFileSelect(e, 'passport_photostat');
            });

            console.log('✅ Events bound successfully');
        },

        showStep: function (step) {
            this.currentStep = step;

            // Hide all steps
            $('.wizard-step').removeClass('active');

            // Show current step
            $(`#step${step}`).addClass('active');

            // Update progress bar
            const progress = ((step - 1) / (this.totalSteps - 1)) * 100;
            $('#wizardProgressBar').css('width', `${progress}%`);

            // Update step indicators
            $('.step-indicator').each((index, el) => {
                const stepNum = index + 1;
                if (stepNum < step) {
                    $(el).addClass('completed').removeClass('active');
                } else if (stepNum === step) {
                    $(el).addClass('active').removeClass('completed');
                } else {
                    $(el).removeClass('active completed');
                }
            });

            // Update navigation buttons
            $('#prevBtn').toggle(step > 1);
            $('#nextBtn').toggle(step < this.totalSteps);
            $('#submitBtn').toggle(step === this.totalSteps);

            // Update step title
            const stepTitles = [
                'Personal Information',
                'Contact Information',
                'Background & Preferences',
                'Document Upload'
            ];
            $('#currentStepTitle').text(`Step ${step}: ${stepTitles[step - 1]}`);

            // Show passport photostat field if passport type is selected
            if (step === 4) {
                const idType = $('#idType').val();
                $('#passportPhotostatGroup').toggle(idType === 'passport');
            }
        },

        nextStep: async function () {
            // Validate current step
            if (!await this.validateStep(this.currentStep)) {
                return;
            }

            // Save current step data
            this.saveStepData(this.currentStep);

            // Move to next step
            if (this.currentStep < this.totalSteps) {
                this.showStep(this.currentStep + 1);
            }
        },

        prevStep: function () {
            if (this.currentStep > 1) {
                this.showStep(this.currentStep - 1);
            }
        },

        validateStep: async function (step) {
            let isValid = true;
            const errors = [];

            switch (step) {
                case 1: // Personal Information
                    if (!$('#fullName').val()) {
                        errors.push('Full name is required');
                        isValid = false;
                    }
                    if (!$('#gender').val()) {
                        errors.push('Gender is required');
                        isValid = false;
                    }
                    if (!$('#idType').val()) {
                        errors.push('ID type is required');
                        isValid = false;
                    }
                    if ($('#idType').val() === 'ic' && !$('#icNumber').val()) {
                        errors.push('IC number is required');
                        isValid = false;
                    }
                    if ($('#idType').val() === 'passport' && !$('#passportNumber').val()) {
                        errors.push('Passport number is required');
                        isValid = false;
                    }
                    if (!$('#dateOfBirth').val()) {
                        errors.push('Date of birth is required');
                        isValid = false;
                    }
                    break;

                case 2: // Contact Information
                    if (!$('#mobileNumber').val()) {
                        errors.push('Mobile number is required');
                        isValid = false;
                    }

                    const email = $('#email').val();
                    if (email && !this.isValidEmail(email)) {
                        errors.push('Invalid email format');
                        isValid = false;
                    }
                    break;

                case 3: // Background & Preferences
                    // Optional fields
                    break;

                case 4: // Document Upload
                    // Documents are optional on edit (can keep existing)
                    break;
            }

            if (!isValid) {
                TempleCore.showToast(errors.join('<br>'), 'error');
            }

            return isValid;
        },

        saveStepData: function (step) {
            switch (step) {
                case 1: // Personal Information
                    this.volunteerData.full_name = $('#fullName').val();
                      this.volunteerData.full_name_en = $('#fullNameEn').val() || null; 
                    this.volunteerData.gender = $('#gender').val();
                    this.volunteerData.id_type = $('#idType').val();
                    this.volunteerData.ic_number = $('#icNumber').val() || null;
                    this.volunteerData.passport_number = $('#passportNumber').val() || null;
                    this.volunteerData.date_of_birth = $('#dateOfBirth').val();
                    this.volunteerData.marital_status = $('#maritalStatus').val() || null;
                    break;

                case 2: // Contact Information
                    this.volunteerData.mobile_primary = $('#mobileNumber').val();
                    this.volunteerData.email = $('#email').val() || null;
                    this.volunteerData.address = $('#address').val() || null;
                    this.volunteerData.city = $('#city').val() || null;
                    this.volunteerData.state = $('#state').val() || null;
                    this.volunteerData.postal_code = $('#postalCode').val() || null;
                    this.volunteerData.country = $('#country').val() || 'Malaysia';
                    this.volunteerData.emergency_contact_name = $('#emergencyContactName').val() || null;
                    this.volunteerData.emergency_contact_relationship = $('#emergencyContactRelationship').val() || null;
                    this.volunteerData.emergency_contact_phone = $('#emergencyContactPhone').val() || null;
                    break;

                case 3: // Background & Preferences
                    // Languages spoken
                    const languages = [];
                    $('input[name="languages[]"]:checked').each(function () {
                        languages.push($(this).val());
                    });
                    this.volunteerData.languages_spoken = languages.length > 0 ? languages : null;

                    this.volunteerData.skills_strengths = $('#skillsStrengths').val() || null;
                    this.volunteerData.preferred_department_id = $('#preferredDepartment').val() || null;

                    // Preferred tasks
                    const tasks = $('#preferredTasks').val();
                    this.volunteerData.preferred_tasks = tasks && tasks.length > 0 ? tasks : null;

                    this.volunteerData.past_volunteer_experience = $('#pastExperience').is(':checked');
                    this.volunteerData.physical_limitations = $('#physicalLimitations').val() || null;
                    break;
            }
        },

        submitUpdate: async function () {
            const self = this;

            // Final validation
            if (!await this.validateStep(4)) {
                return;
            }

            // Save step 4 data
            this.saveStepData(4);

            try {
                // Show loading
                $('#submitBtn').prop('disabled', true)
                    .html('<span class="spinner-border spinner-border-sm me-2"></span>Updating...');

                // Prepare data for update
                const updateData = {
                    full_name: this.volunteerData.full_name,
                        full_name_en: this.volunteerData.full_name_en,
                    gender: this.volunteerData.gender,
                    id_type: this.volunteerData.id_type,
                    ic_number: this.volunteerData.ic_number,
                    passport_number: this.volunteerData.passport_number,
                    date_of_birth: this.volunteerData.date_of_birth,
                    marital_status: this.volunteerData.marital_status,
                    mobile_primary: this.volunteerData.mobile_primary,
                    email: this.volunteerData.email,
                    address: this.volunteerData.address,
                    city: this.volunteerData.city,
                    state: this.volunteerData.state,
                    postal_code: this.volunteerData.postal_code,
                    country: this.volunteerData.country,
                    emergency_contact_name: this.volunteerData.emergency_contact_name,
                    emergency_contact_relationship: this.volunteerData.emergency_contact_relationship,
                    emergency_contact_phone: this.volunteerData.emergency_contact_phone,
                    preferred_department_id: this.volunteerData.preferred_department_id,
                    skills_strengths: this.volunteerData.skills_strengths,
                    past_volunteer_experience: this.volunteerData.past_volunteer_experience,
                    physical_limitations: this.volunteerData.physical_limitations,
                    languages_spoken: this.volunteerData.languages_spoken,
                    preferred_tasks: this.volunteerData.preferred_tasks
                };

                console.log('Updating volunteer:', this.volunteerId);
                console.log('Update data:', updateData);

                // Update volunteer basic info
                const response = await TempleAPI.put(`/volunteers/registration/${this.volunteerId}`, updateData);

                if (response.success) {
                    let documentsUploaded = 0;

                    // Upload any new documents
                    for (const [docType, fileData] of Object.entries(this.documentsToUpload)) {
                        if (fileData && fileData.file) {
                            try {
                                await this.uploadDocument(fileData.file, docType);
                                documentsUploaded++;
                            } catch (uploadError) {
                                console.error(`Error uploading ${docType}:`, uploadError);
                                // Continue with other uploads
                            }
                        }
                    }

                    // Success!
                    TempleCore.showToast(
                        `Volunteer updated successfully!${documentsUploaded > 0 ? ` ${documentsUploaded} document(s) uploaded.` : ''}`,
                        'success'
                    );

                    // Navigate back to list
                    setTimeout(() => {
                        TempleRouter.navigate('volunteers/registration/list');
                    }, 1500);

                } else {
                    TempleCore.showToast(response.message || 'Update failed', 'error');
                }

            } catch (error) {
                console.error('Update error:', error);
                const errorMsg = error.responseJSON?.message || 'Failed to update volunteer';
                TempleCore.showToast(errorMsg, 'error');

            } finally {
                // Reset button
                $('#submitBtn').prop('disabled', false)
                    .html('<i class="bi bi-check-circle me-2"></i>Update Registration');
            }
        },

        // ========================================
        // DOCUMENT UPLOAD METHODS
        // ========================================

        handleFileSelect: async function (event, documentType) {
            const file = event.target.files[0];

            if (!file) {
                return;
            }

            // Validate file
            const validation = this.validateFile(file);
            if (!validation.valid) {
                TempleCore.showToast(validation.message, 'error');
                event.target.value = '';
                return;
            }

            // Store file for later upload
            this.documentsToUpload[documentType] = {
                file: file,
                name: file.name,
                size: file.size,
                type: file.type
            };

            // Show preview
            this.showNewFilePreview(documentType, file);

            console.log(`New file selected for ${documentType}:`, file.name);
        },

        showNewFilePreview: function (documentType, file) {
            const previewIdMap = {
                'ic_photostat': '#icPhotostatPreview',
                'passport_photo': '#passportPhotoPreview',
                'passport_photostat': '#passportPhotostatPreview'
            };

            const previewContainer = $(previewIdMap[documentType]);

            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf';

            let displayHTML = `
                <div class="border rounded p-3 mt-2 bg-light">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center flex-grow-1">
            `;

            if (isImage) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewContainer.find('img').attr('src', e.target.result);
                };
                reader.readAsDataURL(file);

                displayHTML += `
                            <img src="" alt="${file.name}"
                                 class="img-thumbnail me-3"
                                 style="max-height: 60px; max-width: 60px;">
                `;
            } else if (isPdf) {
                displayHTML += `
                            <i class="bi bi-file-pdf text-danger me-3" style="font-size: 36px;"></i>
                `;
            }

            displayHTML += `
                            <div>
                                <h6 class="mb-1 small">${file.name}</h6>
                                <small class="text-muted">${this.formatFileSize(file.size)}</small>
                                <div><span class="badge bg-warning">New file - will replace existing</span></div>
                            </div>
                        </div>
                        <button type="button" 
                                class="btn btn-sm btn-outline-danger"
                                onclick="VolunteersRegistrationEditPage.removeFileSelection('${documentType}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            previewContainer.html(displayHTML);
        },

        removeFileSelection: function (documentType) {
            // Remove from storage
            delete this.documentsToUpload[documentType];

            // Clear file input
            const fileInputMap = {
                'ic_photostat': '#icPhotostatFile',
                'passport_photo': '#passportPhotoFile',
                'passport_photostat': '#passportPhotostatFile'
            };
            $(fileInputMap[documentType]).val('');

            // Restore existing document preview
            this.showExistingDocuments();

            console.log(`New file removed for ${documentType}, restored existing`);
        },

        validateFile: function (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (!validTypes.includes(file.type)) {
                return {
                    valid: false,
                    message: 'Invalid file type. Only JPG, PNG, and PDF are allowed.'
                };
            }

            if (file.size > maxSize) {
                return {
                    valid: false,
                    message: 'File size exceeds 5MB limit.'
                };
            }

            return { valid: true };
        },

        uploadDocument: async function (file, documentType) {
            try {
                console.log(`Uploading ${documentType}:`, file.name);

                // Prepare form data
                const formData = new FormData();
                formData.append('document', file);
                formData.append('document_type', documentType);

                // Upload to server
                const response = await this.uploadFileToServer(
                    `/volunteers/registration/${this.volunteerId}/upload-document`,
                    formData
                );

                if (response.success) {
                    console.log(`✅ ${documentType} uploaded successfully`);
                    return response.data;
                } else {
                    throw new Error(response.message || 'Upload failed');
                }

            } catch (error) {
                console.error(`Upload error for ${documentType}:`, error);
                throw error;
            }
        },

        uploadFileToServer: function (url, formData) {
            return new Promise((resolve, reject) => {
                try {
                    const baseUrl = window.APP_CONFIG?.API?.BASE_URL || '/api/v1';
                    const fullUrl = baseUrl.replace(/\/$/, '') + url;

                    const token = localStorage.getItem(window.APP_CONFIG?.STORAGE?.ACCESS_TOKEN || 'api_token');
                    const templeId = TempleAPI.getTempleId ? TempleAPI.getTempleId() : '';

                    $.ajax({
                        url: fullUrl,
                        type: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Accept': 'application/json',
                            'X-Temple-ID': templeId
                        },
                        success: function (response) {
                            console.log('✅ Upload successful');
                            resolve(response);
                        },
                        error: function (xhr, status, error) {
                            console.error('❌ Upload error:', xhr.status, xhr.statusText);

                            let errorMsg = 'Upload failed';
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                errorMsg = xhr.responseJSON.message;
                            }

                            reject(new Error(errorMsg));
                        }
                    });

                } catch (err) {
                    console.error('Upload preparation error:', err);
                    reject(err);
                }
            });
        },

        // ========================================
        // OTHER HELPER METHODS
        // ========================================

        handleIdTypeChange: function (idType) {
            if (idType === 'ic') {
                $('#icNumberGroup').show();
                $('#passportNumberGroup').hide();
                $('#icNumber').prop('required', true);
                $('#passportNumber').prop('required', false);
            } else if (idType === 'passport') {
                $('#icNumberGroup').hide();
                $('#passportNumberGroup').show();
                $('#icNumber').prop('required', false);
                $('#passportNumber').prop('required', true);
            }

            // Update Step 4 passport photostat visibility
            if (this.currentStep === 4) {
                $('#passportPhotostatGroup').toggle(idType === 'passport');
            }
        },

        extractDobFromIc: function (icNumber) {
            if (!icNumber || icNumber.length < 6) {
                return;
            }

            const ic = icNumber.replace(/[-\s]/g, '');

            if (ic.length !== 12) {
                return;
            }

            const year = ic.substring(0, 2);
            const month = ic.substring(2, 4);
            const day = ic.substring(4, 6);

            const currentYear = new Date().getFullYear();
            const currentYearLastTwo = currentYear % 100;
            const century = parseInt(year) > currentYearLastTwo ? '19' : '20';
            const fullYear = century + year;

            const dob = `${fullYear}-${month}-${day}`;
            $('#dateOfBirth').val(dob);

            TempleCore.showToast('Date of birth extracted from IC number', 'info');
        },

        loadDepartments: async function () {
            console.log('📡 Loading departments from API');

            try {
                const response = await TempleAPI.get('/volunteers/departments/active');

                if (response.success) {
                    this.departments = response.data;
                    this.renderDepartmentDropdown();
                } else {
                    throw new Error(response.message || 'Failed to load departments');
                }
            } catch (error) {
                console.error('❌ Error loading departments:', error);
                $('#preferredDepartment').html('<option value="">Failed to load departments</option>');
            }
        },

        renderDepartmentDropdown: function () {
            const select = $('#preferredDepartment');
            const currentValue = select.val(); // Preserve selected value
            
            select.empty();
            select.append('<option value="">Select Department</option>');

            if (this.departments && this.departments.length > 0) {
                this.departments.forEach(dept => {
                    select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                });
                
                // Restore selected value
                if (currentValue) {
                    select.val(currentValue);
                }
            } else {
                select.append('<option value="">No departments available</option>');
            }
        },

        loadTasksForDepartment: async function (departmentId, selectedTasks = null) {
            if (!departmentId) {
                $('#preferredTasks').empty().append('<option value="">Select department first</option>');
                return;
            }

            try {
                const response = await TempleAPI.get(`/volunteers/tasks/by-department/${departmentId}`);

                if (response.success) {
                    this.renderTasksDropdown(response.data, selectedTasks);
                } else {
                    throw new Error(response.message || 'Failed to load tasks');
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                $('#preferredTasks').empty().append('<option value="">Failed to load tasks</option>');
            }
        },

        renderTasksDropdown: function (tasks, selectedTasks = null) {
            const select = $('#preferredTasks');
            select.empty();

            if (tasks.length === 0) {
                select.append('<option value="">No tasks available</option>');
                return;
            }

            tasks.forEach(task => {
                select.append(`<option value="${task.id}">${task.task_name}</option>`);
            });

            // Set selected tasks if provided
            if (selectedTasks && Array.isArray(selectedTasks)) {
                select.val(selectedTasks);
            }
        },

        formatFileSize: function (bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

        isValidEmail: function (email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        cancel: function () {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                TempleRouter.navigate('volunteers/registration/list');
            }
        }
    };

    console.log('✅ VolunteersRegistrationEditPage module loaded');

})(jQuery, window);