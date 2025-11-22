// // js/pages/special-occasions/index.js
// // Special Occasions Booking Module with GSAP + AOS Animations

// (function ($, window) {
//     'use strict';

//     window.SpecialOccasionsPage = {
//         // Occasion configurations - will be loaded from API
//         occasions: {},

//         paymentMethods: [
//             { value: 'cash', label: 'Cash 现款' },
//             { value: 'cheque', label: 'Cheque 支票' },
//             { value: 'ebanking', label: 'E-banking 银行转账' },
//             { value: 'card', label: 'Credit/Debit Card 信用卡' },
//             { value: 'duitnow', label: 'DuitNow (E-wallet) 电子钱包' }
//         ],

//         selectedOccasion: null,
//         formData: {},

//         // Page initialization
//         init: function (params) {
//             const self = this;
//             this.loadCSS();
//             this.render();
//             this.initAnimations();

//             // Load occasions from API first, then bind events
//             this.loadOccasions().then(function () {
//                 self.bindEvents();
//             }).fail(function () {
//                 TempleCore.showToast('Failed to load special occasions', 'error');
//             });
//         },

//         // Load occasions from API
//         loadOccasions: function () {
//             const self = this;
//             const deferred = $.Deferred();

//             // Show loading indicator
//             $('#occasionType').html('<option value="">Loading occasions...</option>');

//             TempleAPI.get('/special-occasions', { status: 'active' })
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         // Transform API data to match frontend format
//                         self.occasions = {};

//                         response.data.forEach(function (occasion) {
//                             // Create a key from the ID
//                             const key = 'occasion-' + occasion.id;

//                             // Transform occasion_options from API to frontend format
//                             const options = [];
//                             if (occasion.occasion_options && Array.isArray(occasion.occasion_options)) {
//                                 occasion.occasion_options.forEach(function (opt, index) {
//                                     options.push({
//                                         value: 'option-' + index,
//                                         label: opt.option_name,
//                                         price: opt.amount ? `RM ${opt.amount}` : ''
//                                     });
//                                 });
//                             }

//                             // Store the transformed occasion
//                             self.occasions[key] = {
//                                 id: occasion.id,
//                                 name: occasion.occasion_name_primary,
//                                 nameChinese: occasion.occasion_name_secondary || occasion.occasion_name_primary,
//                                 icon: 'bi-star', // Default icon
//                                 color: '#FFD700', // Default color
//                                 options: options,
//                                 primary_lang: occasion.primary_lang,
//                                 secondary_lang: occasion.secondary_lang
//                             };
//                         });

//                         // Re-render the dropdown with new options
//                         $('#occasionType').html(`
//                             <option value="">-- Select an Occasion 选择场合 --</option>
//                             ${self.renderOccasionOptions()}
//                         `);

//                         console.log('Loaded occasions:', self.occasions);
//                         deferred.resolve();
//                     } else {
//                         $('#occasionType').html('<option value="">No occasions available</option>');
//                         TempleCore.showToast('No active occasions found', 'warning');
//                         deferred.reject();
//                     }
//                 })
//                 .fail(function (xhr) {
//                     console.error('Failed to load occasions:', xhr);
//                     $('#occasionType').html('<option value="">Failed to load occasions</option>');
//                     TempleCore.showToast('Failed to load occasions from server', 'error');
//                     deferred.reject();
//                 });

//             return deferred.promise();
//         },

//         loadCSS: function () {
//             // Check if CSS is already loaded
//             if (!document.getElementById('special-occasions-css')) {
//                 const link = document.createElement('link');
//                 link.id = 'special-occasions-css';
//                 link.rel = 'stylesheet';
//                 link.href = '/css/special-occasions.css';
//                 document.head.appendChild(link);
//             }
//         },

//         // Render page HTML
//         render: function () {
//             const html = `
//                 <div class="special-occasions-page">
//                     <!-- Page Header with Animation -->
//                     <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
//                         <div class="occasion-header-bg"></div>
//                         <div class="container-fluid">
//                             <div class="row align-items-center">
//                                 <div class="col-md-8">
//                                     <div class="occasion-title-wrapper">
//                                         <i class="bi bi-calendar-event occasion-header-icon"></i>
//                                         <div>
//                                             <h1 class="occasion-title">Special Occasions Booking</h1>
//                                             <p class="occasion-subtitle">特别场合预订 • Temple Sacred Ceremonies</p>
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div class="col-md-4 text-md-end">
//                                     <button class="btn btn-outline-light btn-lg" id="btnViewHistory">
//                                         <i class="bi bi-clock-history"></i> View History
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     <!-- Main Content -->
//                     <div class="container-fluid mt-4">
//                         <div class="row justify-content-center">
//                             <div class="col-xl-10">
//                                 <!-- Occasion Selection Card -->
//                                 <div class="occasion-card" data-aos="fade-up" data-aos-delay="200">
//                                     <div class="card-header-custom">
//                                         <i class="bi bi-calendar-check"></i>
//                                         <span>Select Special Occasion</span>
//                                     </div>
//                                     <div class="card-body-custom">
//                                         <div class="occasion-selector-wrapper">
//                                             <label class="form-label-custom">Choose Occasion Type 选择场合类型</label>
//                                             <select class="form-select form-select-lg occasion-select" id="occasionType">
//                                                 <option value="">-- Select an Occasion 选择场合 --</option>
//                                             </select>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <!-- Occasion Info Card (Hidden initially) -->
//                                 <div class="occasion-info-card" id="occasionInfoCard" style="display: none;">
//                                     <div class="occasion-info-content">
//                                         <div class="occasion-info-icon" id="occasionIcon">
//                                             <i class="bi bi-star"></i>
//                                         </div>
//                                         <div>
//                                             <h3 class="occasion-info-title" id="occasionName"></h3>
//                                             <p class="occasion-info-subtitle" id="occasionNameChinese"></p>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <!-- Booking Form (Hidden initially) -->
//                                 <div class="booking-form-container" id="bookingFormContainer" style="display: none;">
//                                     <form id="bookingForm">
//                                         <div class="row">
//                                             <!-- Personal Information Section -->
//                                             <div class="col-lg-6">
//                                                 <div class="occasion-card" data-aos="fade-right" data-aos-delay="300">
//                                                     <div class="card-header-custom">
//                                                         <i class="bi bi-person-circle"></i>
//                                                         <span>Personal Information 个人资料</span>
//                                                     </div>
//                                                     <div class="card-body-custom">
//                                                         <!-- Name Fields -->
//                                                      <!-- Name Fields -->
// <div class="mb-3">
//     <label class="form-label-custom required">Name 姓名 (Chinese 中)</label>
//     <input type="text" class="form-control form-control-custom" id="nameChinese" required>
//     <div class="invalid-feedback">Please enter Chinese name</div>
// </div>
// <div class="mb-3">
//     <label class="form-label-custom required">Name (English 英)</label>
//     <input type="text" class="form-control form-control-custom" id="nameEnglish" required>
//     <div class="invalid-feedback">Please enter English name</div>
// </div>

