// // frontend/js/pages/members/application-form.js
// // Member Application Form - Interactive Multi-Step Form with GSAP + AOS
// // COMPLETE VERSION WITH DYNAMIC REFERRALS

// (function ($, window) {
//   "use strict";

//   window.MembersApplicationFormPage = {
//     currentUser: null,
//     currentStep: 1,
//     totalSteps: 5,
//     formData: {},
//     memberTypes: [],
//     countries: [],
//     applicationId: null,
//     isEditMode: false,

//     // NEW: Dynamic referrals
//     referrals: [
//       { id: 1, name: "", member_id: "", user_id: null, validated: false },
//       { id: 2, name: "", member_id: "", user_id: null, validated: false },
//     ],
//     nextReferralId: 3,

//     // Initialize page
//     init: function (params) {
//       this.currentUser = JSON.parse(
//         localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || "{}"
//       );
//       this.applicationId = params?.id || null;
//       this.isEditMode = !!this.applicationId;

//       this.render();
//       this.bindEvents();
//       this.loadInitialData();
//       this.initAnimations();
//     },

//     // Initialize GSAP & AOS animations + Interactive Features
//     initAnimations: function () {
//       const self = this;

//       // Initialize AOS
//       if (typeof AOS !== "undefined") {
//         AOS.init({
//           duration: 600,
//           easing: "ease-in-out",
//           once: false,
//         });
//       }

//       // GSAP: Animate page header
//       gsap.from(".page-header", {
//         duration: 0.6,
//         y: -30,
//         opacity: 0,
//         ease: "power2.out",
//       });

//       // GSAP: Animate progress bar
//       gsap.from(".progress-container", {
//         duration: 0.8,
//         scale: 0.9,
//         opacity: 0,
//         ease: "back.out(1.7)",
//         delay: 0.2,
//       });

//       // GSAP: Animate first step
//       gsap.from("#step1", {
//         duration: 0.6,
//         x: 50,
//         opacity: 0,
//         ease: "power2.out",
//         delay: 0.4,
//       });

//       // Add interactive features after animation
//       setTimeout(() => {
//         this.initInteractiveFeatures();
//       }, 500);
//     },

//     // Initialize all interactive features
//     initInteractiveFeatures: function () {
//       this.addFloatingLabels();
//       this.addInputAnimations();
//       this.addButtonRipples();
//       this.addCardHoverEffects();
//       this.addProgressStepClicks();
//       this.addDragDropUpload();
//       this.addRealTimeValidation();
//       this.addTooltips();
//       this.addCharacterCounters();
//     },

//     // Floating labels effect
//     addFloatingLabels: function () {
//       $("input, textarea, select").each(function () {
//         const $input = $(this);
//         const $label = $input.closest(".mb-3").find("label");

//         if (
//           $label.length &&
//           $input.attr("type") !== "file" &&
//           $input.attr("type") !== "checkbox"
//         ) {
//           $label.css({
//             position: "relative",
//             transition: "all 0.3s ease",
//             "pointer-events": "none",
//           });

//           $input.on("focus", function () {
//             gsap.to($label, {
//               duration: 0.3,
//               scale: 0.85,
//               color: "#0d6efd",
//               ease: "power2.out",
//             });
//           });

//           $input.on("blur", function () {
//             if (!$(this).val()) {
//               gsap.to($label, {
//                 duration: 0.3,
//                 scale: 1,
//                 color: "#212529",
//                 ease: "power2.out",
//               });
//             }
//           });
//         }
//       });
//     },

//     // Input field animations
//     addInputAnimations: function () {
//       $("input, textarea, select").each(function () {
//         const $input = $(this);

//         $input.on("focus", function () {
//           gsap.to(this, {
//             duration: 0.3,
//             scale: 1.02,
//             boxShadow: "0 0 0 0.25rem rgba(13, 110, 253, 0.25)",
//             ease: "power2.out",
//           });
//         });

//         $input.on("blur", function () {
//           gsap.to(this, {
//             duration: 0.3,
//             scale: 1,
//             boxShadow: "none",
//             ease: "power2.out",
//           });
//         });

//         // Typing animation
//         $input.on("input", function () {
//           gsap.fromTo(
//             this,
//             { borderColor: "#0d6efd" },
//             { borderColor: "#dee2e6", duration: 0.5 }
//           );
//         });
//       });
//     },

//     // Button ripple effects
//     addButtonRipples: function () {
//       $("button, .btn").on("click", function (e) {
//         const $button = $(this);
//         const $ripple = $('<span class="ripple"></span>');

//         const diameter = Math.max($button.outerWidth(), $button.outerHeight());
//         const radius = diameter / 2;

//         $ripple.css({
//           width: diameter,
//           height: diameter,
//           left: e.pageX - $button.offset().left - radius,
//           top: e.pageY - $button.offset().top - radius,
//         });

//         $button.append($ripple);

//         gsap.fromTo(
//           $ripple,
//           { scale: 0, opacity: 1 },
//           {
//             scale: 2,
//             opacity: 0,
//             duration: 0.6,
//             ease: "power2.out",
//             onComplete: () => $ripple.remove(),
//           }
//         );
//       });
//     },

//     // Card hover effects
//     addCardHoverEffects: function () {
//       $(".card").each(function () {
//         const $card = $(this);

//         $card.on("mouseenter", function () {
//           gsap.to(this, {
//             duration: 0.3,
//             y: -5,
//             boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
//             ease: "power2.out",
//           });
//         });

//         $card.on("mouseleave", function () {
//           gsap.to(this, {
//             duration: 0.3,
//             y: 0,
//             boxShadow: "0 0.125rem 0.25rem rgba(0,0,0,0.075)",
//             ease: "power2.out",
//           });
//         });
//       });
//     },

//     // Clickable progress steps
//     addProgressStepClicks: function () {
//       const self = this;

//       $(".progress-step").each(function (index) {
//         const stepNum = index + 1;
//         const $step = $(this);

//         $step.css("cursor", "pointer");

//         $step.on("mouseenter", function () {
//           if (stepNum !== self.currentStep) {
//             gsap.to($step.find(".step-icon"), {
//               duration: 0.3,
//               scale: 1.1,
//               ease: "back.out(1.7)",
//             });
//           }
//         });

//         $step.on("mouseleave", function () {
//           if (stepNum !== self.currentStep) {
//             gsap.to($step.find(".step-icon"), {
//               duration: 0.3,
//               scale: 1,
//               ease: "power2.out",
//             });
//           }
//         });

//         $step.on("click", function () {
//           // Only allow clicking completed or current steps
//           if (stepNum < self.currentStep) {
//             self.goToStep(stepNum);
//           } else if (stepNum === self.currentStep + 1) {
//             self.nextStep();
//           }
//         });
//       });
//     },

//     // Drag and drop file upload
//     addDragDropUpload: function () {
//       const self = this;

//       $('input[type="file"]').each(function () {
//         const $input = $(this);
//         const $parent = $input.closest(".upload-section, .mb-3");

//         $parent.on("dragover dragenter", function (e) {
//           e.preventDefault();
//           e.stopPropagation();
//           $(this).addClass("drag-over");

//           gsap.to(this, {
//             duration: 0.3,
//             backgroundColor: "#e7f3ff",
//             scale: 1.02,
//             ease: "power2.out",
//           });
//         });

//         $parent.on("dragleave dragend drop", function (e) {
//           e.preventDefault();
//           e.stopPropagation();
//           $(this).removeClass("drag-over");

//           gsap.to(this, {
//             duration: 0.3,
//             backgroundColor: "transparent",
//             scale: 1,
//             ease: "power2.out",
//           });
//         });

//         $parent.on("drop", function (e) {
//           const files = e.originalEvent.dataTransfer.files;
//           if (files.length > 0) {
//             $input[0].files = files;
//             $input.trigger("change");

//             // Success animation
//             gsap.fromTo(
//               $parent,
//               { borderColor: "#198754" },
//               { borderColor: "#dee2e6", duration: 1 }
//             );
//           }
//         });
//       });
//     },

//     // Real-time validation with animations
//     addRealTimeValidation: function () {
//       // Email validation
//       $("#email").on(
//         "blur",
//         function () {
//           const email = $(this).val();
//           const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//           if (email && !emailRegex.test(email)) {
//             $(this).addClass("is-invalid");
//             gsap.fromTo(
//               this,
//               { x: -5 },
//               { x: 0, duration: 0.1, repeat: 3, ease: "power1.inOut" }
//             );
//           } else if (email) {
//             $(this).removeClass("is-invalid").addClass("is-valid");
//             this.showSuccessIcon($(this));
//           }
//         }.bind(this)
//       );

//       // Mobile number validation
//       $("#mobile_no").on("input", function () {
//         const mobile = $(this).val().replace(/\D/g, "");
//         if (mobile.length >= 8 && mobile.length <= 15) {
//           $(this).removeClass("is-invalid").addClass("is-valid");
//         }
//       });

//       // Required field validation
//       $("input[required], select[required], textarea[required]").on(
//         "blur",
//         function () {
//           if ($(this).val()) {
//             $(this).removeClass("is-invalid");
//           }
//         }
//       );
//     },

//     // Show success icon
//     showSuccessIcon: function ($input) {
//       if ($input.next(".success-icon").length === 0) {
//         const $icon = $('<i class="bi bi-check-circle-fill success-icon"></i>');
//         $icon.css({
//           position: "absolute",
//           right: "10px",
//           top: "50%",
//           transform: "translateY(-50%)",
//           color: "#198754",
//           fontSize: "1.2rem",
//         });
//         $input.parent().css("position", "relative").append($icon);

//         gsap.from($icon[0], {
//           scale: 0,
//           rotation: 180,
//           duration: 0.5,
//           ease: "back.out(1.7)",
//         });
//       }
//     },

//     // Add tooltips
//     addTooltips: function () {
//       // Add help icons with tooltips
//       const tooltips = {
//         "#id_proof_number":
//           "Enter the number exactly as shown on your ID document",
//         "#payment_reference":
//           "Enter the transaction ID or receipt number from your payment",
//       };

//       Object.keys(tooltips).forEach((selector) => {
//         const $field = $(selector);
//         const $label = $field.closest(".mb-3").find("label");

//         const $helpIcon = $(
//           '<i class="bi bi-question-circle-fill ms-2 help-icon"></i>'
//         );
//         $helpIcon.css({
//           color: "#6c757d",
//           cursor: "pointer",
//           fontSize: "0.9rem",
//         });

//         $label.append($helpIcon);

//         $helpIcon.on("mouseenter", function () {
//           const $tooltip = $(
//             `<div class="custom-tooltip">${tooltips[selector]}</div>`
//           );
//           $("body").append($tooltip);

//           const iconPos = $(this).offset();
//           $tooltip.css({
//             position: "absolute",
//             left: iconPos.left + 20,
//             top: iconPos.top - 10,
//             background: "#212529",
//             color: "white",
//             padding: "8px 12px",
//             borderRadius: "6px",
//             fontSize: "0.85rem",
//             maxWidth: "250px",
//             zIndex: 9999,
//             boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
//           });

//           gsap.from($tooltip[0], {
//             opacity: 0,
//             y: -10,
//             duration: 0.3,
//             ease: "power2.out",
//           });
//         });

//         $helpIcon.on("mouseleave", function () {
//           gsap.to(".custom-tooltip", {
//             opacity: 0,
//             y: -10,
//             duration: 0.2,
//             onComplete: () => $(".custom-tooltip").remove(),
//           });
//         });
//       });
//     },

//     // Character counters
//     addCharacterCounters: function () {
//       const fieldsWithCounter = [
//         { selector: "#address", max: 500 },
//         { selector: "#name", max: 100 },
//       ];

//       fieldsWithCounter.forEach((field) => {
//         const $input = $(field.selector);
//         const $counter = $(
//           `<small class="char-counter text-muted">0 / ${field.max}</small>`
//         );
//         $input.after($counter);

//         $input.on("input", function () {
//           const length = $(this).val().length;
//           $counter.text(`${length} / ${field.max}`);

//           if (length > field.max * 0.9) {
//             $counter.css("color", "#dc3545");
//           } else if (length > field.max * 0.7) {
//             $counter.css("color", "#ffc107");
//           } else {
//             $counter.css("color", "#6c757d");
//           }

//           gsap.fromTo($counter[0], { scale: 1.2 }, { scale: 1, duration: 0.2 });
//         });
//       });
//     },

//     // Go to specific step
//     goToStep: function (stepNum) {
//       // Save current step data
//       this.saveStepData(this.currentStep);

//       // Update step
//       this.currentStep = stepNum;
//       this.showStep(this.currentStep);
//       this.updateProgress();

//       // Animate transition
//       gsap.from(`#step${this.currentStep}`, {
//         duration: 0.5,
//         x: stepNum > this.currentStep ? 50 : -50,
//         opacity: 0,
//         ease: "power2.out",
//       });
//     },

//     // NEW: Render dynamic referrals section
//     renderReferralsStep: function () {
//       const self = this;
//       let html = `
//             <div class="card border-0 shadow-sm" data-aos="fade-up">
//                 <div class="card-body p-4">
//                     <h4 class="mb-3">
//                         <i class="bi bi-people"></i> Referral Information / 推荐人信息
//                     </h4>
//                     <div class="alert alert-info">
//                         <i class="bi bi-info-circle"></i> 
//                         <strong>Required / 必填:</strong> You must provide at least 2 active members as referrals. / 您必须提供至少2位现有会员作为推荐人。
//                     </div>
                    
//                     <div id="referralsContainer">
//         `;

