// frontend/js/pages/members/application-verify.js
// Member Application Verification - Admin Interface with GSAP + AOS

(function ($, window) {
  "use strict";

  window.MembersApplicationVerifyPage = {
    currentUser: null,
    applicationId: null,
    application: null,
    workflowHistory: [],

    // Initialize page
    init: function (params) {
      this.currentUser = JSON.parse(
        localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || "{}"
      );
      this.applicationId = params?.id;

      if (!this.applicationId) {
        TempleCore.showToast("Invalid application ID", "error");
        TempleRouter.navigate("members/application");
        return;
      }

      this.render();
      this.bindEvents();
      this.loadApplicationData();
      this.initAnimations();
    },

    // Initialize GSAP & AOS animations
    initAnimations: function () {
      // Initialize AOS
      if (typeof AOS !== "undefined") {
        AOS.init({
          duration: 600,
          easing: "ease-in-out",
          once: false,
        });
      }

      // GSAP: Animate page header
      gsap.from(".page-header", {
        duration: 0.6,
        y: -30,
        opacity: 0,
        ease: "power2.out",
      });
    },

    // Render page HTML
    render: function () {
      const html = `
                <div class="application-verify-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-shield-check"></i> Verify Application
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members/application'); return false;">Applications</a></li>
                                        <li class="breadcrumb-item active">Verify</li>
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

                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted">Loading application details...</p>
                    </div>

                    <!-- Main Content -->
                    <div id="mainContent" style="display: none;">
                        <div class="row">
                            <!-- Left Column: Application Details -->
                            <div class="col-lg-8">
                                <!-- Applicant Information -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-up">
                                    <div class="card-header bg-primary text-white">
                                        <h5 class="mb-0">
                                            <i class="bi bi-person-circle"></i> Applicant Information
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-3 text-center mb-3">
                                                <img id="applicantPhoto" 
                                                     src="/images/default-avatar.png" 
                                                     alt="Photo" 
                                                     class="img-fluid rounded"
                                                     style="max-width: 150px; border: 3px solid #e9ecef;">
                                            </div>
                                            <div class="col-md-9">
                                                <div id="applicantDetails"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Referral Verification -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="100">
                                    <div class="card-header bg-info text-white">
                                        <h5 class="mb-0">
                                            <i class="bi bi-people"></i> Referral Verification
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="referralDetails"></div>
                                    </div>
                                </div>

                                <!-- Documents -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="200">
                                    <div class="card-header bg-secondary text-white">
                                        <h5 class="mb-0">
                                            <i class="bi bi-file-earmark-text"></i> Documents
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="documentDetails"></div>
                                    </div>
                                </div>

                                <!-- Payment Information -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="300">
                                    <div class="card-header bg-success text-white">
                                        <h5 class="mb-0">
                                            <i class="bi bi-credit-card"></i> Payment Information
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="paymentDetails"></div>
                                    </div>
                                </div>

                                <!-- Interview Section -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="400">
                                    <div class="card-header bg-warning text-dark">
                                        <h5 class="mb-0">
                                            <i class="bi bi-calendar-check"></i> Interview Management
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div id="interviewSection"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column: Workflow & Actions -->
                            <div class="col-lg-4">
                                <!-- Status Card -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-left">
                                    <div class="card-body">
                                        <div class="text-center mb-3">
                                            <h6 class="text-muted mb-2">Current Status</h6>
                                            <h4 id="currentStatus"></h4>
                                            <div class="mt-2">
                                                <small class="text-muted" id="tempMemberId"></small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Workflow Timeline -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-left" data-aos-delay="100">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="bi bi-clock-history"></i> Workflow Timeline
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div id="workflowTimeline"></div>
                                    </div>
                                </div>

                                <!-- Quick Actions -->
                                <div class="card border-0 shadow-sm mb-4" data-aos="fade-left" data-aos-delay="200">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="bi bi-lightning"></i> Quick Actions
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div id="quickActions"></div>
                                    </div>
                                </div>

                                <!-- Admin Notes -->
                                <div class="card border-0 shadow-sm" data-aos="fade-left" data-aos-delay="300">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="bi bi-journal-text"></i> Admin Notes
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <textarea class="form-control mb-2" 
                                                  id="adminNotes" 
                                                  rows="4" 
                                                  placeholder="Add notes..."></textarea>
                                        <button class="btn btn-sm btn-primary w-100" id="saveNotesBtn">
                                            <i class="bi bi-save"></i> Save Notes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modals -->
                ${this.getModalsHTML()}

                <!-- Custom Styles -->
                <style>
                    .detail-row {
                        display: flex;
                        padding: 0.75rem 0;
                        border-bottom: 1px solid #e9ecef;
                    }
                    
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    
                    .detail-label {
                        font-weight: 600;
                        width: 40%;
                        color: #6c757d;
                    }
                    
                    .detail-value {
                        width: 60%;
                    }
                    
                    .referral-card {
                        border: 2px solid #e9ecef;
                        border-radius: 8px;
                        padding: 1rem;
                        margin-bottom: 1rem;
                        transition: all 0.3s ease;
                    }
                    
                    .referral-card.verified {
                        border-color: #28a745;
                        background: #d4edda;
                    }
                    
                    .referral-card.not-verified {
                        border-color: #dc3545;
                        background: #f8d7da;
                    }
                    
                    .document-preview {
                        max-width: 100%;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        padding: 1rem;
                        text-align: center;
                        margin-bottom: 1rem;
                    }
                    
                    .document-preview img {
                        max-width: 100%;
                        max-height: 300px;
                        object-fit: contain;
                    }
                    
                    .timeline {
                        position: relative;
                        padding-left: 30px;
                    }
                    
                    .timeline::before {
                        content: '';
                        position: absolute;
                        left: 10px;
                        top: 0;
                        bottom: 0;
                        width: 2px;
                        background: #e9ecef;
                    }
                    
                    .timeline-item {
                        position: relative;
                        padding-bottom: 1.5rem;
                    }
                    
                    .timeline-item:last-child {
                        padding-bottom: 0;
                    }
                    
                    .timeline-icon {
                        position: absolute;
                        left: -24px;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        border: 2px solid white;
                        z-index: 1;
                    }
                    
                    .timeline-icon.success { background: #28a745; color: white; }
                    .timeline-icon.warning { background: #ffc107; color: white; }
                    .timeline-icon.danger { background: #dc3545; color: white; }
                    .timeline-icon.info { background: #17a2b8; color: white; }
                    .timeline-icon.secondary { background: #6c757d; color: white; }
                    
                    .timeline-content {
                        background: #f8f9fa;
                        padding: 0.75rem;
                        border-radius: 6px;
                    }
                    
                    .action-btn {
                        width: 100%;
                        margin-bottom: 0.5rem;
                        transition: all 0.3s ease;
                    }
                    
                    .action-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    }
                    
                    .verify-badge {
                        display: inline-block;
                        padding: 0.25rem 0.75rem;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 500;
                    }
                </style>
            `;

      $("#page-container").html(html);
    },

    // Get modals HTML
    getModalsHTML: function () {
      return `
                <!-- Verify Referral Modal -->
                <div class="modal fade" id="verifyReferralModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Verify Referral</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="referralVerifyContent"></div>
                                <div class="mb-3 mt-3">
                                    <label class="form-label">Verification Notes</label>
                                    <textarea class="form-control" id="referralVerifyNotes" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmVerifyReferralBtn">
                                    <i class="bi bi-check-circle"></i> Verify
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Schedule Interview Modal -->
                <div class="modal fade" id="scheduleInterviewModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Schedule Interview</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Interview Date & Time <span class="text-danger">*</span></label>
                                    <input type="datetime-local" class="form-control" id="interviewDateTime" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" id="interviewNotes" rows="3" placeholder="Location, special instructions..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="confirmScheduleInterviewBtn">
                                    <i class="bi bi-calendar-check"></i> Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Complete Interview Modal -->
                <div class="modal fade" id="completeInterviewModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Complete Interview</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Interview Notes <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="completeInterviewNotes" rows="4" required placeholder="Summary of interview, observations..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmCompleteInterviewBtn">
                                    <i class="bi bi-check-circle"></i> Complete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Approve Application Modal -->
                <div class="modal fade" id="approveApplicationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-check-circle"></i> Approve Application
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> 
                                    Upon approval, a permanent membership ID will be generated and the applicant will be added to the members list.
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Approved By (Committee Members) <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="approvedByCommittee" rows="2" required placeholder="Names of committee members or meeting panel"></textarea>
                                    <div class="form-text">Enter the names of committee members who approved this application</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Approval Remarks</label>
                                    <textarea class="form-control" id="approvalRemarks" rows="3" placeholder="Any additional notes..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmApproveBtn">
                                    <i class="bi bi-check-circle"></i> Approve Application
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reject Application Modal -->
                <div class="modal fade" id="rejectApplicationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-x-circle"></i> Reject Application
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i> 
                                    This action will reject the application. Please provide clear reasons for rejection.
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Reason for Rejection <span class="text-danger">*</span></label>
                                    <select class="form-select" id="rejectionReason" required>
                                        <option value="">Select Reason</option>
                                        <option value="Invalid Referrals">Invalid Referrals</option>
                                        <option value="Incomplete Documents">Incomplete Documents</option>
                                        <option value="Failed Interview">Failed Interview</option>
                                        <option value="Payment Issues">Payment Issues</option>
                                        <option value="Committee Decision">Committee Decision</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Additional Remarks <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="rejectionRemarks" rows="3" required placeholder="Provide detailed explanation..."></textarea>
                                </div>
                                
                                <hr>
                                
                                <h6>Refund Information</h6>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="refundEligible" checked>
                                        <label class="form-check-label" for="refundEligible">
                                            Applicant is eligible for refund
                                        </label>
                                    </div>
                                </div>
                                
                                <div id="refundDetailsSection">
                                    <div class="mb-3">
                                        <label class="form-label">Refund Amount (RM)</label>
                                        <input type="number" class="form-control" id="refundAmount" value="51.00" step="0.01">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Refund Method</label>
                                        <select class="form-select" id="refundMethod">
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmRejectBtn">
                                    <i class="bi bi-x-circle"></i> Reject Application
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Process Refund Modal -->
                <div class="modal fade" id="processRefundModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Process Refund</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Refund Amount (RM)</label>
                                    <input type="number" class="form-control" id="processRefundAmount" readonly>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Refund Date <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="refundDate" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Refund Reference / Transaction ID <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="refundReference" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" id="refundProcessNotes" rows="2"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmProcessRefundBtn">
                                    <i class="bi bi-check-circle"></i> Process Refund
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    },

    // Bind events
    bindEvents: function () {
      const self = this;

      // Referral verification
      $(document).on("click", ".verify-referral-btn", function () {
        const referralNum = $(this).data("referral");
        self.showVerifyReferralModal(referralNum);
      });

      $("#confirmVerifyReferralBtn").on("click", function () {
        self.verifyReferral();
      });

      // Interview management
      $("#scheduleInterviewBtn").on("click", function () {
        $("#scheduleInterviewModal").modal("show");
      });

      $("#confirmScheduleInterviewBtn").on("click", function () {
        self.scheduleInterview();
      });

      $("#completeInterviewBtn").on("click", function () {
        $("#completeInterviewModal").modal("show");
      });

      $("#confirmCompleteInterviewBtn").on("click", function () {
        self.completeInterview();
      });

      // Approve/Reject
      $("#approveApplicationBtn").on("click", function () {
        $("#approveApplicationModal").modal("show");
      });

      $("#confirmApproveBtn").on("click", function () {
        self.approveApplication();
      });

      $("#rejectApplicationBtn").on("click", function () {
        $("#rejectApplicationModal").modal("show");
      });

      $("#confirmRejectBtn").on("click", function () {
        self.rejectApplication();
      });

      // Refund processing
      $("#refundEligible").on("change", function () {
        if ($(this).is(":checked")) {
          $("#refundDetailsSection").show();
        } else {
          $("#refundDetailsSection").hide();
        }
      });

      $("#processRefundBtn").on("click", function () {
        self.showProcessRefundModal();
      });

      $("#confirmProcessRefundBtn").on("click", function () {
        self.processRefund();
      });

      // Save notes
      $("#saveNotesBtn").on("click", function () {
        self.saveAdminNotes();
      });
    },

    // Load application data
    loadApplicationData: function () {
      const self = this;

      TempleAPI.get("/member-applications/" + this.applicationId)
        .done(function (response) {
          if (response.success) {
            self.application = response.data;
            self.displayApplicationData();
            self.loadWorkflowHistory();

            // Hide loading, show content
            $("#loadingState").fadeOut(300, function () {
              $("#mainContent").fadeIn(300);

              // Trigger animations
              if (typeof AOS !== "undefined") {
                AOS.refresh();
              }
            });
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to load application", "error");
          TempleRouter.navigate("members/application");
        });
    },

    // Display application data
    displayApplicationData: function () {
      const app = this.application;

      // Applicant photo
      if (app.profile_photo) {
        $("#applicantPhoto").attr("src", app.profile_photo);
      }

      // Status
      const statusConfig = this.getStatusConfig(app.status);
      $("#currentStatus").html(
        `<span class="badge ${statusConfig.class}">${statusConfig.label}</span>`
      );
      $("#tempMemberId").text(app.temp_member_id);

      // Applicant details
      const detailsHTML = `
                <div class="detail-row">
                    <div class="detail-label">Full Name:</div>
                    <div class="detail-value"><strong>${
                      app.name || "-"
                    }</strong></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${app.email || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Mobile:</div>
                    <div class="detail-value">${app.mobile_code || ""} ${
        app.mobile_no || "-"
      }</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date of Birth:</div>
                    <div class="detail-value">${
                      this.formatDate(app.date_of_birth) || "-"
                    }</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Gender:</div>
                    <div class="detail-value">${app.gender || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Address:</div>
                    <div class="detail-value">${app.address || "-"}, ${
        app.city || ""
      }, ${app.state || ""}, ${app.country || ""} ${app.pincode || ""}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Occupation:</div>
                    <div class="detail-value">${app.occupation || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Qualification:</div>
                    <div class="detail-value">${app.qualification || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Annual Income:</div>
                    <div class="detail-value">${app.annual_income || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Submitted:</div>
                    <div class="detail-value">${
                      this.formatDateTime(app.submitted_at) || "-"
                    }</div>
                </div>
            `;
      $("#applicantDetails").html(detailsHTML);

      // Referral details
      this.displayReferralDetails();

      // Document details
      this.displayDocumentDetails();

      // Payment details
      this.displayPaymentDetails();

      // Interview section
      this.displayInterviewSection();

      // Quick actions
      this.displayQuickActions();
    },

    // Display referral details
    displayReferralDetails: function () {
      const app = this.application;

      const ref1HTML = this.getReferralCardHTML(1, app);
      const ref2HTML = this.getReferralCardHTML(2, app);

      $("#referralDetails").html(ref1HTML + ref2HTML);

      // Animate referral cards
      gsap.from(".referral-card", {
        duration: 0.5,
        y: 20,
        opacity: 0,
        stagger: 0.2,
        ease: "power2.out",
      });
    },

    // Get referral card HTML
    getReferralCardHTML: function (num, app) {
      const verified = app[`referral_${num}_verified`];
      const name = app[`referral_${num}_name`];
      const memberId = app[`referral_${num}_member_id`];
      const verifiedAt = app[`referral_${num}_verified_at`];

      const cardClass = verified ? "verified" : "not-verified";
      const statusBadge = verified
        ? '<span class="verify-badge bg-success text-white"><i class="bi bi-check-circle"></i> Verified</span>'
        : '<span class="verify-badge bg-danger text-white"><i class="bi bi-x-circle"></i> Not Verified</span>';

      return `
                <div class="referral-card ${cardClass}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6><i class="bi bi-person-check"></i> Referral ${num}</h6>
                        ${statusBadge}
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${name || "-"}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Member ID / IC:</div>
                        <div class="detail-value">${memberId || "-"}</div>
                    </div>
                    ${
                      verified
                        ? `
                        <div class="detail-row">
                            <div class="detail-label">Verified At:</div>
                            <div class="detail-value">${this.formatDateTime(
                              verifiedAt
                            )}</div>
                        </div>
                    `
                        : ""
                    }
                    ${
                      !verified &&
                      (app.status === "SUBMITTED" ||
                        app.status === "UNDER_VERIFICATION")
                        ? `
                        <button class="btn btn-sm btn-success mt-2 verify-referral-btn" data-referral="${num}">
                            <i class="bi bi-check-circle"></i> Verify Referral
                        </button>
                    `
                        : ""
                    }
                </div>
            `;
    },

    // Display document details
    displayDocumentDetails: function () {
      const app = this.application;

      const html = `
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="bi bi-card-image"></i> ID Proof</h6>
                        <div class="detail-row">
                            <div class="detail-label">Type:</div>
                            <div class="detail-value">${
                              app.id_proof_type || "-"
                            }</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Number:</div>
                            <div class="detail-value">${
                              app.id_proof_number || "-"
                            }</div>
                        </div>
                        ${
                          app.id_proof_document
                            ? `
                            <div class="document-preview">
                                <img src="${app.id_proof_document}" alt="IC Copy">
                                <a href="${app.id_proof_document}" target="_blank" class="btn btn-sm btn-primary mt-2">
                                    <i class="bi bi-download"></i> View/Download
                                </a>
                            </div>
                        `
                            : '<p class="text-muted">No document uploaded</p>'
                        }
                    </div>
                    <div class="col-md-6">
                        <h6><i class="bi bi-person-badge"></i> Passport Photo</h6>
                        ${
                          app.profile_photo
                            ? `
                            <div class="document-preview">
                                <img src="${app.profile_photo}" alt="Photo">
                                <a href="${app.profile_photo}" target="_blank" class="btn btn-sm btn-primary mt-2">
                                    <i class="bi bi-download"></i> View/Download
                                </a>
                            </div>
                        `
                            : '<p class="text-muted">No photo uploaded</p>'
                        }
                    </div>
                </div>
            `;

      $("#documentDetails").html(html);
    },

    // Display payment details
    displayPaymentDetails: function () {
      const app = this.application;

      const paidBadge = app.entry_fee_paid
        ? '<span class="badge bg-success">Paid</span>'
        : '<span class="badge bg-warning">Pending</span>';

      const html = `
                <div class="detail-row">
                    <div class="detail-label">Entry Fee:</div>
                    <div class="detail-value"><strong>RM ${
                      app.entry_fee_amount || "51.00"
                    }</strong> ${paidBadge}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Payment Method:</div>
                    <div class="detail-value">${app.payment_method || "-"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Reference:</div>
                    <div class="detail-value">${
                      app.payment_reference || "-"
                    }</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Payment Date:</div>
                    <div class="detail-value">${
                      this.formatDate(app.payment_date) || "-"
                    }</div>
                </div>
            `;

      $("#paymentDetails").html(html);
    },

    // Display interview section
    displayInterviewSection: function () {
      const app = this.application;

      let html = "";

      if (app.interview_scheduled) {
        html = `
                    <div class="alert alert-info">
                        <i class="bi bi-calendar-check"></i> Interview scheduled
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date & Time:</div>
                        <div class="detail-value">${this.formatDateTime(
                          app.interview_date
                        )}</div>
                    </div>
                    ${
                      app.interview_notes
                        ? `
                        <div class="detail-row">
                            <div class="detail-label">Notes:</div>
                            <div class="detail-value">${app.interview_notes}</div>
                        </div>
                    `
                        : ""
                    }
                    ${
                      app.interview_completed_at
                        ? `
                        <div class="alert alert-success mt-3">
                            <i class="bi bi-check-circle"></i> Interview completed on ${this.formatDateTime(
                              app.interview_completed_at
                            )}
                        </div>
                    `
                        : `
                        <button class="btn btn-success mt-3" id="completeInterviewBtn">
                            <i class="bi bi-check-circle"></i> Mark as Completed
                        </button>
                    `
                    }
                `;
      } else {
        html = `
                    <p class="text-muted">No interview scheduled yet</p>
                    <button class="btn btn-primary" id="scheduleInterviewBtn">
                        <i class="bi bi-calendar-plus"></i> Schedule Interview
                    </button>
                `;
      }

      $("#interviewSection").html(html);
    },

    // Display quick actions
    displayQuickActions: function () {
      const app = this.application;
      let html = "";

      // Status-based actions
      if (app.status === "SUBMITTED") {
        html += `
                    <button class="action-btn btn btn-primary" onclick="MembersApplicationVerifyPage.changeStatus('UNDER_VERIFICATION')">
                        <i class="bi bi-arrow-right-circle"></i> Start Verification
                    </button>
                `;
      }

      if (
        app.status === "UNDER_VERIFICATION" &&
        app.referral_1_verified &&
        app.referral_2_verified
      ) {
        html += `
                    <button class="action-btn btn btn-warning" onclick="MembersApplicationVerifyPage.changeStatus('PENDING_APPROVAL')">
                        <i class="bi bi-hourglass-split"></i> Move to Pending Approval
                    </button>
                `;
      }

      if (
        app.status === "PENDING_APPROVAL" ||
        (app.status === "INTERVIEW_SCHEDULED" && app.interview_completed_at)
      ) {
        html += `
                    <button class="action-btn btn btn-success" id="approveApplicationBtn">
                        <i class="bi bi-check-circle"></i> Approve Application
                    </button>
                `;
      }

      // Reject button (available for most statuses)
      if (!["APPROVED", "REJECTED"].includes(app.status)) {
        html += `
                    <button class="action-btn btn btn-danger" id="rejectApplicationBtn">
                        <i class="bi bi-x-circle"></i> Reject Application
                    </button>
                `;
      }

      // Refund processing for rejected applications
      if (
        app.status === "REJECTED" &&
        app.refund_eligible &&
        !app.refund_processed
      ) {
        html += `
                    <button class="action-btn btn btn-info" id="processRefundBtn">
                        <i class="bi bi-currency-dollar"></i> Process Refund
                    </button>
                `;
      }

      // View full application
      html += `
                <button class="action-btn btn btn-outline-primary" onclick="MembersApplicationVerifyPage.viewFullApplication()">
                    <i class="bi bi-eye"></i> View Full Details
                </button>
            `;

      $("#quickActions").html(html);

      // Animate buttons
      gsap.from(".action-btn", {
        duration: 0.4,
        x: 20,
        opacity: 0,
        stagger: 0.1,
        ease: "power2.out",
      });
    },

    // Load workflow history
    loadWorkflowHistory: function () {
      const app = this.application;
      let timeline = "";

      // Created
      timeline += this.getTimelineItem(
        "secondary",
        "Application Created",
        this.formatDateTime(app.created_at),
        "bi-plus-circle"
      );

      // Submitted
      if (app.submitted_at) {
        timeline += this.getTimelineItem(
          "info",
          "Application Submitted",
          this.formatDateTime(app.submitted_at),
          "bi-send"
        );
      }

      // Referral verifications
      if (app.referral_1_verified_at) {
        timeline += this.getTimelineItem(
          "success",
          "Referral 1 Verified",
          this.formatDateTime(app.referral_1_verified_at),
          "bi-check"
        );
      }

      if (app.referral_2_verified_at) {
        timeline += this.getTimelineItem(
          "success",
          "Referral 2 Verified",
          this.formatDateTime(app.referral_2_verified_at),
          "bi-check"
        );
      }

      // Interview scheduled
      if (app.interview_scheduled) {
        timeline += this.getTimelineItem(
          "warning",
          "Interview Scheduled",
          this.formatDateTime(app.interview_date),
          "bi-calendar"
        );
      }

      // Interview completed
      if (app.interview_completed_at) {
        timeline += this.getTimelineItem(
          "success",
          "Interview Completed",
          this.formatDateTime(app.interview_completed_at),
          "bi-check-circle"
        );
      }

      // Approved
      if (app.approved_at) {
        timeline += this.getTimelineItem(
          "success",
          "Application Approved",
          this.formatDateTime(app.approved_at),
          "bi-check-circle-fill"
        );
      }

      // Rejected
      if (app.rejected_at) {
        timeline += this.getTimelineItem(
          "danger",
          "Application Rejected",
          this.formatDateTime(app.rejected_at),
          "bi-x-circle-fill"
        );
      }

      // Refund processed
      if (app.refund_processed) {
        timeline += this.getTimelineItem(
          "info",
          "Refund Processed",
          this.formatDateTime(app.refund_date),
          "bi-currency-dollar"
        );
      }

      $("#workflowTimeline").html(`<div class="timeline">${timeline}</div>`);

      // Animate timeline
      gsap.from(".timeline-item", {
        duration: 0.4,
        x: -20,
        opacity: 0,
        stagger: 0.1,
        ease: "power2.out",
        delay: 0.3,
      });
    },

    // Get timeline item HTML
    getTimelineItem: function (type, title, time, icon) {
      return `
                <div class="timeline-item">
                    <div class="timeline-icon ${type}">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <strong>${title}</strong>
                        <br>
                        <small class="text-muted">${time}</small>
                    </div>
                </div>
            `;
    },

    // Show verify referral modal
    showVerifyReferralModal: function (referralNum) {
      const app = this.application;
      const name = app[`referral_${referralNum}_name`];
      const memberId = app[`referral_${referralNum}_member_id`];

      const content = `
                <div class="alert alert-info">
                    <strong>Referral ${referralNum}</strong><br>
                    Name: ${name}<br>
                    Member ID / IC: ${memberId}
                </div>
                <p>Confirm that you have verified this referral member is active and in good standing.</p>
            `;

      $("#referralVerifyContent").html(content);
      $("#referralVerifyNotes").val("");
      $("#confirmVerifyReferralBtn").data("referral", referralNum);
      $("#verifyReferralModal").modal("show");
    },

    // Verify referral
    verifyReferral: function () {
      const self = this;
      const referralNum = $("#confirmVerifyReferralBtn").data("referral");
      const notes = $("#referralVerifyNotes").val();

      TempleCore.showLoading(true);

      TempleAPI.post(
        `/member-applications/${this.applicationId}/verify-referral`,
        {
          referral_number: referralNum,
          notes: notes,
        }
      )
        .done(function (response) {
          if (response.success) {
            $("#verifyReferralModal").modal("hide");
            TempleCore.showToast("Referral verified successfully", "success");
            self.loadApplicationData();
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to verify referral", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Schedule interview
    scheduleInterview: function () {
      const self = this;
      const dateTime = $("#interviewDateTime").val();
      const notes = $("#interviewNotes").val();

      if (!dateTime) {
        TempleCore.showToast("Please select date and time", "warning");
        return;
      }

      TempleCore.showLoading(true);

      TempleAPI.post(
        `/member-applications/${this.applicationId}/schedule-interview`,
        {
          interview_date: dateTime,
          interview_notes: notes,
        }
      )
        .done(function (response) {
          if (response.success) {
            $("#scheduleInterviewModal").modal("hide");
            TempleCore.showToast("Interview scheduled successfully", "success");
            self.loadApplicationData();
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to schedule interview", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Complete interview
    completeInterview: function () {
      const self = this;
      const notes = $("#completeInterviewNotes").val();

      if (!notes) {
        TempleCore.showToast("Please enter interview notes", "warning");
        return;
      }

      TempleCore.showLoading(true);

      TempleAPI.post(
        `/member-applications/${this.applicationId}/complete-interview`,
        {
          interview_notes: notes,
        }
      )
        .done(function (response) {
          if (response.success) {
            $("#completeInterviewModal").modal("hide");
            TempleCore.showToast("Interview marked as completed", "success");
            self.loadApplicationData();
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to complete interview", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Approve application
    approveApplication: function () {
      const self = this;
      const committee = $("#approvedByCommittee").val();
      const remarks = $("#approvalRemarks").val();

      if (!committee) {
        TempleCore.showToast("Please enter committee member names", "warning");
        return;
      }

      TempleCore.showLoading(true);

      TempleAPI.post(`/member-applications/${this.applicationId}/approve`, {
        approved_by_committee: committee,
        approval_remarks: remarks,
      })
        .done(function (response) {
          if (response.success) {
            $("#approveApplicationModal").modal("hide");

            // Success animation
            gsap.to(".application-verify-page", {
              duration: 0.5,
              scale: 0.95,
              opacity: 0,
              onComplete: function () {
                TempleCore.showToast(
                  `Application approved! Permanent ID: ${response.data.permanent_member_id}`,
                  "success"
                );

                setTimeout(function () {
                  TempleRouter.navigate("members/application");
                }, 2000);
              },
            });
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to approve application", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Reject application
    rejectApplication: function () {
      const self = this;
      const reason = $("#rejectionReason").val();
      const remarks = $("#rejectionRemarks").val();
      const refundEligible = $("#refundEligible").is(":checked");
      const refundAmount = $("#refundAmount").val();
      const refundMethod = $("#refundMethod").val();

      if (!reason || !remarks) {
        TempleCore.showToast("Please fill all required fields", "warning");
        return;
      }

      TempleCore.showLoading(true);

      const data = {
        rejection_reason: reason,
        rejection_remarks: remarks,
        refund_eligible: refundEligible,
      };

      if (refundEligible) {
        data.refund_amount = refundAmount;
        data.refund_method = refundMethod;
      }

      TempleAPI.post(`/member-applications/${this.applicationId}/reject`, data)
        .done(function (response) {
          if (response.success) {
            $("#rejectApplicationModal").modal("hide");
            TempleCore.showToast("Application rejected", "success");
            self.loadApplicationData();
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to reject application", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Show process refund modal
    showProcessRefundModal: function () {
      const app = this.application;
      $("#processRefundAmount").val(app.refund_amount);
      const today = new Date().toISOString().split("T")[0];
      $("#refundDate").val(today);
      $("#processRefundModal").modal("show");
    },

    // Process refund
    processRefund: function () {
      const self = this;
      const date = $("#refundDate").val();
      const reference = $("#refundReference").val();
      const notes = $("#refundProcessNotes").val();

      if (!date || !reference) {
        TempleCore.showToast("Please fill all required fields", "warning");
        return;
      }

      TempleCore.showLoading(true);

      TempleAPI.post(
        `/member-applications/${this.applicationId}/process-refund`,
        {
          refund_date: date,
          refund_reference: reference,
          refund_remarks: notes,
        }
      )
        .done(function (response) {
          if (response.success) {
            $("#processRefundModal").modal("hide");
            TempleCore.showToast("Refund processed successfully", "success");
            self.loadApplicationData();
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to process refund", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Change status
    changeStatus: function (newStatus) {
      const self = this;

      TempleCore.showLoading(true);

      TempleAPI.post(
        `/member-applications/${this.applicationId}/change-status`,
        {
          status: newStatus,
        }
      )
        .done(function (response) {
          if (response.success) {
            TempleCore.showToast("Status updated successfully", "success");
            self.loadApplicationData();
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to update status", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Save admin notes
    saveAdminNotes: function () {
      const notes = $("#adminNotes").val();

      // Animate save button
      gsap.to("#saveNotesBtn", {
        duration: 0.2,
        scale: 0.95,
        yoyo: true,
        repeat: 1,
      });

      TempleCore.showToast("Notes saved", "success");
    },

    // View full application
    viewFullApplication: function () {
      TempleRouter.navigate("members/application-view", {
        id: this.applicationId,
      });
    },

    // Get status configuration
    getStatusConfig: function (status) {
      const configs = {
        PENDING_SUBMISSION: {
          label: "Draft",
          class: "bg-secondary text-white",
        },
        SUBMITTED: { label: "Submitted", class: "bg-info text-white" },
        UNDER_VERIFICATION: {
          label: "Under Verification",
          class: "bg-warning text-dark",
        },
        INTERVIEW_SCHEDULED: {
          label: "Interview Scheduled",
          class: "bg-primary text-white",
        },
        PENDING_APPROVAL: {
          label: "Pending Approval",
          class: "bg-warning text-dark",
        },
        APPROVED: { label: "Approved", class: "bg-success text-white" },
        REJECTED: { label: "Rejected", class: "bg-danger text-white" },
      };

      return (
        configs[status] || { label: status, class: "bg-secondary text-white" }
      );
    },

    // Format date
    formatDate: function (dateString) {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },

    // Format date time
    formatDateTime: function (dateString) {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  };
})(jQuery, window);