//                                                         <!-- NRIC -->
//                                                         <div class="mb-3">
//                                                             <label class="form-label-custom required">NRIC No. 身份证</label>
//                                                             <input type="text" class="form-control form-control-custom" id="nric" placeholder="e.g., 123456-12-1234" required>
//                                                             <div class="invalid-feedback">Please enter NRIC number</div>
//                                                         </div>

//                                                         <!-- Email -->
//                                                         <div class="mb-3">
//                                                             <label class="form-label-custom required">Email 电邮</label>
//                                                             <input type="email" class="form-control form-control-custom" id="email" placeholder="your.email@example.com" required>
//                                                             <div class="invalid-feedback">Please enter a valid email</div>
//                                                         </div>

//                                                         <!-- Contact No -->
//                                                         <div class="mb-3">
//                                                             <label class="form-label-custom required">Contact No. 手机号码</label>
//                                                             <input type="tel" class="form-control form-control-custom" id="contactNo" placeholder="e.g., +60123456789" required>
//                                                             <div class="invalid-feedback">Please enter contact number</div>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>

//                                             <!-- Occasion & Payment Section -->
//                                             <div class="col-lg-6">
//                                                 <div class="occasion-card" data-aos="fade-left" data-aos-delay="300">
//                                                     <div class="card-header-custom">
//                                                         <i class="bi bi-clipboard-check"></i>
//                                                         <span>Occasion Details 场合详情</span>
//                                                     </div>
//                                                     <div class="card-body-custom">
//                                                         <!-- Occasion Options -->
//                                                         <div class="mb-4" id="occasionOptionsContainer">
//                                                             <label class="form-label-custom required">Occasion Option 选项</label>
//                                                             <div id="occasionOptionsGroup"></div>
//                                                         </div>

//                                                         <!-- Payment Methods -->
//                                                         <div class="mb-4">
//                                                             <label class="form-label-custom required">Payment Method 付款方式</label>
//                                                             <div class="payment-methods-grid">
//                                                                 ${this.renderPaymentMethods()}
//                                                             </div>
//                                                             <div class="invalid-feedback d-block" id="paymentError" style="display: none !important;">
//                                                                 Please select at least one payment method
//                                                             </div>
//                                                         </div>

//                                                         <!-- Remarks -->
//                                                         <div class="mb-3">
//                                                             <label class="form-label-custom">Remark 备注</label>
//                                                             <textarea class="form-control form-control-custom" id="remark" rows="3" placeholder="Optional notes..."></textarea>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>

//                                         <!-- Submit Button -->
//                                         <div class="text-center mt-4" data-aos="fade-up" data-aos-delay="400">
//                                             <button type="button" class="btn btn-lg btn-secondary me-3" id="btnReset">
//                                                 <i class="bi bi-arrow-counterclockwise"></i> Reset Form
//                                             </button>
//                                             <button type="submit" class="btn btn-lg btn-primary btn-submit-custom">
//                                                 <i class="bi bi-check-circle"></i> Submit Booking
//                                             </button>
//                                         </div>
//                                     </form>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             `;

//             $('#page-container').html(html);
//         },

//         // Render occasion dropdown options
//         renderOccasionOptions: function () {
//             let html = '';
//             for (const [key, occasion] of Object.entries(this.occasions)) {
//                 html += `<option value="${key}">${occasion.nameChinese}</option>`;
//             }
//             return html;
//         },

//         // Render payment methods
//         renderPaymentMethods: function () {
//             let html = '';
//             this.paymentMethods.forEach(method => {
//                 html += `
//                     <div class="payment-method-item">
//                         <input type="checkbox" class="form-check-input payment-checkbox" id="payment-${method.value}" value="${method.value}">
//                         <label class="form-check-label" for="payment-${method.value}">
//                             <i class="bi bi-${this.getPaymentIcon(method.value)}"></i>
//                             ${method.label}
//                         </label>
//                     </div>
//                 `;
//             });
//             return html;
//         },

//         // Get payment method icon
//         getPaymentIcon: function (value) {
//             const icons = {
//                 'cash': 'cash-stack',
//                 'cheque': 'receipt',
//                 'ebanking': 'bank',
//                 'card': 'credit-card',
//                 'duitnow': 'wallet2'
//             };
//             return icons[value] || 'cash';
//         },

//         // Initialize animations
//         initAnimations: function () {
//             // Initialize AOS
//             AOS.init({
//                 duration: 800,
//                 easing: 'ease-in-out',
//                 once: true,
//                 offset: 100
//             });

//             // Animate header background
//             gsap.to('.occasion-header-bg', {
//                 backgroundPosition: '100% 50%',
//                 duration: 20,
//                 repeat: -1,
//                 yoyo: true,
//                 ease: 'none'
//             });

//             // Floating animation for header icon
//             gsap.to('.occasion-header-icon', {
//                 y: -10,
//                 duration: 2,
//                 repeat: -1,
//                 yoyo: true,
//                 ease: 'power1.inOut'
//             });
//         },

//         // Show occasion info with animation
//         showOccasionInfo: function (occasionKey) {
//             const occasion = this.occasions[occasionKey];
//             const $infoCard = $('#occasionInfoCard');
//             const $formContainer = $('#bookingFormContainer');

//             // Update info card content
//             $('#occasionIcon').html(`<i class="bi ${occasion.icon}"></i>`).css('background', occasion.color);
//             $('#occasionName').text(occasion.name);
//             $('#occasionNameChinese').text(occasion.nameChinese);

//             // Show info card with GSAP animation
//             if ($infoCard.is(':hidden')) {
//                 gsap.fromTo($infoCard,
//                     { opacity: 0, y: -30, display: 'none' },
//                     { opacity: 1, y: 0, display: 'block', duration: 0.6, ease: 'back.out(1.7)' }
//                 );
//             }

//             // Render occasion-specific options
//             this.renderOccasionOptionsList(occasion);