//       this.referrals.forEach((referral, index) => {
//         html += this.getReferralCardHTML(referral, index);
//       });

//       html += `
//                     </div>
                    
//                     <!-- Add Referral Button -->
//                     <button type="button" class="btn btn-outline-primary mt-3" id="addReferralBtn">
//                         <i class="bi bi-plus-circle"></i> Add Another Referral / 添加推荐人
//                     </button>
//                 </div>
//             </div>
//         `;

//       return html;
//     },

//     // NEW: Get single referral card HTML
//     getReferralCardHTML: function (referral, index) {
//       const canRemove = this.referrals.length > 2 && index >= 2;
//       const validatedBadge = referral.validated
//         ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle"></i> Validated / 已验证</span>'
//         : "";

//       return `
//             <div class="referral-card mb-3 p-3 border rounded ${referral.validated ? "validated" : ""
//         }" data-referral-id="${referral.id}">
//                 <div class="d-flex justify-content-between align-items-start mb-3">
//                     <h5 class="mb-0">
//                         <i class="bi bi-person-check"></i> Referral ${index + 1
//         } / 推荐人 ${index + 1}
//                         ${index < 2 ? '<span class="text-danger">*</span>' : ""}
//                         ${validatedBadge}
//                     </h5>
//                     ${canRemove
//           ? `
//                         <button type="button" class="btn btn-sm btn-outline-danger remove-referral-btn" data-referral-id="${referral.id}">
//                             <i class="bi bi-trash"></i>
//                         </button>
//                     `
//           : ""
//         }
//                 </div>
                
//                 <div class="row">
//                     <div class="col-md-6 mb-3">
//                         <label class="form-label">Full Name / 全名 ${index < 2 ? '<span class="text-danger">*</span>' : ""
//         }</label>
//                         <input type="text" 
//                                class="form-control referral-name" 
//                                data-referral-id="${referral.id}"
//                                value="${referral.name}"
//                                ${index < 2 ? "required" : ""}>
//                     </div>
                    
//                     <div class="col-md-6 mb-3">
//                         <label class="form-label">
//                             Member ID / IC Number / 会员编号 / 身份证号 ${index < 2
//           ? '<span class="text-danger">*</span>'
//           : ""
//         }
//                         </label>
//                         <div class="input-group">
//                             <input type="text" 
//                                    class="form-control referral-member-id" 
//                                    data-referral-id="${referral.id}"
//                                    value="${referral.member_id}"
//                                    ${referral.validated ? "readonly" : ""}
//                                    ${index < 2 ? "required" : ""}>
//                             <button class="btn btn-outline-primary validate-referral-btn" 
//                                     type="button" 
//                                     data-referral-id="${referral.id}"
//                                     ${referral.validated ? "disabled" : ""}>
//                                 <i class="bi bi-search"></i> Validate / 验证
//                             </button>
//                         </div>
//                         <div class="validation-msg mt-2" data-referral-id="${referral.id
//         }"></div>
//                     </div>
//                 </div>
//             </div>
//         `;
//     },

//     // NEW: Add referral
//     addReferral: function () {
//       const newReferral = {
//         id: this.nextReferralId++,
//         name: "",
//         member_id: "",
//         user_id: null,
//         validated: false,
//       };

//       this.referrals.push(newReferral);
//       this.reRenderReferrals();

//       const newCard = $(`.referral-card[data-referral-id="${newReferral.id}"]`);
//       gsap.from(newCard, {
//         duration: 0.5,
//         y: 30,
//         opacity: 0,
//         scale: 0.95,
//         ease: "back.out(1.7)",
//       });

//       TempleCore.showToast("Referral added / 已添加推荐人", "success");
//     },

//     // NEW: Remove referral
//     removeReferral: function (referralId) {
//       const index = this.referrals.findIndex((r) => r.id === referralId);

//       if (index < 2) {
//         TempleCore.showToast(
//           "Cannot remove mandatory referrals / 不能删除必填推荐人",
//           "warning"
//         );
//         return;
//       }

//       const card = $(`.referral-card[data-referral-id="${referralId}"]`);
//       gsap.to(card, {
//         duration: 0.3,
//         x: 50,
//         opacity: 0,
//         onComplete: () => {
//           this.referrals.splice(index, 1);
//           this.reRenderReferrals();
//           TempleCore.showToast("Referral removed / 已删除推荐人", "info");
//         },
//       });
//     },

//     // NEW: Update referral field
//     updateReferralField: function (referralId, field, value) {
//       const referral = this.referrals.find((r) => r.id === referralId);
//       if (referral) {
//         referral[field] = value;

//         if (field === "member_id" && referral.validated) {
//           referral.validated = false;
//           referral.user_id = null;
//           this.reRenderReferrals();
//         }
//       }
//     },

//     // NEW: Validate referral (dynamic version)
//     validateReferralDynamic: function (referralId) {
//       const self = this;
//       const referral = this.referrals.find((r) => r.id === referralId);

//       if (!referral || !referral.member_id) {
//         TempleCore.showToast("Please enter Member ID or IC Number", "warning");
//         return;
//       }

//       const btn = $(`.validate-referral-btn[data-referral-id="${referralId}"]`);
//       const msgContainer = $(
//         `.validation-msg[data-referral-id="${referralId}"]`
//       );

//       btn
//         .prop("disabled", true)
//         .html('<span class="spinner-border spinner-border-sm"></span>');
//       msgContainer.html("");

//       TempleAPI.get("/member-applications/validate-referral", {
//         member_id: referral.member_id,
//       })
//         .done(function (response) {
//           if (response.success && response.data.valid) {
//             referral.validated = true;
//             referral.user_id = response.data.user_id;
//             referral.name = response.data.name;

//             msgContainer.html(`
//                     <div class="text-success">
//                         <i class="bi bi-check-circle-fill"></i> 
//                         Verified: ${response.data.name}
//                     </div>
//                 `);

//             self.reRenderReferrals();

//             gsap.from(msgContainer, {
//               duration: 0.5,
//               scale: 0.8,
//               opacity: 0,
//               ease: "back.out(1.7)",
//             });

//             TempleCore.showToast("Referral validated successfully", "success");
//           } else {
//             msgContainer.html(`
//                     <div class="text-danger">
//                         <i class="bi bi-x-circle-fill"></i> 
//                         ${response.message || "Invalid or inactive member"}
//                     </div>
//                 `);
//             TempleCore.showToast("Referral validation failed", "error");
//           }
//         })
//         .fail(function (xhr) {
//           msgContainer.html(`
//                 <div class="text-danger">
//                     <i class="bi bi-x-circle-fill"></i> 
//                     Validation failed. Please try again.
//                 </div>
//             `);
//           TempleCore.showToast("Validation failed", "error");
//         })
//         .always(function () {
//           btn
//             .prop("disabled", false)
//             .html('<i class="bi bi-search"></i> Validate / 验证');
//         });
//     },

//     // NEW: Re-render referrals container
//     reRenderReferrals: function () {
//       let html = "";
//       this.referrals.forEach((referral, index) => {
//         html += this.getReferralCardHTML(referral, index);
//       });
//       $("#referralsContainer").html(html);
//     },

//     // Render page HTML
//     render: function () {
//       const title = this.isEditMode
//         ? "Edit Application"
//         : "New Member Application";

//       const html = `
// <style>
//     .page-header,
//     .progress-container,
//     .form-step {
//         opacity: 1 !important;
//     }
    
//     .gsap-animating {
//         opacity: 0;
//     }
    
//     .form-step {
//         animation: fadeIn 0.5s ease-in-out;
//     }
    
//     .referral-card {
//         background: #f8f9fa;
//         transition: all 0.3s ease;
//         position: relative;
//     }

//     .referral-card:hover {
//         background: #e9ecef;
//     }

//     .referral-card.validated {
//         border-color: #28a745 !important;
//         background: #d4edda;
//     }

//     .validation-msg {
//         font-size: 0.9rem;
//     }

//     .remove-referral-btn {
//         position: absolute;
//         top: 15px;
//         right: 15px;
//     }
// </style>

// <div class="application-form-page">
//     <!-- Page Header -->
//     <div class="page-header mb-4">
//         <div class="row align-items-center">
//             <div class="col-md-6">
//                 <h1 class="h2">
//                     <i class="bi bi-file-earmark-person"></i> ${title}
//                 </h1>
//                 <nav aria-label="breadcrumb">
//                     <ol class="breadcrumb">
//                         <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
//                         <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
//                         <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members/application'); return false;">Applications</a></li>
//                         <li class="breadcrumb-item active">${title}</li>
//                     </ol>
//                 </nav>
//             </div>
//             <div class="col-md-6 text-md-end">
//                 <button class="btn btn-secondary" onclick="TempleRouter.navigate('members/application')">
//                     <i class="bi bi-arrow-left"></i> Back to Applications
//                 </button>
//             </div>
//         </div>
//     </div>

//     <!-- Progress Indicator -->
//     <div class="progress-container card border-0 shadow-sm mb-4" data-aos="fade-down" style="translate: none; rotate: none; scale: none; opacity: 1; transform: translate(0px, -100px) scale(0.9812, 0.9812); margin-top:10rem;">
//         <div class="card-body">
//             <div class="row">
//                 ${this.getProgressStepsHTML()}
//             </div>
//             <div class="progress mt-3" style="height: 8px;">
//                 <div class="progress-bar progress-bar-striped progress-bar-animated" 
//                      id="progressBar" 
//                      role="progressbar" 
//                      style="width: 20%">
//                 </div>
//             </div>
//         </div>
//     </div>

//     <!-- Form Container -->
//     <div class="row justify-content-center">
//         <div class="col-lg-10">
//             <form id="applicationForm" novalidate>
                
//                 <!-- Step 1: Personal Information -->
//                 <div class="form-step" id="step1" style="display: block;">
//                     <div class="card border-0 shadow-sm" data-aos="fade-up">
//                         <div class="card-body p-4">
//                             <h4 class="mb-4">
//                                 <i class="bi bi-person-circle"></i> Personal Information / 个人信息
//                             </h4>
                            
//                             <div class="row">
//                                 <div class="col-md-6 mb-3">
//                                     <label class="form-label">Full Name / 全名 <span class="text-danger">*</span></label>
//                                     <input type="text" class="form-control" id="name" name="name" required>
//                                     <div class="invalid-feedback">Please enter your full name</div>
//                                 </div>
                                
//                                 <div class="col-md-6 mb-3">
//                                     <label class="form-label">Email / 电子邮件 <span class="text-danger">*</span></label>
//                                     <input type="email" class="form-control" id="email" name="email" required>
//                                     <div class="invalid-feedback">Please enter a valid email</div>
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-3 mb-3">
//                                     <label class="form-label">Mobile Code / 国家代码</label>
//                                     <select class="form-select" id="mobile_code" name="mobile_code">
//                                         <option value="+60">+60 (Malaysia)</option>
//                                         <option value="+65">+65 (Singapore)</option>
//                                         <option value="+86">+86 (China)</option>
//                                         <option value="+91">+91 (India)</option>
//                                         <option value="+1">+1 (USA/Canada)</option>
//                                         <option value="+44">+44 (UK)</option>
//                                     </select>
//                                 </div>
                                
//                                 <div class="col-md-5 mb-3">
//                                     <label class="form-label">Mobile Number / 手机号码 <span class="text-danger">*</span></label>
//                                     <input type="tel" class="form-control" id="mobile_no" name="mobile_no" required>
//                                     <div class="invalid-feedback">Please enter mobile number</div>
//                                 </div>
                                
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Alternate Mobile / 备用手机</label>
//                                     <input type="tel" class="form-control" id="alternate_mobile" name="alternate_mobile">
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Date of Birth / 出生日期</label>
//                                     <input type="date" class="form-control" id="date_of_birth" name="date_of_birth">
//                                 </div>
                                
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Gender / 性别</label>
//                                     <select class="form-select" id="gender" name="gender">
//                                         <option value="">Select Gender / 选择性别</option>
//                                         <option value="MALE">Male / 男</option>
//                                         <option value="FEMALE">Female / 女</option>
//                                         <option value="OTHER">Other / 其他</option>
//                                     </select>
//                                 </div>
                                
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Member Type / 会员类型</label>
//                                     <select class="form-select" id="member_type_id" name="member_type_id">
//                                         <option value="">Select Type / 选择类型</option>
//                                     </select>
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-12 mb-3">
//                                     <label class="form-label">Address / 地址</label>
//                                     <textarea class="form-control" id="address" name="address" rows="2"></textarea>
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-3 mb-3">
//                                     <label class="form-label">City / 城市</label>
//                                     <input type="text" class="form-control" id="city" name="city">
//                                 </div>
                                
//                                 <div class="col-md-3 mb-3">
//                                     <label class="form-label">State / 州属</label>
//                                     <input type="text" class="form-control" id="state" name="state">
//                                 </div>
                                
//                                 <div class="col-md-3 mb-3">
//                                     <label class="form-label">Country / 国家</label>
//                                     <select class="form-select" id="country" name="country">
//                                         <option value="">Select Country / 选择国家</option>
//                                     </select>
//                                 </div>
                                
//                                 <div class="col-md-3 mb-3">
//                                     <label class="form-label">Pincode / 邮编</label>
//                                     <input type="text" class="form-control" id="pincode" name="pincode">
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Occupation / 职业</label>
//                                     <input type="text" class="form-control" id="occupation" name="occupation">
//                                 </div>
                                
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Qualification / 学历</label>
//                                     <input type="text" class="form-control" id="qualification" name="qualification">
//                                 </div>
                                
