// js/pages/dharma-assembly/create.js
// Special Occasions Dharma Assembly Create Page with GSAP + AOS animations

(function($, window) {
    'use strict';
    
	if (!window.DharmaAssemblySharedModule) {
        window.DharmaAssemblySharedModule = {
            moduleId: 'dharma-assembly',
			eventNamespace: 'dharma-assembly',
            cssId: 'dharma-assembly-css',
            cssPath: '/css/dharma-assembly.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Dharma Assembly CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Dharma Assembly page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Dharma Assembly page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                // If no more pages active, cleanup CSS
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            // Check if any pages are active
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            // Get active pages
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            // Cleanup module resources
            cleanup: function() {
                // Remove CSS
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Dharma Assembly CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all dharma-assembly-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Dharma Assembly module cleaned up');
            }
        };
    }
	
    window.DharmaAssemblyCreatePage = {
        assemblyType: 'longevity', // Default type: longevity, departed, merit
		pageId: 'dharma-assembly-create',
        eventNamespace: window.DharmaAssemblySharedModule.eventNamespace,
        currentStep: 1,
        totalSteps: 3,
        personalDetails: null,
        
        // Page initialization
        init: function(params) {
            window.DharmaAssemblySharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();
            this.bindEvents();
        },
        
		// Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.DharmaAssemblySharedModule.unregisterPage(this.pageId);
            
            // Cleanup page-specific events (with page namespace)
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);
            
            // Cleanup page-specific animations
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }
            
            // Clear any intervals/timeouts
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            console.log(`${this.pageId} cleanup completed`);
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="dharma-assembly-page">
                    <!-- Page Header with Animation -->
                    <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-calendar-event-fill occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Dharma Assembly</h1>
                                            <p class="occasion-subtitle">法会 • Special Occasions Registration</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnCancel">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Assembly Type Tabs -->
                    <div class="card shadow-sm mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="card-body p-3">
                            <ul class="nav nav-pills assembly-tabs justify-content-center" id="assemblyTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="longevity-tab" data-bs-toggle="pill" 
                                        data-bs-target="#longevity" type="button" role="tab" data-type="longevity">
                                        <i class="bi bi-gift-fill"></i>
                                        <span class="d-block">Prayer for Longevity</span>
                                        <small class="d-block">延生禄位</small>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="departed-tab" data-bs-toggle="pill" 
                                        data-bs-target="#departed" type="button" role="tab" data-type="departed">
                                        <i class="bi bi-flower1"></i>
                                        <span class="d-block">Prayer to The Departed</span>
                                        <small class="d-block">往生超荐</small>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="merit-tab" data-bs-toggle="pill" 
                                        data-bs-target="#merit" type="button" role="tab" data-type="merit">
                                        <i class="bi bi-star-fill"></i>
                                        <span class="d-block">Merit Dedication</span>
                                        <small class="d-block">功德主</small>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Progress Indicator -->
                    <div class="card shadow-sm mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body p-3">
                            <div class="progress-wrapper">
                                <div class="progress-steps">
                                    <div class="progress-step active" data-step="1">
                                        <div class="step-circle">1</div>
                                        <span class="step-label">Personal Details</span>
                                    </div>
                                    <div class="progress-line"></div>
                                    <div class="progress-step" data-step="2">
                                        <div class="step-circle">2</div>
                                        <span class="step-label">Occasion Options</span>
                                    </div>
                                    <div class="progress-line"></div>
                                    <div class="progress-step" data-step="3">
                                        <div class="step-circle">3</div>
                                        <span class="step-label">Payment & Submit</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Form Container -->
                    <div class="card shadow-sm occasion-form-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                        <div class="card-body p-4">
                            <form id="occasionForm" novalidate>
                                <div class="tab-content" id="assemblyTabContent">
                                    <!-- Prayer for Longevity Tab -->
                                    <div class="tab-pane fade show active" id="longevity" role="tabpanel">
                                        <div id="longevityFormContent"></div>
                                    </div>
                                    
                                    <!-- Prayer to The Departed Tab -->
                                    <div class="tab-pane fade" id="departed" role="tabpanel">
                                        <div id="departedFormContent"></div>
                                    </div>
                                    
                                    <!-- Merit Dedication Tab -->
                                    <div class="tab-pane fade" id="merit" role="tabpanel">
                                        <div id="meritFormContent"></div>
                                    </div>
                                </div>

                                <!-- Form Actions -->
                                <div class="form-actions mt-4 pt-4 border-top">
                                    <div class="d-flex justify-content-between">
                                        <button type="button" class="btn btn-secondary" id="btnPrevious" style="display:none;">
                                            <i class="bi bi-arrow-left"></i> Previous
                                        </button>
                                        <button type="button" class="btn btn-primary btn-lg px-4" id="btnNext">
                                            Next <i class="bi bi-arrow-right"></i>
                                        </button>
                                        <button type="submit" class="btn btn-success btn-lg px-4" id="btnSubmit" style="display:none;">
                                            <i class="bi bi-check-circle"></i> Submit
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Personal Details Modal -->
                <div class="modal fade" id="personalDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-badge"></i> Personal Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Name (Chinese) 姓名(中文) <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="modalNameChinese" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Name (English) 姓名(英文) <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="modalNameEnglish" required>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">NRIC No. 身份证 <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="modalNric" required>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">Email 电邮 <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" id="modalEmail" required>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">Contact No. 手机号码 <span class="text-danger">*</span></label>
                                        <input type="tel" class="form-control" id="modalContact" required>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnSavePersonalDetails">
                                    <i class="bi bi-check-circle"></i> Save Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
            this.loadStepContent();
        },
        
        // Load step content based on current step and assembly type
        loadStepContent: function() {
            const contentId = `${this.assemblyType}FormContent`;
            const $content = $(`#${contentId}`);
            
            let html = '';
            
            if (this.currentStep === 1) {
                html = this.getStep1Content();
            } else if (this.currentStep === 2) {
                html = this.getStep2Content();
            } else if (this.currentStep === 3) {
                html = this.getStep3Content();
            }
            
            // Animate transition
            gsap.to($content, {
                opacity: 0,
                y: -20,
                duration: 0.3,
                onComplete: () => {
                    $content.html(html);
                    gsap.fromTo($content, 
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
                    );
                    
                    // Update progress indicator
                    this.updateProgressIndicator();
                    
                    // Update buttons
                    this.updateNavigationButtons();
                }
            });
        },
        
        // Step 1: Personal Details
        getStep1Content: function() {
            const hasDetails = this.personalDetails !== null;
            
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-person-badge"></i>
                        <span>Step 1: Personal Information 个人资料</span>
                    </div>
                    
                    <div class="text-center py-5">
                        ${hasDetails ? `
                            <div class="personal-details-summary mb-4">
                                <div class="alert alert-success">
                                    <i class="bi bi-check-circle-fill me-2"></i>
                                    <strong>Personal details saved</strong>
                                </div>
                                <div class="details-card">
                                    <p><strong>Name:</strong> ${this.personalDetails.nameChinese} / ${this.personalDetails.nameEnglish}</p>
                                    <p><strong>NRIC:</strong> ${this.personalDetails.nric}</p>
                                    <p><strong>Email:</strong> ${this.personalDetails.email}</p>
                                    <p><strong>Contact:</strong> ${this.personalDetails.contact}</p>
                                </div>
                            </div>
                        ` : `
                            <i class="bi bi-person-circle display-1 text-primary mb-3"></i>
                            <h4 class="mb-3">Add Your Personal Details</h4>
                            <p class="text-muted mb-4">Click the button below to enter your personal information</p>
                        `}
                        
                        <button type="button" class="btn btn-primary btn-lg" id="btnAddPersonalDetails">
                            <i class="bi bi-${hasDetails ? 'pencil' : 'plus-circle'}"></i> 
                            ${hasDetails ? 'Edit' : 'Add'} Personal Details
                        </button>
                    </div>
                </div>
            `;
        },
        
        // Step 2: Occasion Options (Assembly Type Specific)
        getStep2Content: function() {
            if (this.assemblyType === 'longevity') {
                return this.getLongevityOptions();
            } else if (this.assemblyType === 'departed') {
                return this.getDepartedOptions();
            } else {
                return this.getMeritOptions();
            }
        },
        
        // Prayer for Longevity Options
        getLongevityOptions: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-gift-fill"></i>
                        <span>Step 2: Prayer for Longevity Options 延生禄位选项</span>
                    </div>
                    
                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label fw-semibold">Occasion Option 选项 <span class="text-danger">*</span></label>
                            <div class="occasion-options-grid">
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="chief_patron" value="chief_patron" required>
                                    <label class="form-check-label" for="chief_patron">
                                        <i class="bi bi-star-fill"></i>
                                        <div>
                                            <span class="d-block">Chief Patron</span>
                                            <span class="d-block">法华坛功德主</span>
                                            <small class="text-muted d-block mt-1">RM 30,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="co_patron" value="co_patron">
                                    <label class="form-check-label" for="co_patron">
                                        <i class="bi bi-award-fill"></i>
                                        <div>
                                            <span class="d-block">Co-Patron</span>
                                            <span class="d-block">副功德主</span>
                                            <small class="text-muted d-block mt-1">RM 20,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="diligent_patron" value="diligent_patron">
                                    <label class="form-check-label" for="diligent_patron">
                                        <i class="bi bi-gem"></i>
                                        <div>
                                            <span class="d-block">Diligent Patron</span>
                                            <span class="d-block">精进功德主</span>
                                            <small class="text-muted d-block mt-1">RM 15,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="bodhi_patron" value="bodhi_patron">
                                    <label class="form-check-label" for="bodhi_patron">
                                        <i class="bi bi-flower2"></i>
                                        <div>
                                            <span class="d-block">Bodhi Patron</span>
                                            <span class="d-block">菩提功德主</span>
                                            <small class="text-muted d-block mt-1">RM 10,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="mercy_patron" value="mercy_patron">
                                    <label class="form-check-label" for="mercy_patron">
                                        <i class="bi bi-heart-fill"></i>
                                        <div>
                                            <span class="d-block">Mercy Patron</span>
                                            <span class="d-block">慈悲功德主</span>
                                            <small class="text-muted d-block mt-1">RM 5,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="fulfilled_patron" value="fulfilled_patron">
                                    <label class="form-check-label" for="fulfilled_patron">
                                        <i class="bi bi-check-circle-fill"></i>
                                        <div>
                                            <span class="d-block">Fulfilled Patron</span>
                                            <span class="d-block">如意功德主</span>
                                            <small class="text-muted d-block mt-1">RM 1,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="auspicious_patron" value="auspicious_patron">
                                    <label class="form-check-label" for="auspicious_patron">
                                        <i class="bi bi-brightness-high-fill"></i>
                                        <div>
                                            <span class="d-block">Auspicious Patron</span>
                                            <span class="d-block">吉祥功德主</span>
                                            <small class="text-muted d-block mt-1">RM 500</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="dharma_patron" value="dharma_patron">
                                    <label class="form-check-label" for="dharma_patron">
                                        <i class="bi bi-book-fill"></i>
                                        <div>
                                            <span class="d-block">Dharma Patron</span>
                                            <span class="d-block">护法主</span>
                                            <small class="text-muted d-block mt-1">RM 300</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="longevity_option" id="dharma_sponsor" value="dharma_sponsor">
                                    <label class="form-check-label" for="dharma_sponsor">
                                        <i class="bi bi-hand-thumbs-up-fill"></i>
                                        <div>
                                            <span class="d-block">Dharma Sponsor</span>
                                            <span class="d-block">护法者</span>
                                            <small class="text-muted d-block mt-1">RM 100</small>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Prayer to The Departed Options
        getDepartedOptions: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-flower1"></i>
                        <span>Step 2: Prayer to The Departed Options 往生超荐选项</span>
                    </div>
                    
                    <div class="row g-4">
                        <div class="col-12">
                            <label class="form-label fw-semibold">Occasion Option 选项 <span class="text-danger">*</span></label>
                            <div class="occasion-options-grid">
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="departed_option" id="tablet_individual" value="tablet_individual" required>
                                    <label class="form-check-label" for="tablet_individual">
                                        <i class="bi bi-file-text-fill"></i>
                                        <div>
                                            <span class="d-block">1 Tablet (Individual)</span>
                                            <span class="d-block">个独立牌位 (个供佛品供奉)</span>
                                            <small class="text-muted d-block mt-1">RM 1,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="departed_option" id="tablet_4_family" value="tablet_4_family">
                                    <label class="form-check-label" for="tablet_4_family">
                                        <i class="bi bi-people-fill"></i>
                                        <div>
                                            <span class="d-block">1 Tablet (4 Family Members)</span>
                                            <span class="d-block">1 个牌位 (4 位直属家亡者)</span>
                                            <small class="text-muted d-block mt-1">RM 500</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="departed_option" id="tablet_3_family" value="tablet_3_family">
                                    <label class="form-check-label" for="tablet_3_family">
                                        <i class="bi bi-person-lines-fill"></i>
                                        <div>
                                            <span class="d-block">1 Tablet (3 Family Members)</span>
                                            <span class="d-block">1 个牌位 (3 位直属家亡者)</span>
                                            <small class="text-muted d-block mt-1">RM 100</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="departed_option" id="tablet_2_family" value="tablet_2_family">
                                    <label class="form-check-label" for="tablet_2_family">
                                        <i class="bi bi-person-fill"></i>
                                        <div>
                                            <span class="d-block">1 Tablet (2 Family Members)</span>
                                            <span class="d-block">1 个牌位 (2 位直属家亡者)</span>
                                            <small class="text-muted d-block mt-1">RM 50</small>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label fw-semibold">Dedicatees 超荐对象 <span class="text-danger">*</span></label>
                            <div class="dedicatees-list">
                                <!-- Ancestor of Family -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="ancestor" id="ancestor">
                                        <label class="form-check-label" for="ancestor">
                                            () 门堂上历代祖先 Ancestor of Family
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="ancestor_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_ancestor" placeholder="Enter ancestor name">
                                    </div>
                                </div>
                                
                                <!-- Late Father -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="late_father" id="late_father">
                                        <label class="form-check-label" for="late_father">
                                            Late Father 先父
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="late_father_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_late_father" placeholder="Enter late father's name">
                                    </div>
                                </div>
                                
                                <!-- Late Mother -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="late_mother" id="late_mother">
                                        <label class="form-check-label" for="late_mother">
                                            Late Mother 先母
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="late_mother_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_late_mother" placeholder="Enter late mother's name">
                                    </div>
                                </div>
                                
                                <!-- Late Grandfather -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="late_grandfather" id="late_grandfather">
                                        <label class="form-check-label" for="late_grandfather">
                                            Late Grandfather 先祖父/外祖父
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="late_grandfather_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_late_grandfather" placeholder="Enter late grandfather's name">
                                    </div>
                                </div>
                                
                                <!-- Late Grandmother -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="late_grandmother" id="late_grandmother">
                                        <label class="form-check-label" for="late_grandmother">
                                            Late Grandmother 先祖母/外祖母
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="late_grandmother_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_late_grandmother" placeholder="Enter late grandmother's name">
                                    </div>
                                </div>
                                
                                <!-- Late Siblings -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="late_siblings" id="late_siblings">
                                        <label class="form-check-label" for="late_siblings">
                                            Late Siblings 先兄/姐/弟/妹
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="late_siblings_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_late_siblings" placeholder="Enter late sibling's name">
                                    </div>
                                </div>
                                
                                <!-- Karmic Retribution -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="karmic_retribution" id="karmic_retribution">
                                        <label class="form-check-label" for="karmic_retribution">
                                            Karmic Retribution 冤亲债主
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="karmic_retribution_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_karmic_retribution" placeholder="Enter name (if applicable)">
                                    </div>
                                </div>
                                
                                <!-- Friend -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="friend" id="friend">
                                        <label class="form-check-label" for="friend">
                                            Friend 朋友
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="friend_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_friend" placeholder="Enter friend's name">
                                    </div>
                                </div>
                                
                                <!-- Wandering Spirits -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="wandering_spirits" id="wandering_spirits">
                                        <label class="form-check-label" for="wandering_spirits">
                                            Wandering Spirits 无主孤魂
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="wandering_spirits_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_wandering_spirits" placeholder="Enter name (if applicable)">
                                    </div>
                                </div>
                                
                                <!-- Infant Soul -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="infant_soul" id="infant_soul">
                                        <label class="form-check-label" for="infant_soul">
                                            Infant Soul/ The Departed Child 婴灵
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="infant_soul_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_infant_soul" placeholder="Enter infant's name (if applicable)">
                                    </div>
                                </div>
                                
                                <!-- Others -->
                                <div class="dedicatee-item">
                                    <div class="form-check">
                                        <input class="form-check-input dedicatee-checkbox" type="checkbox" name="dedicatees[]" value="others" id="others">
                                        <label class="form-check-label" for="others">
                                            Others 其他
                                        </label>
                                    </div>
                                    <div class="dedicatee-name-field" id="others_name_field" style="display:none;">
                                        <input type="text" class="form-control form-control-sm mt-2" name="departed_name_others" placeholder="Enter name">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Merit Dedication Options
        getMeritOptions: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-star-fill"></i>
                        <span>Step 2: Merit Dedication Options 功德主选项</span>
                    </div>
                    
                    <div class="row g-4">
                        <div class="col-12">
                            <label class="form-label fw-semibold">Meal Option 供斋选项 <span class="text-danger">*</span></label>
                            <div class="occasion-options-grid">
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="meal_option" id="perfect_meal" value="perfect_meal" required>
                                    <label class="form-check-label" for="perfect_meal">
                                        <i class="bi bi-trophy-fill"></i>
                                        <div>
                                            <span class="d-block">Perfect Meal</span>
                                            <span class="d-block">圆满斋</span>
                                            <small class="text-muted d-block mt-1">RM 1,000</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="meal_option" id="longevity_meal" value="longevity_meal">
                                    <label class="form-check-label" for="longevity_meal">
                                        <i class="bi bi-heart-fill"></i>
                                        <div>
                                            <span class="d-block">Longevity Meal</span>
                                            <span class="d-block">福寿斋</span>
                                            <small class="text-muted d-block mt-1">RM 500</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="meal_option" id="fulfilling_meal" value="fulfilling_meal">
                                    <label class="form-check-label" for="fulfilling_meal">
                                        <i class="bi bi-check-circle-fill"></i>
                                        <div>
                                            <span class="d-block">Fulfilling Meal</span>
                                            <span class="d-block">如意斋</span>
                                            <small class="text-muted d-block mt-1">RM 300</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="meal_option" id="auspicious_meal" value="auspicious_meal">
                                    <label class="form-check-label" for="auspicious_meal">
                                        <i class="bi bi-brightness-high-fill"></i>
                                        <div>
                                            <span class="d-block">Auspicious Meal</span>
                                            <span class="d-block">吉祥斋</span>
                                            <small class="text-muted d-block mt-1">RM 200</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="meal_option" id="arhat_meal" value="arhat_meal">
                                    <label class="form-check-label" for="arhat_meal">
                                        <i class="bi bi-gem"></i>
                                        <div>
                                            <span class="d-block">Arhat Meal</span>
                                            <span class="d-block">罗汉斋</span>
                                            <small class="text-muted d-block mt-1">RM 100</small>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="radio" name="meal_option" id="free_will_meal" value="free_will_meal">
                                    <label class="form-check-label" for="free_will_meal">
                                        <i class="bi bi-hand-thumbs-up"></i>
                                        <div>
                                            <span class="d-block">Free Will Meal</span>
                                            <span class="d-block">随缘斋</span>
                                            <small class="text-muted d-block mt-1">RM ___</small>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-12" id="freeWillAmountField" style="display:none;">
                            <label class="form-label fw-semibold">Free Will Amount 随缘金额 <span class="text-danger">*</span></label>
                            <input type="number" class="form-control" name="free_will_amount" placeholder="Enter amount" min="1" step="0.01">
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label fw-semibold">Auspicious Wisdom Light 吉祥智慧灯选</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="wisdom_light" id="family_light" value="family">
                                <label class="form-check-label" for="family_light">
                                    Family 阖家 (RM 50)
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="wisdom_light" id="individual_light" value="individual">
                                <label class="form-check-label" for="individual_light">
                                    Individual 个人 (RM 50)
                                </label>
                            </div>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label fw-semibold">Offering to Devas 斋天供养二十四诸天</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="devas_offering" id="family_devas" value="family">
                                <label class="form-check-label" for="family_devas">
                                    Family 阖家 (RM 50)
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="devas_offering" id="individual_devas" value="individual">
                                <label class="form-check-label" for="individual_devas">
                                    Individual 个人 (RM 50)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Step 3: Payment & Remarks
        getStep3Content: function() {
            return `
                <div class="step-content">
                    <div class="section-header-gradient mb-4">
                        <i class="bi bi-credit-card"></i>
                        <span>Step 3: Payment Method & Remarks 付款方式</span>
                    </div>
                    
                    <div class="row g-4">
                        <div class="col-12">
                            <label class="form-label fw-semibold">Payment Method 付款方式 <span class="text-danger">*</span></label>
                            <div class="payment-methods-grid">
                                <div class="form-check-card">
                                    <input class="form-check-input" type="checkbox" name="payment_method[]" id="cash" value="cash">
                                    <label class="form-check-label" for="cash">
                                        <i class="bi bi-cash-stack"></i>
                                        <span>Cash 现款</span>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="checkbox" name="payment_method[]" id="cheque" value="cheque">
                                    <label class="form-check-label" for="cheque">
                                        <i class="bi bi-receipt"></i>
                                        <span>Cheque 支票</span>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="checkbox" name="payment_method[]" id="ebanking" value="ebanking">
                                    <label class="form-check-label" for="ebanking">
                                        <i class="bi bi-bank"></i>
                                        <span>E-banking 银行转账</span>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="checkbox" name="payment_method[]" id="credit_card" value="credit_card">
                                    <label class="form-check-label" for="credit_card">
                                        <i class="bi bi-credit-card-fill"></i>
                                        <span>Credit/Debit Card 信用卡</span>
                                    </label>
                                </div>
                                
                                <div class="form-check-card">
                                    <input class="form-check-input" type="checkbox" name="payment_method[]" id="duitnow" value="duitnow">
                                    <label class="form-check-label" for="duitnow">
                                        <i class="bi bi-wallet2"></i>
                                        <span>DuitNow (E-wallet) 电子钱包</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label fw-semibold">Remarks 备注</label>
                            <textarea class="form-control" name="remarks" rows="3" placeholder="Any additional notes..."></textarea>
                        </div>
                        
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle-fill me-2"></i>
                                <strong>Note:</strong> Please review all information before submitting.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Initialize animations
        initAnimations: function() {
            // Initialize AOS
            AOS.init({
                duration: 800,
                easing: 'ease-out',
                once: true
            });
            
            // Animate header background
            gsap.to('.occasion-header-bg', {
                backgroundPosition: '100% 100%',
                duration: 20,
                repeat: -1,
                ease: 'none'
            });
            
            // Animate header icon
            gsap.to('.occasion-header-icon', {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
        },
        
        // Update progress indicator
        updateProgressIndicator: function() {
            $('.progress-step').each((index, el) => {
                const step = index + 1;
                if (step < this.currentStep) {
                    $(el).addClass('completed').removeClass('active');
                } else if (step === this.currentStep) {
                    $(el).addClass('active').removeClass('completed');
                } else {
                    $(el).removeClass('active completed');
                }
            });
            
            // Animate progress lines
            $('.progress-line').each((index, el) => {
                if (index < this.currentStep - 1) {
                    gsap.to(el, {
                        scaleX: 1,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                } else {
                    gsap.to(el, {
                        scaleX: 0,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                }
            });
        },
        
        // Update navigation buttons
        updateNavigationButtons: function() {
            const $btnPrevious = $('#btnPrevious');
            const $btnNext = $('#btnNext');
            const $btnSubmit = $('#btnSubmit');
            
            // Previous button
            if (this.currentStep === 1) {
                $btnPrevious.hide();
            } else {
                $btnPrevious.show();
            }
            
            // Next/Submit buttons
            if (this.currentStep === this.totalSteps) {
                $btnNext.hide();
                $btnSubmit.show();
            } else {
                $btnNext.show();
                $btnSubmit.hide();
            }
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Assembly type tabs
            $('.assembly-tabs button').on('shown.bs.tab.' + this.eventNamespace, function(e) {
                const newType = $(this).data('type');
                self.assemblyType = newType;
                self.currentStep = 1;
                self.loadStepContent();
                
                // Animate tab switch
                gsap.fromTo('.tab-pane.active',
                    { opacity: 0, x: -20 },
                    { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
                );
            });
            
            // Add Personal Details button
            $(document).on('click.' + this.eventNamespace, '#btnAddPersonalDetails', function() {
                $('#personalDetailsModal').modal('show');
            });
            
            // Save Personal Details
            $('#btnSavePersonalDetails').on('click.' + this.eventNamespace, function() {
                const nameChinese = $('#modalNameChinese').val().trim();
                const nameEnglish = $('#modalNameEnglish').val().trim();
                const nric = $('#modalNric').val().trim();
                const email = $('#modalEmail').val().trim();
                const contact = $('#modalContact').val().trim();
                
                if (!nameChinese || !nameEnglish || !nric || !email || !contact) {
                    TempleCore.showToast('Please fill all required fields', 'error');
                    return;
                }
                
                self.personalDetails = {
                    nameChinese,
                    nameEnglish,
                    nric,
                    email,
                    contact
                };
                
                $('#personalDetailsModal').modal('hide');
                self.loadStepContent();
                
                TempleCore.showToast('Personal details saved successfully!', 'success');
            });
            
            // Next button
            $('#btnNext').on('click.' + this.eventNamespace, function() {
                if (self.validateCurrentStep()) {
                    self.currentStep++;
                    self.loadStepContent();
                    
                    // Scroll to top
                    $('html, body').animate({ scrollTop: 0 }, 300);
                }
            });
            
            // Previous button
            $('#btnPrevious').on('click.' + this.eventNamespace, function() {
                self.currentStep--;
                self.loadStepContent();
                
                // Scroll to top
                $('html, body').animate({ scrollTop: 0 }, 300);
            });
            
            // Dedicatees checkboxes (show/hide individual name fields)
            $(document).on('change.' + this.eventNamespace, '.dedicatee-checkbox', function() {
                const checkboxId = $(this).attr('id');
                const nameField = $('#' + checkboxId + '_name_field');
                
                if ($(this).is(':checked')) {
                    nameField.slideDown(300);
                    
                    // Animate the field appearance
                    gsap.fromTo(nameField.find('input'), 
                        { opacity: 0, x: -10 },
                        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
                    );
                } else {
                    nameField.slideUp(300);
                    // Clear the field when unchecked
                    nameField.find('input').val('');
                }
            });
            
            // Free will meal option (show/hide amount field)
            $(document).on('change.' + this.eventNamespace, 'input[name="meal_option"]', function() {
                const value = $(this).val();
                if (value === 'free_will_meal') {
                    $('#freeWillAmountField').slideDown();
                } else {
                    $('#freeWillAmountField').slideUp();
                }
            });
            
            // Form submission
            $('#occasionForm').on('submit.' + this.eventNamespace, function(e) {
                e.preventDefault();
                
                if (self.validateCurrentStep()) {
                    self.submitForm();
                }
            });
            
            // Cancel button
            $('#btnCancel').on('click.' + this.eventNamespace, function() {
				self.cleanup();
                TempleRouter.navigate('dharma-assembly');
            });
            
            // Radio card selection animation
            $(document).on('change.' + this.eventNamespace, 'input[type="radio"]', function() {
                const $parent = $(this).closest('.form-check-card');
                const $siblings = $parent.siblings('.form-check-card');
                
                // Animate selected card
                gsap.to($parent[0], {
                    scale: 1.05,
                    boxShadow: '0 8px 20px rgba(255, 0, 255, 0.2)',
                    borderColor: '#ff00ff',
                    duration: 0.3,
                    ease: 'power2.out'
                });
                
                // Reset siblings
                $siblings.each(function() {
                    gsap.to(this, {
                        scale: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        borderColor: '#dee2e6',
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });
            
            // Input focus animations
            $('.modal').on('shown.bs.modal.' + this.eventNamespace, function() {
                $(this).find('.form-control').on('focus.' + this.eventNamespace, function() {
                    gsap.to($(this), {
                        scale: 1.02,
                        duration: 0.2,
                        ease: 'power1.out'
                    });
                }).on('blur.' + this.eventNamespace, function() {
                    gsap.to($(this), {
                        scale: 1,
                        duration: 0.2
                    });
                });
            });
        },
        
        // Validate current step
        validateCurrentStep: function() {
            if (this.currentStep === 1) {
                if (!this.personalDetails) {
                    TempleCore.showToast('Please add your personal details', 'error');
                    return false;
                }
            } else if (this.currentStep === 2) {
                // Validate occasion options based on assembly type
                let valid = false;
                
                if (this.assemblyType === 'longevity') {
                    valid = $('input[name="longevity_option"]:checked').length > 0;
                } else if (this.assemblyType === 'departed') {
                    const optionChecked = $('input[name="departed_option"]:checked').length > 0;
                    const dedicateesChecked = $('input[name="dedicatees[]"]:checked').length > 0;

                    
                    if (!optionChecked) {
                        TempleCore.showToast('Please select an option', 'error');
                        return false;
                    }
                    
                    if (!dedicateesChecked) {
                        TempleCore.showToast('Please select at least one dedicatee', 'error');
                        return false;
                    }
                    
                    let allNamesEntered = true;
                    let missingDedicatee = '';
                    
                    $('input[name="dedicatees[]"]:checked').each(function() {
                        const dedicateeValue = $(this).val();
                        const dedicateeName = $('input[name="departed_name_' + dedicateeValue + '"]').val().trim();
                        
                        if (!dedicateeName) {
                            allNamesEntered = false;
                            missingDedicatee = $(this).next('label').text().trim();
                            return false; // Break the loop
                        }
                    });
                    
                    if (!allNamesEntered) {
                        TempleCore.showToast('Please enter name for: ' + missingDedicatee, 'error');
                        return false;
                    }
                    
                    valid = true;
                } else {
                    const mealOption = $('input[name="meal_option"]:checked').val();
                    
                    if (!mealOption) {
                        TempleCore.showToast('Please select a meal option', 'error');
                        return false;
                    }
                    
                    if (mealOption === 'free_will_meal') {
                        const amount = $('input[name="free_will_amount"]').val();
                        if (!amount || parseFloat(amount) <= 0) {
                            TempleCore.showToast('Please enter a valid amount', 'error');
                            return false;
                        }
                    }
                    
                    valid = true;
                }
                
                if (!valid) {
                    TempleCore.showToast('Please select an option', 'error');
                    return false;
                }
            } else if (this.currentStep === 3) {
                const paymentMethod = $('input[name="payment_method[]"]:checked').length;
                if (paymentMethod === 0) {
                    TempleCore.showToast('Please select at least one payment method', 'error');
                    return false;
                }
            }
            
            return true;
        },
        
        // Submit form
        submitForm: function() {
            const formData = this.getFormData();
            
            // Show loading state
            const $submitBtn = $('#btnSubmit');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Processing...');
            
            // Simulate API call (replace with actual API)
            setTimeout(() => {
                console.log('Special Occasion Data:', formData);
                
                // Success animation
                gsap.to('.occasion-form-card', {
                    scale: 1.02,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut'
                });
                
                // Show success message
                TempleCore.showToast('Dharma Assembly registration successful!', 'success');
                
                // Navigate back
                setTimeout(() => {
					self.cleanup();
                    TempleRouter.navigate('dharma-assembly');
                }, 1500);
            }, 1500);
        },
        
        // Get form data
        getFormData: function() {
            const formData = {
                assembly_type: this.assemblyType,
                personal_details: this.personalDetails,
                payment_methods: [],
                remarks: $('textarea[name="remarks"]').val()
            };
            
            // Get selected payment methods
            $('input[name="payment_method[]"]:checked').each(function() {
                formData.payment_methods.push($(this).val());
            });
            
            // Get assembly-specific data
            if (this.assemblyType === 'longevity') {
                formData.option = $('input[name="longevity_option"]:checked').val();
            } else if (this.assemblyType === 'departed') {
                formData.option = $('input[name="departed_option"]:checked').val();
                formData.dedicatees = [];
                
                // Collect each dedicatee with their individual name
                $('input[name="dedicatees[]"]:checked').each(function() {
                    const dedicateeValue = $(this).val();
                    const dedicateeId = $(this).attr('id');
                    const departedName = $('input[name="departed_name_' + dedicateeValue + '"]').val();
                    
                    formData.dedicatees.push({
                        type: dedicateeValue,
                        name: departedName || ''
                    });
                });
            } else {
                formData.meal_option = $('input[name="meal_option"]:checked').val();
                
                if (formData.meal_option === 'free_will_meal') {
                    formData.free_will_amount = $('input[name="free_will_amount"]').val();
                }
                
                formData.wisdom_light = $('input[name="wisdom_light"]:checked').val();
                formData.devas_offering = $('input[name="devas_offering"]:checked').val();
            }
            
            return formData;
        }
    };
    
})(jQuery, window);