//             // Show form container with staggered animation
//             if ($formContainer.is(':hidden')) {
//                 gsap.fromTo($formContainer,
//                     { opacity: 0, y: 30, display: 'none' },
//                     {
//                         opacity: 1,
//                         y: 0,
//                         display: 'block',
//                         duration: 0.8,
//                         ease: 'power2.out',
//                         onComplete: () => {
//                             // Animate form fields in sequence
//                             gsap.from('.occasion-card', {
//                                 opacity: 0,
//                                 y: 20,
//                                 stagger: 0.2,
//                                 duration: 0.6,
//                                 ease: 'power2.out'
//                             });
//                         }
//                     }
//                 );
//             }

//             // Scroll to form smoothly
//             setTimeout(() => {
//                 $('html, body').animate({
//                     scrollTop: $formContainer.offset().top - 100
//                 }, 800);
//             }, 300);
//         },

//         // Render occasion-specific options (radio buttons for selected occasion)
//         renderOccasionOptionsList: function (occasion) {
//             const $container = $('#occasionOptionsGroup');
//             $container.empty();

//             let html = '';
//             occasion.options.forEach((option, index) => {
//                 const radioId = `option-${index}`;
//                 const priceText = option.price ? `<span class="option-price">${option.price}</span>` : '';

//                 html += `
//                     <div class="occasion-option-item">
//                         <input type="radio" class="form-check-input" name="occasionOption" id="${radioId}" value="${option.value}" required>
//                         <label class="form-check-label" for="${radioId}">
//                             <span class="option-label">${option.label}</span>
//                             ${priceText}
//                         </label>
//                     </div>
//                 `;
//             });

//             // Add fixed amount display for occasions like Guanyin Bodhisattva
//             if (occasion.fixedAmount) {
//                 html += `
//                     <div class="fixed-amount-display">
//                         <i class="bi bi-tag"></i> Amount: ${occasion.fixedAmount}
//                     </div>
//                 `;
//             }

//             $container.html(html);

//             // Animate options appearing
//             gsap.from('.occasion-option-item', {
//                 opacity: 0,
//                 x: -20,
//                 stagger: 0.1,
//                 duration: 0.5,
//                 ease: 'power2.out'
//             });
//         },

//         // Hide form with animation
//         hideForm: function () {
//             const $infoCard = $('#occasionInfoCard');
//             const $formContainer = $('#bookingFormContainer');

//             gsap.to([$infoCard, $formContainer], {
//                 opacity: 0,
//                 y: -20,
//                 duration: 0.4,
//                 ease: 'power2.in',
//                 onComplete: () => {
//                     $infoCard.hide();
//                     $formContainer.hide();
//                 }
//             });
//         },

//         // Validate form
//         validateForm: function () {
//             const form = document.getElementById('bookingForm');
//             let isValid = true;

//             // Check native HTML5 validation
//             if (!form.checkValidity()) {
//                 form.classList.add('was-validated');
//                 isValid = false;
//             }

//             // Check payment method selection
//             const paymentSelected = $('.payment-checkbox:checked').length > 0;
//             if (!paymentSelected) {
//                 $('#paymentError').show();
//                 isValid = false;
//             } else {
//                 $('#paymentError').hide();
//             }

//             // Check occasion option selection
//             const optionSelected = $('input[name="occasionOption"]:checked').length > 0;
//             if (!optionSelected) {
//                 TempleCore.showToast('Please select an occasion option', 'error');
//                 isValid = false;
//             }

//             return isValid;
//         },

//         // Collect form data
//         collectFormData: function () {
//             const selectedPayments = [];
//             $('.payment-checkbox:checked').each(function () {
//                 const label = $(`label[for="${$(this).attr('id')}"]`).text().trim();
//                 selectedPayments.push(label);
//             });

//             const occasionOption = $('input[name="occasionOption"]:checked');
//             const optionLabel = occasionOption.length > 0
//                 ? $(`label[for="${occasionOption.attr('id')}"]`).text().trim()
//                 : '';

//             return {
//                 occasion: this.occasions[this.selectedOccasion].nameChinese,
//                 nameChinese: $('#nameChinese').val(),
//                 nameEnglish: $('#nameEnglish').val(),
//                 nric: $('#nric').val(),
//                 email: $('#email').val(),
//                 contactNo: $('#contactNo').val(),
//                 occasionOption: optionLabel,
//                 paymentMethods: selectedPayments,
//                 remark: $('#remark').val()
//             };
//         },

//         // Submit form
//         // Submit form
//         submitForm: function () {
//             if (!this.validateForm()) {
//                 // Shake animation for invalid form
//                 gsap.fromTo('#bookingForm',
//                     { x: -10 },
//                     {
//                         x: 10,
//                         repeat: 3,
//                         yoyo: true,
//                         duration: 0.1,
//                         ease: 'power1.inOut'
//                     }
//                 );
//                 return;
//             }

//             const self = this;
//             const formData = this.collectFormData();

//             // Show loading animation
//             const $submitBtn = $('.btn-submit-custom');
//             const originalText = $submitBtn.html();
//             $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...');

//             // Prepare data for API
//             const selectedOccasion = this.occasions[this.selectedOccasion];
//             const occasionOption = $('input[name="occasionOption"]:checked');
//             const optionIndex = occasionOption.val().replace('option-', '');
//             const selectedOption = selectedOccasion.options[optionIndex];

//             const apiData = {
//                 special_occasion_id: selectedOccasion.id,
//                 occasion_name: selectedOccasion.name,
//                 occasion_option: selectedOption.label,
//                 occasion_amount: selectedOption.price.replace('RM ', '').trim() || 0,
//                 name_chinese: $('#nameChinese').val(),
//                 name_english: $('#nameEnglish').val(),
//                 nric: $('#nric').val(),
//                 email: $('#email').val(),
//                 contact_no: $('#contactNo').val(),
//                 payment_methods: formData.paymentMethods.join(', '),
//                 remark: $('#remark').val() || null
//             };