//                                 <div class="col-md-4 mb-3">
//                                     <label class="form-label">Annual Income / 年收入</label>
//                                     <select class="form-select" id="annual_income" name="annual_income">
//                                         <option value="">Select Range / 选择范围</option>
//                                         <option value="Below RM 30,000">Below RM 30,000 / 低于 RM 30,000</option>
//                                         <option value="RM 30,000 - RM 50,000">RM 30,000 - RM 50,000</option>
//                                         <option value="RM 50,000 - RM 100,000">RM 50,000 - RM 100,000</option>
//                                         <option value="Above RM 100,000">Above RM 100,000 / 超过 RM 100,000</option>
//                                     </select>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <!-- Step 2: Referral Information (DYNAMIC) -->
//                 <div class="form-step" id="step2" style="display: none;">
//                     ${this.renderReferralsStep()}
//                 </div>

//                 <!-- Step 3: ID Proof & Documents -->
//                 <div class="form-step" id="step3" style="display: none;">
//                     <div class="card border-0 shadow-sm" data-aos="fade-up">
//                         <div class="card-body p-4">
//                             <h4 class="mb-3">
//                                 <i class="bi bi-file-earmark-text"></i> Documents Upload / 文件上传
//                             </h4>
//                             <div class="alert alert-warning">
//                                 <i class="bi bi-exclamation-triangle"></i> 
//                                 Please upload clear copies of your documents. / 请上传清晰的文件副本。
//                             </div>
                            
//                             <!-- ID Proof Type -->
//                             <div class="row mb-4">
//                                 <div class="col-md-6 mb-3">
//                                     <label class="form-label">ID Proof Type / 身份证件类型 <span class="text-danger">*</span></label>
//                                     <select class="form-select" id="id_proof_type" name="id_proof_type" required>
//                                         <option value="">Select Type / 选择类型</option>
//                                         <option value="IC">IC (Identity Card) / 身份证</option>
//                                         <option value="Passport">Passport / 护照</option>
//                                         <option value="Driving License">Driving License / 驾驶执照</option>
//                                     </select>
//                                     <div class="invalid-feedback">Please select ID proof type</div>
//                                 </div>
                                
//                                 <div class="col-md-6 mb-3">
//                                     <label class="form-label">ID Proof Number / 身份证件号码 <span class="text-danger">*</span></label>
//                                     <input type="text" class="form-control" id="id_proof_number" name="id_proof_number" required>
//                                     <div class="invalid-feedback">Please enter ID proof number</div>
//                                 </div>
//                             </div>
                            
//                             <!-- IC Copy Upload -->
//                             <div class="upload-section mb-4 p-3 border rounded">
//                                <h5 class="mb-3">
//     <i class="bi bi-card-image"></i> IC Copy / 身份证副本
// </h5>
//                                 <div class="row">
//                                     <div class="col-md-8">
//                                         <input type="file" 
//                                                class="form-control" 
//                                                id="id_proof_document" 
//                                                name="id_proof_document" 
//                                                accept="image/*,application/pdf"
//                                                >
//                                         <div class="form-text">Accepted / 接受格式: JPG, PNG, PDF (Max 5MB)</div>
//                                         <div class="invalid-feedback">Please upload ID proof document</div>
//                                     </div>
//                                     <div class="col-md-4">
//                                         <div id="icPreview" class="document-preview"></div>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                             <!-- Photo Upload -->
//                             <div class="upload-section p-3 border rounded">
//                                <h5 class="mb-3">
//     <i class="bi bi-person-badge"></i> Passport Photo / 护照照片
// </h5>
//                                 <div class="row">
//                                     <div class="col-md-8">
//                                         <input type="file" 
//                                                class="form-control" 
//                                                id="profile_photo" 
//                                                name="profile_photo" 
//                                                accept="image/*"
//                                                >
//                                         <div class="form-text">Passport-sized photo / 护照尺寸照片 (JPG, PNG - Max 2MB)</div>
//                                         <div class="invalid-feedback">Please upload your photo</div>
//                                     </div>
//                                     <div class="col-md-4">
//                                         <div id="photoPreview" class="photo-preview"></div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <!-- Step 4: Payment Information -->
//                 <div class="form-step" id="step4" style="display: none;">
//                     <div class="card border-0 shadow-sm" data-aos="fade-up">
//                         <div class="card-body p-4">
//                             <h4 class="mb-3">
//                                 <i class="bi bi-credit-card"></i> Application Entry Fee / 申请入会费
//                             </h4>
                            
//                             <div class="alert alert-success mb-4">
//                                 <div class="d-flex align-items-center">
//                                     <i class="bi bi-info-circle fs-4 me-3"></i>
//                                     <div>
//                                         <strong>Entry Fee / 入会费: RM 51.00</strong>
//                                         <p class="mb-0 small">This is a one-time application processing fee. / 这是一次性申请处理费。</p>
//                                     </div>
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-6 mb-3">
//                                     <label class="form-label">Payment Method / 付款方式 <span class="text-danger">*</span></label>
//                                     <select class="form-select" id="payment_method" name="payment_method" required>
//                                         <option value="">Select Method / 选择方式</option>
//                                         <option value="Cash">Cash / 现金</option>
//                                         <option value="Bank Transfer">Bank Transfer / 银行转账</option>
//                                         <option value="Online Banking">Online Banking / 网上银行</option>
//                                         <option value="Credit/Debit Card">Credit/Debit Card / 信用卡/借记卡</option>
//                                     </select>
//                                     <div class="invalid-feedback">Please select payment method</div>
//                                 </div>
                                
//                                 <div class="col-md-6 mb-3">
//                                     <label class="form-label">Payment Date / 付款日期 <span class="text-danger">*</span></label>
//                                     <input type="date" class="form-control" id="payment_date" name="payment_date" required>
//                                     <div class="invalid-feedback">Please select payment date</div>
//                                 </div>
//                             </div>
                            
//                             <div class="row">
//                                 <div class="col-md-12 mb-3">
//                                     <label class="form-label">Payment Reference / Transaction ID / 付款参考号 / 交易编号 <span class="text-danger">*</span></label>
//                                     <input type="text" class="form-control" id="payment_reference" name="payment_reference" required>
//                                     <div class="form-text">Enter receipt number, transaction ID, or reference number / 输入收据号、交易编号或参考号</div>
//                                     <div class="invalid-feedback">Please enter payment reference</div>
//                                 </div>
//                             </div>
                            
//                             <!-- Payment Confirmation -->
//                             <div class="form-check mt-3">
//                                 <input class="form-check-input" type="checkbox" id="paymentConfirm" required>
//                                 <label class="form-check-label" for="paymentConfirm">
//                                     I confirm that I have paid the application entry fee of <strong>RM 51.00</strong><br>
//                                     我确认已支付申请入会费 <strong>RM 51.00</strong>
//                                 </label>
//                                 <div class="invalid-feedback">Please confirm payment</div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <!-- Step 5: Review & Submit -->
//                 <div class="form-step" id="step5" style="display: none;">
//                     <div class="card border-0 shadow-sm" data-aos="fade-up">
//                         <div class="card-body p-4">
//                             <h4 class="mb-4">
//                                 <i class="bi bi-check-circle"></i> Review & Submit / 审核并提交
//                             </h4>
                            
//                             <div id="reviewContent">
//                                 <!-- Review content will be dynamically generated -->
//                             </div>
                            
//                             <div class="alert alert-info mt-4">
//                                 <i class="bi bi-info-circle"></i> 
//                                 By submitting this application, you agree that all information provided is accurate and complete.<br>
//                                 提交此申请即表示您同意所提供的所有信息准确无误且完整。
//                             </div>
                            
//                             <div class="form-check mt-3">
//                                 <input class="form-check-input" type="checkbox" id="finalConfirm" required>
//                                 <label class="form-check-label" for="finalConfirm">
//                                     I confirm that all information provided is accurate and I agree to the terms and conditions.<br>
//                                     我确认所提供的所有信息准确无误，并同意条款和条件。
//                                 </label>
//                                 <div class="invalid-feedback">Please confirm to proceed</div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <!-- Navigation Buttons -->
//                 <div class="card border-0 shadow-sm mt-4" data-aos="fade-up">
//                     <div class="card-body">
//                         <div class="d-flex justify-content-between">
//                             <button type="button" class="btn btn-secondary" id="prevBtn" style="display: none;">
//                                 <i class="bi bi-arrow-left"></i> Previous / 上一步
//                             </button>
//                             <div></div>
//                             <div class="d-flex gap-2">
//                                 <button type="button" class="btn btn-outline-secondary" id="saveDraftBtn">
//                                     <i class="bi bi-save"></i> Save as Draft / 保存草稿
//                                 </button>
//                                 <button type="button" class="btn btn-primary" id="nextBtn">
//                                     Next / 下一步 <i class="bi bi-arrow-right"></i>
//                                 </button>
//                                 <button type="submit" class="btn btn-success" id="submitBtn" style="display: none;">
//                                     <i class="bi bi-check-circle"></i> Submit Application / 提交申请
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </form>
//         </div>
//     </div>
// </div>

// <!-- Custom Styles -->
// <style>
//     .form-step {
//         animation: fadeIn 0.5s ease-in-out;
//     }
    
//     @keyframes fadeIn {
//         from { opacity: 0; transform: translateX(20px); }
//         to { opacity: 1; transform: translateX(0); }
//     }
    
//     .progress-step {
//         text-align: center;
//         position: relative;
//     }
    
//     .step-icon {
//         width: 50px;
//         height: 50px;
//         border-radius: 50%;
//         background: #e9ecef;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         margin: 0 auto 10px;
//         font-size: 1.2rem;
//         transition: all 0.3s ease;
//         border: 3px solid #e9ecef;
//     }
    
//     .progress-step.active .step-icon {
//         background: var(--bs-primary);
//         color: white;
//         border-color: var(--bs-primary);
//         transform: scale(1.1);
//     }
    
//     .progress-step.completed .step-icon {
//         background: var(--bs-success);
//         color: white;
//         border-color: var(--bs-success);
//     }
    
//     .step-title {
//         font-size: 0.85rem;
//         font-weight: 500;
//         color: #6c757d;
//     }
    
//     .progress-step.active .step-title {
//         color: var(--bs-primary);
//         font-weight: 600;
//     }
    
//     .referral-section {
//         background: #f8f9fa;
//         transition: all 0.3s ease;
//     }
    
//     .referral-section:hover {
//         background: #e9ecef;
//     }
    
//     .upload-section {
//         background: #f8f9fa;
//     }
    
//     .document-preview, .photo-preview {
//         width: 100%;
//         min-height: 150px;
//         border: 2px dashed #dee2e6;
//         border-radius: 8px;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         overflow: hidden;
//         background: white;
//     }
    
//     .document-preview img, .photo-preview img {
//         max-width: 100%;
//         max-height: 150px;
//         object-fit: cover;
//     }
    
//     .validation-success {
//         color: var(--bs-success);
//         font-size: 0.9rem;
//     }
    
//     .validation-error {
//         color: var(--bs-danger);
//         font-size: 0.9rem;
//     }
    
//     .review-section {
//         background: #f8f9fa;
//         padding: 1rem;
//         border-radius: 8px;
//         margin-bottom: 1rem;
//     }
    
//     .review-section h6 {
//         color: var(--bs-primary);
//         margin-bottom: 0.75rem;
//     }
    
//     .review-item {
//         display: flex;
//         padding: 0.5rem 0;
//         border-bottom: 1px solid #dee2e6;
//     }
    
//     .review-item:last-child {
//         border-bottom: none;
//     }
    
//     .review-label {
//         font-weight: 500;
//         width: 40%;
//         color: #6c757d;
//     }
    
//     .review-value {
//         width: 60%;
//     }
// </style>
//             `;

//       $("#page-container").html(html);
//     },

//     // Get progress steps HTML
//     getProgressStepsHTML: function () {
//       const steps = [
//         {
//           number: 1,
//           title: "Personal Info",
//           titleCN: "个人信息",
//           icon: "bi-person",
//         },
//         { number: 2, title: "Referrals", titleCN: "推荐人", icon: "bi-people" },
//         {
//           number: 3,
//           title: "Documents",
//           titleCN: "文件",
//           icon: "bi-file-earmark",
//         },
//         {
//           number: 4,
//           title: "Payment",
//           titleCN: "付款",
//           icon: "bi-credit-card",
//         },
//         {
//           number: 5,
//           title: "Review",
//           titleCN: "审核",
//           icon: "bi-check-circle",
//         },
//       ];

//       let html = "";
//       steps.forEach((step, index) => {
//         const isActive = step.number === this.currentStep;
//         const isCompleted = step.number < this.currentStep;

//         html += `
//             <div class="col progress-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""
//           }">
//                 <div class="step-icon">
//                     <i class="bi ${isCompleted ? "bi-check-lg" : step.icon
//           }"></i>
//                 </div>
//                 <div class="step-title">${step.title}<br><small>${step.titleCN
//           }</small></div>
//             </div>
//         `;
//       });

//       return html;
//     },

//     // Bind events
//     bindEvents: function () {
//       const self = this;

//       // Navigation buttons
//       $("#nextBtn").on("click", function () {
//         self.nextStep();
//       });

//       $("#prevBtn").on("click", function () {
//         self.prevStep();
//       });

//       // Form submission
//       $("#applicationForm").on("submit", function (e) {
//         e.preventDefault();
//         self.submitApplication();
//       });

//       // Save draft
//       $("#saveDraftBtn").on("click", function () {
//         self.saveDraft();
//       });

//       // File previews
//       $("#id_proof_document").on("change", function () {
//         self.previewDocument(this, "#icPreview");
//       });

