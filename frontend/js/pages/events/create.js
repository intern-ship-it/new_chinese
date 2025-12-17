// js/pages/events/create.js
// Create new event page

(function ($, window) {
    'use strict';
	if (!window.EventsSharedModule) {
        window.EventsSharedModule = {
            moduleId: 'events',
			eventNamespace: 'events',
            cssId: 'events-css',
            cssPath: '/css/events.css',
            activePages: new Set(),
            
            // Load shared CSS (only once per module)
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Events CSS loaded');
                }
            },
            
            // Register a page as active
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS(); // Ensure CSS is loaded
                console.log(`Events page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            // Unregister a page
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Events page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
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
                    console.log('Events CSS removed');
                }
                
                // Cleanup GSAP animations
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                // Remove all events-related event listeners
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Events module cleaned up');
            }
        };
    }
    window.EventsCreatePage = {
		pageId: 'events-create',
        // Initialize page
        init: function () {
            window.EventsSharedModule.registerPage(this.pageId);
            this.render();
            this.attachEventHandlers();
            this.initValidation();
			this.initAnimations();
        },

        // Page cleanup
        cleanup: function() {
            console.log(`Cleaning up ${this.pageId}...`);
            
            // Unregister from shared module
            window.EventsSharedModule.unregisterPage(this.pageId);
            
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
                <div class="events-create-page">
                    <!-- Header -->
                    <div class="events-header">
                        <div class="events-header-bg"></div>
                        <div class="container-fluid">
                            <div class="events-title-wrapper">
                                <div>
                                    <i class="bi bi-plus-circle events-header-icon"></i>
                                </div>
                                <div>
                                    <h1 class="events-title">Create New Event</h1>
                                    <p class="events-subtitle">Add a new event to the system</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="container-fluid mt-4">
                        <!-- Back Button -->
                        <div class="row mb-3">
                            <div class="col-12">
                                <button class="btn btn-outline-secondary" id="btnBackToList">
                                    <i class="bi bi-arrow-left"></i> Back to Events
                                </button>
                            </div>
                        </div>

                        <!-- Form Card -->
                        <div class="card event-form-card">
                            <div class="card-body">
                                <form id="eventForm" novalidate>
                                    <!-- Event Names Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-card-heading"></i>
                                        <span>Event Names</span>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="eventNamePrimary" class="form-label">
                                                Event Name (Primary) <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" 
                                                   class="form-control" 
                                                   id="eventNamePrimary" 
                                                   name="event_name_primary"
                                                   required>
                                            <div class="invalid-feedback">
                                                Please enter event name (primary).
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="eventNameSecondary" class="form-label">
                                                Event Name (Secondary)
                                            </label>
                                            <input type="text" 
                                                   class="form-control" 
                                                   id="eventNameSecondary" 
                                                   name="event_name_secondary">
                                        </div>
                                    </div>

                                    <!-- Date Range Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-calendar-range"></i>
                                        <span>Date Range</span>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="fromDate" class="form-label">
                                                From Date <span class="text-danger">*</span>
                                            </label>
                                            <input type="date" 
                                                   class="form-control" 
                                                   id="fromDate" 
                                                   name="from_date"
                                                   required>
                                            <div class="invalid-feedback">
                                                Please select from date.
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="toDate" class="form-label">
                                                To Date <span class="text-danger">*</span>
                                            </label>
                                            <input type="date" 
                                                   class="form-control" 
                                                   id="toDate" 
                                                   name="to_date"
                                                   required>
                                            <div class="invalid-feedback">
                                                Please select to date.
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Descriptions Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-text-paragraph"></i>
                                        <span>Descriptions</span>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="descriptionPrimary" class="form-label">
                                                Description (Primary)
                                            </label>
                                            <textarea class="form-control" 
                                                      id="descriptionPrimary" 
                                                      name="description_primary"
                                                      rows="4"></textarea>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="descriptionSecondary" class="form-label">
                                                Description (Secondary)
                                            </label>
                                            <textarea class="form-control" 
                                                      id="descriptionSecondary" 
                                                      name="description_secondary"
                                                      rows="4"></textarea>
                                        </div>
                                    </div>

                                    <!-- Pricing Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-currency-dollar"></i>
                                        <span>Pricing</span>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="price" class="form-label">
                                                Price (RM) <span class="text-danger">*</span>
                                            </label>
                                            <input type="number" 
                                                   class="form-control" 
                                                   id="price" 
                                                   name="price"
                                                   step="0.01"
                                                   min="0"
                                                   required>
                                            <div class="invalid-feedback">
                                                Please enter a valid price.
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="specialPrice" class="form-label">
                                                Special Price (RM)
                                            </label>
                                            <input type="number" 
                                                   class="form-control" 
                                                   id="specialPrice" 
                                                   name="special_price"
                                                   step="0.01"
                                                   min="0">
                                        </div>
                                    </div>

                                    <!-- Booking Limits Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-people"></i>
                                        <span>Booking Limits</span>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="maxBookingCount" class="form-label">
                                                Max Booking Count
                                            </label>
                                            <input type="number" 
                                                   class="form-control" 
                                                   id="maxBookingCount" 
                                                   name="max_booking_count"
                                                   min="0">
                                            <small class="form-text text-muted">
                                                Leave empty for unlimited bookings
                                            </small>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="maxBookingPerDay" class="form-label">
                                                Max Booking Per Day
                                            </label>
                                            <input type="number" 
                                                   class="form-control" 
                                                   id="maxBookingPerDay" 
                                                   name="max_booking_per_day"
                                                   min="0">
                                            <small class="form-text text-muted">
                                                Leave empty for unlimited daily bookings
                                            </small>
                                        </div>
                                    </div>

                                    <!-- Status Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-toggle-on"></i>
                                        <span>Status</span>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="status" class="form-label">
                                                Status <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" 
                                                    id="status" 
                                                    name="status"
                                                    required>
                                                <option value="">Select Status</option>
                                                <option value="active" selected>Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="draft">Draft</option>
                                            </select>
                                            <div class="invalid-feedback">
                                                Please select a status.
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Action Buttons -->
                                    <div class="row mt-4">
                                        <div class="col-12">
                                            <button type="submit" 
                                                    class="btn btn-primary btn-lg" 
                                                    id="btnSaveEvent">
                                                <i class="bi bi-check-circle"></i> Create Event
                                            </button>
                                            <button type="button" 
                                                    class="btn btn-secondary btn-lg" 
                                                    id="btnCancel">
                                                <i class="bi bi-x-circle"></i> Cancel
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Initialize validation
        initValidation: function () {
            const form = document.getElementById('eventForm');
            
            // Custom validation for date range
            $('#toDate').on('change.' + this.eventNamespace, function() {
                const fromDate = $('#fromDate').val();
                const toDate = $(this).val();
                
                if (fromDate && toDate && toDate < fromDate) {
                    this.setCustomValidity('To date must be after from date');
                } else {
                    this.setCustomValidity('');
                }
            });
        },

        // Attach event handlers
        attachEventHandlers: function () {
            const self = this;

            // Back to list button
            $(document).on('click.' + this.eventNamespace, '#btnBackToList, #btnCancel', function () {
				self.cleanup();
                TempleRouter.navigate('events');
            });

            // Form submission
            $(document).on('submit.' + this.eventNamespace, '#eventForm', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const form = this;
                
                if (form.checkValidity() === false) {
                    form.classList.add('was-validated');
                    return;
                }

                self.saveEvent();
            });
        },

        // Save event
        saveEvent: function () {
            const self = this;
            const formData = {
                event_name_primary: $('#eventNamePrimary').val(),
                event_name_secondary: $('#eventNameSecondary').val() || null,
                from_date: $('#fromDate').val(),
                to_date: $('#toDate').val(),
                description_primary: $('#descriptionPrimary').val() || null,
                description_secondary: $('#descriptionSecondary').val() || null,
                price: parseFloat($('#price').val()),
                special_price: $('#specialPrice').val() ? parseFloat($('#specialPrice').val()) : null,
                max_booking_count: $('#maxBookingCount').val() ? parseInt($('#maxBookingCount').val()) : null,
                max_booking_per_day: $('#maxBookingPerDay').val() ? parseInt($('#maxBookingPerDay').val()) : null,
                status: $('#status').val()
            };

            // Disable submit button
            $('#btnSaveEvent').prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Creating...');

            TempleAPI.post('/events', formData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Event created successfully', 'success');
                        
                        // Show success message and redirect
                        Swal.fire({
                            title: 'Success!',
                            text: 'Event has been created successfully.',
                            icon: 'success',
                            confirmButtonText: 'OK'
                        }).then(() => {
							self.cleanup();
                            TempleRouter.navigate('events');
                        });
                    } else {
                        TempleCore.showToast(response.message || 'Failed to create event', 'danger');
                        $('#btnSaveEvent').prop('disabled', false).html('<i class="bi bi-check-circle"></i> Create Event');
                    }
                })
                .fail(function (xhr) {
                    console.error('Save failed:', xhr);
                    
                    let errorMessage = 'Failed to create event';
                    if (xhr.responseJSON && xhr.responseJSON.errors) {
                        const errors = xhr.responseJSON.errors;
                        errorMessage = Object.values(errors).flat().join('<br>');
                    }
                    
                    TempleCore.showToast(errorMessage, 'danger');
                    $('#btnSaveEvent').prop('disabled', false).html('<i class="bi bi-check-circle"></i> Create Event');
                });
        },

        // Initialize animations
        initAnimations: function () {
			if (typeof gsap !== 'undefined') {
				// Header animation
				gsap.fromTo('.events-header', 
					{ 
						y: -50, 
						opacity: 0 
					},
					{
						y: 0,
						opacity: 1,
						duration: 1.8,
						ease: 'power3.out'
					}
				);
				// Form card animation
				/* gsap.from('.event-form-card', {
					y: 30,
					opacity: 1,
					duration: 0.6,
					delay: 0.3,
					ease: 'power2.out'
				}); */

				// Form sections animation
				gsap.fromTo('.section-header-gradient', 
					{ 
							x: -30, 
							opacity: 0 
					},
					{
						x: 0,
						opacity: 1,
						duration: 1.4,
						stagger: 0.1,
						delay: 0.5,
						ease: 'power2.out'
					}
				);
			}
        },
    };

})(jQuery, window);