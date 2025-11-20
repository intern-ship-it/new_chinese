// frontend/js/pages/members/application-view.js
// Member Application View - Full Details Display with GSAP + AOS

(function($, window) {
    'use strict';
    
    window.MembersApplicationViewPage = {
        currentUser: null,
        applicationId: null,
        application: null,
        
        // Initialize page
        init: function(params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.applicationId = params?.id;
            
            if (!this.applicationId) {
                TempleCore.showToast('Invalid application ID', 'error');
                TempleRouter.navigate('members/application');
                return;
            }
            
            this.render();
            this.bindEvents();
            this.loadApplicationData();
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
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="application-view-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-file-earmark-text"></i> Application Details
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members/application'); return false;">Applications</a></li>
                                        <li class="breadcrumb-item active">View</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <div class="btn-group">
                                    <button class="btn btn-outline-primary" id="printBtn">
                                        <i class="bi bi-printer"></i> Print
                                    </button>
                                    <button class="btn btn-outline-info" id="exportPdfBtn">
                                        <i class="bi bi-file-pdf"></i> Export PDF
                                    </button>
                                    <button class="btn btn-secondary" onclick="TempleRouter.navigate('members/application')">
                                        <i class="bi bi-arrow-left"></i> Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted">Loading application details...</p>
                    </div>

                    <!-- Main Content -->
                    <div id="mainContent" style="display: none;">
                        <div id="printableArea">
                            <!-- Header Card -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-down">
                                <div class="card-body p-4">
                                    <div class="row align-items-center">
                                        <div class="col-md-8">
                                            <h3 class="mb-2" id="applicantName"></h3>
                                            <p class="text-muted mb-2">
                                                <strong>Temporary ID:</strong> <span id="headerTempId"></span>
                                            </p>
                                            <p class="text-muted mb-0" id="headerPermanentId" style="display: none;">
                                                <strong>Permanent ID:</strong> <span></span>
                                            </p>
                                        </div>
                                        <div class="col-md-4 text-md-end">
                                            <div id="headerStatus"></div>
                                            <small class="text-muted" id="headerDate"></small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Personal Information -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up">
                                <div class="card-header bg-primary text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-person-circle"></i> Personal Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-3 text-center mb-4">
                                            <img id="viewPhoto" 
                                                 src="/images/default-avatar.png" 
                                                 alt="Photo" 
                                                 class="img-fluid rounded shadow"
                                                 style="max-width: 200px; border: 3px solid #e9ecef;">
                                            <p class="mt-2 mb-0"><small class="text-muted">Applicant Photo</small></p>
                                        </div>
                                        <div class="col-md-9">
                                            <div id="personalInfoContent"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Address Information -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="50">
                                <div class="card-header bg-secondary text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-geo-alt"></i> Address Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="addressInfoContent"></div>
                                </div>
                            </div>

                            <!-- Professional Information -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="100">
                                <div class="card-header bg-info text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-briefcase"></i> Professional Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="professionalInfoContent"></div>
                                </div>
                            </div>

                            <!-- Referral Information -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="150">
                                <div class="card-header bg-warning text-dark">
                                    <h5 class="mb-0">
                                        <i class="bi bi-people"></i> Referral Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div id="referral1Content"></div>
                                        </div>
                                        <div class="col-md-6">
                                            <div id="referral2Content"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Documents -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="200">
                                <div class="card-header bg-dark text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-file-earmark-text"></i> Documents
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="documentsContent"></div>
                                </div>
                            </div>

                            <!-- Payment Information -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="250">
                                <div class="card-header bg-success text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-credit-card"></i> Payment Information
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="paymentInfoContent"></div>
                                </div>
                            </div>

                            <!-- Interview Details (if applicable) -->
                            <div class="card border-0 shadow-sm mb-4" id="interviewCard" style="display: none;" data-aos="fade-up" data-aos-delay="300">
                                <div class="card-header bg-primary text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-calendar-check"></i> Interview Details
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="interviewContent"></div>
                                </div>
                            </div>

                            <!-- Approval Details (if approved) -->
                            <div class="card border-0 shadow-sm mb-4" id="approvalCard" style="display: none;" data-aos="fade-up" data-aos-delay="350">
                                <div class="card-header bg-success text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-check-circle"></i> Approval Details
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="approvalContent"></div>
                                </div>
                            </div>

                            <!-- Rejection Details (if rejected) -->
                            <div class="card border-0 shadow-sm mb-4" id="rejectionCard" style="display: none;" data-aos="fade-up" data-aos-delay="350">
                                <div class="card-header bg-danger text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-x-circle"></i> Rejection Details
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="rejectionContent"></div>
                                </div>
                            </div>

                            <!-- Refund Details (if applicable) -->
                            <div class="card border-0 shadow-sm mb-4" id="refundCard" style="display: none;" data-aos="fade-up" data-aos-delay="400">
                                <div class="card-header bg-info text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-currency-dollar"></i> Refund Details
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="refundContent"></div>
                                </div>
                            </div>

                            <!-- Application Timeline -->
                            <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="450">
                                <div class="card-header bg-dark text-white">
                                    <h5 class="mb-0">
                                        <i class="bi bi-clock-history"></i> Application Timeline
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="timelineContent"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons (Non-printable) -->
                        <div class="card border-0 shadow-sm no-print" data-aos="fade-up" data-aos-delay="500">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <button class="btn btn-secondary" onclick="TempleRouter.navigate('members/application')">
                                            <i class="bi bi-arrow-left"></i> Back to Applications
                                        </button>
                                    </div>
                                    <div id="actionButtons"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom Styles -->
                <style>
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1.5rem;
                    }
                    
                    @media (max-width: 768px) {
                        .info-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    
                    .info-item {
                        padding: 0.75rem 0;
                        border-bottom: 1px solid #e9ecef;
                    }
                    
                    .info-item:last-child {
                        border-bottom: none;
                    }
                    
                    .info-label {
                        font-weight: 600;
                        color: #6c757d;
                        font-size: 0.9rem;
                        margin-bottom: 0.25rem;
                    }
                    
                    .info-value {
                        color: #212529;
                        font-size: 1rem;
                    }
                    
                    .referral-box {
                        border: 2px solid #e9ecef;
                        border-radius: 8px;
                        padding: 1.5rem;
                        background: #f8f9fa;
                        height: 100%;
                    }
                    
                    .referral-box.verified {
                        border-color: #28a745;
                        background: #d4edda;
                    }
                    
                    .referral-box.not-verified {
                        border-color: #ffc107;
                        background: #fff3cd;
                    }
                    
                    .document-card {
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        padding: 1rem;
                        text-align: center;
                        background: #f8f9fa;
                        margin-bottom: 1rem;
                    }
                    
                    .document-card img {
                        max-width: 100%;
                        max-height: 400px;
                        object-fit: contain;
                        border-radius: 4px;
                        margin-bottom: 1rem;
                    }
                    
                    .timeline-view {
                        position: relative;
                        padding-left: 40px;
                    }
                    
                    .timeline-view::before {
                        content: '';
                        position: absolute;
                        left: 15px;
                        top: 0;
                        bottom: 0;
                        width: 3px;
                        background: linear-gradient(to bottom, #0d6efd, #198754);
                    }
                    
                    .timeline-event {
                        position: relative;
                        padding-bottom: 2rem;
                    }
                    
                    .timeline-event:last-child {
                        padding-bottom: 0;
                    }
                    
                    .timeline-marker {
                        position: absolute;
                        left: -30px;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.9rem;
                        border: 3px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        z-index: 1;
                    }
                    
                    .timeline-marker.success { background: #28a745; color: white; }
                    .timeline-marker.warning { background: #ffc107; color: white; }
                    .timeline-marker.danger { background: #dc3545; color: white; }
                    .timeline-marker.info { background: #17a2b8; color: white; }
                    .timeline-marker.secondary { background: #6c757d; color: white; }
                    
                    .timeline-event-content {
                        background: white;
                        padding: 1rem;
                        border-radius: 8px;
                        border-left: 3px solid #0d6efd;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    
                    .timeline-event-title {
                        font-weight: 600;
                        color: #212529;
                        margin-bottom: 0.25rem;
                    }
                    
                    .timeline-event-time {
                        color: #6c757d;
                        font-size: 0.85rem;
                    }
                    
                    .status-badge-large {
                        font-size: 1.1rem;
                        padding: 0.5rem 1.5rem;
                        border-radius: 25px;
                        font-weight: 600;
                    }
                    
                    /* Print Styles */
                    @media print {
                        .no-print {
                            display: none !important;
                        }
                        
                        .page-header {
                            display: none !important;
                        }
                        
                        .card {
                            page-break-inside: avoid;
                            box-shadow: none !important;
                            border: 1px solid #dee2e6 !important;
                        }
                        
                        body {
                            background: white !important;
                        }
                    }
                </style>
            `;
            
            $('#page-container').html(html);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // Print button
            $('#printBtn').on('click', function() {
                self.printApplication();
            });
            
            // Export PDF button
            $('#exportPdfBtn').on('click', function() {
                self.exportPDF();
            });
        },
        
        // Load application data
        loadApplicationData: function() {
            const self = this;
            
            TempleAPI.get('/member-applications/' + this.applicationId)
                .done(function(response) {
                    if (response.success) {
                        self.application = response.data;
                        self.displayApplicationData();
                        
                        // Hide loading, show content
                        $('#loadingState').fadeOut(300, function() {
                            $('#mainContent').fadeIn(300);
                            
                            // Trigger animations
                            if (typeof AOS !== 'undefined') {
                                AOS.refresh();
                            }
                            
                            // Animate cards
                            gsap.from('.card', {
                                duration: 0.5,
                                y: 30,
                                opacity: 0,
                                stagger: 0.05,
                                ease: 'power2.out'
                            });
                        });
                    }
                })
                .fail(function(xhr) {
                    TempleCore.showToast('Failed to load application', 'error');
                    TempleRouter.navigate('members/application');
                });
        },
        
        // Display application data
        displayApplicationData: function() {
            const app = this.application;
            
            // Header
            $('#applicantName').text(app.name);
            $('#headerTempId').text(app.temp_member_id);
            
            if (app.permanent_member_id) {
                $('#headerPermanentId').show().find('span').text(app.permanent_member_id);
            }
            
            const statusConfig = this.getStatusConfig(app.status);
            $('#headerStatus').html(`<span class="status-badge-large badge ${statusConfig.class}">${statusConfig.label}</span>`);
            $('#headerDate').text('Submitted: ' + this.formatDateTime(app.submitted_at || app.created_at));
            
            // Photo
            if (app.profile_photo) {
                $('#viewPhoto').attr('src', app.profile_photo);
            }
            
            // Personal Information
            this.displayPersonalInfo(app);
            
            // Address Information
            this.displayAddressInfo(app);
            
            // Professional Information
            this.displayProfessionalInfo(app);
            
            // Referral Information
            this.displayReferralInfo(app);
            
            // Documents
            this.displayDocuments(app);
            
            // Payment Information
            this.displayPaymentInfo(app);
            
            // Interview Details
            if (app.interview_scheduled) {
                this.displayInterviewDetails(app);
            }
            
            // Approval Details
            if (app.status === 'APPROVED') {
                this.displayApprovalDetails(app);
            }
            
            // Rejection Details
            if (app.status === 'REJECTED') {
                this.displayRejectionDetails(app);
            }
            
            // Refund Details
            if (app.refund_eligible) {
                this.displayRefundDetails(app);
            }
            
            // Timeline
            this.displayTimeline(app);
            
            // Action Buttons
            this.displayActionButtons(app);
        },
        
        // Display personal information
        displayPersonalInfo: function(app) {
            const html = `
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Full Name</div>
                        <div class="info-value">${app.name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">${app.email || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Mobile Number</div>
                        <div class="info-value">${app.mobile_code || ''} ${app.mobile_no || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Alternate Mobile</div>
                        <div class="info-value">${app.alternate_mobile || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Date of Birth</div>
                        <div class="info-value">${this.formatDate(app.date_of_birth) || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Gender</div>
                        <div class="info-value">${app.gender || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Member Type</div>
                        <div class="info-value">${app.member_type?.display_name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">ID Proof Type</div>
                        <div class="info-value">${app.id_proof_type || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">ID Proof Number</div>
                        <div class="info-value">${app.id_proof_number || '-'}</div>
                    </div>
                </div>
            `;
            
            $('#personalInfoContent').html(html);
        },
        
        // Display address information
        displayAddressInfo: function(app) {
            const html = `
                <div class="info-grid">
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label">Address</div>
                        <div class="info-value">${app.address || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">City</div>
                        <div class="info-value">${app.city || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">State</div>
                        <div class="info-value">${app.state || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Country</div>
                        <div class="info-value">${app.country || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Pincode</div>
                        <div class="info-value">${app.pincode || '-'}</div>
                    </div>
                </div>
            `;
            
            $('#addressInfoContent').html(html);
        },
        
        // Display professional information
        displayProfessionalInfo: function(app) {
            const html = `
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Occupation</div>
                        <div class="info-value">${app.occupation || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Qualification</div>
                        <div class="info-value">${app.qualification || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Annual Income</div>
                        <div class="info-value">${app.annual_income || '-'}</div>
                    </div>
                </div>
            `;
            
            $('#professionalInfoContent').html(html);
        },
        
        // Display referral information
        displayReferralInfo: function(app) {
            const ref1HTML = this.getReferralBoxHTML(1, app);
            const ref2HTML = this.getReferralBoxHTML(2, app);
            
            $('#referral1Content').html(ref1HTML);
            $('#referral2Content').html(ref2HTML);
        },
        
        // Get referral box HTML
        getReferralBoxHTML: function(num, app) {
            const verified = app[`referral_${num}_verified`];
            const name = app[`referral_${num}_name`];
            const memberId = app[`referral_${num}_member_id`];
            const verifiedAt = app[`referral_${num}_verified_at`];
            
            const boxClass = verified ? 'verified' : 'not-verified';
            const statusIcon = verified 
                ? '<i class="bi bi-check-circle-fill text-success fs-3"></i>'
                : '<i class="bi bi-exclamation-circle-fill text-warning fs-3"></i>';
            const statusText = verified ? 'Verified' : 'Not Verified';
            
            return `
                <div class="referral-box ${boxClass}">
                    <div class="text-center mb-3">
                        ${statusIcon}
                        <h6 class="mt-2">Referral ${num}</h6>
                        <span class="badge ${verified ? 'bg-success' : 'bg-warning'}">${statusText}</span>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Name</div>
                        <div class="info-value">${name || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Member ID / IC</div>
                        <div class="info-value">${memberId || '-'}</div>
                    </div>
                    ${verified ? `
                        <div class="info-item">
                            <div class="info-label">Verified On</div>
                            <div class="info-value">${this.formatDateTime(verifiedAt)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        },
        
        // Display documents
        displayDocuments: function(app) {
            const html = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="document-card">
                            <h6><i class="bi bi-card-image"></i> ID Proof Document</h6>
                            ${app.id_proof_document ? `
                                <img src="${app.id_proof_document}" alt="IC Copy">
                                <a href="${app.id_proof_document}" target="_blank" class="btn btn-primary btn-sm no-print">
                                    <i class="bi bi-download"></i> Download
                                </a>
                            ` : '<p class="text-muted">No document uploaded</p>'}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="document-card">
                            <h6><i class="bi bi-person-badge"></i> Passport Photo</h6>
                            ${app.profile_photo ? `
                                <img src="${app.profile_photo}" alt="Photo">
                                <a href="${app.profile_photo}" target="_blank" class="btn btn-primary btn-sm no-print">
                                    <i class="bi bi-download"></i> Download
                                </a>
                            ` : '<p class="text-muted">No photo uploaded</p>'}
                        </div>
                    </div>
                </div>
            `;
            
            $('#documentsContent').html(html);
        },
        
        // Display payment information
        displayPaymentInfo: function(app) {
            const paidBadge = app.entry_fee_paid 
                ? '<span class="badge bg-success ms-2">Paid</span>'
                : '<span class="badge bg-warning ms-2">Pending</span>';
            
            const html = `
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Entry Fee Amount</div>
                        <div class="info-value">RM ${app.entry_fee_amount || '51.00'} ${paidBadge}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Payment Method</div>
                        <div class="info-value">${app.payment_method || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Payment Reference</div>
                        <div class="info-value">${app.payment_reference || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Payment Date</div>
                        <div class="info-value">${this.formatDate(app.payment_date) || '-'}</div>
                    </div>
                </div>
            `;
            
            $('#paymentInfoContent').html(html);
        },
        
        // Display interview details
        displayInterviewDetails: function(app) {
            const completedBadge = app.interview_completed_at
                ? '<span class="badge bg-success">Completed</span>'
                : '<span class="badge bg-warning">Scheduled</span>';
            
            const html = `
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">${completedBadge}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Interview Date & Time</div>
                        <div class="info-value">${this.formatDateTime(app.interview_date)}</div>
                    </div>
                    ${app.interview_notes ? `
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <div class="info-label">Notes</div>
                            <div class="info-value">${app.interview_notes}</div>
                        </div>
                    ` : ''}
                    ${app.interview_completed_at ? `
                        <div class="info-item">
                            <div class="info-label">Completed On</div>
                            <div class="info-value">${this.formatDateTime(app.interview_completed_at)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            $('#interviewContent').html(html);
            $('#interviewCard').show();
        },
        
        // Display approval details
        displayApprovalDetails: function(app) {
            const html = `
                <div class="alert alert-success mb-3">
                    <i class="bi bi-check-circle-fill"></i> 
                    <strong>Application Approved</strong>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Permanent Member ID</div>
                        <div class="info-value"><strong>${app.permanent_member_id || '-'}</strong></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Approval Date</div>
                        <div class="info-value">${this.formatDateTime(app.approved_at)}</div>
                    </div>
                    ${app.approved_by_committee ? `
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <div class="info-label">Approved By (Committee)</div>
                            <div class="info-value">${app.approved_by_committee}</div>
                        </div>
                    ` : ''}
                    ${app.approval_remarks ? `
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <div class="info-label">Remarks</div>
                            <div class="info-value">${app.approval_remarks}</div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            $('#approvalContent').html(html);
            $('#approvalCard').show();
        },
        
        // Display rejection details
        displayRejectionDetails: function(app) {
            const html = `
                <div class="alert alert-danger mb-3">
                    <i class="bi bi-x-circle-fill"></i> 
                    <strong>Application Rejected</strong>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Rejection Reason</div>
                        <div class="info-value">${app.rejection_reason || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Rejection Date</div>
                        <div class="info-value">${this.formatDateTime(app.rejected_at)}</div>
                    </div>
                    ${app.rejection_remarks ? `
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <div class="info-label">Remarks</div>
                            <div class="info-value">${app.rejection_remarks}</div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            $('#rejectionContent').html(html);
            $('#rejectionCard').show();
        },
        
        // Display refund details
        displayRefundDetails: function(app) {
            const refundStatusBadge = app.refund_processed
                ? '<span class="badge bg-success">Processed</span>'
                : '<span class="badge bg-warning">Pending</span>';
            
            const html = `
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Refund Status</div>
                        <div class="info-value">${refundStatusBadge}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Refund Amount</div>
                        <div class="info-value">RM ${app.refund_amount || '51.00'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Refund Method</div>
                        <div class="info-value">${app.refund_method || '-'}</div>
                    </div>
                    ${app.refund_processed ? `
                        <div class="info-item">
                            <div class="info-label">Refund Date</div>
                            <div class="info-value">${this.formatDate(app.refund_date)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Reference</div>
                            <div class="info-value">${app.refund_reference || '-'}</div>
                        </div>
                        ${app.refund_remarks ? `
                            <div class="info-item" style="grid-column: 1 / -1;">
                                <div class="info-label">Remarks</div>
                                <div class="info-value">${app.refund_remarks}</div>
                            </div>
                        ` : ''}
                    ` : ''}
                </div>
            `;
            
            $('#refundContent').html(html);
            $('#refundCard').show();
        },
        
        // Display timeline
        displayTimeline: function(app) {
            let html = '<div class="timeline-view">';
            
            // Application Created
            html += this.getTimelineEventHTML(
                'secondary',
                'Application Created',
                this.formatDateTime(app.created_at),
                'bi-plus-circle'
            );
            
            // Application Submitted
            if (app.submitted_at) {
                html += this.getTimelineEventHTML(
                    'info',
                    'Application Submitted',
                    this.formatDateTime(app.submitted_at),
                    'bi-send'
                );
            }
            
            // Verification Started
            if (app.status === 'UNDER_VERIFICATION' || app.referral_1_verified || app.referral_2_verified) {
                html += this.getTimelineEventHTML(
                    'warning',
                    'Verification Started',
                    '-',
                    'bi-search'
                );
            }
            
            // Referral 1 Verified
            if (app.referral_1_verified_at) {
                html += this.getTimelineEventHTML(
                    'success',
                    'Referral 1 Verified',
                    this.formatDateTime(app.referral_1_verified_at),
                    'bi-check'
                );
            }
            
            // Referral 2 Verified
            if (app.referral_2_verified_at) {
                html += this.getTimelineEventHTML(
                    'success',
                    'Referral 2 Verified',
                    this.formatDateTime(app.referral_2_verified_at),
                    'bi-check'
                );
            }
            
            // Interview Scheduled
            if (app.interview_scheduled) {
                html += this.getTimelineEventHTML(
                    'info',
                    'Interview Scheduled',
                    this.formatDateTime(app.interview_date),
                    'bi-calendar'
                );
            }
            
            // Interview Completed
            if (app.interview_completed_at) {
                html += this.getTimelineEventHTML(
                    'success',
                    'Interview Completed',
                    this.formatDateTime(app.interview_completed_at),
                    'bi-check-circle'
                );
            }
            
            // Pending Approval
            if (app.status === 'PENDING_APPROVAL') {
                html += this.getTimelineEventHTML(
                    'warning',
                    'Pending Approval',
                    '-',
                    'bi-hourglass-split'
                );
            }
            
            // Application Approved
            if (app.approved_at) {
                html += this.getTimelineEventHTML(
                    'success',
                    'Application Approved',
                    this.formatDateTime(app.approved_at),
                    'bi-check-circle-fill',
                    `Permanent ID: ${app.permanent_member_id}`
                );
            }
            
            // Application Rejected
            if (app.rejected_at) {
                html += this.getTimelineEventHTML(
                    'danger',
                    'Application Rejected',
                    this.formatDateTime(app.rejected_at),
                    'bi-x-circle-fill',
                    app.rejection_reason
                );
            }
            
            // Refund Processed
            if (app.refund_processed) {
                html += this.getTimelineEventHTML(
                    'info',
                    'Refund Processed',
                    this.formatDateTime(app.refund_date),
                    'bi-currency-dollar',
                    `RM ${app.refund_amount}`
                );
            }
            
            html += '</div>';
            
            $('#timelineContent').html(html);
            
            // Animate timeline events
            gsap.from('.timeline-event', {
                duration: 0.5,
                x: -30,
                opacity: 0,
                stagger: 0.1,
                ease: 'power2.out',
                delay: 0.2
            });
        },
        
        // Get timeline event HTML
        getTimelineEventHTML: function(type, title, time, icon, detail) {
            return `
                <div class="timeline-event">
                    <div class="timeline-marker ${type}">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div class="timeline-event-content">
                        <div class="timeline-event-title">${title}</div>
                        <div class="timeline-event-time">${time}</div>
                        ${detail ? `<div class="mt-1"><small>${detail}</small></div>` : ''}
                    </div>
                </div>
            `;
        },
        
        // Display action buttons
        displayActionButtons: function(app) {
            let html = '';
            
            if (this.hasPermission('verify') && !['APPROVED', 'REJECTED'].includes(app.status)) {
                html += `
                    <button class="btn btn-primary me-2" onclick="TempleRouter.navigate('members/application-verify', {id: '${app.id}'})">
                        <i class="bi bi-shield-check"></i> Verify Application
                    </button>
                `;
            }
            
            if (app.status === 'PENDING_SUBMISSION' || app.status === 'SUBMITTED') {
                html += `
                    <button class="btn btn-outline-primary" onclick="TempleRouter.navigate('members/application-form', {id: '${app.id}'})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                `;
            }
            
            $('#actionButtons').html(html);
        },
        
        // Print application
        printApplication: function() {
            window.print();
        },
        
        // Export PDF
        exportPDF: function() {
            TempleCore.showToast('PDF export feature coming soon', 'info');
            // TODO: Implement PDF export using library like jsPDF or server-side generation
        },
        
        // Get status configuration
        getStatusConfig: function(status) {
            const configs = {
                'PENDING_SUBMISSION': { label: 'Draft', class: 'bg-secondary text-white' },
                'SUBMITTED': { label: 'Submitted', class: 'bg-info text-white' },
                'UNDER_VERIFICATION': { label: 'Under Verification', class: 'bg-warning text-dark' },
                'INTERVIEW_SCHEDULED': { label: 'Interview Scheduled', class: 'bg-primary text-white' },
                'PENDING_APPROVAL': { label: 'Pending Approval', class: 'bg-warning text-dark' },
                'APPROVED': { label: 'Approved', class: 'bg-success text-white' },
                'REJECTED': { label: 'Rejected', class: 'bg-danger text-white' }
            };
            
            return configs[status] || { label: status, class: 'bg-secondary text-white' };
        },
        
        // Format date
        formatDate: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },
        
        // Format date time
        formatDateTime: function(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        // Check permission
        hasPermission: function(permission) {
            const user = this.currentUser;
            
            if (user.user_type === 'SUPER_ADMIN') return true;
            if (user.user_type === 'ADMIN') return true;
            
            return user.permissions && user.permissions.includes(permission);
        }
    };
    
})(jQuery, window);