//       $("#profile_photo").on("change", function () {
//         self.previewPhoto(this, "#photoPreview");
//       });

//       // Set default payment date to today
//       const today = new Date().toISOString().split("T")[0];
//       $("#payment_date").val(today);

//       // NEW: Bind dynamic referral events
//       $(document).on("click", "#addReferralBtn", function () {
//         self.addReferral();
//       });

//       $(document).on("click", ".remove-referral-btn", function () {
//         const referralId = $(this).data("referral-id");
//         self.removeReferral(referralId);
//       });

//       $(document).on("click", ".validate-referral-btn", function () {
//         const referralId = $(this).data("referral-id");
//         self.validateReferralDynamic(referralId);
//       });

//       $(document).on("input", ".referral-name", function () {
//         const referralId = $(this).data("referral-id");
//         const value = $(this).val();
//         self.updateReferralField(referralId, "name", value);
//       });

//       $(document).on("input", ".referral-member-id", function () {
//         const referralId = $(this).data("referral-id");
//         const value = $(this).val();
//         self.updateReferralField(referralId, "member_id", value);
//       });
//     },

//     // Load initial data
//     loadInitialData: function () {
//       this.loadMemberTypes();
//       this.loadCountries();

//       if (this.isEditMode) {
//         this.loadApplicationData();
//       }
//     },

//     // Load member types
//     loadMemberTypes: function () {
//       const self = this;

//       TempleAPI.get("/member-types").done(function (response) {
//         if (response.success) {
//           self.memberTypes = response.data;

//           let options = '<option value="">Select Type</option>';
//           response.data.forEach(function (type) {
//             options += `<option value="${type.id}">${type.display_name}</option>`;
//           });

//           $("#member_type_id").html(options);
//         }
//       });
//     },

//     // Load countries
//     loadCountries: function () {
//       const countries = [
//         "Malaysia",
//         "Singapore",
//         "China",
//         "Hong Kong",
//         "Taiwan",
//         "India",
//         "Thailand",
//         "Indonesia",
//         "Philippines",
//         "Vietnam",
//         "United States",
//         "United Kingdom",
//         "Australia",
//         "Canada",
//       ];

//       let options = '<option value="">Select Country</option>';
//       countries.forEach(function (country) {
//         options += `<option value="${country}">${country}</option>`;
//       });

//       $("#country").html(options);
//       $("#country").val("Malaysia"); // Default
//     },

//     // Next step
//     nextStep: function () {
//       // Validate current step
//       if (!this.validateStep(this.currentStep)) {
//         return;
//       }

//       // Save current step data BEFORE moving
//       this.saveStepData(this.currentStep);

//       console.log(
//         "Form data after saving step " + this.currentStep + ":",
//         this.formData
//       );

//       // Move to next step
//       this.currentStep++;
//       this.showStep(this.currentStep);

//       // Update progress
//       this.updateProgress();

//       // Animate step transition
//       gsap.from(`#step${this.currentStep}`, {
//         duration: 0.5,
//         x: 50,
//         opacity: 0,
//         ease: "power2.out",
//       });
//     },

//     // Previous step
//     prevStep: function () {
//       this.currentStep--;
//       this.showStep(this.currentStep);
//       this.updateProgress();

//       // Animate step transition
//       gsap.from(`#step${this.currentStep}`, {
//         duration: 0.5,
//         x: -50,
//         opacity: 0,
//         ease: "power2.out",
//       });
//     },

//     // Show specific step
//     showStep: function (step) {
//       // Hide all steps
//       $(".form-step").hide();

//       // Show current step
//       $(`#step${step}`).show();

//       // Populate fields with saved data when going back
//       if (step < 5) {
//         this.populateStepFields(step);
//       }

//       // Update buttons
//       if (step === 1) {
//         $("#prevBtn").hide();
//       } else {
//         $("#prevBtn").show();
//       }

//       if (step === this.totalSteps) {
//         $("#nextBtn").hide();
//         $("#submitBtn").show();
//         this.generateReview();
//       } else {
//         $("#nextBtn").show();
//         $("#submitBtn").hide();
//       }

//       // Scroll to top
//       window.scrollTo({ top: 0, behavior: "smooth" });
//     },

//     // Populate step fields with saved data
//     populateStepFields: function (step) {
//       const self = this;
//       const stepElement = $(`#step${step}`);

//       stepElement.find("input, select, textarea").each(function () {
//         const name = $(this).attr("name");
//         if (
//           name &&
//           self.formData[name] !== undefined &&
//           self.formData[name] !== null
//         ) {
//           if ($(this).attr("type") === "checkbox") {
//             $(this).prop("checked", self.formData[name]);
//           } else if ($(this).attr("type") !== "file") {
//             $(this).val(self.formData[name]);
//           }
//         }
//       });
//     },

//     // Update progress bar and indicators
//     updateProgress: function () {
//       const progress = (this.currentStep / this.totalSteps) * 100;

//       // Animate progress bar
//       gsap.to("#progressBar", {
//         duration: 0.5,
//         width: `${progress}%`,
//         ease: "power2.out",
//       });

//       // Update step indicators
//       $(".progress-step").each(
//         function (index) {
//           const stepNum = index + 1;
//           $(this).removeClass("active completed");

//           if (stepNum === this.currentStep) {
//             $(this).addClass("active");
//           } else if (stepNum < this.currentStep) {
//             $(this).addClass("completed");
//           }
//         }.bind(this)
//       );

//       // Animate active step icon
//       gsap.from(".progress-step.active .step-icon", {
//         duration: 0.5,
//         scale: 0.8,
//         ease: "back.out(1.7)",
//       });
//     },

//     // Validate step
//     validateStep: function (step) {
//       let isValid = true;
//       const stepElement = $(`#step${step}`);

//       // Get required fields in current step
//       stepElement
//         .find("input[required], select[required], textarea[required]")
//         .each(function () {
//           if (!this.checkValidity()) {
//             isValid = false;
//             $(this).addClass("is-invalid");
//           } else {
//             $(this).removeClass("is-invalid");
//           }
//         });

//       // Step 2: Validate referrals (UPDATED for dynamic referrals)
//       if (step === 2) {
//         // Check minimum 2 referrals
//         if (this.referrals.length < 2) {
//           TempleCore.showToast("At least 2 referrals are required", "warning");
//           isValid = false;
//         }

//         // Check first 2 referrals are validated
//         const mandatoryReferrals = this.referrals.slice(0, 2);
//         const allMandatoryValidated = mandatoryReferrals.every(
//           (r) => r.validated && r.user_id
//         );

//         if (!allMandatoryValidated) {
//           TempleCore.showToast(
//             "Please validate the first 2 mandatory referrals",
//             "warning"
//           );
//           isValid = false;
//         }

//         // Check all referrals have names
//         const allHaveNames = this.referrals.every((r) => r.name.trim() !== "");
//         if (!allHaveNames) {
//           TempleCore.showToast(
//             "Please enter names for all referrals",
//             "warning"
//           );
//           isValid = false;
//         }
//       }

//       // Step 3: Validate file uploads
//       if (step === 3) {
//         // if (
//         //   !$("#id_proof_document")[0].files.length &&
//         //   !this.formData.id_proof_document
//         // ) {
//         //   $("#id_proof_document").addClass("is-invalid");
//         //   isValid = false;
//         // }
//         // if (
//         //   !$("#profile_photo")[0].files.length &&
//         //   !this.formData.profile_photo
//         // ) {
//         //   $("#profile_photo").addClass("is-invalid");
//         //   isValid = false;
//         // }
//       }

//       // Step 4: Validate payment confirmation
//       if (step === 4) {
//         if (!$("#paymentConfirm").is(":checked")) {
//           $("#paymentConfirm").addClass("is-invalid");
//           isValid = false;
//         }
//       }

//       if (!isValid) {
//         // Animate validation error
//         gsap.fromTo(
//           ".is-invalid",
//           { x: -10 },
//           { x: 0, duration: 0.1, repeat: 3, ease: "power1.inOut" }
//         );

//         TempleCore.showToast("Please fill all required fields", "warning");
//       }

//       return isValid;
//     },

//     // Save step data
//     saveStepData: function (step) {
//       const self = this;
//       const stepElement = $(`#step${step}`);

//       stepElement.find("input, select, textarea").each(function () {
//         const name = $(this).attr("name");
//         if (name) {
//           if ($(this).attr("type") === "checkbox") {
//             self.formData[name] = $(this).is(":checked");
//           } else if ($(this).attr("type") === "file") {
//             if ($(this)[0].files.length > 0) {
//               self.formData[name] = $(this)[0].files[0];
//             }
//           } else {
//             self.formData[name] = $(this).val();
//           }
//         }
//       });

//       console.log(`Step ${step} data saved:`, self.formData);
//     },

//     // Preview document
//     previewDocument: function (input, container) {
//       if (input.files && input.files[0]) {
//         const file = input.files[0];
//         const reader = new FileReader();

//         reader.onload = function (e) {
//           if (file.type.includes("pdf")) {
//             $(container).html(`
//               <div class="text-center p-3">
//                 <i class="bi bi-file-pdf fs-1 text-danger"></i>
//                 <p class="small mt-2 mb-0">${file.name}</p>
//               </div>
//             `);
//           } else {
//             $(container).html(`<img src="${e.target.result}" alt="Document">`);
//           }

//           // Animate preview
//           gsap.from(container, {
//             duration: 0.5,
//             scale: 0.8,
//             opacity: 0,
//             ease: "back.out(1.7)",
//           });
//         };

//         reader.readAsDataURL(file);
//       }
//     },

//     // Preview photo
//     previewPhoto: function (input, container) {
//       if (input.files && input.files[0]) {
//         const file = input.files[0];
//         const reader = new FileReader();

//         reader.onload = function (e) {
//           $(container).html(
//             `<img src="${e.target.result}" alt="Photo" style="border-radius: 8px;">`
//           );

//           // Animate preview
//           gsap.from(container, {
//             duration: 0.5,
//             scale: 0.8,
//             opacity: 0,
//             ease: "back.out(1.7)",
//           });
//         };

//         reader.readAsDataURL(file);
//       }
//     },

//     // Get member type name by ID
//     getMemberTypeName: function (memberTypeId) {
//       if (!this.memberTypes || this.memberTypes.length === 0) {
//         return "-";
//       }
//       const memberType = this.memberTypes.find(
//         (type) => type.id === memberTypeId
//       );
//       return memberType ? memberType.display_name : "-";
//     },

//     // Generate review content
//     generateReview: function () {
//       // Save step 4 data first
//       this.saveStepData(4);

//       console.log("Generating review with data:", this.formData);

//       // Helper function to safely get values
//       const getValue = (key, defaultValue = "-") => {
//         return this.formData[key] || defaultValue;
//       };

//       // Generate referrals review HTML
//       let referralsHTML = "";
//       this.referrals.forEach((referral, index) => {
//         referralsHTML += `
//           <div class="review-item">
//             <div class="review-label">Referral ${index + 1}:</div>
//             <div class="review-value">
//               <strong>${referral.name || "-"}</strong><br>
//               <small class="text-muted">Member ID: ${referral.member_id || "-"
//           }</small>
//               ${referral.validated
//             ? '<br><span class="badge bg-success">Verified</span>'
//             : ""
//           }
//             </div>
//           </div>
//         `;
//       });

//       const html = `
//         <div class="review-section">
//           <h6><i class="bi bi-person-circle"></i> Personal Information</h6>
//           <div class="review-item">
//             <div class="review-label">Full Name:</div>
//             <div class="review-value">${getValue("name")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Email:</div>
//             <div class="review-value">${getValue("email")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Mobile:</div>
//             <div class="review-value">${getValue(
//         "mobile_code",
//         "+60"
//       )} ${getValue("mobile_no")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Date of Birth:</div>
//             <div class="review-value">${getValue("date_of_birth")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Gender:</div>
//             <div class="review-value">${getValue("gender")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Member Type:</div>
//             <div class="review-value">${getValue("member_type_id")
//           ? this.getMemberTypeName(getValue("member_type_id"))
//           : "-"
//         }</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Address:</div>
//             <div class="review-value">
//               ${getValue("address")}<br>
//               ${getValue("city")}, ${getValue("state")} ${getValue(
//           "pincode"
//         )}<br>
//               ${getValue("country")}
//             </div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Occupation:</div>
//             <div class="review-value">${getValue("occupation")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Qualification:</div>
//             <div class="review-value">${getValue("qualification")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Annual Income:</div>
//             <div class="review-value">${getValue("annual_income")}</div>
//           </div>
//         </div>
        
//         <div class="review-section">
//           <h6><i class="bi bi-people"></i> Referral Information</h6>
//           ${referralsHTML}
//         </div>
        
//         <div class="review-section">
//           <h6><i class="bi bi-file-earmark-text"></i> Documents</h6>
//           <div class="review-item">
//             <div class="review-label">ID Proof Type:</div>
//             <div class="review-value">${getValue("id_proof_type")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">ID Proof Number:</div>
//             <div class="review-value">${getValue("id_proof_number")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Documents Uploaded:</div>
//             <div class="review-value">
//               ${this.formData.id_proof_document
//           ? '<i class="bi bi-check-circle text-success"></i> IC Copy<br>'
//           : '<i class="bi bi-x-circle text-danger"></i> IC Copy Not Uploaded<br>'
//         }
//               ${this.formData.profile_photo
//           ? '<i class="bi bi-check-circle text-success"></i> Passport Photo'
//           : '<i class="bi bi-x-circle text-danger"></i> Photo Not Uploaded'
//         }
//             </div>
//           </div>
//         </div>
        