//             // Call API to save booking
//             TempleAPI.post('/special-occasions/bookings', apiData)
//                 .done(function (response) {
//                     if (response.success) {
//                         // Success animation
//                         gsap.to('#bookingForm', {
//                             scale: 0.95,
//                             opacity: 0.5,
//                             duration: 0.3,
//                             onComplete: () => {
//                                 self.showSuccessMessage(formData);
//                                 $submitBtn.prop('disabled', false).html(originalText);
//                             }
//                         });
//                     } else {
//                         TempleCore.showToast(response.message || 'Failed to submit booking', 'error');
//                         $submitBtn.prop('disabled', false).html(originalText);
//                     }
//                 })
//                 .fail(function (xhr) {
//                     console.error('Booking submission failed:', xhr);
//                     const errorMsg = xhr.responseJSON?.message || 'Failed to submit booking. Please try again.';
//                     TempleCore.showToast(errorMsg, 'error');
//                     $submitBtn.prop('disabled', false).html(originalText);
//                 });
//         },

//         // Show success message
//         // showSuccessMessage: function (formData) {
//         //     const summaryHTML = `
//         //         <div class="booking-summary">
//         //             <div class="mb-3">
//         //                 <strong>Occasion:</strong><br>${formData.occasion}
//         //             </div>
//         //             <div class="mb-3">
//         //                 <strong>Name:</strong><br>
//         //                 ${formData.nameChinese} / ${formData.nameEnglish}
//         //             </div>
//         //             <div class="mb-3">
//         //                 <strong>NRIC:</strong> ${formData.nric}
//         //             </div>
//         //             <div class="mb-3">
//         //                 <strong>Email:</strong> ${formData.email}
//         //             </div>
//         //             <div class="mb-3">
//         //                 <strong>Contact:</strong> ${formData.contactNo}
//         //             </div>
//         //             <div class="mb-3">
//         //                 <strong>Option:</strong><br>${formData.occasionOption}
//         //             </div>
//         //             <div class="mb-3">
//         //                 <strong>Payment:</strong><br>${formData.paymentMethods.join(', ')}
//         //             </div>
//         //             ${formData.remark ? `<div class="mb-3"><strong>Remark:</strong><br>${formData.remark}</div>` : ''}
//         //         </div>
//         //     `;

//         //     Swal.fire({
//         //         icon: 'success',
//         //         title: 'Booking Submitted Successfully!',
//         //         html: summaryHTML,
//         //         confirmButtonText: 'Make Another Booking',
//         //         showCancelButton: true,
//         //         cancelButtonText: 'View History',
//         //         confirmButtonColor: '#28a745',
//         //         cancelButtonColor: '#6c757d',
//         //         customClass: {
//         //             popup: 'animated-popup'
//         //         }
//         //     }).then((result) => {
//         //         if (result.isConfirmed) {
//         //             this.resetForm();
//         //         } else if (result.dismiss === Swal.DismissReason.cancel) {
//         //             // Navigate to history page (to be implemented)
//         //             TempleCore.showToast('History page will be implemented soon', 'info');
//         //         }
//         //     });

//         //     // Reset form after success
//         //     gsap.to('#bookingForm', {
//         //         scale: 1,
//         //         opacity: 1,
//         //         duration: 0.3
//         //     });
//         // },



//         // Show success message
//         showSuccessMessage: function (formData) {
//             const summaryHTML = `
//         <div class="booking-summary">
//             <div class="mb-3">
//                 <strong>Occasion:</strong><br>${formData.occasion}
//             </div>
//             <div class="mb-3">
//                 <strong>Name:</strong><br>
//                 ${formData.nameChinese} / ${formData.nameEnglish}
//             </div>
//             <div class="mb-3">
//                 <strong>NRIC:</strong> ${formData.nric}
//             </div>
//             <div class="mb-3">
//                 <strong>Email:</strong> ${formData.email}
//             </div>
//             <div class="mb-3">
//                 <strong>Contact:</strong> ${formData.contactNo}
//             </div>
//             <div class="mb-3">
//                 <strong>Option:</strong><br>${formData.occasionOption}
//             </div>
//             <div class="mb-3">
//                 <strong>Payment:</strong><br>${formData.paymentMethods.join(', ')}
//             </div>
//             ${formData.remark ? `<div class="mb-3"><strong>Remark:</strong><br>${formData.remark}</div>` : ''}
//         </div>
//     `;

//             Swal.fire({
//                 icon: 'success',
//                 title: 'Booking Submitted Successfully!',
//                 html: summaryHTML,
//                 confirmButtonText: 'Make Another Booking',
//                 showCancelButton: true,
//                 cancelButtonText: 'View History',
//                 confirmButtonColor: '#28a745',
//                 cancelButtonColor: '#6c757d',
//                 allowOutsideClick: true,  // ← Allow closing by clicking outside
//                 allowEscapeKey: true,     // ← Allow closing with ESC key
//                 showCloseButton: true,    // ← Show X close button
//                 customClass: {
//                     popup: 'animated-popup'
//                 }
//             }).then((result) => {
//                 // Reset form animation
//                 gsap.to('#bookingForm', {
//                     scale: 1,
//                     opacity: 1,
//                     duration: 0.3
//                 });

//                 if (result.isConfirmed) {
//                     // Make Another Booking button clicked
//                     this.resetForm();
//                 } else if (result.dismiss === Swal.DismissReason.cancel) {
//                     // View History button clicked
//                     TempleCore.showToast('History page is coming soon!', 'info');
//                 } else {
//                     // Modal closed by X button, outside click, or ESC
//                     // Just refresh the page or reset the form
//                     this.resetForm();
//                 }
//             });
//         },

//         // Reset form
//         resetForm: function () {
//             const form = document.getElementById('bookingForm');
//             form.reset();
//             form.classList.remove('was-validated');
//             $('.payment-checkbox').prop('checked', false);
//             $('#paymentError').hide();

//             // Animate reset
//             gsap.fromTo('#bookingForm',
//                 { opacity: 0, scale: 0.95 },
//                 { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
//             );

//             TempleCore.showToast('Form reset successfully', 'info');
//         },

//         // Bind events
//         bindEvents: function () {
//             const self = this;

//             // Occasion type selection
//             $('#occasionType').on('change', function () {
//                 const selectedOccasion = $(this).val();

//                 if (selectedOccasion) {
//                     self.selectedOccasion = selectedOccasion;
//                     self.showOccasionInfo(selectedOccasion);

//                     // Add selection animation
//                     gsap.fromTo(this,
//                         { scale: 1 },
//                         {
//                             scale: 1.05,
//                             duration: 0.2,
//                             yoyo: true,
//                             repeat: 1,
//                             ease: 'power1.inOut'
//                         }
//                     );
//                 } else {
//                     self.hideForm();
//                 }
//             });

//             // Payment method checkboxes with animation
//             $(document).on('change', '.payment-checkbox', function () {
//                 const $item = $(this).closest('.payment-method-item');

