// frontend/js/pages/members/application-form.js
// Member Application Form - Interactive Multi-Step Form with GSAP + AOS

(function($, window) {
    'use strict';
    
    window.MembersApplicationFormPage = {
        currentUser: null,
        currentStep: 1,
        totalSteps: 5,
        formData: {},
        memberTypes: [],
        countries: [],
        applicationId: null,
        isEditMode: false,
        
        // Initialize page
        init: function(params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.applicationId = params?.id || null;
            this.isEditMode = !!this.applicationId;
            
            this.render();
            this.bindEvents();
            this.loadInitialData();
            this.initAnimations();
        },
        
        // Initialize GSAP & AOS animations
        initAnimations: function() {
            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 600,
                    easing: 'ease-in-out',
                    once: false
                });
            }
            
            // GSAP: Animate page header
            gsap.from('.page-header', {
                duration: 0.6,
                y: -30,
                opacity: 0,
                ease: 'power2.out'
            });
            
            // GSAP: Animate progress bar
            gsap.from('.progress-container', {
                duration: 0.8,
                scale: 0.9,
                opacity: 0,
                ease: 'back.out(1.7)',
                delay: 0.2
            });
            
            // GSAP: Animate first step
            gsap.from('#step1', {
                duration: 0.6,
                x: 50,
                opacity: 0,
                ease: 'power2.out',
                delay: 0.4
            });
        },
        
        // Render page HTML
        render: function() {
            const title = this.isEditMode ? 'Edit Application' : 'New Member Application';
            
            const html = `
                <div class="application-form-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-file-earmark-person"></i> ${title}
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members/application'); return false;">Applications</a></li>
                                        <li class="breadcrumb-item active">${title}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-secondary" onclick="TempleRouter.navigate('members/application')">
                                    <i class="bi bi-arrow-left"></i> Back to Applications
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Progress Indicator -->
                    <div class="progress-container card border-0 shadow-sm mb-4" data-aos="fade-down">
                        <div class="card-body">
                            <div class="row">
                                ${this.getProgressStepsHTML()}
                            </div>
                            <div class="progress mt-3" style="height: 8px;">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                     id="progressBar" 
                                     role="progressbar" 
                                     style="width: 20%">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Form Container -->
                    <div class="row justify-content-center">
                        <div class="col-lg-10">
                            <form id="applicationForm" novalidate>
                                
                                <!-- Step 1: Personal Information -->
                                <div class="form-step" id="step1" style="display: block;">
                                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                                        <div class="card-body p-4">
                                            <h4 class="mb-4">
                                                <i class="bi bi-person-circle"></i> Personal Information
                                            </h4>
                                            
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Full Name <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" id="name" name="name" required>
                                                    <div class="invalid-feedback">Please enter your full name</div>
                                                </div>
                                                
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Email <span class="text-danger">*</span></label>
                                                    <input type="email" class="form-control" id="email" name="email" required>
                                                    <div class="invalid-feedback">Please enter a valid email</div>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">Mobile Code</label>
                                                    <select class="form-select" id="mobile_code" name="mobile_code">
                                                        <option value="+60">+60 (Malaysia)</option>
                                                        <option value="+65">+65 (Singapore)</option>
                                                        <option value="+86">+86 (China)</option>
                                                        <option value="+91">+91 (India)</option>
                                                        <option value="+1">+1 (USA/Canada)</option>
                                                        <option value="+44">+44 (UK)</option>
                                                    </select>
                                                </div>
                                                
                                                <div class="col-md-5 mb-3">
                                                    <label class="form-label">Mobile Number <span class="text-danger">*</span></label>
                                                    <input type="tel" class="form-control" id="mobile_no" name="mobile_no" required>
                                                    <div class="invalid-feedback">Please enter mobile number</div>
                                                </div>
                                                
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Alternate Mobile</label>
                                                    <input type="tel" class="form-control" id="alternate_mobile" name="alternate_mobile">
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Date of Birth</label>
                                                    <input type="date" class="form-control" id="date_of_birth" name="date_of_birth">
                                                </div>
                                                
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Gender</label>
                                                    <select class="form-select" id="gender" name="gender">
                                                        <option value="">Select Gender</option>
                                                        <option value="MALE">Male</option>
                                                        <option value="FEMALE">Female</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Member Type</label>
                                                    <select class="form-select" id="member_type_id" name="member_type_id">
                                                        <option value="">Select Type</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-12 mb-3">
                                                    <label class="form-label">Address</label>
                                                    <textarea class="form-control" id="address" name="address" rows="2"></textarea>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">City</label>
                                                    <input type="text" class="form-control" id="city" name="city">
                                                </div>
                                                
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">State</label>
                                                    <input type="text" class="form-control" id="state" name="state">
                                                </div>
                                                
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">Country</label>
                                                    <select class="form-select" id="country" name="country">
                                                        <option value="">Select Country</option>
                                                    </select>
                                                </div>
                                                
                                                <div class="col-md-3 mb-3">
                                                    <label class="form-label">Pincode</label>
                                                    <input type="text" class="form-control" id="pincode" name="pincode">
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Occupation</label>
                                                    <input type="text" class="form-control" id="occupation" name="occupation">
                                                </div>
                                                
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Qualification</label>
                                                    <input type="text" class="form-control" id="qualification" name="qualification">
                                                </div>
                                                
                                                <div class="col-md-4 mb-3">
                                                    <label class="form-label">Annual Income</label>
                                                    <select class="form-select" id="annual_income" name="annual_income">
                                                        <option value="">Select Range</option>
                                                        <option value="Below RM 30,000">Below RM 30,000</option>
                                                        <option value="RM 30,000 - RM 50,000">RM 30,000 - RM 50,000</option>
                                                        <option value="RM 50,000 - RM 100,000">RM 50,000 - RM 100,000</option>
                                                        <option value="Above RM 100,000">Above RM 100,000</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 2: Referral Information -->
                                <div class="form-step" id="step2" style="display: none;">
                                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                                        <div class="card-body p-4">
                                            <h4 class="mb-3">
                                                <i class="bi bi-people"></i> Referral Information
                                            </h4>
                                            <div class="alert alert-info">
                                                <i class="bi bi-info-circle"></i> 
                                                <strong>Required:</strong> You must provide 2 active members as referrals.
                                            </div>
                                            
                                            <!-- Referral 1 -->
                                            <div class="referral-section mb-4 p-3 border rounded">
                                                <h5 class="mb-3">
                                                    <i class="bi bi-person-check"></i> Referral 1 
                                                    <span class="text-danger">*</span>
                                                </h5>
                                                
                                                <div class="row">
                                                    <div class="col-md-6 mb-3">
                                                        <label class="form-label">Full Name <span class="text-danger">*</span></label>
                                                        <input type="text" class="form-control" id="referral_1_name" name="referral_1_name" required>
                                                        <div class="invalid-feedback">Please enter referral name</div>
                                                    </div>
                                                    
                                                    <div class="col-md-6 mb-3">
                                                        <label class="form-label">
                                                            Member ID / IC Number <span class="text-danger">*</span>
                                                        </label>
                                                        <div class="input-group">
                                                            <input type="text" 
                                                                   class="form-control" 
                                                                   id="referral_1_member_id" 
                                                                   name="referral_1_member_id" 
                                                                   required>
                                                            <button class="btn btn-outline-primary" 
                                                                    type="button" 
                                                                    id="validateReferral1Btn">
                                                                <i class="bi bi-search"></i> Validate
                                                            </button>
                                                        </div>
                                                        <div class="invalid-feedback">Please enter member ID or IC</div>
                                                        <div id="referral1ValidationMsg" class="mt-2"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Referral 2 -->
                                            <div class="referral-section p-3 border rounded">
                                                <h5 class="mb-3">
                                                    <i class="bi bi-person-check"></i> Referral 2 
                                                    <span class="text-danger">*</span>
                                                </h5>
                                                
                                                <div class="row">
                                                    <div class="col-md-6 mb-3">
                                                        <label class="form-label">Full Name <span class="text-danger">*</span></label>
                                                        <input type="text" class="form-control" id="referral_2_name" name="referral_2_name" required>
                                                        <div class="invalid-feedback">Please enter referral name</div>
                                                    </div>
                                                    
                                                    <div class="col-md-6 mb-3">
                                                        <label class="form-label">
                                                            Member ID / IC Number <span class="text-danger">*</span>
                                                        </label>
                                                        <div class="input-group">
                                                            <input type="text" 
                                                                   class="form-control" 
                                                                   id="referral_2_member_id" 
                                                                   name="referral_2_member_id" 
                                                                   required>
                                                            <button class="btn btn-outline-primary" 
                                                                    type="button" 
                                                                    id="validateReferral2Btn">
                                                                <i class="bi bi-search"></i> Validate
                                                            </button>
                                                        </div>
                                                        <div class="invalid-feedback">Please enter member ID or IC</div>
                                                        <div id="referral2ValidationMsg" class="mt-2"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 3: ID Proof & Documents -->
                                <div class="form-step" id="step3" style="display: none;">
                                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                                        <div class="card-body p-4">
                                            <h4 class="mb-3">
                                                <i class="bi bi-file-earmark-text"></i> Documents Upload
                                            </h4>
                                            <div class="alert alert-warning">
                                                <i class="bi bi-exclamation-triangle"></i> 
                                                Please upload clear copies of your documents.
                                            </div>
                                            
                                            <!-- ID Proof Type -->
                                            <div class="row mb-4">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">ID Proof Type <span class="text-danger">*</span></label>
                                                    <select class="form-select" id="id_proof_type" name="id_proof_type" required>
                                                        <option value="">Select Type</option>
                                                        <option value="IC">IC (Identity Card)</option>
                                                        <option value="Passport">Passport</option>
                                                        <option value="Driving License">Driving License</option>
                                                    </select>
                                                    <div class="invalid-feedback">Please select ID proof type</div>
                                                </div>
                                                
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">ID Proof Number <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" id="id_proof_number" name="id_proof_number" required>
                                                    <div class="invalid-feedback">Please enter ID proof number</div>
                                                </div>
                                            </div>
                                            
                                            <!-- IC Copy Upload -->
                                            <div class="upload-section mb-4 p-3 border rounded">
                                                <h5 class="mb-3">
                                                    <i class="bi bi-card-image"></i> IC Copy <span class="text-danger">*</span>
                                                </h5>
                                                <div class="row">
                                                    <div class="col-md-8">
                                                        <input type="file" 
                                                               class="form-control" 
                                                               id="id_proof_document" 
                                                               name="id_proof_document" 
                                                               accept="image/*,application/pdf"
                                                               required>
                                                        <div class="form-text">Accepted: JPG, PNG, PDF (Max 5MB)</div>
                                                        <div class="invalid-feedback">Please upload ID proof document</div>
                                                    </div>
                                                    <div class="col-md-4">
                                                        <div id="icPreview" class="document-preview"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Photo Upload -->
                                            <div class="upload-section p-3 border rounded">
                                                <h5 class="mb-3">
                                                    <i class="bi bi-person-badge"></i> Passport Photo <span class="text-danger">*</span>
                                                </h5>
                                                <div class="row">
                                                    <div class="col-md-8">
                                                        <input type="file" 
                                                               class="form-control" 
                                                               id="profile_photo" 
                                                               name="profile_photo" 
                                                               accept="image/*"
                                                               required>
                                                        <div class="form-text">Passport-sized photo (JPG, PNG - Max 2MB)</div>
                                                        <div class="invalid-feedback">Please upload your photo</div>
                                                    </div>
                                                    <div class="col-md-4">
                                                        <div id="photoPreview" class="photo-preview"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 4: Payment Information -->
                                <div class="form-step" id="step4" style="display: none;">
                                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                                        <div class="card-body p-4">
                                            <h4 class="mb-3">
                                                <i class="bi bi-credit-card"></i> Application Entry Fee
                                            </h4>
                                            
                                            <div class="alert alert-success mb-4">
                                                <div class="d-flex align-items-center">
                                                    <i class="bi bi-info-circle fs-4 me-3"></i>
                                                    <div>
                                                        <strong>Entry Fee: RM 51.00</strong>
                                                        <p class="mb-0 small">This is a one-time application processing fee.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Payment Method <span class="text-danger">*</span></label>
                                                    <select class="form-select" id="payment_method" name="payment_method" required>
                                                        <option value="">Select Method</option>
                                                        <option value="Cash">Cash</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                        <option value="Online Banking">Online Banking</option>
                                                        <option value="Credit/Debit Card">Credit/Debit Card</option>
                                                    </select>
                                                    <div class="invalid-feedback">Please select payment method</div>
                                                </div>
                                                
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Payment Date <span class="text-danger">*</span></label>
                                                    <input type="date" class="form-control" id="payment_date" name="payment_date" required>
                                                    <div class="invalid-feedback">Please select payment date</div>
                                                </div>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-12 mb-3">
                                                    <label class="form-label">Payment Reference / Transaction ID <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" id="payment_reference" name="payment_reference" required>
                                                    <div class="form-text">Enter receipt number, transaction ID, or reference number</div>
                                                    <div class="invalid-feedback">Please enter payment reference</div>
                                                </div>
                                            </div>
                                            
                                            <!-- Payment Confirmation -->
                                            <div class="form-check mt-3">
                                                <input class="form-check-input" type="checkbox" id="paymentConfirm" required>
                                                <label class="form-check-label" for="paymentConfirm">
                                                    I confirm that I have paid the application entry fee of <strong>RM 51.00</strong>
                                                </label>
                                                <div class="invalid-feedback">Please confirm payment</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 5: Review & Submit -->
                                <div class="form-step" id="step5" style="display: none;">
                                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                                        <div class="card-body p-4">
                                            <h4 class="mb-4">
                                                <i class="bi bi-check-circle"></i> Review & Submit
                                            </h4>
                                            
                                            <div id="reviewContent">
                                                <!-- Review content will be dynamically generated -->
                                            </div>
                                            
                                            <div class="alert alert-info mt-4">
                                                <i class="bi bi-info-circle"></i> 
                                                By submitting this application, you agree that all information provided is accurate and complete.
                                            </div>
                                            
                                            <div class="form-check mt-3">
                                                <input class="form-check-input" type="checkbox" id="finalConfirm" required>
                                                <label class="form-check-label" for="finalConfirm">
                                                    I confirm that all information provided is accurate and I agree to the terms and conditions.
                                                </label>
                                                <div class="invalid-feedback">Please confirm to proceed</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Navigation Buttons -->
                                <div class="card border-0 shadow-sm mt-4" data-aos="fade-up">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <button type="button" class="btn btn-secondary" id="prevBtn" style="display: none;">
                                                <i class="bi bi-arrow-left"></i> Previous
                                            </button>
                                            <div></div>
                                            <div class="d-flex gap-2">
                                                <button type="button" class="btn btn-outline-secondary" id="saveDraftBtn">
                                                    <i class="bi bi-save"></i> Save as Draft
                                                </button>
                                                <button type="button" class="btn btn-primary" id="nextBtn">
                                                    Next <i class="bi bi-arrow-right"></i>
                                                </button>
                                                <button type="submit" class="btn btn-success" id="submitBtn" style="display: none;">
                                                    <i class="bi bi-check-circle"></i> Submit Application
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Custom Styles -->
                <style>
                    .form-step {
                        animation: fadeIn 0.5s ease-in-out;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateX(20px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    
                    .progress-step {
                        text-align: center;
                        position: relative;
                    }
                    
                    .step-icon {
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        background: #e9ecef;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 10px;
                        font-size: 1.2rem;
                        transition: all 0.3s ease;
                        border: 3px solid #e9ecef;
                    }
                    
                    .progress-step.active .step-icon {
                        background: var(--bs-primary);
                        color: white;
                        border-color: var(--bs-primary);
                        transform: scale(1.1);
                    }
                    
                    .progress-step.completed .step-icon {
                        background: var(--bs-success);
                        color: white;
                        border-color: var(--bs-success);
                    }
                    
                    .step-title {
                        font-size: 0.85rem;
                        font-weight: 500;
                        color: #6c757d;
                    }
                    
                    .progress-step.active .step-title {
                        color: var(--bs-primary);
                        font-weight: 600;
                    }
                    
                    .referral-section {
                        background: #f8f9fa;
                        transition: all 0.3s ease;
                    }
                    
                    .referral-section:hover {
                        background: #e9ecef;
                    }
                    
                    .upload-section {
                        background: #f8f9fa;
                    }
                    
                    .document-preview, .photo-preview {
                        width: 100%;
                        min-height: 150px;
                        border: 2px dashed #dee2e6;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                        background: white;
                    }
                    
                    .document-preview img, .photo-preview img {
                        max-width: 100%;
                        max-height: 150px;
                        object-fit: cover;
                    }
                    
                    .validation-success {
                        color: var(--bs-success);
                        font-size: 0.9rem;
                    }
                    
                    .validation-error {
                        color: var(--bs-danger);
                        font-size: 0.9rem;
                    }
                    
                    .review-section {
                        background: #f8f9fa;
                        padding: 1rem;
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    }
                    
                    .review-section h6 {
                        color: var(--bs-primary);
                        margin-bottom: 0.75rem;
                    }
                    
                    .review-item {
                        display: flex;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #dee2e6;
                    }
                    
                    .review-item:last-child {
                        border-bottom: none;
                    }
                    
                    .review-label {
                        font-weight: 500;
                        width: 40%;
                        color: #6c757d;
                    }
                    
                    .review-value {
                        width: 60%;
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Get progress steps HTML
        getProgressStepsHTML: function() {
            const steps = [
                { number: 1, title: 'Personal Info', icon: 'bi-person' },
                { number: 2, title: 'Referrals', icon: 'bi-people' },
                { number: 3, title: 'Documents', icon: 'bi-file-earmark' },
                { number: 4, title: 'Payment', icon: 'bi-credit-card' },
                { number: 5, title: 'Review', icon: 'bi-check-circle' }
            ];
            
            let html = '';
            steps.forEach((step, index) => {
                const isActive = step.number === this.currentStep;
                const isCompleted = step.number < this.currentStep;
                
                html += `
                    <div class="col progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                        <div class="step-icon">
                            <i class="bi ${isCompleted ? 'bi-check-lg' : step.icon}"></i>
                        </div>
                        <div class="step-title">${step.title}</div>
                    </div>
                `;
            });
            
            return html;
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Navigation buttons
            $('#nextBtn').on('click', function() {
                self.nextStep();
            });
            
            $('#prevBtn').on('click', function() {
                self.prevStep();
            });
            
            // Form submission
            $('#applicationForm').on('submit', function(e) {
                e.preventDefault();
                self.submitApplication();
            });
            
            // Save draft
            $('#saveDraftBtn').on('click', function() {
                self.saveDraft();
            });
            
            // Referral validation
            $('#validateReferral1Btn').on('click', function() {
                self.validateReferral(1);
            });
            
            $('#validateReferral2Btn').on('click', function() {
                self.validateReferral(2);
            });
            
            // File previews
            $('#id_proof_document').on('change', function() {
                self.previewDocument(this, '#icPreview');
            });
            
            $('#profile_photo').on('change', function() {
                self.previewPhoto(this, '#photoPreview');
            });
            
            // Set default payment date to today
            const today = new Date().toISOString().split('T')[0];
            $('#payment_date').val(today);
        },
        
        // Load initial data
        loadInitialData: function() {
            this.loadMemberTypes();
            this.loadCountries();
            
            if (this.isEditMode) {
                this.loadApplicationData();
            }
        },
        
        // Load member types
        loadMemberTypes: function() {
            const self = this;
            
            TempleAPI.get('/member-types')
                .done(function(response) {
                    if (response.success) {
                        self.memberTypes = response.data;
                        
                        let options = '<option value="">Select Type</option>';
                        response.data.forEach(function(type) {
                            options += `<option value="${type.id}">${type.display_name}</option>`;
                        });
                        
                        $('#member_type_id').html(options);
                    }
                });
        },
        
        // Load countries
        loadCountries: function() {
            const countries = [
                'Malaysia', 'Singapore', 'China', 'Hong Kong', 'Taiwan',
                'India', 'Thailand', 'Indonesia', 'Philippines', 'Vietnam',
                'United States', 'United Kingdom', 'Australia', 'Canada'
            ];
            
            let options = '<option value="">Select Country</option>';
            countries.forEach(function(country) {
                options += `<option value="${country}">${country}</option>`;
            });
            
            $('#country').html(options);
            $('#country').val('Malaysia'); // Default
        },
        
        // Next step
        nextStep: function() {
            // Validate current step
            if (!this.validateStep(this.currentStep)) {
                return;
            }
            
            // Save current step data
            this.saveStepData(this.currentStep);
            
            // Move to next step
            this.currentStep++;
            this.showStep(this.currentStep);
            
            // Update progress
            this.updateProgress();
            
            // Animate step transition
            gsap.from(`#step${this.currentStep}`, {
                duration: 0.5,
                x: 50,
                opacity: 0,
                ease: 'power2.out'
            });
        },
        
        // Previous step
        prevStep: function() {
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgress();
            
            // Animate step transition
            gsap.from(`#step${this.currentStep}`, {
                duration: 0.5,
                x: -50,
                opacity: 0,
                ease: 'power2.out'
            });
        },
        
        // Show specific step
        showStep: function(step) {
            // Hide all steps
            $('.form-step').hide();
            
            // Show current step
            $(`#step${step}`).show();
            
            // Update buttons
            if (step === 1) {
                $('#prevBtn').hide();
            } else {
                $('#prevBtn').show();
            }
            
            if (step === this.totalSteps) {
                $('#nextBtn').hide();
                $('#submitBtn').show();
                this.generateReview();
            } else {
                $('#nextBtn').show();
                $('#submitBtn').hide();
            }
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        
        // Update progress bar and indicators
        updateProgress: function() {
            const progress = (this.currentStep / this.totalSteps) * 100;
            
            // Animate progress bar
            gsap.to('#progressBar', {
                duration: 0.5,
                width: `${progress}%`,
                ease: 'power2.out'
            });
            
            // Update step indicators
            $('.progress-step').each(function(index) {
                const stepNum = index + 1;
                $(this).removeClass('active completed');
                
                if (stepNum === this.currentStep) {
                    $(this).addClass('active');
                } else if (stepNum < this.currentStep) {
                    $(this).addClass('completed');
                }
            }.bind(this));
            
            // Animate active step icon
            gsap.from('.progress-step.active .step-icon', {
                duration: 0.5,
                scale: 0.8,
                ease: 'back.out(1.7)'
            });
        },
        
        // Validate step
        validateStep: function(step) {
            let isValid = true;
            const stepElement = $(`#step${step}`);
            
            // Get required fields in current step
            stepElement.find('input[required], select[required], textarea[required]').each(function() {
                if (!this.checkValidity()) {
                    isValid = false;
                    $(this).addClass('is-invalid');
                } else {
                    $(this).removeClass('is-invalid');
                }
            });
            
            // Step 2: Validate referrals
            if (step === 2) {
                const ref1Validated = $('#referral1ValidationMsg').hasClass('validation-success');
                const ref2Validated = $('#referral2ValidationMsg').hasClass('validation-success');
                
                if (!ref1Validated || !ref2Validated) {
                    TempleCore.showToast('Please validate both referrals before proceeding', 'warning');
                    isValid = false;
                }
            }
            
            // Step 3: Validate file uploads
            if (step === 3) {
                if (!$('#id_proof_document')[0].files.length && !this.formData.id_proof_document) {
                    $('#id_proof_document').addClass('is-invalid');
                    isValid = false;
                }
                
                if (!$('#profile_photo')[0].files.length && !this.formData.profile_photo) {
                    $('#profile_photo').addClass('is-invalid');
                    isValid = false;
                }
            }
            
            // Step 4: Validate payment confirmation
            if (step === 4) {
                if (!$('#paymentConfirm').is(':checked')) {
                    $('#paymentConfirm').addClass('is-invalid');
                    isValid = false;
                }
            }
            
            if (!isValid) {
                // Animate validation error
                gsap.fromTo('.is-invalid', 
                    { x: -10 },
                    { x: 0, duration: 0.1, repeat: 3, ease: 'power1.inOut' }
                );
                
                TempleCore.showToast('Please fill all required fields', 'warning');
            }
            
            return isValid;
        },
        
        // Save step data
        saveStepData: function(step) {
            const stepElement = $(`#step${step}`);
            
            stepElement.find('input, select, textarea').each(function() {
                const name = $(this).attr('name');
                if (name) {
                    if ($(this).attr('type') === 'checkbox') {
                        this.formData[name] = $(this).is(':checked');
                    } else if ($(this).attr('type') === 'file') {
                        if ($(this)[0].files.length > 0) {
                            this.formData[name] = $(this)[0].files[0];
                        }
                    } else {
                        this.formData[name] = $(this).val();
                    }
                }
            }.bind(this));
        },
        
        // Validate referral
        validateReferral: function(referralNum) {
            const self = this;
            const memberId = $(`#referral_${referralNum}_member_id`).val();
            const nameField = $(`#referral_${referralNum}_name`);
            const msgContainer = $(`#referral${referralNum}ValidationMsg`);
            const btn = $(`#validateReferral${referralNum}Btn`);
            
            if (!memberId) {
                TempleCore.showToast('Please enter Member ID or IC Number', 'warning');
                return;
            }
            
            // Show loading
            btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');
            msgContainer.html('');
            
            // Animate validation
            gsap.to(`#referral_${referralNum}_member_id`, {
                duration: 0.3,
                scale: 1.05,
                yoyo: true,
                repeat: 1
            });
            
            // Validate against API
            TempleAPI.get('/member-applications/validate-referral', { member_id: memberId })
                .done(function(response) {
                    if (response.success && response.data.valid) {
                        // Success animation
                        msgContainer.html(`
                            <div class="validation-success">
                                <i class="bi bi-check-circle-fill"></i> 
                                Verified: ${response.data.name}
                            </div>
                        `);
                        
                        nameField.val(response.data.name).prop('readonly', true);
                        
                        // Animate success
                        gsap.from(msgContainer, {
                            duration: 0.5,
                            scale: 0.8,
                            opacity: 0,
                            ease: 'back.out(1.7)'
                        });
                        
                        TempleCore.showToast('Referral validated successfully', 'success');
                    } else {
                        msgContainer.html(`
                            <div class="validation-error">
                                <i class="bi bi-x-circle-fill"></i> 
                                ${response.message || 'Invalid or inactive member'}
                            </div>
                        `);
                        
                        TempleCore.showToast('Referral validation failed', 'error');
                    }
                })
                .fail(function(xhr) {
                    msgContainer.html(`
                        <div class="validation-error">
                            <i class="bi bi-x-circle-fill"></i> 
                            Validation failed. Please try again.
                        </div>
                    `);
                    TempleCore.showToast('Validation failed', 'error');
                })
                .always(function() {
                    btn.prop('disabled', false).html('<i class="bi bi-search"></i> Validate');
                });
        },
        
        // Preview document
        previewDocument: function(input, container) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    if (file.type.includes('pdf')) {
                        $(container).html(`
                            <div class="text-center p-3">
                                <i class="bi bi-file-pdf fs-1 text-danger"></i>
                                <p class="small mt-2 mb-0">${file.name}</p>
                            </div>
                        `);
                    } else {
                        $(container).html(`<img src="${e.target.result}" alt="Document">`);
                    }
                    
                    // Animate preview
                    gsap.from(container, {
                        duration: 0.5,
                        scale: 0.8,
                        opacity: 0,
                        ease: 'back.out(1.7)'
                    });
                };
                
                reader.readAsDataURL(file);
            }
        },
        
        // Preview photo
        previewPhoto: function(input, container) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    $(container).html(`<img src="${e.target.result}" alt="Photo" style="border-radius: 8px;">`);
                    
                    // Animate preview
                    gsap.from(container, {
                        duration: 0.5,
                        scale: 0.8,
                        opacity: 0,
                        ease: 'back.out(1.7)'
                    });
                };
                
                reader.readAsDataURL(file);
            }
        },
        
        // Generate review content
        generateReview: function() {
            this.saveStepData(4); // Save payment step data
            
            const html = `
                <div class="review-section">
                    <h6><i class="bi bi-person-circle"></i> Personal Information</h6>
                    <div class="review-item">
                        <div class="review-label">Full Name:</div>
                        <div class="review-value">${this.formData.name || '-'}</div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Email:</div>
                        <div class="review-value">${this.formData.email || '-'}</div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Mobile:</div>
                        <div class="review-value">${this.formData.mobile_code || ''} ${this.formData.mobile_no || '-'}</div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Address:</div>
                        <div class="review-value">${this.formData.address || '-'}, ${this.formData.city || ''}, ${this.formData.state || ''}, ${this.formData.country || ''}</div>
                    </div>
                </div>
                
                <div class="review-section">
                    <h6><i class="bi bi-people"></i> Referral Information</h6>
                    <div class="review-item">
                        <div class="review-label">Referral 1:</div>
                        <div class="review-value">
                            ${this.formData.referral_1_name || '-'} 
                            <small class="text-muted">(${this.formData.referral_1_member_id || '-'})</small>
                        </div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Referral 2:</div>
                        <div class="review-value">
                            ${this.formData.referral_2_name || '-'} 
                            <small class="text-muted">(${this.formData.referral_2_member_id || '-'})</small>
                        </div>
                    </div>
                </div>
                
                <div class="review-section">
                    <h6><i class="bi bi-file-earmark-text"></i> Documents</h6>
                    <div class="review-item">
                        <div class="review-label">ID Proof:</div>
                        <div class="review-value">${this.formData.id_proof_type || '-'} (${this.formData.id_proof_number || '-'})</div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Documents:</div>
                        <div class="review-value">
                            ${this.formData.id_proof_document ? '<i class="bi bi-check-circle text-success"></i> IC Copy' : ''} 
                            ${this.formData.profile_photo ? '<i class="bi bi-check-circle text-success"></i> Photo' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="review-section">
                    <h6><i class="bi bi-credit-card"></i> Payment Information</h6>
                    <div class="review-item">
                        <div class="review-label">Entry Fee:</div>
                        <div class="review-value"><strong>RM 51.00</strong></div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Payment Method:</div>
                        <div class="review-value">${this.formData.payment_method || '-'}</div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Reference:</div>
                        <div class="review-value">${this.formData.payment_reference || '-'}</div>
                    </div>
                    <div class="review-item">
                        <div class="review-label">Date:</div>
                        <div class="review-value">${this.formData.payment_date || '-'}</div>
                    </div>
                </div>
            `;
            
            $('#reviewContent').html(html);
            
            // Animate review sections
            gsap.from('.review-section', {
                duration: 0.5,
                y: 20,
                opacity: 0,
                stagger: 0.1,
                ease: 'power2.out'
            });
        },
        
        // Submit application
        submitApplication: function() {
            const self = this;
            
            // Validate final confirmation
            if (!$('#finalConfirm').is(':checked')) {
                $('#finalConfirm').addClass('is-invalid');
                TempleCore.showToast('Please confirm to proceed', 'warning');
                return;
            }
            
            // Prepare form data for submission
            const formData = new FormData();
            
            // Add all text fields
            Object.keys(this.formData).forEach(function(key) {
                if (self.formData[key] !== null && self.formData[key] !== undefined) {
                    if (self.formData[key] instanceof File) {
                        formData.append(key, self.formData[key]);
                    } else {
                        formData.append(key, self.formData[key]);
                    }
                }
            });
            
            // Set entry fee and payment status
            formData.append('entry_fee_amount', '51.00');
            formData.append('entry_fee_paid', 'true');
            formData.append('status', 'SUBMITTED');
            
            TempleCore.showLoading(true);
            
            // Animate submit button
            gsap.to('#submitBtn', {
                duration: 0.3,
                scale: 0.95
            });
            
            const endpoint = this.isEditMode 
                ? '/member-applications/' + this.applicationId 
                : '/member-applications';
            
            const method = this.isEditMode ? 'put' : 'post';
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + endpoint,
                method: this.isEditMode ? 'POST' : 'POST', // Laravel handles _method for PUT
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'X-Temple-ID': TempleAPI.getTempleId()
                },
                success: function(response) {
                    if (response.success) {
                        // Success animation
                        gsap.to('.application-form-page', {
                            duration: 0.5,
                            scale: 0.95,
                            opacity: 0,
                            onComplete: function() {
                                TempleCore.showToast(
                                    'Application submitted successfully! Temporary ID: ' + response.data.temp_member_id,
                                    'success'
                                );
                                
                                setTimeout(function() {
                                    TempleRouter.navigate('members/application');
                                }, 1500);
                            }
                        });
                    }
                },
                error: function(xhr) {
                    TempleCore.showToast('Failed to submit application', 'error');
                    console.error('Submission error:', xhr);
                },
                complete: function() {
                    TempleCore.showLoading(false);
                }
            });
        },
        
        // Save as draft
        saveDraft: function() {
            const self = this;
            
            // Save current step data
            this.saveStepData(this.currentStep);
            
            // Prepare data
            const formData = new FormData();
            Object.keys(this.formData).forEach(function(key) {
                if (self.formData[key] !== null && self.formData[key] !== undefined) {
                    if (self.formData[key] instanceof File) {
                        formData.append(key, self.formData[key]);
                    } else {
                        formData.append(key, self.formData[key]);
                    }
                }
            });
            
            formData.append('status', 'PENDING_SUBMISSION');
            
            TempleCore.showLoading(true);
            
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/member-applications',
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'X-Temple-ID': TempleAPI.getTempleId()
                },
                success: function(response) {
                    if (response.success) {
                        TempleCore.showToast('Draft saved successfully', 'success');
                        self.applicationId = response.data.id;
                        self.isEditMode = true;
                    }
                },
                error: function(xhr) {
                    TempleCore.showToast('Failed to save draft', 'error');
                },
                complete: function() {
                    TempleCore.showLoading(false);
                }
            });
        },
        
        // Load application data (for edit mode)
        loadApplicationData: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/member-applications/' + this.applicationId)
                .done(function(response) {
                    if (response.success) {
                        const data = response.data;
                        
                        // Populate form fields
                        Object.keys(data).forEach(function(key) {
                            const field = $(`#${key}`);
                            if (field.length) {
                                field.val(data[key]);
                            }
                        });
                        
                        self.formData = data;
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast('Failed to load application data', 'error');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        }
    };
    
})(jQuery, window);