//         <div class="review-section">
//           <h6><i class="bi bi-credit-card"></i> Payment Information</h6>
//           <div class="review-item">
//             <div class="review-label">Entry Fee:</div>
//             <div class="review-value"><strong class="text-success">RM 51.00</strong></div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Payment Method:</div>
//             <div class="review-value">${getValue("payment_method")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Payment Reference:</div>
//             <div class="review-value">${getValue("payment_reference")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Payment Date:</div>
//             <div class="review-value">${getValue("payment_date")}</div>
//           </div>
//           <div class="review-item">
//             <div class="review-label">Payment Status:</div>
//             <div class="review-value">
//               <span class="badge bg-success">
//                 <i class="bi bi-check-circle"></i> Confirmed
//               </span>
//             </div>
//           </div>
//         </div>
//       `;

//       $("#reviewContent").html(html);

//       // Animate review sections
//       gsap.from(".review-section", {
//         duration: 0.5,
//         y: 20,
//         opacity: 0,
//         stagger: 0.1,
//         ease: "power2.out",
//       });
//     },

//     // Submit application (UPDATED for dynamic referrals)
//     // Submit application (UPDATED for dynamic referrals)
//     submitApplication: function () {
//       const self = this;

//       // Save step 4 data before submission
//       this.saveStepData(4);

//       // Validate final confirmation
//       if (!$("#finalConfirm").is(":checked")) {
//         $("#finalConfirm").addClass("is-invalid");
//         TempleCore.showToast("Please confirm to proceed", "warning");
//         return;
//       }

//       // Prepare form data for submission
//       const formData = new FormData();

//       // Add all text fields
//       Object.keys(this.formData).forEach(function (key) {
//         const value = self.formData[key];

//         if (value instanceof File) {
//           formData.append(key, value);
//         } else if (value !== null && value !== undefined && value !== "") {
//           formData.append(key, String(value));
//         }
//       });

//       // CRITICAL: Send referral data in BOTH formats for backend compatibility

//       // Format 1: Flat structure for first 2 referrals (for database columns)
//       const ref1 = this.referrals[0];
//       const ref2 = this.referrals[1];

//       if (ref1) {
//         formData.set("referral_1_name", ref1.name || "");
//         formData.set("referral_1_member_id", ref1.member_id || "");
//         if (ref1.user_id) {
//           formData.set("referral_1_user_id", ref1.user_id);
//         }
//       }

//       if (ref2) {
//         formData.set("referral_2_name", ref2.name || "");
//         formData.set("referral_2_member_id", ref2.member_id || "");
//         if (ref2.user_id) {
//           formData.set("referral_2_user_id", ref2.user_id);
//         }
//       }

//       // Format 2: Array structure for all referrals (for backend validation)
//       this.referrals.forEach((referral, index) => {
//         formData.append(
//           `referrals[${index}][referral_name]`,
//           referral.name || ""
//         );
//         formData.append(
//           `referrals[${index}][referral_member_id]`,
//           referral.member_id || ""
//         );
//         if (referral.user_id) {
//           formData.append(
//             `referrals[${index}][referral_user_id]`,
//             referral.user_id
//           );
//         }
//       });

//       console.log("Submitting referrals:", {
//         ref1: ref1,
//         ref2: ref2,
//         allReferrals: this.referrals,
//       });

//       // Set entry fee and payment status
//       formData.append("entry_fee_amount", "51.00");
//       formData.append("entry_fee_paid", "1");
//       formData.append("status", "SUBMITTED");

//       TempleCore.showLoading(true);

//       // Animate submit button
//       gsap.to("#submitBtn", {
//         duration: 0.3,
//         scale: 0.95,
//       });

//       const endpoint = this.isEditMode
//         ? "/member-applications/" + this.applicationId
//         : "/member-applications";

//       $.ajax({
//         url: TempleAPI.getBaseUrl() + endpoint,
//         method: "POST",
//         data: formData,
//         processData: false,
//         contentType: false,
//         headers: {
//           Authorization:
//             "Bearer " + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
//           "X-Temple-ID": TempleAPI.getTempleId(),
//         },
//         success: function (response) {
//           if (response.success) {
//             // Success animation
//             gsap.to(".application-form-page", {
//               duration: 0.5,
//               scale: 0.95,
//               opacity: 0,
//               onComplete: function () {
//                 TempleCore.showToast(
//                   "Application submitted successfully! Temporary ID: " +
//                   response.data.temp_member_id,
//                   "success"
//                 );

//                 setTimeout(function () {
//                   TempleRouter.navigate("members/application");
//                 }, 1500);
//               },
//             });
//           }
//         },
//         error: function (xhr) {
//           let errorMsg = "Failed to submit application";
//           if (xhr.responseJSON && xhr.responseJSON.message) {
//             errorMsg = xhr.responseJSON.message;
//           }
//           TempleCore.showToast(errorMsg, "error");
//           console.error("Submission error:", xhr.responseJSON || xhr);
//         },
//         complete: function () {
//           TempleCore.showLoading(false);
//           gsap.to("#submitBtn", {
//             duration: 0.3,
//             scale: 1,
//           });
//         },
//       });
//     },

//     // Save as draft
//     saveDraft: function () {
//       const self = this;

//       // Save current step data
//       this.saveStepData(this.currentStep);

//       // Prepare data
//       const formData = new FormData();
//       Object.keys(this.formData).forEach(function (key) {
//         if (self.formData[key] !== null && self.formData[key] !== undefined) {
//           if (self.formData[key] instanceof File) {
//             formData.append(key, self.formData[key]);
//           } else {
//             formData.append(key, self.formData[key]);
//           }
//         }
//       });

//       formData.append("status", "PENDING_SUBMISSION");

//       TempleCore.showLoading(true);

//       $.ajax({
//         url: TempleAPI.getBaseUrl() + "/member-applications",
//         method: "POST",
//         data: formData,
//         processData: false,
//         contentType: false,
//         headers: {
//           Authorization:
//             "Bearer " + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
//           "X-Temple-ID": TempleAPI.getTempleId(),
//         },
//         success: function (response) {
//           if (response.success) {
//             TempleCore.showToast("Draft saved successfully", "success");
//             self.applicationId = response.data.id;
//             self.isEditMode = true;
//           }
//         },
//         error: function (xhr) {
//           TempleCore.showToast("Failed to save draft", "error");
//         },
//         complete: function () {
//           TempleCore.showLoading(false);
//         },
//       });
//     },

//     // Load application data (for edit mode)
//     loadApplicationData: function () {
//       const self = this;

//       TempleCore.showLoading(true);

//       TempleAPI.get("/member-applications/" + this.applicationId)
//         .done(function (response) {
//           if (response.success) {
//             const data = response.data;

//             // Populate form fields
//             Object.keys(data).forEach(function (key) {
//               const field = $(`#${key}`);
//               if (field.length) {
//                 field.val(data[key]);
//               }
//             });

//             self.formData = data;
//           }
//         })
//         .fail(function (xhr) {
//           TempleCore.showToast("Failed to load application data", "error");
//         })
//         .always(function () {
//           TempleCore.showLoading(false);
//         });
//     },
//   };
// })(jQuery, window);





// frontend/js/pages/members/application-form.js
// Member Application Form - Interactive Multi-Step Form with GSAP + AOS
// COMPLETE VERSION WITH DYNAMIC REFERRALS
// UPDATED: Frontend label changes (Identity Card Type, IC/Passport Number, Postal Code, RM income, Life Member only)