//                 if ($(this).is(':checked')) {
//                     gsap.to($item, {
//                         scale: 1.05,
//                         duration: 0.2,
//                         ease: 'back.out(1.7)'
//                     });
//                     $item.addClass('selected');
//                 } else {
//                     gsap.to($item, {
//                         scale: 1,
//                         duration: 0.2
//                     });
//                     $item.removeClass('selected');
//                 }

//                 // Hide error if at least one is selected
//                 if ($('.payment-checkbox:checked').length > 0) {
//                     $('#paymentError').hide();
//                 }
//             });

//             // Form submission
//             $('#bookingForm').on('submit', function (e) {
//                 e.preventDefault();
//                 self.submitForm();
//             });

//             // Reset button
//             $('#btnReset').on('click', function () {
//                 Swal.fire({
//                     title: 'Reset Form?',
//                     text: 'All entered data will be cleared.',
//                     icon: 'warning',
//                     showCancelButton: true,
//                     confirmButtonColor: '#d33',
//                     cancelButtonColor: '#6c757d',
//                     confirmButtonText: 'Yes, reset it!',
//                     cancelButtonText: 'Cancel'
//                 }).then((result) => {
//                     if (result.isConfirmed) {
//                         self.resetForm();
//                     }
//                 });
//             });

//             // View history button
//             $('#btnViewHistory').on('click', function () {
//                 TempleCore.showToast('History page will be implemented soon', 'info');
//             });

//             // Input field animations on focus
//             $(document).on('focus', '.form-control-custom', function () {
//                 gsap.to($(this), {
//                     scale: 1.02,
//                     duration: 0.2,
//                     ease: 'power1.out'
//                 });
//             }).on('blur', '.form-control-custom', function () {
//                 gsap.to($(this), {
//                     scale: 1,
//                     duration: 0.2
//                 });
//             });
//         }
//     };

// })(jQuery, window);









// js/pages/special-occasions/index.js
// Special Occasions Booking Module with GSAP + AOS Animations

