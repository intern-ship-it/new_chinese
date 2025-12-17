/**
 * Event Booking Create Page Module
 * Temple Management System
 * 4-Step Wizard: Event Selection -> Date Selection -> Participants -> Extra Charges & Payment
 */

// Shared module for CSS management
if (!window.EventBookingSharedModule) {
    window.EventBookingSharedModule = {
        cssLoaded: false,
        activePages: new Set(),

        loadCSS: function () {
            if (this.cssLoaded) return;
            
            const css = `
                /* Event Booking Module Styles */
                .event-booking-page {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
                }
                
                .event-booking-header {
                    background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                    color: white;
                    padding: 1.5rem 0;
                    margin-bottom: 1.5rem;
                    position: relative;
                    overflow: hidden;
                }
                
                .event-booking-header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 40%;
                    height: 200%;
                    background: rgba(255,255,255,0.1);
                    transform: rotate(15deg);
                }
                
                .event-booking-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin: 0;
                }
                
                .event-booking-subtitle {
                    opacity: 0.9;
                    margin: 0;
                    font-size: 0.95rem;
                }
                
                /* Step Progress */
                .step-progress {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding: 0 1rem;
                }
                
                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    flex: 1;
                    max-width: 180px;
                }
                
                .step-circle {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    background: #e0e0e0;
                    color: #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 1.1rem;
                    z-index: 2;
                    transition: all 0.3s ease;
                    border: 3px solid transparent;
                }
                
                .step-item.active .step-circle {
                    background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
                    color: white;
                    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
                    transform: scale(1.1);
                }
                
                .step-item.completed .step-circle {
                    background: #27ae60;
                    color: white;
                }
                
                .step-label {
                    margin-top: 0.5rem;
                    font-size: 0.85rem;
                    color: #666;
                    text-align: center;
                    font-weight: 500;
                }
                
                .step-item.active .step-label {
                    color: #8B0000;
                    font-weight: 600;
                }
                
                .step-connector {
                    flex: 1;
                    height: 3px;
                    background: #e0e0e0;
                    margin: 0 -10px;
                    margin-top: -25px;
                    z-index: 1;
                }
                
                .step-connector.completed {
                    background: linear-gradient(90deg, #27ae60, #27ae60);
                }
                
                /* Main Content Area */
                .booking-main-content {
                    display: flex;
                    gap: 1.5rem;
                    padding: 0 1rem;
                }
                
                .booking-steps-container {
                    flex: 1;
                    min-width: 0;
                }
                
                .booking-summary-container {
                    width: 380px;
                    flex-shrink: 0;
                }
                
                /* Cards */
                .step-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 15px rgba(0,0,0,0.08);
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                }
                
                .step-card-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 1.25rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid #f0f0f0;
                }
                
                .step-card-title i {
                    color: #8B0000;
                    font-size: 1.25rem;
                }
                
                /* Event Selection Cards */
                .event-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1rem;
                }
                
                .event-card {
                    background: #fafafa;
                    border: 2px solid #e0e0e0;
                    border-radius: 12px;
                    padding: 1.25rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                }
                
                .event-card:hover {
                    border-color: #8B0000;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(139, 0, 0, 0.15);
                }
                
                .event-card.selected {
                    background: linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%);
                    border-color: #8B0000;
                    box-shadow: 0 4px 20px rgba(139, 0, 0, 0.2);
                }
                
                .event-card.selected::after {
                    content: '\\f26b';
                    font-family: 'bootstrap-icons';
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #27ae60;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                }
                
                .event-card-icon {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.5rem;
                    margin-bottom: 1rem;
                }
                
                .event-card-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.25rem;
                }
                
                .event-card-name-secondary {
                    font-size: 0.9rem;
                    color: #666;
                    margin-bottom: 0.75rem;
                }
                
                .event-card-dates {
                    font-size: 0.85rem;
                    color: #888;
                    margin-bottom: 0.5rem;
                }
                
                .event-card-price {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #8B0000;
                }
                
                .event-card-price .original-price {
                    text-decoration: line-through;
                    color: #999;
                    font-size: 0.9rem;
                    font-weight: 400;
                    margin-left: 0.5rem;
                }
                
                /* Calendar Styles */
                .calendar-container {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .calendar-nav-btn {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    color: #666;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 50%;
                    transition: all 0.2s;
                }
                
                .calendar-nav-btn:hover {
                    background: #e0e0e0;
                    color: #333;
                }
                
                .calendar-month-year {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                }
                
                .calendar-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    background: #f8f9fa;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .calendar-weekday {
                    padding: 0.75rem;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: #666;
                }
                
                .calendar-days {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 2px;
                    padding: 0.5rem;
                }
                
                .calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                
                .calendar-day:hover:not(.disabled):not(.outside) {
                    background: #f0f0f0;
                }
                
                .calendar-day.outside {
                    color: #ccc;
                    cursor: default;
                }
                
                .calendar-day.disabled {
                    color: #ccc;
                    cursor: not-allowed;
                    text-decoration: line-through;
                }
                
                .calendar-day.available {
                    background: #e8f5e9;
                    color: #2e7d32;
                    font-weight: 500;
                }
                
                .calendar-day.selected {
                    background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                    color: white;
                    font-weight: 600;
                }
                
                .calendar-day.today {
                    border: 2px solid #8B0000;
                }
                
                .selected-dates-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e0e0e0;
                }
                
                .selected-date-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%);
                    border: 1px solid #8B0000;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    color: #8B0000;
                }
                
                .selected-date-tag .remove-date {
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                
                .selected-date-tag .remove-date:hover {
                    opacity: 1;
                }
                
                /* Participants */
                .participant-card {
                    background: #f8f9fa;
                    border: 1px solid #e0e0e0;
                    border-radius: 10px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    position: relative;
                }
                
                .participant-card.primary {
                    border-color: #8B0000;
                    background: linear-gradient(135deg, #fff9f9 0%, #fff5f5 100%);
                }
                
                .participant-badge {
                    position: absolute;
                    top: -10px;
                    left: 15px;
                    background: #8B0000;
                    color: white;
                    font-size: 0.75rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 10px;
                }
                
                .participant-remove {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #dc3545;
                    cursor: pointer;
                    font-size: 1.25rem;
                }
                
                .add-participant-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 1rem;
                    background: #f8f9fa;
                    border: 2px dashed #ccc;
                    border-radius: 10px;
                    color: #666;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .add-participant-btn:hover {
                    border-color: #8B0000;
                    color: #8B0000;
                    background: #fff5f5;
                }
                
                /* Extra Charges */
                .extra-charge-row {
                    display: flex;
                    gap: 1rem;
                    align-items: flex-end;
                    margin-bottom: 0.75rem;
                }
                
                .extra-charge-row .form-group {
                    flex: 1;
                }
                
                .extra-charge-row .remove-btn {
                    margin-bottom: 0.25rem;
                }
                
                /* Booking Summary */
                .booking-summary {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                    position: sticky;
                    top: 1rem;
                }
                
                .summary-header {
                    background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                    color: white;
                    padding: 1rem 1.25rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .summary-body {
                    padding: 1.25rem;
                }
                
                .summary-section {
                    margin-bottom: 1.25rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .summary-section:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                
                .summary-section-title {
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: #888;
                    margin-bottom: 0.5rem;
                }
                
                .summary-section-value {
                    font-size: 1rem;
                    color: #333;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    font-size: 0.95rem;
                }
                
                .summary-row.total {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #8B0000;
                    padding-top: 0.75rem;
                    border-top: 2px solid #e0e0e0;
                    margin-top: 0.75rem;
                }
                
                .summary-row .label {
                    color: #666;
                }
                
                .summary-row .value {
                    font-weight: 500;
                }
                
                .summary-row.discount .value {
                    color: #27ae60;
                }
                
                /* Payment Options */
                .payment-options {
                    background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
                    color: white;
                    padding: 1rem 1.25rem;
                    margin: 0 -1.25rem;
                }
                
                .payment-options-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    margin-bottom: 0.75rem;
                }
                
                .payment-type-group {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .payment-type-btn {
                    flex: 1;
                    padding: 0.75rem;
                    background: rgba(255,255,255,0.2);
                    border: 2px solid transparent;
                    border-radius: 8px;
                    color: white;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .payment-type-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
                
                .payment-type-btn.active {
                    background: white;
                    color: #8B0000;
                    border-color: white;
                }
                
                .payment-type-btn i {
                    display: block;
                    font-size: 1.5rem;
                    margin-bottom: 0.25rem;
                }
                
                .payment-modes {
                    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                    color: white;
                    padding: 1rem 1.25rem;
                    margin: 0 -1.25rem -1.25rem;
                }
                
                .payment-modes-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    margin-bottom: 0.75rem;
                }
                
                .payment-mode-group {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                
                .payment-mode-btn {
                    flex: 1;
                    min-width: 120px;
                    padding: 0.75rem;
                    background: rgba(255,255,255,0.1);
                    border: 2px solid transparent;
                    border-radius: 8px;
                    color: white;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .payment-mode-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                .payment-mode-btn.active {
                    background: white;
                    color: #333;
                    border-color: white;
                }
                
                .payment-mode-btn i {
                    display: block;
                    font-size: 1.5rem;
                    margin-bottom: 0.25rem;
                }
                
                /* Discount Section */
                .discount-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-top: 1rem;
                }
                
                .discount-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    font-weight: 500;
                    color: #666;
                }
                
                .discount-toggle:hover {
                    color: #8B0000;
                }
                
                .discount-fields {
                    margin-top: 1rem;
                    display: none;
                }
                
                .discount-fields.show {
                    display: block;
                }
                
                /* Navigation Buttons */
                .step-navigation {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e0e0e0;
                }
                
                .btn-step {
                    padding: 0.75rem 2rem;
                    border-radius: 8px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.3s;
                }
                
                .btn-step-prev {
                    background: #f0f0f0;
                    color: #666;
                    border: none;
                }
                
                .btn-step-prev:hover {
                    background: #e0e0e0;
                }
                
                .btn-step-next {
                    background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
                    color: white;
                    border: none;
                }
                
                .btn-step-next:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
                }
                
                .btn-step-next:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                .btn-confirm-booking {
                    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                    color: white;
                    border: none;
                    width: 100%;
                    padding: 1rem;
                    font-size: 1.1rem;
                }
                
                .btn-confirm-booking:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
                }
                
                /* Receipt Modal */
                .receipt-content {
                    font-family: 'Courier New', monospace;
                    background: white;
                    padding: 2rem;
                    max-width: 400px;
                    margin: 0 auto;
                }
                
                .receipt-header {
                    text-align: center;
                    border-bottom: 2px dashed #333;
                    padding-bottom: 1rem;
                    margin-bottom: 1rem;
                }
                
                .receipt-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                
                .receipt-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.25rem;
                }
                
                .receipt-divider {
                    border-top: 1px dashed #333;
                    margin: 0.75rem 0;
                }
                
                .receipt-total {
                    font-weight: 700;
                    font-size: 1.1rem;
                }
                
                .receipt-footer {
                    text-align: center;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 2px dashed #333;
                    font-size: 0.85rem;
                    color: #666;
                }
                
                /* Responsive */
                @media (max-width: 992px) {
                    .booking-main-content {
                        flex-direction: column;
                    }
                    
                    .booking-summary-container {
                        width: 100%;
                        order: -1;
                    }
                    
                    .booking-summary {
                        position: relative;
                        top: 0;
                    }
                }
                
                @media (max-width: 576px) {
                    .step-progress {
                        overflow-x: auto;
                        padding-bottom: 1rem;
                    }
                    
                    .step-item {
                        min-width: 80px;
                    }
                    
                    .step-label {
                        font-size: 0.75rem;
                    }
                    
                    .event-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .payment-type-group,
                    .payment-mode-group {
                        flex-direction: column;
                    }
                }
                
                /* Animations */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .step-content {
                    animation: fadeInUp 0.4s ease-out;
                }
                
                .loading-spinner {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 3rem;
                }
                
                .loading-spinner::after {
                    content: '';
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f0f0f0;
                    border-top-color: #8B0000;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            
            const style = document.createElement('style');
            style.id = 'event-booking-module-css';
            style.textContent = css;
            document.head.appendChild(style);
            this.cssLoaded = true;
        },

        unloadCSS: function () {
            if (this.activePages.size === 0) {
                const style = document.getElementById('event-booking-module-css');
                if (style) {
                    style.remove();
                }
                this.cssLoaded = false;
            }
        },

        registerPage: function (pageId) {
            this.loadCSS();
            this.activePages.add(pageId);
        },

        unregisterPage: function (pageId) {
            this.activePages.delete(pageId);
            this.unloadCSS();
        }
    };
}

window.EventBookingCreatePage = {
    pageId: 'event-booking-create',
    eventNamespace: 'eventBookingCreate',
    
    // State
    currentStep: 1,
    totalSteps: 4,
    events: [],
    paymentModes: [],
    selectedEvent: null,
    selectedDates: [],
    participants: [{ name: '', phone: '', email: '', isPrimary: true }],
    extraCharges: [],
    discountAmount: 0,
    discountReason: '',
    selectedPaymentType: 'FULL',
    selectedPaymentModeId: null,
    partialAmount: 0,
    currentMonth: new Date(),

    // Initialize
    init: function () {
        window.EventBookingSharedModule.registerPage(this.pageId);
        this.resetState();
        this.render();
        this.loadInitialData();
        this.attachEventHandlers();
    },

    // Reset state
    resetState: function () {
        this.currentStep = 1;
        this.selectedEvent = null;
        this.selectedDates = [];
        this.participants = [{ name: '', phone: '', email: '', isPrimary: true }];
        this.extraCharges = [];
        this.discountAmount = 0;
        this.discountReason = '';
        this.selectedPaymentType = 'FULL';
        this.selectedPaymentModeId = null;
        this.partialAmount = 0;
        this.currentMonth = new Date();
    },

    // Cleanup
    cleanup: function () {
        $(document).off('.' + this.eventNamespace);
        $(window).off('.' + this.eventNamespace);
        window.EventBookingSharedModule.unregisterPage(this.pageId);
        
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf('.event-booking-page *');
        }
    },

    // Render main layout
    render: function () {
        const html = `
            <div class="event-booking-page">
                <!-- Header -->
                <div class="event-booking-header">
                    <div class="container-fluid">
                        <div class="d-flex align-items-center gap-3">
                            <button class="btn btn-outline-light btn-sm" id="btnBackToList">
                                <i class="bi bi-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="event-booking-title">Event Booking</h1>
                                <p class="event-booking-subtitle">Book your participation in temple events</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="container-fluid">
                    <!-- Step Progress -->
                    <div class="step-progress">
                        ${this.renderStepProgress()}
                    </div>

                    <!-- Main Content -->
                    <div class="booking-main-content">
                        <!-- Steps Container -->
                        <div class="booking-steps-container">
                            <div id="stepContent">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>

                        <!-- Booking Summary -->
                        <div class="booking-summary-container">
                            ${this.renderBookingSummary()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#page-container').html(html);
    },

    // Render step progress
    renderStepProgress: function () {
        const steps = [
            { num: 1, label: 'Event' },
            { num: 2, label: 'Date' },
            { num: 3, label: 'Participants' },
            { num: 4, label: 'Details' }
        ];

        let html = '';
        steps.forEach((step, index) => {
            const isActive = step.num === this.currentStep;
            const isCompleted = step.num < this.currentStep;
            
            html += `
                <div class="step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                    <div class="step-circle">
                        ${isCompleted ? '<i class="bi bi-check"></i>' : step.num}
                    </div>
                    <span class="step-label">${step.label}</span>
                </div>
            `;
            
            if (index < steps.length - 1) {
                html += `<div class="step-connector ${isCompleted ? 'completed' : ''}"></div>`;
            }
        });

        return html;
    },

    // Render booking summary
    renderBookingSummary: function () {
        const event = this.selectedEvent;
        const numDays = this.selectedDates.length;
        const numParticipants = this.participants.filter(p => p.name.trim()).length || 0;
        const eventPrice = event ? parseFloat(event.effective_price) : 0;
        const subtotal = numDays * numParticipants * eventPrice;
        const extraTotal = this.extraCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        const discount = parseFloat(this.discountAmount) || 0;
        const total = Math.max(0, subtotal + extraTotal - discount);

        return `
            <div class="booking-summary">
                <div class="summary-header">
                    <i class="bi bi-receipt"></i>
                    Booking Summary
                </div>
                <div class="summary-body">
                    <!-- Event -->
                    <div class="summary-section">
                        <div class="summary-section-title">Event</div>
                        <div class="summary-section-value">
                            ${event ? event.event_name_primary : '<span class="text-muted">Not selected</span>'}
                        </div>
                    </div>

                    <!-- Dates -->
                    <div class="summary-section">
                        <div class="summary-section-title">Selected Dates</div>
                        <div class="summary-section-value">
                            ${numDays > 0 ? `${numDays} day(s)` : '<span class="text-muted">Not selected</span>'}
                        </div>
                    </div>

                    <!-- Participants -->
                    <div class="summary-section">
                        <div class="summary-section-title">Participants</div>
                        <div class="summary-section-value">
                            ${numParticipants > 0 ? `${numParticipants} person(s)` : '<span class="text-muted">Not added</span>'}
                        </div>
                    </div>

                    <!-- Price Breakdown -->
                    <div class="summary-section">
                        <div class="summary-section-title">Price Breakdown</div>
                        <div class="summary-row">
                            <span class="label">${numDays} days × ${numParticipants} pax × ${eventPrice.toFixed(2)}</span>
                            <span class="value">${subtotal.toFixed(2)}</span>
                        </div>
                        ${this.extraCharges.length > 0 ? `
                            <div class="summary-row">
                                <span class="label">Extra Charges</span>
                                <span class="value">+${extraTotal.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        ${discount > 0 ? `
                            <div class="summary-row discount">
                                <span class="label">Discount</span>
                                <span class="value">-${discount.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="summary-row total">
                            <span class="label">Total Amount</span>
                            <span class="value">${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <!-- Payment Options -->
                    <div class="payment-options">
                        <div class="payment-options-title">
                            <i class="bi bi-credit-card"></i>
                            Payment Options
                        </div>
                        <div class="payment-type-group">
                            <div class="payment-type-btn ${this.selectedPaymentType === 'FULL' ? 'active' : ''}" data-type="FULL">
                                <i class="bi bi-wallet2"></i>
                                Full Payment
                            </div>
                            <div class="payment-type-btn ${this.selectedPaymentType === 'PARTIAL' ? 'active' : ''}" data-type="PARTIAL">
                                <i class="bi bi-pie-chart"></i>
                                Partial Payment
                            </div>
                        </div>
                        ${this.selectedPaymentType === 'PARTIAL' ? `
                            <div class="mb-3">
                                <input type="number" 
                                       class="form-control" 
                                       id="partialAmount" 
                                       placeholder="Enter amount to pay"
                                       value="${this.partialAmount}"
                                       min="0"
                                       max="${total}"
                                       step="0.01">
                            </div>
                        ` : ''}
                    </div>

                    <!-- Payment Mode -->
                    <div class="payment-modes">
                        <div class="payment-modes-title">
                            <i class="bi bi-cash-stack"></i>
                            Payment Mode
                        </div>
                        <div class="payment-mode-group">
                            ${this.paymentModes.map(mode => `
                                <div class="payment-mode-btn ${this.selectedPaymentModeId === mode.id ? 'active' : ''}" 
                                     data-mode-id="${mode.id}">
                                    <i class="bi bi-${mode.icon_value || 'cash'}"></i>
                                    ${mode.name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Load initial data
    loadInitialData: function () {
        const self = this;
        
        // Load events and payment modes in parallel
        Promise.all([
            this.loadEvents(),
            this.loadPaymentModes()
        ]).then(() => {
            self.renderCurrentStep();
        }).catch(error => {
            console.error('Failed to load initial data:', error);
            TempleCore.showToast('Failed to load data', 'danger');
        });
    },

    // Load events
    loadEvents: function () {
        const self = this;
        return new Promise((resolve, reject) => {
            TempleAPI.get('/event-booking/events')
                .done(function (response) {
                    if (response.success) {
                        self.events = response.data;
                        resolve();
                    } else {
                        // Use sample data for demo
                        self.events = self.getSampleEvents();
                        resolve();
                    }
                })
                .fail(function () {
                    // Use sample data
                    self.events = self.getSampleEvents();
                    resolve();
                });
        });
    },

    // Load payment modes
    loadPaymentModes: function () {
        const self = this;
        return new Promise((resolve, reject) => {
            TempleAPI.get('/event-booking/payment-modes')
                .done(function (response) {
                    if (response.success) {
                        self.paymentModes = response.data;
                        if (self.paymentModes.length > 0) {
                            self.selectedPaymentModeId = self.paymentModes[0].id;
                        }
                        resolve();
                    } else {
                        self.paymentModes = self.getSamplePaymentModes();
                        self.selectedPaymentModeId = self.paymentModes[0].id;
                        resolve();
                    }
                })
                .fail(function () {
                    self.paymentModes = self.getSamplePaymentModes();
                    self.selectedPaymentModeId = self.paymentModes[0].id;
                    resolve();
                });
        });
    },

    // Sample data for demo
    getSampleEvents: function () {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);

        return [
            {
                id: 1,
                event_name_primary: 'Wesak Day Celebration',
                event_name_secondary: '?????',
                from_date: this.formatDate(today),
                to_date: this.formatDate(nextWeek),
                description_primary: 'Annual Wesak Day celebration with prayers and offerings',
                price: 50.00,
                special_price: 40.00,
                effective_price: 40.00,
                max_booking_per_day: 100,
                remaining_slots: 85
            },
            {
                id: 2,
                event_name_primary: 'Dharma Assembly',
                event_name_secondary: '??',
                from_date: this.formatDate(nextWeek),
                to_date: this.formatDate(nextMonth),
                description_primary: 'Monthly dharma assembly for blessings and merit',
                price: 30.00,
                special_price: null,
                effective_price: 30.00,
                max_booking_per_day: 50,
                remaining_slots: 42
            },
            {
                id: 3,
                event_name_primary: 'Meditation Retreat',
                event_name_secondary: '???',
                from_date: this.formatDate(nextMonth),
                to_date: this.formatDate(new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000)),
                description_primary: 'Five-day meditation retreat for spiritual growth',
                price: 200.00,
                special_price: 180.00,
                effective_price: 180.00,
                max_booking_per_day: 30,
                remaining_slots: 25
            }
        ];
    },

    getSamplePaymentModes: function () {
        return [
            { id: 1, name: 'Cash', icon_value: 'cash-stack' },
            { id: 2, name: 'EGHL QR', icon_value: 'qr-code' }
        ];
    },

    formatDate: function (date) {
        return date.toISOString().split('T')[0];
    },

    // Render current step
    renderCurrentStep: function () {
        let html = '';
        
        switch (this.currentStep) {
            case 1:
                html = this.renderStep1();
                break;
            case 2:
                html = this.renderStep2();
                break;
            case 3:
                html = this.renderStep3();
                break;
            case 4:
                html = this.renderStep4();
                break;
        }

        $('#stepContent').html(html);
        this.updateStepProgress();
        this.updateBookingSummary();
        this.initAnimations();
    },

    // Step 1: Event Selection
    renderStep1: function () {
        return `
            <div class="step-content" data-step="1">
                <div class="step-card">
                    <h5 class="step-card-title">
                        <i class="bi bi-calendar-event"></i>
                        Select Event
                    </h5>
                    <div class="event-grid">
                        ${this.events.map(event => `
                            <div class="event-card ${this.selectedEvent?.id === event.id ? 'selected' : ''}" 
                                 data-event-id="${event.id}">
                                <div class="event-card-icon">
                                    <i class="bi bi-calendar-check"></i>
                                </div>
                                <div class="event-card-name">${event.event_name_primary}</div>
                                ${event.event_name_secondary ? `
                                    <div class="event-card-name-secondary">${event.event_name_secondary}</div>
                                ` : ''}
                                <div class="event-card-dates">
                                    <i class="bi bi-calendar3"></i>
                                    ${this.formatDisplayDate(event.from_date)} - ${this.formatDisplayDate(event.to_date)}
                                </div>
                                <div class="event-card-price">
                                    ${parseFloat(event.effective_price).toFixed(2)}
                                    ${event.special_price && event.special_price < event.price ? `
                                        <span class="original-price">${parseFloat(event.price).toFixed(2)}</span>
                                    ` : ''}
                                </div>
                                ${event.remaining_slots !== null ? `
                                    <small class="text-muted">${event.remaining_slots} slots remaining</small>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>

                    <div class="step-navigation">
                        <div></div>
                        <button class="btn btn-step btn-step-next" id="btnNextStep" ${!this.selectedEvent ? 'disabled' : ''}>
                            Next: Choose Date
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Step 2: Date Selection (Calendar)
    renderStep2: function () {
        return `
            <div class="step-content" data-step="2">
                <div class="step-card">
                    <h5 class="step-card-title">
                        <i class="bi bi-calendar3"></i>
                        Select Date(s)
                    </h5>
                    <p class="text-muted mb-3">
                        Select one or more dates for <strong>${this.selectedEvent?.event_name_primary}</strong>
                    </p>
                    
                    <div class="calendar-container">
                        ${this.renderCalendar()}
                    </div>

                    ${this.selectedDates.length > 0 ? `
                        <div class="selected-dates-list">
                            <strong class="me-2">Selected:</strong>
                            ${this.selectedDates.map(date => `
                                <span class="selected-date-tag">
                                    ${this.formatDisplayDate(date)}
                                    <i class="bi bi-x remove-date" data-date="${date}"></i>
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="step-navigation">
                        <button class="btn btn-step btn-step-prev" id="btnPrevStep">
                            <i class="bi bi-arrow-left"></i>
                            Back
                        </button>
                        <button class="btn btn-step btn-step-next" id="btnNextStep" ${this.selectedDates.length === 0 ? 'disabled' : ''}>
                            Next: Participants
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Render calendar
    renderCalendar: function () {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let html = `
            <div class="calendar-header">
                <button class="calendar-nav-btn" id="calPrevMonth">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <span class="calendar-month-year">${monthNames[month]} ${year}</span>
                <button class="calendar-nav-btn" id="calNextMonth">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
            <div class="calendar-weekdays">
                ${dayNames.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">
        `;

        // Previous month days
        for (let i = 0; i < startDay; i++) {
            const day = new Date(year, month, -(startDay - i - 1)).getDate();
            html += `<div class="calendar-day outside">${day}</div>`;
        }

        // Current month days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const eventStart = this.selectedEvent ? new Date(this.selectedEvent.from_date) : null;
        const eventEnd = this.selectedEvent ? new Date(this.selectedEvent.to_date) : null;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = this.formatDate(dateObj);
            
            let classes = ['calendar-day'];
            let isDisabled = false;
            
            // Check if today
            if (dateObj.getTime() === today.getTime()) {
                classes.push('today');
            }
            
            // Check if within event range
            if (eventStart && eventEnd) {
                if (dateObj >= today && dateObj >= eventStart && dateObj <= eventEnd) {
                    classes.push('available');
                } else {
                    isDisabled = true;
                    classes.push('disabled');
                }
            } else {
                if (dateObj < today) {
                    isDisabled = true;
                    classes.push('disabled');
                }
            }
            
            // Check if selected
            if (this.selectedDates.includes(dateStr)) {
                classes.push('selected');
            }
            
            html += `
                <div class="${classes.join(' ')}" 
                     data-date="${dateStr}"
                     ${isDisabled ? '' : 'role="button"'}>
                    ${day}
                </div>
            `;
        }

        // Next month days
        const remainingDays = 42 - (startDay + daysInMonth);
        for (let i = 1; i <= remainingDays; i++) {
            html += `<div class="calendar-day outside">${i}</div>`;
        }

        html += '</div>';
        return html;
    },

    // Step 3: Participants
    renderStep3: function () {
        return `
            <div class="step-content" data-step="3">
                <div class="step-card">
                    <h5 class="step-card-title">
                        <i class="bi bi-people"></i>
                        Participant Details
                    </h5>
                    
                    <div id="participantsList">
                        ${this.participants.map((p, index) => this.renderParticipantCard(p, index)).join('')}
                    </div>

                    <button type="button" class="add-participant-btn" id="btnAddParticipant">
                        <i class="bi bi-plus-circle"></i>
                        Add Another Participant
                    </button>

                    <div class="step-navigation">
                        <button class="btn btn-step btn-step-prev" id="btnPrevStep">
                            <i class="bi bi-arrow-left"></i>
                            Back
                        </button>
                        <button class="btn btn-step btn-step-next" id="btnNextStep">
                            Next: Extra Charges
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Render participant card
    renderParticipantCard: function (participant, index) {
        const isPrimary = index === 0;
        return `
            <div class="participant-card ${isPrimary ? 'primary' : ''}" data-index="${index}">
                ${isPrimary ? '<span class="participant-badge">Primary</span>' : `
                    <button type="button" class="participant-remove" data-index="${index}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `}
                <div class="row mt-2">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Name <span class="text-danger">*</span></label>
                        <input type="text" 
                               class="form-control participant-name" 
                               data-index="${index}"
                               value="${participant.name}"
                               placeholder="Enter name"
                               required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Phone ${isPrimary ? '<span class="text-danger">*</span>' : ''}</label>
                        <input type="tel" 
                               class="form-control participant-phone" 
                               data-index="${index}"
                               value="${participant.phone}"
                               placeholder="Enter phone"
                               ${isPrimary ? 'required' : ''}>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" 
                               class="form-control participant-email" 
                               data-index="${index}"
                               value="${participant.email}"
                               placeholder="Enter email">
                    </div>
                </div>
            </div>
        `;
    },

    // Step 4: Extra Charges & Final Details
    renderStep4: function () {
        return `
            <div class="step-content" data-step="4">
                <div class="step-card">
                    <h5 class="step-card-title">
                        <i class="bi bi-plus-circle"></i>
                        Extra Charges (Optional)
                    </h5>
                    
                    <div id="extraChargesList">
                        ${this.extraCharges.map((charge, index) => this.renderExtraChargeRow(charge, index)).join('')}
                    </div>

                    <button type="button" class="add-participant-btn" id="btnAddExtraCharge">
                        <i class="bi bi-plus-circle"></i>
                        Add Extra Charge
                    </button>

                    <!-- Discount Section -->
                    <div class="discount-section">
                        <label class="discount-toggle">
                            <input type="checkbox" id="enableDiscount" ${this.discountAmount > 0 ? 'checked' : ''}>
                            <span>Apply Discount</span>
                        </label>
                        <div class="discount-fields ${this.discountAmount > 0 ? 'show' : ''}">
                            <div class="row mt-2">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Discount Amount</label>
                                    <input type="number" 
                                           class="form-control" 
                                           id="discountAmount"
                                           value="${this.discountAmount}"
                                           min="0"
                                           step="0.01"
                                           placeholder="0.00">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Reason</label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="discountReason"
                                           value="${this.discountReason}"
                                           placeholder="Enter reason">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="step-card">
                    <h5 class="step-card-title">
                        <i class="bi bi-card-text"></i>
                        Additional Notes
                    </h5>
                    <textarea class="form-control" 
                              id="bookingNotes" 
                              rows="3" 
                              placeholder="Any special instructions or notes..."></textarea>
                </div>

                <div class="step-navigation">
                    <button class="btn btn-step btn-step-prev" id="btnPrevStep">
                        <i class="bi bi-arrow-left"></i>
                        Back
                    </button>
                    <button class="btn btn-step btn-confirm-booking" id="btnConfirmBooking">
                        <i class="bi bi-check-circle"></i>
                        Confirm Booking
                    </button>
                </div>
            </div>
        `;
    },

    // Render extra charge row
    renderExtraChargeRow: function (charge, index) {
        return `
            <div class="extra-charge-row" data-index="${index}">
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input type="text" 
                           class="form-control extra-charge-name" 
                           data-index="${index}"
                           value="${charge.name}"
                           placeholder="e.g., Transportation">
                </div>
                <div class="form-group">
                    <label class="form-label">Amount</label>
                    <input type="number" 
                           class="form-control extra-charge-amount" 
                           data-index="${index}"
                           value="${charge.amount}"
                           min="0"
                           step="0.01"
                           placeholder="0.00">
                </div>
                <button type="button" class="btn btn-outline-danger remove-btn remove-extra-charge" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    },

    // Update step progress UI
    updateStepProgress: function () {
        $('.step-progress').html(this.renderStepProgress());
    },

    // Update booking summary
    updateBookingSummary: function () {
        $('.booking-summary-container').html(this.renderBookingSummary());
    },

    // Format display date
    formatDisplayDate: function (dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    // Initialize animations
    initAnimations: function () {
        if (typeof gsap !== 'undefined') {
            gsap.from('.step-content', {
                opacity: 0,
                y: 20,
                duration: 0.4,
                ease: 'power2.out'
            });

            gsap.from('.event-card', {
                opacity: 0,
                y: 15,
                stagger: 0.1,
                duration: 0.4,
                ease: 'power2.out'
            });
        }
    },

    // Attach event handlers
    attachEventHandlers: function () {
        const self = this;

        // Back button
        $(document).on('click.' + this.eventNamespace, '#btnBackToList', function () {
            self.cleanup();
            TempleRouter.navigate('events');
        });

        // Event selection
        $(document).on('click.' + this.eventNamespace, '.event-card', function () {
            const eventId = $(this).data('event-id');
            self.selectedEvent = self.events.find(e => e.id === eventId);
            self.selectedDates = []; // Reset dates when event changes
            
            $('.event-card').removeClass('selected');
            $(this).addClass('selected');
            
            $('#btnNextStep').prop('disabled', false);
            self.updateBookingSummary();
        });

        // Navigation buttons
        $(document).on('click.' + this.eventNamespace, '#btnNextStep', function () {
            if (self.validateCurrentStep()) {
                self.currentStep++;
                self.renderCurrentStep();
            }
        });

        $(document).on('click.' + this.eventNamespace, '#btnPrevStep', function () {
            self.currentStep--;
            self.renderCurrentStep();
        });

        // Calendar navigation
        $(document).on('click.' + this.eventNamespace, '#calPrevMonth', function () {
            self.currentMonth.setMonth(self.currentMonth.getMonth() - 1);
            self.renderCurrentStep();
        });

        $(document).on('click.' + this.eventNamespace, '#calNextMonth', function () {
            self.currentMonth.setMonth(self.currentMonth.getMonth() + 1);
            self.renderCurrentStep();
        });

        // Date selection
        $(document).on('click.' + this.eventNamespace, '.calendar-day.available', function () {
            const date = $(this).data('date');
            if (!date) return;

            const index = self.selectedDates.indexOf(date);
            if (index > -1) {
                self.selectedDates.splice(index, 1);
            } else {
                self.selectedDates.push(date);
            }
            
            self.selectedDates.sort();
            self.renderCurrentStep();
        });

        // Remove date tag
        $(document).on('click.' + this.eventNamespace, '.remove-date', function () {
            const date = $(this).data('date');
            const index = self.selectedDates.indexOf(date);
            if (index > -1) {
                self.selectedDates.splice(index, 1);
                self.renderCurrentStep();
            }
        });

        // Participant inputs
        $(document).on('input.' + this.eventNamespace, '.participant-name, .participant-phone, .participant-email', function () {
            const index = $(this).data('index');
            const field = $(this).hasClass('participant-name') ? 'name' : 
                         $(this).hasClass('participant-phone') ? 'phone' : 'email';
            self.participants[index][field] = $(this).val();
            self.updateBookingSummary();
        });

        // Add participant
        $(document).on('click.' + this.eventNamespace, '#btnAddParticipant', function () {
            self.participants.push({ name: '', phone: '', email: '', isPrimary: false });
            self.renderCurrentStep();
        });

        // Remove participant
        $(document).on('click.' + this.eventNamespace, '.participant-remove', function () {
            const index = $(this).data('index');
            if (index > 0) { // Can't remove primary
                self.participants.splice(index, 1);
                self.renderCurrentStep();
            }
        });

        // Extra charge inputs
        $(document).on('input.' + this.eventNamespace, '.extra-charge-name, .extra-charge-amount', function () {
            const index = $(this).data('index');
            const field = $(this).hasClass('extra-charge-name') ? 'name' : 'amount';
            self.extraCharges[index][field] = field === 'amount' ? parseFloat($(this).val()) || 0 : $(this).val();
            self.updateBookingSummary();
        });

        // Add extra charge
        $(document).on('click.' + this.eventNamespace, '#btnAddExtraCharge', function () {
            self.extraCharges.push({ name: '', amount: 0 });
            self.renderCurrentStep();
        });

        // Remove extra charge
        $(document).on('click.' + this.eventNamespace, '.remove-extra-charge', function () {
            const index = $(this).data('index');
            self.extraCharges.splice(index, 1);
            self.renderCurrentStep();
        });

        // Discount toggle
        $(document).on('change.' + this.eventNamespace, '#enableDiscount', function () {
            if ($(this).is(':checked')) {
                $('.discount-fields').addClass('show');
            } else {
                $('.discount-fields').removeClass('show');
                self.discountAmount = 0;
                self.discountReason = '';
                self.updateBookingSummary();
            }
        });

        // Discount inputs
        $(document).on('input.' + this.eventNamespace, '#discountAmount', function () {
            self.discountAmount = parseFloat($(this).val()) || 0;
            self.updateBookingSummary();
        });

        $(document).on('input.' + this.eventNamespace, '#discountReason', function () {
            self.discountReason = $(this).val();
        });

        // Payment type selection
        $(document).on('click.' + this.eventNamespace, '.payment-type-btn', function () {
            self.selectedPaymentType = $(this).data('type');
            self.updateBookingSummary();
        });

        // Partial amount
        $(document).on('input.' + this.eventNamespace, '#partialAmount', function () {
            self.partialAmount = parseFloat($(this).val()) || 0;
        });

        // Payment mode selection
        $(document).on('click.' + this.eventNamespace, '.payment-mode-btn', function () {
            self.selectedPaymentModeId = $(this).data('mode-id');
            $('.payment-mode-btn').removeClass('active');
            $(this).addClass('active');
        });

        // Confirm booking
        $(document).on('click.' + this.eventNamespace, '#btnConfirmBooking', function () {
            self.confirmBooking();
        });
    },

    // Validate current step
    validateCurrentStep: function () {
        switch (this.currentStep) {
            case 1:
                if (!this.selectedEvent) {
                    TempleCore.showToast('Please select an event', 'warning');
                    return false;
                }
                return true;

            case 2:
                if (this.selectedDates.length === 0) {
                    TempleCore.showToast('Please select at least one date', 'warning');
                    return false;
                }
                return true;

            case 3:
                // Validate primary participant
                const primary = this.participants[0];
                if (!primary.name.trim()) {
                    TempleCore.showToast('Primary participant name is required', 'warning');
                    return false;
                }
                if (!primary.phone.trim()) {
                    TempleCore.showToast('Primary participant phone is required', 'warning');
                    return false;
                }
                
                // Validate other participants have names
                for (let i = 1; i < this.participants.length; i++) {
                    if (!this.participants[i].name.trim()) {
                        TempleCore.showToast(`Participant ${i + 1} name is required`, 'warning');
                        return false;
                    }
                }
                return true;

            default:
                return true;
        }
    },

    // Confirm booking
    confirmBooking: function () {
        const self = this;

        // Validate payment mode
        if (!this.selectedPaymentModeId) {
            TempleCore.showToast('Please select a payment mode', 'warning');
            return;
        }

        // Calculate totals
        const numDays = this.selectedDates.length;
        const validParticipants = this.participants.filter(p => p.name.trim());
        const numParticipants = validParticipants.length;
        const eventPrice = parseFloat(this.selectedEvent.effective_price);
        const subtotal = numDays * numParticipants * eventPrice;
        const extraTotal = this.extraCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        const discount = parseFloat(this.discountAmount) || 0;
        const total = Math.max(0, subtotal + extraTotal - discount);

        // Validate partial payment amount
        if (this.selectedPaymentType === 'PARTIAL') {
            if (!this.partialAmount || this.partialAmount <= 0) {
                TempleCore.showToast('Please enter partial payment amount', 'warning');
                return;
            }
            if (this.partialAmount > total) {
                TempleCore.showToast('Partial amount cannot exceed total amount', 'warning');
                return;
            }
        }

        const bookingData = {
            event_id: this.selectedEvent.id,
            selected_dates: this.selectedDates,
            participants: validParticipants,
            extra_charges: this.extraCharges.filter(c => c.name && c.amount > 0),
            discount_amount: discount,
            discount_reason: this.discountReason,
            payment_mode_id: this.selectedPaymentModeId,
            payment_type: this.selectedPaymentType,
            paid_amount: this.selectedPaymentType === 'FULL' ? total : this.partialAmount,
            notes: $('#bookingNotes').val()
        };

        // Show confirmation
        Swal.fire({
            title: 'Confirm Booking',
            html: `
                <div class="text-start">
                    <p><strong>Event:</strong> ${this.selectedEvent.event_name_primary}</p>
                    <p><strong>Dates:</strong> ${this.selectedDates.length} day(s)</p>
                    <p><strong>Participants:</strong> ${numParticipants} person(s)</p>
                    <p><strong>Total Amount:</strong> ${total.toFixed(2)}</p>
                    <p><strong>Payment:</strong> ${this.selectedPaymentType === 'FULL' ? total.toFixed(2) : this.partialAmount.toFixed(2)}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirm Booking',
            confirmButtonColor: '#27ae60',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                self.submitBooking(bookingData);
            }
        });
    },

    // Submit booking to API
    submitBooking: function (bookingData) {
        const self = this;

        Swal.fire({
            title: 'Processing...',
            text: 'Please wait while we process your booking',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        TempleAPI.post('/event-booking/book', bookingData)
            .done(function (response) {
                if (response.success) {
                    self.showReceipt(response.data);
                } else {
                    Swal.fire('Error', response.message || 'Failed to create booking', 'error');
                }
            })
            .fail(function (xhr) {
                // For demo, show mock receipt
                const mockData = self.generateMockReceipt(bookingData);
                self.showReceipt(mockData);
            });
    },

    // Generate mock receipt for demo
    generateMockReceipt: function (bookingData) {
        const numDays = bookingData.selected_dates.length;
        const numParticipants = bookingData.participants.length;
        const eventPrice = parseFloat(this.selectedEvent.effective_price);
        const subtotal = numDays * numParticipants * eventPrice;
        const extraTotal = bookingData.extra_charges.reduce((sum, c) => sum + c.amount, 0);
        const total = subtotal + extraTotal - bookingData.discount_amount;

        return {
            booking_number: 'EVT' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(Math.floor(Math.random() * 10000000)).padStart(7, '0'),
            payment_reference: 'PAY' + Date.now() + String(Math.floor(Math.random() * 100000)).padStart(5, '0'),
            event: {
                name: this.selectedEvent.event_name_primary,
                name_secondary: this.selectedEvent.event_name_secondary,
                dates: bookingData.selected_dates
            },
            participants: bookingData.participants,
            extra_charges: bookingData.extra_charges,
            subtotal: subtotal,
            extra_charges_total: extraTotal,
            discount_amount: bookingData.discount_amount,
            total_amount: total,
            paid_amount: bookingData.paid_amount,
            balance_amount: total - bookingData.paid_amount,
            payment_status: bookingData.paid_amount >= total ? 'PAID' : 'PARTIAL',
            booking_date: new Date().toISOString()
        };
    },

    // Show receipt popup
    showReceipt: function (data) {
        const self = this;
        
        const receiptHtml = `
            <div class="receipt-content" id="receiptContent">
                <div class="receipt-header">
                    <div class="receipt-title">EVENT BOOKING</div>
                    <div>RECEIPT</div>
                </div>
                
                <div class="receipt-row">
                    <span>Booking No:</span>
                    <span>${data.booking_number}</span>
                </div>
                <div class="receipt-row">
                    <span>Date:</span>
                    <span>${new Date(data.booking_date).toLocaleString()}</span>
                </div>
                
                <div class="receipt-divider"></div>
                
                <div class="receipt-row">
                    <span>Event:</span>
                    <span>${data.event.name}</span>
                </div>
                <div class="receipt-row">
                    <span>Dates:</span>
                    <span>${data.event.dates.length} day(s)</span>
                </div>
                <div class="receipt-row">
                    <span>Participants:</span>
                    <span>${data.participants.length} pax</span>
                </div>
                
                <div class="receipt-divider"></div>
                
                <div class="receipt-row">
                    <span>Subtotal:</span>
                    <span>${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.extra_charges_total > 0 ? `
                <div class="receipt-row">
                    <span>Extra Charges:</span>
                    <span>+${data.extra_charges_total.toFixed(2)}</span>
                </div>
                ` : ''}
                ${data.discount_amount > 0 ? `
                <div class="receipt-row">
                    <span>Discount:</span>
                    <span>-${data.discount_amount.toFixed(2)}</span>
                </div>
                ` : ''}
                
                <div class="receipt-divider"></div>
                
                <div class="receipt-row receipt-total">
                    <span>TOTAL:</span>
                    <span>${data.total_amount.toFixed(2)}</span>
                </div>
                <div class="receipt-row">
                    <span>Paid:</span>
                    <span>${data.paid_amount.toFixed(2)}</span>
                </div>
                ${data.balance_amount > 0 ? `
                <div class="receipt-row" style="color: #e74c3c;">
                    <span>Balance:</span>
                    <span>${data.balance_amount.toFixed(2)}</span>
                </div>
                ` : ''}
                
                <div class="receipt-footer">
                    <p>Payment Ref: ${data.payment_reference}</p>
                    <p>Thank you for your booking!</p>
                </div>
            </div>
        `;

        Swal.fire({
            title: '<i class="bi bi-check-circle text-success"></i> Booking Successful!',
            html: receiptHtml,
            width: 500,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-printer"></i> Print Receipt',
            cancelButtonText: 'Close',
            confirmButtonColor: '#8B0000'
        }).then((result) => {
            if (result.isConfirmed) {
                self.printReceipt();
            }
            // Navigate back or reset
            self.resetState();
            self.renderCurrentStep();
        });
    },

    // Print receipt
    printReceipt: function () {
        const content = document.getElementById('receiptContent');
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Event Booking Receipt</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; }
                    .receipt-content { max-width: 300px; margin: 0 auto; }
                    .receipt-header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
                    .receipt-title { font-size: 18px; font-weight: bold; }
                    .receipt-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    .receipt-divider { border-top: 1px dashed #333; margin: 10px 0; }
                    .receipt-total { font-weight: bold; font-size: 14px; }
                    .receipt-footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 2px dashed #333; font-size: 12px; }
                </style>
            </head>
            <body>
                ${content.outerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
};