(function ($, window) {
  "use strict";

  window.MembersApplicationFormPage = {
    currentUser: null,
    currentStep: 1,
    totalSteps: 5,
    formData: {},
    memberTypes: [],
    countries: [],
    applicationId: null,
    isEditMode: false,

    // NEW: Dynamic referrals
    referrals: [
      { id: 1, name: "", member_id: "", user_id: null, validated: false },
      { id: 2, name: "", member_id: "", user_id: null, validated: false },
    ],
    nextReferralId: 3,

    // Initialize page
    init: function (params) {
      this.currentUser = JSON.parse(
        localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || "{}"
      );
      this.applicationId = params?.id || null;
      this.isEditMode = !!this.applicationId;

      this.render();
      this.bindEvents();
      this.loadInitialData();
      this.initAnimations();
    },

    // Initialize GSAP & AOS animations + Interactive Features
    initAnimations: function () {
      const self = this;

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

      // GSAP: Animate progress bar
      gsap.from(".progress-container", {
        duration: 0.8,
        scale: 0.9,
        opacity: 0,
        ease: "back.out(1.7)",
        delay: 0.2,
      });

      // GSAP: Animate first step
      gsap.from("#step1", {
        duration: 0.6,
        x: 50,
        opacity: 0,
        ease: "power2.out",
        delay: 0.4,
      });

      // Add interactive features after animation
      setTimeout(() => {
        this.initInteractiveFeatures();
      }, 500);
    },

    // Initialize all interactive features
    initInteractiveFeatures: function () {
      this.addFloatingLabels();
      this.addInputAnimations();
      this.addButtonRipples();
      this.addCardHoverEffects();
      this.addProgressStepClicks();
      this.addDragDropUpload();
      this.addRealTimeValidation();
      this.addTooltips();
      this.addCharacterCounters();
    },

    // Floating labels effect
    addFloatingLabels: function () {
      $("input, textarea, select").each(function () {
        const $input = $(this);
        const $label = $input.closest(".mb-3").find("label");

        if (
          $label.length &&
          $input.attr("type") !== "file" &&
          $input.attr("type") !== "checkbox"
        ) {
          $label.css({
            position: "relative",
            transition: "all 0.3s ease",
            "pointer-events": "none",
          });

          $input.on("focus", function () {
            gsap.to($label, {
              duration: 0.3,
              scale: 0.85,
              color: "#0d6efd",
              ease: "power2.out",
            });
          });

          $input.on("blur", function () {
            if (!$(this).val()) {
              gsap.to($label, {
                duration: 0.3,
                scale: 1,
                color: "#212529",
                ease: "power2.out",
              });
            }
          });
        }
      });
    },

    // Input field animations
    addInputAnimations: function () {
      $("input, textarea, select").each(function () {
        const $input = $(this);

        $input.on("focus", function () {
          gsap.to(this, {
            duration: 0.3,
            scale: 1.02,
            boxShadow: "0 0 0 0.25rem rgba(13, 110, 253, 0.25)",
            ease: "power2.out",
          });
        });

        $input.on("blur", function () {
          gsap.to(this, {
            duration: 0.3,
            scale: 1,
            boxShadow: "none",
            ease: "power2.out",
          });
        });

        // Typing animation
        $input.on("input", function () {
          gsap.fromTo(
            this,
            { borderColor: "#0d6efd" },
            { borderColor: "#dee2e6", duration: 0.5 }
          );
        });
      });
    },

    // Button ripple effects
    addButtonRipples: function () {
      $("button, .btn").on("click", function (e) {
        const $button = $(this);
        const $ripple = $('<span class="ripple"></span>');

        const diameter = Math.max($button.outerWidth(), $button.outerHeight());
        const radius = diameter / 2;

        $ripple.css({
          width: diameter,
          height: diameter,
          left: e.pageX - $button.offset().left - radius,
          top: e.pageY - $button.offset().top - radius,
        });

        $button.append($ripple);

        gsap.fromTo(
          $ripple,
          { scale: 0, opacity: 1 },
          {
            scale: 2,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => $ripple.remove(),
          }
        );
      });
    },

    // Card hover effects
    addCardHoverEffects: function () {
      $(".card").each(function () {
        const $card = $(this);

        $card.on("mouseenter", function () {
          gsap.to(this, {
            duration: 0.3,
            y: -5,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            ease: "power2.out",
          });
        });

        $card.on("mouseleave", function () {
          gsap.to(this, {
            duration: 0.3,
            y: 0,
            boxShadow: "0 0.125rem 0.25rem rgba(0,0,0,0.075)",
            ease: "power2.out",
          });
        });
      });
    },

    // Clickable progress steps
    addProgressStepClicks: function () {
      const self = this;

      $(".progress-step").each(function (index) {
        const stepNum = index + 1;
        const $step = $(this);

        $step.css("cursor", "pointer");

        $step.on("mouseenter", function () {
          if (stepNum !== self.currentStep) {
            gsap.to($step.find(".step-icon"), {
              duration: 0.3,
              scale: 1.1,
              ease: "back.out(1.7)",
            });
          }
        });

        $step.on("mouseleave", function () {
          if (stepNum !== self.currentStep) {
            gsap.to($step.find(".step-icon"), {
              duration: 0.3,
              scale: 1,
              ease: "power2.out",
            });
          }
        });

        $step.on("click", function () {
          if (stepNum < self.currentStep) {
            self.goToStep(stepNum);
          } else if (stepNum === self.currentStep + 1) {
            self.nextStep();
          }
        });
      });
    },

    // Drag and drop file upload
    addDragDropUpload: function () {
      const self = this;

      $('input[type="file"]').each(function () {
        const $input = $(this);
        const $parent = $input.closest(".upload-section, .mb-3");

        $parent.on("dragover dragenter", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).addClass("drag-over");

          gsap.to(this, {
            duration: 0.3,
            backgroundColor: "#e7f3ff",
            scale: 1.02,
            ease: "power2.out",
          });
        });

        $parent.on("dragleave dragend drop", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("drag-over");

          gsap.to(this, {
            duration: 0.3,
            backgroundColor: "transparent",
            scale: 1,
            ease: "power2.out",
          });
        });

        $parent.on("drop", function (e) {
          const files = e.originalEvent.dataTransfer.files;
          if (files.length > 0) {
            $input[0].files = files;
            $input.trigger("change");

            gsap.fromTo(
              $parent,
              { borderColor: "#198754" },
              { borderColor: "#dee2e6", duration: 1 }
            );
          }
        });
      });
    },

    // Real-time validation with animations
    addRealTimeValidation: function () {
      // Email validation
      $("#email").on(
        "blur",
        function () {
          const email = $(this).val();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          if (email && !emailRegex.test(email)) {
            $(this).addClass("is-invalid");
            gsap.fromTo(
              this,
              { x: -5 },
              { x: 0, duration: 0.1, repeat: 3, ease: "power1.inOut" }
            );
          } else if (email) {
            $(this).removeClass("is-invalid").addClass("is-valid");
            this.showSuccessIcon($(this));
          }
        }.bind(this)
      );

      // Mobile number validation
      $("#mobile_no").on("input", function () {
        const mobile = $(this).val().replace(/\D/g, "");
        if (mobile.length >= 8 && mobile.length <= 15) {
          $(this).removeClass("is-invalid").addClass("is-valid");
        }
      });

      // Required field validation
      $("input[required], select[required], textarea[required]").on(
        "blur",
        function () {
          if ($(this).val()) {
            $(this).removeClass("is-invalid");
          }
        }
      );
    },

    // Show success icon
    showSuccessIcon: function ($input) {
      if ($input.next(".success-icon").length === 0) {
        const $icon = $('<i class="bi bi-check-circle-fill success-icon"></i>');
        $icon.css({
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#198754",
          fontSize: "1.2rem",
        });
        $input.parent().css("position", "relative").append($icon);

        gsap.from($icon[0], {
          scale: 0,
          rotation: 180,
          duration: 0.5,
          ease: "back.out(1.7)",
        });
      }
    },

    // Add tooltips
    addTooltips: function () {
      const tooltips = {
        "#id_proof_number":
          "Enter the number exactly as shown on your IC or Passport",
        "#payment_reference":
          "Enter the transaction ID or receipt number from your payment",
      };

      Object.keys(tooltips).forEach((selector) => {
        const $field = $(selector);
        const $label = $field.closest(".mb-3").find("label");

        const $helpIcon = $(
          '<i class="bi bi-question-circle-fill ms-2 help-icon"></i>'
        );
        $helpIcon.css({
          color: "#6c757d",
          cursor: "pointer",
          fontSize: "0.9rem",
        });

        $label.append($helpIcon);

        $helpIcon.on("mouseenter", function () {
          const $tooltip = $(
            `<div class="custom-tooltip">${tooltips[selector]}</div>`
          );
          $("body").append($tooltip);

          const iconPos = $(this).offset();
          $tooltip.css({
            position: "absolute",
            left: iconPos.left + 20,
            top: iconPos.top - 10,
            background: "#212529",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            maxWidth: "250px",
            zIndex: 9999,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          });

          gsap.from($tooltip[0], {
            opacity: 0,
            y: -10,
            duration: 0.3,
            ease: "power2.out",
          });
        });

        $helpIcon.on("mouseleave", function () {
          gsap.to(".custom-tooltip", {
            opacity: 0,
            y: -10,
            duration: 0.2,
            onComplete: () => $(".custom-tooltip").remove(),
          });
        });
      });
    },

    // Character counters
    addCharacterCounters: function () {
      const fieldsWithCounter = [
        { selector: "#address", max: 500 },
        { selector: "#name", max: 100 },
      ];

      fieldsWithCounter.forEach((field) => {
        const $input = $(field.selector);
        const $counter = $(
          `<small class="char-counter text-muted">0 / ${field.max}</small>`
        );
        $input.after($counter);

        $input.on("input", function () {
          const length = $(this).val().length;
          $counter.text(`${length} / ${field.max}`);

          if (length > field.max * 0.9) {
            $counter.css("color", "#dc3545");
          } else if (length > field.max * 0.7) {
            $counter.css("color", "#ffc107");
          } else {
            $counter.css("color", "#6c757d");
          }

          gsap.fromTo($counter[0], { scale: 1.2 }, { scale: 1, duration: 0.2 });
        });
      });
    },

    // Go to specific step
    goToStep: function (stepNum) {
      this.saveStepData(this.currentStep);
      this.currentStep = stepNum;
      this.showStep(this.currentStep);
      this.updateProgress();

      gsap.from(`#step${this.currentStep}`, {
        duration: 0.5,
        x: stepNum > this.currentStep ? 50 : -50,
        opacity: 0,
        ease: "power2.out",
      });
    },

    // NEW: Render dynamic referrals section
    renderReferralsStep: function () {
      const self = this;
      let html = `
            <div class="card border-0 shadow-sm" data-aos="fade-up">
                <div class="card-body p-4">
                    <h4 class="mb-3">
                        <i class="bi bi-people"></i> Referral Information / 推荐人信息
                    </h4>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        <strong>Required / 必填:</strong> You must provide at least 2 active members as referrals. / 您必须提供至少2位现有会员作为推荐人。
                    </div>
                    
                    <div id="referralsContainer">
        `;

      this.referrals.forEach((referral, index) => {
        html += this.getReferralCardHTML(referral, index);
      });

      html += `
                    </div>
                    
                    <!-- Add Referral Button -->
                    <button type="button" class="btn btn-outline-primary mt-3" id="addReferralBtn">
                        <i class="bi bi-plus-circle"></i> Add Another Referral / 添加推荐人
                    </button>
                </div>
            </div>
        `;

      return html;
    },

    // NEW: Get single referral card HTML
    getReferralCardHTML: function (referral, index) {
      const canRemove = this.referrals.length > 2 && index >= 2;
      const validatedBadge = referral.validated
        ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle"></i> Validated / 已验证</span>'
        : "";

      return `
            <div class="referral-card mb-3 p-3 border rounded ${referral.validated ? "validated" : ""
        }" data-referral-id="${referral.id}">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="mb-0">
                        <i class="bi bi-person-check"></i> Referral ${index + 1
        } / 推荐人 ${index + 1}
                        ${index < 2 ? '<span class="text-danger">*</span>' : ""}
                        ${validatedBadge}
                    </h5>
                    ${canRemove
          ? `
                        <button type="button" class="btn btn-sm btn-outline-danger remove-referral-btn" data-referral-id="${referral.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    `
          : ""
        }
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Full Name / 全名 ${index < 2 ? '<span class="text-danger">*</span>' : ""
        }</label>
                        <input type="text" 
                               class="form-control referral-name" 
                               data-referral-id="${referral.id}"
                               value="${referral.name}"
                               ${index < 2 ? "required" : ""}>
                    </div>
                    
                    <div class="col-md-6 mb-3">
                        <label class="form-label">
                            Member ID / IC Number / 会员编号 / 身份证号 ${index < 2
          ? '<span class="text-danger">*</span>'
          : ""
        }
                        </label>
                        <div class="input-group">
                            <input type="text" 
                                   class="form-control referral-member-id" 
                                   data-referral-id="${referral.id}"
                                   value="${referral.member_id}"
                                   ${referral.validated ? "readonly" : ""}
                                   ${index < 2 ? "required" : ""}>
                            <button class="btn btn-outline-primary validate-referral-btn" 
                                    type="button" 
                                    data-referral-id="${referral.id}"
                                    ${referral.validated ? "disabled" : ""}>
                                <i class="bi bi-search"></i> Validate / 验证
                            </button>
                        </div>
                        <div class="validation-msg mt-2" data-referral-id="${referral.id
        }"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // NEW: Add referral
    addReferral: function () {
      const newReferral = {
        id: this.nextReferralId++,
        name: "",
        member_id: "",
        user_id: null,
        validated: false,
      };

      this.referrals.push(newReferral);
      this.reRenderReferrals();

      const newCard = $(`.referral-card[data-referral-id="${newReferral.id}"]`);
      gsap.from(newCard, {
        duration: 0.5,
        y: 30,
        opacity: 0,
        scale: 0.95,
        ease: "back.out(1.7)",
      });

      TempleCore.showToast("Referral added / 已添加推荐人", "success");
    },

    // NEW: Remove referral
    removeReferral: function (referralId) {
      const index = this.referrals.findIndex((r) => r.id === referralId);

      if (index < 2) {
        TempleCore.showToast(
          "Cannot remove mandatory referrals / 不能删除必填推荐人",
          "warning"
        );
        return;
      }

      const card = $(`.referral-card[data-referral-id="${referralId}"]`);
      gsap.to(card, {
        duration: 0.3,
        x: 50,
        opacity: 0,
        onComplete: () => {
          this.referrals.splice(index, 1);
          this.reRenderReferrals();
          TempleCore.showToast("Referral removed / 已删除推荐人", "info");
        },
      });
    },

    // NEW: Update referral field
    updateReferralField: function (referralId, field, value) {
      const referral = this.referrals.find((r) => r.id === referralId);
      if (referral) {
        referral[field] = value;

        if (field === "member_id" && referral.validated) {
          referral.validated = false;
          referral.user_id = null;
          this.reRenderReferrals();
        }
      }
    },

    // NEW: Validate referral (dynamic version)
    validateReferralDynamic: function (referralId) {
      const self = this;
      const referral = this.referrals.find((r) => r.id === referralId);

      if (!referral || !referral.member_id) {
        TempleCore.showToast("Please enter Member ID or IC Number", "warning");
        return;
      }

      const btn = $(`.validate-referral-btn[data-referral-id="${referralId}"]`);
      const msgContainer = $(
        `.validation-msg[data-referral-id="${referralId}"]`
      );

      btn
        .prop("disabled", true)
        .html('<span class="spinner-border spinner-border-sm"></span>');
      msgContainer.html("");

      TempleAPI.get("/member-applications/validate-referral", {
        member_id: referral.member_id,
      })
        .done(function (response) {
          if (response.success && response.data.valid) {
            referral.validated = true;
            referral.user_id = response.data.user_id;
            referral.name = response.data.name;

            msgContainer.html(`
                    <div class="text-success">
                        <i class="bi bi-check-circle-fill"></i> 
                        Verified: ${response.data.name}
                    </div>
                `);

            self.reRenderReferrals();

            gsap.from(msgContainer, {
              duration: 0.5,
              scale: 0.8,
              opacity: 0,
              ease: "back.out(1.7)",
            });

            TempleCore.showToast("Referral validated successfully", "success");
          } else {
            msgContainer.html(`
                    <div class="text-danger">
                        <i class="bi bi-x-circle-fill"></i> 
                        ${response.message || "Invalid or inactive member"}
                    </div>
                `);
            TempleCore.showToast("Referral validation failed", "error");
          }
        })
        .fail(function (xhr) {
          msgContainer.html(`
                <div class="text-danger">
                    <i class="bi bi-x-circle-fill"></i> 
                    Validation failed. Please try again.
                </div>
            `);
          TempleCore.showToast("Validation failed", "error");
        })
        .always(function () {
          btn
            .prop("disabled", false)
            .html('<i class="bi bi-search"></i> Validate / 验证');
        });
    },

    // NEW: Re-render referrals container
    reRenderReferrals: function () {
      let html = "";
      this.referrals.forEach((referral, index) => {
        html += this.getReferralCardHTML(referral, index);
      });
      $("#referralsContainer").html(html);
    },

    // Render page HTML
    render: function () {
      const title = this.isEditMode
        ? "Edit Application"
        : "New Member Application";

      const html = `
<style>
    .page-header,
    .progress-container,
    .form-step {
        opacity: 1 !important;
    }
    
    .gsap-animating {
        opacity: 0;
    }
    
    .form-step {
        animation: fadeIn 0.5s ease-in-out;
    }
    
    .referral-card {
        background: #f8f9fa;
        transition: all 0.3s ease;
        position: relative;
    }

    .referral-card:hover {
        background: #e9ecef;
    }

    .referral-card.validated {
        border-color: #28a745 !important;
        background: #d4edda;
    }

    .validation-msg {
        font-size: 0.9rem;
    }

    .remove-referral-btn {
        position: absolute;
        top: 15px;
        right: 15px;
    }
</style>

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
    <div class="progress-container card border-0 shadow-sm mb-4" data-aos="fade-down" style="translate: none; rotate: none; scale: none; opacity: 1; transform: translate(0px, -100px) scale(0.9812, 0.9812); margin-top:10rem;">
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
                                <i class="bi bi-person-circle"></i> Personal Information / 个人信息
                            </h4>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Full Name / 全名 <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="name" name="name" required>
                                    <div class="invalid-feedback">Please enter your full name</div>
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Email / 电子邮件 <span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="email" name="email" required>
                                    <div class="invalid-feedback">Please enter a valid email</div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Mobile Code / 国家代码</label>
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
                                    <label class="form-label">Mobile Number / 手机号码 <span class="text-danger">*</span></label>
                                    <input type="tel" class="form-control" id="mobile_no" name="mobile_no" required>
                                    <div class="invalid-feedback">Please enter mobile number</div>
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Alternate Mobile / 备用手机</label>
                                    <input type="tel" class="form-control" id="alternate_mobile" name="alternate_mobile">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Date of Birth / 出生日期</label>
                                    <input type="date" class="form-control" id="date_of_birth" name="date_of_birth">
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Gender / 性别</label>
                                    <select class="form-select" id="gender" name="gender">
                                        <option value="">Select Gender / 选择性别</option>
                                        <option value="MALE">Male / 男</option>
                                        <option value="FEMALE">Female / 女</option>
                                        <option value="OTHER">Other / 其他</option>
                                    </select>
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Member Type / 会员类型</label>
                                    <select class="form-select" id="member_type_id" name="member_type_id">
                                        <option value="">Select Type / 选择类型</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-12 mb-3">
                                    <label class="form-label">Address / 地址</label>
                                    <textarea class="form-control" id="address" name="address" rows="2"></textarea>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">City / 城市</label>
                                    <input type="text" class="form-control" id="city" name="city">
                                </div>
                                
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">State / 州属</label>
                                    <input type="text" class="form-control" id="state" name="state">
                                </div>
                                
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Country / 国家</label>
                                    <select class="form-select" id="country" name="country">
                                        <option value="">Select Country / 选择国家</option>
                                    </select>
                                </div>
                                
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Postal Code / 邮编</label>
                                    <input type="text" class="form-control" id="pincode" name="pincode">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Occupation / 职业</label>
                                    <input type="text" class="form-control" id="occupation" name="occupation">
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Qualification / 学历</label>
                                    <input type="text" class="form-control" id="qualification" name="qualification">
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Annual Income / 年收入</label>
                                    <select class="form-select" id="annual_income" name="annual_income">
                                        <option value="">Select Range / 选择范围</option>
                                        <option value="Below RM 30,000">Below RM 30,000 / 低于 RM 30,000</option>
                                        <option value="RM 30,000 - RM 50,000">RM 30,000 - RM 50,000</option>
                                        <option value="RM 50,000 - RM 100,000">RM 50,000 - RM 100,000</option>
                                        <option value="RM 100,000 - RM 200,000">RM 100,000 - RM 200,000</option>
                                        <option value="RM 200,000 - RM 500,000">RM 200,000 - RM 500,000</option>
                                        <option value="Above RM 500,000">Above RM 500,000 / 超过 RM 500,000</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Referral Information (DYNAMIC) -->
                <div class="form-step" id="step2" style="display: none;">
                    ${this.renderReferralsStep()}
                </div>

                <!-- Step 3: ID Proof & Documents -->
                <div class="form-step" id="step3" style="display: none;">
                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                        <div class="card-body p-4">
                            <h4 class="mb-3">
                                <i class="bi bi-file-earmark-text"></i> Documents Upload / 文件上传
                            </h4>
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i> 
                                Please upload clear copies of your documents. / 请上传清晰的文件副本。
                            </div>
                            
                            <!-- Identity Card Type -->
                            <div class="row mb-4">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Identity Card Type / 身份证件类型 <span class="text-danger">*</span></label>
                                    <select class="form-select" id="id_proof_type" name="id_proof_type" required>
                                        <option value="">Select Type / 选择类型</option>
                                        <option value="IC">IC (Identity Card) / 身份证</option>
                                        <option value="Passport">Passport / 护照</option>
                                    </select>
                                    <div class="invalid-feedback">Please select identity card type</div>
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">IC/Passport Number / 身份证/护照号码 <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="id_proof_number" name="id_proof_number" required>
                                    <div class="invalid-feedback">Please enter IC/Passport number</div>
                                </div>
                            </div>
                            
                            <!-- IC Copy Upload -->
                            <div class="upload-section mb-4 p-3 border rounded">
                               <h5 class="mb-3">
    <i class="bi bi-card-image"></i> IC/Passport Copy / 身份证/护照副本
</h5>
                                <div class="row">
                                    <div class="col-md-8">
                                        <input type="file" 
                                               class="form-control" 
                                               id="id_proof_document" 
                                               name="id_proof_document" 
                                               accept="image/*,application/pdf"
                                               >
                                        <div class="form-text">Accepted / 接受格式: JPG, PNG, PDF (Max 5MB)</div>
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
    <i class="bi bi-person-badge"></i> Passport Photo / 护照照片
</h5>
                                <div class="row">
                                    <div class="col-md-8">
                                        <input type="file" 
                                               class="form-control" 
                                               id="profile_photo" 
                                               name="profile_photo" 
                                               accept="image/*"
                                               >
                                        <div class="form-text">Passport-sized photo / 护照尺寸照片 (JPG, PNG - Max 2MB)</div>
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
                                <i class="bi bi-credit-card"></i> Application Entry Fee / 申请入会费
                            </h4>
                            
                            <div class="alert alert-success mb-4">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-info-circle fs-4 me-3"></i>
                                    <div>
                                        <strong>Entry Fee / 入会费: RM 51.00</strong>
                                        <p class="mb-0 small">This is a one-time application processing fee. / 这是一次性申请处理费。</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Payment Method / 付款方式 <span class="text-danger">*</span></label>
                                    <select class="form-select" id="payment_method" name="payment_method" required>
                                        <option value="">Select Method / 选择方式</option>
                                        <option value="Cash">Cash / 现金</option>
                                        <option value="Bank Transfer">Bank Transfer / 银行转账</option>
                                        <option value="Online Banking">Online Banking / 网上银行</option>
                                        <option value="Credit/Debit Card">Credit/Debit Card / 信用卡/借记卡</option>
                                    </select>
                                    <div class="invalid-feedback">Please select payment method</div>
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Payment Date / 付款日期 <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="payment_date" name="payment_date" required>
                                    <div class="invalid-feedback">Please select payment date</div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-12 mb-3">
                                    <label class="form-label">Payment Reference / Transaction ID / 付款参考号 / 交易编号 <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="payment_reference" name="payment_reference" required>
                                    <div class="form-text">Enter receipt number, transaction ID, or reference number / 输入收据号、交易编号或参考号</div>
                                    <div class="invalid-feedback">Please enter payment reference</div>
                                </div>
                            </div>
                            
                            <!-- Payment Confirmation -->
                            <div class="form-check mt-3">
                                <input class="form-check-input" type="checkbox" id="paymentConfirm" required>
                                <label class="form-check-label" for="paymentConfirm">
                                    I confirm that I have paid the application entry fee of <strong>RM 51.00</strong><br>
                                    我确认已支付申请入会费 <strong>RM 51.00</strong>
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
                                <i class="bi bi-check-circle"></i> Review & Submit / 审核并提交
                            </h4>
                            
                            <div id="reviewContent">
                                <!-- Review content will be dynamically generated -->
                            </div>
                            
                            <div class="alert alert-info mt-4">
                                <i class="bi bi-info-circle"></i> 
                                By submitting this application, you agree that all information provided is accurate and complete.<br>
                                提交此申请即表示您同意所提供的所有信息准确无误且完整。
                            </div>
                            
                            <div class="form-check mt-3">
                                <input class="form-check-input" type="checkbox" id="finalConfirm" required>
                                <label class="form-check-label" for="finalConfirm">
                                    I confirm that all information provided is accurate and I agree to the terms and conditions.<br>
                                    我确认所提供的所有信息准确无误，并同意条款和条件。
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
                                <i class="bi bi-arrow-left"></i> Previous / 上一步
                            </button>
                            <div></div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-secondary" id="saveDraftBtn">
                                    <i class="bi bi-save"></i> Save as Draft / 保存草稿
                                </button>
                                <button type="button" class="btn btn-primary" id="nextBtn">
                                    Next / 下一步 <i class="bi bi-arrow-right"></i>
                                </button>
                                <button type="submit" class="btn btn-success" id="submitBtn" style="display: none;">
                                    <i class="bi bi-check-circle"></i> Submit Application / 提交申请
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

      $("#page-container").html(html);
    },

    // Get progress steps HTML
    getProgressStepsHTML: function () {
      const steps = [
        {
          number: 1,
          title: "Personal Info",
          titleCN: "个人信息",
          icon: "bi-person",
        },
        { number: 2, title: "Referrals", titleCN: "推荐人", icon: "bi-people" },
        {
          number: 3,
          title: "Documents",
          titleCN: "文件",
          icon: "bi-file-earmark",
        },
        {
          number: 4,
          title: "Payment",
          titleCN: "付款",
          icon: "bi-credit-card",
        },
        {
          number: 5,
          title: "Review",
          titleCN: "审核",
          icon: "bi-check-circle",
        },
      ];

      let html = "";
      steps.forEach((step, index) => {
        const isActive = step.number === this.currentStep;
        const isCompleted = step.number < this.currentStep;

        html += `
            <div class="col progress-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""
          }">
                <div class="step-icon">
                    <i class="bi ${isCompleted ? "bi-check-lg" : step.icon
          }"></i>
                </div>
                <div class="step-title">${step.title}<br><small>${step.titleCN
          }</small></div>
            </div>
        `;
      });

      return html;
    },

    // Bind events
    bindEvents: function () {
      const self = this;

      // Navigation buttons
      $("#nextBtn").on("click", function () {
        self.nextStep();
      });

      $("#prevBtn").on("click", function () {
        self.prevStep();
      });

      // Form submission
      $("#applicationForm").on("submit", function (e) {
        e.preventDefault();
        self.submitApplication();
      });

      // Save draft
      $("#saveDraftBtn").on("click", function () {
        self.saveDraft();
      });

      // File previews
      $("#id_proof_document").on("change", function () {
        self.previewDocument(this, "#icPreview");
      });

      $("#profile_photo").on("change", function () {
        self.previewPhoto(this, "#photoPreview");
      });

      // Set default payment date to today
      const today = new Date().toISOString().split("T")[0];
      $("#payment_date").val(today);

      // NEW: Bind dynamic referral events
      $(document).on("click", "#addReferralBtn", function () {
        self.addReferral();
      });

      $(document).on("click", ".remove-referral-btn", function () {
        const referralId = $(this).data("referral-id");
        self.removeReferral(referralId);
      });

      $(document).on("click", ".validate-referral-btn", function () {
        const referralId = $(this).data("referral-id");
        self.validateReferralDynamic(referralId);
      });

      $(document).on("input", ".referral-name", function () {
        const referralId = $(this).data("referral-id");
        const value = $(this).val();
        self.updateReferralField(referralId, "name", value);
      });

      $(document).on("input", ".referral-member-id", function () {
        const referralId = $(this).data("referral-id");
        const value = $(this).val();
        self.updateReferralField(referralId, "member_id", value);
      });
    },

    // Load initial data
    loadInitialData: function () {
      this.loadMemberTypes();
      this.loadCountries();

      if (this.isEditMode) {
        this.loadApplicationData();
      }
    },

    // UPDATED: Load member types - Only show Life Member
    loadMemberTypes: function () {
      const self = this;

      TempleAPI.get("/member-types").done(function (response) {
        if (response.success) {
          self.memberTypes = response.data;

          // Filter to only show Life Member, or create static option
          let options = '<option value="">Select Type / 选择类型</option>';

          // Find Life Member from API response
          const lifeMember = response.data.find(type =>
            type.display_name.toLowerCase().includes('life') ||
            type.name.toLowerCase().includes('life')
          );

          if (lifeMember) {
            options += `<option value="${lifeMember.id}" selected>${lifeMember.display_name}</option>`;
          } else {
            // If no Life Member found in API, show first option or static
            // You can adjust this based on actual member type ID
            response.data.forEach(function (type) {
              if (type.display_name.toLowerCase().includes('life') ||
                type.name.toLowerCase().includes('life')) {
                options += `<option value="${type.id}">${type.display_name}</option>`;
              }
            });

            // If still no Life Member, add a static one (adjust ID as needed)
            if (options === '<option value="">Select Type / 选择类型</option>') {
              options += `<option value="life_member">Life Member / 终身会员</option>`;
            }
          }

          $("#member_type_id").html(options);
        }
      }).fail(function () {
        // Fallback: Static Life Member option if API fails
        const options = `
          <option value="">Select Type / 选择类型</option>
          <option value="life_member">Life Member / 终身会员</option>
        `;
        $("#member_type_id").html(options);
      });
    },

    // Load countries
    loadCountries: function () {
      const countries = [
        "Malaysia",
        "Singapore",
        "China",
        "Hong Kong",
        "Taiwan",
        "India",
        "Thailand",
        "Indonesia",
        "Philippines",
        "Vietnam",
        "United States",
        "United Kingdom",
        "Australia",
        "Canada",
      ];

      let options = '<option value="">Select Country / 选择国家</option>';
      countries.forEach(function (country) {
        options += `<option value="${country}">${country}</option>`;
      });

      $("#country").html(options);
      $("#country").val("Malaysia"); // Default
    },

    // Next step
    nextStep: function () {
      if (!this.validateStep(this.currentStep)) {
        return;
      }

      this.saveStepData(this.currentStep);

      console.log(
        "Form data after saving step " + this.currentStep + ":",
        this.formData
      );

      this.currentStep++;
      this.showStep(this.currentStep);
      this.updateProgress();

      gsap.from(`#step${this.currentStep}`, {
        duration: 0.5,
        x: 50,
        opacity: 0,
        ease: "power2.out",
      });
    },

    // Previous step
    prevStep: function () {
      this.currentStep--;
      this.showStep(this.currentStep);
      this.updateProgress();

      gsap.from(`#step${this.currentStep}`, {
        duration: 0.5,
        x: -50,
        opacity: 0,
        ease: "power2.out",
      });
    },

    // Show specific step
    showStep: function (step) {
      $(".form-step").hide();
      $(`#step${step}`).show();

      if (step < 5) {
        this.populateStepFields(step);
      }

      if (step === 1) {
        $("#prevBtn").hide();
      } else {
        $("#prevBtn").show();
      }

      if (step === this.totalSteps) {
        $("#nextBtn").hide();
        $("#submitBtn").show();
        this.generateReview();
      } else {
        $("#nextBtn").show();
        $("#submitBtn").hide();
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    // Populate step fields with saved data
    populateStepFields: function (step) {
      const self = this;
      const stepElement = $(`#step${step}`);

      stepElement.find("input, select, textarea").each(function () {
        const name = $(this).attr("name");
        if (
          name &&
          self.formData[name] !== undefined &&
          self.formData[name] !== null
        ) {
          if ($(this).attr("type") === "checkbox") {
            $(this).prop("checked", self.formData[name]);
          } else if ($(this).attr("type") !== "file") {
            $(this).val(self.formData[name]);
          }
        }
      });
    },

    // Update progress bar and indicators
    updateProgress: function () {
      const progress = (this.currentStep / this.totalSteps) * 100;

      gsap.to("#progressBar", {
        duration: 0.5,
        width: `${progress}%`,
        ease: "power2.out",
      });

      $(".progress-step").each(
        function (index) {
          const stepNum = index + 1;
          $(this).removeClass("active completed");

          if (stepNum === this.currentStep) {
            $(this).addClass("active");
          } else if (stepNum < this.currentStep) {
            $(this).addClass("completed");
          }
        }.bind(this)
      );

      gsap.from(".progress-step.active .step-icon", {
        duration: 0.5,
        scale: 0.8,
        ease: "back.out(1.7)",
      });
    },

    // Validate step
    validateStep: function (step) {
      let isValid = true;
      const stepElement = $(`#step${step}`);

      stepElement
        .find("input[required], select[required], textarea[required]")
        .each(function () {
          if (!this.checkValidity()) {
            isValid = false;
            $(this).addClass("is-invalid");
          } else {
            $(this).removeClass("is-invalid");
          }
        });

      // Step 2: Validate referrals
      if (step === 2) {
        if (this.referrals.length < 2) {
          TempleCore.showToast("At least 2 referrals are required", "warning");
          isValid = false;
        }

        const mandatoryReferrals = this.referrals.slice(0, 2);
        const allMandatoryValidated = mandatoryReferrals.every(
          (r) => r.validated && r.user_id
        );

        if (!allMandatoryValidated) {
          TempleCore.showToast(
            "Please validate the first 2 mandatory referrals",
            "warning"
          );
          isValid = false;
        }

        const allHaveNames = this.referrals.every((r) => r.name.trim() !== "");
        if (!allHaveNames) {
          TempleCore.showToast(
            "Please enter names for all referrals",
            "warning"
          );
          isValid = false;
        }
      }

      // Step 4: Validate payment confirmation
      if (step === 4) {
        if (!$("#paymentConfirm").is(":checked")) {
          $("#paymentConfirm").addClass("is-invalid");
          isValid = false;
        }
      }

      if (!isValid) {
        gsap.fromTo(
          ".is-invalid",
          { x: -10 },
          { x: 0, duration: 0.1, repeat: 3, ease: "power1.inOut" }
        );

        TempleCore.showToast("Please fill all required fields", "warning");
      }

      return isValid;
    },

    // Save step data
    saveStepData: function (step) {
      const self = this;
      const stepElement = $(`#step${step}`);

      stepElement.find("input, select, textarea").each(function () {
        const name = $(this).attr("name");
        if (name) {
          if ($(this).attr("type") === "checkbox") {
            self.formData[name] = $(this).is(":checked");
          } else if ($(this).attr("type") === "file") {
            if ($(this)[0].files.length > 0) {
              self.formData[name] = $(this)[0].files[0];
            }
          } else {
            self.formData[name] = $(this).val();
          }
        }
      });

      console.log(`Step ${step} data saved:`, self.formData);
    },

    // Preview document
    previewDocument: function (input, container) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
          if (file.type.includes("pdf")) {
            $(container).html(`
              <div class="text-center p-3">
                <i class="bi bi-file-pdf fs-1 text-danger"></i>
                <p class="small mt-2 mb-0">${file.name}</p>
              </div>
            `);
          } else {
            $(container).html(`<img src="${e.target.result}" alt="Document">`);
          }

          gsap.from(container, {
            duration: 0.5,
            scale: 0.8,
            opacity: 0,
            ease: "back.out(1.7)",
          });
        };

        reader.readAsDataURL(file);
      }
    },

    // Preview photo
    previewPhoto: function (input, container) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
          $(container).html(
            `<img src="${e.target.result}" alt="Photo" style="border-radius: 8px;">`
          );

          gsap.from(container, {
            duration: 0.5,
            scale: 0.8,
            opacity: 0,
            ease: "back.out(1.7)",
          });
        };

        reader.readAsDataURL(file);
      }
    },

    // Get member type name by ID
    getMemberTypeName: function (memberTypeId) {
      if (!this.memberTypes || this.memberTypes.length === 0) {
        // Return Life Member as default display
        return "Life Member / 终身会员";
      }
      const memberType = this.memberTypes.find(
        (type) => type.id === memberTypeId
      );
      return memberType ? memberType.display_name : "Life Member / 终身会员";
    },

    // Generate review content
    generateReview: function () {
      this.saveStepData(4);

      console.log("Generating review with data:", this.formData);

      const getValue = (key, defaultValue = "-") => {
        return this.formData[key] || defaultValue;
      };

      let referralsHTML = "";
      this.referrals.forEach((referral, index) => {
        referralsHTML += `
          <div class="review-item">
            <div class="review-label">Referral ${index + 1}:</div>
            <div class="review-value">
              <strong>${referral.name || "-"}</strong><br>
              <small class="text-muted">Member ID: ${referral.member_id || "-"
          }</small>
              ${referral.validated
            ? '<br><span class="badge bg-success">Verified</span>'
            : ""
          }
            </div>
          </div>
        `;
      });

      const html = `
        <div class="review-section">
          <h6><i class="bi bi-person-circle"></i> Personal Information</h6>
          <div class="review-item">
            <div class="review-label">Full Name:</div>
            <div class="review-value">${getValue("name")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Email:</div>
            <div class="review-value">${getValue("email")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Mobile:</div>
            <div class="review-value">${getValue(
        "mobile_code",
        "+60"
      )} ${getValue("mobile_no")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Date of Birth:</div>
            <div class="review-value">${getValue("date_of_birth")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Gender:</div>
            <div class="review-value">${getValue("gender")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Member Type:</div>
            <div class="review-value">${getValue("member_type_id")
          ? this.getMemberTypeName(getValue("member_type_id"))
          : "Life Member / 终身会员"
        }</div>
          </div>
          <div class="review-item">
            <div class="review-label">Address:</div>
            <div class="review-value">
              ${getValue("address")}<br>
              ${getValue("city")}, ${getValue("state")} ${getValue(
          "pincode"
        )}<br>
              ${getValue("country")}
            </div>
          </div>
          <div class="review-item">
            <div class="review-label">Occupation:</div>
            <div class="review-value">${getValue("occupation")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Qualification:</div>
            <div class="review-value">${getValue("qualification")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Annual Income:</div>
            <div class="review-value">${getValue("annual_income")}</div>
          </div>
        </div>
        
        <div class="review-section">
          <h6><i class="bi bi-people"></i> Referral Information</h6>
          ${referralsHTML}
        </div>
        
        <div class="review-section">
          <h6><i class="bi bi-file-earmark-text"></i> Documents</h6>
          <div class="review-item">
            <div class="review-label">Identity Card Type:</div>
            <div class="review-value">${getValue("id_proof_type")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">IC/Passport Number:</div>
            <div class="review-value">${getValue("id_proof_number")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Documents Uploaded:</div>
            <div class="review-value">
              ${this.formData.id_proof_document
          ? '<i class="bi bi-check-circle text-success"></i> IC/Passport Copy<br>'
          : '<i class="bi bi-x-circle text-danger"></i> IC/Passport Copy Not Uploaded<br>'
        }
              ${this.formData.profile_photo
          ? '<i class="bi bi-check-circle text-success"></i> Passport Photo'
          : '<i class="bi bi-x-circle text-danger"></i> Photo Not Uploaded'
        }
            </div>
          </div>
        </div>
        
        <div class="review-section">
          <h6><i class="bi bi-credit-card"></i> Payment Information</h6>
          <div class="review-item">
            <div class="review-label">Entry Fee:</div>
            <div class="review-value"><strong class="text-success">RM 51.00</strong></div>
          </div>
          <div class="review-item">
            <div class="review-label">Payment Method:</div>
            <div class="review-value">${getValue("payment_method")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Payment Reference:</div>
            <div class="review-value">${getValue("payment_reference")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Payment Date:</div>
            <div class="review-value">${getValue("payment_date")}</div>
          </div>
          <div class="review-item">
            <div class="review-label">Payment Status:</div>
            <div class="review-value">
              <span class="badge bg-success">
                <i class="bi bi-check-circle"></i> Confirmed
              </span>
            </div>
          </div>
        </div>
      `;

      $("#reviewContent").html(html);

      gsap.from(".review-section", {
        duration: 0.5,
        y: 20,
        opacity: 0,
        stagger: 0.1,
        ease: "power2.out",
      });
    },

    // Submit application
    submitApplication: function () {
      const self = this;

      this.saveStepData(4);

      if (!$("#finalConfirm").is(":checked")) {
        $("#finalConfirm").addClass("is-invalid");
        TempleCore.showToast("Please confirm to proceed", "warning");
        return;
      }

      const formData = new FormData();

      Object.keys(this.formData).forEach(function (key) {
        const value = self.formData[key];

        if (value instanceof File) {
          formData.append(key, value);
        } else if (value !== null && value !== undefined && value !== "") {
          formData.append(key, String(value));
        }
      });

      // Send referral data in BOTH formats for backend compatibility
      const ref1 = this.referrals[0];
      const ref2 = this.referrals[1];

      if (ref1) {
        formData.set("referral_1_name", ref1.name || "");
        formData.set("referral_1_member_id", ref1.member_id || "");
        if (ref1.user_id) {
          formData.set("referral_1_user_id", ref1.user_id);
        }
      }

      if (ref2) {
        formData.set("referral_2_name", ref2.name || "");
        formData.set("referral_2_member_id", ref2.member_id || "");
        if (ref2.user_id) {
          formData.set("referral_2_user_id", ref2.user_id);
        }
      }

      this.referrals.forEach((referral, index) => {
        formData.append(
          `referrals[${index}][referral_name]`,
          referral.name || ""
        );
        formData.append(
          `referrals[${index}][referral_member_id]`,
          referral.member_id || ""
        );
        if (referral.user_id) {
          formData.append(
            `referrals[${index}][referral_user_id]`,
            referral.user_id
          );
        }
      });

      console.log("Submitting referrals:", {
        ref1: ref1,
        ref2: ref2,
        allReferrals: this.referrals,
      });

      formData.append("entry_fee_amount", "51.00");
      formData.append("entry_fee_paid", "1");
      formData.append("status", "SUBMITTED");

      TempleCore.showLoading(true);

      gsap.to("#submitBtn", {
        duration: 0.3,
        scale: 0.95,
      });

      const endpoint = this.isEditMode
        ? "/member-applications/" + this.applicationId
        : "/member-applications";

      $.ajax({
        url: TempleAPI.getBaseUrl() + endpoint,
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        headers: {
          Authorization:
            "Bearer " + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
          "X-Temple-ID": TempleAPI.getTempleId(),
        },
        success: function (response) {
          if (response.success) {
            gsap.to(".application-form-page", {
              duration: 0.5,
              scale: 0.95,
              opacity: 0,
              onComplete: function () {
                TempleCore.showToast(
                  "Application submitted successfully! Temporary ID: " +
                  response.data.temp_member_id,
                  "success"
                );

                setTimeout(function () {
                  TempleRouter.navigate("members/application");
                }, 1500);
              },
            });
          }
        },
        error: function (xhr) {
          let errorMsg = "Failed to submit application";
          if (xhr.responseJSON && xhr.responseJSON.message) {
            errorMsg = xhr.responseJSON.message;
          }
          TempleCore.showToast(errorMsg, "error");
          console.error("Submission error:", xhr.responseJSON || xhr);
        },
        complete: function () {
          TempleCore.showLoading(false);
          gsap.to("#submitBtn", {
            duration: 0.3,
            scale: 1,
          });
        },
      });
    },

    // Save as draft
    saveDraft: function () {
      const self = this;

      this.saveStepData(this.currentStep);

      const formData = new FormData();
      Object.keys(this.formData).forEach(function (key) {
        if (self.formData[key] !== null && self.formData[key] !== undefined) {
          if (self.formData[key] instanceof File) {
            formData.append(key, self.formData[key]);
          } else {
            formData.append(key, self.formData[key]);
          }
        }
      });

      formData.append("status", "PENDING_SUBMISSION");

      TempleCore.showLoading(true);

      $.ajax({
        url: TempleAPI.getBaseUrl() + "/member-applications",
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        headers: {
          Authorization:
            "Bearer " + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
          "X-Temple-ID": TempleAPI.getTempleId(),
        },
        success: function (response) {
          if (response.success) {
            TempleCore.showToast("Draft saved successfully", "success");
            self.applicationId = response.data.id;
            self.isEditMode = true;
          }
        },
        error: function (xhr) {
          TempleCore.showToast("Failed to save draft", "error");
        },
        complete: function () {
          TempleCore.showLoading(false);
        },
      });
    },

    // Load application data (for edit mode)
    loadApplicationData: function () {
      const self = this;

      TempleCore.showLoading(true);

      TempleAPI.get("/member-applications/" + this.applicationId)
        .done(function (response) {
          if (response.success) {
            const data = response.data;

            Object.keys(data).forEach(function (key) {
              const field = $(`#${key}`);
              if (field.length) {
                field.val(data[key]);
              }
            });

            self.formData = data;
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to load application data", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },
  };
})(jQuery, window);