(function ($, window) {
    'use strict';
	if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
			eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Special Occasions CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Special Occasions page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Special Occasions page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('Special Occasions CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all occasions-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Special Occasions module cleaned up');
            }
        };
    }
    window.SpecialOccasionsCreatePage = {
        // Occasion configurations - will be loaded from API
        occasions: {},
		pageId: 'occasions-create',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,
        paymentMethods: [
            { value: 'cash', label: 'Cash 现款' },
            { value: 'cheque', label: 'Cheque 支票' },
            { value: 'ebanking', label: 'E-banking 银行转账' },
            { value: 'card', label: 'Credit/Debit Card 信用卡' },
            { value: 'duitnow', label: 'DuitNow (E-wallet) 电子钱包' }
        ],

        selectedOccasion: null,
        formData: {},

        // Page initialization
        init: function (params) {
            const self = this;
            window.OccasionsSharedModule.registerPage(this.pageId);
            this.render();
            this.initAnimations();

            // Load occasions from API first, then bind events
            this.loadOccasions().then(function () {
                self.bindEvents();
            }).fail(function () {
                TempleCore.showToast('Failed to load special occasions', 'error');
            });
        },

        // Load occasions from API
        loadOccasions: function () {
            const self = this;
            const deferred = $.Deferred();

            // Show loading indicator
            $('#occasionType').html('<option value="">Loading occasions...</option>');

            TempleAPI.get('/special-occasions', { status: 'active' })
                .done(function (response) {
                    if (response.success && response.data) {
                        // Transform API data to match frontend format
                        self.occasions = {};

                        response.data.forEach(function (occasion) {
                            // Create a key from the ID
                            const key = 'occasion-' + occasion.id;

                            // Transform occasion_options from API to frontend format
                            const options = [];
                            if (occasion.occasion_options && Array.isArray(occasion.occasion_options)) {
                                occasion.occasion_options.forEach(function (opt, index) {
                                    options.push({
                                        value: 'option-' + index,
                                        label: opt.option_name,
                                        price: opt.amount ? `RM ${opt.amount}` : ''
                                    });
                                });
                            }

                            // Store the transformed occasion
                            self.occasions[key] = {
                                id: occasion.id,
                                name: occasion.occasion_name_primary,
                                nameChinese: occasion.occasion_name_secondary || occasion.occasion_name_primary,
                                icon: 'bi-star', // Default icon
                                color: '#FFD700', // Default color
                                options: options,
                                primary_lang: occasion.primary_lang,
                                secondary_lang: occasion.secondary_lang
                            };
                        });

                        // Re-render the dropdown with new options
                        $('#occasionType').html(`
                            <option value="">-- Select an Occasion 选择场合 --</option>
                            ${self.renderOccasionOptions()}
                        `);

                        console.log('Loaded occasions:', self.occasions);
                        deferred.resolve();
                    } else {
                        $('#occasionType').html('<option value="">No occasions available</option>');
                        TempleCore.showToast('No active occasions found', 'warning');
                        deferred.reject();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load occasions:', xhr);
                    $('#occasionType').html('<option value="">Failed to load occasions</option>');
                    TempleCore.showToast('Failed to load occasions from server', 'error');
                    deferred.reject();
                });

            return deferred.promise();
        },

		// Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.OccasionsSharedModule.unregisterPage(this.pageId);
            
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
        render: function () {
            const html = `
                <div class="special-occasions-page">
                    <!-- Page Header with Animation -->
                    <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-calendar-event occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Special Occasions Booking</h1>
                                            <p class="occasion-subtitle">特别场合预订 • Temple Sacred Ceremonies</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnViewHistory">
                                        <i class="bi bi-clock-history"></i> View History
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid mt-4">
                        <div class="row justify-content-center">
                            <div class="col-xl-10">
                                <!-- Occasion Selection Card -->
                                <div class="occasion-card" data-aos="fade-up" data-aos-delay="200">
                                    <div class="card-header-custom">
                                        <i class="bi bi-calendar-check"></i>
                                        <span>Select Special Occasion</span>
                                    </div>
                                    <div class="card-body-custom">
                                        <div class="occasion-selector-wrapper">
                                            <label class="form-label-custom">Choose Occasion Type 选择场合类型</label>
                                            <select class="form-select form-select-lg occasion-select" id="occasionType">
                                                <option value="">-- Select an Occasion 选择场合 --</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- Occasion Info Card (Hidden initially) -->
                                <div class="occasion-info-card" id="occasionInfoCard" style="display: none;">
                                    <div class="occasion-info-content">
                                        <div class="occasion-info-icon" id="occasionIcon">
                                            <i class="bi bi-star"></i>
                                        </div>
                                        <div>
                                            <h3 class="occasion-info-title" id="occasionName"></h3>
                                            <p class="occasion-info-subtitle" id="occasionNameChinese"></p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Booking Form (Hidden initially) -->
                                <div class="booking-form-container" id="bookingFormContainer" style="display: none;">
                                    <form id="bookingForm">
                                        <div class="row">
                                            <!-- Personal Information Section -->
                                            <div class="col-lg-6">
                                                <div class="occasion-card" data-aos="fade-right" data-aos-delay="300">
                                                    <div class="card-header-custom">
                                                        <i class="bi bi-person-circle"></i>
                                                        <span>Personal Information 个人资料</span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <!-- Name Fields -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">Name 姓名 (Chinese 中)</label>
                                                            <input type="text" class="form-control form-control-custom" id="nameChinese" required>
                                                            <div class="invalid-feedback">Please enter Chinese name</div>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">Name (English 英)</label>
                                                            <input type="text" class="form-control form-control-custom" id="nameEnglish" required>
                                                            <div class="invalid-feedback">Please enter English name</div>
                                                        </div>

                                                        <!-- NRIC -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">NRIC No. 身份证</label>
                                                            <input type="text" class="form-control form-control-custom" id="nric" placeholder="e.g., 123456-12-1234" required>
                                                            <div class="invalid-feedback">Please enter NRIC number</div>
                                                        </div>

                                                        <!-- Email -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">Email 电邮</label>
                                                            <input type="email" class="form-control form-control-custom" id="email" placeholder="your.email@example.com" required>
                                                            <div class="invalid-feedback">Please enter a valid email</div>
                                                        </div>

                                                        <!-- Contact No -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom required">Contact No. 手机号码</label>
                                                            <input type="tel" class="form-control form-control-custom" id="contactNo" placeholder="e.g., +60123456789" required>
                                                            <div class="invalid-feedback">Please enter contact number</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Occasion & Payment Section -->
                                            <div class="col-lg-6">
                                                <div class="occasion-card" data-aos="fade-left" data-aos-delay="300">
                                                    <div class="card-header-custom">
                                                        <i class="bi bi-clipboard-check"></i>
                                                        <span>Occasion Details 场合详情</span>
                                                    </div>
                                                    <div class="card-body-custom">
                                                        <!-- Occasion Options -->
                                                        <div class="mb-4" id="occasionOptionsContainer">
                                                            <label class="form-label-custom required">Occasion Option 选项</label>
                                                            <div id="occasionOptionsGroup"></div>
                                                        </div>

                                                        <!-- Payment Methods -->
                                                        <div class="mb-4">
                                                            <label class="form-label-custom required">Payment Method 付款方式</label>
                                                            <div class="payment-methods-grid">
                                                                ${this.renderPaymentMethods()}
                                                            </div>
                                                            <div class="invalid-feedback d-block" id="paymentError" style="display: none !important;">
                                                                Please select at least one payment method
                                                            </div>
                                                        </div>

                                                        <!-- Remarks -->
                                                        <div class="mb-3">
                                                            <label class="form-label-custom">Remark 备注</label>
                                                            <textarea class="form-control form-control-custom" id="remark" rows="3" placeholder="Optional notes..."></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Submit Button -->
                                        <div class="text-center mt-4" data-aos="fade-up" data-aos-delay="400">
                                            <button type="button" class="btn btn-lg btn-secondary me-3" id="btnReset">
                                                <i class="bi bi-arrow-counterclockwise"></i> Reset Form
                                            </button>
                                            <button type="submit" class="btn btn-lg btn-primary btn-submit-custom">
                                                <i class="bi bi-check-circle"></i> Submit Booking
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Render occasion dropdown options
        renderOccasionOptions: function () {
            let html = '';
            for (const [key, occasion] of Object.entries(this.occasions)) {
                html += `<option value="${key}">${occasion.name} ${occasion.nameChinese}</option>`;
            }
            return html;
        },

        // Render payment methods
        renderPaymentMethods: function () {
            let html = '';
            this.paymentMethods.forEach(method => {
                html += `
                    <div class="payment-method-item">
                        <input type="checkbox" class="form-check-input payment-checkbox" id="payment-${method.value}" value="${method.value}">
                        <label class="form-check-label" for="payment-${method.value}">
                            <i class="bi bi-${this.getPaymentIcon(method.value)}"></i>
                            ${method.label}
                        </label>
                    </div>
                `;
            });
            return html;
        },

        // Get payment method icon
        getPaymentIcon: function (value) {
            const icons = {
                'cash': 'cash-stack',
                'cheque': 'receipt',
                'ebanking': 'bank',
                'card': 'credit-card',
                'duitnow': 'wallet2'
            };
            return icons[value] || 'cash';
        },

        // Initialize animations
        initAnimations: function () {
            // Initialize AOS
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true,
                offset: 100
            });

            // Animate header background
            gsap.to('.occasion-header-bg', {
                backgroundPosition: '100% 50%',
                duration: 20,
                repeat: -1,
                yoyo: true,
                ease: 'none'
            });

            // Floating animation for header icon
            gsap.to('.occasion-header-icon', {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
        },

        // Show occasion info with animation
        showOccasionInfo: function (occasionKey) {
            const occasion = this.occasions[occasionKey];
            const $infoCard = $('#occasionInfoCard');
            const $formContainer = $('#bookingFormContainer');

            // Update info card content
            $('#occasionIcon').html(`<i class="bi ${occasion.icon}"></i>`).css('background', occasion.color);
            $('#occasionName').text(occasion.name);
            $('#occasionNameChinese').text(occasion.nameChinese);

            // Show info card with GSAP animation
            if ($infoCard.is(':hidden')) {
                gsap.fromTo($infoCard,
                    { opacity: 0, y: -30, display: 'none' },
                    { opacity: 1, y: 0, display: 'block', duration: 0.6, ease: 'back.out(1.7)' }
                );
            }

            // Render occasion-specific options
            this.renderOccasionOptionsList(occasion);

            // Show form container with staggered animation
            if ($formContainer.is(':hidden')) {
                gsap.fromTo($formContainer,
                    { opacity: 0, y: 30, display: 'none' },
                    {
                        opacity: 1,
                        y: 0,
                        display: 'block',
                        duration: 0.8,
                        ease: 'power2.out',
                        onComplete: () => {
                            // Animate form fields in sequence
                            gsap.from('.occasion-card', {
                                opacity: 0,
                                y: 20,
                                stagger: 0.2,
                                duration: 0.6,
                                ease: 'power2.out'
                            });
                        }
                    }
                );
            }

            // Scroll to form smoothly
            setTimeout(() => {
                $('html, body').animate({
                    scrollTop: $formContainer.offset().top - 100
                }, 800);
            }, 300);
        },

        // Render occasion-specific options (radio buttons for selected occasion)
        renderOccasionOptionsList: function (occasion) {
            const $container = $('#occasionOptionsGroup');
            $container.empty();

            let html = '';
            occasion.options.forEach((option, index) => {
                const radioId = `option-${index}`;
                const priceText = option.price ? `<span class="option-price">${option.price}</span>` : '';

                html += `
                    <div class="occasion-option-item">
                        <input type="radio" class="form-check-input" name="occasionOption" id="${radioId}" value="${option.value}" required>
                        <label class="form-check-label" for="${radioId}">
                            <span class="option-label">${option.label}</span>
                            ${priceText}
                        </label>
                    </div>
                `;
            });

            // Add fixed amount display for occasions like Guanyin Bodhisattva
            if (occasion.fixedAmount) {
                html += `
                    <div class="fixed-amount-display">
                        <i class="bi bi-tag"></i> Amount: ${occasion.fixedAmount}
                    </div>
                `;
            }

            $container.html(html);

            // Animate options appearing
            gsap.from('.occasion-option-item', {
                opacity: 0,
                x: -20,
                stagger: 0.1,
                duration: 0.5,
                ease: 'power2.out'
            });
        },

        // Hide form with animation
        hideForm: function () {
            const $infoCard = $('#occasionInfoCard');
            const $formContainer = $('#bookingFormContainer');

            gsap.to([$infoCard, $formContainer], {
                opacity: 0,
                y: -20,
                duration: 0.4,
                ease: 'power2.in',
                onComplete: () => {
                    $infoCard.hide();
                    $formContainer.hide();
                }
            });
        },

        // Validate form
        validateForm: function () {
            const form = document.getElementById('bookingForm');
            let isValid = true;

            // Check native HTML5 validation
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                isValid = false;
            }

            // Check payment method selection
            const paymentSelected = $('.payment-checkbox:checked').length > 0;
            if (!paymentSelected) {
                $('#paymentError').show();
                isValid = false;
            } else {
                $('#paymentError').hide();
            }

            // Check occasion option selection
            const optionSelected = $('input[name="occasionOption"]:checked').length > 0;
            if (!optionSelected) {
                TempleCore.showToast('Please select an occasion option', 'error');
                isValid = false;
            }

            return isValid;
        },

        // Collect form data
        collectFormData: function () {
            const selectedPayments = [];
            $('.payment-checkbox:checked').each(function () {
                const label = $(`label[for="${$(this).attr('id')}"]`).text().trim();
                selectedPayments.push(label);
            });

            const occasionOption = $('input[name="occasionOption"]:checked');
            const optionLabel = occasionOption.length > 0
                ? $(`label[for="${occasionOption.attr('id')}"]`).text().trim()
                : '';

            return {
                occasion: this.occasions[this.selectedOccasion].nameChinese,
                nameChinese: $('#nameChinese').val(),
                nameEnglish: $('#nameEnglish').val(),
                nric: $('#nric').val(),
                email: $('#email').val(),
                contactNo: $('#contactNo').val(),
                occasionOption: optionLabel,
                paymentMethods: selectedPayments,
                remark: $('#remark').val()
            };
        },

        // Submit form
        submitForm: function () {
            if (!this.validateForm()) {
                // Shake animation for invalid form
                gsap.fromTo('#bookingForm',
                    { x: -10 },
                    {
                        x: 10,
                        repeat: 3,
                        yoyo: true,
                        duration: 0.1,
                        ease: 'power1.inOut'
                    }
                );
                return;
            }

            const self = this;
            const formData = this.collectFormData();

            // Show loading animation
            const $submitBtn = $('.btn-submit-custom');
            const originalText = $submitBtn.html();
            $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...');

            // Prepare data for API
            const selectedOccasion = this.occasions[this.selectedOccasion];
            const occasionOption = $('input[name="occasionOption"]:checked');
            const optionIndex = occasionOption.val().replace('option-', '');
            const selectedOption = selectedOccasion.options[optionIndex];

            const apiData = {
                special_occasion_id: selectedOccasion.id,
                occasion_name: selectedOccasion.name,
                occasion_option: selectedOption.label,
                occasion_amount: selectedOption.price.replace('RM ', '').trim() || 0,
                name_chinese: $('#nameChinese').val(),
                name_english: $('#nameEnglish').val(),
                nric: $('#nric').val(),
                email: $('#email').val(),
                contact_no: $('#contactNo').val(),
                payment_methods: formData.paymentMethods.join(', '),
                remark: $('#remark').val() || null
            };

            // Call API to save booking
            TempleAPI.post('/special-occasions/bookings', apiData)
                .done(function (response) {
                    if (response.success) {
                        // Success animation
                        gsap.to('#bookingForm', {
                            scale: 0.95,
                            opacity: 0.5,
                            duration: 0.3,
                            onComplete: () => {
                                self.showSuccessMessage(formData);
                                $submitBtn.prop('disabled', false).html(originalText);
                            }
                        });
                    } else {
                        TempleCore.showToast(response.message || 'Failed to submit booking', 'error');
                        $submitBtn.prop('disabled', false).html(originalText);
                    }
                })
                .fail(function (xhr) {
                    console.error('Booking submission failed:', xhr);
                    const errorMsg = xhr.responseJSON?.message || 'Failed to submit booking. Please try again.';
                    TempleCore.showToast(errorMsg, 'error');
                    $submitBtn.prop('disabled', false).html(originalText);
                });
        },

        // Show success message
        showSuccessMessage: function (formData) {
            const summaryHTML = `
                <div class="booking-summary">
                    <div class="mb-3">
                        <strong>Occasion:</strong><br>${formData.occasion}
                    </div>
                    <div class="mb-3">
                        <strong>Name:</strong><br>
                        ${formData.nameChinese} / ${formData.nameEnglish}
                    </div>
                    <div class="mb-3">
                        <strong>NRIC:</strong> ${formData.nric}
                    </div>
                    <div class="mb-3">
                        <strong>Email:</strong> ${formData.email}
                    </div>
                    <div class="mb-3">
                        <strong>Contact:</strong> ${formData.contactNo}
                    </div>
                    <div class="mb-3">
                        <strong>Option:</strong><br>${formData.occasionOption}
                    </div>
                    <div class="mb-3">
                        <strong>Payment:</strong><br>${formData.paymentMethods.join(', ')}
                    </div>
                    ${formData.remark ? `<div class="mb-3"><strong>Remark:</strong><br>${formData.remark}</div>` : ''}
                </div>
            `;

            const self = this;

            Swal.fire({
                icon: 'success',
                title: 'Booking Submitted Successfully!',
                html: summaryHTML,
                confirmButtonText: 'Make Another Booking',
                showCancelButton: true,
                cancelButtonText: 'View History',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                allowOutsideClick: true,
                allowEscapeKey: true,
                showCloseButton: true,
                customClass: {
                    popup: 'animated-popup'
                }
            }).then((result) => {
                // Reset form animation
                gsap.to('#bookingForm', {
                    scale: 1,
                    opacity: 1,
                    duration: 0.3
                });

                if (result.isConfirmed) {
                    // Make Another Booking button clicked
                    self.resetForm();
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    // View History button clicked
                    self.showHistory();
                } else {
                    // Modal closed by X button, outside click, or ESC
                    self.resetForm();
                }
            });
        },

        // Show booking history
        showHistory: function () {
            const self = this;

            // Show loading
            Swal.fire({
                title: 'Loading History...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Fetch booking history
            TempleAPI.get('/special-occasions/bookings/history', { per_page: 20 })
                .done(function (response) {
                    if (response.success && response.data && response.data.length > 0) {
                        self.renderHistoryModal(response.data, response.pagination);
                    } else {
                        Swal.fire({
                            icon: 'info',
                            title: 'No Bookings Found',
                            text: 'You have not made any bookings yet.',
                            confirmButtonColor: '#6c757d'
                        });
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load history:', xhr);
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed to Load History',
                        text: 'Could not retrieve booking history. Please try again.',
                        confirmButtonColor: '#dc3545'
                    });
                });
        },

        // Render history modal with bookings data
        renderHistoryModal: function (bookings, pagination) {
            let historyHTML = `
                <div class="booking-history-container" style="max-height: 500px; overflow-y: auto;">
            `;

            if (bookings.length === 0) {
                historyHTML += `
                    <div class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 48px; color: #dee2e6;"></i>
                        <p class="mt-3 text-muted">No booking history found</p>
                    </div>
                `;
            } else {
                historyHTML += `
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Occasion</th>
                                    <th>Name</th>
                                    <th>Option</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                bookings.forEach(function (booking) {
                    const statusBadge = booking.status === 'pending'
                        ? '<span class="badge bg-warning text-dark">Pending</span>'
                        : booking.status === 'confirmed'
                            ? '<span class="badge bg-success">Confirmed</span>'
                            : booking.status === 'cancelled'
                                ? '<span class="badge bg-danger">Cancelled</span>'
                                : '<span class="badge bg-info">Completed</span>';

                    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });

                    historyHTML += `
                        <tr>
                            <td>${bookingDate}</td>
                            <td>${booking.occasion_name}</td>
                            <td>
                                <div>${booking.name_chinese}</div>
                                <small class="text-muted">${booking.name_english}</small>
                            </td>
                            <td>${booking.occasion_option}</td>
                            <td>RM ${parseFloat(booking.occasion_amount).toFixed(2)}</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                });

                historyHTML += `
                            </tbody>
                        </table>
                    </div>
                `;

                // Add pagination info
                if (pagination && pagination.total > pagination.per_page) {
                    historyHTML += `
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                Showing ${bookings.length} of ${pagination.total} bookings
                            </small>
                        </div>
                    `;
                }
            }

            historyHTML += `</div>`;

            Swal.fire({
                title: 'Booking History',
                html: historyHTML,
                width: '900px',
                showCloseButton: true,
                showConfirmButton: true,
                confirmButtonText: 'Close',
                confirmButtonColor: '#6c757d',
                customClass: {
                    popup: 'booking-history-modal'
                }
            });
        },

        // Reset form
        resetForm: function () {
            const form = document.getElementById('bookingForm');
            form.reset();
            form.classList.remove('was-validated');
            $('.payment-checkbox').prop('checked', false);
            $('#paymentError').hide();

            // Animate reset
            gsap.fromTo('#bookingForm',
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
            );

            TempleCore.showToast('Form reset successfully', 'info');
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Occasion type selection
            $('#occasionType').on('change.' + this.eventNamespace, function () {
                const selectedOccasion = $(this).val();

                if (selectedOccasion) {
                    self.selectedOccasion = selectedOccasion;
                    self.showOccasionInfo(selectedOccasion);

                    // Add selection animation
                    gsap.fromTo(this,
                        { scale: 1 },
                        {
                            scale: 1.05,
                            duration: 0.2,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power1.inOut'
                        }
                    );
                } else {
                    self.hideForm();
                }
            });

            // Payment method checkboxes with animation
            $(document).on('change.' + this.eventNamespace, '.payment-checkbox', function () {
                const $item = $(this).closest('.payment-method-item');

                if ($(this).is(':checked')) {
                    gsap.to($item, {
                        scale: 1.05,
                        duration: 0.2,
                        ease: 'back.out(1.7)'
                    });
                    $item.addClass('selected');
                } else {
                    gsap.to($item, {
                        scale: 1,
                        duration: 0.2
                    });
                    $item.removeClass('selected');
                }

                // Hide error if at least one is selected
                if ($('.payment-checkbox:checked').length > 0) {
                    $('#paymentError').hide();
                }
            });

            // Form submission
            $('#bookingForm').on('submit.' + this.eventNamespace, function (e) {
                e.preventDefault();
                self.submitForm();
            });

            // Reset button
            $('#btnReset').on('click.' + this.eventNamespace, function () {
                Swal.fire({
                    title: 'Reset Form?',
                    text: 'All entered data will be cleared.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, reset it!',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        self.resetForm();
                    }
                });
            });

            // View history button
            $('#btnViewHistory').on('click.' + this.eventNamespace, function () {
                self.showHistory();
            });

            // Input field animations on focus
            $(document).on('focus.' + this.eventNamespace, '.form-control-custom', function () {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur.' + this.eventNamespace, '.form-control-custom', function () {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });
        }
    };

})(jQuery, window);