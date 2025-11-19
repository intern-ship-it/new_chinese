// js/pages/members/create.js
// Create/Edit Member Page using jQuery

(function($, window) {
    'use strict';
    
    window.MembersCreatePage = {
        memberId: null,
        isEditMode: false,
        memberData: null,
        memberTypes: [],
        availableMembers: [],
        currentUser: null,
        
        // Initialize page
        init: function(params) {
            // Check if it's edit mode
            if (params && params.id) {
                this.memberId = params.id;
                this.isEditMode = true;
            }
            
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            
            // Check permissions
            if (this.isEditMode && !this.hasPermission('edit_members')) {
                TempleCore.showToast('You do not have permission to edit members', 'danger');
                TempleRouter.navigate('members');
                return;
            }
            
            if (!this.isEditMode && !this.hasPermission('create_members')) {
                TempleCore.showToast('You do not have permission to create members', 'danger');
                TempleRouter.navigate('members');
                return;
            }
            
            this.render();
            this.bindEvents();
            this.loadInitialData();
        },
        
        // Render page HTML
        render: function() {
            const title = this.isEditMode ? 'Edit Member' : 'Add New Member';
            
            const html = `
                <div class="member-form-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-${this.isEditMode ? 'pencil' : 'person-plus'}"></i> ${title}
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
                                        <li class="breadcrumb-item active">${title}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-secondary" onclick="TempleRouter.navigate('members')">
                                    <i class="bi bi-arrow-left"></i> Back to Members
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Form Container -->
                    <div class="row">
                        <div class="col-lg-12">
                            <form id="memberForm" novalidate>
                                <!-- Personal Information -->
                                <div class="form-card mb-4">
                                    <h5 class="mb-4">
                                        <i class="bi bi-person"></i> Personal Information
                                        <span class="text-danger small">* Required Fields</span>
                                    </h5>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Full Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="name" name="name" required>
                                            <div class="invalid-feedback">Please enter member's full name</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Username <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="username" name="username" required ${this.isEditMode ? 'readonly' : ''}>
                                                ${!this.isEditMode ? `
                                                    <button class="btn btn-outline-secondary" type="button" id="generateUsernameBtn">
                                                        <i class="bi bi-arrow-repeat"></i> Generate
                                                    </button>
                                                ` : ''}
                                            </div>
                                            <div class="invalid-feedback">Please enter a unique username</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Email Address <span class="text-danger">*</span></label>
                                            <input type="email" class="form-control" id="email" name="email" required>
                                            <div class="invalid-feedback">Please enter a valid email address</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Password ${!this.isEditMode ? '<span class="text-danger">*</span>' : ''}</label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" id="password" name="password" ${!this.isEditMode ? 'required' : ''}>
                                                <button class="btn btn-outline-secondary password-toggle" type="button" data-target="password">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                ${!this.isEditMode ? `
                                                    <button class="btn btn-outline-secondary" type="button" id="generatePasswordBtn">
                                                    <i class="bi bi-key"></i> Generate
                                                </button>
                                                ` : ''}
                                            </div>
                                            <div class="form-text">${this.isEditMode ? 'Leave blank to keep current password' : 'Minimum 8 characters'}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-3 mb-3">
                                            <label class="form-label">Mobile Code</label>
                                            <select class="form-select" id="mobile_code" name="mobile_code">
                                                <!-- Will be populated dynamically -->
                                            </select>
                                        </div>
                                        
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Mobile Number <span class="text-danger">*</span></label>
                                            <input type="tel" class="form-control" id="mobile_no" name="mobile_no" required>
                                            <div class="invalid-feedback">Please enter mobile number</div>
                                        </div>
                                        
                                        <div class="col-md-5 mb-3">
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
                                            <label class="form-label">ID Proof Type</label>
                                            <select class="form-select" id="id_proof_type" name="id_proof_type">
                                                <option value="">Select ID Type</option>
                                                <option value="PAN_CARD">PAN Card</option>
                                                <option value="PASSPORT">Passport</option>
                                                <option value="DRIVING_LICENSE">Driving License</option>
                                                <option value="AADHAAR">Aadhaar Card</option>
                                                <option value="VOTER_ID">Voter ID</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">ID Proof Number</label>
                                            <input type="text" class="form-control" id="id_proof_number" name="id_proof_number">
                                        </div>
                                        
                                        <div class="col-md-4 mb-3" id="otherIdProofDiv" style="display: none;">
                                            <label class="form-label">Specify ID Type</label>
                                            <input type="text" class="form-control" id="other_id_proof" name="other_id_proof" placeholder="Enter ID type">
                                        </div>
                                        
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Occupation</label>
                                            <input type="text" class="form-control" id="occupation" name="occupation">
                                        </div>
                                        
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Qualification</label>
                                            <input type="text" class="form-control" id="qualification" name="qualification">
                                        </div>
                                    </div>
                                </div>

                                <!-- Address Information -->
                                <div class="form-card mb-4">
                                    <h5 class="mb-4"><i class="bi bi-geo-alt"></i> Address Information</h5>
                                    
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
                                                <!-- Will be populated dynamically -->
                                            </select>
                                        </div>
                                        
                                        <div class="col-md-3 mb-3">
                                            <label class="form-label">Pincode</label>
                                            <input type="text" class="form-control" id="pincode" name="pincode">
                                        </div>
                                    </div>
                                </div>

                                <!-- Membership Information -->
                                <div class="form-card mb-4">
                                    <h5 class="mb-4"><i class="bi bi-card-list"></i> Membership Information</h5>
                                    
                                    <div class="row">
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Member Type</label>
                                            <select class="form-select" id="member_type_id" name="member_type_id">
                                                <option value="">Select Member Type</option>
                                            </select>
                                            <div id="memberTypeInfo" class="form-text"></div>
                                        </div>
                                        
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Membership Date</label>
                                            <input type="date" class="form-control" id="membership_date" name="membership_date">
                                        </div>
                                        
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Annual Income</label>
                                            <select class="form-select" id="annual_income" name="annual_income">
                                                <option value="">Select Income Range</option>
                                                <option value="Below 1 Lakh">Below ₹1 Lakh</option>
                                                <option value="1-3 Lakhs">₹1-3 Lakhs</option>
                                                <option value="3-5 Lakhs">₹3-5 Lakhs</option>
                                                <option value="5-10 Lakhs">₹5-10 Lakhs</option>
                                                <option value="10-20 Lakhs">₹10-20 Lakhs</option>
                                                <option value="Above 20 Lakhs">Above ₹20 Lakhs</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Referred By</label>
                                            <select class="form-select" id="referred_by" name="referred_by">
                                                <option value="">None</option>
                                            </select>
                                            <div class="form-text">Select the member who referred this person</div>
                                        </div>
                                        
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Family Head</label>
                                            <select class="form-select" id="family_head_id" name="family_head_id">
                                                <option value="">None (Independent Member)</option>
                                            </select>
                                            <div class="form-text">Select if this member belongs to a family</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Payment Information (for paid memberships) -->
                                    <div id="paymentSection" style="display: none;">
                                        <hr>
                                        <h6 class="mb-3">Payment Information</h6>
                                        <div class="alert alert-info">
                                            <i class="bi bi-info-circle"></i> This is a paid membership type. 
                                            Amount: <strong id="subscriptionAmount">₹0</strong> 
                                            <span id="subscriptionPeriod"></span>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Payment Reference</label>
                                                <input type="text" class="form-control" id="payment_reference" name="payment_reference">
                                                <div class="form-text">Transaction ID or check number</div>
                                            </div>
                                            
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Payment Date</label>
                                                <input type="date" class="form-control" id="payment_date" name="payment_date">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Signature Section -->
                                <div class="form-card mb-4" id="signatureContainer">
                                    <!-- Signature component will be inserted here -->
                                </div>

                                <!-- Form Actions -->
                                <div class="form-card">
                                    <div class="row">
                                        <div class="col-md-12">
                                            <button type="submit" class="btn btn-primary" id="submitBtn">
                                                <i class="bi bi-check-circle"></i> ${this.isEditMode ? 'Update Member' : 'Create Member'}
                                            </button>
                                            <button type="button" class="btn btn-secondary ms-2" onclick="TempleRouter.navigate('members')">
                                                <i class="bi bi-x-circle"></i> Cancel
                                            </button>
                                            ${!this.isEditMode ? `
                                                <button type="button" class="btn btn-outline-primary ms-2" id="saveAndNewBtn">
                                                    <i class="bi bi-plus-circle"></i> Save & Add Another
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <style>
                    ${this.getPageStyles()}
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Get page styles
        getPageStyles: function() {
            return `
                .member-form-page {
                    padding: 20px 0;
                }

                .page-header {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                }

                .breadcrumb {
                    background: none;
                    padding: 0;
                    margin: 10px 0 0 0;
                }

                .form-card {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 2px 4px rgba(0,0,0,.08);
                }

                .form-label {
                    font-weight: 600;
                    color: #495057;
                    margin-bottom: 8px;
                }

                .form-control:focus,
                .form-select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 0.2rem rgba(var(--primary-rgb), 0.25);
                }

                .invalid-feedback {
                    display: none;
                    font-size: 0.875em;
                    margin-top: 0.25rem;
                }

                .was-validated .form-control:invalid ~ .invalid-feedback {
                    display: block;
                }

                .was-validated .form-control:invalid {
                    border-color: #dc3545;
                }

                .was-validated .form-control:valid {
                    border-color: #28a745;
                }

                .password-toggle {
                    border-left: 0;
                }

                @media (max-width: 768px) {
                    .form-card {
                        padding: 15px;
                    }
                }
            `;
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Form submission
            $('#memberForm').on('submit', function(e) {
                e.preventDefault();
                self.saveMember();
            });
            
            // Save and new
            $('#saveAndNewBtn').on('click', function() {
                self.saveMember(true);
            });
            
            // Generate username
            $('#generateUsernameBtn').on('click', function() {
                self.generateUsername();
            });
            
            // Generate password
            $('#generatePasswordBtn').on('click', function() {
                self.generatePassword();
            });
            
            // Password toggle
            $('.password-toggle').on('click', function() {
                const target = $(this).data('target');
                const $input = $('#' + target);
                const $icon = $(this).find('i');
                
                if ($input.attr('type') === 'password') {
                    $input.attr('type', 'text');
                    $icon.removeClass('bi-eye').addClass('bi-eye-slash');
                } else {
                    $input.attr('type', 'password');
                    $icon.removeClass('bi-eye-slash').addClass('bi-eye');
                }
            });
            
            // Member type change
            $('#member_type_id').on('change', function() {
                self.handleMemberTypeChange($(this).val());
            });
            
            // Auto-generate username from name
            $('#name').on('blur', function() {
                if (!self.isEditMode && !$('#username').val() && $(this).val()) {
                    self.generateUsername();
                }
            });
            
            // Country change - update mobile code
            $('#country').on('change', function() {
                const countryName = $(this).val();
                if (countryName && window.CountryData) {
                    const mobileCode = window.CountryData.getMobileCodeByCountry(countryName);
                    $('#mobile_code').val(mobileCode);
                }
            });
            
            // ID Proof Type change - show/hide other field
            $('#id_proof_type').on('change', function() {
                if ($(this).val() === 'OTHER') {
                    $('#otherIdProofDiv').show();
                    $('#other_id_proof').attr('required', true);
                } else {
                    $('#otherIdProofDiv').hide();
                    $('#other_id_proof').attr('required', false).val('');
                }
            });
            
            // Set default dates
            $('#membership_date').val(new Date().toISOString().split('T')[0]);
            $('#payment_date').val(new Date().toISOString().split('T')[0]);
        },
        
        // Load initial data
        loadInitialData: function() {
            this.loadCountryData();
            this.loadMemberTypes();
            this.loadAvailableMembers();
            this.loadSignatureComponent();
            
            if (this.isEditMode) {
                this.loadMemberData();
            }
        },
        
        // Load signature component
        loadSignatureComponent: function() {
            const self = this;
            
            // Load signature component script if not loaded
            if (!window.SignatureComponent) {
                $.getScript('/js/components/signature.js').done(function() {
                    self.initializeSignature();
                });
            } else {
                self.initializeSignature();
            }
        },
        
        // Initialize signature
        initializeSignature: function() {
            if (window.SignatureComponent) {
                const signatureHtml = window.SignatureComponent.render();
                $('#signatureContainer').html(signatureHtml);
                window.SignatureComponent.init(this.memberId, null);
            }
        },
        
        // Load country data
        loadCountryData: function() {
            // Load country data script if not already loaded
            if (!window.CountryData) {
                $.getScript('/js/data/countries.js').done(function() {
                    this.populateCountryDropdowns();
                }.bind(this));
            } else {
                this.populateCountryDropdowns();
            }
        },
        
        // Populate country dropdowns
        populateCountryDropdowns: function() {
            if (!window.CountryData) return;
            
            const defaultCountry = window.CountryData.getDefaultCountry();
            const countries = window.CountryData.getSortedCountries();
            
            // Populate mobile code dropdown
            const $mobileCode = $('#mobile_code');
            $mobileCode.empty();
            
            // Add unique mobile codes
            const uniqueCodes = [];
            const addedCodes = new Set();
            
            countries.forEach(country => {
                if (!addedCodes.has(country.mobileCode)) {
                    uniqueCodes.push({
                        code: country.mobileCode,
                        name: country.name
                    });
                    addedCodes.add(country.mobileCode);
                }
            });
            
            // Sort by mobile code
            uniqueCodes.sort((a, b) => {
                const numA = parseInt(a.code.replace('+', ''));
                const numB = parseInt(b.code.replace('+', ''));
                return numA - numB;
            });
            
            uniqueCodes.forEach(item => {
                $mobileCode.append(`<option value="${item.code}">${item.code} (${item.name})</option>`);
            });
            
            // Populate country dropdown
            const $country = $('#country');
            $country.empty();
            
            countries.forEach(country => {
                $country.append(`<option value="${country.name}">${country.name}</option>`);
            });
            
            // Set defaults
            $mobileCode.val(defaultCountry.mobileCode);
            $country.val(defaultCountry.name);
        },
        
        // Load member types
        loadMemberTypes: function() {
            const self = this;
            
            TempleAPI.get('/member-types')
                .done(function(response) {
                    if (response.success) {
                        self.memberTypes = response.data;
                        
                        const $select = $('#member_type_id');
                        $select.empty();
                        $select.append('<option value="">Select Member Type</option>');
                        
                        $.each(self.memberTypes, function(index, type) {
                            const label = type.is_paid ? `${type.display_name} (Paid)` : type.display_name;
                            $select.append(`<option value="${type.id}">${label}</option>`);
                        });
                        
                        // If editing, set the selected value after loading
                        if (self.isEditMode && self.memberData) {
                            $('#member_type_id').val(self.memberData.member_details?.member_type_id);
                            self.handleMemberTypeChange(self.memberData.member_details?.member_type_id);
                        }
                    }
                })
                .fail(function() {
                    console.error('Failed to load member types');
                });
        },
        
        // Load available members for referral and family head
        loadAvailableMembers: function() {
            const self = this;
            
            TempleAPI.get('/members/search', { only_family_heads: false })
                .done(function(response) {
                    if (response.success) {
                        self.availableMembers = response.data;
                        
                        // Populate referred by dropdown
                        const $referredBy = $('#referred_by');
                        $referredBy.empty();
                        $referredBy.append('<option value="">None</option>');
                        
                        $.each(self.availableMembers, function(index, member) {
                            if (!self.memberId || member.id !== self.memberId) {
                                $referredBy.append(`<option value="${member.id}">${member.text}</option>`);
                            }
                        });
                        
                        // Populate family head dropdown
                        const $familyHead = $('#family_head_id');
                        $familyHead.empty();
                        $familyHead.append('<option value="">None (Independent Member)</option>');
                        
                        $.each(self.availableMembers, function(index, member) {
                            if (!self.memberId || member.id !== self.memberId) {
                                $familyHead.append(`<option value="${member.id}">${member.text}</option>`);
                            }
                        });
                        
                        // Set values if editing
                        if (self.isEditMode && self.memberData) {
                            $('#referred_by').val(self.memberData.member_details?.referred_by?.id);
                            $('#family_head_id').val(self.memberData.member_details?.family_head?.id);
                        }
                    }
                })
                .fail(function() {
                    console.error('Failed to load members');
                });
        },
        
        // Load member data (for edit mode)
        loadMemberData: function() {
            const self = this;
            
            TempleCore.showLoading(true);
            
            TempleAPI.get('/members/' + this.memberId)
                .done(function(response) {
                    if (response.success) {
                        self.memberData = response.data;
                        self.populateForm(response.data);
                    } else {
                        TempleCore.showToast('Failed to load member data', 'danger');
                        TempleRouter.navigate('members');
                    }
                })
                .fail(function() {
                    TempleCore.showToast('Failed to load member data', 'danger');
                    TempleRouter.navigate('members');
                })
                .always(function() {
                    TempleCore.showLoading(false);
                });
        },
        
        // Populate form with member data
        populateForm: function(data) {
            // Personal information
            $('#name').val(data.name);
            $('#username').val(data.username);
            $('#email').val(data.email);
            $('#mobile_code').val(data.mobile_code || '+60');
            $('#mobile_no').val(data.mobile_no);
            $('#alternate_mobile').val(data.alternate_mobile);
            $('#date_of_birth').val(data.date_of_birth);
            $('#gender').val(data.gender);
            
            // Handle ID proof type
            if (data.id_proof_type) {
                // Check if it's a standard type
                const standardTypes = ['PAN_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'AADHAAR', 'VOTER_ID'];
                if (standardTypes.includes(data.id_proof_type)) {
                    $('#id_proof_type').val(data.id_proof_type);
                } else {
                    // It's a custom type
                    $('#id_proof_type').val('OTHER');
                    $('#otherIdProofDiv').show();
                    $('#other_id_proof').val(data.id_proof_type);
                }
            }
			if (data.signature_url) {
				if (window.SignatureComponent) {
					window.SignatureComponent.displayExistingSignature(data.signature_url);
				}
			}
            $('#id_proof_number').val(data.id_proof_number);
            
            // Address
            $('#address').val(data.address);
            $('#city').val(data.city);
            $('#state').val(data.state);
            $('#country').val(data.country || 'Malaysia');
            $('#pincode').val(data.pincode);
            
            // Member details
            if (data.member_details) {
                $('#member_type_id').val(data.member_details.member_type_id);
                $('#membership_date').val(data.member_details.membership_date);
                $('#occupation').val(data.member_details.occupation);
                $('#qualification').val(data.member_details.qualification);
                $('#annual_income').val(data.member_details.annual_income);
                
                // These will be set after loading dropdowns
                setTimeout(function() {
                    if (data.member_details.referred_by) {
                        $('#referred_by').val(data.member_details.referred_by.id);
                    }
                    if (data.member_details.family_head) {
                        $('#family_head_id').val(data.member_details.family_head.id);
                    }
                    
                    // Handle member type
                    if (data.member_details.member_type_id) {
                        $('#member_type_id').val(data.member_details.member_type_id);
                        self.handleMemberTypeChange(data.member_details.member_type_id);
                    }
                }, 500);
            }
        },
        
        // Handle member type change
        handleMemberTypeChange: function(typeId) {
            if (!typeId) {
                $('#memberTypeInfo').text('');
                $('#paymentSection').hide();
                return;
            }
            
            const memberType = this.memberTypes.find(t => t.id === typeId);
            if (!memberType) return;
            
            if (memberType.is_paid) {
                $('#memberTypeInfo').html(`<span class="text-warning">This is a paid membership</span>`);
                $('#subscriptionAmount').text('₹' + memberType.subscription_amount);
                
                if (memberType.subscription_period) {
                    $('#subscriptionPeriod').text(`for ${memberType.subscription_period} months`);
                } else {
                    $('#subscriptionPeriod').text('(Lifetime membership)');
                }
                
                $('#paymentSection').show();
            } else {
                $('#memberTypeInfo').html(`<span class="text-success">This is a free membership</span>`);
                $('#paymentSection').hide();
            }
        },
        
        // Generate username
        generateUsername: function() {
            const name = $('#name').val();
            if (!name) {
                TempleCore.showToast('Please enter name first', 'warning');
                return;
            }
            
            const username = name.toLowerCase()
                .replace(/\s+/g, '.')
                .replace(/[^a-z0-9.]/g, '')
                + '.' + Math.floor(Math.random() * 1000);
            
            $('#username').val(username);
        },
        
        // Generate password
        generatePassword: function() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            $('#password').val(password).attr('type', 'text');
            $('.password-toggle[data-target="password"] i')
                .removeClass('bi-eye').addClass('bi-eye-slash');
            
            // Copy to clipboard
            navigator.clipboard.writeText(password).then(function() {
                TempleCore.showToast('Password generated and copied to clipboard', 'success');
            });
        },
        
        // Save member
        saveMember: function(addAnother = false) {
            const self = this;
            
            // Validate form
            const form = document.getElementById('memberForm');
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            // Prepare data
            const formData = this.getFormData();
            
            TempleCore.showLoading(true);
            
            // First save the member
            const request = this.isEditMode 
                ? TempleAPI.put('/members/' + this.memberId, formData)
                : TempleAPI.post('/members', formData);
            
            request
                .done(function(response) {
                    if (response.success) {
                        const memberId = self.isEditMode ? self.memberId : response.data.member.id;
                        
                        // Handle signature upload if needed
                        const signatureStatus = $('#signatureStatus').val();
                        if (signatureStatus && signatureStatus !== 'existing' && window.SignatureComponent) {
                            window.SignatureComponent.uploadToS3(memberId, function(success, data) {
                                if (!success) {
                                    TempleCore.showToast('Member saved but signature upload failed', 'warning');
                                }
                                
                                self.handleSaveSuccess(response, addAnother, form);
                            });
                        } else {
                            self.handleSaveSuccess(response, addAnother, form);
                        }
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save member', 'danger');
                        TempleCore.showLoading(false);
                    }
                })
                .fail(function(xhr) {
                    self.handleSaveError(xhr);
                    TempleCore.showLoading(false);
                });
        },
        
        // Handle save success
        handleSaveSuccess: function(response, addAnother, form) {
            const message = this.isEditMode 
                ? 'Member updated successfully' 
                : 'Member created successfully';
            
            TempleCore.showToast(message, 'success');
            
            if (addAnother) {
                // Reset form for new entry
                form.classList.remove('was-validated');
                form.reset();
                $('#membership_date').val(new Date().toISOString().split('T')[0]);
                $('#payment_date').val(new Date().toISOString().split('T')[0]);
                $('#mobile_code').val('+60');
                $('#country').val('Malaysia');
                $('#otherIdProofDiv').hide();
                
                // Reset signature
                if (window.SignatureComponent) {
                    window.SignatureComponent.removeSignature();
                }
            } else {
                // Navigate back to members list
                TempleRouter.navigate('members');
            }
            
            TempleCore.showLoading(false);
        },
        
        // Handle save error
        handleSaveError: function(xhr) {
            let message = 'An error occurred while saving member';
            
            if (xhr.responseJSON && xhr.responseJSON.message) {
                message = xhr.responseJSON.message;
            } else if (xhr.responseJSON && xhr.responseJSON.errors) {
                // Handle validation errors
                const errors = xhr.responseJSON.errors;
                message = Object.values(errors).flat().join('<br>');
            }
            
            TempleCore.showToast(message, 'danger');
        },
        
        // Get form data
        getFormData: function() {
            const data = {
                // Personal information
                name: $('#name').val(),
                username: $('#username').val(),
                email: $('#email').val(),
                mobile_code: $('#mobile_code').val(),
                mobile_no: $('#mobile_no').val(),
                alternate_mobile: $('#alternate_mobile').val() || null,
                date_of_birth: $('#date_of_birth').val() || null,
                gender: $('#gender').val() || null,
                id_proof_type: $('#id_proof_type').val() === 'OTHER' ? $('#other_id_proof').val() : $('#id_proof_type').val(),
                id_proof_number: $('#id_proof_number').val() || null,
                
                // Address
                address: $('#address').val() || null,
                city: $('#city').val() || null,
                state: $('#state').val() || null,
                country: $('#country').val() || null,
                pincode: $('#pincode').val() || null,
                
                // Membership details
                member_type_id: $('#member_type_id').val() || null,
                membership_date: $('#membership_date').val() || null,
                referred_by: $('#referred_by').val() || null,
                family_head_id: $('#family_head_id').val() || null,
                occupation: $('#occupation').val() || null,
                qualification: $('#qualification').val() || null,
                annual_income: $('#annual_income').val() || null
            };
            
            // Add password only if provided (for new member or password change)
            const password = $('#password').val();
            if (password) {
                data.password = password;
            }
            
            // Add payment information if applicable
            const memberType = this.memberTypes.find(t => t.id === data.member_type_id);
            if (memberType && memberType.is_paid) {
                data.payment_reference = $('#payment_reference').val() || null;
                data.payment_date = $('#payment_date').val() || null;
            }
            
            return data;
        },
        
        // Check permission
        hasPermission: function(permission) {
            const user = this.currentUser;
            
            if (user.user_type === 'SUPER_ADMIN') return true;
            if (user.user_type === 'ADMIN') return true;
            
            return user.permissions && user.permissions.includes(permission);
        }
    };
    
    // Also handle the edit route
    window.MembersEditPage = window.MembersCreatePage;
    
})(jQuery, window);