// js/pages/volunteers/registration/create.js
// FIXED VERSION - Prevents premature saving, only saves on final submit
// Documents are uploaded after volunteer record is created in Step 4

(function ($, window) {
    'use strict';

    // ========================================
    // VOLUNTEERS SHARED MODULE
    // Manages CSS and cleanup across all volunteer pages
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
    // VOLUNTEER REGISTRATION CREATE PAGE
    // ========================================
    window.VolunteersRegistrationCreatePage = {
        pageId: 'volunteers-registration-create',
        eventNamespace: 'volunteers',
        currentStep: 1,
        totalSteps: 4,
        volunteerId: null,
        volunteerData: {},
        uploadedDocuments: {},
        documentsToUpload: {}, // Store file objects for upload after volunteer creation
        departments: [],
        tasks: [],

        init: function (params) {
            console.log('🚀 Initializing Volunteer Registration Wizard');

            // Register with shared module
            window.VolunteersSharedModule.registerPage(this.pageId);

            // Initialize duplicate tracking
            this.hasDuplicates = false; // ✅ Add this

            this.render();
            this.initAnimations();
            this.setupEventListeners();
            this.loadDepartments();
            this.showStep(1);

            console.log('✅ Registration Wizard Initialized');
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
            this.uploadedDocuments = {};
            this.documentsToUpload = {};
            this.departments = [];
            this.tasks = [];

            console.log(`✅ ${this.pageId} cleanup completed`);
        },

        initAnimations: function () {
            console.log('🎨 Initializing animations');

            // Initialize AOS if available
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }

            // Animate header icon
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
            console.log('📝 Rendering Registration Wizard HTML');

            const html = `
                <div class="volunteers-page ${this.pageId}-page">
                    <!-- Page Header with Animation -->
                    <div class="volunteers-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="volunteers-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="volunteers-title-wrapper">
                                        <i class="bi bi-person-plus-fill volunteers-header-icon"></i>
                                        <div>
                                            <h1 class="volunteers-title">New Volunteer Registration</h1>
                                            <p class="volunteers-subtitle">义工注册 • 4-Step Registration Wizard</p>
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

                    <!-- Wizard Container -->
                    <div class="card shadow-sm volunteers-content-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
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

        <!-- Full Name (Chinese) -->
        <div class="col-md-6">
            <label class="form-label">
                Full Name (Chinese) <span class="text-danger">*</span>
                <small class="text-muted">全名（中文）</small>
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
            <small class="text-muted d-block">Optional: English translation of full name</small>
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
                                            <strong>Required Documents:</strong> Please upload clear, legible copies of your documents (JPG, PNG, or PDF, max 5MB each)
                                        </div>
                                    </div>

                                    <!-- IC Photostat -->
                                    <div class="col-md-6">
                                        <label class="form-label">
                                            IC Photostat 身份证复印件 <span class="text-danger">*</span>
                                        </label>
                                        <input type="file" class="form-control" id="icPhotostatFile" accept="image/*,application/pdf">
                                        <div id="icPhotostatPreview" class="mt-2"></div>
                                    </div>

                                    <!-- Passport Photo -->
                                    <div class="col-md-6">
                                        <label class="form-label">
                                            Passport Photo 护照照片 <span class="text-danger">*</span>
                                        </label>
                                        <input type="file" class="form-control" id="passportPhotoFile" accept="image/*">
                                        <div id="passportPhotoPreview" class="mt-2"></div>
                                    </div>

                                    <!-- Passport Photostat (conditional) -->
                                    <div class="col-md-6" id="passportPhotostatGroup" style="display: none;">
                                        <label class="form-label">
                                            Passport Photostat 护照复印件 <span class="text-danger">*</span>
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
                                        <i class="bi bi-check-circle me-2"></i>Submit Registration
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
                self.submitRegistration();
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

            $(document).on('blur.' + this.eventNamespace, '#icNumber, #passportNumber, #mobileNumber', function () {
                self.checkDuplicates();
            });

            // Step 3: Preferred department change
            $(document).on('change.' + this.eventNamespace, '#preferredDepartment', function (e) {
                self.loadTasksForDepartment($(this).val());
            });

            // Document upload handlers - Store files, don't upload yet
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
        // FIXED: nextStep now validates AND checks for duplicates before progressing
        nextStep: async function () {
            // Validate current step
            if (!await this.validateStep(this.currentStep)) {
                return;
            }

            // Save current step data to local storage (not database)
            this.saveStepData(this.currentStep);

            // ✅ CHECK FOR DUPLICATES after Step 1 (IC/Passport entered) and Step 2 (Mobile entered)
            if (this.currentStep === 1 || this.currentStep === 2) {
                console.log(`Checking for duplicates after Step ${this.currentStep}...`);

                // Show loading indicator
                $('#nextBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Checking...');

                try {
                    const noDuplicates = await this.checkDuplicates();

                    if (!noDuplicates) {
                        // Duplicates found - block progression
                        TempleCore.showToast(
                            '❌ Cannot proceed: Duplicate IC/Passport/Mobile detected. Please correct the information before continuing.',
                            'error'
                        );

                        // Reset button
                        $('#nextBtn').prop('disabled', false).html('Next<i class="bi bi-arrow-right ms-2"></i>');
                        return; // Block progression
                    }

                    console.log('✅ No duplicates found, proceeding to next step');
                } catch (error) {
                    console.error('Error checking duplicates:', error);
                    // On error, show warning but allow progression (don't block on network errors)
                    TempleCore.showToast('⚠️ Could not verify duplicates. Please ensure your details are unique.', 'warning');
                }

                // Reset button
                $('#nextBtn').prop('disabled', false).html('Next<i class="bi bi-arrow-right ms-2"></i>');
            }

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
                    // Optional fields, but we can add validation if needed
                    break;

                case 4: // Document Upload
                    // Check if required documents are selected
                    if (!this.documentsToUpload['ic_photostat']) {
                        errors.push('IC photostat is required');
                        isValid = false;
                    }
                    if (!this.documentsToUpload['passport_photo']) {
                        errors.push('Passport photo is required');
                        isValid = false;
                    }
                    if ($('#idType').val() === 'passport' && !this.documentsToUpload['passport_photostat']) {
                        errors.push('Passport photostat is required for passport holders');
                        isValid = false;
                    }
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
                    this.volunteerData.gender = $('#gender').val();
                    this.volunteerData.full_name_en = $('#fullNameEn').val() || null;
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
                    // Languages spoken (multiple checkboxes)
                    const languages = [];
                    $('input[name="languages[]"]:checked').each(function () {
                        languages.push($(this).val());
                    });
                    this.volunteerData.languages_spoken = languages.length > 0 ? languages : null;

                    this.volunteerData.skills_strengths = $('#skillsStrengths').val() || null;
                    this.volunteerData.preferred_department_id = $('#preferredDepartment').val() || null;

                    // Preferred tasks (multiple select)
                    const tasks = $('#preferredTasks').val();
                    this.volunteerData.preferred_tasks = tasks && tasks.length > 0 ? tasks : null;

                    this.volunteerData.past_volunteer_experience = $('#pastExperience').is(':checked');
                    this.volunteerData.physical_limitations = $('#physicalLimitations').val() || null;
                    break;
            }
        },

        // FIXED: submitRegistration now creates volunteer AND uploads documents together
        submitRegistration: async function () {
            const self = this;

            // Final validation of step 4
            if (!await this.validateStep(4)) {
                return;
            }

            // Save step 4 data
            this.saveStepData(4);

            try {
                // Show loading - FIXED: Use correct button ID
                $('#submitBtn').prop('disabled', true)
                    .html('<span class="spinner-border spinner-border-sm me-2"></span>Submitting...');

                // Build FormData with all volunteer data + documents
                const formData = new FormData();

                // Mark as complete submission
                formData.append('step', 'complete');

                // Step 1: Personal Information
                formData.append('full_name', this.volunteerData.full_name || '');
                formData.append('gender', this.volunteerData.gender || '');
                formData.append('full_name_en', this.volunteerData.full_name_en || '');
                formData.append('id_type', this.volunteerData.id_type || 'ic');
                formData.append('ic_number', this.volunteerData.ic_number || '');
                formData.append('passport_number', this.volunteerData.passport_number || '');
                formData.append('date_of_birth', this.volunteerData.date_of_birth || '');
                formData.append('marital_status', this.volunteerData.marital_status || '');

                // Step 2: Contact Information
                formData.append('mobile_primary', this.volunteerData.mobile_primary || '');
                formData.append('email', this.volunteerData.email || '');
                formData.append('address', this.volunteerData.address || '');
                formData.append('city', this.volunteerData.city || '');
                formData.append('state', this.volunteerData.state || '');
                formData.append('postal_code', this.volunteerData.postal_code || '');
                formData.append('country', this.volunteerData.country || 'Malaysia');
                formData.append('emergency_contact_name', this.volunteerData.emergency_contact_name || '');
                formData.append('emergency_contact_relationship', this.volunteerData.emergency_contact_relationship || '');
                formData.append('emergency_contact_phone', this.volunteerData.emergency_contact_phone || '');

                // Step 3: Background & Preferences
                formData.append('preferred_department_id', this.volunteerData.preferred_department_id || '');
                formData.append('skills_strengths', this.volunteerData.skills_strengths || '');
                formData.append('past_volunteer_experience', this.volunteerData.past_volunteer_experience ? '1' : '0');
                formData.append('physical_limitations', this.volunteerData.physical_limitations || '');

                // Languages spoken (array)
                if (this.volunteerData.languages_spoken && Array.isArray(this.volunteerData.languages_spoken)) {
                    this.volunteerData.languages_spoken.forEach((lang, idx) => {
                        formData.append(`languages_spoken[${idx}]`, lang);
                    });
                }

                // Preferred tasks (array)
                if (this.volunteerData.preferred_tasks && Array.isArray(this.volunteerData.preferred_tasks)) {
                    this.volunteerData.preferred_tasks.forEach((taskId, idx) => {
                        formData.append(`preferred_tasks[${idx}]`, taskId);
                    });
                }

                // Step 4: Document files
                if (this.documentsToUpload['ic_photostat'] && this.documentsToUpload['ic_photostat'].file) {
                    formData.append('ic_photostat', this.documentsToUpload['ic_photostat'].file);
                    console.log('Adding ic_photostat:', this.documentsToUpload['ic_photostat'].file.name);
                }
                if (this.documentsToUpload['passport_photo'] && this.documentsToUpload['passport_photo'].file) {
                    formData.append('passport_photo', this.documentsToUpload['passport_photo'].file);
                    console.log('Adding passport_photo:', this.documentsToUpload['passport_photo'].file.name);
                }
                if (this.documentsToUpload['passport_photostat'] && this.documentsToUpload['passport_photostat'].file) {
                    formData.append('passport_photostat', this.documentsToUpload['passport_photostat'].file);
                    console.log('Adding passport_photostat:', this.documentsToUpload['passport_photostat'].file.name);
                }

                // Debug: Log FormData contents
                console.log('========== FormData Contents ==========');
                for (let pair of formData.entries()) {
                    if (pair[1] instanceof File) {
                        console.log(pair[0] + ': [File] ' + pair[1].name + ' (' + pair[1].size + ' bytes)');
                    } else {
                        console.log(pair[0] + ': ' + pair[1]);
                    }
                }
                console.log('========================================');

                // Submit using same URL pattern as master.js
                const response = await this.submitFormData('/volunteers/registration', formData);

                if (response.success) {
                    // Success!
                    TempleCore.showToast(
                        `Registration submitted successfully! Volunteer ID: ${response.volunteer_id}. Documents uploaded: ${response.documents_uploaded || 0}`,
                        'success'
                    );

                    // Show success step
                    this.showSuccessStep(response);
                } else {
                    TempleCore.showToast(response.message || 'Registration failed', 'error');
                }

            } catch (error) {
                console.error('Registration error:', error);
                const errorMsg = error.responseJSON?.message || 'Failed to submit registration';
                TempleCore.showToast(errorMsg, 'error');

            } finally {
                // Reset button - FIXED: Use correct button ID
                $('#submitBtn').prop('disabled', false)
                    .html('<i class="bi bi-check-circle me-2"></i>Submit Registration');
            }
        },
        showSuccessStep: function (response) {
            const volunteerId = response.volunteer_id || 'N/A';
            const documentsUploaded = response.documents_uploaded || 0;

            const successHtml = `
        <div class="wizard-step active" id="stepSuccess">
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="bi bi-check-circle-fill text-success" style="font-size: 80px;"></i>
                </div>
                <h2 class="text-success mb-3">Registration Successful!</h2>
                <p class="lead mb-4">
                    Thank you for registering as a volunteer.
                </p>
                <div class="card bg-light mx-auto" style="max-width: 400px;">
                    <div class="card-body">
                        <h5 class="card-title">Volunteer ID</h5>
                        <h3 class="text-primary mb-3">${volunteerId}</h3>
                        <p class="mb-1"><strong>Documents Uploaded:</strong> ${documentsUploaded}</p>
                        <p class="text-muted small">
                            Your registration is pending approval. 
                            You will be notified once approved.
                        </p>
                    </div>
                </div>
                <div class="mt-4">
                   <button class="btn btn-primary btn-lg me-2"
    onclick="TempleRouter.navigate('volunteers/registration/list')">
    <i class="bi bi-list-ul me-2"></i>View All Registrations
</button>

<button class="btn btn-success btn-lg"
    onclick="TempleRouter.navigate('volunteers/registration/create')">
    <i class="bi bi-plus-circle me-2"></i>Register Another
</button>
                </div>
            </div>
        </div>
    `;

            // Hide all wizard steps and show success
            $('.wizard-step').removeClass('active').hide();

            // Replace the current step with success content
            $('#step4').after(successHtml);

            // Update progress bar to 100%
            $('#wizardProgressBar').css('width', '100%');

            // Mark all steps as completed
            $('.step-indicator').addClass('completed').removeClass('active');

            // Update title
            $('#currentStepTitle').text('Registration Complete!');

            // Hide navigation buttons
            $('#prevBtn, #nextBtn, #submitBtn').hide();
        },
        submitFormData: function (url, formData) {
            const self = this;

            return new Promise((resolve, reject) => {
                try {
                    // Use same URL pattern as master.js (TempleAPI)
                    const baseUrl = window.APP_CONFIG.API.BASE_URL;
                    const fullUrl = baseUrl + url;

                    const token = localStorage.getItem(window.APP_CONFIG.STORAGE.ACCESS_TOKEN);
                    const templeId = TempleAPI.getTempleId ? TempleAPI.getTempleId() : '';

                    console.log('========== DEBUG: submitFormData ==========');
                    console.log('Base URL:', baseUrl);
                    console.log('Full URL:', fullUrl);
                    console.log('Temple ID:', templeId);
                    console.log('============================================');

                    $.ajax({
                        url: fullUrl,
                        type: 'POST',
                        data: formData,
                        processData: false,  // Critical for FormData
                        contentType: false,  // Critical for FormData
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Accept': 'application/json',
                            'X-Temple-ID': templeId
                        },
                        success: function (response) {
                            console.log('Registration success:', response);
                            resolve(response);
                        },
                        error: function (xhr, status, error) {
                            console.error('Registration failed:', {
                                status: xhr.status,
                                response: xhr.responseJSON,
                                error: error
                            });
                            reject(xhr);
                        }
                    });
                } catch (e) {
                    console.error('submitFormData exception:', e);
                    reject(e);
                }
            });
        },
        // ========================================
        // DOCUMENT UPLOAD METHODS
        // ========================================

        // FIXED: handleFileSelect now just stores the file, doesn't upload yet
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

            // Store file for later upload (when submit is clicked)
            this.documentsToUpload[documentType] = {
                file: file,
                name: file.name,
                size: file.size,
                type: file.type
            };

            // Show preview
            this.showFilePreview(documentType, file);

            console.log(`File selected for ${documentType}:`, file.name);
        },

        showFilePreview: function (documentType, file) {
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
                                <div><span class="badge bg-info">Ready to upload</span></div>
                            </div>
                        </div>
                        <button type="button" 
                                class="btn btn-sm btn-outline-danger"
                                onclick="VolunteersRegistrationCreatePage.removeFileSelection('${documentType}')">
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

            // Clear preview
            const previewIdMap = {
                'ic_photostat': '#icPhotostatPreview',
                'passport_photo': '#passportPhotoPreview',
                'passport_photostat': '#passportPhotostatPreview'
            };
            $(previewIdMap[documentType]).html('');

            // Reset file input
            const fileInputMap = {
                'ic_photostat': '#icPhotostatFile',
                'passport_photo': '#passportPhotoFile',
                'passport_photostat': '#passportPhotostatFile'
            };
            $(fileInputMap[documentType]).val('');

            console.log(`File removed for ${documentType}`);
        },

        validateFile: function (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (!validTypes.includes(file.type)) {
                return {
                    valid: false,
                    message: 'Invalid file type. Only JPG and PNG are allowed.'
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

        /**
         * Upload document to server
         * Called during submitRegistration after volunteer is created
         */
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
                    this.uploadedDocuments[documentType] = response.data;
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

        /**
         * Upload file to server using FormData
         */
        uploadFileToServer: function (url, formData) {
            return new Promise((resolve, reject) => {
                try {
                    // Get base URL
                    let baseUrl = '';

                    if (typeof TempleAPI !== 'undefined') {
                        // Search for baseUrl in TempleAPI
                        const searchForBaseUrl = (obj, depth = 0) => {
                            if (depth > 3 || !obj || typeof obj !== 'object') return null;

                            if (obj.defaults && obj.defaults.baseURL) return obj.defaults.baseURL;
                            if (obj.baseURL) return obj.baseURL;
                            if (obj.baseUrl) return obj.baseUrl;

                            for (let key of Object.keys(obj)) {
                                try {
                                    const result = searchForBaseUrl(obj[key], depth + 1);
                                    if (result) return result;
                                } catch (e) { }
                            }
                            return null;
                        };

                        baseUrl = searchForBaseUrl(TempleAPI);
                    }

                    if (!baseUrl) {
                        baseUrl = '/api/v1';
                    }

                    baseUrl = baseUrl.replace(/\/$/, '');
                    const fullUrl = baseUrl + url;

                    // Get authentication token
                    let token = localStorage.getItem('api_token') ||
                        sessionStorage.getItem('api_token') ||
                        localStorage.getItem('token') || '';

                    // Get temple ID
                    let templeId = localStorage.getItem('temple_id') ||
                        sessionStorage.getItem('temple_id') || '';

                    console.log('Upload URL:', fullUrl);

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
                            } else if (xhr.status === 404) {
                                errorMsg = 'Upload endpoint not found';
                            } else if (xhr.responseText) {
                                try {
                                    const parsed = JSON.parse(xhr.responseText);
                                    errorMsg = parsed.message || errorMsg;
                                } catch (e) {
                                    errorMsg = xhr.statusText || errorMsg;
                                }
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

            // Remove dashes and spaces
            const ic = icNumber.replace(/[-\s]/g, '');

            if (ic.length !== 12) {
                return;
            }

            // Extract YY, MM, DD
            const year = ic.substring(0, 2);
            const month = ic.substring(2, 4);
            const day = ic.substring(4, 6);

            // Determine century
            const currentYear = new Date().getFullYear();
            const currentYearLastTwo = currentYear % 100;
            const century = parseInt(year) > currentYearLastTwo ? '19' : '20';
            const fullYear = century + year;

            // Set date of birth
            const dob = `${fullYear}-${month}-${day}`;
            $('#dateOfBirth').val(dob);

            TempleCore.showToast('Date of birth extracted from IC number', 'info');
        },

        checkDuplicates: async function () {
            const icNumber = $('#icNumber').val();
            const passportNumber = $('#passportNumber').val();
            const mobile = $('#mobileNumber').val();

            if (!icNumber && !passportNumber && !mobile) {
                return true; // Nothing to check
            }

            try {
                const response = await TempleAPI.post('/volunteers/registration/check-duplicate', {
                    ic_number: icNumber || null,
                    passport_number: passportNumber || null,
                    mobile_primary: mobile || null
                });

                if (!response.success && response.duplicates) {
                    // Build detailed error message
                    const messages = response.duplicates.map(dup => {
                        const field = dup.field === 'ic_number' ? 'IC Number' :
                            dup.field === 'passport_number' ? 'Passport Number' :
                                dup.field === 'mobile_primary' ? 'Mobile Number' : dup.field;

                        return `<strong>${field}</strong>: Already registered for <strong>${dup.existing_volunteer.volunteer_id}</strong> (${dup.existing_volunteer.name})`;
                    });

                    TempleCore.showToast(
                        '⚠️ <strong>Duplicate Registration Detected:</strong><br>' + messages.join('<br>'),
                        'error',
                        8000 // Show for 8 seconds
                    );

                    // Highlight the duplicate fields
                    response.duplicates.forEach(dup => {
                        if (dup.field === 'ic_number') {
                            $('#icNumber').addClass('is-invalid');
                        } else if (dup.field === 'passport_number') {
                            $('#passportNumber').addClass('is-invalid');
                        } else if (dup.field === 'mobile_primary') {
                            $('#mobileNumber').addClass('is-invalid');
                        }
                    });

                    // Store duplicate status
                    this.hasDuplicates = true;
                    return false; // Duplicates found
                }

                // No duplicates - remove any invalid highlighting
                $('#icNumber, #passportNumber, #mobileNumber').removeClass('is-invalid');
                this.hasDuplicates = false;
                return true;

            } catch (error) {
                console.error('Error checking duplicates:', error);

                // Show warning toast
                TempleCore.showToast(
                    '⚠️ Unable to verify duplicates. Please ensure your details are unique.',
                    'warning'
                );

                return true; // Don't block on network error
            }
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

                let errorMessage = 'Failed to load departments';
                if (error.responseJSON && error.responseJSON.message) {
                    errorMessage = error.responseJSON.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }

                TempleCore.showToast(errorMessage, 'error');
                $('#preferredDepartment').html('<option value="">Failed to load departments</option>');
            }
        },

        renderDepartmentDropdown: function () {
            const select = $('#preferredDepartment');
            select.empty();
            select.append('<option value="">Select Department</option>');

            if (this.departments && this.departments.length > 0) {
                this.departments.forEach(dept => {
                    select.append(`<option value="${dept.id}">${dept.department_name}</option>`);
                });
            } else {
                select.append('<option value="">No departments available</option>');
            }
        },

        loadTasksForDepartment: async function (departmentId) {
            if (!departmentId) {
                $('#preferredTasks').empty().append('<option value="">Select department first</option>');
                return;
            }

            try {
                const response = await TempleAPI.get(`/volunteers/tasks/by-department/${departmentId}`);

                if (response.success) {
                    this.renderTasksDropdown(response.data);
                } else {
                    throw new Error(response.message || 'Failed to load tasks');
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                TempleCore.showToast('Failed to load tasks for this department', 'error');
                $('#preferredTasks').empty().append('<option value="">Failed to load tasks</option>');
            }
        },

        renderTasksDropdown: function (tasks) {
            const select = $('#preferredTasks');
            select.empty();

            if (tasks.length === 0) {
                select.append('<option value="">No tasks available</option>');
                return;
            }

            tasks.forEach(task => {
                select.append(`<option value="${task.id}">${task.task_name}</option>`);
            });
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
            if (confirm('Are you sure you want to cancel? All entered data will be lost.')) {
            
                    TempleRouter.navigate(`volunteers/registration/list`);
            }
        }
    };

    console.log('✅ VolunteersRegistrationCreatePage module loaded (FIXED VERSION)');

})(jQuery, window);